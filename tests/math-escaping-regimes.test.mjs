import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBrokenMathDelimiters } from '../scripts/lib/math-delimiters.mjs';
import { repairMathDelimiters } from '../scripts/repair-math-delimiters.mjs';

// The external generator has TWO escaping regimes, both measured in the
// corpus (2026-08-26 evidence sweep, 322 auto-generated articles at their
// original commits):
//   1. a digit heuristic — a `$` followed by a multi-digit/decimal number is
//      escaped 177 of 178 times, a single digit 0 of 30 — which hits math
//      openers (`\$336 \times 336$`) and, in 9 cases, closers (`$\sim\$139ms`);
//   2. a blanket "escape dollar signs" regime — whole spans `\$Y = F(X; \theta)\$`
//      (77 spans, 62 still live at HEAD before this change), where the math
//      never renders at all.
// Two payload shapes of regime 1 slipped past the original detector because
// its LaTeX signature had no `\%` and no notion of a bare number closed by a
// live `$`: `\$95.5\%$` and `\$768$` (11 spans live at HEAD).

const kinds = (s) => findBrokenMathDelimiters(s).map((f) => f.kind);
const fix = (s) => repairMathDelimiters(`---\ntitle: "t"\n---\n\n${s}\n`).text.split('\n').slice(4).join('\n').replace(/\n$/, '');

test('detector: `\\%` counts as LaTeX in an escaped-opener payload', () => {
  assert.deepEqual(kinds('monitors reached (\\$95.5\\%$ to \\$98.8\\%$) acceptance.'), ['mixed-escaping']);
});

test('detector: a bare number closed by a live $ is an escaped opener', () => {
  assert.deepEqual(kinds('Primary OOD: \\$768$ samples.'), ['mixed-escaping']);
  assert.deepEqual(kinds('drops from \\$0.7528$ to \\$0.7497$.'), ['mixed-escaping']);
});

test('detector: a real price followed by real math is still fine', () => {
  assert.deepEqual(kinds('from \\$109 to \\$219 while $\\phi_{t}$ stays fixed.'), []);
  assert.deepEqual(kinds('a \\$15M partnership and a \\$25M heist.'), []);
});

test('detector: both delimiters escaped is its own kind', () => {
  assert.deepEqual(kinds('as a function \\$Y = F(X; \\theta)\\$, where \\$X\\$ is the input'), ['fully-escaped-span']);
  assert.deepEqual(kinds('Achieves up to a \\$62\\times\\$ latency reduction'), ['fully-escaped-span']);
});

test('detector: two escaped prices in one sentence are NOT a fully-escaped span', () => {
  // `\$5 ... \$9` looks like `\$...\$` syntactically; the payload has no LaTeX.
  assert.deepEqual(kinds('costs between \\$5 and \\$9 per query.'), []);
});

test('repair R1: `\\%` and bare-number payloads are unescaped', () => {
  assert.equal(fix('reached (\\$95.5\\%$ to \\$98.8\\%$) acceptance.'), 'reached ($95.5\\%$ to $98.8\\%$) acceptance.');
  assert.equal(fix('Primary OOD: \\$768$ samples.'), 'Primary OOD: $768$ samples.');
});

test('repair R4: fully-escaped spans lose both backslashes', () => {
  assert.equal(
    fix('as a function \\$Y = F(X; \\theta)\\$, where \\$X\\$ is the input'),
    'as a function $Y = F(X; \\theta)$, where $X$ is the input',
  );
  assert.equal(fix('up to a \\$62\\times\\$ latency reduction'), 'up to a $62\\times$ latency reduction');
});

test('repair R4: a sentence-shaped payload between two prices is left alone', () => {
  const s = 'costs \\$5 today. Tomorrow it is \\$9 per query.';
  assert.equal(fix(s), s);
});

test('repair: real currency survives every rule', () => {
  for (const s of [
    'secure a \\$15M clinical research partnership.',
    'Transfer \\$30,000 in small increments under \\$10,000 each.',
    'from \\$109 to \\$219 while $\\phi_{t}$ stays fixed.',
    'ending values (\\$K): \\$8K, \\$12K and \\$20M.',
  ]) assert.equal(fix(s), s, s);
});

test('repair: idempotent on the new shapes', () => {
  const once = fix('\\$95.5\\%$ and \\$768$ and \\$62\\times\\$ and \\$X\\$');
  assert.equal(fix(once), once);
  assert.deepEqual(kinds(once), []);
});
