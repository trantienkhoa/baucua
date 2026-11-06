// Vũ Trường Neon — game TikTok LIVE sàn nhảy (bản tự host, không cần key bản quyền)
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const express = require('express');
const multer = require('multer');
const { Server } = require('socket.io');
const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');

const PORT = Number(process.env.PORT) || 3300;
const DATA = path.join(__dirname, 'data');
const MUSIC = path.join(DATA, 'music');
fs.mkdirSync(MUSIC, { recursive: true });

// ---------- lưu trữ JSON ----------
function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8')); } catch { return fallback; }
}
function writeJSON(file, obj) {
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(obj, null, 2));
}

const ACTIONS = [
  { id: 'camera', label: 'Camera', icon: '🎥', min: 1 },
  { id: 'outfit', label: 'Đổi đồ', icon: '👕', min: 1 },
  { id: 'catwalk', label: 'Catwalk', icon: '🚶', min: 1 },
  { id: 'jump', label: 'Nhảy cao', icon: '🦘', min: 1 },
  { id: 'fireworks', label: 'Pháo hoa', icon: '🎆', min: 5 },
  { id: 'balloons', label: 'Mưa bong bóng', icon: '🎈', min: 10 },
  { id: 'giant', label: 'Khổng lồ', icon: '🦖', min: 20 },
  { id: 'pair', label: 'Ghép đôi', icon: '💞', min: 30 },
  { id: 'clone', label: 'Phân thân', icon: '👯', min: 50 },
  { id: 'wings', label: 'Mọc cánh', icon: '🪽', min: 70 },
  { id: 'dj', label: 'Lên DJ', icon: '🎧', min: 99 },
  { id: 'rocket', label: 'Tên lửa', icon: '🚀', min: 199 },
  { id: 'cloud', label: 'Cưỡi mây', icon: '☁️', min: 299 },
  { id: 'throne', label: 'Ngai vàng', icon: '🪑', min: 499 },
  { id: 'king', label: 'Đăng quang', icon: '👑', min: 999 },
];

const DEFAULT_SETTINGS = {
  username: '',
  apiKey: '',
  autoReconnect: true,
  quality: 'high',          // high | medium | low
  musicEnabled: true,       // phát bài đã tải lên
  synthMusic: true,         // chưa có bài → máy tự đánh nhạc
  volume: 0.35,
  maxDancers: 150,
  idleSeconds: 420,
  zoomMin: 3,
  zoomMax: 6,
  camZoom: 2.4,
  heatTarget: 0,            // 0 = tự động theo số người xem
  fireSeconds: 15,
  showComments: true,
  autoCam: true,
  showTop: true,
  topDJ: true,
  showCoins: false,
  showGiftMenu: true,
  showJoinTicker: true,
  tierNoble: 99,
  tierKing: 299,
  tierEmperor: 999,
  bannedWords: '',
  actions: ACTIONS.map(a => ({ id: a.id, gift: '', min: a.min })),
};

let settings = Object.assign({}, DEFAULT_SETTINGS, readJSON('settings.json', {}));
// bổ sung hành động mới nếu file cũ thiếu
for (const a of ACTIONS) if (!settings.actions.find(x => x.id === a.id)) settings.actions.push({ id: a.id, gift: '', min: a.min });

// danh mục quà (tự học khi có người tặng)
const SEED_GIFTS = [
  ['Rose', 1], ['TikTok', 1], ['GG', 1], ['Ice Cream Cone', 1], ['Heart Me', 1], ['Finger Heart', 5],
  ['Rosa', 10], ['Perfume', 20], ['Doughnut', 30], ['Hand Hearts', 100], ['Confetti', 100],
  ['Sunglasses', 199], ['Corgi', 299], ['Money Gun', 500], ['Galaxy', 1000], ['Lion', 29999], ['Universe', 44999],
];
let gifts = readJSON('gifts.json', null);
if (!gifts) { gifts = {}; for (const [n, d] of SEED_GIFTS) gifts[n] = { name: n, diamonds: d, img: '' }; writeJSON('gifts.json', gifts); }

const saveSettings = () => writeJSON('settings.json', settings);

// ---------- bộ lọc ----------
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
  return t.slice(0, max);
}
function cleanName(u) {
  const n = cleanText(u.nickname, 24) || cleanText(u.uniqueId, 24);
  return n || 'Khách ẩn danh';
}

// ---------- trích dữ liệu sự kiện ----------
function findUrl(obj, depth = 0) {
  if (!obj || depth > 4) return '';
  if (typeof obj === 'string') return /^https?:\/\//.test(obj) ? obj : '';
  if (Array.isArray(obj)) { for (const x of obj) { const r = findUrl(x, depth + 1); if (r) return r; } return ''; }
  if (typeof obj === 'object') {
    for (const k of ['urls', 'url', 'urlList', 'url_list', 'urlsList']) if (obj[k]) { const r = findUrl(obj[k], depth + 1); if (r) return r; }
  }
  return '';
}
function pickUser(d) {
  const u = d.user || d.userIdentity || {};
  const avatar = findUrl(u.profilePicture) || findUrl(u.avatarThumb) || findUrl(u.avatarMedium) || u.profilePictureUrl || '';
  const id = String(u.uniqueId || u.userId || u.id || u.nickname || Math.random());
  return { id, name: cleanName(u), avatar };
}

// ---------- tổng xu / top ----------
const coins = new Map(); // id -> {id,name,avatar,coins}
function addCoins(user, n) {
  const c = coins.get(user.id) || { ...user, coins: 0 };
  c.name = user.name; if (user.avatar) c.avatar = user.avatar;
  c.coins += n; coins.set(user.id, c);
  return c.coins;
}
function topList() {
  return [...coins.values()].sort((a, b) => b.coins - a.coins).slice(0, 5);
}

// ---------- web ----------
const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e6 });
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/music', express.static(MUSIC));
app.get('/', (req, res) => res.redirect('/admin.html'));
app.get('/game', (req, res) => res.sendFile(path.join(__dirname, 'public', 'game.html')));

function lanIPs() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const i of list || []) if (i.family === 'IPv4' && !i.internal) out.push(i.address);
  return out;
}
function musicList() {
  return fs.readdirSync(MUSIC).filter(f => /\.(mp3|m4a|ogg|wav|aac)$/i.test(f)).sort();
}
app.get('/api/info', (req, res) => res.json({ port: PORT, ips: lanIPs(), actions: ACTIONS, version: require('./package.json').version }));
app.get('/api/music', (req, res) => res.json(musicList()));
const upload = multer({
  storage: multer.diskStorage({
    destination: MUSIC,
    filename: (req, file, cb) => {
      const name = Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/[\\/:*?"<>|]/g, '_');
      cb(null, name);
    },
  }),
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /\.(mp3|m4a|ogg|wav|aac)$/i.test(file.originalname)),
});
app.post('/api/music', upload.array('files', 50), (req, res) => { io.emit('music', musicList()); res.json(musicList()); });
app.delete('/api/music/:name', (req, res) => {
  const f = path.join(MUSIC, path.basename(req.params.name));
  if (fs.existsSync(f)) fs.unlinkSync(f);
  io.emit('music', musicList()); res.json(musicList());
});

// ---------- TikTok ----------
let conn = null;
let connState = { status: 'idle', text: 'Chưa kết nối', username: '' };
let reconnectTimer = null;
let reconnectDelay = 5000;
let manualStop = false;
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
  const giftType = det.giftType ?? ext.type;
  const repeatCount = Number(d.repeatCount || 1);
  const key = user.id + ':' + d.giftId;

  // học hình quà
  const known = gifts[name];
  if (!known || (img && !known.img) || (diamonds && known.diamonds !== diamonds)) {
    gifts[name] = { name, diamonds: diamonds || (known && known.diamonds) || 0, img: img || (known && known.img) || '' };
    writeJSON('gifts.json', gifts);
    io.emit('gifts', gifts);
  }

  if (giftType === 1 && !d.repeatEnd) {
    // chuỗi đang chạy: chỉ xử lý lần đầu để game phản ứng ngay, phần còn lại tính khi kết thúc
    if (!pendingStreaks.has(key)) {
      pendingStreaks.set(key, 1);
      processGift(user, { name, diamonds, img }, 1);
    }
    return;
  }
  const already = pendingStreaks.get(key) || 0;
  pendingStreaks.delete(key);
  const count = Math.max(0, repeatCount - already);
  if (count > 0) processGift(user, { name, diamonds, img }, count);
}

function processGift(user, gift, count) {
  const value = gift.diamonds * count;
  const total = addCoins(user, value);
  stats.gifts += count; stats.coins += value;
  broadcast({ type: 'gift', user, gift, count, value, total });
  io.emit('top', topList());
}

function attach(c) {
  c.on(WebcastEvent.CHAT, d => {
    const user = pickUser(d);
    stats.comments++;
    broadcast({ type: 'chat', user, text: cleanText(d.comment, 80) });
  });
  c.on(WebcastEvent.GIFT, d => { try { handleGift(d); } catch (e) { console.error('gift', e); } });
  c.on(WebcastEvent.LIKE, d => {
    const n = Number(d.likeCount || 1);
    stats.likes += n;
    broadcast({ type: 'like', user: pickUser(d), count: n });
  });
  c.on(WebcastEvent.MEMBER, d => broadcast({ type: 'member', user: pickUser(d) }));
  c.on(WebcastEvent.FOLLOW, d => broadcast({ type: 'follow', user: pickUser(d) }));
  c.on(WebcastEvent.SHARE, d => broadcast({ type: 'share', user: pickUser(d) }));
  c.on(WebcastEvent.ROOM_USER, d => {
    stats.viewers = Number(d.viewerCount || d.totalUser || stats.viewers);
    broadcast({ type: 'viewers', count: stats.viewers });
  });
  c.on(WebcastEvent.STREAM_END, () => { setState('ended', 'Phiên LIVE đã kết thúc'); manualStop = true; });
  const onDisc = () => {
    if (manualStop) return;
    setState('reconnecting', 'Mất kết nối — đang thử lại…');
    scheduleReconnect();
  };
  if (ControlEvent && ControlEvent.DISCONNECTED) c.on(ControlEvent.DISCONNECTED, onDisc);
  else c.on('disconnected', onDisc);
  c.on('error', e => console.error('[TikTok] lỗi:', e && (e.message || e)));
}

async function connectTikTok() {
  clearTimeout(reconnectTimer);
  const uname = String(settings.username || '').replace(/^@/, '').trim();
  if (!uname) return setState('error', 'Chưa nhập tên kênh');
  if (conn) { try { manualStop = true; await conn.disconnect(); } catch {} conn = null; }
  manualStop = false;
  setState('connecting', `Đang kết nối @${uname}…`);
  const opts = { enableExtendedGiftInfo: true };
  if (settings.apiKey) opts.signApiKey = settings.apiKey; // không bắt buộc
  const c = new TikTokLiveConnection(uname, opts);
  conn = c;
  attach(c);
  try {
    await c.connect();
    if (conn !== c) return;
    reconnectDelay = 5000;
    setState('connected', `✓ Đang nhận @${uname}`);
  } catch (e) {
    if (conn !== c) return;
    const msg = String((e && (e.message || e.name)) || e);
    let text = 'Lỗi: ' + msg;
    if (/offline|not.*live|UserOffline/i.test(msg) || (e && e.name === 'UserOfflineError')) text = `@${uname} chưa LIVE — bật LIVE trước rồi kết nối`;
    else if (/rate|429|limit/i.test(msg)) text = 'Máy chủ ký đang giới hạn lượt — đợi vài phút rồi tự thử lại';
    setState('error', text);
    if (settings.autoReconnect && !manualStop) scheduleReconnect();
  }
}
function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  if (!settings.autoReconnect) return;
  reconnectTimer = setTimeout(() => { if (!manualStop) connectTikTok(); }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 120000);
}
async function disconnectTikTok() {
  manualStop = true; clearTimeout(reconnectTimer);
  if (conn) { try { await conn.disconnect(); } catch {} conn = null; }
  setState('idle', 'Đã ngắt kết nối');
}

// ---------- socket ----------
const screens = new Map(); // socket.id -> status
let testN = 0;
const TEST_NAMES = ['Mây Hồng', 'Tuấn Béo', 'Linh Xinh', 'Bảo Ngọc', 'Hải Đăng', 'Minh Thư', 'Gấu Trúc', 'Cún Con', 'Thỏ Bông', 'Khoai Tây', 'Bé Na', 'Anh Ba', 'Trà Sữa', 'Mèo Mập', 'Su Su'];
function testUser(i) {
  const n = i ?? (++testN);
  return { id: 'test' + n, name: (TEST_NAMES[n % TEST_NAMES.length]) + ' ' + n, avatar: '' };
}

io.on('connection', socket => {
  socket.on('hello', role => {
    if (role === 'game') { socket.join('game'); screens.set(socket.id, {}); }
    else socket.join('admin');
    socket.emit('settings', settings);
    socket.emit('gifts', gifts);
    socket.emit('music', musicList());
    socket.emit('top', topList());
    socket.emit('connState', connState);
  });
  socket.on('status', s => { if (screens.has(socket.id)) screens.set(socket.id, s || {}); });
  socket.on('disconnect', () => screens.delete(socket.id));

  socket.on('saveSettings', s => {
    if (!s || typeof s !== 'object') return;
    for (const k of Object.keys(DEFAULT_SETTINGS)) if (k in s) settings[k] = s[k];
    saveSettings();
    io.emit('settings', settings);
  });
  socket.on('connect-tiktok', async ({ username, apiKey } = {}) => {
    if (typeof username === 'string') settings.username = username.replace(/^@/, '').trim();
    if (typeof apiKey === 'string') settings.apiKey = apiKey.trim();
    saveSettings();
    connectTikTok();
  });
  socket.on('disconnect-tiktok', () => disconnectTikTok());
  socket.on('cmd', c => { if (c && typeof c.type === 'string') io.to('game').emit('cmd', c); });
  socket.on('resetTop', () => { coins.clear(); io.emit('top', topList()); });

  // công cụ thử
  socket.on('test', t => {
    if (!t) return;
    if (t.kind === 'join') {
      const n = Math.min(100, Number(t.n) || 10);
      for (let i = 0; i < n; i++) setTimeout(() => broadcast({ type: 'chat', user: testUser(), text: 'hi' }), i * 120);
    } else if (t.kind === 'chat') {
      broadcast({ type: 'chat', user: testUser(Math.max(1, Math.floor(Math.random() * Math.max(1, testN)))), text: String(t.text || '').slice(0, 80) });
    } else if (t.kind === 'like') {
      broadcast({ type: 'like', user: testUser(1), count: Number(t.n) || 30 });
    } else if (t.kind === 'gift') {
      const a = settings.actions.find(x => x.id === t.action);
      const giftName = (a && a.gift) || 'Quà thử';
      const g = gifts[giftName] || { name: giftName, diamonds: (a && a.min) || 1, img: '' };
      const user = testUser(Math.max(1, Math.floor(Math.random() * Math.max(1, testN))) || 1);
      const value = Math.max(g.diamonds, (a && a.min) || 1);
      const total = addCoins(user, value);
      broadcast({ type: 'gift', user, gift: { ...g, diamonds: value }, count: 1, value, total, forceAction: t.action });
      io.emit('top', topList());
    }
  });
});

// trạng thái cho trang điều khiển
setInterval(() => {
  let s = { onFloor: 0, zooming: '—', queue: 0 };
  for (const v of screens.values()) { s = v; break; }
  io.to('admin').emit('stats', {
    ...stats, ...s, screens: screens.size,
    ram: Math.round(process.memoryUsage().rss / 1048576),
  });
}, 1500);

server.listen(PORT, '0.0.0.0', () => {
  const ips = lanIPs();
  console.log('\n  Vũ Trường Neon đã chạy');
  console.log(`  Trang điều khiển : http://localhost:${PORT}/admin.html`);
  console.log(`  Màn hình game    : http://localhost:${PORT}/game.html`);
  for (const ip of ips) console.log(`  Trong mạng LAN   : http://${ip}:${PORT}/game.html`);
  console.log('');
  if (settings.username && settings.autoReconnect && process.env.AUTOCONNECT !== '0') connectTikTok();
});
