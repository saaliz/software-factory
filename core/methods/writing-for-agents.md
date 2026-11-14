# Writing for agents

For anything an agent reads: briefs, `AGENTS.md`, skills, handoffs. Every line is paid for on every call it is loaded.

1. **One meaning, one place.** Point to the file that holds a rule; never restate it.
2. **Steps in the file, reference behind a pointer.** A pointer names the material and when to open it, trigger word first: "Schema: `docs/data.md`, before changing a table."
3. **Every step ends in a check** that reads done or not done: a command and what it prints, a file and what it holds. "Lint: 0 errors" beats "make the code clean".
4. **Bounds that demand thoroughness.** "Every gap in section 3 has a row" beats "answer the gaps".
5. **Say the target.** "Write one-line comments", not "don't write long comments". Keep a prohibition only as a hard guardrail, and pair it with what to do.
6. **One word per idea.** Pick a leading word (seal, work item, criterion) and use it everywhere; define a coined word once.
7. **Leave out what the agent finds or does anyway:** folder listings, defaults, politeness, "be careful".
8. **Prune.** A line no longer true is deleted, not annotated.

Check before handing over a brief: each step has a check; nothing is said twice; every prohibition has its target; under 40 lines unless the work is a list.
