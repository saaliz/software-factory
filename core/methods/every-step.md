# Every step

What every step skill shares. The words live only here.

## When you are stuck

- Put the decision you need, with your working answer, in your note and in your final message, and carry on with whatever the answer does not affect.
- Start no other session. Use a helper only if your brief allows one, and only for a narrow search.

## While you work

- Read only what your skill names, as ranges, not whole files; a file under about 100 lines may be read whole.
- Send long output to a file under `work/<item>/tmp/` and search it. That folder is never committed. Write nothing outside the project, not even a log.
- Sealed files are never edited. If a sealed test looks wrong, that is a question, not an edit.
- Names, never bare codes, in what a person reads.
- Change nothing in `AGENTS.md`, `factory/methods/`, `factory/tools/` or a decision already written.
- Nothing is sent to a real person and no real personal data is used: test data only.
- Do not push.

## Every commit and note

- A commit message starts with the work item's folder name, its hyphens as spaces (`01-sign-in` gives `01 sign in:`), says in plain words what now happens, and ends with your tool's co-author line if it has one.
- Your note is at most fifteen lines, in the work item's folder; its last line says what is half-done and why, or "nothing half-done". On a second pass, add to the note under a line saying which pass it is.
- Your final message is under 120 words: the commit, what went green, what is still red, any decision you need. The caller checks the gate and the result files; your report is not proof.
