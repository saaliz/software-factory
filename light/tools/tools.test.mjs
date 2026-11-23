// node --test light/tools/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { seal, check } from './seal.mjs';
import { canStart, state, criteria, sections, prove, proofProblems, proofFile, buildOrder } from './gate.mjs';
import { calls, claudeCall, claudeFolder, report } from './tokens.mjs';

const project = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-'));
  fs.mkdirSync(path.join(root, 'work', '01-sign-in'), { recursive: true });
  fs.mkdirSync(path.join(root, 'tests', 'sealed'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tests', 'sealed', 'a.test.js'), 'assert(signIn("x"))\n');
  return root;
};
const item = 'work/01-sign-in';
const write = (root, text) => fs.writeFileSync(path.join(root, item, 'item.md'), text);
const GREEN = 'node -e "process.exit(0)"';
const RED = 'node -e "console.log(\'1 failed\'); process.exit(3)"';
const ITEM = (review = '', release = '') => `# Sign in\n\n## Criteria\n- A teacher signs in with her email\n- A wrong password is refused\n\n## Seal\n\n## Review\n${review}\n\n## Release\n${release}\n`;

test('a seal holds until a sealed file changes, vanishes or gains a neighbour', () => {
  const root = project();
  seal(root, item, ['tests/sealed']);
  assert.deepEqual(check(root, item).problems, []);
  fs.writeFileSync(path.join(root, 'tests', 'sealed', 'a.test.js'), 'assert(true)\n');
  assert.match(check(root, item).problems[0], /^changed: tests\/sealed\/a\.test\.js/);
  seal(root, item, ['tests/sealed'], new Date(), 'the first assertion tested nothing');
  fs.writeFileSync(path.join(root, 'tests', 'sealed', 'b.test.js'), 'x\n');
  assert.match(check(root, item).problems[0], /^added after the seal/);
  fs.rmSync(path.join(root, 'tests', 'sealed', 'b.test.js'));
  fs.rmSync(path.join(root, 'tests', 'sealed', 'a.test.js'));
  assert.match(check(root, item).problems[0], /^gone/);
});

test('a second seal is refused unless it says why, and the reason and the change are kept', () => {
  const root = project();
  assert.throws(() => seal(root, item, ['tests/sealed'], new Date(), 'too early'), /not sealed yet/);
  const first = seal(root, item, ['tests/sealed'], new Date('2026-01-01T00:00:00Z'));
  assert.equal(first.reseals, undefined);
  assert.deepEqual(check(root, item).reseals, []);
  fs.writeFileSync(path.join(root, 'tests', 'sealed', 'a.test.js'), 'assert(true)\n');
  fs.writeFileSync(path.join(root, 'tests', 'sealed', 'b.test.js'), 'assert(refused("y"))\n');
  assert.throws(() => seal(root, item, ['tests/sealed']), /already sealed 2026-01-01T00:00:00\.000Z.*--reseal/);
  assert.throws(() => seal(root, item, ['tests/sealed'], new Date(), '  '), /says why/);
  // The refused attempts wrote nothing: the first seal still stands, and it is broken.
  assert.equal(check(root, item).problems.length, 2);
  seal(root, item, ['tests/sealed'], new Date('2026-01-02T00:00:00Z'), 'the refusal had no test');
  const held = check(root, item);
  assert.deepEqual(held.problems, []);
  assert.deepEqual(held.reseals, [{ at: '2026-01-02T00:00:00.000Z', why: 'the refusal had no test', was: '2026-01-01T00:00:00.000Z',
    changed: ['tests/sealed/a.test.js', 'tests/sealed/b.test.js'] }]);
  seal(root, item, ['tests/sealed'], new Date('2026-01-03T00:00:00Z'), 'nothing changed');
  assert.deepEqual(check(root, item).reseals.map((x) => [x.why, x.changed.length]), [['the refusal had no test', 2], ['nothing changed', 0]]);
});

test('a seal reads CRLF and LF as the same file', () => {
  const root = project();
  seal(root, item, ['tests/sealed']);
  fs.writeFileSync(path.join(root, 'tests', 'sealed', 'a.test.js'), 'assert(signIn("x"))\r\n');
  assert.deepEqual(check(root, item).problems, []);
});

test('sealing nothing, or a path that is not there, is refused', () => {
  const root = project();
  assert.throws(() => seal(root, item, []), /at least one/);
  assert.throws(() => seal(root, item, ['tests/none']), /nothing at/);
  assert.equal(check(root, item).sealed, false);
});

test('the gate reads criteria and refuses a bad item file', () => {
  const root = project();
  assert.match(canStart(root, item, 'tests').reasons[0], /no item\.md/);
  write(root, '# Sign in\n\n## Criteria\n\n## Seal\n');
  const r = canStart(root, item, 'tests');
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => /lacks the heading "## Review"/.test(x)));
  assert.ok(r.reasons.some((x) => /no criteria/.test(x)));
  write(root, ITEM().replace('- A wrong password is refused', '- A teacher signs in with her email'));
  assert.match(canStart(root, item, 'tests').reasons[0], /written twice/);
  write(root, `## Criteria\n${Array.from({ length: 16 }, (_, i) => `- criterion ${i}`).join('\n')}\n## Seal\n## Review\n## Release\n`);
  assert.match(canStart(root, item, 'tests').reasons[0], /16 criteria/);
  assert.deepEqual(criteria(sections(ITEM())), ['A teacher signs in with her email', 'A wrong password is refused']);
});

test('the layered order builds first, then seals the tests, and still refuses review and release without a seal', () => {
  const root = project();
  write(root, ITEM());
  fs.mkdirSync(path.join(root, 'factory'), { recursive: true });
  fs.writeFileSync(path.join(root, 'factory', 'build-order'), 'layered\n');
  assert.equal(buildOrder(root), 'layered');
  assert.equal(state(root, item).next, 'build');
  assert.equal(canStart(root, item, 'build').ok, true);
  assert.match(canStart(root, item, 'tests').reasons[0], /build comes first/);
  assert.match(canStart(root, item, 'review').reasons[0], /not sealed/);
  fs.writeFileSync(path.join(root, item, '3-build.md'), 'built\n');
  assert.equal(state(root, item).next, 'tests');
  assert.equal(canStart(root, item, 'tests').ok, true);
  assert.match(canStart(root, item, 'release').reasons[0], /not sealed/);
  seal(root, item, ['tests/sealed'], new Date(), null, { command: GREEN });
  // Layered or not, the review waits for the gate's own green run on the seal.
  assert.equal(state(root, item).next, 'prove');
  assert.match(canStart(root, item, 'review').reasons[0], /not proven/);
  assert.equal(prove(root, item).ok, true);
  assert.equal(state(root, item).next, 'review');
  assert.equal(canStart(root, item, 'review').ok, true);
  write(root, ITEM('clear'));
  assert.equal(canStart(root, item, 'release').ok, true);
  fs.writeFileSync(path.join(root, 'tests', 'sealed', 'a.test.js'), 'assert(true)\n');
  assert.equal(state(root, item).next, 'stopped');
  assert.equal(canStart(root, item, 'build').ok, false);
  fs.writeFileSync(path.join(root, 'factory', 'build-order'), 'tests-later\n');
  assert.throws(() => buildOrder(root), /layered, tests-first/);
});

test('the gate walks an item from tests to done, and stops on a broken seal', () => {
  const root = project();
  write(root, ITEM());
  assert.equal(canStart(root, item, 'tests').ok, true);
  assert.equal(state(root, item).next, 'tests');
  assert.match(canStart(root, item, 'build').reasons[0], /not sealed/);
  seal(root, item, ['tests/sealed'], new Date(), null, { command: GREEN });
  assert.equal(canStart(root, item, 'build').ok, true);
  assert.equal(state(root, item).next, 'build');
  // A build note is a claim: the review waits for the gate's own run.
  fs.writeFileSync(path.join(root, item, '3-build.md'), 'built, all green\n');
  assert.equal(state(root, item).next, 'prove');
  assert.match(canStart(root, item, 'review').reasons[0], /not proven: no proof\.json/);
  assert.match(canStart(root, item, 'release').reasons[0], /not proven/);
  assert.equal(prove(root, item).ok, true);
  assert.equal(canStart(root, item, 'review').ok, true);
  assert.equal(state(root, item).next, 'review');
  assert.match(canStart(root, item, 'release').reasons[0], /no review yet/);
  write(root, ITEM('Principle: a failed save is shown as saved (src/save.js:14)'));
  assert.match(canStart(root, item, 'release').reasons[0], /not clear/);
  assert.equal(state(root, item).next, 'build');
  write(root, ITEM('clear'));
  assert.equal(canStart(root, item, 'release').ok, true);
  assert.equal(state(root, item).next, 'release');
  write(root, ITEM('clear', 'Version: v0.1.0'));
  assert.equal(state(root, item).next, 'done');
  fs.writeFileSync(path.join(root, 'tests', 'sealed', 'a.test.js'), 'assert(true)\n');
  assert.equal(state(root, item).next, 'stopped');
  assert.equal(canStart(root, item, 'release').ok, false);
  assert.match(canStart(root, item, 'ship').reasons[0], /unknown step/);
});

test('the seal keeps the commands, and the gate proves by running them itself', () => {
  const root = project();
  write(root, ITEM());
  seal(root, item, ['tests/sealed']);
  assert.match(prove(root, item).reasons[0], /names no command/);
  assert.equal(fs.existsSync(proofFile(root, item)), false);
  const again = seal(root, item, ['tests/sealed'], new Date(), 'the seal named no command', { command: RED, whole: GREEN });
  assert.deepEqual(again.reseals[0].changed, ['the sealed command', 'the whole command']);
  const red = prove(root, item);
  assert.equal(red.ok, false);
  assert.match(red.reasons[0], /the sealed command exited 3/);
  assert.deepEqual(red.record.runs.map((r) => [r.name, r.exitCode]), [['sealed', 3], ['whole', 0]]);
  assert.match(red.record.runs[0].tail.join(' '), /1 failed/);
  assert.match(canStart(root, item, 'review').reasons[0], /the proof is red: the sealed command exited 3/);
  // A reseal that names nothing new keeps the commands; one that changes them makes an old proof stale.
  const kept = seal(root, item, ['tests/sealed'], new Date(), 'a wrong expected value', {});
  assert.equal(kept.command, RED);
  seal(root, item, ['tests/sealed'], new Date(), 'the command was wrong', { command: GREEN });
  assert.equal(prove(root, item).ok, true);
  assert.deepEqual(proofProblems(root, item), []);
  seal(root, item, ['tests/sealed'], new Date(), 'a second fault in the tests', { whole: RED });
  assert.match(proofProblems(root, item)[0], /the seal changed since the proof/);
  assert.match(canStart(root, item, 'release').reasons[0], /the seal changed since the proof/);
});

test('a proof goes stale when the code changes after it, committed or not', () => {
  const root = project();
  write(root, ITEM());
  const g = (...a) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...a], { cwd: root, encoding: 'utf8' });
  if (g('init', '-q').status !== 0) return; // no git on this machine: the commit checks are skipped by the gate too
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src', 'sign-in.js'), 'export const signIn = () => true;\n');
  g('add', '-A'); g('commit', '-q', '-m', 'the build');
  seal(root, item, ['tests/sealed'], new Date(), null, { command: GREEN });
  const first = prove(root, item);
  assert.equal(first.ok, true);
  assert.match(first.record.commit, /^[0-9a-f]{40}$/);
  assert.equal(first.record.uncommitted, 0);
  assert.equal(canStart(root, item, 'review').ok, true);
  // The seal, the proof and the notes live in the work item's folder and do not count as code.
  fs.writeFileSync(path.join(root, item, '3-build.md'), 'built\n');
  assert.deepEqual(proofProblems(root, item), []);
  fs.writeFileSync(path.join(root, 'src', 'sign-in.js'), 'export const signIn = () => false;\n');
  assert.match(proofProblems(root, item).join(' '), /1 uncommitted changes outside the work item since the proof/);
  g('add', '-A'); g('commit', '-q', '-m', 'a repair');
  assert.match(proofProblems(root, item).join(' '), /the code changed since the proof \(1 files\)/);
  assert.equal(canStart(root, item, 'review').ok, false);
  assert.equal(prove(root, item).ok, true);
  assert.equal(canStart(root, item, 'review').ok, true);
});

const usage = (id, model, day, input, create, read, output) => JSON.stringify({
  type: 'assistant', timestamp: `${day}T10:00:00Z`, sessionId: 's1',
  message: { id, model, usage: { input_tokens: input, cache_creation_input_tokens: create, cache_read_input_tokens: read, output_tokens: output } },
});

test('the counter reads a call once, skips program-written lines, and filters by day', async () => {
  assert.equal(claudeCall('{"type":"user"}'), null);
  assert.equal(claudeCall(usage('m0', '<synthetic>', '2026-01-02', 1, 1, 1, 1)), null);
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-home-'));
  const proj = path.join(home, 'code', 'my-app');
  const dir = path.join(home, '.claude', 'projects', claudeFolder(proj));
  fs.mkdirSync(path.join(dir, 'abc', 'subagents'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'abc.jsonl'), [
    '{"type":"custom-title","customTitle":"Build sign in","sessionId":"s1"}',
    usage('m1', 'big', '2026-01-02', 10, 90, 1000, 5),
    usage('m1', 'big', '2026-01-02', 10, 90, 1000, 5),
    usage('m2', 'big', '2026-01-03', 20, 0, 2000, 7),
  ].join('\n'));
  fs.writeFileSync(path.join(dir, 'abc', 'subagents', 'agent-1.jsonl'), usage('m3', 'small', '2026-01-03', 5, 0, 300, 2));
  const sibling = path.join(home, '.claude', 'projects', claudeFolder(path.join(home, 'code', 'my-app-2')));
  fs.mkdirSync(sibling, { recursive: true });
  fs.writeFileSync(path.join(sibling, 'zzz.jsonl'), [
    JSON.stringify({ type: 'user', cwd: path.join(home, 'code', 'my-app-2'), message: { content: 'hi' } }),
    usage('m9', 'big', '2026-01-03', 999, 0, 999, 999),
  ].join('\n'));
  const codex = path.join(home, '.codex', 'sessions', '2026', '01', '03');
  fs.mkdirSync(codex, { recursive: true });
  fs.writeFileSync(path.join(codex, 'r.jsonl'), [
    JSON.stringify({ type: 'session_meta', timestamp: '2026-01-03T09:00:00Z', payload: { id: 'cx1', cwd: proj } }),
    JSON.stringify({ type: 'turn_context', payload: { model: 'other' } }),
    JSON.stringify({ payload: { info: { total_token_usage: { input_tokens: 500, cached_input_tokens: 400, output_tokens: 30 } } } }),
  ].join('\n'));
  fs.writeFileSync(path.join(codex, 'elsewhere.jsonl'), [
    JSON.stringify({ type: 'session_meta', timestamp: '2026-01-03T09:00:00Z', payload: { id: 'cx2', cwd: path.join(home, 'code', 'my-app-2') } }),
    JSON.stringify({ payload: { info: { total_token_usage: { input_tokens: 9, cached_input_tokens: 0, output_tokens: 9 } } } }),
  ].join('\n'));

  const all = await calls(proj, { home });
  assert.equal(all.length, 4);
  const byModel = Object.fromEntries(report(all, 'model').map((r) => [r.model, r]));
  assert.equal(byModel.big.calls, 2);
  assert.equal(byModel.big['new input'], 120);
  assert.equal(byModel.big['sent again'], 3000);
  assert.equal(byModel.small['helpers share'], '100%');
  assert.equal(byModel['codex other']['new input'], 100);
  assert.equal(report(all, 'session').find((r) => r.session === 'Build sign in').calls, 3);
  assert.equal((await calls(proj, { home, from: '2026-01-03' })).length, 3);
  assert.deepEqual(report(all, 'day').map((r) => r.day), ['2026-01-02', '2026-01-03']);
});
