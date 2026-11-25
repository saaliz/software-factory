# Project and product management viewer

A small, read-only web app over the JSON a project's own scripts write (`core/schemas/`). It never calls a model and never writes to a project. One Node server, a static page, no packages.

Screens:

- **Board**: every cut in its lane, at its step; red cards marked; branches on no card.
- **Pulse**: the alarms, the cuts in progress and what each waits on, the walks on main, the environments and what runs.
- **Progress**: musts passed, held, deferred, failed, built with no result and not built, by module, with percent and a burn-up against the scope.
- **Trends**: per cut, tokens per must passed, days from seal to merge, reading rounds, reseals, rulings withdrawn and reds escaped to main. Lower is better on every row; a cut not measured shows "–".
- **Decisions**: open decisions waiting on the owner, from `decisions.json`, plus any "waits on" line of the board or the pulse that names the owner.

The page reads the files again every 60 seconds, and whenever it comes back into view. It reads well on a phone.

## Projects

`pm/projects.json` lists them:

```json
{ "projects": [ { "name": "School ERP", "folder": "D:/Documents/Projects/school-lms", "mount": "/projects/school-erp",
                  "dataDirs": ["tmp/ci"], "owner": ["Ammar", "the owner"] } ] }
```

- `folder`: the project on this machine. `mount`: where `compose.yaml` mounts it, read only, in the container.
- `dataDirs`: where its status files are, relative to the folder, tried in order (default `tmp/ci`). A data dir outside the folder is never read.
- `owner`: the names that mark a "waits on" line as a decision for the owner.

A new project: add its entry here and its mount to `compose.yaml`, then start again.

Another machine, whose projects are not the ones above: copy `compose.local.example.yaml` to `compose.local.yaml` and `projects.json` to `projects.local.json` (git ignores both), list this machine's projects in them, and start with both files: `docker compose -f pm/compose.yaml -f pm/compose.local.yaml up -d --build`. Mount only the folder that holds a project's status files, not the whole project. A project that keeps its run output somewhere other than `tmp/ci` names that folder in `dataDirs`; the first project writes to `.local/status`.

## Run

```bash
docker compose -f pm/compose.yaml up -d --build
```

Then open <http://localhost:5190>. Only this app's container (`factory-pm`) starts; nothing else is touched. `PM_PORT` changes the port; `PM_BIND=0.0.0.0` lets a phone on the same network reach it (the default is this machine only). The container runs as a plain user with a read-only file system and no capabilities, and every project folder is mounted read only.

Without Docker: `node pm/server.mjs` (port 5190 on 127.0.0.1; `PORT`, `HOST` and `PM_CONFIG` change it).

## Tests

```bash
node --test "core/schemas/*.test.mjs" "pm/*.test.mjs"
```

`pm/fixtures/demo` is a fixture project with one file of every kind. When School ERP is on the machine, its real files are checked against the schemas too.
