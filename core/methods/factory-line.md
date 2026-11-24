# The factory line: everyone adds to the final rollout

Read by the orchestrator once, and by any session that finds a defect made at an earlier step. It names the stations, the rule for defects, when to call the council, and what the line is measured by.

THE PRINCIPLE. Every step of the work is a station on one line, and nobody's output counts until it reaches the rollout: a journey step that runs, is walked through, is accepted and is on the main branch. Each station takes a defined input, adds one thing the rollout needs, and passes it on only through its exit check.

## The stations

| Station | Adds | Exit check |
|---|---|---|
| 1. Objective | who does what, and what they see; requirements with examples | `objectives-and-criteria.md` |
| 2. Journey | the steps, each with its screen or operation and the requirement it proves | `journeys.mjs` |
| 3. Work item | criteria, journey steps, the paths it may write | `criteria.mjs` and the gate |
| 4. Contract | the contract parts the item adds or uses | the project's contract validators |
| 5. Build | the code, layered inside the item (`layered-build.md`) | the gate and the project's checks |
| 6. Tests | sealed tests, each failing first against a broken copy | `seal.mjs`; the journey's run |
| 7. Review | a reading of meaning against the objective | "clear" in `## Review` |
| 8. Merge | the item on the main branch, its branch ended | the merge's checks; `orphans.mjs` |
| 9. Walkthrough and acceptance | the journey shown working, signed | `journeys.mjs --walkthrough`; the owner |

A station with no script yet keeps a written checklist until it has one. Add a script when a defect gets past the checklist.

## A defect goes back to where it was made

A station never repairs another station's defect quietly. When a review finds a criterion that cannot fail, or a builder finds an operation missing from the contract:

1. That item stops at the station that found the defect.
2. The fix is made at the station that caused it: the criterion is rewritten, the contract gains the operation.
3. That station's exit check gains a rule, so the same defect cannot pass again.

This is how the checks grow. The alternative is another audit.

## The council settles what a station cannot

A station sends a question to the council only when its inputs conflict, or say nothing, never for routine work. The council skill picks the size: a ruling for one point a higher source nearly answers, a panel for a batch of gaps in one area, a full council for scope, contracts and process. Every answer has a time limit, is written once, and is written back into the source it settles: the requirement, the journey, the contract or the item. The same question coming back a second time is a defect in that source's exit check.

## What the line is measured by

| Measure | Counts | Read by |
|---|---|---|
| Output | journey steps accepted a week; first-pass yield (items that pass every exit check first time) | `journeys.mjs --trace`; the gate's history |
| Economy | tokens and spend per accepted journey step, by station; review readings per item; work redone | `tokens.mjs`; review records |
| Time | time each item spends being worked on at each station; time from objective to walkthrough; time waiting between stations | `throughput.mjs`, `waits.mjs` (harness profile); git |

The three pull against each other: one more review reading may raise quality, but it costs economy and time. Unless the owner says otherwise, time comes first while waiting is more than half the time from objective to walkthrough, and economy second. Fix the cause at the earliest station you can. A defect stopped at stations 1 to 3 costs minutes; one stopped at 7 to 9 costs a rewrite.

**Work in progress.** Each lane holds a limit: by default two items per builder lane and one per review seat. A lane at its limit finishes or ends an item before it starts another. Otherwise waiting grows unseen and branches are left behind (`branch-lifecycle.md`).

## What it does not change

The gate, the seal, the test-first rules, the review, the council and the owner's reserved decisions stay as they are. The line names them as stations and adds one rule: a defect goes back to where it was made.

Check: every station has an exit check or a written checklist; every defect found late names the station that made it and the rule added there; every council answer names the source it was written back into.
