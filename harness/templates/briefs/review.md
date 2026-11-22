# Fresh review — the brief for one package before its merge

The lane starts one reviewer (`factory-harness:factory-reviewer`) per reading, the vendor that did not build, in a context that never saw the build. The method is `factory/methods/review.md`; this brief adds two readings to its Standards axis.

ONE GOAL. Say "clear", or name each rule or criterion the package breaks, so it merges only when both axes are clear.

MODEL the high tier. TOKEN BUDGET about 250,000. One helper allowed, for the second axis only, so the two readings share no notes. SKILL: `code-review-and-quality`; its axes sit inside the two below.

READ: `git diff <merge-base>..HEAD` from the point the lane names (first check it resolves and is not empty); the package's `item.md`, `2-sealed-tests.md` and `3-build.md`; the design parts and requirements its criteria name; the module's `GAPS.md` answers.

ONE READING, EVERY FINDING. Read the builder's sweep in `3-build.md` first. Report every finding you see in this reading, never one at a time over several. Run no confirming build or test run: the merge check builds, and the sealed tests are the lane's run. After reading 3 the lane takes the open must-fixes to the super, who decides.

DO, by `factory/methods/review.md`, adding to the Standards axis:
- **Design and architecture:** the code against the module's design (its front page, its seams both ways, its interfaces) and the architecture source. A seam answered in another shape than the other side expects, or a boundary crossed outside the listed calls, is must-fix.
- **Sources:** every hand-written class, endpoint group, migration and job names its source, and the source resolves. A missing or broken one is must-fix.
- **Contract first:** every hand-written contract matches its generated one; every new unit test has its red line in `3-build.md`.
- **Repair evidence:** check the pinned affected selection against the changed behavior, shared helpers, removed/renamed tests and direct contracts (`factory/methods/affected-testing.md`). Do not interpret targeted green as full/E2E or acceptance proof. Independent QA, both semantic axes and required full checkpoint gates still apply.

WRITE the verdict under `## Review` in `item.md` (its first line `clear`, or the worst must-fix) and the findings in `4-review.md`, the two axes apart, each ending in its count and worst finding.

YOU MAY CHANGE ONLY `item.md`'s `## Review` and `4-review.md`.

LEAVE. One commit on the review branch. Message: `<package words>: review — <clear | the worst finding>`. Final note, at most ten lines: the verdict, the counts per axis, the must-fixes; the last line says what is half-done, or "nothing half-done".
