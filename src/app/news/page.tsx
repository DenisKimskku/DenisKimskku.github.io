import type { Metadata } from 'next';
import NewsHub from '@/components/NewsHub';
import StructuredData from '@/components/StructuredData';
import { getAllArticles } from '@/lib/articles';
import { siteMetadata } from '@/lib/siteMetadata';

const NEWS_TYPES = ['News Digest', 'Paper Review'];
const description =
  'Daily AI security intelligence — automated news digests, paper reviews, and emerging threat analysis.';

export const metadata: Metadata = {
  title: 'AI Security News',
  description,
  alternates: {
    canonical: '/news/',
  },
  openGraph: {
    title: `AI Security News | ${siteMetadata.authorName}`,
    description,
    url: `${siteMetadata.siteUrl}/news`,
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
  readingTime: number;
}

export default async function News() {
  const allArticles = getAllArticles() as Article[];
  const articles = allArticles.filter((a) => NEWS_TYPES.includes(a.type));
  const pageUrl = `${siteMetadata.siteUrl}/news`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${pageUrl}#collection`,
    name: 'AI Security News',
    description,
    url: pageUrl,
    numberOfItems: articles.length,
  };

  return (
    <div className="container-custom py-16 md:py-24">
      <StructuredData data={jsonLd} />
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl md:text-4xl font-semibold text-[var(--color-text)] font-serif">
            AI Security News
          </h1>
          <span className="px-2.5 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20">
            Auto-generated
          </span>
        </div>
        <p className="text-[var(--color-text-secondary)] max-w-2xl">
          Automated daily intelligence from ArXiv, Google News, and trusted
          security blogs — filtered and analyzed by a local AI pipeline.
        </p>
      </header>

      <NewsHub articles={articles} />
    </div>
  );
}
