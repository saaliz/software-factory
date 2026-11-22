// The merge check: what a branch passes before the super merges it, every branch, plans and designs included (a design edit
// regenerates code; on the first project a plan merged unchecked broke the main branch's build).
//   node factory/tools/merge-check.mjs [work/<lane>/<package>]                 every step, to the end
//   node factory/tools/merge-check.mjs [work/<lane>/<package>] --build-first   leaves out the steps that start containers, and web tests
//   node factory/tools/merge-check.mjs [work/<lane>/<package>] --stop          stops at the first red: only for a builder's own loop
// Run it through a slot: the CI slot, or a heavy slot with --build-first (it starts no containers, and the one CI slot must not
// become the queue). The steps, in order, from factory/harness.json "mergeCheck":
//   1. each of mergeCheck.steps, { name, command, containers? }: the quick checks, the build, the sealed tests' project build
//      (it may sit outside the solution, and nothing else compiles it under BUILD FIRST), the architecture checks, and the
//      contract tests and integration run (containers: true). `<package>` in a command is the package folder;
//      a step that names it is left out on a branch that is no package (a plan, a design).
//   2. the web check, only when the branch changes mergeCheck.web.path against the main branch: its packages installed first
//      when mergeCheck.web.installed is missing, then web.check, then web.tests unless --build-first.
//   3. every module's scaffold check: `<commands.scaffold> <module> --check` for each folder in mergeCheck.modules; any that
//      exits non-zero is stale, and is listed with the command that regenerates it.
// ALL STEPS, ALL FAILURES: every step runs and every red is listed, unless --stop. It writes, in the worktree's own git folder
// (never committed, never dirty), factory/merge-check.json, the record naming the tip that merge.mjs reads, and on green
// factory/merge-request.txt: the five lines a lane sends the super.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fillCommand, filled, gitIn, loadConfig, slash } from './config.mjs';

export const SCAFFOLD_STEP = "every module's scaffold check";
export const WEB_STEP = 'web check';

/** The folder in the worktree's own git directory where the merge check and the package tests keep their records. */
export function recordDir(root) {
  const r = gitIn(root)('rev-parse', '--absolute-git-dir');
  if (r.status !== 0) throw new Error(`${root} is not inside a git repository`);
  return path.join(r.stdout.trim(), 'factory');
}
export const checkFile = (root) => path.join(recordDir(root), 'merge-check.json');
export const requestFile = (root) => path.join(recordDir(root), 'merge-request.txt');
export const sealedFile = (root, pkg) => path.join(recordDir(root), `sealed-${path.basename(pkg)}.json`);

/** Runs a command line in the shell at root, its output shown; answers its exit code. */
export const shell = (root) => (command) => spawnSync(command, { cwd: root, shell: true, stdio: 'inherit' }).status ?? 1;

/** The module folders the scaffold check walks. */
export function modules(root, cfg) {
  const dir = cfg.mergeCheck?.modules;
  if (!filled(dir) || !fs.existsSync(path.join(root, dir))) return [];
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

/** The modules whose scaffold check is red: a rerun would change a file. `run` answers an exit code. */
export function staleModules(root, cfg, { run = (c) => spawnSync(c, { cwd: root, shell: true, stdio: 'ignore' }).status ?? 1 } = {}) {
  const scaffold = cfg.commands?.scaffold;
  if (!filled(scaffold)) return { checked: [], stale: [], skipped: 'no commands.scaffold' };
  const checked = modules(root, cfg);
  return { checked, stale: checked.filter((m) => run(`${scaffold} ${m} --check`) !== 0) };
}

/** Reruns the scaffold for each module; answers the modules it could not regenerate. */
export function regenerate(root, cfg, mods, { run = shell(root) } = {}) {
  return mods.filter((m) => run(`${cfg.commands.scaffold} ${m}`) !== 0);
}

/** Whether the branch changes a path against the main branch. */
export function touches(root, main, rel) {
  if (!filled(rel)) return false;
  const r = gitIn(root)('diff', '--name-only', `${main}...HEAD`, '--', rel);
  return r.status === 0 && r.stdout.trim() !== '';
}

/**
 * The steps of the check, each { name, fn } answering true for green. Nothing runs here. `run` takes a command line and
 * answers an exit code; `touchesWeb` says whether the branch changes the web app.
 */
export function plan(root, cfg, { pkg, buildFirst = false, touchesWeb = false, run = shell(root), log = console.log } = {}) {
  const mc = cfg.mergeCheck ?? {};
  const steps = [];
  for (const s of mc.steps ?? []) {
    if (!filled(s.name) || !filled(s.command)) continue;
    if (buildFirst && s.containers) continue;
    if (s.command.includes('<package>') && !pkg) continue; // a package's own step, on a branch that is no package
    const command = fillCommand(s.command, { package: pkg ?? '' });
    steps.push({ name: s.name, fn: () => run(command) === 0 });
  }
  const web = mc.web ?? {};
  if (touchesWeb && filled(web.check)) {
    steps.push({
      name: WEB_STEP,
      fn: () => {
        const at = (c) => `cd "${path.join(root, web.path)}" && ${c}`;
        if (filled(web.installed) && !fs.existsSync(path.join(root, web.path, web.installed)) && filled(web.install) && run(at(web.install)) !== 0) return false;
        return run(at(web.check)) === 0 && (buildFirst || !filled(web.tests) || run(at(web.tests)) === 0);
      },
    });
  }
  if (filled(cfg.commands?.scaffold) && filled(mc.modules)) {
    steps.push({
      name: SCAFFOLD_STEP,
      fn: () => {
        const { checked, stale } = staleModules(root, cfg, { run: (c) => run(`${c}`) });
        log(`scaffold check: ${checked.length} modules checked, ${stale.length} stale`);
        for (const m of stale) log(`  stale  ${m}: regenerate with ${cfg.commands.scaffold} ${m}, and commit it`);
        return stale.length === 0;
      },
    });
  }
  return steps;
}

/** Runs every step to the end (ALL STEPS, ALL FAILURES), or to the first red with stop. */
export function runSteps(steps, { stop = false, log = console.log, now = Date.now } = {}) {
  const summary = [];
  let stoppedAt = null;
  for (const { name, fn } of steps) {
    if (stoppedAt) { summary.push({ step: name, result: 'not run', seconds: 0 }); continue; }
    const started = now();
    let ok;
    try { ok = fn(); } catch (e) { log(String(e?.message ?? e)); ok = false; }
    summary.push({ step: name, result: ok ? 'green' : 'red', seconds: Math.round((now() - started) / 1000) });
    log(`\n=== ${name}: ${ok ? 'green' : 'RED'} ===\n`);
    if (!ok && stop) stoppedAt = name;
  }
  const reds = summary.filter((s) => s.result === 'red').map((s) => s.step);
  return { summary, reds, stoppedAt, green: summary.length > 0 && reds.length === 0 && !stoppedAt };
}

/** item.md's sections: { heading: [lines] }. */
const sections = (text) => {
  const out = {};
  let at = null;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) { at = m[1]; out[at] = []; continue; }
    if (at) out[at].push(line);
  }
  return out;
};
const body = (lines = []) => lines.map((l) => l.trim()).filter((l) => l && !/^<!--.*-->$/.test(l));

/**
 * The review's verdict in item.md: its first line, as the gate reads it ("clear", or the rule broken), and the reading it is:
 * the number the line names ("reading 3: clear"), else how many lines name a reading, else 1. Null when the review is empty.
 */
export function reviewState(itemText) {
  const lines = body(sections(itemText).Review);
  if (!lines.length) return null;
  const line = lines[0];
  const reading = Number(line.match(/\breading\s+(\d+)/i)?.[1] ?? lines.filter((l) => /\breading\s+\d+/i.test(l)).length) || 1;
  const words = line.replace(/^[-*]\s*/, '').replace(/^\**\s*(verdict,?\s*)?(reading\s+\d+\s*[:,-]?\s*)?/i, '');
  return { clear: /^\**\s*clear\b/i.test(words), reading, line };
}

/** The package's criteria, from item.md. */
export const criteriaOf = (itemText) => body(sections(itemText).Criteria).filter((l) => /^[-*]\s+\S/.test(l)).length;

/** The five lines a lane sends the super (FIVE-LINE REQUESTS): branch and tip; main merged in; the check; sealed; review. */
export function mergeRequest({ branch, tip, main = 'main', mainAncestor, run, sealed, review, isPackage = true }) {
  const firstRed = run.summary.find((s) => s.result !== 'green');
  return [
    `1. branch ${branch} at ${tip.slice(0, 8)}`,
    `2. ${main} merged in: ${mainAncestor ? `yes, ${main} is an ancestor of the tip` : `no; merge ${main} in (merge-main.mjs) and run the merge check again`}`,
    `3. merge check: ${run.green ? `green, ${run.summary.length} steps` : `red at ${run.reds.join(', ') || firstRed?.step || 'no step'}`}`,
    `4. sealed: ${!isPackage ? 'not a package' : !sealed ? 'not run here' : sealed.commit && sealed.commit !== tip ? `run on ${sealed.commit.slice(0, 8)}, not the tip` : `${sealed.code === 0 ? 'green' : 'red'}${sealed.total ? `, ${sealed.passed} passed of ${sealed.total}` : ''}`}`,
    `5. review: ${!isPackage ? 'not a package' : review ? `${review.clear ? 'clear' : 'not clear'} at reading ${review.reading}` : 'no verdict under ## Review'}`,
  ];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const unknown = argv.filter((a) => a.startsWith('--') && !['--build-first', '--stop'].includes(a));
  const pkgArg = argv.find((a) => !a.startsWith('--'));
  if (unknown.length) { console.error('usage: merge-check.mjs [work/<lane>/<package>] [--build-first] [--stop]'); process.exit(2); }
  const { root, config: cfg } = loadConfig(process.cwd());
  const main = cfg.mainBranch ?? 'main';
  const git = gitIn(root);
  const pkg = pkgArg && fs.existsSync(path.join(root, pkgArg, 'item.md')) ? slash(pkgArg) : null;
  if (pkgArg && !pkg) { console.error(`merge-check: ${pkgArg} holds no item.md`); process.exit(2); }
  const buildFirst = argv.includes('--build-first');
  const steps = plan(root, cfg, { pkg, buildFirst, touchesWeb: touches(root, main, cfg.mergeCheck?.web?.path) });
  if (!steps.length) { console.error('merge-check: no steps: fill in mergeCheck.steps in factory/harness.json'); process.exit(2); }
  const tip = git('rev-parse', 'HEAD').stdout.trim();
  const dirty = git('status', '--porcelain', '--untracked-files=no').stdout.trim() !== '';
  const run = runSteps(steps, { stop: argv.includes('--stop') });
  console.table(run.summary);
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD').stdout.trim();
  let sealed = null;
  try { sealed = pkg ? JSON.parse(fs.readFileSync(sealedFile(root, pkg), 'utf8')) : null; } catch { /* not run here */ }
  const itemText = pkg ? fs.readFileSync(path.join(root, pkg, 'item.md'), 'utf8') : '';
  const review = pkg ? reviewState(itemText) : null;
  const lines = mergeRequest({ branch, tip, main, mainAncestor: git('merge-base', '--is-ancestor', main, 'HEAD').status === 0, run, sealed, review, isPackage: !!pkg });
  fs.mkdirSync(recordDir(root), { recursive: true });
  fs.writeFileSync(checkFile(root), `${JSON.stringify({ at: new Date().toISOString(), package: pkg, branch, commit: tip, dirty, buildFirst, result: run.green ? 'green' : 'red', reds: run.reds, ...(run.stoppedAt ? { stoppedAt: run.stoppedAt } : {}), sealed, review, steps: run.summary }, null, 2)}\n`);
  if (run.green) {
    fs.writeFileSync(requestFile(root), `${lines.join('\n')}\n`);
    console.log(`\nMerge request (also ${slash(requestFile(root))}):\n${lines.join('\n')}${dirty ? '\n(the check ran on uncommitted work: commit it and run the check again; merge.mjs refuses this record)' : ''}`);
  } else {
    fs.rmSync(requestFile(root), { force: true });
    console.log(`\nThe merge check is red at: ${run.reds.join(', ') || run.stoppedAt}. No merge request.`);
  }
  process.exit(run.green ? 0 : 1);
}
