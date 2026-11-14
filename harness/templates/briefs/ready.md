# Ready — the brief for one module's first planning step

The super starts one session per module with this brief and the module's name, its design folder, its code folders and its row in `QUEUE.md`. The first module done this way is the worked example; name it here once there is one.

ONE GOAL. Take the named module to ready, so its seams can be repaired and its skeleton generated. No product code.

MODEL the high tier. TOKEN BUDGET about 300,000 new input plus output, an estimate to report against. Helpers: at most one, the low tier, for narrow reading. Never start sessions. BINDING: the sources in `factory/harness.json`; a conflict between a standard and the design is a gap, and the standard holds. SOURCES: `factory/harness/super-rules.md`, SOURCES.

SKILLS, load at the start: `context-engineering`, `api-and-interface-design`. METHODS: `factory/methods/deep-modules.md` for every seam you judge; `factory/methods/writing-for-agents.md` for the module's entry file.

READ, by search where you can: the module's design, its front page first, then its seams and its criteria; each seam's other side in the other module's design, and the seam check if the project has one; what is already built in its code folders; its requirements in the product source.

DO.
1. Every seam that does not match the other side: both sides, and the exact repair in the design's own words.
2. Every item the design carries as open: the fix, or why it is a gap.
3. Gaps: anything missing, unclear or in conflict, one line each, for the panel. Mark what `factory/council/SEATS.md` reserves as the owner's.
4. What exists in code against the design: built, partly built or not built, per design part, in a short table, so the scaffold overwrites no working code.
5. Draft the module's own `AGENTS.md`, about 60 lines, inheriting from the root one and repeating none of it, headed "Draft, not in force until the owner decides".

YOU MAY CHANGE ONLY `factory/records/<module>/READY.md` and the module's draft `AGENTS.md`.

PROOF. `git diff --stat <main branch>` shows those two files and nothing else.

LEAVE. One commit on your own branch; never merge or push. Message: `module <row> <words>: ready`. Final note, at most ten lines: seam mismatches, open items, gaps, what exists, anything for the owner, tokens; the last line says what is half-done and why, or "nothing half-done".
