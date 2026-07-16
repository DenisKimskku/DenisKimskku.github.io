import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractDescriptionFromContent,
  isTrivialDescription,
} from '../scripts/lib/extract-frontmatter.mjs';

const TITLE = 'AI Security Digest — April 22, 2026';

test('isTrivialDescription: empty / missing descriptions are trivial', () => {
  assert.equal(isTrivialDescription('', TITLE), true);
  assert.equal(isTrivialDescription(undefined, TITLE), true);
  assert.equal(isTrivialDescription(null, TITLE), true);
});

test('isTrivialDescription: description equal to the title is trivial', () => {
  assert.equal(isTrivialDescription(TITLE, TITLE), true);
  assert.equal(isTrivialDescription(`  ${TITLE}  `, TITLE), true, 'whitespace-padded copy of title');
});

test('isTrivialDescription: short descriptions (<60 chars) are trivial', () => {
  assert.equal(isTrivialDescription('A short blurb.', TITLE), true);
});

test('isTrivialDescription: truncated descriptions (no terminal punctuation) are trivial', () => {
  assert.equal(
    isTrivialDescription(
      'This description was cut off mid-sentence by the upstream automation and never',
      TITLE
    ),
    true
  );
  assert.equal(
    isTrivialDescription(
      'This description trails off into an explicit ellipsis marker instead of ending...',
      TITLE
    ),
    true
  );
});

test('isTrivialDescription: a complete, long, non-title sentence is NOT trivial', () => {
  assert.equal(
    isTrivialDescription(
      'A trust-boundary framework classifying autonomous AI agent attacks across six surfaces.',
      TITLE
    ),
    false
  );
  assert.equal(
    isTrivialDescription(
      'Does prompt injection generalize across model families, and if so, why?',
      TITLE
    ),
    false,
    'question mark is a valid terminal'
  );
});

test('extractDescriptionFromContent prefers the paragraph under Executive Summary', () => {
  const content = [
    '# Some Title',
    '',
    'This intro paragraph appears first but should be skipped because the executive summary below wins.',
    '',
    '## Executive Summary',
    '',
    'Researchers demonstrate that **retrieval-augmented** systems leak private context through `tool calls`, and propose a lightweight filter that blocks the exfiltration channel.',
    '',
    '## Details',
    '',
    'More body text here.',
  ].join('\n');

  assert.equal(
    extractDescriptionFromContent(content),
    'Researchers demonstrate that retrieval-augmented systems leak private context through tool calls, and propose a lightweight filter that blocks the exfiltration channel.'
  );
});

test('extractDescriptionFromContent falls back to the first substantive prose paragraph', () => {
  const content = [
    '# Heading Only',
    '',
    '![figure](img.png)',
    '',
    '- a list item that must be skipped',
    '',
    'The first real prose paragraph of the article body is long enough to serve as a description for cards and meta tags.',
    '',
    'Second paragraph.',
  ].join('\n');

  assert.equal(
    extractDescriptionFromContent(content),
    'The first real prose paragraph of the article body is long enough to serve as a description for cards and meta tags.'
  );
});

test('extractDescriptionFromContent truncates long paragraphs on a sentence boundary', () => {
  const first = 'This opening sentence is complete and comfortably long enough to stand on its own as a summary. ';
  const filler = 'It keeps going with more and more detail that will not fit the maximum length budget at all. '.repeat(5);
  const out = extractDescriptionFromContent(first + filler, 120);
  assert.ok(out.length <= 120, `expected <=120 chars, got ${out.length}`);
  assert.equal(
    out,
    'This opening sentence is complete and comfortably long enough to stand on its own as a summary.'
  );
});

test('extractDescriptionFromContent returns empty string for empty or prose-free content', () => {
  assert.equal(extractDescriptionFromContent(''), '');
  assert.equal(extractDescriptionFromContent('# Just a heading\n\n- only\n- lists'), '');
});
