// Seal a work item's tests, so a builder cannot change them unseen.
//   node factory/tools/seal.mjs work/<item> <file-or-folder>...   seal these paths, written to work/<item>/seal.json
//   node factory/tools/seal.mjs work/<item> --reseal "<why>" <file-or-folder>...   seal again; the reason and what changed are kept in seal.json
//   node factory/tools/seal.mjs work/<item> --command "<the sealed tests' command>" [--whole "<the project's whole test command>"] <file-or-folder>...
//       the commands are kept in seal.json, so the gate's --prove runs what the test writer named and not what a builder wrote later
//   node factory/tools/seal.mjs work/<item> --check               exit 1 if a sealed file changed or vanished, or a file was added to a sealed folder
// A second seal without --reseal is refused: a seal that can be rewritten in silence proves nothing about who changed a test.
// Line endings are read as one, so a checkout on another computer does not break a seal.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const walk = (p) => (fs.statSync(p).isDirectory() ? fs.readdirSync(p).sort().flatMap((n) => walk(path.join(p, n))) : [p]);
const rel = (root, f) => path.relative(root, f).split(path.sep).join('/');
const isText = (buf) => !buf.subarray(0, 8000).includes(0);

/** A file's hash; a text file's CRLF counts as LF. */
export function hash(file) {
  const buf = fs.readFileSync(file);
  const data = isText(buf) ? Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8') : buf;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export const sealFile = (root, item) => path.join(path.resolve(root, item), 'seal.json');

/** Seal the named files and folders for a work item. `why` is the reason for a reseal; a first seal has none. */
export function seal(root, item, roots, now = new Date(), why = null, commands = {}) {
  if (!fs.existsSync(path.resolve(root, item))) throw new Error(`no work item at ${item}`);
  if (!roots.length) throw new Error('name at least one file or folder to seal');
  const file = sealFile(root, item);
  const before = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  if (why !== null && !String(why).trim()) throw new Error('a reseal says why: --reseal "<the fault found in the tests>"');
  if (before && why === null) throw new Error(`already sealed ${before.sealedAt}: to seal again, say why with --reseal "<why>"; the reason is kept`);
  if (!before && why !== null) throw new Error('not sealed yet: seal it first, without --reseal');
  const files = {};
  for (const r of roots) {
    const abs = path.resolve(root, r);
    if (!fs.existsSync(abs)) throw new Error(`nothing at ${r}`);
    for (const f of walk(abs)) files[rel(root, f)] = hash(f);
  }
  if (!Object.keys(files).length) throw new Error('nothing to seal: the paths hold no files');
  const record = { sealedAt: now.toISOString(), roots: roots.map((r) => rel(root, path.resolve(root, r))), files };
  // The commands that prove the work item, named by whoever sealed it. A reseal keeps them unless it names new ones.
  for (const k of ['command', 'whole']) {
    const v = String(commands[k] ?? before?.[k] ?? '').trim();
    if (v) record[k] = v;
  }
  if (before) {
    // What the reseal changed, so a reader need not compare two files of hashes.
    const names = [...new Set([...Object.keys(before.files), ...Object.keys(files)])].sort();
    const changed = names.filter((f) => before.files[f] !== files[f]);
    for (const k of ['command', 'whole']) if ((before[k] ?? '') !== (record[k] ?? '')) changed.push(`the ${k === 'command' ? 'sealed' : 'whole'} command`);
    record.reseals = [...(before.reseals ?? []), { at: now.toISOString(), why: String(why).trim(), was: before.sealedAt, changed }];
  }
  fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

/** One value for the whole seal: its files' hashes and its commands. A proof names it, so a reseal makes the proof stale. */
export const stamp = (record) => crypto.createHash('sha256')
  .update(JSON.stringify([Object.keys(record.files).sort().map((f) => [f, record.files[f]]), record.command ?? '', record.whole ?? ''])).digest('hex');

/** Does the seal still hold? `problems` is empty when it does. */
export function check(root, item) {
  const file = sealFile(root, item);
  if (!fs.existsSync(file)) return { sealed: false, count: 0, reseals: [], problems: ['not sealed: no seal.json'] };
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  const problems = [];
  for (const [f, h] of Object.entries(record.files)) {
    const abs = path.resolve(root, f);
    if (!fs.existsSync(abs)) problems.push(`gone: ${f}`);
    else if (hash(abs) !== h) problems.push(`changed: ${f}`);
  }
  for (const r of record.roots) {
    const abs = path.resolve(root, r);
    if (!fs.existsSync(abs)) continue;
    for (const f of walk(abs)) if (!(rel(root, f) in record.files)) problems.push(`added after the seal: ${rel(root, f)}`);
  }
  return { sealed: true, sealedAt: record.sealedAt, count: Object.keys(record.files).length, reseals: record.reseals ?? [], problems, command: record.command ?? null, whole: record.whole ?? null, stamp: stamp(record) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [item, ...rest] = process.argv.slice(2);
  const root = process.cwd();
  try {
    if (!item) throw new Error('usage: seal.mjs work/<item> [--command "<cmd>"] [--whole "<cmd>"] <file-or-folder>... | seal.mjs work/<item> --reseal "<why>" [--command "<cmd>"] [--whole "<cmd>"] <file-or-folder>... | seal.mjs work/<item> --check');
    if (rest[0] === '--check') {
      const r = check(root, item);
      if (r.problems.length) { r.problems.forEach((p) => console.error(p)); process.exit(1); }
      console.log(`the seal holds: ${r.count} files, sealed ${r.sealedAt}`);
      r.reseals.forEach((x) => console.log(`resealed ${x.at}: ${x.why} (${x.changed.length} changed)`));
    } else {
      // Flags and their values may stand anywhere before the paths.
      const flags = {};
      const roots = [];
      for (let i = 0; i < rest.length; i++) {
        if (['--reseal', '--command', '--whole'].includes(rest[i])) flags[rest[i].slice(2)] = rest[++i] ?? '';
        else roots.push(rest[i]);
      }
      const again = 'reseal' in flags;
      const r = seal(root, item, roots, new Date(), again ? flags.reseal : null, { command: flags.command, whole: flags.whole });
      console.log(`${again ? 'resealed' : 'sealed'} ${Object.keys(r.files).length} files into ${rel(root, sealFile(root, item))}`);
    }
  } catch (e) { console.error(e.message); process.exit(2); }
}
