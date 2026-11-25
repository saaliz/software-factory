# <What the session does> — brief

Written by `factory/methods/writing-for-agents.md`: steps first, each ending on "Done when", reference after them. Under 40 lines unless the work is a list. Delete this line and every `<...>`.

Session name `<short-name>`, <model and effort>, <its own worktree, or the main checkout>. ONE GOAL: <one sentence that reads done or not done>. TOKEN BUDGET about <number>, an estimate to report against.

## Steps

1. **Load the skills** this step uses, from `factory/methods/README.md`: <only those, each with the step it serves>. A tool with a skill loader loads each by name; one without reads the same `SKILL.md` by its path, <the folder the skills are installed in>.
   Done when: each is loaded or read.
2. **Read,** by search where you can: <the exact files, and the part of each>.
   Done when: <every criterion or claim of this step has its source named>.
3. <A step.>
   Done when: <a command and what it prints, or a file and what it holds>.
4. <A step.>
   Done when: <...>
5. **Leave** <one commit | no commit> on <the branch>, the message starting <its first words>.
   Done when: `git status` is clean and the final note is sent: at most ten lines, <what it must hold>; its last line says what is half-done and why, or "nothing half-done".

## Reference

**Blocked item.** One criterion, claim or drawn state this step cannot finish (a piece another part has not built, a contract that cannot carry it, an action no frozen contract supports): build every other one, name the blocked item and its missing piece in the note, and report it. The rest of the step goes on. The stand-in stays as it is. Every step is the target; one blocked item stops only itself (first project, 23 November 2026).

**Methods:** <the files in `factory/methods/` this step follows, each with the step it serves>.

**Context.** <A fresh worker gets this brief and its sources, not the whole orchestrator history. Keep a builder's context for repairs within its step; return compile/type feedback before a handoff. Review and independent QA stay fresh.> <No helpers | At most one helper, the low tier, for narrow reading.> Sessions are the orchestrator's to start.

**Your files:** only <the paths>.

**Proof.** <Compile/static/seal/source/boundary checks; failing regression/counterexample then affected regressions and direct contracts with base/head/registry pins and counts; full test commands only at the required delivery/release checkpoint. Name full/E2E not run where applicable; targeted green is not completion proof.>
