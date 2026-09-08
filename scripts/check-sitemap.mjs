#!/usr/bin/env node
// Sitemap <-> export consistency gate. Runs after next build (and after the
// redirect stubs are written) and exits non-zero when:
//   * a sitemap <loc> is not on the canonical host, lacks a trailing slash, is
//     listed twice, has no out/<path>/index.html, or maps to a page that
//     carries a robots noindex meta (submitting noindex URLs sends Google
//     mixed signals - see the NOINDEX_TYPES notes in src/app/sitemap.ts);
//   * an indexable HTML page in out/ is missing from the sitemap and is not on
//     the INTENTIONAL_OMISSIONS allowlist below.
// Redirect stubs (scripts/generate-redirects.mjs) and noindex pages are not
// sitemap material and are skipped when auditing the export.
//
// Usage: node scripts/check-sitemap.mjs [outDir]   (default: ./out)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isRedirectStub } from './generate-redirects.mjs';

export const SITE_URL = 'https://deniskim1.com';

// Pages that exist in the export but are deliberately not submitted.
export const INTENTIONAL_OMISSIONS = [
  '/ctf/', // interactive app, not indexable content (see scripts/warm-cache.mjs)
  '/404/', // Next's static 404 (also noindex)
  '/_not-found/', // Next's internal not-found route
];

// Directories under out/ that never contain pages.
const SKIPPED_DIRS = new Set(['_next']);

export function parseSitemapLocs(xml) {
  const locs = [];
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/g;
  let match;
  while ((match = re.exec(xml))) {
    locs.push(match[1].replaceAll('&amp;', '&').replaceAll('&apos;', "'").replaceAll('&quot;', '"'));
  }
  return locs;
}

export function hasNoindex(html) {
  return /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html)
    || /<meta\s+content=["'][^"']*noindex[^"']*["']\s+name=["']robots["']/i.test(html);
}

// Every index.html under outDir as { sitePath, file }.
export function listHtmlPages(outDir) {
  const pages = [];
  const walk = (dir, rel) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIPPED_DIRS.has(entry.name)) continue;
        walk(path.join(dir, entry.name), `${rel}${entry.name}/`);
      } else if (entry.name === 'index.html') {
        pages.push({ sitePath: rel, file: path.join(dir, entry.name) });
      }
    }
  };
  walk(outDir, '/');
  return pages.sort((a, b) => a.sitePath.localeCompare(b.sitePath));
}

// Pure audit. `pages` is [{ sitePath, html }].
export function auditSitemap({ locs, pages, siteUrl = SITE_URL, allowlist = INTENTIONAL_OMISSIONS }) {
  const errors = [];
  const pageByPath = new Map(pages.map((page) => [page.sitePath, page]));
  const seen = new Set();
  const sitemapPaths = new Set();

  for (const loc of locs) {
    if (seen.has(loc)) {
      errors.push(`sitemap lists ${loc} more than once`);
      continue;
    }
    seen.add(loc);
    if (!loc.startsWith(`${siteUrl}/`)) {
      errors.push(`sitemap <loc> is not on ${siteUrl}: ${loc}`);
      continue;
    }
    const sitePath = loc.slice(siteUrl.length);
    if (!sitePath.endsWith('/')) {
      errors.push(`sitemap <loc> lacks a trailing slash: ${loc}`);
      continue;
    }
    if (/[?#]/.test(sitePath) || sitePath.includes('//')) {
      errors.push(`sitemap <loc> is not a clean directory URL: ${loc}`);
      continue;
    }
    sitemapPaths.add(sitePath);
    const page = pageByPath.get(sitePath);
    if (!page) {
      errors.push(`sitemap <loc> has no index.html in the export: ${loc}`);
      continue;
    }
    if (isRedirectStub(page.html)) {
      errors.push(`sitemap <loc> is a redirect stub: ${loc}`);
      continue;
    }
    if (hasNoindex(page.html)) {
      errors.push(`sitemap <loc> is noindex: ${loc}`);
    }
  }

  let indexable = 0;
  let noindex = 0;
  let stubs = 0;
  for (const page of pages) {
    if (isRedirectStub(page.html)) {
      stubs += 1;
      continue;
    }
    if (hasNoindex(page.html)) {
      noindex += 1;
      continue;
    }
    indexable += 1;
    if (!sitemapPaths.has(page.sitePath) && !allowlist.includes(page.sitePath)) {
      errors.push(`indexable page missing from sitemap: ${page.sitePath}`);
    }
  }

  return {
    errors,
    stats: { locs: locs.length, pages: pages.length, indexable, noindex, stubs },
  };
}

function main() {
  const outDir = path.resolve(process.argv[2] || 'out');
  const sitemapFile = path.join(outDir, 'sitemap.xml');
  if (!fs.existsSync(sitemapFile)) {
    console.error(`check-sitemap: ${sitemapFile} not found - run next build first`);
    process.exit(1);
  }

  const locs = parseSitemapLocs(fs.readFileSync(sitemapFile, 'utf8'));
  const pages = listHtmlPages(outDir).map((page) => ({
    sitePath: page.sitePath,
    html: fs.readFileSync(page.file, 'utf8'),
  }));
  const { errors, stats } = auditSitemap({ locs, pages });

  const summary = `${stats.locs} sitemap URLs; ${stats.pages} pages in export (${stats.indexable} indexable, ${stats.noindex} noindex, ${stats.stubs} redirect stubs)`;
  if (errors.length > 0) {
    for (const error of errors) console.error(`check-sitemap: ${error}`);
    console.error(`check-sitemap: FAILED with ${errors.length} problem(s) - ${summary}`);
    process.exit(1);
  }
  console.log(`check-sitemap: OK - ${summary}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
