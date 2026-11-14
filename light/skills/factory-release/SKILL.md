---
name: factory-release
description: Last step of a work item. Release a reviewed work item, record its version and what a person can now do, and write the token line. Use only when the review says clear.
---

# Release

Follow `factory/methods/every-step.md`. Model: the low tier; there is no judgement here.

## Start

`node factory/tools/gate.mjs work/NN-words --can-start release` must print `release may start`.

## Read, and nothing more

- The work item's `item.md`: Seal, Review and Release.
- `AGENTS.md`, section 5, for this project's release command. Where it and this skill differ on where a version or a tag goes, section 5 wins.

## Do

- Run the project's whole test command on the commit to be released. Red stops the release.
- Under `## Release` in `item.md` write `Version: <the version as this project writes versions>` and one line of what a person can now do. Commit it.
- Release by the project's own command.
- Run the whole test command once more on what was released.
- Write the token line in the note: run `node factory/tools/tokens.mjs --by session`, add up this work item's sessions, and give four numbers: new input plus output; sent again; and each of the two divided by the number of criteria. If the counter finds no sessions, write that.

## Done means

- `node factory/tools/gate.mjs work/NN-words` prints `next: done`.
- The version exists where the project keeps versions (a tag, a package, a deployment).

## Commit

`NN words: released <version> — <what a person can now do>`

## Note

`5-release.md`: the version, the token line, the review's "can follow" findings still owed. Tell whoever started you that a retro is due (`factory/methods/retro.md`); do not run it yourself.
