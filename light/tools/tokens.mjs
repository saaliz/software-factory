// What the agents really used on this project, from their own counters. Nothing is estimated.
//   node factory/tools/tokens.mjs                         this folder's project, every day, by model
//   node factory/tools/tokens.mjs --by session|model|day  one row per session, model or day
//   node factory/tools/tokens.mjs --from 2026-11-01       only calls from that day on
//   node factory/tools/tokens.mjs --project <folder>      another project's folder
// Reads only counters, identifiers and titles in Claude Code's and Codex's session files on this computer, never what was said.
// "sent again" is context re-read from cache on a later call: usually most of the total, and the number to bring down.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.jsonl')) out.push(p);
  }
  return out;
};
const lines = (file) => readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });

/** The folder name Claude Code files a project's sessions under. */
export const claudeFolder = (project) => path.resolve(project).replace(/[^A-Za-z0-9]/g, '-');

/** One Claude Code usage line as counters, or null. */
export function claudeCall(line) {
  if (!line.includes('"usage"')) return null;
  let o; try { o = JSON.parse(line); } catch { return null; }
  const u = o.message?.usage;
  if (!u || o.message.model === '<synthetic>') return null;
  return {
    key: o.message.id ?? o.requestId ?? o.uuid, model: o.message.model ?? 'model not recorded', day: (o.timestamp ?? '').slice(0, 10),
    newInput: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), sentAgain: u.cache_read_input_tokens ?? 0, output: u.output_tokens ?? 0,
  };
}

/** Every call made on a project: Claude Code's by call, Codex's by session (its counters are running totals). */
export async function calls(project, { home = os.homedir(), from = '' } = {}) {
  const out = [];
  const seen = new Set();
  const titles = new Map();
  const root = path.resolve(project).toLowerCase();
  const projects = path.join(home, '.claude', 'projects');
  const want = claudeFolder(project).toLowerCase();
  const dirs = fs.existsSync(projects) ? fs.readdirSync(projects).filter((d) => d.toLowerCase() === want || d.toLowerCase().startsWith(`${want}-`)) : [];
  for (const dir of dirs) {
    for (const file of walk(path.join(projects, dir))) {
      const helper = /[\\/]subagents[\\/]/.test(file);
      const id = helper ? file.split(/[\\/]subagents[\\/]/)[0].split(/[\\/]/).pop() : path.basename(file, '.jsonl');
      // A sibling folder (my-app-2) files under a name that starts like this project's, so the session's own folder decides.
      let cwd = '';
      const mine = [];
      for await (const line of lines(file)) {
        if (line.startsWith('{"type":"custom-title"')) { try { titles.set(id, JSON.parse(line).customTitle ?? ''); } catch { /* a line cut short */ } continue; }
        if (!cwd && line.includes('"cwd"')) { try { cwd = JSON.parse(line).cwd ?? ''; } catch { /* a line cut short */ } }
        const c = claudeCall(line);
        if (!c || seen.has(c.key) || c.day < from) continue;
        seen.add(c.key);
        mine.push({ ...c, agent: 'Claude Code', session: id, helper });
      }
      const at = cwd ? path.resolve(cwd).toLowerCase() : '';
      const here = at ? at === root || at.startsWith(root + path.sep) : dir.toLowerCase() === want;
      if (here) out.push(...mine);
    }
  }
  for (const c of out) c.title = titles.get(c.session) ?? ''; // a helper's calls carry its parent session's title
  for (const file of walk(path.join(home, '.codex', 'sessions'))) {
    let cwd = '', day = '', model = '', id = '', last = null, n = 0;
    for await (const line of lines(file)) {
      try {
        if (line.includes('"session_meta"') && !id) { const o = JSON.parse(line); cwd = o.payload?.cwd ?? ''; id = o.payload?.id ?? ''; day = (o.timestamp ?? '').slice(0, 10); }
        else if (line.includes('"turn_context"')) model = JSON.parse(line).payload?.model ?? model;
        else if (line.includes('total_token_usage')) { const t = JSON.parse(line).payload?.info?.total_token_usage; if (t) { last = t; n++; } }
      } catch { /* a line cut short */ }
    }
    const at = cwd ? path.resolve(cwd).toLowerCase() : '';
    if (!last || day < from || !(at === root || at.startsWith(root + path.sep))) continue;
    const cached = last.cached_input_tokens ?? 0;
    out.push({ agent: 'Codex', session: id, title: '', helper: false, model: `codex ${model || 'model not recorded'}`, day, calls: n, newInput: (last.input_tokens ?? 0) - cached, sentAgain: cached, output: last.output_tokens ?? 0 });
  }
  return out;
}

/** Rows for printing, grouped by model, session or day, largest first. */
export function report(all, by = 'model') {
  const groups = new Map();
  for (const c of all) {
    const key = by === 'session' ? `${c.title || c.session}` : by === 'day' ? c.day : c.model;
    const g = groups.get(key) ?? { calls: 0, newInput: 0, sentAgain: 0, output: 0, helpers: 0 };
    g.calls += c.calls ?? 1; g.newInput += c.newInput; g.sentAgain += c.sentAgain; g.output += c.output;
    if (c.helper) g.helpers += c.newInput + c.sentAgain + c.output;
    groups.set(key, g);
  }
  const rows = [...groups].map(([key, g]) => ({
    [by]: key, calls: g.calls, 'new input': g.newInput, 'sent again': g.sentAgain, output: g.output,
    'new plus output': g.newInput + g.output, 'average context': g.calls ? Math.round((g.newInput + g.sentAgain) / g.calls) : 0,
    'helpers share': `${Math.round((100 * g.helpers) / Math.max(1, g.newInput + g.sentAgain + g.output))}%`,
  }));
  return by === 'day' ? rows.sort((a, b) => (a.day < b.day ? -1 : 1)) : rows.sort((a, b) => b['sent again'] + b['new plus output'] - (a['sent again'] + a['new plus output']));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
  const by = opt('--by', 'model');
  const from = opt('--from', '');
  if (!['model', 'session', 'day'].includes(by) || (from && !/^\d{4}-\d{2}-\d{2}$/.test(from))) {
    console.error('usage: tokens.mjs [--by session|model|day] [--from YYYY-MM-DD] [--project <folder>]');
    process.exit(2);
  }
  const all = await calls(opt('--project', process.cwd()), { from });
  if (!all.length) { console.error('no session with counters found for this project'); process.exit(1); }
  console.table(report(all, by));
  const t = report(all.map((c) => ({ ...c, model: 'total' })), 'model')[0];
  console.log(`total: ${t.calls} calls, ${t['new plus output'].toLocaleString('en')} new plus output, ${t['sent again'].toLocaleString('en')} sent again, helpers ${t['helpers share']}${from ? `, from ${from}` : ''}`);
}
