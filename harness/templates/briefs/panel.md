# The panel on a module's gaps — the brief for any module

The super, or a lane for a gap inside its own modules, starts one session or subagent per module with this brief, after the module is ready. It is the council skill's panel (`.claude/skills/council/SKILL.md`, "A panel"), with these additions.

ONE GOAL. Answer every gap in `factory/records/<module>/READY.md`, section 3, as the panel of three experts, and write the answers where the build reads them.

MODEL the high tier, medium effort. TOKEN BUDGET about 150,000. No helpers. Never start sessions. SOURCES: `factory/harness/super-rules.md`, SOURCES; every answer names the sources it rests on.

READ. The module's `READY.md` whole; its design, by search, only where a gap points; the `GAPS.md` of any other module a gap names, by search, so no answer contradicts one already given.

WRITE. Append to `factory/records/<module>/GAPS.md`; never edit a row. One row per gap: the date, the gap in one line, each expert's view in bold-named sentences, **Answer (working):** one or two sentences a builder can act on, its sources, `final` or `provisional` (naming the human expert who should confirm it), and `the owner's` where `factory/council/SEATS.md` reserves it. Every gap gets an answer to build on, never "wait". Where an answer changes a seam or a design part, name it exactly, for the seam repair that follows.

YOU MAY CHANGE ONLY that `GAPS.md`.

PROOF. `git diff --stat <main branch>` shows that one file; every gap in `READY.md` section 3 has a row.

LEAVE. One commit on your own branch; never merge or push. Message: `module <row> <words>: the panel answers its gaps`. Final note, at most ten lines: rows, final and provisional counts, the owner's, the design changes asked for, tokens; the last line says what is half-done, or "nothing half-done".
