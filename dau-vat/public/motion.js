// Lấy mẫu tư thế: đổi tư thế (độ) sang quaternion có bộ nhớ đệm, nội suy khoá chiêu.
import { poseToQuats, blendQuats } from './wrestler.js';
import { EASE } from './anim.js';

const cache = new WeakMap();
export function Q(pose) {
  if (pose && pose.__q) return pose;
  if (pose && pose.__blend) return blendQuats(Q(pose.a), Q(pose.b), pose.t, {});
  let q = cache.get(pose);
  if (!q) { q = poseToQuats(pose, {}); cache.set(pose, q); }
  return q;
}
const tmpA = {}, tmpD = {};
const lerp = (a, b, t) => a + (b - a) * t;
// trả về { a: quats, d: quats, ap: [x,z,yaw,y], dp: [...] } tại thời điểm t của chiêu m
export function sampleMove(m, t, out = {}) {
  const ks = m.keys;
  let i = 0; while (i < ks.length - 1 && t > ks[i + 1].t) i++;
  const k0 = ks[i], k1 = ks[Math.min(i + 1, ks.length - 1)];
  const f = k1 === k0 ? 1 : (EASE[k1.e || 'io'] || EASE.io)((t - k0.t) / (k1.t - k0.t));
  out.a = blendQuats(Q(k0.a), Q(k1.a), f, out.a || {});
  out.d = blendQuats(Q(k0.d), Q(k1.d), f, out.d || {});
  out.a.__q = true; out.d.__q = true;
  out.ap = out.ap || [0, 0, 0, 0]; out.dp = out.dp || [0, 0, 0, 0];
  for (let j = 0; j < 4; j++) { out.ap[j] = lerp(k0.ap[j], k1.ap[j], f); out.dp[j] = lerp(k0.dp[j], k1.dp[j], f); }
  return out;
}
