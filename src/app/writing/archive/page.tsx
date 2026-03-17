import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';
import StructuredData from '@/components/StructuredData';
import { getAllArticles } from '@/lib/articles';
import { siteMetadata } from '@/lib/siteMetadata';

const description = 'Complete chronological archive of all articles, reviews, and tutorials.';

export const metadata: Metadata = {
  title: 'Writing Archive',
  description,
  alternates: {
    canonical: '/writing/archive/',
  },
  openGraph: {
    title: `Writing Archive | ${siteMetadata.authorName}`,
    description,
    url: `${siteMetadata.siteUrl}/writing/archive`,
    type: 'website',
    images: [siteMetadata.ogImage],
  },
};

export default function ArchivePage() {
  const articles = getAllArticles();
  const pageUrl = `${siteMetadata.siteUrl}/writing/archive`;

  const articlesByYear = new Map<string, typeof articles>();
  for (const article of articles) {
    const year = article.date.slice(0, 4);
    if (!articlesByYear.has(year)) {
      articlesByYear.set(year, []);
    }
    articlesByYear.get(year)!.push(article);
  }
  const years = Array.from(articlesByYear.keys()).sort((a, b) => b.localeCompare(a));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#collection`,
        url: pageUrl,
        name: 'Writing Archive',
        description,
        isPartOf: `${siteMetadata.siteUrl}/writing`,
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
            datePublished: article.date,
            url: `${siteMetadata.siteUrl}/writing/${article.slug}`,
          },
        })),
      },
    ],
  };

  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    { name: 'Writing', href: '/writing' },
    { name: 'Archive' },
  ];

  return (
    <div className="container-custom py-16 md:py-24">
      <StructuredData data={jsonLd} />
      <Breadcrumb items={breadcrumbItems} />

      <header className="mb-12">
        <h1 className="text-3xl md:text-4xl font-semibold mb-4 text-[var(--color-text)] font-serif">
          Archive
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          {articles.length} articles, chronologically ordered.
        </p>
      </header>

      <div className="space-y-10">
        {years.map((year) => (
          <section key={year}>
            <h2 className="text-2xl font-semibold font-serif text-[var(--color-text)] mb-4">
              {year}
            </h2>
            <div className="space-y-1">
              {articlesByYear.get(year)!.map((article) => (
                <Link
                  key={article.slug}
                  href={`/writing/${article.slug}`}
                  className="group flex items-baseline gap-4 py-2.5 -mx-4 px-4 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                  <time
                    dateTime={article.date}
                    className="text-sm text-[var(--color-text-muted)] tabular-nums shrink-0 w-[5.5rem]"
                  >
                    {article.date.slice(5)}
                  </time>
                  <div className="flex-1 min-w-0">
                    <span className="text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors font-serif">
                      {article.title}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)] ml-2">
                      {article.type}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-12 pt-8 border-t border-[var(--color-border)]">
        <Link href="/writing" className="text-sm text-[var(--color-accent)] hover:underline">
          Back to all writing
        </Link>
      </footer>
    </div>
  );
}
