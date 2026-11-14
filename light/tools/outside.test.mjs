// node --test "light/tools/*.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';
import { ask, freeModels, request, summaryProblems, QUESTION } from './outside.mjs';

const SUMMARY = 'A small team must decide whether a review step runs before or after the tests are written. Two options: before, which is slower; after, which is cheaper. Last month two faults reached users.';
const answering = (body, ok = true, status = 200) => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return { ok, status, json: async () => body }; };
  return { fetchImpl, calls };
};

test('a summary with a path, a secret, too many words or nothing in it is refused before anything is sent', async () => {
  assert.deepEqual(summaryProblems(SUMMARY), []);
  assert.match(summaryProblems('See src/invoice.mjs for the fault.')[0], /names a file \(src\/invoice\.mjs\)/);
  assert.match(summaryProblems('It lives in D:\\Projects\\app.')[0], /names a file/);
  assert.match(summaryProblems(`The key is sk-${'a'.repeat(24)}`).join(' '), /secret/);
  assert.match(summaryProblems('word '.repeat(401))[0], /401 words/);
  assert.match(summaryProblems('Ask the head at head@school.example about it.')[0], /looks like a contact \(head@school\.example\)/);
  assert.match(summaryProblems('Her mother can be reached on +974 5550 1234 today.')[0], /looks like a contact/);
  assert.deepEqual(summaryProblems('It cost 574,000 tokens across 8 sessions, 47,000 to 89,000 each, on 2026-11-13.'), []);
  assert.match(summaryProblems('   ')[0], /empty/);
  const { fetchImpl, calls } = answering({});
  await assert.rejects(ask('See src/invoice.mjs', { model: 'm', key: 'k', fetchImpl }), /names a file/);
  assert.equal(calls.length, 0);
});

test('a ratio or a date in a summary is not taken for a path', () => {
  assert.deepEqual(summaryProblems('Two of five targets were met on 13/11/2026, and/or the third was close. Cost fell 4x.'), []);
});

test('without a model or a key nothing is sent, and the message says how to set them', async () => {
  const { fetchImpl, calls } = answering({});
  await assert.rejects(ask(SUMMARY, { key: 'k', fetchImpl }), /name a model/);
  await assert.rejects(ask(SUMMARY, { model: 'm', fetchImpl }), /OPENROUTER_API_KEY in your own shell/);
  assert.equal(calls.length, 0);
});

test('one request goes out: the summary, the one question, the key in a header and nowhere else', async () => {
  const { fetchImpl, calls } = answering({ model: 'maker/model-x', choices: [{ message: { content: ' You forgot who pays. ' } }], usage: { prompt_tokens: 80, completion_tokens: 6 } });
  const r = await ask(SUMMARY, { model: 'maker/model-x:free', key: 'secret-key', fetchImpl });
  assert.deepEqual(r, { answer: 'You forgot who pays.', model: 'maker/model-x', tokens: { sent: 80, answered: 6 } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer secret-key');
  assert.deepEqual(Object.keys(calls[0].init.headers).sort(), ['Authorization', 'Content-Type']);
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body, request(SUMMARY, 'maker/model-x:free'));
  assert.equal(body.messages.length, 1);
  assert.ok(body.messages[0].content.startsWith(SUMMARY) && body.messages[0].content.endsWith(QUESTION));
  assert.ok(!calls[0].init.body.includes('secret-key'));
});

test('a refusal or an empty answer is an error that never shows the key', async () => {
  const refused = answering({ error: { message: 'rate limited' } }, false, 429);
  await assert.rejects(ask(SUMMARY, { model: 'm', key: 'secret-key', fetchImpl: refused.fetchImpl }), (e) => /429.*rate limited/.test(e.message) && !e.message.includes('secret-key'));
  const empty = answering({ choices: [{ message: { content: '' } }] });
  await assert.rejects(ask(SUMMARY, { model: 'm', key: 'k', fetchImpl: empty.fetchImpl }), /answered with nothing$/);
  const thinking = answering({ choices: [{ finish_reason: 'length', message: { content: '', reasoning: 'Let me think...' } }] });
  await assert.rejects(ask(SUMMARY, { model: 'm', key: 'k', fetchImpl: thinking.fetchImpl }), /reasoned but wrote no answer; it ran out of room at 4000 tokens, so raise FACTORY_OUTSIDER_MAX_TOKENS/);
});

test('the list holds only free text models, newest first, and reads what each says of itself', async () => {
  const { fetchImpl } = answering({ data: [
    { id: 'a/old:free', created: 100, context_length: 1000, pricing: { prompt: '0', completion: '0' }, description: 'A general model.' },
    { id: 'b/paid', created: 300, pricing: { prompt: '0.000001', completion: '0' }, description: 'An agentic coding model.' },
    { id: 'c/new:free', created: 200, context_length: 2000, pricing: { prompt: '0', completion: '0' }, description: 'An agentic coding model. Prompts and outputs may be retained and used.' },
    { id: 'd/music', created: 400, pricing: { prompt: '0', completion: '0' }, architecture: { output_modalities: ['audio'] }, description: 'Music.' },
  ] });
  const list = await freeModels(fetchImpl);
  assert.deepEqual(list.map((m) => m.id), ['c/new:free', 'a/old:free']);
  assert.equal(list[0]['says coding'], 'yes');
  assert.equal(list[0]['says it keeps prompts'], 'yes');
  assert.equal(list[1]['says it keeps prompts'], 'not said');
});
