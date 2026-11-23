@echo off
chcp 65001 >nul
title Ngon Lua Cuoi Cung
cd /d "%~dp0"
rem Ưu tiên Node đi kèm trong thư mục node\ (bản phát hành), không có thì dùng Node đã cài trên máy
set "NODE=%~dp0node\node.exe"
if not exist "%NODE%" (
  where node >nul 2>nul
  if errorlevel 1 (
    echo Khong tim thay Node.js. Hay tai lai ban day du hoac cai Node.js LTS tai https://nodejs.org
    start https://nodejs.org
    pause
    exit /b
  )
  set "NODE=node"
)
if not exist node_modules (
  echo Thieu thu muc node_modules. Hay giai nen lai day du goi game.
  pause
  exit /b
)
rem Giọng đọc VieNeu (không bắt buộc): tự bật nếu máy đã cài Python + vieneu, không có thì dùng giọng Windows
where python >nul 2>nul && python -c "import vieneu" 2>nul && start "Giong doc VieNeu" /min cmd /c "%~dp0ChayGiongMa.bat"
rem Mở trang điều khiển sau 3 giây (chưa có key thì tự chuyển sang trang nhập key)
start "" /min cmd /c "ping -n 4 127.0.0.1 >nul & start "" http://localhost:3300/ma-dieu-khien.html"
echo Dang chay game Ngon Lua Cuoi Cung... Dung dong cua so nay khi dang LIVE.
"%NODE%" server.js
pause
