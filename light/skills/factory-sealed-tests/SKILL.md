---
name: factory-sealed-tests
description: Second step of a work item. Write one acceptance test per criterion in item.md, show each fails at the behaviour and not in setup, and seal them before anything is built. The session that writes them does not build.
---

# Sealed tests

Follow `factory/methods/every-step.md` and `factory/methods/test-first.md`, rules 5 to 13. Model: the high tier, because every assertion is a judgement.

## Order

Under `layered` (`factory/build-order`) this step comes after the build: the code exists. Write each test from the criteria, never from the code. Instead of showing it fails before the build, show it fails against a broken copy: remove the behaviour it checks, or apply the item's counterfactual, run it, see it fail after its marker, restore the copy uncommitted. A test that passes against the broken copy is rewritten. Then seal and run it against the built code; red results go to the builder.

## Read, and nothing more

- The work item's `item.md` and `1-spec.md`, and every decision file `item.md` names under `## Answers`. A gap in `1-spec.md` with no answer there goes to the council skill before you write its test.
- The requirements behind its criteria, by search.
- How this project's tests are set up: one existing test of the same kind, as the form. Where there is none, use the plainest form the project's test runner gives.
- The public interface the tests will call (the API, the screen, the event), as it is designed. Name nothing generated or temporary. Where no design names it, choose the path and the name and write them in the note: the builder follows the note.

## Do

- Put the tests in their own folder, apart from the builder's unit tests. No product code.
- One test per criterion in `item.md`, named so the criterion can be found from it. Criteria marked as coming from an answer are criteria like the rest. A criterion no result shows directly is proved through the nearest result that depends on it; say so in the note.
- Make each test print a marker (one line, `setup passed: <criterion>`) once its setup is ready, and only then load and call the code under test. A failure before the marker is setup; a failure after it is behaviour. Code that is not built yet fails after the marker.
- Give them one command and write it in the note and under `## Seal`.
- Run them: every one must fail after its marker. Then show each assertion fails by itself: run once against a throwaway stand-in that returns empty values and refuses nothing, and delete it uncommitted.

## Done means

- `node factory/tools/seal.mjs work/NN-words <the tests' folder>` has written `seal.json`, and `## Seal` in `item.md` names the sealed paths and the command.
- `node factory/tools/gate.mjs work/NN-words --can-start build` prints `build may start`.

## Commit

`NN words: the sealed tests — <criteria covered, the command>`

## Note

`2-sealed-tests.md`: the command, where the code under test must live, what fails where, what is not proved and why, anything the builder must know.
