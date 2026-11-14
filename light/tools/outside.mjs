// Ask a model from another maker one question about one short text, through OpenRouter. Built for the council's outsider.
//   node factory/tools/outside.mjs --list                          today's free models, newest first (needs no key)
//   node factory/tools/outside.mjs <summary file> --model <id>     send the summary, print the answer
//   node factory/tools/outside.mjs <summary file> --model <id> --out <file>
// It sends the named file and one question, nothing else: no project name, no paths, no history.
// The key is read from OPENROUTER_API_KEY in the environment. It is never printed, written or put on a command line.
// A free model may keep and use what it is sent: the summary must hold nothing private.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://openrouter.ai/api/v1';
export const QUESTION = 'You know nothing about this project beyond the summary above. What is the obvious point that people close to this work would miss? Answer in at most 200 words, most important first.';
const maxWords = () => Number(process.env.FACTORY_OUTSIDER_MAX_WORDS ?? 400);
// Room for the answer and for a reasoning model's thinking, which counts against the same allowance.
const maxTokens = () => Number(process.env.FACTORY_OUTSIDER_MAX_TOKENS ?? 4000);

/** Why a summary may not be sent, or an empty list. The outsider gets a short neutral text with no paths in it. */
export function summaryProblems(text) {
  const problems = [];
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (!words) problems.push('the summary is empty');
  if (words > maxWords()) problems.push(`the summary is ${words} words: at most ${maxWords()}, so that only a summary can be sent`);
  const pathLike = text.match(/[A-Za-z]:\\[\w.-]+|(?:^|[\s`'"(])(?:\.{0,2}\/)?(?:[\w.-]+\/)+[\w-]+\.[A-Za-z]{1,5}\b/);
  if (pathLike) problems.push(`the summary names a file (${pathLike[0].trim()}): an outsider is given no paths`);
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{16,}/.test(text)) problems.push('the summary holds what looks like a secret');
  // Not a privacy check, only the two marks of a real person that a script can see. The author still answers for the rest.
  const contact = [...text.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+|\+?\d[\d ()-]{8,}\d/g)].find((m) => m[0].includes('@') || m[0].replace(/\D/g, '').length >= 9); // a date has eight digits
  if (contact) problems.push(`the summary holds what looks like a contact (${contact[0]}): an outsider is given no one's details`);
  return problems;
}

/** The one request that goes out. */
export const request = (summary, model) => ({
  model,
  max_tokens: maxTokens(),
  messages: [{ role: 'user', content: `${summary.trim()}\n\n${QUESTION}` }],
});

/** Send the summary; returns the answer, the model that answered and its token counts. */
export async function ask(summary, { model, key, fetchImpl = fetch }) {
  const problems = summaryProblems(summary);
  if (problems.length) throw new Error(problems.join('\n'));
  if (!model) throw new Error('name a model: --model <id> (see --list), or set FACTORY_OUTSIDER_MODEL');
  if (!key) throw new Error('no key: set OPENROUTER_API_KEY in your own shell before starting the session; never paste it into a chat or a file in the project');
  const res = await fetchImpl(`${API}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(request(summary, model)),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`the model did not answer (${res.status}): ${body?.error?.message ?? 'no message'}`);
  const choice = body?.choices?.[0];
  const answer = choice?.message?.content?.trim();
  if (!answer) {
    // A reasoning model can spend its whole allowance thinking and write nothing.
    const thought = choice?.message?.reasoning ? '; it reasoned but wrote no answer' : '';
    const cut = choice?.finish_reason === 'length' ? `; it ran out of room at ${maxTokens()} tokens, so raise FACTORY_OUTSIDER_MAX_TOKENS` : choice?.finish_reason ? `; it stopped with "${choice.finish_reason}"` : '';
    throw new Error(`the model answered with nothing${thought}${cut}`);
  }
  return { answer, model: body.model ?? model, tokens: { sent: body.usage?.prompt_tokens ?? 0, answered: body.usage?.completion_tokens ?? 0 } };
}

/** Today's free text models from the public catalogue, newest first. */
export async function freeModels(fetchImpl = fetch) {
  const res = await fetchImpl(`${API}/models`);
  if (!res.ok) throw new Error(`the catalogue did not answer (${res.status})`);
  const { data = [] } = await res.json();
  return data
    .filter((m) => Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0 && (m.architecture?.output_modalities ?? ['text']).includes('text'))
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
    .map((m) => {
      const d = (m.description ?? '').replace(/\s+/g, ' ');
      return {
        id: m.id, listed: new Date((m.created ?? 0) * 1000).toISOString().slice(0, 10), context: m.context_length ?? 0,
        'says coding': /\bcod(e|ing)\b|software engineering/i.test(d) ? 'yes' : '',
        'says it keeps prompts': /prompts? and (outputs?|completions?) (may be|are) (retained|logged|stored|used)/i.test(d) ? 'yes' : 'not said',
      };
    });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  try {
    if (args.includes('--list')) {
      console.table(await freeModels());
      console.log('"not said" is not a promise: check each provider\'s data policy in your OpenRouter privacy settings before sending anything that matters.');
    } else {
      const file = args.find((a, i) => !a.startsWith('--') && !['--model', '--out'].includes(args[i - 1]));
      if (!file) { console.error('usage: outside.mjs --list | outside.mjs <summary file> --model <id> [--out <file>]'); process.exit(2); }
      const r = await ask(fs.readFileSync(file, 'utf8'), { model: opt('--model') ?? process.env.FACTORY_OUTSIDER_MODEL, key: process.env.OPENROUTER_API_KEY });
      if (opt('--out')) fs.writeFileSync(opt('--out'), `${r.answer}\n`);
      console.log(r.answer);
      console.log(`\n(answered by ${r.model}; ${r.tokens.sent} tokens sent, ${r.tokens.answered} answered)`);
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}
