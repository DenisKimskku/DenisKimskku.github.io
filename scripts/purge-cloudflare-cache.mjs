import https from 'https';
import { execFileSync } from 'child_process';
import {
  FREE_PLAN_BUCKET_SIZE,
  FREE_PLAN_REQUESTS_PER_MINUTE,
  MAX_URLS_PER_REQUEST,
  chunk,
  computeRetryDelayMs,
  describePurgeError,
  isRetryableStatus,
} from './lib/cache-purge.mjs';

// Limits per https://developers.cloudflare.com/cache/how-to/purge-cache/
// (2026-09-08): 100 URLs per request on Free/Pro/Business; Free plan 5 requests
// per minute with a 25-token bucket. A drained bucket answers 429, and one
// token refills every ~12 s — hence the long, Retry-After-aware backoff.
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = Math.max(0, Number(process.env.CACHE_PURGE_RETRIES || 6));
const isDryRun = process.env.CF_DRY_RUN === '1';

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function postJson(url, body, token) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        agent: false,
        family: 4,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunkData) => chunks.push(chunkData));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function purgeBatch(zoneId, apiToken, urls, index, total) {
  const endpoint = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
  const body = JSON.stringify({ files: urls });
  let attempt = 0;

  while (true) {
    let response;
    try {
      response = await postJson(endpoint, body, apiToken);
    } catch (error) {
      // Network failure / timeout: retryable.
      response = { statusCode: 0, headers: {}, body: error.message };
    }

    let parsed = null;
    try {
      parsed = JSON.parse(response.body);
    } catch {
      parsed = null;
    }

    if (response.statusCode >= 200 && response.statusCode < 300 && parsed?.success === true) {
      console.log(`[purge] batch ${index + 1}/${total} ok (${urls.length} URLs)`);
      return;
    }

    const description = describePurgeError(response.statusCode, response.body);

    if (!isRetryableStatus(response.statusCode)) {
      // 4xx other than 429 (bad token, malformed URL, >100 files): retrying cannot help.
      throw new Error(`batch ${index + 1}/${total} rejected: ${description}`);
    }

    if (attempt >= MAX_RETRIES) {
      throw new Error(`batch ${index + 1}/${total} failed after ${attempt + 1} attempts: ${description}`);
    }

    const retryDelayMs = computeRetryDelayMs(attempt, response.headers?.['retry-after']);
    attempt += 1;
    console.warn(`[purge] retrying batch ${index + 1}/${total} in ${Math.round(retryDelayMs / 1000)}s (${attempt}/${MAX_RETRIES}): ${description}`);
    await sleep(retryDelayMs);
  }
}

function loadPurgeTargets() {
  const output = execFileSync(process.execPath, ['scripts/warm-cache.mjs', '--mode=purge-targets'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  }).trim();

  const parsed = JSON.parse(output);
  return Array.isArray(parsed.files) ? parsed.files : [];
}

async function main() {
  const zoneId = process.env.CF_ZONE_ID;
  const apiToken = process.env.CF_API_TOKEN;
  const urls = loadPurgeTargets();
  const batches = chunk(urls, MAX_URLS_PER_REQUEST);

  const budgetNote = batches.length > FREE_PLAN_BUCKET_SIZE
    ? ` — exceeds the Free-plan bucket of ${FREE_PLAN_BUCKET_SIZE} requests; expect ~${Math.ceil((batches.length - FREE_PLAN_BUCKET_SIZE) * (60 / FREE_PLAN_REQUESTS_PER_MINUTE))}s of rate-limit waits`
    : '';

  if (isDryRun) {
    console.log(`[purge] dry run: ${urls.length} URLs in ${batches.length} batches of <=${MAX_URLS_PER_REQUEST}${budgetNote}`);
    console.log(`[purge] first 12 targets (purge order == re-warm priority):\n  ${urls.slice(0, 12).join('\n  ')}`);
    return;
  }

  if (!zoneId || !apiToken) {
    throw new Error('CF_ZONE_ID and CF_API_TOKEN must be set');
  }

  console.log(`[purge] purging ${urls.length} URLs in ${batches.length} batches of <=${MAX_URLS_PER_REQUEST}${budgetNote}`);

  for (let index = 0; index < batches.length; index += 1) {
    await purgeBatch(zoneId, apiToken, batches[index], index, batches.length);
  }

  console.log('[purge] complete');
}

main().catch((error) => {
  console.error(`[purge] failed: ${error.message}`);
  process.exitCode = 1;
});
