import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'News moved to Writing',
  description: 'The News section has been merged into Writing.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: '/writing/',
  },
};

export default function NewsMoved() {
  return (
    <div className="container-custom py-20 md:py-32">
      <div className="text-center max-w-md mx-auto">
        <h1 className="text-2xl md:text-3xl font-serif font-semibold text-[var(--color-text)] mb-4">
          News moved to Writing
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-8">
          Daily digests and trend reports are now part of the Writing section,
          alongside research articles and paper reviews.
        </p>
        <Link
          href="/writing/"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--color-accent)] text-white font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Go to Writing
        </Link>
      </div>
    </div>
  );
}
