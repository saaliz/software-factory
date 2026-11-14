---
name: council
description: Answer a question no file answers, at the smallest size that fits - a ruling, a panel of three experts, or a council of the project's seats with a recorded vote. Use for gaps in requirements or design, for what to build next, and for changes to process or architecture.
---

# Council

A council answers; it builds nothing. Its one output is a decision file. Who sits: `factory/council/SEATS.md`.

## Pick the smallest size that fits

| Size | For | Shape | Cost on the first project, new input plus output |
|---|---|---|---|
| Ruling | one small point the files nearly answer | whoever runs the work decides, and writes one line in the work item's note | no session |
| Panel | a batch of gaps in one area | this session voices three experts, one pass, one working answer per gap | 115,000 to 150,000; 5 to 6 minutes |
| Council | what to build next; a change to process or architecture; anything a panel split on | every seat: openings, one rebuttal, a vote | 120,000 to 170,000 with one voice; 225,000 to 430,000 with a helper per seat |

A helper per seat buys independence at two to three times the cost: use it only when the decision is hard to undo. Every council, even with one voice, hears an outsider, who sees only a neutral summary. As a helper it cost 67,000 tokens and 9 seconds in the kit's trial sitting, nearly all of it the helper's own start. As another maker's free model through `factory/tools/outside.mjs` it cost 444 tokens sent and 758 answered in the same sitting, none of them from your allowance, and it raised a point no seat and no helper had. The gain is a second maker's eyes, not the tokens.

## Before sitting

1. **Batch.** One sitting per area per day. Write the questions as a numbered list, each with the working answer in use and the files that bear on it.
2. **Read** `factory/council/SEATS.md`, the latest file in `factory/decisions/`, and only the files the questions name.

## A panel

For each gap, three experts speak, each in one or two sentences with the name in bold: **the user's expert** (what the people who use this need and fear), **the senior programmer** (what is built, what it costs, the smallest change that works), **the architect** (the boundaries, what can be undone, what one part may promise another). Then **Answer (working):** one or two sentences a builder can act on.

Every gap gets an answer to build on, never "wait". Mark it **provisional** and name the expert where a real one should confirm it (a lawyer, an accountant, a safety lead). Mark it **the owner's**, or the part of it that is, where rule 8 of `AGENTS.md` or `SEATS.md` reserves it: still give the working answer. Write the answers as numbered sections, one per gap. A panel uses the seats' tests as it reasons; it has no vote and no dissent.

## A council

1. **Frame.** Write a neutral summary of what is being decided, at most 300 words: the question, the options, the facts that bear on it. No advocacy, no file paths, no names of seats.
2. **Openings.** Each seat, in its own voice, two to four sentences, ending in adopt, amend or reject.
3. **The outsider.** Someone who is given the summary from step 1 and nothing else: no files, no seats, no history. It is asked one thing: what is the obvious point that people close to this would miss? Its answer goes in the file word for word, with who gave it: a helper, or the model's name as the script prints it. Two ways, the first where it is set up:
   - **Another maker's model:** save the summary to a file under `work/<item>/tmp/` or the system's temporary folder and run `node factory/tools/outside.mjs <file> --model <id>`. It needs `OPENROUTER_API_KEY` in the environment and a model the owner has chosen (`FACTORY_OUTSIDER_MODEL`, or one from `--list`). The script sends the summary only and refuses one that names a file. A free model may keep what it is sent, so the summary holds nothing private. Even with no names in it, the summary tells that model's maker what the project has not yet decided: where that matters, use a helper.
   - **A helper:** start one helper with the summary as its whole brief and tell it to use no tools. This skill allows that one helper. It is also the fallback: when the script refuses or the model does not answer, a helper takes the outsider's place and the file says so.
   Where neither can be done, write `No outsider:` and why. Never voice the outsider yourself: a seat that has read the files is not an outsider.
4. **Rebuttal.** One round. A seat answers by name the seat it disagrees with, and at least one seat answers the outsider.
5. **Vote,** question by question: the count, and each dissent with its reason in one line. The chair breaks a tie.
6. **The verdict in five lines.**
7. **The single next move.** One action, not a list: what is done, who does it, and the command or file that shows it is done. Where the move is the owner's to approve, the next move is that approval, by its number in step 8.
8. **What the owner must decide:** numbered, each with the council's recommendation and its count.

## Rules of every sitting

- Seats speak in the user's words, never in codes.
- A seat uses a veto only as `SEATS.md` gives it.
- A claim names its evidence: a file, a number, an earlier decision.
- The seats are voiced by a model, not by the people they stand for. The decision file says so, and anything a real person should confirm is marked provisional.
- The council recommends on what is reserved for the owner; it never decides it.
- A decision is reopened only on new evidence.

## Write

`factory/decisions/<date>-<words>.md` (today's date), in the form of `factory/council/decision.md`. Under "Read" list the files you read. End it `Confirmed by: not yet confirmed`: the chair or the owner writes that line.

Where the questions came from a work item whose tests are not yet sealed, change its `item.md` in two places and nowhere else:
- under `## Answers`, one line naming this file;
- under `## Criteria`, one line for each answer that adds behaviour no criterion states (a new refusal, a new result), in the answer's own words and ending `(answer N)`. That is how it gets a sealed test. An answer that only explains an existing criterion adds no line.

Commit as `council: <size> on <the questions in a few words>`. An answer never edits the requirements: the owner writes a confirmed answer into them.

Check: every question has an answer and who gave it; a council's file holds the neutral summary, the outsider's answer or why there was none, every dissent, and one next move with what shows it is done; every item for the owner carries a recommendation; the file says which answers are provisional; every answer that adds behaviour is a criterion in the work item.
