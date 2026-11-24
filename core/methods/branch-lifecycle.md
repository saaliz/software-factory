# Branch lifecycle: every branch ends

Read by whoever cuts a branch, and by the session that merges. `node factory/tools/orphans.mjs` lists the branches and worktrees that have no owner or no end.

THE PROBLEM IT STOPS. On the kit's second project, one day's count found 160 local branches, 68 of them not on the main branch, and 83 worktrees, 33 of them detached copies made for reviews. Nothing said which branch belonged to which work item or session, or when it should end. A clean-up of worktrees then deleted ignored journals that a running test stack still needed.

## Every branch is registered

Cutting a branch also writes one line to `factory/branches.json`:

```json
{ "work/05-cited-answer": { "item": "work/05-cited-answer", "session": "<who works on it>", "opened": "2026-11-24" } }
```

The key is the branch name. A branch for a process change names its decision instead of an item. A review gets a detached copy in a scratch folder, which is removed when the review ends, never left beside the project.

## Every branch ends in one of three ways

| End | When | Done by |
|---|---|---|
| Merged | its item is clear and released | the session that merges; then the branch is deleted |
| Closed | it was replaced, abandoned or redone elsewhere | the owner approves; the reason goes in the ledger as `"closed": "<reason>"`; the branch is deleted |
| Archived | its work may be wanted later | a tag `archive/<branch>` is made, then the branch is deleted |

Deleting a branch or a worktree is the owner's word unless it is merged. The script only lists. It deletes nothing.

## Before removing a worktree

1. List the ignored and untracked files in it (`git status --ignored --short`), and copy the ones that are not build output to a dated archive folder.
2. Check that no running service mounts a path inside it.
3. Then remove it.

## What the script flags

`orphans.mjs` reads git and the ledger, and prints one line per problem with a suggested end:

- **unregistered**: a branch not in the ledger;
- **released, not merged**: its item's `## Release` is filled, but the branch is not on the main branch;
- **merged, not deleted**: on the main branch, still a branch;
- **idle**: no commit in `--idle` days (default 3), not merged;
- **no item**: the ledger names an item folder that does not exist;
- **worktree prunable** or **worktree detached**: a worktree git can prune, or a detached copy left behind.

Run it at the start of every orchestrator day and before a release. A release has none of its own branches on the list.

Check: every branch is registered when it is cut; every listed branch gets an end the same day or an owner question; no worktree is removed before its ignored files are archived.
