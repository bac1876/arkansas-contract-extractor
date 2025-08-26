@echo off
echo ====================================
echo Arkansas Contract Email Monitor
echo ====================================
echo.

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not found!
    echo.
    echo Please create a .env file with:
    echo GMAIL_USER=contractextraction@gmail.com
    echo GMAIL_PASSWORD=your-app-password
    echo.
    pause
    exit /b 1
)

echo Starting email monitor for contractextraction@gmail.com...
echo.
echo The monitor will:
echo - Watch for incoming emails with PDF contracts
echo - Extract all 47 fields automatically
echo - Save results to processed_contracts folder
echo - Cost only $0.023 per contract using GPT-5-mini
echo.
echo Dashboard available at: http://localhost:3006/email-dashboard.html
echo.
echo Press Ctrl+C to stop the monitor
echo ====================================
echo.

node -r ts-node/register email-monitor.ts

pause