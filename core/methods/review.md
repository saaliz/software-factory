# Review on two axes

For every fresh review of a work item before its release. The reviewer did not build it; where a second vendor is at hand, the reviewer is the other vendor.

1. **The diff, from a fixed point.** Review `git diff <merge-base>..HEAD`; first check the point resolves and the diff is not empty.
2. **Two readings that do not share notes:**
   - **Standards:** the rules in `AGENTS.md`, the project's design, architecture and ADRs/decisions, and its own standards. A written rule broken is a finding that must be fixed. A smell no rule names is marked "judgement".
   - **Spec:** the work item's criteria and the product requirements they come from. Code that does something no criterion asks, or misses what one asks, is a finding.
3. **Skip what a script already holds** (the seal, the gate, the tests): name the script, do not re-check by eye. A rule enforced only by reading becomes a proposed check for the retro.
4. **Each finding cites its evidence:** file and line, and the rule or the criterion's words quoted. Each is "must fix before release" or "can follow".
5. **Report the two axes apart,** each ending in one line: the count, and the worst finding.
6. **Scope the proof honestly.** Check affected selection reasons and direct contracts against the diff, including helpers, deletions and replacements. Targeted green does not replace independent QA, either semantic axis, or required full delivery/release checks (`factory/methods/affected-testing.md`).
7. **Read the reseals.** `node factory/tools/seal.mjs work/<item> --check` prints each reseal with its reason and how many files it changed. A reseal after the build began that names no fault in the tests is a finding.

8. **Quotes of the owner.** A page that quotes the owner cites the decision file, and `node factory/tools/quotes.mjs` holds the words to that file. Whether the page claims more than the words cover is a reading: a claim wider than the words is a must-fix.

## Rounds

THE PROBLEM IT STOPS. On its second project one set of work items took thirteen review rounds. Of 41 must-fix findings, 19 came from briefs that sent each round into ground no earlier round had read, and 9 from sentences that described an owner's decision more widely than the owner's words. The four rounds that read only the delta found none or one each.

1. **Scripts first.** Every check a script can make passes before a reviewer is asked: the gate, the tests, the project's checks. The review judges what no script sees.
2. **One full review, at the end of the work.** Its brief fixes the scope before it starts: what the checks cannot see, each waiver or exception and whether its reason is true, and the riskiest files named one by one, each read whole. Never "read at least N items no one has read": that is an audit in instalments, and each instalment finds something new.
3. **Every later round reads only the delta** since the head the last round reviewed, and answers FIXED or NOT FIXED for each of its must-fix findings. Ground already accepted is not reopened. When the main branch was merged in after that head, diff from the reviewed head with that main merged in cleanly (`git merge-tree --write-tree <reviewed> <main>` gives the tree), so the delta holds only what the branch did, its conflict resolutions included.
4. **The bar, stated in every brief.** Must-fix only if a statement is false, a written rule is broken, or the work would be built wrong. A wording preference or an improvement can follow.
5. **Focused, not short.** The brief names exactly what to check, where and why, and asks nothing beyond that list; it is as long as those checks need. No open "anything else" after the first round.
6. **One reviewer model for every round of one change.** A new model brings a new idea of "good".

Check: every finding has a file and line and a quoted rule or criterion; the verdict is "clear" only when neither axis has a must-fix finding; a later round's brief names its delta and the findings it verifies, and nothing else.
