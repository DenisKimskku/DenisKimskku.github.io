import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const articlesIndex = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'articles-index.json'), 'utf8')
);

const ogDir = path.join(process.cwd(), 'public', 'og');
if (!fs.existsSync(ogDir)) {
  fs.mkdirSync(ogDir, { recursive: true });
}

// slug -> sha1(template version + rendered fields): lets corrected articles
// regenerate their image while unchanged articles are skipped.
const manifestPath = path.join(ogDir, 'manifest.json');

// Bump whenever the card template itself changes (layout, byline, colors…).
// It is folded into every article hash, so a bump invalidates and
// regenerates ALL existing cards even if the article content is unchanged.
// v2: byline row + description excerpt added.
const TEMPLATE_VERSION = 2;

// Byline: read the author name from src/lib/siteMetadata.ts so the card stays
// in sync with the site. The .ts file can't be imported from this .mjs script,
// so parse the literal; fall back to the hardcoded value (keep in sync with
// siteMetadata.authorName) if the parse ever fails.
function loadAuthorName() {
  try {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src', 'lib', 'siteMetadata.ts'),
      'utf8'
    );
    const match = src.match(/authorName:\s*'([^']+)'/);
    if (match) return match[1];
  } catch {
    // fall through to hardcoded fallback
  }
  return 'Minseok (Denis) Kim';
}

const AUTHOR_NAME = loadAuthorName();
const AUTHOR_ROLE = 'AI Security Researcher';

// Fonts are vendored under scripts/assets/fonts/ (satori needs ttf; the old
// Google Fonts CSS fetch made every build depend on an external service).
const fontsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets', 'fonts');

function loadFont(file, name, weight) {
  const data = fs.readFileSync(path.join(fontsDir, file));
  return { name, data, weight };
}

// Description excerpt: hard character cap as a backstop; satori's lineClamp
// does the visual 3-line truncation with an ellipsis.
function excerpt(description) {
  if (typeof description !== 'string') return '';
  const text = description.trim();
  if (text.length <= 220) return text;
  return `${text.slice(0, 220).replace(/\s+\S*$/, '')}…`;
}

function articleHash(article) {
  // Hash every field the card renders — a corrected title, type, date,
  // description, or tag set must regenerate the image. TEMPLATE_VERSION is
  // included so bumping it regenerates every card after a template change.
  const tags = Array.isArray(article.tags) ? article.tags.join(',') : '';
  return crypto
    .createHash('sha1')
    .update(
      `v${TEMPLATE_VERSION}\n${article.title}\n${article.type}\n${article.date}\n${article.description || ''}\n${tags}\n${AUTHOR_NAME}\n${AUTHOR_ROLE}`
    )
    .digest('hex');
}

function loadManifest() {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return {};
  }
}

const TYPE_COLORS = {
  'News Digest': '#3b82f6',
  'Trend Report': '#a855f7',
  'Paper Walkthrough': '#14b8a6',
  'Research Paper': '#10b981',
  'Paper Review': '#f59e0b',
  'Tutorial': '#f43f5e',
  'Project': '#06b6d4',
};

async function main() {
  const interFont = loadFont('inter-400.ttf', 'Inter', 400);
  const interBoldFont = loadFont('inter-700.ttf', 'Inter', 700);
  const loraFont = loadFont('lora-700.ttf', 'Lora', 700);

  const oldManifest = loadManifest();
  const manifest = {};

  for (const article of articlesIndex) {
    const outputPath = path.join(ogDir, `${article.slug}.png`);
    const hash = articleHash(article);
    manifest[article.slug] = hash;

    // Skip only when the image exists AND was rendered from the same
    // title/type — corrected titles regenerate.
    if (fs.existsSync(outputPath) && oldManifest[article.slug] === hash) {
      continue;
    }

    const accentColor = TYPE_COLORS[article.type] || '#60a5fa';
    const tags = (article.tags || []).slice(0, 3);
    const description = excerpt(article.description);

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
                  // Description excerpt (skipped when the article has none)
                  ...(description
                    ? [
                        {
                          type: 'div',
                          props: {
                            style: {
                              fontSize: '21px',
                              color: '#a3a3a3',
                              fontWeight: 400,
                              lineHeight: 1.5,
                              maxWidth: '880px',
                              lineClamp: 3,
                            },
                            children: description,
                          },
                        },
                      ]
                    : []),
                ],
              },
            },
            // Bottom section: byline + tags on the left, site meta on the right
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
                  // Byline + tags
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                      },
                      children: [
                        // Byline row
                        {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                            },
                            children: [
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: accentColor,
                                  },
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '17px',
                                    color: '#e5e5e5',
                                    fontWeight: 700,
                                  },
                                  children: AUTHOR_NAME,
                                },
                              },
                              {
                                type: 'div',
                                props: {
                                  style: {
                                    fontSize: '16px',
                                    color: '#737373',
                                    fontWeight: 400,
                                  },
                                  children: `— ${AUTHOR_ROLE}`,
                                },
                              },
                            ],
                          },
                        },
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
                      ],
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

  // Deterministic manifest: current index slugs only, sorted.
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  fs.writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');

  console.log('OG image generation complete.');
}

main().catch((err) => {
  console.error('OG image generation failed:', err);
  process.exit(1);
});
