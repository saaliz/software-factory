---
name: factory-spec
description: First step of a work item. Write work/NN-words/item.md from the project's requirements until the gate says tests may start. Use when starting a new piece of work a person can see or do.
---

# Spec

Follow `factory/methods/every-step.md`. Model: the high tier.

## Read, and nothing more

- `factory/item.md`, the form.
- The requirements this work item draws on, by search, only the parts it needs.
- The last work item's note, if this one continues it.

## Do

- Make the folder `work/NN-words/` with the next number, starting at 01, cut a branch with the same name, and register it in `factory/branches.json` (`factory/methods/branch-lifecycle.md`).
- Write `item.md` from the form. Its title says, in a user's words, what a person will be able to do.
- Write `## Objective` first: one sentence, who does what and what they see. Under `## Journey steps` name the journey steps it proves (`factory/methods/user-journeys.md`), and under `## Not in scope` what it leaves out.
- Copy each criterion word for word from the requirements: one line, starting `- `. A requirement stated outside a list (a signature, a shape, a unit) is a criterion too. Each reads "Given ..., when ..., then ..." and has its line under `## Counterfactuals` (`factory/methods/objectives-and-criteria.md`). A requirement with no example in that form is a gap, not a criterion to invent.
- Keep it to journey steps a person can see or do when it is released, end to end, at most 15 criteria. More means two work items: write the first, name the second in the note.
- A requirement that is missing, unclear or in conflict is a gap: list the gaps in the note, numbered, each with your working answer. Do not invent a criterion, and do not run the council yourself: whoever started you sends the gaps to the council skill as a panel, before the sealed tests.

## Done means

- `node factory/tools/criteria.mjs work/NN-words` prints `criteria hold`.
- `node factory/tools/gate.mjs work/NN-words --can-start tests` prints `tests may start`.
- Every criterion is found word for word in the requirements, checked by a fixed-string search (`grep -F`). The council may later add criteria that end `(answer N)`; those come from its decision file.

## Commit

`NN words: the spec — <how many criteria, what a person will be able to do>`

## Note

`1-spec.md` in the work item's folder: what the gate printed, the gaps and their working answers, anything risky about its size.
