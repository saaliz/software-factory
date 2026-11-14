# The harness profile — not yet in this repository

The harness is for many modules, long unattended runs, two vendors and a team. Scripts own the order of work; models fill slots. It reuses everything in `core/`, `council/` and `light/`: the same entry file, briefs, sealed tests, gate, counter and methods.

It is not published here yet, on purpose. On the first project its parts are at different stages, and a part goes into this folder only once it has run there and its numbers are known.

| Part | What it does | State on the first project |
|---|---|---|
| The orchestrator's prompt and its two records | One session picks the next module, starts a worker for each step, checks every claim against git and the gate | Running; costly as one long session (372,000 tokens a call) |
| A brief per stage | Stage 1 ready, the expert panel, seam repairs, sealed tests, the build | Running |
| Two vendors, kept apart | The vendor that builds a module never writes its tests or its review | Running |
| A scaffold from the designs | Generates each module's skeleton and stand-ins from its design files | Running, for one stack |
| CI with quick checks first and a lock | Red in under two minutes on a cheap failure; one run at a time | Briefed, not yet built |
| The launch script and the lane script | Start every worker headless, record it first, stop it at its budget; run one module's packages in order | Designed and voted on; not built |
| One word starts a chain | The owner's one sentence runs a module through every step, stopping only for what is the owner's | Proposed; waits on headless workers |
| Hooks | Refuse an edit to a sealed test; warn on a large context | Built behind switches, never run with a real model |

## Why it waits

Three numbers from the first project say the harness is not yet the cheaper way to build, only the more controlled one:

- No package had merged under the full harness in its first 41 hours.
- A worker was running for at most 26 of 116 hours, mostly because each next step waited for a person.
- Whole CI took 38 minutes, half of it four tests.

Each part is published here when its row above reads "running" and its effect has been measured.
