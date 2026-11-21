@echo off
chcp 65001 >nul
title Giong ma VieNeu-TTS
cd /d "%~dp0tools\vieneu"
where python >nul 2>nul
if errorlevel 1 (
  echo Chua cai Python. Tai Python 3.10 tro len tai https://www.python.org ^(nho tick "Add python.exe to PATH"^)
  start https://www.python.org/downloads/
  pause
  exit /b
)
python -c "import vieneu" 2>nul
if errorlevel 1 (
  echo Dang cai VieNeu-TTS lan dau, vui long doi...
  python -m pip install vieneu
)
python giong-ma.py %*
pause
