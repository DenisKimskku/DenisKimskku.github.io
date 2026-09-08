// Multi-region cache warming via the Globalping API (https://globalping.io).
//
// Cloudflare's cache is per data center. Local warming (scripts/warm-cache.mjs)
// runs from a GitHub runner in the US, so it only ever fills the colo that
// runner happens to hit; measured 2026-09-08 from California, pages the runner
// had warmed were still MISS in SJC/LAX, and probes in FRA/LHR/NRT saw MISS on
// the homepage nine hours after a deploy. This script asks Globalping's
// community probes in ~10 countries to GET the highest-value URLs so each
// region's own colo is filled (measured effect: MISS TTFB 140-480 ms in
// FRA/NRT/SIN -> HIT 14-50 ms).
//
// Coverage per page = HTML + its RSC payload (index.txt, fetched on client-
// side navigation) + its /og/ card (fetched by social unfurlers) for the
// newest posts. Smart Tiered Cache (enabled by scripts/ensure-cloudflare-
// cache-config.mjs) turns the remaining lower-tier misses into upper-tier
// hits instead of origin fetches, but never makes a lower tier a HIT by
// itself — hence this script still matters.
//
// Quota (https://api.globalping.io/v1/spec.yaml, "Limits and credits",
// read 2026-09-08): unauthenticated 250 free tests per hour per IP with at
// most 50 probes per measurement; authenticated (GLOBALPING_TOKEN) 500 free
// tests per hour, extra tests cost credits. One probe == one test, so a
// 10-location measurement costs 10 tests. GLOBAL_WARM_BUDGET caps the tests
// one run may spend (defaults leave headroom for a deploy and a keep-warm
// run landing in the same hour), and the x-ratelimit-remaining header is
// honoured so a 429 is never provoked.
//
// Strictly best-effort by design: warming is an optimization, so this script
// ALWAYS exits 0 — quota exhaustion, API outages, or per-probe failures are
// logged and swallowed.

import fs from 'fs';

const API = 'https://api.globalping.io/v1/measurements';
const BASE_URL = new URL(process.env.CACHE_WARM_BASE_URL || 'https://deniskim1.com');
const ARTICLE_COUNT = Math.max(0, Number(process.env.GLOBAL_WARM_ARTICLES ?? 8));
const RSC_ARTICLE_COUNT = Math.max(0, Number(process.env.GLOBAL_WARM_RSC_ARTICLES ?? 4));
const OG_ARTICLE_COUNT = Math.max(0, Number(process.env.GLOBAL_WARM_OG_ARTICLES ?? 4));
const POLL_TIMEOUT_MS = 60000;
const POLL_INTERVAL_MS = 4000;

// One probe per country, spread across continents. Order is irrelevant.
const LOCATIONS = [
  { country: 'US' },
  { country: 'BR' },
  { country: 'GB' },
  { country: 'DE' },
  { country: 'ZA' },
  { country: 'IN' },
  { country: 'SG' },
  { country: 'JP' },
  { country: 'KR' },
  { country: 'AU' },
];

const hasToken = Boolean(process.env.GLOBALPING_TOKEN);
const TEST_BUDGET = Math.max(0, Number(process.env.GLOBAL_WARM_BUDGET ?? (hasToken ? 400 : 200)));
const TESTS_PER_PATH = LOCATIONS.length;

// Cloudflare varies the cached object on nothing we send, but bot rules may
// treat the default probe UA differently from a browser; send a browser UA
// so the filled object is the one real visitors get.
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

function apiHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.GLOBALPING_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GLOBALPING_TOKEN}`;
  }
  return headers;
}

function newestSlugs(count) {
  const index = JSON.parse(fs.readFileSync('src/data/articles-index.json', 'utf8'));
  return index
    .filter((a) => a.date && a.slug)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, count)
    .map((a) => a.slug);
}

// Most valuable first: if the budget or the hourly quota runs out, the tail
// (older articles, archive) is what gets dropped.
export function buildPaths({ articles, rscArticles = RSC_ARTICLE_COUNT, ogArticles = OG_ARTICLE_COUNT } = {}) {
  const slugs = articles ?? newestSlugs(ARTICLE_COUNT);
  const paths = ['/', '/writing/', '/index.txt', '/writing/index.txt'];

  slugs.forEach((slug, position) => {
    paths.push(`/writing/${slug}/`);
    if (position < rscArticles) paths.push(`/writing/${slug}/index.txt`);
    if (position < ogArticles) paths.push(`/og/${slug}.png`);
  });

  paths.push('/writing/archive/', '/rss.xml');
  return Array.from(new Set(paths));
}

export function fitToBudget(paths, budget = TEST_BUDGET, testsPerPath = TESTS_PER_PATH) {
  const affordable = Math.max(0, Math.floor(budget / Math.max(1, testsPerPath)));
  return paths.slice(0, affordable);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function submit(path) {
  const body = {
    type: 'http',
    target: BASE_URL.hostname,
    locations: LOCATIONS,
    measurementOptions: {
      protocol: 'HTTPS',
      request: { method: 'GET', path, headers: { 'user-agent': BROWSER_USER_AGENT } },
    },
  };

  const res = await fetch(API, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });

  const remaining = Number(res.headers.get('x-ratelimit-remaining'));

  if (res.status === 429) {
    console.warn(`[global] quota exhausted at ${path} — stopping (warming is best-effort).`);
    return { quotaExhausted: true };
  }

  if (!res.ok) {
    console.warn(`[global] submit failed for ${path}: HTTP ${res.status}`);
    return {};
  }

  const data = await res.json();
  return { id: data.id, remaining: Number.isFinite(remaining) ? remaining : null };
}

async function collect(id, path) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const res = await fetch(`${API}/${id}`, { headers: apiHeaders() });
    if (!res.ok) break;
    const data = await res.json();
    if (data.status === 'finished') {
      const tally = {};
      for (const r of data.results || []) {
        const status = r.result?.headers?.['cf-cache-status'] || (r.result?.statusCode ? `http-${r.result.statusCode}` : 'no-result');
        tally[status] = (tally[status] || 0) + 1;
      }
      const summary = Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(' ');
      console.log(`[global] ${path}: ${summary}`);
      return;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  console.warn(`[global] ${path}: results not ready before timeout (fetches may still complete).`);
}

async function main() {
  const wanted = buildPaths();
  const paths = fitToBudget(wanted);
  if (paths.length < wanted.length) {
    console.log(`[global] budget ${TEST_BUDGET} tests: warming ${paths.length}/${wanted.length} paths (${TESTS_PER_PATH} tests each)`);
  }
  console.log(`[global] warming ${paths.length} paths from ${LOCATIONS.length} regions via Globalping (${hasToken ? 'authenticated' : 'anonymous'})`);

  const submitted = [];
  let lastRemaining = null;
  for (const path of paths) {
    if (lastRemaining !== null && lastRemaining < TESTS_PER_PATH) {
      console.warn(`[global] hourly quota nearly spent (${lastRemaining} tests left) — stopping before ${path}.`);
      break;
    }
    const { id, quotaExhausted, remaining } = await submit(path);
    if (quotaExhausted) break;
    if (id) submitted.push({ id, path });
    if (remaining !== null && remaining !== undefined) lastRemaining = remaining;
  }

  for (const { id, path } of submitted) {
    await collect(id, path);
  }

  console.log(`[global] done: ${submitted.length}/${paths.length} paths dispatched${lastRemaining !== null ? `, ${lastRemaining} tests left this hour` : ''}.`);
}

// Only run when executed directly so tests can import the path builders.
if (process.argv[1] && /warm-global\.mjs$/.test(process.argv[1])) {
  main().catch((error) => {
    // Never fail the job over an optional optimization.
    console.warn(`[global] warming skipped: ${error.message}`);
  });
}
