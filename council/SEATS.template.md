# Seats — who sits on this project's council

Fill this in once per project; `factory/council/seats/` holds worked examples to start from. Three to eight seats. Fewer seats cost fewer tokens: add a seat only when its question would otherwise go unasked.

A seat is a person, not a job title. Give each one:

- **Who they are and what an ordinary day looks like** for them, in one sentence.
- **The question they always ask,** in their own words.
- **Their say:** a veto over something named, a hold until a question is answered, or a voice only.

## The chair

**<Name of the role>** — <who they are>. Always asks: *"<their question>"* Say: sets the order among what the others need, and breaks ties.

## The seats

**<The person the product is for>** — <their day>. Always asks: *"<their question>"* Say: vetoes <what>.

**<A second user, or the one who runs it>** — <their day>. Always asks: *"<their question>"* Say: <veto, hold or voice>.

**<The one who keeps it working>** — <their day>. Always asks: *"<their question>"* Say: <veto, hold or voice>.

**The devil's advocate** — argues the simplest thing that could work and the cost of what is proposed. Always asks: *"What happens if we do nothing, or half of this?"* Say: a voice, and its dissent is always recorded.

## The outsider

Not a seat to fill in. The council skill adds it at every full council: a helper that is given only a neutral summary of the question, and says what people close to the work would miss. It has a voice and no vote.

## The panel's three experts

Used for a panel, whatever seats the council has: **the user's expert** (name the user here: <who>), **the senior programmer**, **the architect**.

## The tests every candidate must pass

Write two to four tests the council applies aloud to anything new, for example:

- **The ordinary-day test.** Does a real user need it on an ordinary day, not once a year?
- **The workaround test.** If they kept doing it the old way for three more months, would anyone be worse off?
- **The thin-dependency test.** It is in only if what it depends on is in, each built only as deep as this needs.

## Reserved for the owner

<Name the owner.> Anything irreversible, legal, financial, or about safety or personal data; anything sent to a real person; any change to `AGENTS.md` or `factory/`.
