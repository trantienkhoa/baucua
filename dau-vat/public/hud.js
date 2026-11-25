// Lớp giao diện 2D (1080 × 1920) vẽ đè lên cảnh 3D.
export const HW = 1080, HH = 1920;
const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const IMPACT = 'Impact, "Arial Black", "Segoe UI", sans-serif';
const imgs = new Map();
export function img(url) {
  if (!url) return null;
  let im = imgs.get(url);
  if (!im) { im = new Image(); im.referrerPolicy = 'no-referrer'; im.src = url; im.onerror = () => { im.bad = true; }; imgs.set(url, im); }
  return im.complete && !im.bad && im.naturalWidth ? im : null;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function fit(g, text, max, size, weight = 800, font = FONT) { let s = size; g.font = `${weight} ${s}px ${font}`; while (g.measureText(text).width > max && s > 12) { s -= 2; g.font = `${weight} ${s}px ${font}`; } return s; }
function stroked(g, text, x, y, fill, stroke = '#000', lw = 8) { g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(text, x, y); g.fillStyle = fill; g.fillText(text, x, y); }
const initials = n => String(n || '?').split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase();

export function avatar(g, x, y, r, url, name, ring = '#fff', bg = '#333') {
  g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.closePath();
  g.fillStyle = bg; g.fill(); g.clip();
  const im = img(url);
  if (im) g.drawImage(im, x - r, y - r, r * 2, r * 2);
  else { g.fillStyle = '#fff'; g.font = `900 ${r * 0.9}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(initials(name), x, y + 2); }
  g.restore(); g.lineWidth = Math.max(3, r * 0.12); g.strokeStyle = ring; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
}
function bar(g, x, y, w, h, v, c1, c2, back = 'rgba(0,0,0,0.55)', ghost) {
  rr(g, x, y, w, h, h / 2); g.fillStyle = back; g.fill();
  if (ghost != null && ghost > v) { rr(g, x, y, Math.max(h, w * ghost), h, h / 2); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill(); }
  if (v > 0) { const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, c1); gr.addColorStop(1, c2); rr(g, x, y, Math.max(h, w * Math.min(1, v)), h, h / 2); g.fillStyle = gr; g.fill(); }
}

export function createHud(canvas) {
  const g = canvas.getContext('2d');
  const H = { g, banners: [], floats: [], caption: null, feed: [], ticker: [] };
  H.banner = (text, sub, color = '#ffd23f', dur = 2.6, size = 120) => { H.banners.push({ text, sub, color, t: 0, dur, size }); if (H.banners.length > 3) H.banners.shift(); };
  H.float = (x, y, text, color = '#fff', size = 54) => { H.floats.push({ x, y, text, color, size, t: 0 }); if (H.floats.length > 40) H.floats.shift(); };
  H.say = (who, text, dur = 5) => { H.caption = { who, text, t: 0, dur }; };
  H.chat = (user, text, tag) => { H.feed.push({ user, text, tag, t: 0 }); if (H.feed.length > 6) H.feed.shift(); };
  H.tick = (text, color = '#ffd23f') => { H.ticker.push({ text, color, t: 0 }); if (H.ticker.length > 4) H.ticker.shift(); };

  // khi không vẽ (chạy thử tua nhanh) vẫn cho chữ bay / biểu ngữ hết hạn
  H.tickOnly = (dt) => {
    for (const f of H.floats) f.t += dt; H.floats = H.floats.filter(f => f.t < 1.2);
    for (const b of H.banners) b.t += dt; H.banners = H.banners.filter(b => b.t < b.dur);
    for (const f of H.feed) f.t += dt; for (const t of H.ticker) t.t += dt;
    if (H.caption) { H.caption.t += dt; if (H.caption.t > H.caption.dur) H.caption = null; }
  };
  H.draw = (G, dt) => {
    g.clearRect(0, 0, HW, HH);
    g.textBaseline = 'middle';
    header(G);
    if (G.phase === 'reg') regGrid(G);
    else if (G.mode === 'royal') { tags(G, true); royalPanel(G); }
    else if (G.mode === 'match') { tags(G, false); matchPanel(G); }
    if (G.bracketShow > 0) bracket(G);
    if (G.phase === 'ceremony' || G.phase === 'break') championCard(G);
    floats(dt);
    if (G.settings.showGiftMenu !== false && !['reg', 'ceremony', 'break'].includes(G.phase) && !(G.bracketShow > 0)) giftMenu(G);
    if (G.settings.showComments !== false && G.phase !== 'reg') feed(dt, G); else tickers(dt, G);
    caption(dt, G);
    banners(dt);
    hint(G);
  };

  function header(G) {
    const gr = g.createLinearGradient(0, 0, 0, 150); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, HW, 160);
    g.textAlign = 'left'; g.font = `900 46px ${IMPACT}`; stroked(g, 'MEGA', 30, 52, '#ffd23f', '#000', 6);
    const w = g.measureText('MEGA ').width; stroked(g, 'SLAM', 30 + w, 52, '#e8202a', '#000', 6);
    g.font = `700 24px ${FONT}`; g.fillStyle = '#ddd'; g.fillText('ĐẠI CHIẾN ĐÔ VẬT · GIẢI ' + (G.cup || 1), 32, 92);
    // phase pill
    const label = G.phaseLabel || '';
    if (label) {
      g.font = `900 34px ${FONT}`; const tw = g.measureText(label).width + 50;
      rr(g, HW - tw - 24, 26, tw, 56, 28); g.fillStyle = G.phaseColor || '#c8102e'; g.fill();
      g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(label, HW - tw / 2 - 24, 55);
    }
    if (G.timerText) { g.textAlign = 'right'; g.font = `800 30px ${FONT}`; g.fillStyle = '#fff'; g.fillText(G.timerText, HW - 30, 108); }
  }

  function regGrid(G) {
    const top = 300;
    g.fillStyle = 'rgba(5,8,18,0.78)'; rr(g, 30, top - 120, HW - 60, 1270, 30); g.fill();
    g.textAlign = 'center';
    g.font = `900 70px ${IMPACT}`; stroked(g, 'GHI DANH BATTLE ROYAL', HW / 2, top - 62, '#ffd23f', '#000', 8);
    g.font = `800 34px ${FONT}`; g.fillStyle = '#fff';
    g.fillText(`Gõ  “${G.joinWord.toUpperCase()}”  để lên võ đài · còn ${Math.max(0, Math.ceil(G.regLeft))} giây`, HW / 2, top - 5);
    const cols = 4, cw = (HW - 100) / cols, ch = 134;
    for (let i = 0; i < 32; i++) {
      const s = G.slots[i], d = G.roster[i];
      const x = 50 + (i % cols) * cw, y = top + 40 + Math.floor(i / cols) * ch;
      rr(g, x + 6, y, cw - 12, ch - 14, 18); g.fillStyle = s.user ? 'rgba(232,32,42,0.35)' : 'rgba(255,255,255,0.07)'; g.fill();
      g.strokeStyle = s.user ? '#ffd23f' : 'rgba(255,255,255,0.15)'; g.lineWidth = 3; g.stroke();
      avatar(g, x + 58, y + 58, 40, s.user && s.user.avatar, s.user ? s.user.name : d.name, d.attire || '#fff', d.attire2 || '#222');
      g.textAlign = 'left'; g.fillStyle = '#ffd23f'; g.font = `900 24px ${FONT}`; g.fillText('#' + (i + 1), x + 108, y + 26);
      fit(g, d.name, cw - 120, 24, 800); g.fillStyle = '#fff'; g.fillText(d.name, x + 108, y + 58);
      const nm = s.user ? s.user.name : 'trống';
      fit(g, nm, cw - 120, 22, 700); g.fillStyle = s.user ? '#9cf' : 'rgba(255,255,255,0.45)'; g.fillText(nm, x + 108, y + 90);
    }
    g.textAlign = 'center'; g.font = `700 28px ${FONT}`; g.fillStyle = '#ccc';
    g.fillText(`${G.slots.filter(s => s.user).length}/32 người · gõ “${G.joinWord} 7” để chọn đô vật số 7 · thiếu người thì đô vật máy vào thay`, HW / 2, top + 40 + 8 * ch + 20);
  }

  function project(G, w) { const p = G.headScreen(w); return p; }
  function tags(G, small) {
    for (const w of G.active) {
      if (w.out || !w.visible) continue;
      const p = project(G, w); if (!p || !isFinite(p.x) || !isFinite(p.y)) continue;
      const name = w.label;
      g.textAlign = 'center';
      if (small) {
        fit(g, name, 180, 20, 800);
        stroked(g, name, p.x, p.y - 30, w.user ? '#fff' : '#cfd6e0', '#000', 5);
        bar(g, p.x - 50, p.y - 14, 100, 10, w.hp / w.maxHp, w.hp < 30 ? '#ff3b3b' : '#3dff6e', w.hp < 30 ? '#ff8a3d' : '#b5ff3d');
      } else {
        fit(g, name, 260, 26, 800);
        stroked(g, name, p.x, p.y - 26, '#fff', '#000', 6);
      }
      if (w.rageT > 0 || w.legendT > 0) { g.font = `900 22px ${FONT}`; stroked(g, w.legendT > 0 ? '👑 HUYỀN THOẠI' : '🔥 CUỒNG NỘ', p.x, p.y - (small ? 52 : 56), w.legendT > 0 ? '#ffd23f' : '#ff5a1f', '#000', 5); }
    }
  }
  function royalPanel(G) {
    const alive = G.active.filter(w => !w.out).length;
    g.fillStyle = 'rgba(0,0,0,0.6)'; rr(g, 230, 140, 620, 100, 24); g.fill();
    g.textAlign = 'center'; g.font = `900 52px ${IMPACT}`;
    stroked(g, `CÒN ${alive} / 32`, HW / 2, 180, '#ffd23f', '#000', 6);
    g.font = `700 26px ${FONT}`; g.fillStyle = '#fff';
    g.fillText(alive > 16 ? `Ném qua dây để loại · cần loại thêm ${alive - 16}` : '16 người vào vòng 16!', HW / 2, 222);
    // bảng loại nhiều nhất
    const top = G.active.slice().sort((a, b) => b.elims - a.elims).filter(w => w.elims > 0).slice(0, 4);
    if (top.length) {
      g.fillStyle = 'rgba(0,0,0,0.55)'; rr(g, 24, 270, 330, 50 + top.length * 44, 18); g.fill();
      g.textAlign = 'left'; g.font = `900 24px ${FONT}`; g.fillStyle = '#ffd23f'; g.fillText('LOẠI NHIỀU NHẤT', 44, 298);
      top.forEach((w, i) => { g.font = `700 24px ${FONT}`; g.fillStyle = '#fff'; fit(g, `${i + 1}. ${w.label}`, 230, 24, 700); g.fillText(`${i + 1}. ${w.label}`, 44, 340 + i * 44); g.textAlign = 'right'; g.fillStyle = '#ffd23f'; g.fillText(w.elims + ' 💥', 336, 340 + i * 44); g.textAlign = 'left'; });
    }
  }
  function card(G, w, x, side) {
    const red = side < 0, c1 = red ? '#c8102e' : '#1d4fd8';
    const W = 470, H = 170;
    const gr = g.createLinearGradient(x, 0, x + W, 0); gr.addColorStop(red ? 0 : 1, c1); gr.addColorStop(red ? 1 : 0, 'rgba(0,0,0,0.75)');
    rr(g, x, 150, W, H, 22); g.fillStyle = gr; g.fill();
    const ax = red ? x + 80 : x + W - 80;
    avatar(g, ax, 150 + 78, 58, w.user && w.user.avatar, w.user ? w.user.name : w.def.name, '#fff', w.def.attire);
    g.textAlign = red ? 'left' : 'right';
    const tx = red ? x + 152 : x + W - 152, maxw = W - 170;
    fit(g, w.def.name.toUpperCase(), maxw, 34, 900, IMPACT); stroked(g, w.def.name.toUpperCase(), tx, 186, '#fff', '#000', 6);
    const sub = w.user ? '🎮 ' + w.user.name : '🤖 máy điều khiển';
    fit(g, sub, maxw, 22, 700); g.fillStyle = '#ffe9a8'; g.fillText(sub, tx, 220);
    const bx = red ? x + 152 : x + 18, bw = W - 170;
    bar(g, bx, 240, bw, 22, w.hp / w.maxHp, w.hp < 30 ? '#ff2a2a' : '#3dff6e', w.hp < 30 ? '#ff9a3d' : '#d6ff3d', undefined, w.hpGhost / w.maxHp);
    g.textAlign = 'center'; g.font = `800 18px ${FONT}`; g.fillStyle = '#fff'; g.fillText(Math.ceil(w.hp) + ' máu', bx + bw / 2, 252);
    const full = w.mom >= 100;
    bar(g, bx, 272, bw, 16, w.mom / 100, full ? '#ffd23f' : '#ff7a1a', full ? '#fff6a8' : '#ffd23f');
    if (full && Math.sin(G.time * 10) > -0.3) { g.font = `900 20px ${FONT}`; stroked(g, '⚡ CHIÊU CUỐI', bx + bw / 2, 300, '#ffd23f', '#000', 5); }
    else { g.font = `700 16px ${FONT}`; g.fillStyle = '#eee'; g.fillText('nộ ' + Math.floor(w.mom) + '%', bx + bw / 2, 300); }
    if (w.supporters) { g.textAlign = red ? 'left' : 'right'; g.font = `800 20px ${FONT}`; g.fillStyle = '#fff'; g.fillText(`❤ ${w.supporters} cổ vũ · gõ ${red ? '1' : '2'}`, red ? x + 20 : x + W - 20, 340); }
  }
  function matchPanel(G) {
    const [a, b] = G.pair || []; if (!a || !b) return;
    card(G, a, 20, -1); card(G, b, HW - 490, 1);
    g.textAlign = 'center'; g.font = `900 64px ${IMPACT}`; stroked(g, 'VS', HW / 2, 236, '#ffd23f', '#000', 8);
    if (G.roundLabel) { g.font = `800 24px ${FONT}`; g.fillStyle = '#fff'; g.fillText(G.roundLabel, HW / 2, 290); }
  }
  function bracket(G) {
    const k = Math.min(1, G.bracketShow);
    g.save(); g.globalAlpha = k;
    g.fillStyle = 'rgba(4,6,14,0.9)'; rr(g, 24, 330, HW - 48, 1180, 28); g.fill();
    g.textAlign = 'center'; g.font = `900 64px ${IMPACT}`; stroked(g, 'NHÁNH ĐẤU', HW / 2, 400, '#ffd23f', '#000', 8);
    const rounds = G.bracket || [];
    const cols = rounds.length, cw = (HW - 80) / Math.max(4, cols);
    rounds.forEach((rd, ri) => {
      const n = rd.length, x = 40 + ri * cw, topY = 470, hgt = 980;
      g.font = `900 24px ${FONT}`; g.fillStyle = '#9cf'; g.fillText(['VÒNG 16', 'TỨ KẾT', 'BÁN KẾT', 'CHUNG KẾT', 'VÔ ĐỊCH'][ri] || '', x + cw / 2, topY - 20);
      rd.forEach((m, mi) => {
        const cy = topY + (mi + 0.5) * hgt / n;
        for (let s = 0; s < 2; s++) {
          const w = m[s]; const y = cy + (s ? 26 : -26);
          rr(g, x + 6, y - 22, cw - 12, 44, 12);
          const win = m.winner != null && m.winner === w;
          g.fillStyle = win ? 'rgba(255,210,63,0.85)' : (m.winner != null ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.18)'); g.fill();
          if (G.current && G.current.ri === ri && G.current.mi === mi) { g.strokeStyle = '#ff3b3b'; g.lineWidth = 4; g.stroke(); }
          if (w) { g.textAlign = 'left'; fit(g, w.label, cw - 30, 20, 800); g.fillStyle = win ? '#000' : '#fff'; g.fillText(w.label, x + 16, y + 1); g.textAlign = 'center'; }
        }
      });
    });
    g.restore();
  }
  function championCard(G) {
    const c = G.champion; if (!c) return;
    g.fillStyle = 'rgba(0,0,0,0.6)'; rr(g, 90, 330, HW - 180, 300, 30); g.fill();
    g.textAlign = 'center'; g.font = `900 54px ${IMPACT}`; stroked(g, '🏆 NHÀ VÔ ĐỊCH MEGA SLAM', HW / 2, 385, '#ffd23f', '#000', 8);
    avatar(g, HW / 2, 490, 72, c.user && c.user.avatar, c.label, '#ffd23f', c.def.attire);
    g.font = `900 46px ${IMPACT}`; stroked(g, c.def.name.toUpperCase(), HW / 2, 595, '#fff', '#000', 7);
    if (G.phase === 'break') { g.font = `800 34px ${FONT}`; g.fillStyle = '#fff'; g.fillText(`Giải mới sau ${Math.max(0, Math.ceil(G.breakLeft))} giây · gõ “${G.joinWord}” để ghi danh sớm`, HW / 2, 680); }
    // bảng vàng
    const list = (G.records || []).slice(0, 5);
    if (list.length) {
      g.fillStyle = 'rgba(0,0,0,0.6)'; rr(g, 90, 720, HW - 180, 70 + list.length * 52, 24); g.fill();
      g.font = `900 30px ${FONT}`; g.fillStyle = '#ffd23f'; g.fillText('BẢNG VÀNG NGƯỜI XEM', HW / 2, 760);
      list.forEach((r, i) => { g.textAlign = 'left'; g.font = `700 28px ${FONT}`; g.fillStyle = '#fff'; g.fillText(`${i + 1}. ${r.name}`, 130, 812 + i * 52); g.textAlign = 'right'; g.fillStyle = '#ffd23f'; g.fillText(`${r.titles} 🏆  ${r.wins} thắng`, HW - 130, 812 + i * 52); g.textAlign = 'center'; });
    }
  }
  function floats(dt) {
    for (let i = H.floats.length - 1; i >= 0; i--) {
      const f = H.floats[i]; f.t += dt; if (f.t > 1.2) { H.floats.splice(i, 1); continue; }
      const k = f.t / 1.2, s = f.size * (1 + 0.4 * Math.max(0, 0.2 - f.t) * 5);
      g.save(); g.globalAlpha = 1 - k * k; g.textAlign = 'center'; g.font = `900 ${s}px ${IMPACT}`;
      stroked(g, f.text, f.x, f.y - k * 120, f.color, '#000', 7); g.restore();
    }
  }
  function giftMenu(G) {
    const list = G.powerList || []; if (!list.length) return;
    const x = HW - 300, y = 420, rowH = 44;
    g.fillStyle = 'rgba(0,0,0,0.5)'; rr(g, x, y, 280, 56 + list.length * rowH, 18); g.fill();
    g.textAlign = 'center'; g.font = `900 24px ${FONT}`; g.fillStyle = '#ffd23f'; g.fillText('TẶNG QUÀ', x + 140, y + 28);
    list.forEach((p, i) => {
      const yy = y + 64 + i * rowH;
      g.textAlign = 'left'; g.font = `24px ${FONT}`; g.fillText(p.icon, x + 14, yy);
      fit(g, p.label, 175, 20, 700); g.fillStyle = '#fff'; g.fillText(p.label, x + 50, yy);
      g.textAlign = 'right'; g.font = `800 18px ${FONT}`; g.fillStyle = '#ffd23f'; g.fillText((p.gift ? p.gift + ' ' : '') + p.min + '💎', x + 270, yy);
    });
  }
  function feed(dt, G) {
    let y = HH - 720;
    for (const f of H.feed.slice(-5)) {
      f.t += dt; const a = Math.max(0, Math.min(1, 12 - f.t));
      if (a <= 0) continue;
      g.save(); g.globalAlpha = a;
      g.textAlign = 'left';
      avatar(g, 50, y, 24, f.user.avatar, f.user.name, f.tag ? '#ffd23f' : '#fff');
      g.font = `800 24px ${FONT}`; g.fillStyle = f.tag ? '#ffd23f' : '#9cf'; fit(g, f.user.name, 260, 24, 800); g.fillText(f.user.name, 86, y - 12);
      g.font = `700 26px ${FONT}`; g.fillStyle = '#fff'; fit(g, f.text, 520, 26, 700); g.fillText(f.text, 86, y + 16);
      g.restore(); y += 70;
    }
    tickers(dt, G);
  }
  function tickers(dt, G) {
    let ty = G.phase === 'reg' ? HH - 380 : 560;
    for (const tk of H.ticker) {
      tk.t += dt; const a = Math.max(0, Math.min(1, 6 - tk.t)); if (a <= 0) continue;
      g.save(); g.globalAlpha = a; g.textAlign = 'left'; g.font = `800 24px ${FONT}`; const w = Math.min(560, g.measureText(tk.text).width + 30);
      rr(g, 20, ty - 20, w, 40, 20); g.fillStyle = 'rgba(0,0,0,0.6)'; g.fill(); g.fillStyle = tk.color; fit(g, tk.text, 540, 24, 800); g.fillText(tk.text, 34, ty); g.restore(); ty += 48;
    }
  }
  function caption(dt, G) {
    const c = H.caption; if (!c || G.settings.captions === false) return;
    c.t += dt; if (c.t > c.dur) { H.caption = null; return; }
    const a = Math.min(1, c.t * 4, (c.dur - c.t) * 2);
    g.save(); g.globalAlpha = a;
    const y = HH - 220;
    g.font = `800 32px ${FONT}`;
    const lines = wrap(c.text, 940);
    const h = 60 + lines.length * 42;
    rr(g, 40, y - h, HW - 80, h, 22); g.fillStyle = 'rgba(8,10,20,0.82)'; g.fill(); g.strokeStyle = '#c8102e'; g.lineWidth = 4; g.stroke();
    g.textAlign = 'left'; g.font = `900 24px ${FONT}`; g.fillStyle = '#ffd23f'; g.fillText('🎙 ' + c.who, 66, y - h + 30);
    g.font = `800 32px ${FONT}`; g.fillStyle = '#fff';
    lines.forEach((l, i) => g.fillText(l, 66, y - h + 72 + i * 42));
    g.restore();
  }
  function wrap(text, max) {
    const words = String(text).split(' '); const lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > max && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); return lines.slice(0, 3);
  }
  function banners(dt) {
    for (let i = H.banners.length - 1; i >= 0; i--) {
      const b = H.banners[i]; b.t += dt; if (b.t > b.dur) H.banners.splice(i, 1);
    }
    const b = H.banners[H.banners.length - 1]; if (!b) return;
    const inK = Math.min(1, b.t / 0.18), outK = Math.min(1, (b.dur - b.t) / 0.3);
    const s = (1.4 - 0.4 * inK);
    g.save(); g.globalAlpha = Math.min(inK, outK); g.translate(HW / 2, HH * 0.42); g.scale(s, s);
    g.textAlign = 'center';
    const size = fit(g, b.text, 980, b.size, 900, IMPACT);
    g.font = `900 ${size}px ${IMPACT}`;
    stroked(g, b.text, 0, 0, b.color, '#000', 14);
    if (b.sub) { g.font = `800 40px ${FONT}`; fit(g, b.sub, 980, 40, 800); stroked(g, b.sub, 0, size * 0.75, '#fff', '#000', 8); }
    g.restore();
  }
  function hint(G) {
    const t = G.hintText; if (!t) return;
    g.textAlign = 'center'; g.font = `800 30px ${FONT}`;
    const w = Math.min(1000, g.measureText(t).width + 50);
    rr(g, HW / 2 - w / 2, HH - 150, w, 56, 28); g.fillStyle = 'rgba(200,16,46,0.85)'; g.fill();
    g.fillStyle = '#fff'; fit(g, t, 960, 30, 800); g.fillText(t, HW / 2, HH - 121);
  }
  return H;
}
