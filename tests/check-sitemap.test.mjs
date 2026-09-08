import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditSitemap, hasNoindex, parseSitemapLocs } from '../scripts/check-sitemap.mjs';
import { renderStub } from '../scripts/generate-redirects.mjs';

const SITE = 'https://deniskim1.com';
const page = (sitePath, html = '<html><head></head><body>ok</body></html>') => ({ sitePath, html });
const noindexPage = (sitePath) => page(sitePath, '<html><head><meta name="robots" content="noindex, follow"/></head></html>');

test('parseSitemapLocs extracts and unescapes every <loc>', () => {
  const xml = `<?xml version="1.0"?><urlset><url><loc>${SITE}/</loc></url>
<url><loc> ${SITE}/writing/a&amp;b/ </loc><lastmod>2026-01-01</lastmod></url></urlset>`;
  assert.deepEqual(parseSitemapLocs(xml), [`${SITE}/`, `${SITE}/writing/a&b/`]);
});

test('hasNoindex detects Next-style robots metas in either attribute order', () => {
  assert.ok(hasNoindex('<meta name="robots" content="noindex"/>'));
  assert.ok(hasNoindex('<meta name="robots" content="noindex, follow"/>'));
  assert.ok(hasNoindex('<meta content="noindex" name="robots">'));
  assert.ok(!hasNoindex('<meta name="robots" content="index, follow"/>'));
  assert.ok(!hasNoindex('<meta name="googlebot" content="index"/>'));
});

test('a consistent sitemap and export pass', () => {
  const { errors, stats } = auditSitemap({
    locs: [`${SITE}/`, `${SITE}/writing/`, `${SITE}/writing/a/`],
    pages: [
      page('/'), page('/writing/'), page('/writing/a/'),
      noindexPage('/writing/paper-review/'),
      page('/ctf/'),
      page('/writing/tag/old/', renderStub('/writing/tag/old/', '/writing/')),
    ],
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(stats, { locs: 3, pages: 6, indexable: 4, noindex: 1, stubs: 1 });
});

test('sitemap problems are reported individually', () => {
  const { errors } = auditSitemap({
    locs: [
      `${SITE}/writing/no-slash`,
      `${SITE}/writing/missing/`,
      `${SITE}/writing/paper-review/`,
      `${SITE}/writing/tag/old/`,
      'https://www.deniskim1.com/writing/',
      `${SITE}/`,
      `${SITE}/`,
    ],
    pages: [
      page('/'),
      noindexPage('/writing/paper-review/'),
      page('/writing/tag/old/', renderStub('/writing/tag/old/', '/')),
    ],
  });
  assert.ok(errors.some((e) => e.includes('lacks a trailing slash') && e.includes('/writing/no-slash')));
  assert.ok(errors.some((e) => e.includes('no index.html') && e.includes('/writing/missing/')));
  assert.ok(errors.some((e) => e.includes('is noindex') && e.includes('/writing/paper-review/')));
  assert.ok(errors.some((e) => e.includes('redirect stub') && e.includes('/writing/tag/old/')));
  assert.ok(errors.some((e) => e.includes('not on https://deniskim1.com') && e.includes('www.')));
  assert.ok(errors.some((e) => e.includes('more than once')));
  assert.equal(errors.length, 6);
});

test('indexable pages missing from the sitemap fail unless allowlisted', () => {
  const { errors } = auditSitemap({
    locs: [`${SITE}/`],
    pages: [page('/'), page('/writing/orphan/'), page('/ctf/')],
  });
  assert.deepEqual(errors, ['indexable page missing from sitemap: /writing/orphan/']);

  const allowlisted = auditSitemap({
    locs: [`${SITE}/`],
    pages: [page('/'), page('/writing/orphan/')],
    allowlist: ['/writing/orphan/'],
  });
  assert.deepEqual(allowlisted.errors, []);
});
