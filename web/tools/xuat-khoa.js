// Tạo file license-pubkey.js cho game từ khoá công khai của máy chủ bán hàng.
// Chạy: npm run xuat-khoa  (rồi chép license-pubkey.js vào thư mục gốc của game trước khi đóng gói gửi khách)
const fs = require('fs'), path = require('path');
const pub = fs.readFileSync(path.join(__dirname, '..', 'data', 'public.pem'), 'utf8');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
const out = path.join(__dirname, '..', 'license-pubkey.js');
fs.writeFileSync(out, `// Tự tạo bởi web/tools/xuat-khoa.js — KHÔNG chứa bí mật, chép vào thư mục gốc của game.\nmodule.exports = {\n  server: ${JSON.stringify(cfg.publicUrl)},\n  shop: ${JSON.stringify(cfg.publicUrl)},\n  publicKey: ${JSON.stringify(pub)},\n};\n`);
console.log('Đã tạo', out);
