// Kiểm tra bản quyền (key) cho game Ngọn Lửa Cuối Cùng. Có 2 cách, dùng một hoặc cả hai:
//  1. Key qua máy chủ (thư mục web/): khách nhập key NLCC-…, máy chủ trả về "vé" có chữ ký Ed25519.
//     Vé hết hạn sau ngày ghi trong vé nếu không gia hạn; game tự gia hạn ngầm mỗi REFRESH_DAYS ngày khi có mạng.
//  2. Key theo mã máy, KHÔNG cần máy chủ: khách gửi mã máy → người bán tạo key NLOF-… bằng tools/tao-key.js.
//     Key chỉ chạy trên đúng máy đó, không cần mạng, không hết hạn.
// Khoá công khai nằm trong license-pubkey.js; không có file này (bản của chủ game đang phát triển) thì không khoá.
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const FILE = path.join(DATA, 'license.json');
const REFRESH_DAYS = 3;
let CFG = null;
try { CFG = require('./license-pubkey.js'); } catch { CFG = null; }
const ONLINE = !!(CFG && CFG.server && CFG.publicKey);
const OFFLINE = !!(CFG && CFG.offlinePublicKey);

const unb64u = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
// base32 không có chữ dễ nhầm (O/0, I/1) — dùng cho key theo mã máy
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function b32decode(s) {
  const clean = String(s).toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/I/g, '1');
  let bits = 0, val = 0; const out = [];
  for (const ch of clean) { const i = B32.indexOf(ch); if (i < 0) return null; val = (val << 5) | i; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}

// mã máy: không đổi khi đổi mạng / VPN
function machineId() {
  const cpu = (os.cpus()[0] || {}).model || '';
  const raw = [os.hostname(), cpu, os.platform(), os.arch(), Math.round(os.totalmem() / 2 ** 30)].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}
// mã máy để khách gửi cho người bán (16 ký tự đầu, chia nhóm cho dễ đọc)
const machineCode = () => machineId().slice(0, 16).toUpperCase().match(/.{4}/g).join('-');
function machineName() { return `${os.hostname()} · ${os.platform()}`; }

// gói: '2d' (chỉ cảnh 2D), '3d' (chỉ cảnh 3D), 'full' (cả hai)
const ED_NAME = { '2d': 'Bản 2D', '3d': 'Bản 3D', full: 'Bản 2D + 3D' };
// ---------- key theo mã máy (NLOF-…) ----------
function verifyOffline(key) {
  if (!OFFLINE || !/^NLOF-/i.test(String(key || ''))) return null;
  const b = b32decode(String(key).slice(5));
  if (!b || b.length !== 14 + 64 || b[0] !== 1) return null;
  const payload = b.subarray(0, 14), sig = b.subarray(14);
  try { if (!crypto.verify(null, payload, crypto.createPublicKey(CFG.offlinePublicKey), sig)) return null; } catch { return null; }
  if (payload.subarray(1, 9).toString('hex') !== machineId().slice(0, 16)) return null;
  const day = payload.readUInt32BE(9);
  const e = { 2: '2d', 3: '3d' }[payload[13]] || 'full';   // 1 (key cũ) / 4 = trọn bộ
  return { mode: 'offline', p: 'Key theo máy · ' + ED_NAME[e], k: 'NLOF-' + String(key).slice(5, 9).toUpperCase() + '…', n: 1, e, issued: Date.UTC(2024, 0, 1) + day * 864e5 };
}

// ---------- vé từ máy chủ (NLCC-…) ----------
function verifyToken(token) {
  if (!ONLINE || !token || typeof token !== 'string' || !token.includes('.')) return null;
  const [p, s] = token.split('.');
  try {
    if (!crypto.verify(null, Buffer.from(p), crypto.createPublicKey(CFG.publicKey), unb64u(s))) return null;
    const data = JSON.parse(unb64u(p).toString('utf8'));
    if (data.m !== machineId()) return null;
    if (!data.exp || Date.now() > data.exp) return null;
    return Object.assign(data, { mode: 'online', e: ['2d', '3d'].includes(data.e) ? data.e : 'full' });
  } catch { return null; }
}

let state = { token: null, offline: null, data: null, error: '' };
function load() {
  let j = {}; try { j = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
  state.token = j.token || null; state.offline = j.offline || null;
  state.data = verifyOffline(state.offline) || verifyToken(state.token);
}
function save(obj) {
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(obj, null, 2));
  load();
}
function clear() { try { fs.unlinkSync(FILE); } catch {} state.token = null; state.offline = null; state.data = null; }

async function post(pathname, body) {
  const r = await fetch(CFG.server.replace(/\/$/, '') + pathname, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || `Máy chủ báo lỗi ${r.status}`), { status: r.status });
  return j;
}

async function activate(key) {
  if (!CFG) return { ok: true, dev: true };
  key = String(key || '').trim().replace(/\s+/g, '').toUpperCase();
  if (/^NLOF-/.test(key)) {
    if (!OFFLINE) throw new Error('Bản game này không dùng key theo máy');
    if (!verifyOffline(key)) throw new Error('Key không đúng hoặc không phải key của máy này. Kiểm tra lại mã máy đã gửi cho người bán.');
    save({ offline: key }); return { ok: true, info: info() };
  }
  if (!ONLINE) throw new Error('Key không hợp lệ. Gửi mã máy cho người bán để nhận key (bắt đầu bằng NLOF-).');
  if (!/^[A-Z0-9-]{10,40}$/.test(key)) throw new Error('Key không đúng định dạng');
  const j = await post('/api/activate', { key, machine: machineId(), name: machineName() });
  save({ token: j.token });
  if (!state.data) throw new Error('Vé kích hoạt không hợp lệ (sai khoá công khai?)');
  return { ok: true, info: info() };
}
async function refresh() {
  if (!ONLINE || !state.token || state.offline) return;
  try { const j = await post('/api/refresh', { token: state.token }); save({ token: j.token }); state.error = ''; }
  catch (e) {
    if (e.status === 403 || e.status === 404) { state.error = e.message; clear(); }
    // lỗi mạng: giữ vé cũ tới khi hết hạn
  }
}
async function deactivate() {
  if (!CFG) return;
  try { if (state.token && !state.offline) await post('/api/deactivate', { token: state.token }); } finally { clear(); }
}

function edition() { return !CFG ? 'full' : (state.data && state.data.e) || 'full'; }
function licensed() { return !CFG || !!(state.data && (state.data.mode === 'offline' || Date.now() < state.data.exp)); }
function info() {
  if (!CFG) return { licensed: true, dev: true, edition: 'full' };
  const d = state.data;
  return { licensed: licensed(), dev: false, edition: edition(), mode: d && d.mode, plan: d && d.p, key: d && d.k, machines: d && d.n, until: d && d.mode === 'online' ? d.exp : null,
    machine: machineId().slice(0, 8), machineCode: machineCode(), online: ONLINE, offline: OFFLINE, error: state.error, shop: CFG.shop || CFG.server || '', contact: CFG.contact || '' };
}

load();
if (ONLINE) {
  const tick = () => { if (state.data && state.data.mode === 'online' && Date.now() - state.data.iat > REFRESH_DAYS * 864e5) refresh(); };
  setTimeout(tick, 5000); setInterval(tick, 6 * 3600e3).unref();
}
module.exports = { licensed, edition, info, activate, deactivate, machineId, machineCode, enabled: () => !!CFG };
