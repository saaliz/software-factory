// node --test init.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { install, plan, PLUGIN } from './init.mjs';

const fresh = () => fs.mkdtempSync(path.join(os.tmpdir(), 'factory-init-'));
const run = (cwd, ...args) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });

test('a fresh install writes the entry files, the skills, the methods and the tools', () => {
  const target = fresh();
  const { written, kept } = install(target);
  assert.equal(kept.length, 0);
  assert.equal(written.length, plan().length);
  for (const f of ['AGENTS.md', 'CLAUDE.md', 'factory/tools/gate.mjs', 'factory/tools/seal.mjs', 'factory/tools/tokens.mjs', 'factory/methods/every-step.md', 'factory/methods/throughput.md',
    'factory/council/SEATS.md', 'factory/decisions/README.md', 'work/README.md', 'work/.gitignore', '.claude/skills/council/SKILL.md', '.claude/skills/factory-build/SKILL.md']) {
    assert.ok(fs.existsSync(path.join(target, f)), f);
  }
  assert.ok(!written.some((f) => f.endsWith('.test.mjs')), 'the kit keeps its own tests');
});

test('a second install changes nothing, and an existing AGENTS.md is kept', () => {
  const target = fresh();
  fs.writeFileSync(path.join(target, 'AGENTS.md'), 'mine\n');
  const first = install(target);
  assert.deepEqual(first.kept, ['AGENTS.md']);
  assert.equal(fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8'), 'mine\n');
  const second = install(target);
  assert.equal(second.written.length, 0);
  assert.equal(second.kept.length, plan().length);
});

test('a dry run writes nothing', () => {
  const target = fresh();
  assert.equal(install(target, { dryRun: true }).written.length, plan().length);
  assert.deepEqual(fs.readdirSync(target), []);
});

test('every file a skill or the entry file points to is installed', () => {
  const target = fresh();
  install(target);
  const texts = plan().map(([to]) => to).filter((f) => f.endsWith('.md')).map((f) => [f, fs.readFileSync(path.join(target, f), 'utf8')]);
  const missing = [];
  for (const [f, text] of texts) {
    for (const m of text.matchAll(/`((?:factory|\.claude)\/[A-Za-z0-9_./-]+\.(?:md|mjs))`/g)) {
      if (!fs.existsSync(path.join(target, m[1]))) missing.push(`${f} -> ${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('the installed tools walk one work item from the unfilled form to done', () => {
  const target = fresh();
  install(target);
  const item = path.join(target, 'work', '01-sign-in');
  fs.mkdirSync(item, { recursive: true });
  fs.copyFileSync(path.join(target, 'factory', 'item.md'), path.join(item, 'item.md'));
  const gate = (...a) => run(target, 'factory/tools/gate.mjs', 'work/01-sign-in', ...a);
  let r = gate('--can-start', 'tests');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no criteria/);

  const fill = (review, release) => fs.writeFileSync(path.join(item, 'item.md'),
    `# Sign in\n\n## Criteria\n\n- A teacher signs in with her email\n\n## Seal\n\n## Review\n\n${review}\n\n## Release\n\n${release}\n`);
  fill('<!-- empty -->', '<!-- empty -->');
  assert.match(gate('--can-start', 'tests').stdout, /tests may start/);
  assert.equal(gate('--can-start', 'build').status, 1);

  fs.mkdirSync(path.join(target, 'tests', 'sealed'), { recursive: true });
  fs.writeFileSync(path.join(target, 'tests', 'sealed', 'sign-in.test.js'), 'assert(signIn())\n');
  assert.match(run(target, 'factory/tools/seal.mjs', 'work/01-sign-in', 'tests/sealed').stdout, /sealed 1 files/);
  assert.match(gate('--can-start', 'build').stdout, /build may start/);
  assert.match(gate('--can-start', 'review').stdout, /review may start/);
  assert.equal(gate('--can-start', 'release').status, 1);
  assert.match(gate().stdout, /next: build/);
  fs.writeFileSync(path.join(item, '3-build.md'), 'built\n');
  assert.match(gate().stdout, /next: review/);

  fill('clear', '<!-- empty -->');
  assert.match(gate('--can-start', 'release').stdout, /release may start/);
  fill('clear', 'Version: v0.1.0');
  assert.match(gate().stdout, /next: done/);

  fs.writeFileSync(path.join(target, 'tests', 'sealed', 'sign-in.test.js'), 'assert(true)\n');
  r = run(target, 'factory/tools/seal.mjs', 'work/01-sign-in', '--check');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /changed: tests\/sealed\/sign-in\.test\.js/);
  assert.equal(gate().status, 1);
});

// The harness profile.
const guard = path.join(path.dirname(fileURLToPath(import.meta.url)), 'harness', 'plugin', 'hooks', 'guard.mjs');

test('the harness profile installs the light one and the harness, and the light profile installs no harness file', () => {
  const target = fresh();
  const { written, kept } = install(target, { profile: 'harness' });
  assert.equal(kept.length, 0);
  assert.equal(written.length, plan({ profile: 'harness' }).length);
  for (const f of ['AGENTS.md', 'factory/tools/gate.mjs', 'factory/harness.json', 'factory/harness/super-rules.md', 'factory/harness/lane-brief.md',
    'factory/harness/lane-handover.md', 'factory/harness/briefs/sealed-tests.md', 'factory/harness/briefs/build.md', 'factory/harness/briefs/review.md',
    'factory/tools/slots.mjs', 'factory/tools/side-by-side.mjs', 'factory/tools/throughput.mjs', 'factory/tools/waits.mjs', 'factory/tools/sources.mjs', 'factory/council/process-change.md', 'factory/methods/throughput.md', 'factory/methods/nobody-waits.md', 'factory/tools/heartbeat.mjs', 'factory/tools/claim-super.mjs', 'factory/records/.gitignore', '.claude/settings.json']) {
    assert.ok(fs.existsSync(path.join(target, f)), f);
  }
  assert.ok(!written.some((f) => f.endsWith('.test.mjs')));
  const cfg = JSON.parse(fs.readFileSync(path.join(target, 'factory', 'harness.json'), 'utf8'));
  assert.deepEqual(Object.keys(cfg.sources), ['product', 'design', 'architecture', 'decisions']);
  assert.deepEqual(Object.keys(cfg.hooks), ['sealedTests', 'mainBranch', 'ciThroughSlot', 'forbiddenPaths', 'largeContext']);
  const settings = JSON.parse(fs.readFileSync(path.join(target, '.claude', 'settings.json'), 'utf8'));
  assert.equal(settings.enabledPlugins[PLUGIN], true);
  assert.equal(settings.extraKnownMarketplaces['software-factory'].source.source, 'directory');
  assert.ok(!plan().some(([to]) => to.startsWith('factory/harness')));
});

test('a harness install never overwrites: an existing settings.json is kept, and a second install writes nothing', () => {
  const target = fresh();
  fs.mkdirSync(path.join(target, '.claude'));
  fs.writeFileSync(path.join(target, '.claude', 'settings.json'), '{"mine":true}\n');
  install(target);
  const r = run(target, path.join(path.dirname(guard), '..', '..', '..', 'init.mjs'), '.', '--profile', 'harness', '--marketplace', 'someone/factory');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /settings\.json was already there[\s\S]*"repo": "someone\/factory"/);
  assert.equal(fs.readFileSync(path.join(target, '.claude', 'settings.json'), 'utf8'), '{"mine":true}\n');
  const again = install(target, { profile: 'harness' });
  assert.equal(again.written.length, 0);
});

test('an unknown profile, or the kit itself as the target, is refused', () => {
  assert.throws(() => plan({ profile: 'heavy' }), /unknown profile/);
  const kit = path.dirname(path.dirname(path.dirname(path.dirname(guard))));
  assert.throws(() => install(kit, { profile: 'harness', dryRun: true }), /the kit itself/);
  assert.equal(run(fresh(), path.join(kit, 'init.mjs'), '.', '--profile', 'heavy').status, 2);
});

test('every file a harness template, agent or skill points to is installed, or is a record the super creates', () => {
  const target = fresh();
  install(target, { profile: 'harness' });
  const kit = path.dirname(path.dirname(path.dirname(path.dirname(guard))));
  const plugin = path.join(kit, 'harness', 'plugin');
  const texts = plan({ profile: 'harness' }).map(([to]) => to).filter((f) => f.endsWith('.md')).map((f) => [f, fs.readFileSync(path.join(target, f), 'utf8')]);
  for (const d of ['agents', 'skills']) {
    for (const f of fs.readdirSync(path.join(plugin, d), { recursive: true }).filter((n) => n.endsWith('.md'))) texts.push([`plugin/${d}/${f}`, fs.readFileSync(path.join(plugin, d, f), 'utf8')]);
  }
  const missing = [];
  for (const [f, text] of texts) {
    for (const m of text.matchAll(/`((?:factory|\.claude)\/[A-Za-z0-9_./-]+\.(?:md|mjs|json))`/g)) {
      if (!m[1].startsWith('factory/records/') && !fs.existsSync(path.join(target, m[1]))) missing.push(`${f} -> ${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('both profiles install an importable affected planner with valid fail-closed mappings and its method', t => {
  for (const profile of ['light', 'harness']) {
    const target = fresh(); t.after(() => fs.rmSync(target, { recursive: true, force: true }));
    install(target, { profile });
    assert.ok(fs.existsSync(path.join(target, 'factory/methods/affected-testing.md')));
    assert.ok(fs.existsSync(path.join(target, 'factory/tools/affected-node-reporter.mjs')));
    const registry = JSON.parse(fs.readFileSync(path.join(target, 'factory/affected.json'), 'utf8'));
    assert.deepEqual(registry, { version: 1, targets: [], contracts: [], areas: [], records: [] });
    const example = JSON.parse(fs.readFileSync(path.join(target, 'factory/affected.example.json'), 'utf8'));
    const tool = pathToFileURL(path.join(target, 'factory/tools/affected.mjs')).href;
    fs.writeFileSync(path.join(target, 'probe.test.mjs'), "import test from 'node:test'; test('installed reporter discovers a real test', () => {});\n");
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', 'const m = await import(process.argv[1]); m.validateRegistry(JSON.parse(process.argv[2])); m.validateRegistry(JSON.parse(process.argv[3])); const r = m.nodeResult(m.runNode(process.cwd(), { file: "probe.test.mjs" }), process.argv[4]); if (r.status !== "passed" || r.total !== 1) throw new Error(JSON.stringify(r)); console.log(m.SCOPE)', tool, JSON.stringify(registry), JSON.stringify(example), path.join(target, 'probe.test.mjs')], { cwd: target, env, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /affected-only; full\/E2E not run/);
    assert.equal(run(target, 'factory/tools/affected.mjs', 'plan').status, 1);
  }
});

test('a profile upgrade preserves project-owned affected mappings and tools byte for byte', t => {
  const target = fresh(); t.after(() => fs.rmSync(target, { recursive: true, force: true }));
  install(target);
  const owned = ['factory/affected.json', 'factory/affected.example.json', 'factory/tools/affected.mjs', 'factory/tools/affected-node-reporter.mjs', 'factory/methods/affected-testing.md'];
  for (const file of owned) fs.writeFileSync(path.join(target, file), `project owns ${file}\n`);
  const result = install(target, { profile: 'harness' });
  for (const file of owned) {
    assert.ok(result.kept.includes(file), file);
    assert.equal(fs.readFileSync(path.join(target, file), 'utf8'), `project owns ${file}\n`);
  }
  assert.equal(install(target, { profile: 'harness' }).written.length, 0);
});

test('installed, the harness guard refuses an edit to a test the installed seal sealed', () => {
  const target = fresh();
  install(target, { profile: 'harness' });
  const item = path.join(target, 'work', 'lane-a', '01-sign-in');
  fs.mkdirSync(item, { recursive: true });
  fs.mkdirSync(path.join(target, 'tests', 'sealed'), { recursive: true });
  fs.writeFileSync(path.join(target, 'tests', 'sealed', 'sign-in.test.js'), 'assert(signIn())\n');
  assert.equal(run(target, 'factory/tools/seal.mjs', 'work/lane-a/01-sign-in', 'tests/sealed').status, 0);
  const hook = (tool_input) => spawnSync(process.execPath, [guard, 'pre'], { input: JSON.stringify({ tool_name: 'Edit', tool_input, cwd: target, session_id: 's' }), encoding: 'utf8' }).stdout;
  assert.match(hook({ file_path: 'tests/sealed/sign-in.test.js' }), /"permissionDecision":"deny"/);
  assert.match(hook({ file_path: 'tests/sealed/new.test.js' }), /"permissionDecision":"deny"/, 'a new file in a sealed folder');
  assert.equal(hook({ file_path: 'src/sign-in.js' }), '');
});
