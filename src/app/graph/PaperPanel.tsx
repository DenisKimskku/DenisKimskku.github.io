'use client';

import { useEffect, useRef, useState } from 'react';
import { AbstractDisclosure, AbstractSection, abstractOf } from './AbstractBlock';
import {
  ALL_PAPERS,
  BACK_LABEL,
  BARE_HEADING,
  CLOSE_PAPER,
  NO_LANDING_PAGE,
  backTail,
  bareNote,
  citationsText,
  landingUrl,
  linkLabel,
  regionPapersLine,
} from './atlasCopy';
import { AREA_SWATCH, paintArea, type AreaId } from './atlasPalette';
import { displayVenue } from './atlasText';
import type { AtlasNode, Review } from './atlasTypes';
import ReviewBlock from './ReviewBlock';
import SimilarPapers, { type SimilarPaper, type SimilarState } from './SimilarPapers';
import { fetchShardEntry } from './useAtlasData';

/* Copy deck P3–P7, P24–P27 and LS9b (SPEC §11.5, §11.6). */
/** P3: the region eyebrow button's title. */
const SHOW_REGION = 'Show this region on the map';
/** P4, and its title. */
const NO_REGION = 'No named region';
const NO_REGION_TITLE = 'Placed by similarity, but not part of any named topic region';
/** P5 */
const CITATIONS_TITLE = 'Citation count from the bibliographic record when the atlas was built';
/** P6 */
const SHORT_VENUE_TITLE = 'Venue name is shortened in the source data';
/** P7's sr-only tail. */
const NEW_TAB = ' (opens in a new tab)';
/** P24, P26, P27 */
const ABOUT_REGION = 'About this region';
const SHOW_ON_MAP = 'Show on the map';
const NO_REGION_BODY =
  'This paper is placed by similarity like every other paper, but it is not part of any named topic region.';
/** LS9b */
const BACK_TO_ALL = 'Back to all papers';

/** The shared small heading (SPEC §3.9), without a margin. */
const HEADING = 'font-sans text-xs font-medium uppercase tracking-wider text-(--color-text-muted)';
const FOCUS_RING = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-accent)';

/** The display region a paper sits in, as the panel names and counts it (SPEC §4.4). */
export interface PanelRegion {
  key: string;
  label: string;
  area: AreaId;
  /** every paper in the region, and those with a review (P25) */
  papers: number;
  reviewed: number;
}

export type { SimilarPaper };

interface PaperPanelProps {
  node: AtlasNode;
  /** The paper's display title (SPEC §9.4): markup removed, entities decoded. */
  title: string;
  /** The paper's display region; null for a paper in no named region. */
  region: PanelRegion | null;
  /** Shows the paper's region on the map (map view only; in a list the eyebrow is plain text). */
  onFocusRegion?: (key: string) => void;
  /** The paper's own cluster note, the most specific one, if it has one. */
  regionNote?: string | null;
  similar: SimilarPaper[];
  similarState: SimilarState;
  /** P32: fetch the similarity data (list-only layouts). */
  onLoadSimilar: () => void;
  /** Opens a similar paper (it joins the trail, so Back returns here). */
  onOpenNode: (id: string) => void;
  onClose: () => void;
  /** Present when the trail holds a paper to go back to. */
  onBack?: () => void;
  /** That paper's title, for the Back button's title and sr-only text. */
  backTitle?: string;
  /** With no trail but a focused region: "‹ {region label}" returns to the region view (P2b). */
  onBackToRegion?: () => void;
  backRegionLabel?: string;
  /** List layout below 860px: "‹ All papers" leaves the paper, and targets are 44px. */
  narrow: boolean;
  /** Move focus to the title on mount (a reader's open, not a deep link). */
  autoFocus: boolean;
}

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

const ICON_X = (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M3 3l8 8M11 3l-8 8" />
  </svg>
);

/* The paper panel (SPEC §9): one article that the rail body scrolls. A
   sticky top bar (Back along the trail, and close), the region eyebrow, the
   serif title, the meta line, the link to the paper's public landing page,
   then the body by tier: the model-written review (with the abstract, when
   there is one, in a closed disclosure), or the authors' abstract, or a plain
   note that the atlas holds neither. Then the paper's region and its similar
   papers. The panel is remounted per paper (keyed on the id by the caller),
   so its initial state is the state: no effect has to reset it. */
export default function PaperPanel({
  node,
  title,
  region,
  onFocusRegion,
  regionNote,
  similar,
  similarState,
  onLoadSimilar,
  onOpenNode,
  onClose,
  onBack,
  backTitle,
  onBackToRegion,
  backRegionLabel,
  narrow,
  autoFocus,
}: PaperPanelProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  // What the panel waits on (SPEC §9.6): the review for a reviewed paper (its
  // abstract, if any, waits until its disclosure opens), else the abstract,
  // else nothing.
  const primary = node.r === 1 ? 'review' : node.a === 1 ? 'abstract' : null;
  const [status, setStatus] = useState<LoadStatus>(primary ? 'loading' : 'idle');
  const [review, setReview] = useState<Review | null>(null);
  const [abstract, setAbstract] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!primary) return;
    let cancelled = false;
    const request =
      primary === 'review'
        ? fetchShardEntry<Review>('reviews', node.id).then((entry) => {
            if (cancelled) return;
            // A flagged paper whose payload is missing is a build error, not an empty state.
            const found = entry && typeof entry === 'object' ? entry : null;
            setReview(found);
            setStatus(found ? 'ready' : 'error');
          })
        : fetchShardEntry<unknown>('abstracts', node.id).then((entry) => {
            if (cancelled) return;
            const text = abstractOf(entry);
            setAbstract(text);
            setStatus(text ? 'ready' : 'error');
          });
    request.catch(() => {
      if (!cancelled) setStatus('error');
    });
    return () => {
      cancelled = true;
    };
  }, [node.id, primary, attempt]);

  const retry = () => {
    setStatus('loading');
    setAttempt((n) => n + 1);
  };

  // A reader's open moves focus to the title (SPEC §7.4). The panel remounts
  // per paper, so this happens once per open; the ref keeps a resize from
  // pulling focus back here. On a phone the default scroll keeps the title in
  // view; on desktop nothing scrolls.
  const focusedRef = useRef(false);
  useEffect(() => {
    if (!autoFocus || focusedRef.current) return;
    focusedRef.current = true;
    titleRef.current?.focus({ preventScroll: !narrow });
  }, [autoFocus, narrow]);

  // Never a raw file and never a stub DOI: landingUrl() is the only way a
  // paper link reaches the page (CONTEXT §5 invariant 1).
  const link = landingUrl(node.u);
  const label = link ? linkLabel(link) : null;
  // The venue as the reader should see it: a source-side truncation keeps its
  // trailing "…", and a bare fragment ("Proceedings of the …") is left out.
  const venue = displayVenue(node.v);
  const loadState = status === 'idle' ? 'loading' : status;

  // Top-bar targets: 32px on desktop, 44px in the phone list (SPEC §12.8).
  const barButton = narrow ? 'min-h-11 px-2' : 'min-h-8 px-2';
  const backClass = `inline-flex min-w-0 items-center gap-1 rounded-md text-sm font-medium text-(--color-text-secondary) hover:bg-(--color-bg-tertiary) hover:text-(--color-text) ${FOCUS_RING} ${barButton}`;

  return (
    <article
      aria-labelledby="atlas-paper-title"
      aria-busy={status === 'loading' ? true : undefined}
      data-atlas-panel=""
      data-atlas-measure="panel"
      className="flex flex-col"
    >
      {/* Top bar (SPEC §9.1–9.2): Back along the trail of similar papers, or
          to the focused region, or "‹ All papers" out of a paper in the phone
          list; the close button on desktop, and in the phone list once there
          is a trail. Sticky inside the rail body from 860px: a sticky box is
          held inside its scroller's content box, so -top-5 lets it sit flush
          at the body's top edge over the body's 20px padding. */}
      <div
        data-atlas-measure="panel-bar"
        className="-mx-4 mb-3 flex h-11 shrink-0 items-center justify-between gap-2 border-b border-(--color-border) bg-(--color-bg)/95 px-2 backdrop-blur-xs min-[640px]:-mx-6 min-[860px]:sticky min-[860px]:-top-5 min-[860px]:z-10 min-[860px]:-mx-5 min-[860px]:-mt-5 min-[860px]:px-3 min-[1360px]:-mx-6"
      >
        <div className="min-w-0">
          {onBack ? (
            <button type="button" onClick={onBack} title={backTitle} data-atlas-measure="panel-back" className={backClass}>
              <span aria-hidden="true">&lsaquo;</span>
              {BACK_LABEL}
              {backTitle && <span className="sr-only">{backTail(backTitle)}</span>}
            </button>
          ) : onBackToRegion && backRegionLabel ? (
            <button type="button" onClick={onBackToRegion} data-atlas-measure="panel-back" className={backClass}>
              <span aria-hidden="true">&lsaquo;</span>
              <span className="truncate">{backRegionLabel}</span>
            </button>
          ) : (
            narrow && (
              <button type="button" onClick={onClose} data-atlas-measure="all-papers" className={backClass}>
                <span aria-hidden="true">&lsaquo;</span>
                {ALL_PAPERS}
              </button>
            )
          )}
        </div>
        {(!narrow || onBack) && (
          <button
            type="button"
            onClick={onClose}
            aria-label={CLOSE_PAPER}
            title={CLOSE_PAPER}
            data-atlas-measure="panel-close"
            className={`grid shrink-0 place-items-center rounded-md text-(--color-text-muted) hover:bg-(--color-bg-tertiary) hover:text-(--color-text) ${FOCUS_RING} ${
              narrow ? 'size-11' : 'size-8'
            }`}
          >
            {ICON_X}
          </button>
        )}
      </div>

      {/* The eyebrow (SPEC §9.2 item 2): the paper's display region with its
          area swatch, a button that shows the region on the map in map
          view; plain text in a list; P4 for a paper in no named region. */}
      <div className="min-w-0">
        {region ? (
          onFocusRegion ? (
            <button
              type="button"
              onClick={() => onFocusRegion(region.key)}
              title={SHOW_REGION}
              data-atlas-measure="panel-region"
              className="inline-flex min-h-6 items-center gap-1.5 rounded-sm text-left font-sans text-xs font-medium tracking-wider text-(--color-text-muted) uppercase hover:text-(--color-text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
            >
              <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${AREA_SWATCH[paintArea(region.area)]}`} />
              {region.label}
            </button>
          ) : (
            <p
              data-atlas-measure="panel-region"
              className="mb-0 inline-flex items-center gap-1.5 font-sans text-xs font-medium tracking-wider text-(--color-text-muted) uppercase"
            >
              <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${AREA_SWATCH[paintArea(region.area)]}`} />
              {region.label}
            </p>
          )
        ) : (
          <p data-atlas-measure="panel-region" title={NO_REGION_TITLE} className="mb-0 font-sans text-xs text-(--color-text-muted) italic">
            {NO_REGION}
          </p>
        )}
        <h2
          id="atlas-paper-title"
          ref={titleRef}
          tabIndex={-1}
          data-atlas-measure="panel-title"
          className="mt-1.5 mb-0 font-serif text-[22px] leading-snug font-semibold text-balance text-(--color-text) [overflow-wrap:anywhere] focus:outline-none"
        >
          {title}
        </h2>
      </div>

      {/* Meta (SPEC §9.2 item 4): year, venue and citations, each "·" inside
          the item before it. Year and citations never break; a long venue
          wraps rather than overflow the rail. */}
      {(Boolean(node.yr) || Boolean(venue) || node.cc > 0) && (
        <p data-atlas-measure="panel-meta" className="mt-2 mb-0 text-[13px] leading-relaxed text-(--color-text-secondary)">
          {node.yr ? (
            <span className="whitespace-nowrap">
              {node.yr}
              {(venue || node.cc > 0) && ' ·'}
            </span>
          ) : null}
          {node.yr && venue ? ' ' : null}
          {venue ? (
            <span className="[overflow-wrap:anywhere]">
              <cite className="not-italic" title={venue.endsWith('…') ? SHORT_VENUE_TITLE : undefined}>
                {venue}
              </cite>
              {node.cc > 0 && ' ·'}
            </span>
          ) : null}
          {(node.yr || venue) && node.cc > 0 ? ' ' : null}
          {node.cc > 0 ? (
            <span className="whitespace-nowrap" title={CITATIONS_TITLE}>
              {citationsText(node.cc)}
            </span>
          ) : null}
        </p>
      )}

      {/* The action row (SPEC §9.2 item 5): the public landing page, through
          landingUrl(), named by its host. Never a raw file. */}
      <div data-atlas-measure="link" className="mt-3">
        {link && label ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            data-atlas-measure="open-link"
            className="inline-flex items-center gap-1.5 rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-medium text-(--color-accent) hover:border-(--color-accent) hover:text-(--color-accent-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
          >
            {label}
            <span aria-hidden="true">&#8599;</span>
            <span className="sr-only">{NEW_TAB}</span>
          </a>
        ) : (
          <p className="mb-0 text-[13px] text-(--color-text-muted)">{NO_LANDING_PAGE}</p>
        )}
      </div>

      {node.r === 1 && <ReviewBlock status={loadState} review={review} onRetry={retry} />}
      {node.r === 1 && node.a === 1 && <AbstractDisclosure paperId={node.id} />}
      {node.r === 0 && node.a === 1 && <AbstractSection status={loadState} text={abstract} onRetry={retry} />}

      {/* Neither a review nor an abstract: say so plainly, naming only what
          the record holds. Never a fabricated summary. */}
      {node.r === 0 && node.a === 0 && (
        <section aria-labelledby="atlas-bare-label" data-atlas-measure="bare" className="mt-5">
          <h3 id="atlas-bare-label" className={`mb-0 ${HEADING}`}>
            {BARE_HEADING}
          </h3>
          <p data-atlas-measure="bare-note" className="mt-2 mb-0 text-sm leading-relaxed text-(--color-text-secondary)">
            {bareNote(Boolean(venue), Boolean(link && label))}
          </p>
        </section>
      )}

      {/* The paper's region (SPEC §9.2 item 7). */}
      <section
        aria-labelledby="atlas-paper-region"
        data-atlas-measure="region-section"
        className="mt-6 border-t border-(--color-border) pt-4"
      >
        <h3 id="atlas-paper-region" className={`mb-2 ${HEADING}`}>
          {region ? ABOUT_REGION : NO_REGION}
        </h3>
        {region ? (
          <>
            {regionNote && <p className="mb-2 text-sm leading-relaxed text-(--color-text-secondary)">{regionNote}</p>}
            <p data-atlas-measure="region-counts" className="mb-0 text-[13px] text-(--color-text-secondary)">
              {regionPapersLine(region.papers, region.reviewed)}
            </p>
            {onFocusRegion && (
              <button
                type="button"
                onClick={() => onFocusRegion(region.key)}
                className="mt-2 inline-flex min-h-6 items-center rounded-sm text-sm font-medium text-(--color-accent) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
              >
                {SHOW_ON_MAP}
              </button>
            )}
          </>
        ) : (
          <p className="mb-0 text-sm leading-relaxed text-(--color-text-secondary)">{NO_REGION_BODY}</p>
        )}
      </section>

      <SimilarPapers state={similarState} papers={similar} onOpen={onOpenNode} onLoad={onLoadSimilar} />

      {narrow && (
        // LS9b: the top bar scrolls away on a phone (no sticky there, SPEC
        // §3.6), so the panel ends with a way back too.
        <button
          type="button"
          onClick={onClose}
          data-atlas-measure="back-to-all"
          className={`mt-8 inline-flex min-h-11 items-center gap-1 self-start rounded-md text-sm font-medium text-(--color-accent) hover:underline ${FOCUS_RING}`}
        >
          <span aria-hidden="true">&lsaquo;</span>
          {BACK_TO_ALL}
        </button>
      )}
    </article>
  );
}
