import type { Metadata } from 'next';
import Link from 'next/link';
import StructuredData from '@/components/StructuredData';
import { getNewsArticles, groupArticlesByMonth } from '@/lib/articles';
import { siteMetadata, buildAlternates, buildOpenGraph } from '@/lib/siteMetadata';

// IMPORTANT: article URLs intentionally live under /writing/<slug>/ — this hub
// is an index-layer projection, NOT a URL namespace. Never add a Cloudflare
// /writing/* wildcard redirect toward /news/: it would break the hand-written
// pieces, the 13 tag hubs, and /writing/archive/. RSS guids also encode the
// /writing/ URLs, so moving articles would re-deliver every feed item.
//
// Pagination upgrade path (deliberately NOT built yet): once this hub passes
// roughly 6 months of content, add stable per-month archive pages
// /news/<yyyy>-<mm>/ via generateStaticParams — month pages freeze when the
// month closes, so pagination never churns existing URLs.

const description =
  'Daily AI security news digests and weekly trend reports: jailbreaks, prompt injection, model and agent security, and the research shaping the field.';

export const metadata: Metadata = {
  title: 'AI Security News',
  description,
  alternates: buildAlternates('/news/', '/news/rss.xml'),
  openGraph: buildOpenGraph({
    title: `AI Security News | ${siteMetadata.authorName}`,
    description,
    url: `${siteMetadata.siteUrl}/news/`,
    type: 'website',
    images: [siteMetadata.ogImage],
  }),
};

function isWeekly(type: string): boolean {
  return type === 'Trend Report';
}

export default function NewsPage() {
  const articles = getNewsArticles();
  const pageUrl = `${siteMetadata.siteUrl}/news/`;

  // Content problems must never take this page down: with an empty corpus we
  // render a friendly shell instead of throwing (content-never-blocks-deploy).
  if (articles.length === 0) {
    return (
      <div className="container-custom py-20 md:py-32 text-center">
        <h1 className="text-3xl font-serif font-semibold text-[var(--color-text)] mb-4">AI Security News</h1>
        <p className="text-[var(--color-text-secondary)]">
          No news issues yet — the next daily digest lands here. Meanwhile, see{' '}
          <Link href="/writing/" className="text-[var(--color-accent)] hover:underline">
            Writing
          </Link>
          .
        </p>
      </div>
    );
  }

  const latestDaily = articles.find((a) => !isWeekly(a.type)) ?? null;
  const latestWeekly = articles.find((a) => isWeekly(a.type)) ?? null;
  const recentWeeklies = articles.filter((a) => isWeekly(a.type)).slice(0, 4);
  const months = groupArticlesByMonth(articles);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#collection`,
        name: 'AI Security News',
        description,
        url: pageUrl,
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#items`,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        numberOfItems: articles.length,
        itemListElement: articles.map((article, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${siteMetadata.siteUrl}/writing/${article.slug}/`,
          name: article.title,
        })),
      },
    ],
  };

  const heroItems = [latestDaily, latestWeekly].filter(
    (a): a is NonNullable<typeof a> => a !== null,
  );

  return (
    <div className="container-custom py-12 md:py-20">
      <StructuredData data={jsonLd} />

      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-serif font-semibold text-[var(--color-text)] mb-3">
          AI Security News
        </h1>
        <p className="text-[var(--color-text-secondary)] max-w-2xl">
          A daily digest of AI security research and a weekly trend report covering
          the developments that matter.
        </p>
        <p className="mt-3 text-sm">
          <a
            href="/news/rss.xml"
            className="inline-flex items-center gap-1.5 text-[var(--color-accent)] hover:underline"
          >
            Subscribe to the news feed (RSS)
          </a>
        </p>
      </header>

      {/* Latest issue(s) */}
      <section aria-label="Latest issues" className="grid gap-4 md:grid-cols-2 mb-12">
        {heroItems.map((article) => (
          <Link
            key={article.slug}
            href={`/writing/${article.slug}/`}
            className="block p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent)] transition-colors"
          >
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
              {isWeekly(article.type) ? 'Latest weekly' : 'Latest daily'} ·{' '}
              <time dateTime={article.date}>{article.date}</time>
            </p>
            <h2 className="font-serif font-semibold text-[var(--color-text)] mb-2">{article.title}</h2>
            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-3">{article.description}</p>
          </Link>
        ))}
      </section>

      {/* Recent weeklies strip */}
      {recentWeeklies.length > 1 && (
        <section aria-label="Recent weekly trend reports" className="mb-12">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
            This Week in AI Security
          </h2>
          <ul className="space-y-1.5">
            {recentWeeklies.map((article) => (
              <li key={article.slug}>
                <Link
                  href={`/writing/${article.slug}/`}
                  className="text-sm text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors"
                >
                  <time dateTime={article.date} className="tabular-nums text-[var(--color-text-muted)] mr-2">
                    {article.date}
                  </time>
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Month-grouped archive */}
      {months.map((month) => (
        <section key={month.key} aria-label={month.label} className="mb-10">
          <h2 className="text-sm font-medium text-[var(--color-text-muted)] border-b border-[var(--color-border)] pb-2 mb-3">
            {month.label}
          </h2>
          <ul className="space-y-1.5">
            {month.articles.map((article) => (
              <li key={article.slug} className="flex items-baseline gap-3">
                <time
                  dateTime={article.date}
                  className="tabular-nums text-xs text-[var(--color-text-muted)] shrink-0 w-20"
                >
                  {article.date}
                </time>
                <Link
                  href={`/writing/${article.slug}/`}
                  className="text-sm text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors min-w-0"
                >
                  {article.title}
                </Link>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] border border-[var(--color-border)] rounded px-1 py-px shrink-0">
                  {isWeekly(article.type) ? 'Weekly' : 'Daily'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
