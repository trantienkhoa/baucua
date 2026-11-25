// Hoá trang: gắn đạo cụ 3D vào xương của nhân vật người thật.
// Mọi đạo cụ thiết kế theo mét, trục: +Y lên, +Z phía trước mặt, +X bên TRÁI nhân vật.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PI = Math.PI, TAU = PI * 2;
const pick = a => a[Math.floor(Math.random() * a.length)];
export const costumeTime = { value: 0 };

// ---------- chất liệu dùng chung ----------
const M = {};
const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.1 }, o));
function mat(key, make) { return M[key] || (M[key] = make()); }
const gold = () => mat('gold', () => std(0xffc928, { metalness: 1, roughness: 0.25 }));
const iron = () => mat('iron', () => std(0x6b7079, { metalness: 0.9, roughness: 0.35 }));
const silver = () => mat('silver', () => std(0xb8bcc6, { metalness: 0.75, roughness: 0.42 }));
const black = () => mat('black', () => std(0x16161b, { roughness: 0.6 }));
const col = c => mat('c' + c, () => std(c));
const glow = c => mat('g' + c, () => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.6, roughness: 0.3, toneMapped: false }));
const glass = () => mat('glass', () => new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.5, depthWrite: false }));
function capeMat(c) {
  return mat('cape' + c, () => {
    const m = std(c, { side: THREE.DoubleSide, roughness: 0.65 });
    m.onBeforeCompile = sh => {
      sh.uniforms.uTime = costumeTime;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
        { float k = clamp(-position.y / 1.15, 0.0, 1.0);
          float w = 1.0 + 0.6 * k;
          transformed.x *= w;
          transformed.z += (0.5 - abs(position.x) * 2.6) * 0.09 * (1.0 - 0.5 * k);
          transformed.z -= k * k * 0.25 + k * 0.07 * sin(uTime * 3.2 + k * 5.0 + position.x * 4.0); }`);
    };
    m.customProgramCacheKey = () => 'cape';
    return m;
  });
}
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.frustumCulled = false; return o; };

// ---------- đạo cụ (kích thước theo đầu L: chiều cao từ khớp đầu tới đỉnh) ----------
const P = {
  headband: (L, c = 'gold') => { const g = new THREE.Group(); const R = L * 0.5; g.add(mesh(new THREE.TorusGeometry(R, 0.016, 8, 32).rotateX(PI / 2 - 0.12), c === 'gold' ? gold() : col(c), 0, L * 0.43, 0.014)); return g; },
  eyemask: (L, c = 0x111111) => { const R = L * 0.5; return mesh(new THREE.CylinderGeometry(R, R, 0.055, 28, 1, true, -1.6, 3.2), col(c), 0, L * 0.4, 0.014); },
  helmet: (L, m, plume) => {
    const g = new THREE.Group(), R = L * 0.6;
    g.add(mesh(new THREE.SphereGeometry(R, 24, 14, 0, TAU, 0, PI * 0.58), m, 0, L * 0.5, 0));
    g.add(mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.02, 0.03, 24, 1, true, PI * 0.25, PI * 1.5), m, 0, L * 0.38, 0));
    if (plume) g.add(mesh(new THREE.ConeGeometry(0.05, 0.3, 10).rotateX(-0.5), col(plume), 0, L * 1.15, -0.06));
    else g.add(mesh(new THREE.ConeGeometry(0.025, 0.12, 8), m, 0, L * 1.12, 0));
    return g;
  },
  kabuto: L => {
    const g = P.helmet(L, col(0x8b1a1a));
    g.add(mesh(new THREE.CylinderGeometry(L * 0.62, L * 0.85, 0.12, 24, 1, true, PI * 0.3, PI * 1.4), col(0x8b1a1a), 0, L * 0.3, -0.01));
    for (const sd of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.02, 0.2, 0.01).rotateZ(sd * 0.55), gold(), sd * 0.06, L * 0.95, L * 0.55));
    return g;
  },
  ninja: L => {
    const g = new THREE.Group(), R = L * 0.58;
    g.add(mesh(new THREE.SphereGeometry(R, 24, 14, 0, TAU, 0, PI * 0.5), black(), 0, L * 0.5, -0.005));
    g.add(mesh(new THREE.CylinderGeometry(R * 0.95, R * 0.9, L * 0.32, 24, 1, true, -1.7, 3.4), black(), 0, L * 0.2, 0.0));
    g.add(mesh(new THREE.BoxGeometry(0.09, 0.04, 0.01), silver(), 0, L * 0.7, R * 0.98));
    g.add(mesh(new THREE.TorusGeometry(R * 1.01, 0.012, 6, 28).rotateX(PI / 2), black(), 0, L * 0.7, 0));
    return g;
  },
  astro: L => {
    const g = new THREE.Group(), R = L * 0.95;
    g.add(mesh(new THREE.SphereGeometry(R, 28, 18), glass(), 0, L * 0.45, 0.02));
    g.add(mesh(new THREE.SphereGeometry(R * 1.01, 24, 12, -0.9, 1.8, PI * 0.25, PI * 0.35), gold(), 0, L * 0.45, 0.02));
    g.add(mesh(new THREE.TorusGeometry(R * 0.7, 0.04, 10, 28).rotateX(PI / 2), col(0xeeeeee), 0, -L * 0.15, 0));
    return g;
  },
  wizardHat: (L, c) => { const g = new THREE.Group(), R = L * 0.62; g.add(mesh(new THREE.ConeGeometry(R, 0.5, 20).translate(0, 0.25, 0).rotateX(-0.15), col(c), 0, L * 0.72, 0)); g.add(mesh(new THREE.CylinderGeometry(R * 1.7, R * 1.7, 0.015, 28), col(c), 0, L * 0.72, 0)); g.add(mesh(new THREE.TorusGeometry(R * 1.0, 0.02, 6, 24).rotateX(PI / 2), gold(), 0, L * 0.76, 0)); return g; },
  tricorn: L => { const g = new THREE.Group(), R = L * 0.6; g.add(mesh(new THREE.CylinderGeometry(R * 0.85, R * 0.95, 0.12, 20), black(), 0, L * 0.85, 0)); g.add(mesh(new THREE.CylinderGeometry(R * 1.65, R * 1.65, 0.03, 3).rotateY(PI / 6), black(), 0, L * 0.78, 0)); g.add(mesh(new THREE.TorusGeometry(R * 1.2, 0.012, 6, 3).rotateX(PI / 2).rotateY(PI / 6), gold(), 0, L * 0.8, 0)); return g; },
  eyepatch: L => { const g = new THREE.Group(), R = L * 0.53; g.add(mesh(new THREE.CylinderGeometry(R, R, 0.015, 28, 1, true).rotateZ(-0.35), black(), 0, L * 0.55, 0.005)); g.add(mesh(new THREE.CircleGeometry(0.03, 16), black(), 0.045, L * 0.4, R * 0.97)); return g; },
  crown: (L, gem = 0xff3d7f) => { const g = new THREE.Group(), R = L * 0.5; g.add(mesh(new THREE.CylinderGeometry(R, R * 1.05, 0.07, 20, 1, true), gold(), 0, L * 0.85, 0)); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.add(mesh(new THREE.ConeGeometry(0.025, 0.09, 6), gold(), Math.sin(a) * R, L * 0.93, Math.cos(a) * R)); } g.add(mesh(new THREE.SphereGeometry(0.03, 12, 8), glow(gem), 0, L * 0.86, R * 1.02)); return g; },
  mountainCrown: L => { const g = new THREE.Group(), R = L * 0.5; g.add(mesh(new THREE.CylinderGeometry(R, R * 1.04, 0.05, 20, 1, true), gold(), 0, L * 0.8, 0)); [[-0.07, 0.13], [0, 0.2], [0.07, 0.13]].forEach(([x, h]) => g.add(mesh(new THREE.ConeGeometry(0.05, h, 5), col(0x2e8b3a), x, L * 0.8 + h / 2, R * 0.85))); return g; },
  waveCrown: L => { const g = new THREE.Group(), R = L * 0.5; g.add(mesh(new THREE.CylinderGeometry(R, R * 1.04, 0.05, 20, 1, true), silver(), 0, L * 0.8, 0)); for (let i = -2; i <= 2; i++) g.add(mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 12, PI), glow(0x3dd9ff), i * 0.05, L * 0.86, R * 0.95)); return g; },
  horns: L => { const g = new THREE.Group(); for (const sd of [-1, 1]) g.add(mesh(new THREE.ConeGeometry(0.035, 0.16, 10).rotateZ(-sd * 0.5), col(0x8b0000), sd * L * 0.33, L * 0.95, 0.03)); return g; },
  halo: L => mesh(new THREE.TorusGeometry(L * 0.42, 0.018, 8, 32).rotateX(PI / 2), glow(0xffe680), 0, L * 1.35, -0.02),
  spikyHair: (L, c) => { const geos = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * PI * 1.6 - PI * 0.8, up = 0.4 + (i % 3) * 0.2; const gg = new THREE.ConeGeometry(0.06, 0.24 + (i % 3) * 0.06, 8).translate(0, 0.12, 0).rotateX(-0.3 - up * 0.4).rotateY(a); geos.push(gg.translate(Math.sin(a) * L * 0.25, L * 0.8, -Math.cos(a) * L * 0.1 - 0.03)); } geos.push(new THREE.SphereGeometry(L * 0.58, 20, 12, 0, TAU, 0, PI * 0.5).translate(0, L * 0.48, -0.01)); return mesh(mergeGeometries(geos), col(c)); },
  antenna: L => { const g = new THREE.Group(); for (const sd of [-1, 1]) { g.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.18), silver(), sd * 0.07, L * 1.05, 0)); g.add(mesh(new THREE.SphereGeometry(0.022, 10, 8), glow(0xff3d3d), sd * 0.07, L * 1.15, 0)); } return g; },
  visor: (L, c = 0x3dd9ff) => mesh(new THREE.CylinderGeometry(L * 0.52, L * 0.52, 0.06, 28, 1, true, -1.3, 2.6), glow(c), 0, L * 0.4, 0.014),
  // Tây Du Ký
  monkHat: L => { const g = new THREE.Group(), R = L * 0.5; g.add(mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.04, 0.035, 24, 1, true), gold(), 0, L * 0.5, 0));
    const petal = new THREE.Shape(); petal.moveTo(-0.03, 0); petal.quadraticCurveTo(-0.035, 0.05, 0, 0.075); petal.quadraticCurveTo(0.035, 0.05, 0.03, 0); petal.closePath();
    const pg = new THREE.ShapeGeometry(petal);
    for (let i = -2; i <= 2; i++) { const a = i * 0.38; const p = mesh(pg, mat('petal' + (i % 2), () => std(i % 2 ? 0xb3122d : 0xffc928, { side: THREE.DoubleSide, metalness: i % 2 ? 0.1 : 0.9, roughness: 0.3 })), Math.sin(a) * R * 1.04, L * 0.52, Math.cos(a) * R * 1.04); p.rotation.y = a; p.rotation.x = -0.25; g.add(p); }
    return g; },
  pigFace: L => { const g = new THREE.Group(), R = L * 0.5;
    g.add(mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.05, 20).rotateX(PI / 2), col(0xf2a1b0), 0, L * 0.3, R * 1.0));
    for (const sd of [-1, 1]) g.add(mesh(new THREE.CircleGeometry(0.01, 10), black(), sd * 0.017, L * 0.3, R * 1.0 + 0.026));
    for (const sd of [-1, 1]) { const e = mesh(new THREE.ConeGeometry(0.07, 0.12, 4).scale(1, 1, 0.25).rotateX(0.9).rotateZ(-sd * 0.7), col(0xf2a1b0), sd * R * 0.92, L * 0.72, 0.02); g.add(e); }
    return g; },
  beard: L => { const g = new THREE.Group(); g.add(mesh(new THREE.ConeGeometry(L * 0.3, L * 0.55, 16, 1, false, -1.3, 2.6).rotateX(PI).scale(1, 1, 0.6), col(0x2a1a10), 0, L * 0.02, L * 0.3)); g.add(mesh(new THREE.TorusGeometry(L * 0.42, 0.02, 6, 20, PI).rotateZ(PI), col(0x2a1a10), 0, L * 0.28, L * 0.2)); return g; },
  beads: (big, c = 0x5a3820) => { const g = new THREE.Group(), n = big ? 9 : 16, r = big ? 0.045 : 0.02; for (let i = 0; i < n; i++) { const a = i / n * TAU; g.add(mesh(new THREE.SphereGeometry(r, 10, 8), big ? col(0xeee6cf) : col(c), Math.sin(a) * 0.15, 0.2 - Math.cos(a) * 0.04 + (Math.cos(a) > 0 ? -0.07 * Math.cos(a) : 0), Math.cos(a) * 0.13)); } return g; },
  ringStaff: () => { const g = P.staff(gold(), null, 1.8); for (let i = 0; i < 3; i++) g.add(mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 16), gold(), -0.08 + (i - 1) * 0.03, -0.01, 0.82)); g.add(mesh(new THREE.TorusGeometry(0.09, 0.012, 6, 18), gold(), -0.08, -0.01, 0.86)); return g; },
  rake: () => { const g = P.staff(col(0x5a3820), null, 1.7); g.add(mesh(new THREE.BoxGeometry(0.32, 0.04, 0.05), iron(), -0.08, -0.01, 0.85)); for (let i = 0; i < 9; i++) g.add(mesh(new THREE.ConeGeometry(0.012, 0.12, 6).rotateX(-PI / 2), iron(), -0.08 + (i - 4) * 0.036, -0.01, 0.94)); return g; },
  spade: () => { const g = P.staff(col(0x5a3820), null, 1.7); g.add(mesh(new THREE.TorusGeometry(0.11, 0.02, 6, 16, PI).rotateX(PI / 2).rotateY(PI / 2), silver(), -0.08, -0.01, 0.95)); g.add(mesh(new THREE.BoxGeometry(0.16, 0.012, 0.12), silver(), -0.08, -0.01, -0.9)); return g; },
  // năng lực trong tay trái (gốc ở cổ tay trái, tay duỗi về +X)
  power: kind => { const g = new THREE.Group(); const x = 0.09;
    if (kind === 'fire') { g.add(mesh(new THREE.ConeGeometry(0.06, 0.18, 12).translate(0, 0.09, 0), glow(0xff5a1f), x, 0.06, 0)); g.add(mesh(new THREE.SphereGeometry(0.05, 12, 10), glow(0xffd23d), x, 0.05, 0)); }
    if (kind === 'ice') for (let i = 0; i < 4; i++) g.add(mesh(new THREE.OctahedronGeometry(0.04 + i * 0.008).scale(0.6, 1.6, 0.6).rotateZ(i - 1.5), glow(0x7cf7ff), x + (i - 1.5) * 0.02, 0.08, (i % 2) * 0.02));
    if (kind === 'bolt') { const s = new THREE.Shape(); s.moveTo(0, 0.14); s.lineTo(0.05, 0.14); s.lineTo(0.02, 0.06); s.lineTo(0.06, 0.06); s.lineTo(-0.03, -0.08); s.lineTo(0.0, 0.02); s.lineTo(-0.03, 0.02); s.closePath(); g.add(mesh(new THREE.ShapeGeometry(s), glow(0xfff13d), x, 0.04, 0)); g.children[0].material = mat('boltside', () => new THREE.MeshStandardMaterial({ color: 0xfff13d, emissive: 0xfff13d, emissiveIntensity: 1.8, side: THREE.DoubleSide, toneMapped: false })); }
    if (kind === 'wind') for (let i = 0; i < 3; i++) g.add(mesh(new THREE.TorusGeometry(0.05 + i * 0.025, 0.008, 6, 24, PI * 1.5).rotateX(PI / 2), glow(0x5dff9a), x, 0.05 + i * 0.05, 0));
    if (kind === 'shadow') { g.add(mesh(new THREE.SphereGeometry(0.07, 16, 12), glow(0x9b5cff), x, 0.07, 0)); g.add(mesh(new THREE.TorusGeometry(0.1, 0.01, 6, 24).rotateX(1.2), glow(0xd8b4ff), x, 0.07, 0)); }
    g.userData.spin = true; return g; },
  heroMask: (L, c) => { const g = new THREE.Group(), R = L * 0.5; g.add(mesh(new THREE.CylinderGeometry(R, R, 0.06, 28, 1, true, -1.6, 3.2), col(c), 0, L * 0.4, 0.014)); g.add(mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.02, 0.02, 28, 1, true, -1.6, 3.2), gold(), 0, L * 0.6, 0.012)); return g; },
  // thân (gốc ở xương ngực Spine2)
  cape: c => mesh(new THREE.PlaneGeometry(0.4, 1.15, 10, 16).translate(0, -0.575, 0), capeMat(c), 0, 0.14, -0.17),
  shortCape: c => mesh(new THREE.PlaneGeometry(0.4, 0.75, 10, 12).translate(0, -0.375, 0), capeMat(c), 0, 0.14, -0.17),
  emblemShape: (shapeFn, c, c2) => { const g = new THREE.Group(); g.add(mesh(new THREE.CircleGeometry(0.085, 6), col(c2), 0, 0.03, 0.155)); g.add(mesh(new THREE.ShapeGeometry(shapeFn()), glow(c), 0, 0.03, 0.157)); return g; },
  emblem: (c, c2) => { const s = new THREE.Shape(); s.moveTo(-0.02, 0.07); s.lineTo(0.05, 0.07); s.lineTo(0.01, 0.01); s.lineTo(0.05, 0.01); s.lineTo(-0.04, -0.08); s.lineTo(-0.005, -0.015); s.lineTo(-0.045, -0.015); s.closePath(); const g = new THREE.Group(); g.add(mesh(new THREE.CircleGeometry(0.085, 6), col(c2), 0, 0.03, 0.155)); g.add(mesh(new THREE.ShapeGeometry(s), glow(c), 0, 0.03, 0.157)); return g; },
  armor: m => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.175, 0.16, 0.32, 20, 1, true, -1.3, 2.6).scale(1, 1, 0.8), m, 0, 0.0, 0.0)); for (const sd of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.1, 14, 10, 0, TAU, 0, PI * 0.5).scale(1.1, 0.7, 1), m, sd * 0.2, 0.15, 0)); return g; },
  backSword: () => { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.035, 0.85, 0.008), silver(), 0, 0, 0)); g.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.2), black(), 0, 0.52, 0)); g.add(mesh(new THREE.BoxGeometry(0.14, 0.02, 0.03), gold(), 0, 0.42, 0)); g.position.set(0, 0.05, -0.17); g.rotation.z = 0.6; return g; },
  backpack: () => { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.36, 0.45, 0.18), col(0xeeeeee), 0, 0, -0.22)); g.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), glow(0x3dff7a), 0.08, 0.1, -0.12)); return g; },
  wingsPair: c => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.25, 0.45, 0.75, 0.42); s.quadraticCurveTo(0.6, 0.25, 0.68, 0.18); s.quadraticCurveTo(0.45, 0.1, 0.55, 0.0); s.quadraticCurveTo(0.3, -0.04, 0.36, -0.16); s.quadraticCurveTo(0.15, -0.1, 0, 0); const geo = new THREE.ShapeGeometry(s, 10); const g = new THREE.Group(); for (const sd of [-1, 1]) { const w = mesh(geo, mat('wing' + c, () => std(c, { side: THREE.DoubleSide, emissive: c, emissiveIntensity: 0.25 }))); w.scale.set(sd, 1, 1); w.rotation.y = sd * 0.5; w.position.set(sd * 0.04, 0.0, -0.16); g.add(w); } g.userData.flap = true; return g; },
  // hông
  tail: (c, devil) => { const pts = [[0, 0, -0.12], [0, -0.25, -0.3], [0, -0.45, -0.38], [0, -0.4, -0.55], [0, -0.15, -0.62], [0, 0.05, -0.55]].map(p => new THREE.Vector3(...p)); const g = new THREE.Group(); g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, devil ? 0.015 : 0.03, 8), col(c))); if (devil) g.add(mesh(new THREE.ConeGeometry(0.04, 0.08, 4).rotateX(-0.4), col(c), 0, 0.08, -0.53)); g.userData.wag = true; return g; },
  // tay phải (gốc ở cổ tay; tay duỗi về phía -X khi đứng chữ T)
  staff: (m, ends, len = 1.7) => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, len, 10).rotateX(PI / 2), m)); if (ends) for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 10).rotateX(PI / 2), ends, 0, 0, s * (len / 2 - 0.07))); g.position.set(-0.08, -0.01, 0); return g; },
  sword: (m = silver()) => { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.008, 0.05, 0.85).translate(0, 0, 0.5), m)); g.add(mesh(new THREE.BoxGeometry(0.03, 0.16, 0.025), gold(), 0, 0, 0.06)); g.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.15).rotateX(PI / 2), black(), 0, 0, -0.03)); g.position.set(-0.08, -0.02, 0); return g; },
  katana: () => P.sword(silver()),
  wand: c => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.5, 8).rotateX(PI / 2), col(0x5a3820), 0, 0, 0.2)); g.add(mesh(new THREE.SphereGeometry(0.06, 16, 12), glow(c), 0, 0, 0.97)); g.position.set(-0.08, -0.01, 0); return g; },
  trident: (m = gold()) => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.6, 8).rotateX(PI / 2), m, 0, 0, 0.3)); for (const x of [-0.06, 0, 0.06]) g.add(mesh(new THREE.ConeGeometry(0.02, 0.18, 6).rotateX(PI / 2), m, x, 0, 1.18)); g.add(mesh(new THREE.BoxGeometry(0.14, 0.02, 0.02), m, 0, 0, 1.08)); g.position.set(-0.08, -0.01, 0); return g; },
  // cẳng tay trái (khiên)
  shield: (c, c2) => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.03, 24), col(c), 0.12, 0.07, 0)); g.add(mesh(new THREE.TorusGeometry(0.26, 0.02, 8, 24).rotateX(PI / 2), gold(), 0.12, 0.085, 0)); g.add(mesh(new THREE.ConeGeometry(0.06, 0.06, 16), col(c2), 0.12, 0.11, 0)); return g; },
};

const SH = {
  flame: () => { const s = new THREE.Shape(); s.moveTo(0, -0.07); s.quadraticCurveTo(0.06, -0.04, 0.04, 0.02); s.quadraticCurveTo(0.03, 0.05, 0.0, 0.08); s.quadraticCurveTo(0.01, 0.03, -0.02, 0.01); s.quadraticCurveTo(-0.06, -0.03, 0, -0.07); return s; },
  flake: () => { const s = new THREE.Shape(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, r = i % 2 ? 0.025 : 0.07; i ? s.lineTo(Math.sin(a) * r, Math.cos(a) * r) : s.moveTo(Math.sin(a) * r, Math.cos(a) * r); } s.closePath(); return s; },
  bolt: () => { const s = new THREE.Shape(); s.moveTo(-0.02, 0.07); s.lineTo(0.05, 0.07); s.lineTo(0.01, 0.01); s.lineTo(0.05, 0.01); s.lineTo(-0.04, -0.08); s.lineTo(-0.005, -0.015); s.lineTo(-0.045, -0.015); s.closePath(); return s; },
  leaf: () => { const s = new THREE.Shape(); s.moveTo(0, -0.07); s.quadraticCurveTo(0.07, 0, 0, 0.07); s.quadraticCurveTo(-0.07, 0, 0, -0.07); return s; },
  moon: () => { const s = new THREE.Shape(); s.absarc(0, 0, 0.065, 0, TAU, false); const h = new THREE.Path(); h.absarc(0.025, 0.015, 0.055, 0, TAU, true); s.holes.push(h); return s; },
};
const SQUAD = [
  ['hero_red', 'Neon Hoả', '#c8102e', '#1b1b1f', 0xff3d1f, 'fire', 'flame'],
  ['hero_blue', 'Neon Băng', '#1e40af', '#e6f0ff', 0x7cf7ff, 'ice', 'flake'],
  ['hero_yellow', 'Neon Sét', '#e0a800', '#1b1b1f', 0xfff13d, 'bolt', 'bolt'],
  ['hero_green', 'Neon Phong', '#15803d', '#e6ffe6', 0x5dff9a, 'wind', 'leaf'],
  ['hero_purple', 'Neon Ảnh', '#5b21b6', '#111111', 0xb98cff, 'shadow', 'moon'],
];

// ---------- danh sách hoá trang ----------
// tint: màu áo/quần/giày cho mô hình có lớp đồ tách rời
export const COSTUMES = [
  { id: 'tang', name: 'Đường Tăng', tint: ['#e0a800', '#b3122d', '#5a3820'], hideHat: true, group: 'tdk',
    build: (a, L) => { a('Head', P.monkHat(L)); a('Spine2', P.shortCape(0xb3122d)); a('Spine2', P.beads(false, 0x5a3820)); a('RightHand', P.ringStaff()); } },
  { id: 'batgioi', name: 'Trư Bát Giới', tint: ['#1f2a4a', '#3a3d44', '#1b1b1f'], hideHat: true, group: 'tdk', shape: 'chubby',
    build: (a, L) => { a('Head', P.pigFace(L)); a('Head', P.headband(L, 0x1f2a4a)); a('RightHand', P.rake()); } },
  { id: 'satang', name: 'Sa Tăng', tint: ['#3b2416', '#1e3a8a', '#1b1b1f'], hideHat: true, group: 'tdk',
    build: (a, L) => { a('Head', P.beard(L)); a('Spine2', P.beads(true)); a('RightHand', P.spade()); } },
  ...SQUAD.map(([id, name, c1, c2, glowC, power, emb]) => ({ id, name, tint: [c1, c1, c2], hideHat: true, group: 'squad',
    build: (a, L) => { a('Head', P.heroMask(L, 0x111111)); a('Spine2', P.cape(new THREE.Color(c1).getHex())); a('Spine2', P.emblemShape(SH[emb], glowC, 0x111111)); a('LeftHand', P.power(power)); } })),
  { id: 'wukong', name: 'Tề Thiên Đại Thánh', tint: ['#c8102e', '#ffb300', '#3b2416'], hideHat: true, group: 'tdk',
    build: (a, L) => { a('Head', P.headband(L)); a('Spine2', P.shortCape(0xc8102e)); a('Hips', P.tail(0x7a4b2a)); a('RightHand', P.staff(col(0xc8102e), gold())); } },
  { id: 'hero', name: 'Siêu anh hùng', hideHat: true, tints: [['#5b2a86', '#ffc928', '#ffc928', 0xffc928], ['#0f5132', '#111111', '#111111', 0x111111], ['#0e7490', '#ff8a3d', '#ff8a3d', 0xff8a3d], ['#111111', '#c8ff3d', '#c8ff3d', 0xc8ff3d], ['#ffffff', '#ff3d8b', '#ff3d8b', 0xff3d8b]],
    build: (a, L, tt) => { a('Head', P.eyemask(L, 0x111111)); a('Spine2', P.cape(tt[3])); a('Spine2', P.emblem(0xffe14d, 0x111111)); } },
  { id: 'giong', name: 'Thánh Gióng', tint: ['#4a4f57', '#3a3d44', '#2a2a2e'], hideHat: true,
    build: (a, L) => { a('Head', P.helmet(L, iron())); a('Spine2', P.armor(iron())); a('Spine2', P.shortCape(0xb3122d)); a('RightHand', P.staff(iron(), gold(), 1.9)); } },
  { id: 'sontinh', name: 'Sơn Tinh', tint: ['#2e6b34', '#c9a26b', '#3b2416'], hideHat: true,
    build: (a, L) => { a('Head', P.mountainCrown(L)); a('Spine2', P.cape(0x2e8b3a)); a('RightHand', P.staff(col(0x7a4b2a), col(0x2e8b3a))); } },
  { id: 'thuytinh', name: 'Thủy Tinh', tint: ['#1e3a8a', '#0e7490', '#1e2f55'], hideHat: true,
    build: (a, L) => { a('Head', P.waveCrown(L)); a('Spine2', P.cape(0x0e7490)); a('RightHand', P.trident(silver())); } },
  { id: 'ninja', name: 'Ninja', tint: ['#1b1b1f', '#1b1b1f', '#111111'], hideHat: true,
    build: (a, L) => { a('Head', P.ninja(L)); a('Spine2', P.backSword()); } },
  { id: 'samurai', name: 'Samurai', tint: ['#8b1a1a', '#1b1b1f', '#1b1b1f'], hideHat: true,
    build: (a, L) => { a('Head', P.kabuto(L)); a('Spine2', P.armor(col(0x8b1a1a))); a('RightHand', P.katana()); } },
  { id: 'astro', name: 'Phi hành gia', tint: ['#f2f2ee', '#f2f2ee', '#bbbbbb'], hideHat: true,
    build: (a, L) => { a('Head', P.astro(L)); a('Spine2', P.backpack()); } },
  { id: 'knight', name: 'Hiệp sĩ', tint: ['#9aa0aa', '#4a4f57', '#3a3d44'], hideHat: true,
    build: (a, L) => { a('Head', P.helmet(L, silver(), 0xd6262f)); a('Spine2', P.armor(silver())); a('Spine2', P.cape(0xd6262f)); a('RightHand', P.sword()); a('LeftForeArm', P.shield(0x1e3a8a, 0xffc928)); } },
  { id: 'wizard', name: 'Phù thuỷ', tint: ['#4c1d95', '#2e1065', '#1b1b1f'], hideHat: true,
    build: (a, L) => { a('Head', P.wizardHat(L, 0x4c1d95)); a('Spine2', P.cape(0x2e1065)); a('RightHand', P.wand(0x7cf7ff)); } },
  { id: 'pirate', name: 'Cướp biển', tint: ['#f2f2ee', '#5a3820', '#1b1b1f'], hideHat: true,
    build: (a, L) => { a('Head', P.tricorn(L)); a('Head', P.eyepatch(L)); a('RightHand', P.sword()); } },
  { id: 'robot', name: 'Người máy', tint: ['#b8c0cc', '#8a94a3', '#5a6270'], hideHat: true,
    build: (a, L) => { a('Head', P.visor(L)); a('Head', P.antenna(L)); a('Spine2', P.armor(silver())); } },
  { id: 'devil', name: 'Ác quỷ', tint: ['#7f0000', '#1b1b1f', '#1b1b1f'],
    build: (a, L) => { a('Head', P.horns(L)); a('Hips', P.tail(0x8b0000, true)); a('RightHand', P.trident(col(0x8b0000))); } },
  { id: 'angel', name: 'Thiên thần', tint: ['#ffffff', '#f2f2ee', '#ffffff'],
    build: (a, L) => { a('Head', P.halo(L)); a('Spine2', P.wingsPair(0xffffff)); } },
  { id: 'anime', name: 'Chiến binh anime', hideHat: true, tints: [['#1e3a8a', '#111111', '#ffffff', 0x3d7bff], ['#111111', '#d6262f', '#111111', 0xff4fd8], ['#f2f2ee', '#1e3a8a', '#111111', 0xe6e6f0]],
    build: (a, L, tt) => { a('Head', P.spikyHair(L, tt[3])); a('Head', P.headband(L, 0xd6262f)); a('RightHand', P.katana()); } },
  { id: 'king', name: 'Hoàng đế', tint: ['#b3122d', '#ffc928', '#5a3820'], hideHat: true,
    build: (a, L) => { a('Head', P.crown(L)); a('Spine2', P.cape(0xb3122d)); a('RightHand', P.staff(gold(), col(0xff3d7f), 1.2)); } },
];

// ---------- 4 tạo hình DJ theo bốn thầy trò Tây Du Ký (cho nhân vật VRoid: đầu to, tóc dày) ----------
// R = bán kính đầu tính cả tóc, FY = độ cao trán, TY = đỉnh đầu (tính từ khớp đầu), mét trên người cao 1,72 m
const HR = 0.118, FY = 0.135, TY = 0.235;
const dbl = (c, o = {}) => std(c, Object.assign({ side: THREE.DoubleSide }, o));
function tigerMat() {
  return mat('tiger', () => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#f0a020'; g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#fff0c8'; g.fillRect(0, 50, 256, 14);
    g.fillStyle = '#1a1208';
    for (let i = 0; i < 16; i++) { const x = i * 16 + (i % 2 ? 5 : 0); g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 9, 22, x + 3, 44 + (i % 3) * 5); g.quadraticCurveTo(x + 1, 22, x - 4, 0); g.fill(); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({ map: tx, side: THREE.DoubleSide, roughness: 0.8, emissive: 0xffffff, emissiveMap: tx, emissiveIntensity: 0.3 });
  });
}
// vũ khí đeo chéo sau lưng (DJ cần hai tay để chỉnh nhạc)
function onBack(weapon, tilt = 0.5, y = 0.02, fix = false) { const g = new THREE.Group(); weapon.position.set(0, 0, 0);
  if (fix) for (const c of weapon.children) if (Math.abs(c.position.z) > 0.5) { c.position.x += 0.08; c.position.y += 0.01; }   // đầu vũ khí về đúng trục cán
  weapon.rotation.x = -PI / 2; g.add(weapon); g.rotation.z = tilt; g.position.set(0, y, -0.15); return g; }
const DJP = {
  // tai nghe DJ vắt quanh cổ
  phones: (c = 0x16161b, accent = 0x3dd9ff) => { const g = new THREE.Group(), r = 0.082;
    g.add(mesh(new THREE.TorusGeometry(r, 0.011, 8, 24, PI).rotateX(PI / 2).rotateY(PI), col(c), 0, 0.035, -0.005));
    for (const sd of [-1, 1]) { g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 18).rotateZ(PI / 2), col(c), sd * r, 0.03, 0.012)); g.add(mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 18).rotateY(PI / 2), glow(accent), sd * (r + 0.016), 0.03, 0.012)); }
    return g; },
  // mũ Tỳ Lư: vành vàng, 5 cánh sen đỏ–vàng, chóp đỏ, hai dải lụa buông sau tai
  tyLu: () => { const g = new THREE.Group(), R = HR * 1.04;
    g.add(mesh(new THREE.SphereGeometry(R * 1.0, 24, 12, 0, TAU, 0, PI * 0.5).scale(1, 0.95, 1.04), col(0xa30f26), 0, FY - 0.005, -0.008));
    g.add(mesh(new THREE.CylinderGeometry(R * 1.03, R * 1.05, 0.04, 28, 1, true), dbl(0xffc928, { metalness: 0.9, roughness: 0.28 }), 0, FY, -0.008));
    const petal = new THREE.Shape(); petal.moveTo(-0.042, 0); petal.quadraticCurveTo(-0.055, 0.075, 0, 0.135); petal.quadraticCurveTo(0.055, 0.075, 0.042, 0); petal.closePath();
    const inner = new THREE.Shape(); inner.moveTo(-0.026, 0.012); inner.quadraticCurveTo(-0.034, 0.066, 0, 0.108); inner.quadraticCurveTo(0.034, 0.066, 0.026, 0.012); inner.closePath();
    const pg = new THREE.ShapeGeometry(petal), ig = new THREE.ShapeGeometry(inner);
    for (let i = -2; i <= 2; i++) { const a = i * 0.56, p = new THREE.Group();
      p.add(mesh(pg, dbl(0xffc928, { metalness: 0.85, roughness: 0.3 }))); p.add(mesh(ig, dbl(0xc8102e), 0, 0, 0.002)); p.add(mesh(new THREE.SphereGeometry(0.011, 10, 8), glow(0xffe680), 0, 0.058, 0.006));
      p.position.set(Math.sin(a) * R * 1.06, FY + 0.012, Math.cos(a) * R * 1.06 - 0.008); p.rotation.y = a; p.rotation.x = -0.2; g.add(p); }
    g.add(mesh(new THREE.SphereGeometry(0.022, 12, 10), gold(), 0, FY + R * 0.97, -0.008));
    for (const sd of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.036, 0.26, 0.006), dbl(0xc8102e), sd * R * 0.98, FY - 0.14, -0.035));
    return g; },
  // cà sa: dải đỏ viền vàng vắt chéo từ vai trái xuống hông phải
  kasaya: () => { const g = new THREE.Group();
    const band = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.085, 30, 1, true).scale(1, 1, 0.74), dbl(0xc8102e, { roughness: 0.7, emissive: 0xc8102e, emissiveIntensity: 0.25 }));
    const e1 = mesh(new THREE.TorusGeometry(0.2, 0.007, 6, 30).rotateX(PI / 2).scale(1, 1, 0.74), gold(), 0, 0.043, 0), e2 = mesh(new THREE.TorusGeometry(0.2, 0.007, 6, 30).rotateX(PI / 2).scale(1, 1, 0.74), gold(), 0, -0.043, 0);
    const s = new THREE.Group(); s.add(band, e1, e2); s.rotation.z = -0.72; s.position.set(0, -0.05, 0.0); g.add(s);
    g.add(mesh(new THREE.TorusGeometry(0.028, 0.008, 8, 18), gold(), 0.105, 0.045, 0.118));
    return g; },
  // vòng kim cô có hoa văn cuộn trước trán + hai lông trĩ dài
  kimCo: () => { const g = new THREE.Group(), R = HR * 1.03;
    g.add(mesh(new THREE.TorusGeometry(R, 0.011, 8, 36).rotateX(PI / 2).scale(1, 1, 1.05), gold(), 0, FY, -0.008));
    for (const sd of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.02, 0.007, 6, 16, PI * 1.5).rotateZ(sd > 0 ? -PI * 0.25 : PI * 0.75), gold(), sd * 0.021, FY + 0.022, R * 1.05 - 0.004));
    g.add(mesh(new THREE.SphereGeometry(0.012, 10, 8), glow(0xff3d3d), 0, FY + 0.004, R * 1.05 + 0.004));
    for (const sd of [-1, 1]) {
      const pts = [[sd * 0.04, TY - 0.03, -0.03], [sd * 0.09, TY + 0.18, -0.1], [sd * 0.17, TY + 0.38, -0.24], [sd * 0.27, TY + 0.5, -0.44], [sd * 0.36, TY + 0.5, -0.62]].map(p => new THREE.Vector3(...p));
      const cv = new THREE.CatmullRomCurve3(pts);
      g.add(mesh(new THREE.TubeGeometry(cv, 20, 0.012, 6), col(0xb5341c)));
      for (let i = 1; i < 7; i++) { const p = cv.getPoint(i / 7.5 + 0.06); g.add(mesh(new THREE.SphereGeometry(0.0155, 8, 6), col(i % 2 ? 0xffe9b0 : 0x2a1a10), p.x, p.y, p.z)); }
    }
    return g; },
  scarf: c => { const g = new THREE.Group(); g.add(mesh(new THREE.TorusGeometry(0.075, 0.026, 8, 20).rotateX(PI / 2).scale(1, 0.8, 1), col(c), 0, 0.13, 0.0)); g.add(mesh(new THREE.BoxGeometry(0.06, 0.2, 0.012).rotateZ(0.2), dbl(c), 0.06, 0.02, 0.105)); return g; },
  // váy da hổ quấn hông
  tiger: () => mesh(new THREE.CylinderGeometry(0.175, 0.23, 0.2, 26, 1, true).scale(1, 1, 0.82), tigerMat(), 0, -0.07, 0.0),
  // mũi + tai heo (to, vểnh ra ngoài tóc), bụng phệ thắt đai
  pig: () => { const g = new THREE.Group(), pink = col(0xf5a3b4), R = HR;
    g.add(mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.045, 20).rotateX(PI / 2), pink, 0, 0.052, 0.112));
    g.add(mesh(new THREE.CircleGeometry(0.036, 20), col(0xe98aa0), 0, 0.052, 0.1352));
    for (const sd of [-1, 1]) g.add(mesh(new THREE.CircleGeometry(0.0085, 10).scale(0.8, 1.3, 1), black(), sd * 0.014, 0.052, 0.136));
    for (const sd of [-1, 1]) { const e = mesh(new THREE.ConeGeometry(0.075, 0.15, 4).scale(1, 1, 0.22).rotateZ(-sd * 2.0), pink, sd * (R + 0.045), FY + 0.03, 0.01); e.rotation.x = 0.25; g.add(e); }
    return g; },
  belly: c => { const g = new THREE.Group(); g.add(mesh(new THREE.SphereGeometry(0.155, 20, 14).scale(1.08, 0.95, 0.9), col(c), 0, 0.02, 0.06)); g.add(mesh(new THREE.TorusGeometry(0.168, 0.016, 8, 26).rotateX(PI / 2).scale(1.05, 1, 0.95), col(0x16161b), 0, -0.035, 0.045)); g.add(mesh(new THREE.BoxGeometry(0.05, 0.05, 0.012), gold(), 0, -0.035, 0.208)); return g; },
  // giới cô vàng có trăng khuyết + râu quai nón
  moonBand: () => { const g = new THREE.Group(), R = HR * 1.03;
    g.add(mesh(new THREE.TorusGeometry(R, 0.012, 8, 36).rotateX(PI / 2).scale(1, 1, 1.05), gold(), 0, FY, -0.008));
    g.add(mesh(new THREE.TorusGeometry(0.03, 0.009, 8, 18, PI), gold(), 0, FY + 0.016, R * 1.05));
    return g; },
  beardV: () => { const g = new THREE.Group(), c = col(0x241710);
    g.add(mesh(new THREE.SphereGeometry(0.072, 18, 10, 0, TAU, PI * 0.5, PI * 0.5).scale(1.06, 0.95, 0.9), c, 0, 0.022, 0.046));
    g.add(mesh(new THREE.ConeGeometry(0.03, 0.07, 10).rotateX(PI).scale(1, 1, 0.7), c, 0, -0.07, 0.07));
    return g; },
  mala: () => { const g = new THREE.Group(), n = 15; for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.2; g.add(mesh(new THREE.SphereGeometry(0.016, 10, 8), col(0x6a3c1c), Math.sin(a) * 0.105, 0.125 - Math.cos(a) * 0.15, Math.cos(a) * 0.095 + 0.03)); } g.add(mesh(new THREE.SphereGeometry(0.024, 10, 8), glow(0xffc928), 0, -0.035, 0.127)); return g; },
  skulls: () => { const g = new THREE.Group(), n = 9; for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.34; g.add(mesh(new THREE.SphereGeometry(0.036, 12, 10), col(0xf1ead6), Math.sin(a) * 0.15, 0.13 - Math.cos(a) * 0.135, Math.cos(a) * 0.115 + 0.01)); } return g; },
};
export const DJ_COSTUMES = [
  { id: 'dj_tang', name: 'Đường Tăng', hideHat: true,
    build: a => { a('Head', DJP.tyLu()); a('Spine2', DJP.kasaya()); a('Spine2', DJP.mala()); a('Neck', DJP.phones(0xf2ead8, 0xffc928)); a('Spine2', onBack(P.ringStaff(), 0.45, 0.02, true)); } },
  { id: 'dj_wukong', name: 'Tôn Ngộ Không', hideHat: true,
    build: a => { a('Head', DJP.kimCo()); a('Spine2', DJP.scarf(0xc8102e)); a('Hips', DJP.tiger()); a('Hips', P.tail(0x9a5a2a)); a('Neck', DJP.phones(0xc8102e, 0xffc928)); a('Spine2', onBack(P.staff(col(0xc8102e), gold(), 1.75), -0.5)); } },
  { id: 'dj_batgioi', name: 'Trư Bát Giới', hideHat: true,
    build: a => { a('Head', DJP.pig()); a('Spine', DJP.belly(0x27356a)); a('Neck', DJP.phones(0x16161b, 0xff5fa8)); a('Spine2', onBack(P.rake(), 0.5, 0.02, true)); } },
  { id: 'dj_satang', name: 'Sa Tăng', hideHat: true,
    build: a => { a('Head', DJP.moonBand()); a('Head', DJP.beardV()); a('Spine2', DJP.skulls()); a('Neck', DJP.phones(0x16161b, 0x3dd9ff)); a('Spine2', onBack(P.spade(), -0.45, 0.02, true)); } },
];

// ---------- gắn vào nhân vật ----------
const _q = new THREE.Quaternion();
export function applyCostume(av, id) {
  if (av.costumeObjs) for (const o of av.costumeObjs) { o.parent && o.parent.remove(o); o.traverse(x => { if (x.geometry) x.geometry.dispose(); }); }
  av.costumeObjs = [];
  av.costume = id ? COSTUMES.find(c => c.id === id) || DJ_COSTUMES.find(c => c.id === id) || null : null;
  av.costumeTint = null;
  if (!av.costume) return;
  const t = av.t, c = av.costume;
  const tt = c.tints ? pick(c.tints) : c.tint;
  av.costumeTint = tt;
  const attach = (boneName, obj) => {
    let b = av.bones[boneName];
    if (!b && boneName === 'RightHand') { b = av.bones.RightForeArm; boneName = 'RightForeArm'; }
    if (!b || !t.restWorld[boneName]) return;
    const holder = new THREE.Object3D();
    // đưa về khung của nhân vật lúc đứng nghỉ (mặt nhìn +Z), mét
    _q.copy(t.restWorld[boneName]).invert();
    if (t.flip) _q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), PI));
    holder.quaternion.copy(_q);
    holder.scale.setScalar(1 / (t.norm * (t.boneScale[boneName] || 1)));
    holder.add(obj);
    b.add(holder);
    av.costumeObjs.push(holder);
  };
  c.build(attach, t.headLen, tt);
  return c;
}
// gắn một vật vào xương (khung đứng nghỉ, đơn vị mét, +Z trước mặt) — trả về vật chứa
export function attachProp(av, boneName, obj) {
  const t = av.t;
  let b = av.bones[boneName];
  if (!b && boneName === 'RightHand') { b = av.bones.RightForeArm; boneName = 'RightForeArm'; }
  if (!b || !t.restWorld[boneName]) return null;
  const holder = new THREE.Object3D();
  _q.copy(t.restWorld[boneName]).invert();
  if (t.flip) _q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), PI));
  holder.quaternion.copy(_q);
  holder.scale.setScalar(1 / (t.norm * (t.boneScale[boneName] || 1)));
  holder.add(obj); b.add(holder);
  return holder;
}
export function randomCostumeId() { return pick(COSTUMES).id; }

// đạo cụ phụ từ quà (vương miện, đôi cánh) — gắn/bỏ độc lập với hoá trang
export function setExtra(av, key, on) {
  av.extras = av.extras || {};
  const cur = av.extras[key];
  if (!!cur === !!on) return;
  if (cur) { cur.parent && cur.parent.remove(cur); cur.traverse(x => { if (x.geometry) x.geometry.dispose(); }); delete av.extras[key]; return; }
  const t = av.t;
  const bone = key === 'crown' ? 'Head' : 'Spine2';
  const b = av.bones[bone]; if (!b || !t.restWorld[bone]) return;
  const holder = new THREE.Object3D();
  _q.copy(t.restWorld[bone]).invert();
  if (t.flip) _q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), PI));
  holder.quaternion.copy(_q);
  holder.scale.setScalar(1 / (t.norm * (t.boneScale[bone] || 1)));
  holder.add(key === 'crown' ? P.crown(t.headLen) : P.wingsPair(0xffffff));
  b.add(holder);
  av.extras[key] = holder;
}

// chuyển động nhỏ: đuôi vẫy, cánh vỗ
export function animateCostume(av, t) {
  const list = [...(av.costumeObjs || []), ...Object.values(av.extras || {})];
  for (const h of list) {
    const o = h.children[0];
    if (!o) continue;
    if (o.userData.wag) o.rotation.y = Math.sin(t * 4 + (av.seed || 0)) * 0.4;
    if (o.userData.spin) o.rotation.y = t * 3;
    if (o.userData.flap) o.children.forEach((w, i) => { w.rotation.y = (i ? 1 : -1) * (0.5 + Math.sin(t * 6) * 0.3); });
  }
}
