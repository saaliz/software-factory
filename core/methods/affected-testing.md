# Affected tests during repairs

After a defect fix, run the regression for the changed behavior and the small direct contract checks for its callers. Repair feedback defaults to this scope, not the whole module, package or repository command. Compile/type, static, seal, source and boundary checks still apply. At the project's explicit delivery, candidate and release checkpoints, run the full commands those gates require. A targeted green run never marks a package, module or release complete.

## Configure once, review each change

Both profiles install `factory/tools/affected.mjs`, `factory/affected.json` and `factory/affected.example.json`. The empty active registry refuses every code change until the project supplies reviewed mappings. The example shows the full shape; its paths and zero/one blob hashes are illustrative, never active selections. This is curated selection, not a program call graph. A project owns and versions its targets, selection reasons and direct contract relationships. It must review callers and shared helpers; naming a file alone does not prove that its tests cover the impact.

Each target has `id`, `kind: "node"`, `classification` (`unit`, `focused-integration`, `direct-contract` or `tooling`), and one exact `file` ending in `.test.mjs`, `.test.cjs` or `.test.js`. Changed inputs and targets must be regular tracked files; symlinks and submodules refuse. No glob, shell command, whole-suite fallback or E2E target is accepted. A file containing broad/E2E tests is not a small repair target: split its focused checks or implement a project adapter with exact selectors.

Each area has `id`, a reviewed `reason`, `paths`, `targets` and `contracts`. Each path is `{ "exact": "src/example.mjs", "before": "<base Git blob hash>", "after": "<head Git blob hash>" }`. Obtain hashes with `git rev-parse <base>:<path>` and `git hash-object <path>` before committing (respect repository filters/line endings; the planner reports the observed hashes). Use `null` for an absent file. Refresh bindings for the actual repair diff; do not copy a binding from a different base. Deletion, renamed old/new paths and shared-helper edits need explicit reviewed impact and surviving replacement checks. Changed test files also require mappings; a passing survivor cannot silently substitute for a removed assertion.

A contract is `{ "id": "consumer-shape", "description": "<why this direct caller is affected>", "targets": ["consumer-check"] }`; its targets must have `direct-contract` classification. Every selected target retains all changed-path, area and contract reasons, once. An area's `targets` must be nonempty; `contracts` may be empty only when review finds no direct caller to check.

The registry's own control path, `{ "exact": "factory/affected.json" }`, has no circular before/after pins. Give it an explicit area selecting focused registry/selection regressions and a reason. Its entire head contents are pinned in every plan. This exception applies only to that file, not adjacent tools or configuration. Builders may refresh reviewed impact bindings within their existing repair scope; an adapter, verification policy or gate change still follows the project's existing ownership rules. Records may declare an exact `.md` or `.txt` path and a nonempty `review`; they carry static-review obligations and no runtime proof. They cannot hide a stale code mapping. No record or code prefix rule is accepted.

## Plan, inspect, run

Commit the repair and reviewed registry first. From the repository root, with a clean tree, including untracked inputs:

```bash
mkdir -p work/repair/tmp
node factory/tools/affected.mjs plan --base <immutable-base-SHA> --head HEAD > work/repair/tmp/affected.plan.json
node factory/tools/affected.mjs run --plan work/repair/tmp/affected.plan.json > work/repair/tmp/affected.result.json
```

Create the output folder with your shell's equivalent (`New-Item -ItemType Directory -Force work/repair/tmp` in PowerShell). The installed `work/.gitignore` ignores this output folder. Inspect the plan's changed paths, reasons, direct contracts and scope before running. No unknown path, stale binding, missing test or unsupported adapter may be worked around by widening the command. Repair the mapping or adapter and regenerate the plan. The run recomputes the exact plan and checks HEAD and a clean tree before and after execution. It records base/head, registry and implementation hashes, runtime, counts, exits and each target's output. All selected targets run even if one fails. Nonzero exit, zero/ambiguous discovery, skipped, todo or cancelled tests cannot be green. An empty or record-only diff exits nonzero on `run`: it provides no runtime evidence.

In the harness, run repair tests/builds through the main checkout's shared heavy slot, for example `node factory/tools/slots.mjs heavy --label repair -- node factory/tools/affected.mjs run --plan work/repair/tmp/affected.plan.json`. Full CI still uses the CI slot at its checkpoint. Light projects use their own resource limits.

## Other stacks: the project adapter interface

The shipped CLI supports Node exact files only; other kinds refuse. It needs Git and Node, no .NET SDK or services. `runNode(root, target)` is the existing exact-file transport and `nodeResult(result)` checks Node discovery. `executeAffected(root, plan, { runTarget })` permits a reviewed Node transport wrapper or a test double; it does not enable other selector kinds or result formats.

A project adding another adapter must version and map its adapter code and tests, extend registry validation and target identity/readiness, implement execution, and validate the runner's actual discovered test identities and counts against every exact selector. Return per-target status, total/passed, exit, timing and output; failed builds, failed discovery, missing results, skip/not-run, or runner failure remain red while independent targets continue. Keep pin verification before/after execution and the affected-only evidence scope. No automatic adapter discovery or shell command is part of this kit.

When the stack has a pinned SDK, resolve and probe it in the project's configuration scope (for .NET, the cwd owning `global.json`); use that same scope/environment for the smallest necessary test-project build. SDK, project and binary paths belong to project configuration, never this kit. Node-only plans must not probe another stack's SDK. Add focused red/green tests of these boundaries before claiming adapter support; the kit does not claim universal .NET support.

Independent QA and the two semantic readings still compare behavior with the product requirements, design, architecture and ADRs/decisions. Keep the failing regression/counterexample line, compile feedback and final affected evidence in the builder's note; name full/E2E as not run until their checkpoint actually runs.
