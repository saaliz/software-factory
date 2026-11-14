// node --test light/tools/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { seal, check } from './seal.mjs';
import { canStart, state, criteria, sections } from './gate.mjs';
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
const ITEM = (review = '', release = '') => `# Sign in\n\n## Criteria\n- A teacher signs in with her email\n- A wrong password is refused\n\n## Seal\n\n## Review\n${review}\n\n## Release\n${release}\n`;

test('a seal holds until a sealed file changes, vanishes or gains a neighbour', () => {
  const root = project();
  seal(root, item, ['tests/sealed']);
  assert.deepEqual(check(root, item).problems, []);
  fs.writeFileSync(path.join(root, 'tests', 'sealed', 'a.test.js'), 'assert(true)\n');
  assert.match(check(root, item).problems[0], /^changed: tests\/sealed\/a\.test\.js/);
  seal(root, item, ['tests/sealed']);
  fs.writeFileSync(path.join(root, 'tests', 'sealed', 'b.test.js'), 'x\n');
  assert.match(check(root, item).problems[0], /^added after the seal/);
  fs.rmSync(path.join(root, 'tests', 'sealed', 'b.test.js'));
  fs.rmSync(path.join(root, 'tests', 'sealed', 'a.test.js'));
  assert.match(check(root, item).problems[0], /^gone/);
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

test('the gate walks an item from tests to done, and stops on a broken seal', () => {
  const root = project();
  write(root, ITEM());
  assert.equal(canStart(root, item, 'tests').ok, true);
  assert.equal(state(root, item).next, 'tests');
  assert.match(canStart(root, item, 'build').reasons[0], /not sealed/);
  seal(root, item, ['tests/sealed']);
  assert.equal(canStart(root, item, 'build').ok, true);
  assert.equal(state(root, item).next, 'build');
  fs.writeFileSync(path.join(root, item, '3-build.md'), 'built\n');
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
