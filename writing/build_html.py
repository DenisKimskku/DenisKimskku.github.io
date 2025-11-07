#!/usr/bin/env python3
"""
build_html.py - Convert markdown articles to static HTML pages for SEO

This script converts markdown files in the writing directory to static HTML pages
with proper SEO metadata, making them fully indexable by search engines.
"""

import os
import re
import json
import yaml
from pathlib import Path
from datetime import datetime
import markdown
from markdown.extensions import fenced_code, tables, toc, codehilite, extra
import html

# Configuration
WRITING_DIR = Path(__file__).parent
SRC_DIR = WRITING_DIR / "src"  # Source markdown files
OUTPUT_DIR = WRITING_DIR / "articles"  # Generated HTML files
TEMPLATE_FILE = WRITING_DIR / "article-template.html"
INDEX_FILE = WRITING_DIR / "articles-index.json"

def parse_frontmatter(content):
    """Extract YAML frontmatter from markdown content"""
    frontmatter_regex = r'^---\s*\n(.*?)\n---\s*\n(.*)$'
    match = re.match(frontmatter_regex, content, re.DOTALL)

    if match:
        try:
            frontmatter = yaml.safe_load(match.group(1))
            body = match.group(2)
            return frontmatter, body
        except yaml.YAMLError as e:
            print(f"Error parsing YAML frontmatter: {e}")
            return {}, content

    return {}, content

def calculate_reading_time(text):
    """Calculate estimated reading time based on word count"""
    words = len(re.findall(r'\w+', text))
    minutes = max(1, round(words / 200))  # Average reading speed: 200 words/minute
    return minutes

def extract_headings(html_content):
    """Extract headings for table of contents"""
    heading_pattern = r'<h([2-3])[^>]*id="([^"]*)"[^>]*>(.*?)</h\1>'
    headings = []

    for match in re.finditer(heading_pattern, html_content):
        level = int(match.group(1))
        heading_id = match.group(2)
        heading_text = match.group(3)

        # Strip HTML tags and decode HTML entities
        heading_text = re.sub(r'<[^>]+>', '', heading_text)
        heading_text = html.unescape(heading_text)

        headings.append({
            'level': level,
            'id': heading_id,
            'text': heading_text
        })

    return headings

def generate_toc_html(headings):
    """Generate HTML for table of contents"""
    if not headings or len(headings) < 3:
        return ""

    toc_html = ['<nav class="table-of-contents">', '<h4>Table of Contents</h4>', '<ul>']

    for heading in headings:
        indent_class = 'toc-level-3' if heading['level'] == 3 else ''
        toc_html.append(
            f'<li class="{indent_class}"><a href="#{heading["id"]}">{html.escape(heading["text"])}</a></li>'
        )

    toc_html.append('</ul></nav>')
    return '\n'.join(toc_html)

def process_images(content, article_slug, date_str):
    """Process image paths to use correct directory structure"""
    # Determine image directory based on date
    if date_str:
        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            img_dir = f"../images/{date_obj.strftime('%y%m%d')}"
        except ValueError:
            img_dir = f"../figures/{article_slug}"
    else:
        img_dir = f"../figures/{article_slug}"

    # Replace image paths in markdown
    def replace_img(match):
        alt_text = match.group(1)
        img_src = match.group(2)

        # Skip external URLs
        if img_src.startswith('http') or img_src.startswith('//'):
            return match.group(0)

        # Skip already processed paths with ../ prefix
        if img_src.startswith('../images/') or img_src.startswith('../figures/'):
            return match.group(0)

        # If it starts with images/ or figures/, add ../
        if img_src.startswith('images/') or img_src.startswith('figures/'):
            return f'![{alt_text}](../{img_src})'

        # Update path with relative path from articles/ directory
        new_src = f"{img_dir}/{img_src}"
        return f'![{alt_text}]({new_src})'

    content = re.sub(r'!\[(.*?)\]\(([^)]+)\)', replace_img, content)
    return content

def markdown_to_html(md_content, article_slug, frontmatter):
    """Convert markdown content to HTML with enhanced features"""
    # Process images
    md_content = process_images(md_content, article_slug, frontmatter.get('date'))

    # Remove first H1 if it matches the title
    title = frontmatter.get('title', '')
    if title:
        md_content = re.sub(r'^#\s+' + re.escape(title) + r'\s*\n', '', md_content, flags=re.MULTILINE)

    # Configure markdown extensions
    md = markdown.Markdown(extensions=[
        'fenced_code',
        'tables',
        'toc',
        'codehilite',
        'extra',
        'nl2br',
        'sane_lists',
        'attr_list',
        'def_list',
    ], extension_configs={
        'toc': {
            'permalink': False,  # Disable permalink symbols
            'toc_depth': '2-3'
        },
        'codehilite': {
            'css_class': 'highlight',
            'linenums': False
        }
    })

    # Convert to HTML
    html_content = md.convert(md_content)

    return html_content

def generate_article_html(md_file):
    """Generate HTML file from markdown file"""
    print(f"Processing: {md_file.name}")

    # Read markdown file
    with open(md_file, 'r', encoding='utf-8') as f:
        raw_content = f.read()

    # Parse frontmatter
    frontmatter, body = parse_frontmatter(raw_content)

    # Get metadata
    title = frontmatter.get('title', md_file.stem)
    description = frontmatter.get('description', '')
    date_str = frontmatter.get('date', '')
    article_type = frontmatter.get('type', 'Article')
    tags = frontmatter.get('tags', [])

    # Generate slug from filename
    article_slug = md_file.stem

    # Convert markdown to HTML
    html_content = markdown_to_html(body, article_slug, frontmatter)

    # Extract headings for TOC
    headings = extract_headings(html_content)
    toc_html = generate_toc_html(headings)

    # Calculate reading time
    reading_time = calculate_reading_time(body)

    # Read template
    with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
        template = f.read()

    # Format date
    formatted_date = date_str
    if date_str:
        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            formatted_date = date_obj.strftime("%B %d, %Y")
        except ValueError:
            pass

    # Generate tags HTML
    tags_html = ''
    if tags:
        tags_list = [f'<span class="article-tag">{html.escape(tag)}</span>' for tag in tags]
        tags_html = f'<div class="article-tags">{"".join(tags_list)}</div>'

    # Generate JSON-LD structured data for SEO
    json_ld = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        "datePublished": date_str,
        "author": {
            "@type": "Person",
            "name": "Minseok (Denis) Kim",
            "url": "https://deniskimskku.github.io"
        },
        "publisher": {
            "@type": "Person",
            "name": "Minseok (Denis) Kim"
        }
    }

    if tags:
        json_ld["keywords"] = ", ".join(tags)

    json_ld_html = f'<script type="application/ld+json">{json.dumps(json_ld, indent=2)}</script>'

    # Replace template variables
    html_output = template.replace('{{TITLE}}', html.escape(title))
    html_output = html_output.replace('{{DESCRIPTION}}', html.escape(description))
    html_output = html_output.replace('{{DATE}}', formatted_date)
    html_output = html_output.replace('{{ISO_DATE}}', date_str)
    html_output = html_output.replace('{{TYPE}}', html.escape(article_type))
    html_output = html_output.replace('{{READING_TIME}}', str(reading_time))
    html_output = html_output.replace('{{TAGS}}', tags_html)
    html_output = html_output.replace('{{TABLE_OF_CONTENTS}}', toc_html)
    html_output = html_output.replace('{{CONTENT}}', html_content)
    html_output = html_output.replace('{{JSON_LD}}', json_ld_html)
    html_output = html_output.replace('{{SLUG}}', article_slug)

    # Create output directory if it doesn't exist
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Write HTML file
    output_file = OUTPUT_DIR / f"{article_slug}.html"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_output)

    print(f"  [OK] Generated: {output_file.name}")

    return {
        'slug': article_slug,
        'title': title,
        'description': description,
        'date': date_str,
        'type': article_type,
        'tags': tags,
        'path': f"articles/{article_slug}.html"
    }

def build_all_articles():
    """Build HTML files for all markdown articles"""
    print("Building static HTML articles...")
    print("=" * 50)

    # Create src directory if it doesn't exist
    SRC_DIR.mkdir(exist_ok=True)

    # Find all markdown files in src/ directory (excluding template and README)
    md_files = [f for f in SRC_DIR.glob("*.md") if not f.stem.startswith('README') and f.stem != 'template']

    # Also check root writing dir for backward compatibility
    root_md_files = [f for f in WRITING_DIR.glob("*.md") if not f.stem.startswith('README') and f.stem != 'template']

    if root_md_files:
        print(f"[INFO] Found {len(root_md_files)} markdown file(s) in root directory")
        print(f"[INFO] Please move them to src/ directory for better organization")
        md_files.extend(root_md_files)

    if not md_files:
        print("No markdown files found in src/ directory!")
        print(f"Please add your markdown articles to: {SRC_DIR}")
        return

    articles_data = []

    for md_file in md_files:
        try:
            article_data = generate_article_html(md_file)
            articles_data.append(article_data)
        except Exception as e:
            print(f"  [ERROR] Error processing {md_file.name}: {e}")
            import traceback
            traceback.print_exc()

    # Sort by date (newest first)
    articles_data.sort(key=lambda x: x['date'] if x['date'] else '0000-00-00', reverse=True)

    # Update articles-index.json with new paths
    if INDEX_FILE.exists():
        with open(INDEX_FILE, 'r', encoding='utf-8') as f:
            index_data = json.load(f)

        # Update paths in index
        for article in index_data:
            for new_article in articles_data:
                if article.get('title') == new_article['title']:
                    article['html_path'] = new_article['path']
                    break

        with open(INDEX_FILE, 'w', encoding='utf-8') as f:
            json.dump(index_data, f, indent=2, ensure_ascii=False)

    print("=" * 50)
    print(f"[SUCCESS] Successfully built {len(articles_data)} articles")
    print(f"[SUCCESS] Output directory: {OUTPUT_DIR}")

if __name__ == "__main__":
    # Check for required dependencies
    try:
        import markdown
        import yaml
    except ImportError as e:
        print(f"Error: Missing required dependency: {e}")
        print("\nPlease install required packages:")
        print("  pip install markdown pyyaml")
        exit(1)

    build_all_articles()
