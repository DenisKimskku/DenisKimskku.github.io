// The sigma map for /graph (SPEC §4.1, §4.5): renderer lifecycle, reducers,
// the region-label overlay, the location chip's value, the tooltip, the theme
// observer and the camera. React state reaches the reducers through refs and
// the effects call refresh(); every overlay and tooltip write is imperative,
// so React never re-renders during a pan. The edges file never reaches the
// renderer: similar papers arrive as `neighbourIds`, derived from adjacency
// lists (SPEC §5.3), and only the selected paper's lines to them are graph
// edges (SPEC §6.6).
//
// Encoding (SPEC §5.4, §6.1–§6.5): each node carries its tier rank, research
// area index and size, computed once here. The node reducer mutates sigma's
// own copy of the attributes and reads colours from the PAL tables, so a full
// refresh allocates nothing per node, and a theme switch is one setSetting
// (itself a full refresh) with no per-node graph writes.
//
// Camera (SPEC §6.11): one pixel-exact fit (cameraFit.ts) frames the overview,
// a selection (the paper and its similar papers) and a focused region. The
// camera follows the selection and the region focus by itself, whatever opened
// them (a click, the search, a deep link, the browser's Back), so callers only
// change state.

import { useEffect, useRef, type RefObject } from 'react';
import type SigmaType from 'sigma';
import type { CameraState } from 'sigma/types';
import type GraphologyType from 'graphology';
import { tierOf, type Tier, type TierFilter } from './atlasCopy';
import {
  TIER_RANK,
  displayCount,
  displayRegionOf,
  isShown,
  nodeSize,
  paperMeta,
  passesFilter,
  titleOf,
  type Atlas,
  type DisplayRegion,
  type GraphPoint,
} from './atlasModel';
import { AREA_IDS, AREA_SWATCH, PAL, paintArea } from './atlasPalette';
import {
  FIT_OVERVIEW,
  FIT_REGION,
  FIT_SELECTION,
  MAX_RATIO,
  MIN_RATIO,
  clearPadding,
  fitRatio,
  flyDuration,
  nearFit,
  quantileBox,
  safeArea,
  type Bounds,
  type FitSpec,
  type Padding,
} from './cameraFit';
import type { LocationStore } from './MapChips';
import { createAtlasDrawers, zoomTier, type Box, type DrawTheme, type HighlightInput, type ZoomTier } from './mapDrawers';
import { padded, placeRegionLabels, rankRegions, regionLabelRule, type LabelCandidate } from './regionLabels';

/** What GraphClient may ask of the map. Set once at mount; safe to call before the map exists. */
export interface AtlasMapApi {
  zoomIn(): void;
  zoomOut(): void;
  /** Frame every visible paper: the 1st–99th percentile box (SPEC §6.11). */
  fitAll(): void;
  /** Pan by a share of the viewport (right and down positive): the map's arrow keys. */
  panBy(dx: number, dy: number): void;
  /** Frame the selected paper and its similar papers again (the camera follows a new selection by itself). */
  flyToPaper(id: string): void;
  /** Frame a focused region again (the camera follows a new region focus by itself). */
  focusRegion(key: string): void;
  /** Hide the hover tooltip; true when it was showing (the Escape order, SPEC §7.7). */
  hideTooltip(): boolean;
}

export interface AtlasMapOptions {
  atlas: Atlas | null;
  /** Build the map only while this is true (wide screen with WebGL). */
  enabled: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  overlayRef: RefObject<HTMLDivElement | null>;
  tooltipRef: RefObject<HTMLDivElement | null>;
  /** Where the map writes the region at the centre of a close view (the location chip, SPEC §6.9). */
  locationStore: LocationStore;
  filter: TierFilter;
  selectedId: string | null;
  /** The selected paper's listed similar papers: drawn whatever the filter, joined to it by lines. */
  neighbourIds: readonly string[];
  /** The focused display region (#r=), or null. */
  regionKey: string | null;
  /** Set to the camera API at mount, and back to null at unmount. */
  apiRef: RefObject<AtlasMapApi | null>;
  onOpenPaper: (id: string) => void;
  /** A region label on the map was clicked. */
  onFocusRegion: (key: string) => void;
  /** The renderer could not be loaded or built. */
  onError: () => void;
  /** The papers are placed; the renderer is about to draw its first frame (stage 'draw'). */
  onDrawStart: () => void;
  /** The first frame after the first fit is drawn (stage 'ready'). Called once per build. */
  onFirstRender: () => void;
}

/** What the built map does for the API and the effects; null while there is no map. */
interface MapImpl {
  zoomBy(factor: number): void;
  panBy(dx: number, dy: number): void;
  fitOverview(): void;
  flySelection(): void;
  flyRegion(key: string): void;
  hideTooltip(): boolean;
  /** The camera is still where the last overview fit put it (within 5%). */
  atFit(): boolean;
  /** Lines from the selected paper to its similar papers, rebuilt when either changes. */
  syncEgoEdges(): void;
}

interface CameraTarget {
  x: number;
  y: number;
  ratio: number;
}

/** A region label: one per display region, created once. */
interface Pill {
  el: HTMLButtonElement;
  region: DisplayRegion;
  w: number;
  h: number;
  shown: boolean;
  x: number;
  y: number;
  outlined: boolean;
}

const ZOOM_FACTOR = 1.6;
const ZOOM_MS = 250;
/** The plate's bottom-right square, kept clear for the sitewide ? button (SPEC §3.7). */
const KEEP_CLEAR = 140;
/** The location chip names a region only when its anchor is this close to the view's centre (graph units; the map spans about 15). */
const LOCATION_REACH = 2;
const NO_PINS: ReadonlySet<string> = new Set();
const NO_IDS: readonly string[] = [];
/** Tier rank to tier, for the reducer's filter test without allocating. */
const TIER_BY_RANK: readonly Tier[] = ['none', 'abstract', 'review'];
const FILTERS: readonly TierFilter[] = ['all', 'text', 'review'];
const DEFAULT_THEME: DrawTheme = {
  text: '#1a1a1a',
  textSecondary: '#666666',
  bg: '#fafafa',
  border: '#e5e5e5',
  canvas: '#f5f5f5',
};
/** The camera state at which pixel extents are measured (SPEC §6.11). */
const UNIT_CAMERA: CameraState = { x: 0.5, y: 0.5, ratio: 1, angle: 0 };
/** Region labels (SPEC §6.7): ink text on the plate with the area's swatch. */
const PILL_CLASS =
  'absolute left-0 top-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-(--color-border) bg-(--color-bg)/95 px-2 py-0.5 text-[11.5px] leading-5 font-medium text-(--color-text) shadow-[0_1px_2px_rgb(0_0_0/0.06)] dark:shadow-none cursor-pointer motion-safe:transition-opacity hover:border-(--color-text-muted)';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Sigma's own camera motion. Under reduced motion it is 1 ms, never 0: sigma's
 * animate() divides elapsed time by the duration on its synchronous first
 * step, so 0 gives 0/0 and one frame drawn with a NaN camera. No inertia glide.
 */
function motionSettings() {
  const reduce = reducedMotion();
  return {
    zoomDuration: reduce ? 1 : 250,
    inertiaDuration: reduce ? 1 : 200,
    inertiaRatio: reduce ? 0 : 3,
    doubleClickZoomingDuration: reduce ? 1 : 200,
  };
}

/** Resolve after the browser has painted, so a status-card update shows before blocking work. */
function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.setTimeout(resolve, 0));
  });
}

export function useAtlasMap({
  atlas,
  enabled,
  containerRef,
  overlayRef,
  tooltipRef,
  locationStore,
  filter,
  selectedId,
  neighbourIds,
  regionKey,
  apiRef,
  onOpenPaper,
  onFocusRegion,
  onError,
  onDrawStart,
  onFirstRender,
}: AtlasMapOptions): void {
  const sigmaRef = useRef<SigmaType | null>(null);
  const implRef = useRef<MapImpl | null>(null);
  const filterRef = useRef<TierFilter>(filter);
  const selectedRef = useRef<string | null>(null);
  const neighbourListRef = useRef<readonly string[]>(NO_IDS);
  const neighbourSetRef = useRef<ReadonlySet<string>>(NO_PINS);
  const regionKeyRef = useRef<string | null>(null);
  // The focused region's members, while a region is focused (SPEC §6.9).
  const regionMembersRef = useRef<ReadonlySet<string> | null>(null);
  const darkRef = useRef(false);
  const themeRef = useRef<DrawTheme>(DEFAULT_THEME);
  // The overview fit's camera ratio: the zoom tiers and the selection and
  // region zoom caps are measured against it.
  const fitRatioRef = useRef(1);
  const lastFitRef = useRef<CameraTarget | null>(null);
  // True once the reader has moved the camera since the last programmatic fit
  // (SPEC §6.11): then similar papers arriving late never yank the view.
  const userMovedRef = useRef(false);
  // The camera inputs the last effect run saw, to tell a new selection from
  // similar papers arriving for the same one.
  const cameraInputsRef = useRef<{ selectedId: string | null; neighbourIds: readonly string[]; regionKey: string | null }>({
    selectedId: null,
    neighbourIds: NO_IDS,
    regionKey: null,
  });
  // The latest callbacks, so their identity never rebuilds the map.
  const handlersRef = useRef({ onOpenPaper, onFocusRegion, onError, onDrawStart, onFirstRender });

  useEffect(() => {
    handlersRef.current = { onOpenPaper, onFocusRegion, onError, onDrawStart, onFirstRender };
  });

  /* --- the API: stable, and usable before the map exists -------------------- */

  useEffect(() => {
    apiRef.current = {
      zoomIn: () => implRef.current?.zoomBy(ZOOM_FACTOR),
      zoomOut: () => implRef.current?.zoomBy(1 / ZOOM_FACTOR),
      fitAll: () => implRef.current?.fitOverview(),
      panBy: (dx, dy) => implRef.current?.panBy(dx, dy),
      flyToPaper: (id) => {
        if (selectedRef.current === id) implRef.current?.flySelection();
      },
      focusRegion: (key) => implRef.current?.flyRegion(key),
      hideTooltip: () => implRef.current?.hideTooltip() ?? false,
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef]);

  /* --- keep the sigma reducers in sync with React state -------------------- */

  useEffect(() => {
    filterRef.current = filter;
    const impl = implRef.current;
    if (!impl) return;
    // Refit only if the reader has not moved since the last fit (SPEC §6.11);
    // otherwise keep their place.
    const wasAtFit = impl.atFit();
    sigmaRef.current?.refresh();
    if (wasAtFit) impl.fitOverview();
  }, [filter]);

  // Selection, similar papers and region focus: emphasis, the lines, and the
  // camera. Before the map exists only the refs move; the build reads them
  // and opens on the selection, else the region, else the overview.
  useEffect(() => {
    const prev = cameraInputsRef.current;
    cameraInputsRef.current = { selectedId, neighbourIds, regionKey };
    selectedRef.current = selectedId;
    neighbourListRef.current = neighbourIds;
    neighbourSetRef.current = neighbourIds.length > 0 ? new Set(neighbourIds) : NO_PINS;
    regionKeyRef.current = regionKey;
    const region = regionKey ? atlas?.displayRegions.get(regionKey) : undefined;
    regionMembersRef.current = region ? new Set(region.members) : null;
    const impl = implRef.current;
    if (!impl) return;
    // Keep this full refresh even after syncEgoEdges() cleared the old lines
    // (whose edgesCleared handler already re-indexed every node): that
    // re-index also resets sigma's node extent to a 0..1 placeholder until the
    // next render, and the fits below project through it. This synchronous
    // refresh renders, so the extent is real again before any camera target
    // is computed (measured: without it, a hop's camera lands a few px off).
    impl.syncEgoEdges();
    sigmaRef.current?.refresh();
    if (selectedId) {
      // A new selection flies; similar papers arriving for the same one
      // refit, unless the reader has moved the camera since.
      if (selectedId !== prev.selectedId) impl.flySelection();
      else if (neighbourIds !== prev.neighbourIds && !userMovedRef.current) impl.flySelection();
    } else if (regionKey && (regionKey !== prev.regionKey || prev.selectedId)) {
      // A region focused, or a paper opened inside it closed again (SPEC §6.9).
      impl.flyRegion(regionKey);
    }
  }, [atlas, selectedId, neighbourIds, regionKey]);

  /* --- graph construction -------------------------------------------------- */

  useEffect(() => {
    if (!atlas || !enabled) return;
    let disposed = false;
    let themeObserver: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let motionQuery: MediaQueryList | null = null;
    let onMotionChange: (() => void) | null = null;
    const pills = new Map<string, Pill>();

    (async () => {
      const [{ default: Sigma }, { default: Graphology }] = await Promise.all([
        import('sigma'),
        import('graphology'),
      ]);
      if (disposed || !containerRef.current) return;

      /* (1) One node per paper, its encoding computed once (SPEC §5.4):
         tier rank (draw order and lightness), area index (hue) and size. */
      const graph: GraphologyType = new Graphology({ type: 'undirected', multi: false });
      for (const node of atlas.nodes) {
        const tier = tierOf(node);
        graph.addNode(node.id, {
          x: node.x,
          y: node.y,
          size: nodeSize(node.s, tier),
          label: titleOf(atlas, node),
          tier: TIER_RANK[tier],
          area: AREA_IDS.indexOf(paintArea(atlas.regions.get(node.c)?.area ?? 'other')),
        });
      }

      /* (2) Theme: CSS variables, re-read only when the site theme toggles. */
      const root = document.documentElement;
      const readTheme = () => {
        const cs = getComputedStyle(root);
        const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
        darkRef.current = root.classList.contains('dark');
        themeRef.current = {
          text: v('--color-text', DEFAULT_THEME.text),
          textSecondary: v('--color-text-secondary', DEFAULT_THEME.textSecondary),
          bg: v('--color-bg', DEFAULT_THEME.bg),
          border: v('--color-border', DEFAULT_THEME.border),
          canvas: v('--color-bg-secondary', DEFAULT_THEME.canvas),
        };
      };
      readTheme();
      // next/font registers a hashed family name, so the literal 'Inter' would never resolve (SPEC §5.6).
      const inter = getComputedStyle(root).getPropertyValue('--font-inter').trim();
      const family = inter ? `${inter}, system-ui, sans-serif` : 'system-ui, sans-serif';

      const drawers = createAtlasDrawers({
        theme: () => themeRef.current,
        selected: () => selectedRef.current,
        isSimilar: (key) => neighbourSetRef.current.has(key),
        family: () => family,
        debug: process.env.NODE_ENV !== 'production',
      });

      // Let the status card say "Drawing the map…" before the renderer's
      // first, synchronous render blocks the main thread.
      handlersRef.current.onDrawStart();
      await nextPaint();
      const container = containerRef.current;
      if (disposed || !container) return;

      const sigma = new Sigma(graph, container, {
        allowInvalidContainer: true,
        renderEdgeLabels: false,
        enableEdgeEvents: false,
        defaultEdgeType: 'line',
        minEdgeThickness: 1,
        labelFont: family,
        labelSize: 11,
        labelWeight: '500',
        labelColor: { color: themeRef.current.text },
        labelDensity: 0.4,
        labelGridCellSize: 120,
        labelRenderedSizeThreshold: 3,
        defaultDrawNodeLabel: drawers.drawLabel,
        defaultDrawNodeHover: drawers.drawHover,
        zIndex: true,
        // Discs grow at most 2x when zooming in, and never balloon (SPEC §6.5).
        zoomToSizeRatioFunction: (r: number) => Math.max(Math.sqrt(r), 0.5),
        minCameraRatio: MIN_RATIO,
        maxCameraRatio: MAX_RATIO,
        enableCameraRotation: false,
        ...motionSettings(),
        // Sigma hands the reducer its own copy of the attributes: mutate and
        // return it, never spread it (SPEC §5.4).
        nodeReducer: (node, data) => {
          const rank = data.tier as 0 | 1 | 2;
          const selected = selectedRef.current;
          const isSelected = selected === node;
          const isSimilar = !isSelected && neighbourSetRef.current.has(node);
          // The selected paper and its listed similar papers are drawn
          // whatever the filter, so opening one never changes the filter.
          const pinned = isSelected || isSimilar;
          if (!isShown(TIER_BY_RANK[rank], filterRef.current, pinned)) {
            data.hidden = true;
            return data;
          }
          const pal = darkRef.current ? PAL.dark : PAL.light;
          const area = data.area as number;
          // Emphasis (SPEC §6.9): a selection keeps the paper and its similar
          // papers in colour; otherwise a focused region keeps its members.
          // Everything else takes its dim colour and loses its label.
          const focus = regionMembersRef.current;
          const dimming = selected !== null || focus !== null;
          const emphasised = selected !== null ? pinned : focus !== null ? focus.has(node) : true;
          if (dimming && !emphasised) {
            data.color = rank === 2 ? pal.dimStrong[area] : rank === 1 ? pal.dimTint[area] : pal.dimNone;
            data.label = null;
            data.zIndex = rank;
            return data;
          }
          data.color = rank === 2 ? pal.strong[area] : rank === 1 ? pal.tint[area] : pal.none;
          // Reviews draw over abstracts over the rest; emphasised papers over
          // everything dimmed, and the selected paper over its similar papers.
          data.zIndex = isSelected ? 6 : dimming ? rank + 3 : rank;
          // Only the selected paper is `highlighted`: sigma redraws highlighted
          // discs in a WebGL layer ABOVE the canvas holding the chip and the
          // labels, so highlighted similar papers would cover the chip and each
          // other's labels. Similar papers get their ring and label from the
          // label drawer instead (forceLabel puts them in every frame).
          if (isSelected) data.highlighted = true;
          else if (isSimilar) data.forceLabel = true;
          return data;
        },
        // The only edges are the selected paper's lines to its similar papers (SPEC §6.6).
        edgeReducer: (_edge, data) => {
          data.color = (darkRef.current ? PAL.dark : PAL.light).ego;
          return data;
        },
      });
      sigmaRef.current = sigma;
      const camera = sigma.getCamera();

      /* (3) Projection. The camera never rotates, so raw graph coordinates map
         to plate pixels by one scale and offset per axis under any camera
         state; two projected points give it exactly. */
      const projector = (state: CameraState) => {
        const o = sigma.graphToViewport({ x: 0, y: 0 }, { cameraState: state });
        const u = sigma.graphToViewport({ x: 1, y: 1 }, { cameraState: state });
        const sx = u.x - o.x || 1;
        const sy = u.y - o.y || 1;
        return {
          to: (x: number, y: number) => ({ x: o.x + sx * x, y: o.y + sy * y }),
          from: (px: number, py: number): GraphPoint => ({ x: (px - o.x) / sx, y: (py - o.y) / sy }),
        };
      };

      /* (4) Plate controls (toolbar, zoom cluster, chips, key), found by
         data-atlas-obstacle and re-measured when something resizes, never per
         frame (SPEC §6.7). They are obstacles for labels, and for the
         selection and region fits, whose papers must not land under them. */
      const plate = container.parentElement?.closest('section') ?? container.parentElement;
      let controls: Box[] = [];
      const measureControls = () => {
        const base = container.getBoundingClientRect();
        const list: Box[] = [];
        plate?.querySelectorAll<HTMLElement>('[data-atlas-obstacle]').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            list.push({ x: r.left - base.left - 4, y: r.top - base.top - 4, w: r.width + 8, h: r.height + 8 });
          }
        });
        controls = list;
      };
      measureControls();
      resizeObserver = new ResizeObserver(() => {
        measureControls();
        sigmaRef.current?.scheduleRender();
      });
      resizeObserver.observe(container);
      plate?.querySelectorAll<HTMLElement>('[data-atlas-obstacle]').forEach((el) => resizeObserver?.observe(el));
      const keepClear = (width: number, height: number): Box => ({
        x: width - KEEP_CLEAR,
        y: height - KEEP_CLEAR,
        w: KEEP_CLEAR,
        h: KEEP_CLEAR,
      });

      /* (5) Camera (SPEC §6.11). */
      // A programmatic flight in progress, by generation: camera updates while
      // one runs are ours; any other update is the reader's.
      let flightGen = 0;
      let flying = 0;
      const fly = (target: CameraTarget, instant: boolean) => {
        userMovedRef.current = false;
        const gen = ++flightGen;
        flying = gen;
        const state = { x: target.x, y: target.y, ratio: target.ratio, angle: 0 };
        if (instant) {
          camera.setState(state);
          if (flying === gen) flying = 0;
          return;
        }
        const duration = reducedMotion() ? 1 : flyDuration(camera.getState().ratio, target.ratio);
        camera.animate(state, { duration, easing: 'cubicInOut' }, () => {
          if (flying === gen) flying = 0;
        });
      };
      // The reader's own moves (zoom buttons, keys): not flights, so they count as moving.
      const move = (state: Partial<CameraState>) => {
        camera.animate(state, { duration: reducedMotion() ? 1 : ZOOM_MS });
      };

      // Quantile boxes in graph units: the overview's per filter, cached.
      const overviewBoxes = new Map<TierFilter, Bounds | null>();
      const overviewBox = (f: TierFilter): Bounds | null => {
        if (!overviewBoxes.has(f)) {
          const xs: number[] = [];
          const ys: number[] = [];
          for (const node of atlas.nodes) {
            if (!passesFilter(tierOf(node), f)) continue;
            xs.push(node.x);
            ys.push(node.y);
          }
          overviewBoxes.set(f, quantileBox(xs, ys, FIT_OVERVIEW.lo, FIT_OVERVIEW.hi));
        }
        return overviewBoxes.get(f) ?? null;
      };

      /** The camera that fits `box` inside the plate padded by `pad`, centred in that padded area. */
      const fitBox = (box: Bounds, pad: Padding, max: number): CameraTarget => {
        const { width, height } = sigma.getDimensions();
        const unit = projector(UNIT_CAMERA);
        const a = unit.to(box.minX, box.minY);
        const b = unit.to(box.maxX, box.maxY);
        const ratio = fitRatio({ dx: b.x - a.x, dy: b.y - a.y }, { width, height, pad }, { min: MIN_RATIO, max });
        // The box's centre in framed coordinates; then offset the camera so
        // that centre lands on the padded area's centre at the new ratio.
        const mid = unit.to((box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2);
        const centre = sigma.viewportToFramedGraph(mid, { cameraState: UNIT_CAMERA });
        const area = safeArea({ width, height }, pad);
        const at = sigma.viewportToFramedGraph(
          { x: area.x + area.w / 2, y: area.y + area.h / 2 },
          { cameraState: { x: centre.x, y: centre.y, ratio, angle: 0 } }
        );
        return { x: 2 * centre.x - at.x, y: 2 * centre.y - at.y, ratio };
      };

      /** Padding for a fit whose papers must stay visible: the spec's padding, grown clear of the plate's controls. */
      const clearPad = (spec: FitSpec): Padding => {
        const { width, height } = sigma.getDimensions();
        return clearPadding({ width, height }, spec.pad, [...controls, keepClear(width, height)]);
      };

      const boxOf = (ids: Iterable<string>, spec: FitSpec, visibleOnly: boolean): Bounds | null => {
        const xs: number[] = [];
        const ys: number[] = [];
        for (const id of ids) {
          const node = atlas.byId.get(id);
          if (!node || (visibleOnly && !passesFilter(tierOf(node), filterRef.current))) continue;
          xs.push(node.x);
          ys.push(node.y);
        }
        return quantileBox(xs, ys, spec.lo, spec.hi);
      };

      const overviewTarget = (): CameraTarget | null => {
        const box = overviewBox(filterRef.current);
        return box ? fitBox(box, FIT_OVERVIEW.pad, MAX_RATIO) : null;
      };

      const fitOverview = (instant: boolean) => {
        const target = overviewTarget();
        if (!target) return;
        lastFitRef.current = target;
        fitRatioRef.current = target.ratio;
        fly(target, instant);
      };

      // The selected paper and its listed similar papers, every one of them,
      // zoomed in at least 2× against the overview. Before similar papers
      // exist, the paper alone, centred at 4×.
      const selectionTarget = (): CameraTarget | null => {
        const id = selectedRef.current;
        if (!id || !atlas.byId.has(id)) return null;
        const similar = neighbourListRef.current;
        const box = boxOf([id, ...similar], FIT_SELECTION, false);
        if (!box) return null;
        const fit = fitRatioRef.current;
        if (similar.length === 0) {
          const ratio = fit / 4;
          return { ...fitBox(box, clearPad(FIT_SELECTION), ratio), ratio };
        }
        return fitBox(box, clearPad(FIT_SELECTION), fit / 2);
      };

      // A region's visible members, 10th to 90th percentile, zoomed in at
      // least 1.5×. With every member hidden by the filter, all of them.
      const regionTarget = (key: string): CameraTarget | null => {
        const region = atlas.displayRegions.get(key);
        if (!region) return null;
        const box = boxOf(region.members, FIT_REGION, true) ?? boxOf(region.members, FIT_REGION, false);
        return box ? fitBox(box, clearPad(FIT_REGION), fitRatioRef.current / 1.5) : null;
      };

      const flySelection = (instant: boolean) => {
        const target = selectionTarget();
        if (target) fly(target, instant);
      };
      const flyRegion = (key: string, instant: boolean) => {
        const target = regionTarget(key);
        if (target) fly(target, instant);
      };

      const atFit = () => nearFit(camera.getState(), lastFitRef.current);

      const zoomBy = (factor: number) => move({ ratio: camera.getState().ratio / factor });

      const panBy = (dx: number, dy: number) => {
        const { width, height } = sigma.getDimensions();
        // The framed point that should come to the centre: the axis signs follow from the projection itself.
        const to = sigma.viewportToFramedGraph({ x: width / 2 + dx * width, y: height / 2 + dy * height });
        move({ x: to.x, y: to.y });
      };

      /* (6) Lines from the selected paper to its similar papers (SPEC §6.6):
         at most six graph edges, rebuilt only when the selection or its
         similar papers change. */
      let egoKey = '';
      const syncEgoEdges = () => {
        const selected = selectedRef.current;
        const similar = selected && graph.hasNode(selected) ? neighbourListRef.current.filter((id) => id !== selected && graph.hasNode(id)) : [];
        const key = selected && similar.length > 0 ? `${selected}>${similar.join(',')}` : '';
        if (key === egoKey) return;
        egoKey = key;
        if (graph.size > 0) graph.clearEdges();
        if (!selected) return;
        for (const id of similar) graph.addUndirectedEdgeWithKey(`ego:${id}`, selected, id, { size: 1.25, ego: true });
      };

      /* (7) Region labels (SPEC §6.7): one pill per display region, created
         once and positioned imperatively (a few transform writes per frame, no
         layout writes), so React never re-renders during a pan. The overlay
         is aria-hidden and every pill is out of the Tab order: the keyboard
         and screen-reader path is the "Go to a region" menu. */
      const drawable = [...atlas.displayRegions.values()].filter((r) => r.members.length > 0);
      const ranked: Record<TierFilter, Array<{ region: DisplayRegion; members: number }>> = {
        all: [],
        text: [],
        review: [],
      };
      for (const f of FILTERS) {
        ranked[f] = rankRegions(
          drawable.map((region) => ({ region, reviewed: region.counts.review, members: displayCount(region, f) }))
        );
      }

      const overlay = overlayRef.current;
      if (overlay) {
        overlay.replaceChildren();
        for (const region of drawable) {
          const el = document.createElement('button');
          el.type = 'button';
          el.tabIndex = -1;
          el.dataset.atlasLabel = '';
          el.dataset.region = region.key;
          el.className = PILL_CLASS;
          el.style.visibility = 'hidden';
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          const swatch = document.createElement('span');
          swatch.setAttribute('aria-hidden', 'true');
          swatch.className = `size-2 shrink-0 rounded-full ${AREA_SWATCH[paintArea(region.area)]}`;
          el.append(swatch, region.label);
          el.addEventListener('click', () => handlersRef.current.onFocusRegion(region.key));
          pills.set(region.key, { el, region, w: 0, h: 0, shown: false, x: NaN, y: NaN, outlined: false });
          overlay.appendChild(el);
        }
      }
      // Pill sizes, all in one read pass (again once the web font is in, SPEC §6.7).
      const measurePills = () => {
        for (const pill of pills.values()) {
          pill.w = pill.el.offsetWidth;
          pill.h = pill.el.offsetHeight;
        }
      };
      measurePills();

      const showPill = (pill: Pill, x: number, y: number, outlined: boolean) => {
        const { style } = pill.el;
        if (!pill.shown) {
          pill.shown = true;
          style.visibility = 'visible';
          style.opacity = '1';
          style.pointerEvents = 'auto';
        }
        if (x !== pill.x || y !== pill.y) {
          pill.x = x;
          pill.y = y;
          style.transform = `translate(${x}px, ${y}px)`;
        }
        if (outlined !== pill.outlined) {
          pill.outlined = outlined;
          style.outline = outlined ? '2px solid var(--color-text)' : '';
        }
      };
      const hidePill = (pill: Pill) => {
        if (!pill.shown) return;
        pill.shown = false;
        pill.el.style.visibility = 'hidden';
        pill.el.style.opacity = '0';
        pill.el.style.pointerEvents = 'none';
      };

      let shownPills: ReadonlySet<string> = new Set();
      const placeRegions = (tier: ZoomTier, to: (x: number, y: number) => GraphPoint, width: number, height: number) => {
        const f = filterRef.current;
        const focusKey = selectedRef.current ? null : regionKeyRef.current;
        const candidates: LabelCandidate[] = [];
        let max = 0;
        if (focusKey) {
          // Region focus: only the focused region's pill, at any zoom.
          const pill = pills.get(focusKey);
          const anchor = pill ? (pill.region.anchors[f] ?? pill.region.anchors.all) : null;
          if (pill && anchor) {
            const p = to(anchor.x, anchor.y);
            candidates.push({ key: focusKey, x: p.x, y: p.y, w: pill.w, h: pill.h });
            max = 1;
          }
        } else {
          const rule = regionLabelRule(tier);
          max = rule.max;
          if (max > 0) {
            for (const { region, members } of ranked[f]) {
              if (members < rule.minMembers) continue;
              const anchor = region.anchors[f];
              const pill = pills.get(region.key);
              if (!anchor || !pill) continue;
              const p = to(anchor.x, anchor.y);
              if (p.x < -pill.w || p.y < -pill.h || p.x > width + pill.w || p.y > height + pill.h) continue;
              candidates.push({ key: region.key, x: p.x, y: p.y, w: pill.w, h: pill.h });
            }
          }
        }
        const placed = placeRegionLabels(candidates, drawers.reserved(), { width, height }, shownPills, max);
        const now = new Set<string>();
        for (const box of placed) {
          const pill = pills.get(box.key);
          if (!pill) continue;
          now.add(box.key);
          showPill(pill, box.x, box.y, box.key === focusKey);
          // Ordinary node labels keep clear of the pill and its clear space.
          drawers.reserve(padded(box));
        }
        for (const pill of pills.values()) if (!now.has(pill.region.key)) hidePill(pill);
        shownPills = now;
      };

      /* (8) The location chip (SPEC §6.9): close in, with nothing selected or
         focused, the display region whose label anchor is nearest the centre
         of the view. Over empty plate (no anchor within LOCATION_REACH graph
         units) it names nothing rather than a region far away. */
      let location: string | null = null;
      const updateLocation = (
        tier: ZoomTier,
        proj: ReturnType<typeof projector>,
        width: number,
        height: number
      ) => {
        let key: string | null = null;
        if (tier === 'close' && !selectedRef.current && !regionKeyRef.current) {
          const f = filterRef.current;
          const centre = proj.from(width / 2, height / 2);
          let best = LOCATION_REACH * LOCATION_REACH;
          for (const region of drawable) {
            const anchor = region.anchors[f] ?? region.anchors.all;
            if (!anchor) continue;
            const d = (anchor.x - centre.x) ** 2 + (anchor.y - centre.y) ** 2;
            if (d < best) {
              best = d;
              key = region.key;
            }
          }
        }
        if (key !== location) {
          location = key;
          locationStore.set(key);
        }
      };

      /* (9) Each full frame: the zoom tier, then the selection's chip and its
         similar papers' labels, then region labels, all placed before sigma
         draws ordinary labels, which avoid every one of them (SPEC §6.7–§6.8). */
      sigma.on('beforeRender', () => {
        // This frame's camera: in beforeRender sigma's own matrix is still
        // last frame's, and after a refresh its node cache is not normalised
        // until the frame is processed, so positions come from raw coordinates.
        const cameraState = camera.getState();
        const { width, height } = sigma.getDimensions();
        const tier = zoomTier(fitRatioRef.current, cameraState.ratio);
        const proj = projector(cameraState);
        drawers.beginFrame(tier, width, height, [...controls, keepClear(width, height)]);
        const items: HighlightInput[] = [];
        const add = (id: string, role: HighlightInput['role']) => {
          if (!graph.hasNode(id)) return;
          const a = graph.getNodeAttributes(id);
          const p = proj.to(a.x as number, a.y as number);
          items.push({ key: id, x: p.x, y: p.y, r: sigma.scaleSize(a.size as number), label: a.label as string, role });
        };
        const selected = selectedRef.current;
        if (selected) add(selected, 'selected');
        for (const id of neighbourListRef.current) if (id !== selected) add(id, 'similar');
        drawers.placeHighlights(items);
        placeRegions(tier, proj.to, width, height);
        updateLocation(tier, proj, width, height);
      });

      /* (10) The tooltip (SPEC §6.10): title and TT1, written as text, never markup. */
      const tooltip = tooltipRef.current;
      const tipTitle = tooltip?.querySelector<HTMLElement>('[data-atlas-tooltip="title"]') ?? null;
      const tipMeta = tooltip?.querySelector<HTMLElement>('[data-atlas-tooltip="meta"]') ?? null;
      const hideTooltip = () => {
        if (!tooltip || tooltip.style.opacity !== '1') return false;
        tooltip.style.opacity = '0';
        return true;
      };

      // A click on a paper opens it; a click on empty plate does nothing (SPEC §6.11).
      sigma.on('clickNode', ({ node }) => handlersRef.current.onOpenPaper(node));
      sigma.on('enterNode', ({ node }) => {
        container.style.cursor = 'pointer';
        const data = atlas.byId.get(node);
        if (!tooltip || !tipTitle || !tipMeta || !data) return;
        // The paper's title and year, region and tier. The payload's takeaway
        // field is a model's words with no label, so it is never shown here.
        tipTitle.textContent = titleOf(atlas, data);
        tipMeta.textContent = paperMeta(data, displayRegionOf(atlas, data)?.label ?? null);
        const a = graph.getNodeAttributes(node);
        const p = sigma.graphToViewport({ x: a.x as number, y: a.y as number });
        const r = sigma.scaleSize(a.size as number);
        const { width, height } = sigma.getDimensions();
        const w = tooltip.offsetWidth;
        const h = tooltip.offsetHeight;
        let left = p.x + r + 10;
        if (left + w > width - 8) left = p.x - r - 10 - w;
        left = Math.max(8, left);
        const top = Math.max(8, Math.min(p.y - h / 2, height - h - 8));
        tooltip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
        tooltip.style.opacity = '1';
      });
      sigma.on('leaveNode', () => {
        container.style.cursor = '';
        hideTooltip();
      });
      camera.on('updated', () => {
        // Any camera change outside a programmatic flight is the reader's.
        if (!flying) userMovedRef.current = true;
        hideTooltip();
      });

      // Dev-only measurement hook for the screenshot harness (CONTEXT §7):
      // camera and fit facts, the zoom tier, every canvas label box drawn in
      // the last full frame (viewport pixels), the selection's papers on the
      // plate, the emphasis, and the edge count (only the selection's lines
      // are ever graph edges). Stripped from production builds.
      if (process.env.NODE_ENV !== 'production') {
        const w = window as unknown as { __atlasDebug?: Record<string, unknown> };
        const round = (v: number) => Math.round(v * 10000) / 10000;
        const px = (v: number) => Math.round(v * 10) / 10;
        sigma.on('afterRender', () => {
          const dbg = (w.__atlasDebug ??= {});
          const cam = camera.getState();
          const base = container.getBoundingClientRect();
          const { width, height } = sigma.getDimensions();
          const proj = projector(cam);
          const toViewport = (x: number, y: number) => {
            const p = proj.to(x, y);
            return { x: px(p.x + base.left), y: px(p.y + base.top) };
          };
          const rectOf = (box: Bounds) => {
            const a = toViewport(box.minX, box.minY);
            const b = toViewport(box.maxX, box.maxY);
            return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: px(Math.abs(b.x - a.x)), h: px(Math.abs(b.y - a.y)) };
          };
          const area = safeArea({ width, height }, FIT_OVERVIEW.pad);
          const box = overviewBox(filterRef.current);
          const boxRect = box ? rectOf(box) : null;
          const safeRect = { x: area.x + base.left, y: area.y + base.top, w: area.w, h: area.h };
          const sel = selectedRef.current;
          const papers = (sel ? [sel, ...neighbourListRef.current] : []).flatMap((id) => {
            const node = atlas.byId.get(id);
            if (!node) return [];
            const p = toViewport(node.x, node.y);
            const inside = p.x >= base.left && p.x <= base.left + width && p.y >= base.top && p.y <= base.top + height;
            return [{ id, role: id === sel ? 'selected' : 'similar', x: p.x, y: p.y, inside }];
          });
          const boxes = drawers.drawnBoxes();
          const overviewRatio = lastFitRef.current?.ratio ?? fitRatioRef.current;
          dbg.camera = { x: round(cam.x), y: round(cam.y), ratio: round(cam.ratio) };
          dbg.lastFit = lastFitRef.current
            ? { x: round(lastFitRef.current.x), y: round(lastFitRef.current.y), ratio: round(lastFitRef.current.ratio) }
            : null;
          dbg.fitRatio = round(fitRatioRef.current);
          dbg.zoomTier = zoomTier(fitRatioRef.current, cam.ratio);
          dbg.userMoved = userMovedRef.current;
          dbg.overview = boxRect
            ? {
                box: boxRect,
                safe: safeRect,
                // The share of the padded area's limiting side the 1st–99th percentile box fills, and how far its centre sits from that area's centre.
                fill: round(Math.max(boxRect.w / safeRect.w, boxRect.h / safeRect.h)),
                fillW: round(boxRect.w / safeRect.w),
                fillH: round(boxRect.h / safeRect.h),
                centreDx: px(boxRect.x + boxRect.w / 2 - (safeRect.x + safeRect.w / 2)),
                centreDy: px(boxRect.y + boxRect.h / 2 - (safeRect.y + safeRect.h / 2)),
              }
            : null;
          dbg.selected = papers.find((p) => p.role === 'selected') ?? null;
          dbg.selection = papers;
          dbg.labelCounts = {
            selected: boxes.filter((b) => b.kind === 'selected').length,
            similar: boxes.filter((b) => b.kind === 'similar').length,
            label: boxes.filter((b) => b.kind === 'label').length,
            neighbours: neighbourListRef.current.length,
          };
          // A disc's drawn size now against at the overview fit (growth is capped at 2×).
          dbg.discScale = round(sigma.scaleSize(1) / sigma.scaleSize(1, overviewRatio));
          dbg.plate = { width, height };
          dbg.graphEdges = graph.size;
          dbg.filter = filterRef.current;
          dbg.region = regionKeyRef.current;
          dbg.regionPills = [...shownPills];
          dbg.location = location;
          dbg.dark = darkRef.current;
          dbg.labelBoxes = boxes.map((b) => ({
            x: px(b.x + base.left),
            y: px(b.y + base.top),
            w: px(b.w),
            h: px(b.h),
            text: b.text,
            title: b.title,
            kind: b.kind,
          }));
        });
      }

      // The site theme toggles a class on <html>: new colours through one
      // setSetting, which already re-runs the reducers (a full refresh); no
      // per-node writes. Region labels are recoloured by their classes.
      themeObserver = new MutationObserver(() => {
        if (root.classList.contains('dark') === darkRef.current) return;
        readTheme();
        sigma.setSetting('labelColor', { color: themeRef.current.text });
      });
      themeObserver.observe(root, { attributes: true, attributeFilter: ['class'] });

      motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      onMotionChange = () => sigma.setSettings(motionSettings());
      motionQuery.addEventListener('change', onMotionChange);

      // Text measured before the web font arrived is measured again.
      document.fonts?.ready.then(() => {
        if (disposed) return;
        drawers.clearCache();
        measurePills();
        sigma.scheduleRender();
      });

      implRef.current = {
        zoomBy,
        panBy,
        fitOverview: () => fitOverview(false),
        flySelection: () => flySelection(false),
        flyRegion: (key) => flyRegion(key, false),
        hideTooltip,
        atFit,
        syncEgoEdges,
      };

      // Open on the selection (a deep link, or a paper opened while sigma was
      // still loading), else on the focused region, else on the overview. The
      // first placement is instant: the status card covers the plate until the
      // frame after it, so there is no first-paint jump. The overview fit is
      // computed either way: the zoom tiers and the zoom caps need its ratio.
      const overview = overviewTarget();
      if (overview) {
        fitRatioRef.current = overview.ratio;
        lastFitRef.current = overview;
      }
      // The renderer already reduced every node with the current selection
      // and focus when it was built; only the selection's lines are missing.
      syncEgoEdges();
      const selected = selectedRef.current;
      const focused = regionKeyRef.current;
      if (selected && graph.hasNode(selected)) flySelection(true);
      else if (focused && atlas.displayRegions.has(focused)) flyRegion(focused, true);
      else if (overview) fly(overview, true);
      sigma.once('afterRender', () => {
        if (!disposed) handlersRef.current.onFirstRender();
      });
      sigma.scheduleRender();
    })().catch(() => {
      if (!disposed) handlersRef.current.onError();
    });

    return () => {
      disposed = true;
      themeObserver?.disconnect();
      resizeObserver?.disconnect();
      if (motionQuery && onMotionChange) motionQuery.removeEventListener('change', onMotionChange);
      sigmaRef.current?.kill();
      sigmaRef.current = null;
      implRef.current = null;
      pills.clear();
      locationStore.set(null);
    };
  }, [atlas, enabled, containerRef, overlayRef, tooltipRef, locationStore]);
}
