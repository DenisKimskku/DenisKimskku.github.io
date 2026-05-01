import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const articlesDir = path.join(root, 'src', 'content', 'articles');
const indexPath = path.join(root, 'src', 'data', 'articles-index.json');

function calculateReadingTime(content) {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.ceil(words / 200);
}

// Treat a frontmatter description as trivial if it's just the article title
// or too short to carry useful information for search snippets.
function isTrivialDescription(description, title) {
  if (!description) return true;
  const normalized = description.trim();
  return normalized === title.trim() || normalized.length < 60;
}

// Load existing index so curated descriptions are preserved when frontmatter
// only has a placeholder (e.g. "AI Security Digest — April 22, 2026").
const existingIndex = fs.existsSync(indexPath)
  ? JSON.parse(fs.readFileSync(indexPath, 'utf8'))
  : [];
const existingBySlug = Object.fromEntries(existingIndex.map((a) => [a.slug, a]));

const files = fs.readdirSync(articlesDir).filter((f) => f.endsWith('.md'));

const articles = files
  .map((file) => {
    const slug = file.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(articlesDir, file), 'utf8');
    const { data, content } = matter(raw);

    if (!data.title || !data.date) return null;

    const fmDescription = data.description ? String(data.description).trim() : '';
    const existing = existingBySlug[slug];
    const description = isTrivialDescription(fmDescription, data.title)
      ? (existing?.description ?? fmDescription)
      : fmDescription;

    return {
      slug,
      title: String(data.title),
      date: String(data.date),
      type: String(data.type || 'Article'),
      description,
      tags: Array.isArray(data.tags) ? data.tags : [],
      readingTime: typeof data.readingTime === 'number'
        ? data.readingTime
        : calculateReadingTime(content),
    };
  })
  .filter(Boolean)
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

fs.writeFileSync(indexPath, JSON.stringify(articles, null, 2) + '\n', 'utf8');
console.log(`Generated articles-index.json: ${articles.length} articles`);
