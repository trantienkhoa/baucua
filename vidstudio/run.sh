#!/usr/bin/env bash
# Chạy VieDub Studio trên macOS / Linux — tác giả Tiến Khoa
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "Chưa có FFmpeg: brew install ffmpeg  hoặc  sudo apt install ffmpeg"; exit 1; }
if [ ! -f .venv/installed.ok ]; then
  python3 -m venv .venv || exit 1
  ./.venv/bin/pip install -U pip
  ./.venv/bin/pip install -r requirements.txt || exit 1
  # gói khuyên dùng: cài từng gói, gói nào lỗi thì bỏ qua
  grep -v '^\s*#' requirements-extra.txt | awk 'NF{print $1}' | while read -r pkg; do
    ./.venv/bin/pip install "$pkg" || echo "  Bỏ qua $pkg"
  done
  touch .venv/installed.ok
fi
exec ./.venv/bin/python run.py "$@"
