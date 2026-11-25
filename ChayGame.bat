@echo off
chcp 65001 >nul
title Tau Da Lat - Trai Mat
cd /d "%~dp0"
set "HERE=%~dp0"
set "NODE="
set "NPM="

rem 1) Node.js di kem trong thu muc node\
if exist "%~dp0node\node.exe" call :useLocal

rem 1b) Dung chung Node.js portable cua NationRush
if not defined NODE if exist "%~dp0..\NationRush\node\node.exe" call :useShared

rem 2) Node.js da cai san tren may
if not defined NODE (
  where node >nul 2>nul && set "NODE=node"
  where npm >nul 2>nul && set "NPM=npm"
)

rem 3) Chua co: tu tai ban portable chinh thuc tu nodejs.org vao thu muc node\
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

if not exist node_modules (
  echo Dang cai thu vien lan dau, vui long doi...
  call "%NPM%" install --omit=dev
)

start "" http://127.0.0.1:3340/admin.html
"%NODE%" server.js
pause
exit /b

:useLocal
set "NODE=%HERE%node\node.exe"
set "NPM=%HERE%node\npm.cmd"
set "PATH=%HERE%node;%PATH%"
exit /b 0

:useShared
set "NODE=%~dp0..\NationRush\node\node.exe"
set "NPM=%~dp0..\NationRush\node\npm.cmd"
set "PATH=%~dp0..\NationRush\node;%PATH%"
exit /b 0
