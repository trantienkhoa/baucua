// Họa Sĩ Neon — game TikTok LIVE: họa sĩ 3D vẽ chân dung người xem ngay trên phố (Three.js, 1080×1920)
// Dùng chung máy chủ, kết nối TikTok, nhân vật 3D (roster charXX), điệu nhảy và nhạc của Vũ Trường Neon. Không có MC: chỉ âm thanh game.
//  - Bình luận / thả tim → xếp hàng, được vẽ biếm họa.  Tặng quà → ưu tiên, quà càng lớn tranh càng giống ảnh đại diện.
//  - Thả tim / quà / follow → đầy thanh cầu vồng → DANCE PARTY: cả phố nhảy, đèn disco, trời chuyển đêm.
//  - Giữ chân người xem: số thứ tự hàng chờ, chọn kiểu tranh, chấm điểm tranh, vẽ tặng may mắn, bảng vàng, chia sẻ để chen hàng.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { rosterOutfit, shapeFor } from './roster.js';
import { loadAvatars, createAvatar, driveAvatar, disposeAvatar, avatarTemplates, templateForChar, costumeTime, outfitTime, setOutfitMix } from './avatars.js';
import { attachProp } from './costumes.js';
import { applyStyle, randomStyleId } from './styles.js';

const W = 1080, H = 1920;
const PI = Math.PI, TAU = PI * 2;
const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const HAND = '"Segoe Print", "Segoe Script", "Comic Sans MS", "Chalkboard SE", cursive';
const BIG = '"Arial Black", "Segoe UI Black", Impact, "Helvetica Neue", sans-serif';
const params = new URLSearchParams(location.search);
const OBS = params.has('obs');
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const backOut = k => { const c = 1.7; k = clamp(k, 0, 1) - 1; return 1 + (c + 1) * k * k * k + c * k * k; };
const now = () => performance.now() / 1000;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const glCanvas = document.getElementById('gl');
const hud = document.getElementById('hud');
const ctx = hud.getContext('2d');
const socket = io();
const DANCES = window.DANCES || [], SP = window.SPECIAL_POSES || {};
const Music = window.Music;

let S = {
  painterName: 'Họa sĩ Neon', painterChar: 'char08', paintSeconds: 14, paintFree: true,
  partyGoal: 1500, partySeconds: 20, painterLegend: true, painterQueueMax: 300,
  luckyEvery: 4, voteSeconds: 12, painterSfx: 0.8, freeCooldown: 5,
  quality: 'high', stylesEnabled: true, styleRate: 85, fusedArm: 80, idleSeconds: 420, rosterEnabled: true,
  tierNoble: 99, tierKing: 299, musicEnabled: true, synthMusic: true, volume: 0.35,
};
let ROSTER = [], TOP = [], isPrimary = true;

// ảnh đại diện TikTok tải qua máy chủ (giữ canvas “sạch” để vẽ được lên tranh)
const imgCache = new Map();
const proxied = url => /^https?:\/\//i.test(url) ? '/api/img?u=' + encodeURIComponent(url) : url;
function img(url) {
  if (!url) return null;
  let e = imgCache.get(url);
  if (!e) {
    e = { img: new Image(), ok: false };
    e.img.onload = () => e.ok = true;
    e.img.src = proxied(url);
    imgCache.set(url, e);
    if (imgCache.size > 1500) imgCache.delete(imgCache.keys().next().value);
  }
  return e.ok ? e.img : null;
}
function loadImage(url) {
  return new Promise(res => {
    if (!url) return res(null);
    const im = new Image(); let done = false;
    const fin = v => { if (!done) { done = true; res(v); } };
    im.onload = () => fin(im); im.onerror = () => fin(null);
    setTimeout(() => fin(null), 6000);
    im.src = proxied(url);
  });
}

// ======================================================================
// 3D
// ======================================================================
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.getElementById('err').style.display = 'block';
  throw e;
}
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(1);

const scene = new THREE.Scene();
const SKY_DAY = new THREE.Color(0xbfe3ff), SKY_NIGHT = new THREE.Color(0x160a33);
scene.background = SKY_DAY.clone();
scene.fog = new THREE.Fog(0xdfe9f7, 30, 80);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.25;

const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 150);
const CAM_POS = V3(0.42, 2.15, 7.75), CAM_LOOK = V3(0.42, 1.5, 0);
camera.position.copy(CAM_POS); camera.lookAt(CAM_LOOK);

let composer = null, bloom = null;
function setupComposer() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.12, 0.35, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); if (draw) draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.userData = { canvas: c, g };
  return t;
}
function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8, metalness: 0 }, o));
const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; };
function grain(g, w, h, n, a, dark = true) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${dark ? '0,0,0' : '255,255,255'},${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, rand(1, 3), rand(1, 3)); } }

// ---------- ánh sáng ----------
const hemi = new THREE.HemisphereLight(0xe8f4ff, 0xb08a66, 0.85); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 1.55); sun.position.set(6, 10, 8); scene.add(sun);
const fill = new THREE.DirectionalLight(0xffd6b8, 0.4); fill.position.set(-6, 4, 6); scene.add(fill);
const partyLights = [0xff3d9a, 0x3dd9ff, 0xffc23d, 0x8c5aff].map(c => { const l = new THREE.PointLight(c, 0, 14, 1.4); l.position.set(0, 3.5, 1); scene.add(l); return l; });

// ---------- bầu trời: ngày ↔ đêm (dance party) ----------
function skyTex(night) {
  return canvasTex(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    if (night) { gr.addColorStop(0, '#0b0526'); gr.addColorStop(0.55, '#2a0f55'); gr.addColorStop(1, '#6a1f7a'); }
    else { gr.addColorStop(0, '#5aaef0'); gr.addColorStop(0.55, '#a9d8ff'); gr.addColorStop(1, '#ffe7c4'); }
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (night) {
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${rand(0.3, 1)})`; const s = Math.random() < 0.08 ? 2.4 : 1.2; g.fillRect(rand(0, w), rand(0, h * 0.75), s, s); }
      const mg = g.createRadialGradient(790, 120, 10, 790, 120, 90); mg.addColorStop(0, 'rgba(255,250,230,1)'); mg.addColorStop(0.35, 'rgba(255,250,230,0.95)'); mg.addColorStop(0.4, 'rgba(255,240,200,0.25)'); mg.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = mg; g.beginPath(); g.arc(790, 120, 90, 0, TAU); g.fill();
    } else {
      const sg = g.createRadialGradient(790, 110, 10, 790, 110, 150); sg.addColorStop(0, 'rgba(255,255,235,1)'); sg.addColorStop(0.22, 'rgba(255,248,200,1)'); sg.addColorStop(0.3, 'rgba(255,236,170,0.45)'); sg.addColorStop(1, 'rgba(255,230,160,0)');
      g.fillStyle = sg; g.beginPath(); g.arc(790, 110, 150, 0, TAU); g.fill();
      for (let c = 0; c < 9; c++) {   // mây bông
        const cx = rand(0, w), cy = rand(40, 260), s = rand(0.6, 1.4);
        for (let k = 0; k < 7; k++) { const gg = g.createRadialGradient(cx + (k - 3) * 26 * s, cy + rand(-10, 10) * s, 2, cx + (k - 3) * 26 * s, cy, 40 * s); gg.addColorStop(0, 'rgba(255,255,255,0.95)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gg; g.beginPath(); g.arc(cx + (k - 3) * 26 * s, cy, 40 * s, 0, TAU); g.fill(); }
      }
    }
  });
}
const skyDay = mesh(new THREE.PlaneGeometry(150, 75), new THREE.MeshBasicMaterial({ map: skyTex(false), fog: false, depthWrite: false }), 0, 22, -50);
const skyNight = mesh(new THREE.PlaneGeometry(150, 75), new THREE.MeshBasicMaterial({ map: skyTex(true), fog: false, transparent: true, opacity: 0, depthWrite: false }), 0, 22, -49.9);
skyDay.renderOrder = -2; skyNight.renderOrder = -1;

// ---------- mặt đường lát gạch ----------
const paverTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#b48d68'; g.fillRect(0, 0, w, h);
  const cols = ['#e2c39b', '#d8b388', '#e9cfa9', '#cfa47a', '#dcbb93', '#c99a70'];
  const bw = 64, bh = 32;
  for (let y = 0; y < h; y += bh) for (let x = -bw; x < w; x += bw) {
    const ox = (y / bh) % 2 ? bw / 2 : 0;
    g.fillStyle = pick(cols); rr(g, x + ox + 2, y + 2, bw - 4, bh - 4, 5); g.fill();
  }
  grain(g, w, h, 5000, 0.08); grain(g, w, h, 2000, 0.08, false);
});
paverTex.wrapS = paverTex.wrapT = THREE.RepeatWrapping; paverTex.repeat.set(14, 14);
const ground = mesh(new THREE.PlaneGeometry(70, 70), std(0xffffff, { map: paverTex, roughness: 0.95 }), 0, 0, -10);
ground.rotation.x = -PI / 2;

// ---------- dãy nhà phố ----------
const SIGNS = ['TIỆM TRANH', 'CÀ PHÊ', 'HOA TƯƠI', 'BÁNH MÌ', 'TRÀ SỮA', 'ĐỒ LƯU NIỆM', 'KEM', 'SÁCH CŨ', 'NEON STUDIO'];
const WALLS = ['#f6c94e', '#f7a9a3', '#9fd8c8', '#a8c8f2', '#f3e1bd', '#ffb46b', '#c9b7f0', '#f6c94e', '#9fd8c8'];
const SHUTTER = ['#2e7d5b', '#2f5fa8', '#b8452f', '#3a8f8a', '#7a4ba8'];
const lanternMats = [];
function lanternGeo() {
  const pts = []; for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push(new THREE.Vector2(0.02 + Math.sin(k * PI) * 0.13, k * 0.34 - 0.17)); }
  return new THREE.LatheGeometry(pts, 14);
}
const LANTERN_GEO = lanternGeo();
function lantern(parent, x, y, z, color, s = 1) {
  const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45, roughness: 0.6 });
  lanternMats.push(m);
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
  mesh(LANTERN_GEO, m, 0, 0, 0, g);
  const cap = std(0x3a2a18); mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), cap, 0, 0.18, 0, g); mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), cap, 0, -0.18, 0, g);
  mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 4), cap, 0, 0.34, 0, g);
  mesh(new THREE.ConeGeometry(0.03, 0.12, 6), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 }), 0, -0.26, 0, g);
  parent.add(g); g.userData.sw = Math.random() * TAU;
  return g;
}
const swingers = [];
function facadeTex(wall, sign, floors, shutter) {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = wall; g.fillRect(0, 0, w, h);
    grain(g, w, h, 2500, 0.06);
    for (let i = 0; i < 6; i++) { const gr = g.createLinearGradient(0, rand(0, h), 0, h); gr.addColorStop(0, 'rgba(120,80,40,0)'); gr.addColorStop(1, 'rgba(120,80,40,0.10)'); g.fillStyle = gr; g.fillRect(rand(0, w), 0, rand(10, 40), h); }
    const fh = (h - 150) / floors;
    for (let f = 0; f < floors; f++) {
      const y = 20 + f * fh;
      for (const x of [34, 146]) {
        g.fillStyle = '#3a3040'; g.fillRect(x, y + 14, 76, fh - 40);
        g.fillStyle = 'rgba(255,230,170,0.85)'; g.fillRect(x + 6, y + 20, 64, fh - 52);
        g.fillStyle = shutter; g.fillRect(x - 16, y + 12, 18, fh - 36); g.fillRect(x + 74, y + 12, 18, fh - 36);
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(x - 16, y + 18 + k * (fh - 40) / 8); g.lineTo(x + 2, y + 18 + k * (fh - 40) / 8); g.moveTo(x + 74, y + 18 + k * (fh - 40) / 8); g.lineTo(x + 92, y + 18 + k * (fh - 40) / 8); g.stroke(); }
      }
      if (f === floors - 1 || f === floors - 2) {   // ban công + chậu hoa
        g.fillStyle = '#5a4030'; g.fillRect(10, y + fh - 26, w - 20, 6);
        g.strokeStyle = '#5a4030'; g.lineWidth = 3; for (let x = 14; x < w - 10; x += 12) { g.beginPath(); g.moveTo(x, y + fh - 26); g.lineTo(x, y + fh - 4); g.stroke(); }
        for (let k = 0; k < 5; k++) { g.fillStyle = pick(['#ff5d8f', '#ffd23f', '#ff8a3d', '#ffffff', '#c86bff']); g.beginPath(); g.arc(30 + k * 48, y + fh - 30, 7, 0, TAU); g.fill(); g.fillStyle = '#3f8f3a'; g.beginPath(); g.arc(24 + k * 48, y + fh - 26, 5, 0, TAU); g.fill(); }
      }
    }
    // tầng trệt: cửa hàng + biển hiệu
    const y0 = h - 150;
    g.fillStyle = '#2b2230'; g.fillRect(20, y0 + 40, w - 40, 110);
    for (let k = 0; k < 14; k++) { g.fillStyle = pick(['#ffcc66', '#ff7aa8', '#7fd1ff', '#9ce37d', '#ffffff', '#ffa94d']); g.fillRect(rand(30, w - 50), rand(y0 + 70, y0 + 130), rand(10, 26), rand(8, 20)); }
    g.fillStyle = '#fff7e6'; rr(g, 28, y0 + 2, w - 56, 34, 6); g.fill(); g.strokeStyle = '#5a3a22'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#7a2a1a'; g.font = `800 ${sign.length > 9 ? 17 : 21}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sign, w / 2, y0 + 20);
  });
}
function awningTex(c1, c2) {
  return canvasTex(256, 128, (g, w, h) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c2 : c1; g.fillRect(i * w / 8, 0, w / 8 + 1, h - 22); g.beginPath(); g.arc(i * w / 8 + w / 16, h - 22, w / 16, 0, PI); g.fill(); }
    grain(g, w, h - 30, 400, 0.06);
  });
}
const AWN = [['#e63946', '#fff4e6'], ['#2a9d8f', '#fff4e6'], ['#f4a261', '#fff4e6'], ['#457b9d', '#fff4e6'], ['#d1495b', '#ffe8a3']];
const houses = new THREE.Group(); scene.add(houses);
function makeHouse(x, z, w, h, i) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const floors = Math.max(2, Math.round((h - 2.6) / 1.6));
  const front = std(0xffffff, { map: facadeTex(WALLS[i % WALLS.length], SIGNS[i % SIGNS.length], floors, SHUTTER[i % SHUTTER.length]), roughness: 0.9 });
  const side = std(WALLS[i % WALLS.length], { roughness: 0.9 });
  mesh(new THREE.BoxGeometry(w, h, 3), [side, side, side, side, front, side], 0, h / 2, 0, g);
  // mái ngói
  const rs = new THREE.Shape(); rs.moveTo(-1.75, 0); rs.lineTo(1.75, 0); rs.lineTo(0, 1.1); rs.closePath();
  const rg = new THREE.ExtrudeGeometry(rs, { depth: w + 0.3, bevelEnabled: false }); rg.rotateY(PI / 2); rg.translate(-(w + 0.3) / 2, 0, 0);
  mesh(rg, std(i % 3 === 1 ? 0x8f4a3a : 0xb5533c, { roughness: 0.85 }), 0, h, 0, g);
  // mái hiên sọc
  const [c1, c2] = AWN[i % AWN.length];
  const aw = mesh(new THREE.PlaneGeometry(w * 0.92, 1.1), new THREE.MeshStandardMaterial({ map: awningTex(c1, c2), side: THREE.DoubleSide, roughness: 0.9, transparent: true, alphaTest: 0.5 }), 0, 2.55, 1.95, g);
  aw.rotation.x = -0.95;
  for (const sx of [-0.33, 0.33]) swingers.push(lantern(g, sx * w, 2.0, 2.25, pick([0xe63946, 0xffb703, 0xff6b9d, 0xff8c42]), 0.9));
  houses.add(g);
}
[[-10.4, 3.4, 6.2], [-7.0, 3.3, 7.4], [-3.7, 3.2, 5.8], [-0.5, 3.2, 7.0], [2.7, 3.2, 6.0], [5.9, 3.2, 7.6], [9.2, 3.4, 6.0]].forEach(([x, w, h], i) => makeHouse(x, -14, w, h, i + 1));

// ---------- cờ dây, đèn dây ----------
function catenary(a, b, sag, n) { const pts = []; for (let i = 0; i <= n; i++) { const k = i / n; pts.push(new THREE.Vector3(lerp(a.x, b.x, k), lerp(a.y, b.y, k) - Math.sin(k * PI) * sag, lerp(a.z, b.z, k))); } return pts; }
const flagGeo = new THREE.BufferGeometry().setFromPoints([V3(-0.14, 0, 0), V3(0.14, 0, 0), V3(0, -0.34, 0)]); flagGeo.computeVertexNormals();
const FLAG_COLORS = ['#e63946', '#ffb703', '#2a9d8f', '#457b9d', '#ff6b9d', '#8ac926', '#9d4edd', '#ff8c42'];
const bunting = [];
function addBunting(a, b, sag, n) {
  const pts = catenary(a, b, sag, n);
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.01, 4), std(0x5a4030));
  const im = new THREE.InstancedMesh(flagGeo, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), n - 1);
  const m4 = new THREE.Matrix4();
  for (let i = 1; i < n; i++) { m4.makeTranslation(pts[i].x, pts[i].y, pts[i].z); im.setMatrixAt(i - 1, m4); im.setColorAt(i - 1, new THREE.Color(FLAG_COLORS[i % FLAG_COLORS.length])); }
  scene.add(im); bunting.push({ im, pts });
}
addBunting(V3(-8, 6.2, -10.5), V3(8, 6.3, -10.5), 1.0, 38);
addBunting(V3(-6, 5.6, -6.8), V3(6.5, 5.8, -6.8), 0.8, 32);
const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8, toneMapped: false });
const bulbPts = catenary(V3(-8, 4.9, -11.6), V3(8, 4.9, -11.6), 0.55, 44);
mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bulbPts), 64, 0.008, 4), std(0x222222));
const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), bulbMat, bulbPts.length);
bulbPts.forEach((p, i) => { bulbs.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y - 0.07, p.z)); });
scene.add(bulbs);

// ---------- quầy hàng, cây, bóng bay ----------
function stall(x, z, c1, c2, goods) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const wood = std(0x8a5a36);
  mesh(new THREE.BoxGeometry(1.7, 0.08, 0.8), wood, 0, 0.85, 0, g);
  mesh(new THREE.BoxGeometry(1.6, 0.8, 0.7), std(0xa8744a), 0, 0.42, 0, g);
  for (const sx of [-0.8, 0.8]) for (const sz of [-0.38, 0.38]) mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 6), wood, sx, 1.05, sz, g);
  const top = mesh(new THREE.PlaneGeometry(1.9, 1.0), new THREE.MeshStandardMaterial({ map: awningTex(c1, c2), side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }), 0, 2.15, 0.1, g);
  top.rotation.x = -1.25;
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), std(0xffffff, { roughness: 0.5 }), 36);
  for (let i = 0; i < 36; i++) { const row = Math.floor(i / 12), col = i % 12; im.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-0.68 + col * 0.125, 0.96 + row * 0.08, -0.15 + row * 0.12 - (row === 2 ? 0.25 : 0))); im.setColorAt(i, new THREE.Color(pick(goods))); }
  g.add(im);
  return g;
}
stall(-3.3, -9.2, '#e63946', '#fff4e6', ['#ff4d4d', '#ffb703', '#8ac926', '#ff8c42', '#e63946']);
stall(3.6, -9.6, '#2a9d8f', '#fff4e6', ['#ff6b9d', '#ffd23f', '#ffffff', '#c86bff', '#ff8c42']);
function tree(x, z, s) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
  mesh(new THREE.CylinderGeometry(0.1, 0.15, 2.2, 8), std(0x6b4423), 0, 1.1, 0, g);
  const leaf = std(0x4caf50, { flatShading: true, roughness: 0.85 }), leaf2 = std(0x6cc24a, { flatShading: true, roughness: 0.85 });
  mesh(new THREE.IcosahedronGeometry(0.9, 1), leaf, 0, 2.6, 0, g); mesh(new THREE.IcosahedronGeometry(0.65, 1), leaf2, 0.55, 2.3, 0.2, g); mesh(new THREE.IcosahedronGeometry(0.6, 1), leaf2, -0.5, 2.4, -0.1, g);
}
tree(-5.2, -10.6, 1.25); tree(5.6, -11.0, 1.3); tree(-2.9, -6.0, 0.95);
const balloons = [];
function balloonBunch(x, y, z) {
  const cols = [0xff4d6d, 0xffd23f, 0x4dabf7, 0x69db7c, 0xb197fc];
  cols.forEach((c, i) => {
    const b = mesh(new THREE.SphereGeometry(0.17, 16, 12), std(c, { roughness: 0.3, metalness: 0.05 }), x + (i - 2) * 0.17, y + Math.sin(i * 2) * 0.15 + 0.35, z + (i % 2) * 0.1);
    b.scale.set(1, 1.18, 1);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(0, -0.2, 0), V3((2 - i) * 0.17, -0.2 - (y + 0.35 - 1.0), 0)]), new THREE.LineBasicMaterial({ color: 0x777777 }));
    b.add(line); balloons.push({ b, y0: b.position.y, ph: Math.random() * TAU });
  });
}
balloonBunch(-2.5, 2.2, -8.85);
// cột đèn (đầu dây phơi tranh)
const POLE_L = V3(-2.15, 0, -2.4), POLE_R = V3(2.95, 0, -2.4);
for (const p of [POLE_L, POLE_R]) {
  mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.8, 10), std(0x2f3a3a, { metalness: 0.5, roughness: 0.5 }), p.x, 1.9, p.z);
  const head = mesh(new THREE.BoxGeometry(0.28, 0.36, 0.28), new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffd27a, emissiveIntensity: 0.6 }), p.x, 3.95, p.z);
  lanternMats.push(head.material);
  mesh(new THREE.ConeGeometry(0.24, 0.16, 4), std(0x2f3a3a), p.x, 4.22, p.z).rotation.y = PI / 4;
}

// ---------- giá vẽ + toan ----------
const CW = 1.2, CH = 1.2, CD = 0.04;
const easel = new THREE.Group(); easel.position.set(0.86, 0, 0.95); easel.rotation.y = -0.42; scene.add(easel);
const woodMat = std(0xa06a3c, { roughness: 0.7 });
{
  const leg = (x, z, rx, rz, len) => { const m = mesh(new THREE.BoxGeometry(0.05, len, 0.05), woodMat, x, len / 2 * Math.cos(rx), z, easel); m.rotation.set(rx, 0, rz); return m; };
  leg(-0.42, 0.12, -0.08, -0.16, 2.35); leg(0.42, 0.12, -0.08, 0.16, 2.35);
  const back = mesh(new THREE.BoxGeometry(0.05, 2.2, 0.05), woodMat, 0, 1.0, -0.45, easel); back.rotation.x = 0.42;
  mesh(new THREE.BoxGeometry(0.06, 2.45, 0.05), woodMat, 0, 1.25, 0.04, easel);   // trụ giữa
  mesh(new THREE.BoxGeometry(CW + 0.18, 0.06, 0.16), woodMat, 0, 0.92, 0.07, easel);   // gờ đỡ toan
  mesh(new THREE.BoxGeometry(0.9, 0.04, 0.04), woodMat, 0, 0.5, 0.1, easel);
  mesh(new THREE.BoxGeometry(0.24, 0.07, 0.12), woodMat, 0, 0.95 + CH + 0.02, 0.1, easel);   // kẹp trên
}
const PAINT_PX = 768;
const paintTex = canvasTex(PAINT_PX, PAINT_PX);
const canvasMatFront = new THREE.MeshStandardMaterial({ map: paintTex, roughness: 0.9, emissive: 0xffffff, emissiveMap: paintTex, emissiveIntensity: 0.18 });
const canvasSide = std(0xf2ede2), canvasBack = std(0xd8c8a8);
const canvasMesh = mesh(new THREE.BoxGeometry(CW, CH, CD), [canvasSide, canvasSide, canvasSide, canvasSide, canvasMatFront, canvasBack], 0, 0.95 + CH / 2, 0.1, easel);
const frameGroup = new THREE.Group(); canvasMesh.add(frameGroup);
const FRAME_MATS = {
  1: std(0x8a5a36, { roughness: 0.6 }),
  2: std(0xe4e8ee, { metalness: 0.6, roughness: 0.3, emissive: 0x3a3f48, emissiveIntensity: 0.5 }),
  3: std(0xffc93d, { metalness: 0.65, roughness: 0.3, emissive: 0x8a5e00, emissiveIntensity: 0.55 }),
  4: std(0xffd75a, { metalness: 0.65, roughness: 0.25, emissive: 0xa06a00, emissiveIntensity: 0.75 }),
};
let frameTier = -1;
function setFrame(tier, k = 1) {
  frameGroup.scale.setScalar(Math.max(0.001, k));
  if (tier === frameTier) return;
  frameTier = tier;
  while (frameGroup.children.length) { const c = frameGroup.children[0]; frameGroup.remove(c); c.geometry.dispose(); }
  if (!tier) return;
  const t = tier >= 3 ? 0.11 : 0.07, m = FRAME_MATS[Math.min(4, tier)];
  for (const [x, y, w, h] of [[0, CH / 2 + t / 2, CW + t * 2, t], [0, -CH / 2 - t / 2, CW + t * 2, t], [-CW / 2 - t / 2, 0, t, CH], [CW / 2 + t / 2, 0, t, CH]]) mesh(new THREE.BoxGeometry(w, h, CD + 0.05), m, x, y, 0.01, frameGroup);
  if (tier >= 4) for (const [x, y] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) mesh(new THREE.OctahedronGeometry(0.07), m, x * (CW / 2 + t / 2), y * (CH / 2 + t / 2), 0.06, frameGroup);
}
// bảng tên dưới giá vẽ
const plateTex = canvasTex(512, 128);
const plate = mesh(new THREE.PlaneGeometry(0.7, 0.175), new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.9, emissive: 0xffffff, emissiveMap: plateTex, emissiveIntensity: 0.25 }), -0.2, 0.74, 0.17, easel);
plate.rotation.z = -0.04;
function drawPlate(name, sub) {
  const g = plateTex.userData.g, w = 512, h = 128;
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#fff6dc'; rr(g, 4, 4, w - 8, h - 8, 14); g.fill(); g.lineWidth = 6; g.strokeStyle = '#4a3220'; g.stroke();
  g.fillStyle = '#2a1a10'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 54; g.font = `700 ${fs}px ${HAND}`; while (g.measureText(name).width > w - 50 && fs > 22) { fs -= 2; g.font = `700 ${fs}px ${HAND}`; }
  g.fillText(name, w / 2, sub ? h / 2 - 12 : h / 2 + 2);
  if (sub) { g.font = `600 24px ${FONT}`; g.fillStyle = '#8a4a2a'; g.fillText(sub, w / 2, h / 2 + 34); }
  plateTex.needsUpdate = true;
}
// xô sơn, ghế mẫu
{
  const cols = [0xe63946, 0x2a9d8f, 0xffb703, 0x457b9d];
  cols.forEach((c, i) => { const x = 1.62 + (i % 2) * 0.28, z = 1.65 + Math.floor(i / 2) * 0.26; mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.22, 14), std(0xcfd4da, { metalness: 0.6, roughness: 0.35 }), x, 0.11, z); mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 14), std(c, { roughness: 0.3 }), x, 0.215, z); });
}
const STOOL_POS = V3(-0.88, 0, -0.75), SEAT_H = 0.56;
{
  const g = new THREE.Group(); g.position.copy(STOOL_POS); scene.add(g);
  mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.06, 20), std(0xc8283c, { roughness: 0.5 }), 0, SEAT_H - 0.03, 0, g);
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; const l = mesh(new THREE.CylinderGeometry(0.02, 0.025, SEAT_H, 6), woodMat, Math.cos(a) * 0.14, SEAT_H / 2 - 0.03, Math.sin(a) * 0.14, g); l.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); }
  mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 20), woodMat, 0, 0.2, 0, g).rotation.x = PI / 2;
}

// ---------- dây phơi tranh (phòng tranh trên đầu) ----------
const ROPE_A = V3(POLE_L.x, 3.62, POLE_L.z), ROPE_B = V3(POLE_R.x, 3.58, POLE_R.z);
const ropePts = catenary(ROPE_A, ROPE_B, 0.2, 40);
const ropeCurve = new THREE.CatmullRomCurve3(ropePts);
mesh(new THREE.TubeGeometry(ropeCurve, 80, 0.012, 5), std(0x8a6a4a));
const GALLERY_N = 5;
const gallery = [];   // { group, slot, from, t0, dur, fall }
// các ô treo nằm trong khung hình (dây dài hơn khung nhìn)
const slotPos = i => { const x = lerp(-1.22, 2.12, (i + 0.5) / GALLERY_N); return ropeCurve.getPoint(clamp((x - ROPE_A.x) / (ROPE_B.x - ROPE_A.x), 0, 1)); };

// ---------- disco ball + đèn quét (dance party) ----------
const discoBall = mesh(new THREE.IcosahedronGeometry(0.3, 2), new THREE.MeshStandardMaterial({ color: 0xe8e8f0, metalness: 1, roughness: 0.12, flatShading: true, envMapIntensity: 3 }), 0.25, 9, -0.9);
const discoString = mesh(new THREE.CylinderGeometry(0.008, 0.008, 6, 4), std(0x333333), 0, 3.2, 0, discoBall);
const beamTex = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const BEAM_COLORS = [0xff3dc8, 0x3ddcff, 0xffd83d, 0x8c5aff, 0x3dff96, 0xff7a3d];
const beams = BEAM_COLORS.map((c, i) => {
  const geo = new THREE.ConeGeometry(0.75, 7, 20, 1, true); geo.translate(0, -3.5, 0);
  const m = mesh(geo, new THREE.MeshBasicMaterial({ color: c, map: beamTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), (i - 2.5) * 1.1, 6.2, -1.5 + (i % 2) * 1.2);
  m.userData.ph = i * 1.3; return m;
});
const spotTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const floorSpots = BEAM_COLORS.map((c, i) => { const m = mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ color: c, map: spotTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.02, 0); m.rotation.x = -PI / 2; m.userData.ph = i * 1.7; return m; });

// ======================================================================
// KHUNG XƯƠNG ĐIỀU KHIỂN (giống Vũ Trường Neon) → lái nhân vật 3D
// ======================================================================
function N(parent, x = 0, y = 0, z = 0) { const o = new THREE.Object3D(); o.position.set(x, y, z); if (parent) parent.add(o); return o; }
const rig = {};
rig.root = N(null);
rig.hips = N(rig.root, 0, 0.88, 0); rig.hips.rotation.order = 'YXZ';
rig.spine = N(rig.hips, 0, 0.04, 0);
rig.chest = N(rig.spine, 0, 0.47, 0);
rig.neck = N(rig.chest, 0, 0.04, 0);
rig.head = N(rig.neck, 0, 0.1, 0);
rig.shL = N(rig.chest, -0.19, -0.03, 0); rig.elL = N(rig.shL, 0, -0.27, 0); rig.haL = N(rig.elL, 0, -0.245, 0);
rig.shR = N(rig.chest, 0.19, -0.03, 0); rig.elR = N(rig.shR, 0, -0.27, 0); rig.haR = N(rig.elR, 0, -0.245, 0);
rig.hipL = N(rig.hips, -0.095, -0.04, 0); rig.knL = N(rig.hipL, 0, -0.39, 0); rig.ftL = N(rig.knL, 0, -0.38, 0);
rig.hipR = N(rig.hips, 0.095, -0.04, 0); rig.knR = N(rig.hipR, 0, -0.39, 0); rig.ftR = N(rig.knR, 0, -0.38, 0);
const HEAD_Y = 0.13, HEAD_R = 0.14;
const NP = () => ({ yaw: 0, walk: -1, bob: 0, lean: 0, lu: -0.18, lf: -0.15, ru: 0.18, rf: 0.15, lt: -0.07, ls: 0.02, rt: 0.07, rs: -0.02, head: 0, spin: 1, rot: 0, lift: 0, dx: 0, sit: 0 });

function legPose(hip, knee, foot, a, s) {
  if (Math.abs(a) > 0.6) { hip.rotation.set(-(Math.abs(a) - 0.1), 0, Math.sign(a) * 0.2); knee.rotation.set(Math.abs(s) * 0.8, 0, 0); }
  else { hip.rotation.set(-Math.abs(s) * 0.55, 0, a * 0.9); knee.rotation.set(Math.abs(s) * 1.15, 0, 0); }
  foot.rotation.set(-hip.rotation.x - knee.rotation.x, 0, 0);
}
const _v1 = V3(), _v2 = V3(), _v3 = V3(), _q1 = new THREE.Quaternion();
function poseRig(c, p, base, grounded) {
  const b = c.body;
  rig.root.position.copy(base);
  rig.root.rotation.set(0, c.yaw + (p.yaw || 0), 0);
  rig.root.scale.setScalar(b.h);
  rig.hips.position.set((p.dx || 0) * 1.4, 0.88, 0);
  rig.hips.rotation.set(p.rot || 0, 0, 0);
  rig.spine.rotation.set((p.sit ? -0.05 : 0.04) + (p.bend || 0), 0, -p.lean);
  rig.neck.rotation.set(0, 0, -p.head * 0.4);
  rig.head.rotation.set(0.05 + (p.nod || 0), p.head * 0.3, -p.head * 0.5);
  rig.shL.position.x = -b.sw; rig.shR.position.x = b.sw;
  rig.shL.rotation.set(-0.18 * Math.abs(Math.sin(p.lu)), 0, p.lu);
  rig.elL.rotation.set(-0.35 * Math.min(1, Math.abs(p.lf)) - 0.1, 0, p.lf);
  rig.shR.rotation.set(-0.18 * Math.abs(Math.sin(p.ru)), 0, p.ru);
  rig.elR.rotation.set(-0.35 * Math.min(1, Math.abs(p.rf)) - 0.1, 0, p.rf);
  if (p.rsx !== undefined) rig.shR.rotation.x = p.rsx;
  if (p.rex !== undefined) rig.elR.rotation.x = p.rex;
  if (p.lsx !== undefined) rig.shL.rotation.x = p.lsx;
  if (p.lex !== undefined) rig.elL.rotation.x = p.lex;
  if (p.walk >= 0) {
    const ph = p.walk * TAU, sw = Math.sin(ph);
    rig.hipL.rotation.set(0.5 * sw, 0, -0.03); rig.knL.rotation.set(Math.max(0, -Math.sin(ph - 0.6)) * 0.9 + 0.05, 0, 0);
    rig.hipR.rotation.set(-0.5 * sw, 0, 0.03); rig.knR.rotation.set(Math.max(0, Math.sin(ph - 0.6)) * 0.9 + 0.05, 0, 0);
    rig.ftL.rotation.set(0, 0, 0); rig.ftR.rotation.set(0, 0, 0);
    if (p.lsx === undefined) rig.shL.rotation.x = -0.45 * sw; if (p.rsx === undefined) rig.shR.rotation.x = 0.45 * sw;
  } else if (p.sit) {
    rig.hipL.rotation.set(-1.5, 0, -0.1); rig.knL.rotation.set(1.45, 0, 0); rig.ftL.rotation.set(0, 0, 0);
    rig.hipR.rotation.set(-1.5, 0, 0.1); rig.knR.rotation.set(1.45, 0, 0); rig.ftR.rotation.set(0, 0, 0);
  } else {
    legPose(rig.hipL, rig.knL, rig.ftL, p.lt, p.ls);
    legPose(rig.hipR, rig.knR, rig.ftR, p.rt, p.rs);
  }
  rig.root.updateMatrixWorld(true);
  if (p.sit) {
    rig.hips.getWorldPosition(_v1);
    rig.root.position.y += SEAT_H + 0.06 - (_v1.y - base.y);
  } else if (grounded) {
    let minY = Infinity;
    for (const n of [rig.ftL, rig.ftR, rig.haL, rig.haR]) { n.getWorldPosition(_v1); minY = Math.min(minY, _v1.y - 0.06 * b.h); }
    rig.head.getWorldPosition(_v1); _v2.set(0, HEAD_Y + HEAD_R, 0).applyMatrix4(rig.head.matrixWorld); minY = Math.min(minY, _v2.y, _v1.y);
    rig.root.position.y += base.y - minY;
  }
  rig.root.position.y += (p.lift || 0) * 1.7 * b.h;
  rig.root.updateMatrixWorld(true);
  c._head.set(0, HEAD_Y + HEAD_R + 0.08, 0).applyMatrix4(rig.head.matrixWorld);
}
// tay vươn tới một điểm (IK hai đoạn) — dùng cho tay cầm cọ của họa sĩ
const DOWN = V3(0, -1, 0);
function setBoneDir(node, worldDir) {
  node.parent.getWorldQuaternion(_q1); _q1.invert();
  _v3.copy(worldDir).normalize().applyQuaternion(_q1);
  node.quaternion.setFromUnitVectors(DOWN, _v3);
  node.updateMatrixWorld(true);
}
function ikArm(left, target, pole) {
  const sh = left ? rig.shL : rig.shR, el = left ? rig.elL : rig.elR;
  const s = rig.root.scale.x, a = 0.27 * s, b = 0.245 * s;
  const S0 = sh.getWorldPosition(V3());
  const D = target.clone().sub(S0);
  const d = clamp(D.length(), Math.abs(a - b) + 0.01, (a + b) * 0.995);
  const dir = D.normalize();
  const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1), A = Math.acos(cosA);
  const pp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
  const E = S0.clone().addScaledVector(dir, a * Math.cos(A)).addScaledVector(pp, a * Math.sin(A));
  const Hd = S0.clone().addScaledVector(dir, d);
  setBoneDir(sh, E.clone().sub(S0));
  setBoneDir(el, Hd.sub(E));
}

// ======================================================================
// NHÂN VẬT
// ======================================================================
const shadowTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(40,20,0,0.45)'); gr.addColorStop(1, 'rgba(40,20,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
const shadowGeo = new THREE.PlaneGeometry(0.9, 0.9).rotateX(-PI / 2);
const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
let seq = 0;
function randomBody(female) { return { female, h: (female ? 0.95 : 1.0) * rand(0.94, 1.06), sw: female ? 0.185 : 0.215 }; }
function makeActor(user) {
  const a = {
    id: user.id, name: user.name || 'Khách', avatar: user.avatar || '',
    coins: 0, total: 0, order: seq++, joinT: now(), lastActive: now(),
    pos: V3(), yaw: 0, target: null, speed: 1.5, moving: false, walkPh: Math.random(),
    seed: Math.random() * 10, zi: seq, body: randomBody(Math.random() < 0.5), _head: V3(),
    av: null, avT: null, char: null, style: undefined, shadow: null, born: 0, gone: 0,
    waveUntil: 0, jumpT: 0, clapUntil: 0, comment: '', commentUntil: 0, dance: 0,
  };
  return a;
}
function pickChar(female, exclude) {
  if (!S.rosterEnabled || !ROSTER.length) return null;
  const used = new Set(exclude || []); for (const p of bodied()) if (p.char) used.add(p.char.id);
  let pool = ROSTER.filter(c => !used.has(c.id) && (female === undefined || c.female === female));
  if (!pool.length) pool = ROSTER.filter(c => !used.has(c.id));
  if (!pool.length) pool = ROSTER;
  return pick(pool);
}
function assignChar(a, ch) {
  a.char = ch || null;
  if (ch) { a.body = randomBody(ch.female); a.avOutfit = rosterOutfit(ch); a.avShape = shapeFor(ch.age, ch.female); a.avT = templateForChar(ch.id) || null; }
  else { a.avOutfit = null; a.avShape = null; a.avT = null; }
  const dn = Math.floor(Math.random() * DANCES.length); a.dance = DANCES[dn] && DANCES[dn].floor ? 0 : dn;
  if (a.av) { disposeAvatar(a.av); a.av = null; }
}
function giveBody(a, at) {
  if (a.bodied) return;
  a.bodied = true; a.born = now(); a.gone = 0;
  if (!a.charSet) { assignChar(a, pickChar(undefined, [painter.charId])); a.charSet = true; }
  a.pos.copy(at);
  a.shadow = mesh(shadowGeo, shadowMat, at.x, 0.012, at.z); a.shadow.renderOrder = 1;
}
function dropBody(a) {
  if (!a.bodied) return;
  a.bodied = false;
  if (a.av) { disposeAvatar(a.av); a.av = null; }
  if (a.shadow) { scene.remove(a.shadow); a.shadow = null; }
}

// ---------- họa sĩ ----------
const painter = makeActor({ id: '__painter', name: 'Họa sĩ Neon' });
painter.body = { female: false, h: 1.0, sw: 0.215 };
painter.bodied = true; painter.isPainter = true; painter.charSet = true;
const PAINTER_HOME = V3(0.0, 0, 1.12), PAINTER_YAW = 1.0;
painter.pos.copy(PAINTER_HOME); painter.yaw = PAINTER_YAW;
painter.shadow = mesh(shadowGeo, shadowMat, PAINTER_HOME.x, 0.012, PAINTER_HOME.z);
painter.charId = '';
function setPainterChar(id) {
  id = String(id || '').toLowerCase();
  if (painter.charId === id && painter.charReady) return;
  painter.charId = id; painter.charReady = true;
  const ch = ROSTER.find(r => r.id.toLowerCase() === id) || null;
  painter.char = ch;
  painter.avOutfit = ch ? Object.assign(rosterOutfit(ch), { hat: 'fedora' }) : null;   // đội mũ nồi họa sĩ thay cho mũ của bộ đồ
  painter.avShape = ch ? shapeFor(ch.age, false) : 'normal';
  painter.avT = id ? templateForChar(id) || null : null;
  painter.body = { female: ch ? ch.female : false, h: 1.0, sw: ch && ch.female ? 0.185 : 0.215 };
  if (painter.av) { disposeAvatar(painter.av); painter.av = null; }
}
// mũ nồi, khăn quàng: gắn vào xương nên đi theo người khi vẽ / nhảy
function headMeasure(av) {
  const H0 = { hx: 0, hz: 0, r: 0.1, hatR: 0.122, crown: 0.285 };
  const hm = av.t.headM; if (!hm) return H0;
  const k = av.t.norm || 1;
  return { hx: (hm.hatX || 0) * k, hz: (hm.hatZ || 0) * k, r: hm.r * k * 1.02, hatR: hm.hatR ? hm.hatR * k + 0.006 : Math.max(hm.r * k * 1.18, 0.1), crown: hm.crown * k + 0.012 };
}
function dressPainter(av) {
  // tóc tối màu, giấu mũ sẵn có của mô hình (đội mũ nồi họa sĩ)
  av.root.traverse(o => { if (!o.isMesh || !o.material) return; const n = ((o.userData.baseMat || o.material).name || '') + ' ' + o.name; if (/Hair/i.test(n) && o.material.color) { o.material.color.set(0x2a1a10); o.visible = true; } if (/Headwear/i.test(n)) o.visible = false; });
  const H = headMeasure(av);
  const beretMat = std(0xa3173a, { roughness: 0.75 });
  const beret = new THREE.Group();
  const R = H.hatR * 1.16;
  const top = mesh(new THREE.SphereGeometry(R, 26, 12).scale(1, 0.32, 1), beretMat, H.hx - 0.015, H.crown - 0.022, H.hz - 0.008, beret); top.rotation.z = 0.24;
  mesh(new THREE.TorusGeometry(H.hatR * 0.97, 0.014, 8, 28).rotateX(PI / 2), beretMat, H.hx, H.crown - 0.06, H.hz - 0.004, beret);
  mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.035, 6), beretMat, H.hx - 0.03, H.crown + 0.02, H.hz - 0.01, beret).rotation.z = 0.3;
  attachProp(av, 'Head', beret);
  const scarfMat = std(0x18a6a0, { roughness: 0.8 });
  const scarf = new THREE.Group();
  mesh(new THREE.TorusGeometry(0.083, 0.024, 8, 26).rotateX(PI / 2).scale(1, 1, 0.92), scarfMat, 0, 0.18, 0.012, scarf);
  mesh(new THREE.SphereGeometry(0.03, 10, 8), scarfMat, 0.035, 0.16, 0.088, scarf);
  const t1 = mesh(new THREE.BoxGeometry(0.05, 0.16, 0.014), scarfMat, 0.045, 0.075, 0.1, scarf); t1.rotation.z = 0.25;
  const t2 = mesh(new THREE.BoxGeometry(0.045, 0.13, 0.014), scarfMat, 0.07, 0.09, 0.094, scarf); t2.rotation.z = -0.15;
  attachProp(av, 'Spine2', scarf);
}
// cọ vẽ + bảng màu (đặt theo xương bàn tay mô hình mỗi khung hình)
const brush = new THREE.Group(); scene.add(brush);
mesh(new THREE.CylinderGeometry(0.011, 0.016, 0.3, 10), std(0x9a3b1e, { roughness: 0.4 }), 0, 0.03, 0, brush);
mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 10), std(0xd8dce2, { metalness: 0.9, roughness: 0.25 }), 0, 0.205, 0, brush);
const bristleMat = std(0x222222, { roughness: 0.6 });
mesh(new THREE.ConeGeometry(0.016, 0.07, 10), bristleMat, 0, 0.265, 0, brush);
const palette = new THREE.Group(); scene.add(palette);
{
  const sh = new THREE.Shape(); sh.absellipse(0, 0, 0.16, 0.11, 0, TAU, false, 0);
  const hole = new THREE.Path(); hole.absellipse(-0.1, -0.02, 0.022, 0.02, 0, TAU, true, 0); sh.holes.push(hole);
  const notch = new THREE.Path(); notch.absellipse(-0.17, 0.03, 0.035, 0.03, 0, TAU, true, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: false, curveSegments: 20 }); geo.rotateX(-PI / 2);
  mesh(geo, std(0xc9935a, { roughness: 0.6 }), 0, 0, 0, palette);
  const blobs = [0xe63946, 0xffb703, 0x2a9d8f, 0x457b9d, 0xffffff, 0x9d4edd, 0x8ac926];
  blobs.forEach((c, i) => { const a = -0.6 + i * 0.42; mesh(new THREE.SphereGeometry(0.019, 10, 6).scale(1, 0.4, 1), std(c, { roughness: 0.25 }), Math.cos(a) * 0.105 + 0.02, 0.012, -Math.sin(a) * 0.07, palette); });
}

// ---------- người xem: hàng chờ ----------
const people = new Map();      // id -> actor
const queue = [];              // đang chờ (đã xếp theo ưu tiên)
let sitter = null;             // người đang được vẽ
const walkers = [];            // người đi về sau khi được vẽ / rời hàng
const VIS = 9;                 // số người trong hàng hiện thành nhân vật 3D
const queueSlot = i => V3(-0.95 - i * 0.1 + (i % 2 ? 0.26 : -0.04), 0, -2.7 - i * 0.74);
function bodied() { const out = []; for (const p of queue) if (p.bodied) out.push(p); if (sitter && sitter.bodied) out.push(sitter); for (const w of walkers) if (w.bodied) out.push(w); return out; }
function ensurePerson(user) {
  let p = people.get(user.id);
  if (!p) { p = makeActor(user); people.set(user.id, p); if (people.size > 3000) { for (const [k, v] of people) { if (!queue.includes(v) && v !== sitter && !walkers.includes(v)) { people.delete(k); break; } } } }
  if (user.name) p.name = user.name;
  if (user.avatar) p.avatar = user.avatar;
  if (user.lv) p.lv = user.lv;
  p.lastActive = now();
  return p;
}
// ưu tiên: trúng thưởng may mắn > tổng quà > điểm chen hàng (chia sẻ / follow) > ai đến trước
const prio = p => (p.lucky ? 1e13 : 0) + p.coins * 1e6 + Math.min(999, p.bonus || 0) * 1e3;
function sortQueue() { queue.sort((a, b) => (prio(b) - prio(a)) || (a.order - b.order)); }
// vẽ biếm họa miễn phí: mỗi người cách nhau vài phút (tặng quà thì không phải chờ)
function canFree(p) { const cd = Math.max(0, Number(S.freeCooldown ?? 5)) * 60; return !p.paintedAt || now() - p.paintedAt > cd; }
function enqueue(p, free) {
  if (p === sitter || queue.includes(p)) return false;
  if (free && !p.coins && !p.lucky && !canFree(p)) return false;
  const wi = walkers.indexOf(p); if (wi >= 0) { walkers.splice(wi, 1); }
  p.order = seq++; p.joinT = now();
  queue.push(p);
  const max = clamp(Number(S.painterQueueMax) || 300, 20, 2000);
  if (queue.length > max) { let i = -1; for (let k = queue.length - 1; k >= 0; k--) if (!queue[k].coins && !queue[k].lucky && queue[k] !== p) { i = k; break; } if (i >= 0) { const [x] = queue.splice(i, 1); leaveQueue(x); } }
  sortQueue();
  return true;
}
function leaveQueue(p) {
  const i = queue.indexOf(p); if (i >= 0) queue.splice(i, 1);
  if (p.bodied) { p.target = V3(-3.6, 0, p.pos.z - 0.5); p.leaveAt = now(); walkers.push(p); }
}
let avgJob = 16;   // thời gian trung bình một bức (giây) để ước lượng thời gian chờ
function waitText(pos) { const s = Math.max(0, pos - 1) * avgJob + (job ? avgJob * 0.5 : 0); return s < 50 ? `~${Math.max(10, Math.round(s / 10) * 10)} giây` : `~${Math.round(s / 60)} phút`; }

// ======================================================================
// VẼ CHÂN DUNG — quà càng lớn vẽ càng giống ảnh đại diện; bình luận / thả tim → tranh biếm họa
// ======================================================================
const AN = 256;
const work = document.createElement('canvas'); work.width = work.height = AN;
const wg = work.getContext('2d', { willReadFrequently: true });
function squareFrom(src) {
  wg.clearRect(0, 0, AN, AN);
  wg.fillStyle = '#f2ede2'; wg.fillRect(0, 0, AN, AN);
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  const s = Math.min(sw, sh);
  wg.drawImage(src, (sw - s) / 2, (sh - s) / 2, s, s, 0, 0, AN, AN);
  return wg.getImageData(0, 0, AN, AN).data;
}
// tranh mẫu khi người xem không có ảnh đại diện và chưa chụp được nhân vật
function placeholderSource() {
  wg.fillStyle = `hsl(${rand(0, 360)},55%,78%)`; wg.fillRect(0, 0, AN, AN);
  wg.fillStyle = '#e7b48f'; wg.beginPath(); wg.ellipse(128, 112, 56, 68, 0, 0, TAU); wg.fill();
  wg.fillStyle = '#2a1a12'; wg.beginPath(); wg.ellipse(128, 70, 64, 40, 0, PI, TAU); wg.fill();
  wg.fillStyle = `hsl(${rand(0, 360)},60%,45%)`; wg.beginPath(); wg.ellipse(128, 250, 110, 80, 0, PI, TAU); wg.fill();
  wg.fillStyle = '#2a1a12'; wg.beginPath(); wg.arc(106, 112, 6, 0, TAU); wg.arc(150, 112, 6, 0, TAU); wg.fill();
  wg.strokeStyle = '#a0522d'; wg.lineWidth = 4; wg.beginPath(); wg.arc(128, 134, 18, 0.2, PI - 0.2); wg.stroke();
  return wg.getImageData(0, 0, AN, AN).data;
}
// biếm họa: bóp méo ảnh — đầu to, mặt dài như quả trứng, mặt bè, mặt phồng
const WARPS = ['bulge', 'bighead', 'egg', 'wide'];
function warpCaricature(data, kind) {
  const out = new Uint8ClampedArray(data.length);
  const cx = 128, cy = kind === 'bighead' ? 100 : 118;
  const g = kind === 'bulge' ? 1.38 : kind === 'bighead' ? 1.5 : 1.18;
  for (let y = 0; y < AN; y++) for (let x = 0; x < AN; x++) {
    let dx = (x - cx) / 128, dy = (y - cy) / 128;
    if (kind === 'egg') { dy *= dy < 0 ? 0.74 : 0.92; dx *= 1.08; }
    else if (kind === 'wide') { dx *= 0.74; dy *= 1.04; }
    const r = Math.hypot(dx, dy);
    if (r < 1) { const s = Math.pow(r, g) / Math.max(r, 1e-4); dx *= s; dy *= s; }
    let sx = clamp(cx + dx * 128, 0, AN - 1.001), sy = clamp(cy + dy * 128, 0, AN - 1.001);
    const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0, o = (y * AN + x) * 4;
    const i00 = (y0 * AN + x0) * 4, i10 = i00 + 4, i01 = i00 + AN * 4, i11 = i01 + 4;
    for (let c = 0; c < 4; c++) out[o + c] = (data[i00 + c] * (1 - fx) + data[i10 + c] * fx) * (1 - fy) + (data[i01 + c] * (1 - fx) + data[i11 + c] * fx) * fy;
  }
  return out;
}
function analyse(data) {
  const n = AN * AN, L = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) / 255;
  const blur = src => { const o = new Float32Array(n); for (let y = 0; y < AN; y++) for (let x = 0; x < AN; x++) { let s = 0, c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < AN && yy < AN) { s += src[yy * AN + xx]; c++; } } o[y * AN + x] = s / c; } return o; };
  const B = blur(blur(L));
  const gx = new Float32Array(n), gy = new Float32Array(n), mag = new Float32Array(n);
  for (let y = 1; y < AN - 1; y++) for (let x = 1; x < AN - 1; x++) {
    const i = y * AN + x, a = B[i - AN - 1], b = B[i - AN], c = B[i - AN + 1], d = B[i - 1], f = B[i + 1], g = B[i + AN - 1], h = B[i + AN], k = B[i + AN + 1];
    gx[i] = (c + 2 * f + k) - (a + 2 * d + g); gy[i] = (g + 2 * h + k) - (a + 2 * b + c);
    mag[i] = Math.hypot(gx[i], gy[i]);
  }
  const sorted = Array.from(mag).filter((v, i) => i % 7 === 0).sort((a, b) => a - b);
  const q = f => sorted[Math.floor(sorted.length * f)] || 0.001;
  // giãn độ sáng (ảnh tối / nhạt vẫn ra nét chì rõ)
  const ls = Array.from(B).filter((v, i) => i % 5 === 0).sort((a, b) => a - b);
  const lo = ls[Math.floor(ls.length * 0.04)], hi = ls[Math.floor(ls.length * 0.96)], span = Math.max(0.08, hi - lo);
  const Ln = new Float32Array(n); for (let i = 0; i < n; i++) Ln[i] = clamp((B[i] - lo) / span, 0, 1);
  return { data, L: Ln, gx, gy, mag, p70: q(0.7), p80: q(0.8), p85: q(0.85), p95: Math.max(q(0.95), 0.02) };
}
function rawColor(A, x, y) {
  x = clamp(Math.round(x), 1, AN - 2); y = clamp(Math.round(y), 1, AN - 2);
  let r = 0, g = 0, b = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const i = ((y + dy) * AN + x + dx) * 4; r += A.data[i]; g += A.data[i + 1]; b += A.data[i + 2]; }
  return [r / 9, g / 9, b / 9];
}
const satur = ([r, g, b], s, warm = 0) => { const m = (r + g + b) / 3; return [m + (r - m) * s + warm * 1.5, m + (g - m) * s + warm * 0.5, m + (b - m) * s - warm]; };
const contrast = (c, k) => c.map(v => clamp((v - 128) * k + 128, 0, 255));
const poster = (c, lv) => c.map(v => Math.round(v / 255 * (lv - 1)) / (lv - 1) * 255);
// kiểu tranh (người tặng quà gõ tên kiểu để chọn)
const ART = {
  sondau: { name: 'Sơn dầu', paper: 'canvas' },
  mauNuoc: { name: 'Màu nước', paper: 'water' },
  popart: { name: 'Pop Art', paper: 'pop' },
  neon: { name: 'Neon', paper: 'dark' },
};
const ART_KEYS = [['son dau', 'sondau'], ['mau nuoc', 'mauNuoc'], ['watercolor', 'mauNuoc'], ['pop art', 'popart'], ['popart', 'popart'], ['neon', 'neon']];
const POP_PAL = [['#15151a', '#e63946', '#4cc9f0', '#ffd60a', '#ffffff'], ['#1b1033', '#ff2e88', '#36e2c5', '#ffe14d', '#fff6e8'], ['#101820', '#3a86ff', '#ff6b00', '#f7f052', '#ffffff']];
const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function styleColor(A, x, y, style, plan, pal) {
  const c = rawColor(A, x, y), l = A.L[(clamp(Math.round(y), 0, AN - 1)) * AN + clamp(Math.round(x), 0, AN - 1)];
  if (style === 'popart') { const i = l < 0.2 ? 0 : l < 0.42 ? 1 : l < 0.64 ? 2 : l < 0.86 ? 3 : 4; return hexRgb(pal[i]); }
  if (style === 'neon') { if (l < 0.13) return null; const col = new THREE.Color().setHSL((0.8 - l * 0.32 + 1) % 1, 1, 0.28 + l * 0.42); return [col.r * 255, col.g * 255, col.b * 255]; }
  if (style === 'cartoon') return poster(contrast(satur(c, 1.4), 1.08).map(v => clamp(v + 14, 0, 255)), 5);
  let out = contrast(satur(c, 1.22, 4), 1.07);
  if (plan && plan.post) out = poster(out, plan.post);
  if (style === 'mauNuoc') out = out.map(v => v + (255 - v) * 0.18);
  return out.map(v => clamp(v, 0, 255) | 0);
}
// mức giống ảnh theo quà: càng nhiều lớp nét càng nhỏ, phủ kín toan, cuối cùng láng màu theo ảnh thật
const LAYER = {   // [bước lưới, bề ngang nét, độ dài nét, độ đậm, thời gian]
  coarse: [16, 46, 62, 0.95, 3.2], medium: [9, 26, 34, 0.9, 1.4], fine: [5, 13, 17, 0.88, 0.62],
  detail: [3.5, 6, 9, 0.85, 0.45], ultra: [2.4, 3.6, 5.5, 0.82, 0.3],
};
const TIER_PLAN = [
  null,
  { layers: ['coarse', 'medium', 'fine'], vig: 0.72, post: 0, accent: false, glaze: 0, sketch: 0.5 },                    // 1 xu: vẽ nhanh, na ná
  { layers: ['coarse', 'medium', 'fine', 'detail'], vig: 0.84, post: 0, accent: true, glaze: 0, sketch: 0.85 },        // 30 xu: sơn dầu rõ nét
  { layers: ['coarse', 'medium', 'fine', 'detail'], vig: 9, post: 0, accent: true, glaze: 0.34, sketch: 1 },           // 99 xu: chân dung kín toan
  { layers: ['coarse', 'medium', 'fine', 'detail', 'ultra'], vig: 9, post: 0, accent: true, glaze: 0.66, sketch: 1 },  // 299 xu: giống y ảnh
];
const PHASE_DUR = [[0.26, 0.3], [0.24, 0.42], [0.3, 0.56], [0.32, 0.7], [0.34, 0.88]];   // × thời gian vẽ: phác thảo, tô màu
const serp = (list, band) => list.map(s => { const row = Math.floor((s.y + rand(-band * 0.3, band * 0.3)) / band); return [row * 10000 + (row % 2 ? AN - s.x : s.x) + rand(-12, 12), s]; }).sort((a, b) => a[0] - b[0]).map(x => x[1]);
function keeper(vig) { return (x, y, extra) => { if (vig > 2) return true; const r = Math.hypot(x - AN / 2, (y - AN / 2) * 0.92) / (AN / 2); return r < vig + extra + (Math.random() - 0.5) * 0.16; }; }
function contourStrokes(A, thr, max, keep, fn, cell = 3) {
  const nc = Math.ceil(AN / cell), occ = new Uint8Array(nc * nc), out = [];
  for (let tries = 0; tries < max * 16 && out.length < max; tries++) {
    const x = 2 + Math.random() * (AN - 4), y = 2 + Math.random() * (AN - 4), i = (y | 0) * AN + (x | 0);
    const m = A.mag[i]; if (m < thr) continue;
    const oc = ((y / cell) | 0) * nc + ((x / cell) | 0); if (occ[oc]) continue; occ[oc] = 1;
    if (!keep(x, y, 0.08)) continue;
    let tx = -A.gy[i], ty = A.gx[i]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    out.push(fn(x, y, tx, ty, m));
  }
  return out;
}
function buildSketch(A, tier, style) {
  const K = PAINT_PX / AN, plan = TIER_PLAN[tier], keep = keeper(plan.vig + 0.05);
  const col = style === 'neon' ? '225,235,255' : '38,34,44', hcol = style === 'neon' ? '200,210,255' : '50,46,58';
  const contours = contourStrokes(A, A.p70, Math.round(1900 * plan.sketch), keep, (x, y, tx, ty, m) => { const len = rand(5, 12); return { k: 's', x, y, x1: (x - tx * len / 2) * K, y1: (y - ty * len / 2) * K, x2: (x + tx * len / 2) * K, y2: (y + ty * len / 2) * K, bend: rand(-1.6, 1.6), w: style === 'popart' ? rand(2, 3.4) : rand(1.3, 2.6), a: 0.25 + 0.6 * Math.min(1, m / A.p95), c: col }; });
  const hatch = [];
  if (style !== 'popart') {
    const dens = plan.sketch;
    for (let y = 5; y < AN - 5; y += 9) for (let x = 5; x < AN - 5; x += 9) {
      const xx = x + rand(-3, 3), yy = y + rand(-3, 3), l = A.L[(yy | 0) * AN + (xx | 0)], ll = style === 'neon' ? 1 - l : l;
      if (ll > 0.72 || !keep(xx, yy, 0) || Math.random() > dens) continue;
      const ang = -0.75 + rand(-0.2, 0.2), len = rand(12, 20);
      hatch.push({ k: 's', x: xx, y: yy, x1: (xx - Math.cos(ang) * len / 2) * K, y1: (yy - Math.sin(ang) * len / 2) * K, x2: (xx + Math.cos(ang) * len / 2) * K, y2: (yy + Math.sin(ang) * len / 2) * K, bend: 0, w: 15, a: 0.03 + (0.72 - ll) * 0.16, c: hcol });
    }
    for (let y = 3; y < AN - 3; y += 3.2) for (let x = 3; x < AN - 3; x += 3.2) {
      const xx = x + rand(-1.5, 1.5), yy = y + rand(-1.5, 1.5), l = A.L[(yy | 0) * AN + (xx | 0)], ll = style === 'neon' ? 1 - l : l;
      if (ll > 0.6 || !keep(xx, yy, 0)) continue;
      if (Math.random() > (0.35 + (0.6 - ll)) * dens) continue;
      const ang = -0.8 + (ll < 0.3 && Math.random() < 0.5 ? 1.55 : 0) + rand(-0.12, 0.12), len = rand(6, 13);
      hatch.push({ k: 's', x: xx, y: yy, x1: (xx - Math.cos(ang) * len / 2) * K, y1: (yy - Math.sin(ang) * len / 2) * K, x2: (xx + Math.cos(ang) * len / 2) * K, y2: (yy + Math.sin(ang) * len / 2) * K, bend: rand(-0.6, 0.6), w: rand(0.9, 1.5), a: 0.08 + (0.6 - ll) * 0.5, c: hcol });
    }
  }
  return { list: [...serp(contours, 48), ...serp(hatch, 64)], contours };
}
// các lớp màu của một mức quà (bỏ qua những lớp đã vẽ ở mức thấp hơn khi người xem tặng thêm)
function buildColor(A, tier, style, pal, done, contours) {
  const K = PAINT_PX / AN, plan = TIER_PLAN[tier], keep = keeper(plan.vig);
  const out = [];
  plan.layers.forEach((name, li) => {
    if (done && done.layers.includes(name)) return;
    const [step, w, len, a, cost] = LAYER[name], list = [];
    for (let y = step / 2; y < AN; y += step) for (let x = step / 2; x < AN; x += step) {
      const xx = clamp(x + rand(-step, step) * 0.45, 0, AN - 1), yy = clamp(y + rand(-step, step) * 0.45, 0, AN - 1), i = (yy | 0) * AN + (xx | 0);
      if ((name === 'detail' && A.mag[i] < A.p80) || (name === 'ultra' && A.mag[i] < A.p70)) continue;
      if (!keep(xx, yy, 0.06 - li * 0.03)) continue;
      const ang = A.mag[i] > A.p80 * 0.5 ? Math.atan2(A.gx[i], -A.gy[i]) : Math.sin(xx * 0.03) * 1.2 + Math.cos(yy * 0.025) * 1.1;
      const c = styleColor(A, xx, yy, style, plan, pal); if (!c) continue;
      const v = style === 'popart' ? 0 : rand(-9, 9), L = len * rand(0.75, 1.15), ww = w * rand(0.8, 1.15);
      const s = { k: 'c', x: xx, y: yy, x1: xx * K - Math.cos(ang) * L / 2, y1: yy * K - Math.sin(ang) * L / 2, x2: xx * K + Math.cos(ang) * L / 2, y2: yy * K + Math.sin(ang) * L / 2, w: ww, a, r: clamp(c[0] + v, 0, 255) | 0, g: clamp(c[1] + v, 0, 255) | 0, b: clamp(c[2] + v, 0, 255) | 0, cost };
      if (style === 'mauNuoc') { s.k = 'w'; s.w = ww * 1.3; s.a = name === 'coarse' ? 0.22 : name === 'medium' ? 0.26 : 0.34; }
      else if (style === 'popart') { s.k = 'f'; s.a = 1; }
      else if (style === 'neon') { s.k = 'n'; s.a = 0.8; }
      list.push(s);
    }
    out.push(...serp(list, step * 5));
  });
  if (plan.accent && !(done && done.accent)) {
    const acc = contours.filter((s, i) => i % 2 === 0 && A.mag[(s.y | 0) * AN + (s.x | 0)] > A.p95 * 0.7).map(s => {
      if (style === 'popart') return { k: 'k', x: s.x, y: s.y, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, bend: s.bend, w: 3.6, a: 0.95, c: '12,10,16', cost: 0.5 };
      if (style === 'neon') return { k: 'n', x: s.x, y: s.y, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, w: 2, a: 0.9, r: 140, g: 245, b: 255, cost: 0.5 };
      const c = rawColor(A, s.x, s.y); return { k: 'c', x: s.x, y: s.y, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, w: 2.4, a: 0.55, r: c[0] * 0.45 | 0, g: c[1] * 0.42 | 0, b: c[2] * 0.48 | 0, cost: 0.5 };
    });
    out.push(...serp(acc, 48));
  }
  return out;
}
function appendColor(st, list) { let cum = st.colorCost; for (const s of list) { cum += s.cost; s.cum = cum; } st.color.push(...list); st.colorCost = cum; }
function buildPortrait(A, tier, style) {
  const pal = pick(POP_PAL);
  const sk = buildSketch(A, tier, style);
  const st = { sketch: sk.list, contours: sk.contours, color: [], colorCost: 0, pal, glaze: style === 'sondau' || style === 'mauNuoc' ? TIER_PLAN[tier].glaze : 0 };
  appendColor(st, buildColor(A, tier, style, pal, null, sk.contours));
  return st;
}
// tranh biếm họa: nét bút lông đen to, màu phẳng như truyện tranh, thêm hình vẽ nghịch
function buildCaricature(A) {
  const K = PAINT_PX / AN, keep = keeper(0.88);
  const outline = contourStrokes(A, A.p80, 700, keep, (x, y, tx, ty, m) => { const len = rand(5, 10); return { k: 'k', x, y, x1: (x - tx * len / 2) * K, y1: (y - ty * len / 2) * K, x2: (x + tx * len / 2) * K, y2: (y + ty * len / 2) * K, bend: rand(-2, 2), w: rand(2.6, 4), a: 0.85, c: '20,16,24' }; }, 4);
  const color = [];
  [[12, 40, 48, 0.85, 2.2], [6.5, 20, 26, 0.85, 1.0], [3.6, 9, 12, 0.85, 0.5]].forEach(([step, w, len, a, cost], li) => {
    const list = [];
    for (let y = step / 2; y < AN; y += step) for (let x = step / 2; x < AN; x += step) {
      const xx = clamp(x + rand(-step, step) * 0.4, 0, AN - 1), yy = clamp(y + rand(-step, step) * 0.4, 0, AN - 1);
      if (li === 2 && A.mag[(yy | 0) * AN + (xx | 0)] < A.p70) continue;   // lớp nét nhỏ chỉ ở mắt, miệng, viền mặt
      if (!keep(xx, yy, 0.02)) continue;
      const c = styleColor(A, xx, yy, 'cartoon'), ang = rand(-0.5, 0.5) - 0.6, L = len * rand(0.8, 1.1);
      list.push({ k: 'f', x: xx, y: yy, x1: xx * K - Math.cos(ang) * L / 2, y1: yy * K - Math.sin(ang) * L / 2, x2: xx * K + Math.cos(ang) * L / 2, y2: yy * K + Math.sin(ang) * L / 2, w: w * rand(0.85, 1.1), a: 0.95, r: c[0] | 0, g: c[1] | 0, b: c[2] | 0, cost });
    }
    color.push(...serp(list, step * 5));
  });
  // tô xong thì đi lại nét viền đen cho rõ kiểu truyện tranh
  const sketch = serp(outline, 48);
  for (const s of sketch) if (Math.random() < 0.55) color.push(Object.assign({}, s, { cost: 0.12 }));
  const st = { sketch, contours: outline, color: [], colorCost: 0, glaze: 0, doodles: pickDoodles() };
  appendColor(st, color);
  return st;
}
const P = paintTex.userData.g;
function paperBg(kind, pal) {
  const w = PAINT_PX, h = PAINT_PX;
  P.globalAlpha = 1; P.globalCompositeOperation = 'source-over'; P.setTransform(1, 0, 0, 1, 0, 0);
  const base = { sketch: '#f1e6cf', canvas: '#f8f5ee', water: '#fbfaf6', pop: '#fff6e0', dark: '#0e0b22', notebook: '#fdfdf8' }[kind] || '#f8f5ee';
  P.fillStyle = base; P.fillRect(0, 0, w, h);
  if (kind === 'canvas') { P.globalAlpha = 0.05; P.strokeStyle = '#7a6a50'; P.lineWidth = 1; for (let i = 0; i < w; i += 4) { P.beginPath(); P.moveTo(i, 0); P.lineTo(i, h); P.stroke(); P.beginPath(); P.moveTo(0, i); P.lineTo(w, i); P.stroke(); } }
  if (kind === 'notebook') {   // giấy vở ô li cho tranh biếm họa
    P.globalAlpha = 0.5; P.strokeStyle = '#9cc3e8'; P.lineWidth = 2; for (let y = 60; y < h; y += 44) { P.beginPath(); P.moveTo(0, y); P.lineTo(w, y); P.stroke(); }
    P.strokeStyle = '#ef8a8a'; P.beginPath(); P.moveTo(80, 0); P.lineTo(80, h); P.stroke();
  }
  if (kind === 'pop') {   // chấm bi kiểu truyện tranh
    P.globalAlpha = 1; P.fillStyle = (pal && pal[3]) || '#ffd60a'; P.fillRect(0, 0, w, h);
    P.fillStyle = 'rgba(255,255,255,0.55)'; for (let y = 0; y < h; y += 22) for (let x = (y / 22) % 2 ? 11 : 0; x < w; x += 22) { P.beginPath(); P.arc(x, y, 6, 0, TAU); P.fill(); }
  }
  if (kind === 'dark') { const g = P.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.7); g.addColorStop(0, '#1d1450'); g.addColorStop(1, '#07061a'); P.fillStyle = g; P.fillRect(0, 0, w, h); }
  P.globalAlpha = 1; grain(P, w, h, 3500, kind === 'dark' ? 0.04 : 0.05, kind === 'dark');
  if (kind !== 'dark' && kind !== 'pop') { const vg = P.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(90,60,20,0.12)'); P.fillStyle = vg; P.fillRect(0, 0, w, h); }
  paintTex.needsUpdate = true;
}
function drawStroke(s) {
  if (s.k === 's' || s.k === 'k') {
    P.strokeStyle = `rgba(${s.c},${s.a})`; P.lineWidth = s.w; P.lineCap = 'round';
    P.beginPath(); P.moveTo(s.x1, s.y1);
    const mx = (s.x1 + s.x2) / 2 - (s.y2 - s.y1) * 0.08 * s.bend, my = (s.y1 + s.y2) / 2 + (s.x2 - s.x1) * 0.08 * s.bend;
    P.quadraticCurveTo(mx, my, s.x2, s.y2); P.stroke();
    return;
  }
  P.lineCap = 'round';
  if (s.k === 'w' || s.k === 'm') P.globalCompositeOperation = 'multiply';   // màu nước / bút dạ: chồng lên nét chì vẫn thấy nét
  if (s.k === 'n') { P.strokeStyle = `rgba(${s.r},${s.g},${s.b},0.18)`; P.lineWidth = s.w * 2.2; P.beginPath(); P.moveTo(s.x1, s.y1); P.lineTo(s.x2, s.y2); P.stroke(); }
  P.strokeStyle = `rgba(${s.r},${s.g},${s.b},${s.a})`; P.lineWidth = s.w;
  P.beginPath(); P.moveTo(s.x1, s.y1); P.lineTo(s.x2, s.y2); P.stroke();
  if (s.k === 'c' && s.w >= 12) {   // vệt lông cọ sơn dầu
    const nx = -(s.y2 - s.y1), ny = s.x2 - s.x1, nl = Math.hypot(nx, ny) || 1, o = s.w * 0.28;
    for (const [sd, k] of [[1, 1.18], [-1, 0.82]]) {
      P.strokeStyle = `rgba(${clamp(s.r * k, 0, 255) | 0},${clamp(s.g * k, 0, 255) | 0},${clamp(s.b * k, 0, 255) | 0},0.35)`; P.lineWidth = s.w * 0.22;
      P.beginPath(); P.moveTo(s.x1 + nx / nl * o * sd, s.y1 + ny / nl * o * sd); P.lineTo(s.x2 + nx / nl * o * sd, s.y2 + ny / nl * o * sd); P.stroke();
    }
  }
  P.globalCompositeOperation = 'source-over';
}
// láng màu theo ảnh thật (chỉ quà lớn): phủ dần ảnh gốc lên tranh cho ra giống y ảnh
function glazeStep(j, k) {
  if (!j.srcImg) return;
  const want = j.strokes.glaze * smooth(k);
  if (want <= j.glazeC + 0.004) return;
  const a = 1 - (1 - want) / (1 - j.glazeC); j.glazeC = want;
  const im = j.srcImg, sw = im.naturalWidth || im.width, sh = im.naturalHeight || im.height, s = Math.min(sw, sh);
  P.save(); P.globalAlpha = clamp(a, 0, 1); P.imageSmoothingQuality = 'high';
  P.drawImage(im, (sw - s) / 2, (sh - s) / 2, s, s, 0, 0, PAINT_PX, PAINT_PX);
  P.restore(); paintTex.needsUpdate = true;
}
function finishTexture(j) {   // giữ chất tranh sau khi láng: thớ vải + vài nét viền
  if (!j.strokes.glaze) return;
  P.save(); P.globalAlpha = 0.045; P.strokeStyle = '#6a5a40'; P.lineWidth = 1;
  for (let i = 0; i < PAINT_PX; i += 4) { P.beginPath(); P.moveTo(i, 0); P.lineTo(i, PAINT_PX); P.stroke(); P.beginPath(); P.moveTo(0, i); P.lineTo(PAINT_PX, i); P.stroke(); }
  P.restore();
  for (const s of j.strokes.contours) if (Math.random() < 0.25) { const c = rawColor(j.A, s.x, s.y); drawStroke({ k: 'c', x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, w: 1.6, a: 0.3, r: c[0] * 0.5 | 0, g: c[1] * 0.45 | 0, b: c[2] * 0.5 | 0 }); }
  paintTex.needsUpdate = true;
}
function drawSignature(k) {
  P.save(); P.globalAlpha = clamp(k, 0, 1);
  P.translate(PAINT_PX - 170, PAINT_PX - 46); P.rotate(-0.08);
  P.fillStyle = job && job.style === 'neon' ? '#ff7ad9' : '#7a1f2b'; P.font = `700 34px ${HAND}`; P.textAlign = 'left'; P.textBaseline = 'middle';
  const sig = (S.painterName || 'Neon').split(' ').pop();
  P.fillText(sig.slice(0, 10) + ' ♥', 0, 0);
  P.restore(); paintTex.needsUpdate = true;
}
// ---------- hình vẽ nghịch cho tranh biếm họa ----------
const CAPTIONS = ['Nhan sắc: chưa nạp 🌹', 'Muốn đẹp hơn? Tặng quà nha 😆', 'Thả tim là được vầy nè 🤭', 'Bản dùng thử 😅', 'Giống 30% thôi 🤣', 'Cần 1 bông hồng để đẹp 🌹', 'Đẹp... theo cách riêng 😎', 'Tặng quà để ra bản HD 📸', 'Vẽ free nên vậy á 😜', 'Họa sĩ vẽ bằng chân 🦶'];
function pickDoodles() { return { top: pick(['crown', 'party', 'halo', 'horns', 'sprout', 'bow']), side: pick(['sweat', 'sparkle', 'hearts', 'dizzy']), caption: pick(CAPTIONS) }; }
function outlined(fn) { P.lineWidth = 6; P.strokeStyle = '#1a1420'; P.lineJoin = 'round'; fn(); P.fill(); P.stroke(); }
function drawDoodles(d) {
  P.save();
  const cx = PAINT_PX / 2, top = 70;
  if (d.top === 'crown') { P.fillStyle = '#ffd23f'; outlined(() => { P.beginPath(); P.moveTo(cx - 90, top + 60); P.lineTo(cx - 100, top); P.lineTo(cx - 45, top + 35); P.lineTo(cx, top - 15); P.lineTo(cx + 45, top + 35); P.lineTo(cx + 100, top); P.lineTo(cx + 90, top + 60); P.closePath(); }); P.fillStyle = '#e63946'; for (const x of [-50, 0, 50]) { P.beginPath(); P.arc(cx + x, top + 45, 9, 0, TAU); P.fill(); } }
  if (d.top === 'party') { P.fillStyle = '#4cc9f0'; outlined(() => { P.beginPath(); P.moveTo(cx - 60, top + 70); P.lineTo(cx + 10, top - 40); P.lineTo(cx + 70, top + 70); P.closePath(); }); P.fillStyle = '#ff5d8f'; P.beginPath(); P.arc(cx + 10, top - 46, 18, 0, TAU); P.fill(); P.stroke(); P.strokeStyle = '#ffd23f'; P.lineWidth = 8; for (const k of [0.35, 0.65]) { P.beginPath(); P.moveTo(cx - 60 + 70 * k * 1.0, top + 70 - 110 * k); P.lineTo(cx + 70 - 60 * k, top + 70 - 110 * k); P.stroke(); } }
  if (d.top === 'halo') { P.strokeStyle = '#ffd23f'; P.lineWidth = 14; P.beginPath(); P.ellipse(cx, top + 10, 110, 28, 0, 0, TAU); P.stroke(); P.strokeStyle = '#1a1420'; P.lineWidth = 3; P.beginPath(); P.ellipse(cx, top + 10, 118, 35, 0, 0, TAU); P.stroke(); }
  if (d.top === 'horns') { P.fillStyle = '#e63946'; for (const sd of [-1, 1]) outlined(() => { P.beginPath(); P.moveTo(cx + sd * 70, top + 80); P.quadraticCurveTo(cx + sd * 150, top + 30, cx + sd * 120, top - 30); P.quadraticCurveTo(cx + sd * 110, top + 40, cx + sd * 30, top + 80); P.closePath(); }); }
  if (d.top === 'sprout') { P.strokeStyle = '#2e8b3a'; P.lineWidth = 10; P.beginPath(); P.moveTo(cx, top + 80); P.quadraticCurveTo(cx - 10, top + 30, cx + 5, top); P.stroke(); P.fillStyle = '#6cc24a'; for (const sd of [-1, 1]) outlined(() => { P.beginPath(); P.ellipse(cx + sd * 38, top - 5, 38, 18, sd * -0.4, 0, TAU); }); }
  if (d.top === 'bow') { P.fillStyle = '#ff6fa3'; for (const sd of [-1, 1]) outlined(() => { P.beginPath(); P.moveTo(cx, top + 30); P.lineTo(cx + sd * 90, top - 20); P.lineTo(cx + sd * 90, top + 80); P.closePath(); }); outlined(() => { P.beginPath(); P.arc(cx, top + 30, 20, 0, TAU); }); }
  const sx = PAINT_PX - 150, sy = 200;
  if (d.side === 'sweat') { P.fillStyle = '#7cc8ff'; for (const [x, y, s] of [[sx, sy, 1], [sx + 40, sy + 70, 0.7]]) outlined(() => { P.beginPath(); P.moveTo(x, y - 40 * s); P.quadraticCurveTo(x + 28 * s, y, x, y + 20 * s); P.quadraticCurveTo(x - 28 * s, y, x, y - 40 * s); }); }
  if (d.side === 'sparkle') { P.fillStyle = '#ffd23f'; for (const [x, y, s] of [[sx, sy, 1], [140, 240, 0.8], [sx + 30, sy + 150, 0.6]]) outlined(() => { P.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 12 * s : 40 * s, a = i / 8 * TAU; P.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } P.closePath(); }); }
  if (d.side === 'hearts') { P.fillStyle = '#ff4d6d'; P.font = `900 64px ${FONT}`; P.textAlign = 'center'; P.textBaseline = 'middle'; for (const [x, y] of [[sx, sy], [130, 230], [sx + 40, sy + 120]]) { P.lineWidth = 6; P.strokeStyle = '#1a1420'; P.strokeText('♥', x, y); P.fillText('♥', x, y); } }
  if (d.side === 'dizzy') { P.strokeStyle = '#9d4edd'; P.lineWidth = 7; P.beginPath(); for (let a = 0; a < TAU * 2.2; a += 0.15) { const r = 6 + a * 7; P.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } P.stroke(); P.fillStyle = '#ffd23f'; P.font = `900 54px ${FONT}`; P.textAlign = 'center'; P.textBaseline = 'middle'; P.fillText('★', 150, 210); P.fillText('★', 230, 150); }
  // lời bình hài hước + dấu "BẢN FREE"
  P.font = `700 34px ${HAND}`; const tw = P.measureText(d.caption).width + 50, bx = clamp(PAINT_PX / 2 - tw / 2, 20, PAINT_PX - tw - 20), by = PAINT_PX - 170;
  P.fillStyle = '#ffffff'; outlined(() => { rr(P, bx, by, tw, 70, 30); }); P.fillStyle = '#ffffff'; P.beginPath(); P.moveTo(bx + 60, by + 2); P.lineTo(bx + 80, by - 30); P.lineTo(bx + 100, by + 2); P.closePath(); P.fill();
  P.fillStyle = '#1a1420'; P.textAlign = 'center'; P.textBaseline = 'middle'; P.fillText(d.caption, bx + tw / 2, by + 37);
  P.translate(PAINT_PX - 140, PAINT_PX - 60); P.rotate(-0.22);
  P.strokeStyle = 'rgba(214,38,47,0.85)'; P.lineWidth = 5; rr(P, -110, -30, 220, 60, 10); P.stroke();
  P.fillStyle = 'rgba(214,38,47,0.85)'; P.font = `900 34px ${BIG}`; P.fillText('BẢN FREE', 0, 2);
  P.restore(); paintTex.needsUpdate = true;
}
function drawInvite() {
  paperBg('sketch');
  P.save(); P.fillStyle = '#4a3a2a'; P.textAlign = 'center'; P.textBaseline = 'middle';
  P.font = `700 62px ${HAND}`; P.fillText('Chờ người mẫu…', PAINT_PX / 2, 180);
  P.font = `600 40px ${HAND}`; P.fillText('🎁 Tặng quà → vẽ giống bạn', PAINT_PX / 2, 330); P.fillText('quà càng lớn càng giống!', PAINT_PX / 2, 392);
  P.font = `600 36px ${HAND}`; P.fillStyle = '#7a5a3a'; P.fillText('💬 ❤️ Bình luận, thả tim', PAINT_PX / 2, 520); P.fillText('→ vẽ biếm họa 🤪', PAINT_PX / 2, 574);
  P.strokeStyle = 'rgba(60,50,40,0.5)'; P.lineWidth = 3; P.beginPath(); P.ellipse(PAINT_PX / 2, 362, 320, 110, -0.04, 0, TAU); P.stroke();
  P.restore(); paintTex.needsUpdate = true;
}

// ---------- công việc vẽ hiện tại ----------
let job = null;
const tierOf = c => c >= (Number(S.tierKing) || 299) ? 4 : c >= (Number(S.tierNoble) || 99) ? 3 : c >= 30 ? 2 : c >= 1 ? 1 : 0;
const TIER_NAME = ['Biếm họa 🤪', 'Vẽ nhanh', 'Sơn dầu', 'Chân dung', 'Kiệt tác'];
const TIER_ICON = ['🤪', '🌹', '💎', '👑', '🏆'];
const snapReq = [];   // chụp mặt nhân vật 3D làm mẫu khi không có ảnh đại diện
function plateSub(j) { return j.tier ? `${TIER_NAME[j.tier]}${j.style !== 'sondau' ? ' · ' + ART[j.style].name : ''}${j.lucky ? ' · 🍀 vẽ tặng' : ''}` : 'Biếm họa · bản free 🤪'; }
function startJob(p) {
  const i = queue.indexOf(p); if (i >= 0) queue.splice(i, 1);
  sitter = p;
  let tier = Math.min(4, tierOf(p.coins) + (p.tierBonus || 0));
  if (p.lucky) tier = Math.max(tier, 2);
  const lucky = !!p.lucky;
  p.paintCoins = p.coins; p.coins = 0; p.tierBonus = 0; p.lucky = false; p.bonus = 0;
  if (!p.bodied) giveBody(p, queueSlot(0).add(V3(-0.8, 0, 0)));
  p.target = STOOL_POS.clone().add(V3(0, 0, 0.02));
  const giftersWaiting = queue.filter(x => x.coins > 0).length;
  const D = clamp(Number(S.paintSeconds) || 14, 6, 60) * clamp(1 - Math.max(0, giftersWaiting - 2) * 0.06, 0.55, 1);
  job = { p, tier, style: tier ? (p.artStyle || 'sondau') : 'cartoon', lucky, t: 0, phase: 'intro', D, src: null, srcImg: null, A: null, strokes: null, si: 0, sk: 0, ci: 0, pc: 0, glazeK: 0, glazeC: 0, boost: 0, brushU: 0.5, brushV: 0.3, seated: false, wantSnap: false, t0: now() };
  drawPlate(p.name, plateSub(job));
  setFrame(0);
  bubble(tier ? pick([`Mời ${short(p.name)} ngồi!`, 'Ngồi yên nha!', 'Cười lên nào!', 'Tạo dáng đi!']) : pick([`${short(p.name)} ơi, vẽ vui nha 😆`, 'Bản free nè! 🤪', 'Ngồi đi, vẽ lẹ!']), 2.4);
  // nguồn ảnh: ảnh đại diện TikTok, không có thì chụp nhân vật 3D của người đó
  const myJob = job;
  (async () => {
    const im = p.avatar ? await loadImage(p.avatar) : null;
    if (job !== myJob) return;
    if (im) { try { myJob.src = squareFrom(im); myJob.srcImg = im; } catch (e) { myJob.src = null; } }
    if (!myJob.src) myJob.wantSnap = true;
  })();
}
function prepareJob(j) {
  if (j.strokes) return;
  let data = j.src || placeholderSource();
  if (!j.tier) { j.warp = pick(WARPS); data = warpCaricature(data, j.warp); }
  j.A = analyse(data);
  j.strokes = j.tier ? buildPortrait(j.A, j.tier, j.style) : buildCaricature(j.A);
  paperBg(j.tier ? ART[j.style].paper : 'notebook', j.strokes.pal);
  sfx.pop();
}
// tặng thêm khi đang được vẽ: biếm họa → vẽ lại bản đẹp; tranh đẹp → thêm lớp chi tiết, khung xịn hơn
function upgradeJob(j, value, bonus = 0) {
  j.p.paintCoins = (j.p.paintCoins || 0) + value;
  j.boost = 3;
  const nt = Math.min(4, Math.max(j.tier, tierOf(j.p.paintCoins) + bonus, j.lucky ? 2 : 0));
  if (nt <= j.tier) return;
  const old = j.tier; j.tier = nt;
  if (old === 0) {
    j.style = j.p.artStyle || 'sondau';
    if (j.phase !== 'reveal' && j.phase !== 'throw') {
      j.strokes = null; j.si = j.sk = j.ci = j.pc = 0; j.glazeK = j.glazeC = 0;
      j.phase = 'intro'; j.t = 1.2; canvasPop = now(); paperBg('canvas');
      bubble('Ồ! Vẽ lại bản đẹp nha ✨', 2.6);
    }
  } else if (j.strokes && (j.phase === 'intro' || j.phase === 'sketch')) {
    const n0 = Math.max(1, j.strokes.sketch.length), st = buildPortrait(j.A, nt, j.style);
    j.si = Math.floor(j.si / n0 * st.sketch.length); j.sk = j.si; j.strokes = st;
  } else if (j.strokes && (j.phase === 'paint' || j.phase === 'sign')) {
    appendColor(j.strokes, buildColor(j.A, nt, j.style, j.strokes.pal, TIER_PLAN[old], j.strokes.contours));
    if (j.style === 'sondau' || j.style === 'mauNuoc') j.strokes.glaze = TIER_PLAN[nt].glaze;
    j.phase = 'paint'; j.t = 0;
  }
  drawPlate(j.p.name, plateSub(j));
  if (old > 0) bubble('Nâng cấp tranh! ⬆️', 2);
}
function finishSitter() {
  const p = sitter; sitter = null;
  if (!p) return;
  p.paintedAt = now();
  if (p.bodied) { p.target = V3(-3.8, 0, -2.2); p.leaveAt = now(); p.jumpT = 0; walkers.push(p); }
}
let lastStrokeSfx = 0;
function strokeSfx(j, t) {
  const gap = j.phase === 'sketch' ? (j.tier ? 0.09 : 0.16) : (j.tier ? 0.28 : 0.2);
  if (t - lastStrokeSfx < gap) return; lastStrokeSfx = t;
  if (!j.tier) sfx.marker(); else if (j.phase === 'sketch') sfx.pencil(); else sfx.brush(j.style === 'mauNuoc');
}
function updateJob(t, dt) {
  if (!job) {
    if (party.on || (lucky.spin && !lucky.spin.done)) return;
    const next = queue[0];
    if (next && (next.coins > 0 || next.lucky || S.paintFree !== false)) { startJob(next); return; }
    if (!idleInvite) { idleInvite = true; drawInvite(); drawPlate(S.painterName || 'Họa sĩ Neon', 'Tặng quà để được vẽ'); setFrame(0); }
    if (t > nextInviteBubble) { nextInviteBubble = t + rand(14, 22); bubble(pick(['Tặng 🌹 để được vẽ nha!', 'Ai muốn vẽ chân dung nào?', 'Thả tim là vẽ biếm họa nè 🤪', 'Quà càng to càng giống!']), 3); }
    return;
  }
  idleInvite = false;
  const j = job;
  if (party.on) return;   // dance party: cả họa sĩ cũng đi nhảy
  const sp = (j.boost > 0 ? 1.7 : 1) * likeSpeed(); j.boost = Math.max(0, j.boost - dt);
  j.t += dt * sp;
  const p = j.p, dur = PHASE_DUR[j.tier];
  if (j.phase === 'intro') {
    j.seated = p.bodied && p.pos.distanceTo(STOOL_POS) < 0.1;
    if (j.wantSnap && j.seated && !j.snapAsked && j.t > 0.6) { j.snapAsked = true; snapReq.push(j); }
    const ready = j.src || j.snapDone || (j.t > 7);
    if ((j.seated || j.t > 6) && ready && j.t > 1.2) { prepareJob(j); j.phase = 'sketch'; j.t = 0; }
    return;
  }
  if (j.phase === 'sketch') {
    const list = j.strokes.sketch;
    j.sk += dt * sp * list.length / (j.D * dur[0]);
    const target = Math.min(list.length, Math.floor(j.sk));
    let drew = false;
    while (j.si < target) { const s = list[j.si++]; drawStroke(s); j.brushU = s.x / AN; j.brushV = s.y / AN; drew = true; }
    if (drew) { paintTex.needsUpdate = true; strokeSfx(j, t); bristleMat.color.set(j.tier ? 0x222222 : 0x111111); }
    if (j.si >= list.length) { j.phase = 'paint'; j.t = 0; if (j.tier) bubble(pick(['Tô màu nào!', 'Thêm chút màu…', 'Đẹp dần rồi nè!']), 2); }
    return;
  }
  if (j.phase === 'paint') {
    const st = j.strokes, list = st.color, frac = st.glaze > 0 ? 0.8 : 1, pdur = j.D * dur[1];
    j.pc += dt * sp * st.colorCost / (pdur * frac);
    let drew = false;
    while (j.ci < list.length && list[j.ci].cum <= j.pc) { const s = list[j.ci++]; drawStroke(s); j.brushU = s.x / AN; j.brushV = s.y / AN; j.paint = s; drew = true; }
    if (drew) { paintTex.needsUpdate = true; strokeSfx(j, t); if (j.paint) bristleMat.color.setRGB(j.paint.r / 255, j.paint.g / 255, j.paint.b / 255, THREE.SRGBColorSpace); }
    if (j.ci >= list.length) {
      if (st.glaze > 0 && j.glazeK < 1) {
        j.glazeK = Math.min(1, j.glazeK + dt * sp / (pdur * (1 - frac)));
        glazeStep(j, j.glazeK);
        j.brushU = 0.5 + Math.sin(t * 3) * 0.35; j.brushV = 0.2 + j.glazeK * 0.6; strokeSfx(j, t);
        if (j.glazeK >= 1) finishTexture(j);
      } else { j.phase = 'sign'; j.t = 0; if (j.tier >= 3) sfx.drumroll(1.0); }
    }
    return;
  }
  if (j.phase === 'sign') {
    j.brushU = j.tier ? 0.78 + j.t * 0.1 : 0.5 + Math.sin(t * 6) * 0.3; j.brushV = j.tier ? 0.93 : 0.15 + j.t * 0.6;
    if (j.t > 0.9) { if (j.tier) drawSignature(1); else drawDoodles(j.strokes.doodles); j.phase = 'reveal'; j.t = 0; onReveal(j); }
    return;
  }
  if (j.phase === 'reveal') {
    setFrame(j.tier, backOut(j.t / 0.5));
    if (j.t > 2.2) { j.phase = 'throw'; j.t = 0; launchToGallery(j); sfx.whoosh(); }
    return;
  }
  if (j.phase === 'throw') {
    if (j.t > 0.35 && !j.cleared) { j.cleared = true; setFrame(0); canvasMesh.visible = false; finishSitter(); }
    if (j.t > 1.3) {
      canvasMesh.visible = true; canvasPop = t; job = null; idleInvite = false; paperBg('canvas'); drawPlate('…', ''); sfx.pop();
      avgJob = avgJob * 0.8 + clamp(now() - j.t0, 6, 120) * 0.2;
    }
  }
}
let idleInvite = false, nextInviteBubble = 0, canvasPop = -10;
function onReveal(j) {
  const p = j.p;
  revealFx = { t0: now(), tier: j.tier, name: p.name, caric: !j.tier };
  if (!j.tier) {
    bubble(pick(['Hehe 🤭', 'Giống chưa? 😆', 'Tặng quà để bản đẹp nha!', 'Kiệt tác... biếm họa! 🤣']), 2.6);
    sfx.sadTrombone();
    for (const q of queue) if (q.bodied && Math.random() < 0.6) q.clapUntil = now() + 1.6;
    if (p.bodied) p.shockT = now();
  } else {
    bubble(pick(j.tier >= 3 ? ['Kiệt tác!', 'Tuyệt phẩm!', 'Đẹp xuất sắc!'] : ['Xong rồi!', 'Đẹp chưa nè?', 'Giống y chang!', 'Tặng bạn nè!']), 2.4);
    sfx.chime(j.tier); sfx.applause(j.tier >= 3 ? 2.2 : 1.4, j.tier >= 3 ? 1 : 0.7);
    if (j.tier >= 3) confetti(80); else sparkleAt(canvasScreen(), 26);
    for (const q of queue) if (q.bodied && Math.random() < 0.7) q.clapUntil = now() + 2;
    if (p.bodied) p.jumpT = now();
  }
  painted++;
}
let painted = 0, revealFx = null;
// ---------- tranh bay lên dây phơi ----------
function galleryDraw(gi) {
  const g = gi.tex.userData.g, S0 = 300, F = gi.frame, LB = 44, w = S0 + F * 2, h = S0 + F * 2 + LB;
  g.clearRect(0, 0, w, h);
  const fc = gi.tier >= 3 ? ['#fff1a8', '#d99a1e', '#ffe27a', '#a86a0a'] : gi.tier === 2 ? ['#ffffff', '#aab2bf', '#e8ecf2', '#7d8694'] : gi.tier === 1 ? ['#c58a55', '#6e4122', '#b07445', '#5a3218'] : ['#ffe066', '#ff8fab', '#9be7ff', '#b8f2a6'];
  const gr = g.createLinearGradient(0, 0, w, h); fc.forEach((c, i) => gr.addColorStop(i / 3, c));
  g.fillStyle = gr; g.fillRect(0, 0, w, S0 + F * 2);
  g.drawImage(gi.thumb, F, F, S0, S0);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3; g.strokeRect(F, F, S0, S0);
  g.fillStyle = gi.best ? '#ffe27a' : '#fff8e8'; rr(g, 6, S0 + F * 2 + 4, w - 12, LB - 8, 8); g.fill();
  g.fillStyle = '#3a2410'; g.font = `700 22px ${HAND}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const tail = (gi.score ? ` ⭐${gi.score.toFixed(1)}` : '') + (gi.best ? ' 🏅' : '');
  let nmx = (gi.tier ? '' : '🤪 ') + gi.name; while (g.measureText(nmx + tail).width > w - 24 && nmx.length > 2) nmx = nmx.slice(0, -1);
  g.fillText(nmx + tail, w / 2, S0 + F * 2 + LB / 2);
  gi.tex.needsUpdate = true;
}
function launchToGallery(j) {
  const thumb = document.createElement('canvas'); thumb.width = thumb.height = 300;
  thumb.getContext('2d').drawImage(paintTex.userData.canvas, 0, 0, 300, 300);
  const F = j.tier >= 3 ? 26 : j.tier ? 18 : 12;
  const tex = canvasTex(300 + F * 2, 300 + F * 2 + 44);
  const gi = { thumb, name: j.p.name, avatar: j.p.avatar, tier: j.tier, frame: F, tex, score: 0, best: false };
  galleryDraw(gi);
  const ar = tex.image.height / tex.image.width;
  const gw = j.tier >= 3 ? 0.66 : 0.56;
  const grp = new THREE.Group();
  const pic = mesh(new THREE.PlaneGeometry(gw, gw * ar), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2 }), 0, -gw * ar / 2 - 0.02, 0, grp);
  for (const sx of [-0.32, 0.32]) mesh(new THREE.BoxGeometry(0.03, 0.08, 0.03), std(0xd9b38c), sx * gw, -0.01, 0.01, grp);
  scene.add(grp);
  // vị trí đầu: đúng chỗ toan trên giá vẽ
  canvasMesh.getWorldPosition(_v1); canvasMesh.getWorldQuaternion(_q1);
  const startScale = CW / gw;
  grp.position.copy(_v1).add(V3(0, CH / 2, 0)); grp.quaternion.copy(_q1); grp.scale.setScalar(startScale);
  pic.position.y = -gw * ar / 2 - 0.02;
  // dịch hết sang trái một ô, tranh cũ nhất rơi xuống
  for (const g of gallery) g.slot--;
  for (const g of gallery) if (g.slot < 0 && !g.fall) { g.fall = now(); }
  Object.assign(gi, { group: grp, slot: GALLERY_N - 1, from: grp.position.clone(), fromQ: grp.quaternion.clone(), fromS: startScale, t0: now(), dur: 1.25, ph: Math.random() * TAU });
  gallery.push(gi);
  startVote(gi);
}
function updateGallery(t, dt) {
  for (let i = gallery.length - 1; i >= 0; i--) {
    const g = gallery[i];
    if (g.fall) {
      const k = t - g.fall; g.group.position.y -= dt * (1 + k * 6); g.group.rotation.z += dt * 2;
      if (k > 1.6) { scene.remove(g.group); g.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); g.tex.dispose(); g.dead = true; gallery.splice(i, 1); }
      continue;
    }
    const target = slotPos(clamp(g.slot, 0, GALLERY_N - 1));
    const k = clamp((t - g.t0) / g.dur, 0, 1), e = smooth(k);
    if (k < 1) {
      const mid = g.from.clone().lerp(target, 0.5).add(V3(0, 1.4, 0.6));
      const a = g.from.clone().lerp(mid, e), b = mid.clone().lerp(target, e);
      g.group.position.copy(a.lerp(b, e));
      g.group.quaternion.copy(g.fromQ).slerp(new THREE.Quaternion(), e);
      g.group.rotation.z += Math.sin(e * PI) * 0.6;
      g.group.scale.setScalar(lerp(g.fromS, 1, e));
      g.cur = g.group.position.clone();
    } else {
      g.cur = (g.cur || target.clone()).lerp(target, Math.min(1, dt * 3));
      g.group.position.copy(g.cur);
      g.group.rotation.set(0, 0, Math.sin(t * 1.3 + g.ph) * 0.04);
      g.group.scale.setScalar(g.best ? 1.08 : 1);
    }
  }
}

// ---------- chấm điểm tranh vừa vẽ (gõ 1–5) → tranh đẹp nhất đêm ----------
let vote = null, best = null;
function startVote(gi) {
  if (vote) closeVote();
  const sec = Number(S.voteSeconds ?? 12); if (!(sec > 0)) return;
  vote = { g: gi, name: gi.name, t0: now(), until: now() + sec, sum: 0, n: 0, voters: new Set() };
}
function castVote(p, v) {
  if (!vote || now() > vote.until || vote.voters.has(p.id)) return false;
  vote.voters.add(p.id); vote.sum += v; vote.n++; sfx.blip(900 + v * 80);
  return true;
}
function closeVote() {
  const v = vote; vote = null;
  if (!v || !v.n) return;
  const score = v.sum / v.n; v.g.score = score;
  if (!best || score > best.score + 1e-6 || (Math.abs(score - best.score) < 1e-6 && v.n > best.n)) {
    if (best && best.g && !best.g.dead) { best.g.best = false; galleryDraw(best.g); }
    best = { g: v.g, name: v.g.name, avatar: v.g.avatar, score, n: v.n, thumb: v.g.thumb };
    v.g.best = true;
    pushBanner({ user: { name: v.g.name, avatar: v.g.avatar }, text: `🏅 Tranh đẹp nhất đêm ⭐${score.toFixed(1)}`, gold: true, color: '#9a5a00' });
    sfx.chime(3); confetti(40);
  }
  if (!v.g.dead) galleryDraw(v.g);
}
function updateVote(t) { if (vote && t > vote.until) closeVote(); }

// ---------- vẽ tặng may mắn: cứ vài phút quay số chọn một người bình luận, vẽ sơn dầu miễn phí ----------
const lucky = { next: 0, spin: null };
const shuffleArr = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function luckyEvery() { return Math.max(0, Number(S.luckyEvery ?? 4)); }
function updateLucky(t) {
  const every = luckyEvery();
  if (!(every > 0)) { lucky.next = 0; lucky.spin = null; return; }
  if (!lucky.next) lucky.next = t + every * 60;
  const s = lucky.spin;
  if (s) {
    const k = (t - s.t0) / s.dur;
    if (k < 1) { const idx = Math.floor(s.steps * (1 - Math.pow(1 - k, 3))) % s.pool.length; if (idx !== s.idx) { s.idx = idx; sfx.tick(k); } }
    else if (!s.done) {
      s.done = true; s.idx = s.pool.indexOf(s.winner);
      if (queue.includes(s.winner)) { s.winner.lucky = true; sortQueue(); }
      pushBanner({ user: s.winner, text: '🍀 trúng vẽ tặng may mắn!', gold: true, color: '#1f7a3a' });
      bubble(`Chúc mừng ${short(s.winner.name)}! 🍀`, 2.6); sfx.win(); confetti(70);
      if (s.winner.bodied) s.winner.jumpT = now();
    }
    if (k > 1.45) { lucky.spin = null; lucky.next = t + every * 60; }
    return;
  }
  if (t >= lucky.next && !party.on) {
    const cands = queue.filter(p => !p.coins && !p.lucky);
    if (!cands.length) { lucky.next = t + 30; return; }
    const pool = shuffleArr(cands).slice(0, 14), winner = pick(pool);
    lucky.spin = { t0: t, dur: 3.4, pool, winner, steps: pool.length * 3 + pool.indexOf(winner), idx: -1, done: false };
    sfx.drumroll(3.2);
  }
}

// ======================================================================
// DANCE PARTY
// ======================================================================
const party = { pts: 0, on: false, t0: 0, until: 0, level: 0, count: 0 };
const partyGoal = () => Math.max(50, Number(S.partyGoal) || 1500);
function addParty(n) {
  if (party.on || !(n > 0)) return;
  party.pts += n;
  if (party.pts >= partyGoal()) startParty();
}
function startParty() {
  party.on = true; party.t0 = now(); party.until = now() + clamp(Number(S.partySeconds) || 20, 8, 90); party.pts = 0; party.count++;
  bubble('Quẩy thôi!', 2.5);
  horn(); sfx.applause(1.6, 0.8); confetti(120);
  for (const p of [painter, ...bodied()]) p.dance = pickDance();
  if (Music) Music.setDuck(1);
}
function stopParty() { party.on = false; if (Music) Music.setDuck(0.62); bubble('Vẽ tiếp nào!', 2); }
function pickDance() { let i; for (let k = 0; k < 10; k++) { i = Math.floor(Math.random() * DANCES.length); if (!DANCES[i].floor) break; } return i || 0; }
function updateParty(t, dt) {
  if (party.on && t > party.until) stopParty();
  party.level = clamp(party.level + (party.on ? dt / 1.2 : -dt / 1.5), 0, 1);
  const L = smooth(party.level);
  skyNight.material.opacity = L;
  scene.background.copy(SKY_DAY).lerp(SKY_NIGHT, L);
  scene.fog.color.setRGB(lerp(0.9, 0.12, L), lerp(0.93, 0.06, L), lerp(0.99, 0.22, L));
  hemi.intensity = lerp(0.85, 0.42, L); sun.intensity = lerp(1.55, 0.35, L); fill.intensity = lerp(0.4, 0.15, L);
  hemi.color.setRGB(lerp(0.91, 0.55, L), lerp(0.96, 0.45, L), 1); renderer.toneMappingExposure = lerp(0.92, 0.85, L);
  for (const m of lanternMats) m.emissiveIntensity = lerp(0.45, 2.2, L);
  canvasMatFront.emissiveIntensity = lerp(0.18, 0.03, L);   // toan trắng không bị loá khi đèn party bật
  bulbMat.color.setRGB(1, lerp(0.88, 0.75, L), lerp(0.66, 0.5, L)).multiplyScalar(lerp(1, 2.2, L));
  const beat = Music ? Music.phase : (t * 2) % 1, kick = Math.exp(-beat * 5);
  discoBall.position.y = lerp(9, 3.25, smooth(party.level * 1.2));
  discoBall.rotation.y += dt * 1.4;
  discoBall.visible = party.level > 0.01;
  beams.forEach((b, i) => {
    b.visible = L > 0.01;
    b.material.opacity = L * (0.14 + 0.12 * kick);
    b.rotation.z = Math.sin(t * 0.9 + b.userData.ph) * 0.55;
    b.rotation.x = Math.cos(t * 0.7 + b.userData.ph) * 0.35;
    b.material.color.setHSL(((t * 0.08 + i / 6) % 1), 1, 0.55);
  });
  floorSpots.forEach((s, i) => {
    s.visible = L > 0.01; s.material.opacity = L * (0.22 + 0.16 * kick);
    s.position.x = 0.3 + Math.sin(t * 0.8 + s.userData.ph) * 2.2; s.position.z = 0.2 + Math.cos(t * 0.6 + s.userData.ph * 1.3) * 1.8;
    s.material.color.setHSL(((t * 0.1 + i / 6) % 1), 1, 0.55);
  });
  partyLights.forEach((l, i) => { l.intensity = L * (2.2 + 2.2 * kick); l.position.set(Math.sin(t * 1.1 + i * 1.6) * 2.5, 2.8, 1 + Math.cos(t * 0.9 + i) * 2); });
  if (bloom) { bloom.strength = lerp(0.12, 0.45, L); bloom.threshold = lerp(1.0, 0.9, L); }
  if (party.on && Math.random() < dt * 6 * qMul()) confetti(3);
}

// ======================================================================
// TƯ THẾ
// ======================================================================
function idlePose(a, t) {
  const o = NP(), s = a.seed;
  o.lu = -0.2 + 0.05 * Math.sin(t * 1.3 + s); o.ru = 0.2 - 0.05 * Math.sin(t * 1.1 + s);
  o.lf = -0.2; o.rf = 0.2; o.head = 0.14 * Math.sin(t * 0.7 + s); o.lean = 0.035 * Math.sin(t * 0.9 + s); o.dx = 0.02 * Math.sin(t * 0.9 + s);
  o.lt = -0.07 - 0.04 * Math.sin(t * 0.9 + s); o.rt = 0.07 - 0.04 * Math.sin(t * 0.9 + s);
  return o;
}
function wavePose(a, t) { const o = idlePose(a, t); o.lu = -2.55 + Math.sin(t * 11) * 0.35; o.lf = -0.45; o.head = 0.1; return o; }
function beatPB(t) { const p = Music ? Music.phase : (t * 2) % 1, b = Music ? Music.beat : Math.floor(t * 2); return [p, b]; }
function dancePose(a, t) { const [p, b] = beatPB(t); const d = DANCES[a.dance] || DANCES[0]; return d ? d.f(p, b, t) : idlePose(a, t); }
function crowdPose(a, t) {
  if (a.moving) return SP.walk(a.walkPh);
  if (party.on) return dancePose(a, t);
  if (a.jumpT && t - a.jumpT < 0.8) return SP.jump((t - a.jumpT) / 0.8);
  if (a.clapUntil > t && DANCES[6]) { const [p, b] = beatPB(t); return DANCES[6].f(p, b, t); }
  if (a.waveUntil > t) return wavePose(a, t);
  return idlePose(a, t);
}
function sitterPose(a, t) {
  if (a.moving) return SP.walk(a.walkPh);
  if (party.on) return dancePose(a, t);
  const o = NP(); o.sit = 1;
  o.lu = -0.32; o.lf = -1.0; o.ru = 0.32; o.rf = 1.0; o.head = 0.06 * Math.sin(t * 0.8 + a.seed);
  if (a.waveUntil > t) { o.lu = -2.5 + Math.sin(t * 11) * 0.35; o.lf = -0.4; }
  return o;
}
// họa sĩ: tay trái cầm bảng màu, tay phải (khung điều khiển bên L) cầm cọ vươn tới toan
function painterPose(t) {
  const o = NP();
  o.ru = 0.22; o.rsx = -0.38; o.rex = -1.28; o.rf = 0.25;      // bảng màu trước bụng
  o.lu = -0.22; o.lf = -0.3;
  o.head = 0.05 * Math.sin(t * 0.9); o.lean = -0.03;
  return o;
}
const painterState = { mode: 'idle', until: 0, x: PAINTER_HOME.x, z: PAINTER_HOME.z, brushW: V3(), brushS: V3(), ikOff: V3(), hasBrush: false };

// ======================================================================
// CẬP NHẬT + VẼ NHÂN VẬT
// ======================================================================
const _hp = V3(), _ht = V3();
function canvasPoint(u, v, out, lift = 0) {
  out.set((u - 0.5) * CW, (0.5 - v) * CH, CD / 2 + lift);
  canvasMesh.updateWorldMatrix(true, false);
  return out.applyMatrix4(canvasMesh.matrixWorld);
}
const CANVAS_N = V3(Math.sin(easel.rotation.y), 0, Math.cos(easel.rotation.y));
function driveActor(a, pose, base, opts = {}) {
  if (a.avT && a.avT.fused && !opts.ik) {   // nhân vật gắn xương tự động: giơ tay vừa phải để không lộ chỗ cắt
    const k = Number(S.fusedArm ?? 80) / 100; pose = Object.assign({}, pose);
    pose.lu = -0.18 + (pose.lu + 0.18) * k; pose.ru = 0.18 + (pose.ru - 0.18) * k;
    if (pose.lsx !== undefined) pose.lsx *= k; if (pose.rsx !== undefined) pose.rsx *= k;
  }
  poseRig(a, pose, base, !pose.sit);
  if (opts.ik) opts.ik();
  if (!a.av && avatarTemplates.length && S.quality !== 'off') {
    a.av = createAvatar(scene, a.body.female, a.avT, null, { outfit: a.avOutfit, shape: a.avShape });
    if (a.av && a.isPainter) dressPainter(a.av);
    if (a.av) a.av._style = undefined;
  }
  if (a.av && !a.isPainter) {
    if (a.style === undefined) a.style = Math.random() * 100 < Number(S.styleRate ?? 85) ? randomStyleId(a.body.female) : null;
    const want = S.stylesEnabled === false ? null : a.style;
    if (a.av._style !== want) { applyStyle(a.av, want); a.av._style = want; }
  }
  if (a.av) {
    _hp.set(0, HEAD_Y, 0).applyMatrix4(rig.head.matrixWorld);
    _ht.set(0, HEAD_Y + 0.3, 0).applyMatrix4(rig.head.matrixWorld);
    const alpha = opts.alpha ?? 1;
    driveAvatar(a.av, rig, { yaw: rig.root.rotation.y, scale: a.body.h, hipH0: 0.88, flat: !pose.rot && !pose.sit, alpha, floorY: base.y, headPt: _hp, headTop: _ht, beat: 1 - (Music ? Music.phase : 0), sing: 0 });
  }
  if (a.shadow) { a.shadow.position.set(rig.root.position.x, 0.012, rig.root.position.z); const s = (pose.sit ? 0.8 : 1) * clamp(1 - (rig.root.position.y - base.y) * 0.3, 0.4, 1) * (opts.alpha ?? 1); a.shadow.scale.setScalar(s); }
  a._sp = project(a._head);
}
function moveActor(a, dt, faceYaw) {
  a.moving = false;
  if (a.target) {
    const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z, d = Math.hypot(dx, dz);
    if (d > 0.04) {
      const st = Math.min(d, a.speed * dt);
      a.pos.x += dx / d * st; a.pos.z += dz / d * st;
      const want = Math.atan2(dx, dz);
      a.yaw += Math.atan2(Math.sin(want - a.yaw), Math.cos(want - a.yaw)) * Math.min(1, dt * 10);
      a.walkPh = (a.walkPh + dt * 1.6) % 1; a.moving = true;
      return;
    }
    a.pos.x = a.target.x; a.pos.z = a.target.z;
  }
  if (faceYaw !== undefined) a.yaw += Math.atan2(Math.sin(faceYaw - a.yaw), Math.cos(faceYaw - a.yaw)) * Math.min(1, dt * 5);
}
function pollChar(a, t) {
  if (a.char && !a.avT && t > (a._charPoll || 0)) {
    a._charPoll = t + 0.5;
    const tp = templateForChar(a.char.id);
    if (tp) { a.avT = tp; a.avOutfit = null; if (a.av) { disposeAvatar(a.av); a.av = null; } }
  }
}
const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
function updatePeople(t, dt) {
  // ai đã chờ quá lâu mà không tặng quà thì rời hàng
  const idle = clamp(Number(S.idleSeconds) || 420, 60, 7200);
  for (let i = queue.length - 1; i >= 0; i--) { const p = queue[i]; if (!p.coins && t - p.lastActive > idle) leaveQueue(p); }
  // nhân vật 3D cho VIS người đầu hàng
  queue.forEach((p, i) => {
    const slot = queueSlot(i);
    if (i < VIS) {
      if (!p.bodied) giveBody(p, slot.clone().add(V3(-2.4, 0, 0.6)));
      p.target = slot;
    } else if (p.bodied) { p.target = V3(-3.8, 0, slot.z); if (p.pos.x < -3.6) dropBody(p); }
  });
  for (let i = walkers.length - 1; i >= 0; i--) {
    const w = walkers[i];
    if (!w.bodied || (w.target && w.pos.distanceTo(w.target) < 0.08) || t - (w.leaveAt || t) > 9) { dropBody(w); walkers.splice(i, 1); }
  }
}
function frameActors(t, dt) {
  // họa sĩ
  if (painter.charId && !painter.avT && t > (painter._charPoll || 0)) { painter._charPoll = t + 0.5; const tp = templateForChar(painter.charId); if (tp) { painter.avT = tp; painter.avOutfit = null; if (painter.av) { disposeAvatar(painter.av); painter.av = null; } } }
  framePainter(t, dt);
  // người mẫu
  if (sitter && sitter.bodied) {
    const s = sitter; pollChar(s, t);
    moveActor(s, dt, yawTo(STOOL_POS, painter.pos));
    let pose;
    if (party.on) pose = dancePose(s, t);
    else if (s.moving) pose = SP.walk(s.walkPh);
    else if (job && job.phase === 'reveal' && !job.tier) { pose = NP(); pose.sit = 1; pose.lu = -2.45; pose.lf = -2.3; pose.ru = 2.45; pose.rf = 2.3; pose.head = 0.25 * Math.sin(t * 9); pose.lean = 0.05 * Math.sin(t * 4); }   // ôm đầu: "trời ơi tranh gì đây!"
    else if (job && job.phase === 'reveal') pose = s.jumpT && t - s.jumpT < 1.6 ? SP.jump(((t - s.jumpT) % 0.8) / 0.8) : (DANCES[6] ? DANCES[6].f(...beatPB(t), t) : idlePose(s, t));
    else pose = sitterPose(s, t);
    driveActor(s, pose, V3(s.pos.x, 0, s.pos.z));
  }
  // hàng chờ
  for (const p of queue) {
    if (!p.bodied) continue;
    pollChar(p, t);
    moveActor(p, dt, yawTo(p.pos, V3(0.4, 0, 1.0)));
    const alpha = clamp((t - p.born) / 0.4, 0.01, 1);
    driveActor(p, crowdPose(p, t), V3(p.pos.x, 0, p.pos.z), { alpha });
  }
  for (const w of walkers) {
    if (!w.bodied) continue;
    pollChar(w, t);
    if (w.jumpT && t - w.jumpT < 0.8) { driveActor(w, SP.jump((t - w.jumpT) / 0.8), V3(w.pos.x, 0, w.pos.z)); continue; }
    moveActor(w, dt);
    driveActor(w, w.moving ? SP.walk(w.walkPh) : idlePose(w, t), V3(w.pos.x, 0, w.pos.z));
  }
}
function framePainter(t, dt) {
  const ps = painterState, j = job;
  let pose, ik = null, painting = false;
  const phase = j ? j.phase : 'none';
  let tx = PAINTER_HOME.x, tz = PAINTER_HOME.z, yaw = PAINTER_YAW;
  if (party.on) {
    pose = dancePose(painter, t); yaw = 0.35;
  } else if (phase === 'sketch' || phase === 'paint' || phase === 'sign') {
    painting = true;
    pose = painterPose(t);
    // bước nhẹ theo vị trí cọ trên toan
    tx = PAINTER_HOME.x + (j.brushU - 0.5) * 0.28; tz = PAINTER_HOME.z + (j.brushU - 0.5) * 0.1;
    pose.bend = (j.brushV - 0.4) * 0.25;
    if (Math.sin(t * 0.9) > 0.94) yaw = PAINTER_YAW - 0.3;   // thỉnh thoảng liếc nhìn người mẫu
    ps.brushTarget = ps.brushTarget || V3();
    const u = clamp(j.brushU, 0.04, 0.96), v = clamp(j.brushV, 0.04, 0.96);
    const dab = phase === 'paint' ? Math.sin(t * 16) * 0.012 : Math.sin(t * 22) * 0.006;
    canvasPoint(u + dab, v + dab * 0.6, _v2, 0.005);
    ps.brushTarget.lerp(_v2, Math.min(1, dt * (phase === 'sketch' ? 9 : 7)));
    ik = () => {
      const want = ps.brushTarget.clone().addScaledVector(CANVAS_N, 0.19).add(V3(0, -0.08, 0));
      const tgt = want.clone().add(ps.ikOff);
      const out = V3(-1, 0, 0).applyAxisAngle(V3(0, 1, 0), rig.root.rotation.y);
      ikArm(true, tgt, V3(0, -1, 0).addScaledVector(out, 0.7).add(V3(0, 0, 0)));
      ps.ikWant = want;
    };
  } else if (phase === 'reveal') {
    pose = NP(); const k = j.t;
    tx = PAINTER_HOME.x - 0.3; tz = PAINTER_HOME.z + 0.12; yaw = 0.55;
    pose.ru = 0.22; pose.rsx = -0.38; pose.rex = -1.28;
    if (!j.tier) { pose.lu = -0.5; pose.lsx = -0.7; pose.lex = -1.7; pose.lean = 0.07 * Math.sin(t * 15); pose.head = 0.14 * Math.sin(t * 15); pose.bend = 0.12; }   // ôm bụng cười tranh biếm họa
    else if (k < 1.0) { pose.lu = -0.55; pose.lsx = -0.9; pose.lex = -2.2; pose.head = 0.15; }   // tay chống cằm ngắm tranh
    else { pose.lu = -2.4 + Math.sin(t * 9) * 0.3; pose.lf = -0.5; pose.head = -0.1; }      // vẫy tay khoe tranh
  } else if (phase === 'throw') {
    pose = NP(); const k = clamp(j.t / 0.5, 0, 1);
    pose.lu = lerp(-0.5, -2.85, k); pose.ru = lerp(0.5, 2.85, k); pose.lf = -0.2; pose.rf = 0.2; pose.lift = Math.sin(clamp(j.t / 0.7, 0, 1) * PI) * 0.12;
    yaw = 0.7;
  } else if (phase === 'intro') {
    pose = (ps.waveUntil > t) ? wavePose(painter, t) : painterPose(t);
    yaw = PAINTER_YAW - 0.5;
  } else {
    pose = ps.waveUntil > t ? wavePose(painter, t) : idlePose(painter, t);
    if (ps.waveUntil <= t) { pose.ru = 0.22; pose.rsx = -0.38; pose.rex = -1.28; }
    yaw = PAINTER_YAW - 0.35;
  }
  if (ps.waveUntil > t && !party.on && !painting) { pose.lu = -2.55 + Math.sin(t * 11) * 0.35; pose.lf = -0.45; pose.lsx = undefined; pose.lex = undefined; }
  ps.x = lerp(ps.x, tx, Math.min(1, dt * 3)); ps.z = lerp(ps.z, tz, Math.min(1, dt * 3));
  painter.pos.set(ps.x, 0, ps.z);
  painter.yaw += Math.atan2(Math.sin(yaw - painter.yaw), Math.cos(yaw - painter.yaw)) * Math.min(1, dt * 4);
  driveActor(painter, pose, painter.pos.clone(), { ik });
  // cọ + bảng màu bám theo xương bàn tay của mô hình (nếu chưa có mô hình thì theo khung điều khiển)
  const B = painter.av && painter.av.bones;
  const hand = V3(), fore = V3();
  if (B && B.RightHand) { B.RightHand.updateWorldMatrix(true, false); B.RightHand.getWorldPosition(hand); B.RightForeArm.getWorldPosition(fore); }
  else { rig.haL.getWorldPosition(hand); rig.elL.getWorldPosition(fore); }
  // sửa sai lệch giữa tay mô hình và khung điều khiển (tay mô hình ngắn hơn) để đầu cọ chạm đúng toan
  if (painting && ps.ikWant) { const err = ps.ikWant.clone().sub(hand); ps.ikOff.addScaledVector(err, Math.min(1, dt * 4)); if (ps.ikOff.length() > 0.45) ps.ikOff.setLength(0.45); }
  else ps.ikOff.multiplyScalar(Math.max(0, 1 - dt * 2));
  const dir = painting && ps.brushTarget ? ps.brushTarget.clone().sub(hand) : hand.clone().sub(fore).add(V3(0, 0.12, 0));
  if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
  dir.normalize();
  brush.position.copy(hand).addScaledVector(dir, -0.09);
  brush.quaternion.setFromUnitVectors(V3(0, 1, 0), dir);
  brush.visible = palette.visible = !!painter.av;   // mô hình chưa tải xong thì chưa hiện đồ nghề
  const lh = V3();
  if (B && B.LeftHand) { B.LeftHand.updateWorldMatrix(true, false); B.LeftHand.getWorldPosition(lh); } else rig.haR.getWorldPosition(lh);
  palette.position.copy(lh).add(V3(0, 0.02, 0));
  palette.rotation.set(0.75, painter.yaw - 0.4, 0.15, 'YXZ');
}

// ======================================================================
// MÁY QUAY
// ======================================================================
const camPos = CAM_POS.clone(), camLook = CAM_LOOK.clone();
function updateCam(t, dt) {
  const tp = CAM_POS.clone(), tl = CAM_LOOK.clone();
  tp.x += Math.sin(t * 0.17) * 0.12; tp.y += Math.sin(t * 0.23) * 0.05;
  if (revealFx && t - revealFx.t0 < 2.3) {   // đẩy máy vào gần bức tranh khi xong
    const k = Math.sin(clamp((t - revealFx.t0) / 2.3, 0, 1) * PI);
    canvasMesh.getWorldPosition(_v1);
    tp.lerp(_v1.clone().add(V3(-0.2, 0.1, 4.2)), 0.35 * k); tl.lerp(_v1, 0.5 * k);
  }
  if (party.on) { const kick = Math.exp(-(Music ? Music.phase : 0) * 6); tp.y += kick * 0.03; tp.z += Math.sin(t * 0.5) * 0.3; }
  camPos.lerp(tp, Math.min(1, dt * 2.5)); camLook.lerp(tl, Math.min(1, dt * 2.5));
  camera.position.copy(camPos); camera.lookAt(camLook);
}
const _pv = V3();
function project(v) { _pv.copy(v).project(camera); return { x: (_pv.x + 1) / 2 * W, y: (1 - _pv.y) / 2 * H, z: _pv.z }; }
function canvasScreen() { canvasMesh.getWorldPosition(_v1); return project(_v1); }

// ======================================================================
// ÂM THANH GAME (không có MC): bút chì sột soạt, cọ quẹt, vỗ tay, kèn hài, xu rơi…
// tạo bằng Web Audio, không cần tệp âm thanh; âm lượng chỉnh ở trang điều khiển
// ======================================================================
let sfxBus = null, noiseBuf = null;
function sfxCtx() {
  const A = Music && Music.ctx; if (!A || A.state !== 'running') return null;
  if (!sfxBus || sfxBus.context !== A) { sfxBus = A.createGain(); sfxBus.connect(A.destination); }
  sfxBus.gain.value = clamp(Number(S.painterSfx ?? 0.8), 0, 1.5);
  if (!noiseBuf || noiseBuf.sampleRate !== A.sampleRate) { noiseBuf = A.createBuffer(1, A.sampleRate, A.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  return A;
}
function tone(freq, t0, dur, type = 'sine', vol = 0.18, freq2) {
  const A = sfxCtx(); if (!A) return;
  const st = A.currentTime + t0, o = A.createOscillator(), g = A.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, st); if (freq2) o.frequency.exponentialRampToValueAtTime(freq2, st + dur);
  g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(vol, st + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
  o.connect(g); g.connect(sfxBus); o.start(st); o.stop(st + dur + 0.05);
}
function noiseHit(t0, dur, { type = 'bandpass', f = 1000, f2 = 0, q = 1, vol = 0.1, attack = 0.005 } = {}) {
  const A = sfxCtx(); if (!A) return;
  const st = A.currentTime + t0, src = A.createBufferSource(), flt = A.createBiquadFilter(), g = A.createGain();
  src.buffer = noiseBuf; src.loop = true;
  flt.type = type; flt.frequency.setValueAtTime(f, st); if (f2) flt.frequency.exponentialRampToValueAtTime(f2, st + dur); flt.Q.value = q;
  g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(vol, st + attack); g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
  src.connect(flt); flt.connect(g); g.connect(sfxBus); src.start(st, Math.random() * 0.8); src.stop(st + dur + 0.05);
}
let lastBlip = 0;
const sfx = {
  pencil() { noiseHit(0, rand(0.04, 0.08), { f: rand(3200, 5200), q: 2.2, vol: 0.05 }); },
  brush(soft) { noiseHit(0, 0.22, { f: rand(900, 1400), q: 0.8, vol: soft ? 0.04 : 0.065, attack: 0.06 }); },
  marker() { noiseHit(0, 0.09, { f: rand(2000, 2600), q: 4, vol: 0.06 }); tone(rand(850, 1000), 0, 0.06, 'sine', 0.012); },
  pop() { tone(520, 0, 0.14, 'sine', 0.12, 170); },
  whoosh() { noiseHit(0, 0.7, { f: 300, f2: 2600, q: 0.7, vol: 0.12, attack: 0.25 }); },
  coin() { tone(988, 0, 0.08, 'square', 0.045); tone(1319, 0.07, 0.28, 'square', 0.045); },
  blip(f) { const t = now(); if (t - lastBlip < 0.12) return; lastBlip = t; tone(f || rand(700, 1100), 0, 0.07, 'sine', 0.03); },
  tick(k) { tone(600 + k * 500, 0, 0.035, 'square', 0.03); },
  chime(tier) { (tier >= 3 ? [784, 988, 1175, 1568] : [659, 784, 988]).forEach((f, i) => tone(f, i * 0.09, 0.9, 'triangle', 0.13)); },
  horn() { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.07, 0.5, 'sawtooth', 0.05)); },
  win() { [784, 1046, 1318, 1568].forEach((f, i) => tone(f, i * 0.08, 0.5, 'triangle', 0.12)); sfx.applause(1.8, 0.9); },
  applause(dur = 1.6, vol = 1) { for (let i = 0; i < 70 * dur / 1.6; i++) { const t0 = Math.random() * dur, env = Math.sin(clamp(t0 / dur, 0, 1) * PI) * 0.8 + 0.2; noiseHit(t0, 0.03, { type: 'highpass', f: rand(1100, 2000), vol: 0.06 * env * vol, attack: 0.002 }); } },
  drumroll(dur = 1) { const n = Math.floor(dur / 0.04); for (let i = 0; i < n; i++) noiseHit(i * 0.04, 0.05, { f: 1800, q: 0.7, vol: 0.02 + 0.06 * (i / n), attack: 0.002 }); noiseHit(dur, 1.3, { type: 'highpass', f: 5000, vol: 0.11, attack: 0.005 }); },
  sadTrombone() {   // "oa oa oa oaaa" cho tranh biếm họa
    const A = sfxCtx(); if (!A) return;
    [[392, 0, 0.32], [370, 0.36, 0.32], [349, 0.72, 0.32], [330, 1.08, 1.0]].forEach(([f, t0, d], i) => {
      const st = A.currentTime + t0, o = A.createOscillator(), flt = A.createBiquadFilter(), g = A.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f, st); flt.type = 'lowpass'; flt.frequency.value = 1100;
      if (i === 3) { const lfo = A.createOscillator(), lg = A.createGain(); lfo.frequency.value = 6; lg.gain.value = 9; lfo.connect(lg); lg.connect(o.frequency); lfo.start(st); lfo.stop(st + d); o.frequency.linearRampToValueAtTime(f * 0.94, st + d); }
      g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.07, st + 0.04); g.gain.setValueAtTime(0.07, st + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, st + d);
      o.connect(flt); flt.connect(g); g.connect(sfxBus); o.start(st); o.stop(st + d + 0.05);
    });
  },
};
const chime = t => sfx.chime(t), horn = () => sfx.horn();

// ---------- bong bóng lời của họa sĩ (chữ, không đọc thành tiếng) ----------
const short = n => { n = String(n || ''); return n.length > 12 ? n.slice(0, 11) + '…' : n; };
let speech = null;
function bubble(text, dur = 2.2) { speech = { text, t0: now(), until: now() + dur }; }
// thả tim → họa sĩ vẽ nhanh hơn (tối đa ×1.8)
let likeHeat = 0;
const likeSpeed = () => 1 + 0.8 * clamp(likeHeat / 60, 0, 1);

// ======================================================================
// HUD 2D
// ======================================================================
const particles = [];
const qMul = () => S.quality === 'low' ? 0.35 : S.quality === 'medium' ? 0.65 : 1;
function confetti(n) { n = Math.round(n * qMul()); for (let i = 0; i < n; i++) particles.push({ x: rand(0, W), y: rand(-200, 0), vx: rand(-60, 60), vy: rand(160, 380), g: 30, life: 5, max: 5, color: pick(['#ff3d7f', '#ffd84d', '#7cf7ff', '#a3e635', '#c084fc', '#ffffff', '#ff8a3d']), size: rand(9, 17), type: 'confetti', rot: Math.random() * TAU, vr: rand(-8, 8) }); }
function hearts(x, y, n) { for (let i = 0; i < n; i++) particles.push({ x: x + rand(-30, 30), y, vx: rand(-40, 40), vy: rand(-220, -120), g: 0, life: 2.2, max: 2.2, color: pick(['#ff3d7f', '#ff7ab8', '#ff4d6d', '#ffb3c7']), size: rand(18, 30), type: 'heart' }); }
function sparkleAt(sp, n) { if (!sp) return; for (let i = 0; i < n; i++) { const a = rand(0, TAU), v = rand(120, 380); particles.push({ x: sp.x + rand(-60, 60), y: sp.y + rand(-60, 60), vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 80, life: 1.2, max: 1.2, color: pick(['#fff3a3', '#ffffff', '#ffd23f', '#9be7ff']), size: rand(10, 20), type: 'star' }); } }
function drawParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt; if (p.life <= 0 || p.y > H + 60) { particles.splice(i, 1); continue; }
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.rot !== undefined) p.rot += p.vr * dt;
    const a = Math.min(1, p.life / Math.min(1, p.max * 0.4));
    ctx.globalAlpha = a; ctx.fillStyle = p.color;
    if (p.type === 'confetti') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore(); }
    else if (p.type === 'heart') { ctx.font = `${p.size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('❤', p.x, p.y); }
    else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.life * 4); ctx.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? p.size * 0.25 : p.size * 0.6, an = k / 8 * TAU; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.closePath(); ctx.fill(); ctx.restore(); }
  }
  ctx.globalAlpha = 1;
}
function roundRect(x, y, w, h, r) { rr(ctx, x, y, w, h, r); }
function fit(text, maxW) { text = String(text || ''); if (ctx.measureText(text).width <= maxW) return text; while (text.length > 1 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1); return text + '…'; }
function avatarCircle(u, x, y, r, ring) {
  const im = img(u.avatar);
  if (ring) { ctx.fillStyle = ring; ctx.beginPath(); ctx.arc(x, y, r + Math.max(2, r * 0.14), 0, TAU); ctx.fill(); }
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  if (im) ctx.drawImage(im, x - r, y - r, r * 2, r * 2);
  else { ctx.fillStyle = `hsl(${hashHue(u.name)},55%,48%)`; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(r)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(((u.name || '?').trim()[0] || '?').toUpperCase(), x, y + 1); }
  ctx.restore();
}
function hashHue(s) { let h = 0; for (const ch of String(s || '')) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }
function pillText(txt, cx, y, font, bg, fg, stroke) {
  ctx.font = font; const w = ctx.measureText(txt).width + 36;
  ctx.fillStyle = bg; roundRect(cx - w / 2, y, w, 50, 25); ctx.fill();
  if (stroke) { ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.stroke(); }
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, cx, y + 26);
}
const banners = [];   // cảm ơn ở đầu màn
let banner = null;
function pushBanner(b) { banners.push(b); if (banners.length > 25) banners.splice(0, banners.length - 25); }
function drawBanner(t) {
  if ((!banner || t > banner.until) && banners.length) { const b = banners.shift(); const d = banners.length > 4 ? 1.3 : 2.4; banner = Object.assign(b, { t0: t, until: t + d }); }
  if (!banner || t > banner.until) return false;
  const b = banner, k = t - b.t0, out = b.until - t;
  const a = Math.min(1, k / 0.15, out / 0.25), dy = (1 - backOut(Math.min(1, k / 0.35))) * -40;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, dy);
  ctx.font = `800 40px ${FONT}`;
  const name = fit(b.user.name, 300); const nw = ctx.measureText(name).width;
  ctx.font = `700 36px ${FONT}`; const txt = fit(b.text, 900 - nw - 140); const tw = ctx.measureText(txt).width;
  const w = 100 + nw + 18 + tw + 40, x = (W - w) / 2, y = 212, h = 76;
  ctx.fillStyle = 'rgba(60,30,10,0.35)'; roundRect(x + 4, y + 6, w, h, 18); ctx.fill();
  ctx.fillStyle = b.gold ? '#ffe9a3' : '#fff6d8'; roundRect(x, y, w, h, 18); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#3a2410'; ctx.stroke();
  avatarCircle(b.user, x + 46, y + h / 2, 27, b.gold ? '#ffb400' : '#3a2410');
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2a1608'; ctx.font = `800 40px ${FONT}`; ctx.fillText(name, x + 88, y + h / 2 + 1);
  ctx.fillStyle = b.color || '#b0182f'; ctx.font = `700 36px ${FONT}`; ctx.fillText(txt, x + 88 + nw + 18, y + h / 2 + 1);
  ctx.restore();
  return true;
}
const HINTS = ['💬 Bình luận · ❤️ thả tim → vẽ biếm họa 🤪', '🎁 Quà càng lớn → tranh càng giống bạn', '🖌️ Gõ “pop art”, “màu nước”, “neon” chọn kiểu', '⭐ Gõ 1–5 chấm điểm tranh vừa vẽ', '📣 Chia sẻ / follow → chen lên hàng', '🍀 Bình luận để được quay số vẽ tặng', '❓ Gõ “thứ mấy” xem lượt của bạn', '❤️ Thả tim → họa sĩ vẽ nhanh hơn'];
function drawHint(t) {
  const i = Math.floor(t / 4.5) % HINTS.length, k = (t % 4.5) / 4.5, a = Math.min(1, k * 8, (1 - k) * 8);
  ctx.save(); ctx.globalAlpha = 0.92 * a;
  ctx.font = `700 32px ${FONT}`; const txt = HINTS[i], w = ctx.measureText(txt).width + 50, x = (W - w) / 2, y = 222;
  ctx.fillStyle = 'rgba(255,255,255,0.84)'; roundRect(x, y, w, 58, 29); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(58,36,16,0.6)'; ctx.stroke();
  ctx.fillStyle = '#3a2410'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, W / 2, y + 30);
  ctx.restore();
}
function drawMeter(t) {
  const x = 230, y = 146, w = 620, h = 40;
  ctx.save();
  ctx.font = '44px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🎨', x - 38, y + h / 2 + 2);
  ctx.fillStyle = 'rgba(255,255,255,0.88)'; roundRect(x, y, w, h, h / 2); ctx.fill();
  const k = party.on ? clamp((party.until - t) / Math.max(1, party.until - party.t0), 0, 1) : clamp(party.pts / partyGoal(), 0, 1);
  if (k > 0.001) {
    ctx.save(); roundRect(x, y, w, h, h / 2); ctx.clip();
    const gr = ctx.createLinearGradient(x, 0, x + w, 0), off = (t * 0.15) % 1;
    ['#ff3b3b', '#ff9f1c', '#ffe14d', '#4cd964', '#2ec4ff', '#5b6cff', '#c45bff', '#ff3b3b'].forEach((c, i, arr) => gr.addColorStop(((i / (arr.length - 1)) + off) % 1, c));
    ctx.fillStyle = gr; ctx.fillRect(x, y, w * k, h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y + 4, w * k, h * 0.28);
    ctx.restore();
  }
  ctx.lineWidth = 4; ctx.strokeStyle = '#3a2410'; roundRect(x, y, w, h, h / 2); ctx.stroke();
  ctx.fillStyle = '#2a1608'; ctx.font = `800 24px ${FONT}`;
  const label = party.on ? `💃 DANCE PARTY · ${Math.ceil(party.until - t)}s` : `💃 DANCE PARTY  ${Math.floor(party.pts)}/${partyGoal()} ❤`;
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.strokeText(label, x + w / 2, y + h / 2 + 1); ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}
function drawPartyTitle(t) {
  if (party.level < 0.02) return;
  const txt = 'DANCE PARTY!', k = smooth(party.level);
  ctx.save(); ctx.globalAlpha = k;
  ctx.font = `900 96px ${BIG}`; ctx.textBaseline = 'middle';
  const widths = [...txt].map(c => ctx.measureText(c).width), total = widths.reduce((a, b) => a + b, 0);
  let x = (W - total) / 2; const beat = Music ? Music.phase : 0, kick = Math.exp(-beat * 5);
  [...txt].forEach((c, i) => {
    const y = 560 + Math.sin(t * 7 + i * 0.55) * 12 - kick * 8 * (i % 2 ? 1 : -1);
    const s = 1 + 0.06 * kick;
    ctx.save(); ctx.translate(x + widths[i] / 2, y); ctx.scale(s, s); ctx.rotate(Math.sin(t * 5 + i) * 0.06);
    ctx.lineWidth = 16; ctx.strokeStyle = '#1a0a2a'; ctx.strokeText(c, -widths[i] / 2, 0);
    ctx.lineWidth = 7; ctx.strokeStyle = '#ffffff'; ctx.strokeText(c, -widths[i] / 2, 0);
    ctx.fillStyle = `hsl(${(t * 220 + i * 32) % 360},95%,58%)`; ctx.fillText(c, -widths[i] / 2, 0);
    ctx.restore();
    x += widths[i];
  });
  if (party.on) pillText('🎁 Tặng quà lúc này → tranh lên 1 hạng!', W / 2, 640, `800 30px ${FONT}`, 'rgba(26,10,42,0.82)', '#ffe27a', '#ffffff');
  ctx.restore();
}
function drawSpeech(t) {
  if (!speech || t > speech.until || !painter._sp) return;
  const k = t - speech.t0, a = Math.min(1, k / 0.12, (speech.until - t) / 0.25), s = backOut(Math.min(1, k / 0.25));
  const sp = painter._sp;
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = `700 38px ${HAND}`;
  const w = Math.max(160, ctx.measureText(speech.text).width + 54), h = 74;
  const cx = clamp(sp.x - 30, w / 2 + 20, W - w / 2 - 20), cy = sp.y - 110;
  ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#2a1608'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sp.x - cx - 10, h / 2 - 6); ctx.lineTo(sp.x - cx + 2, h / 2 + 34); ctx.lineTo(sp.x - cx + 20, h / 2 - 8); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(sp.x - cx - 10, h / 2 - 2); ctx.lineTo(sp.x - cx + 2, h / 2 + 34); ctx.lineTo(sp.x - cx + 20, h / 2 - 4); ctx.stroke();
  ctx.fillStyle = '#2a1608'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(speech.text, 0, 2);
  ctx.restore();
}
function tierRing(c) { const t = tierOf(c); return t >= 4 ? '#ff4d4d' : t >= 3 ? '#ffc400' : t >= 2 ? '#c9d3e0' : t >= 1 ? '#ff6fa3' : '#ffffff'; }
function drawPeopleTags(t) {
  // hàng chờ: ảnh đại diện + số thứ tự trên đầu, xa trước gần sau
  const list = queue.slice(0, VIS).map((p, i) => [p, i]).filter(([p]) => p.bodied && p._sp && p._sp.z < 1).sort((a, b) => a[0]._sp.y - b[0]._sp.y);
  for (const [p, i] of list) {
    const sp = p._sp, r = clamp(34 - i * 2.4, 16, 34), y = sp.y - r - 6;
    const ring = p.lucky ? '#3ddc84' : p.coins > 0 ? tierRing(p.coins) : 'rgba(255,255,255,0.95)';
    if (i === 0) { ctx.save(); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 6); ctx.fillStyle = '#fff3a3'; ctx.beginPath(); ctx.arc(sp.x, y, r + 12, 0, TAU); ctx.fill(); ctx.restore(); }
    avatarCircle(p, sp.x, y, r, ring);
    // số thứ tự
    const br = Math.max(11, r * 0.42);
    ctx.fillStyle = i === 0 ? '#ff3d7f' : '#3a2410'; ctx.beginPath(); ctx.arc(sp.x - r * 0.85, y - r * 0.7, br, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(br * 1.1)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), sp.x - r * 0.85, y - r * 0.7 + 1);
    const badge = p.lucky ? '🍀 vẽ tặng' : p.coins > 0 ? '🎁' + p.coins : '';
    if (badge) { ctx.font = `800 ${Math.round(r * 0.62)}px ${FONT}`; const lw = ctx.measureText(badge).width + 12; ctx.fillStyle = 'rgba(42,22,8,0.85)'; roundRect(sp.x - lw / 2, y + r + 2, lw, r * 0.8, r * 0.4); ctx.fill(); ctx.fillStyle = p.lucky ? '#a7f3c0' : '#ffe27a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(badge, sp.x, y + r + 2 + r * 0.42); }
    if (i < 3) { ctx.font = `700 ${Math.round(r * 0.62)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; const n = (i === 0 ? '⏭ ' : '') + fit(p.name, 170); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(42,22,8,0.75)'; ctx.strokeText(n, sp.x, y - r - 4); ctx.fillStyle = i === 0 ? '#fff3a3' : '#fff'; ctx.fillText(n, sp.x, y - r - 4); }
    if (p.commentUntil > t && p.comment) {
      ctx.font = `600 24px ${FONT}`; const c = fit(p.comment, 220), cw = ctx.measureText(c).width + 24;
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; roundRect(sp.x - cw / 2, y - r - 70, cw, 36, 12); ctx.fill();
      ctx.fillStyle = '#2a1608'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c, sp.x, y - r - 52);
    }
  }
  // +N người chờ phía sau
  if (queue.length) {
    const extra = queue.length - Math.min(VIS, queue.length);
    const back = queue[Math.min(VIS, queue.length) - 1];
    const sp = back && back._sp ? back._sp : project(queueSlot(Math.min(VIS, queue.length) - 1).add(V3(0, 1.9, 0)));
    const lbl = extra > 0 ? `+${extra}` : `${queue.length} chờ`;
    ctx.font = `800 30px ${FONT}`; const w = ctx.measureText(lbl).width + 26;
    const x = clamp(sp.x - 70, 14, W - w - 14), y = clamp(sp.y - 92, 300, H);
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; roundRect(x, y, w, 44, 22); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#3a2410'; ctx.stroke();
    ctx.fillStyle = '#3a2410'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lbl, x + w / 2, y + 23);
  }
  // người mẫu
  if (sitter && sitter.bodied && sitter._sp) {
    const r = 40, sx = clamp(sitter._sp.x, 130, W - 130), y = sitter._sp.y - r - 12;
    avatarCircle(sitter, sx, y, r, tierRing(sitter.paintCoins || 0));
    ctx.font = `800 28px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const n = '🎨 ' + fit(sitter.name, 200); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(42,22,8,0.8)'; ctx.strokeText(n, sx, y - r - 6); ctx.fillStyle = '#fff'; ctx.fillText(n, sx, y - r - 6);
  }
}
function drawJobProgress(t) {
  if (!job || job.phase === 'throw') return;
  const cs = canvasScreen();
  canvasPoint(0.5, 0.0, _v1, 0); const top = project(_v1);
  const j = job;
  let label, k;
  const total = j.strokes ? j.strokes.colorCost : 1;
  if (j.phase === 'intro') { label = j.tier ? '🪑 Mời ngồi…' : '🪑 Vẽ biếm họa…'; k = 0; }
  else if (j.phase === 'sketch') { label = j.tier ? '✏️ Phác thảo' : '🖊️ Đi nét'; k = 0.35 * j.si / Math.max(1, j.strokes.sketch.length); }
  else if (j.phase === 'paint') { label = j.ci >= j.strokes.color.length && j.strokes.glaze ? '✨ Láng màu giống ảnh' : j.tier ? '🖌️ Tô màu' : '🖍️ Tô màu'; k = 0.35 + 0.6 * clamp(j.pc / total, 0, 1) * (j.strokes.glaze ? 0.8 : 1) + (j.strokes.glaze ? 0.12 * j.glazeK : 0); }
  else if (j.phase === 'sign') { label = j.tier ? '✍️ Ký tên' : '😜 Thêm chút “gia vị”'; k = 0.99; }
  else { label = TIER_ICON[j.tier] + ' ' + TIER_NAME[j.tier]; k = 1; }
  const w = 320, x = clamp(cs.x - w / 2, 20, W - w - 20), y = top.y - 62;
  ctx.save();
  ctx.fillStyle = 'rgba(42,22,8,0.78)'; roundRect(x, y, w, 46, 23); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; roundRect(x + 6, y + 32, w - 12, 8, 4); ctx.fill();
  if (k > 0) { ctx.fillStyle = j.tier >= 3 ? '#ffd23f' : j.tier ? '#7cf7ff' : '#ff9ecb'; roundRect(x + 6, y + 32, (w - 12) * clamp(k, 0, 1), 8, 4); ctx.fill(); }
  ctx.fillStyle = '#fff'; ctx.font = `700 22px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + w / 2, y + 17);
  const spd = likeSpeed();
  if (spd > 1.05 && j.phase !== 'reveal') { ctx.font = `800 22px ${FONT}`; const s = `⚡×${spd.toFixed(1)} nhờ ❤️`, sw = ctx.measureText(s).width + 20; ctx.fillStyle = 'rgba(255,61,127,0.9)'; roundRect(x + w - sw, y - 34, sw, 30, 15); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(s, x + w - sw / 2, y - 18); }
  ctx.restore();
}
function drawReveal(t) {
  if (!revealFx) return;
  const k = t - revealFx.t0; if (k > 3) return;
  const a = Math.min(1, k / 0.2, (3 - k) / 0.4), s = backOut(Math.min(1, k / 0.35));
  const cs = canvasScreen();
  ctx.save(); ctx.globalAlpha = a; ctx.translate(clamp(cs.x, 300, W - 300), clamp(cs.y - 400, 330, H)); ctx.scale(s, s);
  const gold = revealFx.tier >= 3;
  const txt = revealFx.caric ? `🤪 Biếm họa ${fit(revealFx.name, 280)}` : gold ? `👑 ${revealFx.tier >= 4 ? 'Kiệt tác' : 'Chân dung'} ${fit(revealFx.name, 280)}` : `🎨 Tranh của ${fit(revealFx.name, 300)}`;
  ctx.font = `800 40px ${FONT}`; const w = ctx.measureText(txt).width + 60;
  ctx.fillStyle = gold ? '#ffcf3a' : revealFx.caric ? '#ffd1e8' : '#ffffff'; roundRect(-w / 2, -36, w, 72, 36); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#2a1608'; ctx.stroke();
  ctx.fillStyle = '#2a1608'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, 0, 2);
  if (revealFx.caric) { ctx.font = `700 26px ${FONT}`; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 6; ctx.strokeStyle = '#2a1608'; const sub = '🎁 Tặng quà để được vẽ bản giống thật!'; ctx.strokeText(sub, 0, 64); ctx.fillText(sub, 0, 64); }
  ctx.restore();
}
function drawVote(t) {
  if (!vote) return;
  const left = Math.ceil(vote.until - t), avg = vote.n ? (vote.sum / vote.n).toFixed(1) : '–';
  const txt = `⭐ Chấm tranh ${fit(vote.name, 200)}: gõ 1–5 · ${avg}${vote.n ? ` (${vote.n})` : ''} · ${left}s`;
  ctx.save(); ctx.globalAlpha = Math.min(1, (t - vote.t0) / 0.3, (vote.until - t) / 0.3);
  pillText(txt, W / 2, 594, `800 27px ${FONT}`, 'rgba(255,248,214,0.95)', '#3a2410', '#3a2410');
  ctx.restore();
}
function drawLucky(t) {
  const s = lucky.spin; if (!s) return;
  const k = (t - s.t0) / s.dur, a = Math.min(1, (t - s.t0) / 0.25, k > 1.2 ? (1.45 - k) / 0.25 : 1);
  const p = s.pool[Math.max(0, s.idx)] || s.winner, win = s.done;
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
  const x = W / 2 - 280, y = 700, w = 560, h = 300;
  ctx.fillStyle = 'rgba(20,60,30,0.9)'; roundRect(x, y, w, h, 30); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = win ? '#ffe27a' : '#7ee2a0'; ctx.stroke();
  ctx.fillStyle = '#c8ffd8'; ctx.font = `900 40px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🍀 VẼ TẶNG MAY MẮN 🍀', W / 2, y + 48);
  const pop = win ? 1 + 0.1 * Math.sin((t - s.t0) * 12) : 1;
  avatarCircle(p, W / 2, y + 150, 62 * pop, win ? '#ffe27a' : '#ffffff');
  ctx.fillStyle = win ? '#ffe27a' : '#ffffff'; ctx.font = `800 38px ${FONT}`; ctx.fillText(fit(p.name, 480), W / 2, y + 252);
  ctx.restore();
}
// bảng thông tin xoay vòng bên phải: cách chơi · bảng vàng · sắp tới lượt · may mắn + tranh đẹp nhất
function drawBoard(t) {
  if (S.painterLegend === false) return;
  const pages = ['how'];
  if (queue.length) pages.push('next');
  if (TOP.length) pages.push('top');
  if (luckyEvery() > 0 || best) pages.push('extra');
  const per = 6.5, pi = Math.floor(t / per) % pages.length, page = pages[pi], kk = (t % per) / per, a = Math.min(1, kk * 10, (1 - kk) * 10);
  const x = W - 336, y = 1290, w = 320, h = 318;
  ctx.save();
  ctx.fillStyle = 'rgba(42,22,8,0.66)'; roundRect(x, y, w, h, 18); ctx.fill();
  for (let i = 0; i < pages.length; i++) { ctx.fillStyle = i === pi ? '#ffe9a3' : 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(x + w / 2 + (i - (pages.length - 1) / 2) * 16, y + h - 14, 4, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const title = s => { ctx.fillStyle = '#ffe9a3'; ctx.font = `800 24px ${FONT}`; ctx.fillText(s, x + 16, y + 28); };
  if (page === 'how') {
    title('🎨 Cách chơi');
    const rows = [['💬', 'Bình luận / ❤️ tim', 'biếm họa 🤪'], ['🌹', '1 xu', 'vẽ nhanh'], ['💎', '30 xu', 'sơn dầu'], ['👑', `${S.tierNoble || 99} xu`, 'chân dung vàng'], ['🏆', `${S.tierKing || 299} xu`, 'giống y ảnh'], ['🖌️', 'pop art · màu nước · neon', ''], ['📣', 'Chia sẻ / follow', 'chen hàng']];
    rows.forEach(([ic, aa, bb], i) => { const yy = y + 64 + i * 33; ctx.font = `22px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(ic, x + 14, yy); ctx.font = `700 19px ${FONT}`; ctx.fillText(aa, x + 48, yy); if (bb) { ctx.fillStyle = '#ffd9a8'; ctx.font = `600 19px ${FONT}`; ctx.fillText('→ ' + bb, x + 48 + ctx.measureText(aa).width + 6, yy); } });
  } else if (page === 'next') {
    title('⏳ Sắp tới lượt');
    queue.slice(0, 5).forEach((p, i) => { const yy = y + 72 + i * 42; avatarCircle(p, x + 50, yy, 16, p.lucky ? '#3ddc84' : p.coins ? tierRing(p.coins) : null); ctx.fillStyle = '#ffe9a3'; ctx.font = `800 20px ${FONT}`; ctx.fillText('#' + (i + 1), x + 12, yy); ctx.fillStyle = '#fff'; ctx.font = `700 20px ${FONT}`; ctx.fillText(fit(p.name, 150), x + 74, yy); ctx.fillStyle = '#ffd9a8'; ctx.font = `600 18px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText(p.lucky ? '🍀' : TIER_ICON[Math.min(4, tierOf(p.coins) + (p.tierBonus || 0))], x + w - 14, yy); ctx.textAlign = 'left'; });
    ctx.fillStyle = '#ffd9a8'; ctx.font = `600 18px ${FONT}`; ctx.fillText(`Gõ “thứ mấy” · ${queue.length} người chờ`, x + 16, y + h - 40);
  } else if (page === 'top') {
    title('🏆 Bảng vàng đêm nay');
    TOP.slice(0, 3).forEach((u, i) => { const yy = y + 84 + i * 62; ctx.font = `28px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(['🥇', '🥈', '🥉'][i], x + 12, yy); avatarCircle(u, x + 76, yy, 22, ['#ffd23f', '#d6dde8', '#d9925a'][i]); ctx.font = `700 21px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(fit(u.name, 140), x + 108, yy - 10); ctx.fillStyle = '#ffe27a'; ctx.font = `700 18px ${FONT}`; ctx.fillText(`💎 ${u.coins} xu`, x + 108, yy + 14); });
  } else {
    title('🍀 Vẽ tặng may mắn');
    ctx.fillStyle = '#fff'; ctx.font = `700 21px ${FONT}`;
    if (luckyEvery() > 0) { const left = Math.max(0, Math.ceil(lucky.next - t)); ctx.fillText(lucky.spin ? 'Đang quay số…' : `Quay số sau ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`, x + 16, y + 66); ctx.fillStyle = '#ffd9a8'; ctx.font = `600 18px ${FONT}`; ctx.fillText('Bình luận để có tên trong vòng quay', x + 16, y + 96); }
    ctx.fillStyle = '#ffe9a3'; ctx.font = `800 22px ${FONT}`; ctx.fillText('🏅 Tranh đẹp nhất đêm', x + 16, y + 140);
    if (best) { ctx.drawImage(best.thumb, x + 16, y + 160, 110, 110); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4; ctx.strokeRect(x + 16, y + 160, 110, 110); ctx.fillStyle = '#fff'; ctx.font = `700 21px ${FONT}`; ctx.fillText(fit(best.name, 160), x + 140, y + 195); ctx.fillStyle = '#ffe27a'; ctx.fillText(`⭐ ${best.score.toFixed(1)} (${best.n} phiếu)`, x + 140, y + 228); }
    else { ctx.fillStyle = '#ffd9a8'; ctx.font = `600 18px ${FONT}`; ctx.fillText('Gõ 1–5 sau mỗi bức để chấm điểm', x + 16, y + 176); }
  }
  ctx.restore();
}
function drawHUD(t, dt) {
  drawPeopleTags(t);
  drawJobProgress(t);
  drawSpeech(t);
  drawMeter(t);
  if (!drawBanner(t)) drawHint(t);
  drawVote(t);
  drawReveal(t);
  drawPartyTitle(t);
  drawBoard(t);
  drawLucky(t);
  drawParticles(dt);
}

// ======================================================================
// SỰ KIỆN TIKTOK
// ======================================================================
let lastLikeBanner = 0, lastGreet = 0;
const POS_RE = /\b(thu may|vi tri|so may|toi thu may|bao gio toi|tm)\b/;
const VOTE_RE = /^\s*([1-5])\s*(sao|diem|d|\*|⭐|★)?\s*$/i;
function greet(p) {
  if (p.greeted) return; p.greeted = true;
  const t = now();
  if (t - lastGreet < 3.5 || (speech && t < speech.until)) return;
  lastGreet = t; bubble(`Chào ${short(p.name)}! 👋`, 1.8);
}
function onGift(ev) {
  const p = ensurePerson(ev.user);
  const value = Math.max(0, Number(ev.value) || 0);
  const bonus = party.on ? 1 : 0;   // quà trong lúc Dance party được nâng 1 hạng tranh
  p.total += value;
  if (p === sitter && job) upgradeJob(job, value, bonus);
  else { p.coins += value; if (bonus) p.tierBonus = 1; if (!queue.includes(p)) enqueue(p, false); else sortQueue(); if (p.bodied) p.jumpT = now(); }
  const gname = ev.gift && ev.gift.name ? ev.gift.name : 'quà';
  pushBanner({ user: p, text: `Cảm ơn ${ev.count > 1 ? gname + ' ×' + ev.count : gname}!${bonus ? ' ⬆️ +1 hạng' : ''} ✨`, gold: value >= (Number(S.tierNoble) || 99), color: '#b0182f' });
  if (!party.on) painterState.waveUntil = now() + 1.6;
  bubble(pick(['Cảm ơn nhé!', 'Cảm ơn bạn!', 'Tuyệt quá!', 'Yêu bạn ❤', 'Hảo hạng!']), 1.8);
  sfx.coin();
  hearts(W - 120, H - 520, Math.min(12, 2 + Math.round(Math.sqrt(value))));
  if (value >= (Number(S.tierNoble) || 99)) confetti(60);
  addParty(value * 5);
}
function onChat(ev) {
  const p = ensurePerson(ev.user);
  const text = String(ev.text || ''), tx = window.normText ? normText(text) : text.toLowerCase();
  // chấm điểm tranh vừa vẽ
  const vm = text.match(VOTE_RE);
  if (vm && castVote(p, Number(vm[1]))) { p.comment = '⭐'.repeat(Number(vm[1])); p.commentUntil = now() + 3; }
  // chọn kiểu tranh
  const art = ART_KEYS.find(([k]) => tx.includes(k));
  if (art) {
    p.artStyle = art[1];
    if (job && job.p === p && job.tier && job.phase === 'intro' && !job.strokes) job.style = art[1], drawPlate(p.name, plateSub(job));
    bubble(`${short(p.name)}: ${ART[art[1]].name} nha! 🖌️`, 2.2);
  }
  const joined = enqueue(p, true);
  if (joined) greet(p);
  // hỏi lượt
  if (POS_RE.test(tx)) {
    if (p === sitter) bubble(`Đang vẽ ${short(p.name)} nè! 🎨`, 2.4);
    else { const pos = queue.indexOf(p) + 1; bubble(pos > 0 ? `${short(p.name)}: thứ #${pos} ⏳ ${waitText(pos)}` : `${short(p.name)}: vừa vẽ xong, tặng quà để vẽ tiếp nha!`, 3); }
  } else if (!joined && !queue.includes(p) && p !== sitter && !p.coins && !canFree(p) && !p.toldCooldown) {
    p.toldCooldown = true; bubble(`${short(p.name)} vừa được vẽ rồi, tặng quà để vẽ tiếp nha!`, 2.6);
  }
  if (text && !vm) { p.comment = text; p.commentUntil = now() + 4; }
  if (p.bodied && (joined || Math.random() < 0.6)) p.waveUntil = now() + 1.4;
  if (p === sitter) p.waveUntil = now() + 1.2;
}
function onLike(ev) {
  const n = Math.max(1, Number(ev.count) || 1);
  addParty(n);
  likeHeat = Math.min(200, likeHeat + n);
  if (ev.user && ev.user.id) { const p = ensurePerson(ev.user); if (enqueue(p, true)) greet(p); }
  if (Math.random() < 0.5) hearts(W - 110 + rand(-20, 20), H - 460, 1);
  sfx.blip();
  const t = now();
  if (t - lastLikeBanner > 2.5 && banners.length < 2 && ev.user) { lastLikeBanner = t; pushBanner({ user: ev.user, text: `❤ ×${n}`, color: '#e0245e' }); }
}
function onBoost(ev, pts, text, add) {   // chia sẻ / follow: chen lên trước những người bình luận
  const p = ensurePerson(ev.user);
  p.bonus = (p.bonus || 0) + add;
  if (!enqueue(p, false)) sortQueue();
  pushBanner({ user: ev.user, text, color: '#1f7a3a' });
  addParty(pts); sfx.coin();
}
function handleEv(ev) {
  try {
    switch (ev.type) {
      case 'chat': onChat(ev); break;
      case 'gift': onGift(ev); break;
      case 'like': onLike(ev); break;
      case 'follow': onBoost(ev, 20, 'đã follow 💖 · chen lên hàng!', 2); bubble('Cảm ơn follow nha!', 2); break;
      case 'share': onBoost(ev, 15, 'đã chia sẻ 📣 · chen lên hàng!', 3); break;
    }
  } catch (e) { console.error(e); }
}
socket.on('ev', handleEv);
socket.on('connect', () => socket.emit('hello', 'game', { obs: OBS, mode: 'painter' }));
socket.on('primary', v => { isPrimary = !!v; });
socket.on('cmd', c => {
  if (!c) return;
  if (c.type === 'reload') location.reload();
  if (c.type === 'painterParty' || c.type === 'fire') startParty();
  if (c.type === 'painterLucky') lucky.next = now();
  if (c.type === 'painterSkip' || c.type === 'endZoom') {
    const j = job;
    if (j && ['intro', 'sketch', 'paint', 'sign'].includes(j.phase)) {
      prepareJob(j);
      for (const s of j.strokes.sketch.slice(j.si)) drawStroke(s);
      for (const s of j.strokes.color.slice(j.ci)) drawStroke(s);
      j.si = j.sk = j.strokes.sketch.length; j.ci = j.strokes.color.length; j.pc = j.strokes.colorCost;
      if (j.strokes.glaze && j.glazeK < 1) { j.glazeK = 1; glazeStep(j, 1); finishTexture(j); }
      paintTex.needsUpdate = true; j.phase = 'sign'; j.t = 0;
    }
  }
  if (c.type === 'painterClear' || c.type === 'clear') { for (const p of [...queue]) leaveQueue(p); }
});
socket.on('settings', s => {
  const oldQ = S.quality; S = Object.assign(S, s);
  setOutfitMix(S.partyMix ?? 25);
  if (Music) Music.setSettings(S);
  if (oldQ !== S.quality) resize();
  if (S.painterName) painter.name = S.painterName;
  if (ROSTER.length || !S.painterChar) setPainterChar(S.painterChar || 'char08');
});
socket.on('roster', list => { ROSTER = Array.isArray(list) ? list : []; painter.charReady = false; setPainterChar(S.painterChar || 'char08'); });
socket.on('music', list => Music && Music.setPlaylist(list));
socket.on('top', list => { TOP = list || []; });
async function applyModels(list) {
  await loadAvatars((list || []).filter(m => m.enabled).map(m => ({ url: m.url, female: m.female })));
  for (const a of [painter, ...people.values()]) { if (a.av) { disposeAvatar(a.av); a.av = null; } if (a.char) a.avT = templateForChar(a.char.id) || null; }
  painter.charReady = false; setPainterChar(S.painterChar || 'char08');
  console.log('Đã nạp', avatarTemplates.length, 'mô hình người');
}
fetch('/api/models').then(r => r.json()).then(applyModels).catch(e => console.warn(e));
socket.on('models', list => applyModels(list));

// ======================================================================
// VÒNG LẶP
// ======================================================================
let pxScale = 1;
function resize() {
  const ww = window.innerWidth, wh = window.innerHeight;
  const view = Math.min(ww / W, wh / H);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const q = S.quality === 'low' ? 0.55 : S.quality === 'medium' ? 0.75 : 1;
  pxScale = Math.min(view * dpr, 1) * q;
  const cw = Math.round(W * view) + 'px', ch = Math.round(H * view) + 'px';
  for (const c of [glCanvas, hud]) { c.style.width = cw; c.style.height = ch; }
  const rw = Math.round(W * pxScale), rh = Math.round(H * pxScale);
  renderer.setSize(rw, rh, false);
  hud.width = rw; hud.height = rh;
  if (S.quality === 'high') { if (!composer) setupComposer(); composer.setSize(rw, rh); }
}
window.addEventListener('resize', resize);
resize();

// chụp mặt nhân vật 3D (không có ảnh đại diện) → làm mẫu vẽ
const snapCam = new THREE.PerspectiveCamera(30, W / H, 0.05, 60);
const snapCanvas = document.createElement('canvas'); snapCanvas.width = snapCanvas.height = AN;
function doSnapshots() {
  while (snapReq.length) {
    const j = snapReq.shift();
    if (job !== j || !j.p.av) { j.snapDone = true; continue; }
    try {
      const B = j.p.av.bones; const hp = V3();
      (B.Head || B.Neck).getWorldPosition(hp); hp.y += 0.06;
      const yaw = j.p.yaw, f = V3(Math.sin(yaw), 0, Math.cos(yaw));
      snapCam.position.copy(hp).addScaledVector(f, 1.05).add(V3(0, 0.02, 0)); snapCam.lookAt(hp.clone().add(V3(0, -0.05, 0)));
      const vis = brush.visible; brush.visible = false; palette.visible = false;
      renderer.render(scene, snapCam);
      brush.visible = palette.visible = vis;
      const cw = glCanvas.width, chh = glCanvas.height, s = cw;
      const g = snapCanvas.getContext('2d'); g.drawImage(glCanvas, 0, (chh - s) / 2, s, s, 0, 0, AN, AN);
      j.src = squareFrom(snapCanvas);
      const keep = document.createElement('canvas'); keep.width = keep.height = AN; keep.getContext('2d').drawImage(snapCanvas, 0, 0); j.srcImg = keep;
    } catch (e) { console.warn('chụp nhân vật', e); }
    j.snapDone = true;
  }
}

let lastT = now(), fps = 60;
const DT_MAX = params.has('test') ? 0.6 : 0.1;   // ?test: máy chạy thử không có card đồ hoạ (khung hình thưa) vẫn chạy đúng nhịp thời gian
function frame() {
  const t = now(), dt = Math.min(DT_MAX, t - lastT); lastT = t;
  fps = fps * 0.95 + (1 / Math.max(0.001, dt)) * 0.05;
  if (Music) Music.update();
  updateParty(t, dt);
  likeHeat *= Math.exp(-dt * 0.35);
  updateLucky(t); updateVote(t);
  updateJob(t, dt);
  updatePeople(t, dt);
  frameActors(t, dt);
  updateGallery(t, dt);
  // lắc lư: đèn lồng, bóng bay, toan mới bật lên
  for (const s of swingers) s.rotation.z = Math.sin(t * 1.4 + s.userData.sw) * 0.07;
  for (const b of balloons) { b.b.position.y = b.y0 + Math.sin(t * 1.2 + b.ph) * 0.06; b.b.rotation.z = Math.sin(t * 0.9 + b.ph) * 0.08; }
  const pk = clamp((t - canvasPop) / 0.45, 0, 1); canvasMesh.scale.set(1, pk < 1 ? backOut(pk) : 1, 1);
  costumeTime.value = t; outfitTime.value = t;
  updateCam(t, dt);
  if (snapReq.length) doSnapshots();
  if (S.quality === 'high' && composer) composer.render(); else renderer.render(scene, camera);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, hud.width, hud.height);
  ctx.setTransform(pxScale, 0, 0, pxScale, 0, 0);
  drawHUD(t, dt);
  requestAnimationFrame(frame);
}
setInterval(() => socket.emit('status', { onFloor: queue.length + (sitter ? 1 : 0), zooming: sitter ? '🎨 ' + sitter.name : '—', queue: queue.length, fps: Math.round(fps), painted }), 2000);

// khởi động
paperBg('canvas'); drawPlate(S.painterName, '');
if (Music) { Music.init(); Music.setDuck(0.62); }
const tap = document.getElementById('tap');
function checkAudio() { tap.style.display = Music && Music.suspended() && !OBS && (Music.settings.musicEnabled || Music.settings.synthMusic) ? 'flex' : 'none'; }
const unlock = () => { if (!Music) return; Music.init(); Music.resume(); setTimeout(checkAudio, 200); };
window.addEventListener('pointerdown', unlock);
setInterval(checkAudio, 1500);
window._painter = { queue, people, party, lucky, gallery, get job() { return job; }, get vote() { return vote; }, get best() { return best; }, startParty, camera, scene, inject: handleEv };   // chỉ dùng khi thử nghiệm
requestAnimationFrame(frame);
