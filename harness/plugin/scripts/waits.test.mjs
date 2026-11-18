// Who waited on whom for the machine's slots: every waited second charged to what held the job back.
//   node --test harness/plugin/scripts/waits.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { charge, ciSlotUse, drainFrom, jobsOf, totals } from './waits.mjs';

const at = (minute) => new Date(Date.UTC(2026, 10, 14, 12, 0, 0) + minute * 60_000).toISOString();
const job = (kind, label, asked, started, ended, { alone = false, code = 0 } = {}) => ({ kind, alone, label, asked: at(asked), started: at(started), ended: at(ended), code });

test('a CI behind a running CI is charged to it, and the rest of its wait to the heavy jobs it let end', () => {
  const jobs = jobsOf([job('ci', 'first', 0, 0, 20, { alone: true }), job('ci', 'second', 5, 23, 40, { alone: true })]);
  const { byCause, byBlocker, jobs: out } = charge(jobs);
  assert.deepEqual(out[1].split, { 'behind a running CI': 15 * 60, 'waiting for heavy jobs to end': 3 * 60 });
  assert.equal(byBlocker.first, 15 * 60);
  assert.equal(byCause['behind a running CI'], 15 * 60);
});

test('a heavy job is charged to the CI that runs alone, to the CI waiting to run alone, or to three heavy jobs', () => {
  const jobs = jobsOf([
    job('ci', 'alone-ci', 10, 14, 30, { alone: true }), // holds the CI slot from minute 10, drains until 14, runs to 30
    job('heavy', 'build', 0, 2, 12),
    job('heavy', 'waited-on-three', 0, 2, 3),          // two minutes with no CI about: three heavy jobs
    job('heavy', 'held-back', 11, 31, 32),             // 3 minutes of the drain, 16 of the run, 1 more after
  ]);
  const { jobs: out, byBlocker } = charge(jobs);
  assert.deepEqual(out.find((j) => j.label === 'waited-on-three').split, { 'every heavy slot taken': 120 });
  assert.deepEqual(out.find((j) => j.label === 'held-back').split, { 'a CI running alone': 16 * 60, 'held back for a CI waiting to run alone': 3 * 60, 'every heavy slot taken': 60 });
  assert.equal(byBlocker['alone-ci'], 19 * 60);
});

test('a heavy job that waits while a CI runs beside other work is charged to that CI, which holds one slot of the three', () => {
  const jobs = jobsOf([job('ci', 'beside', 0, 0, 30), job('heavy', 'build', 5, 20, 21), job('heavy', 'after', 35, 37, 38)]);
  const { jobs: out, byBlocker, byCause } = charge(jobs);
  assert.deepEqual(out.find((j) => j.label === 'build').split, { 'a CI running beside other work': 15 * 60 });
  assert.deepEqual(out.find((j) => j.label === 'after').split, { 'every heavy slot taken': 120 });
  assert.equal(byBlocker.beside, 15 * 60);
  assert.equal(byCause['every heavy slot taken'], 120);
});

test('a CI that ran alone began to drain when it asked, or when the CI before it ended, whichever was later', () => {
  const jobs = jobsOf([job('ci', 'a', 0, 0, 20, { alone: true }), job('ci', 'b', 5, 24, 40, { alone: true }), job('ci', 'c', 50, 53, 60, { alone: true })]);
  assert.equal(drainFrom(jobs[1], jobs), Date.parse(at(20)));
  assert.equal(drainFrom(jobs[2], jobs), Date.parse(at(50)));
});

test('the totals by kind, the red runs with what they cost, and the share of the time the CI slot was held', () => {
  const jobs = jobsOf([job('ci', 'a', 0, 0, 20, { alone: true }), job('ci', 'b', 5, 24, 40, { alone: true, code: 1 }), job('heavy', 'h', 0, 41, 42)]);
  const t = totals(jobs);
  assert.deepEqual(t.ci, { jobs: 2, waited: 19 * 60, ran: 36 * 60, red: 1, redRan: 16 * 60, longestWait: 19 * 60 });
  assert.equal(t.heavy.waited, 41 * 60);
  // Held from 0 to 40 of 42 minutes: the second CI held the slot from the first one's end.
  assert.deepEqual(ciSlotUse(jobs), { span: 42 * 60, held: 40 * 60, share: 95, running: 36 * 60, runningShare: 86 });
  assert.deepEqual(ciSlotUse([]), { span: 0, held: 0, share: 0, running: 0, runningShare: 0 });
});

test('a log line as text or as an object is read alike; an empty line, or a line with no end, is no job', () => {
  const j = job('heavy', 'x', 0, 1, 2);
  assert.equal(jobsOf([JSON.stringify(j), '', j, { kind: 'heavy', label: 'began', asked: j.asked, started: j.started }]).length, 2);
});
