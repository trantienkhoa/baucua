@echo off
REM VieDub Studio - tac gia Tien Khoa
REM Bam dup file nay de chay. Lan dau se tu tai va cai Python, FFmpeg, thu vien.
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title VieDub Studio - Tien Khoa
set "PY_VER=3.12.10"
set "PY_URL=https://www.python.org/ftp/python/%PY_VER%/python-%PY_VER%-amd64.exe"
set "FF_URL=https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"

echo.
echo   ===== VieDub Studio - tac gia Tien Khoa =====
echo.

REM ---------- 1. Python ----------
call :findpy
if defined PYEXE goto :havepy
echo [1/4] Chua co Python. Dang tai Python %PY_VER% tu python.org, khoang 25 MB...
if not exist "tools" mkdir "tools"
curl -L --fail --progress-bar -o "tools\python-setup.exe" "%PY_URL%"
if errorlevel 1 goto :nodownload
echo [1/4] Dang cai Python, vui long doi 1-2 phut...
"tools\python-setup.exe" /quiet InstallAllUsers=0 PrependPath=1 Include_launcher=1 Include_test=0 SimpleInstall=1
del /q "tools\python-setup.exe" >nul 2>nul
call :findpy
if not defined PYEXE goto :nopy

:havepy
echo [1/4] Python: !PYEXE!

REM ---------- 2. FFmpeg: dung ban rieng trong thu muc app neu co ----------
call :addff
where ffmpeg >nul 2>nul && goto :haveff
echo [2/4] Chua co FFmpeg. Dang tai FFmpeg, khoang 100 MB...
if not exist "tools" mkdir "tools"
curl -L --fail --progress-bar -o "tools\ffmpeg.zip" "%FF_URL%"
if errorlevel 1 goto :nodownload
echo [2/4] Dang giai nen FFmpeg...
tar -xf "tools\ffmpeg.zip" -C "tools"
del /q "tools\ffmpeg.zip" >nul 2>nul
call :addff
where ffmpeg >nul 2>nul || goto :noff
:haveff
echo [2/4] FFmpeg: OK

REM ---------- 3. Thu vien Python ----------
if exist ".venv\installed.ok" goto :run
if not exist ".venv\Scripts\python.exe" (
  echo [3/4] Dang tao moi truong rieng cho app...
  "!PYEXE!" -m venv .venv
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

REM ================= ham phu =================
:findpy
REM Tim Python that, bo qua loi tat Microsoft Store. tools\findpy.py in ra dong PYEXE=duong_dan
set "PYEXE="
for /f "tokens=1,* delims==" %%A in ('py -3 tools\findpy.py 2^>nul') do if "%%A"=="PYEXE" set "PYEXE=%%B"
if defined PYEXE exit /b 0
for /f "tokens=1,* delims==" %%A in ('python tools\findpy.py 2^>nul') do if "%%A"=="PYEXE" set "PYEXE=%%B"
if defined PYEXE exit /b 0
REM vua cai xong thi PATH chua cap nhat: tim o cac thu muc cai dat quen thuoc
for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python3*" "%ProgramFiles%\Python3*" "%SystemDrive%\Python3*") do (
  if exist "%%~D\python.exe" if not defined PYEXE (
    for /f "tokens=1,* delims==" %%A in ('"%%~D\python.exe" tools\findpy.py 2^>nul') do if "%%A"=="PYEXE" set "PYEXE=%%B"
  )
)
exit /b 0

:addff
for /d %%D in ("tools\ffmpeg-*") do if exist "%%~fD\bin\ffmpeg.exe" set "PATH=%%~fD\bin;!PATH!"
exit /b 0

REM ================= loi =================
:nodownload
echo.
echo LOI: Khong tai duoc file. Kiem tra mang Internet roi chay lai.
echo Hoac cai tay roi bam dup lai file nay:
echo   - Python: https://www.python.org/downloads/  - nho tick "Add python.exe to PATH"
echo   - FFmpeg: https://www.gyan.dev/ffmpeg/builds/
goto :fail
:nopy
echo.
echo LOI: Cai Python chua thanh cong.
echo Hay cai tay tu https://www.python.org/downloads/ - nho tick "Add python.exe to PATH"
echo roi bam dup lai ChayStudio.bat.
goto :fail
:noff
echo.
echo LOI: Khong giai nen duoc FFmpeg. Xoa thu muc tools\ffmpeg-* roi chay lai.
goto :fail
:novenv
echo.
echo LOI: Khong tao duoc moi truong Python. Xoa thu muc .venv roi chay lai.
goto :fail
:nopip
echo.
echo LOI: Cai thu vien that bai. Kiem tra mang roi chay lai. Neu van loi, chup man hinh gui Tien Khoa.
goto :fail
:fail
echo.
pause
exit /b 1
