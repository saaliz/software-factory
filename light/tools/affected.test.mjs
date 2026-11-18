// Synthetic repositories exercise exact selection and refusal boundaries; no project services or SDK needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { affectedPlan, executeAffected, nodeResult, parseArgs, REGISTRY, validateRegistry, verifyPlan } from './affected.mjs';

const cli = fileURLToPath(new URL('./affected.mjs', import.meta.url));
const source = 'src/provider.mjs', unit = 'tests/provider.test.mjs', contract = 'tests/consumer.test.mjs';
const summary = (pass = 1, total = 1, extra = {}, file = path.resolve('tests/fixture.test.mjs'), counts = {}) => {
  const data = { success: pass === total, counts: { tests: total, passed: pass, failed: total - pass, cancelled: 0, skipped: 0, todo: 0, suites: 0, ...counts } };
  const events = Array.from({ length: total }, (_, i) => ({ type: i < pass ? 'test:pass' : 'test:fail', data: { name: `test ${i}`, file, line: 1, column: 2, nesting: 0, details: { type: 'test' } } }));
  return { code: 0, stdout: [...events, { type: 'test:summary', data: { ...data, file } }, { type: 'test:summary', data }].map(e => JSON.stringify(e)).join('\n') + '\n', ...extra };
};
const empty = () => ({ version: 1, targets: [], contracts: [], areas: [], records: [] });
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-affected-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
  };
  const put = (file, text) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), text); };
  git('init', '-q'); git('config', 'user.email', 'fixture@example.invalid'); git('config', 'user.name', 'Synthetic fixture'); git('config', 'core.autocrlf', 'false');
  const registry = { ...empty(), targets: [
    { id: 'provider', kind: 'node', classification: 'unit', file: unit },
    { id: 'consumer', kind: 'node', classification: 'direct-contract', file: contract },
    { id: 'tool', kind: 'node', classification: 'tooling', file: 'tests/registry.test.mjs' },
  ], contracts: [{ id: 'consumer-contract', description: 'The direct consumer receives the provider shape.', targets: ['consumer'] }],
  areas: [{ id: 'control', reason: 'Registry changes rerun the focused selection regression.', paths: [{ exact: REGISTRY }], targets: ['tool'], contracts: [] }] };
  const save = () => put(REGISTRY, JSON.stringify(registry));
  put('.gitignore', 'work/*/tmp/\n'); put(source, 'export const value = 1;\n');
  put(unit, "import test from 'node:test'; import assert from 'node:assert/strict'; import { value } from '../src/provider.mjs'; test('provider value is a number', () => assert.equal(typeof value, 'number'));\n");
  put(contract, "import test from 'node:test'; import assert from 'node:assert/strict'; import { value } from '../src/provider.mjs'; test('direct consumer accepts provider', () => assert.ok(value > 0));\n");
  put('tests/registry.test.mjs', "import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; test('registry version', () => assert.equal(JSON.parse(fs.readFileSync('factory/affected.json')).version, 1));\n");
  const commit = () => { save(); git('add', '-A'); git('commit', '-qm', 'fixture'); return git('rev-parse', 'HEAD'); };
  const base = commit();
  const bind = (file, targets = ['provider'], contracts = ['consumer-contract'], from = base) => {
    const before = spawnSync('git', ['rev-parse', '--verify', `${from}:${file}`], { cwd: root, encoding: 'utf8' });
    registry.areas = registry.areas.filter(a => !a.paths.some(p => p.exact === file));
    registry.areas.push({ id: `area-${registry.areas.length}`, reason: `Reviewed exact ${file} change, including shared/deleted impact and surviving regression.`,
      paths: [{ exact: file, before: before.status === 0 ? before.stdout.trim() : null, after: fs.existsSync(path.join(root, file)) ? git('hash-object', file) : null }], targets, contracts });
  };
  const change = () => { put(source, 'export const value = 2;\n'); bind(source); return commit(); };
  return { root, git, put, registry, save, commit, base, bind, change };
}

test('exact provider change selects its regression and direct contract, preserving all reasons', t => {
  const f = fixture(t), head = f.change(), p = affectedPlan(f.root, { base: f.base, head });
  assert.deepEqual(p.targets.map(x => x.id), ['consumer', 'provider', 'tool']);
  assert.deepEqual(p.targets[0].reasons, [{ changedPath: source, area: 'area-1', contract: 'consumer-contract', reason: 'The direct consumer receives the provider shape.' }]);
  assert.match(p.scope, /affected-only; full\/E2E not run/); assert.equal(p.head.length, 40); assert.equal(p.registryHash.length, 64); assert.equal(p.implementationHash.length, 64);
});
test('unknown code and a changed Node test do not silently select passing survivors', t => {
  const f = fixture(t); f.put(source, 'export const value = 2;\n'); f.put(unit, "import test from 'node:test'; test('survivor', () => {});\n");
  assert.throws(() => affectedPlan(f.root, { base: f.base, head: f.commit() }), /no affected mapping/);
});
test('helper changes with stale reviewed blob bindings refuse even when all selected tests survive', t => {
  const f = fixture(t), head = f.change(); f.put(source, 'export const value = 3; // changed shared helper\n');
  assert.throws(() => affectedPlan(f.root, { base: f.base, head: f.commit() }), /stale mapping.*observed before=.*after=/);
  // The same registry binding is not reusable for a different base, either.
  assert.throws(() => affectedPlan(f.root, { base: head, head: f.git('rev-parse', 'HEAD') }), /stale mapping/);
});
test('deleting a test requires a reviewed blob-bound surviving replacement', t => {
  const f = fixture(t); f.git('rm', unit); const head = f.commit();
  assert.throws(() => affectedPlan(f.root, { base: f.base, head }), /deleted\/renamed tests need explicit surviving replacements/);
  f.bind(unit, ['consumer'], []); const p = affectedPlan(f.root, { base: f.base, head: f.commit() });
  assert.ok(p.targets.some(x => x.id === 'consumer')); assert.ok(!p.targets.some(x => x.id === 'provider'));
});
test('removing a test inside a surviving file requires a new exact mapping', t => {
  const f = fixture(t); f.put(unit, "import test from 'node:test'; test('survives', () => {});\n"); f.bind(unit); const head = f.commit();
  f.put(unit, "// removed test; passing contract still exists\n");
  assert.throws(() => affectedPlan(f.root, { base: head, head: f.commit() }), /stale mapping/);
});
test('renames retain both names and neither inherits an unreviewed mapping', t => {
  const f = fixture(t); f.git('mv', source, 'src/renamed.mjs'); f.bind(source);
  assert.throws(() => affectedPlan(f.root, { base: f.base, head: f.commit() }), /src\/renamed.mjs: no affected mapping/);
  f.bind('src/renamed.mjs'); const p = affectedPlan(f.root, { base: f.base, head: f.commit() });
  assert.ok(p.changedPaths.includes(source)); assert.ok(p.changedPaths.includes('src/renamed.mjs'));
  assert.deepEqual(p.targets.find(x => x.id === 'provider').reasons.map(x => x.changedPath), [source, 'src/renamed.mjs']);
});
test('deduplicated exact targets retain every changed input reason', t => {
  const f = fixture(t); f.put(source, 'export const value = 2;\n'); f.put('src/helper.mjs', '// new helper\n'); f.bind(source); f.bind('src/helper.mjs');
  const p = affectedPlan(f.root, { base: f.base, head: f.commit() });
  assert.equal(p.targets.filter(x => x.id === 'provider').length, 1);
  assert.equal(p.targets.find(x => x.id === 'provider').reasons.length, 2);
});
test('missing selected targets refuse planning', t => {
  const f = fixture(t); f.put(source, 'export const value = 2;\n'); f.bind(source); f.git('rm', unit); f.bind(unit);
  assert.throws(() => affectedPlan(f.root, { base: f.base, head: f.commit() }), /target provider missing/);
});
test('symlink and submodule changes cannot masquerade as reviewed regular file blobs', t => {
  for (const mode of ['120000', '160000']) {
    const f = fixture(t); f.change();
    const object = mode === '120000' ? f.git('hash-object', source) : f.base;
    f.git('update-index', '--cacheinfo', `${mode},${object},${source}`); f.git('commit', '-qm', 'unsupported object');
    assert.throws(() => affectedPlan(f.root, { base: f.base, head: f.git('rev-parse', 'HEAD') }), /unsupported Git object\/mode/);
  }
});
test('broad, shell, unsupported adapters, unknown fields and ambiguous declarations are refused', t => {
  const f = fixture(t);
  for (const mutate of [
    r => r.targets[0].file = 'tests/*.test.mjs', r => r.targets[0].file = '../escape.test.mjs',
    r => r.targets[0].kind = 'xunit', r => r.targets[0].classification = 'e2e',
    r => r.targets[0].command = 'npm test', r => r.targets[0].args = ['--all'], r => r.targets.push({ ...r.targets[0] }),
    r => r.targets[0].id = '', r => r.contracts[0].targets = ['provider'], r => r.areas[0].reason = '',
    r => r.areas[0].paths = [{ prefix: 'src/' }], r => r.areas[0].targets = [], r => r.areas[0].contracts = ['unknown'],
    r => r.areas[0].paths = [{ exact: source, before: null, after: null }],
    r => r.areas[0].paths = [{ exact: source, before: 'a'.repeat(40) }],
    r => r.areas[0].paths = [{ exact: REGISTRY, before: null, after: 'a'.repeat(40) }],
    r => r.records.push({ exact: source, review: 'not a document' }),
    r => r.records.push({ exact: 'notes.md', review: '' }),
  ]) { const r = structuredClone(f.registry); mutate(r); assert.throws(() => validateRegistry(r), /registry:/); }
});
test('empty installed mappings fail closed on code; records and empty diffs never report runtime proof', t => {
  const f = fixture(t); Object.assign(f.registry, empty()); f.put(source, 'export const value = 2;\n');
  assert.throws(() => affectedPlan(f.root, { base: f.base, head: f.commit() }), /no affected mapping/);
  const g = fixture(t); g.registry.records = [{ exact: 'notes.md', review: 'Read against the product requirements.' }]; const base = g.commit();
  g.put('notes.md', 'A reviewed record.\n'); const p = affectedPlan(g.root, { base, head: g.commit() });
  assert.equal(p.targets.length, 0); assert.match(p.outcome, /no runtime proof/); assert.equal(executeAffected(g.root, p).allPassed, false);
  const none = affectedPlan(g.root, { base: p.head, head: p.head }); assert.match(none.outcome, /no tracked changes; no runtime proof/);
});
test('a record cannot hide an explicitly mapped stale code/document change', t => {
  const f = fixture(t); f.put('notes.md', 'v1'); f.bind('notes.md'); const head = f.commit();
  f.registry.records.push({ exact: 'notes.md', review: 'Static only' }); f.put('notes.md', 'v2');
  assert.throws(() => affectedPlan(f.root, { base: head, head: f.commit() }), /stale mapping/);
});
test('run consumes the exact pinned plan and refuses drift, dirty and untracked inputs', t => {
  const f = fixture(t), p = affectedPlan(f.root, { base: f.base, head: f.change() }); assert.doesNotThrow(() => verifyPlan(f.root, p));
  for (const changed of [{ ...p, targets: [] }, { ...p, registryHash: '0'.repeat(64) }, { ...p, implementationHash: '0'.repeat(64) }]) assert.throws(() => verifyPlan(f.root, changed), /does not match/);
  f.put(source, 'dirty'); assert.throws(() => verifyPlan(f.root, p), /clean HEAD/); f.git('checkout', '--', source);
  f.put('unknown.mjs', 'untracked'); assert.throws(() => verifyPlan(f.root, p), /clean HEAD/); f.git('add', '.'); f.git('commit', '-qm', 'drift');
  assert.throws(() => verifyPlan(f.root, p), /HEAD drift/);
});
test('post-run input mutation invalidates otherwise passing evidence', t => {
  const f = fixture(t), p = affectedPlan(f.root, { base: f.base, head: f.change() });
  const result = executeAffected(f.root, p, { runTarget: (root, target) => { f.put(source, 'mutation'); return summary(1, 1, {}, path.resolve(root, target.file)); } });
  assert.equal(result.allPassed, false); assert.match(result.pinError, /clean HEAD/);
});
test('every selected target runs after failures and exceptions; no broader command is invoked', t => {
  const f = fixture(t), p = affectedPlan(f.root, { base: f.base, head: f.change() }), called = [];
  const r = executeAffected(f.root, p, { runTarget: (root, target) => {
    assert.equal(root, f.root); called.push(target.id);
    if (target.id === 'provider') throw new Error('runner unavailable');
    return summary(target.id === 'consumer' ? 0 : 1, 1, {}, path.resolve(root, target.file));
  } });
  assert.deepEqual(called, ['consumer', 'provider', 'tool']); assert.equal(r.allPassed, false);
  assert.deepEqual(r.results.map(x => x.status), ['failed', 'not run', 'passed']);
});
test('Node discovery refuses zero, missing, partial, duplicate, skipped, todo, cancellation and nonzero exit evidence', () => {
  for (const r of [summary(0, 0), { code: 0, stdout: '' }, { code: 0, stdout: '# tests 1\n# pass 1\n' },
    summary(1, 1, { code: 1 }), summary(1, 1, { error: 'spawn failed' }),
    ...['cancelled', 'skipped', 'todo'].map(x => summary(1, 1, {}, undefined, { [x]: 1 })),
    { code: 0, stdout: summary().stdout + summary().stdout },
  ]) assert.notEqual(nodeResult(r).status, 'passed');
  assert.equal(nodeResult(summary()).status, 'passed');
  assert.notEqual(nodeResult(summary(), path.resolve('tests/different.test.mjs')).status, 'passed');
});
test('CLI accepts only immutable base plans and exact saved-plan runs', t => {
  assert.deepEqual(parseArgs(['plan', '--base', '1234567']), { mode: 'plan', base: '1234567' });
  assert.deepEqual(parseArgs(['run', '--plan', 'work/repair/tmp/plan.json']), { mode: 'run', plan: 'work/repair/tmp/plan.json' });
  for (const args of [[], ['run'], ['plan'], ['plan', '--base'], ['plan', '--base', '1234567', '--all'], ['plan', '--base', 'a', '--base', 'b'], ['run', '--plan', 'a', '--units'], ['plan', '--base', 'a', '--run']]) assert.throws(() => parseArgs(args));
  const f = fixture(t); for (const base of ['HEAD', 'main', '--all']) assert.throws(() => affectedPlan(f.root, { base }), /immutable commit SHA/);
});
test('real Node CLI plans then runs only exact selected files and captures usable evidence', t => {
  const f = fixture(t), head = f.change();
  // A standalone CLI does not inherit the parent node:test worker's recursion marker.
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: f.root, env, encoding: 'utf8' });
  const planned = run('plan', '--base', f.base, '--head', head); assert.equal(planned.status, 0, planned.stderr);
  f.put('work/repair/tmp/plan.json', planned.stdout);
  const result = run('run', '--plan', 'work/repair/tmp/plan.json'); assert.equal(result.status, 0, result.stderr + result.stdout);
  const evidence = JSON.parse(result.stdout); assert.equal(evidence.allPassed, true); assert.equal(evidence.results.length, 3);
  assert.ok(evidence.results.every(x => x.total === 1 && x.passed === 1)); assert.match(evidence.scope, /full\/E2E not run/);
  assert.equal(evidence.runtime.kind, 'node'); assert.equal(f.git('status', '--porcelain'), '');
});
test('real CLI refuses empty/import-only test files despite Node passing its synthetic file placeholder', t => {
  for (const text of ['// no tests registered\n', "import '../src/provider.mjs';\n", "import { describe } from 'node:test'; describe('empty suite', () => {});\n"]) {
    const f = fixture(t); f.put(unit, text); f.bind(unit, ['provider'], []); const head = f.commit();
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
    const run = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: f.root, env, encoding: 'utf8' });
    const planned = run('plan', '--base', f.base, '--head', head); assert.equal(planned.status, 0, planned.stderr);
    f.put('work/repair/tmp/plan.json', planned.stdout);
    const result = run('run', '--plan', 'work/repair/tmp/plan.json'), evidence = JSON.parse(result.stdout);
    assert.equal(result.status, 1, 'an empty exact file must not be runtime proof');
    const provider = evidence.results.find(x => x.id === 'provider');
    assert.equal(provider.code, 0, provider.stderr); assert.match(provider.stdout, /"type":"test:summary"/);
    assert.equal(evidence.allPassed, false); assert.equal(provider.status, 'not run'); assert.equal(provider.total, 0); assert.deepEqual(provider.tests, []);
  }
});
test('real exact-file discovery preserves named tests and nested subtests and refuses skips/failures', t => {
  for (const [text, ok, total] of [
    ["import test from 'node:test'; test('tests/provider.test.mjs', () => {});\n", true, 1],
    ["import test from 'node:test'; test('parent', async t => { await t.test('child', () => {}); });\n", true, 2],
    ["import { describe, it } from 'node:test'; describe('suite', () => { it('nested real test', () => {}); });\n", true, 1],
    ["import test from 'node:test'; test.skip('skipped', () => {});\n", false, 1],
    ["import test from 'node:test'; test('failure', () => { throw new Error('expected failing regression'); });\n", false, 1],
  ]) {
    const f = fixture(t); f.put(unit, text); f.bind(unit, ['provider'], []); const head = f.commit();
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
    const run = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: f.root, env, encoding: 'utf8' });
    const planned = run('plan', '--base', f.base, '--head', head); assert.equal(planned.status, 0, planned.stderr);
    f.put('work/repair/tmp/plan.json', planned.stdout);
    const result = run('run', '--plan', 'work/repair/tmp/plan.json'), evidence = JSON.parse(result.stdout);
    assert.equal(result.status, ok ? 0 : 1, result.stdout + result.stderr); assert.equal(evidence.allPassed, ok);
    const provider = evidence.results.find(x => x.id === 'provider'); assert.equal(provider.total, total);
    assert.equal(provider.tests.length, total); assert.ok(provider.tests.every(x => x.name && x.file && x.line > 0));
  }
});
test('changing the bundled reporter invalidates a saved plan even when the project tree stays clean', async t => {
  const f = fixture(t), head = f.change(), runner = 'work/repair/tmp/runner';
  f.put(`${runner}/affected.mjs`, fs.readFileSync(cli, 'utf8'));
  f.put(`${runner}/affected-node-reporter.mjs`, fs.readFileSync(new URL('./affected-node-reporter.mjs', import.meta.url), 'utf8'));
  const copied = await import(pathToFileURL(path.join(f.root, runner, 'affected.mjs')).href);
  const p = copied.affectedPlan(f.root, { base: f.base, head }); assert.doesNotThrow(() => copied.verifyPlan(f.root, p));
  f.put(`${runner}/affected-node-reporter.mjs`, '// changed reporter transport\n');
  assert.equal(f.git('status', '--porcelain'), ''); assert.throws(() => copied.verifyPlan(f.root, p), /implementation; regenerate plan/);
});
