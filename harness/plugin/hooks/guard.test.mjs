// node --test harness/plugin/hooks/guard.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pre, post, touchesMain, sealedPaths, contextTokens, isOn } from './guard.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fresh = () => fs.mkdtempSync(path.join(os.tmpdir(), 'factory-guard-'));
const base = { mainBranch: 'main', work: 'work', ciPattern: 'scripts/ci\\.mjs', forbiddenPaths: ['private', 'C:/elsewhere/secret'], hooks: {} };

function project(config = base) {
  const root = fresh();
  fs.mkdirSync(path.join(root, 'factory'), { recursive: true });
  fs.writeFileSync(path.join(root, 'factory', 'harness.json'), JSON.stringify(config));
  const item = path.join(root, 'work', 'lane-a', '01-sign-in');
  fs.mkdirSync(item, { recursive: true });
  fs.writeFileSync(path.join(item, 'seal.json'), JSON.stringify({ roots: ['tests/sealed/sign-in'], files: { 'tests/sealed/sign-in/a.test.js': 'x', 'tests/other.test.js': 'y' } }));
  return root;
}
const ctxOf = (root, extra = {}) => ({ root, config: JSON.parse(fs.readFileSync(path.join(root, 'factory', 'harness.json'), 'utf8')), env: {}, branch: () => 'feature', readClaim: () => null, ...extra });
const call = (root, tool, tool_input, more = {}) => ({ tool_name: tool, tool_input, cwd: root, session_id: 'lane-1', ...more });

test('an edit to a sealed file, or to a new file in a sealed folder, is refused; other edits pass', () => {
  const root = project();
  const ctx = ctxOf(root);
  assert.match(pre(call(root, 'Edit', { file_path: path.join(root, 'tests', 'sealed', 'sign-in', 'a.test.js') }), ctx).deny, /sealed test/);
  assert.match(pre(call(root, 'Write', { file_path: 'tests/sealed/sign-in/new.test.js' }), ctx).deny, /sealed test/);
  assert.match(pre(call(root, 'MultiEdit', { file_path: 'tests\\other.test.js' }), ctx).deny, /sealed test/);
  assert.deepEqual(pre(call(root, 'Edit', { file_path: 'src/sign-in.js' }), ctx), {});
  assert.deepEqual(pre(call(root, 'Read', { file_path: 'tests/other.test.js' }), ctx), {});
});

test('a shell command that writes a sealed file is refused; one that only reads it passes', () => {
  const root = project();
  const ctx = ctxOf(root);
  assert.ok(pre(call(root, 'Bash', { command: "sed -i 's/a/b/' tests/other.test.js" }), ctx).deny);
  assert.ok(pre(call(root, 'Bash', { command: 'echo x > tests/sealed/sign-in/a.test.js' }), ctx).deny);
  assert.ok(pre(call(root, 'Bash', { command: 'git checkout -- tests/other.test.js' }), ctx).deny);
  assert.deepEqual(pre(call(root, 'Bash', { command: 'node --test tests/sealed/sign-in' }), ctx), {});
});

test('sealedPaths reads every seal under the work folder', () => {
  const s = sealedPaths(project(), base);
  assert.ok(s.files.has('tests/other.test.js'));
  assert.deepEqual(s.roots, ['tests/sealed/sign-in']);
});

test('touchesMain finds merges into and pushes to the main branch, and nothing else', () => {
  assert.match(touchesMain('git merge candidate/a-p01', 'main', 'main'), /merge on main/);
  assert.match(touchesMain('git checkout main && git merge x', 'feature', 'main'), /merge on main/);
  assert.match(touchesMain('git push origin main', 'feature', 'main'), /push to main/);
  assert.match(touchesMain('git push origin HEAD:refs/heads/main', 'feature', 'main'), /push to main/);
  assert.match(touchesMain('git push', 'main', 'main'), /push from main/);
  assert.match(touchesMain('git push --force origin +main', 'x', 'main'), /push to main/);
  assert.match(touchesMain('gh pr merge 12 --squash', 'x', 'main'), /gh pr merge/);
  assert.equal(touchesMain('git merge main', 'feature', 'main'), null, 'merging main into a branch is fine');
  assert.equal(touchesMain('git push origin build/a-p01', 'main', 'main'), null);
  assert.equal(touchesMain('git checkout -b main-fix && git merge x', 'main', 'main') === null, false, 'still on main until a plain switch');
  assert.equal(touchesMain('git switch build/x && git merge main', 'main', 'main'), null);
  assert.equal(touchesMain('git merge --abort', 'main', 'main'), null);
});

test('only the super, by its claim or FACTORY_ROLE=super, may merge into main', () => {
  const root = project();
  const merge = call(root, 'Bash', { command: 'git merge candidate/a' });
  const onMain = { branch: () => 'main' };
  assert.match(pre(merge, ctxOf(root, onMain)).deny, /only the super/);
  assert.deepEqual(pre(merge, ctxOf(root, { ...onMain, readClaim: () => ({ session: 'lane-1' }) })), {});
  assert.deepEqual(pre(merge, ctxOf(root, { ...onMain, env: { FACTORY_ROLE: 'super' } })), {});
  let claimed = null;
  assert.deepEqual(pre(call(root, 'Bash', { command: 'node factory/tools/claim-super.mjs' }), ctxOf(root, { claim: (s) => { claimed = s; } })), {});
  assert.equal(claimed, 'lane-1');
});

test('CI outside the slot script is refused, through it passes', () => {
  const root = project();
  const ctx = ctxOf(root);
  assert.match(pre(call(root, 'Bash', { command: 'node scripts/ci.mjs work/a/01' }), ctx).deny, /slots\.mjs ci --label/);
  assert.deepEqual(pre(call(root, 'Bash', { command: 'node factory/tools/slots.mjs ci --label p01 -- node scripts/ci.mjs work/a/01' }), ctx), {});
});

test('a forbidden path is refused to every tool, written relative or absolute', () => {
  const root = project();
  const ctx = ctxOf(root);
  assert.match(pre(call(root, 'Read', { file_path: path.join(root, 'private', 'x.md') }), ctx).deny, /forbidden/);
  assert.ok(pre(call(root, 'Grep', { pattern: 'x', path: 'private' }), ctx).deny);
  assert.ok(pre(call(root, 'Bash', { command: 'cat private/notes.md' }), ctx).deny);
  assert.ok(pre(call(root, 'Bash', { command: 'ls C:\\elsewhere\\secret\\a' }), ctx).deny);
  assert.deepEqual(pre(call(root, 'Read', { file_path: 'src/x.js' }), ctx), {});
});

test('every guard has a switch in the config and in the environment', () => {
  const root = project({ ...base, hooks: { sealedTests: false } });
  assert.deepEqual(pre(call(root, 'Edit', { file_path: 'tests/other.test.js' }), ctxOf(root)), {});
  const root2 = project();
  assert.deepEqual(pre(call(root2, 'Bash', { command: 'node scripts/ci.mjs' }), ctxOf(root2, { env: { FACTORY_HOOK_CI: 'off' } })), {});
  assert.equal(isOn('mainBranch', {}, { FACTORY_HOOK_MAIN: 'OFF' }), false);
  assert.equal(isOn('largeContext', { hooks: { largeContext: true } }, {}), true);
});

function transcript(tokens) {
  const f = path.join(fresh(), 't.jsonl');
  fs.writeFileSync(f, [
    JSON.stringify({ type: 'user', message: { content: 'hi' } }),
    JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 10, cache_read_input_tokens: 100, cache_creation_input_tokens: 0 } } }),
    JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 2, cache_read_input_tokens: tokens - 2, cache_creation_input_tokens: 0 } } }),
  ].join('\n'));
  return f;
}

test('a large context warns once per step of the threshold', () => {
  const stateDir = fresh();
  const ctx = { config: { largeContextTokens: 1000 }, env: {}, stateDir };
  assert.equal(contextTokens(transcript(1500)), 1500);
  assert.deepEqual(post({ session_id: 's', transcript_path: transcript(900) }, ctx), {});
  assert.match(post({ session_id: 's', transcript_path: transcript(1500) }, ctx).context, /Large context: about 1,500/);
  assert.deepEqual(post({ session_id: 's', transcript_path: transcript(1700) }, ctx), {}, 'said once');
  assert.ok(post({ session_id: 's', transcript_path: transcript(2100) }, ctx).message, 'said again past twice the limit');
  assert.deepEqual(post({ session_id: 's', transcript_path: transcript(5000) }, { ...ctx, env: { FACTORY_HOOK_CONTEXT: 'off' } }), {});
});

test('run as a hook: a refusal is the documented JSON; a project with no harness.json is left alone', () => {
  const root = project();
  const run = (input, phase = 'pre') => spawnSync(process.execPath, [path.join(here, 'guard.mjs'), phase], { input: JSON.stringify(input), encoding: 'utf8' });
  const r = run(call(root, 'Edit', { file_path: 'tests/other.test.js' }));
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout).hookSpecificOutput;
  assert.equal(out.hookEventName, 'PreToolUse');
  assert.equal(out.permissionDecision, 'deny');
  assert.equal(run(call(fresh(), 'Edit', { file_path: 'tests/other.test.js' })).stdout, '');
  assert.equal(run({ cwd: root, session_id: 's', transcript_path: transcript(10) }, 'post').stdout, '');
});

test('hooks.json runs this script for both phases', () => {
  const h = JSON.parse(fs.readFileSync(path.join(here, 'hooks.json'), 'utf8')).hooks;
  assert.match(h.PreToolUse[0].hooks[0].command, /guard\.mjs" pre$/);
  assert.match(h.PostToolUse[0].hooks[0].command, /guard\.mjs" post$/);
  for (const t of ['Edit', 'Write', 'Read', 'Bash', 'Grep', 'Glob']) assert.ok(h.PreToolUse[0].matcher.split('|').includes(t), t);
});
