import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for does not exist.',
};

export default function NotFound() {
  return (
    <div className="container-custom py-20 md:py-32">
      <div className="text-center max-w-md mx-auto">
        <p className="text-6xl md:text-8xl font-serif font-bold text-[var(--color-text-muted)] mb-6">
          404
        </p>
        <h1 className="text-2xl md:text-3xl font-serif font-semibold text-[var(--color-text)] mb-4">
          Page not found
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-8">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--color-accent)] text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Go home
          </Link>
          <Link
            href="/writing"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] font-medium text-sm hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            Browse articles
          </Link>
        </div>
      </div>
    </div>
  );
}
