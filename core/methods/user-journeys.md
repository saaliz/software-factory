# User journeys: one file, three uses

Used by whoever writes requirements or plans a milestone, by test writers, and by whoever signs a release. `node factory/tools/journeys.mjs` checks the files, renders the walkthrough and prints the trace matrix.

THE PRINCIPLE. A milestone is done when a person can do what it is for, not when its parts pass. A journey is the thing a person does, written down once as a file a script can read. The same file drives the end-to-end test, the walkthrough the owner signs against, and the trace matrix that shows what is covered. Three hand-kept copies drift; one file read three ways does not. This builds on `parts-not-whole.md`, proposal 1: the journey is written and its denials come first.

## The file

One file per journey, `journeys/J-NN-words.json`:

```json
{
  "id": "J-05",
  "title": "Ask a question",
  "actor": "a member of a client organisation",
  "fixture": "tenant-a with 50 documents; member-with-grant; member-without-grant; tenant-b",
  "languages": ["en", "ar"],
  "steps": [
    { "id": "J-05.1", "does": "asks a question in the workspace", "via": { "screen": "WSP-SCR-04" }, "expect": "the answer streams with numbered citations", "proves": ["FR-5.1"] },
    { "id": "J-05.2", "does": "opens citation 1", "via": { "operation": "openCitation" }, "expect": "the exact cited version opens at the passage", "proves": ["FR-5.15"] },
    { "id": "J-05.D1", "kind": "denial", "denies": "no grant", "does": "member-without-grant asks the same question", "via": { "operation": "ask" }, "expect": "nothing from tenant-a's restricted documents appears", "proves": ["FR-1.11"] },
    { "id": "J-05.D2", "kind": "denial", "denies": "another tenant", "does": "a user of tenant-b asks the same question", "via": { "operation": "ask" }, "expect": "nothing from tenant-a appears", "proves": ["FR-2.1"] }
  ]
}
```

Every step says what the actor does, through what (a screen, an operation, an event), what they see, and which requirements it proves. A journey has at least one denial step, and the denials are tested first. The project names the denials every journey must hold in `factory/journeys.json` (below).

## Use 1: testing

The test writer, a session that did not build, writes one end-to-end test per journey from the file and seals it (`test-first.md`, `layered-build.md`). It runs through the real route and the real store on the project's throwaway test stack, never on stand-ins, in every language the file names. Each step is its own assertion, and the test writes the results the walkthrough reads:

```json
{ "journey": "J-05", "commit": "<sha>", "ran": "<ISO time>", "steps": [ { "id": "J-05.1", "language": "en", "outcome": "pass", "evidence": ["shots/J-05.1-en.png"] } ] }
```

to `work/journeys/J-NN/run.json`, with screenshots beside it. A step nobody ran is `not run`, never `pass`.

A journey proves behaviour and permissions. It does not prove that an answer is good. Quality belongs to the project's evaluation suite, and the walkthrough says so.

## Use 2: the walkthrough

`node factory/tools/journeys.mjs --walkthrough J-05` writes `work/journeys/J-05/walkthrough.html` from the journey file and its last `run.json`: each step, what was done, what was seen, the screenshot in each language, the requirements proved and the outcome. It is the page the owner reads before signing a release, in place of a live demo. It says on its face which commit it ran on, and that it proves no answer quality.

## Use 3: the trace matrix

`node factory/tools/journeys.mjs --trace` prints every requirement in the journeys, the steps that prove it, the work items that name those steps under `## Journey steps`, and each step's last outcome. It lists:

- requirements in the release that no step proves (when `factory/journeys.json` names the release's requirements);
- steps no work item names;
- work items that name no step;
- steps whose last outcome is not `pass`.

## Project settings

`factory/journeys.json`, optional:

```json
{
  "requiredDenials": ["no grant", "another tenant"],
  "known": { "screen": ["specs/screens.yaml"], "operation": ["api/openapi.yaml"], "event": ["api/events.yaml"] },
  "release": ["FR-5.1", "FR-5.2"]
}
```

`requiredDenials`: every journey must hold a denial step with each `denies` value. `known`: each `via` value must appear, as written, in one of these files, so a journey cannot name a screen or operation the contracts do not have. `release`: the requirements the trace must cover.

Check: every journey has a denial step for each required denial; every `via` exists in the contracts; every released work item names its journey steps; the walkthrough shows its commit and every step's outcome.
