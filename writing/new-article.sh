#!/bin/bash
# Script to create a new article with proper structure

if [ $# -eq 0 ]; then
    echo "Usage: $0 <article-name>"
    echo "Example: $0 my-new-research-paper"
    exit 1
fi

ARTICLE_NAME="$1"
SCRIPT_DIR="$(dirname "$0")"
WRITING_DIR="$SCRIPT_DIR"

# Create the markdown file from template
MARKDOWN_FILE="$WRITING_DIR/${ARTICLE_NAME}.md"
TEMPLATE_FILE="$WRITING_DIR/template.md"

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ Template file not found: $TEMPLATE_FILE"
    exit 1
fi

if [ -f "$MARKDOWN_FILE" ]; then
    echo "❌ Article already exists: $MARKDOWN_FILE"
    exit 1
fi

# Copy template and update the title
cp "$TEMPLATE_FILE" "$MARKDOWN_FILE"
sed -i '' "s/title: \".*\"/title: \"$(echo $ARTICLE_NAME | sed 's/-/ /g' | sed 's/\b\w/\u&/g')\"/" "$MARKDOWN_FILE"

# Create figure folder
FIGURE_DIR="$WRITING_DIR/figures/$ARTICLE_NAME"
mkdir -p "$FIGURE_DIR"

echo "✅ Created new article structure:"
echo "   📄 Markdown file: $MARKDOWN_FILE"
echo "   📁 Figure folder: $FIGURE_DIR"
echo ""
echo "🎯 Next steps:"
echo "   1. Edit the markdown file: $MARKDOWN_FILE"
echo "   2. Add figures to: $FIGURE_DIR"
echo "   3. Run ./update-index.sh to update the index"
echo ""
echo "💡 In your markdown, reference figures like: ![Description](figure1.png)"
echo "   They will automatically load from: figures/$ARTICLE_NAME/"