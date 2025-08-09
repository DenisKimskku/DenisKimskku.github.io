@echo off
echo 🔍 Updating articles index...
cd /d "%~dp0"
python update-index.py
echo ✅ Done! Commit and push the updated articles-index.json to see changes on your website.
pause