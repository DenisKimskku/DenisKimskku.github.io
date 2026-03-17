import type { Metadata } from 'next';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';
import { notFound } from 'next/navigation';
import { getArticleBySlug, getAllArticleSlugs, calculateReadingTime, generateTOC } from '@/lib/markdown';
import { getRelatedArticles, getAdjacentArticles } from '@/lib/articles';
import Link from 'next/link';
import StructuredData from '@/components/StructuredData';
import Breadcrumb from '@/components/Breadcrumb';
import CopyLinkButton from '@/components/CopyLinkButton';
import CodeBlockEnhancer from '@/components/CodeBlockEnhancer';
import ReadingProgress from '@/components/ReadingProgress';
import TableOfContents from '@/components/TableOfContents';
import GiscusComments from '@/components/GiscusComments';
import { siteMetadata } from '@/lib/siteMetadata';

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
      canonical: `/writing/${slug}/`,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      publishedTime: article.date,
      tags: article.tags,
      url: `${siteMetadata.siteUrl}/writing/${slug}`,
      images: [{ url: `/og/${slug}.png`, width: 1200, height: 630 }],
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
  const relatedArticles = getRelatedArticles(slug, article.tags);
  const { prev, next } = getAdjacentArticles(slug);
  const articleUrl = `${siteMetadata.siteUrl}/writing/${slug}`;
  const showUpdated = article.updatedAt && article.updatedAt !== article.date;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    url: `${siteMetadata.siteUrl}/writing/${slug}`,
    author: [{
      '@type': 'Person',
      name: siteMetadata.authorName,
      url: siteMetadata.siteUrl,
    }],
  };

  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    { name: 'Writing', href: '/writing' },
    { name: article.title },
  ];

  return (
    <div className="mx-auto px-6 max-w-[720px] lg:max-w-[960px] py-16 md:py-24">
      <ReadingProgress />
      <StructuredData data={jsonLd} />
      <Breadcrumb items={breadcrumbItems} />

      {/* Article Header */}
      <header className="mb-12">
        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-2 mb-6 text-sm text-[var(--color-text-muted)]">
          <time dateTime={article.date}>{article.date}</time>
          {showUpdated && (
            <>
              <span>·</span>
              <span>Updated: {article.updatedAt}</span>
            </>
          )}
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

      {/* Article Content with Sticky TOC */}
      <div className={toc.length > 0 ? 'lg:grid lg:grid-cols-[1fr_220px] lg:gap-10' : ''}>
        <div>
          {/* Mobile/Tablet TOC (inline collapsible) */}
          {toc.length > 0 && (
            <details className="lg:hidden toc mb-12" aria-label="Table of contents">
              <summary className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wider cursor-pointer select-none">
                Contents
              </summary>
              <ul className="mt-4 space-y-1.5">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={`block text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors py-0.5 ${item.level === 3 ? 'pl-4' : ''}`}
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Article Content */}
          <article
            className="article-content"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
          <CodeBlockEnhancer />
        </div>

        {/* Desktop Sticky TOC */}
        {toc.length > 0 && (
          <div className="hidden lg:block">
            <div className="toc-sidebar">
              <TableOfContents items={toc} />
            </div>
          </div>
        )}
      </div>

      {/* Share */}
      <div className="mt-16 pt-8 border-t border-[var(--color-border)] no-print">
        <h2 className="text-sm font-semibold mb-4 text-[var(--color-text)] uppercase tracking-wider">
          Share
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <CopyLinkButton url={articleUrl} />
          <a
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(article.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Post
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Share
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(`${article.title}\n\n${articleUrl}`)}`}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Email
          </a>
        </div>
      </div>

      {/* Comments */}
      <GiscusComments />

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div className="mt-12 pt-8 border-t border-[var(--color-border)] no-print">
          <h2 className="text-sm font-semibold mb-6 text-[var(--color-text)] uppercase tracking-wider">
            Related Articles
          </h2>
          <div className="space-y-4">
            {relatedArticles.map((related) => (
              <Link
                key={related.slug}
                href={`/writing/${related.slug}`}
                className="block group py-3 -mx-4 px-4 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
              >
                <h3 className="text-base font-semibold font-serif text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors mb-1">
                  {related.title}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-1">
                  {related.description}
                </p>
                <span className="text-xs text-[var(--color-text-muted)]">{related.date}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* GA4 Note */}
      <p className="text-xs text-[var(--color-text-muted)] no-print mt-12">
        Page views are tracked via Google Analytics for content improvement.
      </p>

      {/* Previous / Next Navigation */}
      {(prev || next) && (
        <nav aria-label="Article navigation" className="mt-8 pt-8 border-t border-[var(--color-border)] no-print">
          <div className="flex justify-between gap-4">
            {prev ? (
              <Link
                href={`/writing/${prev.slug}`}
                className="group flex-1 min-w-0"
              >
                <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">← Older</span>
                <p className="text-sm font-serif text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors truncate mt-1">
                  {prev.title}
                </p>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                href={`/writing/${next.slug}`}
                className="group flex-1 min-w-0 text-right"
              >
                <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Newer →</span>
                <p className="text-sm font-serif text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors truncate mt-1">
                  {next.title}
                </p>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </nav>
      )}

      {/* Back to Writing */}
      <footer className="mt-4 pt-8 border-t border-[var(--color-border)] no-print">
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