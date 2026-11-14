// Runs a list of commands side by side, as many at once as the run holds heavy slots: a CI's test suites, when each
// brings up what it needs for itself, so two never share state. slots.mjs tells it how many it holds, FACTORY_HEAVY_SLOTS;
// without a slot, one at a time. Every job still runs and every result is still written: only the order and the overlap
// change. The slowest known job starts first, so the long one never waits behind the short ones.
//   node factory/tools/side-by-side.mjs <jobs.json> <results.json>
//   node factory/tools/slots.mjs ci --alone --label <package> -- node factory/tools/side-by-side.mjs <jobs.json> <results.json>
// jobs.json: [{ "name", "command", "args" }]; a job with no "args" is one command line, run by the shell.
// results.json: [{ "name", "code", "seconds" }]. If it is there from the last run, its seconds set this run's order.
// Exit code 0 only when every job ended 0. At most FACTORY_CI_STREAMS at once, 2 unless set; 1 puts back one at a time.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Memory, not processors, was the limit where this was first measured: two at once unless FACTORY_CI_STREAMS says otherwise. */
export const DEFAULT_CAP = 2;

/** How many jobs run at once: the heavy slots held, capped; never under one. */
export function streamCount(env = process.env) {
  const held = Number.parseInt(env.FACTORY_HEAVY_SLOTS ?? '', 10);
  const cap = Number.parseInt(env.FACTORY_CI_STREAMS ?? '', 10);
  return Math.max(1, Math.min(Number.isFinite(held) ? held : 1, Number.isFinite(cap) ? cap : DEFAULT_CAP));
}

/** Slowest first by the seconds the last run recorded; a job with no record goes first, since its length is unknown. */
export function longestFirst(jobs, known = {}) {
  return [...jobs].sort((a, b) => (known[b.name] ?? Infinity) - (known[a.name] ?? Infinity) || a.name.localeCompare(b.name));
}

/** The seconds each job took in the last run, by name, from its results file; nothing when there is none. */
export function lastSeconds(resultsFile) {
  try { return Object.fromEntries(JSON.parse(fs.readFileSync(resultsFile, 'utf8')).map((r) => [r.name, r.seconds])); } catch { return {}; }
}

/**
 * Runs every job, at most `streams` at once, and answers `{ name, code, seconds }` for each, in the order given.
 * `start(job)` runs one and answers its exit code; a job that cannot start counts as failed and the rest still run.
 */
export async function runSideBySide(jobs, streams, start, now = Date.now) {
  const results = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= jobs.length) return;
      const began = now();
      let code;
      try { code = await start(jobs[i]); } catch { code = 1; }
      results[i] = { name: jobs[i].name, code, seconds: Math.round((now() - began) / 1000) };
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(streams, jobs.length)) }, worker));
  return results;
}

/** Starts one job, keeping its output whole and printing it when the job ends, so two jobs' lines never mix. */
function startProcess(job) {
  return new Promise((resolve) => {
    const chunks = [];
    const child = spawn(job.command, job.args ?? [], { env: process.env, stdio: ['ignore', 'pipe', 'pipe'], shell: !job.args });
    child.stdout.on('data', (d) => chunks.push(d));
    child.stderr.on('data', (d) => chunks.push(d));
    let ended = false;
    const end = (code) => {
      if (ended) return;
      ended = true;
      process.stdout.write(`\n--- ${job.name} (exit ${code}) ---\n${Buffer.concat(chunks).toString('utf8')}`);
      resolve(code);
    };
    child.on('error', (e) => { chunks.push(Buffer.from(String(e))); end(1); });
    child.on('close', (code) => end(code ?? 1));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [jobsFile, resultsFile] = process.argv.slice(2);
  if (!jobsFile || !resultsFile) { console.error('usage: side-by-side.mjs <jobs.json> <results.json>'); process.exit(2); }
  const jobs = longestFirst(JSON.parse(fs.readFileSync(jobsFile, 'utf8')), lastSeconds(resultsFile));
  const streams = streamCount();
  console.log(`${jobs.length} jobs, ${streams} at a time`);
  const results = await runSideBySide(jobs, streams, startProcess);
  fs.writeFileSync(resultsFile, JSON.stringify(results));
  process.exit(results.every((r) => r.code === 0) ? 0 : 1);
}
