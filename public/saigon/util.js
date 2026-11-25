import { THREE } from './three.js';

// ---------- số ngẫu nhiên có hạt giống (thành phố giống nhau mỗi lần mở) ----------
export function rng(seed) {
  let a = seed >>> 0;
  const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  r.range = (lo, hi) => lo + r() * (hi - lo);
  r.int = (lo, hi) => Math.floor(lo + r() * (hi - lo + 1));
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.chance = p => r() < p;
  return r;
}
export const R = rng(Date.now() & 0xffff);   // ngẫu nhiên thường (hiệu ứng)

// ---------- nội suy / làm mượt ----------
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = {
  inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  smooth: t => t * t * (3 - 2 * t),
};
// tiến dần về đích theo thời gian, không phụ thuộc FPS
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));

// ---------- gộp nhiều khối thành 1 lưới (ít lệnh vẽ → máy yếu vẫn mượt) ----------
export class GeoBuilder {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.col = []; }
  add(geo, matrix, color) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(matrix);
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    const u = g.attributes.uv ? g.attributes.uv.array : null;
    const c = color instanceof THREE.Color ? color : new THREE.Color(color ?? 0xffffff);
    for (let i = 0; i < p.length / 3; i++) {
      this.pos.push(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
      this.nor.push(n[i * 3], n[i * 3 + 1], n[i * 3 + 2]);
      if (u) this.uv.push(u[i * 2], u[i * 2 + 1]); else this.uv.push(0, 0);
      this.col.push(c.r, c.g, c.b);
    }
    g.dispose(); if (geo !== g && geo._tmp) geo.dispose();
    return this;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    return g;
  }
  get empty() { return this.pos.length === 0; }
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
export function mat(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
  return _m.clone().compose(_p, _q, _s);
}

// khối nhà có UV theo kích thước thật → cửa sổ không bị kéo giãn
export function buildingBox(w, h, d, unit = 54) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      if (f === 2 || f === 3) { uv.setXY(i, 0.004, 0.004); continue; }   // mái: màu tường
      const span = (f < 2 ? d : w) / unit;
      uv.setXY(i, uv.getX(i) * span, uv.getY(i) * h / unit);
    }
  }
  return g;
}

// ---------- hoạ tiết vẽ bằng canvas ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// tường + cửa sổ (sáng / tắt ngẫu nhiên). style: office | home | old | glass
export function windowTexture(style, seed) {
  const r = rng(seed), c = canvas(256, 256), x = c.getContext('2d');
  const wall = { office: '#1a2030', home: '#2a2224', old: '#30261e', glass: '#0e1a2a' }[style] || '#1a2030';
  x.fillStyle = wall; x.fillRect(0, 0, 256, 256);
  const lit = { office: ['#ffe9a8', '#cfe8ff', '#fff6d8'], home: ['#ffcf7a', '#ffb35c', '#ffe2a0'], old: ['#ffb347', '#ff9a3c', '#ffd27a'], glass: ['#6cc4ee', '#a6e0ff', '#e4f6ff'] }[style];
  const dark = { office: '#2b3447', home: '#3a3034', old: '#3d3128', glass: '#183450' }[style];
  const cols = style === 'glass' ? 8 : 8, rows = 8, cw = 256 / cols, ch = 256 / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const on = r() < (style === 'glass' ? 0.42 : 0.36);
    x.fillStyle = on ? r.pick(lit) : dark;
    if (style === 'glass') x.fillRect(i * cw + 2, j * ch + 3, cw - 3, ch - 5);
    else if (style === 'old') { x.fillRect(i * cw + 8, j * ch + 7, cw - 16, ch - 12); x.fillStyle = '#5a3a24'; x.fillRect(i * cw + 6, j * ch + ch - 6, cw - 12, 3); }
    else x.fillRect(i * cw + 6, j * ch + 6, cw - 12, ch - 11);
  }
  x.fillStyle = wall; x.fillRect(0, 252, 6, 4);   // góc dưới trái = màu tường (dùng cho mái)
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// bảng hiệu neon chữ Việt
export function neonTexture(text, color, opts = {}) {
  const fs = opts.size || 64, font = `900 ${fs}px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif`;
  const c0 = canvas(8, 8).getContext('2d'); c0.font = font;
  const w = Math.ceil(c0.measureText(text).width + fs * 1.2), h = Math.ceil(fs * 1.9);
  const c = canvas(w, h), x = c.getContext('2d');
  if (opts.plate) { x.fillStyle = opts.plate; roundRect(x, 4, 4, w - 8, h - 8, 14); x.fill(); }
  x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = color; x.shadowBlur = fs * 0.35;
  x.strokeStyle = color; x.lineWidth = fs * 0.12; x.strokeText(text, w / 2, h / 2);
  x.shadowBlur = fs * 0.2; x.fillStyle = '#ffffff'; x.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.userData = { aspect: w / h };
  return t;
}
export function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

let _glow;
export function glowTexture() {
  if (_glow) return _glow;
  const c = canvas(128, 128), x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  _glow = new THREE.CanvasTexture(c); return _glow;
}
export function glowSprite(color, size, opacity = 1) {
  const m = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const s = new THREE.Sprite(m); s.scale.set(size, size, 1); return s;
}
let _blob;
export function shadowTexture() {
  if (_blob) return _blob;
  const c = canvas(64, 64), x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  _blob = new THREE.CanvasTexture(c); return _blob;
}
let _cash;
export function cashTexture() {
  if (_cash) return _cash;
  const c = canvas(128, 64), x = c.getContext('2d');
  x.fillStyle = '#3fae5a'; roundRect(x, 2, 2, 124, 60, 8); x.fill();
  x.strokeStyle = '#c9f7c9'; x.lineWidth = 4; roundRect(x, 8, 8, 112, 48, 6); x.stroke();
  x.fillStyle = '#eaffea'; x.font = '900 34px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('₫', 64, 34);
  _cash = new THREE.CanvasTexture(c); _cash.colorSpace = THREE.SRGBColorSpace; return _cash;
}
let _cloud;
export function cloudTexture() {
  if (_cloud) return _cloud;
  const c = canvas(256, 128), x = c.getContext('2d'), r = rng(7);
  for (let i = 0; i < 26; i++) {
    const cx = r.range(50, 206), cy = r.range(50, 88), rad = r.range(18, 40);
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill();
  }
  _cloud = new THREE.CanvasTexture(c); return _cloud;
}

// ---------- đường đi khép kín (xe chạy vòng) ----------
export class Loop {
  constructor(points) {   // points: [[x,z],...] đã bo góc
    this.p = points; this.len = []; let L = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      this.len.push(L); L += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    this.total = L;
  }
  // vị trí + hướng tại quãng đường s, lệch làn `off` sang phải
  at(s, off = 0, out = {}) {
    s = ((s % this.total) + this.total) % this.total;
    let lo = 0, hi = this.len.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (this.len[mid] <= s) lo = mid; else hi = mid - 1; }
    const a = this.p[lo], b = this.p[(lo + 1) % this.p.length];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = (s - this.len[lo]) / seg;
    const dx = (b[0] - a[0]) / seg, dz = (b[1] - a[1]) / seg;
    out.x = a[0] + (b[0] - a[0]) * t - dz * off; out.z = a[1] + (b[1] - a[1]) * t + dx * off;
    out.dx = dx; out.dz = dz; out.yaw = Math.atan2(dx, dz);
    return out;
  }
}
// hình chữ nhật bo góc → danh sách điểm
export function roundedRect(cx, cz, w, h, r, seg = 5) {
  const pts = [], hw = w / 2, hh = h / 2;
  const corners = [[cx + hw - r, cz - hh + r, -Math.PI / 2], [cx + hw - r, cz + hh - r, 0], [cx - hw + r, cz + hh - r, Math.PI / 2], [cx - hw + r, cz - hh + r, Math.PI]];
  for (const [x, z, a0] of corners) for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * Math.PI / 2; pts.push([x + Math.cos(a) * r, z + Math.sin(a) * r]); }
  return pts;
}
// đường cong khép kín qua các điểm (Catmull-Rom)
export function smoothLoop(ctrl, perSeg = 10) {
  const pts = [], n = ctrl.length;
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return pts;
}
// dải đường nhựa theo một đường khép kín
export function ribbon(points, width, y = 0.05, closed = true) {
  const pos = [], uv = [], n = points.length, hw = width / 2; let dist = 0;
  const cnt = closed ? n + 1 : n;
  for (let i = 0; i < cnt; i++) {
    const p = points[i % n], pPrev = points[(i - 1 + n) % n], pNext = points[(i + 1) % n];
    const a = closed || i > 0 ? pPrev : p, b = closed || i < n - 1 ? pNext : p;
    let dx = b[0] - a[0], dz = b[1] - a[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    if (i > 0) { const q = points[(i - 1) % n]; dist += Math.hypot(p[0] - q[0], p[1] - q[1]); }
    pos.push(p[0] + dz * hw, y, p[1] - dx * hw, p[0] - dz * hw, y, p[1] + dx * hw);
    uv.push(0, dist / width, 1, dist / width);
  }
  const idx = [];
  for (let i = 0; i < cnt - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
let _road;
export function roadTexture() {
  if (_road) return _road;
  const c = canvas(64, 128), x = c.getContext('2d');
  x.fillStyle = '#2b2d33'; x.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; x.fillRect(Math.random() * 64, Math.random() * 128, 1, 1); }
  x.fillStyle = '#d9d9d9'; x.fillRect(2, 0, 2, 128); x.fillRect(60, 0, 2, 128);
  x.fillStyle = '#f2c94c'; x.fillRect(30, 0, 4, 64);
  _road = new THREE.CanvasTexture(c); _road.wrapS = _road.wrapT = THREE.RepeatWrapping; _road.colorSpace = THREE.SRGBColorSpace; _road.anisotropy = 8;
  return _road;
}

// ảnh đại diện: ảnh TikTok qua máy chủ (nếu có) hoặc chữ cái đầu
export function initials(name) {
  const w = String(name || '?').trim().split(/\s+/);
  return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
}
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function fmt(n) { n = Math.round(n); return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : n.toLocaleString('vi-VN'); }
