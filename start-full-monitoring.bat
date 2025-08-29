@echo off
title Arkansas Contract Agent - Full Monitoring System
cls

echo =====================================================
echo  ARKANSAS CONTRACT AGENT - FULL MONITORING SYSTEM
echo =====================================================
echo.
echo Starting comprehensive monitoring with redundancy...
echo.

REM Kill any existing Node processes that might be stuck
echo [1/4] Cleaning up old processes...
taskkill /F /IM node.exe /T 2>nul
timeout /t 3 /nobreak >nul

REM Start the main email monitor
echo [2/4] Starting main email monitor...
start "Email Monitor" /min cmd /c "npx ts-node email-monitor.ts"
timeout /t 5 /nobreak >nul

REM Start the health checker
echo [3/4] Starting health checker (backup monitor)...
start "Health Checker" /min cmd /c "npx ts-node monitor-health-checker.ts"
timeout /t 2 /nobreak >nul

REM Start the monitor keeper (auto-restart)
echo [4/4] Starting monitor keeper (auto-restart)...
start "Monitor Keeper" /min monitor-keeper.bat
timeout /t 2 /nobreak >nul

echo.
echo =====================================================
echo  ALL MONITORING SYSTEMS ACTIVE
echo =====================================================
echo.
echo Running processes:
echo  - Email Monitor: Checking offers@searchnwa.com every 30s
echo  - Health Checker: Monitoring system health every 60s
echo  - Monitor Keeper: Auto-restart on failure
echo.
echo System files:
echo  - extraction_status.json: Extraction history
echo  - system_health.json: Health metrics
echo  - manual_review_queue.json: Failed contracts
echo  - monitor_alerts.log: System alerts
echo.
echo Press Ctrl+C to stop all monitoring...
echo.

REM Keep this window open to monitor output
:MONITOR_LOOP
timeout /t 300 /nobreak >nul
echo [%date% %time%] Systems still running...
goto MONITOR_LOOP