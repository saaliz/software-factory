// One package's sealed tests, and nothing more, through a heavy slot (ONE PACKAGE'S TESTS).
//   node factory/tools/package-tests.mjs work/<lane>/<package>
// The command is factory/harness.json commands.packageTests, with <tests> filled by the paths the package's seal.json holds and
// <package> by its folder. It refuses when the package has no seal, when the command is not set, or when the filled command
// names neither the sealed paths nor the package: that run would be the whole suite, which is the super's run on the main branch.
// Outside a slot it reruns itself under slots.mjs heavy (which runs the main checkout's copy), labelled
// <lane folder>-<package>-tests; inside one (FACTORY_HEAVY_SLOTS set) it runs. It prints passed of total when the output carries
// a test runner's summary (node's "pass N" and "fail N" lines are read), and writes the record the merge request reads,
// sealed-<package>.json, in the worktree's own git folder.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fillCommand, filled, gitIn, loadConfig, slash } from './config.mjs';
import { recordDir, sealedFile } from './merge-check.mjs';
import { laneWords } from './slots.mjs';

/** What the run will do, built without running anything; throws a refusal. */
export function plan(root, cfg, pkgArg) {
  const pkg = slash(path.relative(root, path.resolve(root, pkgArg)));
  const sealPath = path.join(root, pkg, 'seal.json');
  if (!fs.existsSync(sealPath)) throw new Error(`${pkg} has no seal.json: seal its tests first (factory/tools/seal.mjs)`);
  const seal = JSON.parse(fs.readFileSync(sealPath, 'utf8'));
  const tests = (seal.roots ?? Object.keys(seal.files ?? {})).filter(Boolean);
  if (!tests.length) throw new Error(`${pkg}'s seal holds no paths`);
  if (!filled(cfg.commands?.packageTests)) throw new Error('name the command in factory/harness.json, commands.packageTests, with <tests> or <package> in it');
  const command = fillCommand(cfg.commands.packageTests, { tests: tests.join(' '), package: pkg });
  if (!tests.some((t) => command.includes(t)) && !command.includes(pkg)) {
    throw new Error(`the command names neither ${pkg} nor its sealed paths, and would be the whole suite; refused (ONE PACKAGE'S TESTS)`);
  }
  const parts = pkg.split('/');
  const laneFolder = parts.length >= 3 ? parts.at(-2) : null;
  const known = new Set(Object.values(laneWords(root)));
  return { pkg, tests, command, label: `${laneFolder ? `${laneFolder}-` : ''}${parts.at(-1)}-tests`, lane: laneFolder && known.has(laneFolder) ? laneFolder : null };
}

/** Passed and failed from a test runner's summary lines; null when the output has none. */
export function counts(output) {
  const n = (word) => { const m = [...output.matchAll(new RegExp(`^\\s*(?:ℹ|#)\\s*${word}\\s+(\\d+)\\s*$`, 'gm'))].at(-1); return m ? Number(m[1]) : null; };
  const passed = n('pass'), failed = n('fail');
  return passed === null && failed === null ? null : { passed: passed ?? 0, failed: failed ?? 0, total: (passed ?? 0) + (failed ?? 0) };
}

/** Runs the command, its output shown and kept; writes the record. Answers the exit code. */
export async function execute(root, p) {
  let output = '';
  const code = await new Promise((resolve) => {
    const child = spawn(p.command, { cwd: root, shell: true, stdio: ['inherit', 'pipe', 'pipe'] });
    for (const [from, to] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) from.on('data', (d) => { output += d; to.write(d); });
    child.on('exit', (c) => resolve(c ?? 1));
    child.on('error', () => resolve(1));
  });
  const git = gitIn(root);
  const c = counts(output);
  const record = { at: new Date().toISOString(), package: p.pkg, commit: git('rev-parse', 'HEAD').stdout.trim(), dirty: git('status', '--porcelain', '--untracked-files=no').stdout.trim() !== '',
    command: p.command, code, ...(c ?? {}) };
  fs.mkdirSync(recordDir(root), { recursive: true });
  fs.writeFileSync(sealedFile(root, p.pkg), `${JSON.stringify(record, null, 2)}\n`);
  console.log(`\n${p.pkg}: ${code === 0 ? 'green' : 'red'}${c ? `, ${c.passed} passed of ${c.total}` : ''}; record ${slash(sealedFile(root, p.pkg))}`);
  return code;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pkgArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!pkgArg) { console.error('usage: node factory/tools/package-tests.mjs work/<lane>/<package>'); process.exit(2); }
  const { root, config } = loadConfig(process.cwd());
  let p;
  try { p = plan(root, config, pkgArg); } catch (e) { console.error(`package-tests: ${e.message}`); process.exit(2); }
  if (process.env.FACTORY_HEAVY_SLOTS) execute(root, p).then((c) => process.exit(c));
  else {
    const slots = path.join(path.dirname(fileURLToPath(import.meta.url)), 'slots.mjs');
    const args = [slots, 'heavy', ...(p.lane ? ['--lane', p.lane] : []), '--label', p.label, '--', process.execPath, fileURLToPath(import.meta.url), p.pkg];
    process.exit(spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' }).status ?? 1);
  }
}
