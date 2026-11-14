// node --test harness/plugin/scripts/scripts.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tryTake, release, list, limits, DEFAULTS } from './slots.mjs';
import { beat } from './heartbeat.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fresh = () => fs.mkdtempSync(path.join(os.tmpdir(), 'factory-slots-'));
const allAlive = () => true;

test('one ci slot: a second taker gets none while the first lives', () => {
  const dir = fresh();
  assert.ok(tryTake('ci', 'a', { dir, pid: 101, isAlive: allAlive, max: 1 }));
  assert.equal(tryTake('ci', 'b', { dir, pid: 102, isAlive: allAlive, max: 1 }), null);
});

test('the heavy limit holds, and no slot past it', () => {
  const dir = fresh();
  for (let i = 0; i < 3; i++) assert.ok(tryTake('heavy', `h${i}`, { dir, pid: 200 + i, isAlive: allAlive, max: 3 }));
  assert.equal(tryTake('heavy', 'h4', { dir, pid: 300, isAlive: allAlive, max: 3 }), null);
});

test('a released slot is taken again; a stale one is taken over', () => {
  const dir = fresh();
  release(tryTake('ci', 'a', { dir, pid: 101, isAlive: allAlive, max: 1 }));
  assert.ok(tryTake('ci', 'b', { dir, pid: 102, isAlive: allAlive, max: 1 }));
  const file = tryTake('ci', 'next', { dir, pid: 103, isAlive: (pid) => pid !== 102, max: 1 });
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).label, 'next');
});

test('list names each holder and whether it lives', () => {
  const dir = fresh();
  tryTake('heavy', 'build', { dir, pid: 101, isAlive: allAlive, max: 3 });
  const [l] = list({ dir, isAlive: () => false });
  assert.equal(l.label, 'build');
  assert.equal(l.live, false);
});

test('limits come from the environment, then factory/harness.json, then the defaults', () => {
  const root = fresh();
  assert.deepEqual(limits({}, root), DEFAULTS);
  fs.mkdirSync(path.join(root, 'factory'));
  fs.writeFileSync(path.join(root, 'factory', 'harness.json'), JSON.stringify({ slots: { heavy: 2 } }));
  assert.deepEqual(limits({}, path.join(root, 'factory')), { ci: 1, heavy: 2 });
  assert.deepEqual(limits({ FACTORY_SLOTS_CI: '2' }, root), { ci: 2, heavy: 2 });
});

test('run whole: the command runs in a slot, its exit code comes back, and the slot is freed', () => {
  const dir = fresh();
  const env = { ...process.env, FACTORY_SLOTS: dir };
  const r = spawnSync(process.execPath, [path.join(here, 'slots.mjs'), 'ci', '--label', 'p01', '--', 'node', '-e', 'process.exit(3)'], { env, encoding: 'utf8' });
  assert.equal(r.status, 3);
  assert.deepEqual(fs.readdirSync(dir), []);
  assert.equal(spawnSync(process.execPath, [path.join(here, 'slots.mjs'), 'ci', '--label', 'x'], { env, encoding: 'utf8' }).status, 2);
});

test('run whole: a second CI waits for the first', () => {
  const dir = fresh();
  tryTake('ci', 'first', { dir, pid: process.pid, isAlive: allAlive, max: 1 });
  const env = { ...process.env, FACTORY_SLOTS: dir, FACTORY_SLOTS_POLL_MS: '50' };
  const r = spawnSync(process.execPath, [path.join(here, 'slots.mjs'), 'ci', '--label', 'second', '--', 'node', '-e', '0'], { env, encoding: 'utf8', timeout: 1500 });
  assert.match(r.stderr, /waiting for a ci slot \(second\)/);
  assert.notEqual(r.status, 0, 'still waiting when stopped');
});

function repo() {
  const root = fresh();
  const git = (...a) => spawnSync('git', a, { cwd: root, encoding: 'utf8' });
  git('init', '-q');
  fs.writeFileSync(path.join(root, 'a.txt'), 'a');
  git('add', '.');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'a');
  return root;
}

test('the heartbeat: moving on a live slot, a recent commit or a fresh NOW.md; idle otherwise; a stale slot is stuck', () => {
  const root = fresh();
  const now = Date.now();
  assert.equal(beat(root, { now, locks: [], commitAt: now - 5 * 60_000 }).moving, true);
  const idle = beat(root, { now, locks: [{ slot: 'heavy-1', label: 'build', live: false }], commitAt: now - 90 * 60_000 });
  assert.equal(idle.moving, false);
  assert.deepEqual(idle.stuck, ['stale slot heavy-1 build']);
  assert.equal(beat(root, { now, locks: [{ slot: 'ci-1', live: true }], commitAt: null }).moving, true);
  fs.mkdirSync(path.join(root, 'factory', 'records'), { recursive: true });
  fs.writeFileSync(path.join(root, 'factory', 'records', 'NOW.md'), 'x');
  assert.equal(beat(root, { now, locks: [], commitAt: null }).moving, true);
  assert.equal(beat(root, { now: now + 31 * 60_000, locks: [], commitAt: null }).moving, false, 'default window 30 minutes');
  fs.writeFileSync(path.join(root, 'factory', 'harness.json'), JSON.stringify({ heartbeatMinutes: 60 }));
  assert.equal(beat(root, { now: now + 31 * 60_000, locks: [], commitAt: null }).moving, true);
});

test('the heartbeat run whole: idle runs --then; moving does not', () => {
  const root = repo();
  const env = { ...process.env, FACTORY_SLOTS: fresh() };
  const hb = (...a) => spawnSync(process.execPath, [path.join(here, 'heartbeat.mjs'), ...a], { cwd: root, env, encoding: 'utf8' });
  assert.match(hb().stdout, /moving: a commit 0 minutes ago/);
  const r = hb('--minutes', '0', '--then', 'node -e "console.log(\'beat ran\')"');
  assert.match(r.stdout, /idle: nothing moved in 0 minutes[\s\S]*beat ran/);
  assert.equal(r.status, 0);
  assert.equal(hb('--minutes', '0').status, 1);
});

test('claim-super reports a fresh claim and refuses when none was recorded', () => {
  const root = repo();
  const claim = () => spawnSync(process.execPath, [path.join(here, 'claim-super.mjs')], { cwd: root, encoding: 'utf8' });
  assert.equal(claim().status, 1);
  fs.writeFileSync(path.join(root, '.git', 'factory-super.json'), JSON.stringify({ session: 'abc', at: new Date().toISOString() }));
  assert.match(claim().stdout, /the super is session abc/);
});
