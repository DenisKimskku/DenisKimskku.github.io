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
import { visit } from 'unist-util-visit';
import sharp from 'sharp';
import type { Root, Element } from 'hast';
import {
  extractDescriptionFromContent,
  inferTagsFromContent,
  isTrivialDescription,
} from '../../scripts/lib/extract-frontmatter.mjs';

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

// Cache intrinsic image dimensions across articles (keyed by src)
const imageDimensionsCache = new Map<string, { width: number; height: number } | null>();

async function getImageDimensions(src: string): Promise<{ width: number; height: number } | null> {
  const cached = imageDimensionsCache.get(src);
  if (cached !== undefined) {
    return cached;
  }
  let dims: { width: number; height: number } | null = null;
  try {
    const fullPath = path.join(process.cwd(), 'public', src);
    const metadata = await sharp(fullPath).metadata();
    if (metadata.width && metadata.height) {
      dims = { width: metadata.width, height: metadata.height };
    }
  } catch {
    // Never fail the build over a missing/unreadable image — just skip dimensions
    dims = null;
  }
  imageDimensionsCache.set(src, dims);
  return dims;
}

function rehypeLazyImages() {
  return async (tree: Root) => {
    const images: Element[] = [];
    let firstImageSeen = false;
    visit(tree, 'element', (node: Element, index: number | undefined, parent: Element | Root | undefined) => {
      if (node.tagName === 'img') {
        node.properties = node.properties || {};
        if (firstImageSeen) {
          node.properties.loading = 'lazy';
        } else {
          // Treat the first image as the hero/LCP candidate
          firstImageSeen = true;
          node.properties.loading = 'eager';
          node.properties.fetchPriority = 'high';
        }
        node.properties.decoding = 'async';
        images.push(node);

        const src = String(node.properties.src || '');
        if (src.endsWith('.png') && parent && typeof index === 'number') {
          const webpSrc = src.replace(/\.png$/, '.webp');
          const picture: Element = {
            type: 'element',
            tagName: 'picture',
            properties: {},
            children: [
              {
                type: 'element',
                tagName: 'source',
                properties: { srcSet: webpSrc, type: 'image/webp' },
                children: [],
              },
              node,
            ],
          };
          parent.children[index] = picture;
        }
      }
    });

    // Set intrinsic width/height so the browser reserves space (prevents CLS)
    for (const node of images) {
      const src = String(node.properties?.src || '');
      if (src.startsWith('/')) {
        const dims = await getImageDimensions(src);
        if (dims && node.properties) {
          node.properties.width = dims.width;
          node.properties.height = dims.height;
        }
      }
    }
  };
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
      .use(rehypeLazyImages)
      .use(rehypeStringify)
      .process(content);

    const contentHtml = processedContent.toString();

    const rawDescription: string = data.description ? String(data.description).trim() : '';
    const rawTags: string[] = Array.isArray(data.tags)
      ? (data.tags as unknown[]).filter((t): t is string => typeof t === 'string')
      : [];
    const description: string = isTrivialDescription(rawDescription, data.title || '')
      ? (extractDescriptionFromContent(content) || rawDescription)
      : rawDescription;
    const tags: string[] = rawTags.length > 0 ? rawTags : inferTagsFromContent(content);

    const article = {
      slug,
      title: data.title || '',
      date: data.date || '',
      type: data.type || 'Article',
      description,
      tags,
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
    let text = match[3];
    let prev;
    do {
      prev = text;
      text = text.replace(/<[^>]*>/g, '');
    } while (text !== prev);
    const idMatch = attrs.match(/\sid="([^"]+)"/);
    const id = idMatch?.[1] || text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    toc.push({ level, text, id });
  }

  return toc;
}
