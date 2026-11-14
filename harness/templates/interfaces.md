# What a project fills in: the gate, the scaffold, the contract tests, the CI command

These depend on the stack, so the kit ships what each must do, not its code. Name each command in `factory/harness.json`, `commands`. Until a project has one, its row in the briefs is skipped and the super's `NOW.md` says so.

## The gate

The kit's `factory/tools/gate.mjs` is the gate for a work item: criteria, seal, review, release. A project may wrap it with checks of its own, keeping its two calls and their exit codes:

- `<gate> work/<lane>/<package>` prints `next: <step>`; exit 1 when stopped.
- `<gate> work/<lane>/<package> --can-start tests|build|review|release` exits 0 with `<step> may start`, or 1 with each reason.

What the first project added, worth adding where it fits: every criterion resolves to a requirement in the product source; a package holds 20 to 40 criteria; the seal names the tests' own command; release only from the package's branch, never the main branch.

## The scaffold: a module's skeleton from its design

`<scaffold> <module>` writes the skeleton; `<scaffold> <module> --check` writes nothing and exits 1 when a rerun would change a file.

1. **It reads** the design in its frozen form (seams, endpoints and roles, tables) and the hand-written code, never its own output.
2. **It writes,** into one generated folder per module, called by nothing until a builder calls it: each interface the module gives that no hand-written code declares; each one it takes whose owner has not written it; every designed endpoint not mapped by hand answering "not built"; a record and a draft table per table not built; every designed call between modules, listed in one place a check reads; and a `SCAFFOLD.md` of what it wrote, what it left to the hand and what it could not read.
3. **Stand-ins, in tests only:** one per interface taken from an owner not built, answering the closed set's denial, an empty list or the least value; and one contract per such interface, "an unknown subject is answered, and denied", that the stand-in passes and the owner's real code will pass too. A release check proves no stand-in reaches a build.
4. **Rules:** every generated file carries a marker in its first line, and a file without one is never overwritten; a rerun is idempotent and depends on no clock or machine; when the owner builds a piece by hand, its generated copy goes.
5. **Sources and projects:** every generated piece carries its `Source:` line (the design part and the requirements it comes from), which the builder keeps and corrects; and a module whose code project does not exist yet gets it created, so the first build starts from a module that compiles.

## The sources step

`node factory/tools/sources.mjs`, one CI step, ships with the kit: every hand-written file under `sourcesCheck.code` has a `Source:` comment line whose files, sections and requirement ids resolve. Code that was there before the check began is listed once with `--write-backlog`; it is reported, not red, until a branch changes it, and a backlog line whose file now passes is red until removed, so the backlog only shrinks. A project whose code units are finer than files (a class, an endpoint group) adds that check in its own CI.

## The sealed rerun (being built)

"Proven" had meant "passed once, at its merge": a later package's CI ran only its own sealed tests, so nothing reran a merged package's. The script being built on the first project reruns every merged package's sealed tests on the main branch on a schedule, through the slot, and writes the date of the last green rerun beside the count of criteria proven. Until a project has one, its proven count says "as of each package's merge".

## The contract tests and the integration run

One CI step, after the unit and sealed tests.

1. **The seam map,** read at run time from the designs, the list of calls and the built code: each seam is built (both sides exist, the call is listed) or waiting, with the reason.
2. **A contract test per built seam:** the provider's real code, asked an unknown subject, must answer within the error set, not throw; and every fake of it in the consumer's tests that is not scripted or a fault must answer in the same shape. A generated stand-in whose owner is now built is red: rerun the scaffold.
3. **Events:** every event a built consumer takes, as the providers really emitted it during the run, carries each field the consumer marks required, of its type.
4. **The integration run:** the cross-module flows through real modules, no stand-ins; then one walk per surface asking every read endpoint the host maps. A server error is red; "not built" is counted.
5. **Mismatches** go in a table in the step's own README, each skipped with its reason, so CI stays green and the mismatch visible; a row whose mismatch no longer occurs turns red, so the table cannot go stale. The super sends each to the module that must change.

## The CI command, in its slots

`commands.ci` is the project's own; the kit ships what runs around it.

1. **Alone when it must be.** A CI whose timed tests go red beside other heavy jobs runs with `--alone`: `node factory/tools/slots.mjs ci --alone --label <package> -- <commands.ci>`. It takes every heavy slot, and while it waits for them no other job takes one.
2. **Suites side by side.** The slot script tells the command how many heavy slots it holds, `FACTORY_HEAVY_SLOTS`. A CI that holds more than one may run its test suites through `factory/tools/side-by-side.mjs`, two at a time unless `FACTORY_CI_STREAMS` says otherwise, when each suite brings up what it needs for itself. Every suite still runs and a red one stays red.
3. **A record per run:** each step's and each suite's seconds, kept for every run, not only the last. With the slot script's `log.jsonl` it is what `factory/methods/throughput.md` reads.
