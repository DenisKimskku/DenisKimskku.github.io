import type { Metadata } from 'next';
import GraphClient from './GraphClient';

const description =
  'Interactive map of the AI-security literature: 10k+ papers clustered by topic, with PDF-verified reviews.';

export const metadata: Metadata = {
  title: 'Research Atlas',
  description,
  // Soft launch: keep this page out of search indexes for now.
  robots: { index: false, follow: false },
};

export default function GraphPage() {
  return (
    <div className="container-custom py-10 md:py-14 max-[560px]:px-5">
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-semibold mb-3 text-[var(--color-text)] font-serif">
          Research Atlas
        </h1>
        <p className="text-[var(--color-text-secondary)] max-w-2xl">
          A map of the AI-security literature. Each dot is a paper, positioned by
          semantic similarity and colored by topic cluster. Papers with a
          PDF-verified review open a full summary panel; the rest link to their
          public landing page.
        </p>
      </header>
      <GraphClient />
    </div>
  );
}
