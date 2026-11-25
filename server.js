'use strict';
// TÀU ĐÀ LẠT – TRẠI MÁT — game tương tác nhận quà cho TikTok LIVE.
// Đoàn tàu cổ chạy 7 km từ ga Đà Lạt tới ga Trại Mát rồi quay về.
// Bình luận = lên tàu · Thả tim = xúc than (tăng áp suất nồi hơi) · Quà = tăng tốc + toa riêng mang tên người tặng.
const path = require('path'), fs = require('fs'), http = require('http'), crypto = require('crypto'), https = require('https');
const express = require('express');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT) || 3340;
const HOST = process.env.HOST || '0.0.0.0'; // mở cho mạng LAN để LIVE Studio / điện thoại xem được; lệnh điều khiển chỉ nhận từ chính máy này
const isLocal = a => { a = String(a || ''); return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1'; };
function lanUrls() {
  const out = [];
  for (const list of Object.values(require('os').networkInterfaces())) for (const n of list || []) if (n.family === 'IPv4' && !n.internal) out.push(`http://${n.address}:${PORT}/live.html?obs=1`);
  return out.sort((a, b) => /\/\/192\.168\./.test(b) - /\/\/192\.168\./.test(a));
}
const DATA = path.join(__dirname, 'data');
fs.mkdirSync(DATA, { recursive: true });
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return d; } };
const writeJSON = (f, o) => { try { fs.writeFileSync(path.join(DATA, f), JSON.stringify(o, null, 1)); } catch (e) { console.error('Không ghi được', f, e.message); } };

// ---------------------------------------------------------------- tuyến đường
const ROUTE_KM = 7;
// các cảnh dọc đường (km tính từ ga Đà Lạt) — MC giới thiệu khi tàu đi qua
const SIGHTS = [
  { km: 1.2, name: 'Đồi thông', say: 'Hai bên là đồi thông xanh mướt, hít một hơi thật sâu không khí Đà Lạt nào!' },
  { km: 2.5, name: 'Làng rau', say: 'Tàu đang chạy qua những vườn rau bậc thang của Đà Lạt.' },
  { km: 3.6, name: 'Dốc cao', say: 'Phía trước là đoạn dốc cao, cả nhà thả tim xúc than để tàu leo dốc nhé!' },
  { km: 4.8, name: 'Thung lũng hoa', say: 'Thung lũng hoa cẩm tú cầu đang nở rộ, đẹp quá đi thôi!' },
  { km: 6.0, name: 'Nhà kính', say: 'Những dãy nhà kính trắng xoá, nơi trồng dâu tây và hoa nổi tiếng của Đà Lạt.' },
];
// lời thuyết minh của hướng dẫn viên suốt chặng (km: đọc khi tàu chạy qua mốc này)
const GUIDE = [
  [ // lượt đi Đà Lạt → Trại Mát
    { km: 0.3, text: 'Xin chào quý khách, tôi là hướng dẫn viên trên chuyến tàu hôm nay. Ga Đà Lạt được xây dựng từ năm 1932 đến năm 1938, do kiến trúc sư người Pháp thiết kế. Ba mái nhọn của nhà ga gợi hình ba đỉnh núi Lâm Viên.' },
    { km: 6.5, text: 'Tàu sắp đến ga Trại Mát. Gần ga có chùa Linh Phước, còn gọi là chùa Ve Chai, nổi tiếng với những công trình khảm từ mảnh sành sứ và vỏ chai.' },
  ],
  [ // lượt về Trại Mát → Đà Lạt
    { km: 6.6, text: 'Cảm ơn quý khách đã ghé thăm Trại Mát. Đà Lạt còn được gọi là thành phố ngàn hoa, thành phố sương mù và xứ sở ngàn thông.' },
    { km: 0.6, text: 'Tàu sắp về đến ga Đà Lạt. Cảm ơn quý khách đã lắng nghe, chúc quý khách một chuyến đi thật vui vẻ.' },
  ],
];
// kho câu thuyết minh: giữa hai mốc cố định, hướng dẫn viên bốc ngẫu nhiên (không lặp lại cho tới khi đọc hết kho)
const FACTS = [
  'Tuyến đường sắt răng cưa Tháp Chàm đi Đà Lạt dài 84 cây số, được người Pháp xây dựng từ năm 1903 đến năm 1932, từng là một trong những tuyến đường sắt độc đáo bậc nhất.',
  'Ở những đoạn dốc nhất của tuyến Tháp Chàm đi Đà Lạt, đầu máy phải bám vào một thanh ray răng cưa đặt giữa đường ray để leo dốc.',
  'Đoạn đường sắt Đà Lạt đi Trại Mát dài 7 cây số là đoạn còn lại của tuyến đường sắt răng cưa năm xưa, nay được khôi phục để phục vụ du khách.',
  'Ga Đà Lạt đã được công nhận là di tích kiến trúc nghệ thuật cấp quốc gia. Ở sân ga hiện vẫn trưng bày một đầu máy hơi nước cổ.',
  'Đà Lạt nằm trên cao nguyên Lâm Viên, ở độ cao khoảng một nghìn năm trăm mét so với mực nước biển, nên khí hậu mát mẻ quanh năm.',
  'Nhiệt độ trung bình ở Đà Lạt chỉ khoảng mười tám đến hai mươi mốt độ, nên nơi đây được gọi là thành phố mùa xuân.',
  'Năm 1893, bác sĩ Alexandre Yersin đã khám phá ra cao nguyên Lâm Viên, mở đầu cho lịch sử hình thành thành phố Đà Lạt.',
  'Thời Pháp thuộc, Đà Lạt từng được ví là một Paris thu nhỏ, với nhiều biệt thự kiểu Pháp nằm giữa rừng thông.',
  'Người Cơ Ho, trong đó có nhóm Lạch, là cư dân bản địa lâu đời trên cao nguyên Lâm Viên. Một cách giải thích cho tên Đà Lạt là dòng suối của người Lạch.',
  'Núi Langbiang cao hơn hai nghìn mét, gắn với truyền thuyết tình yêu của chàng K Lang và nàng H Biang.',
  'Hồ Xuân Hương nằm giữa trung tâm thành phố, được hình thành từ đầu thế kỷ hai mươi, là biểu tượng thơ mộng của Đà Lạt.',
  'Nhà thờ Chính tòa Đà Lạt còn được người dân gọi thân mật là nhà thờ Con Gà, vì trên đỉnh tháp chuông có hình một chú gà.',
  'Dinh Bảo Đại, hay Dinh Ba, từng là nơi nghỉ dưỡng của vua Bảo Đại, nay là điểm tham quan nổi tiếng của Đà Lạt.',
  'Thiền viện Trúc Lâm nằm bên hồ Tuyền Lâm, du khách có thể đi cáp treo ngắm rừng thông từ trên cao.',
  'Quanh Đà Lạt còn có thung lũng Tình Yêu, đồi Mộng Mơ, hồ Tuyền Lâm và thác Datanla, quý khách đừng bỏ lỡ nhé.',
  'Đà Lạt có rất nhiều loài hoa: cẩm tú cầu, hồng, cúc, lan, và loài hoa bất tử. Làng hoa Thái Phiên và Vạn Thành là những làng hoa lâu đời.',
  'Cuối năm, hoa dã quỳ vàng rực nở khắp các triền đồi. Còn mùa xuân, Đà Lạt hồng lên vì hoa mai anh đào.',
  'Festival Hoa Đà Lạt được tổ chức định kỳ, thu hút du khách khắp nơi về thành phố ngàn hoa.',
  'Rau Đà Lạt như bắp cải, súp lơ, cà rốt, xà lách được trồng quanh năm nhờ khí hậu mát mẻ.',
  'Dâu tây là đặc sản nổi tiếng của Đà Lạt. Nhiều vườn dâu cho du khách vào tận nơi tự tay hái.',
  'Atisô Đà Lạt được dùng để nấu canh, hầm xương và làm trà, rất được du khách ưa chuộng.',
  'Hồng treo gió là món quà đặc biệt của Đà Lạt: những trái hồng được treo phơi nhẹ trong gió lạnh cho dẻo ngọt.',
  'Vùng Cầu Đất gần Đà Lạt nổi tiếng với những đồi chè xanh mướt và cà phê arabica thơm ngon.',
  'Đến Đà Lạt, quý khách nhớ thử bánh tráng nướng, bánh căn, lẩu gà lá é, và một ly sữa đậu nành nóng buổi tối nhé.',
  'Chợ Đà Lạt và chợ đêm là nơi rất đông vui, có đủ món ăn vặt, áo len, và các loại mứt Đà Lạt.',
  'Buổi sáng sớm, sương mù thường phủ kín các thung lũng, khiến Đà Lạt được gọi là thành phố sương mù.',
  'Rừng thông ba lá là hình ảnh quen thuộc nhất của Đà Lạt, nên thành phố còn được gọi là xứ sở ngàn thông.',
  'Chùa Linh Phước ở Trại Mát có tượng Quan Âm được kết từ hoa bất tử, và một con rồng lớn ghép từ mảnh chai.',
  'Đoàn tàu hôm nay gồm đầu máy hơi nước, hai toa La Reine sang trọng, hai toa VIP, một toa ngồi mềm và một toa ngồi cứng.',
  'Toa La Reine có trần hoa, rèm đỏ và đèn nến, mang phong cách những chuyến tàu hoàng gia ngày xưa.',
];
// lời mời tương tác của MC, đọc xen kẽ khi yên ắng
const CTA = [
  'Bình luận bất kỳ để mua vé lên tàu, ảnh của bạn sẽ hiện ngay trong cửa sổ toa nhé!',
  'Thả tim thật nhiều để xúc than, tàu sẽ chạy nhanh hơn và leo dốc khỏe hơn!',
  'Ai tặng quà từ 10 xu sẽ được mời sang toa VIP, từ 100 xu lên toa La Reine sang trọng!',
  'Gõ tu tu để kéo còi tàu cùng mọi người nào!',
  'Quý khách đang xem từ tỉnh nào? Bình luận quê mình cho cả tàu biết với nhé!',
  'Ở lại đến ga Trại Mát để xem ai trúng vé may mắn của chuyến này nhé!',
  'Follow kênh để lần sau đoàn tàu chờ bạn, và được ngồi toa ngồi mềm!',
  'Đi càng nhiều chuyến, bạn càng thành khách quen của đoàn tàu đó!',
];
const pickBag = {}; // bốc ngẫu nhiên không lặp
function pickFrom(name, list) {
  let bag = pickBag[name];
  if (!bag || !bag.length) bag = pickBag[name] = list.map((_, i) => i).sort(() => Math.random() - 0.5);
  return list[bag.pop()];
}
const HILL = [3.3, 4.1]; // trùng đoạn đường ray lên dốc trong cảnh 3D // đoạn dốc: tàu chậm lại nếu áp suất thấp
const QUIZ = [
  { q: 'Ga Đà Lạt có mấy mái nhọn?', a: ['2 mái', '3 mái', '5 mái'], ok: 1 },
  { q: 'Đà Lạt còn được gọi là gì?', a: ['Thành phố ngàn hoa', 'Thành phố cảng', 'Thành phố biển'], ok: 0 },
  { q: 'Hồ nào nằm giữa trung tâm Đà Lạt?', a: ['Hồ Gươm', 'Hồ Tây', 'Hồ Xuân Hương'], ok: 2 },
  { q: 'Ngọn núi nổi tiếng ở Đà Lạt là?', a: ['Fansipan', 'Langbiang', 'Bà Đen'], ok: 1 },
  { q: 'Ngôi chùa nổi tiếng gần ga Trại Mát?', a: ['Chùa Linh Phước', 'Chùa Một Cột', 'Chùa Thiên Mụ'], ok: 0 },
  { q: 'Trái cây nổi tiếng của Đà Lạt?', a: ['Sầu riêng', 'Măng cụt', 'Dâu tây'], ok: 2 },
  { q: 'Đà Lạt thuộc tỉnh nào?', a: ['Lâm Đồng', 'Khánh Hoà', 'Đắk Lắk'], ok: 0 },
];

// ---------------------------------------------------------------- cài đặt
const DEF = {
  username: '', apiKey: '',
  timeX: 3,          // tốc độ thời gian: 3 = nhanh gấp 3 lần tàu thật (cảnh 3D theo bản đồ thật dài 6,5 km → 1 chiều ~4–6 phút)
  boardSec: 25,      // đợi khách ở ga Đà Lạt
  stopSec: 32,       // dừng ở ga Trại Mát (đủ cho phát thanh tàu đến + tàu sắp chạy)
  finishSec: 30,     // về lại Đà Lạt: chụp ảnh lưu niệm (~12 giây) rồi màn tổng kết
  events: true, eventEvery: 55,
  fogLikes: 300, cowHonks: 8, treeCoins: 5,
  likePow: 0.5,      // mỗi tim + bao nhiêu % áp suất
  trainMode: 'auto', // auto = theo giờ máy (18:00–5:30 là tàu đêm) · day · night · alt = xen kẽ ngày/đêm mỗi chuyến
  tts: true, voice: 'Adam bựa', rate: 1.25,
  annVoice: 'Mai Anh',     // giọng phát thanh viên kiểu hàng không (VieNeu: nữ, phong cách tin tức)
  guideVoice: 'Thiện Minh', // giọng hướng dẫn viên thuyết minh (VieNeu: nam, phong cách kể chuyện; '' = giống MC)
  guide: true,             // bật thuyết minh suốt chặng
  factEvery: 22,           // cứ khoảng bao nhiêu giây thì hướng dẫn viên đọc một câu thuyết minh ngẫu nhiên
  likeGoal: 1500,          // mục tiêu tim mỗi chuyến → pháo hoa + tàu chạy hết tốc lực
  cap: { lareine: 24, vip: 32, mem: 20, cung: 20 }, // số ghế MỖI toa: 2 Lareine = 48 · VIP 1 + VIP 2 = 64 · ngồi mềm 20 · ngồi cứng 20
  view3d: true,            // màn hình 3D (tắt → bản vẽ 2D nhẹ cho máy yếu) vol: { sfx: 70, voice: 100, music: 35 }, // giọng VieNeu (giống Thắp Sáng Quê Hương)
  title: 'TÀU ĐÀ LẠT – TRẠI MÁT',
};
const saved = readJSON('settings.json', {});
const settings = { ...DEF, ...saved, vol: { ...DEF.vol, ...(saved.vol || {}) }, cap: { ...DEF.cap, ...(saved.cap || {}) } };
if (/Neural$/.test(settings.voice)) settings.voice = DEF.voice; // giọng Edge cũ → giọng VieNeu
const saveSettings = () => writeJSON('settings.json', settings);
const P = { tripNo: 0, day: '', top: {}, riders: {}, lucky: [], ...readJSON('state.json', {}) }; // top: hào phóng hôm nay · riders: khách quen (số chuyến đã đi)
if (!P.riders) P.riders = {};
if (!P.lucky) P.lucky = [];
let ridersDirty = false;
setInterval(() => {
  if (!ridersDirty) return; ridersDirty = false;
  const ids = Object.keys(P.riders);
  if (ids.length > 5000) for (const id of ids.sort((a, b) => P.riders[a].rides - P.riders[b].rides).slice(0, ids.length - 4000)) delete P.riders[id]; // giữ 4000 khách quen nhất
  writeJSON('state.json', P);
}, 15000);
const today = () => new Date().toLocaleDateString('en-CA');
function rollDay() { if (P.day !== today()) { P.day = today(); P.top = {}; } }
rollDay();

// ---------------------------------------------------------------- web
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/three', express.static(path.join(__dirname, 'node_modules', 'three')));
// hành khách 3D: nhân vật VRoid (.vrm) — lấy trong TauDaLat\models, không có thì dùng chung của Vũ Trường Neon
const MODEL_DIRS = [path.join(__dirname, 'models'), path.join(__dirname, '..', 'VuTruongNeon', 'public', 'models')];
for (const d of MODEL_DIRS) app.use('/models', express.static(d));
app.get('/api/models', (req, res) => {
  const seen = new Set(), out = [];
  for (const d of MODEL_DIRS) { try { for (const f of fs.readdirSync(d)) if (/\.vrm$/i.test(f) && !seen.has(f.toLowerCase())) { seen.add(f.toLowerCase()); out.push({ file: f, female: /^nu/i.test(f) }); } } catch {} }
  res.json(out.sort((a, b) => a.file.localeCompare(b.file)));
});
// ảnh đại diện TikTok đi qua server để dán được lên nhân vật / biển tên 3D (chỉ nhận ảnh từ máy chủ ảnh của TikTok)
const avCache = new Map();
app.get('/api/avatar', async (req, res) => {
  let u; try { u = new URL(String(req.query.u || '')); } catch { return res.status(400).end(); }
  if (u.protocol !== 'https:' || !/(^|\.)(tiktokcdn(-[a-z]+)?\.com|tiktokcdn\.us|ibyteimg\.com|byteimg\.com|muscdn\.com|tiktokv\.com)$/i.test(u.hostname)) return res.status(403).end();
  let hit = avCache.get(u.href);
  if (!hit) {
    try {
      const r = await fetch(u.href, { signal: AbortSignal.timeout(6000) });
      const type = r.headers.get('content-type') || '';
      if (!r.ok || !/^image\//.test(type)) return res.status(502).end();
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 2e6) return res.status(413).end();
      hit = { type, buf }; avCache.set(u.href, hit); if (avCache.size > 400) avCache.delete(avCache.keys().next().value);
    } catch { return res.status(502).end(); }
  }
  res.set({ 'Content-Type': hit.type, 'Cache-Control': 'public, max-age=3600' }).send(hit.buf);
});
app.get('/', (req, res) => res.redirect('/live.html' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '')));
app.get('/admin.html', (req, res, next) => isLocal(req.socket.remoteAddress) ? next() : res.status(403).send('Trang điều khiển chỉ mở được trên máy chạy game.'));

// MC giọng AI tiếng Việt: bộ đọc VieNeu-TTS giống game Thắp Sáng Quê Hương (chạy offline trên máy).
// Tự tìm thư mục VieNeu-TTS cạnh thư mục game, tự bật khi bật MC, tự tắt khi đóng game.
app.use(express.json({ limit: '20kb' }));
const vieneu = require('./vieneu.js')({ app, io });
const MUSIC_DIR = path.join(__dirname, 'public', 'music');
const musicList = () => { try { return fs.readdirSync(MUSIC_DIR).filter(f => /\.(mp3|ogg|m4a|wav|aac)$/i.test(f)); } catch { return []; } };
app.get('/api/music', (req, res) => res.json(musicList()));
app.post('/api/open-live', (req, res) => { // mở màn hình LIVE trong cửa sổ riêng để LIVE Studio "Chụp cửa sổ"
  if (!isLocal(req.socket.remoteAddress)) return res.status(403).end();
  const bases = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean);
  const exe = bases.flatMap(b => [path.join(b, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), path.join(b, 'Google', 'Chrome', 'Application', 'chrome.exe')]).find(f => fs.existsSync(f));
  if (!exe) return res.json({ ok: false, error: 'Không tìm thấy Microsoft Edge hoặc Google Chrome' });
  try {
    require('child_process').spawn(exe, [`--app=http://127.0.0.1:${PORT}/live.html?obs=1`, '--window-size=560,1000', `--user-data-dir=${path.join(DATA, 'browser-live')}`,
      '--autoplay-policy=no-user-gesture-required', '--no-first-run', '--no-default-browser-check'], { detached: true, stdio: 'ignore' }).unref();
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ---------------------------------------------------------------- trạng thái chuyến tàu
const now = () => Date.now();
const S = {
  phase: 'board', phaseEnd: now() + settings.boardSec * 1000, night: false, // board → run(lượt đi) → stop(Trại Mát) → run(lượt về) → finish
  leg: 0, km: 0, speed: 0, pressure: 20, boostEnd: 0,
  event: null, nextEvent: now() + 40000, sightIdx: 0, hillSaid: false,
};
let pax = new Map();   // hành khách chuyến này: id → { id, name, avatar, coins, likes, soft, t }
let rosterV = 0;
// Đoàn tàu cố định: đầu máy hơi nước + 2 toa Lareine + toa VIP 1, VIP 2 + toa ngồi mềm + toa ngồi cứng.
// Hạng ghế của mỗi hành khách theo xu tặng cộng dồn trong chuyến:
//   từ 100 xu → Lareine · từ 10 xu → VIP · có tặng quà / follow / share → ngồi mềm · chỉ bình luận → ngồi cứng
const CLS = ['cung', 'mem', 'vip', 'lareine'];
const CLS_NAME = { cung: 'toa ngồi cứng', mem: 'toa ngồi mềm', vip: 'toa VIP', lareine: 'toa La Reine' };
// số hiệu toa xe (in trên thân toa và ô "Toa/Coach" của thẻ lên tàu); MC vẫn gọi theo tên toa
const CAR_NO = { lareine1: '51612', lareine2: '51618', vip1: '51620', vip2: '51622', mem: '5', cung: '6' };
const CAR_SPOKEN = { lareine1: 'toa La Reine', lareine2: 'toa La Reine', vip1: 'toa VIP 1', vip2: 'toa VIP 2', mem: 'toa ngồi mềm', cung: 'toa ngồi cứng' };
// thông tin in trên thẻ lên tàu (giống vé thật: ga đi/đến, tàu, ngày, giờ đi, toa, chỗ, loại chỗ, loại vé, họ tên)
const CLASS_LABEL = { cung: 'Ngồi cứng', mem: 'Ngồi mềm', vip: 'VIP', lareine: 'La Reine' };
function passInfo(p) {
  const leg = S.phase === 'stop' ? 1 : S.leg, d = new Date();
  let h = 0; for (const c of String(p.id) + P.tripNo + leg) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return {
    name: p.name, avatar: p.avatar, id: String(170000000 + (h % 9999999)).padStart(9, '0'),
    from: leg === 0 ? 'ĐÀ LẠT' : 'TRẠI MÁT', to: leg === 0 ? 'TRẠI MÁT' : 'ĐÀ LẠT', code: code(leg), dep: TIMETABLE[ttIdx(leg)][0],
    date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
    coach: ALL_CARS.indexOf(p.car) + 1, // toa 1 → 6 theo thứ tự đoàn tàu (số hiệu toa chỉ in trên thân toa)
    seat: p.si + 1, cls: p.car === 'vip1' ? 'VIP 1' : p.car === 'vip2' ? 'VIP 2' : CLASS_LABEL[carCls(p.car)] || 'Ngồi cứng', type: 'Toàn vé',
  };
}
// bình luận là được lên tàu: xếp xen kẽ vào toa ngồi cứng và toa ngồi mềm (p.seat); tặng quà / follow / share → chắc chắn ngồi mềm
const clsOf = p => p.coins >= 100 ? 'lareine' : p.coins >= 10 ? 'vip' : (p.coins > 0 || p.soft) ? 'mem' : (p.seat || 'cung');
const fx = o => io.emit('fx', o);
const say = (text, kind) => fx({ t: 'say', text, kind });
const announce = (text, urgent) => fx({ t: 'announce', text, urgent: !!urgent }); // urgent: ngắt ngang câu đang đọc để nói ngay
// phát thanh kiểu hàng không
const spkCode = c => 'đê lờ ' + String(c).replace(/^DL/, '');
const spkTime = hhmm => { const [h, m] = hhmm.split(':').map(Number); return `${h} giờ` + (m ? ` ${m}` : ''); }; // '07:50' → '7 giờ 50'
function annDepart(leg) { // giờ khởi hành đọc đúng theo bảng giờ (DL1 = 7 giờ 50 …)
  const c = spkCode(code(leg)), route = leg === 0 ? 'Đà Lạt đi Trại Mát' : 'Trại Mát đi Đà Lạt';
  announce(`Kính thưa quý khách. Đoàn tàu ${route}, số hiệu ${c}, khởi hành lúc ${spkTime(TIMETABLE[ttIdx(leg)][0])}, sắp bắt đầu chuyển bánh. Quý khách có vé đi tàu ${c}, vui lòng ổn định chỗ ngồi, để đoàn tàu chuyển bánh được an toàn. Xin cảm ơn, và hẹn gặp lại quý khách.`, true);
}
const legName = () => S.leg === 0 ? 'Đà Lạt → Trại Mát' : 'Trại Mát → Đà Lạt';
const distLeft = () => S.leg === 0 ? ROUTE_KM - S.km : S.km;

function driver() { // lái tàu = người tặng nhiều xu nhất chuyến này
  let best = null; for (const p of pax.values()) if (p.coins > 0 && (!best || p.coins > best.coins)) best = p;
  return best && { id: best.id, name: best.name, avatar: best.avatar, coins: best.coins };
}
// ---- sơ đồ chỗ ngồi: mỗi toa có số ghế cố định (chỉnh ở trang điều khiển), khách giữ nguyên ghế suốt chuyến
const CAR_KEYS = { lareine: ['lareine1', 'lareine2'], vip: ['vip1', 'vip2'], mem: ['mem'], cung: ['cung'] };
const ALL_CARS = ['lareine1', 'lareine2', 'vip1', 'vip2', 'mem', 'cung'];
const carCls = key => key.replace(/\d$/, '');
const capOf = key => Math.max(1, Math.min(80, Number(settings.cap[carCls(key)]) || 20));
let seats = {};
function resetSeats() { seats = {}; for (const k of ALL_CARS) seats[k] = []; }
resetSeats();
function freeSeat(p) { if (p.car) { const a = seats[p.car]; if (a && a[p.si] === p.id) a[p.si] = null; } p.car = null; p.si = -1; }
function takeSeat(p, cls) {
  for (const key of CAR_KEYS[cls]) { const a = seats[key], cap = capOf(key); for (let i = 0; i < cap; i++) if (!a[i]) { a[i] = p.id; p.car = key; p.si = i; return true; } }
  return false;
}
// xếp / đổi ghế theo hạng hiện tại; trả về false nếu hết chỗ
function placePax(p) {
  const want = clsOf(p);
  if (p.car && carCls(p.car) === want) return true;
  const old = p.car ? { car: p.car, si: p.si } : null;
  freeSeat(p);
  if (takeSeat(p, want)) return true;
  if (want === 'cung' && takeSeat(p, 'mem')) return true;   // toa ngồi cứng đầy → sang ngồi mềm
  if (want === 'mem' && takeSeat(p, 'cung')) return true;
  if (old) { seats[old.car][old.si] = p.id; p.car = old.car; p.si = old.si; return true; } // hạng mới hết chỗ → giữ ghế cũ
  return false;
}
function roster() {
  const cars = {};
  for (const key of ALL_CARS) cars[key] = seats[key].map((id, i) => { const p = id && pax.get(id); return p && { i, id: p.id, name: p.name, avatar: p.avatar, coins: p.coins }; }).filter(Boolean);
  const count = Object.fromEntries(CLS.map(c => [c, CAR_KEYS[c].reduce((s, k) => s + cars[k].length, 0)]));
  const cap = Object.fromEntries(ALL_CARS.map(k => [k, capOf(k)]));
  const recent = [...pax.values()].filter(p => p.car).sort((a, b) => b.t - a.t).slice(0, 6).map(p => ({ id: p.id, name: p.name, avatar: p.avatar, car: p.car, si: p.si }));
  return { v: rosterV, cars, cap, count, recent, total: pax.size, driver: driver() };
}
const touch = () => { rosterV++; rosterDirty = true; };
let rosterDirty = true;

function setPhase(ph) {
  S.phase = ph; S.event = null;
  if (ph === 'board') {
    P.tripNo++; writeJSON('state.json', P);
    S.leg = 0; S.km = 0; S.speed = 0; S.pressure = 20; S.boostEnd = 0; S.sightIdx = 0; S.hillSaid = false;
    S.night = isNightTrip();
    pax = new Map(); resetSeats(); touch();
    S.likes = 0; S.goalHit = false; S.berry = null; S.lucky = null; S.nextCta = now() + 40000;
    S.phaseEnd = now() + settings.boardSec * 1000; S.annDone = false; // phát thanh "sắp chuyển bánh" đọc sát giờ tàu chạy (xem vòng lặp)
    say(`${S.night ? 'Tàu đêm' : 'Tàu'} sắp chạy rồi! Bình luận để mua vé lên tàu, thả tim để xúc than nào!`);
  } else if (ph === 'run') {
    S.phaseEnd = 0; S.nextEvent = now() + 30000 + Math.random() * 15000;
    S.sightIdx = S.leg === 0 ? 0 : SIGHTS.length - 1; S.hillSaid = false; S.guideIdx = 0; S.nextFact = now() + 20000;
    S.berry = null;
    fx({ t: 'depart' });
    if (S.leg === 0) setTimeout(() => S.phase === 'run' && S.leg === 0 && say('Vé may mắn của chuyến này sẽ được bốc thăm khi tàu đến ga Trại Mát. Quý khách nhớ ở lại nhé!'), 9000);
  } else if (ph === 'stop') {
    S.phaseEnd = now() + settings.stopSec * 1000; S.speed = 0; S.annDone = false;
    S.luckyAt = now() + 9000; S.berryAt = now() + 15000; // bốc vé may mắn rồi mở "hái dâu" ở ga Trại Mát
    fx({ t: 'arrive', station: 'Trại Mát' });
    announce(`Kính thưa quý khách. Đoàn tàu ${spkCode(code(0))} đã đến ga Trại Mát. Quý khách xuống tàu vui lòng kiểm tra lại hành lý và tư trang. Xin cảm ơn quý khách.`);
  } else if (ph === 'finish') {
    S.phaseEnd = now() + settings.finishSec * 1000; S.speed = 0;
    const top = [...pax.values()].filter(p => p.coins > 0).sort((a, b) => b.coins - a.coins).slice(0, 3).map(p => ({ name: p.name, avatar: p.avatar, coins: p.coins }));
    const d = driver();
    const vipN = [...pax.values()].filter(p => p.coins >= 10).length;
    // ảnh lưu niệm cả đoàn: khách VIP / Lareine trước, rồi khách đi nhiều chuyến
    const photo = [...pax.values()].sort((a, b) => b.coins - a.coins || (b.rides || 0) - (a.rides || 0) || b.t - a.t).slice(0, 18).map(p => ({ name: p.name, avatar: p.avatar }));
    const regulars = [...pax.values()].filter(p => p.rides >= 2).sort((a, b) => b.rides - a.rides).slice(0, 3).map(p => ({ name: p.name, rides: p.rides }));
    fx({ t: 'finish', trip: P.tripNo, codes: code(0) + ' / ' + code(1), total: pax.size, vip: vipN, top, driver: d, photo, regulars, lucky: S.lucky, likes: S.likes });
    announce(`Kính thưa quý khách. Đoàn tàu ${spkCode(code(1))} đã về đến ga Đà Lạt. Quý khách vui lòng kiểm tra lại hành lý và tư trang trước khi xuống tàu. Cảm ơn quý khách đã lựa chọn chuyến tàu Đà Lạt, Trại Mát. Hẹn gặp lại quý khách.`);
    say(`Chuyến này có ${pax.size} hành khách.` + (d ? ` Cảm ơn lái tàu ${speakName(d.name)} đã đồng hành!` : ''));
  }
}
// bảng giờ tàu ở ga Đà Lạt: DL lẻ = Đà Lạt → Trại Mát, DL chẵn = Trại Mát → Đà Lạt (giờ xuất phát, giờ đến)
const TIMETABLE = [
  ['07:50', '08:20'], ['08:50', '09:20'], ['09:55', '10:25'], ['10:55', '11:25'], ['12:00', '12:30'], ['13:00', '13:30'], ['14:05', '14:35'],
  ['15:05', '15:35'], ['16:10', '16:40'], ['17:10', '17:40'], ['18:15', '18:45'], ['19:15', '19:45'], ['20:20', '20:50'], ['21:20', '21:50'],
];
const ttIdx = leg => 2 * ((Math.max(1, P.tripNo) - 1) % 7) + leg;          // chuyến 1 = DL1/DL2, chuyến 2 = DL3/DL4 …
const code = leg => 'DL' + (ttIdx(leg) + 1);
const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const depMin = leg => toMin(TIMETABLE[ttIdx(leg)][0]), arrMin = leg => toMin(TIMETABLE[ttIdx(leg)][1]);
// tàu đêm: theo giờ tàu (DL11 – DL14 chạy sau 18 giờ) hoặc theo lựa chọn ở trang điều khiển
function isNightTrip() {
  const m = settings.trainMode;
  if (m === 'day') return false;
  if (m === 'night') return true;
  if (m === 'alt') return P.tripNo % 2 === 0;
  return depMin(0) >= 18 * 60;
}
// giờ "trong game" theo bảng giờ: đợi ở ga → giờ xuất phát, chạy 30 phút → giờ đến
function gameClock() {
  const T = now(), frac = (len, end) => len > 0 ? clampN(1 - (end - T) / len, 0, 1) : 1;
  if (S.phase === 'board') return depMin(0) - 5 + 5 * frac(settings.boardSec * 1000, S.phaseEnd);
  if (S.phase === 'stop') return arrMin(0) + (depMin(1) - arrMin(0)) * frac(settings.stopSec * 1000, S.phaseEnd);
  if (S.phase === 'finish') return arrMin(1) + 3 * frac(settings.finishSec * 1000, S.phaseEnd);
  const prog = S.leg === 0 ? S.km / ROUTE_KM : 1 - S.km / ROUTE_KM;
  return depMin(S.leg) + (arrMin(S.leg) - depMin(S.leg)) * prog;
}
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
function skyClock() { // giờ dùng để vẽ bầu trời (ép ngày / đêm nếu chọn "luôn ngày" / "luôn đêm")
  const c = gameClock(), dayish = c >= 6.5 * 60 && c <= 17.6 * 60;
  if (settings.trainMode === 'day' && !dayish) return 10 * 60;
  if (settings.trainMode === 'night' && c < 19.3 * 60 && c > 5 * 60) return 20.5 * 60;
  if (settings.trainMode === 'alt') return S.night ? (c >= 19.3 * 60 ? c : 20.5 * 60) : (dayish ? c : 10 * 60);
  return c;
}
const speakName = n => /[\p{L}\p{N}]/u.test(n) ? n.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().slice(0, 20) : 'bạn';

// ---------------------------------------------------------------- sự kiện dọc đường
function startEvent(type) {
  const T = now(); let e;
  if (type === 'fog') e = { type, title: 'Sương mù dày đặc!', hint: 'Thả tim để bật đèn pha', goal: settings.fogLikes, unit: 'tim', sec: 25, block: false };
  else if (type === 'cow') e = { type, title: 'Đàn bò chắn đường ray!', hint: 'Bình luận "tu tu" để kéo còi', goal: settings.cowHonks, unit: 'còi', sec: 25, block: true };
  else if (type === 'tree') e = { type, title: 'Cây thông đổ chắn ray!', hint: 'Tặng quà để thuê đội dọn cây', goal: settings.treeCoins, unit: 'xu', sec: 30, block: true };
  else { const q = QUIZ[Math.floor(Math.random() * QUIZ.length)]; e = { type: 'quiz', title: 'Đố vui Đà Lạt', q: q.q, a: q.a, ok: q.ok, hint: 'Bình luận A, B hoặc C', goal: 1, unit: '', sec: 20, block: false, answered: new Set() }; }
  Object.assign(e, { prog: 0, end: T + e.sec * 1000, helpers: {} });
  S.event = e;
  fx({ t: 'event', type: e.type });
  say(e.type === 'quiz' ? `Đố vui: ${e.q} A: ${e.a[0]}. B: ${e.a[1]}. C: ${e.a[2]}.` : `${e.title} ${e.hint}!`);
}
function helpEvent(user, n) {
  const e = S.event; if (!e || e.done) return;
  e.prog = Math.min(e.goal, e.prog + n);
  const h = e.helpers[user.id] || (e.helpers[user.id] = { name: user.name, n: 0 }); h.n += n;
  if (e.prog >= e.goal) endEvent(true, user);
}
function endEvent(win, user) {
  const e = S.event; if (!e) return;
  e.done = true;
  const best = Object.values(e.helpers).sort((a, b) => b.n - a.n)[0];
  const hero = e.type === 'quiz' ? (user && user.name) : best && best.name;
  if (win) S.boostEnd = Math.max(S.boostEnd, now()) + 10000;
  fx({ t: 'eventEnd', type: e.type, win, hero: hero || '' });
  const msg = {
    fog: win ? 'Đèn pha bật sáng, sương tan rồi!' : 'Sương đã tan dần, tàu chạy tiếp.',
    cow: win ? 'Còi vang inh ỏi, đàn bò đã tránh đường!' : 'Đàn bò thong thả đi qua, tàu chạy tiếp.',
    tree: win ? 'Đội công nhân đã dọn xong cây thông!' : 'Cây thông đã được dọn, tàu chạy tiếp.',
    quiz: win ? `Chính xác! Đáp án là ${'ABC'[e.ok]}, ${e.a && e.a[e.ok]}.` : `Hết giờ! Đáp án là ${'ABC'[e.ok]}, ${e.a && e.a[e.ok]}.`,
  }[e.type];
  say(msg + (win && hero ? ` Cảm ơn ${speakName(hero)}!` : ''));
  setTimeout(() => { if (S.event === e) S.event = null; }, 3500);
  S.nextEvent = now() + (settings.eventEvery * 1000) * (0.8 + Math.random() * 0.5);
}

// ---------------------------------------------------------------- giữ chân khách
// 🎫 vé may mắn: bốc thăm ngẫu nhiên một hành khách khi tàu đến ga Trại Mát (ai cũng có cơ hội, kể cả không tặng quà)
function drawLucky() {
  const list = [...pax.values()];
  if (!list.length) return;
  const w = list[Math.floor(Math.random() * list.length)];
  const spin = list.sort(() => Math.random() - 0.5).slice(0, 14).map(p => p.name);
  S.lucky = { name: w.name, avatar: w.avatar, code: code(0) };
  P.lucky.unshift({ name: w.name, code: code(0), day: today() }); P.lucky.length = Math.min(P.lucky.length, 30); writeJSON('state.json', P);
  fx({ t: 'lucky', name: w.name, avatar: w.avatar, spin, code: code(0) });
  setTimeout(() => say(`Xin chúc mừng ${speakName(w.name)} đã trúng vé may mắn của chuyến tàu ${spkCode(code(0))}!`), 3500);
}
// 🍓 hái dâu ở ga Trại Mát: bình luận "dâu" để hái, ai hái nhiều nhất được xướng tên
function startBerry(end) {
  S.berry = { end, n: new Map(), cd: new Map() };
  fx({ t: 'berryStart' });
  say('Ga Trại Mát có vườn dâu! Cả nhà bình luận chữ dâu để hái dâu nào, ai hái nhiều nhất sẽ được xướng tên!');
}
function berryTop(k) {
  if (!S.berry) return [];
  return [...S.berry.n.values()].sort((a, b) => b.n - a.n).slice(0, k).map(b => ({ name: b.name, n: b.n }));
}
function pickBerry(user) {
  const b = S.berry; if (!b || b.done) return;
  const T = now(); if (T - (b.cd.get(user.id) || 0) < 1200) return; b.cd.set(user.id, T); // chống spam
  const e = b.n.get(user.id) || { name: user.name, n: 0 }; e.n++; b.n.set(user.id, e);
  fx({ t: 'berry', name: user.name, n: e.n });
}
function endBerry() {
  const b = S.berry; if (!b) return; b.done = true;
  const top = berryTop(3);
  fx({ t: 'berryEnd', top });
  if (top.length) say(`${speakName(top[0].name)} hái được nhiều dâu nhất, ${top[0].n} giỏ! Cảm ơn cả nhà!`);
}
// ❤️ mục tiêu tim của chuyến: đủ tim thì pháo hoa + tàu chạy hết tốc lực
function addLikes(n) {
  S.likes = (S.likes || 0) + n;
  if (!S.goalHit && S.likes >= settings.likeGoal) {
    S.goalHit = true; S.boostEnd = Math.max(S.boostEnd, now()) + 20000; S.pressure = 120;
    fx({ t: 'goal', likes: S.likes });
    say(`Tuyệt vời! Cả tàu đã thả đủ ${settings.likeGoal} tim! Đoàn tàu chạy hết tốc lực, bắn pháo hoa nào!`);
  }
}

setPhase('board');

// ---------------------------------------------------------------- vòng lặp 10 lần / giây
let last = now();
setInterval(() => {
  const T = now(), dt = Math.min(0.5, (T - last) / 1000); last = T;
  rollDay();
  S.pressure = Math.max(0, S.pressure - dt * 1.6);
  if (S.phase === 'board' || S.phase === 'stop' || S.phase === 'finish') {
    S.speed = 0;
    // ga Trại Mát: còn 15 giây thì phát thanh tàu chiều về sắp chạy
    // phát thanh tàu sắp chuyển bánh: ~15 giây cuối (đọc xong là tàu lăn bánh), ngắt ngang câu khác để nói ngay
    if (S.phase === 'board' && !S.annDone && S.phaseEnd - T <= Math.min(15000, settings.boardSec * 1000 - 300)) { S.annDone = true; annDepart(0); }
    if (S.phase === 'stop' && !S.annDone && S.phaseEnd - T <= 15000) { S.annDone = true; annDepart(1); }
    if (S.phase === 'stop' && S.luckyAt && T >= S.luckyAt) { S.luckyAt = 0; drawLucky(); }
    if (S.phase === 'stop' && S.berryAt && T >= S.berryAt) { S.berryAt = 0; startBerry(S.phaseEnd - 800); }
    if (S.berry && !S.berry.done && T >= S.berry.end) endBerry();
    if (S.phase === 'board' && T >= S.nextCta && S.phaseEnd - T > 6000) { S.nextCta = T + 70000; say(pickFrom('cta', CTA)); }
    if (T >= S.phaseEnd) {
      if (S.phase === 'board') setPhase('run');
      else if (S.phase === 'stop') { S.leg = 1; setPhase('run'); }
      else setPhase('board');
    }
  } else if (S.phase === 'run') {
    const e = S.event;
    if (e && !e.done && T >= e.end) endEvent(false);
    let target = 8 + Math.min(100, S.pressure) * 0.24;          // 8 → 32 km/h
    if (T < S.boostEnd) target += 14;                              // tăng tốc nhờ quà
    if (S.km > HILL[0] && S.km < HILL[1]) target *= 0.55 + Math.min(100, S.pressure) / 250; // leo dốc
    if (e && !e.done && e.type === 'fog') target = Math.min(target, 9);
    if (e && !e.done && e.block) target = 0;
    const d = distLeft();
    if (d < 0.35) target = Math.min(target, 3 + d * 80);          // vào ga thì hãm dần
    S.speed += (target - S.speed) * Math.min(1, dt * (target < S.speed ? 1.6 : 0.7));
    S.km += (S.leg === 0 ? 1 : -1) * S.speed / 3600 * settings.timeX * dt;
    S.km = Math.max(0, Math.min(ROUTE_KM, S.km));
    // cảnh dọc đường
    const sg = SIGHTS[S.sightIdx];
    if (sg && (S.leg === 0 ? S.km >= sg.km : S.km <= sg.km)) {
      fx({ t: 'sight', name: sg.name }); if (!S.event) say(sg.say, 'guide');
      S.sightIdx += S.leg === 0 ? 1 : -1;
    }
    // thuyết minh suốt chặng (đang có sự kiện thì đợi xong mới đọc)
    const gl = settings.guide && GUIDE[S.leg][S.guideIdx];
    const evOn = S.event && !S.event.done;
    if (gl && (S.leg === 0 ? S.km >= gl.km : S.km <= gl.km) && !evOn) { say(gl.text, 'guide'); S.guideIdx++; S.nextFact = Math.max(S.nextFact, T + 18000); }
    // giữa các mốc: bốc ngẫu nhiên một câu thuyết minh / thỉnh thoảng một lời mời tương tác
    else if (settings.guide && !evOn && T >= S.nextFact && d > 0.5) {
      S.nextFact = T + (settings.factEvery || 22) * 1000 * (0.85 + Math.random() * 0.4);
      if (T >= S.nextCta) { S.nextCta = T + 70000; say(pickFrom('cta', CTA)); }
      else say(pickFrom('facts', FACTS), 'guide');
    }
    if (settings.events && !S.event && T >= S.nextEvent && d > 0.8 && !(S.km > HILL[0] - 0.2 && S.km < HILL[1])) {
      const types = ['fog', 'cow', 'tree', 'quiz', 'quiz'];
      startEvent(types[Math.floor(Math.random() * types.length)]);
    }
    if (d <= 0.002 && S.speed < 6) { S.km = S.leg === 0 ? ROUTE_KM : 0; setPhase(S.leg === 0 ? 'stop' : 'finish'); }
  }
}, 100);

function snapshot() {
  const T = now(), e = S.event;
  return {
    ph: S.phase, left: S.phaseEnd ? Math.max(0, S.phaseEnd - T) : 0, trip: P.tripNo, leg: S.leg, legName: legName(),
    code: code(S.leg), nextCode: code(1), night: !!S.night,
    dep: TIMETABLE[ttIdx(S.leg)][0], arr: TIMETABLE[ttIdx(S.leg)][1], nextDep: TIMETABLE[ttIdx(1)][0], tt: ttIdx(S.leg),
    clock: gameClock(), skyClock: skyClock(), view3d: settings.view3d !== false,
    likes: S.likes || 0, likeGoal: settings.likeGoal, goalHit: !!S.goalHit,
    berry: S.berry && { left: Math.max(0, S.berry.end - T), top: berryTop(3) },
    km: S.km, sp: S.speed, pr: Math.min(100, S.pressure), boost: Math.max(0, S.boostEnd - T), timeX: settings.timeX,
    hill: S.km > HILL[0] && S.km < HILL[1],
    ev: e && { type: e.type, title: e.title, hint: e.hint, q: e.q, a: e.a, ok: e.done ? e.ok : undefined, prog: e.prog, goal: e.goal, unit: e.unit, left: Math.max(0, e.end - T), sec: e.sec, done: !!e.done, block: e.block },
    title: settings.title, vol: settings.vol, tts: settings.tts, voice: settings.voice, rate: settings.rate, annVoice: settings.annVoice, guideVoice: settings.guideVoice,
  };
}
setInterval(() => {
  io.emit('s', snapshot());
  if (rosterDirty) { rosterDirty = false; io.emit('roster', roster()); }
}, 200);

// ---------------------------------------------------------------- tương tác người xem
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
let lastGreet = 0, lastHorn = 0;
function getPax(user, quiet) {
  let p = pax.get(user.id);
  if (!p) {
    // xếp chỗ xen kẽ toa ngồi cứng / ngồi mềm
    const seat = (S.seatFlip = !S.seatFlip) ? 'cung' : 'mem';
    p = { id: user.id, name: user.name, avatar: user.avatar, coins: 0, likes: 0, t: now(), seat, car: null, si: -1 };
    pax.set(user.id, p); touch();
    if (!placePax(p)) { // toa ngồi cứng + ngồi mềm đều hết chỗ
      fx({ t: 'soldout', name: user.name });
      if (now() - (S.soldSaid || 0) > 25000) { S.soldSaid = now(); say('Toa ngồi cứng và ngồi mềm đã hết vé rồi! Tặng quà từ 10 xu để được mời lên toa VIP nhé!'); }
      return p;
    }
    // khách quen: đếm số chuyến đã đi (lưu qua các buổi live)
    const rd = P.riders[user.id] || (P.riders[user.id] = { name: user.name, rides: 0 });
    rd.rides++; rd.name = user.name; rd.last = today(); p.rides = rd.rides; ridersDirty = true;
    fx({ t: 'board', id: p.id, name: user.name, avatar: user.avatar, n: pax.size, seat: CLS_NAME[carCls(p.car)], car: p.car, si: p.si, rides: rd.rides, code: code(S.phase === 'stop' ? 1 : S.leg), pass: passInfo(p) });
    if (!quiet && now() - lastGreet > 12000 && !(S.event && !S.event.done)) {
      lastGreet = now();
      if (rd.rides >= 2 && Math.random() < 0.7) say(rd.rides >= 10 ? `Chào mừng hành khách thân thiết ${speakName(user.name)}, chuyến thứ ${rd.rides} rồi đó!` : `Chào khách quen ${speakName(user.name)} quay lại đi tàu, chuyến thứ ${rd.rides}!`);
      else say(`Chào ${speakName(user.name)} đã lên ${CAR_SPOKEN[p.car] || CLS_NAME[carCls(p.car)]}!`);
    }
  } else {
    if (user.avatar && !p.avatar) { p.avatar = user.avatar; touch(); }
    if (now() - p.t > 20000) { p.t = now(); touch(); }
  }
  return p;
}
function onChat(user, text) {
  const p = getPax(user), n = norm(text);
  S.pressure = Math.min(120, S.pressure + 2);
  if (S.berry && /\bdau\b/.test(n)) pickBerry(user);
  const e = S.event;
  if (/\btu ?tu\b|\btuu+\b/.test(n)) {
    if (now() - lastHorn > 2500) { lastHorn = now(); fx({ t: 'horn', name: user.name }); }
    if (e && !e.done && e.type === 'cow') helpEvent(user, 1);
  }
  if (e && !e.done && e.type === 'quiz' && /^[abc]$/.test(n) && !e.answered.has(user.id)) {
    e.answered.add(user.id);
    if ('abc'.indexOf(n) === e.ok) { e.helpers[user.id] = { name: user.name, n: 1 }; e.prog = 1; endEvent(true, user); }
  }
  fx({ t: 'chat', name: user.name, text: String(text).slice(0, 60) });
  return p;
}
function onLike(user, n) {
  const p = getPax(user, true); p.likes += n;
  S.pressure = Math.min(120, S.pressure + n * settings.likePow);
  addLikes(n);
  const e = S.event; if (e && !e.done && e.type === 'fog') helpEvent(user, n);
  fx({ t: 'like', n: Math.min(n, 15), avatar: user.avatar });
}
function onGift(user, gift, n) {
  const p = getPax(user, true), coins = Math.max(0, gift.diamonds) * n, before = clsOf(p);
  p.coins += coins; p.t = now();
  S.pressure = Math.min(120, S.pressure + 10 + coins * 4);
  S.boostEnd = Math.max(S.boostEnd, now()) + Math.min(60000, 4000 + coins * 1500);
  const top = P.top[user.id] || (P.top[user.id] = { name: user.name, avatar: user.avatar, coins: 0 });
  top.coins += coins; top.name = user.name; if (user.avatar) top.avatar = user.avatar;
  writeJSON('state.json', P);
  // nâng hạng ghế: ngồi cứng → ngồi mềm → VIP → Lareine
  placePax(p);
  const cls = p.car ? carCls(p.car) : clsOf(p), upgraded = cls !== before && !!p.car;
  touch();
  const e = S.event; if (e && !e.done && e.type === 'tree') helpEvent(user, Math.max(1, coins));
  fx({ t: 'gift', name: user.name, avatar: user.avatar, gift: gift.name, img: gift.img, n, coins, total: p.coins, cls, upgraded });
  if (upgraded) fx({ t: 'pass', pass: { ...passInfo(p), upgrade: true } }); // đổi vé lên toa VIP / Lareine
  const nm = speakName(user.name);
  if (coins >= 500) say(`Ôi trời! ${nm} tặng ${gift.name}! Mời ${nm} vào toa La Reine sang trọng nhất đoàn tàu! Cảm ơn bạn rất nhiều!`);
  else if (upgraded && cls === 'lareine') say(`Tuyệt vời! ${nm} tặng ${gift.name}, mời lên toa La Reine sang trọng!`);
  else if (upgraded && cls === 'vip') say(`Cảm ơn ${nm}! Mời bạn sang ngồi ${CAR_SPOKEN[p.car] || 'toa VIP'}!`);
  else if (coins >= 100) say(`Cảm ơn ${nm} đã tặng ${gift.name}!`);
}
function onSocial(user, kind) {
  const p = getPax(user, true);
  if (!p.soft) { p.soft = true; placePax(p); touch(); } // follow / share → được lên toa ngồi mềm
  S.pressure = Math.min(120, S.pressure + 12);
  fx({ t: kind, name: user.name, avatar: user.avatar });
  if (now() - lastGreet > 8000) { lastGreet = now(); say(kind === 'follow' ? `Cảm ơn ${speakName(user.name)} đã theo dõi kênh!` : `Cảm ơn ${speakName(user.name)} đã chia sẻ chuyến tàu!`); }
}
function onMember(user) { fx({ t: 'member', name: user.name }); }

// ---------------------------------------------------------------- TikTok
let TikTok = null; try { TikTok = require('tiktok-live-connector'); } catch (e) { console.error('Thiếu tiktok-live-connector:', e.message); }
let conn = null, manualStop = true, reTimer = null, reDelay = 15000, lastTry = 0;
const tk = { state: 'idle', text: 'Chưa kết nối' };
const stats = { comments: 0, likes: 0, gifts: 0, coins: 0, viewers: 0 };
const adminState = () => ({ lan: lanUrls(), voices: vieneu.status().voices, ttsInfo: vieneu.status(), tk, stats, settings: { ...settings, apiKey: undefined, hasKey: !!settings.apiKey }, demo: !!demoTimer, port: PORT, trip: P.tripNo, phase: S.phase, top: Object.values(P.top).sort((a, b) => b.coins - a.coins).slice(0, 10),
  riders: Object.values(P.riders).sort((a, b) => b.rides - a.rides).slice(0, 10), lucky: P.lucky.slice(0, 8),
  screens: screens.map((x, i) => ({ n: i + 1, id: x.id, obs: x.obs, local: x.local, voice: x.id === voiceId })) });
const pushAdmin = () => io.to('admin').emit('admin', adminState());
setInterval(pushAdmin, 2000);
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
    name: clean(u.nickname, 22) || clean(handle, 22) || 'Khách',
    avatar: findUrl(u.profilePicture) || findUrl(u.avatarThumb) || findUrl(u.avatarMedium) || u.profilePictureUrl || '',
  };
}
const streaks = new Map();
function handleGift(d) {
  const user = pickUser(d), det = d.giftDetails || d.gift || {}, ext = d.extendedGiftInfo || {};
  const gift = {
    name: clean(det.giftName || ext.name || det.name || 'quà', 30),
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
  const wait = 20000 - (now() - lastTry);
  if (wait > 0) { setTk('connecting', `Đợi ${Math.ceil(wait / 1000)} giây rồi kết nối…`); reTimer = setTimeout(connectTikTok, wait); return; }
  lastTry = now();
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

// ---------------------------------------------------------------- demo: người xem giả để xem thử
let demoTimer = null, botSeq = 0;
const BOT_NAMES = 'Linh Minh Khoa Hà Trang Tuấn Nhi Phúc Vy Long Mai Hưng Thảo Bảo An Quân Ngọc Duy Hằng Sơn Yến Nam Thư Đạt Hoa Kiên Lan Tú Châu Phát'.split(' ');
const bots = [];
function demoTick() {
  const r = Math.random();
  if (bots.length < 60 && (r < 0.08 || bots.length < 5)) {
    const b = { id: 'bot' + (++botSeq), name: BOT_NAMES[botSeq % BOT_NAMES.length] + (botSeq > 30 ? ' ' + botSeq : ''), avatar: '' };
    bots.push(b); return onChat(b, ['lên tàu', 'chào cả nhà', 'Đà Lạt đẹp quá', 'tu tu'][Math.floor(Math.random() * 4)]);
  }
  if (!bots.length) return;
  const b = bots[Math.floor(Math.random() * bots.length)], e = S.event;
  if (e && !e.done && e.type === 'quiz' && Math.random() < 0.25) return onChat(b, 'abc'[Math.floor(Math.random() * 3)]);
  if (e && !e.done && e.type === 'cow' && Math.random() < 0.3) return onChat(b, 'tu tu');
  if (S.berry && !S.berry.done && Math.random() < 0.4) return onChat(b, 'dâu');
  if (r < 0.62) onLike(b, 1 + Math.floor(Math.random() * 15));
  else if (r < 0.88) onChat(b, ['đi nhanh lên', 'tu tu', 'lạnh quá', 'đẹp ghê', 'yêu Đà Lạt'][Math.floor(Math.random() * 5)]);
  else if (r < 0.975) { const d = [1, 1, 1, 1, 5, 5, 10, 30, 99, 500][Math.floor(Math.random() * 10)]; onGift(b, { name: d >= 500 ? 'Sư tử' : d >= 99 ? 'Xe thể thao' : d >= 10 ? 'Bánh donut' : 'Hoa hồng', diamonds: d, img: '' }, 1); }
  else onSocial(b, Math.random() < 0.5 ? 'follow' : 'share');
  if (Math.random() < 0.02) onMember({ id: 'g' + Math.floor(Math.random() * 999), name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)], avatar: '' });
}
function setDemo(on) { clearInterval(demoTimer); demoTimer = on ? setInterval(demoTick, 260) : null; pushAdmin(); }

// ---------------------------------------------------------------- socket
const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
// ---- chỉ MỘT màn hình LIVE được phát tiếng (giọng MC, phát thanh, tiếng tàu, nhạc) để các giọng không đè lên nhau
// khi mở màn hình ở nhiều nơi (OBS + cửa sổ trình duyệt + LIVE Studio). Ưu tiên màn hình OBS (?obs=1), rồi màn hình mở trước.
const screens = []; // { id, obs, local, at }
let voiceId = null, voicePin = null; // voicePin: màn hình được chọn tay ở trang điều khiển
function electVoice() {
  const pinned = voicePin && screens.find(x => x.id === voicePin);
  const pick = pinned || screens.find(x => x.obs) || screens[0];
  const id = pick ? pick.id : null;
  if (id !== voiceId) { voiceId = id; console.log('[Âm thanh] Màn hình phát tiếng:', pick ? (pick.obs ? 'OBS / LIVE' : 'trình duyệt') + (pick.local ? '' : ' (máy khác trong mạng)') : 'chưa có'); }
  io.emit('voiceMaster', voiceId); pushAdmin();
}
io.on('connection', s => {
  s.emit('s', snapshot()); s.emit('roster', roster());
  s.on('screen:hello', d => {
    if (screens.some(x => x.id === s.id)) return;
    screens.push({ id: s.id, obs: !!(d && d.obs), force: !!(d && d.force), local: isLocal(s.handshake.address), at: now() });
    if (d && d.force) voicePin = s.id; // ?voice=1: màn hình này luôn phát tiếng
    electVoice();
  });
  s.on('disconnect', () => { const i = screens.findIndex(x => x.id === s.id); if (i >= 0) { screens.splice(i, 1); if (voicePin === s.id) voicePin = null; electVoice(); } });
  s.emit('voiceMaster', voiceId);
  if (!isLocal(s.handshake.address)) return; // máy khác trong LAN chỉ xem được màn hình game
  s.on('admin:hello', () => { s.join('admin'); s.emit('admin', adminState()); });
  s.on('admin:voiceScreen', id => { if (screens.some(x => x.id === id)) { voicePin = id; electVoice(); } });
  s.on('admin:connect', d => {
    settings.username = clean(d && d.username, 40).replace(/^@/, '');
    if (d && typeof d.apiKey === 'string' && d.apiKey.trim()) settings.apiKey = d.apiKey.trim();
    saveSettings(); lastTry = 0; connectTikTok();
  });
  s.on('admin:disconnect', disconnectTikTok);
  s.on('admin:cfg', d => {
    if (!d || typeof d !== 'object') return;
    const R = { factEvery: [8, 120], likeGoal: [50, 1000000], rate: [0.7, 1.5], timeX: [1, 30], boardSec: [5, 300], stopSec: [5, 300], finishSec: [5, 120], eventEvery: [15, 600], fogLikes: [10, 100000], cowHonks: [1, 500], treeCoins: [1, 100000], likePow: [0.05, 10] };
    for (const [k, v] of Object.entries(d)) {
      if (R[k]) settings[k] = num(v, R[k][0], R[k][1], settings[k]);
      else if ((k === 'annVoice' || k === 'guideVoice') && typeof v === 'string') settings[k] = clean(v, 64);
      else if (k === 'guide') settings.guide = !!v;
      else if (k === 'events' || k === 'tts') { settings[k] = !!v; if (k === 'tts') vieneu.setWanted(settings.tts); }
      else if (k === 'voice' && typeof v === 'string') settings.voice = clean(v, 64);
      else if (k === 'trainMode' && ['auto', 'day', 'night', 'alt'].includes(v)) { settings.trainMode = v; if (S.phase === 'board') S.night = isNightTrip(); }
      else if (k === 'title') settings.title = clean(v, 40) || DEF.title;
      else if (/^vol\.(sfx|voice|music)$/.test(k)) settings.vol[k.slice(4)] = num(v, 0, 100, 50);
      else if (/^cap\.(lareine|vip|mem|cung)$/.test(k)) { settings.cap[k.slice(4)] = num(v, 1, 80, 20); touch(); }
      else if (k === 'view3d') settings.view3d = !!v;
    }
    saveSettings(); pushAdmin();
  });
  s.on('admin:testAnn', () => annDepart(S.leg));
  s.on('admin:lucky', () => drawLucky());
  s.on('admin:berry', () => { if (!S.berry || S.berry.done) startBerry(now() + 20000); });
  s.on('admin:fact', () => say(pickFrom('facts', FACTS), 'guide'));
  s.on('admin:photo', () => { // thử chụp ảnh lưu niệm ngay (không đổi giai đoạn chuyến tàu)
    const photo = [...pax.values()].sort((a, b) => b.coins - a.coins || b.t - a.t).slice(0, 18).map(p => ({ name: p.name, avatar: p.avatar }));
    fx({ t: 'photo', codes: code(0) + ' / ' + code(1), total: pax.size, top: photo.slice(0, 1), photo });
  });
  s.on('admin:testGuide', () => say(GUIDE[0][0].text, 'guide'));
  s.on('admin:say', t => { const text = clean(t, 200); if (text) say(text); });
  s.on('admin:demo', on => setDemo(!!on));
  s.on('admin:event', type => { if (S.phase === 'run' && ['fog', 'cow', 'tree', 'quiz'].includes(type)) { S.event = null; startEvent(type); } });
  s.on('admin:skip', () => { // sang giai đoạn kế tiếp
    if (S.phase === 'run') { S.km = S.leg === 0 ? ROUTE_KM : 0; setPhase(S.leg === 0 ? 'stop' : 'finish'); }
    else S.phaseEnd = now();
  });
  s.on('admin:reset', () => setPhase('board'));
  s.on('admin:resetTop', () => { P.top = {}; writeJSON('state.json', P); pushAdmin(); });
  s.on('admin:sim', d => { // thử tương tác không cần LIVE
    if (!d) return;
    const id = clean(d.name, 22) || 'Khách thử', u = { id: 'sim:' + id, name: id, avatar: '' };
    if (d.kind === 'chat') onChat(u, clean(d.text, 120) || 'lên tàu');
    else if (d.kind === 'like') onLike(u, num(d.n, 1, 1000, 20));
    else if (d.kind === 'gift') onGift(u, { name: clean(d.gift, 30) || 'Quà', diamonds: num(d.coins, 1, 50000, 1), img: '' }, 1);
    else if (d.kind === 'follow' || d.kind === 'share') onSocial(u, d.kind);
  });
});

server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? `Cổng ${PORT} đang bị chiếm — game có thể đã mở sẵn.` : e); process.exit(1); });
server.listen(PORT, HOST, () => {
  console.log(`\n  TÀU ĐÀ LẠT – TRẠI MÁT đang chạy`);
  console.log(`  Màn hình LIVE (OBS 1080x1920): http://127.0.0.1:${PORT}/live.html?obs=1`);
  console.log(`  Trang điều khiển:              http://127.0.0.1:${PORT}/admin.html\n`);
  if (process.env.DEMO === '1') setDemo(true);
  vieneu.setWanted(settings.tts); // bật MC giọng AI VieNeu-TTS (lần đầu có thể mất vài phút)
  if (settings.username && process.env.AUTOCONNECT !== '0') connectTikTok();
});
