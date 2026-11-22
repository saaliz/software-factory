---
name: factory-review
description: Review step of a work item. A fresh session that did not build it reads the diff against the rules and the criteria, and writes clear or not clear into item.md. Use once the build's sealed tests are green, and again after every return to the build.
---

# Review

Follow `factory/methods/every-step.md`, `factory/methods/review.md` and `factory/methods/proof-table.md`, rules 6 to 8. Model: the high tier, and another vendor's model where one is at hand. Never the session that built it.

## Start

`node factory/tools/gate.mjs work/NN-words --can-start review` must print `review may start`. It refuses without the gate's own green run (`proof.json`) on the same seal and the same code; if it refuses, stop and say what it printed. The plain gate goes on printing `next: build` until a review writes `clear`; this command is the check.

## Read, and nothing more

- The work item's `item.md`, `2-sealed-tests.md` and `3-build.md`, last lines first, and every decision file `item.md` names under `## Answers`: an answer counts as part of the spec.
- The work item's own commits: `git diff $(git merge-base main HEAD)..HEAD`, unless `AGENTS.md` names another base. Commits that are not the work item's (set-up, the owner's) are outside the review. Search the diff for what you are checking.
- The requirements behind a criterion, and a rule, only when you are about to name one.

## Do

- First the table under `## Proof` in `item.md`: a "Never wrong" criterion below `always`, a blank row, a test that names no fault it would catch, or a proof that could not fail is a must-fix finding. So is a change the build made to anything that judges the work, unless its note gives a reason you accept.
- Show the proofs can fail. For each `none` row: break the claim, run the check the row names, see it red, put the code back, write the command beside the row. Then plant small faults in the changed code only (the project's tool; with none, by hand, one for each `always` row) and run the sealed tests. A check that stays green, or a planted fault no test catches, is a must-fix finding for whoever wrote the tests, not for the builder. Leave the tree as you found it.
- The two readings of `review.md`: standards, then spec.
- Look hardest at permissions, personal data, migrations and anything that cannot be undone.
- Skip what the gate, the seal and the tests already hold.
- An answer marked the owner's and not yet confirmed is a finding for the owner, listed apart from the two axes. It holds the release until the owner confirms it, and it does not go back to the build.
- Where two written rules disagree, say so as a finding for the owner; grade the code by the more specific rule.

## A second review

Check each earlier must-fix finding against the commits made since that review, and write it as met or not met. Then read the new commits on both axes. Replace what is under `## Review` and `4-review.md`.

## Done means

- The first line under `## Review` in `item.md` is `clear`, or `not clear:` and the worst finding with its file and line. The findings follow, each "must fix before release" or "can follow".
- Anything but `clear` sends the work item back to the build, to whoever wrote the tests, or to the owner: say which.

## Commit

`NN words: the review — <clear, or not clear and the worst finding>`

## Note

`4-review.md`: what was read, the two axes apart, each ending in its count and its worst finding; then the owner's items.
