import https from 'https';
import { execFileSync } from 'child_process';

const MAX_URLS_PER_REQUEST = 100;
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = Math.max(0, Number(process.env.CACHE_PURGE_RETRIES || 2));
const isDryRun = process.env.CF_DRY_RUN === '1';

function chunk(items, size) {
  const batches = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

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
    try {
      const response = await postJson(endpoint, body, apiToken);
      const parsed = JSON.parse(response.body);

      if (response.statusCode >= 500 || response.statusCode === 429) {
        throw new Error(`HTTP ${response.statusCode}`);
      }

      if (response.statusCode >= 400 || !parsed.success) {
        throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
      }

      console.log(`[purge] batch ${index + 1}/${total} ok (${urls.length} URLs)`);
      return;
    } catch (error) {
      if (attempt >= MAX_RETRIES) {
        throw error;
      }

      attempt += 1;
      const retryDelayMs = Math.min(5000, 1000 * attempt * attempt);
      console.warn(`[purge] retrying batch ${index + 1}/${total} in ${retryDelayMs}ms: ${error.message}`);
      await sleep(retryDelayMs);
    }
  }
}

function loadPurgeTargets() {
  const output = execFileSync(process.execPath, ['scripts/warm-cache.mjs', '--mode=purge-targets'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim();

  const parsed = JSON.parse(output);
  return Array.isArray(parsed.files) ? parsed.files : [];
}

async function main() {
  const zoneId = process.env.CF_ZONE_ID;
  const apiToken = process.env.CF_API_TOKEN;
  const urls = loadPurgeTargets();
  const batches = chunk(urls, MAX_URLS_PER_REQUEST);

  if (isDryRun) {
    console.log(`[purge] dry run: ${urls.length} URLs in ${batches.length} batches`);
    return;
  }

  if (!zoneId || !apiToken) {
    throw new Error('CF_ZONE_ID and CF_API_TOKEN must be set');
  }

  console.log(`[purge] purging ${urls.length} URLs in ${batches.length} batches`);

  for (let index = 0; index < batches.length; index += 1) {
    await purgeBatch(zoneId, apiToken, batches[index], index, batches.length);
  }

  console.log('[purge] complete');
}

main().catch((error) => {
  console.error(`[purge] failed: ${error.message}`);
  process.exitCode = 1;
});
