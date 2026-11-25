// node --test harness/plugin/scripts/merge.test.mjs
// The merge check, the super's merge and a lane's merge of the main branch, on throwaway git repositories.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { plan, runSteps, mergeRequest, reviewState, staleModules, checkFile, requestFile, SCAFFOLD_STEP, WEB_STEP } from './merge-check.mjs';
import { merge, mergeChecks, mergeHash, writeMergeLine, prependLastMerge, packageAtTip } from './merge.mjs';
import { mergeMain, isGenerated } from './merge-main.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
Object.assign(process.env, { GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.com' });
const fresh = () => fs.mkdtempSync(path.join(os.tmpdir(), 'factory-merge-'));
const write = (root, rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
const gitAt = (root) => (...a) => { const r = spawnSync('git', a, { cwd: root, encoding: 'utf8' }); if (r.status !== 0 && !['merge', 'merge-base'].includes(a[0])) throw new Error(`git ${a.join(' ')}: ${r.stderr}`); return r.stdout.trim(); };

// A scaffold of the form interfaces.md asks: gen/<module>.txt from designs/<module>/design.txt, with --check.
const SCAFFOLD = `const fs = require('fs'), [m, flag] = process.argv.slice(2);
const want = '// generated\\n' + fs.readFileSync('designs/' + m + '/design.txt', 'utf8');
const file = 'gen/' + m + '.txt', have = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
if (flag === '--check') process.exit(have === want ? 0 : 1);
fs.mkdirSync('gen', { recursive: true }); fs.writeFileSync(file, want);`;
const ITEM = '# Pins kept\n\n## Criteria\n\n- a pin is kept\n- a pin is moved\n\n## Seal\n\n## Review\n\nclear at reading 2\n\n## Release\n\n<!-- left empty until the release -->\n';

function project(steps = [{ name: 'build', command: 'node -e 0' }]) {
  const root = fresh();
  const git = gitAt(root);
  git('init', '-q', '-b', 'main');
  git('config', 'core.autocrlf', 'false');
  write(root, 'factory/harness.json', JSON.stringify({ mainBranch: 'main', records: 'factory/records', commands: { scaffold: 'node scaffold.cjs' },
    mergeCheck: { steps, modules: 'designs' }, generated: { paths: ['^gen/'] }, merge: { prefix: 'records' } }));
  write(root, 'scaffold.cjs', SCAFFOLD);
  for (const m of ['alpha', 'beta']) write(root, `designs/${m}/design.txt`, `${m} v1\n`);
  write(root, 'factory/records/NOW.md', '# Now\n\n| **Last merge** | none yet |\n');
  write(root, '.gitignore', 'node_modules/\n');
  spawnSync('node', ['scaffold.cjs', 'alpha'], { cwd: root });
  spawnSync('node', ['scaffold.cjs', 'beta'], { cwd: root });
  git('add', '-A');
  git('commit', '-q', '-m', 'start');
  return { root, git };
}
const check = (cwd, ...a) => spawnSync(process.execPath, [path.join(here, 'merge-check.mjs'), ...a], { cwd, encoding: 'utf8' });
const checked = (wt) => { const r = check(wt, 'work/a/01-pins'); assert.equal(r.status, 0, r.stdout + r.stderr); };
function lane(p, branch = 'lane-a') {
  const wt = path.join(fresh(), 'wt');
  p.git('worktree', 'add', '-q', wt, '-b', branch);
  const g = gitAt(wt);
  write(wt, 'work/a/01-pins/item.md', ITEM);
  write(wt, 'designs/alpha/design.txt', 'alpha v2\n');
  spawnSync('node', ['scaffold.cjs', 'alpha'], { cwd: wt });
  g('add', '-A');
  g('commit', '-q', '-m', 'pins: build');
  return { wt, g };
}

test('the plan: the configured steps, the web check only when the branch changes the web app, and every module\'s scaffold check last', () => {
  const root = fresh();
  const cfg = { commands: { scaffold: 'node s.cjs' }, mergeCheck: { modules: 'designs',
    steps: [{ name: 'secrets', command: 'scan' }, { name: 'build', command: 'build <package>' }, { name: 'sealed tests build', command: 'build-acceptance' },
      { name: 'contracts and integration', command: 'contracts', containers: true }, { name: '<unfilled>', command: '<x>' }],
    web: { path: 'web', installed: 'node_modules', install: 'install', check: 'types-and-lint', tests: 'web-tests' } } };
  const names = (o) => plan(root, cfg, { pkg: 'work/a/01-pins', ...o }).map((s) => s.name);
  assert.deepEqual(names({}), ['secrets', 'build', 'sealed tests build', 'contracts and integration', SCAFFOLD_STEP]);
  assert.deepEqual(names({ buildFirst: true }), ['secrets', 'build', 'sealed tests build', SCAFFOLD_STEP], '--build-first leaves out the steps that start containers');
  assert.deepEqual(plan(root, cfg, {}).map((s) => s.name), ['secrets', 'sealed tests build', 'contracts and integration', SCAFFOLD_STEP], 'a step naming <package> is left out on a branch that is no package');
  assert.deepEqual(names({ touchesWeb: true }), ['secrets', 'build', 'sealed tests build', 'contracts and integration', WEB_STEP, SCAFFOLD_STEP]);
  const ran = [];
  const run = (c) => { ran.push(c.replace(/^cd "[^"]+" && /, '')); return 0; };
  for (const s of plan(root, cfg, { pkg: 'work/a/01-pins', touchesWeb: true, buildFirst: true, run, log: () => {} })) s.fn();
  assert.deepEqual(ran.slice(0, 5), ['scan', 'build work/a/01-pins', 'build-acceptance', 'install', 'types-and-lint'], 'packages installed when missing; no web tests under --build-first');
  fs.mkdirSync(path.join(root, 'web', 'node_modules'), { recursive: true });
  ran.length = 0;
  plan(root, cfg, { touchesWeb: true, run, log: () => {} }).find((s) => s.name === WEB_STEP).fn();
  assert.deepEqual(ran, ['types-and-lint', 'web-tests'], 'installed already, so not again; web tests outside --build-first');
});

test('every step runs to the end and every red is listed; --stop stops at the first, for a builder\'s loop', () => {
  const steps = ['a', 'b', 'c', 'd'].map((name) => ({ name, fn: () => !['b', 'c'].includes(name) }));
  const all = runSteps(steps, { log: () => {} });
  assert.deepEqual(all.summary.map((s) => s.result), ['green', 'red', 'red', 'green']);
  assert.deepEqual([all.reds, all.green], [['b', 'c'], false]);
  const stop = runSteps(steps, { stop: true, log: () => {} });
  assert.deepEqual(stop.summary.map((s) => s.result), ['green', 'red', 'not run', 'not run']);
  assert.equal(stop.stoppedAt, 'b');
  assert.equal(runSteps([], { log: () => {} }).green, false, 'no step is not green');
});

test('the review verdict is the first line of ## Review, at the reading it names', () => {
  const item = (review) => `# x\n\n## Criteria\n\n- c\n\n## Review\n\n${review}\n\n## Release\n`;
  assert.deepEqual(reviewState(item('clear at reading 3')), { clear: true, reading: 3, line: 'clear at reading 3' });
  assert.deepEqual(reviewState(item('Reading 2: not clear, rule 4 in src/a.js:12\nReading 1: not clear')).clear, false);
  assert.equal(reviewState(item('Reading 2: not clear, rule 4\nReading 1: not clear')).reading, 2);
  assert.deepEqual(reviewState(item('clear')), { clear: true, reading: 1, line: 'clear' });
  assert.equal(reviewState(item('<!-- left empty until the review -->')), null);
});

test('the merge request is five lines: branch and tip, main merged in, the check, sealed, review', () => {
  const run = { summary: [{ step: 'build', result: 'green' }, { step: SCAFFOLD_STEP, result: 'green' }], reds: [], green: true };
  const tip = '0123456789abcdef0123';
  assert.deepEqual(mergeRequest({ branch: 'candidate/a-01-pins', tip, mainAncestor: true, run, sealed: { commit: tip, code: 0, passed: 17, total: 20 }, review: { clear: true, reading: 2 } }), [
    '1. branch candidate/a-01-pins at 01234567',
    '2. main merged in: yes, main is an ancestor of the tip',
    '3. merge check: green, 2 steps',
    '4. sealed: green, 17 passed of 20',
    '5. review: clear at reading 2',
  ]);
  const red = mergeRequest({ branch: 'b', tip, mainAncestor: false, run: { summary: [{ step: 'build', result: 'red' }, { step: 'x', result: 'red' }], reds: ['build', 'x'], green: false }, sealed: { commit: 'fedcba9876543210', code: 0 }, review: null });
  assert.equal(red[1], '2. main merged in: no; merge main in (merge-main.mjs) and run the merge check again');
  assert.equal(red[2], '3. merge check: red at build, x', 'every red, not the first');
  assert.equal(red[3], '4. sealed: run on fedcba98, not the tip');
  assert.equal(red[4], '5. review: no verdict under ## Review');
  const plain = mergeRequest({ branch: 'plans/next', tip, mainAncestor: true, run, sealed: null, review: null, isPackage: false });
  assert.deepEqual(plain.slice(3), ['4. sealed: not a package', '5. review: not a package']);
});

test('the scaffold check walks every module and names the stale ones', () => {
  const { root } = project();
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'factory/harness.json'), 'utf8'));
  assert.deepEqual(staleModules(root, cfg), { checked: ['alpha', 'beta'], stale: [] });
  write(root, 'designs/beta/design.txt', 'beta v2\n');
  assert.deepEqual(staleModules(root, cfg).stale, ['beta']);
  assert.deepEqual(staleModules(root, {}).stale, [], 'no scaffold command, nothing to check');
});

test('run whole: the check writes its record on the tip in the worktree\'s git folder, and on green the five-line request', () => {
  const p = project([{ name: 'build', command: 'node -e 0' }, { name: 'contracts', command: 'node -e "process.exit(1)"', containers: true }]);
  const { wt } = lane(p);
  const red = check(wt, 'work/a/01-pins');
  assert.equal(red.status, 1);
  assert.match(red.stdout, /red at: contracts/);
  const record = JSON.parse(fs.readFileSync(checkFile(wt), 'utf8'));
  assert.deepEqual([record.result, record.commit, record.dirty], ['red', gitAt(wt)('rev-parse', 'HEAD'), false]);
  assert.ok(!fs.existsSync(requestFile(wt)));
  const green = check(wt, 'work/a/01-pins', '--build-first');
  assert.equal(green.status, 0, green.stdout);
  assert.match(fs.readFileSync(requestFile(wt), 'utf8'), /^1\. branch lane-a at [0-9a-f]{8}\n2\. main merged in: yes[\s\S]*5\. review: clear at reading 2\n$/);
  assert.equal(gitAt(wt)('status', '--porcelain'), '', 'the records leave the tree clean');
  write(wt, 'designs/beta/design.txt', 'beta v2\n');
  assert.match(check(wt, '--build-first').stdout, /stale {2}beta: regenerate with node scaffold\.cjs beta/);
});

test('the merge refuses a dirty tree, a check not on the tip, and a branch that does not merge cleanly', () => {
  const p = project();
  const { wt, g } = lane(p);
  checked(wt);
  write(p.root, 'scaffold.cjs', `${SCAFFOLD}\n`);
  assert.match(mergeChecks(p.root, { branch: 'lane-a' }).problems.join('\n'), /the tree is dirty: scaffold\.cjs/);
  p.git('checkout', '--', 'scaffold.cjs');
  write(wt, 'notes.txt', 'later\n');
  g('add', '-A');
  g('commit', '-q', '-m', 'later');
  assert.match(mergeChecks(p.root, { branch: 'lane-a' }).problems.join('\n'), /the merge check ran on [0-9a-f]{8}, and lane-a's tip is/);
  checked(wt);
  write(p.root, 'notes.txt', 'on main\n');
  p.git('add', '-A');
  p.git('commit', '-q', '-m', 'main moves');
  assert.match(mergeChecks(p.root, { branch: 'lane-a' }).problems.join('\n'), /does not merge cleanly into main: notes\.txt/);
  assert.deepEqual(merge(p.root, { branch: 'lane-a', pkg: 'work/a/01-pins', log: () => {} }).ok, false);
  assert.match(mergeChecks(p.root, { branch: 'no-such' }).problems.join('\n'), /no branch no-such/);
});

test('the merge: --no-ff, the Merge line where the rerun reads it, stale modules regenerated, the records written and committed', () => {
  const p = project();
  const { wt } = lane(p);
  checked(wt);
  // The main branch moves meanwhile: beta's design changes and its generated code is left stale, so the merge must regenerate it.
  write(p.root, 'designs/beta/design.txt', 'beta v2\n');
  p.git('add', '-A');
  p.git('commit', '-q', '-m', 'beta design');
  assert.match(merge(p.root, { branch: 'lane-a', pkg: 'work/a/01-pins', dryRun: true, log: () => {} }).lines.join('\n'), /dry run: nothing is done/);
  const r = merge(p.root, { branch: 'lane-a', pkg: 'work/a/01-pins', now: new Date('2026-01-05T10:00:00Z'), log: () => {} });
  assert.equal(r.ok, true, r.lines.join('\n'));
  const item = fs.readFileSync(path.join(p.root, 'work/a/01-pins/item.md'), 'utf8');
  assert.equal(mergeHash(item), r.hash.slice(0, 8));
  assert.equal(fs.readFileSync(path.join(p.root, 'gen/beta.txt'), 'utf8'), '// generated\nbeta v2\n');
  assert.match(fs.readFileSync(path.join(p.root, 'factory/records/merges.md'), 'utf8'), /- 2026-01-05: work\/a\/01-pins merged `[0-9a-f]{8}` \(2 criteria; review clear at reading 2\)/);
  assert.match(fs.readFileSync(path.join(p.root, 'factory/records/NOW.md'), 'utf8'), /\| \*\*Last merge\*\* \| 2026-01-05: work\/a\/01-pins merged .*; before it none yet \|/);
  assert.equal(p.git('status', '--porcelain'), '');
  const subjects = p.git('log', '--format=%s', '-3').split('\n');
  assert.match(subjects[0], /^records: work\/a\/01-pins merged as [0-9a-f]{8}, the Merge line and the records$/);
  assert.match(subjects[1], /^records: beta regenerated after work\/a\/01-pins merged/);
  assert.match(subjects[2], /^Pins kept: work\/a\/01-pins merged \(2 criteria; review clear at reading 2; merge check green on [0-9a-f]{8}\)$/);
  assert.equal(p.git('rev-list', '--parents', '-1', r.hash).split(' ').length, 3, 'a merge commit');
});

test('a package no worktree holds is read from the branch, and the check named by --check-from', () => {
  const p = project();
  const { wt } = lane(p);
  checked(wt);
  const saved = path.join(fresh(), 'merge-check.json');
  fs.copyFileSync(checkFile(wt), saved);
  p.git('worktree', 'remove', wt);
  assert.match(packageAtTip(p.root, 'lane-a', 'work/a/01-pins'), /^# Pins kept/);
  assert.match(mergeChecks(p.root, { branch: 'lane-a' }).problems.join('\n'), /lane-a is checked out in no worktree/);
  const r = merge(p.root, { branch: 'lane-a', pkg: 'work/a/01-pins', checkFrom: saved, log: () => {} });
  assert.equal(r.ok, true, r.lines.join('\n'));
  assert.equal(merge(p.root, { branch: 'lane-a', pkg: 'work/b/09-none', checkFrom: saved, log: () => {} }).ok, false);
});

test('the Merge line: first under ## Release, an older one replaced, the section added when absent', () => {
  const once = writeMergeLine(ITEM, 'abcdef12');
  assert.match(once, /## Release\n\nMerge: abcdef12\n\n<!-- left empty/);
  assert.equal(mergeHash(writeMergeLine(once, '1234567a')), '1234567a');
  assert.equal((writeMergeLine(once, '1234567a').match(/^Merge: /gm) ?? []).length, 1);
  assert.equal(writeMergeLine('# x\r\n', 'abcdef12'), '# x\r\n\r\n## Release\r\n\r\nMerge: abcdef12\r\n');
  assert.equal(mergeHash('# x\n\n## Review\n\nMerge: abcdef12\n'), null, 'only under ## Release');
  assert.equal(prependLastMerge('| **Last merge** | old |\r\n', 'new'), '| **Last merge** | new; before it old |\r\n');
  assert.equal(prependLastMerge('# no row\n', 'new'), null);
});

test("a lane's merge of main: generated conflicts take main's side and the scaffold reruns; a hand-written conflict is left", () => {
  const p = project();
  const { wt, g } = lane(p);
  // Main changes alpha's design too, and a hand-written file the lane also changes.
  write(p.root, 'designs/alpha/design.txt', 'alpha v3\n');
  spawnSync('node', ['scaffold.cjs', 'alpha'], { cwd: p.root });
  write(p.root, 'src.txt', 'main\n');
  p.git('add', '-A');
  p.git('commit', '-q', '-m', 'main: alpha v3');
  write(wt, 'src.txt', 'lane\n');
  g('add', '-A');
  g('commit', '-q', '-m', 'lane: src');
  const dry = mergeMain(wt, { dryRun: true, log: () => {} });
  assert.deepEqual([dry.settled, dry.left], [['gen/alpha.txt'], ['designs/alpha/design.txt', 'src.txt']]);
  assert.equal(g('status', '--porcelain'), '', 'a dry run leaves the tree as it was');
  const r = mergeMain(wt, { log: () => {} });
  assert.deepEqual([r.ok, r.left], [false, ['designs/alpha/design.txt', 'src.txt']]);
  assert.match(g('diff', '--name-only', '--diff-filter=U'), /src\.txt/);
  assert.ok(!g('diff', '--name-only', '--diff-filter=U').includes('gen/alpha.txt'), 'the generated conflict is settled and staged');
  g('merge', '--abort');
});

test("a lane's merge of main with only generated conflicts commits, and the scaffold is rerun from the merged design", () => {
  const p = project();
  const { wt, g } = lane(p);
  write(p.root, 'gen/alpha.txt', '// generated\nby hand on main\n');
  p.git('add', '-A');
  p.git('commit', '-q', '-m', 'main: a generated file changed');
  const r = mergeMain(wt, { log: () => {} });
  assert.deepEqual([r.ok, r.settled, r.left], [true, ['gen/alpha.txt'], []]);
  assert.equal(fs.readFileSync(path.join(wt, 'gen/alpha.txt'), 'utf8'), '// generated\nalpha v2\n', 'rerun from the design, not kept as main had it');
  assert.equal(g('status', '--porcelain'), '');
  assert.match(g('log', '-1', '--format=%P'), / /, 'the merge is committed');
  assert.ok(isGenerated('src/x.g.cs', { generated: { paths: ['\\.g\\.cs$'] } }));
  assert.ok(isGenerated('src/x.cs', { sourcesCheck: { generatedMarker: 'generated' } }, () => '// <generated> do not edit'));
  assert.ok(!isGenerated('src/x.cs', { sourcesCheck: { generatedMarker: '<a marker>' } }, () => '// <a marker>'), 'a placeholder marks nothing');
});
