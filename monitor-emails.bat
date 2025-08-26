@echo off
echo ===================================
echo Arkansas Contract Email Monitor
echo ===================================
echo.
echo Monitoring contractextraction@gmail.com for new contracts...
echo Press Ctrl+C to stop
echo.
cd /d "%~dp0"
npx ts-node email-monitor-service.ts
pause