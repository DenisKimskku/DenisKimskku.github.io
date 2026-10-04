import type { Metadata } from 'next';
import GraphClient from './GraphClient';
import {
  ABOUT_ABSTRACTS,
  ABOUT_LINKS,
  ABOUT_REVIEWS,
  ATLAS_DEK_NARROW,
  ATLAS_DEK_WIDE,
  ATLAS_DESCRIPTION,
  ATLAS_HEADLINE,
  ATLAS_NAME,
  PREVIEW_BADGE,
  PREVIEW_TITLE,
} from './atlasCopy';

export const metadata: Metadata = {
  title: 'Research Atlas',
  // Number-free (copy deck M2), so link previews can never show a stale count.
  description: ATLAS_DESCRIPTION,
  // Soft launch: keep the page out of search indexes until it is reviewed.
  // Deliberately NOT added to sitemap.ts or the header nav either — reach it
  // by direct URL. No robots.txt Disallow: a crawler must be able to fetch the
  // page to see the noindex.
  robots: { index: false, follow: false, nocache: true },
};

/* The atlas spread (SPEC §2, §3.1): the page is one full-height frame under
   the site header, so nothing renders above it. The copy is server-rendered
   and handed to the client frame as slots. */
export default function GraphPage() {
  return (
    <div className="atlas-page">
      <GraphClient
        masthead={
          <div data-atlas-measure="masthead" className="flex items-center gap-2">
            <h1 className="mb-0 font-sans text-xs font-medium tracking-wider text-(--color-text-muted) uppercase">
              {ATLAS_NAME}
            </h1>
            <span
              title={PREVIEW_TITLE}
              className="inline-flex items-center rounded-full border border-(--color-border) px-1.5 py-px text-[10px] font-medium tracking-wider text-(--color-text-muted) uppercase"
            >
              {PREVIEW_BADGE}
            </span>
          </div>
        }
        intro={
          <>
            <h2
              data-atlas-measure="headline"
              className="mb-0 font-serif text-[26px] leading-[1.2] font-semibold tracking-[-0.02em] text-(--color-text)"
            >
              {ATLAS_HEADLINE}
            </h2>
            {/* The map needs 860px (GRAPH_MIN_WIDTH in GraphClient); narrower
                screens get a list, so each dek is shown only where it is true.
                Tailwind v4's max-[860px] means width < 860px, so the pair splits
                the range exactly. */}
            <p
              data-atlas-measure="dek"
              className="mt-3 mb-0 text-[15px] leading-relaxed text-(--color-text-secondary) max-[860px]:hidden"
            >
              {ATLAS_DEK_WIDE}
            </p>
            <p
              data-atlas-measure="dek-narrow"
              className="mt-3 mb-0 text-[15px] leading-relaxed text-(--color-text-secondary) min-[860px]:hidden"
            >
              {ATLAS_DEK_NARROW}
            </p>
          </>
        }
        about={
          // Rendered twice by the rail (an open section at 860px and up, a
          // closed disclosure below), so it carries no ids. The heading (A0)
          // is the rail's.
          <>
            <p className="mb-2 text-[13px] leading-relaxed text-(--color-text-secondary)">{ABOUT_REVIEWS}</p>
            <p className="mb-2 text-[13px] leading-relaxed text-(--color-text-secondary)">{ABOUT_ABSTRACTS}</p>
            <p className="mb-0 text-[13px] leading-relaxed text-(--color-text-secondary)">{ABOUT_LINKS}</p>
          </>
        }
      />
    </div>
  );
}
