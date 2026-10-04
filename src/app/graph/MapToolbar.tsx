'use client';

import {
  FILTER_LEGEND,
  FILTER_OPTIONS,
  VIEW_LEGEND,
  VIEW_OPTIONS,
  ZOOM_FIT,
  ZOOM_IN,
  ZOOM_OUT,
  formatCount,
  type AtlasView,
  type TierFilter,
} from './atlasCopy';
import type { TierCounts } from './atlasModel';

interface MapToolbarProps {
  filter: TierFilter;
  /** null until the atlas has loaded; the options then show no count */
  counts: TierCounts | null;
  onFilterChange: (filter: TierFilter) => void;
  /** The view switch (V0–V2) on a screen that can draw the map; null leaves it out. */
  view: AtlasView | null;
  onViewChange?: (view: AtlasView) => void;
  /** 'plate' floats over the map; 'bar' is a strip above the List view, in the same place. */
  placement: 'plate' | 'bar';
  /** The Show filter waits for the map's first frame (SPEC §6.13). The view switch never waits. */
  filterInert?: boolean;
}

interface ZoomClusterProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

const ZOOM_BUTTON =
  'grid size-9 place-items-center text-(--color-text-secondary) hover:bg-(--color-bg-tertiary) hover:text-(--color-text) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-accent)';
/** A segmented radio group: the Show filter and the view switch share it (SPEC §7.2, §7.9). */
const FIELDSET =
  'pointer-events-auto inline-flex min-w-0 flex-wrap items-center gap-0.5 rounded-lg border border-(--color-border) bg-(--color-bg)/95 p-0.5 text-[13px] shadow-sm dark:shadow-none';
const SEGMENT =
  'block rounded-md px-2.5 py-1 whitespace-nowrap text-(--color-text-secondary) peer-checked:bg-(--color-bg-tertiary) peer-checked:font-medium peer-checked:text-(--color-text) peer-focus-visible:outline-2 peer-focus-visible:outline-(--color-accent)';

const icon = (d: string) => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

/* The plate's toolbar (SPEC §7.2, §7.9). The cumulative "Show" filter and,
   where the map can be drawn, the Map | List switch: native radios, so the
   arrow keys come free. Over the map it floats top-left and wraps on narrow
   plates, keeping clear of the zoom cluster with its max width, and nothing
   reaches the plate's bottom-right corner, which stays clear for the
   sitewide ? button (SPEC §3.7). Each group carries data-atlas-obstacle, so
   labels and fits stay out from under it. Above the List view it is a strip
   with the same offsets, so switching views never moves it. */
export default function MapToolbar({
  filter,
  counts,
  onFilterChange,
  view,
  onViewChange,
  placement,
  filterInert = false,
}: MapToolbarProps) {
  return (
    <div
      data-atlas-measure="toolbar"
      className={
        placement === 'plate'
          ? 'pointer-events-none absolute top-3 left-3 z-20 flex max-w-[calc(100%-4.75rem)] flex-wrap items-start gap-2'
          : 'flex shrink-0 flex-wrap items-start gap-2 border-b border-(--color-border) bg-(--color-bg-secondary) px-3 py-3'
      }
    >
      <fieldset data-atlas-obstacle="" data-atlas-measure="filter" inert={filterInert} className={FIELDSET}>
        {/* A legend in an inline-flex fieldset must float to join the row. */}
        <legend className="float-left px-2 text-xs font-medium tracking-wider text-(--color-text-muted) uppercase">
          {FILTER_LEGEND}
        </legend>
        {FILTER_OPTIONS.map(({ value, label }) => {
          const checked = filter === value;
          return (
            <label key={value} data-atlas-measure={checked ? 'filter-selected' : `filter-${value}`} className="cursor-pointer">
              <input
                type="radio"
                name="atlas-show"
                value={value}
                checked={checked}
                onChange={() => onFilterChange(value)}
                className="peer sr-only"
              />
              <span className={SEGMENT}>
                {label}
                {counts && (
                  <>
                    {' '}
                    <span className="ml-0.5 tabular-nums text-(--color-text-muted)">{formatCount(counts[value])}</span>
                  </>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>
      {view && onViewChange && (
        <fieldset data-atlas-obstacle="" data-atlas-measure="view" className={FIELDSET}>
          <legend className="sr-only">{VIEW_LEGEND}</legend>
          {VIEW_OPTIONS.map(({ value, label }) => {
            const checked = view === value;
            return (
              <label key={value} data-atlas-measure={checked ? 'view-selected' : `view-${value}`} className="cursor-pointer">
                <input
                  type="radio"
                  name="atlas-view"
                  value={value}
                  checked={checked}
                  onChange={() => onViewChange(value)}
                  className="peer sr-only"
                />
                <span className={SEGMENT}>{label}</span>
              </label>
            );
          })}
        </fieldset>
      )}
    </div>
  );
}

/* Zoom in, zoom out, and fit the whole map (SPEC §6.11, Z1–Z3). */
export function ZoomCluster({ onZoomIn, onZoomOut, onFit }: ZoomClusterProps) {
  return (
    <>
      <div
        data-atlas-obstacle=""
        data-atlas-measure="zoom"
        className="absolute top-3 right-3 z-20 flex flex-col overflow-hidden rounded-lg border border-(--color-border) bg-(--color-bg)/95 shadow-sm dark:shadow-none"
      >
        <button type="button" aria-label={ZOOM_IN} title={ZOOM_IN} onClick={onZoomIn} className={ZOOM_BUTTON}>
          {icon('M8 3.5v9M3.5 8h9')}
        </button>
        <button
          type="button"
          aria-label={ZOOM_OUT}
          title={ZOOM_OUT}
          onClick={onZoomOut}
          className={`${ZOOM_BUTTON} border-t border-(--color-border)`}
        >
          {icon('M3.5 8h9')}
        </button>
        <button
          type="button"
          aria-label={ZOOM_FIT}
          title={ZOOM_FIT}
          onClick={onFit}
          className={`${ZOOM_BUTTON} border-t border-(--color-border)`}
        >
          {icon('M3 6.5V3h3.5M9.5 3H13v3.5M13 9.5V13H9.5M6.5 13H3V9.5')}
        </button>
      </div>
    </>
  );
}
