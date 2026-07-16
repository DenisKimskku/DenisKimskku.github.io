import fs from 'node:fs';
import path from 'node:path';

const siteUrl = 'https://deniskim1.com';
const outDir = path.join(process.cwd(), 'out');
const articlesIndexPath = path.join(process.cwd(), 'src', 'data', 'articles-index.json');

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function toRfc822(dateString) {
  const parsed = new Date(`${dateString}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? new Date().toUTCString() : parsed.toUTCString();
}

// Full-content items for the newest N main-feed entries. 80 full bodies would
// make the feed multi-MB, so older items stay description-only.
const FULL_CONTENT_ITEMS = 20;

// Extract the rendered article body from the static export. Returns null when
// the page is missing — the item then falls back to description-only; never
// fail the build over a feed nicety.
function extractArticleHtml(slug) {
  try {
    const html = fs.readFileSync(path.join(outDir, 'writing', slug, 'index.html'), 'utf8');
    const start = html.indexOf('<article class="article-content"');
    if (start === -1) return null;
    const contentStart = html.indexOf('>', start);
    const end = html.indexOf('</article>', contentStart);
    if (contentStart === -1 || end === -1) return null;
    let content = html.slice(contentStart + 1, end);
    // Feed readers need absolute URLs. Site-relative href/src/srcset all start
    // with a single "/" (the srcset values here are single-URL webp sources).
    content = content
      .replaceAll('href="/', `href="${siteUrl}/`)
      .replaceAll('src="/', `src="${siteUrl}/`)
      .replaceAll('srcset="/', `srcset="${siteUrl}/`)
      .replaceAll('srcSet="/', `srcSet="${siteUrl}/`);
    return content;
  } catch {
    return null;
  }
}

// "]]>" inside CDATA would terminate the section early; split it across two
// CDATA blocks (the standard escape).
function toCdata(content) {
  return `<![CDATA[${content.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;
}

if (!fs.existsSync(outDir) || !fs.existsSync(articlesIndexPath)) {
  process.exit(0);
}

const articles = JSON.parse(fs.readFileSync(articlesIndexPath, 'utf8'))
  .filter((article) => article.slug && article.title && article.date)
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

// Keep the main feed aligned with the sitemap: noindexed types stay out of both
// (matches NOINDEX_TYPES in src/app/sitemap.ts).
const NOINDEX_TYPES = ['Paper Review'];
const feedArticles = articles.filter((article) => !NOINDEX_TYPES.includes(article.type));

const latestPubDate = feedArticles.length > 0 ? toRfc822(feedArticles[0].date) : new Date().toUTCString();

const itemXml = feedArticles.map((article, index) => {
  const articleUrl = `${siteUrl}/writing/${article.slug}/`;
  const categories = (article.tags || [])
    .map((tag) => `<category>${escapeXml(tag)}</category>`)
    .join('');
  const fullHtml = index < FULL_CONTENT_ITEMS ? extractArticleHtml(article.slug) : null;
  const contentEncoded = fullHtml ? `\n<content:encoded>${toCdata(fullHtml)}</content:encoded>` : '';

  return `<item>
<title>${escapeXml(article.title)}</title>
<link>${articleUrl}</link>
<guid>${articleUrl}</guid>
<description>${escapeXml(article.description || '')}</description>${contentEncoded}
<pubDate>${toRfc822(article.date)}</pubDate>
${categories}
</item>`;
}).join('\n');

const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>Minseok (Denis) Kim - Writing</title>
<link>${siteUrl}/writing/</link>
<description>Research articles and technical writings by Minseok (Denis) Kim.</description>
<language>en-US</language>
<lastBuildDate>${latestPubDate}</lastBuildDate>
<atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
${itemXml}
</channel>
</rss>
`;

fs.writeFileSync(path.join(outDir, 'rss.xml'), rssXml, 'utf8');

// Generate /news RSS feed (News Digest + Paper Review only)
const newsTypes = ['News Digest', 'Paper Review'];
const newsArticles = articles.filter((a) => newsTypes.includes(a.type));

if (newsArticles.length > 0) {
  const newsLatestPubDate = toRfc822(newsArticles[0].date);
  const newsItemXml = newsArticles.map((article) => {
    const articleUrl = `${siteUrl}/writing/${article.slug}/`;
    const categories = (article.tags || [])
      .map((tag) => `<category>${escapeXml(tag)}</category>`)
      .join('');
    return `<item>
<title>${escapeXml(article.title)}</title>
<link>${articleUrl}</link>
<guid>${articleUrl}</guid>
<description>${escapeXml(article.description || '')}</description>
<pubDate>${toRfc822(article.date)}</pubDate>
${categories}
</item>`;
  }).join('\n');

  const newsRssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>AI Security News - deniskim1.com</title>
<link>${siteUrl}/news/</link>
<description>Daily AI security intelligence — automated news digests, paper reviews, and emerging threat analysis.</description>
<language>en-US</language>
<lastBuildDate>${newsLatestPubDate}</lastBuildDate>
<atom:link href="${siteUrl}/news/rss.xml" rel="self" type="application/rss+xml" />
${newsItemXml}
</channel>
</rss>
`;

  const newsOutDir = path.join(outDir, 'news');
  if (!fs.existsSync(newsOutDir)) fs.mkdirSync(newsOutDir, { recursive: true });
  fs.writeFileSync(path.join(newsOutDir, 'rss.xml'), newsRssXml, 'utf8');
}
