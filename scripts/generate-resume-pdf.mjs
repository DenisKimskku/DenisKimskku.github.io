import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const outDir = path.join(process.cwd(), 'out');
const publicDir = path.join(process.cwd(), 'public');
const outResumePath = path.join(outDir, 'resume.pdf');
const publicResumePath = path.join(publicDir, 'resume.pdf');

if (!fs.existsSync(outDir)) {
  console.warn('[resume-pdf] /out does not exist — run `next build` first. Skipping.');
  process.exit(0);
}

const mimeByExt = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf',
};

function resolveFile(urlPath) {
  // Strip query/hash, decode, prevent directory traversal.
  const cleaned = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const safe = path.posix.normalize(cleaned).replace(/^(\.\.[\/\\])+/, '');
  let abs = path.join(outDir, safe);
  if (!abs.startsWith(outDir)) abs = outDir;

  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    abs = path.join(abs, 'index.html');
  }
  if (!fs.existsSync(abs) && !path.extname(abs)) {
    // Try with .html
    const withHtml = `${abs}.html`;
    if (fs.existsSync(withHtml)) abs = withHtml;
  }
  return abs;
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const file = resolveFile(req.url || '/');
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        const ext = path.extname(file).toLowerCase();
        res.setHeader('Content-Type', mimeByExt[ext] || 'application/octet-stream');
        fs.createReadStream(file).pipe(res);
      } catch (err) {
        res.statusCode = 500;
        res.end(String(err));
      }
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function renderPdf(port) {
  // Lazy-load puppeteer so this script doesn't crash when only running other
  // build steps and puppeteer hasn't been installed yet.
  let puppeteer;
  try {
    puppeteer = (await import('puppeteer')).default;
  } catch (err) {
    console.warn('[resume-pdf] puppeteer not installed — skipping PDF generation.');
    console.warn('[resume-pdf]   Install with: npm install puppeteer');
    return false;
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    const url = `http://127.0.0.1:${port}/resume/`;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });
    // Force light theme for the PDF regardless of system preference.
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.emulateMediaType('print');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', right: '16mm', bottom: '14mm', left: '16mm' },
      preferCSSPageSize: true,
    });
    fs.writeFileSync(outResumePath, pdf);
    fs.writeFileSync(publicResumePath, pdf);
    return true;
  } finally {
    await browser.close();
  }
}

const { server, port } = await startServer();
console.log(`[resume-pdf] static server on http://127.0.0.1:${port}`);
try {
  const ok = await renderPdf(port);
  if (ok) {
    console.log(`[resume-pdf] wrote ${path.relative(process.cwd(), outResumePath)}`);
    console.log(`[resume-pdf] wrote ${path.relative(process.cwd(), publicResumePath)}`);
  }
} catch (err) {
  console.error('[resume-pdf] failed:', err);
  process.exitCode = 1;
} finally {
  server.close();
}
