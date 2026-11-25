# Status schemas, version 1

A project's own scripts write its status as JSON; the kit's viewer (`pm/`) only reads it. These schemas are the contract between the two, so any project can be shown without a model reading anything.

| Kind | Usual file | Holds |
|---|---|---|
| `factory/progress@1` | `tmp/ci/progress.json` | musts by module (passed, held, deferred, failed, built with no result, not built, percent), the burn-up, cuts merged against planned, features usable, and per cut its cost, time and quality (`optimization[]`) |
| `factory/lanes@1` | `tmp/ci/lanes.json` | the swimlane board: the steps (columns), each lane's cards, branches on no card |
| `factory/pulse@1` | `tmp/ci/pulse.json` | the cuts in progress, what each waits on, environments, what runs, and the alarms |
| `factory/walks@1` | `tmp/ci/walks-main.json` | the end-to-end walks on one commit of main |
| `factory/decisions@1` | `tmp/ci/decisions.json` | open questions waiting on the owner |

Rules every kind keeps:

- `at` is when the script wrote the file, ISO 8601 with its offset.
- `schema` names the kind and version, for example `"factory/progress@1"`. A file without it is read by its name as version 1.
- Extra fields are allowed and ignored, so a project can write more than the viewer shows.
- A measure that was not measured is `null`, never `0`.
- A new version only adds a field, or gets a new number; the viewer refuses a version newer than its own.

Check a file:

```bash
node core/schemas/validate.mjs tmp/ci/progress.json tmp/ci/lanes.json tmp/ci/pulse.json tmp/ci/walks-main.json
```

The checker reads the JSON Schema words these files use and needs no package.
