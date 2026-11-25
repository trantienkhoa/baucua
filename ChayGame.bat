@echo off
chcp 65001 >nul
title Vu Truong Neon
cd /d "%~dp0"
set "NODE="
set "NPM="

rem 1) Node.js trong thu muc node\ cua game
if exist "%~dp0node\node.exe" call :useNode "%~dp0node"
rem 2) Dung chung Node.js portable cua NationRush
if not defined NODE if exist "%~dp0..\NationRush\node\node.exe" call :useNode "%~dp0..\NationRush\node"
rem 3) Node.js da cai tren may
if not defined NODE (
  where node >nul 2>nul && set "NODE=node"
  where npm >nul 2>nul && set "NPM=npm"
)
if not defined NODE (
  echo Chua co Node.js. Tai ban LTS tai https://nodejs.org roi chay lai file nay.
  start https://nodejs.org
  pause
  exit /b
)
if not exist node_modules (
  echo Dang cai dat lan dau, vui long doi...
  call "%NPM%" install --omit=dev
)
start "" http://localhost:3300/admin.html
"%NODE%" server.js
pause
exit /b

:useNode
set "NODE=%~1\node.exe"
set "NPM=%~1\npm.cmd"
set "PATH=%~1;%PATH%"
exit /b 0