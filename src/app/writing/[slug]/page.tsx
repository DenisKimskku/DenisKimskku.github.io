import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticleBySlug, getAllArticleSlugs, calculateReadingTime, generateTOC } from '@/lib/markdown';
import Link from 'next/link';
import StructuredData from '@/components/StructuredData';
import Breadcrumb from '@/components/Breadcrumb';
import { getAllArticles, getRelatedArticles, getTagSlugByName } from '@/lib/articles';
import { siteMetadata } from '@/lib/siteMetadata';

interface PageProps {
  params: Promise<{ slug: string }>;
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

function buildArticleMetaDescription(article: { description: string; type: string; tags: string[] }): string {
  const primaryTopic = article.tags[0] || 'AI security';
  const secondaryTopics = article.tags.slice(1, 3).join(', ');

  const summary = article.description.trim();
  const suffix = secondaryTopics
    ? ` Includes insights on ${primaryTopic} and ${secondaryTopics}.`
    : ` Includes practical insights on ${primaryTopic}.`;

  return truncateForMeta(`${summary} ${article.type} analysis.${suffix}`);
}

export async function generateStaticParams() {
  const slugs = getAllArticleSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  const primaryTopic = article.tags[0] || 'AI Security';
  const description = buildArticleMetaDescription(article);

  return {
    title: `${article.title} | ${primaryTopic}`,
    description,
    keywords: article.tags,
    alternates: {
      canonical: `/writing/${slug}`,
    },
    openGraph: {
      title: `${article.title} | ${article.type}`,
      description,
      type: 'article',
      publishedTime: article.date,
      modifiedTime: article.updatedAt,
      section: article.type,
      tags: article.tags,
      url: `${siteMetadata.siteUrl}/writing/${slug}`,
      images: [siteMetadata.ogImage],
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const readingTime = calculateReadingTime(article.content);
  const toc = generateTOC(article.content);
  const relatedArticles = getRelatedArticles(article.slug, article.tags, 3, getAllArticles());
  const metaDescription = buildArticleMetaDescription(article);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: metaDescription,
    datePublished: article.date,
    dateModified: article.updatedAt,
    url: `${siteMetadata.siteUrl}/writing/${slug}`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteMetadata.siteUrl}/writing/${slug}`,
    },
    image: [`${siteMetadata.siteUrl}${siteMetadata.ogImage.url}`],
    wordCount: article.wordCount,
    keywords: article.tags.join(', '),
    articleSection: article.type,
    inLanguage: 'en-US',
    author: [{
      '@type': 'Person',
      name: siteMetadata.authorName,
      url: siteMetadata.siteUrl,
    }],
    publisher: {
      '@type': 'Person',
      name: siteMetadata.authorName,
      url: siteMetadata.siteUrl,
    },
  };

  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    { name: 'Writing', href: '/writing' },
    { name: article.title },
  ];

  return (
    <div className="container-custom py-16 md:py-24">
      <StructuredData data={jsonLd} />
      <Breadcrumb items={breadcrumbItems} />

      {/* Article Header */}
      <header className="mb-12">
        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-2 mb-6 text-sm text-[var(--color-text-muted)]">
          <time dateTime={article.date}>{article.date}</time>
          <span>·</span>
          <span>{article.type}</span>
          <span>·</span>
          <span>{readingTime} min read</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-6 text-[var(--color-text)] font-serif leading-tight">
          {article.title}
        </h1>

        {/* Description */}
        <p className="text-lg text-[var(--color-text-secondary)] mb-6">
          {article.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <Link
              key={tag}
              href={`/writing/tag/${getTagSlugByName(tag)}`}
              className="inline-block bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] px-3 py-1 rounded-full text-xs font-medium"
            >
              {tag}
            </Link>
          ))}
        </div>
      </header>

      {/* Table of Contents */}
      {toc.length > 0 && (
        <nav className="toc mb-12" aria-label="Table of contents">
          <h2 className="text-sm font-semibold mb-4 text-[var(--color-text)] uppercase tracking-wider">
            Contents
          </h2>
          <ul className="space-y-2">
            {toc.map((item, index) => (
              <li
                key={index}
                className={item.level === 3 ? 'ml-4' : ''}
              >
                <a
                  href={`#${item.id}`}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] text-sm transition-colors"
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Article Content */}
      <article
        className="article-content"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      {relatedArticles.length > 0 && (
        <section className="mt-14 pt-8 border-t border-[var(--color-border)]">
          <h2 className="text-xl md:text-2xl font-semibold mb-5 text-[var(--color-text)] font-serif">
            Related articles
          </h2>
          <div className="space-y-4">
            {relatedArticles.map((related) => (
              <article key={related.slug} className="group">
                <Link
                  href={`/writing/${related.slug}`}
                  className="block rounded-lg border border-[var(--color-border)] p-4 hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                  <h3 className="text-base font-semibold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors mb-1.5">
                    {related.title}
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-2.5">
                    {related.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                    <time dateTime={related.date}>{related.date}</time>
                    <span>·</span>
                    <span>{related.type}</span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Back to Writing */}
      <footer className="mt-16 pt-8 border-t border-[var(--color-border)] no-print">
        <Link
          href="/writing"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to all articles
        </Link>
      </footer>
    </div>
  );
}
