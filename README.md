# Minseok Kim - Personal Research Portfolio

A modern, high-performance personal website built with Next.js, TypeScript, and Tailwind CSS. This portfolio showcases academic publications, research projects, and technical writings.

## Features

### Performance & SEO
- **Static Site Generation (SSG)**: Pre-rendered pages for optimal performance
- **Automatic Sitemap**: Generated sitemap for search engines
- **SEO Optimized**: Meta tags, Open Graph, Twitter Cards, and structured data
- **Image Optimization**: Optimized images for fast loading
- **Code Splitting**: Automatic code splitting for faster page loads

### User Experience
- **Dark/Light Theme**: Persistent theme preference with system preference detection
- **Responsive Design**: Mobile-first design that works on all devices
- **Fast Navigation**: Client-side routing with instant page transitions
- **Advanced Search**: Full-text search with fuzzy matching on writings
- **Tag Filtering**: Multi-select tag filtering system

### Content Management
- **Markdown Support**: Write articles in Markdown with YAML frontmatter
- **Syntax Highlighting**: Code blocks with Highlight.js
- **Math Rendering**: LaTeX math equations with KaTeX
- **Table of Contents**: Auto-generated TOC for articles
- **Reading Time**: Automatic reading time estimation

### Security
- **Security Headers**: Comprehensive security headers (CSP, HSTS, X-Frame-Options, etc.)
- **No External Dependencies**: All critical code is self-hosted
- **CodeQL Scanning**: Automated security scanning with GitHub Actions

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Markdown**: [unified](https://unifiedjs.com/) ecosystem (remark, rehype)
- **Syntax Highlighting**: [Highlight.js](https://highlightjs.org/)
- **Math Rendering**: [KaTeX](https://katex.org/)
- **Deployment**: GitHub Pages via GitHub Actions

## Project Structure

```
nextjs-site/
├── .github/
│   └── workflows/
│       ├── deploy.yml          # GitHub Pages deployment
│       └── codeql.yml          # Security scanning
├── public/
│   ├── images/                 # Static images
│   └── .nojekyll              # GitHub Pages config
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx         # Root layout with header/footer
│   │   ├── page.tsx           # Home/About page
│   │   ├── papers/            # Papers listing
│   │   ├── code/              # Projects listing
│   │   ├── writing/           # Writing hub with search
│   │   │   └── [slug]/        # Dynamic article pages
│   │   ├── sitemap.ts         # Dynamic sitemap
│   │   └── robots.ts          # Robots.txt
│   ├── components/
│   │   ├── Header.tsx         # Site header with navigation
│   │   ├── Footer.tsx         # Site footer
│   │   └── WritingHub.tsx     # Search and filter component
│   ├── content/
│   │   └── articles/          # Markdown article source files
│   ├── data/
│   │   ├── papers.json        # Publications data
│   │   ├── projects.json      # Projects data
│   │   └── articles-index.json # Articles metadata
│   ├── lib/
│   │   ├── theme.tsx          # Theme context provider
│   │   └── markdown.ts        # Markdown processing utilities
│   └── styles/
│       └── globals.css        # Global styles and Tailwind
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

## Getting Started

### Prerequisites
- Node.js 18.x or later
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/DenisKimskku/DenisKimskku.github.io.git
cd nextjs-site
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run export` - Build and export static site

### Adding Content

#### Add a Paper
Edit `src/data/papers.json`:
```json
{
  "year": "2025",
  "title": "Your Paper Title",
  "authors": ["Author 1", "Author 2"],
  "conference": "Conference Name",
  "description": "Brief description",
  "pdfUrl": "https://...",
  "codeUrl": "https://..."
}
```

#### Add a Project
Edit `src/data/projects.json`:
```json
{
  "title": "Project Name",
  "description": "Description",
  "githubUrl": "https://github.com/..."
}
```

#### Add an Article
1. Create a markdown file in `src/content/articles/your-article.md`
2. Add YAML frontmatter:
```markdown
---
title: Your Article Title
date: 2025-11-22
type: Research Paper
description: Brief description
tags: [AI, Security, RAG]
---

Your content here...
```
3. Update `src/data/articles-index.json`

### Theme Customization

Modify colors in `tailwind.config.ts` and `src/styles/globals.css`:

```css
:root {
  --color-bg: #ffffff;
  --color-text: #1d1d1f;
  --color-accent: #007aff;
  /* ... */
}

.dark {
  --color-bg: #000000;
  --color-text: #f5f5f7;
  --color-accent: #0a84ff;
  /* ... */
}
```

## Deployment

### GitHub Pages (Automated)

1. Enable GitHub Pages in repository settings
2. Set source to "GitHub Actions"
3. Push to main branch
4. GitHub Actions will automatically build and deploy

### Manual Deployment

1. Build the static site:
```bash
npm run build
```

2. The `out/` directory contains the static site
3. Deploy to any static hosting service

## Performance

- **Lighthouse Score**: 95+ across all metrics
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Bundle Size**: Optimized with code splitting
- **Image Optimization**: Next.js automatic image optimization

## Security

- ✅ HTTPS enforced
- ✅ Security headers (HSTS, CSP, X-Frame-Options, etc.)
- ✅ No inline scripts (CSP compliant)
- ✅ Automated security scanning (CodeQL)
- ✅ Dependency vulnerability scanning
- ✅ XSS protection
- ✅ CSRF protection

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

## License

MIT License - see LICENSE file for details

## Author

**Minseok (Denis) Kim**
- Email: for8821@g.skku.edu
- Google Scholar: [Profile](https://scholar.google.com/citations?user=81uf6x0AAAAJ)
- GitHub: [@DenisKimskku](https://github.com/DenisKimskku)

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Syntax highlighting by [Highlight.js](https://highlightjs.org/)
- Math rendering by [KaTeX](https://katex.org/)
