# Review on two axes

For every fresh review of a work item before its release. The reviewer did not build it; where a second vendor is at hand, the reviewer is the other vendor.

1. **The diff, from a fixed point.** Review `git diff <merge-base>..HEAD`; first check the point resolves and the diff is not empty.
2. **Two readings that do not share notes:**
   - **Standards:** the rules in `AGENTS.md` and the project's own standards. A written rule broken is a finding that must be fixed. A smell no rule names is marked "judgement".
   - **Spec:** the work item's criteria and the requirements they come from. Code that does something no criterion asks, or misses what one asks, is a finding.
3. **Skip what a script already holds** (the seal, the gate, the tests): name the script, do not re-check by eye. A rule enforced only by reading becomes a proposed check for the retro.
4. **Each finding cites its evidence:** file and line, and the rule or the criterion's words quoted. Each is "must fix before release" or "can follow".
5. **Report the two axes apart,** each ending in one line: the count, and the worst finding.

Check: every finding has a file and line and a quoted rule or criterion; the verdict is "clear" only when neither axis has a must-fix finding.
