import type { Metadata } from 'next';
import Link from 'next/link';
import WritingHub from '@/components/WritingHub';
import StructuredData from '@/components/StructuredData';
import { getAllArticles, getTagEntries } from '@/lib/articles';
import { siteMetadata } from '@/lib/siteMetadata';

const description = 'Research articles and technical writings by Minseok (Denis) Kim.';
export const metadata: Metadata = {
  title: 'Writing',
  description,
  alternates: {
    canonical: '/writing',
  },
  openGraph: {
    title: `Writing | ${siteMetadata.authorName}`,
    description,
    url: `${siteMetadata.siteUrl}/writing`,
    type: 'website',
    images: [siteMetadata.ogImage],
  },
};

interface Article {
  slug: string;
  title: string;
  date: string;
  type: string;
  description: string;
  tags: string[];
}

export default async function Writing() {
  const articles = getAllArticles() as Article[];
  const tags = getTagEntries(articles);
  const pageUrl = `${siteMetadata.siteUrl}/writing`;
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
            url: `${siteMetadata.siteUrl}/writing/${article.slug}`,
            keywords: article.tags.join(', '),
          },
        })),
      },
    ],
  };

  return (
    <div className="container-custom py-16 md:py-24">
      <StructuredData data={jsonLd} />
      <header className="mb-12">
        <h1 className="text-3xl md:text-4xl font-semibold mb-4 text-[var(--color-text)] font-serif">
          Writing
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Research articles, paper reviews, and technical writeups.
        </p>
      </header>

      {tags.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            Browse by topic
          </h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`/writing/tag/${tag.slug}`}
                className="px-3 py-1.5 rounded-full text-xs border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors"
              >
                {tag.name} ({tag.count})
              </Link>
            ))}
          </div>
        </section>
      )}

      <WritingHub articles={articles} />
    </div>
  );
}
