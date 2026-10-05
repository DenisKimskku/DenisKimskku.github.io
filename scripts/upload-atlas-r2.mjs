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
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
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

// Incremental: only files whose content changed since the last successful
// upload (sha256 manifest in node_modules/.cache), uploaded 6 at a time, with
// meta.json LAST -- the client reads meta.json first and then fetches every
// other file at ?v=<meta.built_at>, so the new meta must not appear before the
// files it points at. --all re-uploads everything (e.g. after a bucket change).
const MANIFEST = path.join(process.cwd(), 'node_modules', '.cache', 'atlas-r2-manifest.json');
const FORCE = process.argv.includes('--all');
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(LOCAL, f))).digest('hex');
let manifest = {};
try { manifest = FORCE ? {} : JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch { manifest = {}; }
const hashes = Object.fromEntries(files.map((f) => [f, sha(f)]));
const changed = files.filter((f) => manifest[f] !== hashes[f]);
const meta = changed.filter((f) => f === 'meta.json');
const data = changed.filter((f) => f !== 'meta.json');
console.log(`  changed: ${changed.length} of ${files.length}${FORCE ? ' (--all)' : ''}`);

const put = (rel) => new Promise((resolve) => {
  const key = `atlas/${rel.split(path.sep).join('/')}`;
  execFile(
    WRANGLER,
    ['r2', 'object', 'put', `${BUCKET}/${key}`,
      // --remote is REQUIRED: without it wrangler writes to the local Miniflare
      // emulator and exits 0, so the upload "succeeds" while the bucket stays empty.
      '--remote',
      '--file', path.join(LOCAL, rel),
      '--content-type', 'application/json',
      // The worker sets the real Cache-Control per URL (meta 60 s, ?v= a year,
      // unversioned 5 min); this is only a fallback.
      '--cache-control', 'public, max-age=300'],
    (err, _out, stderr) => resolve({ rel, key, err: err ? String(stderr || err).slice(0, 120) : null }),
  );
});

let done = 0;
let failed = 0;
async function pool(list, n) {
  const queue = [...list];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
    while (queue.length) {
      const r = await put(queue.shift());
      if (r.err) {
        failed += 1;
        if (failed <= 5) console.error(`    FAILED ${r.key}: ${r.err}`);
      } else {
        done += 1;
        manifest[r.rel] = hashes[r.rel];
        if (done % 50 === 0) console.log(`    ${done}/${changed.length}`);
      }
    }
  }));
}
await pool(data, 6);
if (!failed) await pool(meta, 1);   // never publish a meta.json whose files failed to upload
fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
fs.writeFileSync(MANIFEST, JSON.stringify(manifest));

console.log(`\n  uploaded ${done}, failed ${failed}, of ${changed.length} changed (${files.length} total)`);
if (failed) {
  console.error('  Re-run to retry -- only the files that did not upload are sent again.');
  process.exit(1);
}
