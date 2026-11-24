// node --test light/tools/quotes.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { check, ownerWords } from './quotes.mjs';

const project = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'quotes-'));
  fs.mkdirSync(path.join(root, 'factory', 'decisions'), { recursive: true });
  fs.mkdirSync(path.join(root, 'work', '01-sign-in'), { recursive: true });
  fs.writeFileSync(path.join(root, 'factory', 'decisions', '2026-11-24-scope.md'),
    'The owner\'s decision · 2026-11-24 · scope\n\nAsked: "Approve the whole plan?"\n\nConfirmed by: Ammar, 2026-11-24, Approve the breakdown\n');
  return root;
};
const page = (root, text) => fs.writeFileSync(path.join(root, 'work', '01-sign-in', 'item.md'), text);
const CITE = '(factory/decisions/2026-11-24-scope.md)';

test('the owner\'s words, whole or shortened, hold', () => {
  const root = project();
  page(root, `Approved: "Approve the breakdown" ${CITE}. Also "Approve" ${CITE}.`);
  assert.deepEqual(check(root), []);
});

test('words the owner did not say fail, the question included', () => {
  const root = project();
  page(root, `Approved: "Approve the breakdown and the amendments" ${CITE}.`);
  assert.match(check(root)[0], /is not the owner's words/);
  page(root, `Approved: "Approve the whole plan?" ${CITE}.`);
  assert.match(check(root)[0], /is not the owner's words/);
});

test('a missing decision file, or one with no Confirmed by line, fails', () => {
  const root = project();
  page(root, '"Approve" (factory/decisions/2026-11-25-none.md)');
  assert.match(check(root)[0], /does not exist/);
  fs.writeFileSync(path.join(root, 'factory', 'decisions', '2026-11-25-none.md'), 'Panel decision, not yet confirmed\n');
  assert.match(check(root)[0], /no "Confirmed by:" line/);
});

test('only the Confirmed by lines hold owner words', () => {
  assert.deepEqual(ownerWords('Asked: "x"\nConfirmed by: the owner, 2026-11-24, Yes, apply them\n'), ['the owner, 2026-11-24, Yes, apply them']);
});
