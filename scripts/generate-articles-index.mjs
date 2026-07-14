import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import {
  extractDescriptionFromContent,
  inferTagsFromContent,
  isTrivialDescription,
} from './lib/extract-frontmatter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const articlesDir = path.join(root, 'src', 'content', 'articles');
const indexPath = path.join(root, 'src', 'data', 'articles-index.json');

function calculateReadingTime(content) {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.ceil(words / 200);
}

// Auto-generated articles sometimes carry raw LaTeX (e.g. $\mathbf{z}) inside
// double-quoted frontmatter values; YAML only allows a fixed set of \-escapes
// there, so js-yaml throws and kills the build. Re-serialize each double-quoted
// scalar treating its contents as literal text. Returns null if nothing changed.
function repairFrontmatter(raw) {
  const m = raw.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!m) return null;
  const body = m[2];
  const fixed = body
    .split(/\r?\n/)
    .map((line) => {
      const kv = line.match(/^(\s*[\w-]+:\s*)"(.*)"(\s*)$/);
      if (!kv) return line;
      const literal = kv[2].replace(/\\(["\\])/g, '$1');
      return kv[1] + JSON.stringify(literal) + kv[3];
    })
    .join('\n');
  if (fixed === body) return null;
  return raw.slice(0, m[1].length) + fixed + raw.slice(m[1].length + body.length);
}

function parseArticle(file, raw) {
  try {
    return { raw, parsed: matter(raw) };
  } catch (err) {
    const repaired = repairFrontmatter(raw);
    if (repaired !== null) {
      try {
        const parsed = matter(repaired);
        console.warn(`⚠ Repaired invalid frontmatter escapes in ${file}`);
        fs.writeFileSync(path.join(articlesDir, file), repaired, 'utf8');
        return { raw: repaired, parsed };
      } catch {
        // fall through to the original error
      }
    }
    throw new Error(`Invalid frontmatter in ${file}: ${err.message}`);
  }
}

// Load existing index so curated descriptions are preserved when frontmatter
// only has a placeholder (e.g. "AI Security Digest — April 22, 2026"). When no
// curated description exists either, fall back to auto-extraction from the
// article body — daily LLM-generated digests ship with title=description, so
// without this they would land in the index as thin pages and Google would
// flag them as "Crawled - currently not indexed".
const existingIndex = fs.existsSync(indexPath)
  ? JSON.parse(fs.readFileSync(indexPath, 'utf8'))
  : [];
const existingBySlug = Object.fromEntries(existingIndex.map((a) => [a.slug, a]));

const files = fs.readdirSync(articlesDir).filter((f) => f.endsWith('.md'));

const articles = files
  .map((file) => {
    const slug = file.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(articlesDir, file), 'utf8');
    const { data, content } = parseArticle(file, raw).parsed;

    if (!data.title || !data.date) return null;

    const fmDescription = data.description ? String(data.description).trim() : '';
    const fmTags = Array.isArray(data.tags) ? data.tags : [];
    const existing = existingBySlug[slug];

    let description = fmDescription;
    if (isTrivialDescription(fmDescription, data.title)) {
      description = existing?.description && !isTrivialDescription(existing.description, data.title)
        ? existing.description
        : (extractDescriptionFromContent(content) || fmDescription);
    }

    let tags = fmTags;
    if (tags.length === 0) {
      tags = existing?.tags && existing.tags.length > 0
        ? existing.tags
        : inferTagsFromContent(content);
    }

    return {
      slug,
      title: String(data.title),
      date: String(data.date),
      type: String(data.type || 'Article'),
      description,
      tags,
      readingTime: typeof data.readingTime === 'number'
        ? data.readingTime
        : calculateReadingTime(content),
    };
  })
  .filter(Boolean)
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

fs.writeFileSync(indexPath, JSON.stringify(articles, null, 2) + '\n', 'utf8');
console.log(`Generated articles-index.json: ${articles.length} articles`);
