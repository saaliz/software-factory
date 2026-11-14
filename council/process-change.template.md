# A contrarian council on a change to the process

For a change to how the line works: more speed, fewer readings, bigger packages, another machine. Three steps, in order, each its own session. A council skill sitting (`.claude/skills/council/SKILL.md`, a council) with the rule below added; the file's form is `factory/council/decision.md`, form 1, with the sections named here.

1. **The study.** One session measures before it proposes (`factory/methods/throughput.md`): every number names the record it was read from, or is marked estimate. Its report ranks proposals by the gain, each with its arithmetic, its cost and its risk to quality.
2. **The council, contrarian.** Each seat first tries to refute each proposal: a number that does not hold, a rule it breaks, a cheaper half, a reason to do nothing. A proposal passes only if that fails. The quality bar is not voted on: sealed tests by the other vendor, test-first builds, fresh reviews, green CI.
3. **The owner's list.** What needs the owner's word, apart from what needs none.

## The file, beyond form 1

- **Status: advice.** It decides nothing that is the owner's; every seat is a model's voice.
- **What the council checked itself.** A table: the report says · checked against (a script, git, the code) · held, held loosely, or did not hold, with the right figure. Each seat checks at least five figures itself. On the first project, fifteen were checked and seven were wrong or loose: a gain of 100 criteria an hour was 50, a gain of 16 was 6, a "done alone" run was not, and one proposal had already been done.
- **The seats' tests, per proposal,** then **the vote** on the proposals and, apart, on what the study weighed and did not propose.
- **Approved, and needing no word:** tooling that keeps every check (the order of jobs, jobs side by side, a log), for whoever runs the line.
- **Waiting for the owner:** each change to a rule (what is proved before a merge, which checks run, how many readings, package size, where CI runs), with the council's recommendation and its count.
- **What is provisional,** and the correction made to the study for each figure that did not hold.

Check: every figure the council relied on was checked by a seat against a record; every proposal has a vote; nothing that needs the owner's word is listed as approved.
