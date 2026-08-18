import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repairFrontmatterEscapes } from '../scripts/lib/frontmatter-escapes.mjs';

// Frontmatter with nothing to repair. Built per-EOL so the CRLF cases below
// exercise a Windows checkout (core.autocrlf=true) byte-for-byte.
const clean = (eol) =>
  ['---', 'title: "A Perfectly Fine Title"', 'date: "2026-08-18"', 'type: "Paper Walkthrough"', '---', '', 'Body text.'].join(eol);

const dirty = (eol) =>
  ['---', 'title: "Estimating $\\theta$ under noise"', 'date: "2026-08-18"', '---', '', 'Body text.'].join(eol);

test('clean frontmatter needs no repair (LF)', () => {
  assert.equal(repairFrontmatterEscapes(clean('\n')), null);
});

// Regression: split(/\r?\n/) + join('\n') rewrote every CRLF frontmatter to LF,
// so `fixed !== body` for ANY multi-line frontmatter and every article was
// reported as needing repair -- hard-failing local builds on Windows with a
// corpus-wide diff of pure line-ending churn. CI never caught it (Linux = LF).
test('clean frontmatter needs no repair (CRLF) -- must not false-positive', () => {
  assert.equal(repairFrontmatterEscapes(clean('\r\n')), null);
});

test('unintended escape is repaired (LF)', () => {
  const out = repairFrontmatterEscapes(dirty('\n'));
  assert.notEqual(out, null, 'a raw \\theta must still be detected');
  assert.match(out, /title: "Estimating \$\\\\theta\$ under noise"/);
});

test('unintended escape is repaired (CRLF) and line endings are preserved', () => {
  const out = repairFrontmatterEscapes(dirty('\r\n'));
  assert.notEqual(out, null, 'detection must work on a Windows checkout too');
  assert.match(out, /title: "Estimating \$\\\\theta\$ under noise"/);
  assert.equal(out.includes('\r\n'), true, 'CRLF endings must survive the repair');
  assert.equal(
    out.split('\r\n').length,
    dirty('\r\n').split('\r\n').length,
    'repair must not add or drop line breaks'
  );
});

test('already-escaped values (\\\\ and \\") are left alone', () => {
  const ok = ['---', 'title: "A backslash \\\\ and a quote \\" stay put"', '---', '', 'Body.'].join('\n');
  assert.equal(repairFrontmatterEscapes(ok), null);
});
