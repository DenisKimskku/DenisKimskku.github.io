// The atlas model for /graph (SPEC §4.1, §4.4). Pure: no JSX, no DOM, and no
// React, sigma, graphology, next/* or @/ imports, so tests load it under plain
// Node (tests/graph-model.test.mjs, tests/graph-nav.test.mjs).

import { TIER_LABEL, citationsText, tierOf, type ListSort, type Tier, type TierFilter } from './atlasCopy';
import { AREA_IDS, AREA_NAME, areaOf, type AreaId } from './atlasPalette';
import { displayTitle, displayVenue } from './atlasText';
import type { AtlasCluster, AtlasEdge, AtlasNode } from './atlasTypes';

export interface Region {
  id: number;
  label: string;
  note: string | null;
  members: string[];
  reviewed: number;
  /** members with a review or an abstract (the "Review or abstract" option) */
  text: number;
  cx: number;
  cy: number;
  /** research area of the label (SPEC §6.3); 'other' for the Unclustered bucket */
  area: AreaId;
  /** the display region this cluster belongs to (SPEC §4.4); null for the Unclustered bucket */
  displayKey: string | null;
}

/** A point in graph units. */
export interface GraphPoint {
  x: number;
  y: number;
}

/**
 * A region as readers see it (SPEC §4.4): the clusters whose labels differ
 * only by a roman-numeral suffix ("Jailbreak Attacks I" … "IV") merged under
 * one label with no numeral. The Unclustered bucket is never one.
 */
export interface DisplayRegion {
  /** URL slug of the label, e.g. "jailbreak-attacks" (the #r= key) */
  key: string;
  /** the label with its numeral removed */
  label: string;
  area: AreaId;
  /** the merged clusters, in numeral order */
  clusterIds: number[];
  /** the clusters' non-empty label notes, in numeral order */
  notes: string[];
  /** paper ids, in payload order */
  members: string[];
  counts: { all: number; text: number; review: number; abstractOnly: number };
  /**
   * Where the region's label sits under each filter: the mean of the visible
   * members in the densest 0.5-unit grid cell, or null when that cell holds
   * fewer than 3 (the label is then not drawn).
   */
  anchors: Record<TierFilter, GraphPoint | null>;
}

/** Papers per evidence tier, and per "Show" option (SPEC §4.4, §7.2). */
export interface TierCounts {
  /** every paper (F1) */
  all: number;
  /** a review or an abstract (F2) */
  text: number;
  /** a review (F3) */
  review: number;
  /** an abstract and no review */
  abstractOnly: number;
  /** neither */
  none: number;
}

export interface Atlas {
  nodes: AtlasNode[];
  byId: Map<string, AtlasNode>;
  regions: Map<number, Region>;
  reviewed: number;
  /** named regions (cluster id >= 0) holding at least one paper */
  regionsWithPapers: number;
  /** named regions holding at least one paper with a review */
  regionsWithReview: number;
  counts: TierCounts;
  /** Each paper's display title (SPEC §9.4), computed once at load. Read it through titleOf(). */
  titles: ReadonlyMap<string, string>;
  /** Display regions by key (SPEC §4.4). */
  displayRegions: ReadonlyMap<string, DisplayRegion>;
  /** display regions holding at least one paper: the "{k} named regions" readers can visit */
  displayRegionsWithPapers: number;
  /**
   * The search index (SPEC §5.7), built once at load and aligned with `nodes`
   * by position: each paper's display title and its venue, lowercased, so a
   * keystroke never lowercases 70,000 strings.
   */
  search: { titles: readonly string[]; venues: readonly string[] };
}

/* --- display regions (SPEC §4.4) ------------------------------------------------- */

const NUMERAL = /\s+(I|II|III|IV|V)$/;
const NUMERAL_VALUE: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 };

/** A cluster label without its roman-numeral suffix: "Jailbreak Attacks III" → "Jailbreak Attacks". */
export function baseRegionLabel(label: string): string {
  return label.replace(NUMERAL, '');
}

/** The display region's key for a cluster label: its base label as a URL slug. */
export function regionKeyOf(label: string): string {
  return baseRegionLabel(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** A label's numeral as a number (0 when it has none), so "IV" sorts after "III". */
function numeralOf(label: string): number {
  const m = NUMERAL.exec(label);
  return m ? NUMERAL_VALUE[m[1]] : 0;
}

/** Label anchors: grid cell size in graph units, and the fewest visible members the densest cell needs. */
export const ANCHOR_CELL = 0.5;
export const ANCHOR_MIN_MEMBERS = 3;

/** The mean position of the members in the densest grid cell, or null when it holds fewer than the minimum. */
function densestCellMean(nodes: readonly AtlasNode[]): GraphPoint | null {
  const cells = new Map<string, { n: number; sx: number; sy: number }>();
  let best: { n: number; sx: number; sy: number } | null = null;
  for (const node of nodes) {
    const key = `${Math.floor(node.x / ANCHOR_CELL)},${Math.floor(node.y / ANCHOR_CELL)}`;
    let cell = cells.get(key);
    if (!cell) {
      cell = { n: 0, sx: 0, sy: 0 };
      cells.set(key, cell);
    }
    cell.n += 1;
    cell.sx += node.x;
    cell.sy += node.y;
    // The first cell to reach the highest count wins a tie, so the result is deterministic.
    if (!best || cell.n > best.n) best = cell;
  }
  if (!best || best.n < ANCHOR_MIN_MEMBERS) return null;
  return { x: best.sx / best.n, y: best.sy / best.n };
}

const FILTERS: readonly TierFilter[] = ['all', 'text', 'review'];

function buildDisplayRegions(
  clusters: readonly AtlasCluster[],
  regions: ReadonlyMap<number, Region>,
  nodes: readonly AtlasNode[]
): Map<string, DisplayRegion> {
  const display = new Map<string, DisplayRegion>();
  const named = clusters
    .filter((c) => c.id >= 0)
    .sort((a, b) => numeralOf(a.label) - numeralOf(b.label) || a.id - b.id);
  for (const cluster of named) {
    const key = regionKeyOf(cluster.label);
    if (!key) continue;
    let region = display.get(key);
    if (!region) {
      const label = baseRegionLabel(cluster.label);
      region = {
        key,
        label,
        area: areaOf(label),
        clusterIds: [],
        notes: [],
        members: [],
        counts: { all: 0, text: 0, review: 0, abstractOnly: 0 },
        anchors: { all: null, text: null, review: null },
      };
      display.set(key, region);
    }
    region.clusterIds.push(cluster.id);
    const note = cluster.label_note?.trim();
    if (note) region.notes.push(note);
    const source = regions.get(cluster.id);
    if (source) source.displayKey = key;
  }

  const visible: Record<TierFilter, Map<string, AtlasNode[]>> = { all: new Map(), text: new Map(), review: new Map() };
  for (const node of nodes) {
    const key = regions.get(node.c)?.displayKey;
    const region = key ? display.get(key) : undefined;
    if (!key || !region) continue;
    const tier = tierOf(node);
    region.members.push(node.id);
    region.counts.all += 1;
    if (tier === 'review') region.counts.review += 1;
    if (tier === 'abstract') region.counts.abstractOnly += 1;
    if (tier !== 'none') region.counts.text += 1;
    for (const filter of FILTERS) {
      if (!passesFilter(tier, filter)) continue;
      const list = visible[filter].get(key);
      if (list) list.push(node);
      else visible[filter].set(key, [node]);
    }
  }
  for (const region of display.values()) {
    for (const filter of FILTERS) region.anchors[filter] = densestCellMean(visible[filter].get(region.key) ?? []);
  }
  return display;
}

/** A display region's papers under a filter. */
export function displayCount(region: DisplayRegion, filter: TierFilter): number {
  if (filter === 'all') return region.counts.all;
  if (filter === 'text') return region.counts.text;
  return region.counts.review;
}

/** The display region a paper sits in, or undefined for a paper in no named region. */
export function displayRegionOf(atlas: Atlas, node: AtlasNode): DisplayRegion | undefined {
  const key = atlas.regions.get(node.c)?.displayKey;
  return key ? atlas.displayRegions.get(key) : undefined;
}

/** "Go to a region" (SPEC §7.3, R2–R4): one group per research area, regions A–Z, each with its visible count. */
export interface RegionMenuGroup {
  area: AreaId;
  label: string;
  options: Array<{ key: string; label: string; count: number }>;
}

export function regionMenu(atlas: Atlas, filter: TierFilter): RegionMenuGroup[] {
  return AREA_IDS.map((area) => ({
    area,
    label: AREA_NAME[area],
    options: [...atlas.displayRegions.values()]
      .filter((r) => r.area === area && r.members.length > 0)
      .sort((a, b) => a.label.localeCompare(b.label, 'en'))
      .map((r) => ({ key: r.key, label: r.label, count: displayCount(r, filter) })),
  })).filter((group) => group.options.length > 0);
}

/** A region's papers under a filter, for the region view: reviews first, then abstracts, then the rest; most-cited first within each. */
export function regionPapers(atlas: Atlas, region: DisplayRegion, filter: TierFilter): AtlasNode[] {
  const out: AtlasNode[] = [];
  for (const id of region.members) {
    const node = atlas.byId.get(id);
    if (node && passesFilter(tierOf(node), filter)) out.push(node);
  }
  return out.sort((a, b) => TIER_RANK[tierOf(b)] - TIER_RANK[tierOf(a)] || b.cc - a.cc);
}

/** Similar papers per paper id, as [neighbour id, similarity weight] pairs. */
export type Adjacency = Map<string, [string, number][]>;

/**
 * The filter on arrival: SPEC §7.2's named fallback, 'text' (reviews and
 * abstracts). The spec's first choice was 'all', on condition that the
 * no-summary layer read as a faint texture at the overview. Package 4 measured
 * it at the laptop size forming a near-solid patch (the 1,278 no-summary papers
 * of one region cover up to 87% of a 32px window), so the fallback applies.
 * Readers reach every paper with "All papers", and a selected paper and its
 * similar papers are drawn whatever the filter.
 */
export const DEFAULT_FILTER: TierFilter = 'text';

/**
 * The filter a reader starts with until they choose one. Where the page can
 * only be a list (below 860px, or without WebGL), 'all': the fallback above
 * answers a map problem (the no-summary layer massing into grey patches),
 * which a list cannot have, and the list's first rows are reviews either way
 * because it sorts reviews first. A map-capable screen keeps DEFAULT_FILTER in
 * both its views, so switching between Map and List never moves the filter.
 */
export function defaultFilterFor(listOnly: boolean): TierFilter {
  return listOnly ? 'all' : DEFAULT_FILTER;
}

export function buildAtlas(nodes: AtlasNode[], clusters: AtlasCluster[]): Atlas {
  const regions = new Map<number, Region>();
  for (const cluster of clusters) {
    // id < 0 is the "Unclustered" bucket: a real node state, but never a
    // named region on the map.
    regions.set(cluster.id, {
      id: cluster.id,
      label: cluster.label,
      note: cluster.label_note,
      members: [],
      reviewed: 0,
      text: 0,
      cx: 0,
      cy: 0,
      area: cluster.id < 0 ? 'other' : areaOf(cluster.label),
      displayKey: null,
    });
  }

  const byId = new Map<string, AtlasNode>();
  const titles = new Map<string, string>();
  const searchTitles: string[] = [];
  const searchVenues: string[] = [];
  const counts: TierCounts = { all: 0, text: 0, review: 0, abstractOnly: 0, none: 0 };
  for (const node of nodes) {
    byId.set(node.id, node);
    const title = displayTitle(node.t);
    titles.set(node.id, title);
    searchTitles.push(title.toLowerCase());
    searchVenues.push((node.v || '').toLowerCase());
    const tier = tierOf(node);
    counts.all += 1;
    if (tier === 'review') counts.review += 1;
    else if (tier === 'abstract') counts.abstractOnly += 1;
    else counts.none += 1;
    const region = regions.get(node.c);
    if (!region) continue;
    region.members.push(node.id);
    region.cx += node.x;
    region.cy += node.y;
    if (tier === 'review') region.reviewed += 1;
    if (tier !== 'none') region.text += 1;
  }
  counts.text = counts.review + counts.abstractOnly;

  // Region counts are what the reader can actually find: named regions
  // (never the Unclustered bucket) that hold at least one paper, or at
  // least one reviewed paper for the reviewed-only view.
  let regionsWithPapers = 0;
  let regionsWithReview = 0;
  for (const region of regions.values()) {
    const n = region.members.length || 1;
    region.cx /= n;
    region.cy /= n;
    if (region.id < 0) continue;
    if (region.members.length > 0) regionsWithPapers += 1;
    if (region.reviewed > 0) regionsWithReview += 1;
  }

  const displayRegions = buildDisplayRegions(clusters, regions, nodes);
  let displayRegionsWithPapers = 0;
  for (const region of displayRegions.values()) if (region.members.length > 0) displayRegionsWithPapers += 1;

  return {
    nodes,
    byId,
    regions,
    reviewed: counts.review,
    regionsWithPapers,
    regionsWithReview,
    counts,
    titles,
    displayRegions,
    displayRegionsWithPapers,
    search: { titles: searchTitles, venues: searchVenues },
  };
}

/** The research area a paper's region belongs to; 'other' for a paper in no named region. */
export function paperArea(atlas: Atlas | null, node: AtlasNode): AreaId {
  return atlas?.regions.get(node.c)?.area ?? 'other';
}

/** A paper's display title: markup removed and entities decoded (SPEC §9.4). Never the raw `t`. */
export function titleOf(atlas: Atlas | null, node: AtlasNode): string {
  return atlas?.titles.get(node.id) ?? displayTitle(node.t);
}

/* --- size and draw order (SPEC §6.5) ---------------------------------------------- */

/** Draw order and the map's per-node `tier` attribute: no summary 0, abstract 1, review 2. */
export const TIER_RANK: Record<Tier, 0 | 1 | 2> = { none: 0, abstract: 1, review: 2 };

/**
 * One citation scale for every tier, `s` being 1 + log10(1 + citations). The
 * review layer is lifted by a small offset and the no-summary layer lowered by
 * the same, so sizes stay comparable across tiers.
 */
export function nodeSize(s: number, tier: Tier): number {
  const base = 1.8 * s + 0.6;
  if (tier === 'review') return base + 0.6;
  if (tier === 'abstract') return base;
  return Math.max(1.4, base - 0.6);
}

/** TT1, the tooltip's second line: "{year} · {region} · {tier}". Missing parts are
    left out, and so is the region for a paper in no named region. */
export function tooltipMeta(node: AtlasNode, region: Region | undefined): string {
  return paperMeta(node, region && region.id >= 0 ? region.label : null);
}

/** "{year} · {region} · {tier}" with the region named as given (the map passes the display
    label, SPEC §4.4), or left out when null; a missing year is left out too. */
export function paperMeta(node: AtlasNode, regionLabel: string | null): string {
  return [node.yr ? String(node.yr) : null, regionLabel || null, TIER_LABEL[tierOf(node)]].filter(Boolean).join(' · ');
}

/* --- the "Show" filter (SPEC §7.2) --------------------------------------------- */

/** Cumulative: 'all' keeps every tier, 'text' keeps reviews and abstracts, 'review' keeps reviews. */
export function passesFilter(tier: Tier, filter: TierFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'text') return tier !== 'none';
  return tier === 'review';
}

/**
 * Whether the map draws a paper. A pinned paper (the selected one, or one of
 * its listed similar papers) is drawn whatever the filter, so opening a paper
 * never needs the filter to change (SPEC §6.9, §7.2).
 */
export function isShown(tier: Tier, filter: TierFilter, pinned: boolean): boolean {
  return pinned || passesFilter(tier, filter);
}

/** A region's papers under a filter. */
export function regionCount(region: Region, filter: TierFilter): number {
  if (filter === 'all') return region.members.length;
  if (filter === 'text') return region.text;
  return region.reviewed;
}

/* --- similar papers (SPEC §5.3) ------------------------------------------------- */

/**
 * The edges file as adjacency lists, built in one pass and never attached to
 * the renderer as graph edges. Each pair is listed under both papers; a
 * self-loop is skipped. A pair repeated in the file would be listed twice, and
 * topNeighbours() drops the repeat, so the build stays a single cheap pass.
 */
export function buildAdjacency(edges: readonly AtlasEdge[]): Adjacency {
  const adjacency: Adjacency = new Map();
  const link = (from: string, to: string, weight: number) => {
    const list = adjacency.get(from);
    if (list) list.push([to, weight]);
    else adjacency.set(from, [[to, weight]]);
  };
  for (const [src, dst, weight] of edges) {
    if (src === dst) continue;
    link(src, dst, weight);
    link(dst, src, weight);
  }
  return adjacency;
}

/** The `k` papers most similar to `id`, strongest first, each listed once.
    Equal weights keep their order in the adjacency list (Array.prototype.sort
    is stable). */
export function topNeighbours(adjacency: Adjacency, id: string, k: number): string[] {
  const list = adjacency.get(id);
  if (!list || k <= 0) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const [nid] of [...list].sort((a, b) => b[1] - a[1])) {
    if (nid === id || seen.has(nid)) continue;
    seen.add(nid);
    out.push(nid);
    if (out.length >= k) break;
  }
  return out;
}

/* --- search and lists -------------------------------------------------------------- */

/** Reviewed papers first, then the most-cited. */
function byReviewThenCitations(a: AtlasNode, b: AtlasNode): number {
  return b.r - a.r || b.cc - a.cc;
}

/** Review, then abstract, then no summary; the most-cited first within each. */
function byTierThenCitations(a: AtlasNode, b: AtlasNode): number {
  return TIER_RANK[tierOf(b)] - TIER_RANK[tierOf(a)] || b.cc - a.cc;
}

/** At most this many search results (SPEC §7.1). */
export const SEARCH_LIMIT = 10;

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** Where `q` matches a lowercased title: 0 at its start, 1 at the start of a later word, 2 inside a word, -1 nowhere. */
function titleMatch(title: string, q: string): number {
  let at = title.indexOf(q);
  if (at < 0) return -1;
  if (at === 0) return 0;
  while (at >= 0) {
    if (!LETTER_OR_DIGIT.test(title[at - 1])) return 1;
    at = title.indexOf(q, at + 1);
  }
  return 2;
}

/** Keeps `list` ordered by `cmp` and at most `k` long. A newcomer goes after its
    equals, so ties keep the payload's order. */
function insertTop(list: AtlasNode[], node: AtlasNode, k: number, cmp: (a: AtlasNode, b: AtlasNode) => number): void {
  let i = list.length;
  while (i > 0 && cmp(node, list[i - 1]) < 0) i -= 1;
  if (i >= k) return;
  list.splice(i, 0, node);
  if (list.length > k) list.pop();
}

/**
 * Search results for the box (SPEC §7.1): papers whose display title starts
 * with the query, then papers with a later title word that starts with it,
 * then papers whose title or venue contains it anywhere. Within each group a
 * review comes first, then an abstract, then no summary, then the most-cited;
 * equal papers keep their payload order. At most 10.
 *
 * Every paper is searched, whatever the "Show" filter, on its display title
 * (markup removed, entities decoded), so `"do anything now"` finds a title
 * stored as `&quot;Do Anything Now&quot;`. Whitespace in the query is
 * collapsed, as it is in display titles; under two characters matches nothing.
 */
export function searchPapers(atlas: Atlas, query: string): AtlasNode[] {
  const q = query.trim().replace(/\s+/g, ' ').toLowerCase();
  if (q.length < 2) return [];
  const groups: AtlasNode[][] = [[], [], []];
  const { titles, venues } = atlas.search;
  for (let i = 0; i < atlas.nodes.length; i += 1) {
    let group = titleMatch(titles[i], q);
    if (group < 0 && venues[i].includes(q)) group = 2;
    if (group >= 0) insertTop(groups[group], atlas.nodes[i], SEARCH_LIMIT, byTierThenCitations);
  }
  return [...groups[0], ...groups[1], ...groups[2]].slice(0, SEARCH_LIMIT);
}

/** Rows under a filter, reviewed papers first, then the most-cited (packages
    3-5's list order, which tests/graph-nav.test.mjs pins). The list itself now
    orders with listPapers(). Never sorts `nodes` in place. */
export function listOrder(nodes: readonly AtlasNode[], filter: TierFilter): AtlasNode[] {
  return nodes.filter((n) => passesFilter(tierOf(n), filter)).sort(byReviewThenCitations);
}

/** The year, newest first; papers with no year last. */
function byYearThenCitations(a: AtlasNode, b: AtlasNode): number {
  if (a.yr !== b.yr) {
    if (a.yr == null) return 1;
    if (b.yr == null) return -1;
    return b.yr - a.yr;
  }
  return b.cc - a.cc;
}

/** LS3: Reviews first (tier, then citations), Most cited, Newest (year with no year last, then citations). */
const LIST_ORDER: Record<ListSort, (a: AtlasNode, b: AtlasNode) => number> = {
  reviews: byTierThenCitations,
  cited: (a, b) => b.cc - a.cc,
  newest: byYearThenCitations,
};

/** What the list shows (SPEC §10): the "Show" filter, a display region or null for all, and the order. */
export interface ListQuery {
  filter: TierFilter;
  regionKey: string | null;
  sort: ListSort;
}

/**
 * The list's rows: the papers the filter keeps, narrowed to one display region
 * when one is chosen (a key the atlas does not know narrows nothing), in the
 * chosen order. Equal papers keep their payload order. Never sorts
 * `atlas.nodes` in place.
 */
export function listPapers(atlas: Atlas, { filter, regionKey, sort }: ListQuery): AtlasNode[] {
  const region = regionKey ? atlas.displayRegions.get(regionKey) : undefined;
  const pool: AtlasNode[] = [];
  if (region) {
    for (const id of region.members) {
      const node = atlas.byId.get(id);
      if (node && passesFilter(tierOf(node), filter)) pool.push(node);
    }
  } else {
    for (const node of atlas.nodes) if (passesFilter(tierOf(node), filter)) pool.push(node);
  }
  return pool.sort(LIST_ORDER[sort]);
}

/** "Start with a well-known paper" (SPEC §8.2): the `k` most-cited papers that
    have a review. Equal citation counts keep the payload's order. */
export function startWithPapers(nodes: readonly AtlasNode[], k = 3): AtlasNode[] {
  return nodes
    .filter((n) => tierOf(n) === 'review')
    .sort((a, b) => b.cc - a.cc)
    .slice(0, k);
}

/** LS10, a list row's meta line: "{year} · {venue} · {n} citations", the venue as
    displayVenue() gives it, with empty parts (and a zero citation count) left out. */
export function rowMeta(node: AtlasNode): string {
  return [node.yr ? String(node.yr) : null, displayVenue(node.v) || null, node.cc > 0 ? citationsText(node.cc) : null]
    .filter(Boolean)
    .join(' · ');
}

/** "2025 · Region · Review": the second line of a search result (S5). */
export function nodeSubtitle(node: AtlasNode, region: Region | undefined): string {
  // The display label (no roman numeral, SPEC §4.4), and nothing for a paper in no named region.
  return paperMeta(node, region && region.id >= 0 ? baseRegionLabel(region.label) : null);
}
