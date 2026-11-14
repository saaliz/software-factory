# Build — the brief for one module's sealed package

The lane starts one builder (`factory-harness:factory-builder`) per sealed package with this brief, the module and the package folder. The builder is the vendor that did not write the tests. The base is the skill `factory-build`; this brief adds contract first, sources and the self-review.

ONE GOAL. Make the package's sealed tests pass with the smallest code the design describes, so it can merge.

MODEL the middle tier; the high tier when the package touches rights, audit, safety, money or a send. TOKEN BUDGET about 800,000. Helpers: at most one, the low tier, for narrow reading. Never start sessions. SOURCES: `factory/harness/super-rules.md`, SOURCES.

SKILLS: `context-engineering`, `incremental-implementation`, `api-and-interface-design`, `source-driven-development`; `security-and-hardening` for rights, audit, money or a send; `performance-optimization` when a criterion holds a response budget; `code-simplification` for the refactor at the end. METHODS: `factory/methods/test-first.md`, all of it; `diagnosing.md`; `deep-modules.md` for every interface you add; `handoff.md` for your note.

READ, by search: the module's whole design front page and its seams both ways; the requirements behind the package's criteria; the architecture's headings; the package's `item.md` and `2-sealed-tests.md`; its sealed tests, read only; the design parts its criteria name; the skeleton's `SCAFFOLD.md` and the generated code you replace.

DO.
0. **Contract first.** The skeleton already holds the module's interfaces, routes and records. Add the logic behind them; do not design them again. A hand-written contract keeps the generated one's names, signature and shape exactly; one that cannot carry a criterion is a note for the lane in `3-build.md`, never a change you make.
0a. **Sources.** At the head of each hand-written class, endpoint group, migration and job, one comment: `Source: <design file and section>; <requirement ids>; <principle, if any>`. A piece with no design line behind it is not built; it is a note.
1. Criterion by criterion, by `test-first.md`. The code goes beside the generated folder, never in it; once a hand-written piece exists, rerun the scaffold so its generated copy goes.
2. After each criterion, one line in `3-build.md`: the criterion, the files, the tests, tokens so far, and for each new unit test the failing line its red run printed before the code existed. A test with no red line is a finding.
3. A criterion that needs a piece another module has not built: leave that criterion only, name the missing piece in `3-build.md`, build the rest. Never work around it.
4. Before handing over, review your own diff by `factory/harness/briefs/review.md`, both axes, as the reviewer will; fix every must-fix you find; list what you checked. Run the project's architecture and type checks once.
5. At the end: refactor with everything green; the scaffold's `--check` unchanged; merge the main branch's tip into your branch; CI naming the package, through the slot, green.

YOU MAY CHANGE ONLY the module's code and unit tests, its registration, and the package's `3-build.md`. Sealed files and designs stay as they are.

PROOF. The sealed tests and every unit test green; CI green; `node factory/tools/gate.mjs work/<lane>/<package>` shows the seal holds.

LEAVE. Commits on your own branch, one per criterion or fewer; never merge into or push the main branch. Final note, at most ten lines: criteria green, CI, anything for the reviewer, tokens; the last line says what is half-done, or "nothing half-done".
