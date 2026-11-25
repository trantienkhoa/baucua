// Bảng nhánh đấu trên màn LED (titantron): người thua bị gạch X đỏ rồi bay khỏi bảng,
// người thắng trượt sang cột vòng sau; hết vòng thì cả bảng trượt sang trái để mở vòng mới.
const RN = ['VÒNG 16', 'TỨ KẾT', 'BÁN KẾT', 'CHUNG KẾT', 'VÔ ĐỊCH'];
const ease = x => (x = Math.min(1, Math.max(0, x)), x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function fitText(g, t, max, size, weight = 800) { let s = size; g.font = `${weight} ${s}px "Segoe UI", Arial, sans-serif`; while (g.measureText(t).width > max && s > 14) { s -= 2; g.font = `${weight} ${s}px "Segoe UI", Arial, sans-serif`; } }

export function createLed(tex) {
  const cv = tex.userData.cv, g = tex.userData.g, W = cv.width, H = cv.height;
  const L = { active: false, ri: 0, rounds: null, anims: [], slide: 0, t: 0, dirty: true, hp: null };
  // vị trí ô của cột (cột 0 = vòng hiện tại, cột 1 = vòng sau), theo vòng ri
  function layout(ri) {
    const n = ri === 0 ? 16 : ri === 1 ? 8 : ri === 2 ? 4 : 2;   // số người ở vòng ri
    const cols = [];
    const top = 92, bottom = H - 24;
    if (ri === 0) {
      // 16 người: 2 cột nhỏ, mỗi cột 4 cặp
      const cw = 360, ch = 50;
      for (let i = 0; i < 16; i++) {
        const c = Math.floor(i / 8), k = i % 8, pair = Math.floor(k / 2);
        const y = top + pair * ((bottom - top) / 4) + (k % 2) * (ch + 6) + 10;
        cols.push({ x: 30 + c * 390, y, w: cw, h: ch });
      }
    } else {
      const cw = ri === 3 ? 520 : 470, ch = ri >= 2 ? 78 : 60;
      for (let i = 0; i < n; i++) {
        const pair = Math.floor(i / 2), np = n / 2;
        const slotH = (bottom - top) / np;
        const y = top + pair * slotH + (slotH - (ch * 2 + 10)) / 2 + (i % 2) * (ch + 10);
        cols.push({ x: 40, y, w: cw, h: ch });
      }
    }
    // cột vòng sau
    const nn = n / 2, next = [];
    const nw = ri === 0 ? 400 : ri === 3 ? 520 : 470, nh = ri === 0 ? 60 : ri >= 2 ? 78 : 64;
    for (let i = 0; i < nn; i++) {
      const np = Math.max(1, nn / 2), slotH = (bottom - top) / np, pair = Math.floor(i / 2);
      const y = nn === 1 ? (top + bottom) / 2 - nh / 2 : top + pair * slotH + (slotH - (nh * 2 + 10)) / 2 + (i % 2) * (nh + 10);
      next.push({ x: W - nw - 40, y, w: nw, h: nh });
    }
    return { cur: cols, next };
  }
  L.show = (rounds, ri) => { L.rounds = rounds; L.ri = ri; L.active = true; L.anims = []; L.slide = 0; L.dirty = true; L.state = {}; };
  L.hide = () => { L.active = false; };
  // người thua ở ô slot (vòng hiện tại) → X đỏ + bay đi; người thắng trượt sang ô vòng sau
  L.result = (slotLose, slotWin) => {
    const st = L.state;
    st[slotLose] = { x: 0, t: 0 };   // bắt đầu gạch
    L.anims.push({ type: 'lose', slot: slotLose, t: 0 });
    L.anims.push({ type: 'win', slot: slotWin, to: Math.floor(slotWin / 2), t: -0.9 });
    L.dirty = true;
  };
  L.nextRound = () => { L.anims.push({ type: 'slide', t: 0 }); L.dirty = true; };
  L.busy = () => L.anims.length > 0;
  L.update = (dt, hpOf) => {
    if (!L.active) return;
    L.t += dt;
    for (const a of L.anims) a.t += dt;
    const doneSlide = L.anims.find(a => a.type === 'slide' && a.t > 1.1);
    if (doneSlide) { L.ri = Math.min(4, L.ri + 1); L.state = {}; L.anims = L.anims.filter(a => a !== doneSlide && a.type !== 'lose' && a.type !== 'win'); }
    L.anims = L.anims.filter(a => !(a.type === 'lose' && a.t > 2.2));
    // vẽ lại liên tục khi đang chạy hiệu ứng hoặc mỗi 0,25 giây (cập nhật máu)
    L.acc = (L.acc || 0) + dt;
    if (L.anims.length || L.dirty || L.acc > 0.25) { L.acc = 0; L.dirty = false; draw(hpOf); tex.needsUpdate = true; }
  };
  function card(c, w, opts = {}) {
    const { alpha = 1, glow = 0, lost = false, dx = 0, dy = 0, rot = 0, scale = 1, hp } = opts;
    g.save(); g.globalAlpha = alpha;
    g.translate(c.x + c.w / 2 + dx, c.y + c.h / 2 + dy); g.rotate(rot); g.scale(scale, scale);
    const x = -c.w / 2, y = -c.h / 2;
    if (glow > 0) { g.shadowColor = '#ffd23f'; g.shadowBlur = 30 * glow; }
    rr(g, x, y, c.w, c.h, 12); g.fillStyle = lost ? 'rgba(60,10,14,0.92)' : 'rgba(18,22,36,0.94)'; g.fill();
    g.shadowBlur = 0;
    g.lineWidth = 3; g.strokeStyle = glow > 0 ? '#ffd23f' : 'rgba(255,255,255,0.25)'; g.stroke();
    if (w) {
      g.fillStyle = w.def.attire || '#e8202a'; rr(g, x, y, 14, c.h, 6); g.fill();
      const main = w.user ? w.user.name : w.def.name, sub = w.user ? w.def.name : (w.def.nick || '');
      const big = c.h >= 70 ? 34 : c.h >= 58 ? 28 : 24;
      g.textAlign = 'left'; g.textBaseline = 'middle';
      fitText(g, main, c.w - 40, big, 900); g.fillStyle = lost ? '#ff9a9a' : '#fff'; g.fillText(main, x + 26, y + c.h * (sub ? 0.38 : 0.5));
      if (sub) { fitText(g, sub, c.w - 40, Math.round(big * 0.55), 700); g.fillStyle = '#ffd23f'; g.fillText(sub, x + 26, y + c.h * 0.76); }
      if (hp != null) { const bw = c.w - 40; g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + 26, y + c.h - 7, bw, 4); g.fillStyle = hp < 0.3 ? '#ff3b3b' : '#3dff6e'; g.fillRect(x + 26, y + c.h - 7, bw * Math.max(0, hp), 4); }
    } else { g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 26px "Segoe UI", Arial'; g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillText('?', 0, 2); }
    g.restore();
  }
  function cross(c, k, dx = 0, dy = 0, rot = 0) {
    g.save(); g.translate(c.x + c.w / 2 + dx, c.y + c.h / 2 + dy); g.rotate(rot);
    const s = Math.min(c.h * 0.9, 80) * (1.6 - 0.6 * ease(k));
    g.globalAlpha = Math.min(1, k * 2); g.strokeStyle = '#ff1a1a'; g.lineCap = 'round'; g.lineWidth = 12; g.shadowColor = '#ff0000'; g.shadowBlur = 18;
    g.beginPath(); g.moveTo(-s, -s * 0.55); g.lineTo(s, s * 0.55); g.moveTo(s, -s * 0.55); g.lineTo(-s, s * 0.55); g.stroke();
    g.restore();
  }
  function draw(hpOf) {
    g.fillStyle = '#05060c'; g.fillRect(0, 0, W, H);
    const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, 'rgba(200,16,46,0.35)'); grd.addColorStop(1, 'rgba(29,79,216,0.35)');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 2; for (let i = -20; i < 40; i++) { g.beginPath(); g.moveTo(i * 60, H); g.lineTo(i * 60 + 300, 0); g.stroke(); }
    const ri = L.ri, R = L.rounds; if (!R) return;
    const slide = L.anims.find(a => a.type === 'slide');
    const sk = slide ? ease(slide.t / 1.1) : 0;
    const off = -sk * W * 0.62;
    // tiêu đề
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 52px Impact, "Arial Black", sans-serif';
    g.lineWidth = 8; g.strokeStyle = '#000'; const title = `${RN[ri]}  ➜  ${RN[ri + 1] || ''}`;
    g.strokeText(title, W / 2, 46); g.fillStyle = '#ffd23f'; g.fillText(title, W / 2, 46);
    if (ri >= 4) { // nhà vô địch
      const ch = R[3] && R[3][0] && R[3][0].winner;
      card({ x: W / 2 - 300, y: H / 2 - 60, w: 600, h: 120 }, ch, { glow: 1 }); return;
    }
    const lay = layout(ri);
    const players = [];   // danh sách người ở vòng ri theo thứ tự ô
    for (const m of R[ri] || []) { players.push(m[0], m[1]); }
    // đường nối
    g.strokeStyle = 'rgba(255,210,63,0.35)'; g.lineWidth = 3;
    for (let i = 0; i < lay.cur.length; i += 2) {
      const a = lay.cur[i], b = lay.cur[i + 1], n = lay.next[i / 2]; if (!a || !b || !n) continue;
      const mx = (a.x + a.w + n.x) / 2 + off;
      g.beginPath(); g.moveTo(a.x + a.w + off, a.y + a.h / 2); g.lineTo(mx, a.y + a.h / 2); g.lineTo(mx, b.y + b.h / 2); g.lineTo(b.x + b.w + off, b.y + b.h / 2); g.moveTo(mx, (a.y + b.y + b.h) / 2); g.lineTo(n.x + off, n.y + n.h / 2); g.stroke();
    }
    // cột vòng sau
    const nextPlayers = [];
    for (let i = 0; i < lay.next.length; i++) { const m = (R[ri] || [])[i]; nextPlayers.push(m && m.winner && !L.anims.some(a => a.type === 'win' && a.to === i && a.t < 0.9) ? m.winner : null); }
    lay.next.forEach((c, i) => card(c, nextPlayers[i], { dx: off, glow: nextPlayers[i] ? 0.4 : 0 }));
    // cột hiện tại
    lay.cur.forEach((c, i) => {
      const w = players[i]; if (!w) { card(c, null, { dx: off }); return; }
      const m = R[ri][Math.floor(i / 2)];
      const lostA = L.anims.find(a => a.type === 'lose' && a.slot === i);
      const isLoser = m && m.winner && m.winner !== w;
      if (lostA) {
        const k = lostA.t;
        if (k < 0.9) { card(c, w, { dx: off + Math.sin(k * 60) * 4 * (k < 0.5 ? 1 : 0), lost: true, hp: 0 }); cross(c, k / 0.4, off); }
        else { const f = ease((k - 0.9) / 1.2); card(c, w, { dx: off - f * 500, dy: f * 520 - Math.sin(f * Math.PI) * 120, rot: -f * 2.4, scale: 1 - f * 0.4, alpha: 1 - f, lost: true }); cross(c, 1, off - f * 500, f * 520 - Math.sin(f * Math.PI) * 120, -f * 2.4); }
        return;
      }
      if (isLoser) return;   // đã bay đi
      const winA = L.anims.find(a => a.type === 'win' && a.slot === i && a.t > 0);
      const hp = hpOf && !(m && m.winner) ? hpOf(w) : null;
      if (winA && winA.t < 0.9) {
        const f = ease(winA.t / 0.9), n = lay.next[winA.to];
        card(c, w, { glow: 1, dx: off });
        card({ x: c.x + (n.x - c.x) * f, y: c.y + (n.y - c.y) * f, w: c.w + (n.w - c.w) * f, h: c.h + (n.h - c.h) * f }, w, { glow: 1, dx: off });
        return;
      }
      card(c, w, { dx: off, glow: m && m.winner === w ? 0.6 : 0, hp });
    });
    if (slide) { // vòng mới trượt vào
      g.globalAlpha = sk; g.font = '900 64px Impact, sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'center';
      g.fillText(RN[ri + 1] || '', W * 0.7, H / 2); g.globalAlpha = 1;
    }
  }
  return L;
}
