import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticleBySlug, getAllArticleSlugs, calculateReadingTime, generateTOC } from '@/lib/markdown';
import Link from 'next/link';
import StructuredData from '@/components/StructuredData';

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
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      publishedTime: article.date,
      tags: article.tags,
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
    author: [{
      '@type': 'Person',
      name: 'Minseok (Denis) Kim',
      url: 'https://deniskimskku.github.io',
    }],
  };

  return (
    <div className="container-custom py-12 md:py-20">
      <StructuredData data={jsonLd} />
      {/* Article Header */}
      <header className="text-center mb-12 pb-8 border-b border-[var(--color-border)]">
        {/* Meta Info */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <span className="inline-block bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] px-3 py-1 rounded-full text-sm font-medium border border-[var(--color-border)]">
            {article.date}
          </span>
          <span className="inline-block bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] px-3 py-1 rounded-full text-sm font-medium border border-[var(--color-border)]">
            {article.type}
          </span>
          <span className="inline-block bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] px-3 py-1 rounded-full text-sm font-medium border border-[var(--color-border)]">
            {readingTime} min read
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-[var(--color-text)]">
          {article.title}
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-[var(--color-text-secondary)] mb-6 max-w-3xl mx-auto">
          {article.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap justify-center gap-2">
          {article.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-block bg-gradient-to-r from-[var(--color-accent)] to-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </header>

      {/* Table of Contents */}
      {toc.length > 0 && (
        <div className="toc mb-12">
          <h2 className="text-xl font-bold mb-4 text-[var(--color-text)]">
            Table of Contents
          </h2>
          <ul className="space-y-2">
            {toc.map((item, index) => (
              <li
                key={index}
                className={item.level === 3 ? 'ml-6' : ''}
              >
                <a
                  href={`#${item.id}`}
                  className="text-[var(--color-accent)] hover:underline"
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
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
          className="inline-flex items-center gap-2 text-[var(--color-accent)] hover:underline"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Writing
        </Link>
      </footer>
    </div>
  );
}