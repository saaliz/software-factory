# Machine capacity: the laptop is the limit

For the orchestrator, before adding a lane or a vendor lane, and whenever the machine is slow. With several lanes on one computer the binding limit is the machine, not the tokens. Source: the School ERP trial, 25–26 November 2026: four lanes at once left the computer at 99% CPU and about 0.2 GB of free memory, and one subagent's walk retry loop held a walk environment for about 50 minutes and left the main branch red. `throughput.md` measures the ceiling; this method keeps work under it.

## The rules

1. **Heavy-job slots.** At most a fixed number of heavy jobs (a build, a test run, a CI run) at once, each a lock file a slot script hands out in queue order. Every heavy command takes a slot.
2. **A cap for each lane.** No lane holds more than a set share of the slots at once (two of three in the trial). **A new vendor lane gets one**, so it replaces a lane's load and never adds one. A lane at its cap keeps its place in the queue while another lane's job passes it. A job's lane comes from an explicit `--lane` flag first and its label's first word second, so a mislabelled job does not count against a retired lane.
3. **A free-RAM floor, for lane jobs only.** No lane's heavy job starts while free memory is under a floor (1.5 GB in the trial; a council had proposed 2 GB; set yours from your machine, with an override and 0 turning it off). CPU cannot be gated this way: the load average reads 0 on Windows. **The orchestrator's own walks and merges are exempt.** A floor that held them back could leave the main branch stuck red, with the only job that can repair it refused.
4. **Build servers ended after each job.** Run builds without reused server nodes (for MSBuild, `MSBUILDDISABLENODEREUSE=1`), and end the whole process tree of a job that stalls or runs over. A build server that outlives its job keeps memory the next job needs.
5. **Background indexers in a low-priority slot.** A code-graph refresh or any indexer takes a heavy slot at low priority and never runs while a walk runs.
6. **Idle sessions archived.** A session that has finished its step is archived, not left open; each open session holds memory.
7. **Run each walk once.** A brief for a subagent says: run the walk once, read the result, report if the environment is busy. No retry loop.

## Limits to know

- The floor reads memory when a job starts, not through its run, so a job of several hours can outgrow it.
- Memory outside the slots is not counted: the vendor's own agent, build servers that escaped, containers.
- A job with no lane in its flag or label is charged to no lane. Read the slot script's log before trusting a lane's load.

Check: the slot script's status shows no lane over its cap, and free memory above the floor while lane jobs run.
