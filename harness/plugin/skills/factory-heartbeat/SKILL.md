---
name: factory-heartbeat
description: One heartbeat of this project's harness - is the line merging? Act on each finding, note it, end.
disable-model-invocation: true
---

# One beat

Cheap by design: stop at the first step that answers.

1. `node factory/tools/heartbeat.mjs`. If it prints `ok:`, end with that line and nothing else.
2. Read `factory/records/NOW.md` only, then act on each finding it printed (`factory/harness/heartbeat.md` says what each asks): no merge in two hours, find what holds the nearest package; a CI past 40 minutes, check its output and stop it if hung; a job waiting over an hour, name its cause; a green CI not merged, chase its merge request; a stale slot, clear it; an idle lane, send it one line naming its next package, or write in `NOW.md` what blocks it.
3. If nothing is working at all, start the next sealable or buildable package, by `factory/harness/super-rules.md`, THE LOOP, merge first. In a session that cannot start sessions (a headless beat), write in `NOW.md` what the super must do.
4. Each finding and what you did goes in `NOW.md`; commit it. Add one line to `factory/records/heartbeat.log` (never committed). End.
