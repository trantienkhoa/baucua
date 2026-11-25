// =====================================================================================
// TÀU ĐÀ LẠT – TRẠI MÁT · cảnh 3D (Three.js)
// Đầu máy hơi nước + 2 Lareine + VIP 1, VIP 2 + ngồi mềm + ngồi cứng chạy trên cao nguyên Lâm Viên.
// Hành khách là nhân vật VRoid (.vrm, dùng chung với Vũ Trường Neon) ngồi trên băng ghế dọc hai vách toa,
// nhìn thấy qua cửa sổ kính. Khách ở xa máy quay dùng hình người đơn giản để máy chạy nhẹ.
// game.js gọi R3D.frame(state) mỗi khung hình; HUD, âm thanh, pháo hoa vẫn do game.js lo (canvas 2D đè lên trên).
// =====================================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const Q = new URLSearchParams(location.search);
const LOW = Q.get('q') === 'low';
const W = 1080, H = 1920;
// dữ liệu tuyến thật (OpenStreetMap + độ cao địa hình), dựng sẵn bằng tools/build-route.js
const ROUTE = Q.get('osm') === '0' ? null : await fetch('route.json').then(r => r.ok ? r.json() : null).catch(() => null);
const ROUTE_M = ROUTE ? ROUTE.length : 7 * 1000 / 6;   // chiều dài tuyến trong cảnh (m) — bản đồ thật: 6,53 km
const VIS = ROUTE_M / 7;                               // 1 "km trò chơi" = VIS mét cảnh
const LOCO_L = 11, CAR_L = 13, GAP = 1.2, CAR_W = 2.7, FLOOR = 1.15, TRAIN_LEN = LOCO_L + 6 * (CAR_L + GAP);
const CAR_ORDER = ['lareine1', 'lareine2', 'vip1', 'vip2', 'mem', 'cung'];
const CAR_NO = { lareine1: '51612', lareine2: '51618', vip1: '51620', vip2: '51622', mem: '5', cung: '6' }; // số hiệu toa xe
const CLS = k => k.replace(/\d$/, '');

// ---------------------------------------------------------------- tiện ích
const hash = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const hashStr = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
function vnoise(x, y) { // nhiễu giá trị 2D mượt
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const r = (a, b) => hash(a * 57 + b * 131, 7);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(r(xi, yi), r(xi + 1, yi), u), lerp(r(xi, yi + 1), r(xi + 1, yi + 1), u), v);
}
const fbm = (x, y) => 0.55 * vnoise(x, y) + 0.3 * vnoise(x * 2.1, y * 2.1) + 0.15 * vnoise(x * 4.3, y * 4.3);
const COLORS = ['#c0392b', '#2e86de', '#16a085', '#8e44ad', '#d35400', '#27ae60', '#e84393', '#6c5ce7'];
const colorOf = s => COLORS[hashStr(s) % COLORS.length];
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.userData.canvas = c;
  return t;
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...o });
const FONT = '"Be Vietnam Pro","Segoe UI",sans-serif';

// zone cảnh theo km thật
function zoneAt(x) {
  const k = x / VIS;
  if (k < 0.45 || k > 6.55) return 'town';
  if (k < 2.0) return 'pine';
  if (k < 3.2) return 'farm';
  if (k < 4.2) return 'hill';
  if (k < 5.5) return 'flower';
  return 'glass';
}
// vùng ga (không trồng cây): ga Đà Lạt quanh x = -48, ga Trại Mát quanh x = ROUTE_M - 48
const STATION_X = [-TRAIN_LEN / 2, ROUTE_M - TRAIN_LEN / 2];
const nearStation = (x, z, pad = 0) => STATION_X.some(sx => Math.abs(x - sx) < 95 + pad && z > -14 - pad && z < 48 + pad);

// ---------------------------------------------------------------- khởi tạo
const canvas = document.getElementById('gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance' });
} catch (e) { console.warn('Không bật được WebGL → dùng bản 2D', e); window.R3D = { ok: false }; throw e; }
const RS = LOW ? 0.6 : 0.85; // độ phân giải dựng hình (CSS vẫn phóng lên đủ 1080 x 1920)
renderer.setPixelRatio(1); renderer.setSize(Math.round(W * RS), Math.round(H * RS), false);
renderer.shadowMap.enabled = !LOW; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.3, 5000);
scene.fog = new THREE.Fog(0xcfe3ef, 120, 1500);

// bầu trời
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color('#6fb6ee') }, bot: { value: new THREE.Color('#d6eefc') } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.08,0.0,1.0); gl_FragColor = vec4(mix(bot, top, pow(h,0.7)),1.0); }',
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), skyMat); scene.add(sky);
const starGeo = new THREE.BufferGeometry(); { const p = []; for (let i = 0; i < 900; i++) { const a = hash(i, 1) * Math.PI * 2, e = 0.08 + hash(i, 2) * 1.3; p.push(Math.cos(a) * Math.cos(e) * 3800, Math.sin(e) * 3800, Math.sin(a) * Math.cos(e) * 3800); } starGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); }
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); scene.add(stars);
const glowTex = canvasTex(128, 128, (g, w) => { const r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff2c8, fog: false, depthWrite: false, transparent: true })); sun.scale.set(420, 420, 1); scene.add(sun);
const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g) => { g.fillStyle = '#f4f1dc'; g.beginPath(); g.arc(64, 64, 40, 0, 7); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(82, 52, 36, 0, 7); g.fill(); }), fog: false, depthWrite: false, transparent: true })); moon.scale.set(260, 260, 1); scene.add(moon);
const clouds = [];
{ const ct = canvasTex(256, 128, (g) => { for (let i = 0; i < 9; i++) { const r = g.createRadialGradient(40 + i * 22, 70 - Math.sin(i) * 14, 4, 40 + i * 22, 70 - Math.sin(i) * 14, 42); r.addColorStop(0, 'rgba(255,255,255,.95)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 128); } });
  for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, transparent: true, depthWrite: false, fog: false, opacity: 0.9 })); s.position.set(-800 + hash(i, 3) * (ROUTE_M + 1600), 260 + hash(i, 4) * 260, -600 - hash(i, 5) * 1800); s.scale.set(380 + hash(i, 6) * 300, 150 + hash(i, 7) * 90, 1); scene.add(s); clouds.push(s); } }

// ánh sáng
const hemi = new THREE.HemisphereLight(0xdfefff, 0x4a6a3a, 1.1); scene.add(hemi);
const sunLight = new THREE.DirectionalLight(0xfff1d8, 2.2);
sunLight.castShadow = !LOW; sunLight.shadow.mapSize.set(2048, 2048);
Object.assign(sunLight.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 600 }); sunLight.shadow.bias = -0.0006;
scene.add(sunLight, sunLight.target);

// ---------------------------------------------------------------- địa hình
// độ cao thật (tương đối so với nền đường ray) từ lưới route.json, nội suy song tuyến
function demH(x, z) {
  const G = ROUTE.grid, fi = (x - G.s0) / G.step, fj = (z - G.z0) / G.step;
  const i = clamp(Math.floor(fi), 0, G.ns - 2), j = clamp(Math.floor(fj), 0, G.nz - 2), u = clamp(fi - i, 0, 1), v = clamp(fj - j, 0, 1), Hh = ROUTE.H;
  return lerp(lerp(Hh[j * G.ns + i], Hh[j * G.ns + i + 1], u), lerp(Hh[(j + 1) * G.ns + i], Hh[(j + 1) * G.ns + i + 1], u), v);
}
function luAt(x, z) { const G = ROUTE.grid, i = Math.round((x - G.s0) / G.step), j = Math.round((z - G.z0) / G.step); return i < 0 || j < 0 || i >= G.ns || j >= G.nz ? 0 : ROUTE.LU[j * G.ns + i]; }
// ---- độ cao đường ray: tổng chênh đúng thực tế (ga Trại Mát cao hơn ga Đà Lạt ~53 m),
// phần lớn dồn vào đoạn "Dốc cao" (km 3,2 – 4,2) để đoàn tàu leo dốc thấy rõ
const TRACK_RISE = ROUTE && ROUTE.railElev ? ROUTE.railElev[1] - ROUTE.railElev[0] : 30;
function trackY(x) { const k = x / VIS; return TRACK_RISE * (0.18 * clamp(k / 7, 0, 1) + 0.82 * smooth((k - 3.3) / 0.8)); } // ~43 m trên 800 m ở đoạn "Dốc cao"
const trackSlope = x => (trackY(x + 2) - trackY(x - 2)) / 4;
function groundH(x, z) { return groundRel(x, z) + trackY(x); } // độ cao thế giới
function groundRel(x, z) { // độ cao so với mặt đường ray tại cùng vị trí dọc tuyến
  if (ROUTE) { // nền đường ray và sân ga phẳng, ra xa dần theo đúng địa hình thật
    const az = Math.abs(z), flat = nearStation(x, z) ? 1 : 1 - smooth((az - 6) / 14);
    return lerp(demH(x, z), 0, flat);
  }
  const k = x / VIS;
  if (Math.abs(z) < 7 || nearStation(x, z)) return 0;
  if (z < 0) {
    const d = -z - 7;
    let h = d * 0.05 + 7 * (1 - Math.exp(-d / 50)) + 26 * fbm(x * 0.006 + 3, z * 0.007) * smooth(d / 90);
    if (k > 3.0 && k < 4.4) h += 14 * smooth(Math.min(k - 3.0, 4.4 - k) / 0.35) * smooth(d / 40); // đoạn dốc cao
    return h * smooth(d / 6);
  }
  const d = z - 7;
  return (-0.8 * smooth(d / 18) + 9 * fbm(x * 0.008 + 11, z * 0.01) * smooth((d - 25) / 120)) * smooth(d / 5);
}
function buildTerrain() {
  const x0 = ROUTE ? ROUTE.grid.s0 : -420, x1 = ROUTE ? ROUTE.grid.s1 : ROUTE_M + 420, z0 = ROUTE ? ROUTE.grid.z0 : -520, z1 = ROUTE ? ROUTE.grid.z1 : 260, sx = ROUTE ? 8 : 6, sz = ROUTE ? 8 : 6;
  const nx = Math.ceil((x1 - x0) / sx), nz = Math.ceil((z1 - z0) / sz);
  const pos = [], col = [], idx = [];
  const c = new THREE.Color(), cs = {
    grass: new THREE.Color('#5f9150'), grass2: new THREE.Color('#78a85a'), dry: new THREE.Color('#9aa86a'), terr1: new THREE.Color('#86bd5e'), terr2: new THREE.Color('#5c9844'), soil: new THREE.Color('#8a6b4a'),
    blue: new THREE.Color('#7d8cff'), purple: new THREE.Color('#b28dff'), pink: new THREE.Color('#ff9ad5'), bed: new THREE.Color('#8a7f72'), light: new THREE.Color('#9cc78a'),
  };
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + i * sx, z = z0 + j * sz, h = groundH(x, z);
    pos.push(x, h, z);
    const zn = zoneAt(x), n = fbm(x * 0.03, z * 0.03);
    c.copy(cs.grass).lerp(cs.grass2, n);
    if (ROUTE) { // màu đất theo loại đất thật trên bản đồ
      const lu = luAt(x, z);
      if (Math.abs(z) < 3.5) c.copy(cs.bed);
      else if (lu === 1) c.set('#3f6e3a').lerp(cs.grass, n * 0.3);
      else if (lu === 2) { const band = Math.floor(h * 0.9 + z * 0.05) & 1; c.copy(band ? cs.terr1 : cs.terr2); }
      else if (lu === 3) c.set('#cfd8cf');
      else if (lu === 4) c.set('#8c9a74').lerp(cs.grass, n * 0.5);
      else if (lu === 6) c.set('#4a7aa0');
      else if (lu === 7) c.set('#b9a77a');
      else if (h > 25) c.lerp(cs.dry, 0.25);
      col.push(c.r, c.g, c.b); continue;
    }
    if (Math.abs(z) < 3.5) c.copy(cs.bed);
    else if (zn === 'farm' && z < -9 && z > -220) { const band = Math.floor(h * 0.9 + z * 0.02) & 1; c.copy(band ? cs.terr1 : cs.terr2); if (fbm(x * 0.05, z * 0.05) > 0.72) c.copy(cs.soil); }
    else if (zn === 'flower' && Math.abs(z) < 90 && fbm(x * 0.04 + 5, z * 0.04) > 0.55) c.copy([cs.blue, cs.purple, cs.pink][Math.floor(hash(Math.floor(x / 9), Math.floor(z / 9)) * 3)]).lerp(cs.grass, 0.25);
    else if (zn === 'glass') c.lerp(cs.light, 0.5);
    else if (h > 22) c.lerp(cs.dry, 0.3);
    col.push(c.r, c.g, c.b);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, d = a + nx + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  m.receiveShadow = true; scene.add(m);
  // dãy núi xa + núi Langbiang hai đỉnh
  const far = new THREE.PlaneGeometry(ROUTE_M + 4000, 900, 160, 30); far.rotateX(-Math.PI / 2);
  const fp = far.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i); fp.setY(i, 40 + 170 * fbm(x * 0.0022, z * 0.004 + 9) * smooth((-z + 450) / 400)); }
  far.computeVertexNormals();
  const farM = new THREE.Mesh(far, std('#5f7f8f', { roughness: 1 })); farM.position.set(ROUTE_M / 2, -10, -1000); scene.add(farM);
  const lang = new THREE.Group();
  for (const [dx, hh, r] of [[-160, 460, 360], [150, 430, 330], [0, 300, 520]]) { const g = new THREE.ConeGeometry(r, hh, 9, 4); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { if (p.getY(i) < hh / 2 - 1) { p.setX(i, p.getX(i) * (0.85 + hash(i, 3) * 0.3)); p.setZ(i, p.getZ(i) * (0.85 + hash(i, 4) * 0.3)); } } g.computeVertexNormals(); const m2 = new THREE.Mesh(g, std('#56708a', { roughness: 1, flatShading: true })); m2.position.set(dx, hh / 2 - 30, 0); lang.add(m2); }
  lang.position.set(ROUTE_M * 0.55, 0, -1700); scene.add(lang);
}
buildTerrain();

// ---------------------------------------------------------------- đường ray
{
  // nền đá, tà vẹt, 2 thanh ray bám theo độ cao đường ray (có đoạn lên dốc)
  const len = ROUTE_M + 900, x0 = -450, SEG = 6, nseg = Math.ceil(len / SEG), dummy = new THREE.Object3D();
  const segMat = (x, y, z, len2) => { const a = Math.atan(trackSlope(x)); dummy.position.set(x, y + trackY(x), z); dummy.rotation.set(0, 0, a); dummy.scale.set(len2 / Math.cos(a), 1, 1); dummy.updateMatrix(); return dummy.matrix; };
  const ballast = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.3, 3.2), std('#7d7064', { roughness: 1 }), nseg);
  const rails = [-0.5, 0.5].map(() => new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.14, 0.08), std('#b8bcc4', { metalness: 0.8, roughness: 0.3 }), nseg));
  for (let i = 0; i < nseg; i++) { const x = x0 + (i + 0.5) * SEG; ballast.setMatrixAt(i, segMat(x, 0.1, 0, SEG + 0.05)); rails[0].setMatrixAt(i, segMat(x, 0.44, -0.5, SEG + 0.02)); rails[1].setMatrixAt(i, segMat(x, 0.44, 0.5, SEG + 0.02)); }
  ballast.receiveShadow = true; scene.add(ballast, ...rails);
  const n = Math.ceil(len / 0.7), sl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.14, 1.9), std('#5a3a24'), n);
  for (let i = 0; i < n; i++) { const x = x0 + i * 0.7; dummy.position.set(x, 0.3 + trackY(x), 0); dummy.rotation.set(0, 0, Math.atan(trackSlope(x))); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); sl.setMatrixAt(i, dummy.matrix); } sl.receiveShadow = true; scene.add(sl);
}

// ---------------------------------------------------------------- cây thông, hoa, nhà kính, ruộng rau, biệt thự
const dummy = new THREE.Object3D();
function scatter(count, fn) { const out = []; for (let i = 0; i < count * 6 && out.length < count; i++) { const r = fn(i); if (r) out.push(r); } return out; }
// ô đã có nhà / đường (theo bản đồ thật) → không trồng cây đè lên
const OCC = new Set(), occKey = (x, z) => Math.floor(x / 5) + ':' + Math.floor(z / 5);
if (ROUTE) {
  for (const b of ROUTE.buildings) { let r = 0; for (const [px, pz] of b.pts) r = Math.max(r, Math.hypot(px, pz)); for (let x = b.s - r - 3; x <= b.s + r + 3; x += 5) for (let z = b.z - r - 3; z <= b.z + r + 3; z += 5) OCC.add(occKey(x, z)); }
  for (const rd of ROUTE.roads) for (let i = 1; i < rd.pts.length; i++) { const [a0, a1] = rd.pts[i - 1], [b0, b1] = rd.pts[i], n = Math.ceil(Math.hypot(b0 - a0, b1 - a1) / 4); for (let k = 0; k <= n; k++) { const x = lerp(a0, b0, k / n), z = lerp(a1, b1, k / n); OCC.add(occKey(x, z)); OCC.add(occKey(x + 4, z)); OCC.add(occKey(x, z + 4)); } }
}
{ // thông ba lá Đà Lạt: thân cao, tán nhiều tầng xoè ngang
  const DENS = { pine: 1, hill: 0.9, town: 0.35, farm: 0.25, flower: 0.3, glass: 0.22 };
  const LUD = [0.42, 0.95, 0.05, 0, 0.1, 0.25, 0, 0.3]; // mật độ thông theo loại đất thật: trống, rừng, ruộng, nhà kính, dân cư, cỏ, nước, chùa
  const spots = ROUTE ? scatter(LOW ? 3500 : 7000, i => {
    const x = ROUTE.grid.s0 + hash(i, 11) * (ROUTE.grid.s1 - ROUTE.grid.s0), z = -430 + hash(i, 13) * 860;
    if (Math.abs(z) < 12 || (z > 8 && z < 38) || nearStation(x, z, 6) || OCC.has(occKey(x, z))) return null; // hành lang đường ray + chỗ đặt máy quay để trống
    const zn = zoneAt(x), dens = zn === 'pine' ? Math.max(LUD[luAt(x, z)], 0.9) : zn === 'hill' ? Math.max(LUD[luAt(x, z)], 0.7) : zn === 'farm' || zn === 'glass' || zn === 'flower' ? LUD[luAt(x, z)] * 0.5 : LUD[luAt(x, z)];
    if (hash(i, 15) > dens) return null; // "Đồi thông": thông dày; vùng rau / hoa / nhà kính thưa cây để thấy ruộng
    if ((zn === 'farm' || zn === 'flower' || zn === 'glass') && Math.abs(z) < 135) return null; // chừa đất cho ruộng rau, luống hoa, nhà kính
    return { x, z, s: 0.75 + hash(i, 17) * 0.75, r: hash(i, 18) * 6.28 };
  }) : scatter(LOW ? 2200 : 4200, i => {
    // phía máy quay (+Z) chỉ trồng cây ở xa để không che đoàn tàu; quanh ga chừa khoảng trống cho góc quay toàn cảnh
    const x = -380 + hash(i, 11) * (ROUTE_M + 760), side = hash(i, 12) < 0.8 ? -1 : 1;
    const z = side < 0 ? -11 - Math.pow(hash(i, 13), 1.6) * 480 : 95 + Math.pow(hash(i, 14), 1.4) * 160;
    if (nearStation(x, z, 4) || hash(i, 15) > DENS[zoneAt(x)]) return null;
    if (z < 0 && STATION_X.some(sx => Math.abs(x - sx) < 130) && z > -75) return null;
    if (zoneAt(x) === 'glass' && Math.abs(z) < 100 && hash(i, 16) < 0.8) return null;
    return { x, z, s: 0.75 + hash(i, 17) * 0.75, r: hash(i, 18) * 6.28 };
  });
  const trunk = new THREE.CylinderGeometry(0.18, 0.32, 9, 6); trunk.translate(0, 4.5, 0);
  const tiers = []; for (let k = 0; k < 4; k++) { const g = new THREE.SphereGeometry(2.6 - k * 0.45, 7, 4); g.scale(1, 0.38, 1); g.translate((k % 2 ? 0.4 : -0.4), 6.2 + k * 1.55, 0); tiers.push(g); }
  const crown = mergeGeometries(tiers.map(g => g.toNonIndexed()));
  const tI = new THREE.InstancedMesh(trunk, std('#6a4a30'), spots.length), cI = new THREE.InstancedMesh(crown, std('#ffffff', { roughness: 0.85 }), spots.length);
  const col = new THREE.Color();
  spots.forEach((p, i) => { dummy.position.set(p.x, groundH(p.x, p.z) - 0.2, p.z); dummy.rotation.set(0, p.r, 0); dummy.scale.setScalar(p.s * 1.3); dummy.updateMatrix(); tI.setMatrixAt(i, dummy.matrix); cI.setMatrixAt(i, dummy.matrix); cI.setColorAt(i, col.set('#4f8f50').offsetHSL(hash(i, 3) * 0.05 - 0.025, 0, hash(i, 4) * 0.1 - 0.05)); });
  tI.castShadow = cI.castShadow = !LOW; scene.add(tI, cI); // tán thông không nhận bóng (tránh tự đổ bóng làm đen)
}
if (!ROUTE) { // cẩm tú cầu (xanh, tím, hồng) – dày ở thung lũng hoa, lác đác ở ga (chỉ dùng khi không có dữ liệu bản đồ thật)
  const spots = scatter(LOW ? 1300 : 2600, i => {
    // phía máy quay: một hàng hoa sát đường ray (z 4.5–8) + cánh đồng hoa ở xa; phía sau: đồi hoa
    const front = hash(i, 22) < 0.45, x = -200 + hash(i, 21) * (ROUTE_M + 400), zn = zoneAt(x);
    const z = front ? (hash(i, 23) < 0.6 ? 4.5 + hash(i, 28) * 3.5 : 45 + hash(i, 29) * 60) : -(5.5 + Math.pow(hash(i, 23), 1.5) * 70);
    if (zn !== 'flower' && !(zn === 'town' && hash(i, 24) < 0.25) && hash(i, 25) > 0.06) return null;
    if (nearStation(x, z) && !(z > 30)) return null;
    return { x, z, s: 0.5 + hash(i, 26) * 0.6 };
  });
  const bush = new THREE.IcosahedronGeometry(0.9, 1); bush.scale(1.25, 0.8, 1.25);
  const I = new THREE.InstancedMesh(bush, std('#ffffff', { roughness: 0.8 }), spots.length), cols = ['#6c7cff', '#9b7bff', '#ff8fcf', '#5ab8ff', '#c4a0ff', '#ffffff'].map(c => new THREE.Color(c));
  spots.forEach((p, i) => { dummy.position.set(p.x, groundH(p.x, p.z) + 0.35 * p.s, p.z); dummy.rotation.set(0, hash(i, 3) * 6, 0); dummy.scale.setScalar(p.s); dummy.updateMatrix(); I.setMatrixAt(i, dummy.matrix); I.setColorAt(i, cols[Math.floor(hash(i, 27) * cols.length)]); });
  I.castShadow = !LOW; scene.add(I);
}
if (!ROUTE) { // luống rau bậc thang + người nông dân đội nón lá (chỉ khi không có dữ liệu bản đồ thật)
  const spots = scatter(LOW ? 700 : 1500, i => { const x = 2.0 * VIS + hash(i, 41) * 1.25 * VIS, z = -10 - hash(i, 42) * 200; return { x, z }; });
  const I = new THREE.InstancedMesh(new THREE.BoxGeometry(7, 0.45, 0.9), std('#7fbf55'), spots.length), cols = ['#7fbf55', '#a6d46a', '#5ea844', '#c9e07a'].map(c => new THREE.Color(c));
  spots.forEach((p, i) => { dummy.position.set(p.x, groundH(p.x, p.z) + 0.2, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); I.setMatrixAt(i, dummy.matrix); I.setColorAt(i, cols[i % 4]); });
  I.receiveShadow = true; scene.add(I);
  const hat = new THREE.ConeGeometry(0.42, 0.3, 12); hat.translate(0, 1.75, 0);
  const body = new THREE.CylinderGeometry(0.18, 0.22, 1.2, 8); body.translate(0, 0.9, 0);
  const n = 40, hI = new THREE.InstancedMesh(hat, std('#e8cf8a'), n), bI = new THREE.InstancedMesh(body, std('#3b5998'), n);
  for (let i = 0; i < n; i++) { const x = 2.0 * VIS + hash(i, 51) * 1.25 * VIS, z = -12 - hash(i, 52) * 60; dummy.position.set(x, groundH(x, z), z); dummy.updateMatrix(); hI.setMatrixAt(i, dummy.matrix); bI.setMatrixAt(i, dummy.matrix); }
  scene.add(hI, bI);
}
// ---------------------------------------------------------------- nhà dân + nhà kính trồng hoa dọc đường (chi tiết, mặt tiền vẽ như thật)
// Mỗi kiểu nhà dùng chung một bộ hình + ảnh mặt tiền (InstancedMesh) để chạy nhẹ:
//  · nhà ống 3 tầng sơn màu, ban công sắt, cửa kính, bảng hiệu "CÀ PHÊ / TẠP HÓA / HOMESTAY", mái ngói đỏ
//  · biệt thự kiểu Pháp 2 tầng, cửa chớp xanh, cửa vòm, ống khói, mái ngói
//  · nhà vườn 1 tầng mái tôn, cửa sổ khung xanh, hiên gỗ
//  · nhà kính trồng hoa: khung vòm sắt, màng nylon trắng đục, bên trong là các luống hoa nhiều màu
const PALETTE = ['#f4e3b5', '#cfe8d8', '#f6d0d0', '#cfe0f2', '#fbf6ec', '#f2d49b', '#e3d6f0', '#d9ecc3'];
function plaster(g, w, h, base) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${hash(i, 1) < 0.5 ? '0,0,0' : '255,255,255'},${0.025 + hash(i, 2) * 0.03})`; const s = 6 + hash(i, 3) * 40; g.fillRect(hash(i, 4) * w, hash(i, 5) * h, s, s * 0.6); }
  const st = g.createLinearGradient(0, h * 0.8, 0, h); st.addColorStop(0, 'rgba(60,40,20,0)'); st.addColorStop(1, 'rgba(60,40,20,.18)'); g.fillStyle = st; g.fillRect(0, h * 0.8, w, h * 0.2); // vệt ẩm chân tường
}
function windowAt(g, x, y, w, h, frame, shutter, lit) {
  if (shutter) { g.fillStyle = shutter; g.fillRect(x - w * 0.42, y, w * 0.4, h); g.fillRect(x + w * 1.02, y, w * 0.4, h); g.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < h; k += 8) { g.fillRect(x - w * 0.42, y + k, w * 0.4, 2); g.fillRect(x + w * 1.02, y + k, w * 0.4, 2); } }
  g.fillStyle = frame; g.fillRect(x - 5, y - 5, w + 10, h + 10);
  const gl = g.createLinearGradient(x, y, x + w, y + h); gl.addColorStop(0, lit ? '#ffe2a0' : '#9fc3d8'); gl.addColorStop(0.5, lit ? '#ffd27a' : '#5f88a3'); gl.addColorStop(1, lit ? '#f0b860' : '#3c5d73');
  g.fillStyle = gl; g.fillRect(x, y, w, h);
  g.fillStyle = frame; g.fillRect(x + w / 2 - 3, y, 6, h); g.fillRect(x, y + h * 0.38, w, 5);
  g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(x + 4, y + 4); g.lineTo(x + w * 0.35, y + 4); g.lineTo(x + 4, y + h * 0.5); g.fill(); // ánh phản chiếu
  g.fillStyle = '#d8d0c0'; g.fillRect(x - 10, y + h + 4, w + 20, 7); // bậu cửa
}
function flowerPots(g, x, y, w) { for (let k = 0; k < w / 16; k++) { g.fillStyle = '#a0522d'; g.fillRect(x + k * 16, y, 12, 10); g.fillStyle = ['#ff6b8a', '#ffd23f', '#b28dff', '#ff9f43', '#ffffff'][(k + Math.floor(x)) % 5]; g.beginPath(); g.arc(x + k * 16 + 6, y - 4, 7, 0, 7); g.fill(); g.fillStyle = '#3d8a3d'; g.fillRect(x + k * 16 + 2, y - 2, 8, 3); } }
function railing(g, x, y, w, h) { g.strokeStyle = '#2b2b2b'; g.lineWidth = 3; g.strokeRect(x, y, w, h); for (let k = x + 8; k < x + w; k += 9) { g.beginPath(); g.moveTo(k, y); g.lineTo(k, y + h); g.stroke(); } g.beginPath(); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke(); }
function tileTex(base) {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 16; r++) for (let c = 0; c < 10; c++) { const x = c * 26 + (r % 2) * 13, y = r * 16; const gr = g.createLinearGradient(0, y, 0, y + 16); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x + 13, y + 10, 12, 9, 0, 0, Math.PI); g.fill(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(40,60,20,${hash(i, 9) * 0.15})`; g.fillRect(hash(i, 7) * 256, hash(i, 8) * 256, 30, 8); } // rêu
  }, [1, 1]);
}
function tinTex(base) { return canvasTex(256, 256, (g) => { g.fillStyle = base; g.fillRect(0, 0, 256, 256); for (let x = 0; x < 256; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(0.5, 'rgba(0,0,0,.18)'); gr.addColorStop(1, 'rgba(255,255,255,.18)'); g.fillStyle = gr; g.fillRect(x, 0, 16, 256); } for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(120,60,20,${0.08 + hash(i, 3) * 0.1})`; g.fillRect(hash(i, 1) * 256, hash(i, 2) * 256, 10, 40); } }, [1, 1]); }
const SIGNS = ['CÀ PHÊ', 'TẠP HÓA', 'HOMESTAY', 'BÁNH MÌ', 'HOA TƯƠI', 'DÂU TÂY', ''];
function tubeFront(v) { // nhà ống 3 tầng
  return canvasTex(256, 512, (g, w, h) => {
    const base = PALETTE[v % PALETTE.length]; plaster(g, w, h, base);
    const fh = h / 3;
    for (let f = 0; f < 3; f++) { const y = h - (f + 1) * fh; g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, y + fh - 6, w, 6); }
    // tầng trệt: cửa cuốn hoặc cửa xếp + bảng hiệu
    const sign = SIGNS[v % SIGNS.length];
    if (v % 2) { g.fillStyle = '#9a9a9a'; g.fillRect(24, h - fh + 46, w - 48, fh - 50); g.fillStyle = 'rgba(0,0,0,.15)'; for (let k = h - fh + 46; k < h - 4; k += 6) g.fillRect(24, k, w - 48, 2); }
    else { g.fillStyle = '#6b4226'; g.fillRect(24, h - fh + 46, w - 48, fh - 50); for (let k = 0; k < 4; k++) { windowAt(g, 34 + k * 50, h - fh + 60, 36, 70, '#4a2e1a', null, false); } }
    if (sign) { g.fillStyle = ['#b3261e', '#1f4fa0', '#2e7d32', '#6a1b9a'][v % 4]; g.fillRect(14, h - fh + 6, w - 28, 34); g.fillStyle = '#fff'; g.font = `900 24px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sign, w / 2, h - fh + 24); }
    // tầng 2, 3: ban công sắt + cửa kính + chậu hoa
    for (let f = 1; f < 3; f++) { const y = h - (f + 1) * fh; windowAt(g, 46, y + 30, 70, 100, '#ffffff', null, false); windowAt(g, 140, y + 30, 70, 100, '#ffffff', null, false); g.fillStyle = '#d8d0c0'; g.fillRect(0, y + fh - 46, w, 10); railing(g, 6, y + fh - 92, w - 12, 46); flowerPots(g, 14, y + fh - 50, w - 28); }
    // điều hoà + dây điện
    g.fillStyle = '#eee'; g.fillRect(w - 58, h - 2 * fh + 14, 44, 26); g.fillStyle = '#bbb'; for (let k = 0; k < 5; k++) g.fillRect(w - 54 + k * 8, h - 2 * fh + 18, 4, 18);
  });
}
function villaFront(v) { // biệt thự Pháp
  return canvasTex(512, 256, (g, w, h) => {
    plaster(g, w, h, ['#f4e3b5', '#fbf6ec', '#f2d49b', '#e9e1cf'][v % 4]);
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, h / 2 - 4, w, 8);
    const sh = ['#2e7d4f', '#2d6fb5', '#7a3b22'][v % 3];
    for (const f of [0, 1]) for (const x of [50, 150, 330, 430]) windowAt(g, x, f ? 26 : h / 2 + 24, 44, 78, '#ffffff', sh, false);
    // cửa chính vòm ở giữa
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(222, h); g.lineTo(222, h / 2 + 50); g.arc(256, h / 2 + 50, 34, Math.PI, 0); g.lineTo(290, h); g.fill();
    g.fillStyle = '#5a3a24'; g.beginPath(); g.moveTo(228, h); g.lineTo(228, h / 2 + 52); g.arc(256, h / 2 + 52, 28, Math.PI, 0); g.lineTo(284, h); g.fill();
    windowAt(g, 232, 26, 48, 78, '#ffffff', null, false); railing(g, 214, 86, 84, 26);
    flowerPots(g, 30, h - 12, 120); flowerPots(g, 350, h - 12, 120);
  });
}
function farmFront(v) { // nhà vườn 1 tầng
  return canvasTex(512, 256, (g, w, h) => {
    plaster(g, w, h, ['#e9dcc3', '#cfe0f2', '#d9ecc3', '#f4e3b5'][v % 4]);
    g.fillStyle = '#8a5a34'; for (let x = 0; x < w; x += 40) g.fillRect(x, h * 0.62, 6, h * 0.38); g.fillRect(0, h * 0.62, w, 8); // hiên gỗ
    windowAt(g, 60, 70, 70, 80, '#2d6fb5', null, false); windowAt(g, 380, 70, 70, 80, '#2d6fb5', null, false);
    g.fillStyle = '#6b4226'; g.fillRect(220, 60, 72, h - 60); g.fillStyle = '#4a2e1a'; g.fillRect(255, 60, 3, h - 60);
    flowerPots(g, 20, h - 10, 160); flowerPots(g, 330, h - 10, 160);
  });
}
function sideTex(base, floors) {
  return canvasTex(256, 256, (g, w, h) => { plaster(g, w, h, base); for (let f = 0; f < floors; f++) windowAt(g, w / 2 - 20, h - (f + 1) * (h / floors) + 30, 40, h / floors * 0.45, '#ffffff', null, false); });
}
const nightMats = []; // vật liệu có cửa sổ sáng đèn ban đêm
function houseKind(spec, spots) {
  if (!spots.length) return;
  const { w, d, h, front, side, roofTex, roofH, roofType } = spec;
  const fm = new THREE.MeshStandardMaterial({ map: front, roughness: 0.85, emissive: 0xffc070, emissiveMap: front, emissiveIntensity: 0 });
  const sm = new THREE.MeshStandardMaterial({ map: side, roughness: 0.9 });
  nightMats.push(fm);
  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), [sm, sm, sm, sm, fm, sm], spots.length);
  let rg;
  if (roofType === 'hip') { rg = new THREE.CylinderGeometry(0.01, 1, 1, 4, 1); rg.rotateY(Math.PI / 4); rg.scale((w + 1.2) / Math.SQRT2, roofH, (d + 1.2) / Math.SQRT2); rg.translate(0, h + roofH / 2, 0); }
  else { const s = new THREE.Shape(); s.moveTo(-w / 2 - 0.6, 0); s.lineTo(0, roofH); s.lineTo(w / 2 + 0.6, 0); s.closePath(); rg = new THREE.ExtrudeGeometry(s, { depth: d + 1, bevelEnabled: false }); rg.translate(0, h, -(d + 1) / 2); }
  roofTex.repeat.set(0.25, 0.25);
  const roof = new THREE.InstancedMesh(rg, new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.8 }), spots.length);
  let extra = null;
  if (spec.chimney) extra = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 2.4, 0.8).translate(w * 0.28, h + roofH * 0.6, 0), std('#a0522d'), spots.length);
  if (spec.balcony) extra = new THREE.InstancedMesh(new THREE.BoxGeometry(w, 0.18, 1.0).translate(0, h / 3, d / 2 + 0.5), std('#d8d0c0'), spots.length);
  spots.forEach((p, i) => {
    dummy.position.set(p.x, groundH(p.x, p.z) - 0.1, p.z); dummy.rotation.set(0, p.z > 0 ? Math.PI : 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
    body.setMatrixAt(i, dummy.matrix); roof.setMatrixAt(i, dummy.matrix); if (extra) extra.setMatrixAt(i, dummy.matrix);
  });
  for (const m of [body, roof, extra]) if (m) { m.castShadow = !LOW; m.receiveShadow = true; scene.add(m); }
}
function houseSpots(n, seed, filter) {
  return scatter(n, i => {
    const x = -300 + hash(i, seed) * (ROUTE_M + 600), zn = zoneAt(x), back = hash(i, seed + 1) < 0.72;
    const z = back ? -(15 + Math.pow(hash(i, seed + 2), 1.3) * 70) : 34 + hash(i, seed + 3) * 50;
    if (nearStation(x, z, 6) || !filter(zn, i)) return null;
    return { x, z };
  });
}
if (!ROUTE) { // nhà mô phỏng: chỉ dùng khi không có dữ liệu bản đồ thật (có bản đồ thì dựng đúng từng ngôi nhà thật, xem buildRealTown)
  // nhà ống: dày ở hai đầu tuyến (gần thành phố), lác đác dọc đường
  for (let v = 0; v < 6; v++) houseKind({ w: 5, d: 11, h: 10, roofH: 2.2, roofType: 'gable', front: tubeFront(v), side: sideTex(PALETTE[v % PALETTE.length], 3), roofTex: tileTex(['#b0502e', '#9a3b22', '#c0583a'][v % 3]), balcony: true },
    houseSpots(LOW ? 5 : 9, 300 + v * 7, (zn, i) => zn === 'town' || hash(i, 77 + v) < 0.12));
  // biệt thự Pháp quanh Đà Lạt và Trại Mát
  for (let v = 0; v < 3; v++) houseKind({ w: 13, d: 10, h: 7, roofH: 4.5, roofType: 'hip', front: villaFront(v), side: sideTex('#f4e3b5', 2), roofTex: tileTex(['#b0502e', '#4a5a6a', '#7a3b22'][v]), chimney: true },
    houseSpots(LOW ? 4 : 7, 400 + v * 7, (zn, i) => zn === 'town' || zn === 'pine' && hash(i, 88 + v) < 0.25));
  // nhà vườn mái tôn ở vùng trồng rau, hoa
  for (let v = 0; v < 4; v++) houseKind({ w: 10, d: 7, h: 3.6, roofH: 1.8, roofType: 'gable', front: farmFront(v), side: sideTex(['#e9dcc3', '#cfe0f2', '#d9ecc3', '#f4e3b5'][v], 1), roofTex: tinTex(['#2d6fb5', '#b0502e', '#8a9aa6', '#2e7d4f'][v]) },
    houseSpots(LOW ? 6 : 11, 500 + v * 7, (zn) => zn === 'farm' || zn === 'flower' || zn === 'glass' || zn === 'hill'));
}
{ // nhà kính trồng hoa: thành từng dãy song song
  const spots = [];
  // có bản đồ thật: nhà kính đặt đúng các khu "nhà kính trồng hoa" trên bản đồ, xếp dãy theo hướng dài của khu đất
  if (ROUTE) for (const a of ROUTE.greenhouseAreas || []) {
    const xs = a.pts.map(p => p[0]), zs = a.pts.map(p => p[1]), bx0 = Math.min(...xs), bx1 = Math.max(...xs), bz0 = Math.min(...zs), bz1 = Math.max(...zs);
    const inside = (x, z) => { let c = false; for (let i = 0, j = a.pts.length - 1; i < a.pts.length; j = i++) { const [xi, zi] = a.pts[i], [xj, zj] = a.pts[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
    for (let z = bz0 + 4; z < bz1 - 3; z += 8.5) for (let x = bx0 + 16; x < bx1 - 15; x += 34) if (inside(x, z) && Math.abs(z) > 10 && !nearStation(x, z)) spots.push({ x, z, col: Math.floor(hash(Math.round(x), Math.round(z)) * 5) });
  }
  // đoạn "Nhà kính": thêm các dãy nhà kính trên phần đất trống hai bên đường (đúng chỗ MC giới thiệu)
  if (ROUTE) {
    const free = (x, z) => !OCC.has(occKey(x, z)) && !OCC.has(occKey(x - 15, z)) && !OCC.has(occKey(x + 15, z)) && !nearStation(x, z, 10);
    for (let x = 5.45 * VIS; x < 6.7 * VIS; x += 36) for (const side of [-1, 1]) for (let r = 0; r < 9; r++) {
      const z = side < 0 ? -(16 + r * 8.5) : 44 + r * 8.5;
      if (free(x, z) && Math.abs(groundRel(x, z) - groundRel(x + 14, z)) < 3 && hash(Math.round(x), r + side) < 0.8) { spots.push({ x, z, col: Math.floor(hash(Math.round(x), r * 7) * 5) }); OCC.add(occKey(x, z)); }
    }
  }
  const blocks = ROUTE ? [] : scatter(LOW ? 14 : 26, i => {
    const x = -100 + hash(i, 601) * (ROUTE_M + 200), zn = zoneAt(x);
    if (!(zn === 'glass' || (zn === 'flower' && hash(i, 602) < 0.6) || (zn === 'farm' && hash(i, 603) < 0.4))) return null;
    const back = hash(i, 604) < 0.75, z = back ? -(18 + hash(i, 605) * 70) : 42 + hash(i, 606) * 40;
    return nearStation(x, z, 12) ? null : { x, z, n: 2 + Math.floor(hash(i, 607) * 4), col: Math.floor(hash(i, 608) * 5) };
  });
  for (const b of blocks) for (let k = 0; k < b.n; k++) spots.push({ x: b.x, z: b.z + (b.z < 0 ? -1 : 1) * k * 8.5, col: b.col });
  if (spots.length) {
    const L = 32, R = 3.4;
    const filmTex = canvasTex(256, 256, (g) => { g.fillStyle = 'rgba(245,248,250,1)'; g.fillRect(0, 0, 256, 256); for (let x = 0; x < 256; x += 32) { g.fillStyle = 'rgba(150,160,170,.55)'; g.fillRect(x, 0, 3, 256); } for (let i = 0; i < 80; i++) { g.fillStyle = `rgba(200,210,220,${hash(i, 4) * 0.4})`; g.fillRect(hash(i, 1) * 256, hash(i, 2) * 256, 2 + hash(i, 3) * 30, 1.5); } }, [4, 1]);
    const film = new THREE.CylinderGeometry(R, R, L, 18, 1, true, 0, Math.PI); film.rotateZ(Math.PI / 2); // nửa trụ: vòm trên
    const filmMat = new THREE.MeshStandardMaterial({ map: filmTex, color: 0xffffff, transparent: true, opacity: 0.62, roughness: 0.35, side: THREE.DoubleSide, depthWrite: false });
    const filmI = new THREE.InstancedMesh(film, filmMat, spots.length);
    const endG = new THREE.CircleGeometry(R, 18, 0, Math.PI); endG.rotateY(Math.PI / 2);
    const ends = new THREE.InstancedMesh(mergeGeometries([endG.clone().translate(L / 2, 0, 0), endG.clone().translate(-L / 2, 0, 0)]), new THREE.MeshStandardMaterial({ color: 0xf2f5f8, transparent: true, opacity: 0.8, side: THREE.DoubleSide }), spots.length);
    // khung vòm sắt
    const ribG = new THREE.TorusGeometry(R + 0.02, 0.05, 4, 16, Math.PI); ribG.rotateY(Math.PI / 2);
    const ribList = []; for (let k = 0; k <= 8; k++) ribList.push(ribG.clone().translate(-L / 2 + k * L / 8, 0, 0));
    const ribs = new THREE.InstancedMesh(mergeGeometries(ribList), std('#9aa4ad', { metalness: 0.7, roughness: 0.4 }), spots.length);
    // luống hoa bên trong (4 luống, nhiều màu)
    const bedTex = c => canvasTex(256, 64, (g) => { g.fillStyle = '#3d7a34'; g.fillRect(0, 0, 256, 64); for (let i = 0; i < 260; i++) { g.fillStyle = c[i % c.length]; g.beginPath(); g.arc(hash(i, 1) * 256, hash(i, 2) * 64, 2 + hash(i, 3) * 3, 0, 7); g.fill(); } }, [4, 1]);
    const COLS = [['#ff5d8f', '#ff8fb1', '#ffffff'], ['#ffd23f', '#ffea80', '#ff9f43'], ['#9b7bff', '#c4a0ff', '#ffffff'], ['#e8343f', '#3d9a3d', '#ffffff'], ['#ff9f43', '#ff6b6b', '#ffd23f']];
    const bedG = new THREE.BoxGeometry(L - 2, 0.55, 0.9);
    const groups = COLS.map(() => []); spots.forEach((p, i) => groups[p.col].push(p));
    groups.forEach((list, c) => {
      if (!list.length) return;
      const beds = new THREE.InstancedMesh(bedG, new THREE.MeshStandardMaterial({ map: bedTex(COLS[c]) }), list.length * 4);
      list.forEach((p, i) => { for (let k = 0; k < 4; k++) { dummy.position.set(p.x, groundH(p.x, p.z) + 0.28, p.z - 2.1 + k * 1.4); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); beds.setMatrixAt(i * 4 + k, dummy.matrix); } });
      beds.receiveShadow = true; scene.add(beds);
    });
    spots.forEach((p, i) => { dummy.position.set(p.x, groundH(p.x, p.z) + 0.05, p.z); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); filmI.setMatrixAt(i, dummy.matrix); ends.setMatrixAt(i, dummy.matrix); ribs.setMatrixAt(i, dummy.matrix); });
    filmI.renderOrder = 2; scene.add(filmI, ends, ribs);
  }
}
// ---------------------------------------------------------------- thị trấn thật theo bản đồ (OpenStreetMap)
// Mỗi ngôi nhà dựng đúng mặt bằng thật, cao theo số tầng; mặt tường lát "ô mặt tiền" (mỗi ô = 1 gian × 1 tầng có cửa sổ);
// quán xá / khách sạn / chùa có biển tên thật gắn lên mặt nhà quay ra đường ray; đường phố, hồ nước, tháp chùa Linh Phước đúng vị trí.
function facadeTile(v) {
  const base = PALETTE[v % PALETTE.length], shutter = ['#2e7d4f', '#2d6fb5', '#7a3b22', null][v % 4];
  const draw = (g, w, h, lit) => {
    if (lit) { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = hash(v, 3) < 0.5 ? '#ffcf7a' : '#ffe2a8'; g.fillRect(36, 34, 56, 72); return; }
    plaster(g, w, h, base);
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, h - 8, w, 8); // gờ tầng
    windowAt(g, 36, 34, 56, 72, '#ffffff', shutter, false);
    if (v % 3 === 1) railing(g, 20, 108, 88, 26);
    if (v % 5 === 2) flowerPots(g, 30, 116, 68);
  };
  const t = canvasTex(128, 160, (g, w, h) => draw(g, w, h, false)); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const e = canvasTex(128, 160, (g, w, h) => draw(g, w, h, true)); e.wrapS = e.wrapT = THREE.RepeatWrapping;
  return { map: t, emissive: e };
}
function shopTile() {
  const t = canvasTex(128, 160, (g, w, h) => {
    plaster(g, w, h, '#efe6d2');
    const gl = g.createLinearGradient(0, 40, 0, h); gl.addColorStop(0, '#6a8aa0'); gl.addColorStop(1, '#2f4656'); g.fillStyle = gl; g.fillRect(10, 44, w - 20, h - 48);
    g.fillStyle = '#ffffff'; g.fillRect(10, 44, w - 20, 4); g.fillRect(w / 2 - 2, 44, 4, h - 48);
    for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#c0392b' : '#fff4dc'; g.fillRect(k * 16, 18, 16, 22); } // mái hiên sọc
    g.fillStyle = 'rgba(255,220,150,.35)'; g.fillRect(14, 60, 40, 60);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const SIGN_KIND = { cafe: ['☕', 'CÀ PHÊ', '#6b4226'], restaurant: ['🍜', 'NHÀ HÀNG', '#b3261e'], fast_food: ['🍔', 'ĂN NHANH', '#d35400'], bar: ['🍸', 'BAR', '#4a148c'], hotel: ['🏨', 'KHÁCH SẠN', '#1f4fa0'], guest_house: ['🏠', 'NHÀ NGHỈ', '#1f4fa0'], hostel: ['🛏', 'HOSTEL', '#1f4fa0'], motel: ['🏨', 'MOTEL', '#1f4fa0'], chalet: ['🏡', 'HOMESTAY', '#2e7d32'], apartment: ['🏢', 'CĂN HỘ', '#1f4fa0'], place_of_worship: ['🛕', 'CHÙA', '#b8860b'], florist: ['💐', 'HOA TƯƠI', '#c2185b'], greengrocer: ['🥬', 'RAU CỦ', '#2e7d32'], bakery: ['🥖', 'BÁNH MÌ', '#8d6e63'], convenience: ['🏪', 'TẠP HÓA', '#2e7d32'], supermarket: ['🛒', 'SIÊU THỊ', '#2e7d32'], marketplace: ['🧺', 'CHỢ', '#e65100'], pharmacy: ['💊', 'NHÀ THUỐC', '#00897b'], bank: ['🏦', 'NGÂN HÀNG', '#1565c0'], fuel: ['⛽', 'XĂNG DẦU', '#c62828'] };
function buildRealTown() {
  const groups = new Map(); // khoá vật liệu → { pos: [], uv: [] }
  const G = k => { let g = groups.get(k); if (!g) groups.set(k, g = { pos: [], uv: [] }); return g; };
  const quad = (g, a, b, c, d, ua, ub, va, vb) => { g.pos.push(...a, ...b, ...c, ...a, ...c, ...d); g.uv.push(ua, va, ub, va, ub, vb, ua, va, ub, vb, ua, vb); };
  const signs = [];
  for (const b of ROUTE.buildings) {
    const P = b.pts.map(([px, pz]) => [b.s + px, b.z + pz]);
    let y0 = 1e9; for (const [x, z] of P) y0 = Math.min(y0, groundH(x, z)); y0 -= 0.4;
    const area = Math.abs(P.reduce((a, p, i) => { const q = P[(i + 1) % P.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
    const gh = b.kind === 'greenhouse', floorH = gh ? 4 : 3.1, h = gh ? 4 : b.lv * floorH + 0.4;
    const v = hashStr(b.s + ':' + b.z) % 8;
    const wallKey = gh ? 'gh' : b.kind === 'temple' ? 'temple' : 'wall' + v;
    for (let i = 0; i < P.length; i++) {
      const p = P[i], q = P[(i + 1) % P.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]); if (len < 0.3) continue;
      const bays = Math.max(1, Math.round(len / 3.6));
      if (b.shop && !gh) { // tầng trệt là mặt tiền cửa hàng
        quad(G('shop'), [p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y0 + 0.4 + floorH, q[1]], [p[0], y0 + 0.4 + floorH, p[1]], 0, bays, 0, 1);
        if (b.lv > 1) quad(G(wallKey), [p[0], y0 + 0.4 + floorH, p[1]], [q[0], y0 + 0.4 + floorH, q[1]], [q[0], y0 + h, q[1]], [p[0], y0 + h, p[1]], 0, bays, 0, b.lv - 1);
      } else quad(G(wallKey), [p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y0 + h, q[1]], [p[0], y0 + h, p[1]], 0, bays, 0, gh ? 1 : b.lv + 0.13);
    }
    // mái: nhà nhỏ → mái ngói dốc về giữa (kiểu mái 4 mái), nhà lớn → mái bằng
    const top = y0 + h;
    if (!gh && P.length <= 7 && area < 420) {
      const cx = P.reduce((a, p) => a + p[0], 0) / P.length, cz = P.reduce((a, p) => a + p[1], 0) / P.length, rh = Math.min(3.6, 1.2 + Math.sqrt(area) * 0.22);
      const rk = b.kind === 'temple' ? 'roofTemple' : 'roof' + (v % 3), g = G(rk);
      for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; g.pos.push(p[0], top, p[1], q[0], top, q[1], cx, top + rh, cz); g.uv.push(p[0] / 4, p[1] / 4, q[0] / 4, q[1] / 4, cx / 4, cz / 4); }
    } else {
      const g = G(gh ? 'ghRoof' : 'flat');
      const tri = THREE.ShapeUtils.triangulateShape(P.map(p => new THREE.Vector2(p[0], p[1])), []);
      for (const t of tri) for (const k of t) { g.pos.push(P[k][0], top, P[k][1]); g.uv.push(P[k][0] / 6, P[k][1] / 6); }
    }
    // biển tên quán gắn lên mặt nhà gần đường ray nhất
    if (b.shop && signs.length < 64) {
      let best = -1, bd = 1e9; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], mz = Math.abs((p[1] + q[1]) / 2); if (Math.hypot(q[0] - p[0], q[1] - p[1]) > 2.5 && mz < bd) { bd = mz; best = i; } }
      if (best >= 0) signs.push({ p: P[best], q: P[(best + 1) % P.length], y: y0 + 0.4 + floorH + 0.6, shop: b.shop, cx: b.s, cz: b.z });
    }
  }
  // vật liệu
  const mats = {};
  for (let v = 0; v < 8; v++) { const f = facadeTile(v); mats['wall' + v] = new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emissive, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.9, side: THREE.DoubleSide }); nightMats.push(mats['wall' + v]); }
  { const f = facadeTile(5); mats.temple = new THREE.MeshStandardMaterial({ map: f.map, color: 0xf6c860, roughness: 0.8, side: THREE.DoubleSide }); }
  mats.shop = new THREE.MeshStandardMaterial({ map: shopTile(), roughness: 0.6, emissive: 0xffd8a0, emissiveIntensity: 0, side: THREE.DoubleSide }); nightMats.push(mats.shop);
  ['#b0502e', '#9a3b22', '#7a5040'].forEach((c, i) => { const t = tileTex(c); t.repeat.set(1, 1); mats['roof' + i] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, side: THREE.DoubleSide }); });
  { const t = tileTex('#b8401e'); mats.roofTemple = new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, side: THREE.DoubleSide }); }
  mats.flat = new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (g) => { plaster(g, 128, 128, '#a9a59c'); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, 0, 128, 4); g.fillRect(0, 0, 4, 128); }, [1, 1]), roughness: 1, side: THREE.DoubleSide });
  mats.gh = new THREE.MeshStandardMaterial({ color: 0xf2f6f8, transparent: true, opacity: 0.7, roughness: 0.3, side: THREE.DoubleSide, depthWrite: false });
  mats.ghRoof = mats.gh;
  for (const [k, g] of groups) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mats[k] || mats.flat); m.castShadow = !LOW && k !== 'gh'; m.receiveShadow = true; scene.add(m);
  }
  // biển tên quán (một tấm ảnh chung chứa tất cả biển để vẽ 1 lần)
  if (signs.length) {
    const atlas = document.createElement('canvas'); atlas.width = 2048; atlas.height = 2048; const ag = atlas.getContext('2d');
    signs.forEach((s, i) => {
      const cx = (i % 4) * 512, cy = Math.floor(i / 4) * 128, [icon, label, col] = SIGN_KIND[s.shop.kind] || ['🏪', 'CỬA HÀNG', '#455a64'];
      ag.fillStyle = col; ag.fillRect(cx + 4, cy + 4, 504, 120); ag.strokeStyle = '#ffd36b'; ag.lineWidth = 5; ag.strokeRect(cx + 7, cy + 7, 498, 114);
      ag.fillStyle = '#fff'; ag.textBaseline = 'middle'; ag.font = `56px "Segoe UI Emoji",sans-serif`; ag.fillText(icon, cx + 18, cy + 66);
      let name = s.shop.name || label; ag.font = `900 ${name.length > 16 ? 34 : 44}px ${FONT}`; while (ag.measureText(name).width > 400 && name.length > 3) name = name.slice(0, -1);
      ag.fillText(name, cx + 96, cy + (s.shop.name ? 54 : 66)); if (s.shop.name) { ag.font = `700 22px ${FONT}`; ag.fillStyle = '#ffe9b8'; ag.fillText(label, cx + 98, cy + 98); }
    });
    const tex = new THREE.CanvasTexture(atlas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const pos = [], uv = [];
    signs.forEach((s, i) => {
      const [p, q] = [s.p, s.q], len = Math.hypot(q[0] - p[0], q[1] - p[1]), w = Math.min(len * 0.85, 6.5), hh = w / 4;
      const dx = (q[0] - p[0]) / len, dz = (q[1] - p[1]) / len, mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2;
      let nx = -dz, nz = dx; if ((mx - s.cx) * nx + (mz - s.cz) * nz < 0) { nx = -nx; nz = -nz; } // pháp tuyến hướng ra ngoài nhà
      const ox = mx + nx * 0.18, oz = mz + nz * 0.18, a = [ox - dx * w / 2, s.y, oz - dz * w / 2], b = [ox + dx * w / 2, s.y, oz + dz * w / 2];
      // nhìn từ ngoài vào: đảo chiều chữ cho đúng
      const flip = (dx * nz - dz * nx) > 0;
      const u0 = (i % 4) / 4, u1 = u0 + 0.25, v1 = 1 - Math.floor(i / 4) / 16, v0 = v1 - 1 / 16;
      const [L0, L1] = flip ? [u1, u0] : [u0, u1];
      pos.push(...a, ...b, b[0], s.y + hh, b[2], ...a, b[0], s.y + hh, b[2], a[0], s.y + hh, a[2]);
      uv.push(L0, v0, L1, v0, L1, v1, L0, v0, L1, v1, L0, v1);
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    const sm = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.15, side: THREE.DoubleSide }); signMats.push(sm);
    scene.add(new THREE.Mesh(geo, sm));
  }
  // đường phố: dải nhựa bám theo địa hình
  { const pos = []; const asphalt = canvasTex(128, 128, (g) => { g.fillStyle = '#56565a'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${hash(i, 1) < 0.5 ? '0,0,0' : '255,255,255'},.06)`; g.fillRect(hash(i, 2) * 128, hash(i, 3) * 128, 2, 2); } }, [1, 1]);
    const uv = [];
    for (const rd of ROUTE.roads) {
      const pts = []; for (let i = 0; i < rd.pts.length - 1; i++) { const [a0, a1] = rd.pts[i], [b0, b1] = rd.pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b0 - a0, b1 - a1) / 8)); for (let k = 0; k < n; k++) pts.push([lerp(a0, b0, k / n), lerp(a1, b1, k / n)]); } pts.push(rd.pts.at(-1));
      for (let i = 0; i < pts.length - 1; i++) {
        const [a0, a1] = pts[i], [b0, b1] = pts[i + 1], l = Math.hypot(b0 - a0, b1 - a1) || 1, nx = -(b1 - a1) / l * rd.w / 2, nz = (b0 - a0) / l * rd.w / 2;
        if (Math.abs(a1) < 2.2 && Math.abs(b1) < 2.2) continue; // không phủ lên đường ray
        const ya = groundH(a0, a1) + 0.07, yb = groundH(b0, b1) + 0.07;
        pos.push(a0 + nx, ya, a1 + nz, b0 + nx, yb, b1 + nz, b0 - nx, yb, b1 - nz, a0 + nx, ya, a1 + nz, b0 - nx, yb, b1 - nz, a0 - nx, ya, a1 - nz);
        uv.push(0, 0, 0, l / 6, 1, l / 6, 0, 0, 1, l / 6, 1, 0);
      }
    }
    if (pos.length) { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide })); m.receiveShadow = true; scene.add(m); }
  }
  // hồ, ao
  for (const w of ROUTE.water || []) {
    let y = 1e9; for (const [x, z] of w.pts) y = Math.min(y, groundH(x, z));
    const shape = new THREE.Shape(w.pts.map(([x, z]) => new THREE.Vector2(x, -z))); const geo = new THREE.ShapeGeometry(shape); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x4a7fa8, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.9 })); m.position.y = y + 0.15; scene.add(m);
  }
  // tháp chuông 7 tầng chùa Linh Phước (đúng vị trí khuôn viên chùa trên bản đồ)
  const lp = (ROUTE.temples || []).find(t => /Linh Ph/i.test(t.name));
  if (lp) {
    const cx = lp.pts.reduce((a, p) => a + p[0], 0) / lp.pts.length, cz = lp.pts.reduce((a, p) => a + p[1], 0) / lp.pts.length;
    const tw = new THREE.Group();
    for (let k = 0; k < 7; k++) { const s = 8 - k * 0.85; const bx = new THREE.Mesh(new THREE.BoxGeometry(s, 3.6, s), std('#e8d9b5')); bx.position.y = 1.8 + k * 4.6; const r = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.45, s * 0.85, 1, 4), std('#3c8d5a')); r.rotation.y = Math.PI / 4; r.position.y = 4.1 + k * 4.6; tw.add(bx, r); }
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.7, 4.5, 8), std('#d9a520', { metalness: 0.6 })); spire.position.y = 35; tw.add(spire);
    tw.traverse(o => { if (o.isMesh) o.castShadow = !LOW; });
    tw.position.set(cx, groundH(cx, cz) - 0.3, cz); scene.add(tw);
  }
}
const signMats = [];
if (ROUTE) buildRealTown();
// "Làng rau": luống rau bắp cải, xà lách, cà rốt + người làm vườn đội nón lá · "Thung lũng hoa": luống hoa nhiều màu + bụi cẩm tú cầu ven đường
if (ROUTE) {
  const free = (x, z) => !OCC.has(occKey(x, z)) && !nearStation(x, z, 8);
  const bed = (bg, cols, n) => canvasTex(256, 64, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 256, 64); for (let i = 0; i < n; i++) { const x = hash(i, 1) * 256, y = 10 + hash(i, 2) * 44, r = 4 + hash(i, 3) * 5; g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(x + r * 0.3, y + r * 0.3, r * 0.45, 0, 7); g.fill(); } }, [2, 1]);
  const KINDS = [
    { zone: 'farm', tex: bed('#5a4030', ['#a6d46a', '#7fbf55', '#c9e07a', '#8fd06a'], 120), h: 0.35 },        // bắp cải, xà lách
    { zone: 'farm', tex: bed('#5a4030', ['#3d8a3d', '#5ea844', '#e67e22'], 160), h: 0.3 },                     // cà rốt, hành
    { zone: 'flower', tex: bed('#3d7a34', ['#ff5d8f', '#ff8fb1', '#ffffff'], 220), h: 0.5 },                   // hoa hồng, cẩm chướng
    { zone: 'flower', tex: bed('#3d7a34', ['#ffd23f', '#ffea80', '#ff9f43'], 220), h: 0.5 },                   // cúc vàng
    { zone: 'flower', tex: bed('#3d7a34', ['#9b7bff', '#c4a0ff', '#6c7cff'], 220), h: 0.5 },                   // hoa tím, oải hương
    { zone: 'flower', tex: bed('#3d7a34', ['#e8343f', '#ffffff', '#ff6b6b'], 220), h: 0.5 },                   // dâu tây
  ];
  const spots = KINDS.map(() => []);
  for (const [zn, x0, x1] of [['farm', 2.0, 3.2], ['flower', 4.2, 5.5]]) {
    const ks = KINDS.map((k, i) => k.zone === zn ? i : -1).filter(i => i >= 0);
    for (let x = x0 * VIS; x < x1 * VIS; x += 9.5) for (let z = -132; z < 70; z += 2.6) {
      if (z > -9 && z < 5) continue;
      if (!free(x, z) || !free(x + 4, z)) continue;
      const block = Math.floor(x / 40) * 31 + Math.floor(z / 18); // từng thửa trồng một loại
      spots[ks[Math.floor(hash(block, 3) * ks.length)]].push({ x, z });
    }
  }
  spots.forEach((list, i) => {
    if (!list.length) return;
    const k = KINDS[i], m = new THREE.InstancedMesh(new THREE.BoxGeometry(8.6, k.h, 1.4), new THREE.MeshStandardMaterial({ map: k.tex, roughness: 0.9 }), list.length);
    list.forEach((p, j) => { const y = groundH(p.x, p.z), y2 = groundH(p.x + 4, p.z), y1 = groundH(p.x - 4, p.z); dummy.position.set(p.x, y + k.h / 2 - 0.05, p.z); dummy.rotation.set(0, 0, Math.atan2(y2 - y1, 8)); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); m.setMatrixAt(j, dummy.matrix); });
    m.receiveShadow = true; scene.add(m);
  });
  // người làm vườn đội nón lá giữa ruộng rau
  const farm = spots[0].concat(spots[1]), nF = Math.min(36, Math.floor(farm.length / 20));
  if (nF) {
    const hat = new THREE.ConeGeometry(0.42, 0.3, 12); hat.translate(0, 1.72, 0);
    const body = new THREE.CapsuleGeometry(0.2, 0.75, 4, 8); body.translate(0, 0.95, 0);
    const hI = new THREE.InstancedMesh(hat, std('#e8cf8a'), nF), bI = new THREE.InstancedMesh(body, std('#ffffff'), nF), shirt = ['#3b5998', '#8e44ad', '#c0392b', '#2e7d4f', '#d35400'].map(c => new THREE.Color(c));
    for (let i = 0; i < nF; i++) { const p = farm[Math.floor(hash(i, 81) * farm.length)]; dummy.position.set(p.x + (hash(i, 82) - 0.5) * 6, groundH(p.x, p.z + 1.3), p.z + 1.3); dummy.rotation.set(hash(i, 83) < 0.5 ? 0.5 : 0, hash(i, 84) * 6, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); hI.setMatrixAt(i, dummy.matrix); bI.setMatrixAt(i, dummy.matrix); bI.setColorAt(i, shirt[i % shirt.length]); }
    hI.castShadow = bI.castShadow = !LOW; scene.add(hI, bI);
  }
  // bụi cẩm tú cầu dọc hai bên đường ray ở "Thung lũng hoa"
  const bushes = [];
  for (let x = 4.2 * VIS; x < 5.5 * VIS; x += 2.6) for (const z of [5.2, 7.4, -5.6, -7.8]) if (free(x, z) && hash(Math.round(x * 3), z) < 0.75) bushes.push({ x: x + (hash(Math.round(x), z) - 0.5) * 1.5, z, s: 0.6 + hash(Math.round(x * 7), z) * 0.5 });
  if (bushes.length) {
    const g = new THREE.IcosahedronGeometry(0.9, 1); g.scale(1.25, 0.8, 1.25);
    const I = new THREE.InstancedMesh(g, std('#ffffff', { roughness: 0.8 }), bushes.length), cols = ['#6c7cff', '#9b7bff', '#ff8fcf', '#5ab8ff', '#c4a0ff', '#ffffff'].map(c => new THREE.Color(c));
    bushes.forEach((p, i) => { dummy.position.set(p.x, groundH(p.x, p.z) + 0.3 * p.s, p.z); dummy.rotation.set(0, i, 0); dummy.scale.setScalar(p.s); dummy.updateMatrix(); I.setMatrixAt(i, dummy.matrix); I.setColorAt(i, cols[i % cols.length]); });
    I.castShadow = !LOW; scene.add(I);
  }
}

// cột cây số + biển "DỐC CAO"
function signMesh(text, w, h, bg, fg) {
  const t = canvasTex(256, Math.round(256 * h / w), (g, cw, ch) => { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(4, 4, cw - 8, ch - 8); g.fillStyle = fg; g.font = `900 ${ch * 0.42}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cw / 2, ch / 2 + 2); });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide }));
}
for (let k = 1; k < 7; k++) { const g = new THREE.Group(); const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 0.3), std('#f4f1e8')); post.position.y = 0.55; const s = signMesh('Km' + k, 0.6, 0.4, '#f4f1e8', '#c0392b'); s.position.set(0, 0.85, 0.17); g.add(post, s); g.position.set(k * VIS, trackY(k * VIS), 3.6); scene.add(g); }
for (const k of [3.22, 4.18]) { const g = new THREE.Group(); const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4), std('#555')); post.position.y = 1.2; const s = signMesh('⚠ DỐC CAO', 1.6, 0.6, '#ffcc00', '#222'); s.position.set(0, 2.5, 0.05); g.add(post, s); g.position.set(k * VIS, trackY(k * VIS), 4.2); scene.add(g); }

// ---------------------------------------------------------------- nhà ga
const lampLights = []; // bóng đèn sáng ban đêm
function lampPost(x, z) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.2), std('#222')); post.position.y = 2.1;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffd27a, emissiveIntensity: 0 })); head.position.y = 4.4;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd27a, transparent: true, depthWrite: false, opacity: 0 })); glow.scale.set(5, 5, 1); glow.position.y = 4.4;
  g.add(post, head, glow); g.position.set(x, 0.9 + trackY(x), z); scene.add(g); lampLights.push({ head, glow });
}
const stationMats = [];
function gableWindowTex(sign) {
  return canvasTex(256, 512, (g) => { // nền trong suốt: chỉ có cửa sổ lưới + bảng DALAT + đồng hồ, dán lên mặt đầu hồi
    g.fillStyle = '#ffffff'; g.fillRect(40, 150, 176, 330); g.fillStyle = '#7d98ac'; g.fillRect(50, 160, 156, 310);
    g.fillStyle = '#ffffff'; for (let c = 1; c < 4; c++) g.fillRect(50 + c * 39 - 3, 160, 6, 310); for (let r = 1; r < 6; r++) g.fillRect(50, 160 + r * 52 - 3, 156, 6);
    if (sign) { g.fillStyle = '#b3261e'; g.fillRect(48, 92, 160, 46); g.fillStyle = '#fff'; g.font = `900 34px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DALAT', 128, 116); g.fillStyle = '#fffbea'; g.beginPath(); g.arc(128, 48, 30, 0, 7); g.fill(); g.strokeStyle = '#7a3b22'; g.lineWidth = 5; g.stroke(); g.strokeStyle = '#222'; g.lineWidth = 4; g.beginPath(); g.moveTo(128, 48); g.lineTo(128, 28); g.moveTo(128, 48); g.lineTo(142, 54); g.stroke(); }
  });
}
function prism(w, h, d, mat) { // khối mái tam giác (đầu hồi)
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(0, h); s.lineTo(w / 2, 0); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
  return new THREE.Mesh(g, mat);
}
function hipRoof(w, d, h, mat) { const g = new THREE.CylinderGeometry(0.01, 1, 1, 4, 1); g.rotateY(Math.PI / 4); g.scale(w / Math.SQRT2 * 1, h, d / Math.SQRT2); g.translate(0, h / 2, 0); return new THREE.Mesh(g, mat); }
function platform(cx) { // sân ga + mái che cột đỏ
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.BoxGeometry(200, 0.9, 6.2), std('#cfc8b8', { roughness: 0.95 })); p.position.set(0, 0.45, 5.0); p.receiveShadow = true; g.add(p);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(200, 0.06, 0.35), std('#f2d24a')); edge.position.set(0, 0.92, 2.15); g.add(edge);
  const yard = new THREE.Mesh(new THREE.BoxGeometry(200, 0.9, 36), std('#b9b2a4', { roughness: 1 })); yard.position.set(0, 0.45, 26); yard.receiveShadow = true; g.add(yard); // sân trước ga ngang mặt sân ga
  g.position.set(cx, trackY(cx), 0); scene.add(g);
  return g;
}
function canopy(x0, x1) {
  const g = new THREE.Group(), red = std('#c0392b'), white = std('#f4f1ea');
  for (let x = x0; x <= x1; x += 6) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.2), red); c.position.set(x, 0.9 + 2.1, 6.6); c.castShadow = true; g.add(c); }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 4, 0.35, 6.4), white); roof.position.set((x0 + x1) / 2, 5.2, 5.2); roof.rotation.x = -0.08; roof.castShadow = true; g.add(roof);
  const band = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 4.1, 0.5, 0.1), red); band.position.set((x0 + x1) / 2, 5.1, 2.0); g.add(band);
  g.position.y = trackY((x0 + x1) / 2); scene.add(g);
}
function stationDalat(cx) {
  const g = new THREE.Group(), wall = std('#f2cf5e'), roof = std('#b0502e', { roughness: 0.9 }), white = std('#ffffff'), redBase = std('#b3261e');
  stationMats.push(wall);
  const body = new THREE.Mesh(new THREE.BoxGeometry(64, 6, 12), wall); body.position.set(0, 3, 0); g.add(body);
  const base = new THREE.Mesh(new THREE.BoxGeometry(64.2, 1, 12.2), redBase); base.position.set(0, 0.5, 0); g.add(base);
  const r1 = hipRoof(68, 15, 5, roof); r1.position.set(0, 6, 0); g.add(r1);
  // dãy cửa sổ hai cánh
  const winTex = canvasTex(128, 128, (c) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#7d98ac'; c.fillRect(10, 10, 108, 108); c.fillStyle = '#fff'; c.fillRect(61, 10, 6, 108); c.fillRect(10, 58, 108, 5); });
  const winMat = new THREE.MeshStandardMaterial({ map: winTex, emissive: 0xffc861, emissiveIntensity: 0 }); stationMats.push(winMat);
  for (let i = 0; i < 12; i++) { const x = -29 + i * 5.2; if (Math.abs(x) < 13) continue; const w = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3), winMat); w.position.set(x, 3.4, 6.02); g.add(w); }
  // ba mái nhọn với cửa sổ lưới, mái giữa có đồng hồ + bảng DALAT
  for (let k = -1; k <= 1; k++) {
    const hh = k === 0 ? 17 : 15, gw = 8.6;
    const front = new THREE.Mesh(new THREE.BoxGeometry(gw, 9, 1), wall); front.position.set(k * 8.8, 4.5, 6.5); g.add(front);
    const tri = prism(gw, hh - 9, 1, wall); tri.position.set(k * 8.8, 9, 6.5); g.add(tri);
    const rf = prism(gw + 1.4, hh - 8, 13, roof); rf.position.set(k * 8.8, 8.6, 0.3); g.add(rf);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(gw - 0.6, hh - 1), new THREE.MeshStandardMaterial({ map: gableWindowTex(k === 0), transparent: true, alphaTest: 0.5 }));
    face.position.set(k * 8.8, (hh - 1) / 2 + 0.3, 7.02); g.add(face);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = !LOW; o.receiveShadow = true; } });
  // ga quay mặt ra đường ray (mặt có ba mái nhọn hướng về phía đường ray)
  g.rotation.y = Math.PI; g.position.set(cx, 0.9 + trackY(cx), 30); scene.add(g);
}
function stationTraiMat(cx) {
  const g = new THREE.Group(), wall = std('#f4e6c4'), roof = std('#7a3b22'), col = std('#efe4c8');
  stationMats.push(wall);
  const body = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 9), wall); body.position.y = 3; g.add(body);
  const balcony = new THREE.Mesh(new THREE.BoxGeometry(17, 0.5, 11), std('#e9d9b2')); balcony.position.y = 6.2; g.add(balcony);
  const rf = prism(15, 9, 12, roof); rf.position.set(0, 6.4, 0); g.add(rf);
  const tri = prism(12, 7.4, 0.4, wall); tri.position.set(0, 6.5, 5.4); g.add(tri);
  for (const x of [-7.5, 7.5]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 6), col); c.position.set(x, 3, 5); g.add(c); }
  const sign = signMesh('GA TRẠI MÁT', 6, 1.3, '#d9c9a0', '#7a3b22'); sign.position.set(0, 8.6, 5.65); g.add(sign);
  // cờ màu
  ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#e84393', '#e67e22', '#9b59b6'].forEach((c, i) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3), std('#ddd')); p.position.set(-7 + i * 2.3, 8, 5.4); const f = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), std(c, { side: THREE.DoubleSide })); f.position.set(-6.4 + i * 2.3, 9.1, 5.4); g.add(p, f); });
  // tháp chùa Linh Phước phía sau
  const tw = new THREE.Group();
  for (let k = 0; k < 7; k++) { const s = 6 - k * 0.65; const b = new THREE.Mesh(new THREE.BoxGeometry(s, 2.6, s), std('#e8d9b5')); b.position.y = 1.3 + k * 3.2; const r = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.45, s * 0.85, 0.7, 4), std('#3c8d5a')); r.rotation.y = Math.PI / 4; r.position.y = 2.9 + k * 3.2; tw.add(b, r); }
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3, 8), std('#d9a520', { metalness: 0.6 })); spire.position.y = 24.5; tw.add(spire);
  tw.position.set(-24, 0, -6); if (!ROUTE) g.add(tw); // có bản đồ thật: tháp chùa Linh Phước dựng đúng chỗ (buildRealTown)
  g.traverse(o => { if (o.isMesh) { o.castShadow = !LOW; o.receiveShadow = true; } });
  g.rotation.y = Math.PI; g.position.set(cx + 10, 0.9 + trackY(cx + 10), 30); scene.add(g);
}
// phòng vé + bảng giờ tàu (cập nhật theo chuyến)
const ttBoards = [];
function ticketOffice(x, name) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 3.2), std('#f2d98c')); body.position.y = 1.6; g.add(body);
  const rf = prism(6.2, 1.6, 4, std('#8a3a26')); rf.rotation.y = Math.PI / 2; rf.position.set(0, 3.2, 0); g.add(rf);
  const sign = signMesh('PHÒNG VÉ', 3.4, 0.7, '#1f4fa0', '#ffd36b'); sign.position.set(0, 2.75, -1.62); sign.rotation.y = Math.PI; g.add(sign);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshStandardMaterial({ color: 0x9fc1d6, emissive: 0xffe2a0, emissiveIntensity: 0 })); win.position.set(0, 1.6, -1.62); win.rotation.y = Math.PI; g.add(win); stationMats.push(win.material);
  const clerk = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.5, 4, 8), std('#2d4f8a')); clerk.position.set(0, 1.5, -1.2); g.add(clerk);
  const tt = canvasTex(256, 256, () => {}); const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshStandardMaterial({ map: tt, emissive: 0xffffff, emissiveMap: tt, emissiveIntensity: 0.25 }));
  board.position.set(4.2, 2.6, -0.2); board.rotation.y = Math.PI; g.add(board);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 0.1), std('#555')); legs.position.set(4.2, 0.75, -0.1); g.add(legs);
  ttBoards.push({ tex: tt, name, key: '' });
  g.traverse(o => { if (o.isMesh) o.castShadow = !LOW; });
  g.position.set(x, 0.9 + trackY(x), 10.2); scene.add(g);
}
const TIMETABLE = [['07:50', '08:20'], ['08:50', '09:20'], ['09:55', '10:25'], ['10:55', '11:25'], ['12:00', '12:30'], ['13:00', '13:30'], ['14:05', '14:35'], ['15:05', '15:35'], ['16:10', '16:40'], ['17:10', '17:40'], ['18:15', '18:45'], ['19:15', '19:45'], ['20:20', '20:50'], ['21:20', '21:50']];
function drawTimetable(b, cur) {
  const key = String(cur); if (b.key === key) return; b.key = key;
  const c = b.tex.userData.canvas, g = c.getContext('2d');
  g.fillStyle = '#163d8f'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#ffd36b'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 250);
  g.fillStyle = '#ffd36b'; g.font = `900 24px ${FONT}`; g.textAlign = 'center'; g.fillText('GIỜ TÀU · ' + b.name.toUpperCase(), 128, 32);
  const start = clamp(Math.floor(cur / 2) * 2 - 2, 0, 8);
  g.font = `800 22px ${FONT}`;
  for (let i = 0; i < 6; i++) { const k = start + i, y = 66 + i * 32; if (k === cur) { g.fillStyle = 'rgba(255,211,107,.35)'; g.fillRect(8, y - 22, 240, 30); } g.fillStyle = '#ffd36b'; g.fillText('DL' + (k + 1), 46, y); g.fillStyle = '#fff'; g.fillText(TIMETABLE[k][0], 130, y); g.fillText(TIMETABLE[k][1], 206, y); }
  b.tex.needsUpdate = true;
}
platform(STATION_X[0]); platform(STATION_X[1]);
canopy(STATION_X[0] - 80, STATION_X[0] - 30);
stationDalat(STATION_X[0]); stationTraiMat(STATION_X[1]);
ticketOffice(STATION_X[0] + 40, 'Đà Lạt'); ticketOffice(STATION_X[1] + 38, 'Trại Mát');
for (const sx of STATION_X) for (let x = -90; x <= 90; x += 22) lampPost(sx + x, 7.6);

// ---------------------------------------------------------------- đoàn tàu
const train = new THREE.Group(); scene.add(train);
const wheelSpin = []; // các bánh xe để quay
const metal = std('#1b1b1f', { metalness: 0.65, roughness: 0.38 }), brass = std('#c9952e', { metalness: 0.85, roughness: 0.3 }), red = std('#b0281a', { roughness: 0.5 });
function spokedWheelTex() {
  return canvasTex(256, 256, (g) => { g.fillStyle = '#b0281a'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.strokeStyle = '#1b1b1b'; g.lineWidth = 14; g.beginPath(); g.arc(128, 128, 116, 0, 7); g.stroke(); g.lineWidth = 12; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * 110, 128 + Math.sin(a) * 110); g.stroke(); } g.fillStyle = '#d9d9d9'; g.beginPath(); g.arc(128, 128, 26, 0, 7); g.fill(); });
}
const wheelFace = new THREE.MeshStandardMaterial({ map: spokedWheelTex(), roughness: 0.5, metalness: 0.3 });
function wheel(r, w, faceMat) {
  const g = new THREE.CylinderGeometry(r, r, w, 24); g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, [std('#1b1b1b', { metalness: 0.6 }), faceMat || wheelFace, faceMat || wheelFace]);
  m.userData.r = r; wheelSpin.push(m); m.castShadow = true; return m;
}
// đầu máy hơi nước
const loco = new THREE.Group(); train.add(loco);
const locoParts = {};
{
  const L = LOCO_L;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(L - 0.4, 0.5, 2.3), metal); frame.position.set(-L / 2, 1.25, 0); loco.add(frame);
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 6.2, 28), metal); boiler.rotation.z = Math.PI / 2; boiler.position.set(-3.6, 2.6, 0); loco.add(boiler);
  for (const x of [-1.2, -3.2, -5.2]) { const band = new THREE.Mesh(new THREE.CylinderGeometry(1.07, 1.07, 0.14, 28), brass); band.rotation.z = Math.PI / 2; band.position.set(x, 2.6, 0); loco.add(band); }
  const smokebox = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 1.3, 28), std('#111', { metalness: 0.5 })); smokebox.rotation.z = Math.PI / 2; smokebox.position.set(-0.55, 2.6, 0); loco.add(smokebox);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.95, 24), std('#161616', { metalness: 0.6 })); door.rotation.y = Math.PI / 2; door.position.set(0.11, 2.6, 0); loco.add(door);
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 1.6, 16), metal); chimney.position.set(-0.7, 4.2, 0); loco.add(chimney);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.25, 16), metal); lip.position.set(-0.7, 5.0, 0); loco.add(lip);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), brass); dome.position.set(-3.3, 3.55, 0); loco.add(dome);
  const sand = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), metal); sand.position.set(-2.0, 3.55, 0); loco.add(sand);
  const whistle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5), brass); whistle.position.set(-6.2, 4.1, 0.3); loco.add(whistle);
  for (const z of [-1.2, 1.2]) { const tank = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.5, 0.6), metal); tank.position.set(-4.1, 2.15, z); loco.add(tank); const plate = signMesh('ĐÀ LẠT', 1.6, 0.42, '#c9952e', '#2a1206'); plate.position.set(-4.1, 2.25, z + Math.sign(z) * 0.31); if (z < 0) plate.rotation.y = Math.PI; loco.add(plate); }
  // ca-bin
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.8, 2.7), std('#18181b', { metalness: 0.4, roughness: 0.5 })); cab.position.set(-8.0, 3.0, 0); loco.add(cab);
  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.2, 3.0), std('#0a0a0c')); cabRoof.position.set(-8.0, 4.5, 0); loco.add(cabRoof);
  const cabWinMat = new THREE.MeshStandardMaterial({ color: 0xbfe0f0, emissive: 0xffd27a, emissiveIntensity: 0, roughness: 0.2 }); locoParts.cabWin = cabWinMat;
  for (const z of [-1.36, 1.36]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.0), cabWinMat); w.position.set(-7.9, 3.5, z); if (z < 0) w.rotation.y = Math.PI; loco.add(w); }
  const redLine = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.12, 2.72), red); redLine.position.set(-8.0, 2.0, 0); loco.add(redLine);
  const bunker = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.7, 2.5), metal); bunker.position.set(-10.1, 2.3, 0); loco.add(bunker);
  // gạt đá + đèn pha + đệm đầu
  const pilot = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1.2, 1.1, 4, 1), red); pilot.rotation.set(0, Math.PI / 4, Math.PI / 2); pilot.scale.set(0.55, 0.6, 0.85); pilot.position.set(0.4, 0.75, 0); loco.add(pilot);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 2.5), red); beam.position.set(0.1, 1.25, 0); loco.add(beam);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xfff2b0, emissiveIntensity: 0.2 }); locoParts.lamp = lampMat;
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.35, 16), lampMat); lamp.rotation.z = Math.PI / 2; lamp.position.set(0.25, 3.75, 0); loco.add(lamp);
  const spot = new THREE.SpotLight(0xfff2c8, 0, 120, 0.35, 0.5, 1.2); spot.position.set(0.4, 3.75, 0); spot.target.position.set(40, 0, 0); loco.add(spot, spot.target); locoParts.spot = spot;
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff2c0, transparent: true, depthWrite: false, opacity: 0 })); lampGlow.scale.set(3.2, 3.2, 1); lampGlow.position.set(0.5, 3.75, 0); loco.add(lampGlow); locoParts.lampGlow = lampGlow;
  // bánh xe: 1 cặp bánh dẫn nhỏ, 3 cặp bánh phát động đỏ, 1 cặp bánh sau
  const rods = [];
  for (const z of [-1.05, 1.05]) {
    const w0 = wheel(0.45, 0.16); w0.position.set(-1.3, 0.85, z); loco.add(w0);
    for (const x of [-3.0, -4.7, -6.4]) { const w = wheel(0.8, 0.18); w.position.set(x, 1.2, z); loco.add(w); }
    const w4 = wheel(0.5, 0.16); w4.position.set(-9.4, 0.9, z); loco.add(w4);
    const rod = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.13, 0.08), std('#c9c9c9', { metalness: 0.9, roughness: 0.25 })); rod.position.set(-4.7, 1.2, z + Math.sign(z) * 0.14); loco.add(rod);
    const piston = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.07), std('#d0d0d0', { metalness: 0.9, roughness: 0.25 })); piston.position.set(-2.0, 1.35, z + Math.sign(z) * 0.2); loco.add(piston);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.1, 16), metal); cyl.rotation.z = Math.PI / 2; cyl.position.set(-1.0, 1.4, z + Math.sign(z) * 0.18); loco.add(cyl);
    rods.push({ rod, piston, z, side: Math.sign(z) });
  }
  locoParts.rods = rods;
  // biển tên lái tàu (người tặng nhiều nhất) trên nóc ca-bin
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); tag.position.set(-8, 6.2, 0); tag.scale.set(5, 1.25, 1); tag.visible = false; loco.add(tag); locoParts.tag = tag;
  loco.traverse(o => { if (o.isMesh) { o.castShadow = !LOW; o.receiveShadow = true; } });
}
// toa: kiểu dáng từng hạng
const STYLE = {
  lareine: { body: '#1f3a6b', trim: '#d4a237', inner: '#f3e2c8', seat: '#a0522d', cushion: '#c44f4a', ceiling: 'flower', plate: 'LA REINE', curtain: '#c4504a' },
  vip: { body: '#6b4226', trim: '#d4a237', inner: '#7a4a2a', seat: '#5a2e1a', cushion: '#5a2e1a', ceiling: 'cream', plate: 'VIP', curtain: '#efe0bd' },
  mem: { body: '#efe6d2', trim: '#8a5a34', inner: '#efe6d2', seat: '#3f6b8a', cushion: '#3f6b8a', ceiling: 'cream', plate: 'NGỒI MỀM', curtain: '#efe0bd' },
  cung: { body: '#e3e6e4', trim: '#4a3426', inner: '#8a5a34', seat: '#8a5a34', cushion: '#8a5a34', ceiling: 'cream', plate: 'NGỒI CỨNG', curtain: '#efe0bd' },
};
const plankTex = (base) => canvasTex(256, 256, (g) => { g.fillStyle = base; g.fillRect(0, 0, 256, 256); g.fillStyle = 'rgba(0,0,0,.13)'; for (let y = 0; y < 256; y += 21) g.fillRect(0, y, 256, 2); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${hash(i, 1) < 0.5 ? '0,0,0' : '255,255,255'},.05)`; g.fillRect(hash(i, 2) * 256, hash(i, 3) * 256, 40 + hash(i, 4) * 80, 2); } }, [3, 1]);
const flowerTex = canvasTex(256, 256, (g) => { g.fillStyle = '#f3dccb'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 60; i++) { g.fillStyle = ['#e58a7a', '#c96a5a', '#9fb07a', '#f0b8a0'][i % 4]; g.beginPath(); g.arc(hash(i, 1) * 256, hash(i, 2) * 256, 4 + hash(i, 3) * 6, 0, 7); g.fill(); } }, [4, 1]);
function nameplateTex(text, sub, dark) {
  return canvasTex(512, 96, (g, w, h) => { g.fillStyle = dark ? '#1a1410' : '#efe2c4'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d4a237'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.fillStyle = dark ? '#ffd36b' : '#3a2a1e'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = sub ? `800 40px ${FONT}` : `800 52px Georgia,"Times New Roman",serif`; g.fillText(text, w / 2, sub ? 36 : h / 2 + 2); if (sub) { g.font = `700 22px ${FONT}`; g.fillText(sub, w / 2, 74); } }); // chữ tiếng Việt dùng font có dấu
}
const LED = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffc04a, emissiveIntensity: 2.2 });
const cars = {}; // key → { group, seats[], impostors, ledParts, innerLight }
const WIN_N = 6, WIN_W = 1.32, WIN_Y0 = FLOOR + 0.62, WIN_Y1 = FLOOR + 2.0, BODY_Y0 = 0.95, BODY_Y1 = FLOOR + 2.5; // cửa sổ to, bậu thấp để thấy rõ khách ngồi
function buildCar(key, idx) {
  const cls = CLS(key), st = STYLE[cls], g = new THREE.Group(); g.userData.key = key;
  const L = CAR_L, Wd = CAR_W;
  const bodyMat = cls === 'vip' || cls === 'cung' ? std('#ffffff', { map: plankTex(st.body), roughness: 0.6 }) : std(st.body, { roughness: 0.45, metalness: cls === 'lareine' ? 0.25 : 0 });
  const innerMat = std(st.inner, { ...(cls === 'vip' || cls === 'cung' ? { map: plankTex(st.inner) } : {}), emissive: new THREE.Color(st.inner).multiplyScalar(0.28) }); // nội thất tự sáng nhẹ (đèn trong toa)
  const trimMat = std(st.trim, { metalness: 0.6, roughness: 0.35 });
  const winX = i => -L / 2 + 1.55 + (i + 0.5) * ((L - 3.1) / WIN_N);
  // hai vách: lớp ngoài (màu toa) + lớp trong (màu nội thất), chừa ô cửa sổ
  for (const s of [-1, 1]) {
    for (const [mat, off, th] of [[bodyMat, Wd / 2, 0.06], [innerMat, Wd / 2 - 0.07, 0.04]]) {
      const z = s * off;
      const low = new THREE.Mesh(new THREE.BoxGeometry(L, WIN_Y0 - BODY_Y0, th), mat); low.position.set(0, (WIN_Y0 + BODY_Y0) / 2, z); g.add(low);
      const up = new THREE.Mesh(new THREE.BoxGeometry(L, BODY_Y1 - WIN_Y1, th), mat); up.position.set(0, (BODY_Y1 + WIN_Y1) / 2, z); g.add(up);
      // các trụ đặc giữa những ô cửa sổ
      const edges = [-L / 2]; for (let i = 0; i < WIN_N; i++) edges.push(winX(i) - WIN_W / 2, winX(i) + WIN_W / 2); edges.push(L / 2);
      for (let i = 0; i < edges.length; i += 2) { const a = edges[i], b = edges[i + 1], w = b - a; if (w <= 0.01) continue; const p = new THREE.Mesh(new THREE.BoxGeometry(w, WIN_Y1 - WIN_Y0, th), mat); p.position.set((a + b) / 2, (WIN_Y0 + WIN_Y1) / 2, z); g.add(p); }
    }
    // cửa lên xuống ở hai đầu toa (tối hơn)
    for (const dx of [-L / 2 + 0.78, L / 2 - 0.78]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.1), std(cls === 'lareine' ? '#16294d' : '#3a2414')); d.position.set(dx, BODY_Y0 + 1.2, s * (Wd / 2 + 0.035)); if (s < 0) d.rotation.y = Math.PI; g.add(d); }
    // đường viền + biển tên
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(L, 0.08, 0.02), trimMat); t1.position.set(0, WIN_Y0 - 0.06, s * (Wd / 2 + 0.035)); g.add(t1);
    const t2 = t1.clone(); t2.position.y = BODY_Y0 + 0.15; g.add(t2);
    // biển toa: La Reine / VIP 1, 2 kèm số hiệu toa xe (51612, 51618, 51620, 51622)
    const lux = cls === 'lareine' || cls === 'vip', title = cls === 'lareine' ? 'LA REINE' : cls === 'vip' ? 'VIP ' + key.slice(-1) : st.plate;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.5), new THREE.MeshStandardMaterial({ map: nameplateTex(title, lux ? 'Số hiệu ' + CAR_NO[key] : 'DALAT PLATEAU RAILROAD', lux), roughness: 0.5 }));
    plate.position.set(0, (BODY_Y0 + 0.18 + WIN_Y0 - 0.09) / 2, s * (Wd / 2 + 0.045)); if (s < 0) plate.rotation.y = Math.PI; g.add(plate); // nằm gọn giữa viền dưới và bậu cửa sổ, không bị cửa sổ / rèm che
  }
  // kính cửa sổ (mờ nhẹ) + rèm hai bên
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfe6f2, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.5, depthWrite: false });
  const curtain = std(st.curtain, { side: THREE.DoubleSide });
  for (const s of [-1, 1]) for (let i = 0; i < WIN_N; i++) {
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(WIN_W, WIN_Y1 - WIN_Y0), glass); gl.position.set(winX(i), (WIN_Y0 + WIN_Y1) / 2, s * (Wd / 2 + 0.01)); g.add(gl);
    for (const cx of [-1, 1]) { const c = new THREE.Mesh(new THREE.PlaneGeometry(0.22, WIN_Y1 - WIN_Y0), curtain); c.position.set(winX(i) + cx * (WIN_W / 2 - 0.1), (WIN_Y0 + WIN_Y1) / 2, s * (Wd / 2 - 0.12)); g.add(c); }
  }
  // sàn, trần, vách đầu toa, mái
  const floor = new THREE.Mesh(new THREE.BoxGeometry(L, 0.12, Wd), std('#5a3d2a')); floor.position.y = FLOOR; g.add(floor);
  const ceilMat = st.ceiling === 'flower' ? new THREE.MeshStandardMaterial({ map: flowerTex, side: THREE.DoubleSide }) : std('#f2ead8', { side: THREE.DoubleSide });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(L, Wd), ceilMat); ceil.rotation.x = Math.PI / 2; ceil.position.y = BODY_Y1 - 0.02; g.add(ceil);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.08, BODY_Y1 - BODY_Y0, Wd + 0.12), bodyMat); e.position.set(s * L / 2, (BODY_Y0 + BODY_Y1) / 2, 0); g.add(e); }
  const roofG = new THREE.CylinderGeometry(1, 1, L + 0.3, 24, 1, false, 0, Math.PI); roofG.rotateZ(Math.PI / 2); roofG.scale(1, 0.32, (Wd + 0.3) / 2); // nửa trụ cong phía trên
  const roof = new THREE.Mesh(roofG, std(cls === 'lareine' ? '#0f1d38' : '#e9e6df', { roughness: 0.6 })); roof.position.y = BODY_Y1; g.add(roof);
  if (cls === 'lareine') { const cr = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 5), brass); cr.position.set(0, BODY_Y1 + 0.55, 0); g.add(cr); }
  // đèn trần trong toa
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff4d0, emissive: 0xffd27a, emissiveIntensity: 0.4 });
  for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), lampMat); l.position.set(-L / 3 + i * L / 3, BODY_Y1 - 0.2, 0); g.add(l); }
  const innerLight = new THREE.PointLight(0xffd9a0, 0.6, 9, 1.4); innerLight.position.set(0, BODY_Y1 - 0.5, 0); g.add(innerLight);
  // băng ghế dọc hai vách (khách ngồi quay mặt vào giữa toa như toa Lareine)
  const seatMat = std(st.seat), cushMat = std(st.cushion);
  for (const s of [-1, 1]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(L - 2.8, 0.45, 0.55), seatMat); bench.position.set(0, FLOOR + 0.25, s * (Wd / 2 - 0.42)); g.add(bench);
    const back = new THREE.Mesh(new THREE.BoxGeometry(L - 2.8, 0.48, 0.12), cushMat); back.position.set(0, FLOOR + 0.72, s * (Wd / 2 - 0.16)); g.add(back); // lưng ghế thấp để không che khách băng đối diện
  }
  // bàn trà + lọ hoa giữa toa Lareine / VIP
  if (cls === 'lareine' || cls === 'vip') { const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16), std('#a0522d')); tb.position.set(L / 2 - 1.0, FLOOR + 0.75, 0); const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), std('#ffd23f')); fl.position.set(L / 2 - 1.0, FLOOR + 1.0, 0); g.add(tb, fl); }
  // gầm + giá chuyển hướng + bánh
  const under = new THREE.Mesh(new THREE.BoxGeometry(L - 1, 0.45, Wd - 0.5), metal); under.position.y = 0.75; g.add(under);
  for (const bx of [-L / 2 + 2.2, L / 2 - 2.2]) for (const dx of [-0.8, 0.8]) for (const z of [-0.85, 0.85]) { const w = wheel(0.42, 0.12, std('#2b2b2b', { metalness: 0.6 })); w.position.set(bx + dx, 0.85, z); g.add(w); }
  const coupler = new THREE.Mesh(new THREE.BoxGeometry(GAP + 0.4, 0.18, 0.3), metal); coupler.position.set(L / 2 + GAP / 2, 0.95, 0); g.add(coupler);
  // viền đèn LED cho tàu đêm
  const led = new THREE.Group();
  for (const s of [-1, 1]) {
    for (const y of [BODY_Y0 + 0.05, BODY_Y1 - 0.04]) { const b = new THREE.Mesh(new THREE.BoxGeometry(L, 0.05, 0.03), LED); b.position.set(0, y, s * (Wd / 2 + 0.05)); led.add(b); }
    for (let i = 0; i < WIN_N; i++) for (const [w, h, dx, dy] of [[WIN_W + 0.1, 0.04, 0, (WIN_Y1 - WIN_Y0) / 2 + 0.05], [WIN_W + 0.1, 0.04, 0, -(WIN_Y1 - WIN_Y0) / 2 - 0.05], [0.04, WIN_Y1 - WIN_Y0 + 0.1, WIN_W / 2 + 0.05, 0], [0.04, WIN_Y1 - WIN_Y0 + 0.1, -WIN_W / 2 - 0.05, 0]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), LED); b.position.set(winX(i) + dx, (WIN_Y0 + WIN_Y1) / 2 + dy, s * (Wd / 2 + 0.05)); led.add(b); }
  }
  led.visible = false; g.add(led);
  g.traverse(o => { if (o.isMesh && o.material !== glass && !o.material.transparent) { o.castShadow = !LOW; o.receiveShadow = true; } });
  train.add(g);
  // ghế ngồi: hình người đơn giản (dùng khi khách ở xa máy quay)
  const cap = 80, torso = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 8), std('#ffffff'), cap), head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 12, 10), std('#e8c39e'), cap), hair = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), std('#2a1d14'), cap);
  for (const im of [torso, head, hair]) { im.count = 0; im.frustumCulled = false; g.add(im); }
  cars[key] = { key, cls, group: g, idx, led, innerLight, lampMat, torso, head, hair, seats: [], winX, bodyMat, nightBody: cls === 'mem' || cls === 'cung' };
}
CAR_ORDER.forEach(buildCar);
// vị trí ghế i trong toa (cap ghế, hai băng ghế dọc vách)
function seatLocal(car, i, cap, farSide) {
  const perSide = Math.ceil(cap / 2), side = i < perSide ? 0 : 1, j = side ? i - perSide : i;
  const span = CAR_L - 3.0, x = -span / 2 + (j + 0.5) * (span / perSide);
  const s = (side === 0 ? -1 : 1) * farSide; // ghế đầu tiên xếp ở vách xa máy quay (thấy mặt khách qua cửa sổ)
  return { x, z: s * (CAR_W / 2 - 0.45), face: -s, side };
}

// ---------------------------------------------------------------- nhân vật VRoid (.vrm)
const loader = new GLTFLoader();
const templates = { male: [], female: [] };
const PRESETS = {}; // tư thế dựng sẵn: tên xương → quaternion
let modelList = [];
const BN = { hips: 'J_Bip_C_Hips', spine: 'J_Bip_C_Spine', chest: 'J_Bip_C_Chest', neck: 'J_Bip_C_Neck', head: 'J_Bip_C_Head', lUL: 'J_Bip_L_UpperLeg', rUL: 'J_Bip_R_UpperLeg', lLL: 'J_Bip_L_LowerLeg', rLL: 'J_Bip_R_LowerLeg', lFoot: 'J_Bip_L_Foot', rFoot: 'J_Bip_R_Foot', lUA: 'J_Bip_L_UpperArm', rUA: 'J_Bip_R_UpperArm', lLA: 'J_Bip_L_LowerArm', rLA: 'J_Bip_R_LowerArm', lH: 'J_Bip_L_Hand', rH: 'J_Bip_R_Hand' };
const CHILD = { lUL: 'lLL', rUL: 'rLL', lLL: 'lFoot', rLL: 'rFoot', lUA: 'lLA', rUA: 'rLA', lLA: 'lH', rLA: 'rH' };
function findBones(root) { const b = {}; root.traverse(o => { if (o.isBone) for (const [k, n] of Object.entries(BN)) if (o.name === n) b[k] = o; }); return b; }
function fixMaterials(root) {
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = !LOW; o.frustumCulled = false;
    const conv = m => { const n = new THREE.MeshLambertMaterial({ map: m.map || null, color: m.color ? m.color.clone() : 0xffffff, transparent: m.transparent, alphaTest: m.alphaTest || (m.transparent ? 0.5 : 0), side: m.side }); n.name = m.name || ''; if (n.map) n.map.colorSpace = THREE.SRGBColorSpace; n.transparent = false; n.depthWrite = true; return n; };
    o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
  });
}
// tạo tư thế bằng cách xoay từng xương cho hướng xương trỏ tới hướng mong muốn (trong hệ toạ độ nhân vật quay mặt +Z)
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
function aim(root, bones, name, dir) {
  const b = bones[name], c = bones[CHILD[name]]; if (!b || !c) return;
  root.updateMatrixWorld(true);
  b.getWorldPosition(_v1); c.getWorldPosition(_v2);
  const cur = _v2.sub(_v1).normalize();
  root.getWorldQuaternion(_q3);
  const want = dir.clone().normalize().applyQuaternion(_q3);
  _q1.setFromUnitVectors(cur, want);
  b.getWorldQuaternion(_q2); _q2.premultiply(_q1);
  b.parent.getWorldQuaternion(_q1); _q1.invert();
  b.quaternion.copy(_q1.multiply(_q2));
  b.updateMatrixWorld(true);
}
function buildPose(t, dirs) {
  const { root, bones, rest } = t;
  for (const [k, q] of Object.entries(rest)) bones[k].quaternion.copy(q);
  for (const [name, d] of dirs) aim(root, bones, name, d);
  const out = {}; for (const k of Object.keys(rest)) out[k] = bones[k].quaternion.clone();
  for (const [k, q] of Object.entries(rest)) bones[k].quaternion.copy(q);
  return out;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function makePoses(t) {
  t.sit = buildPose(t, [['lUL', V(0.06, -0.12, 1)], ['rUL', V(-0.06, -0.12, 1)], ['lLL', V(0.02, -1, 0.08)], ['rLL', V(-0.02, -1, 0.08)], ['lUA', V(0.18, -1, 0.22)], ['rUA', V(-0.18, -1, 0.22)], ['lLA', V(0.05, -0.35, 1)], ['rLA', V(-0.05, -0.35, 1)]]);
  t.walk = [];
  for (let f = 0; f < 8; f++) {
    const ph = f / 8 * Math.PI * 2, a = 0.42 * Math.sin(ph), b = 0.42 * Math.sin(ph + Math.PI);
    const ka = Math.max(0, 0.75 * Math.sin(ph + 1.9)), kb = Math.max(0, 0.75 * Math.sin(ph + Math.PI + 1.9));
    t.walk.push(buildPose(t, [['lUL', V(0.05, -Math.cos(a), Math.sin(a))], ['rUL', V(-0.05, -Math.cos(b), Math.sin(b))], ['lLL', V(0.03, -Math.cos(a - ka), Math.sin(a - ka))], ['rLL', V(-0.03, -Math.cos(b - kb), Math.sin(b - kb))],
      ['lUA', V(0.16, -Math.cos(-a * 0.8), Math.sin(-a * 0.8))], ['rUA', V(-0.16, -Math.cos(-b * 0.8), Math.sin(-b * 0.8))], ['lLA', V(0.1, -0.85, 0.45 + 0.25 * Math.sin(-a))], ['rLA', V(-0.1, -0.85, 0.45 + 0.25 * Math.sin(-b))]]));
  }
  t.stand = buildPose(t, [['lUL', V(0.05, -1, 0.02)], ['rUL', V(-0.05, -1, 0.02)], ['lLL', V(0.03, -1, 0)], ['rLL', V(-0.03, -1, 0)], ['lUA', V(0.14, -1, 0.05)], ['rUA', V(-0.14, -1, 0.05)], ['lLA', V(0.1, -0.9, 0.3)], ['rLA', V(-0.1, -0.9, 0.3)]]);
  // nhân viên đứng nghiêm, hai tay chắp trước bụng (tư thế đón khách)
  const legs = [['lUL', V(0.04, -1, 0.02)], ['rUL', V(-0.04, -1, 0.02)], ['lLL', V(0.02, -1, 0)], ['rLL', V(-0.02, -1, 0)]];
  t.greet = buildPose(t, [...legs, ['lUA', V(0.12, -1, 0.12)], ['rUA', V(-0.12, -1, 0.12)], ['lLA', V(-0.7, -0.35, 0.65)], ['rLA', V(0.7, -0.35, 0.65)]]);
  // trực ban ga: giơ cờ (tay phải giơ thẳng lên cao, tay trái đưa còi lên miệng) · cầm cờ cuộn (đứng nghiêm, tay phải cầm cán cờ)
  t.signal = buildPose(t, [...legs, ['rUA', V(-0.3, 1, 0.15)], ['rLA', V(-0.05, 1, 0.05)], ['lUA', V(0.35, -0.25, 1)], ['lLA', V(-0.75, 0.6, 0.3)]]);
  t.holdFlag = buildPose(t, [...legs, ['lUA', V(0.12, -1, 0.05)], ['lLA', V(0.1, -1, 0.15)], ['rUA', V(-0.15, -1, 0.2)], ['rLA', V(-0.05, -0.35, 1)]]);
  // vẫy tay chào (tay phải giơ lên, cẳng tay đưa qua lại)
  t.wave = [0, 1].map(k => buildPose(t, [...legs, ['lUA', V(0.12, -1, 0.12)], ['lLA', V(-0.7, -0.35, 0.65)], ['rUA', V(-0.75, 0.45, 0.35)], ['rLA', V(k ? -0.55 : 0.05, 1, 0.25)]]));
}
async function loadTemplate(m) {
  const gltf = await loader.loadAsync('/models/' + encodeURIComponent(m.file));
  const root = gltf.scene;
  fixMaterials(root);
  const bones = findBones(root);
  if (!bones.hips || !bones.lUL || !bones.lUA) { console.warn('VRM thiếu xương', m.file); return; }
  // VRM 0.x quay mặt về -Z → xoay để quay mặt +Z
  root.updateMatrixWorld(true);
  const la = bones.lUA.getWorldPosition(new THREE.Vector3()), ra = bones.rUA.getWorldPosition(new THREE.Vector3());
  const holder = new THREE.Group(); holder.add(root); if (la.x < ra.x) root.rotation.y = Math.PI;
  holder.updateMatrixWorld(true);
  const rest = {}; for (const k of Object.keys(BN)) if (bones[k]) rest[k] = bones[k].quaternion.clone();
  const hipsY = bones.hips.getWorldPosition(new THREE.Vector3()).y;
  const t = { file: m.file, female: m.female, root: holder, bones, rest, hipsY };
  makePoses(t);
  (m.female ? templates.female : templates.male).push(t);
}
fetch('/api/models').then(r => r.json()).then(async list => {
  if (Q.get('novrm') === '1') return;
  modelList = list;
  // nạp dần từng mô hình (mỗi file 11–16 MB) để không đứng hình
  const order = [...list.filter(m => !m.female).slice(0, 2), ...list.filter(m => m.female).slice(0, 2)];
  for (const m of list) if (!order.includes(m)) order.push(m);
  for (const m of order) { try { await loadTemplate(m); } catch (e) { console.warn('Không nạp được', m.file, e); } await new Promise(r => setTimeout(r, 300)); }
}).catch(e => console.warn(e));
function pickTemplate(id) {
  const fem = hashStr(id) % 2 === 0;
  const pool = (fem ? templates.female : templates.male).length ? (fem ? templates.female : templates.male) : templates.male.length ? templates.male : templates.female;
  return pool.length ? pool[hashStr(id + 'm') % pool.length] : null;
}
function instVrm(t) {
  const holder = SkeletonUtils.clone(t.root);
  const bones = findBones(holder);
  holder.traverse(o => { if (o.isMesh) { o.castShadow = !LOW; o.frustumCulled = false; } });
  return { t, holder, bones };
}
function applyPose(inst, pose) { for (const [k, q] of Object.entries(pose)) if (inst.bones[k]) inst.bones[k].quaternion.copy(q); }
function blendPose(inst, a, b, u) { for (const k of Object.keys(a)) if (inst.bones[k]) inst.bones[k].quaternion.copy(a[k]).slerp(b[k], u); }

// ảnh đại diện + tên khách (biển nhỏ trên đầu)
const texLoader = new THREE.TextureLoader();
const tagCache = new Map();
function tagTexture(p) {
  const key = p.id + '|' + p.name + '|' + (p.avatar ? 1 : 0);
  let e = tagCache.get(key); if (e) return e.tex;
  const c = document.createElement('canvas'); c.width = 320; c.height = 96;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const draw = img => {
    const g = c.getContext('2d'); g.clearRect(0, 0, 320, 96);
    g.fillStyle = 'rgba(20,14,10,.78)'; g.beginPath(); g.roundRect(4, 14, 312, 68, 34); g.fill(); g.strokeStyle = '#ffd36b'; g.lineWidth = 3; g.stroke();
    g.save(); g.beginPath(); g.arc(48, 48, 40, 0, 7); g.closePath(); g.fillStyle = colorOf(p.name); g.fill(); if (img) { g.clip(); g.drawImage(img, 8, 8, 80, 80); } else { g.fillStyle = '#fff'; g.font = `800 44px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((p.name || '?').trim().charAt(0).toUpperCase(), 48, 50); } g.restore();
    g.strokeStyle = '#ffd36b'; g.lineWidth = 4; g.beginPath(); g.arc(48, 48, 40, 0, 7); g.stroke();
    g.fillStyle = '#fff'; g.font = `800 30px ${FONT}`; g.textBaseline = 'middle'; let nm = p.name || ''; while (g.measureText(nm).width > 210 && nm.length > 2) nm = nm.slice(0, -1); g.fillText(nm, 98, 49);
    tex.needsUpdate = true;
  };
  draw(null);
  if (p.avatar) { const im = new Image(); im.onload = () => draw(im); im.src = '/api/avatar?u=' + encodeURIComponent(p.avatar); }
  tagCache.set(key, { tex }); if (tagCache.size > 400) { const k0 = tagCache.keys().next().value; tagCache.get(k0).tex.dispose(); tagCache.delete(k0); }
  return tex;
}

// ---------------------------------------------------------------- hành khách trong toa
const MAX_VRM = LOW ? 14 : 30;
const occupants = new Map(); // id → { id, car, si, p, vrm, tag, hidden }
let rosterKey = '', farSign = 1;
const hiddenSeat = new Set(); // ghế đang trống vì khách đang đi bộ lên / xuống
function syncRoster(R, dir) {
  const fs = 1; void dir; // toa không quay đầu (chỉ đầu máy chạy vòng) → vách xa máy quay luôn là phía -Z
  const key = (R && R.v) + '|' + fs;
  if (key === rosterKey) return; rosterKey = key; farSign = fs;
  const seen = new Set();
  for (const ck of CAR_ORDER) {
    const list = (R && R.cars && R.cars[ck]) || [], cap = (R && R.cap && R.cap[ck]) || 20;
    for (const p of list) {
      seen.add(p.id);
      let o = occupants.get(p.id);
      if (!o) { o = { id: p.id }; occupants.set(p.id, o); }
      if (o.car !== ck || o.si !== p.i || o.cap !== cap) { o.car = ck; o.si = p.i; o.cap = cap; o.moved = true; }
      o.p = p;
    }
  }
  for (const [id, o] of occupants) if (!seen.has(id)) { if (o.vrm) releaseVrm(o); if (o.tag) { o.tag.parent && o.tag.parent.remove(o.tag); } occupants.delete(id); }
  rebuildImpostors();
}
function seatOf(o) { const c = cars[o.car]; return c && seatLocal(c, o.si, o.cap, farSign); }
const _m = new THREE.Matrix4(), _c = new THREE.Color();
function rebuildImpostors() {
  for (const c of Object.values(cars)) { c.torso.count = 0; c.head.count = 0; c.hair.count = 0; }
  for (const o of occupants.values()) {
    if (o.vrm || hiddenSeat.has(o.id)) continue;
    const c = cars[o.car], s = seatOf(o); if (!c || !s) continue;
    const n = c.torso.count++;
    dummy.position.set(s.x, FLOOR + 0.82, s.z + s.face * 0.05); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); c.torso.setMatrixAt(n, dummy.matrix); c.torso.setColorAt(n, _c.set(colorOf(o.p.name)));
    dummy.position.y = FLOOR + 1.38; dummy.updateMatrix(); c.head.setMatrixAt(c.head.count++, dummy.matrix);
    dummy.position.y = FLOOR + 1.42; dummy.position.z = s.z - s.face * 0.02; dummy.updateMatrix(); c.hair.setMatrixAt(c.hair.count++, dummy.matrix); c.hair.setColorAt(c.hair.count - 1, _c.set(['#2a1d14', '#3b2a1e', '#1a1a1a', '#6b4a2a', '#8a5a3a'][hashStr(o.id) % 5]));
  }
  for (const c of Object.values(cars)) { for (const im of [c.torso, c.head, c.hair]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; } }
}
const vrmPool = []; // bản sao chưa dùng, theo mô hình
function takeVrm(t, id) { const i = vrmPool.findIndex(v => v.t === t); const inst = i >= 0 ? vrmPool.splice(i, 1)[0] : instVrm(t); if (id !== undefined) applyLook(inst, lookOf(id)); return inst; }

// ---------------------------------------------------------------- 100 kiểu hành khách: 10 nhân vật × 10 "diện mạo"
// Mỗi diện mạo: nhuộm tóc, đổi màu quần áo (giữ nguyên nếp vải / hoạ tiết, không đổi màu da), thêm mũ len / nón lá / mũ nồi /
// mũ lưỡi trai / khăn len. Diện mạo cố định theo từng người xem nên lần nào lên tàu cũng nhận ra mình.
const LOOKS = [
  { hair: null, shift: 0, hat: null, scarf: null },                                       // nguyên bản
  { hair: '#1a1410', shift: 0.5, hat: 'beanie', hatCol: '#c0392b', scarf: null },
  { hair: '#4a2e1c', shift: 0.25, hat: null, scarf: '#e9d8b4' },
  { hair: '#d9b46a', shift: -0.2, hat: 'beret', hatCol: '#222222', scarf: null },
  { hair: '#9aa0a8', shift: 0.65, hat: 'cap', hatCol: '#1d2f55', scarf: null },
  { hair: '#7a3420', shift: 0.12, hat: 'nonla', hatCol: '#e8cf8a', scarf: null },
  { hair: '#e88aa8', shift: 0.8, hat: null, scarf: '#ffffff' },
  { hair: '#2e1d14', shift: 0.4, hat: 'beanie', hatCol: '#d9a520', scarf: '#2e7d4f' },
  { hair: '#efe6d8', shift: 0.33, hat: null, scarf: null },
  { hair: '#1c2440', shift: 0.9, hat: 'cap', hatCol: '#c9b48a', scarf: '#b3261e' },
];
const lookOf = id => hashStr(String(id) + '|look') % LOOKS.length;
const RECOLOR_GLSL = `
vec3 _rgb2hsv(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-10)),d/(q.x+1e-10),q.x); }
vec3 _hsv2rgb(vec3 c){ vec4 K=vec4(1.,2./3.,1./3.,3.); vec3 p=abs(fract(c.xxx+K.xyz)*6.-K.www); return c.z*mix(K.xxx,clamp(p-K.xxx,0.,1.),c.y); }
uniform vec3 uTint; uniform float uMode; uniform float uShift;`;
function lookMaterial(orig, kind, L) {
  const m = orig.clone(); m.name = orig.name;
  const uTint = { value: new THREE.Color(L.hair || '#ffffff') }, uMode = { value: kind === 'hair' ? 1 : 2 }, uShift = { value: L.shift };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uTint, uMode, uShift });
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', RECOLOR_GLSL + '\nvoid main() {').replace('#include <map_fragment>', `#include <map_fragment>
      { vec3 c = diffuseColor.rgb; vec3 g = pow(max(c, 0.0), vec3(1.0 / 2.2)); vec3 hsv = _rgb2hsv(g); float lum = dot(c, vec3(0.299, 0.587, 0.114));
        if (uMode < 1.5) { diffuseColor.rgb = uTint * (lum * 1.9 + 0.02); } // nhuộm tóc: giữ độ sáng từng sợi
        else { bool skin = hsv.x < 0.12 && hsv.y > 0.1 && hsv.y < 0.62 && hsv.z > 0.42; // vùng da: giữ nguyên
          if (!skin) { if (hsv.y > 0.14) { hsv.x = fract(hsv.x + uShift); hsv.y = min(1.0, hsv.y * 1.15); } else if (hsv.z < 0.85) { hsv = vec3(fract(0.58 + uShift), 0.35, hsv.z); } diffuseColor.rgb = pow(_hsv2rgb(hsv), vec3(2.2)); } } }`);
  };
  m.customProgramCacheKey = () => 'look' + uMode.value;
  return m;
}
const lookCache = new Map();
function makeHat(kind, col) {
  const g = new THREE.Group(), mat = std(col, { roughness: 0.85 });
  if (kind === 'beanie') { const b = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat); b.scale.y = 1.05; g.add(b); const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.022, 8, 18), mat); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.02; g.add(cuff); const pom = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), std('#ffffff')); pom.position.y = 0.13; g.add(pom); }
  else if (kind === 'beret') { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.05, 18), mat); b.rotation.z = 0.25; b.position.set(0.02, 0.03, 0); g.add(b); }
  else if (kind === 'cap') { const b = new THREE.Mesh(new THREE.SphereGeometry(0.122, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mat); g.add(b); const v = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 16, 1, false, -Math.PI / 2, Math.PI), mat); v.scale.z = 0.85; v.position.set(0, 0, 0.07); g.add(v); }
  else if (kind === 'nonla') { const b = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.2, 18, 1, true), new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide, roughness: 0.9 })); b.position.y = 0.06; g.add(b); }
  return g;
}
function attachAt(inst, boneName, obj, offset) {
  const b = inst.bones[boneName]; if (!b) return;
  const saved = {}; for (const k of Object.keys(inst.t.rest)) if (inst.bones[k]) { saved[k] = inst.bones[k].quaternion.clone(); inst.bones[k].quaternion.copy(inst.t.rest[k]); } // gắn ở tư thế gốc cho đúng chỗ
  inst.holder.updateMatrixWorld(true);
  const p = b.getWorldPosition(new THREE.Vector3()).add(offset); b.add(obj); b.worldToLocal(p); obj.position.copy(p);
  obj.quaternion.copy(b.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(inst.holder.getWorldQuaternion(new THREE.Quaternion())));
  for (const [k, q] of Object.entries(saved)) inst.bones[k].quaternion.copy(q);
}
function applyLook(inst, v) {
  if (inst.look === v) return; inst.look = v;
  const L = LOOKS[v];
  if (!inst.orig) { inst.orig = []; inst.holder.traverse(o => { if (o.isMesh) inst.orig.push([o, o.material]); }); }
  for (const [o, m] of inst.orig) {
    const one = mm => {
      const kind = /HAIR/i.test(mm.name) ? 'hair' : /Body.*SKIN|CLOTH|Tops|Bottoms|Onepiece|Shoes/i.test(mm.name) ? 'cloth' : null;
      if (!kind || (kind === 'hair' && !L.hair) || (kind === 'cloth' && !L.shift)) return mm;
      const key = mm.uuid + '|' + v; let r = lookCache.get(key); if (!r) { r = lookMaterial(mm, kind, L); lookCache.set(key, r); } return r;
    };
    o.material = Array.isArray(m) ? m.map(one) : one(m);
  }
  // mũ, khăn: gỡ cái cũ, gắn cái mới
  for (const a of inst.acc || []) a.parent && a.parent.remove(a);
  inst.acc = [];
  if (L.hat) { const h = makeHat(L.hat, L.hatCol); attachAt(inst, 'head', h, new THREE.Vector3(0, L.hat === 'nonla' ? 0.2 : 0.14, 0)); inst.acc.push(h); }
  if (L.scarf) { const s = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.035, 8, 18), std(L.scarf, { roughness: 0.95 })); s.rotation.x = Math.PI / 2; const g = new THREE.Group(); g.add(s); attachAt(inst, 'neck', g, new THREE.Vector3(0, -0.01, 0.01)); inst.acc.push(g); }
}
function releaseVrm(o) { const v = o.vrm; if (!v) return; v.holder.parent && v.holder.parent.remove(v.holder); if (o.tag) o.tag.visible = false; vrmPool.push(v); o.vrm = null; }
function placeSeated(o) {
  const c = cars[o.car], s = seatOf(o), v = o.vrm; if (!c || !s || !v) return;
  c.group.add(v.holder);
  v.holder.position.set(s.x, FLOOR + 0.5 - v.t.hipsY + 0.04, s.z + s.face * 0.08);
  v.holder.rotation.set(0, s.face > 0 ? 0 : Math.PI, 0); v.holder.scale.setScalar(1);
  applyPose(v, v.t.sit);
  if (!o.tag) { o.tag = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: true })); o.tag.scale.set(0.82, 0.246, 1); }
  o.tag.material.map = tagTexture(o.p); o.tag.material.needsUpdate = true;
  o.tag.position.set(s.x, FLOOR + 1.72 + (o.si % 2) * 0.2, s.z + s.face * 0.25); o.tag.visible = s.side === 0; c.group.add(o.tag); // so le cho khỏi chồng nhau
}
let lodAt = 0;
function updateLod(now) {
  if (now - lodAt < 450) return; lodAt = now;
  const any = templates.male.length + templates.female.length;
  const cand = [];
  const camPos = camera.position;
  for (const o of occupants.values()) {
    const c = cars[o.car]; if (!c || hiddenSeat.has(o.id)) { if (o.vrm) releaseVrm(o); continue; }
    const s = seatOf(o); if (!s) continue;
    _v1.set(s.x, FLOOR + 1.2, s.z); c.group.localToWorld(_v1);
    const d = _v1.distanceTo(camPos) + (s.side ? 6 : 0) - (c.cls === 'lareine' || c.cls === 'vip' ? 2 : 0);
    cand.push({ o, d });
  }
  cand.sort((a, b) => a.d - b.d);
  const want = new Set(any ? cand.slice(0, MAX_VRM).filter(x => x.d < 90).map(x => x.o.id) : []);
  let changed = false;
  for (const o of occupants.values()) if (o.vrm && (!want.has(o.id) || o.moved)) { releaseVrm(o); changed = true; }
  for (const id of want) { const o = occupants.get(id); if (o && !o.vrm) { const t = pickTemplate(id); if (t) { o.vrm = takeVrm(t, id); placeSeated(o); changed = true; } } }
  for (const o of occupants.values()) o.moved = false;
  if (changed) rebuildImpostors();
}

// ---------------------------------------------------------------- khách đi bộ lên / xuống tàu
const walkers = []; // { id, p, inst, path:[Vector3], seg, u, speed, done, onDone, tag }
function spawnWalker(p, from, to, opts = {}) {
  const t = pickTemplate(p.id);
  const w = { id: p.id, p, path: [from.clone(), ...(opts.via || []), to.clone()], seg: 0, u: 0, speed: opts.speed || 2.2, onDone: opts.onDone, phase: hash(walkers.length, 9) * 8, wait: opts.wait || 0 };
  if (t) { w.inst = takeVrm(t, p.id); w.inst.holder.scale.setScalar(0.95); scene.add(w.inst.holder); }
  else { w.simple = new THREE.Group(); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.9, 4, 8), std(colorOf(p.name))); b.position.y = 0.75; const h = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), std('#e8c39e')); h.position.y = 1.5; w.simple.add(b, h); scene.add(w.simple); }
  w.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTexture(p), transparent: true, depthWrite: false })); w.tag.scale.set(1.3, 0.39, 1); scene.add(w.tag);
  walkers.push(w);
  return w;
}
function updateWalkers(dt, now) {
  for (let i = walkers.length - 1; i >= 0; i--) {
    const w = walkers[i], obj = w.inst ? w.inst.holder : w.simple;
    if (w.wait > 0) { w.wait -= dt; obj.visible = false; w.tag.visible = false; continue; }
    obj.visible = true; w.tag.visible = true;
    const a = w.path[w.seg], b = w.path[w.seg + 1];
    if (!b) { // tới nơi
      scene.remove(obj); scene.remove(w.tag); if (w.inst) vrmPool.push(w.inst); walkers.splice(i, 1); if (w.onDone) w.onDone(); continue;
    }
    const len = Math.max(0.01, a.distanceTo(b));
    w.u += w.speed * dt / len;
    if (w.u >= 1) { w.u = 0; w.seg++; continue; }
    obj.position.lerpVectors(a, b, w.u);
    obj.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    if (w.inst) { w.phase += dt * w.speed * 2.3; const f = w.phase % 8, i0 = Math.floor(f), u = f - i0; blendPose(w.inst, w.inst.t.walk[i0], w.inst.t.walk[(i0 + 1) % 8], u); obj.position.y += Math.abs(Math.sin(w.phase * Math.PI / 4)) * 0.04; }
    w.tag.position.set(obj.position.x, obj.position.y + 2.15, obj.position.z);
  }
}
// cửa toa gần nhất phía sân ga (sân ga ở phía +Z thế giới)
function doorWorld(carKey, end) {
  const c = cars[carKey]; if (!c) return null;
  const v = new THREE.Vector3(end * (CAR_L / 2 - 0.78), 0.9, 0);
  c.group.updateMatrixWorld(true); c.group.localToWorld(v);
  v.z = 1.9; v.y = 0.9 + trackY(v.x); return v;
}
function stationNearX(x) { return Math.abs(x - STATION_X[0]) < Math.abs(x - STATION_X[1]) ? STATION_X[0] : STATION_X[1]; }

// ---------------------------------------------------------------- khói hơi nước
const SMOKE_N = LOW ? 70 : 140, smoke = [];
const smokeTex = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 6, 64, 64, 62); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(0.5, 'rgba(240,240,245,.45)'); r.addColorStop(1, 'rgba(240,240,245,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
for (let i = 0; i < SMOKE_N; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; scene.add(s); smoke.push({ s, life: 0, max: 1, v: new THREE.Vector3() }); }
let smokeI = 0;
function puff(pos, vel, size, life, color) {
  const p = smoke[smokeI = (smokeI + 1) % SMOKE_N];
  p.s.position.copy(pos); p.v.copy(vel); p.life = p.max = life; p.size = size; p.s.visible = true; p.s.material.color.set(color || 0xffffff);
}
function updateSmoke(dt, night) {
  for (const p of smoke) {
    if (p.life <= 0) { if (p.s.visible) p.s.visible = false; continue; }
    p.life -= dt; p.s.position.addScaledVector(p.v, dt); p.v.multiplyScalar(0.985); p.v.y += dt * 0.6;
    const a = p.life / p.max, sz = p.size * (1 + (1 - a) * 3.2);
    p.s.scale.set(sz, sz, 1); p.s.material.opacity = 0.55 * a * (night ? 0.6 : 1);
  }
}

// ---------------------------------------------------------------- vật cản sự kiện: đàn bò, cây thông đổ
const cows = new THREE.Group(); scene.add(cows); cows.visible = false;
for (let k = 0; k < 3; k++) {
  const c = new THREE.Group(), col = k === 1 ? '#f2efe6' : '#8b5a2b';
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.8), std(col)); body.position.y = 1.15; c.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.45), std(col)); head.position.set(1.05, 1.4, 0); c.add(head);
  for (const [x, z] of [[-0.7, -0.3], [-0.7, 0.3], [0.7, -0.3], [0.7, 0.3]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.75, 0.16), std('#3a2a1f')); l.position.set(x, 0.38, z); c.add(l); }
  for (const z of [-0.18, 0.18]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 6), std('#eee')); h.position.set(1.05, 1.75, z); c.add(h); }
  c.position.set(k * 3.2, 0.3, (k - 1) * 1.4); c.rotation.y = (k - 1) * 0.6; c.traverse(o => { if (o.isMesh) o.castShadow = true; }); cows.add(c);
}
const fallen = new THREE.Group(); scene.add(fallen); fallen.visible = false;
{ const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 11, 8), std('#5a3b26')); tr.rotation.x = Math.PI / 2; tr.rotation.z = 0.25; tr.position.y = 0.7; fallen.add(tr); for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 6), std('#2f5b35')); f.scale.set(1, 0.5, 1); f.position.set(Math.sin(k) * 0.6, 1.2, -3 - k * 1.6); fallen.add(f); } fallen.traverse(o => { if (o.isMesh) o.castShadow = true; }); }

// ---------------------------------------------------------------- máy quay điện ảnh + flycam
// Chọn góc theo tình huống (qua thung lũng hoa → flycam, lên dốc → góc thấp đón đầu, có vật cản → quay phía trước,
// sắp vào ga → máy đặt sẵn ở ga đón tàu, vừa rời ga → nhìn tàu đi). Chuyển cảnh lúc cắt thẳng, lúc lướt mượt;
// trong mỗi cảnh máy quay chuyển động êm (làm mượt), không bao giờ chui xuống đất.
let shot = { name: 'hero3q', start: 0, dur: 9000, seed: 0, blend: 0 }, lastPhase = '', phaseAt = 0;
const camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
const curPos = new THREE.Vector3(0, 6, 30), curTgt = new THREE.Vector3(), fromPos = new THREE.Vector3(), fromTgt = new THREE.Vector3();
const DRONE = new Set(['droneOrbit', 'droneRise', 'droneTop', 'droneStation', 'dollyAlong']);
let pendingShot = null; // để kiểm thử: R3D.setShot('window')
const easeIO = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
function pickWeighted(w) { let s = 0; for (const v of Object.values(w)) s += v; let r = Math.random() * s; for (const [k, v] of Object.entries(w)) { if ((r -= v) <= 0) return k; } return Object.keys(w)[0]; }
function startShot(now, name, opts = {}) {
  const soft = opts.blend !== undefined ? opts.blend : (DRONE.has(name) && DRONE.has(shot.name)) || Math.random() < 0.3 ? 1600 : 0;
  fromPos.copy(curPos); fromTgt.copy(curTgt); lodAt = 0; // cắt cảnh: xếp lại khách VRoid gần máy quay ngay
  shot = { name, start: now, dur: opts.dur || (name === 'window' ? 6500 : name === 'trackside' ? 14000 : 8000 + Math.random() * 4000), seed: Math.random(), blend: soft, fixed: null };
}
function chooseRunShot(st, now) {
  const k = st.km, zone = zoneAt(k * VIS), ev = st.ev && !st.ev.done ? st.ev.type : '';
  const left = st.leg === 0 ? 7 - k : k;
  if (ev === 'cow' || ev === 'tree') return 'eventFront';
  if (left < 0.45) return 'arrival';
  if (now - phaseAt < 9000) return 'departure';
  const lux = [...occupants.values()].some(o => /lareine|vip/.test(o.car));
  const w = { hero3q: 3, dollyAlong: 3, window: lux ? 3 : 1.5, droneOrbit: 2, droneRise: 1.2, droneTop: 1, chase: 1.5, trackside: 2.2, cabView: 1, front: 1 };
  if (zone === 'flower' || zone === 'farm' || zone === 'glass') { w.droneOrbit += 2; w.droneRise += 1.5; w.droneTop += 1; }
  if (zone === 'hill') { w.front += 2; w.hero3q += 2; w.trackside += 1; }
  if (zone === 'pine') { w.trackside += 1.5; w.cabView += 0.5; }
  if (st.boost > 0) { w.chase += 3; w.trackside += 1; }
  if (ev === 'fog') { w.hero3q += 3; w.cabView += 2; w.droneOrbit = 0; w.droneTop = 0; }
  delete w[shot.name]; // không lặp lại góc vừa quay
  return pickWeighted(w);
}
// vị trí thế giới của một điểm trên đoàn tàu (toạ độ trong group toa)
function trainPoint(carKey, lx, ly, lz) { const c = cars[carKey]; const v = new THREE.Vector3(lx, ly, lz); c.group.updateMatrixWorld(true); return c.group.localToWorld(v); }
function windowSeatWorld(carKey) { // ghế có khách ở băng ghế đối diện cửa sổ (thấy mặt)
  const occ = [...occupants.values()].filter(o => o.car === carKey && !hiddenSeat.has(o.id) && seatOf(o) && seatOf(o).side === 0);
  const o = occ.length ? occ[Math.floor(shot.seed * occ.length)] : null;
  const s = o ? seatOf(o) : { x: 0, z: -farSign * 0.8 };
  return trainPoint(carKey, s.x, FLOOR + 1.35, s.z);
}
// cụm khách đông nhất (cho ảnh lưu niệm): toa VIP / Lareine nhiều khách nhất, lấy tâm của tối đa 4 ghế liền nhau
function groupShotPoint() {
  const pool = ['vip1', 'vip2', 'lareine1', 'lareine2', 'mem', 'cung'];
  let best = null, bestN = -1;
  for (const k of pool) { const n = [...occupants.values()].filter(o => o.car === k && !hiddenSeat.has(o.id) && seatOf(o) && seatOf(o).side === 0).length; if (n > bestN + (/vip|lareine/.test(k) ? 0 : 1)) { best = k; bestN = n; } }
  const seats = [...occupants.values()].filter(o => o.car === best && seatOf(o) && seatOf(o).side === 0).map(o => seatOf(o).x).sort((a, b) => a - b);
  let x = 0; if (seats.length) { const m = Math.max(0, Math.floor(seats.length / 2) - 2), part = seats.slice(m, m + 4); x = part.reduce((a, b) => a + b, 0) / part.length; }
  return trainPoint(best || 'vip1', x, FLOOR + 1.3, -0.6);
}
function updateCamera(st, now, dt) {
  const locoX = loco.getWorldPosition(_v1).x, dir = st.dir;
  const atStation = st.ph !== 'run';
  if (st.ph !== lastPhase) {
    lastPhase = st.ph; phaseAt = now;
    startShot(now, st.ph === 'run' ? 'departure' : st.ph === 'board' ? 'platformLow' : 'alighting', { blend: 0 });
  }
  if (pendingShot) { startShot(now, pendingShot, { blend: 0, dur: 1e9 }); pendingShot = null; }
  let k = (now - shot.start) / shot.dur;
  const midX = locoX - dir * TRAIN_LEN / 2, rearX = locoX - dir * TRAIN_LEN;
  let smoothK = 5; // độ êm (càng nhỏ càng trôi)
  let abs = false;  // true: vị trí tính từ điểm thế giới (đã gồm độ cao đường ray); false: tính so với mặt ray → cộng thêm độ cao ray
  // sắp tới giờ tàu chạy: máy quay cận trực ban giơ cờ, thổi còi, đoàn tàu phía sau
  if ((st.ph === 'board' || st.ph === 'stop') && st.left > 0 && st.left < 6500 && shot.name !== 'officer' && st.photo > 4600) startShot(now, 'officer', { blend: 0, dur: 8000 });
  if (st.photo < 4600) { // chụp ảnh lưu niệm: lia tới cụm khách đông nhất rồi dí sát cửa sổ cho vừa khung ảnh
    const p = groupShotPoint(), z = 1 - easeIO(clamp((st.photo - 500) / 2300, 0, 1));
    camTarget.copy(p); camPos.set(p.x + 0.3, p.y + 0.25, 8.8 + 12 * z); smoothK = 8; abs = true; // dừng ở ~9 m: khung ảnh lấy được 2 cửa sổ (3–4 khách)
  } else if (st.focus && now < st.focus.until && cars[st.focus.key]) { // khách vừa lên toa VIP / Lareine
    const p = windowSeatWorld(st.focus.key); camTarget.copy(p); camPos.set(p.x - dir * 1.2, p.y + 0.25, 4.4); smoothK = 6; abs = true;
  } else {
    if (k >= 1) { startShot(now, atStation ? pickWeighted(st.ph === 'board' ? { platformLow: 3, platform: 2, stationWide: 1.5, droneStation: 1.5, ticket: 1.5 } : { platform: 2, platformLow: 2, stationWide: 2, droneStation: 2 }) : chooseRunShot(st, now)); k = 0; }
    const u = clamp(k, 0, 1), sd = shot.seed;
    switch (shot.name) {
      case 'hero3q': camTarget.set(locoX - dir * 16, 2.3, 0); camPos.set(locoX + dir * (14 - u * 4), 2.6 + sd * 2.5, 11 + sd * 6); break;
      case 'dollyAlong': { const x = lerp(locoX + dir * 4, rearX - dir * 4, easeIO(u)); camTarget.set(x - dir * 4, 2.3, 0); camPos.set(x + dir * 6, 3.4 + sd * 2, 22 + sd * 8); smoothK = 3; break; } // lia dọc cả đoàn tàu
      case 'window': {
        const busy = CAR_ORDER.filter(c => [...occupants.values()].some(o => o.car === c && !hiddenSeat.has(o.id)));
        const lux = busy.filter(c => /lareine|vip/.test(c)), pool = lux.length && sd < 0.75 ? lux : busy.length ? busy : CAR_ORDER;
        const p = windowSeatWorld(pool[Math.floor(sd * 97) % pool.length]); camTarget.copy(p); camPos.set(p.x + dir * (0.5 - u * 1.0), p.y - 0.1, 5.6); abs = true; break; // nhìn thẳng vào ô cửa sổ, thấy cả biển tên + số hiệu toa bên dưới
      }
      case 'droneOrbit': { const a = sd * 6.28 + u * 1.2 * (sd < 0.5 ? 1 : -1), r = 42 + sd * 20; camTarget.set(midX + dir * 10, 2, 0); camPos.set(midX + Math.cos(a) * r, 18 + sd * 14 + Math.sin(u * 3) * 2, Math.abs(Math.sin(a)) * r + 12); smoothK = 2.5; break; }
      case 'droneRise': { const e = easeIO(u); camTarget.set(locoX - dir * 10, 2 + e * 2, 0); camPos.set(locoX + dir * (30 - e * 10), 2.2 + e * 48, 16 + e * 40); smoothK = 2.5; break; }
      case 'droneTop': camTarget.set(locoX - dir * 12, 0, 0); camPos.set(locoX - dir * 40, 55 + sd * 15, 18); smoothK = 2.5; break;
      case 'chase': camTarget.set(locoX + dir * 40, 3.5, 0); camPos.set(rearX - dir * (12 + sd * 6), 4.2 + sd * 3, 4.5 + sd * 3); break;
      case 'trackside': { // máy đặt cố định bên đường ray, tàu chạy ngang qua
        if (!shot.fixed) shot.fixed = new THREE.Vector3(locoX + dir * (40 + sd * 20), 0, 11 + sd * 6); // đứng sau hàng hoa ven đường
        const f = shot.fixed; camPos.set(f.x, groundRel(f.x, f.z) + 2.0 + sd * 1.2, f.z);
        const tx = clamp(locoX - dir * 4, Math.min(f.x - 60, f.x + 60), Math.max(f.x - 60, f.x + 60)); camTarget.set(tx, 2.4, 0); smoothK = 4;
        if ((locoX - f.x) * dir > TRAIN_LEN * 0.8) shot.dur = 0; // cả đoàn đã chạy qua
        break;
      }
      case 'cabView': { const p = loco.localToWorld(_v2.set(-8.6, 4.3, 0.7)), t2 = loco.localToWorld(new THREE.Vector3(30, 2.5, 0)); camPos.copy(p); camTarget.copy(t2); smoothK = 10; abs = true; break; } // góc lái tàu
      case 'officer': { const o = officerSpot(stationNearX(locoX)); camTarget.set(o.x - 0.6, 2.0, o.z - 0.6); camPos.set(o.x + 5.2 - u * 1.2, 2.1, o.z + 0.9); smoothK = 4; break; } // trực ban giơ cờ tiễn tàu (nhìn chéo phía trước, đoàn tàu phía sau)
      case 'front': camTarget.set(locoX, 2.6, 0); camPos.set(locoX + dir * (24 - u * 6), 1.5, 3.4 + sd * 2); break;
      case 'eventFront': camTarget.set(locoX + dir * 8, 1.8, 0); camPos.set(locoX + dir * 30, 3.2, 9); smoothK = 3; break;
      case 'arrival': { const sx = stationNearX(locoX + dir * 80); camTarget.set(locoX - dir * 6, 2.2, 0); camPos.set(sx + 25 + sd * 10, 3.5 + sd * 3, 13); smoothK = 3; break; }
      case 'departure': { const sx = stationNearX(rearX); camTarget.set(midX, 2.3, 0); camPos.set(sx - 45 * dir, 3.2 + sd * 2, 11); smoothK = 3; break; }
      case 'platformLow': { const sx = stationNearX(locoX); camTarget.set(sx - 18, 1.6, 2.2); camPos.set(sx + 10 - u * 8, 1.9, 6.2); break; } // ngang tầm mắt trên sân ga, thấy khách đi tới cửa toa
      case 'platform': { const sx = stationNearX(locoX), x = sx + 22 - u * 12; camTarget.set(sx - 30, 1.7, 3); camPos.set(x, 2.7, 10.5); break; }
      case 'ticket': { const sx = stationNearX(locoX); camTarget.set(sx + 40, 2.2, 10); camPos.set(sx + 30 - u * 4, 2.6, 16); break; } // phòng vé
      case 'alighting': { const sx = stationNearX(locoX); camTarget.set(sx - 20, 1.6, 3); camPos.set(sx + 5, 3.2, 12); break; }
      case 'stationWide': { const sx = stationNearX(locoX); camTarget.set(sx, 5, 14); camPos.set(sx + 34 - u * 20, 13 + u * 3, -36); smoothK = 3; break; }
      case 'droneStation': { const sx = stationNearX(locoX), a = sd * 6 + u * 0.9; camTarget.set(sx, 3, 8); camPos.set(sx + Math.cos(a) * 75, 30 + sd * 10, 8 + Math.sin(a) * 60 + 20); smoothK = 2.5; break; }
      default: camTarget.set(locoX - dir * 14, 2.2, 0); camPos.set(locoX + dir * 12, 3.4, 14);
    }
  }
  if (!abs) { camPos.y += trackY(camPos.x); camTarget.y += trackY(camTarget.x); } // bám theo độ cao đường ray (đoạn lên dốc)
  // không cho máy quay chui xuống đất
  const gy = groundH(camPos.x, camPos.z) + (Math.abs(camPos.z) < 9 && !nearStation(camPos.x, camPos.z) ? 0.9 : 1.2);
  if (camPos.y < gy) camPos.y = gy;
  // lướt mượt giữa hai cảnh (nếu là chuyển cảnh mềm), còn lại làm mượt chuyển động trong cảnh
  const sinceStart = now - shot.start;
  if (shot.blend && sinceStart < shot.blend) {
    const e = easeIO(sinceStart / shot.blend);
    curPos.lerpVectors(fromPos, camPos, e); curTgt.lerpVectors(fromTgt, camTarget, e);
  } else if (sinceStart < 50 && !shot.blend) { curPos.copy(camPos); curTgt.copy(camTarget); } // cắt cảnh
  else { const a = 1 - Math.exp(-dt * smoothK); curPos.lerp(camPos, a); curTgt.lerp(camTarget, Math.min(1, a * 1.6)); }
  camera.position.copy(curPos); camera.lookAt(curTgt);
  // rung máy nhẹ khi tàu chạy (không rung với flycam)
  if (st.ph === 'run' && st.sp > 2 && !DRONE.has(shot.name)) camera.position.y += Math.sin(now * 0.013) * 0.03 * st.sp / 20;
}

// ---------------------------------------------------------------- vòng cập nhật
let lastLocoWest = null, wheelAngle = 0, smokeAcc = 0, lastLeg = -1, lastTrip = -1, prevPh = '';
let stopStart = 0;
const alightQueue = [];
function frame(st) {
  const { now, dt, t } = st;
  // vị trí đoàn tàu: đuôi phía đông = km × VIS; lượt về đầu máy chạy vòng sang đầu phía tây
  if (st.ph !== prevPh) { if (st.ph === 'stop') stopStart = now; onPhase(st, prevPh); prevPh = st.ph; }
  const E = st.km * VIS;
  const locoWest = st.leg === 1 || (st.ph === 'stop' && now - stopStart > 9000);
  if (lastLocoWest !== null && locoWest !== lastLocoWest) { // đổi đầu: phụt hơi che lúc đầu máy chạy vòng
    for (let i = 0; i < 26; i++) puff(_v2.set(loco.position.x + (Math.random() - 0.5) * 12, 1 + Math.random() * 3 + loco.position.y, (Math.random() - 0.5) * 4), new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2), 4, 3.5);
  }
  lastLocoWest = locoWest;
  train.position.set(0, 0.32, 0);
  // mỗi toa / đầu máy đặt theo độ cao đường ray và nghiêng theo độ dốc (lên dốc thật)
  CAR_ORDER.forEach((k, i) => { const g = cars[k].group, x = E - LOCO_L - GAP - i * (CAR_L + GAP) - CAR_L / 2; g.position.set(x, trackY(x), 0); g.rotation.set(0, 0, Math.atan(trackSlope(x))); });
  if (!locoWest) { const x = E - LOCO_L / 2; loco.position.set(E, trackY(x), 0); loco.rotation.set(0, 0, Math.atan(trackSlope(x))); }
  else { // lượt về: đầu máy đã chạy vòng sang đầu phía tây, móc vào trước toa ngồi cứng, mũi hướng về Đà Lạt
    const west = E - LOCO_L - GAP - 6 * (CAR_L + GAP) + GAP;        // mép tây của toa ngồi cứng
    const front = west - GAP - LOCO_L, x = front + LOCO_L / 2;       // mũi đầu máy ở phía tây, thân kéo dài về phía đông tới khớp nối
    loco.position.set(front, trackY(x), 0); loco.rotation.set(0, Math.PI, -Math.atan(trackSlope(x)));
  }
  const dir = locoWest ? -1 : 1;
  st.dir = dir;
  syncRoster(st.R, dir);
  // bánh xe + thanh truyền
  const dist = st.ph === 'run' ? st.sp / 3.6 * dt : 0;
  wheelAngle += dist / 0.8;
  for (const w of wheelSpin) w.rotation.z = -wheelAngle * 0.8 / w.userData.r;
  for (const r of locoParts.rods) { const a = -wheelAngle + (r.side > 0 ? 0 : Math.PI / 2); r.rod.position.set(-4.7 + Math.cos(a) * 0.35, 1.2 + Math.sin(a) * 0.35, r.rod.position.z); r.piston.position.x = -2.0 + Math.cos(a) * 0.35; }
  // khói từ ống khói
  const moving = st.ph === 'run' && st.sp > 0.5;
  smokeAcc += dt * (moving ? 6 + st.sp * 0.35 : 2) * (st.boost > 0 ? 1.5 : 1);
  const chim = loco.localToWorld(_v2.set(-0.7, 5.1, 0));
  while (smokeAcc > 1) { smokeAcc--; puff(chim, new THREE.Vector3(-dir * st.sp / 3.6 * 0.6 + (Math.random() - 0.5) * 0.6, 2.2 + Math.random(), (Math.random() - 0.5) * 0.6), 1.1 + Math.random() * 0.5, 3.2); }
  if (st.horn > 0 && Math.random() < 0.5) puff(loco.localToWorld(_v2.set(-6.2, 4.4, 0.3)), new THREE.Vector3(0, 3, 0), 0.5, 1, 0xffffff);
  updateSmoke(dt, st.sky.night > 0.5);
  // trời: màu, mặt trời / mặt trăng, sao, sương mù
  const skyN = st.sky.night;
  skyMat.uniforms.top.value.set(st.sky.top); skyMat.uniforms.bot.value.set(st.sky.bot);
  const fogCol = new THREE.Color(st.sky.bot).lerp(new THREE.Color('#c8d8e2'), 0.25 * (1 - skyN));
  scene.fog.color.copy(fogCol);
  const fogEv = st.ev && st.ev.type === 'fog' && !st.ev.done ? 1 - st.ev.prog / st.ev.goal : 0;
  scene.fog.near = lerp(140, 8, fogEv); scene.fog.far = lerp(1500, 90, fogEv) * (skyN > 0.6 ? 0.8 : 1);
  stars.material.opacity = clamp((skyN - 0.35) * 1.6, 0, 1);
  sky.position.copy(camera.position); stars.position.copy(camera.position); // vòm trời luôn bao quanh máy quay (tuyến thật dài 6,5 km)
  const h = st.sky.h, day = h >= 6 && h <= 18.5, p = day ? (h - 6) / 12.5 : ((h + 24 - 18.5) % 24) / 11.5;
  const cx = camera.position.x;
  const az = lerp(-1.2, 1.2, p), el = Math.sin(p * Math.PI) * 0.9 + 0.05;
  const sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
  sun.visible = day; moon.visible = !day;
  (day ? sun : moon).position.set(cx + sunDir.x * 3000, sunDir.y * 3000, sunDir.z * 3000);
  sun.material.color.set(h < 7.5 || h > 16.8 ? 0xffb070 : 0xfff2c8);
  hemi.intensity = lerp(1.6, 0.6, skyN); hemi.color.set(skyN > 0.5 ? 0x6a78b0 : 0xdfefff);
  sunLight.intensity = day ? lerp(2.4, 0.6, clamp((Math.abs(h - 12) - 4) / 2.5, 0, 1)) : 0.35;
  sunLight.color.set(day ? (h < 8 || h > 16.5 ? 0xffc890 : 0xfff1d8) : 0x8aa0ff);
  const tgt = cars.vip1.group.getWorldPosition(_v1);
  sunLight.target.position.copy(tgt); sunLight.position.copy(tgt).addScaledVector(sunDir, 300);
  for (const c of clouds) c.material.opacity = 0.85 * (1 - skyN * 0.75);
  // đèn: đèn pha, đèn ga, đèn trong toa, viền LED tàu đêm
  const lit = skyN > 0.35 || fogEv > 0;
  locoParts.spot.intensity = lit ? 60 : 0; locoParts.lamp.emissiveIntensity = lit ? 3 : 0.3; locoParts.lampGlow.material.opacity = lit ? 0.9 : 0;
  locoParts.cabWin.emissiveIntensity = skyN > 0.45 ? 0.8 : 0;
  for (const l of lampLights) { l.head.material.emissiveIntensity = skyN > 0.4 ? 2 : 0; l.glow.material.opacity = skyN > 0.4 ? 0.85 : 0; }
  for (const m of stationMats) if (m.emissive) m.emissiveIntensity = skyN > 0.45 ? 0.55 : 0;
  for (const m of nightMats) m.emissiveIntensity = skyN > 0.45 ? (m.emissiveMap && m.map !== m.emissiveMap ? 1.1 : 0.22) : 0; // nhà dân lên đèn ban đêm (chỉ ô cửa sổ sáng)
  for (const m of signMats) m.emissiveIntensity = skyN > 0.45 ? 0.75 : 0.12; // biển quán sáng đèn
  for (const c of Object.values(cars)) {
    c.led.visible = !!st.night;
    c.innerLight.intensity = skyN > 0.4 ? 9 : 5;
    if (c.nightBody) c.bodyMat.color.set(st.night ? '#8a7a6a' : '#ffffff');
  }
  // vật cản
  const ev = st.ev;
  cows.visible = !!(ev && ev.type === 'cow'); fallen.visible = !!(ev && ev.type === 'tree');
  if (cows.visible) { const out = ev.done ? (st.evOut = (st.evOut || 0) + dt) : 0; cows.position.set(loco.position.x + dir * 16, trackY(loco.position.x + dir * 16), out * 3); cows.children.forEach((c, i) => { c.position.y = 0.3 + (ev.done ? 0 : Math.abs(Math.sin(t * 2 + i)) * 0.04); }); }
  if (fallen.visible) { const out = ev.done ? 1 : 0; fallen.position.set(loco.position.x + dir * 14, out * 6 + trackY(loco.position.x + dir * 14), 0); fallen.rotation.y = 1.4; }
  // lái tàu
  if (st.R && st.R.driver) { const d = st.R.driver; locoParts.tag.visible = true; const tex = tagTexture({ id: 'drv' + d.id, name: '👑 ' + d.name, avatar: d.avatar }); if (locoParts.tag.material.map !== tex) { locoParts.tag.material.map = tex; locoParts.tag.material.needsUpdate = true; } } else locoParts.tag.visible = false;
  // bảng giờ tàu ở phòng vé
  for (const b of ttBoards) drawTimetable(b, st.tt || 0);
  updateCamera(st, now, dt);
  updateLod(now);
  updateWalkers(dt, now);
  updateAttendants(st, performance.now());
  updateOfficers(st, performance.now());
  // khách ngồi khẽ đung đưa theo nhịp tàu
  if (st.ph === 'run') for (const o of occupants.values()) if (o.vrm && o.vrm.bones.chest) o.vrm.bones.chest.rotation.z = Math.sin(t * 3 + hashStr(o.id) % 10) * 0.02 * Math.min(1, st.sp / 15);
  renderer.render(scene, camera);
}
// khách lên tàu: đi bộ từ toà ga tới cửa toa
function onBoard(e) {
  if (!e || !e.car) return;
  const o = occupants.get(e.id) || { id: e.id };
  hiddenSeat.add(e.id); rebuildImpostors();
  const door = doorWorld(e.car, 1); if (!door) { hiddenSeat.delete(e.id); return; } // lên ở cửa có nhân viên đứng đón
  const from = new THREE.Vector3(door.x + (Math.random() - 0.5) * 14, door.y, 17 + Math.random() * 4); // từ cửa toà ga đi ra
  const done = () => { hiddenSeat.delete(e.id); rebuildImpostors(); lodAt = 0; };
  waveAt(e.car, 2.2); // nhân viên toa đó vẫy chào khi khách tới cửa
  spawnWalker({ id: e.id, name: e.name, avatar: e.avatar }, from, new THREE.Vector3(door.x, door.y + 0.15, 1.5), { via: [new THREE.Vector3(door.x, door.y, 3.2)], speed: 2.4, onDone: done });
  setTimeout(done, 15000); // phòng khi bị kẹt
  void o;
}
// tàu dừng: một số khách bước xuống sân ga (ở Trại Mát đi dạo rồi lên lại, về Đà Lạt thì ra về)
function onPhase(st, from) {
  if (!(st.ph === 'stop' || st.ph === 'finish')) return;
  const list = [...occupants.values()].filter(o => seatOf(o) && seatOf(o).side === 0).slice(0, LOW ? 6 : 14);
  list.forEach((o, i) => {
    const door = doorWorld(o.car, 1); if (!door) return;
    hiddenSeat.add(o.id);
    const out = new THREE.Vector3(door.x + (Math.random() - 0.5) * 16, door.y, 10 + Math.random() * 6);
    const back = () => { hiddenSeat.delete(o.id); rebuildImpostors(); lodAt = 0; };
    const inDoor = new THREE.Vector3(door.x, door.y + 0.15, 1.5), step = new THREE.Vector3(door.x, door.y, 3.2);
    if (st.ph === 'stop') {
      spawnWalker(o.p, inDoor, out, { via: [step], speed: 1.6, wait: 1.2 + i * 0.45, onDone: () => {
        // đứng ngắm ga một lúc rồi đi bộ lên tàu lại trước giờ tàu chạy
        setTimeout(() => spawnWalker(o.p, out, inDoor, { via: [step], speed: 2.2, onDone: back }), 9000 + Math.random() * 4000);
      } });
    } else {
      spawnWalker(o.p, inDoor, out, { via: [step], speed: 1.6, wait: 1.2 + i * 0.45, onDone: () => {} });
    }
  });
  rebuildImpostors(); lodAt = 0;
  for (const k of CAR_ORDER) waveAt(k, 1.0, 2.5); // nhân viên vẫy chào khách xuống tàu
  void from;
}

// ---------------------------------------------------------------- nhân viên mỗi toa (tiếp viên đứng cửa đón khách)
// Ở ga: đứng trên sân ga cạnh cửa toa, tay chắp trước bụng, khách tới thì vẫy tay chào. Khi tàu chạy: đứng ở đầu toa, phía trong.
const ATT_NAME = { lareine1: 'La Reine 51612', lareine2: 'La Reine 51618', vip1: 'VIP 1 · 51620', vip2: 'VIP 2 · 51622', mem: 'Ngồi mềm', cung: 'Ngồi cứng' };
const attendants = {}; // khoá toa → { inst, cap, tag, waveFrom, waveUntil, inside }
function waveAt(carKey, after = 0, dur = 1.8) { const a = attendants[carKey]; if (!a) return; const n = performance.now(); a.waveFrom = Math.max(a.waveUntil || 0, n + after * 1000); a.waveUntil = a.waveFrom + dur * 1000; }
function makeCap() { // mũ kepi xanh đậm viền vàng, lưỡi trai đen
  const g = new THREE.Group();
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.105, 0.085, 20), std('#1d2f55', { roughness: 0.5 })); g.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.022, 20), brass); band.position.y = -0.02; g.add(band);
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 16, 1, false, -Math.PI / 2, Math.PI), std('#111')); visor.scale.z = 0.7; visor.position.set(0, -0.04, 0.06); g.add(visor);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.018, 10), brass); badge.position.set(0, 0, 0.106); g.add(badge);
  return g;
}
function attTag(carKey) {
  return canvasTex(320, 80, (g) => { g.fillStyle = 'rgba(29,47,85,.88)'; g.beginPath(); g.roundRect(4, 8, 312, 64, 30); g.fill(); g.strokeStyle = '#ffd36b'; g.lineWidth = 3; g.stroke(); g.fillStyle = '#ffd36b'; g.font = `800 26px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Tiếp viên · ' + ATT_NAME[carKey], 160, 41); });
}
function ensureAttendants() {
  if (Object.keys(attendants).length || templates.male.length + templates.female.length < 2) return;
  CAR_ORDER.forEach((k, i) => {
    const pool = (i % 2 ? templates.male : templates.female).length ? (i % 2 ? templates.male : templates.female) : templates.male.concat(templates.female);
    const t = pool[(i >> 1) % pool.length], inst = instVrm(t);
    applyPose(inst, t.greet); inst.holder.updateMatrixWorld(true);
    // đội mũ: gắn vào xương đầu, đặt ở đỉnh đầu
    const cap = makeCap(), head = inst.bones.head;
    if (head) { const top = head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.15, 0.01)); head.add(cap); head.worldToLocal(top); cap.position.copy(top); const hq = head.getWorldQuaternion(new THREE.Quaternion()).invert(); cap.quaternion.copy(hq); }
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: attTag(k), transparent: true, depthWrite: false })); tag.scale.set(1.5, 0.375, 1);
    attendants[k] = { inst, cap, tag, waveFrom: 0, waveUntil: 0, inside: null };
    scene.add(inst.holder, tag);
  });
}
// ---------------------------------------------------------------- trực ban ga: cầm cờ, thổi còi đón tiễn tàu
// Mỗi ga 1 trực ban đứng trên sân ga trước toà ga. Tàu sắp chạy (~7 giây cuối), lúc tàu chạy qua và lúc tàu vào ga:
// giơ cao cờ xanh phất phới, tay kia đưa còi lên miệng (tiếng còi do game.js phát). Còn lại đứng nghiêm cầm cờ cuộn.
const officerSpot = sx => ({ x: sx + 20, z: 4.6 });
const officers = [];
function makeFlag() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.75, 6), std('#d8c39a')); pole.position.y = 0.375; g.add(pole);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3, 6, 1), std('#1f9e4a', { side: THREE.DoubleSide, roughness: 0.7 }));
  cloth.geometry.translate(0.21, 0, 0); cloth.position.set(0, 0.6, 0); g.add(cloth);
  const furled = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.32, 8), std('#1f9e4a')); furled.position.set(0.03, 0.55, 0); g.add(furled);
  g.userData = { cloth, furled }; return g;
}
function ensureOfficers() {
  if (officers.length || !templates.male.length) return;
  STATION_X.forEach((sx, i) => {
    const t = templates.male[(i + 2) % templates.male.length], inst = instVrm(t);
    applyPose(inst, t.holdFlag); inst.holder.updateMatrixWorld(true);
    const cap = makeCap(); cap.children[0].material = std('#f4f4f0', { roughness: 0.5 }); cap.children[1].material = std('#b3261e'); // mũ trắng viền đỏ
    const head = inst.bones.head;
    if (head) { const top = head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.15, 0.01)); head.add(cap); head.worldToLocal(top); cap.position.copy(top); cap.quaternion.copy(head.getWorldQuaternion(new THREE.Quaternion()).invert()); }
    const flag = makeFlag(); scene.add(flag);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(320, 80, (g) => { g.fillStyle = 'rgba(179,38,30,.9)'; g.beginPath(); g.roundRect(4, 8, 312, 64, 30); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); g.fillStyle = '#fff'; g.font = `800 28px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Trực ban ga ' + (i ? 'Trại Mát' : 'Đà Lạt'), 160, 41); }), transparent: true, depthWrite: false })); tag.scale.set(1.6, 0.4, 1);
    const sp = officerSpot(sx); inst.holder.position.set(sp.x, 0.9 + trackY(sp.x), sp.z); inst.holder.rotation.y = Math.PI - 0.35; // quay mặt ra đường ray
    tag.position.set(sp.x, 0.9 + trackY(sp.x) + 2.35, sp.z);
    scene.add(inst.holder, tag);
    officers.push({ inst, flag, sx, tag });
  });
}
let offPhase = '', offPhaseAt = 0;
function updateOfficers(st, now) {
  ensureOfficers();
  if (st.ph !== offPhase) { offPhase = st.ph; offPhaseAt = now; }
  const locoX = loco.position.x, tailX = cars.cung.group.position.x;
  for (const o of officers) {
    const sp = officerSpot(o.sx), near = Math.min(Math.abs(locoX - sp.x), Math.abs(tailX - sp.x), Math.abs((locoX + tailX) / 2 - sp.x)) < 140;
    const signal = near && (((st.ph === 'board' || st.ph === 'stop') && st.left > 0 && st.left < 7500) || st.ph === 'run' || ((st.ph === 'stop' || st.ph === 'finish') && now - offPhaseAt < 4000));
    const t = o.inst.t;
    applyPose(o.inst, signal ? t.signal : t.holdFlag);
    o.inst.holder.updateMatrixWorld(true);
    const hand = o.inst.bones.rH; if (hand) hand.getWorldPosition(o.flag.position);
    o.flag.position.y -= signal ? 0.05 : 0.45; // cán cờ dựng đứng trong tay
    const { cloth, furled } = o.flag.userData;
    cloth.visible = signal; furled.visible = !signal;
    if (signal) { cloth.rotation.y = -0.6 + Math.sin(now / 140) * 0.35; const p = cloth.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(now / 90 + x * 14) * 0.04 * x / 0.42); } p.needsUpdate = true; } // cờ phất phới
  }
}
function updateAttendants(st, now) {
  ensureAttendants();
  const atStation = st.ph !== 'run';
  for (const k of CAR_ORDER) {
    const a = attendants[k]; if (!a) continue;
    const h = a.inst.holder, c = cars[k];
    if (atStation) { // trên sân ga, cạnh cửa toa
      if (a.inside !== false) { scene.add(h); a.inside = false; }
      const d = doorWorld(k, 1); h.position.set(d.x + 0.95, d.y, 2.55); h.rotation.set(0, -0.55, 0); // quay mặt ra sân ga, hơi nghiêng về phía cửa
      a.tag.visible = true; a.tag.position.set(h.position.x, d.y + 2.15, h.position.z);
    } else { // trong toa, đứng ở đầu toa
      if (a.inside !== true) { c.group.add(h); a.inside = true; }
      h.position.set(CAR_L / 2 - 1.05, FLOOR, 0.25); h.rotation.set(0, -Math.PI / 2, 0);
      a.tag.visible = false;
    }
    const t = a.inst.t;
    if (now >= a.waveFrom && now < a.waveUntil) { const ph = (now - a.waveFrom) / 260, f = Math.floor(ph) % 2, u = ph - Math.floor(ph); blendPose(a.inst, t.wave[f], t.wave[1 - f], u); }
    else { applyPose(a.inst, t.greet); if (a.inst.bones.chest && atStation) a.inst.bones.chest.rotation.y = Math.sin(now / 1400 + k.length) * 0.06; } // đứng nghiêm, khẽ quay người nhìn khách
  }
}

// chụp đúng khung hình máy quay đang thấy (dùng cho ảnh lưu niệm). rect: vùng cần cắt theo toạ độ màn hình 1080 x 1920
function capture(rect) {
  renderer.render(scene, camera); // vẽ lại rồi đọc ngay trong cùng lượt (không cần preserveDrawingBuffer)
  const src = renderer.domElement, k = src.width / W, r = rect || { x: 0, y: 0, w: W, h: H };
  const c = document.createElement('canvas'); c.width = Math.round(r.w * k); c.height = Math.round(r.h * k);
  c.getContext('2d').drawImage(src, r.x * k, r.y * k, r.w * k, r.h * k, 0, 0, c.width, c.height);
  return c;
}
window.R3D = { ok: true, frame, onBoard, canvas, capture, setShot: n => { pendingShot = n; }, info: () => ({ vrm: templates.male.length + templates.female.length, occ: occupants.size, active: [...occupants.values()].filter(o => o.vrm).length, walkers: walkers.length, shot: shot.name, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }) };
console.log('[3D] Cảnh 3D sẵn sàng');
