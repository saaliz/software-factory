# The records

Plain files in `factory/records/` (the `records` path in `factory/harness.json`), so any model can take over from them. Only the writer named here writes each one. Commit the records with each step's result.

| File | Writer | Holds |
|---|---|---|
| `NOW.md` | the super | the takeover page, under 40 lines, rewritten at every step: what is in flight, who holds it, what blocks what, what the owner still owes |
| `QUEUE.md` | the super | the modules in order: state (planned, in build, done), criteria done, the planned column, one line per release |
| `lanes/<lane>.md` | the super, then the lane | the handover (`factory/harness/lane-handover.md`) |
| `lanes/<lane>/sessions.md` | the lane | every session or subagent: name, id, model, vendor, budget, tokens, bounces, "covering" where it is |
| `<module>/LOG.md` | the lane | one added line per step: date, package, step, result, commit |
| `<module>/GAPS.md` | the panel | one row per gap: the gap, three experts' views, the working answer, its sources, final or provisional, and who should confirm it |
| `heartbeat.log` | the beat | one line per beat that acted; never committed, so a beat does not read as work moving |

Write "started" in `NOW.md` and commit before a step; a step with no commit that finished it is restarted. A word from the owner goes in a decision file the moment it is heard.
