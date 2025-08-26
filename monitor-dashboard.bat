@echo off
echo ===================================
echo Email Monitor Live Dashboard
echo ===================================
echo.
echo Starting live monitoring dashboard...
echo Press Ctrl+C to exit
echo.
cd /d "%~dp0"
npm run monitor-watch
pause