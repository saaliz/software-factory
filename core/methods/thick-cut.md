# The thick cut: the order of work, from interfaces to a walked screen

For the orchestrator and every brief of a cut, when work is counted in criteria merged while nothing new can be done by a person; when many modules are open and none is finished; when work items wait on providers nobody has built. `parts-not-whole.md` measures that state; this is the order of work that follows from it. **Proposed, not yet run:** adopted on the factory's first project on 22 November 2026 by its owner, before any cut had been built by it, and amended there on 23 November 2026 (steps 2 and 4 together, two cuts at once, bigger cuts) before any cut had merged. The owner's word is needed to adopt it, because it changes the order of work and what proves a merge.

Build order: this method seals before it builds, so a project on it sets `factory/build-order` to `tests-first`. The kit's default, `layered` (`layered-build.md`), builds a wave before its tests are sealed; which order a project runs is the owner's to decide.

A **cut** is one step of a feature that a person can do, from the database to the screen, in every language the product ships, on the main branch in two or three working days. Thick through every layer, narrow in scope.

**Cut size** is a project setting, written in `AGENTS.md`. Start at one step of one feature, about 10 to 25 criteria. Once a cut of that size has merged with its walk green, a cut may take one step of two features, about 40 to 50 criteria (first project, 23 November 2026, after the first cuts were too slow for its owner). Two cuts already sealed apart may be built, walked, read and merged as one, each keeping its own folder and seal.

**Cuts in build at once.** One by default. Two, when they share no module with open work, each with its own walk environment (its own ports and database) and its own share of the token ration (first project, 23 November 2026). Cuts that share a module go one at a time.

A **milestone** is a group of features the owner ordered; it is closed when a person can walk what it promised.

## Ring 1. Once, for every module: interfaces and skeletons

Every interface, event, route and record of every designed module is generated onto the main branch, and each unbuilt piece answers "not built" (the scaffold, `harness/templates/interfaces.md`). Nothing more is written here ahead of a cut: a body with no caller is a guess (`deep-modules.md`).
Check: the scaffold's own check reports nothing to change, for every module.

## Ring 2. Once for each milestone, before its first cut

1. **The cuts, in order,** one line each: the step a person does, who does it, its criteria by name. No criterion of the milestone's features is dropped; what no cut builds stays listed.
   Check: every criterion is in one cut or in the "not in this milestone" list.
2. **The interface freeze.** For every question, event and route the milestone's screens need: its giver, and "real" or "not built". Each "not built" answer goes into the cut that first needs it. After the freeze an interface on the path changes only as a named cut of its own.
   Check: no row lacks a giver and a cut.
3. **The screens, all cuts together,** by whoever owns design, before any is built.
   Check: every cut's step has its screen, every state, every language.
4. **A module starts** only when a cut names criteria in it, every provider those criteria call is real on the main branch or built in the same cut, and its own sealed tests there are green. Keep the number of modules with open work small: three a cut, a starting guess; four for a cut of two features (first project, 23 November 2026).

## Ring 3. Each cut, six steps in this order

No step starts before the check of the step before it reads done, with one exception (first project, 23 November 2026): once step 1's seal holds and the interface freeze lists every contract the cut calls, steps 2 and 4 run together, the back end by one builder and the screens wired to the frozen contracts by another (the other vendor where the project has two). The proving keeps its order: step 3 proves the back end before step 5 proves the screens against it. A contract either side finds wrong goes to the orchestrator; neither side changes it alone.

1. **Seal.** The prover, who will not build (another vendor where the project has two), writes one journey test through the real routes and the real database, its denials first, each with its control (`test-first.md`, rule 8), then the sealed test of each criterion. The journey takes no step through a criterion deferred out of the cut.
   Check: every test fails at the behaviour, after its setup passed, for the reason expected; the seal holds.
2. **Back end written.** The builder writes only what the journey calls, behind the generated contracts. No screen work.
   Check: it compiles; the scaffold's check is clean.
3. **Back end proven.** The cut's sealed tests below the screen, and the affected tests (`affected-testing.md`), run against real providers, with no stand-in on the journey's path.
   Check: every one passes; nothing is "not run".
4. **Front end written,** beside step 2 under the exception above. The front-end builder wires the designed screens to the frozen contracts, then to the proven routes; the design is not redrawn.
   Check: the front end builds and its own tests are green.
5. **Front end proven.** The journey and a scripted walk run in a real browser on synthetic data, at the product's smallest screen, in every language, on ports and a database of their own (never the owner's; a second cut in build has a second set).
   Check: every walk step passes; the screenshots and a recording are kept.
6. **Review, merge, release.** The builder's sweep; one whole reading (`review.md`); one batch of fixes; one second reading. What is still open becomes a named defect with a sealed test in the next cut. Where the cut decides who may see what, protects a person, moves money or sends anything real, readings go on until clear. The one session that merges writes the records in the merge's own commit.
   Check: the fast checks are green on the candidate; the walks are green after the merge; the owner has one line saying what a person can now do, the screenshots, the recording and the commands that open the build. The owner's own minutes on the real screens follow, and the owner may send the cut back.

Once a night, alone: the whole run and every released item's sealed tests on the main branch. A red on a cut's path is fixed before the next step of any cut.

STOP and tell the owner: two working days on one step; an interface on the path that must change after the freeze; anything that is the owner's to decide.

## What the owner sees at each release

Features a person can use on the main branch, of the planned total; walk steps passing, of all; days since something new could be done on screen; tokens for the cut. Criteria merged stays an inside figure, split into "a walked screen reaches it" and "nothing reaches it yet".

## What the project must supply

A scaffold that generates skeletons and marks the unbuilt; a list of the interfaces on a milestone's path with real or not built beside each; one command that brings the build up on its own ports and runs every walk; a gate that knows a cut (screens and module designs together). Where one is missing, the step is done by hand and the record says so.

WHO DECIDES. The owner: adopting this order, the steps 2 and 4 exception, two cuts at once, the cut size, the cap on review readings, the walk as a condition of a merge, and what stops on a red main branch. Tooling that keeps every check does not need the owner's word.

Check for the whole method: every cut's record shows the six checks in order (2 and 4 may run together), each with what ran; no screen was wired to a route whose sealed test was red; no merged cut lacks a walk.

## What the factory's first project found

Read on 22 November 2026 by a council on that project, from its own records; three readers measured and nobody ran a test. These are the reasons for this method, not proof that it works: no cut has yet been built by it.

- Ten days of module-by-module packages added about 1,150 criteria of back end across eleven modules at once. In that time nothing new could be done on a screen, and no module passed two thirds of its criteria.
- Of 409 commits on the main branch in five days, 38 merged a package and 224 only wrote records. Nineteen more packages stood open, at least eight waiting on a provider another module had not built.
- Interfaces written with no caller did not hold: 52 design and interface changes in those five days, each regenerating every module that took the answer.
- Review ran to ten readings on one package; the late readings did find real faults, so a cap on readings has a price that the journey, the walk and a test for every deferred finding must cover.
- Six sessions at once spent one vendor's weekly quota in 38.5 hours, and four idle days followed.
- "Build first, test on a second machine later" never met its condition: the last green whole run was a week old when the council sat, and the count of failing tests in use was from a single run, two thirds of it one cause already repaired.
- Earlier on the same project, a whole feature taken as one unit was sized at 72 days and did not ship; two cuts of 12 criteria each shipped in 2.5 and 4 days.
- On 23 November 2026, before any cut had merged, the owner found the cuts too slow and approved three changes, the reasons for this method's exception, its second cut and its cut size: steps 2 and 4 together once the seal and the freeze hold, proved in order as before; two cuts in build when they share no module, each with its own walk environment; and one step of two features a cut. None had yet been measured when this was written.
