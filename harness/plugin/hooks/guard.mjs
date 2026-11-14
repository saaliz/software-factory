// The harness's five guards, one script for every hook (hooks.json runs it as `guard.mjs pre` and `guard.mjs post`).
// Each guard has a switch: `hooks.<name>` in factory/harness.json, and the environment variable FACTORY_HOOK_<NAME>=off.
//   sealedTests    refuse an edit to a file a work item's seal.json holds
//   mainBranch     refuse a merge into, or a push to, the main branch from any session but the super's
//   ciThroughSlot  refuse the CI command unless it runs through the slot script
//   forbiddenPaths refuse any tool call that names a path the project lists as forbidden
//   largeContext   warn the session, once per step of the threshold, when its context passes largeContextTokens
// A project without factory/harness.json is left alone. A guard that errors lets the call through: a hook is a net, not the gate.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const SWITCHES = { sealedTests: 'SEALED', mainBranch: 'MAIN', ciThroughSlot: 'CI', forbiddenPaths: 'FORBIDDEN', largeContext: 'CONTEXT' };
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const slash = (p) => p.replace(/\\/g, '/');
const fold = (p) => (process.platform === 'win32' ? slash(p).toLowerCase() : slash(p));

/** The nearest factory/harness.json at or above dir: { root, config }, or null. */
export function loadConfig(dir) {
  for (let d = path.resolve(dir); ; d = path.dirname(d)) {
    const file = path.join(d, 'factory', 'harness.json');
    if (fs.existsSync(file)) return { root: d, config: JSON.parse(fs.readFileSync(file, 'utf8')) };
    if (path.dirname(d) === d) return null;
  }
}

export const isOn = (name, config, env = process.env) =>
  config?.hooks?.[name] !== false && String(env[`FACTORY_HOOK_${SWITCHES[name]}`] ?? '').toLowerCase() !== 'off';

const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
};

/** Where the super's claim is kept: inside git's common folder, so every worktree sees one claim and none commits it. */
export function claimFile(cwd) {
  const common = git(cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir');
  return common ? path.join(common, 'factory-super.json') : null;
}
export function readClaim(cwd) {
  const f = claimFile(cwd);
  try { return f ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; } catch { return null; }
}

/** Every path a work item has sealed: { files: Set, roots: [] }, relative to root, folded for comparison. */
export function sealedPaths(root, config) {
  const files = new Set(), roots = [];
  const walk = (d) => {
    for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'tmp' && e.name !== 'node_modules') walk(p); }
      else if (e.name === 'seal.json') {
        try {
          const s = JSON.parse(fs.readFileSync(p, 'utf8'));
          Object.keys(s.files ?? {}).forEach((f) => files.add(fold(f)));
          (s.roots ?? []).forEach((r) => roots.push(fold(r).replace(/\/$/, '')));
        } catch { /* a broken seal is the gate's to report */ }
      }
    }
  };
  walk(path.join(root, config.work ?? 'work'));
  return { files, roots };
}

const isSealed = (rel, { files, roots }) => files.has(rel) || roots.some((r) => rel === r || rel.startsWith(`${r}/`));
const relTo = (root, cwd, p) => fold(path.relative(root, path.resolve(cwd, p)));
const WRITES = /(^|[\s;&|])(>|>>|tee|rm|mv|cp|del|erase|move|copy|truncate)\s|sed\s+(-\w*\s+)*-i|perl\s+-\w*i|Set-Content|Add-Content|Out-File|Remove-Item|Move-Item|Copy-Item|git\s+(checkout|restore|rm|mv)\s|>\s*\S/i;

/** Bash split into its simple commands, each as its words. */
export const segments = (cmd) => cmd.split(/&&|\|\||[;\n|]/).map((s) => s.trim().split(/\s+/).filter(Boolean)).filter((w) => w.length);

/** Does this Bash command merge into or push to the main branch? Answers the reason, or null. */
export function touchesMain(command, branchNow, main) {
  let branch = branchNow;
  const isMain = (ref) => ref.replace(/^\+/, '').replace(/^refs\/heads\//, '') === main;
  for (const words of segments(command)) {
    const g = words.indexOf('git');
    if (words[0] === 'gh' && words[1] === 'pr' && words[2] === 'merge') return 'gh pr merge merges into the main branch';
    if (g < 0) continue;
    let i = g + 1;
    while (words[i] === '-C' || words[i] === '-c') i += 2;
    const [verb, ...rest] = words.slice(i);
    const args = rest.filter((a) => !a.startsWith('-'));
    if ((verb === 'checkout' || verb === 'switch') && args.length === 1 && !rest.some((a) => /^-(b|B|c|C)$/.test(a))) branch = args[0];
    if (verb === 'merge' && branch === main && !rest.includes('--abort')) return `git merge on ${main}`;
    if (verb === 'push') {
      if (rest.includes('--all') || rest.includes('--mirror')) return 'git push --all or --mirror reaches the main branch';
      const refspecs = args.slice(1);
      if (!refspecs.length && branch === main) return `git push from ${main}`;
      for (const r of refspecs) {
        const dest = r.includes(':') ? r.split(':')[1] : r === 'HEAD' ? branch : r;
        if (isMain(dest)) return `git push to ${main}`;
      }
    }
  }
  return null;
}

/** Every path a tool call names, as written. */
function namedPaths(tool, input) {
  if (tool === 'Bash' || tool === 'PowerShell') return [];
  return [input.file_path, input.notebook_path, input.path, input.pattern].filter((p) => typeof p === 'string');
}

/** The PreToolUse decision: { deny: reason } or {}. Pure apart from what ctx reads. */
export function pre(input, ctx) {
  const { root, config, env = process.env } = ctx;
  const tool = input.tool_name, ti = input.tool_input ?? {}, cwd = input.cwd ?? root;
  const command = typeof ti.command === 'string' ? ti.command : null;
  const deny = (why) => ({ deny: `factory harness: ${why}` });

  if (isOn('forbiddenPaths', config, env) && (config.forbiddenPaths ?? []).length) {
    const forbidden = config.forbiddenPaths.map((f) => fold(path.resolve(root, f)).replace(/\/$/, ''));
    const asWritten = config.forbiddenPaths.filter((f) => !path.isAbsolute(f)).map((f) => fold(f).replace(/^\.\//, '').replace(/\/$/, ''));
    const hit = (s, isCommand) => forbidden.find((f) => fold(s).includes(f) || (!isCommand && fold(path.resolve(cwd, s)).startsWith(f)))
      ?? (isCommand ? asWritten.find((f) => fold(s).includes(f)) : undefined);
    for (const p of command ? [command] : namedPaths(tool, ti)) {
      const f = hit(p, Boolean(command));
      if (f) return deny(`${f} is forbidden to every session on this project (forbiddenPaths in factory/harness.json).`);
    }
  }

  if (isOn('sealedTests', config, env)) {
    const sealed = ctx.sealed ?? sealedPaths(root, config);
    if (EDIT_TOOLS.has(tool)) {
      const p = ti.file_path ?? ti.notebook_path;
      if (p && isSealed(relTo(root, cwd, p), sealed)) return deny(`${slash(p)} is a sealed test. A builder never edits one; a sealed test that looks wrong is a question for the super, with the file, the line and what the requirement says.`);
    }
    if (command && WRITES.test(command)) {
      const c = fold(command);
      const all = [...sealed.files, ...sealed.roots];
      const p = all.find((s) => c.includes(s));
      if (p) return deny(`this command may change ${p}, which is sealed. A sealed test is never changed; ask the super.`);
    }
  }

  if (command && isOn('mainBranch', config, env)) {
    if (/claim-super\.mjs/.test(command)) { ctx.claim?.(input.session_id); return {}; }
    const main = config.mainBranch ?? 'main';
    const why = touchesMain(command, ctx.branch?.(cwd) ?? null, main);
    if (why) {
      const claim = ctx.readClaim?.(cwd);
      const isSuper = String(env.FACTORY_ROLE ?? '').toLowerCase() === 'super' || (claim && claim.session === input.session_id);
      if (!isSuper) return deny(`${why}: only the super orchestrator merges or pushes to ${main}. Ask it to merge, naming your candidate branch, its commit and its CI summary.`);
    }
  }

  if (command && isOn('ciThroughSlot', config, env) && config.ciPattern && !config.ciPattern.startsWith('<')) {
    if (new RegExp(config.ciPattern).test(command) && !/slots\.mjs\s+ci\b/.test(command)) {
      return deny(`CI runs only through the slot script, so the machine runs one CI at a time: node factory/tools/slots.mjs ci --label <package> -- ${command}`);
    }
  }
  return {};
}

/** The context in tokens at the last assistant turn of a transcript, or null. Reads only the file's tail. */
export function contextTokens(transcriptPath, tailBytes = 400_000) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;
  const size = fs.statSync(transcriptPath).size;
  const fd = fs.openSync(transcriptPath, 'r');
  const buf = Buffer.alloc(Math.min(size, tailBytes));
  fs.readSync(fd, buf, 0, buf.length, size - buf.length);
  fs.closeSync(fd);
  const lines = buf.toString('utf8').split('\n').reverse();
  for (const l of lines) {
    if (!l.includes('"usage"')) continue;
    try {
      const u = JSON.parse(l).message?.usage;
      if (u) return (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
    } catch { /* the tail's first line may be cut */ }
  }
  return null;
}

/** The PostToolUse output: a warning once per step of the threshold, per session (and per subagent). */
export function post(input, ctx) {
  const { config, env = process.env, stateDir = path.join(os.tmpdir(), 'software-factory-hooks') } = ctx;
  if (!isOn('largeContext', config, env)) return {};
  const limit = Number(config.largeContextTokens ?? 250_000);
  const tokens = contextTokens(input.transcript_path);
  if (!tokens || tokens < limit) return {};
  const step = Math.floor(tokens / limit);
  fs.mkdirSync(stateDir, { recursive: true });
  const key = `${input.session_id ?? 'unknown'}${input.agent_id ? `-${input.agent_id}` : ''}`.replace(/[^\w-]/g, '_');
  const file = path.join(stateDir, `${key}.json`);
  let last = 0;
  try { last = JSON.parse(fs.readFileSync(file, 'utf8')).step; } catch { /* first warning */ }
  if (step <= last) return {};
  fs.writeFileSync(file, JSON.stringify({ step, tokens }));
  const text = `Large context: about ${tokens.toLocaleString('en')} tokens, past ${limit.toLocaleString('en')}. Every call re-sends it. Finish the current step, write the records, and hand the next step to a fresh session or subagent (factory/token-economy.md).`;
  return { context: text, message: text };
}

function ctxFor(input) {
  const loaded = loadConfig(input.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  if (!loaded) return null;
  return {
    ...loaded,
    branch: (cwd) => git(cwd, 'rev-parse', '--abbrev-ref', 'HEAD'),
    readClaim,
    claim: (session) => {
      const f = claimFile(input.cwd ?? loaded.root);
      if (f && session) fs.writeFileSync(f, JSON.stringify({ session, at: new Date().toISOString() }));
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const phase = process.argv[2];
  let raw = '';
  process.stdin.on('data', (d) => { raw += d; }).on('end', () => {
    try {
      const input = JSON.parse(raw || '{}');
      const ctx = ctxFor(input);
      if (!ctx) return;
      if (phase === 'pre') {
        const r = pre(input, ctx);
        if (r.deny) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: r.deny } }));
      } else if (phase === 'post') {
        const r = post(input, ctx);
        if (r.context) process.stdout.write(JSON.stringify({ systemMessage: r.message, hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: r.context } }));
      }
    } catch (e) { process.stderr.write(`factory harness guard: ${e.message}\n`); }
  });
}
