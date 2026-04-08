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

const TYPE_COLORS = {
  'News Digest': '#3b82f6',
  'Trend Report': '#a855f7',
  'Research Paper': '#10b981',
  'Paper Review': '#f59e0b',
  'Tutorial': '#f43f5e',
  'Project': '#06b6d4',
};

async function main() {
  console.log('Loading fonts...');
  const interFont = await loadGoogleFont('Inter', 400);
  const interBoldFont = await loadGoogleFont('Inter', 700);
  const loraFont = await loadGoogleFont('Lora', 700);
  console.log('Fonts loaded.');

  for (const article of articlesIndex) {
    const outputPath = path.join(ogDir, `${article.slug}.png`);

    // Skip if already generated
    if (fs.existsSync(outputPath)) {
      console.log(`Skipping ${article.slug} (already exists)`);
      continue;
    }

    const accentColor = TYPE_COLORS[article.type] || '#60a5fa';
    const tags = (article.tags || []).slice(0, 3);

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
            backgroundColor: '#0a0a0a',
            padding: '60px 70px',
            position: 'relative',
            overflow: 'hidden',
          },
          children: [
            // Background gradient accent
            {
              type: 'div',
              props: {
                style: {
                  position: 'absolute',
                  top: '-100px',
                  right: '-100px',
                  width: '500px',
                  height: '500px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)`,
                },
              },
            },
            // Bottom-left subtle glow
            {
              type: 'div',
              props: {
                style: {
                  position: 'absolute',
                  bottom: '-80px',
                  left: '-80px',
                  width: '300px',
                  height: '300px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${accentColor}08 0%, transparent 70%)`,
                },
              },
            },
            // Top section: type badge + title
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  position: 'relative',
                },
                children: [
                  // Type badge
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      },
                      children: [
                        {
                          type: 'div',
                          props: {
                            style: {
                              width: '3px',
                              height: '20px',
                              backgroundColor: accentColor,
                              borderRadius: '2px',
                            },
                          },
                        },
                        {
                          type: 'div',
                          props: {
                            style: {
                              fontSize: '16px',
                              color: accentColor,
                              fontWeight: 400,
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                            },
                            children: article.type,
                          },
                        },
                      ],
                    },
                  },
                  // Title
                  {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: article.title.length > 80 ? '32px' : article.title.length > 50 ? '40px' : '48px',
                        fontFamily: 'Lora',
                        fontWeight: 700,
                        color: '#f5f5f5',
                        lineHeight: 1.25,
                        letterSpacing: '-0.02em',
                        maxWidth: '900px',
                      },
                      children: article.title,
                    },
                  },
                ],
              },
            },
            // Bottom section: tags + meta
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  position: 'relative',
                },
                children: [
                  // Tags
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        gap: '8px',
                      },
                      children: tags.map((tag) => ({
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '13px',
                            color: '#737373',
                            padding: '4px 12px',
                            border: '1px solid #262626',
                            borderRadius: '6px',
                            backgroundColor: '#141414',
                          },
                          children: tag,
                        },
                      })),
                    },
                  },
                  // Site + date
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '4px',
                      },
                      children: [
                        {
                          type: 'div',
                          props: {
                            style: {
                              fontSize: '15px',
                              color: '#a3a3a3',
                              fontWeight: 500,
                            },
                            children: 'deniskim1.com',
                          },
                        },
                        {
                          type: 'div',
                          props: {
                            style: {
                              fontSize: '13px',
                              color: '#525252',
                            },
                            children: article.date,
                          },
                        },
                      ],
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
        fonts: [interFont, interBoldFont, loraFont],
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
