@echo off
REM Chay VieDub Studio tren Windows
cd /d "%~dp0"
if not exist .venv (
  python -m venv .venv
  .venv\Scripts\python -m pip install -U pip
  .venv\Scripts\pip install -r requirements.txt
)
.venv\Scripts\python run.py --window %*
pause
