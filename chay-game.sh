#!/bin/sh
# Bộ Game TikTok LIVE — chạy trên macOS / Linux
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then echo "Chưa cài Node.js. Tải bản LTS tại https://nodejs.org rồi chạy lại."; exit 1; fi
[ -d node_modules ] || npm install --omit=dev
( sleep 2; (command -v open >/dev/null && open http://localhost:3300/) || (command -v xdg-open >/dev/null && xdg-open http://localhost:3300/) ) &
node server.js
