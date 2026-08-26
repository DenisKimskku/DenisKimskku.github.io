import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { repairDeadLinks, MIN_PAYLOAD_LENGTH } from '../scripts/repair-dead-links.mjs';

const SCRIPT = fileURLToPath(new URL('../scripts/repair-dead-links.mjs', import.meta.url));

// The exact production defect: line 26 of the 2026-08-18 digest, cut off
// mid-token with the `(` and `[` left unclosed.
const OBSERVED_LINE =
  '**Anthropic adds invisible watermarks to Claude using Google tech** ([https://news.google.com/rss/articles/CBMinAFBVV95cUxOQ';
const OBSERVED_FIXED = '**Anthropic adds invisible watermarks to Claude using Google tech**';

const SHORT = 'https://news.google.com/rss/articles/CBMinAFBVV95cUxOQ';
const FULL =
  'https://news.google.com/rss/articles/CBMikwFBVV95cUxQZmZ3ZUdlYnMyZFZCVEw4cXJNSFRwYVl2MlRxeFRoZmJ1eGRiSW5JcVRLOUZPN2ttUWlZTHU2djJiSjRRSE1hQjY3d0ZTTTFlYlVvelEwU2ZSZFFSdDgwUjFk?oc=5&hl=en-US&gl=US&ceid=US:en';

const frontmatter = ['---', 'title: "AI Security Digest — August 18, 2026"', 'date: "2026-08-18"', 'type: "News Digest"', '---'];

const doc = (lines, eol) => [...frontmatter, '', ...lines].join(eol);

test('a full-length redirector payload clears the truncation threshold', () => {
  const payload = FULL.match(/articles\/([A-Za-z0-9_-]*)/)[1];
  assert.ok(payload.length >= MIN_PAYLOAD_LENGTH);
  assert.ok(SHORT.length - 'https://news.google.com/rss/articles/'.length < MIN_PAYLOAD_LENGTH);
});

test('the observed cut-off line keeps the headline and drops the dangling tail', () => {
  const out = repairDeadLinks(OBSERVED_LINE);
  assert.equal(out.changed, true);
  assert.equal(out.text, OBSERVED_FIXED);
  assert.deepEqual(out.repairs, [{ before: OBSERVED_LINE, after: OBSERVED_FIXED }]);
});

test('a well-formed link to a truncated redirector keeps its text', () => {
  const out = repairDeadLinks(`[Some headline](${SHORT})`);
  assert.equal(out.changed, true);
  assert.equal(out.text, 'Some headline');
});

test('surrounding prose on the line is preserved', () => {
  const line = `- **[Vendor ships patch](${SHORT})** — the fix landed quietly.`;
  const out = repairDeadLinks(line);
  assert.equal(out.text, '- **Vendor ships patch** — the fix landed quietly.');
});

test("the generator's canonical ([url](url)) form with a truncated URL drops the whole link", () => {
  const line = `**Headline** ([${SHORT}](${SHORT})) — commentary.`;
  const out = repairDeadLinks(line);
  assert.equal(out.text, '**Headline** — commentary.');
});

test('a full-length redirector is byte-identical', () => {
  const lines = [`**Headline** ([${FULL}](${FULL})) — commentary.`, `[Plain](${FULL})`, `**Cut but long** ([${FULL}`];
  for (const line of lines) {
    const out = repairDeadLinks(line);
    assert.equal(out.changed, false);
    assert.equal(out.text, line);
    assert.deepEqual(out.repairs, []);
  }
});

test('a short payload on a different host is byte-identical', () => {
  const lines = [
    '[Some headline](https://example.com/rss/articles/abc)',
    '**Headline** ([https://example.com/rss/articles/abc',
    '[Other Google path](https://news.google.com/articles/abc)'
  ];
  for (const line of lines) {
    const out = repairDeadLinks(line);
    assert.equal(out.changed, false);
    assert.equal(out.text, line);
  }
});

test('frontmatter containing a short redirector is byte-identical', () => {
  const text = ['---', `source: "${SHORT}"`, `link: "[x](${SHORT})"`, '---', '', 'Body.'].join('\n');
  const out = repairDeadLinks(text);
  assert.equal(out.changed, false);
  assert.equal(out.text, text);
});

test('fenced code blocks containing a short redirector are byte-identical', () => {
  for (const fence of ['```', '~~~']) {
    const text = doc(['Intro.', '', fence, `[x](${SHORT})`, OBSERVED_LINE, fence, '', 'Outro.'], '\n');
    const out = repairDeadLinks(text);
    assert.equal(out.changed, false, `${fence} fence must be left alone`);
    assert.equal(out.text, text);
  }
});

test('repairs resume after a fence closes and ignore a mismatched closer', () => {
  const text = doc(['```', `[in](${SHORT})`, '~~~', `[still in](${SHORT})`, '```', `[out](${SHORT})`], '\n');
  const out = repairDeadLinks(text);
  assert.equal(out.changed, true);
  assert.equal(out.repairs.length, 1);
  assert.equal(out.repairs[0].after, 'out');
  assert.ok(out.text.includes(`[in](${SHORT})`));
  assert.ok(out.text.includes(`[still in](${SHORT})`));
});

test('repair is idempotent', () => {
  const text = doc([`[Some headline](${SHORT})`, OBSERVED_LINE], '\n');
  const once = repairDeadLinks(text);
  assert.equal(once.changed, true);
  const twice = repairDeadLinks(once.text);
  assert.equal(twice.changed, false);
  assert.equal(twice.text, once.text);
  assert.deepEqual(twice.repairs, []);
});

test('CRLF line endings are preserved', () => {
  const text = doc(['Prose.', OBSERVED_LINE, '', '## Next'], '\r\n');
  const out = repairDeadLinks(text);
  assert.equal(out.changed, true);
  assert.equal(out.text, doc(['Prose.', OBSERVED_FIXED, '', '## Next'], '\r\n'));
  assert.equal(out.text.includes('\n'), true);
  assert.equal(/(?<!\r)\n/.test(out.text), false, 'no bare LF may be introduced');
});

test('LF line endings are preserved', () => {
  const text = doc(['Prose.', OBSERVED_LINE, '', '## Next'], '\n');
  const out = repairDeadLinks(text);
  assert.equal(out.changed, true);
  assert.equal(out.text, doc(['Prose.', OBSERVED_FIXED, '', '## Next'], '\n'));
  assert.equal(out.text.includes('\r'), false, 'no CR may be introduced');
});

// Regression guard for the corpus as it actually is: many Windows-checkout
// articles mix CRLF and LF within a single file. Each line must keep its own.
test('mixed per-line line endings are preserved exactly', () => {
  const text = `---\r\ntitle: "x"\n---\r\n\nProse.\r\n${OBSERVED_LINE}\r\n\n## Next\r\nTail without newline`;
  const expected = `---\r\ntitle: "x"\n---\r\n\nProse.\r\n${OBSERVED_FIXED}\r\n\n## Next\r\nTail without newline`;
  const out = repairDeadLinks(text);
  assert.equal(out.text, expected);
});

test('clean documents report no change (LF and CRLF)', () => {
  for (const eol of ['\n', '\r\n']) {
    const text = doc([`**Headline** ([${FULL}](${FULL})) — fine.`, '', '## Den\'s Take', '', 'Prose.'], eol);
    const out = repairDeadLinks(text);
    assert.equal(out.changed, false);
    assert.equal(out.text, text);
  }
});

// End-to-end: the CLI against a throwaway articles directory. Verifies the
// --check / --dry-run / default write contract and that untouched files are
// never rewritten (mtime unchanged), while frontmatter and endings survive.
test('CLI: --check exits 1 without writing, --dry-run exits 0, default rewrites only changed files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repair-dead-links-'));
  const artdir = path.join(root, 'src', 'content', 'articles');
  fs.mkdirSync(artdir, { recursive: true });
  const dirtyPath = path.join(artdir, 'dirty.md');
  const cleanPath = path.join(artdir, 'clean.md');
  const dirty = doc(['Prose.', OBSERVED_LINE, '', '## Next'], '\r\n');
  const clean = doc([`[Plain](${FULL})`], '\r\n');
  fs.writeFileSync(dirtyPath, dirty, 'utf8');
  fs.writeFileSync(cleanPath, clean, 'utf8');
  const cleanMtime = fs.statSync(cleanPath).mtimeMs;
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, encoding: 'utf8' });

  try {
    const check = run('--check');
    assert.equal(check.status, 1, check.stderr);
    assert.match(check.stdout, /Would repair 1 dead link\(s\) in dirty\.md/);
    assert.equal(fs.readFileSync(dirtyPath, 'utf8'), dirty, '--check must not write');

    const dry = run('--dry-run');
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(fs.readFileSync(dirtyPath, 'utf8'), dirty, '--dry-run must not write');

    const write = run();
    assert.equal(write.status, 0, write.stderr);
    assert.match(write.stdout, /Repaired 1 dead link\(s\) in dirty\.md/);
    assert.equal(fs.readFileSync(dirtyPath, 'utf8'), doc(['Prose.', OBSERVED_FIXED, '', '## Next'], '\r\n'));
    assert.equal(fs.readFileSync(cleanPath, 'utf8'), clean);
    assert.equal(fs.statSync(cleanPath).mtimeMs, cleanMtime, 'unchanged files must not be rewritten');

    const again = run('--check');
    assert.equal(again.status, 0, 'after repair, --check must be clean');
    assert.match(again.stdout, /No dead link repair needed/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
