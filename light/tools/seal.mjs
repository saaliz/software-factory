// Seal a work item's tests, so a builder cannot change them unseen.
//   node factory/tools/seal.mjs work/<item> <file-or-folder>...   seal these paths, written to work/<item>/seal.json
//   node factory/tools/seal.mjs work/<item> --check               exit 1 if a sealed file changed or vanished, or a file was added to a sealed folder
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

/** Seal the named files and folders for a work item. */
export function seal(root, item, roots, now = new Date()) {
  if (!fs.existsSync(path.resolve(root, item))) throw new Error(`no work item at ${item}`);
  if (!roots.length) throw new Error('name at least one file or folder to seal');
  const files = {};
  for (const r of roots) {
    const abs = path.resolve(root, r);
    if (!fs.existsSync(abs)) throw new Error(`nothing at ${r}`);
    for (const f of walk(abs)) files[rel(root, f)] = hash(f);
  }
  if (!Object.keys(files).length) throw new Error('nothing to seal: the paths hold no files');
  const record = { sealedAt: now.toISOString(), roots: roots.map((r) => rel(root, path.resolve(root, r))), files };
  fs.writeFileSync(sealFile(root, item), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

/** Does the seal still hold? `problems` is empty when it does. */
export function check(root, item) {
  const file = sealFile(root, item);
  if (!fs.existsSync(file)) return { sealed: false, count: 0, problems: ['not sealed: no seal.json'] };
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
  return { sealed: true, sealedAt: record.sealedAt, count: Object.keys(record.files).length, problems };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [item, ...rest] = process.argv.slice(2);
  const root = process.cwd();
  try {
    if (!item) throw new Error('usage: seal.mjs work/<item> <file-or-folder>... | seal.mjs work/<item> --check');
    if (rest[0] === '--check') {
      const r = check(root, item);
      if (r.problems.length) { r.problems.forEach((p) => console.error(p)); process.exit(1); }
      console.log(`the seal holds: ${r.count} files, sealed ${r.sealedAt}`);
    } else {
      const r = seal(root, item, rest);
      console.log(`sealed ${Object.keys(r.files).length} files into ${rel(root, sealFile(root, item))}`);
    }
  } catch (e) { console.error(e.message); process.exit(2); }
}
