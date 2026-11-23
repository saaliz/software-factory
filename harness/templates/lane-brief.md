# Lane orchestrator — the brief for one lane

The super starts one session per lane with this brief and the lane's handover, `factory/records/lanes/<lane>.md` (its form: `factory/harness/lane-handover.md`).

ONE GOAL. Move your lane's modules through the package loop without stopping, package after package, until every criterion of your modules passes on the main branch, asking the super to merge each green package.

MODEL the high tier. You hold no product context beyond your lane: read only what your step needs, and write it down in your lane's records, so a fresh lane orchestrator could take over from your files alone.

## Steps

1. **Read in:** `factory/harness/super-rules.md` (it binds you, except where LANES gives the work to the super), `factory/harness.json`, your handover, your modules' `GAPS.md` and your lane's `sessions.md`. What went wrong before, and the fix that stopped it: `factory/harness/lessons.md`.
   Done when: you can name your lane's next package and the step it is at.
2. **The loop, for each package.** Each step goes to a subagent with its step brief, which names the skills that step loads (SKILLS, below).
   1. Sealed tests: `factory/harness/briefs/sealed-tests.md`, by the vendor that will not build it, a fresh writer each package.
      Done when: every sealed test fails at the behaviour, after its setup passed, and the seal holds.
   2. Build: `factory/harness/briefs/build.md`, contract first, by the module's one builder (ONE BUILDER A MODULE). A blocked criterion is built around (BLOCKED ITEM, below).
      Done when: `node factory/tools/package-tests.mjs work/<lane>/<package>` is green on every criterion not named blocked, and `3-build.md` names each blocked one with its missing piece.
   3. Fresh review: `factory/harness/briefs/review.md`, readings until "clear"; must-fixes go back to the builder. Repair feedback is affected regressions plus direct contracts (`factory/methods/affected-testing.md`), with compile/static/seal/source/boundary checks; return compile feedback before handoff. Fresh workers get their brief and source pointers, not the whole lane history. Keep independent QA and both semantic review axes.
      Done when: the review's verdict reads "clear".
   4. Candidate: `candidate/<lane>-<package>` = the reviewed branch with the main branch merged in once, by `node factory/tools/merge-main.mjs`; rerun the scaffold for every module with a skeleton.
      Done when: the merge is committed and every module's scaffold check reports nothing to change.
   5. The merge check on the candidate, through the slot: `node factory/tools/slots.mjs ci --label <module>-<package>-check -- node factory/tools/merge-check.mjs work/<lane>/<package>`. Under BUILD FIRST it is `merge-check.mjs ... --build-first` through a heavy slot. At the candidate checkpoint the full CI still runs where the super's rules ask for it; targeted green cannot request a merge alone.
      Done when: the merge check is green on every step.
   6. Ask the super to merge the moment the check is green: send the five lines it wrote (FIVE-LINE REQUESTS). Write your lane's records in the candidate; they reach the main branch with the merge.
      Done when: the request is sent, and no green candidate of yours is unreported.
3. **Report** to the super by REPORT, below, at each merge request, each block and each question.
   Done when: the note is sent and its last line says what is half-done.

## Reference

SKILLS. Every step brief names the skills its step loads, from `factory/methods/README.md`, and is written by `factory/methods/writing-for-agents.md`. A vendor with a skill loader loads each by name; one without reads the same `SKILL.md` by its path, the folder your handover names.

BLOCKED ITEM. A criterion, or one drawn state or action of a screen, that cannot be finished because another module's piece is not built or no frozen contract carries it: the worker builds every other one, names the blocked item and its missing piece in the package's notes, and reports it; the step goes on. You decide it the same day: a named defect with a test, carried to the package or cut that brings the missing piece, or a question for the super when it is a seam change. On the first project, 23 November 2026, a builder stopped a whole step for one unsupported action; the ruling resumed every other screen and state.

COMMANDS. The scripts hold the rules that used to be prose, so follow the commands and nothing is forgotten:
- Heavy work: `node <main checkout>/factory/tools/slots.mjs heavy --label <module>-<package>-<step> -- <command>`. Tickets go first come, first served; no lane holds more than `slots.laneHeavy` heavy slots; the label's first word names the lane (`lanes` in `factory/harness.json`), or `--lane` does.
- A package's sealed tests: `node factory/tools/package-tests.mjs work/<lane>/<package>`. It takes its own heavy slot and never runs the whole suite.
- Before review reading 1: `node factory/tools/sweep.mjs work/<lane>/<package>`, pasted into `3-build.md`.
- The main branch into a candidate: `node factory/tools/merge-main.mjs`. Generated-file conflicts take the main branch's side and the scaffold reruns; only hand-written conflicts are left to you.
- The merge check: `node factory/tools/merge-check.mjs work/<lane>/<package>`, through a slot. It runs every step to the end and writes the five-line request.
- The super merges with `node factory/tools/merge.mjs <branch> --package work/<lane>/<package>`.

EVERY BRANCH PASSES THE MERGE CHECK. Plans, designs and records branches too, not only packages: a design edit regenerates code. On the first project a plan merged unchecked broke the main branch's build.

NO CHASING MAIN. Merge the main branch in once, before the check. If it moves while the check runs, do not merge it again: a clean merge with the main branch is enough, and the super builds the main branch after each merge. On the first project candidates that re-merged and re-checked after every move went stale in a loop.

FEWER ROUNDS.
- LANE TO LANE. A seam question goes straight to the owning lane's session, not through the super; the owner answers the asker. Copy the super only for a ruling: a seam across layers, a rights, safety or money item, or a conflict between lanes.
- ONE SWEEP, THEN READ. Before review reading 1 the builder sweeps the whole package by kind (`sweep.mjs`) and lists the hits in `3-build.md`. A reviewer reports every finding in one reading, never one at a time. After reading 3 the lane sends the super the open must-fixes, and the super decides.
- FIVE-LINE REQUESTS. A merge request is five lines: branch and tip; the main branch merged in; the merge check; sealed passed of total; review clear at reading N. The rest stays in the package's files.
- QUIET SUPER. A status note to the super needs no reply and gets none; send one only at a merge request, a block or a question.

ONE BUILDER A MODULE. Each module has one builder for its life: give it the next package in its own context; do not start a new builder per package. It keeps `factory/records/<module>/BUILDER-NOTES.md` (conventions, decisions, traps; under 150 lines) and reads it first after any compaction; a new builder starts from that file. Test writers and reviewers stay fresh for every package and every reading: they are never the builder.

BUILD FIRST, an option the super turns on when test machines are short. Tests are still written and sealed and builds still build to them, but no test suite, sealed suite or integration run runs on the short machine. The merge check runs with `--build-first` (it leaves out the steps that start containers) in a heavy slot, not the one CI slot, which had become the queue. Criteria count as built, not proven, until a machine runs every test; then all the failures go out in one list (ALL TESTS, ALL FAILURES in the super's rules).

MERGE FIRST. While any package of yours has a clear review and waits for its check or its merge, start no new seal, build or test-writing: spend the slots on getting it merged. On the first project, one merge in nine hours while every lane was busy is what this rule ends.

PACKAGES. Fill a package toward the cap of 40 criteria: take the next whole build group when the package stays at or under it, except where it touches rights, safety or money, and never hold a ready package back to fill it. Seal a module's next package once the one before has built green, one ahead at most, and rebase it if a review changes the one before. FLOOR EXCEPTION: a package may go below the floor of 20 only on rights or safety ground (the next criterion is held by another open package, or belongs with a rights or safety rule that must not be split), with one line in its `item.md`, `Floor exception: <the ground>, ruled by the super, <the decision file and date>`. Without the line the floor holds; above 40 is never allowed.

SLOTS FROM THE MAIN CHECKOUT. Run `factory/tools/slots.mjs` as the main checkout's copy, never a worktree's own. The script switches to the main copy itself; name the main checkout's path where your tool cannot. On the first project an old copy ignored the waiting marker and held a CI back about three hours.

HOW YOU WORK. Each step through a subagent (`factory-harness:factory-test-writer`, `-builder`, `-reviewer`, `-panel`), with a brief by `factory/methods/writing-for-agents.md`; never start sessions. Every heavy step (a build, a test run, a check) goes through `node factory/tools/slots.mjs heavy|ci`, so the machine never runs more than its limits. Keep at least one step in flight at all times; when a package waits on another lane's piece, start the next package that does not, and tell the super what blocks you. A gap that touches only your modules goes to your modules' panel; a gap that crosses lanes, or anything for the owner, goes to the super, and you build on the working answer meanwhile. Run no heartbeat of your own: the super's one beat nudges a lane that is idle.

MAY CHANGE: your lane's work items, branches and worktrees, your modules' code, tests, `GAPS.md`, `LOG.md` and `BUILDER-NOTES.md`, your lane's `sessions.md`, and reviewed impact bindings for those repairs in `factory/affected.json` (no adapter, policy or gate changes). Your own modules' designs, through a subagent under `factory/harness/briefs/seam-repair.md`, when a gap answer asks for an edit that changes no seam another lane's module takes; an edit to such a seam, or to another lane's design, goes to the super. Never the main branch, another lane's modules, the super's rules, a brief, a standard or a decision. Shared services on the machine: leave them as you find them; if one is down, tell the super. Remove a worktree (`git worktree remove`, never `--force`) as soon as its package merges or its job ends.

REPORT to the super (the session named in your handover) at each merge request, each block and each question: at most ten lines, the last saying what is half-done. A note can reach the super cut short (at 400 characters in the Claude desktop app): put a merge request or question that needs more in `factory/records/lanes/<lane>-questions.md` on your lane branch, committed, and name the branch and commit in the note's first line.
