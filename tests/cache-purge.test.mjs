import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  FREE_PLAN_BUCKET_SIZE,
  MAX_RETRY_DELAY_MS,
  MAX_URLS_PER_REQUEST,
  chunk,
  computeRetryDelayMs,
  describePurgeError,
  isRetryableStatus,
  orderPurgeTargets,
  priorityOf,
} from '../scripts/lib/cache-purge.mjs';

test('purge batches never exceed the documented 100-URL limit', () => {
  assert.equal(MAX_URLS_PER_REQUEST, 100);
  const urls = Array.from({ length: 1333 }, (_, index) => `https://deniskim1.com/p/${index}/`);
  const batches = chunk(urls);
  assert.equal(batches.length, 14);
  assert.ok(batches.every((batch) => batch.length <= MAX_URLS_PER_REQUEST));
  assert.equal(batches.flat().length, urls.length);
  assert.ok(batches.length <= FREE_PLAN_BUCKET_SIZE, 'today\'s purge must fit inside one Free-plan token bucket');
  assert.throws(() => chunk(urls, 500), /1\.\.100/);
});

test('retry policy: 429/5xx/network retry, other 4xx do not', () => {
  assert.equal(isRetryableStatus(429), true);
  assert.equal(isRetryableStatus(503), true);
  assert.equal(isRetryableStatus(0), true);
  assert.equal(isRetryableStatus(400), false);
  assert.equal(isRetryableStatus(403), false);
});

test('backoff honours Retry-After and otherwise grows to outlast a drained bucket', () => {
  assert.equal(computeRetryDelayMs(0, '30'), 30000);
  assert.equal(computeRetryDelayMs(3, undefined), 16000);
  assert.equal(computeRetryDelayMs(10, undefined), MAX_RETRY_DELAY_MS);
  assert.ok(MAX_RETRY_DELAY_MS >= 60000, 'Free plan refills 5 tokens/min; a 60s+ ceiling is needed');
  const now = Date.parse('2026-09-08T00:00:00Z');
  assert.equal(computeRetryDelayMs(0, 'Tue, 08 Sep 2026 00:00:20 GMT', now), 20000);
});

test('errors surface Cloudflare error codes instead of a bare status', () => {
  const body = JSON.stringify({ success: false, errors: [{ code: 1002, message: 'Invalid URL' }] });
  assert.equal(describePurgeError(400, body), 'HTTP 400 (1002: Invalid URL)');
  assert.match(describePurgeError(502, '<html>bad gateway</html>'), /HTTP 502: <html>/);
});

test('purge order puts documents, top pages, newest articles and their RSC first', () => {
  const newest = ['brand_new_post'];
  const urls = [
    'https://deniskim1.com/writing/old_post/',
    'https://deniskim1.com/writing/old_post/index.txt',
    'https://deniskim1.com/og/brand_new_post.png',
    'https://deniskim1.com/writing/brand_new_post/__next._full.txt',
    'https://deniskim1.com/writing/brand_new_post/',
    'https://deniskim1.com/papers/',
    'https://deniskim1.com/',
    'https://deniskim1.com/writing/rss.xml',
    'https://deniskim1.com/writing/',
    'https://deniskim1.com/index.txt',
  ];
  const ordered = orderPurgeTargets(urls, newest);
  assert.equal(ordered.length, urls.length, 'ordering must not drop or add URLs');
  assert.deepEqual(ordered.slice(0, 4), [
    'https://deniskim1.com/writing/rss.xml',
    'https://deniskim1.com/',
    'https://deniskim1.com/writing/',
    'https://deniskim1.com/index.txt',
  ]);
  assert.ok(ordered.indexOf('https://deniskim1.com/writing/brand_new_post/') < ordered.indexOf('https://deniskim1.com/writing/brand_new_post/__next._full.txt'));
  assert.ok(ordered.indexOf('https://deniskim1.com/og/brand_new_post.png') < ordered.indexOf('https://deniskim1.com/papers/'));
  assert.equal(ordered.at(-1), 'https://deniskim1.com/writing/old_post/index.txt');
  assert.equal(priorityOf('https://deniskim1.com/sitemap.xml'), 0);
  assert.equal(priorityOf('https://deniskim1.com/deploy-marker.txt'), 0);
});
