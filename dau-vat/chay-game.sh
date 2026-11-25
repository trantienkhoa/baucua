#!/bin/sh
# Đại Chiến Đô Vật — chạy trên macOS / Linux
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then echo "Chưa cài Node.js. Tải bản LTS tại https://nodejs.org rồi chạy lại."; exit 1; fi
[ -d node_modules ] || npm install --omit=dev
[ -f public/models/custom/fighter.fbx ] || echo "[!] Chưa có public/models/custom/fighter.fbx — game dùng nhân vật dựng bằng code."
( sleep 2; (command -v open >/dev/null && open http://localhost:3400/admin.html) || (command -v xdg-open >/dev/null && xdg-open http://localhost:3400/admin.html) ) &
node server.js
