// Install the software factory into a project. It never overwrites a file that is already there.
//   node init.mjs <project folder>            install the light profile
//   node init.mjs <project folder> --dry-run  print what it would write
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

/** Every file the light profile installs: [where it goes, where it comes from, or its text]. */
export function plan() {
  const out = [
    ['AGENTS.md', { from: 'core/AGENTS.template.md' }],
    ['CLAUDE.md', { from: 'core/CLAUDE.template.md' }],
    ['factory/brief.md', { from: 'core/brief.template.md' }],
    ['factory/item.md', { from: 'core/item.template.md' }],
    ['factory/token-economy.md', { from: 'core/token-economy.md' }],
    ['factory/council/SEATS.md', { from: 'council/SEATS.template.md' }],
    ['factory/council/decision.md', { from: 'council/decision.template.md' }],
    ['factory/decisions/README.md', { text: DECISIONS_README }],
    ['work/README.md', { text: WORK_README }],
    ['work/.gitignore', { text: '# long output a step sends to a file; never committed\n*/tmp/\n' }],
    ['.claude/skills/council/SKILL.md', { from: 'council/SKILL.md' }],
  ];
  for (const f of files('core/methods')) out.push([`factory/methods/${f}`, { from: `core/methods/${f}` }]);
  for (const f of files('council/seats')) out.push([`factory/council/seats/${f}`, { from: `council/seats/${f}` }]);
  for (const f of files('light/tools').filter((n) => !n.endsWith('.test.mjs'))) out.push([`factory/tools/${f}`, { from: `light/tools/${f}` }]);
  for (const d of fs.readdirSync(path.join(kit, 'light', 'skills'))) out.push([`.claude/skills/${d}/SKILL.md`, { from: `light/skills/${d}/SKILL.md` }]);
  return out;
}

/** Write the plan into the target; a file already there is kept and reported. */
export function install(target, { dryRun = false } = {}) {
  const written = [], kept = [];
  for (const [to, src] of plan()) {
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
  const target = args.find((a) => !a.startsWith('--'));
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isDirectory()) { console.error('usage: node init.mjs <project folder> [--dry-run]'); process.exit(2); }
  const dryRun = args.includes('--dry-run');
  const { written, kept } = install(path.resolve(target), { dryRun });
  console.log(`${dryRun ? 'would write' : 'wrote'} ${written.length} files${written.length ? `:\n  ${written.join('\n  ')}` : ''}`);
  if (kept.length) console.log(`kept ${kept.length} already there, untouched:\n  ${kept.join('\n  ')}`);
  if (kept.includes('AGENTS.md')) console.log('AGENTS.md was already there: merge in the rules from core/AGENTS.template.md by hand.');
  if (!dryRun && written.length) console.log('\nNext: fill in AGENTS.md sections 1 and 5 and rule 3, then factory/council/SEATS.md. Read factory/token-economy.md once.');
}
