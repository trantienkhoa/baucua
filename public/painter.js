// Họa Sĩ Neon — game TikTok LIVE: họa sĩ 3D vẽ chân dung người xem ngay trên phố (Three.js, 1080×1920)
// Dùng chung máy chủ, kết nối TikTok, nhân vật 3D (roster charXX), điệu nhảy, nhạc và MC giọng nói của Vũ Trường Neon.
//  - Bình luận → xếp hàng chờ vẽ.  Tặng quà → được ưu tiên, vẽ màu (quà càng lớn khung càng xịn).
//  - Thả tim / quà / follow → đầy thanh cầu vồng → DANCE PARTY: cả phố nhảy, đèn disco, trời chuyển đêm.
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
  quality: 'high', stylesEnabled: true, styleRate: 85, fusedArm: 80, idleSeconds: 420, rosterEnabled: true,
  ttsEnabled: true, ttsWhere: 'game', ttsVoice: '', ttsVolume: 1, ttsRate: 1.05, ttsMinCoins: 1, ttsFollow: true,
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
function noise(g, w, h, n, a, dark = true) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${dark ? '0,0,0' : '255,255,255'},${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, rand(1, 3), rand(1, 3)); } }

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
  noise(g, w, h, 5000, 0.08); noise(g, w, h, 2000, 0.08, false);
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
    noise(g, w, h, 2500, 0.06);
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
    noise(g, w, h - 30, 400, 0.06);
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
  p.lastActive = now();
  return p;
}
function enqueue(p) {
  if (p === sitter || queue.includes(p)) return false;
  const wi = walkers.indexOf(p); if (wi >= 0) { walkers.splice(wi, 1); }
  p.order = seq++; p.joinT = now();
  queue.push(p);
  const max = clamp(Number(S.painterQueueMax) || 300, 20, 2000);
  if (queue.length > max) { const i = queue.findIndex(x => !x.coins && x !== queue[0]); if (i >= 0) { const [x] = queue.splice(i, 1); leaveQueue(x); } }
  sortQueue();
  return true;
}
function sortQueue() { queue.sort((a, b) => (b.coins - a.coins) || (a.order - b.order)); }
function leaveQueue(p) {
  const i = queue.indexOf(p); if (i >= 0) queue.splice(i, 1);
  if (p.bodied) { p.target = V3(-3.6, 0, p.pos.z - 0.5); p.leaveAt = now(); walkers.push(p); }
}

// ======================================================================
// VẼ CHÂN DUNG: phác thảo bút chì → tô màu từng nét cọ → ký tên
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
function placeholderSource(name) {
  wg.fillStyle = `hsl(${rand(0, 360)},55%,78%)`; wg.fillRect(0, 0, AN, AN);
  wg.fillStyle = '#e7b48f'; wg.beginPath(); wg.ellipse(128, 112, 56, 68, 0, 0, TAU); wg.fill();
  wg.fillStyle = '#2a1a12'; wg.beginPath(); wg.ellipse(128, 70, 64, 40, 0, PI, TAU); wg.fill();
  wg.fillStyle = `hsl(${rand(0, 360)},60%,45%)`; wg.beginPath(); wg.ellipse(128, 250, 110, 80, 0, PI, TAU); wg.fill();
  wg.fillStyle = '#2a1a12'; wg.beginPath(); wg.arc(106, 112, 6, 0, TAU); wg.arc(150, 112, 6, 0, TAU); wg.fill();
  wg.strokeStyle = '#a0522d'; wg.lineWidth = 4; wg.beginPath(); wg.arc(128, 134, 18, 0.2, PI - 0.2); wg.stroke();
  return wg.getImageData(0, 0, AN, AN).data;
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
  return { data, L: Ln, gx, gy, mag, p70: q(0.7), p80: q(0.8), p95: Math.max(q(0.95), 0.02) };
}
function colorAt(A, x, y) {
  x = clamp(Math.round(x), 1, AN - 2); y = clamp(Math.round(y), 1, AN - 2);
  let r = 0, g = 0, b = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const i = ((y + dy) * AN + x + dx) * 4; r += A.data[i]; g += A.data[i + 1]; b += A.data[i + 2]; }
  r /= 9; g /= 9; b /= 9;
  // tươi + ấm hơn một chút cho ra chất tranh sơn dầu
  const m = (r + g + b) / 3, sat = 1.22;
  r = m + (r - m) * sat + 6; g = m + (g - m) * sat + 2; b = m + (b - m) * sat - 4;
  const ct = v => clamp((v - 128) * 1.07 + 128, 0, 255);
  return [ct(r), ct(g), ct(b)];
}
function buildStrokes(A, tier) {
  const K = PAINT_PX / AN;
  const full = tier >= 3;
  const sketch = [], color = [];
  const keep = (x, y, extra) => { if (full) return true; const r = Math.hypot(x - AN / 2, (y - AN / 2) * 0.92) / (AN / 2); return r < 0.8 + extra + (Math.random() - 0.5) * 0.16; };
  // phác thảo: nét viền theo cạnh ảnh
  const occ = new Uint8Array((AN / 3 | 0) * (AN / 3 | 0) + 100);
  const contours = [];
  for (let tries = 0; tries < 30000 && contours.length < 1900; tries++) {
    const x = 2 + Math.random() * (AN - 4), y = 2 + Math.random() * (AN - 4), i = (y | 0) * AN + (x | 0);
    const m = A.mag[i]; if (m < A.p70) continue;
    const oc = ((y / 3) | 0) * (AN / 3 | 0) + ((x / 3) | 0); if (occ[oc]) continue; occ[oc] = 1;
    if (!keep(x, y, 0.08)) continue;
    let tx = -A.gy[i], ty = A.gx[i]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const len = rand(5, 12);
    contours.push({ k: 's', x, y, x1: (x - tx * len / 2) * K, y1: (y - ty * len / 2) * K, x2: (x + tx * len / 2) * K, y2: (y + ty * len / 2) * K, bend: rand(-1.6, 1.6), w: rand(1.3, 2.6), a: 0.25 + 0.6 * Math.min(1, m / A.p95), c: '38,34,44' });
  }
  // tán chì (mảng tối mờ) + gạch bóng, vùng càng tối gạch càng dày
  const hatch = [];
  for (let y = 5; y < AN - 5; y += 9) for (let x = 5; x < AN - 5; x += 9) {
    const xx = x + rand(-3, 3), yy = y + rand(-3, 3), l = A.L[(yy | 0) * AN + (xx | 0)];
    if (l > 0.72 || !keep(xx, yy, 0)) continue;
    const ang = -0.75 + rand(-0.2, 0.2), len = rand(12, 20);
    hatch.push({ k: 's', x: xx, y: yy, x1: (xx - Math.cos(ang) * len / 2) * K, y1: (yy - Math.sin(ang) * len / 2) * K, x2: (xx + Math.cos(ang) * len / 2) * K, y2: (yy + Math.sin(ang) * len / 2) * K, bend: 0, w: 15, a: 0.03 + (0.72 - l) * 0.16, c: '70,64,78' });
  }
  for (let y = 3; y < AN - 3; y += 3.2) for (let x = 3; x < AN - 3; x += 3.2) {
    const xx = x + rand(-1.5, 1.5), yy = y + rand(-1.5, 1.5), l = A.L[(yy | 0) * AN + (xx | 0)];
    if (l > 0.6 || !keep(xx, yy, 0)) continue;
    if (Math.random() > 0.35 + (0.6 - l)) continue;
    const ang = -0.8 + (l < 0.3 && Math.random() < 0.5 ? 1.55 : 0) + rand(-0.12, 0.12), len = rand(6, 13);
    hatch.push({ k: 's', x: xx, y: yy, x1: (xx - Math.cos(ang) * len / 2) * K, y1: (yy - Math.sin(ang) * len / 2) * K, x2: (xx + Math.cos(ang) * len / 2) * K, y2: (yy + Math.sin(ang) * len / 2) * K, bend: rand(-0.6, 0.6), w: rand(0.9, 1.5), a: 0.08 + (0.6 - l) * 0.5, c: '50,46,58' });
  }
  const serp = (list, band) => list.map(s => { const row = Math.floor((s.y + rand(-band * 0.3, band * 0.3)) / band); return [row * 10000 + (row % 2 ? AN - s.x : s.x) + rand(-12, 12), s]; }).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  sketch.push(...serp(contours, 48), ...serp(hatch, 64));
  // tô màu: nét to → nhỏ
  const layers = [[16, 46, 62, 0.95, 3.2], [9, 26, 34, 0.9, 1.4], [5, 13, 17, 0.88, 0.62], [3.5, 6, 9, 0.85, 0.45]];
  layers.forEach(([step, w, len, a, cost], li) => {
    const list = [];
    for (let y = step / 2; y < AN; y += step) for (let x = step / 2; x < AN; x += step) {
      const xx = clamp(x + rand(-step, step) * 0.45, 0, AN - 1), yy = clamp(y + rand(-step, step) * 0.45, 0, AN - 1), i = (yy | 0) * AN + (xx | 0);
      if (li === 3 && A.mag[i] < A.p80) continue;
      if (!keep(xx, yy, 0.06 - li * 0.03)) continue;
      let ang;
      if (A.mag[i] > A.p80 * 0.5) ang = Math.atan2(A.gx[i], -A.gy[i]);
      else ang = Math.sin(xx * 0.03) * 1.2 + Math.cos(yy * 0.025) * 1.1;
      const c = colorAt(A, xx, yy), v = rand(-9, 9);
      const L = len * rand(0.75, 1.15);
      list.push({ k: 'c', x: xx, y: yy, x1: (xx - Math.cos(ang) * L / K / 2) * K, y1: (yy - Math.sin(ang) * L / K / 2) * K, x2: (xx + Math.cos(ang) * L / K / 2) * K, y2: (yy + Math.sin(ang) * L / K / 2) * K, w: w * rand(0.8, 1.15), a, r: clamp(c[0] + v, 0, 255) | 0, g: clamp(c[1] + v, 0, 255) | 0, b: clamp(c[2] + v, 0, 255) | 0, cost });
    }
    color.push(...serp(list, step * 5));
  });
  // nét viền nhấn đậm
  const acc = contours.filter((s, i) => i % 2 === 0 && A.mag[(s.y | 0) * AN + (s.x | 0)] > A.p95 * 0.7).map(s => { const c = colorAt(A, s.x, s.y); return { k: 'c', x: s.x, y: s.y, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, w: 2.4, a: 0.55, r: c[0] * 0.45 | 0, g: c[1] * 0.42 | 0, b: c[2] * 0.48 | 0, cost: 0.5 }; });
  color.push(...serp(acc, 48));
  let cum = 0; for (const s of color) { cum += s.cost; s.cum = cum; }
  return { sketch, color, colorCost: cum };
}
const P = paintTex.userData.g;
function paperBg(kind) {
  const w = PAINT_PX, h = PAINT_PX;
  P.globalAlpha = 1; P.setTransform(1, 0, 0, 1, 0, 0);
  P.fillStyle = kind === 'sketch' ? '#f1e6cf' : '#f8f5ee'; P.fillRect(0, 0, w, h);
  P.globalAlpha = 0.05; P.strokeStyle = '#7a6a50'; P.lineWidth = 1;
  if (kind !== 'sketch') { for (let i = 0; i < w; i += 4) { P.beginPath(); P.moveTo(i, 0); P.lineTo(i, h); P.stroke(); P.beginPath(); P.moveTo(0, i); P.lineTo(w, i); P.stroke(); } }
  P.globalAlpha = 1; noise(P, w, h, 3500, 0.05);
  const vg = P.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(90,60,20,0.12)'); P.fillStyle = vg; P.fillRect(0, 0, w, h);
  paintTex.needsUpdate = true;
}
function drawStroke(s) {
  if (s.k === 's') {
    P.strokeStyle = `rgba(${s.c},${s.a})`; P.lineWidth = s.w; P.lineCap = 'round';
    P.beginPath(); P.moveTo(s.x1, s.y1);
    const mx = (s.x1 + s.x2) / 2 - (s.y2 - s.y1) * 0.08 * s.bend, my = (s.y1 + s.y2) / 2 + (s.x2 - s.x1) * 0.08 * s.bend;
    P.quadraticCurveTo(mx, my, s.x2, s.y2); P.stroke();
    return;
  }
  P.lineCap = 'round';
  P.strokeStyle = `rgba(${s.r},${s.g},${s.b},${s.a})`; P.lineWidth = s.w;
  P.beginPath(); P.moveTo(s.x1, s.y1); P.lineTo(s.x2, s.y2); P.stroke();
  if (s.w >= 12) {   // vệt lông cọ
    const nx = -(s.y2 - s.y1), ny = s.x2 - s.x1, nl = Math.hypot(nx, ny) || 1, o = s.w * 0.28;
    for (const [sd, k] of [[1, 1.18], [-1, 0.82]]) {
      P.strokeStyle = `rgba(${clamp(s.r * k, 0, 255) | 0},${clamp(s.g * k, 0, 255) | 0},${clamp(s.b * k, 0, 255) | 0},0.35)`; P.lineWidth = s.w * 0.22;
      P.beginPath(); P.moveTo(s.x1 + nx / nl * o * sd, s.y1 + ny / nl * o * sd); P.lineTo(s.x2 + nx / nl * o * sd, s.y2 + ny / nl * o * sd); P.stroke();
    }
  }
}
function drawSignature(k) {
  P.save(); P.globalAlpha = clamp(k, 0, 1);
  P.translate(PAINT_PX - 170, PAINT_PX - 46); P.rotate(-0.08);
  P.fillStyle = '#7a1f2b'; P.font = `700 34px ${HAND}`; P.textAlign = 'left'; P.textBaseline = 'middle';
  const sig = (S.painterName || 'Neon').split(' ').pop();
  P.fillText(sig.slice(0, 10) + ' ♥', 0, 0);
  P.restore(); paintTex.needsUpdate = true;
}
function drawInvite(t) {
  paperBg('sketch');
  P.save(); P.fillStyle = '#4a3a2a'; P.textAlign = 'center'; P.textBaseline = 'middle';
  P.font = `700 64px ${HAND}`; P.fillText('Chờ người mẫu…', PAINT_PX / 2, 230);
  P.font = `600 44px ${HAND}`; P.fillText('🎁 Tặng quà', PAINT_PX / 2, 380); P.fillText('để được vẽ chân dung!', PAINT_PX / 2, 450);
  P.font = `500 36px ${HAND}`; P.fillStyle = '#7a5a3a'; P.fillText('💬 bình luận để xếp hàng', PAINT_PX / 2, 560);
  P.strokeStyle = 'rgba(60,50,40,0.5)'; P.lineWidth = 3; P.beginPath(); P.ellipse(PAINT_PX / 2, 400, 300, 150, -0.05, 0, TAU); P.stroke();
  P.restore(); paintTex.needsUpdate = true;
}

// ---------- công việc vẽ hiện tại ----------
let job = null;
const tierOf = c => c >= (Number(S.tierKing) || 299) ? 4 : c >= (Number(S.tierNoble) || 99) ? 3 : c >= 30 ? 2 : c >= 1 ? 1 : 0;
const TIER_NAME = ['Phác thảo chì', 'Tranh màu', 'Khung bạc', 'Khung vàng', 'Kiệt tác'];
const snapReq = [];   // chụp mặt nhân vật 3D làm mẫu khi không có ảnh đại diện
function startJob(p) {
  const i = queue.indexOf(p); if (i >= 0) queue.splice(i, 1);
  sitter = p; p.paintCoins = p.coins; p.coins = 0;
  if (!p.bodied) giveBody(p, queueSlot(0).add(V3(-0.8, 0, 0)));
  p.target = STOOL_POS.clone().add(V3(0, 0, 0.02));
  const tier = tierOf(p.paintCoins);
  const giftersWaiting = queue.filter(x => x.coins > 0).length;
  const D = clamp(Number(S.paintSeconds) || 14, 6, 60) * clamp(1 - Math.max(0, giftersWaiting - 2) * 0.06, 0.55, 1);
  job = { p, tier, t: 0, phase: 'intro', D, src: null, strokes: null, si: 0, ci: 0, boost: 0, brushU: 0.5, brushV: 0.3, seated: false, wantSnap: false, done: false };
  drawPlate(p.name, tier ? TIER_NAME[tier] : 'Phác thảo');
  setFrame(0);
  bubble(pick([`Mời ${short(p.name)} ngồi!`, 'Ngồi yên nha!', 'Cười lên nào!', 'Tạo dáng đi!']), 2.4);
  say(pick([`Mời ${nm(p.name)} lên ghế mẫu nhé!`, `Tới lượt ${nm(p.name)} rồi, ngồi yên để họa sĩ vẽ nha!`]), 'start', 3);
  // nguồn ảnh: ảnh đại diện TikTok, không có thì chụp nhân vật 3D của người đó
  const myJob = job;
  (async () => {
    const im = p.avatar ? await loadImage(p.avatar) : null;
    if (job !== myJob) return;
    if (im) { try { myJob.src = squareFrom(im); } catch (e) { myJob.src = null; } }
    if (!myJob.src) myJob.wantSnap = true;
  })();
}
function prepareJob(j) {
  if (j.strokes) return;
  const data = j.src || placeholderSource(j.p.name);
  j.strokes = buildStrokes(analyse(data), j.tier);
  paperBg(j.tier ? 'canvas' : 'sketch');
}
function upgradeJob(j, value) {
  const nt = tierOf((j.p.paintCoins = (j.p.paintCoins || 0) + value));
  if (nt > j.tier) {
    const wasSketchOnly = j.tier === 0;
    j.tier = nt; drawPlate(j.p.name, TIER_NAME[nt]);
    if (wasSketchOnly && j.strokes && (j.phase === 'sketch' || j.phase === 'intro')) { /* nét màu đã có sẵn, chỉ cần thêm giai đoạn tô */ }
  }
  j.boost = 3;
}
function finishSitter() {
  const p = sitter; sitter = null;
  if (!p) return;
  p.paintedAt = now();
  if (p.bodied) { p.target = V3(-3.8, 0, -2.2); p.leaveAt = now(); p.jumpT = 0; walkers.push(p); }
}
function updateJob(t, dt) {
  if (!job) {
    if (party.on || presenting) return;
    const next = queue[0];
    if (next && (next.coins > 0 || S.paintFree !== false)) { startJob(next); return; }
    if (!idleInvite) { idleInvite = true; drawInvite(t); drawPlate(S.painterName || 'Họa sĩ Neon', 'Tặng quà để được vẽ'); setFrame(0); }
    if (t > nextInviteBubble) { nextInviteBubble = t + rand(14, 22); bubble(pick(['Tặng 🌹 để được vẽ nha!', 'Ai muốn vẽ chân dung nào?', 'Bình luận để xếp hàng!', 'Mình vẽ miễn phí đó!']), 3); }
    return;
  }
  idleInvite = false;
  const j = job;
  if (party.on) return;   // dance party: cả họa sĩ cũng đi nhảy
  const sp = j.boost > 0 ? 1.7 : 1; j.boost = Math.max(0, j.boost - dt);
  j.t += dt * sp;
  const p = j.p;
  if (j.phase === 'intro') {
    j.seated = p.bodied && p.pos.distanceTo(STOOL_POS) < 0.1;
    if (j.wantSnap && j.seated && !j.snapAsked && j.t > 0.6) { j.snapAsked = true; snapReq.push(j); }
    const ready = j.src || j.snapDone || (j.t > 7);
    if ((j.seated || j.t > 6) && ready && j.t > 1.2) { prepareJob(j); j.phase = 'sketch'; j.t = 0; }
    return;
  }
  const sketchDur = j.tier ? j.D * 0.34 : j.D * 0.7, paintDur = j.D * 0.55;
  if (j.phase === 'sketch') {
    const k = clamp(j.t / sketchDur, 0, 1), target = Math.floor(k * j.strokes.sketch.length);
    while (j.si < target) { const s = j.strokes.sketch[j.si++]; drawStroke(s); j.brushU = s.x / AN; j.brushV = s.y / AN; }
    if (target > 0) paintTex.needsUpdate = true;
    if (k >= 1) { j.phase = j.tier ? 'paint' : 'sign'; j.t = 0; if (j.tier) bubble(pick(['Tô màu nào!', 'Thêm chút màu…', 'Đẹp dần rồi nè!']), 2); }
    return;
  }
  if (j.phase === 'paint') {
    const k = clamp(j.t / paintDur, 0, 1), goal = k * j.strokes.colorCost, list = j.strokes.color;
    let drew = false;
    while (j.ci < list.length && list[j.ci].cum <= goal) { const s = list[j.ci++]; drawStroke(s); j.brushU = s.x / AN; j.brushV = s.y / AN; j.paint = s; drew = true; }
    if (drew) { paintTex.needsUpdate = true; if (j.paint) bristleMat.color.setRGB(j.paint.r / 255, j.paint.g / 255, j.paint.b / 255, THREE.SRGBColorSpace); }
    if (k >= 1) { j.phase = 'sign'; j.t = 0; }
    return;
  }
  if (j.phase === 'sign') {
    j.brushU = 0.78 + j.t * 0.1; j.brushV = 0.93;
    if (j.t > 0.9) { drawSignature(1); j.phase = 'reveal'; j.t = 0; onReveal(j); }
    return;
  }
  if (j.phase === 'reveal') {
    setFrame(j.tier, backOut(j.t / 0.5));
    if (j.t > 2.1) { j.phase = 'throw'; j.t = 0; launchToGallery(j); }
    return;
  }
  if (j.phase === 'throw') {
    if (j.t > 0.35 && !j.cleared) { j.cleared = true; setFrame(0); canvasMesh.visible = false; finishSitter(); }
    if (j.t > 1.3) { canvasMesh.visible = true; canvasPop = t; job = null; idleInvite = false; paperBg('canvas'); drawPlate('…', ''); }
  }
}
let idleInvite = false, nextInviteBubble = 0, presenting = false, canvasPop = -10;
function onReveal(j) {
  const p = j.p;
  revealFx = { t0: now(), tier: j.tier, name: p.name };
  bubble(pick(j.tier >= 3 ? ['Kiệt tác!', 'Tuyệt phẩm!', 'Đẹp xuất sắc!'] : ['Xong rồi!', 'Đẹp chưa nè?', 'Giống y chang!', 'Tặng bạn nè!']), 2.4);
  chime(j.tier);
  if (j.tier >= 3) confetti(80); else sparkleAt(canvasScreen(), 26);
  for (const q of queue) if (q.bodied && Math.random() < 0.7) q.clapUntil = now() + 2;
  if (p.bodied) p.jumpT = now();
  say(j.tier >= 3 ? `Kiệt tác dành cho ${nm(p.name)}! Cảm ơn bạn nhiều!` : `Xong bức chân dung của ${nm(p.name)} rồi!`, 'done', 4);
  painted++;
}
let painted = 0, revealFx = null;
// tranh bay lên dây phơi
function galleryTexture(j) {
  const S0 = 300, F = j.tier >= 3 ? 26 : j.tier ? 18 : 10, LB = 44;
  return canvasTex(S0 + F * 2, S0 + F * 2 + LB, (g, w, h) => {
    const fc = j.tier >= 3 ? ['#fff1a8', '#d99a1e', '#ffe27a', '#a86a0a'] : j.tier === 2 ? ['#ffffff', '#aab2bf', '#e8ecf2', '#7d8694'] : j.tier === 1 ? ['#c58a55', '#6e4122', '#b07445', '#5a3218'] : ['#f6efe0', '#d8c9a8', '#efe3c8', '#c9b48a'];
    const gr = g.createLinearGradient(0, 0, w, h); fc.forEach((c, i) => gr.addColorStop(i / 3, c));
    g.fillStyle = gr; g.fillRect(0, 0, w, S0 + F * 2);
    g.drawImage(paintTex.userData.canvas, F, F, S0, S0);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3; g.strokeRect(F, F, S0, S0);
    g.fillStyle = '#fff8e8'; rr(g, 6, S0 + F * 2 + 4, w - 12, LB - 8, 8); g.fill();
    g.fillStyle = '#3a2410'; g.font = `700 24px ${HAND}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    let nmx = j.p.name; while (g.measureText(nmx).width > w - 30 && nmx.length > 2) nmx = nmx.slice(0, -1);
    g.fillText(nmx, w / 2, S0 + F * 2 + LB / 2);
  });
}
function launchToGallery(j) {
  const tex = galleryTexture(j);
  const ar = tex.image.height / tex.image.width;
  const gw = j.tier >= 3 ? 0.66 : 0.56;
  const grp = new THREE.Group();
  const pic = mesh(new THREE.PlaneGeometry(gw, gw * ar), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2 }), 0, -gw * ar / 2 - 0.02, 0, grp);
  for (const sx of [-0.32, 0.32]) mesh(new THREE.BoxGeometry(0.03, 0.08, 0.03), std(0xd9b38c), sx * gw, -0.01, 0.01, grp);
  scene.add(grp);
  // vị trí đầu: đúng chỗ toan trên giá vẽ
  canvasMesh.getWorldPosition(_v1); canvasMesh.getWorldQuaternion(_q1);
  const startScale = CW / gw;
  grp.position.copy(_v1).add(V3(0, CH / 2 * 1, 0)); grp.quaternion.copy(_q1); grp.scale.setScalar(startScale);
  pic.position.y = -gw * ar / 2 - 0.02;
  // dịch hết sang trái một ô, tranh cũ nhất rơi xuống
  for (const g of gallery) g.slot--;
  for (const g of gallery) if (g.slot < 0 && !g.fall) { g.fall = now(); }
  gallery.push({ group: grp, slot: GALLERY_N - 1, from: grp.position.clone(), fromQ: grp.quaternion.clone(), fromS: startScale, t0: now(), dur: 1.25, ph: Math.random() * TAU, tex });
}
function updateGallery(t, dt) {
  for (let i = gallery.length - 1; i >= 0; i--) {
    const g = gallery[i];
    if (g.fall) {
      const k = t - g.fall; g.group.position.y -= dt * (1 + k * 6); g.group.rotation.z += dt * 2;
      if (k > 1.6) { scene.remove(g.group); g.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); g.tex.dispose(); gallery.splice(i, 1); }
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
      // đã treo: trượt sang ô mới + đung đưa
      g.cur = (g.cur || target.clone()).lerp(target, Math.min(1, dt * 3));
      g.group.position.copy(g.cur);
      g.group.rotation.set(0, 0, Math.sin(t * 1.3 + g.ph) * 0.04);
      g.group.scale.setScalar(1);
    }
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
  say(pick(['Dance party! Cả phố cùng quẩy nào!', 'Thanh cầu vồng đầy rồi! Dance party bắt đầu!', 'Bật nhạc lên! Cả phố nhảy nào!']), 'party', 5, true, true);
  horn(); confetti(120);
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
    if (k < 1.0) { pose.lu = -0.55; pose.lsx = -0.9; pose.lex = -2.2; pose.head = 0.15; }   // tay chống cằm ngắm tranh
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
// ÂM THANH NHỎ (chuông xong tranh, kèn party) — đi chung đường tiếng của nhạc game
// ======================================================================
function tone(freq, t0, dur, type = 'sine', vol = 0.18) {
  const A = Music && Music.ctx; if (!A || A.state !== 'running') return;
  const o = A.createOscillator(), g = A.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, A.currentTime + t0); g.gain.linearRampToValueAtTime(vol, A.currentTime + t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, A.currentTime + t0 + dur);
  o.connect(g); g.connect(Music.master); o.start(A.currentTime + t0); o.stop(A.currentTime + t0 + dur + 0.05);
}
function chime(tier) { const base = tier >= 3 ? [784, 988, 1175, 1568] : [659, 784, 988]; base.forEach((f, i) => tone(f, i * 0.09, 0.9, 'triangle', 0.14)); }
function ding() { tone(1318, 0, 0.35, 'sine', 0.08); tone(1976, 0.05, 0.3, 'sine', 0.05); }
function horn() { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.07, 0.5, 'sawtooth', 0.05)); }

// ======================================================================
// MC GIỌNG NÓI + BONG BÓNG LỜI HỌA SĨ
// ======================================================================
const sayRate = new Map();
const nm = n => (window.MC ? MC.clean(n) : String(n || ''));
const short = n => { n = String(n || ''); return n.length > 12 ? n.slice(0, 11) + '…' : n; };
function say(text, key, gap = 0, prio = false, hyped = false) {
  if (!text) return;
  if (key) { const last = sayRate.get(key) || -1e9; if (now() - last < gap) return; sayRate.set(key, now()); }
  if (!S.ttsEnabled || !isPrimary) return;
  if (window.MC) MC.setPref(S.ttsVoice);
  if (S.ttsWhere === 'admin' || !window.MC || !MC.available() || !MC.hasVietnamese() || (S.ttsVoice && !MC.list().includes(S.ttsVoice))) socket.emit('say', { text, prio, hype: hyped, auto: S.ttsWhere !== 'admin' });
  else { MC.enabled = true; MC.volume = Number(S.ttsVolume) || 1; MC.rate = Number(S.ttsRate) || 1.05; MC.say(text, prio, hyped); }
}
let speech = null;
function bubble(text, dur = 2.2) { speech = { text, t0: now(), until: now() + dur }; }

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
  const txt = fit(b.text, 560), name = fit(b.user.name, 300);
  ctx.font = `800 40px ${FONT}`; const nw = ctx.measureText(name).width;
  ctx.font = `700 38px ${FONT}`; const tw = ctx.measureText(txt).width;
  const w = 100 + nw + 18 + tw + 40, x = (W - w) / 2, y = 212, h = 76;
  ctx.fillStyle = 'rgba(60,30,10,0.35)'; roundRect(x + 4, y + 6, w, h, 18); ctx.fill();
  ctx.fillStyle = b.gold ? '#ffe9a3' : '#fff6d8'; roundRect(x, y, w, h, 18); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#3a2410'; ctx.stroke();
  avatarCircle(b.user, x + 46, y + h / 2, 27, b.gold ? '#ffb400' : '#3a2410');
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2a1608'; ctx.font = `800 40px ${FONT}`; ctx.fillText(name, x + 88, y + h / 2 + 1);
  ctx.fillStyle = b.color || '#b0182f'; ctx.font = `700 38px ${FONT}`; ctx.fillText(txt, x + 88 + nw + 18, y + h / 2 + 1);
  ctx.restore();
  return true;
}
const HINTS = ['🎁 Tặng quà để được vẽ chân dung', '💬 Bình luận để xếp hàng', '❤️ Thả tim đầy thanh → DANCE PARTY', '👑 Quà 99 xu → khung vàng'];
function drawHint(t) {
  const i = Math.floor(t / 4.5) % HINTS.length, k = (t % 4.5) / 4.5, a = Math.min(1, k * 8, (1 - k) * 8);
  ctx.save(); ctx.globalAlpha = 0.92 * a;
  ctx.font = `700 34px ${FONT}`; const txt = HINTS[i], w = ctx.measureText(txt).width + 50, x = (W - w) / 2, y = 222;
  ctx.fillStyle = 'rgba(255,255,255,0.82)'; roundRect(x, y, w, 58, 29); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(58,36,16,0.6)'; ctx.stroke();
  ctx.fillStyle = '#3a2410'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, W / 2, y + 30);
  ctx.restore();
}
function drawMeter(t) {
  const x = 230, y = 146, w = 620, h = 40;
  ctx.save();
  ctx.font = '44px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🎨', x - 38, y + h / 2 + 2);
  ctx.fillStyle = 'rgba(255,255,255,0.88)'; roundRect(x, y, w, h, h / 2); ctx.fill();
  let k;
  if (party.on) k = clamp((party.until - t) / Math.max(1, party.until - party.t0), 0, 1);
  else k = clamp(party.pts / partyGoal(), 0, 1);
  if (k > 0.001) {
    ctx.save(); roundRect(x, y, w, h, h / 2); ctx.clip();
    const gr = ctx.createLinearGradient(x, 0, x + w, 0);
    const off = (t * 0.15) % 1;
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
  // hàng chờ: ảnh đại diện trên đầu, xa trước gần sau
  const list = queue.filter(p => p.bodied && p._sp && p._sp.z < 1).map((p, i) => [p, queue.indexOf(p)]).sort((a, b) => a[0]._sp.y - b[0]._sp.y);
  for (const [p, i] of list) {
    const sp = p._sp, r = clamp(34 - i * 2.4, 16, 34), y = sp.y - r - 6;
    avatarCircle(p, sp.x, y, r, p.coins > 0 ? tierRing(p.coins) : 'rgba(255,255,255,0.95)');
    if (p.coins > 0) { ctx.font = `800 ${Math.round(r * 0.62)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const lbl = '🎁' + p.coins; const lw = ctx.measureText(lbl).width + 12; ctx.fillStyle = 'rgba(42,22,8,0.85)'; roundRect(sp.x - lw / 2, y + r + 2, lw, r * 0.8, r * 0.4); ctx.fill(); ctx.fillStyle = '#ffe27a'; ctx.fillText(lbl, sp.x, y + r + 2 + r * 0.42); }
    if (i < 3) { ctx.font = `700 ${Math.round(r * 0.62)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; const n = fit(p.name, 170); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(42,22,8,0.75)'; ctx.strokeText(n, sp.x, y - r - 4); ctx.fillStyle = '#fff'; ctx.fillText(n, sp.x, y - r - 4); }
    if (p.commentUntil > t && p.comment) {
      ctx.font = `600 24px ${FONT}`; const c = fit(p.comment, 220), cw = ctx.measureText(c).width + 24;
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; roundRect(sp.x - cw / 2, y - r - 70, cw, 36, 12); ctx.fill();
      ctx.fillStyle = '#2a1608'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c, sp.x, y - r - 52);
    }
  }
  // +N người chờ phía sau
  const extra = queue.length - Math.min(VIS, queue.length);
  if (queue.length) {
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
  const sketchDur = j.tier ? j.D * 0.34 : j.D * 0.7, paintDur = j.D * 0.55;
  if (j.phase === 'intro') { label = '🪑 Mời ngồi…'; k = 0; }
  else if (j.phase === 'sketch') { label = '✏️ Phác thảo'; k = (j.tier ? 0.38 : 1) * clamp(j.t / sketchDur, 0, 1); }
  else if (j.phase === 'paint') { label = '🖌️ Tô màu'; k = 0.38 + 0.6 * clamp(j.t / paintDur, 0, 1); }
  else if (j.phase === 'sign') { label = '✍️ Ký tên'; k = 0.99; }
  else { label = '✨ ' + TIER_NAME[j.tier]; k = 1; }
  const w = 300, x = clamp(cs.x - w / 2, 20, W - w - 20), y = top.y - 62;
  ctx.save();
  ctx.fillStyle = 'rgba(42,22,8,0.78)'; roundRect(x, y, w, 46, 23); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; roundRect(x + 6, y + 32, w - 12, 8, 4); ctx.fill();
  if (k > 0) { ctx.fillStyle = j.tier >= 3 ? '#ffd23f' : '#7cf7ff'; roundRect(x + 6, y + 32, (w - 12) * k, 8, 4); ctx.fill(); }
  ctx.fillStyle = '#fff'; ctx.font = `700 22px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + w / 2, y + 17);
  ctx.restore();
}
function drawReveal(t) {
  if (!revealFx) return;
  const k = t - revealFx.t0; if (k > 3) return;
  const a = Math.min(1, k / 0.2, (3 - k) / 0.4), s = backOut(Math.min(1, k / 0.35));
  const cs = canvasScreen();
  ctx.save(); ctx.globalAlpha = a; ctx.translate(clamp(cs.x, 280, W - 280), clamp(cs.y - 400, 330, H)); ctx.scale(s, s);
  const gold = revealFx.tier >= 3;
  const txt = gold ? `👑 Kiệt tác của ${fit(revealFx.name, 300)}` : `🎨 Tranh của ${fit(revealFx.name, 320)}`;
  ctx.font = `800 40px ${FONT}`; const w = ctx.measureText(txt).width + 60;
  ctx.fillStyle = gold ? '#ffcf3a' : '#ffffff'; roundRect(-w / 2, -36, w, 72, 36); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#2a1608'; ctx.stroke();
  ctx.fillStyle = '#2a1608'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, 0, 2);
  ctx.restore();
}
function drawLegend() {
  if (S.painterLegend === false) return;
  const rows = [['💬', 'Bình luận', 'xếp hàng'], ['🌹', '1 xu', 'tranh màu'], ['💎', '30 xu', 'khung bạc'], ['👑', `${S.tierNoble || 99} xu`, 'khung vàng'], ['🏆', `${S.tierKing || 299} xu`, 'kiệt tác'], ['❤️', 'Thả tim', 'Dance party']];
  const x = W - 316, y = 1330, w = 300, rh = 38;
  ctx.save();
  ctx.fillStyle = 'rgba(42,22,8,0.62)'; roundRect(x, y, w, 52 + rows.length * rh, 18); ctx.fill();
  ctx.fillStyle = '#ffe9a3'; ctx.font = `800 24px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('🎨 Cách chơi', x + 16, y + 28);
  rows.forEach(([ic, a, b], i) => {
    const yy = y + 66 + i * rh;
    ctx.font = `26px ${FONT}`; ctx.fillText(ic, x + 14, yy);
    ctx.fillStyle = '#fff'; ctx.font = `700 21px ${FONT}`; ctx.fillText(a, x + 52, yy);
    ctx.fillStyle = '#ffd9a8'; ctx.font = `600 21px ${FONT}`; ctx.fillText('→ ' + b, x + 52 + ctx.measureText(a).width + 8, yy);
    ctx.fillStyle = '#ffe9a3';
  });
  ctx.restore();
}
function drawHUD(t, dt) {
  drawPeopleTags(t);
  drawJobProgress(t);
  drawSpeech(t);
  drawMeter(t);
  if (!drawBanner(t)) drawHint(t);
  drawReveal(t);
  drawPartyTitle(t);
  drawLegend();
  drawParticles(dt);
}

// ======================================================================
// SỰ KIỆN TIKTOK
// ======================================================================
let lastLikeBanner = 0;
function onGift(ev) {
  const p = ensurePerson(ev.user);
  const value = Math.max(0, Number(ev.value) || 0);
  p.total += value;
  if (p === sitter && job) upgradeJob(job, value);
  else { p.coins += value; if (!queue.includes(p)) enqueue(p); else sortQueue(); if (p.bodied) p.jumpT = now(); }
  const gname = ev.gift && ev.gift.name ? ev.gift.name : 'quà';
  pushBanner({ user: p, text: `Cảm ơn ${ev.count > 1 ? gname + ' ×' + ev.count : gname}! ✨`, gold: value >= (Number(S.tierNoble) || 99), color: '#b0182f' });
  if (!party.on) painterState.waveUntil = now() + 1.6;
  bubble(pick(['Cảm ơn nhé!', 'Cảm ơn bạn!', 'Tuyệt quá!', 'Yêu bạn ❤', 'Hảo hạng!']), 1.8);
  ding();
  hearts(W - 120, H - 520, Math.min(12, 2 + Math.round(Math.sqrt(value))));
  if (value >= (Number(S.tierNoble) || 99)) confetti(60);
  addParty(value * 5);
  if (value >= (Number(S.ttsMinCoins) || 1)) say(p === sitter ? `Cảm ơn ${nm(p.name)}! Tranh của bạn được nâng cấp!` : value >= (Number(S.tierNoble) || 99) ? `Wow! Cảm ơn ${nm(p.name)} đã tặng ${gname}! Bạn được vẽ khung vàng!` : `Cảm ơn ${nm(p.name)} đã tặng ${gname}!`, 'gift:' + p.id, 4);
}
function onChat(ev) {
  const p = ensurePerson(ev.user);
  const joined = enqueue(p);
  if (ev.text) { p.comment = ev.text; p.commentUntil = now() + 4; }
  if (p.bodied && (joined || Math.random() < 0.6)) p.waveUntil = now() + 1.4;
  if (p === sitter) p.waveUntil = now() + 1.2;
}
function onLike(ev) {
  const n = Math.max(1, Number(ev.count) || 1);
  addParty(n);
  const p = people.get(ev.user && ev.user.id);
  if (p) p.lastActive = now();
  if (Math.random() < 0.5) hearts(W - 110 + rand(-20, 20), H - 460, 1);
  const t = now();
  if (t - lastLikeBanner > 2.5 && banners.length < 2 && ev.user) { lastLikeBanner = t; pushBanner({ user: ev.user, text: `❤ ×${n}`, color: '#e0245e' }); }
}
socket.on('connect', () => socket.emit('hello', 'game', { obs: OBS, mode: 'painter' }));
socket.on('primary', v => { isPrimary = !!v; });
function handleEv(ev) {
  try {
    switch (ev.type) {
      case 'chat': onChat(ev); break;
      case 'gift': onGift(ev); break;
      case 'like': onLike(ev); break;
      case 'follow': pushBanner({ user: ev.user, text: 'đã follow 💖', color: '#d6247a' }); addParty(20); bubble('Cảm ơn follow nha!', 2); if (S.ttsFollow !== false) say(`Cảm ơn ${nm(ev.user.name)} đã follow!`, 'follow', 6); break;
      case 'share': pushBanner({ user: ev.user, text: 'đã chia sẻ 📣', color: '#2a7d3a' }); addParty(15); break;
    }
  } catch (e) { console.error(e); }
}
socket.on('ev', handleEv);
socket.on('cmd', c => {
  if (!c) return;
  if (c.type === 'reload') location.reload();
  if (c.type === 'painterParty') startParty();
  if (c.type === 'painterSkip' || c.type === 'endZoom') { if (job && ['intro', 'sketch', 'paint', 'sign'].includes(job.phase)) { prepareJob(job); for (const s of job.strokes.sketch.slice(job.si)) drawStroke(s); if (job.tier) for (const s of job.strokes.color.slice(job.ci)) drawStroke(s); job.si = job.strokes.sketch.length; job.ci = job.strokes.color.length; paintTex.needsUpdate = true; job.phase = 'sign'; job.t = 0; } }
  if (c.type === 'painterClear' || c.type === 'clear') { for (const p of [...queue]) leaveQueue(p); }
  if (c.type === 'fire') startParty();
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
window._painter = { queue, people, party, get job() { return job; }, startParty, camera, scene, inject: handleEv };   // chỉ dùng khi thử nghiệm
requestAnimationFrame(frame);
