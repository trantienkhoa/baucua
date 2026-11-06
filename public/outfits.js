// Trang phục dạ hội / ăn chơi cho nhân vật người thật.
// - Váy, áo quây: lưới "may" theo số đo cơ thể mô hình, gắn vào khung xương nên bay theo bước nhảy.
// - Vest nam: đổi chất liệu lớp áo có sẵn (kim sa lấp lánh, satin, nhung, ánh kim).
// - Phụ kiện: nơ, khăn cài túi, hoa hồng, vương miện nhỏ, vòng ngọc, khăn lông vũ, que phát sáng.
import * as THREE from 'three';

const PI = Math.PI, TAU = PI * 2;
const pick = a => a[Math.floor(Math.random() * a.length)];
const canonName = n => String(n || '').replace(/^mixamorig\d*[:_]?/i, '');
export const outfitTime = { value: 0 };

// ---------- chất liệu ----------
const SPARKLE = `
{ vec3 q = floor(vViewPosition * 160.0);
  float h = fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  float tw = 0.5 + 0.5 * sin(uOTime * 9.0 + h * 80.0);
  totalEmissiveRadiance += step(0.965, h) * tw * uSpk * diffuseColor.rgb * 2.2 + step(0.992, h) * tw * vec3(1.2) * uSpk; }`;
const FAB = {
  sequin: { roughness: 0.4, metalness: 0.42, sparkle: 1 },
  metal: { roughness: 0.3, metalness: 0.6, sparkle: 0.5 },
  satin: { roughness: 0.28, metalness: 0.12, sparkle: 0 },
  velvet: { roughness: 0.92, metalness: 0.0, sparkle: 0, sheen: 1 },
  matte: { roughness: 0.75, metalness: 0.0, sparkle: 0 },
};
// áp chất liệu vải lên một material (giữ nguyên các chỉnh sửa shader trước đó)
export function fabricize(m, fabric, lumColor) {
  const f = FAB[fabric] || FAB.matte;
  m.roughness = f.roughness; m.metalness = f.metalness;
  if (m.roughnessMap && f.roughness < 0.5) m.roughnessMap = null;
  if (m.metalnessMap) m.metalnessMap = null;
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
  const color = lumColor ? new THREE.Color(lumColor) : null;
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(m, sh, r);
    sh.uniforms.uOTime = outfitTime;
    sh.uniforms.uSpk = { value: f.sparkle };
    let head = '#include <common>\nuniform float uOTime; uniform float uSpk;\n';
    if (color) { sh.uniforms.uLum = { value: color }; head += 'uniform vec3 uLum;\n'; }
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', head);
    if (color) sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n{ float l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = uLum * clamp(0.3 + 1.4 * l, 0.0, 1.5); }');
    if (f.denim) sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n#ifdef USE_MAP\n{ float tw = fract((vMapUv.x + vMapUv.y) * 260.0); diffuseColor.rgb *= 0.86 + 0.14 * step(0.5, tw); }\n#endif');
    let em = f.sparkle ? SPARKLE : '';
    if (f.sheen) em += '\n{ float rim = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition))); totalEmissiveRadiance += diffuseColor.rgb * pow(rim, 3.0) * 0.6; }';
    if (em) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + em);
  };
  m.customProgramCacheKey = () => prevKey + '|fab-' + fabric + (color ? '-l' : '');
  return m;
}
const garmentMats = new Map();
function garmentMat(color, fabric) {
  const k = color + fabric;
  if (!garmentMats.has(k)) garmentMats.set(k, fabricize(new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide }), fabric));
  return garmentMats.get(k);
}

// ---------- danh sách trang phục ----------
const GOWN_COLORS = [['#c8102e', 'satin'], ['#0b0b10', 'sequin'], ['#d4af37', 'sequin'], ['#c0c4cc', 'sequin'], ['#1e3a8a', 'satin'], ['#e75480', 'satin'], ['#5b21b6', 'velvet'], ['#0f766e', 'satin'], ['#f5f0e6', 'satin'], ['#ff3d8b', 'sequin'], ['#7a0019', 'velvet'], ['#2a2a35', 'sequin']];
export const FEMALE_OUTFITS = [
  { id: 'ballgown', name: 'Váy dạ hội xoè', skirt: 'ball', w: 3 },
  { id: 'mermaid', name: 'Váy đuôi cá', skirt: 'mermaid', w: 3 },
  { id: 'aline', name: 'Đầm dạ hội dài', skirt: 'aline', w: 2 },
  { id: 'cocktail', name: 'Váy cocktail kim sa', skirt: 'midi', fabric: 'sequin', w: 3 },
  { id: 'jumpsuit', name: 'Jumpsuit kim tuyến', skirt: null, jumpsuit: true, fabric: 'sequin', colors: ['#d4af37', '#ff3d8b', '#7c3dff', '#c8102e', '#0f766e'], w: 2 },
];
export const MALE_OUTFITS = [
  { id: 'tux', name: 'Tuxedo đen', top: ['#16161b', 'satin'], bottom: ['#111114', 'satin'], shoes: ['#0b0b0d', 'metal'], acc: ['bowtie:#0b0b0d', 'square:#f5f5f5'], w: 3 },
  { id: 'whitejacket', name: 'Vest trắng dạ tiệc', top: ['#f3efe6', 'satin'], bottom: ['#111114', 'satin'], shoes: ['#0b0b0d', 'metal'], acc: ['bowtie:#0b0b0d', 'rose'], w: 2 },
  { id: 'goldsequin', name: 'Vest kim sa vàng', top: ['#d4af37', 'sequin'], bottom: ['#111114', 'satin'], shoes: ['#0b0b0d', 'metal'], acc: ['bowtie:#0b0b0d', 'glasses', 'chain'], w: 3 },
  { id: 'velvet', name: 'Vest nhung', top: [['#7a0019', '#1e3a8a', '#0f5132', '#3b0764'], 'velvet'], bottom: ['#111114', 'satin'], shoes: ['#0b0b0d', 'metal'], acc: ['bowtie:#d4af37', 'square:#d4af37'], w: 3 },
  { id: 'silver', name: 'Vest bạc ánh kim', top: ['#c0c4cc', 'sequin'], bottom: ['#c0c4cc', 'metal'], shoes: ['#e6e6ea', 'metal'], acc: ['glasses', 'glow'], w: 2 },
  { id: 'pinkparty', name: 'Suit hồng ăn chơi', top: [['#ff3d8b', '#ff8a3d', '#22d3ee', '#a3e635'], 'satin'], bottom: 'same', shoes: ['#f5f5f5', 'metal'], acc: ['glasses', 'chain', 'glow'], w: 2 },
  { id: 'blacksequin', name: 'Vest kim sa đen', top: ['#141418', 'sequin'], bottom: ['#111114', 'satin'], shoes: ['#0b0b0d', 'metal'], acc: ['bowtie:#c0c4cc', 'square:#c0c4cc', 'glow'], w: 2 },
];
function weighted(list) { let r = Math.random() * list.reduce((a, o) => a + (o.w || 1), 0); for (const o of list) { r -= o.w || 1; if (r <= 0) return o; } return list[0]; }
export function randomOutfit(female) {
  if (female) {
    const o = weighted(FEMALE_OUTFITS);
    let [c, fab] = pick(GOWN_COLORS); if (o.colors) c = pick(o.colors);
    const acc = [];
    if (Math.random() < 0.45) acc.push('tiara');
    if (Math.random() < 0.55) acc.push(pick(['pearls', 'diamonds']));
    if (Math.random() < 0.3) acc.push('boa:' + pick(['#ffffff', '#ff8fc8', '#111111', '#d4af37']));
    if (Math.random() < 0.25) acc.push('glow');
    return { id: o.id, name: o.name, female: true, skirt: o.skirt, jumpsuit: !!o.jumpsuit, color: c, fabric: o.fabric || fab, acc };
  }
  const o = weighted(MALE_OUTFITS);
  const res = c => (Array.isArray(c[0]) ? [pick(c[0]), c[1]] : c);
  const top = res(o.top);
  return { id: o.id, name: o.name, female: false, top, bottom: o.bottom === 'same' ? top : res(o.bottom), shoes: o.shoes, acc: o.acc.slice(), hat: Math.random() < 0.3 };
}

// ---------- số đo cơ thể (một lần cho mỗi mô hình) ----------
const _v = new THREE.Vector3(), _m = new THREE.Matrix4();
function measure(t) {
  if (t._fit !== undefined) return t._fit;
  t._fit = null;
  const meshes = [];
  t.scene.traverse(o => { if (o.isSkinnedMesh && o.geometry.attributes.skinIndex) meshes.push(o); });
  if (!meshes.length) return null;
  // khung xương chính: lưới có nhiều đỉnh nhất
  meshes.sort((a, b) => b.geometry.attributes.position.count - a.geometry.attributes.position.count);
  const main = meshes[0], skel = main.skeleton;
  const names = skel.bones.map(b => canonName(b.name));
  const idx = n => names.indexOf(n);
  const need = ['Hips', 'Spine', 'Neck', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot'];
  if (need.some(n => idx(n) < 0)) return null;
  const bpos = i => new THREE.Vector3().setFromMatrixPosition(_m.copy(skel.boneInverses[i]).invert());
  const P = {}; for (const n of ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot', 'LeftToeBase']) if (idx(n) >= 0) P[n] = bpos(idx(n));
  const H = P.Hips;
  const up = P.Neck.clone().sub(H).normalize();
  const lat = P.LeftUpLeg.clone().sub(P.RightUpLeg); lat.addScaledVector(up, -lat.dot(up)).normalize();
  const fwd = new THREE.Vector3().crossVectors(lat, up).normalize();
  if (P.LeftToeBase && P.LeftToeBase.clone().sub(P.LeftFoot).dot(fwd) < 0) fwd.negate();
  const L = P.Neck.clone().sub(H).dot(up);                      // hông → cổ
  const footH = Math.min(P.LeftFoot.clone().sub(H).dot(up), P.RightFoot.clone().sub(H).dot(up));
  const kneeH = (P.LeftLeg.clone().sub(H).dot(up) + P.RightLeg.clone().sub(H).dot(up)) / 2;
  const hipHalf = P.LeftUpLeg.clone().sub(P.RightUpLeg).length() / 2;
  // lấy mẫu số đo theo chiều cao × góc
  const NB = 40, NA = 24, h0 = footH - 0.05 * L, h1 = L * 0.95;
  const R = Array.from({ length: NB }, () => new Float32Array(NA));
  const torsoSet = new Set(['Hips', 'Spine', 'Spine1', 'Spine2', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot', 'Neck'].map(idx).filter(i => i >= 0));
  const sampleSet = new Set(['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck'].map(idx).filter(i => i >= 0));
  const samples = [];   // cho việc chép trọng số
  for (const me of meshes) {
    if (me.skeleton.bones.length !== skel.bones.length || me.skeleton.bones.some((b, i) => canonName(b.name) !== names[i])) continue;
    const pos = me.geometry.attributes.position, si = me.geometry.attributes.skinIndex, sw = me.geometry.attributes.skinWeight;
    for (let i = 0; i < pos.count; i++) {
      let best = -1, bw = 0;
      for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
      if (!torsoSet.has(best)) continue;
      _v.fromBufferAttribute(pos, i).applyMatrix4(me.bindMatrix).sub(H);
      const h = _v.dot(up), x = _v.dot(lat), z = _v.dot(fwd);
      const b = Math.floor((h - h0) / (h1 - h0) * NB); if (b < 0 || b >= NB) continue;
      const a = Math.floor(((Math.atan2(x, z) / TAU) + 1) % 1 * NA);
      const r = Math.hypot(x, z); if (r > R[b][a]) R[b][a] = r;
      if (sampleSet.has(best) && h > 0 && h < L * 0.8) samples.push({ h, x, z, si: [0, 1, 2, 3].map(k => si.getComponent(i, k)), sw: [0, 1, 2, 3].map(k => sw.getComponent(i, k)) });
    }
  }
  // lấp ô trống + làm mượt
  for (let b = 0; b < NB; b++) for (let a = 0; a < NA; a++) if (!R[b][a]) {
    let s = 0, n = 0; for (let d = 1; d < NA / 2 && !n; d++) for (const aa of [a - d, a + d]) { const v = R[b][(aa + NA) % NA]; if (v) { s += v; n++; } }
    R[b][a] = n ? s / n : hipHalf * 1.6;
  }
  const Rs = R.map((row, b) => row.map((_, a) => { let s = 0; for (let d = -1; d <= 1; d++) s += R[b][(a + d + NA) % NA]; return s / 3; }));
  const radius = (h, ang) => {
    const fb = clamp01((h - h0) / (h1 - h0)) * (NB - 1), b0 = Math.floor(fb), b1 = Math.min(NB - 1, b0 + 1), tb = fb - b0;
    const fa = (((ang / TAU) % 1) + 1) % 1 * NA, a0 = Math.floor(fa) % NA, a1 = (a0 + 1) % NA, ta = fa - Math.floor(fa);
    const r0 = Rs[b0][a0] * (1 - ta) + Rs[b0][a1] * ta, r1 = Rs[b1][a0] * (1 - ta) + Rs[b1][a1] * ta;
    return r0 * (1 - tb) + r1 * tb;
  };
  t._fit = { P, main, names, idx, H, up, lat, fwd, L, footH, kneeH, hipHalf, radius, samples, unit: 1 / t.norm, cache: {} };
  return t._fit;
}
const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---------- may áo quây (bodice) ----------
function buildBodice(F) {
  const { H, up, lat, fwd, L } = F;
  const RINGS = 16, SEG = 40, hb = 0.04 * L;
  const topH = a => { const c = Math.cos(a); const front = 0.66 * L - 0.05 * L * Math.exp(-(a * a) / 0.06) - 0.03 * L * Math.exp(-((a - 0.5) ** 2) / 0.05) * 0 ; return c > 0 ? front : 0.6 * L + 0.06 * L * c; };
  const pos = [], uv = [], ind = [], sIdx = [], sW = [];
  for (let r = 0; r <= RINGS; r++) for (let s = 0; s <= SEG; s++) {
    let a = s / SEG * TAU; if (a > PI) a -= TAU;
    const hTop = topH(a);
    const h = hb + (hTop - hb) * (r / RINGS);
    const rad = F.radius(h, a) * 1.07 + 0.012 * L;
    const x = Math.sin(a) * rad, z = Math.cos(a) * rad;
    _v.copy(H).addScaledVector(up, h).addScaledVector(lat, x).addScaledVector(fwd, z);
    pos.push(_v.x, _v.y, _v.z); uv.push(s / SEG, r / RINGS);
    // chép trọng số từ đỉnh cơ thể gần nhất
    let best = null, bd = Infinity;
    for (const p of F.samples) { const d = (p.h - h) ** 2 + (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = p; } }
    sIdx.push(...(best ? best.si : [F.idx('Spine'), 0, 0, 0])); sW.push(...(best ? best.sw : [1, 0, 0, 0]));
  }
  for (let r = 0; r < RINGS; r++) for (let s = 0; s < SEG; s++) { const a = r * (SEG + 1) + s, b = a + SEG + 1; ind.push(a, b, a + 1, b, b + 1, a + 1); }
  return makeGeo(pos, uv, ind, sIdx, sW);
}

// ---------- may chân váy ----------
const SKIRTS = {
  ball: { hem: 'floor', flare: t => 0.06 + 0.5 * Math.pow(t, 0.65), leg: 0.32 },
  aline: { hem: 'floor', flare: t => 0.03 + 0.3 * t, leg: 0.45 },
  mermaid: { hem: 'floor', flare: t => 0.03 + (t < 0.6 ? 0 : 0.36 * Math.pow((t - 0.6) / 0.4, 1.6)), leg: 0.7, tight: true },
  midi: { hem: 'tea', flare: t => 0.05 + 0.24 * t, leg: 0.42 },
  mini: { hem: 'thigh', flare: t => 0.025 + 0.06 * t, leg: 0.55, tight: true },
  skater: { hem: 'thigh', flare: t => 0.03 + 0.16 * t, leg: 0.45 },
  slip: { hem: 'knee', flare: t => 0.02 + 0.08 * t, leg: 0.6, tight: true },
  pleated: { hem: 'thigh', flare: t => 0.04 + 0.15 * t, leg: 0.45, pleats: 0.14 },
  pleatedMidi: { hem: 'tea', flare: t => 0.04 + 0.2 * t, leg: 0.42, pleats: 0.12 },
  aodai: { hem: 'calf', flare: t => 0.0 + 0.02 * t, leg: 0.62, slit: true, tight: true, smooth: true },
  baba: { hem: 'hip', flare: t => 0.03 + 0.03 * t, leg: 0.35, slit: true },
};
function buildSkirt(F, kind) {
  const S = SKIRTS[kind]; if (!S) return null;
  const { H, up, lat, fwd, L, footH, kneeH } = F;
  const top = 0.07 * L;
  const hem = S.hem === 'floor' ? footH - 0.07 * L : S.hem === 'thigh' ? kneeH * 0.45 : S.hem === 'hip' ? kneeH * 0.15 : S.hem === 'knee' ? kneeH * 1.02 : S.hem === 'calf' ? kneeH + (footH - kneeH) * 0.5 : kneeH + (footH - kneeH) * 0.85;
  const RINGS = 30, SEG = 48;
  const iH = F.idx('Hips'), iLU = F.idx('LeftUpLeg'), iRU = F.idx('RightUpLeg'), iLL = F.idx('LeftLeg'), iRL = F.idx('RightLeg');
  const pos = [], uv = [], ind = [], sIdx = [], sW = [];
  for (let r = 0; r <= RINGS; r++) for (let s = 0; s <= SEG; s++) {
    const tt = r / RINGS, h = top + (hem - top) * tt;
    let a = s / SEG * TAU; if (a > PI) a -= TAU;
    const fit = F.radius(Math.max(h, F.footH), a) * (S.tight ? 1.2 : 1.12) + 0.02 * L;
    // vòng ôm cả hai chân (dưới háng) không nhỏ hơn bề rộng hông
    const minHip = (F.hipHalf * 1.9 + 0.02 * L) * (0.85 + 0.15 * Math.abs(Math.sin(a)));
    let rad = Math.max(fit, h < 0 ? minHip * (S.tight ? 0.92 : 1) : fit) + S.flare(tt) * L * 1.15;
    if (!S.tight && tt > 0.15) rad = Math.max(rad, minHip + S.flare(tt) * L * 1.15);
    const wav = S.smooth ? 1 : S.pleats ? 1 + S.pleats * Math.abs(Math.sin(a * 14)) * (0.3 + tt) : 1 + (S.tight ? 0.02 : 0.05) * Math.sin(a * 9) * tt;     // nếp vải / xếp ly
    const x = Math.sin(a) * rad * wav, z = Math.cos(a) * rad * wav * 0.92;
    _v.copy(H).addScaledVector(up, h).addScaledVector(lat, x).addScaledVector(fwd, z);
    pos.push(_v.x, _v.y, _v.z); uv.push(s / SEG, tt);
    // trọng số: hông + hai chân theo phía, cẳng chân ở phần dưới gối
    const legInf = S.leg * smooth(0.0, 0.55, tt);
    const side = clamp01(0.5 + 0.5 * Math.max(-1, Math.min(1, Math.sin(a) * 1.7)));
    const below = clamp01((kneeH - h) / Math.max(1e-4, kneeH - footH)) * 0.7;
    const ws = [[iH, 1 - legInf], [iLU, legInf * side * (1 - below)], [iLL, legInf * side * below], [iRU, legInf * (1 - side) * (1 - below)], [iRL, legInf * (1 - side) * below]];
    ws.sort((p, q) => q[1] - p[1]); const w4 = ws.slice(0, 4), sum = w4.reduce((x, y) => x + y[1], 0) || 1;
    for (const [i, w] of w4) { sIdx.push(i); sW.push(w / sum); }
  }
  for (let r = 0; r < RINGS; r++) for (let s = 0; s < SEG; s++) {
    if (S.slit && r > RINGS * 0.06) { const am = ((s + 0.5) / SEG) * TAU; if (Math.abs(Math.sin(am)) > (S.smooth ? 0.82 : 0.94)) continue; }
    const a = r * (SEG + 1) + s, b = a + SEG + 1; ind.push(a, b, a + 1, b, b + 1, a + 1);
  }
  return makeGeo(pos, uv, ind, sIdx, sW);
}
function makeGeo(pos, uv, ind, sIdx, sW) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sW, 4));
  g.setIndex(ind); g.computeVertexNormals();
  return g;
}

// ---------- phụ kiện cứng (gắn vào xương, đơn vị mét, +Z trước mặt, +X bên trái) ----------
const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4 }, o));
const gemMat = c => std(c, { emissive: c, emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.3, toneMapped: false });
function bowtie(c) { const g = new THREE.Group(); const m = std(c, { roughness: 0.35 }); for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 3).rotateZ(-sd * PI / 2).scale(1, 1, 0.4), m); w.position.x = sd * 0.032; g.add(w); } g.add(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.022, 0.014), m)); return g; }
function pocketSquare(c) { const g = new THREE.Group(); const m = std(c, { roughness: 0.5, side: THREE.DoubleSide }); for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 3).scale(1, 1, 0.3), m); p.position.set((i - 1) * 0.012, 0.012, 0); p.rotation.z = (i - 1) * 0.3; g.add(p); } return g; }
function rose() { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), std(0xc8102e, { roughness: 0.6 }))); const l = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 4).rotateZ(1.2).scale(1, 1, 0.3), std(0x2e7d32)); l.position.set(-0.02, -0.012, 0); g.add(l); return g; }
function tiara(L) { const g = new THREE.Group(), R = L * 0.46, m = std(0xe6e6f0, { metalness: 1, roughness: 0.15 }); g.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.006, 6, 28, PI * 0.9).rotateX(PI / 2).rotateY(PI * 0.55), m)); for (let i = -3; i <= 3; i++) { const a = i * 0.22, h = 0.03 + (3 - Math.abs(i)) * 0.012; const sp = new THREE.Mesh(new THREE.ConeGeometry(0.008, h, 5), m); sp.position.set(Math.sin(a) * R, h / 2, Math.cos(a) * R); g.add(sp); const gm = new THREE.Mesh(new THREE.OctahedronGeometry(0.009), gemMat(pick([0x9fe8ff, 0xff8fc8, 0xffffff]))); gm.position.set(Math.sin(a) * R, h * 0.35, Math.cos(a) * R + 0.004); g.add(gm); } g.rotation.x = -0.25; return g; }
function necklace(kind, neckR) { const g = new THREE.Group(); const n = kind === 'pearls' ? 26 : 34; const m = kind === 'pearls' ? std(0xf6f1e4, { roughness: 0.25, metalness: 0.2 }) : gemMat(0xdff6ff); const geo = kind === 'pearls' ? new THREE.SphereGeometry(0.008, 8, 6) : new THREE.OctahedronGeometry(0.007); for (let i = 0; i < n; i++) { const a = (i / n - 0.5) * PI * 1.25; const droop = Math.cos(a) ** 6 * 0.035; const p = new THREE.Mesh(geo, m); p.position.set(Math.sin(a) * neckR, -droop, Math.cos(a) * neckR); g.add(p); } if (kind === 'diamonds') { const pd = new THREE.Mesh(new THREE.OctahedronGeometry(0.016).scale(0.8, 1.3, 0.5), gemMat(0x7cd8ff)); pd.position.set(0, -0.055, neckR + 0.004); g.add(pd); } return g; }
function goldChain(neckR) { const g = new THREE.Group(); const m = std(0xffc928, { metalness: 1, roughness: 0.22 }); const n = 30; for (let i = 0; i < n; i++) { const a = (i / n - 0.5) * PI * 1.3; const droop = Math.cos(a) ** 4 * 0.07; const p = new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0028, 4, 8), m); p.position.set(Math.sin(a) * neckR * 1.1, -droop, Math.cos(a) * neckR * 1.1); p.rotation.y = a + (i % 2) * PI / 2; g.add(p); } return g; }
function boa(c, r) { const g = new THREE.Group(); const m = std(c, { roughness: 1 }); const geo = new THREE.SphereGeometry(0.03, 6, 5); for (let i = 0; i < 70; i++) { const a = (i / 70 - 0.5) * PI * 1.9; const hang = Math.max(0, Math.abs(a) - 1.2) * 0.32; const p = new THREE.Mesh(geo, m); p.position.set(Math.sin(a) * r + (Math.random() - 0.5) * 0.02, -hang + (Math.random() - 0.5) * 0.02, Math.cos(a) * r * 0.85 + (Math.random() - 0.5) * 0.02); p.scale.setScalar(0.7 + Math.random() * 0.6); g.add(p); } return g; }
function glowStick() { const c = pick([0x3dff7a, 0xff3df2, 0x3dd9ff, 0xfff13d]); const g = new THREE.Group(); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.24, 8).rotateX(PI / 2), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2, toneMapped: false })); s.position.set(-0.08, -0.01, 0.06); g.add(s); return g; }
function sunglasses(L) { const g = new THREE.Group(); const m = std(0x050507, { roughness: 0.05, metalness: 0.7 }); for (const sd of [-1, 1]) { const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.03, 4, 8).rotateZ(PI / 2).scale(1, 1, 0.3), m); l.position.x = sd * 0.042; g.add(l); } g.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.007, 0.007).translate(0, 0.014, -0.004), m)); g.position.set(0, L * 0.4, L * 0.5); return g; }
function fedora(L, c) { const g = new THREE.Group(), R = L * 0.55, m = std(c, { roughness: 0.8 }); g.add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.8, R * 0.92, L * 0.4, 20), m).translateY(L * 0.95)); g.add(new THREE.Mesh(new THREE.CylinderGeometry(R * 1.55, R * 1.55, 0.012, 24), m).translateY(L * 0.78)); g.add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.93, R * 0.93, 0.03, 20, 1, true), std(0x111111)).translateY(L * 0.8)); g.rotation.x = -0.12; return g; }

// ---------- áp trang phục ----------
export function removeOutfit(av) {
  for (const o of av.outfitObjs || []) { o.parent && o.parent.remove(o); }
  av.outfitObjs = [];
  av.outfit = null;
}
// attach(boneName, obj) do costumes.js cung cấp (đặt vật trong khung đứng nghỉ, đơn vị mét)
export function applyOutfit(av, outfit, attach) {
  removeOutfit(av);
  if (!outfit) return;
  av.outfit = outfit;
  const t = av.t, F = measure(t);
  t._unitM = 1 / t.norm;
  const add = (bone, obj) => { obj.traverse(x => { x.userData.outfit = true; }); const h = attach(bone, obj); if (h) av.outfitObjs.push(h); };
  if (outfit.bar) { applyBar(av, outfit, add); }
  // lưới may theo người: gắn vào khung xương của bản sao
  let skel = null;
  if (F) av.root.traverse(o => { if (!skel && o.isSkinnedMesh && o.name === F.main.name) skel = o.skeleton; });
  if (!outfit.bar && outfit.female && F && skel) {
    const key = (outfit.skirt || 'none');
    F.cache.bodice = F.cache.bodice || buildBodice(F);
    if (outfit.skirt) F.cache[key] = F.cache[key] || buildSkirt(F, outfit.skirt);
    const mat = garmentMat(outfit.color, outfit.fabric);
    for (const geo of [F.cache.bodice, outfit.skirt ? F.cache[key] : null]) {
      if (!geo) continue;
      const sm = new THREE.SkinnedMesh(geo, mat);
      sm.frustumCulled = false;
      sm.bind(skel, new THREE.Matrix4());
      sm.userData.outfit = true; av.root.add(sm); av.outfitObjs.push(sm);
    }
  }
  // phụ kiện
  const L = t.headLen, neckR = 0.082;
  for (const a of outfit.acc || []) {
    const [k, c] = a.split(':');
    if (k === 'bowtie') { const b = bowtie(c); b.position.set(0, 0.035, 0.07); add('Neck', b); }
    if (k === 'square') { const p = pocketSquare(c); p.position.set(0.1, 0.06, 0.13); add('Spine2', p); }
    if (k === 'rose') { const p = rose(); p.position.set(0.11, 0.08, 0.13); add('Spine2', p); }
    if (k === 'tiara') { const p = tiara(L * 1.15); p.position.set(0, L * 0.66, L * 0.1); add('Head', p); }
    if (k === 'pearls' || k === 'diamonds') { const p = necklace(k, neckR); p.position.set(0, -0.025, 0.012); p.scale.setScalar(1.25); add('Neck', p); }
    if (k === 'chain') { const p = goldChain(neckR); p.position.set(0, 0.0, 0.005); add('Neck', p); }
    if (k === 'boa') { const p = boa(c, 0.15); p.position.set(0, 0.0, -0.01); add('Neck', p); }
    if (k === 'glow') add('RightHand', glowStick());
    if (k === 'glasses' && t.rpm) add('Head', sunglasses(L));
  }
  if (!outfit.bar && outfit.hat && t.rpm) add('Head', fedora(L, pick(['#111111', '#f3efe6', '#3a2a1a'])));
}
// màu / chất liệu cho các lớp đồ có sẵn của mô hình (Ready Player Me)
export function outfitLayers(outfit) {
  if (!outfit) return null;
  if (outfit.bar) return barLayers(outfit);
  if (outfit.female) return { Wolf3D_Outfit_Top: [outfit.color, outfit.fabric], Wolf3D_Outfit_Bottom: [outfit.color, outfit.fabric], Wolf3D_Outfit_Footwear: ['#d4af37', 'metal'] };
  return { Wolf3D_Outfit_Top: outfit.top, Wolf3D_Outfit_Bottom: outfit.bottom, Wolf3D_Outfit_Footwear: outfit.shoes };
}


// ======================================================================
// PHONG CÁCH ĐI BAR / HOT TREND
// ======================================================================
let partyMix = 25;                                  // % người mặc đồ dạ hội, còn lại đồ đi bar
export function setOutfitMix(n) { partyMix = Math.max(0, Math.min(100, Number(n) || 0)); }
export function pickOutfit(female) { return Math.random() * 100 < partyMix ? randomOutfit(female) : randomBarOutfit(female); }

const DENIM = ['#3b5ba5', '#2c4a86', '#4a6fb5', '#1e2f55', '#6f8fc9', '#1b1b1f', '#3b5ba5'];
const TEE = ['#f5f5f2', '#111114', '#f5f5f2', '#ff3d8b', '#ffd84d', '#8cc8ff', '#c8ff3d', '#b9a3e8', '#ff8a3d', '#9fe3c6', '#e8e0d0', '#d6262f'];
const HOTF = ['#ff3d8b', '#111114', '#f5f5f2', '#d6262f', '#c8ff3d', '#b9a3e8', '#ffb3c7', '#7c3dff', '#22d3ee', '#d4af37', '#ff8a3d', '#c0c4cc'];
const PRINTS = ['VIBES', 'NEON', 'PARTY', 'NO.1', 'SAIGON', 'HANOI', '☺', '★', '♥', 'DJ', 'BAE', 'LIT'];
const BOTTOM_M = [['#3b5ba5', 'denim'], ['#2c4a86', 'denim'], ['#1b1b1f', 'denim'], ['#9db4dc', 'denim'], ['#cdb58f', 'matte'], ['#5b6b3a', 'matte'], ['#3a3d44', 'matte']];
export const BAR_FEMALE = [
  { id: 'crop_jeans', name: 'Croptop + jean', top: 'crop', bottom: 'jeans', w: 3 },
  { id: 'cami_mini', name: 'Áo hai dây + váy ngắn', top: 'cami', skirt: 'mini', w: 3 },
  { id: 'tube_jeans', name: 'Áo quây + jean', top: 'tube', bottom: 'jeans', w: 2 },
  { id: 'bodycon', name: 'Đầm ôm hai dây', top: 'cami', skirt: 'mini', same: true, w: 3 },
  { id: 'slip', name: 'Đầm lụa hai dây', top: 'cami', skirt: 'slip', same: true, fabric: 'satin', w: 2 },
  { id: 'tee_skirt', name: 'Áo thun + chân váy', top: 'tee', skirt: 'skater', print: true, w: 2 },
  { id: 'tee_jeans', name: 'Áo thun + jean', top: 'tee', bottom: 'jeans', print: true, w: 2 },
];
export const BAR_MALE = [
  { id: 'tee_jeans', name: 'Áo thun + jean', top: 'tee', w: 4 },
  { id: 'tank', name: 'Áo ba lỗ + jean', top: 'tank', w: 2 },
  { id: 'leather', name: 'Áo khoác da', top: 'jacket', jacket: ['#141416', 'leather'], w: 2 },
  { id: 'denimjacket', name: 'Áo khoác jean', top: 'jacket', jacket: ['#3b5ba5', 'denim'], w: 1 },
  { id: 'bomber', name: 'Áo bomber', top: 'jacket', jacket: [['#4b5a2a', '#111114', '#7a0019', '#1e3a8a', '#ff8a3d'], 'satin'], w: 2 },
];
export function randomBarOutfit(female) {
  if (female) {
    const o = weighted(BAR_FEMALE);
    const c = pick(o.top === 'tee' || o.top === 'crop' ? TEE.concat(HOTF) : HOTF);
    const fab = o.fabric || pick(['satin', 'matte', 'sequin', 'satin', 'leather']);
    const skirtC = o.same ? c : pick(['#111114', '#111114', '#3b5ba5', '#f5f5f2', '#ff3d8b', '#d4af37', c]);
    const acc = [];
    if (Math.random() < 0.5) acc.push(pick(['pearls', 'diamonds', 'chain']));
    if (Math.random() < 0.3) acc.push('glow');
    return { bar: true, female: true, id: o.id, name: o.name, top: o.top, topColor: c, topFabric: o.top === 'tee' || o.top === 'crop' ? 'matte' : fab,
      skirt: o.skirt || null, skirtColor: skirtC, skirtFabric: o.same ? fab : pick(['matte', 'leather', 'denim', 'satin']),
      legs: o.bottom === 'jeans' ? pick(DENIM) : '#141417', print: o.print && Math.random() < 0.8 ? pick(PRINTS) : null, acc };
  }
  const o = weighted(BAR_MALE);
  const res = c => (Array.isArray(c[0]) ? [pick(c[0]), c[1]] : c);
  const acc = [];
  if (Math.random() < 0.45) acc.push('chain');
  if (Math.random() < 0.3) acc.push('glasses');
  if (Math.random() < 0.3) acc.push('glow');
  const hat = pick(['cap', 'capBack', 'beanie', 'bucket', 'fedora', 'cap']);
  return { bar: true, female: false, id: o.id, name: o.name, top: o.top, topColor: pick(TEE), jacket: o.jacket ? res(o.jacket) : null,
    bottom: pick(BOTTOM_M), shoes: pick([['#f5f5f2', 'matte'], ['#f5f5f2', 'matte'], ['#111114', 'matte'], ['#ff3d8b', 'matte']]),
    print: o.top !== 'jacket' && Math.random() < 0.6 ? pick(PRINTS) : null, hat, acc };
}
FAB.denim = { roughness: 0.9, metalness: 0, sparkle: 0, denim: 1 };
FAB.leather = { roughness: 0.38, metalness: 0.1, sparkle: 0 };

// ---------- cắt một vùng của lưới có sẵn thành lớp áo mới (ôm sát, gắn xương) ----------
function regionGeo(t, src, keep, offsetM) {
  const F = measure(t);
  const g = src.geometry, pos = g.attributes.position, nor = g.attributes.normal, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, uv = g.attributes.uv;
  const names = src.skeleton.bones.map(b => canonName(b.name));
  const scale = src.bindMatrix.getMaxScaleOnAxis() || 1;
  const off = offsetM * t._unitM / scale;
  const okV = new Uint8Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    let best = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
    _v.fromBufferAttribute(pos, i).applyMatrix4(src.bindMatrix).sub(F.H);
    okV[i] = keep(names[best], _v.dot(F.up) / F.L, _v.dot(F.lat) / F.L, _v.dot(F.fwd) / F.L) ? 1 : 0;
  }
  const idx = g.index ? g.index.array : [...Array(pos.count).keys()];
  const map = new Int32Array(pos.count).fill(-1);
  const P = [], N = [], U = [], SI = [], SW = [], I = [];
  for (let f = 0; f < idx.length; f += 3) {
    const a = idx[f], b = idx[f + 1], c = idx[f + 2];
    if (okV[a] + okV[b] + okV[c] < 2) continue;
    for (const v of [a, b, c]) {
      if (map[v] < 0) {
        map[v] = P.length / 3;
        const nx = nor ? nor.getX(v) : 0, ny = nor ? nor.getY(v) : 0, nz = nor ? nor.getZ(v) : 0;
        P.push(pos.getX(v) + nx * off, pos.getY(v) + ny * off, pos.getZ(v) + nz * off); N.push(nx, ny, nz);
        U.push(uv ? uv.getX(v) : 0, uv ? uv.getY(v) : 0);
        for (let k = 0; k < 4; k++) { SI.push(si.getComponent(v, k)); SW.push(sw.getComponent(v, k)); }
      }
      I.push(map[v]);
    }
  }
  if (!I.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
  geo.setIndex(I);
  return geo;
}
const TORSO = new Set(['Spine', 'Spine1', 'Spine2']);
const SHOULD = new Set(['LeftShoulder', 'RightShoulder']);
const UPARM = new Set(['LeftArm', 'RightArm']);
const LOWARM = new Set(['LeftForeArm', 'RightForeArm']);
// vùng của từng kiểu áo (h = độ cao so với hông / chiều dài thân)
const TOPS = {
  tee: (b, h) => (TORSO.has(b) || SHOULD.has(b) || UPARM.has(b) || (b === 'Hips' && h > -0.02)) && h > -0.05,
  crop: (b, h) => (TORSO.has(b) || SHOULD.has(b) || UPARM.has(b)) && h > 0.3,
  tank: (b, h) => (TORSO.has(b) || (b === 'Hips' && h > -0.02)) && h > -0.05,
  cami: (b, h, x, z) => (TORSO.has(b) || b === 'Hips') && h > 0.02 && h < (z > 0 ? 0.64 : 0.6),
  tube: (b, h) => TORSO.has(b) && h > 0.28 && h < 0.62,
  long: (b, h) => (TORSO.has(b) || SHOULD.has(b) || UPARM.has(b) || LOWARM.has(b) || (b === 'Hips' && h > -0.02)) && h > -0.05,
  turtle: (b, h) => (TORSO.has(b) || SHOULD.has(b) || UPARM.has(b) || LOWARM.has(b) || b === 'Neck' || (b === 'Hips' && h > -0.02)) && h > -0.05,
};
TOPS.hoodie = TOPS.long; TOPS.blouse = TOPS.long; TOPS.aodai = TOPS.turtle; TOPS.baba = TOPS.long; TOPS.polo = TOPS.tee; TOPS.shirt = TOPS.long; TOPS.shirtShort = TOPS.tee;
const SKINPART = { tee: (b, h) => b === 'Neck' || LOWARM.has(b), tank: (b, h) => b === 'Neck' || SHOULD.has(b) || UPARM.has(b) || LOWARM.has(b), long: (b) => b === 'Neck' };
SKINPART.polo = SKINPART.tee; SKINPART.shirtShort = SKINPART.tee; SKINPART.hoodie = SKINPART.long; SKINPART.shirt = SKINPART.long; SKINPART.blouse = SKINPART.long; SKINPART.baba = SKINPART.long;
function meshByName(root, name) { let m = null; root.traverse(o => { if (!m && o.isSkinnedMesh && o.name === name) m = o; }); return m; }
function addRegion(av, srcName, kind, regionFn, mat, offM) {
  const t = av.t;
  const src = meshByName(t.scene, srcName), dst = meshByName(av.root, srcName);
  if (!src || !dst) return null;
  t._wrap = t._wrap || {};
  const key = srcName + '|' + kind;
  if (!(key in t._wrap)) t._wrap[key] = regionGeo(t, src, regionFn, offM);
  const geo = t._wrap[key]; if (!geo) return null;
  const sm = new THREE.SkinnedMesh(geo, mat);
  sm.frustumCulled = false;
  sm.bind(dst.skeleton, dst.bindMatrix);
  sm.userData.outfit = true;
  dst.parent.add(sm);
  av.outfitObjs.push(sm);
  return sm;
}
const plainMats = new Map();
function plainMat(color, fabric, pattern) {
  const k = color + fabric + (pattern || '');
  if (!plainMats.has(k)) {
    const m = new THREE.MeshStandardMaterial({ color: pattern ? 0xffffff : color, side: THREE.DoubleSide });
    if (pattern) { m.map = patternTex(pattern, color); }
    plainMats.set(k, fabricize(m, fabric));
  }
  return plainMats.get(k);
}
// hoạ tiết vải: caro, sọc, hoa, ren, gấm, chấm, len
const patCache = new Map();
function patternTex(kind, color) {
  const k = kind + color; if (patCache.has(k)) return patCache.get(k);
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const base = new THREE.Color(color), hsl = {}; base.getHSL(hsl);
  const dark = '#' + base.clone().offsetHSL(0, 0, -0.25).getHexString(), light = '#' + base.clone().offsetHSL(0, -0.1, 0.3).getHexString();
  const contrast = hsl.l > 0.6 ? '#1b1b22' : '#f5f5f2';
  g.fillStyle = color; g.fillRect(0, 0, 128, 128);
  if (kind === 'plaid') { g.globalAlpha = 0.55; g.fillStyle = dark; for (let i = 0; i < 128; i += 32) { g.fillRect(i, 0, 14, 128); g.fillRect(0, i, 128, 14); } g.globalAlpha = 0.8; g.fillStyle = contrast; for (let i = 7; i < 128; i += 32) { g.fillRect(i, 0, 2, 128); g.fillRect(0, i, 128, 2); } }
  if (kind === 'stripe') { g.fillStyle = contrast; g.globalAlpha = 0.85; for (let i = 0; i < 128; i += 16) g.fillRect(0, i, 128, 5); }
  if (kind === 'floral') { for (let n = 0; n < 9; n++) { const x = (n * 47) % 128, y = (n * 71) % 128, col = ['#ff6fa3', '#ffd84d', '#ffffff', '#ff3d4f', '#b9a3e8'][n % 5]; g.fillStyle = col; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 5, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#ffd84d'; g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); g.fillStyle = '#3f8f4a'; g.beginPath(); g.ellipse(x + 11, y + 9, 6, 3, 0.6, 0, Math.PI * 2); g.fill(); } }
  if (kind === 'lace') { g.strokeStyle = light; g.lineWidth = 2; g.globalAlpha = 0.9; for (let x = 0; x < 128; x += 16) for (let y = 0; y < 128; y += 16) { g.beginPath(); g.arc(x + 8, y + 8, 6, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(x + 8, y + 8, 2, 0, Math.PI * 2); g.stroke(); } }
  if (kind === 'brocade') { g.strokeStyle = '#e8c35a'; g.fillStyle = '#e8c35a'; g.lineWidth = 2; g.globalAlpha = 0.85; for (let x = 0; x < 128; x += 32) for (let y = 0; y < 128; y += 32) { const cx = x + 16 + ((y / 32) % 2) * 16, cy = y + 16; g.beginPath(); g.arc(cx % 128, cy, 9, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(cx % 128, cy, 4, 0, Math.PI * 2); g.fill(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; g.beginPath(); g.moveTo(cx % 128 + Math.cos(a) * 9, cy + Math.sin(a) * 9); g.lineTo(cx % 128 + Math.cos(a) * 14, cy + Math.sin(a) * 14); g.stroke(); } } }
  if (kind === 'dots') { g.fillStyle = contrast; g.globalAlpha = 0.85; for (let x = 0; x < 128; x += 16) for (let y = 0; y < 128; y += 16) { g.beginPath(); g.arc(x + 8 + ((y / 16) % 2) * 8, y + 8, 3, 0, Math.PI * 2); g.fill(); } }
  if (kind === 'knit') { g.strokeStyle = dark; g.globalAlpha = 0.5; g.lineWidth = 2; for (let x = 0; x < 128; x += 8) for (let y = 0; y < 128; y += 8) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y + 8); g.lineTo(x + 8, y); g.stroke(); } }
  if (kind === 'graphic') { g.fillStyle = contrast; g.globalAlpha = 0.7; g.font = '900 40px Arial'; g.textAlign = 'center'; g.fillText('★', 32, 50); g.fillText('✦', 96, 110); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(kind === 'floral' || kind === 'brocade' ? 4 : 6, kind === 'floral' || kind === 'brocade' ? 4 : 6); t.anisotropy = 4;
  patCache.set(k, t); return t;
}
// chữ in trên áo
const printTexCache = new Map();
function printTex(text, dark) {
  const k = text + dark; if (printTexCache.has(k)) return printTexCache.get(k);
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 ${text.length > 3 ? 72 : 150}px "Segoe UI", Arial`;
  g.fillStyle = dark ? '#111114' : '#ffffff'; g.fillText(text, 128, 132);
  g.lineWidth = 4; g.strokeStyle = dark ? 'rgba(255,61,139,0.9)' : 'rgba(255,61,139,0.9)'; g.strokeText(text, 128, 132);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; printTexCache.set(k, tx); return tx;
}
function chestPrint(av, text, shirtColor, add) {
  const F = measure(av.t); if (!F || !F.P.Spine2) return;
  const h = 0.4 * F.L, rad = F.radius(h, 0) * 1.03 + 0.008 * F.L;
  const pt = F.H.clone().addScaledVector(F.up, h).addScaledVector(F.fwd, rad).sub(F.P.Spine2);
  const n = av.t.norm;
  const lum = new THREE.Color(shirtColor); const dark = lum.r * 0.3 + lum.g * 0.59 + lum.b * 0.11 > 0.55;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshStandardMaterial({ map: printTex(text, dark), transparent: true, depthWrite: false, roughness: 0.8 }));
  m.position.set(pt.dot(F.lat) * n, pt.dot(F.up) * n, pt.dot(F.fwd) * n);
  add('Spine2', m);
}
function straps(av, color, add) {
  const F = measure(av.t); if (!F || !F.P.Spine2 || !F.P.LeftShoulder) return;
  const n = av.t.norm, m = std(color, { roughness: 0.4 });
  for (const side of [1, -1]) {
    const arm = (side > 0 ? F.P.LeftArm : F.P.RightArm) || (side > 0 ? F.P.LeftShoulder : F.P.RightShoulder);
    const sh = arm.clone().sub(F.P.Spine2);
    const x = sh.dot(F.lat) * n * 0.55, y = sh.dot(F.up) * n + 0.012;
    const r = F.radius(0.62 * F.L, 0) * n * 1.05;
    const g = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0045, 5, 18, PI).rotateY(PI / 2), m);
    g.position.set(x, y - r * 0.2, 0); g.scale.set(1, 0.55, 1);
    add('Spine2', g);
  }
}
function capHat(L, c, back) { const g = new THREE.Group(), R = L * 0.6, m = std(c, { roughness: 0.75 }); g.add(new THREE.Mesh(new THREE.SphereGeometry(R, 20, 10, 0, TAU, 0, PI * 0.5), m)); const brim = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.95, R * 0.95, 0.012, 20, 1, false, -PI / 2, PI).scale(1, 1, 0.9), m); brim.position.set(0, 0.005, R * 0.55 * (back ? -1 : 1)); g.add(brim); g.position.y = L * 0.46; g.rotation.x = back ? 0.18 : -0.18; return g; }
function beanie(L, c) { const g = new THREE.Group(), R = L * 0.62, m = std(c, { roughness: 1 }); g.add(new THREE.Mesh(new THREE.SphereGeometry(R, 20, 12, 0, TAU, 0, PI * 0.52).scale(1, 1.15, 1), m)); g.add(new THREE.Mesh(new THREE.TorusGeometry(R * 0.98, 0.022, 8, 24).rotateX(PI / 2), m)); g.position.y = L * 0.4; return g; }
function bucketHat(L, c) { const g = new THREE.Group(), R = L * 0.6, m = std(c, { roughness: 0.9, side: THREE.DoubleSide }); g.add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.85, R, L * 0.32, 20), m).translateY(L * 0.15)); g.add(new THREE.Mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.5, 0.05, 24, 1, true), m)); g.position.y = L * 0.5; return g; }

function neckProp(av, kind, color, add) {
  const F = measure(av.t); if (!F || !F.P.Neck) return;
  const n = av.t.norm, m = std(color, { roughness: 0.6, side: THREE.DoubleSide });
  const r = 0.068;
  if (kind === 'collar') { const g = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.15, 0.035, 20, 1, true, PI * 0.12, PI * 1.76), m); g.rotation.y = PI; g.position.set(0, 0.01, 0.0); add('Neck', g); }
  if (kind === 'mandarin') { const g = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98, r * 1.02, 0.05, 20, 1, true), m); g.position.set(0, 0.035, 0); add('Neck', g); }
  if (kind === 'hood') { const g = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 10, PI / 2 + 0.9, TAU - 1.8, 0, PI * 0.6).scale(1.05, 0.7, 0.85), m); g.position.set(0, 0.0, -0.06); add('Neck', g);
    const st = std(0xf2f2ee); for (const sd of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.11), st); c.position.set(sd * 0.03, -0.07, r + 0.035); add('Neck', c); } }
}
function tie(color, add, bow) {
  if (bow) { const b = bowtie(color); b.position.set(0, 0.035, 0.07); add('Neck', b); return; }
  const g = new THREE.Group(), m = std(color, { roughness: 0.35 });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.02, 0.012), m));
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.032, 0.36, 4, 1).rotateY(PI / 4).scale(1, 1, 0.25), m); blade.position.y = -0.19; g.add(blade);
  g.position.set(0, 0.02, 0.075); g.rotation.x = -0.12; add('Neck', g);
}
function khanDong(L, c) { const g = new THREE.Group(), R = L * 0.58, m = std(c, { roughness: 0.6 }); for (let i = 0; i < 4; i++) { const tr = new THREE.Mesh(new THREE.TorusGeometry(R * (1 - i * 0.04), L * 0.09, 8, 24).rotateX(PI / 2), m); tr.position.y = i * L * 0.11; tr.rotation.z = (i % 2 ? 0.12 : -0.12); g.add(tr); } const top = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.85, R * 0.85, 0.02, 20), m); top.position.y = L * 0.4; g.add(top); g.position.y = L * 0.5; return g; }
function addSkirt(av, F, kind, mat, skelName) {
  let skel = meshByName(av.root, skelName); skel = skel && skel.skeleton;
  F.cache[kind] = F.cache[kind] || buildSkirt(F, kind);
  if (!skel || !F.cache[kind]) return;
  const sm = new THREE.SkinnedMesh(F.cache[kind], mat); sm.frustumCulled = false; sm.bind(skel, new THREE.Matrix4()); sm.userData.outfit = true; av.root.add(sm); av.outfitObjs.push(sm);
}
function applyBar(av, o, add) {
  const t = av.t, F = measure(t);
  if (!F) return;
  const L = t.headLen;
  const topMat = plainMat(o.topColor, o.topFabric || 'matte', o.topPattern);
  const rpmMale = !o.female && t.rpm;
  const src = rpmMale ? 'Wolf3D_Outfit_Top' : F.main.name;
  const off = rpmMale ? 0.0 : 0.006;
  if (o.top && o.top !== 'jacket' && TOPS[o.top]) {
    addRegion(av, src, o.top, TOPS[o.top], topMat, off);
    if (rpmMale && SKINPART[o.top]) {
      const skinC = new THREE.Color('#c98f6c').multiply(new THREE.Color(av.skin || '#ffffff'));
      addRegion(av, src, o.top + '-skin', SKINPART[o.top], plainMat('#' + skinC.getHexString(), 'matte'), -0.004);
    }
  }
  if (o.top === 'cami') straps(av, o.topColor, add);
  if (o.top === 'polo' || o.top === 'shirt' || o.top === 'shirtShort') neckProp(av, 'collar', o.collar || o.topColor, add);
  if (o.top === 'hoodie') neckProp(av, 'hood', o.topColor, add);
  if (o.top === 'aodai') neckProp(av, 'mandarin', o.topColor, add);
  if (o.print) chestPrint(av, o.print, o.topColor, add);
  if (o.tie) tie(o.tie, add, o.bowtie);
  // váy / vạt áo
  const skirtMat = o.skirt ? plainMat(o.skirtColor || o.topColor, o.skirtFabric || o.topFabric || 'matte', o.skirtPattern || (o.skirt === 'aodai' || o.skirt === 'baba' ? o.topPattern : null)) : null;
  if (o.skirt) addSkirt(av, F, o.skirt, skirtMat, F.main.name);
  // mũ
  if (rpmMale || o.hat === 'khandong') {
    const hc = o.hatColor || pick(['#111114', '#f5f5f2', '#ff3d8b', '#1e3a8a', '#cdb58f', '#c8ff3d']);
    if (o.hat === 'cap' || o.hat === 'capBack') add('Head', capHat(L, hc, o.hat === 'capBack'));
    if (o.hat === 'beanie') add('Head', beanie(L, hc));
    if (o.hat === 'bucket') add('Head', bucketHat(L, hc));
    if (o.hat === 'khandong') add('Head', khanDong(L, o.hatColor || o.topColor));
  }
}
// lớp đồ có sẵn bị ẩn / đổi chất liệu khi mặc đồ đi bar
export function barHidden(o) { return o && o.bar && !o.female && o.top && o.top !== 'jacket' ? ['Wolf3D_Outfit_Top'] : []; }
export function barLayers(o) {
  if (!o || !o.bar) return null;
  if (o.female) return { Wolf3D_Outfit_Top: [o.topColor, o.topFabric], Wolf3D_Outfit_Bottom: [o.legs, 'denim'], Wolf3D_Outfit_Footwear: ['#f5f5f2', 'matte'] };
  return { Wolf3D_Outfit_Top: o.jacket || [o.topColor, 'matte'], Wolf3D_Outfit_Bottom: o.bottom, Wolf3D_Outfit_Footwear: o.shoes };
}
export { plainMat };
