@echo off
echo Setting up Windows Task Scheduler for Arkansas Contract Email Monitor...
echo.

:: Create the scheduled task
:: This task will:
:: 1. Start when Windows starts
:: 2. Run every 5 minutes to ensure monitor is running
:: 3. Run with highest privileges
:: 4. Run whether user is logged in or not

schtasks /create ^
  /tn "Arkansas Contract Email Monitor" ^
  /tr "\"%cd%\monitor-keeper.bat\"" ^
  /sc ONSTART ^
  /rl HIGHEST ^
  /f

:: Add a second trigger to run every 5 minutes
schtasks /create ^
  /tn "Arkansas Contract Monitor Check" ^
  /tr "\"%cd%\monitor-keeper.bat\"" ^
  /sc MINUTE ^
  /mo 5 ^
  /rl HIGHEST ^
  /f

echo.
echo ========================================
echo Task Scheduler setup complete!
echo.
echo Two tasks have been created:
echo 1. "Arkansas Contract Email Monitor" - Starts on system boot
echo 2. "Arkansas Contract Monitor Check" - Runs every 5 minutes
echo.
echo To start the monitor now, run:
echo   monitor-keeper.bat
echo.
echo To view the tasks, run:
echo   schtasks /query /tn "Arkansas Contract Email Monitor"
echo   schtasks /query /tn "Arkansas Contract Monitor Check"
echo.
echo To delete the tasks (if needed), run:
echo   schtasks /delete /tn "Arkansas Contract Email Monitor" /f
echo   schtasks /delete /tn "Arkansas Contract Monitor Check" /f
echo ========================================
pause