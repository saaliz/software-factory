// node --test harness/plugin/scripts/package.test.mjs
// One package's sealed tests, and the sweep before review reading 1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { plan, counts } from './package-tests.mjs';
import { sealedFile } from './merge-check.mjs';
import { sweep, markdown, wordKeys, duplicateWordKeys, unansweredAsEmpty, builtButDesigned } from './sweep.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
Object.assign(process.env, { GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.com' });
const fresh = () => fs.mkdtempSync(path.join(os.tmpdir(), 'factory-package-'));
const write = (root, rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
const git = (root, ...a) => spawnSync('git', a, { cwd: root, encoding: 'utf8' }).stdout.trim();

function repo(cfg) {
  const root = fresh();
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'core.autocrlf', 'false');
  write(root, 'factory/harness.json', JSON.stringify(cfg));
  write(root, 'work/a/01-pins/item.md', '# Pins\n');
  write(root, 'work/a/01-pins/seal.json', JSON.stringify({ roots: ['tests/pins'], files: { 'tests/pins/a.test.mjs': 'x' } }));
  write(root, 'tests/pins/a.test.mjs', "import test from 'node:test'; test('a pin is kept', () => {}); test('a pin is moved', () => {});\n");
  write(root, 'tests/other/b.test.mjs', "import test from 'node:test'; test('another package', () => { throw new Error('not mine'); });\n");
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'start');
  return root;
}

test("one package's tests: its sealed paths fill the command, and a command that would run the whole suite is refused", () => {
  const root = repo({ lanes: { alpha: 'a' } });
  const p = plan(root, { commands: { packageTests: 'node --test <tests>' }, lanes: { alpha: 'a' } }, 'work/a/01-pins');
  assert.deepEqual([p.command, p.label, p.lane], ['node --test tests/pins', 'a-01-pins-tests', 'a']);
  assert.throws(() => plan(root, { commands: { packageTests: 'node --test' } }, 'work/a/01-pins'), /would be the whole suite; refused/);
  assert.throws(() => plan(root, { commands: {} }, 'work/a/01-pins'), /commands\.packageTests/);
  assert.throws(() => plan(root, { commands: { packageTests: '<placeholder>' } }, 'work/a/01-pins'), /commands\.packageTests/);
  assert.throws(() => plan(root, { commands: { packageTests: 'node --test <tests>' } }, 'work/a/02-none'), /has no seal\.json/);
  assert.equal(plan(root, { commands: { packageTests: 'run <package>' } }, 'work/a/01-pins').command, 'run work/a/01-pins');
});

test("a test runner's summary is read for passed of total", () => {
  assert.deepEqual(counts('ℹ tests 3\nℹ pass 2\nℹ fail 1\n'), { passed: 2, failed: 1, total: 3 });
  assert.deepEqual(counts('# pass 5\n# fail 0\n'), { passed: 5, failed: 0, total: 5 });
  assert.equal(counts('nothing to read'), null);
});

test("run whole: the package's tests run in a heavy slot, only its own, and the record names the commit", () => {
  const root = repo({ commands: { packageTests: 'node --test "<tests>/*.test.mjs"' } });
  const env = { ...process.env, FACTORY_SLOTS: fresh(), FACTORY_SLOTS_ANY_COPY: '1' };
  delete env.FACTORY_HEAVY_SLOTS;
  delete env.NODE_TEST_CONTEXT; // the inner test run reports as its own, not to this one
  const r = spawnSync(process.execPath, [path.join(here, 'package-tests.mjs'), 'work/a/01-pins'], { cwd: root, env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /work\/a\/01-pins: green, 2 passed of 2/);
  const record = JSON.parse(fs.readFileSync(sealedFile(root, 'work/a/01-pins'), 'utf8'));
  assert.deepEqual([record.code, record.passed, record.total, record.commit], [0, 2, 2, git(root, 'rev-parse', 'HEAD')]);
  const [job] = fs.readFileSync(path.join(env.FACTORY_SLOTS, 'log.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual([job.kind, job.label], ['heavy', 'a-01-pins-tests']);
  assert.equal(spawnSync(process.execPath, [path.join(here, 'package-tests.mjs')], { cwd: root, env }).status, 2);
});

const SWEEP = {
  emptyFallback: { files: '\\.js$', call: '\\b[a-z]\\w*Source\\.\\w+Async\\b', empty: '\\?\\?\\s*(\\[\\]|false\\b)' },
  wordFiles: '(^|/)words/[^/]+\\.json$',
  catalogue: { files: 'roles\\.js$', constant: "(\\w+)\\s*=\\s*'([a-z][a-z -]*)'", code: '\\.js$' },
  builtButDesigned: { files: '\\.sql$', creates: 'create table (?:if not exists )?([a-z_]+\\.[a-z_]+)', design: '(^|/)data\\.md$', designed: '^\\|\\s*`{name}`\\s*\\|.*\\|\\s*designed\\s*\\|' },
};

test('the sweep lists the four kinds over the changed files', () => {
  const root = repo({ sweep: SWEEP });
  write(root, 'src/roles.js', "export const ClassLead = 'class lead';\nexport const Active = 'active';\n");
  write(root, 'words/en.json', '{\n  "pins.title": "Pins"\n}\n');
  write(root, 'docs/alpha/data.md', '| table | owner | state |\n|---|---|---|\n| `alpha.pins` | alpha | designed |\n| `alpha.notes` | alpha | built |\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'base');
  write(root, 'src/pins.js', [
    'const ids = await membershipSource.CurrentAsync(id) ?? [];',
    "if (role === 'class lead') allow();",
    'try { await gradeSource.ReadAsync(x);',
    '} catch { return 0; }',
    'const kept = own.ReadAsync(x) ?? [];',
  ].join('\n'));
  write(root, 'words/ar.json', '{\n  "pins.title": "x",\n  "pins.move": "y",\n  "pins.move": "z"\n}\n');
  write(root, 'db/001.sql', '-- create table alpha.ignored\ncreate table alpha.pins (id uuid);\ncreate table if not exists alpha.notes (id uuid);\n');
  const changed = ['src/pins.js', 'words/ar.json', 'db/001.sql', 'gone.js'];
  const r = sweep(root, { sweep: SWEEP }, changed);
  assert.deepEqual(r.a.map((h) => [h.line, h.call, h.as]), [[1, 'membershipSource.CurrentAsync', '?? []'], [3, 'gradeSource.ReadAsync', 'catch']]);
  assert.deepEqual(r.b.map((h) => [h.key, h.at]), [['pins.move', ['words/ar.json:3', 'words/ar.json:4']], ['pins.title', ['words/ar.json:2', 'words/en.json:2']]]);
  assert.deepEqual(r.c.map((h) => [h.file, h.line, h.literal, h.constant]), [['src/pins.js', 2, 'class lead', 'ClassLead']]);
  assert.deepEqual(r.d.map((h) => [h.table, h.design]), [['alpha.pins', 'docs/alpha/data.md']]);
  const md = markdown('work/a/01-pins', r);
  assert.match(md, /### \(a\) An unanswered call read as empty or false — 2/);
  assert.match(md, /`alpha\.pins` — created in `db\/001\.sql`, still designed in `docs\/alpha\/data\.md`/);
  const none = sweep(root, {}, changed);
  assert.deepEqual(none.skipped, ['a', 'b', 'c', 'd']);
  assert.match(markdown('p', none), /not configured: factory\/harness\.json sweep/);
});

test('run whole: the sweep prints markdown and never fails', () => {
  const root = repo({ sweep: SWEEP });
  const r = spawnSync(process.execPath, [path.join(here, 'sweep.mjs'), 'work/a/01-pins'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^## Sweep — `work\/a\/01-pins`/);
  assert.equal(spawnSync(process.execPath, [path.join(here, 'sweep.mjs')], { cwd: root }).status, 0);
  assert.deepEqual(wordKeys('{"a": {"b": 1}, "c": [1, "d"]}').map((k) => k.key), ['a', 'c']);
  assert.deepEqual(duplicateWordKeys([{ file: 'x', text: '{"a":1}' }, { file: 'y', text: '{"a":2}' }], new Set(['z'])), [], 'a duplicate in no changed file is not this package\'s');
  assert.deepEqual(unansweredAsEmpty('f', 'x.ReadAsync() ?? false', { call: /\w+\.ReadAsync/, empty: /\?\?\s*false/ }).length, 1);
  assert.deepEqual(builtButDesigned([], [], { creates: /x/, designed: 'y' }), []);
});
