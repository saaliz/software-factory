// node --test light/tools/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findings } from './orphans.mjs';

const sh = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout.trim();
};
const commit = (cwd, file) => { fs.writeFileSync(path.join(cwd, file), file); sh(cwd, 'add', '.'); sh(cwd, 'commit', '-q', '-m', file); };

const repo = () => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'factory-orphans-')));
  sh(root, 'init', '-q', '-b', 'main');
  fs.mkdirSync(path.join(root, 'factory'));
  fs.mkdirSync(path.join(root, 'work', '01-done'), { recursive: true });
  fs.writeFileSync(path.join(root, 'work', '01-done', 'item.md'), '# Done\n\n## Release\nVersion: v1\n');
  commit(root, 'a');
  for (const [b, f] of [['merged', 'm'], ['released', 'r'], ['stray', 's'], ['ghost', 'g'], ['fine', 'f']]) {
    sh(root, 'switch', '-q', '-c', b, 'main'); commit(root, f); sh(root, 'switch', '-q', 'main');
  }
  sh(root, 'merge', '-q', '--no-edit', 'merged');
  fs.writeFileSync(path.join(root, 'factory', 'branches.json'), JSON.stringify({
    released: { item: 'work/01-done', session: 's1' }, ghost: { item: 'work/99-none', session: 's2' }, fine: { item: 'work/02-open', session: 's3' },
  }));
  fs.mkdirSync(path.join(root, 'work', '02-open'));
  fs.writeFileSync(path.join(root, 'work', '02-open', 'item.md'), '# Open\n\n## Release\n<!-- later -->\n');
  return root;
};

test('each kind of orphan is found, and a registered open branch is not', () => {
  const root = repo();
  const f = findings(root, { now: Date.now() });
  const kinds = (b) => f.filter((x) => x.name === b).map((x) => x.kind).sort();
  assert.deepEqual(kinds('merged'), ['merged, not deleted']);
  assert.deepEqual(kinds('released'), ['released, not merged']);
  assert.deepEqual(kinds('stray'), ['unregistered']);
  assert.deepEqual(kinds('ghost'), ['no item']);
  assert.deepEqual(kinds('fine'), []);
  assert.deepEqual(kinds('main'), []);
});

test('a branch with no commit for longer than the idle days is idle', () => {
  const root = repo();
  const f = findings(root, { now: Date.now() + 5 * 86_400_000, idleDays: 3 });
  assert.ok(f.some((x) => x.name === 'fine' && x.kind === 'idle'));
  assert.ok(!f.some((x) => x.name === 'merged' && x.kind === 'idle'));
});

test('a detached worktree is a review copy left behind; nothing is deleted', () => {
  const root = repo();
  const copy = path.join(fs.realpathSync(os.tmpdir()), `factory-orphans-copy-${process.pid}-${Date.now()}`);
  sh(root, 'worktree', 'add', '-q', '--detach', copy, 'main');
  const f = findings(root, { now: Date.now() });
  assert.ok(f.some((x) => x.kind === 'worktree detached' && x.name === copy));
  assert.ok(fs.existsSync(copy));
  assert.match(sh(root, 'branch', '--list', 'merged'), /merged/);
  sh(root, 'worktree', 'remove', '--force', copy);
});
