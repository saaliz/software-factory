# The harness profile

For many modules, long unattended runs, two vendors and a team. One **super orchestrator** session runs the whole and alone merges to the main branch; a few **lane orchestrators**, each its own session, run the package loop for a few modules each, through subagents: sealed tests by one vendor, the build by the other, a fresh review, CI through a machine slot. Scripts own the order of work; models fill slots. It reuses everything in `core/`, `council/` and `light/`: the entry file, the work item, the gate, the seal, the counter, the methods and the council.

## Install

```bash
node init.mjs path/to/your/project --profile harness
```

It never overwrites a file. Beyond the light profile it writes `factory/harness.json`, `factory/harness/` (the super's rules, the lane brief and handover, the records' forms, the step briefs, the heartbeat), `factory/tools/slots.mjs`, `heartbeat.mjs` and `claim-super.mjs`, `factory/records/`, and `.claude/settings.json` naming this kit as a marketplace with the plugin on. Add `--marketplace <owner>/<repo>` to name a GitHub copy of the kit instead of this folder. Then:

1. Fill in every `<…>` in `factory/harness.json`: the four sources (product, design, architecture, decisions and principles), the commands, the CI pattern, the vendors, any forbidden paths.
2. In Claude Code, trust the folder, run `/plugin` and install `factory-harness` from the `software-factory` marketplace (or `claude plugin marketplace add <this kit>` and `claude plugin install factory-harness@software-factory`).
3. Start the super: `/factory-harness:factory-super`, or `claude --agent factory-harness:factory-super`.
4. Set a durable heartbeat: `factory/harness/heartbeat.md`.

The gate, the scaffold and the contract tests depend on the stack: the kit ships what each must do (`templates/interfaces.md`), and a project names its own commands.

## What is in it

| Path | What |
|---|---|
| `plugin/agents/` | super, lane, test writer, builder, fresh reviewer, panel; each a few lines pointing to its brief |
| `plugin/skills/` | `factory-super` (start or take over), `factory-lane` (start a lane), `factory-heartbeat` (one beat); each loads only when called |
| `plugin/hooks/` | `guard.mjs`, five guards behind switches, and its tests |
| `plugin/scripts/` | the slot script, the heartbeat script, the super's claim, and their tests; installed into `factory/tools/` |
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

Known limits: the shell checks read the command's text, so a write through a script file, or a merge through an alias, passes. The super's claim guards against mistakes, not a hostile session. A deliberate reseal runs with `FACTORY_HOOK_SEALED=off`.

## Tests

```bash
node --test "harness/plugin/hooks/*.test.mjs" "harness/plugin/scripts/*.test.mjs" init.test.mjs
```

## What is proven, and what is not

The harness generalizes how its first project runs today. Each part is in one of two states.

| Part | State |
|---|---|
| The super's rules: lanes, contract first and integration, sources, never idle, finish before starting, vendors and cover, the loop | Running on one project since 14 November 2026, not yet measured |
| The lane brief and the lane handover | Running on one project since 14 November 2026, not yet measured |
| The step briefs: ready, panel, seam repairs, sealed tests, build, review | Running on one project since 14 November 2026, not yet measured |
| The slot script | Running on one project since 14 November 2026, not yet measured; this generalized copy is tested here |
| The gate, scaffold and contract tests, as interfaces | Running on one project since 14 November 2026, not yet measured, as that project's own code; the kit ships the form only |
| The plugin: agents and skills | Built, not yet run |
| The five hooks | Built, not yet run on a project. Tested here; the sealed-test and main-branch guards refused once each in a live headless session |
| The durable heartbeat | Built, not yet run. The first project's check is a session-only timer |
| `init.mjs --profile harness` | Built, not yet run on a project; tested here |

Measured so far, on the first project: before the lanes, ten packages of about 25 criteria each merged in about 12 hours with Claude alone. Earlier, under the first version of the harness, no package merged in its first 41 hours, and a worker ran for at most 26 of 116 hours, mostly because each next step waited for a person: the heartbeat and never-idle rules come from that. What the lanes change has not been measured.
