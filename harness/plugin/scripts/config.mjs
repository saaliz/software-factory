// What the harness's scripts share: the project's factory/harness.json, read once, and git run in a folder.
// A value still holding its `<placeholder>` counts as not set, so an unfilled template never runs as a command.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/** The nearest factory/harness.json at or above dir: { root, config }; { root: dir, config: {} } when there is none or it is not JSON. */
export function loadConfig(dir = process.cwd()) {
  for (let d = path.resolve(dir); ; d = path.dirname(d)) {
    const file = path.join(d, 'factory', 'harness.json');
    if (fs.existsSync(file)) {
      try { return { root: d, config: JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch { return { root: d, config: {} }; }
    }
    if (path.dirname(d) === d) return { root: path.resolve(dir), config: {} };
  }
}

/** A value that is set: not empty and not a `<placeholder>` from the template. */
export const filled = (v) => typeof v === 'string' ? v.trim() !== '' && !v.trim().startsWith('<') : v !== undefined && v !== null;

/** git in a folder; answers spawnSync's result, with stdout as text. */
export const gitIn = (cwd) => (...args) => spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28 });

export const slash = (p) => p.split(path.sep).join('/');

/** A command line with `<name>` placeholders filled from vars; null when the command is not set. */
export function fillCommand(command, vars = {}) {
  if (!filled(command)) return null;
  return command.replace(/<(\w+)>/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
