@echo off
chcp 65001 >nul
title Tao key Ngon Lua Cuoi Cung
cd /d "%~dp0"
set "NODE=%~dp0node\node.exe"
if not exist "%NODE%" set "NODE=node"
if not exist "tools\.khoa-offline\offline-private.pem" (
  echo Lan dau: tao cap khoa...
  set /p ZALO="Link Zalo cua anh (de hien cho khach, co the bo trong): "
  "%NODE%" tools\tao-key.js khoi-tao %ZALO%
  echo.
)
:lap
set "MA="
set /p MA="Dan ma may khach gui (Enter de thoat): "
if "%MA%"=="" exit /b
set /p GHI="Ghi chu (ten khach, so tien): "
"%NODE%" tools\tao-key.js %MA% %GHI%
echo.
goto lap
