@echo off
chcp 65001 >nul
title Tu Dang Bai - tu dang Facebook, TikTok
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Chua cai Node.js. Tai ban LTS tai https://nodejs.org roi chay lai file nay.
  start https://nodejs.org
  pause
  exit /b
)
node -e "process.exit(+process.versions.node.split('.')[0] < 20 ? 1 : 0)"
if errorlevel 1 (
  echo Node.js qua cu. Can ban 20 tro len - tai ban LTS moi tai https://nodejs.org
  start https://nodejs.org
  pause
  exit /b
)
if not exist node_modules (
  echo Dang cai dat lan dau, vui long doi...
  call npm install --omit=dev
)
start "" http://localhost:3400
echo.
echo  DE CUA SO NAY MO thi bai hen gio moi tu dang. Dong cua so = dung app.
node server.js
pause
