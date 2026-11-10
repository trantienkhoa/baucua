// Màn hình LIVE cho 3 game quán: ?v=nhau | massage | cafe   (1080 × 1920)
(function () {
  'use strict';
  const V = (new URLSearchParams(location.search).get('v') || 'nhau').replace(/[^a-z]/g, '');
  const OBS = /[?&]obs=1/.test(location.search);
  const W = 1080, H = 1920, SCN = { y0: 280, y1: 1425 };
  const $ = id => document.getElementById(id);
  const stage = $('stage'), cv = $('cv'), ctx = cv.getContext('2d');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const fmt = n => Math.round(n || 0).toLocaleString('vi-VN');
  function fit() { const s = Math.min(innerWidth / W, innerHeight / H); stage.style.transform = `translate(${-W * s / 2}px,${-H * s / 2}px) scale(${s})`; }
  addEventListener('resize', fit); fit();

  // ---------- cấu hình từng quán ----------
  const SKIN = {
    nhau: {
      sign: 'QUÁN NHẬU CHUNG', acc: '#ffb020', acc2: '#ff5a3c', sub: 'Bình luận để <b>vào quán</b> · gõ <b>dzô</b> để cụng ly cả quán',
      panel: 'rgba(40,16,6,.86)', pose: 'sit',
      seats: (() => { const T = [[280, 640], [800, 640], [280, 1120], [800, 1120]], O = [[-120, -80], [120, -80], [-140, 70], [140, 70]], out = []; for (const t of T) for (const o of O) out.push([t[0] + o[0], t[1] + o[1]]); return out; })(),
      tables: [[280, 640], [800, 640], [280, 1120], [800, 1120]],
      mc: {
        enter: (n, s) => `Chào ${n} vào quán! Mời ngồi bàn số ${Math.floor(s / 4) + 1}, nhậu cho vui nhé!`,
        ret: (n, t, k) => `${t} ${n} lại ghé quán, lần thứ ${k} rồi đó! Chủ quán chào nồng nhiệt!`,
        gift: (n, it, who) => `Cảm ơn ${n} đã gọi ${it}${who === 'table' ? ' cho cả bàn' : who === 'all' ? ' mời cả quán' : ''}! Một hai ba, dzô!`,
        combo: ['Một hai ba, dzô!', 'Cả quán dzô! Trăm phần trăm nào!', 'Dzô dzô dzô! Quán chưa bao giờ vui thế này!'],
        full: n => `${n} say mềm rồi, cho ngủ một giấc trên bàn nhé!`,
        wake: n => `${n} tỉnh rồi, nhậu tiếp thôi!`,
        happy: s => `Giờ vàng bắt đầu! Trong ${s} giây, gọi món nào cũng được nhân đôi! Dzô nào!`,
        likeGoal: it => `Cả phòng thả tim quá trời! Quán mời mỗi bàn một ${it}!`,
        idle: ['Ai chưa vào quán thì bình luận một câu là có ghế ngồi liền nhé!', 'Cả quán gõ dzô thật nhiều để cụng ly nào!', 'Thả tim cho đủ mục tiêu là quán mời một vòng!', 'Gọi món để thành đại gia đêm nay nhé!'],
        door: n => `Chào ${n}, bình luận một câu để vào quán ngồi nhé!`,
      },
    },
    massage: {
      sign: 'TIỆM MASSAGE THƯ GIÃN', acc: '#7fe0b8', acc2: '#ffd9a0', sub: 'Bình luận để <b>vào giường</b> · gõ <b>đã quá</b> để cả tiệm thư giãn',
      panel: 'rgba(14,34,28,.86)', pose: 'lie',
      seats: (() => { const out = []; for (const y of [520, 745, 970, 1195]) for (const x of [285, 795]) out.push([x, y]); return out; })(),
      mc: {
        enter: (n, s) => `Kính chào quý khách ${n}, mời nằm giường số ${s + 1} thư giãn ạ!`,
        ret: (n, t, k) => `${t} ${n} quay lại tiệm lần thứ ${k}, tiệm xin chào quý khách thân thiết!`,
        gift: (n, it, who) => `Cảm ơn ${n} đã đặt ${it}${who === 'all' ? ' cho cả tiệm' : ''}! Chúc quý khách thư giãn thật sâu!`,
        combo: ['Cả tiệm cùng thư giãn nào!', 'Đã quá! Cả tiệm thư giãn tuyệt đối!', 'Thư giãn tột đỉnh! Ai cũng muốn ngủ luôn rồi!'],
        full: n => `${n} thư giãn quá, ngủ ngon lành luôn rồi. Nhẹ nhàng thôi nhé!`,
        wake: n => `${n} đã tỉnh giấc, sảng khoái ghê!`,
        happy: s => `Giờ thư giãn bắt đầu! Trong ${s} giây, liệu trình nào cũng được nhân đôi!`,
        likeGoal: it => `Cảm ơn cả phòng thả tim! Tiệm tặng mỗi giường một ${it}!`,
        idle: ['Ai mỏi vai mỏi lưng thì bình luận một câu để vào giường nhé!', 'Cả tiệm gõ đã quá để cùng thư giãn nào!', 'Thả tim đủ mục tiêu là tiệm tặng liệu trình miễn phí!', 'Hít thở sâu, thả lỏng vai, thư giãn cùng tiệm nhé!'],
        door: n => `Kính chào ${n}, bình luận một câu để vào giường thư giãn nhé!`,
      },
    },
    cafe: {
      sign: 'TIỆM CÀ PHÊ CHILL', acc: '#ffb98a', acc2: '#9ad7ff', sub: 'Bình luận để <b>vào quán</b> · gõ <b>chill</b> · <b>mh: lời nhắn</b> + quà để dán lên bảng',
      panel: 'rgba(22,18,34,.86)', pose: 'sit',
      seats: (() => { const out = []; for (const y of [760, 1000, 1240]) for (const x of [300, 780]) out.push([x - 125, y], [x + 125, y]); return out; })(),
      tables: (() => { const out = []; for (const y of [760, 1000, 1240]) for (const x of [300, 780]) out.push([x, y]); return out; })(),
      mc: {
        enter: n => `Chào ${n}, ghé quán ngồi chill nhé!`,
        ret: (n, t, k) => `${t} ${n} lại ghé quán lần thứ ${k}, chỗ quen vẫn chờ bạn đó!`,
        gift: (n, it, who) => `Cảm ơn ${n} đã gọi ${it}${who === 'all' ? ' mời cả quán' : who === 'table' ? ' cho cả bàn' : ''}! Chill nào!`,
        combo: ['Cả quán cùng chill nào!', 'Chill quá trời! Cả quán thả hồn theo nhạc!', 'Chill tột độ! Đây là quán chill nhất TikTok!'],
        full: n => `${n} chill quá nên ngủ gật luôn rồi!`,
        wake: n => `${n} tỉnh rồi, gọi thêm ly nữa nhé!`,
        happy: s => `Giờ chill bắt đầu! Trong ${s} giây, đồ uống nào cũng được nhân đôi!`,
        likeGoal: it => `Cảm ơn cả phòng thả tim! Quán mời mỗi người một ${it}!`,
        idle: ['Ai muốn ngồi chill thì bình luận một câu là có ghế nhé!', 'Gõ chill thật nhiều để cả quán cùng thư thái nào!', 'Bình luận mh, rồi lời nhắn, kèm một món quà để dán lời nhắn lên bảng nhé!', 'Mưa ngoài kia, trong này ấm áp, cùng chill nhé!'],
        door: n => `Chào ${n}, bình luận một câu để vào quán ngồi chill nhé!`,
      },
    },
  };
  const K = SKIN[V] || SKIN.nhau;
  {
    const r = document.documentElement.style, hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
    r.setProperty('--acc', K.acc); r.setProperty('--acc2', K.acc2); r.setProperty('--panel', K.panel); r.setProperty('--border', hexA(K.acc, 0.55)); r.setProperty('--accA', hexA(K.acc, 0.35));
    $('signT').textContent = K.sign; $('sub').innerHTML = K.sub; document.title = K.sign;
  }

  // ---------- trạng thái ----------
  let S = null, CFG = {}, clockOff = 0;
  const now = () => Date.now() + clockOff;
  const socket = io();
  socket.on('connect', () => socket.emit('vn:hello', { v: V, role: 'screen' }));
  socket.on('vn:cfg', m => { if (m && m.v === V) applyCfg(m.cfg); });
  socket.on('vn:state', st => { if (!st || st.v !== V) return; clockOff = st.now - Date.now(); S = st; applyCfg(st.cfg); onState(); });
  socket.on('vn:fx', e => { if (e && e.v === V) onFx(e); });
  function applyCfg(c) {
    if (!c) return; CFG = c;
    if (window.MC) { MC.enabled = !!c.mcOn; MC.volume = +c.mcVol || 1; MC.rate = +c.mcRate || 1; MC.setPref(c.mcVoice || ''); }
    music.setVol(c.musicOn ? +c.musicVol : 0);
  }
  const lite = () => !!CFG.lite;

  // ---------- ảnh đại diện ----------
  const avCache = new Map();
  function avImg(url) {
    if (!url) return null; let e = avCache.get(url);
    if (!e) { e = { img: new Image(), ok: false }; e.img.onload = () => { e.ok = true; }; e.img.src = /^https?:/i.test(url) ? '/api/img?u=' + encodeURIComponent(url) : url; avCache.set(url, e); if (avCache.size > 300) avCache.delete(avCache.keys().next().value); }
    return e.ok ? e.img : null;
  }
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  const colorOf = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return COLORS[Math.abs(h) % COLORS.length]; };
  const initial = n => ([...String(n || '?').trim()][0] || '?').toUpperCase();
  function avatarHTML(u) {
    const st = u && u.avatar ? `background-image:url('${/^https?:/i.test(u.avatar) ? '/api/img?u=' + encodeURIComponent(u.avatar) : esc(u.avatar)}')` : `background-color:${colorOf(u ? u.name : '?')}`;
    return `<div class="av" style="${st}">${u && u.avatar ? '' : esc(initial(u ? u.name : '?'))}</div>`;
  }
  function headCircle(x, y, r, u, ring) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r + 3, 0, 7); ctx.fillStyle = ring || K.acc; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
    const im = avImg(u.avatar);
    if (im) ctx.drawImage(im, x - r, y - r, r * 2, r * 2);
    else { ctx.fillStyle = colorOf(u.name); ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.fillStyle = '#fff'; ctx.font = `900 ${r}px ${getComputedStyle(stage).fontFamily}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(initial(u.name), x, y + 2); }
    ctx.restore();
  }
  const FONT = "'Be Vietnam Pro','Segoe UI',system-ui,sans-serif";

  // ---------- nền tĩnh từng quán (vẽ sẵn) ----------
  const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
  function buildBg() {
    const g = bg.getContext('2d');
    if (V === 'nhau') {
      let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#120a1e'); gr.addColorStop(0.25, '#2a1410'); gr.addColorStop(1, '#1a0e08'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // tường gạch
      for (let y = 280; y < 520; y += 26) for (let x = (y / 26 % 2) * 40 - 40; x < W; x += 80) { g.fillStyle = `rgb(${110 + Math.random() * 30},${48 + Math.random() * 15},${32 + Math.random() * 10})`; g.fillRect(x + 2, y + 2, 76, 22); }
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 280, W, 240);
      // nền xi măng
      gr = g.createLinearGradient(0, 520, 0, SCN.y1); gr.addColorStop(0, '#3a2a20'); gr.addColorStop(1, '#5a4434'); g.fillStyle = gr; g.fillRect(0, 520, W, SCN.y1 - 520);
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; for (let y = 560; y < SCN.y1; y += 70) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      // két bia góc
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const x = 900 + j * 80, y = 440 - i * 46; g.fillStyle = '#1f6b2e'; g.fillRect(x, y, 74, 44); g.fillStyle = '#2d8a3e'; g.fillRect(x + 4, y + 4, 66, 10); }
      g.fillStyle = '#ffcc33'; g.font = `900 22px ${FONT}`; g.fillText('BIA', 920, 470);
      // bàn nhựa
      for (const [x, y] of K.tables) {
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x, y + 40, 190, 50, 0, 0, 7); g.fill();
        g.fillStyle = '#8a8f99'; g.fillRect(x - 150, y + 10, 10, 60); g.fillRect(x + 140, y + 10, 10, 60);
        const c = (x + y) % 3 ? '#d93b3b' : '#2f6fd6'; g.fillStyle = c; g.beginPath(); g.ellipse(x, y, 175, 62, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(x - 30, y - 18, 110, 22, 0, 0, 7); g.fill();
      }
    } else if (V === 'massage') {
      let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0e1f1a'); gr.addColorStop(0.3, '#3a2a1c'); gr.addColorStop(1, '#2a1e14'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // tường gỗ
      for (let x = 0; x < W; x += 60) { g.fillStyle = `rgb(${92 + Math.random() * 18},${62 + Math.random() * 12},${38 + Math.random() * 8})`; g.fillRect(x, 280, 58, 140); }
      // tre
      for (const bx of [40, 110, 970, 1035]) { g.fillStyle = '#5f9a4a'; g.fillRect(bx, 280, 18, 160); g.fillStyle = '#3d6e2e'; for (let y = 300; y < 440; y += 34) g.fillRect(bx - 2, y, 22, 4); }
      // sàn chiếu
      gr = g.createLinearGradient(0, 420, 0, SCN.y1); gr.addColorStop(0, '#6e5a36'); gr.addColorStop(1, '#8a7246'); g.fillStyle = gr; g.fillRect(0, 420, W, SCN.y1 - 420);
      g.strokeStyle = 'rgba(60,40,10,.25)'; for (let x = 0; x < W; x += 180) { g.beginPath(); g.moveTo(x, 420); g.lineTo(x, SCN.y1); g.stroke(); }
      for (let y = 420; y < SCN.y1; y += 6) { g.globalAlpha = 0.06; g.fillStyle = '#000'; g.fillRect(0, y, W, 1); } g.globalAlpha = 1;
      // giường
      for (const [x, y] of K.seats) {
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - 200, y + 70, 400, 18);
        g.fillStyle = '#5a3a20'; g.fillRect(x - 195, y - 50, 390, 120);
        g.fillStyle = '#f3ead8'; g.fillRect(x - 185, y - 44, 370, 100);
        g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x - 140, y + 4, 42, 30, 0, 0, 7); g.fill();
      }
    } else {
      let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0f0c1e'); gr.addColorStop(0.3, '#3a2a3a'); gr.addColorStop(1, '#2a1f24'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // tường ấm
      g.fillStyle = '#4a3436'; g.fillRect(0, 280, W, 330);
      // cửa sổ lớn (bên trái)
      g.fillStyle = '#0a1028'; g.fillRect(30, 300, 620, 290);
      for (let i = 0; i < 26; i++) { const bx = 40 + i * 24, bh = rnd(60, 200); g.fillStyle = '#141c3c'; g.fillRect(bx, 590 - bh, 22, bh); for (let k = 0; k < 8; k++) if (Math.random() < 0.4) { g.fillStyle = Math.random() < 0.5 ? '#ffd48a' : '#9ad7ff'; g.fillRect(bx + 4 + (k % 2) * 9, 590 - bh + 8 + Math.floor(k / 2) * 18, 5, 7); } }
      g.strokeStyle = '#2a1a14'; g.lineWidth = 12; g.strokeRect(30, 300, 620, 290); g.lineWidth = 8; g.beginPath(); g.moveTo(340, 300); g.lineTo(340, 590); g.moveTo(30, 445); g.lineTo(650, 445); g.stroke();
      // bảng lời nhắn (bên phải)
      g.fillStyle = '#7a5434'; g.fillRect(680, 300, 370, 290); g.fillStyle = '#b08a5a'; g.fillRect(692, 312, 346, 266);
      g.fillStyle = '#3a2410'; g.font = `900 22px ${FONT}`; g.textAlign = 'center'; g.fillText('BẢNG LỜI NHẮN', 865, 340); g.textAlign = 'left';
      // sàn gỗ
      gr = g.createLinearGradient(0, 610, 0, SCN.y1); gr.addColorStop(0, '#5a3a28'); gr.addColorStop(1, '#7a5238'); g.fillStyle = gr; g.fillRect(0, 610, W, SCN.y1 - 610);
      g.strokeStyle = 'rgba(0,0,0,.2)'; for (let y = 640; y < SCN.y1; y += 46) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      // cây xanh
      for (const px of [20, 1010]) { g.fillStyle = '#6a4a2a'; g.fillRect(px, 1310, 52, 70); g.fillStyle = '#3f8f4a'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(px + 26 + rnd(-30, 30), 1290 - i * 18, 26, 12, rnd(-1, 1), 0, 7); g.fill(); } }
      // bàn tròn
      for (const [x, y] of K.tables) {
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x, y + 50, 90, 22, 0, 0, 7); g.fill();
        g.fillStyle = '#2a1a12'; g.fillRect(x - 6, y, 12, 50);
        g.fillStyle = '#c89a6a'; g.beginPath(); g.ellipse(x, y, 82, 32, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.ellipse(x - 14, y - 8, 46, 10, 0, 0, 7); g.fill();
      }
    }
    // làm tối mép trên dưới cho chữ dễ đọc
    let v = g.createLinearGradient(0, 0, 0, 300); v.addColorStop(0, 'rgba(0,0,0,.55)'); v.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = v; g.fillRect(0, 0, W, 300);
  }
  buildBg();

  // ---------- nền động ----------
  const amb = [];
  for (let i = 0; i < 60; i++) amb.push({ x: rnd(0, W), y: rnd(0, H), s: rnd(0.5, 1.5), p: rnd(0, 6.28), v: rnd(0.3, 1) });
  function drawAmbient(t, dt) {
    if (V === 'nhau') {   // dây đèn vàng
      for (let row = 0; row < 2; row++) {
        const y0 = 300 + row * 70; ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath();
        for (let x = 0; x <= W; x += 20) { const y = y0 + Math.sin(x / W * Math.PI) * 40; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
        for (let x = 30; x < W; x += 60) { const y = y0 + Math.sin(x / W * Math.PI) * 40 + 10, on = 0.75 + 0.25 * Math.sin(t * 3 + x); ctx.globalAlpha = on; ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); if (!lite()) { const gg = ctx.createRadialGradient(x, y, 2, x, y, 30); gg.addColorStop(0, 'rgba(255,200,90,.45)'); gg.addColorStop(1, 'rgba(255,200,90,0)'); ctx.fillStyle = gg; ctx.fillRect(x - 30, y - 30, 60, 60); } }
        ctx.globalAlpha = 1;
      }
      // khói nướng góc trái
      for (const s of amb.slice(0, lite() ? 8 : 20)) { s.y -= dt * 30 * s.v; if (s.y < 280) { s.y = 560; s.x = rnd(20, 160); } ctx.globalAlpha = 0.08 * (s.y - 280) / 280; ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(s.x + Math.sin(t + s.p) * 10, s.y, 18 * s.s, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    } else if (V === 'massage') {
      for (let i = 0; i < 6; i++) {   // nến
        const x = 170 + i * 150, y = 438; ctx.fillStyle = '#f5ead0'; ctx.fillRect(x - 8, y - 22, 16, 22);
        const f = 0.8 + 0.2 * Math.sin(t * 9 + i); ctx.fillStyle = '#ffb34d'; ctx.beginPath(); ctx.ellipse(x, y - 30, 5 * f, 10 * f, 0, 0, 7); ctx.fill();
        if (!lite()) { const gg = ctx.createRadialGradient(x, y - 30, 2, x, y - 30, 50); gg.addColorStop(0, 'rgba(255,190,90,.35)'); gg.addColorStop(1, 'rgba(255,190,90,0)'); ctx.fillStyle = gg; ctx.fillRect(x - 50, y - 80, 100, 100); }
      }
      for (const s of amb.slice(0, lite() ? 10 : 28)) {   // lá trôi nhẹ
        s.y += dt * 12 * s.v; s.x += Math.sin(t * 0.6 + s.p) * 0.4; if (s.y > SCN.y1) { s.y = 300; s.x = rnd(0, W); }
        ctx.save(); ctx.globalAlpha = 0.5; ctx.translate(s.x, s.y); ctx.rotate(t * s.v + s.p); ctx.fillStyle = s.v > 0.6 ? '#8ccf7a' : '#ffd0e0'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 4, 0, 0, 7); ctx.fill(); ctx.restore();
      }
    } else {
      const rain = S && S.rain;
      ctx.save(); ctx.beginPath(); ctx.rect(36, 306, 608, 278); ctx.clip();
      ctx.strokeStyle = 'rgba(160,200,255,.45)'; ctx.lineWidth = 1.5;
      const n = rain ? (lite() ? 50 : 140) : (lite() ? 12 : 30);
      for (let i = 0; i < n; i++) { const x = (i * 97 + t * 260 * (1 + (i % 3) * 0.3)) % 680 + 10, y = (i * 53 + t * 700 * (1 + (i % 5) * 0.2)) % 320 + 290; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 16); ctx.stroke(); }
      if (rain) { ctx.fillStyle = 'rgba(120,160,220,.08)'; ctx.fillRect(36, 306, 608, 278); }
      ctx.restore();
      for (let i = 0; i < 4; i++) {   // đèn treo
        const x = 180 + i * 240, y = 640; ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 600); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.moveTo(x - 26, y + 22); ctx.lineTo(x + 26, y + 22); ctx.lineTo(x + 12, y); ctx.lineTo(x - 12, y); ctx.fill();
        if (!lite()) { const gg = ctx.createRadialGradient(x, y + 30, 4, x, y + 60, 200); gg.addColorStop(0, 'rgba(255,200,140,.35)'); gg.addColorStop(1, 'rgba(255,200,140,0)'); ctx.fillStyle = gg; ctx.fillRect(x - 200, y, 400, 300); }
        ctx.fillStyle = '#ffe2b0'; ctx.beginPath(); ctx.arc(x, y + 24, 7, 0, 7); ctx.fill();
      }
      drawNotes(t);
    }
  }
  function drawNotes(t) {
    const notes = (S && S.notes) || [], cols = ['#fff59a', '#ffd0e0', '#c8f0ff', '#d6ffc8'];
    notes.slice(0, 6).forEach((n, i) => {
      const x = 705 + (i % 2) * 168, y = 352 + Math.floor(i / 2) * 76;
      ctx.save(); ctx.translate(x + 75, y + 34); ctx.rotate(Math.sin(i * 7 + t * 0.5) * 0.04 + (i % 2 ? 0.03 : -0.03));
      ctx.fillStyle = cols[i % 4]; ctx.fillRect(-77, -34, 154, 68); ctx.fillStyle = '#d93b3b'; ctx.beginPath(); ctx.arc(0, -30, 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#3a2410'; ctx.font = `800 13px ${FONT}`; ctx.textAlign = 'left';
      wrap(n.text, 140).slice(0, 3).forEach((l, k) => ctx.fillText(l, -70, -12 + k * 16));
      ctx.font = `700 11px ${FONT}`; ctx.fillStyle = '#7a4a20'; ctx.fillText('— ' + n.user.name.slice(0, 18), -70, 30);
      ctx.restore();
    });
  }
  function wrap(text, w) { const words = String(text).split(/\s+/), out = []; let line = ''; for (const wd of words) { const tst = line ? line + ' ' + wd : wd; if (ctx.measureText(tst).width > w && line) { out.push(line); line = wd; } else line = tst; } if (line) out.push(line); return out; }

  // ---------- khách ----------
  const act = {};   // seat -> { icon, t, kind }
  const enterAt = {};
  function drawGuest(i, u, t) {
    const [x0, y0] = K.seats[i]; const sleep = u.sleep, ea = enterAt[i] ? Math.min(1, (performance.now() - enterAt[i]) / 600) : 1;
    const col = COLORS[u.color % 8];
    const bob = sleep ? 0 : Math.sin(t * 2 + i) * 3;
    ctx.save(); ctx.globalAlpha = ea; ctx.translate(0, (1 - ea) * -60);
    if (K.pose === 'lie') {
      const x = x0, y = y0;
      // khăn đắp
      ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 100, y - 30, 270, 66, 24) : ctx.rect(x - 100, y - 30, 270, 66); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = ea * 0.9; ctx.fillRect(x - 40, y - 34, 200, 74); ctx.globalAlpha = ea;
      ctx.strokeStyle = 'rgba(0,0,0,.08)'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x - 30 + k * 40, y - 34); ctx.lineTo(x - 30 + k * 40, y + 40); ctx.stroke(); }
      const hx = x - 140 + (sleep ? 0 : Math.sin(t * 1.5 + i) * 1.5), hy = y + 2;
      headCircle(hx, hy, 34, u, col);
      // đôi tay massage khi vừa có liệu trình
      const a = act[i]; if (a && performance.now() - a.t < 12000) { for (const s of [-1, 1]) { const mx = x + 40 + Math.sin(t * 6 + s) * 50, my = y - 6 + Math.cos(t * 6 + s) * 10 * s; ctx.fillStyle = '#f2c6a0'; ctx.beginPath(); ctx.ellipse(mx, my, 16, 11, 0, 0, 7); ctx.fill(); } }
      nameTag(hx + 60, y + 58, u, i);
      if (sleep) zzz(hx + 30, hy - 40, t);
    } else {
      const x = x0, y = y0 + bob, back = y0 < (K.tables ? nearestTable(i)[1] : y0);
      // thân
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y + 46, 44, 38, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.ellipse(x - 12, y + 34, 18, 12, -0.4, 0, 7); ctx.fill();
      const tilt = sleep ? 0.45 * (x < (nearestTable(i)[0]) ? 1 : -1) : 0;
      ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); headCircle(0, 0, 36, u, col); ctx.restore();
      // món đang dùng
      const a = act[i]; if (a && performance.now() - a.t < 40000) { const tb = nearestTable(i); const ix = x + (tb[0] - x) * 0.45, iy = y + (tb[1] - y) * 0.55 + 10; ctx.font = '34px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = ea * Math.min(1, (40000 - (performance.now() - a.t)) / 4000); ctx.fillText(a.icon, ix, iy - (performance.now() - a.t < 600 ? (600 - (performance.now() - a.t)) / 6 : 0)); ctx.globalAlpha = ea; }
      nameTag(x, y + 96, u, i);
      if (sleep) zzz(x + 30, y - 46, t);
      void back;
    }
    ctx.restore();
  }
  function nearestTable(i) { if (!K.tables) return K.seats[i]; let b = K.tables[0], d = 1e9; for (const tb of K.tables) { const dd = (tb[0] - K.seats[i][0]) ** 2 + (tb[1] - K.seats[i][1]) ** 2; if (dd < d) { d = dd; b = tb; } } return b; }
  function nameTag(x, y, u, i) {
    ctx.font = `800 17px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const name = u.name.length > 14 ? u.name.slice(0, 13) + '…' : u.name, w = Math.max(90, ctx.measureText(name).width + 18);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - 13, w, 26, 13) : ctx.rect(x - w / 2, y - 13, w, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(name, x, y + 1);
    // thanh cảm xúc
    const m = Math.max(0, Math.min(100, u.meter)) / 100;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x - w / 2 + 6, y + 15, w - 12, 6);
    ctx.fillStyle = m > 0.8 ? '#ff5a5a' : K.acc; ctx.fillRect(x - w / 2 + 6, y + 15, (w - 12) * m, 6);
    if (u.lv > 1) { ctx.font = `900 13px ${FONT}`; ctx.fillStyle = K.acc; ctx.fillText('★'.repeat(Math.min(5, u.lv - 1)), x, y - 22); }
  }
  function zzz(x, y, t) { ctx.font = `900 ${22}px ${FONT}`; ctx.fillStyle = '#cfe8ff'; for (let k = 0; k < 3; k++) { const p = ((t * 0.6 + k / 3) % 1); ctx.globalAlpha = 1 - p; ctx.fillText('Z', x + p * 30, y - p * 50); } ctx.globalAlpha = 1; }
  function drawGuests(t) {
    if (!S) return;
    const order = S.seats.map((u, i) => [u, i]).filter(x => x[0]).sort((a, b) => K.seats[a[1]][1] - K.seats[b[1]][1]);
    for (const [u, i] of order) drawGuest(i, u, t);
    // ghế trống: chấm mờ
    S.seats.forEach((u, i) => { if (u) return; const [x, y] = K.seats[i]; ctx.globalAlpha = 0.25; ctx.strokeStyle = '#fff'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(x - (K.pose === 'lie' ? 140 : 0), y + (K.pose === 'lie' ? 2 : 0), 32, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; });
  }

  // ---------- hạt hiệu ứng ----------
  const fxl = [];
  function burst(x, y, n, colors, spd) { for (let i = 0; i < n * (lite() ? 0.5 : 1); i++) { const a = rnd(0, 6.28), v = rnd(60, spd || 260); fxl.push({ k: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0, max: rnd(0.7, 1.4), c: colors[i % colors.length], r: rnd(3, 6) }); } }
  function floatText(x, y, text, color, size) { fxl.push({ k: 't', x, y, text, c: color || K.acc, s: size || 34, life: 0, max: 1.6 }); }
  function floatIcon(x, y, icon, size) { fxl.push({ k: 'i', x, y, icon, s: size || 46, life: 0, max: 1.8 }); }
  function clink(x, y) { fxl.push({ k: 'clink', x, y, life: 0, max: 0.9 }); }
  function steam(x, y) { for (let i = 0; i < 6; i++) fxl.push({ k: 'steam', x: x + rnd(-20, 20), y, vy: -rnd(30, 60), life: -i * 0.15, max: 2.2, r: rnd(10, 18) }); }
  function rocket() { const x = rnd(100, W - 100), ty = rnd(400, 900); fxl.push({ k: 'rk', x, y: SCN.y1, vy: -Math.sqrt(2 * 520 * (SCN.y1 - ty)), c: ['#ff3b3b', '#ffd23d', '#3dff8a', '#3db8ff', '#ff5ad1', '#fff'][Math.floor(Math.random() * 6)], life: 0, max: 3 }); sfx.whistle(); }
  function confetti(sec) { const end = performance.now() + sec * 1000; const tick = () => { if (performance.now() > end) return; for (let i = 0; i < (lite() ? 2 : 5); i++) fxl.push({ k: 'cf', x: rnd(0, W), y: 280, vx: rnd(-40, 40), vy: rnd(120, 240), life: 0, max: 7, rot: rnd(0, 6), vr: rnd(-6, 6), c: COLORS[Math.floor(Math.random() * 8)] }); setTimeout(tick, 130); }; tick(); }
  function drawFx(dt) {
    for (let i = fxl.length - 1; i >= 0; i--) {
      const f = fxl[i]; f.life += dt; if (f.life < 0) continue; const p = f.life / f.max; if (p >= 1) { fxl.splice(i, 1); continue; }
      ctx.save();
      if (f.k === 'p') { f.vy += 260 * dt; f.x += f.vx * dt; f.y += f.vy * dt; ctx.globalAlpha = 1 - p; ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); }
      else if (f.k === 't') { ctx.globalAlpha = p > 0.7 ? (1 - p) / 0.3 : 1; ctx.font = `900 ${f.s * (p < 0.12 ? 0.6 + p / 0.12 * 0.6 : 1.2 - Math.min(0.2, p - 0.12))}px ${FONT}`; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(f.text, f.x, f.y - p * 70); ctx.fillStyle = f.c; ctx.fillText(f.text, f.x, f.y - p * 70); }
      else if (f.k === 'i') { ctx.globalAlpha = p > 0.75 ? (1 - p) / 0.25 : 1; ctx.font = `${f.s * (p < 0.15 ? p / 0.15 * 1.3 : 1.3 - Math.min(0.3, p))}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(f.icon, f.x, f.y - p * 90); }
      else if (f.k === 'clink') { const d = 40 * (1 - Math.min(1, p * 3)); ctx.font = '40px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 1 - p * 0.5; ctx.save(); ctx.translate(f.x - d - 16, f.y); ctx.rotate(0.35); ctx.fillText('🍺', 0, 0); ctx.restore(); ctx.save(); ctx.translate(f.x + d + 16, f.y); ctx.rotate(-0.35); ctx.scale(-1, 1); ctx.fillText('🍺', 0, 0); ctx.restore(); if (p > 0.3) { ctx.fillStyle = '#fff6b0'; for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; ctx.fillRect(f.x + Math.cos(a) * 30 * p, f.y - 20 + Math.sin(a) * 30 * p, 4, 4); } } }
      else if (f.k === 'steam') { f.y += f.vy * dt; f.x += Math.sin(f.life * 3) * 0.4; ctx.globalAlpha = 0.35 * (1 - p); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 + p), 0, 7); ctx.fill(); }
      else if (f.k === 'rk') { f.vy += 520 * dt; f.y += f.vy * dt; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, 3.5, 0, 7); ctx.fill(); if (f.vy >= -30) { f.life = f.max; burst(f.x, f.y, 70, [f.c, '#fff'], 340); sfx.boom(); } }
      else if (f.k === 'cf') { f.x += f.vx * dt + Math.sin(f.life * 3 + f.rot); f.y += f.vy * dt; f.rot += f.vr * dt; if (f.y > SCN.y1) f.life = f.max; ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.scale(1, Math.abs(Math.cos(f.life * 5 + f.rot))); ctx.fillStyle = f.c; ctx.fillRect(-6, -3.5, 12, 7); }
      ctx.restore();
    }
    if (fxl.length > 700) fxl.splice(0, fxl.length - 700);
  }

  // ---------- DOM ----------
  function onState() {
    if (!S) return;
    const kinds = { self: 'cho mình', table: 'cả bàn', all: 'cả quán' };
    $('menu').innerHTML = (CFG.menu || []).map(m => `<div><span class="ic">${esc(m.icon)}</span><span class="nm">${esc(m.name)}<br><small>${kinds[m.kind] || ''}</small></span><b>${fmt(m.min)}+ xu</b></div>`).join('');
    $('big').innerHTML = (S.big || []).map((u, i) => `<div><span class="rk">${i + 1}</span>${avatarHTML(u)}<span class="nm">${esc(u.name)}</span><b>${fmt(u.coins)}</b></div>`).join('') || '<div style="opacity:.7">Gọi món để lên bảng!</div>';
    $('cmdH').textContent = { nhau: 'Vua dzô', massage: 'Thư giãn nhất', cafe: 'Chill nhất' }[V];
    $('cmdTop').innerHTML = (S.cmdTop || []).map((u, i) => `<div><span class="rk">${i + 1}</span>${avatarHTML(u)}<span class="nm">${esc(u.name)}</span><b>${fmt(u.n)}</b></div>`).join('') || `<div style="opacity:.7">Gõ “${esc(S.def.cmd.name)}” thật nhiều!</div>`;
    const g = S.lastGift, key = g ? g.user.id + g.value + g.item.name + g.count : '';
    if (key !== onState.k) {
      onState.k = key;
      $('lastB').innerHTML = g ? `${avatarHTML(g.user)}<div class="nm">${esc(g.user.name)}</div><div class="it">${esc(g.item.icon)}</div><div class="ds">gọi <b>${esc(g.item.name)}</b>${g.count > 1 ? ' ×' + g.count : ''}</div>` : '<div style="padding:30px 6px;opacity:.75;font-size:20px">Chưa ai gọi món<br>Hãy là người đầu tiên! 🎁</div>';
      $('last').classList.remove('pop'); void $('last').offsetWidth; $('last').classList.add('pop');
    }
    renderChips();
  }
  function fmtT(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function renderChips() {
    if (!S) return; const tn = now(), out = [];
    const seated = S.seats.filter(Boolean).length;
    if (S.happy && S.happy.endsAt > tn) out.push(`<div class="chip hot">⚡ ${esc({ nhau: 'Giờ vàng', massage: 'Giờ thư giãn', cafe: 'Giờ chill' }[V])} ×2<span class="tm" data-end="${S.happy.endsAt}">${fmtT(S.happy.endsAt - tn)}</span></div>`);
    else out.push(`<div class="chip">⏳ ${esc({ nhau: 'Giờ vàng', massage: 'Giờ thư giãn', cafe: 'Giờ chill' }[V])} sau<span class="tm" data-end="${S.nextHappy}">${fmtT(S.nextHappy - tn)}</span></div>`);
    out.push(`<div class="chip">🪑 ${seated}/${S.seats.length}${S.wait ? ` · chờ ${S.wait}` : ''}${S.viewers ? ` · 👀 ${fmt(S.viewers)}` : ''}</div>`);
    const lg = CFG.likeGoal ? Math.max(0, Math.min(1, 1 - (S.likeNext - S.likes) / CFG.likeGoal)) : 0;
    out.push(`<div class="chip">❤️<div style="flex:1"><div style="font-size:15px;margin-bottom:3px">${fmt(S.likes)} tim · quán mời 1 vòng</div><div class="mini"><i style="width:${lg * 100}%"></i></div></div></div>`);
    $('chips').innerHTML = out.join('');
  }
  setInterval(() => { if (!S) return; const tn = now(); for (const el of document.querySelectorAll('[data-end]')) el.textContent = fmtT(+el.dataset.end - tn); }, 500);

  const feed = [];
  function feedAdd(u, html) {
    const el = document.createElement('div'); el.className = 'fi';
    el.innerHTML = (u ? avatarHTML(u) : `<div class="av" style="background:var(--acc);color:#000">★</div>`) + `<span>${html}</span>`;
    el.style.opacity = 0; el.style.transform = 'translateY(60px)';
    $('feed').appendChild(el); feed.unshift(el);
    while (feed.length > 5) { const o = feed.pop(); o.style.opacity = 0; setTimeout(() => o.remove(), 450); }
    requestAnimationFrame(() => requestAnimationFrame(() => feed.forEach((e, i) => { e.style.opacity = 1 - i * 0.17; e.style.transform = `translateY(${-i * 50}px)`; })));
  }
  $('feed').style.top = '290px'; $('feed').style.height = '190px';
  const bnQ = []; let bnBusy = false;
  function banner(k, h, d, ms, avs) { bnQ.push({ k, h, d, ms: ms || 3500, avs, t: Date.now() }); if (bnQ.length > 4) bnQ.splice(1, 1); pumpBn(); }
  function pumpBn() {
    if (bnBusy || !bnQ.length) return; bnBusy = true;
    while (bnQ.length > 1 && Date.now() - bnQ[0].t > 15000) bnQ.shift();
    const b = bnQ.shift(); $('banner').innerHTML = `<div class="bn"><div class="k">${b.k}</div>${b.avs ? `<div class="avs">${b.avs.map(avatarHTML).join('')}</div>` : ''}<div class="h">${b.h}</div>${b.d ? `<div class="d">${b.d}</div>` : ''}</div>`;
    setTimeout(() => { const el = $('banner').firstChild; if (el) el.classList.add('out'); setTimeout(() => { $('banner').innerHTML = ''; bnBusy = false; pumpBn(); }, 420); }, b.ms);
  }
  function comboText(main, sub) { $('combo').innerHTML = `<div class="c">${esc(main)}</div>${sub ? `<div class="s">${sub}</div>` : ''}`; clearTimeout(comboText.t); comboText.t = setTimeout(() => { $('combo').innerHTML = ''; }, 2600); }

  // ---------- MC ----------
  const said = {}; let lastTalk = Date.now();
  function say(text, prio, key, gap, hype) {
    if (!CFG.mcOn || !text) return;
    if (key) { const n = Date.now(); if (n - (said[key] || 0) < (gap || 0)) return; said[key] = n; }
    lastTalk = Date.now();
    if (window.MC && MC.hasVietnamese()) MC.say(text, prio, hype); else socket.emit('vn:say', { v: V, text, prio });
  }
  const nm = u => window.MC ? MC.clean(u && u.name) : (u && u.name) || 'bạn';
  let idleI = 0;
  setInterval(() => { if (!S || !CFG.mcOn) return; const gap = { 1: 60000, 2: 32000, 3: 16000 }[CFG.mcChatty || 2] || 32000; if (Date.now() - lastTalk < gap) return; const L = K.mc.idle; say(L[idleI++ % L.length], false); }, 5000);
  const seatPt = i => { const [x, y] = K.seats[i] || [W / 2, 800]; return K.pose === 'lie' ? [x - 140, y] : [x, y]; };

  function onFx(e) {
    const u = e.user;
    switch (e.type) {
      case 'enter': {
        enterAt[e.seat] = performance.now(); const [x, y] = seatPt(e.seat); burst(x, y, 16, [K.acc, '#fff']); sfx.door();
        feedAdd(u, e.returning ? `<span class="rank">${esc(e.title)}</span> <b>${esc(u.name)}</b> lại ghé (lần ${e.visits})` : `<b>${esc(u.name)}</b> vào ${V === 'massage' ? 'giường ' + (e.seat + 1) : 'quán'}`);
        if (CFG.mcWelcome) { if (e.returning && e.lv > 1) say(K.mc.ret(nm(u), e.title, e.visits), false, 'ret', 3000); else say(K.mc.enter(nm(u), e.seat), false, 'enter', 6000); }
        break; }
      case 'wait': feedAdd(u, `<b>${esc(u.name)}</b> đang chờ chỗ (${e.n})`); break;
      case 'leave': delete act[e.seat]; break;
      case 'door': if (CFG.mcWelcome) say(K.mc.door(nm(u)), false, 'door', 20000); break;
      case 'cmd': {
        if (e.seat >= 0) { const [x, y] = seatPt(e.seat); if (V === 'nhau') { clink(x, y - 60); sfx.clink(); } else if (V === 'massage') { floatIcon(x, y - 50, '😌', 36); sfx.chime(); } else { floatIcon(x, y - 50, '🎵', 34); sfx.chime(); } }
        break; }
      case 'combo': {
        const L = e.level;
        comboText(V === 'nhau' ? (L >= 3 ? 'DZÔ DZÔ DZÔ!' : L === 2 ? '100% !!!' : '1 2 3 DZÔ!') : V === 'massage' ? (L >= 3 ? 'ĐÃ QUÁÁÁ!' : 'THƯ GIÃN~') : (L >= 3 ? 'CHILL TỘT ĐỘ' : 'CHILL~'), `${e.people} người cùng ${esc(S ? S.def.cmd.name : '')} · ${esc(e.name)}`);
        for (let k = 0; k < L * 2; k++) setTimeout(rocket, k * 200); confetti(L);
        if (S) S.seats.forEach((x, i) => { if (x) { const [px, py] = seatPt(i); V === 'nhau' ? clink(px, py - 60) : floatIcon(px, py - 50, S.def.cmd.icon, 40); } });
        sfx.cheer(L); say(K.mc.combo[Math.min(2, L - 1)], true, '', 0, L >= 2);
        break; }
      case 'gift': {
        const it = e.item, big = e.value >= 100, mid = e.value >= 10;
        const targets = e.who && e.who.length && S ? S.seats.map((id, i) => [id && id.id, i]).filter(([id]) => id && e.who.includes(id)).map(x => x[1]) : [e.seat];
        for (const i of targets) if (i >= 0) { act[i] = { icon: it.icon, t: performance.now(), kind: it.kind }; const [x, y] = seatPt(i); floatIcon(x, y - 60, it.icon, big ? 56 : 44); if (V === 'massage') steam(x + 100, y - 20); }
        if (e.seat >= 0) { const [x, y] = seatPt(e.seat); burst(x, y, big ? 60 : 24, [K.acc, K.acc2, '#fff'], big ? 400 : 260); floatText(x, y - 110, `${it.icon} ${it.name}`, K.acc, big ? 40 : 30); }
        if (mid) { for (let k = 0; k < (big ? 6 : 2); k++) setTimeout(rocket, k * 220); confetti(big ? 3 : 1); }
        feedAdd(u, `🎁 <b>${esc(u.name)}</b> gọi ${esc(it.icon)} ${esc(it.name)}${e.count > 1 ? ' ×' + e.count : ''}${e.happy ? ' <b>×2</b>' : ''}`);
        if (big) banner(it.kind === 'all' ? 'Bao cả quán' : 'Đại gia', `${esc(it.icon)} ${esc(u.name)}`, `gọi <b>${esc(it.name)}</b>${e.count > 1 ? ' ×' + e.count : ''} · ${fmt(e.value)} xu`, 4500, [u]);
        sfx.coin(e.value);
        say(K.mc.gift(nm(u), it.name, it.kind) + (big ? ` Cả ${V === 'massage' ? 'tiệm' : 'quán'} cảm ơn ${nm(u)} nào!` : ''), mid, mid ? '' : 'gift', 2500, big);
        break; }
      case 'full': { const [x, y] = seatPt(e.seat); floatText(x, y - 90, V === 'nhau' ? 'SAY MỀM!' : V === 'massage' ? 'NGỦ NGON~' : 'CHILL MAX!', '#ff8a8a', 34); feedAdd(u, `😴 <b>${esc(u.name)}</b> ${esc(S ? S.def.full : '')}`); say(K.mc.full(nm(u)), false, 'full', 8000); break; }
      case 'wake': say(K.mc.wake(nm(u)), false, 'wake', 15000); break;
      case 'happy': banner({ nhau: 'Giờ vàng', massage: 'Giờ thư giãn', cafe: 'Giờ chill' }[V], '⚡ NHÂN ĐÔI', esc(e.text) + ` · <b>${e.sec}s</b>`, 4000); for (let k = 0; k < 4; k++) setTimeout(rocket, k * 250); sfx.fanfare(); say(K.mc.happy(e.sec), true, '', 0, true); break;
      case 'happyEnd': feedAdd(null, 'Hết giờ nhân đôi — hẹn lần sau!'); break;
      case 'likeGoal': banner('Cảm ơn thả tim', `${esc(e.item.icon)} Quán mời 1 vòng!`, `Mỗi khách một <b>${esc(e.item.name)}</b>`, 4000); if (S) S.seats.forEach((x, i) => { if (x) { act[i] = { icon: e.item.icon, t: performance.now() }; const [px, py] = seatPt(i); floatIcon(px, py - 60, e.item.icon); } }); confetti(2); say(K.mc.likeGoal(e.item.name), true); break;
      case 'note': feedAdd(u, `📌 <b>${esc(u.name)}</b> dán lời nhắn lên bảng`); floatIcon(865, 450, '📌', 60); say(`${nm(u)} gửi lời nhắn: ${e.text}`, false, 'note', 4000); break;
      case 'levelUp': feedAdd(u, `⬆️ <b>${esc(u.name)}</b> thành <span class="rank">${esc(e.title)}</span>`); if (e.level >= 3) { banner('Lên hạng', esc(e.title), `Chúc mừng <b>${esc(u.name)}</b>`, 3000, [u]); say(`Chúc mừng ${nm(u)} đã thành ${e.title} của ${V === 'massage' ? 'tiệm' : 'quán'}!`, false, 'lv', 5000); } break;
      case 'follow': case 'share': feedAdd(u, `${e.type === 'follow' ? '➕ theo dõi' : '🔗 chia sẻ'} · <b>${esc(u.name)}</b>`); say(`Cảm ơn ${nm(u)} đã ${e.type === 'follow' ? 'theo dõi' : 'chia sẻ'} quán!`, false, e.type, 6000); break;
      case 'reset': fxl.length = 0; for (const k in act) delete act[k]; banner('Mở cửa', K.sign, 'Bình luận để vào quán!', 3500); break;
      case 'say': say(e.text, true); break;
      case 'sfxTest': { const ac = audioCtx(); if (ac) ac.resume(); sfx.clink(); setTimeout(() => sfx.coin(30), 600); setTimeout(() => sfx.cheer(2), 1400); break; }
    }
  }

  // ---------- âm thanh ----------
  let AC = null, BUS = null;
  const audioCtx = () => { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return AC; };
  function bus() { const ac = audioCtx(); if (!BUS) { const c = ac.createDynamicsCompressor(); c.threshold.value = -14; c.ratio.value = 4; BUS = ac.createGain(); BUS.connect(c).connect(ac.destination); } BUS.gain.value = CFG.sfxOn === false ? 0 : (CFG.sfxVol == null ? 0.9 : +CFG.sfxVol) * 1.5; return BUS; }
  function tone(f, dur, type, vol, when) { const ac = audioCtx(); if (!ac || ac.state !== 'running') return; const t0 = ac.currentTime + (when || 0), o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol || 0.06, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g).connect(bus()); o.start(t0); o.stop(t0 + dur + 0.05); }
  function sweep(f0, f1, dur, type, vol, when) { const ac = audioCtx(); if (!ac || ac.state !== 'running') return; const t0 = ac.currentTime + (when || 0), o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g).connect(bus()); o.start(t0); o.stop(t0 + dur + 0.05); }
  let NOISE = null;
  function noise(dur, vol, hp, when) { const ac = audioCtx(); if (!ac || ac.state !== 'running') return; if (!NOISE) { NOISE = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } const t0 = ac.currentTime + (when || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = NOISE; f.type = 'highpass'; f.frequency.value = hp || 3000; g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); s.connect(f).connect(g).connect(bus()); s.start(t0); s.stop(t0 + dur + 0.05); }
  let gate = 0;
  const sfx = {
    clink() { const n = performance.now(); if (n - gate < 80) return; gate = n; tone(2350, 0.25, 'sine', 0.05); tone(3520, 0.18, 'sine', 0.03, 0.01); tone(2790, 0.3, 'triangle', 0.025, 0.02); },
    chime() { const n = performance.now(); if (n - gate < 80) return; gate = n; const f = [523, 659, 784, 880][Math.floor(Math.random() * 4)]; tone(f, 0.7, 'sine', 0.05); tone(f * 2, 0.5, 'sine', 0.015, 0.02); },
    door() { tone(1319, 0.35, 'triangle', 0.04); tone(1047, 0.5, 'triangle', 0.04, 0.16); },
    coin(v) { if (v >= 100) { sweep(150, 45, 0.35, 'sine', 0.3); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.05, i * 0.08)); [1047, 1319, 1568].forEach(f => tone(f, 1, 'triangle', 0.04, 0.4)); } else if (v >= 10) { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.18, 'triangle', 0.05, i * 0.06)); } else { tone(1175, 0.1, 'triangle', 0.05); tone(1568, 0.3, 'triangle', 0.05, 0.06); } },
    cheer(L) { for (let i = 0; i < 40 * L; i++) noise(0.03 + Math.random() * 0.03, 0.06 + Math.random() * 0.05, 900 + Math.random() * 1500, Math.random() * (1.5 + L)); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, 'triangle', 0.05, i * 0.1)); },
    whistle() { if (Math.random() < 0.5) sweep(600, 1800, 0.8, 'triangle', 0.02); },
    boom() { sweep(130, 40, 0.6, 'sine', 0.3); noise(0.4, 0.12, 300); },
  };
  const music = (() => {
    const el = new Audio(); let list = [], idx = -1, vol = 0.35, padOn = false;
    el.onended = () => next();
    function next() { if (!list.length) { pad(); return; } idx = (idx + 1) % list.length; el.src = '/music/' + encodeURIComponent(list[idx]); el.volume = vol; el.play().catch(needTap); }
    fetch('/api/music').then(r => r.json()).then(l => { list = l.sort(() => Math.random() - 0.5); if (vol > 0) next(); }).catch(() => {});
    function pad() {   // không có nhạc: tiếng nền tự tạo theo quán
      if (padOn) return; padOn = true;
      const notes = V === 'cafe' ? [220, 262, 294, 330, 392] : V === 'massage' ? [262, 294, 330, 392, 440, 523] : [330, 392, 440, 494, 587];
      const step = () => { if (vol > 0 && AC && AC.state === 'running') { tone(notes[Math.floor(Math.random() * notes.length)], V === 'nhau' ? 0.6 : 2, V === 'nhau' ? 'triangle' : 'sine', 0.045 * vol); if (V === 'cafe' && S && S.rain) noise(1.2, 0.02 * vol, 1200); if (V === 'nhau' && Math.random() < 0.4) noise(0.3, 0.015 * vol, 600); } setTimeout(step, V === 'nhau' ? 380 : 700 + Math.random() * 400); };
      step();
    }
    return { setVol(v) { vol = Math.max(0, Math.min(1, +v || 0)); el.volume = vol; if (vol === 0) el.pause(); else if (list.length && el.paused && el.src) el.play().catch(needTap); else if (!list.length) pad(); } };
  })();
  function needTap() { if (!OBS) $('tap').style.display = 'flex'; }
  $('tap').onclick = () => { $('tap').style.display = 'none'; const ac = audioCtx(); if (ac) ac.resume(); music.setVol(CFG.musicOn ? +CFG.musicVol : 0); };
  document.addEventListener('pointerdown', () => { const ac = audioCtx(); if (ac && ac.state !== 'running') ac.resume(); });
  setTimeout(() => { const ac = audioCtx(); if (ac && ac.state !== 'running') { ac.resume().catch(() => {}); setTimeout(() => { if (AC.state !== 'running') needTap(); }, 600); } }, 1200);

  // ---------- vòng lặp ----------
  let last = performance.now(), fr = 0;
  function frame(n) {
    const dt = Math.min(0.05, (n - last) / 1000); last = n; fr++;
    if (lite() && fr % 2) { requestAnimationFrame(frame); return; }
    const t = n / 1000, d = lite() ? dt * 2 : dt;
    ctx.drawImage(bg, 0, 0);
    drawAmbient(t, d);
    drawGuests(t);
    drawFx(d);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
