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
