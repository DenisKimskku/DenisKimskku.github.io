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
  const tagEntries = getTagEntries(articles);

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

  const articleEntries = articles.map((article) => {
    const articleFilePath = path.join(articlesDir, `${article.slug}.md`);
    return {
      url: `${baseUrl}/writing/${article.slug}`,
      lastModified: getLastModified(articleFilePath),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    };
  });

  const tagEntriesForSitemap = tagEntries.map((tagEntry) => {
    const relatedArticleDates = articles
      .filter((article) => article.tags.includes(tagEntry.name))
      .map((article) => getLastModified(path.join(articlesDir, `${article.slug}.md`)).getTime());

    const latestTagUpdate = relatedArticleDates.length > 0
      ? new Date(Math.max(...relatedArticleDates))
      : getLastModified(path.join(appDir, 'writing', 'page.tsx'));

    return {
      url: `${baseUrl}/writing/tag/${tagEntry.slug}`,
      lastModified: latestTagUpdate,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    };
  });

  return [
    ...staticPages.map((page) => ({
      url: `${baseUrl}${page.route}`,
      lastModified: getLastModified(page.file),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...tagEntriesForSitemap,
    ...articleEntries,
  ];
}
