'use client';

import { useEffect, useMemo, useRef } from 'react';
import { formatCount, tierOf, type TierFilter } from './atlasCopy';
import { displayCount, paperArea, paperMeta, regionPapers, titleOf, type Atlas, type DisplayRegion } from './atlasModel';
import { AREA_NAME, AREA_SWATCH, paintArea } from './atlasPalette';
import { CLEAR_REGION } from './MapChips';
import PaperRow from './PaperRow';

/* Copy deck RV0–RV7 (SPEC §11.4); RV8 is CLEAR_REGION. */
const BACK_TO_ATLAS = 'Back to the atlas';
const ABOUT_REGION = 'About this region';
const REGION_PAPERS = 'Papers in this region';
const papers = (n: number) => `${formatCount(n)} paper${n === 1 ? '' : 's'}`;
/** RV3 */
function regionCounts(total: number, reviews: number, abstracts: number): string {
  return `${papers(total)}: ${formatCount(reviews)} with a review, ${formatCount(abstracts)} with an abstract only`;
}
/** RV6 */
function filteredNote(shown: number, total: number): string {
  return `Showing ${formatCount(shown)} of ${papers(total)}. The Show filter above the map hides the rest.`;
}
/** RV7 */
function moreLabel(next: number, left: number): string {
  return `Show ${formatCount(next)} more (${formatCount(left)} left)`;
}

/** Rows shown at first, and added by each "Show more". */
export const REGION_PAGE = 20;
/** The shared small heading (SPEC §3.9). */
const HEADING = 'font-sans text-xs font-medium uppercase tracking-wider text-(--color-text-muted) mb-2';
const FOCUS_RING = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-accent)';

const ICON_X = (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M3 3l8 8M11 3l-8 8" />
  </svg>
);

interface RegionViewProps {
  atlas: Atlas;
  region: DisplayRegion;
  filter: TierFilter;
  onOpenPaper: (id: string) => void;
  /** Leaves the region: "‹ Back to the atlas" and the ×. */
  onClose: () => void;
  /** Move focus to the title on mount (a reader's choice, not a deep link). */
  autoFocus: boolean;
  /** Rows shown. The caller keeps it per region, so a paper opened from row
      45 and closed again comes back to the same rows (and can refocus row 45). */
  limit: number;
  onLimitChange: (limit: number) => void;
}

/* The rail's region view (SPEC §8.3, map view only). Remounted per region
   (keyed by the caller), and again whenever a paper opened from it closes. */
export default function RegionView({ atlas, region, filter, onOpenPaper, onClose, autoFocus, limit, onLimitChange }: RegionViewProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // After "Show more", focus moves to the first new row.
  const focusRowRef = useRef<number | null>(null);

  const list = useMemo(() => regionPapers(atlas, region, filter), [atlas, region, filter]);
  const total = region.counts.all;
  const visible = displayCount(region, filter);

  useEffect(() => {
    if (autoFocus) titleRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  useEffect(() => {
    const index = focusRowRef.current;
    if (index === null) return;
    focusRowRef.current = null;
    listRef.current?.querySelectorAll<HTMLElement>('[data-atlas-region-row]')[index]?.focus();
  }, [limit]);

  const left = list.length - limit;

  return (
    <section aria-labelledby="atlas-region-title" data-atlas-measure="region-view" className="flex flex-col">
      {/* Sticky inside the rail body. A sticky box is held inside its
          scroller's content box, so top-0 would push it below the body's
          20px top padding and over the eyebrow; -top-5 lets it sit flush at
          the body's top edge, where -mt-5 puts it. */}
      <div
        data-atlas-measure="region-bar"
        className="sticky -top-5 z-10 -mx-5 -mt-5 mb-3 flex h-11 shrink-0 items-center justify-between gap-2 border-b border-(--color-border) bg-(--color-bg)/95 px-3 backdrop-blur-xs min-[1360px]:-mx-6"
      >
        <button
          type="button"
          onClick={onClose}
          data-atlas-measure="region-back"
          className={`inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-(--color-text-secondary) hover:bg-(--color-bg-tertiary) hover:text-(--color-text) ${FOCUS_RING}`}
        >
          <span aria-hidden="true">&lsaquo;</span>
          {BACK_TO_ATLAS}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={CLEAR_REGION}
          title={CLEAR_REGION}
          data-atlas-measure="region-close"
          className={`grid size-8 shrink-0 place-items-center rounded-md text-(--color-text-muted) hover:bg-(--color-bg-tertiary) hover:text-(--color-text) ${FOCUS_RING}`}
        >
          {ICON_X}
        </button>
      </div>

      <p data-atlas-measure="region-area" className={`flex items-center gap-1.5 ${HEADING}`}>
        <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${AREA_SWATCH[paintArea(region.area)]}`} />
        {AREA_NAME[region.area]}
      </p>
      <h2
        id="atlas-region-title"
        ref={titleRef}
        tabIndex={-1}
        data-atlas-measure="region-title"
        className="mb-0 font-serif text-[22px] leading-snug font-semibold text-(--color-text) [overflow-wrap:anywhere] focus:outline-none"
      >
        {region.label}
      </h2>
      <p data-atlas-measure="region-counts" className="mt-1.5 mb-0 text-[13px] text-(--color-text-secondary)">
        {regionCounts(total, region.counts.review, region.counts.abstractOnly)}
      </p>

      {region.notes.length > 0 && (
        <section aria-labelledby="atlas-region-about" data-atlas-measure="region-notes" className="mt-6">
          <h3 id="atlas-region-about" className={HEADING}>
            {ABOUT_REGION}
          </h3>
          {region.notes.map((note, i) => (
            <p key={i} className="mb-2 text-sm leading-relaxed text-(--color-text-secondary)">
              {note}
            </p>
          ))}
        </section>
      )}

      <section
        aria-labelledby="atlas-region-papers"
        data-atlas-measure="region-papers"
        className="mt-6 border-t border-(--color-border) pt-4"
      >
        <h3 id="atlas-region-papers" className={HEADING}>
          {REGION_PAPERS}
        </h3>
        {visible < total && (
          <p data-atlas-measure="region-filtered" className="mb-2 text-[13px] leading-relaxed text-(--color-text-secondary)">
            {filteredNote(visible, total)}
          </p>
        )}
        <ul ref={listRef} className="-mx-2">
          {list.slice(0, limit).map((node) => (
            // The region is the view's own subject, so each row reads "{year} · {tier}".
            <PaperRow
              key={node.id}
              variant="compact"
              id={node.id}
              onOpen={onOpenPaper}
              data={{ 'data-atlas-region-row': node.id }}
              title={titleOf(atlas, node)}
              tier={tierOf(node)}
              area={paperArea(atlas, node)}
              subtitle={paperMeta(node, null)}
            />
          ))}
        </ul>
        {left > 0 && (
          <button
            type="button"
            onClick={() => {
              focusRowRef.current = limit;
              onLimitChange(limit + REGION_PAGE);
            }}
            data-atlas-measure="region-more"
            className={`mt-2 inline-flex min-h-6 items-center rounded-sm text-sm font-medium text-(--color-accent) hover:underline ${FOCUS_RING}`}
          >
            {moreLabel(Math.min(REGION_PAGE, left), left)}
          </button>
        )}
      </section>
    </section>
  );
}
