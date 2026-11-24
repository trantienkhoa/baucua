// Tạo key theo mã máy (KHÔNG cần máy chủ) cho game Ngọn Lửa Cuối Cùng.
//   Lần đầu:   node tools/tao-key.js khoi-tao [link Zalo của anh]
//              → tạo cặp khoá trong tools/.khoa-offline/ (GIỮ BÍ MẬT, nhớ sao lưu) và file license-pubkey.js để đóng gói game.
//   Cấp key:   node tools/tao-key.js <mã máy khách gửi> <2d|3d|full> [ghi chú: tên khách, số tiền…]
//              2d = Bản 2D, 3d = Bản 3D, full = Bản 2D + 3D
//              → in ra key NLOF-… gửi cho khách; lưu nhật ký vào tools/.khoa-offline/da-cap.csv
// Trên Windows có thể bấm đúp TaoKey.bat cho tiện.
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '.khoa-offline');
const PRIV = path.join(DIR, 'offline-private.pem'), PUB = path.join(DIR, 'offline-public.pem'), OUTPK = path.join(DIR, 'license-pubkey.js'), LOG = path.join(DIR, 'da-cap.csv');
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function b32encode(buf) {
  let bits = 0, val = 0, out = '';
  for (const b of buf) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}

function writePubkeyFile(contact) {
  const pub = fs.readFileSync(PUB, 'utf8');
  // gộp với khoá máy chủ (nếu anh có dùng web/ để bán tự động) để game nhận được cả 2 loại key
  let online = {}; try { const o = require(path.join(__dirname, '..', 'web', 'license-pubkey.js')); online = { server: o.server, shop: o.shop, publicKey: o.publicKey }; } catch {}
  let old = {}; try { old = require(OUTPK); } catch {}
  const cfg = Object.assign({}, online, { offlinePublicKey: pub, contact: contact || old.contact || '' });
  fs.writeFileSync(OUTPK, '// Tự tạo bởi tools/tao-key.js — chỉ chứa khoá CÔNG KHAI, đưa vào gói game gửi khách.\nmodule.exports = ' + JSON.stringify(cfg, null, 2) + ';\n');
  return cfg;
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd) { console.log('Cách dùng:\n  node tools/tao-key.js khoi-tao [link Zalo]\n  node tools/tao-key.js <mã máy> <2d|3d|full> [ghi chú]'); process.exit(0); }

if (cmd === 'khoi-tao') {
  fs.mkdirSync(DIR, { recursive: true });
  if (!fs.existsSync(PRIV)) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    fs.writeFileSync(PRIV, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    fs.writeFileSync(PUB, publicKey.export({ type: 'spki', format: 'pem' }));
    console.log('✓ Đã tạo cặp khoá mới trong', DIR);
  } else console.log('Đã có cặp khoá, giữ nguyên (key đã cấp vẫn dùng được).');
  const cfg = writePubkeyFile(rest.join(' '));
  console.log('✓ Đã tạo', OUTPK, cfg.server ? `(gộp cả key máy chủ ${cfg.server})` : '(chỉ key theo máy)');
  console.log('\n⚠ SAO LƯU thư mục tools/.khoa-offline (USB, Google Drive riêng tư). Mất offline-private.pem thì không cấp thêm key cho bản game đã bán được;');
  console.log('  lộ file đó thì người khác tự tạo được key. Thư mục này đã nằm trong .gitignore, không đẩy lên GitHub.');
  process.exit(0);
}

if (!fs.existsSync(PRIV)) { console.error('Chưa khởi tạo. Chạy trước: node tools/tao-key.js khoi-tao'); process.exit(1); }
const hex = cmd.replace(/[^0-9a-f]/gi, '').toLowerCase();
if (hex.length !== 16) { console.error('Mã máy phải có 16 ký tự (ví dụ 312C-A795-1B0F-9E44). Nhận được:', cmd); process.exit(1); }
const payload = Buffer.alloc(14);
payload[0] = 1;                                                     // phiên bản định dạng
Buffer.from(hex, 'hex').copy(payload, 1);                            // mã máy (8 byte)
payload.writeUInt32BE(Math.floor((Date.now() - Date.UTC(2024, 0, 1)) / 864e5), 9);   // ngày cấp
const ED = { '2d': 2, '3d': 3, full: 4, '2d3d': 4, 'tron': 4 };
const ed = String(rest[0] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
if (!ED[ed]) { console.error('Thiếu loại gói. Ghi 2d (Bản 2D), 3d (Bản 3D) hoặc full (Bản 2D + 3D) ngay sau mã máy.'); process.exit(1); }
rest.shift();
payload[13] = ED[ed];                                               // gói: 2 = 2D, 3 = 3D, 4 = 2D + 3D
const sig = crypto.sign(null, payload, crypto.createPrivateKey(fs.readFileSync(PRIV)));
const key = 'NLOF-' + b32encode(Buffer.concat([payload, sig])).match(/.{1,5}/g).join('-');
const note = rest.join(' ').replace(/[\r\n,]/g, ' ');
fs.appendFileSync(LOG, `${new Date().toISOString()},${hex.toUpperCase().match(/.{4}/g).join('-')},${ed},${note},${key}\n`);
console.log('\nKey', { 2: 'Bản 2D', 3: 'Bản 3D', 4: 'Bản 2D + 3D' }[ED[ed]], 'cho máy', hex.toUpperCase().match(/.{4}/g).join('-'), note ? `(${note})` : '');
console.log('\n' + key + '\n');
console.log('Gửi nguyên dòng trên cho khách (chép cả dấu gạch ngang). Đã lưu vào', LOG);
