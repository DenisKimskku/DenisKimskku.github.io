import type { Metadata } from 'next';
import GraphClient from './GraphClient';

const description =
  'An interactive map of the AI-security literature: 12,430 papers placed by embedding similarity, grouped into named regions, with PDF-verified reviews on the papers that have been read end to end.';

export const metadata: Metadata = {
  title: 'Research Atlas',
  description,
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
          A map of the AI-security literature
        </h1>
        <p className="leading-relaxed text-(--color-text-secondary)">
          Every dot is a paper, placed by embedding similarity and coloured by its region. The
          default view shows only papers whose review was written from the full PDF and then
          checked by a second pass; everything else is metadata only, and says so. Start with a
          paper you already know &mdash; press{' '}
          <kbd className="rounded border border-(--color-border) bg-(--color-bg-secondary) px-1 py-0.5 font-mono text-[11px]">
            /
          </kbd>{' '}
          to search.
        </p>
      </header>
      <GraphClient />
      <p className="mt-6 max-w-3xl text-xs leading-relaxed text-(--color-text-muted)">
        Reviews are machine-generated from the paper&rsquo;s full text and verified against it by a
        second model; the badge on each panel names the verifier and, where the payload records
        one, the date. They are a reading aid, not peer review. Links always go to the
        publisher&rsquo;s or arXiv&rsquo;s public landing page.
      </p>
    </div>
  );
}
