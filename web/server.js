// Máy chủ bán hàng + cấp key cho "Ngọn Lửa Cuối Cùng"
// - Trang giới thiệu, đặt mua, xem đơn (public/)
// - Đơn hàng: khách chuyển khoản VietQR với nội dung = mã đơn; chủ shop bấm "Đã nhận tiền" ở trang quản trị
//   (hoặc SePay gửi webhook tự xác nhận) → hệ thống tạo key, khách xem key ngay trên trang đơn hàng.
// - Key kích hoạt theo máy (giới hạn số máy theo gói), trả về vé có chữ ký Ed25519 để game kiểm tra khi mất mạng.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
fs.mkdirSync(DATA, { recursive: true });

// ---------- cấu hình ----------
const CFG_FILE = path.join(ROOT, 'config.json');
if (!fs.existsSync(CFG_FILE)) { fs.copyFileSync(path.join(ROOT, 'config.example.json'), CFG_FILE); console.log('Đã tạo config.json từ config.example.json — hãy sửa thông tin ngân hàng, giá, mật khẩu quản trị.'); }
const CFG = JSON.parse(fs.readFileSync(CFG_FILE, 'utf8'));
const PORT = Number(process.env.PORT) || CFG.port || 8080;
const OFFLINE_DAYS = CFG.offlineDays || 90;   // máy chủ tạm ngừng tới chừng này ngày thì game khách vẫn chạy
if (!CFG.adminPassword || CFG.adminPassword === 'doi-mat-khau-nay') console.warn('⚠ Chưa đổi adminPassword trong config.json!');

// ---------- khoá ký (tạo một lần, GIỮ BÍ MẬT file private.pem) ----------
const PRIV = path.join(DATA, 'private.pem'), PUB = path.join(DATA, 'public.pem');
if (!fs.existsSync(PRIV)) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  fs.writeFileSync(PRIV, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  fs.writeFileSync(PUB, publicKey.export({ type: 'spki', format: 'pem' }));
  console.log('Đã tạo cặp khoá ký mới trong data/. Chạy "npm run xuat-khoa" để tạo license-pubkey.js cho game.');
}
const privateKey = crypto.createPrivateKey(fs.readFileSync(PRIV));
const publicKey = crypto.createPublicKey(fs.readFileSync(PUB));

// ---------- dữ liệu (file JSON, ghi an toàn) ----------
const DB_FILE = path.join(DATA, 'db.json');
let db = { orders: {}, keys: {} };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch {}
db.orders ||= {}; db.keys ||= {};
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { const tmp = DB_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db, null, 1)); fs.renameSync(tmp, DB_FILE); }, 100); }

const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const unb64u = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // bỏ chữ dễ nhầm O/0, I/1
const rnd = n => Array.from(crypto.randomBytes(n), b => ALPHA[b % ALPHA.length]).join('');
const newKey = () => `${CFG.keyPrefix || 'NLCC'}-${rnd(4)}-${rnd(4)}-${rnd(4)}-${rnd(4)}`;
const mask = k => k.slice(0, 9) + '…' + k.slice(-4);
const tier = id => (CFG.tiers || []).find(t => t.id === id);

function sign(rec, machine) {
  const now = Date.now();
  const payload = { k: mask(rec.key), p: rec.planName, e: rec.edition || 'full', n: rec.machines, m: machine, iat: now, exp: now + OFFLINE_DAYS * 864e5 };
  const p = b64u(JSON.stringify(payload));
  return p + '.' + b64u(crypto.sign(null, Buffer.from(p), privateKey));
}
function readToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [p, s] = token.split('.');
  try { if (!crypto.verify(null, Buffer.from(p), publicKey, unb64u(s))) return null; return JSON.parse(unb64u(p).toString('utf8')); } catch { return null; }
}
function createKey(t, note, orderId) {
  const key = newKey();
  db.keys[key] = { key, plan: t.id, planName: t.name, edition: ['2d', '3d'].includes(t.edition) ? t.edition : 'full', machines: t.machines, devices: [], createdAt: Date.now(), note: note || '', order: orderId || null, revoked: false };
  save(); return db.keys[key];
}
function keyByMasked(m) { return Object.values(db.keys).find(r => mask(r.key) === m); }

// ---------- web ----------
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '64kb' }));

// chặn dò key: mỗi IP tối đa 20 lần / 10 phút cho các API nhạy cảm
const hits = new Map();
function limit(req, res, next) {
  const ip = req.ip, now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < 600e3);
  if (h.length >= 20) return res.status(429).json({ error: 'Thử quá nhiều lần, vui lòng đợi 10 phút' });
  h.push(now); hits.set(ip, h); next();
}

// --- cấu hình công khai cho trang web ---
app.get('/api/public', (req, res) => res.json({ siteName: CFG.siteName, tiers: (CFG.tiers || []).map(({ downloadUrl, ...t }) => t), contact: CFG.contact, bank: { name: CFG.bank.bankName, holder: CFG.bank.accountName }, demoVideo: CFG.demoVideo }));

// --- đặt hàng ---
app.post('/api/order', limit, (req, res) => {
  const b = req.body || {}, t = tier(b.tier);
  if (!t) return res.status(400).json({ error: 'Gói không tồn tại' });
  const name = String(b.name || '').trim().slice(0, 80) || 'Khách', contact = String(b.contact || '').trim().slice(0, 120);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'Vui lòng nhập email đúng để nhận key và link tải' });   // email bắt buộc, Zalo / tên không bắt buộc
  let id; do id = (CFG.orderPrefix || 'NL') + Math.floor(100000 + Math.random() * 900000); while (db.orders[id]);
  const secret = b64u(crypto.randomBytes(18));
  db.orders[id] = { id, secret, tier: t.id, planName: t.name, amount: t.price, name, contact, email, status: 'pending', createdAt: Date.now(), key: null };
  save();
  res.json({ id, secret });
});
function orderView(o) {
  const q = new URLSearchParams({ amount: String(o.amount), addInfo: o.id, accountName: CFG.bank.accountName });
  return {
    id: o.id, planName: o.planName, amount: o.amount, status: o.status, createdAt: o.createdAt, key: o.status === 'paid' ? o.key : null,
    qr: `https://img.vietqr.io/image/${CFG.bank.bin}-${CFG.bank.accountNumber}-compact2.png?${q}`,
    bank: { name: CFG.bank.bankName, number: CFG.bank.accountNumber, holder: CFG.bank.accountName },
    download: o.status === 'paid' ? ((tier(o.tier) || {}).downloadUrl || CFG.downloadUrl) : null,   // link tải đúng gói, chỉ hiện khi đã trả tiền
  };
}
app.get('/api/order/:id', (req, res) => {
  const o = db.orders[req.params.id];
  if (!o || o.secret !== req.query.s) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  res.json(orderView(o));
});
// ---------- gửi mail key + link tải khi đơn đã trả tiền (Gmail: mật khẩu ứng dụng) ----------
const nodemailer = require('nodemailer');
let mailer = null;
function getMailer() {
  const m = CFG.mail || {};
  if (!m.host || !m.user || !m.pass) return null;
  return mailer || (mailer = nodemailer.createTransport({ host: m.host, port: Number(m.port) || 465, secure: m.secure !== false, auth: { user: m.user, pass: m.pass } }));
}
const escH = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
async function sendPaidMail(o) {
  const tr = getMailer();
  if (!o.email) return;
  if (!tr) { o.mail = { ok: false, error: 'Chưa cấu hình mail trong config.json', at: Date.now() }; save(); return; }
  const t = tier(o.tier) || {}, link = t.downloadUrl || CFG.downloadUrl || '', page = `${String(CFG.publicUrl || '').replace(/\/$/, '')}/don-hang?id=${o.id}&s=${o.secret}`;
  const shop = CFG.siteName || 'Ngọn Lửa Cuối Cùng', contact = (CFG.contact && (CFG.contact.zalo || CFG.contact.facebook || CFG.contact.phone || CFG.contact.email)) || '';
  const text = [`Cảm ơn bạn đã mua ${o.planName} – ${shop}.`, '', `Mã đơn: ${o.id}`, `Key: ${o.key}`, link ? `Link tải game: ${link}` : '', `Xem lại đơn hàng: ${page}`, '',
    'Cách cài:', '1. Tải file zip, giải nén ra ổ đĩa (đừng chạy trong file nén).', '2. Bấm đúp ChayNgonLua.bat.', '3. Trang nhập key tự mở: dán key ở trên → Kích hoạt.', '',
    'Lưu ý: phải đủ 18 tuổi mới lên LIVE và nhận quà TikTok; bật nhãn nội dung AI (AIGC) vì game có giọng đọc AI.', contact ? `Cần hỗ trợ: ${contact}` : ''].filter(x => x !== null).join('\n');
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222">
    <p>Cảm ơn bạn đã mua <b>${escH(o.planName)}</b> – ${escH(shop)}.</p>
    <p>Mã đơn: <b>${escH(o.id)}</b><br>Key: <b style="font-family:monospace;font-size:17px">${escH(o.key)}</b></p>
    ${link ? `<p><a href="${escH(link)}" style="background:#e8892c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Tải game</a></p>` : ''}
    <p><a href="${escH(page)}">Xem lại đơn hàng</a></p>
    <p><b>Cách cài</b><br>1. Tải file zip, giải nén ra ổ đĩa (đừng chạy trong file nén).<br>2. Bấm đúp <b>ChayNgonLua.bat</b>.<br>3. Trang nhập key tự mở: dán key ở trên → Kích hoạt.</p>
    <p style="color:#666;font-size:13px">Lưu ý: phải đủ 18 tuổi mới lên LIVE và nhận quà TikTok; bật nhãn nội dung AI (AIGC) vì game có giọng đọc AI.${contact ? `<br>Cần hỗ trợ: ${escH(contact)}` : ''}</p></div>`;
  try {
    await tr.sendMail({ from: CFG.mail.from || CFG.mail.user, to: o.email, subject: `[${shop}] Key và link tải – đơn ${o.id}`, text, html });
    o.mail = { ok: true, at: Date.now() }; console.log(`✉ Đã gửi mail đơn ${o.id}`);
  } catch (e) { o.mail = { ok: false, error: String(e.message || e).slice(0, 200), at: Date.now() }; console.warn(`✉ Gửi mail đơn ${o.id} lỗi:`, e.message); }
  save();
}
function markPaid(o, by) {
  if (o.status === 'paid') return o;
  const t = tier(o.tier) || { id: o.tier, name: o.planName, machines: 1 };
  const rec = createKey(t, `${o.name} · ${o.contact}`, o.id);
  o.status = 'paid'; o.key = rec.key; o.paidAt = Date.now(); o.paidBy = by; save();
  console.log(`✓ Đơn ${o.id} đã thanh toán (${by}) → key ${mask(rec.key)}`);
  sendPaidMail(o);   // gửi nền, không chờ
  return o;
}

// --- SePay webhook (tuỳ chọn): tự xác nhận khi tiền về tài khoản ---
app.post('/api/sepay-webhook', (req, res) => {
  if (!CFG.sepayApiKey || req.get('authorization') !== `Apikey ${CFG.sepayApiKey}`) return res.status(401).json({ success: false });
  const b = req.body || {};
  if (b.transferType && b.transferType !== 'in') return res.json({ success: true });
  const m = String(b.content || b.description || '').toUpperCase().match(new RegExp(`${CFG.orderPrefix || 'NL'}\\d{6}`));
  const o = m && db.orders[m[0]];
  if (o && Number(b.transferAmount) >= o.amount) markPaid(o, 'sepay');
  res.json({ success: true });
});

// --- kích hoạt / gia hạn vé / gỡ máy (game gọi) ---
app.post('/api/activate', limit, (req, res) => {
  const b = req.body || {}, rec = db.keys[String(b.key || '').trim().toUpperCase()];
  const machine = String(b.machine || '').slice(0, 64);
  if (!rec) return res.status(404).json({ error: 'Key không tồn tại' });
  if (rec.revoked) return res.status(403).json({ error: 'Key đã bị khoá. Liên hệ người bán.' });
  if (!/^[a-f0-9]{16,64}$/.test(machine)) return res.status(400).json({ error: 'Mã máy không hợp lệ' });
  let d = rec.devices.find(x => x.id === machine);
  if (!d) {
    if (rec.devices.length >= rec.machines) return res.status(403).json({ error: `Key đã dùng đủ ${rec.machines} máy. Gỡ kích hoạt ở máy cũ hoặc liên hệ người bán để chuyển máy.` });
    d = { id: machine, name: String(b.name || '').slice(0, 80), at: Date.now() }; rec.devices.push(d);
  }
  d.seen = Date.now(); save();
  res.json({ token: sign(rec, machine) });
});
app.post('/api/refresh', limit, (req, res) => {
  const t = readToken((req.body || {}).token); if (!t) return res.status(400).json({ error: 'Vé không hợp lệ' });
  const rec = keyByMasked(t.k);
  if (!rec) return res.status(404).json({ error: 'Key không tồn tại' });
  if (rec.revoked) return res.status(403).json({ error: 'Key đã bị khoá. Liên hệ người bán.' });
  const d = rec.devices.find(x => x.id === t.m);
  if (!d) return res.status(403).json({ error: 'Máy này đã bị gỡ khỏi key' });
  d.seen = Date.now(); save();
  res.json({ token: sign(rec, t.m) });
});
app.post('/api/deactivate', limit, (req, res) => {
  const t = readToken((req.body || {}).token); if (!t) return res.status(400).json({ error: 'Vé không hợp lệ' });
  const rec = keyByMasked(t.k); if (rec) { rec.devices = rec.devices.filter(x => x.id !== t.m); save(); }
  res.json({ ok: true });
});

// --- quản trị (mật khẩu trong config.json) ---
function admin(req, res, next) {
  const pw = req.get('x-admin') || '';
  const a = Buffer.from(pw), b = Buffer.from(String(CFG.adminPassword || ''));
  if (!b.length || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Sai mật khẩu' });
  next();
}
app.get('/api/admin/data', limit, admin, (req, res) => res.json({ orders: Object.values(db.orders).sort((a, b) => b.createdAt - a.createdAt), keys: Object.values(db.keys).sort((a, b) => b.createdAt - a.createdAt), tiers: CFG.tiers }));
app.post('/api/admin/order/:id/paid', admin, (req, res) => { const o = db.orders[req.params.id]; if (!o) return res.status(404).json({ error: 'Không có đơn' }); res.json(markPaid(o, 'admin')); });
app.post('/api/admin/order/:id/mail', admin, async (req, res) => { const o = db.orders[req.params.id]; if (!o || o.status !== 'paid') return res.status(400).json({ error: 'Đơn chưa trả tiền' }); if (req.body && req.body.email) o.email = String(req.body.email).trim().toLowerCase().slice(0, 120); await sendPaidMail(o); res.json(o); });
app.post('/api/admin/order/:id/cancel', admin, (req, res) => { const o = db.orders[req.params.id]; if (!o) return res.status(404).json({ error: 'Không có đơn' }); if (o.status === 'pending') { o.status = 'cancelled'; save(); } res.json(o); });
app.post('/api/admin/key', admin, (req, res) => { const t = tier((req.body || {}).tier); if (!t) return res.status(400).json({ error: 'Gói không tồn tại' }); res.json(createKey(t, String(req.body.note || '').slice(0, 120))); });
app.post('/api/admin/key/:key/:act', admin, (req, res) => {
  const rec = db.keys[req.params.key]; if (!rec) return res.status(404).json({ error: 'Không có key' });
  if (req.params.act === 'revoke') rec.revoked = true;
  else if (req.params.act === 'unrevoke') rec.revoked = false;
  else if (req.params.act === 'reset') rec.devices = [];
  else if (req.params.act === 'machines') rec.machines = Math.max(1, Math.min(50, Number(req.body.machines) || rec.machines));
  else return res.status(400).json({ error: 'Lệnh không hợp lệ' });
  save(); res.json(rec);
});

app.use(express.static(path.join(ROOT, 'public'), { extensions: ['html'] }));
app.listen(PORT, () => console.log(`Trang bán hàng: http://localhost:${PORT}  ·  Quản trị: http://localhost:${PORT}/quan-tri`));
