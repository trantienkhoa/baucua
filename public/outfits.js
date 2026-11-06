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
  const P = {}; for (const n of ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot', 'LeftToeBase']) if (idx(n) >= 0) P[n] = bpos(idx(n));
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
  t._fit = { main, names, idx, H, up, lat, fwd, L, footH, kneeH, hipHalf, radius, samples, unit: 1 / t.norm, cache: {} };
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
};
function buildSkirt(F, kind) {
  const S = SKIRTS[kind]; if (!S) return null;
  const { H, up, lat, fwd, L, footH, kneeH } = F;
  const top = 0.07 * L;
  const hem = S.hem === 'floor' ? footH - 0.07 * L : kneeH + (footH - kneeH) * 0.85;
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
    const wav = 1 + (S.tight ? 0.02 : 0.05) * Math.sin(a * 9) * tt;     // nếp vải
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
  for (let r = 0; r < RINGS; r++) for (let s = 0; s < SEG; s++) { const a = r * (SEG + 1) + s, b = a + SEG + 1; ind.push(a, b, a + 1, b, b + 1, a + 1); }
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
  const add = (bone, obj) => { const h = attach(bone, obj); if (h) av.outfitObjs.push(h); };
  // lưới may theo người: gắn vào khung xương của bản sao
  let skel = null;
  if (F) av.root.traverse(o => { if (!skel && o.isSkinnedMesh && o.name === F.main.name) skel = o.skeleton; });
  if (outfit.female && F && skel) {
    const key = (outfit.skirt || 'none');
    F.cache.bodice = F.cache.bodice || buildBodice(F);
    if (outfit.skirt) F.cache[key] = F.cache[key] || buildSkirt(F, outfit.skirt);
    const mat = garmentMat(outfit.color, outfit.fabric);
    for (const geo of [F.cache.bodice, outfit.skirt ? F.cache[key] : null]) {
      if (!geo) continue;
      const sm = new THREE.SkinnedMesh(geo, mat);
      sm.frustumCulled = false;
      sm.bind(skel, new THREE.Matrix4());
      av.root.add(sm); av.outfitObjs.push(sm);
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
  if (outfit.hat && t.rpm) add('Head', fedora(L, pick(['#111111', '#f3efe6', '#3a2a1a'])));
}
// màu / chất liệu cho các lớp đồ có sẵn của mô hình (Ready Player Me)
export function outfitLayers(outfit) {
  if (!outfit) return null;
  if (outfit.female) return { Wolf3D_Outfit_Top: [outfit.color, outfit.fabric], Wolf3D_Outfit_Bottom: [outfit.color, outfit.fabric], Wolf3D_Outfit_Footwear: ['#d4af37', 'metal'] };
  return { Wolf3D_Outfit_Top: outfit.top, Wolf3D_Outfit_Bottom: outfit.bottom, Wolf3D_Outfit_Footwear: outfit.shoes };
}
