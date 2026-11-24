// The criteria check: what a script can check of a work item's objective and criteria. It checks form, never meaning.
//   node factory/tools/criteria.mjs work/<item>     "criteria hold", or the problems (exit 1)
// It runs only on an item that has "## Objective", so items written before factory/methods/objectives-and-criteria.md
// are left alone. The gate runs it too: such an item takes no step until it passes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The verbs that make a criterion a build step instead of something a user or caller can see.
const BUILD_AFTER_THEN = /\b(create[sd]?|add(s|ed)?|implement(s|ed)?|migrat(e|es|ed)|refactor(s|ed)?|scaffold(s|ed)?|wire[sd]?|build(s)?|writes? the code)\b/i;
const BUILD_ANYWHERE = /\b(implement(s|ed)?|migrat(e|es|ed)|refactor(s|ed)?|scaffold(s|ed)?|writes? the code)\b/i;
const ID_ONLY = /^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+\.?$/;

/** item.md as { heading: its lines }, second-level headings only. */
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
const items = (lines) => body(lines).filter((l) => /^[-*]\s+\S/.test(l)).map((l) => l.replace(/^[-*]\s+/, ''));

/** The problems with one criterion, numbered n (C1 is the first). */
export function criterionProblems(text, n) {
  const at = `C${n} "${text.length > 60 ? `${text.slice(0, 57)}...` : text}"`;
  if (ID_ONLY.test(text)) return [`${at}: an identifier alone; write what happens, so it reads without another file`];
  const out = [];
  if (!/^given\b/i.test(text)) out.push(`${at}: start with "Given <starting state>", named from the shared fixtures`);
  if (!/\bwhen\b/i.test(text)) out.push(`${at}: no "when <action>"`);
  const thens = text.match(/\bthen\b/gi) ?? [];
  if (!thens.length) out.push(`${at}: no "then <observable result>"`);
  if (thens.length > 1) out.push(`${at}: ${thens.length} "then"s; one behaviour per criterion, so split it`);
  const after = thens.length ? text.slice(text.search(/\bthen\b/i)) : '';
  if (BUILD_AFTER_THEN.test(after)) out.push(`${at}: "${after.match(BUILD_AFTER_THEN)[0]}" after "then" is a build step; say what a user or caller sees`);
  else if (BUILD_ANYWHERE.test(text)) out.push(`${at}: "${text.match(BUILD_ANYWHERE)[0]}" is an implementation word; move the step to the checklist`);
  return out;
}

/** Every problem with the objective, journey steps, criteria and counterfactuals. [] when they hold. */
export function criteriaProblems(s) {
  if (!('Objective' in s)) return [];
  const out = [];
  const objective = body(s.Objective);
  if (!objective.length) out.push('no objective: one sentence under "## Objective", who does what and what they see');
  if (objective.length > 1) out.push(`the objective is ${objective.length} lines: one sentence, on one line`);
  if ('Journey steps' in s && !items(s['Journey steps']).length) out.push('no journey steps: name each as "- J-NN.n", or delete the heading if the project has no journeys');
  const list = items(s.Criteria);
  list.forEach((c, i) => out.push(...criterionProblems(c, i + 1)));
  if (!('Counterfactuals' in s)) {
    if (list.length) out.push('no "## Counterfactuals": one line "- C<n>: ..." for each criterion');
    return out;
  }
  const seen = new Map();
  for (const line of items(s.Counterfactuals)) {
    const m = line.match(/^C(\d+)\s*:\s*(.*)$/);
    if (!m) { out.push(`a counterfactual line is not "C<n>: ...": ${line}`); continue; }
    const n = Number(m[1]);
    if (!m[2].trim()) out.push(`C${n}: the counterfactual is empty`);
    if (n < 1 || n > list.length) out.push(`C${n}: no criterion ${n}; there are ${list.length}`);
    if (seen.has(n)) out.push(`C${n}: written twice`);
    seen.set(n, m[2]);
  }
  for (let n = 1; n <= list.length; n++) if (!seen.has(n)) out.push(`C${n}: no counterfactual; say what must not happen, or the broken copy that turns its test red`);
  return out;
}

export function check(root, item) {
  const file = path.join(path.resolve(root, item), 'item.md');
  if (!fs.existsSync(file)) return { checked: false, problems: [`no item.md in ${item}`] };
  const s = sections(fs.readFileSync(file, 'utf8'));
  return { checked: 'Objective' in s, problems: criteriaProblems(s) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [item] = process.argv.slice(2);
  if (!item) { console.error('usage: criteria.mjs work/<item>'); process.exit(2); }
  const r = check(process.cwd(), item);
  if (!r.checked && !r.problems.length) { console.log('not checked: no "## Objective" (written before factory/methods/objectives-and-criteria.md)'); process.exit(0); }
  if (!r.problems.length) { console.log('criteria hold'); process.exit(0); }
  r.problems.forEach((p) => console.error(p));
  process.exit(1);
}
