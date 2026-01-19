import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticleBySlug, getAllArticleSlugs, calculateReadingTime, generateTOC } from '@/lib/markdown';
import Link from 'next/link';
import StructuredData from '@/components/StructuredData';
import Breadcrumb from '@/components/Breadcrumb';

interface PageProps {
  params: Promise<{ slug: string }>;
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

  return {
    title: article.title,
    description: article.description,
    keywords: article.tags,
    alternates: {
      canonical: `/writing/${slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      publishedTime: article.date,
      tags: article.tags,
      url: `https://deniskim1.com/writing/${slug}`,
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    url: `https://deniskim1.com/writing/${slug}`,
    author: [{
      '@type': 'Person',
      name: 'Minseok (Denis) Kim',
      url: 'https://deniskim1.com',
    }],
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
          {article.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-block bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] px-3 py-1 rounded-full text-xs font-medium"
            >
              {tag}
            </span>
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