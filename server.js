'use strict';
// NATION RUSH — game TikTok LIVE: các quốc gia đua tên lửa lên vũ trụ.
// Người xem gõ tên nước để vào đội; like / bình luận / follow / share / quà = nhiên liệu.
const path = require('path'), fs = require('fs'), http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT) || 3330;
// Mở cho cả mạng LAN để TikTok LIVE Studio / điện thoại vào được màn hình game bằng địa chỉ IP của máy.
// Trang điều khiển và mọi lệnh điều khiển chỉ nhận từ chính máy này (xem isLocal).
const HOST = process.env.HOST || '0.0.0.0';
const isLocal = a => { a = String(a || ''); return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1'; };
function lanUrls() {
  const out = [];
  for (const list of Object.values(require('os').networkInterfaces())) for (const n of list || []) if (n.family === 'IPv4' && !n.internal) out.push(`http://${n.address}:${PORT}/live.html?obs=1`);
  return out.sort((a, b) => /\/\/192\.168\./.test(b) - /\/\/192\.168\./.test(a)); // Wi-Fi nhà (192.168.x.x) lên trước; 10.x thường là VPN
}
const DATA = path.join(__dirname, 'data');
fs.mkdirSync(DATA, { recursive: true });
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return d; } };
const writeJSON = (f, o) => { try { fs.writeFileSync(path.join(DATA, f), JSON.stringify(o, null, 1)); } catch (e) { console.error('Không ghi được', f, e.message); } };

// ---------------------------------------------------------------- cài đặt
const DEF = {
  username: '', apiKey: '',
  roundSec: 180, breakSec: 25, finalRushSec: 30, events: true,
  pts: { join: 50, chat: 10, like: 2, follow: 100, share: 100, coin: 100, quiz: 300 },
  giftGoal: 200, theme: 'ocean', themeEvery: 10, view: 'sea', mcLang: 'mix', welcome: true, weather: true, dayNight: true, // mcLang: mix = tiếng Anh là chính, chen tiếng bản xứ ở khoảnh khắc lớn · native = câu về nước nào đọc hẳn bằng tiếng nước đó · en = chỉ tiếng Anh
  tts: true, voice: 'en-US-GuyNeural', vol: { sfx: 70, voice: 100, music: 30 },
  // kiến trúc theo thời đại: điểm tích luỹ trong ngày của mỗi nước để lên 8 thời đại (đồ đá → hiện đại)
  eras: true, eraPts: [0, 2000, 8000, 25000, 60000, 150000, 350000, 800000],
  title: 'NATION RUSH', subtitle: '',
  camZoom: 2, // camera bay tới một nước: vào gần gấp mấy lần bản cũ (1 = như cũ, tối đa 3)
};
const saved = readJSON('settings.json', {});
const settings = { ...DEF, ...saved, pts: { ...DEF.pts, ...(saved.pts || {}) }, vol: { ...DEF.vol, ...(saved.vol || {}) } };
if (!saved.themeV2) { // kiểu cũ: theme 'auto' = tự đổi; kiểu mới: chọn 1 giao diện + "tự đổi mỗi N phút" (0 = tắt)
  if (settings.theme === 'auto') settings.theme = 'ocean'; else settings.themeEvery = 0;
  settings.themeV2 = true;
}
if (!Array.isArray(settings.eraPts) || settings.eraPts.length !== 8) settings.eraPts = DEF.eraPts.slice();
const P = { roundNo: 0, crowns: {}, day: '', today: {}, streak: { cc: '', n: 0 }, civ: {}, ...readJSON('state.json', {}) };
if (!P.civ) P.civ = {};
const today = () => new Date().toLocaleDateString('en-CA');
function rollDay() { if (P.day !== today()) { P.day = today(); P.today = {}; P.civ = {}; } } // ngày mới: các nước quay về thời đồ đá
rollDay();

// ---------------------------------------------------------------- quốc gia
const flagRoot = path.join(__dirname, 'node_modules', 'flag-icons');
const rawCountries = require(path.join(flagRoot, 'country.json')).filter(c => c.iso && /^[a-z]{2}$/.test(c.code));
const dn = new Intl.DisplayNames(['en'], { type: 'region' });
const SHORT = {
  us: 'USA', gb: 'UK', ae: 'UAE', hk: 'Hong Kong', mo: 'Macau', mm: 'Myanmar', ps: 'Palestine', tr: 'Turkey',
  cd: 'DR Congo', cg: 'Congo', ba: 'Bosnia', kr: 'South Korea', kp: 'North Korea', cz: 'Czechia', vn: 'Vietnam',
  ru: 'Russia', la: 'Laos', ir: 'Iran', sy: 'Syria', tz: 'Tanzania', bo: 'Bolivia', ve: 'Venezuela', md: 'Moldova',
  tw: 'Taiwan', ci: 'Ivory Coast', do: 'Dominican Rep.', tt: 'Trinidad', sa: 'Saudi Arabia', nz: 'New Zealand',
};
// "=..." : chỉ khớp khi cả bình luận đúng bằng từ đó (từ ngắn, dễ nhầm). Còn lại: khớp theo từ trong câu.
const ALIAS = {
  vn: 'viet nam|vietnam|vietnamese|=vn', us: 'usa|america|american|united states|hoa ky|=us', gb: 'uk|england|britain|british|great britain|united kingdom|scotland|wales',
  jp: 'japan|japanese|nippon|nihon|nhat ban|日本|=jp|=nhat', kr: 'korea|korean|south korea|han quoc|한국|대한민국|=kr', kp: 'north korea|trieu tien',
  cn: 'china|chinese|trung quoc|中国|中國|=cn', tw: 'taiwan|dai loan|台灣|台湾|=tw', hk: 'hong kong|hongkong|香港|=hk',
  th: 'thailand|thai lan|ไทย|ประเทศไทย|=thai|=th', id: 'indonesia|indonesian|=indo', my: 'malaysia|malaysian|=malay', ph: 'philippines|philippine|pilipinas|filipino|pinoy|=ph',
  mm: 'myanmar|burma|မြန်မာ|=mm', kh: 'cambodia|campuchia|khmer|កម្ពុជា|=kh', la: 'laos|=lao', sg: 'singapore|=sg', in: 'india|indian|bharat|hindustan|=an do',
  pk: 'pakistan|=pk', bd: 'bangladesh|=bd', np: 'nepal|=np', lk: 'sri lanka|srilanka|=lk', au: 'australia|aussie|=au|=uc', nz: 'new zealand|=nz',
  de: 'germany|german|deutschland|=de|=duc', fr: 'france|french|=fr|=phap', es: 'spain|espana|spanish|=es', it: 'italy|italia|italian', pt: 'portugal',
  br: 'brazil|brasil|=br', mx: 'mexico|=mx', ar: 'argentina', co: 'colombia', cl: 'chile', pe: 'peru', ca: 'canada|canadian|=ca',
  ru: 'russia|russian|россия|=ru|=nga', ua: 'ukraine|україна|=ua', tr: 'turkey|turkiye|=tr', sa: 'saudi arabia|saudi|=ksa', ae: 'uae|emirates|dubai',
  eg: 'egypt|=eg', ma: 'morocco|maroc', dz: 'algeria', ng: 'nigeria|naija|=ng', za: 'south africa|=za', ke: 'kenya', et: 'ethiopia', gh: 'ghana',
  ir: 'iran', iq: 'iraq', il: 'israel', ps: 'palestine', nl: 'netherlands|holland|=nl', be: 'belgium', se: 'sweden|=se', no: 'norway', dk: 'denmark',
  fi: 'finland', pl: 'poland|polska|=pl', cz: 'czech|czech republic', gr: 'greece', ro: 'romania', hu: 'hungary', ch: 'switzerland|swiss', at: 'austria',
  ie: 'ireland', kz: 'kazakhstan', uz: 'uzbekistan', mn: 'mongolia',
};
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/\p{M}+/gu, '').replace(/đ/g, 'd').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const BY = {}, WORD = new Map(), EXACT = new Map(), NONLATIN = [];
for (const c of rawCountries) {
  let name = SHORT[c.code]; if (!name) { try { name = dn.of(c.code.toUpperCase()); } catch { name = c.name; } }
  BY[c.code] = { cc: c.code, name, cont: c.continent || 'Other' };
  for (const a of [name, c.name, dn.of(c.code.toUpperCase())]) { const k = norm(a); if (k.length > 2 && !WORD.has(k)) WORD.set(k, c.code); }
}
for (const [cc, list] of Object.entries(ALIAS)) for (let a of list.split('|')) {
  const exact = a[0] === '='; if (exact) a = a.slice(1);
  const k = norm(a); if (!k || !BY[cc]) continue;
  if (exact) EXACT.set(k, cc);
  else if (/^[a-z0-9 ]+$/.test(k)) WORD.set(k, cc);
  else NONLATIN.push([k, cc]);
}
function detect(text) {
  text = String(text || '');
  const m = /([\u{1F1E6}-\u{1F1FF}])([\u{1F1E6}-\u{1F1FF}])/u.exec(text); // cờ emoji
  if (m) { const cc = String.fromCharCode(m[1].codePointAt(0) - 0x1F1E6 + 97, m[2].codePointAt(0) - 0x1F1E6 + 97); if (BY[cc]) return cc; }
  const t = norm(text); if (!t) return null;
  if (EXACT.has(t)) return EXACT.get(t);
  const w = t.split(' ').slice(0, 12);
  for (let n = Math.min(4, w.length); n >= 1; n--) for (let i = 0; i + n <= w.length; i++) { const cc = WORD.get(w.slice(i, i + n).join(' ')); if (cc) return cc; }
  for (const [a, cc] of NONLATIN) if (t.includes(a)) return cc;
  return null;
}

// ---------------------------------------------------------------- web
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use('/flags', express.static(path.join(flagRoot, 'flags'), { maxAge: '7d' }));
app.use((req, res, next) => { // trang điều khiển: chỉ mở được trên chính máy chạy game
  if (/^\/admin/i.test(req.path) && !isLocal(req.socket.remoteAddress)) return res.status(403).send('Trang dieu khien chi mo duoc tren may chay game.');
  next();
});
// link màn hình game kiểu Thắp Sáng Quê Hương: /live.html?obs=1 (vẫn mở được bằng / như cũ)
app.get(['/live', '/live.html'], (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/view.js', (req, res) => res.type('js').set('Cache-Control', 'no-store').send(`window.__VIEW=${JSON.stringify(settings.view)};`)); // kiểu màn hình đang chọn
app.use(express.static(path.join(__dirname, 'public')));

app.use('/vendor/three', express.static(path.join(__dirname, 'node_modules', 'three', 'build'), { maxAge: '7d' }));

// ---------------------------------------------------------------- giọng đọc tiếng Anh (Edge neural → dự phòng Google), có lưu đệm
const crypto = require('crypto'), https = require('https');
const TTS_DIR = path.join(DATA, 'tts'); fs.mkdirSync(TTS_DIR, { recursive: true });
const VOICES = ['en-US-GuyNeural', 'en-US-ChristopherNeural', 'en-US-AndrewNeural', 'en-US-AriaNeural', 'en-US-JennyNeural', 'en-GB-RyanNeural'];
let Edge = null; try { Edge = require('msedge-tts'); } catch { console.log('[TTS] Thiếu msedge-tts → dùng giọng Google.'); }
try { const old = fs.readdirSync(TTS_DIR); if (old.length > 800) for (const f of old) fs.unlinkSync(path.join(TTS_DIR, f)); } catch {}
function edgeTts(text, voice) {
  return new Promise((resolve, reject) => {
    const tts = new Edge.MsEdgeTTS(), chunks = [];
    const done = (err, buf) => { clearTimeout(to); try { tts.close(); } catch {} err ? reject(err) : resolve(buf); };
    const to = setTimeout(() => done(new Error('Edge TTS quá thời gian')), 9000);
    tts.setMetadata(voice, Edge.OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3).then(() => {
      const r = tts.toStream(text, { rate: '+8%' }), s = r.audioStream || r;
      s.on('data', d => chunks.push(d));
      s.on('error', e => done(e));
      s.on('end', () => { const b = Buffer.concat(chunks); b.length > 500 ? done(null, b) : done(new Error('Edge TTS trả về rỗng')); });
    }).catch(done);
  });
}
const LANG = require('./languages'); // MC đa ngôn ngữ
const GOOGLE_TL = { fil: 'tl', nb: 'no', he: 'iw', 'es-MX': 'es', 'pt-PT': 'pt', 'ar-EG': 'ar', zh: 'zh-CN' };
app.get('/lang.json', (req, res) => res.json({ tpl: LANG.TPL, byCc: LANG.BY_CC, name: LANG.NAME }));
function googleTts(text, lang) {
  return new Promise((resolve, reject) => {
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' + encodeURIComponent(GOOGLE_TL[lang] || lang || 'en') + '&q=' + encodeURIComponent(text.slice(0, 190));
    const rq = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, r => {
      if (r.statusCode !== 200) { r.resume(); return reject(new Error('Google TTS ' + r.statusCode)); }
      const ch = []; r.on('data', d => ch.push(d)); r.on('end', () => resolve(Buffer.concat(ch)));
    });
    rq.on('timeout', () => rq.destroy(new Error('Google TTS quá thời gian'))); rq.on('error', reject);
  });
}
const ttsBusy = new Map();
app.get('/tts', async (req, res) => {
  const text = String(req.query.t || '').replace(/[<>&"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220);
  const lang = LANG.VOICE[req.query.l] ? String(req.query.l) : ''; // ?l=ja → đọc bằng giọng tiếng Nhật
  const voice = lang ? LANG.VOICE[lang] : VOICES.includes(req.query.v) ? req.query.v : VOICES[0];
  if (!text) return res.status(400).end();
  const file = path.join(TTS_DIR, crypto.createHash('sha1').update(voice + '|' + text).digest('hex') + '.mp3');
  try {
    if (!fs.existsSync(file)) {
      if (!ttsBusy.has(file)) ttsBusy.set(file, (async () => {
        let buf; try { if (!Edge) throw new Error('no edge'); buf = await edgeTts(text, voice); } catch (e) { buf = await googleTts(text, lang); }
        fs.writeFileSync(file, buf);
      })().finally(() => ttsBusy.delete(file)));
      await ttsBusy.get(file);
    }
    res.set('Cache-Control', 'public, max-age=86400').type('audio/mpeg').sendFile(file);
  } catch (e) { console.error('[TTS] lỗi:', e.message); res.status(502).end(); }
});
// nhạc nền riêng: public\music (tải lên / xoá được ngay trong trang điều khiển)
const MUSIC_DIR = path.join(__dirname, 'public', 'music');
app.get('/api/music', (req, res) => res.json(musicList()));
const musicChanged = () => { io.emit('music', musicList()); pushAdmin(); };
app.post('/api/music', express.raw({ type: () => true, limit: '60mb' }), (req, res) => {
  if (!isLocal(req.socket.remoteAddress)) return res.status(403).end();
  const name = path.basename(String(req.query.name || '')).replace(/[^\p{L}\p{N} ._()-]/gu, '_').slice(0, 120);
  if (!/\.(mp3|ogg|m4a|wav|aac)$/i.test(name) || !req.body || !req.body.length) return res.status(400).json({ ok: false, error: 'Chỉ nhận file mp3, m4a, ogg, wav, aac' });
  fs.mkdirSync(MUSIC_DIR, { recursive: true }); fs.writeFileSync(path.join(MUSIC_DIR, name), req.body);
  musicChanged(); res.json({ ok: true });
});
app.delete('/api/music/:name', (req, res) => {
  if (!isLocal(req.socket.remoteAddress)) return res.status(403).end();
  const name = path.basename(req.params.name);
  if (/\.(mp3|ogg|m4a|wav|aac)$/i.test(name)) try { fs.unlinkSync(path.join(MUSIC_DIR, name)); } catch {}
  musicChanged(); res.json({ ok: true });
});
// mở màn hình LIVE trong một cửa sổ riêng (Edge / Chrome chế độ ứng dụng) để LIVE Studio dùng "Chụp cửa sổ"
app.post('/api/open-live', (req, res) => {
  if (!isLocal(req.socket.remoteAddress)) return res.status(403).end();
  const bases = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean);
  const exe = bases.flatMap(b => [path.join(b, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), path.join(b, 'Google', 'Chrome', 'Application', 'chrome.exe')]).find(f => fs.existsSync(f));
  if (!exe) return res.json({ ok: false, error: 'Không tìm thấy Microsoft Edge hoặc Google Chrome' });
  try {
    require('child_process').spawn(exe, [`--app=http://127.0.0.1:${PORT}/live.html?obs=1`, '--window-size=560,1000', `--user-data-dir=${path.join(DATA, 'browser-live')}`,
      '--autoplay-policy=no-user-gesture-required', '--no-first-run', '--no-default-browser-check'], { detached: true, stdio: 'ignore' }).unref();
    res.json({ ok: true, browser: /msedge/i.test(exe) ? 'Microsoft Edge' : 'Google Chrome' });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ---------------------------------------------------------------- bản đồ thế giới (Natural Earth 1:50m, đã làm gọn)
let MAPJSON = null;
const CENT = {};
function buildMap() {
  const topo = require('world-atlas/countries-50m.json');
  const { feature } = require('topojson-client');
  const iso = require('i18n-iso-countries');
  const area = r => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return a / 2; };
  const slim = (ring, k) => { // làm tròn toạ độ + bỏ điểm trùng → nhẹ hơn nhiều, vẫn đủ nét khi phóng to
    const out = []; let px, py;
    for (const [x, y] of ring) { const a = Math.round(x * k) / k, b = Math.round(y * k) / k; if (a !== px || b !== py) out.push([a, b]); px = a; py = b; }
    return out;
  };
  const list = [];
  for (const f of feature(topo, topo.objects.countries).features) {
    let cc = f.id ? String(iso.numericToAlpha2(String(f.id).padStart(3, '0')) || '').toLowerCase() : '';
    if (cc === 'aq') continue; // bỏ Nam Cực
    if (!BY[cc]) cc = '';
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    let big = polys[0]; for (const p of polys) if (Math.abs(area(p[0])) > Math.abs(area(big[0]))) big = p;
    const p = [];
    for (const poly of polys) {
      let rings = poly.map(r => slim(r, 10)).filter(r => r.length >= 4 && Math.abs(area(r)) > 0.004);
      if (!rings.length && poly === big) rings = [slim(poly[0], 100)]; // nước tí hon (Singapore, Maldives…): giữ nét gốc
      if (rings.length) p.push(rings);
    }
    const o = big[0]; let x0 = 999, y0 = 999, x1 = -999, y1 = -999, cx = 0, cy = 0;
    for (const [x, y] of o) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); cx += x; cy += y; }
    const r2 = v => Math.round(v * 100) / 100;
    list.push({ cc, c: [r2(cx / o.length), r2(cy / o.length)], b: [r2(x0), r2(y0), r2(x1), r2(y1)], p });
    if (cc) CENT[cc] = [cy / o.length, cx / o.length]; // tâm lãnh thổ (vĩ độ, kinh độ) — dùng cho thời tiết khi không có toạ độ thủ đô
  }
  return JSON.stringify(list);
}
app.get('/map.json', (req, res) => {
  try { if (!MAPJSON) MAPJSON = buildMap(); res.type('json').set('Cache-Control', 'public, max-age=86400').send(MAPJSON); }
  catch (e) { console.error('Lỗi dựng bản đồ:', e.message); res.status(500).json([]); }
});

// ---------------------------------------------------------------- vòng đua
const MILES = [[500, 'THE SKY'], [2000, 'SPACE'], [10000, 'ORBIT'], [50000, 'THE MOON'], [250000, 'MARS'], [1000000, 'JUPITER'], [5000000, 'THE EDGE OF THE GALAXY']];
const EVENTS = {
  underdog: { label: 'UNDERDOG BOOST ×3', sub: 'Nations ranked 4th and below get TRIPLE power!', sec: 20 },
  likestorm: { label: 'LIKE STORM ×5', sub: 'Tap the screen! Every like counts 5×', sec: 15 },
  rollcall: { label: 'ROLL CALL ×10', sub: 'Type your country NOW for a 10× join bonus', sec: 20 },
  giftx2: { label: 'DOUBLE GIFTS ×2', sub: 'Every gift is worth double', sec: 20 },
  lucky: { label: 'LUCKY GIFT ×5', sub: 'The NEXT gift is worth FIVE times!', sec: 20 },
  quiz: { label: 'QUIZ TIME', sub: 'Type A, B or C in the chat', sec: 18 },
  treasure: { label: 'TREASURE DROP — TYPE "GO"', sub: 'Type GO in the chat! 3 lucky players win +500', sec: 15 },
};
const likeWave = { cur: 0, target: 1000 };            // sóng like cả phòng → mọi nước đang chơi +300
const WORLD_MARKS = [5, 10, 15, 20, 30, 40, 50, 75, 100]; // số nước tham gia đạt mốc → cả thế giới được thưởng
function bonusAll(pts) { if (R.phase === 'race') for (const c of R.C.values()) if (c.score > 0) c.score += pts; }
function topContrib(c) { let id = '', best = 0; for (const [k, v] of c.contrib) if (v > best) { best = v; id = k; } return [id, best]; }
function startEvent(type, now) {
  R.event = { type, until: now + EVENTS[type].sec * 1000 };
  if (type === 'quiz') { startQuiz(); fx({ t: 'quiz', name: R.quiz.lm.n, opts: R.quiz.opts.map(c => BY[c].name) }); return; }
  if (type === 'treasure') R.tre = new Set();
  fx({ t: 'event', type, label: EVENTS[type].label, sub: EVENTS[type].sub });
}
function endTreasure() { // bốc 3 người đã gõ GO
  const ids = [...R.tre].sort(() => Math.random() - .5); R.tre = null; const winners = [];
  for (const id of ids.slice(0, 3)) { const u = users.get(id); if (u && u.cc) { addPts(u, 500, 'quiz'); winners.push({ user: pub(u), cc: u.cc, name: BY[u.cc].name }); } }
  fx({ t: 'treasureend', winners, total: ids.length });
}
function endChallenge() { // kết thúc thách đấu: nước tăng điểm nhiều hơn thắng, thưởng 20% phần đã tăng (ít nhất 500)
  const ch = R.chal; R.chal = null; if (!ch) return;
  const ga = nation(ch.a).score - ch.a0, gb = nation(ch.b).score - ch.b0, w = ga >= gb ? ch.a : ch.b, l = w === ch.a ? ch.b : ch.a;
  const bonus = Math.max(500, Math.round(Math.max(ga, gb) * .2)); nation(w).score += bonus;
  fx({ t: 'challengeend', w, wn: BY[w].name, l, ln: BY[l].name, bonus });
}
// ---------------------------------------------------------------- danh thắng, giao diện, người quen
const LM = require('./landmarks');
const LM_TH = [1000, 5000, 20000, 60000, 150000, 400000]; // điểm để mở khóa danh thắng thứ 1, 2, 3…
app.get('/landmarks.json', (req, res) => res.json(LM));
const THEMES = ['night', 'matrix', 'neon', 'aurora', 'lacquer', 'radar', 'ocean', 'festival', 'paper', 'lotus'];
let themeNow = THEMES.includes(settings.theme) ? settings.theme : 'night', themeAt = Date.now();
function randomTheme() { themeAt = Date.now(); const rest = THEMES.filter(t => t !== themeNow); themeNow = rest[Math.floor(Math.random() * rest.length)]; }
const fans = readJSON('fans.json', {}); // id -> { n: tên, d: ngày gần nhất, s: chuỗi ngày, p: điểm tích luỹ }
const TITLES = [[500000, 'Legend'], [50000, 'Hero'], [5000, 'Patriot'], [0, 'Rookie']];
const titleOf = id => { const f = fans[id]; return TITLES.find(t => (f ? f.p : 0) >= t[0])[1]; };
function checkIn(u) { // điểm danh: trả về số ngày liên tiếp nếu đây là lần đầu trong ngày
  const f = fans[u.id] || (fans[u.id] = { n: u.name, d: '', s: 0, p: 0 }); f.n = u.name;
  const td = today(); if (f.d === td) return 0;
  f.s = f.d === new Date(Date.now() - 864e5).toLocaleDateString('en-CA') ? f.s + 1 : 1; f.d = td;
  return f.s;
}
function saveFans() {
  const ids = Object.keys(fans);
  if (ids.length > 6000) for (const id of ids.sort((a, b) => fans[b].p - fans[a].p).slice(5000)) delete fans[id];
  writeJSON('fans.json', fans);
}
const supporters = new Map(); // người tặng quà trong buổi live: id -> { name, avatar, coins }
const goal = { cur: 0, target: Math.max(20, settings.giftGoal) }; // mục tiêu quà chung cả phòng → GOLDEN HOUR
const seenNations = new Set();
const users = new Map(); // id -> { id, name, avatar, cc, rn (vòng đã tham gia), bank, chatAt }
let R = null;
const rnd = (a, b) => a + Math.random() * (b - a);
const fx = o => io.emit('fx', o);
const pub = u => ({ name: u.name, avatar: u.avatar });

function U(raw) {
  const id = String(raw.id || raw.name || 'anon');
  let u = users.get(id);
  if (!u) { u = { id, name: raw.name || 'Guest', avatar: raw.avatar || '', cc: '', rn: 0, bank: 0, chatAt: 0 }; users.set(id, u); }
  else { if (raw.name) u.name = raw.name; if (raw.avatar) u.avatar = raw.avatar; }
  return u;
}
function nation(cc) {
  let c = R.C.get(cc);
  if (!c) { c = { cc, score: 0, players: new Set(), contrib: new Map(), mi: 0, lm: 0, pw: 0, lastAt: Date.now(), cap: '', fadeSaid: false }; R.C.set(cc, c); }
  return c;
}
// ---------------------------------------------------------------- thời đại (kiến trúc mỗi nước phát triển theo điểm tích luỹ trong ngày)
const ERA_NAMES = ['Stone Age', 'Bronze Age', 'Iron Age', 'Classical Age', 'Medieval Age', 'Renaissance', 'Industrial Age', 'Modern Age'];
function eraOf(p) { let e = 0; settings.eraPts.forEach((th, i) => { if (p >= th) e = i; }); return e; }
let civDirty = false;
function civAdd(cc, pts, u) {
  if (!settings.eras || !(pts > 0)) return;
  const before = eraOf(P.civ[cc] || 0);
  P.civ[cc] = Math.round((P.civ[cc] || 0) + pts); civDirty = true;
  const after = eraOf(P.civ[cc]);
  if (after > before) fx({ t: 'era', cc, name: BY[cc].name, era: after, eraName: ERA_NAMES[after], user: u ? pub(u) : null });
}
function unlock(c, u) { // mở khóa danh thắng kế tiếp của một nước (đủ điểm, hoặc có người tặng quà từ 30 xu)
  const L = LM[c.cc]; if (!L || c.lm >= L.length) return false;
  const lm = L[c.lm++];
  fx({ t: 'landmark', cc: c.cc, name: BY[c.cc].name, lm, n: c.lm, total: L.length, user: u ? pub(u) : null });
  return true;
}
const rankOf = cc => { const i = R.order.findIndex(c => c.cc === cc); return i < 0 ? 99 : i; };
const isFinal = () => R.phase === 'race' && R.endsAt - Date.now() <= settings.finalRushSec * 1000;
const activeEvent = () => (R.event && R.event.until > Date.now() ? R.event.type : '');

function credit(u, pts) {
  pts = Math.round(pts); if (pts <= 0) return 0;
  const c = nation(u.cc);
  c.players.add(u.id); u.rn = R.n;
  c.score += pts; c.lastAt = Date.now(); c.fadeSaid = false;
  civAdd(c.cc, pts, u);
  c.contrib.set(u.id, (c.contrib.get(u.id) || 0) + pts);
  while (c.mi < MILES.length && c.score >= MILES[c.mi][0]) { fx({ t: 'mile', cc: c.cc, name: BY[c.cc].name, label: MILES[c.mi][1], i: c.mi }); c.mi++; }
  while (LM[c.cc] && c.lm < LM[c.cc].length && c.score >= LM_TH[Math.min(c.lm, LM_TH.length - 1)] * (c.lm >= LM_TH.length ? 2 : 1)) unlock(c, null);
  return pts;
}
// cộng điểm có nhân hệ số; chưa chọn nước / đang nghỉ giữa vòng thì giữ trong "bình nhiên liệu" (bank) để cộng sau
function addPts(u, base, kind) {
  if (R.phase !== 'race' || !u.cc) {
    if (kind !== 'chat') u.bank = Math.min(u.bank + base, 5e7);
    return 0;
  }
  let m = isFinal() ? 2 : 1;
  const ev = activeEvent();
  if (ev === 'underdog' && rankOf(u.cc) >= 3) m *= 3;
  if (ev === 'likestorm' && kind === 'like') m *= 5;
  if (ev === 'rollcall' && kind === 'join') m *= 10;
  if (ev === 'giftx2' && kind === 'gift') m *= 2;
  if (ev === 'lucky' && kind === 'gift') { m *= 5; R.event = null; R.luckyHit = true; } // quà đầu tiên trong lúc LUCKY GIFT
  const now = Date.now();
  if (nation(u.cc).pw > now) m *= 2;  // ×2 POWER do người tặng quà lớn kích hoạt cho nước mình
  if (R.golden > now) m *= 2;         // GOLDEN HOUR: cả phòng đạt mục tiêu quà
  return credit(u, base * m);
}
function releaseBank(u) {
  if (!u.bank || !u.cc || R.phase !== 'race') return 0;
  const b = u.bank; u.bank = 0;
  return credit(u, b);
}

function startQuiz() { // đố vui: danh thắng này ở nước nào? (A / B / C)
  const ccs = Object.keys(LM), right = ccs[Math.floor(Math.random() * ccs.length)];
  const lm = LM[right][Math.floor(Math.random() * LM[right].length)];
  const opts = [right]; while (opts.length < 3) { const c = ccs[Math.floor(Math.random() * ccs.length)]; if (!opts.includes(c)) opts.push(c); }
  opts.sort(() => Math.random() - .5);
  R.quiz = { lm, opts, right: opts.indexOf(right), ans: new Map(), first: null };
}
function endQuiz() {
  const q = R.quiz; if (!q) return; R.quiz = null;
  let winners = 0;
  for (const [id, idx] of q.ans) {
    const u = users.get(id); if (idx !== q.right || !u || !u.cc) continue;
    winners++; addPts(u, settings.pts.quiz * (q.first && q.first.id === id ? 2 : 1), 'quiz'); // người đúng đầu tiên ×2
  }
  const cc = q.opts[q.right];
  fx({ t: 'quizend', letter: 'ABC'[q.right], cc, name: BY[cc].name, lm: q.lm, winners, total: q.ans.size, first: q.first ? pub(q.first) : null, firstCc: q.first ? q.first.cc : '' });
}
function onChat(raw, text) {
  const u = U(raw), now = Date.now();
  if (R.quiz && R.phase === 'race') { // đang đố vui: A / B / C (hoặc 1 / 2 / 3), mỗi người trả lời một lần
    const idx = { a: 0, b: 1, c: 2, 1: 0, 2: 1, 3: 2 }[norm(text)];
    if (idx !== undefined) {
      if (u.cc && !R.quiz.ans.has(u.id)) { R.quiz.ans.set(u.id, idx); if (idx === R.quiz.right && !R.quiz.first) R.quiz.first = u; }
      return;
    }
  }
  if (R.tre && R.phase === 'race' && norm(text) === 'go') { if (u.cc) R.tre.add(u.id); return; } // kho báu: gõ GO
  const vs = /^(vs|versus|challenge|pk|fight|thach) (.+)$/.exec(norm(text)); // thách đấu: "vs Japan"
  if (vs && R.phase === 'race') {
    const b = detect(vs[2]);
    if (u.cc && b && b !== u.cc && R.C.has(b) && !R.chal && !isFinal() && now - (u.chalAt || 0) > 300000) {
      u.chalAt = now;
      R.chal = { a: u.cc, b, until: now + 45000, a0: nation(u.cc).score, b0: nation(b).score };
      fx({ t: 'challenge', user: pub(u), a: u.cc, b, an: BY[u.cc].name, bn: BY[b].name });
    }
    return;
  }
  const cc = detect(text);
  if (cc && (!u.cc || u.rn !== R.n)) {
    // vào đội (mỗi vòng gõ lại tên nước để nhận thưởng; đã chơi trong vòng thì không đổi phe được)
    const moved = u.cc && u.cc !== cc;
    u.cc = cc;
    if (!seenNations.has(cc)) { // nước mới lần đầu xuất hiện trong buổi live
      seenNations.add(cc);
      if (seenNations.size > 1) fx({ t: 'newnation', cc, name: BY[cc].name, total: seenNations.size, user: pub(u) });
      if (WORLD_MARKS.includes(seenNations.size)) { bonusAll(500); fx({ t: 'world', total: seenNations.size, bonus: 500 }); } // mốc số nước tham gia
    }
    if (R.phase !== 'race') return fx({ t: 'join', user: pub(u), cc, name: BY[cc].name, pts: 0, ready: true });
    const pts = addPts(u, settings.pts.join, 'join'), fuel = releaseBank(u);
    u.chatAt = now;
    fx({ t: 'join', user: pub(u), cc, name: BY[cc].name, pts, fuel, moved, title: titleOf(u.id), nth: nation(cc).players.size });
    const days = checkIn(u); // điểm danh nhiều ngày liên tiếp → thưởng tăng dần
    if (days >= 2) fx({ t: 'streak', user: pub(u), cc, name: BY[cc].name, days, pts: credit(u, 50 * Math.min(days, 7)) });
    return;
  }
  if (!u.cc) return;
  if (now - u.chatAt < 3000) return; // chống spam
  u.chatAt = now;
  if (R.phase === 'race') { if (u.rn !== R.n) releaseBank(u); addPts(u, settings.pts.chat, 'chat'); }
}
let memberAt = 0;
function onMember(raw) { // có người vào phòng: thẻ chào trên màn hình + MC chào (thưa, không dồn dập)
  if (!settings.welcome || Date.now() - memberAt < 2500) return; memberAt = Date.now();
  const u = U(raw), f = fans[u.id];
  fx({ t: 'member', user: pub(u), cc: u.cc || '', title: f && f.p >= 5000 ? titleOf(u.id) : '', back: !!(f && f.d) });
}
function onLike(raw, n) {
  const u = U(raw); n = Math.max(1, Math.min(200, Number(n) || 1));
  addPts(u, n * settings.pts.like, 'like');
  likeWave.cur += n;
  if (likeWave.cur >= likeWave.target && R.phase === 'race') { likeWave.cur = 0; bonusAll(300); fx({ t: 'likewave', bonus: 300, user: pub(u) }); }
}
function onSocial(raw, kind) {
  const u = U(raw), pts = addPts(u, settings.pts[kind], kind);
  if (pts) fx({ t: kind, user: pub(u), cc: u.cc, name: BY[u.cc].name, pts });
}
function onGift(raw, gift, count) {
  const u = U(raw), coins = Math.max(1, gift.diamonds || 1) * Math.max(1, count);
  const pts = addPts(u, coins * settings.pts.coin, 'gift');
  const base = { user: pub(u), gift: gift.name, img: gift.img, count, coins };
  const sup = supporters.get(u.id) || { name: u.name, avatar: u.avatar, coins: 0 }; sup.coins += coins; sup.name = u.name; supporters.set(u.id, sup);
  if (u.cc) { const sh = R.gifters.get(u.id) || { name: u.name, avatar: u.avatar, cc: u.cc, coins: 0 }; sh.coins += coins; sh.cc = u.cc; R.gifters.set(u.id, sh); } // thuyền lớn dần theo quà
  if (pts) fx({ t: 'gift', ...base, cc: u.cc, name: BY[u.cc].name, pts });
  else if (u.cc) fx({ t: 'gift', ...base, cc: u.cc, name: BY[u.cc].name, pts: 0, banked: coins * settings.pts.coin });
  else fx({ t: 'hint', ...base, banked: u.bank });
  if (R.luckyHit) { R.luckyHit = false; if (pts) fx({ t: 'luckyhit', user: pub(u), cc: u.cc, name: BY[u.cc].name, pts }); }
  if (pts) { // đặc quyền theo cỡ quà
    const c = nation(u.cc), now = Date.now();
    if (coins >= 30) unlock(c, u);
    if (coins >= 99) { c.pw = Math.max(c.pw, now) + 30000; fx({ t: 'power', user: pub(u), cc: u.cc, name: BY[u.cc].name, sec: Math.round((c.pw - now) / 1000) }); }
  }
  // mục tiêu quà chung cả phòng
  goal.cur += coins;
  if (goal.cur >= goal.target && R.phase === 'race') {
    goal.cur = 0; goal.target = Math.round(goal.target * 1.4 / 10) * 10;
    R.golden = Date.now() + 30000; fx({ t: 'golden', user: pub(u), next: goal.target });
  }
}

function mvps(c, n) {
  return [...c.contrib.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([id, pts]) => { const u = users.get(id) || {}; return { name: u.name || '?', avatar: u.avatar || '', pts }; });
}
function newRound() {
  rollDay();
  const prev = R && R.result;
  R = { n: ++P.roundNo, phase: 'race', endsAt: Date.now() + settings.roundSec * 1000, C: new Map(), order: [], leader: '', leadAt: 0,
    gifters: new Map(), event: null, nextEventAt: Date.now() + rnd(30, 45) * 1000, finalSaid: false, result: null, midAt: Date.now() + settings.roundSec * 500 };
  writeJSON('state.json', P);
  if (prev && prev.podium && prev.podium[0]) { // á quân vòng trước được "phục thù": ×2 điểm trong 30 giây đầu
    const cc = prev.podium[0].cc; nation(cc).pw = Date.now() + 30000; fx({ t: 'revenge', cc, name: BY[cc].name });
  }
  // quà / like gửi lúc nghỉ giữa vòng → xuất phát sớm
  for (const u of users.values()) if (u.cc && u.bank > 0) { const pts = releaseBank(u); fx({ t: 'head', user: pub(u), cc: u.cc, name: BY[u.cc].name, pts }); }
  fx({ t: 'start', round: R.n });
}
function endRound() {
  const order = [...R.C.values()].sort((a, b) => b.score - a.score).filter(c => c.score > 0);
  const win = order[0];
  let result = { round: R.n, winner: null };
  if (win) {
    rollDay();
    const prev = P.streak.cc;
    P.crowns[win.cc] = (P.crowns[win.cc] || 0) + 1;
    P.today[win.cc] = (P.today[win.cc] || 0) + 1;
    P.streak = prev === win.cc ? { cc: win.cc, n: P.streak.n + 1 } : { cc: win.cc, n: 1 };
    result = {
      round: R.n, winner: { cc: win.cc, name: BY[win.cc].name, score: win.score, players: win.players.size, era: eraOf(P.civ[win.cc] || 0) },
      podium: order.slice(1, 3).map(c => ({ cc: c.cc, name: BY[c.cc].name, score: c.score })),
      mvps: mvps(win, 3), streak: P.streak.n,
      dethroned: prev && prev !== win.cc ? BY[prev].name : '',
      crowns: Object.entries(P.crowns).sort((a, b) => b[1] - a[1]).slice(0, 6),
      lm: win.lm, lmTotal: (LM[win.cc] || []).length,
      sup: [...supporters.values()].sort((a, b) => b.coins - a.coins)[0] || null,
    };
  }
  // điểm tích luỹ → danh hiệu (Rookie → Patriot → Hero → Legend)
  for (const c of R.C.values()) for (const [id, pts] of c.contrib) { const u = users.get(id); const f = fans[id] || (fans[id] = { n: u ? u.name : '', d: '', s: 0, p: 0 }); f.p += pts; }
  saveFans();
  R.quiz = null; R.golden = 0; R.tre = null; R.chal = null;
  R.phase = 'break'; R.endsAt = Date.now() + settings.breakSec * 1000; R.result = result; R.event = null;
  writeJSON('state.json', P);
  fx({ t: 'end', result });
}
function snapshot() {
  const now = Date.now(), ev = activeEvent();
  let players = 0; const conts = {};
  for (const c of R.C.values()) { players += c.players.size; if (c.score > 0) conts[BY[c.cc].cont] = (conts[BY[c.cc].cont] || 0) + c.score; }
  return {
    all: R.order.slice(0, 80).map(c => [c.cc, c.score]), seen: seenNations.size,
    cfg: { tts: settings.tts, voice: settings.voice, vol: settings.vol, theme: themeNow, view: settings.view, mcLang: settings.mcLang, dayNight: settings.dayNight,
      eras: settings.eras, eraPts: settings.eraPts, title: settings.title, subtitle: settings.subtitle, camZoom: settings.camZoom },
    civ: settings.eras ? Object.fromEntries(R.order.slice(0, 40).map(c => [c.cc, P.civ[c.cc] || 0])) : {}, // điểm thời đại của các nước đang chơi
    ships: [...R.gifters.values()].sort((a, b) => b.coins - a.coins).slice(0, 8), // thuyền của người tặng quà trong vòng
    lms: R.order.filter(c => c.lm).map(c => [c.cc, c.lm]),
    goal, golden: R.golden > now ? (R.golden - now) / 1000 : 0, likeWave,
    nextIn: settings.events && R.phase === 'race' && !ev && !isFinal() && R.endsAt - R.nextEventAt > (settings.finalRushSec + 25) * 1000 ? Math.max(0, (R.nextEventAt - now) / 1000) : -1,
    chal: R.chal ? { a: R.chal.a, b: R.chal.b, an: BY[R.chal.a].name, bn: BY[R.chal.b].name, left: (R.chal.until - now) / 1000, ga: nation(R.chal.a).score - R.chal.a0, gb: nation(R.chal.b).score - R.chal.b0 } : null,
    wx: Object.fromEntries(R.order.slice(0, 40).map(c => { const w = wx.get(c.cc) || wxGuess(c.cc); return [c.cc, [w.t, w.code, w.off, w.real ? 1 : 0]]; })), // [°C, mã thời tiết, lệch giờ (giây), số thật?]
    fading: R.order.slice(0, 8).filter(c => now - c.lastAt > 40000).map(c => c.cc),
    quiz: R.quiz && ev === 'quiz' ? { name: R.quiz.lm.n, ico: R.quiz.lm.i, opts: R.quiz.opts.map(c => ({ cc: c, name: BY[c].name })), left: (R.event.until - now) / 1000, count: R.quiz.ans.size } : null,
    conts: Object.entries(conts).sort((a, b) => b[1] - a[1]),
    phase: R.phase, round: R.n, left: Math.max(0, (R.endsAt - now) / 1000), final: isFinal(), players, nations: R.order.length,
    event: ev ? { type: ev, label: EVENTS[ev].label, sub: EVENTS[ev].sub, left: (R.event.until - now) / 1000 } : null,
    list: R.order.slice(0, 8).map(c => ({ cc: c.cc, name: BY[c.cc].name, score: c.score, players: c.players.size, mvp: mvps(c, 1)[0] || null, pw: c.pw > now ? Math.ceil((c.pw - now) / 1000) : 0 })),
    today: Object.entries(P.today).sort((a, b) => b[1] - a[1]).slice(0, 5),
    streak: P.streak, pts: settings.pts, result: R.phase === 'break' ? R.result : null,
  };
}
function tick() {
  const now = Date.now();
  if (R.phase === 'race') {
    R.order = [...R.C.values()].filter(c => c.score > 0).sort((a, b) => b.score - a.score);
    const top = R.order[0];
    if (top && top.cc !== R.leader) {
      if (R.leader && now - R.leadAt > 5000) { fx({ t: 'lead', cc: top.cc, name: BY[top.cc].name }); R.leadAt = now; }
      R.leader = top.cc;
    }
    const second = R.order[1]; // đối đầu sát nút giữa hạng 1 và hạng 2
    if (top && second && top.score >= 1500 && top.score - second.score < top.score * 0.08 && now - (R.duelAt || 0) > 40000) {
      R.duelAt = now;
      fx({ t: 'duel', a: top.cc, b: second.cc, an: BY[top.cc].name, bn: BY[second.cc].name, gap: top.score - second.score });
    }
    if (R.quiz && (!R.event || now >= R.event.until)) endQuiz();
    if (R.tre && (!R.event || now >= R.event.until)) endTreasure();
    if (R.chal && now >= R.chal.until) endChallenge();
    for (const c of R.order.slice(0, 12)) { // đèn tắt dần: nước không ai tương tác 40 giây thì báo động, quá 50 giây thì mất dần điểm (0,5%/giây)
      const idle = now - c.lastAt;
      if (idle > 40000 && !c.fadeSaid && R.order.length > 1 && now - (R.fadeAt || 0) > 25000) { c.fadeSaid = true; R.fadeAt = now; fx({ t: 'fading', cc: c.cc, name: BY[c.cc].name }); }
      if (idle > 50000) c.score = Math.max(1, Math.round(c.score * 0.99875));
    }
    for (const c of R.order.slice(0, 8)) { // đội trưởng = người đóng góp nhiều nhất; bị vượt thì "đổi ngôi"
      const [id, best] = topContrib(c);
      if (id && best >= 500 && id !== c.cap) { const u = users.get(id), old = users.get(c.cap); if (c.cap && u) fx({ t: 'captain', user: pub(u), cc: c.cc, name: BY[c.cc].name, old: old ? old.name : '' }); c.cap = id; }
    }
    if (!R.hist && now >= R.midAt - 40000) R.hist = new Map(R.order.map(c => [c.cc, c.score]));
    if (R.hist && !R.newsSaid && now >= R.midAt && R.order.length >= 2) { // bản tin giữa vòng: nước tăng mạnh nhất
      R.newsSaid = true; let best = null, gain = 0;
      for (const c of R.order) { const d = c.score - (R.hist.get(c.cc) || 0); if (d > gain) { gain = d; best = c; } }
      if (best) fx({ t: 'news', cc: best.cc, name: BY[best.cc].name, gain, leader: BY[R.order[0].cc].name, lead: R.order[0].score - R.order[1].score, second: BY[R.order[1].cc].name });
    }
    if (isFinal() && !R.finalSaid) { R.finalSaid = true; endQuiz(); if (R.tre) endTreasure(); R.event = null; fx({ t: 'final' }); }
    if (settings.events && !isFinal() && now >= R.nextEventAt && R.endsAt - now > (settings.finalRushSec + 25) * 1000) {
      const keys = Object.keys(EVENTS).filter(k => k !== 'underdog' || R.order.length >= 4);
      const type = keys[Math.floor(Math.random() * keys.length)];
      startEvent(type, now);
      R.nextEventAt = R.event.until + rnd(22, 36) * 1000;
    }
    if (now >= R.endsAt) endRound();
  } else if (now >= R.endsAt) newRound();
  // giao diện: giữ giao diện đã chọn, hoặc tự đổi ngẫu nhiên sau mỗi N phút (0 = không đổi)
  if (!(settings.themeEvery > 0)) themeNow = THEMES.includes(settings.theme) ? settings.theme : 'night';
  else if (now - themeAt > settings.themeEvery * 60000) randomTheme();
  if (civDirty && now - (R.civSaveAt || 0) > 20000) { R.civSaveAt = now; civDirty = false; writeJSON('state.json', P); }
  io.emit('state', snapshot());
}

// ---------------------------------------------------------------- TikTok
let TikTok = null; try { TikTok = require('tiktok-live-connector'); } catch (e) { console.error('Thiếu tiktok-live-connector:', e.message); }
let conn = null, manualStop = true, reTimer = null, reDelay = 15000, lastTry = 0;
const tk = { state: 'idle', text: 'Chưa kết nối' };
const stats = { comments: 0, likes: 0, gifts: 0, coins: 0, viewers: 0 };
// các khoá trang điều khiển được phép đổi: 'b' bật/tắt · 's' chữ · [min, max] số · [giá trị...] chọn một
const CFG_RULES = {
  roundSec: [30, 3600], breakSec: [8, 300], finalRushSec: [0, 120], events: 'b', giftGoal: [20, 100000],
  theme: 'theme', themeEvery: [0, 240], view: ['sea', 'globe', 'flat', 'rockets'], dayNight: 'b', weather: 'b', title: 's', subtitle: 's', camZoom: [1, 3],
  eras: 'b', eraPts: 'eraPts', welcome: 'b', tts: 'b', voice: 'voice', mcLang: ['mix', 'native', 'en'],
  'vol.sfx': [0, 100], 'vol.voice': [0, 100], 'vol.music': [0, 100],
  'pts.join': [0, 1e6], 'pts.chat': [0, 1e6], 'pts.like': [0, 1e6], 'pts.follow': [0, 1e6], 'pts.share': [0, 1e6], 'pts.coin': [0, 1e6], 'pts.quiz': [0, 1e6],
};
const musicList = () => { try { return fs.readdirSync(path.join(__dirname, 'public', 'music')).filter(f => /\.(mp3|ogg|m4a|wav|aac)$/i.test(f)); } catch { return []; } };
const adminState = () => ({ music: musicList(), eraNames: ERA_NAMES, lan: lanUrls(), voices: VOICES, themes: THEMES, tk, stats, settings: { ...settings, apiKey: undefined, hasKey: !!settings.apiKey }, demo: !!demoTimer, port: PORT, crowns: P.crowns, round: R && R.n });
const pushAdmin = () => io.to('admin').emit('admin', adminState());
setInterval(pushAdmin, 2000); // số người xem / tim / quà trên trang điều khiển
function setTk(state, text) { tk.state = state; tk.text = text; console.log('[TikTok]', text); pushAdmin(); }

const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, n);
function findUrl(o) {
  if (!o) return '';
  if (typeof o === 'string') return o;
  const l = o.url || o.urlList || o.urls;
  return Array.isArray(l) && l.length ? String(l[0]) : (typeof l === 'string' ? l : '');
}
function pickUser(d) {
  const u = d.user || d;
  const handle = typeof u.uniqueId === 'string' ? u.uniqueId : (u.displayId || '');
  return {
    id: String(u.userId || u.id || handle || 'anon'),
    name: clean(u.nickname, 22) || clean(handle, 22) || 'Guest',
    avatar: findUrl(u.profilePicture) || findUrl(u.avatarThumb) || findUrl(u.avatarMedium) || u.profilePictureUrl || '',
  };
}
const streaks = new Map();
function handleGift(d) {
  const user = pickUser(d), det = d.giftDetails || d.gift || {}, ext = d.extendedGiftInfo || {};
  const gift = {
    name: det.giftName || ext.name || det.name || 'Gift',
    diamonds: Number(det.diamondCount || ext.diamond_count || ext.diamondCount || d.diamondCount || 0),
    img: (det.giftImage && det.giftImage.giftPictureUrl) || findUrl(ext.image) || findUrl(det.image) || findUrl(det.icon) || '',
  };
  const type = det.giftType ?? det.type ?? ext.type, repeat = Number(d.repeatCount || 1), key = user.id + ':' + d.giftId;
  if (type === 1 && !d.repeatEnd) { // chuỗi quà đang chạy: tính ngay cái đầu, phần còn lại tính khi kết thúc chuỗi
    if (!streaks.has(key)) { streaks.set(key, 1); count(gift, 1); onGift(user, gift, 1); }
    return;
  }
  const n = Math.max(0, repeat - (streaks.get(key) || 0)); streaks.delete(key);
  if (n > 0) { count(gift, n); onGift(user, gift, n); }
  function count(g, k) { stats.gifts += k; stats.coins += g.diamonds * k; }
}
function attach(c) {
  const { WebcastEvent, ControlEvent } = TikTok;
  const on = (ev, fn) => c.on(ev, d => { try { fn(d || {}); } catch (e) { console.error('Lỗi xử lý', ev, e && e.message); } });
  on(WebcastEvent.CHAT, d => { stats.comments++; onChat(pickUser(d), clean(d.comment ?? d.content, 120)); });
  on(WebcastEvent.GIFT, handleGift);
  on(WebcastEvent.LIKE, d => { const n = Math.max(1, Number(d.likeCount ?? d.count) || 1); stats.likes += n; onLike(pickUser(d), n); });
  on(WebcastEvent.MEMBER, d => onMember(pickUser(d)));
  on(WebcastEvent.FOLLOW, d => onSocial(pickUser(d), 'follow'));
  on(WebcastEvent.SHARE, d => onSocial(pickUser(d), 'share'));
  on(WebcastEvent.ROOM_USER, d => { stats.viewers = Number(d.viewerCount || d.total || d.totalUser || stats.viewers) || 0; });
  c.on(WebcastEvent.STREAM_END, () => { manualStop = true; setTk('ended', 'Phiên LIVE đã kết thúc'); });
  const onDisc = () => { if (manualStop || conn !== c) return; setTk('reconnecting', 'Mất kết nối — đang thử lại…'); retry(); };
  c.on((ControlEvent && ControlEvent.DISCONNECTED) || 'disconnected', onDisc);
  c.on('error', e => console.error('[TikTok] lỗi:', e && (e.message || e)));
}
function retry() { clearTimeout(reTimer); reTimer = setTimeout(connectTikTok, reDelay); reDelay = Math.min(reDelay * 2, 300000); }
async function connectTikTok() {
  clearTimeout(reTimer);
  if (!TikTok) return setTk('error', 'Thiếu thư viện tiktok-live-connector (chạy npm install)');
  const uname = String(settings.username || '').replace(/^@/, '').trim();
  if (!uname) return setTk('error', 'Chưa nhập tên kênh TikTok');
  const wait = 20000 - (Date.now() - lastTry); // giãn cách để TikTok không nghi là bot
  if (wait > 0) { setTk('connecting', `Đợi ${Math.ceil(wait / 1000)} giây rồi kết nối…`); reTimer = setTimeout(connectTikTok, wait); return; }
  lastTry = Date.now();
  if (conn) { manualStop = true; try { await conn.disconnect(); } catch {} conn = null; }
  manualStop = false;
  setTk('connecting', `Đang kết nối @${uname}…`);
  const opts = { enableExtendedGiftInfo: false };
  if (settings.apiKey) opts.signApiKey = settings.apiKey;
  const c = new TikTok.TikTokLiveConnection(uname, opts);
  conn = c; attach(c);
  try {
    await c.connect();
    if (conn !== c) return;
    reDelay = 15000;
    setTk('connected', `✓ Đang nhận sự kiện từ @${uname}`);
  } catch (e) {
    if (conn !== c) return;
    const msg = String((e && (e.message || e.name)) || e);
    const offline = /offline|not.*live|isn't online|LIVE has ended/i.test(msg);
    setTk('error', (offline ? 'Kênh chưa LIVE — hãy LIVE trước rồi kết nối. ' : 'Lỗi: ' + msg + '. ') + `Tự thử lại sau ${Math.round(reDelay / 1000)} giây.`);
    retry();
  }
}
async function disconnectTikTok() {
  manualStop = true; clearTimeout(reTimer);
  if (conn) { try { await conn.disconnect(); } catch {} conn = null; }
  setTk('idle', 'Đã ngắt kết nối');
}

// ---------------------------------------------------------------- chế độ demo (người xem giả để xem thử / test)
let demoTimer = null, botSeq = 0;
const BOT_CC = 'vn vn vn vn vn jp jp us us th ph id kr br in de fr mx my tw gb tr'.split(' ');
const BOT_NAMES = 'Mer Tom Wasabi Linh Haru Aiko Kenji Mike Sarah Somchai Maria Budi Minjun Lucas Priya Hans Chloe Diego Aisyah Wei Emma Can Minh Khoa Yuki Jake Nida Carlo Putri Jisoo'.split(' ');
const bots = [];
function demoTick() {
  const r = Math.random();
  if (bots.length < 70 && (r < 0.12 || bots.length < 6)) {
    const cc = BOT_CC[Math.floor(Math.random() * BOT_CC.length)];
    const b = { id: 'bot' + (++botSeq), name: BOT_NAMES[botSeq % BOT_NAMES.length] + (botSeq > 30 ? botSeq : ''), avatar: '', cc };
    bots.push(b); return onChat(b, BY[cc].name);
  }
  if (!bots.length) return;
  const b = bots[Math.floor(Math.random() * bots.length)];
  if (R.quiz && Math.random() < 0.3) return onChat(b, 'abc'[Math.floor(Math.random() * 3)]);
  if (R.tre && Math.random() < 0.3) return onChat(b, 'go');
  if (Math.random() < 0.004 && R.order.length > 2) return onChat(b, 'vs ' + BY[R.order[Math.floor(Math.random() * Math.min(4, R.order.length))].cc].name);
  if (r < 0.6) onLike(b, 1 + Math.floor(Math.random() * 15));
  else if (r < 0.9) onChat(b, Math.random() < 0.5 ? BY[b.cc].name : 'go go go');
  else if (r < 0.975) { const d = [1, 1, 1, 1, 5, 5, 10, 30, 99, 500][Math.floor(Math.random() * 10)]; onGift(b, { name: d >= 99 ? 'Galaxy' : d >= 10 ? 'Doughnut' : 'Rose', diamonds: d, img: '' }, 1); }
  else onSocial(b, Math.random() < 0.5 ? 'follow' : 'share');
  if (Math.random() < 0.03) onMember({ id: 'guest' + Math.floor(Math.random() * 999), name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)], avatar: '' });
}
function setDemo(on) { clearInterval(demoTimer); demoTimer = on ? setInterval(demoTick, 220) : null; pushAdmin(); }

// ---------------------------------------------------------------- socket
const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
io.on('connection', s => {
  s.emit('state', snapshot());
  if (!isLocal(s.handshake.address)) return; // máy khác trong mạng LAN chỉ xem được màn hình game, không điều khiển được
  s.on('admin:hello', () => { s.join('admin'); s.emit('admin', adminState()); });
  s.on('admin:connect', d => {
    settings.username = clean(d && d.username, 60);
    if (d && typeof d.apiKey === 'string' && d.apiKey.trim()) settings.apiKey = d.apiKey.trim();
    if (d && d.clearKey) settings.apiKey = '';
    writeJSON('settings.json', settings); lastTry = Math.min(lastTry, Date.now() - 15000); connectTikTok();
  });
  s.on('admin:disconnect', disconnectTikTok);
  s.on('admin:settings', d => {
    if (!d) return;
    settings.roundSec = num(d.roundSec, 30, 3600, settings.roundSec);
    settings.breakSec = num(d.breakSec, 8, 300, settings.breakSec);
    settings.finalRushSec = num(d.finalRushSec, 0, 120, settings.finalRushSec);
    settings.events = !!d.events;
    settings.tts = !!d.tts;
    if (THEMES.includes(d.theme)) settings.theme = d.theme;
    if (['sea', 'globe', 'flat', 'rockets'].includes(d.view)) settings.view = d.view;
    if (['mix', 'native', 'en'].includes(d.mcLang)) settings.mcLang = d.mcLang;
    settings.welcome = !!d.welcome; settings.weather = !!d.weather; settings.dayNight = !!d.dayNight;
    settings.themeEvery = num(d.themeEvery, 0, 240, settings.themeEvery);
    settings.giftGoal = num(d.giftGoal, 20, 100000, settings.giftGoal); if (goal.cur === 0) goal.target = settings.giftGoal;
    if (VOICES.includes(d.voice)) settings.voice = d.voice;
    for (const k of Object.keys(DEF.vol)) settings.vol[k] = num(d.vol && d.vol[k], 0, 100, settings.vol[k]);
    for (const k of Object.keys(DEF.pts)) settings.pts[k] = num(d.pts && d.pts[k], 0, 1e6, settings.pts[k]);
    writeJSON('settings.json', settings); pushAdmin();
  });
  // trang điều khiển kiểu Thắp Sáng Quê Hương: mỗi ô gửi đúng một khoá đã đổi { khoá: giá trị }
  s.on('admin:cfg', d => {
    if (!d || typeof d !== 'object') return;
    for (const [k, v] of Object.entries(d)) {
      const rule = CFG_RULES[k]; if (!rule) continue;
      let val;
      if (rule === 'b') val = !!v;
      else if (rule === 's') val = clean(v, 40);
      else if (Array.isArray(rule) && typeof rule[0] === 'number') { val = num(v, rule[0], rule[1], NaN); if (!Number.isFinite(val)) continue; }
      else if (Array.isArray(rule)) { if (!rule.includes(v)) continue; val = v; }
      else if (rule === 'theme') { if (!THEMES.includes(v)) continue; val = v; themeNow = v; themeAt = Date.now(); }
      else if (rule === 'voice') { if (!VOICES.includes(v)) continue; val = v; }
      else if (rule === 'eraPts') { // 8 mốc tăng dần, mốc đầu luôn 0
        if (!Array.isArray(v) || v.length !== 8) continue;
        val = v.map((x, i) => i ? Math.max(1, Math.round(num(x, 1, 1e9, settings.eraPts[i]))) : 0);
        for (let i = 1; i < 8; i++) if (val[i] <= val[i - 1]) val[i] = val[i - 1] + 1;
      } else continue;
      const [a, b] = k.split('.'); if (b) settings[a][b] = val; else settings[a] = val;
      if (k === 'giftGoal' && goal.cur === 0) goal.target = val;
    }
    writeJSON('settings.json', settings); pushAdmin();
  });
  s.on('admin:theme', () => randomTheme());
  s.on('admin:say', t => { const text = clean(t, 200); if (text) fx({ t: 'say', text }); });
  s.on('admin:eraUp', () => { // thử: nước dẫn đầu (hoặc Việt Nam) lên ngay thời đại kế tiếp
    if (!settings.eras) return;
    const cc = (R.order[0] && R.order[0].cc) || 'vn', e = eraOf(P.civ[cc] || 0); if (e >= 7) return;
    civAdd(cc, settings.eraPts[e + 1] - (P.civ[cc] || 0), null);
  });
  s.on('admin:eraReset', () => { P.civ = {}; writeJSON('state.json', P); fx({ t: 'eraReset' }); pushAdmin(); });
  s.on('admin:endRound', () => { if (R.phase === 'race') endRound(); });
  s.on('admin:newRound', () => newRound());
  s.on('admin:resetCrowns', () => { P.crowns = {}; P.today = {}; P.streak = { cc: '', n: 0 }; writeJSON('state.json', P); pushAdmin(); });
  s.on('admin:demo', on => setDemo(!!on));
  s.on('admin:event', type => { // nút thử từng sự kiện
    if (R.phase !== 'race' || !EVENTS[type]) return;
    endQuiz(); if (R.tre) endTreasure(); const now = Date.now();
    startEvent(type, now); R.nextEventAt = R.event.until + 30000;
  });
  s.on('admin:sim', d => {
    if (!d) return;
    const cc = detect(d.country) || 'vn';
    const u = { id: 'sim-' + clean(d.name, 20), name: clean(d.name, 20) || 'Tester', avatar: '' };
    if (d.type === 'join' || !U(u).cc) onChat(u, BY[cc].name);
    if (d.type === 'join') return;
    if (d.type === 'chat') return onChat(u, clean(d.text, 80)); // gõ bình luận thử: "vs Japan", "A", "go"…
    if (d.type === 'like') onLike(u, 50);
    else if (d.type === 'follow') onSocial(u, 'follow');
    else if (d.type === 'gift') onGift(u, { name: d.coins >= 99 ? 'Galaxy' : 'Rose', diamonds: num(d.coins, 1, 50000, 1), img: '' }, 1);
  });
});

// ---------------------------------------------------------------- giờ địa phương + thời tiết thật của từng nước
// Lấy ở thủ đô (hoặc tâm lãnh thổ) qua Open-Meteo: miễn phí, không cần key, chỉ gửi toạ độ. Mất mạng thì ước lượng theo vĩ độ + mùa.
const CAP = { // thủ đô: [vĩ độ, kinh độ, múi giờ chuẩn (giờ)]
  vn: [21.03, 105.85, 7], th: [13.75, 100.5, 7], id: [-6.2, 106.85, 7], my: [3.14, 101.69, 8], sg: [1.35, 103.82, 8], ph: [14.6, 120.98, 8], kh: [11.56, 104.92, 7], la: [17.97, 102.6, 7], mm: [16.8, 96.15, 6.5],
  cn: [39.9, 116.4, 8], tw: [25.03, 121.56, 8], hk: [22.3, 114.17, 8], jp: [35.68, 139.69, 9], kr: [37.57, 126.98, 9], in: [28.61, 77.21, 5.5], pk: [33.69, 73.06, 5], bd: [23.81, 90.41, 6], np: [27.72, 85.32, 5.75], lk: [6.93, 79.86, 5.5],
  au: [-33.87, 151.21, 10], nz: [-36.85, 174.76, 12], us: [38.9, -77.04, -5], ca: [45.42, -75.7, -5], mx: [19.43, -99.13, -6], br: [-15.79, -47.88, -3], ar: [-34.6, -58.38, -3], cl: [-33.45, -70.67, -4], pe: [-12.05, -77.04, -5], co: [4.71, -74.07, -5],
  gb: [51.51, -0.13, 0], ie: [53.35, -6.26, 0], fr: [48.86, 2.35, 1], de: [52.52, 13.4, 1], es: [40.42, -3.7, 1], pt: [38.72, -9.14, 0], it: [41.9, 12.5, 1], nl: [52.37, 4.9, 1], be: [50.85, 4.35, 1], ch: [46.95, 7.45, 1], at: [48.21, 16.37, 1],
  se: [59.33, 18.07, 1], no: [59.91, 10.75, 1], dk: [55.68, 12.57, 1], fi: [60.17, 24.94, 2], pl: [52.23, 21.01, 1], cz: [50.08, 14.44, 1], hu: [47.5, 19.04, 1], gr: [37.98, 23.73, 2], ro: [44.43, 26.1, 2], ua: [50.45, 30.52, 2],
  tr: [39.93, 32.86, 3], ru: [55.75, 37.62, 3], sa: [24.71, 46.68, 3], ae: [24.45, 54.38, 4], ir: [35.69, 51.39, 3.5], eg: [30.04, 31.24, 2], za: [-25.75, 28.19, 2], ng: [9.08, 7.4, 1], ke: [-1.29, 36.82, 3], et: [9.03, 38.74, 3],
  ma: [34.02, -6.84, 1], il: [31.77, 35.21, 2], kz: [51.17, 71.43, 5], uz: [41.3, 69.24, 5], mn: [47.89, 106.91, 8],
};
try { if (!MAPJSON) MAPJSON = buildMap(); } catch (e) { console.error('Lỗi dựng bản đồ:', e.message); }
const wx = new Map(); // cc -> { t: °C, code: mã thời tiết WMO, off: lệch giờ so với UTC (giây), real: số thật hay ước lượng, at }
const wxPlace = cc => CAP[cc] || CENT[cc] || [0, 0];
function wxGuess(cc) { // ước lượng khi chưa có số thật: nhiệt độ theo vĩ độ và mùa, múi giờ theo bảng / kinh độ
  const [lat, lon, tz] = wxPlace(cc), doy = (Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 864e5;
  const season = Math.cos(2 * Math.PI * (doy - 200) / 365) * (lat >= 0 ? 1 : -1);
  return { t: Math.round(28 - 0.0078 * lat * lat + season * 11 * Math.min(1, Math.abs(lat) / 50)), code: 2, off: (tz ?? Math.round(lon / 15)) * 3600, real: false, at: 0 };
}
let wxBusy = false;
async function refreshWx() {
  if (!settings.weather || wxBusy || !R) return;
  const now = Date.now(), ccs = R.order.slice(0, 40).map(c => c.cc).filter(cc => !wx.has(cc) || now - wx.get(cc).at > (wx.get(cc).real ? 15 : 3) * 60000).slice(0, 25);
  if (!ccs.length) return;
  wxBusy = true;
  try {
    const pts = ccs.map(wxPlace);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${pts.map(p => p[0].toFixed(2)).join(',')}&longitude=${pts.map(p => p[1].toFixed(2)).join(',')}&current=temperature_2m,weather_code&timezone=auto`;
    const r = await fetch(url, { signal: AbortSignal.timeout(9000) }); if (!r.ok) throw new Error('HTTP ' + r.status);
    let j = await r.json(); if (!Array.isArray(j)) j = [j];
    ccs.forEach((cc, i) => { const d = j[i]; if (d && d.current) wx.set(cc, { t: Math.round(d.current.temperature_2m), code: d.current.weather_code, off: d.utc_offset_seconds, real: true, at: Date.now() }); });
  } catch (e) {
    for (const cc of ccs) if (!wx.has(cc)) wx.set(cc, { ...wxGuess(cc), at: Date.now() }); // thử lại sau 3 phút
    console.error('[Thời tiết] chưa lấy được, tạm dùng số ước lượng:', e.message);
  } finally { wxBusy = false; }
}
setInterval(refreshWx, 15000);

newRound();
setInterval(tick, 250);
server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? `Cổng ${PORT} đang bị chiếm — game có thể đã mở sẵn.` : e); process.exit(1); });
server.listen(PORT, HOST, () => {
  console.log(`NATION RUSH đang chạy:\n  OBS (Browser Source):  http://127.0.0.1:${PORT}/live.html?obs=1\n  Trang điều khiển:      http://127.0.0.1:${PORT}/admin.html\n  TikTok LIVE Studio / điện thoại (cùng Wi-Fi): ${lanUrls().join('  ') || '(máy chưa nối mạng LAN)'}`);
  if (process.env.DEMO === '1') setDemo(true);
  if (settings.username && process.env.AUTOCONNECT !== '0') connectTikTok();
});
