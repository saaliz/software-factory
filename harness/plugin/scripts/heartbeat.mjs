// The heartbeat's script half: is the line merging? It costs no tokens, so a scheduler can run it often and wake a model
// only when there is something to act on (factory/harness/heartbeat.md). It judges by merges, not activity: on the first
// project an earlier heartbeat that counted commits and live slots said "moving" through nine hours with one merge.
//   node factory/tools/heartbeat.mjs                      prints "ok: <why>" (exit 0), or "act:" and one line per finding (exit 1)
//   node factory/tools/heartbeat.mjs --then "<command>"   when there is something to act on, runs the command (the super's beat)
// Findings, each with its threshold in factory/harness.json "heartbeat":
//   no merge on the main branch in noMergeHours (default 2): find why
//   a CI running past ciHungMinutes (default 40): check it, and stop it if it is hung
//   a job waiting for slots past waitHours (default 1): name its cause
//   a green CI logged after the last merge: chase its merge
//   a stale slot (its process gone): stuck
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { list, slotDir, waitingJobs } from './slots.mjs';

const MIN = 60_000, HOUR = 60 * MIN;

function config(cwd) {
  try { return JSON.parse(fs.readFileSync(path.join(cwd, 'factory', 'harness.json'), 'utf8')); } catch { return {}; }
}

export function thresholds(cfg = {}) {
  const h = cfg.heartbeat ?? {};
  return { noMergeHours: h.noMergeHours ?? 2, ciHungMinutes: h.ciHungMinutes ?? 40, waitHours: h.waitHours ?? 1 };
}

/** When the main branch last moved, in ms: its newest first-parent commit (a merge, or a commit the super made there). */
export function lastMerge(cwd, main = 'main') {
  const r = spawnSync('git', ['log', main, '--first-parent', '-1', '--format=%ct'], { cwd, encoding: 'utf8' });
  const s = Number(r.stdout?.trim());
  return r.status === 0 && s ? s * 1000 : null;
}

/** The slot script's job log, oldest first. */
export function jobLog(dir = slotDir()) {
  try {
    return fs.readFileSync(path.join(dir, 'log.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

const ago = (ms) => (ms >= HOUR ? `${(ms / HOUR).toFixed(1)} hours` : `${Math.round(ms / MIN)} minutes`);

/** { ok, findings, stuck } for a project at cwd. Every input can be given, for tests. */
export function beat(cwd, { now = Date.now(), dir = slotDir(), locks = list({ dir }), waits = waitingJobs({ dir }), log = jobLog(dir), mergeAt, cfg = config(cwd) } = {}) {
  const t = thresholds(cfg);
  const merged = mergeAt === undefined ? lastMerge(cwd, cfg.mainBranch ?? 'main') : mergeAt;
  const findings = [], stuck = [];
  if (!merged || now - merged > t.noMergeHours * HOUR) findings.push(`no merge on ${cfg.mainBranch ?? 'main'} in ${merged ? ago(now - merged) : 'its history'}: find why`);
  for (const l of locks) {
    if (!l.live) { stuck.push(`stale slot ${l.slot} ${l.label ?? ''}`.trim()); continue; }
    if (l.slot.startsWith('ci-') && l.at && now - Date.parse(l.at) > t.ciHungMinutes * MIN) findings.push(`CI ${l.label ?? l.slot} running ${ago(now - Date.parse(l.at))}: check it, and stop it if it is hung`);
  }
  for (const w of waits) if (w.live && w.since && now - Date.parse(w.since) > t.waitHours * HOUR) findings.push(`${w.label ?? 'a job'} waiting ${ago(now - Date.parse(w.since))} for a ${w.kind} slot: name its cause`);
  const green = [...new Set(log.filter((e) => e.kind === 'ci' && e.code === 0 && e.ended && Date.parse(e.ended) > (merged ?? 0)).map((e) => e.label))];
  for (const g of green) findings.push(`green CI ${g}, not merged since: chase its merge`);
  findings.push(...stuck.map((s) => `${s}: stuck`));
  return { ok: findings.length === 0, findings, sinceMerge: merged ? now - merged : null };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--then');
  const then = i >= 0 ? args[i + 1] : undefined;
  const r = beat(process.cwd());
  if (r.ok) { console.log(`ok: last merge ${ago(r.sinceMerge)} ago, nothing waiting or hung`); process.exit(0); }
  console.log('act:');
  r.findings.forEach((f) => console.log(`  ${f}`));
  if (!then) process.exit(1);
  const child = spawn(then, { stdio: 'inherit', shell: true });
  child.on('exit', (c) => process.exit(c ?? 1));
}
