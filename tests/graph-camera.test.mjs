// Camera, region-label and map-key tests for /graph, the Research Atlas
// (SPEC §4.4, §6.7, §6.11, §7.6, §14.2).
//
// cameraFit.ts, regionLabels.ts, mapKeys.ts and atlasModel.ts are pure modules
// (SPEC §4.2): no React, sigma, graphology, next/* or @/ imports, so Node loads
// them directly and strips their types. They import siblings without an
// extension (the Next bundler resolves those), so a resolve hook maps
// extensionless relative specifiers onto the .ts file, as in
// tests/graph-model.test.mjs.
//
// Covered here:
//   - quantileBox, fitRatio (aspect, padding, clamps), flyDuration, nearFit and
//     clearPadding (the plate's controls kept out of a selection or region fit);
//   - placeRegionLabels: no overlaps, obstacles and the keep-clear square
//     respected, the plate inset, the max count, and pills shown last frame
//     tried first (hysteresis); the per-tier rules and the priority order;
//   - display regions: the roman-numeral merge, slugs, notes in numeral order,
//     anchors at the densest grid cell, the region menu and the region list;
//   - mapKeyAction;
//   - with the atlas data present: 139 display regions with unique keys, the
//     five merged groups, and no label keeping a numeral.
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
  AT_FIT_TOLERANCE,
  FIT_OVERVIEW,
  FIT_REGION,
  FIT_SELECTION,
  MAX_RATIO,
  MIN_RATIO,
  clearPadding,
  fitRatio,
  flyDuration,
  nearFit,
  quantile,
  quantileBox,
  safeArea,
} = await import('../src/app/graph/cameraFit.ts');
const { LABEL_INSET, LABEL_PAD_X, LABEL_PAD_Y, padded, placeRegionLabels, rankRegions, regionLabelRule } = await import(
  '../src/app/graph/regionLabels.ts'
);
const { PAN_STEP, mapKeyAction } = await import('../src/app/graph/mapKeys.ts');
const {
  ANCHOR_CELL,
  ANCHOR_MIN_MEMBERS,
  baseRegionLabel,
  buildAtlas,
  displayCount,
  displayRegionOf,
  nodeSubtitle,
  paperMeta,
  regionKeyOf,
  regionMenu,
  regionPapers,
  tooltipMeta,
} = await import('../src/app/graph/atlasModel.ts');

const close = (actual, expected, msg, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= eps, `${msg ?? ''} expected ${expected}, got ${actual}`);
const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/* --- quantileBox (SPEC §6.11) ------------------------------------------------------- */

test('quantile interpolates between ranks; 0 and 1 are the minimum and the maximum', () => {
  const s = [0, 10, 20, 30, 40];
  assert.equal(quantile(s, 0), 0);
  assert.equal(quantile(s, 1), 40);
  assert.equal(quantile(s, 0.5), 20);
  assert.equal(quantile(s, 0.25), 10);
  close(quantile(s, 0.1), 4, 'a tenth of the way from 0 to 10 at rank 0.4');
  assert.equal(quantile([7], 0.3), 7, 'one value');
  assert.ok(Number.isNaN(quantile([], 0.5)), 'no values');
  assert.equal(quantile(s, -1), 0, 'q is clamped to 0..1');
  assert.equal(quantile(s, 2), 40);
});

test('quantileBox takes each axis on its own sorted copy and never reorders the inputs', () => {
  const xs = [5, 1, 4, 2, 3];
  const ys = [50, 30, 10, 40, 20];
  assert.deepEqual(quantileBox(xs, ys, 0, 1), { minX: 1, maxX: 5, minY: 10, maxY: 50 });
  const mid = quantileBox(xs, ys, 0.25, 0.75);
  assert.deepEqual(mid, { minX: 2, maxX: 4, minY: 20, maxY: 40 });
  assert.deepEqual(xs, [5, 1, 4, 2, 3], 'inputs untouched');
  assert.deepEqual(ys, [50, 30, 10, 40, 20]);
  assert.equal(quantileBox([], [], 0, 1), null, 'no points, no box');
  assert.deepEqual(quantileBox(Float64Array.of(2), Float64Array.of(3), 0.01, 0.99), { minX: 2, maxX: 2, minY: 3, maxY: 3 });
});

test('quantileBox at 1st–99th percentile leaves isolated outliers outside', () => {
  const xs = Array.from({ length: 1000 }, (_, i) => i / 999);
  const ys = Array.from({ length: 1000 }, (_, i) => (i * 7919) % 1000 / 999);
  xs[0] = -50; // one far outlier on each axis
  ys[1] = 80;
  const box = quantileBox(xs, ys, FIT_OVERVIEW.lo, FIT_OVERVIEW.hi);
  assert.ok(box.minX > -1 && box.maxY < 2, `outliers excluded: ${JSON.stringify(box)}`);
  assert.ok(box.maxX > 0.97 && box.minY < 0.03, 'the body of the cloud kept');
});

/* --- fitRatio, flyDuration, nearFit (SPEC §6.11) ------------------------------------- */

const PLATE = { width: 1040, height: 836 };
const LIMITS = { min: MIN_RATIO, max: MAX_RATIO };

test('fitRatio is limited by whichever side of the padded plate fills first', () => {
  const pad = FIT_OVERVIEW.pad; // 64, 32, 32, 32: a 976 × 740 area
  // Tall box: height limits. 1480px tall at ratio 1 needs ratio 2 to be 740px.
  close(fitRatio({ dx: 100, dy: 1480 }, { ...PLATE, pad }, LIMITS), 2);
  // Wide box: width limits. 488px wide at ratio 1 fits at ratio 0.5.
  close(fitRatio({ dx: 488, dy: 10 }, { ...PLATE, pad }, LIMITS), 0.5);
  // A box with the area's own aspect fills both sides at once.
  close(fitRatio({ dx: 976, dy: 740 }, { ...PLATE, pad }, LIMITS), 1);
  // Negative extents (a flipped axis) measure the same.
  close(fitRatio({ dx: -488, dy: -10 }, { ...PLATE, pad }, LIMITS), 0.5);
});

test('fitRatio honours the padding and clamps to the zoom limits', () => {
  const noPad = { t: 0, r: 0, b: 0, l: 0 };
  close(fitRatio({ dx: 520, dy: 0 }, { ...PLATE, pad: noPad }, LIMITS), 0.5);
  const sel = FIT_SELECTION.pad; // 96, 96, 72, 96: 848 × 668
  close(fitRatio({ dx: 424, dy: 0 }, { ...PLATE, pad: sel }, LIMITS), 0.5, 'padding shrinks the area');
  assert.equal(fitRatio({ dx: 1, dy: 1 }, { ...PLATE, pad: sel }, LIMITS), MIN_RATIO, 'a tiny box zooms in only to the limit');
  assert.equal(fitRatio({ dx: 0, dy: 0 }, { ...PLATE, pad: sel }, LIMITS), MIN_RATIO, 'one point');
  assert.equal(fitRatio({ dx: 1e6, dy: 1e6 }, { ...PLATE, pad: sel }, LIMITS), MAX_RATIO, 'a huge box zooms out only to the limit');
  const fit = 1.2;
  assert.equal(fitRatio({ dx: 5000, dy: 5000 }, { ...PLATE, pad: sel }, { min: MIN_RATIO, max: fit / 2 }), 0.6, 'selection cap: fitRatio / 2');
  assert.equal(
    fitRatio({ dx: 10, dy: 10 }, { width: 100, height: 100, pad: { t: 60, r: 0, b: 60, l: 0 } }, LIMITS),
    MAX_RATIO,
    'no room left: the most zoomed-out allowed'
  );
});

test('flyDuration grows with the change of zoom, from 250 to 700 ms', () => {
  assert.equal(flyDuration(1, 1), 250, 'a pan');
  assert.equal(flyDuration(1, 2), 370, 'one octave');
  assert.equal(flyDuration(2, 1), 370, 'symmetric');
  assert.equal(flyDuration(1, 0.25), 490, 'two octaves');
  assert.equal(flyDuration(1, 1 / 16), 700, 'clamped');
  assert.equal(flyDuration(1, 0), 250, 'a degenerate ratio never yields NaN');
});

test('nearFit: within 5% of the last fit in ratio and position', () => {
  const fit = { x: 0.5, y: 0.5, ratio: 1 };
  assert.equal(AT_FIT_TOLERANCE, 0.05);
  assert.equal(nearFit(fit, fit), true);
  assert.equal(nearFit({ x: 0.54, y: 0.46, ratio: 1.04 }, fit), true);
  assert.equal(nearFit({ x: 0.5, y: 0.5, ratio: 1.06 }, fit), false, 'zoomed');
  assert.equal(nearFit({ x: 0.56, y: 0.5, ratio: 1 }, fit), false, 'panned');
  assert.equal(nearFit(fit, null), false, 'no fit yet');
});

test('clearPadding keeps a fit clear of the plate controls, shrinking the cheaper side', () => {
  const pad = FIT_SELECTION.pad;
  // The open key, bottom-left at 1440 × 900: 264 × 421 at (12, 403).
  const key = { x: 12, y: 403, w: 264, h: 421 };
  const out = clearPadding(PLATE, pad, [key], 12);
  assert.equal(out.l, 288, 'the left edge moves past the key (264 + 12 + 12)');
  assert.deepEqual([out.t, out.r, out.b], [pad.t, pad.r, pad.b], 'the other sides keep their padding');
  const area = safeArea(PLATE, out);
  assert.ok(!hit(area, key), 'the padded area no longer meets the key');
  // A collapsed key below the padded area changes nothing.
  assert.deepEqual(clearPadding(PLATE, pad, [{ x: 12, y: 790, w: 264, h: 34 }], 12), pad);
  // The keep-clear corner, 140 × 140 bottom-right.
  const corner = { x: PLATE.width - 140, y: PLATE.height - 140, w: 140, h: 140 };
  const cleared = clearPadding(PLATE, FIT_REGION.pad, [corner], 0);
  assert.ok(!hit(safeArea(PLATE, cleared), corner), JSON.stringify(cleared));
  assert.deepEqual(clearPadding(PLATE, pad, [{ x: 0, y: 0, w: 0, h: 0 }]), pad, 'an unmeasured control is ignored');
});

/* --- region labels (SPEC §6.7) -------------------------------------------------------- */

const VIEW = { width: 1040, height: 836 };
const KEEP_CLEAR = { x: VIEW.width - 140, y: VIEW.height - 140, w: 140, h: 140 };
const pill = (key, x, y, w = 120, h = 22) => ({ key, x, y, w, h });

function assertNoOverlaps(placed) {
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      assert.ok(!hit(placed[i], padded(placed[j])), `${placed[i].key} enters the clear space of ${placed[j].key}`);
    }
  }
}

test('placeRegionLabels centres each pill on its anchor and never overlaps two pills', () => {
  const candidates = [pill('a', 300, 300), pill('b', 330, 305), pill('c', 300, 340), pill('d', 600, 300)];
  const placed = placeRegionLabels(candidates, [], VIEW, new Set(), 10);
  assert.deepEqual(
    placed.map((p) => p.key),
    ['a', 'c', 'd'],
    'b collides with a; c clears a with its 4px of padding (300 + 11 + 4 < 340 − 11)'
  );
  assert.deepEqual(placed[0], { key: 'a', x: 240, y: 289, w: 120, h: 22 });
  assertNoOverlaps(placed);
  assert.equal(LABEL_PAD_X, 6);
  assert.equal(LABEL_PAD_Y, 4);
  // Padding is honoured, not just the boxes: 4px apart vertically is too close.
  const tight = placeRegionLabels([pill('a', 300, 300), pill('b', 300, 324)], [], VIEW, new Set(), 10);
  assert.deepEqual(tight.map((p) => p.key), ['a'], '22px boxes 24px apart leave 2px, under the 4px clear space');
});

test('placeRegionLabels keeps pills off obstacles, the keep-clear square and the plate edge', () => {
  const toolbar = { x: 12, y: 12, w: 513, h: 36 };
  const zoom = { x: VIEW.width - 50, y: 12, w: 38, h: 110 };
  const key = { x: 12, y: 403, w: 264, h: 421 };
  const obstacles = [toolbar, zoom, key, KEEP_CLEAR];
  const candidates = [
    pill('under-toolbar', 200, 30),
    pill('under-zoom', VIEW.width - 40, 60),
    pill('under-key', 100, 600),
    pill('in-corner', VIEW.width - 70, VIEW.height - 70),
    pill('clipped-left', 40, 300),
    pill('clipped-bottom', 600, VIEW.height - 5),
    pill('free', 600, 400),
  ];
  const placed = placeRegionLabels(candidates, obstacles, VIEW, new Set(), 14);
  assert.deepEqual(placed.map((p) => p.key), ['free']);
  for (const p of placed) {
    for (const o of obstacles) assert.ok(!hit(p, o), `${p.key} touches an obstacle`);
    assert.ok(p.x >= LABEL_INSET && p.y >= LABEL_INSET, 'inside the inset');
    assert.ok(p.x + p.w <= VIEW.width - LABEL_INSET && p.y + p.h <= VIEW.height - LABEL_INSET);
  }
  // Exactly at the inset is allowed; one pixel past it is not.
  assert.equal(placeRegionLabels([pill('edge', LABEL_INSET + 60, 300)], [], VIEW, new Set(), 1).length, 1);
  assert.equal(placeRegionLabels([pill('edge', LABEL_INSET + 59, 300)], [], VIEW, new Set(), 1).length, 0);
});

test('placeRegionLabels stops at the max count and keeps priority order', () => {
  const candidates = Array.from({ length: 30 }, (_, i) => pill(`r${i}`, 100 + (i % 6) * 150, 100 + Math.floor(i / 6) * 60));
  const placed = placeRegionLabels(candidates, [], VIEW, new Set(), 14);
  assert.equal(placed.length, 14);
  assert.deepEqual(
    placed.map((p) => p.key),
    candidates.slice(0, 14).map((c) => c.key),
    'the first 14 by priority, none colliding'
  );
  assert.deepEqual(placeRegionLabels(candidates, [], VIEW, new Set(), 0), [], 'max 0 (the close tier) shows none');
});

test('placeRegionLabels tries last frame’s pills first, so a lower-priority pill keeps its place', () => {
  // "big" outranks "small", and the two collide.
  const candidates = [pill('big', 400, 300), pill('small', 420, 302)];
  assert.deepEqual(placeRegionLabels(candidates, [], VIEW, new Set(), 14).map((p) => p.key), ['big']);
  assert.deepEqual(
    placeRegionLabels(candidates, [], VIEW, new Set(['small']), 14).map((p) => p.key),
    ['small'],
    'shown last frame, so it is tried first and holds its place'
  );
  // A previously shown pill that now hits an obstacle gives way.
  const obstacle = { x: 380, y: 280, w: 100, h: 40 };
  assert.deepEqual(
    placeRegionLabels([pill('big', 400, 300), pill('small', 700, 302)], [obstacle], VIEW, new Set(['big']), 14).map((p) => p.key),
    ['small']
  );
  // Within the previously shown group, priority order still holds.
  const prev = new Set(['c', 'a']);
  const order = placeRegionLabels([pill('a', 200, 200), pill('b', 400, 200), pill('c', 600, 200)], [], VIEW, prev, 2);
  assert.deepEqual(order.map((p) => p.key), ['a', 'c'], 'a and c (both shown before) beat b, in priority order');
});

test('region-label rules per zoom tier, and priority by reviewed then visible papers', () => {
  assert.deepEqual(regionLabelRule('overview'), { max: 14, minMembers: 12 });
  assert.deepEqual(regionLabelRule('mid'), { max: 24, minMembers: 4 });
  assert.equal(regionLabelRule('close').max, 0, 'close in, the location chip names the region');
  const ranked = rankRegions([
    { key: 'a', reviewed: 3, members: 10 },
    { key: 'b', reviewed: 9, members: 5 },
    { key: 'c', reviewed: 3, members: 40 },
    { key: 'd', reviewed: 3, members: 40 },
  ]);
  assert.deepEqual(ranked.map((r) => r.key), ['b', 'c', 'd', 'a'], 'reviewed desc, then members desc, ties stable');
});

/* --- display regions (SPEC §4.4) -------------------------------------------------------- */

const paper = (id, over = {}) => ({ id, x: 0, y: 0, c: -1, t: `Paper ${id}`, yr: 2024, v: '', s: 1, cc: 0, r: 0, a: 0, u: null, ...over });
const CLUSTERS = [
  { id: -1, label: 'Unclustered', label_note: 'Not a region.', size: 2 },
  { id: 5, label: 'Jailbreak Attacks III', label_note: 'The black-box query wing.', size: 4 },
  { id: 2, label: 'Jailbreak Attacks I', label_note: 'The multi-turn wing.', size: 1 },
  { id: 9, label: 'Jailbreak Attacks IV', label_note: null, size: 1 },
  { id: 3, label: 'Jailbreak Attacks II', label_note: 'In-the-wild jailbreaks.', size: 1 },
  { id: 4, label: 'LLM-as-Judge', label_note: null, size: 3 },
  { id: 6, label: 'Applied Cryptography', label_note: null, size: 1 },
  { id: 7, label: 'Empty Region', label_note: null, size: 0 },
];
const NODES = [
  // Jailbreak III: three in one 0.5-unit cell (the densest), one elsewhere.
  paper('j1', { c: 5, x: 1.1, y: 1.1, r: 1, cc: 5 }),
  paper('j2', { c: 5, x: 1.2, y: 1.3, a: 1, cc: 50 }),
  paper('j3', { c: 5, x: 1.4, y: 1.2, cc: 500 }),
  paper('j4', { c: 5, x: 3, y: 3, r: 1, cc: 1 }),
  paper('j5', { c: 2, x: 1.3, y: 1.4, a: 1, yr: null }),
  paper('j6', { c: 9, x: 6, y: 6, r: 1, cc: 9 }),
  paper('j7', { c: 3, x: 7, y: 7 }),
  paper('k1', { c: 4, x: 10, y: 10, r: 1 }),
  paper('k2', { c: 4, x: 10.1, y: 10.1 }),
  paper('k3', { c: 4, x: 20, y: 20 }),
  paper('c1', { c: 6, x: -5, y: -5, a: 1 }),
  paper('u1', { c: -1, x: 1.2, y: 1.2, r: 1 }),
  paper('u2', { c: -1, x: 1.3, y: 1.3 }),
];

test('display regions merge roman-numeral splits under one numeral-free label and slug', () => {
  assert.equal(baseRegionLabel('Jailbreak Attacks III'), 'Jailbreak Attacks');
  assert.equal(baseRegionLabel('Safety Alignment I'), 'Safety Alignment');
  assert.equal(baseRegionLabel('Agent Security V'), 'Agent Security');
  assert.equal(baseRegionLabel('Watermarking'), 'Watermarking', 'no numeral');
  assert.equal(baseRegionLabel('Phase II Trials'), 'Phase II Trials', 'only a trailing numeral is dropped');
  assert.equal(baseRegionLabel('Model VI'), 'Model VI', 'only I to V');
  assert.equal(regionKeyOf('Jailbreak Attacks IV'), 'jailbreak-attacks');
  assert.equal(regionKeyOf('LLM-as-Judge'), 'llm-as-judge');
  assert.equal(regionKeyOf('Retrieval-Augmented Generation'), 'retrieval-augmented-generation');
  assert.equal(regionKeyOf('SDN DDoS Defense'), 'sdn-ddos-defense');
  assert.equal(regionKeyOf('  (Odd) Label!  '), 'odd-label', 'no leading or trailing dash');

  const atlas = buildAtlas(NODES, CLUSTERS);
  const keys = [...atlas.displayRegions.keys()];
  assert.deepEqual(keys.sort(), ['applied-cryptography', 'empty-region', 'jailbreak-attacks', 'llm-as-judge']);
  assert.ok(!keys.includes('unclustered'), 'the Unclustered bucket is never a display region');
  assert.equal(atlas.displayRegionsWithPapers, 3, 'the empty region is not one a reader can visit');
  assert.equal(atlas.regionsWithPapers, 6, 'the raw count of named clusters is kept for the model test');

  const jb = atlas.displayRegions.get('jailbreak-attacks');
  assert.equal(jb.label, 'Jailbreak Attacks');
  assert.equal(jb.area, 'llm');
  assert.deepEqual(jb.clusterIds, [2, 3, 5, 9], 'numeral order: I, II, III, IV');
  assert.deepEqual(jb.notes, ['The multi-turn wing.', 'In-the-wild jailbreaks.', 'The black-box query wing.'], 'notes in numeral order; null skipped');
  assert.deepEqual(jb.members, ['j1', 'j2', 'j3', 'j4', 'j5', 'j6', 'j7'], 'payload order');
  assert.deepEqual(jb.counts, { all: 7, text: 5, review: 3, abstractOnly: 2 });
  assert.equal(displayCount(jb, 'all'), 7);
  assert.equal(displayCount(jb, 'text'), 5);
  assert.equal(displayCount(jb, 'review'), 3);
  for (const id of [2, 3, 5, 9]) assert.equal(atlas.regions.get(id).displayKey, 'jailbreak-attacks');
  assert.equal(atlas.regions.get(-1).displayKey, null);
  assert.equal(displayRegionOf(atlas, atlas.byId.get('j6')), jb);
  assert.equal(displayRegionOf(atlas, atlas.byId.get('u1')), undefined, 'no named region');
  assert.equal(atlas.regions.get(5).label, 'Jailbreak Attacks III', 'the cluster keeps its own label');
});

test('a display region’s label anchor is the mean of the densest grid cell, per filter', () => {
  assert.equal(ANCHOR_CELL, 0.5);
  assert.equal(ANCHOR_MIN_MEMBERS, 3);
  const atlas = buildAtlas(NODES, CLUSTERS);
  const jb = atlas.displayRegions.get('jailbreak-attacks');
  // all: j1, j2, j3, j5 share the cell [1, 1.5) × [1, 1.5); Unclustered papers in it never count.
  close(jb.anchors.all.x, (1.1 + 1.2 + 1.4 + 1.3) / 4, 'anchor x');
  close(jb.anchors.all.y, (1.1 + 1.3 + 1.2 + 1.4) / 4, 'anchor y');
  // text: j1, j2, j5 (j3 has no summary) is still three.
  close(jb.anchors.text.x, (1.1 + 1.2 + 1.3) / 3, 'text anchor');
  // review: j1, j4, j6 are in three different cells, so no cell reaches three.
  assert.equal(jb.anchors.review, null, 'fewer than 3 in the densest cell: no label');
  const judge = atlas.displayRegions.get('llm-as-judge');
  assert.equal(judge.anchors.all, null, 'two in one cell and one far away');
  assert.equal(atlas.displayRegions.get('empty-region').anchors.all, null);
});

test('the region menu groups by research area, A–Z, with visible counts', () => {
  const atlas = buildAtlas(NODES, CLUSTERS);
  const menu = regionMenu(atlas, 'all');
  assert.deepEqual(
    menu.map((g) => [g.label, g.options.map((o) => `${o.label} (${o.count})`)]),
    [
      ['LLMs and agents', ['Jailbreak Attacks (7)', 'LLM-as-Judge (3)']],
      ['Other topics', ['Applied Cryptography (1)']],
    ],
    'empty areas and empty regions are left out'
  );
  assert.deepEqual(
    regionMenu(atlas, 'review')[0].options.map((o) => o.count),
    [3, 1],
    'counts follow the filter'
  );
});

test('the region view lists reviews, then abstracts, then the rest, most-cited first, under the filter', () => {
  const atlas = buildAtlas(NODES, CLUSTERS);
  const jb = atlas.displayRegions.get('jailbreak-attacks');
  assert.deepEqual(regionPapers(atlas, jb, 'all').map((n) => n.id), ['j6', 'j1', 'j4', 'j2', 'j5', 'j3', 'j7']);
  assert.deepEqual(regionPapers(atlas, jb, 'text').map((n) => n.id), ['j6', 'j1', 'j4', 'j2', 'j5']);
  assert.deepEqual(regionPapers(atlas, jb, 'review').map((n) => n.id), ['j6', 'j1', 'j4']);
});

test('subtitles name the display region, never a numeral or the Unclustered bucket', () => {
  const atlas = buildAtlas(NODES, CLUSTERS);
  const sub = (id) => nodeSubtitle(atlas.byId.get(id), atlas.regions.get(atlas.byId.get(id).c));
  assert.equal(sub('j1'), '2024 · Jailbreak Attacks · Review');
  assert.equal(sub('j5'), 'Jailbreak Attacks · Abstract', 'no year');
  assert.equal(sub('u1'), '2024 · Review', 'no named region');
  assert.equal(paperMeta(atlas.byId.get('j2'), 'Jailbreak Attacks'), '2024 · Jailbreak Attacks · Abstract');
  assert.equal(paperMeta(atlas.byId.get('j2'), null), '2024 · Abstract');
  // tooltipMeta keeps naming the cluster it is given (tests/graph-encoding.test.mjs pins that).
  assert.equal(tooltipMeta(atlas.byId.get('j1'), atlas.regions.get(5)), '2024 · Jailbreak Attacks III · Review');
});

test('data: 139 display regions with unique keys, and only the five numeral groups merge', (t) => {
  const files = ['nodes.json', 'clusters.json'].map((f) => path.join(ATLAS_DIR, f));
  const missing = files.filter((f) => !fs.existsSync(f));
  if (missing.length > 0) {
    t.skip(`atlas data absent (${missing.join(', ')} not found); ${ABSENT}`);
    return;
  }
  const [nodes, clusters] = files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const atlas = buildAtlas(nodes, clusters);
  const regions = [...atlas.displayRegions.values()];
  const keys = regions.map((r) => r.key);
  assert.equal(new Set(keys).size, keys.length, 'keys are unique');
  // Derived, not pinned: the corpus gains regions (four binary-RE regions were appended on 2026-10-05,
  // 139 -> 143), so the invariant is "every named cluster is a display region, except the numeral splits
  // that merge" -- the merge set itself is pinned exactly below.
  const named = clusters.filter((c) => c.id >= 0).length;
  const mergedAway = regions.reduce((s, r) => s + Math.max(0, r.clusterIds.length - 1), 0);
  assert.equal(regions.length, named - mergedAway, 'display regions = named clusters minus the numeral merges');
  assert.equal(atlas.displayRegionsWithPapers, regions.length, 'every display region holds papers');
  for (const r of regions) {
    assert.match(r.key, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${r.key} is a valid #r= key`);
    assert.doesNotMatch(r.label, /\s(?:I|II|III|IV|V)$/, `${r.label} keeps no numeral`);
  }
  const merged = Object.fromEntries(regions.filter((r) => r.clusterIds.length > 1).map((r) => [r.label, r.clusterIds.length]));
  assert.deepEqual(merged, {
    'Jailbreak Attacks': 4,
    'Safety Alignment': 3,
    Watermarking: 3,
    'Data Poisoning': 3,
    'Agent Security': 3,
  });
  const unclustered = nodes.filter((n) => n.c === -1).length;
  assert.equal(
    regions.reduce((sum, r) => sum + r.members.length, 0),
    nodes.length - unclustered,
    'every paper in a named region belongs to exactly one display region'
  );
  const anchored = regions.filter((r) => r.anchors.all).length;
  t.diagnostic(
    `display regions over ${nodes.length} papers (${ATLAS_DIR}): ${regions.length} unique keys, ${anchored} with an "all" anchor, merged ${JSON.stringify(merged)}`
  );
});

/* --- the map keys (SPEC §7.6) ------------------------------------------------------------ */

test('mapKeyAction: arrows pan 15%, + and = zoom in, - zooms out, 0 fits', () => {
  assert.equal(PAN_STEP, 0.15);
  assert.deepEqual(mapKeyAction('ArrowLeft'), { type: 'pan', dx: -0.15, dy: 0 });
  assert.deepEqual(mapKeyAction('ArrowRight'), { type: 'pan', dx: 0.15, dy: 0 });
  assert.deepEqual(mapKeyAction('ArrowUp'), { type: 'pan', dx: 0, dy: -0.15 });
  assert.deepEqual(mapKeyAction('ArrowDown'), { type: 'pan', dx: 0, dy: 0.15 });
  assert.deepEqual(mapKeyAction('+'), { type: 'zoomIn' });
  assert.deepEqual(mapKeyAction('='), { type: 'zoomIn' });
  assert.deepEqual(mapKeyAction('-'), { type: 'zoomOut' });
  assert.deepEqual(mapKeyAction('0'), { type: 'fit' });
  assert.deepEqual(mapKeyAction('+', { shiftKey: true }), { type: 'zoomIn' }, 'Shift is how "+" is typed');
});

test('mapKeyAction leaves anything with Ctrl, Meta or Alt, and every other key, alone', () => {
  for (const mods of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
    for (const key of ['ArrowLeft', '+', '=', '-', '0']) assert.equal(mapKeyAction(key, mods), null, `${key} with ${JSON.stringify(mods)}`);
  }
  for (const key of ['a', 'Enter', ' ', 'Escape', 'Tab', '/', '1', '_', 'PageDown', 'Home']) assert.equal(mapKeyAction(key), null, key);
});
