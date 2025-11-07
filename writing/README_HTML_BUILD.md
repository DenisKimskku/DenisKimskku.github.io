# Static HTML Writing System

## Overview

Your writing section has been converted from client-side markdown rendering to static HTML pages. This provides:

✅ **SEO Benefits**: Search engines can now fully index your content
✅ **Faster Loading**: No client-side markdown processing required
✅ **Better Design**: Enhanced typography, table of contents, and reading time estimates
✅ **Improved Readability**: Better spacing, styling, and mobile responsiveness

## What Changed

### Before
- Articles were rendered client-side using JavaScript and Marked.js
- Search engines couldn't index the actual content (SEO issue)
- Link format: `/writing/markdown-viewer.html?md=Article.md`

### After
- Articles are pre-built as static HTML pages
- Full SEO support with proper meta tags and Schema.org structured data
- Link format: `/writing/articles/Article.html`
- Enhanced design with table of contents, reading time, and improved typography

## How to Add New Articles

1. **Write your article** in markdown format in the `writing/src/` directory
   - Use the YAML frontmatter format:
   ```yaml
   ---
   title: "Your Article Title"
   date: "YYYY-MM-DD"
   type: "Article Type"
   description: "Brief description"
   tags: ["Tag1", "Tag2", "Tag3"]
   ---
   ```

2. **Add images** to the appropriate directory:
   - For articles from 2025: `writing/images/YYMMDD/`
   - For other articles: `writing/figures/article_slug/`

3. **Build everything** with one command:
   ```bash
   # Windows:
   cd writing
   build-all.bat

   # Linux/Mac:
   cd writing
   ./build-all.sh
   ```

   This automatically:
   - Converts markdown to HTML
   - Updates articles index
   - Updates sitemap.xml

4. **Commit and push** to GitHub

## Files Structure

```
writing/
├── src/                         # 📝 Source markdown files (write here!)
│   └── Rescuing_the_unpoisoned.md
├── articles/                    # ✅ Generated HTML files (SEO-friendly)
│   └── Rescuing_the_unpoisoned.html
├── images/                      # 🖼️  Images organized by date
│   └── 251106/
├── figures/                     # 🖼️  Legacy images by article
├── build-all.bat               # 🚀 All-in-one build script (Windows)
├── build-all.sh                # 🚀 All-in-one build script (Linux/Mac)
├── build_html.py               # 🔧 Converts markdown to HTML
├── article-template.html       # 🎨 HTML template with enhanced design
├── update-index.py             # 🔧 Updates articles-index.json
├── update_sitemap.py           # 🔧 Updates sitemap.xml
├── articles-index.json         # 📋 Article metadata
├── index.html                  # 🏠 Writing section landing page
└── template.md                 # 📄 Article template
```

## Enhanced Features

### Table of Contents
- Automatically generated from H2 and H3 headings
- Only appears if article has 3+ headings
- Smooth scrolling navigation

### Reading Time
- Calculated based on ~200 words per minute
- Displayed in article header

### SEO Optimization
- Proper meta tags (title, description, keywords)
- Open Graph tags for social media
- Twitter Card support
- Schema.org structured data (JSON-LD)
- Canonical URLs
- Semantic HTML5

### Design Improvements
- Enhanced typography with better hierarchy
- Improved code block styling with syntax highlighting
- Better image presentation with hover effects
- Responsive design for mobile devices
- Print-friendly styles
- Dark mode support

## Build Script Details

The `build_html.py` script:
1. Reads all `.md` files in the writing directory
2. Parses YAML frontmatter
3. Converts markdown to HTML using Python-Markdown
4. Processes image paths based on date
5. Generates table of contents
6. Calculates reading time
7. Applies the article template
8. Outputs static HTML files to `articles/` directory
9. Updates `articles-index.json` with HTML paths

## Testing Checklist

- [ ] Articles load correctly at `/writing/articles/[slug].html`
- [ ] Table of contents navigation works
- [ ] Images display correctly
- [ ] Code blocks have syntax highlighting
- [ ] Math equations render (if using LaTeX)
- [ ] Links work properly
- [ ] Mobile responsive design looks good
- [ ] Dark mode works
- [ ] Meta tags are correct (view page source)

## SEO Verification

To verify Google can index your content:

1. **View page source** - You should see the full HTML content, not JavaScript loaders
2. **Test with Google's Rich Results Test**: https://search.google.com/test/rich-results
3. **Submit to Google Search Console**: https://search.google.com/search-console
4. **Update sitemap.xml** to include new article URLs
5. **Verify robots.txt** doesn't block the articles directory

## Maintenance

### When you add a new article:
```bash
cd writing
# Write your article in src/my-article.md
./build-all.sh    # or build-all.bat on Windows
git add src/ articles/ articles-index.json ../sitemap.xml
git commit -m "Add new article: [Title]"
git push
```

### When you update an existing article:
```bash
cd writing
# Edit your article in src/my-article.md
./build-all.sh    # or build-all.bat on Windows
git add src/ articles/
git commit -m "Update article: [Title]"
git push
```

### Quick rebuild (just HTML, no index/sitemap):
```bash
cd writing
python build_html.py
```

## Dependencies

Required Python packages:
```bash
pip install markdown pyyaml
```

## Troubleshooting

### Issue: Images not showing
- Check image path matches date-based or figures-based structure
- Verify image files exist in correct directory

### Issue: Math equations not rendering
- Check KaTeX script is loading
- Verify syntax: use `$...$` for inline, `$$...$$` for display

### Issue: Syntax highlighting not working
- Verify highlight.js is loading
- Check code block has language specified: ` ```python`

## Migration Complete

All legacy files have been removed. The system now uses 100% static HTML for optimal SEO and performance.

## Performance

Static HTML provides:
- **Faster page loads**: No client-side markdown processing
- **Better SEO**: Content is immediately available to crawlers
- **Reduced dependencies**: No need for Marked.js, DOMPurify on article pages
- **Improved Core Web Vitals**: Better LCP, FID, and CLS scores
