#!/bin/bash
# ============================================
# All-in-One Build Script for Writing Section
# ============================================

set -e  # Exit on error

echo ""
echo "=========================================="
echo "  Building Writing Section"
echo "=========================================="
echo ""

# Step 1: Build HTML from markdown
echo "[1/3] Converting markdown to HTML..."
python3 build_html.py
echo "[OK] HTML build complete"
echo ""

# Step 2: Update articles index
echo "[2/3] Updating articles index..."
python3 update-index.py
echo "[OK] Index updated"
echo ""

# Step 3: Update sitemap
echo "[3/3] Updating sitemap.xml..."
python3 update_sitemap.py
echo "[OK] Sitemap updated"
echo ""

echo "=========================================="
echo "  Build Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Review generated files in articles/"
echo "  2. Test locally: cd .. && python3 -m http.server 8000"
echo "  3. Commit: git add . && git commit -m 'Add/update articles'"
echo "  4. Deploy: git push"
echo ""
