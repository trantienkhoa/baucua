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

// hành động khi tặng quà — chỉ những việc có thật ở quán bar, xếp theo xu từ thấp lên cao
const ACTIONS = [
  { id: 'camera', label: 'Lên hình', icon: '🎥', min: 1 },
  { id: 'cheer', label: 'Cả sàn cổ vũ', icon: '👏', min: 5 },
  { id: 'outfit', label: 'Đổi đồ', icon: '👕', min: 10 },
  { id: 'catwalk', label: 'Catwalk', icon: '🚶', min: 15 },
  { id: 'balloons', label: 'Thả bong bóng', icon: '🎈', min: 20 },
  { id: 'confetti', label: 'Bắn pháo giấy', icon: '🎊', min: 30 },
  { id: 'smoke', label: 'Phun khói CO2', icon: '🌫️', min: 50 },
  { id: 'spotlight', label: 'Đèn rọi theo', icon: '🔦', min: 70 },
  { id: 'sparkle', label: 'Pháo sáng', icon: '✨', min: 99 },
  { id: 'champagne', label: 'Khui sâm panh', icon: '🍾', min: 150 },
  { id: 'pair', label: 'Ghép đôi', icon: '💞', min: 199 },
  { id: 'stage', label: 'Lên sân khấu', icon: '🎤', min: 299 },
  { id: 'dj', label: 'Lên DJ', icon: '🎧', min: 399 },
  { id: 'solo', label: 'Thách đấu solo', icon: '⚔️', min: 499 },
  { id: 'vip', label: 'Ngồi bàn VIP', icon: '🛋️', min: 599 },
  { id: 'flashmob', label: 'Flash mob', icon: '🕺', min: 799 },
  { id: 'party', label: 'Bao cả sàn', icon: '🥂', min: 999 },
];

const DEFAULT_SETTINGS = {
  username: '',
  apiKey: '',
  autoReconnect: true,
  quality: 'high',          // high | medium | low
  charStyle: 'real',
  rosterEnabled: true,      // người xem nhập vai nhân vật trong roster.csv
  partyMix: 25,             // % người mặc đồ dạ hội (còn lại đồ đi bar hot trend)
  costumeRate: 15,          // % người lên sàn được hoá trang sẵn (còn lại mặc đồ dạ hội)
  djName: 'DJ Tiến Khoa',   // tên DJ trên bàn DJ
  barEnabled: true,         // bàn ghế quán bar (salon + bàn tròn đứng), sàn nhảy thu hẹp lại
  lcdEvents: true,          // sự kiện LIVE (quà, follow, sàn cháy…) hiện trên màn LCD
  lcdJoin: false,           // cả người vào xem cũng hiện trên màn LCD
  textEnabled: true,        // tặng quà kèm lời nhắn → chữ lên màn LCD
  textCoins: 30,            // tổng quà (💎) tối thiểu để được chiếu lời nhắn
  textSeconds: 10,          // mỗi lời nhắn hiện bao lâu
  textApprove: false,       // chủ phòng duyệt trước khi chiếu
  smokeEnabled: true,       // khói sàn
  smokeDensity: 55,         // độ dày khói nền (0–100)
  sparkEnabled: true,       // pháo sáng (vòi tia lửa lạnh) trên sân khấu
  fxCoins: 99,              // quà từ bao nhiêu 💎 thì tự phun khói + pháo sáng
  fxOnFire: true,           // sàn cháy → phun khói + pháo sáng
  ledShow: true,            // người tặng quà lớn được chiếu lên màn LED
  ledCoins: 99,             // từ bao nhiêu xu thì lên màn LED
  ledSeconds: 12,           // thời gian chiếu mỗi người
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
  // MC giọng nói
  ttsEnabled: true, ttsWhere: 'game', ttsVolume: 1, ttsRate: 1.05, ttsMinCoins: 1, ttsJoin: false, ttsFollow: true,
  // đấu đội
  battleSeconds: 180, battleAuto: 0,          // tự mở mỗi N phút (0 = tắt)
  // solo
  soloSeconds: 20,
  // đèn chiếu ngẫu nhiên
  spotlightEvery: 60,                          // giây (0 = tắt)
  // flash mob
  flashSeconds: 20,
  // bình chọn nhạc
  songVote: true,
  // mục tiêu phòng → sân khấu
  goalsEnabled: true, theme: 'club',
  goals: [{ kind: 'likes', n: 2000, theme: 'beach' }, { kind: 'coins', n: 500, theme: 'space' }, { kind: 'likes', n: 8000, theme: 'tet' }, { kind: 'coins', n: 2000, theme: 'halloween' }, { kind: 'likes', n: 20000, theme: 'noel' }],
  // clip
  clipsEnabled: true, clipSeconds: 15,
  // cấp độ fan: hoá trang cần cấp
  costumeLevels: { wukong: 5, angel: 8, king: 10 },
  actions: ACTIONS.map(a => ({ id: a.id, gift: '', min: a.min })),
  actionsVersion: 2,
};

const savedSettings = readJSON('settings.json', {});
let settings = Object.assign({}, DEFAULT_SETTINGS, savedSettings);
// bổ sung hành động mới nếu file cũ thiếu
// bản 1.9.3: bỏ hành động không có thật (mọc cánh, cưỡi mây…), xếp lại mức xu; giữ quà đã gán cho hành động còn lại
if ((savedSettings.actionsVersion || 1) < 2) {
  const old = new Map((settings.actions || []).map(x => [x.id, x]));
  settings.actions = ACTIONS.map(a => ({ id: a.id, gift: (old.get(a.id) || {}).gift || '', min: a.min }));
  settings.actionsVersion = 2; writeJSON('settings.json', settings);
}
settings.actions = settings.actions.filter(x => ACTIONS.some(a => a.id === x.id));
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

// ---------- cấp độ fan (lưu qua các buổi LIVE) ----------
let fans = readJSON('fans.json', {});
let fansDirty = false;
let session = { id: Date.now(), start: Date.now() };
const seenThisSession = new Set();
const chatXpAt = new Map();
const levelOf = xp => Math.min(99, Math.floor(Math.sqrt(Math.max(0, xp) / 15)) + 1);
function fanTouch(user, xp, extra) {
  if (!user || !user.id) return user;
  let f = fans[user.id];
  if (!f) f = fans[user.id] = { name: user.name, avatar: user.avatar || '', xp: 0, sessions: 0, coins: 0, first: Date.now() };
  f.name = user.name; if (user.avatar) f.avatar = user.avatar;
  const extraEv = [];
  if (!seenThisSession.has(user.id)) {
    seenThisSession.add(user.id);
    f.sessions = (f.sessions || 0) + 1;
    f.last = Date.now();
    if (f.sessions > 1) extraEv.push({ type: 'welcomeback', user: { ...user, lv: levelOf(f.xp) }, sessions: f.sessions });
  }
  const before = levelOf(f.xp);
  f.xp += xp || 0;
  if (extra && extra.coins) f.coins = (f.coins || 0) + extra.coins;
  const lv = levelOf(f.xp);
  fansDirty = true;
  user.lv = lv; user.sessions = f.sessions;
  if (lv > before) extraEv.push({ type: 'levelup', user: { ...user }, lv });
  for (const e of extraEv) setTimeout(() => broadcast(e), 300);
  return user;
}
setInterval(() => { if (fansDirty) { fansDirty = false; writeJSON('fans.json', fans); } }, 10000);
function topFans(n = 50) {
  return Object.entries(fans).map(([id, f]) => ({ id, ...f, lv: levelOf(f.xp) })).sort((a, b) => b.xp - a.xp).slice(0, n);
}

// ---------- danh sách nhân vật tự tạo (roster.csv) ----------
function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false;
  text = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; if (row.some(x => x.trim())) rows.push(row); row = []; }
    else f += c;
  }
  row.push(f); if (row.some(x => x.trim())) rows.push(row);
  return rows;
}
function loadRoster() {
  let text = null;
  for (const f of [path.join(DATA, 'roster.csv'), path.join(__dirname, 'roster.csv')]) { try { text = fs.readFileSync(f, 'utf8'); break; } catch {} }
  if (!text) return [];
  const rows = parseCSV(text); if (rows.length < 2) return [];
  const head = rows[0].map(h => h.trim().toLowerCase());
  const col = (...names) => head.findIndex(h => names.some(n => h.includes(n)));
  const ci = { id: col('id', 'mã'), name: col('name', 'tên'), gender: col('gender', 'giới'), age: col('age', 'tuổi'), outfit: col('outfit', 'trang phục'), style: col('dance', 'điệu'), pers: col('personality', 'tính cách') };
  return rows.slice(1).map((r, i) => ({
    id: (r[ci.id] || 'char' + (i + 1)).trim(), name: (r[ci.name] || '').trim(),
    female: /n[ữu]|female|f\b|girl|woman/i.test(r[ci.gender] || ''), age: Number(r[ci.age]) || 25,
    outfit: (r[ci.outfit] || '').trim(), style: (r[ci.style] || '').trim(), personality: (r[ci.pers] || '').trim(),
  })).filter(x => x.outfit || x.name);
}
let roster = loadRoster();
console.log('  Danh sách nhân vật:', roster.length);

// ---------- web ----------
const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e6 });
app.use(express.json({ limit: '1mb' }));
app.use('/api/clips', express.raw({ type: () => true, limit: '300mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/music', express.static(MUSIC));
app.use('/three', express.static(path.join(__dirname, 'node_modules', 'three')));
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
app.get('/api/roster', (req, res) => res.json(roster));
app.post('/api/roster', express.text({ type: () => true, limit: '2mb' }), (req, res) => {
  const text = String(req.body || '');
  if (!text.trim()) return res.status(400).end();
  fs.writeFileSync(path.join(DATA, 'roster.csv'), text);
  roster = loadRoster(); io.emit('roster', roster); res.json(roster);
});
app.delete('/api/roster', (req, res) => { try { fs.unlinkSync(path.join(DATA, 'roster.csv')); } catch {} roster = loadRoster(); io.emit('roster', roster); res.json(roster); });
// ---------- fan ----------
app.get('/api/fans', (req, res) => res.json(topFans(100)));
app.delete('/api/fans', (req, res) => { fans = {}; seenThisSession.clear(); writeJSON('fans.json', fans); res.json([]); });
// ---------- clip khoảnh khắc ----------
const CLIPS = path.join(DATA, 'clips');
fs.mkdirSync(CLIPS, { recursive: true });
app.use('/clips', express.static(CLIPS));
function clipList() {
  try { return fs.readdirSync(CLIPS).filter(f => /\.(webm|mp4)$/i.test(f)).sort().reverse().map(f => ({ file: f, url: '/clips/' + encodeURIComponent(f), size: fs.statSync(path.join(CLIPS, f)).size })); } catch { return []; }
}
app.get('/api/clips', (req, res) => res.json(clipList()));
app.post('/api/clips', (req, res) => {
  const ext = /mp4/i.test(String(req.headers['content-type'])) ? 'mp4' : 'webm';
  const reason = String(req.query.reason || 'clip').replace(/[^a-z0-9-]/gi, '').slice(0, 20) || 'clip';
  const d = new Date(); const pad = n => String(n).padStart(2, '0');
  const name = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${reason}.${ext}`;
  if (!req.body || !req.body.length) return res.status(400).end();
  fs.writeFileSync(path.join(CLIPS, name), req.body);
  // giữ tối đa 200 clip
  const all = clipList(); for (const c of all.slice(200)) { try { fs.unlinkSync(path.join(CLIPS, c.file)); } catch {} }
  io.to('admin').emit('clips', clipList());
  res.json({ file: name });
});
app.delete('/api/clips/:file', (req, res) => { const f = path.join(CLIPS, path.basename(req.params.file)); if (fs.existsSync(f)) fs.unlinkSync(f); io.to('admin').emit('clips', clipList()); res.json(clipList()); });
// ---------- nhân vật (mô hình 3D) ----------
const BUILTIN_MODELS = path.join(__dirname, 'public', 'models');
const USER_MODELS = path.join(DATA, 'models');
fs.mkdirSync(USER_MODELS, { recursive: true });
app.use('/usermodels', express.static(USER_MODELS));
const MODEL_RE = /\.(glb|fbx|vrm)$/i;
function modelList() {
  const meta = readJSON('models.json', {});
  const out = [];
  const add = (dir, prefix, builtin) => {
    let files = []; try { files = fs.readdirSync(dir).filter(f => MODEL_RE.test(f)).sort(); } catch {}
    for (const f of files) {
      const key = (builtin ? 'b:' : 'u:') + f;
      const m = meta[key] || {};
      // charXX: giới tính lấy theo danh sách nhân vật
      const cm = f.match(/^(char\d+)/i), rc = cm && roster.find(r => r.id.toLowerCase() === cm[1].toLowerCase());
      out.push({ key, file: f, url: prefix + encodeURIComponent(f), builtin,
        female: m.female ?? (rc ? rc.female : /(^|[^a-z])(nu|female|girl|woman)([^a-z]|$)/i.test(f.replace(MODEL_RE, ''))),
        enabled: m.enabled ?? true, size: (() => { try { return fs.statSync(path.join(dir, f)).size; } catch { return 0; } })() });
    }
  };
  add(BUILTIN_MODELS, '/models/', true);
  add(USER_MODELS, '/usermodels/', false);
  return out;
}
app.get('/api/models', (req, res) => res.json(modelList()));
const modelUpload = multer({
  storage: multer.diskStorage({
    destination: USER_MODELS,
    filename: (req, file, cb) => cb(null, Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/[\\/:*?"<>|]/g, '_')),
  }),
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, MODEL_RE.test(file.originalname)),
});
app.post('/api/models', modelUpload.array('files', 30), (req, res) => { io.emit('models', modelList()); res.json(modelList()); });
app.patch('/api/models', (req, res) => {
  const { key, female, enabled } = req.body || {};
  if (typeof key !== 'string') return res.status(400).end();
  const meta = readJSON('models.json', {});
  meta[key] = Object.assign(meta[key] || {}, female !== undefined ? { female: !!female } : {}, enabled !== undefined ? { enabled: !!enabled } : {});
  writeJSON('models.json', meta);
  io.emit('models', modelList()); res.json(modelList());
});
app.delete('/api/models/:file', (req, res) => {
  const f = path.join(USER_MODELS, path.basename(req.params.file));
  if (fs.existsSync(f)) fs.unlinkSync(f);
  io.emit('models', modelList()); res.json(modelList());
});
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

function broadcast(ev) { session.lastEvent = Date.now(); io.to('game').emit('ev', ev); try { textHook(ev); } catch (e) { console.error('text', e); } }

// ---------- lời nhắn lên màn hình LCD: bình luận "mh: …" + tặng quà ----------
const TEXT_PREFIX = /^\s*(mh|màn hình|man hinh|manhinh|lcd|chữ|chu|text|tn|lời nhắn|loi nhan)\s*[:：\-–>]\s*/i;
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
const textWant = new Map();   // user.id -> { text, t }
const textPaid = new Map();   // user.id -> { value, gift, t }
let textPending = [];         // chờ chủ phòng duyệt
let textHistory = [];
let textSeq = 0;
function textHook(ev) {
  if (!settings.textEnabled || !ev || !ev.user) return;
  const id = ev.user.id, now = Date.now();
  for (const m of [textWant, textPaid]) for (const [k, v] of m) if (now - v.t > 180000) m.delete(k);
  if (ev.type === 'chat' && typeof ev.text === 'string' && TEXT_PREFIX.test(ev.text)) {
    const t = ev.text.replace(TEXT_PREFIX, '').trim().slice(0, 80);
    if (t) textWant.set(id, { text: t, t: now });
  } else if (ev.type === 'gift') {
    const p = textPaid.get(id) || { value: 0, t: now };
    p.value += Number(ev.value) || 0; p.gift = ev.gift; p.t = now; textPaid.set(id, p);
  } else return;
  const w = textWant.get(id), p = textPaid.get(id);
  if (!w || !p || p.value < (Number(settings.textCoins) || 30)) return;
  textWant.delete(id); textPaid.delete(id);
  const c = cleanBad(w.text);
  const item = { id: ++textSeq, user: { id, name: ev.user.name, avatar: ev.user.avatar }, text: c.text, flagged: c.hit, gift: p.gift ? p.gift.name : '', value: p.value, at: now };
  if (settings.textApprove) { textPending.push(item); textPending = textPending.slice(-50); io.to('screenctl').emit('textQueue', textPending); }
  else showText(item);
}
function showText(item) {
  io.to('game').emit('screenText', item);
  textHistory.unshift(item); textHistory = textHistory.slice(0, 30);
  io.to('screenctl').emit('textHistory', textHistory);
}


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
  fanTouch(user, value * 3, { coins: value });
  const total = addCoins(user, value);
  stats.gifts += count; stats.coins += value;
  broadcast({ type: 'gift', user, gift, count, value, total });
  io.emit('top', topList());
}

function attach(c) {
  c.on(WebcastEvent.CHAT, d => {
    const user = pickUser(d);
    stats.comments++;
    const now = Date.now();
    const give = now - (chatXpAt.get(user.id) || 0) > 20000; if (give) chatXpAt.set(user.id, now);
    fanTouch(user, give ? 2 : 0);
    broadcast({ type: 'chat', user, text: cleanText(d.comment, 80) });
  });
  c.on(WebcastEvent.GIFT, d => { try { handleGift(d); } catch (e) { console.error('gift', e); } });
  c.on(WebcastEvent.LIKE, d => {
    const n = Number(d.likeCount || 1);
    stats.likes += n;
    broadcast({ type: 'like', user: fanTouch(pickUser(d), Math.min(5, n * 0.05)), count: n });
  });
  c.on(WebcastEvent.MEMBER, d => broadcast({ type: 'member', user: pickUser(d) }));
  c.on(WebcastEvent.FOLLOW, d => broadcast({ type: 'follow', user: fanTouch(pickUser(d), 20) }));
  c.on(WebcastEvent.SHARE, d => broadcast({ type: 'share', user: fanTouch(pickUser(d), 10) }));
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
    if (Date.now() - (session.lastEvent || session.start) > 30 * 60000) { session = { id: Date.now(), start: Date.now() }; seenThisSession.clear(); }
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

// ---------- màn hình LCD sau lưng DJ ----------
const SCREEN_MEDIA = path.join(DATA, 'screen');
fs.mkdirSync(SCREEN_MEDIA, { recursive: true });
const SCREEN_DEFAULT = {
  mode: 'eq',            // eq: sóng nhạc | youtube | video (file trên máy) | image
  items: [],             // [{ type: 'video'|'list', id, title }]
  idx: 0, playing: true, volume: 70, muted: false, loop: true, shuffle: false,
  fit: 'fill',           // fill: lấp đầy (cắt trên/dưới) | contain: vừa khung
  duck: true,            // giảm nhạc game khi phát video có tiếng
  giftOverlay: true,     // người tặng quà lớn được chiếu chen ngang
  giftPause: true,       // tạm dừng video trong lúc chiếu người tặng quà
  showSign: false,       // hiện biển VŨ TRƯỜNG NEON đè lên màn
  file: '', image: '', brightness: 1, seq: 0,
  bpm: 0,                // nhịp cho đèn khi phát YouTube (0 = theo nhạc game)
};
let screenState = Object.assign({}, SCREEN_DEFAULT, readJSON('screen.json', {}));
let screenStatus = {};
const saveScreen = () => { screenState.seq = (screenState.seq || 0) + 1; writeJSON('screen.json', screenState); io.emit('screen', screenState); };
const MEDIA_RE = /\.(mp4|webm|mov|m4v|ogv|jpg|jpeg|png|gif|webp)$/i;
function screenMedia() {
  return fs.readdirSync(SCREEN_MEDIA).filter(f => MEDIA_RE.test(f)).sort().map(f => ({ file: f, url: '/screen-media/' + encodeURIComponent(f), kind: /\.(jpg|jpeg|png|gif|webp)$/i.test(f) ? 'image' : 'video', size: fs.statSync(path.join(SCREEN_MEDIA, f)).size }));
}
// nhận link YouTube (video, playlist, shorts, youtu.be, live) hoặc mã video
function parseYouTube(text) {
  const out = [];
  for (let line of String(text || '').split(/[\s,]+/)) {
    line = line.trim(); if (!line) continue;
    let id = null, list = null;
    try {
      const u = new URL(/^https?:/i.test(line) ? line : 'https://' + line);
      if (/youtu\.be$/i.test(u.hostname)) id = u.pathname.slice(1).split('/')[0];
      else if (/youtube(-nocookie)?\.com$/i.test(u.hostname.replace(/^(www|m|music)\./, ''))) {
        id = u.searchParams.get('v');
        const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{6,})/); if (m) id = m[2];
        list = u.searchParams.get('list');
      }
    } catch {}
    if (!id && !list && /^[\w-]{11}$/.test(line)) id = line;
    if (list && !id) out.push({ type: 'list', id: list, title: 'Danh sách phát' });
    else if (id && /^[\w-]{6,20}$/.test(id)) out.push({ type: 'video', id, list: list || undefined, title: '' });
  }
  return out;
}
app.use('/screen-media', express.static(SCREEN_MEDIA));
app.get('/api/screen', (req, res) => res.json({ state: screenState, media: screenMedia(), status: screenStatus }));
const screenUpload = multer({
  storage: multer.diskStorage({
    destination: SCREEN_MEDIA,
    filename: (req, file, cb) => cb(null, Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/[\\/:*?"<>|#%]/g, '_')),
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, MEDIA_RE.test(file.originalname)),
});
app.post('/api/screen-media', screenUpload.array('files', 20), (req, res) => { io.emit('screenMedia', screenMedia()); res.json(screenMedia()); });
app.delete('/api/screen-media/:file', (req, res) => {
  const f = path.join(SCREEN_MEDIA, path.basename(req.params.file));
  if (fs.existsSync(f)) fs.unlinkSync(f);
  io.emit('screenMedia', screenMedia()); res.json(screenMedia());
});

// ảnh đại diện / ảnh quà TikTok tải qua máy chủ: ảnh khác nguồn làm "bẩn" canvas → không vẽ được lên màn LED 3D và clip
const IMG_HOSTS = /(^|\.)(tiktokcdn\.com|tiktokcdn-us\.com|tiktokcdn-eu\.com|tiktokv\.com|tiktokv\.us|ibyteimg\.com|byteimg\.com|muscdn\.com|tiktok\.com|ytimg\.com|ggpht\.com|googleusercontent\.com)$/i;
const imgCache = new Map();   // url -> { buf, type, t }
app.get('/api/img', async (req, res) => {
  let u; try { u = new URL(String(req.query.u || '')); } catch { return res.status(400).end(); }
  if (!/^https?:$/.test(u.protocol) || !IMG_HOSTS.test(u.hostname)) return res.status(403).end();
  const key = u.href; let hit = imgCache.get(key);
  if (!hit) {
    try {
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 8000);
      const r = await fetch(key, { signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } }); clearTimeout(to);
      const type = r.headers.get('content-type') || '';
      if (!r.ok || !/^image\//.test(type)) return res.status(502).end();
      const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > 3e6) return res.status(413).end();
      hit = { buf, type, t: Date.now() }; imgCache.set(key, hit);
      if (imgCache.size > 800) imgCache.delete(imgCache.keys().next().value);
    } catch { return res.status(502).end(); }
  }
  res.set('Content-Type', hit.type).set('Cache-Control', 'max-age=3600').send(hit.buf);
});

// ảnh bìa YouTube (tải qua máy chủ để vẽ được vào clip khoảnh khắc)
const THUMBS = path.join(SCREEN_MEDIA, '.thumbs');
fs.mkdirSync(THUMBS, { recursive: true });
app.get('/api/yt-thumb/:id', async (req, res) => {
  const id = String(req.params.id || '');
  if (!/^[\w-]{6,20}$/.test(id)) return res.status(400).end();
  const f = path.join(THUMBS, id + '.jpg');
  if (!fs.existsSync(f)) {
    for (const q of ['maxresdefault', 'hqdefault', 'mqdefault']) {
      try {
        const r = await fetch(`https://i.ytimg.com/vi/${id}/${q}.jpg`);
        if (r.ok) { fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); break; }
      } catch {}
    }
  }
  if (!fs.existsSync(f)) return res.status(404).end();
  res.set('Cache-Control', 'max-age=86400').sendFile(f, { dotfiles: 'allow' });
});

// mở màn hình game bằng Chrome/Edge với quyền tự phát tiếng (không cần bấm vào trang)
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
app.post('/api/open-game', (req, res) => {
  const ip = req.socket.remoteAddress || '';
  if (!/^(::1|127\.|::ffff:127\.)/.test(ip)) return res.status(403).json({ ok: false, error: 'Chỉ mở được từ chính máy chạy game.' });
  const exe = findBrowser();
  if (!exe) return res.json({ ok: false, error: 'Không tìm thấy Chrome hoặc Edge trên máy.' });
  const profile = path.join(DATA, 'browser-game');
  const url = `http://localhost:${PORT}/game.html` + (req.body && req.body.obs ? '?obs=1' : '');
  try {
    const child = require('child_process').spawn(exe, ['--autoplay-policy=no-user-gesture-required', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=560,1000', `--app=${url}`], { detached: true, stdio: 'ignore' });
    child.on('error', () => {}); child.unref();
    res.json({ ok: true, browser: path.basename(exe) });
  } catch (e) { res.json({ ok: false, error: String(e.message || e) }); }
});

// ---------- socket ----------
let primaryId = null;
let goalState = null;   // tiến độ mục tiêu phòng (giữ khi tải lại màn hình game)
function pickPrimary() {
  if (primaryId && screens.has(primaryId)) { screenStatus.screens = screens.size; io.to('screenctl').emit('screenStatus', screenStatus); return; }
  let best = null;
  for (const [id, s] of screens) { if (!best || (s.obs && !screens.get(best).obs)) best = id; }
  primaryId = best;
  for (const id of screens.keys()) io.to(id).emit('primary', id === primaryId);
  screenStatus.screens = screens.size; io.to('screenctl').emit('screenStatus', screenStatus);
}
const screens = new Map(); // socket.id -> status
let testN = 0;
const TEST_NAMES = ['Mây Hồng', 'Tuấn Béo', 'Linh Xinh', 'Bảo Ngọc', 'Hải Đăng', 'Minh Thư', 'Gấu Trúc', 'Cún Con', 'Thỏ Bông', 'Khoai Tây', 'Bé Na', 'Anh Ba', 'Trà Sữa', 'Mèo Mập', 'Su Su'];
function testUser(i) {
  const n = i ?? (++testN);
  return { id: 'test' + n, name: (TEST_NAMES[n % TEST_NAMES.length]) + ' ' + n, avatar: '' };
}

io.on('connection', socket => {
  socket.on('hello', (role, info) => {
    if (role === 'game') { socket.join('game'); screens.set(socket.id, { obs: !!(info && info.obs) }); pickPrimary(); socket.emit('goalState', goalState); }
    else if (role === 'screen') { socket.join('screenctl'); socket.emit('screenMedia', screenMedia()); socket.emit('screenStatus', screenStatus); socket.emit('textQueue', textPending); socket.emit('textHistory', textHistory); }
    else { socket.join('admin'); socket.emit('clips', clipList()); }
    socket.emit('screen', screenState);
    socket.emit('settings', settings);
    socket.emit('roster', roster);
    socket.emit('gifts', gifts);
    socket.emit('music', musicList());
    socket.emit('top', topList());
    socket.emit('connState', connState);
  });
  socket.on('status', s => { if (screens.has(socket.id)) screens.set(socket.id, Object.assign(screens.get(socket.id) || {}, s || {})); });
  socket.on('disconnect', () => { if (screens.delete(socket.id)) pickPrimary(); });
  socket.on('goalState', gs => { if (gs && typeof gs === 'object' && socket.id === primaryId) goalState = { likes: +gs.likes || 0, coins: +gs.coins || 0, idx: +gs.idx || 0, theme: String(gs.theme || 'club') }; });
  socket.on('screen:set', patch => {
    if (!patch || typeof patch !== 'object') return;
    for (const k of Object.keys(SCREEN_DEFAULT)) if (k in patch && k !== 'seq') screenState[k] = patch[k];
    if (typeof patch.addText === 'string') {
      const found = parseYouTube(patch.addText);
      if (found.length) { if (patch.replace) { screenState.items = found; screenState.idx = 0; } else screenState.items = screenState.items.concat(found); screenState.mode = 'youtube'; screenState.playing = true; if (patch.replace || screenState.items.length === found.length) screenState.idx = 0; }
      socket.emit('screen:added', found.length);
    }
    if (!Array.isArray(screenState.items)) screenState.items = [];
    screenState.items = screenState.items.slice(0, 500);
    screenState.idx = Math.max(0, Math.min(screenState.items.length - 1, Number(screenState.idx) || 0));
    screenState.volume = Math.max(0, Math.min(100, Number(screenState.volume) || 0));
    saveScreen();
  });
  socket.on('screen:cmd', c => {
    if (!c || typeof c.type !== 'string') return;
    const n = screenState.items.length;
    if ((c.type === 'next' || c.type === 'ended') && n) {
      if (c.type === 'ended' && socket.id !== primaryId) return;   // chỉ màn chính báo hết bài
      if (c.type === 'ended' && !screenState.loop && screenState.idx >= n - 1 && !screenState.shuffle) { screenState.playing = false; return saveScreen(); }
      screenState.idx = screenState.shuffle && n > 1 ? (screenState.idx + 1 + Math.floor(Math.random() * (n - 1))) % n : (screenState.idx + 1) % n;
      screenState.playing = true; return saveScreen();
    }
    if (c.type === 'prev' && n) { screenState.idx = (screenState.idx - 1 + n) % n; screenState.playing = true; return saveScreen(); }
    if (c.type === 'play' && n) { screenState.idx = Math.max(0, Math.min(n - 1, Number(c.idx) || 0)); screenState.playing = true; screenState.mode = 'youtube'; return saveScreen(); }
    io.to('game').emit('screen:cmd', c);   // seek, restart…
  });
  socket.on('text:approve', id => { const i = textPending.findIndex(x => x.id === id); if (i < 0) return; const [it] = textPending.splice(i, 1); showText(it); io.to('screenctl').emit('textQueue', textPending); });
  socket.on('text:reject', id => { textPending = textPending.filter(x => x.id !== id); io.to('screenctl').emit('textQueue', textPending); });
  socket.on('text:replay', id => { const it = textHistory.find(x => x.id === id); if (it) io.to('game').emit('screenText', it); });
  socket.on('text:clear', () => io.to('game').emit('screenText:clear'));
  socket.on('text:host', t => {   // chủ phòng tự gõ chữ lên màn
    if (typeof t !== 'string' || !t.trim()) return;
    showText({ id: ++textSeq, user: { id: 'host', name: settings.djName || 'Chủ phòng', avatar: '' }, text: t.trim().slice(0, 120), gift: '', value: 0, host: true, at: Date.now() });
  });
  socket.on('screen:status', st => {
    if (socket.id !== primaryId || !st || typeof st !== 'object') return;
    screenStatus = st; st.screens = screens.size;
    // lưu tên bài lấy được từ YouTube
    const it = screenState.items[screenState.idx];
    if (it && st.title && st.videoId && (it.id === st.videoId) && it.title !== st.title) { it.title = String(st.title).slice(0, 150); writeJSON('screen.json', screenState); }
    io.to('screenctl').emit('screenStatus', st);
  });
  socket.on('say', text => { if (typeof text === 'string') io.to('admin').emit('say', text.slice(0, 200)); });

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
      for (let i = 0; i < n; i++) setTimeout(() => broadcast({ type: 'chat', user: fanTouch(testUser(), 2), text: 'hi' }), i * 120);
    } else if (t.kind === 'chat') {
      const n = Math.max(1, Number(t.repeat) || 1); for (let i = 0; i < n; i++) setTimeout(() => broadcast({ type: 'chat', user: fanTouch(testUser(Math.max(1, Math.floor(Math.random() * Math.max(1, testN)))), 2), text: String(typeof t.text === 'function' ? '' : (Array.isArray(t.text) ? t.text[i % t.text.length] : t.text) || '').slice(0, 80) }), i * 80);
    } else if (t.kind === 'like') {
      const n = Number(t.n) || 30; for (let i = 0; i < 10; i++) setTimeout(() => broadcast({ type: 'like', user: fanTouch(testUser(Math.max(1, Math.floor(Math.random() * Math.max(1, testN)))), 0.5), count: Math.ceil(n / 10) }), i * 100);
    } else if (t.kind === 'textmsg') {
      const user = fanTouch(testUser(Math.max(1, Math.floor(Math.random() * Math.max(1, testN))) || 1), 2);
      broadcast({ type: 'chat', user, text: String(t.text || 'mh: Xin chào!').slice(0, 90) });
      const g = { name: 'Hoa hồng thử', diamonds: Math.max(1, Number(settings.textCoins) || 30), img: '' };
      setTimeout(() => { const total = addCoins(user, g.diamonds); broadcast({ type: 'gift', user, gift: g, count: 1, value: g.diamonds, total }); io.emit('top', topList()); }, 600);
    } else if (t.kind === 'biggift') {
      const user = testUser(Math.max(1, Math.floor(Math.random() * Math.max(1, testN))) || 1);
      const g = { name: 'Quà lớn thử', diamonds: Number(t.value) || 500, img: '' };
      const total = addCoins(user, g.diamonds);
      broadcast({ type: 'gift', user, gift: g, count: 1, value: g.diamonds, total, forceAction: 'camera' });
      io.emit('top', topList());
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
    ...stats, ...s, screens: screens.size, fans: Object.keys(fans).length,
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
