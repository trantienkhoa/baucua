#!/bin/sh
# Giọng ma VieNeu-TTS — chạy trên macOS / Linux
cd "$(dirname "$0")/tools/vieneu"
PY=$(command -v python3 || command -v python)
[ -n "$PY" ] || { echo "Chưa cài Python 3.10+"; exit 1; }
"$PY" -c "import vieneu" 2>/dev/null || "$PY" -m pip install vieneu
exec "$PY" giong-ma.py "$@"
