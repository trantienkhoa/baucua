@echo off
chcp 65001 >nul
title Vu Truong Neon
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Chua cai Node.js. Tai ban LTS tai https://nodejs.org roi chay lai file nay.
  start https://nodejs.org
  pause
  exit /b
)
if not exist node_modules (
  echo Dang cai dat lan dau, vui long doi...
  call npm install --omit=dev
)
start "" http://localhost:3300/admin.html
node server.js
pause
