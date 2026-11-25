# A vendor lane: a second vendor builds a whole module

For the orchestrator and the lane's driver session, when a second vendor's agent builds a whole module in a lane of its own. The builder writes product code. Claude seals the tests, runs them, reads the result and merges. Source: the School ERP trial, 25–26 November 2026. The design was a council's advice and its smoke runs found the Windows faults below; no cut has yet been built and merged this way, so every measure here is still to be taken.

Nothing here lets the builder judge its own work. Judging stays with the other vendor's sessions and with scripts run from the main branch's tools.

## The roles

| Role | Who | May write |
|---|---|---|
| Orchestrator | the existing orchestrator session | the main branch, through the merge script; lane records; rulings; confirming each proof table |
| Lane driver | one session of the cheaper Claude tier | the cut's session log, the builder's brief files, its merge-request note |
| Prover | one session of the top tier, per work item | the proof table, the sealed tests, reseals |
| Builder | the second vendor's agent, headless | product code, migrations, unit tests, its build note and gap lines; nothing that judges the work |
| Reader | one fresh session per reading | its reading file |

## The lane driver

A session that only hands off. It starts each builder run, waits, runs the scripts on the returned tip, starts the readers and passes their findings on unedited. It never confirms or lowers a proof row, calls a reading clear, rules on a reseal, merges, pushes, edits the main branch, a decision or a method, or talks to the owner. A seal conflict, a gap, a change to a frozen seam or anything the orchestrator reserves goes to the orchestrator in a ten-line note (`handoff.md`). A builder that orchestrates itself judges itself and has no session tools: one run that held every seat let the records drift.

Check: the driver's commits touch only its own files (`git log --name-only` on its branch).

## A clone for each cut, not a worktree

A worktree keeps its git metadata in the shared repository. Making that writable for a builder lets it move the main branch's ref, write hooks that every lane's sessions then run, edit the harness scripts every session runs, and change other lanes' branches. A whole temporary folder is too wide as well: it holds other sessions' scratch files and hook state.

So the driver makes one single-branch clone for each cut, of the cut's build branch, with its own `.git` inside the builder's writable root. The clone has no other branches, which makes "do not look for the answer in other branches" true in fact. The driver fetches the branch back into the main repository; only fetched commits reach the judges. The builder never makes clones, worktrees or branches and never sees the main checkout's tree.

Check: `git -C <clone> branch -a` lists one branch and no other cut's.

## The judging-file check

The seal's own check compares sealed files with a hash table that sits in the builder's branch, and a reseal has no author check, so a builder could edit a test and reseal it. Close it with an allowlist, run from the main branch's tools:

1. The prover records the seal commit in the cut's log.
2. `judging-diff <seal commit> <tip>` lists every path the tip changed. Only the module's source and migrations, its unit-test project, its screens, and the build note, gap log and self-check note may change. Any other path is refused until the orchestrator rules. The work item's proof file must be byte-identical to the seal commit.
3. The script runs from the main branch's checkout, never from the tip's copy. The judges (the seal check, the test run, the quick check, the walks) then run in a judging worktree at the tip, which the builder cannot reach and whose tooling the first step has shown equal to main's.

Check: a tip that edits a test helper, the shared build settings, the seed or any tooling file is refused, with the path named.

## The launcher

One script starts every run, so the command never varies. It:

- writes the cut's session-log row first;
- builds the one command from a config: model and effort named on the line, the writable root, the extra writable folders, a temporary folder inside the clone;
- refuses a missing model or effort, a run from the main checkout, a second run at once, and a start while more lanes than the cap in `machine-capacity.md` have a cut in build;
- never switches off the vendor's session files, because the token counters read them;
- ends a run on a **stall** (no log event for 30 minutes while the process lives) or on the **budget** (the cut's token budget, read from the run's running totals, passed) by killing the whole process tree, so no build server or test host stays alive, then writes a stopped last-message file so the watcher wakes.

The trial's budget was the first such build's rate scaled by criteria: about 2 million tokens for about 90 criteria. A second stall on one cut goes to the orchestrator; covering the builder with Claude is the orchestrator's call.

Check: kill a run; the launcher's next start finds no live child of the old tree.

## One fresh run for each step

The steps are the build, one run for each reading's findings, and a repair if one is needed. Never keep a run alive across steps: the vendor's counters are cumulative for a thread, so a resumed thread pays again for everything before it.

The brief is a file in the cut's folder, written with `writing-for-agents.md` and committed on the branch before the run. It carries the stop rule:

- On a refused or blocked command, a sealed test that disagrees with its criterion, or a needed change to a judging file or a frozen seam: write `Status: stopped — <reason, criterion, file and line>` at the top of the build note, commit, end the run.
- For a disagreement only, build the rest first, then stop.
- Never retry a refused command another way.

`Status: done` is the builder's claim and proves nothing. A step has ended when the last-message file exists and no process lives.

## Findings come back in one message per reading

Each reading's must-fix findings go to the builder in one message, in one fresh run. Not one run for each finding, and not findings spread over several messages. The driver then runs the test step again on the new tip.

## The hand-offs

| Step | State | Proved by | Who |
|---|---|---|---|
| Seal | proof table confirmed; seal merged to main before the build, so the builder's first commit carries the sealed tests | the grid, seal and broken-copy checks | prover; orchestrator confirms and merges |
| Build | the build branch in the clone; build note done or stopped | the run has ended; the tip's hash | builder; driver fetches |
| Test | judging-file check, then in the judging worktree: seal check, test run, quick check, the cut's walks | exit codes and result files naming the tip | driver |
| Reading | one reading file a round, each naming the head it read | `review.md`: top tier until clear for rights, safeguarding, money and sends; cheaper tier for deltas | readers |
| Findings | one fresh builder run per reading | that run's last message; the test step again | driver, then builder |
| Merge | a ten-line note; the merge script's dry run green | the merge script, with fresh quick and sealed results | orchestrator |

From the test step to the merge, no builder run starts on the cut, so the judging worktree stays at the tip the merge script checks.

## Measures for each cut

| Measure | Read from |
|---|---|
| Criteria passed a day, from the seal's merge to the cut's merge | the git log; the test result files |
| Readings to clear, and must-fix findings a round | the reading files |
| Escaped faults: found by a reading, a walk, the owner or a later cut, that no sealed test caught, one line each with the step that made it | the gap log |
| The builder's tokens beside a Claude builder's, per criterion passed, with a column naming the vendor | the session log and the vendor's session files; the progress script must add the vendor's share to the cut's Claude share, or the vendor's tokens vanish from the count |
| Stops and stalls | the session log; the build note's stop lines |

These decide whether the vendor builds another module. Read them after the first two cuts merge, against the Claude lanes' last two.

## Windows notes, from two smoke runs of 26 November 2026

Each run stopped at its first step by the stop rule. Neither reached a build, a slot or a container, so those are **not determined**.

1. Run one: the first shell call (a multi-statement PowerShell command) was refused at process creation with "blocked by policy". The command-policy layer refused it; no folder root was involved.
2. `--ignore-user-config` drops the user's Windows sandbox setting along with the rest of the user's config. Name it on the command line: `-c windows.sandbox=elevated`. That cleared the refusal in run two.
3. Run two: the process started, but the file-write tool failed with "requires a UTF-8 PATCH argument". Never pipe a patch through PowerShell; its argument and encoding handling breaks it. Write files directly, or apply a patch from a file.
4. Stop only on a sandbox or policy refusal. Fix any other tool error (an encoding quirk, a missing path) once, and report it if it recurs. Retrying a refusal by another route is what the stop rule forbids.
5. Before the first cut, run a smoke test once in a throwaway clone: write a line and commit it; run one build through a slot; run one test that needs a container. Widen a writable root only for the root that failed, never to the shared `.git` or the main checkout. Full access is a security setting and waits for the owner's word.

Check: the smoke note records each of the three steps as passed, failed or not run, with the error text.
