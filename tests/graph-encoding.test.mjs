// Encoding tests for /graph, the Research Atlas (SPEC §6.3–§6.5, §9.4, §14.2).
//
// atlasPalette.ts, atlasText.ts and atlasModel.ts are pure modules (SPEC §4.2):
// no React, sigma, graphology, next/* or @/ imports, so Node loads them
// directly and strips their types. They import siblings without an extension
// (the Next bundler resolves those), so a resolve hook maps extensionless
// relative specifiers onto the .ts file, as in tests/graph-model.test.mjs.
//
// Covered here:
//   - areaOf on every region name in the SPEC §6.3 table, roman-numeral splits,
//     near misses, and the grey fallback;
//   - the colour tables against the SPEC §6.4 hexes, and tint and dim against
//     mix(); the DOM swatch classes against the tables;
//   - node size and draw order (§6.5) and the tooltip's second line (TT1);
//   - displayTitle (MathML, entities, `less</> Trust`, "<1% Leaked"),
//     displayVenue (the §9.4 examples) and ellipsize with a fake measure;
//   - with the atlas data present: at least 95% of reviewed papers sit in a
//     coloured area, and no display title keeps tag markup.
//
// CI HAS NO ATLAS DATA: public/atlas/ is gitignored and prod serves it from R2.
// The data-dependent test resolves ATLAS_DIR (default public/atlas) and skips
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
  AREA_COLOURS_ON,
  AREA_IDS,
  AREA_NAME,
  AREA_SWATCH,
  AREA_TINT_SWATCH,
  CANVAS,
  DIM_MIX,
  EGO_LINE,
  NONE,
  NONE_SWATCH,
  PAL,
  STRONG,
  TINT_MIX,
  areaOf,
  mix,
  paintArea,
} = await import('../src/app/graph/atlasPalette.ts');
const { displayTitle, displayVenue, ellipsize } = await import('../src/app/graph/atlasText.ts');
const { TIER_RANK, buildAtlas, nodeSize, titleOf, tooltipMeta } = await import('../src/app/graph/atlasModel.ts');

/* --- research areas (SPEC §6.3) ------------------------------------------------- */

const AREA_TABLE = {
  llm: [
    'Jailbreak Attacks', 'Safety Alignment', 'Reward Modeling', 'Hallucination Detection', 'LLM Security Surveys',
    'LLM-as-Judge', 'Mechanistic Interpretability', 'LLM Reasoning', 'Agent Security', 'Prompt Injection',
    'RAG Security', 'Retrieval-Augmented Generation', 'LLM Multi-Agent Systems',
  ],
  model: [
    'Data Poisoning', 'FL Poisoning Defense', 'Adversarial Examples', 'Adversarial ML', 'Vision-Language Attacks',
    'Vision-Language Models', 'GNN Security', 'Autonomous Vehicle Security', 'Model Extraction',
    'ML Side-Channel Attacks', 'Membership Inference', 'Model Inversion Attacks', 'Differential Privacy',
    'LLM Data Privacy', 'Federated Learning Privacy', 'GNN Privacy', 'Machine Unlearning', 'LLM Unlearning',
    'AI Privacy Governance', 'Blockchain FL Privacy', 'Blockchain Federated Learning', 'Watermarking',
    'Deepfake Detection', 'Audio Deepfakes', 'Synthetic Image Detection', 'Diffusion Image Forensics',
    'LLM Text Detection', 'GAN Image Inpainting',
  ],
  defence: [
    'LLM Vulnerability Detection', 'DL Vulnerability Detection', 'Malware Detection', 'IoT Intrusion Detection',
    'FL Intrusion Detection', 'AI Cyber Defense', 'Phishing Detection', 'Network Traffic Analysis',
    'Smart Contract Security', 'Time-Series Anomaly Detection', 'SDN DDoS Defense',
  ],
};

test('areaOf puts every region named in the SPEC §6.3 table in its area', () => {
  assert.deepEqual(AREA_IDS, ['llm', 'model', 'defence', 'other']);
  for (const [area, labels] of Object.entries(AREA_TABLE)) {
    for (const label of labels) assert.equal(areaOf(label), area, label);
  }
  assert.equal(Object.values(AREA_TABLE).flat().length, 13 + 28 + 11);
});

test('areaOf follows roman-numeral splits and falls back to grey for anything else', () => {
  assert.equal(areaOf('Jailbreak Attacks III'), 'llm');
  assert.equal(areaOf('Safety Alignment II'), 'llm');
  assert.equal(areaOf('Watermarking I'), 'model');
  assert.equal(areaOf('Data Poisoning III'), 'model');
  assert.equal(areaOf('Agent Security I'), 'llm');
  // Near misses stay grey: names are anchored and whole-word.
  assert.equal(areaOf('LLM Surveys'), 'other');
  assert.equal(areaOf('Robust Watermarking'), 'other', 'anchored at the start');
  assert.equal(areaOf('Watermarkings'), 'other', 'whole words only');
  assert.equal(areaOf('jailbreak attacks'), 'other', 'labels are matched as written');
  assert.equal(areaOf('Applied Cryptography'), 'other');
  assert.equal(areaOf('Unclustered'), 'other');
  assert.equal(areaOf(''), 'other');
});

test('the area names are K5–K7, with "Other topics" for the grey column', () => {
  assert.deepEqual(AREA_NAME, {
    llm: 'LLMs and agents',
    model: 'Model and data security',
    defence: 'AI for cyber defence',
    other: 'Other topics',
  });
  assert.equal(typeof AREA_COLOURS_ON, 'boolean');
  for (const area of AREA_IDS) assert.equal(paintArea(area), AREA_COLOURS_ON ? area : 'other');
});

/* --- colour tables (SPEC §6.4) ------------------------------------------------------ */

test('the colour tables are the SPEC §6.4 hexes', () => {
  assert.deepEqual(CANVAS, { light: '#f5f5f5', dark: '#171717' });
  assert.deepEqual(STRONG.light, { llm: '#2a78d6', model: '#eb6834', defence: '#1baf7a', other: '#767676' });
  assert.deepEqual(STRONG.dark, { llm: '#3987e5', model: '#d95926', defence: '#199e70', other: '#8a8a8a' });
  assert.deepEqual(NONE, { light: '#cbcbcb', dark: '#3a3a3a' });
  assert.deepEqual(EGO_LINE, { light: '#9f9f9f', dark: '#6b6b6b' });

  // Rows of the §6.4 table, in AREA_IDS order (llm, model, defence, other).
  assert.deepEqual(PAL.light.strong, ['#2a78d6', '#eb6834', '#1baf7a', '#767676']);
  assert.deepEqual(PAL.light.tint, ['#90b7e6', '#f0af95', '#88d2b8', '#b6b6b6']);
  assert.deepEqual(PAL.light.dimStrong, ['#c2d6ed', '#f3d2c5', '#bfe4d6', '#d5d5d5']);
  assert.deepEqual(PAL.light.dimTint, ['#dce6f1', '#f4e4dd', '#daece6', '#e5e5e5']);
  assert.equal(PAL.light.none, '#cbcbcb');
  assert.equal(PAL.light.dimNone, '#ebebeb');
  assert.equal(PAL.light.canvas, '#f5f5f5');
  assert.equal(PAL.light.ego, '#9f9f9f');

  assert.deepEqual(PAL.dark.strong, ['#3987e5', '#d95926', '#199e70', '#8a8a8a']);
  assert.deepEqual(PAL.dark.tint, ['#284f7e', '#78381f', '#185b44', '#515151']);
  assert.deepEqual(PAL.dark.dimStrong, ['#20334b', '#48281b', '#18392d', '#343434']);
  assert.deepEqual(PAL.dark.dimTint, ['#1b2531', '#2f1f19', '#172822', '#262626']);
  assert.equal(PAL.dark.none, '#3a3a3a');
  assert.equal(PAL.dark.dimNone, '#202020');
  assert.equal(PAL.dark.canvas, '#171717');
  assert.equal(PAL.dark.ego, '#6b6b6b');
});

test('tint and dim are sRGB mixes toward the plate', () => {
  assert.equal(TINT_MIX, 0.5);
  assert.ok(DIM_MIX >= 0.15 && DIM_MIX <= 0.3, `DIM_MIX ${DIM_MIX} outside the tunable 0.15–0.30`);
  // mix(a, b, t) = t of a plus (1 - t) of b, per channel, rounded.
  assert.equal(mix('#000000', '#ffffff', 0.5), '#808080', '127.5 rounds up');
  assert.equal(mix('#2a78d6', '#f5f5f5', 1), '#2a78d6');
  assert.equal(mix('#2a78d6', '#f5f5f5', 0), '#f5f5f5');
  assert.equal(mix('#2a78d6', '#f5f5f5', 0.5), '#90b7e6');
  assert.equal(mix('#2a78d6', '#f5f5f5', 0.25), '#c2d6ed');
  assert.throws(() => mix('red', '#f5f5f5', 0.5), /not a #rrggbb colour/);
  for (const theme of ['light', 'dark']) {
    const pal = PAL[theme];
    AREA_IDS.forEach((area, i) => {
      assert.equal(pal.strong[i], STRONG[theme][area]);
      assert.equal(pal.tint[i], mix(pal.strong[i], CANVAS[theme], TINT_MIX), `${theme} ${area} tint`);
      assert.equal(pal.dimStrong[i], mix(pal.strong[i], CANVAS[theme], DIM_MIX), `${theme} ${area} dim(strong)`);
      assert.equal(pal.dimTint[i], mix(pal.tint[i], CANVAS[theme], DIM_MIX), `${theme} ${area} dim(tint)`);
    });
    assert.equal(pal.dimNone, mix(NONE[theme], CANVAS[theme], DIM_MIX), `${theme} dim(none)`);
  }
});

test('the DOM swatch classes carry the same hexes as the map, light then dark', () => {
  for (const [i, area] of AREA_IDS.entries()) {
    assert.equal(AREA_SWATCH[area], `bg-[${PAL.light.strong[i]}] dark:bg-[${PAL.dark.strong[i]}]`, area);
    assert.equal(AREA_TINT_SWATCH[area], `bg-[${PAL.light.tint[i]}] dark:bg-[${PAL.dark.tint[i]}]`, area);
  }
  assert.equal(NONE_SWATCH, `bg-[${PAL.light.none}] dark:bg-[${PAL.dark.none}]`);
});

/* --- size, draw order and the tooltip line (SPEC §6.5, §6.10) ------------------------ */

test('nodeSize is one citation scale with a small tier offset', () => {
  const close = (a, b) => Math.abs(a - b) < 1e-9;
  // No citations: s = 1, so base = 2.4.
  assert.ok(close(nodeSize(1, 'review'), 3.0));
  assert.ok(close(nodeSize(1, 'abstract'), 2.4));
  assert.ok(close(nodeSize(1, 'none'), 1.8));
  // The most-cited paper in the corpus has s = 5.03.
  assert.ok(close(nodeSize(5.03, 'review'), 1.8 * 5.03 + 1.2));
  // The offsets are equal steps, so tiers stay comparable on one scale.
  for (const s of [1, 2, 3.5, 5]) {
    assert.ok(close(nodeSize(s, 'review') - nodeSize(s, 'abstract'), 0.6), `review step at s=${s}`);
    assert.ok(close(nodeSize(s, 'abstract') - nodeSize(s, 'none'), 0.6), `none step at s=${s}`);
  }
  assert.equal(nodeSize(0.2, 'none'), 1.4, 'the no-summary floor');
  assert.deepEqual(TIER_RANK, { none: 0, abstract: 1, review: 2 });
});

const paper = (id, over = {}) => ({ id, x: 0, y: 0, c: -1, t: `Paper ${id}`, yr: 2024, v: '', s: 1, cc: 0, r: 0, a: 0, u: null, ...over });
const CLUSTERS = [
  { id: -1, label: 'Unclustered', label_note: null, size: 1 },
  { id: 0, label: 'Jailbreak Attacks III', label_note: null, size: 2 },
  { id: 1, label: 'Applied Cryptography', label_note: null, size: 1 },
  { id: 2, label: 'Watermarking I', label_note: null, size: 0 },
];

test('tooltipMeta is TT1: year, region and tier, leaving out what is missing', () => {
  const atlas = buildAtlas(
    [paper('a', { c: 0, r: 1 }), paper('b', { c: 0, a: 1, yr: null }), paper('c', { c: -1 }), paper('d', { c: 1, yr: 2026 })],
    CLUSTERS,
  );
  const meta = (id) => tooltipMeta(atlas.byId.get(id), atlas.regions.get(atlas.byId.get(id).c));
  assert.equal(meta('a'), '2024 · Jailbreak Attacks III · Review');
  assert.equal(meta('b'), 'Jailbreak Attacks III · Abstract', 'no year');
  assert.equal(meta('c'), '2024 · No summary', 'no named region: the Unclustered bucket is never named');
  assert.equal(meta('d'), '2026 · Applied Cryptography · No summary');
  assert.equal(tooltipMeta(paper('e', { c: 99 }), undefined), '2024 · No summary', 'a cluster missing from clusters.json');
});

test('buildAtlas gives each region its area and each paper its display title', () => {
  const nodes = [
    paper('m', { c: 0, r: 1, t: '<i>JailbreakLens</i>: Visual  Analysis' }),
    paper('n', { c: 1, t: '&quot;Do Anything Now&quot;' }),
    paper('o', { c: -1 }),
  ];
  const atlas = buildAtlas(nodes, CLUSTERS);
  assert.equal(atlas.regions.get(0).area, 'llm');
  assert.equal(atlas.regions.get(1).area, 'other');
  assert.equal(atlas.regions.get(2).area, 'model', 'an empty region still has an area');
  assert.equal(atlas.regions.get(-1).area, 'other', 'Unclustered is grey');
  assert.equal(titleOf(atlas, atlas.byId.get('m')), 'JailbreakLens: Visual Analysis');
  assert.equal(titleOf(atlas, atlas.byId.get('n')), '"Do Anything Now"');
  assert.equal(titleOf(atlas, atlas.byId.get('o')), 'Paper o');
  assert.equal(atlas.titles.size, 3);
  assert.equal(atlas.nodes[0].t, '<i>JailbreakLens</i>: Visual  Analysis', 'the payload itself is never changed');
});

/* --- displayTitle (SPEC §9.4) -------------------------------------------------------- */

const MATHML_TITLE =
  '<mml:math xmlns:mml="http://www.w3.org/1998/Math/MathML" altimg="si6.svg" display="inline" id="d1e2502"> <mml:msup> <mml:mrow> <mml:mi mathvariant="normal">D</mml:mi> </mml:mrow> <mml:mrow> <mml:mn>2</mml:mn> </mml:mrow> </mml:msup> </mml:math> Fusion: Dual-domain fusion with feature superposition for Deepfake detection';

test('displayTitle removes tag markup, MathML included', () => {
  assert.equal(displayTitle(MATHML_TITLE), 'D2 Fusion: Dual-domain fusion with feature superposition for Deepfake detection');
  assert.equal(
    displayTitle('SEEMless: Secure End-to-End Encrypted Messaging with less</> Trust'),
    'SEEMless: Secure End-to-End Encrypted Messaging with less Trust',
  );
  assert.equal(displayTitle('<scp>TokenScout:</scp> Early Detection'), 'TokenScout: Early Detection');
  assert.equal(displayTitle('Low Temperature Sabatier CO <sub>2</sub> Methanation'), 'Low Temperature Sabatier CO 2 Methanation');
  assert.equal(displayTitle('Ni <sub> <b>3</b> </sub> Se'), 'Ni 3 Se', 'whitespace between tags collapses first');
  assert.equal(displayTitle('Line one<br/>line two'), 'Line oneline two');
});

test('displayTitle keeps a literal less-than that is not a tag', () => {
  assert.equal(
    displayTitle('Your Keywords Know Each Other: Breaking SSE with <1% Leaked Documents'),
    'Your Keywords Know Each Other: Breaking SSE with <1% Leaked Documents',
  );
  assert.equal(displayTitle('Breaking {SSE} with {< 1%} Leaked'), 'Breaking {SSE} with {< 1%} Leaked');
  assert.equal(displayTitle('a < b and c > d'), 'a < b and c > d');
});

test('displayTitle decodes entities once and collapses whitespace', () => {
  assert.equal(
    displayTitle('&quot;Do Anything Now&quot;: Characterizing and Evaluating In-The-Wild Jailbreak Prompts'),
    '"Do Anything Now": Characterizing and Evaluating In-The-Wild Jailbreak Prompts',
  );
  assert.equal(displayTitle('A Wolf in Sheep&apos;s Clothing'), 'A Wolf in Sheep\'s Clothing');
  assert.equal(displayTitle('Prune&amp;Comp: Free Lunch'), 'Prune&Comp: Free Lunch');
  assert.equal(displayTitle('x &lt;i&gt; y'), 'x <i> y', 'decoded text is never re-read as markup');
  assert.equal(displayTitle('&amp;lt; stays one level'), '&lt; stays one level');
  assert.equal(displayTitle('Non&nbsp;breaking'), 'Non breaking');
  assert.equal(displayTitle('It&#39;s &#x2019;quoted&#8217;'), 'It\'s ’quoted’');
  assert.equal(displayTitle('bad &#xD800; and &#0; stay'), 'bad &#xD800; and &#0; stay');
  assert.equal(displayTitle('&copy; is not decoded'), '&copy; is not decoded');
  assert.equal(displayTitle('  spaced \n  out\t title  '), 'spaced out title');
  assert.equal(displayTitle(''), '');
  assert.equal(displayTitle(null), '');
  assert.equal(displayTitle(undefined), '');
});

/* --- displayVenue (SPEC §9.4) -------------------------------------------------------- */

test('displayVenue drops a leading ellipsis and keeps a trailing one', () => {
  assert.equal(displayVenue('… IEEE Conference on …'), 'IEEE Conference on …');
  assert.equal(displayVenue('... IEEE Conference on ...'), 'IEEE Conference on …', 'three dots become one ellipsis');
  assert.equal(displayVenue('Advances in Neural …'), 'Advances in Neural …');
  assert.equal(displayVenue('International Conference on …'), 'International Conference on …');
  assert.equal(displayVenue('… of Artificial Intelligence and Machine Learning'), 'of Artificial Intelligence and Machine Learning');
  assert.equal(
    displayVenue('Proceedings of the ... International Florida Artificial Intelligence Research Society Conference'),
    'Proceedings of the … International Florida Artificial Intelligence Research Society Conference',
    'an ellipsis inside the name is kept',
  );
});

test('displayVenue omits fragments that name no venue', () => {
  for (const v of [
    'Proceedings of the …',
    'Proceedings of …',
    'Advances in …',
    'Advances in',
    'International …',
    'International Journal of …',
    'IEEE …',
    'IEEE Transactions …',
    'IEEE Transactions on …',
    'ACM Transactions on …',
    'Findings of the …',
    'Journal of …',
    '… of the …',
    '…',
    '   ',
    '',
  ]) {
    assert.equal(displayVenue(v), '', JSON.stringify(v));
  }
  assert.equal(displayVenue(null), '');
});

test('displayVenue keeps complete short names: the word count applies only to cut-short venues', () => {
  for (const v of ['arXiv', 'ICML', 'CCS', 'USENIX Security', 'IEEE Access', 'S&P', 'Information Fusion', 'Nature']) {
    assert.equal(displayVenue(v), v);
  }
});

test('displayVenue keeps one spelling of a name written twice', () => {
  assert.equal(
    displayVenue('Advances in intelligent systems research/Advances in Intelligent Systems Research'),
    'Advances in Intelligent Systems Research',
  );
  assert.equal(displayVenue('Security Workshop/security workshop'), 'Security Workshop');
  assert.equal(displayVenue('TDSC/TIFS'), 'TDSC/TIFS', 'two different names stay');
});

/* --- ellipsize (SPEC §6.8) ----------------------------------------------------------- */

// One pixel per code point: easy to reason about, and it proves the cut never
// splits a surrogate pair.
const perChar = (s) => Array.from(s).length;

test('ellipsize returns text that fits unchanged and cuts the rest to the widest prefix plus an ellipsis', () => {
  assert.equal(ellipsize('abcdef', 6, perChar), 'abcdef');
  assert.equal(ellipsize('abcdefghij', 5, perChar), 'abcd…');
  assert.equal(perChar(ellipsize('abcdefghij', 5, perChar)), 5);
  assert.equal(ellipsize('abc defgh', 5, perChar), 'abc…', 'a trailing space is trimmed before the ellipsis');
  assert.equal(ellipsize('D2 Fusion: Dual-domain', 11, perChar), 'D2 Fusion…', 'a trailing separator is trimmed');
  assert.equal(ellipsize('abcdef', 1, perChar), '…');
  assert.equal(ellipsize('abcdef', 0.5, perChar), '', 'not even an ellipsis fits');
  assert.equal(ellipsize('', 100, perChar), '');
  assert.equal(ellipsize('𝐀𝐁𝐂𝐃𝐄', 3, perChar), '𝐀𝐁…', 'cuts between code points');
});

test('ellipsize respects a pixel budget with a proportional measure', () => {
  const measure = (s) => s.length * 6.4;
  const title = displayTitle(MATHML_TITLE);
  for (const maxPx of [170, 220, 250, 256]) {
    const out = ellipsize(title, maxPx, measure);
    assert.ok(measure(out) <= maxPx, `${maxPx}: ${out}`);
    assert.ok(out.endsWith('…'));
    assert.ok(title.startsWith(out.slice(0, -1)), 'a prefix of the display title');
    // One more character would not have fitted.
    assert.ok(measure(`${title.slice(0, out.length)}…`) > maxPx || out.length - 1 === title.length);
  }
});

/* --- the real export (data present only) ---------------------------------------------- */

test('at least 95% of reviewed papers sit in a coloured area, and no display title keeps markup (data present)', (t) => {
  const files = ['nodes.json', 'clusters.json'].map((f) => path.join(ATLAS_DIR, f));
  const missing = files.filter((f) => !fs.existsSync(f));
  if (missing.length > 0) {
    t.skip(`atlas data absent (${missing.join(', ')} not found); ${ABSENT}`);
    return;
  }
  const [nodes, clusters] = files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const atlas = buildAtlas(nodes, clusters);

  const tally = Object.fromEntries(AREA_IDS.map((a) => [a, { regions: 0, papers: 0, reviews: 0 }]));
  for (const region of atlas.regions.values()) if (region.id >= 0) tally[region.area].regions += 1;
  let reviewed = 0;
  let colouredReviewed = 0;
  for (const node of nodes) {
    const area = paintArea(atlas.regions.get(node.c)?.area ?? 'other');
    tally[area].papers += 1;
    if (node.r === 1) {
      reviewed += 1;
      tally[area].reviews += 1;
      if (area !== 'other') colouredReviewed += 1;
    }
  }
  const share = colouredReviewed / reviewed;
  t.diagnostic(
    `areas over ${nodes.length} papers (${ATLAS_DIR}): ` +
      AREA_IDS.map((a) => `${a} ${tally[a].regions} regions / ${tally[a].papers} papers / ${tally[a].reviews} reviews`).join('; ') +
      `; reviewed papers in a coloured area: ${colouredReviewed} of ${reviewed} (${(share * 100).toFixed(1)}%)`,
  );
  assert.ok(share >= 0.95, `only ${(share * 100).toFixed(1)}% of reviewed papers are in a coloured area`);

  let changed = 0;
  for (const node of nodes) {
    const title = titleOf(atlas, node);
    if (title !== node.t) changed += 1;
    assert.doesNotMatch(title, /<\/?[a-zA-Z][\w:.-]*(?:\s[^<>]*)?\/?>|<\/>/, node.id);
    assert.doesNotMatch(title, /&(?:amp|apos|quot|lt|gt|nbsp);/, node.id);
    assert.equal(title, title.trim());
  }
  const longest = atlas.byId.get('6a12eee6c2e6fa84');
  if (longest) {
    assert.equal(titleOf(atlas, longest), 'D2 Fusion: Dual-domain fusion with feature superposition for Deepfake detection');
  }
  let omitted = 0;
  for (const node of nodes) {
    const venue = displayVenue(node.v);
    if (node.v && !venue) omitted += 1;
    assert.ok(!venue.startsWith('…'), `${node.id}: ${venue}`);
  }
  t.diagnostic(`display titles differ from the raw title on ${changed} papers; ${omitted} venue fragments are omitted`);
});
