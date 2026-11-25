// The super's merge, as one script: the merge rules that were prose, in order. Run in the main checkout, on the main branch.
//   node factory/tools/merge.mjs <branch> [--package work/<lane>/<package>] [--check-from <merge-check.json>] [--dry-run] [--no-build]
// Refuses: a dirty tree (untracked files aside); a branch whose tip has no green, committed merge-check record (the branch
// worktree's own, found by `git worktree list`, or --check-from); a branch that does not merge cleanly (git merge-tree).
// Then: git merge --no-ff; "Merge: <hash>" first under ## Release in the package's item.md, the line a later rerun of every
// merged package's sealed tests reads to find the package (mergeHash), so a package without it is left out of the proof;
// the scaffold rerun for every module whose check the merge left stale, committed; one line appended to the records'
// merges.md, and NOW.md's "Last merge" row when it has one, committed; then the main branch built in a heavy slot.
// A candidate need not hold the newest main branch: its tip passed the check and it merges cleanly, and the build after the
// merge shows that two candidates which each built alone build together. A main that does not build is reverted at once.
// Commit subjects start with factory/harness.json "merge.prefix" ("records" unless set); "merge.trailer" is added to each.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkFile, criteriaOf, regenerate, reviewState, staleModules } from './merge-check.mjs';
import { filled, gitIn, loadConfig, slash } from './config.mjs';

const short = (h) => (/^[0-9a-f]{9,40}$/.test(h ?? '') ? h.slice(0, 8) : h ?? '');

/** The worktree that has `branch` checked out, from `git worktree list --porcelain`, or null. */
export function worktreeOf(repo, branch) {
  const list = gitIn(repo)('worktree', 'list', '--porcelain').stdout.replace(/\r\n/g, '\n');
  for (const block of list.split('\n\n')) {
    const dir = block.match(/^worktree (.+)$/m)?.[1];
    if (dir && block.match(/^branch refs\/heads\/(.+)$/m)?.[1] === branch) return path.resolve(dir);
  }
  return null;
}

/** Everything that must hold before the merge, read only: the problems (empty to go on), the tip and the record. */
export function mergeChecks(repo, { branch, main = 'main', checkFrom }) {
  const git = gitIn(repo);
  const problems = [];
  const on = git('rev-parse', '--abbrev-ref', 'HEAD').stdout.trim();
  if (on !== main) problems.push(`run it in the main checkout on ${main}, not on ${on}`);
  const dirty = git('status', '--porcelain', '--untracked-files=no').stdout.split('\n').map((l) => l.slice(3).trim()).filter(Boolean);
  if (dirty.length) problems.push(`the tree is dirty: ${dirty.join(', ')}; commit or stash first (untracked files are ignored)`);
  const tipRun = git('rev-parse', '--verify', '--quiet', `refs/heads/${branch}`);
  const tip = tipRun.status === 0 ? tipRun.stdout.trim() : null;
  if (!tip) return { problems: [...problems, `no branch ${branch}`], tip, record: null };
  const wt = worktreeOf(repo, branch);
  const file = checkFrom ? path.resolve(checkFrom) : wt ? checkFile(wt) : null;
  let record = null;
  if (!file || !fs.existsSync(file)) {
    problems.push(`no merge-check record: ${file ? slash(file) : `${branch} is checked out in no worktree`}; run node factory/tools/merge-check.mjs on ${short(tip)}, or name its record with --check-from`);
  } else {
    try { record = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { problems.push(`the record ${slash(file)} is not JSON`); }
    if (record) {
      if (record.commit !== tip) problems.push(`the merge check ran on ${short(record.commit)}, and ${branch}'s tip is ${short(tip)}: run it again on the tip`);
      if (record.dirty) problems.push('the merge check ran on uncommitted work: commit it and run the check again');
      if (record.result !== 'green') problems.push(`the merge check is red${record.reds?.length ? ` at ${record.reds.join(', ')}` : ''}`);
    }
  }
  const tree = git('merge-tree', '--write-tree', '--name-only', main, branch);
  if (tree.status !== 0) {
    const files = tree.stdout.replace(/\r\n/g, '\n').split('\n\n')[0].split('\n').slice(1).filter(Boolean);
    problems.push(`${branch} does not merge cleanly into ${main}: ${files.join(', ') || tree.stderr.trim()}; merge ${main} into it (merge-main.mjs), run the check, and ask again`);
  }
  return { problems, tip, record };
}

/** The package's item.md as the branch's tip holds it: its worktree's copy, else read from the branch itself; null when neither has it. */
export function packageAtTip(repo, branch, pkg) {
  const rel = slash(pkg);
  const wt = worktreeOf(repo, branch);
  if (wt && fs.existsSync(path.join(wt, rel, 'item.md'))) return fs.readFileSync(path.join(wt, rel, 'item.md'), 'utf8');
  const shown = gitIn(repo)('show', `${branch}:${rel}/item.md`);
  return shown.status === 0 ? shown.stdout : null;
}

/** The hash on the "Merge:" line under ## Release, or null: what a rerun of every merged package's sealed tests reads. */
export function mergeHash(text) {
  const lf = text.replace(/\r\n/g, '\n');
  const at = lf.search(/^## Release\s*$/m);
  if (at < 0) return null;
  const rest = lf.slice(at).split('\n').slice(1);
  const end = rest.findIndex((l) => /^## /.test(l));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n').match(/^Merge: ([0-9a-f]{7,40})\b/m)?.[1] ?? null;
}

/** item.md with "Merge: <hash>" first under ## Release, an older Merge line replaced; the section is added when absent. */
export function writeMergeLine(text, hash) {
  const crlf = text.includes('\r\n');
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const at = lines.findIndex((l) => /^## Release\s*$/.test(l));
  let out;
  if (at < 0) out = `${lines.join('\n').replace(/\n*$/, '')}\n\n## Release\n\nMerge: ${hash}\n`;
  else {
    const found = lines.findIndex((l, i) => i > at && /^## /.test(l));
    const end = found < 0 ? lines.length : found;
    const kept = lines.slice(at + 1, end).filter((l) => !/^Merge: /.test(l));
    while (kept.length && !kept[0].trim()) kept.shift();
    out = [...lines.slice(0, at + 1), '', `Merge: ${hash}`, ...(kept.length ? ['', ...kept] : ['']), ...lines.slice(end)].join('\n');
    if (!out.endsWith('\n')) out += '\n';
  }
  if (mergeHash(out) !== hash) throw new Error('merge.mjs: the Merge line did not land where mergeHash reads it');
  return crlf ? out.replace(/\n/g, '\r\n') : out;
}

/** NOW.md with the entry first in its "Last merge" row, or null when it has none. */
export function prependLastMerge(text, entry) {
  const re = /^(\| \*\*Last merge\*\* \| )(.*?)(\r?)$/m;
  return re.test(text) ? text.replace(re, (_, head, rest, cr) => `${head}${entry}; before it ${rest}${cr}`) : null;
}

const appendLine = (text, line) => `${text.replace(/(\r?\n)*$/, '')}${text ? '\n' : ''}${line}\n`;
const dateWords = (d) => d.toISOString().slice(0, 10);

/**
 * The merge, in order. Answers { ok, lines, hash }: on a refusal the problems, on a dry run the steps, on a merge the summary.
 * `stale` and `regen` are injectable for tests.
 */
export function merge(repo, { branch, pkg, checkFrom, dryRun = false, cfg = loadConfig(repo).config, now = new Date(), log = console.log,
  stale = () => staleModules(repo, cfg).stale, regen = (mods) => regenerate(repo, cfg, mods) } = {}) {
  const git = gitIn(repo);
  const main = cfg.mainBranch ?? 'main';
  const prefix = cfg.merge?.prefix ?? 'records';
  const trailer = filled(cfg.merge?.trailer) ? ['-m', cfg.merge.trailer] : [];
  const must = (...args) => {
    const r = git(...args);
    if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr.trim() || r.stdout.trim()}`);
    return r.stdout.trim();
  };
  const say = (lines, ok, hash) => { lines.forEach((l) => log(l)); return { ok, lines, hash }; };
  const untracked = () => new Set(git('ls-files', '--others', '--exclude-standard').stdout.split(/\r?\n/).filter(Boolean));
  /** Commits what changed since `before` (the untracked files that were already there stay out). */
  const commitChanges = (subject, before) => {
    const changed = git('status', '--porcelain', '--untracked-files=all').stdout.split(/\r?\n/).filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, ''))
      .filter((f) => !before.has(f));
    if (!changed.length) return null;
    must('add', '-A', '--', ...changed);
    if (git('diff', '--cached', '--quiet').status === 0) return null;
    must('commit', '-q', '-m', subject, ...trailer);
    return must('rev-parse', 'HEAD');
  };

  const itemText = pkg ? packageAtTip(repo, branch, pkg) : null;
  if (pkg && itemText === null) return say([`refused: ${pkg} holds no item.md on ${branch}, in its worktree or on the branch`], false);
  const { problems, tip, record } = mergeChecks(repo, { branch, main, checkFrom });
  if (problems.length) return say(problems.map((p) => `refused: ${p}`), false);
  const title = itemText ? itemText.split(/\r?\n/)[0].replace(/^#\s*/, '').trim() : null;
  const review = itemText ? record.review ?? reviewState(itemText) : null;
  const facts = itemText ? `${criteriaOf(itemText)} criteria; ${review ? `review ${review.clear ? 'clear' : 'not clear'} at reading ${review.reading}` : 'no review verdict'}` : null;
  const name = pkg ? slash(pkg) : branch;
  const subject = itemText ? `${title}: ${name} merged (${facts}; merge check green on ${short(tip)})`
    : `${git('log', '-1', '--format=%s', tip).stdout.trim()}, merged (merge check green on ${short(tip)})`;
  const records = cfg.records ?? 'factory/records';
  const entry = (hash) => `${dateWords(now)}: ${name} merged \`${short(hash)}\`${facts ? ` (${facts})` : ''}; merge check green on ${short(tip)}`;

  if (dryRun) {
    return say(['merge.mjs, dry run: nothing is done.',
      '  check  the tree is clean (untracked files aside)',
      `  check  the merge check is green on ${short(tip)}`,
      `  check  ${branch} merges cleanly into ${main}`,
      `  1. git merge --no-ff ${branch} -m "${subject}"`,
      pkg ? `  2. write "Merge: <the merge commit>" first under ## Release in ${name}/item.md` : '  2. no package: no Merge line',
      '  3. rerun the scaffold for every module whose check is now stale, and commit it',
      `  4. append to ${records}/merges.md, and prepend to NOW.md's Last merge row: ${entry('<the merge commit>')}`,
      '  5. commit the Merge line and the records, then build the main branch in a heavy slot'], true);
  }

  const merged = git('merge', '--no-ff', '-q', branch, '-m', subject, ...trailer);
  if (merged.status !== 0) { git('merge', '--abort'); return say([`refused: git merge failed and was aborted: ${merged.stderr.trim() || merged.stdout.trim()}`], false); }
  const hash = must('rev-parse', 'HEAD');
  const notes = [];
  // Every module whose skeleton the merge left out of date is regenerated on the main branch, before the records.
  let before = untracked();
  const staleMods = stale();
  const refused = staleMods.length ? regen(staleMods) : [];
  if (refused.length) notes.push(`the scaffold refused ${refused.join(', ')}`);
  const setUp = staleMods.length ? commitChanges(`${prefix}: ${staleMods.join(', ')} regenerated after ${name} merged (${short(tip)})`, before) : null;
  before = untracked();
  if (pkg) {
    const file = path.join(repo, pkg, 'item.md');
    fs.writeFileSync(file, writeMergeLine(fs.readFileSync(file, 'utf8'), short(hash)));
  }
  const log2 = path.join(repo, records, 'merges.md');
  fs.mkdirSync(path.dirname(log2), { recursive: true });
  fs.writeFileSync(log2, appendLine(fs.existsSync(log2) ? fs.readFileSync(log2, 'utf8') : '# Merges, one line each, written by merge.mjs\n', `- ${entry(hash)}`));
  const nowFile = path.join(repo, records, 'NOW.md');
  const nowText = fs.existsSync(nowFile) ? prependLastMerge(fs.readFileSync(nowFile, 'utf8'), entry(hash)) : null;
  if (nowText) fs.writeFileSync(nowFile, nowText); else notes.push('NOW.md has no Last merge row');
  const recorded = commitChanges(`${prefix}: ${name} merged as ${short(hash)}, ${pkg ? 'the Merge line and the records' : 'the records'}`, before);
  return say([`merged ${branch} ${short(tip)} as ${short(hash)}; ${pkg ? 'Merge line written' : 'no package'}; regenerated ${setUp ? `${short(setUp)} (${staleMods.join(', ')})` : 'none needed'}; records ${short(recorded) || 'none'}${notes.length ? `; ${notes.join('; ')}` : ''}`], true, hash);
}

/** Builds the main branch after a merge, in a heavy slot as the super; answers the exit code, 0 when there is no build command. */
export function buildMain(repo, cfg, { run = (args) => spawnSync(process.execPath, args, { cwd: repo, stdio: 'inherit' }).status ?? 1 } = {}) {
  if (!filled(cfg.commands?.build)) return 0;
  return run([path.join(path.dirname(fileURLToPath(import.meta.url)), 'slots.mjs'), 'heavy', '--lane', 'super', '--label', 'main-merge-build', '--', cfg.commands.build]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const valued = ['--package', '--check-from'];
  const value = (flag) => { const i = argv.indexOf(flag); return i === -1 ? undefined : argv[i + 1]; };
  const unknown = argv.filter((a) => a.startsWith('--') && ![...valued, '--dry-run', '--no-build'].includes(a));
  const branch = argv.find((a, i) => !a.startsWith('--') && !valued.includes(argv[i - 1]));
  if (!branch || unknown.length) {
    console.error('usage: node factory/tools/merge.mjs <branch> [--package work/<lane>/<package>] [--check-from <merge-check.json>] [--dry-run] [--no-build]');
    process.exit(2);
  }
  const { root, config: cfg } = loadConfig(process.cwd());
  try {
    const dryRun = argv.includes('--dry-run');
    const result = merge(root, { branch, pkg: value('--package'), checkFrom: value('--check-from'), dryRun, cfg });
    process.exitCode = result.ok ? 0 : 1;
    if (result.ok && !dryRun && !argv.includes('--no-build') && filled(cfg.commands?.build)) {
      console.log('building the main branch after the merge, in a heavy slot');
      const code = buildMain(root, cfg);
      console.log(code === 0 ? 'the main branch builds after the merge' : `THE MAIN BRANCH DOES NOT BUILD after the merge: revert it (git revert -m 1 ${short(result.hash)}) and tell the lane`);
      if (code !== 0) process.exitCode = 1;
    }
  } catch (e) {
    console.error(`merge.mjs: ${e.message}`);
    process.exitCode = 1;
  }
}
