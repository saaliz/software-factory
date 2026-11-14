// The sources step of CI: every hand-written code file names where it comes from, in a comment line that holds
//   Source: <file § section>; <requirement ids>; <principle, if any>
// Red when such a file has no Source line, or its line names a file or a section that does not exist, or a requirement id
// the product source does not hold. Code that was already there is listed in a backlog file and only reported, until the
// branch changes it; a backlog line whose file now passes is red too, so the backlog only shrinks.
//   node factory/tools/sources.mjs                   check (exit 1 on any red)
//   node factory/tools/sources.mjs --write-backlog   write the backlog from what fails now: once, for the code already there
// Set in factory/harness.json "sourcesCheck": { code: [folders], extensions: [".js", ...], generatedMarker: "<text in a
// generated file's first line>", backlog: "factory/sources-backlog.txt" }, and the product's id pattern in
// sources.product.idPattern (a regular expression, e.g. "REQ-\\d+"). The four sources' paths come from "sources".
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const slash = (p) => p.split(path.sep).join('/');
const lf = (s) => s.replace(/\r\n?/g, '\n');

export function settings(cfg = {}) {
  const s = cfg.sourcesCheck ?? {};
  return {
    code: (s.code ?? []).filter((c) => !c.startsWith('<')), extensions: s.extensions ?? ['.js', '.mjs', '.ts', '.tsx', '.py', '.cs', '.go', '.java', '.rb', '.sql'],
    generatedMarker: s.generatedMarker ?? 'generated', backlog: s.backlog ?? 'factory/sources-backlog.txt',
    idPattern: cfg.sources?.product?.idPattern?.startsWith('<') ? null : cfg.sources?.product?.idPattern ?? null, productPath: cfg.sources?.product?.path ?? null,
    roots: Object.values(cfg.sources ?? {}).map((x) => x?.path).filter((p) => p && !p.startsWith('<')),
  };
}

/** Every requirement id the product source holds. */
export function productIds(root, s) {
  const ids = new Set();
  if (!s.idPattern || !s.productPath) return ids;
  const re = new RegExp(s.idPattern, 'g');
  const walk = (p) => {
    if (!fs.existsSync(p)) return;
    if (fs.statSync(p).isDirectory()) { for (const n of fs.readdirSync(p)) walk(path.join(p, n)); return; }
    for (const m of fs.readFileSync(p, 'utf8').matchAll(re)) ids.add(m[0]);
  };
  walk(path.join(root, s.productPath));
  return ids;
}

/** The Source line of a file's text, or null. */
export const sourceLine = (text) => lf(text).split('\n').find((l) => /^\s*(?:\/\/|#|--|\*|\/\*)\s*Source:/.test(l)) ?? null;

/** What is wrong with one Source line: each file, section and id it names must resolve. Empty when it does. */
export function lineProblems(root, line, s, ids = productIds(root, s)) {
  const body = line.replace(/^\s*(?:\/\/|#|--|\*|\/\*)\s*Source:\s*/, '').replace(/\*\/\s*$/, '').trim();
  const problems = [];
  const parts = body.split(';').map((p) => p.trim()).filter(Boolean);
  let named = 0;
  for (const part of parts) {
    for (const ref of part.split(/,\s*(?=[\w.-]+\/)/)) {
      const m = ref.match(/^([\w.\-/]+\.\w+)(?:\s*§\s*(.+))?$/);
      if (!m) continue;
      named++;
      const file = path.join(root, m[1]);
      if (!fs.existsSync(file)) { problems.push(`no such file: ${m[1]}`); continue; }
      if (m[2] && m[1].endsWith('.md')) {
        const want = m[2].trim().toLowerCase();
        const headings = lf(fs.readFileSync(file, 'utf8')).split('\n').filter((l) => /^#+\s/.test(l)).map((l) => l.replace(/^#+\s+/, '').trim().toLowerCase());
        if (!headings.some((h) => h.includes(want))) problems.push(`no section "${m[2].trim()}" in ${m[1]}`);
      }
    }
    if (s.idPattern) {
      for (const id of part.match(new RegExp(s.idPattern, 'g')) ?? []) { named++; if (!ids.has(id)) problems.push(`no such requirement: ${id}`); }
    }
  }
  if (!named) problems.push('the Source line names no file and no requirement');
  return problems;
}

/** Every hand-written code file the check covers, relative to root. */
export function codeFiles(root, s) {
  const out = [];
  const walk = (p) => {
    if (!fs.existsSync(p)) return;
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const f = path.join(p, e.name);
      if (e.isDirectory()) { if (!['node_modules', 'bin', 'obj', 'dist', '.git'].includes(e.name)) walk(f); continue; }
      if (!s.extensions.includes(path.extname(e.name))) continue;
      const first = lf(fs.readFileSync(f, 'utf8')).split('\n')[0] ?? '';
      if (first.toLowerCase().includes(s.generatedMarker.toLowerCase())) continue;
      out.push(slash(path.relative(root, f)));
    }
  };
  for (const c of s.code) walk(path.join(root, c));
  return out.sort();
}

/** Each covered file's problems: { file: [problems] }, only files with any. */
export function check(root, s) {
  const ids = productIds(root, s);
  const out = {};
  for (const f of codeFiles(root, s)) {
    const line = sourceLine(fs.readFileSync(path.join(root, f), 'utf8'));
    const problems = line ? lineProblems(root, line, s, ids) : ['no Source line'];
    if (problems.length) out[f] = problems;
  }
  return out;
}

export const readBacklog = (root, s) => {
  const f = path.join(root, s.backlog);
  return new Set(fs.existsSync(f) ? lf(fs.readFileSync(f, 'utf8')).split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')) : []);
};

/** Files the branch changed against the main branch, so a backlog file it touches must pass. */
export function changed(root, main) {
  const r = spawnSync('git', ['diff', '--name-only', `${main}...HEAD`], { cwd: root, encoding: 'utf8' });
  return new Set(r.status === 0 ? r.stdout.split(/\r?\n/).filter(Boolean) : []);
}

/** The verdict: { red: [lines], reported: [lines] }. */
export function verdict(root, s, { touched = new Set() } = {}) {
  const problems = check(root, s);
  const backlog = readBacklog(root, s);
  const red = [], reported = [];
  for (const [f, ps] of Object.entries(problems)) {
    const lines = ps.map((p) => `${f}: ${p}`);
    if (backlog.has(f) && !touched.has(f)) reported.push(...lines); else red.push(...lines);
  }
  for (const f of backlog) if (!(f in problems)) red.push(`${f}: passes now, remove it from ${s.backlog}`);
  return { red, reported };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(path.join(root, 'factory', 'harness.json'), 'utf8')); } catch { /* defaults */ }
  const s = settings(cfg);
  if (!s.code.length) { console.error('sources: name the code folders in factory/harness.json, sourcesCheck.code'); process.exit(2); }
  if (process.argv.includes('--write-backlog')) {
    const files = Object.keys(check(root, s));
    fs.mkdirSync(path.dirname(path.join(root, s.backlog)), { recursive: true });
    fs.writeFileSync(path.join(root, s.backlog), `# Code that had no resolving Source line when the check began. Only shrinks.\n${files.join('\n')}\n`);
    console.log(`wrote ${files.length} files to ${s.backlog}`);
    process.exit(0);
  }
  const v = verdict(root, s, { touched: changed(root, cfg.mainBranch ?? 'main') });
  if (v.reported.length) console.log(`backlog, reported only: ${v.reported.length} problems`);
  v.red.forEach((l) => console.error(l));
  console.log(v.red.length ? `sources: ${v.red.length} red` : `sources: green, ${codeFiles(root, s).length} files`);
  process.exit(v.red.length ? 1 : 0);
}
