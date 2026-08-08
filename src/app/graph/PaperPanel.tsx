'use client';

import { useEffect, useState } from 'react';
import type { AtlasNode, Review, ReviewProvenance } from './atlasTypes';

/* The panel renders an explicit whitelist of fields in a fixed order. Nothing
   is ever produced by iterating the payload, so a future export key (e.g.
   grounding_note, which must never reach a reader) cannot leak into the UI. */

/* Belt-and-braces: the exporter already strips pipeline disclaimers, but if one
   ever survives, drop the sentence rather than showing the reader plumbing. */
const PIPELINE_NOISE =
  /(pages read|portion of the text|portion of the paper|only a portion|excerpt provided|text provided to me|based on the provided excerpt)/i;

function clean(text?: string | null): string {
  if (!text) return '';
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g);
  if (!sentences) return text.trim();
  const kept = sentences.filter((s) => !PIPELINE_NOISE.test(s));
  const out = kept.join('').trim();
  return out || text.trim();
}

/* Model ids are printed verbatim. A provenance badge that prettifies
   'claude-opus-4-8[1m]' into a guessed product name would be asserting
   something the payload does not say. */
function modelPart(p: ReviewProvenance): string {
  const generator = p.generator_model;
  const verifier = p.verifier_model;
  if (generator && verifier && generator !== verifier) return `${generator} → ${verifier}`;
  return verifier || generator || '';
}

/** Badge parts. A date is shown only when the payload carries one — the older
    review batch has `date_note` instead of `verified_at`, rendered separately;
    neither is ever invented. */
function badgeParts(p?: ReviewProvenance): string[] {
  if (!p) return [];
  const parts = [p.source === 'PDF full text' ? 'PDF-verified' : p.source || 'Verified'];
  const model = modelPart(p);
  if (model) parts.push(model);
  if (p.verified_at) parts.push(p.verified_at.slice(0, 10));
  return parts;
}

const HEADING =
  'text-[11px] font-semibold uppercase tracking-[0.08em] text-(--color-text-muted) mb-1.5';
const BODY = 'text-sm leading-relaxed text-(--color-text)';

function Section({ title, text }: { title: string; text?: string }) {
  const value = clean(text);
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
  // The panel is remounted per paper (keyed on node.id by the caller), so the
  // initial state is the state -- no effect has to reset it.
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    node.r === 1 ? 'loading' : 'idle'
  );

  /* Reviews are fetched one file at a time, on demand: 2,544 payloads (~22 MB)
     are never bundled into the page. */
  useEffect(() => {
    if (node.r !== 1) return;
    let cancelled = false;
    fetch(`/atlas/reviews/${encodeURIComponent(node.id)}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Review) => {
        if (cancelled) return;
        setReview(data);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [node.id, node.r]);

  const provenance = review?.provenance;
  const parts = badgeParts(provenance);
  const minorIssues = provenance?.verifier_verdict === 'minor_issues';
  const takeaway = clean(review?.one_line_takeaway);

  const meta = [
    node.yr ? String(node.yr) : null,
    node.v || null,
    node.cc > 0 ? `${node.cc.toLocaleString()} citation${node.cc === 1 ? '' : 's'}` : null,
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

      {/* (3) Provenance badge — the differentiator. Shown on every reviewed node. */}
      {node.r === 1 && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-(--color-accent)/40 bg-(--color-accent)/10 px-2.5 py-1 text-[11px] font-medium text-(--color-accent)">
              <span aria-hidden="true">&#10003;</span>
              {status === 'ready' && parts.length > 0 ? (
                <span className="font-mono tracking-tight">{parts.join(' · ')}</span>
              ) : (
                'PDF-verified review'
              )}
            </span>
            {status === 'ready' && minorIssues && (
              <span
                title="The verifier passed this review, but flagged minor issues with it."
                className="rounded-full border border-(--color-border) bg-(--color-bg-secondary) px-2.5 py-1 text-[11px] text-(--color-text-secondary)"
              >
                verifier: minor issues
              </span>
            )}
          </div>
          {/* Older batch: no verification timestamp was recorded. Say so; do
              not substitute a date from anywhere else. */}
          {status === 'ready' && !provenance?.verified_at && provenance?.date_note && (
            <p className="mt-1 text-[11px] leading-snug text-(--color-text-muted)">
              {provenance.date_note}
            </p>
          )}
        </div>
      )}

      <div className="mt-1 min-h-0 flex-1 overflow-y-auto pr-1">
        {node.r === 1 && status === 'loading' && (
          <p className="mt-5 text-sm text-(--color-text-secondary)" aria-live="polite">
            Loading verified review&hellip;
          </p>
        )}

        {node.r === 1 && status === 'error' && (
          <p className="mt-5 text-sm text-(--color-text-secondary)">
            The review file for this paper could not be loaded.
          </p>
        )}

        {/* (6) Honest empty state — never a fabricated summary. */}
        {node.r === 0 && (
          <div className="mt-5 rounded-lg border border-dashed border-(--color-border) bg-(--color-bg-secondary) p-4">
            <p className="text-sm font-medium text-(--color-text)">
              Not yet verified &mdash; metadata only
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-(--color-text-secondary)">
              This paper is in the corpus and placed by embedding similarity, but it has not
              been through the read-the-PDF-and-verify pass. No summary is shown, because none
              has been checked against the source.
            </p>
          </div>
        )}

        {node.r === 1 && status === 'ready' && review && (
          <>
            {/* (4) one_line_takeaway as a verdict box, then the fixed order. */}
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
            <h3 className={HEADING}>Nearest neighbours</h3>
            <ul className="space-y-1">
              {neighbors.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onOpenNode(n.id)}
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm leading-snug text-(--color-text-secondary) hover:bg-(--color-bg-secondary) hover:text-(--color-text)"
                  >
                    {n.r === 1 && (
                      <span className="mr-1 text-(--color-accent)" aria-label="verified review">
                        &#10003;
                      </span>
                    )}
                    {n.t}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* (7) Always the public landing page — never a stored PDF. */}
      <div className="mt-4 shrink-0 border-t border-(--color-border) pt-3">
        {node.u ? (
          <a
            href={node.u}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-(--color-accent) hover:underline"
          >
            Open the paper &#8599;
          </a>
        ) : (
          <span className="text-xs text-(--color-text-muted)">
            No public landing page recorded for this paper.
          </span>
        )}
      </div>
    </div>
  );
}
