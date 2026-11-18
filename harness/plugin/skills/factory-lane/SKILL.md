---
name: factory-lane
description: Start one lane orchestrator of this project's harness, for the super. Takes the lane's letter and its modules.
argument-hint: <lane letter> <module names>
disable-model-invocation: true
---

# Start a lane

For the super only; a lane never starts another.

1. Write the handover `factory/records/lanes/$ARGUMENTS.md` (the lane letter first) in the form of `factory/harness/lane-handover.md`: under 25 lines, pointing to commits and files, with this session's id as the super's. Commit it.
2. Add the lane's row to `factory/records/NOW.md` and create `factory/records/lanes/<lane>/sessions.md` with its first line: the lane session, its model, today.
3. Start the lane as its own session, fresh, local, the high tier, in its own worktree, its first message: "You are lane <letter>. Follow `factory/harness/lane-brief.md`; your handover is `factory/records/lanes/<letter>.md`; the super is session <id>." In the Claude desktop app use its start-session tool; in a terminal, `claude --agent factory-harness:factory-lane "<that message>"`.
4. Record the session's id in `sessions.md` and `NOW.md`. Do not wait on it: you are woken when it reports.
