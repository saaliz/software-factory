// node --test light/tools/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkAll, journeyProblems, outcomes, trace, walkthrough } from './journeys.mjs';

const J05 = () => ({
  id: 'J-05', title: 'Ask a question', actor: 'a member', fixture: 'tenant-a; member-with-grant; member-without-grant; tenant-b', languages: ['en', 'ar'],
  steps: [
    { id: 'J-05.1', does: 'asks', via: { screen: 'WSP-SCR-04' }, expect: 'a cited answer', proves: ['FR-5.1'] },
    { id: 'J-05.D1', kind: 'denial', denies: 'no grant', does: 'member-without-grant asks', via: { operation: 'ask' }, expect: 'nothing appears', proves: ['FR-1.11'] },
    { id: 'J-05.D2', kind: 'denial', denies: 'another tenant', does: 'tenant-b asks', via: { operation: 'ask' }, expect: 'nothing appears', proves: ['FR-2.1'] },
  ],
});

const project = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-journeys-'));
  for (const d of ['journeys', 'factory', 'api', 'work/05-ask']) fs.mkdirSync(path.join(root, d), { recursive: true });
  fs.writeFileSync(path.join(root, 'journeys', 'J-05-ask.json'), JSON.stringify(J05()));
  fs.writeFileSync(path.join(root, 'api', 'screens.yaml'), 'WSP-SCR-04: ask\n');
  fs.writeFileSync(path.join(root, 'api', 'openapi.yaml'), 'operationId: ask\n');
  fs.writeFileSync(path.join(root, 'factory', 'journeys.json'), JSON.stringify({ requiredDenials: ['no grant', 'another tenant'], known: { screen: ['api/screens.yaml'], operation: ['api/openapi.yaml'] }, release: ['FR-5.1', 'FR-5.4'] }));
  fs.writeFileSync(path.join(root, 'work', '05-ask', 'item.md'), '# Ask\n\n## Objective\nA member asks.\n\n## Journey steps\n<!-- for example "- J-05.2" -->\n- J-05.1\n- J-05.D1\n');
  return root;
};

test('a journey that holds every rule passes', () => {
  assert.deepEqual(checkAll(project()), []);
});

test('a journey with no denial, a missing required denial, or a step the contracts lack is refused', () => {
  const j = J05();
  j.steps = j.steps.slice(0, 2);
  j.steps[0].via = { screen: 'WSP-SCR-99' };
  const p = journeyProblems(j, { requiredDenials: ['no grant', 'another tenant'], known: { screen: ['s.yaml'] } }, () => 'WSP-SCR-04').join('\n');
  assert.match(p, /no denial step for "another tenant"/);
  assert.match(p, /screen "WSP-SCR-99" is in none of s\.yaml/);
  const none = J05(); none.steps = none.steps.slice(0, 1);
  assert.match(journeyProblems(none).join('\n'), /no denial step;/);
});

test('a step id must belong to its journey, name one way in, and prove a requirement', () => {
  const j = J05();
  j.steps[0] = { id: 'J-06.1', does: 'x', expect: 'y', via: { screen: 'a', operation: 'b' }, proves: [] };
  const p = journeyProblems(j).join('\n');
  assert.match(p, /starts with the journey's/);
  assert.match(p, /"via" names one of/);
  assert.match(p, /proves no requirement/);
});

test('a step passes only when every language passed', () => {
  const o = outcomes({ steps: [
    { id: 'a', language: 'en', outcome: 'pass' }, { id: 'a', language: 'ar', outcome: 'pass' },
    { id: 'b', language: 'en', outcome: 'pass' },
    { id: 'c', language: 'en', outcome: 'pass' }, { id: 'c', language: 'ar', outcome: 'fail' },
  ] }, ['en', 'ar']);
  assert.equal(o.get('a'), 'pass');
  assert.equal(o.get('b'), 'not run');
  assert.equal(o.get('c'), 'fail');
});

test('the trace lists uncovered requirements, unnamed steps and steps not passing', () => {
  const root = project();
  fs.mkdirSync(path.join(root, 'work', 'journeys', 'J-05'), { recursive: true });
  fs.writeFileSync(path.join(root, 'work', 'journeys', 'J-05', 'run.json'), JSON.stringify({ journey: 'J-05', steps: [
    { id: 'J-05.1', language: 'en', outcome: 'pass' }, { id: 'J-05.1', language: 'ar', outcome: 'pass' },
  ] }));
  const t = trace(root);
  assert.deepEqual(t.rows.find((r) => r.step === 'J-05.1'), { requirement: 'FR-5.1', step: 'J-05.1', items: ['work/05-ask'], outcome: 'pass' });
  const g = t.gaps.join('\n');
  assert.match(g, /FR-5\.4 is in the release and no step proves it/);
  assert.match(g, /step J-05\.D2 is named by no work item/);
  assert.match(g, /step J-05\.D1: not run/);
  assert.doesNotMatch(g, /J-05\.1:/);
  assert.doesNotMatch(g, /J-05\.2/, 'a step named only in the form\'s guidance comment is not a step');
});

test('the walkthrough shows the commit, every step, denials and the quality caveat, and escapes text', () => {
  const root = project();
  const j = J05(); j.steps[0].expect = '<script>x</script>';
  fs.writeFileSync(path.join(root, 'journeys', 'J-05-ask.json'), JSON.stringify(j));
  fs.mkdirSync(path.join(root, 'work', 'journeys', 'J-05'), { recursive: true });
  fs.writeFileSync(path.join(root, 'work', 'journeys', 'J-05', 'run.json'), JSON.stringify({ commit: 'abc123', ran: '2026-11-24T10:00:00Z', steps: [{ id: 'J-05.1', language: 'en', outcome: 'pass', evidence: ['shots/1-en.png'] }] }));
  const html = fs.readFileSync(path.join(root, walkthrough(root, 'J-05')), 'utf8');
  assert.match(html, /commit abc123/);
  assert.match(html, /J-05\.D2/);
  assert.match(html, /denies: another tenant/);
  assert.match(html, /proves no answer quality/);
  assert.match(html, /shots\/1-en\.png/);
  assert.doesNotMatch(html, /<script>x/);
});
