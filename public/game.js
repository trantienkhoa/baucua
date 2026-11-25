'use strict';
// Màn hình LIVE: Tàu Đà Lạt – Trại Mát (canvas 1080 x 1920)
const Q = new URLSearchParams(location.search);
const OBS = Q.has('obs'), MUTE = Q.get('mute') === '1';
if (OBS) document.body.classList.add('obs');
const $ = id => document.getElementById(id);
const stage = $('stage'), cv = $('scene'), mainCtx = cv.getContext('2d');
let g = mainCtx; // bút vẽ hiện tại (đổi tạm sang canvas khác khi vẽ ảnh lưu niệm)
const W = 1080, H = 1920, RAIL = 1080, ROUTE = 7, PX = 7000; // 1 km = 7000 px thế giới
function fit() { const s = Math.min(innerWidth / W, innerHeight / H); stage.style.transform = `translate(${(innerWidth - W * s) / 2}px,${(innerHeight - H * s) / 2}px) scale(${s})`; }
addEventListener('resize', fit); fit();

// ---------------------------------------------------------------- tiện ích
const hash = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const imgs = new Map();
function avatarImg(url) {
  if (!url) return null;
  let im = imgs.get(url);
  if (!im) { im = new Image(); im.referrerPolicy = 'no-referrer'; im.src = url; imgs.set(url, im); if (imgs.size > 300) imgs.delete(imgs.keys().next().value); }
  return im.complete && im.naturalWidth ? im : null;
}
const COLORS = ['#c0392b', '#2e86de', '#16a085', '#8e44ad', '#d35400', '#27ae60', '#e84393', '#6c5ce7'];
const colorOf = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return COLORS[Math.abs(h) % COLORS.length]; };
// lượt về: đoàn tàu được vẽ lật ngang (đầu máy hướng sang trái); chữ và ảnh đại diện phải lật lại cho đọc được
let FLIP = false;
function unflip(x, fn) { if (!FLIP) return fn(); g.save(); g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); fn(); g.restore(); }
function txt(s, x, y) { unflip(x, () => g.fillText(s, x, y)); }
function drawAvatar(x, y, r, p, ring) { unflip(x, () => drawAvatar0(x, y, r, p, ring)); }
function drawAvatar0(x, y, r, p, ring) {
  g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.closePath();
  const im = p && avatarImg(p.avatar);
  if (im) { g.clip(); g.drawImage(im, x - r, y - r, r * 2, r * 2); }
  else { g.fillStyle = colorOf(p ? p.name : '?'); g.fill(); g.fillStyle = '#fff'; g.font = `800 ${r * 1.1}px "Be Vietnam Pro",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(((p && p.name) || '?').trim().charAt(0).toUpperCase(), x, y + 1); }
  g.restore();
  if (ring) { g.lineWidth = ring; g.strokeStyle = '#ffd36b'; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); }
}
function avatarHtml(name, url, cls = 'av') {
  return url ? `<img class="${cls}" src="${esc(url)}" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=&quot;${cls}&quot;>${esc((name || '?').charAt(0))}</div>'">` : `<div class="${cls}" style="background:${colorOf(name)}">${esc((name || '?').trim().charAt(0).toUpperCase())}</div>`;
}
function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// ---------------------------------------------------------------- trạng thái từ server
let S = { ph: 'board', km: 0, sp: 0, pr: 20, leg: 0, trip: 1, left: 0, boost: 0, timeX: 6, vol: { sfx: 70, voice: 100, music: 35 }, tts: true };
let srvAt = performance.now(), R = { cars: {}, count: {}, recent: [], total: 0, driver: null };
let dispKm = 0, prevPhase = '', tripSeen = -1;
const sock = io();
sock.on('s', s => {
  if (s.trip !== tripSeen || (s.leg !== S.leg)) { if (s.trip !== tripSeen) { backCache.clear(); particles.length = 0; } tripSeen = s.trip; dispKm = s.km; }
  if (Math.abs(s.km - dispKm) > 0.6) dispKm = s.km;
  S = s; srvAt = performance.now();
});
sock.on('roster', r => {
  // ai vừa lên toa VIP / Lareine → camera lia tới toa đó, toa sáng lên
  const where = () => { const m = new Map(); for (const c of trainCars()) if (c.cls === 'vip' || c.cls === 'lareine') for (const p of c.list) m.set(p.id, c.key); return m; };
  const before = where(); R = r; const after = where();
  for (const [id, key] of after) if (before.get(id) !== key) { focusWagon = key; focusUntil = performance.now() + 6000; glow.set(key, performance.now()); }
});
sock.on('fx', onFx);
// chỉ một màn hình được phát tiếng (server chọn, ưu tiên màn hình OBS) → mở nhiều màn hình cũng không bị đè giọng
// thêm ?voice=1 vào link để ép màn hình đó phát tiếng
let isVoice = false;
sock.on('connect', () => sock.emit('screen:hello', { obs: OBS, force: Q.get('voice') === '1' }));
sock.on('voiceMaster', id => setVoice(!!id && id === sock.id));
function setVoice(v) {
  if (v === isVoice) return;
  isVoice = v;
  const badge = $('mutedBadge'); if (badge) badge.style.display = v || OBS ? 'none' : 'block';
  if (!v) { if (window.MC) { MC.enabled = false; MC.hold = false; MC.stopAll(); } if (music) music.pause(); if (master) master.gain.value = 0; }
  else { if (music) music.play().catch(() => {}); else playMusic(); }
}

// ---------------------------------------------------------------- âm thanh tổng hợp (không cần file)
let AC = null, master = null;
function audio() {
  if (MUTE || !isVoice) return null;
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.connect(AC.destination); } catch { return null; } }
  if (AC.state === 'suspended') AC.resume().catch(() => {});
  master.gain.value = (S.vol ? S.vol.sfx : 70) / 100;
  return AC;
}
let noiseBuf = null;
function noise() { if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } const s = AC.createBufferSource(); s.buffer = noiseBuf; return s; }
function env(node, t, a, peak, dur) { node.gain.setValueAtTime(0.0001, t); node.gain.exponentialRampToValueAtTime(peak, t + a); node.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
function chuff(vol) {
  const a = audio(); if (!a || a.state !== 'running') return; const t = a.currentTime;
  const n = noise(), f = a.createBiquadFilter(), v = a.createGain(); f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.7;
  n.connect(f); f.connect(v); v.connect(master); env(v, t, 0.01, 0.25 * vol, 0.16); n.start(t, Math.random() * 0.5); n.stop(t + 0.2);
}
function clack() {
  const a = audio(); if (!a || a.state !== 'running') return; const t = a.currentTime;
  for (const dt of [0, 0.09]) { const o = a.createOscillator(), v = a.createGain(); o.type = 'square'; o.frequency.value = 140; o.connect(v); v.connect(master); env(v, t + dt, 0.002, 0.05, 0.05); o.start(t + dt); o.stop(t + dt + 0.06); }
}
function whistle(times = 2) {
  const a = audio(); if (!a) return; const t0 = a.currentTime;
  for (let k = 0; k < times; k++) {
    const t = t0 + k * 0.75, len = k === times - 1 ? 1.1 : 0.55;
    for (const fr of [392, 494, 587]) { const o = a.createOscillator(), v = a.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(fr * 0.97, t); o.frequency.linearRampToValueAtTime(fr, t + 0.08); const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800; o.connect(f); f.connect(v); v.connect(master); v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(0.06, t + 0.06); v.gain.setValueAtTime(0.06, t + len - 0.1); v.gain.exponentialRampToValueAtTime(0.0001, t + len); o.start(t); o.stop(t + len + 0.05); }
    const n = noise(), nf = a.createBiquadFilter(), nv = a.createGain(); nf.type = 'highpass'; nf.frequency.value = 3000; n.connect(nf); nf.connect(nv); nv.connect(master); env(nv, t, 0.05, 0.05, len); n.start(t); n.stop(t + len);
  }
}
function tone(freqs, type = 'sine', step = 0.09, dur = 0.35, vol = 0.12) {
  const a = audio(); if (!a) return; const t0 = a.currentTime;
  freqs.forEach((fr, i) => { const o = a.createOscillator(), v = a.createGain(); o.type = type; o.frequency.value = fr; o.connect(v); v.connect(master); env(v, t0 + i * step, 0.01, vol, dur); o.start(t0 + i * step); o.stop(t0 + i * step + dur + 0.05); });
}
function hiss(dur = 1.6, vol = 0.18) { // xì hơi nồi hơi
  const a = audio(); if (!a) return; const t = a.currentTime;
  const n = noise(), f = a.createBiquadFilter(), v = a.createGain(); f.type = 'highpass'; f.frequency.value = 2500;
  n.loop = true; n.connect(f); f.connect(v); v.connect(master); env(v, t, 0.05, vol, dur); n.start(t); n.stop(t + dur + 0.1);
}
function brake() { // tiếng phanh rít khi vào ga
  const a = audio(); if (!a) return; const t = a.currentTime;
  for (const fr of [2300, 3100]) {
    const o = a.createOscillator(), v = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
    o.frequency.value = fr; lfo.frequency.value = 7; lg.gain.value = 40; lfo.connect(lg); lg.connect(o.frequency);
    o.connect(v); v.connect(master); v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(0.025, t + 0.3); v.gain.setValueAtTime(0.025, t + 2); v.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    o.start(t); lfo.start(t); o.stop(t + 3); lfo.stop(t + 3);
  }
  hiss(2.5, 0.1);
}
let brakeDone = false;
// còi trực ban ga: "tuýt – tuýyyyt" (hai hồi, hồi sau dài, có tiếng rè của hạt còi)
function stationWhistle() {
  const a = audio(); if (!a) return; const t0 = a.currentTime;
  for (const [st, len] of [[0, 0.32], [0.45, 0.95]]) {
    const o = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), f = a.createBiquadFilter(), v = a.createGain();
    o.type = 'triangle'; o.frequency.value = 2850; lfo.frequency.value = 38; lg.gain.value = 260; lfo.connect(lg); lg.connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = 2900; f.Q.value = 2; o.connect(f); f.connect(v); v.connect(master);
    const t = t0 + st; v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(0.22, t + 0.03); v.gain.setValueAtTime(0.22, t + len - 0.06); v.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.start(t); lfo.start(t); o.stop(t + len + 0.05); lfo.stop(t + len + 0.05);
  }
}
let whistleKey = '';
const sfx = {
  bell: () => tone([1046, 784, 1046, 784], 'sine', 0.32, 0.8, 0.12),
  gift: () => tone([784, 988, 1175, 1568], 'triangle', 0.07, 0.3, 0.1),
  big: () => tone([523, 659, 784, 1046, 1318, 1568], 'triangle', 0.08, 0.5, 0.13),
  win: () => tone([659, 784, 1046], 'triangle', 0.12, 0.5, 0.13),
  fail: () => tone([392, 330, 262], 'sine', 0.16, 0.5, 0.1),
  event: () => tone([880, 660, 880, 660], 'square', 0.12, 0.12, 0.05),
  pop: () => tone([1200 + Math.random() * 400], 'sine', 0, 0.08, 0.03),
  board: () => tone([660, 880], 'sine', 0.06, 0.18, 0.05),
};
// giọng MC
// giọng MC + phát thanh viên: bộ đọc AI VieNeu-TTS (public/tts.js, dùng chung với Thắp Sáng Quê Hương)
const MC = window.MC;
sock.on('ttsStatus', st => { if (MC) MC.setStatus(st); });
function mcSync() {
  if (!MC) return;
  MC.enabled = !MUTE && isVoice && S.tts !== false;
  MC.setNeural(true, S.voice);
  MC.rate = S.rate || 1.25;
  MC.volume = clamp((S.vol ? S.vol.voice : 100) / 100, 0, 1);
}
// kind: 'mc' (người dẫn), 'guide' (hướng dẫn viên thuyết minh), 'ann' (phát thanh viên — đọc ưu tiên, giọng riêng)
function say(text, kind = 'mc') {
  if (!MC || !isVoice) return; mcSync();
  const voice = kind === 'ann' ? S.annVoice : kind === 'guide' ? S.guideVoice : '';
  MC.say(text, kind === 'ann', false, voice || '');
}
// phát thanh: giữ hàng đợi lại, chờ câu đang đọc xong, rung chuông "ting – tong" rồi mới đọc (không chen ngang, không đè giọng)
const annQ = []; let annBusy = false;
let annToken = 0;
function announce(text, urgent) {
  if (!MC || !isVoice) return;
  if (urgent) { // tàu sắp chạy: ngắt ngang ngay câu đang đọc, bỏ các câu đang chờ, phát thanh luôn
    annToken++; annQ.length = 0; annQ.push(text); annBusy = false;
    MC.hold = true; MC.stopAll();
    nextAnn(true); return;
  }
  annQ.push(text); if (annQ.length > 2) annQ.shift();
  nextAnn();
}
function nextAnn(now) {
  if (annBusy || !annQ.length || !isVoice) return;
  annBusy = true; MC.hold = true;
  const t0 = performance.now(), tk = annToken;
  const wait = () => {
    if (tk !== annToken) return; // đã có phát thanh khẩn chen ngang
    if (!isVoice) { annBusy = false; MC.hold = false; annQ.length = 0; return; }
    if (!now && MC.speaking && performance.now() - t0 < 20000) return setTimeout(wait, 120);
    tone([1175, 880], 'sine', 0.55, 1.4, 0.14);
    setTimeout(() => {
      if (tk !== annToken) return;
      const text = annQ.shift(); mcSync();
      if (text) MC.say(text, true, false, S.annVoice || '');
      MC.release();
      // phát thanh tiếp theo (nếu có) chờ câu này đọc xong
      const done = () => { if (tk !== annToken) return; if (MC.speaking || (MC.queue && MC.queue.some(it => it.prio))) return setTimeout(done, 200); annBusy = false; nextAnn(); };
      setTimeout(done, 300);
    }, 1300);
  };
  wait();
}
// nhạc nền: chép mp3 vào public\music
let music = null, musicList = [], musicIdx = 0;
fetch('/api/music').then(r => r.json()).then(l => { musicList = l; playMusic(); }).catch(() => {});
function playMusic() {
  if (MUTE || !isVoice || !musicList.length) return;
  music = new Audio('/music/' + encodeURIComponent(musicList[musicIdx++ % musicList.length]));
  music.onended = playMusic; music.play().catch(() => {});
}
const soundBtn = $('sound');
soundBtn.onclick = () => { audio(); if (music) music.play().catch(() => {}); else playMusic(); soundBtn.remove(); };
setTimeout(() => { audio(); if (AC && AC.state === 'running') soundBtn.remove(); }, 800);

// ---------------------------------------------------------------- bản đồ Việt Nam thu nhỏ (có Hoàng Sa, Trường Sa)
fetch('vn.json').then(r => r.json()).then(drawVN).catch(() => {});
function drawVN(m) {
  const c = $('vnmap').getContext('2d'), w = 176, h = 330;
  const X = lon => (lon - 102) / (117.6 - 102) * w, Y = lat => (23.6 - lat) / (23.6 - 8.2) * h;
  c.fillStyle = 'rgba(24,18,14,.72)'; c.beginPath(); c.roundRect(0, 0, w, h, 18); c.fill();
  c.strokeStyle = 'rgba(255,211,107,.5)'; c.lineWidth = 2; c.stroke();
  c.save(); c.beginPath(); c.roundRect(2, 2, w - 4, h - 4, 16); c.clip();
  for (const [k, rings] of Object.entries(m)) {
    c.fillStyle = k === 'vn' ? '#e8b04a' : 'rgba(255,255,255,.12)';
    for (const ring of rings) { c.beginPath(); ring.forEach(([lo, la], i) => i ? c.lineTo(X(lo), Y(la)) : c.moveTo(X(lo), Y(la))); c.closePath(); c.fill(); }
  }
  c.fillStyle = '#e8b04a'; c.font = '700 11px "Be Vietnam Pro",sans-serif'; c.textAlign = 'center';
  for (const [lo, la] of [[111.6, 16.4], [112.1, 16.6], [111.2, 16.1]]) { c.beginPath(); c.arc(X(lo), Y(la), 2, 0, 7); c.fill(); }
  for (const [lo, la] of [[114.3, 10.4], [113.8, 9.8], [115.0, 10.9], [114.6, 9.4]]) { c.beginPath(); c.arc(X(lo), Y(la), 2, 0, 7); c.fill(); }
  c.fillText('Hoàng Sa', X(111.8), Y(17.3)); c.fillText('(Việt Nam)', X(111.8), Y(16.75) + 6);
  c.fillText('Trường Sa', X(114.3), Y(11.7)); c.fillText('(Việt Nam)', X(114.3), Y(11.2) + 6);
  const dx = X(108.44), dy = Y(11.94); // Đà Lạt
  c.fillStyle = '#ff3b30'; c.beginPath(); c.arc(dx, dy, 7, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.stroke();
  c.fillStyle = '#fff'; c.font = '800 15px "Be Vietnam Pro",sans-serif'; c.textAlign = 'right'; c.fillText('Đà Lạt', dx - 10, dy + 5);
  c.restore();
}

// ---------------------------------------------------------------- bảng tuyến đường
const SIGHTS = [[1.2, 'Đồi thông'], [2.5, 'Làng rau'], [3.6, 'Dốc cao'], [4.8, 'Thung lũng hoa'], [6.0, 'Nhà kính']];
(function buildRoute() {
  const line = $('line'), route = $('route');
  const pos = km => `calc(70px + (100% - 140px) * ${km / ROUTE})`;
  route.insertAdjacentHTML('beforeend', `<div class="st" style="left:${pos(0)}"><b>Ga Đà Lạt</b></div><div class="st" style="left:${pos(ROUTE)}"><b>Ga Trại Mát</b></div>` +
    SIGHTS.map(([k, n]) => `<div class="sg" style="left:${pos(k)}"><i>${n}</i></div>`).join(''));
  void line;
})();

// ---------------------------------------------------------------- hạt (khói, tim, cánh hoa, pháo hoa)
const particles = [];
function addP(p) { if (particles.length < 600) particles.push(p); }
// giới hạn hiệu ứng để quà dồn dập cũng không che màn hình: tối đa 45 cánh hoa và 2 chùm pháo hoa cùng lúc
const countK = k => { let n = 0; for (const p of particles) if (p.k === k) n++; return n; };
function petals(n) {
  n = Math.min(n, 45 - countK('petal'), 24);
  for (let i = 0; i < n; i++) addP({ k: 'petal', x: Math.random() * W, y: -20 - Math.random() * 300, vx: -30 + Math.random() * 60, vy: 120 + Math.random() * 90, r: 5 + Math.random() * 5, a: Math.random() * 7, va: -3 + Math.random() * 6, c: ['#a29bfe', '#74b9ff', '#fd79a8', '#ffeaa7', '#e17055', '#ffffff'][i % 6], life: 5.5 });
}
function firework(x, y) {
  if (countK('spark') > 70) return;
  y = clamp(y, 420, 720); // nổ trên bầu trời, dưới HUD, không đè đoàn tàu
  const c = ['#ffd36b', '#ff6b6b', '#7df9ff', '#a29bfe', '#55efc4', '#fd79a8'][Math.floor(Math.random() * 6)];
  for (let i = 0; i < 36; i++) { const a = Math.random() * 7, s = 150 + Math.random() * 380; addP({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c, life: 1.3 + Math.random() * 0.6, max: 1.9 }); }
  const a = audio(); if (a) { const t = a.currentTime, n = noise(), v = a.createGain(), f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; n.connect(f); f.connect(v); v.connect(master); env(v, t, 0.005, 0.25, 0.6); n.start(t); n.stop(t + 0.7); }
}
function hearts(n) { for (let i = 0; i < n; i++) addP({ k: 'heart', x: 120 + Math.random() * 840, y: RAIL + 60 + Math.random() * 80, vx: -20 + Math.random() * 40, vy: -160 - Math.random() * 140, r: 14 + Math.random() * 12, c: ['#ff4d6d', '#ff8fab', '#ff3b30', '#ffb3c6'][i % 4], life: 2.2 }); }

// ---------------------------------------------------------------- hiệu ứng từ server
let horn = 0, eventFx = { cowOut: 0, treeOut: 0 }, lastCardKey = '', sightToast = null, flash = 0, shake = 0;
let focusWagon = null, focusUntil = 0; const glow = new Map();
function onFx(e) {
  switch (e.t) {
    case 'say': say(e.text, e.kind || 'mc'); break;
    case 'announce': announce(e.text, e.urgent); break;
    case 'depart': whistle(2); horn = 2; hiss(2.2); brakeDone = false; break;
    case 'arrive': sfx.bell(); setTimeout(stationWhistle, 700); break; // trực ban thổi còi đón tàu
    case 'horn': whistle(1); horn = 1.2; break;
    case 'board': if (window.R3D && window.R3D.ok) window.R3D.onBoard(e); if (e.pass) queuePass(e.pass); sfx.board(); ticket(e.name, e.avatar, `🎫 vé ${e.code || ''} · ${e.seat || ''}` + (e.rides >= 2 ? ` · ⭐ khách quen ×${e.rides}` : '')); break;
    case 'pass': queuePass(e.pass, true); break;
    case 'lucky': showLucky(e); break;
    case 'berryStart': sfx.win(); break;
    case 'berry': berries(1); if (Math.random() < 0.4) sfx.pop(); break;
    case 'berryEnd': sfx.win(); petals(40); break;
    case 'goal': sfx.big(); flash = 0.3; petals(24); for (let i = 0; i < 8; i++) setTimeout(() => firework(150 + Math.random() * 780, 450 + Math.random() * 400), i * 350); break;
    case 'like': if (Math.random() < 0.5) hearts(Math.min(4, Math.ceil(e.n / 4))); if (Math.random() < 0.3) sfx.pop(); break;
    case 'gift': gift(e); break;
    case 'follow': ticket(e.name, e.avatar, '➕ theo dõi'); petals(25); sfx.win(); break;
    case 'share': ticket(e.name, e.avatar, '🔗 chia sẻ'); petals(25); sfx.win(); break;
    case 'member': if (Math.random() < 0.4) ticket(e.name, '', '👋 vào xem'); break;
    case 'sight': {
      const n = performance.now(); sightToast = { name: e.name, until: n + 4500 };
      if (S.night && (e.name === 'Làng rau' || e.name === 'Nhà kính') && !(vipShow && n < vipShow.until)) // tàu đêm: ban nhạc biểu diễn trong khoang
        vipShow = { name: 'Ban nhạc tàu đêm', avatar: '', tier: 1, start: n, until: n + 8000, caption: '🎷 Ban nhạc tàu đêm đang biểu diễn' };
      break;
    }
    case 'event': sfx.event(); if (e.type === 'cow') eventFx.cowOut = 0; if (e.type === 'tree') eventFx.treeOut = 0; break;
    case 'eventEnd': (e.win ? sfx.win : sfx.fail)(); if (e.win) { petals(30); flash = 0.5; } eventFx.end = { type: e.type, win: e.win, hero: e.hero, until: performance.now() + 3500 }; break;
    case 'finish': showFinish(e); startPhoto(e); setTimeout(stationWhistle, 700); break;
    case 'photo': startPhoto(e); break;
  }
}
function ticket(name, avatar, what) {
  const box = $('board');
  const el = document.createElement('div'); el.className = 'tk';
  el.innerHTML = avatarHtml(name, avatar) + `<span>${esc(name)} ${what}</span>`;
  box.appendChild(el);
  while (box.children.length > 6) box.firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 4000);
}
// băng-rôn quà: tối đa 2 cái; cùng một người tặng liên tiếp thì cộng dồn vào băng-rôn đang hiện (không tạo thêm)
const giftBans = new Map(); // tên người tặng → { el, timer, n, coins }
let lastBigFx = 0;
function gift(e) {
  const feed = $('feed');
  const TAG = { lareine: '👑 Toa La Reine', vip: '✨ Toa VIP', mem: '🛋 Toa ngồi mềm', cung: '⚡ Tăng tốc' };
  const tier = e.coins >= 500 ? 3 : e.cls === 'lareine' ? 2 : e.cls === 'vip' ? 1 : 0;
  let b = giftBans.get(e.name);
  if (!b) { b = { el: document.createElement('div'), n: 0, coins: 0 }; giftBans.set(e.name, b); feed.prepend(b.el); }
  b.n += e.n || 1; b.coins += e.coins;
  b.el.className = 'ban t' + Math.max(tier, b.tier || 0); b.tier = Math.max(tier, b.tier || 0);
  b.el.innerHTML = avatarHtml(e.name, e.avatar) + `<div><em>${esc(e.name)}</em> tặng ${esc(e.gift)}${b.n > 1 ? ' x' + b.n : ''}<small>${e.upgraded ? 'Mời lên ' + TAG[e.cls] + '!' : TAG[e.cls] + ' · ' + b.coins + ' xu'}</small></div>` + (e.img ? `<img class="gi" src="${esc(e.img)}" referrerpolicy="no-referrer">` : '');
  while (feed.children.length > 2) { const last = feed.lastChild; for (const [k, v] of giftBans) if (v.el === last) { clearTimeout(v.timer); giftBans.delete(k); } last.remove(); }
  clearTimeout(b.timer);
  b.timer = setTimeout(() => { b.el.classList.add('out'); setTimeout(() => b.el.remove(), 400); giftBans.delete(e.name); }, e.coins >= 100 ? 5000 : 3200);
  petals(Math.min(24, 4 + e.coins));
  const now = performance.now();
  if (e.coins >= 100 && now - lastBigFx > 2500) { // hiệu ứng lớn: tối đa 1 lần mỗi 2,5 giây
    lastBigFx = now; sfx.big(); flash = Math.max(flash, e.coins >= 500 ? 0.35 : 0.18); if (e.coins >= 500) shake = 0.35;
    for (let i = 0; i < (e.coins >= 500 ? 4 : 2); i++) setTimeout(() => firework(160 + Math.random() * 760, 440 + Math.random() * 260), i * 420);
  } else sfx.gift();
  const lux = e.cls === 'vip' || e.cls === 'lareine';
  if (e.upgraded && lux) whistle(1);
  // bản 2D: khung "khoang VIP" chỉ hiện khi mới lên hạng, 4 giây (bản 3D thì máy quay dí sát cửa sổ người đó thay cho khung này)
  if (lux && e.upgraded && !(vipShow && now < vipShow.until)) vipShow = { name: e.name, avatar: e.avatar, cls: e.cls, tier: e.coins >= 500 ? 3 : 2, start: now, until: now + 4000 };
}
// 🎫 thẻ lên tàu kiểu giấy in nhiệt (theo bố cục vé thật), mỗi tấm hiện ~3,8 giây, xếp hàng tối đa 4 tấm
const passQ = []; let passBusy = false;
function queuePass(p, prio) {
  if (!p) return;
  prio ? passQ.unshift(p) : passQ.push(p);
  if (passQ.length > 4) passQ.length = 4; // đông khách thì bỏ bớt, chỉ in vé mới nhất (đổi vé VIP luôn được ưu tiên)
  nextPass();
}
function nextPass() {
  if (passBusy || !passQ.length) return;
  passBusy = true;
  const p = passQ.shift(), el = $('pass');
  el.innerHTML = `<div class="side"><span>TÀU ĐÀ LẠT – TRẠI MÁT</span></div>
    <div class="hd">TÀU ĐÀ LẠT – TRẠI MÁT</div><div class="hd2">THẺ LÊN TÀU HỎA/BOARDING PASS</div>
    <canvas width="640" height="104"></canvas>
    <div class="tid">Mã vé/TicketID: ${esc(p.id)}</div>
    <div class="row2"><span>Ga đi/From</span><span>Ga đến/To</span></div>
    <div class="st"><span>${esc(p.from)}</span><span>${esc(p.to)}</span></div>
    <div class="ln"><span>Tàu/Train:</span><b>${esc(p.code)}</b></div>
    <div class="ln"><span>Ngày đi/Date:</span><b>${esc(p.date)}</b></div>
    <div class="ln"><span>Giờ đi/Time:</span><b>${esc(p.dep)}</b></div>
    <div class="ln two"><span style="width:auto">Toa/Coach: <b>${p.coach}</b></span><span style="width:auto">Chỗ/Seat: <b>${p.seat}</b></span></div>
    <div class="ln"><span>Loại chỗ/Class:</span><b>${esc(p.cls)}</b></div>
    <div class="ln"><span>Loại vé/Ticket:</span><b>${esc(p.type)}</b></div>
    <div class="ln nm"><span>Họ tên/Name:</span>${avatarHtml(p.name, p.avatar)}<b>${esc(p.name)}</b></div>
    <div class="ft">Chúc quý khách một chuyến đi vui vẻ trên cao nguyên Lâm Viên · Have a nice trip</div>
    ${p.upgrade ? '<div class="up">ĐỔI VÉ</div>' : ''}`;
  // mã vạch trang trí (sinh từ mã vé, không phải mã vạch thật)
  const c = el.querySelector('canvas').getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 640, 104); c.fillStyle = '#111';
  let s = 0; for (const ch of p.id) s = (s * 131 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
  for (const x of [0, 8, 16]) c.fillRect(x, 0, 4, 104); for (const x of [620, 628, 636]) c.fillRect(x, 0, 4, 104);
  for (let x = 30; x < 610; x += 6) for (let y = 0; y < 104; y += 8) if (rnd() < 0.55) c.fillRect(x, y, 6, 8);
  el.classList.add('on');
  tone([1400, 1700], 'square', 0.05, 0.05, 0.03); // tiếng máy in vé
  setTimeout(() => { el.classList.remove('on'); setTimeout(() => { passBusy = false; nextPass(); }, 450); }, p.upgrade ? 5000 : 3800);
}
// 🎫 bốc thăm vé may mắn: tên quay vòng rồi dừng ở người trúng
function showLucky(e) {
  const el = $('lucky'), names = (e.spin && e.spin.length ? e.spin : [e.name]);
  el.innerHTML = `<h2>🎫 BỐC THĂM VÉ MAY MẮN · TÀU ${esc(e.code)}</h2><div class="spin" id="luckySpin"></div><small>Mỗi hành khách trên tàu đều có cơ hội!</small>`;
  el.classList.add('on');
  let i = 0, delay = 60;
  const step = () => {
    const sp = $('luckySpin'); if (!sp) return;
    sp.textContent = names[i++ % names.length]; tone([700 + (i % 5) * 60], 'square', 0, 0.04, 0.03);
    delay *= 1.12;
    if (delay < 420) setTimeout(step, delay);
    else {
      el.innerHTML = `<h2>🎉 VÉ MAY MẮN CHUYẾN ${esc(e.code)}</h2>${avatarHtml(e.name, e.avatar)}<div class="spin">${esc(e.name)}</div><small>Xin chúc mừng!</small>`;
      sfx.big(); petals(80); for (let k = 0; k < 4; k++) setTimeout(() => firework(200 + Math.random() * 680, 500 + Math.random() * 300), k * 300);
      setTimeout(() => el.classList.remove('on'), 6000);
    }
  };
  step();
}
// ---------------------------------------------------------------- 📸 ảnh lưu niệm khi tàu về ga Đà Lạt
// 0–0.9 s lia tới các toa · 0.9–2.7 s zoom sát cửa sổ + khung ngắm · đếm 3-2-1 · "tách" + flash
// → hiện bức ảnh lưu niệm (cả đoàn khách đứng trước ga Đà Lạt) · sau đó mới hiện bảng tổng kết
const PHOTO_T = { shot: 4200, show: 4400, done: 12500 };
let photoSeq = null;
const easeIO = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
function preloadImgs(urls, ms) { // nạp sẵn ảnh đại diện để lúc "tách" là có đủ mặt khách
  return Promise.race([
    Promise.all(urls.filter(Boolean).map(u => new Promise(res => {
      const old = imgs.get(u); if (old && old.complete) return res();
      const im = new Image(); im.referrerPolicy = 'no-referrer'; im.onload = im.onerror = res; im.src = u; imgs.set(u, im);
    }))),
    new Promise(res => setTimeout(res, ms)),
  ]);
}
function startPhoto(e) {
  const n = performance.now();
  const people = e.photo || [];
  photoSeq = { start: n, e, people, shot: false };
  const ready = preloadImgs(people.map(p => p.avatar), 3500);
  setTimeout(() => tone([880], 'sine', 0, 0.12, 0.08), 2000);   // 3
  setTimeout(() => tone([880], 'sine', 0, 0.12, 0.08), 2700);   // 2
  setTimeout(() => tone([880], 'sine', 0, 0.12, 0.08), 3400);   // 1
  setTimeout(() => { // tách!
    // bản 3D: chụp đúng khung ngắm máy quay đang thấy (khách VRoid thật trong toa) · bản 2D: vẽ ảnh tập thể trước ga
    const use3d = window.R3D && window.R3D.ok && S.view3d !== false && !Q.has('2d');
    let shotImg = null; try { if (use3d) shotImg = window.R3D.capture({ x: 140, y: 640, w: 800, h: 590 }); } catch (err) { console.warn('Không chụp được khung 3D', err); }
    flash = 1.4; shutter();
    ready.then(() => showSouvenir(shotImg ? makeSouvenir3D(photoSeq.e, people, shotImg) : makeSouvenir(photoSeq.e, people)));
  }, PHOTO_T.shot);
}
function shutter() {
  const a = audio(); if (!a) return; const t = a.currentTime;
  for (const dt of [0, 0.07]) { const n = noise(), f = a.createBiquadFilter(), v = a.createGain(); f.type = 'highpass'; f.frequency.value = 1800; n.connect(f); f.connect(v); v.connect(master); env(v, t + dt, 0.002, 0.3, 0.06); n.start(t + dt); n.stop(t + dt + 0.08); }
}
function drawViewfinder(ph) {
  if (ph < 700) return;
  const a = clamp((ph - 700) / 300, 0, 1), x0 = 140, y0 = 640, x1 = 940, y1 = 1230;
  g.save(); g.globalAlpha = a;
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, W, y0); g.fillRect(0, y1, W, H - y1); g.fillRect(0, y0, x0, y1 - y0); g.fillRect(x1, y0, W - x1, y1 - y0);
  g.strokeStyle = '#fff'; g.lineWidth = 6; const L = 60;
  for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke(); }
  g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.35)';
  for (const k of [1, 2]) { g.beginPath(); g.moveTo(x0 + (x1 - x0) * k / 3, y0); g.lineTo(x0 + (x1 - x0) * k / 3, y1); g.moveTo(x0, y0 + (y1 - y0) * k / 3); g.lineTo(x1, y0 + (y1 - y0) * k / 3); g.stroke(); }
  g.strokeStyle = ph > 2700 ? '#4cff7a' : '#ffd36b'; g.lineWidth = 4; g.strokeRect(470, 860, 140, 110); // ô lấy nét
  g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(x0 + 30, y0 + 36, 10, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = '900 30px "Be Vietnam Pro",sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('ẢNH LƯU NIỆM', x0 + 50, y0 + 37);
  const cd = ph < 2000 ? '' : ph < 2700 ? '3' : ph < 3400 ? '2' : ph < PHOTO_T.shot ? '1' : '';
  if (cd) { g.textAlign = 'center'; g.font = '900 200px "Be Vietnam Pro",sans-serif'; g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,.5)'; g.strokeText(cd, 540, 540); g.fillStyle = '#fff'; g.fillText(cd, 540, 540); }
  g.restore();
}
// vẽ bức ảnh lưu niệm 1080 x 1350: cả đoàn khách đứng trước ga Đà Lạt
function makeSouvenir(e, people) {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
  const prev = g; g = c.getContext('2d');
  try {
    const sky = skyAt();
    const gr = g.createLinearGradient(0, 0, 0, 800); gr.addColorStop(0, sky.top); gr.addColorStop(1, sky.bot); g.fillStyle = gr; g.fillRect(0, 0, 1080, 900);
    g.fillStyle = shade(sky.night, '#8fa9c9', '#1e2648'); g.beginPath(); g.moveTo(0, 640); g.quadraticCurveTo(260, 470, 420, 520); g.quadraticCurveTo(640, 420, 820, 520); g.quadraticCurveTo(960, 480, 1080, 560); g.lineTo(1080, 800); g.lineTo(0, 800); g.fill();
    for (const [x, s] of [[60, 1.3], [1010, 1.2], [180, 0.9], [900, 0.9]]) pine(x, 800, s, sky);
    stationDalat(540, 810, sky);
    // sân ga lát đá
    const pg = g.createLinearGradient(0, 800, 0, 1350); pg.addColorStop(0, shade(sky.night, '#d8d0c0', '#4a4752')); pg.addColorStop(1, shade(sky.night, '#b9b0a0', '#2e2c36'));
    g.fillStyle = pg; g.fillRect(0, 800, 1080, 550);
    g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 2; for (let y = 830; y < 1350; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(1080, y); g.stroke(); }
    // xếp hàng: hàng sau đông, hàng trước là khách VIP / Lareine (đã sắp xếp sẵn từ server)
    const rows = [[], [], []], caps = [5, 6, 7];
    people.slice(0, 18).forEach((p, i) => { const r = i < 5 ? 0 : i < 11 ? 1 : 2; rows[r].push(p); });
    // người tặng nhiều nhất đứng giữa hàng đầu, những người kế tiếp xếp dần ra hai bên
    for (let r = 0; r < 3; r++) { const src = rows[r], out = []; src.forEach((p, i) => i % 2 ? out.unshift(p) : out.push(p)); rows[r] = out; }
    const RY = [1262, 1092, 945], RS = [1.0, 0.84, 0.72];
    for (let r = 2; r >= 0; r--) {
      const row = rows[r], s = RS[r], gap = 1000 / Math.max(caps[r], row.length);
      row.forEach((p, i) => {
        const x = 540 + (i - (row.length - 1) / 2) * gap + (r === 1 ? gap * 0.15 : 0), y = RY[r];
        g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x, y + 4, 52 * s, 12 * s, 0, 0, 7); g.fill();
        g.fillStyle = colorOf(p.name); rr(x - 50 * s, y - 120 * s, 100 * s, 124 * s, 34 * s); g.fill();
        g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.moveTo(x - 14 * s, y - 120 * s); g.lineTo(x, y - 96 * s); g.lineTo(x + 14 * s, y - 120 * s); g.fill();
        drawAvatar0(x, y - 168 * s, 50 * s, p, 5 * s);
        if (r === 0 && p === people[0] && e.top && e.top.length) crown(x, y - 232 * s, 1.4);
        g.fillStyle = 'rgba(0,0,0,.55)'; g.font = `800 ${22 * s}px "Be Vietnam Pro",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        let nm = p.name; while (g.measureText(nm).width > gap - 10 && nm.length > 2) nm = nm.slice(0, -1);
        const tw = g.measureText(nm).width + 18; rr(x - tw / 2, y - 62 * s, tw, 30 * s, 10 * s); g.fill();
        g.fillStyle = '#fff'; g.fillText(nm, x, y - 47 * s);
      });
    }
    if (!people.length) { g.fillStyle = '#3a2a1e'; g.font = '800 40px "Be Vietnam Pro",sans-serif'; g.textAlign = 'center'; g.fillText('Chuyến sau mời bạn lên tàu!', 540, 1100); }
    // băng-rôn tiêu đề
    g.fillStyle = 'rgba(122,29,18,.92)'; rr(90, 30, 900, 120, 22); g.fill(); g.strokeStyle = '#ffd36b'; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#ffd36b'; g.font = '900 46px "Be Vietnam Pro",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('ẢNH LƯU NIỆM · TÀU ' + (e.codes || ''), 540, 72);
    const d = new Date(), date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    g.fillStyle = '#fff4dc'; g.font = '700 28px "Be Vietnam Pro",sans-serif'; g.fillText(`Đà Lạt – Trại Mát · ${date} · ${e.total} hành khách`, 540, 120);
  } finally { g = prev; }
  return c;
}
// ảnh lưu niệm bản 3D: bức ảnh chụp thật từ máy quay + hàng ảnh đại diện TikTok của hành khách chuyến này
function makeSouvenir3D(e, people, shot) {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
  const prev = g; g = c.getContext('2d');
  try {
    g.fillStyle = '#fffaf0'; g.fillRect(0, 0, 1080, 1350);
    // băng-rôn tiêu đề
    g.fillStyle = '#7a1d12'; rr(40, 30, 1000, 112, 20); g.fill(); g.strokeStyle = '#ffd36b'; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#ffd36b'; g.font = '900 44px "Be Vietnam Pro",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('ẢNH LƯU NIỆM · TÀU ' + (e.codes || ''), 540, 70);
    const d = new Date(), date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    g.fillStyle = '#fff4dc'; g.font = '700 26px "Be Vietnam Pro",sans-serif'; g.fillText(`Đà Lạt – Trại Mát · ${date} · ${e.total} hành khách`, 540, 115);
    // ảnh chụp từ máy quay (khung 800 x 590 → 1000 x 737)
    const pw = 1000, ph = Math.round(pw * shot.height / shot.width), px = 40, py = 165;
    g.fillStyle = '#222'; g.fillRect(px - 6, py - 6, pw + 12, ph + 12);
    g.drawImage(shot, px, py, pw, ph);
    const vg = g.createRadialGradient(540, py + ph / 2, ph * 0.35, 540, py + ph / 2, ph * 0.85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(60,30,10,.28)'); g.fillStyle = vg; g.fillRect(px, py, pw, ph); // tông ảnh cũ
    // hàng ảnh đại diện TikTok của hành khách
    const list = people.slice(0, 16), y0 = py + ph + 40;
    g.fillStyle = '#3a2a1e'; g.font = '800 28px "Be Vietnam Pro",sans-serif'; g.fillText('Hành khách trên chuyến tàu', 540, y0);
    const per = 8, size = 46, gap = 120;
    list.forEach((p, i) => {
      const row = Math.floor(i / per), inRow = Math.min(per, list.length - row * per), col = i % per;
      const x = 540 + (col - (inRow - 1) / 2) * gap, y = y0 + 70 + row * 140;
      drawAvatar0(x, y, size, p, 4);
      if (i === 0 && e.top && e.top.length) crown(x, y - size - 8, 1.1);
      g.fillStyle = '#3a2a1e'; g.font = '700 20px "Be Vietnam Pro",sans-serif'; g.textAlign = 'center';
      let nm = p.name; while (g.measureText(nm).width > gap - 8 && nm.length > 2) nm = nm.slice(0, -1);
      g.fillText(nm, x, y + size + 22);
    });
    if (!list.length) { g.fillStyle = '#3a2a1e'; g.font = '700 30px "Be Vietnam Pro",sans-serif'; g.fillText('Chuyến sau mời bạn lên tàu!', 540, y0 + 80); }
  } finally { g = prev; }
  return c;
}
function showSouvenir(c) { // ảnh lưu niệm hiện to giữa màn hình như tấm ảnh vừa rửa ra (không lưu file)
  const el = $('souvenir');
  el.innerHTML = ''; el.appendChild(c);
  el.insertAdjacentHTML('beforeend', '<i>📸 Ảnh lưu niệm chuyến tàu</i>');
  el.classList.add('on');
  setTimeout(() => el.classList.remove('on'), PHOTO_T.done - PHOTO_T.show);
}
function berries(n) { for (let i = 0; i < n; i++) addP({ k: 'berry', x: 140 + Math.random() * 800, y: 560 + Math.random() * 60, vx: -60 + Math.random() * 120, vy: -200 - Math.random() * 120, r: 13, life: 2.2 }); }
function showFinish(e) {
  const el = $('finish');
  const pd = (p, i) => p ? `<div class="pd" style="${i === 0 ? 'transform:translateY(-20px);border-color:#ffd36b' : ''}">${avatarHtml(p.name, p.avatar)}<b>${['🥇', '🥈', '🥉'][i]} ${esc(p.name)}</b><span>${p.coins} xu</span></div>` : '';
  const photo = (e.photo || []).map(p => avatarHtml(p.name, p.avatar)).join('');
  const extra = [e.lucky && `🎫 Vé may mắn: <b>${esc(e.lucky.name)}</b>`, (e.regulars || [])[0] && `⭐ Khách quen: <b>${esc(e.regulars[0].name)}</b> ×${e.regulars[0].rides}`, `❤️ ${e.likes || 0} tim`].filter(Boolean);
  el.innerHTML = `<h1>🎉 VỀ GA ĐÀ LẠT AN TOÀN!</h1><div class="stat">Tàu ${esc(e.codes || '')} · 🎫 ${e.total} hành khách · ✨ ${e.vip} khách VIP & La Reine</div>` +
    (e.top.length ? `<div style="font-size:30px;font-weight:800;margin-bottom:26px;color:#ffe2b0">Hành khách hào phóng nhất</div><div class="podium">${[1, 0, 2].map(i => pd(e.top[i], i)).join('')}</div>` : '<div class="stat">Tặng quà từ 10 xu để được ngồi toa VIP, từ 100 xu lên toa La Reine nhé!</div>') +
    `<div class="extra">${extra.map(x => `<div>${x}</div>`).join('')}</div>` +
    `<div class="next" id="finNext"></div>`;
  void photo;
  el.classList.add('on');
  for (let i = 0; i < 10; i++) setTimeout(() => firework(150 + Math.random() * 780, 450 + Math.random() * 450), i * 450);
  petals(120); sfx.big();
}

const TIMETABLE = [['07:50', '08:20'], ['08:50', '09:20'], ['09:55', '10:25'], ['10:55', '11:25'], ['12:00', '12:30'], ['13:00', '13:30'], ['14:05', '14:35'],
  ['15:05', '15:35'], ['16:10', '16:40'], ['17:10', '17:40'], ['18:15', '18:45'], ['19:15', '19:45'], ['20:20', '20:50'], ['21:20', '21:50']];
const hhmm = m => { m = Math.floor(((m % 1440) + 1440) % 1440); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
// ---------------------------------------------------------------- bầu trời theo giờ tàu (DL1 07:50 sáng sớm … DL13 20:20 tối)
function skyAt() {
  const tq = Q.get('time');
  let h = (S.skyClock != null ? S.skyClock : 600) / 60;
  if (tq) h = tq === 'night' ? 22 : tq === 'dusk' ? 18 : 10;
  h = ((h % 24) + 24) % 24;
  const K = [[0, '#0a1030', '#1c2a55', 1], [5, '#2b2f5e', '#e59a7a', 0.7], [6.5, '#7fb8e6', '#ffd9b0', 0.15], [9, '#6fb6ee', '#d6eefc', 0], [16, '#76b4e8', '#f4e2c4', 0], [18, '#4b4c8c', '#f39a5e', 0.4], [19.3, '#1a1f4a', '#4a3a6a', 0.9], [24, '#0a1030', '#1c2a55', 1]];
  let i = 0; while (h >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], t = (h - a[0]) / (b[0] - a[0]);
  const mix = (c1, c2) => { const p = s => [1, 3, 5].map(k => parseInt(s.slice(k, k + 2), 16)); const x = p(c1), y = p(c2); return `rgb(${x.map((v, k) => Math.round(lerp(v, y[k], t))).join(',')})`; };
  return { top: mix(a[1], b[1]), bot: mix(a[2], b[2]), night: lerp(a[3], b[3], t), h };
}

// ---------------------------------------------------------------- vùng cảnh theo km thật
// thế giới: x = km thật × PX — ga Đà Lạt ở bên trái (x = 0), ga Trại Mát bên phải (x = 7 km)
// lượt đi tàu chạy sang phải, lượt về tàu quay đầu chạy sang trái
function zoneAt(wx) {
  const k = wx / PX;
  if (k < 0.3 || k > 6.75) return 'town';
  if (k < 2.0) return 'pine';
  if (k < 3.2) return 'farm';
  if (k < 4.2) return 'hill';
  if (k < 5.5) return 'flower';
  return 'glass';
}

// ---------------------------------------------------------------- vẽ cảnh
function drawSky(sky, t) {
  const gr = g.createLinearGradient(0, 0, 0, RAIL); gr.addColorStop(0, sky.top); gr.addColorStop(1, sky.bot);
  g.fillStyle = gr; g.fillRect(0, 0, W, RAIL + 40);
  if (sky.night > 0.3) { g.fillStyle = `rgba(255,255,255,${(sky.night - 0.3) * 1.2})`; for (let i = 0; i < 90; i++) { const tw = 0.6 + 0.4 * Math.sin(t * 2 + i); g.globalAlpha = (sky.night - 0.3) * tw; g.fillRect(hash(i, 1) * W, hash(i, 2) * 760, 2.4, 2.4); } g.globalAlpha = 1; }
  // mặt trời / mặt trăng
  const day = sky.h >= 6 && sky.h <= 18.5, p = day ? (sky.h - 6) / 12.5 : ((sky.h + 24 - 18.5) % 24) / 11.5;
  const sx = 120 + p * 840, sy = 760 - Math.sin(p * Math.PI) * 360;
  if (day) { const rg = g.createRadialGradient(sx, sy, 10, sx, sy, 160); rg.addColorStop(0, 'rgba(255,240,190,.95)'); rg.addColorStop(0.25, 'rgba(255,220,150,.45)'); rg.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = rg; g.fillRect(sx - 160, sy - 160, 320, 320); g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(sx, sy, 42, 0, 7); g.fill(); }
  else { g.fillStyle = '#f4f1dc'; g.beginPath(); g.arc(sx, sy, 34, 0, 7); g.fill(); g.fillStyle = sky.top; g.beginPath(); g.arc(sx + 14, sy - 8, 30, 0, 7); g.fill(); }
  // mây
  for (let i = 0; i < 6; i++) {
    const x = ((hash(i, 5) * 1600 - t * (8 + i * 3)) % 1500 + 1500) % 1500 - 250, y = 470 + hash(i, 6) * 240;
    g.fillStyle = sky.night > 0.5 ? 'rgba(160,170,210,.18)' : 'rgba(255,255,255,.75)';
    for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + k * 38, y - Math.sin(k * 1.3) * 16, 52, 28, 0, 0, 7); g.fill(); }
  }
}
function ridge(cam, f, base, amp, seed, color, step = 18) {
  g.fillStyle = color; g.beginPath(); g.moveTo(0, RAIL + 40);
  for (let x = 0; x <= W + step; x += step) {
    const u = (x + cam * f) / 300;
    const y = base - amp * (0.55 * Math.sin(u * 0.9 + seed) + 0.3 * Math.sin(u * 2.3 + seed * 2) + 0.15 * Math.sin(u * 5.1 + seed * 3));
    g.lineTo(x, y);
  }
  g.lineTo(W, RAIL + 40); g.closePath(); g.fill();
}
function shade(night, day, nightC) { // trộn màu ngày/đêm
  const p = s => [1, 3, 5].map(k => parseInt(s.slice(k, k + 2), 16)); const a = p(day), b = p(nightC);
  return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], night))).join(',')})`;
}
function drawMountains(cam, sky) {
  // Langbiang xa xa: hai đỉnh
  const lx = 640 - ((cam * 0.02) % 3000);
  g.fillStyle = shade(sky.night, '#8fa9c9', '#1e2648');
  for (const off of [0, 3000]) { g.beginPath(); g.moveTo(lx + off - 520, 840); g.quadraticCurveTo(lx + off - 200, 620, lx + off - 90, 600); g.quadraticCurveTo(lx + off, 640, lx + off + 60, 625); g.quadraticCurveTo(lx + off + 220, 640, lx + off + 520, 840); g.fill(); }
  ridge(cam, 0.06, 820, 70, 1, shade(sky.night, '#9cb7cf', '#232c52'));
  ridge(cam, 0.14, 890, 80, 4, shade(sky.night, '#6f9a86', '#1b2a3c'));
  // rặng thông giữa
  const f = 0.3, col = shade(sky.night, '#3f6e4c', '#132219');
  ridge(cam, f, 960, 55, 7, col);
  g.fillStyle = shade(sky.night, '#34603f', '#101c15');
  const off = cam * f, i0 = Math.floor(off / 46) - 1;
  for (let i = i0; i < i0 + W / 46 + 3; i++) {
    if (hash(i, 9) < 0.35) continue;
    const x = i * 46 - off, u = (x + off) / 300;
    const y = 960 - 55 * (0.55 * Math.sin(u * 0.9 + 7) + 0.3 * Math.sin(u * 2.3 + 14) + 0.15 * Math.sin(u * 5.1 + 21)), hh = 50 + hash(i, 10) * 50;
    g.beginPath(); g.moveTo(x, y - hh); g.lineTo(x - 14, y + 4); g.lineTo(x + 14, y + 4); g.fill();
  }
}
// lớp cảnh sau (nhà, nhà kính, ruộng bậc thang) — chọn kiểu một lần rồi giữ để không nhảy hình
const backCache = new Map();
function drawBack(cam, sky) {
  const f = 0.6, off = cam * f, seg = 150, i0 = Math.floor(off / seg) - 2;
  const base = 1030;
  // nền đồng cỏ
  g.fillStyle = shade(sky.night, '#5f9150', '#1a2c1c'); g.fillRect(0, 985, W, RAIL - 985 + 10);
  for (let i = i0; i < i0 + W / seg + 4; i++) {
    const x = i * seg - off;
    let it = backCache.get(i);
    if (!it) { const z = zoneAt(cam + x); it = { z, r: hash(i, 3), r2: hash(i, 4) }; backCache.set(i, it); if (backCache.size > 400) backCache.delete(backCache.keys().next().value); }
    const z = it.z;
    if (z === 'farm' || z === 'hill') { // luống rau bậc thang
      for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? shade(sky.night, '#7fb35a', '#22361f') : shade(sky.night, '#5d9a45', '#1b2e1a'); g.fillRect(x, 990 + k * 12, seg + 1, 7); }
      if (it.r > 0.75) farmer(x + 60, base - 6, sky);
    } else if (z === 'flower') {
      for (let k = 0; k < 6; k++) { g.fillStyle = ['#7d8cff', '#b28dff', '#ff9ad5', '#6fc3ff'][(i + k) % 4]; g.globalAlpha = 1 - sky.night * 0.6; g.beginPath(); g.ellipse(x + k * 26, 1000 + (k % 2) * 10, 16, 8, 0, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    } else if (z === 'glass') { // nhà kính trắng
      if (it.r > 0.2) { const w2 = 130, h2 = 46; g.fillStyle = sky.night > 0.5 ? 'rgba(190,200,230,.35)' : 'rgba(245,250,255,.88)'; g.beginPath(); g.moveTo(x, base); g.lineTo(x, base - h2 * 0.6); g.quadraticCurveTo(x + w2 / 2, base - h2 * 1.4, x + w2, base - h2 * 0.6); g.lineTo(x + w2, base); g.fill(); g.strokeStyle = 'rgba(150,170,190,.6)'; g.lineWidth = 2; for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(x + k * w2 / 6, base); g.lineTo(x + k * w2 / 6, base - h2 * (k === 3 ? 1 : 0.85)); g.stroke(); } if (sky.night > 0.5) { g.fillStyle = 'rgba(255,120,200,.25)'; g.fillRect(x + 4, base - h2 * 0.6, w2 - 8, h2 * 0.6); } }
    } else if (z === 'town') { if (it.r > 0.35) villa(x + 20, base, it.r2, sky); }
    else if (z === 'pine' && it.r > 0.4) pine(x + 70, base, 0.65 + it.r2 * 0.3, sky);
  }
}
function pine(x, y, s, sky) {
  g.fillStyle = shade(sky.night, '#5a3b26', '#1d140e'); g.fillRect(x - 5 * s, y - 210 * s, 10 * s, 210 * s);
  const c1 = shade(sky.night, '#2f5b35', '#0f1d12'), c2 = shade(sky.night, '#3d7344', '#13261a');
  for (let k = 0; k < 5; k++) { const yy = y - 90 * s - k * 34 * s, ww = (70 - k * 10) * s; g.fillStyle = k % 2 ? c2 : c1; g.beginPath(); g.ellipse(x + (k % 2 ? 8 : -8) * s, yy, ww, 20 * s, 0, 0, 7); g.fill(); }
}
function villa(x, y, r, sky) {
  const w = 110, h = 66, roof = ['#c0392b', '#2d6fb5', '#d35400', '#7b3fa0'][Math.floor(r * 4)];
  g.fillStyle = shade(sky.night, '#f4e6c8', '#3a3550'); g.fillRect(x, y - h, w, h);
  g.fillStyle = shade(sky.night, roof, '#201a2c'); g.beginPath(); g.moveTo(x - 10, y - h); g.lineTo(x + w / 2, y - h - 46); g.lineTo(x + w + 10, y - h); g.fill();
  g.fillRect(x + w - 30, y - h - 40, 12, 26);
  g.fillStyle = sky.night > 0.45 ? '#ffd27a' : '#6c8fb0';
  for (const wx of [14, 46, 78]) g.fillRect(x + wx, y - h + 16, 18, 22);
  g.fillStyle = shade(sky.night, '#8a5a3a', '#2a1c14'); g.fillRect(x + 46, y - 26, 18, 26);
}
function farmer(x, y, sky) { // người nông dân đội nón lá
  g.fillStyle = shade(sky.night, '#3b5998', '#151c33'); g.fillRect(x - 6, y - 26, 12, 20);
  g.fillStyle = shade(sky.night, '#e8c39e', '#4a3c30'); g.beginPath(); g.arc(x, y - 31, 6, 0, 7); g.fill();
  g.fillStyle = shade(sky.night, '#f0d48a', '#4d4430'); g.beginPath(); g.moveTo(x - 15, y - 31); g.lineTo(x, y - 46); g.lineTo(x + 15, y - 31); g.fill();
}
function hydrangea(x, y, s, sky, seed) {
  g.fillStyle = shade(sky.night, '#3f7d3c', '#13261a'); g.beginPath(); g.ellipse(x, y, 46 * s, 26 * s, 0, Math.PI, 0); g.fill();
  const cols = ['#6c7cff', '#9b7bff', '#ff8fcf', '#5ab8ff', '#c4a0ff'];
  for (let k = 0; k < 7; k++) { g.fillStyle = cols[Math.floor(hash(seed, k) * 5)]; g.globalAlpha = 1 - sky.night * 0.5; g.beginPath(); g.arc(x - 34 * s + k * 11 * s, y - 16 * s - Math.sin(k * 0.9) * 10 * s, 12 * s, 0, 7); g.fill(); }
  g.globalAlpha = 1;
}
function lamp(x, y, sky) {
  g.fillStyle = '#222'; g.fillRect(x - 3, y - 150, 6, 150); g.fillRect(x - 14, y - 152, 28, 6);
  g.fillStyle = sky.night > 0.4 ? '#ffe6a0' : '#d8d2bf'; g.fillRect(x - 10, y - 176, 20, 24);
  if (sky.night > 0.4) { const rg = g.createRadialGradient(x, y - 164, 4, x, y - 164, 120); rg.addColorStop(0, 'rgba(255,220,140,.45)'); rg.addColorStop(1, 'rgba(255,220,140,0)'); g.fillStyle = rg; g.fillRect(x - 120, y - 284, 240, 240); }
}
// cây/vật ngay sát đường ray (toạ độ thế giới, chọn kiểu theo vị trí nên luôn khớp)
function drawNear(cam, sky) {
  const seg = 260, i0 = Math.floor(cam / seg) - 1;
  for (let i = i0; i < i0 + W / seg + 3; i++) {
    const wx = i * seg, x = wx - cam + hash(i, 7) * 80, z = zoneAt(wx), r = hash(i, 8);
    if (nearStation(wx)) { if (i % 3 === 0) lamp(x, RAIL - 6, sky); continue; }
    if (z === 'pine' || z === 'hill') { if (r > 0.25) pine(x, RAIL - 18, 0.9 + hash(i, 11) * 0.5, sky); }
    else if (z === 'flower') { hydrangea(x, RAIL - 12, 1, sky, i); if (r > 0.6) hydrangea(x + 110, RAIL - 12, 0.8, sky, i + 50); }
    else if (z === 'farm') { if (r > 0.55) pine(x, RAIL - 18, 0.8, sky); else for (let k = 0; k < 5; k++) { g.fillStyle = shade(sky.night, '#8bc46a', '#22361f'); g.beginPath(); g.arc(x + k * 30, RAIL - 18, 11, 0, 7); g.fill(); } }
    else if (z === 'glass') { if (r > 0.5) { g.fillStyle = shade(sky.night, '#4f8a3c', '#16281a'); g.fillRect(x, RAIL - 22, 160, 10); for (let k = 0; k < 8; k++) { g.fillStyle = '#e8343f'; g.beginPath(); g.arc(x + 10 + k * 19, RAIL - 24, 4.5, 0, 7); g.fill(); } } }
    else if (z === 'town' && r > 0.5) lamp(x, RAIL - 6, sky);
  }
  // biển báo dốc
  for (const k of [3.12, 4.28]) { const x = k * PX - cam; if (x > -100 && x < W + 100) sign(x, '⚠ DỐC CAO'); }
  // cột cây số
  for (let k = 1; k < ROUTE; k++) { const x = k * PX - cam + 400; if (x > -60 && x < W + 60) { g.fillStyle = '#f4f1e8'; rr(x - 20, RAIL - 70, 40, 62, 8); g.fill(); g.fillStyle = '#c0392b'; g.fillRect(x - 20, RAIL - 70, 40, 18); g.fillStyle = '#222'; g.font = '900 20px "Be Vietnam Pro",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Km' + k, x, RAIL - 30); } }
}
function sign(x, txt) {
  g.fillStyle = '#555'; g.fillRect(x - 3, RAIL - 120, 6, 110);
  g.fillStyle = '#ffcc00'; rr(x - 70, RAIL - 160, 140, 46, 8); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#222'; g.font = '900 24px "Be Vietnam Pro",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, RAIL - 136);
}
const STATIONS = [{ x: 0, name: 'Đà Lạt', big: true }, { x: ROUTE * PX, name: 'Trại Mát' }];
const nearStation = wx => STATIONS.some(s => wx > s.x - 1300 && wx < s.x + 1300);
function drawStations(cam, sky, t) {
  for (const s of STATIONS) {
    const sx = s.x - cam; // vị trí đầu máy khi tàu đỗ
    if (sx < -1500 || sx > W + 1500) continue;
    // sân ga
    g.fillStyle = shade(sky.night, '#b9b2a4', '#3a3842'); g.fillRect(sx - 1200, RAIL - 22, 2400, 22);
    g.fillStyle = shade(sky.night, '#e8e0cc', '#4a4752'); g.fillRect(sx - 1200, RAIL - 26, 2400, 6);
    if (s.big) stationDalat(sx - 260, RAIL - 26, sky); else stationTraiMat(sx - 430, RAIL - 26, sky);
    ticketOffice(sx + 330, RAIL - 26, sky, s.name, t);
  }
}
function drawCanopies(cam, sky) { // mái che sân ga cột đỏ (vẽ sau toà ga, trước tàu)
  for (const s of STATIONS) {
    const sx = s.x - cam; if (sx < -1500 || sx > W + 1500) continue;
    if (!s.big) continue;
    const x0 = sx - 1560, x1 = sx - 860, top = RAIL - 250;
    g.fillStyle = shade(sky.night, '#c0392b', '#4a1a14');
    for (let x = x0 + 30; x < x1; x += 130) g.fillRect(x, top + 14, 14, RAIL - 26 - top - 14);
    g.fillStyle = shade(sky.night, '#f4f1ea', '#5a5866'); g.beginPath(); g.moveTo(x0, top + 20); g.lineTo(x0 + 40, top); g.lineTo(x1 + 40, top); g.lineTo(x1, top + 20); g.fill();
    g.fillStyle = shade(sky.night, '#d9d4c8', '#44424e'); g.fillRect(x0, top + 20, x1 - x0, 6);
    if (sky.night > 0.4) { g.fillStyle = '#fff4c0'; for (let x = x0 + 80; x < x1; x += 260) { g.beginPath(); g.arc(x, top + 30, 6, 0, 7); g.fill(); } }
  }
}
function stationDalat(cx, y, sky) {
  // ga Đà Lạt (1938): mặt tiền vàng kem, ba mái nhọn với cửa sổ lưới lớn, bảng DALAT ở mái giữa, mái ngói nâu đỏ phía sau
  const wall = shade(sky.night, '#f2cf5e', '#5d523a'), roof = shade(sky.night, '#b0502e', '#2a160e'), frame = shade(sky.night, '#ffffff', '#8a8578');
  const glass = sky.night > 0.45 ? '#ffd98a' : '#7d98ac', lit = sky.night > 0.45;
  // mái ngói lớn hai bên
  g.fillStyle = roof; g.beginPath(); g.moveTo(cx - 560, y - 120); g.lineTo(cx - 470, y - 220); g.lineTo(cx + 470, y - 220); g.lineTo(cx + 560, y - 120); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(cx - 560 + k * 18, y - 120 - k * 20); g.lineTo(cx + 560 - k * 18, y - 120 - k * 20); g.stroke(); }
  // thân nhà thấp hai cánh
  g.fillStyle = wall; g.fillRect(cx - 540, y - 120, 1080, 120);
  g.fillStyle = frame; for (let k = 0; k < 12; k++) { const wx = cx - 520 + k * 88; if (Math.abs(wx + 20 - cx) < 250) continue; g.fillRect(wx, y - 100, 44, 74); g.fillStyle = glass; g.fillRect(wx + 4, y - 96, 36, 66); g.fillStyle = frame; g.fillRect(wx + 20, y - 96, 4, 66); g.fillRect(wx + 4, y - 66, 36, 3); }
  // ba mái nhọn
  for (let k = -1; k <= 1; k++) {
    const gx = cx + k * 150, gw = 150, gh = k === 0 ? 340 : 280, base = y - 20;
    g.fillStyle = roof; g.beginPath(); g.moveTo(gx - gw / 2 - 12, base - 150); g.lineTo(gx, base - gh - 16); g.lineTo(gx + gw / 2 + 12, base - 150); g.fill();
    g.fillStyle = wall; g.beginPath(); g.moveTo(gx - gw / 2, base); g.lineTo(gx - gw / 2, base - 150); g.lineTo(gx, base - gh); g.lineTo(gx + gw / 2, base - 150); g.lineTo(gx + gw / 2, base); g.fill();
    // cửa sổ lưới lớn
    const ww = 92, wh = 150, wx = gx - ww / 2, wy = base - 200;
    g.fillStyle = frame; g.fillRect(wx - 5, wy - 5, ww + 10, wh + 10);
    g.fillStyle = glass; g.fillRect(wx, wy, ww, wh);
    if (lit) { g.save(); g.shadowColor = '#ffcf6a'; g.shadowBlur = 30; g.fillRect(wx, wy, ww, wh); g.restore(); }
    g.fillStyle = frame; for (let c = 1; c < 4; c++) g.fillRect(wx + c * ww / 4 - 1.5, wy, 3, wh); for (let r = 1; r < 6; r++) g.fillRect(wx, wy + r * wh / 6 - 1.5, ww, 3);
    if (k === 0) { g.fillStyle = '#b3261e'; g.fillRect(gx - 50, wy - 46, 100, 32); g.fillStyle = '#fff'; g.font = '900 22px "Be Vietnam Pro",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DALAT', gx, wy - 29);
      // đồng hồ trên đỉnh mái giữa
      const ck = S.clock || 0, d = { getHours: () => Math.floor(ck / 60) % 24, getMinutes: () => Math.floor(ck % 60) }; // đồng hồ ga chạy theo giờ tàu
      const cy2 = wy - 78, hA = ((d.getHours() % 12) + d.getMinutes() / 60) / 12 * 7 - Math.PI / 2 * 1, mA = d.getMinutes() / 60 * Math.PI * 2 - Math.PI / 2;
      g.fillStyle = '#fffbea'; g.beginPath(); g.arc(gx, cy2, 20, 0, 7); g.fill(); g.strokeStyle = '#7a3b22'; g.lineWidth = 3; g.stroke();
      g.strokeStyle = '#222'; g.lineWidth = 3; g.beginPath(); g.moveTo(gx, cy2); g.lineTo(gx + Math.cos(((d.getHours() % 12) + d.getMinutes() / 60) / 12 * Math.PI * 2 - Math.PI / 2) * 10, cy2 + Math.sin(((d.getHours() % 12) + d.getMinutes() / 60) / 12 * Math.PI * 2 - Math.PI / 2) * 10); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.moveTo(gx, cy2); g.lineTo(gx + Math.cos(mA) * 15, cy2 + Math.sin(mA) * 15); g.stroke(); void hA;
    }
    // viền đèn trang trí (giống ảnh chụp ban đêm)
    if (lit) { g.strokeStyle = 'rgba(255,214,120,.95)'; g.lineWidth = 3; g.beginPath(); g.moveTo(gx - gw / 2, base - 150); g.lineTo(gx, base - gh); g.lineTo(gx + gw / 2, base - 150); g.stroke(); }
  }
  g.fillStyle = shade(sky.night, '#e2c472', '#4d4430'); g.fillRect(cx - 230, y - 20, 460, 20);
  g.fillStyle = shade(sky.night, '#b3322a', '#3a1410'); g.fillRect(cx - 540, y - 16, 1080, 16); // chân tường đỏ
  if (lit) { g.strokeStyle = 'rgba(255,214,120,.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 540, y - 120); g.lineTo(cx + 540, y - 120); g.stroke(); }
  lamp(cx - 600, y + 20, sky);
}
function ticketOffice(x, y, sky, name, t) {
  // phòng vé: nhà nhỏ mái ngói, ô cửa bán vé, bảng giờ tàu bên cạnh, khách xếp hàng
  const wall = shade(sky.night, '#f2d98c', '#5d523a'), roof = shade(sky.night, '#8a3a26', '#2a160e');
  g.fillStyle = wall; g.fillRect(x - 110, y - 150, 220, 150);
  g.fillStyle = roof; g.beginPath(); g.moveTo(x - 135, y - 146); g.lineTo(x, y - 215); g.lineTo(x + 135, y - 146); g.fill();
  g.fillStyle = '#1f4fa0'; rr(x - 92, y - 140, 184, 34, 6); g.fill();
  g.fillStyle = '#ffd36b'; g.font = '900 21px "Be Vietnam Pro",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PHÒNG VÉ', x, y - 123);
  g.fillStyle = sky.night > 0.45 ? '#ffe2a0' : '#9fc1d6'; rr(x - 60, y - 96, 120, 60, 6); g.fill();
  g.fillStyle = '#5a3b26'; g.fillRect(x - 70, y - 38, 140, 8);
  // nhân viên bán vé
  g.fillStyle = '#2d4f8a'; g.fillRect(x - 14, y - 62, 28, 26); g.fillStyle = '#e8c39e'; g.beginPath(); g.arc(x, y - 72, 11, 0, 7); g.fill();
  g.fillStyle = '#1d2f55'; g.fillRect(x - 13, y - 86, 26, 7);
  g.fillStyle = '#fff'; g.font = '800 13px "Be Vietnam Pro",sans-serif'; g.fillText('Ga ' + name, x, y - 12);
  // bảng giờ tàu (theo bảng thật ở ga)
  const bx = x - 290, by = y - 330; // treo cao bên trái phòng vé, trên đầu hàng người
  g.fillStyle = '#555'; g.fillRect(bx + 20, by + 150, 6, 180); g.fillRect(bx + 130, by + 150, 6, 180);
  g.fillStyle = '#163d8f'; rr(bx, by, 156, 154, 8); g.fill(); g.strokeStyle = '#ffd36b'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#ffd36b'; g.font = '900 15px "Be Vietnam Pro",sans-serif'; g.fillText('GIỜ TÀU', bx + 78, by + 16);
  // 6 dòng quanh chuyến hiện tại, dòng của chuyến đang chạy được tô sáng
  const cur = S.tt || 0, start = clamp(Math.floor(cur / 2) * 2 - 2, 0, TIMETABLE.length - 6);
  g.font = '800 13px "Be Vietnam Pro",sans-serif';
  for (let i = 0; i < 6; i++) {
    const k = start + i, r = TIMETABLE[k], ry = by + 38 + i * 19, on = k === cur || (S.ph === 'stop' && k === cur + 1);
    if (on) { g.fillStyle = 'rgba(255,211,107,.35)'; g.fillRect(bx + 4, ry - 9, 148, 18); }
    g.fillStyle = '#ffd36b'; g.fillText('DL' + (k + 1), bx + 24, ry); g.fillStyle = '#fff'; g.fillText(r[0], bx + 78, ry); g.fillText(r[1], bx + 128, ry);
  }
  // khách xếp hàng mua vé (5 người lên tàu mới nhất)
  if (S.ph !== 'run') {
    const q = (R.recent || []).slice(0, 4);
    q.forEach((p, i) => {
      const px = x - 150 - i * 62, py = y - 4, b = Math.sin(t * 3 + i) * 2;
      g.fillStyle = colorOf(p.name); rr(px - 16, py - 58 + b, 32, 46, 10); g.fill();
      g.fillStyle = '#333'; g.fillRect(px - 12, py - 14, 8, 14); g.fillRect(px + 4, py - 14, 8, 14);
      drawAvatar(px, py - 76 + b, 19, p, 2);
    });
  }
}
function stationTraiMat(cx, y, sky) {
  // tháp chùa Linh Phước phía sau
  const tx = cx + 300; // tháp nhô lên phía sau đầu máy
  for (let k = 0; k < 7; k++) {
    const w = 120 - k * 12, yy = y - 40 - k * 46;
    g.fillStyle = shade(sky.night, '#e8d9b5', '#4a4436'); g.fillRect(tx - w / 2 + 8, yy - 36, w - 16, 36);
    g.fillStyle = shade(sky.night, '#3c8d5a', '#14301f'); g.beginPath(); g.moveTo(tx - w / 2 - 10, yy - 30); g.quadraticCurveTo(tx, yy - 50, tx + w / 2 + 10, yy - 30); g.lineTo(tx + w / 2 - 6, yy - 40); g.lineTo(tx - w / 2 + 6, yy - 40); g.fill();
    g.fillStyle = shade(sky.night, '#d9a520', '#5a4410'); g.fillRect(tx - 6, yy - 30, 12, 18);
  }
  g.fillStyle = shade(sky.night, '#d9a520', '#5a4410'); g.fillRect(tx - 4, y - 40 - 7 * 46 - 30, 8, 30);
  g.fillStyle = 'rgba(0,0,0,.45)'; rr(tx - 95, y - 410, 190, 30, 8); g.fill();
  g.fillStyle = '#fff'; g.font = '800 18px "Be Vietnam Pro",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Chùa Linh Phước', tx, y - 395);
  // dãy nhà mái nhọn ngói đỏ cạnh ga
  const wall = shade(sky.night, '#f4e6c4', '#5a5240'), roof = shade(sky.night, '#c0583a', '#3a1a12'), roofD = shade(sky.night, '#7a3b22', '#2a160e');
  for (let k = 0; k < 2; k++) { const hx = cx - 560 + k * 120; g.fillStyle = wall; g.fillRect(hx - 55, y - 110, 110, 110); g.fillStyle = roof; g.beginPath(); g.moveTo(hx - 66, y - 106); g.lineTo(hx, y - 190); g.lineTo(hx + 66, y - 106); g.fill(); g.fillStyle = sky.night > 0.45 ? '#ffd27a' : '#6d6a60'; g.fillRect(hx - 22, y - 80, 44, 50); }
  // nhà ga Trại Mát: tường kem, mái nhọn dốc màu nâu, ban công đua ra, hiên cột tròn
  g.fillStyle = wall; g.fillRect(cx - 150, y - 150, 300, 150);
  g.fillStyle = shade(sky.night, '#e9d9b2', '#4d4636'); g.fillRect(cx - 185, y - 160, 370, 18); // ban công
  g.fillStyle = roofD; g.beginPath(); g.moveTo(cx - 175, y - 158); g.lineTo(cx, y - 330); g.lineTo(cx + 175, y - 158); g.fill();
  g.fillStyle = wall; g.beginPath(); g.moveTo(cx - 140, y - 160); g.lineTo(cx, y - 300); g.lineTo(cx + 140, y - 160); g.fill();
  g.fillStyle = '#efe4c8'; for (const px of [-160, 140]) g.fillRect(cx + px, y - 142, 20, 142); // cột hiên
  g.fillStyle = sky.night > 0.45 ? '#ffd27a' : '#4a5560'; g.fillRect(cx - 110, y - 110, 90, 70); g.fillRect(cx + 30, y - 110, 70, 110);
  g.fillStyle = shade(sky.night, '#d9c9a0', '#4a4436'); rr(cx - 92, y - 236, 184, 44, 4); g.fill();
  g.fillStyle = '#7a3b22'; g.font = '900 22px "Be Vietnam Pro",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('GA TRẠI MÁT', cx, y - 220);
  g.font = '700 12px "Be Vietnam Pro",sans-serif'; g.fillText('Đà Lạt – Trại Mát · 7 km', cx, y - 202);
  // cờ màu
  const fc = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#e84393', '#e67e22', '#9b59b6'];
  for (let k = 0; k < 7; k++) { const fx2 = cx - 165 + k * 55, fy = y - 160; g.fillStyle = '#ddd'; g.fillRect(fx2, fy - 70, 2, 70); g.fillStyle = fc[k]; g.beginPath(); g.moveTo(fx2 + 2, fy - 70); g.quadraticCurveTo(fx2 + 18, fy - 62 + Math.sin(performance.now() / 300 + k) * 4, fx2 + 30, fy - 56); g.lineTo(fx2 + 2, fy - 44); g.fill(); }
  lamp(cx + 240, y + 20, sky);
}
function drawTrack(cam, sky) {
  g.fillStyle = shade(sky.night, '#7d7064', '#2b2724'); g.fillRect(0, RAIL + 6, W, 26);
  g.fillStyle = shade(sky.night, '#5a3a24', '#1f150e');
  const off = ((cam % 34) + 34) % 34; for (let x = -off; x < W; x += 34) g.fillRect(x, RAIL + 4, 18, 12);
  g.fillStyle = shade(sky.night, '#c9ccd2', '#555a66'); g.fillRect(0, RAIL - 1, W, 5);
  g.fillStyle = shade(sky.night, '#6b6e75', '#2a2c33'); g.fillRect(0, RAIL + 4, W, 3);
  // đất + cỏ phía trước
  const gr = g.createLinearGradient(0, RAIL + 30, 0, H); gr.addColorStop(0, shade(sky.night, '#5d8f3e', '#17291a')); gr.addColorStop(0.35, shade(sky.night, '#3d6b2c', '#0f1d12')); gr.addColorStop(1, '#0b140c');
  g.fillStyle = gr; g.fillRect(0, RAIL + 32, W, H - RAIL);
}
function drawFore(cam, sky) {
  drawFore1(cam, sky);
  // các luống hoa / rau ở xa phía dưới (lớp nhanh nhất) để nền dưới không trống
  for (const [f, y0, s] of [[1.7, RAIL + 230, 1.1], [2.1, RAIL + 400, 1.5]]) {
    const off = cam * f, seg = 150 * s, i0 = Math.floor(off / seg) - 1;
    for (let i = i0; i < i0 + W / seg + 3; i++) {
      const x = i * seg - off, z = zoneAt(cam + x), r = hash(i, 30 + f);
      if (z === 'flower' || z === 'town' || r > 0.7) hydrangea(x + 40, y0, s, sky, i * 7 + 3);
      else if (z === 'farm' || z === 'glass') { for (let k = 0; k < 4; k++) { g.fillStyle = shade(sky.night, k % 2 ? '#8bc46a' : '#6fae52', '#1b2e1a'); g.beginPath(); g.arc(x + k * 34 * s, y0 - 10, 13 * s, 0, 7); g.fill(); } }
      else if (r > 0.35) { g.fillStyle = shade(sky.night, '#4a8033', '#122214'); for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(x + k * 10 * s, y0); g.lineTo(x + k * 10 * s + 4 * s, y0 - (30 + 20 * hash(i, k)) * s); g.lineTo(x + k * 10 * s + 8 * s, y0); g.fill(); } }
    }
  }
}
function drawFore1(cam, sky) { // bụi hoa + cỏ phía trước tàu (lớp nhanh hơn)
  const f = 1.35, off = cam * f, seg = 200, i0 = Math.floor(off / seg) - 1;
  for (let i = i0; i < i0 + W / seg + 3; i++) {
    const x = i * seg - off + hash(i, 12) * 60, z = zoneAt(cam + x), r = hash(i, 13);
    if (z === 'flower' || (z === 'town' && r > 0.5)) hydrangea(x, RAIL + 120, 1.3, sky, i + 99);
    else if (r > 0.4) { g.fillStyle = shade(sky.night, '#4f8a34', '#132415'); for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(x + k * 9, RAIL + 128); g.lineTo(x + k * 9 + 4 - 8 * hash(i, k), RAIL + 82 - 30 * hash(i, k + 20)); g.lineTo(x + k * 9 + 6, RAIL + 128); g.fill(); } }
    if (r > 0.82) { g.fillStyle = ['#ffeaa7', '#fd79a8', '#fab1a0'][i % 3]; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + 20 + k * 14, RAIL + 100 + (k % 2) * 8, 5, 0, 7); g.fill(); } }
  }
}

// ---------------------------------------------------------------- đoàn tàu
const LOCO = 300, CAR = 236, GAP = 16;
// thành phần đoàn tàu cố định: đầu máy hơi nước + La Reine 51612, 51618 + VIP 1 (51620), VIP 2 (51622) + ngồi mềm + ngồi cứng
const CAR_NO = { lareine1: '51612', lareine2: '51618', vip1: '51620', vip2: '51622', mem: '5', cung: '6' }; // số hiệu toa xe
function trainCars() { // bản 2D: mỗi toa vẽ 4 ô cửa sổ, hiện 4 khách đầu tiên theo số ghế
  const c = R.cars || {}, pick = k => (c[k] || []).slice().sort((a, b) => a.i - b.i).slice(0, 4);
  return [
    { cls: 'lareine', no: 1, key: 'lareine1', list: pick('lareine1') }, { cls: 'lareine', no: 2, key: 'lareine2', list: pick('lareine2') },
    { cls: 'vip', no: 1, key: 'vip1', list: pick('vip1') }, { cls: 'vip', no: 2, key: 'vip2', list: pick('vip2') },
    { cls: 'mem', no: 1, key: 'mem', list: pick('mem') }, { cls: 'cung', no: 1, key: 'cung', list: pick('cung') },
  ];
}
function wheel(x, y, r, rot, col) {
  g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.fillStyle = col; g.beginPath(); g.arc(x, y, r - 4, 0, 7); g.fill();
  g.strokeStyle = '#1b1b1b'; g.lineWidth = Math.max(2, r / 9);
  for (let k = 0; k < 6; k++) { const a = rot + k * Math.PI / 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4)); g.stroke(); }
  g.fillStyle = '#d9d9d9'; g.beginPath(); g.arc(x, y, r * 0.22, 0, 7); g.fill();
}
function drawLoco(x, y, rot, sky, t) { // x = mép sau đầu máy, y = mặt ray
  // khung + bánh
  const bob = Math.sin(t * 18) * Math.min(1.5, S.sp / 20);
  y += bob;
  g.fillStyle = '#1f1f1f'; g.fillRect(x + 6, y - 64, LOCO - 6, 18);
  // nồi hơi
  const bx = x + 96, bw = 168, by = y - 150;
  // đầu máy hơi nước sơn đen, bánh đỏ, đai đồng (kiểu đầu máy trưng bày ở ga Đà Lạt)
  const bg = g.createLinearGradient(0, by, 0, by + 86); bg.addColorStop(0, '#4a4a4f'); bg.addColorStop(0.3, '#1e1e22'); bg.addColorStop(1, '#0c0c0e');
  g.fillStyle = bg; rr(bx, by, bw, 86, 30); g.fill();
  g.fillStyle = 'rgba(255,255,255,.18)'; rr(bx + 8, by + 10, bw - 16, 8, 4); g.fill();
  g.fillStyle = '#c9952e'; for (const k of [30, 82, 134]) g.fillRect(bx + k, by + 2, 6, 82);
  // ống dẫn hơi + van
  g.strokeStyle = '#b08a3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(bx + 4, by + 70); g.lineTo(bx + bw - 10, by + 70); g.stroke();
  // hộp khói phía trước
  g.fillStyle = '#1a1a1a'; rr(bx + bw - 12, by - 4, 40, 94, 14); g.fill();
  // ống khói, vòm
  g.fillStyle = '#1a1a1a'; g.fillRect(bx + bw - 6, by - 64, 30, 64); g.fillRect(bx + bw - 14, by - 74, 46, 14);
  g.fillStyle = '#c9952e'; rr(bx + 70, by - 26, 40, 30, 14); g.fill();
  g.fillStyle = '#1e1e22'; rr(bx + 18, by - 18, 28, 22, 10); g.fill();
  g.fillStyle = '#c9952e'; g.fillRect(bx + 28, by - 30, 8, 14); // còi hơi
  // đèn pha
  const fog = S.ev && S.ev.type === 'fog' && !S.ev.done;
  const lit = sky.night > 0.35 || fog || (eventFx.end && eventFx.end.type === 'fog' && eventFx.end.win && performance.now() < eventFx.end.until);
  g.fillStyle = lit ? '#fff6c8' : '#cfc7a8'; g.beginPath(); g.arc(x + LOCO + 8, by + 18, 12, 0, 7); g.fill();
  if (lit) { const lg = g.createLinearGradient(x + LOCO, 0, x + LOCO + 520, 0); lg.addColorStop(0, 'rgba(255,245,200,.55)'); lg.addColorStop(1, 'rgba(255,245,200,0)'); g.fillStyle = lg; g.beginPath(); g.moveTo(x + LOCO + 8, by + 10); g.lineTo(x + LOCO + 560, by - 80); g.lineTo(x + LOCO + 560, by + 140); g.lineTo(x + LOCO + 8, by + 26); g.fill(); }
  // gạt đá
  g.fillStyle = '#8a1d12'; g.beginPath(); g.moveTo(x + LOCO - 4, y - 46); g.lineTo(x + LOCO + 34, y - 4); g.lineTo(x + LOCO - 4, y - 4); g.fill();
  // ca-bin lái
  g.fillStyle = '#18181b'; rr(x, y - 200, 110, 150, 10); g.fill();
  g.fillStyle = '#0a0a0c'; g.fillRect(x - 8, y - 210, 126, 16);
  g.fillStyle = '#b3261e'; g.fillRect(x, y - 66, 110, 6);
  g.fillStyle = '#c9952e'; g.font = '900 15px "Be Vietnam Pro",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; txt(S.code || 'DL', x + 55, y - 92);
  g.fillStyle = sky.night > 0.45 ? '#ffd27a' : '#bfe0f0'; rr(x + 22, y - 180, 66, 62, 8); g.fill();
  const drv = R.driver;
  if (drv) { drawAvatar(x + 55, y - 148, 27, drv, 3); crown(x + 55, y - 186, 1); }
  // biển tên
  g.fillStyle = '#c9952e'; rr(bx + 34, by + 40, 100, 26, 6); g.fill();
  g.fillStyle = '#2a1206'; g.font = '900 17px "Be Vietnam Pro",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; txt('ĐÀ LẠT', bx + 84, by + 54);
  // bánh xe
  wheel(x + LOCO - 18, y - 16, 16, rot * 2, '#b0281a');
  for (const k of [128, 196]) wheel(x + k, y - 34, 34, rot, '#b0281a');
  wheel(x + 44, y - 20, 20, rot * 1.6, '#b0281a');
  // thanh truyền
  const cx1 = x + 128 + Math.cos(rot) * 18, cy1 = y - 34 + Math.sin(rot) * 18;
  g.strokeStyle = '#c9c9c9'; g.lineWidth = 7; g.beginPath(); g.moveTo(cx1, cy1); g.lineTo(cx1 + 68, cy1); g.stroke();
  g.lineWidth = 5; g.beginPath(); g.moveTo(cx1 + 68, cy1); g.lineTo(x + 260, y - 60); g.stroke();
  // tên lái tàu
  if (drv) label(x + 55, y - 236, '👑 Lái tàu: ' + drv.name, '#ffd36b', '#5e1a10');
  return { chimX: bx + bw + 9, chimY: by - 74 };
}
function crown(x, y, s) {
  g.fillStyle = '#ffd36b'; g.strokeStyle = '#8a5a00'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x - 18 * s, y + 8 * s); g.lineTo(x - 20 * s, y - 10 * s); g.lineTo(x - 9 * s, y); g.lineTo(x, y - 14 * s); g.lineTo(x + 9 * s, y); g.lineTo(x + 20 * s, y - 10 * s); g.lineTo(x + 18 * s, y + 8 * s); g.closePath(); g.fill(); g.stroke();
}
function label(x, y, txt, bg, fg) { unflip(x, () => label0(x, y, txt, bg, fg)); }
function label0(x, y, txt, bg, fg) {
  g.font = '800 24px "Be Vietnam Pro",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = Math.min(420, g.measureText(txt).width + 28);
  g.fillStyle = fg; rr(x - w / 2, y - 18, w, 36, 18); g.fill(); g.strokeStyle = bg; g.lineWidth = 2.5; g.stroke();
  g.fillStyle = bg; g.save(); g.beginPath(); g.rect(x - w / 2 + 6, y - 18, w - 12, 36); g.clip(); g.fillText(txt, x, y + 1); g.restore();
}
// ---- các toa: Lareine 1, Lareine 2, VIP 1, VIP 2, ngồi mềm, ngồi cứng (mỗi toa 4 ô cửa sổ có hành khách) ----
const CAR_STYLE = {
  lareine: { body: '#1f3a6b', body2: '#16294d', trim: '#d4a237', frame: '#d4a237', curtain: '#c4504a', plate: 'LA REINE', tag: '👑 La Reine', round: 14 },
  vip:     { body: '#6b4226', body2: '#4f2f1a', trim: '#d4a237', frame: '#3a2414', curtain: '#efe0bd', plate: 'VIP', tag: '✨ VIP', round: 8 },
  mem:     { body: '#efe6d2', body2: '#d9cdb2', trim: '#8a5a34', frame: '#6b4226', curtain: '#efe0bd', plate: 'NGỒI MỀM', tag: '🛋 Ngồi mềm', round: 6 },
  cung:    { body: '#e3e6e4', body2: '#c9cecb', trim: '#4a3426', frame: '#4a3426', curtain: '#efe0bd', plate: 'NGỒI CỨNG', tag: '🪑 Ngồi cứng', round: 2 },
};
function drawCar(x, y, car, rot, sky, t, now) {
  const st = CAR_STYLE[car.cls], night = !!S.night, led = night || sky.night > 0.5;
  const lux = car.cls === 'lareine' || car.cls === 'vip';
  y += Math.sin(t * 17 + x * 0.01) * Math.min(1.3, S.sp / 22);
  const gl = glow.get(car.key);
  if (gl && now - gl < 4000) { const a = 1 - (now - gl) / 4000; g.save(); g.shadowColor = '#ffd36b'; g.shadowBlur = 60 * a; g.fillStyle = `rgba(255,211,107,${0.35 * a})`; rr(x - 10, y - 200, CAR + 20, 180, 24); g.fill(); g.restore(); }
  // toa ngồi mềm / cứng ban đêm: gỗ tối màu như toa du lịch đêm
  let body = st.body, body2 = st.body2;
  if (night && !lux) { body = '#5b4a3c'; body2 = '#4a3b30'; }
  // mái
  g.fillStyle = car.cls === 'lareine' ? '#0f1d38' : night ? '#cfc8bd' : '#f2f2ee';
  g.beginPath(); g.moveTo(x - 8, y - 172); g.quadraticCurveTo(x + CAR / 2, y - 204, x + CAR + 8, y - 172); g.closePath(); g.fill();
  g.fillStyle = st.trim; g.fillRect(x - 8, y - 174, CAR + 16, 5);
  // thân
  const bg = g.createLinearGradient(0, y - 168, 0, y - 32); bg.addColorStop(0, body); bg.addColorStop(1, body2);
  g.fillStyle = bg; g.fillRect(x, y - 168, CAR, 136);
  g.strokeStyle = car.cls === 'lareine' ? 'rgba(255,255,255,.06)' : 'rgba(60,40,20,.22)'; g.lineWidth = 1.5;
  for (let k = 1; k < 14; k++) { g.beginPath(); g.moveTo(x, y - 168 + k * 10); g.lineTo(x + CAR, y - 168 + k * 10); g.stroke(); }
  if (car.cls === 'cung' && !night) { g.fillStyle = st.frame; for (const k of [0, CAR / 2 - 3, CAR - 6]) g.fillRect(x + k, y - 168, 6, 136); }
  if (lux) { g.fillStyle = st.trim; g.fillRect(x, y - 92, CAR, 3); g.fillRect(x, y - 40, CAR, 3); }
  if (car.cls === 'lareine') { g.strokeStyle = '#d4a237'; g.lineWidth = 2; for (const k of [8, CAR - 8]) { g.beginPath(); g.moveTo(x + k, y - 160); g.lineTo(x + k, y - 44); g.stroke(); } }
  // cửa sổ + hành khách
  const list = car.list || [];
  for (let k = 0; k < 4; k++) {
    const wx = x + 14 + k * 54, wy = y - 156;
    g.fillStyle = st.frame; rr(wx - 3, wy - 3, 52, 62, st.round + 2); g.fill();
    g.fillStyle = night || sky.night > 0.45 ? '#ffcf86' : '#cfe3ec'; rr(wx, wy, 46, 56, st.round); g.fill();
    const p = list[k];
    // lưng ghế trong khoang (da nâu toa VIP / Lareine, gỗ toa ngồi cứng, nỉ toa ngồi mềm)
    g.fillStyle = car.cls === 'cung' ? '#8a5a34' : car.cls === 'mem' ? '#3f6b8a' : '#5a2e1a';
    rr(wx + 4, wy + 30, 38, 26, 6); g.fill();
    if (p) { // hành khách ngồi nhìn ra cửa sổ: vai + áo + đầu là ảnh đại diện
      const bob = Math.sin(t * 3 + k * 1.7 + x * 0.01) * 0.8;
      g.fillStyle = colorOf(p.name); rr(wx + 7, wy + 34 + bob, 32, 24, 11); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(wx + 19, wy + 34 + bob); g.lineTo(wx + 23, wy + 42 + bob); g.lineTo(wx + 27, wy + 34 + bob); g.fill();
      drawAvatar(wx + 23, wy + 22 + bob, 14, p, lux ? 2.5 : 2);
    }
    g.fillStyle = st.curtain;
    g.beginPath(); g.moveTo(wx, wy); g.quadraticCurveTo(wx + 9, wy + 24, wx + 3, wy + 56); g.lineTo(wx, wy + 56); g.fill();
    g.beginPath(); g.moveTo(wx + 46, wy); g.quadraticCurveTo(wx + 37, wy + 24, wx + 43, wy + 56); g.lineTo(wx + 46, wy + 56); g.fill();
    if (car.cls === 'lareine') { g.fillStyle = '#d4a237'; g.fillRect(wx + 2, wy + 1, 42, 3); }
    if (led) { g.save(); g.strokeStyle = '#ffcf6a'; g.lineWidth = 2.5; g.shadowColor = '#ffb84a'; g.shadowBlur = 12; rr(wx - 6, wy - 6, 58, 68, st.round + 4); g.stroke(); g.restore(); }
    // tên khách dưới cửa sổ toa VIP / Lareine
    if (lux && p) {
      let nm = p.name; g.font = '800 12px "Be Vietnam Pro",sans-serif'; while (g.measureText(nm).width > 50 && nm.length > 2) nm = nm.slice(0, -1);
      g.fillStyle = 'rgba(0,0,0,.45)'; rr(wx - 3, wy + 60, 52, 16, 5); g.fill();
      g.fillStyle = '#ffe9b8'; g.textAlign = 'center'; g.textBaseline = 'middle'; txt(nm, wx + 23, wy + 68);
    }
  }
  // biển tên toa
  const py = lux ? y - 70 : y - 76;
  g.fillStyle = car.cls === 'lareine' ? '#0f1d38' : lux ? '#2a170b' : night ? '#2a1d14' : '#efe2c4'; rr(x + 30, py + (lux ? 6 : 0), CAR - 60, 20, 4); g.fill();
  g.fillStyle = lux || night ? '#ffd36b' : '#3a2a1e'; g.font = lux ? '800 13px Georgia,"Times New Roman",serif' : '800 13px "Be Vietnam Pro",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  txt(lux ? (car.cls === 'lareine' ? 'LA REINE ' : 'VIP ' + car.no + ' · ') + CAR_NO[car.key] : st.plate, x + CAR / 2, py + (lux ? 17 : 11)); // tên toa + số hiệu toa xe
  if (!lux) { g.font = '700 10px Georgia,serif'; g.fillStyle = night ? '#e8c37a' : '#5a4636'; txt('DALAT PLATEAU RAILROAD', x + CAR / 2, py + 30); }
  if (car.cls === 'lareine') crown(x + CAR / 2, y - 190, 0.8);
  if (led) { g.save(); g.strokeStyle = '#ffcf6a'; g.lineWidth = 3; g.shadowColor = '#ffb84a'; g.shadowBlur = 14; g.beginPath(); g.moveTo(x, y - 34); g.lineTo(x + CAR, y - 34); g.moveTo(x, y - 168); g.lineTo(x + CAR, y - 168); g.stroke(); g.restore(); }
  // nhãn hạng toa phía trên
  const cnt = (R.count && R.count[car.cls]) || 0;
  if (lux && car.no === 1 || !lux) label(x + CAR / 2, y - 222, `${st.tag} · ${cnt}`, car.cls === 'lareine' ? '#ffd36b' : '#fff4dc', car.cls === 'lareine' ? '#16294d' : car.cls === 'vip' ? '#4f2f1a' : '#5a4636');
  // giá chuyển hướng + bánh
  g.fillStyle = '#1f1f1f'; g.fillRect(x + 10, y - 34, CAR - 20, 10);
  for (const k of [32, 64, CAR - 64, CAR - 32]) wheel(x + k, y - 15, 15, rot * 2.2, '#2b2b2b');
  g.fillStyle = '#222'; g.fillRect(x + CAR, y - 46, GAP, 7);
}
// ---------------------------------------------------------------- vật cản sự kiện
function drawObstacle(frontX, sky, dt) {
  if (S.leg === 1) frontX -= 720; // lượt về: vật cản nằm bên trái đầu máy
  const ev = S.ev, active = ev && !ev.done;
  if (ev && ev.type === 'cow') {
    if (!active) eventFx.cowOut += dt;
    const out = eventFx.cowOut;
    for (let k = 0; k < 3; k++) {
      const x = frontX + 170 + k * 110 + out * 60 * (k % 2 ? 1 : -0.5), y = RAIL + out * 90 * (k % 2 ? 1 : 0.6) - (active ? Math.abs(Math.sin(performance.now() / 400 + k)) * 3 : 0);
      g.globalAlpha = clamp(1 - out / 3, 0, 1); cow(x, y, sky, k); g.globalAlpha = 1;
    }
  } else if (ev && ev.type === 'tree') {
    if (!active) eventFx.treeOut += dt;
    const out = eventFx.treeOut, x = frontX + 150;
    g.save(); g.globalAlpha = clamp(1 - out / 2.5, 0, 1); g.translate(x + 120, RAIL - 14 - out * 120); g.rotate(-0.05 - out * 0.4);
    g.fillStyle = '#5a3b26'; rr(-150, -14, 300, 28, 10); g.fill();
    g.fillStyle = shade(sky.night, '#2f5b35', '#0f1d12'); for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(80 + k * 22, -10 + (k % 2) * 14, 40, 24, 0.4, 0, 7); g.fill(); }
    g.restore();
  }
}
function cow(x, y, sky, k) {
  const body = k === 1 ? '#f2efe6' : '#8b5a2b';
  g.fillStyle = body; rr(x - 45, y - 70, 90, 42, 18); g.fill();
  g.fillStyle = '#3a2a1f'; for (const lx of [-34, -18, 18, 32]) g.fillRect(x + lx, y - 32, 8, 30);
  g.fillStyle = body; rr(x - 72, y - 86, 36, 30, 10); g.fill();
  g.fillStyle = '#f5c6b8'; rr(x - 78, y - 70, 18, 14, 6); g.fill();
  g.fillStyle = '#eee'; g.fillRect(x - 64, y - 96, 4, 12); g.fillRect(x - 48, y - 96, 4, 12);
  g.fillStyle = '#111'; g.beginPath(); g.arc(x - 58, y - 76, 3, 0, 7); g.fill();
  if (k === 1) { g.fillStyle = '#3a2a1f'; g.beginPath(); g.ellipse(x + 10, y - 56, 16, 10, 0, 0, 7); g.fill(); }
}

// ---------------------------------------------------------------- HUD
let hudT = 0;
function hud(now, tripDist) {
  if (now - hudT < 100) return; hudT = now;
  // trực ban thổi còi tiễn tàu ~4 giây trước giờ chạy
  const leftNow = (S.left || 0) - (performance.now() - srvAt);
  if ((S.ph === 'board' || S.ph === 'stop') && leftNow > 0 && leftNow < 4200 && whistleKey !== S.trip + S.ph) { whistleKey = S.trip + S.ph; stationWhistle(); }
  $('titleTxt').textContent = S.title || 'TÀU ĐÀ LẠT – TRẠI MÁT';
  $('trip').textContent = `Tàu ${S.code || 'DL'} · ${S.dep || ''} → ${S.arr || ''}`;
  $('clockTxt').textContent = '🕗 ' + hhmm(S.clock || 0);
  $('goalTxt').textContent = S.goalHit ? '🎆 Đạt!' : `${S.likes || 0}/${S.likeGoal || 0}`;
  $('leg').textContent = S.legName || '';
  $('paxN').textContent = '🎫 ' + (R.total || 0) + ' khách';
  $('spd').textContent = Math.round(S.sp);
  $('pfill').style.width = clamp(S.pr, 0, 100) + '%';
  const b = $('boost'); b.classList.toggle('on', S.boost > 0); $('boostS').textContent = Math.ceil(S.boost / 1000);
  $('kmTxt').textContent = (S.leg === 0 ? dispKm : ROUTE - dispKm).toFixed(1);
  const p = dispKm / ROUTE; $('done').style.width = (p * 100) + '%';
  const ti = $('trainIcon'); ti.style.left = `calc(70px + (100% - 140px) * ${p})`; ti.style.transform = S.leg === 1 ? 'scaleX(-1)' : 'scaleX(1)';
  // thẻ giữa
  const card = $('card'), ev = S.ev, end = eventFx.end && now < eventFx.end.until ? eventFx.end : null;
  let key = '', html = '', cls = '';
  const sec = ms => Math.ceil(ms / 1000);
  if (S.ph === 'finish' && !(photoSeq && now - photoSeq.start < PHOTO_T.done)) { $('finish').classList.add('on'); const n = $('finNext'); if (n) n.textContent = `Chuyến tiếp theo sau ${sec(S.left)} giây`; }
  else $('finish').classList.remove('on');
  if (S.ph === 'board') { key = 'board' + sec(S.left); html = `<h2>🎫 PHÒNG VÉ GA ĐÀ LẠT</h2><p>Tàu ${esc(S.code)} đi Trại Mát · khởi hành <b style="color:#ffd36b">${esc(S.dep || '')}</b> · còn <b style="color:#ffd36b;font-size:40px">${sec(S.left)}</b> giây</p><p style="font-size:26px;color:#ffe2b0">💬 Bình luận để mua vé (toa ngồi cứng / ngồi mềm) · ❤️ Thả tim để xúc than</p>`; }
  else if (S.ph === 'stop' && S.berry && S.berry.left > 0) { // hái dâu ở ga Trại Mát
    const top = S.berry.top || [];
    key = 'berry' + sec(S.berry.left) + top.map(b => b.name + b.n).join();
    html = `<h2>🍓 HÁI DÂU GA TRẠI MÁT</h2><p>Bình luận <b style="color:#ffd36b">"dâu"</b> để hái · còn ${sec(S.berry.left)} giây</p>` +
      (top.length ? `<p style="font-size:28px">${top.map((b, i) => `${['🥇', '🥈', '🥉'][i]} ${esc(b.name)} ${b.n} giỏ`).join(' · ')}</p>` : '<p style="font-size:26px;color:#ffe2b0">Chưa ai hái — nhanh tay nào!</p>') +
      `<div class="time">Tàu ${esc(S.nextCode || '')} về Đà Lạt lúc ${esc(S.nextDep || '')}</div>`;
  }
  else if (S.ph === 'stop') { key = 'stop' + sec(S.left); html = `<h2>🎫 PHÒNG VÉ GA TRẠI MÁT</h2><p>Gần ga: chùa Linh Phước · tranh khảm sành sứ</p><p style="font-size:26px;color:#ffe2b0">💬 Bình luận để mua vé chuyến về · 🎫 sắp bốc thăm vé may mắn!</p><div class="time">Tàu ${esc(S.nextCode || '')} về Đà Lạt lúc ${esc(S.nextDep || '')} · còn ${sec(S.left)} giây</div>`; }
  else if (ev) {
    const icon = { fog: '🌫️', cow: '🐄', tree: '🌲', quiz: '❓' }[ev.type];
    cls = ev.done ? (end && end.win ? 'win' : 'fail') : '';
    if (ev.type === 'quiz') {
      html = `<h2>${icon} ${esc(ev.q)}</h2><div class="opts">${ev.a.map((a, i) => `<div class="${ev.done && ev.ok === i ? 'ok' : ''}"><b>${'ABC'[i]}</b>${esc(a)}</div>`).join('')}</div>`;
      html += ev.done ? `<div class="time">${end && end.win ? '✅ ' + esc(end.hero) + ' trả lời đúng!' : '⏰ Hết giờ!'}</div>` : `<div class="time">Bình luận A, B hoặc C · còn ${sec(ev.left)}s</div>`;
    } else {
      const pct = clamp(ev.prog / ev.goal * 100, 0, 100);
      html = `<h2>${icon} ${esc(ev.title)}</h2><p>${esc(ev.hint)}</p><div class="bar"><div style="width:${pct}%"></div><span>${Math.floor(ev.prog)} / ${ev.goal} ${esc(ev.unit)}</span></div>`;
      html += ev.done ? `<div class="time">${end && end.win ? '✅ Thành công!' + (end.hero ? ' Cảm ơn ' + esc(end.hero) : '') : '😅 Hết giờ — tàu chạy tiếp'}</div>` : `<div class="time">⏱ còn ${sec(ev.left)} giây${ev.block ? ' · tàu đang dừng!' : ''}</div>`;
    }
    key = 'ev' + ev.type + Math.floor(ev.prog) + sec(ev.left) + ev.done;
  } else if (sightToast && now < sightToast.until) {
    const icon = { 'Đồi thông': '🌲', 'Làng rau': '🥬', 'Dốc cao': '⛰️', 'Thung lũng hoa': '💐', 'Nhà kính': '🍓' }[sightToast.name] || '📍';
    key = 'sight' + sightToast.name; html = `<h2>${icon} ${esc(sightToast.name)}</h2>`;
  } else if (S.hill) { key = 'hill' + Math.round(S.pr / 10); html = `<h2>⛰️ Đang leo dốc!</h2><p>Thả tim xúc than để tàu leo nhanh hơn</p>`; }
  if (key !== lastCardKey) { lastCardKey = key; if (html) card.innerHTML = html; card.className = 'hud' + (html ? ' on ' + cls : ''); }
  void tripDist;
}

// ---------------------------------------------------------------- vòng lặp vẽ
let camX = 0, camPan = 0, lastT = performance.now(), wheelRot = 0, smokeAcc = 0, chuffAcc = 0, clackAcc = 0;
// ---------------------------------------------------------------- bản 3D: cảnh do scene3d.js vẽ, canvas 2D trong suốt chỉ còn hiệu ứng đè lên
let wasMoving3d = false;
function frame3d(now, dt, t, dir, moving) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  if (!document.body.classList.contains('v3d')) { document.body.classList.add('v3d'); window.R3D.canvas.style.display = 'block'; }
  const sky = skyAt(), ph = photoSeq ? now - photoSeq.start : 1e9;
  if (horn > 0) horn -= dt;
  try {
    window.R3D.frame({ now, dt, t, km: dispKm, leg: S.leg, ph: S.ph, sp: S.sp, left: Math.max(0, (S.left || 0) - (performance.now() - srvAt)), boost: S.boost, sky, night: S.night, ev: S.ev, horn, R, tt: S.tt,
      focus: focusWagon && now < focusUntil ? { key: focusWagon, until: focusUntil } : null, photo: ph });
  } catch (e) { console.error('[3D] lỗi khung hình:', e); window.R3D.ok = false; window.R3D.canvas.style.display = 'none'; return; }
  // tiếng tàu chạy
  const speedPx = S.sp / 3600 * S.timeX * PX;
  if (moving && S.sp > 0.5) {
    chuffAcc += dt * Math.min(9, 0.6 + S.sp * 0.25); while (chuffAcc > 1) { chuffAcc--; chuff(clamp(0.4 + S.pr / 160, 0.3, 1)); }
    clackAcc += speedPx * dt; while (clackAcc > 900) { clackAcc -= 900; clack(); }
    const left = S.leg === 0 ? ROUTE - dispKm : dispKm;
    if (!brakeDone && left < 0.08) { brakeDone = true; brake(); }
  }
  if (!moving && Math.random() < dt / 7) hiss(1.2, 0.07);
  wasMoving3d = moving;
  if (music) music.volume = clamp((S.vol ? S.vol.music : 35) / 100 * (MC && MC.speaking ? 0.3 : 1), 0, 1);
  // hiệu ứng 2D đè lên: hoa rơi, tim, dâu, pháo hoa
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life -= dt;
    if (p.life <= 0 || p.k === 'smoke' || p.k === 'steam') { particles.splice(i, 1); continue; }
    if (p.k === 'petal') { p.x += (p.vx + Math.sin(t * 2 + p.a) * 30) * dt; p.y += p.vy * dt; p.a += p.va * dt; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.globalAlpha = clamp(p.life, 0, 1); g.beginPath(); g.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, 7); g.fill(); g.restore(); if (p.y > H) p.life = 0; }
    else if (p.k === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.vx *= 0.985; g.globalAlpha = clamp(p.life / 1.2, 0, 1); g.fillStyle = p.c; g.fillRect(p.x - 3, p.y - 3, 6, 6); g.globalAlpha = 1; }
    else if (p.k === 'heart') { p.x += p.vx * dt; p.y += p.vy * dt; g.globalAlpha = clamp(p.life, 0, 1); heart(p.x, p.y, p.r, p.c); g.globalAlpha = 1; }
    else if (p.k === 'berry') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; g.globalAlpha = clamp(p.life, 0, 1); g.fillStyle = '#e8343f'; g.beginPath(); g.moveTo(p.x - p.r, p.y - p.r * 0.3); g.quadraticCurveTo(p.x, p.y + p.r * 1.6, p.x + p.r, p.y - p.r * 0.3); g.quadraticCurveTo(p.x, p.y - p.r, p.x - p.r, p.y - p.r * 0.3); g.fill(); g.fillStyle = '#3d9a3d'; g.beginPath(); g.moveTo(p.x - 8, p.y - p.r * 0.5); g.lineTo(p.x, p.y - p.r * 1.1); g.lineTo(p.x + 8, p.y - p.r * 0.5); g.fill(); g.globalAlpha = 1; }
  }
  if (ph < PHOTO_T.shot + 400) drawViewfinder(ph);
  if (vipShow && vipShow.caption && now < vipShow.until) drawInterior(vipShow, now, t); // ban nhạc tàu đêm
  if (flash > 0) { g.fillStyle = `rgba(255,240,200,${flash * 0.5})`; g.fillRect(0, 0, W, H); flash -= dt * 1.5; }
  hud(now, dispKm);
}
function frame(nowArg) {
  const now = nowArg || performance.now(), dt = clamp((now - lastT) / 1000, 0, 0.1), t = now / 1000; lastT = now;
  // nội suy km giữa các gói tin
  const dir = S.leg === 0 ? 1 : -1, moving = S.ph === 'run';
  const pred = clamp(S.km + (moving ? dir * S.sp / 3600 * S.timeX * (now - srvAt) / 1000 : 0), 0, ROUTE);
  dispKm += (pred - dispKm) * Math.min(1, dt * 6);
  const tripDist = dispKm;
  if (window.R3D && window.R3D.ok && S.view3d !== false && !Q.has('2d')) return frame3d(now, dt, t, dir, moving);
  const front = dispKm * PX; // x thế giới của mũi đầu máy
  // camera: lượt đi đầu máy ở bên phải màn hình, lượt về ở bên trái; đỗ ga thì đặt ga giữa khung hình
  const cars = trainCars();
  const trainLen = LOCO + cars.length * (CAR + GAP);
  const atStation = S.ph !== 'run';
  const lead = atStation ? 600 : dir > 0 ? 760 : 320; // vị trí mũi tàu trên màn hình (đỗ ga: thấy cả toà ga lẫn phòng vé)
  const room = dir > 0 ? lead : W - lead;              // chỗ trống phía sau đầu máy
  let want = 0;
  const overflow = atStation ? 0 : Math.max(0, trainLen - room + 60); // đoàn 6 toa dài hơn màn hình → camera lia dần dọc đoàn tàu
  if (focusWagon && now < focusUntil) { const idx = cars.findIndex(c => c.key === focusWagon); if (idx >= 0) want = Math.min(overflow, Math.max(0, LOCO + (idx + 1) * (CAR + GAP) - room + 200)); }
  else if (overflow > 0) want = overflow * (0.5 - 0.5 * Math.cos(t * 2 * Math.PI / 26));
  camPan += (want - camPan) * Math.min(1, dt * 1.2);
  let camWant = front - lead - dir * camPan;
  // chụp ảnh lưu niệm: camera lia tới giữa toa Lareine 2 và VIP 1 rồi zoom sát vào cửa sổ
  const ph = photoSeq ? now - photoSeq.start : 1e9;
  if (ph < PHOTO_T.shot + 600) camWant = front - dir * (LOCO + GAP + 2 * (CAR + GAP)) - 540;
  if (Math.abs(camWant - camX) > 2500) camX = camWant; else camX += (camWant - camX) * Math.min(1, dt * (ph < PHOTO_T.shot ? 4 : 2.2));
  const sk = shake > 0 ? (shake -= dt) * 14 : 0;
  g.save(); if (sk > 0) g.translate((Math.random() - 0.5) * sk, (Math.random() - 0.5) * sk);
  const zoom = ph < PHOTO_T.shot + 600 ? 1 + 1.3 * easeIO(clamp((ph - 900) / 1800, 0, 1)) : 1;
  g.save(); if (zoom > 1.001) { g.translate(540, RAIL - 120); g.scale(zoom, zoom); g.translate(-540, -(RAIL - 120)); }
  const sky = skyAt();
  drawSky(sky, t);
  drawMountains(camX, sky);
  drawBack(camX, sky);
  drawStations(camX, sky, t);
  drawNear(camX, sky);
  drawCanopies(camX, sky);
  drawTrack(camX, sky);
  // tàu (lượt về: lật ngang quanh mũi đầu máy)
  const speedPx = S.sp / 3600 * S.timeX * PX; // px/giây
  wheelRot += (moving ? speedPx : 0) * dt / 34;
  const fx0 = front - camX, lx = fx0 - LOCO;
  FLIP = dir < 0;
  g.save(); if (FLIP) { g.translate(fx0 * 2, 0); g.scale(-1, 1); }
  const ch = drawLoco(lx, RAIL, wheelRot, sky, t);
  cars.forEach((c, i) => { const x = lx - GAP - (i + 1) * (CAR + GAP) + GAP, sx = FLIP ? 2 * fx0 - x - CAR : x; if (sx > -CAR - 40 && sx < W + 40) drawCar(x, RAIL, c, wheelRot, sky, t, now); });
  g.restore(); FLIP = false;
  if (dir < 0) ch.chimX = 2 * fx0 - ch.chimX;
  drawObstacle(fx0, sky, dt);
  // khói (toạ độ thế giới → trôi về sau khi tàu chạy)
  smokeAcc += dt * (moving ? 3 + S.sp * 0.3 : 1.2) * (S.boost > 0 ? 1.5 : 1);
  while (smokeAcc > 1) { smokeAcc--; addP({ k: 'smoke', wx: ch.chimX + camX, y: ch.chimY, vx: -dir * (10 + Math.random() * 30), vy: -90 - Math.random() * 60, r: 12 + Math.random() * 8, life: 2.6, max: 2.6 }); }
  if (horn > 0) { horn -= dt; if (Math.random() < 0.6) addP({ k: 'steam', wx: ch.chimX + camX - 40 * dir, y: ch.chimY + 50, vx: 0, vy: -120, r: 10, life: 1, max: 1 }); }
  drawFore(camX, sky);
  if (music) music.volume = clamp((S.vol ? S.vol.music : 35) / 100 * (MC && MC.speaking ? 0.3 : 1), 0, 1); // nhỏ nhạc khi MC / phát thanh đọc
  // âm thanh chạy tàu
  if (moving && S.sp > 0.5) {
    chuffAcc += dt * Math.min(9, 0.6 + S.sp * 0.25); while (chuffAcc > 1) { chuffAcc--; chuff(clamp(0.4 + S.pr / 160, 0.3, 1)); }
    clackAcc += speedPx * dt; while (clackAcc > 900) { clackAcc -= 900; clack(); }
    const left = S.leg === 0 ? ROUTE - dispKm : dispKm;
    if (!brakeDone && left < 0.08) { brakeDone = true; brake(); }
  }
  // đỗ ga: thỉnh thoảng nồi hơi xì hơi
  if (!moving && Math.random() < dt / 7) hiss(1.2, 0.07);
  // hạt
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life -= dt; if (p.life <= 0) { particles.splice(i, 1); continue; }
    if (p.k === 'smoke' || p.k === 'steam') {
      p.wx += p.vx * dt; p.y += p.vy * dt; p.r += dt * 18; p.vy *= 0.99;
      const a = p.life / p.max, x = p.wx - camX;
      g.fillStyle = p.k === 'steam' ? `rgba(255,255,255,${0.6 * a})` : sky.night > 0.5 ? `rgba(120,120,135,${0.4 * a})` : `rgba(225,225,232,${0.45 * a})`;
      g.beginPath(); g.arc(x, p.y, p.r, 0, 7); g.fill();
    } else if (p.k === 'petal') {
      p.x += (p.vx + Math.sin(t * 2 + p.a) * 30) * dt; p.y += p.vy * dt; p.a += p.va * dt;
      g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.globalAlpha = clamp(p.life, 0, 1); g.beginPath(); g.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, 7); g.fill(); g.restore();
      if (p.y > H) p.life = 0;
    } else if (p.k === 'spark') {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.vx *= 0.985;
      g.globalAlpha = clamp(p.life / 1.2, 0, 1); g.fillStyle = p.c; g.fillRect(p.x - 3, p.y - 3, 6, 6); g.globalAlpha = 1;
    } else if (p.k === 'berry') { // quả dâu tây bay lên rồi rơi
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt;
      g.globalAlpha = clamp(p.life, 0, 1);
      g.fillStyle = '#e8343f'; g.beginPath(); g.moveTo(p.x - p.r, p.y - p.r * 0.3); g.quadraticCurveTo(p.x, p.y + p.r * 1.6, p.x + p.r, p.y - p.r * 0.3); g.quadraticCurveTo(p.x, p.y - p.r, p.x - p.r, p.y - p.r * 0.3); g.fill();
      g.fillStyle = '#ffe9a0'; for (let k = 0; k < 4; k++) g.fillRect(p.x - 5 + (k % 2) * 8, p.y + (k > 1 ? 4 : -2), 2, 2);
      g.fillStyle = '#3d9a3d'; g.beginPath(); g.moveTo(p.x - 8, p.y - p.r * 0.5); g.lineTo(p.x, p.y - p.r * 1.1); g.lineTo(p.x + 8, p.y - p.r * 0.5); g.fill();
      g.globalAlpha = 1;
    } else if (p.k === 'heart') {
      p.x += p.vx * dt; p.y += p.vy * dt;
      g.globalAlpha = clamp(p.life, 0, 1); heart(p.x, p.y, p.r, p.c); g.globalAlpha = 1;
    }
  }
  // sương mù
  const fog = S.ev && S.ev.type === 'fog' && !S.ev.done ? 0.55 * (1 - S.ev.prog / S.ev.goal) + 0.15 : 0;
  fogLvl += ((fog || (sky.h > 5 && sky.h < 7.5 ? 0.2 : 0.06)) - fogLvl) * Math.min(1, dt * 1.5);
  if (fogLvl > 0.01) {
    const fg = g.createLinearGradient(0, 500, 0, RAIL + 120); fg.addColorStop(0, `rgba(230,236,240,${fogLvl * 0.5})`); fg.addColorStop(0.6, `rgba(230,236,240,${fogLvl})`); fg.addColorStop(1, `rgba(230,236,240,${fogLvl * 0.6})`);
    g.fillStyle = fg; g.fillRect(0, 500, W, RAIL - 380);
  }
  g.restore(); // hết zoom
  if (ph < PHOTO_T.shot + 400) drawViewfinder(ph);
  if (vipShow && now < vipShow.until) drawInterior(vipShow, now, t);
  if (flash > 0) { g.fillStyle = `rgba(255,240,200,${flash * 0.5})`; g.fillRect(0, 0, W, H); flash -= dt * 1.5; }
  g.restore();
  hud(now, tripDist);
  if (S.ph !== prevPhase) { prevPhase = S.ph; }
}
let fogLvl = 0, vipShow = null;
// cảnh trong khoang VIP (vách gỗ, rèm be, sofa da nâu chần nút, bàn gỗ) — hiện khi có quà từ 100 xu
function drawInterior(v, now, t) {
  const a = clamp(Math.min((now - v.start) / 400, (v.until - now) / 400), 0, 1);
  const X = 110, Y = 700, w = 860, h = 360;
  g.save(); g.globalAlpha = a; g.translate(0, (1 - a) * 40);
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 40; g.fillStyle = '#3b2414'; rr(X - 10, Y - 10, w + 20, h + 20, 26); g.fill(); g.shadowBlur = 0;
  g.save(); rr(X, Y, w, h, 20); g.clip();
  // vách gỗ
  const wg = g.createLinearGradient(0, Y, 0, Y + h); wg.addColorStop(0, '#7a4a2a'); wg.addColorStop(1, '#4a2a16'); g.fillStyle = wg; g.fillRect(X, Y, w, h);
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(X, Y + 20 + k * 40); g.lineTo(X + w, Y + 20 + k * 40); g.stroke(); }
  // trần cong màu kem
  g.fillStyle = '#efe3c8'; g.beginPath(); g.moveTo(X, Y); g.lineTo(X + w, Y); g.lineTo(X + w, Y + 26); g.quadraticCurveTo(X + w / 2, Y + 50, X, Y + 26); g.fill();
  // hai ô cửa sổ, cảnh bên ngoài trôi qua
  for (const wx of [X + 150, X + 470]) {
    const ww = 240, wh = 150, wy = Y + 60;
    g.fillStyle = '#2a170b'; g.fillRect(wx - 10, wy - 10, ww + 20, wh + 20);
    g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip();
    const sg = g.createLinearGradient(0, wy, 0, wy + wh); sg.addColorStop(0, S.night ? '#0c1433' : '#9fd0f0'); sg.addColorStop(1, S.night ? '#2a2f5a' : '#e8f4ff'); g.fillStyle = sg; g.fillRect(wx, wy, ww, wh);
    if (S.night) { g.fillStyle = '#fff'; for (let k = 0; k < 10; k++) g.fillRect(wx + hash(k, wx) * ww, wy + hash(k, 3) * 60, 2, 2); }
    const sp = (t * 160) % 120;
    for (let k = -1; k < 4; k++) { const px = wx + ww - (k * 120 - sp) - 60; g.fillStyle = S.night ? '#12261a' : '#2f6b3a'; g.beginPath(); g.moveTo(px, wy + 30); g.lineTo(px - 30, wy + wh); g.lineTo(px + 30, wy + wh); g.fill(); }
    g.fillStyle = '#5d9a45'; g.fillRect(wx, wy + wh - 30, ww, 30);
    for (let k = 0; k < 8; k++) { g.fillStyle = ['#ff8fcf', '#6c7cff', '#ffd36b'][k % 3]; g.beginPath(); g.arc(wx + ((k * 47 + t * 260) % (ww + 40)) * -1 + ww + 20, wy + wh - 18, 6, 0, 7); g.fill(); }
    g.restore();
    g.fillStyle = '#2a170b'; g.fillRect(wx + ww / 2 - 4, wy, 8, wh);
    // rèm
    g.fillStyle = v.cls === 'lareine' || v.caption ? '#c4504a' : '#e8d7b0'; for (const [cx, s] of [[wx - 4, 1], [wx + ww + 4, -1]]) { g.beginPath(); g.moveTo(cx - 14 * s, wy - 14); g.lineTo(cx + 34 * s, wy - 14); g.quadraticCurveTo(cx + 6 * s, wy + 70, cx + 22 * s, wy + wh + 10); g.lineTo(cx - 14 * s, wy + wh + 10); g.fill(); }
    g.fillStyle = '#c9a96a'; g.fillRect(wx - 30, wy - 18, ww + 60, 6);
  }
  if (v.cls === 'lareine' || v.caption) {
    // toa Lareine: trần hoa, rèm đỏ hoa văn, đèn nến trên vách (tàu đêm có thêm nghệ sĩ saxophone)
    g.fillStyle = '#f3dccb'; g.beginPath(); g.moveTo(X, Y); g.lineTo(X + w, Y); g.lineTo(X + w, Y + 26); g.quadraticCurveTo(X + w / 2, Y + 50, X, Y + 26); g.fill();
    for (let k = 0; k < 26; k++) { g.fillStyle = ['#e58a7a', '#c96a5a', '#9fb07a'][k % 3]; g.beginPath(); g.arc(X + 15 + k * 33, Y + 12 + (k % 2) * 10, 5, 0, 7); g.fill(); }
    for (const sx of [X + 110, X + 430, X + 750]) {
      g.fillStyle = '#c9952e'; g.fillRect(sx - 2, Y + 96, 4, 24);
      const fl = 1 + Math.sin(t * 13 + sx) * 0.15; g.fillStyle = '#fff3c0'; g.beginPath(); g.ellipse(sx, Y + 88, 4 * fl, 9 * fl, 0, 0, 7); g.fill();
      const rg = g.createRadialGradient(sx, Y + 88, 2, sx, Y + 88, 70); rg.addColorStop(0, 'rgba(255,200,110,.45)'); rg.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = rg; g.fillRect(sx - 70, Y + 18, 140, 140);
    }
  }
  const drawMusician = () => { // nghệ sĩ saxophone (tàu đêm)
    const mx = X + 700, my = Y + 300, sw = Math.sin(t * 2.4) * 4;
    g.fillStyle = '#8fa6d8'; rr(mx - 30, my - 120 + sw * 0.3, 60, 90, 18); g.fill();
    g.fillStyle = '#e9e2d6'; g.fillRect(mx - 26, my - 32, 22, 70); g.fillRect(mx + 4, my - 32, 22, 70);
    g.fillStyle = '#e8c39e'; g.beginPath(); g.arc(mx + sw * 0.4, my - 140, 22, 0, 7); g.fill();
    g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(mx + sw * 0.4, my - 148, 22, Math.PI, 0); g.fill();
    g.strokeStyle = '#d4a237'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(mx - 10, my - 128); g.quadraticCurveTo(mx - 34, my - 70, mx - 18, my - 48); g.stroke();
    g.fillStyle = '#d4a237'; g.beginPath(); g.ellipse(mx - 12, my - 48, 14, 9, -0.4, 0, 7); g.fill(); g.lineCap = 'butt';
    for (let k = 0; k < 3; k++) { const ph = (t * 0.8 + k / 3) % 1; g.globalAlpha = a * (1 - ph); g.fillStyle = '#ffd36b'; g.font = '900 30px serif'; g.fillText('♪', mx - 60 - ph * 40, my - 80 - ph * 90); }
    g.globalAlpha = a;
  };
  // biển VIP
  g.fillStyle = '#d9c9a0'; rr(X + 400, Y + 64, 60, 30, 4); g.fill(); g.fillStyle = '#3b2414'; g.font = '900 16px "Be Vietnam Pro",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(v.cls === 'lareine' || v.caption ? 'LA REINE' : 'VIP', X + 430, Y + 80);
  // sofa da nâu chần nút
  const sy = Y + 230;
  g.fillStyle = '#5a2e1a'; rr(X + 40, sy - 40, w - 80, 70, 16); g.fill();
  g.fillStyle = '#3d1d10'; for (let r = 0; r < 2; r++) for (let c = 0; c < 22; c++) { g.beginPath(); g.arc(X + 70 + c * 34 + (r % 2) * 17, sy - 22 + r * 24, 3, 0, 7); g.fill(); }
  g.fillStyle = '#6b3820'; rr(X + 30, sy + 26, w - 60, 46, 12); g.fill();
  g.fillStyle = '#8a4a2a'; g.fillRect(X + 30, sy + 70, w - 60, 40);
  // bàn gỗ
  g.fillStyle = '#a0522d'; rr(X + 330, sy + 10, 200, 26, 6); g.fill(); g.fillStyle = '#6b3820'; g.fillRect(X + 420, sy + 36, 20, 90);
  if (S.night || v.caption) drawMusician();
  // người tặng ngồi trên sofa
  const ax = X + 220, ay = sy - 10;
  if (!v.caption) {
    g.fillStyle = colorOf(v.name); rr(ax - 42, ay - 10, 84, 90, 26); g.fill();
    drawAvatar0(ax, ay - 52, 46, v, 4);
    if (v.tier >= 2) crown(ax, ay - 112, 1.3);
  }
  g.restore();
  // chú thích
  g.fillStyle = 'rgba(30,18,10,.85)'; rr(X + w / 2 - 300, Y + h - 58, 600, 48, 24); g.fill();
  g.fillStyle = '#ffd36b'; g.font = '900 26px "Be Vietnam Pro",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let nm = v.name; if (nm.length > 18) nm = nm.slice(0, 18) + '…';
  g.fillText(v.caption || ((v.cls === 'lareine' ? '👑 Toa La Reine · ' : '✨ Toa VIP · ') + nm), X + w / 2, Y + h - 34);
  g.restore();
}
function heart(x, y, r, c) {
  g.fillStyle = c; g.beginPath(); g.moveTo(x, y + r * 0.35);
  g.bezierCurveTo(x - r, y - r * 0.4, x - r * 0.45, y - r, x, y - r * 0.45);
  g.bezierCurveTo(x + r * 0.45, y - r, x + r, y - r * 0.4, x, y + r * 0.35); g.fill();
}
function loop(ts) { try { frame(ts); } catch (e) { console.error(e); } requestAnimationFrame(loop); }
requestAnimationFrame(loop);
window.__frame = frame; // để kiểm thử
