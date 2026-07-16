// Venue formatting exercised against the REAL `conference` strings currently
// in src/data/papers.json (read dynamically so the tests track the data).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatVenue, formatVenueShort } from '../src/lib/venues.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const papers = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'papers.json'), 'utf8'));
const venues = papers.map((p) => p.conference);

// NOTE: deliberately NO assertion that specific venue strings exist in
// papers.json — deploy.yml runs this suite on every push to main (including
// the daily automation's), and content edits must never block a deploy. The
// formatter tests below use literal fixture strings; the only papers.json
// coupling is the content-independent "formats to non-empty" sweep.

test('formatVenue tightens the KIISC journal long-form and normalizes Vol/No', () => {
  assert.equal(
    formatVenue('Journal of The Korea Institute of Information Security & Cryptology Vol 35. No. 6'),
    'J. Korea Inst. Inf. Security & Cryptology, Vol. 35, No. 6'
  );
});

test('formatVenueShort abbreviates the KIISC journal to J. KIISC', () => {
  assert.equal(
    formatVenueShort('Journal of The Korea Institute of Information Security & Cryptology Vol 35. No. 6'),
    'J. KIISC, Vol. 35, No. 6'
  );
});

test('Review of KIISC drops the Korean parenthetical in both forms', () => {
  assert.equal(
    formatVenue('Review of KIISC (정보보호학회지) Vol. 36, No. 2'),
    'Review of KIISC, Vol. 36, No. 2'
  );
  assert.equal(
    formatVenueShort('Review of KIISC (정보보호학회지) Vol. 36, No. 2'),
    'Review of KIISC, Vol. 36, No. 2'
  );
});

test('short conference venues pass through unchanged', () => {
  for (const venue of ['KCC 2026', "FSE'26", "ACSAC'25", "CISC-W'25", "CISC-S'25", "CISC-W'24"]) {
    assert.equal(formatVenue(venue), venue);
    assert.equal(formatVenueShort(venue), venue);
  }
});

test('every real venue in papers.json formats to a non-empty string', () => {
  for (const venue of venues) {
    assert.ok(formatVenue(venue).length > 0, `formatVenue empty for ${venue}`);
    assert.ok(formatVenueShort(venue).length > 0, `formatVenueShort empty for ${venue}`);
  }
});
