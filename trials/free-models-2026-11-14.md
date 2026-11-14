# Free OpenRouter models: smoke test, 14 November 2026

One attempt per model per job, no fixing. Job 1 is the council's outsider: `light/tools/outside.mjs` sent a 300-word summary and one question. Job 2 is the code: one request for `src/invoice.mjs` from the toy invoice project's requirements and answers, judged by 8 sealed tests and the whole `node --test` (17 tests when a file loads: the 8 sealed and 9 unit tests left by the toy project's earlier build).

The eight newest free text models in the catalogue were tested. The two music models and `openrouter/free` were skipped. Job 2 was run twice at the owner's word: first with `max_tokens` 4000, where no model returned a file, then once more with 16,000. 24 requests were sent in all; none met a 429.

## Result

Sealed and whole passes are from the 16,000-token run. Seconds are outsider / code at 16,000.

| Model | Outsider answered | Outsider tokens (sent / answered) | Sealed passes of 8 | Whole passes of 17 | Seconds | Notes |
|---|---|---|---|---|---|---|
| `inclusionai/ling-3.2-flash:free` | no: no reply in 150 s | none | no file | no file | 150 / 300 | No reply to any of three calls. |
| `baidu/ernie-5.5-flash-preview:free` | no: answered with nothing | not reported | no file | no file | 10.0 / 53.8 | Code: 16,000 tokens answered, all of it reasoning, cut at the limit. |
| `thinkingmachines/inkling-2-small:free` | no: error 403 | none | no file | no file | 0.3 / 0.4 | "only available on agentic harnesses": a plain request is refused. |
| `liquid/lfm-3-1.7b:free` | no: error 504 from the provider | none | no file | no file | 24.8 / 33.7 | Code: stopped at 8,192 tokens, all reasoning. |
| `particle-ai/particle-1:free` | yes | 495 / 1,007 | 8 | 17 | 8.0 / 32.9 | Outsider: count cost per finished criterion, including rework; start with B. Code: 509 sent, 9,505 answered; exact decimal arithmetic, 117 lines. |
| `recursive/flint-v1.0:free` | no: reasoned to the 4,000 limit, wrote nothing | not reported | no file | no file | 23.1 / 49.8 | Code: stopped with "error" after 8,270 tokens, all reasoning. |
| `nvidia/nemotron-3.5-super-vl:free` | yes | 444 / 2,961 | 8 | 15 | 23.6 / 88.3 | Outsider: the fixed workflow, not the vendor, drives cost; likely A. Code: 450 sent, 6,362 answered; rounds in floating point, not whole cents. |
| `dots-studio/dots-3-note-preview:free` | yes | 436 / 2,678 | 7 | 14 | 33.2 / 127.6 | Outsider: free models may keep code and specs; confidentiality at risk. Code: 435 sent, 11,623 answered; rounds the unit price to cents first, so 3 x 0.335 gives 1.02, not 1.01. |

Each of the three returned files was read before it was run. None imports anything or uses `process`, `fs`, `child_process`, `fetch` or `eval`.

## The first run of job 2, at 4,000 tokens

No model returned a file. Six spent the whole 4,000 tokens reasoning and were cut at the limit (ernie, liquid, particle, flint, nemotron, dots), ling gave no reply in 180 seconds, and inkling answered 403.

## What the two unit failures were

- Nemotron and dots both fail the unit test for a half-cent line amount and the unit test that refuses a quantity or price that is not a number. Neither file refuses infinity, and nemotron does not refuse NaN.
- Nemotron passes all 8 sealed tests while ignoring the whole-cents answer, so the sealed tests do not catch a floating-point build on their own two half-cent cases.

## Three lines

Fit for the outsider: `particle-ai/particle-1:free` and `nvidia/nemotron-3.5-super-vl:free` gave pointed answers; `dots-studio/dots-3-note-preview:free` answered with a thinner, single point. Particle was the fastest and cheapest of the three.

Passed the sealed tests: `particle-ai/particle-1:free` (8 of 8, 17 of 17) and `nvidia/nemotron-3.5-super-vl:free` (8 of 8, 15 of 17), both only with the 16,000-token allowance; `dots-studio/dots-3-note-preview:free` passed 7 of 8.

What this test cannot tell us: how often a model answers, since each had one attempt per setting; whether any can do work larger than one 60-line file, or work inside a coding agent with tools; what the five models that returned no file could do with a lower reasoning setting; and what each provider keeps of what it is sent. The three files cost 6,362 to 11,623 answered tokens and 33 to 128 seconds each, so the request limits and the wait, not the price, are what a real build would meet first.
