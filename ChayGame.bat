@echo off
chcp 65001 >nul
title Nation Rush
cd /d "%~dp0"
set "HERE=%~dp0"
set "NODE="
set "NPM="

rem 1) Node.js di kem trong thu muc node\ - khong can cai gi
if exist "%~dp0node\node.exe" call :useLocal

rem 2) Node.js da cai san tren may
if not defined NODE (
  where node >nul 2>nul && set "NODE=node"
  where npm >nul 2>nul && set "NPM=npm"
)

rem 3) Chua co: tu tai ban portable chinh thuc tu nodejs.org vao thu muc node\ - khong can quyen admin
if not defined NODE (
  echo May chua co Node.js. Dang tu tai ban portable tu nodejs.org, khoang 30 MB, vui long doi...
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\cai-node.ps1"
  if exist "%~dp0node\node.exe" call :useLocal
)
if not defined NODE (
  echo.
  echo Khong tai duoc Node.js. Kiem tra Internet roi chay lai file nay,
  echo hoac tu cai ban LTS tai https://nodejs.org
  start https://nodejs.org
  pause
  exit /b 1
)

rem NR_DRYRUN=1: chi in ra Node.js se dung roi thoat - de kiem tra
if defined NR_DRYRUN (
  echo NODE=%NODE%
  echo NPM=%NPM%
  "%NODE%" -v
  exit /b 0
)

if not exist node_modules (
  echo Dang cai thu vien lan dau, vui long doi...
  call "%NPM%" install --omit=dev
)

start "" http://127.0.0.1:3330/admin.html
"%NODE%" server.js
pause
exit /b

:useLocal
set "NODE=%HERE%node\node.exe"
set "NPM=%HERE%node\npm.cmd"
set "PATH=%HERE%node;%PATH%"
exit /b 0
