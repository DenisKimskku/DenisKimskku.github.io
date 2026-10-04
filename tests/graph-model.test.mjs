// Model tests for /graph, the Research Atlas (SPEC §4.4, §14.2).
//
// atlasModel.ts is a pure module (SPEC §4.2): no React, sigma, graphology,
// next/* or @/ imports, so Node loads it directly and strips its types. It
// imports './atlasCopy' without an extension (the Next bundler resolves it), so
// a resolve hook maps extensionless relative specifiers onto the .ts file.
//
// Later packages extend these functions (SPEC §4.1), and none of them lists
// this file, so it pins only what they must keep:
//   - buildAtlas(nodes, clusters): nodes, byId, regions (members, cx, cy),
//     reviewed, regionsWithPapers, regionsWithReview;
//   - topNeighbours(adjacency, id, k): neighbour ids, strongest first;
//   - searchPapers(atlas, query): title-prefix matches first, reviewed first
//     among them, at most 10 results.
//
// CI HAS NO ATLAS DATA: public/atlas/ is gitignored and prod serves it from R2.
// The one data-dependent test resolves ATLAS_DIR (default public/atlas) and
// skips WITH a reason when the files are absent. Verify with:
//   ATLAS_DIR=/nonexistent npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !path.extname(specifier) && context.parentURL) {
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      for (const ext of ['.ts', '.tsx', '.mjs', '.js']) {
        if (fs.existsSync(base + ext)) return nextResolve(pathToFileURL(base + ext).href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ATLAS_DIR = path.resolve(root, process.env.ATLAS_DIR || 'public/atlas');
const ABSENT = 'CI has no atlas data: public/atlas/ is gitignored and prod serves it from R2';

const { buildAtlas, topNeighbours, searchPapers } = await import('../src/app/graph/atlasModel.ts');

/** A paper with every AtlasNode field; each test overrides what it needs. */
function paper(id, over = {}) {
  return { id, x: 0, y: 0, c: -1, t: `Paper ${id}`, yr: 2024, v: '', s: 1, cc: 0, r: 0, a: 0, u: null, ...over };
}

const ids = (nodes) => nodes.map((n) => n.id);

/* --- buildAtlas -------------------------------------------------------------- */

// Six papers: three in Jailbreak Attacks (two reviewed), two unreviewed in
// Watermarking, one reviewed in the Unclustered bucket, and one named cluster
// with no papers at all.
const CLUSTERS = [
  { id: -1, label: 'Unclustered', label_note: 'Not part of any named region.', size: 1 },
  { id: 0, label: 'Jailbreak Attacks', label_note: null, size: 3 },
  { id: 1, label: 'Watermarking', label_note: 'Marks hidden in model output.', size: 2 },
  { id: 2, label: 'Empty Region', label_note: null, size: 0 },
];
const SIX = [
  paper('n1', { c: 0, x: 0, y: 0, r: 1 }),
  paper('n2', { c: 0, x: 2, y: 4 }),
  paper('n3', { c: 0, x: 4, y: 2, r: 1, a: 1 }),
  paper('n4', { c: 1, x: -1, y: 1, a: 1 }),
  paper('n5', { c: 1, x: -3, y: 3 }),
  paper('n6', { c: -1, x: 10, y: 10, r: 1 }),
];

test('buildAtlas keeps every paper, in order, and indexes it by id', () => {
  const atlas = buildAtlas(SIX, CLUSTERS);
  assert.equal(atlas.nodes, SIX, 'the input array is kept as is, never copied or reordered');
  assert.deepEqual(ids(atlas.nodes), ['n1', 'n2', 'n3', 'n4', 'n5', 'n6']);
  assert.equal(atlas.byId.size, 6);
  for (const n of SIX) assert.equal(atlas.byId.get(n.id), n);
});

test('buildAtlas counts reviews and the named regions a reader can find', () => {
  const atlas = buildAtlas(SIX, CLUSTERS);
  assert.equal(atlas.reviewed, 3, 'n1, n3 and n6 have a review, including the unclustered n6');
  // Named regions only: the Unclustered bucket (id -1) is never counted, and a
  // named cluster with no papers is not a region anyone can find.
  assert.equal(atlas.regionsWithPapers, 2, 'Jailbreak Attacks and Watermarking');
  assert.equal(atlas.regionsWithReview, 1, 'only Jailbreak Attacks has a reviewed paper');
});

test('buildAtlas groups papers into their regions and places each region at its centroid', () => {
  const atlas = buildAtlas(SIX, CLUSTERS);
  assert.equal(atlas.regions.size, 4, 'one entry per cluster, including Unclustered and the empty one');

  const jailbreak = atlas.regions.get(0);
  assert.equal(jailbreak.label, 'Jailbreak Attacks');
  assert.equal(jailbreak.note, null);
  assert.deepEqual(jailbreak.members, ['n1', 'n2', 'n3']);
  assert.equal(jailbreak.reviewed, 2);
  assert.equal(jailbreak.cx, 2, '(0 + 2 + 4) / 3');
  assert.equal(jailbreak.cy, 2, '(0 + 4 + 2) / 3');

  const watermarking = atlas.regions.get(1);
  assert.equal(watermarking.note, 'Marks hidden in model output.');
  assert.deepEqual(watermarking.members, ['n4', 'n5']);
  assert.equal(watermarking.reviewed, 0);
  assert.equal(watermarking.cx, -2);
  assert.equal(watermarking.cy, 2);

  const unclustered = atlas.regions.get(-1);
  assert.deepEqual(unclustered.members, ['n6']);
  assert.equal(unclustered.cx, 10);
  assert.equal(unclustered.cy, 10);

  const empty = atlas.regions.get(2);
  assert.deepEqual(empty.members, []);
  assert.ok(Number.isFinite(empty.cx) && Number.isFinite(empty.cy), 'an empty region never divides by zero');
});

test('buildAtlas still indexes and counts a paper whose cluster is missing from clusters.json', () => {
  const stray = paper('stray', { c: 99, r: 1 });
  const atlas = buildAtlas([...SIX, stray], CLUSTERS);
  assert.equal(atlas.byId.get('stray'), stray);
  assert.equal(atlas.reviewed, 4);
  assert.equal(atlas.regions.has(99), false);
  const placed = [...atlas.regions.values()].flatMap((r) => r.members);
  assert.equal(placed.includes('stray'), false);
});

/* --- topNeighbours ------------------------------------------------------------ */

const ADJ = new Map([
  ['a', [['b', 0.5], ['c', 0.9], ['d', 0.5], ['e', 0.7], ['f', 0.1], ['g', 0.5], ['h', 0.3]]],
  ['lonely', []],
]);

test('topNeighbours returns the k most similar papers, strongest first, equal weights in list order', () => {
  // b, d and g tie at 0.5 and keep their adjacency order: the sort is stable.
  assert.deepEqual(topNeighbours(ADJ, 'a', 6), ['c', 'e', 'b', 'd', 'g', 'h']);
  assert.deepEqual(topNeighbours(ADJ, 'a', 2), ['c', 'e']);
  assert.deepEqual(topNeighbours(ADJ, 'a', 99), ['c', 'e', 'b', 'd', 'g', 'h', 'f']);
});

test('topNeighbours is empty for an unknown paper or one with no neighbours, and never reorders its input', () => {
  assert.deepEqual(topNeighbours(ADJ, 'missing', 6), []);
  assert.deepEqual(topNeighbours(ADJ, 'lonely', 6), []);
  assert.deepEqual(topNeighbours(new Map(), 'a', 6), [], 'before the edges file lands');
  assert.deepEqual(
    ADJ.get('a').map(([id]) => id),
    ['b', 'c', 'd', 'e', 'f', 'g', 'h'],
    'the adjacency list itself is left as it was',
  );
});

/* --- searchPapers --------------------------------------------------------------- */

// Every unreviewed fixture has a=0, so "reviewed first" means the same thing
// whether ties break on the review flag (today) or on the evidence tier
// (SPEC §7.1, package 6).
const SEARCH = [
  paper('s1', { t: 'Watermarking language models', cc: 50 }),
  paper('s2', { t: 'Watermark removal attacks', r: 1, cc: 5 }),
  paper('s3', { t: 'Robust watermarking for diffusion models', r: 1, cc: 900 }),
  paper('s4', { t: 'A survey of model theft', v: 'Watermark Workshop', r: 1, cc: 1000 }),
  paper('s5', { t: 'Unrelated adversarial examples', r: 1, cc: 10 }),
  paper('s6', { t: 'WATERMARKS AT SCALE', cc: 70 }),
];

test('searchPapers ranks title-prefix matches first, reviewed first among them, then the other matches', () => {
  const atlas = buildAtlas(SEARCH, []);
  const found = ids(searchPapers(atlas, 'watermark'));
  // Prefix group: the reviewed s2 first despite its 5 citations, then the
  // unreviewed s6 (70) and s1 (50), most-cited first. Matching ignores case.
  assert.deepEqual(found.slice(0, 3), ['s2', 's6', 's1']);
  // Then the title-substring match s3 and the venue match s4, in either order;
  // s5 does not match at all.
  assert.deepEqual(found.slice(3).sort(), ['s3', 's4']);
});

test('searchPapers needs two characters and ignores surrounding space and case', () => {
  const atlas = buildAtlas(SEARCH, []);
  assert.deepEqual(searchPapers(atlas, ''), []);
  assert.deepEqual(searchPapers(atlas, 'w'), []);
  assert.deepEqual(searchPapers(atlas, '   '), []);
  assert.deepEqual(ids(searchPapers(atlas, '  WATERMARK  ')), ids(searchPapers(atlas, 'watermark')));
  assert.deepEqual(searchPapers(atlas, 'zzqqxx'), []);
});

test('searchPapers returns at most 10 results', () => {
  // Fifteen prefix matches, most-cited first in the array.
  const many = Array.from({ length: 15 }, (_, i) => paper(`m${i}`, { t: `Jailbreak study ${i}`, cc: 100 - i }));
  const top = ids(searchPapers(buildAtlas(many, []), 'jailbreak'));
  assert.deepEqual(top, ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9']);

  // Three prefix matches and twelve substring matches: still 10, prefixes first.
  const mixed = [
    ...Array.from({ length: 12 }, (_, i) => paper(`c${i}`, { t: `Notes on jailbreak defences ${i}`, cc: 500 })),
    paper('p0', { t: 'Jailbreak prompts', cc: 1 }),
    paper('p1', { t: 'Jailbreaking agents', cc: 2 }),
    paper('p2', { t: 'Jailbreak benchmarks', cc: 3 }),
  ];
  const found = ids(searchPapers(buildAtlas(mixed, []), 'jailbreak'));
  assert.equal(found.length, 10);
  assert.deepEqual(found.slice(0, 3).sort(), ['p0', 'p1', 'p2']);
  assert.ok(found.slice(3).every((id) => id.startsWith('c')));
});

test('searchPapers never reorders the atlas itself', () => {
  const atlas = buildAtlas([...SEARCH], []);
  const before = ids(atlas.nodes);
  searchPapers(atlas, 'watermark');
  assert.deepEqual(ids(atlas.nodes), before);
});

/* --- the real export (data present only) ------------------------------------------ */

test('buildAtlas over the real export agrees with the exporter tallies (data present)', (t) => {
  const files = ['nodes.json', 'clusters.json', 'meta.json'].map((f) => path.join(ATLAS_DIR, f));
  const missing = files.filter((f) => !fs.existsSync(f));
  if (missing.length > 0) {
    t.skip(`atlas data absent (${missing.join(', ')} not found); ${ABSENT}`);
    return;
  }
  const [nodes, clusters, meta] = files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const atlas = buildAtlas(nodes, clusters);

  assert.equal(atlas.nodes.length, meta.nodes);
  assert.equal(atlas.byId.size, meta.nodes, 'paper ids are unique');
  assert.equal(atlas.reviewed, meta.reviews);
  assert.equal(atlas.regions.size, meta.clusters);
  // Membership is computed from each paper's cluster id; the exporter tallied
  // each cluster's size independently.
  for (const cluster of clusters) {
    assert.equal(atlas.regions.get(cluster.id).members.length, cluster.size, `${cluster.id} ${cluster.label}`);
  }
  assert.equal(atlas.regions.get(-1).members.length, meta.nodes_unclustered);
  const placed = [...atlas.regions.values()].reduce((n, r) => n + r.members.length, 0);
  assert.equal(placed, meta.nodes, 'every paper sits in exactly one region or in Unclustered');
  assert.equal(
    atlas.regionsWithPapers,
    clusters.filter((c) => c.id >= 0 && c.size > 0).length,
    'named regions with at least one paper',
  );
  assert.ok(
    atlas.regionsWithReview > 0 && atlas.regionsWithReview <= atlas.regionsWithPapers,
    `regionsWithReview ${atlas.regionsWithReview} out of range`,
  );
  t.diagnostic(
    `buildAtlas over ${meta.nodes} papers (${ATLAS_DIR}): ${atlas.reviewed} with a review; ` +
      `${atlas.regionsWithPapers} named regions with papers, ${atlas.regionsWithReview} with a review`,
  );
});
