#!/usr/bin/env python3
"""
Automatic Article Index Updater for Writing System
Scans all .md files in the writing directory and updates articles-index.json
"""

import os
import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional

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

def scan_markdown_files(directory: Path) -> List[Dict[str, Any]]:
    """Scan directory for .md files and extract their metadata."""
    articles = []
    figures_dir = directory / 'figures'
    
    # Find all .md files except template.md
    md_files = [f for f in directory.glob('*.md') if f.name != 'template.md']
    
    print(f"Found {len(md_files)} markdown files to process:")
    
    for md_file in sorted(md_files):
        print(f"  📄 Processing {md_file.name}...")
        
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            frontmatter = parse_frontmatter(content)
            
            if not frontmatter:
                print(f"    ⚠️  No frontmatter found in {md_file.name}")
                continue
            
            # Create figure folder for this article if it doesn't exist
            article_name = md_file.stem  # filename without extension
            figure_folder = figures_dir / article_name
            if not figure_folder.exists():
                figure_folder.mkdir(parents=True, exist_ok=True)
                print(f"    📁 Created figure folder: {figure_folder.relative_to(directory)}")
            
            # Create article metadata
            article = {
                "path": md_file.name,
                "title": frontmatter.get('title', 'Untitled'),
                "date": frontmatter.get('date', ''),
                "type": frontmatter.get('type', 'Article'),
                "description": frontmatter.get('description', ''),
                "tags": frontmatter.get('tags', []),
                "figures_path": f"figures/{article_name}/"
            }
            
            articles.append(article)
            print(f"    ✅ Added: {article['title']}")
            print(f"       📅 {article['date']} | 🏷️ {len(article['tags'])} tags")
            print(f"       📸 Figures: {article['figures_path']}")
            
        except Exception as e:
            print(f"    ❌ Error processing {md_file.name}: {e}")
    
    return articles

def update_index_file(articles: List[Dict[str, Any]], index_path: Path) -> None:
    """Update the articles-index.json file."""
    # Sort articles by date (newest first)
    articles.sort(key=lambda x: x['date'], reverse=True)
    
    print(f"\n💾 Writing {len(articles)} articles to {index_path.name}...")
    
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)
    
    print("✅ Index file updated successfully!")

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
        print("\n⚠️  No articles found with valid frontmatter!")
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