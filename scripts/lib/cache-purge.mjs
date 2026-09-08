// Shared, side-effect-free helpers for scripts/purge-cloudflare-cache.mjs and
// the purge-target ordering in scripts/warm-cache.mjs. Exercised by
// tests/cache-purge.test.mjs.
//
// Documented limits (https://developers.cloudflare.com/cache/how-to/purge-cache/,
// "Single-file purge limits" / "Token bucket rate limiting", read 2026-09-08):
//   Free/Pro/Business: max 100 URLs per purge request (Enterprise 500),
//   Free: 5 requests per minute with a bucket of 25 tokens (Pro 5/s, Business 10/s).
// So ~1,400 URLs => 14 requests fit inside one Free-plan bucket; anything past
// 25 requests waits ~12 s per extra request. 429s therefore need a real
// backoff, not a 1-5 s retry.

export const MAX_URLS_PER_REQUEST = 100;
export const FREE_PLAN_BUCKET_SIZE = 25;
export const FREE_PLAN_REQUESTS_PER_MINUTE = 5;
export const MAX_RETRY_DELAY_MS = 65000;

export function chunk(items, size = MAX_URLS_PER_REQUEST) {
  if (!Number.isInteger(size) || size <= 0 || size > MAX_URLS_PER_REQUEST) {
    throw new Error(`chunk size must be 1..${MAX_URLS_PER_REQUEST}, got ${size}`);
  }

  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

export function isRetryableStatus(statusCode) {
  return statusCode === 429 || statusCode >= 500 || statusCode === 0;
}

// Honour Retry-After when Cloudflare sends one (seconds or HTTP-date);
// otherwise exponential backoff 2s, 4s, 8s, ... capped at MAX_RETRY_DELAY_MS —
// long enough to outlast a drained Free-plan bucket (12 s per token).
export function computeRetryDelayMs(attempt, retryAfterHeader, now = Date.now()) {
  if (retryAfterHeader !== undefined && retryAfterHeader !== null && retryAfterHeader !== '') {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(MAX_RETRY_DELAY_MS * 2, Math.ceil(seconds * 1000));
    }

    const at = Date.parse(String(retryAfterHeader));
    if (!Number.isNaN(at)) {
      return Math.min(MAX_RETRY_DELAY_MS * 2, Math.max(0, at - now));
    }
  }

  return Math.min(MAX_RETRY_DELAY_MS, 2000 * 2 ** Math.max(0, attempt));
}

export function describePurgeError(statusCode, body) {
  let parsed = body;
  if (typeof body === 'string') {
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = null;
    }
  }

  const errors = Array.isArray(parsed?.errors) ? parsed.errors : [];
  const details = errors.map((error) => `${error?.code ?? '?'}: ${error?.message ?? 'unknown error'}`).join('; ');
  if (details) {
    return `HTTP ${statusCode} (${details})`;
  }

  const raw = typeof body === 'string' ? body.slice(0, 300) : JSON.stringify(body ?? '').slice(0, 300);
  return `HTTP ${statusCode}${raw ? `: ${raw}` : ''}`;
}

const TOP_LEVEL_PATHS = new Set(['/', '/writing/', '/news/']);
const SITE_DOCUMENT_RE = /^\/(sitemap\.xml|robots\.txt|rss\.xml|writing\/rss\.xml|news\/rss\.xml|deploy-marker\.txt)$/;

function pathOf(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return String(url);
  }
}

function stripRsc(pathname) {
  return pathname.replace(/(__next\._full\.txt|index\.txt)$/, '');
}

// Purge order == re-warm order for organic traffic: the purge API processes
// batches sequentially and the warm step starts as soon as the purge ends, so
// putting the homepage, listings, feeds and the newest articles (and their
// RSC payloads) first shortens the window in which the most-visited pages
// are cold. Everything not ranked keeps its original relative order.
export function priorityOf(url, newestSlugs = new Set()) {
  const pathname = pathOf(url);
  const page = stripRsc(pathname);
  const isRsc = page !== pathname;

  if (SITE_DOCUMENT_RE.test(pathname)) return 0;
  if (TOP_LEVEL_PATHS.has(page)) return isRsc ? 1.5 : 1;

  const article = page.match(/^\/writing\/([^/]+)\/$/);
  if (article && newestSlugs.has(article[1])) return isRsc ? 2.5 : 2;

  const og = pathname.match(/^\/og\/([^/]+)\.png$/);
  if (og && newestSlugs.has(og[1])) return 3;

  if (/^\/(papers|code|resume|ctf|writing\/archive|writing\/tags?)\//.test(page)) return isRsc ? 4.5 : 4;

  return isRsc ? 9.5 : 9;
}

export function orderPurgeTargets(urls, newestSlugs = []) {
  const newest = new Set(newestSlugs);
  return urls
    .map((url, index) => ({ url, index, priority: priorityOf(url, newest) }))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .map((entry) => entry.url);
}
