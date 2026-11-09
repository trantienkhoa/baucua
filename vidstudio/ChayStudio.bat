@echo off
REM VieDub Studio - tac gia Tien Khoa
REM Bam dup file nay de chay. Lan dau se tu cai Python, FFmpeg va thu vien.
setlocal EnableExtensions
cd /d "%~dp0"
title VieDub Studio - Tien Khoa
set "PATH=%PATH%;%LOCALAPPDATA%\Microsoft\WinGet\Links"

echo.
echo   ===== VieDub Studio - tac gia Tien Khoa =====
echo.

REM ---------- 1. Tim Python that, khong phai loi tat Microsoft Store ----------
set "PYEXE="
call :findpy
if defined PYEXE goto :havepy

echo [1/4] Chua co Python. Dang tu cai Python 3.12...
where winget >nul 2>nul || goto :nowinget
winget install -e --id Python.Python.3.12 --scope user --accept-package-agreements --accept-source-agreements
call :findpy
if not defined PYEXE if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PYEXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if not defined PYEXE goto :nopy

:havepy
echo [1/4] Python: %PYEXE%

REM ---------- 2. FFmpeg ----------
where ffmpeg >nul 2>nul && goto :haveff
echo [2/4] Chua co FFmpeg. Dang tu cai...
where winget >nul 2>nul || goto :nowinget
winget install -e --id Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
where ffmpeg >nul 2>nul || goto :noff
:haveff
echo [2/4] FFmpeg: OK

REM ---------- 3. Thu vien Python ----------
if exist ".venv\installed.ok" goto :run
if not exist ".venv\Scripts\python.exe" (
  echo [3/4] Dang tao moi truong rieng cho app...
  "%PYEXE%" -m venv .venv
)
if not exist ".venv\Scripts\python.exe" goto :novenv
echo [3/4] Dang cai thu vien, lan dau mat 5-15 phut...
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto :nopip
echo [3/4] Dang cai them goi khuyen dung, goi nao loi se bo qua...
for /f "usebackq eol=# tokens=1" %%P in ("requirements-extra.txt") do (
  ".venv\Scripts\python.exe" -m pip install "%%P" || echo     Bo qua %%P
)
echo ok> ".venv\installed.ok"

:run
echo [4/4] Dang mo app... Giu cua so nay mo trong luc dung app.
echo.
".venv\Scripts\python.exe" run.py %*
echo.
echo App da tat.
pause
exit /b 0

REM ---------- ham phu ----------
:findpy
set "PYEXE="
for /f "tokens=1,* delims==" %%A in ('py -3 tools\findpy.py 2^>nul') do if "%%A"=="PYEXE" set "PYEXE=%%B"
if defined PYEXE exit /b 0
for /f "tokens=1,* delims==" %%A in ('python tools\findpy.py 2^>nul') do if "%%A"=="PYEXE" set "PYEXE=%%B"
exit /b 0

REM ---------- loi ----------
:nowinget
echo.
echo LOI: May khong co winget de tu cai dat.
echo Hay cai tay roi bam dup lai file nay:
echo   - Python: https://www.python.org/downloads/  - nho tick "Add python.exe to PATH"
echo   - FFmpeg: https://www.gyan.dev/ffmpeg/builds/
goto :fail
:nopy
echo.
echo LOI: Da cai Python nhung chua nhan. Hay DONG cua so nay roi bam dup lai ChayStudio.bat.
goto :fail
:noff
echo.
echo LOI: Da cai FFmpeg nhung chua nhan. Hay DONG cua so nay roi bam dup lai ChayStudio.bat.
goto :fail
:novenv
echo.
echo LOI: Khong tao duoc moi truong Python. Thu xoa thu muc .venv roi chay lai.
goto :fail
:nopip
echo.
echo LOI: Cai thu vien that bai. Kiem tra mang roi chay lai. Neu van loi, chup man hinh gui Tien Khoa.
goto :fail
:fail
echo.
pause
exit /b 1
