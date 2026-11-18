# Lane <letter> — <module names>

The form of a lane's handover, kept at `factory/records/lanes/<lane>.md`. The super writes it when it starts the lane and rewrites it at each takeover; the lane rewrites "In flight" and "Next" as it goes. Under 25 lines. Point to commits and files; copy nothing.

Handover of <date>. Vendors: <module> tests <vendor>, build <vendor>; <the cover in force, and until when>. Work items: `work/<lane>/`. Gaps: <each module's GAPS.md, and which rows are open>.

On the main branch: <packages merged, criteria done, anything waiting on the owner>.

In flight, held by the super until it hands them over:
- **<package>** <what it is>: <state, branch, commit>. <who holds it, and from which step the lane takes it>.

Next for you:
- **<package>** <words>: <state; what must happen before it may start; the step and its brief>.
- <gaps other lanes wait on, to order early>.

Super orchestrator: the session that started you; reach it by its session id, <id>.
