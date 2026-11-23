# Software factory

A small kit for building software with coding agents so that the work is checked by scripts, the questions are answered by a council, and the tokens are counted. It is tool-neutral: Claude Code, Codex or any agent that reads a file.

It comes from one real build (a 20-module system, 17 days, 34,700 model calls) and keeps only what that build measured. What is proven and what is not is said plainly below.

## Two profiles on one core

| | Light harness and strong skills | Harness |
|---|---|---|
| Who drives | One person, one session at a time | A super orchestrator over lane orchestrators; workers are subagents |
| Where the process lives | Six skills that load only when called | A Claude Code plugin (six agents, three skills, five hooks), the super's rules, a brief per step, records |
| Scripts | The gate, the seal, the token counter, and a way to ask another maker's model | Those, plus machine slots for CI and heavy jobs, a runner for test suites side by side, a heartbeat judged by merges, a throughput measure, a measure of who waited on whom, a sources check, and the interfaces of a scaffold and contract tests |
| Fits | One app or one module, a solo builder, starting today | Many modules, long unattended runs, two vendors, a team |
| In this repository | **Yes: `light/`, installable now** | **Yes: `harness/`, installable now** with `--profile harness`; built, mostly not yet run outside its first project |

The core both share: one short entry file, the form of a brief, a build order the gate enforces (by default layered: contracts, database, seams, logic, then tests sealed by a session that did not build; or tests sealed before the build), the token counter, a handful of methods, and the council.

**Layered is new and not yet proven by a finished build.** It was adopted on 23 November 2026 in its first project to bring every layer's gaps forward; `core/methods/layered-build.md` holds it.

## Start

The harness profile: `node init.mjs path/to/your/project --profile harness`, then `harness/README.md`. The light profile:

```bash
node init.mjs path/to/your/project
```

It never overwrites a file. It writes `AGENTS.md` and `CLAUDE.md` if absent, `factory/` (methods, tools, forms, council seats, decisions), `.claude/skills/` (the council and five step skills) and `work/`. Then:

1. Fill in `AGENTS.md`, sections 1 and 5 and rule 3.
2. Fill in `factory/council/SEATS.md`; `factory/council/seats/` holds two worked examples.
3. Read `factory/token-economy.md` once and do its six set-up steps.
4. Start a work item with the `factory-spec` skill, a bounded context per step; keep the builder for repairs and use fresh review/QA contexts. `node factory/tools/gate.mjs work/NN-words` says what is next.
5. Configure `factory/affected.json` for repair verification (`factory/methods/affected-testing.md`): reviewed exact changes, focused regressions and direct contracts. Its empty template refuses code until configured; the shipped adapter supports exact Node test files. Full delivery/release gates still apply.

Written for Node 20 or later and tested on Node 26. No packages to install.

## A work item, start to finish

| Step | Skill | Ends when a script prints |
|---|---|---|
| Spec | `factory-spec` | `tests may start` |
| Sealed tests | `factory-sealed-tests` | `build may start` |
| Build | `factory-build` | `the seal holds`, and the tests are green |
| Review | `factory-review` | `release may start` |
| Release | `factory-release` | `next: done` |

Between the spec and the sealed tests, the spec's gaps go to a panel. A review that is not clear sends the work item back to the build, then to a fresh review.

A session's report is a claim; the gate and the seal are the check. The tests are written and sealed by a session that does not build, and a builder that edits one turns the gate red.

## The council

One skill, three sizes, so a question gets the smallest sitting that answers it:

| Size | For | Cost on the first project, new input plus output |
|---|---|---|
| Ruling | one small point | no session |
| Panel of three experts | a batch of gaps in one area | 115,000 to 150,000 tokens, 5 to 6 minutes |
| Council of the project's seats, plus an outsider | what to build next; a change to process or architecture | 120,000 to 170,000 with one voice; 225,000 to 430,000 with a helper per seat; the outsider adds 67,000 as a helper, or about 1,200 of a free outside model's own |

Each project names its own seats in one file: a seat is a person with an ordinary day, a question they always ask, and a stated say. A full council also hears an outsider, who is given only a neutral summary, and ends in one next move with the check that shows it is done. The outsider can be a helper, or another maker's free model through OpenRouter (`node factory/tools/outside.mjs --list` shows today's; set `OPENROUTER_API_KEY` in your own shell). The script sends the summary and nothing else. The seats are voiced by a model, so every decision file says so and marks what a real person should confirm.

## Token economy

Tokens spent are calls multiplied by context, so nearly all spend is re-reading. The rules in `AGENTS.md` follow from five measurements, in `core/token-economy.md`. Read your own with:

```bash
node factory/tools/tokens.mjs --by session
```

## Other authors' skills

The kit copies none. `core/methods/README.md` maps each job to one skill from Addy Osmani's agent-skills and from gstack, and says which to leave off. Eight of the kit's methods are adapted from Matt Pocock's skills; see `THIRD-PARTY.md`.

## What is proven, and what is not

| | State |
|---|---|
| Tests sealed by a session that does not build, checked by a gate | Used on the first project's last two releases and every package since; it caught real faults before they merged |
| Counting tokens from the agents' own files | Used daily; this kit's counter is a rewrite, tested here |
| One step per fresh session | Measured: a median of 146,000 tokens a call, against 372,000 for one long session |
| Panels and councils voiced by one session | 16 sittings on the first project |
| The light profile as a whole | Run end to end once, on a small trial work item (below). **Not yet run on a real project** |
| Affected repair planner and Node exact-file runner | Built and tested on synthetic Git repositories here; not yet run on a real project. No inferred call graph, other-stack adapter or full/E2E proof |
| The harness's rules, lane brief and step briefs, slots, heartbeat by merges, throughput and sources scripts | Running on one project since 14 November 2026; a few parts measured once (`harness/README.md`). Before the lanes: ten packages of about 25 criteria merged in about 12 hours with Claude alone |
| Rerunning every merged package's sealed tests on the main branch | Being built on the first project; documented only |
| What sets the line's ceiling (`core/methods/throughput.md`) | Measured once, on the first project, 14 November 2026: the machine, not the lanes. The slot script's waiting marker fixes a wait that was measured; test suites side by side are an estimate, not yet validated |
| Who waits on whom, and hand-offs that do not wait (`core/methods/nobody-waits.md`, `waits.mjs`) | Measured once, on the first project, 14 and 15 November 2026: the day stopped on waiting, not on defects, and a contrarian council could not refute it. The six things that help are the council's order and **proposed, not yet run** there, except the slot script's one copy for every worktree |
| Whether proven parts add up to something that runs (`core/methods/parts-not-whole.md`) | Measured once, on the second project, 22 November 2026, by a session that ran no test and with no council yet: one kind of request reached real code while 42 work items were recorded as built or accepted. Its five things that help are **proposed, not yet run** |
| A second seal refused unless it says why (`seal.mjs --reseal`) | Built and tested here; **not yet run** on a project |
| The harness's plugin, hooks, durable heartbeat and install | **Built, not yet run** on a project; tested here (`harness/README.md`) |

## The kit's own trial

One work item, "total an invoice", 8 criteria, on a 30-line library, each step in a fresh session reading only its skill.

| Step | Model tier | Seconds | New input plus output |
|---|---|---|---|
| Spec | high | 59 | 83,965 |
| Panel on 5 gaps | middle | 52 | 85,247 |
| Sealed tests | high | 177 | 71,177 |
| Build | middle | 95 | 56,269 |
| Review: not clear | high | 117 | 65,879 |
| Build, after the review | middle | 43 | 51,562 |
| Review: clear | high | 98 | 61,579 |
| Release | low | 51 | 98,202 |
| **All eight sessions** | | **692** | **573,880** |

That is 71,735 new plus output tokens per criterion, 6.6 million tokens sent again, and an average of 82,000 tokens of context per call. The first review found a real fault the sealed tests had missed (a quantity that is not a number produced an invoice with no totals), the gate refused the release, and the work item went back to the build. Every session also reported where its skill's wording made it guess; those reports rewrote the skills you see here. A toy this small says the loop works, not what a real project costs.

## Tests

```bash
node --test "light/tools/*.test.mjs" "harness/plugin/hooks/*.test.mjs" "harness/plugin/scripts/*.test.mjs" init.test.mjs
```

## Licence

MIT. See `LICENSE` and `THIRD-PARTY.md`.
