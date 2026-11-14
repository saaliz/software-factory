// Run by the super orchestrator once, when it starts or takes over: `node factory/tools/claim-super.mjs`.
// The harness's guard hook sees this command and records the calling session as the super, in git's common folder, so
// every worktree sees one claim and none commits it. This script only reports what the hook recorded.
// It guards against mistakes, not against a hostile session: any session that runs it becomes the super.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const r = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' });
if (r.status !== 0) { console.error('claim-super: not inside a git repository'); process.exit(2); }
const file = path.join(r.stdout.trim(), 'factory-super.json');
let claim = null;
try { claim = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* none */ }
if (!claim || Date.now() - Date.parse(claim.at) > 60_000) {
  console.error('claim-super: no claim recorded just now. Is the factory-harness plugin enabled with its mainBranch guard on? Without it, start the super with FACTORY_ROLE=super.');
  process.exit(1);
}
console.log(`the super is session ${claim.session}, claimed ${claim.at}`);
