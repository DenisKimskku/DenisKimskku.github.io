#!/usr/bin/env python3
"""
Automatic Article Index Updater for Writing System
Scans all .md files in the writing directory and updates articles-index.json
"""

import os
import json
import re
from pathlib import Path
from typing import Dict, List, Any

def parse_frontmatter(content: str) -> Dict[str, Any]:
    """Parse YAML frontmatter from markdown content."""
    frontmatter_pattern = r'^---\s*\n(.*?)\n---\s*\n'
    match = re.search(frontmatter_pattern, content, re.DOTALL)

    if not match:
        return {}

    frontmatter_text = match.group(1)
    frontmatter = {}

    for line in frontmatter_text.split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip()

            # Remove quotes
            value = value.strip('"').strip("'")

            # Parse arrays (tags)
            if value.startswith('[') and value.endswith(']'):
                try:
                    # Convert single quotes to double quotes for JSON parsing
                    value_json = value.replace("'", '"')
                    value = json.loads(value_json)
                except json.JSONDecodeError:
                    # Fallback: split by comma and clean up
                    value = [item.strip().strip('"').strip("'") for item in value[1:-1].split(',')]

            frontmatter[key] = value

    return frontmatter

def extract_image_paths(markdown: str) -> List[str]:
    """
    Extract image paths from markdown content.
    Supports:
      - Markdown: ![alt](path "optional title")
        (now tolerant of optional whitespace before ')', with or without a title)
      - HTML: <img src="path" ...>
    Returns raw paths as found in the document.
    """
    # Allow optional whitespace before closing ')' even when there's no title.
    md_img_pattern = r'!\[[^\]]*\]\(\s*([^)\s]+)\s*(?:(?:"[^"]*"|\'[^\']*\'))?\s*\)'
    html_img_pattern = r'<img[^>]+src=["\']([^"\']+)["\']'

    md_paths = re.findall(md_img_pattern, markdown)
    html_paths = re.findall(html_img_pattern, markdown)

    # Debug aid: print what we found (safe to leave in)
    if not md_paths and not html_paths:
        print("       (debug) No images matched. Common causes: reference-style images, fenced code blocks, or nonstandard shortcodes.")
    else:
        print(f"       (debug) Found {len(md_paths)} markdown and {len(html_paths)} HTML image(s).")
        for p in (md_paths + html_paths):
            print(f"         - {p}")

    return md_paths + html_paths


def is_external_path(p: str) -> bool:
    """Heuristically decide if an image path is external (URL or data URI)."""
    p_strip = p.strip().lower()
    return ("://" in p_strip) or p_strip.startswith("data:")

def required_images_folder(date_str: str, article_name: str) -> str:
    """
    Return the required folder (POSIX, trailing slash) for images, based on date rule:
      - 2025-11-06 -> images/251106/
      - else -> figures/<article_name>/
    """
    special_date = "2025-11-06"
    if date_str.startswith(special_date):
        yymmdd = date_str[:10].replace('-', '')[2:]  # '2025-11-06' -> '251106'
        return f"images/{yymmdd}/"
    return f"figures/{article_name}/"

def ensure_folder(directory: Path, rel_folder: str) -> None:
    target = directory / Path(rel_folder)
    target.mkdir(parents=True, exist_ok=True)

def validate_images(
    directory: Path,
    article_name: str,
    date_str: str,
    content: str
) -> Dict[str, Any]:
    """
    Validate that:
      1) The markdown has at least one image (markdown or HTML).
      2) All *local* images are inside the required folder.
      3) All *local* images actually exist on disk.
    Returns dict {ok: bool, errors: [..], images: [...] , required_folder: str}
    """
    imgs = extract_image_paths(content)
    req_folder = required_images_folder(date_str, article_name)

    errors = []
    if not imgs:
        errors.append("No images found in markdown (must include at least one).")

    # Normalize helper
    def norm_local_path(p: str) -> str:
        p2 = p.strip().lstrip("./").replace("\\", "/")
        return p2

    for raw in imgs:
        if is_external_path(raw):
            # External images are allowed but do not need to be in local folder
            # If you want to forbid them, convert this into an error.
            continue
        p_norm = norm_local_path(raw)

        # 2) path must start with required folder
        if not p_norm.startswith(req_folder):
            errors.append(
                f"Local image path not in required folder: '{raw}' "
                f"(expected prefix: '{req_folder}')"
            )
            continue

        # 3) file must exist
        abs_path = directory / Path(p_norm)
        if not abs_path.exists():
            errors.append(f"Referenced local image does not exist on disk: '{raw}'")

    ok = len(errors) == 0
    return {"ok": ok, "errors": errors, "images": imgs, "required_folder": req_folder}

def scan_markdown_files(directory: Path) -> List[Dict[str, Any]]:
    """Scan directory for .md files and extract their metadata; enforce image checks."""
    articles = []

    # Find all .md files except template.md
    md_files = [f for f in directory.glob('*.md') if f.name != 'template.md']

    print(f"Found {len(md_files)} markdown files to process:")

    for md_file in sorted(md_files):
        print(f"  📄 Processing {md_file.name}...")

        try:
            content = md_file.read_text(encoding='utf-8')
            frontmatter = parse_frontmatter(content)

            if not frontmatter:
                print(f"    ⚠️  No frontmatter found in {md_file.name}")
                continue

            article_name = md_file.stem
            date_str = str(frontmatter.get('date', '')).strip()

            # Determine required folder from date rule and ensure it exists
            req_folder = required_images_folder(date_str, article_name)
            ensure_folder(directory, req_folder)
            print(f"    📁 Required image folder: {req_folder}")

            # Validate images presence & location
            check = validate_images(directory, article_name, date_str, content)
            if not check["ok"]:
                print("    ❌ Image validation failed:")
                for e in check["errors"]:
                    print(f"       - {e}")
                print("    ⏭️  Skipping this article due to image rule violation.")
                continue
            else:
                print(f"    ✅ Image validation passed ({len(check['images'])} image(s) found).")

            # Create article metadata
            article = {
                "path": md_file.name,
                "title": frontmatter.get('title', 'Untitled'),
                "date": date_str,
                "type": frontmatter.get('type', 'Article'),
                "description": frontmatter.get('description', ''),
                "tags": frontmatter.get('tags', []),
                "figures_path": req_folder  # stays as key name for backwards compatibility
            }

            articles.append(article)
            print(f"    ✅ Added: {article['title']}")
            print(f"       📅 {article['date']} | 🏷️ {len(article['tags'])} tags")
            print(f"       📸 Folder: {article['figures_path']}")

        except Exception as e:
            print(f"    ❌ Error processing {md_file.name}: {e}")

    return articles

def update_index_file(articles: List[Dict[str, Any]], index_path: Path) -> None:
    """Update the articles-index.json file and inline data in HTML."""
    # Sort articles by date (newest first)
    articles.sort(key=lambda x: x['date'], reverse=True)

    print(f"\n💾 Writing {len(articles)} articles to {index_path.name}...")

    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)

    print("✅ Index file updated successfully!")

    # Update inline data in HTML file for instant loading
    update_inline_html_data(articles, index_path.parent)

def update_inline_html_data(articles: List[Dict[str, Any]], directory: Path) -> None:
    """Update the inline articles data in the HTML file for instant loading."""
    html_file = directory / 'index.html'

    if not html_file.exists():
        print("⚠️  HTML file not found, skipping inline data update")
        return

    print("🔄 Updating inline data in HTML file...")

    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()

        # Convert articles to JavaScript array format
        articles_js = json.dumps(articles, indent=16, ensure_ascii=False)

        # Find and replace the inline data function - try multiple patterns
        patterns = [
            r'(// Inline data for instant loading\s+function getInlineArticlesData\(\) \{\s+return\s+)(\[[\s\S]*?\])(;\s+\})',
            r'(function getInlineArticlesData\(\) \{\s+return\s+)(\[[\s\S]*?\])(;\s+\})',
            r'(return\s+)(\[[\s\S]*?\])(;\s+\}\s*$)',
        ]

        new_html_content = html_content
        pattern_found = False

        for i, pattern in enumerate(patterns):
            match = re.search(pattern, html_content, flags=re.DOTALL | re.MULTILINE)
            if match:
                print(f"✅ Found pattern {i+1}")
                replacement = f'\\1{articles_js}\\3'
                new_html_content = re.sub(pattern, replacement, html_content, flags=re.DOTALL | re.MULTILINE)
                pattern_found = True
                break

        if pattern_found and new_html_content != html_content:
            with open(html_file, 'w', encoding='utf-8') as f:
                f.write(new_html_content)
            print("✅ Inline HTML data updated successfully!")
        elif not pattern_found:
            print("⚠️  Could not find any inline data pattern in HTML file")
        else:
            print("✅ Inline data is already up to date")

    except Exception as e:
        print(f"❌ Error updating inline HTML data: {e}")

def main():
    """Main function to update the articles index."""
    print("🔍 Automatic Article Index Updater")
    print("=" * 40)

    # Get the directory where this script is located (writing directory)
    script_dir = Path(__file__).parent
    print(f"📁 Working directory: {script_dir}")

    # Scan for markdown files
    articles = scan_markdown_files(script_dir)

    if not articles:
        print("\n⚠️  No articles passed validation (or no valid frontmatter)!")
        return

    # Update index file
    index_path = script_dir / 'articles-index.json'
    update_index_file(articles, index_path)

    print("\n📊 Summary:")
    print(f"  • Total articles: {len(articles)}")
    print(f"  • Index file: {index_path}")
    print("\n🎉 All done! Your articles will now load instantly on the website.")

if __name__ == '__main__':
    main()
