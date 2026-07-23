import type { Metadata } from 'next';
import Link from 'next/link';
import WritingHub from '@/components/WritingHub';
import StructuredData from '@/components/StructuredData';
import { getAllArticles, getRecentHandwrittenArticles, getTagEntries } from '@/lib/articles';
import { getCategory, NEWS_AND_TRENDS } from '@/lib/articleTypes';
import { siteMetadata, buildAlternates, buildOpenGraph } from '@/lib/siteMetadata';

const description = 'Paper walkthroughs, research writeups, and technical writing by Minseok (Denis) Kim.';
export const metadata: Metadata = {
  title: 'Writing',
  description,
  alternates: buildAlternates('/writing/'),
  openGraph: buildOpenGraph({
    title: `Writing | ${siteMetadata.authorName}`,
    description,
    url: `${siteMetadata.siteUrl}/writing/`,
    type: 'website',
    images: [siteMetadata.ogImage],
  }),
};

interface Article {
  slug: string;
  title: string;
  date: string;
  type: string;
  description: string;
  tags: string[];
  readingTime: number;
}

export default async function Writing() {
  // Writing is the portfolio surface: hand-written work only. Paper reviews
  // are de-indexed and live in the archive; daily digests and weekly trend
  // reports have their own hub at /news/ (articles keep /writing/<slug>/
  // URLs — the hubs are projections, not namespaces).
  const articles = (getAllArticles() as Article[]).filter(
    (a) => a.type !== 'Paper Review' && getCategory(a.type) !== NEWS_AND_TRENDS,
  );
  // Hand-written pre-automation "Paper Review" articles live only in the
  // archive (the hub below filters that type out), so exclude them here too —
  // a featured card must never point at an article invisible in the feed
  // beneath it.
  const featured = getRecentHandwrittenArticles(6)
    .filter((a) => a.type !== 'Paper Review')
    .slice(0, 3);
  const tags = getTagEntries(articles);
  const pageUrl = `${siteMetadata.siteUrl}/writing/`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#collection`,
        name: 'Writing',
        description,
        url: pageUrl,
        about: tags.map((tag) => tag.name),
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#items`,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        numberOfItems: articles.length,
        itemListElement: articles.map((article, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'BlogPosting',
            headline: article.title,
            description: article.description,
            datePublished: article.date,
            url: `${siteMetadata.siteUrl}/writing/${article.slug}/`,
            keywords: article.tags.join(', '),
          },
        })),
      },
    ],
  };

  return (
    <div className="container-custom py-24 max-[560px]:py-16 max-[560px]:px-5">
      <StructuredData data={jsonLd} />
      <header className="mb-12">
        <h1 className="text-3xl md:text-4xl font-semibold mb-4 text-[var(--color-text)] font-serif">
          Writing
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Paper walkthroughs, research writeups, and tutorials.
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Looking for the daily digests and weekly trend reports? They live in{' '}
          <Link href="/news/" className="text-[var(--color-accent)] hover:underline">
            News
          </Link>
          .
        </p>
      </header>

      {featured.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            Featured
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {featured.map((article) => (
              <Link
                key={article.slug}
                href={`/writing/${article.slug}/`}
                className="block rounded-lg border border-[var(--color-border)] p-5 hover:border-[var(--color-accent)] transition-colors group"
              >
                <h3 className="text-base font-semibold font-serif text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors mb-2">
                  {article.title}
                </h3>
                <p className="line-clamp-2 text-sm text-[var(--color-text-secondary)] mb-3">
                  {article.description}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  <span className="tabular-nums">{article.date}</span> · {article.type} ·{' '}
                  {article.readingTime} min read
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {tags.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            Browse by topic
          </h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`/writing/tag/${tag.slug}/`}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors"
              >
                {tag.name} ({tag.count})
              </Link>
            ))}
          </div>
        </section>
      )}

      <WritingHub articles={articles} />

      <p className="mt-12">
        <Link
          href="/writing/archive/"
          className="text-[var(--color-accent)] hover:underline decoration-[color:color-mix(in_srgb,var(--color-accent)_30%,transparent)] underline-offset-2"
        >
          View the complete archive →
        </Link>
      </p>
    </div>
  );
}
