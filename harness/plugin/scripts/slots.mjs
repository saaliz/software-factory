// Machine slots shared by every session and worktree on one computer: CI runs one at a time, and at most a few heavy
// jobs (a build, a test run, a CI) run at once. A slot is a lock file in one folder outside every worktree; a lock whose
// process is gone is stale and is taken over. A ci slot also takes a heavy slot. The command's exit code is passed back.
//   node factory/tools/slots.mjs ci --label <package> -- <the CI command>
//   node factory/tools/slots.mjs heavy --label <words> -- <command>
//   node factory/tools/slots.mjs heavy --lane <lane> --label <words> -- <command>   (the lane named; else read from the label)
//   node factory/tools/slots.mjs ci --alone --label <package> -- <the CI command>   (also takes every heavy slot: runs alone)
//   node factory/tools/slots.mjs list
// Limits: factory/harness.json "slots" { ci, heavy, laneHeavy }, or FACTORY_SLOTS_CI, FACTORY_SLOTS_HEAVY and
// FACTORY_SLOTS_LANEHEAVY. Defaults 1, 3, and one fewer than heavy (at least 1).
// Folder: FACTORY_SLOTS, or <LOCALAPPDATA or the temp folder>/software-factory/slots. Wait between tries: FACTORY_SLOTS_POLL_MS,
// five seconds unless set.
// FIRST COME, FIRST SERVED. Each kind of slot has a queue of tickets (ci-queue/, heavy-queue/): a slot that comes free goes to
// the earliest live ticket, not to whichever job polls first. On the first project a job that ran back to back won every poll,
// and a waiter starved.
// A LANE'S SHARE. No lane holds more than laneHeavy heavy slots at once. A job's lane is --lane, or the first word of its label
// looked up in factory/harness.json "lanes" ({ "<word>": "<lane>" }). A ticket of a lane at its share keeps its place while a
// later ticket of another lane goes past it. The super (lane "super") and a job that runs alone are exempt.
// A job that runs alone says it is waiting (alone-waiting.lock): no other job takes a heavy slot while it waits, so the jobs
// running end and it starts. One job waits alone at a time; a second waits for the marker.
// DEAD FILES. Every lock, ticket, marker and waiting file is touched by its holder every 30 seconds; one not touched for two
// minutes is dead though its process id answers, because Windows reuses process ids (on the first project a dead waiter's
// reused id held 18 jobs behind three free slots). FACTORY_SLOTS_STALE_MS changes the two minutes, for tests.
// Every job leaves one line in log.jsonl in the folder: what it waited and how long it ran (factory/methods/throughput.md
// reads it). The command is told how many heavy slots it holds, FACTORY_HEAVY_SLOTS (side-by-side.mjs reads it).
// A job waiting for its slots says so in waiting-<pid>.json until it starts (heartbeat.mjs names any waiting over an hour).
// Run from a worktree, it runs the main checkout's copy instead, so every job obeys one copy's rules.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.mjs';

export const DEFAULTS = { ci: 1, heavy: 3 };
export const SUPER = 'super';
/** How often a holder touches its files, and how long an untouched one lives. */
export const TOUCH_MS = 30_000;
export const STALE_MS = 120_000;

/** The limits: environment first, then the nearest factory/harness.json, then the defaults. */
export function limits(env = process.env, cwd = process.cwd()) {
  const fromFile = loadConfig(cwd).config.slots ?? {};
  const pick = (k, d) => Number(env[`FACTORY_SLOTS_${k.toUpperCase()}`] ?? fromFile[k] ?? d);
  const ci = pick('ci', DEFAULTS.ci), heavy = pick('heavy', DEFAULTS.heavy);
  return { ci, heavy, laneHeavy: pick('laneHeavy', Math.max(1, heavy - 1)) };
}

/** The label words that name a lane, from factory/harness.json "lanes"; the word "super" always names the super. */
export function laneWords(cwd = process.cwd()) {
  const words = {};
  for (const [w, lane] of Object.entries(loadConfig(cwd).config.lanes ?? {})) if (!w.startsWith('<') && !String(lane).startsWith('<')) words[w.toLowerCase()] = String(lane);
  return { ...words, [SUPER]: SUPER };
}

/** A job's lane from its label's first word ("<module>-p07-tests"), or null when the word names none. */
export const laneOf = (label = '', words = { [SUPER]: SUPER }) => words[String(label).trim().split(/[-\s_]/)[0].toLowerCase()] ?? null;

/** The lane a lock or ticket counts against: none for the super, a job that runs alone, or a label that names no lane. */
const countedLane = (held) => (!held || held.alone || !held.lane || held.lane === SUPER ? null : held.lane);

export function slotDir(env = process.env) {
  return env.FACTORY_SLOTS ?? path.join(env.LOCALAPPDATA ?? os.tmpdir(), 'software-factory', 'slots');
}

/** The wait between two tries for a slot, in milliseconds. */
export function pollMs(env = process.env) {
  return Number(env.FACTORY_SLOTS_POLL_MS ?? 5_000);
}

const staleMs = () => Number(process.env.FACTORY_SLOTS_STALE_MS ?? STALE_MS);

export function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

function readLock(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/** A held file lives while its process answers and its holder has touched it within the stale time. */
export function holds(file, held, isAlive = alive, now = Date.now()) {
  if (!held || !held.pid || !isAlive(held.pid)) return false;
  try { return now - fs.statSync(file).mtimeMs < staleMs(); } catch { return false; }
}

/** Keeps a file fresh while its holder lives. */
export function touch(file) {
  try { const t = new Date(); fs.utimesSync(file, t, t); } catch { /* released meanwhile */ }
}

export function release(file) {
  try { fs.unlinkSync(file); } catch { /* already gone */ }
}

const aloneFile = (dir) => path.join(dir, 'alone-waiting.lock');
const queueDir = (dir, kind) => path.join(dir, `${kind}-queue`);

/** Joins the queue for a kind of slot; answers the ticket, to release once the slot is held. */
export function joinQueue(kind, label, { dir = slotDir(), pid = process.pid, at = Date.now(), lane = null } = {}) {
  fs.mkdirSync(queueDir(dir, kind), { recursive: true });
  const file = path.join(queueDir(dir, kind), `${String(at).padStart(15, '0')}-${pid}.json`);
  fs.writeFileSync(file, JSON.stringify({ pid, label, lane, at: new Date(at).toISOString() }));
  return file;
}

/** The live tickets of a kind, earliest first; dead ones are removed. */
function tickets(kind, { dir, isAlive }) {
  if (!fs.existsSync(queueDir(dir, kind))) return [];
  const out = [];
  for (const f of fs.readdirSync(queueDir(dir, kind)).sort()) {
    const file = path.join(queueDir(dir, kind), f);
    const held = readLock(file);
    if (holds(file, held, isAlive)) out.push(held); else release(file);
  }
  return out;
}

/** The live ticket at the head of a kind's queue, or null. */
export function queueHead(kind, { dir = slotDir(), isAlive = alive } = {}) {
  return tickets(kind, { dir, isAlive })[0] ?? null;
}

/** How many live heavy slots each lane holds now. */
export function laneCounts({ dir = slotDir(), isAlive = alive } = {}) {
  const counts = {};
  for (const l of list({ dir, isAlive })) {
    const lane = l.live && l.slot.startsWith('heavy-') ? countedLane(l) : null;
    if (lane) counts[lane] = (counts[lane] ?? 0) + 1;
  }
  return counts;
}

/** The ticket that may take a heavy slot now: the earliest live one whose lane is under its share. */
export function nextHeavy({ dir = slotDir(), isAlive = alive, laneHeavy = limits().laneHeavy } = {}) {
  const counts = laneCounts({ dir, isAlive });
  return tickets('heavy', { dir, isAlive }).find((t) => { const lane = countedLane(t); return !lane || (counts[lane] ?? 0) < laneHeavy; }) ?? null;
}

/** The live job that is waiting to run alone, or null; a dead marker is removed. */
export function aloneWaiter({ dir = slotDir(), isAlive = alive } = {}) {
  const held = readLock(aloneFile(dir));
  if (holds(aloneFile(dir), held, isAlive)) return held;
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
 * Tries once to take a slot of a kind; answers the lock file taken, or null when every slot is held by a live process;
 * when a heavy slot is asked for while another job waits to run alone; when an earlier live ticket goes first; or when
 * the job's lane holds its share of heavy slots already.
 */
export function tryTake(kind, label, { dir = slotDir(), pid = process.pid, isAlive = alive, max, laneHeavy, lane = null, alone = false } = {}) {
  const lim = (max === undefined || laneHeavy === undefined) ? limits() : null;
  max ??= lim[kind];
  laneHeavy ??= lim.laneHeavy;
  fs.mkdirSync(dir, { recursive: true });
  const waiting = kind === 'heavy' ? aloneWaiter({ dir, isAlive }) : null;
  if (waiting && waiting.pid !== pid) return null;
  const mine = countedLane({ lane, alone });
  if (kind === 'heavy' && mine && (laneCounts({ dir, isAlive })[mine] ?? 0) >= laneHeavy) return null;
  // A job waiting to run alone went first by its marker; every other job waits behind the earliest ticket it may not pass.
  if (!(waiting && waiting.pid === pid)) {
    const head = kind === 'heavy' ? nextHeavy({ dir, isAlive, laneHeavy }) : queueHead(kind, { dir, isAlive });
    if (head && head.pid !== pid) return null;
  }
  for (let n = 1; n <= max; n++) {
    const file = path.join(dir, `${kind}-${n}.lock`);
    const held = readLock(file);
    if (holds(file, held, isAlive)) continue;
    if (held) release(file);
    try {
      fs.writeFileSync(file, JSON.stringify({ pid, label, lane, ...(alone ? { alone: true } : {}), at: new Date().toISOString() }), { flag: 'wx' });
      return file;
    } catch { /* another taker won this slot; try the next */ }
  }
  return null;
}

/** Every slot held now, live or stale, with its holder's lane; the waiting marker is not a slot. */
export function list({ dir = slotDir(), isAlive = alive } = {}) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^(ci|heavy)-\d+\.lock$/.test(f)).sort().map((f) => {
    const file = path.join(dir, f);
    const held = readLock(file) ?? {};
    return { slot: f.replace('.lock', ''), ...held, lane: held.lane ?? null, live: holds(file, held, isAlive) };
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
export function logEntry({ kind, alone, label, lane = null, asked, started, ended, code }) {
  const seconds = (a, b) => Math.round((new Date(b) - new Date(a)) / 1000);
  return { kind, alone: Boolean(alone), label, lane, asked, started, ended, waitedSeconds: seconds(asked, started), ranSeconds: seconds(started, ended), code };
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
    return { ...w, live: holds(path.join(dir, f), w, isAlive) };
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
    for (const l of list({ dir })) console.log(`${l.slot} ${l.live ? 'live' : 'stale'} lane ${l.alone ? 'alone' : l.lane ?? '-'} ${l.label ?? ''} ${l.at ?? ''}`);
    const waiting = aloneWaiter({ dir });
    if (waiting) console.log(`waiting to run alone: ${waiting.label ?? ''} ${waiting.at ?? ''}`);
    for (const w of waitingJobs({ dir })) if (w.live) console.log(`waiting: ${w.kind} ${w.label ?? ''} since ${w.since}`);
    return 0;
  }
  const max = limits(env);
  if (!(kind in DEFAULTS)) { console.error('usage: slots.mjs ci|heavy [--alone] [--lane <lane>] [--label <words>] -- <command> | slots.mjs list'); return 2; }
  const sep = rest.indexOf('--');
  const before = sep < 0 ? rest : rest.slice(0, sep);
  const value = (flag) => { const i = before.indexOf(flag); return i >= 0 ? before[i + 1] : undefined; };
  const label = value('--label') ?? 'unnamed';
  const cmd = sep < 0 ? [] : rest.slice(sep + 1);
  if (!cmd.length) { console.error('slots: no command after --'); return 2; }
  const words = laneWords();
  const named = value('--lane');
  const known = new Set(Object.values(words));
  if (named !== undefined && known.size > 1 && !known.has(named)) { console.error(`slots: --lane is one of ${[...known].join(', ')}, not ${named}`); return 2; }
  const lane = named ?? laneOf(label, words);
  const alone = before.includes('--alone');
  const poll = pollMs(env);
  const held = [];
  const asked = new Date().toISOString();
  fs.mkdirSync(dir, { recursive: true });
  const waitFile = path.join(dir, `waiting-${process.pid}.json`);
  fs.writeFileSync(waitFile, JSON.stringify({ pid: process.pid, label, kind, lane, since: asked }));
  held.push(waitFile);
  // Every file this job holds is touched while it lives, so a dead job's files go stale even when its process id is reused.
  const keepFresh = setInterval(() => held.forEach(touch), Math.min(TOUCH_MS, Math.max(50, staleMs() / 4)));
  keepFresh.unref();
  const drop = (file) => { const i = held.indexOf(file); if (i >= 0) held.splice(i, 1); release(file); };
  const free = () => { clearInterval(keepFresh); held.splice(0).forEach(release); };
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { free(); process.exit(130); });
  const take = (k) => () => tryTake(k, label, { dir, max: max[k], laneHeavy: max.laneHeavy, lane, alone: k === 'heavy' && alone });
  if (kind === 'ci') {
    const ticket = joinQueue('ci', label, { dir, lane });
    held.push(ticket);
    held.push(await waitFor('a ci slot', label, poll, take('ci')));
    drop(ticket);
  }
  // --alone: take every heavy slot, so nothing else heavy runs beside it (a CI whose timed tests need a quiet machine).
  const n = alone ? max.heavy : 1;
  // Said after the ci slot is held; the marker goes once every heavy slot is held. A job that does not run alone takes a ticket.
  const marker = alone ? await waitFor('its turn to run alone', label, poll, () => announceAlone(label, { dir })) : null;
  if (marker) held.push(marker);
  const ticket = alone ? null : joinQueue('heavy', label, { dir, lane });
  if (ticket) held.push(ticket);
  for (let i = 0; i < n; i++) held.push(await waitFor('a heavy slot', label, poll, take('heavy')));
  if (ticket) drop(ticket);
  if (marker) drop(marker);
  drop(waitFile);
  const started = new Date().toISOString();
  const code = await new Promise((resolve) => {
    const child = spawn(cmd.map(quote).join(' '), { stdio: 'inherit', shell: true, env: { ...env, FACTORY_HEAVY_SLOTS: String(n) } });
    child.on('exit', (c) => resolve(c ?? 1));
    child.on('error', () => resolve(1));
  });
  free();
  writeLog(logEntry({ kind, alone, label, lane, asked, started, ended: new Date().toISOString(), code }), dir);
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
