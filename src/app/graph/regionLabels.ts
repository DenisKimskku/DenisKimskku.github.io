// Region-label placement for /graph (SPEC §6.7). Pure: no JSX, no DOM, and no
// React, sigma, graphology, next/* or @/ imports, so tests/graph-camera.test.mjs
// loads it under plain Node. Keep the syntax erasable.
//
// Each frame the map hook hands over the candidate pills (already ranked, each
// with its anchor projected into plate pixels and its measured size), the
// obstacles (the plate's controls, the keep-clear corner, the selected paper's
// chip and its similar papers' labels) and the pills shown last frame. Pills
// shown last frame are tried first, so labels do not blink while panning.

/** Semantic zoom tier (the same three as the node labels). */
export type LabelTier = 'overview' | 'mid' | 'close';

/** A rectangle in plate pixels. */
export interface LabelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A pill that could be shown: its anchor (the pill's centre) and its measured size. */
export interface LabelCandidate {
  key: string;
  /** anchor, plate pixels */
  x: number;
  y: number;
  /** pill size, pixels */
  w: number;
  h: number;
}

/** A pill to show this frame, as a box in plate pixels (rounded, so text stays crisp). */
export interface PlacedLabel extends LabelRect {
  key: string;
}

/** Pills stay this far inside the plate. */
export const LABEL_INSET = 6;
/** Clear space around a placed pill that another pill may not enter: 6px across, 4px down. */
export const LABEL_PAD_X = 6;
export const LABEL_PAD_Y = 4;

/** Per zoom tier: how many pills at most, and how many visible papers a region needs to get one. */
export function regionLabelRule(tier: LabelTier): { max: number; minMembers: number } {
  if (tier === 'overview') return { max: 14, minMembers: 12 };
  if (tier === 'mid') return { max: 24, minMembers: 4 };
  // Close in, the location chip names the region instead (SPEC §6.9).
  return { max: 0, minMembers: Infinity };
}

/** Pill priority: visible reviewed papers, then visible papers, both descending. Stable for ties. */
export function rankRegions<T extends { reviewed: number; members: number }>(regions: readonly T[]): T[] {
  return [...regions].sort((a, b) => b.reviewed - a.reviewed || b.members - a.members);
}

const hit = (a: LabelRect, b: LabelRect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** A placed pill grown by the clear space other pills must keep from it. */
export function padded(box: LabelRect): LabelRect {
  return { x: box.x - LABEL_PAD_X, y: box.y - LABEL_PAD_Y, w: box.w + 2 * LABEL_PAD_X, h: box.h + 2 * LABEL_PAD_Y };
}

/**
 * Which pills to show this frame, and where. Candidates arrive in priority
 * order; those in `prevShown` are tried first (keeping that order), then the
 * rest. Each pill is centred on its anchor and rejected when it is not fully
 * inside the plate inset by LABEL_INSET, when it touches an obstacle, or when
 * it enters a pill already placed (padded by LABEL_PAD_X × LABEL_PAD_Y). At
 * most `max` pills are placed.
 */
export function placeRegionLabels(
  candidates: readonly LabelCandidate[],
  obstacles: readonly LabelRect[],
  viewport: { width: number; height: number },
  prevShown: ReadonlySet<string>,
  max: number
): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  if (max <= 0) return placed;
  const ordered = [
    ...candidates.filter((c) => prevShown.has(c.key)),
    ...candidates.filter((c) => !prevShown.has(c.key)),
  ];
  const right = viewport.width - LABEL_INSET;
  const bottom = viewport.height - LABEL_INSET;
  for (const c of ordered) {
    if (placed.length >= max) break;
    if (!Number.isFinite(c.x) || !Number.isFinite(c.y) || !(c.w > 0) || !(c.h > 0)) continue;
    const box: PlacedLabel = { key: c.key, x: Math.round(c.x - c.w / 2), y: Math.round(c.y - c.h / 2), w: c.w, h: c.h };
    if (box.x < LABEL_INSET || box.y < LABEL_INSET || box.x + box.w > right || box.y + box.h > bottom) continue;
    if (obstacles.some((o) => hit(box, o))) continue;
    if (placed.some((p) => hit(box, padded(p)))) continue;
    placed.push(box);
  }
  return placed;
}
