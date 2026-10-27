@echo off
setlocal
cd /d "%~dp0"

echo ===================================================
echo   Stopping Lumos Agent...
echo ===================================================

set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5189 " ^| findstr "LISTENING"') do (
    set FOUND=1
    echo Terminating Lumos Agent process (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

if "%FOUND%"=="1" (
    echo Lumos Agent server has been stopped.
) else (
    echo Lumos Agent server is not currently running.
)

if not "%~1"=="silent" (
    echo.
    timeout /t 2 >nul 2>&1
)
exit /b 0
