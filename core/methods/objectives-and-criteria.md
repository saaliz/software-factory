# Objectives and criteria: one yardstick, set before writing

Used by whoever writes a milestone, a work item or a requirement, and by every review. `node factory/tools/criteria.mjs work/NN-words` checks the parts a script can check.

THE PROBLEM IT STOPS. On its second project the kit's owner saw eight whole-plan audits in six weeks, then two full rewrites of ticket sets, one taking eleven review rounds. Each audit measured against a different idea of "good", so each found what the last had not looked for. The criteria described build steps ("create the conversation migration"), which no user could notice failing. A clear objective, criteria a user could observe, and a script for what a script can check stop the loop together. Any one alone does not.

## The objective comes first

Every milestone and every work item opens with `## Objective`: one sentence naming who does what, and the result they see. "A member asks in English or Arabic and gets a cited answer drawn only from documents they are assigned; anyone else gets nothing." Under it, `## Journey steps` names the journey steps it proves (`user-journeys.md`) and `## Not in scope` names what it leaves out.

A review and an audit judge the work against its objective, and nothing else. A new yardstick is a decision for the owner, recorded once, not a reason to rewrite.

## A criterion

Each criterion under `## Criteria` is one line, starting `- `:

| Rule | Checked by script | Example that fails |
|---|---|---|
| (a) Observable: what happens is seen through something a user or a caller reaches (a screen, an operation, an event, a query result) | no build verb after "then" | "then the migration creates the table" |
| (b) One behaviour | one "then" per line | "then it saves, and then it emails" |
| (c) A named starting state from the shared fixtures | a "given" | "when a user asks..." with no starting state |
| (d) A counterfactual: what must not happen, or the broken copy that turns its test red | `## Counterfactuals` holds `- C<n>: ...` for every criterion | a criterion with no line in `## Counterfactuals` |
| (e) Readable without opening another file | not an identifier alone | "- QRY-AC-042" |
| (f) No implementation words | none of: create, add, implement, migrate, refactor, scaffold, wire, write the code | "then implement the verifier" |

Form: `- Given <starting state>, when <action>, then <observable result>.` Criteria are numbered by their order: the first is C1. A requirement that already states its example in this form is copied word for word, as `factory-spec` says.

Build steps are not criteria. They go in the item's note or brief as a checklist (contract, database, seams, logic: `layered-build.md`).

## Old criteria

Rewrite an existing item's criteria to this standard only when that item is next to be built. Rewriting every item at once is the whole-plan rewrite this method exists to stop.

## A set of work items

When a whole set is written at once, as in a milestone rewrite, check the set by script before anyone reviews it: every operation, job or screen a criterion names is built by its item or by a prerequisite the item names; no criterion leans on work of a later release; no criterion is both claimed in full and claimed in part; nothing in the contracts of the release is left without an item. On the second project such a check read 430 criterion claims in seconds, after eight review rounds had sampled them a few dozen at a time. A deliberate exception is written next to the set with a reason a reviewer can check, and an exception whose finding no longer occurs fails the check. The kit has no general tool for this yet: the check reads one project's contract files.

## The script

`criteria.mjs` runs only on items that have `## Objective`, so items written before this method are left alone. The gate runs it too: an item with `## Objective` takes no step, the build included, until it passes. It checks form, not meaning. Meaning is the review's job, against the objective, in one round.

Check: one objective sentence; every criterion has given, when and one then; every criterion has its counterfactual line; no criterion is an identifier alone or a build step.
