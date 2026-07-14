import { execSync } from 'child_process';
import { readdirSync, statSync, existsSync, writeFileSync } from 'fs';
import { join, extname, basename } from 'path';

const IMAGES_DIR = join(process.cwd(), 'public', 'images');
const QUALITY = 80;
const MAX_JPEG_BYTES = 300 * 1024;
const MAX_JPEG_WIDTH = 1600;
// Only rewrite when recompression saves at least this fraction — prevents
// endless lossy re-encodes of files that stay above the size threshold even
// at target quality (a q80 re-encode of a q80 file saves well under this).
const MIN_SAVINGS = 0.1;

function findImages(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findImages(full));
    } else {
      const ext = extname(full).toLowerCase();
      if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
        results.push(full);
      }
    }
  }
  return results;
}

if (!existsSync(IMAGES_DIR)) {
  console.log('No public/images directory found — skipping.');
  process.exit(0);
}

const images = findImages(IMAGES_DIR);
const jpegs = images.filter((f) => /\.jpe?g$/i.test(f));

// --- Pass 1: recompress oversized JPEGs in place (sharp, mozjpeg) ---
let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('sharp not available — skipping JPEG recompression.');
}

let recompressed = 0;
if (sharp) {
  for (const jpg of jpegs) {
    const inputBytes = statSync(jpg).size;
    if (inputBytes <= MAX_JPEG_BYTES) continue;
    try {
      const out = await sharp(jpg)
        .rotate() // bake in EXIF orientation before it is stripped
        .resize({ width: MAX_JPEG_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toBuffer();
      if (out.length < inputBytes * (1 - MIN_SAVINGS)) {
        writeFileSync(jpg, out);
        recompressed++;
        console.log(`Recompressed: ${basename(jpg)} ${Math.round(inputBytes / 1024)}KB -> ${Math.round(out.length / 1024)}KB`);
        // Refresh any stale .webp sibling so it reflects the new source.
        const webp = jpg.replace(/\.jpe?g$/i, '.webp');
        if (existsSync(webp) && statSync(webp).size > out.length) {
          const webpOut = await sharp(out).webp({ quality: QUALITY }).toBuffer();
          if (webpOut.length < statSync(webp).size) writeFileSync(webp, webpOut);
        }
      }
    } catch (err) {
      console.warn(`Failed to recompress ${basename(jpg)}: ${err.message}`);
    }
  }
}

// --- Pass 1.5: recompress oversized PNGs in place (palette quantization) ---
// The heavy PNGs are hand-written article screenshots/diagrams, which palette
// PNG handles well; photos that don't shrink enough are left for the .webp
// sibling to carry (lint accepts a heavy original with a light sibling).
if (sharp) {
  for (const png of images.filter((f) => /\.png$/i.test(f))) {
    const inputBytes = statSync(png).size;
    if (inputBytes <= MAX_JPEG_BYTES) continue;
    try {
      const out = await sharp(png)
        .resize({ width: MAX_JPEG_WIDTH, withoutEnlargement: true })
        .png({ palette: true, quality: QUALITY, compressionLevel: 9 })
        .toBuffer();
      if (out.length < inputBytes * (1 - MIN_SAVINGS)) {
        writeFileSync(png, out);
        recompressed++;
        console.log(`Recompressed: ${basename(png)} ${Math.round(inputBytes / 1024)}KB -> ${Math.round(out.length / 1024)}KB`);
      }
    } catch (err) {
      console.warn(`Failed to recompress ${basename(png)}: ${err.message}`);
    }
  }
}

// --- Pass 2: generate .webp siblings for PNGs and JPEGs ---
// Check if cwebp is available
let hasCwebp = true;
try {
  execSync('which cwebp', { stdio: 'ignore' });
} catch {
  hasCwebp = false;
  console.log('cwebp not found — skipping WebP conversion.');
  console.log('Install with: brew install webp');
}

let converted = 0;
let skipped = 0;

if (hasCwebp) {
  for (const image of images) {
    const webp = image.replace(/\.(png|jpe?g)$/i, '.webp');
    if (existsSync(webp)) {
      skipped++;
      continue;
    }
    try {
      execSync(`cwebp -q ${QUALITY} "${image}" -o "${webp}"`, { stdio: 'ignore' });
      converted++;
      console.log(`Converted: ${basename(image)} -> ${basename(webp)}`);
    } catch (err) {
      console.warn(`Failed to convert ${basename(image)}: ${err.message}`);
    }
  }
}

// --- Pass 3: guarantee a light .webp sibling for every heavy original ---
// lint-content accepts an over-300KB original only when its .webp sibling is
// under the limit; cwebp -q80 does not guarantee that (large palette PNGs can
// produce oversized webps), so step quality/width down until the sibling fits.
let guaranteed = 0;
if (sharp) {
  for (const image of images) {
    if (statSync(image).size <= MAX_JPEG_BYTES) continue;
    const webp = image.replace(/\.(png|jpe?g)$/i, '.webp');
    if (existsSync(webp) && statSync(webp).size <= MAX_JPEG_BYTES) continue;
    let done = false;
    for (const [width, quality] of [[1600, 75], [1600, 60], [1200, 60], [1200, 45], [1000, 40]]) {
      try {
        const out = await sharp(image)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality })
          .toBuffer();
        if (out.length <= MAX_JPEG_BYTES) {
          writeFileSync(webp, out);
          guaranteed++;
          console.log(`Guaranteed webp: ${basename(webp)} ${Math.round(out.length / 1024)}KB (w${width} q${quality})`);
          done = true;
          break;
        }
      } catch (err) {
        console.warn(`Failed webp for ${basename(image)}: ${err.message}`);
        break;
      }
    }
    if (!done) console.warn(`Could not get ${basename(image)} under ${MAX_JPEG_BYTES / 1024}KB as webp.`);
  }
}

console.log(`\nDone: ${recompressed} recompressed, ${converted} converted, ${guaranteed} webp-guaranteed, ${skipped} skipped (already exist).`);
