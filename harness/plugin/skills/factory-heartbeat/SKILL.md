---
name: factory-heartbeat
description: One heartbeat of this project's harness - check that work is moving, start the next step if nothing is, note what is stuck.
disable-model-invocation: true
---

# One beat

Cheap by design: stop at the first step that answers.

1. `node factory/tools/heartbeat.mjs`. If it prints `moving:`, end with that line and nothing else.
2. Read `factory/records/NOW.md` only. For each lane or session it names as working, check it is (the app's session list, or its last commit and note). For each `stuck:` slot, a hung job: say so in `NOW.md`.
3. If nothing is working: start the next sealable or buildable package `NOW.md` and `QUEUE.md` name, by `factory/harness/super-rules.md`, THE LOOP. In a session that cannot start sessions (a headless beat), write in `NOW.md` what the super must start, and a subagent may take a step the lane brief allows.
4. Add one line to `factory/records/heartbeat.log` (never committed): the time, what you started, what is stuck. Change and commit `NOW.md` only when you started something or found something stuck, since a fresh `NOW.md` or commit reads as moving to the next beat. End.
