// The builder's one sweep of a package by kind, before review reading 1 (ONE SWEEP, THEN READ): the hits, as markdown to paste
// into the package's build note. Advisory, never a gate: it always exits 0, and each hit is read, kept or fixed by the builder.
//   node factory/tools/sweep.mjs work/<lane>/<package>
// Over the files the branch changes against the main branch, four kinds, each set by regular expressions in
// factory/harness.json "sweep" (a kind left unset is skipped and says so):
//   (a) emptyFallback { files, call, empty }: a call to another module's interface whose unanswered or not-built result is read
//       as empty or false: `call` on a line with `empty` after it, or a `catch` in the two lines after it;
//   (b) wordFiles: duplicate top-level keys across the word (string) files, within one file or between two, where one is changed;
//   (c) catalogue { files, constant, code }: a role or status typed as a string literal where a catalogue constant holds it;
//       `constant` captures the constant's name and value, in the files `files` names, generated ones included;
//   (d) builtButDesigned { files, creates, design, designed }: a table a changed migration creates (`creates` captures its name)
//       that a design file (`design`) still marks designed (`designed`, with {name} for the table's name).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { filled, gitIn, loadConfig, slash } from './config.mjs';

const lf = (s) => s.replace(/\r\n?/g, '\n');
const re = (s, flags = '') => (filled(s) ? new RegExp(s, flags) : null);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** (a) Calls read as empty or false when unanswered. */
export function unansweredAsEmpty(file, text, { call, empty }) {
  const lines = lf(text).split('\n');
  const hits = [];
  lines.forEach((line, i) => {
    for (const m of line.matchAll(new RegExp(call.source, 'g'))) {
      const after = line.slice(m.index + m[0].length);
      const as = after.match(empty)?.[0].replace(/\s+/g, ' ') ?? (lines.slice(i + 1, i + 3).some((l) => /\bcatch\b/.test(l)) ? 'catch' : null);
      if (as) { hits.push({ file, line: i + 1, call: m[0], as }); break; }
    }
  });
  return hits;
}

/** The top-level keys of a JSON file, with their lines, duplicates kept (JSON.parse would drop them). */
export function wordKeys(text) {
  const keys = [];
  const s = lf(text);
  let depth = 0, line = 1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\n') line++;
    else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') depth--;
    else if (c === '"') {
      let j = i + 1;
      while (j < s.length && s[j] !== '"') j += s[j] === '\\' ? 2 : 1;
      if (depth === 1 && /^\s*:/.test(s.slice(j + 1))) keys.push({ key: s.slice(i + 1, j), line });
      i = j;
    }
  }
  return keys;
}

/** (b) Every key held more than once across the files, where one of its places is in a changed file. */
export function duplicateWordKeys(files, changed = null) {
  const at = new Map();
  for (const { file, text } of files) for (const k of wordKeys(text)) at.set(k.key, [...(at.get(k.key) ?? []), { file, line: k.line }]);
  return [...at].filter(([, places]) => places.length > 1 && (!changed || places.some((p) => changed.has(p.file))))
    .map(([key, places]) => ({ key, at: places.map((p) => `${p.file}:${p.line}`).sort() })).sort((a, b) => a.key.localeCompare(b.key));
}

/** The catalogue: value to constant name, from the catalogue files. */
export function catalogueOf(files, constant) {
  const catalogue = new Map();
  for (const { text } of files) for (const m of lf(text).matchAll(new RegExp(constant.source, 'g'))) catalogue.set(m[2], m[1]);
  return catalogue;
}

/** (c) String literals that are a catalogue value, typed where the constant should be named. */
export function typedLiterals(file, text, catalogue, constant) {
  const hits = [];
  lf(text).split('\n').forEach((line, i) => {
    if (constant.test(line) || /^\s*(\/\/|#|\*|\/\*)/.test(line)) return;
    for (const m of line.matchAll(/(?<![@$\w])["']([^"'\n]+)["']/g)) if (catalogue.has(m[1])) hits.push({ file, line: i + 1, literal: m[1], constant: catalogue.get(m[1]) });
  });
  return hits;
}

/** (d) Tables the changed migrations create that a design file still marks designed. */
export function builtButDesigned(migrations, designs, { creates, designed }) {
  const out = [];
  for (const { file, text } of migrations) {
    for (const m of lf(text).replace(/--[^\n]*/g, '').matchAll(new RegExp(creates.source, 'gi'))) {
      const marked = designs.find((d) => new RegExp(designed.replace('{name}', escape(m[1])), 'm').test(lf(d.text)));
      if (marked) out.push({ file, table: m[1], design: marked.file });
    }
  }
  return out;
}

/** The sweep as markdown, for the build note. `skipped` names the kinds not configured. */
export function markdown(pkg, { a, b, c, d, skipped = [] }) {
  const list = (kind, hits, row) => (skipped.includes(kind) ? ['- not configured: factory/harness.json sweep'] : hits.length ? hits.map(row) : ['- none']);
  return [
    `## Sweep — \`${pkg}\``, '',
    'By `node factory/tools/sweep.mjs` over the files changed against the main branch (ONE SWEEP, THEN READ). Advisory: each hit is read, kept or fixed.', '',
    `### (a) An unanswered call read as empty or false — ${a.length}`, '', ...list('a', a, (h) => `- \`${h.file}:${h.line}\` — \`${h.call}\` read as \`${h.as}\``), '',
    `### (b) Duplicate word keys — ${b.length}`, '', ...list('b', b, (h) => `- \`${h.key}\` — ${h.at.map((x) => `\`${x}\``).join(', ')}`), '',
    `### (c) Typed literals for roles and statuses — ${c.length}`, '', ...list('c', c, (h) => `- \`${h.file}:${h.line}\` — \`"${h.literal}"\` where \`${h.constant}\` holds it`), '',
    `### (d) Tables built but marked designed — ${d.length}`, '', ...list('d', d, (h) => `- \`${h.table}\` — created in \`${h.file}\`, still designed in \`${h.design}\``), '',
  ].join('\n');
}

/** The sweep of a repository's changed files: the four lists, and the kinds not configured. */
export function sweep(root, cfg, changed) {
  const s = cfg.sweep ?? {};
  const present = changed.filter((f) => fs.existsSync(path.join(root, f)));
  const tracked = [...new Set([...gitIn(root)('ls-files').stdout.split(/\r?\n/).filter(Boolean), ...present])];
  const read = (f) => ({ file: f, text: fs.readFileSync(path.join(root, f), 'utf8') });
  const skipped = [];
  const ef = s.emptyFallback ?? {};
  const a = re(ef.files) && re(ef.call) && re(ef.empty)
    ? present.filter((f) => re(ef.files).test(f)).flatMap((f) => unansweredAsEmpty(f, read(f).text, { call: re(ef.call), empty: re(ef.empty) })) : (skipped.push('a'), []);
  const words = re(s.wordFiles);
  const b = words ? duplicateWordKeys(tracked.filter((f) => words.test(f) && fs.existsSync(path.join(root, f))).map(read), new Set(present)) : (skipped.push('b'), []);
  const ca = s.catalogue ?? {};
  let c = [];
  if (re(ca.files) && re(ca.constant) && re(ca.code)) {
    const catalogue = catalogueOf(tracked.filter((f) => re(ca.files).test(f) && fs.existsSync(path.join(root, f))).map(read), re(ca.constant));
    c = present.filter((f) => re(ca.code).test(f)).flatMap((f) => typedLiterals(f, read(f).text, catalogue, re(ca.constant)));
  } else skipped.push('c');
  const bd = s.builtButDesigned ?? {};
  let d = [];
  if (re(bd.files) && re(bd.creates) && re(bd.design) && filled(bd.designed)) {
    d = builtButDesigned(present.filter((f) => re(bd.files).test(f)).map(read), tracked.filter((f) => re(bd.design).test(f) && fs.existsSync(path.join(root, f))).map(read), { creates: re(bd.creates), designed: bd.designed });
  } else skipped.push('d');
  return { a, b, c, d, skipped };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pkgArg = process.argv[2];
  try {
    if (!pkgArg) throw new Error('usage: node factory/tools/sweep.mjs work/<lane>/<package>');
    const { root, config } = loadConfig(process.cwd());
    const diff = gitIn(root)('diff', '--name-only', `${config.mainBranch ?? 'main'}...HEAD`);
    const changed = diff.stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    console.log(markdown(slash(path.relative(root, path.resolve(root, pkgArg))), sweep(root, config, changed)));
  } catch (e) { console.error(`sweep: ${e.message}`); }
  process.exit(0);
}
