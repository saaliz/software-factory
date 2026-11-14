# AGENTS.md — how any agent works in this repository

The entry point for every agent and tool. `CLAUDE.md` only points here. Read this file, then the one skill or brief for your step, then only what it names. Codex and other tools: a skill is a file, read `.claude/skills/<name>/SKILL.md` by its path.

## 1. What this project is

<One paragraph: who it is for, what it does, the stack. Replace this line.>

## 2. The rules every session follows

1. **One step, one fresh session.** A session does one step of one work item and ends. It never runs on into the next step.
2. **Read what your step names, nothing more.** Search first; read ranges, not whole files; send long output to a file and search it.
3. **Requirements come from one place:** `<where, for example docs/requirements/>`. Nothing in a test or in code adds one. A gap goes to the council (`.claude/skills/council/SKILL.md`).
4. **Tests are sealed before the build,** by a session that does not build. A builder never edits a sealed file; a sealed test that looks wrong is a question for the owner.
5. **A report is a claim.** Done means a command ran and printed it: the gate, the seal, the tests. Give the command and its last lines.
6. **Scripts before models.** A step that needs no judgement is a script and costs no tokens.
7. **No helpers** unless a brief or a skill allows one, and then only for what it names.
8. **The owner decides** anything irreversible, legal, financial, or about safety or personal data, and any change to this file or to `factory/`. Everything else: decide, and write down what you decided in `factory/decisions/`.
9. **Names, not codes,** in everything a person reads.
10. **Stop rules.** A step that fails twice moves up one model tier; a third failure stops and says so. Past its budget, a session writes one line with the spend and what remains, and asks.

## 3. A work item, start to finish

`work/NN-words/item.md` holds four headings: Criteria, Seal, Review, Release (`factory/item.md` is the form). The gate says what is next: `node factory/tools/gate.mjs work/NN-words`.

| Step | Skill | Model tier | It ends when |
|---|---|---|---|
| Spec | `factory-spec` | high | the gate says tests may start |
| Sealed tests | `factory-sealed-tests` | high | every test fails at the behaviour, and the seal is written |
| Build | `factory-build` | middle | the sealed tests are green and the seal holds |
| Review | `factory-review` | high; another vendor where there is one | "clear", or a named rule |
| Release | `factory-release` | low | it is released and the token line is written |

The spec's gaps go to the council skill as a panel before the tests are sealed. Any other question no file answers goes there too: a ruling, a panel or a council, the smallest that fits. A review that is not clear sends the work item back to the build, then to a fresh review.

## 4. Where things are

`work/` the work items · `factory/methods/` how sessions work, each named by a skill or a brief · `factory/tools/` the gate, the seal and the token counter · `factory/council/SEATS.md` who sits · `factory/decisions/` what was decided · `factory/brief.md` the form of a brief · `factory/token-economy.md` why the rules above are what they are.

## 5. Commands

<Replace this line with: the whole test command; the sealed tests' command and folder; the unit tests' command and folder; where the code lives; the release command and where a version goes (a tag, a package, a deployment); the branch work items are cut from.>
