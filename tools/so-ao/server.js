// Công cụ số điện thoại ảo nhận mã xác minh (OTP) — dùng Twilio làm nhà cung cấp số.
// Chạy: node tools/so-ao/server.js   rồi mở http://127.0.0.1:4848
// Không cần cài thêm thư viện (Node 18+ có sẵn fetch).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const PORT = Number(process.env.SO_AO_PORT || 4848);

// ---- Đọc khóa Twilio từ biến môi trường hoặc file tools/so-ao/.env ----
function loadEnv() {
  const f = path.join(DIR, '.env');
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

const SID = process.env.TWILIO_ACCOUNT_SID || '';
const TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const BASE = `https://api.twilio.com/2010-04-01/Accounts/${SID}`;

async function twilio(method, p, params) {
  if (!SID || !TOKEN) throw Object.assign(new Error('Chưa cấu hình TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN (xem HUONG-DAN.txt)'), { status: 400 });
  let url = p.startsWith('http') ? p : BASE + p;
  const opt = { method, headers: { Authorization: 'Basic ' + Buffer.from(`${SID}:${TOKEN}`).toString('base64') } };
  if (params && method === 'GET') url += (url.includes('?') ? '&' : '?') + new URLSearchParams(params);
  else if (params) {
    opt.body = new URLSearchParams(params).toString();
    opt.headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }
  const r = await fetch(url, opt);
  if (r.status === 204) return {};
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.message || `Twilio lỗi ${r.status}`), { status: r.status, code: j.code, more: j.more_info });
  return j;
}

// ---- Tách mã OTP từ nội dung tin nhắn ----
function extractCode(body = '') {
  const near = body.match(/(?:code|mã|ma|otp|pin|verification|xác (?:minh|thực)|is|là)[^\d]{0,20}([A-Z]-?)?(\d[\d\s-]{2,9}\d)/i);
  const pick = near ? near[2] : (body.match(/\b\d{4,8}\b/) || [])[0];
  if (!pick) return null;
  const digits = pick.replace(/[\s-]/g, '');
  return digits.length >= 4 && digits.length <= 8 ? digits : null;
}

// ---- API nội bộ cho giao diện ----
const routes = {
  'GET /api/status': async () => ({ configured: !!(SID && TOKEN), account: SID ? SID.slice(0, 6) + '…' + SID.slice(-4) : null }),

  // Danh sách quốc gia Twilio đang có số
  'GET /api/countries': async () => {
    const j = await twilio('GET', '/AvailablePhoneNumbers.json');
    return j.countries.map(c => ({
      code: c.country_code, name: c.country, beta: c.beta,
      types: Object.keys(c.subresource_uris || {}).map(k => ({ local: 'Local', mobile: 'Mobile', toll_free: 'TollFree' }[k])).filter(Boolean),
    })).sort((a, b) => a.name.localeCompare(b.name));
  },

  // Tìm số còn trống có nhận SMS
  'GET /api/search': async q => {
    const cc = String(q.country || '').toUpperCase().replace(/[^A-Z]/g, '');
    const type = ['Local', 'Mobile', 'TollFree'].includes(q.type) ? q.type : 'Mobile';
    const params = { SmsEnabled: 'true', PageSize: '20' };
    if (q.contains) params.Contains = String(q.contains).replace(/[^\d*]/g, '');
    const j = await twilio('GET', `/AvailablePhoneNumbers/${cc}/${type}.json`, params);
    return j.available_phone_numbers.map(n => ({
      number: n.phone_number, friendly: n.friendly_name, locality: n.locality || n.region || '',
      sms: n.capabilities?.SMS ?? n.capabilities?.sms, addressReq: n.address_requirements,
    }));
  },

  // Thuê (mua) số — có tính phí hằng tháng trên tài khoản Twilio
  'POST /api/buy': async (_, b) => {
    const params = { PhoneNumber: b.number, FriendlyName: 'so-ao ' + new Date().toISOString().slice(0, 10) };
    if (b.addressSid) params.AddressSid = b.addressSid;
    if (b.bundleSid) params.BundleSid = b.bundleSid;
    const n = await twilio('POST', '/IncomingPhoneNumbers.json', params);
    return { sid: n.sid, number: n.phone_number };
  },

  // Số đang sở hữu
  'GET /api/numbers': async () => {
    const j = await twilio('GET', '/IncomingPhoneNumbers.json', { PageSize: '100' });
    return j.incoming_phone_numbers.map(n => ({ sid: n.sid, number: n.phone_number, friendly: n.friendly_name, created: n.date_created }));
  },

  // Trả số (ngừng tính phí)
  'POST /api/release': async (_, b) => {
    if (!/^PN[0-9a-f]{32}$/i.test(b.sid || '')) throw Object.assign(new Error('SID số không hợp lệ'), { status: 400 });
    await twilio('DELETE', `/IncomingPhoneNumbers/${b.sid}.json`);
    return { ok: true };
  },

  // Hộp thư SMS đến của một số (hoặc tất cả số)
  'GET /api/inbox': async q => {
    const params = { PageSize: '50' };
    if (q.to) params.To = q.to;
    const j = await twilio('GET', '/Messages.json', params);
    return j.messages.filter(m => m.direction === 'inbound').map(m => ({
      sid: m.sid, from: m.from, to: m.to, body: m.body, date: m.date_sent || m.date_created, code: extractCode(m.body),
    }));
  },
};

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const key = `${req.method} ${u.pathname}`;
  if (routes[key]) {
    let body = {};
    if (req.method === 'POST') {
      let raw = '';
      for await (const c of req) { raw += c; if (raw.length > 1e5) break; }
      try { body = JSON.parse(raw || '{}'); } catch { body = {}; }
    }
    try {
      const data = await routes[key](Object.fromEntries(u.searchParams), body);
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(e.status && e.status < 600 ? e.status : 500, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: e.message, code: e.code, more: e.more }));
    }
    return;
  }
  const file = path.join(DIR, 'public', u.pathname === '/' ? 'index.html' : path.normalize(u.pathname).replace(/^([/\\])+/, ''));
  if (!file.startsWith(path.join(DIR, 'public')) || !fs.existsSync(file)) return res.writeHead(404).end('Not found');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Số ảo nhận OTP: http://127.0.0.1:${PORT}`);
  if (!SID || !TOKEN) console.log('⚠ Chưa có khóa Twilio — tạo file tools/so-ao/.env (xem .env.example)');
});

module.exports = { extractCode };
