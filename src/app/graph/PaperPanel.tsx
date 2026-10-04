'use client';

import { Fragment, useEffect, useState } from 'react';
import type { AtlasNode, Review } from './atlasTypes';
import {
  ABSTRACT_HEADING,
  ABSTRACT_NOTE,
  BARE_HEADING,
  NO_LANDING_PAGE,
  REVIEW_BADGE,
  REVIEW_DISCLOSURE,
  SIMILAR_HEADING,
  TIER_LABEL,
  bareNote,
  formatCount,
  landingUrl,
  reviewProvenance,
  stripPipelineNoise,
} from './atlasCopy';

/* The panel renders an explicit whitelist of fields in a fixed order. Nothing
   is ever produced by iterating the payload, so a future export key (e.g.
   grounding_note, which must never reach a reader) cannot leak into the UI.
   Every provenance string comes from reviewProvenance() in atlasCopy.ts. */

const HEADING =
  'text-[11px] font-semibold uppercase tracking-[0.08em] text-(--color-text-muted) mb-1.5';
const BODY = 'text-sm leading-relaxed text-(--color-text)';

function Section({ title, text }: { title: string; text?: string }) {
  const value = stripPipelineNoise(text);
  if (!value) return null;
  return (
    <section className="mt-5">
      <h3 className={HEADING}>{title}</h3>
      <p className={BODY}>{value}</p>
    </section>
  );
}

function FactChips({ title, items }: { title: string; items?: string[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!items || items.length === 0) return null;
  const LIMIT = 5;
  const shown = expanded ? items : items.slice(0, LIMIT);
  return (
    <div className="mt-4">
      <h4 className={HEADING}>{title}</h4>
      <ul className="flex flex-wrap gap-1.5">
        {shown.map((item, i) => (
          <li
            key={i}
            className="rounded-md border border-(--color-border) bg-(--color-bg-secondary) px-2 py-1 text-xs leading-snug text-(--color-text-secondary)"
          >
            {item}
          </li>
        ))}
      </ul>
      {items.length > LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-xs text-(--color-accent) hover:underline"
        >
          {expanded ? 'Show fewer' : `Show ${items.length - LIMIT} more`}
        </button>
      )}
    </div>
  );
}

interface PaperPanelProps {
  node: AtlasNode;
  regionLabel: string;
  regionNote?: string | null;
  neighbors: AtlasNode[];
  onOpenNode: (id: string) => void;
  onClose: () => void;
}

export default function PaperPanel({
  node,
  regionLabel,
  regionNote,
  neighbors,
  onOpenNode,
  onClose,
}: PaperPanelProps) {
  const [review, setReview] = useState<Review | null>(null);
  const [abstract, setAbstract] = useState<string | null>(null);
  // The panel is remounted per paper (keyed on node.id by the caller), so the
  // initial state is the state -- no effect has to reset it.
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    node.r === 1 || node.a === 1 ? 'loading' : 'idle'
  );

  /* Payloads are SHARDED, 256 buckets keyed on the id's first two hex chars,
     and fetched on demand. One file per paper would have put 16,255 files in
     the repo; the whole working tree is ~1,300 and git history cannot be
     un-made. Over-fetch is ~78KB per shard, cacheable, and far cheaper than the
     file count. Neither payload set is ever bundled into the page. */
  useEffect(() => {
    if (node.r !== 1 && node.a !== 1) return;
    let cancelled = false;
    const shard = node.id.slice(0, 2).toLowerCase();

    const pull = <T,>(dir: string): Promise<T | null> =>
      fetch(`/atlas/${dir}/${encodeURIComponent(shard)}.json`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((blob: Record<string, T>) => blob[node.id] ?? null);

    Promise.all([
      node.r === 1 ? pull<Review>('reviews') : Promise.resolve(null),
      node.a === 1
        ? pull<{ abstract?: string }>('abstracts').then((d) => d?.abstract ?? null)
        : Promise.resolve(null),
    ])
      .then(([rev, abs]) => {
        if (cancelled) return;
        setReview(rev);
        setAbstract(abs);
        // A flagged node whose payload is missing is a build error, not an
        // empty state -- surface it rather than rendering a blank panel.
        setStatus(rev || abs ? 'ready' : 'error');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [node.id, node.r, node.a]);

  const prov = status === 'ready' && review ? reviewProvenance(review.provenance) : null;
  const takeaway = stripPipelineNoise(review?.one_line_takeaway);
  // Never a raw file and never a stub DOI: landingUrl() is the only way a
  // paper link reaches the page (CONTEXT §5 invariant 1).
  const link = landingUrl(node.u);

  const meta = [
    node.yr ? String(node.yr) : null,
    node.v || null,
    node.cc > 0 ? `${formatCount(node.cc)} citation${node.cc === 1 ? '' : 's'}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-(--color-text-muted)">
            {regionLabel}
          </p>
          <h2 className="mt-1 font-serif text-lg leading-snug font-semibold text-(--color-text)">
            {node.t}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close paper panel"
          className="-mt-1 shrink-0 rounded-md px-2 py-1 text-lg leading-none text-(--color-text-muted) hover:bg-(--color-bg-secondary) hover:text-(--color-text)"
        >
          &times;
        </button>
      </div>

      {meta.length > 0 && (
        <p className="mt-1.5 text-xs text-(--color-text-secondary)">{meta.join(' · ')}</p>
      )}

      <div className="mt-1 min-h-0 flex-1 overflow-y-auto pr-1">
        {/* Review provenance, on every reviewed paper. The badge text is fixed,
            so it never waits on the fetch or changes width; the line under it
            reserves its height while the review loads. The raw model id
            appears only inside the disclosure. */}
        {node.r === 1 && (
          <div className="mt-3">
            <span
              id="atlas-review-label"
              data-atlas-measure="badge"
              className="inline-flex items-center rounded-full border border-(--color-border) bg-(--color-bg-secondary) px-2.5 py-0.5 text-[11px] font-medium text-(--color-text-secondary)"
            >
              {REVIEW_BADGE}
            </span>
            <p
              data-atlas-measure="provenance"
              className="mt-2 mb-0 min-h-[1.25rem] text-[13px] leading-relaxed text-(--color-text-secondary)"
            >
              {prov?.summary}
            </p>
            {prov?.minorIssues && (
              <p
                data-atlas-measure="minor"
                className="mt-1.5 mb-0 flex items-start gap-1.5 text-[13px] text-(--color-text)"
              >
                <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#fab219]" />
                {prov.minorIssues}
              </p>
            )}
            {prov && prov.details.length > 0 && (
              <details className="group mt-2" data-atlas-measure="how-made">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm text-[13px] font-medium text-(--color-text-secondary) hover:text-(--color-text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent) [&::-webkit-details-marker]:hidden">
                  <span
                    aria-hidden="true"
                    className="inline-block w-3 motion-safe:transition-transform group-open:rotate-90"
                  >
                    &rsaquo;
                  </span>
                  {REVIEW_DISCLOSURE}
                </summary>
                <dl className="mt-2 mb-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
                  {prov.details.map((row) => (
                    <Fragment key={row.term}>
                      <dt className="text-(--color-text-muted)">{row.term}</dt>
                      <dd className="min-w-0 text-(--color-text-secondary)">
                        {row.mono ? (
                          <code className="font-mono text-[12px] text-(--color-text) [overflow-wrap:anywhere]">
                            {row.value}
                          </code>
                        ) : (
                          row.value
                        )}
                        {row.note && (
                          <span className="mt-0.5 block text-[12.5px] leading-snug text-(--color-text-muted)">
                            {row.note}
                          </span>
                        )}
                      </dd>
                    </Fragment>
                  ))}
                </dl>
                <p className="mt-2 mb-0 text-[12.5px] leading-snug text-(--color-text-muted)">
                  {prov.closing}
                </p>
              </details>
            )}
          </div>
        )}

        {(node.r === 1 || node.a === 1) && status === 'loading' && (
          <p className="mt-5 text-sm text-(--color-text-secondary)" aria-live="polite">
            Loading&hellip;
          </p>
        )}

        {(node.r === 1 || node.a === 1) && status === 'error' && (
          <p className="mt-5 text-sm text-(--color-text-secondary)">
            This paper&rsquo;s panel could not be loaded.
          </p>
        )}

        {/* The paper's abstract, for papers with no review (most of the corpus
            that has any text). It comes from the bibliographic record with no
            model in the loop, and is labelled as such directly under its
            heading, so it is never mistaken for model-written review content. */}
        {node.r === 0 && node.a === 1 && status === 'ready' && abstract && (
          <div className="mt-5">
            <h3 className={HEADING}>{ABSTRACT_HEADING}</h3>
            <p data-atlas-measure="abstract-note" className="mb-0 text-xs leading-snug text-(--color-text-muted)">
              {ABSTRACT_NOTE}
            </p>
            <p className="mt-2.5 text-sm leading-relaxed whitespace-pre-line text-(--color-text-secondary)">
              {abstract}
            </p>
          </div>
        )}

        {/* Honest empty state, never a fabricated summary: only for papers with
            NEITHER payload. It names only what the record holds. */}
        {node.r === 0 && node.a === 0 && (
          <div className="mt-5 rounded-lg border border-dashed border-(--color-border) bg-(--color-bg-secondary) p-4">
            <p className="text-sm font-medium text-(--color-text)">{BARE_HEADING}</p>
            <p data-atlas-measure="bare-note" className="mt-1.5 text-sm leading-relaxed text-(--color-text-secondary)">
              {bareNote(Boolean(node.v), Boolean(link))}
            </p>
          </div>
        )}

        {node.r === 1 && status === 'ready' && review && (
          <>
            {/* one_line_takeaway as a verdict box, then the fixed order. */}
            {takeaway && (
              <div className="mt-4 rounded-lg border-l-[3px] border-(--color-accent) bg-(--color-bg-secondary) px-4 py-3">
                <p className="text-[15px] leading-relaxed font-medium text-(--color-text)">
                  {takeaway}
                </p>
              </div>
            )}
            <Section title="Key finding" text={review.key_finding} />
            <Section title="Core contribution" text={review.core_contribution} />
            <Section title="Threat model" text={review.threat_model} />
            <Section title="Limitations" text={review.limitations} />
            {review.facts && (
              <div className="mt-5 border-t border-(--color-border) pt-4">
                <FactChips title="Datasets" items={review.facts.datasets_used} />
                <FactChips title="Quantitative results" items={review.facts.quantitative_results} />
                <FactChips title="Baselines compared" items={review.facts.baselines_compared} />
              </div>
            )}
          </>
        )}

        {regionNote && (
          <div className="mt-6 border-t border-(--color-border) pt-4">
            <h3 className={HEADING}>About this region</h3>
            <p className="text-sm leading-relaxed text-(--color-text-secondary)">{regionNote}</p>
          </div>
        )}

        {neighbors.length > 0 && (
          <div className="mt-6 border-t border-(--color-border) pt-4">
            <h3 className={HEADING}>{SIMILAR_HEADING}</h3>
            <ul className="space-y-1">
              {neighbors.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onOpenNode(n.id)}
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm leading-snug text-(--color-text-secondary) hover:bg-(--color-bg-secondary) hover:text-(--color-text)"
                  >
                    {n.t}
                    {n.r === 1 && (
                      <span className="ml-1.5 text-[10px] tracking-wide whitespace-nowrap text-(--color-text-muted) uppercase">
                        {TIER_LABEL.review}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* The public landing page, through landingUrl(): never a raw file. */}
      <div data-atlas-measure="link" className="mt-4 shrink-0 border-t border-(--color-border) pt-3">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-(--color-accent) hover:underline"
          >
            Open the paper &#8599;
          </a>
        ) : (
          <span className="text-xs text-(--color-text-muted)">{NO_LANDING_PAGE}</span>
        )}
      </div>
    </div>
  );
}
