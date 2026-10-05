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
  advisoryId,
  countUnaccepted,
  effectiveAcceptances,
  suppressedPackages,
  unacceptedRoots,
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

/* --- accepted risks (audit-accepted.json) ---------------------------------- */

// Real `npm audit --json` shape captured 2026-10-05 (braces GHSA-vfj7-8cjw-p6xm,
// no patched release), trimmed to the fields the helpers read. Four of the five
// findings exist only because braces does.
const BRACES = 'GHSA-vfj7-8cjw-p6xm';
const braceVia = (id = BRACES) => ({
  source: 1240992,
  name: 'braces',
  dependency: 'braces',
  title: 'braces vulnerable to stack-exhaustion denial of service through deeply nested patterns',
  url: `https://github.com/advisories/${id}`,
  severity: 'high',
  range: '<=3.0.3',
});
const braceReport = (via = [braceVia()]) => ({
  vulnerabilities: {
    '@next/eslint-plugin-next': { name: '@next/eslint-plugin-next', severity: 'high', via: ['fast-glob'], nodes: ['node_modules/@next/eslint-plugin-next'] },
    braces: { name: 'braces', severity: 'high', via, nodes: ['node_modules/braces'] },
    'eslint-config-next': { name: 'eslint-config-next', severity: 'high', via: ['@next/eslint-plugin-next'], nodes: ['node_modules/eslint-config-next'] },
    'fast-glob': { name: 'fast-glob', severity: 'high', via: ['micromatch'], nodes: ['node_modules/fast-glob'] },
    micromatch: { name: 'micromatch', severity: 'high', via: ['braces'], nodes: ['node_modules/micromatch'] },
  },
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 5, critical: 0, total: 5 } },
});
const DEV_LOCK = { 'node_modules/braces': { version: '3.0.3', dev: true } };
const ENTRY = { id: BRACES, package: 'braces', expires: '2027-01-05', reason: 'no fix; dev-only ESLint path' };
const NOW = new Date('2026-10-05T00:00:00Z');
const accept = (over = {}) =>
  effectiveAcceptances({ entries: [ENTRY], report: braceReport(), lockPackages: DEV_LOCK, now: NOW, ...over });

test('advisoryId reads the GHSA id out of the advisory url', () => {
  assert.equal(advisoryId(braceVia()), BRACES);
  assert.equal(advisoryId({ url: 'https://example.com' }), null);
  assert.equal(advisoryId('braces'), null);
});

test('an accepted root clears its dependents-only chain, and nothing else', () => {
  const { accepted, notes } = accept();
  assert.deepEqual([...accepted], [BRACES.toUpperCase()]);
  assert.deepEqual(notes, []);
  const report = braceReport();
  assert.equal(suppressedPackages(report, accepted).size, 5);
  assert.equal(countUnaccepted(report, accepted), 0);
  assert.deepEqual(unacceptedRoots(report, accepted), []);
  assert.equal(countUnaccepted(report), 5, 'with nothing accepted it matches npm totals');
});

test('an expired acceptance pages again', () => {
  const { accepted, notes } = accept({ now: new Date('2027-01-06T00:00:01Z') });
  assert.equal(accepted.size, 0);
  assert.match(notes[0], /expired/);
  assert.equal(accept({ now: new Date('2027-01-05T12:00:00Z') }).accepted.size, 1, 'valid through the expiry day');
});

test('an acceptance never hides a patch-level fix once one is published', () => {
  const { accepted, notes } = accept({ patchable: new Set(['braces']) });
  assert.equal(accepted.size, 0);
  assert.match(notes[0], /patch-level fix/);
});

test('an acceptance is void if the package reaches a non-dev path', () => {
  const { accepted, notes } = accept({ lockPackages: { 'node_modules/braces': { version: '3.0.3' } } });
  assert.equal(accepted.size, 0);
  assert.match(notes[0], /non-dev/);
});

test('a different advisory on the same package still pages', () => {
  const report = braceReport([braceVia(), braceVia('GHSA-aaaa-bbbb-cccc')]);
  const { accepted } = accept({ report });
  assert.equal(countUnaccepted(report, accepted), 5);
  assert.deepEqual(unacceptedRoots(report, accepted).map((v) => v.name), ['braces']);
});

test('malformed entries accept nothing', () => {
  for (const bad of [{ ...ENTRY, reason: ' ' }, { ...ENTRY, expires: 'soon' }, { ...ENTRY, id: 'braces' }, null]) {
    assert.equal(accept({ entries: [bad] }).accepted.size, 0);
  }
});

test('the committed audit-accepted.json is well-formed and every entry is dated', () => {
  const { accepted } = JSON.parse(fs.readFileSync(new URL('../audit-accepted.json', import.meta.url), 'utf8'));
  assert.ok(Array.isArray(accepted));
  for (const e of accepted) {
    assert.match(e.id, /^GHSA(-[0-9a-z]{4}){3}$/);
    assert.match(e.expires, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(e.package && e.reason?.trim());
  }
});
