// Các điệu nhảy: mỗi hàm trả về tư thế theo nhịp.
// Góc tính bằng radian, 0 = chỉ thẳng xuống, dương = xoay về bên phải màn hình.
// lu/ru: cánh tay trên (tuyệt đối), lf/rf: cẳng tay (tương đối)
// lt/rt: đùi (tuyệt đối), ls/rs: cẳng chân (tương đối)
(function () {
  const S = Math.sin, C = Math.cos, PI = Math.PI, TAU = PI * 2;
  const N = () => ({ bob: 0, lean: 0, lu: -0.18, lf: -0.15, ru: 0.18, rf: 0.15, lt: -0.07, ls: 0.02, rt: 0.07, rs: -0.02, head: 0, spin: 1, rot: 0, lift: 0, dx: 0, sit: 0 });
  const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const bounce = p => Math.abs(S(p * PI));

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
      o.spin = C(q * TAU); o.bob = 0.03 * bounce(p);
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
      o.rot = PI; o.lift = 0.88; o.spin = C(q * TAU * 2);
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
      o.lean = 0.35 * w; o.dx = 0.2 * w; o.bob = 0.02;
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
      o.spin = q < 0.5 ? -1 : 1;
      o.lt = -0.05 + 0.15 * S(ph); o.ls = Math.max(0, 0.5 * S(ph)); o.rt = 0.05 + 0.15 * S(ph + PI); o.rs = -Math.max(0, 0.5 * S(ph + PI));
      o.lu = -0.25 + 0.25 * S(ph + PI); o.ru = 0.25 + 0.25 * S(ph); o.lf = -0.4; o.rf = 0.4;
      o.lean = -0.06 * o.spin; o.head = 0.1 * S(ph * 2);
      return o; } },
  ];

  // tư thế đặc biệt
  const SPECIAL = {
    walk(p) {
      const o = N(), ph = p * TAU;
      o.lt = 0.3 * S(ph); o.rt = -0.3 * S(ph); o.ls = Math.max(0, 0.5 * S(ph + 1)); o.rs = -Math.max(0, 0.5 * S(ph + PI + 1));
      o.lu = -0.15 - 0.3 * S(ph); o.ru = 0.15 - 0.3 * S(ph + PI); o.lf = -0.3; o.rf = 0.3;
      o.bob = 0.015 * Math.abs(S(ph)); return o;
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
    for (const key in a) o[key] = a[key] + (b[key] - a[key]) * k;
    return o;
  };
})();
