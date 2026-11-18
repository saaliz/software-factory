// Machine slots shared by every session and worktree on one computer: CI runs one at a time, and at most a few heavy
// jobs (a build, a test run, a CI) run at once. A slot is a lock file in one folder outside every worktree; a lock whose
// process is gone is stale and is taken over. A ci slot also takes a heavy slot. The command's exit code is passed back.
//   node factory/tools/slots.mjs ci --label <package> -- <the CI command>
//   node factory/tools/slots.mjs heavy --label <words> -- <command>
//   node factory/tools/slots.mjs ci --alone --label <package> -- <the CI command>   (also takes every heavy slot: runs alone)
//   node factory/tools/slots.mjs list
// Limits: factory/harness.json "slots" { ci, heavy }, or FACTORY_SLOTS_CI and FACTORY_SLOTS_HEAVY. Defaults 1 and 3.
// Folder: FACTORY_SLOTS, or <LOCALAPPDATA or the temp folder>/software-factory/slots. Wait between tries: FACTORY_SLOTS_POLL_MS,
// five seconds unless set.
// A job that runs alone says it is waiting (alone-waiting.lock): no other job takes a heavy slot while it waits, so the jobs
// running end and it starts. Without the marker the other sessions keep taking each slot that comes free ahead of it, and it
// waits with the slots it already holds standing idle. One job waits alone at a time; a second waits for the marker.
// Every job leaves one line in log.jsonl in the folder: what it waited and how long it ran (factory/methods/throughput.md
// reads it). The command is told how many heavy slots it holds, FACTORY_HEAVY_SLOTS (side-by-side.mjs reads it).
// A job waiting for its slots says so in waiting-<pid>.json until it starts (heartbeat.mjs names any waiting over an hour).
// Run from a worktree, it runs the main checkout's copy instead, so every job obeys one copy's rules.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const DEFAULTS = { ci: 1, heavy: 3 };

/** The limits: environment first, then the nearest factory/harness.json, then the defaults. */
export function limits(env = process.env, cwd = process.cwd()) {
  let fromFile = {};
  for (let d = path.resolve(cwd); ; d = path.dirname(d)) {
    const f = path.join(d, 'factory', 'harness.json');
    if (fs.existsSync(f)) { try { fromFile = JSON.parse(fs.readFileSync(f, 'utf8')).slots ?? {}; } catch { /* defaults */ } break; }
    if (path.dirname(d) === d) break;
  }
  const pick = (k) => Number(env[`FACTORY_SLOTS_${k.toUpperCase()}`] ?? fromFile[k] ?? DEFAULTS[k]);
  return { ci: pick('ci'), heavy: pick('heavy') };
}

export function slotDir(env = process.env) {
  return env.FACTORY_SLOTS ?? path.join(env.LOCALAPPDATA ?? os.tmpdir(), 'software-factory', 'slots');
}

/** The wait between two tries for a slot, in milliseconds. */
export function pollMs(env = process.env) {
  return Number(env.FACTORY_SLOTS_POLL_MS ?? 5_000);
}

export function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

function readLock(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

const aloneFile = (dir) => path.join(dir, 'alone-waiting.lock');

/** The live job that is waiting to run alone, or null; a marker whose process is gone is removed. */
export function aloneWaiter({ dir = slotDir(), isAlive = alive } = {}) {
  const held = readLock(aloneFile(dir));
  if (held && isAlive(held.pid)) return held;
  if (held) release(aloneFile(dir));
  return null;
}

/**
 * Says that this job waits to run alone; answers the marker, to release once it holds every heavy slot, or null while
 * another live job's marker stands (two jobs each holding some heavy slots and waiting for the rest would never end).
 */
export function announceAlone(label, { dir = slotDir(), pid = process.pid, isAlive = alive } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const waiting = aloneWaiter({ dir, isAlive });
  if (waiting) return waiting.pid === pid ? aloneFile(dir) : null;
  try {
    fs.writeFileSync(aloneFile(dir), JSON.stringify({ pid, label, at: new Date().toISOString() }), { flag: 'wx' });
    return aloneFile(dir);
  } catch { return null; /* another job said so first */ }
}

/**
 * Tries once to take a slot of a kind; answers the lock file taken, or null when every slot is held by a live process,
 * or when a heavy slot is asked for while another process waits to run alone.
 */
export function tryTake(kind, label, { dir = slotDir(), pid = process.pid, isAlive = alive, max = limits()[kind] } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  if (kind === 'heavy') { const waiting = aloneWaiter({ dir, isAlive }); if (waiting && waiting.pid !== pid) return null; }
  for (let n = 1; n <= max; n++) {
    const file = path.join(dir, `${kind}-${n}.lock`);
    const held = readLock(file);
    if (held && isAlive(held.pid)) continue;
    if (held) { try { fs.unlinkSync(file); } catch { /* another taker removed it first */ } }
    try {
      fs.writeFileSync(file, JSON.stringify({ pid, label, at: new Date().toISOString() }), { flag: 'wx' });
      return file;
    } catch { /* another taker won this slot; try the next */ }
  }
  return null;
}

export function release(file) {
  try { fs.unlinkSync(file); } catch { /* already gone */ }
}

/** Every slot held now, live or stale; the waiting marker is not a slot. */
export function list({ dir = slotDir(), isAlive = alive } = {}) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^(ci|heavy)-\d+\.lock$/.test(f)).sort().map((f) => {
    const held = readLock(path.join(dir, f)) ?? {};
    return { slot: f.replace('.lock', ''), ...held, live: held.pid ? isAlive(held.pid) : false };
  });
}

async function waitFor(what, label, poll, take) {
  let said = false;
  for (;;) {
    const file = take();
    if (file) return file;
    if (!said) { console.error(`slots: waiting for ${what} (${label})`); said = true; }
    await new Promise((r) => setTimeout(r, poll));
  }
}

/** One job as its log line: how long it waited for its slots and how long it ran. */
export function logEntry({ kind, alone, label, asked, started, ended, code }) {
  const seconds = (a, b) => Math.round((new Date(b) - new Date(a)) / 1000);
  return { kind, alone: Boolean(alone), label, asked, started, ended, waitedSeconds: seconds(asked, started), ranSeconds: seconds(started, ended), code };
}

export function writeLog(entry, dir = slotDir()) {
  try { fs.appendFileSync(path.join(dir, 'log.jsonl'), `${JSON.stringify(entry)}\n`); } catch { /* the log never stops a job */ }
}

const quote = (a) => (/^[\w./:=@%+,-]+$/.test(a) ? a : `"${a.replace(/"/g, '\\"')}"`);

/** Every job waiting for its slots now: { pid, label, kind, since, live }. Each writes waiting-<pid>.json until it starts. */
export function waitingJobs({ dir = slotDir(), isAlive = alive } = {}) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^waiting-\d+\.json$/.test(f)).map((f) => {
    const w = readLock(path.join(dir, f)) ?? {};
    return { ...w, live: w.pid ? isAlive(w.pid) : false };
  });
}

/**
 * The main checkout's copy of this script, when the one running is another (a worktree's, maybe old), or null.
 * Every job on the machine must obey one copy's rules: an old copy in a worktree ignored the waiting marker and held a
 * CI back for about three hours on the first project.
 */
export function mainCopy(script, cwd = path.dirname(script)) {
  const r = spawnSync('git', ['worktree', 'list', '--porcelain'], { cwd, encoding: 'utf8' });
  const first = r.status === 0 ? r.stdout.split(/\r?\n/).find((l) => l.startsWith('worktree ')) : null;
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' });
  if (!first || top.status !== 0) return null;
  const mainRoot = path.resolve(first.slice('worktree '.length).trim());
  const here = path.resolve(top.stdout.trim());
  if (here.toLowerCase() === mainRoot.toLowerCase()) return null;
  const candidate = path.join(mainRoot, path.relative(here, path.resolve(script)));
  return fs.existsSync(candidate) ? candidate : null;
}

export async function main(argv, env = process.env) {
  const [kind, ...rest] = argv;
  const dir = slotDir(env);
  if (kind === 'list') {
    for (const l of list({ dir })) console.log(`${l.slot} ${l.live ? 'live' : 'stale'} ${l.label ?? ''} ${l.at ?? ''}`);
    const waiting = aloneWaiter({ dir });
    if (waiting) console.log(`waiting to run alone: ${waiting.label ?? ''} ${waiting.at ?? ''}`);
    for (const w of waitingJobs({ dir })) if (w.live) console.log(`waiting: ${w.kind} ${w.label ?? ''} since ${w.since}`);
    return 0;
  }
  const max = limits(env);
  if (!(kind in DEFAULTS)) { console.error('usage: slots.mjs ci|heavy [--alone] [--label <words>] -- <command> | slots.mjs list'); return 2; }
  const sep = rest.indexOf('--');
  const li = rest.indexOf('--label');
  const label = li >= 0 && li < sep ? rest[li + 1] : 'unnamed';
  const cmd = sep < 0 ? [] : rest.slice(sep + 1);
  if (!cmd.length) { console.error('slots: no command after --'); return 2; }
  const poll = pollMs(env);
  const held = [];
  const asked = new Date().toISOString();
  fs.mkdirSync(dir, { recursive: true });
  const waitFile = path.join(dir, `waiting-${process.pid}.json`);
  fs.writeFileSync(waitFile, JSON.stringify({ pid: process.pid, label, kind, since: asked }));
  const free = () => { held.splice(0).forEach(release); release(waitFile); };
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { free(); process.exit(130); });
  if (kind === 'ci') held.push(await waitFor('a ci slot', label, poll, () => tryTake('ci', label, { dir, max: max.ci })));
  // --alone: take every heavy slot, so nothing else heavy runs beside it (a CI whose timed tests need a quiet machine).
  const alone = rest.includes('--alone') && rest.indexOf('--alone') < sep;
  const n = alone ? max.heavy : 1;
  // Said after the ci slot is held; the marker goes once every heavy slot is held.
  const marker = alone ? await waitFor('its turn to run alone', label, poll, () => announceAlone(label, { dir })) : null;
  if (marker) held.push(marker);
  for (let i = 0; i < n; i++) held.push(await waitFor('a heavy slot', label, poll, () => tryTake('heavy', label, { dir, max: max.heavy })));
  if (marker) release(held.splice(held.indexOf(marker), 1)[0]);
  release(waitFile);
  const started = new Date().toISOString();
  const code = await new Promise((resolve) => {
    const child = spawn(cmd.map(quote).join(' '), { stdio: 'inherit', shell: true, env: { ...env, FACTORY_HEAVY_SLOTS: String(n) } });
    child.on('exit', (c) => resolve(c ?? 1));
    child.on('error', () => resolve(1));
  });
  free();
  writeLog(logEntry({ kind, alone, label, asked, started, ended: new Date().toISOString(), code }), dir);
  return code;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Run the main checkout's copy instead of this one, unless this is it (FACTORY_SLOTS_ANY_COPY=1 turns that off).
  const other = process.env.FACTORY_SLOTS_ANY_COPY === '1' ? null : mainCopy(fileURLToPath(import.meta.url), process.cwd());
  if (other) {
    const child = spawn(process.execPath, [other, ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, FACTORY_SLOTS_ANY_COPY: '1' } });
    child.on('exit', (c) => process.exit(c ?? 1));
  } else main(process.argv.slice(2)).then((c) => process.exit(c));
}
