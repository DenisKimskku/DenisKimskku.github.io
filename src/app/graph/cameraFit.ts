// Camera framing for /graph (SPEC §6.11). Pure: no JSX, no DOM, and no React,
// sigma, graphology, next/* or @/ imports, so tests/graph-camera.test.mjs
// loads it under plain Node. Keep the syntax erasable (no enums, namespaces or
// parameter properties): CI imports it with Node 24's type stripping.
//
// One fit for every framing (the overview, the Fit button, a filter change, a
// selection and a region). The map hook collects the target papers, takes
// their quantile box, measures that box in pixels at camera ratio 1 (pixel
// extent scales exactly with 1 / ratio, because the camera never rotates),
// asks fitRatio() for the ratio that fits it inside the padded plate, and
// offsets the centre so the box sits in the middle of that padded area.

/** An axis-aligned box in graph units. */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Clear space kept inside the plate, in pixels: top, right, bottom, left. */
export interface Padding {
  t: number;
  r: number;
  b: number;
  l: number;
}

/** A rectangle in plate pixels. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One framing from the SPEC §6.11 table: which quantiles of the targets, and how much padding. */
export interface FitSpec {
  lo: number;
  hi: number;
  pad: Padding;
}

/** The camera's zoom limits (sigma's minCameraRatio and maxCameraRatio). */
export const MIN_RATIO = 0.02;
export const MAX_RATIO = 2;

/** The overview and the Fit button: every visible paper, 1st to 99th percentile, so a
    handful of isolated outliers may fall outside the plate by design. */
export const FIT_OVERVIEW: FitSpec = { lo: 0.01, hi: 0.99, pad: { t: 64, r: 32, b: 32, l: 32 } };
/** A selection: the paper and its listed similar papers, every one of them. */
export const FIT_SELECTION: FitSpec = { lo: 0, hi: 1, pad: { t: 96, r: 96, b: 72, l: 96 } };
/** A focused region: its visible members, 10th to 90th percentile. */
export const FIT_REGION: FitSpec = { lo: 0.1, hi: 0.9, pad: { t: 96, r: 48, b: 48, l: 48 } };

/** A filter change refits only while the camera is still this close to the last fit (a share of its ratio). */
export const AT_FIT_TOLERANCE = 0.05;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The value at quantile `q` (0..1) of an ascending array, interpolating
 * linearly between neighbouring ranks: q = 0 is the minimum, q = 1 the maximum.
 */
export function quantile(sorted: ArrayLike<number>, q: number): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  const h = (n - 1) * clamp(q, 0, 1);
  const lo = Math.floor(h);
  const hi = Math.min(n - 1, lo + 1);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

/**
 * The lo–hi quantile box of a set of points, each axis taken on its own
 * sorted copy (the inputs are never reordered). Null when there are no points.
 */
export function quantileBox(xs: ArrayLike<number>, ys: ArrayLike<number>, lo: number, hi: number): Bounds | null {
  const n = Math.min(xs.length, ys.length);
  if (n === 0) return null;
  const sx = Float64Array.from({ length: n }, (_, i) => xs[i]).sort();
  const sy = Float64Array.from({ length: n }, (_, i) => ys[i]).sort();
  return { minX: quantile(sx, lo), maxX: quantile(sx, hi), minY: quantile(sy, lo), maxY: quantile(sy, hi) };
}

/**
 * The camera ratio that fits a box inside the padded plate:
 * clamp(max(dx / (W − l − r), dy / (H − t − b)), min, max), where dx and dy
 * are the box's pixel extents at camera ratio 1. A padded area with no room
 * left fits nothing, so the ratio is the most zoomed-out allowed.
 */
export function fitRatio(
  extent: { dx: number; dy: number },
  view: { width: number; height: number; pad: Padding },
  limits: { min: number; max: number }
): number {
  const w = view.width - view.pad.l - view.pad.r;
  const h = view.height - view.pad.t - view.pad.b;
  if (!(w > 0) || !(h > 0)) return limits.max;
  const ratio = Math.max(Math.abs(extent.dx) / w, Math.abs(extent.dy) / h);
  return clamp(Number.isFinite(ratio) ? ratio : limits.max, limits.min, limits.max);
}

/** How long a camera flight takes: longer for a bigger change of zoom, from 250 to 700 ms. */
export function flyDuration(r0: number, r1: number): number {
  const change = Math.abs(Math.log2(r1 / r0));
  return clamp(250 + 120 * (Number.isFinite(change) ? change : 0), 250, 700);
}

/** Whether a camera is still where a fit put it: ratio and position within `tolerance` of the fit's ratio. */
export function nearFit(
  cam: { x: number; y: number; ratio: number },
  fit: { x: number; y: number; ratio: number } | null,
  tolerance = AT_FIT_TOLERANCE
): boolean {
  if (!fit) return false;
  const slack = tolerance * fit.ratio;
  return Math.abs(cam.ratio - fit.ratio) <= slack && Math.abs(cam.x - fit.x) <= slack && Math.abs(cam.y - fit.y) <= slack;
}

/**
 * The padding grown, where needed, so the padded area stays clear of the
 * plate's own controls (the key, the toolbar, the zoom cluster, the chips) and
 * the keep-clear corner. For each obstacle that reaches into the area, the
 * side whose shrink keeps the most area wins: the bottom-left key pushes the
 * left edge in, not the bottom edge up. Used for selection and region fits,
 * whose papers must be visible, not under a control.
 */
export function clearPadding(view: { width: number; height: number }, pad: Padding, obstacles: readonly Rect[], gap = 12): Padding {
  const out = { ...pad };
  for (const o of obstacles) {
    if (!(o.w > 0) || !(o.h > 0)) continue;
    const left = out.l;
    const top = out.t;
    const right = view.width - out.r;
    const bottom = view.height - out.b;
    const hits = o.x - gap < right && o.x + o.w + gap > left && o.y - gap < bottom && o.y + o.h + gap > top;
    if (!hits) continue;
    const options: Array<[keyof Padding, number, number]> = [
      ['l', o.x + o.w + gap, (right - (o.x + o.w + gap)) * (bottom - top)],
      ['r', view.width - (o.x - gap), (o.x - gap - left) * (bottom - top)],
      ['t', o.y + o.h + gap, (right - left) * (bottom - (o.y + o.h + gap))],
      ['b', view.height - (o.y - gap), (right - left) * (o.y - gap - top)],
    ];
    let best: [keyof Padding, number, number] | null = null;
    for (const option of options) if (option[2] > 0 && (!best || option[2] > best[2])) best = option;
    if (best) out[best[0]] = Math.max(out[best[0]], best[1]);
  }
  return out;
}

/** The padded area of a plate, in plate pixels. */
export function safeArea(view: { width: number; height: number }, pad: Padding): Rect {
  return { x: pad.l, y: pad.t, w: view.width - pad.l - pad.r, h: view.height - pad.t - pad.b };
}
