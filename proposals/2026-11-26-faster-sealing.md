# Faster sealing: one proposal

**Proposed in the School ERP trial, 26 November 2026; not yet accepted there.** Nothing below has been run. It answers the owner's question why sealing took so long.

## The problem

In the trial a work item spent 7 to 11 working hours in its seal. Five causes:

1. **Size.** Bigger work items meant 80 to 157 proof rows. A role-against-route grid adds every role against every route: one item had about 1,180 cases.
2. **Proof by broken copies, one build each.** One item was on its fifth run.
3. **Waiting for heavy slots.** The main branch was walked 18 times in a day, each full walk holding all three slots for about an hour, and every test run started its own database.
4. **Rules that change mid-seal.** Three new rules caused two reseals of one item.
5. **Setup faults found late.** A channel never switched on in the tests was found at build time.

## The proposal, in four parts

**A. Less to prove in each work item.**
- **A1. The grid reader is proved once.** The shared reader of grid cases gets its own planted faults once, held by a hash guard. An item's generated grid rows then become a `check:` row (the generator's check and the generated cases run green) and need no broken copies. Broken copies stay for the item's own behaviour rows.
- **A2. One shared, tested setup for each module** (channels on, a test tenant, roles). Every item's tests reuse it; an item never writes its own again.
- **A3. Recurring rulings become rules.** A ruling that will come up again becomes a numbered line in the proof-table method. The next prover applies it without asking.

**B. Proving it faster.**
- **B1. One build for all the broken copies.** Each planted fault is switched on by a setting, so one build and one run show every fault.
- **B2. A shared test database** (`core/methods/shared-test-database.md`) takes the database start out of every run.
- **B3. Full walks of the main branch only on the scheduled run.** A merge walks only the walks it affects; a tooling merge that touches no walk path runs none.

**C. The build starts sooner.**
- **C1. Seal in halves.** The first half is sealed and the build starts on it while the second half seals. Each half is a complete, tested piece.
- **C2. New rules apply only to seals not yet started.** A seal under way finishes under the rules it began with. A safeguarding rule is the one exception.
- **C3. Questions come early.** The prover sends every ruling it needs within its first hour, in one message, before drafting tests.

**D. The right effort in the right place.**
- **D1. The model for each row.** The cheaper tier drafts the `once` rows and the generated grid rows. The top tier writes and confirms the `always` rows (rights, safeguarding, sends, money) and gives rulings.
- **D2. At most two test-writing agents per seal,** each taking one heavy slot at a time.

## Unchanged

Every `always` row keeps its test and control; the never-wrong list; the orchestrator confirming every table; readings until clear for rights, safeguarding, money and sends; red allowed nowhere.

## Expected effect, to be measured

Seal time from about 9 hours to about 4, most of it from A1 and B1 (five runs become about two); the build starts about half a seal earlier (C1). Record each seal's time, runs and tokens in the session log and compare over the next three work items.

## Cost and order

A1, A2 for the first module and B1 are tooling: about a day for one cheaper-tier session, test-first. B2 is being built. A3, C1 to C3, D1 and D2 are method changes, written into the proof-table method the same day. Seals already under way take C2, C3, D2 and B1 at once, and A1 and A2 only at their next reseal.

## Decision asked

Accept this as one change to how a work item is sealed.
