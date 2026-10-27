@echo off
setlocal
cd /d "%~dp0"

echo ===================================================
echo   Lumos Agent
echo ===================================================

echo [1/2] Opening Lumos in default browser...
explorer "http://127.0.0.1:5189/"

echo [2/2] Checking Lumos Agent server status...
netstat -ano | findstr ":5189 " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo.
    echo Lumos Agent server is already running on port 5189.
    echo You can use Lumos Agent in the opened browser window.
    echo.
    echo (Press any key to close this launcher)
    pause >nul
    exit /b 0
)

echo Starting Lumos Agent server on port 5189...
node src\server.mjs
pause
