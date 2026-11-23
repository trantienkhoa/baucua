#!/usr/bin/env bash
# Dựng máy chủ bán hàng + cấp key trên VPS Ubuntu 22.04 / 24.04 (chạy bằng quyền root).
#   Cách dùng: chép thư mục web/ lên VPS (ví dụ /opt/ngonlua), rồi:
#     cd /opt/ngonlua && sudo bash cai-dat-vps.sh ten-mien-cua-anh.vn email@cua-anh.vn
#   Trước đó trỏ bản ghi A của tên miền về IP của VPS.
set -euo pipefail
DOMAIN="${1:?Thiếu tên miền. Ví dụ: sudo bash cai-dat-vps.sh nguonlua.vn ban@gmail.com}"
EMAIL="${2:?Thiếu email (để nhận thông báo chứng chỉ HTTPS)}"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8080

echo "== 1. Cài Node.js, nginx, certbot"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
apt-get install -y nginx certbot python3-certbot-nginx
npm install -g pm2

echo "== 2. Cài thư viện, tạo config.json + khoá ký (lần đầu)"
cd "$APP_DIR"
npm install --omit=dev
if [ ! -f config.json ]; then
  cp config.example.json config.json
  sed -i "s#https://ten-mien-cua-anh.vn#https://$DOMAIN#" config.json
  PW="$(openssl rand -base64 18 | tr -d '/+=')"
  sed -i "s#doi-mat-khau-nay#$PW#" config.json
  echo ">>> Mật khẩu trang quản trị: $PW  (đã ghi vào config.json, hãy lưu lại)"
fi

echo "== 3. Chạy nền bằng pm2, tự bật lại khi VPS khởi động lại"
pm2 delete ngonlua >/dev/null 2>&1 || true
PORT=$PORT pm2 start server.js --name ngonlua
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null

echo "== 4. nginx + HTTPS"
cat > /etc/nginx/sites-available/ngonlua <<NGINX
server {
  listen 80;
  server_name $DOMAIN;
  client_max_body_size 1m;
  location / {
    proxy_pass http://127.0.0.1:$PORT;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
NGINX
ln -sf /etc/nginx/sites-available/ngonlua /etc/nginx/sites-enabled/ngonlua
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
certbot --nginx -d "$DOMAIN" -m "$EMAIL" --agree-tos --non-interactive --redirect

echo "== 5. Sao lưu data/ mỗi ngày (giữ 30 bản trong /root/sao-luu-ngonlua)"
mkdir -p /root/sao-luu-ngonlua
( crontab -l 2>/dev/null | grep -v sao-luu-ngonlua; echo "17 3 * * * tar czf /root/sao-luu-ngonlua/data-\$(date +\%F).tgz -C $APP_DIR data config.json && find /root/sao-luu-ngonlua -name '*.tgz' -mtime +30 -delete" ) | crontab -

echo
echo "Xong! Trang bán hàng: https://$DOMAIN   ·   Quản trị: https://$DOMAIN/quan-tri"
echo "Việc còn lại:"
echo "  1. Sửa $APP_DIR/config.json: tài khoản ngân hàng, giá, link tải, Zalo → pm2 restart ngonlua"
echo "  2. Chạy: npm run xuat-khoa  → tải file license-pubkey.js về máy, dùng khi đóng gói game"
echo "  3. Tải thêm bản sao /root/sao-luu-ngonlua về máy của anh định kỳ (mất data/private.pem là mất khả năng gia hạn key)"
