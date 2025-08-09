#!/bin/bash
# Simple script to update the articles index

echo "🔍 Updating articles index..."
cd "$(dirname "$0")"
python3 update-index.py
echo "✅ Done! Commit and push the updated articles-index.json to see changes on your website."