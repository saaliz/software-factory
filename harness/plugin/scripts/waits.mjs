// Who waited on whom for the machine's slots, read from the slot script's log (one line a job: factory/tools/slots.mjs, log.jsonl).
// Each second a job waited is charged to what held the thing it needed: a CI that was running (alone, holding every heavy slot, or
// beside other work, holding one), a CI that was waiting to run alone (which holds every heavy slot back while the running jobs end),
// or, with no CI about, every heavy slot taken. It changes nothing.
//   node factory/tools/waits.mjs                      the whole log, as text
//   node factory/tools/waits.mjs --since 2026-11-14T12:00:00Z --until 2026-11-14T21:27:30Z --json
// The method that reads it: factory/methods/nobody-waits.md. A job leaves its line only when it ends, so a job that was stopped,
// or run by a copy of the slot script that writes no log, is not in it: time waited with no holder in the log points at one.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slotDir } from './slots.mjs';

const ms = (t) => new Date(t).getTime();
const overlap = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

/** The log's lines as jobs with their times in milliseconds, in the order they asked. */
export const jobsOf = (lines) => lines.filter(Boolean).map((l) => (typeof l === 'string' ? JSON.parse(l) : l)).filter((j) => j.asked && j.started && j.ended)
  .map((j) => ({ ...j, a: ms(j.asked), s: ms(j.started), e: ms(j.ended) })).sort((x, y) => x.a - y.a);

/**
 * For a CI that ran alone: the moment it held the CI slot and began to wait for every heavy slot (the later of its asking and the
 * end of the CI before it), so `s - drainFrom` is the time the machine's heavy slots were held back for it.
 */
export function drainFrom(job, jobs) {
  const before = jobs.filter((c) => c.kind === 'ci' && c !== job && c.s < job.s).map((c) => c.e);
  return Math.min(job.s, Math.max(job.a, ...before));
}

/**
 * Charges every waited second. Answers `{ byCause, byBlocker, jobs }`: seconds by cause, seconds of other jobs' waiting each
 * job caused (by its label), and each job with its own split.
 * Causes: for a CI, `behind a running CI` and `waiting for heavy jobs to end`; for a heavy job, `a CI running alone`,
 * `held back for a CI waiting to run alone`, `a CI running beside other work` (it holds one heavy slot of the three) and,
 * with no CI about, `every heavy slot taken`.
 */
export function charge(jobs) {
  const byCause = {}, byBlocker = {};
  const add = (o, k, v) => { if (v > 0) o[k] = (o[k] ?? 0) + v; };
  const cis = jobs.filter((j) => j.kind === 'ci');
  const out = jobs.map((j) => {
    const split = {};
    let left = j.s - j.a;
    const take = (cause, blocker, seconds) => { const v = Math.min(left, seconds); if (v <= 0) return; left -= v; add(split, cause, v); add(byCause, cause, v); if (blocker) add(byBlocker, blocker, v); };
    if (j.kind === 'ci') {
      for (const c of cis) if (c !== j) take('behind a running CI', c.label, overlap(j.a, j.s, c.s, c.e));
      take('waiting for heavy jobs to end', null, left);
    } else {
      for (const c of cis.filter((c) => c.alone)) {
        take('a CI running alone', c.label, overlap(j.a, j.s, c.s, c.e));
        take('held back for a CI waiting to run alone', c.label, overlap(j.a, j.s, drainFrom(c, jobs), c.s));
      }
      for (const c of cis.filter((c) => !c.alone)) take('a CI running beside other work', c.label, overlap(j.a, j.s, c.s, c.e));
      take('every heavy slot taken', null, left);
    }
    return { kind: j.kind, alone: Boolean(j.alone), label: j.label, asked: j.asked, waited: Math.round((j.s - j.a) / 1000), ran: Math.round((j.e - j.s) / 1000), code: j.code, split: Object.fromEntries(Object.entries(split).map(([k, v]) => [k, Math.round(v / 1000)])) };
  });
  const seconds = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v / 1000)]).sort((x, y) => y[1] - x[1]));
  return { byCause: seconds(byCause), byBlocker: seconds(byBlocker), jobs: out };
}

/** The totals a reader asks first: jobs, seconds waited and run by kind, the red runs and what they cost in running seconds. */
export function totals(jobs) {
  const kinds = {};
  for (const j of jobs) {
    const k = j.kind === 'ci' ? 'ci' : 'heavy';
    const t = (kinds[k] ??= { jobs: 0, waited: 0, ran: 0, red: 0, redRan: 0, longestWait: 0 });
    const waited = Math.round((j.s - j.a) / 1000), ran = Math.round((j.e - j.s) / 1000);
    t.jobs++; t.waited += waited; t.ran += ran; t.longestWait = Math.max(t.longestWait, waited);
    if (j.code !== 0) { t.red++; t.redRan += ran; }
  }
  return kinds;
}

/**
 * The CI slot's use from the first job's asking to the last job's end, in seconds: `running` while a CI ran, and `held`, which adds
 * the time a CI had the slot and waited for heavy jobs to end. `share` and `runningShare` are their percent of the span.
 */
export function ciSlotUse(jobs) {
  const cis = jobs.filter((j) => j.kind === 'ci');
  if (!jobs.length) return { span: 0, held: 0, share: 0, running: 0, runningShare: 0 };
  const from = Math.min(...jobs.map((j) => j.a)), to = Math.max(...jobs.map((j) => j.e));
  const held = cis.reduce((n, c) => n + (c.e - drainFrom(c, jobs)), 0);
  const running = cis.reduce((n, c) => n + (c.e - c.s), 0);
  return { span: Math.round((to - from) / 1000), held: Math.round(held / 1000), share: Math.round((held / (to - from)) * 100), running: Math.round(running / 1000), runningShare: Math.round((running / (to - from)) * 100) };
}

export function measure({ dir = slotDir(), since, until } = {}) {
  const file = path.join(dir, 'log.jsonl');
  if (!fs.existsSync(file)) return null;
  const jobs = jobsOf(fs.readFileSync(file, 'utf8').split(/\r?\n/)).filter((j) => (!since || j.a >= ms(since)) && (!until || j.e <= ms(until)));
  return { from: jobs[0]?.asked, to: jobs.at(-1)?.ended, totals: totals(jobs), ciSlot: ciSlotUse(jobs), ...charge(jobs) };
}

export function report(m) {
  if (!m) return ['No slot log here.'];
  const h = (s) => `${(s / 3600).toFixed(1)} h`;
  const out = [`Slot log, ${m.from} to ${m.to}.`, ''];
  for (const [k, t] of Object.entries(m.totals)) out.push(`${k}: ${t.jobs} jobs, waited ${h(t.waited)}, ran ${h(t.ran)}, longest wait ${Math.round(t.longestWait / 60)} min; ${t.red} ended red after ${h(t.redRan)} of running.`);
  out.push(`A CI was running ${m.ciSlot.runningShare}% of the ${h(m.ciSlot.span)} the log covers; the CI slot was held ${m.ciSlot.share}% (running, or waiting for heavy jobs to end).`, '', 'Seconds waited, by what held the job back:');
  for (const [k, v] of Object.entries(m.byCause)) out.push(`  ${h(v).padStart(7)}  ${k}`);
  out.push('', 'The jobs others waited on longest (their waiting, added up):');
  for (const [k, v] of Object.entries(m.byBlocker).slice(0, 12)) out.push(`  ${h(v).padStart(7)}  ${k}`);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const m = measure({ since: option('--since'), until: option('--until') });
  console.log(args.includes('--json') ? JSON.stringify(m, null, 2) : report(m).join('\n'));
}
