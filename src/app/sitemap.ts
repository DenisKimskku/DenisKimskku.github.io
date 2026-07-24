import { MetadataRoute } from 'next';
import { getAllArticles, getNewsArticles, getTagEntries } from '@/lib/articles';
import { siteMetadata } from '@/lib/siteMetadata';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteMetadata.siteUrl;
  const articles = getAllArticles();

  // Articles are sorted newest-first, so the first entry carries the most
  // recent frontmatter date. Content listings (/writing, /writing/archive)
  // change whenever a new article lands; low-churn static pages omit
  // lastModified entirely rather than stamping them with CI checkout mtime.
  const newestArticleDate = articles.length > 0 ? new Date(articles[0].date) : undefined;

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/writing/`,
      ...(newestArticleDate ? { lastModified: newestArticleDate } : {}),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/papers/`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/code/`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/resume/`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/writing/archive/`,
      ...(newestArticleDate ? { lastModified: newestArticleDate } : {}),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    // The /news/ hub links digests at their /writing/<slug>/ URLs; it changes
    // every day the automation publishes.
    {
      url: `${baseUrl}/news/`,
      ...(getNewsArticles()[0]?.date ? { lastModified: new Date(getNewsArticles()[0].date) } : {}),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/calendar-plus-plus/`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/calendar-plus-plus/privacy/`,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/calendar-plus-plus/terms/`,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ];

  // Only standalone paper reviews are de-indexed (see writing/[slug]/page.tsx) and
  // therefore excluded from the sitemap — submitting noindex URLs sends Google mixed
  // signals. Digests, trend reports, and human articles remain in the sitemap.
  const NOINDEX_TYPES = ['Paper Review'];
  const articleEntries = articles
    .filter((article) => !NOINDEX_TYPES.includes(article.type))
    .map((article) => ({
      url: `${baseUrl}/writing/${article.slug}/`,
      lastModified: new Date(article.date),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));

  // Tag pages (/writing/tag/*) render index,follow with self-canonicals and
  // unique landing copy, so they belong in the sitemap. Listing them stops
  // Google treating these crawlable-but-orphaned hubs as "Crawled - currently
  // not indexed". Cross-domain tools (e.g. dz.deniskim1.com) still don't belong
  // in this property's sitemap. Each hub's lastmod is its newest article's date.
  const newestDateByTag = new Map<string, string>();
  for (const article of articles) {
    for (const tag of article.tags) {
      if (!newestDateByTag.has(tag)) {
        newestDateByTag.set(tag, article.date);
      }
    }
  }

  // A hub with fewer than 3 indexable (non-Paper-Review) articles is noindexed
  // in tag/[tag]/page.tsx, so it must stay out of the sitemap too — submitting
  // a noindex URL sends Google mixed signals.
  const indexableCountByTag = new Map<string, number>();
  for (const article of articles) {
    if (article.type === 'Paper Review') continue;
    for (const tag of article.tags) {
      indexableCountByTag.set(tag, (indexableCountByTag.get(tag) || 0) + 1);
    }
  }

  const tagEntries: MetadataRoute.Sitemap = getTagEntries()
    .filter((tag) => (indexableCountByTag.get(tag.name) || 0) >= 3)
    .map((tag) => {
      const newestDate = newestDateByTag.get(tag.name);
      return {
        url: `${baseUrl}/writing/tag/${tag.slug}/`,
        ...(newestDate ? { lastModified: new Date(newestDate) } : {}),
        changeFrequency: 'weekly',
        priority: 0.5,
      };
    });

  // The pipeline transparency page is indexable but was missing from the sitemap.
  const pipelineEntry: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/writing/pipeline/`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  return [...staticPages, ...articleEntries, ...tagEntries, ...pipelineEntry];
}
