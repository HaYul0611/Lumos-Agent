@echo off
setlocal
cd /d "%~dp0"

set EXTRA_ARGS=--demo
if not "%~1"=="" (
    if /i not "%~1"=="silent" (
        set "EXTRA_ARGS=%*"
    )
)

if /i "%~1"=="silent" goto :run_silent

:run_foreground
echo ===================================================
echo   Lumos Agent
echo ===================================================

echo [1/2] Checking Lumos Agent server status...
netstat -ano | findstr ":5189 " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Lumos Agent server is active on port 5189.
    echo [2/2] Opening default browser...
    explorer "http://127.0.0.1:5189/"
    echo.
    echo Lumos Agent is active in your browser.
    timeout /t 2 >nul 2>&1
    exit /b 0
)

echo [2/2] Starting Lumos Agent server and opening default browser...
start /b "" node src\server.mjs %EXTRA_ARGS%
timeout /t 2 >nul 2>&1
explorer "http://127.0.0.1:5189/"
exit /b 0

:run_silent
netstat -ano | findstr ":5189 " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    explorer "http://127.0.0.1:5189/"
    exit /b 0
)
start /b "" node src\server.mjs %EXTRA_ARGS%
timeout /t 2 >nul 2>&1
explorer "http://127.0.0.1:5189/"
exit /b 0
