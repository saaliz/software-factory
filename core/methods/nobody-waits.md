# Nobody waits: where one thread waits on another, and what a hand-off should be

One session on the high tier, when every lane is busy and little merges; when a finished package waits hours for its merge; after a rule about what proves a merge has changed; and before adding a lane. It measures first and proposes second. It changes no rule, no sealed test and nothing on the main branch. It follows `throughput.md`, which asks what sets the ceiling; this asks who is waiting for whom under it.

THE PRINCIPLE. A hand-off is a record that is written and left, never a request held open. The one who hands off goes on to its next piece at once; the one who takes it reads the record when it is free. A step whose "done" needs another session's answer, another job's end or one shared slot is a wait, and a wait that can be circled back to itself stops the line while every session looks busy.

READ: the slot script's `log.jsonl` (`node factory/tools/waits.mjs`, where the harness profile is installed); `node factory/tools/throughput.mjs`; every CI run's own record and its log, not its label; git on the main branch, by time; each lane's notes; the rule for what proves a merge, as it stands today and as it stood when each package merged.

MEASURE six things. Every number names where it was read; a number nothing recorded is marked **estimate**.

1. **Who waited on whom for the machine.** `waits.mjs` charges every second a job waited to what held it back: a CI running alone, a CI running beside other work, another CI ahead of it, a CI waiting to run alone, or every heavy slot taken. Time waited with no holder in the log points at a job the log cannot see: one that was stopped, or one run by a copy of the slot script that writes no log.
2. **Where a finished package waited.** Hours from a clear review to the merge, package by package, before and after any change to the number of lanes or to the rule.
3. **Why each red run was red,** from its log: the package's own fault; another merge's (name both sides); nothing wrong, only stale because the main branch moved; the machine (a service down, a test's time limit under load, something not installed); the tooling. Count the runs and the slot-hours of each kind. Do not trust the account already written: on the first project it gave one outage as three and a half hours that was thirty minutes, a time zone misread.
4. **The loops.** Any step whose finishing makes another step's work stale: a merge that sends every waiting candidate back to the queue; a count written to the main branch that starts the test run that writes the count.
5. **What stands behind a criterion counted as proven today.** List every check, and the last moment each one ran for a merged criterion: the seal, the sealed tests, the review, the whole run. A change to the merge rule that removes a slow step usually removes a fast one with it.
6. **Whether the rules in prose held.** For each rule a lane must follow by hand (run alone; use the main checkout's script), count the jobs that did not.

Then run every merged package's sealed tests once on the main branch's tip. It is the only count of proven criteria that is a count of tests, and on the first project it found three red under a green whole run.

WRITE: one report, `<date>-waiting.md`, where the project keeps its records: the six measurements, then proposals. Each proposal says whether it removes a wait or only moves it, what it does to the proof, its cost, and whether it needs the owner's word. Put it to a contrarian council before it is handed over (`factory/council/process-change.md`), and correct the report by the council's file.

WHAT HELPS, in the order the first project's council put them. None had been run for a week when this was written; each is marked.

1. **The checks that cost seconds run at every merge, whatever else the rule drops:** the secrets scan, the seal, the commit messages. No build, no slot, no wait. **proposed, not yet run**
2. **The machine is checked before anything slow:** the shared service answers; what the last step needs is installed. A step that fails for a reason visible in one second runs before the tests, not after them. **proposed, not yet run**
3. **The slot script enforces what the brief says:** a CI runs alone unless told otherwise; a line when a job begins as well as when it ends; a warning at a time limit and a stop past it; one copy of the script for every worktree (the kit's copy already runs the main checkout's). **partly built in the kit; the limit and the begin line are not**
4. **The test lane is a script, one pass at a time:** when the main branch has changed in code since the commit last tested, the whole run, then every merged package's sealed tests, and one record: the commit, green or red, what failed, how many criteria passed. No lane starts it or waits for it. Not a loop until one pass has been run and read, and never sooner than an hour after the last. **a prototype exists on the first project; its pass had not been run**
5. **The count of proven criteria is read from that record,** at a named commit, with "merged, not yet tested" beside it and the share whose tests the other vendor wrote. Never added by hand at a merge. **the owner's word**
6. **The tests that measure the clock run first, alone, in their own short step.** They need a quiet machine and should keep one; they should not cost a whole run each time another lane is busy. **proposed, not yet run**

WHAT THE COUNCIL REFUSED, and why it is here: a test that fails beside other work and passes alone is still red (the one real defect a timed test found that day was red only under load); a script does not choose which merge to undo (its guess was wrong on the only real case); the whole run does not stop running alone to give the builders a slot back, until ten runs show no red on any time limit.

WHO DECIDES. As in `throughput.md`: a change to what proves a merge, to what a red on the main branch stops, or to what the count means needs the owner's word. Tooling that keeps every check does not.

Check: every wait is charged to a holder or marked as unseen; every red run has a cause read from its log; every proposal says "removes" or "moves"; the sealed tests of every merged package were run once and their count is in the report.

## What the first project found

One project on one computer, five lanes, 14 and 15 November 2026. Yours will differ; measure it.

- **measured** The day stopped on waiting, not on defects. Of 17 whole runs that went red, none was one package breaking another's test: four were a shared service down, four were web packages not installed in a new worktree, five were a test's time limit under load, two were the package's own quick-check faults, one was a new rule meeting older files, one was tooling. A council told to refute this could not.
- **measured** Over 10.9 hours a CI was running 74% of the time. CI jobs waited 14.3 hours to run 8.0. Builds and test runs waited 30.3 hours to run 5.9, and 24.8 of those hours were behind a running CI.
- **measured** The wait had moved into the merge: from a clear review to the merge took 0.4 to 1.4 hours before the lanes, and up to 12.0 after.
- **measured** The loop: a candidate was the main branch plus the package, so each merge made every waiting candidate stale, and it rejoined the queue for the one CI slot. Five green runs were repeats for that reason alone.
- **measured** The owner cut the loop: a package merges after the build and one fast check, and the whole run happens once on the main branch for everything merged since. The first run was green; the second, the first to cover merges no run had seen, was red on a time limit and on two rows of a table that two merges, each green alone, had made untrue. Both were changed in three minutes; every lane's merges were closed for 23 minutes until a third run was green.
- **measured** The wait then moved to the builders: in the new rule's first hour three whole runs held every slot for 51 of 59 minutes, and 14 builds waited 3.6 hours to run 13 minutes. One hour, and an unusual one.
- **measured** The whole run on the main branch did not run a merged package's sealed tests, and after the rule changed nothing checked a seal. A rerun of all sixteen packages found 413 of 416 criteria passing and three red, under a green whole run: one module sent an instant with an offset to the database, and a shared fix merged the same night made every event pass through that code. The package whose test failed had been green in its own whole run, on a candidate from before the shared fix.
- **measured** The count of proven criteria was four different numbers, none a count of tests: one added by hand at each merge, two from scripts reading lists, one from the last rerun, six packages old.
- **measured** Rules in prose did not hold for a day. Two CIs ran beside other work after the rule that CI runs alone: two hours of the slot, both red, and the same candidate was green alone in 22 minutes. Two ran from a worktree's old slot script after the ruling against it: 49 minutes in which jobs waited and the log showed no holder.
- **measured** One timed test made four runs red, about three hours of the slot, on other packages' candidates. It was right: a save sent 220 statements where 102 would do. Green alone, red under load, and a real fault.
- **measured** The study's own first figures: a council that checked 43 found six wrong and eleven loose. The worst was the study's own script, which charged no wait to a CI that was not running alone and so hid 9.9 hours. Read the script before trusting its table.
- **measured** The study itself held a slot the main branch's run was waiting for, for three minutes, while every lane's merges waited on that run. A study's heavy jobs go behind the line's.
