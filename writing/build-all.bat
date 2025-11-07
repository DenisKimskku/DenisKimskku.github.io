@echo off
REM ============================================
REM All-in-One Build Script for Writing Section
REM ============================================
echo.
echo ==========================================
echo   Building Writing Section
echo ==========================================
echo.

REM Step 1: Build HTML from markdown
echo [1/3] Converting markdown to HTML...
python build_html.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] HTML build failed!
    pause
    exit /b 1
)
echo [OK] HTML build complete
echo.

REM Step 2: Update articles index
echo [2/3] Updating articles index...
python update-index.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Index update failed!
    pause
    exit /b 1
)
echo [OK] Index updated
echo.

REM Step 3: Update sitemap
echo [3/3] Updating sitemap.xml...
python update_sitemap.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Sitemap update failed!
    pause
    exit /b 1
)
echo [OK] Sitemap updated
echo.

echo ==========================================
echo   Build Complete!
echo ==========================================
echo.
echo Next steps:
echo   1. Review generated files in articles/
echo   2. Test locally: cd .. ^&^& python -m http.server 8000
echo   3. Commit: git add . ^&^& git commit -m "Add/update articles"
echo   4. Deploy: git push
echo.
pause
