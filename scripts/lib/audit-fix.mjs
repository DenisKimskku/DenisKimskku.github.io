// Pure helpers behind scripts/audit-autofix.mjs — the same detector/driver
// split as scripts/lib/math-delimiters.mjs vs repair-math-delimiters.mjs.
//
// Everything here is a pure function of its arguments: no npm, no network, no
// filesystem. That is deliberate. `npm audit` needs the registry's advisory
// database, and tests/*.test.mjs runs in BOTH ci.yml and deploy.yml — where a
// network-flaky test would violate the invariant that content must never block
// a deploy. So the decision logic is unit-tested here offline, and the npm
// calls stay in the driver where a failure is a workflow failure, not a
// red deploy.

// Strict x.y.z only. Rejecting prereleases (1.0.0-beta, 1.4.0-beta.0) is a
// feature: an automated pin must never land a package on a prerelease.
export function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v ?? '').trim());
  return m ? { major: +m[1], minor: +m[2], patch: +m[3] } : null;
}

export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return 0;
  return x.major - y.major || x.minor - y.minor || x.patch - y.patch;
}

// The lowest version present in the tree — when a package is hoisted at one
// version and nested at another (satori's fflate 0.7.3 under a hoisted 0.7.5),
// the lower copy is the one still carrying the advisory.
export function lowestInstalled(lockPackages, pkg) {
  const suffix = `node_modules/${pkg}`;
  const found = Object.entries(lockPackages ?? {})
    .filter(([k]) => k === suffix || k.endsWith(`/${suffix}`))
    .map(([, v]) => v?.version)
    .filter((v) => parseVersion(v));
  if (!found.length) return null;
  return found.sort(compareVersions)[0];
}

// The highest published version sharing the installed MAJOR and MINOR.
//
// Capping at the minor is the whole safety argument for tier 2. Under semver a
// 0.x minor bump is a breaking change, so for fflate 0.7.3 this returns 0.7.5
// and never 0.8.0; for a 1.x package it is the ~ range. A fix that needs a
// minor or major bump deliberately returns null so a human reviews it.
export function pickPatchLevel(versions, installed) {
  const cur = parseVersion(installed);
  if (!cur || !Array.isArray(versions)) return null;
  const higher = versions
    .map((v) => ({ raw: v, p: parseVersion(v) }))
    .filter(({ p }) => p && p.major === cur.major && p.minor === cur.minor && p.patch > cur.patch)
    .sort((a, b) => b.p.patch - a.p.patch);
  return higher.length ? higher[0].raw : null;
}

// A patch-only range in npm's own notation: `^` already means patch-only below
// 1.0.0, and `~` means it at or above.
export function patchRange(v) {
  const p = parseVersion(v);
  if (!p) return null;
  return p.major === 0 ? `^${v}` : `~${v}`;
}

// Total findings that matter. `info` is advisory noise, not a vulnerability.
export function countVulnerabilities(report) {
  const m = report?.metadata?.vulnerabilities;
  if (!m) return 0;
  return (m.low ?? 0) + (m.moderate ?? 0) + (m.high ?? 0) + (m.critical ?? 0);
}

// Advisories with a real defect of their own, dropping the ones npm reports
// only because they DEPEND on a vulnerable package (npm lists satori as
// vulnerable when the defect is in fflate underneath it). npm marks the
// difference by whether any `via` entry is an advisory object or just a
// package name — pinning a name-only entry would pin the wrong package.
export function rootAdvisories(report) {
  return Object.values(report?.vulnerabilities ?? {})
    .filter((v) => (v.via ?? []).some((x) => typeof x === 'object' && x !== null));
}
