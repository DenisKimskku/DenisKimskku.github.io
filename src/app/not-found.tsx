import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllArticles } from '@/lib/articles';

// This component is written to out/404.html, which GitHub Pages serves with a
// real HTTP 404 for every unmatched URL (deleted articles, renamed slugs, old
// /news/* paths, orphaned tag URLs). The root layout sets a global robots
// index,follow, so without this override the 404 page would inherit it and ship
// a contradictory "index" signal next to Next's auto noindex. Forcing noindex
// (incl. googleBot) gives Google the clean "drop this missing page" directive.
export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for does not exist.',
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
};

export default function NotFound() {
  const recentArticles = getAllArticles().slice(0, 3);

  return (
    <div className="container-custom py-20 md:py-32">
      <div className="text-center max-w-md mx-auto">
        <p className="text-6xl md:text-8xl font-serif font-bold text-(--color-text-muted) mb-6">
          404
        </p>
        <h1 className="text-2xl md:text-3xl font-serif font-semibold text-(--color-text) mb-4">
          Page not found
        </h1>
        <p className="text-(--color-text-secondary) mb-8">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-(--color-accent) text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Go home
          </Link>
          <Link
            href="/writing/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-(--color-border) text-(--color-text) font-medium text-sm hover:bg-(--color-bg-secondary) transition-colors"
          >
            Browse articles
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex justify-center gap-6 mt-12">
        <Link
          href="/papers/"
          className="text-sm text-(--color-text-secondary) hover:text-(--color-accent) transition-colors"
        >
          Papers
        </Link>
        <Link
          href="/code/"
          className="text-sm text-(--color-text-secondary) hover:text-(--color-accent) transition-colors"
        >
          Code
        </Link>
        <Link
          href="/writing/"
          className="text-sm text-(--color-text-secondary) hover:text-(--color-accent) transition-colors"
        >
          Writing
        </Link>
      </div>

      {/* Recent Articles */}
      {recentArticles.length > 0 && (
        <div className="max-w-md mx-auto mt-16">
          <h2 className="text-sm font-semibold text-(--color-text) uppercase tracking-wider mb-4 text-center">
            Recent Articles
          </h2>
          <div className="space-y-3">
            {recentArticles.map((article) => (
              <Link
                key={article.slug}
                href={`/writing/${article.slug}/`}
                className="block py-3 px-4 rounded-lg hover:bg-(--color-bg-secondary) transition-colors"
              >
                <h3 className="text-sm font-semibold font-serif text-(--color-text) hover:text-(--color-accent) transition-colors mb-1">
                  {article.title}
                </h3>
                <span className="text-xs text-(--color-text-muted)">{article.date}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
