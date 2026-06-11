import { MetadataRoute } from 'next';
import fs from 'node:fs';
import path from 'node:path';
import { getAllArticles, getTagEntries } from '@/lib/articles';
import { siteMetadata } from '@/lib/siteMetadata';

export const dynamic = 'force-static';

function getLastModified(filePath: string): Date {
  try {
    return fs.statSync(filePath).mtime;
  } catch {
    return new Date();
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteMetadata.siteUrl;
  const appDir = path.join(process.cwd(), 'src', 'app');
  const articlesDir = path.join(process.cwd(), 'src', 'content', 'articles');
  const articles = getAllArticles();

  const staticPages = [
    {
      route: '',
      file: path.join(appDir, 'page.tsx'),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      route: '/writing',
      file: path.join(appDir, 'writing', 'page.tsx'),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      route: '/papers',
      file: path.join(appDir, 'papers', 'page.tsx'),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      route: '/code',
      file: path.join(appDir, 'code', 'page.tsx'),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      route: '/resume',
      file: path.join(appDir, 'resume', 'page.tsx'),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      route: '/writing/archive',
      file: path.join(appDir, 'writing', 'archive', 'page.tsx'),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      route: '/calendar-plus-plus',
      file: path.join(appDir, 'calendar-plus-plus', 'page.tsx'),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      route: '/calendar-plus-plus/privacy',
      file: path.join(appDir, 'calendar-plus-plus', 'privacy', 'page.tsx'),
      changeFrequency: 'yearly' as const,
      priority: 0.4,
    },
    {
      route: '/calendar-plus-plus/terms',
      file: path.join(appDir, 'calendar-plus-plus', 'terms', 'page.tsx'),
      changeFrequency: 'yearly' as const,
      priority: 0.4,
    },
  ];

  // Only standalone paper reviews are de-indexed (see writing/[slug]/page.tsx) and
  // therefore excluded from the sitemap — submitting noindex URLs sends Google mixed
  // signals. Digests, trend reports, and human articles remain in the sitemap.
  const NOINDEX_TYPES = ['Paper Review'];
  const articleEntries = articles
    .filter((article) => !NOINDEX_TYPES.includes(article.type))
    .map((article) => {
      const articleFilePath = path.join(articlesDir, `${article.slug}.md`);
      return {
        url: `${baseUrl}/writing/${article.slug}/`,
        lastModified: getLastModified(articleFilePath),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      };
    });

  // Tag pages (/writing/tag/*) render index,follow with self-canonicals and
  // unique landing copy, so they belong in the sitemap. Listing them stops
  // Google treating these crawlable-but-orphaned hubs as "Crawled - currently
  // not indexed". Cross-domain tools (e.g. dz.deniskim1.com) still don't belong
  // in this property's sitemap.
  const tagEntries = getTagEntries().map((tag) => ({
    url: `${baseUrl}/writing/tag/${tag.slug}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  return [
    ...staticPages.map((page) => ({
      url: `${baseUrl}${page.route}/`,
      lastModified: getLastModified(page.file),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...articleEntries,
    ...tagEntries,
  ];
}
