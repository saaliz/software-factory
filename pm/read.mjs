// Reads a project's status files, read only, and shapes them for the screens. Never writes, never runs
// the project's scripts, never calls a model.
import fs from 'node:fs';
import path from 'node:path';
import { validate, declared, VERSION } from '../core/schemas/validate.mjs';

/** The files a project's scripts write, by kind. */
export const FILES = { progress: 'progress.json', lanes: 'lanes.json', pulse: 'pulse.json', walks: 'walks-main.json', decisions: 'decisions.json' };
export const DEFAULT_DATA_DIRS = ['tmp/ci'];

export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** The config: { projects: [{ name, folder, mount?, dataDirs?, owner? }] }, with an id for each. */
export function loadConfig(file, { useMounts = false } = {}) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const base = path.dirname(path.resolve(file));
  const seen = new Set();
  return (raw.projects ?? []).map((p) => {
    if (!p.name || !p.folder) throw new Error(`${file}: every project needs a name and a folder`);
    const id = slug(p.id ?? p.name);
    if (seen.has(id)) throw new Error(`${file}: two projects are called ${id}`);
    seen.add(id);
    // Inside the container the mount is an absolute path already; outside, the folder is relative to the config.
    const root = useMounts && p.mount ? p.mount : path.resolve(base, p.folder);
    return { id, name: p.name, root, dataDirs: p.dataDirs ?? DEFAULT_DATA_DIRS, owner: p.owner ?? ['owner'] };
  });
}

const inside = (root, file) => {
  const rel = path.relative(root, file);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
};

/** The first data dir that holds the file, as { abs, rel }, or null. */
export function locate(project, name) {
  for (const dir of project.dataDirs) {
    const abs = path.resolve(project.root, dir, name);
    if (!inside(project.root, abs)) continue;
    if (fs.existsSync(abs)) return { abs, rel: path.relative(project.root, abs).split(path.sep).join('/') };
  }
  return null;
}

const cache = new Map();
function readJson(abs) {
  const st = fs.statSync(abs);
  const key = `${st.mtimeMs}:${st.size}`;
  const hit = cache.get(abs);
  if (hit?.key === key) return hit;
  const entry = { key, mtime: st.mtime.toISOString(), doc: JSON.parse(fs.readFileSync(abs, 'utf8')) };
  cache.set(abs, entry);
  return entry;
}

/** One document: { state: ok | invalid | missing | unreadable, file, mtime, at, problems, data }. */
export function readDoc(project, kind) {
  const where = locate(project, FILES[kind]);
  if (!where) return { state: 'missing', file: null, looked: project.dataDirs.map((d) => `${d}/${FILES[kind]}`), problems: [], data: null };
  let entry;
  try { entry = readJson(where.abs); } catch (e) {
    return { state: 'unreadable', file: where.rel, problems: [String(e.message).slice(0, 200)], data: null };
  }
  const problems = validate(kind, entry.doc);
  const d = declared(entry.doc);
  return {
    state: problems.length ? 'invalid' : 'ok',
    file: where.rel,
    mtime: entry.mtime,
    at: entry.doc?.at ?? null,
    schema: d ? entry.doc.schema : `factory/${kind}@${VERSION} (assumed: no schema field)`,
    problems: problems.slice(0, 20),
    data: entry.doc,
  };
}

/** progress without the per-criterion rows the screens do not show. */
export function trimProgress(p) {
  if (!p) return p;
  const { criteria, results, lanes, pulse, ...rest } = p;
  return rest;
}

export function trimWalks(w) {
  if (!w) return w;
  return { at: w.at, commit: w.commit, passed: w.passed, env: w.env, walks: (w.walks ?? []).map(({ name, passed, ms, steps, exit }) => ({ name, passed, ms, steps, exit })) };
}

/** Open decisions: decisions.json, plus every "waits on" line that names the owner. */
export function decisionsOf(project, { decisions, lanes, pulse }) {
  const out = (decisions?.decisions ?? []).map((d) => ({ ...d, source: 'decisions.json' }));
  const names = project.owner.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const owner = names.length ? new RegExp(`\\b(${names.join('|')})\\b`, 'i') : null;
  if (!owner) return out;
  const seen = new Set(out.map((d) => `${d.cut ?? ''}|${d.question}`));
  const add = (cut, text, since, from) => {
    const key = `${cut}|${text}`;
    if (!owner.test(text) || seen.has(key)) return;
    seen.add(key);
    out.push({ id: `${cut}: waits on`, question: text, since: since ?? null, cut, source: from });
  };
  for (const lane of lanes?.lanes ?? []) for (const c of lane.cards ?? []) for (const w of c.waitsOn ?? []) add(c.cut, w, c.since, 'lanes.json waitsOn');
  for (const c of pulse?.cuts ?? []) for (const w of c.waitsOn ?? []) add(c.name, w, c.tipAt, 'pulse.json waitsOn');
  return out.sort((a, b) => String(a.since ?? '').localeCompare(String(b.since ?? '')));
}

/** Everything the screens show for one project. */
export function readProject(project, { now = new Date() } = {}) {
  const docs = Object.fromEntries(Object.keys(FILES).map((k) => [k, readDoc(project, k)]));
  // A progress.json that embeds the board and the pulse stands in for missing lanes.json or pulse.json.
  for (const k of ['lanes', 'pulse']) {
    const embedded = docs.progress.data?.[k];
    if (docs[k].state === 'missing' && embedded) {
      const problems = validate(k, embedded);
      docs[k] = { state: problems.length ? 'invalid' : 'ok', file: `${docs.progress.file} (.${k})`, mtime: docs.progress.mtime, at: embedded.at ?? null, schema: docs.progress.schema, problems, data: embedded };
    }
  }
  const data = Object.fromEntries(Object.entries(docs).map(([k, d]) => [k, d.state === 'ok' || d.state === 'invalid' ? d.data : null]));
  const decisions = decisionsOf(project, data);
  data.progress = trimProgress(data.progress);
  data.walks = trimWalks(data.walks);
  const files = Object.fromEntries(Object.entries(docs).map(([k, { data: _, ...meta }]) => [k, meta]));
  return { id: project.id, name: project.name, read: now.toISOString(), files, data, decisions };
}
