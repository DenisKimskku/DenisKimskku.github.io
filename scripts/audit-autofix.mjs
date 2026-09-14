// Repairs `npm audit` findings the same way the content pipeline repairs
// generator defects: apply only the fixes that are provably safe, verify, and
// hand anything else to a human instead of guessing.
//
// WHY THIS EXISTS. Dependabot is the repo's only dependency-security signal,
// and it has a blind spot this script covers. Measured 2026-09-14 against the
// two advisories open that day:
//
//   * js-yaml (high, GHSA-2883-xcg3-v3hh) reached main as a security PR — but
//     as `dependency-type: indirect`, which dependabot-auto-merge.yml routes
//     to a human by design (it only auto-merges direct:development patch/minor
//     and direct:production patch). So it sat open.
//   * fflate (moderate) got NO PR AT ALL. `satori@0.33.4` depends on the exact
//     version `fflate@0.7.3`, so there is no in-range bump to propose, and the
//     only fix npm can compute is a satori 0.32.0 MAJOR DOWNGRADE. `npm update`
//     cannot move it and `npm dedupe` makes it worse (it collapses the tree
//     onto the exact pin). The fix is an `overrides` entry — and package.json
//     already says Dependabot "won't touch overrides directly".
//
// Nothing in .github/workflows ran `npm audit` at all, so the fflate class was
// invisible to the whole pipeline. This script plus dependency-autorepair.yml
// is that missing signal, and repairs what it safely can.
//
// THE TIERS (tier 1 verified empirically before this was written):
//
//   1. `npm audit fix --package-lock-only`, never `--force`. Confirmed to fix
//      only in-range bumps, to leave package.json untouched, and to DECLINE
//      the satori major downgrade. Lockfile-only, so it needs no node_modules.
//   2. A patch-level `overrides` pin for whatever tier 1 could not reach —
//      capped at the same major.minor as the installed version, so 0.7.3 may
//      become 0.7.5 but never 0.8.0. This is the exact-pin case above.
//   3. Everything else — a fix needing a major bump, or none published yet —
//      is reported and left alone. The caller alerts a human.
//
// Tier 2 does not parse npm's vulnerable-range syntax (">=0.33.0",
// "0.7.0 - 0.7.4", unions). It picks the highest patch-level candidate and
// re-runs `npm audit` to find out whether the advisory actually cleared. The
// audit is the oracle, so there is no second range implementation to drift.
//
//   node scripts/audit-autofix.mjs             apply fixes in place
//   node scripts/audit-autofix.mjs --dry-run   report the plan; never writes; exit 0
//   node scripts/audit-autofix.mjs --check     no writes; exit 1 if anything is left
//   node scripts/audit-autofix.mjs --dir <d>   operate on <d> (tests; cloudflare-worker)
//
// Exit 0 = the tree is clean, or --dry-run. Exit 1 = advisories remain that
// this script cannot safely fix. Exit 2 = the audit itself could not run.

import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  countVulnerabilities,
  lowestInstalled,
  parseVersion,
  patchRange,
  pickPatchLevel,
  rootAdvisories,
} from './lib/audit-fix.mjs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const CHECK = args.includes('--check');
const dirFlag = args.indexOf('--dir');
const DIR = dirFlag !== -1 && args[dirFlag + 1] ? path.resolve(args[dirFlag + 1]) : process.cwd();
// --check and --dry-run must not leave the working tree different from how
// they found it, so every write path is routed through this one flag.
const WRITES = !DRY_RUN && !CHECK;

const WIN = process.platform === 'win32';

function run(cmdArgs, { allowFailure = false } = {}) {
  const opts = {
    cwd: DIR,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  };
  try {
    // On Windows `npm` is a .cmd, which execFile can only launch through a
    // shell — and passing an args array alongside `shell: true` trips Node's
    // DEP0190 warning. Every argument here is a literal from this file, so
    // joining them is safe; execSync avoids the warning entirely. Linux (CI)
    // takes the execFileSync path with no shell at all.
    if (WIN) return execSync(['npm', ...cmdArgs].join(' '), opts);
    return execFileSync('npm', cmdArgs, opts);
  } catch (err) {
    // `npm audit` exits non-zero merely BECAUSE it found vulnerabilities, so a
    // failed exit code says nothing on its own — stdout is what matters.
    if (allowFailure) return err.stdout ?? '';
    throw err;
  }
}

function audit() {
  const out = run(['audit', '--json', '--package-lock-only'], { allowFailure: true });
  if (!out.trim()) return null;
  try {
    return JSON.parse(out);
  } catch {
    // npm occasionally prefixes JSON with a notice line; salvage the object.
    const start = out.indexOf('{');
    if (start === -1) return null;
    try {
      return JSON.parse(out.slice(start));
    } catch {
      return null;
    }
  }
}

// Thin IO wrappers around the pure helpers in lib/audit-fix.mjs.
function installedVersion(pkg) {
  const lockPath = path.join(DIR, 'package-lock.json');
  if (!fs.existsSync(lockPath)) return null;
  return lowestInstalled(JSON.parse(fs.readFileSync(lockPath, 'utf8')).packages, pkg);
}

function patchLevelCandidate(pkg, installed) {
  if (!parseVersion(installed)) return null;
  let versions;
  try {
    versions = JSON.parse(run(['view', pkg, 'versions', '--json']));
  } catch {
    return null; // unpublished, private, or the registry is unreachable
  }
  // `npm view` collapses a single-version result to a bare string.
  if (!Array.isArray(versions)) versions = [versions];
  return pickPatchLevel(versions, installed);
}

function readPackageJson() {
  const p = path.join(DIR, 'package.json');
  const raw = fs.readFileSync(p, 'utf8');
  return { path: p, raw, json: JSON.parse(raw) };
}

// Rewrites package.json preserving its existing line endings — this repo is a
// Windows checkout with core.autocrlf=true, and a whole-file line-ending flip
// would bury the one-line override change in a full-file diff.
function writePackageJson(pkg, json) {
  const crlf = pkg.raw.includes('\r\n');
  let out = JSON.stringify(json, null, 2) + (pkg.raw.endsWith('\n') || pkg.raw.endsWith('\r\n') ? '\n' : '');
  if (crlf) out = out.replace(/\r?\n/g, '\r\n');
  fs.writeFileSync(pkg.path, out);
}

function main() {
  if (!fs.existsSync(path.join(DIR, 'package-lock.json'))) {
    console.error(`✗ No package-lock.json in ${DIR}`);
    process.exit(2);
  }

  const before = audit();
  if (!before) {
    console.error('✗ Could not run `npm audit` (no parseable JSON returned)');
    process.exit(2);
  }

  const initial = countVulnerabilities(before);
  if (initial === 0) {
    console.log('✓ No known vulnerabilities.');
    return;
  }

  const roots = rootAdvisories(before);
  // npm counts a package that merely DEPENDS on a vulnerable one as its own
  // finding (satori is listed because fflate is), so the headline number is
  // usually larger than the list of things there is anything to fix.
  console.log(`Found ${initial} vulnerabilit${initial === 1 ? 'y' : 'ies'} from ${roots.length} root cause${roots.length === 1 ? '' : 's'}:`);
  for (const v of roots) {
    console.log(`  - ${v.name} (${v.severity}) vulnerable: ${v.range}`);
  }

  const applied = [];

  // ---- Tier 1: in-range bumps npm will make on its own -------------------
  if (WRITES) {
    console.log('\nTier 1: npm audit fix (in-range only, never --force)');
    run(['audit', 'fix', '--package-lock-only'], { allowFailure: true });
  } else {
    console.log('\nTier 1: would run `npm audit fix --package-lock-only`');
  }

  let report = WRITES ? audit() : before;
  let remaining = WRITES ? countVulnerabilities(report) : initial;
  if (WRITES && remaining < initial) {
    applied.push(`npm audit fix resolved ${initial - remaining} of ${initial}`);
    console.log(`  fixed ${initial - remaining}; ${remaining} left`);
  }

  // ---- Tier 2: patch-level overrides for what tier 1 could not reach -----
  const unfixable = [];
  if (remaining > 0) {
    console.log('\nTier 2: patch-level overrides');
    const pkgFile = readPackageJson();
    const json = pkgFile.json;

    for (const vuln of rootAdvisories(report)) {
      const name = vuln.name;
      const installed = installedVersion(name);
      if (!installed) {
        unfixable.push({ name, severity: vuln.severity, why: 'not found in package-lock.json' });
        continue;
      }
      const candidate = patchLevelCandidate(name, installed);
      if (!candidate) {
        unfixable.push({
          name,
          severity: vuln.severity,
          why: `no patch-level fix published above ${installed} (a fix would need a minor/major bump)`,
        });
        continue;
      }

      const range = patchRange(candidate);
      console.log(`  ${name}: ${installed} -> ${range}`);
      if (!WRITES) {
        applied.push(`would pin ${name} to ${range}`);
        continue;
      }

      // Apply, then let `npm audit` decide whether it worked, rather than
      // re-implementing npm's range semantics to predict the answer.
      const priorOverrides = JSON.parse(JSON.stringify(json.overrides ?? {}));
      json.overrides = { ...(json.overrides ?? {}), [name]: range };
      writePackageJson(pkgFile, json);
      run(['install', '--package-lock-only'], { allowFailure: true });

      const after = audit();
      const nowCount = countVulnerabilities(after);
      if (nowCount < remaining) {
        applied.push(`pinned ${name} to ${range} via overrides`);
        remaining = nowCount;
        report = after;
      } else {
        // Roll the pin back: an override that fixes nothing is pure risk.
        console.log(`    reverted — ${range} did not clear the advisory`);
        if (Object.keys(priorOverrides).length) json.overrides = priorOverrides;
        else delete json.overrides;
        writePackageJson(pkgFile, json);
        run(['install', '--package-lock-only'], { allowFailure: true });
        unfixable.push({ name, severity: vuln.severity, why: `patch-level pin ${range} does not clear it` });
      }
    }
  }

  // ---- Report -----------------------------------------------------------
  console.log('');
  if (applied.length) {
    console.log('Applied:');
    for (const a of applied) console.log(`  - ${a}`);
  }

  if (remaining === 0) {
    console.log('✓ All vulnerabilities resolved.');
    return;
  }

  // In --check nothing was attempted, so these are "found", not "unfixable" —
  // the caller uses the exit code purely as a cheap detector before paying for
  // `npm ci` and a full build.
  if (CHECK) {
    console.error(`\n✗ ${remaining} vulnerabilit${remaining === 1 ? 'y' : 'ies'} present; run without --check to attempt repair.`);
    process.exit(1);
  }

  console.error(`\n✗ ${remaining} vulnerabilit${remaining === 1 ? 'y' : 'ies'} need a human:`);
  for (const u of unfixable) console.error(`  - ${u.name} (${u.severity}): ${u.why}`);
  if (!unfixable.length) {
    for (const v of rootAdvisories(report)) console.error(`  - ${v.name} (${v.severity}): ${v.range}`);
  }
  console.error('\nA fix needing a minor or major bump is deliberately NOT automated — review it by hand.');
  process.exit(DRY_RUN ? 0 : 1);
}

main();
