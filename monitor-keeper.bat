@echo off
title Arkansas Contract Agent - Monitor Keeper
cd /d "C:\Users\Owner\Claude Code Projects\SmthosExp\arkansas-contract-agent"

echo =====================================================
echo  MONITOR KEEPER - AUTO-RESTART SERVICE
echo =====================================================
echo.
echo This process ensures all monitors stay running
echo.

set counter=0

:CHECK_LOOP
REM Wait 2 minutes between checks
timeout /t 120 /nobreak >nul

REM Check if email-monitor.ts is running
tasklist /FI "WINDOWTITLE eq Email Monitor" 2>nul | find /I /N "cmd.exe">nul
if "%ERRORLEVEL%"=="1" (
    echo [%date% %time%] Email Monitor not found, restarting...
    start "Email Monitor" /min cmd /c "npx ts-node email-monitor.ts"
    timeout /t 10 /nobreak >nul
)

REM Check if health checker is running
tasklist /FI "WINDOWTITLE eq Health Checker" 2>nul | find /I /N "cmd.exe">nul
if "%ERRORLEVEL%"=="1" (
    echo [%date% %time%] Health Checker not found, restarting...
    start "Health Checker" /min cmd /c "npx ts-node monitor-health-checker.ts"
    timeout /t 10 /nobreak >nul
)

REM Show heartbeat every 10 checks (20 minutes)
set /a counter+=1
if %counter% GEQ 10 (
    echo [%date% %time%] Monitor Keeper heartbeat - all systems checked
    set counter=0
)

goto CHECK_LOOP