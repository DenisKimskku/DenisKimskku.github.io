@echo off
REM Build script for Windows
echo Building HTML articles...
python build_html.py
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Build successful!
    echo Check writing/articles/ for generated HTML files.
) else (
    echo.
    echo Build failed! Check errors above.
)
pause
