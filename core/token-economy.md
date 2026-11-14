# Token economy — why the rules are what they are

Tokens spent are **calls multiplied by context**. Every call re-reads everything the session holds, so almost all spend is re-reading, not writing. On the first project this kit ran on (a 20-module system, 17 days, 34,700 calls) 10.8 billion tokens were re-read against 61 million written.

Read your own numbers before changing anything: `node factory/tools/tokens.mjs --by session`. "sent again" is the re-reading; "average context" is what each call carried.

## The five rules

| Rule | Why, measured on that project |
|---|---|
| One step, one short fresh session | Sessions doing one step carried a median of 146,000 tokens a call; one long coordinating session carried 372,000 and took 29% of a week's spend by itself |
| A script for every step with no judgement | A gate, a seal or a test run costs nothing; a model asked to "check" re-reads its whole context to do it |
| No helpers unless the brief allows one | Helper agents were 69% of all tokens; each starts with its own full context and often returns file contents |
| Trim what loads before the first word | A fresh session's first call was about 92,000 tokens; an estimated third to a half of it was tool and skill lists |
| The high model only where it judges | The high model made 97% of calls, most of them building and running, which the middle tier does |

## Setting a project up for it

1. **Connectors and tools:** turn off every connector this project does not use. In Claude Code, `disableClaudeAiConnectors` in `.claude/settings.json` does it for terminal and script sessions; in the desktop app, disconnect them in your account.
2. **Skills:** enable only the skills `factory/methods/README.md` names for the steps you run. Every listed skill costs a line on every first call, whether it is used or not.
3. **Entry file:** keep `AGENTS.md` near 60 lines. Every line is paid for on every call of every session.
4. **Briefs point, never copy** (`factory/methods/writing-for-agents.md`).
5. **Model per step:** the table in `AGENTS.md`, section 3. Move up a tier only on a named trigger: rights, safety, money, something sent to a real person, or a second failed attempt.
6. **Measure at every release:** tokens per accepted criterion, new input plus output, with "sent again" beside it. That project went from 1,114,000 to 284,000 between its first two measured items.

## The fixed cost of a session

In the kit's own trial, each fresh session took 47,000 to 89,000 tokens of new input whatever its step, most of it before any work. On a small work item that fixed cost is most of the bill: eight sessions cost 574,000 new plus output tokens for a 30-line library. So trim what loads at the start (steps 1 and 2 above) before anything else, and do not split a step into more sessions than the skills do.

## Work that can go to a free model

Only work that needs no files and holds nothing private: today that is the council's outsider, through `factory/tools/outside.mjs`. A free model may keep what it is sent, and the free list changes week to week, so the kit lists it live and names no favourite. Code, requirements and anything about real people stay with the models you have an agreement with.

## What is not yet known

These figures come from one project on one computer. The split of a first call is an estimate, not a measurement. Whether a person driving one session at a time beats a scripted line on tokens per criterion has not been measured side by side.
