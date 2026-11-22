# Parts proven, nothing runs: what a real request can reach

One session on the high tier, when many work items are released and no person can yet do what the milestone is for; when reviewed branches pile up beside a main branch that merges are held from; and before a whole test campaign is planned. It measures first and proposes second. It only reads: it changes no rule, no test, no record and nothing on any branch. `throughput.md` asks what sets the ceiling and `nobody-waits.md` who waits on whom; this asks whether what was proven adds up to something that runs.

THE PRINCIPLE. A criterion is proven for a person only when something real can reach its code: a route the host maps, a job something starts, an event a built consumer takes. A part that passes its sealed tests with stand-ins on both sides is proven as a part. Count the two apart, and never report the second as the first.

READ: the main branch as it is (what the host maps; what implements each interface outside the tests); every head with a clear review that is not on the main branch, each against each (`git merge-base --is-ancestor`); the gate's and the CI's own scripts, not their labels; the sealed tests of the code that decides who may see what; each package's gate runs and review readings.

MEASURE six things. Every number names where it was read; a number nothing recorded is marked **estimate**.

1. **What a real request can reach.** Every route, job and consumer the host maps on the main branch. Then, for each released work item, its first caller there, or "none".
2. **What stands in for what.** Each interface whose only implementations are in tests, and each sealed test that passes on stand-ins alone. Mark those that decide who may see what.
3. **How far the reviewed work is from one tree.** For each reviewed head not on the main branch: its commits ahead, which other reviewed heads it holds, and what holds its merge (a decision, an approval, a queue).
4. **What each gate row ran.** For every row: its command, and whether that command runs tests or only compiles. Every suite the fast command leaves out, with the script that runs it, or "none". Every row that is red for a reason older than the change in hand.
5. **Refusals that cannot fail.** In the tests of who may see what, read each refusal: would it still pass with its rule removed? One that sends a made-up subject, or accepts any of several refusals, usually would. Count those with no control beside them (`test-first.md`, rule 8).
6. **What was paid twice.** Gate runs and review readings for each package, and why each after the first. Whole runs on a change that touched no code.

WRITE: one report, `<date>-parts.md`, where the project keeps its records: a table of behaviours (the behaviour, built or not, what proves it, the proof's limit), the six measurements, then proposals. Say apart what is missing code and what is missing tests. Put it to a contrarian council before it is handed over (`factory/council/process-change.md`), and correct the report by the council's file.

WHAT HELPS, largest first. None has been run; each is marked.

1. **The journey is sealed first.** Before a milestone's parts are built, one test through the real route and the real store is written and sealed by a session that does not build. Its first cases are the denials (another tenant, no grant, no right); then one grant admits one thing. The parts are ordered to turn it green, and nothing that decides who may see what is faked on it. Each work item names its first caller, or the work item that adds one. **proposed, not yet run; the owner's word**
2. **A standing candidate while the main branch is held.** When a decision outside the line holds merges, every head with a clear review is still merged, by the one session that merges, into one candidate branch that is never the main branch. The integration run and the image come from it; a head left out is listed. **proposed, not yet run**
3. **A row says what ran.** A row is green only when its command ran and passed. A check that does not apply says so in its own word; one that only compiles is named "compile". Every suite the fast command leaves out has a named stage and reads "not run" when that stage did not run. A row red for an old reason carries the exact commits or files that make it red, so only a new one turns it red. **proposed, not yet run**
4. **A refusal has a control one input away** (`test-first.md`, rule 8) **and a reseal says why** (`node factory/tools/seal.mjs work/<item> --reseal "<why>" <paths>`). **in the kit from this version; not yet run on a project**
5. **One review, one batch of fixes;** and a change that touched no code carries the code checks from its base, by name and commit, without running them again. The run that goes to release stays whole. **proposed, not yet run; the owner's word**

WEIGHED AND NOT PROPOSED: reading only the fix after a review that was not clear. A fresh reading found, on the kit's own trial, a fault the sealed tests had missed. On the second project the repeats came from fixes sent one commit at a time, not from the readings being whole.

WHO DECIDES. As in `throughput.md`: a change to what is proved before a merge, which checks run or how many readings needs the owner's word. Tooling that keeps every check does not.

Check: every released work item has a first caller or "none"; every interface has an implementation outside the tests or is listed; every gate row has its command beside it; every proposal says whether it needs the owner's word.

## What the second project found

One project in two repositories on one computer, 22 November 2026, read in a day by one session that ran no test. No council has checked these figures yet. Yours will differ; measure it.

- **measured** On the main branch one kind of request reached real code: "who am I". Searching, reading a document and granting access had no route. The three interfaces that decide who may see what had no implementation outside one test file. The project's own audit counted 22 work items accepted and 20 built (**not recounted**).
- **measured** Three modules held tables and tests of tables and no code that runs: search, the graph, document intake. Work items of at least two were recorded as built or accepted.
- **measured** The test of "belonging to a group gives no access to content" passed. It built the subject's snapshot itself and ran on three stand-ins; the bridge it assumed was not in the product.
- **measured** Twelve reviewed heads in one repository stood up to 116 commits ahead of its main branch, and none held the three that must run together. Merges were held by a decision on contract text. The newest image came from one head.
- **measured** In one repository the gate row named "lint, types, unit" ran a compile. A gate reported as six of six held no test run, and one of the six was a check that did not apply.
- **measured** The fast test command left out 20 test files, five filters and one test project "for their own stage". No script ran that stage, and the campaign's verdict script, which refuses "not run", did not list them.
- **measured** Of five refusals read in the rights code, one could not fail for its rule: it sent a made-up account, and the code gives a made-up account the same answer whether or not the rule exists.
- **measured** The seal held where it was looked at: in two build commits no test file changed. Only reading showed it. The seal script rewrote a seal without a word (changed here: `--reseal`), and the guard the project had decided on a week earlier was not installed.
- **measured** One gate took 13.5 minutes, under the one lock on the shared test services. One adapter of about a hundred lines took seven gate runs and four review readings in 2 hours 12 minutes, each for one small commit.
- **measured** What held: a case nobody ran was reported "not run", and the campaign's harness stopped as blocked rather than pass with no environment; receipts named commits, file hashes and image ids; the grant store's tests ran on the real database as a role that cannot bypass row security, with a rollback and a race.
- **measured** The project's copy of the kit was its first version. The sealed-test guard and affected-only repair tests had been in the kit for four days and were not in the project. Compare the copy with the kit before proposing what the kit has.
- **measured** The study's own first count was wrong: thirteen heads, because it counted the main branch as one. Two of its five proposals the kit already held in part. Count again, and read the kit, before the report is handed over.
