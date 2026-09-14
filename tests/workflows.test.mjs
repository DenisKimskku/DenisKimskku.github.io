import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// GitHub validates workflow files far more strictly than a YAML parser or
// the SchemaStore schema does, and a file it rejects produces a failed run
// NAMED BY ITS PATH with zero jobs -- and every event that would have used
// it does nothing. The first version of dependabot-auto-merge.yml shipped
// exactly that way: a plain-scalar value `${{ ... format('PR #{0}', ...) }}`
// was cut at " #" by YAML's comment rule, leaving an unbalanced "${{" that
// GitHub refused. Both local validators passed it. These checks are
// dependency-free approximations of the GitHub-only failure modes we have
// actually hit; they run on every `npm test` and in CI.

const DIR = path.join(process.cwd(), '.github', 'workflows');
const files = fs.readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f));

test('there are workflow files to check', () => {
  assert.ok(files.length > 0);
});

// Two live failures shaped these rules for dependabot-auto-merge.yml:
//  - GitHub refreshes refs/pull/N/merge lazily; it served a test-merge
//    against a stale main tip for 5+ minutes after a push, and "re-dispatch
//    until fresh" became a self-dispatch loop (29 runs in 8 minutes). The
//    job must build the test-merge itself with `git merge`, never check out
//    refs/pull/N/merge, and any self-re-dispatch must be bounded.
//  - A depth-1 checkout grafts its boundary commit to have NO parents in
//    memory, so `git log --format=%P`, `HEAD^1` and `rev-list --parents`
//    return nothing there; the first chain failed on every PR that way.
test('dependabot-auto-merge.yml builds its own test-merge and bounds re-dispatch', () => {
  const text = fs.readFileSync(path.join(DIR, 'dependabot-auto-merge.yml'), 'utf8');
  const code = text
    .split(/\r?\n/)
    .filter((l) => !l.trimStart().startsWith('#'))
    .join('\n');
  assert.ok(!/ref:\s*refs\/pull\//.test(code), 'must not check out refs/pull/N/merge (stale for minutes after a push)');
  assert.match(code, /git merge --no-edit/, 'must build the test-merge locally');
  assert.match(code, /-f attempt=/, 'self-re-dispatch must carry the attempt counter');
  assert.match(code, /"\$\{ATTEMPT:-0\}" -ge 2/, 'self-re-dispatch must be bounded');
  for (const bad of ['--format=%P', 'HEAD^1', 'rev-list --parents']) {
    assert.ok(!code.includes(bad), `${bad} is empty in a shallow clone; do not use it for the base tip`);
  }
});

// dependency-autorepair.yml pushes package-lock.json to main, which makes it
// the SECOND writer of that file -- dependabot-auto-merge.yml is the first,
// and it verifies a test-merge then merges it. Its guards (record the main
// tip, re-check before merging, --match-head-commit) protect it from racing
// ITSELF, not from another workflow landing a lockfile commit underneath it;
// memory of that failure: "only the first merge would be the combination that
// was actually verified". So the autorepair must stand down entirely whenever
// an npm Dependabot PR is open, and defer to the workflow that serializes.
test('dependency-autorepair.yml defers to Dependabot rather than racing the lockfile', () => {
  const text = fs.readFileSync(path.join(DIR, 'dependency-autorepair.yml'), 'utf8');
  const code = text
    .split(/\r?\n/)
    .filter((l) => !l.trimStart().startsWith('#'))
    .join('\n');
  assert.match(
    code,
    /gh run list .*--workflow=dependabot-auto-merge\.yml/,
    'must check for an in-flight auto-merge RUN before repairing',
  );
  assert.match(code, /status == "in_progress" or \.status == "queued"/, 'in flight means queued or running');
  // Every step that can write must stand down while a merge is in flight.
  for (const step of ['Apply safe fixes', 'Detect changes']) {
    const idx = code.indexOf(`name: ${step}`);
    assert.ok(idx !== -1, `${step} step must exist`);
    const block = code.slice(idx, idx + 400);
    assert.match(block, /steps\.prs\.outputs\.defer != 'true'/, `${step} must stand down during an auto-merge run`);
  }
  // The guard must NOT key on an open PR. `indirect` Dependabot PRs stay open
  // indefinitely by design, so that form deadlocks the repair permanently --
  // and an indirect PR is the exact case this workflow exists to handle.
  assert.ok(
    !/gh pr list[^\n]*--author app\/dependabot/.test(code),
    'keying the guard on an open Dependabot PR deadlocks forever on indirect PRs',
  );
});

// The safety argument for auto-pushing dependency changes rests entirely on
// (a) never taking a breaking upgrade and (b) verifying before pushing. Both
// are one careless edit away from being void, so both are asserted.
test('dependency-autorepair.yml never forces a breaking upgrade and verifies before pushing', () => {
  const text = fs.readFileSync(path.join(DIR, 'dependency-autorepair.yml'), 'utf8');
  const code = text
    .split(/\r?\n/)
    .filter((l) => !l.trimStart().startsWith('#'))
    .join('\n');
  // The workflow must delegate tier selection to the script rather than
  // shelling out to npm itself, so there is exactly one place where the
  // "never take a breaking upgrade" rule lives.
  assert.match(code, /node scripts\/audit-autofix\.mjs/, 'repair must go through the script');
  // `--force` is checked on COMMAND lines only: the issue body legitimately
  // mentions it in prose ("in-range, never `--force`"), and an earlier version
  // of this assertion failed on its own explanatory text.
  const commands = code
    .split('\n')
    .filter((l) => !/^\s*echo\b/.test(l.trim()) && !/^\s*#/.test(l));
  assert.ok(
    !commands.some((l) => /npm\s+audit\s+fix/.test(l) && /--force/.test(l)),
    '--force takes semver-major bumps; it must never be automated',
  );
  // The push must be reachable only when verification succeeded.
  const pushIdx = code.indexOf('name: Commit and push the repair');
  assert.ok(pushIdx !== -1, 'push step must exist');
  assert.match(
    code.slice(pushIdx, pushIdx + 400),
    /steps\.verify\.outcome == 'success'/,
    'the push must be gated on the verification gauntlet passing',
  );
  // A GITHUB_TOKEN commit does not fire deploy.yml's push trigger, so the
  // deploy has to be dispatched or the repair never reaches the site.
  assert.match(code, /gh workflow run deploy\.yml/, 'a bot push must dispatch deploy.yml explicitly');
  // Retrofitting close-on-resolution onto content-watchdog, link-check and
  // deploy.yml is why this is required of any new alerting workflow.
  assert.match(code, /gh issue close/, 'must close its standing issue once resolved');
});

// Cache invalidation order in deploy.yml. The code-managed cache rule gives
// HTML a 30-day edge TTL, so two orderings that used to be harmless are now
// month-long stale-site bugs: purging before the origin serves the new build
// (a visitor re-fills the edge with the old page), and letting a purge
// failure pass silently. The warm must also start regional (Globalping)
// warming in the same step as the US-runner warm, not after it.
test('deploy.yml: cache config -> deploy -> wait -> purge -> warm (local + global together)', () => {
  const text = fs.readFileSync(path.join(DIR, 'deploy.yml'), 'utf8');
  const deployJob = text.slice(text.indexOf('\n  deploy:'));
  const stepNames = [...deployJob.matchAll(/^\s{6}- name: (.+)$/gm)].map((m) => m[1]);
  const at = (needle) => {
    const index = stepNames.findIndex((name) => name.includes(needle));
    assert.ok(index >= 0, `deploy job is missing a "${needle}" step (have: ${stepNames.join(' | ')})`);
    return index;
  };

  assert.ok(at('Ensure Cloudflare cache') < at('Deploy to GitHub Pages'), 'cache config must converge before deploy');
  assert.ok(at('Deploy to GitHub Pages') < at('Wait for new deploy'), 'wait must follow deploy');
  assert.ok(at('Wait for new deploy') < at('Purge Cloudflare'), 'purge must run only after the origin serves the new build');
  assert.ok(at('Purge Cloudflare') < at('Warm Cloudflare cache'), 'warm must follow purge');

  const step = (needle) => {
    const start = deployJob.indexOf(`- name: ${stepNames[at(needle)]}`);
    const rest = deployJob.slice(start + 1);
    const next = rest.search(/^\s{6}- name: /m);
    return rest.slice(0, next === -1 ? undefined : next);
  };
  assert.match(step('Ensure Cloudflare cache'), /continue-on-error: true/, 'a missing token permission must not block the deploy');
  assert.match(step('Ensure Cloudflare cache'), /npm run cache:ensure/);
  assert.ok(!/continue-on-error: true/.test(step('Purge Cloudflare')), 'a failed purge must fail the job (stale for 30 days otherwise)');
  const warm = step('Warm Cloudflare cache');
  assert.match(warm, /npm run warm:global[^\n]*&\s*$/m, 'Globalping warm must run in the background of the same step');
  assert.match(warm, /npm run warm:cache/);
  assert.match(warm, /continue-on-error: true/);
});

test('keep-warm.yml reports cache config and warms local + global together', () => {
  const text = fs.readFileSync(path.join(DIR, 'keep-warm.yml'), 'utf8');
  assert.match(text, /npm run cache:check/);
  assert.match(text, /npm run warm:global[^\n]*&\s*$/m);
  assert.match(text, /npm run warm:cache/);
});

for (const f of files) {
  const text = fs.readFileSync(path.join(DIR, f), 'utf8');
  const lines = text.split(/\r?\n/);

  test(`${f}: no tab characters (GitHub rejects tabs as indentation)`, () => {
    const hits = lines.map((l, i) => (l.includes('\t') ? i + 1 : 0)).filter(Boolean);
    assert.deepEqual(hits, [], `tab on line(s) ${hits.join(', ')}`);
  });

  test(`${f}: every \${{ expression is balanced on its line`, () => {
    const bad = [];
    lines.forEach((l, i) => {
      if (l.trimStart().startsWith('#')) return; // YAML comment line
      const opens = (l.match(/\$\{\{/g) || []).length;
      const closes = (l.match(/\}\}/g) || []).length;
      if (opens !== closes) bad.push(`${i + 1}: ${l.trim()}`);
    });
    assert.deepEqual(bad, [], `unbalanced expression(s):\n${bad.join('\n')}`);
  });

  test(`${f}: no " #" inside an unquoted \${{ expression (YAML would truncate it)`, () => {
    const bad = [];
    lines.forEach((l, i) => {
      if (l.trimStart().startsWith('#')) return;
      const m = l.match(/^(\s*[\w.-]+:\s*)(.*)$/);
      const value = m ? m[2] : l;
      const quoted = /^["']/.test(value.trim());
      if (quoted) return;
      let from = 0;
      for (;;) {
        const open = value.indexOf('${{', from);
        if (open === -1) break;
        const close = value.indexOf('}}', open);
        const span = value.slice(open, close === -1 ? undefined : close);
        if (/\s#/.test(span)) bad.push(`${i + 1}: ${l.trim()}`);
        if (close === -1) break;
        from = close + 2;
      }
    });
    assert.deepEqual(bad, [], `comment-truncated expression(s):\n${bad.join('\n')}`);
  });
}
