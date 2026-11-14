# The forms of a decision file

Two forms. A council's sitting uses the first; a change to how the project works uses the second. One file per sitting, `factory/decisions/<date>-<words>.md`. What is not in a decision file was not decided.

## 1. A panel's or a council's decision

```
<Panel | Council> decision · <date> · <words>
Sat: <the seats, or the three experts> — voiced by one model session, not by the people they stand for
Asked: <the questions, numbered, each in one line>
Read: <the files>
```

Then, for a panel, one row per question: the question, each expert's view, **Answer (working)**, and its state: final, provisional (naming the expert who should confirm), or the owner's.

For a council, in this order:

1. **The next move** — one action, who takes it, and what shows it is done. It sits on top so a reader who stops here knows what happens next.
2. **The verdict in five lines.**
3. **The summary the outsider was given**, word for word, and **the outsider's answer**, word for word; or `No outsider:` and why.
4. **The vote** on each question with its count and every dissent.
5. **What the owner must decide**, numbered, each with the recommendation and its count.

```
Confirmed by: <the chair | the owner>, <date>
```

## 2. A change to how the project works

Taken by the owner alone. It is not in force until every heading is filled:

```
The owner's decision · <date> · <words>
Taken by: <name>
On: <the sitting or the evidence it rests on>
```

- **Decided** — numbered items, each marked evidence-based or a starting guess.
- **Replaces** — what it retires, by file name, changed in the same commit.
- **Owner** — one name: who carries it out and reports.
- **Measured by** — numbers read from a script or a counter, stated before it is taken, with today's value.
- **The test that shows it held** — a planted case a check turns red on, or a number that moved.
- **Reviewed on** — a date within a month; it lapses then unless renewed with the measures.

```
Confirmed by: <name>, <date>, <their words>
```
