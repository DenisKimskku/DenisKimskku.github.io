'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type SigmaType from 'sigma';
import type GraphologyType from 'graphology';
import PaperPanel from './PaperPanel';
import type { AtlasCluster, AtlasEdge, AtlasNode } from './atlasTypes';

const NODES_URL = '/atlas/nodes.json';
const EDGES_URL = '/atlas/edges.json';
const CLUSTERS_URL = '/atlas/clusters.json';

/** Below this width (or without WebGL) the canvas is replaced by a list. */
const GRAPH_MIN_WIDTH = 860;

interface Region {
  id: number;
  label: string;
  note: string | null;
  members: string[];
  reviewed: number;
  cx: number;
  cy: number;
  /** index into the hue ramp; -1 for the Unclustered bucket */
  paletteIndex: number;
}

interface Atlas {
  nodes: AtlasNode[];
  byId: Map<string, AtlasNode>;
  regions: Map<number, Region>;
  reviewed: number;
  regionCount: number;
}

/* Sigma parses hex reliably, so HSL is converted here rather than handed to the
   renderer. 54 named regions is far past what categorical colour can separate,
   so hue is deliberately only a loose grouping cue — identification comes from
   the region labels drawn over the map and from the panel. */
function hslToHex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function regionPalette(index: number, dark: boolean): { strong: string; muted: string } {
  if (index < 0) {
    return dark
      ? { strong: '#6b7280', muted: '#2f3238' }
      : { strong: '#9ca3af', muted: '#dcdcdc' };
  }
  const h = Math.round((index * 137.508) % 360);
  return {
    strong: hslToHex(h, dark ? 60 : 58, dark ? 64 : 46),
    muted: hslToHex(h, 14, dark ? 32 : 80),
  };
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function nodeSubtitle(node: AtlasNode, region: Region | undefined): string {
  return [
    node.yr ? String(node.yr) : null,
    region ? region.label : null,
    node.r === 1 ? 'PDF-verified review' : 'metadata only',
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function GraphClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const sigmaRef = useRef<SigmaType | null>(null);
  const graphRef = useRef<GraphologyType | null>(null);
  const adjacencyRef = useRef<Map<string, [string, number][]>>(new Map());
  const verifiedOnlyRef = useRef(true);
  const selectedRef = useRef<string | null>(null);
  const themeRef = useRef({ edge: '#e5e5e5', text: '#1a1a1a' });
  const pendingHashRef = useRef<string | null>(null);
  const fitRef = useRef<(() => void) | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mode, setMode] = useState<'pending' | 'graph' | 'list'>('pending');
  const [edgePhase, setEdgePhase] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(-1);
  const [selected, setSelected] = useState<AtlasNode | null>(null);
  const [neighbors, setNeighbors] = useState<AtlasNode[]>([]);
  const [listLimit, setListLimit] = useState(40);
  const [revealed, setRevealed] = useState(false);

  /* --- selection --------------------------------------------------------- */

  const openNode = useCallback(
    (id: string) => {
      if (!atlas) return;
      const node = atlas.byId.get(id);
      if (!node) return;
      // An unreviewed hit is still a legitimate destination: drop the filter
      // rather than silently doing nothing.
      if (node.r === 0 && verifiedOnlyRef.current) {
        setVerifiedOnly(false);
        setRevealed(true);
      }
      setSelected(node);
      setQuery('');
      setCursor(-1);

      const adjacency = adjacencyRef.current.get(id);
      setNeighbors(
        adjacency
          ? [...adjacency]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([nid]) => atlas.byId.get(nid))
              .filter((n): n is AtlasNode => Boolean(n))
          : []
      );

      try {
        window.history.replaceState(null, '', `#p=${id}`);
      } catch {
        /* the hash is a convenience, never a hard requirement */
      }

      const sigma = sigmaRef.current;
      const display = sigma?.getNodeDisplayData(id);
      if (sigma && display) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        sigma
          .getCamera()
          .animate({ x: display.x, y: display.y, ratio: 0.08 }, { duration: reduce ? 0 : 500 });
      }
    },
    [atlas]
  );

  const closePanel = useCallback(() => {
    setSelected(null);
    setNeighbors([]);
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch {
      /* ignore */
    }
  }, []);

  /* --- device capability -------------------------------------------------- */

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${GRAPH_MIN_WIDTH}px)`);
    let webgl = false;
    try {
      const canvas = document.createElement('canvas');
      webgl = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
      webgl = false;
    }
    const decide = () => setMode(mq.matches && webgl ? 'graph' : 'list');
    const frame = window.requestAnimationFrame(decide);
    mq.addEventListener('change', decide);
    return () => {
      window.cancelAnimationFrame(frame);
      mq.removeEventListener('change', decide);
    };
  }, []);

  /* --- first payload: nodes + clusters ------------------------------------ */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nodesRes, clustersRes] = await Promise.all([fetch(NODES_URL), fetch(CLUSTERS_URL)]);
        if (!nodesRes.ok || !clustersRes.ok) throw new Error('atlas fetch failed');
        const nodes: AtlasNode[] = await nodesRes.json();
        const clusters: AtlasCluster[] = await clustersRes.json();
        if (cancelled) return;

        const regions = new Map<number, Region>();
        let paletteIndex = 0;
        for (const cluster of clusters) {
          // id < 0 is the "Unclustered" bucket: a real node state, but never a
          // named region on the map.
          regions.set(cluster.id, {
            id: cluster.id,
            label: cluster.label,
            note: cluster.label_note,
            members: [],
            reviewed: 0,
            cx: 0,
            cy: 0,
            paletteIndex: cluster.id < 0 ? -1 : paletteIndex++,
          });
        }

        const byId = new Map<string, AtlasNode>();
        let reviewed = 0;
        for (const node of nodes) {
          byId.set(node.id, node);
          if (node.r === 1) reviewed += 1;
          const region = regions.get(node.c);
          if (!region) continue;
          region.members.push(node.id);
          region.cx += node.x;
          region.cy += node.y;
          if (node.r === 1) region.reviewed += 1;
        }
        for (const region of regions.values()) {
          const n = region.members.length || 1;
          region.cx /= n;
          region.cy /= n;
        }

        const hash = window.location.hash.match(/^#p=([A-Za-z0-9_-]+)$/);
        if (hash && byId.has(hash[1])) pendingHashRef.current = hash[1];

        setAtlas({
          nodes,
          byId,
          regions,
          reviewed,
          regionCount: clusters.filter((c) => c.id >= 0).length,
        });
        setPhase('ready');
      } catch {
        if (!cancelled) setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* --- keep the sigma reducers in sync with React state -------------------- */

  useEffect(() => {
    verifiedOnlyRef.current = verifiedOnly;
    sigmaRef.current?.refresh();
    // Sigma's extent covers every node, shown or not, so the verified subset
    // would otherwise sit off-centre in a mostly empty frame.
    if (!selectedRef.current) fitRef.current?.();
  }, [verifiedOnly]);

  useEffect(() => {
    selectedRef.current = selected ? selected.id : null;
    sigmaRef.current?.refresh();
  }, [selected]);

  /* --- graph construction -------------------------------------------------- */

  useEffect(() => {
    if (!atlas || mode !== 'graph') return;
    let disposed = false;
    let observer: MutationObserver | null = null;
    const labelEls = new Map<number, { el: HTMLButtonElement; w: number; h: number }>();

    (async () => {
      const [{ default: Sigma }, { default: Graphology }] = await Promise.all([
        import('sigma'),
        import('graphology'),
      ]);
      if (disposed || !containerRef.current) return;

      const dark = () => document.documentElement.classList.contains('dark');
      const colorFor = (node: AtlasNode, isDark: boolean) => {
        const palette = regionPalette(atlas.regions.get(node.c)?.paletteIndex ?? -1, isDark);
        return node.r === 1 ? palette.strong : palette.muted;
      };

      const graph = new Graphology({ type: 'undirected', multi: false });
      // Unreviewed first, so reviewed nodes are painted over them.
      const ordered = [...atlas.nodes].sort((a, b) => a.r - b.r);
      const isDark = dark();
      for (const node of ordered) {
        graph.addNode(node.id, {
          x: node.x,
          y: node.y,
          size: node.r === 1 ? node.s * 1.9 + 0.8 : node.s * 1.4,
          label: truncate(node.t, 64),
          color: colorFor(node, isDark),
          reviewed: node.r === 1,
        });
      }
      graphRef.current = graph;

      const readTheme = () => {
        themeRef.current = {
          edge: cssVar('--color-border', '#e5e5e5'),
          text: cssVar('--color-text', '#1a1a1a'),
        };
      };
      readTheme();

      const sigma = new Sigma(graph, containerRef.current, {
        allowInvalidContainer: true,
        renderEdgeLabels: false,
        labelRenderedSizeThreshold: 7.5,
        labelDensity: 0.08,
        labelGridCellSize: 140,
        labelFont: 'Inter, system-ui, sans-serif',
        labelSize: 11,
        minCameraRatio: 0.01,
        maxCameraRatio: 1.6,
        nodeReducer: (node, data) => {
          const attrs = { ...data };
          if (verifiedOnlyRef.current && !data.reviewed) {
            attrs.hidden = true;
            return attrs;
          }
          attrs.labelColor = themeRef.current.text;
          if (selectedRef.current === node) {
            attrs.highlighted = true;
            attrs.size = (data.size as number) + 4;
            attrs.forceLabel = true;
          }
          return attrs;
        },
        edgeReducer: (edge, data) => {
          const attrs = { ...data };
          // `bothReviewed` is precomputed at load: the reducer is a field read,
          // not two adjacency lookups per edge per refresh.
          if (verifiedOnlyRef.current && !data.bothReviewed) {
            attrs.hidden = true;
            return attrs;
          }
          attrs.color = themeRef.current.edge;
          attrs.size = 0.35;
          return attrs;
        },
      });
      sigmaRef.current = sigma;

      /* (8) Region labels: the cluster labels ARE the map's named regions.
         They are positioned imperatively (a few dozen transform writes per
         frame, no layout reads) so React never re-renders during a pan. */
      const drawable = [...atlas.regions.values()]
        .filter((r) => r.id >= 0 && r.members.length > 0)
        .sort((a, b) => b.members.length - a.members.length);

      const focusRegion = (region: Region) => {
        const s = sigmaRef.current;
        if (!s) return;
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const id of region.members) {
          const node = atlas.byId.get(id);
          if (!node || (verifiedOnlyRef.current && node.r === 0)) continue;
          const d = s.getNodeDisplayData(id);
          if (!d) continue;
          minX = Math.min(minX, d.x);
          maxX = Math.max(maxX, d.x);
          minY = Math.min(minY, d.y);
          maxY = Math.max(maxY, d.y);
        }
        if (!Number.isFinite(minX)) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        s.getCamera().animate(
          {
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2,
            ratio: Math.min(1.4, Math.max(0.05, Math.max(maxX - minX, maxY - minY) * 1.35)),
          },
          { duration: reduce ? 0 : 420 }
        );
      };

      const fitToVisible = () => {
        const s = sigmaRef.current;
        if (!s) return;
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const node of atlas.nodes) {
          if (verifiedOnlyRef.current && node.r === 0) continue;
          const d = s.getNodeDisplayData(node.id);
          if (!d) continue;
          minX = Math.min(minX, d.x);
          maxX = Math.max(maxX, d.x);
          minY = Math.min(minY, d.y);
          maxY = Math.max(maxY, d.y);
        }
        if (!Number.isFinite(minX)) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        s.getCamera().animate(
          {
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2,
            ratio: Math.min(1.5, Math.max(0.05, Math.max(maxX - minX, maxY - minY) * 1.08)),
          },
          { duration: reduce ? 0 : 300 }
        );
      };
      fitRef.current = fitToVisible;

      const overlay = overlayRef.current;
      if (overlay) {
        overlay.replaceChildren();
        for (const region of drawable) {
          const el = document.createElement('button');
          el.type = 'button';
          el.textContent = region.label;
          el.title = region.note ?? region.label;
          el.className =
            'absolute top-0 left-0 rounded-full border border-(--color-border) bg-(--color-bg)/80 px-2 py-0.5 text-[11px] font-medium tracking-wide whitespace-nowrap opacity-0 transition-opacity';
          el.style.color = regionPalette(region.paletteIndex, isDark).strong;
          el.style.pointerEvents = 'none';
          el.addEventListener('click', () => focusRegion(region));
          labelEls.set(region.id, { el, w: 0, h: 0 });
          overlay.appendChild(el);
        }
      }

      const placeRegions = () => {
        const s = sigmaRef.current;
        if (!s) return;
        const { width, height } = s.getDimensions();
        const detailed = s.getCamera().getState().ratio < 0.35;
        const minMembers = detailed ? 4 : 12;
        const maxLabels = detailed ? 26 : 14;
        const placed: [number, number, number, number][] = [];
        let shown = 0;
        for (const region of drawable) {
          const entry = labelEls.get(region.id);
          if (!entry) continue;
          const { el } = entry;
          const hide = () => {
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
          };
          const visible = verifiedOnlyRef.current ? region.reviewed : region.members.length;
          if (visible < minMembers || shown >= maxLabels) {
            hide();
            continue;
          }
          if (entry.w === 0) {
            entry.w = el.offsetWidth;
            entry.h = el.offsetHeight;
          }
          const p = s.graphToViewport({ x: region.cx, y: region.cy });
          const left = p.x - entry.w / 2;
          const top = p.y - entry.h / 2;
          if (left < -entry.w || top < -entry.h || left > width || top > height) {
            hide();
            continue;
          }
          const collides = placed.some(
            ([l, t, r, b]) =>
              !(left + entry.w < l || left > r || top + entry.h < t || top > b)
          );
          if (collides) {
            hide();
            continue;
          }
          placed.push([left - 6, top - 4, left + entry.w + 6, top + entry.h + 4]);
          shown += 1;
          el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
        }
      };

      const tooltip = tooltipRef.current;
      const hideTooltip = () => {
        if (tooltip) tooltip.style.opacity = '0';
      };

      sigma.on('afterRender', placeRegions);
      sigma.on('clickNode', ({ node }) => openNode(node));
      sigma.on('clickStage', closePanel);
      sigma.on('enterNode', ({ node }) => {
        const s = sigmaRef.current;
        const data = atlas.byId.get(node);
        if (!s || !tooltip || !data) return;
        tooltip.textContent = data.tip || data.t;
        const p = s.graphToViewport({ x: data.x, y: data.y });
        const { width } = s.getDimensions();
        const left = Math.min(Math.max(8, p.x + 14), Math.max(8, width - 292));
        tooltip.style.transform = `translate(${Math.round(left)}px, ${Math.round(p.y + 14)}px)`;
        tooltip.style.opacity = '1';
      });
      sigma.on('leaveNode', hideTooltip);
      sigma.getCamera().on('updated', hideTooltip);

      // Recolour when the site theme toggles.
      observer = new MutationObserver(() => {
        const nowDark = dark();
        for (const region of drawable) {
          const entry = labelEls.get(region.id);
          if (entry) entry.el.style.color = regionPalette(region.paletteIndex, nowDark).strong;
        }
        const g = graphRef.current;
        g?.forEachNode((id) => {
          const node = atlas.byId.get(id);
          if (node) g.setNodeAttribute(id, 'color', colorFor(node, nowDark));
        });
        readTheme();
        sigmaRef.current?.refresh();
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

      placeRegions();

      const pending = pendingHashRef.current;
      if (pending) {
        pendingHashRef.current = null;
        openNode(pending);
      } else {
        fitToVisible();
      }

      /* (4) Edges are the second payload: the map is usable before the
         similarity graph (~1.1 MB gzipped) lands. */
      setEdgePhase('loading');
      const loadEdges = async () => {
        try {
          const res = await fetch(EDGES_URL);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const edges: AtlasEdge[] = await res.json();
          const g = graphRef.current;
          if (disposed || !g) return;
          const adjacency = new Map<string, [string, number][]>();
          const push = (from: string, to: string, weight: number) => {
            const list = adjacency.get(from);
            if (list) list.push([to, weight]);
            else adjacency.set(from, [[to, weight]]);
          };
          for (const [src, dst, weight] of edges) {
            if (!g.hasNode(src) || !g.hasNode(dst) || g.hasEdge(src, dst)) continue;
            g.addEdge(src, dst, {
              weight,
              bothReviewed:
                Boolean(g.getNodeAttribute(src, 'reviewed')) &&
                Boolean(g.getNodeAttribute(dst, 'reviewed')),
            });
            push(src, dst, weight);
            push(dst, src, weight);
          }
          adjacencyRef.current = adjacency;
          setEdgePhase('ready');
        } catch {
          if (!disposed) setEdgePhase('error');
        }
      };
      const idle = window as unknown as {
        requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => void;
      };
      if (typeof idle.requestIdleCallback === 'function') {
        idle.requestIdleCallback(loadEdges, { timeout: 2500 });
      } else {
        window.setTimeout(loadEdges, 350);
      }
    })().catch(() => {
      if (!disposed) setPhase('error');
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      sigmaRef.current?.kill();
      sigmaRef.current = null;
      graphRef.current = null;
      fitRef.current = null;
      labelEls.clear();
    };
  }, [atlas, mode, openNode, closePanel]);

  /* --- deep link when the list fallback is in use -------------------------- */

  useEffect(() => {
    if (!atlas || mode !== 'list') return;
    const pending = pendingHashRef.current;
    if (!pending) return;
    pendingHashRef.current = null;
    openNode(pending);
  }, [atlas, mode, openNode]);

  useEffect(() => {
    if (mode !== 'list' || !selected) return;
    panelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [mode, selected]);

  /* --- keyboard ------------------------------------------------------------ */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel();
      if (
        event.key === '/' &&
        document.activeElement !== searchRef.current &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePanel]);

  /* --- derived render data -------------------------------------------------- */

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!atlas || q.length < 2) return [];
    const prefix: AtlasNode[] = [];
    const contains: AtlasNode[] = [];
    for (const node of atlas.nodes) {
      const title = node.t.toLowerCase();
      if (title.startsWith(q)) prefix.push(node);
      else if (title.includes(q) || node.v.toLowerCase().includes(q)) contains.push(node);
      if (prefix.length >= 12) break;
    }
    const rank = (a: AtlasNode, b: AtlasNode) => b.r - a.r || b.cc - a.cc;
    return [...prefix.sort(rank), ...contains.sort(rank)].slice(0, 10);
  }, [query, atlas]);

  const activeIndex = cursor >= 0 && cursor < results.length ? cursor : -1;

  const listNodes = useMemo(() => {
    if (!atlas || mode !== 'list') return [];
    return atlas.nodes
      .filter((n) => (verifiedOnly ? n.r === 1 : true))
      .sort((a, b) => b.r - a.r || b.cc - a.cc);
  }, [atlas, mode, verifiedOnly]);

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => (c + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) => (c <= 0 ? results.length - 1 : c - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      openNode(results[activeIndex >= 0 ? activeIndex : 0].id);
      searchRef.current?.blur();
    } else if (event.key === 'Escape') {
      setQuery('');
    }
  };

  const selectedRegion = selected ? atlas?.regions.get(selected.c) : undefined;

  return (
    <div>
      {/* (2) Search-first: experts arrive with a paper already in mind. */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="relative min-w-[260px] flex-1 sm:max-w-md">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(-1);
            }}
            onKeyDown={onSearchKeyDown}
            placeholder="Search papers by title or venue…"
            aria-label="Search papers by title or venue"
            autoComplete="off"
            className="w-full rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) placeholder:text-(--color-text-muted) focus:ring-2 focus:ring-(--color-accent) focus:outline-hidden"
          />
          {results.length > 0 && (
            <ul className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-(--color-border) bg-(--color-bg) shadow-lg">
              {results.map((node, i) => (
                <li key={node.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => openNode(node.id)}
                    className={`w-full px-3 py-2 text-left text-sm ${
                      i === activeIndex ? 'bg-(--color-bg-secondary)' : ''
                    }`}
                  >
                    <span className="block leading-snug text-(--color-text)">{node.t}</span>
                    <span className="mt-0.5 block text-xs text-(--color-text-muted)">
                      {nodeSubtitle(node, atlas?.regions.get(node.c))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* (1) Verified-only is the default view; the full corpus is a toggle. */}
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-(--color-text-secondary) select-none">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => {
              setVerifiedOnly(e.target.checked);
              setRevealed(false);
              setListLimit(40);
            }}
            className="accent-(--color-accent)"
          />
          Verified reviews only
        </label>

        {phase === 'ready' && atlas && (
          <p className="text-xs text-(--color-text-muted)">
            {verifiedOnly
              ? `${atlas.reviewed.toLocaleString()} papers with a PDF-verified review`
              : `${atlas.nodes.length.toLocaleString()} papers · ${atlas.reviewed.toLocaleString()} verified`}
            {` · ${atlas.regionCount} regions`}
            {mode === 'graph' && edgePhase === 'loading' && ' · loading similarity links…'}
          </p>
        )}
      </div>

      {revealed && (
        <p className="mb-3 rounded-md border border-(--color-border) bg-(--color-bg-secondary) px-3 py-2 text-xs text-(--color-text-secondary)">
          That paper has no verified review yet, so the full corpus is now shown.
        </p>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1">
          {mode !== 'list' && (
            <div
              className="relative overflow-hidden rounded-lg border border-(--color-border) bg-(--color-bg-secondary)"
              style={{ height: 'min(72vh, 760px)', minHeight: '420px' }}
            >
              <div ref={containerRef} className="absolute inset-0" />
              <div
                ref={overlayRef}
                className="pointer-events-none absolute inset-0 overflow-hidden"
              />
              <div
                ref={tooltipRef}
                className="pointer-events-none absolute top-0 left-0 max-w-[280px] rounded-md border border-(--color-border) bg-(--color-bg) px-2.5 py-1.5 text-xs leading-snug text-(--color-text) opacity-0 shadow-lg transition-opacity"
              />
              {(phase === 'loading' || mode === 'pending') && (
                <p className="absolute inset-0 flex items-center justify-center text-sm text-(--color-text-secondary)">
                  Loading the atlas…
                </p>
              )}
              {phase === 'error' && (
                <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-(--color-text-secondary)">
                  The atlas data could not be loaded.
                </p>
              )}
              {phase === 'ready' && mode === 'graph' && (
                <p className="absolute bottom-2 left-3 text-[11px] text-(--color-text-muted)">
                  Scroll to zoom · drag to pan · click a region name to fly there
                </p>
              )}
            </div>
          )}

          {mode === 'list' && (
            <div className="rounded-lg border border-(--color-border)">
              <p className="border-b border-(--color-border) px-4 py-3 text-xs text-(--color-text-secondary)">
                {phase === 'ready'
                  ? 'The map needs a wider screen and WebGL. Same corpus, same verified reviews — as a list, newest-cited first.'
                  : phase === 'error'
                    ? 'The atlas data could not be loaded.'
                    : 'Loading the atlas…'}
              </p>
              <ul className="divide-y divide-(--color-border)">
                {listNodes.slice(0, listLimit).map((node) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => openNode(node.id)}
                      className="w-full px-4 py-3 text-left hover:bg-(--color-bg-secondary)"
                    >
                      <span className="block text-sm leading-snug font-medium text-(--color-text)">
                        {node.t}
                      </span>
                      <span className="mt-1 block text-xs text-(--color-text-muted)">
                        {nodeSubtitle(node, atlas?.regions.get(node.c))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {listNodes.length > listLimit && (
                <button
                  type="button"
                  onClick={() => setListLimit((n) => n + 60)}
                  className="w-full border-t border-(--color-border) px-4 py-3 text-sm text-(--color-accent)"
                >
                  Show more ({(listNodes.length - listLimit).toLocaleString()} remaining)
                </button>
              )}
            </div>
          )}
        </div>

        {selected && (
          <aside
            ref={panelRef}
            aria-label="Paper details"
            className={`w-full shrink-0 rounded-lg border border-(--color-border) bg-(--color-bg) p-5 lg:w-[400px] ${
              mode === 'list' ? 'order-first lg:order-none' : ''
            }`}
            style={mode === 'list' ? undefined : { maxHeight: 'min(72vh, 760px)' }}
          >
            <PaperPanel
              key={selected.id}
              node={selected}
              regionLabel={selectedRegion?.label ?? 'Unclustered'}
              regionNote={selectedRegion && selectedRegion.id >= 0 ? selectedRegion.note : null}
              neighbors={neighbors}
              onOpenNode={openNode}
              onClose={closePanel}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
