// Orphaned branches and worktrees: every branch and worktree with no owner or no end. It only lists; it deletes nothing.
// factory/methods/branch-lifecycle.md is the method. The ledger is factory/branches.json: { "<branch>": { item, session, opened, closed? } }.
//   node factory/tools/orphans.mjs [--main main] [--idle 3] [--json]   one line per finding; exit 1 when there is any
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sections } from './criteria.mjs';

const DAY = 86_400_000;
const git = (root, args) => {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout ?? '').trim() };
};

export function mainBranch(root, named) {
  for (const b of named ? [named] : ['main', 'master']) if (git(root, ['rev-parse', '--verify', '--quiet', `refs/heads/${b}`]).ok) return b;
  throw new Error(named ? `no branch "${named}"` : 'no main or master branch: pass --main <branch>');
}

export function ledger(root) {
  const f = path.join(root, 'factory', 'branches.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
}

const released = (root, item) => {
  const f = path.join(root, item, 'item.md');
  if (!fs.existsSync(f)) return null;
  const rel = (sections(fs.readFileSync(f, 'utf8')).Release ?? []).map((l) => l.trim()).filter((l) => l && !/^<!--.*-->$/.test(l));
  return rel.length > 0;
};

/** git worktree list --porcelain as [{ path, branch, detached, prunable }]. The path is in the machine's own form: on Windows git prints C:/a/b, and this gives C:\a\b. */
export function worktrees(root) {
  const out = [];
  let w = null;
  for (const line of git(root, ['worktree', 'list', '--porcelain']).out.split('\n')) {
    if (line.startsWith('worktree ')) { w = { path: path.resolve(line.slice(9)), branch: null, detached: false, prunable: false }; out.push(w); }
    else if (w && line.startsWith('branch ')) w.branch = line.slice(7).replace(/^refs\/heads\//, '');
    else if (w && line === 'detached') w.detached = true;
    else if (w && line.startsWith('prunable')) w.prunable = true;
  }
  return out;
}

/** Every finding: { kind, name, suggest }. */
export function findings(root, { main, idleDays = 3, now = Date.now() } = {}) {
  const trunk = mainBranch(root, main);
  const book = ledger(root);
  const out = [];
  const refs = git(root, ['for-each-ref', 'refs/heads', '--format=%(refname:short)\t%(committerdate:unix)']).out.split('\n').filter(Boolean);
  for (const line of refs) {
    const [b, t] = line.split('\t');
    if (b === trunk) continue;
    const merged = git(root, ['merge-base', '--is-ancestor', b, trunk]).ok;
    const entry = book[b];
    if (merged) { out.push({ kind: 'merged, not deleted', name: b, suggest: `delete it (git branch -d ${b})` }); continue; }
    if (!entry) out.push({ kind: 'unregistered', name: b, suggest: 'register it in factory/branches.json, or give it an end' });
    if (entry?.closed) out.push({ kind: 'closed, not deleted', name: b, suggest: `archive or delete it; closed: ${entry.closed}` });
    if (entry?.item && released(root, entry.item) === null) out.push({ kind: 'no item', name: b, suggest: `${entry.item} does not exist: correct the ledger or close the branch` });
    if (entry?.item && released(root, entry.item) === true) out.push({ kind: 'released, not merged', name: b, suggest: `merge it: ${entry.item} is released` });
    if (now - Number(t) * 1000 > idleDays * DAY) out.push({ kind: 'idle', name: b, suggest: `no commit in ${Math.floor((now - Number(t) * 1000) / DAY)} days: merge, close or archive (the owner's word)` });
  }
  const top = path.resolve(git(root, ['rev-parse', '--show-toplevel']).out || root);
  for (const w of worktrees(root)) {
    if (path.resolve(w.path) === top) continue;
    if (w.prunable) out.push({ kind: 'worktree prunable', name: w.path, suggest: 'git worktree prune, after archiving its ignored files' });
    else if (w.detached) out.push({ kind: 'worktree detached', name: w.path, suggest: 'a review copy left behind: archive its ignored files, then remove it' });
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const f = findings(process.cwd(), { main: opt('--main'), idleDays: Number(opt('--idle') ?? 3) });
  if (args.includes('--json')) console.log(JSON.stringify(f, null, 2));
  else if (!f.length) console.log('no orphans');
  else { f.forEach((x) => console.log(`${x.kind}\t${x.name}\t${x.suggest}`)); console.log(`\n${f.length} findings; nothing was deleted`); }
  process.exit(f.length ? 1 : 0);
}
