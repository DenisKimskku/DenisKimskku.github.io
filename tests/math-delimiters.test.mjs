import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBrokenMathDelimiters } from '../scripts/lib/math-delimiters.mjs';

test('clean prose with no math is fine', () => {
  assert.deepEqual(findBrokenMathDelimiters('Just a sentence about backdoors.'), []);
});

test('correctly paired inline math is fine', () => {
  const body = 'The budget $\\epsilon$ bounds the perturbation, and $L_p$ norms apply.';
  assert.deepEqual(findBrokenMathDelimiters(body), []);
});

test('display math blocks are ignored', () => {
  const body = ['Intro.', '', '$$', '\\mathcal{L} = \\alpha \\cdot x', '$$', '', 'Outro.'].join('\n');
  assert.deepEqual(findBrokenMathDelimiters(body), []);
});

test('fenced code and inline code may contain stray dollars', () => {
  const body = ['Shell:', '', '```bash', 'echo $HOME', '```', '', 'and `$PATH` inline.'].join('\n');
  assert.deepEqual(findBrokenMathDelimiters(body), []);
});

test('real math containing words inside \\text{} is not flagged', () => {
  const body = 'We get $h(v(x_i)) = 0 \\quad \\text{for all } i = 1, \\dots, K$ here.';
  assert.deepEqual(findBrokenMathDelimiters(body), []);
});

// The actual production defect: the generator escaped the OPENING delimiter but
// not the closing one, so the orphaned `$` pairs with the next one downstream.
test('escaped opening delimiter with unescaped closing is flagged', () => {
  const body = 'A solid black \\$336 \\times 336$ RGB image was used as the trigger.';
  const out = findBrokenMathDelimiters(body);
  assert.equal(out.length, 1);
  // Reported as mixed-escaping: the payload after `\$` contains LaTeX, which
  // is what distinguishes a broken delimiter from a real price.
  assert.equal(out[0].kind, 'mixed-escaping');
});

// The defect's most common shape, and the one plain parity cannot see: each
// table cell carries one orphaned `$`, so the ROW count is even while every
// cell renders wrong. 21 real defects in one batch hid here.
test('a table row whose cells each carry an orphaned $ is flagged', () => {
  const body = ['| Model | Rate |', '| --- | --- |', '| A | \\$0.930 \\pm 0.021$ |'].join('\n');
  const out = findBrokenMathDelimiters(body);
  assert.ok(out.length >= 1, 'per-cell parity must catch this');
});

// Articles legitimately mix a real price with real math in one paragraph.
test('currency alongside genuine math is NOT flagged', () => {
  const body = 'Changing a price from \\$109 to \\$219 while $\\phi_{t}$ stays fixed.';
  assert.deepEqual(findBrokenMathDelimiters(body), []);
});

test('real math with a comma is not mistaken for prose', () => {
  assert.deepEqual(findBrokenMathDelimiters('We compute $cossim(gc, gbd)$ per pair.'), []);
});

test('prose swallowed between two dollars is flagged', () => {
  const body = 'It costs $5 per inference and the universal attack alone raises it to $9 overall.';
  const out = findBrokenMathDelimiters(body);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'prose-in-math');
});

test('properly escaped currency is fine', () => {
  const body = 'It costs \\$5 per inference and rises to \\$9 under the universal attack.';
  assert.deepEqual(findBrokenMathDelimiters(body), []);
});

test('findings carry an excerpt to locate the problem', () => {
  const out = findBrokenMathDelimiters('Padded to 10 bits (\\$0000100011_2$).');
  assert.equal(out.length, 1);
  assert.match(out[0].excerpt, /0000100011/);
});
