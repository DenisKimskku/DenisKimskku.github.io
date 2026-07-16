#!/usr/bin/env node
/**
 * check-external-links.mjs — dead-link checker for recent articles.
 *
 * Scans src/content/articles/*.md whose frontmatter `date` falls within the
 * last LINK_CHECK_DAYS days (default 10), extracts absolute http(s) URLs from
 * the body, and probes each one (HEAD, falling back to GET where servers
 * reject HEAD).
 *
 * Classification:
 *   - FAILURE: DNS/connection errors and HTTP >= 400 after retries
 *   - WARNING: 403 / 429 (bot-blocking or rate-limiting; arXiv and
 *     Cloudflare-fronted sites do this to CI traffic — not proof of a dead link)
 *
 * Modes:
 *   node scripts/check-external-links.mjs            # local: exit 1 on failures
 *   node scripts/check-external-links.mjs --report   # CI: always exit 0; writes
 *                                                    # link-failures.md when
 *                                                    # failures exist so the
 *                                                    # workflow can decide
 *
 * Zero dependencies beyond Node 18+ built-ins (global fetch).
 */

import { readdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ARTICLES_DIR = path.join(process.cwd(), 'src', 'content', 'articles');
const REPORT_FILE = path.join(process.cwd(), 'link-failures.md');
const REPORT_MODE = process.argv.includes('--report');

const DAYS = clampInt(process.env.LINK_CHECK_DAYS, 10, 1, 365);
const MAX_URLS = clampInt(process.env.LINK_CHECK_MAX_URLS, 80, 1, 1000);
const CONCURRENCY = 8;
const TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 2_000;

// A browser-ish UA reduces reflexive 403s from CDNs; genuine bot-blockers
// that still 403 are downgraded to warnings anyway.
const USER_AGENT =
  'Mozilla/5.0 (compatible; deniskim1.com-link-check/1.0; +https://deniskim1.com)';

// Internal / non-checkable hosts: our own site, loopback, reserved TLDs
// (RFC 2606 / 6762 / 8375), and example domains. Security articles often
// quote illustrative attacker URLs on these — they are not real pages.
const EXCLUDED_HOST_RE =
  /(^|\.)deniskim1\.com$|^localhost$|^127\.0\.0\.1$|^0\.0\.0\.0$|^\[?::1\]?$|\.(?:internal|local|test|invalid|example|localhost|home\.arpa|onion)$|(^|\.)example\.(?:com|org|net)$/i;

function clampInt(raw, fallback, min, max) {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse the frontmatter `date:` line with a simple regex — no deps. */
function frontmatterDate(source) {
  const fm = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const m = fm[1].match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})["']?\s*$/m);
  return m ? m[1] : null;
}

/** Body = everything after the closing frontmatter fence. */
function bodyOf(source) {
  const m = source.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return m ? source.slice(m[0].length) : source;
}

/** Extract absolute http(s) URLs, cleaned of trailing punctuation. */
function extractUrls(body) {
  const urls = new Set();
  // ')' is allowed in the match so parenthesized paths (Wikipedia-style
  // /wiki/Foo_(bar)) survive; unbalanced trailing ')' from markdown link
  // syntax is stripped by the balance repair below.
  for (const raw of body.match(/https?:\/\/[^\s<>"'`\\\]}]+/g) ?? []) {
    // Strip trailing punctuation that belongs to prose, not the URL.
    let cleaned = raw.replace(/[.,;:!?*_~]+$/, '');
    // Balanced-paren repair: drop trailing ')' while there are more ')' than
    // '(' — that closing paren belongs to the markdown link, not the URL.
    while (
      cleaned.endsWith(')') &&
      (cleaned.match(/\)/g) ?? []).length > (cleaned.match(/\(/g) ?? []).length
    ) {
      cleaned = cleaned.slice(0, -1).replace(/[.,;:!?*_~]+$/, '');
    }
    let parsed;
    try {
      parsed = new URL(cleaned);
    } catch {
      continue;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
    if (EXCLUDED_HOST_RE.test(parsed.hostname)) continue;
    // Dotless hostnames (http://evil/..., http://intranet/...) are never
    // publicly resolvable pages.
    if (!parsed.hostname.includes('.')) continue;
    urls.add(cleaned);
  }
  return urls;
}

async function collectRecentArticleUrls() {
  const cutoff = Date.now() - DAYS * 24 * 60 * 60 * 1000;
  const urlToArticles = new Map(); // url -> Set of article filenames
  let scanned = 0;

  const entries = (await readdir(ARTICLES_DIR)).filter((f) => f.endsWith('.md'));
  for (const file of entries) {
    const source = await readFile(path.join(ARTICLES_DIR, file), 'utf8');
    const date = frontmatterDate(source);
    if (!date || Date.parse(`${date}T00:00:00Z`) < cutoff) continue;
    scanned += 1;
    for (const url of extractUrls(bodyOf(source))) {
      if (!urlToArticles.has(url)) urlToArticles.set(url, new Set());
      urlToArticles.get(url).add(file);
    }
  }
  return { urlToArticles, scanned };
}

/** One HTTP attempt. Returns { status } or throws on network error/timeout. */
async function attempt(url, method) {
  const res = await fetch(url, {
    method,
    redirect: 'follow', // undici follows redirect chains for us
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      'user-agent': USER_AGENT,
      accept: '*/*',
    },
  });
  // Drain/cancel the body so sockets are released promptly.
  try {
    await res.body?.cancel();
  } catch {
    /* ignore */
  }
  return { status: res.status };
}

/**
 * Check one URL. Returns { url, ok, warning, failure, detail }.
 * Strategy: HEAD → on 405/403/501 retry as GET (many servers reject HEAD)
 *           → on network error retry once (as GET) after 2s.
 */
async function checkUrl(url) {
  let status = null;
  let lastError = null;

  try {
    ({ status } = await attempt(url, 'HEAD'));
    if ([405, 403, 501].includes(status)) {
      ({ status } = await attempt(url, 'GET'));
    }
  } catch (err) {
    lastError = err;
    await sleep(RETRY_DELAY_MS);
    try {
      ({ status } = await attempt(url, 'GET'));
      lastError = null;
    } catch (err2) {
      lastError = err2;
    }
  }

  if (lastError) {
    const cause = lastError.cause?.code ?? lastError.name ?? 'network error';
    return { url, ok: false, warning: false, failure: true, detail: String(cause) };
  }
  if (status === 403 || status === 429) {
    return {
      url,
      ok: false,
      warning: true,
      failure: false,
      detail: `HTTP ${status} (likely bot-blocking)`,
    };
  }
  if (status >= 400) {
    return { url, ok: false, warning: false, failure: true, detail: `HTTP ${status}` };
  }
  return { url, ok: true, warning: false, failure: false, detail: `HTTP ${status}` };
}

/** Simple worker pool. */
async function checkAll(urls) {
  const queue = [...urls];
  const results = [];
  async function worker() {
    for (;;) {
      const url = queue.shift();
      if (!url) return;
      results.push(await checkUrl(url));
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker)
  );
  return results;
}

function articleList(urlToArticles, url) {
  return [...(urlToArticles.get(url) ?? [])].join(', ');
}

async function main() {
  const { urlToArticles, scanned } = await collectRecentArticleUrls();
  const allUrls = [...urlToArticles.keys()];
  const truncated = allUrls.length > MAX_URLS;
  const urls = allUrls.slice(0, MAX_URLS);

  console.log(
    `Scanning ${scanned} article(s) from the last ${DAYS} day(s): ` +
      `${allUrls.length} unique external URL(s)` +
      (truncated ? ` (truncated to first ${MAX_URLS})` : '')
  );

  const results = await checkAll(urls);
  const failures = results.filter((r) => r.failure);
  const warnings = results.filter((r) => r.warning);
  const okCount = results.filter((r) => r.ok).length;

  console.log('');
  for (const r of warnings) {
    console.log(`WARN  ${r.url} — ${r.detail} [${articleList(urlToArticles, r.url)}]`);
  }
  for (const r of failures) {
    console.log(`FAIL  ${r.url} — ${r.detail} [${articleList(urlToArticles, r.url)}]`);
  }
  console.log('');
  console.log(
    `Checked ${results.length} URL(s): ${okCount} ok, ` +
      `${warnings.length} warning(s), ${failures.length} failure(s).`
  );
  if (truncated) {
    console.log(
      `Note: ${allUrls.length - MAX_URLS} URL(s) skipped by the ${MAX_URLS}-URL cap ` +
        '(raise LINK_CHECK_MAX_URLS to cover them).'
    );
  }

  if (REPORT_MODE) {
    // Workflow mode: never fail the step; write the report only when there
    // are failures so the workflow can gate on the file's existence.
    await rm(REPORT_FILE, { force: true });
    if (failures.length > 0) {
      const lines = [
        `Dead external links found in articles from the last ${DAYS} day(s).`,
        '',
        ...failures.map(
          (r) => `- ${r.url} — ${r.detail} (in: ${articleList(urlToArticles, r.url)})`
        ),
      ];
      if (warnings.length > 0) {
        lines.push(
          '',
          `${warnings.length} additional URL(s) returned 403/429 (likely bot-blocking; not counted as failures).`
        );
      }
      lines.push(
        '',
        `_Checked ${results.length} of ${allUrls.length} unique URL(s)${truncated ? ' (truncated)' : ''}._`
      );
      await writeFile(REPORT_FILE, lines.join('\n') + '\n', 'utf8');
      console.log(`Wrote ${failures.length} failure(s) to ${REPORT_FILE}`);
    } else {
      console.log('No failures; no report file written.');
    }
    return;
  }

  if (failures.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  // An infrastructure crash (missing dir, fetch regression) is a step failure
  // even in --report mode — exiting 0 here would leave the weekly workflow
  // permanently green with no report and no issue. Only LINK failures get the
  // always-green --report treatment (handled inside main()).
  console.error(err);
  process.exit(1);
});
