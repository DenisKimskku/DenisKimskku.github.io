import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';

const DEFAULT_BASE_URL = process.env.CACHE_WARM_BASE_URL || 'https://deniskim1.com';
const MAX_CONCURRENCY = Math.max(1, Number(process.env.CACHE_WARM_CONCURRENCY || 4));
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = Math.max(0, Number(process.env.CACHE_WARM_RETRIES || 2));
const PASS_COUNT = Math.max(1, Number(process.env.CACHE_WARM_PASSES || 1));
const PASS_DELAY_MS = Math.max(0, Number(process.env.CACHE_WARM_PASS_DELAY_MS || 30000));
const SOURCE_MODE = getArgValue('--source') || process.env.CACHE_WARM_SOURCE || 'local';
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';
const mode = getArgValue('--mode') || 'warm';
const isWarmMode = mode === 'warm';
const articlesIndexPath = path.join(process.cwd(), 'src', 'data', 'articles-index.json');
const outDir = path.join(process.cwd(), 'out');

const baseUrl = new URL(DEFAULT_BASE_URL);

function getArgValue(flag) {
  const args = process.argv.slice(2);
  const inline = args.find((arg) => arg.startsWith(`${flag}=`));
  if (inline) {
    return inline.slice(flag.length + 1);
  }

  const index = args.indexOf(flag);
  if (index >= 0 && index + 1 < args.length) {
    return args[index + 1];
  }

  return null;
}

function log(message) {
  if (isWarmMode) {
    console.log(message);
  }
}

function warn(message) {
  if (isWarmMode) {
    console.warn(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toSiteUrl(route) {
  if (!route || route === '/') {
    return new URL('/', baseUrl).toString();
  }

  const normalized = route.endsWith('/') ? route : `${route}/`;
  return new URL(normalized, baseUrl).toString();
}

function request(url, responseType = 'none', redirectsRemaining = 3) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === 'http:' ? http : https;

    const req = transport.request(
      target.toString(),
      {
        agent: false,
        family: 4,
        method: 'GET',
        headers: {
          'accept': '*/*',
          'accept-encoding': 'identity',
          'accept-language': 'en-US,en;q=0.9',
          'cache-control': 'no-cache',
          'pragma': 'no-cache',
          'user-agent': BROWSER_USER_AGENT,
        },
      },
      (res) => {
        const statusCode = res.statusCode || 0;
        const location = res.headers.location;

        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          location &&
          redirectsRemaining > 0
        ) {
          res.resume();
          const redirectedUrl = new URL(location, target).toString();
          resolve(request(redirectedUrl, responseType, redirectsRemaining - 1));
          return;
        }

        if (responseType === 'none') {
          res.resume();
          res.on('end', () => resolve({ statusCode, url: target.toString(), body: '' }));
          return;
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({ statusCode, url: target.toString(), body });
        });
      }
    );

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function requestWithRetry(url, responseType) {
  let attempt = 0;

  while (true) {
    try {
      const response = await request(url, responseType);
      if (response.statusCode >= 500) {
        throw new Error(`HTTP ${response.statusCode}`);
      }
      return response;
    } catch (error) {
      if (attempt >= MAX_RETRIES) {
        throw error;
      }

      attempt += 1;
      const retryDelayMs = Math.min(5000, 1000 * attempt * attempt);
      warn(`[retry] ${url} (${attempt}/${MAX_RETRIES}) after ${retryDelayMs}ms: ${error.message}`);
      await sleep(retryDelayMs);
    }
  }
}

async function fetchText(url) {
  const response = await requestWithRetry(url, 'text');
  if (response.statusCode >= 400) {
    throw new Error(`HTTP ${response.statusCode}`);
  }
  return response.body;
}

async function warmUrl(url) {
  try {
    const response = await requestWithRetry(url, 'none');
    log(`[warm] ${response.statusCode} ${url}`);
    return true;
  } catch (error) {
    warn(`[warm] failed ${url}: ${error.message}`);
    return false;
  }
}

function extractSitemapUrls(xml) {
  const urls = new Set();
  const matches = xml.match(/<loc>[^<]+<\/loc>/g) || [];

  for (const match of matches) {
    const url = match.replace(/^<loc>/, '').replace(/<\/loc>$/, '').trim();
    if (!url) {
      continue;
    }

    try {
      const parsed = new URL(url);
      if (parsed.origin === baseUrl.origin) {
        urls.add(parsed.toString());
      }
    } catch {
      // Ignore malformed sitemap entries.
    }
  }

  return Array.from(urls);
}

function isWarmableAsset(pathname) {
  if (pathname.startsWith('/_next/')) {
    return true;
  }

  return /^(\/icon\.svg|\/favicon\.ico|\/apple-touch-icon(?:-precomposed)?\.png)$/.test(pathname);
}

function normalizeAssetUrl(candidate, pageUrl) {
  if (!candidate || candidate.startsWith('#') || candidate.startsWith('data:') || candidate.startsWith('mailto:')) {
    return null;
  }

  try {
    const resolved = new URL(candidate, pageUrl);
    if (resolved.origin !== baseUrl.origin) {
      return null;
    }

    return isWarmableAsset(resolved.pathname) ? resolved.toString() : null;
  } catch {
    return null;
  }
}

function collectAttributeAssets(html, attributeName, pageUrl, assets) {
  const regex = new RegExp(`${attributeName}=["']([^"']+)["']`, 'gi');

  let match = regex.exec(html);
  while (match) {
    const assetUrl = normalizeAssetUrl(match[1], pageUrl);
    if (assetUrl) {
      assets.add(assetUrl);
    }
    match = regex.exec(html);
  }
}

function collectSrcsetAssets(html, pageUrl, assets) {
  const regex = /srcset=["']([^"']+)["']/gi;

  let match = regex.exec(html);
  while (match) {
    const entries = match[1].split(',');
    for (const entry of entries) {
      const [candidate] = entry.trim().split(/\s+/);
      const assetUrl = normalizeAssetUrl(candidate, pageUrl);
      if (assetUrl) {
        assets.add(assetUrl);
      }
    }
    match = regex.exec(html);
  }
}

function buildRscTargets(pageUrl) {
  const normalized = pageUrl.endsWith('/') ? pageUrl : `${pageUrl}/`;
  return [
    new URL('__next._full.txt', normalized).toString(),
    new URL('index.txt', normalized).toString(),
  ];
}

function buildSiteDocumentTargets() {
  return [
    new URL('/sitemap.xml', baseUrl).toString(),
    new URL('/robots.txt', baseUrl).toString(),
    new URL('/rss.xml', baseUrl).toString(),
  ];
}

function buildStaticAssetTargets() {
  return [
    new URL('/icon.svg', baseUrl).toString(),
    new URL('/apple-touch-icon.png', baseUrl).toString(),
    new URL('/apple-touch-icon-precomposed.png', baseUrl).toString(),
  ];
}

function buildPurgeTargets(pageUrls) {
  const targets = new Set(buildSiteDocumentTargets());

  for (const pageUrl of pageUrls) {
    targets.add(pageUrl);
    for (const rscUrl of buildRscTargets(pageUrl)) {
      targets.add(rscUrl);
    }
  }

  return Array.from(targets);
}

function loadArticles() {
  const fileContents = fs.readFileSync(articlesIndexPath, 'utf8');
  return JSON.parse(fileContents);
}

function slugifyTag(tag) {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getTagSlugs(articles) {
  const tags = new Set();

  for (const article of articles) {
    for (const tag of article.tags || []) {
      tags.add(tag);
    }
  }

  const sortedTags = Array.from(tags).sort((a, b) => a.localeCompare(b));
  const usedSlugs = new Set();

  return sortedTags.map((tag) => {
    const base = slugifyTag(tag) || 'tag';
    let slug = base;
    let suffix = 2;

    while (usedSlugs.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.add(slug);
    return slug;
  });
}

function loadLocalPageUrls() {
  const staticRoutes = [
    '/',
    '/writing/',
    '/papers/',
    '/code/',
    '/calendar-plus-plus/',
    '/calendar-plus-plus/privacy/',
    '/calendar-plus-plus/terms/',
  ];

  const articles = loadArticles();
  const tagSlugs = getTagSlugs(articles);
  const pageUrls = new Set(staticRoutes.map((route) => toSiteUrl(route)));

  for (const article of articles) {
    if (article.slug) {
      pageUrls.add(toSiteUrl(`/writing/${article.slug}/`));
    }
  }

  for (const tagSlug of tagSlugs) {
    pageUrls.add(toSiteUrl(`/writing/tag/${tagSlug}/`));
  }

  return Array.from(pageUrls);
}

function getHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getHtmlFiles(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

function buildOutAssetTargets() {
  if (!fs.existsSync(outDir)) {
    return [];
  }

  const assetUrls = new Set();
  const htmlFiles = getHtmlFiles(outDir);

  for (const filePath of htmlFiles) {
    const html = fs.readFileSync(filePath, 'utf8');
    collectAttributeAssets(html, 'href', baseUrl.toString(), assetUrls);
    collectAttributeAssets(html, 'src', baseUrl.toString(), assetUrls);
    collectSrcsetAssets(html, baseUrl.toString(), assetUrls);
  }

  return Array.from(assetUrls);
}

async function runWithConcurrency(items, worker) {
  const queue = items.slice();
  const workerCount = Math.min(MAX_CONCURRENCY, queue.length);

  async function loop() {
    while (queue.length > 0) {
      const nextItem = queue.shift();
      if (!nextItem) {
        return;
      }
      await worker(nextItem);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, loop));
}

async function loadLivePageUrls() {
  const sitemapUrl = new URL('/sitemap.xml', baseUrl).toString();
  const sitemapXml = await fetchText(sitemapUrl);
  const pageUrls = extractSitemapUrls(sitemapXml);

  return { sitemapUrl, pageUrls };
}

async function loadPageUrls() {
  if (SOURCE_MODE === 'live') {
    return loadLivePageUrls();
  }

  return {
    sitemapUrl: 'local route inventory',
    pageUrls: loadLocalPageUrls(),
  };
}

async function warmOnce(pageUrls) {
  const assetUrls = new Set([...buildStaticAssetTargets(), ...buildOutAssetTargets()]);
  const rscUrls = new Set();
  const siteDocumentUrls = new Set(buildSiteDocumentTargets());

  await runWithConcurrency(pageUrls, async (pageUrl) => {
    try {
      const warmed = await warmUrl(pageUrl);
      if (warmed) {
        log(`[page] warmed ${pageUrl}`);
      }

      for (const rscUrl of buildRscTargets(pageUrl)) {
        rscUrls.add(rscUrl);
      }
    } catch (error) {
      warn(`[page] failed ${pageUrl}: ${error.message}`);
    }
  });

  const extraUrls = [...new Set([...siteDocumentUrls, ...rscUrls, ...assetUrls])];
  log(`Warming ${siteDocumentUrls.size} site documents, ${rscUrls.size} RSC endpoints, and ${assetUrls.size} critical assets`);

  await runWithConcurrency(extraUrls, warmUrl);
}

async function main() {
  const { sitemapUrl, pageUrls } = await loadPageUrls();

  if (mode === 'purge-targets') {
    process.stdout.write(JSON.stringify({ files: buildPurgeTargets(pageUrls) }));
    return;
  }

  if (!isWarmMode) {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  log(`Loaded ${pageUrls.length} URLs from ${sitemapUrl}`);

  for (let pass = 1; pass <= PASS_COUNT; pass += 1) {
    log(`Starting warm pass ${pass}/${PASS_COUNT}`);
    await warmOnce(pageUrls);

    if (pass < PASS_COUNT && PASS_DELAY_MS > 0) {
      log(`Waiting ${PASS_DELAY_MS}ms before next pass`);
      await sleep(PASS_DELAY_MS);
    }
  }

  log('Cache warm complete.');
}

main().catch((error) => {
  console.error(`Cache warm failed: ${error.message}`);
  process.exitCode = 1;
});
