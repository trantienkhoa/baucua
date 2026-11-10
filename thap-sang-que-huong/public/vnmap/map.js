// Thắp Sáng Quê Hương — màn hình LIVE (1080 × 1920). Canvas vẽ nền + bản đồ + hiệu ứng, DOM vẽ bảng.
(function () {
  'use strict';
  const VN = window.VN_PROV, SH = window.VN_SHAPES, THEMES = window.VN_THEMES;
  const W = 1080, H = 1920;
  const $ = id => document.getElementById(id);
  const stage = $('stage'), cv = $('cv'), ctx = cv.getContext('2d');
  const OBS = /[?&]obs=1/.test(location.search);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pname = id => (VN.BY_ID[id] || {}).name || '';
  const pshort = id => (VN.BY_ID[id] || {}).short || '';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const fmt = n => Math.round(n).toLocaleString('vi-VN');

  // ---------- co giãn sân khấu ----------
  function fit() {
    const s = Math.min(innerWidth / W, innerHeight / H);
    stage.style.transform = `translate(${-W * s / 2}px,${-H * s / 2}px) scale(${s})`;
  }
  addEventListener('resize', fit); fit();

  // ---------- hình học bản đồ ----------
  const MAP = { x: 34, y: 345, w: 620, h: 1310 };
  const MS = Math.min(MAP.w / SH.w, MAP.h / SH.h);
  MAP.x += (MAP.w - SH.w * MS) / 2;
  const toS = (x, y) => [MAP.x + x * MS, MAP.y + y * MS];
  const PATHS = {}, CENTER = {};
  for (const id in SH.d) {
    const p = new Path2D();
    for (const r of SH.d[id].p) { p.moveTo(r[0], r[1]); for (let k = 2; k < r.length; k += 2) p.lineTo(r[k], r[k + 1]); p.closePath(); }
    PATHS[id] = p; CENTER[id] = toS(SH.d[id].c[0], SH.d[id].c[1]);
  }
  // chỉnh nhãn vùng đồng bằng sông Hồng cho đỡ chồng chữ
  const LABEL_NUDGE = { 'ha-noi': [-10, -6], 'thai-nguyen': [-6, -12], 'lang-son': [12, 4], 'bac-ninh': [6, -8], 'hung-yen': [10, 4], 'hai-phong': [16, -2], 'ninh-binh': [4, 8], 'tp-hcm': [4, 6], 'dong-nai': [6, -10], 'tay-ninh': [-8, -6], 'vinh-long': [6, 6] };
  const ORDER = Object.keys(PATHS).sort((a, b) => SH.d[a].c[1] - SH.d[b].c[1]);   // bắc → nam
  // quần đảo Hoàng Sa, Trường Sa (khung riêng, toạ độ bản đồ)
  const ISLES = [
    { id: 'hs', of: 'da-nang', box: [385, 370, 88, 82], label: 'QĐ HOÀNG SA', sub: '(TP Đà Nẵng)', dots: [] },
    { id: 'ts', of: 'khanh-hoa', box: [360, 880, 112, 104], label: 'QĐ TRƯỜNG SA', sub: '(tỉnh Khánh Hòa)', dots: [] },
  ];
  { let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 14; i++) ISLES[0].dots.push([0.25 + r() * 0.6, 0.35 + r() * 0.5, 0.8 + r() * 1.4]);
    for (let i = 0; i < 26; i++) ISLES[1].dots.push([0.1 + r() * 0.82, 0.32 + r() * 0.6, 0.6 + r() * 1.2]); }

  // ---------- trạng thái ----------
  let S = null, CFG = {}, T = THEMES['dem-sao'], themeKey = '', clockOff = 0;
  const now = () => Date.now() + clockOff;
  const socket = io();
  socket.on('connect', () => socket.emit('vm:hello', 'map'));
  socket.on('vm:cfg', c => applyCfg(c));
  socket.on('vm:state', st => { clockOff = st.now - Date.now(); S = st; applyCfg(st.cfg); onState(); });
  socket.on('vm:fx', onFx);

  function applyCfg(c) {
    if (!c) return; CFG = c;
    if (c.theme !== themeKey && THEMES[c.theme]) setTheme(c.theme);
    document.body.classList.toggle('lite', !!c.lite);
    $('title').textContent = c.title || 'THẮP SÁNG QUÊ HƯƠNG';
    $('subtitle').innerHTML = esc(c.subtitle || '').replace(/(tên tỉnh, thành quê bạn|tên tỉnh|tên quê)/i, '<b>$1</b>') + ' 🏮';
    if (window.MC) { MC.enabled = !!c.mcOn; MC.volume = +c.mcVol || 1; MC.rate = +c.mcRate || 1; MC.setPref(c.mcVoice || ''); }
    music.setVol(c.musicOn ? +c.musicVol : 0);
    mapSig = '';
  }
  function setTheme(k) {
    themeKey = k; T = THEMES[k];
    const r = document.documentElement.style;
    r.setProperty('--accent', T.accent); r.setProperty('--accent2', T.accent2); r.setProperty('--text', T.text); r.setProperty('--sub', T.sub);
    r.setProperty('--panel', T.panel); r.setProperty('--border', T.border); r.setProperty('--font', T.font);
    const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
    for (const a of [30, 40, 50, 60]) r.setProperty('--accent-a' + a, hexA(T.accent, a / 100));
    r.setProperty('--t2-a45', hexA(T.title[1], 0.45));
    r.setProperty('--t1', T.title[0]); r.setProperty('--t2', T.title[1]); r.setProperty('--t3', T.title[2]);
    $('title').classList.toggle('it', !!T.italic);
    buildBg(); bgItems = []; mapSig = '';
  }

  // ---------- nền ----------
  let bgCanvas = null, bgItems = [];
  function buildBg() {
    bgCanvas = document.createElement('canvas'); bgCanvas.width = W; bgCanvas.height = H;
    const g = bgCanvas.getContext('2d');
    const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, T.bg[0]); lg.addColorStop(0.5, T.bg[1]); lg.addColorStop(1, T.bg[2]);
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    const rg = g.createRadialGradient(360, 1000, 50, 360, 1000, 900); rg.addColorStop(0, 'rgba(255,255,255,.07)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    if (T.bgFx === 'paper') {   // vân giấy + kinh vĩ tuyến
      for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(90,60,20,${Math.random() * 0.06})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
      g.strokeStyle = 'rgba(110,80,40,.18)'; g.lineWidth = 1;
      for (let x = 0; x < W; x += 90) { g.beginPath(); g.moveTo(x, 300); g.lineTo(x, 1720); g.stroke(); }
      for (let y = 300; y < 1720; y += 90) { g.beginPath(); g.moveTo(0, y); g.lineTo(700, y); g.stroke(); }
      const vg = g.createRadialGradient(540, 960, 500, 540, 960, 1200); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(90,50,10,.35)');
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
    }
    if (T.bgFx === 'lacquer') {
      g.globalAlpha = 0.12; g.strokeStyle = T.accent;
      for (let i = 0; i < 40; i++) { g.lineWidth = rnd(1, 3); g.beginPath(); const y = rnd(0, H); g.moveTo(0, y); g.bezierCurveTo(300, y + rnd(-90, 90), 700, y + rnd(-90, 90), W, y + rnd(-60, 60)); g.stroke(); }
      g.globalAlpha = 1;
    }
  }
  const lite = () => !!CFG.lite;
  function drawBg(t, dt) {
    ctx.drawImage(bgCanvas, 0, 0);
    const fxk = T.bgFx, n = lite() ? 0.4 : 1;
    if (!bgItems.length) {
      const count = { stars: 160, aurora: 110, grid: 90, lanterns: 26, blossom: 42, lotus: 16, waves: 0, radar: 0, lacquer: 60, paper: 0 }[fxk] || 0;
      for (let i = 0; i < count * n; i++) bgItems.push({ x: rnd(0, W), y: rnd(0, H), s: rnd(0.4, 1.6), p: rnd(0, 6.28), v: rnd(0.3, 1) });
      bgItems.ready = true;
    }
    ctx.save();
    if (fxk === 'stars' || fxk === 'aurora' || fxk === 'grid') {
      for (const s of bgItems) { ctx.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(t * s.v + s.p)); ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.s * 2, s.s * 2); }
      if (fxk === 'stars' && Math.sin(t * 0.7) > 0.995) shooting();
    }
    if (fxk === 'aurora') {
      ctx.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 3; b++) {
        const g = ctx.createLinearGradient(0, 200, 0, 900); const c = b === 1 ? T.accent2 : T.accent;
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, c + '33'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 900);
        for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 380 + b * 120 + Math.sin(x / 170 + t * (0.4 + b * 0.15) + b) * 90 + Math.sin(x / 70 + t) * 20);
        ctx.lineTo(W, 900); ctx.closePath(); ctx.fill();
      }
    }
    if (fxk === 'grid') {
      ctx.strokeStyle = T.accent2; ctx.globalAlpha = 0.28; ctx.lineWidth = 2;
      const hy = 1500;
      for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(540 + i * 40, hy); ctx.lineTo(540 + i * 260, H); ctx.stroke(); }
      for (let k = 0; k < 10; k++) { const f = ((k + (t * 0.6) % 1) / 10); const y = hy + (H - hy) * f * f; ctx.globalAlpha = 0.3 * f + 0.05; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }
    if (fxk === 'lanterns' || T.moon) {
      const mx = 560, my = 470; const mg = ctx.createRadialGradient(mx, my, 20, mx, my, 170); mg.addColorStop(0, 'rgba(255,240,200,.45)'); mg.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = mg; ctx.fillRect(mx - 180, my - 180, 360, 360);
      ctx.fillStyle = '#fff3cf'; ctx.beginPath(); ctx.arc(mx, my, 62, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(220,200,150,.35)'; ctx.beginPath(); ctx.arc(mx - 18, my - 10, 12, 0, 7); ctx.arc(mx + 20, my + 16, 8, 0, 7); ctx.fill();
      for (const s of bgItems) { s.y -= s.v * dt * 22; if (s.y < -40) { s.y = H + 30; s.x = rnd(0, W); } drawLantern(s.x + Math.sin(t + s.p) * 12, s.y, 10 + s.s * 6, 0.5); }
      // mặt sông phản chiếu
      ctx.globalAlpha = 0.2; ctx.fillStyle = T.accent;
      for (let i = 0; i < 12; i++) ctx.fillRect(40 + ((i * 97 + t * 30) % 1000), 1690 + (i % 4) * 8, 40 + (i % 3) * 20, 2);
    }
    if (fxk === 'radar') {
      const cx = MAP.x + 300, cy = MAP.y + 640, R = 760;
      ctx.strokeStyle = T.accent; ctx.globalAlpha = 0.16; ctx.lineWidth = 2;
      for (let r = 120; r < R; r += 120) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
      const a = t * 1.1; ctx.globalAlpha = 0.35;
      const sg = ctx.createConicGradient ? ctx.createConicGradient(a - 0.9, cx, cy) : null;
      if (sg) { sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(0.14, T.glow + '88'); sg.addColorStop(0.145, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill(); }
      radarAngle = a;
    }
    if (fxk === 'blossom' || fxk === 'lotus' || fxk === 'lacquer') {
      for (const s of bgItems) {
        if (fxk === 'lotus') { s.x += Math.sin(t * 0.3 + s.p) * 0.2; drawLotus(s.x, 1500 + (s.y % 400), 14 + s.s * 10, 0.35); }
        else if (fxk === 'blossom') { s.y += s.v * dt * 40; s.x += Math.sin(t + s.p) * 0.5; if (s.y > H + 20) { s.y = -20; s.x = rnd(0, W); } drawFlower(s.x, s.y, 6 + s.s * 5, t * s.v + s.p, s.v > 0.6 ? '#ffd84d' : '#ffb3c1', 0.75); }
        else { s.y -= s.v * dt * 10; if (s.y < 0) s.y = H; ctx.globalAlpha = 0.5 * Math.abs(Math.sin(t + s.p)); ctx.fillStyle = T.accent; ctx.fillRect(s.x, s.y, s.s * 2, s.s * 2); }
      }
      if (fxk === 'lotus') for (let i = 0; i < (lite() ? 8 : 20); i++) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i); ctx.fillStyle = '#fff59a'; ctx.beginPath(); ctx.arc((i * 211 + Math.sin(t * 0.5 + i) * 60) % W, 300 + (i * 137) % 1300 + Math.cos(t * 0.6 + i) * 30, 2.5, 0, 7); ctx.fill(); }
      if (fxk === 'blossom') drawBranch(t);
      if (fxk === 'lacquer') { ctx.globalAlpha = 0.18; drawDrum(MAP.x + 300, MAP.y + 620, 520, t * 0.05, T.accent); }
    }
    if (fxk === 'waves') {
      for (let b = 0; b < 4; b++) {
        ctx.globalAlpha = 0.16 + b * 0.05; ctx.fillStyle = b % 2 ? T.accent : '#38b6ff';
        ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 1600 + b * 70 + Math.sin(x / 120 + t * (0.8 + b * 0.2) + b * 2) * 18);
        ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#9ff';
      for (let i = 0; i < (lite() ? 10 : 30); i++) { ctx.globalAlpha = 0.08 + 0.08 * Math.sin(t * 1.5 + i); ctx.beginPath(); ctx.ellipse((i * 173) % W, (i * 331) % 1500 + 300, 40, 8, Math.sin(t * 0.2 + i), 0, 7); ctx.fill(); }
    }
    if (fxk === 'paper') {   // la bàn
      ctx.globalAlpha = 0.5; drawCompass(170, 1520, 110, Math.sin(t * 0.4) * 0.15);
    }
    ctx.restore();
  }
  let radarAngle = 0;
  function shooting() { if (fxList.length > 200) return; const x = rnd(100, 1000), y = rnd(250, 800); fxList.push({ k: 'shoot', x, y, vx: -rnd(600, 900), vy: rnd(200, 360), life: 1, max: 1 }); }

  // hình vẽ nhỏ dùng chung
  function drawLantern(x, y, r, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
    if (!lite()) { ctx.shadowColor = '#ff9a3c'; ctx.shadowBlur = r * 1.6; }
    const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#ffcf6b'); g.addColorStop(1, '#ff5a2a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.8, r, 0, 0, 7); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#7a2a00'; ctx.fillRect(-r * 0.45, -r - 2, r * 0.9, 3); ctx.fillRect(-r * 0.45, r - 1, r * 0.9, 3);
    ctx.restore();
  }
  function drawFlower(x, y, r, rot, color, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) { ctx.rotate(1.2566); ctx.beginPath(); ctx.ellipse(0, -r * 0.6, r * 0.42, r * 0.62, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, 7); ctx.fill(); ctx.restore();
  }
  function drawLotus(x, y, r, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
    ctx.fillStyle = '#2f7a4a'; ctx.beginPath(); ctx.ellipse(0, r * 0.4, r * 1.5, r * 0.45, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff9ec4';
    for (let i = -2; i <= 2; i++) { ctx.save(); ctx.rotate(i * 0.38); ctx.beginPath(); ctx.ellipse(0, -r * 0.4, r * 0.3, r * 0.75, 0, 0, 7); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  function drawBranch(t) {
    ctx.save(); ctx.globalAlpha = 0.9; ctx.strokeStyle = '#3a1a0a'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, 1640); ctx.quadraticCurveTo(120, 1560, 230, 1430); ctx.moveTo(120, 1560); ctx.quadraticCurveTo(200, 1580, 260, 1540); ctx.stroke();
    for (const [x, y, r] of [[230, 1430, 16], [180, 1490, 13], [260, 1540, 14], [90, 1580, 15], [140, 1520, 11], [40, 1610, 12]]) drawFlower(x, y, r, Math.sin(t + x) * 0.2, '#ffd84d', 1);
    // dây pháo hai bên tiêu đề
    for (const sx of [24, W - 24]) for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? '#ff2a2a' : '#ffcf3d'; ctx.fillRect(sx - 6 + Math.sin(t * 2 + i) * 2, 40 + i * 30, 12, 24); }
    ctx.restore();
  }
  function drawDrum(cx, cy, R, rot, color) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.strokeStyle = color; ctx.lineWidth = 2;
    for (let r = R * 0.15; r < R; r += R * 0.12) { ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); }
    for (let i = 0; i < 14; i++) { ctx.rotate(6.283 / 14); ctx.beginPath(); ctx.moveTo(0, R * 0.04); ctx.lineTo(R * 0.04, R * 0.15); ctx.lineTo(-R * 0.04, R * 0.15); ctx.closePath(); ctx.stroke(); }
    for (let i = 0; i < 48; i++) { ctx.rotate(6.283 / 48); ctx.beginPath(); ctx.moveTo(0, R * 0.63); ctx.lineTo(0, R * 0.7); ctx.stroke(); }
    ctx.restore();
  }
  function drawCompass(x, y, r, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.strokeStyle = '#6a4a28'; ctx.fillStyle = '#6a4a28'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, 7); ctx.stroke();
    for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, -r * (i % 2 ? 0.55 : 0.95)); ctx.lineTo(r * 0.09, 0); ctx.lineTo(-r * 0.09, 0); ctx.closePath(); ctx.globalAlpha = i % 2 ? 0.4 : 0.7; ctx.fill(); }
    ctx.globalAlpha = 1; ctx.font = `700 ${r * 0.22}px Georgia`; ctx.textAlign = 'center'; ctx.fillText('B', 0, -r * 1.05);
    ctx.restore();
  }

  // ---------- lớp bản đồ (vẽ sẵn, chỉ vẽ lại khi đổi trạng thái) ----------
  let mapLayer = document.createElement('canvas'); mapLayer.width = W; mapLayer.height = H;
  let mapSig = '';
  const RAISE = {};   // độ nhô (px) từng tỉnh trong chế độ 3D
  const level = pts => Math.min(1, Math.log10((pts || 0) + 1) / 3);   // 0..1, 1000 điểm = sáng nhất
  function hexMix(a, b, f) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const m = (s) => Math.round(((pa >> s) & 255) * (1 - f) + ((pb >> s) & 255) * f);
    return `rgb(${m(16)},${m(8)},${m(0)})`;
  }
  function rebuildMap() {
    const g = mapLayer.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    const d3 = !!CFG.mode3d, fancy = !lite();
    const lit = id => S && S.provs[id] && S.provs[id].lit;
    g.setTransform(MS, 0, 0, MS, MAP.x, MAP.y); g.lineJoin = 'round';
    // bóng đổ cả bản đồ
    if (fancy) { g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 40; g.shadowOffsetY = d3 ? 30 : 12; g.fillStyle = T.dark; for (const id of ORDER) g.fill(PATHS[id]); g.restore(); }
    const slab = d3 ? 9 / MS : 0;
    if (d3) {   // tấm đế dày
      for (let k = slab; k > 0; k -= 1.2 / MS) { g.save(); g.translate(0, k); g.fillStyle = hexMix(T.dark, '#000000', 0.45); for (const id of ORDER) g.fill(PATHS[id]); g.restore(); }
    }
    for (const id of ORDER) { g.fillStyle = T.dark; g.fill(PATHS[id]); }
    g.strokeStyle = T.darkEdge; g.lineWidth = 1.3 / MS; for (const id of ORDER) g.stroke(PATHS[id]);
    // tỉnh đã sáng
    for (const id of ORDER) {
      RAISE[id] = 0; if (!lit(id)) continue;
      const en = Math.max(0.05, (S.provs[id].e == null ? 100 : S.provs[id].e) / 100);
      const lv = Math.min(1, level(S.provs[id].pts) * 0.5 + en * 0.5), h = d3 ? (8 + lv * 22) : 0; RAISE[id] = h;
      const c = SH.d[id].c, top = hexMix(T.lit[1], T.lit[0], 0.35 + lv * 0.65);
      if (d3) for (let k = 0; k < h; k += 1.3) { g.save(); g.translate(0, -k / MS); g.fillStyle = hexMix(T.side, T.lit[1], k / h * 0.5); g.fill(PATHS[id]); g.restore(); }
      g.save(); g.translate(0, -h / MS);
      g.globalAlpha = 0.45 + en * 0.55;
      if (fancy) { g.shadowColor = T.glow; g.shadowBlur = 8 + lv * 40 * en; }
      const gr = g.createRadialGradient(c[0], c[1] - 10, 2, c[0], c[1], 120);
      gr.addColorStop(0, T.litTop); gr.addColorStop(0.5, top); gr.addColorStop(1, T.lit[1]);
      g.fillStyle = gr; g.fill(PATHS[id]); g.shadowBlur = 0; g.globalAlpha = 1;
      g.strokeStyle = T.edge; g.globalAlpha = 0.85; g.lineWidth = 1.6 / MS; g.stroke(PATHS[id]);
      g.restore();
    }
    // quần đảo
    for (const is of ISLES) {
      const [bx, by, bw, bh] = is.box, on = lit(is.of);
      g.save(); g.fillStyle = T.light ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.28)'; g.strokeStyle = on ? T.edge : T.darkEdge; g.lineWidth = 1.2 / MS; g.setLineDash([4 / MS, 3 / MS]);
      g.fillRect(bx, by, bw, bh); g.strokeRect(bx, by, bw, bh); g.setLineDash([]);
      for (const [dx, dy, r] of is.dots) {
        if (on && fancy) { g.shadowColor = T.glow; g.shadowBlur = 10; }
        g.fillStyle = on ? T.lit[0] : T.darkEdge; g.beginPath(); g.arc(bx + dx * bw, by + dy * bh, r * 1.2, 0, 7); g.fill();
      }
      g.shadowBlur = 0; g.fillStyle = T.light ? '#5a3a18' : T.sub; g.textAlign = 'left';
      g.font = `800 ${11 / MS * 1.25}px ${T.font}`; g.fillText(is.label, bx + 4 / MS, by + 14 / MS);
      g.font = `600 ${9.5 / MS * 1.25}px ${T.font}`; g.fillText(is.sub, bx + 4 / MS, by + 27 / MS);
      g.restore();
    }
  }
  function mapSignature() {
    if (!S) return 'x';
    let s = themeKey + (CFG.mode3d ? 'D' : 'F') + (CFG.lite ? 'L' : '');
    for (const id of ORDER) { const p = S.provs[id]; s += p.lit ? Math.round(level(p.pts) * 8).toString(36) + Math.round((p.e == null ? 100 : p.e) / 20) : '-'; }
    return s;
  }

  // ---------- ảnh đại diện ----------
  const avCache = new Map();
  function avImg(url) {
    if (!url) return null;
    let e = avCache.get(url);
    if (!e) {
      e = { img: new Image(), ok: false }; e.img.onload = () => { e.ok = true; }; e.img.onerror = () => { e.ok = false; };
      e.img.src = /^https?:/i.test(url) ? '/api/img?u=' + encodeURIComponent(url) : url; avCache.set(url, e);
      if (avCache.size > 300) avCache.delete(avCache.keys().next().value);
    }
    return e.ok ? e.img : null;
  }
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  const colorOf = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return COLORS[Math.abs(h) % COLORS.length]; };
  const initial = n => ([...String(n || '?').trim()][0] || '?').toUpperCase();
  function drawAvatar(x, y, r, u, ring) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, 7); ctx.fillStyle = ring || T.accent; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
    const im = avImg(u.avatar);
    if (im) ctx.drawImage(im, x - r, y - r, r * 2, r * 2);
    else { ctx.fillStyle = colorOf(u.name); ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.fillStyle = '#fff'; ctx.font = `900 ${r * 1.1}px ${T.font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(initial(u.name), x, y + 1); }
    ctx.restore();
  }
  function avatarHTML(u, cls) {
    const st = u && u.avatar ? `background-image:url('${/^https?:/i.test(u.avatar) ? '/api/img?u=' + encodeURIComponent(u.avatar) : esc(u.avatar)}')` : `background-color:${colorOf(u ? u.name : '?')}`;
    return `<div class="av ${cls || ''}" style="${st}">${u && u.avatar ? '' : esc(initial(u ? u.name : '?'))}</div>`;
  }

  // ---------- hiệu ứng ----------
  const fxList = [];
  const flash = {};   // id -> thời điểm thắp (nháy sáng)
  const FEED_ORIGIN = [210, 900], GIFT_ORIGIN = [870, 440];
  function provPoint(id) { const c = CENTER[id]; return c ? [c[0], c[1] - (RAISE[id] || 0)] : [MAP.x + 300, MAP.y + 600]; }
  // ---------- camera: zoom vào tỉnh vừa được cộng điểm ----------
  const VC = [MAP.x + 300, MAP.y + 640];
  const CAM = { x: VC[0], y: VC[1], z: 1, tx: VC[0], ty: VC[1], tz: 1, until: 0 };
  function focus(id, pts, strong) {
    if (!CENTER[id]) return;
    flash[id] = performance.now();
    const [x, y] = provPoint(id);
    if (pts > 0) { fxList.push({ k: 'num', x, y: y - 10, text: '+' + fmt(pts), life: 0, max: 1.7, big: strong }); pointSound(pts); }
    if (CFG.zoomOn === false) return;
    const z = Math.max(1.2, +CFG.zoomScale || 2.2);
    CAM.tx = x; CAM.ty = y; CAM.tz = strong ? z : 1 + (z - 1) * 0.75; CAM.until = performance.now() + (strong ? 2800 : 1700);
  }
  function stepCam(dt) {
    if (performance.now() > CAM.until) { CAM.tx = VC[0]; CAM.ty = VC[1]; CAM.tz = 1; }
    const k = 1 - Math.exp(-dt * 3.2);
    CAM.x += (CAM.tx - CAM.x) * k; CAM.y += (CAM.ty - CAM.y) * k; CAM.z += (CAM.tz - CAM.z) * k;
  }
  const toWorld = (sx, sy) => [(sx - VC[0]) / CAM.z + CAM.x, (sy - VC[1]) / CAM.z + CAM.y];
  function comet(from, id, color, big) {
    const to = provPoint(id); from = toWorld(from[0], from[1]);
    fxList.push({ k: 'comet', x: from[0], y: from[1], sx: from[0], sy: from[1], tx: to[0], ty: to[1], life: 0, max: big ? 1.4 : 1.05, prov: id, color: color || T.accent, trail: [], big });
    sfx.whoosh();
  }
  function hit(id, big) {
    const [x, y] = provPoint(id); flash[id] = performance.now();
    const k = T.hit, c = T.glow, n = lite() ? 0.5 : 1;
    sfx.chime(big);
    if (k === 'comet' || k === 'petal' || k === 'firework') {
      const cnt = Math.round((big ? 60 : 28) * n);
      for (let i = 0; i < cnt; i++) { const a = rnd(0, 6.28), v = rnd(60, big ? 420 : 240); fxList.push({ k: k === 'petal' ? 'petal' : 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (k === 'firework' ? 120 : 0), life: 0, max: rnd(0.7, 1.4), c: i % 3 ? c : T.accent2, r: rnd(2, 5), rot: rnd(0, 6) }); }
    }
    fxList.push({ k: 'ring', x, y, life: 0, max: 1, c, r0: 6, r1: big ? 150 : 80 });
    if (k === 'drum') fxList.push({ k: 'drum', x, y, life: 0, max: 1.4, c: T.accent });
    if (k === 'pillar') fxList.push({ k: 'pillar', x, y, life: 0, max: 1.4, c });
    if (k === 'laser') fxList.push({ k: 'laser', x, y, life: 0, max: 0.9, c: T.accent2 });
    if (k === 'lantern') for (let i = 0; i < (big ? 6 : 3); i++) fxList.push({ k: 'lantern', x: x + rnd(-20, 20), y, vx: rnd(-15, 15), vy: -rnd(50, 90), life: 0, max: rnd(2.2, 3.2), r: rnd(9, 14) });
    if (k === 'lock') fxList.push({ k: 'lock', x, y, life: 0, max: 1.2, c });
    if (k === 'stamp') fxList.push({ k: 'stamp', x, y, life: 0, max: 1.6 });
    if (k === 'ripple') for (let i = 0; i < 3; i++) fxList.push({ k: 'ring', x, y, life: -i * 0.25, max: 1.3, c: '#ffffff', r0: 4, r1: 110 });
  }
  function celebrate(seconds) {
    // pháo hoa khắp màn + lần lượt thắp hiệu ứng từ Bắc vào Nam
    const end = performance.now() + seconds * 1000;
    const tick = () => { if (performance.now() > end) return; firework(rnd(80, 1000), rnd(300, 1000)); setTimeout(tick, lite() ? 500 : 220); };
    tick();
    ORDER.forEach((id, i) => setTimeout(() => { flash[id] = performance.now(); if (i % (lite() ? 4 : 2) === 0) hit(id, false); }, i * 90));
    sfx.fanfare();
  }
  function flashScreen() {   // chớp sáng khi đổi giao diện
    const el = document.createElement('div'); el.style.cssText = 'position:absolute;inset:0;background:#fff;opacity:.85;z-index:30;transition:opacity .9s;pointer-events:none';
    stage.appendChild(el); requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = 0; })); setTimeout(() => el.remove(), 1000);
  }
  function lixi(sec) {   // bao lì xì rơi khắp màn
    const end = performance.now() + Math.min(8, sec) * 1000;
    const tick = () => { if (performance.now() > end) return; for (let i = 0; i < (lite() ? 1 : 3); i++) fxList.push({ k: 'env', x: rnd(40, W - 40), y: -30, vx: rnd(-20, 20), vy: rnd(160, 300), life: 0, max: 7, rot: rnd(-0.5, 0.5) }); setTimeout(tick, 160); };
    tick(); sfx.fanfare();
  }
  function firework(x, y) {
    const cols = [T.accent, T.accent2, T.glow, '#ffffff', T.lit[0]], c = cols[Math.floor(Math.random() * cols.length)];
    const cnt = lite() ? 30 : 70;
    for (let i = 0; i < cnt; i++) { const a = (i / cnt) * 6.283, v = rnd(180, 360); fxList.push({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: rnd(1, 1.7), c, r: rnd(2, 4), g: 160 }); }
    sfx.boom();
  }
  function drawFx(dt) {
    ctx.save();
    for (let i = fxList.length - 1; i >= 0; i--) {
      const f = fxList[i]; f.life += dt; if (f.life < 0) continue;
      const p = f.life / f.max; if (p >= 1) { fxList.splice(i, 1); if (f.k === 'comet') hit(f.prov, f.big); continue; }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = T.light ? 'source-over' : 'lighter';
      if (f.k === 'comet') {
        const e = 1 - Math.pow(1 - p, 2.2), arc = Math.sin(p * Math.PI) * -120;
        f.x = f.sx + (f.tx - f.sx) * e; f.y = f.sy + (f.ty - f.sy) * e + arc;
        f.trail.push([f.x, f.y]); if (f.trail.length > 22) f.trail.shift();
        for (let k = 0; k < f.trail.length; k++) { const [tx, ty] = f.trail[k]; ctx.globalAlpha = k / f.trail.length * 0.7; ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(tx, ty, (f.big ? 9 : 6) * k / f.trail.length, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, f.big ? 9 : 6, 0, 7); ctx.fill();
      } else if (f.k === 'spark' || f.k === 'shoot') {
        f.vy += (f.g || 60) * dt; f.vx *= 0.985; f.x += f.vx * dt; f.y += f.vy * dt;
        ctx.globalAlpha = 1 - p; ctx.fillStyle = f.c || '#fff';
        if (f.k === 'shoot') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - f.vx * 0.12, f.y - f.vy * 0.12); ctx.stroke(); }
        else ctx.fillRect(f.x - f.r / 2, f.y - f.r / 2, f.r, f.r);
      } else if (f.k === 'petal') {
        f.vy += 40 * dt; f.vx *= 0.97; f.vy *= 0.98; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += dt * 3;
        ctx.globalCompositeOperation = 'source-over'; drawFlower(f.x, f.y, 6, f.rot, T.lit[0], 1 - p);
      } else if (f.k === 'ring') {
        const r = f.r0 + (f.r1 - f.r0) * (1 - Math.pow(1 - p, 3));
        ctx.globalAlpha = (1 - p) * 0.9; ctx.strokeStyle = f.c; ctx.lineWidth = 4 * (1 - p) + 1; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 7); ctx.stroke();
      } else if (f.k === 'drum') {
        ctx.globalAlpha = 1 - p; drawDrum(f.x, f.y, 30 + p * 90, p * 3, f.c);
      } else if (f.k === 'pillar') {
        const g = ctx.createLinearGradient(0, f.y - 500, 0, f.y); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, f.c);
        ctx.globalAlpha = (1 - p) * 0.8; ctx.fillStyle = g; const w = 18 * (1 - p * 0.5); ctx.fillRect(f.x - w / 2, f.y - 500 * Math.min(1, p * 3), w, 500 * Math.min(1, p * 3));
      } else if (f.k === 'laser') {
        ctx.globalAlpha = 1 - p; ctx.strokeStyle = f.c; ctx.lineWidth = 3;
        for (const [sx, sy] of [[0, 300], [W, 300], [MAP.x + 320, 300]]) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(f.x, f.y); ctx.stroke(); }
      } else if (f.k === 'lantern') {
        f.x += f.vx * dt; f.y += f.vy * dt; ctx.globalCompositeOperation = 'source-over'; drawLantern(f.x, f.y, f.r, Math.min(1, (1 - p) * 2));
      } else if (f.k === 'lock') {
        const s = 70 * (1 - p) + 18; ctx.globalAlpha = 1 - p * 0.6; ctx.strokeStyle = f.c; ctx.lineWidth = 3;
        for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.beginPath(); ctx.moveTo(f.x + dx * s, f.y + dy * s * 0.5); ctx.lineTo(f.x + dx * s, f.y + dy * s); ctx.lineTo(f.x + dx * s * 0.5, f.y + dy * s); ctx.stroke(); }
        ctx.font = `800 16px ${T.font}`; ctx.fillStyle = f.c; ctx.textAlign = 'center'; ctx.fillText('ĐÃ KHÓA', f.x, f.y - s - 6);
      } else if (f.k === 'num') {
        const pop = p < 0.15 ? 0.6 + p / 0.15 * 0.6 : 1.2 - Math.min(0.2, (p - 0.15));
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = p > 0.7 ? (1 - p) / 0.3 : 1;
        ctx.save(); ctx.translate(f.x, f.y - p * 70); ctx.scale(pop / CAM.z * 1.4, pop / CAM.z * 1.4);
        ctx.font = `900 ${f.big ? 40 : 30}px ${T.font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(f.text, 0, 0); ctx.fillStyle = T.accent; ctx.fillText(f.text, 0, 0); ctx.restore();
      } else if (f.k === 'env') {
        f.x += f.vx * dt; f.y += f.vy * dt; f.rot += Math.sin(f.life * 3) * dt; if (f.y > H + 40) f.life = f.max;
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
        ctx.fillStyle = '#d61f1f'; ctx.fillRect(-14, -20, 28, 40); ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(0, -4, 7, 0, 7); ctx.fill(); ctx.fillRect(-14, -20, 28, 4); ctx.restore();
      } else if (f.k === 'stamp') {
        const s = p < 0.15 ? 3 - p / 0.15 * 2 : 1; ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = p < 0.7 ? 0.9 : (1 - p) / 0.3 * 0.9; ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(-0.15); ctx.scale(s, s);
        ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 4; ctx.strokeRect(-38, -20, 76, 40); ctx.fillStyle = '#b3261e'; ctx.font = `900 26px ${T.font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('QUÊ', 0, 1); ctx.restore();
      }
    }
    ctx.restore();
    if (fxList.length > 900) fxList.splice(0, fxList.length - 900);
  }

  // ---------- vẽ bản đồ mỗi khung hình ----------
  function drawMap(t) {
    if (!S) return;
    const sig = mapSignature(); if (sig !== mapSig) { mapSig = sig; rebuildMap(); }
    ctx.save();
    if (CFG.mode3d) {   // bản đồ chuyển động nhẹ như thật
      const cx = MAP.x + 300, cy = MAP.y + 650;
      ctx.translate(cx, cy); ctx.rotate(Math.sin(t * 0.35) * 0.012); ctx.transform(1, 0, Math.sin(t * 0.5) * 0.02, 1 + Math.sin(t * 0.7) * 0.006, 0, Math.sin(t * 0.6) * 5); ctx.translate(-cx, -cy);
    }
    ctx.drawImage(mapLayer, 0, 0);
    // nhịp thở của tỉnh đã sáng + nháy khi vừa thắp + viền tỉnh may mắn / đại chiến / đang hot
    const nowp = performance.now(), tn = now();
    ctx.save(); ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([MS, 0, 0, MS, MAP.x, MAP.y])));
    const base = ctx.getTransform();
    ctx.globalCompositeOperation = T.light ? 'multiply' : 'lighter';
    for (const id of ORDER) {
      const pr = S.provs[id]; if (!pr.lit) continue;
      const h = (RAISE[id] || 0) / MS; ctx.setTransform(base); ctx.translate(0, -h);
      const fl = flash[id] ? Math.max(0, 1 - (nowp - flash[id]) / 1500) : 0;
      const blink = fl > 0 ? fl * (0.75 + 0.25 * Math.sin((nowp - flash[id]) / 60)) : 0;   // nháy sáng khi được cộng điểm
      const a = (T.light ? 0.06 : 0.07) + 0.06 * Math.sin(t * 2 + SH.d[id].c[1] / 60) + blink * 0.95;
      if (a > 0.01) { ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = T.light ? T.lit[1] : '#ffffff'; ctx.fill(PATHS[id]); }
      if (blink > 0.02) {
        ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, blink * 1.2);
        if (!lite()) { ctx.shadowColor = T.glow; ctx.shadowBlur = 30 * blink; }
        ctx.strokeStyle = T.light ? T.lit[1] : '#ffffff'; ctx.lineWidth = (2 + 5 * blink) / MS; ctx.stroke(PATHS[id]); ctx.restore();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const id of ORDER) {   // sắp tắt: chập chờn
      const pr = S.provs[id]; if (!pr.lit || pr.e == null || pr.e > 25) continue;
      ctx.setTransform(base); ctx.translate(0, -(RAISE[id] || 0) / MS);
      ctx.globalAlpha = 0.25 + 0.3 * Math.max(0, Math.sin(t * 9 + id.length)) * (1 - pr.e / 25); ctx.fillStyle = T.dark; ctx.fill(PATHS[id]);
    }
    ctx.globalAlpha = 1;
    const outline = (id, color, w, dash) => { ctx.setTransform(base); ctx.translate(0, -(RAISE[id] || 0) / MS); ctx.strokeStyle = color; ctx.lineWidth = w / MS; ctx.setLineDash(dash ? [8 / MS, 6 / MS] : []); ctx.lineDashOffset = -t * 30 / MS; ctx.stroke(PATHS[id]); ctx.setLineDash([]); };
    if (S.lucky && S.lucky.endsAt > tn) outline(S.lucky.id, Math.sin(t * 6) > 0 ? '#ffffff' : T.accent, 4, true);
    if (S.battle && S.battle.endsAt > tn) { outline(S.battle.a, '#ff3d5a', 4.5, true); outline(S.battle.b, '#3a8bff', 4.5, true); }
    for (const id in (S.hot || {})) if (S.hot[id] > tn) outline(id, `hsl(${20 + Math.sin(t * 8) * 15},100%,60%)`, 3.5, false);
    ctx.restore();

    // nhãn tỉnh, biểu tượng, ảnh người xem
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const id of ORDER) {
      const pr = S.provs[id], [cx, cy0] = CENTER[id], nd = LABEL_NUDGE[id] || [0, 0];
      const x = cx + nd[0], y = cy0 + nd[1] - (RAISE[id] || 0);
      ctx.font = `800 ${pr.lit ? 15 : 14}px ${T.font}`; ctx.lineWidth = 3.5; ctx.lineJoin = 'round';
      ctx.strokeStyle = T.light ? 'rgba(255,248,230,.9)' : 'rgba(0,0,0,.65)'; ctx.fillStyle = pr.lit ? (T.light ? '#3a1a08' : '#fff') : (T.light ? '#8a6a40' : 'rgba(220,225,255,.6)');
      const label = pshort(id); ctx.strokeText(label, x, y + 22); ctx.fillText(label, x, y + 22);
      let ix = x + ctx.measureText(label).width / 2 + 10;
      if (pr.owner) { ctx.font = '18px serif'; ctx.fillText('👑', ix, y + 20); ix += 20; }
      if (pr.lit && pr.e != null && pr.e <= 25 && Math.sin(t * 6) > -0.3) { ctx.font = '18px serif'; ctx.fillText('⚠️', ix, y + 20); ix += 20; }
      if (S.hot && S.hot[id] > tn) { ctx.font = '18px serif'; ctx.fillText('🔥', ix, y + 20); ix += 20; }
      if (S.lucky && S.lucky.id === id && S.lucky.endsAt > tn) { ctx.font = `${20 + Math.sin(t * 6) * 3}px serif`; ctx.fillText('⭐', x, y - 28); }
    }
    // người xem quanh tỉnh (tối đa 4 người / tỉnh)
    const per = {};
    for (const u of (S.recent || []).slice().reverse()) { (per[u.prov] = per[u.prov] || []).push(u); }
    const OFF = [[-20, -6], [20, -6], [-36, 14], [36, 14]];
    for (const id in per) {
      if (!CENTER[id]) continue; const [cx, cy0] = CENTER[id], nd = LABEL_NUDGE[id] || [0, 0], cy = cy0 + nd[1] - (RAISE[id] || 0);
      per[id].slice(0, id === 'ha-noi' || id === 'tp-hcm' || id === 'hung-yen' || id === 'bac-ninh' ? 2 : 4).forEach((u, i) => {
        const bob = Math.sin(t * 2 + i + cx) * 2;
        drawAvatar(cx + nd[0] + OFF[i][0], cy + OFF[i][1] - 4 + bob, 12, u, colorOf(u.id));
      });
    }
    ctx.restore();
  }

  // ---------- DOM: bảng xếp hạng ----------
  const tweens = new Map();
  function tweenNum(el, to) {
    const from = +(el.dataset.v || 0); el.dataset.v = to;
    if (from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 700; tweens.set(el, { from, to, t0, dur });
  }
  function stepTweens() {
    const n = performance.now();
    for (const [el, tw] of tweens) { const p = Math.min(1, (n - tw.t0) / tw.dur); el.textContent = fmt(tw.from + (tw.to - tw.from) * (1 - Math.pow(1 - p, 3))); if (p >= 1) tweens.delete(el); }
  }
  function rows(container, list, valFn, extraFn, unit) {
    const keep = new Set();
    list.slice(0, 5).forEach((it, i) => {
      keep.add(it.id);
      let r = container.querySelector(`[data-id="${it.id}"]`);
      if (!r) { r = document.createElement('div'); r.className = 'row'; r.dataset.id = it.id; r.innerHTML = '<span class="rk"></span><span class="nm"></span><span class="vl"></span>' + (unit ? `<span class="xu">${unit}</span>` : ''); r.style.transform = `translateY(${5 * 42}px)`; r.style.opacity = 0; container.appendChild(r); requestAnimationFrame(() => { r.style.opacity = 1; r.style.transform = `translateY(${i * 42}px)`; }); }
      else r.style.transform = `translateY(${i * 42}px)`;
      r.className = 'row r' + i;
      r.querySelector('.rk').textContent = i + 1;
      r.querySelector('.nm').innerHTML = esc(pname(it.id)) + (extraFn ? extraFn(it) : '');
      tweenNum(r.querySelector('.vl'), valFn(it));
    });
    for (const r of [...container.children]) if (!keep.has(r.dataset.id)) { r.style.opacity = 0; setTimeout(() => r.remove(), 400); r.dataset.id = '_gone' + Math.random(); }
  }
  let lastGiftKey = '';
  function onState() {
    if (!S) return;
    $('barFill').style.width = (S.lit / S.total * 100) + '%';
    $('progText').innerHTML = `${S.season > 1 ? `Mùa ${S.season} · ` : ''}Đã sáng <em>${S.lit}</em>/${S.total} tỉnh, thành · ${fmt(S.people)} người`;
    rows($('raceRows'), S.round.top.map(x => ({ id: x.id, v: x.v })), x => x.v, x => (S.round.winners[0] && S.round.winners[0].prov === x.id ? ' <span class="tag">👑1</span>' : ''));
    rows($('giftRows'), S.giftTop.map(x => ({ id: x.id, v: x.v })), x => x.v, null, 'xu');
    if (!S.round.top.length) $('raceRows').innerHTML = `<div style="opacity:.7;font-size:19px;padding:8px 2px">Bình luận tên tỉnh để bắt đầu đua!</div>`;
    else { const e = $('raceRows').querySelector('div:not(.row)'); if (e) e.remove(); }
    if (!S.giftTop.length) $('giftRows').innerHTML = `<div style="opacity:.7;font-size:19px;padding:8px 2px">Tặng quà để quê bạn lên bảng!</div>`;
    else { const e = $('giftRows').querySelector('div:not(.row)'); if (e) e.remove(); }
    // vừa tặng quà
    const g = S.lastGift, key = g ? g.user.id + g.value + g.pts + (g.prov || '') : '';
    if (key !== lastGiftKey) {
      lastGiftKey = key;
      $('lgBody').innerHTML = g ? `${avatarHTML(g.user)}<div class="nm">${esc(g.user.name)}</div><div class="ds">${g.prov ? `Nhận · <b>+${fmt(g.pts)}</b> điểm<br>cho quê ${esc(pname(g.prov))}` : `<b>${fmt(g.pts)}</b> điểm đang chờ<br>bình luận tên quê để nhận`}</div>`
        : `<div style="padding:24px 6px;opacity:.75;font-size:20px">Chưa có quà nào<br>Hãy là người đầu tiên! 🎁</div>`;
      $('lastGift').classList.remove('pop'); void $('lastGift').offsetWidth; $('lastGift').classList.add('pop');
    }
    // bảng điểm
    const tiers = (CFG.tiers || []).map((t, i, a) => { const next = a[i + 1] ? a[i + 1][0] - 1 : null; return `<div class="tr"><span>🎁 ${fmt(t[0])}${next ? '–' + fmt(next) : '+'} xu</span><b>+${fmt(t[1])}</b></div>`; }).join('');
    $('tiers').innerHTML = `<div class="tr"><span>💬 Mỗi bình luận</span><b>+${CFG.commentPts || 1}</b></div><div class="tr"><span>❤️ Mỗi ${CFG.likeEvery || 50} tim</span><b>+1</b></div>` + tiers;
    $('cTxt').textContent = S.country.target ? `🎁 ${fmt(S.country.pool)} / ${fmt(S.country.target)} xu` : '';
    $('cFill').style.width = S.country.target ? Math.min(100, S.country.pool / S.country.target * 100) + '%' : '0';
    // vinh danh
    const pd = S.podium || [], order = [1, 0, 2];
    $('podium').innerHTML = order.map(i => { const u = pd[i]; if (!u) return `<div class="pd p${i}" style="opacity:.35">${avatarHTML({ name: '?' })}<div class="bx">—</div><div class="nm">Chờ bạn</div></div>`;
      return `<div class="pd p${i}">${avatarHTML(u)}<div class="bx">${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${fmt(u.coins)}<small style="font-size:13px"> xu</small></div><div class="nm">${esc(u.name)}</div></div>`; }).join('');
    renderEventBar();
  }
  function fmtTime(ms) { ms = Math.max(0, ms); const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  let barSig = '';
  function renderEventBar() {
    if (!S) return;
    const tn = now(), chips = [];
    if (S.battle && S.battle.endsAt > tn) chips.push(['battle', `<span class="ic">⚔️</span><div class="vs"><span class="sd" style="color:#ff6b80">${esc(pshort(S.battle.a))} <b data-k="sa">${S.battle.sa}</b></span><div class="tug"><i data-k="tug" style="width:${S.battle.sa + S.battle.sb ? S.battle.sa / (S.battle.sa + S.battle.sb) * 100 : 50}%"></i></div><span class="sd" style="text-align:right;color:#6aa8ff"><b data-k="sb">${S.battle.sb}</b> ${esc(pshort(S.battle.b))}</span></div><span class="tm" data-end="${S.battle.endsAt}"></span>`]);
    if (S.quiz && S.quiz.endsAt > tn) chips.push(['quiz', `<span class="ic">❓</span><span style="white-space:normal;line-height:1.1;font-size:22px">${esc(S.quiz.q)} <b style="color:var(--accent)">+${S.quiz.pts}</b></span><span class="tm" data-end="${S.quiz.endsAt}"></span>`]);
    if (S.lucky && S.lucky.endsAt > tn) chips.push(['lucky', `<span class="ic">⭐</span><span>${esc(pname(S.lucky.id))} <b style="color:var(--accent)">×2</b></span><span class="tm" data-end="${S.lucky.endsAt}"></span>`]);
    if (S.drop && S.drop.endsAt > tn) chips.push(['drop', `<span class="ic">🧧</span><span>Gõ <b style="color:var(--accent)">“${esc(S.drop.word)}”</b> nhận lộc · <b data-k="dropn">${S.drop.n}</b> người</span><span class="tm" data-end="${S.drop.endsAt}"></span>`]);
    const NEXT = { battle: '⚔️ Đại chiến', quiz: '❓ Đố vui', drop: '🧧 Lộc rơi' };
    if (!chips.length && S.next && S.next.at > tn) chips.push(['next', `<span class="ic">⏳</span><span>${NEXT[S.next.type]} sau</span><span class="tm" data-end="${S.next.at}"></span>`]);
    const hots = Object.keys(S.hot || {}).filter(id => S.hot[id] > tn);
    if (hots.length && (!chips.length || chips[0][0] === 'next')) chips.push(['hot', `<span class="ic">🔥</span><span>${hots.map(pshort).map(esc).join(', ')} <b style="color:var(--accent)">×2</b></span>`]);
    const wv = CFG.waveLikes ? Math.max(0, Math.min(1, 1 - (S.waveNext - S.likes) / CFG.waveLikes)) : 0;
    chips.push(['wave', `<span class="ic">❤️</span><div style="flex:1"><div style="font-size:17px;margin-bottom:4px" data-k="wavet">Sóng tim · ${fmt(S.likes)}${S.viewers ? ` · 👀 ${fmt(S.viewers)}` : ''}</div><div class="mini"><i data-k="wave" style="width:${wv * 100}%"></i></div></div>`]);
    const sig = chips.map(c => c[0] + (c[0] === 'battle' ? S.battle.a + S.battle.b : c[0] === 'quiz' ? S.quiz.q : c[0] === 'lucky' ? S.lucky.id : c[0] === 'hot' ? hots.join() : c[0] === 'next' ? S.next.type + S.next.at : '')).join('|');
    if (sig !== barSig) {
      const before = new Set(barSig.split('|')); barSig = sig;
      const keys = sig.split('|');
      $('eventBar').innerHTML = chips.map(([k, h], i) => `<div class="chip ${k}${before.has(keys[i]) ? '' : ' new'}">${h}</div>`).join('');
    }
    else {   // chỉ cập nhật số
      const q = s => $('eventBar').querySelector(s);
      if (S.battle && q('[data-k="sa"]')) { q('[data-k="sa"]').textContent = S.battle.sa; q('[data-k="sb"]').textContent = S.battle.sb; q('[data-k="tug"]').style.width = (S.battle.sa + S.battle.sb ? S.battle.sa / (S.battle.sa + S.battle.sb) * 100 : 50) + '%'; }
      if (S.drop && q('[data-k="dropn"]')) q('[data-k="dropn"]').textContent = S.drop.n;
      if (q('[data-k="wave"]')) { q('[data-k="wave"]').style.width = wv * 100 + '%'; q('[data-k="wavet"]').textContent = 'Sóng tim · ' + fmt(S.likes) + (S.viewers ? ' · 👀 ' + fmt(S.viewers) : ''); }
    }
  }
  function tickTimers() {
    if (!S) return;
    const tn = now();
    $('roundTime').textContent = 'còn ' + fmtTime(S.round.endsAt - tn);
    for (const el of $('eventBar').querySelectorAll('[data-end]')) el.textContent = fmtTime(+el.dataset.end - tn);
    if ((S.battle && S.battle.endsAt < tn) || (S.quiz && S.quiz.endsAt < tn) || (S.lucky && S.lucky.endsAt < tn) || (S.drop && S.drop.endsAt < tn) || (S.next && S.next.at < tn)) renderEventBar();
  }
  setInterval(tickTimers, 250);

  // ---------- dòng sự kiện bên trái ----------
  const feed = [];
  function feedAdd(u, html) {
    const el = document.createElement('div'); el.className = 'fi';
    el.innerHTML = (u ? avatarHTML(u) : '<div class="av" style="background:var(--accent);color:#000">★</div>') + `<span>${html}</span>`;
    el.style.opacity = 0;
    $('feed').appendChild(el); feed.unshift(el);
    while (feed.length > 6) { const old = feed.pop(); old.style.opacity = 0; old.style.transform = `translateY(${-6 * 60}px) scale(.9)`; setTimeout(() => old.remove(), 500); }
    el.style.transform = 'translateY(80px) scale(.8)';
    requestAnimationFrame(() => requestAnimationFrame(() => feed.forEach((e, i) => { e.style.opacity = 1 - i * 0.14; e.style.transform = `translateY(${-i * 60}px) scale(${i ? 0.94 : 1})`; e.style.transformOrigin = 'left center'; })));
  }
  $('feed').style.cssText += ';left:30px;top:980px;width:380px;height:420px';

  // ---------- khách vào phòng ----------
  const joinQ = []; let joinBusy = false, joinSkipped = 0;
  function joinToast(u, prov, lv) {
    joinQ.push({ u, prov, lv });
    if (joinQ.length > 4) { joinQ.shift(); joinSkipped++; }   // vào dồn dập: gộp lại "+N người khác"
    pumpJoin();
  }
  function pumpJoin() {
    if (joinBusy || !joinQ.length) return; joinBusy = true;
    const j = joinQ.shift(), host = $('joins'), more = joinSkipped; joinSkipped = 0;
    const el = document.createElement('div'); el.className = 'jn';
    el.innerHTML = avatarHTML(j.u) + `<span>👋 <b>${esc(j.u.name)}</b>${j.lv > 1 ? ` <small>Lv${j.lv}</small>` : ''} vừa vào phòng ${j.prov ? `<small>· người ${esc(pname(j.prov))}</small>` : '<small>· bình luận tên quê để thắp đèn</small>'}${more ? ` <small>+${more} người khác</small>` : ''}</span>`;
    host.innerHTML = ''; host.appendChild(el);
    const ms = joinQ.length ? 1400 : 2600;
    setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); joinBusy = false; pumpJoin(); }, 330); }, ms);
  }

  // ---------- băng-rôn giữa màn ----------
  const bnQueue = []; let bnBusy = false;
  function banner(kicker, head, desc, ms, avs) {
    bnQueue.push({ kicker, head, desc, ms: ms || 4000, avs, t: Date.now() }); if (bnQueue.length > 4) bnQueue.splice(1, 1); pumpBanner();
  }
  function pumpBanner() {
    if (bnBusy || !bnQueue.length) return; bnBusy = true;
    while (bnQueue.length > 1 && Date.now() - bnQueue[0].t > 7000) bnQueue.shift();   // bỏ băng-rôn đã cũ
    const b = bnQueue.shift(), host = $('banner');
    host.innerHTML = `<div class="bn"><div class="k">${b.kicker}</div>${b.avs ? `<div class="avs">${b.avs.map(u => avatarHTML(u)).join('')}</div>` : ''}<div class="h">${b.head}</div>${b.desc ? `<div class="d">${b.desc}</div>` : ''}</div>`;
    setTimeout(() => { const el = host.firstChild; if (el) el.classList.add('out'); setTimeout(() => { host.innerHTML = ''; bnBusy = false; pumpBanner(); }, 450); }, b.ms);
  }

  // ---------- MC giọng nói ----------
  const said = {};
  function say(text, prio, key, gap) {
    if (!CFG.mcOn || !text) return;
    if (key) { const n = Date.now(); if (n - (said[key] || 0) < (gap || 0)) return; said[key] = n; }
    lastTalk = Date.now();
    if (window.MC && MC.hasVietnamese()) MC.say(text, prio);
    else socket.emit('vm:say', { text, prio });
  }
  const nm = u => window.MC ? MC.clean(u && u.name) : (u && u.name) || 'bạn';
  let lastTalk = Date.now();
  // MC tự nói khi phòng im: bình luận bảng xếp hạng, kể tỉnh còn tối, nhắc sự kiện sắp tới, rủ tặng quà
  let idleIdx = 0;
  function idleLine() {
    const dark = Object.keys(S.provs).filter(id => !S.provs[id].lit);
    const top = S.round.top || [], tn = now();
    const dim = Object.keys(S.provs).filter(id => S.provs[id].lit && S.provs[id].e != null && S.provs[id].e < 35);
    const L = [];
    if (dark.length) L.push(() => `Còn ${dark.length} tỉnh thành chưa sáng đèn, như ${dark.sort(() => Math.random() - 0.5).slice(0, 3).map(pname).join(', ')}. Người con các tỉnh này đâu rồi, bình luận tên quê để thắp đèn nhé!`);
    if (top[0]) L.push(() => top[1] ? `${pname(top[0].id)} đang dẫn đầu vòng này với ${top[0].v} điểm, ${pname(top[1].id)} bám sát với ${top[1].v} điểm. Ai sẽ lật ngược thế cờ đây?` : `${pname(top[0].id)} đang dẫn đầu với ${top[0].v} điểm. Các tỉnh khác vào đua đi nào!`);
    if (dim.length) L.push(() => `Đèn ${dim.slice(0, 2).map(pname).join(' và ')} đang yếu dần. Bình luận giữ lửa cho quê mình nhé!`);
    if (S.next && S.next.at > tn) { const m = Math.max(1, Math.round((S.next.at - tn) / 60000)); const nm2 = { battle: 'đại chiến giữa các tỉnh', quiz: 'đố vui quê hương', drop: 'lộc rơi' }[S.next.type]; L.push(() => `Khoảng ${m} phút nữa sẽ có ${nm2}. Ở lại đừng bỏ lỡ nhé!`); }
    if (S.round.endsAt > tn) L.push(() => `Vòng đua còn ${Math.max(1, Math.round((S.round.endsAt - tn) / 60000))} phút. Tỉnh nào về nhất sẽ được đội vương miện!`);
    if (S.country.target) L.push(() => `Còn ${fmt(Math.max(0, S.country.target - S.country.pool))} xu nữa là cả nước rực sáng. Mỗi món quà đều cộng điểm cho quê của bạn!`);
    L.push(() => `Ai mới vào phòng thì bình luận tên quê mình để thắp đèn nhé. Gõ tên tỉnh cũ hay tên thành phố cũng được!`);
    L.push(() => `Thả tim thật nhiều nào! Đủ tim là sóng tim sẽ thắp sáng một tỉnh còn tối.`);
    return L[idleIdx++ % L.length]();
  }
  setInterval(() => {
    if (!S || !CFG.mcOn) return;
    const gap = { 1: 60000, 2: 30000, 3: 15000 }[CFG.mcChatty || 2] || 30000;
    if (Date.now() - lastTalk < gap) return;
    say(idleLine(), false);
  }, 5000);

  // ---------- xử lý sự kiện ----------
  function onFx(e) {
    if (!e) return;
    const u = e.user, P = e.prov ? pname(e.prov) : '';
    if (e.prov && e.pts > 0 && !/^(dim|off|hot|lucky|owner)$/.test(e.type)) focus(e.prov, e.pts, e.type === 'gift' || e.type === 'quizWin' || e.type === 'claim' || e.first);
    if (e.type === 'battleEnd' && e.win) focus(e.win, e.bonus, true);
    if (e.type === 'dropEnd') e.winners.forEach((w, i) => w.prov && setTimeout(() => focus(w.prov, w.pts, true), i * 1200));
    if (e.type === 'lucky') focus(e.prov, 0, true);
    switch (e.type) {
      case 'light':
        if (e.prov) comet(FEED_ORIGIN, e.prov, null, e.first);
        if (u) feedAdd(u, `${e.lv > 1 ? `<span class="pt">Lv${e.lv}</span> ` : ''}<b>${esc(u.name)}</b> ${e.nth > 1 ? `người thứ ${e.nth} của` : 'thắp đèn'} ${esc(P)} <span class="pt">+${e.pts}</span>${e.mult > 1 ? ' ×' + e.mult : ''}`);
        else if (e.why === 'wave') feedAdd(null, `Sóng tim thắp sáng <b>${esc(P)}</b>`);
        if (e.first && CFG.mcIntro) {
          const intro = (VN.BY_ID[e.prov] || {}).intro;
          say(`Đèn đầu tiên của ${P} đã sáng${intro ? ', ' + intro : ''}${u ? '. Cảm ơn ' + nm(u) : ''}!`, false);
        } else if (u && CFG.mcWelcome) say(`Chào ${nm(u)} đến từ ${P}!`, false, 'hello', 7000);
        break;
      case 'ping':
        if (Math.random() < 0.35 && u) feedAdd(u, `<b>${esc(u.name)}</b> · ${esc(P)} <span class="pt">+${e.pts}</span>`);
        break;
      case 'returning':
        comet(FEED_ORIGIN, e.prov, T.accent2, true);
        feedAdd(u, `🏡 <b>${esc(u.name)}</b> người con ${esc(P)} quay lại!`);
        joinToast(u, e.prov, 0);
        if (CFG.mcWelcome) say(`Chào mừng ${nm(u)}, người con ${P} đã quay lại! Đèn quê ${P} tự thắp sáng.`, false, 'ret', 4000);
        break;
      case 'join':
        joinToast(u, e.prov, e.lv);
        if (CFG.mcWelcome) say(e.prov ? `Chào ${nm(u)}, người ${P} đã vào phòng!` : `Chào ${nm(u)}, bình luận tên quê để thắp đèn nhé!`, false, 'join', 12000);
        break;
      case 'gift':
        if (e.prov) { comet(GIFT_ORIGIN, e.prov, T.accent, e.value >= 30); if (e.value >= 100) { firework(rnd(200, 600), rnd(500, 900)); firework(rnd(200, 600), rnd(500, 900)); } }
        feedAdd(u, `🎁 <b>${esc(u.name)}</b> tặng ${esc(e.gift.name)}${e.count > 1 ? ' ×' + e.count : ''}${e.prov ? ` <span class="pt">+${fmt(e.pts)}</span>` : ''}`);
        if (e.value >= 100) banner('Quà lớn', `${esc(u.name)}`, `${esc(e.gift.name)} · <b>+${fmt(e.pts)}</b> điểm cho ${esc(P || 'quê nhà')}`, 3500, [u]);
        if (CFG.mcGift) {
          if (e.prov) say(`Cảm ơn ${nm(u)} đã tặng ${MC ? MC.clean(e.gift.name) : e.gift.name}, cộng ${e.pts} điểm cho quê ${P}!`, e.value >= 30, e.value >= 30 ? '' : 'gift', 2500);
          else say(`${nm(u)} ơi, bình luận tên quê mình để nhận ${e.pending} điểm nhé!`, true, 'pend' + u.id, 15000);
        }
        break;
      case 'claim':
        comet(GIFT_ORIGIN, e.prov, T.accent, true);
        feedAdd(u, `💰 <b>${esc(u.name)}</b> nhận <span class="pt">+${fmt(e.pts)}</span> cho ${esc(P)}`);
        say(`${nm(u)} đã nhận ${e.pts} điểm cho ${P}!`, false);
        break;
      case 'country':
        celebrate(9);
        banner('Tuyệt vời', '🇻🇳 CẢ NƯỚC RỰC SÁNG!', u ? `Cảm ơn <b>${esc(u.name)}</b> và tất cả mọi người` : 'Cảm ơn tất cả mọi người', 7000, u ? [u] : null);
        say('Tuyệt vời! Cả nước đã rực sáng! Cảm ơn tất cả mọi người!', true);
        break;
      case 'milestone':
        if (e.n >= e.total) { celebrate(7); banner('Kỳ tích', `Sáng đủ ${e.total}/${e.total}!`, 'Mọi miền Tổ quốc đều đã sáng đèn', 6000); say(`Kỳ tích! Đã sáng đủ ${e.total} tỉnh thành!`, true); }
        else { for (let i = 0; i < 4; i++) setTimeout(() => firework(rnd(150, 900), rnd(400, 900)), i * 300); banner('Cột mốc', `Đã sáng ${e.n}/${e.total}`, `Còn <b>${e.total - e.n}</b> tỉnh, thành nữa thôi!`, 3500); say(`Đã sáng ${e.n} trên ${e.total} tỉnh thành! Còn ${e.total - e.n} nữa thôi, cùng thắp tiếp nào!`, false); }
        break;
      case 'hot':
        feedAdd(null, `🔥 <b>${esc(P)}</b> đang cực hot · ×2 điểm ${e.sec}s`);
        say(`${P} đang cực hot! Nhân đôi điểm trong ${e.sec} giây!`, false, 'hot', 12000);
        break;
      case 'lucky':
        hit(e.prov, true);
        banner('Tỉnh may mắn', `⭐ ${esc(P)} ×2`, `Nhân đôi điểm trong <b>${e.sec} giây</b>`, 3500);
        say(`Tỉnh may mắn là ${P}! Nhân đôi điểm trong ${e.sec} giây, người ${P} đâu rồi!`, true);
        break;
      case 'battleStart':
        banner('Đại chiến', `${esc(pname(e.a))} ⚔️ ${esc(pname(e.b))}`, `<b>${e.sec} giây</b> · bình luận & tặng quà để quê mình thắng`, 4500);
        say(`Đại chiến bắt đầu! ${pname(e.a)} đối đầu ${pname(e.b)} trong ${e.sec} giây! Bình luận và tặng quà để quê mình chiến thắng!`, true);
        sfx.fanfare();
        break;
      case 'battleEnd':
        if (e.win) { celebrate(3); banner('Kết quả đại chiến', `🏆 ${esc(pname(e.win))}`, `${e.sa} – ${e.sb} · thưởng <b>+${e.bonus}</b> điểm`, 5000); say(`${pname(e.win)} chiến thắng đại chiến với tỉ số ${Math.max(e.sa, e.sb)} ${Math.min(e.sa, e.sb)}, thưởng ${e.bonus} điểm!`, true); }
        else { banner('Kết quả đại chiến', 'Hòa!', `${e.sa} – ${e.sb}`, 3500); say('Đại chiến kết thúc với tỉ số hòa!', true); }
        break;
      case 'quizStart':
        banner('Đố vui quê hương', '❓', `${esc(e.q)}<br><span style="font-size:24px">Gõ đúng tên tỉnh mới (tên cũ đã gộp không tính) · <b>+${e.pts}</b> điểm cho <b>quê của bạn</b></span>`, 5500);
        say(`Đố vui quê hương! ${e.q} Gõ đúng tên tỉnh mới, tên tỉnh cũ đã gộp không được tính. Ai trả lời đúng đầu tiên được ${e.pts} điểm cộng cho quê của chính mình!`, true);
        break;
      case 'quizWin':
        if (e.prov) {
          comet([W / 2, 760], e.prov, T.accent2, true);
          banner('Chính xác', `${esc(u.name)}`, `Đáp án: <b>${esc(pname(e.answer))}</b> · +${e.pts} điểm cho quê <b>${esc(P)}</b>`, 4500, [u]);
          say(`Chính xác! ${nm(u)} trả lời đúng là ${pname(e.answer)}, cộng ${e.pts} điểm cho quê ${P} của bạn ấy!`, true);
        } else {
          banner('Chính xác', `${esc(u.name)}`, `Đáp án: <b>${esc(pname(e.answer))}</b> · ${e.pts} điểm đang chờ — bình luận tên quê để nhận`, 5000, [u]);
          say(`Chính xác! ${nm(u)} trả lời đúng là ${pname(e.answer)}. Bình luận tên quê của bạn để nhận ${e.pts} điểm nhé!`, true);
        }
        break;
      case 'quizEnd':
        banner('Hết giờ', `Đáp án: ${esc(pname(e.answer))}`, '', 3500);
        say(`Hết giờ! Đáp án là ${pname(e.answer)}.`, false);
        break;
      case 'roundEnd': {
        const w = e.top[0];
        celebrate(3);
        banner(`Kết thúc vòng ${e.n}`, `🏆 ${esc(pname(w.id))}`, e.top.map((x, i) => `${i + 1}. ${esc(pname(x.id))} <b>${fmt(x.v)}</b>`).join(' · '), 5500);
        say(`Hết vòng ${e.n}! ${pname(w.id)} về nhất với ${w.v} điểm! Vòng mới bắt đầu, cùng đua tiếp nào!`, true);
        break; }
      case 'streak':
        feedAdd(u, `📅 <b>${esc(u.name)}</b> điểm danh ${e.streak} ngày <span class="pt">+${e.pts}</span>`);
        say(`${nm(u)} điểm danh ${e.streak} ngày liên tiếp, thưởng ${e.pts} điểm cho ${P}!`, false, 'streak', 6000);
        break;
      case 'owner':
        feedAdd(u, `👑 <b>${esc(u.name)}</b> thành Chủ tỉnh ${esc(P)}`);
        banner('Chủ tỉnh mới', `👑 ${esc(u.name)}`, `Chủ tỉnh <b>${esc(P)}</b> · ${fmt(e.coins)} xu`, 3500, [u]);
        say(`${nm(u)} trở thành chủ tỉnh ${P}!`, false, 'owner', 5000);
        break;
      case 'wave':
        if (e.prov) { comet([W / 2, 290], e.prov, '#ff5a8a', true); say(`Sóng tim thắp sáng ${P}! Thả tim tiếp nào!`, false, 'wave', 10000); }
        else { celebrate(2); say('Sóng tim! Cộng điểm cho tất cả các tỉnh đã sáng!', false, 'wave', 10000); }
        feedAdd(null, `❤️ Sóng tim ${fmt(e.likes)} lượt ${e.prov ? 'thắp sáng <b>' + esc(P) + '</b>' : 'cộng điểm cả nước'}`);
        break;
      case 'follow': case 'share':
        if (e.prov) comet(FEED_ORIGIN, e.prov, T.accent2, false);
        feedAdd(u, `${e.type === 'follow' ? '➕ theo dõi' : '🔗 chia sẻ'} · <b>${esc(u.name)}</b> <span class="pt">+${e.pts}</span>`);
        say(`Cảm ơn ${nm(u)} đã ${e.type === 'follow' ? 'theo dõi' : 'chia sẻ'}, cộng ${e.pts} điểm cho ${P}!`, false, e.type, 5000);
        break;
      case 'dim':
        feedAdd(null, `⚠️ Đèn <b>${esc(P)}</b> sắp tắt!`);
        say(`Đèn ${P} sắp tắt rồi! Người ${P} đâu, bình luận giữ lửa cho quê mình nào!`, false, 'dim', 9000);
        break;
      case 'off':
        feedAdd(null, `💨 Đèn <b>${esc(P)}</b> đã tắt`);
        say(`Ôi, đèn ${P} đã tắt mất rồi! Ai thắp lại cho ${P} đây?`, false, 'off', 12000);
        break;
      case 'seasonEnd': {
        celebrate(Math.min(10, e.delay || 10));
        const w = e.top && e.top[0];
        banner(`Hoàn thành mùa ${e.season}`, '🇻🇳 SÁNG ĐỦ 34/34!', `${w ? `Quê dẫn đầu: <b>${esc(pname(w.id))}</b> · ` : ''}mùa mới sau <b>${e.delay}</b> giây`, 8000);
        say(`Tuyệt vời! Cả nước đã sáng đủ 34 tỉnh thành, hoàn thành mùa ${e.season}!${w ? ' Quê dẫn đầu là ' + pname(w.id) + '.' : ''} Mùa mới sẽ bắt đầu sau ${e.delay} giây, chuẩn bị đua lại từ đầu nhé!`, true);
        break; }
      case 'seasonStart':
        fxList.length = 0; for (const k in flash) delete flash[k];
        banner(`Mùa ${e.season}`, 'Bắt đầu thắp lại!', 'Bản đồ đã tắt hết — bình luận tên quê để thắp đèn đầu tiên', 5000);
        say(`Mùa ${e.season} bắt đầu! Bản đồ đã tắt hết, ai sẽ là người thắp đèn đầu tiên? Bình luận tên quê ngay nào!`, true);
        sfx.fanfare();
        break;
      case 'dropStart':
        lixi(e.sec);
        banner('Lộc rơi', `🧧 Gõ “${esc(e.word)}”`, `trong <b>${e.sec} giây</b> · ${e.winners} người may mắn nhận điểm cho quê`, 4500);
        say(`Lộc rơi rồi! Gõ chữ ${e.word} trong ${e.sec} giây, ${e.winners} người may mắn sẽ nhận điểm cho quê mình!`, true);
        break;
      case 'dropEnd':
        if (e.winners.length) {
          for (const w of e.winners) if (w.prov) comet([W / 2, 300], w.prov, '#ff3d3d', true);
          banner('Trúng lộc', '🧧 ' + e.winners.map(w => esc(w.user.name)).join(', '), e.winners.map(w => `<b>+${w.pts}</b> ${esc(w.prov ? pshort(w.prov) : 'chờ nhận')}`).join(' · '), 5500, e.winners.map(w => w.user));
          say(`Chúc mừng ${e.winners.map(w => nm(w.user)).join(', ')} đã trúng lộc! Lần sau nhớ gõ ${e.word} thật nhanh nhé!`, true);
        } else { banner('Lộc rơi', 'Không ai nhận lộc', 'Lần sau gõ nhanh hơn nhé!', 3000); }
        break;
      case 'levelUp':
        feedAdd(u, `⬆️ <b>${esc(u.name)}</b> lên <span class="pt">cấp ${e.level}</span>`);
        if (e.level >= 3) say(`${nm(u)} đã lên cấp ${e.level}!`, false, 'lv', 8000);
        break;
      case 'theme': {
        const th = THEMES[e.theme]; flashScreen();
        if (th) feedAdd(null, `🎨 Đổi giao diện: <b>${esc(th.name)}</b>`);
        break; }
      case 'sfxTest': { const ac = audioCtx(); if (ac) ac.resume(); [1, 10, 199, 500].forEach((v, i) => setTimeout(() => { ptGate = 0; pointSound(v); }, i * 1400)); break; }
      case 'summary': showSummary(e); break;
      case 'reset': fxList.length = 0; for (const k in flash) delete flash[k]; feed.splice(0).forEach(x => x.remove()); banner('Phiên mới', 'Bắt đầu thắp đèn!', 'Bình luận tên tỉnh, thành quê bạn', 3500); break;
      case 'say': say(e.text, true); break;
    }
  }

  function showSummary(e) {
    const el = $('summary');
    const prov = (e.topProv || []).map((x, i) => `<div><div style="font-size:54px">${['🥇', '🥈', '🥉'][i]}</div>${esc(pname(x.id))}<br><span style="color:var(--accent)">${fmt(x.v)} điểm</span></div>`).join('');
    const giv = (e.topGivers || []).map(u => `<div>${avatarHTML(u)}${esc(u.name)}<br><span style="color:var(--accent)">${fmt(u.coins)} xu</span></div>`).join('');
    el.innerHTML = `<div class="card"><h2>TỔNG KẾT PHIÊN LIVE</h2><div style="font-size:24px;color:var(--sub);margin-top:6px">${e.mins} phút · cảm ơn mọi người đã thắp đèn 🇻🇳</div>
      <div class="grid"><div class="st"><b>${e.seasons ? e.seasons + ' mùa' : e.lit + '/' + e.total}</b><span>${e.seasons ? 'sáng đủ 34 tỉnh' : 'tỉnh đã sáng'}</span></div><div class="st"><b>${fmt(e.people)}</b><span>người thắp đèn</span></div><div class="st"><b>${fmt(e.comments)}</b><span>bình luận</span></div>
      <div class="st"><b>${fmt(e.likes)}</b><span>lượt tim</span></div><div class="st"><b>${fmt(e.coins)}</b><span>xu quà tặng</span></div><div class="st"><b>${fmt(e.returning)}</b><span>người quen quay lại</span></div></div>
      ${prov ? `<h3>Quê dẫn đầu</h3><div class="tops">${prov}</div>` : ''}${giv ? `<h3>Vinh danh người thắp đèn</h3><div class="tops">${giv}</div>` : ''}</div>`;
    el.style.display = 'flex'; celebrate(4);
    say(`Tổng kết phiên LIVE: đã sáng ${e.lit} trên ${e.total} tỉnh thành, ${e.people} người cùng thắp đèn. Cảm ơn tất cả mọi người, hẹn gặp lại!`, true);
    clearTimeout(showSummary.t); showSummary.t = setTimeout(() => { el.style.display = 'none'; }, 20000);
  }

  // ---------- âm thanh: nhạc nền + tiếng hiệu ứng ----------
  let AC = null;
  const audioCtx = () => { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return AC; };
  function tone(f, dur, type, vol, when) {
    const ac = audioCtx(); if (!ac || ac.state !== 'running') return;
    const v = vol || 0.08; const t0 = ac.currentTime + (when || 0);
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(sfxBus()); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  // kênh âm thanh hiệu ứng: âm lượng riêng + nén nhẹ cho to, rõ mà không rè
  let BUS = null;
  function sfxBus() {
    const ac = audioCtx();
    if (!BUS) { const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; BUS = ac.createGain(); BUS.connect(comp).connect(ac.destination); }
    BUS.gain.value = CFG.sfxOn === false ? 0 : Math.max(0, Math.min(1.5, CFG.sfxVol == null ? 0.9 : +CFG.sfxVol)) * 1.6;
    return BUS;
  }
  function sweep(f0, f1, dur, type, vol, when) {
    const ac = audioCtx(); if (!ac || ac.state !== 'running') return;
    const t0 = ac.currentTime + (when || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(sfxBus()); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  let NOISE = null;
  function noise(dur, vol, hp, when) {   // tiếng xèo / chập chõa
    const ac = audioCtx(); if (!ac || ac.state !== 'running') return;
    if (!NOISE) { NOISE = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t0 = ac.currentTime + (when || 0), src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = NOISE; f.type = 'highpass'; f.frequency.value = hp || 5000;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(sfxBus()); src.start(t0); src.stop(t0 + dur + 0.05);
  }
  // âm thanh cộng điểm: càng nhiều điểm càng hoành tráng, cộng liên tục thì cao dần (combo)
  let combo = 0, comboAt = 0, ptGate = 0;
  function pointSound(pts) {
    const n = performance.now();
    if (n - ptGate < 70) return; ptGate = n;
    combo = n - comboAt < 2200 ? Math.min(14, combo + 1) : 0; comboAt = n;
    const k = Math.pow(2, combo / 12);   // mỗi lần combo lên nửa cung
    if (pts < 5) {   // ting ting
      tone(1175 * k, 0.1, 'triangle', 0.06); tone(1568 * k, 0.35, 'triangle', 0.06, 0.06); tone(3136 * k, 0.22, 'sine', 0.018, 0.06);
    } else if (pts < 100) {   // chuỗi xu rơi
      [1047, 1319, 1568, 2093].forEach((f, i) => tone(f * k, 0.18, 'triangle', 0.06, i * 0.06));
      tone(2637 * k, 0.4, 'sine', 0.03, 0.26); noise(0.25, 0.05, 7000, 0.24);
    } else {   // trống + kèn chiến thắng + lấp lánh
      sweep(160, 45, 0.35, 'sine', 0.35); noise(0.08, 0.12, 1500);
      [523, 659, 784, 1047].forEach((f, i) => { tone(f, 0.22, 'sawtooth', 0.035, 0.08 + i * 0.08); tone(f * 2, 0.22, 'triangle', 0.04, 0.08 + i * 0.08); });
      [1047, 1319, 1568].forEach(f => tone(f, 1.1, 'triangle', 0.045, 0.42));
      for (let i = 0; i < 8; i++) tone(2000 + Math.random() * 2500, 0.18, 'sine', 0.025, 0.45 + i * 0.07);
      noise(1.2, 0.07, 6000, 0.42);
      if (pts >= 500) { sweep(300, 1800, 0.6, 'sawtooth', 0.03, 0.9); [1568, 2093, 2637].forEach((f, i) => tone(f, 0.9, 'triangle', 0.04, 1.4 + i * 0.09)); sweep(140, 40, 0.4, 'sine', 0.35, 1.4); }
    }
  }
  const PENTA = [523, 587, 659, 784, 880, 1047, 1175];
  let sfxGate = 0;
  const sfx = {
    chime(big) { const n = performance.now(); if (n - sfxGate < 90) return; sfxGate = n; const f = PENTA[Math.floor(Math.random() * PENTA.length)]; tone(f, 0.6, 'sine', 0.07); tone(f * 2, 0.4, 'triangle', 0.025, 0.02); if (big) { tone(f * 1.5, 0.8, 'sine', 0.05, 0.12); } },
    whoosh() { const ac = audioCtx(); if (!ac || ac.state !== 'running' || lite()) return; const o = ac.createOscillator(), g = ac.createGain(); const t0 = ac.currentTime; o.type = 'sawtooth'; o.frequency.setValueAtTime(300, t0); o.frequency.exponentialRampToValueAtTime(1200, t0 + 0.5); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.012, t0 + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6); o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + 0.65); },
    boom() { tone(rnd(70, 110), 0.5, 'sine', 0.12); tone(rnd(900, 1400), 0.25, 'triangle', 0.02, 0.05); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, 'triangle', 0.06, i * 0.12)); tone(1047, 1.2, 'sine', 0.05, 0.5); },
  };
  const music = (() => {
    const el = new Audio(); el.preload = 'auto'; let list = [], idx = 0, vol = 0.35, padOn = false;
    el.onended = () => next();
    function next() { if (!list.length) { startPad(); return; } idx = (idx + 1) % list.length; el.src = '/music/' + encodeURIComponent(list[idx]); el.volume = vol; el.play().catch(needTap); }
    fetch('/api/music').then(r => r.json()).then(l => { list = l.sort(() => Math.random() - 0.5); idx = -1; if (vol > 0) next(); }).catch(() => {});
    // không có nhạc tải lên: tiếng đàn ngũ cung nhẹ nhàng
    function startPad() {
      if (padOn) return; padOn = true;
      const notes = [262, 294, 330, 392, 440, 523, 587, 659];
      const step = () => { if (vol > 0 && audioCtx() && AC.state === 'running') { tone(notes[Math.floor(Math.random() * notes.length)], 1.8, 'sine', 0.05 * vol); if (Math.random() < 0.3) tone(notes[Math.floor(Math.random() * 4)] / 2, 3, 'triangle', 0.04 * vol); } setTimeout(step, 520 + Math.random() * 380); };
      step();
    }
    return { setVol(v) { vol = Math.max(0, Math.min(1, +v || 0)); el.volume = vol; if (vol === 0) el.pause(); else if (list.length && el.paused && el.src) el.play().catch(needTap); else if (!list.length && audioCtx()) startPad(); } };
  })();
  function needTap() { if (!OBS) $('tap').style.display = 'flex'; }
  $('tap').onclick = () => { $('tap').style.display = 'none'; const ac = audioCtx(); if (ac) ac.resume(); music.setVol(CFG.musicOn ? +CFG.musicVol : 0); if (window.MC) MC.say(' ', false); };
  document.addEventListener('pointerdown', () => { const ac = audioCtx(); if (ac && ac.state !== 'running') ac.resume(); }, { once: false });
  setTimeout(() => { const ac = audioCtx(); if (ac && ac.state !== 'running') { ac.resume().catch(() => {}); setTimeout(() => { if (AC.state !== 'running') needTap(); }, 600); } }, 1200);

  // ---------- vòng lặp vẽ ----------
  let last = performance.now(), frameN = 0;
  function frame(n) {
    const dt = Math.min(0.05, (n - last) / 1000); last = n; frameN++;
    if (lite() && frameN % 2) { requestAnimationFrame(frame); return; }   // máy yếu: 30 hình/giây
    const t = n / 1000;
    if (!bgCanvas) setTheme(themeKey || 'dem-sao');
    drawBg(t, lite() ? dt * 2 : dt);
    stepCam(dt);
    ctx.save();
    if (Math.abs(CAM.z - 1) > 0.002 || Math.abs(CAM.x - VC[0]) > 0.5) { ctx.translate(VC[0], VC[1]); ctx.scale(CAM.z, CAM.z); ctx.translate(-CAM.x, -CAM.y); }
    drawMap(t);
    drawFx(lite() ? dt * 2 : dt);
    ctx.restore();
    stepTweens();
    requestAnimationFrame(frame);
  }
  setTheme('dem-sao');
  requestAnimationFrame(frame);
})();
