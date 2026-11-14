// node --test init.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { install, plan } from './init.mjs';

const fresh = () => fs.mkdtempSync(path.join(os.tmpdir(), 'factory-init-'));
const run = (cwd, ...args) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });

test('a fresh install writes the entry files, the skills, the methods and the tools', () => {
  const target = fresh();
  const { written, kept } = install(target);
  assert.equal(kept.length, 0);
  assert.equal(written.length, plan().length);
  for (const f of ['AGENTS.md', 'CLAUDE.md', 'factory/tools/gate.mjs', 'factory/tools/seal.mjs', 'factory/tools/tokens.mjs', 'factory/methods/every-step.md',
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
