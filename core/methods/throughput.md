# Throughput: what sets the ceiling

One session on the high tier, when about ten packages have merged (a package is one work item), when criteria proven an hour stop rising though sessions were added, and before adding a lane or a machine. It measures first and proposes second. It changes no rule, no sealed test and nothing on the main branch.

READ: `node factory/tools/throughput.mjs` first, where the harness profile is installed (criteria an hour, each package's seal-to-merge hours, the slots' waits and runs); git (seal, review and merge commits, by time); each package's notes and review findings; every CI run's own record of its steps and seconds; the slot script's `log.jsonl`, one line per job, where the harness profile is installed; the machine (memory, processors, what is running).

MEASURE five things. Every number names where it was read; a number nothing recorded is marked **estimate**, with the record that would measure it.

1. **Each package's hours, step by step from seal to merge:** seal to first review reading (the build), first reading to "clear", clear to merge. Beside them its reseals, its review readings, its CI runs, and why each run after the first. Hours an outage took (a service down, a vendor at its limit) are set apart: they belong to no step.
2. **CI:** the seconds of each step and each test suite, slowest first; the few tests that hold most of them; and, per package, the share of CI its change cannot reach (the suites of modules that neither it nor its callers touch).
3. **Waiting:** for the CI slot; for heavy slots; on another lane's piece; idle time (no commit on any branch, and a module's hours between one package's merge and its next seal); packages that fell under the size floor.
4. **Work built but unproven:** criteria whose code is on the main branch with no sealed test passing for them, by module; how many a test already names; how many differ from the design.
5. **Which resource sets the ceiling:** CI, the heavy slots, other lanes, reviews or test writing, by the arithmetic below.

THE CEILING, per package:

- CI minutes = the minutes of one CI run × CI runs a package, red runs counted.
- Heavy minutes = the minutes of its builds and test runs outside CI ÷ the heavy slots.
- Machine-minutes a package = the two added. Packages an hour = 60 ÷ machine-minutes. Criteria an hour = packages an hour × the mean criteria a package.

Set the ceiling beside the measured rate and the best stretch. A best stretch near the ceiling means the machine is the limit and more lanes add nothing; one far under it means the limit is in 1 or 3.

WRITE: one report, `<date>-throughput.md`, where the project keeps its records: the five measurements, the arithmetic, then proposals ranked by criteria an hour gained. Each proposal: its evidence, the change, the gain with its arithmetic, the cost, the risk to quality and what keeps it safe, and whether it needs the owner's word. End with what was weighed and not proposed, and why.

WHO DECIDES. A change to a rule needs the owner's word: what is proved before a merge, which checks run, how many review readings, the size of a package, where CI runs. Tooling that keeps every check does not: the order of jobs, jobs side by side, a log, a shared fixture. It merges like any other change, after green CI. A tooling change never drops a check for speed.

Check: every number names its source or is marked estimate; the ceiling's arithmetic is shown; every proposal says whether it needs the owner's word.

## What the first project found

One project on one computer, 14 November 2026, over its first ten merged packages. Yours will differ; measure it.

- **measured** The machine, not the lanes, set the ceiling. The line ran at 15 criteria an hour and at 28 in its best stretch; the arithmetic ceiling was about 34 (about 31 CI minutes a package, plus 45 heavy minutes over three slots, at 25.8 criteria a package). Five lanes could supply more than one machine could take. Inside that ceiling the 45 heavy minutes are an **estimate**: nothing recorded them, which is why the slot script now logs every job.
- **measured** A CI waiting to run alone was overtaken for 18.5 minutes while two of the three heavy slots it held stood idle: each time the third came free, another lane's job took it first. Fixed by the waiting marker in the slot script (`--alone`).
- **measured** CI by impact saved 0 to 3% for nine packages of ten, because the foundation modules are taken by nearly every module, so nearly every suite is within a change's reach. Weighed and not proposed.
- **measured** One suite was 42% of the test time, and three of its tests, each importing a large seed, were most of that (350 of its 410 seconds on one run). The study proposed sharing one import and was wrong: the sharing had been done the day before, and the three imports left were three different seeds kept apart for stated reasons. Read the fixture before proposing to merge it.
- **measured** Work built but unproven was 465 criteria, against 282 proven; 462 of them already had a passing test that named them, which the line's own skip rule passed over.
- **measured, once** Test suites two at a time inside the slots a CI already holds (`side-by-side.mjs`, harness profile): one whole CI went green with the tests in 677 seconds on the clock against a mean of 1,170 one at a time, the run 37% shorter, each suite about 16% slower beside another. One run; a second green one is asked for before it stays the default. Two at once, not three, because memory was the limit.
- **measured** "Proven" meant "passed once, at its merge". The CI of a later package ran only that package's sealed tests, so nothing ran a merged package's sealed tests again. The study did not see this; the council's outsider asked whether the whole run grows with the system, and a seat checking that premise in the CI script found it. Rerun every merged sealed suite on a schedule, and say the date of the last rerun beside the count.

## Put the report to a council before it is handed over

In the form of `factory/council/process-change.md`. The first project's owner asked for this, and it paid: a council whose seats were each told to refute first (`council/SKILL.md`, the engineering seats, an outsider given only a neutral summary) checked fifteen of the report's figures and found seven wrong or loose. A gain of 100 criteria an hour was 50 unless two CIs ran at once; a batch's gain of 16 was 6 at the measured red rate; a run time called "alone" was not; one proposal had already been done. Tell each seat to check at least five figures itself against the records. Correct the report by the council's file, mark each correction, and only then send the actions that need no word to whoever runs the line, with the owner's decisions listed apart.
