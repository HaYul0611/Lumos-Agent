@echo off
title Lumos Agent (Debug Mode)
cd /d "%~dp0"

echo ===================================================
echo   Lumos Agent - Debug Mode (IT Admin / Developer)
echo ===================================================
echo.
echo Server URL: http://127.0.0.1:5189/
echo.

netstat -ano | findstr ":5189 " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [INFO] Port 5189 is already listening.
    echo Opening browser to active instance...
    start "" "http://127.0.0.1:5189/"
    echo.
    echo To restart in fresh debug mode, run 'Lumos-Agent-stop.bat' first.
    echo.
    pause
    exit /b 0
)

echo Opening default browser...
start "" "http://127.0.0.1:5189/"

echo.
echo Starting server with live logs (Press Ctrl+C to stop)...
echo ---------------------------------------------------
node src\server.mjs
pause
