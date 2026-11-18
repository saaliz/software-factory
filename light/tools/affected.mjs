// Curated repair verification. No call-graph inference, broad fallback or release proof.
//   node factory/tools/affected.mjs plan --base <commit SHA> [--head HEAD] > work/<item>/tmp/affected.plan.json
//   node factory/tools/affected.mjs run --plan work/<item>/tmp/affected.plan.json > work/<item>/tmp/affected.result.json
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const REGISTRY = 'factory/affected.json';
export const SCOPE = 'affected-only; full/E2E not run';
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const reporterUrl = new URL('./affected-node-reporter.mjs', import.meta.url), reporterFile = fileURLToPath(reporterUrl);
const implementationHash = () => hash(JSON.stringify([fileURLToPath(import.meta.url), reporterFile].map(file => [path.basename(file), hash(fs.readFileSync(file))])));
const safePath = file => typeof file === 'string' && /^[A-Za-z0-9_.@/-]+$/.test(file)
  && !file.startsWith('/') && file.split('/').every(p => p && p !== '.' && p !== '..');
const id = value => typeof value === 'string' && /^[a-z][a-z0-9-]*$/.test(value);
const blob = value => value === null || (typeof value === 'string' && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(value));
function git(root, args, optional = false) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', shell: false, maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0 && !optional) throw new Error(`git ${args[0]} failed: ${r.stderr?.trim() || r.error?.message || r.status}`);
  return r.status === 0 ? r.stdout : null;
}
const show = (root, pin, file) => git(root, ['show', `${pin}:${file}`], true);
const blobAt = (root, pin, file) => git(root, ['rev-parse', '--verify', `${pin}:${file}`], true)?.trim() ?? null;
function keys(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) throw new Error(`registry: invalid ${label} fields`);
}
const refs = (values, known, label, empty = false) => {
  if (!Array.isArray(values) || (!empty && !values.length) || new Set(values).size !== values.length || values.some(v => !known.has(v))) throw new Error(`registry: invalid ${label} references`);
};
export function validateRegistry(r) {
  keys(r, ['version', 'targets', 'contracts', 'areas', 'records'], 'root');
  if (r.version !== 1 || !['targets', 'contracts', 'areas', 'records'].every(k => Array.isArray(r[k]))) throw new Error('registry: expected version 1 with targets, contracts, areas and records');
  const targets = new Set(), files = new Set(), contracts = new Set(), areas = new Set();
  for (const t of r.targets) {
    keys(t, ['id', 'kind', 'classification', 'file'], 'target');
    if (!id(t.id) || targets.has(t.id) || !safePath(t.file) || !['unit', 'focused-integration', 'direct-contract', 'tooling'].includes(t.classification)) throw new Error(`registry: invalid/duplicate target ${t.id}`);
    if (t.kind !== 'node') throw new Error(`registry: unsupported adapter ${t.kind}; add a reviewed project adapter, never a broad command`);
    if (!/\.test\.(?:mjs|cjs|js)$/.test(t.file) || files.has(t.file)) throw new Error(`registry: Node target ${t.id} needs a unique exact test file`);
    targets.add(t.id); files.add(t.file);
  }
  for (const c of r.contracts) {
    keys(c, ['id', 'description', 'targets'], 'contract');
    if (!id(c.id) || contracts.has(c.id) || typeof c.description !== 'string' || !c.description.trim()) throw new Error('registry: invalid/duplicate contract');
    contracts.add(c.id); refs(c.targets, targets, c.id);
    if (c.targets.some(t => r.targets.find(x => x.id === t).classification !== 'direct-contract')) throw new Error(`registry: ${c.id} must select direct-contract targets`);
  }
  for (const a of r.areas) {
    keys(a, ['id', 'reason', 'paths', 'targets', 'contracts'], 'area');
    if (!id(a.id) || areas.has(a.id) || typeof a.reason !== 'string' || !a.reason.trim() || !Array.isArray(a.paths) || !a.paths.length) throw new Error('registry: invalid/duplicate area or missing reviewed selection reason');
    areas.add(a.id); refs(a.targets, targets, a.id); refs(a.contracts, contracts, a.id, true);
    const seen = new Set();
    for (const p of a.paths) {
      keys(p, ['exact', 'before', 'after'], 'path');
      if (!safePath(p.exact) || seen.has(p.exact)) throw new Error(`registry: ${a.id} needs unique exact paths`);
      seen.add(p.exact);
      // The registry cannot contain its own blob hash. Its selection is still explicit and reviewed.
      if (p.exact === REGISTRY) {
        if (Object.hasOwn(p, 'before') || Object.hasOwn(p, 'after')) throw new Error('registry: the registry control path takes no circular blob pins');
      } else if (!['before', 'after'].every(k => Object.hasOwn(p, k) && blob(p[k])) || (p.before === null && p.after === null)) throw new Error(`registry: ${p.exact} requires exact before/after Git blob identities (null means absent)`);
    }
  }
  for (const record of r.records) {
    keys(record, ['exact', 'review'], 'record');
    if (!safePath(record.exact) || !/\.(?:md|txt)$/.test(record.exact) || typeof record.review !== 'string' || !record.review.trim()) throw new Error('registry: record needs an exact document path and required static review');
  }
  return r;
}
function resolve(root, ref, base = false) {
  if (!(base ? /^[0-9a-f]{7,64}$/i : /^(?:HEAD|[0-9a-f]{7,64})$/i).test(ref ?? '')) throw new Error(`${base ? 'base' : 'head'} must be ${base ? 'an immutable commit SHA' : 'HEAD or a commit SHA'}`);
  return git(root, ['rev-parse', '--verify', `${ref}^{commit}`]).trim();
}
/** Git's immutable diff retains both sides of renames. No test self-selects or inherits a survivor. */
export function changedTrackedPaths(root, base, head) {
  const words = git(root, ['diff', '--no-ext-diff', '--no-textconv', '--name-status', '-z', '--find-renames', base, head, '--']).split('\0');
  const changes = [];
  for (let i = 0; words[i];) {
    const status = words[i++], oldPath = words[i++], newPath = /^[RC]/.test(status) ? words[i++] : undefined;
    if (!safePath(oldPath) || (newPath && !safePath(newPath))) throw new Error('changed path cannot be represented safely; use a supported path and explicit mapping');
    changes.push({ status, oldPath, ...(newPath ? { newPath } : {}) });
  }
  return changes;
}
function regularAt(root, pin, file) {
  return /^100(?:644|755) blob /.test(git(root, ['ls-tree', pin, '--', file]));
}
export function affectedPlan(root, { base, head = 'HEAD' }) {
  base = resolve(root, base, true); head = resolve(root, head);
  const raw = show(root, head, REGISTRY);
  if (!raw || !regularAt(root, head, REGISTRY)) throw new Error(`affected mapping registry missing/not a regular tracked file at head: ${REGISTRY}`);
  const registry = validateRegistry(JSON.parse(raw)), changes = changedTrackedPaths(root, base, head);
  const changedPaths = [...new Set(changes.flatMap(c => [c.oldPath, ...(c.newPath ? [c.newPath] : [])]))].sort();
  const selected = new Map(), records = [], gaps = [];
  const select = (tid, reason) => {
    if (!selected.has(tid)) selected.set(tid, { ...registry.targets.find(t => t.id === tid), reasons: [] });
    const reasons = selected.get(tid).reasons;
    if (!reasons.some(r => JSON.stringify(r) === JSON.stringify(reason))) reasons.push(reason);
  };
  for (const file of changedPaths) {
    const before = blobAt(root, base, file), after = blobAt(root, head, file);
    if ((before !== null && !regularAt(root, base, file)) || (after !== null && !regularAt(root, head, file))) {
      gaps.push(`${file}: unsupported Git object/mode; affected mappings require regular file blobs, not symlinks or submodules`);
      continue;
    }
    const areas = registry.areas.filter(a => a.paths.some(p => p.exact === file));
    for (const area of areas) {
      const binding = area.paths.find(p => p.exact === file);
      if (file !== REGISTRY && (binding.before !== before || binding.after !== after)) {
        gaps.push(`${file}: stale mapping ${area.id}; review behavior, shared/deleted impact and replacement tests; observed before=${before} after=${after}`);
        continue;
      }
      for (const tid of area.targets) select(tid, { changedPath: file, area: area.id, contract: null, reason: area.reason });
      for (const cid of area.contracts) {
        const c = registry.contracts.find(c => c.id === cid);
        for (const tid of c.targets) select(tid, { changedPath: file, area: area.id, contract: cid, reason: c.description });
      }
    }
    if (!areas.length) {
      const record = registry.records.find(r => r.exact === file);
      if (record) records.push({ changedPath: file, outcome: 'record-only; no runtime proof', requiredReview: record.review });
      else gaps.push(`${file}: no affected mapping; review this exact change and its direct contracts (deleted/renamed tests need explicit surviving replacements)`);
    }
  }
  const targets = [...selected.values()].sort((a, b) => a.id.localeCompare(b.id));
  for (const t of targets) if (!regularAt(root, head, t.file)) gaps.push(`target ${t.id} missing/not a regular tracked file at head: ${t.file}`);
  if (gaps.length) throw new Error(`affected plan refused:\n${gaps.join('\n')}`);
  return { version: 1, mode: 'affected-only', base, head, registry: REGISTRY, registryHash: hash(raw), implementationHash: implementationHash(), changes, changedPaths, targets, records,
    outcome: targets.length ? 'selected tests require execution' : changedPaths.length ? 'record-only; static review required; no runtime proof' : 'no tracked changes; no runtime proof',
    requiredReviews: ['Independent QA and both semantic source review axes remain required.', 'Compile, static, seal, source, boundary and delivery/release checkpoint checks remain required.'], scope: SCOPE };
}
export function verifyPlan(root, p) {
  if (git(root, ['rev-parse', 'HEAD']).trim() !== p.head) throw new Error('affected run refused: HEAD drift from pinned plan');
  if (git(root, ['status', '--porcelain', '--untracked-files=all']).trim()) throw new Error('affected run requires a clean HEAD (including untracked inputs)');
  const expected = affectedPlan(root, { base: p.base, head: p.head });
  if (JSON.stringify(p) !== JSON.stringify(expected)) throw new Error('affected plan does not match exact pinned diff, registry and implementation; regenerate plan');
  return p;
}
/** Node exact-file adapter. Project adapters must own exact selection, discovery and SDK/build scope; see affected-testing.md. */
export function runNode(root, target) {
  const r = spawnSync(process.execPath, ['--test', `--test-reporter=${reporterUrl.href}`, target.file], { cwd: root, env: process.env, shell: false, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return { code: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '', ...(r.error ? { error: r.error.message } : {}) };
}
export function nodeResult(r, expectedFile) {
  const issues = [];
  let events = [];
  try { events = (r.stdout ?? '').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); }
  catch { issues.push('invalid discovery event stream'); }
  const summaries = events.filter(e => e?.type === 'test:summary').map(e => e.data);
  const files = summaries.filter(e => typeof e?.file === 'string'), aggregate = summaries.filter(e => e && !Object.hasOwn(e, 'file'));
  const countNames = ['tests', 'passed', 'failed', 'cancelled', 'skipped', 'todo', 'suites'];
  const validCounts = c => c && countNames.every(k => Number.isSafeInteger(c[k]) && c[k] >= 0);
  const discovered = files.length === 1 && aggregate.length === 1 && validCounts(files[0].counts) && validCounts(aggregate[0].counts)
    && (!expectedFile || path.resolve(files[0].file) === path.resolve(expectedFile));
  // Node's successful empty-file placeholder has tests/pass 1 in the aggregate, but no
  // per-file registration summary. An empty describe has a summary with tests 0.
  const total = discovered ? files[0].counts.tests : 0, passed = discovered ? files[0].counts.passed : 0;
  const tests = (discovered ? events : []).filter(e => ['test:pass', 'test:fail'].includes(e?.type) && e.data?.details?.type === 'test').map(e => ({
    name: e.data.name, file: e.data.file, line: e.data.line, column: e.data.column, nesting: e.data.nesting,
    status: e.type === 'test:pass' && !e.data.skip && !e.data.todo ? 'passed' : 'failed/not run',
  }));
  if (!discovered || !total) issues.push('zero real test discovery or missing/ambiguous per-file registration summary');
  if (discovered && (countNames.some(k => files[0].counts[k] !== aggregate[0].counts[k]) || tests.length !== total
    || tests.some(t => typeof t.name !== 'string' || !t.name || typeof t.file !== 'string' || !Number.isSafeInteger(t.line) || t.line < 1))) issues.push('discovery outcomes do not match exact-file summaries');
  if (summaries.some(s => !s?.success || ['failed', 'cancelled', 'skipped', 'todo'].some(k => s.counts?.[k])) || tests.some(t => t.status !== 'passed')) issues.push('failed, cancelled, skipped or todo tests');
  if (r.code !== 0 || r.error) issues.push(r.error ?? `runner exit ${r.code}`);
  const ok = total > 0 && total === passed && issues.length === 0;
  return { status: !total ? 'not run' : ok ? 'passed' : 'failed', total, passed, tests, issues };
}
/** runTarget is the exact-target transport seam for tests/project wrappers; it cannot widen registry selectors. */
export function executeAffected(root, p, { runTarget = runNode } = {}) {
  verifyPlan(root, p);
  const started = Date.now(), results = [];
  for (const target of p.targets) {
    const at = Date.now();
    let r; try { r = runTarget(root, target); } catch (e) { r = { code: 1, error: e.message }; }
    results.push({ id: target.id, ...nodeResult(r, path.resolve(root, target.file)), code: r.code ?? 1, durationMs: Date.now() - at, stdout: r.stdout ?? '', stderr: r.stderr ?? '' });
  }
  let pinError; try { verifyPlan(root, p); } catch (e) { pinError = e.message; }
  return { ...p, at: new Date().toISOString(), durationMs: Date.now() - started, runtime: { kind: 'node', version: process.version, executable: process.execPath }, results,
    ...(pinError ? { pinError } : {}), allPassed: p.targets.length > 0 && !pinError && results.every(r => r.status === 'passed') };
}
export function parseArgs(args) {
  const [mode, ...rest] = args;
  if (!['plan', 'run'].includes(mode)) throw new Error('usage: affected.mjs plan --base <SHA> [--head HEAD] | run --plan <file>');
  const allowed = mode === 'plan' ? ['--base', '--head'] : ['--plan'], options = {};
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i];
    if (!allowed.includes(key) || Object.hasOwn(options, key.slice(2)) || !rest[i + 1] || rest[i + 1].startsWith('--')) throw new Error(`invalid or duplicate option ${key}`);
    options[key.slice(2)] = rest[i + 1];
  }
  if (mode === 'plan' ? !options.base : !options.plan) throw new Error(`missing ${mode === 'plan' ? '--base' : '--plan'}`);
  return { mode, ...options };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { mode, ...options } = parseArgs(process.argv.slice(2)), root = process.cwd();
    const result = mode === 'plan' ? affectedPlan(root, options) : executeAffected(root, JSON.parse(fs.readFileSync(options.plan, 'utf8')));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = mode === 'run' && !result.allPassed ? 1 : 0;
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
