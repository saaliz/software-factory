// Owner quotes: a page may quote the owner only with words the decision file it cites holds.
//   node factory/tools/quotes.mjs [folder or file ...]   "quotes hold", or one line per problem (exit 1)
// With no argument it reads every .md file under work/, factory/ and docs/ that exists.
// A quote is `"<words>" (factory/decisions/<file>.md)`. The owner's words are on that file's "Confirmed by:" lines;
// the rest of a decision file is the author's. It checks the words, never whether a page claims more than they cover.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QUOTE = /"([^"\n]{2,200})" \((factory\/decisions\/[^)\s]+\.md)\)/g;

/** Every .md file under the given paths. */
function pages(root, paths) {
  const out = [];
  const walk = (p) => {
    if (!fs.existsSync(p)) return;
    if (fs.statSync(p).isDirectory()) {
      for (const n of fs.readdirSync(p).sort()) if (n !== 'node_modules' && !n.startsWith('.')) walk(path.join(p, n));
    } else if (p.endsWith('.md')) out.push(p);
  };
  for (const p of paths) walk(path.resolve(root, p));
  return out;
}

/** The owner's words in a decision file: what follows "Confirmed by:" on each such line. */
export function ownerWords(text) {
  return text.split(/\r?\n/).filter((l) => /^\s*Confirmed by:/.test(l)).map((l) => l.replace(/^\s*Confirmed by:\s*/, ''));
}

/** The problems with every owner quote in the pages, as "file: problem". */
export function check(root, paths = ['work', 'factory', 'docs']) {
  const problems = [];
  for (const page of pages(root, paths)) {
    const rel = path.relative(root, page);
    for (const [, words, cited] of fs.readFileSync(page, 'utf8').matchAll(QUOTE)) {
      const file = path.join(root, cited);
      if (!fs.existsSync(file)) { problems.push(`${rel}: cites ${cited}, which does not exist`); continue; }
      const said = ownerWords(fs.readFileSync(file, 'utf8'));
      if (!said.length) problems.push(`${rel}: ${cited} has no "Confirmed by:" line, so it holds no owner words to quote`);
      else if (!said.some((s) => s.includes(words))) problems.push(`${rel}: "${words}" is not the owner's words in ${cited}`);
    }
  }
  return problems;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const problems = check(process.cwd(), args.length ? args : undefined);
  console.log(problems.length ? problems.join('\n') : 'quotes hold');
  process.exit(problems.length ? 1 : 0);
}
