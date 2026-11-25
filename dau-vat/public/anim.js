// Tư thế + chuyển động + thư viện chiêu đấu vật (hai người).
// Góc tính bằng độ. Tay: X âm = đưa ra trước, Z (+ tay trái / − tay phải) = dang ngang. Cẳng tay: X âm = gập khuỷu.
// Đùi: X âm = đưa ra trước; cẳng chân: X dương = gập gối. Lưng/ngực: X dương = cúi; Y dương = xoay trái.
// Hông: p = vị trí xương chậu so với gốc nhân vật (đứng = [0, H0, 0]); r = [cúi(+)/ngửa(−), xoay, nghiêng].
export const H0 = 1.13;

const merge = (...ps) => { const o = {}; for (const p of ps) if (p) for (const k of Object.keys(p)) o[k] = p[k]; return o; };
export const P = {};
P.stand = { hips: { p: [0, H0, 0], r: [0, 0, 0] }, spine: [2, 0, 0], chest: [2, 0, 0], neck: [0, 0, 0], head: [-2, 0, 0], lArm: [4, 0, 11], rArm: [4, 0, -11], lFore: [-14, 0, 0], rFore: [-14, 0, 0], lThigh: [0, 0, 3], rThigh: [0, 0, -3], lShin: [3, 0, 0], rShin: [3, 0, 0], lFoot: [-3, 0, 0], rFoot: [-3, 0, 0] };
P.stance = merge(P.stand, { hips: { p: [0, H0 - 0.08, 0], r: [0, 0, 0] }, spine: [14, 0, 0], chest: [10, 0, 0], neck: [-8, 0, 0], head: [-12, 0, 0],
  lArm: [-42, 0, 24], lFore: [-78, 0, 0], rArm: [-42, 0, -24], rFore: [-78, 0, 0],
  lThigh: [-28, 0, 7], lShin: [44, 0, 0], lFoot: [-16, 0, 0], rThigh: [-12, 0, -7], rShin: [34, 0, 0], rFoot: [-22, 0, 0] });
P.tieup = merge(P.stance, { spine: [22, 0, 0], chest: [12, 0, 0], lArm: [-80, 0, 12], lFore: [-55, 0, 0], rArm: [-72, 0, -8], rFore: [-40, 0, 0] });
P.stun = merge(P.stand, { hips: { p: [0, H0 - 0.04, 0], r: [-4, 0, 0] }, spine: [-6, 0, 3], chest: [-4, 0, 0], head: [12, 8, 6], lArm: [10, 0, 16], rArm: [6, 0, -14], lFore: [-25, 0, 0], rFore: [-30, 0, 0], lThigh: [-6, 0, 6], rThigh: [8, 0, -5], lShin: [12, 0, 0], rShin: [10, 0, 0] });
P.bent = merge(P.stand, { hips: { p: [0, H0 - 0.05, 0], r: [8, 0, 0] }, spine: [40, 0, 0], chest: [22, 0, 0], head: [-20, 0, 0], lArm: [-30, 0, 12], rArm: [-30, 0, -12], lFore: [-40, 0, 0], rFore: [-40, 0, 0], lThigh: [-12, 0, 6], rThigh: [-6, 0, -6], lShin: [20, 0, 0], rShin: [16, 0, 0] });
P.lieBack = { hips: { p: [0, 0.17, 0], r: [-90, 0, 0] }, spine: [-4, 0, 0], chest: [-2, 0, 0], neck: [6, 0, 0], head: [10, 12, 0], lArm: [-6, 0, 62], rArm: [-6, 0, -58], lFore: [-30, 0, 0], rFore: [-18, 0, 0], lThigh: [-12, 0, 12], rThigh: [-4, 0, -10], lShin: [22, 0, 0], rShin: [8, 0, 0], lFoot: [30, 0, 0], rFoot: [30, 0, 0] };
P.lieFront = { hips: { p: [0, 0.17, 0], r: [90, 0, 0] }, spine: [-4, 0, 0], chest: [-4, 0, 0], neck: [-14, 0, 0], head: [-16, 40, 0], lArm: [-150, 0, 30], rArm: [-60, 0, -40], lFore: [-30, 0, 0], rFore: [-60, 0, 0], lThigh: [6, 0, 10], rThigh: [0, 0, -8], lShin: [10, 0, 0], rShin: [30, 0, 0], lFoot: [40, 0, 0], rFoot: [40, 0, 0] };
P.sit = { hips: { p: [0, 0.16, -0.05], r: [-12, 0, 0] }, spine: [20, 0, 0], chest: [10, 0, 0], head: [0, 0, 0], lArm: [32, 0, 14], rArm: [32, 0, -14], lFore: [-10, 0, 0], rFore: [-10, 0, 0], lThigh: [-78, 0, 8], rThigh: [-78, 0, -8], lShin: [20, 0, 0], rShin: [8, 0, 0], lFoot: [10, 0, 0], rFoot: [10, 0, 0] };
P.kneel = merge(P.stand, { hips: { p: [0, 0.6, 0], r: [0, 0, 0] }, spine: [24, 0, 0], chest: [10, 0, 0], head: [-14, 0, 0], lArm: [-40, 0, 10], lFore: [-50, 0, 0], rArm: [10, 0, -12], rFore: [-20, 0, 0], lThigh: [-88, 0, 6], lShin: [86, 0, 0], lFoot: [0, 0, 0], rThigh: [8, 0, -6], rShin: [96, 0, 0], rFoot: [40, 0, 0] });
P.knees = merge(P.stand, { hips: { p: [0, 0.6, 0], r: [0, 0, 0] }, lThigh: [0, 0, 6], rThigh: [0, 0, -6], lShin: [92, 0, 0], rShin: [92, 0, 0], lFoot: [40, 0, 0], rFoot: [40, 0, 0] });
P.crouch = merge(P.stand, { hips: { p: [0, H0 - 0.38, 0], r: [10, 0, 0] }, spine: [38, 0, 0], chest: [10, 0, 0], head: [-26, 0, 0], lThigh: [-75, 0, 14], rThigh: [-70, 0, -14], lShin: [105, 0, 0], rShin: [100, 0, 0], lFoot: [-25, 0, 0], rFoot: [-25, 0, 0], lArm: [-55, 0, 18], rArm: [-55, 0, -18], lFore: [-60, 0, 0], rFore: [-60, 0, 0] });

// ---- khiêu khích / ăn mừng ----
P.flex = merge(P.stand, { hips: { p: [0, H0 - 0.03, 0], r: [0, 0, 0] }, spine: [-4, 0, 0], chest: [-8, 0, 0], head: [-6, 0, 0], lArm: [0, 0, 92], lFore: [0, 0, 100], rArm: [0, 0, -92], rFore: [0, 0, -100], lThigh: [0, 0, 9], rThigh: [0, 0, -9] });
P.armsUp = merge(P.stand, { spine: [-6, 0, 0], chest: [-8, 0, 0], head: [-22, 0, 0], lArm: [-160, 0, 24], lFore: [-12, 0, 0], rArm: [-160, 0, -24], rFore: [-12, 0, 0], lThigh: [0, 0, 8], rThigh: [0, 0, -8] });
P.pointUp = merge(P.stand, { head: [-26, -10, 0], rArm: [-172, 0, -10], rFore: [0, 0, 0], lArm: [8, 0, 14], spine: [-4, 0, 0] });
P.pointFwd = merge(P.stand, { head: [-4, 0, 0], rArm: [-92, -10, -8], rFore: [0, 0, 0], lArm: [10, 0, 22], lFore: [-90, 0, 0], spine: [4, -10, 0] });
P.roar = merge(P.stand, { hips: { p: [0, H0 - 0.1, 0], r: [0, 0, 0] }, spine: [-12, 0, 0], chest: [-14, 0, 0], head: [-34, 0, 0], lArm: [20, 0, 34], lFore: [-60, 0, 0], rArm: [20, 0, -34], rFore: [-60, 0, 0], lThigh: [-14, 0, 16], rThigh: [-14, 0, -16], lShin: [26, 0, 0], rShin: [26, 0, 0] });
P.wide = merge(P.stand, { spine: [-6, 0, 0], chest: [-6, 0, 0], head: [-14, 0, 0], lArm: [0, 0, 100], rArm: [0, 0, -100], lFore: [0, 0, 0], rFore: [0, 0, 0] });
P.pump = merge(P.stand, { rArm: [-160, 0, -16], rFore: [-80, 0, 0], lArm: [8, 0, 14], head: [-14, 0, 0] });
P.bow = merge(P.stand, { spine: [42, 0, 0], chest: [14, 0, 0], head: [20, 0, 0], lArm: [8, 0, 4], rArm: [8, 0, -4], lFore: [-4, 0, 0], rFore: [-4, 0, 0] });
P.belt = merge(P.stand, { head: [-24, 0, 0], spine: [-8, 0, 0], chest: [-6, 0, 0], lArm: [-168, 0, 22], lFore: [-30, 0, 0], rArm: [-168, 0, -22], rFore: [-30, 0, 0] });
P.shades = merge(P.stand, { rArm: [-118, 0, -18], rFore: [-118, 0, 0], head: [-6, 0, 0] });

const S = Math.sin, Cc = Math.cos, PI = Math.PI;
// ---- chuyển động theo pha ----
export function walkPose(ph, speed = 1, out = {}) {
  const s = S(ph), c = Cc(ph), A = 26 * speed;
  return merge(P.stand, {
    hips: { p: [0, H0 - 0.015 - 0.02 * Math.abs(c), 0], r: [2, 4 * s, 0] },
    lThigh: [-A * s, 0, 3], rThigh: [A * s, 0, -3],
    lShin: [6 + 46 * Math.max(0, c) * speed, 0, 0], rShin: [6 + 46 * Math.max(0, -c) * speed, 0, 0],
    lFoot: [-6 + 12 * s, 0, 0], rFoot: [-6 - 12 * s, 0, 0],
    lArm: [22 * s * speed, 0, 12], rArm: [-22 * s * speed, 0, -12], lFore: [-22, 0, 0], rFore: [-22, 0, 0],
    spine: [4, -4 * s, 0], head: [-3, 3 * s, 0],
  });
}
export function runPose(ph) {
  const s = S(ph), c = Cc(ph);
  return merge(P.stand, {
    hips: { p: [0, H0 - 0.05 + 0.05 * Math.abs(s), 0], r: [10, 6 * s, 0] },
    lThigh: [-58 * s - 10, 0, 3], rThigh: [58 * s - 10, 0, -3],
    lShin: [24 + 80 * Math.max(0, c), 0, 0], rShin: [24 + 80 * Math.max(0, -c), 0, 0],
    lFoot: [-10, 0, 0], rFoot: [-10, 0, 0],
    lArm: [48 * s, 0, 14], rArm: [-48 * s, 0, -14], lFore: [-85, 0, 0], rFore: [-85, 0, 0],
    spine: [14, -8 * s, 0], chest: [6, 0, 0], head: [-12, 0, 0],
  });
}
export function idlePose(t, seed = 0) {
  // nhún nhảy thủ thế
  const b = S(t * 4.2 + seed), sw = S(t * 1.3 + seed * 2);
  const p = merge(P.stance);
  p.hips = { p: [0.03 * sw, H0 - 0.08 - 0.015 * (b + 1), 0], r: [0, 8 * sw, 0] };
  p.lArm = [-42 + 6 * b, 0, 24]; p.rArm = [-42 - 6 * b, 0, -24];
  p.head = [-12, -6 * sw, 0];
  return p;
}
export function struggle(t) {
  const p = merge(P.lieBack);
  p.lArm = [-20 + 20 * S(t * 3), 0, 60]; p.head = [20 + 10 * S(t * 2), 20 * S(t * 1.3), 0];
  p.lThigh = [-30 - 10 * S(t * 2.5), 0, 10]; p.lShin = [50, 0, 0];
  return p;
}

// ================== THƯ VIỆN CHIÊU ==================
// mỗi khoá: t (giây), a/d = tư thế người ra đòn / chịu đòn, ap/dp = [x, z, xoay°, nâng] trong khung lúc bắt đầu chiêu (người ra đòn nhìn +Z).
// e: kiểu nội suy ('io' mặc định, 'in' rơi nhanh dần, 'out', 'lin').
// hit: thời điểm va chạm; end: 'down' (nằm ngửa), 'downF' (nằm sấp), 'stun'; aEnd: người ra đòn sau chiêu ('stand'|'down').
const T = (p, o) => merge(p, o);
const run = (ph) => runPose(ph);
const LIE = P.lieBack, LIEF = P.lieFront;

export const MOVES = {
  // ---------- ĐÒN ĐÁNH ----------
  clothesline: { name: 'Clothesline', vn: 'Đánh cánh tay', kind: 'strike', dmg: 11, range: 2.4, hit: 0.52, end: 'down', sound: 'smack', keys: [
    { t: 0, a: P.stance, d: P.stun, ap: [0.35, 0, 0, 0], dp: [0, 2.4, 180, 0] },
    { t: 0.18, a: run(0.5), ap: [0.35, 0.6, 0, 0] },
    { t: 0.36, a: run(2.2), ap: [0.35, 1.3, 0, 0] },
    { t: 0.52, a: T(run(3.6), { rArm: [-90, 0, -70], rFore: [0, 0, 0], spine: [8, 20, 0] }), ap: [0.35, 1.85, 0, 0], d: T(P.stun, { hips: { p: [0, H0, 0], r: [-30, 0, 0] }, head: [-40, 0, 0] }), dp: [0, 2.4, 180, 0.1] },
    { t: 0.72, d: T(LIE, { hips: { p: [0, 0.5, 0], r: [-75, 0, 0] } }), dp: [0, 2.65, 180, 0.35], e: 'out' },
    { t: 0.95, a: P.stand, ap: [0.35, 2.15, 0, 0], d: LIE, dp: [0, 2.9, 180, 0], e: 'in' },
  ] },
  bigboot: { name: 'Big Boot', vn: 'Cú đạp mặt', kind: 'strike', dmg: 12, range: 1.4, hit: 0.32, end: 'down', sound: 'smack', keys: [
    { t: 0, a: P.stance, d: P.stun, dp: [0, 1.45, 180, 0] },
    { t: 0.16, a: T(P.stand, { rThigh: [-50, 0, -4], rShin: [60, 0, 0] }), ap: [0, 0.2, 0, 0] },
    { t: 0.32, a: T(P.stand, { spine: [-16, 0, 0], rThigh: [-112, 0, -4], rShin: [0, 0, 0], rFoot: [-20, 0, 0], lArm: [-30, 0, 30], rArm: [20, 0, -30] }), ap: [0, 0.3, 0, 0], d: T(P.stun, { head: [-45, 0, 0], spine: [-25, 0, 0] }) },
    { t: 0.55, d: T(LIE, { hips: { p: [0, 0.55, 0], r: [-70, 0, 0] } }), dp: [0, 1.75, 180, 0.2], e: 'out' },
    { t: 0.8, a: P.stand, d: LIE, dp: [0, 1.95, 180, 0], e: 'in' },
  ] },
  superkick: { name: 'Superkick', vn: 'Siêu cước', kind: 'strike', dmg: 15, range: 1.3, hit: 0.4, end: 'down', sound: 'smack', keys: [
    { t: 0, a: P.stance, d: P.stun, dp: [0, 1.35, 180, 0] },
    { t: 0.2, a: T(P.stand, { hips: { p: [0, H0, 0], r: [0, 25, 0] }, spine: [0, 10, 0], rThigh: [-80, 0, -10], rShin: [100, 0, 0] }), ap: [0, 0.1, 0, 0] },
    { t: 0.4, a: T(P.stand, { hips: { p: [0, H0, 0], r: [0, 30, 0] }, spine: [-28, 10, 0], rThigh: [-125, 0, -8], rShin: [0, 0, 0], rFoot: [-30, 0, 0], lArm: [-20, 0, 50], rArm: [-20, 0, -50] }), d: T(P.stun, { head: [-50, 30, 0], spine: [-20, 0, 0] }), e: 'out' },
    { t: 0.62, d: T(LIE, { hips: { p: [0, 0.5, 0], r: [-70, 30, 0] } }), dp: [0.1, 1.65, 150, 0.2] },
    { t: 0.9, a: P.stand, d: LIE, dp: [0.15, 1.85, 140, 0], e: 'in' },
  ] },
  dropkick: { name: 'Dropkick', vn: 'Song phi cước', kind: 'strike', dmg: 12, range: 1.9, hit: 0.5, end: 'down', aEnd: 'down', sound: 'smack', keys: [
    { t: 0, a: P.stance, d: P.stun, dp: [0, 1.9, 180, 0] },
    { t: 0.22, a: run(1.5), ap: [0, 0.55, 0, 0] },
    { t: 0.4, a: T(P.stand, { hips: { p: [0, 1.15, 0], r: [-60, 0, 0] }, lThigh: [-30, 0, 4], rThigh: [-30, 0, -4], lShin: [60, 0, 0], rShin: [60, 0, 0], lArm: [-40, 0, 40], rArm: [-40, 0, -40] }), ap: [0, 0.85, 0, 0.35] },
    { t: 0.5, a: T(P.stand, { hips: { p: [0, 1.1, 0], r: [-85, 0, 0] }, lThigh: [0, 0, 4], rThigh: [0, 0, -4], lShin: [0, 0, 0], rShin: [0, 0, 0], lFoot: [-40, 0, 0], rFoot: [-40, 0, 0], lArm: [0, 0, 60], rArm: [0, 0, -60] }), ap: [0, 1.0, 0, 0.3], d: T(P.stun, { hips: { p: [0, H0, 0], r: [-35, 0, 0] }, spine: [-25, 0, 0], head: [-30, 0, 0] }) },
    { t: 0.78, a: LIE, ap: [0, 1.0, 0, 0], d: T(LIE, { hips: { p: [0, 0.5, 0], r: [-75, 0, 0] } }), dp: [0, 2.35, 180, 0.3], e: 'in' },
    { t: 1.0, d: LIE, dp: [0, 2.6, 180, 0], e: 'in' },
  ] },
  runningKnee: { name: 'Running Knee', vn: 'Gối bay', kind: 'strike', dmg: 14, range: 2.2, hit: 0.5, end: 'down', sound: 'smack', keys: [
    { t: 0, a: P.stance, d: P.bent, dp: [0, 2.2, 180, 0] },
    { t: 0.2, a: run(1.2), ap: [0, 0.65, 0, 0] },
    { t: 0.36, a: run(3.0), ap: [0, 1.25, 0, 0] },
    { t: 0.5, a: T(P.stand, { hips: { p: [0, H0, 0], r: [-10, 0, 0] }, rThigh: [-110, 0, 0], rShin: [130, 0, 0], lThigh: [20, 0, 0], lShin: [70, 0, 0], lArm: [30, 0, 30], rArm: [30, 0, -30] }), ap: [0, 1.6, 0, 0.45], d: T(P.stun, { head: [-50, 0, 0], spine: [-20, 0, 0] }) },
    { t: 0.75, a: P.stance, ap: [0, 1.75, 0, 0], d: T(LIE, { hips: { p: [0, 0.5, 0], r: [-70, 0, 0] } }), dp: [0, 2.5, 180, 0.25], e: 'in' },
    { t: 1.0, a: P.stand, d: LIE, dp: [0, 2.7, 180, 0], e: 'in' },
  ] },
  discus: { name: 'Discus Clothesline', vn: 'Xoay vòng đánh tay', kind: 'strike', dmg: 13, range: 1.2, hit: 0.62, end: 'down', sound: 'smack', keys: [
    { t: 0, a: P.stance, d: P.stun, ap: [0.3, 0, 0, 0], dp: [0, 1.25, 180, 0] },
    { t: 0.2, a: T(P.stand, { lArm: [0, 0, 80], rArm: [0, 0, -80], lFore: [0, 0, 0], rFore: [0, 0, 0] }), ap: [0.3, 0.2, 120, 0] },
    { t: 0.42, ap: [0.3, 0.35, 240, 0] },
    { t: 0.62, a: T(P.stand, { rArm: [-90, 0, -75], rFore: [0, 0, 0], lArm: [0, 0, 40], spine: [6, 25, 0] }), ap: [0.3, 0.5, 360, 0], d: T(P.stun, { hips: { p: [0, H0, 0], r: [-35, 0, 0] }, head: [-45, 0, 0] }) },
    { t: 0.85, a: P.stand, d: T(LIE, { hips: { p: [0, 0.5, 0], r: [-75, 0, 0] } }), dp: [0, 1.5, 180, 0.3], e: 'out' },
    { t: 1.05, d: LIE, dp: [0, 1.7, 180, 0], e: 'in' },
  ] },
  spear: { name: 'Spear', vn: 'Húc vai', kind: 'strike', dmg: 16, range: 2.6, hit: 0.55, end: 'down', aEnd: 'down', sound: 'slam', keys: [
    { t: 0, a: P.crouch, d: P.stun, dp: [0, 2.6, 180, 0] },
    { t: 0.2, a: T(run(1), { spine: [45, 0, 0], hips: { p: [0, H0 - 0.25, 0], r: [20, 0, 0] } }), ap: [0, 0.7, 0, 0] },
    { t: 0.4, a: T(run(3.6), { spine: [55, 0, 0], hips: { p: [0, H0 - 0.3, 0], r: [25, 0, 0] } }), ap: [0, 1.45, 0, 0] },
    { t: 0.55, a: T(P.crouch, { hips: { p: [0, 0.75, 0], r: [45, 0, 0] }, spine: [30, 0, 0], lArm: [-90, 0, 30], rArm: [-90, 0, -30], lFore: [-60, 0, 0], rFore: [-60, 0, 0] }), ap: [0, 1.95, 0, 0], d: T(P.bent, { spine: [60, 0, 0], head: [10, 0, 0] }), dp: [0, 2.6, 180, 0.2] },
    { t: 0.8, a: T(LIEF, { hips: { p: [0, 0.42, 0], r: [80, 0, 0] }, lArm: [-60, 0, 20], rArm: [-60, 0, -20] }), ap: [0, 2.45, 0, 0], d: LIE, dp: [0, 3.1, 180, 0], e: 'in' },
    { t: 1.4, a: P.kneel, ap: [0, 2.35, 0, 0] },
  ] },

  // ---------- QUẬT / VẬT ----------
  bodyslam: { name: 'Body Slam', vn: 'Nhấc quật', kind: 'grapple', dmg: 11, range: 0.75, hit: 1.15, end: 'down', sound: 'slam', keys: [
    { t: 0, a: P.tieup, d: P.tieup, dp: [0, 0.72, 180, 0] },
    { t: 0.32, a: T(P.crouch, { hips: { p: [0, H0 - 0.25, 0], r: [10, 0, 0] }, rArm: [-70, 0, -10], rFore: [-30, 0, 0], lArm: [-115, 0, 10], lFore: [-60, 0, 0] }), d: T(P.bent, { spine: [25, 0, 0] }), dp: [0, 0.55, 180, 0] },
    { t: 0.72, a: T(P.stand, { spine: [-8, 0, 0], lArm: [-150, 0, 20], lFore: [-50, 0, 0], rArm: [-120, 0, -20], rFore: [-60, 0, 0] }), d: T(P.stand, { hips: { p: [0, H0, 0], r: [-170, 90, 0] }, lArm: [-30, 0, 40], rArm: [-30, 0, -40] }), dp: [0, 0.35, 180, 0.6] },
    { t: 1.15, a: T(P.bent, { spine: [45, 0, 0], lArm: [-80, 0, 20], rArm: [-80, 0, -20] }), d: LIE, dp: [0, 0.85, 90, 0], e: 'in' },
    { t: 1.6, a: P.stand },
  ] },
  suplex: { name: 'Vertical Suplex', vn: 'Suplex dựng đứng', kind: 'grapple', dmg: 14, range: 0.7, hit: 1.9, end: 'down', aEnd: 'down', sound: 'slam', keys: [
    { t: 0, a: P.tieup, d: P.tieup, dp: [0, 0.68, 180, 0] },
    { t: 0.35, a: T(P.stance, { lArm: [-100, 0, 0], lFore: [-80, 0, 0], rArm: [-80, 0, -20], rFore: [-40, 0, 0] }), d: T(P.bent, { spine: [45, 0, 0], chest: [20, 0, 0], head: [30, 0, 0], lArm: [-110, 0, 10] }), dp: [0, 0.55, 180, 0] },
    { t: 0.9, a: T(P.stand, { spine: [-12, 0, 0], lArm: [-160, 0, 10], rArm: [-150, 0, -10], lFore: [-40, 0, 0], rFore: [-40, 0, 0] }), d: T(P.stand, { hips: { p: [0, H0, 0], r: [175, 0, 0] }, lArm: [-160, 0, 20], rArm: [-30, 0, -20] }), dp: [0, 0.3, 180, 0.8] },
    { t: 1.4, a: T(P.stand, { spine: [-18, 0, 0], lArm: [-165, 0, 10], rArm: [-160, 0, -10] }), dp: [0, 0.25, 180, 0.85] },
    { t: 1.9, a: T(LIE, { lArm: [-160, 0, 20], rArm: [-160, 0, -20] }), ap: [0, -0.1, 0, 0], d: LIE, dp: [0, -1.25, 180, 0], e: 'in' },
    { t: 2.5, a: LIE },
  ] },
  german: { name: 'German Suplex', vn: 'Suplex kiểu Đức', kind: 'grapple', dmg: 15, range: 0.7, hit: 1.3, end: 'down', aEnd: 'down', sound: 'slam', keys: [
    { t: 0, a: P.tieup, d: P.tieup, dp: [0, 0.7, 180, 0] },
    { t: 0.4, a: T(P.stance, { lArm: [-62, 0, 26], rArm: [-62, 0, -26], lFore: [-80, 0, 0], rFore: [-80, 0, 0], spine: [16, 0, 0] }), d: T(P.stun, { rArm: [-90, 0, -60] }), dp: [0, 0.45, 0, 0] },
    { t: 0.75, a: T(P.stand, { hips: { p: [0, H0 - 0.12, 0], r: [-15, 0, 0] }, spine: [-30, 0, 0], chest: [-20, 0, 0], lArm: [-60, 0, 20], rArm: [-60, 0, -20], lFore: [-80, 0, 0], rFore: [-80, 0, 0], lThigh: [-30, 0, 10], rThigh: [-30, 0, -10], lShin: [50, 0, 0], rShin: [50, 0, 0] }), d: T(P.stand, { hips: { p: [0, H0, 0], r: [-25, 0, 0] }, lArm: [-60, 0, 50], rArm: [-60, 0, -50] }), dp: [0, 0.35, 0, 0.4] },
    { t: 1.05, a: T(P.stand, { hips: { p: [0, 0.75, 0], r: [-80, 0, 0] }, spine: [-30, 0, 0], chest: [-20, 0, 0], head: [-30, 0, 0], lThigh: [-60, 0, 10], rThigh: [-60, 0, -10], lShin: [100, 0, 0], rShin: [100, 0, 0], lArm: [-150, 0, 10], rArm: [-150, 0, -10] }), d: T(P.stand, { hips: { p: [0, H0, 0], r: [-150, 0, 0] }, lArm: [-150, 0, 40], rArm: [-150, 0, -40] }), dp: [0, -0.25, 0, 0.75] },
    { t: 1.3, a: T(P.stand, { hips: { p: [0, 0.6, 0], r: [-110, 0, 0] }, spine: [-30, 0, 0], chest: [-20, 0, 0], head: [-30, 0, 0], lThigh: [-80, 0, 10], rThigh: [-80, 0, -10], lShin: [120, 0, 0], rShin: [120, 0, 0], lArm: [-160, 0, 20], rArm: [-160, 0, -20] }), d: T(LIE, { hips: { p: [0, 0.5, 0], r: [-130, 0, 0] }, lThigh: [-30, 0, 10], rThigh: [-30, 0, -10] }), dp: [0, -0.6, 0, 0], e: 'in' },
    { t: 1.9, a: LIE, d: LIE, dp: [0, -1.0, 0, 0] },
  ] },
  ddt: { name: 'DDT', vn: 'Cắm đầu DDT', kind: 'grapple', dmg: 14, range: 0.6, hit: 0.85, end: 'downF', aEnd: 'down', sound: 'slam', keys: [
    { t: 0, a: P.tieup, d: P.tieup, dp: [0, 0.62, 180, 0] },
    { t: 0.32, a: T(P.stance, { lArm: [-80, 0, -10], lFore: [-100, 0, 0], rArm: [-60, 0, -20] }), d: T(P.bent, { spine: [55, 0, 0], chest: [25, 0, 0], head: [20, 0, 0] }), dp: [0, 0.5, 180, 0] },
    { t: 0.55, a: T(P.stand, { hips: { p: [0, H0 - 0.1, 0], r: [-25, 0, 0] }, lArm: [-80, 0, -10], lFore: [-100, 0, 0], lThigh: [-40, 0, 6], rThigh: [-40, 0, -6] }), ap: [0, 0, 0, 0.15] },
    { t: 0.85, a: T(LIE, { lArm: [-80, 0, -10], lFore: [-100, 0, 0] }), ap: [0, -0.15, 0, 0], d: T(P.bent, { hips: { p: [0, 0.75, 0], r: [115, 0, 0] }, spine: [20, 0, 0], head: [20, 0, 0], lArm: [-40, 0, 30], rArm: [-40, 0, -30] }), dp: [0, 0.55, 180, 0], e: 'in' },
    { t: 1.35, a: LIE, d: LIEF, dp: [0, 1.1, 180, 0], e: 'out' },
  ] },
  powerbomb: { name: 'Powerbomb', vn: 'Bom sức mạnh', kind: 'grapple', dmg: 17, range: 0.6, hit: 1.6, end: 'down', sound: 'slam', keys: [
    { t: 0, a: P.tieup, d: P.tieup, dp: [0, 0.62, 180, 0] },
    { t: 0.35, a: T(P.crouch, { hips: { p: [0, H0 - 0.2, 0], r: [12, 0, 0] }, lArm: [-70, 0, 20], rArm: [-70, 0, -20], lFore: [-70, 0, 0], rFore: [-70, 0, 0] }), d: T(P.bent, { hips: { p: [0, H0 - 0.05, 0], r: [20, 0, 0] }, spine: [60, 0, 0], chest: [20, 0, 0] }), dp: [0, 0.45, 180, 0] },
    { t: 0.95, a: T(P.stand, { lArm: [-150, 0, 30], rArm: [-150, 0, -30], lFore: [-50, 0, 0], rFore: [-50, 0, 0] }), d: T(P.stand, { hips: { p: [0, H0, 0], r: [-10, 0, 0] }, lThigh: [-90, 0, 18], rThigh: [-90, 0, -18], lShin: [80, 0, 0], rShin: [80, 0, 0], lArm: [-120, 0, 30], rArm: [-120, 0, -30], lFore: [-60, 0, 0], rFore: [-60, 0, 0], spine: [10, 0, 0] }), dp: [0, 0.18, 180, 0.62] },
    { t: 1.28, a: T(P.stand, { lArm: [-170, 0, 25], rArm: [-170, 0, -25], lFore: [-20, 0, 0], rFore: [-20, 0, 0], spine: [-6, 0, 0] }), dp: [0, 0.15, 180, 0.78] },
    { t: 1.6, a: T(P.bent, { hips: { p: [0, H0 - 0.15, 0], r: [10, 0, 0] }, spine: [50, 0, 0], lArm: [-60, 0, 20], rArm: [-60, 0, -20] }), d: T(LIE, { hips: { p: [0, 0.42, 0], r: [-125, 0, 0] }, lThigh: [-50, 0, 15], rThigh: [-50, 0, -15], lShin: [30, 0, 0], rShin: [30, 0, 0] }), dp: [0, 0.55, 180, 0], e: 'in' },
    { t: 2.15, a: P.stand, d: LIE, dp: [0, 0.75, 180, 0] },
  ] },
  chokeslam: { name: 'Chokeslam', vn: 'Bóp cổ quật', kind: 'grapple', dmg: 17, range: 0.65, hit: 1.45, end: 'down', sound: 'slam', keys: [
    { t: 0, a: P.stance, d: P.stance, dp: [0, 0.66, 180, 0] },
    { t: 0.35, a: T(P.stand, { rArm: [-100, 0, -6], rFore: [-12, 0, 0], lArm: [-40, 0, 20] }), d: T(P.stand, { lArm: [-100, 0, -10], rArm: [-100, 0, 10], lFore: [-70, 0, 0], rFore: [-70, 0, 0], head: [-20, 0, 0] }), dp: [0, 0.6, 180, 0] },
    { t: 0.9, a: T(P.stand, { spine: [-6, 0, 0], rArm: [-160, 0, -6], rFore: [-10, 0, 0], lArm: [-90, 0, 10], lFore: [-30, 0, 0] }), d: T(P.stand, { lArm: [-140, 0, -10], rArm: [-140, 0, 10], lFore: [-60, 0, 0], rFore: [-60, 0, 0], lThigh: [-20, 0, 8], rThigh: [10, 0, -8], lShin: [40, 0, 0], rShin: [20, 0, 0], head: [-30, 0, 0] }), dp: [0, 0.55, 180, 0.6] },
    { t: 1.18, a: T(P.stand, { spine: [-8, 0, 0], rArm: [-172, 0, -6], rFore: [-4, 0, 0] }), d: T(P.stand, { hips: { p: [0, H0, 0], r: [-15, 0, 0] }, lArm: [-150, 0, -10], rArm: [-150, 0, 10] }), dp: [0, 0.6, 180, 0.72] },
    { t: 1.45, a: T(P.bent, { spine: [50, 0, 0], rArm: [-60, 0, -6], rFore: [0, 0, 0] }), d: LIE, dp: [0, 0.95, 180, 0], e: 'in' },
    { t: 2.05, a: T(P.stand, { rArm: [-80, 0, -50], rFore: [-110, 0, 0] }) },
  ] },
  piledriver: { name: 'Piledriver', vn: 'Cắm cọc', kind: 'grapple', dmg: 18, range: 0.6, hit: 1.35, end: 'downF', sound: 'slam', keys: [
    { t: 0, a: P.tieup, d: P.tieup, dp: [0, 0.6, 180, 0] },
    { t: 0.35, a: T(P.crouch, { lArm: [-70, 0, 20], rArm: [-70, 0, -20], lFore: [-80, 0, 0], rFore: [-80, 0, 0] }), d: T(P.bent, { spine: [60, 0, 0], chest: [20, 0, 0] }), dp: [0, 0.42, 180, 0] },
    { t: 0.95, a: T(P.stand, { lArm: [-60, 0, 20], rArm: [-60, 0, -20], lFore: [-90, 0, 0], rFore: [-90, 0, 0], spine: [-6, 0, 0] }), d: T(P.stand, { hips: { p: [0, H0, 0], r: [178, 0, 0] }, lThigh: [-10, 0, 10], rThigh: [-10, 0, -10], lArm: [-10, 0, 20], rArm: [-10, 0, -20] }), dp: [0, 0.24, 180, 0.42] },
    { t: 1.35, a: T(P.sit, { lArm: [-60, 0, 20], rArm: [-60, 0, -20], lFore: [-90, 0, 0], rFore: [-90, 0, 0], hips: { p: [0, 0.3, 0], r: [0, 0, 0] } }), d: T(P.stand, { hips: { p: [0, 0.95, 0], r: [178, 0, 0] } }), dp: [0, 0.3, 180, 0], e: 'in' },
    { t: 1.95, a: P.sit, d: LIEF, dp: [0, 1.05, 180, 0], e: 'in' },
    { t: 2.4, a: P.kneel },
  ] },
  spinebuster: { name: 'Spinebuster', vn: 'Xoay người quật lưng', kind: 'grapple', dmg: 15, range: 0.7, hit: 0.95, end: 'down', sound: 'slam', keys: [
    { t: 0, a: P.stance, d: P.stance, dp: [0, 0.7, 180, 0] },
    { t: 0.3, a: T(P.crouch, { lArm: [-70, 0, 15], rArm: [-70, 0, -15], lFore: [-70, 0, 0], rFore: [-70, 0, 0] }), d: T(P.bent, { spine: [30, 0, 0] }), dp: [0, 0.45, 180, 0] },
    { t: 0.55, a: T(P.stand, { lArm: [-80, 0, 15], rArm: [-80, 0, -15], lFore: [-80, 0, 0], rFore: [-80, 0, 0] }), ap: [0, 0, 90, 0], d: T(P.stand, { hips: { p: [0, H0, 0], r: [10, 0, 0] }, lArm: [-60, 0, 50], rArm: [-60, 0, -50] }), dp: [0.4, 0.15, 270, 0.35] },
    { t: 0.95, a: T(P.bent, { hips: { p: [0, H0 - 0.3, 0], r: [20, 0, 0] }, spine: [50, 0, 0], lArm: [-70, 0, 20], rArm: [-70, 0, -20] }), ap: [0, 0, 180, 0], d: LIE, dp: [0, -0.8, 0, 0], e: 'in' },
    { t: 1.5, a: P.stand },
  ] },
  backbreaker: { name: 'Backbreaker', vn: 'Bẻ lưng qua gối', kind: 'grapple', dmg: 13, range: 0.65, hit: 1.0, end: 'down', sound: 'slam', keys: [
    { t: 0, a: P.tieup, d: P.tieup, dp: [0, 0.65, 180, 0] },
    { t: 0.35, a: T(P.crouch, { lArm: [-80, 0, 10], rArm: [-80, 0, -10] }), d: T(P.bent, { spine: [40, 0, 0] }), dp: [0, 0.5, 180, 0] },
    { t: 0.7, a: T(P.stand, { lArm: [-110, 0, 20], rArm: [-110, 0, -20], lFore: [-60, 0, 0], rFore: [-60, 0, 0] }), d: T(LIE, { hips: { p: [0, 0.4, 0], r: [-90, 0, 0] } }), dp: [0, 0.4, 90, 0.85] },
    { t: 1.0, a: T(P.kneel, { lArm: [-60, 0, 30], rArm: [-60, 0, -30] }), d: T(LIE, { hips: { p: [0, 0.68, 0], r: [-90, 0, 0] }, spine: [-25, 0, 0], chest: [-20, 0, 0], head: [-30, 0, 0], lThigh: [30, 0, 10], rThigh: [30, 0, -10] }), dp: [0.05, 0.25, 90, 0], e: 'in' },
    { t: 1.5, d: LIE, dp: [0, 0.85, 90, 0], e: 'in' },
    { t: 1.9, a: P.stand },
  ] },
  neckbreaker: { name: 'Neckbreaker', vn: 'Bẻ cổ', kind: 'grapple', dmg: 13, range: 0.6, hit: 0.8, end: 'down', aEnd: 'down', sound: 'slam', keys: [
    { t: 0, a: P.stance, d: P.stance, dp: [0, 0.65, 180, 0] },
    { t: 0.35, a: T(P.stand, { rArm: [-90, 0, -35], rFore: [-100, 0, 0], spine: [8, -20, 0] }), d: T(P.stun, { spine: [-20, 0, 0], head: [-10, 0, 0], lArm: [-80, 0, 40], rArm: [-80, 0, -40] }), dp: [-0.3, 0.32, 180, 0] },
    { t: 0.8, a: T(P.sit, { rArm: [-90, 0, -35], rFore: [-100, 0, 0], hips: { p: [0, 0.2, 0], r: [-30, 0, 0] } }), d: T(LIE, { hips: { p: [0, 0.3, 0], r: [-90, 0, 0] } }), dp: [-0.45, 0.45, 0, 0], e: 'in' },
    { t: 1.3, a: LIE, d: LIE, dp: [-0.5, 0.55, 0, 0] },
  ] },
  cutter: { name: 'Cutter', vn: 'Cú cắt bất ngờ', kind: 'grapple', dmg: 16, range: 0.75, hit: 0.55, end: 'downF', aEnd: 'down', sound: 'slam', keys: [
    { t: 0, a: P.stance, d: P.stun, dp: [0, 0.78, 180, 0] },
    { t: 0.22, a: T(P.stand, { hips: { p: [0, H0, 0], r: [-15, 0, 0] }, lArm: [-130, 0, 10], rArm: [-130, 0, -10], lFore: [-30, 0, 0], rFore: [-30, 0, 0], lThigh: [-60, 0, 10], rThigh: [-50, 0, -10], lShin: [90, 0, 0], rShin: [90, 0, 0] }), ap: [0, 0.2, 0, 0.4] },
    { t: 0.55, a: LIE, ap: [0.15, 0.4, 0, 0], d: T(LIEF, { hips: { p: [0, 0.3, 0], r: [100, 0, 0] } }), dp: [-0.35, 0.05, 180, 0], e: 'in' },
    { t: 1.0, d: LIEF, dp: [-0.38, 0.0, 180, 0] },
  ] },
  stunner: { name: 'Jawbreaker', vn: 'Bẻ hàm', kind: 'grapple', dmg: 15, range: 0.85, hit: 0.8, end: 'down', aEnd: 'sit', sound: 'smack', keys: [
    { t: 0, a: P.stance, d: P.stun, dp: [0, 0.85, 180, 0] },
    { t: 0.25, a: T(P.stand, { rThigh: [-85, 0, -4], rShin: [10, 0, 0], spine: [-10, 0, 0] }), d: T(P.bent, { spine: [55, 0, 0] }), dp: [0, 0.8, 180, 0] },
    { t: 0.55, a: T(P.stand, { lArm: [-170, 0, 30], rArm: [-170, 0, -30], lFore: [-90, 0, 0], rFore: [-90, 0, 0] }), ap: [0, 0.2, 180, 0], d: T(P.bent, { spine: [45, 0, 0], head: [-10, 0, 0] }), dp: [0, 0.55, 180, 0] },
    { t: 0.8, a: T(P.sit, { hips: { p: [0, 0.3, 0], r: [0, 0, 0] }, lArm: [-170, 0, 30], rArm: [-170, 0, -30] }), ap: [0, 0.2, 180, 0], d: T(P.stand, { spine: [-30, 0, 0], chest: [-20, 0, 0], head: [-45, 0, 0], lArm: [-120, 0, 40], rArm: [-120, 0, -40] }), dp: [0, 0.6, 180, 0], e: 'in' },
    { t: 1.2, d: T(P.stun, { spine: [-20, 0, 0], head: [-30, 0, 0] }), dp: [0, 1.15, 180, 0] },
    { t: 1.65, a: P.sit, d: LIE, dp: [0, 1.5, 180, 0], e: 'in' },
  ] },
  fireman: { name: "Fireman's Toss", vn: 'Vác vai quăng', kind: 'grapple', dmg: 17, range: 0.6, hit: 1.6, end: 'downF', sound: 'slam', keys: [
    { t: 0, a: P.tieup, d: P.tieup, dp: [0, 0.6, 180, 0] },
    { t: 0.35, a: T(P.crouch, { lArm: [-90, 0, 30], rArm: [-60, 0, -20] }), d: T(P.bent, { spine: [60, 0, 0] }), dp: [0, 0.35, 180, 0] },
    { t: 0.9, a: T(P.stand, { lArm: [-150, 0, 40], lFore: [-90, 0, 0], rArm: [-120, 0, -20], rFore: [-80, 0, 0] }), d: T(LIEF, { hips: { p: [0, 0.85, 0], r: [90, 0, 0] }, spine: [20, 0, 0], head: [30, 0, 0], lArm: [-40, 0, 20], rArm: [-40, 0, -20] }), dp: [0, 0, 90, 0.78] },
    { t: 1.3, a: T(P.stand, { lArm: [-150, 0, 40], lFore: [-90, 0, 0], rArm: [-120, 0, -20], rFore: [-80, 0, 0], lThigh: [-20, 0, 10], rThigh: [10, 0, -10] }), ap: [0, 0, 120, 0], dp: [0, 0, 210, 0.78] },
    { t: 1.6, a: T(P.bent, { spine: [40, 0, 0] }), ap: [0, 0, 150, 0], d: LIEF, dp: [0.5, -0.75, 160, 0], e: 'in' },
    { t: 2.1, a: P.stand },
  ] },
  toss: { name: 'Quăng qua dây', vn: 'Quăng qua dây', kind: 'grapple', dmg: 6, range: 0.55, hit: 1.6, end: 'out', sound: 'slam', keys: [
    { t: 0, a: P.tieup, d: P.stun, dp: [0, 0.55, 180, 0] },
    { t: 0.3, a: T(P.crouch, { lArm: [-70, 0, 20], rArm: [-70, 0, -20], lFore: [-60, 0, 0], rFore: [-60, 0, 0] }), d: T(P.stun, { spine: [-10, 0, 0] }), dp: [0, 0.45, 180, 0] },
    { t: 0.7, a: T(P.stand, { lArm: [-150, 0, 20], rArm: [-150, 0, -20] }), d: T(P.stand, { hips: { p: [0, H0, 0], r: [-55, 0, 0] }, lArm: [-60, 0, 60], rArm: [-60, 0, -60] }), dp: [0, 0.55, 180, 0.85] },
    { t: 1.05, a: T(P.stand, { lArm: [-160, 0, 20], rArm: [-160, 0, -20], spine: [-6, 0, 0] }), d: T(P.stand, { hips: { p: [0, H0, 0], r: [-160, 0, 0] }, lArm: [-90, 0, 70], rArm: [-90, 0, -70] }), dp: [0, 1.25, 180, 1.0] },
    { t: 1.6, a: T(P.stand, { lArm: [-100, 0, 30], rArm: [-100, 0, -30] }), d: LIEF, dp: [0, 2.2, 180, -1.22], e: 'in' },
  ] },

  // ---------- TRÊN CỘT GÓC (người ra đòn đứng trên cột, người chịu đòn nằm cách ~2 m) ----------
  frogSplash: { name: 'Frog Splash', vn: 'Ếch nhảy từ cột', kind: 'aerial', dmg: 17, nominal: 2.0, hit: 0.95, end: 'down', aEnd: 'down', sound: 'slam', keys: [
    { t: 0, a: T(P.crouch, { hips: { p: [0, H0 - 0.25, 0], r: [10, 0, 0] } }), d: LIE, ap: [0, 0, 0, 1.25], dp: [0, 2.0, 90, 0] },
    { t: 0.3, a: T(P.stand, { lArm: [-160, 0, 30], rArm: [-160, 0, -30] }), ap: [0, 0.5, 0, 1.75] },
    { t: 0.6, a: T(P.stand, { hips: { p: [0, H0, 0], r: [60, 0, 0] }, lArm: [-40, 0, 80], rArm: [-40, 0, -80], lFore: [-90, 0, 0], rFore: [-90, 0, 0], lThigh: [-70, 0, 50], rThigh: [-70, 0, -50], lShin: [110, 0, 0], rShin: [110, 0, 0] }), ap: [0, 1.25, 0, 1.75] },
    { t: 0.95, a: T(LIEF, { hips: { p: [0, 0.42, 0], r: [90, 0, 0] }, lArm: [-90, 0, 60], rArm: [-90, 0, -60] }), ap: [0, 1.6, 0, 0], d: T(LIE, { lThigh: [-40, 0, 10], head: [-20, 0, 0] }), e: 'in' },
    { t: 1.5, a: T(LIEF, { hips: { p: [0, 0.4, 0], r: [90, 0, 0] } }), d: LIE },
  ] },
  moonsault: { name: 'Moonsault', vn: 'Lộn ngược từ cột', kind: 'aerial', dmg: 18, nominal: 1.9, hit: 1.05, end: 'down', aEnd: 'down', sound: 'slam', keys: [
    { t: 0, a: T(P.crouch, { hips: { p: [0, H0 - 0.25, 0], r: [10, 0, 0] } }), ap: [0, 0, 180, 1.25], d: LIE, dp: [0, 1.9, 90, 0] },
    { t: 0.25, a: T(P.stand, { lArm: [-170, 0, 20], rArm: [-170, 0, -20] }), ap: [0, 0.2, 180, 1.85] },
    { t: 0.45, a: T(P.stand, { hips: { p: [0, H0, 0], r: [-90, 0, 0] }, lThigh: [-60, 0, 0], rThigh: [-60, 0, 0], lShin: [90, 0, 0], rShin: [90, 0, 0], lArm: [-150, 0, 20], rArm: [-150, 0, -20] }), ap: [0, 0.65, 180, 2.0] },
    { t: 0.65, a: T(P.stand, { hips: { p: [0, H0, 0], r: [-180, 0, 0] }, lThigh: [-80, 0, 0], rThigh: [-80, 0, 0], lShin: [100, 0, 0], rShin: [100, 0, 0] }), ap: [0, 1.1, 180, 1.7] },
    { t: 0.85, a: T(P.stand, { hips: { p: [0, 0.9, 0], r: [-260, 0, 0] }, lArm: [-90, 0, 50], rArm: [-90, 0, -50] }), ap: [0, 1.5, 180, 0.6] },
    { t: 1.05, a: T(LIEF, { hips: { p: [0, 0.42, 0], r: [-270, 0, 0] }, lArm: [-90, 0, 60], rArm: [-90, 0, -60] }), ap: [0, 1.75, 180, 0], d: T(LIE, { lThigh: [-40, 0, 10], head: [-20, 0, 0] }), e: 'in' },
    { t: 1.6, a: T(LIEF, { hips: { p: [0, 0.4, 0], r: [-270, 0, 0] } }) },
  ] },
  elbowDrop: { name: 'Diving Elbow', vn: 'Cùi chỏ từ cột', kind: 'aerial', dmg: 16, nominal: 1.9, hit: 0.9, end: 'down', aEnd: 'down', sound: 'slam', keys: [
    { t: 0, a: T(P.crouch, { hips: { p: [0, H0 - 0.25, 0], r: [10, 0, 0] } }), ap: [0, 0, 0, 1.25], d: LIE, dp: [0, 1.9, 90, 0] },
    { t: 0.3, a: T(P.stand, { rArm: [0, 0, -90], rFore: [0, 0, -110], lArm: [-120, 0, 40] }), ap: [0, 0.5, 0, 1.85] },
    { t: 0.6, a: T(P.stand, { hips: { p: [0, H0, 0], r: [70, 0, 20] }, rArm: [-20, 0, -90], rFore: [0, 0, -120], lArm: [-60, 0, 70] }), ap: [0, 1.2, 0, 1.6] },
    { t: 0.9, a: T(LIEF, { hips: { p: [0, 0.45, 0], r: [90, 0, 25] }, rArm: [-60, 0, -40], rFore: [-120, 0, 0] }), ap: [0, 1.55, 0, 0], d: T(LIE, { spine: [20, 0, 0], head: [-10, 0, 0], lThigh: [-40, 0, 10] }), e: 'in' },
    { t: 1.4, a: T(P.sit, {}) },
  ] },

  // ---------- KHOÁ (người chịu đòn đang nằm ngửa) ----------
  bostonCrab: { name: 'Boston Crab', vn: 'Khoá cua', kind: 'submission', dmg: 3, hit: 1.2, end: 'down', sound: 'thud', keys: [
    { t: 0, a: P.stand, d: LIE, dp: [0, 0.75, 180, 0] },
    { t: 0.5, a: T(P.crouch, { lArm: [-70, 0, 20], rArm: [-70, 0, -20] }), d: T(LIE, { lThigh: [-70, 0, 4], rThigh: [-70, 0, -4], lShin: [10, 0, 0], rShin: [10, 0, 0] }) },
    { t: 1.2, a: T(P.stand, { hips: { p: [0, H0 - 0.25, 0], r: [-15, 0, 0] }, spine: [-10, 0, 0], lArm: [-30, 0, 15], rArm: [-30, 0, -15], lFore: [-110, 0, 0], rFore: [-110, 0, 0], lThigh: [-35, 0, 22], rThigh: [-35, 0, -22], lShin: [60, 0, 0], rShin: [60, 0, 0] }), ap: [0, 0.75, 180, 0],
      d: T(LIEF, { hips: { p: [0, 0.25, 0], r: [60, 0, 0] }, spine: [-25, 0, 0], chest: [-20, 0, 0], head: [-35, 0, 0], lArm: [-90, 0, 40], rArm: [-90, 0, -40], lThigh: [-60, 0, 4], rThigh: [-60, 0, -4], lShin: [60, 0, 0], rShin: [60, 0, 0] }), dp: [0, 1.4, 0, 0] },
  ] },
  sleeper: { name: 'Sleeper Hold', vn: 'Siết cổ ngủ', kind: 'submission', dmg: 3, hit: 1.0, end: 'down', sound: 'thud', keys: [
    { t: 0, a: P.stand, d: LIE, ap: [0, 0, 0, 0], dp: [0, 0.8, 0, 0] },
    { t: 0.5, a: P.crouch, d: T(P.sit, { hips: { p: [0, 0.16, 0], r: [-25, 0, 0] } }), dp: [0, 0.75, 0, 0] },
    { t: 1.0, a: T(P.knees, { spine: [10, 0, 0], rArm: [-90, 0, 40], rFore: [-110, 0, 0], lArm: [-80, 0, -10], lFore: [-120, 0, 0], head: [10, 0, 0] }), ap: [0, 0.45, 0, 0], d: T(P.sit, { hips: { p: [0, 0.16, 0], r: [-8, 0, 0] }, head: [-15, 0, 0], lArm: [-100, 0, 20], rArm: [-100, 0, -20], lFore: [-90, 0, 0], rFore: [-90, 0, 0] }), dp: [0, 0.75, 0, 0] },
  ] },

  // ---------- ĐÈ ĐẾM ----------
  cover: { name: 'Đè đếm', vn: 'Đè đếm', kind: 'pin', dmg: 0, hit: 0.5, end: 'down', keys: [
    { t: 0, a: P.crouch, d: LIE, dp: [0, 0.7, 90, 0] },
    { t: 0.5, a: T(LIEF, { hips: { p: [0, 0.38, 0], r: [86, 0, 0] }, lArm: [-60, 0, 30], rArm: [-80, 0, -20], lThigh: [-20, 0, 25], rThigh: [10, 0, -15], lShin: [60, 0, 0] }), ap: [0, 0.35, 0, 0], d: T(LIE, { rThigh: [-40, 0, -10], rShin: [60, 0, 0] }) },
  ] },
};
// gắn khoá/biến thể
MOVES.sitoutBomb = { ...MOVES.powerbomb, name: 'Sitout Powerbomb', vn: 'Bom ngồi' };

// ---------- đòn đánh nhanh (1 người) ----------
export const STRIKES = {
  punch: { dur: 0.42, hit: 0.2, dmg: 4, sound: 'punch', f: t => T(P.stance, { rArm: [-90 + 10 * Math.max(0, 1 - Math.abs(t - 0.2) * 6), 0, -10], rFore: [-10 - 60 * Math.abs(t - 0.2) * 4, 0, 0], spine: [12, -20 * Math.sin(Math.min(1, t / 0.42) * Math.PI), 0] }) },
  hook: { dur: 0.48, hit: 0.24, dmg: 5, sound: 'punch', f: t => T(P.stance, { rArm: [-85, 0, -70 + 60 * Math.sin(Math.min(1, t / 0.48) * Math.PI)], rFore: [-70, 0, 0], spine: [10, 30 * Math.sin(Math.min(1, t / 0.48) * Math.PI), 0] }) },
  forearm: { dur: 0.5, hit: 0.25, dmg: 5, sound: 'punch', f: t => T(P.stance, { rArm: [-100, 0, -20], rFore: [-110, 0, 0], spine: [16, 25 * Math.sin(Math.min(1, t / 0.5) * Math.PI), 0] }) },
  chop: { dur: 0.55, hit: 0.3, dmg: 5, sound: 'chop', f: t => { const k = Math.min(1, t / 0.3); return T(P.stance, { rArm: [-60, 0, -100 + 70 * k], rFore: [-20, 0, 0], spine: [6, -20 + 40 * k, 0] }); } },
  kick: { dur: 0.55, hit: 0.28, dmg: 5, sound: 'punch', f: t => { const k = Math.sin(Math.min(1, t / 0.55) * Math.PI); return T(P.stance, { rThigh: [-12 - 70 * k, 0, -6], rShin: [34 - 30 * k, 0, 0], spine: [14 - 20 * k, 0, 0] }); } },
  stomp: { dur: 0.6, hit: 0.38, dmg: 4, sound: 'thud', f: t => { const k = t < 0.3 ? t / 0.3 : Math.max(0, 1 - (t - 0.38) / 0.2); return T(P.stand, { spine: [20, 0, 0], head: [30, 0, 0], rThigh: [-60 * k, 0, -4], rShin: [80 * k, 0, 0] }); } },
  elbowGround: { dur: 0.9, hit: 0.6, dmg: 6, sound: 'thud', f: t => t < 0.6 ? T(P.crouch, { rArm: [0, 0, -90], rFore: [0, 0, -110] }) : T(P.kneel, { rArm: [-60, 0, -30], rFore: [-120, 0, 0] }) },
};
// phản ứng trúng đòn (người chịu đòn)
export function hitReact(t, strong) {
  const k = Math.max(0, 1 - t / 0.45), b = Math.sin(Math.min(1, t / 0.45) * Math.PI);
  return T(P.stun, { spine: [-18 * b * (strong ? 1.6 : 1), 0, 0], head: [-30 * b, 15 * b, 0], hips: { p: [0, H0 - 0.04, 0], r: [-6 * b, 0, 0] }, lArm: [10, 0, 20 + 20 * b], rArm: [10, 0, -20 - 20 * b] });
}

// ---------- đứng dậy (từ nằm ngửa / sấp) ----------
export function getUpPose(t, prone) {
  // 0..1.6 giây
  const keys = prone
    ? [[0, LIEF], [0.4, T(P.knees, { hips: { p: [0, 0.45, 0], r: [60, 0, 0] }, lArm: [-60, 0, 10], rArm: [-60, 0, -10] })], [0.9, P.kneel], [1.6, P.stance]]
    : [[0, LIE], [0.45, P.sit], [0.95, P.kneel], [1.6, P.stance]];
  return sampleKeys(keys, t);
}
export function sampleKeys(keys, t) {
  let i = 0; while (i < keys.length - 1 && t > keys[i + 1][0]) i++;
  if (i >= keys.length - 1) return keys[keys.length - 1][1];
  const [t0, a] = keys[i], [t1, b] = keys[i + 1];
  return { __blend: true, a, b, t: easeIO((t - t0) / (t1 - t0)) };
}
export const easeIO = x => (x = Math.min(1, Math.max(0, x)), x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
export const easeIn = x => (x = Math.min(1, Math.max(0, x)), x * x);
export const easeOut = x => (x = Math.min(1, Math.max(0, x)), 1 - (1 - x) * (1 - x));
export const EASE = { io: easeIO, in: easeIn, out: easeOut, lin: x => Math.min(1, Math.max(0, x)) };

// chuẩn hoá khoá chiêu: điền tư thế / vị trí bị bỏ trống bằng giá trị khoá trước
for (const m of Object.values(MOVES)) {
  let a = P.stance, d = P.stance, ap = [0, 0, 0, 0], dp = [0, 0.7, 180, 0];
  for (const k of m.keys) {
    k.a = k.a || a; k.d = k.d || d; k.ap = k.ap || ap; k.dp = k.dp || dp;
    a = k.a; d = k.d; ap = k.ap; dp = k.dp;
  }
  m.dur = m.keys[m.keys.length - 1].t;
  if (!m.range) m.range = m.keys[0].dp[1];
}
