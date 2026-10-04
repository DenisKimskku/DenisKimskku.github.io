// Navigation tests for /graph, the Research Atlas (SPEC §7.2, §7.5, §14.2).
//
// atlasHash.ts and atlasModel.ts are pure modules (SPEC §4.2): no React,
// sigma, graphology, next/* or @/ imports, so Node loads them directly and
// strips their types. They import siblings without an extension (the Next
// bundler resolves those), so a resolve hook maps extensionless relative
// specifiers onto the .ts file, as in tests/graph-model.test.mjs.
//
// Covered here:
//   - parseHash / serializeHash: round trips, the legacy `#p=<id>` form that
//     every shared link uses (CONTEXT §5 invariant 7), invalid ids, unknown
//     keys, and `q` never written back;
//   - historyStep: open -> push, hop -> replace, close -> back or replace,
//     r/view alone -> replace;
//   - the "Show" filter: predicates, counts on a fixture, the rule that the
//     selected paper and its listed similar papers are always drawn, and the
//     list order under each filter;
//   - the "Start with" rows and the similar-paper adjacency.
//
// CI HAS NO ATLAS DATA: public/atlas/ is gitignored and prod serves it from R2.
// The data-dependent tests resolve ATLAS_DIR (default public/atlas) and skip
// WITH a reason when the files are absent. Verify with:
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

const { parseHash, serializeHash, historyStep, isAtlasFragment } = await import('../src/app/graph/atlasHash.ts');
const {
  DEFAULT_FILTER,
  buildAdjacency,
  buildAtlas,
  isShown,
  listOrder,
  passesFilter,
  regionCount,
  startWithPapers,
  topNeighbours,
} = await import('../src/app/graph/atlasModel.ts');
const { FILTER_OPTIONS, startRowNote, tierOf } = await import('../src/app/graph/atlasCopy.ts');

const ID = '24c1a607ae9a666f';

/* --- parseHash ------------------------------------------------------------------ */

test('parseHash reads the legacy #p=<id> form every shared link uses', () => {
  assert.deepEqual(parseHash(`#p=${ID}`), { p: ID });
  assert.deepEqual(parseHash(`p=${ID}`), { p: ID }, 'the leading # is optional');
  assert.deepEqual(parseHash('#p=bb802fa094f97914'), { p: 'bb802fa094f97914' });
  assert.deepEqual(parseHash('#p=A_b-9'), { p: 'A_b-9' }, 'letters, digits, _ and - are all valid');
});

test('parseHash reads every key of the grammar', () => {
  assert.deepEqual(parseHash(`#r=jailbreak-attacks&p=${ID}`), { r: 'jailbreak-attacks', p: ID });
  assert.deepEqual(parseHash('#q=watermark'), { q: 'watermark' });
  assert.deepEqual(parseHash('#view=list'), { view: 'list' });
  assert.deepEqual(parseHash(`#view=list&p=${ID}&r=llm-reasoning&q=agents`), {
    p: ID,
    r: 'llm-reasoning',
    q: 'agents',
    view: 'list',
  });
});

test('parseHash drops invalid paper ids', () => {
  for (const bad of [
    '#p=',
    '#p=../../etc/passwd',
    '#p=a%20b',
    '#p=a+b',
    '#p=%3Cscript%3E',
    '#p=ab.cd',
    `#p=${'a'.repeat(65)}`,
  ]) {
    assert.deepEqual(parseHash(bad), {}, bad);
  }
  assert.deepEqual(parseHash(`#p=${'a'.repeat(64)}`), { p: 'a'.repeat(64) }, '64 characters is the maximum');
});

test('parseHash drops invalid region keys, views and unknown keys', () => {
  for (const bad of ['#r=Jailbreak-Attacks', '#r=-jailbreak', '#r=jailbreak-', '#r=a--b', '#r=a_b', '#r=']) {
    assert.deepEqual(parseHash(bad), {}, bad);
  }
  assert.deepEqual(parseHash('#view=map'), {}, 'only view=list is a view');
  assert.deepEqual(parseHash('#view=LIST'), {});
  assert.deepEqual(parseHash(`#x=1&p=${ID}&utm_source=mail`), { p: ID }, 'unknown keys are dropped');
  assert.deepEqual(parseHash(`#P=${ID}`), {}, 'keys are case-sensitive');
  assert.deepEqual(parseHash(''), {});
  assert.deepEqual(parseHash('#'), {});
  assert.deepEqual(parseHash('#garbage'), {});
});

test('parseHash keeps the first value of a repeated key', () => {
  assert.deepEqual(parseHash(`#p=${ID}&p=bb802fa094f97914`), { p: ID });
  assert.deepEqual(parseHash(`#p=!!&p=${ID}`), {}, 'an invalid first value is not replaced by a later one');
});

test('parseHash decodes, trims and caps the search seed', () => {
  assert.deepEqual(parseHash('#q=water%20mark'), { q: 'water mark' });
  assert.deepEqual(parseHash('#q=water+mark'), { q: 'water mark' });
  assert.deepEqual(parseHash('#q=%20%20jailbreak%20%20'), { q: 'jailbreak' });
  assert.deepEqual(parseHash('#q=%20%20'), {}, 'an empty seed is dropped');
  assert.deepEqual(parseHash('#q=%E2%80%9Cquoted%E2%80%9D'), { q: '“quoted”' });
  assert.equal(parseHash(`#q=${'x'.repeat(300)}`).q.length, 120);
  const emoji = '😀'.repeat(130);
  assert.equal(Array.from(parseHash(`#q=${encodeURIComponent(emoji)}`).q).length, 120, 'capped in code points');
});

/* --- serializeHash ---------------------------------------------------------------- */

test('serializeHash writes r, p, view in that order, and the empty state as ""', () => {
  assert.equal(serializeHash({}), '');
  assert.equal(serializeHash({ p: ID }), `#p=${ID}`);
  assert.equal(serializeHash({ view: 'list', p: ID, r: 'jailbreak-attacks' }), `#r=jailbreak-attacks&p=${ID}&view=list`);
  assert.equal(serializeHash({ r: 'watermarking' }), '#r=watermarking');
  assert.equal(serializeHash({ view: 'list' }), '#view=list');
});

test('serializeHash never writes q', () => {
  assert.equal(serializeHash({ q: 'watermark' }), '');
  assert.equal(serializeHash({ p: ID, q: 'watermark' }), `#p=${ID}`);
  assert.ok(!serializeHash({ r: 'a', p: ID, q: 'x', view: 'list' }).includes('q='));
});

test('serializeHash leaves out values that would not parse back', () => {
  assert.equal(serializeHash({ p: '../x' }), '');
  assert.equal(serializeHash({ r: 'Not A Slug', p: ID }), `#p=${ID}`);
  assert.equal(serializeHash({ view: 'map' }), '');
});

test('parseHash and serializeHash round-trip', () => {
  for (const state of [
    {},
    { p: ID },
    { r: 'jailbreak-attacks' },
    { r: 'jailbreak-attacks', p: ID },
    { view: 'list' },
    { r: 'agent-security', p: 'bb802fa094f97914', view: 'list' },
  ]) {
    assert.deepEqual(parseHash(serializeHash(state)), state, JSON.stringify(state));
  }
  // q is read but never written, so it is the one key that does not survive.
  assert.deepEqual(parseHash(serializeHash({ p: ID, q: 'watermark' })), { p: ID });
  // Canonical hashes come back unchanged, the legacy form included.
  for (const hash of [`#p=${ID}`, `#r=jailbreak-attacks&p=${ID}`, '#view=list', `#r=a&p=${ID}&view=list`]) {
    assert.equal(serializeHash(parseHash(hash)), hash);
  }
  // Anything else comes back canonical: key order fixed, junk and q dropped.
  assert.equal(serializeHash(parseHash(`#p=${ID}&r=jailbreak-attacks&x=1&q=a`)), `#r=jailbreak-attacks&p=${ID}`);
});

test('isAtlasFragment: atlas state (even empty or invalid) yes, a plain in-page anchor no', () => {
  // The empty hash is atlas state: no paper, no region, the map (Back to the bare URL closes everything).
  for (const hash of ['', '#', `#p=${ID}`, `p=${ID}`, '#r=jailbreak-attacks', '#q=watermark', '#view=list', `#r=a&p=${ID}&view=list`]) {
    assert.equal(isAtlasFragment(hash), true, hash);
  }
  // A key of the grammar with an invalid or empty value is still atlas state (it parses to nothing).
  for (const hash of ['#p=', '#p=../../etc', '#view=grid', '#x=1&p=bad id']) {
    assert.equal(isAtlasFragment(hash), true, hash);
  }
  // The sitewide skip link and any other anchor: leave the atlas state alone.
  for (const hash of ['#main-content', 'main-content', '#top', '#x=1', '#pp=1', '#paper', '#footer']) {
    assert.equal(isAtlasFragment(hash), false, hash);
  }
});

/* --- historyStep ------------------------------------------------------------------ */

test('historyStep: opening a paper when none is open pushes', () => {
  assert.equal(historyStep({}, { p: ID }, false), 'push');
  assert.equal(historyStep({ r: 'jailbreak-attacks' }, { r: 'jailbreak-attacks', p: ID }, false), 'push');
  assert.equal(historyStep({}, { p: ID }, true), 'push', 'whatever the flag says');
});

test('historyStep: moving from one paper to another replaces', () => {
  assert.equal(historyStep({ p: ID }, { p: 'bb802fa094f97914' }, true), 'replace');
  assert.equal(historyStep({ p: ID }, { p: 'bb802fa094f97914' }, false), 'replace');
  assert.equal(historyStep({ p: ID }, { p: ID }, true), 'replace', 'reopening the same paper writes nothing new');
});

test('historyStep: closing goes back after a push, and replaces after a deep-link arrival', () => {
  assert.equal(historyStep({ p: ID }, {}, true), 'back');
  assert.equal(historyStep({ p: ID }, {}, false), 'replace');
  assert.equal(historyStep({ r: 'jailbreak-attacks', p: ID }, { r: 'jailbreak-attacks' }, true), 'back');
  assert.equal(historyStep({ r: 'jailbreak-attacks', p: ID }, { r: 'jailbreak-attacks' }, false), 'replace');
});

test('historyStep: a change to r or view alone replaces', () => {
  assert.equal(historyStep({}, { r: 'jailbreak-attacks' }, false), 'replace');
  assert.equal(historyStep({ r: 'jailbreak-attacks' }, {}, true), 'replace');
  assert.equal(historyStep({}, { view: 'list' }, false), 'replace');
  assert.equal(historyStep({ view: 'list' }, {}, false), 'replace');
  assert.equal(historyStep({ p: ID }, { p: ID, r: 'watermarking' }, true), 'replace');
  assert.equal(historyStep({ p: ID, view: 'list' }, { p: ID }, true), 'replace');
  assert.equal(historyStep({}, {}, false), 'replace');
});

/* --- the "Show" filter -------------------------------------------------------------- */

function paper(id, over = {}) {
  return { id, x: 0, y: 0, c: -1, t: `Paper ${id}`, yr: 2024, v: '', s: 1, cc: 0, r: 0, a: 0, u: null, ...over };
}

// Eight papers: three with a review (one also with an abstract), two with an
// abstract only, three with neither.
const CLUSTERS = [
  { id: -1, label: 'Unclustered', label_note: null, size: 1 },
  { id: 0, label: 'Jailbreak Attacks', label_note: null, size: 4 },
  { id: 1, label: 'Watermarking', label_note: null, size: 3 },
];
const EIGHT = [
  paper('r1', { c: 0, r: 1, cc: 40 }),
  paper('r2', { c: 0, r: 1, a: 1, cc: 900 }),
  paper('r3', { c: -1, r: 1, cc: 900 }),
  paper('a1', { c: 0, a: 1, cc: 5000 }),
  paper('a2', { c: 1, a: 1, cc: 3 }),
  paper('n1', { c: 0, cc: 10000 }),
  paper('n2', { c: 1, cc: 1 }),
  paper('n3', { c: 1 }),
];
const ids = (nodes) => nodes.map((n) => n.id);

test('the default filter is the SPEC §7.2 fallback, and the options are F1-F3 in order', () => {
  // Package 4 applied the named fallback: at the overview the no-summary layer
  // formed a near-solid patch at the laptop size, so the map opens on reviews
  // and abstracts ('text'); "All papers" stays one click away.
  assert.equal(DEFAULT_FILTER, 'text');
  assert.deepEqual(
    FILTER_OPTIONS.map((o) => [o.value, o.label]),
    [
      ['all', 'All papers'],
      ['text', 'Review or abstract'],
      ['review', 'Review only'],
    ],
  );
});

test('filter predicates are cumulative', () => {
  const table = {
    all: { review: true, abstract: true, none: true },
    text: { review: true, abstract: true, none: false },
    review: { review: true, abstract: false, none: false },
  };
  for (const [filter, row] of Object.entries(table)) {
    for (const [tier, expected] of Object.entries(row)) {
      assert.equal(passesFilter(tier, filter), expected, `${tier} under ${filter}`);
    }
  }
});

test('filter counts on a fixture', () => {
  const atlas = buildAtlas(EIGHT, CLUSTERS);
  assert.deepEqual(atlas.counts, { all: 8, text: 5, review: 3, abstractOnly: 2, none: 3 });
  assert.equal(atlas.counts.text, atlas.counts.review + atlas.counts.abstractOnly);
  assert.equal(atlas.counts.all, atlas.counts.text + atlas.counts.none);
  assert.equal(atlas.reviewed, atlas.counts.review, 'one source for the review count');
  // Each option's count is exactly the papers its predicate keeps.
  for (const { value } of FILTER_OPTIONS) {
    assert.equal(atlas.counts[value], EIGHT.filter((n) => passesFilter(tierOf(n), value)).length, value);
  }
  // Per region, under each filter (Unclustered still holds its paper).
  const jailbreak = atlas.regions.get(0);
  assert.deepEqual(
    ['all', 'text', 'review'].map((f) => regionCount(jailbreak, f)),
    [4, 3, 2],
  );
  const watermarking = atlas.regions.get(1);
  assert.deepEqual(
    ['all', 'text', 'review'].map((f) => regionCount(watermarking, f)),
    [3, 1, 0],
  );
});

test('the selected paper and its listed similar papers are drawn whatever the filter', () => {
  for (const filter of ['all', 'text', 'review']) {
    for (const tier of ['review', 'abstract', 'none']) {
      assert.equal(isShown(tier, filter, true), true, `pinned ${tier} under ${filter}`);
      assert.equal(isShown(tier, filter, false), passesFilter(tier, filter), `unpinned ${tier} under ${filter}`);
    }
  }
});

test('list order under each filter: reviewed first, then most-cited, never in place', () => {
  const before = ids(EIGHT);
  assert.deepEqual(ids(listOrder(EIGHT, 'all')), ['r2', 'r3', 'r1', 'n1', 'a1', 'a2', 'n2', 'n3']);
  assert.deepEqual(ids(listOrder(EIGHT, 'text')), ['r2', 'r3', 'r1', 'a1', 'a2']);
  assert.deepEqual(ids(listOrder(EIGHT, 'review')), ['r2', 'r3', 'r1']);
  assert.deepEqual(ids(EIGHT), before, 'the payload array is never sorted in place');
});

/* --- "Start with a well-known paper" ------------------------------------------------- */

test('Start with lists the most-cited papers that have a review', () => {
  // a1 (5,000) and n1 (10,000) are cited more but have no review.
  assert.deepEqual(ids(startWithPapers(EIGHT)), ['r2', 'r3', 'r1'], 'equal counts keep the payload order');
  assert.deepEqual(ids(startWithPapers(EIGHT, 2)), ['r2', 'r3']);
  assert.deepEqual(ids(startWithPapers(EIGHT.filter((n) => n.r === 0))), [], 'no reviews, no rows');
  assert.equal(startRowNote(1366), '1,366 citations · Review', 'E2');
  assert.equal(startRowNote(1), '1 citation · Review');
});

/* --- similar papers: adjacency, never graph edges ---------------------------------- */

test('buildAdjacency lists each pair under both papers and skips self-loops', () => {
  const adjacency = buildAdjacency([
    ['a', 'b', 0.9],
    ['a', 'c', 0.5],
    ['c', 'd', 0.7],
    ['d', 'd', 1],
  ]);
  assert.deepEqual(adjacency.get('a'), [['b', 0.9], ['c', 0.5]]);
  assert.deepEqual(adjacency.get('b'), [['a', 0.9]]);
  assert.deepEqual(adjacency.get('c'), [['a', 0.5], ['d', 0.7]]);
  assert.deepEqual(adjacency.get('d'), [['c', 0.7]], 'the self-loop is skipped');
  assert.equal(buildAdjacency([]).size, 0);
});

test('topNeighbours over a built adjacency: strongest first, each paper once', () => {
  const adjacency = buildAdjacency([
    ['x', 'a', 0.2],
    ['x', 'b', 0.8],
    ['c', 'x', 0.5],
    ['x', 'b', 0.8], // a repeated pair must not list b twice
  ]);
  assert.deepEqual(topNeighbours(adjacency, 'x', 6), ['b', 'c', 'a']);
  assert.deepEqual(topNeighbours(adjacency, 'x', 1), ['b']);
  assert.deepEqual(topNeighbours(adjacency, 'x', 0), []);
  assert.deepEqual(topNeighbours(adjacency, 'b', 6), ['x']);
});

/* --- the real export (data present only) ---------------------------------------------- */

test('filter counts over the real export agree with the exporter tallies (data present)', (t) => {
  const files = ['nodes.json', 'clusters.json', 'meta.json'].map((f) => path.join(ATLAS_DIR, f));
  const missing = files.filter((f) => !fs.existsSync(f));
  if (missing.length > 0) {
    t.skip(`atlas data absent (${missing.join(', ')} not found); ${ABSENT}`);
    return;
  }
  const [nodes, clusters, meta] = files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const atlas = buildAtlas(nodes, clusters);
  assert.equal(atlas.counts.all, meta.nodes);
  assert.equal(atlas.counts.review, meta.reviews);
  assert.equal(atlas.counts.text, atlas.counts.review + atlas.counts.abstractOnly);
  assert.equal(atlas.counts.all, atlas.counts.text + atlas.counts.none);
  const starts = startWithPapers(nodes);
  assert.equal(starts.length, 3);
  assert.ok(starts.every((n) => n.r === 1), 'every Start with row has a review');
  assert.ok(starts[0].cc >= starts[1].cc && starts[1].cc >= starts[2].cc);
  t.diagnostic(
    `filter counts over ${ATLAS_DIR}: all ${atlas.counts.all}, review or abstract ${atlas.counts.text}, ` +
      `review ${atlas.counts.review} (abstract only ${atlas.counts.abstractOnly}, neither ${atlas.counts.none}); ` +
      `Start with: ${starts.map((n) => `${n.id} (${n.cc})`).join(', ')}`,
  );
});

test('the adjacency over the real edges file matches the exporter tallies (data present)', (t) => {
  const files = ['edges.json', 'meta.json'].map((f) => path.join(ATLAS_DIR, f));
  const missing = files.filter((f) => !fs.existsSync(f));
  if (missing.length > 0) {
    t.skip(`atlas data absent (${missing.join(', ')} not found); ${ABSENT}`);
    return;
  }
  const [edges, meta] = files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  assert.equal(edges.length, meta.edges);
  const started = performance.now();
  const adjacency = buildAdjacency(edges);
  const ms = Math.round(performance.now() - started);
  assert.equal(adjacency.size, meta.nodes - meta.nodes_without_edges, 'every paper with an edge has a list');
  let entries = 0;
  for (const list of adjacency.values()) entries += list.length;
  assert.equal(entries, 2 * meta.edges, 'each pair is listed under both papers');
  t.diagnostic(`buildAdjacency: ${adjacency.size} papers, ${entries} entries in ${ms} ms`);
});
