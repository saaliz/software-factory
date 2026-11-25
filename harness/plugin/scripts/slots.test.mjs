// node --test harness/plugin/scripts/slots.test.mjs
// First come, first served; a lane's share of the heavy slots; files not touched for two minutes are dead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tryTake, release, list, limits, joinQueue, queueHead, laneOf, laneWords, announceAlone, aloneWaiter, waitingJobs, STALE_MS } from './slots.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fresh = () => fs.mkdtempSync(path.join(os.tmpdir(), 'factory-slots-'));
const allAlive = () => true;
const heavy = (dir, label, pid, more = {}) => tryTake('heavy', label, { dir, pid, isAlive: allAlive, max: 3, laneHeavy: 2, ...more });
const age = (file) => { const past = new Date(Date.now() - STALE_MS - 1000); fs.utimesSync(file, past, past); };

test('the CI slot goes first come first served: a later ticket waits while an earlier one lives', () => {
  const dir = fresh();
  joinQueue('ci', 'first', { dir, pid: 301, at: 1000 });
  release(joinQueue('ci', 'second', { dir, pid: 302, at: 2000 }));
  joinQueue('ci', 'second', { dir, pid: 302, at: 2000 });
  assert.equal(tryTake('ci', 'second', { dir, pid: 302, isAlive: allAlive, max: 1 }), null, 'the slot is free, and still the later ticket waits');
  assert.ok(tryTake('ci', 'first', { dir, pid: 301, isAlive: allAlive, max: 1 }));
});

test('a heavy slot goes first come first served, and a dead ticket holds nobody back', () => {
  const dir = fresh();
  joinQueue('heavy', 'fix', { dir, pid: 401, at: 1000 });
  joinQueue('heavy', 'back-to-back', { dir, pid: 402, at: 2000 });
  assert.equal(heavy(dir, 'back-to-back', 402), null, 'three slots are free, and still the later ticket waits');
  assert.ok(heavy(dir, 'fix', 401));
  const other = fresh();
  joinQueue('heavy', 'dead', { dir: other, pid: 401, at: 1000 });
  joinQueue('heavy', 'next', { dir: other, pid: 402, at: 2000 });
  assert.ok(tryTake('heavy', 'next', { dir: other, pid: 402, isAlive: (p) => p !== 401, max: 3, laneHeavy: 2 }));
  assert.equal(queueHead('heavy', { dir: other, isAlive: (p) => p !== 401 }).pid, 402);
});

test('a job waiting to run alone is not held back by the heavy queue; its marker already put it first', () => {
  const dir = fresh();
  joinQueue('heavy', 'build', { dir, pid: 401, at: 1000 });
  announceAlone('main-ci', { dir, pid: 500, isAlive: allAlive });
  assert.ok(heavy(dir, 'main-ci', 500, { alone: true }));
  assert.equal(heavy(dir, 'build', 401), null, 'the marker still holds the earlier ticket back');
});

test("a lane holds at most its share: a third heavy slot for one lane waits while a slot is free", () => {
  const dir = fresh();
  assert.ok(heavy(dir, 'alpha-p07-tests', 701, { lane: 'A' }));
  assert.ok(heavy(dir, 'beta-p03-build', 702, { lane: 'A' }));
  assert.equal(heavy(dir, 'alpha-p08-build', 703, { lane: 'A' }), null, 'one slot is free, and lane A holds two');
  assert.ok(heavy(dir, 'gamma-p05-build', 704, { lane: 'C' }), 'another lane takes the free slot');
});

test("a lane at its share keeps its ticket's place, another lane's later ticket goes past, and the first goes first once its lane drops", () => {
  const dir = fresh();
  const a = heavy(dir, 'alpha-p07-tests', 701, { lane: 'A' });
  heavy(dir, 'alpha-p09-build', 702, { lane: 'A' });
  joinQueue('heavy', 'alpha-p08-build', { dir, pid: 703, at: 1000, lane: 'A' });
  const d = joinQueue('heavy', 'delta-p05-tests', { dir, pid: 704, at: 2000, lane: 'D' });
  joinQueue('heavy', 'beta-p02-build', { dir, pid: 705, at: 3000, lane: 'B' });
  assert.equal(heavy(dir, 'alpha-p08-build', 703, { lane: 'A' }), null, 'lane A is at two');
  assert.ok(heavy(dir, 'delta-p05-tests', 704, { lane: 'D' }), 'lane D goes past the held ticket');
  release(d);
  assert.equal(queueHead('heavy', { dir, isAlive: allAlive }).pid, 703, 'the held ticket keeps its place at the head');
  release(a);
  release(path.join(dir, 'heavy-3.lock'));
  assert.equal(heavy(dir, 'beta-p02-build', 705, { lane: 'B' }), null, 'lane A is below two again, so its earlier ticket goes first');
  assert.ok(heavy(dir, 'alpha-p08-build', 703, { lane: 'A' }));
});

test('the super and a job that runs alone are exempt from the share', () => {
  const dir = fresh();
  heavy(dir, 'main-ci', 801, { lane: 'super' });
  heavy(dir, 'main-rerun', 802, { lane: 'super' });
  assert.ok(heavy(dir, 'main-build', 803, { lane: 'super' }), 'the super takes a third');
  const lone = fresh();
  announceAlone('alpha-p07-ci', { dir: lone, pid: 900, isAlive: allAlive });
  for (let i = 0; i < 3; i++) assert.ok(heavy(lone, 'alpha-p07-ci', 900, { lane: 'A', alone: true }), 'a job that runs alone takes all three');
  assert.deepEqual(list({ dir: lone, isAlive: allAlive }).map((l) => l.alone), [true, true, true]);
});

test("the lane is read from the label's first word, mapped in factory/harness.json lanes; the share defaults to one fewer than heavy", () => {
  const root = fresh();
  fs.mkdirSync(path.join(root, 'factory'));
  fs.writeFileSync(path.join(root, 'factory', 'harness.json'), JSON.stringify({ slots: { heavy: 4 }, lanes: { alpha: 'A', Beta: 'B', main: 'super', '<a word>': '<lane>' } }));
  const words = laneWords(root);
  assert.deepEqual(words, { alpha: 'A', beta: 'B', main: 'super', super: 'super' }, 'placeholders are left out; "super" always names the super');
  const cases = { 'alpha-p07-tests': 'A', 'Beta p03 build': 'B', beta_p01: 'B', 'main-ci': 'super', 'super-rerun': 'super', 'gamma-p01': null, unnamed: null };
  for (const [label, lane] of Object.entries(cases)) assert.equal(laneOf(label, words), lane, label);
  assert.deepEqual(limits({}, root), { ci: 1, heavy: 4, laneHeavy: 3 });
  assert.equal(limits({ FACTORY_SLOTS_LANEHEAVY: '1' }, root).laneHeavy, 1);
  assert.equal(limits({}, fresh()).laneHeavy, 2);
});

test('a ticket, lock, marker or waiting file not touched for two minutes is dead, though its process answers (reused process ids)', () => {
  const dir = fresh();
  const old = joinQueue('heavy', 'died', { dir, pid: 401, at: 1000 });
  age(old);
  joinQueue('heavy', 'next', { dir, pid: 402, at: 2000 });
  assert.equal(queueHead('heavy', { dir, isAlive: allAlive }).pid, 402);
  assert.ok(!fs.existsSync(old), 'the dead ticket is removed');
  const lock = tryTake('ci', 'died', { dir, pid: 403, isAlive: allAlive, max: 1 });
  age(lock);
  assert.equal(list({ dir, isAlive: allAlive })[0].live, false);
  assert.equal(JSON.parse(fs.readFileSync(tryTake('ci', 'next', { dir, pid: 404, isAlive: allAlive, max: 1 }), 'utf8')).label, 'next', 'the dead lock is taken over');
  const marker = announceAlone('died', { dir, pid: 405, isAlive: allAlive });
  age(marker);
  assert.equal(aloneWaiter({ dir, isAlive: allAlive }), null);
  const waiting = path.join(dir, 'waiting-406.json');
  fs.writeFileSync(waiting, JSON.stringify({ pid: 406, label: 'x', kind: 'heavy', since: new Date().toISOString() }));
  age(waiting);
  assert.equal(waitingJobs({ dir, isAlive: allAlive })[0].live, false);
});

test('run whole: a job holding its slot touches its files, so a slot held past the stale time stays live', () => {
  const dir = fresh();
  const env = { ...process.env, FACTORY_SLOTS: dir, FACTORY_SLOTS_STALE_MS: '400', FACTORY_SLOTS_ANY_COPY: '1' };
  const probe = `const fs=require('fs'),p=require('path');setTimeout(()=>{const f=p.join(${JSON.stringify(dir)},'heavy-1.lock');process.exit(Date.now()-fs.statSync(f).mtimeMs<400?0:9)},900)`;
  const r = spawnSync(process.execPath, [path.join(here, 'slots.mjs'), 'heavy', '--label', 'long', '--', 'node', '-e', probe], { env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('run whole: --lane must name a configured lane', () => {
  const root = fresh();
  fs.mkdirSync(path.join(root, 'factory'));
  fs.writeFileSync(path.join(root, 'factory', 'harness.json'), JSON.stringify({ lanes: { alpha: 'A' } }));
  const env = { ...process.env, FACTORY_SLOTS: fresh(), FACTORY_SLOTS_ANY_COPY: '1' };
  const run = (lane) => spawnSync(process.execPath, [path.join(here, 'slots.mjs'), 'heavy', '--lane', lane, '--label', 'x', '--', 'node', '-e', '0'], { cwd: root, env, encoding: 'utf8' });
  assert.equal(run('Z').status, 2);
  assert.match(run('Z').stderr, /--lane is one of A, super, not Z/);
  assert.equal(run('A').status, 0);
});
