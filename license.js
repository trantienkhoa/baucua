// Kiểm tra bản quyền (key) cho game Ngọn Lửa Cuối Cùng.
// - Key kích hoạt một lần trên máy chủ bán hàng (thư mục web/), máy chủ trả về "vé" có chữ ký Ed25519.
// - Game kiểm tra chữ ký bằng khoá công khai trong license-pubkey.js, nên chạy được khi mất mạng.
// - Vé hết hạn sau OFFLINE_DAYS ngày nếu không gia hạn; game tự gia hạn ngầm mỗi REFRESH_DAYS ngày khi có mạng.
// - Không có license-pubkey.js (bản của chủ game đang phát triển) thì không khoá.
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const FILE = path.join(DATA, 'license.json');
const REFRESH_DAYS = 3;
let CFG = null;
try { CFG = require('./license-pubkey.js'); } catch { CFG = null; }

const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const unb64u = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

// mã máy: không đổi khi đổi mạng / VPN
function machineId() {
  const cpu = (os.cpus()[0] || {}).model || '';
  const raw = [os.hostname(), cpu, os.platform(), os.arch(), Math.round(os.totalmem() / 2 ** 30)].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}
function machineName() { return `${os.hostname()} · ${os.platform()}`; }

function verifyToken(token) {
  if (!CFG || !token || typeof token !== 'string' || !token.includes('.')) return null;
  const [p, s] = token.split('.');
  try {
    const ok = crypto.verify(null, Buffer.from(p), crypto.createPublicKey(CFG.publicKey), unb64u(s));
    if (!ok) return null;
    const data = JSON.parse(unb64u(p).toString('utf8'));
    if (data.m !== machineId()) return null;
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch { return null; }
}

let state = { token: null, data: null, error: '' };
function load() {
  try { state.token = JSON.parse(fs.readFileSync(FILE, 'utf8')).token; } catch { state.token = null; }
  state.data = verifyToken(state.token);
}
function save(token) {
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify({ token }, null, 2));
  state.token = token; state.data = verifyToken(token);
}

async function post(pathname, body) {
  const r = await fetch(CFG.server.replace(/\/$/, '') + pathname, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || `Máy chủ báo lỗi ${r.status}`), { status: r.status });
  return j;
}

async function activate(key) {
  if (!CFG) return { ok: true, dev: true };
  key = String(key || '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{10,40}$/.test(key)) throw new Error('Key không đúng định dạng');
  const j = await post('/api/activate', { key, machine: machineId(), name: machineName() });
  save(j.token);
  if (!state.data) throw new Error('Vé kích hoạt không hợp lệ (sai khoá công khai?)');
  return { ok: true, info: info() };
}
async function refresh() {
  if (!CFG || !state.token) return;
  try { const j = await post('/api/refresh', { token: state.token }); save(j.token); state.error = ''; }
  catch (e) {
    if (e.status === 403 || e.status === 404) { state.error = e.message; try { fs.unlinkSync(FILE); } catch {} state.token = null; state.data = null; }
    // lỗi mạng: giữ vé cũ tới khi hết hạn
  }
}
async function deactivate() {
  if (!CFG || !state.token) return;
  try { await post('/api/deactivate', { token: state.token }); } finally { try { fs.unlinkSync(FILE); } catch {} state.token = null; state.data = null; }
}

function licensed() { return !CFG || !!(state.data && Date.now() < state.data.exp); }
function info() {
  if (!CFG) return { licensed: true, dev: true };
  const d = state.data;
  return { licensed: licensed(), dev: false, plan: d && d.p, key: d && d.k, machines: d && d.n, until: d && d.exp, machine: machineId().slice(0, 8), error: state.error, shop: CFG.shop || CFG.server };
}

load();
if (CFG) {
  const tick = () => { if (!state.data || Date.now() - state.data.iat > REFRESH_DAYS * 864e5) refresh(); };
  setTimeout(tick, 5000); setInterval(tick, 6 * 3600e3).unref();
}
module.exports = { licensed, info, activate, deactivate, machineId, enabled: () => !!CFG };
