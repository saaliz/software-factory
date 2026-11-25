# Build — the brief for one module's sealed package

The lane keeps one builder (`factory-harness:factory-builder`) for each module's life and gives it each sealed package with this brief, the module and the package folder (ONE BUILDER A MODULE). The builder is the vendor that did not write the tests. The base is the skill `factory-build`; this brief adds contract first, sources and the self-review.

ONE GOAL. Make the package's sealed tests pass with the smallest code the design describes, so it can merge.

MODEL the middle tier; the high tier when the package touches rights, audit, safety, money or a send. TOKEN BUDGET about 800,000. Helpers: at most one, the low tier, for narrow reading. Never start sessions. SOURCES: `factory/harness/super-rules.md`, SOURCES.

SKILLS: `context-engineering`, `incremental-implementation`, `api-and-interface-design`, `source-driven-development`; `security-and-hardening` for rights, audit, money or a send; `performance-optimization` when a criterion holds a response budget; `code-simplification` for the refactor at the end. METHODS: `factory/methods/test-first.md`, all of it; `affected-testing.md` for repairs; `diagnosing.md`; `deep-modules.md` for every interface you add; `handoff.md` for your note.

READ FIRST, after any compaction too: the module's `factory/records/<module>/BUILDER-NOTES.md`, which you keep under 150 lines (conventions, decisions, traps). Then, by search: the module's whole design front page and its seams both ways; the requirements behind the package's criteria; the architecture's headings; the package's `item.md` and `2-sealed-tests.md`; its sealed tests, read only; the design parts its criteria name; the skeleton's `SCAFFOLD.md` and the generated code you replace.

DO.
0. **Contract first.** The skeleton already holds the module's interfaces, routes and records. Add the logic behind them; do not design them again. A hand-written contract keeps the generated one's names, signature and shape exactly; one that cannot carry a criterion is a note for the lane in `3-build.md`, never a change you make.
0a. **Sources.** At the head of each hand-written class, endpoint group, migration and job, one comment: `Source: <design file and section>; <requirement ids>; <principle, if any>`. A piece with no design line behind it is not built; it is a note.
1. Criterion by criterion, by `test-first.md`. The code goes beside the generated folder, never in it; once a hand-written piece exists, rerun the scaffold so its generated copy goes.
2. After each criterion, one line in `3-build.md`: the criterion, the files, the tests, tokens so far, and for each new unit test the failing line its red run printed before the code existed. A test with no red line is a finding.
3. A criterion that needs a piece another module has not built: leave that criterion only, name the missing piece in `3-build.md`, build the rest. Never work around it.
3a. For each repair, run only the changed-behavior regressions and small direct contracts from reviewed exact mappings, through the shared heavy slot. Preserve compile/type/static/seal/source/boundary checks and return compile feedback in this builder's retained context before handoff. Give fresh workers this brief and source pointers, not the orchestrator history. Targeted green is not delivery or acceptance proof.
4. Before handing over, sweep the package by kind, `node factory/tools/sweep.mjs work/<lane>/<package>`, and paste its hits into `3-build.md`, each kept or fixed; then review your own diff by `factory/harness/briefs/review.md`, both axes, as the reviewer will; fix every must-fix you find; list what you checked. Run the project's architecture and type checks once.
5. At the explicit build-delivery checkpoint: refactor with required tests green (`node factory/tools/package-tests.mjs work/<lane>/<package>`, the package's own sealed tests, never the whole suite); the scaffold's `--check` unchanged; the lane then merges the main branch in once and runs the merge check. Do not rerun that whole command after each fix. Write what the next package should know in `BUILDER-NOTES.md`.

YOU MAY CHANGE ONLY the module's code and unit tests, its registration, the package's `3-build.md`, the module's `BUILDER-NOTES.md`, and reviewed impact bindings for those repairs in `factory/affected.json`. The mapping update changes no adapter, verification policy or gate. Sealed files and designs stay as they are.

PROOF. Failing regression/counterexample line, affected base/head/registry pins, reasons, direct contracts and counts for repairs; full/E2E not run until its checkpoint. At delivery: sealed tests and every required unit test green; full CI green; `node factory/tools/gate.mjs work/<lane>/<package>` shows the seal holds. Independent QA and fresh review on both semantic axes remain required.

LEAVE. Commits on your own branch, one per criterion or fewer; never merge into or push the main branch. Final note, at most ten lines: criteria green, CI, anything for the reviewer, tokens; the last line says what is half-done, or "nothing half-done".
