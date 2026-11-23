// Ngọn Đèn Cuối Cùng — game kể chuyện ma TikTok LIVE (canvas 2D 1080×1920)
(() => {
  'use strict';
  const W = 1080, H = 1920, TAU = Math.PI * 2;
  const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
  const SERIF = '"Times New Roman", Georgia, serif';
  const params = new URLSearchParams(location.search);
  const OBS = params.has('obs');
  const cv = document.getElementById('c'), ctx = cv.getContext('2d');
  cv.width = W; cv.height = H;
  function fit() { const k = Math.min(innerWidth / W, innerHeight / H); for (const c of [cv, document.getElementById('gl')]) if (c) { c.style.width = W * k + 'px'; c.style.height = H * k + 'px'; } }
  addEventListener('resize', fit); fit();

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const now = () => performance.now() / 1000;
  const deacc = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  const low = s => deacc(s).toLowerCase();
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  const speakable = s => String(s || '').replace(/\p{Extended_Pictographic}|[\u{1F000}-\u{1FAFF}☀-➿️‍]/gu, ' ').replace(/[_*#~^|<>{}\[\]\\]/g, ' ').replace(/\s+/g, ' ').trim();
  const short = (s, n) => { s = String(s || ''); const a = [...s]; return a.length > n ? a.slice(0, n - 1).join('') + '…' : s; };

  const S = Object.assign({}, window.MA_DEFAULTS);
  const ACTIONS = window.MA_ACTIONS;
  const STORIES = window.MA_STORIES || [];
  let GIFTS = {}, TOP = [], BRAVE_TOP = [], viewersOnline = 0, isPrimary = true;

  // ======================================================================
  // ảnh đại diện
  // ======================================================================
  const imgCache = new Map();
  function loadImg(url, cb) {
    if (!url) return null;
    let e = imgCache.get(url);
    if (!e) {
      e = { img: new Image(), ok: false, cbs: [] };
      e.img.referrerPolicy = 'no-referrer';
      e.img.onload = () => { e.ok = true; for (const f of e.cbs) f(e.img); e.cbs = []; };
      e.img.src = /^https?:\/\//i.test(url) ? '/api/img?u=' + encodeURIComponent(url) : url;
      imgCache.set(url, e);
      if (imgCache.size > 600) imgCache.delete(imgCache.keys().next().value);
    }
    if (e.ok) return e.img;
    if (cb) e.cbs.push(cb);
    return null;
  }

  // ======================================================================
  // ghế quanh đèn dầu
  // ======================================================================
  let LX = 540, LY = 1185; const LAMP = 1.45;   // vị trí đống lửa trên màn hình (cảnh 3D đổi theo bố cục)
  const SEATS = [];
  (function buildSeats() {
    const rings = [[225, 9], [335, 14], [445, 20], [548, 25], [645, 30]];
    rings.forEach(([r, n], ri) => {
      const list = [];
      for (let k = 0; k < n; k++) {
        const a = Math.PI / 2 + (k + (ri % 2 ? 0 : 0.5)) / n * TAU;
        const sn = Math.sin(a);
        const x = LX + r * Math.cos(a), y = LY + r * sn * (sn < 0 ? 0.34 : 0.55);
        if (x < 62 || x > W - 62) continue;
        if (ri <= 1 && y > LY && Math.abs(x - LX) < 110) continue;   // không che ngọn đèn
        list.push({ x, y, ring: ri });
      }
      list.sort((p, q) => q.y - p.y);
      SEATS.push(...list);
    });
    SEATS.forEach((s, i) => { s.n = i + 1; s.sc = 0.62 + (s.y - 960) / 580 * 0.52; s.v = null; });
  })();
  const SEAT2D = SEATS.map(s => ({ x: s.x, y: s.y, sc: s.sc, ring: s.ring }));
  // cảnh 3D đặt lại chỗ ngồi theo đồ vật trong cảnh (khúc gỗ, bậc đá…); list = null → về bố cục 2D
  function setLayout(list, fire) {
    if (!list) { SEATS.forEach((s, i) => { Object.assign(s, SEAT2D[i]); s.zone = null; s.w = null; s.pose = null; s.face = null; }); LX = 540; LY = 1185; return; }
    list.forEach((p, i) => { if (SEATS[i]) Object.assign(SEATS[i], p); });
    LX = fire.x; LY = fire.y;
  }
  // ghế bị bảng "Tặng quà để…" che thì không xếp người vào
  const seatHidden = s => S.showGiftGuide && s.x > 680 && s.y > 1430;
  const seatByN = n => SEATS[n - 1];
  const RING_NAMES = ['vòng trong cùng (sát đống lửa)', 'vòng thứ hai', 'vòng thứ ba', 'vòng thứ tư', 'vòng ngoài cùng'];

  // ======================================================================
  // người xem ngồi quanh đèn
  // ======================================================================
  const viewers = new Map();   // id -> v (đang có ghế)
  const waiting = new Map();   // id -> user (chờ ghế)
  const coinsOf = new Map();   // id -> tổng xu đêm nay
  let thayId = null;           // người làm lễ trừ tà gần nhất
  let lastJoiner = null;
  const braveDelta = new Map();

  function seatsLimit() { return clamp(Math.round(S.maxSeats) || 70, 7, SEATS.length); }
  function freeSeat() {
    let n = 0;
    for (const s of SEATS) { if (seatHidden(s)) continue; if (++n > seatsLimit()) break; if (!s.v) return s; }
    return null;
  }
  function seated() { return [...viewers.values()].filter(v => !v.leaving); }
  function alive() { return seated().filter(v => !v.taken); }
  function isThay(v) { return !!v && v.id === thayName().id; }

  function userTouch(user, how) {
    if (!user || !user.id) return null;
    let v = viewers.get(user.id);
    const t = now();
    if (v) {
      v.name = user.name || v.name;
      if (user.avatar && user.avatar !== v.avatar) { v.avatar = user.avatar; makeSprite(v); }
      v.active = t;
      if (v.leaving) { v.leaving = false; v.alpha = Math.max(v.alpha, 0.2); }
      return v;
    }
    if (how === 'like' && !S.joinOnLike) return null;
    const seat = freeSeat();
    if (!seat) { waiting.set(user.id, { ...user, t }); return null; }
    waiting.delete(user.id);
    v = {
      id: user.id, name: user.name || 'Khách', avatar: user.avatar || '', seat, x: seat.x, y: seat.y,
      joined: t, active: t, brave: 0, taken: false, alpha: 0, glow: 0, shiver: 0, jump: 0, laugh: 0,
      bubble: null, incense: 0, prayAt: -99, prayBraveAt: -99, hit: 0, eyes: 0, anim: null, rescue: new Set(),
    };
    seat.v = v; viewers.set(v.id, v); makeSprite(v);
    lastJoiner = v.name;
    joinToasts.push(v.name);
    return v;
  }
  function removeViewer(v) {
    if (v.seat) v.seat.v = null;
    viewers.delete(v.id);
    // ghế trống → mời người đang chờ
    if (waiting.size) {
      const best = [...waiting.values()].sort((a, b) => b.t - a.t)[0];
      waiting.delete(best.id);
      if (now() - best.t < S.idleSeconds) userTouch(best, 'chat');
    }
  }
  function idleSweep() {
    const t = now();
    for (const v of viewers.values()) {
      if (!v.leaving && t - v.active > S.idleSeconds && !(ev && (ev.target === v || ev.holder === v))) v.leaving = true;
    }
    for (const [id, u] of waiting) if (t - u.t > S.idleSeconds) waiting.delete(id);
  }

  function makeSprite(v) {
    const c = v.spr || (v.spr = document.createElement('canvas'));
    c.width = 120; c.height = 150;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 120, 150);
    const h = hash(v.id);
    const hue = h % 360, hue2 = (h >> 9) % 360;
    const shirt = `hsl(${hue},${30 + (h >> 4) % 30}%,${26 + (h >> 12) % 16}%)`;
    const pants = `hsl(${hue2},${18 + (h >> 6) % 20}%,${14 + (h >> 14) % 10}%)`;
    const skin = ['#e9c4a2', '#dcae88', '#c9966f', '#f1d2b6'][(h >> 3) % 4];
    // bóng
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(60, 138, 50, 9, 0, 0, TAU); g.fill();
    // chân (ngồi bó gối)
    g.fillStyle = pants; g.beginPath(); g.ellipse(60, 126, 46, 17, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(38, 116, 15, 16, 0, 0, TAU); g.ellipse(82, 116, 15, 16, 0, 0, TAU); g.fill();
    // thân
    const grd = g.createLinearGradient(0, 70, 0, 125);
    grd.addColorStop(0, shirt); grd.addColorStop(1, 'rgba(0,0,0,.9)');
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(30, 122); g.quadraticCurveTo(26, 84, 44, 76); g.lineTo(76, 76); g.quadraticCurveTo(94, 84, 90, 122); g.closePath(); g.fill();
    // tay ôm gối
    g.strokeStyle = shirt; g.lineCap = 'round'; g.lineWidth = 13;
    g.beginPath(); g.moveTo(36, 86); g.quadraticCurveTo(24, 108, 44, 114); g.stroke();
    g.beginPath(); g.moveTo(84, 86); g.quadraticCurveTo(96, 108, 76, 114); g.stroke();
    g.fillStyle = skin; g.beginPath(); g.arc(48, 113, 6.5, 0, TAU); g.arc(72, 113, 6.5, 0, TAU); g.fill();
    // cổ
    g.fillStyle = skin; g.fillRect(53, 68, 14, 12);
    // đầu = ảnh đại diện
    const im = loadImg(v.avatar, () => makeSprite(v));
    g.save(); g.beginPath(); g.arc(60, 42, 32, 0, TAU); g.closePath(); g.clip();
    if (im) { try { g.drawImage(im, 28, 10, 64, 64); } catch (e) { im2(); } }
    else im2();
    function im2() {
      const gg = g.createRadialGradient(52, 32, 4, 60, 42, 34);
      gg.addColorStop(0, `hsl(${hue},45%,58%)`); gg.addColorStop(1, `hsl(${hue},45%,30%)`);
      g.fillStyle = gg; g.fillRect(28, 10, 64, 64);
      g.fillStyle = '#fff'; g.font = `700 30px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(([...String(v.name).replace(/[^\p{L}\p{N}]/gu, '')][0] || '?').toUpperCase(), 60, 44);
    }
    g.restore();
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,236,200,.85)'; g.beginPath(); g.arc(60, 42, 32, 0, TAU); g.stroke();
    v.nameShort = short(v.name, 11);
    ctx.font = `700 22px ${FONT}`; v.nameW = ctx.measureText(v.nameShort).width;
  }

  function addBrave(v, n) {
    if (!v || !n) return;
    v.brave += n;
    const d = braveDelta.get(v.id) || { id: v.id, name: v.name, avatar: v.avatar, add: 0 };
    d.name = v.name; d.avatar = v.avatar; d.add += n; braveDelta.set(v.id, d);
  }
  const braveSession = new Map();   // id -> {name, pts} kể cả người đã rời ghế
  function braveTop(n) {
    for (const v of viewers.values()) braveSession.set(v.id, { name: v.name, pts: v.brave });
    return [...braveSession.values()].filter(x => x.pts > 0).sort((a, b) => b.pts - a.pts).slice(0, n);
  }

  // ======================================================================
  // đồng hồ đo: dầu đèn, âm khí
  // ======================================================================
  let oil = 80, yin = 10;
  let lampFlick = 1;

  // ======================================================================
  // thông báo nhỏ, chữ lớn, hạt
  // ======================================================================
  const toasts = [];        // {text, color, t0}
  const joinToasts = [];
  let banner = null;        // {text, sub, color, t0, dur}
  const particles = [];
  const floats = [];        // chữ bay
  const whispers = [];      // lời người trong gương
  let shake = 0, flash = 0, flashColor = '255,255,255';
  let jumpscare = null;     // {t0, dur, big}
  let doorShake = 0, windowShadow = null;
  function toast(text, color = '#ffe0b0') { toasts.push({ text, color, t0: null }); while (toasts.length > 3) { const i = toasts.findIndex(x => !x.t0); toasts.splice(i < 0 ? 0 : i, 1); } }
  function showBanner(text, sub = '', color = '#ff5a4a', dur = 3.2) { banner = { text, sub, color, t0: now(), dur }; }
  function spark(x, y, n, color, spread = 60, up = 80, size = 3, life = 1.2) {
    for (let i = 0; i < n; i++) particles.push({ x: x + rand(-spread, spread) * 0.3, y: y + rand(-10, 10), vx: rand(-spread, spread), vy: -rand(up * 0.4, up), life: rand(life * 0.6, life), max: life, color, size: rand(size * 0.6, size * 1.3), g: 40 });
  }
  function floatText(text, x, y, color = '#ffd27a', size = 30) { floats.push({ text, x, y, color, size, t0: now() }); }

  // ======================================================================
  // giọng kể
  // ======================================================================
  // VieNeu-TTS (qua máy chủ game → cầu nối Python), không được thì dùng giọng trình duyệt
  const VN = { q: [], playing: false, cache: new Map(), fails: 0, downUntil: 0 };
  const vnKey = t => (S.vnVoice || '') + '|' + t;
  function vnFetch(text) {
    const k = vnKey(text);
    let p = VN.cache.get(k);
    if (!p) {
      p = fetch('/api/ma-tts?text=' + encodeURIComponent(text) + '&voice=' + encodeURIComponent(S.vnVoice || ''))
        .then(r => { if (!r.ok) throw new Error('tts ' + r.status); return r.arrayBuffer(); })
        .then(b => MaAudio.decode(b));
      p.catch(() => VN.cache.delete(k));
      VN.cache.set(k, p);
      if (VN.cache.size > 40) VN.cache.delete(VN.cache.keys().next().value);
    }
    return p;
  }
  const vnReady = () => S.ttsEngine === 'vieneu' && window.MaAudio && MaAudio.ctx && MaAudio.ctx.state === 'running' && now() > VN.downUntil;
  function vnPrefetch(text) { const t = speakable(text); if (t && vnReady()) vnFetch(t).catch(() => {}); }
  async function vnPump() {
    if (VN.playing || !VN.q.length) return;
    const it = VN.q.shift();
    VN.playing = true;
    try {
      const buf = await vnFetch(it.text);
      VN.fails = 0;
      await MaAudio.playVoice(buf, +S.voiceScary, +S.ttsVolume || 1);
    } catch (e) {
      // cầu nối VieNeu chưa chạy → nghỉ 60 giây, đọc bằng giọng trình duyệt
      if (++VN.fails >= 2) VN.downUntil = now() + 60;
      browserSay(it.text, it.prio);
    }
    VN.playing = false;
    vnPump();
  }
  function browserSay(t, prio) {
    const local = window.MC && MC.available() && MC.hasVietnamese() && (!S.ttsVoice || MC.list().includes(S.ttsVoice));
    if (S.ttsWhere === 'game' && local) { MC.say(t, prio); return; }
    if (isPrimary) socket.emit('ma:say', { text: t, prio: !!prio });
  }
  function narrate(text, prio) {
    if (!S.tts) return;
    const t = speakable(text);
    if (!t) return;
    if (vnReady()) {
      if (prio) VN.q.unshift({ text: t, prio }); else VN.q.push({ text: t, prio });
      if (VN.q.length > 5) VN.q.splice(prio ? 5 : 0, VN.q.length - 5);
      vnPump();
      return;
    }
    browserSay(t, prio);
  }
  const narrating = () => VN.playing || VN.q.length > 0;
  function applyTTS() {
    if (!window.MC) return;
    MC.enabled = !!S.tts; MC.rate = +S.ttsRate || 0.92; MC.volume = +S.ttsVolume || 1; MC.setPref(S.ttsVoice || '');
    MC.pitch = [1, 0.85, 0.72, 0.6][+S.voiceScary | 0] || 1;   // giọng trình duyệt: chỉ hạ được cao độ
  }

  // ======================================================================
  // âm thanh
  // ======================================================================
  const sfx = (name, v = 1, delay = 0) => { if (window.MaAudio) MaAudio.play(name, v, delay); };

  // ======================================================================
  // HỒN MA
  // ======================================================================
  const ghost = { x: 120, y: 900, tx: 120, ty: 900, a: 0, ta: 0, sc: 1, mode: 'hide', behind: null, nextMove: 0, glimpse: 0 };
  const eyes = [];   // cặp mắt trong bóng tối
  function ghostTick(dt, t) {
    const lvl = yin / 100;
    const busy = ev && (ev.type === 'ghost');
    if (!busy) {
      if (t > ghost.nextMove) {
        ghost.nextMove = t + rand(9, 16);
        const as = alive().filter(v => v.seat.ring >= 2 && !isThay(v));
        if (lvl > 0.7 && as.length) {
          ghost.mode = 'behind'; ghost.behind = pick(as); showGuide('behind', 150);
        } else if (lvl > 0.3 || t < ghost.glimpse) {
          ghost.mode = 'lurk'; ghost.behind = null;
          const side = Math.random() < 0.5;
          ghost.tx = side ? rand(70, 160) : rand(920, 1010); ghost.ty = rand(880, 1250);
          if (Math.random() < 0.25) { ghost.tx = rand(250, 830); ghost.ty = rand(860, 900); }
        } else { ghost.mode = 'hide'; ghost.behind = null; }
      }
      if (ghost.mode === 'behind' && ghost.behind && (ghost.behind.taken || !viewers.has(ghost.behind.id))) { ghost.mode = 'lurk'; ghost.behind = null; }
      if (ghost.mode === 'behind' && ghost.behind) { ghost.tx = ghost.behind.x + 18; ghost.ty = ghost.behind.y - 30; ghost.ta = 0.42; ghost.sc = ghost.behind.seat.sc * 1.05; }
      else if (ghost.mode === 'lurk') { ghost.ta = 0.12 + lvl * 0.3 * (1 - oil / 160); ghost.sc = 0.85 + (ghost.ty - 880) / 540 * 0.4; }
      else ghost.ta = t < ghost.glimpse ? 0.3 : 0;
      if (oil <= 0) ghost.ta = Math.max(ghost.ta, 0.35);
    }
    const k = 1 - Math.exp(-dt * (busy ? 6 : 0.6));
    ghost.x = lerp(ghost.x, ghost.tx, k); ghost.y = lerp(ghost.y, ghost.ty, k);
    ghost.a = lerp(ghost.a, ghost.ta, 1 - Math.exp(-dt * 1.5));
    // mắt trong bóng tối
    const want = Math.floor(lvl * 7 + (oil < 25 ? 3 : 0) + (oil <= 0 ? 6 : 0));
    if (eyes.length < want && Math.random() < dt * 0.8) {
      const side = Math.random();
      const x = side < 0.35 ? rand(30, 200) : side < 0.7 ? rand(880, 1050) : rand(150, 930);
      const y = side < 0.7 ? rand(620, 1420) : rand(620, 900);
      eyes.push({ x, y, t0: t, life: rand(3, 8), s: rand(0.7, 1.3), red: Math.random() < 0.6, blink: rand(0, 5) });
    }
    for (let i = eyes.length - 1; i >= 0; i--) if (t - eyes[i].t0 > eyes[i].life || eyes.length > want + 2) eyes.splice(i, 1);
  }

  function drawGhost(x, y, sc, alpha, t, opt = {}) {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 1.3) * 8 * sc);
    ctx.scale(sc, sc);
    ctx.globalAlpha = clamp(alpha, 0, 1);
    // váy trắng rách
    const g = ctx.createLinearGradient(0, -150, 0, 120);
    g.addColorStop(0, 'rgba(235,240,255,.95)'); g.addColorStop(0.6, 'rgba(200,210,235,.55)'); g.addColorStop(1, 'rgba(200,210,235,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-26, -118);
    ctx.quadraticCurveTo(-46, -40, -58, 110);
    for (let i = 0; i <= 8; i++) { const xx = -58 + i * 14.5; ctx.lineTo(xx, 110 + Math.sin(t * 3 + i * 1.7) * 10 + (i % 2) * 16); }
    ctx.quadraticCurveTo(46, -40, 26, -118); ctx.closePath(); ctx.fill();
    // tay buông dài
    ctx.strokeStyle = 'rgba(225,232,250,.85)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    const reach = opt.reach || 0;
    ctx.beginPath(); ctx.moveTo(-28, -108); ctx.quadraticCurveTo(-46 - reach * 20, -40 - reach * 40, -40 - reach * 30, 10 - reach * 80); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(28, -108); ctx.quadraticCurveTo(46 + reach * 20, -40 - reach * 40, 40 + reach * 30, 10 - reach * 80); ctx.stroke();
    ctx.lineWidth = 2.5;
    for (const sx of [-1, 1]) for (let f = -1; f <= 1; f++) { const hx = sx * (40 + reach * 30), hy = 10 - reach * 80; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + f * 5, hy + 16 - reach * 30); ctx.stroke(); }
    // đầu + tóc dài che mặt
    ctx.fillStyle = 'rgba(232,236,245,.95)'; ctx.beginPath(); ctx.ellipse(0, -142, 22, 27, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(5,4,8,.97)';
    ctx.beginPath(); ctx.ellipse(0, -150, 27, 26, 0, Math.PI, TAU); ctx.fill();
    for (let i = 0; i < 16; i++) {
      const fx = -26 + i * 3.5, sway = Math.sin(t * 1.6 + i * 0.6) * 5;
      ctx.beginPath(); ctx.moveTo(fx * 0.9, -158);
      ctx.quadraticCurveTo(fx * 1.25 + sway, -100, fx * 1.4 + sway * 1.6, -52 + (i % 3) * 9);
      ctx.lineWidth = 5.5; ctx.strokeStyle = 'rgba(6,5,9,.95)'; ctx.stroke();
    }
    // một con mắt ló ra qua kẽ tóc
    if (opt.eye !== false) {
      const gl = ctx.createRadialGradient(9, -140, 0, 9, -140, 9);
      gl.addColorStop(0, 'rgba(255,255,255,1)'); gl.addColorStop(0.4, opt.red ? 'rgba(255,60,40,.9)' : 'rgba(220,235,255,.8)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(9, -140, 9, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function makeStrands() {
    const out = [];
    for (let i = 0; i < 90; i++) {
      const x0 = rand(-330, 330);
      const center = Math.abs(x0) < 110;
      if (center && Math.random() < 0.55) continue;      // chừa khe cho mắt ló ra
      out.push({ x0, w: rand(2, center ? 4 : 7), len: rand(center ? 420 : 560, center ? 700 : 900), bend: rand(-60, 60), ph: rand(0, TAU), a: rand(0.75, 1) });
    }
    return out;
  }
  function drawJumpscare(t) {
    if (!jumpscare) return;
    const p = (t - jumpscare.t0) / jumpscare.dur;
    if (p >= 1) { jumpscare = null; return; }
    const big = jumpscare.big;
    const strands = jumpscare.strands || (jumpscare.strands = makeStrands());
    const a = clamp(p < 0.1 ? p / 0.1 : p > 0.75 ? (1 - p) / 0.25 : 1, 0, 1);
    const s = (big ? 1.25 : 0.85) * (0.6 + ease(Math.min(1, p * 3.5)) * 0.45);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = `rgba(14,0,0,${big ? 0.85 : 0.65})`; ctx.fillRect(-30, -30, W + 60, H + 60);
    ctx.translate(W / 2 + rand(-6, 6), 980 + rand(-6, 6)); ctx.scale(s, s);
    // tóc phía sau
    ctx.fillStyle = '#040305'; ctx.beginPath(); ctx.ellipse(0, -10, 420, 600, 0, 0, TAU); ctx.fill();
    // khuôn mặt dài, cằm nhọn
    ctx.beginPath(); ctx.moveTo(0, -400);
    ctx.bezierCurveTo(250, -400, 310, -160, 285, 40); ctx.bezierCurveTo(262, 250, 130, 410, 0, 430);
    ctx.bezierCurveTo(-130, 410, -262, 250, -285, 40); ctx.bezierCurveTo(-310, -160, -250, -400, 0, -400); ctx.closePath();
    const fg = ctx.createRadialGradient(-30, -90, 30, 0, 0, 430);
    fg.addColorStop(0, '#ecebe7'); fg.addColorStop(0.55, '#b4b7bd'); fg.addColorStop(1, '#3d4047');
    ctx.fillStyle = fg; ctx.fill();
    ctx.save(); ctx.clip();
    // mạch máu xám trên trán, má
    ctx.strokeStyle = 'rgba(60,60,80,.35)'; ctx.lineWidth = 2;
    for (const [x0, y0, dx, dy] of [[-160, -250, 60, 90], [150, -260, -50, 100], [-200, 60, 40, 120], [190, 80, -30, 110], [20, -330, -30, 80]]) {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + dx * 0.7, y0 + dy * 0.3, x0 + dx, y0 + dy); ctx.lineTo(x0 + dx + 18, y0 + dy + 30); ctx.stroke();
    }
    ctx.restore();
    // hốc mắt sâu + vệt đen chảy xuống
    for (const sx of [-1, 1]) {
      const ex = sx * 112, ey = -60;
      const eg = ctx.createRadialGradient(ex, ey, 4, ex, ey, 100);
      eg.addColorStop(0, '#000'); eg.addColorStop(0.62, 'rgba(8,0,0,.96)'); eg.addColorStop(1, 'rgba(40,20,25,0)');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.ellipse(ex, ey, 100, 80, sx * 0.18, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.85)';
      for (const [dx, len, w] of [[-18, 210, 9], [14, 150, 7], [34, 250, 6]]) {
        const x0 = ex + dx * sx;
        ctx.beginPath(); ctx.moveTo(x0 - w, ey + 40); ctx.quadraticCurveTo(x0 - w * 0.4, ey + 40 + len * 0.6, x0 + 2, ey + 40 + len); ctx.quadraticCurveTo(x0 + w * 0.5, ey + 40 + len * 0.6, x0 + w, ey + 40); ctx.fill();
      }
      const gl = ctx.createRadialGradient(ex - sx * 6, ey + 4, 0, ex - sx * 6, ey + 4, 14);
      gl.addColorStop(0, 'rgba(255,255,255,1)'); gl.addColorStop(0.5, 'rgba(230,240,255,.8)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(ex - sx * 6, ey + 4, 14, 0, TAU); ctx.fill();
    }
    // miệng há dài, méo
    const open = 0.75 + Math.sin(t * 26) * 0.06 + ease(Math.min(1, p * 4)) * 0.25;
    ctx.beginPath(); ctx.moveTo(-58, 150);
    ctx.bezierCurveTo(-70, 150 + 120 * open, -30, 150 + 230 * open, 0, 150 + 240 * open);
    ctx.bezierCurveTo(30, 150 + 230 * open, 74, 150 + 120 * open, 60, 150);
    ctx.bezierCurveTo(30, 132, -30, 134, -58, 150); ctx.closePath();
    const mg = ctx.createRadialGradient(0, 150 + 110 * open, 6, 0, 150 + 110 * open, 140);
    mg.addColorStop(0, '#000'); mg.addColorStop(0.75, '#0d0000'); mg.addColorStop(1, '#2a0808');
    ctx.fillStyle = mg; ctx.fill();
    ctx.strokeStyle = 'rgba(70,30,35,.7)'; ctx.lineWidth = 3; ctx.stroke();
    // tóc rủ trước mặt: nhiều sợi mảnh, lượn sóng
    ctx.lineCap = 'round';
    for (const st of strands) {
      const sway = Math.sin(t * 1.8 + st.ph) * 10;
      ctx.strokeStyle = `rgba(4,3,6,${st.a})`; ctx.lineWidth = st.w;
      ctx.beginPath(); ctx.moveTo(st.x0 * 0.55, -420);
      const x1 = st.x0 * 0.95 + st.bend * 0.3 + sway, x2 = st.x0 * 1.05 + st.bend + sway * 1.6;
      ctx.bezierCurveTo(st.x0 * 0.85, -250, x1, -420 + st.len * 0.55, x2, -420 + st.len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ======================================================================
  // TRUYỆN
  // ======================================================================
  const story = { phase: 'wait', st: null, node: null, li: 0, roles: null, text: '', segs: [], typed: 0, nextAt: 0, clock: 0, played: [], part: 0, startIds: new Set(), cast: null, paused: false, waitUntil: 0, endKind: '' };
  const NPC = { A: 'cậu Tư', B: 'bé Út', C: 'chị Hai', THAY: 'thầy Ba đầu làng' };

  function thayName() {
    if (thayId) { const v = viewers.get(thayId); if (v) return { id: v.id, name: v.name, v }; }
    const top = [...coinsOf.entries()].sort((a, b) => b[1].c - a[1].c)[0];
    if (top && top[1].c >= S.thayMin) return { id: top[0], name: top[1].name, v: viewers.get(top[0]) };
    return { id: null, name: NPC.THAY, v: null };
  }
  function pickRoles() {
    const t = now();
    const pool = alive().filter(v => t - v.active < 300).sort((a, b) => b.active - a.active).slice(0, 8);
    const rest = alive().filter(v => !pool.includes(v));
    shuffle(pool); shuffle(rest);
    const all = pool.concat(rest).filter(v => !isThay(v));
    const r = {};
    for (const [i, k] of ['A', 'B', 'C'].entries()) { const v = all[i]; r[k] = v ? { id: v.id, name: v.name } : { id: null, name: NPC[k] }; }
    return r;
  }
  function subst(text) {
    const segs = [];
    const th = thayName();
    const n = alive().length || 12;
    const map = {
      A: story.roles.A, B: story.roles.B, C: story.roles.C, THAY: th,
      MOI: { id: null, name: lastJoiner || 'một người lạ' },
      NGUOI: { id: null, name: String(n), plain: true }, NGUOI1: { id: null, name: String(n + 1), plain: true },
      GIO: { id: null, name: new Date().toTimeString().slice(0, 5), plain: true },
    };
    const re = /\{(A|B|C|THAY|MOI|NGUOI1|NGUOI|GIO)\}/g;
    let last = 0, m;
    const hit = new Set();
    while ((m = re.exec(text))) {
      if (m.index > last) segs.push({ t: text.slice(last, m.index), hl: 0 });
      const r = map[m[1]];
      segs.push({ t: r.name, hl: r.plain ? 0 : (r.id ? 2 : 1) });
      if (r.id) hit.add(r.id);
      last = re.lastIndex;
    }
    if (last < text.length) segs.push({ t: text.slice(last), hl: 0 });
    return { segs, plain: segs.map(s => s.t).join(''), hit };
  }
  function parseLine(raw) {
    let fx = [];
    let text = raw;
    const m = /^@([\w,\s-]+)\|/.exec(raw);
    if (m) { fx = m[1].split(',').map(s => s.trim()).filter(Boolean); text = raw.slice(m[0].length); }
    return { fx, text };
  }

  function chooseNextStories() {
    const recent = story.played.slice(-3);
    let pool = STORIES.filter(s => !recent.includes(s.id));
    if (pool.length < 3) pool = STORIES.slice();
    return shuffle(pool.slice()).slice(0, Math.min(3, pool.length));
  }
  function startIntermission() {
    story.phase = 'inter'; story.st = null; story.node = null;
    setLine([{ t: 'Đống lửa vẫn cháy… Câu chuyện tiếp theo sắp bắt đầu.', hl: 0 }], 'Đống lửa vẫn cháy… Câu chuyện tiếp theo sắp bắt đầu.', false);
    if (!STORIES.length) return;
    if (S.storyMode === 'order') {
      const last = story.played[story.played.length - 1];
      const i = STORIES.findIndex(s => s.id === last);
      story.waitUntil = story.clock + 5; story.pending = STORIES[(i + 1) % STORIES.length];
      return;
    }
    const opts = chooseNextStories();
    if (S.storyMode === 'random' || opts.length < 2) { story.waitUntil = story.clock + 5; story.pending = opts[0]; return; }
    story.pending = null;
    startVote('story', 'Kể chuyện nào tiếp theo?', opts.map(s => s.title), S.storyVoteSeconds, idx => startStory(opts[idx]), opts.map(s => s.teaser));
    narrate('Chọn chuyện tiếp theo. Gõ 1, 2 hoặc 3.');
  }
  const traveling = () => story.phase === 'travel' || !!(use3D() && MA3D.busy && MA3D.busy());
  function startStory(st, noTravel) {
    if (!st) return;
    vote = null;
    if (!noTravel) {
      const prev = curMap;
      pickMap(true, st);
      if (prev !== curMap && use3D() && MA3D.canTravel && MA3D.canTravel()) {
        // ông kể chuyện cầm đuốc dẫn mọi người qua màn đêm tới cảnh mới, tới nơi mới kể
        story.phase = 'travel'; story.travelSt = st; story.travelT0 = story.clock; story.travelSeen = false;
        const who = S.tellerName || 'Ông Tư', where = ((MA3D.sceneNames || {})[curMap] || 'chốn khác').toLowerCase();
        const line = pick([
          `${who} dập lửa, thắp đuốc: "Đi thôi… theo sát tôi, đừng ai quay đầu lại." Cả đoàn run rẩy băng qua màn đêm tới ${where}.`,
          `${who} giơ cao ngọn đuốc: "Chuyện tiếp theo phải kể ở ${where}. Nắm tay nhau mà đi." Bóng tối nuốt dần con đường phía sau.`,
          `"Chỗ này không kể tiếp được nữa rồi…" ${who} cầm đuốc dẫn đường. Mọi người co ro bước theo, tới ${where} thì nhóm lửa mới.`,
        ]);
        setLine([{ t: line, hl: 0 }], line);
        sfx('wind', 0.8); sfx('steps', 0.6, 2.5); sfx('steps', 0.5, 6);
        return;
      }
    }
    story.st = st; story.played.push(st.id); if (story.played.length > 20) story.played.shift();
    story.roles = pickRoles();
    story.part = 0;
    story.startIds = new Set(alive().map(v => v.id));
    story.phase = 'cast';
    story.cast = { t0: now() };
    story.waitUntil = story.clock + 6.5;
    const names = ['A', 'B', 'C'].map(k => story.roles[k]).filter(r => r.id).map(r => r.name);
    const intro = `Chuyện: ${st.title}.` + (names.length ? ` Vai chính đêm nay: ${names.join(', ')}.` : '');
    setLine([{ t: st.title, hl: 1 }, { t: ' — ' + st.teaser, hl: 0 }], st.title + '. ' + st.teaser, false);
    narrate(intro);
    sfx('bell', 0.5);
    for (const k of ['A', 'B', 'C']) { const r = story.roles[k]; const v = r.id && viewers.get(r.id); if (v) { v.glow = 3; spark(v.x, v.y - 90 * v.seat.sc, 14, '255,210,120', 50, 70); } }
  }
  function goNode(id) {
    const node = story.st && story.st.nodes[id];
    if (!node) { endStory({ end: 'open', lines: [] }); return; }
    story.node = node; story.nodeId = id; story.li = 0; story.phase = 'tell';
    nextLine();
  }
  function setLine(segs, plain, speak = true) {
    story.segs = segs; story.text = plain; story.typed = 0; story.lineT0 = now();
    if (speak) narrate(plain);
  }
  function nextLine() {
    const node = story.node;
    if (!node) return;
    if (story.li < node.lines.length) {
      const { fx, text } = parseLine(node.lines[story.li++]);
      const r = subst(text);
      setLine(r.segs, r.plain);
      story.part++;
      for (const id of r.hit) { const v = viewers.get(id); if (v) { v.glow = 2.2; } }
      const dur = clamp(1.8 + [...r.plain].length / 13, 3.6, 13) / (+S.storySpeed || 1);
      story.nextAt = story.clock + dur + 0.5;
      for (const f of fx) runStoryFx(f);
      // đọc trước câu kế tiếp cho giọng VieNeu khỏi trễ
      if (story.li < node.lines.length) vnPrefetch(subst(parseLine(node.lines[story.li]).text).plain);
      return;
    }
    if (node.choice) {
      const c = node.choice;
      const q = subst(c.q).plain, a = c.a.map(x => subst(x).plain);
      story.phase = 'vote';
      startVote('choice', q, a, S.voteSeconds, idx => { story.choiceMade = a[idx]; goNode(c.to[idx]); });
      narrate(`${q} Gõ 1: ${a[0]}. Gõ 2: ${a[1]}.`);
      return;
    }
    if (node.next) { goNode(node.next); return; }
    endStory(node);
  }
  function endStory(node) {
    story.phase = 'end';
    story.endKind = node.end || 'open';
    story.waitUntil = story.clock + 8;
    const kind = story.endKind;
    if (kind === 'bad') {
      yin = clamp(yin + 18, 0, 100);
      showBanner('KẾT THÚC ĐEN TỐI', story.st ? story.st.title : '', '#ff4a3a', 4);
      if (node.take && story.roles[node.take] && story.roles[node.take].id) {
        const v = viewers.get(story.roles[node.take].id);
        if (v && !v.taken && !isThay(v)) setTimeout(() => takeViewer(v, 'story'), 900);
      }
    } else if (kind === 'good') {
      oil = clamp(oil + 25, 0, 100); yin = clamp(yin - 20, 0, 100);
      showBanner('BÌNH AN VÔ SỰ', story.st ? story.st.title : '', '#ffd27a', 4);
      sfx('success', 0.6);
    } else {
      showBanner('… CHƯA HẾT ĐÂU', story.st ? story.st.title : '', '#c9a0ff', 4);
    }
    // ngồi nghe trọn câu chuyện mà không bị bắt → +2 gan dạ
    let n = 0;
    for (const v of alive()) if (story.startIds.has(v.id)) { addBrave(v, 2); n++; }
    if (n) toast(`🔥 ${n} người nghe trọn chuyện được +2 điểm gan dạ`, '#ffd27a');
  }
  function storyTick(dt) {
    const blocked = story.paused || (ev && ev.block) || !!jumpscare || (story.phase !== 'travel' && use3D() && MA3D.busy && MA3D.busy());
    if (!blocked) story.clock += dt;
    if (story.typed < [...story.text].length) story.typed += dt * 46;
    if (blocked) return;
    switch (story.phase) {
      case 'wait': if (story.clock > 4) startIntermission(); break;
      case 'travel': {
        const busy = use3D() && MA3D.busy && MA3D.busy();
        if (busy) story.travelSeen = true;
        else if (story.travelSeen || story.clock - story.travelT0 > 3) { const st2 = story.travelSt; story.travelSt = null; startStory(st2, true); }
        break;
      }
      case 'inter': if (story.pending && story.clock >= story.waitUntil) { const p = story.pending; story.pending = null; startStory(p); } break;
      case 'cast': if (story.clock >= story.waitUntil) goNode(story.st.start); break;
      case 'tell': if (story.clock >= story.nextAt && (!narrating() || story.clock > story.nextAt + 15)) nextLine(); break;
      case 'end': if (story.clock >= story.waitUntil) startIntermission(); break;
    }
  }
  function runStoryFx(f) {
    switch (f) {
      case 'doll': setTimeout(() => queueEvent('bupbe', null, { story: true }), 2500); return;
      case 'possess': setTimeout(() => queueEvent('nhap', null, { story: true }), 2500); return;
      case 'ouija': setTimeout(() => queueEvent('cauco', null, { story: true }), 2500); return;
      case 'jump': doJumpscare(); yin = clamp(yin + 6, 0, 100); return;
      case 'flicker': lampFlickUntil = now() + 1.6; sfx('flicker'); return;
      case 'dark': oil = clamp(oil - 15, 0, 100); sfx('dark'); return;
      case 'shadow': windowShadow = { t0: now() }; sfx('shadow'); return;
      case 'ghost': ghost.glimpse = now() + 3; ghost.nextMove = 0; sfx('ghost'); return;
      case 'eyes': for (let i = 0; i < 4; i++) eyes.push({ x: rand(40, 1040), y: rand(640, 1400), t0: now(), life: rand(3, 6), s: rand(0.8, 1.2), red: true, blink: rand(0, 5) }); sfx('eyes'); return;
      case 'knock': doorShake = 1.4; sfx('knock'); scareAll(0.4); return;
      case 'door': doorShake = 0.8; sfx('door'); return;
      case 'scream': shockAt = now(); sfx('scream', 0.8); scareAll(0.8); shake = Math.max(shake, 10); return;
      case 'mirror': mirrorFlash = now(); sfx('mirror'); return;
      default: if (window.MaAudio && MaAudio.has(f)) sfx(f); yin = clamp(yin + 1.5, 0, 100);
    }
  }
  let lampFlickUntil = 0, mirrorFlash = -99;

  // ======================================================================
  // BÌNH CHỌN
  // ======================================================================
  let vote = null;
  function startVote(kind, q, labels, secs, onDone, subs) {
    vote = { kind, q, opts: labels.map((l, i) => ({ label: l, sub: subs ? subs[i] : '', w: 0, n: 0 })), by: new Map(), t0: now(), end: now() + (+secs || 20), onDone };
    sfx('bell', 0.35);
  }
  function castVote(v, idx, user) {
    if (!vote || idx < 0 || idx >= vote.opts.length) return false;
    const id = (v && v.id) || (user && user.id); if (!id) return false;
    const prev = vote.by.get(id);
    if (prev) { if (prev.idx === idx) return true; vote.opts[prev.idx].w -= prev.w; vote.opts[prev.idx].n--; }
    const w = prev ? prev.w : 1;
    vote.by.set(id, { idx, w });
    vote.opts[idx].w += w; vote.opts[idx].n++;
    if (!prev && v) addBrave(v, 1);
    sfx('vote', 0.6);
    return true;
  }
  function voteGift(user, value) {
    if (!vote || !S.voteGiftWeight) return;
    const b = vote.by.get(user.id); if (!b) return;
    b.w += value; vote.opts[b.idx].w += value;
    const v = viewers.get(user.id);
    if (v) floatText(`⚖ +${value} phiếu`, v.x, v.y - 120 * v.seat.sc, '#ffd27a', 26);
  }
  function voteTick() {
    if (!vote) return;
    if (story.paused) { vote.end += 1 / 60; return; }
    if (now() < vote.end) return;
    const vt = vote; vote = null;
    let best = -1, bw = -1, ties = [];
    vt.opts.forEach((o, i) => { if (o.w > bw) { bw = o.w; best = i; ties = [i]; } else if (o.w === bw) ties.push(i); });
    if (bw <= 0) { best = Math.floor(Math.random() * vt.opts.length); toast('👻 Không ai chọn… hồn ma chọn thay!', '#c9a0ff'); }
    else if (ties.length > 1) { best = pick(ties); toast('⚖ Hoà phiếu… ngọn lửa chọn thay!', '#ffd27a'); }
    lastVoteResult = { label: vt.opts[best].label, t0: now(), idx: best };
    vt.onDone(best);
  }
  let lastVoteResult = null;

  // ======================================================================
  // SỰ KIỆN
  // ======================================================================
  let ev = null;
  const evQueue = [];
  let lastEventAt = now();
  const BLOCKING = ['cauco', 'bupbe', 'nhap', 'goihon', 'blackout', 'trura', 'ghostauto'];

  function queueEvent(type, by, opt = {}) {
    if (!BLOCKING.includes(type)) { runInstant(type, by, opt); return; }
    const item = { type, by, opt };
    // trừ tà (quà lớn nhất) cắt ngang sự kiện đang chạy
    if (type === 'trura' && ev && ev.type !== 'trura') endEvent();
    if (type === 'blackout' || type === 'ghostauto' || type === 'trura') evQueue.unshift(item); else evQueue.push(item);
    if (evQueue.length > 8) evQueue.length = 8;
  }
  function eventRunner(t) {
    if (ev) { evTick(t); return; }
    if (!evQueue.length) {
      if (S.autoEvents && story.phase === 'tell' && !vote && t - lastEventAt > (+S.eventEvery || 4) * 60 && alive().length >= 3) {
        lastEventAt = t;
        queueEvent(pick(['nhap', 'nhap', 'bupbe', 'bupbe', 'cauco']), null, { auto: true });
      }
      return;
    }
    if (traveling()) return;
    if (vote && !['blackout', 'ghostauto', 'trura'].includes(evQueue[0].type)) return;
    if (story.phase === 'cast') return;
    const it = evQueue.shift();
    startEvent(it.type, it.by, it.opt);
  }
  function endEvent() {
    if (ev && ev.cleanup) ev.cleanup();
    ev = null; lastEventAt = now();
  }

  function startEvent(type, by, opt) {
    const t = now();
    const al = alive();
    const byV = by ? viewers.get(by.id) : null;
    switch (type) {
      case 'nhap': {
        const cand = al.filter(v => !isThay(v));
        if (cand.length < 3) { if (by) toast(`👁 Cần ít nhất 3 người quanh đống lửa để chơi "Ai bị nhập?"`); return; }
        const recent = cand.filter(v => t - v.active < 180);
        const target = pick(recent.length >= 2 ? recent : cand);
        ev = { type, block: true, t0: t, dur: 60, target, accuse: new Map(), tally: new Map(), clues: [], step: 0, by };
        showBanner('AI ĐÃ BỊ MA NHẬP?', 'Gõ SỐ GHẾ của kẻ bị nhập để tố cáo', '#ff4a3a', 4);
        narrate('Có một người trong phòng đã bị ma nhập. Gõ số ghế của kẻ đó để tố cáo. Các bạn có sáu mươi giây.', true);
        sfx('possess'); shake = 8;
        return;
      }
      case 'bupbe': {
        if (al.length < 2) { if (by) toast('🪆 Cần ít nhất 2 người quanh đống lửa để chuyền búp bê'); return; }
        const holder = pick(al.filter(v => !byV || v !== byV).length ? al.filter(v => !byV || v !== byV) : al);
        ev = { type, block: true, t0: t, dur: rand(30, 45), holder, from: null, flyT: 0, lastPass: t, hops: 0, nextBox: t, by };
        showBanner('BÚP BÊ MA', 'Ai đang cầm búp bê: gõ bất kỳ để chuyền đi!', '#ff6a8a', 4);
        narrate(`Búp bê ma đang nằm trong lòng ${holder.name}. Người cầm búp bê hãy gõ bình luận để chuyền đi. Khi tiếng nhạc dừng, ai cầm nó sẽ bị bắt.`, true);
        sfx('laugh', 0.6);
        return;
      }
      case 'cauco': {
        ev = { type, block: true, t0: t, phase: 'ask', askUntil: t + 20, asker: by || null, q: '', ans: null, planch: { x: LX, y: 1060 }, path: [], pi: 0, pT: t, spelled: '', by };
        showBanner('CẦU CƠ', by ? `${by.name} hãy gõ câu hỏi cho hồn ma` : 'Gõ "hỏi: …" để hỏi hồn ma', '#b58cff', 3.5);
        narrate(by ? `${by.name} mở bàn cầu cơ. Hãy gõ câu hỏi cho hồn ma.` : 'Bàn cầu cơ đã mở. Ai muốn hỏi hồn ma, gõ chữ hỏi, hai chấm, rồi câu hỏi.', true);
        sfx('ouija');
        return;
      }
      case 'goihon': case 'ghostauto': {
        const cand = al.filter(v => !isThay(v) && (!byV || v !== byV));
        const victim = cand.length ? pick(cand.filter(v => v.seat.ring >= 1).length ? cand.filter(v => v.seat.ring >= 1) : cand) : null;
        ev = { type, block: true, t0: t, dur: 6.5, victim, step: 0, by };
        showGuide('ghost', 30);
        ghost.mode = 'rush'; ghost.x = victim ? (victim.x < LX ? 40 : 1040) : 60; ghost.y = 900; ghost.a = 0.2;
        sfx('ghost', 1); lampFlickUntil = t + 1.4;
        showBanner(type === 'goihon' ? 'GỌI HỒN' : 'MA HIỆN HÌNH', by ? `${by.name} đã gọi hồn…` : 'Âm khí đã đầy…', '#ff4a3a', 2.2);
        return;
      }
      case 'blackout': {
        ev = { type, block: true, t0: t, dur: 8, step: 0, victims: [] };
        showGuide('blackout', 30);
        sfx('lampout'); showBanner('LỬA TẮT!', 'Củi cháy hết rồi… đừng ai cử động', '#ff4a3a', 3);
        narrate('Lửa tắt rồi. Đừng ai cử động.', true);
        return;
      }
      case 'trura': {
        if (by) thayId = by.id;
        ev = { type, block: true, t0: t, dur: 6, by };
        showGuide('trura', 30);
        const freed = seated().filter(v => v.taken);
        for (const v of freed) returnViewer(v, true);
        oil = 100; yin = 0; eyes.length = 0; ghost.mode = 'hide'; ghost.ta = 0; ghost.a = 0;
        if (ev.by) { const v = viewers.get(ev.by.id); if (v) { addBrave(v, 5); spark(v.x, v.y - 80, 40, '255,215,120', 120, 160, 4); } }
        flash = 0.18; flashColor = '255,215,140';
        sfx('success', 1);
        showBanner('TRỪ TÀ!', by ? `☯ ${by.name} trở thành THẦY PHÁP` : 'Tà khí tan biến', '#ffd27a', 4.5);
        narrate(by ? `${by.name} làm lễ trừ tà. Âm khí tan biến. ${freed.length ? 'Mọi người trong gương đã được cứu về.' : ''} Từ giờ ${by.name} là thầy pháp của phòng.` : 'Lễ trừ tà. Âm khí tan biến.', true);
        return;
      }
    }
  }

  function evTick(t) {
    const e = ev, el = t - e.t0;
    switch (e.type) {
      case 'nhap': {
        if (!viewers.has(e.target.id) || e.target.taken) { toast('👁 Kẻ bị nhập đã bỏ trốn…', '#c9a0ff'); endEvent(); return; }
        const tg = e.target;
        if (e.step === 0 && el > 5) { e.step = 1; e.clues.push(tg.seat.zone ? `Kẻ đó đang ngồi ${tg.seat.zone}` : `Kẻ đó ngồi ở ${RING_NAMES[tg.seat.ring]}`); sfx('whisper', 0.7); }
        if (e.step === 1 && el > 18) { e.step = 2; e.clues.push(`Số ghế của kẻ đó là số ${tg.seat.n % 2 ? 'LẺ' : 'CHẴN'}`); sfx('whisper', 0.7); }
        if (e.step === 2 && el > 30) { e.step = 3; e.clues.push('Nhìn kỹ… mắt kẻ đó vừa loé đỏ!'); sfx('possess', 0.6); }
        if (e.step >= 3 && Math.floor(el * 10) % 70 === 0) tg.eyes = Math.max(tg.eyes, 0.45);
        if (e.step === 3 && el > 43) {
          e.step = 4;
          const letters = [...low(tg.name).replace(/[^a-z0-9]/g, '')];
          const L = (letters[0] || '?').toUpperCase();
          e.clues.push(`Tên kẻ đó bắt đầu bằng chữ "${L}"`); sfx('whisper', 0.8);
        }
        if (el > e.dur) {
          e.type = 'nhap-end'; e.t1 = t;
          const ranked = [...e.tally.entries()].sort((a, b) => b[1] - a[1]);
          const topSeat = ranked.length ? ranked[0][0] : null;
          const accused = topSeat ? (seatByN(topSeat) || {}).v : null;
          if (!accused) {
            yin = clamp(yin + 25, 0, 100);
            showBanner('KHÔNG AI DÁM TỐ…', `Kẻ bị nhập là ${tg.name} (ghế ${tg.seat.n})`, '#ff4a3a', 4.5);
            narrate(`Không ai dám tố cáo. Kẻ bị nhập chính là ${tg.name}. Âm khí dâng cao.`, true);
            tg.eyes = 3; sfx('laugh');
          } else if (accused === tg) {
            yin = clamp(yin - 30, 0, 100);
            showBanner('ĐÃ TÌM RA!', `${tg.name} (ghế ${tg.seat.n}) bị nhập — hồn ma bị đuổi đi`, '#ffd27a', 4.5);
            narrate(`Chính xác! ${tg.name} đã bị ma nhập. Hồn ma bị đuổi đi rồi.`, true);
            let n = 0;
            for (const [uid, seatN] of e.accuse) if (seatN === tg.seat.n) { const v = viewers.get(uid); if (v) { addBrave(v, 3); n++; } }
            tg.shiver = 2.5; spark(tg.x, tg.y - 90 * tg.seat.sc, 30, '220,230,255', 60, 200, 4, 1.6);
            sfx('success', 0.8); toast(`👁 ${n} người tố đúng được +3 điểm gan dạ`, '#ffd27a');
          } else {
            yin = clamp(yin + 15, 0, 100);
            showBanner('TỐ NHẦM RỒI!', `${accused.name} bị oan… kẻ bị nhập là ${tg.name} (ghế ${tg.seat.n})`, '#ff4a3a', 5);
            narrate(`Tố nhầm rồi! ${accused.name} vô tội nhưng đã bị ma kéo đi. Kẻ bị nhập thật là ${tg.name}.`, true);
            tg.eyes = 3; sfx('laugh');
            if (!isThay(accused)) setTimeout(() => takeViewer(accused, 'wrong'), 1200);
          }
        }
        return;
      }
      case 'nhap-end': if (t - e.t1 > 5.5) endEvent(); return;
      case 'bupbe': {
        if (!e.holder || !viewers.has(e.holder.id) || e.holder.taken) {
          const al = alive(); if (!al.length) { endEvent(); return; }
          passDoll(pick(al), true);
        }
        if (t > e.nextBox) { e.nextBox = t + 5.4; sfx('musicbox', 0.8); }
        if (t - e.lastPass > 10 && t - e.flyT > 1) { const others = alive().filter(v => v !== e.holder); if (others.length) { passDoll(pick(others), true); toast('🪆 Búp bê chán rồi… tự nhảy sang người khác', '#ff9ab0'); } }
        if (el > e.dur) {
          e.type = 'bupbe-end'; e.t1 = t;
          const hv = e.holder;
          if (isThay(hv)) {
            showBanner('THẦY PHÁP TRẤN YỂM!', `${hv.name} giữ búp bê — không ai bị bắt`, '#ffd27a', 4);
            narrate(`Búp bê dừng ở tay thầy pháp ${hv.name}. Búp bê đã bị trấn yểm.`, true); sfx('success', 0.7);
          } else {
            showBanner('NHẠC ĐÃ DỪNG…', `${hv.name} đang cầm búp bê!`, '#ff4a3a', 4);
            narrate(`Tiếng nhạc dừng. ${hv.name} đang cầm búp bê. Tới lượt bạn xuống giếng chơi với nó.`, true);
            sfx('laugh', 1); hv.eyes = 0;
            setTimeout(() => { if (viewers.has(hv.id)) takeViewer(hv, 'doll'); }, 1500);
          }
        }
        return;
      }
      case 'bupbe-end': if (t - e.t1 > 4.5) endEvent(); return;
      case 'cauco': return ouijaTick(t, e);
      case 'goihon': case 'ghostauto': {
        const v = e.victim;
        if (v && viewers.has(v.id)) { ghost.tx = v.x + 10; ghost.ty = v.y - 25; ghost.sc = v.seat.sc * 1.2; }
        ghost.ta = 0.85;
        if (e.step === 0 && el > 1.4) { e.step = 1; doJumpscare(); }
        if (e.step === 1 && el > 2.4) {
          e.step = 2;
          if (v && viewers.has(v.id) && !v.taken) { takeViewer(v, 'ghost'); showBanner('BỊ BẮT RỒI!', `${v.name} đã bị kéo vào gương`, '#ff4a3a', 3.5); narrate(`${v.name} đã bị ma kéo vào gương! Gõ cứu ${v.seat.n} để kéo bạn ấy ra.`, true); }
          else showBanner('MA ĐÃ ĐẾN…', 'nhưng chưa bắt được ai', '#ff4a3a', 3);
        }
        if (el > e.dur) { yin = e.type === 'ghostauto' ? 25 : clamp(yin, 0, 70); ghost.mode = 'hide'; ghost.ta = 0; ghost.nextMove = t + 8; endEvent(); }
        return;
      }
      case 'blackout': {
        if (e.step === 0 && el > 2.6) {
          e.step = 1; sfx('scream', 0.9); shake = 12;
          const cand = shuffle(alive().filter(v => !isThay(v)));
          e.victims = cand.slice(0, cand.length >= 10 ? 2 : cand.length ? 1 : 0);
          for (const v of e.victims) takeViewer(v, 'dark');
        }
        if (e.step === 1 && el > 5.2) { e.step = 2; sfx('match'); oil = 35; toast('🔥 Ai đó vừa quẹt diêm, nhóm lại đống lửa…', '#ffd27a'); if (e.victims.length) narrate(`Lửa bùng lên lại. ${e.victims.map(v => v.name).join(' và ')} đã biến mất.`, true); }
        if (el > e.dur) endEvent();
        return;
      }
      case 'trura': if (el > e.dur) endEvent(); return;
    }
  }

  function passDoll(to, silent) {
    const e = ev; if (!e || e.type !== 'bupbe' || !to || to === e.holder) return;
    e.from = e.holder ? { x: e.holder.x, y: e.holder.y - 40 * e.holder.seat.sc } : null;
    e.holder = to; e.flyT = now(); e.lastPass = now(); e.hops++;
    sfx('laugh', 0.25);
    if (!silent) toast(`🪆 Búp bê nhảy sang ${to.name}`, '#ff9ab0');
  }

  // ---------- cầu cơ ----------
  const OUIJA = { cx: LX, cy: 1040, w: 920, h: 520 };
  const OUIJA_POS = {};
  (function layoutOuija() {
    const row1 = 'ABCDEFGHIJKLM', row2 = 'NOPQRSTUVWXYZ', row3 = '1234567890';
    const ocx = OUIJA.cx, ocy = OUIJA.cy + 130;
    const arc = (str, rx, ry) => [...str].forEach((ch, i) => { const a = Math.PI * (1.13 + 0.74 * i / (str.length - 1)); OUIJA_POS[ch] = { x: ocx + Math.cos(a) * rx, y: ocy + Math.sin(a) * ry }; });
    arc(row1, 395, 270);
    arc(row2, 300, 178);
    [...row3].forEach((ch, i) => { OUIJA_POS[ch] = { x: OUIJA.cx - 270 + i * 60, y: OUIJA.cy + 135 }; });
    OUIJA_POS.YES = { x: OUIJA.cx - 345, y: OUIJA.cy - 200 };
    OUIJA_POS.NO = { x: OUIJA.cx + 330, y: OUIJA.cy - 200 };
    OUIJA_POS.BYE = { x: OUIJA.cx, y: OUIJA.cy + 210 };
    OUIJA_POS.MID = { x: OUIJA.cx, y: OUIJA.cy + 50 };
  })();
  const DEFAULT_QS = ['Có ai đang ở đây không?', 'Bạn là ai?', 'Bạn ở đâu?', 'Đêm nay ai sẽ bị bắt?', 'Bạn muốn gì?', 'Khi nào bạn đi?'];
  function ouijaAnswer(q, askerId) {
    const s = ' ' + low(q).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ') + ' ';
    const al = alive().filter(v => v.id !== askerId);
    const seatAns = () => { const v = al.length ? pick(al) : null; return v ? { text: `Ghế số ${v.seat.n}`, spell: 'GHE ' + v.seat.n, seat: v.seat.n } : { text: 'Sau lưng bạn', spell: 'SAU LUNG' }; };
    if (/ ai /.test(s) && !/ ai la ban | ban la ai /.test(s)) {
      const v = al.length ? pick(al) : null;
      if (v) { const sp = low(v.name).replace(/[^a-z0-9]/g, '').toUpperCase().slice(0, 9) || ('GHE ' + v.seat.n); return { text: `${v.name} (ghế ${v.seat.n})`, spell: sp, seat: v.seat.n }; }
    }
    if (/ khi nao | bao gio | luc nao | may gio | ngay nao /.test(s)) return pick([{ text: 'Đêm nay', spell: 'DEM NAY' }, { text: 'Ba giờ sáng', spell: '3 GIO' }, { text: 'Sắp rồi', spell: 'SAP ROI' }, { text: 'Khi lửa tắt', spell: 'LUA TAT' }]);
    if (/ o dau | cho nao | noi nao | dau /.test(s)) return pick([{ text: 'Sau lưng bạn', spell: 'SAU LUNG' }, { text: 'Trong gương', spell: 'TRONG GUONG' }, { text: 'Dưới gầm giường', spell: 'GAM GIUONG' }, seatAns(), { text: 'Ngay cạnh bạn', spell: 'CANH BAN' }]);
    if (/ bao nhieu | may nguoi | may tuoi /.test(s)) { const n = alive().length; return / nguoi /.test(s) ? { text: `${n + 1} người. Tính cả tôi.`, spell: String(n + 1) } : (() => { const k = 1 + Math.floor(Math.random() * 99); return { text: String(k), spell: String(k) }; })(); }
    if (/ ten gi | ten la gi | la ai | ban la /.test(s)) return pick([{ text: 'Bé Mơ', spell: 'MO' }, { text: 'Cô Hai', spell: 'CO HAI' }, { text: 'Không có tên', spell: 'KHONG TEN' }, { text: 'Người thứ mười ba', spell: 'NGUOI 13' }]);
    if (/ yeu | nguoi yeu | crush | vo | chong | cuoi | ny /.test(s)) return pick([{ text: 'Có. Nhưng người đó đang sau lưng bạn', spell: 'SAU LUNG' }, { text: 'Đừng chờ nữa', spell: 'DUNG CHO' }, { text: 'Có', spell: 'YES' }, { text: 'Tôi yêu bạn', spell: 'TOI YEU BAN' }]);
    if (/ giau | tien | trung so | xo so | lo de /.test(s)) return pick([{ text: 'Tiền âm phủ thì có', spell: 'TIEN AM PHU' }, { text: 'Không', spell: 'NO' }, { text: 'Đừng tham', spell: 'DUNG THAM' }]);
    if (/ muon gi | can gi /.test(s)) return pick([{ text: 'Một nén nhang', spell: 'NHANG' }, { text: 'Có người chơi cùng', spell: 'CHOI CUNG' }, { text: 'Về nhà', spell: 'VE NHA' }, seatAns()]);
    if (/ co | khong | phai | dung | duoc /.test(s)) return pick([{ text: 'Có', spell: 'YES' }, { text: 'Không', spell: 'NO' }, { text: 'Có', spell: 'YES' }, { text: 'Không', spell: 'NO' }, { text: 'Đừng hỏi nữa', spell: 'DUNG HOI' }]);
    return pick([{ text: 'Đừng hỏi', spell: 'DUNG HOI' }, { text: 'Chạy đi', spell: 'CHAY DI' }, { text: 'Tôi đói', spell: 'TOI DOI' }, { text: 'Ở lại đây', spell: 'O LAI' }, { text: 'Tôi thấy bạn', spell: 'TOI THAY BAN' }, { text: 'Tắt đèn đi', spell: 'TAT DEN' }]);
  }
  function ouijaAsk(q, user) {
    const e = ev; if (!e || e.type !== 'cauco' || e.phase !== 'ask') return;
    e.q = short(q, 70); e.qBy = user ? user.name : '';
    e.ans = ouijaAnswer(q, user && user.id);
    const sp = e.ans.spell;
    const path = [];
    if (sp === 'YES' || sp === 'NO') path.push({ k: sp, ch: sp === 'YES' ? 'CÓ' : 'KHÔNG' });
    else for (const ch of sp) path.push(ch === ' ' ? { k: 'MID', ch: ' ' } : { k: ch, ch });
    path.push({ k: 'BYE', ch: '' });
    e.path = path; e.pi = 0; e.pT = now(); e.phase = 'spell'; e.spelled = '';
    e.from = { x: e.planch.x, y: e.planch.y };
    sfx('ouija', 0.8);
    narrate(`${e.qBy ? e.qBy + ' hỏi: ' : ''}${e.q}`, true);
  }
  function ouijaTick(t, e) {
    if (e.phase === 'ask') {
      if (t > e.askUntil) ouijaAsk(pick(DEFAULT_QS), null);
      return;
    }
    if (e.phase === 'spell') {
      const step = e.path[e.pi];
      if (!step) { e.phase = 'reveal'; e.revT = t; narrate(e.ans.text, true); sfx('whisper', 0.9); if (e.ans.seat) { const v = (seatByN(e.ans.seat) || {}).v; if (v) { v.glow = 3; v.shiver = 2; } } return; }
      const tgt = OUIJA_POS[step.k] || OUIJA_POS.MID;
      const k = ease((t - e.pT) / 0.55);
      e.planch.x = lerp(e.from.x, tgt.x, k); e.planch.y = lerp(e.from.y, tgt.y, k);
      if (t - e.pT > 1.15) {
        if (step.ch) e.spelled += step.ch;
        e.pi++; e.pT = t; e.from = { x: tgt.x, y: tgt.y };
        if (step.ch && step.ch !== ' ') sfx('slide', 0.7);
      }
      return;
    }
    if (e.phase === 'reveal' && t - e.revT > 6) endEvent();
  }

  // ---------- người bị bắt vào gương ----------
  const MIRROR = { x: 540, y: 742, rx: 84, ry: 118 };
  function takeViewer(v, why) {
    if (!v || v.taken || !viewers.has(v.id)) return;
    v.taken = true; v.takenAt = now(); v.rescue = new Set();
    v.anim = { type: 'take', t0: now(), fx: v.x, fy: v.y };
    showGuide('rescue', 60);
    sfx('taken', 0.9); shake = Math.max(shake, 6);
    toast(`👻 ${v.name} bị ma bắt đi — gõ "cứu ${v.seat.n}" để cứu`, '#ff8a7a');
    if (ev && ev.type === 'bupbe' && ev.holder === v) { /* búp bê đi theo */ }
  }
  function returnViewer(v, silent) {
    if (!v || !v.taken) return;
    v.taken = false; v.anim = { type: 'return', t0: now() }; v.rescue = new Set();
    spark(v.seat.x, v.seat.y - 60 * v.seat.sc, 24, '255,220,140', 60, 120, 4);
    if (!silent) { sfx('incense', 1); toast(`✨ ${v.name} đã được kéo ra khỏi gương!`, '#ffd27a'); }
  }
  function takenTick(t) {
    for (const v of viewers.values()) if (v.taken && t - v.takenAt > S.takenReturnSec) { returnViewer(v, true); toast(`🌫 Hồn ${v.name} đã tự tìm đường về`, '#cfe0ff'); }
  }

  // ---------- hiệu ứng tức thì ----------
  function runInstant(type, by, opt) {
    const v = by ? viewers.get(by.id) : null;
    const count = opt.count || 1;
    switch (type) {
      case 'nhang': {
        oil = clamp(oil + 4 * count, 0, 100);
        if (v) throwLog(v); else spark(LX, LY - 60, 20, '255,170,60', 60, 160, 3);
        sfx('crackle', 0.7);
        if (by) floatText(`🪵 +${4 * count} củi`, v ? v.x : LX, v ? v.y - 110 * v.seat.sc : 1000, '#ffcf7a', 28);
        return;
      }
      case 'muoi': {
        yin = clamp(yin - 8 * count, 0, 100);
        for (let i = 0; i < 70; i++) particles.push({ x: rand(60, 1020), y: rand(640, 900), vx: rand(-30, 30), vy: rand(60, 200), life: rand(0.8, 1.8), max: 1.8, color: '240,240,255', size: rand(1.5, 3.5), g: 300 });
        sfx('salt', 0.9);
        if (by) toast(`🧂 ${by.name} rắc muối — âm khí giảm ${8 * count}`, '#e6f0ff');
        if (ghost.mode === 'behind') { ghost.mode = 'lurk'; ghost.nextMove = 0; }
        return;
      }
      case 'go': {
        doorShake = 1.4; sfx('knock'); yin = clamp(yin + 4, 0, 100); scareAll(0.5);
        if (by) toast(`🚪 ${by.name} gõ cửa… cộc, cộc, cộc`, '#ffb38a');
        return;
      }
      case 'hu': {
        let victim = null;
        if (opt.seat) { const s = seatByN(opt.seat); if (s && s.v && !s.v.taken && s.v !== v) victim = s.v; }
        if (!victim) { const cand = alive().filter(x => x !== v); victim = cand.length ? pick(cand) : null; }
        if (!victim) return;
        hands.push({ v: victim, t0: now() });
        victim.jump = 1; victim.shiver = 2.5; victim.hit = now();
        sfx('scream', 0.45, 0.35); shake = Math.max(shake, 5);
        toast(`🫣 ${by ? by.name : 'Ai đó'} hù ${victim.name}!`, '#ff9a7a');
        return;
      }
    }
  }
  const hands = [];
  const logsFly = [];   // khúc củi người xem ném vào lửa
  function throwLog(v) { logsFly.push({ x0: v.x, y0: v.y - 50 * v.seat.sc, t0: now(), rot: rand(0, TAU) }); }
  function drawLogsFly(t) {
    for (let i = logsFly.length - 1; i >= 0; i--) {
      const L0 = logsFly[i], p = (t - L0.t0) / 0.8;
      if (p >= 1) { logsFly.splice(i, 1); spark(LX, LY - 50, 26, '255,170,60', 70, 200, 3, 1.4); sfx('crackle', 0.9); continue; }
      const x = lerp(L0.x0, LX, p), y = lerp(L0.y0, LY - 40, p) - Math.sin(p * Math.PI) * 160;
      ctx.save(); ctx.translate(x, y); ctx.rotate(L0.rot + p * 8);
      ctx.fillStyle = '#5a3a20'; rr(-22, -6, 44, 12, 5); ctx.fill(); ctx.fillStyle = '#8a6a40'; ctx.beginPath(); ctx.ellipse(22, 0, 4, 6, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  function scareAll(k) { for (const v of alive()) if (Math.random() < k) { v.jump = Math.max(v.jump, rand(0.4, 1)); v.shiver = Math.max(v.shiver, 1); } }
  let shockAt = -99;
  function doJumpscare() {
    shockAt = now();
    const lvl = S.scare;
    sfx('jump', lvl === 'tat' ? 0.3 : 1);
    if (lvl === 'tat') return;
    shake = Math.max(shake, lvl === 'manh' ? 22 : 12);
    scareAll(0.9);
    if (lvl === 'nhe') return;
    jumpscare = { t0: now(), dur: lvl === 'manh' ? 0.9 : 0.75, big: lvl === 'manh' };
    if (lvl === 'manh') { flash = 0.5; flashColor = '255,240,240'; }
  }

  // ======================================================================
  // SỰ KIỆN TỪ TIKTOK
  // ======================================================================
  const PRAY_RE = /\b(nam mo|a di da|adida|nam moi a di da|niem phat|amen|nammo|namo)\b/;
  const FEAR_RE = /(\bso\b|so qua|hu hon|ghe qua|ron|eo oi|\boi\b|run qua|\ba+\b|\bhuhu)/;
  const LAUGH_RE = /(haha|hihi|hehe|kkk|=\)\)|:\)\)|\bhaa+|\bkk\b)/;
  let ghostLaughAt = 0;

  function onChat(user, text) {
    const raw = String(text || '').trim();
    const s = low(raw);
    const v = userTouch(user, 'chat');
    const t = now();
    // người trong gương: lời thì thầm
    if (v && v.taken) {
      if (raw) whispers.push({ text: short(raw, 34), name: short(v.name, 12), t0: t, x: use3D() && v.gx != null ? clamp(v.gx, 200, 880) : MIRROR.x + rand(-160, 160), y: use3D() && v.gy != null ? v.gy - 70 : MIRROR.y + rand(-40, 120) });
      if (whispers.length > 6) whispers.shift();
    } else if (v && raw && S.showBubbles) {
      v.bubble = { text: short(raw, 24), t0: t };
    }
    // cầu cơ: người mở bàn được hỏi trước, sau đó ai cũng hỏi bằng "hỏi: …"
    if (ev && ev.type === 'cauco' && ev.phase === 'ask') {
      const m = /^\s*(h[oỏ]i|hoi|q)\s*[:：\-]\s*(.+)$/i.exec(raw);
      if (m) { ouijaAsk(m[2], user); return; }
      if (ev.asker && ev.asker.id === user.id && raw.length >= 3) { ouijaAsk(raw, user); return; }
    }
    // cứu người trong gương: "cứu 12"
    const cm = /^\s*cuu\s*(?:so|ghe|#)?\s*(\d{1,2})\b/.exec(s);
    if (cm && v && !v.taken) {
      const seat = seatByN(+cm[1]);
      const tv = seat && seat.v;
      if (tv && tv.taken && !tv.rescue.has(v.id)) {
        tv.rescue.add(v.id);
        floatText(`🙏 ${tv.rescue.size}/${S.rescueNeed}`, use3D() && tv.gx != null ? tv.gx : MIRROR.x, use3D() && tv.gy != null ? tv.gy - 60 : MIRROR.y - 140, '#ffd27a', 30);
        if (tv.rescue.size >= S.rescueNeed) { for (const uid of tv.rescue) { const rv = viewers.get(uid); if (rv) addBrave(rv, 2); } returnViewer(tv); }
      }
      return;
    }
    // hù: "hù 12" (ghi nhớ cho món quà hù kế tiếp)
    const hm = /^\s*hu\s*(?:so|ghe|#)?\s*(\d{1,2})\b/.exec(s);
    if (hm) { huWish.set(user.id, { seat: +hm[1], t }); }
    // búp bê ma: người cầm gõ là chuyền
    if (ev && ev.type === 'bupbe' && v && ev.holder === v && t - ev.flyT > 0.9) {
      const nm = /(?:^|\D)(\d{1,2})(?:\D|$)/.exec(s);
      let to = null;
      if (nm) { const st = seatByN(+nm[1]); if (st && st.v && !st.v.taken && st.v !== v) to = st.v; }
      if (!to) { const others = alive().filter(x => x !== v); to = others.length ? pick(others) : null; }
      if (to) passDoll(to);
      return;
    }
    // ai bị nhập: gõ số ghế
    if (ev && ev.type === 'nhap') {
      const nm = /^\s*(?:so|ghe|#|la|to|nghi)?\s*(\d{1,2})\s*$/.exec(s);
      if (nm) {
        const n = +nm[1], st = seatByN(n);
        if (st && st.v && !st.v.taken) {
          const prev = ev.accuse.get(user.id);
          if (prev !== n) {
            if (prev) ev.tally.set(prev, (ev.tally.get(prev) || 1) - 1);
            ev.accuse.set(user.id, n); ev.tally.set(n, (ev.tally.get(n) || 0) + 1);
            sfx('vote', 0.5);
          }
        }
        return;
      }
    }
    // bình chọn
    if (vote) {
      const vm = /^\s*(?:so|chon|#)?\s*([1-9])\s*$/.exec(s);
      if (vm) { castVote(v, +vm[1] - 1, user); return; }
    }
    // niệm Phật xua ma
    if (PRAY_RE.test(s) && v && !v.taken) {
      if (t - v.prayAt > 20) {
        v.prayAt = t; yin = clamp(yin - 1.5, 0, 100);
        floatText('🙏', v.x, v.y - 110 * v.seat.sc, '#ffd27a', 34);
        spark(v.x, v.y - 60 * v.seat.sc, 6, '255,220,140', 20, 50, 2.5);
        if (t - v.prayBraveAt > 60) { v.prayBraveAt = t; addBrave(v, 1); }
        if (ghost.mode === 'behind' && ghost.behind === v) { ghost.mode = 'lurk'; ghost.nextMove = 0; toast(`🙏 ${v.name} niệm Phật — hồn ma lùi lại`, '#ffd27a'); }
      }
      return;
    }
    if (v && FEAR_RE.test(s)) v.shiver = Math.max(v.shiver, 2);
    if (v && LAUGH_RE.test(s)) { v.laugh = 1.5; if (yin > 40 && t - ghostLaughAt > 25 && Math.random() < 0.3) { ghostLaughAt = t; sfx('laugh', 0.35); toast('…có ai đó cười theo', '#c9a0ff'); } }
  }
  const huWish = new Map();

  function actionFor(gift, value) {
    const list = (S.actions || []).map(a => ({ ...a, def: ACTIONS.find(x => x.id === a.id) })).filter(a => a.def);
    const named = list.find(a => a.gift && gift && a.gift === gift.name);
    if (named) return named.id;
    let best = null;
    for (const a of list) if (value >= (+a.min || a.def.min) && (!best || (+a.min || 0) >= (+best.min || 0))) best = a;
    return best ? best.id : null;
  }
  function onGift(ev0) {
    const user = ev0.user, value = +ev0.value || 0, count = +ev0.count || 1;
    const v = userTouch(user, 'gift');
    const c = coinsOf.get(user.id) || { c: 0, name: user.name };
    c.c = Math.max(c.c + value, +ev0.total || 0); c.name = user.name; coinsOf.set(user.id, c);
    voteGift(user, value);
    // chọn hành động theo giá MỘT món quà; tặng nhiều (chuỗi hoa hồng…) thì nhân số lần cho nhang / muối
    const per = (ev0.gift && +ev0.gift.diamonds) || value / count;
    const id = actionFor(ev0.gift, per);
    if (!id) return;
    const def = ACTIONS.find(a => a.id === id);
    if (v && def && value >= 30) floatText(`${def.icon} ${def.label}`, v.x, v.y - 130 * v.seat.sc, '#ffd27a', 30);
    const opt = { count: id === 'nhang' || id === 'muoi' ? Math.min(count, 25) : 1 };
    if (id === 'hu') { const w = huWish.get(user.id); if (w && now() - w.t < 90) opt.seat = w.seat; }
    queueEvent(id, user, opt);
    if (BLOCKING.includes(id)) toast(`${def.icon} ${user.name} mở "${def.label}" — ${id !== 'trura' && (evQueue.length > 1 || ev || vote || story.phase === 'cast') ? 'đang xếp hàng' : 'bắt đầu!'}`, '#ffd27a');
  }

  function onEvent(e) {
    if (!e || !e.type) return;
    switch (e.type) {
      case 'chat': if (e.user) onChat(e.user, e.text); break;
      case 'gift': if (e.user) onGift(e); break;
      case 'like': {
        const v = e.user ? userTouch(e.user, 'like') : null;
        oil = clamp(oil + (+e.count || 1) * (+S.likeOil || 0.05), 0, 100);
        if (v && Math.random() < 0.3) floatText('♥', v.x + rand(-10, 10), v.y - 100 * v.seat.sc, '#ff6a8a', 24);
        break;
      }
      case 'follow': if (e.user) { const v = userTouch(e.user, 'chat'); oil = clamp(oil + 3, 0, 100); toast(`🪵 ${e.user.name} theo dõi — ném thêm một khúc củi`, '#ffd27a'); if (v) throwLog(v); } break;
      case 'share': if (e.user) { userTouch(e.user, 'chat'); oil = clamp(oil + 2, 0, 100); toast(`📣 ${e.user.name} rủ thêm người tới nghe chuyện`, '#ffe0b0'); } break;
      case 'member': if (e.user) lastJoiner = e.user.name; break;
      case 'viewers': viewersOnline = +e.count || 0; break;
    }
  }

  // ======================================================================
  // CẬP NHẬT
  // ======================================================================
  let lastGeneralAt = now() - 80;
  let lastT = now(), minuteAt = now(), sweepAt = now(), braveSendAt = now();
  function update(dt, t) {
    // dầu đèn cạn dần, âm khí dâng dần
    const blocking = ev && (ev.type === 'blackout' || ev.type === 'trura');
    if (!blocking && !story.paused && !traveling()) {
      oil = clamp(oil - dt * (0.28 + yin / 260) * (+S.lampDecay || 1), 0, 100);
      yin = clamp(yin + dt * 0.14 * (+S.yinRise || 1) * (oil < 30 ? 1.8 : 1), 0, 100);
    }
    if (oil <= 0 && !blocking && !traveling() && !(ev && ev.type === 'blackout') && !evQueue.some(x => x.type === 'blackout')) { oil = 0.01; queueEvent('blackout'); }
    if (yin >= 100 && !traveling() && !(ev && (ev.type === 'ghostauto' || ev.type === 'goihon')) && !evQueue.some(x => x.type === 'ghostauto')) { yin = 99; queueEvent('ghostauto'); }
    lampFlick = 1 + (Math.sin(t * 13) * 0.02 + Math.sin(t * 7.3) * 0.025 + (Math.random() - 0.5) * 0.03) * (0.6 + yin / 100);
    if (t < lampFlickUntil) lampFlick *= Math.random() < 0.35 ? 0.35 : 1;
    if (ev && ev.type === 'blackout' && t - ev.t0 < 5.2) lampFlick = 0;
    if (window.MaAudio) { MaAudio.setTension(yin / 100); if (MaAudio.setFire) MaAudio.setFire(oil > 0 ? oil / 100 : 0); }
    if (!use3D() && oil > 0 && Math.random() < dt * (3 + oil / 12)) particles.push({ x: LX + rand(-30, 30), y: LY - 60, vx: rand(-25, 25), vy: -rand(90, 220), life: rand(0.8, 2), max: 2, color: Math.random() < 0.5 ? '255,170,60' : '255,110,30', size: rand(1.2, 2.6), g: -10 });

    storyTick(dt);
    voteTick();
    eventRunner(t);
    ghostTick(dt, t);
    takenTick(t);

    if (story.phase === 'tell' && !ev && !vote && t - lastGeneralAt > 100) { lastGeneralAt = t; showGuide('general', 90); }
    if (t - minuteAt > 60) { minuteAt = t; for (const v of alive()) if (t - v.active < S.idleSeconds) addBrave(v, 1); }
    if (t - sweepAt > 3) { sweepAt = t; idleSweep(); }
    if (t - braveSendAt > 15 && braveDelta.size) { braveSendAt = t; if (isPrimary) socket.emit('ma:brave', [...braveDelta.values()]); braveDelta.clear(); }

    for (const v of [...viewers.values()]) {
      v.glow = Math.max(0, v.glow - dt * 0.45);
      v.shiver = Math.max(0, v.shiver - dt);
      v.jump = Math.max(0, v.jump - dt * 2.2);
      v.laugh = Math.max(0, v.laugh - dt);
      v.eyes = Math.max(0, v.eyes - dt);
      if (v.leaving) { v.alpha -= dt * 1.2; if (v.alpha <= 0) removeViewer(v); }
      else v.alpha = Math.min(1, v.alpha + dt * 2);
      if (v.anim) {
        const p = (t - v.anim.t0) / 1.3;
        if (p >= 1) v.anim = null;
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.life -= dt; if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; p.vx *= 0.99;
    }
    if (particles.length > 700) particles.splice(0, particles.length - 700);
    shake = Math.max(0, shake - dt * 30);
    flash = Math.max(0, flash - dt * 1.5);
    doorShake = Math.max(0, doorShake - dt);
    if (joinToasts.length && (!toasts.length || toasts.every(x => x.t0))) {
      const names = joinToasts.splice(0);
      toast(names.length === 1 ? `🔥 ${names[0]} vừa ngồi xuống cạnh đống lửa` : `🕯 ${names.slice(0, 2).join(', ')}${names.length > 2 ? ` và ${names.length - 2} người khác` : ''} vừa ngồi xuống`, '#ffe8c0');
    }
  }

  // ======================================================================
  // VẼ — nền tĩnh (vẽ một lần)
  // ======================================================================
  function paintMirrorFrame(g, cx, cy) {
    g.save();
    g.translate(cx, cy);
    const fr = g.createLinearGradient(-110, -150, 110, 150); fr.addColorStop(0, '#7a5a2a'); fr.addColorStop(0.5, '#3d2a12'); fr.addColorStop(1, '#6b4c22');
    g.fillStyle = fr; g.beginPath(); g.ellipse(0, 0, MIRROR.rx + 20, MIRROR.ry + 22, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(200,160,80,.45)'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, MIRROR.rx + 12, MIRROR.ry + 13, 0, 0, TAU); g.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.fillStyle = 'rgba(210,170,90,.6)'; g.beginPath(); g.arc(Math.cos(a) * (MIRROR.rx + 16), Math.sin(a) * (MIRROR.ry + 17), 4, 0, TAU); g.fill(); }
    g.fillStyle = '#5a401c'; g.beginPath(); g.moveTo(-26, -MIRROR.ry - 20); g.quadraticCurveTo(0, -MIRROR.ry - 56, 26, -MIRROR.ry - 20); g.fill();
    g.restore();
  }
  const mirrorCv = document.createElement('canvas'); mirrorCv.width = 260; mirrorCv.height = 360;
  paintMirrorFrame(mirrorCv.getContext('2d'), 130, 190);
  // cảnh 3D (ma3d.js): đồng lúa / bụi chuối; 'nhacu' = nhà cổ 2D
  let curMap = 'dong', mapFlip = 0;
  // cảnh hợp với từng truyện khi để "tự đổi"
  const SCENE_FOR = {
    'ma-da': 'bendo', 'chuyen-do': 'bendo', 'anh-thua': 'bendo', 'cay-da': 'cayda', 'bup-be': 'gieng', 'mieu-hoang': 'mieu',
    'tau-dem': 'duongray', 'quan-chao': 'nghiadia', 'dam-ma-nguoc': 'nghiadia', 'xe-om': 'nghiadia', 'cuoc-goi': 'nghiadia',
    'rung-tram': 'rungtre', 'phong-bi-do': 'rungtre', 'ma-lai': 'chuoi', 'live-3h': 'chuoi', 'xe-dem': 'dong',
    've-so': 'choma', 'ma-xo': 'nhahoang', 'phong-tro': 'nhahoang', 'guong-dem': 'nhahoang', 'ao-cuoi': 'nhahoang', 'meo-den': 'nhahoang',
    'tang-4': 'nhahoang', 'nha-xac': 'nhahoang', 'ky-tuc-xa': 'nhahoang', 'phong-nhac': 'nhahoang', 'bac-13': 'nhahoang', 'biet-thu': 'nhahoang',
    'nguoi-thu-13': 'dinh', 'dua-goi-hon': 'dinh',
  };
  function pickMap(next, st) {
    const m = S.map || 'auto';
    const all = (window.MA3D && MA3D.maps) || ['dong', 'chuoi'];
    if (m !== 'auto') curMap = m;
    else if (next) curMap = (st && SCENE_FOR[st.id] && all.includes(SCENE_FOR[st.id]) && Math.random() < 0.75) ? SCENE_FOR[st.id] : all[mapFlip++ % all.length];
    const gl = document.getElementById('gl'); if (gl) gl.style.display = curMap === 'nhacu' ? 'none' : 'block';
    if (curMap === 'nhacu') { setLayout(null); if (window.MA3D && MA3D.invalidate) MA3D.invalidate(); }
    else if (window.MA3D && MA3D.relayout) MA3D.relayout();
  }
  const use3D = () => !!(window.MA3D && MA3D.ready) && curMap !== 'nhacu';
  const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
  const WALL_TOP = 600, FLOOR_Y = 940;
  (function paintBG() {
    const g = bg.getContext('2d');
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.fillStyle = '#070405'; g.fillRect(0, 0, W, H);
    // tường ván gỗ
    const wg = g.createLinearGradient(0, WALL_TOP, 0, FLOOR_Y);
    wg.addColorStop(0, '#2a1a12'); wg.addColorStop(1, '#3b261a');
    g.fillStyle = wg; g.fillRect(0, WALL_TOP, W, FLOOR_Y - WALL_TOP);
    for (let x = 0; x < W; x += 54) {
      const l = 0.85 + rnd() * 0.3;
      g.fillStyle = `rgba(${60 * l | 0},${38 * l | 0},${26 * l | 0},.55)`; g.fillRect(x + 2, WALL_TOP, 50, FLOOR_Y - WALL_TOP);
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x, WALL_TOP, 3, FLOOR_Y - WALL_TOP);
      g.strokeStyle = 'rgba(20,10,5,.35)'; g.lineWidth = 1;
      for (let k = 0; k < 4; k++) { g.beginPath(); const gx = x + 8 + rnd() * 38; g.moveTo(gx, WALL_TOP); g.bezierCurveTo(gx + rnd() * 8 - 4, WALL_TOP + 120, gx + rnd() * 8 - 4, WALL_TOP + 220, gx + rnd() * 6 - 3, FLOOR_Y); g.stroke(); }
    }
    // xà ngang trên trần
    const bm = g.createLinearGradient(0, WALL_TOP - 30, 0, WALL_TOP + 26);
    bm.addColorStop(0, '#120a06'); bm.addColorStop(0.5, '#3a2416'); bm.addColorStop(1, '#140b07');
    g.fillStyle = bm; g.fillRect(0, WALL_TOP - 28, W, 54);
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, WALL_TOP + 24, W, 8);
    // chân tường
    g.fillStyle = '#1a0f09'; g.fillRect(0, FLOOR_Y - 14, W, 16);
    // sàn gỗ phối cảnh
    const fg = g.createLinearGradient(0, FLOOR_Y, 0, H);
    fg.addColorStop(0, '#2b1b12'); fg.addColorStop(1, '#170e09');
    g.fillStyle = fg; g.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2;
    for (let i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(LX + i * 46, FLOOR_Y); g.lineTo(LX + i * 190, H); g.stroke(); }
    for (let y = FLOOR_Y + 20, k = 1; y < H; k *= 1.16, y += 22 * k) { g.globalAlpha = 0.25; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); g.globalAlpha = 1; }
    // chiếu cói (hình thang phối cảnh)
    g.save();
    const mt = 920, mb = 1480, mtw = 420, mbw = 640;
    g.beginPath(); g.moveTo(LX - mtw, mt); g.lineTo(LX + mtw, mt); g.lineTo(LX + mbw, mb); g.lineTo(LX - mbw, mb); g.closePath();
    const mg = g.createLinearGradient(0, mt, 0, mb); mg.addColorStop(0, '#5a4630'); mg.addColorStop(1, '#3d2e1f');
    g.fillStyle = mg; g.fill(); g.clip();
    g.strokeStyle = 'rgba(30,20,10,.35)'; g.lineWidth = 1.5;
    for (let i = -40; i <= 40; i++) { g.beginPath(); g.moveTo(LX + i * 14, mt); g.lineTo(LX + i * 22, mb); g.stroke(); }
    for (let y = mt; y < mb; y += 9) { g.globalAlpha = 0.35; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(140,30,30,.55)'; g.lineWidth = 10;
    g.beginPath(); g.moveTo(LX - mtw + 20, mt + 16); g.lineTo(LX + mtw - 20, mt + 16); g.lineTo(LX + mbw - 30, mb - 22); g.lineTo(LX - mbw + 30, mb - 22); g.closePath(); g.stroke();
    g.restore();
    // cửa sổ song gỗ, trăng
    const wx = 232, wy = 652, ww = 186, wh = 200;
    const sky = g.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#0d1630'); sky.addColorStop(1, '#1d2440');
    g.fillStyle = sky; g.fillRect(wx, wy, ww, wh);
    const mgl = g.createRadialGradient(wx + 120, wy + 62, 6, wx + 120, wy + 62, 90);
    mgl.addColorStop(0, 'rgba(230,235,255,.9)'); mgl.addColorStop(0.25, 'rgba(200,210,240,.35)'); mgl.addColorStop(1, 'rgba(120,140,200,0)');
    g.fillStyle = mgl; g.fillRect(wx, wy, ww, wh);
    g.fillStyle = '#eef0f8'; g.beginPath(); g.arc(wx + 120, wy + 62, 24, 0, TAU); g.fill();
    g.fillStyle = 'rgba(160,165,185,.5)'; g.beginPath(); g.arc(wx + 112, wy + 56, 6, 0, TAU); g.arc(wx + 128, wy + 70, 4, 0, TAU); g.fill();
    g.fillStyle = '#21140c';
    for (let i = 1; i < 6; i++) g.fillRect(wx + i * ww / 6 - 4, wy, 8, wh);
    g.fillRect(wx, wy + wh / 2 - 4, ww, 8);
    g.strokeStyle = '#1a0f08'; g.lineWidth = 14; g.strokeRect(wx - 7, wy - 7, ww + 14, wh + 14);
    // bậu cửa
    g.fillStyle = '#2c1b10'; g.fillRect(wx - 18, wy + wh + 6, ww + 36, 14);
    // gương cổ (khung)
    paintMirrorFrame(g, MIRROR.x, MIRROR.y);
    // bàn thờ + di ảnh
    const ax = 690, aw = 330;
    const px = 790, py = 640, pw = 130, ph = 160;
    g.fillStyle = '#1b0f08'; g.fillRect(px - 12, py - 12, pw + 24, ph + 24);
    g.strokeStyle = '#8a6a30'; g.lineWidth = 3; g.strokeRect(px - 8, py - 8, pw + 16, ph + 16);
    const pg = g.createLinearGradient(0, py, 0, py + ph); pg.addColorStop(0, '#9a9a96'); pg.addColorStop(1, '#5d5d5a');
    g.fillStyle = pg; g.fillRect(px, py, pw, ph);
    g.fillStyle = 'rgba(40,40,40,.85)'; g.beginPath(); g.ellipse(px + pw / 2, py + 62, 30, 38, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(px + 14, py + ph); g.quadraticCurveTo(px + pw / 2, py + 86, px + pw - 14, py + ph); g.fill();
    g.fillStyle = 'rgba(25,25,25,.9)'; g.beginPath(); g.ellipse(px + pw / 2, py + 44, 34, 22, 0, Math.PI, TAU); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.moveTo(px + pw - 40, py - 8); g.lineTo(px + pw + 8, py - 8); g.lineTo(px + pw + 8, py + 40); g.closePath(); g.fill();
    g.fillStyle = '#4a0d0d'; g.fillRect(ax, 852, aw, 90);
    g.fillStyle = '#6e1414'; g.fillRect(ax, 852, aw, 14);
    g.strokeStyle = 'rgba(220,170,60,.55)'; g.lineWidth = 2; g.strokeRect(ax + 10, 872, aw - 20, 56);
    g.font = `700 22px ${SERIF}`; g.fillStyle = 'rgba(230,180,70,.55)'; g.textAlign = 'center'; g.fillText('福', ax + aw / 2, 908);
    g.fillStyle = '#2a1408'; g.fillRect(ax - 6, 842, aw + 12, 12);
    // bát hương
    g.fillStyle = '#5d4b33'; g.beginPath(); g.ellipse(ax + aw / 2, 836, 30, 9, 0, 0, TAU); g.fill();
    g.fillStyle = '#7a6444'; g.beginPath(); g.moveTo(ax + aw / 2 - 30, 836); g.quadraticCurveTo(ax + aw / 2, 870, ax + aw / 2 + 30, 836); g.fill();
    // đĩa quả
    for (const [dx, col] of [[-82, '#a33a1a'], [-70, '#c79a2a'], [-94, '#6a8a2a'], [-80, '#b8432a']]) { g.fillStyle = col; g.beginPath(); g.arc(ax + aw / 2 + dx, 832 - (dx === -80 ? 10 : 0), 9, 0, TAU); g.fill(); }
    g.fillStyle = '#ccc8b8'; g.beginPath(); g.ellipse(ax + aw / 2 - 82, 840, 26, 6, 0, 0, TAU); g.fill();
    // hai cây nến đỏ
    for (const cx of [ax + 30, ax + aw - 30]) { g.fillStyle = '#8a1a14'; g.fillRect(cx - 7, 800, 14, 42); g.fillStyle = '#b8862a'; g.fillRect(cx - 12, 838, 24, 6); }
    // bùa vàng treo trên xà
    for (const [bx, len] of [[175, 120], [980, 100]]) {
      g.fillStyle = '#c9a23a'; g.fillRect(bx - 14, WALL_TOP + 24, 28, len);
      g.strokeStyle = '#8a1a14'; g.lineWidth = 2.5; g.beginPath();
      for (let k = 0; k < 6; k++) { const yy = WALL_TOP + 36 + k * (len - 24) / 6; g.moveTo(bx - 8, yy); g.quadraticCurveTo(bx + 10, yy + 5, bx - 6, yy + 12); }
      g.stroke();
    }
    // mạng nhện góc
    for (const [cx, sx] of [[0, 1], [W, -1]]) {
      g.strokeStyle = 'rgba(200,200,210,.18)'; g.lineWidth = 1;
      for (let k = 0; k < 7; k++) { const a = k / 6 * Math.PI / 2; g.beginPath(); g.moveTo(cx, WALL_TOP + 26); g.lineTo(cx + sx * Math.cos(a) * 150, WALL_TOP + 26 + Math.sin(a) * 150); g.stroke(); }
      for (let r = 30; r <= 150; r += 30) { g.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI / 2; const xx = cx + sx * Math.cos(a) * r, yy = WALL_TOP + 26 + Math.sin(a) * r; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); }
    }
    // tối viền
    const vg = g.createRadialGradient(LX, 1050, 300, LX, 1050, 1150);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.75)');
    g.fillStyle = vg; g.fillRect(0, WALL_TOP - 30, W, H);
  })();
  const door = document.createElement('canvas'); door.width = 190; door.height = 320;
  (function paintDoor() {
    const g = door.getContext('2d');
    g.fillStyle = '#140b06'; g.fillRect(0, 0, 190, 320);
    for (const [x0, w] of [[10, 82], [98, 82]]) {
      const dg = g.createLinearGradient(x0, 0, x0 + w, 0); dg.addColorStop(0, '#3a2414'); dg.addColorStop(1, '#2a190e');
      g.fillStyle = dg; g.fillRect(x0, 10, w, 310);
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 3; g.strokeRect(x0 + 10, 26, w - 20, 120); g.strokeRect(x0 + 10, 160, w - 20, 140);
    }
    g.fillStyle = '#9a7a3a'; g.beginPath(); g.arc(86, 170, 6, 0, TAU); g.arc(104, 170, 6, 0, TAU); g.fill();
    g.fillStyle = 'rgba(0,0,0,.9)'; g.fillRect(93, 10, 4, 310);
  })();

  // ======================================================================
  // VẼ — mỗi khung hình
  // ======================================================================
  const dk = document.createElement('canvas'); dk.width = W / 2; dk.height = H / 2;
  const dctx = dk.getContext('2d');
  const dust = Array.from({ length: 46 }, () => ({ x: rand(200, 880), y: rand(820, 1350), vx: rand(-6, 6), vy: rand(-8, -2), s: rand(1, 2.6), p: rand(0, TAU) }));
  const fog = Array.from({ length: 7 }, (_, i) => ({ x: rand(0, W), y: rand(1180, 1520), r: rand(220, 380), v: rand(8, 20) * (i % 2 ? 1 : -1) }));

  function lampRadius() { return oil > 0 ? (230 + oil * 4.9) * lampFlick : 0; }
  function lightAt(x, y) {
    const R = lampRadius(); if (R <= 0) return 0;
    const dx = x - LX, dy = (y - LY + 60) / 0.8;
    return clamp(1 - Math.hypot(dx, dy) / R, 0, 1);
  }

  function drawScene(t) {
    const D3 = use3D();
    if (!D3) drawRoom(t);
    sceneRest(t, D3);
  }
  function drawRoom(t) {
    ctx.drawImage(bg, 0, 0);
    // cửa ra vào (rung khi gõ)
    const ds = doorShake > 0 ? Math.sin(t * 60) * 4 * doorShake : 0;
    ctx.drawImage(door, 26 + ds, 622);
    // bóng tre lay ngoài cửa sổ
    ctx.save(); ctx.beginPath(); ctx.rect(232, 652, 186, 200); ctx.clip();
    ctx.strokeStyle = 'rgba(5,8,15,.75)'; ctx.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      const bx = 250 + i * 60 + Math.sin(t * 0.7 + i) * 8;
      ctx.beginPath(); ctx.moveTo(bx, 860); ctx.quadraticCurveTo(bx + 14 + Math.sin(t * 0.9 + i) * 10, 750, bx + 4, 640); ctx.stroke();
      ctx.fillStyle = 'rgba(5,8,15,.75)';
      for (let k = 0; k < 4; k++) { const ly = 680 + k * 40, lx = bx + 8 + Math.sin(t * 1.1 + k + i) * 6; ctx.beginPath(); ctx.ellipse(lx + 18, ly, 22, 5, -0.4 + Math.sin(t + k) * 0.15, 0, TAU); ctx.fill(); }
    }
    if (windowShadow) {
      const p = (t - windowShadow.t0) / 3;
      if (p > 1) windowShadow = null;
      else { const sx = 200 + p * 260; ctx.fillStyle = 'rgba(0,0,0,.92)'; ctx.beginPath(); ctx.ellipse(sx, 720, 22, 28, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(sx - 40, 860); ctx.quadraticCurveTo(sx, 730, sx + 40, 860); ctx.fill(); }
    }
    ctx.restore();
    drawMirror(t);
    // khói nhang trên bàn thờ
    ctx.save(); ctx.strokeStyle = 'rgba(200,200,210,.12)'; ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); const bx = 852 + (k - 1) * 8; ctx.moveTo(bx, 820); for (let y = 0; y < 160; y += 10) ctx.lineTo(bx + Math.sin(t * 1.2 + y * 0.05 + k) * (y * 0.12), 820 - y); ctx.stroke(); }
    ctx.restore();
    // chân hương
    ctx.strokeStyle = '#7a1f14'; ctx.lineWidth = 2; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(855, 834); ctx.lineTo(855 + k * 8, 812); ctx.stroke(); }
    // mắt trên di ảnh khi âm khí cao
    if (yin > 60 && Math.sin(t * 0.5) > 0.3) { ctx.fillStyle = `rgba(255,40,30,${0.5 + Math.sin(t * 4) * 0.3})`; ctx.beginPath(); ctx.arc(844, 702, 3, 0, TAU); ctx.arc(866, 702, 3, 0, TAU); ctx.fill(); }
  }
  function sceneRest(t, D3) {

    // sương sàn
    for (const f of fog) {
      f.x += f.v / 60; if (f.x > W + f.r) f.x = -f.r; if (f.x < -f.r) f.x = W + f.r;
      const fg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      fg.addColorStop(0, 'rgba(160,170,190,.07)'); fg.addColorStop(1, 'rgba(160,170,190,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.35, 0, 0, TAU); ctx.fill();
    }
    // người ngồi sau đèn
    const list = [...viewers.values()].sort((a, b) => a.seat.y - b.seat.y);
    for (const v of list) if (v.seat.y <= LY) drawViewer(v, t);
    if (!D3) drawLamp(t);
    for (const v of list) if (v.seat.y > LY) drawViewer(v, t);
    // tay ma thò ra hù
    for (let i = hands.length - 1; i >= 0; i--) {
      const h = hands[i], p = (t - h.t0) / 1.6;
      if (p > 1 || !viewers.has(h.v.id)) { hands.splice(i, 1); continue; }
      const v = h.v, sc = v.seat.sc, up = Math.sin(Math.min(1, p) * Math.PI);
      ctx.save(); ctx.translate(v.x - 34 * sc, v.y - 70 * sc); ctx.scale(sc, sc); ctx.globalAlpha = up;
      ctx.strokeStyle = 'rgba(220,228,245,.95)'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-60, 70); ctx.quadraticCurveTo(-50, 10, -8 * up, -20 * up); ctx.stroke();
      ctx.lineWidth = 4; for (let f = -2; f <= 2; f++) { ctx.beginPath(); ctx.moveTo(-8 * up, -20 * up); ctx.lineTo(-8 * up + 10 + f * 3, -20 * up - 14 + Math.abs(f) * 3); ctx.stroke(); }
      ctx.restore();
    }
    // bụi bay trong ánh đèn
    const R = lampRadius();
    for (const d of dust) {
      d.x += d.vx / 60; d.y += d.vy / 60; d.p += 0.02;
      if (d.y < 760 || Math.abs(d.x - LX) > 420) { d.x = rand(240, 840); d.y = rand(1100, 1350); }
      const l = lightAt(d.x, d.y); if (l <= 0) continue;
      ctx.fillStyle = `rgba(255,220,160,${0.35 * l * (0.6 + Math.sin(d.p) * 0.4)})`; ctx.beginPath(); ctx.arc(d.x, d.y, d.s, 0, TAU); ctx.fill();
    }
    drawLogsFly(t);
    // hạt
    for (const p of particles) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = `rgba(${p.color},${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
    // ===== bóng tối =====
    const dmax = D3 ? 0.5 : 0.93;   // cảnh 3D đã có ánh trăng / ánh đèn thật, chỉ phủ tối nhẹ
    const base = ev && ev.type === 'trura' ? lerp(0.35, dmax, clamp((now() - ev.t0) / ev.dur, 0, 1)) : oil <= 0 || lampFlick === 0 ? (D3 ? 0.9 : 0.975) : dmax;
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, dk.width, dk.height);
    dctx.fillStyle = `rgba(3,2,6,${base})`; dctx.fillRect(0, 0, dk.width, dk.height);
    dctx.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a = 1, sy = 1) => {
      if (r <= 0) return;
      dctx.save(); dctx.translate(x / 2, y / 2); dctx.scale(1, sy);
      const g = dctx.createRadialGradient(0, 0, 0, 0, 0, r / 2);
      g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.82})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g; dctx.beginPath(); dctx.arc(0, 0, r / 2, 0, TAU); dctx.fill(); dctx.restore();
    };
    hole(LX, LY - 60, R, 1, 0.8);
    hole(LX, LY - 230, R * 0.55, 0.5);
    if (!D3) { for (const cx of [720, 990]) hole(cx, 790, 120 + Math.sin(t * 9 + cx) * 6, 0.8); hole(325, 752, 190, 0.55); }
    else hole(LX, 760, 1150, 0.4, 0.42);   // dải cảnh phía sau (cây đa, giếng, miếu…) sáng hơn một chút dưới trăng
    if (!D3) hole(MIRROR.x, MIRROR.y, 210, seated().some(v => v.taken) ? 0.55 : 0.25);
    for (const v of viewers.values()) if (v.incense > t) hole(v.x + 22 * v.seat.sc, v.y - 30 * v.seat.sc, 70, 0.5);
    if (ev && ev.type === 'cauco') hole(OUIJA.cx, OUIJA.cy, 900, 0.7, 0.6);
    ctx.drawImage(dk, 0, 0, W, H);
    // ánh lửa ấm
    if (R > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const wg = ctx.createRadialGradient(LX, LY - 60, 10, LX, LY - 60, R * 0.85);
      wg.addColorStop(0, 'rgba(255,150,50,.22)'); wg.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = wg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // ===== các thứ phát sáng (vẽ trên bóng tối) =====
    if (!D3) drawFlame(LX, LY - 50 * LAMP, LAMP * 0.95, t, R > 0 ? lampFlick : 0);
    if (!D3) for (const cx of [720, 990]) drawFlame(cx, 796, 0.45, t + cx, 1);
    for (const v of viewers.values()) if (v.incense > t) { ctx.fillStyle = `rgba(255,120,40,${0.7 + Math.sin(t * 6 + v.seat.n) * 0.3})`; ctx.beginPath(); ctx.arc(v.x + 22 * v.seat.sc, v.y - 50 * v.seat.sc, 3, 0, TAU); ctx.fill(); }
    // mắt trong bóng tối
    for (const e of eyes) {
      const age = t - e.t0, a = Math.min(1, age / 0.8, (e.life - age) / 0.8);
      if ((age + e.blink) % 4 < 0.15) continue;
      if (lightAt(e.x, e.y) > 0.15) continue;
      const col = e.red ? '255,40,30' : '230,230,170';
      for (const sx of [-1, 1]) {
        const ex = e.x + sx * 11 * e.s, gl = ctx.createRadialGradient(ex, e.y, 0, ex, e.y, 9 * e.s);
        gl.addColorStop(0, `rgba(${col},${a})`); gl.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(ex, e.y, 9 * e.s, 0, TAU); ctx.fill();
      }
    }
    // hồn ma
    if (ghost.a > 0.01) drawGhost(ghost.x, ghost.y, ghost.sc, ghost.a, t, { red: yin > 60, reach: ghost.mode === 'rush' ? 1 : ghost.mode === 'behind' ? 0.35 : 0 });
    // chữ trên đầu người xem (tối đa 8 bong bóng bình luận mới nhất)
    bubbleSet = new Set(list.filter(v => v.bubble && !v.taken && t - v.bubble.t0 < 3.4).sort((a, b) => b.bubble.t0 - a.bubble.t0).slice(0, 8).map(v => v.id));
    // tên chồng lên nhau thì ẩn bớt: ưu tiên người được gọi tên, thầy pháp, người vừa bình luận, bị tố, người ngồi gần máy quay
    const pri = v => (v.glow > 0 ? 100 : 0) + (isThay(v) ? 90 : 0) + (bubbleSet.has(v.id) ? 60 : 0) + (ev && ev.type === 'nhap' && ev.tally.get(v.seat.n) ? 70 : 0) + (v.seat.sc || 1) * 30;
    const rects = [];
    for (const v of [...list].sort((a, b) => pri(b) - pri(a))) {
      if (v.taken) continue;
      const sc = v.dsc || v.seat.sc, nfs = 13 + 8 * sc, w = (v.nameW || 60) * nfs / 22 + 14 + (D3 ? nfs * 1.6 : 0);
      const r = { x0: v.x - w / 2 - (D3 ? nfs * 1.2 : 0), x1: v.x + w / 2, y0: v.y + 16 * sc - nfs * 0.65, y1: v.y + 16 * sc + nfs * 0.65 };
      const hit = rects.some(q => { const ox = Math.min(r.x1, q.x1) - Math.max(r.x0, q.x0), oy = Math.min(r.y1, q.y1) - Math.max(r.y0, q.y0); return ox > 0 && oy > 0 && ox * oy > 0.3 * (r.x1 - r.x0) * (r.y1 - r.y0); });
      v.hideName = hit && pri(v) < 60;
      if (!v.hideName) rects.push(r);
    }
    for (const v of list) drawViewerLabel(v, t);
    drawWhispers(t);
    // ánh sáng trừ tà
    if (ev && ev.type === 'trura') {
      const p = clamp((t - ev.t0) / ev.dur, 0, 1);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(LX, LY - 80, 0, LX, LY - 80, 900 * ease(p * 2));
      gg.addColorStop(0, `rgba(255,210,120,${0.22 * (1 - p)})`); gg.addColorStop(1, 'rgba(255,200,100,0)');
      ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = `rgba(255,220,140,${0.6 * (1 - p)})`; ctx.lineWidth = 4;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(LX, LY - 80, (p * 900 + k * 120) % 900, 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
  }

  // đống lửa củi: vòng đá, củi xếp chéo, lửa cao theo lượng củi (biến oil), than hồng khi sắp tắt
  const STONES = Array.from({ length: 13 }, (_, i) => ({ a: i / 13 * TAU + rand(-0.1, 0.1), r: rand(0.9, 1.15), s: rand(0.8, 1.2), c: 48 + Math.floor(rand(0, 30)) }));
  const LOGS = [[-0.5, 1, 0.9], [0.55, 0.95, 0.85], [-0.15, 1.05, 2.4], [0.25, 0.9, 2.2], [0, 1.1, 1.57]];
  function drawLamp(t) {
    ctx.save(); ctx.translate(LX, LY); ctx.scale(LAMP, LAMP);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(0, 6, 78, 22, 0, 0, TAU); ctx.fill();
    const ash = ctx.createRadialGradient(0, 0, 4, 0, 0, 62); ash.addColorStop(0, oil > 0 ? 'rgba(255,120,40,.55)' : 'rgba(120,40,20,.4)'); ash.addColorStop(0.5, 'rgba(60,40,30,.9)'); ash.addColorStop(1, 'rgba(30,24,20,.95)');
    ctx.fillStyle = ash; ctx.beginPath(); ctx.ellipse(0, 0, 60, 17, 0, 0, TAU); ctx.fill();
    const stone = (st, front) => { const x = Math.cos(st.a) * 64 * st.r, y = Math.sin(st.a) * 18 * st.r; if ((y > 0) !== front) return; ctx.fillStyle = `rgb(${st.c},${st.c - 4},${st.c - 8})`; ctx.beginPath(); ctx.ellipse(x, y - 4, 13 * st.s, 9 * st.s, 0, 0, TAU); ctx.fill(); ctx.fillStyle = `rgba(255,140,60,${0.15 + oil / 400})`; ctx.beginPath(); ctx.ellipse(x - 2, y - 9, 8 * st.s, 3 * st.s, 0, 0, TAU); ctx.fill(); };
    for (const st of STONES) stone(st, false);
    for (const [ox, len, ang] of LOGS) {   // củi xếp chéo
      ctx.save(); ctx.translate(ox * 28, -6); ctx.rotate(ang - Math.PI / 2); ctx.scale(1, 0.55);
      const lg = ctx.createLinearGradient(0, -9, 0, 9); lg.addColorStop(0, '#6a4428'); lg.addColorStop(0.5, '#3e2614'); lg.addColorStop(1, '#22140a');
      ctx.fillStyle = lg; rr(-48 * len, -9, 96 * len, 18, 8); ctx.fill();
      ctx.fillStyle = oil > 0 ? `rgba(255,${110 + Math.sin(t * 5 + ox * 9) * 40 | 0},30,.85)` : 'rgba(140,40,10,.6)';
      ctx.beginPath(); ctx.ellipse(-48 * len + 4, 0, 6, 8, 0, 0, TAU); ctx.ellipse(48 * len - 4, 0, 6, 8, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    for (const st of STONES) stone(st, true);
    ctx.restore();
  }
  // ngọn lửa: nhiều lưỡi lửa, cao theo lượng củi; k = độ chập chờn (0 = tắt, chỉ còn than)
  function drawFlame(x, y, s, t, k) {
    const size = clamp(oil / 100, 0, 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (k <= 0 || oil <= 0) {
      const eg = ctx.createRadialGradient(x, y + 40 * s, 0, x, y + 40 * s, 50 * s);
      eg.addColorStop(0, `rgba(255,80,20,${0.35 + Math.sin(t * 3) * 0.1})`); eg.addColorStop(1, 'rgba(255,40,0,0)');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(x, y + 40 * s, 50 * s, 0, TAU); ctx.fill(); ctx.restore(); return;
    }
    const H = (55 + size * 120) * s * Math.min(1.15, k), Wd = (26 + size * 30) * s;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, H * 1.6);
    halo.addColorStop(0, 'rgba(255,150,60,.5)'); halo.addColorStop(1, 'rgba(255,90,30,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, H * 1.6, 0, TAU); ctx.fill();
    const base = y + 30 * s, tongues = 7;
    for (let i = 0; i < tongues; i++) {
      const off = (i / (tongues - 1) - 0.5) * Wd * 1.6;
      const ph = t * (6 + i * 0.9) + i * 2.1;
      const h = H * (0.55 + 0.45 * Math.abs(Math.sin(ph * 0.5 + i))) * (1 - Math.abs(off) / (Wd * 1.4));
      const sway = Math.sin(ph) * 6 * s + Math.sin(t * 2.3) * 4 * s, w = Wd * 0.55;
      const g = ctx.createLinearGradient(0, base, 0, base - h);
      g.addColorStop(0, 'rgba(255,220,120,.95)'); g.addColorStop(0.35, 'rgba(255,140,40,.85)'); g.addColorStop(0.75, 'rgba(230,60,20,.6)'); g.addColorStop(1, 'rgba(160,20,10,0)');
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(x + off - w, base);
      ctx.bezierCurveTo(x + off - w * 0.9, base - h * 0.45, x + off + sway - w * 0.3, base - h * 0.7, x + off + sway * 1.6, base - h);
      ctx.bezierCurveTo(x + off + sway + w * 0.3, base - h * 0.7, x + off + w * 0.9, base - h * 0.45, x + off + w, base);
      ctx.closePath(); ctx.fill();
    }
    const core = ctx.createRadialGradient(x, base - 10 * s, 0, x, base - 10 * s, Wd * 0.9);
    core.addColorStop(0, 'rgba(255,250,210,.95)'); core.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = core; ctx.beginPath(); ctx.ellipse(x, base - 12 * s, Wd * 0.9, Wd * 0.6, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function viewerPos(v, t) {
    let x = v.seat.x, y = v.seat.y, a = v.alpha, sc = v.seat.sc;
    if (v.anim && v.anim.type === 'take') {
      const p = ease((t - v.anim.t0) / 1.3);
      x = lerp(v.seat.x, MIRROR.x, p); y = lerp(v.seat.y, MIRROR.y + 40, p); sc *= 1 - p * 0.6; a *= 1 - p;
    } else if (v.taken) a = 0;
    else if (v.anim && v.anim.type === 'return') {
      const p = ease((t - v.anim.t0) / 1.3);
      x = lerp(MIRROR.x, v.seat.x, p); y = lerp(MIRROR.y + 40, v.seat.y, p); sc *= 0.4 + p * 0.6; a *= p;
    }
    if (v.shiver > 0) x += Math.sin(t * 70 + v.seat.n) * 2.5 * Math.min(1, v.shiver);
    if (v.jump > 0) y -= Math.sin(v.jump * Math.PI) * 26 * sc;
    if (v.laugh > 0) y -= Math.abs(Math.sin(t * 14)) * 5 * sc;
    v.x = x; v.y = y; v.dsc = sc; v.da = a;
    return { x, y, sc, a };
  }
  function drawViewer(v, t) {
    const { x, y, sc, a } = viewerPos(v, t);
    if (use3D() && v.has3d && (v.anim || v.taken || (MA3D.busy && MA3D.busy()))) return;
    if (use3D() && v.has3d && !v.anim && !v.taken) {   // nhân vật 3D: chỉ vẽ mũ thầy pháp / mắt đỏ lên đầu
      const hx = v.hx, hy = v.hy + HEAD3D * sc;
      if (isThay(v)) {
        const gg = ctx.createRadialGradient(hx, hy, 6, hx, hy, 80 * sc); gg.addColorStop(0, 'rgba(255,210,100,.4)'); gg.addColorStop(1, 'rgba(255,200,80,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(hx, hy, 80 * sc, 0, TAU); ctx.fill();
        ctx.fillStyle = '#c9962a'; ctx.beginPath(); ctx.moveTo(hx - 26 * sc, hy - 24 * sc); ctx.lineTo(hx, hy - 58 * sc); ctx.lineTo(hx + 26 * sc, hy - 24 * sc); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#8a1a14'; ctx.fillRect(hx - 28 * sc, hy - 28 * sc, 56 * sc, 6 * sc);
      }
      if (v.eyes > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const sx of [-1, 1]) { const ex = hx + sx * 7 * sc, ey = hy + 2 * sc; const gl = ctx.createRadialGradient(ex, ey, 0, ex, ey, 11 * sc); gl.addColorStop(0, 'rgba(255,60,40,1)'); gl.addColorStop(1, 'rgba(255,0,0,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(ex, ey, 11 * sc, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
      return;
    }
    if (v.taken && !(v.anim && v.anim.type === 'take')) {
      // ghế trống còn hơi lạnh
      ctx.fillStyle = 'rgba(160,190,255,.12)'; ctx.beginPath(); ctx.ellipse(v.seat.x, v.seat.y + 10, 40 * v.seat.sc, 10 * v.seat.sc, 0, 0, TAU); ctx.fill();
      return;
    }
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a;
    const thay = isThay(v);
    if (thay) {
      const gg = ctx.createRadialGradient(x, y - 50 * sc, 10, x, y - 50 * sc, 90 * sc);
      gg.addColorStop(0, 'rgba(255,210,100,.45)'); gg.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y - 50 * sc, 90 * sc, 0, TAU); ctx.fill();
    }
    ctx.drawImage(v.spr, x - 60 * sc, y - 124 * sc, 120 * sc, 150 * sc);
    if (thay) {   // mũ thầy pháp
      ctx.fillStyle = '#c9962a'; ctx.beginPath(); ctx.moveTo(x - 30 * sc, y - 136 * sc); ctx.lineTo(x, y - 172 * sc); ctx.lineTo(x + 30 * sc, y - 136 * sc); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a1a14'; ctx.fillRect(x - 32 * sc, y - 140 * sc, 64 * sc, 7 * sc);
    }
    if (v.eyes > 0) {   // mắt loé đỏ (bị nhập)
      ctx.globalCompositeOperation = 'lighter';
      for (const sx of [-1, 1]) { const gl = ctx.createRadialGradient(x + sx * 11 * sc, y - 88 * sc, 0, x + sx * 11 * sc, y - 88 * sc, 12 * sc); gl.addColorStop(0, 'rgba(255,60,40,1)'); gl.addColorStop(1, 'rgba(255,0,0,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x + sx * 11 * sc, y - 88 * sc, 12 * sc, 0, TAU); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }
  let bubbleSet = new Set();
  const HEAD3D = 22;   // điểm chiếu (trên đỉnh đầu 3D) → tâm đầu, theo đơn vị sc
  function drawViewerLabel(v, t) {
    if (use3D() && MA3D.busy && MA3D.busy()) {   // đang đi theo ông kể chuyện: chỉ hiện tên nhỏ trên đầu
      if (v.taken || v.hx == null || v.hy < 600 || v.hy > 1900) return;
      ctx.save(); ctx.font = `700 18px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(v.nameShort).width + 14; ctx.globalAlpha = 0.8;
      ctx.fillStyle = 'rgba(0,0,0,.55)'; rr(v.hx - w / 2, v.hy - 28, w, 24, 12); ctx.fill(); ctx.fillStyle = '#f3e6d6'; ctx.fillText(v.nameShort, v.hx, v.hy - 15);
      ctx.restore(); return;
    }
    if (v.taken && use3D() && v.gx != null) {   // bóng ma người bị bắt: số ghế + cách cứu
      ctx.save(); ctx.globalAlpha = 0.75 + Math.sin(t * 2 + v.seat.n) * 0.2;
      ctx.font = `800 20px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const txt = `👻 ${short(v.name, 10)} · gõ "cứu ${v.seat.n}" ${v.rescue.size}/${S.rescueNeed}`, w = ctx.measureText(txt).width + 20;
      const gx = clamp(v.gx, w / 2 + 12, W - w / 2 - 12);
      ctx.fillStyle = 'rgba(10,20,45,.8)'; rr(gx - w / 2, v.gy - 44, w, 30, 15); ctx.fill();
      ctx.fillStyle = '#cfe0ff'; ctx.fillText(txt, gx, v.gy - 29);
      ctx.restore(); return;
    }
    if (v.taken || !v.da || v.da < 0.05) return;
    const x = v.x, y = v.y, sc = v.dsc;
    const D3 = use3D() && v.has3d && v.hx != null && !v.anim;
    const HX = D3 ? v.hx : x, HY = D3 ? v.hy + HEAD3D * sc : y - 82 * sc;   // tâm đầu
    const l = lightAt(v.seat.x, v.seat.y);
    const a = v.da * (0.45 + 0.55 * Math.max(l, v.glow > 0 ? 1 : 0));
    ctx.save(); ctx.globalAlpha = a;
    // vòng sáng khi tên được nhắc trong truyện
    if (v.glow > 0) {
      ctx.globalAlpha = Math.min(1, v.glow) * v.da;
      ctx.strokeStyle = 'rgba(255,215,120,.95)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(HX, HY, (D3 ? 30 : 38) * sc + Math.sin(t * 6) * 2, 0, TAU); ctx.stroke();
      ctx.globalAlpha = a;
    }
    if (ev && ev.type === 'nhap' && ev.tally.get(v.seat.n)) {
      ctx.strokeStyle = 'rgba(255,60,50,.9)'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(HX, HY, (D3 ? 32 : 40) * sc, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#ff5a4a'; ctx.font = `800 ${22 * sc + 6}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(`👆${ev.tally.get(v.seat.n)}`, HX, HY - 46 * sc);
    }
    // số ghế
    const fs = Math.round(13 + 7 * sc);
    ctx.font = `800 ${fs}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const bx = HX - (D3 ? 26 : 30) * sc, by = HY - 30 * sc;
    ctx.fillStyle = 'rgba(120,10,10,.92)'; ctx.beginPath(); ctx.arc(bx, by, fs * 0.72, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,150,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(String(v.seat.n), bx, by + 1);
    // tên
    const nfs = Math.round(13 + 8 * sc);
    ctx.font = `700 ${nfs}px ${FONT}`;
    const tw = (v.nameW || 60) * nfs / 22 + 14;
    const ny = y + 16 * sc;
    if (!v.hideName) {
    ctx.fillStyle = isThay(v) ? 'rgba(120,80,10,.85)' : 'rgba(0,0,0,.62)';
    rr(x - tw / 2, ny - nfs * 0.62, tw, nfs * 1.25, nfs * 0.6); ctx.fill();
    ctx.fillStyle = isThay(v) ? '#ffe08a' : '#f3e6d6'; ctx.fillText(v.nameShort, x, ny + 1);
    }
    if (D3 && !v.hideName) {   // ảnh đại diện cạnh tên (nhân vật 3D không mang ảnh trên mặt)
      const r = nfs * 0.78, px = x - tw / 2 - r * 0.55;
      ctx.save(); ctx.beginPath(); ctx.arc(px, ny, r, 0, TAU); ctx.clip(); ctx.drawImage(v.spr, 28, 10, 64, 64, px - r, ny - r, r * 2, r * 2); ctx.restore();
      ctx.strokeStyle = 'rgba(255,236,200,.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, ny, r, 0, TAU); ctx.stroke();
    }
    if (v.hideName) { /* tên bị che bớt cho đỡ rối, vẫn còn số ghế */ }
    else if (isThay(v)) { ctx.font = `800 ${nfs - 4}px ${FONT}`; ctx.fillStyle = '#ffd27a'; ctx.fillText('☯ THẦY PHÁP', x, ny + nfs * 1.15); }
    else if (BRAVE_TOP[0] && BRAVE_TOP[0].id === v.id) { ctx.font = `800 ${nfs - 5}px ${FONT}`; ctx.fillStyle = '#ffb36a'; ctx.fillText('👑 GAN NHẤT KÊNH', x, ny + nfs * 1.1); }
    // ma đứng sau lưng
    if (ghost.mode === 'behind' && ghost.behind === v && ghost.a > 0.2) {
      ctx.globalAlpha = 0.6 + Math.sin(t * 5) * 0.4;
      ctx.font = `800 ${nfs}px ${FONT}`; ctx.fillStyle = '#ff5a4a'; ctx.fillText('⚠ SAU LƯNG BẠN', HX, HY - 68 * sc);
      ctx.globalAlpha = a;
    }
    // bong bóng bình luận
    if (v.bubble && t - v.bubble.t0 < 3.4 && bubbleSet.has(v.id)) {
      const ba = Math.min(1, (3.4 - (t - v.bubble.t0)) / 0.5);
      ctx.globalAlpha = ba * v.da;
      ctx.font = `600 ${nfs}px ${FONT}`;
      const w2 = ctx.measureText(v.bubble.text).width + 24, bh = nfs + 16, by2 = HY - 48 * sc - bh - (ghost.behind === v ? 26 : 0);
      ctx.fillStyle = 'rgba(245,238,225,.94)'; rr(HX - w2 / 2, by2, w2, bh, 12); ctx.fill();
      ctx.beginPath(); ctx.moveTo(HX - 8, by2 + bh - 1); ctx.lineTo(HX, by2 + bh + 10); ctx.lineTo(HX + 8, by2 + bh - 1); ctx.fill();
      ctx.fillStyle = '#2a1a12'; ctx.fillText(v.bubble.text, HX, by2 + bh / 2 + 1);
    } else if (v.bubble && t - v.bubble.t0 >= 3.4) v.bubble = null;
    ctx.restore();
  }
  function drawMirror(t) {
    const { x, y, rx, ry } = MIRROR;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.clip();
    const mg = ctx.createRadialGradient(x - 20, y - 30, 10, x, y, ry * 1.2);
    mg.addColorStop(0, '#2a3446'); mg.addColorStop(1, '#090c14');
    ctx.fillStyle = mg; ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
    // sương trong gương
    for (let k = 0; k < 4; k++) { ctx.fillStyle = 'rgba(150,170,210,.07)'; ctx.beginPath(); ctx.ellipse(x + Math.sin(t * 0.3 + k * 2) * 50, y + Math.cos(t * 0.25 + k) * 70, 70, 26, 0, 0, TAU); ctx.fill(); }
    // hồn ma thoáng hiện trong gương
    if (t - mirrorFlash < 2.2 || (yin > 75 && Math.sin(t * 0.37) > 0.92)) drawGhost(x, y + 150, 0.75, 0.55, t, { red: true });
    // người bị bắt
    const taken = seated().filter(v => v.taken && !(v.anim && v.anim.type === 'take'));
    const shown = taken.slice(0, 6);
    shown.forEach((v, i) => {
      const cols = shown.length <= 2 ? 1 : 2, rowsN = Math.ceil(shown.length / cols);
      const col = i % cols, row = Math.floor(i / cols);
      const px = x + (cols === 1 ? 0 : (col ? 36 : -36)), py = y - (rowsN - 1) * 38 + row * 76 + Math.sin(t * 1.5 + i) * 4;
      ctx.save(); ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.arc(px, py, 26, 0, TAU); ctx.clip();
      ctx.filter = 'grayscale(1) brightness(1.3)';
      ctx.drawImage(v.spr, 28, 10, 64, 64, px - 26, py - 26, 52, 52);
      ctx.filter = 'none';
      ctx.fillStyle = 'rgba(120,160,255,.25)'; ctx.fillRect(px - 26, py - 26, 52, 52);
      ctx.restore();
      ctx.fillStyle = 'rgba(120,10,10,.95)'; ctx.beginPath(); ctx.arc(px - 20, py - 20, 12, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `800 14px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(v.seat.n), px - 20, py - 19);
      if (v.rescue.size) { ctx.fillStyle = '#ffd27a'; ctx.font = `800 13px ${FONT}`; ctx.fillText(`${v.rescue.size}/${S.rescueNeed}`, px + 14, py + 22); }
    });
    ctx.restore();
    // nhãn cõi âm
    if (taken.length) {
      ctx.font = `800 20px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const txt = `🪞 CÕI ÂM: ${taken.length} người${taken.length > 6 ? ` (+${taken.length - 6})` : ''}`;
      const w = ctx.measureText(txt).width + 22;
      ctx.fillStyle = 'rgba(10,15,35,.85)'; rr(x - w / 2, y + ry + 26, w, 30, 15); ctx.fill();
      ctx.fillStyle = '#bcd0ff'; ctx.fillText(txt, x, y + ry + 42);
    }
  }
  function drawWhispers(t) {
    for (let i = whispers.length - 1; i >= 0; i--) {
      const w = whispers[i], p = (t - w.t0) / 6;
      if (p > 1) { whispers.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = Math.min(1, p * 5, (1 - p) * 3) * 0.9;
      ctx.font = `italic 600 24px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(120,160,255,.9)'; ctx.shadowBlur = 12;
      ctx.fillStyle = '#d8e4ff';
      ctx.fillText(`“${w.text}”`, w.x, w.y - p * 60);
      ctx.font = `600 17px ${FONT}`; ctx.fillStyle = '#9fb4e8'; ctx.fillText(`— ${w.name} (trong gương)`, w.x, w.y - p * 60 + 26);
      ctx.restore();
    }
  }

  // ---------- hình phụ ----------
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function panel(x, y, w, h, alpha = 0.78, border = 'rgba(190,140,80,.55)') {
    ctx.fillStyle = `rgba(12,6,4,${alpha})`; rr(x, y, w, h, 18); ctx.fill();
    ctx.strokeStyle = border; ctx.lineWidth = 2; rr(x + 4, y + 4, w - 8, h - 8, 15); ctx.stroke();
  }
  function wrapPlain(text, maxW) {
    const words = String(text).split(/\s+/), lines = []; let cur = '';
    for (const w of words) { const tst = cur ? cur + ' ' + w : w; if (ctx.measureText(tst).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tst; }
    if (cur) lines.push(cur);
    return lines;
  }
  function drawDoll(x, y, s, t, red) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.rotate(Math.sin(t * 2.2) * 0.12);
    ctx.fillStyle = '#9a1020'; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.lineTo(24, 34); ctx.lineTo(-24, 34); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f2ece4'; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(0, 8); ctx.lineTo(10, 0); ctx.fill();
    ctx.fillStyle = '#f0e6dc'; ctx.beginPath(); ctx.arc(0, -16, 17, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0b0708'; ctx.beginPath(); ctx.arc(0, -20, 18, Math.PI * 1.02, Math.PI * 1.98); ctx.fill(); ctx.fillRect(-18, -22, 6, 24); ctx.fillRect(12, -22, 6, 24);
    for (const sx of [-1, 1]) {
      if (red) { const gl = ctx.createRadialGradient(sx * 6, -15, 0, sx * 6, -15, 8); gl.addColorStop(0, 'rgba(255,40,30,1)'); gl.addColorStop(1, 'rgba(255,0,0,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sx * 6, -15, 8, 0, TAU); ctx.fill(); }
      else { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(sx * 6, -15, 3.2, 0, TAU); ctx.fill(); }
    }
    ctx.strokeStyle = '#9a1020'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, -9, 4.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.fillStyle = 'rgba(220,90,90,.5)'; ctx.beginPath(); ctx.arc(-9, -10, 3, 0, TAU); ctx.arc(9, -10, 3, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ======================================================================
  // VẼ — giao diện
  // ======================================================================
  function drawHUD(t) {
    // ---- tiêu đề & tên truyện ----
    const titleY = 268;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 30px ${SERIF}`;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(70, titleY - 24, 940, 48, 24); ctx.fill();
    let title = story.st ? `📖 ${story.st.title}` + (story.part ? ` · đoạn ${story.part}` : '') : `🔥 ${S.title || 'NGỌN LỬA CUỐI CÙNG'}`;
    ctx.fillStyle = '#e8c58a'; ctx.fillText(short(title, 48), W / 2, titleY + 1);
    // ---- khung lời kể ----
    const bx = 40, by = 300, bw = 1000, bh = 196;
    panel(bx, by, bw, bh, 0.82);
    drawNarration(bx + 34, by + 26, bw - 68, bh - 44, t);
    // ---- đồng hồ dầu / âm khí ----
    const my = 512;
    meter(40, my, 490, '🔥 CỦI LỬA', oil, ['#ff9a2a', '#ffd27a'], oil < 25 && Math.sin(t * 8) > 0);
    meter(550, my, 490, '👻 ÂM KHÍ', yin, ['#7a2aff', '#ff2a4a'], yin > 80 && Math.sin(t * 8) > 0);
    // ---- dòng bảng xếp hạng / gợi ý ----
    drawTicker(t);
    // ---- ông kể chuyện ----
    const TL = window.__maShared.teller;
    if (use3D() && TL && TL.y > 640) {
      const talk = narrating() || story.typed < [...story.text].length, fs = Math.round(16 + 6 * TL.sc);
      ctx.save(); ctx.font = `800 ${fs}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const txt = `🎙 ${S.tellerName || 'Ông Tư'} kể chuyện${talk ? ' …' : ''}`, w = ctx.measureText(txt).width + 24, y0 = TL.y - 34 * TL.sc - 16;
      ctx.fillStyle = 'rgba(60,20,8,.85)'; rr(TL.x - w / 2, y0 - fs * 0.7, w, fs * 1.4, fs * 0.7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,190,110,.7)'; ctx.lineWidth = 1.5; rr(TL.x - w / 2, y0 - fs * 0.7, w, fs * 1.4, fs * 0.7); ctx.stroke();
      ctx.fillStyle = '#ffd27a'; ctx.fillText(txt, TL.x, y0 + 1); ctx.restore();
    }
    // ---- bảng bình chọn & sự kiện ----
    if (ev && drawEventPanel(t)) { /* bảng sự kiện có sẵn cách chơi */ }
    else if (vote) drawVotePanel(t);
    else if (story.phase === 'cast' && story.cast) drawCast(t);
    else if (lastVoteResult && t - lastVoteResult.t0 < 3) drawVoteResult(t);
    else drawGuide(t);
    // búp bê (vẽ trên tất cả)
    if (ev && (ev.type === 'bupbe' || ev.type === 'bupbe-end') && ev.holder) {
      const hv = ev.holder, fly = clamp((t - ev.flyT) / 0.8, 0, 1);
      let x = hv.x + 4, y = hv.y - 40 * (hv.dsc || hv.seat.sc);
      if (ev.from && fly < 1) { const k = ease(fly); x = lerp(ev.from.x, x, k); y = lerp(ev.from.y, y, k) - Math.sin(k * Math.PI) * 140; }
      if (!hv.taken || ev.type === 'bupbe') {
        const ds = 1.55 * (hv.dsc || 1);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const gl = ctx.createRadialGradient(x, y, 0, x, y, 70 * ds); gl.addColorStop(0, `rgba(255,40,80,${0.35 + Math.sin(t * 6) * 0.1})`); gl.addColorStop(1, 'rgba(255,0,60,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 70 * ds, 0, TAU); ctx.fill(); ctx.restore();
        drawDoll(x, y, ds, t, ev.type === 'bupbe-end');
      }
    }
    // ---- bảng quà ----
    if (S.showGiftGuide) drawGiftGuide(t);
    // ---- thông báo ----
    drawFloats(t);
    if (banner) drawBanner(t);
    if (story.paused) { ctx.font = `800 34px ${FONT}`; ctx.fillStyle = 'rgba(255,220,180,.9)'; ctx.textAlign = 'center'; ctx.fillText('⏸ TẠM DỪNG', W / 2, 1520); }
  }
  function meter(x, y, w, label, val, cols, blink) {
    ctx.fillStyle = 'rgba(0,0,0,.7)'; rr(x, y, w, 44, 22); ctx.fill();
    const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
    ctx.save(); rr(x + 4, y + 4, w - 8, 36, 18); ctx.clip();
    ctx.fillStyle = g; ctx.globalAlpha = blink ? 0.55 : 0.9; ctx.fillRect(x + 4, y + 4, (w - 8) * clamp(val / 100, 0, 1), 36);
    ctx.restore();
    ctx.font = `800 22px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 4;
    ctx.fillText(label, x + 18, y + 23);
    ctx.textAlign = 'right'; ctx.fillText(String(Math.round(val)), x + w - 18, y + 23);
    ctx.shadowBlur = 0;
  }
  function drawNarration(x, y, w, h, t) {
    const fs = 38;
    ctx.font = `700 ${fs}px ${FONT}`; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    // tách từ, giữ màu tên người xem
    const words = [];
    for (const s of story.segs) for (const part of s.t.split(/(\s+)/)) if (part) words.push({ t: part, hl: s.hl });
    const lines = [[]]; let lw = 0;
    for (const wd of words) {
      const ww = ctx.measureText(wd.t).width;
      if (/^\s+$/.test(wd.t)) { if (lw > 0) { lines[lines.length - 1].push({ ...wd, w: ww }); lw += ww; } continue; }
      if (lw + ww > w && lw > 0) { lines.push([]); lw = 0; }
      lines[lines.length - 1].push({ ...wd, w: ww }); lw += ww;
    }
    let fsz = fs;
    if (lines.length > 4) fsz = 31;
    const lh = fsz * 1.22;
    if (fsz !== fs) {   // dàn lại với cỡ chữ nhỏ hơn
      ctx.font = `700 ${fsz}px ${FONT}`;
      lines.length = 0; lines.push([]); lw = 0;
      for (const wd of words) {
        const ww = ctx.measureText(wd.t).width;
        if (/^\s+$/.test(wd.t)) { if (lw > 0) { lines[lines.length - 1].push({ ...wd, w: ww }); lw += ww; } continue; }
        if (lw + ww > w && lw > 0) { lines.push([]); lw = 0; }
        lines[lines.length - 1].push({ ...wd, w: ww }); lw += ww;
      }
    }
    const total = lines.length * lh;
    let yy = y + Math.max(0, (h - total) / 2);
    let budget = Math.floor(story.typed);
    ctx.shadowColor = 'rgba(160,0,0,.6)'; ctx.shadowBlur = 8;
    for (const ln of lines.slice(0, 5)) {
      let xx = x;
      for (const wd of ln) {
        if (budget <= 0) break;
        const chars = [...wd.t];
        const txt = chars.length <= budget ? wd.t : chars.slice(0, budget).join('');
        budget -= chars.length;
        ctx.fillStyle = wd.hl === 2 ? '#ffd24a' : wd.hl === 1 ? '#ffb27a' : '#f4ead8';
        ctx.fillText(txt, xx, yy);
        if (wd.hl === 2) { ctx.fillRect(xx, yy + fsz + 1, ctx.measureText(txt).width, 2); }
        xx += wd.w;
      }
      yy += lh;
    }
    ctx.shadowBlur = 0;
  }
  let tickerMode = 0, tickerAt = 0;
  function drawTicker(t) {
    const y = 576;
    // thông báo chen vào dòng chạy, mỗi cái 2.8 giây
    while (toasts.length && toasts[0].t0 && t - toasts[0].t0 > 2.8) toasts.shift();
    const tt = toasts[0];
    if (tt) {
      if (!tt.t0) tt.t0 = t;
      const p = (t - tt.t0) / 2.8;
      ctx.fillStyle = 'rgba(40,12,6,.88)'; rr(40, y - 2, 1000, 40, 20); ctx.fill();
      ctx.strokeStyle = 'rgba(255,190,110,.55)'; ctx.lineWidth = 2; rr(40, y - 2, 1000, 40, 20); ctx.stroke();
      ctx.save(); ctx.globalAlpha = Math.min(1, p * 8, (1 - p) * 6);
      ctx.font = `700 23px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = tt.color;
      ctx.fillText(short(tt.text, 74), W / 2, y + 19); ctx.restore();
      return;
    }
    if (t - tickerAt > 9) { tickerAt = t; tickerMode = (tickerMode + 1) % (S.showHints ? 3 : 2); }
    ctx.fillStyle = 'rgba(0,0,0,.66)'; rr(40, y - 2, 1000, 40, 20); ctx.fill();
    ctx.font = `700 22px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let txt;
    if (tickerMode === 0) {
      const top = braveTop(4);
      txt = '🏆 GAN DẠ ĐÊM NAY: ' + (top.length ? top.map((x, i) => `${i + 1}. ${short(x.name, 10)} (${x.pts})`).join('  ') : 'ngồi lâu, niệm Phật, tố đúng kẻ bị nhập để lên bảng');
      ctx.fillStyle = '#ffd27a';
    } else if (tickerMode === 1) {
      const th = thayName();
      const coin = [...coinsOf.entries()].sort((a, b) => b[1].c - a[1].c).slice(0, 3);
      txt = (th.id ? `☯ THẦY PHÁP: ${short(th.name, 12)}   ` : '') + '💰 ' + (coin.length ? coin.map(([, c], i) => `${i + 1}. ${short(c.name, 10)} (${c.c} xu)`).join('  ') : `tặng từ ${S.thayMin} xu để làm thầy pháp`);
      ctx.fillStyle = '#ffe8c0';
    } else {
      txt = pick2(t, ['💬 Gõ "nam mô" để xua ma · "cứu 12" để cứu người trong gương', '💬 Gõ bất kỳ để ngồi vào vòng · tên bạn có thể vào truyện!', '💬 Thả tim = thêm củi · lửa tắt là ma bắt người', `💬 Ngoài cửa còn ${waiting.size} người chờ ghế · ${alive().length} người quanh đống lửa`]);
      ctx.fillStyle = '#d8e4ff';
    }
    ctx.fillText(short(txt, 80), W / 2, y + 19);
  }
  const pick2 = (t, arr) => arr[Math.floor(t / 9) % arr.length];

  function drawVotePanel(t) {
    const v = vote, n = v.opts.length;
    const x = 60, y = 630, w = 960, rowH = 62, h = 78 + n * rowH + 34;
    panel(x, y, w, h, 0.88, 'rgba(255,190,110,.75)');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 30px ${FONT}`; ctx.fillStyle = '#ffd27a';
    ctx.fillText(short(v.q, 44), W / 2 - 40, y + 40);
    // vòng đếm ngược
    const left = Math.max(0, v.end - t), tot = v.end - v.t0;
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x + w - 52, y + 42, 24, 0, TAU); ctx.stroke();
    ctx.strokeStyle = left < 5 ? '#ff4a3a' : '#ffd27a'; ctx.beginPath(); ctx.arc(x + w - 52, y + 42, 24, -Math.PI / 2, -Math.PI / 2 + TAU * left / tot); ctx.stroke();
    ctx.font = `800 20px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(String(Math.ceil(left)), x + w - 52, y + 43);
    const totW = v.opts.reduce((s, o) => s + o.w, 0) || 1;
    v.opts.forEach((o, i) => {
      const oy = y + 74 + i * rowH, ox = x + 24, ow = w - 48, oh = rowH - 8;
      ctx.fillStyle = 'rgba(255,255,255,.07)'; rr(ox, oy, ow, oh, 14); ctx.fill();
      const frac = o.w / totW;
      ctx.fillStyle = i === 0 ? 'rgba(255,140,60,.45)' : i === 1 ? 'rgba(140,90,255,.45)' : 'rgba(60,180,140,.45)';
      rr(ox, oy, Math.max(28, ow * frac), oh, 14); ctx.fill();
      const cy = oy + oh / 2;
      ctx.fillStyle = '#7a1010'; ctx.beginPath(); ctx.arc(ox + 34, cy, 21, 0, TAU); ctx.fill();
      ctx.font = `900 25px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(String(i + 1), ox + 34, cy + 1);
      ctx.textAlign = 'left'; ctx.font = `700 ${o.sub ? 25 : 28}px ${FONT}`; ctx.fillStyle = '#f6ead6';
      ctx.fillText(short(o.label, 34), ox + 68, cy - (o.sub ? 11 : 0));
      if (o.sub) { ctx.font = `500 18px ${FONT}`; ctx.fillStyle = '#c9b8a0'; ctx.fillText(short(o.sub, 62), ox + 68, cy + 15); }
      ctx.textAlign = 'right'; ctx.font = `800 24px ${FONT}`; ctx.fillStyle = '#ffd27a';
      ctx.fillText(`${Math.round(frac * 100)}%`, ox + ow - 18, cy + 1);
      ctx.textAlign = 'center';
    });
    ctx.font = `600 20px ${FONT}`; ctx.fillStyle = 'rgba(255,230,200,.8)';
    ctx.fillText(`Gõ ${v.opts.map((_, i) => i + 1).join(' / ')} để chọn${S.voteGiftWeight ? ' · chọn rồi tặng quà để phiếu nặng thêm' : ''}`, W / 2, y + h - 22);
  }
  function drawVoteResult(t) {
    const r = lastVoteResult, a = Math.min(1, (3 - (t - r.t0)) / 0.5);
    ctx.save(); ctx.globalAlpha = a;
    panel(140, 700, 800, 110, 0.88, 'rgba(255,190,110,.75)');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 24px ${FONT}`; ctx.fillStyle = '#c9b8a0'; ctx.fillText('Mọi người đã chọn', W / 2, 732);
    ctx.font = `800 32px ${FONT}`; ctx.fillStyle = '#ffd27a'; ctx.fillText(`${r.idx + 1}. ${short(r.label, 34)}`, W / 2, 774);
    ctx.restore();
  }
  function drawCast(t) {
    const roles = ['A', 'B', 'C'].map(k => story.roles[k]).filter(r => r.id).map(r => viewers.get(r.id)).filter(Boolean);
    const p = (t - story.cast.t0);
    const a = Math.min(1, p * 2);
    ctx.save(); ctx.globalAlpha = a;
    panel(90, 630, 900, 260, 0.9, 'rgba(255,190,110,.75)');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 24px ${FONT}`; ctx.fillStyle = '#c9b8a0'; ctx.fillText('🎭 VAI CHÍNH TRONG CHUYỆN NÀY', W / 2, 668);
    if (!roles.length) { ctx.font = `700 28px ${FONT}`; ctx.fillStyle = '#f6ead6'; ctx.fillText('Bình luận để được vào vai trong chuyện sau!', W / 2, 770); }
    roles.forEach((v, i) => {
      const cx = W / 2 + (i - (roles.length - 1) / 2) * 260, cy = 765;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 52, 0, TAU); ctx.clip(); ctx.drawImage(v.spr, 28, 10, 64, 64, cx - 52, cy - 52, 104, 104); ctx.restore();
      ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 52, 0, TAU); ctx.stroke();
      ctx.font = `800 24px ${FONT}`; ctx.fillStyle = '#ffd24a'; ctx.fillText(short(v.name, 14), cx, cy + 78);
      ctx.font = `600 18px ${FONT}`; ctx.fillStyle = '#c9b8a0'; ctx.fillText(`ghế ${v.seat.n}`, cx, cy + 104 - 2);
    });
    ctx.restore();
  }
  // bước chơi đánh số trong bảng sự kiện
  function drawSteps(x, y, w, steps, color, fs = 22) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.06)'; rr(x, y, w, 30 + steps.length * (fs + 12), 12); ctx.fill();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${fs - 4}px ${FONT}`; ctx.fillStyle = color; ctx.fillText('CÁCH CHƠI', x + 16, y + 15);
    steps.forEach((st, i) => {
      const yy = y + 30 + i * (fs + 12) + (fs + 12) / 2;
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + 28, yy, 13, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a0a06'; ctx.font = `900 ${fs - 6}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), x + 28, yy + 1);
      ctx.textAlign = 'left'; ctx.font = `700 ${fs}px ${FONT}`; ctx.fillStyle = '#f6ead6';
      ctx.fillText(short(st, 70), x + 52, yy + 1);
    });
    ctx.restore();
    return 30 + steps.length * (fs + 12);
  }
  function drawEventPanel(t) {
    const e = ev;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (e.type === 'nhap' || e.type === 'nhap-end') {
      const x = 50, y = 626, w = 980, h = e.type === 'nhap' ? 340 : 200;
      panel(x, y, w, h, 0.92, 'rgba(255,80,60,.8)');
      ctx.font = `900 34px ${SERIF}`; ctx.fillStyle = '#ff5a4a'; ctx.fillText('👁 AI ĐÃ BỊ MA NHẬP?', W / 2, y + 36);
      if (e.type === 'nhap') {
        const left = Math.max(0, e.dur - (t - e.t0));
        ctx.font = `800 25px ${FONT}`; ctx.fillStyle = left < 10 ? '#ff4a3a' : '#ffd27a'; ctx.fillText(`⏳ còn ${Math.ceil(left)} giây`, W / 2, y + 70);
        const sh = drawSteps(x + 20, y + 88, w - 40, ['Một người quanh đống lửa đã bị ma nhập — chính họ cũng không biết!', 'Gõ SỐ GHẾ của kẻ đó, ví dụ: 12 (gõ số khác để đổi ý)', 'Tố đúng: +3 gan dạ · Tố nhầm: người bị oan bị kéo vào gương'], '#ff8a7a', 21);
        const cy = y + 88 + sh + 26;
        ctx.textAlign = 'left'; ctx.font = `800 19px ${FONT}`; ctx.fillStyle = '#ffb3a6'; ctx.fillText('GỢI Ý', x + 30, cy);
        ctx.font = `700 22px ${FONT}`;
        const clues = e.clues.length ? e.clues : ['Đang dò tìm dấu vết… (gợi ý hiện dần)'];
        clues.slice(-2).forEach((c, i) => { ctx.fillStyle = '#fff2c8'; ctx.fillText('🔎 ' + short(c, 40), x + 30, cy + 30 + i * 30); });
        const ranked = [...e.tally.entries()].filter(r => r[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 2);
        ctx.textAlign = 'right'; ctx.font = `800 19px ${FONT}`; ctx.fillStyle = '#ffb3a6';
        ctx.fillText('BỊ TỐ NHIỀU NHẤT', x + w - 30, cy);
        ctx.font = `800 21px ${FONT}`;
        if (!ranked.length) { ctx.fillStyle = '#c9b8a0'; ctx.fillText('chưa ai tố', x + w - 30, cy + 30); }
        ranked.forEach(([n, c], i) => { const sv = (seatByN(n) || {}).v; ctx.fillStyle = '#fff'; ctx.fillText(`ghế ${n} ${sv ? short(sv.name, 9) : ''} · ${c} phiếu`, x + w - 30, cy + 30 + i * 30); });
      } else {
        ctx.font = `700 27px ${FONT}`; ctx.fillStyle = '#f6ead6'; ctx.fillText(`Kẻ bị nhập: ${e.target.name} — ghế ${e.target.seat.n}`, W / 2, y + 100);
        ctx.font = `600 21px ${FONT}`; ctx.fillStyle = '#c9b8a0'; ctx.fillText('Lần sau: đọc gợi ý, nhìn kỹ mắt ai loé đỏ rồi gõ số ghế', W / 2, y + 145);
      }
      return true;
    }
    if (e.type === 'bupbe' || e.type === 'bupbe-end') {
      const x = 50, y = 626, w = 980, h = e.type === 'bupbe' ? 280 : 130;
      panel(x, y, w, h, 0.92, 'rgba(255,110,140,.8)');
      ctx.font = `900 32px ${SERIF}`; ctx.fillStyle = '#ff7a9a'; ctx.fillText('🪆 BÚP BÊ MA CHUYỀN TAY', W / 2, y + 36);
      ctx.font = `800 26px ${FONT}`; ctx.fillStyle = '#fff';
      ctx.fillText(e.holder ? `Búp bê đang ở: ${short(e.holder.name, 16)} (ghế ${e.holder.seat.n})` : '…', W / 2, y + 76);
      if (e.type === 'bupbe') drawSteps(x + 20, y + 98, w - 40, ['Ai đang CẦM búp bê: gõ bất kỳ để chuyền sang người khác', 'Muốn ném cho ai thì gõ số ghế người đó, ví dụ: 25', 'Nhạc hộp dừng lúc nào không ai biết — ai cầm lúc đó bị bắt!'], '#ff9ab0', 21);
      else { ctx.font = `600 22px ${FONT}`; ctx.fillStyle = '#ffd0da'; ctx.fillText('Tiếng nhạc đã dừng…', W / 2, y + 108); }
      return true;
    }
    if (e.type === 'cauco') { drawOuija(t, e); return true; }
    return false;
  }

  // ---------- thẻ hướng dẫn ----------
  const GUIDES = {
    blackout: { icon: '🔥', title: 'LỬA TẮT VÌ HẾT CỦI', color: '#ffb36a', steps: () => ['Trong bóng tối, ma bắt 1–2 người vào gương', 'THẢ TIM liên tục để thêm củi (thanh 🔥 CỦI LỬA)', 'Tặng 🪵 Thêm củi để lửa cháy to'] },
    ghost: { icon: '👻', title: 'MA HIỆN HÌNH', color: '#ff7a6a', steps: () => ['Âm khí đầy (hoặc ai đó Gọi hồn) → ma bắt một người', 'Gõ "nam mô" hoặc tặng 🧂 Rắc muối để hạ ÂM KHÍ', 'Người bị bắt nằm trong gương — gõ "cứu + số ghế" để cứu'] },
    rescue: { icon: '👻', title: 'CỨU NGƯỜI BỊ MA BẮT', color: '#9fc0ff', steps: () => [use3D() ? 'Người bị bắt thành bóng ma xanh mờ đứng trong bóng tối' : 'Người bị bắt hiện trong TẤM GƯƠNG, có số ghế trên mặt', 'Gõ: cứu 12  (thay 12 bằng số ghế người đó)', `Đủ ${S.rescueNeed} người gõ là cứu được · người cứu +2 gan dạ`] },
    trura: { icon: '☯️', title: 'TRỪ TÀ', color: '#ffd27a', steps: () => ['Người tặng ☯️ Trừ tà trở thành THẦY PHÁP của phòng', 'Cứu hết người trong gương · lửa cháy to · âm khí về 0', 'Thầy pháp không bị ma bắt, cầm búp bê thì trấn yểm được'] },
    behind: { icon: '⚠️', title: 'MA ĐANG ĐỨNG SAU LƯNG', color: '#ff6a5a', steps: () => ['Tìm chữ đỏ "⚠ SAU LƯNG BẠN" trên đầu một người', 'Người đó (hoặc ai cũng được) gõ "nam mô" để đuổi ma', 'Hoặc tặng 🧂 Rắc muối — âm khí cao quá là ma bắt người'] },
    general: { icon: '🔥', title: 'CÁCH CHƠI', color: '#ffd27a', steps: () => ['Bình luận bất kỳ → ngồi một ghế có số, tên bạn có thể vào truyện', 'Thả tim = thêm củi cho lửa · gõ "nam mô" = xua âm khí', 'Khi bình chọn gõ 1 hoặc 2 · gõ "cứu 12" để cứu người trong gương', 'Tặng quà để mở sự kiện (bảng "Tặng quà để…" bên phải)'] },
  };
  let guide = null; const guideQ = []; const guideAt = {};
  function showGuide(key, cooldown = 90) {
    const t = now();
    if (t - (guideAt[key] || -999) < cooldown || guideQ.includes(key) || (guide && guide.key === key)) return;
    guideAt[key] = t; guideQ.push(key);
  }
  function drawGuide(t) {
    if (guide && t - guide.t0 > guide.dur) guide = null;
    if (!guide && guideQ.length) { const k = guideQ.shift(); guide = { key: k, t0: t, dur: k === 'general' ? 10 : 8 }; }
    if (!guide) return;
    const g = GUIDES[guide.key], steps = g.steps(), p = (t - guide.t0) / guide.dur;
    ctx.save(); ctx.globalAlpha = clamp(Math.min(p * 8, (1 - p) * 6), 0, 1);
    const x = 50, y = 626, w = 980, h = 70 + steps.length * 44 + 18;
    panel(x, y, w, h, 0.92, g.color);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 32px ${SERIF}`; ctx.fillStyle = g.color; ctx.fillText(`${g.icon} ${g.title}`, W / 2, y + 38);
    steps.forEach((st, i) => {
      const yy = y + 86 + i * 44;
      ctx.fillStyle = g.color; ctx.beginPath(); ctx.arc(x + 48, yy, 16, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a0a06'; ctx.font = `900 19px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), x + 48, yy + 1);
      ctx.textAlign = 'left'; ctx.font = `700 25px ${FONT}`; ctx.fillStyle = '#f6ead6'; ctx.fillText(short(st, 62), x + 78, yy + 1);
    });
    ctx.restore();
  }
  function drawOuija(t, e) {
    const { cx, cy, w, h } = OUIJA;
    ctx.save();
    // bàn gỗ
    const g = ctx.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
    g.addColorStop(0, '#5a3a1c'); g.addColorStop(0.5, '#7a5228'); g.addColorStop(1, '#4a2e14');
    ctx.globalAlpha = 0.96; ctx.fillStyle = g; rr(cx - w / 2, cy - h / 2, w, h, 40); ctx.fill();
    ctx.strokeStyle = 'rgba(30,15,5,.8)'; ctx.lineWidth = 4; rr(cx - w / 2 + 14, cy - h / 2 + 14, w - 28, h - 28, 30); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1e1008';
    ctx.font = `700 34px ${SERIF}`;
    for (const k of Object.keys(OUIJA_POS)) { if (k.length !== 1) continue; const p = OUIJA_POS[k]; ctx.fillText(k, p.x, p.y); }
    ctx.font = `800 34px ${SERIF}`;
    ctx.fillText('CÓ', OUIJA_POS.YES.x, OUIJA_POS.YES.y); ctx.fillText('KHÔNG', OUIJA_POS.NO.x, OUIJA_POS.NO.y);
    ctx.font = `700 30px ${SERIF}`; ctx.fillText('TẠM BIỆT', OUIJA_POS.BYE.x, OUIJA_POS.BYE.y);
    ctx.font = `20px ${SERIF}`; ctx.fillText('☾', OUIJA_POS.YES.x, OUIJA_POS.YES.y + 34); ctx.fillText('☀', OUIJA_POS.NO.x, OUIJA_POS.NO.y + 34);
    if (e.phase === 'ask') {
      ctx.fillStyle = 'rgba(12,6,4,.9)'; rr(cx - 435, cy + 14, 870, 152, 16); ctx.fill();
      drawSteps(cx - 420, cy + 24, 840, ['Gõ:  hỏi: câu hỏi của bạn   (ví dụ: hỏi: ai sẽ bị bắt?)', 'Người tặng 🔮 được hỏi trước · hết giờ hồn ma tự chọn câu', 'Hỏi "ai…" → hồn ma đánh vần TÊN một người trong phòng!'], '#c9a8ff', 22);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    }
    // con trỏ
    if (e.phase !== 'ask') {
      const px = e.planch.x + Math.sin(t * 8) * 1.5, py = e.planch.y + 34;
      ctx.save(); ctx.translate(px, py);
      ctx.fillStyle = 'rgba(30,15,5,.4)'; ctx.beginPath(); ctx.ellipse(6, 10, 52, 60, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8d6b0'; ctx.beginPath(); ctx.moveTo(0, -70); ctx.bezierCurveTo(60, -50, 60, 40, 0, 50); ctx.bezierCurveTo(-60, 40, -60, -50, 0, -70); ctx.fill();
      ctx.strokeStyle = '#5a3a1c'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(200,230,255,.25)'; ctx.beginPath(); ctx.arc(0, -34, 22, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 4; ctx.stroke();
      ctx.restore();
    }
    // tiêu đề, câu hỏi, chữ đã ghép
    ctx.font = `900 30px ${SERIF}`; ctx.fillStyle = '#ffd27a';
    panel(120, 640, 840, 96, 0.85, 'rgba(180,140,255,.8)');
    ctx.fillStyle = '#c9a8ff'; ctx.fillText('🔮 CẦU CƠ', W / 2, 668);
    ctx.font = `700 25px ${FONT}`; ctx.fillStyle = '#f6ead6';
    if (e.phase === 'ask') ctx.fillText(e.asker ? `${short(e.asker.name, 14)} gõ câu hỏi… (${Math.ceil(e.askUntil - t)}s) · ai cũng hỏi được: "hỏi: …"` : `Gõ "hỏi: …" để hỏi hồn ma (${Math.ceil(e.askUntil - t)}s)`, W / 2, 708);
    else ctx.fillText(short(`${e.qBy ? e.qBy + ': ' : ''}“${e.q}”`, 60), W / 2, 708);
    if (e.phase !== 'ask') {
      panel(160, cy + h / 2 + 16, 760, e.phase === 'reveal' ? 120 : 70, 0.9, 'rgba(180,140,255,.8)');
      ctx.font = `900 36px ${SERIF}`; ctx.fillStyle = '#e6d6ff';
      ctx.fillText(e.spelled || '…', W / 2, cy + h / 2 + 52);
      if (e.phase === 'reveal') { ctx.font = `800 30px ${FONT}`; ctx.fillStyle = '#ffd24a'; ctx.fillText(`👻 ${short(e.ans.text, 36)}`, W / 2, cy + h / 2 + 102); }
    }
    ctx.restore();
  }
  function drawGiftGuide(t) {
    const list = (S.actions || []).map(a => ({ ...a, def: ACTIONS.find(x => x.id === a.id) })).filter(a => a.def);
    const x = 708, rowH = 38, h = 52 + list.length * rowH + 10, y = H - 60 - h, w = 352;
    ctx.fillStyle = 'rgba(10,5,4,.72)'; rr(x, y, w, h, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(190,140,80,.45)'; ctx.lineWidth = 2; rr(x + 3, y + 3, w - 6, h - 6, 15); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `800 23px ${FONT}`; ctx.fillStyle = '#ffd27a'; ctx.fillText('🎁 TẶNG QUÀ ĐỂ…', x + 18, y + 28);
    list.forEach((a, i) => {
      const yy = y + 56 + i * rowH + rowH / 2;
      ctx.font = `24px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(a.def.icon, x + 16, yy);
      ctx.font = `700 21px ${FONT}`; ctx.fillStyle = '#f6ead6'; ctx.fillText(a.def.label, x + 54, yy);
      const g = a.gift && GIFTS[a.gift];
      ctx.textAlign = 'right';
      if (g && g.img) { const im = loadImg(g.img); if (im) ctx.drawImage(im, x + w - 48, yy - 15, 30, 30); ctx.font = `700 17px ${FONT}`; ctx.fillStyle = '#c9b8a0'; ctx.fillText(short(a.gift, 10), x + w - 54, yy); }
      else { ctx.font = `800 19px ${FONT}`; ctx.fillStyle = '#ffcf7a'; ctx.fillText(a.gift ? short(a.gift, 12) : `${a.min} xu`, x + w - 16, yy); }
      ctx.textAlign = 'left';
    });
  }
  function drawFloats(t) {
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i], p = (t - f.t0) / 2;
      if (p > 1) { floats.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = Math.min(1, (1 - p) * 3);
      ctx.font = `800 ${f.size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 6; ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - p * 70);
      ctx.restore();
    }
  }
  function drawBanner(t) {
    const b = banner, p = (t - b.t0) / b.dur;
    if (p > 1) { banner = null; return; }
    const a = Math.min(1, p * 8, (1 - p) * 4), s = 1 + (1 - ease(Math.min(1, p * 5))) * 0.4;
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(W / 2, 1000); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(8,3,3,.86)'; rr(-470, -78, 940, b.sub ? 150 : 110, 26); ctx.fill();
    ctx.strokeStyle = b.color; ctx.globalAlpha = a * 0.6; ctx.lineWidth = 2.5; rr(-464, -72, 928, (b.sub ? 150 : 110) - 12, 22); ctx.stroke(); ctx.globalAlpha = a;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 64px ${SERIF}`; ctx.shadowColor = b.color; ctx.shadowBlur = 24; ctx.fillStyle = b.color;
    ctx.fillText(b.text, 0, -22);
    if (b.sub) { ctx.shadowBlur = 0; ctx.font = `700 26px ${FONT}`; ctx.fillStyle = '#f6ead6'; const ls = wrapPlain(b.sub, 880).slice(0, 2); ls.forEach((l, i) => ctx.fillText(l, 0, 32 + i * 32)); }
    ctx.restore();
  }

  // ======================================================================
  // VÒNG LẶP
  // ======================================================================
  let fps = 60, fpsAcc = 0, fpsN = 0;
  function frame() {
    const t = now();
    const dt = Math.min(0.1, t - lastT); lastT = t;
    fpsAcc += dt; fpsN++; if (fpsAcc > 1) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
    try {
      update(dt, t);
      ctx.save();
      const sx = shake > 0 ? rand(-shake, shake) : 0, sy = shake > 0 ? rand(-shake, shake) : 0;
      if (shake > 0) ctx.translate(sx, sy);
      if (use3D()) {
        MA3D.frame({ t, dt, viewers: [...viewers.values()], oil, flick: lampFlick, yin, map: curMap, talking: narrating() || !!(window.MC && MC.speaking) || story.typed < [...story.text].length, mouth: window.MaAudio && MaAudio.voiceBusy ? MaAudio.voiceLevel() : null, shockAt, shake: shake > 0 ? { x: -sx, y: -sy } : null, trura: !!(ev && ev.type === 'trura') });
        ctx.clearRect(-30, -30, W + 60, H + 60);
      } else { ctx.fillStyle = '#000'; ctx.fillRect(-30, -30, W + 60, H + 60); }
      drawScene(t);
      drawHUD(t);
      drawJumpscare(t);
      if (flash > 0) { ctx.fillStyle = `rgba(${flashColor},${flash})`; ctx.fillRect(-30, -30, W + 60, H + 60); }
      ctx.restore();
    } catch (e) { console.error(e); }
    requestAnimationFrame(frame);
  }

  // ======================================================================
  // KẾT NỐI
  // ======================================================================
  const socket = io();
  socket.on('connect', () => socket.emit('hello', 'ma', { obs: OBS }));
  socket.on('ma:primary', v => { isPrimary = !!v; });
  socket.on('ma:settings', s => {
    if (!s || typeof s !== 'object') return;
    Object.assign(S, window.MA_DEFAULTS, s);
    if (!Array.isArray(S.actions) || !S.actions.length) S.actions = window.MA_DEFAULTS.actions;
    for (const a of ACTIONS) if (!S.actions.find(x => x.id === a.id)) S.actions.push({ id: a.id, gift: '', min: a.min });
    if (window.MaAudio) MaAudio.setVolume(S.volume);
    applyTTS();
    pickMap(false);
  });
  socket.on('gifts', g => { GIFTS = g || {}; });
  socket.on('top', list => { TOP = list || []; for (const u of TOP) { const c = coinsOf.get(u.id) || { c: 0, name: u.name }; c.c = Math.max(c.c, +u.coins || 0); c.name = u.name; coinsOf.set(u.id, c); } });
  socket.on('ma:braveTop', list => { BRAVE_TOP = Array.isArray(list) ? list : []; });
  socket.on('ev', e => { try { onEvent(e); } catch (err) { console.error('ev', err); } });
  socket.on('ma:cmd', c => {
    if (!c || typeof c.type !== 'string') return;
    switch (c.type) {
      case 'start': { const st = STORIES.find(s => s.id === c.story) || pick(STORIES); vote = null; startStory(st); break; }
      case 'next': if (story.phase === 'tell') story.nextAt = story.clock; else if (story.phase === 'cast' || story.phase === 'end' || story.phase === 'inter') story.waitUntil = story.clock; if (vote) vote.end = now(); break;
      case 'pause': story.paused = true; break;
      case 'resume': story.paused = false; break;
      case 'stop': vote = null; startIntermission(); break;
      case 'event': {
        const map = { possess: 'nhap', doll: 'bupbe', ouija: 'cauco', ghost: 'goihon', blackout: 'blackout', exorcise: 'trura', knock: 'go', scare: 'hu', salt: 'muoi', incense: 'nhang' };
        const id = map[c.name] || c.name;
        if (id === 'blackout') { oil = 0.01; queueEvent('blackout'); }
        else queueEvent(id, null, {});
        break;
      }
      case 'jumpscare': doJumpscare(); break;
      case 'oil': oil = clamp(+c.v || 0, 0, 100); break;
      case 'yin': yin = clamp(+c.v || 0, 0, 100); break;
      case 'freeAll': for (const v of seated()) if (v.taken) returnViewer(v, true); break;
      case 'endEvent': if (ev) endEvent(); evQueue.length = 0; break;
      case 'say': if (typeof c.text === 'string' && c.text.trim()) { const tx = c.text.trim().slice(0, 200); setLine([{ t: tx, hl: 0 }], tx); if (story.phase === 'tell') story.nextAt = Math.max(story.nextAt, story.clock + clamp(1.8 + tx.length / 13, 3.6, 13)); } break;
      case 'clearSeats': for (const v of [...viewers.values()]) removeViewer(v); waiting.clear(); break;
    }
  });
  setInterval(() => {
    if (!isPrimary) return;
    socket.emit('ma:status', {
      phase: story.phase, story: story.st ? story.st.title : '', part: story.part, line: story.text.slice(0, 160), paused: story.paused,
      seated: seated().length, alive: alive().length, taken: seated().filter(v => v.taken).length, waiting: waiting.size,
      oil: Math.round(oil), yin: Math.round(yin), event: ev ? ev.type : '', queue: evQueue.map(x => x.type),
      vote: vote ? { q: vote.q, opts: vote.opts.map(o => ({ label: o.label, w: o.w })), left: Math.max(0, Math.round(vote.end - now())) } : null,
      thay: thayName().name, fps: Math.round(fps), res3d: use3D() && MA3D.quality ? MA3D.quality().res : null, roles: story.roles ? ['A', 'B', 'C'].map(k => story.roles[k].name) : [],
      brave: braveTop(10),
    });
  }, 2000);

  // âm thanh: OBS tự phát; trình duyệt cần bấm một lần
  const tap = document.getElementById('tap');
  function initAudio() { if (window.MaAudio) { MaAudio.init(); MaAudio.resume(); MaAudio.setVolume(S.volume); } checkAudio(); }
  function checkAudio() { if (tap) tap.style.display = window.MaAudio && MaAudio.suspended() && !OBS ? 'flex' : 'none'; }
  addEventListener('pointerdown', initAudio);
  addEventListener('keydown', initAudio);
  initAudio(); setTimeout(checkAudio, 800);

  // phím tắt khi xem thử
  addEventListener('keydown', e => {
    if (e.key === ' ') story.paused = !story.paused;
    if (e.key === 'n') { if (story.phase === 'tell') story.nextAt = story.clock; else story.waitUntil = story.clock; }
  });

  window.__seats = SEATS.length;
  window.__maShared = { SEATS, MIRROR, S, setLayout, teller: null, setFire: p => { LX = p.x; LY = p.y; } };
  pickMap(false);
  window.__ma = { S, viewers, story, get ev() { return ev; }, get vote() { return vote; }, get oil() { return oil; }, set oil(v) { oil = v; }, get yin() { return yin; }, set yin(v) { yin = v; }, onEvent, queueEvent };
  requestAnimationFrame(frame);
})();
