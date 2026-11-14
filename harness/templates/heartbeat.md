# The heartbeat

Every `heartbeatMinutes` (in `factory/harness.json`, default 30), something asks: is anything moving? A script answers first, for no tokens; a model is woken only when nothing moved.

```bash
node factory/tools/heartbeat.mjs
```

prints `moving: <why>` (exit 0) or `idle: nothing moved in <n> minutes` (exit 1), and `stuck: <slot>` for a slot whose process is gone. Moving is a live slot, a commit on any local branch within the window, or `NOW.md` changed within it. With `--then "<command>"` it runs the command only when idle.

The beat itself, when idle, is the skill `/factory-harness:factory-heartbeat` in the super's session or a fresh one: read `NOW.md`, check the lanes, start the next sealable or buildable package, note what is stuck, write one line to `heartbeat.log`, end.

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

The first is Windows Task Scheduler; the second is a crontab line for Linux and macOS. A headless beat (`claude -p`) has no app tools to start sessions with: it starts the next step as a subagent, or writes in `NOW.md` what the super must start, and the super's next turn acts on it.

**Remove it** with `schtasks /delete /tn factory-heartbeat`, by deleting the crontab line, or by asking the app to delete the scheduled task. Remove it when the queue is empty.
