'use client';

import { useMemo } from 'react';
import { formatCount, type TierFilter } from './atlasCopy';
import { regionMenu, type Atlas } from './atlasModel';

/* Copy deck R1–R3 (SPEC §11.4); the R4 optgroup names are the research areas (AREA_NAME). */
const GO_TO_REGION = 'Go to a region';
const CHOOSE_REGION = 'Choose a region';
/** R3: "{label} ({visible count})". */
function optionLabel(label: string, count: number): string {
  return `${label} (${formatCount(count)})`;
}

/** The shared small heading (SPEC §3.9). */
const HEADING = 'font-sans text-xs font-medium uppercase tracking-wider text-(--color-text-muted) mb-2';

interface RegionSelectProps {
  atlas: Atlas | null;
  filter: TierFilter;
  onSelect: (key: string) => void;
}

/* "Go to a region" (SPEC §7.3, §8.2): the keyboard and screen-reader way into
   the map's regions, which the region labels on the canvas are not (they are
   out of the Tab order and hidden from assistive technology). A native select:
   one group per research area, regions A–Z, each with the papers the "Show"
   filter leaves visible. Choosing one focuses it; the select always rests on
   its placeholder, because the rail swaps to the region view. */
export default function RegionSelect({ atlas, filter, onSelect }: RegionSelectProps) {
  const groups = useMemo(() => (atlas ? regionMenu(atlas, filter) : []), [atlas, filter]);

  return (
    <div data-atlas-measure="region-select" className="mt-8 border-t border-(--color-border) pt-5">
      <label htmlFor="atlas-region-select" className={`block ${HEADING}`}>
        {GO_TO_REGION}
      </label>
      <select
        id="atlas-region-select"
        value=""
        disabled={!atlas}
        onChange={(event) => {
          if (event.target.value) onSelect(event.target.value);
        }}
        className="w-full rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text) focus-visible:outline-2 focus-visible:outline-(--color-accent) disabled:opacity-60"
      >
        <option value="" disabled>
          {CHOOSE_REGION}
        </option>
        {groups.map((group) => (
          <optgroup key={group.area} label={group.label}>
            {group.options.map((option) => (
              <option key={option.key} value={option.key}>
                {optionLabel(option.label, option.count)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
