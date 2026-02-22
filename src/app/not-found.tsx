import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllArticles } from '@/lib/articles';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for does not exist.',
};

export default function NotFound() {
  const recentArticles = getAllArticles().slice(0, 3);

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

      {/* Quick Links */}
      <div className="flex justify-center gap-6 mt-12">
        <Link
          href="/papers"
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
        >
          Papers
        </Link>
        <Link
          href="/code"
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
        >
          Code
        </Link>
        <Link
          href="/writing"
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
        >
          Writing
        </Link>
      </div>

      {/* Recent Articles */}
      {recentArticles.length > 0 && (
        <div className="max-w-md mx-auto mt-16">
          <h2 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wider mb-4 text-center">
            Recent Articles
          </h2>
          <div className="space-y-3">
            {recentArticles.map((article) => (
              <Link
                key={article.slug}
                href={`/writing/${article.slug}`}
                className="block py-3 px-4 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
              >
                <h3 className="text-sm font-semibold font-serif text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors mb-1">
                  {article.title}
                </h3>
                <span className="text-xs text-[var(--color-text-muted)]">{article.date}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
