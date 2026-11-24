#!/data/data/com.termux/files/usr/bin/bash
# Cài và chạy game trên điện thoại Android bằng Termux (không cần máy tính).
# Trong Termux gõ:  curl -fsSL https://raw.githubusercontent.com/trantienkhoa/baucua/main/tools/android-cai-dat.sh | bash
# (kho mã riêng tư thì tải thư mục game về máy rồi chạy:  bash tools/android-cai-dat.sh)
set -e
BRANCH="${BRANCH:-main}"
pkg update -y
pkg install -y nodejs-lts git
cd "$HOME"
if [ ! -f baucua/server.js ]; then
  if [ -f "$(dirname "$0")/../server.js" ]; then cp -r "$(cd "$(dirname "$0")/.." && pwd)" baucua; else git clone -b "$BRANCH" https://github.com/trantienkhoa/baucua.git; fi
fi
cd baucua
git pull --ff-only 2>/dev/null || true
npm install --omit=dev
termux-wake-lock 2>/dev/null || true   # giữ Termux chạy khi tắt màn hình / chuyển app
echo ""
echo "  Xong! Mở Chrome trên điện thoại:"
echo "    Trang điều khiển : http://localhost:3300/admin.html"
echo "    Màn game         : http://localhost:3300/hoa-si.html"
echo "  Lần sau chỉ cần mở Termux và gõ:  cd ~/baucua && node server.js"
echo ""
node server.js
