import fs from 'node:fs';
import path from 'node:path';

export interface ArticleSummary {
  slug: string;
  title: string;
  date: string;
  type: string;
  description: string;
  tags: string[];
}

export interface TagEntry {
  name: string;
  slug: string;
  count: number;
}

const articlesIndexPath = path.join(process.cwd(), 'src', 'data', 'articles-index.json');

export function getAllArticles(): ArticleSummary[] {
  const fileContents = fs.readFileSync(articlesIndexPath, 'utf8');
  const articles = JSON.parse(fileContents) as ArticleSummary[];
  return articles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function slugifyTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getTagEntries(articles: ArticleSummary[] = getAllArticles()): TagEntry[] {
  const counts = new Map<string, number>();
  for (const article of articles) {
    for (const tag of article.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  const usedSlugs = new Set<string>();
  const tags = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b));

  return tags.map((tag) => {
    const base = slugifyTag(tag) || 'tag';
    let slug = base;
    let suffix = 2;
    while (usedSlugs.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    usedSlugs.add(slug);
    return { name: tag, slug, count: counts.get(tag) || 0 };
  });
}

export function getTagBySlug(tagSlug: string): string | null {
  const match = getTagEntries().find((entry) => entry.slug === tagSlug);
  return match?.name || null;
}

export function getTagSlugByName(tagName: string): string {
  const match = getTagEntries().find((entry) => entry.name === tagName);
  return match?.slug || slugifyTag(tagName) || 'tag';
}

export function getArticlesByTag(tagName: string): ArticleSummary[] {
  return getAllArticles().filter((article) => article.tags.includes(tagName));
}
