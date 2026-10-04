'use client';

import { useRef } from 'react';
import { SIMILAR_HEADING, type Tier } from './atlasCopy';
import type { AreaId } from './atlasPalette';
import type { AtlasNode } from './atlasTypes';
import PaperRow from './PaperRow';

/* Copy deck P29–P32 (SPEC §11.6); P28 is SIMILAR_HEADING. */
const FINDING = 'Finding similar papers…';
const UNAVAILABLE = 'Similar papers are unavailable right now.';
const NONE_RECORDED = 'No similar papers are recorded for this paper.';
const SHOW_SIMILAR = 'Show similar papers';
const LOADS_DATA = 'Loads extra data.';

/** The shared small heading (SPEC §3.9). */
const HEADING = 'font-sans text-xs font-medium uppercase tracking-wider text-(--color-text-muted) mb-2';

/** A similar paper as its row shows it: P33 "{year} · {tier}" under the display title. */
export interface SimilarPaper {
  node: AtlasNode;
  title: string;
  note: string;
  tier: Tier;
  area: AreaId;
}

/**
 * Where the similar papers stand (SPEC §4.3): the similarity data is on its
 * way, here, or failed; or, in a list-only layout, not asked for yet (the
 * reader loads it with P32's button).
 */
export type SimilarState = 'loading' | 'ready' | 'error' | 'on-demand';

interface SimilarPapersProps {
  state: SimilarState;
  papers: SimilarPaper[];
  onOpen: (id: string) => void;
  /** P32: fetch the similarity data (list-only layouts). */
  onLoad: () => void;
}

/* "Similar papers" (SPEC §9.2 item 8, §7.4): the selected paper's most
   similar papers from the similarity data, each a compact row that opens it
   (the trail remembers where the reader came from). */
export default function SimilarPapers({ state, papers, onOpen, onLoad }: SimilarPapersProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  return (
    <section
      aria-labelledby="atlas-similar-title"
      data-atlas-measure="similar"
      className="mt-6 border-t border-(--color-border) pt-4"
    >
      <h3 id="atlas-similar-title" ref={headingRef} tabIndex={-1} className={`${HEADING} focus:outline-none`}>
        {SIMILAR_HEADING}
      </h3>
      {state === 'on-demand' && (
        <>
          <button
            type="button"
            data-atlas-measure="similar-load"
            onClick={() => {
              // The button gives way to the loading line: keep focus in the section.
              headingRef.current?.focus();
              onLoad();
            }}
            className="inline-flex min-h-11 items-center rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-medium text-(--color-text) hover:bg-(--color-bg-tertiary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent) min-[860px]:min-h-8"
          >
            {SHOW_SIMILAR}
          </button>
          <p className="mt-1.5 mb-0 text-xs text-(--color-text-muted)">{LOADS_DATA}</p>
        </>
      )}
      {state === 'loading' && (
        <p data-atlas-measure="similar-state" className="mb-0 text-sm text-(--color-text-secondary)">
          {FINDING}
        </p>
      )}
      {state === 'error' && (
        <p data-atlas-measure="similar-state" className="mb-0 text-sm text-(--color-text-secondary)">
          {UNAVAILABLE}
        </p>
      )}
      {state === 'ready' && papers.length === 0 && (
        <p data-atlas-measure="similar-state" className="mb-0 text-sm text-(--color-text-secondary)">
          {NONE_RECORDED}
        </p>
      )}
      {state === 'ready' && papers.length > 0 && (
        <ul className="-mx-2">
          {papers.map(({ node, title, note, tier, area }, i) => (
            <PaperRow
              key={node.id}
              variant="compact"
              id={node.id}
              onOpen={onOpen}
              data={{ 'data-atlas-measure': `similar-${i + 1}` }}
              title={title}
              tier={tier}
              area={area}
              subtitle={note}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
