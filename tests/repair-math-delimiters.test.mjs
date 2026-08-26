import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repairMathDelimiters } from '../scripts/repair-math-delimiters.mjs';
import { findBrokenMathDelimiters } from '../scripts/lib/math-delimiters.mjs';

const fix = (s) => repairMathDelimiters(s).text;

// A body must come back byte-identical, with `changed: false` and no repairs.
function assertUntouched(body, why) {
  const out = repairMathDelimiters(body);
  assert.equal(out.text, body, why);
  assert.equal(out.changed, false, why);
  assert.deepEqual(out.repairs, [], why);
}

// The 2026-08-20 production defect, verbatim: two escaped openers, live closers.
const AUG20 =
  'LeakGauge achieves an F1 score of 0.983, while adding only \\$10.34 \\text{ ms}$ per request and fewer than \\$0.5\\text{K}$ additional parameters.';

test('the 08-20 sentence: both escaped openers are unescaped and nothing else changes', () => {
  const out = repairMathDelimiters(AUG20);
  assert.equal(
    out.text,
    'LeakGauge achieves an F1 score of 0.983, while adding only $10.34 \\text{ ms}$ per request and fewer than $0.5\\text{K}$ additional parameters.'
  );
  assert.equal(out.changed, true);
  assert.deepEqual(
    out.repairs.map((r) => r.rule),
    ['R1', 'R1']
  );
  assert.equal(out.text.length, AUG20.length - 2, 'exactly two backslashes removed');
  assert.deepEqual(findBrokenMathDelimiters(out.text), []);
});

test('R1: escaped opener with a live closer is unescaped', () => {
  assert.equal(
    fix('A solid black \\$336 \\times 336$ RGB image was used as the trigger.'),
    'A solid black $336 \\times 336$ RGB image was used as the trigger.'
  );
});

test('R2: escaped closer fused to a LaTeX command token is unescaped', () => {
  const out = repairMathDelimiters('Latency stays near $\\sim\\$139ms per call.');
  assert.equal(out.text, 'Latency stays near $\\sim$139ms per call.');
  assert.deepEqual(
    out.repairs.map((r) => r.rule),
    ['R2']
  );
});

test('table row with one broken cell is repaired', () => {
  const body = ['| Model | Rate |', '| --- | --- |', '| A | \\$0.930 \\pm 0.021$ |'].join('\n');
  assert.equal(fix(body), ['| Model | Rate |', '| --- | --- |', '| A | $0.930 \\pm 0.021$ |'].join('\n'));
});

test('table row with four broken cells has all four repaired', () => {
  const broken = '| M | \\$0.93 \\pm 0.02$ | \\$0.91 \\pm 0.01$ | \\$0.88 \\pm 0.03$ | \\$0.95 \\pm 0.02$ |';
  const body = ['| Model | A | B | C | D |', '| --- | --- | --- | --- | --- |', broken].join('\n');
  const out = repairMathDelimiters(body);
  assert.equal(out.text, body.replace(/\\\$/g, '$'));
  assert.equal(out.repairs.length, 4);
  assert.deepEqual(findBrokenMathDelimiters(out.text), []);
});

test('R3: display line with an escaped opening fence is repaired', () => {
  const body = ['The loss is', '', '\\$$ \\mathcal{L} = \\alpha \\cdot x $$', '', 'as shown.'].join('\n');
  assert.equal(fix(body), ['The loss is', '', '$$ \\mathcal{L} = \\alpha \\cdot x $$', '', 'as shown.'].join('\n'));
});

test('R3: closing fence written as \\$$ at end of a display block line is repaired', () => {
  const body = ['Intro.', '', '$$', '\\mathcal{L} = \\alpha \\cdot x \\$$', '', 'Outro.'].join('\n');
  const out = repairMathDelimiters(body);
  assert.equal(out.text, ['Intro.', '', '$$', '\\mathcal{L} = \\alpha \\cdot x $$', '', 'Outro.'].join('\n'));
  assert.deepEqual(
    out.repairs.map((r) => r.rule),
    ['R3']
  );
});

test('currency forms are byte-identical', () => {
  for (const s of [
    'The startup raised \\$25M last year.',
    'A \\$15M data breach in a \\$50M enterprise deployment.',
    'Prices range from \\$0.10 to \\$10.00 per call.',
    'Budgets of \\$20M are common.',
    'It costs \\$8K per run.',
    ['| Model | Cost |', '| --- | --- |', '| A | \\$120K |', '| B | \\$45K |'].join('\n'),
    'At \\$4.61 per benchmark the total is small.',
    'It costs \\$5 per inference and rises to \\$9 under the universal attack.',
  ]) {
    assertUntouched(s, s);
  }
});

test('a paragraph mixing currency with genuine math is byte-identical', () => {
  assertUntouched('Changing a price from \\$109 to \\$219 while $\\phi_{t}$ stays fixed.');
});

// The detector's mixed-escaping rule has a false positive: a real price whose
// payload (up to the next live `$`) carries a LaTeX-ish character in ordinary
// prose, followed by a lone `$<digit>` that remark-math leaves literal. The
// page renders correctly as written; unescaping the price would turn the
// prose into a KaTeX span and silence the detector, so the count-based guard
// cannot catch it. R1 must refuse any payload that still reads as prose.
test('R1 refuses currency whose payload is prose, even when the detector flags it', () => {
  for (const s of [
    'Costs \\$5 (gpt\\_4) compared to $9 baseline.',
    'Costs \\$5 \\times more, compared to $9 baseline.',
    'Costs \\$5 (k_1); $x$; $y',
    'Costs \\$5 for {each} run versus $9 baseline.',
  ]) {
    assert.ok(findBrokenMathDelimiters(s).length > 0, `precondition: detector flags ${s}`);
    assertUntouched(s, s);
  }
});

test('R1 still accepts the intended number-unit-command payload shapes', () => {
  for (const [broken, fixed] of [
    ['Adds \\$10.34 \\text{ ms}$ per request.', 'Adds $10.34 \\text{ ms}$ per request.'],
    ['Fewer than \\$0.5\\text{K}$ parameters.', 'Fewer than $0.5\\text{K}$ parameters.'],
    ['A \\$336 \\times 336$ image.', 'A $336 \\times 336$ image.'],
    ['Rate \\$0.930 \\pm 0.021$ overall.', 'Rate $0.930 \\pm 0.021$ overall.'],
    ['Scaled by \\$10^{-3}$ here.', 'Scaled by $10^{-3}$ here.'],
  ]) {
    assert.equal(fix(broken), fixed);
  }
});

test('a bare escaped LaTeX-looking token with no closer is left alone', () => {
  assertUntouched('Defenses like \\$A^2FV\\$ are bound to fail.');
});

test('frontmatter with a backslash and a fenced code block with \\$x$ are byte-identical', () => {
  const body = [
    '---',
    'title: "Estimating \\\\theta under \\$x$ noise"',
    'date: "2026-08-20"',
    '---',
    '',
    'Shell:',
    '',
    '```bash',
    'echo \\$x$ and \\$336 \\times 336$',
    '```',
    '',
    'and `\\$y \\times 2$` inline.',
  ].join('\n');
  assertUntouched(body);
});

test('a defect in the body is repaired while the frontmatter above it is untouched', () => {
  const fm = ['---', 'title: "Costs \\$10 \\text{ms}$"', 'date: "2026-08-20"', '---', ''].join('\n');
  const out = repairMathDelimiters(fm + AUG20);
  assert.ok(out.text.startsWith(fm), 'frontmatter must pass through byte-identical');
  assert.equal(out.repairs.length, 2);
});

test('a repair that the detector cannot vouch for is reverted', () => {
  // The second escaped span would still be flagged after unescaping the first,
  // so the finding count does not strictly drop and the unit stays as-is.
  assertUntouched('A secret vector \\$ \\mathbf{z} \\$ and \\$ \\mathbf{x} + \\mathbf{z} \\$ collapse into $y$.');
});

test('idempotent: repairing twice equals repairing once', () => {
  const once = fix(AUG20);
  assert.equal(fix(once), once);
  const outAgain = repairMathDelimiters(once);
  assert.equal(outAgain.changed, false);
  assert.deepEqual(outAgain.repairs, []);
});

test('never increases the detector finding count', () => {
  for (const s of [AUG20, 'Latency stays near $\\sim\\$139ms per call.', 'Prices from \\$0.10 to \\$10.00.']) {
    assert.ok(findBrokenMathDelimiters(fix(s)).length <= findBrokenMathDelimiters(s).length);
  }
});

// Windows checkout (core.autocrlf=true): the rewrite must keep each file's
// line endings exactly, and must not add or drop lines.
const doc = (eol) =>
  ['---', 'title: "A Title"', 'date: "2026-08-20"', '---', '', AUG20, '', '| A | B |', '| --- | --- |', '| x | \\$0.9 \\pm 0.1$ |', ''].join(eol);

test('CRLF input yields CRLF output with identical line count', () => {
  const src = doc('\r\n');
  const out = repairMathDelimiters(src);
  assert.equal(out.changed, true);
  assert.equal(out.text.includes('\n'), true);
  assert.equal((out.text.match(/\r\n/g) || []).length, (src.match(/\r\n/g) || []).length);
  assert.equal(/[^\r]\n/.test(out.text), false, 'no bare LF may appear in CRLF output');
  assert.equal(out.text.split('\r\n').length, src.split('\r\n').length);
  assert.equal(out.text, src.replace(/\\\$/g, '$'));
});

test('LF input yields LF output with identical line count', () => {
  const src = doc('\n');
  const out = repairMathDelimiters(src);
  assert.equal(out.changed, true);
  assert.equal(out.text.includes('\r'), false);
  assert.equal(out.text.split('\n').length, src.split('\n').length);
  assert.equal(out.text, src.replace(/\\\$/g, '$'));
});
