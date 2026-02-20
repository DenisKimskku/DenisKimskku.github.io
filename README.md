# Minseok (Denis) Kim Portfolio

Personal research website for publications, writing, and projects.  
Live site: [https://deniskim1.com](https://deniskim1.com)

## Overview

- Built with Next.js App Router + TypeScript
- Statically exported for GitHub Pages
- Markdown-based writing workflow
- Built-in SEO (canonical, Open Graph, JSON-LD, sitemap, robots)
- RSS feed generation for writing

## Tech Stack

- [Next.js 16](https://nextjs.org/)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- unified ecosystem (`remark`/`rehype`) for Markdown rendering
- [Highlight.js](https://highlightjs.org/) and [KaTeX](https://katex.org/)

## Local Development

### Prerequisites

- Node.js 20+ (recommended)
- npm

### Setup

```bash
git clone https://github.com/DenisKimskku/DenisKimskku.github.io.git
cd DenisKimskku.github.io
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev`: Start local dev server
- `npm run lint`: Run ESLint
- `npm run build`: Production build + strip Twitter meta tags + generate `out/rss.xml`
- `npm run start`: Start production server
- `npm run export`: Alias of `npm run build`

## Project Layout

```text
.
├── public/
├── scripts/
│   ├── generate-rss.mjs
│   └── strip-twitter-meta.mjs
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── writing/
│   │   ├── papers/
│   │   ├── code/
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   ├── content/articles/
│   ├── data/
│   │   ├── articles-index.json
│   │   ├── papers.json
│   │   └── projects.json
│   ├── components/
│   ├── lib/
│   └── styles/
├── next.config.ts
└── package.json
```

## Content Workflow

### Add a paper

Update `src/data/papers.json`.

### Add a writing article

1. Create `src/content/articles/<slug>.md`
2. Use frontmatter:

```markdown
---
title: Your Article Title
date: 2026-02-18
type: Research Paper
description: Brief summary
tags: [AI, Security, RAG]
---
```

3. Update `src/data/articles-index.json` with matching metadata

### Update code/projects section

`/code` page content is currently defined in `src/app/code/page.tsx` (featured and project list).

## SEO Notes

- `src/app/layout.tsx`: global metadata and verification tags
- `src/app/sitemap.ts`: static + article + tag sitemap entries
- `src/app/robots.ts`: robots policy and sitemap reference
- `scripts/generate-rss.mjs`: generates `out/rss.xml` from `articles-index.json`

Optional environment variables for site verification:

- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
- `NEXT_PUBLIC_BING_SITE_VERIFICATION`

## Deployment

GitHub Pages deploys via GitHub Actions.

1. Enable GitHub Pages in repo settings
2. Set source to `GitHub Actions`
3. Push to the default branch

Build output is generated in `out/`.

## Author

Minseok (Denis) Kim

- GitHub: [@DenisKimskku](https://github.com/DenisKimskku)
- Google Scholar: [Profile](https://scholar.google.com/citations?user=81uf6x0AAAAJ)

## License

MIT (see `LICENSE`)
