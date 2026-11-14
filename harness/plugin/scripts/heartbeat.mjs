// The heartbeat's script half: is anything moving? It costs no tokens, so a scheduler can run it often and wake a model
// only when nothing moved (factory/harness/heartbeat.md).
//   node factory/tools/heartbeat.mjs                      prints "moving: <why>" (exit 0) or "idle: <why>" (exit 1)
//   node factory/tools/heartbeat.mjs --then "<command>"   when idle, runs the command (the super's beat) and passes back its exit code
//   --minutes <n>  the window; default heartbeatMinutes in factory/harness.json, else 30
// Moving means any of: a live slot lock; a commit on any local branch within the window; the records' NOW.md changed within it.
// A stale lock (its process gone) is reported as stuck, and does not count as moving.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { list, slotDir } from './slots.mjs';

function config(cwd) {
  const f = path.join(cwd, 'factory', 'harness.json');
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; }
}

/** The newest commit time on any local branch, in ms, or null. */
export function lastCommit(cwd) {
  const r = spawnSync('git', ['for-each-ref', '--sort=-committerdate', '--count=1', '--format=%(committerdate:unix)', 'refs/heads'], { cwd, encoding: 'utf8' });
  const s = Number(r.stdout?.trim());
  return r.status === 0 && s ? s * 1000 : null;
}

/** { moving, reasons, stuck } for a project at cwd. */
export function beat(cwd, { minutes, now = Date.now(), dir = slotDir(), locks = list({ dir }), commitAt = lastCommit(cwd) } = {}) {
  const cfg = config(cwd);
  const window = (minutes ?? cfg.heartbeatMinutes ?? 30) * 60_000;
  const reasons = [], stuck = [];
  for (const l of locks) (l.live ? reasons : stuck).push(`${l.live ? '' : 'stale '}slot ${l.slot} ${l.label ?? ''}`.trim());
  if (commitAt && now - commitAt <= window) reasons.push(`a commit ${Math.round((now - commitAt) / 60_000)} minutes ago`);
  const nowFile = path.join(cwd, cfg.records ?? 'factory/records', 'NOW.md');
  if (fs.existsSync(nowFile) && now - fs.statSync(nowFile).mtimeMs <= window) reasons.push('NOW.md changed within the window');
  return { moving: reasons.length > 0, reasons, stuck, minutes: window / 60_000 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const minutes = opt('--minutes') ? Number(opt('--minutes')) : undefined;
  const r = beat(process.cwd(), { minutes });
  r.stuck.forEach((s) => console.log(`stuck: ${s}`));
  if (r.moving) { console.log(`moving: ${r.reasons.join('; ')}`); process.exit(0); }
  console.log(`idle: nothing moved in ${r.minutes} minutes`);
  const then = opt('--then');
  if (!then) process.exit(1);
  const child = spawn(then, { stdio: 'inherit', shell: true });
  child.on('exit', (c) => process.exit(c ?? 1));
}
