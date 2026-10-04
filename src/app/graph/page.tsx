import type { Metadata } from 'next';
import GraphClient from './GraphClient';
import {
  ABOUT_ABSTRACTS,
  ABOUT_HEADING,
  ABOUT_LINKS,
  ABOUT_REVIEWS,
  ATLAS_DEK_NARROW,
  ATLAS_DEK_WIDE,
  ATLAS_DESCRIPTION,
  ATLAS_HEADLINE,
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

export default function GraphPage() {
  return (
    <div className="container-app py-12 md:py-16 max-[560px]:py-8">
      <header className="mb-6 max-w-3xl">
        <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-(--color-text-muted) uppercase">
          Research Atlas &middot; preview
        </p>
        <h1 className="mb-3 font-serif text-3xl font-semibold text-(--color-text) md:text-4xl">
          {ATLAS_HEADLINE}
        </h1>
        {/* The map needs 860px (GRAPH_MIN_WIDTH in GraphClient); narrower
            screens get a list, so each dek is shown only where it is true.
            Tailwind v4's max-[860px] means width < 860px, so the pair splits
            the range exactly. */}
        <p
          data-atlas-measure="dek"
          className="leading-relaxed text-(--color-text-secondary) max-[860px]:hidden"
        >
          {ATLAS_DEK_WIDE}
        </p>
        <p
          data-atlas-measure="dek-narrow"
          className="leading-relaxed text-(--color-text-secondary) min-[860px]:hidden"
        >
          {ATLAS_DEK_NARROW}
        </p>
      </header>
      <GraphClient />
      <section
        aria-labelledby="atlas-about-reviews"
        data-atlas-measure="about"
        className="mt-8 max-w-3xl border-t border-(--color-border) pt-5"
      >
        <h2
          id="atlas-about-reviews"
          className="mb-2 font-sans text-xs font-medium tracking-wider text-(--color-text-muted) uppercase"
        >
          {ABOUT_HEADING}
        </h2>
        <p className="mb-2 text-[13px] leading-relaxed text-(--color-text-secondary)">{ABOUT_REVIEWS}</p>
        <p className="mb-2 text-[13px] leading-relaxed text-(--color-text-secondary)">{ABOUT_ABSTRACTS}</p>
        <p className="mb-0 text-[13px] leading-relaxed text-(--color-text-secondary)">{ABOUT_LINKS}</p>
      </section>
    </div>
  );
}
