// The gate: whether a work item may take its next step. A session's report is a claim; this is the check.
//   node factory/tools/gate.mjs work/<item>                                        where it stands and what is next
//   node factory/tools/gate.mjs work/<item> --can-start tests|build|review|release   exit 0 yes; exit 1 no, with the reasons
//   node factory/tools/gate.mjs work/<item> --prove                                the gate itself runs the commands the seal names and keeps the result in proof.json
// Review and release may not start without a green proof that still fits: the same seal, and no code changed since.
// A build note is a claim. The proof is the gate's own run, with the commit and the seal it ran on.
// A work item is a folder holding item.md with four headings: Criteria, Seal, Review, Release.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { check } from './seal.mjs';

export const HEADINGS = ['Criteria', 'Seal', 'Review', 'Release'];
export const STEPS = ['tests', 'build', 'review', 'release'];
const maxCriteria = () => Number(process.env.FACTORY_MAX_CRITERIA ?? 15);

/** item.md as { heading: its lines }, for second-level headings only. */
export function sections(text) {
  const out = {};
  let at = null;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) { at = m[1]; out[at] = []; continue; }
    if (at) out[at].push(line);
  }
  return out;
}

// A line that is only an HTML comment is the form's own guidance, not content.
const body = (lines = []) => lines.map((l) => l.trim()).filter((l) => l && !/^<!--.*-->$/.test(l));
export const criteria = (s) => body(s.Criteria).filter((l) => /^[-*]\s+\S/.test(l)).map((l) => l.replace(/^[-*]\s+/, ''));

/** What the item file itself must hold before any test is written. */
export function itemProblems(root, item) {
  const file = path.join(path.resolve(root, item), 'item.md');
  if (!fs.existsSync(file)) return { problems: [`no item.md in ${item}`], s: {} };
  const s = sections(fs.readFileSync(file, 'utf8'));
  const problems = HEADINGS.filter((h) => !(h in s)).map((h) => `item.md lacks the heading "## ${h}"`);
  const list = criteria(s);
  if (!list.length) problems.push('no criteria: write each as a line starting "- " under "## Criteria"');
  if (list.length > maxCriteria()) problems.push(`${list.length} criteria: at most ${maxCriteria()} in one work item, cut it in two`);
  const repeated = list.filter((c, i) => list.indexOf(c) !== i);
  if (repeated.length) problems.push(`a criterion is written twice: ${repeated[0]}`);
  return { problems, s };
}

export const proofFile = (root, item) => path.join(path.resolve(root, item), 'proof.json');
const posix = (p) => p.split(path.sep).join('/');
const lastLines = (text, n = 15) => String(text ?? '').split(/\r?\n/).filter((l) => l.trim()).slice(-n).map((l) => l.slice(0, 300));
const lines = (text) => (text ? text.split(/\r?\n/).filter(Boolean) : []);
const git = (root, ...args) => {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
};
// Everything but the work item's own folder: the proof, the seal and the notes live there and are not the code.
const outside = (item) => ['--', '.', `:(exclude)${posix(item)}`];
/** The commit and the uncommitted changes outside the work item; null where the folder is not a git repository. */
const gitState = (root, item) => {
  const commit = git(root, 'rev-parse', 'HEAD');
  return commit ? { commit, uncommitted: lines(git(root, 'status', '--porcelain', ...outside(item))).length } : null;
};

/** The gate runs the commands the seal names, and writes what happened. Nothing a session says stands in for this. */
export function prove(root, item, now = new Date()) {
  const { problems } = itemProblems(root, item);
  if (problems.length) return { ok: false, reasons: problems };
  const seal = check(root, item);
  if (seal.problems.length) return { ok: false, reasons: seal.problems };
  if (!seal.command) return { ok: false, reasons: ['the seal names no command to run: seal with --command "<the sealed tests\' command>", or reseal with --reseal "<why>" --command "<it>"'] };
  const at = gitState(root, item);
  const minutes = Number(process.env.FACTORY_PROVE_MINUTES ?? 60);
  const runs = [['sealed', seal.command], ...(seal.whole ? [['whole', seal.whole]] : [])].map(([name, command]) => {
    const r = spawnSync(command, { cwd: root, shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: minutes * 60000 });
    return { name, command, exitCode: r.status ?? -1, tail: lastLines(`${r.stdout ?? ''}\n${r.stderr ?? ''}`) };
  });
  const record = {
    at: now.toISOString(), commit: at?.commit ?? null, uncommitted: at?.uncommitted ?? null,
    sealedAt: seal.sealedAt, seal: seal.stamp, whole: seal.whole ? 'run' : 'not named in the seal',
    runs, ok: runs.every((r) => r.exitCode === 0),
  };
  fs.writeFileSync(proofFile(root, item), `${JSON.stringify(record, null, 2)}\n`);
  return { ok: record.ok, record, reasons: runs.filter((r) => r.exitCode !== 0).map((r) => `the ${r.name} command exited ${r.exitCode}: ${r.command}`) };
}

/** Why the proof does not stand; empty when it does. */
export function proofProblems(root, item) {
  const file = proofFile(root, item);
  const how = `run: node factory/tools/gate.mjs ${posix(item)} --prove`;
  if (!fs.existsSync(file)) return [`not proven: no proof.json; ${how}`];
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  const red = (record.runs ?? []).filter((r) => r.exitCode !== 0);
  if (!record.ok || red.length) return red.length ? red.map((r) => `the proof is red: the ${r.name} command exited ${r.exitCode}`) : ['the proof is red'];
  const problems = [];
  if (check(root, item).stamp !== record.seal) problems.push(`the seal changed since the proof; ${how}`);
  const now = gitState(root, item);
  if (now && record.commit) {
    if (record.uncommitted) problems.push(`proved on ${record.uncommitted} uncommitted changes outside the work item: commit them; ${how}`);
    const since = git(root, 'diff', '--name-only', record.commit, 'HEAD', ...outside(item));
    if (since === null) problems.push(`the proof names a commit this repository does not hold; ${how}`);
    else if (lines(since).length) problems.push(`the code changed since the proof (${lines(since).length} files); ${how}`);
    if (now.uncommitted) problems.push(`${now.uncommitted} uncommitted changes outside the work item since the proof: commit them; ${how}`);
  }
  return problems;
}

/** May the step start? */
export function canStart(root, item, step) {
  if (!STEPS.includes(step)) return { ok: false, reasons: [`unknown step "${step}": one of ${STEPS.join(', ')}`] };
  const { problems, s } = itemProblems(root, item);
  const reasons = [...problems];
  if (step !== 'tests' && !reasons.length) reasons.push(...check(root, item).problems);
  if ((step === 'review' || step === 'release') && !reasons.length) reasons.push(...proofProblems(root, item));
  if (step === 'release' && !reasons.length) {
    const verdict = body(s.Review)[0] ?? '';
    if (!/^clear\b/i.test(verdict)) reasons.push(verdict ? `the review is not clear: ${verdict}` : 'no review yet: "## Review" is empty');
  }
  return { ok: reasons.length === 0, reasons };
}

/** Where the item stands: the next step, or done. */
export function state(root, item) {
  const { problems, s } = itemProblems(root, item);
  if (problems.length) return { next: 'item', reasons: problems };
  const seal = check(root, item);
  if (!seal.sealed) return { next: 'tests', reasons: [] };
  if (seal.problems.length) return { next: 'stopped', reasons: seal.problems };
  if (body(s.Release).length) return { next: 'done', reasons: [] };
  const verdict = body(s.Review)[0] ?? '';
  const proof = proofProblems(root, item);
  if (/^clear\b/i.test(verdict)) return proof.length ? { next: 'prove', reasons: proof } : { next: 'release', reasons: [] };
  if (verdict) return { next: 'build', reasons: [`the review named: ${verdict}`] };
  // The build's note says it is done; that is a claim. The review waits for the gate's own run.
  if (!proof.length) return { next: 'review', reasons: [] };
  if (fs.existsSync(path.join(path.resolve(root, item), '3-build.md'))) return { next: 'prove', reasons: proof };
  return { next: 'build', reasons: [] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [item, flag, step] = process.argv.slice(2);
  const root = process.cwd();
  if (!item || (flag && !['--can-start', '--prove'].includes(flag))) { console.error('usage: gate.mjs work/<item> [--can-start tests|build|review|release | --prove]'); process.exit(2); }
  if (flag === '--prove') {
    const r = prove(root, item);
    (r.record?.runs ?? []).forEach((x) => console.log(`${x.name}: exit ${x.exitCode}  ${x.command}`));
    if (r.ok) console.log(`proven at ${r.record.commit ?? 'no commit (not a git repository)'}; the whole command: ${r.record.whole}`);
    else { console.error('not proven:'); r.reasons.forEach((x) => console.error(`  ${x}`)); process.exit(1); }
  } else if (flag) {
    const r = canStart(root, item, step);
    if (r.ok) console.log(`${step} may start`);
    else { console.error(`${step} may not start:`); r.reasons.forEach((x) => console.error(`  ${x}`)); process.exit(1); }
  } else {
    const r = state(root, item);
    console.log(`next: ${r.next}`);
    r.reasons.forEach((x) => console.log(`  ${x}`));
    if (r.next === 'stopped' || r.next === 'item') process.exit(1);
  }
}
