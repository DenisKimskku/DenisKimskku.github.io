// The data for /graph (SPEC §4.1, §5.1–§5.3). The first payload (nodes and
// clusters) is fetched once at mount and built into the atlas model. The edges
// file is the second payload: it starts only once the page knows it will draw
// the map (a phone must not download it before the list decides it is narrow),
// is parsed in an idle period, and becomes adjacency lists. It is never
// attached to the renderer as graph edges.
//
// Load stages (SPEC §5.2), shown by the map's status card:
//   download  fetching nodes and clusters                 "Loading papers…"
//   build     the model is built; the map places papers   "Placing {N} papers on the map…"
//   draw      the renderer exists and draws its first frame "Drawing the map…"
//   ready     the map's first frame after its first fit (markReady, called from
//             exactly one place: the map's first afterRender)
//   error     a fetch or the renderer failed; "Try again" calls reload()

import { useCallback, useEffect, useState } from 'react';
import { buildAdjacency, buildAtlas, type Adjacency, type Atlas } from './atlasModel';
import type { AtlasCluster, AtlasEdge, AtlasNode } from './atlasTypes';

const NODES_URL = '/atlas/nodes.json';
const CLUSTERS_URL = '/atlas/clusters.json';
const EDGES_URL = '/atlas/edges.json';

/** The first payload as the list needs it: derived from the stage and the atlas. */
export type AtlasPhase = 'loading' | 'ready' | 'error';
export type LoadStage = 'download' | 'build' | 'draw' | 'ready' | 'error';
export type EdgePhase = 'idle' | 'loading' | 'ready' | 'error';
/** How the page can show the atlas: decided in an effect, so 'pending' on the server. */
export type Capability = 'pending' | 'map' | 'list-narrow' | 'list-nowebgl';

const NO_EDGES: Adjacency = new Map();

interface EdgeState {
  adjacency: Adjacency;
  /** bumps each time a new adjacency lands; 0 until the first */
  version: number;
  /** the attempt that failed, or -1 */
  failedAttempt: number;
}

/**
 * One paper's entry in a sharded payload. Reviews and abstracts are split
 * into 256 files keyed on the id's first two hex characters and fetched on
 * demand: one file per paper would have put 16,255 files in the repo, while a
 * shard is about 78 KB and cacheable. Neither set is ever bundled into the
 * page. Resolves to null when the shard has no entry for the paper, and
 * rejects when the shard cannot be fetched.
 */
export async function fetchShardEntry<T>(dir: 'reviews' | 'abstracts', id: string): Promise<T | null> {
  const shard = id.slice(0, 2).toLowerCase();
  const res = await fetch(`/atlas/${dir}/${encodeURIComponent(shard)}.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = (await res.json()) as Record<string, T>;
  return Object.prototype.hasOwnProperty.call(blob, id) ? (blob[id] ?? null) : null;
}

/** Run `cb` in an idle period (setTimeout fallback); returns a canceller. */
function whenIdle(cb: () => void): () => void {
  const w = window as unknown as {
    requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(cb, { timeout: 2500 });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, 350);
  return () => window.clearTimeout(id);
}

export function useAtlasData(capability: Capability): {
  atlas: Atlas | null;
  phase: AtlasPhase;
  stage: LoadStage;
  /** Marks the atlas as failed, e.g. when the map renderer cannot be built. */
  fail: () => void;
  /** Fetches the first payload again and rebuilds the map ("Try again"). */
  reload: () => void;
  /** The map's papers are placed and its renderer is about to draw. */
  markDrawing: () => void;
  /** The map's first frame after its first fit is on screen. */
  markReady: () => void;
  /** Similar papers per paper; empty until the edges file lands. */
  adjacency: Adjacency;
  /** Bumps when `adjacency` is replaced. */
  edgesVersion: number;
  edgePhase: EdgePhase;
  /** Starts (or retries) the edges download outside map mode. */
  loadEdges: () => void;
} {
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [stage, setStage] = useState<LoadStage>('download');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nodesRes, clustersRes] = await Promise.all([fetch(NODES_URL), fetch(CLUSTERS_URL)]);
        if (!nodesRes.ok || !clustersRes.ok) throw new Error('atlas fetch failed');
        const nodes: AtlasNode[] = await nodesRes.json();
        const clusters: AtlasCluster[] = await clustersRes.json();
        if (cancelled) return;
        setAtlas(buildAtlas(nodes, clusters));
        setStage('build');
      } catch {
        if (!cancelled) setStage('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const fail = useCallback(() => setStage('error'), []);
  // A new atlas object rebuilds the map from scratch, so a renderer failure
  // is retried too, not only a failed download.
  const reload = useCallback(() => {
    setAtlas(null);
    setStage('download');
    setReloadKey((k) => k + 1);
  }, []);
  // Guarded, so a late frame can never overwrite an error. 'ready' -> 'draw'
  // covers a rebuild of the same atlas (the window crossing 860px and back,
  // or List and back to Map); 'error' -> 'draw' covers such a rebuild after a
  // renderer failure (a sigma chunk that failed to load), which would
  // otherwise leave the error card over a working map. Only a live build
  // that got past its imports calls this, and a failed download leaves no
  // atlas to build, so a fetch error is never overwritten.
  const markDrawing = useCallback(
    () => setStage((s) => (s === 'build' || s === 'ready' || s === 'error' ? 'draw' : s)),
    []
  );
  const markReady = useCallback(() => setStage((s) => (s === 'draw' ? 'ready' : s)), []);
  const phase: AtlasPhase = atlas ? 'ready' : stage === 'error' ? 'error' : 'loading';

  /* --- the edges file ------------------------------------------------------- */

  const [edges, setEdges] = useState<EdgeState>({ adjacency: NO_EDGES, version: 0, failedAttempt: -1 });
  const [edgeAttempt, setEdgeAttempt] = useState(0);
  const [edgesRequested, setEdgesRequested] = useState(false);
  const wantEdges = capability === 'map' || edgesRequested;
  const edgesReady = edges.version > 0;
  const edgesFailed = edges.failedAttempt === edgeAttempt;

  useEffect(() => {
    if (!wantEdges || edgesReady || edgesFailed) return;
    // A cancelled flag, not an AbortController: React's dev double-mount
    // would otherwise log an aborted request on every load.
    let cancelled = false;
    let cancelIdle: (() => void) | null = null;
    (async () => {
      try {
        const res = await fetch(EDGES_URL, { priority: 'low' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // Parse when the main thread is idle, so the first paint never waits.
        await new Promise<void>((resolve) => {
          cancelIdle = whenIdle(resolve);
        });
        if (cancelled) return;
        const list: AtlasEdge[] = await res.json();
        if (cancelled) return;
        const adjacency = buildAdjacency(list);
        setEdges((s) => ({ adjacency, version: s.version + 1, failedAttempt: -1 }));
      } catch {
        if (!cancelled) setEdges((s) => ({ ...s, failedAttempt: edgeAttempt }));
      }
    })();
    return () => {
      cancelled = true;
      cancelIdle?.();
    };
  }, [wantEdges, edgesReady, edgesFailed, edgeAttempt]);

  const loadEdges = useCallback(() => {
    setEdgesRequested(true);
    setEdgeAttempt((n) => n + 1);
  }, []);

  const edgePhase: EdgePhase = edgesReady ? 'ready' : edgesFailed ? 'error' : wantEdges ? 'loading' : 'idle';

  return {
    atlas,
    phase,
    stage,
    fail,
    reload,
    markDrawing,
    markReady,
    adjacency: edges.adjacency,
    edgesVersion: edges.version,
    edgePhase,
    loadEdges,
  };
}
