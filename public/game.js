// Vũ Trường Neon — màn hình game 1080×1920
(() => {
  const W = 1080, H = 1920;
  const cv = document.getElementById('c');
  const ctx = cv.getContext('2d');
  const params = new URLSearchParams(location.search);
  const OBS = params.has('obs');
  if (OBS) document.body.classList.add('obs');
  const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
  const PI = Math.PI, TAU = PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- khung hình ----------
  let dpr = 1, viewScale = 1;
  function resize() {
    const ww = window.innerWidth, wh = window.innerHeight;
    viewScale = Math.min(ww / W, wh / H);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const q = S.quality === 'low' ? 0.6 : S.quality === 'medium' ? 0.8 : 1;
    const cw = Math.round(W * viewScale), ch = Math.round(H * viewScale);
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    const pxScale = Math.min(viewScale * dpr, 1) * q;
    cv.width = Math.round(W * pxScale); cv.height = Math.round(H * pxScale);
    baseScale = pxScale;
  }
  let baseScale = 1;

  // ---------- trạng thái ----------
  let S = {
    quality: 'high', maxDancers: 150, idleSeconds: 420, zoomMin: 3, zoomMax: 6, camZoom: 2.4, heatTarget: 0, fireSeconds: 15,
    showComments: true, autoCam: true, showTop: true, topDJ: true, showCoins: false, showGiftMenu: true, showJoinTicker: true,
    tierNoble: 99, tierKing: 299, tierEmperor: 999, actions: [], musicEnabled: true, synthMusic: true, volume: 0.35,
  };
  let ACTIONS = [];
  let GIFTS = {};
  let TOP = [];
  let viewers = 0;
  const dancers = new Map();   // id -> Dancer
  const clones = [];
  let heat = 0, fireUntil = 0, fireStart = 0;
  const zoomQueue = [];
  let zoom = null;             // {d, action, until, start, label, icon, user}
  const ticker = [];           // {text, color}
  let tickerX = 0, tickerCur = null;
  const particles = [];
  const rockets = [];
  let flash = 0;
  let resident = null;         // DJ mặc định
  let djOverride = null;       // {id, until}

  const imgCache = new Map();
  function img(url) {
    if (!url) return null;
    let e = imgCache.get(url);
    if (!e) {
      e = { img: new Image(), ok: false };
      e.img.referrerPolicy = 'no-referrer';
      e.img.onload = () => e.ok = true;
      e.img.src = url;
      imgCache.set(url, e);
      if (imgCache.size > 1500) imgCache.delete(imgCache.keys().next().value);
    }
    return e.ok ? e.img : null;
  }

  // ---------- sàn & phối cảnh ----------
  const FLOOR_Y = 900;
  const zToY = z => 1000 + z * 590;
  const halfW = y => 360 + (y - FLOOR_Y) / (H - FLOOR_Y) * 480;
  const zToScale = z => 0.62 + z * 0.5;
  function floorPos(x, z) { const y = zToY(z); return { sx: W / 2 + x * halfW(y) * 0.9, sy: y, sc: zToScale(z) }; }

  // ---------- nhân vật ----------
  const SKIN = ['#f9d4b4', '#f1c09a', '#e0a77e', '#c98b62', '#a86c48', '#ffe0c7'];
  const HAIR = ['#1b1b1f', '#3b2416', '#6b3e1f', '#c98b2b', '#e8d27a', '#d64545', '#6f4ed8', '#2bb3c9', '#f07ac0', '#e6e6e6'];
  const CLOTH = ['#ff3d7f', '#ffb020', '#29d17d', '#2fa8ff', '#9b5cff', '#ff6a3d', '#16c7c7', '#f4f4f4', '#222631', '#ffd84d', '#e8487a', '#6be0ff', '#a3e635', '#c084fc'];
  const PANTS = ['#1f2a44', '#2a2a2e', '#3b5ba5', '#5b3b8a', '#e2e2e2', '#7a4b2a', '#0f766e', '#be185d'];
  const HOOD = ['#ffb4c8', '#ffffff', '#c6a27a', '#9be7ff', '#ffd27a', '#b3ffb8', '#d8b4ff', '#ff9f6b'];
  function randomLook() {
    return {
      skin: pick(SKIN), hair: pick(HAIR), hs: Math.floor(Math.random() * 5),
      shirt: pick(CLOTH), shirt2: pick(CLOTH), pants: pick(PANTS), shoes: pick(['#ffffff', '#111111', '#ff3d7f', '#ffd84d', '#2fa8ff']),
      hood: Math.random() < 0.38 ? 1 + Math.floor(Math.random() * 5) : 0, hoodColor: pick(HOOD),
      stripe: Math.random() < 0.4, glasses: Math.random() < 0.18,
    };
  }

  function limb(x, y, a1, l1, a2, l2, w1, w2, c1, c2) {
    const ex = x + Math.sin(a1) * l1, ey = y + Math.cos(a1) * l1;
    const b = a1 + a2;
    const hx = ex + Math.sin(b) * l2, hy = ey + Math.cos(b) * l2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = c1; ctx.lineWidth = w1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = c2; ctx.lineWidth = w2;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    return [hx, hy, b];
  }

  function rotP(px, py, a) { const c = Math.cos(a), s = Math.sin(a); return [px * c - py * s, px * s + py * c]; }

  // vẽ 1 nhân vật; (x,y) là chân, sc là tỉ lệ. Trả về đỉnh đầu (để gắn ảnh đại diện)
  function drawChar(look, p, x, y, sc, fx) {
    const h = 150 * sc;
    const lift = -p.lift * h;
    // bóng
    if (!fx || !fx.noShadow) {
      const sh = clamp(1 - p.lift * 0.6, 0.3, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(x + p.dx * h, y, 0.17 * h * sh, 0.045 * h * sh, 0, 0, TAU); ctx.fill();
    }
    ctx.save();
    ctx.translate(x + p.dx * h, y + lift);
    const hipY = p.sit ? -0.3 * h : -0.48 * h + p.bob * h;
    if (p.rot) { ctx.translate(0, hipY); ctx.rotate(p.rot); ctx.translate(0, -hipY); }
    let sp = p.spin; if (Math.abs(sp) < 0.18) sp = sp < 0 ? -0.18 : 0.18;
    ctx.scale(sp, 1);
    const back = p.spin < 0;

    const lean = p.lean;
    const [sxo, syo] = rotP(0, -0.3 * h, lean);
    const shX = sxo, shY = hipY + syo;
    const [hxo, hyo] = rotP(0, -0.13 * h, lean + p.head * 0.5);
    const headX = shX + hxo, headY = shY + hyo;
    const [slx, sly] = rotP(-0.1 * h, 0, lean);
    const thick = 0.085 * h;

    // cánh
    if (fx && fx.wings) drawWings(shX, shY + 0.05 * h, h, fx.t);

    // chân
    const tl = p.sit ? 0.11 * h : 0.25 * h, shl = 0.24 * h;
    const legs = [[-0.055 * h, p.lt, p.ls], [0.055 * h, p.rt, p.rs]];
    for (const [ox, a1, a2] of legs) {
      const s1 = p.sit ? (ox < 0 ? -0.9 : 0.9) : a1;
      const s2 = p.sit ? -s1 : a2;
      const [fxp, fyp, ang] = limb(ox, hipY, s1, tl, s2, shl, thick, thick * 0.9, look.pants, look.pants);
      ctx.fillStyle = look.shoes;
      ctx.save(); ctx.translate(fxp, fyp); ctx.rotate(-ang);
      ctx.beginPath(); ctx.ellipse(0, 0.01 * h, 0.05 * h, 0.03 * h, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // thân
    ctx.save();
    ctx.translate(0, hipY); ctx.rotate(lean);
    const tw = 0.21 * h, th = 0.33 * h;
    ctx.fillStyle = look.shirt;
    roundRect(-tw / 2, -th, tw, th + 0.03 * h, 0.07 * h); ctx.fill();
    if (look.stripe) { ctx.fillStyle = look.shirt2; ctx.fillRect(-tw / 2, -th * 0.55, tw, th * 0.16); }
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(-tw / 2, -0.02 * h, tw, 0.05 * h);
    ctx.restore();

    // tay
    const arms = [[-1, p.lu, p.lf], [1, p.ru, p.rf]];
    for (const [sd, a1, a2] of arms) {
      const bx = shX + (sd < 0 ? slx : -slx), by = shY + (sd < 0 ? sly : -sly);
      const [hx, hy] = limb(bx, by + 0.02 * h, a1 + lean, 0.16 * h, a2, 0.15 * h, thick * 0.85, thick * 0.7, look.shirt, look.skin);
      ctx.fillStyle = look.skin; ctx.beginPath(); ctx.arc(hx, hy, 0.038 * h, 0, TAU); ctx.fill();
    }

    // đầu
    const r = 0.115 * h;
    ctx.save(); ctx.translate(headX, headY); ctx.rotate(p.head + lean);
    if (look.hood) {
      ctx.fillStyle = look.hoodColor;
      drawEars(look.hood, r);
      ctx.beginPath(); ctx.arc(0, 0, r * 1.22, 0, TAU); ctx.fill();
      ctx.fillStyle = look.skin; ctx.beginPath(); ctx.arc(0, r * 0.12, r * 0.86, 0, TAU); ctx.fill();
      if (back) { ctx.fillStyle = look.hoodColor; ctx.beginPath(); ctx.arc(0, 0, r * 1.22, 0, TAU); ctx.fill(); }
    } else {
      ctx.fillStyle = look.skin; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      drawHair(look, r, back);
    }
    if (!back) {
      ctx.fillStyle = '#1a1a22';
      const blink = (fx && fx.t % 3.7 < 0.12) ? 0.25 : 1;
      ctx.beginPath(); ctx.ellipse(-r * 0.36, r * 0.05, r * 0.11, r * 0.15 * blink, 0, 0, TAU); ctx.ellipse(r * 0.36, r * 0.05, r * 0.11, r * 0.15 * blink, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * 0.32, 0, r * 0.04, 0, TAU); ctx.arc(r * 0.4, 0, r * 0.04, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#7a2b2b'; ctx.lineWidth = Math.max(1, r * 0.09); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, r * 0.32, r * 0.25, 0.15 * PI, 0.85 * PI); ctx.stroke();
      ctx.fillStyle = 'rgba(255,90,120,0.35)';
      ctx.beginPath(); ctx.arc(-r * 0.6, r * 0.35, r * 0.14, 0, TAU); ctx.arc(r * 0.6, r * 0.35, r * 0.14, 0, TAU); ctx.fill();
      if (look.glasses) {
        ctx.fillStyle = 'rgba(10,10,20,0.92)';
        roundRect(-r * 0.75, -r * 0.12, r * 0.62, r * 0.36, r * 0.12); ctx.fill();
        roundRect(r * 0.13, -r * 0.12, r * 0.62, r * 0.36, r * 0.12); ctx.fill();
        ctx.fillRect(-r * 0.15, -r * 0.05, r * 0.3, r * 0.08);
      }
    }
    if (fx && fx.crown) drawCrown(r);
    ctx.restore();
    ctx.restore();

    // đỉnh đầu trong toạ độ màn hình (xấp xỉ)
    const ty = y + lift + (p.rot && Math.abs(Math.cos(p.rot)) < 0.5 ? hipY : headY - r * 1.3);
    return { x: x + p.dx * h + headX * sp, y: Math.min(ty, y + lift + hipY) };
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawEars(type, r) {
    ctx.beginPath();
    if (type === 1) { // mèo
      ctx.moveTo(-r * 1.1, -r * 0.4); ctx.lineTo(-r * 0.8, -r * 1.55); ctx.lineTo(-r * 0.2, -r * 1.05);
      ctx.moveTo(r * 1.1, -r * 0.4); ctx.lineTo(r * 0.8, -r * 1.55); ctx.lineTo(r * 0.2, -r * 1.05);
      ctx.fill();
    } else if (type === 2) { // thỏ
      ctx.ellipse(-r * 0.45, -r * 1.6, r * 0.25, r * 0.75, -0.15, 0, TAU); ctx.ellipse(r * 0.45, -r * 1.6, r * 0.25, r * 0.75, 0.15, 0, TAU); ctx.fill();
    } else if (type === 3) { // gấu
      ctx.arc(-r * 0.85, -r * 0.9, r * 0.38, 0, TAU); ctx.arc(r * 0.85, -r * 0.9, r * 0.38, 0, TAU); ctx.fill();
    } else if (type === 4) { // khủng long
      for (let i = -2; i <= 2; i++) { ctx.moveTo(i * r * 0.32 - r * 0.16, -r * 1.12 + Math.abs(i) * r * 0.12); ctx.lineTo(i * r * 0.32, -r * 1.55 + Math.abs(i) * r * 0.15); ctx.lineTo(i * r * 0.32 + r * 0.16, -r * 1.12 + Math.abs(i) * r * 0.12); }
      ctx.fill();
    } else { // kỳ lân
      ctx.save(); ctx.fillStyle = '#ffd84d'; ctx.moveTo(-r * 0.15, -r * 1.1); ctx.lineTo(0, -r * 1.9); ctx.lineTo(r * 0.15, -r * 1.1); ctx.fill(); ctx.restore();
    }
  }
  function drawHair(look, r, back) {
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    switch (look.hs) {
      case 0: ctx.arc(0, -r * 0.1, r * 1.03, PI * 1.05, PI * 1.95); ctx.lineTo(r * 0.9, -r * 0.2); ctx.quadraticCurveTo(0, -r * 0.55, -r * 0.95, -r * 0.2); break;
      case 1: ctx.arc(0, -r * 0.05, r * 1.1, PI, TAU); ctx.lineTo(r * 1.1, r * 1.2); ctx.lineTo(r * 0.7, r * 1.2); ctx.lineTo(r * 0.75, -r * 0.3); ctx.quadraticCurveTo(0, -r * 0.7, -r * 0.75, -r * 0.3); ctx.lineTo(-r * 0.7, r * 1.2); ctx.lineTo(-r * 1.1, r * 1.2); break;
      case 2: for (let i = -3; i <= 3; i++) { ctx.moveTo(i * r * 0.28 - r * 0.2, -r * 0.5); ctx.lineTo(i * r * 0.32, -r * 1.45 + Math.abs(i) * r * 0.1); ctx.lineTo(i * r * 0.28 + r * 0.2, -r * 0.5); } ctx.arc(0, -r * 0.2, r * 0.95, PI * 1.1, PI * 1.9); break;
      case 3: ctx.arc(0, -r * 1.15, r * 0.42, 0, TAU); ctx.moveTo(r, -r * 0.1); ctx.arc(0, -r * 0.1, r * 1.02, 0, PI, true); break;
      default: ctx.arc(0, -r * 0.15, r * 1.05, PI * 1.1, PI * 1.9); ctx.quadraticCurveTo(r * 0.3, -r * 0.2, -r * 0.2, -r * 0.6); break;
    }
    ctx.fill();
    if (back) { ctx.beginPath(); ctx.arc(0, 0, r * 1.02, 0, TAU); ctx.fill(); }
  }
  function drawCrown(r) {
    ctx.fillStyle = '#ffcf33'; ctx.strokeStyle = '#a86b00'; ctx.lineWidth = r * 0.06;
    ctx.beginPath(); const y0 = -r * 0.95, w = r * 0.8;
    ctx.moveTo(-w, y0); ctx.lineTo(-w, y0 - r * 0.5); ctx.lineTo(-w * 0.5, y0 - r * 0.2); ctx.lineTo(0, y0 - r * 0.7); ctx.lineTo(w * 0.5, y0 - r * 0.2); ctx.lineTo(w, y0 - r * 0.5); ctx.lineTo(w, y0); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff3d7f'; ctx.beginPath(); ctx.arc(0, y0 - r * 0.25, r * 0.12, 0, TAU); ctx.fill();
  }
  function drawWings(x, y, h, t) {
    const f = Math.sin(t * 7) * 0.25;
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.translate(x, y); ctx.scale(sd, 1); ctx.rotate(-0.3 - f);
      const g = ctx.createLinearGradient(0, 0, h * 0.7, -h * 0.4);
      g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(180,220,255,0.85)');
      ctx.fillStyle = g; ctx.strokeStyle = 'rgba(120,170,255,0.9)'; ctx.lineWidth = h * 0.01;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(h * 0.3, -h * 0.55, h * 0.75, -h * 0.5);
      ctx.quadraticCurveTo(h * 0.6, -h * 0.3, h * 0.68, -h * 0.22);
      ctx.quadraticCurveTo(h * 0.45, -h * 0.12, h * 0.55, -h * 0.02);
      ctx.quadraticCurveTo(h * 0.3, h * 0.02, h * 0.36, h * 0.15);
      ctx.quadraticCurveTo(h * 0.15, h * 0.1, 0, 0);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  // ---------- người nhảy ----------
  let nextZ = 0;
  class Dancer {
    constructor(user, opts = {}) {
      this.id = user.id; this.name = user.name; this.avatar = user.avatar;
      this.look = randomLook();
      this.x = rand(-0.85, 0.85); this.z = rand(0.05, 0.95);
      this.tx = this.x; this.tz = this.z;
      this.dance = Math.floor(Math.random() * DANCES.length);
      this.offset = Math.random() < 0.6 ? 0 : Math.random() * 0.15;
      this.drop = opts.noDrop ? 0 : -rand(900, 1300); this.vy = 0; this.land = 0;
      this.lastActive = now(); this.born = now();
      this.mode = 'dance'; this.modeUntil = 0; this.modeStart = 0;
      this.giantUntil = 0; this.wingsUntil = 0; this.crownUntil = 0; this.pairWith = null; this.pairUntil = 0;
      this.comment = ''; this.commentUntil = 0;
      this.coins = 0; this.wanderAt = now() + rand(4, 12);
      this.sc = 1; this.leaving = 0; this.clone = !!opts.clone; this.cloneUntil = opts.cloneUntil || 0;
      this.pose = null; this.jumpStart = 0; this.zi = nextZ++;
    }
  }
  function now() { return performance.now() / 1000; }

  function tierOf(c) {
    if (c >= S.tierEmperor) return { name: 'Hoàng Đế', color: '#ff4d4d', ring: ['#ffe066', '#ff3d3d'] };
    if (c >= S.tierKing) return { name: 'Vua', color: '#ffcf33', ring: ['#fff3b0', '#ffb300'] };
    if (c >= S.tierNoble) return { name: 'Quý Tộc', color: '#5ee7ff', ring: ['#c8f7ff', '#2fa8ff'] };
    return null;
  }

  function onFloorCount() { let n = 0; for (const d of dancers.values()) if (!d.leaving) n++; return n; }

  function ensureDancer(user, silent) {
    let d = dancers.get(user.id);
    if (d) {
      if (user.name) d.name = user.name;
      if (user.avatar) d.avatar = user.avatar;
      d.lastActive = now();
      if (d.leaving) { d.leaving = 0; }
      return d;
    }
    // sàn đầy → người im lặng lâu nhất nhường chỗ
    const max = clamp(Number(S.maxDancers) || 150, 5, 1000);
    if (onFloorCount() >= max) {
      let old = null;
      for (const x of dancers.values()) {
        if (x.leaving || x.mode !== 'dance' || (zoom && zoom.d === x)) continue;
        if (!old || x.lastActive < old.lastActive) old = x;
      }
      if (old) old.leaving = now(); else return null;
    }
    d = new Dancer(user);
    dancers.set(user.id, d);
    if (!silent && S.showJoinTicker) pushTicker(`${d.name} lên sàn 🕺`, '#7cf7ff');
    return d;
  }

  function pushTicker(text, color) {
    ticker.push({ text, color });
    if (ticker.length > 30) ticker.splice(0, ticker.length - 30);
  }

  // ---------- lệnh từ bình luận ----------
  const DANCE_KEYS = [];
  DANCES.forEach((d, i) => d.keys.forEach(k => DANCE_KEYS.push([normText(k), i])));
  DANCE_KEYS.sort((a, b) => b[0].length - a[0].length);

  function handleCommand(d, text) {
    const t = normText(text);
    if (!t) return;
    const num = t.match(/^(?:dieu\s*)?(\d{1,2})$/);
    if (num) { const n = +num[1]; if (n >= 1 && n <= DANCES.length) { d.dance = n - 1; sparkle(d, 6); } return; }
    if (/\bdi vong\b|\bdi dao\b/.test(t)) { d.mode = 'circle'; d.modeStart = now(); d.modeUntil = now() + 10; d.circleA = Math.random() * TAU; return; }
    if (/\bghep doi\b/.test(t)) { makePair(d); return; }
    if (/\bdoi do\b|\bthay do\b/.test(t)) { d.look = randomLook(); sparkle(d, 14); return; }
    for (const [k, i] of DANCE_KEYS) {
      if (k.length < 2) continue;
      if (t === k || t.startsWith(k + ' ') || t.endsWith(' ' + k) || t.includes(' ' + k + ' ')) { d.dance = i; sparkle(d, 6); return; }
    }
    if (/^nhay\b|\bnhay$/.test(t)) { d.jumpStart = now(); return; }
  }

  function makePair(d) {
    const cands = [...dancers.values()].filter(x => x !== d && !x.leaving && !x.clone && x.mode === 'dance' && !x.pairWith);
    if (!cands.length) return;
    const o = pick(cands);
    const until = now() + 20;
    d.pairWith = o; o.pairWith = d; d.pairUntil = o.pairUntil = until;
    o.tx = clamp(d.x + 0.18, -0.9, 0.9); o.tz = d.z; d.tx = clamp(o.tx - 0.18, -0.9, 0.9); d.tz = d.z;
    d.dance = o.dance = 7;
    return o;
  }

  // ---------- quà → hành động ----------
  function actionFor(ev) {
    if (ev.forceAction) return ev.forceAction;
    const name = String(ev.gift && ev.gift.name || '').toLowerCase();
    const acts = S.actions || [];
    const byGift = acts.filter(a => a.gift && a.gift.toLowerCase() === name).sort((a, b) => (b.min || 0) - (a.min || 0));
    if (byGift.length) return byGift[0].id;
    const val = ev.value || 0;
    let best = null;
    for (const a of acts) { if (a.gift) continue; if ((a.min || 0) <= val && (!best || (a.min || 0) > (best.min || 0))) best = a; }
    if (!best) for (const a of acts) if ((a.min || 0) <= val && (!best || (a.min || 0) > (best.min || 0))) best = a;
    return best ? best.id : 'camera';
  }
  function actionMeta(id) { return ACTIONS.find(a => a.id === id) || { id, label: id, icon: '🎁' }; }

  function handleGift(ev) {
    const d = ensureDancer(ev.user);
    if (!d) return;
    d.coins = ev.total || (d.coins + ev.value);
    const id = actionFor(ev);
    const m = actionMeta(id);
    const v = Math.max(1, ev.value || 1);
    const dur = clamp(Number(S.zoomMin) + (Number(S.zoomMax) - Number(S.zoomMin)) * Math.min(1, Math.log10(v) / 3), 1, 30);
    zoomQueue.push({ d, id, label: m.label, icon: m.icon, gift: ev.gift, count: ev.count, dur });
    if (zoomQueue.length > 60) zoomQueue.splice(0, zoomQueue.length - 60);
    pushTicker(`${d.name} tặng ${ev.count > 1 ? ev.count + '× ' : ''}${ev.gift.name} → ${m.label}`, '#ffd84d');
    heat += v * 2;
  }

  function startAction(z) {
    const d = z.d, t = now();
    if (!dancers.has(d.id) && !d.clone) return;
    d.lastActive = t;
    switch (z.id) {
      case 'outfit': d.look = randomLook(); sparkle(d, 30); break;
      case 'catwalk': d.mode = 'catwalk'; d.modeStart = t; d.modeUntil = t + Math.max(z.dur, 6); d.tx = 0; d.tz = 0.92; break;
      case 'jump': d.jumpStart = t; break;
      case 'fireworks': for (let i = 0; i < 6; i++) setTimeout(launchRocket, i * 300); break;
      case 'balloons': balloons(70); break;
      case 'giant': d.giantUntil = t + 25; break;
      case 'pair': makePair(d); break;
      case 'clone': {
        for (let i = 0; i < 3; i++) {
          const c = new Dancer({ id: d.id + '#c' + Math.random(), name: d.name, avatar: d.avatar }, { clone: true, cloneUntil: t + 25, noDrop: false });
          c.look = d.look; c.dance = d.dance; c.x = clamp(d.x + (i - 1) * 0.25, -0.9, 0.9); c.tx = c.x; c.z = clamp(d.z + rand(-0.1, 0.1), 0, 1); c.tz = c.z;
          clones.push(c);
        }
        break;
      }
      case 'wings': d.wingsUntil = t + 30; break;
      case 'dj': djOverride = { id: d.id, until: t + 30 }; break;
      case 'rocket': d.mode = 'rocket'; d.modeStart = t; d.modeUntil = t + 4.5; break;
      case 'cloud': d.mode = 'cloud'; d.modeStart = t; d.modeUntil = t + 20; break;
      case 'throne': d.mode = 'throne'; d.modeStart = t; d.modeUntil = t + 25; break;
      case 'king': d.crownUntil = t + 60; d.wingsUntil = t + 30; for (let i = 0; i < 4; i++) setTimeout(launchRocket, i * 250); confetti(120); break;
    }
  }

  // ---------- hạt hiệu ứng ----------
  const qMul = () => S.quality === 'low' ? 0.3 : S.quality === 'medium' ? 0.6 : 1;
  function sparkle(d, n) {
    const p = dancerScreen(d);
    for (let i = 0; i < n * qMul(); i++) particles.push({ x: p.sx + rand(-40, 40) * p.sc, y: p.sy - rand(0, 160) * p.sc, vx: rand(-60, 60), vy: rand(-160, -30), g: 80, life: rand(0.5, 1.1), max: 1.1, color: pick(['#fff', '#ffd84d', '#7cf7ff', '#ff7ad9']), size: rand(3, 7), type: 'star' });
  }
  function launchRocket() {
    rockets.push({ x: rand(150, 930), y: 900, vy: rand(-1100, -900), ty: rand(150, 500), color: pick(['#ff3d7f', '#ffd84d', '#7cf7ff', '#a3e635', '#c084fc', '#ff8a3d']) });
  }
  function explode(x, y, color) {
    const n = Math.round(80 * qMul()) + 10;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = rand(150, 520);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 220, drag: 0.97, life: rand(0.9, 1.6), max: 1.6, color: Math.random() < 0.2 ? '#fff' : color, size: rand(3, 6), type: 'spark' });
    }
    flash = Math.max(flash, 0.25);
  }
  function balloons(n) {
    n = Math.round(n * (0.4 + 0.6 * qMul()));
    for (let i = 0; i < n; i++) particles.push({ x: rand(30, 1050), y: H + rand(0, 900), vx: rand(-20, 20), vy: rand(-320, -200), g: 0, life: 8, max: 8, color: pick(['#ff3d7f', '#ffd84d', '#2fa8ff', '#29d17d', '#9b5cff', '#ff8a3d']), size: rand(28, 46), type: 'balloon', wob: Math.random() * TAU });
  }
  function confetti(n) {
    n = Math.round(n * qMul());
    for (let i = 0; i < n; i++) particles.push({ x: rand(0, W), y: rand(-200, 0), vx: rand(-60, 60), vy: rand(150, 380), g: 30, life: 5, max: 5, color: pick(['#ff3d7f', '#ffd84d', '#7cf7ff', '#a3e635', '#c084fc', '#fff']), size: rand(8, 16), type: 'confetti', rot: Math.random() * TAU, vr: rand(-8, 8) });
  }
  function hearts(x, y, n) {
    for (let i = 0; i < n; i++) particles.push({ x: x + rand(-30, 30), y, vx: rand(-30, 30), vy: rand(-140, -80), g: 0, life: 1.8, max: 1.8, color: pick(['#ff3d7f', '#ff7ab8', '#ff4d6d']), size: rand(14, 24), type: 'heart' });
  }

  // ---------- vị trí nhân vật ----------
  function djPos() { return { sx: W / 2, sy: 815, sc: 0.95 }; }
  function dancerScreen(d) {
    const t = now();
    if (d === currentDJ()) return djPos();
    if (d.mode === 'rocket') {
      const k = (t - d.modeStart) / 4.5, base = floorPos(d.x, d.z);
      const up = k < 0.45 ? Math.pow(k / 0.45, 2) : k < 0.6 ? 1 : 1 - Math.pow((k - 0.6) / 0.4, 2);
      return { sx: base.sx, sy: base.sy - up * 1300, sc: base.sc, base };
    }
    if (d.mode === 'cloud') {
      const k = t - d.modeStart, a = k * 0.6;
      const enter = Math.min(1, k / 2), leave = Math.min(1, (d.modeUntil - t) / 2);
      const e = Math.min(enter, leave);
      const fp = floorPos(Math.sin(a) * 0.65, 0.45 + Math.sin(a * 2) * 0.3);
      const base = floorPos(d.x, d.z);
      return { sx: base.sx + (fp.sx - base.sx) * e, sy: base.sy + (fp.sy - 230 - base.sy) * e, sc: base.sc + (fp.sc * 1.05 - base.sc) * e, base };
    }
    if (d.mode === 'throne') return floorPos(0, 0.9);
    return floorPos(d.x, d.z);
  }
  function currentDJ() {
    const t = now();
    const free = d => d && !d.leaving && (d.mode === 'dance' || d.mode === 'circle') && !d.pairWith;
    if (djOverride && t < djOverride.until) { const d = dancers.get(djOverride.id); if (free(d)) return d; }
    if (S.topDJ && TOP.length) { const d = dancers.get(TOP[0].id); if (free(d)) return d; }
    return resident;
  }

  // ---------- cập nhật ----------
  let lastT = now();
  function update() {
    const t = now(); const dt = Math.min(0.05, t - lastT); lastT = t;
    Music.update();
    const fire = t < fireUntil;

    // nhiệt sàn
    const target = Number(S.heatTarget) > 0 ? Number(S.heatTarget) : clamp(Math.round(viewers * 4 / 50) * 50, 150, 3000);
    curHeatTarget = target;
    if (!fire && heat >= target) { fireUntil = t + Number(S.fireSeconds || 15); fireStart = t; heat = 0; confetti(150); flash = 0.6; pushTicker('🔥 SÀN CHÁY RỒI! 🔥', '#ff7a3d'); }
    if (!fire) heat = Math.max(0, heat - dt * target * 0.004);

    // zoom
    if (zoom && (t > zoom.until || (!dancers.has(zoom.d.id) && !zoom.d.clone))) zoom = null;
    if (!zoom && zoomQueue.length) {
      const z = zoomQueue.shift();
      if (dancers.has(z.d.id)) { z.start = t; z.until = t + z.dur; zoom = z; startAction(z); }
    }

    const all = [...dancers.values(), ...clones];
    const crowd = all.length;
    for (const d of all) {
      // rơi từ trần
      if (d.drop < 0) { d.vy += 2600 * dt; d.drop += d.vy * dt; if (d.drop >= 0) { d.drop = 0; d.land = t; d.vy = 0; } }
      // rời sàn
      if (!d.clone && !d.leaving && t - d.lastActive > Number(S.idleSeconds || 420) && d.mode === 'dance' && !(zoom && zoom.d === d)) d.leaving = t;
      if (d.clone && t > d.cloneUntil && !d.leaving) d.leaving = t;
      if (d.mode !== 'dance' && t > d.modeUntil) { d.mode = 'dance'; if (d.tz > 0.85) d.tz = rand(0.2, 0.8); }
      if (d.pairWith && t > d.pairUntil) d.pairWith = null;

      // di chuyển
      if (d.mode === 'dance' && t > d.wanderAt && !d.pairWith) { d.tx = clamp(d.x + rand(-0.3, 0.3), -0.9, 0.9); d.tz = clamp(d.z + rand(-0.2, 0.2), 0, 1); d.wanderAt = t + rand(6, 16); }
      if (d.mode === 'circle') { d.circleA += dt * 1.2; d.tx = clamp(Math.cos(d.circleA) * 0.55, -0.9, 0.9); d.tz = 0.5 + Math.sin(d.circleA) * 0.35; }
      const dx = d.tx - d.x, dz = d.tz - d.z, dist = Math.hypot(dx, dz * 1.5);
      const speed = d.mode === 'catwalk' ? 0.22 : 0.35;
      d.moving = dist > 0.02 && d.drop >= 0;
      if (d.moving) { const st = Math.min(dist, speed * dt); d.x += dx / dist * st; d.z += dz / dist * st * 0.67; d.face = dx < 0 ? -1 : 1; }
      // tách nhẹ khi ít người
      if (crowd < 220 && d.mode === 'dance') {
        for (const o of all) {
          if (o === d || o.pairWith === d) continue;
          const ex = d.x - o.x, ez = (d.z - o.z) * 1.6, dd = ex * ex + ez * ez;
          if (dd < 0.006 && dd > 0) { const f = (0.006 - dd) * 4 * dt; d.x += ex * f * 10; d.z += ez * f * 6; }
        }
        d.x = clamp(d.x, -0.95, 0.95); d.z = clamp(d.z, 0, 1);
      }
      if (d.mode === 'catwalk' && !d.moving && d.tz > 0.85 && t - d.modeStart > 1) { /* tạo dáng */ }
      if (d.mode === 'rocket' && Math.random() < 0.8) {
        const p = dancerScreen(d);
        particles.push({ x: p.sx + rand(-8, 8), y: p.sy + 10, vx: rand(-40, 40), vy: rand(150, 300), g: 0, life: 0.5, max: 0.5, color: pick(['#ffd84d', '#ff8a3d', '#ff3d3d', '#fff']), size: rand(6, 14), type: 'spark' });
      }
      if (d.pairWith && Math.random() < dt * 2.5) { const p = dancerScreen(d); hearts(p.sx, p.sy - 190 * p.sc, 1); }
      // độ lớn
      const tsc = t < d.giantUntil ? 2.1 : 1;
      d.sc += (tsc - d.sc) * Math.min(1, dt * 4);
    }
    for (const [id, d] of dancers) if (d.leaving && t - d.leaving > 1.2) dancers.delete(id);
    for (let i = clones.length - 1; i >= 0; i--) if (clones[i].leaving && t - clones[i].leaving > 1.2) clones.splice(i, 1);

    // hạt
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.y += r.vy * dt; r.vy += 600 * dt;
      particles.push({ x: r.x, y: r.y, vx: rand(-20, 20), vy: rand(20, 80), g: 0, life: 0.4, max: 0.4, color: '#ffe9a8', size: 4, type: 'spark' });
      if (r.y <= r.ty || r.vy > -100) { explode(r.x, r.y, r.color); rockets.splice(i, 1); }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt; if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += (p.g || 0) * dt; if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; }
      p.x += p.vx * dt; p.y += p.vy * dt; if (p.vr) p.rot += p.vr * dt;
      if (p.type === 'balloon') p.x += Math.sin(t * 2 + p.wob) * 20 * dt;
    }
    if (particles.length > 2500) particles.splice(0, particles.length - 2500);
    if (fire && S.quality !== 'low' && Math.random() < dt * 6) confetti(6);
    flash = Math.max(0, flash - dt * 1.5);
  }
  let curHeatTarget = 200;

  // ---------- camera ----------
  const cam = { x: W / 2, y: H / 2, z: 1 };
  function updateCam(dt) {
    let tx = W / 2, ty = H / 2, tz = 1;
    const t = now();
    if (zoom) {
      const p = dancerScreen(zoom.d);
      tz = Number(S.camZoom) || 2.4;
      tx = p.sx; ty = p.sy - 110 * p.sc * zoom.d.sc;
      if (zoom.id === 'fireworks' || zoom.id === 'balloons') { tz = Math.min(tz, 1.5); }
      if (zoom.d.mode === 'rocket') tz = Math.min(tz, 1.6);
    } else if (S.autoCam) {
      // máy quay tự lia
      const k = t * 0.07;
      tz = 1.08 + 0.06 * Math.sin(k * 2.1);
      tx = W / 2 + Math.sin(k) * 60; ty = H / 2 + Math.cos(k * 1.3) * 60;
      if (t < fireUntil) tz += 0.03 * Math.abs(Math.sin(Music.phase * PI));
    }
    const k = 1 - Math.pow(0.02, dt);
    cam.z += (tz - cam.z) * k; cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
    const hw = W / 2 / cam.z, hh = H / 2 / cam.z;
    cam.x = clamp(cam.x, hw, W - hw); cam.y = clamp(cam.y, hh, H - hh);
  }

  // ---------- vẽ ----------
  function beatInfo() {
    const fire = now() < fireUntil;
    let p = Music.phase, b = Music.beat;
    if (fire) { const f = p * 2; b = b * 2 + Math.floor(f); p = f - Math.floor(f); }
    return { p, b, fire };
  }

  function drawStage(t, bi) {
    // nền
    const g = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
    g.addColorStop(0, '#12041f'); g.addColorStop(0.5, '#2a0a45'); g.addColorStop(1, '#3d0d5e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR_Y + 40);

    // màn LED
    const lx = 130, ly = 230, lw = 820, lh = 430;
    ctx.fillStyle = '#07020f'; roundRect(lx - 12, ly - 12, lw + 24, lh + 24, 18); ctx.fill();
    const spec = Music.spectrum();
    const cols = 32, cw = lw / cols;
    for (let i = 0; i < cols; i++) {
      let v = spec ? spec[2 + Math.floor(i * 1.6)] / 255 : 0;
      if (!spec || Music.mode === 'none' || Music.suspended()) v = 0.35 + 0.3 * Math.sin(t * 3 + i * 0.5) * (1 - bi.p);
      const rows = 16, on = Math.round(v * rows);
      for (let r = 0; r < rows; r++) {
        const hue = (i * 8 + t * 40) % 360;
        ctx.fillStyle = r < on ? `hsla(${hue + r * 6},95%,${55 + r * 1.5}%,0.95)` : 'rgba(80,40,140,0.15)';
        ctx.fillRect(lx + i * cw + 2, ly + lh - (r + 1) * (lh / rows) + 2, cw - 4, lh / rows - 4);
      }
    }
    // biển neon
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const glow = 0.75 + 0.25 * (1 - bi.p);
    ctx.fillStyle = 'rgba(10,0,25,0.6)'; roundRect(250, 330, 580, 190, 30); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = `rgba(255,80,200,${glow})`; ctx.shadowColor = '#ff4fd8'; ctx.shadowBlur = S.quality === 'low' ? 0 : 30;
    roundRect(250, 330, 580, 190, 30); ctx.stroke();
    ctx.font = `900 46px ${FONT}`; ctx.fillStyle = '#ffd6f5'; ctx.fillText('VŨ TRƯỜNG', 540, 375);
    ctx.font = `900 112px ${FONT}`; ctx.shadowColor = '#41e8ff'; ctx.fillStyle = `rgba(200,250,255,${glow})`; ctx.fillText('NEON', 540, 460);
    ctx.restore();

    // đèn quét
    if (S.quality !== 'low') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const n = S.quality === 'high' ? 6 : 4;
      for (let i = 0; i < n; i++) {
        const sx = 100 + i * (880 / (n - 1)), a = Math.sin(t * 0.8 + i * 1.3) * 0.5;
        const col = ['255,60,200', '60,220,255', '255,220,60', '140,90,255', '60,255,150', '255,120,60'][i % 6];
        const gr = ctx.createLinearGradient(sx, 60, sx + Math.sin(a) * 900, 60 + Math.cos(a) * 900);
        gr.addColorStop(0, `rgba(${col},0.35)`); gr.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.moveTo(sx, 60);
        ctx.lineTo(sx + Math.sin(a - 0.12) * 1000, 60 + Math.cos(a - 0.12) * 1000);
        ctx.lineTo(sx + Math.sin(a + 0.12) * 1000, 60 + Math.cos(a + 0.12) * 1000);
        ctx.fill();
      }
      ctx.restore();
    }
    // giàn đèn
    ctx.fillStyle = '#3a3a48'; ctx.fillRect(0, 50, W, 22);
    ctx.strokeStyle = '#555566'; ctx.lineWidth = 3;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 50); ctx.lineTo(x + 30, 72); ctx.stroke(); }
    // cầu disco
    drawDiscoBall(540, 150, 62, t);

    // loa
    for (const sx of [40, 900]) {
      for (let k = 0; k < 2; k++) {
        const y0 = 520 + k * 190;
        ctx.fillStyle = '#16121f'; roundRect(sx, y0, 140, 180, 14); ctx.fill();
        ctx.strokeStyle = '#3a3150'; ctx.lineWidth = 4; ctx.stroke();
        const pulse = 1 + 0.06 * (1 - bi.p) * (bi.b % 1 === 0 ? 1 : 0);
        ctx.fillStyle = '#2a2438'; ctx.beginPath(); ctx.arc(sx + 70, y0 + 110, 48 * pulse, 0, TAU); ctx.fill();
        ctx.fillStyle = '#0c0a12'; ctx.beginPath(); ctx.arc(sx + 70, y0 + 110, 30 * pulse, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2a2438'; ctx.beginPath(); ctx.arc(sx + 70, y0 + 40, 20, 0, TAU); ctx.fill();
      }
    }
    // sân khấu
    const sg = ctx.createLinearGradient(0, 840, 0, FLOOR_Y + 10);
    sg.addColorStop(0, '#2b1d45'); sg.addColorStop(1, '#130c22');
    ctx.fillStyle = sg; ctx.fillRect(0, 845, W, FLOOR_Y - 845 + 10);
    for (let i = 0; i < 18; i++) {
      const on = (i + bi.b) % 3 === 0;
      ctx.fillStyle = on ? `hsl(${(i * 30 + t * 60) % 360},100%,65%)` : '#3a2a55';
      ctx.beginPath(); ctx.arc(30 + i * 60, 885, 7, 0, TAU); ctx.fill();
    }
  }

  function drawDiscoBall(x, y, r, t) {
    ctx.strokeStyle = '#888'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, y - r); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    ctx.fillStyle = '#9aa0b4'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    const rot = t * 0.8, n = 10;
    for (let row = 0; row < n; row++) {
      const lat = -PI / 2 + (row + 0.5) * PI / n, yy = y + Math.sin(lat) * r, rr = Math.cos(lat) * r;
      const cols = Math.max(4, Math.round(16 * Math.cos(lat)));
      for (let c = 0; c < cols; c++) {
        const lon = rot + c * TAU / cols; const cz = Math.cos(lon); if (cz < 0) continue;
        const xx = x + Math.sin(lon) * rr;
        const b = 120 + 135 * Math.abs(Math.sin(lon * 3 + row + t * 2));
        ctx.fillStyle = `rgb(${b},${b},${Math.min(255, b + 20)})`;
        ctx.fillRect(xx - 5 * cz, yy - 5, 10 * cz, 10);
      }
    }
    ctx.restore();
    if (S.quality !== 'low') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const a = t * 1.5 + i * 1.7, sx = x + Math.cos(a) * r * 0.6, sy = y + Math.sin(a * 1.3) * r * 0.6;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 22); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(sx - 22, sy - 22, 44, 44);
      }
      ctx.restore();
    }
  }

  function drawBooth(t, bi) {
    const x = 330, y = 760, w = 420, h = 140;
    ctx.fillStyle = '#0d0a16'; roundRect(x, y, w, h, 16); ctx.fill();
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, '#ff3d9a'); g.addColorStop(0.5, '#7c3dff'); g.addColorStop(1, '#3dd9ff');
    ctx.strokeStyle = g; ctx.lineWidth = 6; roundRect(x, y, w, h, 16); ctx.stroke();
    // bàn xoay
    for (const cx of [x + 80, x + w - 80]) {
      ctx.fillStyle = '#22202c'; ctx.beginPath(); ctx.ellipse(cx, y + 2, 58, 16, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, y + 2, 42, 11, t * 3, 0, TAU); ctx.stroke();
    }
    // bảng tên DJ
    const dj = currentDJ();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 30px ${FONT}`;
    const name = dj && dj !== resident ? dj.name : 'DJ NEON';
    ctx.fillStyle = '#ffe9a8'; ctx.fillText((dj && dj !== resident ? '👑 ' : '🎧 ') + fit(name, 300, 30), x + w / 2, y + 62);
    if (S.showTop && TOP.length > 1) {
      ctx.font = `600 18px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(TOP.slice(1, 3).map(u => fit(u.name, 150, 18)).join(' · '), x + w / 2, y + 100);
    }
    // đèn nhịp
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i <= Math.round((1 - bi.p) * 9) ? `hsl(${120 - i * 12},100%,55%)` : '#2a2638';
      ctx.fillRect(x + 110 + i * 20, y + 120, 14, 8);
    }
  }

  function fit(text, maxW, size) {
    text = String(text || '');
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length > 1 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1);
    return text + '…';
  }

  function drawFloor(t, bi) {
    const rows = 9, cols = 11;
    const fire = bi.fire;
    for (let r = 0; r < rows; r++) {
      const v0 = r / rows, v1 = (r + 1) / rows;
      const y0 = FLOOR_Y + (H - FLOOR_Y) * Math.pow(v0, 1.25), y1 = FLOOR_Y + (H - FLOOR_Y) * Math.pow(v1, 1.25);
      const w0 = halfW(y0) * 1.05, w1 = halfW(y1) * 1.05;
      for (let c = 0; c < cols; c++) {
        const u0 = c / cols * 2 - 1, u1 = (c + 1) / cols * 2 - 1;
        let hue, light;
        const pat = Math.floor(bi.b / 8) % 4;
        const k = pat === 0 ? (r + c + bi.b) % 4 : pat === 1 ? (Math.abs(c - 5) + bi.b) % 4 : pat === 2 ? (r + bi.b) % 4 : ((r * 3 + c * 7) + bi.b) % 4;
        hue = (k * 75 + c * 12 + r * 7 + (fire ? t * 120 : t * 10)) % 360;
        light = k === 0 ? 55 - 15 * bi.p : 22 + (fire ? 10 : 0);
        ctx.fillStyle = `hsl(${hue},85%,${light}%)`;
        ctx.beginPath();
        ctx.moveTo(W / 2 + u0 * w0, y0); ctx.lineTo(W / 2 + u1 * w0, y0); ctx.lineTo(W / 2 + u1 * w1, y1); ctx.lineTo(W / 2 + u0 * w1, y1); ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 3; ctx.stroke();
      }
    }
    // phần ngoài sàn
    ctx.fillStyle = '#140a24';
    ctx.beginPath(); ctx.moveTo(0, FLOOR_Y); ctx.lineTo(W / 2 - halfW(FLOOR_Y) * 1.05, FLOOR_Y); ctx.lineTo(W / 2 - halfW(H) * 1.05, H); ctx.lineTo(0, H); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W, FLOOR_Y); ctx.lineTo(W / 2 + halfW(FLOOR_Y) * 1.05, FLOOR_Y); ctx.lineTo(W / 2 + halfW(H) * 1.05, H); ctx.lineTo(W, H); ctx.fill();
    // vòng sáng giữa sàn
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,220,120,${0.35 + 0.4 * (1 - bi.p)})`; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.ellipse(W / 2, zToY(0.45), 200, 55, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  function poseFor(d, bi, t) {
    const P = SPECIAL_POSES;
    if (d.drop < 0) return P.fall();
    if (d === currentDJ()) return P.dj(bi.p, bi.b);
    if (d.mode === 'rocket' || d.mode === 'cloud') return d.mode === 'rocket' ? P.fly() : DANCES[d.dance].f(bi.p, bi.b, t);
    if (d.mode === 'throne') return P.sit(bi.p);
    if (d.jumpStart && t - d.jumpStart < 0.8) return P.jump((t - d.jumpStart) / 0.8);
    if (d.mode === 'catwalk') return d.moving ? P.catwalk((t * 1.6) % 1) : P.pose();
    if (d.moving && d.mode !== 'circle') return P.walk((t * 1.8 + d.zi * 0.37) % 1);
    if (d.mode === 'circle') return P.walk((t * 1.8) % 1);
    let p = bi.p + d.offset, b = bi.b; if (p >= 1) { p -= 1; b += 1; }
    const pose = DANCES[d.dance].f(p, b, t);
    if (d.land && t - d.land < 0.25) { const k = 1 - (t - d.land) / 0.25; pose.bob += 0.12 * k; }
    return pose;
  }

  function drawDancer(d, bi, t, pos) {
    const p = poseFor(d, bi, t);
    const fade = d.leaving ? clamp(1 - (t - d.leaving) / 1.2, 0, 1) : 1;
    let sy = pos.sy + Math.min(0, d.drop);
    if (d.leaving) sy -= (1 - fade) * 300;
    const sc = pos.sc * d.sc;
    ctx.globalAlpha = fade * (d.clone ? 0.85 : 1);
    if (d.mode === 'cloud') drawCloud(pos.sx, pos.sy + 6, sc, t);
    if (d.mode === 'throne') drawThrone(pos.sx, pos.sy, sc);
    if (d.mode === 'rocket') drawRocket(pos.sx, pos.sy, sc);
    if (d.face === -1 && d.moving && p.spin === 1) p.spin = 1; // giữ mặt nhìn trước
    const top = drawChar(d.look, p, pos.sx, sy, sc, { wings: t < d.wingsUntil, crown: t < d.crownUntil || (tierOf(d.coins) && tierOf(d.coins).name !== 'Quý Tộc'), t: t + d.zi, noShadow: d.drop < -50 || d.mode === 'cloud' || d.mode === 'rocket' });
    if (d.mode === 'throne') {
      // tay vịn ngai trước người
      ctx.fillStyle = '#e6a800'; roundRect(pos.sx - 70 * sc, pos.sy - 75 * sc, 26 * sc, 40 * sc, 8 * sc); ctx.fill(); roundRect(pos.sx + 44 * sc, pos.sy - 75 * sc, 26 * sc, 40 * sc, 8 * sc); ctx.fill();
    }
    d._top = top; d._sc = sc;
    ctx.globalAlpha = 1;
  }

  function drawTag(d, t) {
    if (!d._top) return;
    const fade = d.leaving ? clamp(1 - (t - d.leaving) / 1.2, 0, 1) : 1;
    if (fade <= 0) return;
    ctx.globalAlpha = fade;
    const sc = Math.max(0.62, Math.min(1.4, d._sc));
    const x = d._top.x, y = d._top.y - 6 * sc;
    const r = 20 * sc;
    const tier = tierOf(d.coins);
    // ảnh đại diện
    const ay = y - r;
    const ring = ctx.createLinearGradient(x - r, ay - r, x + r, ay + r);
    ring.addColorStop(0, tier ? tier.ring[0] : '#ffffff'); ring.addColorStop(1, tier ? tier.ring[1] : '#b06bff');
    ctx.fillStyle = ring; ctx.beginPath(); ctx.arc(x, ay, r + 3 * sc, 0, TAU); ctx.fill();
    const im = img(d.avatar);
    ctx.save(); ctx.beginPath(); ctx.arc(x, ay, r, 0, TAU); ctx.clip();
    if (im) ctx.drawImage(im, x - r, ay - r, r * 2, r * 2);
    else {
      ctx.fillStyle = '#3b2a6b'; ctx.fillRect(x - r, ay - r, r * 2, r * 2);
      ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(r)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((d.name.trim()[0] || '?').toUpperCase(), x, ay + 1);
    }
    ctx.restore();
    // tên
    ctx.font = `700 ${Math.round(14 * sc)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = (tier ? tier.name + ' · ' : '') + fit(d.name, 150 * sc, 14 * sc);
    const tw = ctx.measureText(label).width + 16 * sc, ny = ay - r - 14 * sc;
    ctx.fillStyle = 'rgba(30,10,60,0.82)'; roundRect(x - tw / 2, ny - 10 * sc, tw, 20 * sc, 10 * sc); ctx.fill();
    ctx.strokeStyle = tier ? tier.color : 'rgba(255,90,220,0.9)'; ctx.lineWidth = 1.5 * sc; ctx.stroke();
    ctx.fillStyle = tier ? tier.color : '#fff'; ctx.fillText(label, x, ny + 1);
    // bình luận
    if (S.showComments && d.comment && t < d.commentUntil) {
      ctx.font = `600 ${Math.round(15 * sc)}px ${FONT}`;
      const txt = fit(d.comment, 220 * sc, 15 * sc);
      const bw = ctx.measureText(txt).width + 20 * sc, by = ny - 30 * sc;
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; roundRect(x - bw / 2, by - 13 * sc, bw, 26 * sc, 12 * sc); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 6 * sc, by + 12 * sc); ctx.lineTo(x + 6 * sc, by + 12 * sc); ctx.lineTo(x, by + 20 * sc); ctx.fill();
      ctx.fillStyle = '#25103f'; ctx.fillText(txt, x, by + 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawCloud(x, y, sc, t) {
    ctx.save(); ctx.globalAlpha *= 0.95;
    const g = ctx.createLinearGradient(x - 120 * sc, 0, x + 120 * sc, 0);
    g.addColorStop(0, '#ffd6f5'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#c8f2ff');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (const [ox, oy, r] of [[-80, 0, 40], [-35, -18, 50], [20, -20, 52], [70, -2, 42], [0, 8, 50]]) { ctx.moveTo(x + (ox + r) * sc, y + oy * sc); ctx.arc(x + ox * sc, y + oy * sc, r * sc, 0, TAU); }
    ctx.fill();
    // cầu vồng đuôi
    const cols = ['#ff3d3d', '#ff9d3d', '#ffe53d', '#3dff7a', '#3db8ff', '#9b5cff'];
    cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 7 * sc; ctx.beginPath(); ctx.moveTo(x - 100 * sc, y + (i * 7 - 10) * sc); ctx.quadraticCurveTo(x - 180 * sc, y + (i * 7 + 10 + Math.sin(t * 3) * 10) * sc, x - 260 * sc, y + (i * 7 - 20) * sc); ctx.stroke(); });
    ctx.restore();
  }
  function drawThrone(x, y, sc) {
    const g = ctx.createLinearGradient(x, y - 260 * sc, x, y);
    g.addColorStop(0, '#fff1a8'); g.addColorStop(0.4, '#ffc81a'); g.addColorStop(1, '#a86b00');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - 70 * sc, y); ctx.lineTo(x - 70 * sc, y - 190 * sc); ctx.quadraticCurveTo(x, y - 300 * sc, x + 70 * sc, y - 190 * sc); ctx.lineTo(x + 70 * sc, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b3122d'; roundRect(x - 50 * sc, y - 200 * sc, 100 * sc, 140 * sc, 20 * sc); ctx.fill();
    ctx.fillStyle = '#ff3d7f'; ctx.beginPath(); ctx.arc(x, y - 245 * sc, 12 * sc, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c98a00'; ctx.fillRect(x - 75 * sc, y - 50 * sc, 150 * sc, 22 * sc);
  }
  function drawRocket(x, y, sc) {
    ctx.save(); ctx.translate(x, y + 20 * sc);
    ctx.fillStyle = '#e8e8f0'; ctx.beginPath(); ctx.moveTo(-30 * sc, 0); ctx.lineTo(30 * sc, 0); ctx.lineTo(18 * sc, 50 * sc); ctx.lineTo(-18 * sc, 50 * sc); ctx.fill();
    ctx.fillStyle = '#ff3d3d'; ctx.beginPath(); ctx.moveTo(-30 * sc, 0); ctx.lineTo(-50 * sc, 40 * sc); ctx.lineTo(-20 * sc, 30 * sc); ctx.fill(); ctx.beginPath(); ctx.moveTo(30 * sc, 0); ctx.lineTo(50 * sc, 40 * sc); ctx.lineTo(20 * sc, 30 * sc); ctx.fill();
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = p.type === 'balloon' ? 1 : a;
      ctx.fillStyle = p.color;
      if (p.type === 'confetti') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore(); }
      else if (p.type === 'balloon') {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y + p.size); ctx.quadraticCurveTo(p.x + 10, p.y + p.size * 1.8, p.x, p.y + p.size * 2.6); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * 0.8, p.size, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(p.x - p.size * 0.3, p.y - p.size * 0.35, p.size * 0.18, p.size * 0.3, -0.5, 0, TAU); ctx.fill();
      } else if (p.type === 'heart') {
        const s = p.size; ctx.beginPath(); ctx.moveTo(p.x, p.y + s * 0.3);
        ctx.bezierCurveTo(p.x - s, p.y - s * 0.4, p.x - s * 0.4, p.y - s, p.x, p.y - s * 0.4);
        ctx.bezierCurveTo(p.x + s * 0.4, p.y - s, p.x + s, p.y - s * 0.4, p.x, p.y + s * 0.3); ctx.fill();
      } else if (p.type === 'star') { ctx.beginPath(); for (let i = 0; i < 4; i++) { const a2 = i * PI / 2; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(a2) * p.size * 1.6, p.y + Math.sin(a2) * p.size * 1.6); } ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.5, 0, TAU); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }

  function drawLasers(t, bi) {
    if (S.quality === 'low') return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const n = bi.fire ? 10 : 4;
    for (let i = 0; i < n; i++) {
      const fromLeft = i % 2 === 0;
      const sx = fromLeft ? 0 : W, sy = 120 + (i % 3) * 40;
      const a = Math.sin(t * (bi.fire ? 2.2 : 0.9) + i) * 0.5 + (fromLeft ? 0.45 : PI - 0.45);
      const col = ['#ff3df2', '#3dfcff', '#fff13d', '#7dff3d', '#ff3d6e'][i % 5];
      ctx.strokeStyle = col; ctx.globalAlpha = bi.fire ? 0.75 : 0.35; ctx.lineWidth = bi.fire ? 4 : 3;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * 2200, sy + Math.sin(a) * 2200); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- HUD ----------
  function pill(x, y, w, h, fill, stroke) {
    ctx.fillStyle = fill; roundRect(x, y, w, h, h / 2); ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
  }
  function drawHUD(t, bi) {
    ctx.textBaseline = 'middle';
    // thống kê
    const onFloor = onFloorCount();
    ctx.font = `800 28px ${FONT}`;
    const txt = `Trên sàn ${onFloor}/${S.maxDancers}  ·  ⏳ Chờ zoom ${zoomQueue.length}`;
    const tw = ctx.measureText(txt).width + 50;
    const hg = ctx.createLinearGradient(W / 2 - tw / 2, 0, W / 2 + tw / 2, 0);
    hg.addColorStop(0, '#ff3d9a'); hg.addColorStop(1, '#7c3dff');
    pill(W / 2 - tw / 2, 18, tw, 52, 'rgba(25,8,50,0.85)', hg);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(txt, W / 2, 45);

    // dòng chạy
    if (S.showJoinTicker) {
      pill(20, 84, W - 40, 50, 'rgba(25,8,50,0.75)', 'rgba(150,90,255,0.6)');
      ctx.save(); roundRect(30, 84, W - 60, 50, 25); ctx.clip();
      if (!tickerCur && ticker.length) { tickerCur = ticker.shift(); tickerX = W; }
      if (tickerCur) {
        ctx.font = `700 27px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = tickerCur.color;
        ctx.fillText(tickerCur.text, tickerX, 110);
        const w = ctx.measureText(tickerCur.text).width;
        tickerX -= (ticker.length > 4 ? 9 : 5);
        if (tickerX < W - w - 140 && ticker.length) { /* để chữ kế tiếp nối đuôi */ }
        if (tickerX + w < 30) tickerCur = null;
      }
      ctx.restore();
    }

    // top
    if (S.showTop && TOP.length) {
      const x = W - 330, y = 150;
      ctx.fillStyle = 'rgba(25,8,50,0.72)'; roundRect(x, y, 310, 50 + Math.min(3, TOP.length) * 54, 18); ctx.fill();
      ctx.strokeStyle = 'rgba(255,207,51,0.6)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = `900 24px ${FONT}`; ctx.fillStyle = '#ffcf33'; ctx.textAlign = 'left'; ctx.fillText('💎 TOP ĐẠI GIA', x + 18, y + 27);
      TOP.slice(0, 3).forEach((u, i) => {
        const yy = y + 78 + i * 54;
        ctx.font = `800 22px ${FONT}`; ctx.fillStyle = ['#ffd84d', '#d9e2ff', '#ffb27a'][i]; ctx.fillText(['①', '②', '③'][i], x + 14, yy);
        avatarCircle(u, x + 66, yy, 20);
        ctx.font = `700 22px ${FONT}`; ctx.fillStyle = '#fff';
        ctx.fillText(fit(u.name, S.showCoins ? 140 : 210, 22), x + 94, yy);
        if (S.showCoins) { ctx.textAlign = 'right'; ctx.fillStyle = '#ffd84d'; ctx.fillText(u.coins + '💎', x + 296, yy); ctx.textAlign = 'left'; }
      });
    }

    // nhạc đang phát
    const tn = Music.trackName();
    if (tn) { ctx.font = `600 20px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText('♫ ' + fit(tn, 600, 20), 30, 160); }

    // menu quà
    if (S.showGiftMenu) {
      const list = (S.actions || []).map(a => ({ a, m: actionMeta(a.id) }));
      const x = W - 220, y0 = 1650 - list.length * 42 - 10;
      list.forEach(({ a, m }, i) => {
        const y = y0 + i * 42;
        ctx.fillStyle = 'rgba(25,8,50,0.7)'; roundRect(x, y, 205, 36, 10); ctx.fill();
        const g = a.gift ? GIFTS[a.gift] : null;
        const im = g && img(g.img);
        if (im) ctx.drawImage(im, x + 6, y + 3, 30, 30);
        else { ctx.font = `22px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(m.icon, x + 21, y + 19); }
        ctx.font = `800 18px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
        ctx.fillText(fit(m.label.toUpperCase(), 105, 18), x + 44, y + 19);
        ctx.font = `700 15px ${FONT}`; ctx.textAlign = 'right'; ctx.fillStyle = '#ffd84d';
        ctx.fillText(a.gift ? fit(a.gift, 60, 15) : (a.min || 1) + '💎', x + 198, y + 19);
      });
    }

    // banner zoom
    if (zoom) drawZoomBanner(t);

    // sàn cháy
    if (bi.fire && t - fireStart < 4) {
      const k = t - fireStart, s = k < 0.3 ? k / 0.3 * 1.15 : k < 0.5 ? 1.15 - (k - 0.3) * 0.75 : 1;
      ctx.save(); ctx.translate(W / 2, 420); ctx.scale(s, s);
      const g = ctx.createLinearGradient(-380, -80, 380, 80); g.addColorStop(0, '#ff3d00'); g.addColorStop(0.5, '#ffb300'); g.addColorStop(1, '#ff3d00');
      ctx.fillStyle = 'rgba(60,0,40,0.85)'; roundRect(-400, -90, 800, 180, 40); ctx.fill();
      ctx.strokeStyle = g; ctx.lineWidth = 10; ctx.stroke();
      ctx.font = `900 92px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
      ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 30; ctx.fillText('🔥 SÀN CHÁY! 🔥', 0, 5);
      ctx.restore();
    }

    // bảng dưới: nhiệt sàn
    const py = 1665, ph = 235;
    const pg = ctx.createLinearGradient(0, py, 0, py + ph);
    pg.addColorStop(0, 'rgba(40,10,80,0.92)'); pg.addColorStop(1, 'rgba(15,4,35,0.95)');
    ctx.fillStyle = pg; roundRect(20, py, W - 40, ph, 30); ctx.fill();
    const bg = ctx.createLinearGradient(20, 0, W - 20, 0); bg.addColorStop(0, '#3dd9ff'); bg.addColorStop(0.5, '#ff3df2'); bg.addColorStop(1, '#ffb300');
    ctx.strokeStyle = bg; ctx.lineWidth = 5; ctx.stroke();
    ctx.font = `900 32px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd84d';
    const fireLeft = Math.max(0, Math.ceil(fireUntil - t));
    ctx.fillText(bi.fire ? `🔥 SÀN CHÁY — còn ${fireLeft}s` : `⚡ Nhiệt sàn ${Math.floor(heat)} / ${curHeatTarget}`, W / 2, py + 36);
    const bx = 60, by = py + 62, bw = W - 120, bh = 34;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(bx, by, bw, bh, 17); ctx.fill();
    const frac = bi.fire ? (fireUntil - t) / Number(S.fireSeconds || 15) : Math.min(1, heat / curHeatTarget);
    if (frac > 0.01) {
      const fg = ctx.createLinearGradient(bx, 0, bx + bw, 0); fg.addColorStop(0, '#ffb300'); fg.addColorStop(1, '#ff3d3d');
      ctx.fillStyle = fg; roundRect(bx, by, Math.max(bh, bw * clamp(frac, 0, 1)), bh, 17); ctx.fill();
    }
    ctx.font = `700 25px ${FONT}`; ctx.fillStyle = '#fff';
    rich(['💬 Bình luận để ', ['lên sàn', '#7cf7ff'], ' · gõ ', ['nhảy', '#7cf7ff'], ', ', ['đi vòng', '#7cf7ff'], ', ', ['ghép đôi', '#7cf7ff'], ', ', ['đổi đồ', '#7cf7ff']], W / 2, py + 135);
    rich(['điệu: ', ['disco', '#ffd84d'], ', ', ['robot', '#ffd84d'], ', ', ['xoay đầu', '#ffd84d'], ', ', ['moonwalk', '#ffd84d'], '… (số 1–14) · ❤️ thả tim tăng nhiệt'], W / 2, py + 172);
    ctx.font = `500 18px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.textAlign = 'center';
    ctx.fillText('Sàn nhảy giải trí · không có giải thưởng', W / 2, py + 210);
  }
  function rich(parts, cx, y) {
    ctx.textAlign = 'left';
    let w = 0; for (const p of parts) w += ctx.measureText(typeof p === 'string' ? p : p[0]).width;
    let x = cx - w / 2;
    for (const p of parts) { const s = typeof p === 'string' ? p : p[0]; ctx.fillStyle = typeof p === 'string' ? '#fff' : p[1]; ctx.fillText(s, x, y); x += ctx.measureText(s).width; }
  }
  function avatarCircle(u, x, y, r) {
    const im = img(u.avatar);
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    if (im) ctx.drawImage(im, x - r, y - r, r * 2, r * 2);
    else { ctx.fillStyle = '#5b3bb0'; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.fillStyle = '#fff'; ctx.font = `800 ${r}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText((u.name || '?').trim()[0].toUpperCase(), x, y + 1); }
    ctx.restore();
    ctx.textAlign = 'left';
  }

  function wingPlate(cx, cy, w, h, c1, c2) {
    // cánh hai bên
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.translate(cx + sd * (w / 2 - 10), cy); ctx.scale(sd, 1);
      const g = ctx.createLinearGradient(0, 0, 120, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(200,220,255,0.6)');
      ctx.fillStyle = g;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(40 + i * 22, -10 + i * 8, 60 - i * 8, 16 - i * 2, -0.35 + i * 0.15, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2); g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; roundRect(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 5; ctx.stroke();
  }
  function drawZoomBanner(t) {
    const k = clamp((t - zoom.start) / 0.35, 0, 1), out = clamp((zoom.until - t) / 0.3, 0, 1);
    const a = Math.min(k, out);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - k) * -60);
    ctx.textAlign = 'center';
    // hành động
    ctx.font = `900 46px ${FONT}`;
    const at = `${zoom.icon} ${zoom.label}`;
    const aw = Math.max(320, ctx.measureText(at).width + 80);
    wingPlate(W / 2, 250, aw, 86, '#ffcf33', '#c47a00');
    ctx.fillStyle = '#4a1a00'; ctx.fillText(at, W / 2, 253);
    // người tặng
    const d = zoom.d, tier = tierOf(d.coins);
    ctx.font = `800 40px ${FONT}`;
    const nm = fit(d.name, 480, 40);
    const nw = Math.max(380, ctx.measureText(nm).width + 150);
    wingPlate(W / 2, 370, nw, 84, '#3b1a8a', '#1c0b45');
    avatarCircle(d, W / 2 - nw / 2 + 50, 370, 32);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = `800 40px ${FONT}`; ctx.fillText(nm, W / 2 + 25, 373);
    if (tier) { ctx.font = `800 24px ${FONT}`; ctx.fillStyle = tier.color; ctx.fillText('👑 ' + tier.name, W / 2, 326); }
    if (zoom.gift) { ctx.font = `700 26px ${FONT}`; ctx.fillStyle = '#ffe9a8'; ctx.fillText(`tặng ${zoom.count > 1 ? zoom.count + '× ' : ''}${zoom.gift.name}`, W / 2, 438); }
    ctx.restore();
  }

  // ---------- vòng lặp ----------
  function frame() {
    const t = now();
    update();
    const dt = 1 / 60;
    updateCam(dt);
    const bi = beatInfo();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    const bs = baseScale;
    ctx.setTransform(bs * cam.z, 0, 0, bs * cam.z, bs * (W / 2 - cam.x * cam.z), bs * (H / 2 - cam.y * cam.z));

    drawStage(t, bi);
    // DJ
    const dj = currentDJ();
    if (dj) { const p = djPos(); drawDancer(dj, bi, t, p); }
    drawBooth(t, bi);
    drawFloor(t, bi);

    const list = [...dancers.values(), ...clones].filter(d => d !== dj);
    const air = [];
    const placed = list.map(d => ({ d, pos: dancerScreen(d) }));
    placed.sort((a, b) => (a.pos.base ? a.pos.base.sy : a.pos.sy) - (b.pos.base ? b.pos.base.sy : b.pos.sy));
    for (const it of placed) {
      if (it.d.mode === 'cloud' || it.d.mode === 'rocket' || it.d.drop < -40) { air.push(it); continue; }
      drawDancer(it.d, bi, t, it.pos);
    }
    for (const it of air) drawDancer(it.d, bi, t, it.pos);
    // nhãn tên vẽ sau cùng để không bị che
    if (dj && dj !== resident) drawTag(dj, t);
    for (const it of placed) drawTag(it.d, t);

    drawLasers(t, bi);
    drawParticles();

    // HUD theo khung màn hình
    ctx.setTransform(bs, 0, 0, bs, 0, 0);
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.35})`; ctx.fillRect(0, 0, W, H); }
    if (bi.fire) { ctx.fillStyle = `rgba(255,60,180,${0.08 * (1 - bi.p)})`; ctx.fillRect(0, 0, W, H); }
    drawHUD(t, bi);

    requestAnimationFrame(frame);
  }

  // ---------- kết nối ----------
  const socket = io();
  socket.on('connect', () => socket.emit('hello', 'game'));
  socket.on('settings', s => {
    const oldQ = S.quality;
    S = Object.assign(S, s);
    Music.setSettings(S);
    if (oldQ !== S.quality) resize();
  });
  socket.on('gifts', g => { GIFTS = g || {}; });
  socket.on('music', list => Music.setPlaylist(list));
  socket.on('top', list => {
    TOP = list || [];
    for (const u of TOP) { const d = dancers.get(u.id); if (d) d.coins = u.coins; }
  });
  socket.on('ev', ev => {
    try {
      switch (ev.type) {
        case 'chat': {
          const d = ensureDancer(ev.user);
          if (!d) return;
          if (ev.text) { d.comment = ev.text; d.commentUntil = now() + 4; handleCommand(d, ev.text); }
          break;
        }
        case 'like': {
          heat += ev.count;
          const d = dancers.get(ev.user.id); if (d) { d.lastActive = now(); if (Math.random() < 0.3) { const p = dancerScreen(d); hearts(p.sx, p.sy - 200 * p.sc, 1); } }
          break;
        }
        case 'gift': handleGift(ev); break;
        case 'member': if (S.showJoinTicker) pushTicker(`👋 ${ev.user.name} vào xem`, '#ffffff'); break;
        case 'follow': pushTicker(`💖 ${ev.user.name} đã follow`, '#ff7ad9'); heat += 20; break;
        case 'share': pushTicker(`📣 ${ev.user.name} đã chia sẻ`, '#a3e635'); heat += 20; break;
        case 'viewers': viewers = ev.count; break;
      }
    } catch (e) { console.error(e); }
  });
  socket.on('cmd', c => {
    if (c.type === 'clear') { dancers.clear(); clones.length = 0; zoomQueue.length = 0; zoom = null; heat = 0; fireUntil = 0; djOverride = null; }
    if (c.type === 'endZoom') zoom = null;
    if (c.type === 'fire') { heat = curHeatTarget + 1; }
    if (c.type === 'reload') location.reload();
  });
  fetch('/api/info').then(r => r.json()).then(i => { ACTIONS = i.actions; }).catch(() => {});

  setInterval(() => {
    socket.emit('status', { onFloor: onFloorCount(), zooming: zoom ? zoom.d.name : '—', queue: zoomQueue.length, fps: Math.round(fps) });
  }, 2000);
  let fps = 60, lastF = now();
  (function fpsLoop() { const t = now(); fps = fps * 0.9 + (1 / Math.max(0.001, t - lastF)) * 0.1; lastF = t; requestAnimationFrame(fpsLoop); })();

  // ---------- khởi động ----------
  resident = new Dancer({ id: '__dj', name: 'DJ NEON', avatar: '' }, { noDrop: true });
  resident.look = { skin: '#e0a77e', hair: '#1b1b1f', hs: 2, shirt: '#222631', shirt2: '#ff3d7f', pants: '#1f2a44', shoes: '#fff', hood: 0, hoodColor: '#fff', stripe: true, glasses: true };
  window.addEventListener('resize', resize);
  resize();
  Music.init();
  const tap = document.getElementById('tap');
  function checkAudio() {
    if (Music.suspended() && !OBS && (Music.settings.musicEnabled || Music.settings.synthMusic)) tap.style.display = 'flex'; else tap.style.display = 'none';
  }
  const unlock = () => { Music.init(); Music.resume(); setTimeout(checkAudio, 200); };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  setInterval(checkAudio, 1500);
  Music.resume();
  requestAnimationFrame(frame);
})();
