'use client';

import { useSyncExternalStore } from 'react';
import { formatCount } from './atlasCopy';
import { AREA_SWATCH, paintArea, type AreaId } from './atlasPalette';

/* Copy deck C1–C2 (SPEC §11.4). */
/** C1's × and RV8: the button that clears a region focus (aria-label and title). */
export const CLEAR_REGION = 'Clear region';
/** C1: "{region label} · {n} papers". */
export function regionChipText(label: string, papers: number): string {
  return `${label} · ${formatCount(papers)} paper${papers === 1 ? '' : 's'}`;
}
/** C2: the location chip's accessible name and title. */
function focusRegionName(label: string): string {
  return `Focus region ${label}`;
}
const LOCATION_TITLE = 'Region at the centre of the view';

/**
 * The location chip's region key, written by the map in its beforeRender (at
 * most once per frame, and only when the region changes) and read by the chip
 * through useSyncExternalStore. So a pan re-renders the chip alone, and only
 * when it crosses into another region, never the rest of the page.
 */
export interface LocationStore {
  get(): string | null;
  set(key: string | null): void;
  subscribe(listener: () => void): () => void;
}

export function createLocationStore(): LocationStore {
  let value: string | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      if (next === value) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const noLocation = () => null;

/** What a chip shows about a region. */
export interface ChipRegion {
  key: string;
  label: string;
  area: AreaId;
}

interface MapChipsProps {
  /** The focused region and its visible papers, while no paper is open; null otherwise. */
  focused: (ChipRegion & { papers: number }) | null;
  location: LocationStore;
  /** The region behind a location key, or null when it is unknown. */
  describe: (key: string) => ChipRegion | null;
  onClear: () => void;
  onFocusRegion: (key: string) => void;
}

const ICON_X = (
  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M3 3l8 8M11 3l-8 8" />
  </svg>
);

const SURFACE =
  'pointer-events-auto inline-flex items-center rounded-full border border-(--color-border) bg-(--color-bg)/95 text-[13px] font-medium whitespace-nowrap text-(--color-text) shadow-sm dark:shadow-none';

const swatch = (area: AreaId) => (
  <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${AREA_SWATCH[paintArea(area)]}`} />
);

/* The plate's top-centre chips (SPEC §6.9, §7.3): C1 names the focused region
   and clears it; C2, close in with nothing selected or focused, names the
   region at the centre of the view and focuses it. Both containers stay
   mounted (toggled with `hidden`), so the map's obstacle observer, which only
   knows the elements present when the map was built, sees them appear. */
export default function MapChips({ focused, location, describe, onClear, onFocusRegion }: MapChipsProps) {
  const locationKey = useSyncExternalStore(location.subscribe, location.get, noLocation);
  const here = !focused && locationKey ? describe(locationKey) : null;

  return (
    <>
      <div
        data-atlas-obstacle=""
        data-atlas-measure="region-chip"
        hidden={!focused}
        className="pointer-events-none absolute top-14 left-1/2 z-20 -translate-x-1/2"
      >
        {focused && (
          <div className={`${SURFACE} gap-2 py-1 pr-1 pl-3`}>
            {swatch(focused.area)}
            <span>{regionChipText(focused.label, focused.papers)}</span>
            <button
              type="button"
              aria-label={CLEAR_REGION}
              title={CLEAR_REGION}
              onClick={onClear}
              className="grid size-7 place-items-center rounded-full text-(--color-text-muted) hover:bg-(--color-bg-tertiary) hover:text-(--color-text) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-accent)"
            >
              {ICON_X}
            </button>
          </div>
        )}
      </div>
      <div
        data-atlas-obstacle=""
        data-atlas-measure="location-chip"
        hidden={!here}
        className="pointer-events-none absolute top-14 left-1/2 z-20 -translate-x-1/2"
      >
        {here && (
          <button
            type="button"
            aria-label={focusRegionName(here.label)}
            title={LOCATION_TITLE}
            onClick={() => onFocusRegion(here.key)}
            className={`${SURFACE} gap-1.5 px-3 py-1 hover:border-(--color-text-muted) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)`}
          >
            {swatch(here.area)}
            {here.label}
          </button>
        )}
      </div>
    </>
  );
}
