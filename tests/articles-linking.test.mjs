// Internal-linking helpers in src/lib/articles.ts, exercised against the REAL
// article index so the assertions track the corpus. articles.ts imports
// './articleTypes' without an extension (the Next bundler resolves it), so a
// resolve hook maps extension-less relative specifiers onto the .ts file
// before Node's type stripping loads it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !path.extname(specifier) && context.parentURL) {
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      for (const ext of ['.ts', '.tsx', '.mjs', '.js']) {
        if (fs.existsSync(base + ext)) return nextResolve(pathToFileURL(base + ext).href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// getAllArticles() reads src/data/articles-index.json relative to cwd.
process.chdir(root);
const {
  getAllArticles,
  getRelatedArticles,
  getNewsWeekCluster,
  getLatestNewsDesk,
  getTagEntries,
  getArticlesByTag,
  getTagLandingContent,
  groupArticlesForHub,
  isIndexableArticle,
} = await import('../src/lib/articles.ts');

const DAY_MS = 86_400_000;
const days = (date) => Math.floor(new Date(`${date}T00:00:00Z`).getTime() / DAY_MS);

test('indexable articles never recommend noindexed paper reviews', () => {
  const all = getAllArticles();
  for (const article of all.filter(isIndexableArticle)) {
    for (const related of getRelatedArticles(article.slug, article.tags, 3, all)) {
      assert.ok(isIndexableArticle(related), `${article.slug} -> ${related.slug}`);
    }
  }
});

test('paper reviews may still recommend each other', () => {
  const all = getAllArticles();
  const review = all.find((a) => a.type === 'Paper Review');
  if (!review) return; // content-independent: no reviews in the corpus is fine
  const related = getRelatedArticles(review.slug, review.tags, 3, all);
  assert.ok(related.length > 0);
});

test('getNewsWeekCluster keeps every companion inside a seven-day window and never returns the article itself', () => {
  const all = getAllArticles();
  const news = all.filter((a) => a.type === 'News Digest' || a.type === 'Trend Report');
  for (const issue of news) {
    const { weekly, dailies } = getNewsWeekCluster(issue.slug, all);
    const end = weekly ? days(weekly.date) : days(issue.date);
    assert.ok(!dailies.some((d) => d.slug === issue.slug));
    assert.ok(dailies.every((d) => d.type === 'News Digest'));
    for (const d of dailies) {
      assert.ok(days(d.date) <= end && days(d.date) >= end - 6, `${issue.slug}: ${d.slug} outside window`);
    }
    if (weekly) {
      assert.equal(weekly.type, 'Trend Report');
      assert.notEqual(weekly.slug, issue.slug);
      const distance = days(weekly.date) - days(issue.date);
      assert.ok(distance >= 0 && distance <= 6, `${issue.slug}: weekly ${weekly.slug} is ${distance} days away`);
    }
  }
});

test('getNewsWeekCluster picks the nearest covering weekly for a digest', () => {
  const fixture = [
    { slug: 'w2', title: 'This Week in AI Security — May 17, 2026', date: '2026-05-17', type: 'Trend Report', description: '', tags: [], readingTime: 1 },
    { slug: 'd3', title: 'AI Security Digest — May 12, 2026', date: '2026-05-12', type: 'News Digest', description: '', tags: [], readingTime: 1 },
    { slug: 'd2', title: 'AI Security Digest — May 11, 2026', date: '2026-05-11', type: 'News Digest', description: '', tags: [], readingTime: 1 },
    { slug: 'w1', title: 'This Week in AI Security — May 10, 2026', date: '2026-05-10', type: 'Trend Report', description: '', tags: [], readingTime: 1 },
    { slug: 'd1', title: 'AI Security Digest — May 09, 2026', date: '2026-05-09', type: 'News Digest', description: '', tags: [], readingTime: 1 },
    { slug: 'x', title: 'A walkthrough', date: '2026-05-10', type: 'Paper Walkthrough', description: '', tags: [], readingTime: 1 },
  ];
  assert.deepEqual(
    (({ weekly, dailies }) => ({ weekly: weekly?.slug ?? null, dailies: dailies.map((d) => d.slug) }))(getNewsWeekCluster('d2', fixture)),
    { weekly: 'w2', dailies: ['d3'] },
  );
  assert.deepEqual(
    (({ weekly, dailies }) => ({ weekly: weekly?.slug ?? null, dailies: dailies.map((d) => d.slug) }))(getNewsWeekCluster('d1', fixture)),
    { weekly: 'w1', dailies: [] },
  );
  // A trend report lists the digests of its own week and no weekly.
  assert.deepEqual(
    (({ weekly, dailies }) => ({ weekly, dailies: dailies.map((d) => d.slug) }))(getNewsWeekCluster('w2', fixture)),
    { weekly: null, dailies: ['d3', 'd2'] },
  );
  // Non-news articles get an empty cluster.
  assert.deepEqual(getNewsWeekCluster('x', fixture), { weekly: null, dailies: [] });
  assert.deepEqual(getNewsWeekCluster('missing', fixture), { weekly: null, dailies: [] });
});

test('getLatestNewsDesk returns the newest weekly and the newest dailies', () => {
  const { weekly, dailies } = getLatestNewsDesk(3);
  assert.ok(dailies.length <= 3);
  assert.ok(dailies.every((d) => d.type === 'News Digest'));
  if (weekly) assert.equal(weekly.type, 'Trend Report');
  for (let i = 1; i < dailies.length; i++) assert.ok(dailies[i - 1].date >= dailies[i].date);
});

test('groupArticlesForHub partitions every article exactly once', () => {
  const all = getAllArticles();
  const { handwritten, news, reviews } = groupArticlesForHub(all);
  assert.equal(handwritten.length + news.length + reviews.length, all.length);
  assert.ok(reviews.every((a) => a.type === 'Paper Review'));
  assert.ok(news.every((a) => a.type === 'News Digest' || a.type === 'Trend Report'));
  assert.ok(handwritten.every((a) => !['Paper Review', 'News Digest', 'Trend Report'].includes(a.type)));
});

test('tag landing copy is unique per hub and carries no developer notes', () => {
  const leads = new Set();
  const descriptions = new Set();
  const entries = getTagEntries();
  for (const entry of entries) {
    const articles = getArticlesByTag(entry.name);
    const content = getTagLandingContent(entry.name, articles);
    for (const text of [content.lead, content.body, content.coverage, content.metaDescription, ...content.learnings]) {
      assert.ok(text.length > 0);
      assert.ok(!/internal links|future posts/i.test(text), text);
    }
    assert.ok(content.metaDescription.length >= 60, content.metaDescription);
    assert.ok(content.metaDescription.includes(entry.name));
    assert.ok(content.metaDescription.startsWith(`${entry.count} article`));
    leads.add(content.lead);
    descriptions.add(content.metaDescription);
  }
  assert.equal(leads.size, entries.length, 'every hub gets its own lead');
  assert.equal(descriptions.size, entries.length, 'every hub gets its own meta description');
});

test('tag landing copy handles an empty and a single-article hub', () => {
  const empty = getTagLandingContent('Nothing', []);
  assert.equal(empty.metaDescription, 'Articles on Nothing.');
  assert.equal(empty.relatedTags.length, 0);
  const one = getTagLandingContent('Solo', [
    { slug: 's', title: 'Only Piece', date: '2026-01-05', type: 'Tutorial', description: 'd', tags: ['Solo', 'Privacy'], readingTime: 3 },
  ]);
  assert.equal(one.metaDescription, '1 article on Solo: 1 hand-written piece. Latest: Only Piece.');
  assert.equal(one.coverage, 'Published in January 2026: 1 tutorial.');
  assert.deepEqual(one.relatedTags, ['Privacy']);
  assert.ok(one.lead.includes('"Only Piece" (2026-01-05)'));
});
