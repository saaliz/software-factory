// The viewer. Reads /api/projects/<id> every 60 seconds and draws five screens. No libraries.
const REFRESH_MS = 60_000;
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = (h) => (h ? String(h).slice(0, 8) : '–');
const fmt = (n, d = 0) => (n === null || n === undefined || Number.isNaN(n) ? '–' : Number(n).toLocaleString('en', { maximumFractionDigits: d }));

function ago(t, now = Date.now()) {
  const ms = now - Date.parse(t);
  if (!t || Number.isNaN(ms)) return '–';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}
const when = (t) => (t ? new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–');

let state = { projects: [], id: null, data: null, error: null, tab: 'board' };

async function getJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

async function refresh() {
  try {
    if (!state.projects.length) {
      state.projects = await getJson('/api/projects');
      const want = new URLSearchParams(location.search).get('p');
      state.id = state.projects.find((p) => p.id === want)?.id ?? state.projects[0]?.id ?? null;
      $('#project').innerHTML = state.projects.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
      $('#project').value = state.id ?? '';
    }
    if (state.id) state.data = await getJson(`/api/projects/${encodeURIComponent(state.id)}`);
    state.error = null;
  } catch (e) {
    state.error = String(e.message);
  }
  render();
}

function render() {
  state.tab = (location.hash.slice(1) || 'board');
  document.querySelectorAll('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === state.tab));
  const d = state.data;
  if (!d) { $('#view').innerHTML = `<p class="empty">${esc(state.error ?? (state.projects.length ? 'Reading…' : 'No project in the config.'))}</p>`; return; }
  const { lanes, pulse, progress, walks } = d.data;
  const red = lanes?.mainRed ?? pulse?.mainRed;
  const wm = walks ?? lanes?.walksMain ?? pulse?.walksMain;
  // The newest walks on main decide the colour; lanes' and pulse's mainRed may be older.
  const on = wm?.commit ? ` on ${esc(short(wm.commit))}` : '';
  $('#health').innerHTML = red === undefined && !wm ? ''
    : wm?.passed === false || (!wm && red) ? `<span class="status bad">✗ walks red${on}</span>`
      : red ? '<span class="status bad">✗ main red</span>'
        : `<span class="status good">✓ walks green${on}</span>`;
  $('#stamp').textContent = `${state.error ? `Last read failed (${state.error}); showing ` : 'Read '}${when(d.read)} · data from ${when(progress?.at ?? lanes?.at ?? pulse?.at)} · refreshes every minute`;
  const alarms = pulse?.alarms?.length ?? 0;
  $('#alarm-count').textContent = alarms || '';
  const dc = $('#decision-count');
  dc.textContent = d.decisions.length || '';
  dc.classList.add('quiet');
  const screens = { board, pulse: pulseView, progress: progressView, trends, decisions };
  $('#view').innerHTML = (screens[state.tab] ?? board)(d);
  $('#files').innerHTML = filesView(d.files);
}

const missing = (d, kind) => {
  const f = d.files[kind];
  return `<p class="empty">No ${esc(kind)} file. Looked for ${esc((f.looked ?? []).join(', ') || f.file)}.</p>`;
};
const problems = (d, kind) => (d.files[kind]?.state === 'invalid' ? `<div class="alarm"><span class="ic">!</span><span>${esc(d.files[kind].file)} does not hold its schema: ${esc(d.files[kind].problems.slice(0, 3).join('; '))}</span></div>` : '');

// ---- Board ----
function board(d) {
  const L = d.data.lanes;
  if (!L) return missing(d, 'lanes');
  const steps = L.steps ?? [];
  const cols = steps.length || 1;
  const lanes = L.lanes.map((lane) => {
    const byStep = Object.fromEntries(steps.map((s) => [s.key, []]));
    for (const c of lane.cards) (byStep[c.step] ??= []).push(c);
    const head = steps.map((s) => `<div class="col-head">${esc(s.label)} <span class="muted num">${byStep[s.key].length || ''}</span></div>`).join('');
    const cells = steps.map((s) => (byStep[s.key].length
      ? `<div class="cell"><div class="cell-label">${esc(s.label)}</div>${byStep[s.key].map(card).join('')}</div>`
      : '<div class="cell"></div>')).join('');
    return `<section class="lane"><h3>Lane ${esc(lane.lane)} <span class="muted">· ${lane.cards.length} cuts</span></h3>
      <div class="lane-grid" style="--cols:${cols}">${head}${cells}</div></section>`;
  }).join('');
  const side = (L.side ?? []).length
    ? `<details class="panel"><summary>${L.side.length} branches on no card</summary><ul class="side">${L.side.map((s) => `<li><code>${esc(s.branch)}</code> <span class="muted">${esc(short(s.tip))} · ${ago(s.at)}</span></li>`).join('')}</ul></details>` : '';
  return problems(d, 'lanes') + lanes + side;
}

function card(c) {
  const waits = (c.waitsOn ?? []).length ? `<div class="waits"><b>Waits on</b> ${c.waitsOn.map(esc).join('; ')}</div>` : '';
  const last = c.lastCommit ? `last commit ${ago(c.lastCommit.at)}` : 'no commit';
  const hours = c.step !== 'merged' && c.workingHoursInStep ? ` · ${fmt(c.workingHoursInStep, 1)} working h in step` : '';
  const title = (c.title ?? '').replace(/^Slice \d+\s*[—-]\s*/, '');
  return `<article class="card${c.red ? ' red' : ''}${c.step === 'merged' ? ' merged' : ''}">
    <div class="cut">${c.red ? '<span class="ic" style="color:var(--critical)">✗ </span>' : ''}${esc(c.cut)}</div>
    ${title ? `<div class="t">${esc(title)}</div>` : ''}
    <div>${(c.modules ?? []).map((m) => `<span class="chip">${esc(m)}</span>`).join('')}</div>
    <div class="meta">${c.readings ? `${c.readings} readings · ` : ''}${last}${hours}</div>${waits}</article>`;
}

// ---- Pulse ----
function pulseView(d) {
  const P = d.data.pulse;
  if (!P) return missing(d, 'pulse');
  const alarms = P.alarms.length
    ? P.alarms.map((a) => `<div class="alarm"><span class="ic">⚠</span><span>${esc(a)}</span></div>`).join('')
    : '<p class="ok-line">✓ No alarm.</p>';
  const cuts = P.cuts.length ? `<div class="scroll"><table class="stack"><thead><tr><th>Cut</th><th>Lane</th><th>Step</th><th>Waits on</th><th class="r">Working h</th><th class="hide-narrow">Tip</th><th class="r hide-narrow">Sealed</th></tr></thead><tbody>
    ${P.cuts.map((c) => `<tr><td><b>${esc(c.name)}</b>${c.stuck ? ' <span class="status bad">stuck</span>' : ''}</td><td data-l="Lane">${esc(c.lane)}</td><td data-l="Step">${esc(c.stepLabel ?? c.step)}</td>
      <td data-l="Waits on">${(c.waitsOn ?? []).map(esc).join('<br>') || '–'}</td><td class="r num" data-l="Working h">${fmt(c.workingHoursInStep, 1)}</td>
      <td class="hide-narrow"><code>${esc(short(c.tip))}</code> <span class="muted">${ago(c.tipAt)}</span></td>
      <td class="r num hide-narrow">${c.sealed ? `${c.sealed.passed}/${c.sealed.total}` : '–'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No cut in progress.</p>';
  const envs = Object.entries(P.envs ?? {});
  const envList = envs.length ? `<ul>${envs.map(([k, h]) => `<li>Environment <b>${esc(k)}</b>: ${h ? `held by process ${esc(h.pid)} since ${when(h.since)} (${ago(h.since)})` : 'free'}</li>`).join('')}</ul>` : '<p class="muted">No environment on record.</p>';
  const running = (P.running ?? []).length ? `<ul>${P.running.map((r) => `<li><span class="chip">${esc(r.kind)}</span>${esc(r.what)} <span class="muted">· ${ago(r.started)}</span></li>`).join('')}</ul>` : '<p class="muted">Nothing running.</p>';
  return `${problems(d, 'pulse')}<div class="panel"><h3>Alarms</h3>${alarms}</div>
    <div class="panel"><h3>Cuts in progress</h3>${cuts}</div>
    <div class="panel"><h3>Walks on main</h3>${walksView(d)}</div>
    <div class="panel"><h3>Environments</h3>${envList}<h3>Running</h3>${running}</div>`;
}

function walksView(d) {
  const W = d.data.walks;
  if (!W) {
    const wm = d.data.pulse?.walksMain ?? d.data.lanes?.walksMain;
    return wm ? `<p>${wm.passed ? '<span class="status good">✓ green</span>' : '<span class="status bad">✗ red</span>'} on <code>${esc(short(wm.commit))}</code> · ${ago(wm.at)}</p>` : '<p class="muted">No walks on record.</p>';
  }
  const steps = (w) => Object.entries(w.steps ?? {}).map(([lang, s]) => `${esc(lang)} ${s.passed}✓${s.failed ? ` ${s.failed}✗` : ''}`).join(' · ');
  return `<p>${W.passed ? '<span class="status good">✓ green</span>' : '<span class="status bad">✗ red</span>'} on <code>${esc(short(W.commit))}</code> · ${ago(W.at)}${W.env ? ` · env ${esc(W.env)}` : ''}</p>
    <table><tbody>${W.walks.map((w) => `<tr><td>${w.passed ? '<span style="color:var(--good)">✓</span>' : '<span style="color:var(--critical)">✗</span>'} ${esc(w.name)}</td><td class="muted">${steps(w)}</td><td class="r num muted hide-narrow">${w.ms ? `${fmt(w.ms / 1000, 0)} s` : ''}</td></tr>`).join('')}</tbody></table>`;
}

// ---- Progress ----
const PARTS = [
  ['passed', 'Passed', '--s-passed'],
  ['held', 'Held', '--s-held'],
  ['deferred', 'Deferred', '--s-deferred'],
  ['failed', 'Failed', '--s-failed'],
  ['built', 'Built, no result', '--s-built'],
  ['notBuilt', 'Not built', '--s-notbuilt'],
];

function progressView(d) {
  const P = d.data.progress;
  if (!P) return missing(d, 'progress');
  const T = P.musts.total;
  const tiles = `<div class="tiles">
    <div class="panel tile"><div class="big num">${fmt(T.percent, 1)}%</div><div class="sub">musts passed: ${fmt(T.passed)} of ${fmt(T.musts)}${T.stale ? ' · <b>stale</b>' : ''}</div></div>
    ${P.cuts ? `<div class="panel tile"><div class="big num">${fmt(P.cuts.merged)} <span class="muted" style="font-size:16px">of ${fmt(P.cuts.planned)}</span></div><div class="sub">cuts merged</div></div>` : ''}
    ${P.features ? `<div class="panel tile"><div class="big num">${fmt(P.features.usable)} <span class="muted" style="font-size:16px">of ${fmt(P.features.of)}</span></div><div class="sub">features usable</div></div>` : ''}
    <div class="panel tile"><div class="big num">${fmt(T.failed)}</div><div class="sub">musts failing · ${fmt(T.deferred)} deferred</div></div></div>`;
  const legend = `<div class="legend">${PARTS.map(([, label, v]) => `<span><i style="background:var(${v})"></i>${label}</span>`).join('')}</div>`;
  const has = (k) => P.musts.modules.some((m) => m[k] !== undefined) || T[k] !== undefined;
  const parts = PARTS.filter(([k]) => has(k));
  const row = (m, strong) => `<tr><td class="${strong ? 'mod-name' : ''}">${esc(m.name)}${m.stale ? ' <span class="chip">stale</span>' : ''}</td>
    <td style="width:30%">${bar(m)}</td><td class="r num">${fmt(m.percent, 1)}%</td><td class="r num">${fmt(m.musts)}</td>
    ${parts.map(([k]) => `<td class="r num hide-narrow">${fmt(m[k] ?? 0)}</td>`).join('')}</tr>`;
  const table = `<div class="scroll"><table><thead><tr><th>Module</th><th></th><th class="r">Passed</th><th class="r">Musts</th>${parts.map(([, l]) => `<th class="r hide-narrow">${l}</th>`).join('')}</tr></thead>
    <tbody>${P.musts.modules.map((m) => row(m)).join('')}${row(T, true)}</tbody></table></div>`;
  return `${problems(d, 'progress')}${tiles}
    ${P.summary ? `<p class="muted">${esc(P.summary)}</p>` : ''}
    <div class="panel"><h3>Musts passed on main, against ${fmt(T.musts)}</h3>${burnup(P.burnup ?? [], T)}</div>
    <div class="panel"><h3>By module</h3>${legend}${table}</div>`;
}

function bar(m) {
  const total = m.musts || 1;
  return `<div class="bar" role="img" aria-label="${esc(PARTS.map(([k, l]) => `${l} ${m[k] ?? 0}`).join(', '))}">${PARTS.filter(([k]) => m[k]).map(([k, l, v]) => `<span title="${l}: ${m[k]}" style="width:${(m[k] / total) * 100}%;background:var(${v})"></span>`).join('')}</div>`;
}

function burnup(points, T) {
  if (!points.length) return '<p class="muted">No burn-up history.</p>';
  const W = 640, H = 220, L = 48, R = 16, Tp = 14, B = 28;
  const xs = points.map((p) => Date.parse(p.date));
  const x0 = Math.min(...xs), x1 = Math.max(Date.now(), ...xs);
  const top = Math.max(T.musts, ...points.map((p) => p.passed));
  const X = (t) => L + ((t - x0) / Math.max(1, x1 - x0)) * (W - L - R);
  const Y = (v) => Tp + (1 - v / top) * (H - Tp - B);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
  const grid = ticks.map((v) => `<line class="gridline" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${fmt(v)}</text>`).join('');
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(p.passed).toFixed(1)}`).join('');
  const area = `${path}L${X(xs.at(-1)).toFixed(1)},${Y(0)}L${X(xs[0]).toFixed(1)},${Y(0)}Z`;
  const dots = points.map((p, i) => `<circle class="dot" cx="${X(xs[i])}" cy="${Y(p.passed)}" r="5"><title>${when(p.date)}: ${fmt(p.passed)} passed${p.commit ? ` (${short(p.commit)})` : ''}</title></circle>`).join('');
  const last = points.at(-1);
  const dates = [x0, x1].map((t, i) => `<text x="${X(t)}" y="${H - 8}" text-anchor="${i ? 'end' : 'start'}">${new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Burn-up: ${fmt(last.passed)} of ${fmt(T.musts)} musts passed">
    ${grid}<line class="scope" x1="${L}" x2="${W - R}" y1="${Y(T.musts)}" y2="${Y(T.musts)}"/><text x="${W - R}" y="${Y(T.musts) - 5}" text-anchor="end">scope ${fmt(T.musts)}</text>
    <path class="area" d="${area}"/><path class="line" d="${path}"/>${dots}
    <text x="${X(xs.at(-1)) - 8}" y="${Y(last.passed) - 10}" text-anchor="end" style="fill:var(--ink);font-weight:600">${fmt(last.passed)}</text>${dates}</svg>
    <details><summary>Table</summary><table><thead><tr><th>Date</th><th>Commit</th><th class="r">Passed</th></tr></thead><tbody>${points.map((p) => `<tr><td>${when(p.date)}</td><td><code>${esc(short(p.commit))}</code></td><td class="r num">${fmt(p.passed)}</td></tr>`).join('')}</tbody></table></details>`;
}

// ---- Trends ----
const MEASURES = [
  ['Tokens per must passed', (o) => o.cost?.tokensPerMustPassed, 0, 'needs a sessions.md per cut'],
  ['Days from seal to merge', (o) => o.time?.sealToMergeDays, 1, ''],
  ['Reading rounds', (o) => o.time?.readings, 0, ''],
  ['Reseals', (o) => o.quality?.reseals, 0, ''],
  ['Rulings withdrawn', (o) => o.quality?.withdrawnRulings, 0, ''],
  ['Reds escaped to main', (o) => o.quality?.redsOnMainAfterMerge, 0, 'reds on main after the merge'],
];

function trends(d) {
  const O = d.data.progress?.optimization;
  if (!O) return d.data.progress ? '<p class="empty">This project writes no optimization[] in progress.json.</p>' : missing(d, 'progress');
  const label = (c) => (c.match(/^\d+/)?.[0] ?? c.slice(0, 4));
  const rows = MEASURES.map(([name, get, dp, note]) => {
    const vals = O.map(get);
    const known = vals.filter((v) => typeof v === 'number').length;
    return `<div class="trend"><div><div class="name">${name}</div><div class="note">${known} of ${O.length} cuts measured${note && known < O.length ? ` · ${note}` : ''}</div></div>${minibars(O.map((o) => label(o.cut)), vals, dp, O)}</div>`;
  }).join('');
  const table = `<details><summary>Table</summary><div class="scroll"><table><thead><tr><th>Cut</th><th>Step</th>${MEASURES.map(([n]) => `<th class="r">${n}</th>`).join('')}</tr></thead><tbody>
    ${O.map((o) => `<tr><td>${esc(o.cut)}</td><td>${esc(o.step)}</td>${MEASURES.map(([, g, dp]) => `<td class="r num">${fmt(g(o), dp)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
  return `${problems(d, 'progress')}<div class="panel"><h3>Per cut, in build order · lower is better on every row</h3>${rows}${table}</div>`;
}

function minibars(labels, vals, dp, O) {
  const W = Math.max(200, labels.length * 44), H = 74, B = 16, Tp = 14;
  const max = Math.max(1, ...vals.filter((v) => typeof v === 'number'));
  const bw = W / labels.length;
  const bars = labels.map((l, i) => {
    const v = vals[i];
    const x = i * bw + bw * 0.2, w = bw * 0.6;
    const tip = `<title>${esc(O[i].cut)}: ${typeof v === 'number' ? fmt(v, dp) : 'not measured'}</title>`;
    const mark = typeof v === 'number'
      ? (() => { const h = Math.max(2, (v / max) * (H - B - Tp)); return `<rect class="tbar" x="${x}" y="${H - B - h}" width="${w}" height="${h}" rx="3">${tip}</rect><text x="${x + w / 2}" y="${H - B - h - 3}" text-anchor="middle">${fmt(v, dp)}</text>`; })()
      : `<rect class="none" x="${x}" y="${H - B - 1}" width="${w}" height="1"/><text x="${x + w / 2}" y="${H - B - 4}" text-anchor="middle">–${tip}</text>`;
    return `${mark}<text x="${x + w / 2}" y="${H - 3}" text-anchor="middle">${esc(l)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px" preserveAspectRatio="xMinYMid meet" role="img"><line class="axis" x1="0" x2="${W}" y1="${H - B}" y2="${H - B}"/>${bars}</svg>`;
}

// ---- Decisions ----
function decisions(d) {
  const list = d.decisions;
  const note = d.files.decisions.state === 'missing'
    ? '<p class="muted">This project writes no decisions.json, so this lists the "waits on" lines of the board and the pulse that name the owner.</p>' : '';
  if (!list.length) return `${problems(d, 'decisions')}${note}<p class="empty">✓ Nothing waits on the owner.</p>`;
  return problems(d, 'decisions') + note + list.map((x) => `<div class="panel decision"><div class="q">${esc(x.question)}</div>
    <div class="meta muted">${x.cut ? `${esc(x.cut)} · ` : ''}waiting since ${when(x.since)} (${ago(x.since)}) · from ${esc(x.source)}${x.file ? ` · <code>${esc(x.file)}</code>` : ''}</div>
    ${(x.blocks ?? []).length ? `<div>Blocks: ${x.blocks.map(esc).join(', ')}</div>` : ''}
    ${(x.options ?? []).length ? `<ul>${x.options.map((o) => `<li>${esc(o)}${o === x.recommended ? ' <span class="chip">recommended</span>' : ''}</li>`).join('')}</ul>` : ''}</div>`).join('');
}

function filesView(files) {
  return `Files: ${Object.entries(files).map(([k, f]) => `<span class="${f.state === 'ok' ? '' : f.state === 'missing' ? 'muted' : 'bad'}">${esc(k)} ${f.state === 'ok' ? `✓ ${esc(f.file)} (${ago(f.mtime)})` : esc(f.state)}</span>`).join(' · ')}. Read only; no model is called.`;
}

$('#project').addEventListener('change', (e) => {
  state.id = e.target.value;
  history.replaceState(null, '', `?p=${encodeURIComponent(state.id)}${location.hash}`);
  refresh();
});
window.addEventListener('hashchange', render);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
setInterval(() => { if (!document.hidden) refresh(); }, REFRESH_MS);
refresh();
