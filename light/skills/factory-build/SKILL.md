---
name: factory-build
description: Build step of a work item. Turn its sealed tests green with the smallest code that does it, one criterion at a time, without editing a sealed file. Use after the gate says build may start, and again when a review sends the work item back.
---

# Build

Follow `factory/methods/every-step.md`, `factory/methods/test-first.md` and `factory/methods/affected-testing.md`. Model: the middle tier, chosen by whoever started you; the high tier where a criterion touches rights, safety, money or something sent to a real person, or after two failed attempts. Keep this builder's context for repair passes; a fresh worker receives only its brief and source pointers. Return compile/type feedback before handing off.

## Start

`node factory/tools/gate.mjs work/NN-words --can-start build` must print `build may start`. If it does not, stop and say what it printed.

## Read, and nothing more

- The work item's `item.md` and `2-sealed-tests.md`, and every decision file `item.md` names under `## Answers`. An answer there is built like a criterion, confirmed or not; confirming it is the owner's.
- The sealed tests, read only.
- The code you will change, by search.

## Do

- Criterion by criterion: a unit test, see it fail, the code, see it pass. Criteria that share one piece of code may share a cycle and a commit.
- After each fix, run the changed-behavior regressions and small direct contract checks with reviewed exact mappings. Keep compile/type/static, seal, source and boundary checks. Run full sealed/package/project commands at the explicit build-delivery checkpoint, not after each repair.
- A sealed test that looks wrong is a question, with the file, the line and what the requirement says. Carry on with the other criteria.
- A failure you cannot explain in one probe goes through `factory/methods/diagnosing.md`.
- At the end, with everything green, refactor once (`test-first.md`, rule 4).

## Coming back from a review

- Read `## Review` in `item.md` and `4-review.md`. Fix every finding marked "must fix before release" that names code or a test. A finding marked for the owner is not yours.
- Leave `## Review` as it is: the next review rewrites it. Add to `3-build.md` under the line `After the review:`.

## Done means

- At build delivery, the required sealed tests' command is green, counted from its output.
- `node factory/tools/seal.mjs work/NN-words --check` prints `the seal holds`.
- The project's whole test command is green at its required build-delivery checkpoint. A targeted repair pass alone is never "done".

## Commit

`NN words: <what now happens> — <tests green, what is still red>`

## Note

`3-build.md`: per criterion or group, files and tests, failing regression/counterexample line, compile feedback, affected base/head/registry pins, selection reasons/direct contracts and counts; full/E2E not run until its checkpoint; what is still red and anything for the reviewer.
