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
set "GOI="
set /p GOI="Goi: 1 = Ban 2D, 2 = Ban 3D, 3 = Ban 2D+3D: "
if "%GOI%"=="1" set "GOI=2d"
if "%GOI%"=="2" set "GOI=3d"
if "%GOI%"=="3" set "GOI=full"
set /p GHI="Ghi chu (ten khach, so tien): "
"%NODE%" tools\tao-key.js %MA% %GOI% %GHI%
echo.
goto lap
