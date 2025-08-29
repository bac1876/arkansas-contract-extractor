@echo off
REM ===================================================
REM Robust Email Monitor Startup Script
REM Starts the email monitor with robust extraction
REM ===================================================

echo =========================================
echo   ROBUST EMAIL MONITOR STARTUP
echo =========================================
echo.

REM Change to the correct directory
cd /d "C:\Users\Owner\Claude Code Projects\SmthosExp\arkansas-contract-agent"

REM Check if Node.js is available
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if required files exist
if not exist "email-monitor.ts" (
    echo ERROR: email-monitor.ts not found
    pause
    exit /b 1
)

if not exist "extraction-robust.ts" (
    echo ERROR: extraction-robust.ts not found
    pause
    exit /b 1
)

REM Check environment variables
if "%OPENAI_API_KEY%"=="" (
    echo WARNING: OPENAI_API_KEY not set in environment
    echo Checking .env file...
)

echo [%date% %time%] Starting Robust Email Monitor...
echo.
echo Features:
echo - Multiple retry attempts for each extraction
echo - Automatic fallback to GPT-4o if GPT-5 fails
echo - Partial extraction recovery
echo - Never gives up without trying everything
echo.
echo Press Ctrl+C to stop the monitor
echo =========================================
echo.

REM Start the email monitor
node -r ts-node/register email-monitor.ts

REM If the monitor exits, show error and restart option
echo.
echo =========================================
echo Monitor stopped at %date% %time%
echo.
echo Press any key to restart or Ctrl+C to exit...
pause >nul
goto :restart

:restart
echo Restarting monitor...
timeout /t 3 /nobreak >nul
cls
call "%~f0"