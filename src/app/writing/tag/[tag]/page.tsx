import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/Breadcrumb';
import StructuredData from '@/components/StructuredData';
import {
  getArticlesByTag,
  getTagBySlug,
  getTagEntries,
  getTagLandingContent,
  getTagSlugByName,
} from '@/lib/articles';
import { siteMetadata } from '@/lib/siteMetadata';

interface PageProps {
  params: Promise<{ tag: string }>;
}

function truncateForMeta(text: string, maxLength = 158): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.slice(0, maxLength - 1);
  const lastSpace = truncated.lastIndexOf(' ');
  const safeSlice = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  return `${safeSlice.trim()}…`;
}

export function generateStaticParams() {
  return getTagEntries().map((entry) => ({
    tag: entry.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag: tagSlug } = await params;
  const tagName = getTagBySlug(tagSlug);

  if (!tagName) {
    return {
      title: 'Tag not found',
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const articles = getArticlesByTag(tagName);
  const landingContent = getTagLandingContent(tagName, articles);
  const description = truncateForMeta(
    `${articles.length} research ${articles.length === 1 ? 'article' : 'articles'} on ${tagName}. ${landingContent.lead}`,
  );
  return {
    title: `${tagName} Research Articles`,
    description,
    keywords: [tagName, ...landingContent.relatedTags],
    alternates: {
      canonical: `/writing/tag/${tagSlug}`,
    },
    openGraph: {
      title: `${tagName} Research Articles | ${siteMetadata.authorName}`,
      description,
      url: `${siteMetadata.siteUrl}/writing/tag/${tagSlug}`,
      type: 'website',
      images: [siteMetadata.ogImage],
    },
  };
}

export default async function WritingTagPage({ params }: PageProps) {
  const { tag: tagSlug } = await params;
  const tagName = getTagBySlug(tagSlug);

  if (!tagName) {
    notFound();
  }

  const articles = getArticlesByTag(tagName);
  const landingContent = getTagLandingContent(tagName, articles);
  const description = truncateForMeta(
    `${articles.length} research ${articles.length === 1 ? 'article' : 'articles'} on ${tagName}. ${landingContent.lead}`,
  );
  const pageUrl = `${siteMetadata.siteUrl}/writing/tag/${tagSlug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#collection`,
        name: `Writing: ${tagName}`,
        description,
        url: pageUrl,
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
            description: article.description,
            datePublished: article.date,
            url: `${siteMetadata.siteUrl}/writing/${article.slug}`,
            keywords: article.tags.join(', '),
          },
        })),
      },
    ],
  };
  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    { name: 'Writing', href: '/writing' },
    { name: tagName },
  ];

  return (
    <div className="container-custom py-16 md:py-24">
      <StructuredData data={jsonLd} />
      <Breadcrumb items={breadcrumbItems} />

      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-semibold mb-3 text-[var(--color-text)] font-serif">
          Topic: {tagName}
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          {articles.length} {articles.length === 1 ? 'article' : 'articles'} in this topic.
        </p>
      </header>

      <section className="mb-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
        <p className="text-[var(--color-text)] leading-relaxed mb-4">
          {landingContent.lead}
        </p>
        <p className="text-[var(--color-text-secondary)] leading-relaxed mb-4">
          {landingContent.body}
        </p>
        <p className="text-[var(--color-text-secondary)] leading-relaxed">
          This page is maintained as a high-signal index for {tagName}. Use it to follow newer articles first, then branch into adjacent topics and defensive patterns that repeatedly appear across projects and paper reviews.
        </p>
      </section>

      {landingContent.relatedTags.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
            Related Topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {landingContent.relatedTags.map((relatedTag) => (
              <Link
                key={relatedTag}
                href={`/writing/tag/${getTagSlugByName(relatedTag)}`}
                className="px-3 py-1.5 rounded-full text-xs border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors"
              >
                {relatedTag}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
          What You Will Find Here
        </h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-[var(--color-text-secondary)]">
          {landingContent.learnings.map((learning) => (
            <li key={learning}>{learning}</li>
          ))}
        </ul>
      </section>

      <div className="space-y-1">
        {articles.map((article) => (
          <article key={article.slug} className="group">
            <Link
              href={`/writing/${article.slug}`}
              className="block py-5 -mx-4 px-4 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              <h2 className="text-lg font-semibold font-serif text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors mb-1.5">
                {article.title}
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                {article.description}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <time dateTime={article.date}>{article.date}</time>
                <span>·</span>
                <span>{article.type}</span>
                {article.tags.map((articleTag) => (
                  <span key={articleTag} className="px-2 py-0.5 rounded bg-[var(--color-bg-secondary)]">
                    {articleTag}
                  </span>
                ))}
              </div>
            </Link>
          </article>
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
