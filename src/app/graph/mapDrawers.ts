// Sigma's label and hover drawers for /graph (SPEC §6.8). Client code with no
// React; the only imports are a type and the pure text helpers, and nothing
// touches the DOM at module scope.
//
// Sigma's own drawers paint every label in `labelColor` (black unless told
// otherwise) and paint the hovered label on a hard-coded white slab. Fixing
// only the colour would put light text on that white slab in dark mode, so
// both drawers are replaced in one change, and they read the theme at draw
// time:
// - ordinary labels: theme-secondary text with a halo in the plate colour,
//   never at the overview, collision-checked, ellipsized to the zoom tier;
// - the selected paper: an ink ring and its title on a chip in the theme's
//   background colour with a border (never white);
// - similar papers: a secondary ring and a haloed label;
// - a hovered paper: a ring only (the DOM tooltip carries its text).
//
// Placement of the chip and the similar-paper labels is decided once per frame
// in sigma's beforeRender (placeHighlights), because sigma also redraws the
// hover layer on its own when the pointer enters or leaves a node, without a
// beforeRender. The drawers only read those decisions.
//
// Layers: sigma draws node discs (WebGL), then the label canvas, then the
// hover canvas, then the discs of highlighted and hovered nodes again (WebGL)
// on top. Only the selected paper is highlighted, so its chip (hover canvas)
// can never sit under another disc; similar papers are drawn above ordinary
// dots by z-index, and their rings and labels go on the label canvas.

import type { NodeHoverDrawingFunction, NodeLabelDrawingFunction } from 'sigma/rendering';
import { ellipsize } from './atlasText';

/** A rectangle in plate pixels (the sigma container's coordinates). */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A drawn label, for the dev-only measurement hook. */
export interface LabelBox extends Box {
  /** the string actually drawn, ellipsis included */
  text: string;
  /** the full display title the label stands for */
  title: string;
  kind: 'label' | 'similar' | 'selected';
}

/** Theme colours, read from the CSS variables whenever the theme changes. */
export interface DrawTheme {
  /** --color-text: chip text, the selected and hover rings, similar-paper labels */
  text: string;
  /** --color-text-secondary: ordinary labels and similar-paper rings */
  textSecondary: string;
  /** --color-bg: the chip's fill */
  bg: string;
  /** --color-border: the chip's outline */
  border: string;
  /** --color-bg-secondary: the plate, so the label halo */
  canvas: string;
}

/** Semantic zoom (SPEC §6.8): overview below 2× the fitted zoom, close from 6×. */
export type ZoomTier = 'overview' | 'mid' | 'close';

export function zoomTier(fitRatio: number, ratio: number): ZoomTier {
  const z = fitRatio / ratio;
  if (!(z >= 2)) return 'overview';
  return z < 6 ? 'mid' : 'close';
}

/* Widths are caps on the drawn box, halo or padding included, so no canvas
   text is ever wider than 260px: ordinary labels at the close tier 256 + 3
   halo, the chip 250 + 10 padding, similar papers 220 + 3. */
export const LABEL_MAX_PX: Record<Exclude<ZoomTier, 'overview'>, number> = { mid: 170, close: 256 };
export const CHIP_MAX_PX = 250;
export const SIMILAR_MAX_PX = 220;

const HALO = 1.5;
/** Clear space kept between any two labels. */
const GAP = 2;
/** Labels stay this far inside the plate. */
const EDGE = 4;
const LABEL_HALF_H = 8;
const CHIP_PAD_X = 5;
const CHIP_HALF_H = 10;
/** Fitted strings kept before the cache starts over. */
const FIT_CACHE_MAX = 20000;

export function boxesHit(a: Box, b: Box, gap = 0): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}

/** The box of a haloed label whose text starts (right side) or ends (left side) at `textX`. */
export function labelBox(textX: number, y: number, textW: number, side: 'right' | 'left'): Box {
  const x = side === 'right' ? textX - HALO : textX - textW - HALO;
  return { x, y: y - LABEL_HALF_H, w: textW + 2 * HALO, h: 2 * LABEL_HALF_H };
}

/** Where the selected paper's chip may go, in order: right of the disc, left, above, below (each kept inside the plate). */
export function chipCandidates(x: number, y: number, r: number, textW: number, width: number): Array<Box & { side: 'right' | 'left' }> {
  const w = textW + 2 * CHIP_PAD_X;
  const h = 2 * CHIP_HALF_H;
  const centred = Math.min(Math.max(EDGE, x - w / 2), width - EDGE - w);
  return [
    { x: x + r + 8, y: y - CHIP_HALF_H, w, h, side: 'right' },
    { x: x - r - 8 - w, y: y - CHIP_HALF_H, w, h, side: 'left' },
    { x: centred, y: y - r - 6 - h, w, h, side: 'right' },
    { x: centred, y: y + r + 6, w, h, side: 'right' },
  ];
}

/** The chip when no candidate is free: right of the disc, or left when the right would leave the plate. */
export function chipBox(x: number, y: number, r: number, textW: number, width: number): Box & { side: 'right' | 'left' } {
  const w = textW + 2 * CHIP_PAD_X;
  const right = x + r + 8;
  const left = x - r - 8 - w;
  let side: 'right' | 'left' = 'right';
  let bx = right;
  if (right + w > width - EDGE) {
    if (left >= EDGE) {
      side = 'left';
      bx = left;
    } else {
      bx = Math.max(EDGE, width - EDGE - w);
    }
  }
  return { x: bx, y: y - CHIP_HALF_H, w, h: 2 * CHIP_HALF_H, side };
}

/** Vertical offsets tried for a similar paper's label, on each side: level with the disc first. */
const SIMILAR_OFFSETS = [0, -18, 18, -36, 36];
/** Narrower caps tried, in order, when a similar paper's full-width label finds no room anywhere: a shortened title beats no title. */
const SIMILAR_FALLBACK_PX = [150, 100];

/** What the drawers draw for a selected or similar paper this frame, relative to its disc centre. */
interface Placement {
  text: string;
  textW: number;
  side: 'right' | 'left';
  /** chip: the box's left edge; label: the text's anchor (its left edge on the right side, its right edge on the left) */
  dx: number;
  /** chip: the box's top edge; label: the text baseline */
  dy: number;
}

export interface HighlightInput {
  key: string;
  /** plate pixels, this frame */
  x: number;
  y: number;
  /** disc radius in pixels, this frame */
  r: number;
  /** the full display title */
  label: string;
  role: 'selected' | 'similar';
}

interface DrawerOptions {
  theme: () => DrawTheme;
  selected: () => string | null;
  isSimilar: (key: string) => boolean;
  /** the label font family (the page's Inter, then fallbacks) */
  family: () => string;
  /** record every drawn label box (dev-only measurement hook) */
  debug: boolean;
}

export function createAtlasDrawers({ theme, selected, isSimilar, family, debug }: DrawerOptions) {
  let tier: ZoomTier = 'overview';
  let width = 0;
  let height = 0;
  /** Everything a label may not overlap this frame: DOM controls, the keep-clear square, region labels, other labels. */
  let occupied: Box[] = [];
  let placements = new Map<string, Placement>();
  let boxes: LabelBox[] = [];

  /* One offscreen context measures every string, in beforeRender and in the
     drawers alike, so a width never depends on which canvas asked. */
  let measureCtx: CanvasRenderingContext2D | null = null;
  let measureFont = '';
  const measure = (font: string, s: string): number => {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    if (!measureCtx) return s.length * 6;
    if (font !== measureFont) {
      measureCtx.font = font;
      measureFont = font;
    }
    return measureCtx.measureText(s).width;
  };
  // font | max width | node -> the fitted string and its width.
  const fitted = new Map<string, { text: string; w: number }>();
  const fit = (key: string, label: string, font: string, maxPx: number) => {
    const id = `${font}|${maxPx}|${key}`;
    let hit = fitted.get(id);
    if (!hit) {
      // A long session can visit most of the corpus at two widths; start over rather than grow without bound.
      if (fitted.size >= FIT_CACHE_MAX) fitted.clear();
      const text = ellipsize(label, maxPx, (s) => measure(font, s));
      hit = { text, w: text ? measure(font, text) : 0 };
      fitted.set(id, hit);
    }
    return hit;
  };

  const insidePlate = (b: Box) => b.x >= EDGE && b.y >= EDGE && b.x + b.w <= width - EDGE && b.y + b.h <= height - EDGE;
  const free = (b: Box) => insidePlate(b) && !occupied.some((o) => boxesHit(b, o, GAP));

  const labelFont = (weight: string, size: number) => `${weight} ${size}px ${family()}`;

  /** Start a full frame: the zoom tier, the plate size and the fixed obstacles. */
  function beginFrame(nextTier: ZoomTier, plateWidth: number, plateHeight: number, obstacles: readonly Box[]) {
    tier = nextTier;
    width = plateWidth;
    height = plateHeight;
    occupied = obstacles.slice();
    placements = new Map();
    boxes = [];
  }

  /**
   * Decide this frame's chip and similar-paper labels, before region labels
   * and ordinary labels are placed, and reserve their boxes so nothing else
   * overprints them. Every emphasised disc and its ring is reserved first, so
   * no chip or label ever hides one. The chip tries right, left, above and
   * below, and is drawn even when none is free. A similar paper's label tries
   * each side level with its disc, then nudged up or down (a short leader
   * then joins it to its ring), then all of that again ellipsized to a
   * narrower cap; one with no room even then is left out (its ring still
   * shows).
   */
  function placeHighlights(items: readonly HighlightInput[]) {
    const onPlate = items.filter(
      (item) => item.x >= -item.r && item.y >= -item.r && item.x <= width + item.r && item.y <= height + item.r
    );
    for (const item of onPlate) {
      const ring = item.r + (item.role === 'selected' ? 4 : 3.5);
      occupied.push({ x: item.x - ring, y: item.y - ring, w: 2 * ring, h: 2 * ring });
    }
    for (const item of onPlate) {
      if (item.role !== 'selected') continue;
      const font = labelFont('600', 12);
      const { text, w } = fit(item.key, item.label, font, CHIP_MAX_PX);
      if (!text) continue;
      const box = chipCandidates(item.x, item.y, item.r, w, width).find(free) ?? chipBox(item.x, item.y, item.r, w, width);
      placements.set(item.key, { text, textW: w, side: box.side, dx: box.x - item.x, dy: box.y - item.y });
      occupied.push(box);
      if (debug) boxes.push({ x: box.x, y: box.y, w: box.w, h: box.h, text, title: item.label, kind: 'selected' });
    }
    for (const item of onPlate) {
      if (item.role !== 'similar') continue;
      const font = labelFont('500', 11);
      let found: { side: 'right' | 'left'; box: Box; dx: number; dy: number; text: string; w: number } | null = null;
      // The full cap first, so a label that fits as before is placed exactly as before.
      for (const maxPx of [SIMILAR_MAX_PX, ...SIMILAR_FALLBACK_PX]) {
        const { text, w } = fit(item.key, item.label, font, maxPx);
        if (!text) break;
        for (const offset of SIMILAR_OFFSETS) {
          for (const side of ['right', 'left'] as const) {
            // r + 7 keeps the label clear of its own reserved ring (r + 3.5) by more than GAP, at every offset.
            const dx = side === 'right' ? item.r + 7 : -item.r - 7;
            const box = labelBox(item.x + dx, item.y + offset, w, side);
            if (free(box)) {
              found = { side, box, dx, dy: offset + 4, text, w };
              break;
            }
          }
          if (found) break;
        }
        if (found) break;
      }
      if (!found) continue;
      placements.set(item.key, { text: found.text, textW: found.w, side: found.side, dx: found.dx, dy: found.dy });
      occupied.push(found.box);
      if (debug) boxes.push({ ...found.box, text: found.text, title: item.label, kind: 'similar' });
    }
  }

  /** Reserve a box placed outside the drawers this frame (a region label). */
  function reserve(box: Box) {
    occupied.push(box);
  }

  /** Everything reserved so far this frame: the obstacles region labels must avoid (SPEC §6.7). */
  function reserved(): readonly Box[] {
    return occupied;
  }

  /** Whether a box is free of the plate edge and of everything reserved so far. */
  function isFree(box: Box) {
    return free(box);
  }

  const halo = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fill: string, t: DrawTheme) => {
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2 * HALO;
    ctx.strokeStyle = t.canvas;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  };

  /** A similar paper's secondary ring and, when it found room this frame, its label. */
  const drawSimilar = (ctx: CanvasRenderingContext2D, key: string, x: number, y: number, r: number) => {
    const t = theme();
    ctx.beginPath();
    ctx.arc(x, y, r + 2.5, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = t.textSecondary;
    ctx.stroke();
    const placement = placements.get(key);
    if (!placement) return;
    const tx = x + placement.dx;
    const baseline = y + placement.dy;
    if (placement.dy !== 4) {
      // Nudged off the disc's level: a short leader from the ring to the label's near end.
      const ty = baseline - 4;
      const angle = Math.atan2(ty - y, tx - x);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * (r + 2.5), y + Math.sin(angle) * (r + 2.5));
      ctx.lineTo(tx + (placement.side === 'right' ? -1 : 1), ty);
      ctx.lineWidth = 1;
      ctx.strokeStyle = t.textSecondary;
      ctx.stroke();
    }
    ctx.font = labelFont('500', 11);
    ctx.textAlign = placement.side === 'right' ? 'left' : 'right';
    ctx.textBaseline = 'alphabetic';
    halo(ctx, placement.text, tx, baseline, t.text, t);
  };

  const drawLabel: NodeLabelDrawingFunction = (ctx, d, settings) => {
    const key = String(d.key);
    // Similar papers come through here on every frame (forceLabel), at any zoom.
    if (key !== selected() && isSimilar(key)) {
      drawSimilar(ctx, key, d.x, d.y, d.size);
      return;
    }
    if (!d.label || d.highlighted || tier === 'overview') return;
    const font = `${settings.labelWeight} ${settings.labelSize}px ${settings.labelFont}`;
    const { text, w } = fit(key, d.label, font, LABEL_MAX_PX[tier]);
    if (!text) return;
    let side: 'right' | 'left' = 'right';
    let textX = d.x + d.size + 4;
    let box = labelBox(textX, d.y, w, side);
    if (!free(box)) {
      side = 'left';
      textX = d.x - d.size - 4;
      box = labelBox(textX, d.y, w, side);
      if (!free(box)) return;
    }
    occupied.push(box);
    const t = theme();
    ctx.font = font;
    ctx.textAlign = side === 'right' ? 'left' : 'right';
    ctx.textBaseline = 'alphabetic';
    halo(ctx, text, textX, d.y + 4, t.textSecondary, t);
    if (debug) boxes.push({ ...box, text, title: d.label, kind: 'label' });
  };

  const drawHover: NodeHoverDrawingFunction = (ctx, d) => {
    const key = String(d.key);
    const t = theme();
    const role = key === selected() ? 'selected' : isSimilar(key) ? 'similar' : 'hover';
    if (role === 'similar') {
      // A hovered similar paper: the same ring and label as on the label canvas.
      drawSimilar(ctx, key, d.x, d.y, d.size);
      return;
    }
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.size + 3, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = t.text;
    ctx.stroke();
    if (role === 'hover') return;
    // The selected paper's chip: side and offset were decided in beforeRender, never here.
    const placement = placements.get(key);
    if (!placement) return;
    const box = { x: d.x + placement.dx, y: d.y + placement.dy, w: placement.textW + 2 * CHIP_PAD_X, h: 2 * CHIP_HALF_H };
    ctx.beginPath();
    roundedRect(ctx, box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1, 4);
    ctx.fillStyle = t.bg;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = t.border;
    ctx.stroke();
    ctx.font = labelFont('600', 12);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = t.text;
    ctx.fillText(placement.text, box.x + CHIP_PAD_X, box.y + CHIP_HALF_H + 4.5);
  };

  return {
    beginFrame,
    placeHighlights,
    reserve,
    reserved,
    isFree,
    drawLabel,
    drawHover,
    /** The boxes drawn in the last full frame (empty unless `debug`). */
    drawnBoxes: () => boxes,
    /** Forget measured strings, e.g. once the web font has loaded. */
    clearCache: () => {
      fitted.clear();
      measureFont = '';
    },
  };
}

export type AtlasDrawers = ReturnType<typeof createAtlasDrawers>;

/** A rounded rectangle path (CanvasRenderingContext2D.roundRect is missing in older Safari). */
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
