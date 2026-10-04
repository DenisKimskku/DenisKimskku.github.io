// Reading tests for /graph, the Research Atlas (SPEC §7.1, §7.9, §9.4, §9.5,
// §10, §14.2): the paper link's label, the list's filter, region and sort,
// search on display titles, the "/" shortcut, abstract text cleanup, hash
// merging and the list and search copy.
//
// The modules under test are pure (SPEC §4.2): no React, sigma, graphology,
// next/* or @/ imports, so Node loads them directly and strips their types.
// They import siblings without an extension (the Next bundler resolves
// those), so a resolve hook maps extensionless relative specifiers onto the
// .ts file, as in tests/graph-model.test.mjs.
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

const {
  linkLabel,
  landingUrl,
  listStatus,
  listMoreLabel,
  optionWithCount,
  searchPlaceholder,
  noMatchNote,
  searchAnnouncement,
  regionPapersLine,
  citationsText,
  LIST_SORT_OPTIONS,
  VIEW_OPTIONS,
} = await import('../src/app/graph/atlasCopy.ts');
const { DEFAULT_FILTER, buildAtlas, defaultFilterFor, listPapers, rowMeta, searchPapers, SEARCH_LIMIT, titleOf } =
  await import('../src/app/graph/atlasModel.ts');
const { displayText } = await import('../src/app/graph/atlasText.ts');
const { withHash, serializeHash } = await import('../src/app/graph/atlasHash.ts');
const { shouldFocusSearch } = await import('../src/app/graph/mapKeys.ts');

/** A paper with every AtlasNode field; each test overrides what it needs. */
function paper(id, over = {}) {
  return { id, x: 0, y: 0, c: -1, t: `Paper ${id}`, yr: 2024, v: '', s: 1, cc: 0, r: 0, a: 0, u: null, ...over };
}
const ids = (nodes) => nodes.map((n) => n.id);

/* --- linkLabel (P7) ------------------------------------------------------------- */

test('linkLabel names arXiv, DOI and any other host', () => {
  assert.equal(linkLabel('https://arxiv.org/abs/2310.08419'), 'Open on arXiv');
  assert.equal(linkLabel('https://www.arxiv.org/abs/2310.08419'), 'Open on arXiv', 'a www. prefix is dropped');
  assert.equal(linkLabel('https://doi.org/10.1145/3576915.3623093'), 'Open via DOI');
  assert.equal(linkLabel('http://dx.doi.org/10.1109/SP.2017.41'), 'Open via DOI');
  assert.equal(linkLabel('https://dl.acm.org/doi/10.1145/3658644.3670388'), 'Open on dl.acm.org');
  assert.equal(linkLabel('https://www.sciencedirect.com/science/article/pii/S0167404824'), 'Open on sciencedirect.com');
  assert.equal(linkLabel('https://proceedings.mlr.press/v235/x.html'), 'Open on proceedings.mlr.press');
  assert.equal(linkLabel('https://ARXIV.ORG/abs/1'), 'Open on arXiv', 'hosts are compared in lower case');
});

test('linkLabel gives null when there is no host to name, so the panel shows P8', () => {
  for (const bad of [null, undefined, '', 'https://', 'not a url', '//arxiv.org/abs/1']) {
    assert.equal(linkLabel(bad), null, String(bad));
  }
});

test('linkLabel only ever sees landingUrl output: a raw file gets no label at all', () => {
  assert.equal(landingUrl('https://arxiv.org/pdf/2310.08419'), null);
  assert.equal(linkLabel(landingUrl('https://arxiv.org/pdf/2310.08419')), null);
  const rescued = landingUrl(
    'https://api.taylorfrancis.com/content/chapters/edit/download?identifierName=doi&identifierValue=10.1201%2F9781003743774-70&type=chapterpdf'
  );
  assert.equal(linkLabel(rescued), 'Open via DOI', 'a download URL rescued to its DOI opens via DOI');
});

/* --- the list: filter, region and sort (SPEC §10) --------------------------------- */

const CLUSTERS = [
  { id: -1, label: 'Unclustered', label_note: null, size: 1 },
  { id: 0, label: 'Watermarking I', label_note: null, size: 3 },
  { id: 1, label: 'Watermarking II', label_note: null, size: 1 },
  { id: 2, label: 'Jailbreak Attacks', label_note: null, size: 3 },
];
// Payload order is the tie-breaker everywhere, so it is deliberate here.
const LIST = [
  paper('n1', { c: 0, cc: 900, yr: 2021 }), // no summary, most cited
  paper('a1', { c: 0, a: 1, cc: 50, yr: null }), // abstract, no year
  paper('r1', { c: 2, r: 1, cc: 10, yr: 2023 }), // review
  paper('r2', { c: 2, r: 1, a: 1, cc: 300, yr: 2025 }), // review (with an abstract)
  paper('a2', { c: 1, a: 1, cc: 50, yr: 2025 }), // abstract, ties a1 on citations
  paper('n2', { c: -1, cc: 0, yr: 2025 }), // no summary, no region
  paper('n3', { c: 2, cc: 0, yr: null }), // no summary, no year
];

test('listPapers keeps the tiers each Show option keeps', () => {
  const atlas = buildAtlas(LIST, CLUSTERS);
  const of = (filter) => ids(listPapers(atlas, { filter, regionKey: null, sort: 'reviews' })).sort();
  assert.deepEqual(of('all'), ['a1', 'a2', 'n1', 'n2', 'n3', 'r1', 'r2']);
  assert.deepEqual(of('text'), ['a1', 'a2', 'r1', 'r2']);
  assert.deepEqual(of('review'), ['r1', 'r2']);
});

test('listPapers narrows to a display region (its merged clusters), and an unknown key narrows nothing', () => {
  const atlas = buildAtlas(LIST, CLUSTERS);
  const of = (regionKey, filter = 'all') => ids(listPapers(atlas, { filter, regionKey, sort: 'reviews' })).sort();
  // "Watermarking I" and "II" are one display region (SPEC §4.4).
  assert.deepEqual(of('watermarking'), ['a1', 'a2', 'n1']);
  assert.deepEqual(of('watermarking', 'text'), ['a1', 'a2']);
  assert.deepEqual(of('watermarking', 'review'), [], 'a region can hold nothing the filter keeps (LS6)');
  assert.deepEqual(of('jailbreak-attacks'), ['n3', 'r1', 'r2']);
  assert.deepEqual(of('no-such-region'), of(null));
});

test('Reviews first: review, then abstract, then no summary; most-cited first within each; ties in payload order', () => {
  const atlas = buildAtlas(LIST, CLUSTERS);
  const rows = ids(listPapers(atlas, { filter: 'all', regionKey: null, sort: 'reviews' }));
  // An abstract outranks a far more cited no-summary paper; a1 and a2 tie on
  // citations and keep their payload order.
  assert.deepEqual(rows, ['r2', 'r1', 'a1', 'a2', 'n1', 'n2', 'n3']);
});

test('Most cited ignores the tier; Newest puts papers with no year last, then the most cited', () => {
  const atlas = buildAtlas(LIST, CLUSTERS);
  assert.deepEqual(ids(listPapers(atlas, { filter: 'all', regionKey: null, sort: 'cited' })), [
    'n1',
    'r2',
    'a1',
    'a2',
    'r1',
    'n2',
    'n3',
  ]);
  assert.deepEqual(ids(listPapers(atlas, { filter: 'all', regionKey: null, sort: 'newest' })), [
    'r2', // 2025, 300 citations
    'a2', // 2025, 50
    'n2', // 2025, 0
    'r1', // 2023
    'n1', // 2021
    'a1', // no year, 50 citations
    'n3', // no year, 0
  ]);
});

test('listPapers never reorders the atlas, and the sort options are LS3 in order', () => {
  const atlas = buildAtlas([...LIST], CLUSTERS);
  const before = ids(atlas.nodes);
  for (const { value } of LIST_SORT_OPTIONS) listPapers(atlas, { filter: 'all', regionKey: null, sort: value });
  assert.deepEqual(ids(atlas.nodes), before);
  assert.deepEqual(
    LIST_SORT_OPTIONS.map((o) => [o.value, o.label]),
    [
      ['reviews', 'Reviews first'],
      ['cited', 'Most cited'],
      ['newest', 'Newest'],
    ]
  );
  assert.deepEqual(
    VIEW_OPTIONS.map((o) => [o.value, o.label]),
    [
      ['map', 'Map'],
      ['list', 'List'],
    ]
  );
});

test('a list-only layout opens on All papers; a screen that can draw the map keeps the map default in both views', () => {
  assert.equal(defaultFilterFor(true), 'all');
  assert.equal(defaultFilterFor(false), DEFAULT_FILTER);
});

test('rowMeta is LS10: year, venue and citations, empty parts and zero citations left out', () => {
  assert.equal(rowMeta(paper('m1', { yr: 2025, v: '… IEEE Conference on …', cc: 1366 })), '2025 · IEEE Conference on … · 1,366 citations');
  assert.equal(rowMeta(paper('m2', { yr: 2024, v: 'arXiv', cc: 1 })), '2024 · arXiv · 1 citation');
  assert.equal(rowMeta(paper('m3', { yr: 2024, v: '', cc: 0 })), '2024');
  assert.equal(rowMeta(paper('m4', { yr: null, v: 'Proceedings of the …', cc: 12 })), '12 citations', 'a venue fragment is omitted');
  assert.equal(rowMeta(paper('m5', { yr: null, v: '', cc: 0 })), '');
});

/* --- search on display titles (SPEC §7.1) ------------------------------------------ */

const SEARCH = [
  paper('dan', { t: '&quot;Do Anything Now&quot;: Characterizing In-The-Wild Jailbreak Prompts', a: 1 }),
  paper('mml', {
    t: '<mml:math xmlns:mml="http://www.w3.org/1998/Math/MathML"> <mml:msup> <mml:mrow> <mml:mi mathvariant="normal">D</mml:mi> </mml:mrow> <mml:mrow> <mml:mn>2</mml:mn> </mml:mrow> </mml:msup> </mml:math> Fusion: Dual-domain fusion for Deepfake detection',
    r: 1,
  }),
  paper('amp', { t: 'R&amp;D pipelines for model security', cc: 3 }),
  paper('pre', { t: 'Mark my words: provenance for generated text', cc: 1 }),
  paper('word', { t: 'A benchmark of marks in image models', cc: 5 }),
  paper('sub', { t: 'Watermark removal attacks', r: 1, cc: 900 }),
  paper('ven', { t: 'Provenance in practice', v: 'Workshop on Marking Content', cc: 2000 }),
  paper('none', { t: 'Marking schemes compared', cc: 400 }),
  paper('abs', { t: 'Marking tokens for detection', a: 1, cc: 3 }),
];

test('searchPapers matches display titles: decoded entities and removed markup', () => {
  const atlas = buildAtlas(SEARCH, []);
  // The raw title holds &quot;, so only the display title contains the quoted phrase.
  assert.ok(!SEARCH[0].t.toLowerCase().includes('"do anything now"'));
  assert.equal(titleOf(atlas, SEARCH[0]).startsWith('"Do Anything Now"'), true);
  assert.deepEqual(ids(searchPapers(atlas, '"do anything now"')), ['dan']);
  assert.deepEqual(ids(searchPapers(atlas, 'do anything now')), ['dan'], 'a later word start after the quote');
  // The MathML title starts "D2 Fusion" once its markup is gone.
  assert.ok(!SEARCH[1].t.toLowerCase().includes('d2 fusion'));
  assert.deepEqual(ids(searchPapers(atlas, 'd2 fusion')), ['mml']);
  assert.deepEqual(ids(searchPapers(atlas, 'r&d')), ['amp']);
  assert.deepEqual(ids(searchPapers(atlas, 'mathml')), [], 'markup is never searched');
});

test('searchPapers ranks a title prefix, then a later word start, then any other match (title or venue)', () => {
  const atlas = buildAtlas(SEARCH, []);
  const found = ids(searchPapers(atlas, 'mark'));
  // Prefix group: "Mark my words", "Marking schemes", "Marking tokens"; within
  // it the abstract (rank 1) beats the more cited no-summary papers (rank 0).
  assert.deepEqual(found.slice(0, 3), ['abs', 'none', 'pre']);
  // Word start: "A benchmark of marks" ("mark" inside "benchmark" does not count, "marks" does).
  assert.equal(found[3], 'word');
  // Anywhere else: inside a word ("Watermark"), or in the venue ("Marking").
  assert.deepEqual(found.slice(4).sort(), ['sub', 'ven']);
  assert.equal(found[4], 'sub', 'a review outranks a more cited no-summary paper within a group');
});

test('searchPapers: at most 10, two characters minimum, whitespace collapsed, case ignored', () => {
  const many = Array.from({ length: 14 }, (_, i) => paper(`m${i}`, { t: `Jailbreak study ${i}`, cc: i }));
  const top = ids(searchPapers(buildAtlas(many, []), 'jailbreak'));
  assert.equal(top.length, SEARCH_LIMIT);
  assert.deepEqual(top.slice(0, 3), ['m13', 'm12', 'm11'], 'the most cited first, from the whole corpus');
  const atlas = buildAtlas(SEARCH, []);
  assert.deepEqual(searchPapers(atlas, 'm'), []);
  assert.deepEqual(searchPapers(atlas, '  '), []);
  assert.deepEqual(ids(searchPapers(atlas, '  DO   ANYTHING  ')), ['dan']);
});

/* --- the "/" shortcut (SPEC §7.1, §12.14) ------------------------------------------- */

test('shouldFocusSearch: "/" outside a field focuses the search', () => {
  assert.equal(shouldFocusSearch({ key: '/', target: { tagName: 'BODY' } }, false), true);
  assert.equal(shouldFocusSearch({ key: '/', target: { tagName: 'BUTTON' } }, false), true);
  assert.equal(shouldFocusSearch({ key: '/', target: null }, false), true);
  assert.equal(shouldFocusSearch({ key: '/', shiftKey: true, target: { tagName: 'DIV' } }, false), true, 'Shift types "/" on some layouts');
});

test('shouldFocusSearch: never when shortcuts are off, a modifier is held, or the reader is typing', () => {
  assert.equal(shouldFocusSearch({ key: '/', target: { tagName: 'BODY' } }, true), false, 'sitewide shortcuts-disabled');
  for (const mod of ['ctrlKey', 'metaKey', 'altKey']) {
    assert.equal(shouldFocusSearch({ key: '/', [mod]: true, target: { tagName: 'BODY' } }, false), false, mod);
  }
  for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT', 'input', 'select']) {
    assert.equal(shouldFocusSearch({ key: '/', target: { tagName } }, false), false, tagName);
  }
  assert.equal(shouldFocusSearch({ key: '/', target: { tagName: 'DIV', isContentEditable: true } }, false), false);
  assert.equal(shouldFocusSearch({ key: '?', target: { tagName: 'BODY' } }, false), false);
  assert.equal(shouldFocusSearch({ key: 'k', target: { tagName: 'BODY' } }, false), false);
});

/* --- abstract text (SPEC §9.5) ------------------------------------------------------- */

test('displayText removes the publisher markup abstracts carry and keeps paragraphs', () => {
  assert.equal(displayText('<p dir="ltr">Interest in AI is widespread.'), 'Interest in AI is widespread.');
  assert.equal(displayText('<ns3:p>First.</ns3:p><ns3:p>Second.</ns3:p>'), 'First.\n\nSecond.');
  assert.equal(displayText('One<br>two<br/>three'), 'One\ntwo\nthree');
  assert.equal(displayText('in the <u>Internet of Things</u> (IoT), the<u> Android</u> system'), 'in the Internet of Things (IoT), the Android system');
  // Pairs are loose in the records; each tag is removed on its own.
  assert.equal(displayText('an <italic>attack</i> on <sc>LLMs</small> and <bold>agents</b>'), 'an attack on LLMs and agents');
  assert.equal(displayText('x <inline-formula><tex-math notation="LaTeX">$\\epsilon$</tex-math></inline-formula> y'), 'x $\\epsilon$ y');
  assert.equal(displayText('E = mc<sup>2</sup> &amp; more &lt;stuff&gt;'), 'E = mc2 & more <stuff>');
  assert.equal(displayText('  spaced \t out \r\n\n\n\n lines  '), 'spaced out\n\nlines');
  assert.equal(displayText(null), '');
});

test('displayText keeps markup an abstract quotes as text: those are the authors’ words', () => {
  const quoted =
    'the choice is between full privilege (<script>) and isolation (<iframe>), with nearly all use cases requiring the former.';
  assert.equal(displayText(quoted), quoted);
  assert.equal(displayText('<1% Leaked and a <custom-tag> survive'), '<1% Leaked and a <custom-tag> survive');
  // Entity-encoded markup: a decoded pair of a known tag is the record's markup
  // (one abstract is wrapped in &lt;span&gt;…&lt;/span&gt;); a lone decoded
  // tag, or a pair of an unknown one, is the authors' text.
  assert.equal(displayText('&lt;span&gt;The whole abstract.&lt;/span&gt;'), 'The whole abstract.');
  assert.equal(displayText('&lt;p&gt;One.&lt;/p&gt;&lt;p&gt;Two.&lt;/p&gt;'), 'One.\n\nTwo.');
  assert.equal(displayText('styling the &lt;b&gt; element'), 'styling the <b> element');
  assert.equal(displayText('payload &lt;script&gt;alert(1)&lt;/script&gt; runs'), 'payload <script>alert(1)</script> runs');
});

/* --- the hash: every write keeps what it is not about (SPEC §7.5) ------------------------ */

test('withHash applies a patch and keeps the other keys', () => {
  const list = { view: 'list' };
  assert.deepEqual(withHash(list, { p: 'abc' }), { p: 'abc', view: 'list' });
  assert.deepEqual(withHash({ r: 'watermarking', p: 'abc', view: 'list' }, { p: null }), { r: 'watermarking', view: 'list' });
  assert.deepEqual(withHash({ r: 'watermarking', p: 'abc' }, { r: null, p: null }), {});
  assert.deepEqual(withHash({ p: 'abc' }, { view: 'list' }), { p: 'abc', view: 'list' });
  assert.deepEqual(withHash({ p: 'abc', view: 'list' }, { view: null }), { p: 'abc' });
  assert.deepEqual(withHash({ q: 'watermark', p: 'abc' }, {}), { p: 'abc' }, 'the search seed is never carried');
  assert.equal(serializeHash(withHash({ view: 'list' }, { r: 'jailbreak-attacks', p: '24c1a607ae9a666f' })), '#r=jailbreak-attacks&p=24c1a607ae9a666f&view=list');
});

/* --- list and search copy (SPEC §11.2, §11.5, §11.6) --------------------------------------- */

test('the list and search copy follows the deck', () => {
  assert.equal(listStatus(40, 35903), 'Showing 40 of 35,903 papers');
  assert.equal(listStatus(40, 902, 'Jailbreak Attacks'), 'Showing 40 of 902 papers in Jailbreak Attacks');
  assert.equal(listStatus(1, 1, 'Watermarking'), 'Showing 1 of 1 paper in Watermarking');
  assert.equal(listMoreLabel(35863, 40), 'Show 40 more (35,863 left)');
  assert.equal(listMoreLabel(41, 40), 'Show 40 more (41 left)');
  assert.equal(listMoreLabel(40, 40), 'Show the last 40');
  assert.equal(listMoreLabel(3, 40), 'Show the last 3');
  assert.equal(optionWithCount('All papers', 35903), 'All papers (35,903)');
  assert.equal(searchPlaceholder(35903), 'Search 35,903 papers by title or venue');
  assert.equal(searchPlaceholder(null), 'Search papers by title or venue');
  assert.equal(noMatchNote('zzqqxx'), 'No titles or venues match “zzqqxx”.');
  assert.equal(searchAnnouncement(10), '10 results. Use the up and down arrows to choose, then Enter to open.');
  assert.equal(searchAnnouncement(1), '1 result. Press Enter to open.');
  assert.equal(searchAnnouncement(0), 'No matching papers.');
  assert.equal(regionPapersLine(902, 298), '902 papers in this region · 298 with a review');
  assert.equal(citationsText(1), '1 citation');
  assert.equal(citationsText(1366), '1,366 citations');
});

/* --- the real export (data present only) ---------------------------------------------------- */

function readAtlas(t) {
  const files = ['nodes.json', 'clusters.json'].map((f) => path.join(ATLAS_DIR, f));
  const missing = files.filter((f) => !fs.existsSync(f));
  if (missing.length > 0) {
    t.skip(`atlas data absent (${missing.join(', ')} not found); ${ABSENT}`);
    return null;
  }
  const [nodes, clusters] = files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  return { nodes, clusters, atlas: buildAtlas(nodes, clusters) };
}

test('search, links and the list over the real export (data present)', (t) => {
  const data = readAtlas(t);
  if (!data) return;
  const { nodes, atlas } = data;

  const watermark = searchPapers(atlas, 'watermark');
  assert.ok(watermark.length > 0 && watermark.length <= SEARCH_LIMIT);
  for (const n of watermark) {
    assert.ok(`${titleOf(atlas, n)} ${n.v}`.toLowerCase().includes('watermark'), n.id);
  }
  const entityTitles = nodes.filter((n) => /&quot;do anything now&quot;/i.test(n.t));
  if (entityTitles.length > 0) {
    const found = ids(searchPapers(atlas, '"do anything now"'));
    for (const n of entityTitles) assert.ok(found.includes(n.id), `${n.id} found by its display title`);
  }

  let labelled = 0;
  const kinds = { arxiv: 0, doi: 0, host: 0 };
  for (const n of nodes) {
    const link = landingUrl(n.u);
    if (!link) continue;
    const label = linkLabel(link);
    assert.ok(label && label.startsWith('Open '), `${n.id}: ${link}`);
    labelled += 1;
    if (label === 'Open on arXiv') kinds.arxiv += 1;
    else if (label === 'Open via DOI') kinds.doi += 1;
    else kinds.host += 1;
  }
  t.diagnostic(`linkLabel over ${labelled} landing pages: ${kinds.arxiv} arXiv, ${kinds.doi} DOI, ${kinds.host} other hosts`);

  const all = listPapers(atlas, { filter: 'all', regionKey: null, sort: 'reviews' });
  assert.equal(all.length, nodes.length);
  assert.ok(all.slice(0, atlas.counts.review).every((n) => n.r === 1), 'reviews first');
  assert.equal(listPapers(atlas, { filter: 'text', regionKey: null, sort: 'cited' }).length, atlas.counts.text);
  const newest = listPapers(atlas, { filter: 'all', regionKey: null, sort: 'newest' });
  const firstUndated = newest.findIndex((n) => n.yr == null);
  assert.ok(firstUndated === -1 || newest.slice(firstUndated).every((n) => n.yr == null), 'no year last');
  const region = atlas.displayRegions.get('jailbreak-attacks');
  if (region) {
    assert.equal(listPapers(atlas, { filter: 'all', regionKey: region.key, sort: 'reviews' }).length, region.counts.all);
  }
  t.diagnostic(`list over ${nodes.length} papers: ${atlas.counts.text} with a review or abstract, ${atlas.counts.review} reviews first`);
});

test('displayText over every abstract leaves no known markup and keeps quoted markup (data present)', (t) => {
  const dir = path.join(ATLAS_DIR, 'abstracts');
  if (!fs.existsSync(dir)) {
    t.skip(`atlas data absent (${dir} not found); ${ABSENT}`);
    return;
  }
  const KNOWN = /<\/?(?:p|br|div|h[1-6]|[a-z][\w.-]*:p|i|b|u|em|strong|sup|sub|sc|small|italic|bold|span|a|uri|tex|tex-math|inline-formula|mml:[\w.-]+)(?:\s[^<>]*)?\/?>/i;
  let total = 0;
  let changed = 0;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const shard = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    for (const [id, entry] of Object.entries(shard)) {
      const raw = typeof entry?.abstract === 'string' ? entry.abstract : '';
      if (!raw) continue;
      total += 1;
      const shown = displayText(raw);
      if (shown !== raw.trim()) changed += 1;
      assert.ok(!KNOWN.test(shown), `${id} keeps markup: ${shown.slice(0, 80)}`);
      assert.ok(shown.length > 0, `${id} lost all its text`);
      if (/\(<script>\)/.test(raw)) assert.ok(shown.includes('(<script>)'), `${id} keeps its quoted <script>`);
    }
  }
  assert.ok(total > 0);
  t.diagnostic(`displayText over ${total} abstracts: ${changed} tidied, none left with publisher markup`);
});
