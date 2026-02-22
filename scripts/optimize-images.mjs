import { execSync } from 'child_process';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';

const IMAGES_DIR = join(process.cwd(), 'public', 'images');
const QUALITY = 80;

function findPngs(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findPngs(full));
    } else if (extname(full).toLowerCase() === '.png') {
      results.push(full);
    }
  }
  return results;
}

// Check if cwebp is available
try {
  execSync('which cwebp', { stdio: 'ignore' });
} catch {
  console.log('cwebp not found — skipping WebP conversion.');
  console.log('Install with: brew install webp');
  process.exit(0);
}

if (!existsSync(IMAGES_DIR)) {
  console.log('No public/images directory found — skipping.');
  process.exit(0);
}

const pngs = findPngs(IMAGES_DIR);
let converted = 0;
let skipped = 0;

for (const png of pngs) {
  const webp = png.replace(/\.png$/i, '.webp');
  if (existsSync(webp)) {
    skipped++;
    continue;
  }
  try {
    execSync(`cwebp -q ${QUALITY} "${png}" -o "${webp}"`, { stdio: 'ignore' });
    converted++;
    console.log(`Converted: ${basename(png)} -> ${basename(webp)}`);
  } catch (err) {
    console.warn(`Failed to convert ${basename(png)}: ${err.message}`);
  }
}

console.log(`\nDone: ${converted} converted, ${skipped} skipped (already exist).`);
