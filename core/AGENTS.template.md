# AGENTS.md — how any agent works in this repository

The entry point for every agent and tool. `CLAUDE.md` only points here. Read this file, then the one skill or brief for your step, then only what it names. Codex and other tools: a skill is a file, read `.claude/skills/<name>/SKILL.md` by its path.

## 1. What this project is

<One paragraph: who it is for, what it does, the stack. Replace this line.>

## 2. The rules every session follows

1. **One step, one context.** A fresh worker receives its step's brief and sources, without the whole orchestrator history. Keep the builder's context for fixes within that build step; the review and independent QA use fresh contexts that did not build. A session never runs on into the next step.
2. **Read what your step names, nothing more.** Search first; read ranges, not whole files; send long output to a file and search it.
3. **Requirements come from one place:** `<where, for example docs/requirements/>`. Nothing in a test or in code adds one. A gap goes to the council (`.claude/skills/council/SKILL.md`).
4. **Build in layers, then seal the tests** (`factory/build-order` says which order; `layered` is the default). Layered: contracts, database, seams, logic across the wave, each layer checked before the next (`factory/methods/layered-build.md`); then a session that did not build writes and seals the tests, each shown to fail against a broken copy of the code. `tests-first`: tests are sealed before the build. Either way a builder never edits a sealed file; a sealed test that looks wrong is a question for the owner.
5. **A report is a claim.** Done means a command ran and printed it: the gate, the seal, the tests. Give the command and its last lines.
6. **Scripts before models.** A step that needs no judgement is a script and costs no tokens.
7. **No helpers** unless a brief or a skill allows one, and then only for what it names.
8. **The owner decides** anything irreversible, legal, financial, or about safety or personal data, and any change to this file or to `factory/`, except reviewed impact bindings in `factory/affected.json` for repairs already within the step's allowed scope. That exception changes no verification policy or gate. Everything else: decide, and write down what you decided in `factory/decisions/`.
9. **Names, not codes,** in everything a person reads.
10. **Stop rules.** A step that fails twice moves up one model tier; a third failure stops and says so. Past its budget, a session writes one line with the spend and what remains, and asks.
11. **Repair verification is affected-only:** changed-behavior regressions and direct contracts, with reviewed mappings (`factory/methods/affected-testing.md`). Keep compile/static/seal/source/boundary checks; full commands run at their explicit delivery/release checkpoints. A targeted green run is not completion proof.

## 3. A work item, start to finish

`work/NN-words/item.md` holds four headings: Criteria, Seal, Review, Release (`factory/item.md` is the form). The gate says what is next: `node factory/tools/gate.mjs work/NN-words`.

| Step | Skill | Model tier | It ends when |
|---|---|---|---|
| Spec | `factory-spec` | high | the gate says tests may start |
| Build (layered: first, by layer) | `factory-build` | middle | layered: each layer's check passes; tests-first: the sealed tests are green and the seal holds |
| Sealed tests (layered: after the build) | `factory-sealed-tests` | high | every test fails at the behaviour (layered: against a broken copy of the code), and the seal is written |
| Review | `factory-review` | high; another vendor where there is one | "clear", or a named rule |
| Release | `factory-release` | low | it is released and the token line is written |

The gate follows `factory/build-order`. The spec's gaps go to the council skill as a panel before the build (layered) or before the tests are sealed (tests-first). Any other question no file answers goes there too: a ruling, a panel or a council, the smallest that fits. A review that is not clear sends the work item back to the build, then to a fresh review.

## 4. Where things are

`work/` the work items · `factory/methods/` how sessions work, each named by a skill or a brief · `factory/tools/` the gate, the seal and the token counter · `factory/council/SEATS.md` who sits · `factory/decisions/` what was decided · `factory/brief.md` the form of a brief · `factory/token-economy.md` why the rules above are what they are.

## 5. Commands

<Replace this line with: compile/type/static/source/boundary commands; affected repair mappings and command; full test and sealed-test commands and their explicit delivery/release checkpoints; test folders; code folders; release command and version location; work-item base branch. Configure factory/affected.json before using the repair planner.>
