import fs from 'fs';
import path from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const articlesIndex = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'articles-index.json'), 'utf8')
);

const ogDir = path.join(process.cwd(), 'public', 'og');
if (!fs.existsSync(ogDir)) {
  fs.mkdirSync(ogDir, { recursive: true });
}

// Fetch font from Google Fonts CSS API (request truetype format for satori compatibility)
async function loadGoogleFont(family, weight) {
  // Use an older user-agent to get ttf URLs (satori doesn't support woff2)
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  const cssRes = await fetch(cssUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)',
    },
  });
  const css = await cssRes.text();

  // Extract font URL (truetype/woff format)
  const urlMatch = css.match(/src:\s*url\(([^)]+)\)\s*format\('(truetype|woff)'\)/);
  if (!urlMatch) {
    throw new Error(`Could not find font URL for ${family} ${weight}. CSS:\n${css.substring(0, 500)}`);
  }

  const fontRes = await fetch(urlMatch[1]);
  const data = await fontRes.arrayBuffer();
  return { name: family, data, weight };
}

async function main() {
  console.log('Loading fonts...');
  const interFont = await loadGoogleFont('Inter', 400);
  const interBoldFont = await loadGoogleFont('Inter', 700);
  console.log('Fonts loaded.');

  for (const article of articlesIndex) {
    const outputPath = path.join(ogDir, `${article.slug}.png`);

    // Skip if already generated
    if (fs.existsSync(outputPath)) {
      console.log(`Skipping ${article.slug} (already exists)`);
      continue;
    }

    const svg = await satori(
      {
        type: 'div',
        props: {
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#0f0f0f',
            padding: '60px 80px',
          },
          children: [
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: '18px',
                        color: '#60a5fa',
                        fontWeight: 400,
                      },
                      children: article.type,
                    },
                  },
                  {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: article.title.length > 60 ? '36px' : '48px',
                        fontWeight: 700,
                        color: '#f5f5f5',
                        lineHeight: 1.2,
                        letterSpacing: '-0.02em',
                      },
                      children: article.title,
                    },
                  },
                ],
              },
            },
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '16px',
                  color: '#737373',
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      children: article.date,
                    },
                  },
                  {
                    type: 'div',
                    props: {
                      children: 'deniskim1.com',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        width: 1200,
        height: 630,
        fonts: [interFont, interBoldFont],
      }
    );

    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 1200 },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    fs.writeFileSync(outputPath, pngBuffer);
    console.log(`Generated OG image: ${article.slug}.png`);
  }

  console.log('OG image generation complete.');
}

main().catch(console.error);
