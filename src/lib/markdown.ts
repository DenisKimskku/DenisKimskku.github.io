import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

export interface ArticleMetadata {
  title: string;
  date: string;
  type: string;
  description: string;
  tags: string[];
  slug: string;
}

export interface Article extends ArticleMetadata {
  content: string;
  updatedAt: string;
  wordCount: number;
}

const articlesDirectory = path.join(process.cwd(), 'src', 'content', 'articles');

// Simple build-time cache to avoid reprocessing articles
const articleCache = new Map<string, Article | null>();

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  // Check cache first
  if (articleCache.has(slug)) {
    return articleCache.get(slug) || null;
  }
  try {
    const fullPath = path.join(articlesDirectory, `${slug}.md`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const fileStats = fs.statSync(fullPath);
    const { data, content } = matter(fileContents);
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const updatedAt = fileStats.mtime.toISOString().split('T')[0];

    // Process markdown to HTML
    const processedContent = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(rehypeKatex)
      .use(rehypeHighlight)
      .use(rehypeStringify)
      .process(content);

    const contentHtml = processedContent.toString();

    const article = {
      slug,
      title: data.title || '',
      date: data.date || '',
      type: data.type || 'Article',
      description: data.description || '',
      tags: data.tags || [],
      content: contentHtml,
      updatedAt,
      wordCount,
    };

    // Cache the result
    articleCache.set(slug, article);
    return article;
  } catch (error) {
    console.error(`Error loading article ${slug}:`, error);
    articleCache.set(slug, null);
    return null;
  }
}

export function getAllArticleSlugs(): string[] {
  try {
    if (!fs.existsSync(articlesDirectory)) {
      return [];
    }
    const fileNames = fs.readdirSync(articlesDirectory);
    return fileNames
      .filter(fileName => fileName.endsWith('.md'))
      .map(fileName => fileName.replace(/\.md$/, ''));
  } catch (error) {
    console.error('Error reading articles directory:', error);
    return [];
  }
}

export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

// Generate table of contents from HTML
export function generateTOC(htmlContent: string): Array<{ level: number; text: string; id: string }> {
  const headingRegex = /<h([2-3])([^>]*)>(.*?)<\/h\1>/g;
  const toc: Array<{ level: number; text: string; id: string }> = [];
  let match;

  while ((match = headingRegex.exec(htmlContent)) !== null) {
    const level = parseInt(match[1]);
    const attrs = match[2];
    const text = match[3].replace(/<[^>]*>/g, ''); // Strip HTML tags
    const idMatch = attrs.match(/\sid="([^"]+)"/);
    const id = idMatch?.[1] || text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    toc.push({ level, text, id });
  }

  return toc;
}
