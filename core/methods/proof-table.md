# The proof table: what each claim owes before anyone calls it done

For whoever proves a piece of work, before the first test is written; for the builder, who builds to it; for the reviewer, who reads it first. It answers three things a session otherwise decides by habit: which claims need a test, which are already proved by something else, and which need none. **Proposed, not yet run** on any project. The idea of agreeing where the tests go before writing them, with what each catches and misses, is adapted from Matt Pocock's `tdd` skill (see `README.md`, Credits).

A **claim** is one thing that must be true when the work is done: a criterion of a work item, or, where the work has no criteria (a repair, a refactor, a tool, a record), one line the session writes itself. Work with no claim cannot be proved and is not started.

## The table

One row per claim, under a `Proof` heading in the work item's file (or in the brief, for work with no item):

| Claim | Level | Proof | Catches | Misses |
|---|---|---|---|---|

**Level,** picked by three questions: if this is wrong, who is harmed and can it be undone? Does something that already runs prove it? Would it break silently, or would anyone see it at once?

- `always`: harmful and silent. The project names its own list in `AGENTS.md` under "Never wrong"; start from: who may see or change what; anything that protects a person; money; anything sent outside; data that cannot be restored. Never lowered by a session.
- `once`: something a person relies on. Proved one time, at the lowest level that can prove it (`test-first.md`, rule 8).
- `none`: already proved by something that runs, or harmless and seen at once. It names what covers it.

**Proof,** one of:

| Proof | Means | Allowed for |
|---|---|---|
| `test + control` | a sealed test, and beside it the same request with one input changed, which succeeds | `always` |
| `test` | one sealed test through the public interface | `once` |
| `property: <rule>` | a rule checked over many generated inputs the builder never saw, so no input can be special-cased | `always`, `once` (permissions, money, anything with many cases) |
| `journey` | a test through the real routes and the real store already exercises it; named | `once` |
| `measured: <what>` | a number before and after, by a command, with its limit | `once` (speed, size, cost) |
| `shown: <command>` | a command and its output: a planted fault turns a check red, a count matches, a file exists | `once`, for work that is not behaviour |
| `check: <name>` | a script that already runs on every change: the compiler, a generator, a linter, a boundary check | `none` |
| `walk` | seen in the running product, with the screenshot or recording kept | `none` (wording, layout) |
| `read: <who>` | a named reader, for what only judgement proves | `none`; never `always` |

**Catches** and **Misses,** a few words each: what would turn this proof red, and what could still be wrong while it is green. A row whose Misses names real harm has the wrong level.

## The rules

1. **Before any test.** The table is written first and confirmed by whoever started the work: the orchestrator, or the person. With two vendors, the one who will not build writes it, and writes the tests from the requirements, never by reading the code.
2. **Tests come from the table.** One per `once` row, a test and its control per `always` row, none for a `none` row; a test for a `none` row is removed.
3. **Up by anyone, down by one.** Any session may raise a row's level. Only whoever confirmed the table lowers one, with the reason beside it; nobody lowers an `always`.
4. **The builder builds to it** and changes neither the table nor the sealed tests (`every-step.md`). The seal covers everything that judges the work, not the test files alone: the test runner's settings, saved snapshots, the build pipeline's and the linter's settings. A change to any of them is named in the note and read by the reviewer.
5. **Two lines in every builder's brief.** "Solve it yourself: do not look for the answer in the history, in other branches or in copies of the tests." "If a test and its claim disagree, stop and say so; do not work around either."
6. **A `none` row is shown once.** Break the claim (invert the condition, remove the line), run the check the row names, see it go red, put the code back, and write the command beside the row. A check that stays green covers nothing: the row moves up to `once`.
7. **The tests are shown to fail.** For `always` and `once` rows, small faults are planted in the changed code only (a mutation tool for the project's stack, or by hand) and the tests run. A planted fault no test catches goes back to whoever wrote the tests, never to the builder.
8. **The reviewer reads it first** (`review.md`): a "Never wrong" claim below `always`, a `none` row never shown, a test that names no fault it would catch, or a proof that could not fail is a must-fix finding.

## The prover's checklist: the gaps reviews keep finding

From the School ERP trial, 22–26 November 2026: most must-fix findings in its reviews were a state that changed after a check, a role the access grid does not admit, a second path to one outcome, or a notice's words. The prover works through these before the table is confirmed, and the seal note says each was done.

9. **A hold that arrives after the check.** Any action that checks a hold or a state at one step and acts at a later one (prepare then sign, notice then confirm, a draft then its placement) gets an `always` row: a hold arriving between the two steps stops the act. Its test lands the hold between the steps and shows the later step refused. Its control is the same two steps with no hold between them, which succeed.
10. **Access-grid rows come from a script.** Where the design has an access grid (role by route), a script prints the rows for the routes the work touches:
    - every admitted role refused outside its scope;
    - every other role given the route's own grid answer exactly, never "403 or 404";
    - one control.

    The slice names its routes on one line, and a check refuses a seal with a route's rows missing. Where a role reaches a route only through a token, code or session, a role the grid leaves out asks with one that is not its own, and expects the row's answer. On a public route, "every other role" means no role reaches more than the control does.
11. **Every path to one outcome.** An outcome with more than one path (end an enrolment, issue a document, tell a person) gets a row for each path, or the row names why a path needs none. The paths are read from the design, never from the code.
12. **A hold row names both states.** A row that proves a hold quotes the state that holds and the state that releases it from the design. Its control starts from the releasing state.
13. **A notice's words are sealed.** Any notice, alert or message the work sends a person, in words of its own, gets an `always` row. The row quotes the exact words in each language, the template key and its fields, fixed at the seal and not by the builder.
    - The words are true in every end state the notice can be read in: sent, settled, retried, dead-lettered, or unread. A word that promises an outcome the code may not reach is refused.
    - In a gendered language, the words address the reader neutrally where the reader's gender is not known.
    - The test asserts the words in the language it tests. The other languages are held to the row by a check that reads the template catalogue.
    - Work that only raises events, which another module turns into words, adds no row. It names the events in its gaps log.

Check: no row is blank; every `always` row has its control; every `none` row names a check, a walk or a reader and the command that showed it red; every test in the diff names a row; the planted-fault run is in the note with what survived.; every check-then-act has its late-hold row, every touched route its grid rows, every multi-path outcome a row a path, every hold row both states, and every notice its words.

## The same table, for different work

| Work | The claim | Usual row |
|---|---|---|
| New behaviour | each criterion | by the three questions |
| A repair | "the reproduction fails before and passes after" | `once`, `test`; `always` if the fault was in the "Never wrong" list |
| A refactor | "behaviour is unchanged" | `none`, `check:` the tests that already pass; no new test |
| A new or changed check or tool | "it goes red on the fault it is for" | `once`, `shown:` a planted fault |
| A data change or migration | "nothing is lost" | `always`: counts before and after, and a restore tried |
| Speed or cost | "under the limit" | `once`, `measured:` |
| A record or document | "it says what is true" | `none`, `read:` or `shown:` the command it quotes |

## Good rows and bad rows

- Good: "another customer's order cannot be read | always | test + control | a missing ownership check | the same fault on a different route".
- Bad: the same claim marked `once` with `journey`. A journey walks the allowed path and never tries the forbidden one.
- Good: "the button's label is translated | none | check: the strings check; walk | a missing string | awkward wording".
- Bad: "the total is right | once | test", where the test recomputes the total the way the code does (`test-first.md`, rule 5). It cannot fail.
- Bad: a row whose Misses is "nothing". Every proof misses something; say what.

## Whether the levels are right, two numbers a release

Faults that reached a person, or a later step, that no row caught: too many means levels are too low. Tests that still pass when the code they cover is broken on purpose: those rows prove nothing and go, or are rewritten.

## What the project must supply

Its "Never wrong" list in `AGENTS.md`. A way to plant faults in changed code only (Stryker, for .NET and for JavaScript, is one; measure its run time on one part before making it a rule, and keep tests that need a real database out at first). In the harness profile, a gate step that reads the table and refuses on the Check above; in the light profile the reviewer makes that check by rule 8. The item form has its `Proof` heading and the sealed-tests, build and review skills follow this method; the gate step is not in the kit yet, so nothing but the reviewer refuses a bad table.

## What published work says, read on 22 November 2026

Read by helper sessions in one day; the figures were not checked a second time, and "preprint" means not yet peer reviewed. These are reasons, not proof that this method works: no study has tested a table like this one.

- **Tests an agent writes for itself are weak.** The best model on one benchmark covered 35.2% of the code and caught 18.8% of planted faults (TestGenEval, ICLR 2025, `arxiv.org/abs/2410.00752`); agents reproduced a real bug in 18.5% of tasks (SWT-Bench, NeurIPS 2024, `arxiv.org/abs/2406.12952`).
- **Tests from outside the builder help.** One system solved 94.3% of tasks with tests people wrote and 69.8% with its own (TDFlow, `arxiv.org/abs/2510.23761`). Rule 1.
- **Lines covered is not proof.** At Meta, 277 of 571 useful generated tests would have been discarded by a coverage rule (`arxiv.org/abs/2501.12862`). Rule 7.
- **Tests written from the code lock its faults in:** 8 to 17% of generated regression tests asserted the faulty behaviour (preprint, `arxiv.org/abs/2610.11835`). Rule 1.
- **Agents cheat mostly by changing the test,** more on hard or impossible tasks. Tests the builder cannot change stopped that without hurting honest work, and did not stop code that special-cases the tested inputs; a strict brief and a way to stop and flag cut cheating sharply for some models and little for others (ImpossibleBench, `arxiv.org/abs/2510.20270`). Rules 4, 5 and 7, and the `property` proof.
- **A model reading the work missed 35 to 58% of cheats** on realistic tasks (the same paper). The review does not replace rule 7.
- **Not known:** how many tests are enough (no number anywhere); whether a separate test writer helps beyond sealing (never tested in a controlled, repeated study); whether hooks that block test edits work (never measured); any measured result for generated-input tests outside Python.
- Rule 6 and the Catches and Misses columns rest on practice, not measurement: published skill sets ask the same (Matt Pocock's `tdd`, Addy Osmani's review skill, obra's Superpowers, gstack's test audit).

WHO DECIDES. The owner: the "Never wrong" list, and any project rule this replaces (for example "one test for every criterion"). The session: every row inside those.
