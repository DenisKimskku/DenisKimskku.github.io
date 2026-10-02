#!/usr/bin/env node
/**
 * Upload the atlas bundle to Cloudflare R2.
 *
 * WHY R2 RATHER THAN GIT
 * ----------------------
 * The bundle is 516 files / 57 MB, and UMAP refits whenever the corpus changes,
 * so nodes.json + edges.json (~19 MB) are rewritten in full on EVERY export.
 * Committing it means that 19 MB lands in git history again each time, forever,
 * on top of a .git that is already ~473 MB. R2 has no egress fee and the free
 * tier is 10 GB, so the recurring cost goes to zero.
 *
 * WHY THE FRONTEND NEEDS NO CHANGES
 * ---------------------------------
 * GraphClient/PaperPanel fetch same-origin relative paths (/atlas/nodes.json,
 * /atlas/reviews/<xx>.json). Serving deniskim1.com/atlas/* from R2 through the
 * existing worker keeps those paths valid: no CORS, no URL constants to edit,
 * and a local `public/atlas/` still works in `next dev` because Next serves
 * public/ directly. Do NOT switch to an r2.dev URL -- that is a different
 * origin and would need CORS plus a code change.
 *
 * Content-Type matters: R2 does not infer it, and a .json served as
 * application/octet-stream makes res.json() throw in the browser.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BUCKET = process.env.ATLAS_BUCKET || 'deniskim1-atlas';
// The LOCAL binary, not `npx`: npx re-resolves the package on every call, which
// over 516 files is ~20 minutes of pure process startup.
const WRANGLER = path.join(process.cwd(), 'node_modules', '.bin', 'wrangler');
const LOCAL = path.join(process.cwd(), 'public', 'atlas');
const DRY = !process.argv.includes('--apply');

if (!fs.existsSync(LOCAL)) {
  console.error(`No bundle at ${LOCAL}. Run the exporter first:`);
  console.error('  /Users/den/.venv/securityfeed/bin/python3 /Users/den/Documents/build_atlas_data.py');
  process.exit(1);
}

/** Every file under public/atlas, as paths relative to it. */
function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full, base) : [path.relative(base, full)];
  });
}

const files = walk(LOCAL).sort();
const bytes = files.reduce((n, f) => n + fs.statSync(path.join(LOCAL, f)).size, 0);

console.log(`  bucket : ${BUCKET}`);
console.log(`  source : ${LOCAL}`);
console.log(`  files  : ${files.length}  (${(bytes / 1048576).toFixed(1)} MB)`);

if (DRY) {
  console.log('\n  sample keys:');
  for (const f of [files[0], files[Math.floor(files.length / 2)], files.at(-1)]) {
    console.log(`    atlas/${f}`);
  }
  console.log('\n  DRY RUN — nothing uploaded. Re-run with --apply');
  process.exit(0);
}

let done = 0;
let failed = 0;
for (const rel of files) {
  // Keys are prefixed `atlas/` so the worker can map /atlas/<rest> 1:1 and the
  // bucket stays usable for other assets later.
  const key = `atlas/${rel.split(path.sep).join('/')}`;
  try {
    execFileSync(
      WRANGLER,
      ['r2', 'object', 'put', `${BUCKET}/${key}`,
       // --remote IS REQUIRED. wrangler 4.x defaults `r2 object put/get` to the
       // LOCAL simulator (.wrangler/state/v3/r2), so without it all 516 objects
       // land on disk, the deployed Worker sees an empty bucket, and -- worst of
       // all -- a put/get roundtrip "verifies" successfully because both halves
       // hit the same local store. That cost a full upload and a live 404 hunt.
       '--remote',
       '--file', path.join(LOCAL, rel),
       '--content-type', 'application/json',
       // Payloads are immutable per build and the client always fetches by a
       // content-derived path, so a long TTL is safe and keeps egress near zero.
       '--cache-control', 'public, max-age=86400'],
      { stdio: 'pipe' }
    );
    done += 1;
    if (done % 50 === 0) console.log(`    ${done}/${files.length}`);
  } catch (err) {
    failed += 1;
    if (failed <= 5) console.error(`    FAILED ${key}: ${String(err.stderr || err).slice(0, 120)}`);
  }
}

console.log(`\n  uploaded ${done}, failed ${failed}, of ${files.length}`);
if (failed) {
  console.error('  Re-run to retry — `object put` overwrites, so this is idempotent.');
  process.exit(1);
}
console.log('  Next: add the r2_buckets binding + /atlas/* route to cloudflare-worker/wrangler.jsonc,');
console.log('  deploy the worker, then add public/atlas/ to .gitignore.');
