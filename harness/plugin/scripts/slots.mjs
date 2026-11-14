// Machine slots shared by every session and worktree on one computer: CI runs one at a time, and at most a few heavy
// jobs (a build, a test run, a CI) run at once. A slot is a lock file in one folder outside every worktree; a lock whose
// process is gone is stale and is taken over. A ci slot also takes a heavy slot. The command's exit code is passed back.
//   node factory/tools/slots.mjs ci --label <package> -- <the CI command>
//   node factory/tools/slots.mjs heavy --label <words> -- <command>
//   node factory/tools/slots.mjs list
// Limits: factory/harness.json "slots" { ci, heavy }, or FACTORY_SLOTS_CI and FACTORY_SLOTS_HEAVY. Defaults 1 and 3.
// Folder: FACTORY_SLOTS, or <LOCALAPPDATA or the temp folder>/software-factory/slots. Wait between tries: FACTORY_SLOTS_POLL_MS.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
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

export function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

function readLock(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/** Tries once to take a slot of a kind; answers the lock file taken, or null when every slot is held by a live process. */
export function tryTake(kind, label, { dir = slotDir(), pid = process.pid, isAlive = alive, max = limits()[kind] } = {}) {
  fs.mkdirSync(dir, { recursive: true });
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

/** Every lock held now, live or stale. */
export function list({ dir = slotDir(), isAlive = alive } = {}) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.lock')).sort().map((f) => {
    const held = readLock(path.join(dir, f)) ?? {};
    return { slot: f.replace('.lock', ''), ...held, live: held.pid ? isAlive(held.pid) : false };
  });
}

async function waitFor(kind, label, dir, max, poll) {
  let said = false;
  for (;;) {
    const file = tryTake(kind, label, { dir, max });
    if (file) return file;
    if (!said) { console.error(`slots: waiting for a ${kind} slot (${label})`); said = true; }
    await new Promise((r) => setTimeout(r, poll));
  }
}

const quote = (a) => (/^[\w./:=@%+,-]+$/.test(a) ? a : `"${a.replace(/"/g, '\\"')}"`);

export async function main(argv, env = process.env) {
  const [kind, ...rest] = argv;
  const dir = slotDir(env);
  if (kind === 'list') { for (const l of list({ dir })) console.log(`${l.slot} ${l.live ? 'live' : 'stale'} ${l.label ?? ''} ${l.at ?? ''}`); return 0; }
  const max = limits(env);
  if (!(kind in DEFAULTS)) { console.error('usage: slots.mjs ci|heavy [--label <words>] -- <command> | slots.mjs list'); return 2; }
  const sep = rest.indexOf('--');
  const li = rest.indexOf('--label');
  const label = li >= 0 && li < sep ? rest[li + 1] : 'unnamed';
  const cmd = sep < 0 ? [] : rest.slice(sep + 1);
  if (!cmd.length) { console.error('slots: no command after --'); return 2; }
  const poll = Number(env.FACTORY_SLOTS_POLL_MS ?? 30_000);
  const held = [];
  const free = () => held.splice(0).forEach(release);
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { free(); process.exit(130); });
  if (kind === 'ci') held.push(await waitFor('ci', label, dir, max.ci, poll));
  held.push(await waitFor('heavy', label, dir, max.heavy, poll));
  const code = await new Promise((resolve) => {
    const child = spawn(cmd.map(quote).join(' '), { stdio: 'inherit', shell: true });
    child.on('exit', (c) => resolve(c ?? 1));
    child.on('error', () => resolve(1));
  });
  free();
  return code;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((c) => process.exit(c));
}
