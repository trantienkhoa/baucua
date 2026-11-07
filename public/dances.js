// Các điệu nhảy: mỗi hàm trả về tư thế theo nhịp.
// Góc tính bằng radian, 0 = chỉ thẳng xuống, dương = xoay về bên phải màn hình.
// lu/ru: cánh tay trên (tuyệt đối), lf/rf: cẳng tay (tương đối)
// lt/rt: đùi (tuyệt đối), ls/rs: cẳng chân (tương đối)
(function () {
  const S = Math.sin, C = Math.cos, PI = Math.PI, TAU = PI * 2;
  const N = () => ({ yaw: 0, walk: -1, bob: 0, lean: 0, lu: -0.18, lf: -0.15, ru: 0.18, rf: 0.15, lt: -0.07, ls: 0.02, rt: 0.07, rs: -0.02, head: 0, spin: 1, rot: 0, lift: 0, dx: 0, sit: 0 });
  const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const bounce = p => Math.abs(S(p * PI));
  const PRONE = Math.PI / 2;   // nằm sấp (con sâu)

  const D = [
    { name: 'nhún', keys: ['nhun', 'nhún', 'bounce'], f(p, b) {
      const o = N(), k = bounce(p);
      o.bob = 0.05 * (1 - k);
      o.lt = -0.07 - 0.25 * (1 - k); o.ls = 0.5 * (1 - k);
      o.rt = 0.07 + 0.25 * (1 - k); o.rs = -0.5 * (1 - k);
      o.lu = -0.5 - 0.3 * k; o.lf = -1.4; o.ru = 0.5 + 0.3 * k; o.rf = 1.4;
      o.head = 0.12 * S(p * TAU);
      return o; } },
    { name: 'lắc', keys: ['lac', 'lắc', 'shake'], f(p, b) {
      const o = N(), w = S((b % 2 + p) * PI);
      o.lean = 0.18 * w; o.dx = 0.08 * w; o.bob = 0.02 * bounce(p);
      o.lu = -0.6 + 0.4 * w; o.lf = -1.6; o.ru = 0.6 + 0.4 * w; o.rf = 1.6;
      o.lt = -0.12 + 0.12 * w; o.rt = 0.12 + 0.12 * w;
      o.head = -0.15 * w;
      return o; } },
    { name: 'xoay', keys: ['xoay', 'spin', 'quay'], f(p, b) {
      const o = N(), q = ((b % 2) + p) / 2;
      o.spin = C(q * TAU); o.yaw = q * TAU; o.bob = 0.03 * bounce(p);
      o.lu = -1.3; o.lf = -0.3; o.ru = 1.3; o.rf = 0.3;
      o.lt = -0.12; o.rt = 0.12;
      return o; } },
    { name: 'robot', keys: ['robot', 'rô bốt', 'ro bot'], f(p, b) {
      const o = N(), st = (b * 2 + (p > 0.5 ? 1 : 0)) % 4;
      const A = [[-1.57, 1.57, 1.57, 0], [-1.57, -1.57, 0.2, 0], [-0.2, 0, 1.57, -1.57], [-2.8, 0, 2.8, 0]][st];
      o.lu = A[0]; o.lf = A[1]; o.ru = A[2]; o.rf = A[3];
      o.head = [0.25, -0.25, 0, 0][st]; o.lean = [0, 0, 0.05, -0.05][st];
      o.lt = st % 2 ? -0.2 : -0.07; o.ls = st % 2 ? 0.3 : 0;
      return o; } },
    { name: 'disco', keys: ['disco', 'đít xcô', 'dis co'], f(p, b) {
      const o = N(), up = b % 2 === 0, k = ease(p < 0.5 ? p * 2 : 1);
      if (up) { o.ru = 0.3 + 2.4 * k; o.rf = 0.1; o.lu = -0.3; o.lf = -1.6; }
      else { o.ru = 2.7 - 2.9 * k; o.rf = 0; o.lu = -0.3; o.lf = -1.6; }
      o.lean = up ? -0.08 : 0.08; o.dx = up ? 0.04 : -0.04;
      o.lt = -0.15; o.ls = 0.25; o.rt = 0.1; o.bob = 0.03 * bounce(p);
      return o; } },
    { name: 'hiphop', keys: ['hiphop', 'hip hop', 'hip'], f(p, b) {
      const o = N(), k = bounce(p), sd = b % 2 ? 1 : -1;
      o.bob = 0.06 * (1 - k); o.lean = 0.1 * sd;
      o.lu = -0.9 + 0.7 * k * (sd < 0 ? 1 : 0); o.lf = -1.9;
      o.ru = 0.9 - 0.7 * k * (sd > 0 ? 1 : 0); o.rf = 1.9;
      o.lt = -0.3 * (1 - k) - 0.1; o.ls = 0.6 * (1 - k); o.rt = 0.3 * (1 - k) + 0.1; o.rs = -0.6 * (1 - k);
      o.head = 0.2 * (1 - k) * sd;
      return o; } },
    { name: 'vỗ tay', keys: ['vo tay', 'vỗ tay', 'clap'], f(p, b) {
      const o = N(), k = p < 0.25 ? 1 - p * 4 : (p - 0.25) / 0.75;
      o.lu = -2.4 - 0.5 * (1 - k); o.lf = -0.6 + 1.2 * (1 - k) * 0.5;
      o.ru = 2.4 + 0.5 * (1 - k); o.rf = 0.6 - 1.2 * (1 - k) * 0.5;
      o.bob = 0.03 * bounce(p); o.lt = -0.1; o.rt = 0.1;
      o.head = 0.1 * S(b * PI);
      return o; } },
    { name: 'sóng', keys: ['song', 'sóng', 'wave', 'uốn'], f(p, b, t) {
      const o = N(), q = (b % 2 + p) / 2 * TAU;
      o.lu = -1.57 + 0.5 * S(q); o.lf = 0.7 * S(q - 1.2);
      o.ru = 1.57 + 0.5 * S(q - 2.4); o.rf = 0.7 * S(q - 3.6);
      o.lean = 0.08 * S(q - 1.8); o.head = 0.2 * S(q - 0.6);
      o.bob = 0.02 * bounce(p);
      return o; } },
    { name: 'lộn', keys: ['lon', 'lộn', 'flip', 'lộn nhào'], f(p, b) {
      const o = N(), q = ((b % 2) + p) / 2;
      if (q < 0.6) { const k = q / 0.6; o.rot = -TAU * ease(k); o.lift = 0.9 * S(k * PI); o.lt = -1.4; o.ls = 2.2; o.rt = 1.4; o.rs = -2.2; o.lu = -2.2; o.ru = 2.2; o.lf = -0.6; o.rf = 0.6; if (k > 0.85) { o.lt = -0.3; o.rt = 0.3; o.ls = 0.4; o.rs = -0.4; } }
      else { const k = (q - 0.6) / 0.4; o.lu = -2.6; o.ru = 2.6; o.lf = 0; o.rf = 0; o.bob = 0.06 * (1 - k); o.lt = -0.25; o.ls = 0.5 * (1 - k); o.rt = 0.25; o.rs = -0.5 * (1 - k); }
      return o; } },
    { name: 'xoay đầu', keys: ['xoay dau', 'xoay đầu', 'headspin', 'trồng cây'], f(p, b) {
      const o = N(), q = ((b % 2) + p) / 2;
      o.rot = PI; o.lift = 0; o.spin = C(q * TAU * 2); o.yaw = q * TAU * 2;
      o.lu = -0.6; o.lf = -0.9; o.ru = 0.6; o.rf = 0.9;
      o.lt = -0.5 - 0.3 * S(q * TAU * 2); o.ls = 0.1; o.rt = 0.5 + 0.3 * S(q * TAU * 2); o.rs = -0.1;
      return o; } },
    { name: 'gà', keys: ['ga', 'gà', 'chicken', 'con gà'], f(p, b) {
      const o = N(), k = S(p * TAU * 2);
      o.lu = -0.6 - 0.5 * Math.max(0, k); o.lf = 2.6; o.ru = 0.6 + 0.5 * Math.max(0, k); o.rf = -2.6;
      o.lt = -0.3; o.ls = 0.7; o.rt = 0.3; o.rs = -0.7; o.bob = 0.07 + 0.02 * k;
      o.head = 0.25 * S(p * TAU); o.lean = 0.05 * S(b * PI);
      return o; } },
    { name: 'máy bay', keys: ['may bay', 'máy bay', 'plane', 'bay'], f(p, b) {
      const o = N(), w = S((b % 4 + p) / 4 * TAU);
      o.lu = -1.57; o.lf = 0; o.ru = 1.57; o.rf = 0;
      o.lean = 0.35 * w; o.dx = 0.2 * w; o.bob = 0.02; o.yaw = 0.5 * w;
      o.lt = -0.12; o.rt = 0.12 + 0.3 * Math.max(0, -w); o.rs = -0.3 * Math.max(0, -w);
      return o; } },
    { name: 'đá chân', keys: ['da chan', 'đá chân', 'kick', 'đá'], f(p, b) {
      const o = N(), side = b % 2, k = S(Math.min(1, p * 1.6) * PI);
      if (side) { o.rt = 0.07 + 1.3 * k; o.rs = -0.3 * k; o.lt = -0.05; } else { o.lt = -0.07 - 1.3 * k; o.ls = 0.3 * k; o.rt = 0.05; }
      o.lu = -1.0; o.lf = -1.2; o.ru = 1.0; o.rf = 1.2; o.lean = side ? -0.1 * k : 0.1 * k;
      o.bob = 0.02;
      return o; } },
    { name: 'moonwalk', keys: ['moonwalk', 'moon', 'trượt'], f(p, b) {
      const o = N(), q = (b % 4 + p) / 4, ph = (b % 2 + p) / 2 * TAU;
      o.dx = 0.35 * (q < 0.5 ? q * 2 - 0.5 : 1.5 - q * 2);
      o.spin = q < 0.5 ? -1 : 1; o.yaw = q < 0.5 ? -PI / 2 : PI / 2;
      o.lt = -0.05 + 0.15 * S(ph); o.ls = Math.max(0, 0.5 * S(ph)); o.rt = 0.05 + 0.15 * S(ph + PI); o.rs = -Math.max(0, 0.5 * S(ph + PI));
      o.lu = -0.25 + 0.25 * S(ph + PI); o.ru = 0.25 + 0.25 * S(ph); o.lf = -0.4; o.rf = 0.4;
      o.lean = -0.06 * o.spin; o.head = 0.1 * S(ph * 2);
      return o; } },
    { name: 'waltz', keys: ['waltz', 'van xo', 'van-xo', 'khieu vu', 'khiêu vũ', 'ballroom'], f(p, b) {
      const o = N(), q = ((b % 3) + p) / 3, ph = q * TAU;
      o.yaw = Math.sin(ph) * 0.9; o.dx = 0.12 * Math.sin(ph); o.bob = 0.035 * Math.abs(Math.sin(ph * 1.5));
      o.lu = -1.4; o.lf = -0.6; o.ru = 1.0; o.rf = 1.3; o.lean = -0.06 + 0.05 * Math.sin(ph);
      o.walk = (q * 1.5) % 1; o.head = -0.15;
      return o; } },
    { name: 'tango', keys: ['tango'], f(p, b) {
      const o = N(), st = b % 4, k = ease(Math.min(1, p * 2));
      o.lu = -1.55; o.lf = -0.4; o.ru = 1.2; o.rf = 1.5; o.head = st % 2 ? 0.35 : -0.35;
      if (st === 0) { o.lt = -0.6 * k; o.ls = 0.1; o.rt = 0.15; o.lean = 0.1 * k; o.bob = 0.06 * k; }
      else if (st === 1) { o.lt = -0.6; o.rt = 0.15 + 0.5 * k; o.rs = -0.8 * k; o.lean = 0.1; o.bob = 0.06; }
      else if (st === 2) { o.yaw = PI * 0.5 * k; o.lt = -0.15; o.rt = 0.15; o.bob = 0.02; }
      else { o.yaw = PI * 0.5 * (1 - k); o.lean = -0.18 * Math.sin(k * PI); o.rt = 0.5 * Math.sin(k * PI); o.rs = -0.4 * Math.sin(k * PI); }
      return o; } },
    { name: 'salsa', keys: ['salsa', 'cha cha', 'cha-cha', 'latin', 'rumba'], f(p, b) {
      const o = N(), sd = b % 2 ? 1 : -1, k = bounce(p);
      o.dx = 0.06 * sd * k; o.lean = -0.1 * sd * k; o.bob = 0.02 * (1 - k);
      o.lt = sd < 0 ? -0.35 * k : -0.07; o.ls = sd < 0 ? 0.4 * k : 0; o.rt = sd > 0 ? 0.35 * k : 0.07; o.rs = sd > 0 ? -0.4 * k : 0;
      o.lu = -0.9 - 0.4 * k * (sd < 0 ? 1 : 0); o.lf = -1.3; o.ru = 0.9 + 0.4 * k * (sd > 0 ? 1 : 0); o.rf = 1.3;
      o.yaw = 0.25 * sd * k; o.head = 0.15 * sd;
      return o; } },
    // ---------- điệu hot trend (bản 1.9.8) ----------
    // lsx/rsx: vai đưa ra trước (âm = ra trước/lên), lex/rex: khuỷu gập ra trước
    { name: 'con sâu', floor: true, keys: ['con sau', 'lam con sau', 'worm', 'the worm'], f(p, b) {
      const o = N(), q = ((b % 2) + p) / 2, w = S(q * TAU);
      o.rot = PRONE + 0.24 * w; o.lift = 0.1 * Math.max(0, w);
      o.lu = -1.25; o.lf = -1.6 - 0.4 * Math.max(0, -w); o.ru = 1.25; o.rf = 1.6 + 0.4 * Math.max(0, -w);
      o.lt = -0.05; o.rt = 0.05; o.ls = 1.1 * Math.max(0, -w); o.rs = -1.1 * Math.max(0, -w);
      o.head = 0.15 * w;
      return o; } },
    { name: 'gangnam', keys: ['gangnam', 'gang nam', 'cuoi ngua', 'oppa', 'ngua'], f(p, b, t) {
      const o = N(), st = b % 8, k = bounce(p), sd = b % 2 ? 1 : -1;
      o.bob = 0.07 * k; o.lift = 0.04 * k;
      o.lt = -0.28 + (sd > 0 ? -0.22 * k : 0); o.ls = sd > 0 ? 0.7 * k : 0.25;
      o.rt = 0.28 + (sd < 0 ? 0.22 * k : 0); o.rs = sd < 0 ? -0.7 * k : -0.25;
      if (st < 6) {   // hai cổ tay bắt chéo trước ngực, nhún như cưỡi ngựa
        o.lu = 0.35; o.lf = 0.25; o.lsx = -1.15; o.lex = -1.25 - 0.15 * k;
        o.ru = -0.35; o.rf = -0.25; o.rsx = -1.15; o.rex = -1.25 - 0.15 * k;
        o.head = 0.12 * S(p * TAU);
      } else {        // quăng thòng lọng trên đầu
        o.ru = 2.75; o.rf = 0.5 * S(p * TAU * 2); o.rsx = -0.25 * C(p * TAU * 2);
        o.lu = -0.65; o.lf = -2.2; o.lsx = 0; o.lex = 0;
        o.head = -0.2;
      }
      return o; } },
    { name: 'floss', keys: ['floss', 'flos', 'dua tay', 'dánh tay'], f(p, b) {
      const o = N(), w = S(p * TAU), fs = S((b % 2 + p) * PI);
      o.lu = -0.15 + 0.55 * w; o.ru = 0.15 + 0.55 * w; o.lf = 0; o.rf = 0;
      o.lsx = 0.6 * fs; o.rsx = -0.6 * fs; o.lex = 0; o.rex = 0;
      o.dx = -0.07 * w; o.lean = 0.1 * w; o.bob = 0.02 * Math.abs(w);
      o.lt = -0.1 - 0.08 * w; o.rt = 0.1 - 0.08 * w;
      return o; } },
    { name: 'dab', keys: ['dab', 'dap', 'đáp'], f(p, b) {
      const o = N(), hold = b % 2 === 0, sd = (b >> 1) % 2 ? 1 : -1, k = hold ? Math.min(1, p * 7) : 1 - Math.min(1, p * 3);
      const kk = bounce(p);
      o.bob = 0.03 * (1 - kk); o.lt = -0.15; o.rt = 0.15; o.ls = 0.2; o.rs = -0.2;
      if (sd < 0) {   // gục đầu vào khuỷu tay trái, tay phải duỗi chéo lên
        o.lu = -0.18 + 0.8 * k; o.lf = -0.15 - 0.4 * k; o.lsx = -1.35 * k; o.lex = -1.9 * k;
        o.ru = 0.18 + 2.0 * k; o.rf = 0.15 - 0.15 * k; o.rsx = -0.3 * k; o.rex = 0;
        o.head = 0.45 * k; o.lean = 0.12 * k;
      } else {
        o.ru = 0.18 - 0.8 * k; o.rf = 0.15 + 0.4 * k; o.rsx = -1.35 * k; o.rex = -1.9 * k;
        o.lu = -0.18 - 2.0 * k; o.lf = -0.15 + 0.15 * k; o.lsx = -0.3 * k; o.lex = 0;
        o.head = -0.45 * k; o.lean = -0.12 * k;
      }
      return o; } },
    { name: 'shuffle', keys: ['shuffle', 'running man', 'chay bo', 'xao chan', 'lac chan'], f(p, b) {
      const o = N(), ph = (b % 2 + p) / 2 * 2 % 1, s1 = S(ph * TAU);
      o.walk = ph; o.bob = 0.05 * Math.abs(s1); o.dx = 0.05 * S((b % 4 + p) / 4 * TAU);
      o.lu = -0.35; o.lf = -1.7; o.lsx = -0.6 * s1; o.lex = -0.4;
      o.ru = 0.35; o.rf = 1.7; o.rsx = 0.6 * s1; o.rex = -0.4;
      o.head = 0.1 * s1;
      return o; } },
    { name: '2 phút hơn', keys: ['2 phut hon', 'hai phut hon', '2phut hon', '2 phut'], f(p, b, t) {
      const o = N(), st = b % 4, sd = b % 2 ? 1 : -1, k = bounce(p);
      o.bob = 0.05 * (1 - k); o.lt = -0.12 - 0.15 * (1 - k); o.ls = 0.35 * (1 - k); o.rt = 0.12 + 0.15 * (1 - k); o.rs = -0.35 * (1 - k);
      o.dx = 0.05 * sd * k; o.lean = 0.06 * sd * k; o.head = 0.18 * sd * k;
      if (st === 3) {   // hai tay cuộn tròn trước ngực
        const r = p * TAU * 2;
        o.lu = 0.25; o.lf = 0.2; o.lsx = -1.0 + 0.2 * S(r); o.lex = -1.3 + 0.45 * C(r);
        o.ru = -0.25; o.rf = -0.2; o.rsx = -1.0 + 0.2 * S(r + PI); o.rex = -1.3 + 0.45 * C(r + PI);
      } else if (sd > 0) { o.ru = 2.5 + 0.25 * k; o.rf = 0.2; o.lu = -0.6; o.lf = -2.1; }   // đấm tay lên trời, tay kia chống hông
      else { o.lu = -2.5 - 0.25 * k; o.lf = -0.2; o.ru = 0.6; o.rf = 2.1; }
      return o; } },
    { name: 'búa rìu', keys: ['bang bua riu', 'băng búa rìu', 'bua riu', 'búa rìu', 'bua', 'riu', 'chat cui'], f(p, b) {
      const o = N(), q = ((b % 2) + p) / 2;
      let up;   // giơ búa từ từ, bổ xuống thật nhanh đúng phách
      if (q < 0.75) up = ease(q / 0.75); else up = 1 - ease((q - 0.75) / 0.25);
      o.lu = 0.3; o.ru = -0.3; o.lf = 0.15; o.rf = -0.15;
      o.lsx = -0.6 - 2.1 * up; o.rsx = -0.6 - 2.1 * up; o.lex = -0.3 - 0.4 * up; o.rex = -0.3 - 0.4 * up;
      o.lt = -0.32; o.rt = 0.32; o.ls = 0.15 + 0.4 * (1 - up); o.rs = -0.15 - 0.4 * (1 - up);
      o.rot = 0.22 * (1 - up); o.bob = 0.05 * (1 - up); o.head = 0;
      return o; } },
    { name: 'macarena', keys: ['macarena', 'ma ca re na'], f(p, b) {
      const st = b % 8, k = Math.min(1, p * 3.5);
      const A = [   // [lu, lf, lsx, lex, ru, rf, rsx, rex]
        [-0.18, -0.15, 0, 0, 0, 0, -1.5, 0],
        [0, 0, -1.5, 0, 0, 0, -1.5, 0],
        [0, 0, -1.5, -0.2, 0, 0, -1.5, -0.2],
        [0, 0, -1.5, 0, 0, 0, -1.5, 0],
        [0, 0, -1.5, 0, -0.6, 0, -1.2, -2.0],
        [0.6, 0, -1.2, -2.0, -0.6, 0, -1.2, -2.0],
        [-2.4, -2.4, 0, 0, 2.4, 2.4, 0, 0],
        [-0.6, -2.2, 0, 0, 0.6, 2.2, 0, 0],
      ];
      const a = A[(st + 7) % 8], c = A[st], o = N();
      [o.lu, o.lf, o.lsx, o.lex, o.ru, o.rf, o.rsx, o.rex] = c.map((v, i) => a[i] + (v - a[i]) * ease(k));
      o.dx = 0.05 * S(p * TAU); o.lean = 0.05 * S(p * TAU); o.bob = 0.02 * bounce(p);
      if (st === 7 && p > 0.5) o.lift = 0.12 * S((p - 0.5) * 2 * PI);
      o.lt = -0.1; o.rt = 0.1;
      return o; } },
    { name: 'hit the woah', keys: ['hit the woah', 'woah', 'hit woah', 'woa'], f(p, b) {
      const o = N(), sd = b % 2 ? 1 : -1, k = Math.min(1, p * 6), rel = p > 0.6 ? (p - 0.6) / 0.4 : 0, h = k * (1 - rel * 0.7);
      o.lu = 0.3 * h; o.lf = 0.2; o.lsx = -1.05 * h; o.lex = -1.6 * h;
      o.ru = -0.3 * h; o.rf = -0.2; o.rsx = -1.05 * h; o.rex = -1.6 * h;
      o.lean = 0.16 * sd * h; o.yaw = 0.35 * sd * h; o.bob = 0.05 * h; o.head = -0.15 * sd * h;
      o.lt = -0.2; o.rt = 0.2; o.ls = 0.3 * h; o.rs = -0.3 * h;
      return o; } },
  ];

  // tư thế đặc biệt
  const SPECIAL = {
    walk(p) {
      const o = N(), ph = p * TAU;
      o.lt = 0.3 * S(ph); o.rt = -0.3 * S(ph); o.ls = Math.max(0, 0.5 * S(ph + 1)); o.rs = -Math.max(0, 0.5 * S(ph + PI + 1));
      o.lu = -0.15 - 0.3 * S(ph); o.ru = 0.15 - 0.3 * S(ph + PI); o.lf = -0.3; o.rf = 0.3;
      o.bob = 0.015 * Math.abs(S(ph)); o.walk = p; return o;
    },
    catwalk(p) {
      const o = SPECIAL.walk(p); o.lean = 0.06 * S(p * TAU); o.lu = -0.9; o.lf = -2.2; o.ru = 0.35 + 0.2 * S(p * TAU); o.rf = 0.2; o.head = 0.1; return o;
    },
    pose() { const o = N(); o.lu = -0.9; o.lf = -2.2; o.ru = 2.6; o.rf = 0.3; o.lean = -0.08; o.rt = 0.25; o.rs = -0.4; o.head = -0.15; return o; },
    fall(p) { const o = N(); o.lu = -2.5; o.ru = 2.5; o.lf = -0.4; o.rf = 0.4; o.lt = -0.4; o.rt = 0.4; o.ls = 0.6; o.rs = -0.6; return o; },
    sit(p) { const o = N(); o.sit = 1; o.lu = -0.5; o.lf = -1.2; o.ru = 0.6 + 0.3 * Math.abs(S(p * PI)); o.rf = 1.8; o.head = 0.1 * S(p * TAU); return o; },
    dj(p, b) { const o = N(); const k = bounce(p); o.bob = 0.03 * (1 - k); o.lu = -0.7; o.lf = -1.0 - 0.2 * k; o.ru = b % 4 === 0 ? 2.7 : 0.7; o.rf = b % 4 === 0 ? 0.2 : 1.0; o.head = 0.25 * (1 - k); return o; },
    fly(p) { const o = N(); o.lu = -2.9; o.ru = 2.9; o.lf = 0; o.rf = 0; o.lt = -0.05; o.rt = 0.05; return o; },
    jump(k) { const o = N(); o.lift = 1.1 * S(k * PI); o.lu = -2.5; o.ru = 2.5; o.lt = -0.5 * S(k * PI); o.ls = 1.2 * S(k * PI); o.rt = 0.5 * S(k * PI); o.rs = -1.2 * S(k * PI); o.rot = k > 0.15 && k < 0.85 ? 0 : 0; return o; },
  };

  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim(); }

  window.DANCES = D;
  window.SPECIAL_POSES = SPECIAL;
  window.normText = norm;
  window.lerpPose = function (a, b, k) {
    const o = {};
    for (const key in a) { const bv = b[key] ?? a[key]; o[key] = a[key] + (bv - a[key]) * k; }
    for (const key in b) if (!(key in o)) o[key] = b[key];
    return o;
  };
})();
