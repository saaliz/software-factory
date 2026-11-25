# Fewer tokens, better code, cheaper tests

**Status: proposed, not yet run.** A study and a recommendation. It decides nothing for any project. The second project carries its own version as a council proposal, with its project-specific evidence. This file keeps only the parts any factory can use.

## The one idea

Tokens are spent on re-reading: in the first project, 10.8 billion tokens re-read against 61 million written (`core/token-economy.md`). In the second project, the costliest days were review and audit loops. One set of work items took thirteen review rounds, and seven of its must-fix findings were gaps a script now catches. Its plan had eight whole-plan audits in six weeks.

So all three goals point one way: **settle the meaning before the build, let scripts do the checking, and spend model reading only where a person's judgement is needed.**

## What the kit has already

- Criteria in given/when/then form, each with a counterfactual (`objectives-and-criteria.md`, `criteria.mjs`).
- Affected tests in repairs (`affected-testing.md`).
- One full review, then delta-only rounds (`review.md`, Rounds).
- The seal, and a session that seals but does not build.

## What to add

| # | Change | Tokens | Code quality | Testing | Where it goes |
| --- | --- | --- | --- | --- | --- |
| 1 | **Measure first.** Tokens per must passed, reading rounds and reseals per work item go into `progress.json` (`optimization[]`), from `tokens.mjs` | Makes every other change judgeable | — | — | The status writer (`proposals/2026-11-25-shared-status.md`) |
| 2 | **Examples at the requirement, not only the work item.** Each must in the project's requirements carries two or three given/when/then examples with their counterfactuals. A **Clarifications** section logs each answer as `Q → A` beside the row it changed, with a link to the owner's record (Spec Kit's clarify step, kept to the owner's decision files) | Fewer questions, reseals and readings | Sealed tests match what was meant | Examples become acceptance tests | `objectives-and-criteria.md`, a new section |
| 3 | **`requirements.mjs`.** Every must has an example, a counterfactual and a named journey. Every non-functional row names its target, how it is measured and the test that measures it. Open `[NEEDS CLARIFICATION]` markers are listed | A script replaces a reading | Gaps found at the source | Every requirement traced to a test | A new tool beside `criteria.mjs` |
| 4 | **By risk tier.** Generate contract tests from the contract files for field-level detail, and write none of those by hand. Run mutation testing only on the code whose failure is irreversible: access, isolation, deletion, money | Readers stop reading field detail | Weak tests found where they matter | No hand-written detail tests; mutation not everywhere | `test-first.md`, a new rule |
| 5 | **A sealed-suite score.** The gate records the share of sealed tests still red when the builder says done. Over about 25% sends the work item back to its spec, not into another build (dark-factory's default; not yet measured here) | Stops paying for builds against an unclear spec | Flags misread requirements | A measure of seal quality | `gate.mjs` output and `progress.json` |
| 6 | **A token budget per work item**, from its criteria count. Over budget, the pulse shows an alarm and a person decides. Advice only: nothing stops by itself | Caps runaway items | — | — | `pulse.json` alarms |
| 7 | **A red team at release of a milestone.** A session from another maker attacks the riskiest behaviour (leaks, injected instructions, forged evidence). A high finding stops the release | Costs tokens once per milestone | Security evidence | Replaces ad-hoc security reading | A brief in `council/` or `harness/templates/` |
| 8 | **A second sealed suite on critical requirements only.** A second maker seals from the same requirement row. Disagreement over about 25% means the row is unclear; it goes to the council before any build (dark-factory) | One extra seal per critical row | Ambiguity found by experiment, not by reading | — | `factory-sealed-tests` skill, an option |

**Not recommended:** a second suite everywhere (it doubles seal cost), whole-plan audits (use scripts and the trace matrix), and test kinds that no requirement names.

## Order

1. Measure (1).
2. Add the scripts and rules (2, 3, 4).
3. Read one week of trend, then add the score and the budget (5, 6).
4. Add the red team and the second seal on critical rows (7, 8), first as a trial on one project.

Each is "proposed, not yet run" until a project runs it and the README's proven-and-not table says so.

## Sources

- GitHub Spec Kit: spec template, clarify and checklist commands, https://github.com/github/spec-kit
- dark-factory: sealed tests outside the repository, the score, the red team, the cost ceiling, https://github.com/DUBSOpenHub/dark-factory
- andon: tests related to the change, done refused while a question is open, https://github.com/mitaku/andon
