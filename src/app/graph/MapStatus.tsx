'use client';

import { formatCount } from './atlasCopy';
import type { LoadStage } from './useAtlasData';

/* Copy deck L1–L5 (SPEC §11.4). */
const LOADING_PAPERS = 'Loading papers…';
const placingPapers = (n: string) => `Placing ${n} papers on the map…`;
const DRAWING_MAP = 'Drawing the map…';
const LOAD_FAILED = 'The map couldn’t load. Check your connection and try again.';
const TRY_AGAIN = 'Try again';

interface MapStatusProps {
  stage: LoadStage;
  /** Papers in the atlas, once it is built (for L2). */
  count: number | null;
  onRetry: () => void;
}

const CARD = 'w-[280px] rounded-lg border border-(--color-border) bg-(--color-bg) px-4 py-3 shadow-sm dark:shadow-none';

/* The canvas status card (SPEC §6.13): the load stage while the map is on
   its way, the error with "Try again", and nothing once the first frame is
   drawn. It covers the plate, so nothing on an empty canvas looks clickable. */
export default function MapStatus({ stage, count, onRetry }: MapStatusProps) {
  if (stage === 'ready') return null;

  if (stage === 'error') {
    return (
      <div className="absolute inset-0 z-40 grid place-items-center">
        <div role="alert" data-atlas-measure="status" className={CARD}>
          <p className="mb-0 text-sm text-(--color-text-secondary)">{LOAD_FAILED}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-medium text-(--color-text) hover:bg-(--color-bg-tertiary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
          >
            {TRY_AGAIN}
          </button>
        </div>
      </div>
    );
  }

  const text =
    stage === 'download' || count === null
      ? LOADING_PAPERS
      : stage === 'build'
        ? placingPapers(formatCount(count))
        : DRAWING_MAP;

  return (
    <div className="absolute inset-0 z-40 grid place-items-center">
      <div role="status" data-atlas-measure="status" className={CARD}>
        <p className="mb-0 text-sm text-(--color-text-secondary)">{text}</p>
        <div aria-hidden="true" className="mt-3 h-0.5 rounded-full bg-(--color-text-muted)/40 motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
