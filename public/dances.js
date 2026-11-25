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
  const W2 = (p, b) => S((b % 2 + p) * PI);          // lắc qua lại, chu kỳ 2 phách
  const PU = p => 0.5 - 0.5 * C(p * TAU);            // nhịp mềm 0 → 1 → 0 trong một phách
  const HIT = p => Math.exp(-p * 5);                 // nhấn mạnh đúng phách rồi thả

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
    // ---------- điệu mới (bản 3.0): dùng hông, vai, bước chân thật ----------
    // tw: xoay hông · ctw: xoay ngực · hr: nghiêng hông · nod/hy: gật/quay đầu · spx: gập lưng · crouch: hạ trọng tâm
    // flx/fly/flz, frx/fry/frz: bàn chân trái/phải bước ngang / nhấc / bước trước-sau · sl/sr: nhún vai · dz: hông ra trước
    { name: 'bước chạm', keys: ['buoc cham', 'step touch', 'step'], f(p, b) {
      const o = N(), w = W2(p, b), k = PU(p);
      o.dx = 0.08 * w; o.tw = 0.16 * w; o.hr = 0.08 * w;
      o.fly = 0.06 * k * (w > 0 ? 1 : 0); o.fry = 0.06 * k * (w < 0 ? 1 : 0); o.flx = 0.05 * Math.max(0, w); o.frx = 0.05 * Math.min(0, w);
      o.lu = -0.35; o.lf = -0.9; o.ru = 0.35; o.rf = 0.9; o.lsx = 0.55 * w; o.rsx = -0.55 * w; o.lex = -0.9; o.rex = -0.9;
      o.head = -0.1 * w;
      return o; } },
    { name: 'bước chéo', keys: ['buoc cheo', 'grapevine', 'cheo chan'], f(p, b) {
      const o = N(), q = (b % 8 + p) / 8, ph = (b % 2 + p) * PI, tr = S(q * TAU);
      o.dx = 0.22 * tr; o.tw = 0.3 * C(q * TAU) * S(ph); o.ctw = -0.2 * S(ph);
      o.flz = 0.09 * S(ph); o.frz = -0.09 * S(ph); o.fly = 0.05 * Math.max(0, C(ph)); o.fry = 0.05 * Math.max(0, -C(ph));
      o.lu = -1.1 - 0.2 * S(ph); o.lf = -0.3; o.ru = 1.1 - 0.2 * S(ph); o.rf = 0.3; o.hy = 0.3 * C(q * TAU);
      return o; } },
    { name: 'twist', g: 0.4, keys: ['twist', 'vặn', 'van minh'], f(p, b) {
      const o = N(), a = S(p * TAU), q = S((b % 4 + p) / 4 * TAU);
      o.tw = 0.5 * a; o.ctw = -0.95 * a; o.crouch = 0.07 + 0.045 * q; o.lean = 0.07 * q;
      o.lu = -0.45; o.lf = -1.5; o.ru = 0.45; o.rf = 1.5; o.lsx = 0.45 * a; o.rsx = -0.45 * a;
      o.flx = -0.03; o.frx = 0.03; o.fly = 0.02 * Math.max(0, a); o.fry = 0.02 * Math.max(0, -a);
      return o; } },
    { name: 'lắc hông', keys: ['lac hong', 'hip', 'lac mong'], f(p, b) {
      const o = N(), a = S(p * TAU), w = W2(p, b);
      o.hr = 0.2 * a; o.dx = 0.045 * a; o.crouch = 0.035; o.tw = 0.1 * w;
      o.lu = -2.25 + 0.15 * a; o.lf = 2.0; o.ru = 2.25 + 0.15 * a; o.rf = -2.0; o.head = -0.12 * a; o.ctw = 0.12 * w;
      return o; } },
    { name: 'uốn sóng', g: 0.5, keys: ['uon song', 'body roll', 'uon nguoi', 'uon eo'], f(p, b) {
      const o = N(), a = (b % 2 + p) * PI;
      o.spx = 0.3 * S(a); o.dz = 0.085 * S(a - 1.3); o.nod = 0.3 * S(a + 0.9); o.crouch = 0.05 + 0.05 * S(a - 2.2);
      o.lu = -0.3; o.lf = -0.5; o.ru = 0.3; o.rf = 0.5; o.lsx = -0.5 - 0.3 * S(a - 0.6); o.rsx = -0.5 - 0.3 * S(a - 0.6); o.lex = -1.0; o.rex = -1.0;
      o.flx = -0.03; o.frx = 0.03;
      return o; } },
    { name: 'vogue', g: 0.5, snap: 1.8, keys: ['vogue', 'tao dang', 'pose'], f(p, b) {
      const st = b % 4, A = [[-2.6, 2.2, 0.5, 1.3, 0.4], [-1.57, -1.5, 1.57, 1.5, -0.4], [-0.6, -2.5, 2.6, -2.2, 0.5], [-2.85, -0.15, 2.85, 0.15, 0]][st], o = N();
      o.lu = A[0]; o.lf = A[1]; o.ru = A[2]; o.rf = A[3]; o.hy = A[4]; o.hr = [0.14, -0.14, 0.1, 0][st]; o.dx = [0.04, -0.04, 0.03, 0][st];
      o.crouch = 0.03 * Math.exp(-p * 5); o.nod = -0.1;
      return o; } },
    { name: 'chạy tại chỗ', keys: ['chay tai cho', 'running', 'chay'], f(p, b) {
      const o = N(), ph = (b % 2 + p) * PI, s1 = S(ph);
      o.fly = 0.15 * Math.max(0, s1); o.flz = -0.14 * C(ph); o.fry = 0.15 * Math.max(0, -s1); o.frz = 0.14 * C(ph);
      o.crouch = 0.035; o.spx = 0.12; o.ctw = 0.2 * C(ph);
      o.lu = -0.2; o.lf = -0.2; o.ru = 0.2; o.rf = 0.2; o.lsx = -0.75 * C(ph); o.rsx = 0.75 * C(ph); o.lex = -1.4; o.rex = -1.4;
      return o; } },
    { name: 'charleston', keys: ['charleston', 'da truoc da sau'], f(p, b) {
      const o = N(), st = b % 4, k = S(Math.min(1, p * 1.5) * PI);
      if (st === 0) { o.fry = 0.2 * k; o.frz = 0.3 * k; } else if (st === 2) { o.fly = 0.16 * k; o.flz = -0.28 * k; }
      const a = (b % 2 + p) * PI;
      o.lu = -0.5; o.ru = 0.5; o.lf = -0.4; o.rf = 0.4; o.lsx = 0.85 * S(a); o.rsx = -0.85 * S(a); o.lex = -0.6; o.rex = -0.6;
      o.tw = 0.2 * S(a); o.crouch = 0.04; o.spx = 0.08;
      return o; } },
    { name: 'đấm gió', keys: ['dam gio', 'fist pump', 'pump'], f(p, b) {
      const o = N(), h = HIT(p), sd = (b >> 2) % 2;
      o.lift = 0.045 * S(p * PI); o.crouch = 0.04 * h;
      if (sd) { o.ru = 2.75; o.rf = 0.2; o.rex = -0.9 * (1 - h); o.lu = -0.55; o.lf = -2.0; } else { o.lu = -2.75; o.lf = -0.2; o.lex = -0.9 * (1 - h); o.ru = 0.55; o.rf = 2.0; }
      o.nod = 0.2 * h; o.flx = -0.04; o.frx = 0.04;
      return o; } },
    { name: 'vòi phun', g: 0.6, keys: ['voi phun', 'sprinkler', 'tuoi cay'], f(p, b) {
      const o = N(), q = (b % 4 + p) / 4, sweep = q < 0.75 ? Math.floor(q / 0.75 * 6) / 6 + 0.04 * HIT((q * 8) % 1) : 1 - (q - 0.75) / 0.25;
      o.lu = -2.2; o.lf = 2.3; o.rsx = -1.5; o.rex = -0.05; o.ru = -0.7 + 1.5 * sweep; o.rf = 0;
      o.ctw = -0.5 + 1.0 * sweep; o.tw = -0.15 + 0.3 * sweep; o.crouch = 0.03; o.hy = -0.3 + 0.6 * sweep;
      return o; } },
    { name: 'cuộn bắp cải', keys: ['bap cai', 'cabbage', 'cuon bap cai', 'khuay'], f(p, b) {
      const o = N(), a = (b % 2 + p) * PI;
      o.lsx = -1.25 + 0.2 * S(a); o.rsx = -1.25 + 0.2 * S(a); o.lu = 0.2 + 0.45 * C(a); o.ru = -0.2 + 0.45 * C(a); o.lex = -0.55 - 0.35 * S(a); o.rex = -0.55 - 0.35 * S(a); o.lf = 0; o.rf = 0;
      o.ctw = 0.3 * C(a); o.dx = 0.05 * C(a); o.dz = 0.03 * S(a); o.crouch = 0.05; o.hr = 0.08 * C(a);
      return o; } },
    { name: 'dougie', keys: ['dougie', 'du gi', 'vuot toc'], f(p, b) {
      const o = N(), w = W2(p, b), hand = (b >> 2) % 2;
      o.lean = 0.14 * w; o.dx = 0.09 * w; o.tw = 0.2 * w; o.hr = 0.1 * w; o.crouch = 0.05;
      if (hand) { o.ru = 2.2; o.rf = -2.3 + 0.3 * S(p * TAU); o.lu = -0.4; o.lf = -0.5; o.lsx = 0.3 * w; }
      else { o.lu = -2.2; o.lf = 2.3 - 0.3 * S(p * TAU); o.ru = 0.4; o.rf = 0.5; o.rsx = -0.3 * w; }
      o.head = -0.15 * w;
      return o; } },
    { name: 'nae nae', keys: ['nae nae', 'ne ne', 'nay nay'], f(p, b) {
      const o = N(), w = W2(p, b);
      o.crouch = 0.09; o.hr = 0.14 * w; o.dx = 0.08 * w; o.tw = 0.12 * w; o.flx = -0.05; o.frx = 0.05;
      o.ru = 2.45 + 0.2 * w; o.rf = 0.45 * S(p * TAU); o.lu = -0.75; o.lf = -0.3; o.lsx = -0.3; o.head = 0.12 * w;
      return o; } },
    { name: 'whip', g: 0.6, snap: 1.6, keys: ['whip', 'quat tay', 'dam thang'], f(p, b) {
      const o = N(), sd = b % 2, h = p < 0.5 ? 1 : 1 - (p - 0.5) * 2;
      o.crouch = 0.1 * h; o.tw = (sd ? -0.3 : 0.3) * h; o.ctw = (sd ? 0.2 : -0.2) * h; o.flx = -0.05; o.frx = 0.05;
      if (sd) { o.lsx = -1.5 * h; o.lex = -0.05; o.lu = 0.2 * h - 0.18 * (1 - h); o.lf = -0.15; o.ru = 0.5; o.rf = 1.6; }
      else { o.rsx = -1.5 * h; o.rex = -0.05; o.ru = -0.2 * h + 0.18 * (1 - h); o.rf = 0.15; o.lu = -0.5; o.lf = -1.6; }
      o.nod = 0.15 * h;
      return o; } },
    { name: 'lắc vai', keys: ['lac vai', 'shimmy', 'rung vai'], f(p, b) {
      const o = N(), a = S(p * TAU * 2), w = W2(p, b);
      o.sl = 0.035 * a; o.sr = -0.035 * a; o.ctw = 0.26 * a; o.spx = 0.12 + 0.05 * w; o.hr = 0.06 * w; o.dx = 0.04 * w;
      o.lu = -0.95; o.lf = -0.35; o.ru = 0.95; o.rf = 0.35; o.lsx = -0.25; o.rsx = -0.25; o.crouch = 0.04;
      return o; } },
    { name: 'YMCA', g: 0.6, keys: ['ymca', 'y m c a'], f(p, b) {
      const o = N(), st = (b >> 1) % 4;
      const A = [[-2.35, 0, 2.35, 0, 0], [-1.9, 2.5, 1.9, -2.5, 0], [-2.7, 0.9, -0.55, -1.3, 0.16], [-2.95, 0.5, 2.95, -0.5, 0]][st];
      o.lu = A[0]; o.lf = A[1]; o.ru = A[2]; o.rf = A[3]; o.lean = A[4]; o.lift = st === 0 ? 0.03 * S(p * PI) : 0; o.hr = 0.06 * W2(p, b);
      return o; } },
    { name: 'thriller', keys: ['thriller', 'zombie', 'xac song'], f(p, b) {
      const o = N(), sd = (b >> 1) % 2 ? 1 : -1, h = HIT(p);
      o.lu = -1.15 + 0.85 * sd; o.lf = -1.25; o.ru = 1.15 + 0.85 * sd; o.rf = 1.25; o.lsx = -0.95; o.rsx = -0.95; o.lex = -0.5 - 0.2 * h; o.rex = -0.5 - 0.2 * h;
      o.lean = -0.13 * sd; o.head = -0.3 * sd; o.dx = 0.08 * sd; o.hr = 0.1 * sd; o.crouch = 0.05 + 0.03 * h;
      o.fly = sd < 0 ? 0.04 * h : 0; o.fry = sd > 0 ? 0.04 * h : 0;
      return o; } },
    { name: 'vẫy tay', keys: ['vay tay', 'gio tay', 'hands up', 'wave hand'], f(p, b) {
      const o = N(), w = W2(p, b);
      o.lu = -2.65 + 0.38 * w; o.ru = 2.65 + 0.38 * w; o.lf = -0.25 * w - 0.1; o.rf = -0.25 * w + 0.1; o.lean = 0.1 * w; o.dx = 0.08 * w; o.hr = 0.1 * w; o.head = -0.1 * w; o.nod = -0.12;
      return o; } },
    { name: 'bật nhảy', keys: ['bat nhay', 'pogo', 'nhay tung tung', 'tung tung'], f(p, b) {
      const o = N(), up = S(p * PI), sd = b % 2;
      o.lift = 0.05 * up * up; o.crouch = 0.07 * (1 - up);
      o.lu = sd ? -2.8 : -0.9; o.lf = sd ? -0.1 : -1.8; o.ru = sd ? 0.9 : 2.8; o.rf = sd ? 1.8 : 0.1; o.nod = 0.1 * (1 - up);
      return o; } },
    { name: 'vinahouse', g: 1.3, keys: ['vinahouse', 'vina house', 'quay', 'quẩy', 'len do', 'lac dau'], f(p, b) {
      const o = N(), a = S(p * TAU * 2), k = PU(p), w = W2(p, b);
      o.hy = 0.5 * a; o.nod = 0.12 + 0.1 * k; o.crouch = 0.06 + 0.035 * k; o.tw = 0.18 * S(p * TAU); o.dx = 0.05 * w;
      o.lu = 0.1; o.ru = -0.1; o.lf = 0; o.rf = 0; o.lsx = -1.15; o.rsx = -1.15; o.lex = -1.5 - 0.5 * a; o.rex = -1.5 + 0.5 * a;
      o.flx = -0.04; o.frx = 0.04;
      return o; } },
    { name: 'chỉ tay', g: 0.7, snap: 1.5, keys: ['chi tay', 'point', 'kpop'], f(p, b) {
      const o = N(), st = b % 4, h = HIT(p);
      o.lu = -0.6; o.lf = -2.1;
      if (st === 0) { o.ru = 2.4; o.rf = 0; o.hr = 0.18; o.hy = 0.3; }
      else if (st === 1) { o.ru = 0.2; o.rsx = -1.45; o.rex = 0; o.rf = 0; o.hr = -0.16; o.dz = 0.03; }
      else if (st === 2) { o.ru = 1.5; o.rf = 0; o.hr = 0.18; o.hy = -0.35; o.lean = -0.06; }
      else { o.ru = 0.35; o.rf = 2.3; o.hr = -0.14; o.nod = 0.15; }
      o.crouch = 0.035 * h; o.dx = 0.04 * (st % 2 ? -1 : 1);
      return o; } },
    { name: 'bắn tim', g: 0.7, keys: ['ban tim', 'tha tim', 'heart', 'tim'], f(p, b) {
      const o = N(), big = (b >> 2) % 2 === 0, w = W2(p, b);
      if (big) { o.lu = -2.5; o.lf = 1.75; o.ru = 2.5; o.rf = -1.75; o.lean = 0.09 * w; o.dx = 0.05 * w; }
      else { o.ru = -0.15; o.rsx = -1.25; o.rex = -2.0 - 0.15 * PU(p); o.rf = 0; o.lu = -0.6; o.lf = -2.1; o.head = 0.18; o.hr = 0.1 * w; }
      o.hr = (o.hr || 0) + 0.08 * w;
      return o; } },
    { name: 'kazotsky', g: 0.3, keys: ['kazotsky', 'cossack', 'nga', 'ngoi xom da chan'], f(p, b) {
      const o = N(), sd = b % 2, k = S(Math.min(1, p * 1.4) * PI);
      o.crouch = 0.2 - 0.04 * k; o.lift = 0.02 * k;
      o.lu = 0.45; o.ru = -0.45; o.lf = 0.3; o.rf = -0.3; o.lsx = -1.3; o.rsx = -1.3; o.lex = -1.3; o.rex = -1.3;
      if (sd) { o.fry = 0.1 * k; o.frz = 0.32 * k; } else { o.fly = 0.1 * k; o.flz = 0.32 * k; }
      o.spx = -0.08;
      return o; } },
    { name: 'bơi', g: 0.6, keys: ['boi', 'swim', 'boi loi'], f(p, b) {
      const o = N(), q = b % 8, a = (b % 2 + p) * PI;
      if (q < 6) { o.lsx = -1.7 - 1.0 * S(a); o.rsx = -1.7 + 1.0 * S(a); o.lex = -0.25 - 0.3 * C(a); o.rex = -0.25 + 0.3 * C(a); o.lu = -0.2; o.ru = 0.2; o.lf = 0; o.rf = 0; o.ctw = 0.3 * S(a); o.spx = 0.2; o.crouch = 0.04; }
      else { const k = (q - 6 + p) / 2, dn = S(k * PI); o.rsx = -1.2; o.rex = -2.2; o.ru = -0.2; o.rf = 0; o.lu = -2.7; o.lf = -0.3 * S(p * TAU * 2); o.crouch = 0.18 * dn; o.hr = 0.1 * S(p * TAU * 2); }
      return o; } },
    { name: 'đánh đàn', keys: ['danh dan', 'air guitar', 'guitar', 'rock'], f(p, b) {
      const o = N(), h = HIT(p), a = S(p * TAU * 2);
      o.lu = -1.25; o.lf = -0.6; o.lsx = -0.45; o.lex = -0.5; o.ru = 0.25; o.rf = 0.3; o.rsx = -0.45; o.rex = -1.15 + 0.5 * a;
      o.spx = -0.14; o.nod = 0.35 * h; o.tw = 0.3; o.ctw = -0.2; o.frz = 0.16; o.flz = -0.08; o.crouch = 0.05 + 0.03 * h; o.lean = -0.06;
      return o; } },
    { name: 'khỉ', keys: ['khi', 'monkey', 'con khi'], f(p, b) {
      const o = N(), w = W2(p, b);
      o.lsx = -1.5 + 0.8 * w; o.rsx = -1.5 - 0.8 * w; o.lex = -0.9; o.rex = -0.9; o.lu = -0.15; o.ru = 0.15; o.lf = 0; o.rf = 0;
      o.crouch = 0.09; o.spx = 0.14; o.nod = -0.1 + 0.12 * w; o.flx = -0.05; o.frx = 0.05; o.ctw = 0.15 * w;
      return o; } },
    { name: 'hula', g: 0.5, keys: ['hula', 'lac vong', 'xoay hong'], f(p, b) {
      const o = N(), a = (b % 2 + p) * PI;
      o.dx = 0.07 * C(a); o.dz = 0.06 * S(a); o.hr = 0.14 * C(a); o.tw = 0.14 * S(a); o.crouch = 0.03;
      o.lu = -1.35 + 0.25 * S(a); o.lf = -0.5 + 0.3 * S(a - 1); o.ru = 1.35 + 0.25 * S(a + PI); o.rf = 0.5 + 0.3 * S(a + PI - 1); o.head = -0.08 * C(a);
      return o; } },
    { name: 'can-can', g: 0.5, keys: ['can can', 'cancan', 'da cao'], f(p, b) {
      const o = N(), sd = b % 2, k = S(Math.min(1, p * 1.5) * PI);
      if (sd) { o.rt = 0.07 + 1.35 * k; o.rs = -0.2 * k; } else { o.lt = -0.07 - 1.35 * k; o.ls = 0.2 * k; }
      o.lu = -0.85; o.lf = -1.7; o.ru = 0.85; o.rf = 1.7; o.lift = 0.03 * S(p * PI); o.spx = -0.1 * k; o.lean = (sd ? -0.07 : 0.07) * k;
      return o; } },
    { name: 'giật điện', g: 1.4, snap: 2, keys: ['giat dien', 'harlem', 'harlem shake', 'rung'], f(p, b, t) {
      const o = N(), a = S(t * 23), c = S(t * 17 + 1), e = S(t * 29 + 2);
      o.lu = -1.0 + 0.7 * a; o.lf = -1.2 + 0.6 * c; o.ru = 1.0 + 0.7 * c; o.rf = 1.2 + 0.6 * e; o.lsx = -0.5 + 0.5 * e; o.rsx = -0.5 + 0.5 * a;
      o.hy = 0.35 * c; o.spx = 0.12 * a; o.hr = 0.12 * e; o.crouch = 0.07 + 0.03 * c; o.dx = 0.03 * a;
      return o; } },
    { name: 'đung đưa', g: 0.9, keys: ['dung dua', 'sway', 'nhe nhang', 'lac lu'], f(p, b) {
      const o = N(), w = W2(p, b), sn = HIT(p);
      o.lean = 0.07 * w; o.dx = 0.07 * w; o.hr = 0.09 * w; o.tw = 0.1 * w;
      o.lu = -0.3; o.lf = -0.9; o.ru = 0.3; o.rf = 0.9; o.lsx = -0.35 + 0.22 * w; o.rsx = -0.35 - 0.22 * w; o.lex = -1.0 - 0.15 * sn; o.rex = -1.0 - 0.15 * sn; o.head = -0.1 * w;
      return o; } },
    { name: 'vỗ đùi', keys: ['vo dui', 'slap', 'schuhplattler'], f(p, b) {
      const o = N(), sd = b % 2, k = HIT(p);
      if (sd) { o.fry = 0.16 * k; o.frz = 0.1 * k; o.rsx = -0.5 * k; o.rex = -0.6; o.ru = 0.1; o.rf = 0.2; o.lu = -1.6; o.lf = -0.3; }
      else { o.fly = 0.16 * k; o.flz = 0.1 * k; o.lsx = -0.5 * k; o.lex = -0.6; o.lu = -0.1; o.lf = -0.2; o.ru = 1.6; o.rf = 0.3; }
      o.crouch = 0.03; o.lift = 0.02 * S(p * PI); o.hr = (sd ? 0.1 : -0.1) * k;
      return o; } },
    { name: 'lướt sóng', g: 0.5, keys: ['luot song', 'surf', 'luot van'], f(p, b) {
      const o = N(), w = S((b % 4 + p) / 4 * TAU);
      o.tw = 0.7; o.ctw = -0.5; o.hy = -0.5; o.crouch = 0.1 + 0.04 * w; o.lean = 0.1 * w; o.dx = 0.05 * w;
      o.flx = -0.1; o.frx = 0.1; o.lu = -1.5 + 0.2 * w; o.lf = -0.2; o.ru = 1.5 + 0.2 * w; o.rf = 0.2; o.hr = 0.08 * w;
      return o; } },
    { name: 'đẩy tạ', keys: ['day ta', 'raise the roof', 'day tran', 'nang tran'], f(p, b) {
      const o = N(), k = PU(p);
      o.lu = -2.6; o.ru = 2.6; o.lf = 1.3 - 1.25 * k; o.rf = -1.3 + 1.25 * k; o.crouch = 0.07 * (1 - k); o.nod = -0.15 * k; o.hr = 0.07 * W2(p, b);
      return o; } },
  ];
  // điệu cũ: mức "groove" (lắc hông tự động) và độ dứt khoát
  const TUNE = { robot: [0.25, 2.2], xoay: [0.5], 'lộn': [0], 'xoay đầu': [0], 'con sâu': [0], waltz: [0.5], tango: [0.4], moonwalk: [0.35], 'máy bay': [0.4], macarena: [0.6], dab: [0.6], 'hit the woah': [0.7], 'búa rìu': [0.5] };
  for (const d of D) if (TUNE[d.name]) { d.g = TUNE[d.name][0]; if (TUNE[d.name][1]) d.snap = TUNE[d.name][1]; }

  // tư thế đặc biệt
  const SPECIAL = {
    walk(p) {   // đi bộ tự nhiên: tay buông sát thân, đánh trước–sau ngược chân, khuỷu hơi gập, vai xoay nhẹ, người hơi ngả về trước
      const o = N(), ph = p * TAU, sw = S(ph);
      o.lu = -0.07; o.ru = 0.07; o.lf = -0.04; o.rf = 0.04;
      o.lsx = -0.5 * sw; o.rsx = 0.5 * sw; o.lex = -0.28 - 0.3 * Math.max(0, sw); o.rex = -0.28 - 0.3 * Math.max(0, -sw);
      o.spx = 0.07; o.hr = 0.05 * sw; o.head = 0; o.nod = -0.03; o.sl = 0.006 * sw; o.sr = -0.006 * sw;
      o.walk = p; o.g = 0.15; return o;
    },
    catwalk(p) {
      const o = SPECIAL.walk(p); o.lean = 0.06 * S(p * TAU); o.lu = -0.9; o.lf = -2.2; o.ru = 0.35 + 0.2 * S(p * TAU); o.rf = 0.2; o.head = 0.1; return o;
    },
    pose() { const o = N(); o.lu = -0.9; o.lf = -2.2; o.ru = 2.6; o.rf = 0.3; o.lean = -0.08; o.rt = 0.25; o.rs = -0.4; o.head = -0.15; return o; },
    fall(p) { const o = N(); o.lu = -2.5; o.ru = 2.5; o.lf = -0.4; o.rf = 0.4; o.lt = -0.4; o.rt = 0.4; o.ls = 0.6; o.rs = -0.6; return o; },
    sit(p) { const o = N(); o.sit = 1; o.g = 0.5; o.lu = -0.5; o.lf = -1.2; o.ru = 0.6 + 0.3 * Math.abs(S(p * PI)); o.rf = 1.8; o.head = 0.1 * S(p * TAU); return o; },
    dj(p, b) {   // hai tay trên bàn mixer, gật đầu theo nhịp; mỗi 4 phách giơ một tay hô
      const o = N(), h = HIT(p), up = b % 8 === 0 || b % 8 === 4, sd = b % 8 === 4;
      o.lu = -0.25; o.lf = 0.1; o.lsx = -0.75 - 0.1 * h; o.lex = -1.0; o.ru = 0.25; o.rf = -0.1; o.rsx = -0.75; o.rex = -1.0 - 0.12 * S(p * TAU * 2);
      if (up) { if (sd) { o.lu = -2.6; o.lf = -0.2; o.lsx = -0.2; o.lex = -0.5 * (1 - h); } else { o.ru = 2.6; o.rf = 0.2; o.rsx = -0.2; o.rex = -0.5 * (1 - h); } }
      o.nod = 0.22 * h; o.spx = 0.12; o.crouch = 0.02 * h; o.hy = 0.25 * S((b % 4 + p) / 4 * TAU); o.g = 0.6; return o; },
    fly(p) { const o = N(); o.lu = -2.9; o.ru = 2.9; o.lf = 0; o.rf = 0; o.lt = -0.05; o.rt = 0.05; return o; },
    // ---------- quán bar: khách ở quầy, bartender, dancer trên bục ----------
    barStand(p, b, t, z) {   // tựa quầy, tay cầm ly, thỉnh thoảng nhấp một ngụm, ngoái nhìn sàn
      const o = N(), sip = Math.max(0, S(t * 0.9 + z * 2.3) - 0.8) * 5;
      o.lu = -0.2; o.lf = 0.15; o.lsx = -0.55; o.lex = -1.15; o.ru = 0.15; o.rf = -0.1; o.rsx = -0.5 - 0.45 * sip; o.rex = -1.75 - 0.75 * sip;
      o.nod = -0.18 * sip; o.hy = 0.55 * S(t * 0.35 + z); o.hr = 0.06 * S(t * 0.7 + z); o.g = 0.45; o.lt = -0.1; o.rt = 0.1; return o; },
    barSit(p, b, t, z) { const o = SPECIAL.barStand(p, b, t, z); o.sit = 1; o.g = 0.35; o.hy = 0.95 * S(t * 0.3 + z); return o; },
    shake(p, b, t) { const o = N(), a = S(t * 17); o.lu = 0.5; o.lf = 0.2; o.lsx = -1.5; o.lex = -1.5 + 0.25 * a; o.ru = -0.2; o.rf = -0.2; o.rsx = -1.8; o.rex = -1.3 + 0.25 * a; o.ctw = 0.35; o.hy = -0.3; o.sl = 0.012 * a; o.sr = -0.012 * a; o.g = 0.5; return o; },
    pour(p, b, t) { const o = N(); o.lu = -0.2; o.lf = 0.1; o.lsx = -0.7; o.lex = -1.0; o.ru = 0.3; o.rf = -0.3; o.rsx = -1.1; o.rex = -0.9 + 0.1 * S(t * 3); o.spx = 0.2; o.nod = 0.3; o.g = 0.3; return o; },
    wipe(p, b, t) { const o = N(), a = t * 4; o.lu = -0.2; o.lf = 0.1; o.lsx = -0.4; o.lex = -0.9; o.ru = 0.1 + 0.25 * C(a); o.rf = 0; o.rsx = -0.95 + 0.12 * S(a); o.rex = -0.75; o.spx = 0.22; o.nod = 0.25; o.g = 0.3; return o; },
    serve(p, b, t) { const o = N(); o.lu = -0.25; o.lf = 0.1; o.lsx = -0.6; o.lex = -0.9; o.ru = 0.25; o.rf = -0.1; o.rsx = -0.6; o.rex = -0.9; o.hy = 0.55 * S(t * 0.5); o.spx = 0.08; o.g = 0.7; return o; },
    poleWave(p, b) {   // hai tay với lên cột sau lưng, trượt người xuống rồi lên, lắc hông
      const o = N(), a = (b % 4 + p) / 4 * TAU;
      o.lu = -2.75; o.lf = 0.5; o.lsx = 0.25; o.ru = 2.75; o.rf = -0.5; o.rsx = 0.25;
      o.crouch = 0.24 * (0.5 - 0.5 * C(a)); o.flx = -0.1; o.frx = 0.1; o.hr = 0.16 * S(a * 2); o.dx = 0.05 * S(a * 2); o.spx = -0.06 + 0.1 * S(a * 2 + 1); o.nod = -0.15; o.g = 0.3; return o; },
    poleSpin(ph) {   // một tay bám cột, đi vòng quanh, tay kia vung cao
      const o = SPECIAL.walk(ph); o.ru = 1.45; o.rf = 0; o.rsx = 0.05; o.lu = -2.5; o.lf = -0.2; o.lsx = 0; o.lean = -0.14; o.head = -0.2; o.g = 0; return o; },    jump(k) { const o = N(); o.lift = 0.07 * S(k * PI);   /* chỉ nhún bật nhẹ ~12 cm, không bay lên cao */ o.lu = -2.5; o.ru = 2.5; o.lt = -0.5 * S(k * PI); o.ls = 1.2 * S(k * PI); o.rt = 0.5 * S(k * PI); o.rs = -1.2 * S(k * PI); o.rot = k > 0.15 && k < 0.85 ? 0 : 0; return o; },
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
