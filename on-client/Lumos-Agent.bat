@echo off
chcp 65001 >nul
title Lumos Agent - 보안 현황 및 보호 서비스
echo ===================================================
echo   Lumos Agent 를 시작합니다...
echo   (종료하려면 이 창을 닫거나 Ctrl+C 를 누르세요)
echo ===================================================

cd /d "%~dp0"

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [오류] Node.js 실행 환경을 찾을 수 없습니다.
    echo Node.js v18 이상이 설치되어 있는지 확인해 주세요.
    pause
    exit /b 1
)

echo [1/2] 브라우저 접속 대기 중... (http://127.0.0.1:5189)
start "" "http://127.0.0.1:5189/"

echo [2/2] Lumos Agent 서버 구동 시작
node src/server.mjs
pause
