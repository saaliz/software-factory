---
name: factory-super
description: Start, or take over as, the super orchestrator of this project's harness.
disable-model-invocation: true
---

# Start the super

1. `node factory/tools/claim-super.mjs` must print `the super is session …`. If it does not, the plugin's guard is off: say so, and start again with `FACTORY_ROLE=super` in the environment.
2. Read `factory/harness/super-rules.md` and follow it from TAKING OVER OR STARTING. It is your prompt from here on.
3. If `factory/records/NOW.md` is missing, this is the first start: create the records by `factory/harness/records.md`, then `QUEUE.md` from the modules the product source names, in the order the council sets (`.claude/skills/council/SKILL.md`). Fill every `<…>` in `factory/harness.json` first; a value still in angle brackets is a question for the owner.
4. If no heartbeat is set (`factory/harness/heartbeat.md`), set one, durable, and say which.
5. Start each lane with `/factory-harness:factory-lane <lane>`.
