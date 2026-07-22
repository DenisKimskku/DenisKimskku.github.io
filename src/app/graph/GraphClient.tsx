'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type Sigma from 'sigma';

interface AtlasNode {
  id: string;
  x: number;
  y: number;
  c: number | null; // cluster id
  cl: string; // cluster label
  t: string; // title
  yr: number | null;
  s: number; // size
  r: 0 | 1; // has verified review
  u: string | null; // outbound link (arXiv abs / publisher page)
  tip?: string;
}

interface AtlasCluster {
  id: number;
  label: string;
  label_note: string | null;
  size: number;
  color: string;
}

interface ReviewFacts {
  datasets_used?: string[];
  quantitative_results?: string[];
  baselines_compared?: string[];
}

interface Review {
  one_line_takeaway?: string;
  key_finding?: string;
  core_contribution?: string;
  threat_model?: string;
  limitations?: string;
  facts?: ReviewFacts;
  badge?: {
    generator_model?: string;
    verifier_model?: string;
    verified_at?: string;
    verdict?: string;
  };
}

type AtlasEdge = [string, string, number];

function modelShort(model?: string): string {
  if (!model) return '';
  return model
    .replace(/^claude-/, '')
    .split('-')
    .map((w) => (/^\d/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

function badgeText(review: Review | null): string {
  const b = review?.badge;
  if (!b) return '';
  const parts = ['PDF-verified'];
  const m = modelShort(b.verifier_model || b.generator_model);
  if (m) parts.push(m);
  if (b.verified_at) parts.push(b.verified_at.slice(0, 10));
  return parts.join(' · ');
}

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function GraphClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const nodesRef = useRef<Map<string, AtlasNode>>(new Map());
  const verifiedOnlyRef = useRef(true);
  const selectedRef = useRef<string | null>(null);
  const themeRef = useRef({ edge: '#e5e5e5', label: '#1a1a1a', muted: '#c4c4c4' });

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AtlasNode[]>([]);
  const [selected, setSelected] = useState<AtlasNode | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [counts, setCounts] = useState({ total: 0, reviewed: 0 });

  // Keep refs in sync with state used inside sigma reducers.
  useEffect(() => {
    verifiedOnlyRef.current = verifiedOnly;
    sigmaRef.current?.refresh();
  }, [verifiedOnly]);

  useEffect(() => {
    selectedRef.current = selected ? selected.id : null;
    sigmaRef.current?.refresh();
  }, [selected]);

  const openNode = useCallback((id: string) => {
    const node = nodesRef.current.get(id);
    if (!node) return;
    if (node.r === 0 && verifiedOnlyRef.current) {
      setVerifiedOnly(false);
    }
    setSelected(node);
    setQuery('');
    setResults([]);
    const sigma = sigmaRef.current;
    if (sigma) {
      const display = sigma.getNodeDisplayData(id);
      if (display) {
        sigma.getCamera().animate(
          { x: display.x, y: display.y, ratio: 0.08 },
          { duration: 500 }
        );
      }
    }
  }, []);

  // Fetch the lazy per-node review when a reviewed node is selected.
  useEffect(() => {
    if (!selected || selected.r !== 1) {
      setReview(null);
      setReviewStatus('idle');
      return;
    }
    let cancelled = false;
    setReviewStatus('loading');
    setReview(null);
    fetch(`/atlas/reviews/${selected.id}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Review) => {
        if (!cancelled) {
          setReview(data);
          setReviewStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setReviewStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  // Build the sigma instance once data is loaded.
  useEffect(() => {
    let disposed = false;
    let sigma: Sigma | null = null;
    let observer: MutationObserver | null = null;

    async function init() {
      try {
        const [nodesRes, edgesRes, clustersRes] = await Promise.all([
          fetch('/atlas/nodes.json'),
          fetch('/atlas/edges.json'),
          fetch('/atlas/clusters.json'),
        ]);
        if (!nodesRes.ok || !edgesRes.ok || !clustersRes.ok) {
          throw new Error('atlas data fetch failed');
        }
        const nodes: AtlasNode[] = await nodesRes.json();
        const edges: AtlasEdge[] = await edgesRes.json();
        const clusters: AtlasCluster[] = await clustersRes.json();
        if (disposed || !containerRef.current) return;

        const clusterColor = new Map<number, string>();
        clusters.forEach((cl) => clusterColor.set(cl.id, cl.color));

        const [{ default: SigmaCtor }, { default: Graph }] = await Promise.all([
          import('sigma'),
          import('graphology'),
        ]);
        if (disposed || !containerRef.current) return;

        const graph = new Graph({ type: 'undirected', multi: false });
        const nodeMap = new Map<string, AtlasNode>();
        let reviewed = 0;
        for (const n of nodes) {
          nodeMap.set(n.id, n);
          if (n.r === 1) reviewed += 1;
          graph.addNode(n.id, {
            x: n.x,
            y: n.y,
            size: n.s,
            label: n.t,
            color: (n.c !== null && clusterColor.get(n.c)) || '#999999',
            reviewed: n.r === 1,
          });
        }
        for (const [src, dst, weight] of edges) {
          if (graph.hasNode(src) && graph.hasNode(dst) && !graph.hasEdge(src, dst)) {
            graph.addEdge(src, dst, { weight });
          }
        }
        nodesRef.current = nodeMap;
        setCounts({ total: nodes.length, reviewed });

        const readTheme = () => {
          themeRef.current = {
            edge: cssVar('--color-border', '#e5e5e5'),
            label: cssVar('--color-text', '#1a1a1a'),
            muted: cssVar('--color-border-light', '#f0f0f0'),
          };
        };
        readTheme();

        sigma = new SigmaCtor(graph, containerRef.current, {
          renderEdgeLabels: false,
          labelRenderedSizeThreshold: 7,
          labelDensity: 0.12,
          labelFont: 'Inter, sans-serif',
          labelSize: 12,
          minCameraRatio: 0.01,
          maxCameraRatio: 2,
          nodeReducer: (node, data) => {
            const attrs = { ...data };
            const isReviewed = Boolean(data.reviewed);
            if (verifiedOnlyRef.current && !isReviewed) {
              attrs.hidden = true;
              return attrs;
            }
            attrs.labelColor = themeRef.current.label;
            if (selectedRef.current === node) {
              attrs.highlighted = true;
              attrs.size = (data.size as number) + 3;
              attrs.zIndex = 2;
            } else if (!isReviewed) {
              // De-emphasize unreviewed nodes when everything is shown.
              attrs.color = `${data.color}`;
              attrs.zIndex = 0;
            } else {
              attrs.zIndex = 1;
            }
            return attrs;
          },
          edgeReducer: (edge, data) => {
            const attrs = { ...data };
            const [a, b] = graph.extremities(edge);
            const aData = graph.getNodeAttributes(a);
            const bData = graph.getNodeAttributes(b);
            if (verifiedOnlyRef.current && (!aData.reviewed || !bData.reviewed)) {
              attrs.hidden = true;
              return attrs;
            }
            attrs.color = themeRef.current.edge;
            attrs.size = 0.4;
            return attrs;
          },
        });
        sigmaRef.current = sigma;

        sigma.on('clickNode', ({ node }) => openNode(node));
        sigma.on('clickStage', () => setSelected(null));

        // Re-read CSS variables when the site theme toggles.
        observer = new MutationObserver(() => {
          readTheme();
          sigma?.refresh();
        });
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        });

        setStatus('ready');
      } catch {
        if (!disposed) setStatus('error');
      }
    }

    init();
    return () => {
      disposed = true;
      observer?.disconnect();
      sigma?.kill();
      sigmaRef.current = null;
    };
  }, [openNode]);

  // Title search over all nodes.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const q = query.trim().toLowerCase();
    const matches: AtlasNode[] = [];
    for (const node of nodesRef.current.values()) {
      if (node.t.toLowerCase().includes(q)) {
        matches.push(node);
        if (matches.length >= 8) break;
      }
    }
    setResults(matches);
  }, [query]);

  const sectionHeading =
    'text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mt-4 mb-1';
  const sectionBody = 'text-sm text-[var(--color-text)] leading-relaxed';

  const factList = (title: string, items?: string[]) => {
    if (!items || items.length === 0) return null;
    return (
      <div key={title}>
        <h4 className={sectionHeading}>{title}</h4>
        <ul className="list-disc pl-5 space-y-1">
          {items.map((item, i) => (
            <li key={i} className={sectionBody}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div>
      {/* Controls: search first, then filter toggle */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search paper titles…"
            aria-label="Search paper titles"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          {results.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] shadow-lg max-h-72 overflow-y-auto">
              {results.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => openNode(node.id)}
                    className="w-full text-left px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]"
                  >
                    <span className="block">{node.t}</span>
                    <span className="block text-xs text-[var(--color-text-muted)]">
                      {node.yr ?? ''} {node.cl ? `· ${node.cl}` : ''}
                      {node.r === 1 ? ' · verified review' : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          Verified reviews only
        </label>
        {status === 'ready' && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {verifiedOnly
              ? `${counts.reviewed.toLocaleString()} verified papers`
              : `${counts.total.toLocaleString()} papers · ${counts.reviewed.toLocaleString()} verified`}
          </span>
        )}
      </div>

      {/* Graph canvas + side panel */}
      <div className="relative flex flex-col lg:flex-row gap-4">
        <div
          className="relative flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden"
          style={{ height: 'min(70vh, 720px)', minHeight: '420px' }}
        >
          <div ref={containerRef} className="absolute inset-0" />
          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--color-text-secondary)]">
              Loading atlas…
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--color-text-secondary)]">
              Could not load the atlas data. Please try again later.
            </div>
          )}
        </div>

        {selected && (
          <aside
            className="lg:w-[380px] lg:max-w-[40%] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-5 overflow-y-auto"
            style={{ maxHeight: 'min(70vh, 720px)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-[var(--color-text)] leading-snug">
                {selected.u ? (
                  <a
                    href={selected.u}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--color-accent)]"
                  >
                    {selected.t}
                  </a>
                ) : (
                  selected.t
                )}
              </h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close panel"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {selected.yr ?? ''} {selected.cl ? `· ${selected.cl}` : ''}
            </p>

            {selected.r === 1 ? (
              <div>
                {reviewStatus === 'ready' && review && (
                  <span className="mt-3 inline-block rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
                    {badgeText(review) || 'PDF-verified'}
                  </span>
                )}
                {reviewStatus === 'loading' && (
                  <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
                    Loading review…
                  </p>
                )}
                {reviewStatus === 'error' && (
                  <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
                    Could not load this review.
                  </p>
                )}
                {reviewStatus === 'ready' && review && (
                  <div>
                    {review.one_line_takeaway && (
                      <div>
                        <h3 className={sectionHeading}>Takeaway</h3>
                        <p className={sectionBody}>{review.one_line_takeaway}</p>
                      </div>
                    )}
                    {review.key_finding && (
                      <div>
                        <h3 className={sectionHeading}>Key finding</h3>
                        <p className={sectionBody}>{review.key_finding}</p>
                      </div>
                    )}
                    {review.core_contribution && (
                      <div>
                        <h3 className={sectionHeading}>Core contribution</h3>
                        <p className={sectionBody}>{review.core_contribution}</p>
                      </div>
                    )}
                    {review.threat_model && (
                      <div>
                        <h3 className={sectionHeading}>Threat model</h3>
                        <p className={sectionBody}>{review.threat_model}</p>
                      </div>
                    )}
                    {review.limitations && (
                      <div>
                        <h3 className={sectionHeading}>Limitations</h3>
                        <p className={sectionBody}>{review.limitations}</p>
                      </div>
                    )}
                    {factList('Datasets', review.facts?.datasets_used)}
                    {factList('Quantitative results', review.facts?.quantitative_results)}
                    {factList('Baselines compared', review.facts?.baselines_compared)}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Not yet verified — metadata only.
                </p>
                {selected.u && (
                  <a
                    href={selected.u}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-[var(--color-accent)] hover:underline"
                  >
                    View paper page →
                  </a>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      <p className="mt-3 text-xs text-[var(--color-text-muted)]">
        Layout: UMAP over paper embeddings · colors are topic clusters ·
        scroll to zoom, drag to pan, click a dot for details.
      </p>
    </div>
  );
}
