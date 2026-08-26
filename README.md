# Minseok (Denis) Kim Portfolio

Personal research website for publications, writing, and projects.  
Live site: [https://deniskim1.com](https://deniskim1.com)

## Overview

- Built with Next.js App Router + TypeScript
- Statically exported for GitHub Pages
- Build-time full-text search index across all articles and digests
- Bi-directional cross-linking between research papers, code projects, and article reviews
- Theme-adaptive code blocks with dark/light mode support
- Markdown-based writing workflow with KaTeX math & syntax highlighting
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
- `npm test`: Unit tests (`node:test`, Node ≥ 24)
- `npm run generate:index`: Regenerate `src/data/articles-index.json` from the articles (also auto-repairs frontmatter escapes; `-- --strict` fails instead of repairing)
- `npm run lint:content`: Content linter (`--strict` promotes schema/authorship warnings to failures — this is what CI runs)
- `npm run build`: Full production build — image optimization, content repairs, content lint, OG cards, `next build`, RSS, resume PDF
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

1. Create `src/content/articles/<slug>.md` — slug is lowercase `[a-z0-9_]`, and becomes the URL `/writing/<slug>/`.
2. Use frontmatter. Every value is double-quoted (an unquoted date parses as a JS `Date` and breaks provenance; an unquoted title with a colon breaks YAML):

```markdown
---
title: "Your Article Title"
date: "2026-02-18"
type: "Tutorial"
description: "One complete sentence of 60-399 characters that ends with a period, is not the title, and contains no backslashes or angle brackets."
tags: ["AI Security", "RAG"]
---

# Your Article Title
```

   `type` must be one of the values in `scripts/lib/provenance.mjs` (`KNOWN_ARTICLE_TYPES`). `Research Paper` is reserved for the owner's own publications (it must match `src/data/papers.json`); `Paper Review`, `News Digest` and `Trend Report` dated on/after 2026-03-01 are treated as machine-generated and get an AI disclosure.
3. Run `npm run generate:index` — never hand-edit `src/data/articles-index.json`.
4. Run `node scripts/lint-content.mjs --strict` and fix anything it reports; CI runs the same command on every PR.

### Generated content (the daily review pipeline)

The external LLM pipeline that produces paper reviews, digests and trend reports must follow [`docs/GENERATOR-CONTRACT.md`](docs/GENERATOR-CONTRACT.md) and run the pre-push gate described there: `npm run check:article -- <new files>` (the per-article contract, one `file:line: rule-id: message` per finding) followed by `npm run gate:content`. Everything the build currently auto-repairs is listed in that document as a generator bug with its exact rule and the count that put it there.

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
