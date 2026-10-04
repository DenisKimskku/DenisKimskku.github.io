'use client';

import { TIER_LABEL, type Tier } from './atlasCopy';
import { AREA_SWATCH, paintArea, type AreaId } from './atlasPalette';
import TierMark from './TierMark';

/** `list`: the list's rows (SPEC §10). `compact`: search results, Start with,
    the region view and similar papers. */
export type RowVariant = 'list' | 'compact';

/** What a row shows about a paper. */
export interface RowPaper {
  /** the display title (SPEC §9.4) */
  title: string;
  tier: Tier;
  /** the research area of the paper's region, for the tier dot */
  area: AreaId;
  /** compact: the second line; list: the meta line (LS10). '' leaves it out. */
  subtitle: string;
  /** list only: the display region's label, or null for a paper in no named region */
  regionLabel?: string | null;
}

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-accent)';
const LIST_ROW = `group block w-full px-4 py-3.5 text-left hover:bg-(--color-bg-secondary) min-[640px]:px-6 ${FOCUS_RING}`;
const COMPACT_ROW = `block w-full rounded-md px-2 py-2 text-left hover:bg-(--color-bg-secondary) ${FOCUS_RING}`;

/** A row's content, without its control: the search box puts it in a listbox option. */
export function PaperRowContent({ variant, title, tier, area, subtitle, regionLabel }: RowPaper & { variant: RowVariant }) {
  if (variant === 'compact') {
    return (
      <span className="flex items-start gap-2.5">
        <TierMark tier={tier} area={area} className="mt-[5px]" />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm leading-snug font-medium text-(--color-text) [overflow-wrap:anywhere]">
            {title}
          </span>
          {subtitle && <span className="mt-0.5 block text-xs text-(--color-text-muted)">{subtitle}</span>}
        </span>
      </span>
    );
  }
  return (
    <>
      <span className="block font-serif text-base leading-snug font-semibold text-(--color-text) [overflow-wrap:anywhere]">
        {title}
      </span>
      {subtitle && (
        <span className="mt-1 block text-[13px] text-(--color-text-secondary) [overflow-wrap:anywhere]">{subtitle}</span>
      )}
      <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--color-text-muted)">
        <span className="inline-flex items-center gap-1.5">
          <TierMark tier={tier} area={area} />
          {TIER_LABEL[tier]}
        </span>
        {regionLabel && (
          <>
            <span aria-hidden="true">·</span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${AREA_SWATCH[paintArea(area)]}`} />
              {regionLabel}
            </span>
          </>
        )}
      </span>
    </>
  );
}

interface PaperRowProps extends RowPaper {
  variant: RowVariant;
  id: string;
  onOpen: (id: string) => void;
  /** data-* attributes on the button, so focus can find the row again after a paper closes (SPEC §7.4) */
  data?: Record<`data-${string}`, string>;
}

/* The shared paper row (SPEC §10): one button per paper inside an <li>. The
   list variant sets the title in the serif with a meta line and a tier line;
   the compact variant leads with the tier dot and clamps the title to two
   lines. */
export default function PaperRow({ variant, id, onOpen, data, ...paper }: PaperRowProps) {
  return (
    <li>
      <button type="button" onClick={() => onOpen(id)} {...data} className={variant === 'list' ? LIST_ROW : COMPACT_ROW}>
        <PaperRowContent variant={variant} {...paper} />
      </button>
    </li>
  );
}
