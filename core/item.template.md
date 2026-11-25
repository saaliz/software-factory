# <The work item in words a user would say>

<!-- One work item delivers one or more journey steps end to end, small enough for one fresh build session and one review. -->
<!-- Copy this file to work/NN-words/item.md. The gate ignores comment lines like these; delete them as you fill each part. -->
<!-- factory/methods/objectives-and-criteria.md says how to fill Objective, Criteria and Counterfactuals; `node factory/tools/criteria.mjs work/NN-words` checks them. -->

## Objective

<!-- One sentence: who does what, and the result they see. -->

## Journey steps

<!-- One line each, starting "- ", naming the journey steps this item proves, for example "- J-05.2". factory/methods/user-journeys.md. -->

## Not in scope

<!-- One line each, starting "- ": what a reader might expect here that this item leaves out. -->

## Criteria

<!-- One line each, starting "- ": "Given <starting state>, when <action>, then <observable result>." Copied word for word from the requirements where they state it. At most 15; more means two work items. The first is C1. -->

## Counterfactuals

<!-- One line per criterion, starting "- C<n>: ": what must not happen, or the broken copy that turns its test red. -->

## Answers

<!-- Optional. One line per decision file in factory/decisions/ that answers a gap of this work item. The council skill adds them. -->

## Proof

<!-- Filled before any test is written, by factory/methods/proof-table.md: a table with one row per criterion and the columns Claim, Level (always, once, none), Proof, Catches, Misses. -->

## Seal

<!-- Left empty until `node factory/tools/seal.mjs work/NN-words --command "<the tests' command>" --whole "<the whole test command>" <test paths>` has written seal.json; then name the sealed paths and the tests' command here. -->

## Review

<!-- Left empty until the review. Its first line is `clear`, or the rule broken with its file and line. -->

## Release

<!-- Left empty until the release: `Version: ...` and one line of what a person can now do. -->
