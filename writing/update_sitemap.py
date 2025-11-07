#!/usr/bin/env python3
"""
update_sitemap.py - Update sitemap.xml with article URLs

This script reads articles-index.json and updates the root sitemap.xml
to include all published articles for better SEO.
"""

import json
from pathlib import Path
from datetime import datetime
import xml.etree.ElementTree as ET

# Configuration
WRITING_DIR = Path(__file__).parent
ROOT_DIR = WRITING_DIR.parent
INDEX_FILE = WRITING_DIR / "articles-index.json"
SITEMAP_FILE = ROOT_DIR / "sitemap.xml"
BASE_URL = "https://deniskim1.com"

def update_sitemap():
    """Update sitemap.xml with article URLs"""
    print("Updating sitemap.xml with article URLs...")

    # Read articles index
    if not INDEX_FILE.exists():
        print(f"Error: {INDEX_FILE} not found!")
        return

    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        articles = json.load(f)

    # Parse existing sitemap
    if not SITEMAP_FILE.exists():
        print(f"Error: {SITEMAP_FILE} not found!")
        return

    tree = ET.parse(SITEMAP_FILE)
    root = tree.getroot()

    # Get namespace
    ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

    # Get existing article URLs
    existing_urls = set()
    for url_elem in root.findall('sm:url', ns):
        loc = url_elem.find('sm:loc', ns)
        if loc is not None and '/writing/articles/' in loc.text:
            existing_urls.add(loc.text)

    # Add new article URLs
    added_count = 0
    for article in articles:
        if 'html_path' not in article:
            continue

        article_url = f"{BASE_URL}/writing/{article['html_path']}"

        if article_url in existing_urls:
            continue

        # Create new URL element
        url_elem = ET.SubElement(root, 'url')

        loc = ET.SubElement(url_elem, 'loc')
        loc.text = article_url

        lastmod = ET.SubElement(url_elem, 'lastmod')
        lastmod.text = article.get('date', datetime.now().strftime('%Y-%m-%d'))

        changefreq = ET.SubElement(url_elem, 'changefreq')
        changefreq.text = 'monthly'

        priority = ET.SubElement(url_elem, 'priority')
        priority.text = '0.70'

        print(f"  Added: {article_url}")
        added_count += 1

    if added_count == 0:
        print("  No new articles to add to sitemap.")
        return

    # Write updated sitemap
    # Add XML declaration and formatting
    xml_str = ET.tostring(root, encoding='UTF-8', method='xml')

    with open(SITEMAP_FILE, 'wb') as f:
        f.write(b'<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write(xml_str)

    print(f"\n[SUCCESS] Added {added_count} article(s) to sitemap.xml")
    print(f"[SUCCESS] Updated: {SITEMAP_FILE}")

if __name__ == "__main__":
    update_sitemap()
