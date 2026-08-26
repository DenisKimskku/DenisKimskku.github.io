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

// A depth-1 checkout grafts its boundary commit to have NO parents in
// memory, so `git log --format=%P`, `HEAD^1` and `rev-list --parents` all
// return nothing there. dependabot-auto-merge.yml must read the merge
// base of refs/pull/N/merge from the raw object with `git cat-file -p`.
// The first live run failed on every PR because of exactly this.
test('dependabot-auto-merge.yml reads the merge base from the raw commit object', () => {
  const text = fs.readFileSync(path.join(DIR, 'dependabot-auto-merge.yml'), 'utf8');
  assert.match(text, /git cat-file -p HEAD \| sed -n 's\/\^parent \/\/p'/);
  const code = text
    .split(/\r?\n/)
    .filter((l) => !l.trimStart().startsWith('#'))
    .join('\n');
  for (const bad of ['--format=%P', 'HEAD^1', 'rev-list --parents']) {
    assert.ok(!code.includes(bad), `${bad} is empty in a shallow clone; do not use it for the base tip`);
  }
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
