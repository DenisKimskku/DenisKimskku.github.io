'use client';

import { useMemo } from 'react';
import {
  FILTER_LEGEND,
  FILTER_OPTIONS,
  LIST_SORT_OPTIONS,
  optionWithCount,
  type ListSort,
  type TierFilter,
} from './atlasCopy';
import { regionMenu, type Atlas } from './atlasModel';

/* Copy deck LS2–LS3 (SPEC §11.5); LS1 is the filter's own legend, F0. */
const REGION_LABEL = 'Region';
const ALL_REGIONS = 'All regions';
const SORT_LABEL = 'Sort';

/** The shared small heading (SPEC §3.9). */
const HEADING = 'font-sans text-xs font-medium uppercase tracking-wider text-(--color-text-muted) mb-2';
const SELECT =
  'w-full min-h-11 rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) focus-visible:outline-2 focus-visible:outline-(--color-accent) disabled:opacity-60 min-[860px]:min-h-0';

interface ListControlsProps {
  atlas: Atlas | null;
  filter: TierFilter;
  /** the display region the list is narrowed to, or null for all */
  regionKey: string | null;
  sort: ListSort;
  /** False where the toolbar above the list already holds the Show filter (the List view beside the map's toolbar). */
  showFilter: boolean;
  onFilterChange: (filter: TierFilter) => void;
  onRegionChange: (key: string | null) => void;
  onSortChange: (sort: ListSort) => void;
}

/* The list's controls (SPEC §10): native selects, each with a visible label.
   Show uses the same cumulative state as the map's filter (F-sel options,
   with live counts); Region lists every display region by research area with
   the papers the filter leaves (R3, R4); Sort orders the rows (LS3). */
export default function ListControls({
  atlas,
  filter,
  regionKey,
  sort,
  showFilter,
  onFilterChange,
  onRegionChange,
  onSortChange,
}: ListControlsProps) {
  const groups = useMemo(() => (atlas ? regionMenu(atlas, filter) : []), [atlas, filter]);

  return (
    <div
      data-atlas-measure="list-controls"
      className={`grid grid-cols-1 gap-x-3 gap-y-3 ${showFilter ? 'min-[480px]:grid-cols-3' : 'min-[480px]:grid-cols-2'}`}
    >
      {showFilter && (
        <div className="min-w-0">
          <label htmlFor="atlas-list-show" className={`block ${HEADING}`}>
            {FILTER_LEGEND}
          </label>
          <select
            id="atlas-list-show"
            value={filter}
            onChange={(event) => onFilterChange(event.target.value as TierFilter)}
            className={SELECT}
          >
            {FILTER_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {atlas ? optionWithCount(label, atlas.counts[value]) : label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="min-w-0">
        <label htmlFor="atlas-list-region" className={`block ${HEADING}`}>
          {REGION_LABEL}
        </label>
        <select
          id="atlas-list-region"
          value={regionKey ?? ''}
          disabled={!atlas}
          onChange={(event) => onRegionChange(event.target.value || null)}
          className={SELECT}
        >
          <option value="">{ALL_REGIONS}</option>
          {groups.map((group) => (
            <optgroup key={group.area} label={group.label}>
              {group.options.map((option) => (
                <option key={option.key} value={option.key}>
                  {optionWithCount(option.label, option.count)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="min-w-0">
        <label htmlFor="atlas-list-sort" className={`block ${HEADING}`}>
          {SORT_LABEL}
        </label>
        <select
          id="atlas-list-sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as ListSort)}
          className={SELECT}
        >
          {LIST_SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
