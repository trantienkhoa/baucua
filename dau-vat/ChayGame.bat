@echo off
chcp 65001 >nul
title Dai Chien Do Vat - MEGA SLAM
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
if not exist public\models\custom\fighter.fbx (
  echo.
  echo  [!] Chua co mo hinh public\models\custom\fighter.fbx - game se dung nhan vat dung bang code.
  echo      Chep file Fighter.fbx vao thu muc public\models\custom\ va doi ten thanh fighter.fbx
  echo.
)
start "" http://localhost:3400/admin.html
node server.js
pause
