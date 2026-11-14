# Sealed tests — the brief for one module's next packages

The lane starts one subagent (`factory-harness:factory-test-writer`) per module with this brief, the module, its package number and the vendor that builds it. The test writer is always the other vendor. The base is the skill `factory-sealed-tests`; this brief adds what a module with a skeleton needs.

ONE GOAL. Write the tests of the module's next two or three packages in one sitting, reading the design once, and seal only the first, so its builder can start at once. The later ones stay written and unsealed: the lane seals each after the package before it has built green, once any fault that build found in the tests is fixed in them too.

MODEL the high tier. TOKEN BUDGET about 400,000. Helpers: at most one, the low tier, for narrow reading. Never start sessions. One test per must criterion, one per requirement for the rest, each proved once at the lowest level that can prove it. SOURCES: `factory/harness/super-rules.md`, SOURCES; each test names its criterion.

SKILLS: `context-engineering`, `test-driven-development`; `security-and-hardening` when the package touches rights, sign-in or safety. METHODS: `factory/methods/test-first.md`, rules 5 to 13; `factory/methods/diagnosing.md` for a setup failure you cannot explain.

THE PACKAGE. Take the design's build-order groups in order, skipping any whose criteria a test on the main branch already passes, until the package holds 20 to 40 criteria; stop at a group's end. Then the next package the same way, and a third if the three stay under about 100 criteria. Each is its own work item, `work/<lane>/<NN-words>/`.

READ, by search: the design parts the package's criteria name; their requirements; the module's `GAPS.md` answers that name a test or a criterion; the skeleton's `SCAFFOLD.md` and its stand-ins; one existing test of the same kind, as the form.

DO, beyond the skill.
1. Every write in setup checks its own result and fails setup with the reason; "setup passed" prints only after all of them hold. A criterion whose given facts live in another module not yet built goes to a later package that waits on that owner; the note names the owner's missing piece.
2. Every count or read is narrowed to the test's own data: an unnarrowed count passes alone and fails beside other tests.
3. Name no generated type: name the contract the design gives (the interface, the route, the event) and every table and column by the design's own names.
4. Run them against the skeleton: every one fails at the behaviour, none in setup.
5. Seal the first package only, once, at the end: `node factory/tools/seal.mjs work/<lane>/<package> <the tests' folder>`; then the gate's `--can-start build` must print `build may start`.

YOU MAY CHANGE ONLY the packages' folders and their test folders. No product code, no design, no records.

PROOF. Every written package's tests red at the behaviour, none in setup; the gate on the first says build may start; `git diff --stat <main branch>` shows only the allowed files.

LEAVE. One commit on your own branch; never merge or push. Message: `module <row> <words>: <first package words>, sealed tests, and the next written`. Final note, at most ten lines: each package and its criteria count, which one is sealed, anything for the build, tokens; the last line says what is half-done, or "nothing half-done".
