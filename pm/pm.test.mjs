// node --test pm/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, readProject, readDoc } from './read.mjs';
import { createServer } from './server.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEMO = path.join(HERE, 'fixtures', 'demo');
const project = (over = {}) => ({ id: 'demo', name: 'Demo', root: DEMO, dataDirs: ['tmp/ci'], owner: ['owner'], ...over });
const config = (projects) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-pm-'));
  const file = path.join(dir, 'projects.json');
  fs.writeFileSync(file, JSON.stringify({ projects }));
  return file;
};

test('the config gives each project an id, and the mount inside the container', () => {
  const file = config([{ name: 'School ERP', folder: DEMO, mount: '/projects/school-erp' }]);
  const [p] = loadConfig(file);
  assert.equal(p.id, 'school-erp');
  assert.equal(p.root, path.resolve(DEMO));
  assert.deepEqual(p.dataDirs, ['tmp/ci']);
  assert.equal(loadConfig(file, { useMounts: true })[0].root, '/projects/school-erp');
});

test('a project with no folder, or two with one name, is refused', () => {
  assert.throws(() => loadConfig(config([{ name: 'A' }])), /needs a name and a folder/);
  assert.throws(() => loadConfig(config([{ name: 'A', folder: '.' }, { name: 'a', folder: '.' }])), /two projects are called a/);
});

test('the kit\'s own config lists School ERP', () => {
  const [p] = loadConfig(path.join(HERE, 'projects.json'));
  assert.equal(p.name, 'School ERP');
});

test('a fixture project reads whole: every file holds, and the big rows are left out', () => {
  const r = readProject(project(), { now: new Date('2026-11-24T11:00:00Z') });
  for (const [k, f] of Object.entries(r.files)) assert.equal(f.state, 'ok', `${k}: ${f.problems.join('; ')}`);
  assert.equal(r.read, '2026-11-24T11:00:00.000Z');
  assert.equal(r.files.walks.file, 'tmp/ci/walks-main.json');
  assert.equal(r.data.progress.musts.total.passed, 29);
  assert.equal(r.data.progress.criteria, undefined);
  assert.equal(r.data.progress.results, undefined);
  assert.equal(r.data.walks.walks[0].tests, undefined);
  assert.equal(r.data.lanes.lanes.length, 2);
  assert.deepEqual(r.data.pulse.alarms, ['02-invoice: no commit for 3 h (refs/heads/cut/02)']);
});

test('open decisions: decisions.json, plus each "waits on" line that names the owner, once, oldest first', () => {
  const r = readProject(project());
  assert.deepEqual(r.decisions.map((d) => [d.id, d.source]), [
    ['02-invoice: waits on', 'lanes.json waitsOn'],
    ['D-7', 'decisions.json'],
  ]);
  assert.equal(r.decisions[0].question, 'the owner: which tax rule applies');
  assert.equal(readProject(project({ owner: [] })).decisions.length, 1);
});

test('a missing file says where it looked; an unreadable one says why; the first data dir that has it wins', () => {
  const none = readProject(project({ dataDirs: ['nowhere'] }));
  assert.equal(none.files.progress.state, 'missing');
  assert.deepEqual(none.files.progress.looked, ['nowhere/progress.json']);
  assert.equal(none.data.progress, null);
  const bad = readDoc(project({ dataDirs: ['other', 'tmp/ci'] }), 'lanes');
  assert.equal(bad.state, 'unreadable');
  assert.equal(bad.file, 'other/lanes.json');
  assert.equal(readDoc(project({ dataDirs: ['other', 'tmp/ci'] }), 'pulse').file, 'tmp/ci/pulse.json');
});

test('a data dir outside the project folder is never read', () => {
  const r = readDoc(project({ root: path.join(DEMO, 'tmp'), dataDirs: ['../tmp/ci', 'ci'] }), 'lanes');
  assert.equal(r.file, 'ci/lanes.json');
  assert.equal(readDoc(project({ root: path.join(DEMO, 'other'), dataDirs: ['../tmp/ci'] }), 'lanes').state, 'missing');
});

test('a document that breaks its schema is shown with its problems, not hidden', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-pm-bad-'));
  fs.mkdirSync(path.join(dir, 'tmp', 'ci'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'tmp', 'ci', 'pulse.json'), JSON.stringify({ at: '2026-11-24T10:00:00Z', cuts: [] }));
  const r = readProject(project({ root: dir }));
  assert.equal(r.files.pulse.state, 'invalid');
  assert.match(r.files.pulse.problems.join(), /alarms: missing/);
});

test('a progress.json that embeds the board and the pulse stands in for their missing files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-pm-embed-'));
  fs.mkdirSync(path.join(dir, 'tmp', 'ci'), { recursive: true });
  const progress = JSON.parse(fs.readFileSync(path.join(DEMO, 'tmp', 'ci', 'progress.json'), 'utf8'));
  delete progress.schema;
  progress.lanes = JSON.parse(fs.readFileSync(path.join(DEMO, 'tmp', 'ci', 'lanes.json'), 'utf8'));
  fs.writeFileSync(path.join(dir, 'tmp', 'ci', 'progress.json'), JSON.stringify(progress));
  const r = readProject(project({ root: dir }));
  assert.equal(r.files.lanes.state, 'ok');
  assert.equal(r.files.lanes.file, 'tmp/ci/progress.json (.lanes)');
  assert.equal(r.data.progress.lanes, undefined);
  assert.equal(r.files.pulse.state, 'missing');
});

test('the server serves the board and the data, only reads, and keeps to its folder', async () => {
  const file = config([{ name: 'Demo', folder: DEMO }]);
  const server = createServer({ config: file });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.deepEqual(await (await fetch(`${base}/api/projects`)).json(), [{ id: 'demo', name: 'Demo' }]);
    const one = await (await fetch(`${base}/api/projects/demo`)).json();
    assert.equal(one.files.lanes.state, 'ok');
    const page = await fetch(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<title>Factory board<\/title>/);
    assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal((await fetch(`${base}/app.js`)).status, 200);
    assert.equal((await fetch(`${base}/api/projects/nope`)).status, 404);
    assert.equal((await fetch(`${base}/api/projects/demo`, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`${base}/..%2f..%2fread.mjs`)).status, 404);
    assert.equal((await fetch(`${base}/healthz`)).status, 200);
  } finally {
    server.close();
  }
});
