// Động tác thủ tục. Trục theo khung nhân vật (mặt nhìn về -Z, tay trái ở -X):
//  +X với chi chỉ xuống = đưa ra trước; gối gập = -X; khuỷu gập = +X; lưng/đầu cúi = -X
//  tay trái dang ngang = -Z, tay phải dang = +Z; quay đầu/thân = Y
const D = Math.PI / 180, TAU = Math.PI * 2;
const HIP_W = [30, 27, 19, 10, 1, -7, -9, -2, 14, 27, 32], KNEE_W = [4, 17, 17, 10, 5, 8, 34, 60, 58, 28, 4], ANK_W = [0, -6, 2, 7, 10, -4, -18, -6, 3, 2, 0];
const HIP_R = [35, 24, 6, -14, -26, -16, 10, 34, 46, 42, 35], KNEE_R = [22, 42, 32, 16, 14, 58, 100, 112, 82, 42, 22], ANK_R = [5, -12, -4, 10, 25, 15, 0, -5, -2, 3, 5];
function tab(T, p) { const n = T.length - 1; p = ((p % 1) + 1) % 1; const x = p * n, i = Math.floor(x), f = x - i;
  const g = k => T[((k % n) + n) % n], a = g(i - 1), b = g(i), c = g(i + 1), d = g(i + 2);
  return b + 0.5 * f * (c - a + f * (2 * a - 5 * b + 4 * c - d + f * (3 * (b - c) + d - a))); }
const S = Math.sin, C = Math.cos, ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
function legs(o, hipT, kneeT, ankT, p, hs = 1, ks = 1) {
  for (const [s, ph] of [['Left', p], ['Right', p + 0.5]]) {
    o[s + 'UpLeg'] = [['x', hs * tab(hipT, ph)]]; o[s + 'Leg'] = [['x', -ks * tab(kneeT, ph)]]; o[s + 'Foot'] = [['x', -tab(ankT, ph)]]; } }
function sitBase(o, br) { // ngồi bệt, bó gối
  o.hip = [0, -0.66, 0.05];
  for (const s of ['Left', 'Right']) { o[s + 'UpLeg'] = [['x', 112], ['z', (s == 'Left' ? -1 : 1) * 8]]; o[s + 'Leg'] = [['x', -138]]; o[s + 'Foot'] = [['x', 18]]; }
  o.Spine = [['x', -14 - br]]; o.Spine1 = [['x', -8]]; o.Head = [['x', 8]];
  o.LeftArm = [['x', 48], ['z', 14]]; o.RightArm = [['x', 48], ['z', -14]]; o.LeftForeArm = [['x', 62], ['y', -30]]; o.RightForeArm = [['x', 62], ['y', 30]]; }
const MOVES = {
  di_bo: { ten: 'Đi bộ', dur: 1.2, f(t) { const o = {}, p = t, sw = C(TAU * p); legs(o, HIP_W, KNEE_W, ANK_W, p, 1.22, 1.08);
    o.hip = [0, -0.012 - 0.018 * C(2 * TAU * p), 0]; o.Hips = [['y', 6 * sw], ['z', 3 * S(TAU * p)]]; o.Spine = [['y', -8 * sw], ['x', -3]];
    o.LeftArm = [['x', 22 * sw]]; o.RightArm = [['x', -22 * sw]]; o.LeftForeArm = [['x', 12 + 10 * Math.max(0, -sw)]]; o.RightForeArm = [['x', 12 + 10 * Math.max(0, sw)]]; return o; } },
  chay_bo: { ten: 'Chạy bộ', dur: 0.6, f(t) { const o = {}, p = t, sw = C(TAU * (p - 0.05)); legs(o, HIP_R, KNEE_R, ANK_R, p);
    o.hip = [0, -0.05 - 0.035 * C(2 * TAU * (p - 0.12)), 0]; o.Hips = [['y', 9 * sw], ['x', -6]]; o.Spine = [['y', -14 * sw], ['x', -8]]; o.Head = [['x', 8]];
    o.LeftArm = [['x', 45 * sw], ['z', 10]]; o.RightArm = [['x', -45 * sw], ['z', -10]]; o.LeftForeArm = [['x', 88 + 12 * sw]]; o.RightForeArm = [['x', 88 - 12 * sw]]; return o; } },
  dung_yen: { ten: 'Đứng thở', dur: 4.8, f(t) { const o = {}, b = S(TAU * t * 2), w = S(TAU * t);
    o.hip = [0.01 * w, -0.004, 0]; o.Hips = [['z', 2 * w]]; o.Spine = [['x', 1.5 * b], ['z', -2 * w]]; o.Spine2 = [['x', -1.5 * b]]; o.Head = [['y', 6 * S(TAU * t)], ['z', 1.5 * w]];
    o.LeftArm = [['x', 3 + 2 * b], ['z', 4]]; o.RightArm = [['x', 3 + 2 * b], ['z', -4]]; o.LeftForeArm = [['x', 10]]; o.RightForeArm = [['x', 10]];
    o.LeftUpLeg = [['z', 2 * w]]; o.RightUpLeg = [['z', 2 * w]]; return o; } },
  vay_tay: { ten: 'Vẫy chào', dur: 1.6, f(t) { const o = {}, w = S(TAU * t * 2);
    o.RightArm = [['z', 118], ['x', 20]]; o.RightForeArm = [['x', 30], ['z', 28 * w]]; o.RightHand = [['z', 15 * w]];
    o.Spine = [['z', 4]]; o.Head = [['z', -5], ['y', -8]]; o.LeftArm = [['x', 5], ['z', 4]]; o.LeftForeArm = [['x', 12]]; o.hip = [0, -0.005, 0]; return o; } },
  vo_tay: { ten: 'Vỗ tay', dur: 0.8, f(t) { const o = {}, c = 0.5 + 0.5 * C(TAU * t * 2);
    o.LeftArm = [['x', 42], ['z', 16 + 8 * c]]; o.RightArm = [['x', 42], ['z', -16 - 8 * c]];
    o.LeftForeArm = [['x', 72], ['y', -34 + 22 * c]]; o.RightForeArm = [['x', 72], ['y', 34 - 22 * c]]; o.Head = [['x', 4 * (1 - c)]];
    o.hip = [0, -0.01 * (1 - c), 0]; return o; } },
  cui_chao: { ten: 'Cúi chào', dur: 2.4, f(t) { const o = {}, k = ease(t < 0.5 ? t / 0.3 : (1 - t) / 0.35);
    o.Spine = [['x', -22 * k]]; o.Spine1 = [['x', -14 * k]]; o.Head = [['x', -10 * k]]; o.Hips = [['x', -8 * k]];
    o.LeftArm = [['x', 30], ['z', 16]]; o.RightArm = [['x', 30], ['z', -16]]; o.LeftForeArm = [['x', 75], ['y', -30]]; o.RightForeArm = [['x', 75], ['y', 30]];
    o.LeftUpLeg = [['x', 8 * k]]; o.RightUpLeg = [['x', 8 * k]]; o.hip = [0, 0, 0.04 * k]; return o; } },
  ngoi_bet: { ten: 'Ngồi bó gối', dur: 4.8, f(t) { const o = {}, b = S(TAU * t * 2); sitBase(o, 1.5 * b); o.Head[0] = ['x', 8 + 2 * b]; o.Head.push(['y', 10 * S(TAU * t)]); return o; } },
  ngoi_so: { ten: 'Ngồi run sợ', dur: 1.2, f(t) { const o = {}, j = S(TAU * t * 9), l = S(TAU * t); sitBase(o, 6);
    o.Spine.push(['z', 1.2 * j]); o.Head = [['x', 18], ['y', 22 * l]]; o.LeftArm[0] = ['x', 54 + 1.5 * j]; o.RightArm[0] = ['x', 54 - 1.5 * j]; o.hip = [0.003 * j, -0.67, 0.05]; return o; } },
  ngoi_xom: { ten: 'Ngồi chồm hổm', dur: 4.8, f(t) { const o = {}, b = S(TAU * t * 2);
    o.hip = [0, -0.55, 0.1];
    for (const s of ['Left', 'Right']) { o[s + 'UpLeg'] = [['x', 118], ['z', (s == 'Left' ? -1 : 1) * 16]]; o[s + 'Leg'] = [['x', -150]]; o[s + 'Foot'] = [['x', 30]]; }
    o.Spine = [['x', -22 - b]]; o.Spine1 = [['x', -6]]; o.Head = [['x', 18], ['y', 12 * S(TAU * t)]];
    o.LeftArm = [['x', 40], ['z', 4]]; o.RightArm = [['x', 40], ['z', -4]]; o.LeftForeArm = [['x', 40]]; o.RightForeArm = [['x', 40]]; return o; } },
  giat_minh: { ten: 'Giật mình', dur: 2.4, f(t) { const o = {}; const k = t < 0.08 ? ease(t / 0.08) : ease(1 - (t - 0.35) / 0.5) * (t > 0.35 ? 1 : 1);
    const kk = t < 0.35 ? k : k; const sh = t < 0.35 ? S(TAU * t * 14) * (0.35 - t) * 6 : 0;
    o.hip = [0, 0.05 * Math.max(0, S(Math.PI * Math.min(1, t / 0.16))), 0.12 * kk]; o.Hips = [['x', 8 * kk]];
    o.Spine = [['x', 14 * kk + sh]]; o.Head = [['x', 12 * kk]];
    o.LeftArm = [['x', 55 * kk], ['z', -22 * kk]]; o.RightArm = [['x', 55 * kk], ['z', 22 * kk]]; o.LeftForeArm = [['x', 75 * kk], ['y', -25 * kk]]; o.RightForeArm = [['x', 75 * kk], ['y', 25 * kk]];
    o.LeftUpLeg = [['x', 12 * kk]]; o.RightUpLeg = [['x', -6 * kk]]; o.RightLeg = [['x', -18 * kk]]; return o; } },
  run_so: { ten: 'Đứng run', dur: 1.2, f(t) { const o = {}, j = S(TAU * t * 10), l = S(TAU * t);
    o.hip = [0.004 * j, -0.04, 0]; o.Spine = [['x', -12], ['z', 1.5 * j]]; o.Head = [['x', -6], ['y', 25 * l]];
    o.LeftArm = [['x', 30], ['z', 20]]; o.RightArm = [['x', 30], ['z', -20]]; o.LeftForeArm = [['x', 110 + 3 * j], ['y', -40]]; o.RightForeArm = [['x', 110 - 3 * j], ['y', 40]];
    for (const s of ['Left', 'Right']) { o[s + 'UpLeg'] = [['x', 14], ['z', (s == 'Left' ? 1 : -1) * 4]]; o[s + 'Leg'] = [['x', -26]]; o[s + 'Foot'] = [['x', 12]]; } return o; } },
  nhay_mua: { ten: 'Nhảy múa', dur: 1.2, f(t) { const o = {}, p = TAU * t, b = Math.abs(S(p)), sw = S(p);
    o.hip = [0.04 * sw, -0.04 + 0.03 * b, 0]; o.Hips = [['y', 15 * sw], ['z', -5 * sw]]; o.Spine = [['z', 8 * sw], ['y', -8 * sw]]; o.Head = [['z', -6 * sw]];
    o.LeftArm = [['z', -45 - 40 * Math.max(0, sw)], ['x', 25]]; o.RightArm = [['z', 45 + 40 * Math.max(0, -sw)], ['x', 25]];
    o.LeftForeArm = [['x', 40 + 30 * b]]; o.RightForeArm = [['x', 40 + 30 * b]];
    o.LeftUpLeg = [['x', 20 * Math.max(0, sw)], ['z', -6]]; o.RightUpLeg = [['x', 20 * Math.max(0, -sw)], ['z', 6]];
    o.LeftLeg = [['x', -18 - 30 * Math.max(0, sw)]]; o.RightLeg = [['x', -18 - 30 * Math.max(0, -sw)]]; return o; } },
  nhin_quanh: { ten: 'Ngó quanh', dur: 4.8, f(t) { const o = {}, l = S(TAU * t);
    o.Head = [['y', 45 * l], ['x', -4]]; o.Spine1 = [['y', 15 * l]]; o.Hips = [['y', 5 * l]];
    o.RightArm = [['x', 55], ['z', -14]]; o.RightForeArm = [['x', 125], ['y', 40]]; o.RightHand = [['x', -20]];
    o.LeftArm = [['x', 5], ['z', 4]]; o.LeftForeArm = [['x', 12]]; return o; } },
  chi_tay: { ten: 'Chỉ tay', dur: 2.4, f(t) { const o = {}, k = ease(t < 0.5 ? t / 0.2 : (1 - t) / 0.25);
    o.RightArm = [['x', 85 * k], ['z', 10 * k]]; o.RightForeArm = [['x', 8]]; o.Spine = [['y', -12 * k], ['x', -4 * k]]; o.Head = [['y', -8 * k]];
    o.LeftArm = [['x', 5], ['z', 4]]; o.LeftForeArm = [['x', 12]]; o.LeftUpLeg = [['x', -4 * k]]; o.RightUpLeg = [['x', 10 * k]]; o.RightLeg = [['x', -8 * k]]; return o; } },
};
export { MOVES, D };
