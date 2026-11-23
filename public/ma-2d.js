// Ngọn Lửa Cuối Cùng — chế độ hiển thị 2D: 12 cảnh ngoài trời ghép từ tranh vẽ tay (public/models/ma/2D).
// Nền trời, trăng, núi, hàng cây, đồ trong cảnh, mặt đất, đống lửa vẽ tay ngả theo gió, ông Tư, hiệu ứng, vật phẩm sự kiện.
// ma.js gọi: MA2D.back() trước khi vẽ người ngồi, MA2D.fireBase() / MA2D.flame() thay đống lửa cũ, MA2D.front() sau lớp bóng tối.
(function () {
  const W = 1080, TAU = Math.PI * 2, HZ = 905;   // HZ: đường chân trời
  const B = '/models/ma/2D/';
  const NAMES = ['cui-1', 'cui-2', 'cui-3', 'cui-4', 'vong-da', 'tro', 'dong-cui', 'cay-xa', 'cay-vua', 'cay-gan', 'nui', 'nui-2', 'lang', 'luy-tre', 'trang', 'may-1', 'may-2',
    'ongtu-tau', 'ongtu-tra', 'ongtu-nghi', 'tre-gay', 'mang-tre', 'la-tre', 'buong-chuoi', 'bap-chuoi', 'la-chuoi', 'ao', 'cot-dien', 'choi', 'gau-nuoc', 'rong-roc', 'da-reu', 'cay-sung',
    'goc-da', 'bia-1', 'bia-2', 'mo', 'hang-rao', 'bia-hoa', 'cay-su', 'tuong-da', 'lu-huong', 'cot-muc', 'van-go', 'mang-nhen', 'mat-nuoc', 'luc-binh', 'mai-cheo', 'den-bao', 'cay-ban',
    'sap-cho', 'thung-mung', 'den-long', 'ganh', 'cot-non', 'cot-tin-hieu', 'den-ga', 'duong-ray', 'toa-tau', 'bien-bao', 'cua-so', 'giuong', 'ban-tho', 'cong-dinh', 'rem-rach', 'tuong-vo',
    'cot-do-1', 'cot-do-2', 'trong', 'den-dau', 'lu-dong', 'lua-1', 'lua-2', 'lua-3', 'lua-4', 'khoi-1', 'khoi-2', 'dom-dom', 'buom', 'suong-1', 'suong-2', 'la-1', 'la-2', 'la-3', 'tia-trang',
    'bo-cui', 'hu-muoi', 'cua-go', 'nen', 'khoi-nhap', 'bat-nhang', 'bua', 'chuong', 'guong-bat-quai', 'co-dai-1', 'co-dai-2', 'co-dai-3', 'co-dai-4', 'co-lau', 'duong-xi'];
  const IMG = {};
  let loaded = 0;
  for (const n of NAMES) { const im = new Image(); im.onload = () => { loaded++; }; im.src = B + n + '.png'; IMG[n] = im; }
  const ok = n => { const im = IMG[n]; return im && im.complete && im.naturalWidth > 0; };
  // đất: dùng texture nhóm B (cắt từ cùng bộ tranh)
  const GROUND = {};
  for (const g of ['dat-kho', 'bun-uot', 'la-muc', 'gach-vo', 'da-ong']) { const im = new Image(); im.src = `/models/ma/B/textures/${g}.png`; GROUND[g] = im; }
  const pats = {};
  function groundPattern(ctx, g) {
    if (pats[g]) return pats[g];
    const im = GROUND[g]; if (!im || !im.complete || !im.naturalWidth) return null;
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0, 256, 256); x.fillStyle = 'rgba(8,8,14,.25)'; x.fillRect(0, 0, 256, 256);
    return (pats[g] = ctx.createPattern(c, 'repeat'));
  }
  // vẽ ảnh theo chiều cao, gốc ở chân (bx = giữa, by = chân)
  function put(ctx, n, bx, by, h, o = {}) {
    if (!ok(n)) return null;
    const im = IMG[n], w = h * im.naturalWidth / im.naturalHeight;
    ctx.save(); ctx.globalAlpha = o.a ?? 1; ctx.translate(bx, by);
    if (o.rot) ctx.rotate(o.rot);
    if (o.sway) ctx.transform(1, 0, o.sway, 1, 0, 0);
    if (o.flip) ctx.scale(-1, 1);
    if (o.op) ctx.globalCompositeOperation = o.op;
    ctx.drawImage(im, -w / 2, -h * (o.cy ?? 1), w, h); ctx.restore();
    return { w, h };
  }
  // dải nền ngang lặp kín bề rộng (cuộn chậm theo thời gian để có chiều sâu)
  function band(ctx, n, by, h, o = {}) {
    if (!ok(n)) return;
    const im = IMG[n], w = h * im.naturalWidth / im.naturalHeight;
    let x0 = -((o.scroll || 0) % w); if (x0 > 0) x0 -= w;
    ctx.save(); ctx.globalAlpha = o.a ?? 1;
    for (let x = x0, i = 0; x < W; x += w, i++) {
      if (i % 2 && o.mirror !== false) { ctx.save(); ctx.translate(x + w, 0); ctx.scale(-1, 1); ctx.drawImage(im, 0, by - h, w, h); ctx.restore(); }   // lật xen kẽ để mép nối liền
      else ctx.drawImage(im, x, by - h, w, h);
    }
    ctx.restore();
  }

  // ---------------- 12 cảnh: lớp nền + đồ vật (tên, x, chân y, cao, tuỳ chọn) ----------------
  const SC = {
    dong: { g: 'dat-kho', layers: ['nui', 'lang', 'cay-xa'], props: [['ao', 150, 958, 150], ['choi', 900, 948, 205], ['cot-dien', 735, 925, 225], ['co-lau', 330, 950, 120], ['co-lau', 610, 940, 100, { flip: 1 }]] },
    chuoi: { g: 'la-muc', layers: ['nui-2', 'luy-tre'], props: [['la-chuoi', 110, 980, 270], ['la-chuoi', 980, 975, 260, { flip: 1 }], ['buong-chuoi', 830, 960, 175], ['bap-chuoi', 250, 955, 165], ['da-reu', 560, 945, 70]] },
    rungtre: { g: 'la-muc', layers: ['luy-tre', 'cay-vua'], props: [['tre-gay', 170, 965, 190], ['tre-gay', 920, 960, 180, { flip: 1 }], ['mang-tre', 640, 940, 95], ['la-tre', 400, 948, 60]], ray: 1, leaves: 1 },
    gieng: { g: 'bun-uot', layers: ['nui', 'lang', 'cay-vua'], props: [['cay-sung', 880, 968, 280], ['rong-roc', 330, 955, 175], ['gau-nuoc', 470, 958, 80], ['da-reu', 170, 960, 80]], leaves: 1 },
    cayda: { g: 'la-muc', layers: ['nui-2', 'cay-gan'], props: [['goc-da', 540, 975, 330]], ray: 1, leaves: 1 },
    nghiadia: { g: 'dat-kho', layers: ['nui', 'cay-vua'], props: [['cay-su', 900, 960, 270], ['hang-rao', 190, 948, 110], ['bia-1', 380, 942, 95], ['mo', 600, 940, 75], ['bia-2', 760, 944, 65], ['bia-hoa', 120, 975, 100]], ray: 1, leaves: 1 },
    mieu: { g: 'da-ong', layers: ['nui-2', 'cay-gan'], props: [['tuong-da', 540, 948, 175], ['lu-huong', 690, 950, 75], ['cot-muc', 300, 962, 210], ['cot-muc', 790, 962, 220, { flip: 1 }], ['mang-nhen', 230, 830, 70, { cy: 0.5 }], ['van-go', 140, 965, 140, { rot: -0.25 }]], ray: 1, leaves: 1 },
    bendo: { g: 'bun-uot', layers: ['nui', 'cay-xa'], water: 1, props: [['cay-ban', 910, 968, 270], ['den-bao', 220, 958, 175, { glow: [0, -0.62] }], ['mai-cheo', 380, 955, 110, { rot: 0.5 }], ['luc-binh', 620, 935, 55]] },
    choma: { g: 'dat-kho', layers: ['nui-2', 'lang', 'cay-vua'], props: [['sap-cho', 210, 965, 220], ['den-long', 760, 830, 95, { cy: 0.5, glow: [0, 0.1] }], ['ganh', 860, 962, 120], ['thung-mung', 560, 950, 75], ['cot-non', 980, 965, 185]] },
    duongray: { g: 'da-ong', layers: ['nui', 'cay-xa'], props: [['toa-tau', 300, 945, 120], ['duong-ray', 640, 950, 70], ['cot-tin-hieu', 830, 958, 215, { glow: [0, -0.86, '255,60,40'] }], ['bien-bao', 980, 962, 165], ['den-ga', 120, 962, 120, { glow: [0, -0.55] }]] },
    nhahoang: { g: 'gach-vo', layers: ['nui-2', 'cay-gan'], props: [['tuong-vo', 230, 965, 210], ['cua-so', 210, 870, 95, { cy: 0.5 }], ['rem-rach', 820, 900, 140, { cy: 0.5, sway: 1 }], ['ban-tho', 560, 952, 110], ['giuong', 900, 968, 105]], leaves: 1 },
    dinh: { g: 'gach-vo', layers: ['nui', 'luy-tre'], props: [['cong-dinh', 540, 950, 210], ['cot-do-1', 260, 962, 205], ['cot-do-2', 820, 962, 195], ['trong', 120, 970, 120], ['lu-dong', 960, 970, 95], ['den-dau', 690, 955, 120, { glow: [0, -0.85] }]] },
  };
  const FG = {
    dong: [['ao', 230, 1905, 250], ['co-lau', 420, 1900, 170]], chuoi: [['la-chuoi', 190, 1935, 380], ['buong-chuoi', 440, 1905, 210]],
    rungtre: [['tre-gay', 250, 1920, 290], ['mang-tre', 540, 1905, 140]], gieng: [['rong-roc', 210, 1912, 250], ['gau-nuoc', 420, 1905, 120]],
    cayda: [['da-reu', 200, 1905, 160], ['bat-nhang', 430, 1895, 150]], nghiadia: [['bia-1', 190, 1912, 230], ['mo', 440, 1902, 150], ['hang-rao', 640, 1905, 120]],
    mieu: [['tuong-da', 210, 1915, 290], ['lu-huong', 440, 1900, 125]], bendo: [['luc-binh', 240, 1902, 150], ['mai-cheo', 470, 1900, 200, { rot: 0.5 }]],
    choma: [['thung-mung', 220, 1902, 150], ['ganh', 470, 1905, 185]], duongray: [['duong-ray', 300, 1912, 160], ['den-ga', 570, 1905, 175, { glow: [0, -0.55] }]],
    nhahoang: [['giuong', 250, 1915, 190], ['ban-tho', 530, 1905, 150]], dinh: [['trong', 220, 1915, 220], ['den-dau', 460, 1905, 200, { glow: [0, -0.85] }]],
  };
  const LAYER = {   // dải nền xa: chân y, chiều cao, độ mờ, tốc độ cuộn
    nui: [HZ - 4, 175, 0.75, 1.2], 'nui-2': [HZ - 4, 165, 0.75, 1.2], lang: [HZ + 2, 92, 0.9, 2], 'cay-xa': [HZ + 4, 140, 0.85, 3],
    'cay-vua': [HZ + 6, 165, 0.95, 4.5], 'cay-gan': [HZ + 8, 205, 1, 6], 'luy-tre': [HZ + 8, 150, 0.95, 5],
  };

  // ---------------- gió (lửa, khói, lá, cỏ cùng hướng) ----------------
  const wind = { s: 0.25, gust: 0, next: 9, dir: 1 };
  function windTick(t, dt) {
    if (t > wind.next) { wind.gust = Math.max(wind.gust, 0.5 + Math.random() * 0.5); wind.next = t + 14 + Math.random() * 20; if (Math.random() < 0.3) wind.dir *= -1; }
    wind.gust = Math.max(0, wind.gust - dt * 0.35);
    wind.s = wind.dir * (0.22 + 0.1 * Math.sin(t * 0.37) + 0.06 * Math.sin(t * 1.3) + Math.sin(Math.min(1, wind.gust) * Math.PI / 2) * 0.8);
  }

  // ---------------- hiệu ứng ----------------
  const smoke = Array.from({ length: 10 }, () => ({ life: 0 }));
  const leaves = Array.from({ length: 12 }, () => ({ life: 0 }));
  const flies = Array.from({ length: 9 }, () => ({ x: 100 + Math.random() * 880, y: 760 + Math.random() * 420, ph: Math.random() * TAU }));
  const moths = Array.from({ length: 4 }, () => ({ a: Math.random() * TAU, r: 80 + Math.random() * 70, sp: 1.6 + Math.random(), ph: Math.random() * TAU }));
  const pulses = { nhang: -99, muoi: -99, go: -99 };
  let lastMap = null, fade = 0, lastT = 0;

  function sceneOf(map) { return SC[map] || SC.dong; }

  // ===== lớp sau: trời, trăng, núi, cây, đồ vật, mặt đất, ông Tư =====
  function back(ctx, t, st) {
    const dt = Math.min(0.1, Math.max(0, t - lastT)); lastT = t; windTick(t, dt);
    if (st.map !== lastMap) { if (lastMap) fade = 1; lastMap = st.map; }
    const S = sceneOf(st.map);
    // trời
    const sky = ctx.createLinearGradient(0, 600, 0, HZ);
    sky.addColorStop(0, '#05070f'); sky.addColorStop(0.6, '#0d1428'); sky.addColorStop(1, '#1a2340');
    ctx.fillStyle = sky; ctx.fillRect(0, 560, W, HZ - 560 + 10);
    put(ctx, 'trang', 850, 735, 118, { cy: 0.5, a: 0.95 });
    band(ctx, 'may-1', 700, 30, { scroll: t * 6, a: 0.55 }); band(ctx, 'may-2', 760, 28, { scroll: t * 9 + 300, a: 0.45 });
    for (const L of S.layers) { const c = LAYER[L]; if (c) band(ctx, L, c[0], c[1], { a: c[2], scroll: Math.sin(t * 0.02) * c[3] * 4 + 100 }); }
    // mặt đất
    const p = groundPattern(ctx, S.g);
    ctx.save();
    ctx.fillStyle = '#17130f'; ctx.fillRect(0, HZ, W, 1920 - HZ);
    if (p) { ctx.globalAlpha = 0.6; ctx.translate(0, HZ); ctx.scale(1, 0.55); ctx.fillStyle = p; ctx.fillRect(0, 0, W, (1920 - HZ) / 0.55); }   // đất mờ trên nền tối, không lộ hoa văn lặp
    else { ctx.fillStyle = '#1e1810'; ctx.fillRect(0, HZ, W, 1920 - HZ); }
    ctx.restore();
    const gd = ctx.createLinearGradient(0, HZ - 6, 0, HZ + 120); gd.addColorStop(0, 'rgba(10,14,26,.85)'); gd.addColorStop(1, 'rgba(10,14,26,0)');
    ctx.fillStyle = gd; ctx.fillRect(0, HZ - 6, W, 126);   // sương mờ chỗ chân trời
    if (S.water) { band(ctx, 'mat-nuoc', HZ + 40, 70, { a: 0.7, scroll: t * 8 }); }
    // đồ vật trong cảnh (xa → gần)
    for (const [n, x, y, h, o = {}] of [...S.props].sort((a, b) => a[2] - b[2])) {
      const sw = o.sway ? Math.sin(t * 1.3 + x) * 0.04 + wind.s * 0.05 : 0;
      put(ctx, n, x, y, h, { flip: o.flip, rot: o.rot, cy: o.cy, sway: sw });
    }
    // cụm đồ tiền cảnh + cỏ cây sát mép dưới
    for (const [n, x, y, h, o = {}] of FG[st.map] || []) put(ctx, n, x, y, h, { rot: o.rot, flip: o.flip });
    put(ctx, 'co-lau', 40, 1935, 260, { sway: Math.sin(t * 1.1) * 0.05 + wind.s * 0.08 });
    put(ctx, 'duong-xi', 1030, 1930, 170, { flip: 1, sway: Math.sin(t * 0.9 + 1) * 0.04 + wind.s * 0.06 });
    put(ctx, 'co-dai-2', 640, 1925, 110, { sway: wind.s * 0.06 + Math.sin(t * 1.2) * 0.03 }); put(ctx, 'co-dai-4', 1000, 1930, 150, { flip: 1, sway: wind.s * 0.07 });
    put(ctx, 'co-dai-1', 120, 1922, 90, { sway: wind.s * 0.05 });
  }
  // ông Tư ngồi cạnh đống lửa: đang kể thì cầm tẩu, nghỉ giữa truyện thì rót trà
  const TELLER = { dx: 228, dy: 22, h: 235 };
  function teller(ctx, t, st) {
    const n = st.talking ? 'ongtu-tau' : 'ongtu-tra';
    const x = st.LX + TELLER.dx, y = st.LY + TELLER.dy + Math.sin(t * 1.4) * 1.5;
    put(ctx, n, x, y, TELLER.h, { flip: n === 'ongtu-tau' ? 1 : 0 });   // tranh gốc: cầm tẩu quay phải, rót trà quay trái → lật cho luôn nhìn vào đống lửa bên trái
    if (n === 'ongtu-tau') {   // khói tẩu
      for (let k = 0; k < 3; k++) { const p = ((t * 0.35 + k / 3) % 1); put(ctx, 'khoi-2', x - 70 + wind.s * 60 * p, y - TELLER.h * 0.62 - p * 70, 30 + p * 40, { a: (1 - p) * 0.35, cy: 0.5 }); }
    }
    return { x, y: y - TELLER.h + 30, sc: 1 };
  }
  // vùng ông Tư chiếm chỗ (ghế trong vùng này dời ra chỗ khác)
  function tellerRect(LX, LY) { return { x0: LX + TELLER.dx - 118, x1: LX + TELLER.dx + 118, y0: LY + TELLER.dy - TELLER.h - 10, y1: LY + TELLER.dy + 14 }; }   // khung hình ông Tư + mép an toàn

  // ===== đống lửa: vết tro, vòng đá, củi cháy (mỗi cảnh một kiểu), đống củi để sẵn =====
  function fireBase(ctx, t, LX, LY, map, oil) {
    const k = 1 + ((Object.keys(SC).indexOf(map) + 4) % 4);
    put(ctx, 'tro', LX, LY + 44, 135, { a: 0.95 });
    put(ctx, 'vong-da', LX, LY + 52, 170);
    put(ctx, 'cui-' + k, LX, LY + 22, 125);
    put(ctx, 'dong-cui', LX + 92, LY + 92, 70);
    if (oil > 0) {   // than hồng thở theo nhịp
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(LX, LY, 4, LX, LY, 85); g.addColorStop(0, `rgba(255,110,30,${0.35 + Math.sin(t * 3) * 0.08})`); g.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(LX, LY, 90, 40, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
  }
  // ngọn lửa vẽ tay 4 khung, chuyển mượt, ngả theo gió (gốc đứng yên, chóp ngả)
  function flame(ctx, t, LX, LY, power, flick) {
    if (power <= 0 || flick <= 0) return;
    const fr = ['lua-1', 'lua-2', 'lua-3', 'lua-4'].filter(ok); if (!fr.length) return false;
    const f = t * 8, i = Math.floor(f) % fr.length, j = (i + 1) % fr.length, m = f - Math.floor(f);
    const h = (210 + power * 170) * (0.94 + Math.sin(t * 9) * 0.04) * Math.min(1.1, flick + 0.2), lean = wind.s * 0.55;
    const draw = (n, a) => { const im = IMG[n], w = h * im.naturalWidth / im.naturalHeight; ctx.save(); ctx.globalAlpha = a; ctx.translate(LX, LY + 10); ctx.transform(1, 0, -lean, 1, 0, 0); ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore(); };
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    draw(fr[i], 1 - m); draw(fr[j], m);
    ctx.restore();
    return true;
  }

  // ===== lớp trước (vẽ trên bóng tối): khói, đom đóm, bướm, lá rơi, sương, tia trăng, vật phẩm sự kiện =====
  function front(ctx, t, st) {
    const S = sceneOf(st.map), LX = st.LX, LY = st.LY, dt = 1 / 60, on = st.oil > 0 && st.flick > 0;
    // tia trăng xuyên kẽ lá (độ sáng ổn định, không chớp)
    if (S.ray && ok('tia-trang')) { put(ctx, 'tia-trang', 260, 1220, 620, { a: 0.18, op: 'lighter' }); put(ctx, 'tia-trang', 860, 1180, 560, { a: 0.13, op: 'lighter', flip: 1 }); }
    // sương bò sát đất
    band(ctx, 'suong-1', 1080, 70, { scroll: t * 12, a: 0.22 + st.yin / 400 });
    band(ctx, 'suong-2', 1500, 80, { scroll: -t * 9 + 200, a: 0.16 + st.yin / 500 });
    // khói đống lửa
    for (const s of smoke) {
      s.life -= dt;
      if (s.life <= 0 && on && Math.random() < 0.05) Object.assign(s, { life: 3.5, max: 3.5, x: LX + (Math.random() - 0.5) * 30, y: LY - 170, n: Math.random() < 0.5 ? 'khoi-1' : 'khoi-2', r: Math.random() * TAU });
      if (s.life > 0) { const k = 1 - s.life / s.max; s.y -= 45 * dt; s.x += wind.s * 70 * dt; put(ctx, s.n, s.x, s.y, 60 + k * 140, { a: Math.sin(k * Math.PI) * 0.22, cy: 0.5, rot: s.r * 0.2 + k * 0.4 }); }
    }
    // đom đóm, bướm đêm quanh lửa
    if (ok('dom-dom')) for (const f of flies) { const a = Math.max(0, Math.sin(t * 1.7 + f.ph * 3)) * (1 - st.yin / 130); if (a > 0.05) put(ctx, 'dom-dom', f.x + Math.sin(t * 0.4 + f.ph) * 60, f.y + Math.sin(t * 0.9 + f.ph) * 25, 46, { a: a * 0.8, op: 'lighter', cy: 0.5 }); }
    if (on && ok('buom')) for (const m of moths) { m.a += m.sp * dt; put(ctx, 'buom', LX + Math.cos(m.a) * m.r + wind.s * 20, LY - 210 + Math.sin(m.a) * m.r * 0.35 + Math.sin(t * 7 + m.ph) * 6, 26, { a: 0.75, cy: 0.5 }); }
    // lá rơi theo gió ở cảnh có cây
    if (S.leaves) for (const l of leaves) {
      l.life -= dt;
      if (l.life <= 0 && Math.random() < 0.004 + Math.abs(wind.s) * 0.01) Object.assign(l, { life: 7, x: wind.s > 0 ? -30 : W + 30, y: 640 + Math.random() * 300, n: ['la-1', 'la-2', 'la-3'][Math.floor(Math.random() * 3)], r: Math.random() * TAU });
      if (l.life > 0) { l.x += (wind.s * 160 + 30 * Math.sign(wind.s || 1)) * dt; l.y += 55 * dt; put(ctx, l.n, l.x + Math.sin(t * 2 + l.r) * 18, l.y, 34, { a: 0.9, cy: 0.5, rot: t * 2 + l.r }); if (l.x < -60 || l.x > W + 60 || l.y > 1700) l.life = 0; }
    }
    // ánh đèn của đồ vật (đèn bão, đèn lồng, đèn tín hiệu…)
    for (const [n, x, y, h, o = {}] of [...S.props, ...(FG[st.map] || [])]) if (o.glow) {
      const gx = x + o.glow[0] * h, gy = y + o.glow[1] * h, col = o.glow[2] || '255,190,90';
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 70);
      g.addColorStop(0, `rgba(${col},${0.45 + Math.sin(t * 5 + x) * 0.06})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(gx - 70, gy - 70, 140, 140); ctx.restore();
    }
    eventItems(ctx, t, st);
    // chuyển cảnh: tối đen rồi sáng dần
    if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fade * 1.4)})`; ctx.fillRect(0, 0, W, 1920); fade = Math.max(0, fade - dt * 0.8); }
  }
  // vật phẩm sự kiện cạnh đống lửa
  const evA = {};
  function eventItems(ctx, t, st) {
    const LX = st.LX, LY = st.LY, ev = st.ev, dt = 1 / 60;
    const want = { trura: ev === 'trura', goihon: ev === 'goihon' || ev === 'ghostauto', nhap: ev === 'nhap' || ev === 'nhap-end', cauco: ev === 'cauco', go: t - pulses.go < 1.8, muoi: t - pulses.muoi < 1.6 };
    for (const k in want) evA[k] = Math.max(0, Math.min(1, (evA[k] || 0) + (want[k] ? dt * 2.5 : -dt * 1.5)));
    if (evA.trura > 0) {   // gương bát quái + chuông + bùa lơ lửng trên lửa, vòng sáng quay
      const a = evA.trura, y = LY - 330 + Math.sin(t * 1.5) * 8;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.5; ctx.strokeStyle = 'rgba(255,215,130,.8)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(LX, LY + 30, 230 + Math.sin(t * 2) * 10, 70, 0, 0, TAU); ctx.stroke(); ctx.restore();
      put(ctx, 'guong-bat-quai', LX, y, 120, { a, cy: 0.5 }); put(ctx, 'chuong', LX - 120, y + 30, 75, { a, cy: 0.5, rot: Math.sin(t * 3) * 0.15 }); put(ctx, 'bua', LX + 120, y + 25, 80, { a, cy: 0.5, rot: Math.sin(t * 1.7) * 0.1 });
    }
    if (evA.goihon > 0) put(ctx, 'bat-nhang', LX - 130, LY + 95, 105, { a: evA.goihon });
    if (evA.nhap > 0) put(ctx, 'khoi-nhap', LX, LY - 300 + Math.sin(t * 1.2) * 10, 170, { a: evA.nhap * 0.9, cy: 0.5 });
    if (evA.cauco > 0) { put(ctx, 'nen', LX - 150, LY + 100, 55, { a: evA.cauco }); put(ctx, 'nen', LX + 150, LY + 100, 55, { a: evA.cauco }); }
    if (evA.go > 0) { const sh = Math.max(0, 1.4 - (t - pulses.go)) * 5; put(ctx, 'cua-go', 540 + Math.sin(t * 60) * sh, HZ + 30, 190, { a: evA.go * 0.9 }); }
    if (evA.muoi > 0) { const k = Math.min(1, (t - pulses.muoi) / 0.6); put(ctx, 'hu-muoi', LX + 150, LY - 60, 85, { a: evA.muoi, cy: 0.5, rot: -k * 1.9 }); }
    if (t - pulses.nhang < 1) { const k = (t - pulses.nhang); put(ctx, 'bo-cui', 120 + (LX - 120) * k, 1000 + (LY - 1000) * k - Math.sin(k * Math.PI) * 220, 70, { cy: 0.5, rot: k * 5, a: 1 - Math.max(0, k - 0.85) * 6 }); }
  }

  // dáng người xem vẽ tay: ngoi-*/so-* (ngồi / ngồi sợ), dung-*/sodung-* (đứng / đứng hoảng); đuôi -r -l -f là hướng mặt trong tranh
  const POSE = { ngoi: [], so: [], dung: [], sodung: [] };
  fetch('/api/ma-nguoi2d').then(r => r.json()).then(list => {
    for (const f of list || []) {
      const m = /^(ngoi|so|dung|sodung)-.*?-([rlf])\.png$/i.exec(f) || [null, /^so/i.test(f) ? 'so' : 'ngoi', 'r'];
      const im = new Image(); im.src = B + 'nguoi/' + f; im.face = m[2].toLowerCase(); POSE[m[1].toLowerCase()].push(im);
    }
  }).catch(() => {});
  const ready = pool => pool.filter(i => i.complete && i.naturalWidth);
  // vẽ một người xem bằng dáng 2D; trả về false nếu chưa có dáng nào
  // hàng sau đống lửa (vòng ngoài, phía trên) đứng xem; còn lại ngồi. Mặt luôn quay về phía đống lửa.
  function viewer(ctx, v, x, y, sc, scared, LX, LY) {
    const stand = v.seat && v.seat.ring >= 3 && y < (LY ?? 1185) - 40 && ready(POSE.dung).length > 0;
    let pool = ready(stand ? (scared && ready(POSE.sodung).length ? POSE.sodung : POSE.dung) : (scared && ready(POSE.so).length ? POSE.so : POSE.ngoi));
    if (!pool.length) pool = ready(POSE.ngoi);
    if (!pool.length) return false;
    let h = 0; for (const c of String(v.id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const im = pool[h % pool.length], H = (stand ? 255 : 170) * sc, Wd = H * im.naturalWidth / im.naturalHeight;
    const want = x < LX ? 'r' : 'l', flip = im.face !== 'f' && im.face !== want;
    ctx.save(); ctx.translate(x, y + 22 * sc); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(im, -Wd / 2, -H, Wd, H); ctx.restore();
    return { headY: y + 22 * sc - H * 0.9 };
  }
  window.MA2D = {
    viewer, hasPoses: () => POSE.ngoi.some(i => i.complete && i.naturalWidth),
    ready: () => loaded > 20, scenes: Object.keys(SC), back, teller, tellerRect, fireBase, flame, front,
    pulse: k => { pulses[k] = lastT; if (k === 'go') wind.gust = 1.1; }, gust: () => { wind.gust = 1; },
  };
})();
