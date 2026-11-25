# A contrarian council on the end-to-end improvement plan · 22 November 2026

Sat on the kit at `345740e`, on a plan the owner pasted into the session (eight gaps, seven phases, an order of eight pieces of work) and his words: "run a council on this ... I want full end to end improvement so there is efficiency in building".

**Status: advice.** It decides nothing that is the owner's. Voiced by one model (Claude Fable 5.2); the seats are those of `council/seats/engineering.md` and are not the people they stand for. The outsider was a helper given the summary below and no tools. The plan was not written by a measuring session, so step 1 of the contrarian form (the study) is the checking table here. Nothing was built or run except reading.

Read: the pasted plan; `light/tools/gate.mjs` and `seal.mjs`; `README.md` and `harness/README.md`, the tables of what is proven; `council/SKILL.md`, `process-change.template.md`, `seats/engineering.md`; `core/methods/thick-cut.md` and `proof-table.md`; the first project's council of the same day and the research report on tests for agents, both from this session.

## The frame

A kit lets AI agents build software in fixed steps: a specification, acceptance tests written and hash-locked by one agent before another builds, a build, an independent review, a merge by one coordinating session, a release. A script, the gate, says which step may start. Today it reads a work item's text file: the headings exist, the lock holds, the review begins "clear". The presence of the builder's note is its sign that the build is done. It never sees whether a test command ran.

On the kit's first project, in ten days, agents merged about 1,150 criteria of back end across eleven modules while nothing new became usable on screen; 38 of 409 commits merged work and 224 wrote records; review went to ten readings; one vendor's weekly quota went in 38 hours; the full run was last green a week before anyone looked. Published work says agents' own tests catch under a fifth of planted faults and that agents cheat mostly by editing tests.

The options: evidence files the gate requires; a check that every criterion has its test; a scheduled rerun of locked tests on the main branch; a table before any test giving each requirement a level of proof; planted faults; thin end-to-end cuts with a browser walk; hard token budgets.

## What the council checked itself

| The plan says | Checked against | Finding |
|---|---|---|
| Evidence of green is in notes and claims, not files the gate reads | `light/tools/gate.mjs`, `state()` and `canStart()` | **Held.** Build done is "`3-build.md` exists"; review clear is the first word under a heading |
| The sealed rerun on main is documented, not built | `harness/README.md`, the proven table | **Held** for the kit. The first project has its own script; nothing is ported |
| No check that criteria and sealed tests match | `light/tools/` | **Held**, and the rule it would enforce changed today |
| "One sealed test per criterion" must not change | `core/methods/proof-table.md`, commit `345740e` | **Did not hold.** The owner replaced it today with a row per claim, some needing no test of their own |
| Hooks for sealed files, main and CI are "strong already" | `harness/README.md` | **Held loosely.** Built and tested; "not yet run on a project" |
| Criteria cap of 15, and 20 to 40 a package, are hard | `gate.mjs`; the first project's records | **Held loosely.** The 15 is an environment setting. The first project moved its package size to 50 on 18 November and to cuts of 10 to 25 on the 22nd |
| With evidence files a malicious builder cannot claim green | the plan's own design: the builder's session writes the file | **Did not hold.** It stops a forgetful builder. A file an agent writes, an agent can write without running anything |
| The light profile has had almost no real use | `README.md` | **Held.** One trial work item |
| Affected testing works for Node exact files only | `README.md` | **Held** |
| The reviewer writes and runs nothing | `light/skills/factory-review/SKILL.md` at `345740e` | **Did not hold.** The review now shows each "none" row red and plants faults |

Ten checked; three did not hold and two held loosely. The plan was written against the kit as it stood before today.

## Openings

**The delivery manager (chair).** The plan makes each step more certain and none of them shorter. On the first project the waste was the unit of work, not the checking. Amend: order the plan behind the thick cut.

**The systems architect.** One part must own "it ran": the gate. Evidence written by the session being judged gives two writers of the same fact. Amend: the gate runs the command.

**The test and quality lead.** I will not remove a check without another that catches the same fault. The plan removes none, which is why it is safe and why it is slow. What it lacks is any proof that a test can fail. Amend.

**The cost lead.** No measure is stated beforehand for the plan as a whole. Hold until it names one: tokens for each cut a person has walked.

**The front-end lead.** Nothing in seven phases asks what a person sees. A walk in a real browser is evidence no agent can write. Amend.

**The devil's advocate.** Do half: the gate runs the delivery command, the rerun is ported, and stop. The first project has not yet built one cut by the new order. Reject phases 5 to 7 for now.

## The outsider

A helper (Claude), given the summary only:

"The obvious point they'd miss: the evidence they already hold says the problem isn't verification, it's the unit of work. Agents produced 1,150 criteria of back-end code while nothing became usable, and 224 of 409 commits only wrote records. A gate that checks evidence files makes the pipeline more trustworthy, but it also makes the wrong pipeline run faster and more rigidly. The owner asked for efficiency. Efficiency here means working software per token, and no step in the current kit measures that. Every option except F and G improves how well work is checked. None of them changes what gets built or when someone sees it. There's a second, quieter point. The gate trusts the builder's note, and review starts with the word 'clear'. Anything an agent can write, an agent will eventually write without doing the underlying thing. The fix is evidence the agent can't author: exit codes, commit hashes and a real browser walk. First: thin end-to-end cuts with a browser walk before merge. Not: planting faults; it is expensive, it is a refinement, and it arrives before you have anything worth mutating. The criteria-to-tests check is a close second to skip, since the table covers the same ground. Number: tokens spent per accepted usable cut, meaning one a person has walked through in a browser, alongside the share of commits that merge work, currently about 9%."

## Rebuttal

**The test and quality lead, to the outsider.** You would skip planted faults as a refinement. The research this kit read today says a suite can go from red to green and catch 4% of faults; that is the fault the rest of the plan cannot see. I accept your cost point: by hand, on the "never wrong" rows only, until a tool's run time is measured on one part.

**The systems architect, to the devil's advocate.** Half is right for the order, wrong for the table check: without a script, only a reviewer refuses a bad proof table, and a model reading the work missed 35 to 58% of cheats in the same research.

**The cost lead, to the delivery manager.** Agreed on the order. Then the measure is yours to state now, not after.

## The seats' tests and the vote

Six voices. Measure: is there a number a script reads? Undo: one commit? Fixed cost: what it adds to every session.

| # | Proposal, as the council amends it | Measure | Undo | Fixed cost | Vote |
|---|---|---|---|---|---|
| 1 | **The gate proves the delivery itself.** `gate --prove` runs the sealed command and the project's whole command, and writes the result with the commit and the seal's hash; review and release may not start without it. A recorded file is accepted only for a run too long to repeat, and then only from the one session that merges | steps refused for no evidence; claims of green that a rerun contradicts | yes | none to a session; one run a delivery | adopt 6–0 |
| 2 | **Build in thick cuts, and a walk is evidence.** The kit's order of work is `thick-cut.md`; a work item a person can see carries a walk's result file, and the gate asks for it | tokens for each walked cut; days a cut | yes | none | adopt 5–1 (the architect: not every project has a screen; keep it a kind of proof, not a rule for all) |
| 3 | **The sealed rerun on the main branch,** ported from the first project: nightly, alone, a dated record, and the heartbeat names its age and its reds | reds found after merge; age of the last run | yes | none; one run a night | adopt 6–0 |
| 4 | **A script reads the proof table,** in place of the plan's count of criteria against tests: no blank row, a control for every "always", a cover for every "none", no test that names no row | tables refused; faults that reached a person and no row caught | yes | none | adopt 5–1 (the devil's advocate: wait until one project has used the table) |
| 5 | **Planted faults,** by hand on "never wrong" rows now; by tool on changed code only after its run time is measured on one part | planted faults that survive | yes | reviewer tokens | adopt 4–2 (the cost lead and the devil's advocate: after the first three cuts) |
| 6 | **A ration, not a kill.** A daily share of each vendor's week, read from the counters; at it, model work stops and scripts go on. No wrapper that kills a session | days the quota lasts | yes | none | adopt 5–1 (the cost lead wanted the hard stop) |
| 7 | **The light profile on real work:** the first cuts of the first project are its trial, each ambiguity fed back into the skills | cuts shipped; skill changes a cut | yes | none | adopt 6–0 |
| 8 | **The seal reaches what judges:** runner settings and snapshots sealed with the tests; a change to pipeline or linter settings is flagged | such changes found | yes | none | adopt 6–0 |

Weighed and not proposed: adapters for other stacks (no second stack asks for one); hardening the hooks further and branch protection on the host (the owner's settings; after the hooks have run on one project); the plan's `review.json` and `release.json` (the review's verdict line and the release line already serve).

## The verdict in five lines

1. The plan is right about the gate and the rerun, and wrong about the rule it protects: one test for every criterion ended today.
2. It improves how work is checked and not what is built; alone it would make the old line stricter, not more efficient.
3. Efficiency comes from the unit of work: one thick cut at a time, walked in a browser, and measured in tokens for each walked cut.
4. Evidence counts only when the judged session cannot write it: the gate runs the command, the seal and the commit are in the record, the walk is real.
5. Build it in this order: 1, 3, 8, 4, then 5 after three cuts; 2, 6 and 7 are how the first project already runs from today.

## The single next move

The owner approves decisions 1 and 2 below. Then one change to `light/tools/gate.mjs`: `--prove` runs the two commands and writes the record, and `--can-start review` and `--can-start release` refuse without it. Done when `node --test light/tools/tools.test.mjs` has a case where a build note exists, no record does, and the gate refuses.

## What the owner must decide

1. **The gate changes what proves a step:** it runs the delivery commands itself and refuses without the result. Recommended, 6–0.
2. **The gate reads the proof table** and refuses a bad one, replacing any count of tests against criteria. Recommended, 5–1.
3. **A red in the nightly rerun stops merges into that part** until it is green. Recommended, 6–0.
4. **A walk's result is required** for a work item a person can see. Recommended, 5–1.
5. **Planted faults:** by hand on "never wrong" rows now, a tool after its run time is measured. Recommended, 4–2.
6. **Budgets:** a daily ration that stops model work, no session killed. Recommended, 5–1.

## Approved, and needing no word

Tooling that keeps every check: the wrapper that records a command's result; the port of the rerun script as a report; the three numbers as a script (features usable, walk steps passing, tokens for each walked cut); the README's table of what is proven, kept current.

## What is provisional

Every seat is a model's voice. The first project's figures are from its own council of the same day. The research figures were read once by helpers and not checked a second time. No cut has yet been built by the thick-cut order, and no project has used the proof table, so proposals 2, 4 and 5 rest on reasoning and published practice, not on a measurement here.

Confirmed by: the owner, decision 1 only, on 22 November 2026 ("Yes, approve it"); built the same day as `gate.mjs --prove`, with the commands kept in the seal. Decisions 2 to 6: not yet confirmed.
