// Install the software factory into a project. It never overwrites a file that is already there.
//   node init.mjs <project folder>            install the light profile
//   node init.mjs <project folder> --dry-run  print what it would write
//   node init.mjs <project folder> --profile harness [--marketplace <owner/repo>]
//       the light profile plus the harness: factory/harness.json, factory/harness/ (the super's rules, the lane brief and
//       handover, the step briefs), the slot, side-by-side, heartbeat and claim scripts, factory/records/, and .claude/settings.json
//       naming the factory-harness plugin (only if absent; otherwise it prints what to add)
// What it writes: AGENTS.md and CLAUDE.md (if absent), factory/ (methods, tools, forms, council seats, decisions),
// .claude/skills/ (the council and the five step skills), and work/ with a .gitignore for each item's tmp folder.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kit = path.dirname(fileURLToPath(import.meta.url));
const files = (dir) => fs.readdirSync(path.join(kit, dir), { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name);
const WORK_README = `# work — the work items

One folder per work item, \`NN-words\`, holding \`item.md\` (the form is \`factory/item.md\`), \`seal.json\` once its tests are sealed, and one short note per step.
What is next for an item: \`node factory/tools/gate.mjs work/NN-words\`.
`;
const DECISIONS_README = `# decisions — what was decided

One file per sitting or decision, \`<date>-<words>.md\`, in a form from \`factory/council/decision.md\`. What is not written here was not decided.
`;

const RECORDS_README = `# records — what the super and the lanes keep

The forms, and who writes each: \`factory/harness/records.md\`. The super creates \`NOW.md\` and \`QUEUE.md\` at its first start.
`;
export const PLUGIN = 'factory-harness@software-factory';

/** .claude/settings.json for the harness: the kit as a marketplace, and its plugin on. */
export function harnessSettings(marketplace) {
  const source = marketplace ? { source: 'github', repo: marketplace } : { source: 'directory', path: kit.split(path.sep).join('/') };
  return `${JSON.stringify({ extraKnownMarketplaces: { 'software-factory': { source } }, enabledPlugins: { [PLUGIN]: true } }, null, 2)}\n`;
}

/** What the harness profile adds to the light one. */
export function harnessPlan({ marketplace } = {}) {
  const out = [
    ['factory/harness.json', { from: 'harness/templates/harness.json' }],
    ['factory/records/README.md', { text: RECORDS_README }],
    ['factory/records/.gitignore', { text: "# the heartbeat's own log; never committed, so a beat does not read as work moving\nheartbeat.log\n" }],
    ['.claude/settings.json', { text: harnessSettings(marketplace) }],
  ];
  for (const f of files('harness/templates').filter((n) => n.endsWith('.md'))) out.push([`factory/harness/${f}`, { from: `harness/templates/${f}` }]);
  for (const f of files('harness/templates/briefs')) out.push([`factory/harness/briefs/${f}`, { from: `harness/templates/briefs/${f}` }]);
  for (const f of files('harness/plugin/scripts').filter((n) => !n.endsWith('.test.mjs'))) out.push([`factory/tools/${f}`, { from: `harness/plugin/scripts/${f}` }]);
  return out;
}

export const PROFILES = ['light', 'harness'];

/** Every file a profile installs: [where it goes, where it comes from, or its text]. */
export function plan({ profile = 'light', marketplace } = {}) {
  if (!PROFILES.includes(profile)) throw new Error(`unknown profile "${profile}": ${PROFILES.join(' or ')}`);
  const out = [
    ['AGENTS.md', { from: 'core/AGENTS.template.md' }],
    ['CLAUDE.md', { from: 'core/CLAUDE.template.md' }],
    ['factory/brief.md', { from: 'core/brief.template.md' }],
    ['factory/item.md', { from: 'core/item.template.md' }],
    ['factory/token-economy.md', { from: 'core/token-economy.md' }],
    ['factory/affected.json', { from: 'core/affected.template.json' }],
    ['factory/affected.example.json', { from: 'core/affected.example.json' }],
    ['factory/council/SEATS.md', { from: 'council/SEATS.template.md' }],
    ['factory/council/decision.md', { from: 'council/decision.template.md' }],
    ['factory/council/process-change.md', { from: 'council/process-change.template.md' }],
    ['factory/decisions/README.md', { text: DECISIONS_README }],
    ['work/README.md', { text: WORK_README }],
    ['work/.gitignore', { text: '# long output a step sends to a file; never committed\n*/tmp/\n' }],
    ['.claude/skills/council/SKILL.md', { from: 'council/SKILL.md' }],
  ];
  for (const f of files('core/methods')) out.push([`factory/methods/${f}`, { from: `core/methods/${f}` }]);
  for (const f of files('council/seats')) out.push([`factory/council/seats/${f}`, { from: `council/seats/${f}` }]);
  for (const f of files('light/tools').filter((n) => !n.endsWith('.test.mjs'))) out.push([`factory/tools/${f}`, { from: `light/tools/${f}` }]);
  for (const d of fs.readdirSync(path.join(kit, 'light', 'skills'))) out.push([`.claude/skills/${d}/SKILL.md`, { from: `light/skills/${d}/SKILL.md` }]);
  if (profile === 'harness') out.push(...harnessPlan({ marketplace }));
  return out;
}

/** Write the plan into the target; a file already there is kept and reported. */
export function install(target, { dryRun = false, profile, marketplace } = {}) {
  if (path.resolve(target) === kit) throw new Error('that is the kit itself: name your project folder');
  const written = [], kept = [];
  for (const [to, src] of plan({ profile, marketplace })) {
    const dest = path.join(target, to);
    if (fs.existsSync(dest)) { kept.push(to); continue; }
    written.push(to);
    if (dryRun) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, src.text ?? fs.readFileSync(path.join(kit, src.from)));
  }
  return { written, kept };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const valued = ['--profile', '--marketplace'];
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const profile = opt('--profile') ?? 'light', marketplace = opt('--marketplace');
  const target = args.find((a, i) => !a.startsWith('--') && !valued.includes(args[i - 1]));
  const unknown = args.filter((a, i) => a.startsWith('--') && a !== '--dry-run' && !valued.includes(a));
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isDirectory() || !PROFILES.includes(profile) || unknown.length || path.resolve(target) === kit) {
    console.error('usage: node init.mjs <project folder> [--dry-run] [--profile light|harness] [--marketplace <owner/repo>]  (not the kit itself)');
    process.exit(2);
  }
  const dryRun = args.includes('--dry-run');
  const { written, kept } = install(path.resolve(target), { dryRun, profile, marketplace });
  console.log(`${dryRun ? 'would write' : 'wrote'} ${written.length} files${written.length ? `:\n  ${written.join('\n  ')}` : ''}`);
  if (kept.length) console.log(`kept ${kept.length} already there, untouched:\n  ${kept.join('\n  ')}`);
  if (kept.includes('AGENTS.md')) console.log('AGENTS.md was already there: merge in the rules from core/AGENTS.template.md by hand.');
  if (!dryRun && written.length) console.log('\nNext: fill in AGENTS.md sections 1 and 5 and rule 3, then factory/council/SEATS.md. Read factory/token-economy.md once.');
  if (profile === 'harness') {
    if (kept.includes('.claude/settings.json')) console.log(`.claude/settings.json was already there: add these keys to it by hand:\n${harnessSettings(marketplace)}`);
    console.log('Harness: fill in every <...> in factory/harness.json. In Claude Code, trust the folder, run /plugin and install factory-harness from the software-factory marketplace, then start the super with /factory-harness:factory-super. Set the heartbeat by factory/harness/heartbeat.md.');
  }
}
