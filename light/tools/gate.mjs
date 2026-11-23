// The gate: whether a work item may take its next step. A session's report is a claim; this is the check.
//   node factory/tools/gate.mjs work/<item>                                        where it stands and what is next
//   node factory/tools/gate.mjs work/<item> --can-start tests|build|review|release   exit 0 yes; exit 1 no, with the reasons
// A work item is a folder holding item.md with four headings: Criteria, Seal, Review, Release.
// The build order is factory/build-order: `layered` (build first, tests sealed after, factory/methods/layered-build.md)
// or `tests-first` (tests sealed before the build). Without the file the order is tests-first, as before.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check } from './seal.mjs';

export const HEADINGS = ['Criteria', 'Seal', 'Review', 'Release'];
export const STEPS = ['tests', 'build', 'review', 'release'];
const maxCriteria = () => Number(process.env.FACTORY_MAX_CRITERIA ?? 15);
export const ORDERS = ['layered', 'tests-first'];

/** The project's build order, read from factory/build-order. */
export function buildOrder(root) {
  const file = path.join(root, 'factory', 'build-order');
  if (!fs.existsSync(file)) return 'tests-first';
  const order = fs.readFileSync(file, 'utf8').trim();
  if (!ORDERS.includes(order)) throw new Error(`factory/build-order holds "${order}": write one of ${ORDERS.join(', ')}`);
  return order;
}
const built = (root, item) => fs.existsSync(path.join(path.resolve(root, item), '3-build.md'));

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

/** May the step start? */
export function canStart(root, item, step) {
  if (!STEPS.includes(step)) return { ok: false, reasons: [`unknown step "${step}": one of ${STEPS.join(', ')}`] };
  const { problems, s } = itemProblems(root, item);
  const reasons = [...problems];
  const layered = buildOrder(root) === 'layered';
  if (layered && step === 'tests' && !reasons.length && !built(root, item)) reasons.push('layered order: the build comes first; no 3-build.md yet');
  if (layered && step === 'build') {
    // Building before the seal is the layered order; once sealed, the seal must still hold.
    if (!reasons.length && check(root, item).sealed) reasons.push(...check(root, item).problems);
  } else if (step !== 'tests' && !reasons.length) reasons.push(...check(root, item).problems);
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
  const layered = buildOrder(root) === 'layered';
  if (!seal.sealed) return { next: layered && !built(root, item) ? 'build' : 'tests', reasons: [] };
  if (seal.problems.length) return { next: 'stopped', reasons: seal.problems };
  if (body(s.Release).length) return { next: 'done', reasons: [] };
  const verdict = body(s.Review)[0] ?? '';
  if (/^clear\b/i.test(verdict)) return { next: 'release', reasons: [] };
  if (verdict) return { next: 'build', reasons: [`the review named: ${verdict}`] };
  // The build leaves its note when it is done; until a review is written, that note is the only sign of it.
  // Layered: the build came before the seal, so a sealed item goes on to its run and review.
  if (built(root, item)) return { next: 'review', reasons: [] };
  return { next: 'build', reasons: [] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [item, flag, step] = process.argv.slice(2);
  const root = process.cwd();
  if (!item || (flag && flag !== '--can-start')) { console.error('usage: gate.mjs work/<item> [--can-start tests|build|review|release]'); process.exit(2); }
  if (flag) {
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
