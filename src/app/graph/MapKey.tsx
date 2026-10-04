'use client';

import { useState } from 'react';
import { TIER_LABEL, type Tier } from './atlasCopy';
import {
  AREA_COLOURS_ON,
  AREA_IDS,
  AREA_NAME,
  AREA_SWATCH,
  AREA_TINT_SWATCH,
  NONE_SWATCH,
  paintArea,
  type AreaId,
} from './atlasPalette';

/* Copy deck K0–K12 and T3 (SPEC §11.3–§11.4). */
const KEY_TITLE = 'How to read the map';
const KEY_DOTS = 'Each dot is a paper. Nearby dots cover similar topics.';
/** T3: after each tier name. Every review is model-written, so the first is true of all of them. */
const TIER_NOTE: Record<Tier, string> = {
  review: 'a model-written review you can read here',
  abstract: 'the paper’s abstract, without a review',
  none: 'no review or abstract',
};
const TIER_ORDER: readonly Tier[] = ['review', 'abstract', 'none'];
const KEY_AREAS = 'Dots take the colour of their research area:';
/** K5–K8: the area names, with the grey row covering papers outside any named region too. */
const AREA_KEY_NAME: Record<AreaId, string> = { ...AREA_NAME, other: 'Other topics, or no named region' };
const KEY_SIZE = 'Size: citation count';
/** K10, one value under each disc (diameters in px). */
const SIZE_STEPS: ReadonlyArray<{ px: number; label: string }> = [
  { px: 8, label: '0' },
  { px: 16, label: '100' },
  { px: 22, label: '1,000+' },
];
const KEY_LINES = 'Lines join a selected paper to its most similar papers.';
const KEY_HINT = 'Scroll to zoom, drag to pan, click a dot to read about it.';

const STORAGE_KEY = 'atlas-key-collapsed';
/** Open by default when the plate is at least this tall (SPEC §6.12): open at 1440×900, collapsed at 1280×720. */
const OPEN_MIN_PLATE_HEIGHT = 700;

/** The tier rows show the first area's colours; with area colour off, the grey column. */
const KEY_AREA: AreaId = paintArea('llm');

/* The key renders only on the client (the map is decided in an effect), so
   the window can be read in the initial state without a hydration mismatch. */
function initiallyOpen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') return false;
    if (saved === 'false') return true;
  } catch {
    /* storage blocked: fall back to the plate's height */
  }
  const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 64;
  return window.innerHeight - header >= OPEN_MIN_PLATE_HEIGHT;
}

const HEADING = 'font-sans text-xs font-medium uppercase tracking-wider text-(--color-text-muted)';
const TIER_SWATCH: Record<Tier, string> = {
  review: AREA_SWATCH[KEY_AREA],
  abstract: AREA_TINT_SWATCH[KEY_AREA],
  none: NONE_SWATCH,
};

/* The map key (SPEC §6.12): what position, colour, lightness, size and lines
   mean. Bottom-left on the plate, clear of the keep-clear corner; its text is
   ink and the swatches carry the colours. */
export default function MapKey() {
  const [open, setOpen] = useState(initiallyOpen);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(!next));
    } catch {
      /* the choice is a convenience; without storage it lasts this visit */
    }
  };

  return (
    <section
      aria-labelledby="atlas-key-title"
      data-atlas-measure="key"
      data-atlas-obstacle=""
      className="absolute bottom-3 left-3 z-20 w-[264px] rounded-lg border border-(--color-border) bg-(--color-bg)/95 text-xs text-(--color-text-secondary) shadow-sm dark:shadow-none"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="atlas-key-body"
        onClick={toggle}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-accent)"
      >
        <span id="atlas-key-title" className={HEADING}>
          {KEY_TITLE}
        </span>
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-(--color-text-muted) motion-safe:transition-transform ${open ? '' : 'rotate-180'}`}
        >
          <path d="M3 4.5 6 7.5 9 4.5" />
        </svg>
      </button>

      <div id="atlas-key-body" hidden={!open} data-atlas-measure="key-body" className="space-y-3 px-3 pb-3 leading-snug">
        <p className="mb-0">{KEY_DOTS}</p>

        <ul className="space-y-1.5">
          {TIER_ORDER.map((tier) => (
            <li key={tier} className="flex items-start gap-2">
              <span aria-hidden="true" className={`mt-[3px] size-2.5 shrink-0 rounded-full ${TIER_SWATCH[tier]}`} />
              <span>
                <span className="font-medium text-(--color-text)">{TIER_LABEL[tier]}</span>: {TIER_NOTE[tier]}
              </span>
            </li>
          ))}
        </ul>

        {AREA_COLOURS_ON && (
          <div>
            <p className="mb-1.5">{KEY_AREAS}</p>
            <ul className="space-y-1">
              {AREA_IDS.map((area) => (
                <li key={area} className="flex items-start gap-2">
                  <span aria-hidden="true" className={`mt-[3px] size-2.5 shrink-0 rounded-full ${AREA_SWATCH[area]}`} />
                  <span>{AREA_KEY_NAME[area]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="mb-1.5">{KEY_SIZE}</p>
          <div className="flex items-center gap-2">
            {SIZE_STEPS.map(({ px, label }, i) => (
              <span key={label} className="inline-flex items-center gap-2">
                {/* The spaces keep the text K10 verbatim ("0 · 100 · 1,000+"); the gap does the spacing. */}
                {i > 0 && (
                  <span aria-hidden="true" className="text-(--color-text-muted)">
                    {' · '}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    style={{ width: px, height: px }}
                    className={`shrink-0 rounded-full ${AREA_SWATCH[KEY_AREA]}`}
                  />
                  {label}
                </span>
              </span>
            ))}
          </div>
        </div>

        <p className="mb-0">{KEY_LINES}</p>
        <p className="mb-0 text-(--color-text-muted)">{KEY_HINT}</p>
      </div>
    </section>
  );
}
