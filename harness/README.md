# The harness profile

For many modules, long unattended runs, two vendors and a team. One **super orchestrator** session runs the whole and alone merges to the main branch; a few **lane orchestrators**, each its own session, run the package loop for a few modules each, through subagents: sealed tests by one vendor, the build by the other, a fresh review, CI through a machine slot. Scripts own the order of work; models fill slots. It reuses everything in `core/`, `council/` and `light/`: the entry file, the work item, the gate, the seal, the counter, the methods and the council.

## Install

```bash
node init.mjs path/to/your/project --profile harness
```

It never overwrites a file. Beyond the light profile it writes `factory/harness.json`, `factory/harness/` (the super's rules, the lane brief and handover, the records' forms, the step briefs, the heartbeat), `factory/tools/slots.mjs`, `side-by-side.mjs`, `heartbeat.mjs`, `throughput.mjs`, `sources.mjs` and `claim-super.mjs`, `factory/records/`, and `.claude/settings.json` naming this kit as a marketplace with the plugin on. Add `--marketplace <owner>/<repo>` to name a GitHub copy of the kit instead of this folder. Then:

1. Fill in every `<…>` in `factory/harness.json`: the four sources (product, design, architecture, decisions and principles), the commands, the CI pattern, the vendors, any forbidden paths.
2. In Claude Code, trust the folder, run `/plugin` and install `factory-harness` from the `software-factory` marketplace (or `claude plugin marketplace add <this kit>` and `claude plugin install factory-harness@software-factory`).
3. Start the super: `/factory-harness:factory-super`, or `claude --agent factory-harness:factory-super`.
4. Set a durable heartbeat: `factory/harness/heartbeat.md`.
5. Configure the common `factory/affected.json` before repair verification: exact reviewed before/after Git blob bindings, focused regressions and direct contracts (`factory/methods/affected-testing.md`). `commands.repair` names the planner/runner; `commands.compile` names compile/static checks. Use heavy slots for repairs and full CI at the existing candidate/release checkpoints. Node exact files are supported; other adapters refuse until implemented and tested by the project.

The gate, the scaffold and the contract tests depend on the stack: the kit ships what each must do (`templates/interfaces.md`), and a project names its own commands.

## What is in it

| Path | What |
|---|---|
| `plugin/agents/` | super, lane, test writer, builder, fresh reviewer, panel; each a few lines pointing to its brief |
| `plugin/skills/` | `factory-super` (start or take over), `factory-lane` (start a lane), `factory-heartbeat` (one beat); each loads only when called |
| `plugin/hooks/` | `guard.mjs`, five guards behind switches, and its tests |
| `plugin/scripts/` | the slot script, the runner for test suites side by side, the heartbeat, the throughput measure, the measure of who waited on whom, the sources check, the super's claim, and their tests; installed into `factory/tools/` |
| `templates/` | `harness.json`, the super's rules, the lane brief and handover, the records, the heartbeat, the interfaces, and six step briefs |

## The hooks

Each is on by default. Switch one off in `factory/harness.json` (`hooks.<name>: false`) or for one session with `FACTORY_HOOK_<NAME>=off`. A project with no `factory/harness.json` is left alone; a guard that errors lets the call through.

| Hook | Refuses | Switch |
|---|---|---|
| `sealedTests` | an edit to a file any `seal.json` under `work/` holds, or a new file in a sealed folder; a shell command that names one and writes | `SEALED` |
| `mainBranch` | `git merge` on the main branch, a push to it, `gh pr merge`, from any session but the super's (its claim, or `FACTORY_ROLE=super`) | `MAIN` |
| `ciThroughSlot` | a command matching `ciPattern` that does not run through `slots.mjs ci` | `CI` |
| `forbiddenPaths` | any tool call naming a path in `forbiddenPaths` | `FORBIDDEN` |
| `largeContext` | nothing; warns the session and the person once each time the context passes another `largeContextTokens` | `CONTEXT` |

Known limits: the shell checks read the command's text, so a write through a script file, or a merge through an alias, passes. The super's claim guards against mistakes, not a hostile session. A deliberate reseal runs with `FACTORY_HOOK_SEALED=off` and says why: `seal.mjs work/<item> --reseal "<why>" <paths>`; a second seal without a reason is refused, and `--check` prints every reseal.

## Tests

```bash
node --test "harness/plugin/hooks/*.test.mjs" "harness/plugin/scripts/*.test.mjs" init.test.mjs
```

## What is proven, and what is not

The harness generalizes how its first project runs today. Each part is running there (measured once, or not yet measured), built here and not yet run, or being built.

| Part | State |
|---|---|
| The super's rules: lanes, contract first and integration, sources, finish before starting, vendors and cover, the loop | Running on one project since 14 November 2026, not yet measured |
| The lane brief and the lane handover | Running on one project since 14 November 2026, not yet measured |
| Lane rule: merge first, and a green candidate reported at once | Running on one project since 14 November 2026, measured once: one merge in nine hours before it |
| Lane rules: long questions in a committed questions file; a lane edits its own modules' designs; fill toward the cap; seal one ahead | Running on one project since 14 November 2026, not yet measured |
| The step briefs: ready, panel, seam repairs, sealed tests, build, review | Running on one project since 14 November 2026, not yet measured |
| The slot script: one CI, a few heavy jobs, stale locks taken over | Running on one project since 14 November 2026, not yet measured; this generalized copy is tested here |
| Slots: `ci --alone` and the waiting marker | Running on one project since 14 November 2026, measured once: before it, a CI waiting to run alone was passed by for 18.5 minutes |
| Slots: run from the main checkout's copy | Running on one project since 14 November 2026, measured once: before it, a worktree's old copy held a CI back about 3 hours |
| Slots: a log line per job, a 5-second poll, a waiting file per job | Running on one project since 14 November 2026, not yet measured |
| `side-by-side.mjs`, test suites two at a time inside one CI | Running on one project since 14 November 2026, measured once: platform tests took 687 seconds against about 1,100 |
| `throughput.mjs`: criteria an hour, seal to merge, slot waits and runs | Running on one project since 14 November 2026, not yet measured; this generalized copy is tested here |
| `waits.mjs`: every second a job waited for a slot, charged to what held it back (`core/methods/nobody-waits.md`) | Written on the first project on 15 November 2026 and run there once, on one day's log: builds waited 24.8 of 30.3 hours behind a running CI. A council found its first version hid 9.9 of those hours; corrected, and this generalized copy is tested here |
| `sources.mjs`, the sources step with a backlog; the scaffold's Source lines and new projects | Running on one project since 14 November 2026, not yet measured; the kit's check works by file, tested here, and the scaffold ships as its form only |
| The super's heartbeat, judged by merges | Running on one project since 14 November 2026, measured once: one merge in nine hours while the earlier heartbeat said "moving" |
| The durable schedule for the heartbeat (app task, Task Scheduler, cron) | Built, not yet run. The first project's check is a session-only timer |
| Shared services restarted by the super alone | Running on one project since 14 November 2026, measured once: one outage cost about 30 minutes of every lane's runs and five red runs (first written here as 3.5 hours, a time zone misread that a later study corrected) |
| The contrarian council on a change to the process (`council/process-change.template.md`) | Running on one project since 14 November 2026, measured once: it checked fifteen of the study's figures and found seven wrong or loose |
| The sealed rerun: every merged package's sealed tests rerun on the main branch | Being built on the first project, because "proven" had meant "passed once, at merge"; documented here only |
| The gate, scaffold and contract tests, as interfaces | Running on one project since 14 November 2026, not yet measured, as that project's own code; the kit ships the form only |
| The plugin: agents and skills | Built, not yet run |
| The five hooks | Built, not yet run on a project. Tested here; the sealed-test and main-branch guards refused once each in a live headless session |
| `init.mjs --profile harness` | Built, not yet run on a project; tested here |
| Common affected repair planner and Node exact-file runner | Built and tested on synthetic Git repositories here; not yet run on a real project. Targeted evidence does not replace independent QA, either semantic source-review axis or full checkpoint gates |

Measured so far, on the first project: before the lanes, ten packages of about 25 criteria each merged in about 12 hours with Claude alone. Earlier, under the first version of the harness, no package merged in its first 41 hours, and a worker ran for at most 26 of 116 hours, mostly because each next step waited for a person: the heartbeat and never-idle rules come from that. With five lanes, on 14 November, the line ran at 15 criteria an hour, 28 in its best stretch, against a ceiling of about 34 the machine set (`core/methods/throughput.md`).
