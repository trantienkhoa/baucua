// Thắp Sáng Quê Hương — game TikTok LIVE bản đồ Việt Nam (tự chạy trên máy bạn, không cần key bản quyền)
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const express = require('express');
const multer = require('multer');
const { Server } = require('socket.io');
const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');

const PORT = Number(process.env.PORT) || 3310;
const DATA = path.join(__dirname, 'data');
const MUSIC = path.join(DATA, 'music');
fs.mkdirSync(MUSIC, { recursive: true });

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8')); } catch { return fallback; }
}
function writeJSON(file, obj) {
  try { fs.writeFileSync(path.join(DATA, file), JSON.stringify(obj, null, 2)); } catch (e) { console.error('Không ghi được', file, e.message); }
}

// cài đặt kết nối (tên kênh, key EulerStream)
const settings = Object.assign({ username: '', apiKey: '', autoReconnect: true, bannedWords: '', blockSwear: true }, readJSON('connection.json', {}));
const saveSettings = () => writeJSON('connection.json', settings);

// ---------- lọc chữ (giống game sàn nhảy) ----------
// link, số điện thoại, Zalo luôn bị chặn; danh sách từ cấm do chủ phòng tự nhập
const LINK_RE = /(https?:\/\/|www\.|\b[\w-]+\.(com|net|vn|org|io|xyz|me|link|shop|store|online|site|top|info)\b)/i;
const PHONE_RE = /(\+?84|0)[\s.\-]?\d([\s.\-]?\d){7,9}/;
const ZALO_RE = /\b(zalo|za1o|zl|telegram|tele|fb\.com|facebook)\b/i;
function bannedList() {
  return String(settings.bannedWords || '').split(/[,\n]/).map(s => s.trim().toLowerCase()).filter(Boolean);
}
function cleanText(t, max = 60) {
  t = String(t || '').replace(/[\u0000-\u001f]/g, '').trim();
  if (LINK_RE.test(t) || PHONE_RE.test(t) || ZALO_RE.test(t)) return null;
  const low = t.toLowerCase();
  for (const w of bannedList()) if (w && low.includes(w)) return null;
  if (settings.blockSwear && cleanBad(t).hit) return null;
  return t.slice(0, max);
}
// tên chứa từ chửi thề: che bằng dấu * thay vì bỏ hẳn
function cleanName(u) {
  const raw = [u.nickname, u.uniqueId].map(x => String(x || '').replace(/[\u0000-\u001f]/g, '').trim()).find(Boolean) || '';
  if (!raw || LINK_RE.test(raw) || PHONE_RE.test(raw) || ZALO_RE.test(raw)) return 'Khách ẩn danh';
  const low = raw.toLowerCase(); for (const w of bannedList()) if (w && low.includes(w)) return 'Khách ẩn danh';
  return (settings.blockSwear ? cleanBad(raw).text : raw).slice(0, 24) || 'Khách ẩn danh';
}

// bộ lọc chửi thề có sẵn (lấy từ game sàn nhảy)
// so khớp CÓ DẤU (tránh chặn nhầm "ngủ", "lớn", "các", "buổi") và BỎ DẤU cho kiểu viết tắt
const BAD_ACC = ['ngu', 'lồn', 'cặc', 'buồi', 'địt', 'đĩ', 'đụ', 'đù má', 'đụ má', 'súc vật', 'óc chó', 'thằng chó', 'con chó', 'mẹ mày', 'má mày', 'cave'];
const BAD_FLAT = ['dm', 'dmm', 'dcm', 'dkm', 'vcl', 'vkl', 'vl', 'vcc', 'clm', 'cmm', 'cc', 'loz', 'lol', 'fuck', 'fck', 'fucking', 'shit', 'bitch', 'dit me', 'dit cu', 'du ma', 'deo', 'dek'];
const deacc = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const esc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
const mkRe = list => new RegExp('(^|[^\\p{L}\\p{N}])(' + list.map(esc).join('|') + ')(?=$|[^\\p{L}\\p{N}])', 'giu');
const RE_ACC = mkRe(BAD_ACC.map(w => w.normalize('NFC'))), RE_FLAT = mkRe(BAD_FLAT);
function cleanBad(text) {
  const src = [...text.normalize('NFC')];
  const low = src.map(ch => ch.toLowerCase()).map(c => [...c][0] || ' ').join('');
  const flat = src.map(ch => deacc(ch)[0] || ' ').join('');
  let hit = false; const out = src.slice();
  for (const [str, re] of [[low, RE_ACC], [flat, RE_FLAT]]) {
    re.lastIndex = 0;
    str.replace(re, (m, pre, w, off) => {
      hit = true; const a = [...str.slice(0, off + pre.length)].length, n = [...w].length;
      for (let k = a; k < a + n; k++) if (out[k] !== ' ') out[k] = '*';
      return m;
    });
  }
  return { text: out.join(''), hit };
}

// ---------- trích dữ liệu sự kiện TikTok ----------
function findUrl(obj, depth = 0) {
  if (!obj || depth > 4) return '';
  if (typeof obj === 'string') return /^https?:\/\//.test(obj) ? obj : '';
  if (Array.isArray(obj)) { for (const x of obj) { const r = findUrl(x, depth + 1); if (r) return r; } return ''; }
  if (typeof obj === 'object') for (const k of ['urls', 'url', 'urlList', 'url_list', 'urlsList']) if (obj[k]) { const r = findUrl(obj[k], depth + 1); if (r) return r; }
  return '';
}
function pickUser(d) {
  const u = d.user || d.userIdentity || {};
  const avatar = findUrl(u.profilePicture) || findUrl(u.avatarThumb) || findUrl(u.avatarMedium) || findUrl(u.avatarLarge) || u.profilePictureUrl || '';
  // thư viện 2.x (proto v3): tên tài khoản ở displayId
  const handle = typeof u.uniqueId === 'string' ? u.uniqueId : (u.displayId || '');
  const num = u.userId || (u.id && String(u.id) !== '0' ? u.id : '');
  const id = String(handle || num || u.nickname || ('anon' + Math.random()));
  return { id, name: cleanName({ nickname: u.nickname, uniqueId: handle }), avatar };
}

// ---------- máy chủ web ----------
const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e6 });
const vnmap = require('./vnmap-server.js')({ io, readJSON, writeJSON });

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/music', express.static(MUSIC));
app.get('/', (req, res) => res.redirect('/admin.html'));

function lanIPs() {
  return Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
}
const musicList = () => fs.readdirSync(MUSIC).filter(f => /\.(mp3|m4a|ogg|wav|aac)$/i.test(f)).sort();
app.get('/api/info', (req, res) => res.json({ port: PORT, ips: lanIPs(), version: require('./package.json').version }));
app.get('/api/music', (req, res) => res.json(musicList()));
const upload = multer({
  storage: multer.diskStorage({ destination: MUSIC, filename: (req, f, cb) => cb(null, Buffer.from(f.originalname, 'latin1').toString('utf8').replace(/[\\/:*?"<>|]/g, '_')) }),
  fileFilter: (req, f, cb) => cb(null, /\.(mp3|m4a|ogg|wav|aac)$/i.test(f.originalname)),
  limits: { fileSize: 50 * 1024 * 1024 },
});
app.post('/api/music', upload.array('files', 50), (req, res) => { io.emit('music', musicList()); res.json(musicList()); });
app.delete('/api/music/:file', (req, res) => {
  const f = path.join(MUSIC, path.basename(req.params.file)); if (fs.existsSync(f)) fs.unlinkSync(f);
  io.emit('music', musicList()); res.json(musicList());
});

// ảnh đại diện TikTok tải qua máy chủ (tránh bị chặn khi hiện trên OBS)
const IMG_HOSTS = /(^|\.)(tiktokcdn\.com|tiktokcdn-us\.com|tiktokcdn-eu\.com|tiktokv\.com|tiktokv\.us|ibyteimg\.com|byteimg\.com|muscdn\.com|tiktok\.com)$/i;
const imgCache = new Map();
app.get('/api/img', async (req, res) => {
  let u; try { u = new URL(String(req.query.u || '')); } catch { return res.status(400).end(); }
  if (!/^https?:$/.test(u.protocol) || !IMG_HOSTS.test(u.hostname)) return res.status(403).end();
  let hit = imgCache.get(u.href);
  if (!hit) {
    try {
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 8000);
      const r = await fetch(u.href, { signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } }); clearTimeout(to);
      const type = r.headers.get('content-type') || '';
      if (!r.ok || !/^image\//.test(type)) return res.status(502).end();
      const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > 3e6) return res.status(413).end();
      hit = { buf, type }; imgCache.set(u.href, hit);
      if (imgCache.size > 800) imgCache.delete(imgCache.keys().next().value);
    } catch { return res.status(502).end(); }
  }
  res.set('Content-Type', hit.type).set('Cache-Control', 'max-age=3600').send(hit.buf);
});

// ---------- kết nối TikTok LIVE ----------
let conn = null, connState = { status: 'idle', text: 'Chưa kết nối', username: '' };
let reconnectTimer = null, reconnectDelay = 15000, manualStop = false;
function setState(status, text) {
  connState = { status, text, username: settings.username };
  io.emit('connState', connState);
  console.log('[TikTok]', text);
}
const stats = { viewers: 0, comments: 0, likes: 0, gifts: 0, coins: 0 };
const emit = ev => {
  if (ev.type === 'chat') stats.comments++;
  else if (ev.type === 'like') stats.likes += ev.count || 1;
  else if (ev.type === 'gift') { stats.gifts += ev.count || 1; stats.coins += ev.value || 0; }
  vnmap.hook(ev);
};

// quà tặng theo chuỗi (combo): chỉ tính 1 lần khi bắt đầu để màn hình phản ứng ngay, phần còn lại khi kết thúc
const pendingStreaks = new Map();
function handleGift(d) {
  const user = pickUser(d);
  const det = d.giftDetails || d.gift || {};
  const ext = d.extendedGiftInfo || {};
  const name = det.giftName || ext.name || det.name || ('Quà #' + d.giftId);
  const diamonds = Number(det.diamondCount || ext.diamond_count || ext.diamondCount || d.diamondCount || 0);
  const img = (det.giftImage && det.giftImage.giftPictureUrl) || findUrl(ext.image) || findUrl(det.image) || findUrl(det.icon) || '';
  const giftType = det.giftType ?? det.type ?? ext.type;
  const repeatCount = Number(d.repeatCount || 1);
  const key = user.id + ':' + d.giftId;
  const send = n => emit({ type: 'gift', user, gift: { name, diamonds, img }, count: n, value: diamonds * n });
  if (giftType === 1 && !d.repeatEnd) {
    if (!pendingStreaks.has(key)) { pendingStreaks.set(key, 1); send(1); }
    return;
  }
  const already = pendingStreaks.get(key) || 0;
  pendingStreaks.delete(key);
  const count = Math.max(0, repeatCount - already);
  if (count > 0) send(count);
}

function attach(c) {
  const on = (ev, fn) => c.on(ev, d => { try { fn(d || {}); } catch (e) { console.error('Lỗi xử lý sự kiện', ev, e && e.message); } });
  on(WebcastEvent.CHAT, d => emit({ type: 'chat', user: pickUser(d), text: cleanText(d.comment ?? d.content, 80) || '' }));
  on(WebcastEvent.GIFT, handleGift);
  on(WebcastEvent.LIKE, d => emit({ type: 'like', user: pickUser(d), count: Math.max(1, Number(d.likeCount ?? d.count) || 1) }));
  on(WebcastEvent.MEMBER, d => emit({ type: 'member', user: pickUser(d) }));
  on(WebcastEvent.FOLLOW, d => emit({ type: 'follow', user: pickUser(d) }));
  on(WebcastEvent.SHARE, d => emit({ type: 'share', user: pickUser(d) }));
  on(WebcastEvent.ROOM_USER, d => { stats.viewers = Number(d.viewerCount || d.total || d.totalUser || stats.viewers) || 0; vnmap.hook({ type: 'viewers', count: stats.viewers }); });
  c.on(WebcastEvent.STREAM_END, () => { setState('ended', 'Phiên LIVE đã kết thúc'); manualStop = true; });
  const onDisc = () => { if (manualStop) return; setState('reconnecting', 'Mất kết nối — đang thử lại…'); scheduleReconnect(); };
  if (ControlEvent && ControlEvent.DISCONNECTED) c.on(ControlEvent.DISCONNECTED, onDisc); else c.on('disconnected', onDisc);
  c.on('error', e => console.error('[TikTok] lỗi:', e && (e.message || e)));
}

// kết nối nhẹ nhàng để TikTok không nghi là bot: giãn cách giữa các lần, bị chặn thì nghỉ 15 phút
const MIN_GAP = 20000, BLOCK_PAUSE = 15 * 60000;
let lastConnectAt = 0, blockedUntil = 0, skipKeyOnce = false;
async function connectTikTok(fromButton) {
  clearTimeout(reconnectTimer);
  const nowMs = Date.now();
  if (nowMs < blockedUntil && !fromButton) { reconnectTimer = setTimeout(() => connectTikTok(), blockedUntil - nowMs); return; }
  if (nowMs - lastConnectAt < MIN_GAP) {
    const wait = MIN_GAP - (nowMs - lastConnectAt);
    setState('connecting', `Đợi ${Math.ceil(wait / 1000)} giây cho lần kết nối trước (tránh bị TikTok nghi là bot)…`);
    reconnectTimer = setTimeout(() => connectTikTok(), wait); return;
  }
  lastConnectAt = nowMs;
  const uname = String(settings.username || '').replace(/^@/, '').trim();
  if (!uname) return setState('error', 'Chưa nhập tên kênh');
  if (conn) { try { manualStop = true; await conn.disconnect(); } catch {} conn = null; }
  manualStop = false;
  setState('connecting', `Đang kết nối @${uname}…`);
  // không bật enableExtendedGiftInfo: cần gói Business (trả phí) của EulerStream
  const opts = { enableExtendedGiftInfo: false };
  if (settings.apiKey && !skipKeyOnce) opts.signApiKey = settings.apiKey;
  const usedKey = !!opts.signApiKey; skipKeyOnce = false;
  const c = new TikTokLiveConnection(uname, opts);
  conn = c; attach(c);
  try {
    await c.connect();
    if (conn !== c) return;
    reconnectDelay = 15000;
    setState('connected', `✓ Đang nhận @${uname}`);
  } catch (e) {
    if (conn !== c) return;
    const msg = String((e && (e.message || e.name)) || e);
    let text = 'Lỗi: ' + msg, kind = 'other';
    if (/business plan|premium|requires a .*plan|pricing/i.test(msg)) {
      if (usedKey) { setState('connecting', 'Key EulerStream gói miễn phí không dùng được — đang thử kết nối không dùng key…'); skipKeyOnce = true; setTimeout(() => { if (!manualStop) connectTikTok(true); }, 3000); return; }
      text = 'Lỗi: tính năng cần gói trả phí của EulerStream. Hãy xoá key rồi kết nối lại.';
    } else if (/offline|not.*live|UserOffline/i.test(msg) || (e && e.name === 'UserOfflineError')) { kind = 'offline'; text = `@${uname} chưa LIVE — bật LIVE trước rồi kết nối (tự thử lại thưa dần)`; }
    else if (/captcha|verify|403|forbidden|blocked|denied|rate|429|limit/i.test(msg)) {
      kind = 'blocked'; blockedUntil = Date.now() + BLOCK_PAUSE;
      text = 'TikTok đang yêu cầu xác minh / giới hạn lượt — tạm nghỉ 15 phút rồi tự thử lại. Đừng bấm Kết nối liên tục.';
    }
    setState('error', text);
    if (settings.autoReconnect && !manualStop) {
      if (kind === 'blocked') reconnectTimer = setTimeout(() => { if (!manualStop) connectTikTok(); }, BLOCK_PAUSE);
      else { if (kind === 'offline') reconnectDelay = Math.max(reconnectDelay, 60000); scheduleReconnect(); }
    }
  }
}
function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  if (!settings.autoReconnect) return;
  reconnectTimer = setTimeout(() => { if (!manualStop) connectTikTok(); }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 300000);
}
async function disconnectTikTok() {
  manualStop = true; clearTimeout(reconnectTimer);
  if (conn) { try { await conn.disconnect(); } catch {} conn = null; }
  setState('idle', 'Đã ngắt kết nối');
}

const publicSettings = () => ({ username: settings.username, apiKey: settings.apiKey, bannedWords: settings.bannedWords, autoReconnect: settings.autoReconnect, blockSwear: settings.blockSwear });

// mở màn hình LIVE bằng Chrome/Edge (cửa sổ riêng, tự phát tiếng) — dùng cho Window Capture của TikTok LIVE Studio / OBS
function findBrowser() {
  const c = [];
  if (process.platform === 'win32') {
    for (const base of [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean)) {
      c.push(path.join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'), path.join(base, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    }
  } else if (process.platform === 'darwin') {
    c.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Chromium.app/Contents/MacOS/Chromium');
  } else {
    for (const d of (process.env.PATH || '').split(':')) for (const n of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) c.push(path.join(d, n));
  }
  return c.find(f => { try { return fs.statSync(f).isFile(); } catch { return false; } }) || null;
}
app.post('/api/open-live', (req, res) => {
  const ip = req.socket.remoteAddress || '';
  if (!/^(::1|127\.|::ffff:127\.)/.test(ip)) return res.status(403).json({ ok: false, error: 'Chỉ mở được từ chính máy chạy game.' });
  const exe = findBrowser();
  if (!exe) return res.json({ ok: false, error: 'Không tìm thấy Chrome hoặc Edge trên máy.' });
  const url = `http://127.0.0.1:${PORT}/live.html?obs=1`;
  try {
    const child = require('child_process').spawn(exe, ['--autoplay-policy=no-user-gesture-required', `--user-data-dir=${path.join(DATA, 'browser-live')}`, '--no-first-run', '--no-default-browser-check', '--window-size=560,1000', `--app=${url}`], { detached: true, stdio: 'ignore' });
    child.on('error', () => {}); child.unref();
    res.json({ ok: true, browser: path.basename(exe) });
  } catch (e) { res.json({ ok: false, error: String(e.message || e) }); }
});

// trạng thái phòng cho trang điều khiển
setInterval(() => io.emit('roomStats', { ...stats, ram: Math.round(process.memoryUsage().rss / 1048576) }), 2000);

// ---------- socket ----------
io.on('connection', socket => {
  vnmap.onConnection(socket);
  socket.on('hello', () => {
    socket.emit('settings', publicSettings());
    socket.emit('connState', connState);
    socket.emit('music', musicList());
  });
  socket.on('saveSettings', s => {
    if (!s || typeof s !== 'object') return;
    for (const k of ['username', 'apiKey', 'bannedWords']) if (typeof s[k] === 'string') settings[k] = s[k].trim();
    if ('autoReconnect' in s) settings.autoReconnect = !!s.autoReconnect;
    if ('blockSwear' in s) settings.blockSwear = !!s.blockSwear;
    settings.username = settings.username.replace(/^@/, '');
    saveSettings(); io.emit('settings', publicSettings());
  });
  socket.on('connect-tiktok', ({ username, apiKey } = {}) => {
    if (typeof username === 'string') settings.username = username.replace(/^@/, '').trim();
    if (typeof apiKey === 'string') settings.apiKey = apiKey.trim();
    saveSettings(); io.emit('settings', publicSettings()); connectTikTok(true);
  });
  socket.on('disconnect-tiktok', () => disconnectTikTok());
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n  🏮 Thắp Sáng Quê Hương đã chạy');
  console.log(`  Trang điều khiển : http://localhost:${PORT}/admin.html`);
  console.log(`  Màn hình LIVE    : http://localhost:${PORT}/live.html?obs=1`);
  console.log(`  LIVE Studio      : http://127.0.0.1:${PORT}/live.html?obs=1`);
  for (const ip of lanIPs()) console.log(`  Trong mạng LAN   : http://${ip}:${PORT}/live.html?obs=1`);
  console.log('');
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.error(`\n  Cổng ${PORT} đang bận — game đã mở ở cửa sổ khác? Đóng cửa sổ đó rồi chạy lại.\n`);
  else console.error(e);
});
