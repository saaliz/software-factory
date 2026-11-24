// node --test core/schemas/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, kindOf, KINDS, schemaFile } from './validate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, '..', '..', 'pm', 'fixtures', 'demo', 'tmp', 'ci');
const read = (f) => JSON.parse(fs.readFileSync(path.join(FIXTURE, f), 'utf8'));
const NAMES = { progress: 'progress.json', lanes: 'lanes.json', pulse: 'pulse.json', walks: 'walks-main.json', decisions: 'decisions.json' };

test('every schema file is JSON with an $id that names its kind and version', () => {
  for (const k of KINDS) {
    const s = JSON.parse(fs.readFileSync(path.join(HERE, schemaFile(k)), 'utf8'));
    assert.equal(s.$id, `factory/${k}@1`);
  }
});

test('the fixture project holds every schema', () => {
  for (const [k, f] of Object.entries(NAMES)) assert.deepEqual(validate(k, read(f)), [], f);
});

test('a document with no schema field is read by its file name', () => {
  assert.equal(kindOf({}, 'tmp/ci/walks-main.json'), 'walks');
  assert.equal(kindOf({}, 'progress.json'), 'progress');
  assert.equal(kindOf({ schema: 'factory/pulse@1' }, 'x.json'), 'pulse');
  assert.equal(kindOf({}, 'notes.json'), null);
});

test('missing fields, wrong types, numbers out of range and bad dates are each named', () => {
  const p = read('progress.json');
  delete p.musts.total.passed;
  p.musts.modules[0].percent = 140;
  p.musts.modules[1].failed = '3';
  p.at = 'yesterday';
  const out = validate('progress', p).join('\n');
  assert.match(out, /musts\.total\.passed: missing/);
  assert.match(out, /musts\.modules\[0\]\.percent: 140 is above 100/);
  assert.match(out, /musts\.modules\[1\]\.failed: is string, should be number/);
  assert.match(out, /at: "yesterday" is not a date and time/);
});

test('null means not measured where a measure may be missing, and nowhere else', () => {
  const p = read('progress.json');
  p.optimization[0].cost.tokensPerMustPassed = null;
  assert.deepEqual(validate('progress', p), []);
  p.musts.total.musts = null;
  assert.match(validate('progress', p).join(), /musts\.total\.musts: is null, should be number/);
});

test('a document that says it is another kind, or a newer version, is refused', () => {
  assert.match(validate('lanes', read('pulse.json')).join(), /says factory\/pulse@1, read as lanes/);
  assert.match(validate('pulse', { ...read('pulse.json'), schema: 'factory/pulse@2' }).join(), /newer than this viewer/);
  assert.match(validate('nope', {}).join(), /unknown kind/);
});

test('extra fields are allowed, so a project can write more than the viewer shows', () => {
  assert.deepEqual(validate('lanes', { ...read('lanes.json'), ourOwnField: { anything: 1 } }), []);
});

// School ERP's real files, when this machine has them (tooling/ops/progress.mjs, lanes.mjs, pulse.mjs).
const ERP = 'D:/Documents/Projects/school-lms';
const erpFile = (name) => ['tmp/ci', '.claude/worktrees/tooling-progress-62e66a/tmp/ci'].map((d) => path.join(ERP, d, name)).find((f) => fs.existsSync(f));
test('School ERP\'s files hold the schema as they are', { skip: !fs.existsSync(ERP) && 'School ERP is not on this machine' }, () => {
  let read = 0;
  for (const [k, f] of Object.entries(NAMES)) {
    const file = erpFile(f);
    if (!file) continue;
    read += 1;
    assert.deepEqual(validate(k, JSON.parse(fs.readFileSync(file, 'utf8'))), [], file);
  }
  assert.ok(read >= 1, 'no School ERP status file found');
});
