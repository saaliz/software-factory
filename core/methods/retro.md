# Retro after a release

One short session on the low or middle tier, after each release. It reads and writes only its report.

READ: the token counter for the work item's sessions (`node factory/tools/tokens.mjs --by session`), the item's notes, its review findings, and any red test run.

FIND, most costly first, at most seven:
- **Tokens:** where they went, and the single largest waste (re-read context, a retried step, a helper that returned file contents).
- **Bounces and red:** each one's cause, and the earliest check that could have caught it.
- **Rules a script could hold:** every rule someone enforced by reading. Each becomes a proposed check, never a sentence in a brief.
- **Briefs and skills:** a line that was ignored, misread or did nothing (`writing-for-agents.md`).

WRITE: `work/<item>/retro.md`, one row per finding: evidence, cost, the proposed change and its kind (a check, a brief, a method). The owner takes the ones worth taking.

Check: every finding names its evidence (a file, a line, a token count) and one proposed change.
