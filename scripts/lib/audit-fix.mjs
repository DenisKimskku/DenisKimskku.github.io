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

// ---- Accepted risks (audit-accepted.json) --------------------------------
//
// Tier 3 hands an advisory to a human. When the human's verdict is "nothing
// to upgrade to, and not reachable here" (braces GHSA-vfj7-8cjw-p6xm: no
// patched release exists at all, and the only path is the dev-only ESLint
// plugin), that verdict is recorded as an entry, not as an ever-open issue.
// An entry is deliberately narrow and self-revoking:
//
//   * keyed on the advisory id, so a NEW advisory on the same package pages;
//   * dated, so it pages again after `expires` and someone looks again;
//   * void if the package reaches a production path (lockfile `dev` flag);
//   * void once a patch-level fix is published, so tier 2 repairs it instead
//     of the acceptance hiding a fix that now exists.

// npm audit's advisory objects carry the GHSA id only inside `url`.
export function advisoryId(via) {
  const m = /GHSA(?:-[0-9a-z]{4}){3}/i.exec(String(via?.url ?? ''));
  return m ? m[0] : null;
}

// Which entries apply right now. `patchable` is the set of package names for
// which the driver found a patch-level candidate (a network lookup, so it is
// passed in to keep this pure); `now` is injected for the same reason.
export function effectiveAcceptances({ entries, report, lockPackages, patchable = new Set(), now = new Date() }) {
  const accepted = new Set();
  const notes = [];
  for (const e of Array.isArray(entries) ? entries : []) {
    const id = String(e?.id ?? '');
    const pkg = String(e?.package ?? '');
    const expires = /^\d{4}-\d{2}-\d{2}$/.test(e?.expires ?? '') ? new Date(`${e.expires}T23:59:59Z`) : null;
    if (!/^GHSA(-[0-9a-z]{4}){3}$/i.test(id) || !pkg || !String(e?.reason ?? '').trim() || !expires || isNaN(expires)) {
      notes.push(`ignored malformed entry ${id || '(no id)'}: needs id, package, reason and expires (YYYY-MM-DD)`);
      continue;
    }
    if (now > expires) {
      notes.push(`${id} (${pkg}) acceptance expired ${e.expires} — review it again`);
      continue;
    }
    if (patchable.has(pkg)) {
      notes.push(`${id} (${pkg}) now has a patch-level fix — repairing instead of accepting`);
      continue;
    }
    const nodes = report?.vulnerabilities?.[pkg]?.nodes ?? [];
    const prod = nodes.filter((n) => lockPackages?.[n]?.dev !== true);
    if (prod.length) {
      notes.push(`${id} (${pkg}) reaches a non-dev path (${prod.join(', ')}) — acceptance void`);
      continue;
    }
    accepted.add(id.toUpperCase());
  }
  return { accepted, notes };
}

// Package names whose every finding traces back to accepted advisories —
// micromatch, fast-glob and the ESLint plugin are listed by npm only because
// braces is, so they clear with it. Anything with one unaccepted advisory
// anywhere down its `via` chain stays.
export function suppressedPackages(report, accepted = new Set()) {
  const vulns = report?.vulnerabilities ?? {};
  const memo = new Map();
  const visit = (name) => {
    if (memo.has(name)) return memo.get(name);
    memo.set(name, false); // cycle guard: an unresolved loop does not suppress
    const v = vulns[name];
    const via = v?.via ?? [];
    const ok =
      !!v &&
      via.length > 0 &&
      via.every((x) =>
        typeof x === 'object' && x !== null ? accepted.has(String(advisoryId(x)).toUpperCase()) : visit(x)
      );
    memo.set(name, ok);
    return ok;
  };
  return new Set(Object.keys(vulns).filter(visit));
}

// countVulnerabilities, minus what is accepted. With nothing accepted it
// counts the same entries npm's metadata totals do.
export function countUnaccepted(report, accepted = new Set()) {
  if (!accepted.size) return countVulnerabilities(report);
  const hidden = suppressedPackages(report, accepted);
  return Object.values(report?.vulnerabilities ?? {}).filter(
    (v) => !hidden.has(v.name) && ['low', 'moderate', 'high', 'critical'].includes(v.severity)
  ).length;
}

// rootAdvisories, minus roots whose every advisory is accepted.
export function unacceptedRoots(report, accepted = new Set()) {
  return rootAdvisories(report).filter((v) =>
    v.via.some((x) => typeof x === 'object' && x !== null && !accepted.has(String(advisoryId(x)).toUpperCase()))
  );
}
