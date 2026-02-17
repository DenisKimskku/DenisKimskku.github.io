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

if (!fs.existsSync(outDir) || !fs.existsSync(articlesIndexPath)) {
  process.exit(0);
}

const articles = JSON.parse(fs.readFileSync(articlesIndexPath, 'utf8'))
  .filter((article) => article.slug && article.title && article.date)
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const latestPubDate = articles.length > 0 ? toRfc822(articles[0].date) : new Date().toUTCString();

const itemXml = articles.map((article) => {
  const articleUrl = `${siteUrl}/writing/${article.slug}`;
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

const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Minseok (Denis) Kim - Writing</title>
<link>${siteUrl}/writing</link>
<description>Research articles and technical writings by Minseok (Denis) Kim.</description>
<language>en-US</language>
<lastBuildDate>${latestPubDate}</lastBuildDate>
<atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
${itemXml}
</channel>
</rss>
`;

fs.writeFileSync(path.join(outDir, 'rss.xml'), rssXml, 'utf8');
