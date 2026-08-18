import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDisplayMath } from '../src/lib/markdown.ts';

test('a single-line $$...$$ at column 0 becomes three lines', () => {
  const out = normalizeDisplayMath('$$x = y$$');
  assert.equal(out, '$$\nx = y\n$$');
});

// Regression: the content line used to be emitted at column 0 regardless of
// the fences' indent. Inside a list item that ends the list early, which
// desynchronizes every later $$ fence in the document -- one math node
// swallowed a whole list item and the next swallowed ~94 lines including a
// heading and two code fences, shipping raw `$\theta_R$` to readers.
test('an indented $$...$$ keeps its indent on ALL three lines', () => {
  const out = normalizeDisplayMath('  $$\\mathcal{L}_B = 1$$');
  assert.equal(out, '  $$\n  \\mathcal{L}_B = 1\n  $$');
  for (const line of out.split('\n')) {
    assert.match(line, /^ {2}\S/, `line must stay indented: ${JSON.stringify(line)}`);
  }
});

test('indentation is preserved for tabs too', () => {
  const out = normalizeDisplayMath('\t$$z$$');
  assert.equal(out, '\t$$\n\tz\n\t$$');
});

test('a list item containing display math stays one block', () => {
  const src = ['- **Term** (definition):', '', '  $$a = b$$', '', '- **Next** item'].join('\n');
  const out = normalizeDisplayMath(src).split('\n');
  // Every non-empty line between the bullets must remain indented.
  assert.deepEqual(out.slice(2, 5), ['  $$', '  a = b', '  $$']);
});

test('display math inside a fenced code block is left alone', () => {
  const src = ['```', '$$x = y$$', '```'].join('\n');
  assert.equal(normalizeDisplayMath(src), src);
});

test('already-multiline display math is untouched', () => {
  const src = ['$$', 'x = y', '$$'].join('\n');
  assert.equal(normalizeDisplayMath(src), src);
});

test('a line with two $$ pairs is not rewritten', () => {
  const src = '$$a$$ and $$b$$';
  assert.equal(normalizeDisplayMath(src), src);
});

test('empty $$$$ is not rewritten', () => {
  assert.equal(normalizeDisplayMath('$$$$'), '$$$$');
});
