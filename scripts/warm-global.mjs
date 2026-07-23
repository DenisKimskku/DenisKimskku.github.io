// Multi-region cache warming via the Globalping API (https://globalping.io).
//
// Cloudflare's cache is per-datacenter and (verified 2026-07-23) Smart Tiered
// Cache does not share warm fills across regions for our anycast GitHub Pages
// origin — so scripts/warm-cache.mjs only ever fills the colos near GitHub's
// US runners. This script closes the gap by asking Globalping's community
// probes in ~10 countries to GET the highest-traffic pages, which populates
// each region's own colo (measured effect: ~250ms cold TTFB -> ~17ms HIT).
//
// Strictly best-effort by design: warming is an optimization, so this script
// ALWAYS exits 0 — quota exhaustion (HTTP 429), API outages, or per-probe
// failures are logged and swallowed. Free-tier quota is per-IP for anonymous
// calls (fresh IP per CI runner) or per-token when GLOBALPING_TOKEN is set.
//
// Scope deliberately small: homepage, listings, RSS, and the newest N
// articles x 10 regions ≈ 120 tests/run. Long-tail pages are left to
// per-colo organic priming (long edge TTL makes one visitor enough).

import fs from 'fs';

const API = 'https://api.globalping.io/v1/measurements';
const BASE_URL = new URL(process.env.CACHE_WARM_BASE_URL || 'https://deniskim1.com');
const ARTICLE_COUNT = Math.max(0, Number(process.env.GLOBAL_WARM_ARTICLES || 8));
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

function apiHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.GLOBALPING_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GLOBALPING_TOKEN}`;
  }
  return headers;
}

function buildPaths() {
  const paths = ['/', '/writing/', '/writing/archive/', '/rss.xml'];

  const index = JSON.parse(fs.readFileSync('src/data/articles-index.json', 'utf8'));
  const newest = index
    .filter((a) => a.date && a.slug)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-ARTICLE_COUNT)
    .reverse();

  for (const article of newest) {
    paths.push(`/writing/${article.slug}/`);
  }

  return paths;
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
      request: { method: 'GET', path },
    },
  };

  const res = await fetch(API, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    console.warn(`[global] quota exhausted at ${path} — stopping (warming is best-effort).`);
    return { quotaExhausted: true };
  }

  if (!res.ok) {
    console.warn(`[global] submit failed for ${path}: HTTP ${res.status}`);
    return {};
  }

  const data = await res.json();
  return { id: data.id };
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
  const paths = buildPaths();
  console.log(`[global] warming ${paths.length} paths from ${LOCATIONS.length} regions via Globalping`);

  const submitted = [];
  for (const path of paths) {
    const { id, quotaExhausted } = await submit(path);
    if (quotaExhausted) break;
    if (id) submitted.push({ id, path });
  }

  for (const { id, path } of submitted) {
    await collect(id, path);
  }

  console.log(`[global] done: ${submitted.length}/${paths.length} paths dispatched.`);
}

main().catch((error) => {
  // Never fail the job over an optional optimization.
  console.warn(`[global] warming skipped: ${error.message}`);
});
