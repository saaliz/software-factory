// Jobs side by side: how many at once, in what order, and that every one runs and a red one stays red.
//   node --test harness/plugin/scripts/side-by-side.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CAP, lastSeconds, longestFirst, runSideBySide, streamCount } from './side-by-side.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fresh = () => fs.mkdtempSync(path.join(os.tmpdir(), 'factory-side-'));

test('one at a time without a slot; with slots, as many as held, capped', () => {
  assert.equal(DEFAULT_CAP, 2);
  assert.equal(streamCount({}), 1);
  assert.equal(streamCount({ FACTORY_HEAVY_SLOTS: '1' }), 1);
  assert.equal(streamCount({ FACTORY_HEAVY_SLOTS: '3' }), DEFAULT_CAP);
  assert.equal(streamCount({ FACTORY_HEAVY_SLOTS: '3', FACTORY_CI_STREAMS: '3' }), 3);
  assert.equal(streamCount({ FACTORY_HEAVY_SLOTS: '1', FACTORY_CI_STREAMS: '3' }), 1, 'never more than the slots held');
  assert.equal(streamCount({ FACTORY_HEAVY_SLOTS: '3', FACTORY_CI_STREAMS: '0' }), 1);
  assert.equal(streamCount({ FACTORY_HEAVY_SLOTS: 'many' }), 1);
});

test('the slowest known job starts first, and an unknown one before it', () => {
  const order = longestFirst([{ name: 'short' }, { name: 'long' }, { name: 'new' }, { name: 'middle' }], { short: 40, long: 490, middle: 110 });
  assert.deepEqual(order.map((j) => j.name), ['new', 'long', 'middle', 'short']);
});

test('the last run\'s seconds come from its results file, and from nothing when there is none', () => {
  const file = path.join(fresh(), 'results.json');
  assert.deepEqual(lastSeconds(file), {});
  fs.writeFileSync(file, JSON.stringify([{ name: 'long', code: 0, seconds: 490 }, { name: 'short', code: 1, seconds: 40 }]));
  assert.deepEqual(lastSeconds(file), { long: 490, short: 40 });
  fs.writeFileSync(file, 'cut off');
  assert.deepEqual(lastSeconds(file), {});
});

test('every job runs, never more than the streams at once, and results keep the order given', async () => {
  const jobs = ['a', 'b', 'c', 'd', 'e'].map((name) => ({ name }));
  let running = 0, most = 0;
  const ran = [];
  const start = async (job) => {
    running++; most = Math.max(most, running);
    await new Promise((r) => setTimeout(r, 5));
    ran.push(job.name); running--;
    return 0;
  };
  const results = await runSideBySide(jobs, 2, start);
  assert.equal(most, 2);
  assert.deepEqual(ran.sort(), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(results.map((r) => r.name), ['a', 'b', 'c', 'd', 'e']);
});

test('a red job stays red and the others still run', async () => {
  const results = await runSideBySide([{ name: 'green' }, { name: 'red' }, { name: 'throws' }, { name: 'after' }], 3, async (job) => {
    if (job.name === 'throws') throw new Error('cannot start');
    return job.name === 'red' ? 1 : 0;
  });
  assert.deepEqual(results.map((r) => r.code), [0, 1, 1, 0]);
});

test('one stream runs the jobs one after another, in order', async () => {
  const ran = [];
  await runSideBySide([{ name: 'a' }, { name: 'b' }, { name: 'c' }], 1, async (job) => { ran.push(job.name); return 0; });
  assert.deepEqual(ran, ['a', 'b', 'c']);
});

test('run whole: every job runs, each one\'s output stays whole, the results are written, and one red job makes the run red', () => {
  const dir = fresh();
  const jobsFile = path.join(dir, 'jobs.json'), resultsFile = path.join(dir, 'results.json');
  const lines = (word, code) => `let n = 0; const t = setInterval(() => { console.log('${word} ' + n); if (++n === 5) { clearInterval(t); process.exitCode = ${code}; } }, 20);`;
  const job = (name, code) => ({ name, command: process.execPath, args: ['-e', lines(name, code)] });
  fs.writeFileSync(jobsFile, JSON.stringify([job('first', 0), job('second', 3), { name: 'by-the-shell', command: 'node -e "console.log(40+2)"' }, { name: 'no-such', command: path.join(dir, 'no-such-command'), args: [] }]));
  fs.writeFileSync(resultsFile, JSON.stringify([{ name: 'second', code: 0, seconds: 90 }, { name: 'first', code: 0, seconds: 10 }, { name: 'by-the-shell', code: 0, seconds: 5 }, { name: 'no-such', code: 0, seconds: 1 }]));
  const run = (env) => spawnSync(process.execPath, [path.join(here, 'side-by-side.mjs'), jobsFile, resultsFile], { env: { ...process.env, FACTORY_CI_STREAMS: '', ...env }, encoding: 'utf8' });
  const r = run({ FACTORY_HEAVY_SLOTS: '3' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^4 jobs, 2 at a time/);
  const whole = (word) => [0, 1, 2, 3, 4].map((n) => `${word} ${n}`).join('\n');
  assert.ok(r.stdout.replace(/\r/g, '').includes(`--- second (exit 3) ---\n${whole('second')}\n`), r.stdout);
  assert.ok(r.stdout.replace(/\r/g, '').includes(`--- first (exit 0) ---\n${whole('first')}\n`), r.stdout);
  assert.match(r.stdout, /--- by-the-shell \(exit 0\) ---\r?\n42/);
  const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  assert.deepEqual(results.map((x) => [x.name, x.code]), [['second', 3], ['first', 0], ['by-the-shell', 0], ['no-such', 1]], 'slowest of the last run first');
  assert.match(run({ FACTORY_HEAVY_SLOTS: '' }).stdout, /^4 jobs, 1 at a time/);
  assert.equal(spawnSync(process.execPath, [path.join(here, 'side-by-side.mjs'), jobsFile], { encoding: 'utf8' }).status, 2);
});
