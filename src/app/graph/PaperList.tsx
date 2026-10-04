'use client';

import { useEffect, useMemo, useRef } from 'react';
import { TIER_LABEL, listMoreLabel, listStatus, tierOf, type ListSort, type TierFilter } from './atlasCopy';
import { displayRegionOf, listPapers, paperArea, rowMeta, titleOf, type Atlas } from './atlasModel';
import ListControls from './ListControls';
import PaperRow from './PaperRow';
import TierMark from './TierMark';
import type { AtlasPhase } from './useAtlasData';

/* Copy deck LS6 and LS-L1–LS-L2 (SPEC §11.5). */
const NO_MATCH = 'No papers match these filters.';
const SHOW_ALL = 'Show all papers';
const LOADING = 'Loading papers…';
const LOAD_FAILED = 'The papers couldn’t load. Check your connection and try again.';
const TRY_AGAIN = 'Try again';

/** Rows per page: shown at first, and added by each "Show more" (SPEC §10). */
export const LIST_PAGE = 40;

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-accent)';

interface PaperListProps {
  atlas: Atlas | null;
  phase: AtlasPhase;
  filter: TierFilter;
  /** the display region the list is narrowed to, or null for all */
  regionKey: string | null;
  sort: ListSort;
  /** rows shown so far */
  limit: number;
  /** False beside the map's toolbar, which already holds the Show filter. */
  showFilter: boolean;
  onShowMore: () => void;
  onOpen: (id: string) => void;
  onFilterChange: (filter: TierFilter) => void;
  onRegionChange: (key: string | null) => void;
  onSortChange: (sort: ListSort) => void;
  /** LS6's button: every paper, every region. */
  onReset: () => void;
  /** LS-L2's button: fetch the papers again. */
  onRetry: () => void;
}

/* The list (SPEC §10): the page itself below 860px, the List view beside the
   rail on a wider screen, and the stand-in for the map without WebGL. Its
   controls, a status line that is also a polite live region, a key to the
   tier dots, the rows, and "Show more". Each row's button carries its paper
   id (data-atlas-row), so focus can return to it after a paper closes
   (SPEC §7.4), and after "Show more" focus moves to the first new row. */
export default function PaperList({
  atlas,
  phase,
  filter,
  regionKey,
  sort,
  limit,
  showFilter,
  onShowMore,
  onOpen,
  onFilterChange,
  onRegionChange,
  onSortChange,
  onReset,
  onRetry,
}: PaperListProps) {
  const rows = useMemo(
    () => (atlas ? listPapers(atlas, { filter, regionKey, sort }) : []),
    [atlas, filter, regionKey, sort]
  );
  const region = atlas && regionKey ? (atlas.displayRegions.get(regionKey) ?? null) : null;
  const shown = Math.min(limit, rows.length);
  const left = rows.length - shown;

  const listRef = useRef<HTMLOListElement>(null);
  // A row to focus once it renders: the first new one after "Show more", the
  // first one after "Show all papers" (both buttons give way under focus).
  const focusIndexRef = useRef<number | null>(null);
  useEffect(() => {
    const index = focusIndexRef.current;
    if (index === null) return;
    focusIndexRef.current = null;
    listRef.current?.querySelectorAll<HTMLElement>('[data-atlas-row]')[index]?.focus();
  }, [limit, rows]);

  const ready = phase === 'ready' && atlas !== null;

  return (
    <div data-atlas-list="" data-atlas-measure="list">
      <ListControls
        atlas={atlas}
        filter={filter}
        regionKey={region ? region.key : null}
        sort={sort}
        showFilter={showFilter}
        onFilterChange={onFilterChange}
        onRegionChange={onRegionChange}
        onSortChange={onSortChange}
      />

      <p
        role="status"
        aria-live="polite"
        data-atlas-measure="list-status"
        className="mt-5 mb-0 text-[13px] text-(--color-text-secondary)"
      >
        {/* Nothing to show is said here, so the live region announces it (LS6). */}
        {ready
          ? rows.length > 0
            ? listStatus(shown, rows.length, region?.label)
            : NO_MATCH
          : phase === 'error'
            ? LOAD_FAILED
            : LOADING}
      </p>
      {phase === 'error' && (
        <button
          type="button"
          onClick={onRetry}
          className={`mt-3 min-h-11 rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-medium text-(--color-text) hover:bg-(--color-bg-tertiary) min-[860px]:min-h-0 ${FOCUS_RING}`}
        >
          {TRY_AGAIN}
        </button>
      )}

      {ready && rows.length > 0 && (
        // LS7: what the dots mean. Hidden from assistive technology: every
        // row names its tier in words.
        <p
          aria-hidden="true"
          data-atlas-measure="list-key"
          className="mt-1.5 mb-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-(--color-text-muted)"
        >
          {(['review', 'abstract', 'none'] as const).map((tier) => (
            <span key={tier} className="inline-flex items-center gap-1.5">
              <TierMark tier={tier} area="llm" />
              {TIER_LABEL[tier]}
            </span>
          ))}
        </p>
      )}

      {ready && rows.length === 0 && (
        <div data-atlas-measure="list-empty" className="mt-3">
          <button
            type="button"
            onClick={() => {
              focusIndexRef.current = 0;
              onReset();
            }}
            className={`inline-flex min-h-11 items-center rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-medium text-(--color-text) hover:bg-(--color-bg-tertiary) min-[860px]:min-h-8 ${FOCUS_RING}`}
          >
            {SHOW_ALL}
          </button>
        </div>
      )}

      {ready && rows.length > 0 && (
        <div className="-mx-4 mt-3 border-y border-(--color-border) min-[640px]:-mx-6">
          <ol ref={listRef} className="divide-y divide-(--color-border)">
            {rows.slice(0, limit).map((node) => {
              const tier = tierOf(node);
              return (
                <PaperRow
                  key={node.id}
                  variant="list"
                  id={node.id}
                  onOpen={onOpen}
                  data={{ 'data-atlas-row': node.id }}
                  title={titleOf(atlas, node)}
                  tier={tier}
                  area={paperArea(atlas, node)}
                  subtitle={rowMeta(node)}
                  regionLabel={displayRegionOf(atlas, node)?.label ?? null}
                />
              );
            })}
          </ol>
          {left > 0 && (
            <button
              type="button"
              data-atlas-measure="list-more"
              onClick={() => {
                focusIndexRef.current = shown;
                onShowMore();
              }}
              className={`block min-h-11 w-full border-t border-(--color-border) px-4 py-3 text-sm font-medium text-(--color-accent) hover:bg-(--color-bg-secondary) min-[640px]:px-6 ${FOCUS_RING}`}
            >
              {listMoreLabel(left, LIST_PAGE)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
