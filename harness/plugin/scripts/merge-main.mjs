// A lane merges the main branch into the branch checked out here, once, before the merge check. A conflict in a generated
// file takes the main branch's side, and the scaffold is rerun for every module the merge left stale; any other conflict is
// left for the lane, and the merge is not committed. On the first project one such merge hit 22 conflicts, all in generated files.
//   node factory/tools/merge-main.mjs            merge the main branch in, settle generated conflicts, commit
//   node factory/tools/merge-main.mjs --dry-run  say what would be settled, and leave the tree as it was
// A file is generated when it matches one of factory/harness.json "generated.paths" (regular expressions on its path), or when
// the main branch's copy carries sourcesCheck.generatedMarker in its first line. Generated files are rerun, never edited by hand.
// If the main branch moves while the merge check runs, do not merge it again: a clean merge is enough, and the super builds
// the main branch after each merge.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { regenerate, staleModules } from './merge-check.mjs';
import { filled, gitIn, loadConfig } from './config.mjs';

/** Whether a path is one the scaffold writes: by pattern, or by the marker in the first line of main's copy. */
export function isGenerated(file, cfg, firstLine = () => '') {
  const f = file.split(path.sep).join('/');
  if ((cfg.generated?.paths ?? []).filter(filled).some((p) => new RegExp(p).test(f))) return true;
  const marker = cfg.sourcesCheck?.generatedMarker;
  return filled(marker) && firstLine(f).toLowerCase().includes(marker.toLowerCase());
}

export function mergeMain(repo, { dryRun = false, cfg = loadConfig(repo).config, log = console.log,
  stale = () => staleModules(repo, cfg).stale, regen = (mods) => regenerate(repo, cfg, mods) } = {}) {
  const git = gitIn(repo);
  const main = cfg.mainBranch ?? 'main';
  const merged = git('merge', '--no-ff', '--no-commit', main);
  const conflicted = git('diff', '--name-only', '--diff-filter=U').stdout.split(/\r?\n/).filter(Boolean);
  const nothing = /Already up to date/i.test(merged.stdout);
  if (merged.status === 0 && !conflicted.length) {
    if (dryRun || nothing) { if (!nothing) git('merge', '--abort'); log(nothing ? `merge-main: ${main} is already merged in` : `merge-main: ${main} merges cleanly`); return { ok: true, settled: [], left: [] }; }
    git('commit', '-q', '--no-edit');
    log(`merge-main: ${main} merged, no conflicts`);
    return { ok: true, settled: [], left: [] };
  }
  if (merged.status !== 0 && !conflicted.length) {
    log(`merge-main: git merge ${main} failed: ${(merged.stderr || merged.stdout).trim()}`);
    return { ok: false, settled: [], left: [] };
  }
  const firstLine = (f) => (git('show', `${main}:${f}`).stdout ?? '').split(/\r?\n/)[0] ?? '';
  const settled = conflicted.filter((f) => isGenerated(f, cfg, firstLine));
  const left = conflicted.filter((f) => !settled.includes(f));
  if (dryRun) {
    git('merge', '--abort');
    log(`merge-main, dry run: ${settled.length} generated conflicts settle by ${main}'s side and the scaffold; ${left.length} need the lane${left.length ? `: ${left.join(', ')}` : ''}`);
    return { ok: left.length === 0, settled, left };
  }
  for (const f of settled) {
    // "theirs" is the main branch being merged in; a file main deleted is deleted here too.
    if (git('checkout', '--theirs', '--', f).status !== 0) git('rm', '-q', '--', f);
  }
  // Every module the merge left out of date is rerun, not a guess from the conflicted paths.
  const mods = stale();
  const refused = mods.length ? regen(mods) : [];
  // Only the settled files and what the scaffold wrote are staged: a hand-written conflict stays as the lane must see it.
  const written = git('status', '--porcelain', '--untracked-files=all').stdout.split(/\r?\n/).filter(Boolean)
    .map((l) => l.slice(3)).filter((f) => !left.includes(f) && (settled.includes(f) || isGenerated(f, cfg, (x) => readFirst(repo, x))));
  const paths = [...new Set([...settled, ...written])];
  if (paths.length) git('add', '-A', '--', ...paths);
  const why = `${settled.length} generated conflicts settled by ${main}'s side; the scaffold rerun for ${mods.join(', ') || 'no module'}${refused.length ? ` (refused: ${refused.join(', ')})` : ''}`;
  if (left.length) {
    log(`merge-main: ${why}; ${left.length} left for the lane: ${left.join(', ')}. Resolve them, then commit.`);
    return { ok: false, settled, left };
  }
  git('commit', '-q', '--no-edit');
  log(`merge-main: ${main} merged; ${why}`);
  return { ok: refused.length === 0, settled, left };
}

const readFirst = (repo, f) => { try { return fs.readFileSync(path.join(repo, f), 'utf8').split(/\r?\n/)[0]; } catch { return ''; } };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { root } = loadConfig(process.cwd());
  const r = mergeMain(root, { dryRun: process.argv.includes('--dry-run') });
  process.exitCode = r.ok ? 0 : 1;
}
