'use client';

import type { ReactNode, RefObject } from 'react';
import { ABOUT_HEADING, ATLAS_NAME, RAIL_LABEL, START_HEADING, startRowNote, tierOf, type RailView } from './atlasCopy';
import type { AreaId } from './atlasPalette';
import type { AtlasNode } from './atlasTypes';
import PaperRow from './PaperRow';

/** A "Start with" row: the paper, its display title (SPEC §9.4) and its region's research area. */
export interface StartPaper {
  node: AtlasNode;
  title: string;
  area: AreaId;
}

/** The shared small heading (SPEC §3.9), like the site's section eyebrows. */
const HEADING = 'font-sans text-xs font-medium uppercase tracking-wider text-(--color-text-muted) mb-2';

/* Scroll shadows on the rail body, pure CSS (SPEC §3.3): two `local` covers
   move with the content and hide two `scroll` shadows at the box edges, except
   where there is more to scroll. The background colour rides in the last
   layer. Where the body does not scroll, the covers always win. */
const RAIL_SHADOWS = [
  'linear-gradient(var(--color-bg) 30%, transparent) center top / 100% 36px no-repeat local',
  'linear-gradient(transparent, var(--color-bg) 70%) center bottom / 100% 36px no-repeat local',
  'radial-gradient(farthest-side at 50% 0, var(--atlas-shadow), transparent) center top / 100% 10px no-repeat scroll',
  'radial-gradient(farthest-side at 50% 100%, var(--atlas-shadow), transparent) center bottom / 100% 10px no-repeat scroll var(--color-bg)',
].join(', ');

interface AtlasRailProps {
  /** Server slot: the h1 "Research Atlas" and the Preview badge. */
  masthead: ReactNode;
  /** Server slot: the headline and both deks. */
  intro: ReactNode;
  /** Server slot: the About the reviews paragraphs (no ids: it renders twice). */
  about: ReactNode;
  view: RailView;
  /** The search box, or null where it is not rendered (a paper open in the phone list). */
  search: ReactNode | null;
  panel: ReactNode | null;
  /** The region view (map view only, SPEC §8.3), or null. */
  regionView: ReactNode | null;
  /** "Go to a region" for the explore view (map view only, SPEC §8.2), or null. */
  regionSelect: ReactNode | null;
  /** The "Start with" papers; null while the atlas loads. */
  startWith: StartPaper[] | null;
  /** The atlas failed to load, so there is nothing to start with. */
  startFailed: boolean;
  onOpenStart: (id: string) => void;
  bodyRef: RefObject<HTMLDivElement | null>;
  /** The phone list (below 860px): the rail flows with the page instead of scrolling. */
  narrow: boolean;
}

function StartWith({
  papers,
  onOpen,
}: {
  papers: StartPaper[] | null;
  onOpen: (id: string) => void;
}) {
  return (
    <section
      aria-labelledby="atlas-start-title"
      data-atlas-measure="start"
      className="mt-7 max-[860px]:hidden"
    >
      <h3 id="atlas-start-title" className={HEADING}>
        {START_HEADING}
      </h3>
      <ul className="-mx-2">
        {papers
          ? papers.map(({ node, title, area }) => (
              <PaperRow
                key={node.id}
                variant="compact"
                id={node.id}
                onOpen={onOpen}
                data={{ 'data-atlas-start': node.id }}
                title={title}
                tier={tierOf(node)}
                area={area}
                subtitle={startRowNote(node.cc)}
              />
            ))
          : // Placeholder rows hold the section's height, so nothing below jumps when the data lands.
            [0, 1, 2].map((i) => (
              <li key={i} aria-hidden="true" className="flex gap-2.5 px-2 py-2">
                <span className="mt-[5px] size-2.5 shrink-0 rounded-full bg-(--color-bg-tertiary) motion-safe:animate-pulse" />
                <span className="min-w-0 flex-1">
                  <span className="block h-[17px] w-11/12 rounded bg-(--color-bg-tertiary) motion-safe:animate-pulse" />
                  <span className="mt-[3px] block h-[17px] w-2/3 rounded bg-(--color-bg-tertiary) motion-safe:animate-pulse" />
                  <span className="mt-1.5 block h-3 w-1/3 rounded bg-(--color-bg-tertiary) motion-safe:animate-pulse" />
                </span>
              </li>
            ))}
      </ul>
    </section>
  );
}

/* The rail (SPEC §3.3, §8): a header with the masthead and the search, and a
   body showing the explore view or the paper panel.

   Below 860px the header dissolves (display: contents), so its two parts take
   their places in the phone order: masthead, intro, search, then About the
   reviews as a closed disclosure (SPEC §3.5). Doing this in CSS, not from the
   capability, keeps a phone's first paint from jumping after hydration. */
export default function AtlasRail({
  masthead,
  intro,
  about,
  view,
  search,
  panel,
  regionView,
  regionSelect,
  startWith,
  startFailed,
  onOpenStart,
  bodyRef,
  narrow,
}: AtlasRailProps) {
  const paper = view === 'paper' && panel !== null;
  const region = !paper && view === 'region' && regionView !== null;

  return (
    <aside
      aria-label={ATLAS_NAME}
      data-atlas-measure="rail"
      className="flex flex-col min-[860px]:min-h-0 min-[860px]:w-[320px] min-[860px]:shrink-0 min-[860px]:border-r min-[860px]:border-(--color-border) min-[1024px]:w-[360px] min-[1360px]:w-[400px]"
    >
      <div
        data-atlas-measure="rail-header"
        className="max-[860px]:contents min-[860px]:shrink-0 min-[860px]:border-b min-[860px]:border-(--color-border) min-[860px]:px-5 min-[860px]:pt-4 min-[860px]:pb-3 min-[1360px]:px-6"
      >
        <div className="order-1 px-4 pt-6 min-[640px]:px-6 min-[860px]:p-0">{masthead}</div>
        {search && <div className="order-3 px-4 pt-5 min-[640px]:px-6 min-[860px]:mt-3 min-[860px]:p-0">{search}</div>}
      </div>

      {/* Scrolls at 860px and up in every state, so there it is also a Tab
          stop with a name (SPEC §3.3, §12.7): a named region, because ARIA
          does not let a role-less div carry a name. Below 860px it neither
          scrolls nor takes focus, so it has no role or name. The paper panel
          is one article that this body scrolls (SPEC §9.1). The paper and
          region views keep their top bars sticky inside this scroller, so
          they reserve no scrollbar gutter (which would cut the bar's rule
          short). */}
      <div
        ref={bodyRef}
        tabIndex={!narrow ? 0 : undefined}
        role={!narrow ? 'region' : undefined}
        aria-label={!narrow ? RAIL_LABEL[paper ? 'paper' : region ? 'region' : 'explore'] : undefined}
        data-atlas-measure="rail-body"
        style={{ background: RAIL_SHADOWS }}
        className={`order-2 px-4 [--atlas-shadow:rgb(0_0_0/0.12)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-accent) min-[640px]:px-6 min-[860px]:min-h-0 min-[860px]:flex-1 min-[860px]:px-5 min-[860px]:pt-5 min-[860px]:pb-8 min-[1360px]:px-6 dark:[--atlas-shadow:rgb(0_0_0/0.5)] ${
          paper
            ? 'pt-3 pb-28 min-[860px]:overflow-y-auto'
            : region
              ? 'pt-3 min-[860px]:overflow-y-auto'
              : 'pt-3 [scrollbar-gutter:stable] min-[860px]:overflow-y-auto'
        }`}
      >
        {paper ? (
          panel
        ) : region ? (
          regionView
        ) : (
          <>
            <div data-atlas-measure="intro">{intro}</div>
            {!startFailed && <StartWith papers={startWith} onOpen={onOpenStart} />}
            {/* About the reviews comes before "Go to a region", so the one
                plain statement of how the reviews are made stays on the first
                screen (DOM order, so the Tab order matches what is seen). */}
            <section
              aria-labelledby="atlas-about-title"
              data-atlas-measure="about"
              className="mt-8 border-t border-(--color-border) pt-5 max-[860px]:hidden"
            >
              <h3 id="atlas-about-title" className={HEADING}>
                {ABOUT_HEADING}
              </h3>
              {about}
            </section>
            {regionSelect && <div className="max-[860px]:hidden">{regionSelect}</div>}
          </>
        )}
      </div>

      {!paper && !region && (
        <details
          data-atlas-measure="about-narrow"
          className="group order-4 mx-4 mt-5 border-y border-(--color-border) min-[640px]:mx-6 min-[860px]:hidden"
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-sans text-xs font-medium tracking-wider text-(--color-text-muted) uppercase focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-accent) [&::-webkit-details-marker]:hidden">
            {ABOUT_HEADING}
            <span aria-hidden="true" className="text-base leading-none motion-safe:transition-transform group-open:rotate-90">
              &rsaquo;
            </span>
          </summary>
          <div className="pb-3">{about}</div>
        </details>
      )}
    </aside>
  );
}
