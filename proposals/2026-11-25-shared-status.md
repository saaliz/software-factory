# Shared status for any factory, and three things to borrow

**Status: proposed, not yet run.** A study and a recommendation, written for the owner. It decides nothing; each item in the owner's list below needs the owner's word. It is the study step of `council/process-change.template.md`. No council has sat on it yet.

## What was looked at

**Six factories on one machine**, 25 November 2026. Read only:

| Factory | Where its status lives | What the viewer could show |
|---|---|---|
| The first project | Its own scripts already write `core/schemas` files to `tmp/ci` | Everything. The schemas were taken from it |
| The second project | A JSON registry of batches, git, live builder processes, and an owner queue in markdown | Board, pulse, progress, decisions. Done on 25 November with about 250 lines of its own code (`.local/orchestrator/status_json.py` in that project) |
| A third project | A YAML ticket file (id, state, blocker, commit) and a YAML file of reviewer verdicts | Board, progress, reading rounds |
| A fourth project | A markdown table per sprint with free-text statuses (TODO, IN PROGRESS, READY FOR USER TEST, DONE, BLOCKED), and a `**Status:**` line in each task file | Board, progress, what each task waits on |
| A multi-project orchestrator (third-party) | A SQLite board: idea, planned, doing, review, done, with team, cost, dependencies and project per task | One board across projects, with cost |
| A fifth project | Nothing; one `AGENTS.md` | Nothing until it tracks work |

That is four shapes of status: a JSON list, YAML tickets, markdown tables or task files, and a SQLite board.

**About twenty public factories and orchestrators.** Their READMEs were read, not their code. See Sources.

| Project | What it adds to this kit's view |
|---|---|
| andon | A ledger of tasks through review to merge. The owner is called only for five kinds of decision: what to build, how users experience it, promises to outside parties, irreversible risks, and changes to the line itself. Three merge tiers: tests alone, an independent review by another maker's model, or the owner. The status is a light: off, amber (the owner is called), red (a terminal failed) |
| dark-factory | Sealed acceptance tests are written before the code. They are kept outside the repository in a folder only its owner can read, with a canary file and a SHA-256 hash, and never enter the builder's worktree. Builders come from another model family |
| Archon | Workflows in YAML. An "attention queue" lists paused decisions, answered in a console or the CLI. SQLite or PostgreSQL |
| ai-factory, agentic-software-factory | The same line: design, build in a worktree, test, review, pull request. Local SQLite and a local dashboard. One has a documented local HTTP API |
| Symphony | Watches a tracker board and starts an isolated run per card, which returns proof of work |
| Kanban runners (vibe-kanban, agetor, kander, task-board, parallel-code) | A worktree per task and a board. No seal, council or acceptance |
| Spec Kit, BMAD | A spec turned into markdown tasks. No line, gate or status view |

## What the study found

1. **No public factory publishes a status format that another tool can write.** Each dashboard reads only its own state: a SQLite file, a `state.json`, or issue comments. None documents a schema for others. This kit's `core/schemas` and its read-only `pm/` viewer are the only neutral pair found.
2. **Five factories on one machine keep their status in four shapes.** One already writes the schemas. A second needed about 250 lines of its own code to write them. Each of the rest would need the same again if nothing is shared.
3. **Most of the second project's code is not about that project.** Finding the live builders, reading test environments from Docker, last commits from git, open owner questions from a markdown file, writing the files atomically, and the counting rules are the same for any factory. Only the mapping from its registry is its own.
4. **What the kit has that the public ones mostly lack:** sealed tests written by a session that does not build, a review that must come from another session or maker, a sized council, owner-only decisions held to the owner's exact words (`quotes.mjs`), and "NOT RUN is never rounded up to PASS". Only dark-factory comes close on the seal, and only andon on owner decisions.

## Proposal A: one status writer, with an adapter per shape

`core/status/write.mjs`, with no packages, reads one `status.config.json` per project and writes the five files that `core/schemas` describes.

```json
{ "out": "tmp/ci",
  "sources": [ { "adapter": "markdown-table", "file": "Sprints/*/SPRINT.md", "id": "Task", "status": "Status", "dependsOn": "Depends on" } ],
  "steps": { "TODO": "planned", "IN PROGRESS": "building", "READY FOR USER TEST": "review", "DONE": "merged", "BLOCKED": "held" },
  "decisions": { "file": "work/questions.md", "open": "^## OWNER QUESTION", "closed": "ANSWERED|RESOLVED" },
  "builders": true, "envs": { "docker": "name=my-test-env" } }
```

The rules every adapter keeps, moved from the second project's writer:

- A must counts as passed only when a test result says so.
- A sealed test that is red because its code is not built yet is not a failure.
- A measure that was not taken is `null`, never `0`.
- No walks file is written without a walk run.
- Live builders are counted from processes, not from a registry that can go stale.

The order, each step its own branch, each with its check:

| Step | Adapter | Check it ends with |
|---|---|---|
| 1 | `registry-json`: the writer plus the parts that are not project-specific, taken from the second project | The second project's four files come out byte-equal to its own writer's at one commit, timestamps aside |
| 2 | `markdown-table` and `task-files` | The fourth project's board shows every task in its sprint table at its status. Its files hold against `validate.mjs` |
| 3 | `sqlite-board`: reads the orchestrator's database with Node's built-in `node:sqlite`, read only, and lists its projects for `pm/projects.json` | One viewer shows every project the orchestrator knows |
| 4 | `yaml-tickets` | Waits on a decision: Node reads no YAML without a package |
| Later, if wanted | Read-only adapters for public tools: Archon's database, andon's ledger, agentic-software-factory's HTTP API, Spec Kit's `tasks.md`, Backlog.md, Beads | Each reads only, copies none of their code, and names them in `THIRD-PARTY.md` |

Also `node pm/add.mjs <folder>`. It writes a project's entry to `projects.local.json` and a read-only mount of its status folder only to `compose.local.yaml`.

## Proposal B: three things to borrow

Each one changes a rule of the line, so each needs the owner's word on its own.

1. **The vault, from dark-factory.** Keep sealed tests outside the repository, in a folder only its owner can read, with a canary file and a recorded hash. The builder's worktree then never holds them, which is stronger than sealing them in the tree and having the gate catch an edit. Cost: the gate and the test runner must fetch the tests from outside the repository, and a session that may read the vault must be named.
2. **Fixed kinds of owner decision, and merge tiers, from andon.** Write down the kinds of question that may reach the owner (andon's five fit this kit), and refuse a `decisions.json` entry of any other kind. Merge by tier: tests alone, an independent review by another maker, or the owner. The second project already has an informal form of this (a review "clear" plus waivers).
3. **The light, from andon.** One line at the top of the viewer: off, amber when the owner is called (`decisions.json` is not empty), red when main is red or a builder has died. The pulse already holds what it needs.

Archon's attention queue is the same idea as `decisions.json`. That supports the present design; nothing to borrow.

## What this does not do

- It does not change how any project builds, seals, reviews or merges. Proposal A only reads.
- It does not copy any other project's code.
- It does not make the viewer write.

## Owner's list

| Decision | Recommendation |
|---|---|
| Adopt Proposal A, steps 1 to 3, in that order | Yes: each step reads only, and each has a check |
| Step 4: a YAML package for the kit, or the third project also writes a JSON copy of its tickets | The JSON copy. The kit stays packageless |
| Adapters for public tools | Later, one at a time, only when someone asks for one |
| B1, the vault | A council first, on one work item of the first project: it changes the seal |
| B2, decision kinds and merge tiers | A council first. Tiers change what is proved before a merge |
| B3, the light | Yes. It is display only |

## How far to trust this

- The public projects were read from their READMEs, not their code.
- Star counts come from the pages. No page showed a last-commit date, so how active each project is was not judged.
- andon's ledger format and Symphony's specification are in files not opened.
- The middle of the largest list was summarised, not read line by line.
- No figure here was checked by a council seat.

## Sources

- awesome-software-factories, https://github.com/varun1505/awesome-software-factories
- awesome-software-factory, https://github.com/ahmadyan/awesome-software-factory
- awesome-agent-orchestrators, https://github.com/andyrewlee/awesome-agent-orchestrators
- andon, https://github.com/mitaku/andon
- dark-factory, https://github.com/DUBSOpenHub/dark-factory
- Archon, https://github.com/coleam00/Archon
- ai-factory, https://github.com/lucaslodeiro/ai-factory
- agentic-software-factory, https://github.com/OmegaMc1331/agentic-software-factory
- Symphony, https://github.com/openai/symphony
- vibe-kanban, https://github.com/BloopAI/vibe-kanban
- agetor, https://github.com/alamops/agetor
- kander, https://github.com/dualface/kander
- task-board, https://github.com/NicholasMTElliott/task-board
- parallel-code, https://github.com/johannesjo/parallel-code
- Spec Kit, https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/
- Backlog.md, https://github.com/MrLesk/Backlog.md
- Beads, https://github.com/gastownhall/beads
