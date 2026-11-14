// node --test harness/plugin/scripts/throughput.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readItem, packages, jobs, measure } from './throughput.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fresh = () => fs.mkdtempSync(path.join(os.tmpdir(), 'factory-throughput-'));
const item = (n, release) => `# x\n\n## Criteria\n\n${Array.from({ length: n }, (_, i) => `- criterion ${i}`).join('\n')}\n\n## Seal\n\n## Review\n\nclear\n\n## Release\n\n${release}\n`;

function repo() {
  const root = fresh();
  const git = (...a) => spawnSync('git', a, { cwd: root, encoding: 'utf8' });
  const commit = (msg, at) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', msg], { cwd: root, env: { ...process.env, GIT_COMMITTER_DATE: at, GIT_AUTHOR_DATE: at } });
  git('init', '-q', '-b', 'main');
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); spawnSync('git', ['add', '.'], { cwd: root }); };
  put('work/a/01-one/item.md', item(20, '<!-- empty -->'));
  put('work/a/01-one/seal.json', JSON.stringify({ sealedAt: '2026-11-14T08:00:00Z' }));
  put('work/a/02-two/item.md', item(30, '<!-- empty -->'));
  put('work/a/02-two/seal.json', JSON.stringify({ sealedAt: '2026-11-14T09:00:00Z' }));
  put('work/b/01-three/item.md', item(5, '<!-- empty -->'));
  commit('sealed', '2026-11-14T09:00:00Z');
  put('work/a/01-one/item.md', item(20, 'Version: v0.1.0'));
  commit('merge one', '2026-11-14T10:00:00Z');
  return root;
}

test('an item reads as its criteria and whether its release is written', () => {
  assert.deepEqual(readItem(item(3, '<!-- empty -->')), { criteria: 3, released: false });
  assert.deepEqual(readItem(item(2, 'v1')), { criteria: 2, released: true });
});

test('packages: sealed, merged on the main branch, and the hours between', () => {
  const p = packages(repo());
  const one = p.find((x) => x.item === 'work/a/01-one');
  assert.deepEqual([one.criteria, one.mergedAt, one.hoursSealToMerge], [20, '2026-11-14T10:00:00.000Z', 2]);
  assert.equal(p.find((x) => x.item === 'work/a/02-two').mergedAt, null);
  assert.equal(p.find((x) => x.item === 'work/b/01-three').sealedAt, null);
});

test('the slot log by kind: jobs, red, waits and minutes run', () => {
  const s = jobs([
    { kind: 'ci', alone: true, code: 0, waitedSeconds: 600, ranSeconds: 1200, ended: '2026-11-14T10:00:00Z' },
    { kind: 'ci', alone: true, code: 1, waitedSeconds: 60, ranSeconds: 600, ended: '2026-11-14T11:00:00Z' },
    { kind: 'heavy', code: 0, waitedSeconds: 0, ranSeconds: 300, ended: '2026-11-14T11:00:00Z' },
  ]);
  assert.deepEqual(s['ci alone'], { jobs: 2, red: 1, medianWaitMinutes: 10, longestWaitMinutes: 10, ranMinutes: 30 });
  assert.equal(s.heavy.jobs, 1);
});

test('criteria an hour over the window, and what is sealed but not merged', () => {
  const m = measure(repo(), { now: Date.parse('2026-11-14T12:00:00Z'), log: [] });
  assert.deepEqual([m.merged, m.criteriaMerged, m.window.hours, m.criteriaAnHour], [1, 20, 4, 5]);
  assert.deepEqual(m.sealedNotMerged, ['work/a/02-two (30)']);
  const since = measure(repo(), { since: Date.parse('2026-11-14T11:00:00Z'), now: Date.parse('2026-11-14T12:00:00Z'), log: [] });
  assert.equal(since.merged, 0);
});

test('run whole: text and --json', () => {
  const root = repo();
  const env = { ...process.env, FACTORY_SLOTS: fresh() };
  const r = spawnSync(process.execPath, [path.join(here, 'throughput.mjs')], { cwd: root, env, encoding: 'utf8' });
  assert.match(r.stdout, /merged: 1 packages, 20 criteria/);
  assert.match(r.stdout, /work\/a\/01-one: 20 criteria, seal to merge 2 hours/);
  const j = JSON.parse(spawnSync(process.execPath, [path.join(here, 'throughput.mjs'), '--json'], { cwd: root, env, encoding: 'utf8' }).stdout);
  assert.equal(j.criteriaMerged, 20);
});
