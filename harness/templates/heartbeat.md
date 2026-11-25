# The heartbeat

Every `heartbeatMinutes` (in `factory/harness.json`, default 30), something asks: **is the line merging?** Not "is anything busy": on the first project an earlier beat counted commits and live slots, and said "moving" through nine hours with one merge. A script answers first, for no tokens; a model is woken only when there is something to act on.

```bash
node factory/tools/heartbeat.mjs
```

prints `ok: last merge <n> minutes ago` (exit 0), or `act:` and one line per finding (exit 1). With `--then "<command>"` it runs the command only when there is a finding. The findings, each with its threshold under `heartbeat` in `factory/harness.json`:

| Finding | Default | What the super does |
|---|---|---|
| no merge on the main branch | 2 hours | finds why: which package is nearest, what holds it |
| a CI running | past 40 minutes | checks it; stops it if it is hung, and reruns it |
| a job waiting for slots (`waiting-<pid>.json`) | past an hour | names its cause in `NOW.md` |
| a green CI in the slot log after the last merge | any | chases its merge request |
| a slot whose process is gone, or whose file is not touched for two minutes | any | clears it |
| a lane named in `lanes` holding no slot, waiting for none, with no job ended | an hour (`idleLaneMinutes`) | nudges it with its next package, or names what blocks it in `NOW.md` |

The beat itself is the skill `/factory-harness:factory-heartbeat`: read the findings, act on each, note each in `NOW.md`, write one line to `heartbeat.log`, end.

ONE HEARTBEAT. The super runs the only one; a lane runs none and is nudged by it.

## Make it durable: pick one

A session-only timer stops when the session does. Use a scheduler that outlives it.

**The Claude desktop app's scheduled tasks.** In the super's session, ask: "create a scheduled task, every 30 minutes, in this project folder, that runs `/factory-harness:factory-heartbeat`". It is stored under `~/.claude/scheduled-tasks/` and runs while the app is open; a beat missed while the app was closed runs at the next launch. Its cron is `*/30 * * * *`, in local time.

**The computer's own scheduler**, with the script deciding whether a model is needed:

```bash
schtasks /create /tn factory-heartbeat /sc minute /mo 30 /tr "cmd /c cd /d <project> && node factory/tools/heartbeat.mjs --then \"claude -p /factory-harness:factory-heartbeat\""
```

```bash
*/30 * * * * cd <project> && node factory/tools/heartbeat.mjs --then 'claude -p /factory-harness:factory-heartbeat' >> factory/records/heartbeat.log 2>&1
```

The first is Windows Task Scheduler; the second is a crontab line for Linux and macOS. A headless beat (`claude -p`) has no app tools to start sessions with: it writes in `NOW.md` what the super must do, and the super's next turn acts on it.

**Remove it** with `schtasks /delete /tn factory-heartbeat`, by deleting the crontab line, or by asking the app to delete the scheduled task. Remove it when the queue is empty.
