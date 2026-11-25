// User journeys: one file per journey under journeys/, read three ways. factory/methods/user-journeys.md is the method.
//   node factory/tools/journeys.mjs                      check every journey file; exit 1 on a problem
//   node factory/tools/journeys.mjs --walkthrough J-05   write work/journeys/J-05/walkthrough.html from the file and its run.json
//   node factory/tools/journeys.mjs --trace [--json]     requirement -> steps -> work items -> last outcome, then the gaps
// Settings, optional: factory/journeys.json { requiredDenials, known: { screen|operation|event: [files] }, release: [ids] }.
// It changes nothing but the walkthrough page it is asked to write.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sections } from './criteria.mjs';

const VIA = ['screen', 'operation', 'event'];
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

export function settings(root) {
  const file = path.join(root, 'factory', 'journeys.json');
  const s = fs.existsSync(file) ? readJson(file) : {};
  return { requiredDenials: s.requiredDenials ?? [], known: s.known ?? {}, release: s.release ?? [] };
}

/** Every journey file as { file, journey } (or { file, error } when it is not JSON). */
export function load(root) {
  const dir = path.join(root, 'journeys');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^J-.*\.json$/.test(f)).sort().map((f) => {
    try { return { file: `journeys/${f}`, journey: readJson(path.join(dir, f)) }; } catch (e) { return { file: `journeys/${f}`, error: e.message }; }
  });
}

/** The problems with one journey, given the project's settings and a reader for the contract files. */
export function journeyProblems(j, { requiredDenials = [], known = {} } = {}, read = () => '') {
  const out = [];
  const at = j.id ?? '(no id)';
  for (const f of ['id', 'title', 'actor', 'fixture']) if (typeof j[f] !== 'string' || !j[f].trim()) out.push(`${at}: no "${f}"`);
  if (!Array.isArray(j.languages) || !j.languages.length) out.push(`${at}: no "languages"`);
  if (!Array.isArray(j.steps) || !j.steps.length) return [...out, `${at}: no steps`];
  const ids = new Set();
  for (const st of j.steps) {
    const sid = st.id ?? '(no id)';
    if (!st.id || !String(st.id).startsWith(`${j.id}.`)) out.push(`${sid}: a step id starts with the journey's, "${j.id}."`);
    if (ids.has(st.id)) out.push(`${sid}: written twice`);
    ids.add(st.id);
    for (const f of ['does', 'expect']) if (typeof st[f] !== 'string' || !st[f].trim()) out.push(`${sid}: no "${f}"`);
    if (!Array.isArray(st.proves) || !st.proves.length) out.push(`${sid}: proves no requirement`);
    const via = Object.keys(st.via ?? {}).filter((k) => VIA.includes(k));
    if (via.length !== 1) out.push(`${sid}: "via" names one of ${VIA.join(', ')}`);
    for (const k of via) {
      const files = known[k] ?? [];
      if (files.length && !files.some((f) => read(f).includes(st.via[k]))) out.push(`${sid}: ${k} "${st.via[k]}" is in none of ${files.join(', ')}`);
    }
    if (st.kind === 'denial' && !st.denies) out.push(`${sid}: a denial says what it denies ("denies")`);
  }
  const denials = j.steps.filter((st) => st.kind === 'denial');
  if (!denials.length) out.push(`${at}: no denial step; a journey proves what must not happen too`);
  for (const d of requiredDenials) if (!denials.some((st) => st.denies === d)) out.push(`${at}: no denial step for "${d}"`);
  return out;
}

export function checkAll(root) {
  const set = settings(root);
  const read = (f) => { const p = path.join(root, f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; };
  const out = [];
  for (const f of Object.values(set.known).flat()) if (!fs.existsSync(path.join(root, f))) out.push(`factory/journeys.json names ${f}, which does not exist`);
  const seen = new Set();
  for (const { file, journey, error } of load(root)) {
    if (error) { out.push(`${file}: not JSON: ${error}`); continue; }
    if (seen.has(journey.id)) out.push(`${file}: journey ${journey.id} written twice`);
    seen.add(journey.id);
    out.push(...journeyProblems(journey, set, read));
  }
  return out;
}

/** A step's last outcome over its languages: pass only if every language passed; fail if any failed; else not run. */
export function outcomes(run, languages = []) {
  const by = new Map();
  for (const r of run?.steps ?? []) {
    if (!by.has(r.id)) by.set(r.id, []);
    by.get(r.id).push(r);
  }
  const out = new Map();
  for (const [id, rs] of by) {
    if (rs.some((r) => r.outcome === 'fail')) out.set(id, 'fail');
    else if (rs.every((r) => r.outcome === 'pass') && languages.every((l) => rs.some((r) => r.language === l))) out.set(id, 'pass');
    else out.set(id, 'not run');
  }
  return out;
}

const runOf = (root, id) => { const f = path.join(root, 'work', 'journeys', id, 'run.json'); return fs.existsSync(f) ? readJson(f) : null; };

/** Work items and the journey steps each names under "## Journey steps". */
export function itemSteps(root) {
  const dir = path.join(root, 'work');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, 'item.md'))).sort().map((d) => {
    const s = sections(fs.readFileSync(path.join(dir, d, 'item.md'), 'utf8'));
    const steps = [...(s['Journey steps'] ?? []).filter((l) => !/^\s*<!--.*-->\s*$/.test(l)).join('\n').matchAll(/\bJ-[A-Za-z0-9-]+\.[A-Za-z0-9]+\b/g)].map((m) => m[0]);
    return { item: `work/${d}`, steps, current: 'Objective' in s };
  });
}

export function trace(root) {
  const journeys = load(root).filter((x) => x.journey).map((x) => x.journey);
  const items = itemSteps(root);
  const rows = [], stepIds = new Set();
  for (const j of journeys) {
    const last = outcomes(runOf(root, j.id), j.languages ?? []);
    for (const st of j.steps ?? []) {
      stepIds.add(st.id);
      for (const req of st.proves ?? []) rows.push({ requirement: req, step: st.id, items: items.filter((i) => i.steps.includes(st.id)).map((i) => i.item), outcome: last.get(st.id) ?? 'not run' });
    }
  }
  rows.sort((a, b) => a.requirement.localeCompare(b.requirement) || a.step.localeCompare(b.step));
  const proved = new Set(rows.map((r) => r.requirement));
  const named = new Set(items.flatMap((i) => i.steps));
  const gaps = [
    ...settings(root).release.filter((r) => !proved.has(r)).map((r) => `requirement ${r} is in the release and no step proves it`),
    ...[...stepIds].filter((s) => !named.has(s)).map((s) => `step ${s} is named by no work item`),
    ...items.filter((i) => i.current && !i.steps.length).map((i) => `${i.item} names no journey step`),
    ...items.flatMap((i) => i.steps.filter((s) => !stepIds.has(s)).map((s) => `${i.item} names ${s}, which no journey has`)),
    ...[...new Map(rows.map((r) => [r.step, r.outcome]))].filter(([, o]) => o !== 'pass').map(([s, o]) => `step ${s}: ${o}`),
  ];
  return { rows, gaps };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** The walkthrough page for one journey, from its file and its last run. */
export function walkthroughHtml(j, run) {
  const langs = j.languages ?? [];
  const last = outcomes(run, langs);
  const cell = (st, lang) => {
    const r = (run?.steps ?? []).find((x) => x.id === st.id && x.language === lang);
    const shots = (r?.evidence ?? []).filter((e) => /\.(png|jpe?g|gif|webp)$/i.test(e)).map((e) => `<img src="${esc(e)}" alt="${esc(st.id)} ${esc(lang)}">`).join('');
    return `<td><span class="o ${esc((r?.outcome ?? 'not run').replace(' ', '-'))}">${esc(r?.outcome ?? 'not run')}</span>${shots}</td>`;
  };
  const rows = (j.steps ?? []).map((st) => `<tr class="${st.kind === 'denial' ? 'denial' : ''}"><th>${esc(st.id)}</th><td>${esc(st.does)}${st.kind === 'denial' ? ` <em>(denies: ${esc(st.denies)})</em>` : ''}<br><small>via ${esc(Object.entries(st.via ?? {}).map(([k, v]) => `${k} ${v}`).join(', '))}</small></td><td>${esc(st.expect)}</td><td>${esc((st.proves ?? []).join(', '))}</td><td>${esc(last.get(st.id) ?? 'not run')}</td>${langs.map((l) => cell(st, l)).join('')}</tr>`).join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(j.id)} walkthrough</title>
<style>:root{--bg:#fff;--fg:#1a1a1a;--line:#ddd;--pass:#1b7f3b;--fail:#b3261e;--none:#8a6d00}@media (prefers-color-scheme:dark){:root{--bg:#141414;--fg:#eee;--line:#333}}
body{background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;margin:0 auto;max-width:1200px;padding:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid var(--line);padding:6px;vertical-align:top;text-align:start}
img{max-width:220px;display:block;margin-top:4px}.o.pass{color:var(--pass)}.o.fail{color:var(--fail)}.o.not-run{color:var(--none)}tr.denial{background:rgba(179,38,30,.06)}.wrap{overflow-x:auto}</style></head><body>
<h1>${esc(j.id)} · ${esc(j.title)}</h1>
<p><strong>Actor:</strong> ${esc(j.actor)} · <strong>Fixture:</strong> ${esc(j.fixture)}</p>
<p><strong>Run:</strong> ${run ? `commit ${esc(run.commit ?? 'unknown')}, ${esc(run.ran ?? 'time unknown')}` : 'no run recorded: every step is not run'}</p>
<p><strong>What this shows:</strong> each step's behaviour and permissions on the project's test stack. It proves no answer quality; that is the evaluation suite's.</p>
<div class="wrap"><table><thead><tr><th>Step</th><th>Does</th><th>Expect</th><th>Proves</th><th>Outcome</th>${langs.map((l) => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>
${rows}
</tbody></table></div></body></html>
`;
}

export function walkthrough(root, id) {
  const found = load(root).find((x) => x.journey?.id === id);
  if (!found) throw new Error(`no journey ${id} under journeys/`);
  const out = path.join(root, 'work', 'journeys', id, 'walkthrough.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, walkthroughHtml(found.journey, runOf(root, id)));
  return path.relative(root, out);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const root = process.cwd();
  if (args[0] === '--walkthrough') {
    if (!args[1]) { console.error('usage: journeys.mjs --walkthrough J-NN'); process.exit(2); }
    console.log(`wrote ${walkthrough(root, args[1])}`);
  } else if (args[0] === '--trace') {
    const t = trace(root);
    if (args.includes('--json')) console.log(JSON.stringify(t, null, 2));
    else {
      for (const r of t.rows) console.log(`${r.requirement}\t${r.step}\t${r.items.join(', ') || '-'}\t${r.outcome}`);
      if (t.gaps.length) { console.log(`\n${t.gaps.length} gaps:`); t.gaps.forEach((g) => console.log(`  ${g}`)); }
    }
    process.exit(t.gaps.length ? 1 : 0);
  } else if (!args.length) {
    const problems = checkAll(root);
    if (!problems.length) { console.log(`journeys hold (${load(root).length})`); process.exit(0); }
    problems.forEach((p) => console.error(p));
    process.exit(1);
  } else { console.error('usage: journeys.mjs [--walkthrough J-NN | --trace [--json]]'); process.exit(2); }
}
