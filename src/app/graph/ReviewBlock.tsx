'use client';

import { Fragment, useState } from 'react';
import { REVIEW_BADGE, REVIEW_DISCLOSURE, reviewProvenance, stripPipelineNoise } from './atlasCopy';
import type { Review } from './atlasTypes';

/* Copy deck P15–P17 and P34–P35 (SPEC §11.6); P9–P14 come from atlasCopy. */
const EXPAND_ALL = 'Expand all';
const COLLAPSE_ALL = 'Collapse all';
const FACTS_HEADING = 'Results and setup';
const LOADING_REVIEW = 'Loading the review…';
const REVIEW_FAILED = 'This paper’s review couldn’t be loaded.';
const TRY_AGAIN = 'Try again';

/** Items shown before "Show {n} more", the longest item shown whole, and the longest item set inline. */
const FACT_LIMIT = 5;
const FACT_CLAMP = 280;
const FACT_INLINE = 40;
/** A closed section previews this much of its text, on one line. */
const PREVIEW_CHARS = 140;

/** The shared small heading (SPEC §3.9), without a margin: each use sets its own. */
const HEADING = 'font-sans text-xs font-medium uppercase tracking-wider text-(--color-text-muted)';
const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)';

export type ReviewStatus = 'loading' | 'ready' | 'error';

/** A payload string, or '' for anything else (the payload is data, never trusted to be well-formed). */
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
/** A payload list of strings, trimmed, empties dropped. */
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim() !== '').map((s) => s.trim()) : [];

interface FactListProps {
  title: string;
  /** what the items are, for the button's full name: "Show 6 more quantitative results" */
  noun: string;
  items: string[];
  /** Datasets and baselines: one ·-joined line when every item is short. */
  inlineWhenShort?: boolean;
}

function FactList({ title, noun, items, inlineWhenShort = false }: FactListProps) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  const shown = expanded ? items : items.slice(0, FACT_LIMIT);
  const more = items.length - FACT_LIMIT;
  const inline = inlineWhenShort && items.every((item) => item.length <= FACT_INLINE);
  return (
    <div className="mt-3">
      <h4 className="mb-1.5 font-sans text-[13px] font-medium text-(--color-text)">{title}</h4>
      {inline ? (
        <p className="mb-0 text-[13.5px] leading-snug text-(--color-text-secondary) [overflow-wrap:anywhere]">
          {shown.join(' · ')}
        </p>
      ) : (
        <ul className="list-disc space-y-1.5 pl-4 text-[13.5px] leading-snug text-(--color-text-secondary) marker:text-(--color-text-muted) [overflow-wrap:anywhere]">
          {shown.map((item, i) => (
            <li key={i}>{item.length > FACT_CLAMP ? <span className="line-clamp-4">{item}</span> : item}</li>
          ))}
        </ul>
      )}
      {more > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? `Show fewer ${noun}` : `Show ${more} more ${noun}`}
          onClick={() => setExpanded((v) => !v)}
          className={`mt-1.5 inline-flex min-h-6 items-center rounded-sm text-xs font-medium text-(--color-accent) hover:underline ${FOCUS_RING}`}
        >
          {expanded ? 'Show fewer' : `Show ${more} more`}
        </button>
      )}
    </div>
  );
}

interface ReviewBlockProps {
  /** the review fetch: the panel's status for a reviewed paper (SPEC §9.6) */
  status: ReviewStatus;
  review: Review | null;
  onRetry: () => void;
}

/* The model-written review (SPEC §9.3). Invariant 3: an explicit whitelist of
   fields in a fixed order; nothing here iterates the payload, so a future key
   (a grounding note, say) can never reach a reader. Every provenance string
   comes from reviewProvenance(). The badge is fixed text, so it never waits
   on the fetch or shifts. Sans text under an accent rule, so it never reads
   like the abstract (serif, neutral rule). */
export default function ReviewBlock({ status, review, onRetry }: ReviewBlockProps) {
  const ready = status === 'ready' && review !== null;
  const prov = ready ? reviewProvenance(review.provenance) : null;
  const takeaway = ready ? stripPipelineNoise(str(review.one_line_takeaway)) : '';

  // The four sections, in the exporter's order; empty ones are skipped.
  const sections = ready
    ? [
        { id: 'key-finding', label: 'Key finding', text: stripPipelineNoise(str(review.key_finding)) },
        { id: 'core-contribution', label: 'Core contribution', text: stripPipelineNoise(str(review.core_contribution)) },
        { id: 'threat-model', label: 'Threat model', text: stripPipelineNoise(str(review.threat_model)) },
        { id: 'limitations', label: 'Limitations', text: stripPipelineNoise(str(review.limitations)) },
      ].filter((section) => section.text !== '')
    : [];
  // Key finding opens with the panel; the rest start closed.
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set(['key-finding']));
  const allOpen = sections.length > 0 && sections.every((section) => openIds.has(section.id));
  const setOpen = (id: string, open: boolean) =>
    setOpenIds((prev) => {
      if (prev.has(id) === open) return prev;
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });

  const facts = ready ? review.facts : undefined;
  const quantitative = strings(facts?.quantitative_results);
  const datasets = strings(facts?.datasets_used);
  const baselines = strings(facts?.baselines_compared);
  const hasFacts = quantitative.length + datasets.length + baselines.length > 0;

  return (
    <section
      aria-labelledby="atlas-review-label"
      data-atlas-measure="review"
      className="mt-5 border-l-2 border-(--color-accent) pl-4"
    >
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
        <p data-atlas-measure="minor" className="mt-1.5 mb-0 flex items-start gap-1.5 text-[13px] text-(--color-text)">
          <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#fab219]" />
          {prov.minorIssues}
        </p>
      )}
      {prov && prov.details.length > 0 && (
        <details className="group mt-2" data-atlas-measure="how-made">
          <summary
            className={`inline-flex min-h-6 cursor-pointer list-none items-center gap-1 rounded-sm text-[13px] font-medium text-(--color-text-secondary) hover:text-(--color-text) ${FOCUS_RING} [&::-webkit-details-marker]:hidden`}
          >
            <span aria-hidden="true" className="inline-block w-3 motion-safe:transition-transform group-open:rotate-90">
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
                    <code className="font-mono text-[12px] text-(--color-text) [overflow-wrap:anywhere]">{row.value}</code>
                  ) : (
                    row.value
                  )}
                  {row.note && (
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-(--color-text-muted)">{row.note}</span>
                  )}
                </dd>
              </Fragment>
            ))}
          </dl>
          <p className="mt-2 mb-0 text-[12.5px] leading-snug text-(--color-text-muted)">{prov.closing}</p>
        </details>
      )}

      {status === 'loading' && (
        // The lead slot while the review loads (SPEC §9.6).
        <div data-atlas-measure="loading" className="mt-4 space-y-2.5">
          <span className="sr-only">{LOADING_REVIEW}</span>
          <div aria-hidden="true" className="h-3 w-full rounded bg-(--color-bg-tertiary) motion-safe:animate-pulse" />
          <div aria-hidden="true" className="h-3 w-[92%] rounded bg-(--color-bg-tertiary) motion-safe:animate-pulse" />
          <div aria-hidden="true" className="h-3 w-[60%] rounded bg-(--color-bg-tertiary) motion-safe:animate-pulse" />
        </div>
      )}
      {status === 'error' && (
        <div role="alert" data-atlas-measure="load-error" className="mt-4">
          <p className="mb-0 text-sm text-(--color-text-secondary)">{REVIEW_FAILED}</p>
          <button
            type="button"
            onClick={onRetry}
            className={`mt-2.5 min-h-8 rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-medium text-(--color-text) hover:bg-(--color-bg-tertiary) ${FOCUS_RING}`}
          >
            {TRY_AGAIN}
          </button>
        </div>
      )}

      {takeaway && (
        <p data-atlas-measure="takeaway" className="mt-4 mb-0 text-[15.5px] leading-[1.65] text-(--color-text)">
          {takeaway}
        </p>
      )}

      {sections.length > 0 && (
        <div className="relative mt-5">
          {sections.length > 1 && (
            // P16, on the first section's row. Outside the summary: a control
            // inside a summary would toggle the section as well.
            <button
              type="button"
              onClick={() => setOpenIds(allOpen ? new Set() : new Set(sections.map((section) => section.id)))}
              data-atlas-measure="expand-all"
              className={`absolute top-[9px] right-6 inline-flex min-h-6 items-center rounded-sm text-xs font-medium text-(--color-accent) hover:underline ${FOCUS_RING}`}
            >
              {allOpen ? COLLAPSE_ALL : EXPAND_ALL}
            </button>
          )}
          {sections.map((section, i) => (
            <details
              key={section.id}
              open={openIds.has(section.id)}
              onToggle={(event) => setOpen(section.id, event.currentTarget.open)}
              data-atlas-measure={`section-${section.id}`}
              className="group border-t border-(--color-border) py-3"
            >
              {/* min-h-6: a 24px target even when open (SPEC §12.8). The
                  heading stays at the top of it, level with "Expand all". */}
              <summary
                className={`grid min-h-6 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 rounded-sm ${FOCUS_RING} [&::-webkit-details-marker]:hidden`}
              >
                <h3 className={`mb-0 ${HEADING} ${i === 0 && sections.length > 1 ? 'pr-24' : ''}`}>{section.label}</h3>
                <span
                  aria-hidden="true"
                  className="text-base leading-none text-(--color-text-muted) motion-safe:transition-transform group-open:rotate-90"
                >
                  &rsaquo;
                </span>
                <span className="col-span-2 mt-1 min-w-0 truncate text-[13px] text-(--color-text-muted) group-open:hidden">
                  {section.text.slice(0, PREVIEW_CHARS)}
                </span>
              </summary>
              <p className="mt-2 mb-0 text-[14.5px] leading-[1.65] text-(--color-text)">{section.text}</p>
            </details>
          ))}
        </div>
      )}

      {hasFacts && (
        <div data-atlas-measure="facts" className="mt-5">
          <h3 className={`mb-0 ${HEADING}`}>{FACTS_HEADING}</h3>
          <FactList title="Quantitative results" noun="quantitative results" items={quantitative} />
          <FactList title="Datasets" noun="datasets" items={datasets} inlineWhenShort />
          <FactList title="Baselines compared" noun="baselines" items={baselines} inlineWhenShort />
        </div>
      )}
    </section>
  );
}
