// Throughput of the line: criteria proven an hour, each package's hours from seal to merge, and what the slots waited and
// ran. It reads the work items, git and the slot script's log.jsonl; it changes nothing. The method that reads it, and what
// to do with what it shows: factory/methods/throughput.md.
//   node factory/tools/throughput.mjs                     the measurements, as text
//   node factory/tools/throughput.mjs --json              the same, as data
//   node factory/tools/throughput.mjs --since 2026-11-13  packages merged and jobs logged since that day
// A package is a work item (a folder under work/ holding item.md). It is sealed when its seal.json exists, and merged when
// its "## Release" holds a line on the main branch; its merge time is the last commit on the main branch that changed item.md.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { slotDir } from './slots.mjs';
import { jobLog } from './heartbeat.mjs';

const HOUR = 3_600_000;
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const git = (cwd, args) => spawnSync('git', args, { cwd, encoding: 'utf8' });

/** One item.md as { criteria, released }: "- " lines under Criteria; any line under Release that is not a comment. */
export function readItem(text) {
  const out = {};
  let at = null;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) { at = m[1]; out[at] = []; continue; }
    if (at) out[at].push(line.trim());
  }
  const body = (k) => (out[k] ?? []).filter((l) => l && !/^<!--.*-->$/.test(l));
  return { criteria: body('Criteria').filter((l) => /^[-*]\s+\S/.test(l)).length, released: body('Release').length > 0 };
}

/** Every work item under the work folder, with its criteria, its seal time and, once merged, its merge time. */
export function packages(root, { work = 'work', main = 'main' } = {}) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) {
      if (!e.isDirectory() || e.name === 'tmp') continue;
      const dir = path.join(d, e.name), item = path.join(dir, 'item.md');
      if (!fs.existsSync(item)) { walk(dir); continue; }
      const rel = path.relative(root, dir).split(path.sep).join('/');
      const shown = git(root, ['show', `${main}:${rel}/item.md`]);
      const onMain = shown.status === 0 ? readItem(shown.stdout) : null;
      const here = readItem(fs.readFileSync(item, 'utf8'));
      let sealedAt = null;
      try { sealedAt = JSON.parse(fs.readFileSync(path.join(dir, 'seal.json'), 'utf8')).sealedAt ?? null; } catch { /* not sealed */ }
      let mergedAt = null;
      if (onMain?.released) {
        const t = Number(git(root, ['log', main, '-1', '--format=%ct', '--', `${rel}/item.md`]).stdout.trim());
        mergedAt = t ? new Date(t * 1000).toISOString() : null;
      }
      out.push({ item: rel, criteria: (onMain ?? here).criteria, sealedAt, mergedAt, hoursSealToMerge: sealedAt && mergedAt ? round((Date.parse(mergedAt) - Date.parse(sealedAt)) / HOUR) : null });
    }
  };
  walk(path.join(root, work));
  return out.sort((a, b) => String(a.mergedAt ?? a.sealedAt ?? '').localeCompare(String(b.mergedAt ?? b.sealedAt ?? '')));
}

const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

/** The slot log by kind: jobs, red ones, median and longest wait, minutes run. */
export function jobs(log, since) {
  const out = {};
  for (const e of log.filter((x) => !since || Date.parse(x.ended ?? x.started) >= since)) {
    const k = `${e.kind}${e.alone ? ' alone' : ''}`;
    (out[k] ??= []).push(e);
  }
  return Object.fromEntries(Object.entries(out).map(([k, es]) => [k, {
    jobs: es.length, red: es.filter((e) => e.code !== 0).length,
    medianWaitMinutes: round(median(es.map((e) => e.waitedSeconds ?? 0)) / 60, 1),
    longestWaitMinutes: round(Math.max(...es.map((e) => e.waitedSeconds ?? 0)) / 60, 1),
    ranMinutes: round(es.reduce((s, e) => s + (e.ranSeconds ?? 0), 0) / 60, 1),
  }]));
}

/** The whole measurement. */
export function measure(root, { since, now = Date.now(), cfg = {}, log = jobLog(slotDir()) } = {}) {
  const all = packages(root, { work: cfg.work, main: cfg.mainBranch });
  const merged = all.filter((p) => p.mergedAt && (!since || Date.parse(p.mergedAt) >= since));
  const from = since ?? Math.min(...all.map((p) => Date.parse(p.sealedAt ?? p.mergedAt ?? '')).filter(Number.isFinite), now);
  const hours = Math.max((now - from) / HOUR, 1 / 60);
  const criteria = merged.reduce((s, p) => s + p.criteria, 0);
  return {
    window: { from: new Date(from).toISOString(), to: new Date(now).toISOString(), hours: round(hours) },
    merged: merged.length, criteriaMerged: criteria, criteriaAnHour: round(criteria / hours, 1),
    sealedNotMerged: all.filter((p) => p.sealedAt && !p.mergedAt).map((p) => `${p.item} (${p.criteria})`),
    packages: merged, slots: jobs(log, since),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const si = args.indexOf('--since');
  const since = si >= 0 ? Date.parse(args[si + 1]) : undefined;
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'factory', 'harness.json'), 'utf8')); } catch { /* defaults */ }
  const m = measure(process.cwd(), { since, cfg });
  if (args.includes('--json')) { console.log(JSON.stringify(m, null, 2)); process.exit(0); }
  console.log(`${m.window.from} to ${m.window.to}, ${m.window.hours} hours`);
  console.log(`merged: ${m.merged} packages, ${m.criteriaMerged} criteria, ${m.criteriaAnHour} criteria an hour`);
  for (const p of m.packages) console.log(`  ${p.item}: ${p.criteria} criteria, seal to merge ${p.hoursSealToMerge ?? '?'} hours`);
  if (m.sealedNotMerged.length) console.log(`sealed, not merged: ${m.sealedNotMerged.join(', ')}`);
  for (const [k, s] of Object.entries(m.slots)) console.log(`slots, ${k}: ${s.jobs} jobs, ${s.red} red, waits median ${s.medianWaitMinutes} and longest ${s.longestWaitMinutes} minutes, ran ${s.ranMinutes} minutes`);
}
