// Phong cách trẻ trung: phụ kiện 3D gắn vào xương nhân vật (kính, mũ, dây chuyền vàng, đồng hồ, khuyên tai…).
// Toạ độ theo khung đứng nghỉ của xương: +Y lên, +Z trước mặt, mét. L = chiều dài đầu.
import * as THREE from 'three';
import { attachProp } from './costumes.js';

const PI = Math.PI, TAU = PI * 2;
const pick = a => a[Math.floor(Math.random() * a.length)];
const M = {};
const mat = (k, f) => M[k] || (M[k] = f());
const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o));
const gold = () => mat('gold', () => std(0xffc23a, { metalness: 1, roughness: 0.18, emissive: 0x3a2400, emissiveIntensity: 0.35 }));
const silver = () => mat('silver', () => std(0xdfe3ea, { metalness: 1, roughness: 0.2, emissive: 0x222222, emissiveIntensity: 0.3 }));
const col = c => mat('c' + c, () => std(c, { roughness: 0.7 }));
const lens = c => mat('lens' + c, () => new THREE.MeshStandardMaterial({ color: c, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.92 }));
const clear = () => mat('clear', () => new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false }));
const glow = c => mat('g' + c, () => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.3, toneMapped: false }));
const pearl = () => mat('pearl', () => std(0xfff8ee, { roughness: 0.25, metalness: 0.3, emissive: 0x332f28, emissiveIntensity: 0.3 }));
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.frustumCulled = false; return o; };

// ---------- đầu ----------
// số đo đầu thật của mô hình (khớp đầu nằm ngang hàm): mắt ~10 cm, đỉnh đầu ~23 cm phía trên khớp đầu
const H0 = { r: 0.1, hatR: 0.122, eye: 0.098, front: 0.122, crown: 0.285, earY: 0.072, earX: 0.085 };
const H = Object.assign({}, H0);   // mũ to hơn đầu: trùm được cả tóc phồng
function glasses(L, kind) {
  const g = new THREE.Group(), y = H.eye, z = H.front, dx = 0.033, R = H.r;
  const frame = kind === 'aviator' || kind === 'round' ? gold() : kind === 'heart' ? glow(0xff3d9a) : col(0x0d0d10);
  const lm = kind === 'round' ? clear() : kind === 'heart' ? lens(0xff2d7a) : kind === 'aviator' ? lens(0x3a2a10) : kind === 'sport' ? lens(0x2b6cff) : lens(0x050508);
  if (kind === 'sport') {   // kính thể thao một mảnh ôm mặt
    g.add(mesh(new THREE.CylinderGeometry(R * 1.04, R * 1.04, 0.04, 28, 1, true, -1.05, 2.1), lm, 0, y, 0.005));
    g.add(mesh(new THREE.CylinderGeometry(R * 1.05, R * 1.05, 0.007, 28, 1, true, -1.1, 2.2), col(0xffffff), 0, y + 0.022, 0.005));
    return g;
  }
  for (const sd of [-1, 1]) {
    let lg;
    if (kind === 'round') lg = new THREE.CircleGeometry(0.022, 24);
    else if (kind === 'heart') { const sh = new THREE.Shape(), r = 0.024; sh.moveTo(0, -r * 0.9); sh.bezierCurveTo(-r * 1.4, -0.1 * r, -r * 0.8, r * 1.1, 0, r * 0.45); sh.bezierCurveTo(r * 0.8, r * 1.1, r * 1.4, -0.1 * r, 0, -r * 0.9); lg = new THREE.ShapeGeometry(sh); }
    else if (kind === 'aviator') lg = new THREE.CircleGeometry(0.025, 24).scale(1.05, 0.9, 1).translate(0, -0.004, 0);
    else if (kind === 'cat') { const sh = new THREE.Shape(), w = 0.027, h = 0.017; sh.moveTo(-w, h * 0.1); sh.quadraticCurveTo(-w * 0.2, h * 0.9, w * 1.2, h * 1.25); sh.quadraticCurveTo(w * 0.9, -h, 0, -h); sh.quadraticCurveTo(-w, -h, -w, h * 0.1); lg = new THREE.ShapeGeometry(sh); if (sd < 0) lg.scale(-1, 1, 1); }
    else lg = new THREE.PlaneGeometry(0.05, 0.032);   // wayfarer
    const l = mesh(lg, lm, sd * dx, y, z + 0.006); l.rotation.y = sd * 0.15; g.add(l);
    if (kind === 'round' || kind === 'aviator') { const r = mesh(new THREE.TorusGeometry(kind === 'round' ? 0.022 : 0.025, 0.0022, 6, 28), frame, sd * dx, y, z + 0.007); r.rotation.y = sd * 0.15; g.add(r); }
    if (kind === 'wayfarer' || kind === 'cat') { const r = mesh(new THREE.BoxGeometry(0.054, 0.006, 0.006), frame, sd * dx, y + 0.017, z + 0.007); r.rotation.y = sd * 0.15; g.add(r); }
    const temple = mesh(new THREE.BoxGeometry(0.004, 0.005, z - 0.01), frame, sd * (R * 0.98), y + 0.008, z * 0.5); temple.rotation.y = sd * 0.1; g.add(temple);
  }
  g.add(mesh(new THREE.BoxGeometry(0.018, 0.004, 0.004), frame, 0, y + 0.006, z + 0.009));   // cầu mũi
  return g;
}
function cap(L, c, back) {
  const g = new THREE.Group(), R = H.hatR, y0 = H.crown - R * 0.8;
  g.add(mesh(new THREE.SphereGeometry(R, 24, 12, 0, TAU, 0, PI * 0.5).scale(1, 0.82, 1.05), col(c), 0, y0, -0.005));
  g.add(mesh(new THREE.TorusGeometry(R, 0.006, 6, 28).rotateX(PI / 2), col(c), 0, y0, -0.005));
  const brim = mesh(new THREE.CylinderGeometry(R * 0.82, R * 0.82, 0.008, 22, 1, false, -0.9, 1.8).scale(1, 1, 1.3), col(c), 0, y0 + 0.004, (back ? -1 : 1) * R * 0.62);
  brim.rotation.x = (back ? 1 : -1) * 0.1; if (back) brim.rotation.y = PI; g.add(brim);
  g.add(mesh(new THREE.SphereGeometry(0.009, 8, 6), col(c), 0, y0 + R * 0.82, -0.005));
  if (back) g.add(mesh(new THREE.TorusGeometry(R * 0.3, 0.005, 6, 16, PI).rotateZ(PI), col(0xffffff), 0, y0 + 0.03, R * 0.97));
  return g;
}
function bucket(L, c) { const g = new THREE.Group(), R = H.hatR; g.add(mesh(new THREE.CylinderGeometry(R * 0.85, R * 1.02, 0.09, 22), col(c), 0, H.crown - 0.04, -0.005)); g.add(mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.55, 0.035, 26, 1, true), col(c), 0, H.crown - 0.1, -0.005)); return g; }
function beanie(L, c) { const g = new THREE.Group(), R = H.hatR, y0 = H.crown - R * 0.95; g.add(mesh(new THREE.SphereGeometry(R, 22, 12, 0, TAU, 0, PI * 0.55).scale(1, 1.08, 1.05), col(c), 0, y0, -0.005)); g.add(mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.04, 0.035, 22, 1, true), col(c), 0, y0 + 0.005, -0.005)); return g; }
function beret(L, c) { const g = new THREE.Group(), R = H.hatR * 1.15; const b = mesh(new THREE.SphereGeometry(R, 22, 10).scale(1, 0.3, 1), col(c), -0.015, H.crown - 0.025, -0.01); b.rotation.z = 0.22; g.add(b); return g; }
function cowboy(L, c) {
  const g = new THREE.Group(), R = H.hatR * 0.95, y0 = H.crown - 0.06;
  g.add(mesh(new THREE.CylinderGeometry(R * 0.78, R * 0.98, 0.11, 20).scale(1, 1, 1.15), col(c), 0, y0 + 0.045, -0.005));
  g.add(mesh(new THREE.TorusGeometry(R * 1.45, R * 0.45, 4, 28).rotateX(PI / 2).scale(1, 0.1, 1.1), col(c), 0, y0 - 0.01, -0.005));
  g.add(mesh(new THREE.TorusGeometry(R * 0.98, 0.006, 6, 24).rotateX(PI / 2), gold(), 0, y0 + 0.002, -0.005));
  return g;
}
function headband(L, c) { const R = H.hatR * 0.95; return mesh(new THREE.CylinderGeometry(R, R, 0.028, 26, 1, true), col(c), 0, H.crown - 0.07, -0.004); }
function bandana(L, c) { const g = new THREE.Group(), R = H.hatR, y0 = H.crown - R * 0.82; g.add(mesh(new THREE.SphereGeometry(R, 22, 10, 0, TAU, 0, PI * 0.5).scale(1, 0.82, 1.05), col(c), 0, y0, -0.005)); g.add(mesh(new THREE.ConeGeometry(0.02, 0.07, 4).rotateX(PI / 2 + 0.6), col(c), 0, y0 - 0.01, -R * 1.02)); return g; }
function headphones(L, c) {
  const g = new THREE.Group(), R = H.hatR * 0.98;
  g.add(mesh(new THREE.TorusGeometry(R, 0.008, 8, 28, PI).rotateY(PI / 2), col(c), 0, H.earY + 0.005, 0));
  for (const sd of [-1, 1]) { g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.022, 18).rotateZ(PI / 2), col(c), sd * R, H.earY, 0)); g.add(mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.003, 18).rotateZ(PI / 2), glow(0x3dd9ff), sd * (R + 0.012), H.earY, 0)); }
  return g;
}
function earrings(L, kind) {
  const g = new THREE.Group();
  for (const sd of [-1, 1]) {
    if (kind === 'hoop') g.add(mesh(new THREE.TorusGeometry(0.016, 0.0022, 6, 20).rotateY(PI / 2), gold(), sd * H.earX, H.earY - 0.035, -0.004));
    else if (kind === 'pearl') g.add(mesh(new THREE.SphereGeometry(0.0055, 10, 8), pearl(), sd * H.earX, H.earY - 0.02, 0));
    else g.add(mesh(new THREE.OctahedronGeometry(0.005), silver(), sd * H.earX, H.earY - 0.02, 0));
  }
  return g;
}
// ---------- ngực (xương Spine2: cổ ở khoảng y 0.2) ----------
function chain(m, len = 0, thick = 0.008, n = 40) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, f = Math.max(0, Math.cos(a)); pts.push(new THREE.Vector3(Math.sin(a) * 0.075, 0.15 - f * f * (0.045 + len), Math.cos(a) * 0.07 + f * f * 0.06)); }
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 80, thick, 6, true), m);
}
function chainSet(kind) {
  const g = new THREE.Group();
  if (kind === 'cuban') { g.add(chain(gold(), 0.02, 0.009)); }
  if (kind === 'stack') { g.add(chain(gold(), 0.0, 0.005)); g.add(chain(gold(), 0.035, 0.006)); g.add(chain(gold(), 0.07, 0.008)); }
  if (kind === 'medal') { g.add(chain(gold(), 0.07, 0.005)); g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.005, 24).rotateX(PI / 2 - 0.25), gold(), 0, 0.033, 0.135)); g.add(mesh(new THREE.OctahedronGeometry(0.008), glow(0xffffff), 0, 0.033, 0.14)); }
  if (kind === 'silver') { g.add(chain(silver(), 0.01, 0.005)); g.add(chain(silver(), 0.06, 0.004)); }
  if (kind === 'pearl') { const n = 26; for (let i = 0; i < n; i++) { const a = i / n * TAU, f = Math.max(0, Math.cos(a)); g.add(mesh(new THREE.SphereGeometry(0.007, 10, 8), pearl(), Math.sin(a) * 0.075, 0.15 - f * f * 0.045, Math.cos(a) * 0.07 + f * f * 0.06)); } }
  if (kind === 'choker') g.add(mesh(new THREE.TorusGeometry(0.058, 0.007, 8, 28).rotateX(PI / 2 - 0.15), col(0x111111), 0, 0.195, 0.012));
  return g;
}
function sling(c) {   // túi đeo chéo
  const g = new THREE.Group();
  const strap = mesh(new THREE.TorusGeometry(0.22, 0.012, 4, 30, PI * 1.1).scale(1, 1.2, 0.75), col(0x111111), 0, 0.0, 0.02); strap.rotation.z = 0.75; g.add(strap);
  g.add(mesh(new THREE.BoxGeometry(0.2, 0.09, 0.06), col(c), 0.07, -0.08, 0.15));
  return g;
}
// ---------- cổ tay ----------
function watch(m) { const g = new THREE.Group(); g.add(mesh(new THREE.TorusGeometry(0.034, 0.008, 6, 20).rotateY(PI / 2), m, 0, 0, 0)); g.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.008, 18), m, 0, 0.038, 0)); g.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.009, 18), glow(0x8fe8ff), 0, 0.039, 0)); return g; }
function bangles(m, n = 3) { const g = new THREE.Group(); for (let i = 0; i < n; i++) g.add(mesh(new THREE.TorusGeometry(0.036, 0.0045, 6, 20).rotateY(PI / 2), m, (i - (n - 1) / 2) * 0.012, 0, 0)); return g; }
function wristband(c) { return mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.05, 16, 1, true).rotateZ(PI / 2), col(c), 0, 0, 0); }

// ---------- danh sách phong cách ----------
const CAPC = [0x111111, 0xffffff, 0xd6262f, 0x1e3a8a, 0xffc928, 0x2e8b3a, 0xff7ab8];
export const STYLES = [
  { id: 'hiphop', name: 'Hip-hop', g: 'mf', build: (a, L) => { a('Head', cap(L, pick(CAPC), true)); a('Head', glasses(L, 'wayfarer')); a('Spine2', chainSet('cuban')); a('Spine2', chainSet('medal')); a('RightHand', watch(gold())); } },
  { id: 'daigia', name: 'Đại gia', g: 'mf', build: (a, L) => { a('Head', glasses(L, 'aviator')); a('Spine2', chainSet('stack')); a('RightHand', watch(gold())); a('LeftHand', bangles(gold(), 3)); a('Head', earrings(L, 'stud')); } },
  { id: 'street', name: 'Đường phố', g: 'mf', build: (a, L) => { a('Head', bucket(L, pick([0x111111, 0xeee6cf, 0x2e8b3a, 0xff7ab8, 0x1e3a8a]))); a('Head', glasses(L, 'round')); a('Spine2', sling(pick([0x111111, 0xd6262f, 0x2b6cff]))); a('LeftHand', wristband(0xffffff)); } },
  { id: 'sporty', name: 'Thể thao', g: 'mf', build: (a, L) => { a('Head', headband(L, pick([0xffffff, 0xd6262f, 0x111111, 0x2b6cff]))); a('Head', glasses(L, 'sport')); a('RightHand', wristband(pick([0xd6262f, 0x111111]))); a('LeftHand', wristband(0xffffff)); } },
  { id: 'kpop', name: 'K-pop', g: 'mf', build: (a, L) => { a('Head', pick([beret, beanie])(L, pick([0x111111, 0xeee6cf, 0xb3122d, 0x7c3aed]))); a('Head', glasses(L, 'round')); a('Head', earrings(L, 'stud')); a('Spine2', chainSet('silver')); } },
  { id: 'rocker', name: 'Rocker', g: 'mf', build: (a, L) => { a('Head', bandana(L, pick([0xb3122d, 0x111111]))); a('Head', glasses(L, 'aviator')); a('Spine2', chainSet('silver')); a('LeftHand', bangles(silver(), 2)); } },
  { id: 'cowboy', name: 'Cao bồi', g: 'mf', build: (a, L) => { a('Head', cowboy(L, pick([0x6b4423, 0x111111, 0xeee6cf]))); a('Head', glasses(L, 'aviator')); a('RightHand', watch(silver())); } },
  { id: 'dj', name: 'DJ', g: 'mf', build: (a, L) => { a('Head', cap(L, pick(CAPC), false)); a('Head', headphones(L, pick([0x111111, 0xffffff, 0xff3d9a]))); a('Spine2', chainSet('cuban')); } },
  { id: 'tieuthu', name: 'Tiểu thư', g: 'f', build: (a, L) => { a('Head', glasses(L, 'cat')); a('Spine2', chainSet('pearl')); a('Head', earrings(L, 'pearl')); a('LeftHand', bangles(gold(), 2)); } },
  { id: 'y2k', name: 'Y2K', g: 'f', build: (a, L) => { a('Head', glasses(L, 'heart')); a('Spine2', chainSet('choker')); a('Head', earrings(L, 'hoop')); a('LeftHand', bangles(silver(), 3)); } },
  { id: 'gaivang', name: 'Sang chảnh', g: 'f', build: (a, L) => { a('Head', glasses(L, 'cat')); a('Head', earrings(L, 'hoop')); a('Spine2', chainSet('stack')); a('RightHand', watch(gold())); a('LeftHand', bangles(gold(), 3)); } },
  { id: 'toigian', name: 'Tối giản', g: 'mf', build: (a, L) => { a('Head', earrings(L, 'stud')); a('RightHand', watch(silver())); } },
];
export const STYLE_KEYS = [['hip hop', 'hiphop'], ['hiphop', 'hiphop'], ['dai gia', 'daigia'], ['dan choi', 'daigia'], ['deo vang', 'daigia'], ['duong pho', 'street'], ['street', 'street'],
  ['the thao', 'sporty'], ['sporty', 'sporty'], ['kpop', 'kpop'], ['k pop', 'kpop'], ['rocker', 'rocker'], ['rock', 'rocker'], ['cao boi', 'cowboy'], ['cowboy', 'cowboy'], ['dj', 'dj'],
  ['tieu thu', 'tieuthu'], ['y2k', 'y2k'], ['sang chanh', 'gaivang'], ['toi gian', 'toigian'], ['kinh den', 'daigia'], ['mu nguoc', 'hiphop']];
export function randomStyleId(female) { const list = STYLES.filter(s => s.g === 'mf' || (female && s.g === 'f')); return pick(list).id; }
export function styleName(id) { const s = STYLES.find(x => x.id === id); return s ? s.name : ''; }

export function applyStyle(av, id) {
  if (av.styleObjs) for (const o of av.styleObjs) { o.parent && o.parent.remove(o); o.traverse(x => { if (x.geometry) x.geometry.dispose(); }); }
  av.styleObjs = []; av.styleId = null;
  const s = id && STYLES.find(x => x.id === id); if (!s) return;
  av.styleId = id;
  // số đo đầu: nhân vật gắn xương tự động có số đo riêng; còn lại dùng số đo nhân vật MakeHuman
  Object.assign(H, H0);
  const hm = av.t.headM;
  if (hm) { const k = av.t.norm || 1; Object.assign(H, { eye: hm.eye * k, front: hm.front * k + 0.006, r: hm.r * k * 1.02, crown: hm.crown * k + 0.012, earY: hm.earY * k, earX: hm.earX * k + 0.004, hatR: Math.max(hm.r * k * 1.18, 0.1) }); }   // đổi sang đơn vị đã chuẩn hoá của game
  if (window._styleH) Object.assign(H, window._styleH);   // chỉ dùng khi thử nghiệm
  const a = (bone, obj) => { const h = attachProp(av, bone, obj); if (h) av.styleObjs.push(h); };
  s.build(a, av.t.headLen);
}
