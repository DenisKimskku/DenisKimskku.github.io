import type { Metadata } from 'next';
import fs from 'node:fs';
import path from 'node:path';
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
  groupArticlesForHub,
  type ArticleSummary,
} from '@/lib/articles';
import { siteMetadata, buildAlternates, buildOpenGraph, ogCard } from '@/lib/siteMetadata';
import { truncateForMeta } from '@/lib/seo';
import ArticleTypeLabel from '@/components/ArticleTypeLabel';

interface PageProps {
  params: Promise<{ tag: string }>;
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
  // Counts + newest title: unique per hub, unlike the shared template lead.
  const description = truncateForMeta(landingContent.metaDescription);
  // Thin hubs (fewer than 3 INDEXABLE articles — Paper Reviews are noindex and
  // don't count) read as scaled/low-value pages to Google, so noindex them
  // (keep follow, so their internal links still pass). Kept in sync with the
  // sitemap exclusion in src/app/sitemap.ts.
  const indexableCount = articles.filter((a) => a.type !== 'Paper Review').length;
  return {
    title: `${tagName} Research Articles`,
    description,
    keywords: [tagName, ...landingContent.relatedTags],
    ...(indexableCount < 3 ? { robots: { index: false, follow: true } } : {}),
    alternates: buildAlternates(`/writing/tag/${tagSlug}/`),
    openGraph: buildOpenGraph({
      title: `${tagName} Research Articles | ${siteMetadata.authorName}`,
      description,
      url: `${siteMetadata.siteUrl}/writing/tag/${tagSlug}/`,
      type: 'website',
      // Topic cards (_tag-<slug>.png) come from scripts/generate-og-images.mjs;
      // same existence check as the article page so a hub never links a 404.
      images: [
        fs.existsSync(path.join(process.cwd(), 'public', 'og', `_tag-${tagSlug}.png`))
          ? ogCard(`_tag-${tagSlug}`, `Topic: ${tagName} — research articles by ${siteMetadata.authorName}`)
          : siteMetadata.ogImage,
      ],
    }),
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
  // Counts + newest title: unique per hub, unlike the shared template lead.
  const description = truncateForMeta(landingContent.metaDescription);
  const pageUrl = `${siteMetadata.siteUrl}/writing/tag/${tagSlug}/`;
  // Hand-written work first, then news issues, then the (noindexed) review
  // backlog as compact rows — the ItemList follows the same visible order.
  const groups = groupArticlesForHub(articles);
  const ordered = [...groups.handwritten, ...groups.news, ...groups.reviews];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#collection`,
        name: `Writing: ${tagName}`,
        description,
        url: pageUrl,
        isPartOf: `${siteMetadata.siteUrl}/writing/`,
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#items`,
        numberOfItems: ordered.length,
        itemListElement: ordered.map((article, index) => ({
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

  const renderArticle = (article: ArticleSummary) => (
    <article key={article.slug} className="group">
      <Link
        href={`/writing/${article.slug}/`}
        className="block py-5 -mx-4 px-4 rounded-lg hover:bg-(--color-bg-secondary) transition-colors"
      >
        <h3 className="text-lg font-semibold font-serif text-(--color-text) group-hover:text-(--color-accent) transition-colors mb-1.5">
          {article.title}
        </h3>
        <p className="text-sm text-(--color-text-secondary) mb-2">
          {article.description}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-(--color-text-muted)">
          <time dateTime={article.date}>{article.date}</time>
          <span>·</span>
          <ArticleTypeLabel type={article.type} title={article.title} date={article.date} />
          <span>·</span>
          <span>{article.readingTime} min read</span>
          {article.tags.map((articleTag) => (
            <span key={articleTag} className="px-2 py-0.5 rounded-sm bg-(--color-bg-secondary)">
              {articleTag}
            </span>
          ))}
        </div>
      </Link>
    </article>
  );
  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    { name: 'Writing', href: '/writing/' },
    { name: tagName },
  ];

  return (
    <div className="container-custom py-16 md:py-24">
      <StructuredData data={jsonLd} />
      <Breadcrumb items={breadcrumbItems} />

      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-semibold mb-3 text-(--color-text) font-serif">
          Topic: {tagName}
        </h1>
        <p className="text-(--color-text-secondary)">
          {articles.length} {articles.length === 1 ? 'article' : 'articles'} in this topic.
        </p>
      </header>

      <section className="mb-10 rounded-lg border border-(--color-border) bg-(--color-bg-secondary) p-6">
        <p className="text-(--color-text) leading-relaxed mb-4">
          {landingContent.lead}
        </p>
        <p className="text-(--color-text-secondary) leading-relaxed mb-4">
          {landingContent.body}
        </p>
        <p className="text-(--color-text-secondary) leading-relaxed">
          {landingContent.coverage}
        </p>
      </section>

      {landingContent.relatedTags.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-(--color-text-muted) mb-3">
            Related Topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {landingContent.relatedTags.map((relatedTag) => (
              <Link
                key={relatedTag}
                href={`/writing/tag/${getTagSlugByName(relatedTag)}/`}
                className="px-3 py-1.5 rounded-full text-xs border border-(--color-border) bg-(--color-bg) text-(--color-text-secondary) hover:text-(--color-accent) hover:border-(--color-accent) transition-colors"
              >
                {relatedTag}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-(--color-text-muted) mb-3">
          What You Will Find Here
        </h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-(--color-text-secondary)">
          {landingContent.learnings.map((learning) => (
            <li key={learning}>{learning}</li>
          ))}
        </ul>
      </section>

      {groups.handwritten.length > 0 && (
        <section aria-labelledby="hub-handwritten" className="mb-10">
          <h2 id="hub-handwritten" className="text-sm font-semibold uppercase tracking-wider text-(--color-text-muted) mb-1">
            Walkthroughs, research, tutorials &amp; projects
          </h2>
          <div className="space-y-1">{groups.handwritten.map(renderArticle)}</div>
        </section>
      )}

      {groups.news.length > 0 && (
        <section aria-labelledby="hub-news" className="mb-10">
          <h2 id="hub-news" className="text-sm font-semibold uppercase tracking-wider text-(--color-text-muted) mb-1">
            News digests &amp; weekly trend reports
          </h2>
          <div className="space-y-1">{groups.news.map(renderArticle)}</div>
        </section>
      )}

      {groups.reviews.length > 0 && (
        <section aria-labelledby="hub-reviews" className="mb-10">
          <h2 id="hub-reviews" className="text-sm font-semibold uppercase tracking-wider text-(--color-text-muted) mb-1">
            Standalone paper reviews
          </h2>
          <p className="text-xs text-(--color-text-muted) mb-3">
            Each review is also summarized in the digest of its day.
          </p>
          <ul className="space-y-0.5">
            {groups.reviews.map((article) => (
              <li key={article.slug}>
                <Link
                  href={`/writing/${article.slug}/`}
                  className="group block py-2 -mx-4 px-4 rounded-lg hover:bg-(--color-bg-secondary) transition-colors"
                >
                  <div className="flex items-baseline gap-3">
                    <time
                      dateTime={article.date}
                      className="tabular-nums text-xs text-(--color-text-muted) shrink-0 w-20"
                    >
                      {article.date}
                    </time>
                    <span className="text-sm font-serif text-(--color-text) group-hover:text-(--color-accent) transition-colors min-w-0">
                      {article.title}
                    </span>
                  </div>
                  <p className="mt-0.5 ml-[5.75rem] text-xs text-(--color-text-muted) line-clamp-2">
                    {article.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-12 pt-8 border-t border-(--color-border)">
        <Link href="/writing/" className="text-sm text-(--color-accent) hover:underline">
          Back to all writing
        </Link>
      </footer>
    </div>
  );
}
