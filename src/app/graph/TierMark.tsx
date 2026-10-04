import type { Tier } from './atlasCopy';
import { AREA_SWATCH, AREA_TINT_SWATCH, NONE_SWATCH, paintArea, type AreaId } from './atlasPalette';

interface TierMarkProps {
  tier: Tier;
  /** the research area of the paper's region ('other' for a paper in no named region) */
  area: AreaId;
  className?: string;
}

/* The tier dot (SPEC §10): a 10px circle in the paper's exact map colour, the
   area's strong colour for a review, its tint for an abstract, and the one
   neutral for no summary. Static swatch classes, so `dark:` recolours it with
   no JavaScript. Decorative: the tier word beside it carries the meaning. */
export default function TierMark({ tier, area, className = '' }: TierMarkProps) {
  const paint = paintArea(area);
  const swatch = tier === 'review' ? AREA_SWATCH[paint] : tier === 'abstract' ? AREA_TINT_SWATCH[paint] : NONE_SWATCH;
  return <span aria-hidden="true" className={`inline-block size-2.5 shrink-0 rounded-full ${swatch} ${className}`} />;
}
