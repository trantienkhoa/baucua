// Đại Chiến Đô Vật — game TikTok LIVE đấu vật 3D (tự host, không cần key bản quyền)
// Người xem bình luận để ghi danh → 32 đô vật đánh battle royal → 16 người vào vòng 16 → tứ kết → bán kết → chung kết → đai vô địch.
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');

const PORT = Number(process.env.PORT) || 3400;
const DATA = path.join(__dirname, 'data');
fs.mkdirSync(DATA, { recursive: true });

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8')); } catch { return fallback; }
}
function writeJSON(file, obj) {
  try { fs.writeFileSync(path.join(DATA, file), JSON.stringify(obj, null, 2)); } catch (e) { console.error('Không ghi được', file, e.message); }
}

// sức mạnh khi tặng quà — xếp theo xu từ thấp lên cao (quà ≥ mức xu thì được sức mạnh cao nhất đạt tới)
const POWERS = [
  { id: 'enter', label: 'Vào đấu / +20 máu', icon: '🌹', min: 1 },
  { id: 'heal', label: 'Hồi máu +40', icon: '💊', min: 5 },
  { id: 'chair', label: 'Đập ghế xếp', icon: '🪑', min: 10 },
  { id: 'rage', label: 'Cuồng nộ (x2 sát thương)', icon: '🔥', min: 30 },
  { id: 'finisher', label: 'Tung chiêu cuối ngay', icon: '💥', min: 99 },
  { id: 'revive', label: 'Hồi sinh / thoát đếm 3', icon: '♻️', min: 199 },
  { id: 'giant', label: 'Khổng lồ', icon: '🗿', min: 299 },
  { id: 'legend', label: 'Huyền thoại bất bại 20 giây', icon: '👑', min: 999 },
];

const DEFAULT_SETTINGS = {
  username: '',
  apiKey: '',
  autoReconnect: true,
  joinWords: 'đấu, dau, vật, vat, đánh, danh, chiến, chien, join, 1v1',
  regSeconds: 60,            // thời gian ghi danh mỗi giải
  fillBots: true,            // thiếu người thì đô vật máy vào thay
  minHumans: 0,              // cần ít nhất bao nhiêu người xem mới mở giải (0 = không cần)
  entrance: 'auto',          // auto: vòng 16 ra sân nhanh, tứ kết trở đi đầy đủ | full | short | off
  royalEntrance: true,       // battle royal: 32 người lần lượt chạy ra
  r16Together: true,         // vòng 16: 8 cặp đánh cùng lúc trên một võ đài (tứ kết trở đi đánh từng cặp)
  ringGirl: true,            // giữa các vòng có cô gái cầm biển đi quanh võ đài
  matchSeconds: 75,          // thời lượng tối đa một trận 1 đấu 1
  royalSeconds: 150,         // thời lượng tối đa battle royal
  breakSeconds: 25,          // nghỉ giữa hai giải
  speed: 1,                  // tốc độ game (0.5 – 2)
  quality: 'high',           // high | medium | low
  crowdSize: 100,            // % khán giả
  volume: 0.5,
  commentary: true,          // bình luận viên đọc (giọng nói)
  captions: true,            // phụ đề lời bình luận
  ttsVoice: '', ttsVoice2: '', ttsRate: 1.08, ttsVolume: 1,
  ttsNames: true,            // đọc tên người xem khi ra sân
  showComments: true,
  showGiftMenu: true,
  likeCheer: true,           // thả tim = cổ vũ (tăng nộ cho đô vật mình ủng hộ)
  bannedWords: '',
  powers: POWERS.map(p => ({ id: p.id, gift: '', min: p.min })),
};

let settings = Object.assign({}, DEFAULT_SETTINGS, readJSON('settings.json', {}));
settings.powers = POWERS.map(p => Object.assign({ id: p.id, gift: '', min: p.min }, (settings.powers || []).find(x => x && x.id === p.id) || {}));
const saveSettings = () => writeJSON('settings.json', settings);

// lịch sử nhà vô địch + bảng xếp hạng người xem (lưu qua các buổi LIVE)
let champions = readJSON('champions.json', []);
let records = readJSON('records.json', {});   // id -> { name, avatar, titles, wins, finals, matches }
let recordsDirty = false;
setInterval(() => { if (recordsDirty) { recordsDirty = false; writeJSON('records.json', records); } }, 10000);
function topRecords(n = 10) {
  return Object.entries(records).map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => (b.titles - a.titles) || (b.wins - a.wins)).slice(0, n);
}

// danh mục quà (tự học khi có người tặng)
const SEED_GIFTS = [['Rose', 1], ['TikTok', 1], ['GG', 1], ['Ice Cream Cone', 1], ['Finger Heart', 5], ['Rosa', 10], ['Perfume', 20], ['Doughnut', 30], ['Hand Hearts', 100], ['Confetti', 100], ['Sunglasses', 199], ['Corgi', 299], ['Money Gun', 500], ['Galaxy', 1000], ['Lion', 29999]];
let gifts = readJSON('gifts.json', null);
if (!gifts) { gifts = {}; for (const [n, d] of SEED_GIFTS) gifts[n] = { name: n, diamonds: d, img: '' }; writeJSON('gifts.json', gifts); }

// ---------- bộ lọc ----------
const LINK_RE = /(https?:\/\/|www\.|\b[\w-]+\.(com|net|vn|org|io|xyz|me|link|shop|store|online|site|top|info)\b)/i;
const PHONE_RE = /(\+?84|0)[\s.\-]?\d([\s.\-]?\d){7,9}/;
const ZALO_RE = /\b(zalo|za1o|zl|telegram|tele|fb\.com|facebook)\b/i;
function bannedList() { return String(settings.bannedWords || '').split(/[,\n]/).map(s => s.trim().toLowerCase()).filter(Boolean); }
function cleanText(t, max = 60) {
  t = String(t || '').replace(/[\u0000-\u001f]/g, '').trim();
  if (LINK_RE.test(t) || PHONE_RE.test(t) || ZALO_RE.test(t)) return null;
  const low = t.toLowerCase();
  for (const w of bannedList()) if (w && low.includes(w)) return null;
  return t.slice(0, max);
}
function cleanName(u) { return cleanText(u.nickname, 22) || cleanText(u.uniqueId, 22) || 'Khách ẩn danh'; }
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
  const handle = typeof u.uniqueId === 'string' ? u.uniqueId : (u.displayId || '');
  const num = u.userId || (u.id && String(u.id) !== '0' ? u.id : '');
  const id = String(handle || num || u.nickname || ('anon' + Math.random()));
  return { id, name: cleanName({ nickname: u.nickname, uniqueId: handle }), avatar };
}

// ---------- web ----------
const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e6 });
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/three', express.static(path.join(__dirname, 'node_modules', 'three')));
app.get('/', (req, res) => res.redirect('/admin.html'));
function lanIPs() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const i of list || []) if (i.family === 'IPv4' && !i.internal) out.push(i.address);
  return out;
}
app.get('/api/info', (req, res) => res.json({ port: PORT, ips: lanIPs(), powers: POWERS, version: require('./package.json').version }));
app.get('/api/champions', (req, res) => res.json(champions.slice(0, 50)));

// ---------- TikTok ----------
let conn = null;
let connState = { status: 'idle', text: 'Chưa kết nối', username: '' };
let reconnectTimer = null, reconnectDelay = 15000, manualStop = false;
const stats = { viewers: 0, gifts: 0, coins: 0, likes: 0, comments: 0 };
function setState(status, text) {
  connState = { status, text, username: settings.username };
  io.emit('connState', connState);
  console.log('[TikTok]', text);
}
function broadcast(ev) { io.to('game').emit('ev', ev); }

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
  const known = gifts[name];
  if (!known || (img && !known.img) || (diamonds && known.diamonds !== diamonds)) {
    gifts[name] = { name, diamonds: diamonds || (known && known.diamonds) || 0, img: img || (known && known.img) || '' };
    writeJSON('gifts.json', gifts); io.emit('gifts', gifts);
  }
  if (giftType === 1 && !d.repeatEnd) {
    if (!pendingStreaks.has(key)) { pendingStreaks.set(key, 1); processGift(user, { name, diamonds, img }, 1); }
    return;
  }
  const already = pendingStreaks.get(key) || 0;
  pendingStreaks.delete(key);
  const count = Math.max(0, repeatCount - already);
  if (count > 0) processGift(user, { name, diamonds, img }, count);
}
function processGift(user, gift, count) {
  const value = gift.diamonds * count;
  stats.gifts += count; stats.coins += value;
  broadcast({ type: 'gift', user, gift, count, value });
}
function attach(c) {
  const on = (ev, fn) => c.on(ev, d => { try { fn(d || {}); } catch (e) { console.error('Lỗi xử lý sự kiện', ev, e && e.message); } });
  on(WebcastEvent.CHAT, d => { stats.comments++; broadcast({ type: 'chat', user: pickUser(d), text: cleanText(d.comment ?? d.content, 80) || '' }); });
  on(WebcastEvent.GIFT, handleGift);
  on(WebcastEvent.LIKE, d => { const n = Math.max(1, Number(d.likeCount ?? d.count) || 1); stats.likes += n; broadcast({ type: 'like', user: pickUser(d), count: n }); });
  on(WebcastEvent.MEMBER, d => broadcast({ type: 'member', user: pickUser(d) }));
  on(WebcastEvent.FOLLOW, d => broadcast({ type: 'follow', user: pickUser(d) }));
  on(WebcastEvent.SHARE, d => broadcast({ type: 'share', user: pickUser(d) }));
  on(WebcastEvent.ROOM_USER, d => { stats.viewers = Number(d.viewerCount || d.total || d.totalUser || stats.viewers) || 0; broadcast({ type: 'viewers', count: stats.viewers }); });
  c.on(WebcastEvent.STREAM_END, () => { setState('ended', 'Phiên LIVE đã kết thúc'); manualStop = true; });
  const onDisc = () => { if (manualStop) return; setState('reconnecting', 'Mất kết nối — đang thử lại…'); scheduleReconnect(); };
  if (ControlEvent && ControlEvent.DISCONNECTED) c.on(ControlEvent.DISCONNECTED, onDisc); else c.on('disconnected', onDisc);
  c.on('error', e => console.error('[TikTok] lỗi:', e && (e.message || e)));
}
// kết nối nhẹ nhàng để TikTok không nghi là bot
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
      if (usedKey) { setState('connecting', 'Key EulerStream (gói miễn phí) không dùng được — đang thử kết nối không dùng key…'); skipKeyOnce = true; setTimeout(() => { if (!manualStop) connectTikTok(true); }, 3000); return; }
      text = 'Lỗi: tính năng cần gói trả phí của EulerStream. Hãy xoá key rồi kết nối lại.';
    } else if (/offline|not.*live|UserOffline/i.test(msg) || (e && e.name === 'UserOfflineError')) { kind = 'offline'; text = `@${uname} chưa LIVE — bật LIVE trước rồi kết nối (tự thử lại thưa dần)`; }
    else if (/captcha|verify|403|forbidden|blocked|denied|rate|429|limit/i.test(msg)) { kind = 'blocked'; blockedUntil = Date.now() + BLOCK_PAUSE; text = 'TikTok đang yêu cầu xác minh / giới hạn lượt — tạm nghỉ 15 phút rồi tự thử lại.'; }
    setState('error', text);
    if (settings.autoReconnect && !manualStop) {
      if (kind === 'blocked') { clearTimeout(reconnectTimer); reconnectTimer = setTimeout(() => { if (!manualStop) connectTikTok(); }, BLOCK_PAUSE); }
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

// ---------- người xem thử (công cụ thử không cần LIVE) ----------
const TEST_NAMES = ['Tuấn Hùng', 'Linh Mỹ', 'Bảo Quốc', 'Đức Lê', 'Dũng Bùi', 'Hà Vy', 'Minh Khang', 'Thảo Nhi', 'Quang Huy', 'Ngọc Trâm', 'Long Vũ', 'Phúc An', 'Gia Bảo', 'Thanh Tùng', 'Kim Ngân', 'Hoàng Nam', 'Bích Phương', 'Trung Kiên', 'Mai Anh', 'Văn Chương', 'Tiến Đạt', 'Khánh Linh', 'Hữu Phước', 'Yến Nhi', 'Công Vinh', 'Mạnh Cường', 'Thu Trang', 'Đình Trọng', 'Hải Đăng', 'Phương Thảo', 'Nhật Minh', 'Lan Chi', 'Xe sân bay 200k', 'Trào Ngược Dạ Dày', 'BinBin', 'Ne Zha 90', 'Hiha Yummie', 'Ivy Stallion'];
let testN = 0;
function testUser(i) {
  if (!i) i = ++testN;
  const name = TEST_NAMES[(i - 1) % TEST_NAMES.length] + (i > TEST_NAMES.length ? ' ' + Math.ceil(i / TEST_NAMES.length) : '');
  return { id: 'test' + i, name, avatar: '' };
}
const randTestUser = () => testUser(Math.max(1, Math.ceil(Math.random() * Math.max(1, testN))));

// ---------- socket ----------
let gameStatus = {};
io.on('connection', socket => {
  socket.on('hello', role => {
    if (role === 'game') socket.join('game'); else socket.join('admin');
    socket.emit('settings', settings);
    socket.emit('gifts', gifts);
    socket.emit('connState', connState);
    socket.emit('champions', champions.slice(0, 20));
    socket.emit('records', topRecords());
  });
  socket.on('saveSettings', s => {
    if (!s || typeof s !== 'object') return;
    for (const k of Object.keys(DEFAULT_SETTINGS)) if (k in s) settings[k] = s[k];
    saveSettings(); io.emit('settings', settings);
  });
  socket.on('connect-tiktok', ({ username, apiKey } = {}) => {
    if (typeof username === 'string') settings.username = username.replace(/^@/, '').trim();
    if (typeof apiKey === 'string') settings.apiKey = apiKey.trim();
    saveSettings(); connectTikTok(true);
  });
  socket.on('disconnect-tiktok', () => disconnectTikTok());
  socket.on('cmd', c => { if (c && typeof c.type === 'string') io.to('game').emit('cmd', c); });
  socket.on('say', m => { if (m && typeof m.text === 'string') io.to('admin').emit('say', { text: m.text.slice(0, 220), voice: m.voice | 0 }); });
  socket.on('status', s => { if (s && typeof s === 'object') { gameStatus = s; } });

  // game báo kết quả để lưu bảng vàng
  socket.on('result', r => {
    if (!r || typeof r !== 'object') return;
    const touch = (u) => {
      if (!u || !u.id || u.bot) return null;
      const rec = records[u.id] || (records[u.id] = { name: u.name, avatar: u.avatar || '', titles: 0, wins: 0, finals: 0, matches: 0 });
      rec.name = u.name; if (u.avatar) rec.avatar = u.avatar; recordsDirty = true; return rec;
    };
    if (r.kind === 'match') {
      const w = touch(r.winner), l = touch(r.loser);
      if (w) { w.wins++; w.matches++; } if (l) l.matches++;
      if (r.final) { if (w) w.finals++; if (l) l.finals++; }
    } else if (r.kind === 'champion' && r.winner) {
      const w = touch(r.winner); if (w) w.titles++;
      champions.unshift({ name: r.winner.name, avatar: r.winner.avatar || '', bot: !!r.winner.bot, wrestler: String(r.wrestler || ''), at: Date.now() });
      champions = champions.slice(0, 200); writeJSON('champions.json', champions);
    }
    io.emit('champions', champions.slice(0, 20));
    io.emit('records', topRecords());
  });
  socket.on('resetRecords', () => { records = {}; champions = []; writeJSON('records.json', records); writeJSON('champions.json', champions); io.emit('champions', []); io.emit('records', []); });

  // công cụ thử
  socket.on('test', t => {
    if (!t) return;
    if (t.kind === 'join') {
      const n = Math.min(40, Number(t.n) || 10);
      for (let i = 0; i < n; i++) setTimeout(() => broadcast({ type: 'chat', user: testUser(), text: t.text || 'đấu' }), i * 150);
    } else if (t.kind === 'chat') {
      broadcast({ type: 'chat', user: randTestUser(), text: String(t.text || '').slice(0, 80) });
    } else if (t.kind === 'like') {
      for (let i = 0; i < 10; i++) setTimeout(() => broadcast({ type: 'like', user: randTestUser(), count: 5 }), i * 100);
    } else if (t.kind === 'gift') {
      const p = settings.powers.find(x => x.id === t.power) || { min: Number(t.value) || 1 };
      const user = randTestUser();
      const g = { name: p.gift || 'Quà thử', diamonds: Math.max(1, p.min || 1), img: '' };
      broadcast({ type: 'gift', user, gift: g, count: 1, value: g.diamonds, forcePower: t.power });
    } else if (t.kind === 'follow') broadcast({ type: 'follow', user: randTestUser() });
  });
});

// trạng thái cho trang điều khiển
setInterval(() => { io.to('admin').emit('stats', { ...stats, ...gameStatus, ram: Math.round(process.memoryUsage().rss / 1048576) }); }, 1500);

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n  Đại Chiến Đô Vật đã chạy');
  console.log(`  Trang điều khiển : http://localhost:${PORT}/admin.html`);
  console.log(`  Màn hình game    : http://localhost:${PORT}/game.html`);
  for (const ip of lanIPs()) console.log(`  Trong mạng LAN   : http://${ip}:${PORT}/game.html`);
  console.log('');
  if (settings.username && settings.autoReconnect && process.env.AUTOCONNECT !== '0') connectTikTok();
});
