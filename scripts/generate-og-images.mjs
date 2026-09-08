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

// Static (non-article) cards use their own version so a redesign of the site
// or section cards never forces 400+ article cards to re-render.
// v1: initial site / section / topic cards.
const STATIC_TEMPLATE_VERSION = 1;

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
const SITE_DOMAIN = 'deniskim1.com';
const SITE_ACCENT = '#60a5fa';

// Topic hubs (/writing/tag/<slug>/) are the CANONICAL_TOPICS in
// src/lib/articles.ts, one hub per topic. Parse the literal the same way as
// the author name; the tag page falls back to the site card for any topic
// that has no card, so a failed parse degrades gracefully.
function loadCanonicalTopics() {
  try {
    const src = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'articles.ts'), 'utf8');
    const block = src.match(/const CANONICAL_TOPICS\s*=\s*\[([\s\S]*?)\]/);
    if (block) {
      const topics = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
      if (topics.length > 0) return topics;
    }
  } catch {
    // fall through to the warning below
  }
  console.warn('generate-og-images: could not read CANONICAL_TOPICS from src/lib/articles.ts; no topic cards.');
  return [];
}

// Mirrors slugifyTag() in src/lib/articles.ts.
function slugifyTag(tag) {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

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

function staticHash(card) {
  // Every rendered field is in `card`; key order is fixed by the definitions
  // below, so the JSON is stable.
  return crypto
    .createHash('sha1')
    .update(`static-v${STATIC_TEMPLATE_VERSION}\n${JSON.stringify(card)}\n${AUTHOR_NAME}\n${AUTHOR_ROLE}`)
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

// ---------------------------------------------------------------------------
// Static cards: the site-wide default (root layout, homepage, and every page
// or article without a card of its own), one per section hub, and one per
// topic hub. Stems are underscore-prefixed and hyphenated so they can never
// collide with article slugs (article files are [A-Za-z0-9_] only);
// public/.nojekyll means GitHub Pages serves underscore-prefixed files.
// Pages reference them via ogCard() in src/lib/siteMetadata.ts.
// ---------------------------------------------------------------------------
function section(id, accent, eyebrow, title, blurb, chips) {
  return {
    id: `_section-${id}`,
    kind: 'section',
    accent,
    eyebrow,
    title,
    blurb,
    chips,
    path: `/${id}/`,
  };
}

function buildStaticCards() {
  const cards = [
    {
      id: '_site',
      kind: 'site',
      accent: SITE_ACCENT,
      eyebrow: 'Research Portfolio',
      title: AUTHOR_NAME,
      subtitle: 'AI & Security Researcher',
      blurb:
        'Ph.D. research on AI security, RAG systems, LLM safety, and adversarial machine learning — papers, walkthroughs, and daily AI security news.',
      chips: ['AI Security', 'RAG Systems', 'LLM Safety', 'Adversarial ML'],
      path: '',
      secondary: 'github.com/DenisKimskku',
    },
    section(
      'writing',
      '#14b8a6',
      'Writing',
      'Paper walkthroughs & research writing',
      'Technical deep-dives into AI security papers, RAG systems, and LLM safety, alongside daily digests and weekly trend reports.',
      ['Walkthroughs', 'Research', 'Tutorials']
    ),
    section(
      'news',
      '#3b82f6',
      'AI Security News',
      'Daily digests & weekly trend reports',
      'Curated AI security news — new attacks, defenses, and papers — summarized every day, with the week in review each Sunday.',
      ['Daily Digest', 'Trend Report']
    ),
    section(
      'papers',
      '#10b981',
      'Papers',
      'Peer-reviewed publications',
      'Academic publications on AI security, RAG systems, and LLM safety, with venues, PDFs, and code.',
      ['Publications', 'Preprints']
    ),
    section(
      'code',
      '#06b6d4',
      'Code',
      'Open-source projects & tools',
      'Research code, demos, and tools on GitHub — from RAG visualizers to red-teaming arenas.',
      ['GitHub', 'Demos', 'Tools']
    ),
    section(
      'resume',
      '#f59e0b',
      'Curriculum Vitae',
      AUTHOR_NAME,
      'Ph.D. student and AI security researcher at Sungkyunkwan University — education, publications, awards, and experience.',
      ['Education', 'Publications', 'Awards']
    ),
    section(
      'ctf',
      '#f43f5e',
      'LLM Red-Teaming CTF',
      '20 levels of prompt injection & jailbreaking',
      'An interactive Capture-The-Flag arena: prompt injection, guardrail evasion, and LLM-as-a-Judge jailbreaking, in your browser.',
      ['Prompt Injection', 'Guardrails', 'Jailbreaks']
    ),
    section(
      'calendar-plus-plus',
      '#a855f7',
      'Calendar++',
      'A menu bar calendar for macOS',
      'Google Calendar integration, fast event management, and a clean native design — one click from the menu bar.',
      ['macOS', 'Google Calendar']
    ),
  ];

  for (const topic of loadCanonicalTopics()) {
    cards.push({
      id: `_tag-${slugifyTag(topic)}`,
      kind: 'topic',
      accent: SITE_ACCENT,
      eyebrow: 'Writing',
      title: `Topic: ${topic}`,
      blurb: `Research articles, paper walkthroughs, and news digests on ${topic} by ${AUTHOR_NAME}.`,
      chips: [topic],
      path: `/writing/tag/${slugifyTag(topic)}/`,
    });
  }

  return cards;
}

// Tiny element helper: satori requires `display: flex` on any element with
// more than one child, so default every container to it.
function box(style, children) {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', ...style },
      ...(children === undefined ? {} : { children }),
    },
  };
}

// The site favicon (public/icon.svg) as an inline SVG so the site card carries
// the same mark as the browser tab. Kept verbatim from that file.
function monogram(size) {
  return {
    type: 'svg',
    props: {
      width: size,
      height: size,
      viewBox: '0 0 32 32',
      children: [
        { type: 'rect', props: { width: 32, height: 32, rx: 6, fill: '#1a1a1a' } },
        {
          type: 'path',
          props: {
            d: 'M5 24V8h2.4l4.6 8.5L16.6 8H19v16h-2.2V12.8L13 20h-1.4L7.2 12.8V24H5z',
            fill: '#f5f5f5',
          },
        },
        {
          type: 'path',
          props: {
            d: 'M21 24V8h2.2v7.2L28 8h2.6l-5.2 7.8L30.8 24H28l-4.8-7.2V24H21z',
            fill: SITE_ACCENT,
          },
        },
      ],
    },
  };
}

function chip(text, large) {
  return box(
    {
      fontSize: large ? '15px' : '13px',
      color: large ? '#a3a3a3' : '#737373',
      padding: large ? '6px 14px' : '4px 12px',
      border: '1px solid #262626',
      borderRadius: '6px',
      backgroundColor: '#141414',
    },
    text
  );
}

function staticTitleSize(card) {
  if (card.kind === 'site') return '76px';
  const len = card.title.length;
  if (len > 44) return '46px';
  if (len > 30) return '54px';
  return '62px';
}

function staticCardElement(card) {
  const { accent } = card;
  const isSite = card.kind === 'site';

  return box(
    {
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      justifyContent: 'space-between',
      backgroundColor: '#0a0a0a',
      // Faint grid motif under the article cards' radial glow.
      backgroundImage:
        'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
      backgroundSize: '48px 48px',
      padding: '60px 70px',
      position: 'relative',
      overflow: 'hidden',
    },
    [
      box({
        position: 'absolute',
        top: '-140px',
        right: '-120px',
        width: '620px',
        height: '620px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
      }),
      box({
        position: 'absolute',
        bottom: '-100px',
        left: '-100px',
        width: '360px',
        height: '360px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}0a 0%, transparent 70%)`,
      }),
      // Top: eyebrow + title (+ tagline) + blurb
      box({ flexDirection: 'column', gap: isSite ? '22px' : '20px', position: 'relative' }, [
        box({ alignItems: 'center', gap: '14px' }, [
          ...(isSite
            ? [monogram(44)]
            : [box({ width: '3px', height: '20px', backgroundColor: accent, borderRadius: '2px' })]),
          box(
            {
              fontSize: '17px',
              color: accent,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            },
            card.eyebrow
          ),
        ]),
        box(
          {
            fontSize: staticTitleSize(card),
            fontFamily: 'Lora',
            fontWeight: 700,
            color: '#f5f5f5',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            maxWidth: '940px',
          },
          card.title
        ),
        ...(card.subtitle
          ? [
              box(
                {
                  fontSize: '32px',
                  color: accent,
                  fontWeight: 400,
                  letterSpacing: '-0.01em',
                  marginTop: '-6px',
                },
                card.subtitle
              ),
            ]
          : []),
        box(
          {
            fontSize: isSite ? '22px' : '23px',
            color: '#a3a3a3',
            fontWeight: 400,
            lineHeight: 1.5,
            maxWidth: '860px',
            lineClamp: 2,
          },
          card.blurb
        ),
      ]),
      // Bottom: byline/chips left, domain + path right
      box({ justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative' }, [
        box({ flexDirection: 'column', gap: '14px' }, [
          ...(isSite
            ? []
            : [
                box({ alignItems: 'center', gap: '10px' }, [
                  box({ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: accent }),
                  box({ fontSize: '17px', color: '#e5e5e5', fontWeight: 700 }, AUTHOR_NAME),
                  box({ fontSize: '16px', color: '#737373', fontWeight: 400 }, `— ${AUTHOR_ROLE}`),
                ]),
              ]),
          box(
            { gap: '8px' },
            (card.chips || []).map((text) => chip(text, isSite))
          ),
        ]),
        box({ flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }, [
          box(
            { fontSize: isSite ? '22px' : '17px', color: isSite ? '#e5e5e5' : '#a3a3a3', fontWeight: 700 },
            SITE_DOMAIN
          ),
          ...(card.secondary || card.path
            ? [
                box(
                  { fontSize: isSite ? '15px' : '13px', color: '#525252' },
                  card.secondary || `${SITE_DOMAIN}${card.path}`
                ),
              ]
            : []),
        ]),
      ]),
    ]
  );
}

function articleCardElement(article) {
  const accentColor = TYPE_COLORS[article.type] || '#60a5fa';
  const tags = (article.tags || []).slice(0, 3);
  const description = excerpt(article.description);

  return {
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
  };
}

async function renderPng(element, fonts) {
  const svg = await satori(element, { width: 1200, height: 630, fonts });
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });
  return resvg.render().asPng();
}

async function main() {
  const interFont = loadFont('inter-400.ttf', 'Inter', 400);
  const interBoldFont = loadFont('inter-700.ttf', 'Inter', 700);
  const loraFont = loadFont('lora-700.ttf', 'Lora', 700);
  const fonts = [interFont, interBoldFont, loraFont];

  const oldManifest = loadManifest();
  const manifest = {};

  for (const card of buildStaticCards()) {
    const outputPath = path.join(ogDir, `${card.id}.png`);
    const hash = staticHash(card);
    manifest[card.id] = hash;

    if (fs.existsSync(outputPath) && oldManifest[card.id] === hash) {
      continue;
    }

    fs.writeFileSync(outputPath, await renderPng(staticCardElement(card), fonts));
    console.log(`Generated OG image: ${card.id}.png`);
  }

  for (const article of articlesIndex) {
    const outputPath = path.join(ogDir, `${article.slug}.png`);
    const hash = articleHash(article);
    manifest[article.slug] = hash;

    // Skip only when the image exists AND was rendered from the same
    // title/type — corrected titles regenerate.
    if (fs.existsSync(outputPath) && oldManifest[article.slug] === hash) {
      continue;
    }

    fs.writeFileSync(outputPath, await renderPng(articleCardElement(article), fonts));
    console.log(`Generated OG image: ${article.slug}.png`);
  }

  // Deterministic manifest: static cards + current index slugs only, sorted.
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  fs.writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');

  console.log('OG image generation complete.');
}

main().catch((err) => {
  console.error('OG image generation failed:', err);
  process.exit(1);
});
