// Nhân vật đô vật 3D dựng bằng code: một SkinnedMesh duy nhất (thân, tay, chân, tóc, giày…) bám bộ xương 17 xương,
// đầu là lưới riêng có ảnh khuôn mặt vẽ bằng canvas (mắt, râu, sơn mặt, mặt nạ luchador).
// Quy ước trục: nhân vật nhìn về +Z, Y hướng lên, +X là bên TRÁI của nhân vật.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const BONE_NAMES = ['hips', 'spine', 'chest', 'neck', 'head', 'lArm', 'lFore', 'lHand', 'rArm', 'rFore', 'rHand', 'lThigh', 'lShin', 'lFoot', 'rThigh', 'rShin', 'rFoot'];
const BI = Object.fromEntries(BONE_NAMES.map((n, i) => [n, i]));
const PARENT = { spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', lArm: 'chest', lFore: 'lArm', lHand: 'lFore', rArm: 'chest', rFore: 'rArm', rHand: 'rFore', lThigh: 'hips', lShin: 'lThigh', lFoot: 'lShin', rThigh: 'hips', rShin: 'rThigh', rFoot: 'rShin' };

// kích thước chuẩn (người cao 1,95 m); chiều cao thật = scale của root
export const HIPS_Y = 1.0;
const J = {
  spine: 0.13, chest: 0.33, neck: 0.62, head: 0.71,
  shoulderY: 0.57, upper: 0.30, fore: 0.27, hand: 0.17,
  hipX: 0.1, thigh: 0.47, shin: 0.45,
};

const TAU = Math.PI * 2;
const col = c => new THREE.Color(c);
const mix = (a, b, t) => a.clone().lerp(b, t);
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// ---------- bộ dựng hình ----------
class Builder {
  constructor() { this.geos = []; }
  // geo ở toạ độ tư thế gốc (bind); weightFn(x,y,z) -> [[bone,w],[bone,w]]; colorFn(x,y,z,ang) -> THREE.Color
  add(geo, weightFn, colorFn) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const p = geo.attributes.position, n = p.count;
    const colors = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    const fixed = typeof colorFn !== 'function' ? col(colorFn) : null;
    for (let i = 0; i < n; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const c = fixed || colorFn(x, y, z);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      const w = typeof weightFn === 'number' ? [[weightFn, 1]] : weightFn(x, y, z);
      si[i * 4] = w[0][0]; sw[i * 4] = w[0][1];
      if (w[1]) { si[i * 4 + 1] = w[1][0]; sw[i * 4 + 1] = w[1][1]; }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    this.geos.push(geo);
  }
  build() { const g = mergeGeometries(this.geos, false); this.geos.forEach(x => x.dispose()); return g; }
}

// trọng số theo chuỗi xương đứng dọc: chain = [[bone, yTop], ...] từ trên xuống
function chainW(chain, zone) {
  return (x, y) => {
    let k = 0;
    while (k < chain.length - 1 && y < chain[k + 1][1]) k++;
    // gần khớp dưới
    if (k < chain.length - 1) {
      const Jy = chain[k + 1][1];
      if (y < Jy + zone) { const t = smooth(Jy + zone, Jy - zone, y); return [[chain[k][0], 1 - t], [chain[k + 1][0], t]]; }
    }
    if (k > 0) {
      const Jy = chain[k][1];
      if (y > Jy - zone) { const t = smooth(Jy - zone, Jy + zone, y); return [[chain[k][0], 1 - t], [chain[k - 1][0], t]]; }
    }
    return [[chain[k][0], 1]];
  };
}

// khối tiện (lathe) dọc trục Y: prof = [[r, y], ...] y giảm dần; sx/sz co mặt cắt thành elip
function lathe(prof, sx = 1, sz = 1, seg = 18, cx = 0, cz = 0, ps = 0, pl = TAU) {
  const pts = prof.slice().reverse().map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y));
  const g = new THREE.LatheGeometry(pts, seg, ps, pl);
  g.scale(sx, 1, sz); g.translate(cx, 0, cz);
  return g;
}
function ellip(rx, ry, rz, x, y, z, ws = 14, hs = 10) {
  const g = new THREE.SphereGeometry(1, ws, hs); g.scale(rx, ry, rz); g.translate(x, y, z); return g;
}
function boxR(w, h, d, x, y, z) { const g = new THREE.CapsuleGeometry(Math.min(w, d) / 2, Math.max(0.001, h - Math.min(w, d)), 4, 10); g.scale(w / Math.min(w, d), 1, d / Math.min(w, d)); g.translate(x, y, z); return g; }

// ---------- khuôn mặt (canvas) ----------
function faceTexture(d) {
  const W = 512, H = 256;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const skin = d.skin;
  g.fillStyle = skin; g.fillRect(0, 0, W, H);
  const cx = W * 0.25;   // giữa mặt (u = 0.25 hướng +Z)
  const eyeY = H * 0.47;
  const shade = (c, k) => { const x = col(c); x.multiplyScalar(k); return '#' + x.getHexString(); };
  // tóc ngắn / cạo sát vẽ thẳng lên da đầu
  if (d.hair !== 'bald' && d.hair !== 'none' && !d.mask) {
    g.fillStyle = d.hairColor;
    const low = d.hair === 'buzz' ? H * 0.30 : H * 0.36;
    g.fillRect(0, 0, W, low);
    // chân tóc trán
    g.beginPath(); g.moveTo(cx - 70, low); g.quadraticCurveTo(cx, low - 22, cx + 70, low); g.lineTo(cx + 70, low - 2); g.lineTo(cx - 70, low - 2); g.fill();
    g.fillStyle = skin; g.beginPath(); g.ellipse(cx, low + 4, 52, 16, 0, Math.PI, TAU); g.fill();
    // tóc mai + gáy
    g.fillStyle = d.hairColor; g.fillRect(cx - 98, low - 4, 14, 40); g.fillRect(cx + 84, low - 4, 14, 40);
    g.fillRect(cx + 120, 0, 2 * W * 0.25 - 40, H * 0.55);
  } else if (d.hair === 'bald' && !d.mask) {
    // đầu trọc bóng
    const gr = g.createRadialGradient(cx, H * 0.12, 4, cx, H * 0.12, 120); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.4);
  }
  // sơn mặt
  if (d.paint && !d.mask) {
    g.save(); g.globalAlpha = 0.92;
    if (d.paint === 'skull') {
      g.fillStyle = '#f2f2ee'; g.beginPath(); g.ellipse(cx, H * 0.5, 66, 70, 0, 0, TAU); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.ellipse(cx - 26, eyeY, 20, 17, 0, 0, TAU); g.ellipse(cx + 26, eyeY, 20, 17, 0, 0, TAU); g.fill();
      g.fillRect(cx - 34, H * 0.66, 68, 4); for (let i = -3; i <= 3; i++) g.fillRect(cx + i * 10 - 1, H * 0.62, 2, 14);
    } else if (d.paint === 'warrior') {
      g.fillStyle = d.paintColor || '#c81d25';
      g.fillRect(cx - 70, eyeY - 12, 140, 22);
      g.fillStyle = '#111'; g.fillRect(cx - 70, eyeY + 10, 140, 4);
    } else if (d.paint === 'half') {
      g.fillStyle = '#111'; g.beginPath(); g.moveTo(cx, H * 0.2); g.lineTo(cx + 80, H * 0.2); g.lineTo(cx + 80, H * 0.8); g.lineTo(cx, H * 0.8); g.fill();
      g.fillStyle = d.paintColor || '#e8e8e8'; g.fillRect(cx + 8, eyeY - 2, 60, 4);
    } else if (d.paint === 'stripes') {
      g.fillStyle = d.paintColor || '#1e90ff';
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) g.fillRect(cx + s * 36 - 14, eyeY + 14 + i * 9, 28, 4);
    }
    g.restore();
  }
  // mặt nạ luchador
  if (d.mask) {
    const m = d.mask;
    g.fillStyle = m.base; g.fillRect(0, 0, W, H * 0.86);
    g.fillStyle = m.trim;
    // hoạ tiết lửa / đường viền trán
    g.beginPath(); g.moveTo(cx - 90, H * 0.36);
    for (let i = 0; i <= 6; i++) g.lineTo(cx - 90 + i * 30, H * (i % 2 ? 0.16 : 0.34));
    g.lineTo(cx + 90, H * 0.4); g.lineTo(cx - 90, H * 0.4); g.fill();
    g.fillRect(cx - 4, H * 0.08, 8, H * 0.3);
    // viền mắt
    for (const s of [-1, 1]) {
      g.fillStyle = m.trim; g.beginPath(); g.ellipse(cx + s * 28, eyeY, 30, 20, s * -0.35, 0, TAU); g.fill();
      g.fillStyle = skin; g.beginPath(); g.ellipse(cx + s * 27, eyeY + 1, 19, 12, s * -0.3, 0, TAU); g.fill();
    }
    // miệng hở
    g.fillStyle = m.trim; g.beginPath(); g.ellipse(cx, H * 0.72, 32, 20, 0, 0, TAU); g.fill();
    g.fillStyle = skin; g.beginPath(); g.ellipse(cx, H * 0.72, 24, 14, 0, 0, TAU); g.fill();
    // dây buộc sau gáy
    g.fillStyle = m.trim; g.fillRect(cx + 2 * W * 0.25 - 6, H * 0.2, 12, H * 0.5);
  }
  // lông mày
  g.fillStyle = d.mask ? '#2a1d14' : shade(d.hairColor === '#e8e0c8' ? '#8a6a3a' : d.hairColor, 0.9);
  for (const s of [-1, 1]) {
    g.save(); g.translate(cx + s * 27, eyeY - 21); g.rotate(s * (d.angry ? 0.28 : 0.1));
    g.fillRect(-19, -4, 38, 8); g.restore();
  }
  // mắt
  for (const s of [-1, 1]) {
    g.fillStyle = '#f4f1ea'; g.beginPath(); g.ellipse(cx + s * 27, eyeY, 13, 7.5, 0, 0, TAU); g.fill();
    g.fillStyle = d.eye || '#3a2616'; g.beginPath(); g.arc(cx + s * 27 - s * 1.5, eyeY, 5.5, 0, TAU); g.fill();
    g.fillStyle = '#0a0a0a'; g.beginPath(); g.arc(cx + s * 27 - s * 1.5, eyeY, 2.6, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(cx + s * 27, eyeY - 2, 1.6, 0, TAU); g.fill();
    g.strokeStyle = shade(skin, 0.55); g.lineWidth = 2.5; g.beginPath(); g.ellipse(cx + s * 27, eyeY - 1, 14, 8, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  }
  if (!d.mask || true) {
    // mũi + bóng
    g.fillStyle = shade(skin, 0.78);
    g.beginPath(); g.moveTo(cx - 3, eyeY + 4); g.lineTo(cx - 12, eyeY + 36); g.quadraticCurveTo(cx, eyeY + 42, cx + 12, eyeY + 36); g.lineTo(cx + 3, eyeY + 4); g.fill();
    // miệng
    g.strokeStyle = '#5a2a22'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath();
    if (d.angry) { g.moveTo(cx - 18, H * 0.725); g.quadraticCurveTo(cx, H * 0.70, cx + 18, H * 0.725); }
    else { g.moveTo(cx - 18, H * 0.715); g.quadraticCurveTo(cx, H * 0.735, cx + 18, H * 0.715); }
    g.stroke();
  }
  // râu
  if (d.beard && !d.mask) {
    g.fillStyle = d.beardColor || d.hairColor;
    if (d.beard === 'full') {
      g.beginPath(); g.moveTo(cx - 70, H * 0.5); g.quadraticCurveTo(cx - 64, H * 0.95, cx, H * 0.98); g.quadraticCurveTo(cx + 64, H * 0.95, cx + 70, H * 0.5);
      g.lineTo(cx + 54, H * 0.58); g.quadraticCurveTo(cx, H * 0.64, cx - 54, H * 0.58); g.fill();
      g.fillStyle = '#5a2a22'; g.fillRect(cx - 16, H * 0.715, 32, 5);
    } else if (d.beard === 'goatee') {
      g.beginPath(); g.ellipse(cx, H * 0.80, 20, 22, 0, 0, TAU); g.fill();
      g.fillRect(cx - 24, H * 0.68, 48, 7);
      g.fillStyle = '#5a2a22'; g.fillRect(cx - 14, H * 0.718, 28, 4);
    } else if (d.beard === 'stubble') {
      g.globalAlpha = 0.35; g.beginPath(); g.moveTo(cx - 66, H * 0.52); g.quadraticCurveTo(cx - 60, H * 0.93, cx, H * 0.95); g.quadraticCurveTo(cx + 60, H * 0.93, cx + 66, H * 0.52); g.lineTo(cx + 50, H * 0.62); g.lineTo(cx - 50, H * 0.62); g.fill(); g.globalAlpha = 1;
    } else if (d.beard === 'mustache') {
      g.beginPath(); g.ellipse(cx - 13, H * 0.69, 16, 6, 0.2, 0, TAU); g.ellipse(cx + 13, H * 0.69, 16, 6, -0.2, 0, TAU); g.fill();
    }
  }
  // tai (hai bên)
  g.fillStyle = shade(skin, 0.85);
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 128, eyeY + 6, 10, 18, 0, 0, TAU); g.fill(); }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

// ---------- vật liệu dùng chung ----------
const BODY_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.48, metalness: 0.06 });
const COAT_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.25, side: THREE.DoubleSide });
export function bodyMaterial() { return BODY_MAT; }

// ---------- dựng một đô vật ----------
// d: định nghĩa trong roster (xem roster.js)
export function createWrestler(d) {
  const B = d.bulk || 1;          // độ vạm vỡ ngang
  const G = d.gut || 0;           // bụng bia (0..1)
  const skin = col(d.skin);
  const skinDark = mix(skin, col('#000'), 0.18);
  const att = col(d.attire || '#c81d25');
  const att2 = col(d.attire2 || '#111111');
  const bootC = col(d.boots || d.attire2 || '#111111');
  const padC = col(d.pads || d.attire || '#222');
  const hairC = col(d.hairColor || '#1a1410');
  const tatC = col('#1b2530');
  const white = col('#f0eee8');
  const kind = d.kind || 'wrestler';    // wrestler | referee | suit
  const outfit = d.outfit || 'trunks';  // trunks | tights | singlet | shorts | tank | jeans
  const F = !!d.female;                 // đô vật nữ: vai hẹp, eo thon, áo hai mảnh
  const top = d.top || (F ? 'crop' : '');   // crop | vest | tank

  const shoulderX = F ? 0.175 * B + 0.015 : 0.215 * B + 0.02;
  const hipsY = HIPS_Y;
  // vị trí khớp (bind)
  const Y = {
    spine: hipsY + J.spine, chest: hipsY + J.chest, neck: hipsY + J.neck, head: hipsY + J.head,
    sh: hipsY + J.shoulderY,
  };
  Y.elbow = Y.sh - J.upper; Y.wrist = Y.elbow - J.fore;
  Y.knee = hipsY - 0.04 - J.thigh; Y.ankle = Y.knee - J.shin;

  // ---- bộ xương ----
  const bones = {};
  const bpos = {
    hips: [0, hipsY, 0], spine: [0, J.spine, 0], chest: [0, J.chest - J.spine, 0], neck: [0, J.neck - J.chest, 0], head: [0, J.head - J.neck, 0],
    lArm: [shoulderX, J.shoulderY - J.chest, 0], lFore: [0, -J.upper, 0], lHand: [0, -J.fore, 0],
    rArm: [-shoulderX, J.shoulderY - J.chest, 0], rFore: [0, -J.upper, 0], rHand: [0, -J.fore, 0],
    lThigh: [J.hipX * B, -0.04, 0], lShin: [0, -J.thigh, 0], lFoot: [0, -J.shin, 0],
    rThigh: [-J.hipX * B, -0.04, 0], rShin: [0, -J.thigh, 0], rFoot: [0, -J.shin, 0],
  };
  const list = BONE_NAMES.map(n => { const b = new THREE.Bone(); b.name = n; b.position.fromArray(bpos[n]); bones[n] = b; return b; });
  for (const n of BONE_NAMES) if (PARENT[n]) bones[PARENT[n]].add(bones[n]);

  // ---- hình ----
  const bld = new Builder();
  const torsoChain = chainW([[BI.head, 99], [BI.neck, Y.head], [BI.chest, Y.neck], [BI.spine, Y.chest], [BI.hips, Y.spine]], 0.06);

  // màu thân theo trang phục
  const waistTop = hipsY + (outfit === 'trunks' || outfit === 'tights' || outfit === 'shorts' ? 0.06 : 0.06);
  function torsoColor(x, y, z) {
    const a = Math.atan2(x, z);
    if (kind === 'referee') {
      if (y < waistTop) return col('#15151a');
      const stripe = Math.floor((a + Math.PI) / (TAU / 18)) % 2;
      return stripe ? col('#111') : white;
    }
    if (kind === 'suit') {
      if (y < waistTop) return col(d.pants || '#202430');
      const front = Math.abs(a) < 0.42 && y > Y.chest - 0.05;
      if (front) { if (Math.abs(a) < 0.07 && y < Y.neck - 0.01) return col(d.tie || '#b0182a'); return white; }
      return att;
    }
    if (y < waistTop) {
      if (outfit === 'jeans') return y > waistTop - 0.03 ? col('#3a2a1a') : col(d.jeans || '#3d5a8a');
      // quần: viền trên màu phụ
      if (y > waistTop - 0.035) return att2;
      if (d.stripe && Math.abs(Math.abs(a) - Math.PI / 2) < 0.18) return att2;
      return att;
    }
    if (outfit === 'singlet') {
      // áo liền quần: hở vai, hở ngực trên
      const strap = Math.abs(Math.abs(x) - 0.12 * B) < 0.035;
      if (y < Y.chest + 0.06 || (strap && y < Y.neck)) return att;
      if (Math.abs(a) > 2.2 && y < Y.chest + 0.14) return att;
    }
    if (top === 'crop' && y > Y.chest + 0.06 && y < Y.neck - 0.03) return Math.abs(a) > 2.6 && y > Y.chest + 0.2 ? skin : att2;
    if (top === 'vest') { const open = Math.abs(a) < 0.42; if (!open && y > Y.spine + 0.02) return col(d.vest || '#141414'); }
    if (outfit === 'tank' && y < Y.neck - 0.04 && (Math.abs(x) < 0.15 * B || y < Y.chest + 0.12)) return att2.clone().lerp(att, 0.2);
    // bóng cơ bụng
    if (y > Y.spine && y < Y.chest + 0.12 && Math.abs(a) < 0.5) {
      const ab = (Math.abs(x) < 0.008) || (Math.abs(((y - Y.spine) % 0.075)) < 0.006);
      if (ab) return skinDark;
    }
    // hình xăm lưng / ngực
    if (d.tattoo === 'back' && Math.abs(a) > 2.4 && y > Y.chest && y < Y.neck - 0.05) return mix(skin, tatC, 0.7);
    return skin;
  }

  // thân (một khối tiện từ đáy chậu tới cổ)
  const T = F ? [
    [0.05, hipsY - 0.13], [0.15, hipsY - 0.10], [0.185, hipsY - 0.03], [0.175, hipsY + 0.06],
    [0.135, Y.spine + 0.02], [0.13, Y.spine + 0.08], [0.145, Y.chest],
    [0.165, Y.chest + 0.1], [0.17, Y.chest + 0.18], [0.155, Y.neck - 0.05], [0.1, Y.neck - 0.005], [0.06, Y.neck + 0.01],
  ] : [
    [0.05, hipsY - 0.13], [0.15, hipsY - 0.10], [0.175, hipsY - 0.02], [0.175, hipsY + 0.06],
    [0.16 + G * 0.05, Y.spine], [0.165 + G * 0.07, Y.spine + 0.07], [0.18 + G * 0.04, Y.chest],
    [0.215, Y.chest + 0.1], [0.225, Y.chest + 0.18], [0.2, Y.neck - 0.05], [0.13, Y.neck - 0.005], [0.07, Y.neck + 0.01],
  ];
  const tz = (0.66 + G * 0.12);
  bld.add(lathe(T.map(([r, y]) => [r * B, y]), 1, tz, 22), torsoChain, torsoColor);
  // ngực, vai thang, mông, bụng
  if (kind === 'wrestler') {
    const chestC = outfit === 'tank' ? mix(att2, att, 0.2) : (top === 'vest' ? skin : skin);
    if (F) for (const s of [1, -1]) bld.add(ellip(0.068 * B, 0.065, 0.06, s * 0.062 * B, Y.chest + 0.13, 0.085 * B * tz + 0.01), BI.chest, att2);
    else for (const s of [1, -1]) bld.add(ellip(0.095 * B, 0.075, 0.06, s * 0.085 * B, Y.chest + 0.15, 0.1 * B * tz + 0.02), BI.chest, chestC);
    bld.add(ellip((F ? 0.12 : 0.17) * B, F ? 0.05 : 0.07, F ? 0.07 : 0.09, 0, Y.neck - 0.06, -0.02), BI.chest, outfit === 'tank' ? mix(att2, att, 0.2) : (top === 'vest' ? col(d.vest || '#141414') : skin));
  } else {
    bld.add(ellip(0.15 * B, 0.06, 0.08, 0, Y.neck - 0.06, -0.01), BI.chest, kind === 'suit' ? att : (x, y, z) => torsoColor(x, y, z));
  }
  for (const s of [1, -1]) bld.add(ellip(0.1 * B, 0.1, 0.085, s * 0.07 * B, hipsY - 0.04, -0.07), BI.hips, kind === 'wrestler' ? att : col(kind === 'suit' ? (d.pants || '#202430') : '#15151a'));
  if (G > 0.2) bld.add(ellip(0.16 * B, 0.13, 0.12 * G + 0.05, 0, Y.spine + 0.03, 0.08 + G * 0.06), torsoChain, (x, y, z) => torsoColor(x, y, z));

  // cổ (bò cạp vạm vỡ)
  bld.add(lathe([[0.085 * B, Y.head + 0.05], [0.08 * B, Y.neck + 0.02], [0.1 * B, Y.neck - 0.03]], 1, 0.95, 14), torsoChain, kind === 'suit' ? white : skin);
  if (kind === 'suit') bld.add(lathe([[0.075, Y.neck + 0.05], [0.09, Y.neck - 0.0]], 1, 1, 14), BI.neck, white);

  // ---- tay ----
  for (const s of [1, -1]) {
    const L = s > 0 ? 'l' : 'r', x = s * shoulderX;
    const chain = chainW([[BI[L + 'Arm'], 99], [BI[L + 'Fore'], Y.elbow], [BI[L + 'Hand'], Y.wrist]], 0.045);
    const armColor = (px, y, pz) => {
      if (kind === 'referee') return y > Y.sh - 0.12 ? (Math.floor((Math.atan2(px - x, pz) + Math.PI) / (TAU / 10)) % 2 ? col('#111') : white) : skin;
      if (kind === 'suit') return y > Y.wrist + 0.03 ? att : (y > Y.wrist ? white : skin);
      if (d.sleeves && y > Y.wrist + 0.04) return att2;
      if (top === 'vest' && y > Y.sh - 0.07) return col(d.vest || '#141414');
      if (d.tattoo === 'arms' && y < Y.sh - 0.06 && y > Y.wrist + 0.06 && (s > 0 || d.tattooBoth)) {
        const t = Math.sin(y * 70 + Math.atan2(px - x, pz) * 3);
        if (t > 0.2) return mix(skin, tatC, 0.75);
      }
      if (d.armband && Math.abs(y - (Y.sh - 0.16)) < 0.022) return mix(skin, tatC, 0.8);
      if (d.elbowPads && Math.abs(y - Y.elbow) < 0.04) return padC;
      if (y < Y.wrist + 0.07 && y > Y.wrist - 0.01) return d.wrist ? col(d.wrist) : white;
      return skin;
    };
    const k = (kind === 'wrestler' ? B : 0.85 + B * 0.15) * (F ? 0.8 : 1);
    bld.add(lathe([
      [0.07 * k, Y.sh + 0.03], [0.078 * k, Y.sh - 0.06], [0.074 * k, Y.sh - 0.14], [0.06 * k, Y.elbow + 0.03], [0.05 * k, Y.elbow],
      [0.058 * k, Y.elbow - 0.06], [0.054 * k, Y.elbow - 0.13], [0.038 * k, Y.wrist + 0.01], [0.035, Y.wrist - 0.02],
    ], 1, 0.92, 14, x, 0), chain, armColor);
    // cơ vai (deltoid)
    bld.add(ellip(0.088 * k, 0.085 * k, 0.088 * k, x + s * 0.01, Y.sh - 0.02, 0), BI[L + 'Arm'], kind === 'referee' ? (px, y, pz) => armColor(px, Y.sh, pz) : (kind === 'suit' ? att : (d.sleeves ? att2 : skin)));
    // nắm tay
    const handC = d.gloves ? col(d.gloves) : (kind === 'wrestler' && d.tape ? white : skin);
    bld.add(boxR(0.075, 0.12, 0.085, x, Y.wrist - 0.075, 0.01), BI[L + 'Hand'], handC);
    bld.add(ellip(0.022, 0.04, 0.022, x - s * 0.0, Y.wrist - 0.06, 0.05), BI[L + 'Hand'], handC);   // ngón cái
  }

  // ---- chân ----
  const legsAttire = outfit === 'tights' || outfit === 'shorts' || kind !== 'wrestler';
  for (const s of [1, -1]) {
    const L = s > 0 ? 'l' : 'r', x = s * J.hipX * B;
    const chain = chainW([[BI[L + 'Thigh'], 99], [BI[L + 'Shin'], Y.knee], [BI[L + 'Foot'], Y.ankle]], 0.05);
    const bootTop = d.bootH === 'low' ? Y.ankle + 0.1 : Y.knee - 0.07;
    const legColor = (px, y, pz) => {
      const a = Math.atan2(px - x, pz);
      if (kind === 'referee') return y < Y.ankle + 0.04 ? col('#0d0d10') : col('#15151a');
      if (kind === 'suit') return y < Y.ankle + 0.03 ? col('#141414') : col(d.pants || '#202430');
      if (outfit === 'jeans') { if (y < Y.ankle + 0.03) return bootC; return Math.abs(y - Y.knee + 0.02) < 0.02 ? col(d.jeans || '#3d5a8a').multiplyScalar(1.25) : col(d.jeans || '#3d5a8a'); }
      if (y < bootTop) { if (Math.abs(y - bootTop) < 0.025) return att2.clone().lerp(white, 0.3); return bootC; }
      if (d.kneepads !== false && Math.abs(y - Y.knee) < 0.06) return padC;
      if (outfit === 'shorts' && y > Y.knee + 0.12) return d.stripe && Math.abs(a - s * Math.PI / 2) < 0.3 ? att2 : att;
      if (outfit === 'tights') {
        if (d.stripe && Math.abs(Math.abs(a) - Math.PI / 2) < 0.22 && Math.sign(a) === s) return att2;
        if (d.split && s < 0) return att2;
        return att;
      }
      if (outfit === 'singlet' && y > hipsY - 0.17) return att;
      if (y > hipsY - 0.12) return att;
      return skin;
    };
    const k = (kind === 'wrestler' ? B : 0.85 + B * 0.15) * (F ? 0.88 : 1);
    const sh = outfit === 'shorts' ? 1.18 : (outfit === 'jeans' ? 1.06 : 1);
    bld.add(lathe([
      [0.12 * k * sh, hipsY + 0.02], [0.118 * k * sh, hipsY - 0.08], [0.105 * k * sh, hipsY - 0.22], [0.08 * k, Y.knee + 0.08], [0.068 * k, Y.knee],
      [0.072 * k, Y.knee - 0.08], [0.078 * k, Y.knee - 0.15], [0.055 * k, Y.ankle + 0.1], [0.05 * k, Y.ankle],
    ], 1, 1, 16, x, 0), chain, legColor);
    if (outfit === 'shorts') bld.add(lathe([[0.15 * k, hipsY - 0.05], [0.14 * k, Y.knee + 0.14], [0.001, Y.knee + 0.13]], 1, 1, 16, x, 0), chain, legColor);
    // bàn chân / giày
    const footC = kind === 'wrestler' ? bootC : col('#0d0d10');
    bld.add(boxR(0.1 * Math.min(1.1, k), 0.09, 0.27, x, Y.ankle - 0.03, 0.06), BI[L + 'Foot'], footC);
  }

  // ---- tóc khối ----
  const headY = Y.head + 0.115;   // tâm đầu
  const HR = 0.115;
  const hs = d.hair;
  if (!d.mask) {
    if (hs === 'long' || hs === 'ponytail' || hs === 'mohawk' || hs === 'afro' || hs === 'dreads' || hs === 'short' || hs === 'flat' || hs === 'bun') {
      // mũ tóc
      const cap = new THREE.SphereGeometry(HR * 1.08, 18, 10, 0, TAU, 0, Math.PI * 0.42);
      cap.translate(0, headY + 0.005, -0.008);
      if (hs !== 'mohawk') bld.add(cap, BI.head, hairC);
    }
    if (hs === 'long') { bld.add(boxR(0.21, 0.32, 0.09, 0, headY - 0.12, -0.075), BI.head, hairC); for (const s of [1, -1]) bld.add(boxR(0.05, 0.22, 0.06, s * 0.105, headY - 0.07, -0.02), BI.head, hairC); }
    if (hs === 'ponytail') { bld.add(ellip(0.05, 0.13, 0.05, 0, headY - 0.08, -0.15), BI.head, hairC); }
    if (hs === 'bun') { bld.add(ellip(0.055, 0.05, 0.055, 0, headY + 0.07, -0.09), BI.head, hairC); }
    if (hs === 'mohawk') { for (let i = 0; i < 7; i++) { const a = -0.9 + i * 0.32; bld.add(ellip(0.022, 0.06, 0.05, 0, headY + Math.cos(a) * HR * 1.0, Math.sin(a) * HR * 1.0), BI.head, hairC); } }
    if (hs === 'afro') bld.add(ellip(0.17, 0.15, 0.16, 0, headY + 0.06, -0.03), BI.head, hairC);
    if (hs === 'flat') bld.add(boxR(0.2, 0.09, 0.2, 0, headY + 0.1, -0.01), BI.head, hairC);
    if (hs === 'dreads') for (let i = 0; i < 9; i++) { const a = Math.PI * 0.55 + i * (Math.PI * 0.9 / 8); bld.add(ellip(0.022, 0.15, 0.022, Math.cos(a) * 0.1, headY - 0.1, -Math.abs(Math.sin(a)) * 0.1 + 0.0), BI.head, hairC); }
    if (d.beard === 'full') bld.add(ellip(0.085, 0.08, 0.06, 0, headY - 0.105, 0.065), BI.head, col(d.beardColor || d.hairColor));
  } else if (d.mask && d.mask.mohawk) {
    for (let i = 0; i < 6; i++) { const a = -0.8 + i * 0.32; bld.add(ellip(0.02, 0.05, 0.045, 0, headY + Math.cos(a) * HR, Math.sin(a) * HR), BI.head, col(d.mask.trim)); }
  }
  // mũi + tai khối (để mặt có chiều sâu)
  const faceC = d.mask ? col(d.mask.base) : skin;
  bld.add(ellip(0.018, 0.03, 0.022, 0, headY - 0.02, HR * 0.97), BI.head, faceC);
  for (const s of [1, -1]) bld.add(ellip(0.014, 0.03, 0.022, s * HR * 0.98, headY - 0.0, -0.005), BI.head, d.mask ? faceC : skin);
  // hàm / cằm
  bld.add(ellip(0.075 * Math.min(1.15, B), 0.06, 0.07, 0, headY - 0.075, 0.03), BI.head, d.beard === 'full' && !d.mask ? col(d.beardColor || d.hairColor) : faceC);

  // tai nghe bình luận viên
  if (d.headset) {
    const hb = new THREE.TorusGeometry(HR * 1.05, 0.008, 6, 20, Math.PI); hb.rotateY(Math.PI / 2); hb.translate(0, headY, 0);
    bld.add(hb, BI.head, '#222');
    for (const s of [1, -1]) bld.add(ellip(0.025, 0.035, 0.035, s * HR * 1.02, headY - 0.01, 0), BI.head, '#1a1a1a');
    bld.add(boxR(0.01, 0.01, 0.1, HR * 0.9, headY - 0.06, 0.07), BI.head, '#1a1a1a');
  }

  const geo = bld.build();
  geo.computeBoundingSphere();
  const mesh = new THREE.SkinnedMesh(geo, BODY_MAT);
  mesh.castShadow = true; mesh.frustumCulled = false;
  const root = new THREE.Group();
  root.add(bones.hips);
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(list));

  // ---- áo choàng ra sân (lưới riêng cùng bộ xương, cởi ra khi vào võ đài) ----
  let coat = null;
  if (d.coat) {
    const cb = new Builder();
    const cc = col(d.coat.color), ct = col(d.coat.trim || d.coat.color);
    const sparkle = !!d.coat.sparkle;
    const cColor = (x, y, z) => {
      const a = Math.atan2(x, z);
      if (Math.abs(Math.abs(a) - 0.42) < 0.08) return ct;                       // viền vạt trước
      if (sparkle && (Math.sin(x * 97) * Math.sin(y * 113) * Math.sin(z * 89)) > 0.55) return ct;
      return cc;
    };
    const wd = F ? 0.82 : 1;
    cb.add(lathe([[0.2 * B * wd, hipsY - 0.05], [0.2 * B * wd, Y.spine], [0.2 * B * wd, Y.chest], [0.245 * B * wd, Y.chest + 0.14], [0.235 * B * wd, Y.neck - 0.04], [0.12 * B, Y.neck + 0.02]], 1, 0.75, 22, 0, 0, 0.42, TAU - 0.84), torsoChain, cColor);
    const skirtLen = d.coat.long ? Y.ankle + 0.08 : Y.knee - 0.05;
    cb.add(lathe([[0.205 * B * wd, hipsY + 0.02], [0.25 * B * wd, hipsY - 0.25], [0.32 * B * wd, skirtLen]], 1, 0.8, 22, 0, 0, 0.42, TAU - 0.84), BI.hips, cColor);
    // cổ áo
    cb.add(lathe([[0.13 * B, Y.neck + 0.08], [0.15 * B, Y.neck - 0.02]], 1, 0.85, 18, 0, -0.01, 0.6, TAU - 1.2), BI.chest, ct);
    for (const s of [1, -1]) {
      const L = s > 0 ? 'l' : 'r', x = s * shoulderX;
      const chain = chainW([[BI[L + 'Arm'], 99], [BI[L + 'Fore'], Y.elbow], [BI[L + 'Hand'], Y.wrist]], 0.045);
      cb.add(lathe([[0.1 * B, Y.sh + 0.05], [0.095 * B, Y.sh - 0.1], [0.075 * B, Y.elbow], [0.07 * B, Y.wrist + 0.06]], 1, 1, 12, x, 0), chain, (px, y) => y < Y.wrist + 0.1 ? ct : cc);
    }
    const cg = cb.build(); cg.computeBoundingSphere();
    coat = new THREE.SkinnedMesh(cg, COAT_MAT);
    coat.castShadow = true; coat.frustumCulled = false;
    root.add(coat); coat.bind(mesh.skeleton);
  }

  // ---- đầu (lưới riêng, ảnh mặt) ----
  const headGeo = new THREE.SphereGeometry(HR, 28, 20);
  headGeo.scale(1, 1.12, 1.02);
  const headMat = new THREE.MeshStandardMaterial({ map: faceTexture({ ...d, skin: d.skin }), roughness: 0.55, metalness: 0.02 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, headY - Y.head, 0);
  head.castShadow = true;
  bones.head.add(head);

  // kính râm khi ra sân
  let glasses = null;
  if (d.shades) {
    glasses = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.03), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.15, metalness: 0.8 }));
    glasses.position.set(0, 0.012, HR * 0.98); head.add(glasses);
  }

  const scale = (d.height || 1.9) / 1.95;
  root.scale.setScalar(scale);
  return { root, bones, mesh, head, headMat, glasses, coat, scale, def: d, Y };
}

// ---------- áp tư thế ----------
// pose = { hips: { p:[x,y,z] (y = độ cao tuyệt đối của hông, đơn vị chuẩn), r:[x,y,z] độ }, spine:[x,y,z], ... }
const D2R = Math.PI / 180;
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _v = new THREE.Vector3();
export function poseToQuats(pose, out) {
  out = out || {};
  for (const n of BONE_NAMES) {
    if (n === 'hips') {
      const h = pose.hips || {};
      const r = h.r || [0, 0, 0];
      _e.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'YXZ');
      (out.hipsQ || (out.hipsQ = new THREE.Quaternion())).setFromEuler(_e);
      const p = h.p || [0, HIPS_Y, 0];
      (out.hipsP || (out.hipsP = new THREE.Vector3())).set(p[0], p[1], p[2]);
      continue;
    }
    const r = pose[n] || [0, 0, 0];
    _e.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'XYZ');
    (out[n] || (out[n] = new THREE.Quaternion())).setFromEuler(_e);
  }
  return out;
}
// đặt xương theo bộ quaternion, trộn mềm hệ số k (1 = đặt ngay)
export function applyQuats(w, Q, k = 1) {
  const b = w.bones;
  for (const n of BONE_NAMES) {
    if (n === 'hips') { b.hips.quaternion.slerp(Q.hipsQ, k); b.hips.position.lerp(Q.hipsP, k); continue; }
    b[n].quaternion.slerp(Q[n], k);
  }
}
// nội suy hai tư thế (đã đổi sang quaternion)
export function blendQuats(A, B, t, out) {
  out = out || {};
  for (const n of BONE_NAMES) {
    if (n === 'hips') {
      (out.hipsQ || (out.hipsQ = new THREE.Quaternion())).copy(A.hipsQ).slerp(B.hipsQ, t);
      (out.hipsP || (out.hipsP = new THREE.Vector3())).copy(A.hipsP).lerp(B.hipsP, t);
      continue;
    }
    (out[n] || (out[n] = new THREE.Quaternion())).copy(A[n]).slerp(B[n], t);
  }
  return out;
}
