# Methods — how sessions work

Each file is one method a skill or a brief names by path. The method holds the steps once, so nothing repeats them.

| Method | Used by |
|---|---|
| `every-step.md` | every step skill |
| `writing-for-agents.md` | anyone writing a brief, a skill or `AGENTS.md` |
| `test-first.md` | sealed-test writers (rules 5 to 13) and builders (all) |
| `affected-testing.md` | repair builders and reviewers: exact changed-behavior regressions, direct contracts and separate full checkpoints |
| `diagnosing.md` | any session given a defect, a flaky test or something slow |
| `review.md` | every review |
| `handoff.md` | every final note |
| `retro.md` | one short session after each release |
| `throughput.md` | one session when the rate of criteria proven stalls, or before adding a lane or a machine |
| `nobody-waits.md` | one session when every lane is busy and little merges, or after the rule for what proves a merge has changed |
| `parts-not-whole.md` | one session when many work items are released and no journey runs, when reviewed branches pile up beside a held main branch, or before a whole test campaign |
| `deep-modules.md` | anyone designing or judging an interface |
| `questionnaire.md` | questions for the owner or a human expert |

## Skills from other authors, one per job

The kit copies none of these. Install the ones you want and enable only those: every enabled skill costs a line on every session's first call. **Precedence:** `AGENTS.md`, a brief and these methods win over any skill; a skill adds depth, never a second rule. Where two skills cover one job, pick one and leave the other off.

| Job | This kit | Addy Osmani's agent-skills | gstack |
|---|---|---|---|
| Starting a session well | `writing-for-agents.md` | `context-engineering` | |
| Writing the spec | `factory-spec` | `spec-driven-development` | `spec` |
| Weighing a plan or a design | `council` | `api-and-interface-design` | `plan-eng-review`, `plan-ceo-review` |
| Writing tests | `factory-sealed-tests`, `test-first.md` | `test-driven-development` | |
| Building | `factory-build` | `incremental-implementation`, `source-driven-development` | |
| Rights, secrets, personal data | | `security-and-hardening` | `cso` |
| A defect | `diagnosing.md` | `debugging-and-error-recovery` | `investigate` |
| Review | `factory-review`, `review.md` | `code-review-and-quality` | `review` |
| Checking in a real browser | | `browser-testing-with-devtools` | `qa` |
| Releasing | `factory-release` | `shipping-and-launch` | `ship` |
| Looking back | `retro.md` | | `retro` |

The pairings are by each skill's own description; try a pairing on one work item before making it your rule.

## Credits

`writing-for-agents`, `test-first`, `diagnosing`, `review`, `handoff`, `retro`, `deep-modules` and `questionnaire` are adapted in this kit's own words from Matt Pocock's skills (`github.com/mattpocock/skills`), MIT licence, copyright (c) 2026 Matt Pocock. The licence's permission notice applies to the adapted parts; see `THIRD-PARTY.md` at the kit's root.
