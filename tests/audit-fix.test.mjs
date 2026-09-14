// Unit tests for the decision logic behind scripts/audit-autofix.mjs.
//
// Deliberately offline. `npm audit` needs the registry's advisory database,
// and this suite runs in BOTH ci.yml and deploy.yml — a network-flaky test
// here would violate the invariant that content must never block a deploy.
// So the npm calls live in the driver and only the pure decisions are tested.
//
// The report fixtures below are the REAL `npm audit --json` output shapes
// captured 2026-09-14 from the repo's own two advisories (js-yaml
// GHSA-2883-xcg3-v3hh and the fflate ZIP64 loop), trimmed to the fields the
// helpers read. `satori`'s `via: ["fflate"]` is the important one: npm reports
// a package as vulnerable merely for DEPENDING on a vulnerable package, and
// pinning satori would pin the wrong thing.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  compareVersions,
  countVulnerabilities,
  lowestInstalled,
  parseVersion,
  patchRange,
  pickPatchLevel,
  rootAdvisories,
} from '../scripts/lib/audit-fix.mjs';

const REPORT = {
  vulnerabilities: {
    fflate: {
      name: 'fflate',
      severity: 'moderate',
      isDirect: false,
      range: '0.7.0 - 0.7.4',
      via: [{ name: 'fflate', severity: 'moderate', title: 'fflate unzipSync infinite loop' }],
    },
    'js-yaml': {
      name: 'js-yaml',
      severity: 'high',
      isDirect: false,
      range: '3.0.0 - 3.15.1 || 4.0.0 - 4.3.1',
      via: [
        { name: 'js-yaml', severity: 'high', title: 'maxTotalMergeKeys does not limit CPU use' },
        { name: 'js-yaml', severity: 'high', title: 'maxTotalMergeKeys does not limit CPU use' },
      ],
    },
    satori: {
      name: 'satori',
      severity: 'moderate',
      isDirect: true,
      range: '>=0.33.0',
      via: ['fflate'], // reported only because fflate is vulnerable
    },
  },
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 2, high: 1, critical: 0, total: 3 } },
};

const LOCK_PACKAGES = {
  '': { name: 'denis-kim-portfolio' },
  'node_modules/fflate': { version: '0.7.5', dev: true },
  'node_modules/satori/node_modules/fflate': { version: '0.7.3', dev: true },
  'node_modules/js-yaml': { version: '4.3.1', dev: true },
  'node_modules/gray-matter/node_modules/js-yaml': { version: '3.15.1' },
  'node_modules/satori': { version: '0.33.4', dev: true },
};

test('the driver never invokes npm audit fix --force', () => {
  // Tier 1's entire safety claim is that `npm audit fix` without --force makes
  // only in-range changes. Verified empirically 2026-09-14: it fixed both
  // js-yaml paths, left package.json untouched, and DECLINED npm's suggested
  // satori 0.32.0 major downgrade. Adding --force would silently void that.
  // Asserted against the ARGUMENT ARRAYS the script builds, not its text:
  // both the header comment and a progress line legitimately say the word
  // "--force", and a looser check failed on that prose twice.
  const src = fs.readFileSync(new URL('../scripts/audit-autofix.mjs', import.meta.url), 'utf8');
  const invocations = [...src.matchAll(/run\(\s*\[([^\]]*)\]/g)].map((m) => m[1]);
  assert.ok(invocations.length >= 3, `expected the npm invocations to be found, got ${invocations.length}`);
  assert.ok(
    !invocations.some((a) => a.includes('--force')),
    `audit-autofix.mjs must never pass --force to npm; found: ${invocations.filter((a) => a.includes('--force')).join(' | ')}`,
  );
});

test('parseVersion accepts x.y.z and rejects prereleases', () => {
  assert.deepEqual(parseVersion('0.7.3'), { major: 0, minor: 7, patch: 3 });
  assert.deepEqual(parseVersion('10.2.3'), { major: 10, minor: 2, patch: 3 });
  // An automated pin must never land a package on a prerelease — the repo
  // really does carry one (@shuding/opentype.js@1.4.0-beta.0).
  assert.equal(parseVersion('1.4.0-beta.0'), null);
  assert.equal(parseVersion('^0.7.5'), null);
  assert.equal(parseVersion(undefined), null);
});

test('compareVersions orders numerically, not lexically', () => {
  // The bug this guards: string sort puts "0.7.10" before "0.7.9".
  assert.ok(compareVersions('0.7.9', '0.7.10') < 0);
  assert.ok(compareVersions('1.0.0', '0.99.99') > 0);
  assert.equal(compareVersions('3.15.1', '3.15.1'), 0);
});

test('lowestInstalled finds the nested copy, not the hoisted one', () => {
  // fflate is hoisted at a SAFE 0.7.5 while satori nests the vulnerable
  // 0.7.3. Reading the hoisted copy would conclude there is nothing to fix.
  assert.equal(lowestInstalled(LOCK_PACKAGES, 'fflate'), '0.7.3');
  assert.equal(lowestInstalled(LOCK_PACKAGES, 'js-yaml'), '3.15.1');
  assert.equal(lowestInstalled(LOCK_PACKAGES, 'satori'), '0.33.4');
  assert.equal(lowestInstalled(LOCK_PACKAGES, 'not-installed'), null);
});

test('lowestInstalled does not match a package whose name is a suffix of another', () => {
  const pkgs = { 'node_modules/node-fetch': { version: '2.6.0' } };
  assert.equal(lowestInstalled(pkgs, 'fetch'), null);
});

test('pickPatchLevel stays inside the installed major.minor', () => {
  const versions = ['0.7.2', '0.7.3', '0.7.4', '0.7.5', '0.8.0', '0.8.1', '1.0.0'];
  // The real fflate decision: 0.7.3 -> 0.7.5, never 0.8.0. Under semver a 0.x
  // minor bump is breaking, which is the entire safety argument for tier 2.
  assert.equal(pickPatchLevel(versions, '0.7.3'), '0.7.5');
  // Already at the ceiling: nothing to offer, so it must fall through to a human.
  assert.equal(pickPatchLevel(versions, '0.7.5'), null);
  // A fix that exists only in a later minor is NOT auto-applied.
  assert.equal(pickPatchLevel(['0.7.3', '0.8.0'], '0.7.3'), null);
  assert.equal(pickPatchLevel(versions, '9.9.9'), null);
});

test('pickPatchLevel never selects a prerelease', () => {
  assert.equal(pickPatchLevel(['1.4.0', '1.4.1-beta.0'], '1.4.0'), null);
  assert.equal(pickPatchLevel(['1.4.0', '1.4.1-beta.0', '1.4.1'], '1.4.0'), '1.4.1');
});

test('patchRange expresses patch-only in npm notation', () => {
  // Below 1.0.0 `^` already means patch-only; at or above, `~` does.
  assert.equal(patchRange('0.7.5'), '^0.7.5');
  assert.equal(patchRange('3.15.2'), '~3.15.2');
  assert.equal(patchRange('not-a-version'), null);
});

test('countVulnerabilities sums real severities and ignores info', () => {
  assert.equal(countVulnerabilities(REPORT), 3);
  assert.equal(countVulnerabilities({ metadata: { vulnerabilities: { info: 7 } } }), 0);
  assert.equal(countVulnerabilities(null), 0);
  assert.equal(countVulnerabilities({}), 0);
});

test('rootAdvisories drops packages reported only for depending on a vulnerable one', () => {
  const names = rootAdvisories(REPORT).map((v) => v.name).sort();
  // satori must NOT appear: its `via` is the string "fflate", meaning the
  // defect is underneath it. Pinning satori would pin the wrong package —
  // and npm's own suggested "fix" for it was a MAJOR DOWNGRADE to 0.32.0.
  assert.deepEqual(names, ['fflate', 'js-yaml']);
  assert.equal(rootAdvisories(null).length, 0);
});

test('the fflate case resolves end to end through the pure helpers', () => {
  // The exact decision chain the driver runs, minus the npm calls: this is
  // what produced `"fflate": "^0.7.5"` in package.json on 2026-09-14.
  const fflate = rootAdvisories(REPORT).find((v) => v.name === 'fflate');
  const installed = lowestInstalled(LOCK_PACKAGES, fflate.name);
  const candidate = pickPatchLevel(['0.7.3', '0.7.4', '0.7.5', '0.8.0'], installed);
  assert.equal(installed, '0.7.3');
  assert.equal(candidate, '0.7.5');
  assert.equal(patchRange(candidate), '^0.7.5');
});
