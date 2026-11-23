# Layered build

The default order for any session that writes code (`factory/build-order` holds `layered`). The other order, tests sealed before the build, is `tests-first`; the gate reads the file and enforces whichever it names.

## The layers

Build a wave of work items one layer at a time, across all its modules, before the next layer starts:

| Layer | What it holds | Layer check (a script, not a new test) |
|---|---|---|
| 1. Contracts | API, event, screen and schema contracts for every item in the wave, corrected and complete | contracts validate; generated code matches (`--check`); every operation and event an item needs exists; each item traces to a requirement |
| 2. Database | migrations, grants, row-level security, outbox and inbox, for all modules in one pass | migrations apply forward on a throwaway database; the schema equals the contract; every tenant table has forced row-level security; each role holds only what its contract grants |
| 3. Seams | ports, value and error types, registrations, routes; a stub refuses with "not built", never succeeds | the whole system compiles; every port has a real or refusing implementation; registered routes equal the API contract |
| 4. Logic | domain rules, workflows, adapters filled in | independent review, and the full existing test suite |
| 5. Tests | acceptance tests for every item, then the release steps | below |

A layer starts when the previous layer's check passes for the wave. A gap found in a later layer goes back to the layer that owns it (a missing operation is a contract fix), never patched where it was found.

## Every merge, every layer

Build, lint, types, static analysis and secret scan pass. Every existing and sealed test still passes. A merge that breaks one is reverted or fixed before the next build starts.

## The tests layer

1. A session that built none of the item writes its acceptance tests from the item's criteria (`## Criteria`, the requirement's given / when / then), never from the code. `factory-sealed-tests` is the skill.
2. Each test must fail against a deliberately broken copy of the code: remove the behaviour it checks, or apply the item's named counterfactual, run, see it fail after its setup marker, restore the copy. A test that passes against the broken copy is rewritten.
3. Seal the tests (`node factory/tools/seal.mjs`). Run them against the built code.
4. A failing test goes to the builder, who fixes the code. A test that looks wrong is a question for the owner, never an edit.
5. A defect found here gets a failing test first, then the fix.
6. Then the item goes on to review and release as usual: the gate refuses review and release until the tests are sealed and the seal holds.

## Keeping gaps early

- Before each layer of a wave: one read-only session checks every item against its contracts and requirements and lists what is missing. Each missing piece is decided before the layer starts.
- Every builder's "stopped, question" goes to one gap log; the orchestrator decides it the same day or sends the owner's ones in one batch.
- At each layer end: one session of a different vendor traces every requirement in scope to items, code and planned tests, and reports untraced requirements, untraced code and anything outside scope.

## Done means

`node factory/tools/gate.mjs work/NN-words` prints `next: done`, after the layer checks above passed for the item's wave.
