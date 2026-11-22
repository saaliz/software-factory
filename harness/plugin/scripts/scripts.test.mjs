// node --test harness/plugin/scripts/scripts.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tryTake, release, list, limits, DEFAULTS, aloneWaiter, announceAlone, logEntry, writeLog, pollMs, waitingJobs, mainCopy } from './slots.mjs';
import { beat } from './heartbeat.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fresh = () => fs.mkdtempSync(path.join(os.tmpdir(), 'factory-slots-'));
const allAlive = () => true;
/** Every file left in the slot folder, the queues' tickets included: a freed job leaves only its log line. */
const leftovers = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => fs.statSync(path.join(dir, f)).isFile()).map((f) => f.split(path.sep).join('/'));

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
  assert.deepEqual(limits({}, root), { ...DEFAULTS, laneHeavy: 2 });
  fs.mkdirSync(path.join(root, 'factory'));
  fs.writeFileSync(path.join(root, 'factory', 'harness.json'), JSON.stringify({ slots: { heavy: 2 } }));
  assert.deepEqual(limits({}, path.join(root, 'factory')), { ci: 1, heavy: 2, laneHeavy: 1 });
  assert.deepEqual(limits({ FACTORY_SLOTS_CI: '2' }, root), { ci: 2, heavy: 2, laneHeavy: 1 });
});

test('run whole: the command runs in a slot, its exit code comes back, and the slot is freed', () => {
  const dir = fresh();
  const env = { ...process.env, FACTORY_SLOTS: dir };
  const r = spawnSync(process.execPath, [path.join(here, 'slots.mjs'), 'ci', '--label', 'p01', '--', 'node', '-e', 'process.exit(3)'], { env, encoding: 'utf8' });
  assert.equal(r.status, 3);
  assert.deepEqual(leftovers(dir), ['log.jsonl'], 'the slots are freed; only the job log stays');
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

test('while a job waits to run alone, no other job takes a heavy slot, and the job itself does', () => {
  const dir = fresh();
  assert.ok(tryTake('heavy', 'build', { dir, pid: 201, isAlive: allAlive, max: 3 }));
  const marker = announceAlone('package-ci', { dir, pid: 500, isAlive: allAlive });
  assert.equal(tryTake('heavy', 'another-build', { dir, pid: 202, isAlive: allAlive, max: 3 }), null, 'two slots are free, and still none is given');
  assert.ok(tryTake('heavy', 'package-ci', { dir, pid: 500, isAlive: allAlive, max: 3 }));
  assert.ok(tryTake('heavy', 'package-ci', { dir, pid: 500, isAlive: allAlive, max: 3 }));
  release(marker);
  assert.equal(aloneWaiter({ dir, isAlive: allAlive }), null);
  release(path.join(dir, 'heavy-2.lock'));
  assert.ok(tryTake('heavy', 'another-build', { dir, pid: 202, isAlive: allAlive, max: 3 }), 'the marker gone, the others take what is free again');
});

test('a waiting marker whose process is gone holds nobody back, and is removed', () => {
  const dir = fresh();
  announceAlone('dead-ci', { dir, pid: 500, isAlive: allAlive });
  const but500 = (pid) => pid !== 500;
  assert.ok(tryTake('heavy', 'build', { dir, pid: 202, isAlive: but500, max: 3 }));
  assert.equal(aloneWaiter({ dir, isAlive: but500 }), null);
  assert.ok(!fs.existsSync(path.join(dir, 'alone-waiting.lock')));
});

test('a ci slot is not held back by the marker, and the list shows slots only', () => {
  const dir = fresh();
  announceAlone('package-ci', { dir, pid: 500, isAlive: allAlive });
  assert.ok(tryTake('ci', 'next-ci', { dir, pid: 600, isAlive: allAlive, max: 1 }));
  assert.deepEqual(list({ dir, isAlive: allAlive }).map((l) => l.slot), ['ci-1']);
});

test('one job waits alone at a time: a second is told to wait until the first marker goes', () => {
  const dir = fresh();
  const marker = announceAlone('first', { dir, pid: 500, isAlive: allAlive });
  assert.equal(announceAlone('second', { dir, pid: 501, isAlive: allAlive }), null);
  assert.equal(aloneWaiter({ dir, isAlive: allAlive }).label, 'first', 'the first marker is not written over');
  assert.equal(announceAlone('first', { dir, pid: 500, isAlive: allAlive }), marker);
  release(marker);
  assert.ok(announceAlone('second', { dir, pid: 501, isAlive: allAlive }));
  assert.ok(announceAlone('third', { dir, pid: 502, isAlive: (pid) => pid !== 501 }), 'a marker whose process is gone is taken over');
});

test('a job leaves one log line: what it waited and how long it ran', () => {
  const dir = fresh();
  const entry = logEntry({ kind: 'ci', alone: true, label: 'package-ci', asked: '2026-01-05T10:00:00.000Z', started: '2026-01-05T10:18:00.000Z', ended: '2026-01-05T10:40:30.000Z', code: 0 });
  assert.equal(entry.waitedSeconds, 1080);
  assert.equal(entry.ranSeconds, 1350);
  assert.deepEqual(Object.keys(entry), ['kind', 'alone', 'label', 'asked', 'started', 'ended', 'waitedSeconds', 'ranSeconds', 'code']);
  writeLog(entry, dir);
  writeLog({ ...entry, label: 'second' }, dir);
  const lines = fs.readFileSync(path.join(dir, 'log.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(lines.map((l) => l.label), ['package-ci', 'second']);
  writeLog(entry, path.join(dir, 'no-such-folder'));
});

test('the wait between tries is five seconds unless FACTORY_SLOTS_POLL_MS says otherwise', () => {
  assert.equal(pollMs({}), 5000);
  assert.equal(pollMs({ FACTORY_SLOTS_POLL_MS: '50' }), 50);
});

const heldSlots = ['node', '-e', 'process.exit(Number(process.env.FACTORY_HEAVY_SLOTS))'];
const logOf = (dir) => fs.readFileSync(path.join(dir, 'log.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));

test('run whole: the command is told how many heavy slots it holds, one or with --alone all, and each job is logged', () => {
  const dir = fresh();
  const env = { ...process.env, FACTORY_SLOTS: dir, FACTORY_SLOTS_HEAVY: '4' };
  const slots = (...a) => spawnSync(process.execPath, [path.join(here, 'slots.mjs'), ...a, '--', ...heldSlots], { env, encoding: 'utf8' });
  assert.equal(slots('heavy', '--label', 'build').status, 1);
  assert.equal(slots('ci', '--alone', '--label', 'p01').status, 4);
  assert.deepEqual(leftovers(dir), ['log.jsonl'], 'every slot and the waiting marker are freed');
  const [build, ci] = logOf(dir);
  assert.deepEqual([build.kind, build.alone, build.label, build.code], ['heavy', false, 'build', 1]);
  assert.deepEqual([ci.kind, ci.alone, ci.label, ci.code], ['ci', true, 'p01', 4]);
  assert.ok(ci.asked <= ci.started && ci.started <= ci.ended && ci.waitedSeconds >= 0 && ci.ranSeconds >= 0);
});

test('run whole: a CI asking to run alone says it waits, nothing passes it by, and it runs once the busy slot is freed', async () => {
  const dir = fresh();
  const busy = tryTake('heavy', 'build', { dir, pid: process.pid, max: 2 });
  const env = { ...process.env, FACTORY_SLOTS: dir, FACTORY_SLOTS_HEAVY: '2', FACTORY_SLOTS_POLL_MS: '50' };
  const child = spawn(process.execPath, [path.join(here, 'slots.mjs'), 'ci', '--alone', '--label', 'p02', '--', ...heldSlots], { env, stdio: 'ignore' });
  const ended = new Promise((resolve) => child.on('exit', resolve));
  const until = async (what, ok) => { for (let i = 0; i < 200 && !ok(); i++) await new Promise((r) => setTimeout(r, 50)); assert.ok(ok(), what); };
  try {
    await until('it holds the one free heavy slot and still waits', () => fs.existsSync(path.join(dir, 'heavy-2.lock')));
    assert.equal(aloneWaiter({ dir }).label, 'p02');
    release(busy);
    assert.equal(tryTake('heavy', 'another-build', { dir, pid: process.pid, max: 2 }), null, 'the slot just freed is kept for the waiting CI');
    assert.equal(await ended, 2);
  } finally { child.kill(); }
  assert.deepEqual(leftovers(dir), ['log.jsonl']);
  assert.deepEqual([logOf(dir)[0].alone, logOf(dir)[0].code], [true, 2]);
});

function repo() {
  const root = fresh();
  const git = (...a) => spawnSync('git', a, { cwd: root, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  fs.writeFileSync(path.join(root, 'a.txt'), 'a');
  git('add', '.');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'a');
  return root;
}

test('the heartbeat judges by merges: activity without a merge in two hours is a finding', () => {
  const root = fresh();
  const now = Date.now(), H = 3_600_000;
  const quiet = { now, locks: [], waits: [], log: [], cfg: {} };
  assert.equal(beat(root, { ...quiet, mergeAt: now - 0.5 * H }).ok, true);
  const busy = beat(root, { ...quiet, mergeAt: now - 9 * H, locks: [{ slot: 'heavy-1', label: 'build', live: true, at: new Date(now - 60_000).toISOString() }] });
  assert.equal(busy.ok, false, 'a live slot is activity, not a merge');
  assert.match(busy.findings[0], /no merge on main in 9\.0 hours: find why/);
  assert.equal(beat(root, { ...quiet, mergeAt: now - 3 * H, cfg: { heartbeat: { noMergeHours: 4 } } }).ok, true);
  assert.match(beat(root, { ...quiet, mergeAt: null }).findings[0], /in its history/);
});

test('the heartbeat names a CI past 40 minutes, a wait past an hour, a green CI not merged, and a stale slot', () => {
  const root = fresh();
  const now = Date.now(), M = 60_000;
  const iso = (ms) => new Date(ms).toISOString();
  const r = beat(root, {
    now, cfg: {}, mergeAt: now - 30 * M,
    locks: [{ slot: 'ci-1', label: 'p04', live: true, at: iso(now - 45 * M) }, { slot: 'heavy-2', label: 'old', live: false }],
    waits: [{ label: 'p05', kind: 'ci', since: iso(now - 70 * M), live: true }, { label: 'gone', kind: 'heavy', since: iso(now - 300 * M), live: false }],
    log: [{ kind: 'ci', code: 0, label: 'p03', ended: iso(now - 10 * M) }, { kind: 'ci', code: 0, label: 'p02', ended: iso(now - 40 * M) }, { kind: 'ci', code: 1, label: 'p06', ended: iso(now - 5 * M) }],
  });
  assert.deepEqual(r.findings, [
    'CI p04 running 45 minutes: check it, and stop it if it is hung',
    'p05 waiting 1.2 hours for a ci slot: name its cause',
    'green CI p03, not merged since: chase its merge',
    'stale slot heavy-2 old: stuck',
  ]);
});

test('the heartbeat run whole: ok after a fresh merge; act, and --then runs, when there is a finding', () => {
  const root = repo();
  const env = { ...process.env, FACTORY_SLOTS: fresh() };
  const hb = (...a) => spawnSync(process.execPath, [path.join(here, 'heartbeat.mjs'), ...a], { cwd: root, env, encoding: 'utf8' });
  assert.match(hb().stdout, /^ok: last merge 0 minutes ago/);
  fs.writeFileSync(path.join(env.FACTORY_SLOTS, 'log.jsonl'), `${JSON.stringify({ kind: 'ci', code: 0, label: 'p07', ended: new Date(Date.now() + 60_000).toISOString() })}\n`);
  const r = hb('--then', 'node -e "console.log(\'beat ran\')"');
  assert.match(r.stdout, /act:\n {2}green CI p07, not merged since: chase its merge[\s\S]*beat ran/);
  assert.equal(r.status, 0);
  assert.equal(hb().status, 1);
});

test('a job waiting for its slots says so until it starts, and list shows it', async () => {
  const dir = fresh();
  tryTake('ci', 'first', { dir, pid: process.pid, isAlive: allAlive, max: 1 });
  const env = { ...process.env, FACTORY_SLOTS: dir, FACTORY_SLOTS_POLL_MS: '50', FACTORY_SLOTS_ANY_COPY: '1' };
  const child = spawn(process.execPath, [path.join(here, 'slots.mjs'), 'ci', '--label', 'second', '--', 'node', '-e', '0'], { env });
  await new Promise((r) => setTimeout(r, 600));
  const w = waitingJobs({ dir });
  assert.deepEqual([w.length, w[0]?.label, w[0]?.kind, w[0]?.live], [1, 'second', 'ci', true]);
  assert.match(spawnSync(process.execPath, [path.join(here, 'slots.mjs'), 'list'], { env, encoding: 'utf8' }).stdout, /waiting: ci second since/);
  for (const f of fs.readdirSync(dir).filter((n) => /^ci-\d+\.lock$/.test(n))) fs.unlinkSync(path.join(dir, f));
  const code = await new Promise((r) => child.on('exit', r));
  assert.equal(code, 0);
  assert.deepEqual(waitingJobs({ dir }), [], 'gone once it ran');
});

test('run from a worktree, the slot script runs the main checkout\'s copy instead', () => {
  const root = repo();
  const git = (...a) => spawnSync('git', a, { cwd: root, encoding: 'utf8' });
  const tools = path.join(root, 'factory', 'tools');
  fs.mkdirSync(tools, { recursive: true });
  for (const f of ['slots.mjs', 'config.mjs']) fs.copyFileSync(path.join(here, f), path.join(tools, f));
  git('add', '.');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'tools');
  const wt = path.join(fresh(), 'wt');
  git('worktree', 'add', '-q', wt, '-b', 'lane');
  // The main checkout's copy changes after the worktree was cut: the worktree's own copy is now old.
  fs.appendFileSync(path.join(tools, 'slots.mjs'), "\nif (process.argv[2] === 'list') console.log('the main copy ran');\n");
  assert.equal(mainCopy(path.join(wt, 'factory', 'tools', 'slots.mjs'), wt), path.join(root, 'factory', 'tools', 'slots.mjs'));
  assert.equal(mainCopy(path.join(tools, 'slots.mjs'), root), null, 'the main copy itself runs as it is');
  const env = { ...process.env, FACTORY_SLOTS: fresh() };
  delete env.FACTORY_SLOTS_ANY_COPY;
  const r = spawnSync(process.execPath, [path.join(wt, 'factory', 'tools', 'slots.mjs'), 'list'], { cwd: wt, env, encoding: 'utf8' });
  assert.match(r.stdout, /the main copy ran/);
});

test('claim-super reports a fresh claim and refuses when none was recorded', () => {
  const root = repo();
  const claim = () => spawnSync(process.execPath, [path.join(here, 'claim-super.mjs')], { cwd: root, encoding: 'utf8' });
  assert.equal(claim().status, 1);
  fs.writeFileSync(path.join(root, '.git', 'factory-super.json'), JSON.stringify({ session: 'abc', at: new Date().toISOString() }));
  assert.match(claim().stdout, /the super is session abc/);
});
