# The seam repairs — the brief for a set of modules repaired together

The super starts one session for a set of modules whose seams cross, after each is ready and its panel has answered.

ONE GOAL. Repair, in the designs, every seam of the named modules that does not match its other side, and apply every design change their `GAPS.md` answers ask for, so each module can be scaffolded.

MODEL the high tier. TOKEN BUDGET about 600,000 for the set. Helpers: at most one, the low tier, for narrow reading. Never start sessions. The panel's working answers are built on as given, provisional ones too. SOURCES: `factory/harness/super-rules.md`, SOURCES.

SKILLS: `context-engineering`, `api-and-interface-design`. METHODS: `factory/methods/deep-modules.md`; its deletion test decides step 3.

READ, by search: each module's `READY.md` sections 1 and 2, its `GAPS.md` rows that name a seam or a design part, the designs those point to on both sides, and the seam check before you start.

DO.
1. Each mismatch: change the side that is wrong, as `READY.md` names it, in the design's own words. Both sides in the set: change both at once. The other side outside the set: change it only where its own design already implies the repair; otherwise list it.
2. Each design change a `GAPS.md` answer asks for, in the part it names.
3. A seam both sides agree is not needed (taken, given by nothing, needed by no criterion): remove the take, and say why in one line.
4. After each module: its form check, if the project has one, green, and the seam check again.

YOU MAY CHANGE ONLY design files.

PROOF. No mismatch left on any seam of the set, and the project's total no higher than before; `git diff --stat <main branch>` shows design files only.

LEAVE. One commit on your own branch; never merge or push. Message: `modules <rows>: the seam repairs of <names>`. Final note, at most ten lines: mismatches before and after, the repairs left outside the set and whose they are, the design changes made, tokens; the last line says what is half-done, or "nothing half-done".
