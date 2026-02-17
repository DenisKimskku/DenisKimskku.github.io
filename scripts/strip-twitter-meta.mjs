import fs from 'node:fs';
import path from 'node:path';

const outDir = path.join(process.cwd(), 'out');

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

if (!fs.existsSync(outDir)) {
  process.exit(0);
}

const htmlFiles = getHtmlFiles(outDir);
const twitterMetaTagRegex = /<meta name="twitter:[^>]*\/>/g;

for (const filePath of htmlFiles) {
  const html = fs.readFileSync(filePath, 'utf8');
  const stripped = html.replace(twitterMetaTagRegex, '');
  if (html !== stripped) {
    fs.writeFileSync(filePath, stripped, 'utf8');
  }
}
