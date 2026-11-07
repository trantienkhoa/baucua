// Vũ Trường Neon — màn hình game 3D 1080×1920 (Three.js)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createThemes, THEME_NAMES } from './themes.js';
import { rosterOutfit, danceFor, tempoFor, hyperFor, shapeFor } from './roster.js';
import { loadAvatars, createAvatar, driveAvatar, disposeAvatar, restyle, applyShape, avatarTemplates, setCostume, randomCostumeId, COSTUMES, costumeTime, setExtra, outfitTime, setOutfitMix, templateForChar, hasCharModel } from './avatars.js';
import { createLCD } from './lcd.js';
import { createFX } from './fx.js';
import { createBar, SALONS } from './bar.js';

const W = 1080, H = 1920;
const PI = Math.PI, TAU = PI * 2;
const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const params = new URLSearchParams(location.search);
const OBS = params.has('obs');
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => performance.now() / 1000;

const glCanvas = document.getElementById('gl');
const hud = document.getElementById('hud');
const ctx = hud.getContext('2d');

// ---------- trạng thái ----------
let S = {
  quality: 'high', maxDancers: 150, idleSeconds: 420, zoomMin: 3, zoomMax: 6, camZoom: 2.4, heatTarget: 0, fireSeconds: 15,
  showComments: true, autoCam: true, showTop: true, topDJ: true, showCoins: false, showGiftMenu: true, showJoinTicker: true,
  tierNoble: 99, tierKing: 299, tierEmperor: 999, actions: [], musicEnabled: true, synthMusic: true, volume: 0.35,
};
let ACTIONS = [], GIFTS = {}, TOP = [], viewers = 0, ROSTER = [];
const dancers = new Map();
const clones = [];
let heat = 0, fireUntil = 0, fireStart = 0, curHeatTarget = 200;
const zoomQueue = [];
let zoom = null;
const ticker = [];
let tickerX = 0, tickerCur = null;
const particles = [], rockets = [];
let flash = 0;
let resident = null, djOverride = null;

const imgCache = new Map();
function img(url) {
  if (!url) return null;
  let e = imgCache.get(url);
  if (!e) {
    e = { img: new Image(), ok: false };
    e.img.referrerPolicy = 'no-referrer';
    e.img.onload = () => e.ok = true;
    e.img.src = /^https?:\/\//i.test(url) ? '/api/img?u=' + encodeURIComponent(url) : url;   // qua máy chủ: giữ canvas “sạch” cho màn LED 3D và clip
    imgCache.set(url, e);
    if (imgCache.size > 1500) imgCache.delete(imgCache.keys().next().value);
  }
  return e.ok ? e.img : null;
}

// ======================================================================
// 3D
// ======================================================================
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: true, powerPreference: 'high-performance' });   // alpha: màn LCD phát YouTube nằm sau canvas
} catch (e) {
  document.getElementById('err').style.display = 'block';
  throw e;
}
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0314);
scene.fog = new THREE.Fog(0x14061f, 22, 45);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.3;

const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 100);
const CAM_POS = new THREE.Vector3(0, 4.7, 12.8);
const CAM_LOOK = new THREE.Vector3(0, 2.2, -1.6);
camera.position.copy(CAM_POS); camera.lookAt(CAM_LOOK);

let composer = null, bloom = null;
function setupComposer() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.45, 0.97);
  composer.addPass(bloom);
  if (lcd) composer.addPass(lcd.holePass);   // đục lỗ màn LCD sau hiệu ứng toả sáng
  composer.addPass(new OutputPass());
}

// ---------- tiện ích texture ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.userData = { canvas: c, g };
  return t;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// ---------- ánh sáng ----------
const hemi = new THREE.HemisphereLight(0xb9a8ff, 0x241038, 0.55); scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff2e6, 1.5); key.position.set(3, 10, 12); scene.add(key);
const rim = new THREE.DirectionalLight(0xff4fd8, 0.9); rim.position.set(-4, 6, -10); scene.add(rim);
const rim2 = new THREE.DirectionalLight(0x41e8ff, 0.7); rim2.position.set(5, 5, -8); scene.add(rim2);
const movers = [0xff3d9a, 0x3dd9ff, 0xffc23d].map(c => { const l = new THREE.PointLight(c, 10, 12, 1.5); l.position.set(0, 4, 0); scene.add(l); return l; });

// ---------- phòng ----------
const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1028, roughness: 0.8 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x8a8aa0, metalness: 0.9, roughness: 0.35 });
{
  const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 24), new THREE.MeshStandardMaterial({ color: 0x120a20, roughness: 0.9 }));
  back.position.set(0, 10, -10.5); scene.add(back);
  for (const sd of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 24), new THREE.MeshStandardMaterial({ color: 0x150b25, roughness: 0.9 }));
    wall.position.set(sd * 10, 10, 2); wall.rotation.y = -sd * PI / 2; scene.add(wall);
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x07030c, roughness: 0.6 }));
  ground.rotation.x = -PI / 2; ground.position.y = -0.09; scene.add(ground);
}
// dải neon tường bên
const neonStrips = [];
for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 9, 0.12), new THREE.MeshBasicMaterial({ color: 0xff3df2 }));
  m.position.set(sd * 9.9, 4.5, -8 + i * 3); scene.add(m); neonStrips.push(m);
}
// giàn đèn
for (const z of [-2, -6.5]) {
  const tr = new THREE.Mesh(new THREE.BoxGeometry(20, 0.35, 0.35), metalMat); tr.position.set(0, 9.5, z); scene.add(tr);
}

// ---------- sàn LED ----------
const TX = 18, TZ = 11;
const tileMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.94, 0.1, 0.94), new THREE.MeshBasicMaterial({ color: 0xffffff }), TX * TZ);
{
  const m = new THREE.Matrix4(); let i = 0;
  for (let ix = 0; ix < TX; ix++) for (let iz = 0; iz < TZ; iz++) {
    m.makeTranslation(-TX / 2 + 0.5 + ix, -0.05, -5.5 + 0.5 + iz);
    tileMesh.setMatrixAt(i, m); tileMesh.setColorAt(i, new THREE.Color(0x222222)); i++;
  }
  scene.add(tileMesh);
}
const tileColor = new THREE.Color();

// ---------- sân khấu ----------
const STAGE_Y = 0.75;
{
  const st = new THREE.Mesh(new THREE.BoxGeometry(20, STAGE_Y, 5.2), new THREE.MeshStandardMaterial({ color: 0x241638, roughness: 0.5, metalness: 0.3 }));
  st.position.set(0, STAGE_Y / 2 - 0.05, -8.1); scene.add(st);
}
const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), 40);
for (let i = 0; i < 40; i++) { bulbs.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-9.75 + i * 0.5, STAGE_Y * 0.5, -5.47)); bulbs.setColorAt(i, new THREE.Color(0xffffff)); }
scene.add(bulbs);
// khói sàn + pháo sáng (fx.js)
// nội thất quán bar: bộ salon + bàn tròn đứng (bar.js)
const bar = createBar(scene);
const fx = createFX(scene, { floor: { x0: -9, x1: 9, z0: -5.2, z1: 5.5 }, stageY: STAGE_Y, stageFrontZ: -5.5 });

// màn LED
const ledTex = canvasTex(512, 224, () => {});
const led = new THREE.Mesh(new THREE.PlaneGeometry(13, 5.7), new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false }));
led.position.set(0, STAGE_Y + 3.3, -10.3); scene.add(led);
// ---- "lên màn LED": quay trực tiếp người tặng quà lớn ----
const ledRT = new THREE.WebGLRenderTarget(768, 336, { samples: 2 });
ledRT.texture.colorSpace = THREE.LinearSRGBColorSpace;
const ledCam = new THREE.PerspectiveCamera(30, 13 / 5.7, 0.1, 60);
const ledLiveMat = new THREE.MeshBasicMaterial({ map: ledRT.texture, toneMapped: true });
const ledIdleMat = led.material;
let lcd = null;   // màn LCD: YouTube / video / ảnh (lcd.js)
const ledOverTex = canvasTex(1024, 448, () => {});
const ledOver = new THREE.Mesh(new THREE.PlaneGeometry(13, 5.7), new THREE.MeshBasicMaterial({ map: ledOverTex, transparent: true, toneMapped: false, depthWrite: false }));
ledOver.position.set(0, STAGE_Y + 3.3, -10.27); ledOver.visible = false; scene.add(ledOver);
const ledQueue = [];
let ledShow = null;   // { d, gift, count, value, until, start, drawn }
function drawLedOverlay(sh, t) {
  const { g, canvas: c } = ledOverTex.userData;
  g.clearRect(0, 0, c.width, c.height);
  const W2 = c.width, H2 = c.height;
  // khung vàng nhấp nháy
  const gr = g.createLinearGradient(0, 0, W2, 0); gr.addColorStop(0, '#ffcf33'); gr.addColorStop(0.5, '#ff3d9a'); gr.addColorStop(1, '#ffcf33');
  g.lineWidth = 16; g.strokeStyle = gr; g.strokeRect(8, 8, W2 - 16, H2 - 16);
  // dải tên phía dưới
  const bh = 104;
  const bg = g.createLinearGradient(0, H2 - bh, 0, H2); bg.addColorStop(0, 'rgba(40,6,70,0.88)'); bg.addColorStop(1, 'rgba(15,2,30,0.95)');
  g.fillStyle = bg; g.fillRect(16, H2 - bh - 16, W2 - 32, bh);
  // ảnh đại diện
  const r = 70, ax = 30 + r, ay = H2 - 16 - bh / 2 - 18;
  g.fillStyle = '#ffcf33'; g.beginPath(); g.arc(ax, ay, r + 7, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(ax, ay, r, 0, TAU); g.clip();
  const im = img(sh.d.avatar);
  if (im) g.drawImage(im, ax - r, ay - r, r * 2, r * 2);
  else { g.fillStyle = '#5b3bb0'; g.fillRect(ax - r, ay - r, r * 2, r * 2); g.fillStyle = '#fff'; g.font = `900 70px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(((sh.d.name || '?').trim()[0] || '?').toUpperCase(), ax, ay + 4); }
  g.restore();
  const tier = tierOf(sh.d.coins);
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.font = `900 46px ${FONT}`; g.fillStyle = '#ffffff';
  let name = sh.d.name; while (g.measureText(name).width > 560 && name.length > 2) name = name.slice(0, -2) + '…';
  g.fillText((tier ? '👑 ' : '') + name, ax + r + 26, H2 - 16 - bh / 2 - 14);
  g.font = `700 28px ${FONT}`; g.fillStyle = '#ffe9a8';
  g.fillText(sh.label || `tặng ${sh.count > 1 ? sh.count + '× ' : ''}${sh.gift.name} · ${sh.value}💎${tier ? ' · ' + tier.name : ''}`, ax + r + 26, H2 - 16 - bh / 2 + 28);
  // chữ cảm ơn
  g.textAlign = 'right'; g.font = `900 40px ${FONT}`;
  g.fillStyle = `hsl(${(t * 120) % 360},100%,70%)`;
  g.fillText('CẢM ƠN! 💖', W2 - 40, H2 - 16 - bh / 2);
  // nhãn LIVE
  g.fillStyle = '#ff2d55'; g.fillRect(36, 34, 120, 46); g.fillStyle = '#fff'; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.fillText('● LIVE', 96, 58);
  ledOverTex.needsUpdate = true;
}
function updateLedShow(t, dt) {
  if (ledShow && (t > ledShow.until || !dancers.has(ledShow.d.id))) ledShow = null;
  if (!ledShow && ledQueue.length) { ledShow = ledQueue.shift(); ledShow.start = t; ledShow.until = t + Math.max(4, Number(S.ledSeconds) || 12); ledCam.position.set(0, 3, 8); }
  led.material = ledShow ? ledLiveMat : lcd ? lcd.idleMaterial(ledIdleMat) : ledIdleMat;
  ledOver.visible = !!ledShow;
  sign.visible = !ledShow && (!lcd || lcd.signVisible());
  if (!ledShow) return;
  const d = ledShow.d;
  // máy quay riêng: chính diện, nửa người trên
  const h = d._head, sc = d.body.h * d.sc;
  let yaw = d.av ? d.av.holder.rotation.y : 0;
  let tx = h.x, ty = h.y - 0.45 * sc, tz = h.z;
  let dist = 2.3 * sc;
  if (ledShow.vip && d.vipTable && d.mode === 'vip') {   // khung hình bàn VIP: khách + bàn đầy đồ
    // nhắm vào bàn (hơi lệch về phía khách), máy quay cao nhìn xuống: bàn nằm nửa trên màn (nửa dưới bị bàn DJ che)
    const v = d.vipTable; tx = v.x + (h.x - v.x) * 0.3; ty = 0.3; tz = v.z + (h.z - v.z) * 0.3; dist = 2.2; yaw = vipSeat(d.vipSeat || 0).yaw;
  }
  const k = 1 - Math.pow(0.05, dt);
  _v1.set(tx + Math.sin(yaw) * dist + Math.sin(t * 0.5) * 0.4, (ledShow.vip ? 1.55 : ty + 0.15 * sc), tz + Math.cos(yaw) * dist);   // bàn VIP: nhìn từ trên xuống thấy rõ đồ trên bàn
  if (!ledShow.snapped) { ledCam.position.copy(_v1); ledShow.snapped = true; } else ledCam.position.lerp(_v1, Math.max(k, 0.25));
  ledCam.lookAt(tx, ty, tz);
  if (!ledShow.lastDraw || t - ledShow.lastDraw > 0.1) { drawLedOverlay(ledShow, t); ledShow.lastDraw = t; }
}
function renderLed() {
  if (!ledShow) return;
  const prevMat = led.material; led.material = lcd ? lcd.idleMaterial(ledIdleMat) : ledIdleMat;   // tránh hình lồng hình
  ledOver.visible = false;
  // chỉ chiếu riêng người tặng: ẩn tạm người khác
  const hidden = [];
  for (const d of visible) if (d.av && d !== ledShow.d && d.av.holder.visible) { d.av.holder.visible = false; hidden.push(d.av.holder); }
  const crowdOn = shadowMesh.visible; shadowMesh.visible = false;
  renderer.setRenderTarget(ledRT);
  renderer.render(scene, ledCam);
  renderer.setRenderTarget(null);
  for (const h of hidden) h.visible = true;
  shadowMesh.visible = crowdOn;
  led.material = prevMat; ledOver.visible = true;
}
{
  const frame = new THREE.Mesh(new THREE.BoxGeometry(13.6, 6.3, 0.2), darkMat); frame.position.set(0, STAGE_Y + 3.3, -10.45); scene.add(frame);
}
// biển neon
const signTex = canvasTex(1024, 360, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(12,0,30,0.82)'; rr(g, 20, 20, w - 40, h - 40, 60); g.fill();
  g.lineWidth = 14; g.strokeStyle = '#ff4fd8'; g.shadowColor = '#ff4fd8'; g.shadowBlur = 30; rr(g, 20, 20, w - 40, h - 40, 60); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 70px ${FONT}`; g.fillStyle = '#ffd6f5'; g.fillText('VŨ TRƯỜNG', w / 2, 100);
  g.shadowColor = '#41e8ff'; g.shadowBlur = 40; g.font = `900 190px ${FONT}`; g.fillStyle = '#d8fbff'; g.fillText('NEON', w / 2, 238);
});
const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 2.32), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, toneMapped: false }));
sign.position.set(0, STAGE_Y + 4.75, -10.15); scene.add(sign);

// bàn DJ
const boothTex = canvasTex(512, 160, () => {});
let boothName = null;
const booth = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.15, 1.1), new THREE.MeshStandardMaterial({ color: 0x0e0a18, roughness: 0.4, metalness: 0.5 }));
  booth.add(body);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 1.08), new THREE.MeshBasicMaterial({ map: boothTex, toneMapped: false }));
  front.position.z = 0.56; booth.add(front);
  for (const x of [-1.15, 1.15]) {
    const tt = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 32), new THREE.MeshStandardMaterial({ color: 0x222230, metalness: 0.6, roughness: 0.3 }));
    tt.position.set(x, 0.6, 0); booth.add(tt);
    const rec = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.02, 32), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2 }));
    rec.position.set(x, 0.64, 0); booth.add(rec); booth.userData['rec' + x] = rec;
  }
  const mixer = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.7), new THREE.MeshStandardMaterial({ color: 0x333344 })); mixer.position.set(0, 0.6, 0); booth.add(mixer);
  booth.position.set(0, STAGE_Y + 0.575, -6.7);
  scene.add(booth);
}
function updateBooth(name, sub) {
  const k = name + '|' + sub; if (k === boothName) return; boothName = k;
  const { g, canvas: c } = boothTex.userData;
  g.clearRect(0, 0, c.width, c.height);
  const gr = g.createLinearGradient(0, 0, c.width, 0); gr.addColorStop(0, '#ff3d9a'); gr.addColorStop(0.5, '#7c3dff'); gr.addColorStop(1, '#3dd9ff');
  g.fillStyle = '#0d0a16'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = gr; g.lineWidth = 10; rr(g, 6, 6, c.width - 12, c.height - 12, 18); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe9a8';
  let size = 54; g.font = `800 ${size}px ${FONT}`;
  while (g.measureText(name).width > 460 && size > 24) { size -= 2; g.font = `800 ${size}px ${FONT}`; }
  g.fillText(name, c.width / 2, sub ? 62 : 80);
  if (sub) { g.font = `600 26px ${FONT}`; g.fillStyle = 'rgba(255,255,255,0.65)'; g.fillText(sub, c.width / 2, 118); }
  boothTex.needsUpdate = true;
}
// loa
const speakerTex = canvasTex(256, 384, (g, w, h) => {
  g.fillStyle = '#15121e'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#3a3150'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
  for (const [y, r] of [[90, 50], [255, 95]]) {
    const gr = g.createRadialGradient(w / 2, y, 5, w / 2, y, r); gr.addColorStop(0, '#000'); gr.addColorStop(0.5, '#2b2540'); gr.addColorStop(1, '#4a4060');
    g.fillStyle = gr; g.beginPath(); g.arc(w / 2, y, r, 0, TAU); g.fill();
  }
});
const speakers = [];
for (const sd of [-1, 1]) for (let k = 0; k < 2; k++) {
  const sp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 1.3), [darkMat, darkMat, darkMat, darkMat, new THREE.MeshStandardMaterial({ map: speakerTex, roughness: 0.7 }), darkMat]);
  sp.position.set(sd * 7.6, STAGE_Y + 1.2 + k * 2.45, -8.2); scene.add(sp); speakers.push(sp);
}
// cầu disco
const disco = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 3), new THREE.MeshStandardMaterial({ color: 0xdddde8, metalness: 1, roughness: 0.12, flatShading: true, envMapIntensity: 2.5 }));
disco.position.set(0, 8.2, -2); scene.add(disco);
{
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3), metalMat); rope.position.set(0, 9.1, -2); scene.add(rope);
}
// chùm đèn quét
const beamTex = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const beams = [];
const BEAM_COLORS = [0xff3dc8, 0x3ddcff, 0xffd83d, 0x8c5aff, 0x3dff96, 0xff7a3d];
for (let i = 0; i < 6; i++) {
  const geo = new THREE.ConeGeometry(1.5, 13, 24, 1, true); geo.translate(0, -6.5, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: BEAM_COLORS[i], map: beamTex, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(-7.5 + i * 3, 9.4, -4); scene.add(m); beams.push(m);
}
// laser
const lasers = [];
for (let i = 0; i < 12; i++) {
  const geo = new THREE.BoxGeometry(0.035, 0.035, 40); geo.translate(0, 0, 20);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: [0xff3df2, 0x3dfcff, 0xfff13d, 0x7dff3d, 0xff3d6e][i % 5], transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.position.set(i % 2 ? 8 : -8, STAGE_Y + 0.5 + (i % 3) * 0.6, -9.5); scene.add(m); lasers.push(m);
}

// ---------- nhân vật 3D (instancing) ----------
const CAP = 700;
const faceTex = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  const cx = w * 0.25, cy = h * 0.55; g.save(); g.translate(cx, cy); g.scale(1.25, 1.25); g.translate(-cx, -cy);
  // lông mày
  g.strokeStyle = '#3a2418'; g.lineWidth = 5; g.lineCap = 'round';
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(cx + sd * 12, cy - 26); g.quadraticCurveTo(cx + sd * 22, cy - 31, cx + sd * 32, cy - 25); g.stroke(); }
  // mắt
  for (const sd of [-1, 1]) {
    g.fillStyle = '#f4f4f4'; g.beginPath(); g.ellipse(cx + sd * 22, cy - 6, 10, 8, 0, 0, TAU); g.fill();
    g.fillStyle = '#2a1a12'; g.beginPath(); g.arc(cx + sd * 21, cy - 5, 6, 0, TAU); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.arc(cx + sd * 21, cy - 5, 3, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + sd * 19, cy - 8, 2, 0, TAU); g.fill();
  }
  // mũi + miệng
  
  g.fillStyle = '#b8424f'; g.beginPath(); g.moveTo(cx - 13, cy + 25); g.quadraticCurveTo(cx, cy + 38, cx + 13, cy + 25); g.quadraticCurveTo(cx, cy + 29, cx - 13, cy + 25); g.fill();
  g.fillStyle = 'rgba(255,120,120,0.22)'; g.beginPath(); g.arc(cx - 30, cy + 14, 8, 0, TAU); g.arc(cx + 30, cy + 14, 8, 0, TAU); g.fill(); g.restore();
});
faceTex.colorSpace = THREE.SRGBColorSpace;

function cap(r, len, sx = 1, sz = 1) { const g = new THREE.CapsuleGeometry(r, len, 6, 14); g.translate(0, -len / 2, 0); g.scale(sx, 1, sz); return g; }
function hemiGeo(r, sy = 1) {
  // tóc: chỏm đầu + phần sau, chừa khuôn mặt phía trước (+Z)
  const top = new THREE.SphereGeometry(r, 28, 10, 0, TAU, 0, PI * 0.3);
  const back = new THREE.SphereGeometry(r, 28, 14, PI / 2 + 0.85, TAU - 1.7, 0, PI * 0.6);
  const fringe = new THREE.SphereGeometry(r * 1.01, 16, 6, PI / 2 - 0.9, 1.8, PI * 0.18, PI * 0.16);
  return mergeGeometries([top, back, fringe]).scale(1, sy, 1);
}

const HEAD_Y = 0.13, HEAD_R = 0.14;
const hairGeos = [
  // 0: ngắn
  hemiGeo(HEAD_R * 1.07, 1).translate(0, HEAD_Y + 0.005, -0.006),
  // 1: dài
  mergeGeometries([hemiGeo(HEAD_R * 1.08, 1).translate(0, HEAD_Y + 0.003, -0.004), cap(0.13, 0.26, 1.1, 0.42).translate(0, HEAD_Y + 0.04, -0.085)]),
  // 2: búi
  mergeGeometries([hemiGeo(HEAD_R * 1.07, 1).translate(0, HEAD_Y + 0.005, -0.006), new THREE.SphereGeometry(0.08, 16, 12).translate(0, HEAD_Y + 0.17, -0.08)]),
  // 3: dựng
  mergeGeometries([hemiGeo(HEAD_R * 1.07, 0.95).translate(0, HEAD_Y + 0.01, -0.006), ...[-0.06, 0, 0.06].flatMap(x => [-0.05, 0.03].map(z => new THREE.ConeGeometry(0.045, 0.12, 8).translate(x, HEAD_Y + 0.17, z)))]),
  // 4: buộc đuôi ngựa
  mergeGeometries([hemiGeo(HEAD_R * 1.08, 1).translate(0, HEAD_Y + 0.004, -0.005), cap(0.055, 0.24).rotateX(0.35).translate(0, HEAD_Y + 0.1, -0.15)]),
];
const glassesGeo = mergeGeometries([
  new THREE.BoxGeometry(0.07, 0.04, 0.01).translate(-0.045, 0, 0), new THREE.BoxGeometry(0.07, 0.04, 0.01).translate(0.045, 0, 0), new THREE.BoxGeometry(0.03, 0.01, 0.01),
]).translate(0, HEAD_Y + 0.01, HEAD_R * 0.97);
const crownGeo = mergeGeometries([
  new THREE.CylinderGeometry(0.1, 0.105, 0.06, 16, 1, true),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => new THREE.ConeGeometry(0.025, 0.07, 6).translate(Math.sin(i / 8 * TAU) * 0.1, 0.06, Math.cos(i / 8 * TAU) * 0.1)),
]).translate(0, HEAD_Y + 0.15, 0);
const wingShape = new THREE.Shape();
wingShape.moveTo(0, 0); wingShape.quadraticCurveTo(0.25, 0.45, 0.75, 0.42); wingShape.quadraticCurveTo(0.6, 0.25, 0.68, 0.18);
wingShape.quadraticCurveTo(0.45, 0.1, 0.55, 0.0); wingShape.quadraticCurveTo(0.3, -0.04, 0.36, -0.16); wingShape.quadraticCurveTo(0.15, -0.1, 0, 0);
const wingGeo = new THREE.ShapeGeometry(wingShape, 12);
const shadowTex = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });

const matStd = (o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff, roughness: 0.62, metalness: 0.02 }, o));
const PARTS = [];
function part(name, geo, mat, node, color, opts = {}) {
  const mesh = new THREE.InstancedMesh(geo, mat, CAP * (opts.double ? 2 : 1));
  mesh.frustumCulled = false; mesh.count = 0;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  if (color) { mesh.setColorAt(0, new THREE.Color()); mesh.instanceColor.setUsage(THREE.DynamicDrawUsage); }
  scene.add(mesh);
  const p = { name, mesh, node, color, ...opts };
  PARTS.push(p); return p;
}
// vải: nhiễu nhẹ cho bề mặt quần áo
const fabricTex = canvasTex(256, 256, (g, w, h) => {
  const id = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const x = i % w, y = (i / w) | 0;
    const v = 228 + Math.random() * 22 + ((x + y) % 4 === 0 ? -10 : 0);
    id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255;
  }
  g.putImageData(id, 0, 0);
});
fabricTex.wrapS = fabricTex.wrapT = THREE.RepeatWrapping; fabricTex.repeat.set(3, 3);
const clothMat = matStd({ roughness: 0.82, map: fabricTex });
const shinyMat = matStd({ roughness: 0.35, metalness: 0.15 });
const skinMat = matStd({ roughness: 0.55 });
const L = d => d.look;
function lathe(pts, sz, seg = 28, ps = 0, pl = TAU) { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, ps, pl); g.scale(1, 1, sz); return g; }
const M_PTS = [[0.001, -0.02], [0.135, -0.01], [0.145, 0.06], [0.13, 0.17], [0.15, 0.3], [0.168, 0.4], [0.16, 0.47], [0.11, 0.53], [0.05, 0.555], [0.001, 0.56]];
const F_PTS = [[0.001, -0.02], [0.145, -0.01], [0.15, 0.06], [0.115, 0.18], [0.135, 0.3], [0.148, 0.4], [0.14, 0.47], [0.1, 0.53], [0.045, 0.55], [0.001, 0.555]];
const bust = () => [new THREE.SphereGeometry(0.05, 14, 10).scale(1.1, 0.9, 0.6).translate(-0.055, 0.36, 0.07), new THREE.SphereGeometry(0.05, 14, 10).scale(1.1, 0.9, 0.6).translate(0.055, 0.36, 0.07)];
const torsoM = lathe(M_PTS, 0.68);
const torsoF = mergeGeometries([lathe(F_PTS, 0.68), ...bust()]);
// lớp áo khoác: hai vạt, hở phía trước (lathe: góc 0 = +Z)
const grow = (pts, k) => pts.map(([r, y]) => [r * k + 0.004, y]);
const jacketGeo = (pts) => mergeGeometries([
  lathe(grow(pts.slice(1, 8), 1.07), 0.7, 24, 0.32, TAU - 0.64),
  new THREE.TorusGeometry(0.085, 0.022, 8, 20, PI * 1.5).rotateX(PI / 2).rotateY(PI * 0.25 + PI).translate(0, 0.52, 0),
]);
const jacketM = jacketGeo(M_PTS), jacketF = jacketGeo(F_PTS);
// áo crop: phần ngực trở lên
const cropGeo = mergeGeometries([lathe(grow(F_PTS.slice(4, 10), 1.02), 0.69), ...bust().map(g => g.scale(1.04, 1.04, 1.04))]);
// áo hoodie: mũ trùm sau gáy + túi trước + dây
const hoodGeo = new THREE.SphereGeometry(0.13, 18, 12, PI / 2 + 1.0, TAU - 2.0, 0, PI * 0.62).scale(1.05, 0.75, 0.95).translate(0, 0.02, -0.06);
const pocketGeo = new THREE.BoxGeometry(0.2, 0.09, 0.03).translate(0, 0.14, 0.092);
const stringGeo = mergeGeometries([new THREE.CylinderGeometry(0.006, 0.006, 0.12).translate(-0.03, -0.08, 0.105), new THREE.CylinderGeometry(0.006, 0.006, 0.12).translate(0.03, -0.08, 0.105)]);
// in hình áo thun
const PRINTS = ['NEON', '★', '☺', '♥', 'VIBE', '⚡', '92', 'SG'];
const printTex = PRINTS.map((p, i) => canvasTex(128, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
  const c = ['#ff3d8b', '#ffd84d', '#3dd9ff', '#ffffff', '#c8ff3d', '#ff8a3d', '#ffffff', '#b9a3e8'][i];
  g.fillStyle = c; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 6;
  g.font = `900 ${p.length > 2 ? 40 : 84}px ${FONT}`; g.strokeText(p, w / 2, h / 2 + 4); g.fillText(p, w / 2, h / 2 + 4);
}));
const printGeo = new THREE.CylinderGeometry(0.152, 0.152, 0.12, 12, 1, true, -0.55, 1.1).scale(1, 1, 0.71).translate(0, 0.33, 0);
// quần
const pelvisGeo = new THREE.SphereGeometry(0.16, 18, 12).scale(1.12, 0.85, 0.85);
const cuffGeo = new THREE.TorusGeometry(0.06, 0.022, 8, 16).rotateX(PI / 2).translate(0, 0.03, 0);
const pocketLeg = sd => new THREE.BoxGeometry(0.035, 0.11, 0.1).translate(sd * 0.085, -0.22, 0);
const wideShin = new THREE.CylinderGeometry(0.075, 0.105, 0.42, 16, 1, true).translate(0, -0.21, 0);
const skirtGeo = new THREE.CylinderGeometry(0.17, 0.3, 0.36, 24, 3, true);
{ const p = skirtGeo.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getX(i), p.getZ(i)); const k = 1 + 0.06 * Math.sin(a * 12) * (0.5 - p.getY(i) / 0.36); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } skirtGeo.computeVertexNormals(); }
skirtGeo.translate(0, -0.12, 0);
const dressGeo = new THREE.CylinderGeometry(0.17, 0.34, 0.66, 24, 1, true).translate(0, -0.27, 0);
// giày sneaker: thân + đế trắng dày
const shoeUpper = new THREE.CapsuleGeometry(0.056, 0.14, 4, 12).rotateX(PI / 2).scale(1.05, 0.8, 1).translate(0, -0.02, 0.05);
const shoeSole = new THREE.CapsuleGeometry(0.06, 0.16, 4, 12).rotateX(PI / 2).scale(1.1, 0.35, 1.02).translate(0, -0.06, 0.05);
// mũ / phụ kiện
const capGeo = mergeGeometries([
  new THREE.SphereGeometry(HEAD_R * 1.12, 24, 10, 0, TAU, 0, PI * 0.48).translate(0, HEAD_Y + 0.02, -0.005),
  new THREE.CylinderGeometry(0.12, 0.12, 0.012, 20, 1, false, -PI / 2, PI).scale(1, 1, 0.9).translate(0, HEAD_Y + 0.035, HEAD_R * 0.95),
]);
const capBackGeo = capGeo.clone().rotateY(PI);
const beanieGeo = mergeGeometries([
  new THREE.SphereGeometry(HEAD_R * 1.13, 24, 12, 0, TAU, 0, PI * 0.5).scale(1, 1.18, 1).translate(0, HEAD_Y + 0.025, 0),
  new THREE.TorusGeometry(HEAD_R * 1.1, 0.02, 8, 24).rotateX(PI / 2).translate(0, HEAD_Y + 0.04, 0),
]);
const bucketGeo = mergeGeometries([
  new THREE.CylinderGeometry(HEAD_R * 0.95, HEAD_R * 1.15, 0.12, 20, 1, false).translate(0, HEAD_Y + 0.09, 0),
  new THREE.CylinderGeometry(HEAD_R * 1.15, HEAD_R * 1.75, 0.04, 24, 1, true).translate(0, HEAD_Y + 0.02, 0),
]);
const headphoneGeo = mergeGeometries([
  new THREE.TorusGeometry(0.085, 0.014, 8, 24, PI).rotateX(PI / 2).translate(0, 0.03, -0.01),
  new THREE.CylinderGeometry(0.045, 0.045, 0.035, 16).rotateZ(PI / 2).rotateY(0.5).translate(-0.085, 0.02, 0.03),
  new THREE.CylinderGeometry(0.045, 0.045, 0.035, 16).rotateZ(PI / 2).rotateY(-0.5).translate(0.085, 0.02, 0.03),
]);
const chainGeo = new THREE.TorusGeometry(0.085, 0.007, 6, 28).rotateX(PI / 2 - 0.35).scale(1, 1, 0.8).translate(0, -0.06, 0.035);
const sunglassGeo = mergeGeometries([
  new THREE.CapsuleGeometry(0.022, 0.035, 4, 8).rotateZ(PI / 2).scale(1, 1, 0.3).translate(-0.045, 0, 0),
  new THREE.CapsuleGeometry(0.022, 0.035, 4, 8).rotateZ(PI / 2).scale(1, 1, 0.3).translate(0.045, 0, 0),
  new THREE.BoxGeometry(0.03, 0.008, 0.008), new THREE.BoxGeometry(0.21, 0.008, 0.008).translate(0, 0.015, -0.005),
]).translate(0, HEAD_Y + 0.012, HEAD_R * 0.98);

const HAS_HOOD = d => L(d).top === 'hoodie';
const IS_JACKET = d => L(d).top === 'jacket' || L(d).top === 'bomber';
const LEG_CLOTH = d => ['jeans', 'joggers', 'cargo', 'wide'].includes(L(d).bottom);
part('pelvis', pelvisGeo, clothMat, 'hips', 'pelvis', { scale: d => d.body.hipS });
part('torsoM', torsoM, clothMat, 'spine', 'torso', { when: d => !d.body.female });
part('torsoF', torsoF, clothMat, 'spine', 'torso', { when: d => d.body.female });
part('crop', cropGeo, clothMat, 'spine', 'shirt', { when: d => L(d).top === 'crop' });
part('jacketM', jacketM, clothMat, 'spine', 'jacket', { when: d => IS_JACKET(d) && !d.body.female });
part('jacketF', jacketF, clothMat, 'spine', 'jacket', { when: d => IS_JACKET(d) && d.body.female });
part('hood', hoodGeo, clothMat, 'chest', 'shirt', { when: HAS_HOOD });
part('pocket', pocketGeo, clothMat, 'spine', 'shirt', { when: d => HAS_HOOD(d) && !d.body.female });
part('strings', stringGeo, matStd({ color: 0xf2f2ee }), 'chest', null, { when: HAS_HOOD });
PRINTS.forEach((_, i) => part('print' + i, printGeo, new THREE.MeshStandardMaterial({ map: printTex[i], transparent: true, roughness: 0.8, depthWrite: false }), 'spine', null, { when: d => L(d).print === i && !d.body.female }));
part('shoulder', new THREE.SphereGeometry(0.068, 14, 10), clothMat, ['shL', 'shR'], 'uarm', { double: true });
part('elbow', new THREE.SphereGeometry(0.052, 12, 8), clothMat, ['elL', 'elR'], 'farm', { double: true });
part('knee', new THREE.SphereGeometry(0.07, 12, 8), clothMat, ['knL', 'knR'], 'shin', { double: true });
part('belt', new THREE.CylinderGeometry(0.15, 0.15, 0.04, 24).scale(1, 1, 0.7).translate(0, 0.02, 0), matStd({ color: 0x1b1b1f, roughness: 0.4 }), 'spine', null, { when: d => LEG_CLOTH(d) && !d.body.female && L(d).top !== 'hoodie' });
part('skirt', skirtGeo, matStd({ roughness: 0.75, side: THREE.DoubleSide, map: fabricTex }), 'hips', 'pants', { when: d => L(d).bottom === 'skirt' });
part('dress', dressGeo, matStd({ roughness: 0.3, metalness: 0.25, side: THREE.DoubleSide }), 'hips', 'pants', { when: d => L(d).bottom === 'dress' });
part('neck', new THREE.CylinderGeometry(0.058, 0.065, 0.12, 12).translate(0, 0.04, 0), skinMat, 'neck', 'skin');
part('head', new THREE.SphereGeometry(HEAD_R, 28, 20).scale(0.93, 1.06, 0.98).translate(0, HEAD_Y, 0), matStd({ map: faceTex, roughness: 0.5 }), 'head', 'skin');
part('ears', mergeGeometries([new THREE.SphereGeometry(0.03, 10, 8).scale(0.6, 1, 0.8).translate(-HEAD_R * 0.93, HEAD_Y, 0), new THREE.SphereGeometry(0.03, 10, 8).scale(0.6, 1, 0.8).translate(HEAD_R * 0.93, HEAD_Y, 0)]), skinMat, 'head', 'skin');
part('nose', new THREE.SphereGeometry(0.022, 10, 8).scale(0.9, 1.1, 1).translate(0, HEAD_Y - 0.015, HEAD_R * 0.97), skinMat, 'head', 'skin');
hairGeos.forEach((g, i) => part('hair' + i, g, matStd({ roughness: 0.45 }), 'head', 'hair', { when: d => L(d).hs === i }));
part('cap', capGeo, clothMat, 'head', 'hat', { when: d => L(d).hat === 'cap' });
part('capBack', capBackGeo, clothMat, 'head', 'hat', { when: d => L(d).hat === 'capBack' });
part('beanie', beanieGeo, clothMat, 'head', 'hat', { when: d => L(d).hat === 'beanie' });
part('bucket', bucketGeo, clothMat, 'head', 'hat', { when: d => L(d).hat === 'bucket' });
part('glasses', sunglassGeo, matStd({ color: 0x0a0a0f, roughness: 0.1, metalness: 0.6 }), 'head', null, { when: d => L(d).glasses });
part('headphones', headphoneGeo, shinyMat, 'neck', 'acc', { when: d => L(d).neck === 'headphones' });
part('chain', chainGeo, matStd({ color: 0xffc928, metalness: 1, roughness: 0.25 }), 'chest', null, { when: d => L(d).neck === 'chain' });
part('crown', crownGeo, matStd({ color: 0xffc928, metalness: 1, roughness: 0.25, emissive: 0x553300 }), 'head', null, { when: d => d._crown });
part('uarm', cap(0.06, 0.25), clothMat, ['shL', 'shR'], 'uarm', { double: true });
part('farm', cap(0.05, 0.22), clothMat, ['elL', 'elR'], 'farm', { double: true });
part('hand', new THREE.SphereGeometry(0.058, 12, 10).scale(0.9, 1.15, 0.72).translate(0, -0.03, 0), skinMat, ['haL', 'haR'], 'skin', { double: true });
part('thigh', cap(0.088, 0.39), clothMat, ['hipL', 'hipR'], 'thigh', { double: true });
part('shin', cap(0.068, 0.38), clothMat, ['knL', 'knR'], 'shin', { double: true, when: d => L(d).bottom !== 'wide' });
part('shinWide', wideShin, clothMat, ['knL', 'knR'], 'pants', { double: true, when: d => L(d).bottom === 'wide' });
part('cuff', cuffGeo, clothMat, ['ftL', 'ftR'], 'pants', { double: true, when: d => L(d).bottom === 'joggers' || L(d).bottom === 'cargo' });
part('pocketL', pocketLeg(-1), clothMat, 'hipL', 'pants', { when: d => L(d).bottom === 'cargo' });
part('pocketR', pocketLeg(1), clothMat, 'hipR', 'pants', { when: d => L(d).bottom === 'cargo' });
part('shoe', shoeUpper, matStd({ roughness: 0.5 }), ['ftL', 'ftR'], 'shoes', { double: true });
part('sole', shoeSole, matStd({ roughness: 0.6 }), ['ftL', 'ftR'], 'sole', { double: true });
const wingMesh = new THREE.InstancedMesh(wingGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x8899ff, emissiveIntensity: 0.35, side: THREE.DoubleSide, roughness: 0.4 }), CAP * 2);
wingMesh.frustumCulled = false; wingMesh.count = 0; scene.add(wingMesh);
const shadowMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }), CAP);
shadowMesh.frustumCulled = false; shadowMesh.count = 0; shadowMesh.renderOrder = 1; scene.add(shadowMesh);

// khung xương dùng chung để tính toán
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

// ---------- ngoại hình ----------
const SKIN = ['#f6d2b8', '#f0c3a0', '#e3ad86', '#d1996f', '#b07852', '#8d5a3b', '#ffdcc4'];
const HAIR = ['#141418', '#1e1410', '#1e1410', '#3b2416', '#5a3820', '#8a5a2b', '#c9a26b', '#e3cf96', '#7a1f2b', '#b0b0b8', '#d65a9a', '#5b7bd6'];
// bảng màu thời trang
const T = { black: '#1b1b1f', white: '#f2f2ee', cream: '#efe6d2', beige: '#cdb58f', olive: '#5b6b3a', navy: '#1f2a4a', grey: '#8a8d94', charcoal: '#3a3d44', pink: '#f4a6c4', hot: '#ff3d8b', lilac: '#b9a3e8', mint: '#9fe3c6', sky: '#8cc8ff', neon: '#c8ff3d', orange: '#ff8a3d', red: '#d6262f', yellow: '#ffd84d', brown: '#7a4b2a', purple: '#7c3dff', teal: '#16a3a3' };
const DENIM = ['#3b5ba5', '#2c4a86', '#5a7bbf', '#1e2f55', '#8fa8d6'];
const BASIC = [T.black, T.white, T.cream, T.grey, T.charcoal, T.navy];
const POP = [T.hot, T.lilac, T.mint, T.sky, T.neon, T.orange, T.red, T.yellow, T.purple, T.teal, T.pink];
const SNEAKER = ['#e6e4de', '#e6e4de', T.cream, T.black, T.red, T.cream, T.pink, T.neon];
const STYLES_M = ['hoodie', 'denim', 'bomber', 'tee', 'summer', 'tech', 'tee', 'hoodie'];
const STYLES_F = ['cropWide', 'cropSkirt', 'hoodieShorts', 'denimSkirt', 'party', 'teeJeans', 'cropWide', 'cropSkirt'];
const col = h => new THREE.Color(h);
function randomLook(female, keep) {
  const skin = keep ? keep.c.skin : col(pick(SKIN));
  const hair = keep ? keep.c.hair : col(pick(HAIR));
  const hs = keep ? keep.hs0 : (female ? pick([1, 1, 2, 4, 4, 0]) : pick([0, 0, 3, 3, 0, 2]));
  const o = { top: 'tee', bottom: 'jeans', hat: '', neck: '', glasses: Math.random() < 0.15, print: -1, shirt: T.white, jacket: T.black, pants: pick(DENIM), shoes: pick(SNEAKER), hatC: T.black, acc: T.black };
  const style = pick(female ? STYLES_F : STYLES_M);
  switch (style) {
    case 'hoodie': o.top = 'hoodie'; o.shirt = pick([...BASIC, ...POP]); o.bottom = pick(['joggers', 'jeans', 'cargo']); o.pants = o.bottom === 'jeans' ? pick(DENIM) : pick([T.black, T.grey, T.charcoal, T.beige]); o.hat = pick(['', '', 'beanie', 'capBack']); o.print = Math.random() < 0.5 ? Math.floor(Math.random() * 8) : -1; break;
    case 'denim': o.top = 'jacket'; o.jacket = pick(DENIM); o.shirt = pick([T.white, T.black, T.cream, ...POP]); o.bottom = 'jeans'; o.pants = pick([T.black, T.charcoal, T.beige]); o.print = Math.random() < 0.4 ? Math.floor(Math.random() * 8) : -1; o.hat = pick(['', 'cap']); break;
    case 'bomber': o.top = 'bomber'; o.jacket = pick([T.olive, T.black, T.navy, T.pink, T.orange]); o.shirt = pick([T.white, T.black, T.grey]); o.bottom = 'cargo'; o.pants = pick([T.black, T.beige, T.olive, T.charcoal]); o.neck = pick(['chain', 'chain', '']); break;
    case 'tee': o.top = 'tee'; o.shirt = pick([...BASIC, ...POP]); o.print = Math.floor(Math.random() * 8); o.bottom = pick(['jeans', 'cargo', 'joggers']); o.pants = o.bottom === 'jeans' ? pick(DENIM) : pick([T.black, T.beige, T.grey]); o.hat = pick(['cap', 'capBack', 'bucket', '']); o.neck = pick(['', 'chain', 'headphones']); break;
    case 'summer': o.top = 'tank'; o.shirt = pick([T.white, T.black, ...POP]); o.bottom = 'shorts'; o.pants = pick([...DENIM, T.beige, T.black]); o.hat = pick(['bucket', 'capBack', '']); o.neck = pick(['headphones', 'chain', '']); o.glasses = Math.random() < 0.4; break;
    case 'tech': o.top = 'jacket'; o.jacket = T.black; o.shirt = pick([T.charcoal, T.neon, T.orange]); o.bottom = 'cargo'; o.pants = T.black; o.shoes = pick([T.black, T.white]); o.hat = pick(['beanie', 'cap', '']); o.neck = 'headphones'; break;
    case 'cropWide': o.top = 'crop'; o.shirt = pick([T.white, T.black, ...POP]); o.bottom = pick(['wide', 'jeans']); o.pants = pick([...DENIM, T.cream, T.black, T.beige]); o.neck = pick(['', 'chain']); break;
    case 'cropSkirt': o.top = 'crop'; o.shirt = pick([T.white, T.black, ...POP]); o.bottom = 'skirt'; o.pants = pick([T.black, T.grey, T.navy, T.pink, T.lilac, T.cream]); o.legs = Math.random() < 0.3 ? T.black : null; break;
    case 'hoodieShorts': o.top = 'hoodie'; o.shirt = pick([T.lilac, T.pink, T.mint, T.cream, T.grey, T.black, T.sky]); o.bottom = 'shorts'; o.pants = pick([T.black, ...DENIM]); o.hat = pick(['', 'cap', 'beanie']); break;
    case 'denimSkirt': o.top = 'jacket'; o.jacket = pick(DENIM); o.shirt = pick([T.white, T.black, ...POP]); o.bottom = 'skirt'; o.pants = pick([T.black, T.white, T.pink]); break;
    case 'party': o.top = 'tank'; o.shirt = pick([T.hot, T.purple, T.yellow, '#c0c0d0', '#ffc928', T.teal, T.red]); o.bottom = 'dress'; o.pants = o.shirt; o.neck = pick(['chain', '']); break;
    case 'teeJeans': o.top = 'tee'; o.shirt = pick([...BASIC, ...POP]); o.bottom = pick(['jeans', 'wide']); o.pants = pick(DENIM); o.hat = pick(['', 'cap', 'bucket']); break;
  }
  o.hatC = pick([T.black, T.white, T.cream, T.navy, o.shirt, T.red, T.beige]);
  o.acc = pick([T.black, T.white, T.hot, T.sky]);
  let hsNow = hs;
  if (o.hat && (hs === 2 || hs === 3)) hsNow = 0;
  const skinH = '#' + skin.getHexString();
  const sleeveLong = o.top === 'hoodie' || o.top === 'jacket' || o.top === 'bomber';
  const armC = o.top === 'tank' ? skinH : sleeveLong ? (o.top === 'hoodie' ? o.shirt : o.jacket) : o.shirt;
  const legCloth = ['jeans', 'joggers', 'cargo', 'wide'].includes(o.bottom);
  const bare = o.legs || skinH;
  return {
    top: o.top, bottom: o.bottom, hat: o.hat, neck: o.neck, glasses: o.glasses, print: (o.top === 'tee' || o.top === 'hoodie') ? o.print : -1,
    hs: hsNow, hs0: hs,
    c: {
      skin, hair,
      shirt: col(o.shirt), jacket: col(o.jacket), pants: col(o.pants), shoes: col(o.shoes), sole: col(Math.random() < 0.85 ? '#d9d6cf' : T.black),
      hat: col(o.hatC), acc: col(o.acc),
      torso: col(o.top === 'crop' ? skinH : o.shirt),
      uarm: col(armC), farm: col(sleeveLong ? armC : skinH),
      pelvis: col(o.bottom === 'dress' || o.bottom === 'skirt' ? o.pants : o.pants),
      thigh: col(legCloth || o.bottom === 'shorts' ? o.pants : bare),
      shin: col(legCloth ? o.pants : bare),
    },
  };
}
function randomBody(female) {
  return {
    female,
    h: (female ? 0.94 : 1.0) * rand(0.9, 1.1),
    sw: female ? 0.185 : 0.215,
    chestS: new THREE.Vector3(1, 1, 1),
    hipS: female ? new THREE.Vector3(1.1, 1, 1) : new THREE.Vector3(1, 1, 1),
  };
}

// ---------- người nhảy ----------
let nextZ = 0;
class Dancer {
  constructor(user, opts = {}) {
    this.id = user.id; this.name = user.name; this.avatar = user.avatar;
    const female = Math.random() < 0.5;
    this.body = randomBody(female); this.look = randomLook(female);
    this.x = rand(-0.9, 0.9); this.z = rand(0.05, 0.95); this.tx = this.x; this.tz = this.z;
    this.dance = randomDanceIdx();
    this.offset = Math.random() < 0.6 ? 0 : Math.random() * 0.15;
    this.dropH = opts.noDrop ? 0 : rand(9, 13); this.vy = 0; this.land = 0;
    this.lastActive = now(); this.born = now();
    this.mode = 'dance'; this.modeUntil = 0; this.modeStart = 0;
    this.giantUntil = 0; this.wingsUntil = 0; this.crownUntil = 0; this.pairWith = null; this.pairUntil = 0;
    this.comment = ''; this.commentUntil = 0; this.coins = 0; this.wanderAt = now() + rand(4, 12);
    this.sc = 1; this.leaving = 0; this.clone = !!opts.clone; this.cloneUntil = opts.cloneUntil || 0;
    this.jumpStart = 0; this.zi = nextZ++; this.yaw = 0;
    this._head = new THREE.Vector3(); this._feet = new THREE.Vector3();
  }
}
function tierOf(c) {
  if (c >= S.tierEmperor) return { name: 'Hoàng Đế', color: '#ff4d4d', ring: ['#ffe066', '#ff3d3d'] };
  if (c >= S.tierKing) return { name: 'Vua', color: '#ffcf33', ring: ['#fff3b0', '#ffb300'] };
  if (c >= S.tierNoble) return { name: 'Quý Tộc', color: '#5ee7ff', ring: ['#c8f7ff', '#2fa8ff'] };
  return null;
}
function onFloorCount() { let n = 0; for (const d of dancers.values()) if (!d.leaving) n++; return n; }
function pushTicker(text, color, meta = {}) {
  ticker.push({ text, color }); if (ticker.length > 30) ticker.splice(0, ticker.length - 30);
  // sự kiện cũng hiện trên màn LCD (meta.lcd === false: chỉ chạy chữ phía trên)
  if (lcd && meta.lcd !== false) lcd.event({ text, color, user: meta.user ? { name: meta.user.name, avatar: meta.user.avatar } : null, big: !!meta.big });
}

// ---------- nhập vai nhân vật trong danh sách ----------
function pickChar(female) {
  if (!S.rosterEnabled || !ROSTER.length) return null;
  const used = new Set(); for (const d of dancers.values()) if (d.char) used.add(d.char.id);
  let pool = ROSTER.filter(c => !used.has(c.id) && (female === undefined || c.female === female));
  if (!pool.length) pool = ROSTER.filter(c => female === undefined || c.female === female);
  if (!pool.length) pool = ROSTER;
  return pick(pool);
}
function assignChar(d, ch) {
  if (!ch) return;
  d.char = ch;
  if (d.body.female !== ch.female) { d.body = randomBody(ch.female); d.look = randomLook(ch.female); }
  const dn = danceFor(ch.style); if (dn !== null && dn < DANCES.length) d.dance = dn;
  d.tempo = tempoFor(ch.personality); d.hyper = hyperFor(ch.personality);
  d.avOutfit = rosterOutfit(ch); d.avShape = shapeFor(ch.age, ch.female);
  d.avT = templateForChar(ch.id) || null; d.avCostume = null;
  if (d.av) { disposeAvatar(d.av); d.av = null; }
}
function ensureDancer(user, silent) {
  let d = dancers.get(user.id);
  if (d) {
    if (user.name) d.name = user.name;
    if (user.avatar) d.avatar = user.avatar;
    if (user.lv) d.lv = user.lv;
    d.lastActive = now(); d.leaving = 0;
    return d;
  }
  const max = clamp(Number(S.maxDancers) || 150, 5, 600);
  if (onFloorCount() >= max) {
    let old = null;
    for (const x of dancers.values()) {
      if (x.leaving || x.mode !== 'dance' || (zoom && zoom.d === x)) continue;
      if (!old || x.lastActive < old.lastActive) old = x;
    }
    if (old) old.leaving = now(); else return null;
  }
  d = new Dancer(user);
  d.lv = user.lv || 1;
  assignChar(d, pickChar());
  dancers.set(user.id, d);
  if (!silent && S.showJoinTicker) pushTicker(d.char ? `${d.name} lên sàn vai ${d.char.name} · ${d.char.style} 🕺` : `${d.name} lên sàn 🕺`, '#7cf7ff', { lcd: false });
  return d;
}

// ---------- lệnh từ bình luận ----------
const COSTUME_KEYS = [['duong tang', 'tang'], ['tam tang', 'tang'], ['su phu', 'tang'], ['bat gioi', 'batgioi'], ['tru bat gioi', 'batgioi'], ['sa tang', 'satang'], ['sa ngo tinh', 'satang'], ['neon hoa', 'hero_red'], ['anh hung do', 'hero_red'], ['neon bang', 'hero_blue'], ['anh hung xanh duong', 'hero_blue'], ['anh hung xanh', 'hero_blue'], ['neon set', 'hero_yellow'], ['anh hung vang', 'hero_yellow'], ['neon phong', 'hero_green'], ['anh hung la', 'hero_green'], ['neon anh', 'hero_purple'], ['anh hung tim', 'hero_purple'], ['ngo khong', 'wukong'], ['ton ngo khong', 'wukong'], ['te thien', 'wukong'], ['thanh giong', 'giong'], ['son tinh', 'sontinh'], ['thuy tinh', 'thuytinh'], ['ninja', 'ninja'], ['samurai', 'samurai'], ['phi hanh gia', 'astro'], ['hiep si', 'knight'], ['phu thuy', 'wizard'], ['cuop bien', 'pirate'], ['nguoi may', 'robot'], ['ac quy', 'devil'], ['thien than', 'angel'], ['anime', 'anime'], ['sieu anh hung', 'hero'], ['hoang de', 'king']];
const DANCE_KEYS = [];
DANCES.forEach((d, i) => d.keys.forEach(k => DANCE_KEYS.push([normText(k), i])));
DANCE_KEYS.sort((a, b) => b[0].length - a[0].length);
function handleCommand(d, text) {
  const t = normText(text);
  if (!t) return;
  if (featureCommand(d, t)) return;
  const num = t.match(/^(?:dieu\s*)?(\d{1,2})$/);
  if (num) { const n = +num[1]; if (n >= 1 && n <= DANCES.length) { d.dance = n - 1; sparkle(d, 6); } return; }
  if (/\bdi vong\b|\bdi dao\b/.test(t)) { d.mode = 'circle'; d.modeStart = now(); d.modeUntil = now() + 10; d.circleA = Math.random() * TAU; return; }
  if (/\bghep doi\b/.test(t)) { makePair(d); return; }
  if (/\bdoi vai\b/.test(t) || (d.char && /\bdoi do\b|\bthay do\b/.test(t))) { const ch = pickChar(d.body.female); if (ch) { assignChar(d, ch); sparkle(d, 20); pushTicker(`🎭 ${d.name} đổi vai ${ch.name}`, '#7cf7ff', { lcd: false }); return; } }
  if (/\bdoi do\b|\bthay do\b/.test(t)) { d.look = randomLook(d.body.female, d.look); wear(d, Math.random() < 0.5 ? null : randomAllowedCostume(d)); sparkle(d, 14); return; }
  if (/\bhoa trang\b|\bbien hinh\b/.test(t)) { wear(d, randomAllowedCostume(d)); sparkle(d, 20); return; }
  if (/\bbo hoa trang\b|\bdo thuong\b/.test(t)) { wear(d, null); return; }
  if (/\bbiet doi\b|\bsieu nhan\b/.test(t)) { wear(d, pick(['hero_red', 'hero_blue', 'hero_yellow', 'hero_green', 'hero_purple'])); sparkle(d, 20); return; }
  if (/\btay du\b/.test(t)) { wear(d, pick(['wukong', 'tang', 'batgioi', 'satang'])); sparkle(d, 20); return; }
  for (const [k, id] of COSTUME_KEYS) if (t.includes(k)) { wear(d, id); sparkle(d, 20); return; }
  for (const [k, i] of DANCE_KEYS) {
    if (k.length < 2) continue;
    if (t === k || t.startsWith(k + ' ') || t.endsWith(' ' + k) || t.includes(' ' + k + ' ')) { d.dance = i; sparkle(d, 6); return; }
  }
  if (/^nhay\b|\bnhay$/.test(t)) d.jumpStart = now();
}
function makePair(d) {
  const cands = [...dancers.values()].filter(x => x !== d && !x.leaving && !x.clone && x.mode === 'dance' && !x.pairWith);
  if (!cands.length) return;
  const o = pick(cands), until = now() + 20;
  d.pairWith = o; o.pairWith = d; d.pairUntil = o.pairUntil = until;
  o.tx = clamp(d.x + 0.16, -0.9, 0.9); o.tz = d.z; d.tx = clamp(o.tx - 0.16, -0.9, 0.9); d.tz = d.z;
  d.dance = o.dance = 7;
}

// ---------- quà → hành động ----------
function actionFor(ev) {
  if (ev.forceAction) return ev.forceAction;
  const name = String(ev.gift && ev.gift.name || '').toLowerCase();
  const acts = S.actions || [];
  const byGift = acts.filter(a => a.gift && a.gift.toLowerCase() === name).sort((a, b) => (b.min || 0) - (a.min || 0));
  if (byGift.length) return byGift[0].id;
  const val = ev.value || 0;
  let best = null;
  for (const a of acts) { if (a.gift) continue; if ((a.min || 0) <= val && (!best || (a.min || 0) > (best.min || 0))) best = a; }
  if (!best) for (const a of acts) if ((a.min || 0) <= val && (!best || (a.min || 0) > (best.min || 0))) best = a;
  return best ? best.id : 'camera';
}
const actionMeta = id => ACTIONS.find(a => a.id === id) || { id, label: id, icon: '🎁' };
function handleGift(ev) {
  const d = ensureDancer(ev.user);
  if (!d) return;
  d.dropH = Math.min(d.dropH, 2.5);
  d.coins = ev.total || (d.coins + ev.value);
  const id = actionFor(ev), m = actionMeta(id);
  const v = Math.max(1, ev.value || 1);
  const dur = clamp(Number(S.zoomMin) + (Number(S.zoomMax) - Number(S.zoomMin)) * Math.min(1, Math.log10(v) / 3), 1, 30);
  zoomQueue.push({ d, id, label: m.label, icon: m.icon, gift: ev.gift, count: ev.count, dur });
  if (zoomQueue.length > 60) zoomQueue.splice(0, zoomQueue.length - 60);
  pushTicker(`🎁 ${d.name} tặng ${ev.count > 1 ? ev.count + '× ' : ''}${ev.gift.name} → ${m.icon} ${m.label}`, '#ffd84d', { user: d });
  heat += v;
  if (v >= (Number(S.fxCoins) || 99)) { fx.smokeBurst(Math.min(1.5, 0.6 + v / 1000)); fx.sparkle(Math.min(8, 3 + v / 200)); }
  if (S.ledShow !== false && v >= (Number(S.ledCoins) || 99) && (!lcd || lcd.giftAllowed())) {
    const same = ledQueue.find(x => x.d === d);
    if (same) { same.count += ev.count; same.value += v; }
    else if (ledShow && ledShow.d === d) { ledShow.count += ev.count; ledShow.value += v; ledShow.until += 4; }
    else { ledQueue.push({ d, gift: ev.gift, count: ev.count, value: v }); if (ledQueue.length > 20) ledQueue.shift(); }
  }
}
function startAction(z) {
  const d = z.d, t = now();
  d.lastActive = t;
  switch (z.id) {
    case 'outfit': { const ch = S.rosterEnabled && ROSTER.length ? pickChar(d.body.female) : null; if (ch) assignChar(d, ch); else { d.look = randomLook(d.body.female, d.look); wear(d, null); } sparkle(d, 30); break; }   // đồ thật (không hoá trang)
    case 'solo': requestSolo(d); break;
    case 'flashmob': startFlashmob(); break;
    case 'catwalk': d.mode = 'catwalk'; d.modeStart = t; d.modeUntil = t + Math.max(z.dur, 7); d.tx = 0; d.tz = 1; break;
    case 'smoke': fx.smokeBurst(1); break;
    case 'sparkle': fx.sparkle(5); break;
    case 'balloons': balloons(70); break;
    case 'pair': makePair(d); break;
    case 'dj': djOverride = { id: d.id, until: t + 30 }; break;
    // --- hành động quán bar ---
    case 'cheer': cheerFor(d, t); break;
    case 'confetti': confetti(180); flash = Math.max(flash, 0.2); for (const n of nearest(d, 6)) n.jumpStart = t + rand(0, 0.5); break;
    case 'spotlight': spotOn(d, 15, '🔦 Đèn rọi theo'); break;
    case 'champagne': champagne(d, t); break;
    case 'stage': toStage(d, t); break;
    case 'vip': toVip(d, t); break;
    case 'party': partyAll(d, t); break;
  }
}

// ---------- hành động quán bar ----------
function nearest(d, n) {
  return [...dancers.values()].filter(x => x !== d && !x.leaving && x.mode === 'dance').sort((a, b) => Math.hypot(a.x - d.x, a.z - d.z) - Math.hypot(b.x - d.x, b.z - d.z)).slice(0, n);
}
// mọi người quanh đó quay về phía người tặng, nhảy lên vỗ tay
function cheerFor(d, t) {
  for (const n of nearest(d, 10)) { n.jumpStart = t + rand(0, 0.6); n.yaw = Math.atan2(worldX(d.x, d.z) - worldX(n.x, n.z), worldZ(d.z) - worldZ(n.z)); n.lastActive = t; }
  if (d._sp) hearts(d._sp.hx, d._sp.hy - 30, 12);
  sparkle(d, 20);
}
// khui sâm panh: chai cắm pháo sáng giơ cao trên đầu, bạn bè quanh đó nhảy lên
function champagne(d, t) {
  d.bottleUntil = t + 9;
  fx.sparkleAt(() => d.bottleUntil > now() && !d.leaving && d._head ? [d._head.x, d._head.y + 0.42 * (d.body.h * d.sc), d._head.z] : null, 8);
  for (const n of nearest(d, 5)) n.jumpStart = t + rand(0, 0.8);
  confetti(60);
  say(`${nm(d.name)} khui sâm panh! Cạn ly nào!`, 'champ', 4, true);
}
// lên sân khấu nhảy cạnh DJ (2 chỗ hai bên bàn DJ)
const STAGE_SLOTS = [new THREE.Vector3(-3.6, STAGE_Y, -6.3), new THREE.Vector3(4.1, STAGE_Y, -6.3)];
// điệu ngẫu nhiên khi mới lên sàn: không chọn điệu nằm sàn (con sâu) cho đỡ rối
function randomDanceIdx() { let i; do { i = Math.floor(Math.random() * DANCES.length); } while (DANCES[i].floor && Math.random() < 0.85); return i; }
// ---------- MC cầm micro đứng cạnh DJ ----------
const MC_POS = new THREE.Vector3(2.55, STAGE_Y, -6.85), MC_YAW = -0.32, MC_CHAR = 'char66';   // vest navy, cà vạt
let mc = null, mcTalkUntil = 0;
const mic = new THREE.Group(), _micUp = new THREE.Vector3(0, 1, 0);
{
  const h = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, 0.17, 12), new THREE.MeshStandardMaterial({ color: 0x111114, metalness: 0.6, roughness: 0.35 }));
  h.position.y = -0.02; mic.add(h);
  const g = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), new THREE.MeshStandardMaterial({ color: 0xc9ccd4, metalness: 0.9, roughness: 0.4 }));
  g.position.y = 0.075; mic.add(g);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3dd9ff, toneMapped: false }));
  ring.position.y = 0.045; mic.add(ring);
  mic.visible = false; scene.add(mic);
}
function mcPose(bi, t) {
  const talk = t < mcTalkUntil, k = Math.exp(-bi.p * 5);
  const wave = talk ? 0.5 + 0.5 * Math.sin(t * 5) : k;
  return { yaw: 0, walk: -1, bob: 0.02 * k, lean: 0.03 * Math.sin(t * 0.7), lu: -0.35 - 0.9 * wave * (talk ? 1 : 0.6), lf: -0.4 - 0.5 * wave, ru: MC_RU, rf: MC_RF, rsx: MC_RSX, rex: MC_REX, lt: -0.07, ls: 0.02, rt: 0.07, rs: -0.02, head: 0.15 * Math.sin(t * (talk ? 3 : 1.2)), spin: 1, rot: 0, lift: 0, dx: 0, sit: 0 };
}
let MC_RU = -0.8, MC_RF = -0.6, MC_RSX = -1.2, MC_REX = -2.0;
// ---------- nhân viên phục vụ bưng khay rượu đi quanh sàn ----------
// vòng đi: ghé bàn VIP, các bàn tròn đứng (ser = vị trí bàn để quay mặt vào), băng qua phía trước và giữa sàn
const STAFF_PATH = [
  { x: -3.5, z: -3.35, ser: [-3.78, -4.02] }, { x: -2.62, z: -1.95, ser: [-3.25, -2.3] }, { x: -2.2, z: 0.5, ser: [-2.8, 0.1] }, { x: -1.8, z: 2.7, ser: [-2.38, 2.35] },
  { x: 0, z: 3.7 },
  { x: 1.8, z: 2.7, ser: [2.38, 2.35] }, { x: 2.2, z: 0.5, ser: [2.8, 0.1] }, { x: 2.62, z: -1.95, ser: [3.25, -2.3] }, { x: 3.5, z: -3.35, ser: [3.78, -4.02] },
  { x: 1.3, z: -3.1 }, { x: -1.3, z: -3.1 },
];
const STAFF_CHARS = ['char44', 'char50'];   // sơ mi trắng quần tây / sơ mi + áo gile
const staff = [];
function makeTray() {
  const g = new THREE.Group();
  const silver = new THREE.MeshStandardMaterial({ color: 0xd9dce3, metalness: 0.9, roughness: 0.25 });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.012, 28), silver));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.006, 6, 32).rotateX(Math.PI / 2), silver); rim.position.y = 0.008; g.add(rim);
  const glassM = new THREE.MeshStandardMaterial({ color: 0xcfeaff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.4, depthWrite: false });
  const drinks = [0xffd65a, 0xff3d9a, 0xffd65a, 0x3dd9ff].map(c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
  [[-0.07, -0.05], [0.06, -0.07], [0.08, 0.06], [-0.05, 0.08]].forEach(([x, z], i) => {   // ly sâm panh chân cao
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 6), glassM); stem.position.set(x, 0.046, z); g.add(stem);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.012, 0.09, 12), glassM); bowl.position.set(x, 0.13, z); g.add(bowl);
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.012, 0.06, 12), drinks[i]); liq.position.set(x, 0.115, z); g.add(liq);
  });
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.24, 12), new THREE.MeshStandardMaterial({ color: 0x1d5a2c, metalness: 0.3, roughness: 0.1 }));
  bottle.position.set(0, 0.13, 0); g.add(bottle);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.02, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0xd4a84a, metalness: 0.9, roughness: 0.3 }));
  neck.position.set(0, 0.29, 0); g.add(neck);
  g.visible = false; scene.add(g);
  return g;
}
function initStaff() {
  STAFF_CHARS.forEach((cid, i) => {
    const w = new Dancer({ id: '__staff' + i, name: 'Phục vụ', avatar: '' }, { noDrop: true });
    w.body = randomBody(false); w.look = randomLook(false); w.isStaff = true; w.staffChar = cid;
    w.wp = i === 0 ? 0 : 5; w.px = STAFF_PATH[w.wp].x; w.pz = STAFF_PATH[w.wp].z; w.dir = i === 0 ? 1 : -1;   // hai người đi ngược chiều nhau
    w.wait = 0; w.walkPh = Math.random(); w.tray = makeTray();
    staff.push(w);
  });
}
function updateStaff(t, dt) {
  for (const w of staff) {
    if (!w.avT && t > (w._charPoll || 0)) { w._charPoll = t + 0.5; const tp = templateForChar(w.staffChar); if (tp) { w.avT = tp; if (w.av) { disposeAvatar(w.av); w.av = null; } } }
    const n = STAFF_PATH.length, target = STAFF_PATH[w.wp];
    if (w.wait > 0) {
      w.wait -= dt; w.walking = false;
      if (target.ser) w.yaw = Math.atan2(target.ser[0] - w.px, target.ser[1] - w.pz);
      if (w.wait <= 0) w.wp = (w.wp + w.dir + n) % n;
      continue;
    }
    const dx = target.x - w.px, dz = target.z - w.pz, dist = Math.hypot(dx, dz);
    // né khách: lực đẩy từ người đứng phía trước, đông thì đi chậm lại; khách quá gần thì bước sang bên nhường đường
    let ax = 0, az = 0, crowd = 0;
    const fx = dist > 1e-4 ? dx / dist : 0, fz = dist > 1e-4 ? dz / dist : 0;
    for (const d of dancers.values()) {
      if (!d._last || d.leaving || d.dropH > 0) continue;
      const rx = w.px - d._last.x, rz = w.pz - d._last.z, r2 = rx * rx + rz * rz;
      if (r2 > 1.1 * 1.1 || r2 < 1e-6) continue;
      const r = Math.sqrt(r2), ahead = -(rx * fx + rz * fz) / r;   // >0: khách ở phía trước
      if (ahead > -0.2) { const k = (1.1 - r) / 1.1; ax += rx / r * k * (0.6 + ahead); az += rz / r * k * (0.6 + ahead); crowd += k * Math.max(0, ahead); }
      if (r < 0.6 && (d.mode === 'dance' || d.mode === 'circle') && !d.pairWith) {
        const push = (0.6 - r) * Math.min(1, dt * 4), hw = Math.max(0.5, halfW(d.z));
        const nx = -rx / r * push / hw, nz = -rz / r * push / 9;
        d.x = clamp(d.x + nx, -0.9, 0.9); d.tx = clamp(d.tx + nx, -0.9, 0.9);
        d.z = clamp(d.z + nz, 0, 1); d.tz = clamp(d.tz + nz, 0, 1);
      }
    }
    let mx = fx + ax * 1.4, mz = fz + az * 1.4; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
    if (mx * fx + mz * fz < 0.2) { mx = fx * 0.2 + (-fz) * Math.sign(ax * -fz + az * fx || 1); mz = fz * 0.2 + fx * Math.sign(ax * -fz + az * fx || 1); const l = Math.hypot(mx, mz); mx /= l; mz /= l; }   // không quay ngược: lách ngang
    const step = 1.05 * dt * clamp(1 - crowd * 0.35, 0.35, 1);
    if (dist <= Math.max(step, 0.06)) { w.px = target.x; w.pz = target.z; if (target.ser) w.wait = rand(2.2, 3.5); else w.wp = (w.wp + w.dir + n) % n; }
    else {
      w.px += mx * step; w.pz += mz * step; w.walking = true;
      const want = Math.atan2(mx, mz); let dy = want - w.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); w.yaw += dy * Math.min(1, dt * 6);   // quay người mượt
      w.walkPh = (w.walkPh + 1.6 * step / 1.05) % 1;
    }
  }
}
function staffPose(w, bi, t) {
  const P = SPECIAL_POSES;
  const o = w.walking ? Object.assign({}, P.walk(w.walkPh)) : { yaw: 0, walk: -1, bob: 0, lean: 0, lu: -0.18, lf: -0.15, ru: 0.18, rf: 0.15, lt: -0.07, ls: 0.02, rt: 0.07, rs: -0.02, head: 0, spin: 1, rot: 0, lift: 0, dx: 0, sit: 0 };   // đứng thẳng khi phục vụ
  // tay phải: cánh tay khép sát người, cẳng tay đưa ngang ra trước, ngửa bàn tay đỡ khay; phục vụ thì đưa khay ra
  o.ru = 0.18; o.rf = 0.15; o.rsx = w.walking ? -0.25 : -0.6; o.rex = w.walking ? -1.45 : -1.15;
  if (!w.walking) { o.lu = -0.25; o.lf = -0.3; o.head = 0.15 * Math.sin(t * 1.5); }
  return o;
}   // tay phải đưa ra trước, gập khuỷu: micro sát miệng
function toStage(d, t) {
  const used = new Set([...dancers.values()].filter(x => x.mode === 'stage' && t < x.modeUntil).map(x => x.stageSlot));
  let slot = [0, 1].find(i => !used.has(i)); if (slot === undefined) slot = Math.random() < 0.5 ? 0 : 1;
  startTravel(d, t); d.mode = 'stage'; d.stageSlot = slot; d.modeStart = t; d.modeUntil = t + 30; d.dance = pick([4, 5, 13, 1, 6]);
  sparkle(d, 30); fx.sparkle(3, slot === 0 ? 'side' : 'side');
}
// ngồi bàn VIP: ngồi sofa ở bộ salon
function vipSeat(i) {
  const [x, z, ry] = SALONS[i >> 1], sx = (i & 1) ? 0.5 : -0.5;
  const c = Math.cos(ry), s = Math.sin(ry), lx = sx, lz = -0.56;
  return { pos: new THREE.Vector3(x + lx * c + lz * s, 0, z - lx * s + lz * c), yaw: ry };
}
function toVip(d, t) {
  const used = new Set([...dancers.values()].filter(x => x.mode === 'vip' && t < x.modeUntil).map(x => x.vipSeat));
  let seat = [0, 1, 2, 3].find(i => !used.has(i)); if (seat === undefined) seat = Math.floor(Math.random() * 4);
  startTravel(d, t); d.mode = 'vip'; d.vipSeat = seat; d.modeStart = t; d.modeUntil = t + 38; d.bottleUntil = t + 11;
  fx.sparkleAt(() => d.bottleUntil > now() && d._head ? [d._head.x, d._head.y + 0.4, d._head.z] : null, 7);
  say(`Mời ${nm(d.name)} vào bàn VIP!`, 'vip', 4, true);
  // màn LCD chiếu cận cảnh bàn VIP (đồ trên bàn nhỏ, toàn cảnh khó thấy)
  const [sx, sz, sry] = SALONS[seat >> 1];
  d.vipTable = new THREE.Vector3(sx + Math.sin(sry) * 0.56, 0.5, sz + Math.cos(sry) * 0.56);
  if (S.ledShow !== false && (!lcd || lcd.giftAllowed())) {
    const lab = '🛋️ Bàn VIP · trái cây · sâm panh';
    if (ledShow && ledShow.d === d) { ledShow.vip = true; ledShow.label = lab; ledShow.snapped = false; ledShow.until = Math.max(ledShow.until, t + 14); }
    else {
      const i = ledQueue.findIndex(x => x.d === d); if (i >= 0) ledQueue.splice(i, 1);   // gộp với khung “quà lớn” đang chờ của chính người này
      ledQueue.unshift({ d, gift: { name: '' }, count: 1, value: 0, label: lab, vip: true });
    }
  }
}
// bao cả sàn: sâm panh cho cả sàn — khói, pháo sáng, pháo giấy, bong bóng, ai cũng nhảy lên
function partyAll(d, t) {
  for (const n of dancers.values()) if (!n.leaving && n.mode === 'dance') n.jumpStart = t + rand(0, 1.2);
  confetti(260); balloons(80); fx.smokeBurst(1.5); fx.sparkle(9); flash = Math.max(flash, 0.4);
  d.bottleUntil = t + 10; fx.sparkleAt(() => d.bottleUntil > now() && d._head ? [d._head.x, d._head.y + 0.42, d._head.z] : null, 10);
  pushTicker(`🥂 ${d.name} BAO CẢ SÀN! 🥂`, '#ffd84d', { big: true });
  say(`${nm(d.name)} bao cả sàn! Cảm ơn đại gia!`, 'party', 0, true);
  startClip('bao-san', 15);
}

// ---------- hạt hiệu ứng (lớp 2D phía trên) ----------
const qMul = () => S.quality === 'low' ? 0.3 : S.quality === 'medium' ? 0.6 : 1;
function sparkle(d, n) {
  const p = screenOf(d);
  for (let i = 0; i < n * qMul(); i++) particles.push({ x: p.x + rand(-40, 40) * p.s, y: p.y - rand(0, 220) * p.s, vx: rand(-60, 60), vy: rand(-160, -30), g: 80, life: rand(0.5, 1.1), max: 1.1, color: pick(['#fff', '#ffd84d', '#7cf7ff', '#ff7ad9']), size: rand(3, 7), type: 'star' });
}
function launchRocket() { rockets.push({ x: rand(150, 930), y: 1000, vy: rand(-1200, -1000), ty: rand(150, 520), color: pick(['#ff3d7f', '#ffd84d', '#7cf7ff', '#a3e635', '#c084fc', '#ff8a3d']) }); }
function explode(x, y, color) {
  const n = Math.round(80 * qMul()) + 10;
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = rand(150, 520); particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 220, drag: 0.97, life: rand(0.9, 1.6), max: 1.6, color: Math.random() < 0.2 ? '#fff' : color, size: rand(3, 6), type: 'spark' }); }
  flash = Math.max(flash, 0.25);
}
function balloons(n) { n = Math.round(n * (0.4 + 0.6 * qMul())); for (let i = 0; i < n; i++) particles.push({ x: rand(30, 1050), y: H + rand(0, 900), vx: rand(-20, 20), vy: rand(-320, -200), g: 0, life: 8, max: 8, color: pick(['#ff3d7f', '#ffd84d', '#2fa8ff', '#29d17d', '#9b5cff', '#ff8a3d']), size: rand(28, 46), type: 'balloon', wob: Math.random() * TAU }); }
function confetti(n) { n = Math.round(n * qMul()); for (let i = 0; i < n; i++) particles.push({ x: rand(0, W), y: rand(-200, 0), vx: rand(-60, 60), vy: rand(150, 380), g: 30, life: 5, max: 5, color: pick(['#ff3d7f', '#ffd84d', '#7cf7ff', '#a3e635', '#c084fc', '#fff']), size: rand(8, 16), type: 'confetti', rot: Math.random() * TAU, vr: rand(-8, 8) }); }
function hearts(x, y, n) { for (let i = 0; i < n; i++) particles.push({ x: x + rand(-30, 30), y, vx: rand(-30, 30), vy: rand(-140, -80), g: 0, life: 1.8, max: 1.8, color: pick(['#ff3d7f', '#ff7ab8', '#ff4d6d']), size: rand(14, 24), type: 'heart' }); }

// ---------- vị trí ----------
// sàn hẹp dần về phía máy quay; có bàn ghế quán bar thì chừa hai bên + hai góc trước sân khấu cho bộ salon
const halfW = z => S.barEnabled === false ? 4.2 - z * 1.9 : Math.min(3.1 - z * 1.75, z < 0.2 ? 2.7 : 9);
const worldX = (x, z) => x * halfW(z);
const worldZ = z => -4.6 + z * 9.0;
const DJ_POS = new THREE.Vector3(0, STAGE_Y, -7.45);
const THRONE_POS = new THREE.Vector3(0, 0, 3.4);
function currentDJ() {
  const t = now();
  const free = d => d && !d.leaving && (d.mode === 'dance' || d.mode === 'circle') && !d.pairWith;
  if (djOverride && t < djOverride.until) { const d = dancers.get(djOverride.id); if (free(d)) return d; }
  if (S.topDJ && TOP.length) { const d = dancers.get(TOP[0].id); if (free(d)) return d; }
  return resident;
}
// vị trí gốc (chân) trong thế giới 3D
const _base = new THREE.Vector3();
// đi bộ chuyển chỗ (lên sân khấu, vào bàn VIP, quay về sàn) thay vì nhảy cóc
const _trTo = new THREE.Vector3();
function startTravel(d, t) {
  const from = d._last ? d._last.clone() : new THREE.Vector3(worldX(d.x, d.z), 0, worldZ(d.z));
  d.trFrom = from; d.trT0 = t; d.trDur = 0;   // độ dài tính ở khung hình đầu (khi biết điểm đến)
}
function basePos(d, t, dj) {
  const p = rawBasePos(d, t, dj);
  if (d.trT0 && d !== dj) {
    if (!d.trDur) d.trDur = clamp(d.trFrom.distanceTo(p) / 1.4, 0.8, 4);
    const k = (t - d.trT0) / d.trDur;
    if (k < 1) {
      _trTo.copy(p); const e = k * k * (3 - 2 * k);
      p.set(d.trFrom.x + (_trTo.x - d.trFrom.x) * e, d.trFrom.y + (_trTo.y - d.trFrom.y) * Math.min(1, e * 1.4), d.trFrom.z + (_trTo.z - d.trFrom.z) * e);
      const dx = _trTo.x - d.trFrom.x, dz = _trTo.z - d.trFrom.z;
      if (dx * dx + dz * dz > 0.01) d.yaw = Math.atan2(dx, dz);
      d.travelling = true;
    } else { d.trT0 = 0; d.travelling = false; }
  }
  (d._last || (d._last = new THREE.Vector3())).copy(p);
  return p;
}
function rawBasePos(d, t, dj) {
  if (d === dj) { d.yaw = 0; return _base.copy(DJ_POS); }
  if (d === mc) { d.yaw = MC_YAW; return _base.copy(MC_POS); }
  if (d.isStaff) return _base.set(d.px, 0, d.pz);   // DJ quay mặt ra khán giả
  const bx = worldX(d.x, d.z), bz = worldZ(d.z);
  if (d.mode === 'rocket') {
    const k = (t - d.modeStart) / 4.5;
    const up = k < 0.45 ? Math.pow(k / 0.45, 2) : k < 0.6 ? 1 : 1 - Math.pow((k - 0.6) / 0.4, 2);
    return _base.set(bx, up * 16, bz);
  }
  if (d.mode === 'cloud') {
    const k = t - d.modeStart, a = k * 0.6;
    const e = Math.min(Math.min(1, k / 2), Math.min(1, (d.modeUntil - t) / 2));
    const cx = Math.sin(a) * 3, cz = 0.3 + Math.sin(a * 2) * 2.6;
    return _base.set(bx + (cx - bx) * e, 2.4 * e, bz + (cz - bz) * e);
  }
  if (d.mode === 'throne') return _base.copy(THRONE_POS);
  if (d.mode === 'stage') { d.yaw = 0; return _base.copy(STAGE_SLOTS[d.stageSlot || 0]); }
  if (d.mode === 'vip') { const v = vipSeat(d.vipSeat || 0); d.yaw = v.yaw; return _base.copy(v.pos); }
  if (d.mode === 'solo') return _base.set(d.soloSide * 1.25, STAGE_Y, -5.95);
  return _base.set(bx, 0, bz);
}

// ---------- tư thế ----------
function poseFor(d, bi, t, dj) {
  const P = SPECIAL_POSES;
  if (d.dropH > 0) return P.fall();
  if (d === dj) return P.dj(bi.p, bi.b);
  if (d === mc) return mcPose(bi, t);
  if (d.isStaff) return staffPose(d, bi, t);
  if (d.travelling) return P.walk((t * 1.7 + d.zi * 0.37) % 1);
  if (d.mode === 'rocket') return P.fly();
  if (d.mode === 'throne' || d.mode === 'vip') return P.sit(bi.p);
  if (d.jumpStart && t - d.jumpStart < 0.8) return P.jump((t - d.jumpStart) / 0.8);
  if (d.mode === 'catwalk') return d.moving ? P.catwalk((t * 1.4) % 1) : P.pose();
  if (d.moving || d.mode === 'circle') return P.walk((t * 1.7 + d.zi * 0.37) % 1);
  const forced = d.forceUntil > t;
  let p = bi.p + (forced ? 0 : d.offset), b = bi.b; if (p >= 1) { p -= 1; b += 1; }
  if (d.tempo === 0.5 && !forced && !bi.fire) { p = ((b & 1) + p) / 2; b = b >> 1; }
  return DANCES[forced ? d.forceDance : d.dance].f(p, b, t);
}

function legPose(hip, knee, foot, a, s) {
  if (Math.abs(a) > 0.6) { hip.rotation.set(-(Math.abs(a) - 0.1), 0, Math.sign(a) * 0.2); knee.rotation.set(Math.abs(s) * 0.8, 0, 0); }
  else { hip.rotation.set(-Math.abs(s) * 0.55, 0, a * 0.9); knee.rotation.set(Math.abs(s) * 1.15, 0, 0); }
  foot.rotation.set(-hip.rotation.x - knee.rotation.x, 0, 0);
}
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
function poseRig(d, p, base, t, grounded) {
  const b = d.body;
  rig.root.position.copy(base);
  rig.root.rotation.set(0, d.yaw + (p.yaw || 0), 0);
  rig.root.scale.setScalar(b.h * d.sc);
  rig.hips.position.set((p.dx || 0) * 1.4, 0.88, 0);
  rig.hips.rotation.set(p.rot || 0, 0, 0);
  rig.spine.rotation.set(p.sit ? -0.05 : 0.04, 0, -p.lean);
  rig.neck.rotation.set(0, 0, -p.head * 0.4);
  rig.head.rotation.set(0.05, p.head * 0.3, -p.head * 0.5);
  rig.shL.position.x = -b.sw; rig.shR.position.x = b.sw;
  rig.shL.rotation.set(-0.18 * Math.abs(Math.sin(p.lu)), 0, p.lu);
  rig.elL.rotation.set(-0.35 * Math.min(1, Math.abs(p.lf)) - 0.1, 0, p.lf);
  rig.shR.rotation.set(-0.18 * Math.abs(Math.sin(p.ru)), 0, p.ru);
  rig.elR.rotation.set(-0.35 * Math.min(1, Math.abs(p.rf)) - 0.1, 0, p.rf);
  // đưa tay ra trước (MC cầm micro): rsx = vai gập trước/sau, rex = khuỷu gập trước
  if (p.rsx !== undefined) rig.shR.rotation.x = p.rsx;
  if (p.rex !== undefined) rig.elR.rotation.x = p.rex;
  if (p.lsx !== undefined) rig.shL.rotation.x = p.lsx;
  if (p.lex !== undefined) rig.elL.rotation.x = p.lex;
  if (p.walk >= 0) {
    const ph = p.walk * TAU, sw = Math.sin(ph);
    rig.hipL.rotation.set(0.5 * sw, 0, -0.03); rig.knL.rotation.set(Math.max(0, -Math.sin(ph - 0.6)) * 0.9 + 0.05, 0, 0);
    rig.hipR.rotation.set(-0.5 * sw, 0, 0.03); rig.knR.rotation.set(Math.max(0, Math.sin(ph - 0.6)) * 0.9 + 0.05, 0, 0);
    rig.ftL.rotation.set(0, 0, 0); rig.ftR.rotation.set(0, 0, 0);
    if (p.lsx === undefined) rig.shL.rotation.x = -0.45 * sw; if (p.rsx === undefined) rig.shR.rotation.x = 0.45 * sw;   // tay bưng khay không đánh theo bước
  } else if (p.sit) {
    rig.hipL.rotation.set(-1.5, 0, -0.08); rig.knL.rotation.set(1.5, 0, 0); rig.ftL.rotation.set(0, 0, 0);
    rig.hipR.rotation.set(-1.5, 0, 0.08); rig.knR.rotation.set(1.5, 0, 0); rig.ftR.rotation.set(0, 0, 0);
  } else {
    legPose(rig.hipL, rig.knL, rig.ftL, p.lt, p.ls);
    legPose(rig.hipR, rig.knR, rig.ftR, p.rt, p.rs);
  }
  rig.root.updateMatrixWorld(true);
  if (p.sit) {
    // ngồi trên ngai: đặt hông ở độ cao ghế
    rig.hips.getWorldPosition(_v1);
    rig.root.position.y += (d.mode === 'vip' ? 0.5 : 0.62) - (_v1.y - base.y);   // ngai cao 0.62 m, sofa 0.5 m
  } else if (grounded) {
    // chạm đất: điểm thấp nhất (chân / đầu / tay) nằm trên mặt sàn
    let minY = Infinity;
    for (const n of [rig.ftL, rig.ftR, rig.haL, rig.haR]) { n.getWorldPosition(_v1); minY = Math.min(minY, _v1.y - 0.06 * b.h * d.sc); }
    rig.head.getWorldPosition(_v1); _v2.set(0, HEAD_Y + HEAD_R, 0).applyMatrix4(rig.head.matrixWorld); minY = Math.min(minY, _v2.y, _v1.y);
    rig.root.position.y += base.y - minY;
  }
  rig.root.position.y += (p.lift || 0) * 1.7 * b.h * d.sc;
  rig.root.updateMatrixWorld(true);
  // điểm gắn tên + chân
  d._head.set(0, HEAD_Y + HEAD_R + 0.06, 0).applyMatrix4(rig.head.matrixWorld);
  d._head.y = Math.max(d._head.y, rig.root.position.y + 0.4);
  d._feet.set(rig.root.position.x, base.y, rig.root.position.z);
}

const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _sv = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const WHITE = new THREE.Color(1, 1, 1);
function writeInstances(d, t, alpha) {
  for (const p of PARTS) {
    if (d.av) continue;
    if (p.when && !p.when(d)) continue;
    const nodes = Array.isArray(p.node) ? p.node : [p.node];
    for (const nn of nodes) {
      const node = rig[nn];
      const idx = p.mesh.count++;
      if (p.scale) { const s = p.scale(d); _m2.makeScale(s.x, s.y, s.z); _m.multiplyMatrices(node.matrixWorld, _m2); }
      else _m.copy(node.matrixWorld);
      if (alpha < 1) { _m2.makeScale(alpha, alpha, alpha); _m.multiply(_m2); }
      p.mesh.setMatrixAt(idx, _m);
      if (p.color) p.mesh.setColorAt(idx, d.look.c[p.color]);
    }
  }
  if (d.av) { setExtra(d.av, 'crown', d._crown); setExtra(d.av, 'wings', d._wings && !(d.av.costume && d.av.costume.id === 'angel')); }
  if (d._wings && !d.av) {
    for (const sd of [-1, 1]) {
      const f = Math.sin(t * 7 + d.zi) * 0.35;
      _e.set(0, sd * (0.55 + f), 0);
      _q.setFromEuler(_e);
      _m2.compose(_v1.set(sd * 0.05, -0.12, -0.12), _q, _sv.set(sd, 1, 1));
      _m.multiplyMatrices(rig.chest.matrixWorld, _m2);
      wingMesh.setMatrixAt(wingMesh.count++, _m);
    }
  }
  // bóng
  const lift = rig.root.position.y - d._feet.y;
  const s = Math.max(0.2, 0.9 - lift * 0.08) * d.body.h * d.sc * alpha;
  _m.compose(_v1.set(rig.root.position.x, d._feet.y + 0.012, rig.root.position.z), _q.identity(), _sv.set(s, 1, s * 0.8));
  shadowMesh.setMatrixAt(shadowMesh.count++, _m);
}

// đạo cụ: mây, ngai, tên lửa
const props = { cloud: [], throne: [], rocket: [] };
function makeCloud() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd6f5, emissiveIntensity: 0.25, roughness: 0.9 });
  for (const [x, y, z, r] of [[-0.6, 0, 0, 0.38], [-0.2, 0.15, 0.1, 0.48], [0.3, 0.12, -0.05, 0.5], [0.75, 0, 0.05, 0.36], [0, -0.05, 0.25, 0.42]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); s.position.set(x, y - 0.3, z); g.add(s); }
  const rainbow = ['#ff3d3d', '#ff9d3d', '#ffe53d', '#3dff7a', '#3db8ff', '#9b5cff'];
  rainbow.forEach((c, i) => { const tor = new THREE.Mesh(new THREE.TorusGeometry(1.4 - i * 0.07, 0.035, 6, 30, PI * 0.5), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); tor.position.set(-1.3, -0.35, 0); tor.rotation.z = PI * 0.5; g.add(tor); });
  scene.add(g); return g;
}
function makeThrone() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc928, metalness: 1, roughness: 0.25 });
  const red = new THREE.MeshStandardMaterial({ color: 0xb3122d, roughness: 0.6 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.75), red); seat.position.y = 0.56; g.add(seat);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.85), gold); base.position.y = 0.25; g.add(base);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 0.14), gold); back.position.set(0, 1.3, -0.38); g.add(back);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.04), red); pad.position.set(0, 1.25, -0.3); g.add(pad);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshStandardMaterial({ color: 0xff3d7f, emissive: 0xff3d7f, emissiveIntensity: 0.6 })); top.position.set(0, 2.2, -0.38); g.add(top);
  for (const x of [-0.5, 0.5]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.75), gold); arm.position.set(x, 0.78, 0); g.add(arm); }
  scene.add(g); return g;
}
function makeRocket() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.6, 16), new THREE.MeshStandardMaterial({ color: 0xe8e8f0, metalness: 0.5, roughness: 0.3 })); body.position.y = -0.3; g.add(body);
  for (let i = 0; i < 3; i++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.25), new THREE.MeshStandardMaterial({ color: 0xff3d3d })); fin.position.set(Math.sin(i * TAU / 3) * 0.26, -0.5, Math.cos(i * TAU / 3) * 0.26); fin.rotation.y = i * TAU / 3; g.add(fin); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 12), new THREE.MeshBasicMaterial({ color: 0xffa020, toneMapped: false })); flame.position.y = -1.0; flame.rotation.x = PI; g.add(flame); g.userData.flame = flame;
  scene.add(g); return g;
}
function propsFrame(list, kind, maker) {
  const pool = props[kind];
  while (pool.length < list.length) pool.push(maker());
  pool.forEach((g, i) => { g.visible = i < list.length; if (g.visible) list[i](g); });
}

// ---------- camera ----------
const camPos = CAM_POS.clone(), camLook = CAM_LOOK.clone();
const _tp = new THREE.Vector3(), _tl = new THREE.Vector3();
function updateCam(dt, t) {
  if ((solo.on || inResult(solo)) && solo.a && solo.b) {
    _tl.set(0, STAGE_Y + 1.0, -5.95);
    _tp.set(Math.sin(t * 0.3) * 0.8, 4.3, 1.4);
  } else if (zoom) {
    const d = zoom.d, z = Number(S.camZoom) || 2.4;
    _tl.copy(d._head); _tl.y -= 0.45 * d.body.h * d.sc;
    let dist = 9.5 / z * Math.max(1, d.sc * 0.9);
    if (zoom.id === 'balloons' || zoom.id === 'confetti' || zoom.id === 'party' || zoom.id === 'cheer') dist = Math.max(dist, 10);
    if (d.mode === 'rocket') dist = Math.max(dist, 9);
    const elev = d === currentDJ() ? 1.0 : 0.45 + (1 - clamp(d.z, 0, 1)) * 0.75;
    _tp.copy(_tl).add(_v2.set(0, elev, 1).normalize().multiplyScalar(dist));
    _tp.x += Math.sin(t * 0.4) * 0.6;
  } else if (S.autoCam) {
    const k = t * 0.08;
    _tl.copy(CAM_LOOK); _tl.x += Math.sin(k * 0.7) * 0.6;
    _tp.copy(CAM_POS); _tp.x += Math.sin(k) * 1.6; _tp.y += Math.sin(k * 1.3) * 0.5; _tp.z += Math.cos(k * 0.9) * 0.8;
  } else { _tp.copy(CAM_POS); _tl.copy(CAM_LOOK); }
  const a = 1 - Math.pow(0.03, dt);
  camPos.lerp(_tp, a); camLook.lerp(_tl, a);
  camera.position.copy(camPos);
  if (t < fireUntil && fireLevel >= 3) { const k = 0.012 * fireLevel * (1 - Music.phase); camera.position.x += (Math.random() - 0.5) * k; camera.position.y += (Math.random() - 0.5) * k; }
  camera.lookAt(camLook);
}

// chiếu toạ độ 3D → màn hình 1080×1920
const _pv = new THREE.Vector3();
function project(v) { _pv.copy(v).project(camera); return { x: (_pv.x + 1) / 2 * W, y: (1 - _pv.y) / 2 * H, z: _pv.z }; }
function screenOf(d) {
  const a = project(d._head), b = project(d._feet);
  const s = clamp(Math.abs(b.y - a.y) / 300, 0.3, 3);
  return { x: b.x, y: b.y, hx: a.x, hy: a.y, s, behind: a.z > 1 };
}

// ======================================================================
// cập nhật logic
// ======================================================================
let lastT = now();
function update(t, dt) {
  Music.update();
  const fire = t < fireUntil;
  const target = Number(S.heatTarget) > 0 ? Number(S.heatTarget) : clamp(Math.round(viewers * 4 / 50) * 50, 150, 3000);
  curHeatTarget = target;
  if (heat >= target) fireUp(t, Number(S.fireSeconds || 15));
  if (!fire) { heat = Math.max(0, heat - dt * target * 0.004); if (fireLevel && t > fireUntil + 0.5) fireLevel = 0; }

  if (zoom && (t > zoom.until || (!dancers.has(zoom.d.id) && !zoom.d.clone))) zoom = null;
  if (!zoom && zoomQueue.length) {
    const z = zoomQueue.shift();
    if (dancers.has(z.d.id)) { z.start = t; z.until = t + z.dur; zoom = z; startAction(z); }
  }
  updateFeatures(t, dt);

  const all = [...dancers.values(), ...clones];
  const crowd = all.length;
  for (const d of all) {
    if (d.dropH > 0) { d.vy += 22 * dt; d.dropH -= d.vy * dt; if (d.dropH <= 0) { d.dropH = 0; d.land = t; d.vy = 0; } }
    if (!d.clone && !d.leaving && t - d.lastActive > Number(S.idleSeconds || 420) && d.mode === 'dance' && !(zoom && zoom.d === d)) d.leaving = t;
    if (d.clone && t > d.cloneUntil && !d.leaving) d.leaving = t;
    if (d.mode !== 'dance' && t > d.modeUntil) { if (d.mode === 'solo') { d.dropH = 3; d.vy = 0; } if (d.mode === 'stage' || d.mode === 'vip') startTravel(d, t); d.mode = 'dance'; if (d.tz > 0.85) d.tz = rand(0.2, 0.8); }
    if (d.pairWith && t > d.pairUntil) d.pairWith = null;
    if (d.mode === 'dance' && t > d.wanderAt && !d.pairWith) { d.tx = clamp(d.x + rand(-0.3, 0.3), -0.9, 0.9); d.tz = clamp(d.z + rand(-0.2, 0.2), 0, 1); d.wanderAt = t + rand(6, 16); }
    if (d.mode === 'circle') { d.circleA += dt * 1.0; d.tx = clamp(Math.cos(d.circleA) * 0.6, -0.9, 0.9); d.tz = 0.5 + Math.sin(d.circleA) * 0.35; }
    const dx = d.tx - d.x, dz = d.tz - d.z, dist = Math.hypot(dx, dz);
    const speed = d.mode === 'catwalk' ? 0.13 : (d.mode === 'solo' || d.mode === 'spot') ? 0.7 : d.mode === 'flash' ? 0.9 : 0.16;
    d.moving = dist > 0.015 && d.dropH <= 0 && d.mode !== 'throne' && d.mode !== 'cloud' && d.mode !== 'rocket' && d.mode !== 'solo' && d.mode !== 'stage' && d.mode !== 'vip';
    let targetYaw = 0;
    if (d.moving) {
      const st = Math.min(dist, speed * dt); d.x += dx / dist * st; d.z += dz / dist * st;
      targetYaw = Math.atan2(dx * halfW(d.z), dz * 9);
    } else if (d.mode === 'solo') {
      targetYaw = -d.soloSide * 0.6;
    } else if (d.pairWith) {
      targetYaw = d.pairWith.x > d.x ? 0.9 : -0.9;
    }
    let dy = targetYaw - d.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    d.yaw += dy * Math.min(1, dt * 8);
    if (crowd < 260 && d.mode === 'dance') {
      for (const o of all) {
        if (o === d || o.pairWith === d) continue;
        const ex = d.x - o.x, ez = (d.z - o.z) * 1.4, dd = ex * ex + ez * ez;
        if (dd < 0.005 && dd > 0) { const f = (0.005 - dd) * 30 * dt; d.x += ex * f * 8; d.z += ez * f * 5; }
      }
      d.x = clamp(d.x, -0.95, 0.95); d.z = clamp(d.z, 0, 1);
    }
    if (d.mode === 'rocket' && d._sp && Math.random() < 0.8) particles.push({ x: d._sp.x + rand(-10, 10), y: d._sp.y + 20, vx: rand(-40, 40), vy: rand(150, 300), g: 0, life: 0.5, max: 0.5, color: pick(['#ffd84d', '#ff8a3d', '#ff3d3d', '#fff']), size: rand(6, 14), type: 'spark' });
    if (d.pairWith && d._sp && Math.random() < dt * 2.5) hearts(d._sp.hx, d._sp.hy - 30, 1);
    if (d.hyper && d.mode === 'dance' && Math.random() < dt * 0.08) d.jumpStart = t;
    // mô hình riêng của vai tải xong → thay vào
    if (d.char && !d.avT && t > (d._charPoll || 0)) {
      d._charPoll = t + 0.5;
      const tp = templateForChar(d.char.id);
      if (tp) { d.avT = tp; if (d.av) { disposeAvatar(d.av); d.av = null; } }
    }
    const tsc = t < d.giantUntil ? 2.1 : 1;
    d.sc += (tsc - d.sc) * Math.min(1, dt * 4);
    d._wings = t < d.wingsUntil;
    const tier = tierOf(d.coins);
    d._crown = t < d.crownUntil || (tier && tier.name !== 'Quý Tộc');
  }
  for (const [id, d] of dancers) if (d.leaving && t - d.leaving > 1.2) { disposeAvatar(d.av); d.av = null; dancers.delete(id); }
  for (let i = clones.length - 1; i >= 0; i--) if (clones[i].leaving && t - clones[i].leaving > 1.2) { disposeAvatar(clones[i].av); clones.splice(i, 1); }

  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i]; r.y += r.vy * dt; r.vy += 600 * dt;
    particles.push({ x: r.x, y: r.y, vx: rand(-20, 20), vy: rand(20, 80), g: 0, life: 0.4, max: 0.4, color: '#ffe9a8', size: 4, type: 'spark' });
    if (r.y <= r.ty || r.vy > -100) { explode(r.x, r.y, r.color); rockets.splice(i, 1); }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt; if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.vy += (p.g || 0) * dt; if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; }
    p.x += p.vx * dt; p.y += p.vy * dt; if (p.vr) p.rot += p.vr * dt;
    if (p.type === 'balloon') p.x += Math.sin(t * 2 + p.wob) * 20 * dt;
  }
  if (particles.length > 2500) particles.splice(0, particles.length - 2500);
  if (fire && S.quality !== 'low' && Math.random() < dt * (3 + fireLevel * 2)) confetti(6);
  flash = Math.max(0, flash - dt * 1.5);
}

const stageMood = { hue: 0.75, kick: 0, bass: 0 };
function beatInfo(t) {
  const fire = t < fireUntil;
  let p = Music.phase, b = Music.beat;
  if (fire) { const f = p * 2; b = b * 2 + Math.floor(f); p = f - Math.floor(f); }
  return { p, b, fire };
}

// ---------- cập nhật cảnh 3D ----------
function updateStage(t, bi) {
  // đèn khớp nhạc: phân tích tiếng (trầm/trung/cao, nhịp trống) — không có tiếng thì theo đồng hồ nhịp
  const live = Music.mode !== 'none' && !Music.suspended();
  const kick = live ? Math.max(Music.kick || 0, Math.exp(-bi.p * 7) * 0.35) : Math.exp(-bi.p * 6);
  const bass = live ? (Music.bass || 0) : 0.5 + 0.5 * kick, hat = live ? (Music.hat || 0) : 0, mid = live ? (Music.mid || 0) : 0.5;
  const pulse = Math.max(1 - bi.p, kick);
  stageMood.kick = kick; stageMood.bass = bass;
  if (Music.drop > 0.97 && S.fxOnFire !== false) { Music.drop = 0.96; fx.smokeBurst(1); fx.sparkle(5); flash = Math.max(flash, 0.35); }
  // sàn
  const pat = Math.floor(bi.b / 8) % 4;
  let i = 0;
  for (let ix = 0; ix < TX; ix++) for (let iz = 0; iz < TZ; iz++) {
    const c = ix - TX / 2, r = iz;
    const k = pat === 0 ? ((ix + iz + bi.b) % 4 + 4) % 4 : pat === 1 ? (Math.abs(Math.round(c)) + bi.b) % 4 : pat === 2 ? (TZ - r + bi.b) % 4 : ((r * 3 + ix * 7) + bi.b) % 4;
    const hue = ((themes.hue(k, ix, iz, t, bi.fire) % 1) + 1) % 1;
    const l = k === 0 ? 0.22 + 0.3 * kick : 0.05 + 0.05 * bass + (bi.fire ? 0.06 : 0.015);
    tileColor.setHSL(hue, themes.sat(k), l);
    tileMesh.setColorAt(i++, tileColor);
  }
  tileMesh.instanceColor.needsUpdate = true;
  // bóng đèn sân khấu
  for (let j = 0; j < 40; j++) { tileColor.setHSL(((j * 25 + t * 60) % 360) / 360, 1, (j + bi.b) % 3 === 0 ? 0.25 + 0.45 * kick : 0.08 + 0.3 * hat * ((j + bi.b) % 2)); bulbs.setColorAt(j, tileColor); }
  bulbs.instanceColor.needsUpdate = true;
  // màn LED
  if (S.quality === 'high' || Math.floor(t * 30) % 2 === 0) {
    const { g, canvas: c } = ledTex.userData;
    g.fillStyle = '#05010c'; g.fillRect(0, 0, c.width, c.height);
    const spec = Music.spectrum(), cols = 32, cw = c.width / cols, rows = 14, rh = c.height / rows;
    for (let x = 0; x < cols; x++) {
      let v = spec ? spec[2 + Math.floor(x * 1.6)] / 255 : 0;
      if (!spec || Music.mode === 'none' || Music.suspended()) v = 0.35 + 0.3 * Math.sin(t * 3 + x * 0.5) * pulse;
      const on = Math.round(v * rows);
      for (let y = 0; y < rows; y++) {
        g.fillStyle = y < on ? `hsl(${(x * 8 + t * 40 + y * 6) % 360},95%,${50 + y * 2}%)` : 'rgba(80,40,140,0.18)';
        g.fillRect(x * cw + 1.5, c.height - (y + 1) * rh + 1.5, cw - 3, rh - 3);
      }
    }
    ledTex.needsUpdate = true;
  }
  sign.material.color.setScalar(0.8 + 0.35 * pulse);
  // loa nhún
  for (const sp of speakers) sp.scale.setScalar(1 + 0.03 * pulse * pulse);
  // cầu disco
  disco.rotation.y = t * (0.4 + 0.8 * bass);
  // đèn quét
  const showBeams = S.quality !== 'low';
  beams.forEach((m, j) => {
    m.visible = showBeams;
    m.rotation.z = Math.sin(t * (bi.fire ? 1.6 : 0.7) + j * 1.3) * 0.55;
    m.rotation.x = 0.35 + Math.sin(t * 0.5 + j) * 0.25;
    m.material.opacity = (bi.fire ? 0.22 : 0.13) * (0.45 + 0.55 * Math.max(kick, mid * 0.8));
    m.material.color.setHSL(((stageMood.hue + j * 0.13) % 1 + 1) % 1, 1, 0.6);
  });
  const nL = S.quality === 'low' ? 0 : bi.fire ? Math.min(12, 4 + fireLevel * 2) : 4;
  lasers.forEach((m, j) => {
    m.visible = j < nL && (hat > 0.25 || kick > 0.3 || !live || j < 2);   // tia laser nháy theo hi-hat / trống
    const sd = j % 2 ? -1 : 1;
    m.rotation.y = sd * (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * (bi.fire ? 2.2 : 0.9) + j)));
    m.rotation.x = -0.05 - 0.08 * Math.sin(t * 1.3 + j * 0.7);
  });
  // đèn di động
  movers.forEach((l, j) => { const a = t * (0.5 + j * 0.17) + j * 2; l.position.set(Math.sin(a) * 4, 3.5 + Math.sin(a * 1.7) * 0.8, Math.cos(a * 0.8) * 3); l.intensity = (bi.fire ? 15 : 11) * (0.35 + 0.85 * Math.max(kick, bass * 0.7)); if (Music.kick > 0.95) l.color.setHSL(Math.random(), 1, 0.55); });
  neonStrips.forEach((m, j) => m.material.color.setHSL(((j * 40 + t * 50) % 360) / 360, 1, 0.3 + 0.35 * Math.max(kick, bass * 0.6)));
  stageMood.hue = ((t * 0.05 + bi.b * 0.02) % 1);
  booth.children.forEach(o => { if (o.geometry && o.geometry.type === 'CylinderGeometry') o.rotation.y = t * 4; });
}

// ======================================================================
// lớp HUD 2D
// ======================================================================
function roundRect(x, y, w, h, r) { rr(ctx, x, y, w, h, r); }
function fit(text, maxW) {
  text = String(text || '');
  if (ctx.measureText(text).width <= maxW) return text;
  while (text.length > 1 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1);
  return text + '…';
}
function avatarCircle(u, x, y, r) {
  const im = img(u.avatar);
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  if (im) ctx.drawImage(im, x - r, y - r, r * 2, r * 2);
  else { ctx.fillStyle = '#5b3bb0'; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(r)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(((u.name || '?').trim()[0] || '?').toUpperCase(), x, y + 1); }
  ctx.restore();
}
function drawTag(d, t) {
  const sp = d._sp; if (!sp || sp.behind) return;
  const fade = d.leaving ? clamp(1 - (t - d.leaving) / 1.2, 0, 1) : 1;
  if (fade <= 0) return;
  ctx.globalAlpha = fade;
  const sc = clamp(sp.s, 0.6, 1.5);
  const x = sp.hx, y = sp.hy - 4 * sc, r = 20 * sc;
  const tier = tierOf(d.coins);
  const ay = y - r;
  const ring = ctx.createLinearGradient(x - r, ay - r, x + r, ay + r);
  ring.addColorStop(0, tier ? tier.ring[0] : '#ffffff'); ring.addColorStop(1, tier ? tier.ring[1] : '#b06bff');
  ctx.fillStyle = ring; ctx.beginPath(); ctx.arc(x, ay, r + 3 * sc, 0, TAU); ctx.fill();
  avatarCircle(d, x, ay, r);
  ctx.font = `700 ${Math.round(14 * sc)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const label = (d.lv > 1 ? 'Lv' + d.lv + ' ' : '') + (tier ? tier.name + ' · ' : '') + fit(d.name, 150 * sc);
  const tw = ctx.measureText(label).width + 16 * sc, ny = ay - r - 14 * sc;
  ctx.fillStyle = 'rgba(30,10,60,0.82)'; roundRect(x - tw / 2, ny - 10 * sc, tw, 20 * sc, 10 * sc); ctx.fill();
  ctx.strokeStyle = d.team && (battle.on || inResult(battle)) ? TEAM[d.team].color : tier ? tier.color : 'rgba(255,90,220,0.9)'; ctx.lineWidth = (d.team ? 3 : 1.5) * sc; ctx.stroke();
  ctx.fillStyle = tier ? tier.color : '#fff'; ctx.fillText(label, x, ny + 1);
  if (S.showComments && d.comment && t < d.commentUntil) {
    ctx.font = `600 ${Math.round(15 * sc)}px ${FONT}`;
    const txt = fit(d.comment, 220 * sc);
    const bw = ctx.measureText(txt).width + 20 * sc, by = ny - 30 * sc;
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; roundRect(x - bw / 2, by - 13 * sc, bw, 26 * sc, 12 * sc); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 6 * sc, by + 12 * sc); ctx.lineTo(x + 6 * sc, by + 12 * sc); ctx.lineTo(x, by + 20 * sc); ctx.fill();
    ctx.fillStyle = '#25103f'; ctx.fillText(txt, x, by + 1);
  }
  ctx.globalAlpha = 1;
}
function drawParticles() {
  for (const p of particles) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = p.type === 'balloon' ? 1 : a;
    ctx.fillStyle = p.color;
    if (p.type === 'confetti') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore(); }
    else if (p.type === 'balloon') {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y + p.size); ctx.quadraticCurveTo(p.x + 10, p.y + p.size * 1.8, p.x, p.y + p.size * 2.6); ctx.stroke();
      const g = ctx.createRadialGradient(p.x - p.size * 0.3, p.y - p.size * 0.35, 2, p.x, p.y, p.size);
      g.addColorStop(0, '#ffffffcc'); g.addColorStop(0.25, p.color); g.addColorStop(1, p.color);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * 0.8, p.size, 0, 0, TAU); ctx.fill();
    } else if (p.type === 'heart') {
      const s = p.size; ctx.beginPath(); ctx.moveTo(p.x, p.y + s * 0.3);
      ctx.bezierCurveTo(p.x - s, p.y - s * 0.4, p.x - s * 0.4, p.y - s, p.x, p.y - s * 0.4);
      ctx.bezierCurveTo(p.x + s * 0.4, p.y - s, p.x + s, p.y - s * 0.4, p.x, p.y + s * 0.3); ctx.fill();
    } else if (p.type === 'star') {
      ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < 4; i++) { const a2 = i * PI / 2; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(a2) * p.size * 1.6, p.y + Math.sin(a2) * p.size * 1.6); }
      ctx.stroke(); ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.5, 0, TAU); ctx.fill();
    } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
function pill(x, y, w, h, fill, stroke) { ctx.fillStyle = fill; roundRect(x, y, w, h, h / 2); ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); } }
function rich(parts, cx, y) {
  ctx.textAlign = 'left';
  let w = 0; for (const p of parts) w += ctx.measureText(typeof p === 'string' ? p : p[0]).width;
  let x = cx - w / 2;
  for (const p of parts) { const s = typeof p === 'string' ? p : p[0]; ctx.fillStyle = typeof p === 'string' ? '#fff' : p[1]; ctx.fillText(s, x, y); x += ctx.measureText(s).width; }
}
function wingPlate(cx, cy, w, h, c1, c2) {
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.translate(cx + sd * (w / 2 - 10), cy); ctx.scale(sd, 1);
    const g = ctx.createLinearGradient(0, 0, 120, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(200,220,255,0.6)');
    ctx.fillStyle = g;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(40 + i * 22, -10 + i * 8, 60 - i * 8, 16 - i * 2, -0.35 + i * 0.15, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2); g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; roundRect(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 5; ctx.stroke();
}
function drawZoomBanner(t) {
  const k = clamp((t - zoom.start) / 0.35, 0, 1), out = clamp((zoom.until - t) / 0.3, 0, 1);
  ctx.save(); ctx.globalAlpha = Math.min(k, out); ctx.translate(0, (1 - k) * -60 + hudTopOffset());
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 46px ${FONT}`;
  const at = `${zoom.icon} ${zoom.label}`;
  const aw = Math.max(320, ctx.measureText(at).width + 80);
  wingPlate(W / 2, 250, aw, 86, '#ffcf33', '#c47a00');
  ctx.fillStyle = '#4a1a00'; ctx.fillText(at, W / 2, 253);
  const d = zoom.d, tier = tierOf(d.coins);
  ctx.font = `800 40px ${FONT}`;
  const nm = fit(d.name, 480);
  const nw = Math.max(380, ctx.measureText(nm).width + 150);
  wingPlate(W / 2, 370, nw, 84, '#3b1a8a', '#1c0b45');
  avatarCircle(d, W / 2 - nw / 2 + 50, 370, 32);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.font = `800 40px ${FONT}`; ctx.fillText(nm, W / 2 + 25, 373);
  if (tier) { ctx.font = `800 24px ${FONT}`; ctx.fillStyle = tier.color; ctx.fillText('👑 ' + tier.name, W / 2, 326); }
  if (zoom.gift) { ctx.font = `700 26px ${FONT}`; ctx.fillStyle = '#ffe9a8'; ctx.fillText(`tặng ${zoom.count > 1 ? zoom.count + '× ' : ''}${zoom.gift.name}`, W / 2, 438); }
  if (d.char) { ctx.font = `600 22px ${FONT}`; ctx.fillStyle = '#c8f7ff'; ctx.fillText(fit(`🎭 vai ${d.char.name} · ${d.char.age}t · ${d.char.style}`, 900), W / 2, zoom.gift ? 474 : 440); }
  ctx.restore();
}
function drawHUD(t, bi) {
  ctx.textBaseline = 'middle';
  const onFloor = onFloorCount();
  ctx.font = `800 28px ${FONT}`;
  const txt = `Trên sàn ${onFloor}/${S.maxDancers}  ·  ⏳ Chờ zoom ${zoomQueue.length}`;
  const tw = ctx.measureText(txt).width + 50;
  const hg = ctx.createLinearGradient(W / 2 - tw / 2, 0, W / 2 + tw / 2, 0); hg.addColorStop(0, '#ff3d9a'); hg.addColorStop(1, '#7c3dff');
  pill(W / 2 - tw / 2, 18, tw, 52, 'rgba(25,8,50,0.85)', hg);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(txt, W / 2, 45);
  if (S.showJoinTicker) {
    pill(20, 84, W - 40, 50, 'rgba(25,8,50,0.75)', 'rgba(150,90,255,0.6)');
    ctx.save(); roundRect(30, 84, W - 60, 50, 25); ctx.clip();
    if (!tickerCur && ticker.length) { tickerCur = ticker.shift(); tickerX = W; }
    if (tickerCur) {
      ctx.font = `700 27px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = tickerCur.color;
      ctx.fillText(tickerCur.text, tickerX, 110);
      const w = ctx.measureText(tickerCur.text).width;
      tickerX -= (ticker.length > 4 ? 9 : 5);
      if (tickerX + w < 30) tickerCur = null;
    }
    ctx.restore();
  }
  if (S.showTop && TOP.length) {
    const x = W - 330, y = 150 + (battle.on || inResult(battle) ? 74 : 0);
    ctx.fillStyle = 'rgba(25,8,50,0.72)'; roundRect(x, y, 310, 50 + Math.min(3, TOP.length) * 54, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(255,207,51,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = `900 24px ${FONT}`; ctx.fillStyle = '#ffcf33'; ctx.textAlign = 'left'; ctx.fillText('💎 TOP ĐẠI GIA', x + 18, y + 27);
    TOP.slice(0, 3).forEach((u, i) => {
      const yy = y + 78 + i * 54;
      ctx.font = `800 22px ${FONT}`; ctx.fillStyle = ['#ffd84d', '#d9e2ff', '#ffb27a'][i]; ctx.textAlign = 'left'; ctx.fillText(['①', '②', '③'][i], x + 14, yy);
      avatarCircle(u, x + 66, yy, 20);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = `700 22px ${FONT}`; ctx.fillStyle = '#fff';
      ctx.fillText(fit(u.name, S.showCoins ? 140 : 210), x + 94, yy);
      if (S.showCoins) { ctx.textAlign = 'right'; ctx.fillStyle = '#ffd84d'; ctx.fillText(u.coins + '💎', x + 296, yy); }
    });
  }
  if (S.showGiftMenu) {
    const list = (S.actions || []).filter(a => ACTIONS.some(x => x.id === a.id)).slice().sort((p, q) => (p.min || 0) - (q.min || 0)).map(a => ({ a, m: actionMeta(a.id) }));   // xu thấp → cao
    const x = W - 220, y0 = 1650 - list.length * 42 - 10;
    list.forEach(({ a, m }, i) => {
      const y = y0 + i * 42;
      ctx.fillStyle = 'rgba(25,8,50,0.7)'; roundRect(x, y, 205, 36, 10); ctx.fill();
      const g = a.gift ? GIFTS[a.gift] : null, im = g && img(g.img);
      if (im) ctx.drawImage(im, x + 6, y + 3, 30, 30);
      else { ctx.font = `22px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(m.icon, x + 21, y + 19); }
      ctx.font = `800 18px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(fit(m.label.toUpperCase(), 105), x + 44, y + 19);
      ctx.font = `700 15px ${FONT}`; ctx.textAlign = 'right'; ctx.fillStyle = '#ffd84d'; ctx.fillText(a.gift ? fit(a.gift, 60) : (a.min || 1) + '💎', x + 198, y + 19);
    });
  }
  if (zoom) drawZoomBanner(t);
  drawFeatureHUD(t);
  if (bi.fire && t - fireStart < 4) {
    const k = t - fireStart, s = k < 0.3 ? k / 0.3 * 1.15 : k < 0.5 ? 1.15 - (k - 0.3) * 0.75 : 1;
    ctx.save(); ctx.translate(W / 2, zoom ? 600 + hudTopOffset() : 560); ctx.scale(s * (zoom ? 0.75 : 1), s * (zoom ? 0.75 : 1));
    const g = ctx.createLinearGradient(-380, -80, 380, 80); g.addColorStop(0, '#ff3d00'); g.addColorStop(0.5, '#ffb300'); g.addColorStop(1, '#ff3d00');
    ctx.fillStyle = 'rgba(60,0,40,0.85)'; roundRect(-400, -90, 800, 180, 40); ctx.fill();
    ctx.strokeStyle = g; ctx.lineWidth = 10; ctx.stroke();
    ctx.font = `900 92px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 30; ctx.fillText(fireLevel > 1 ? `🔥 CẤP ${fireLevel}! 🔥` : '🔥 SÀN CHÁY! 🔥', 0, 5);
    ctx.restore();
  }
  const py = 1665, ph = 235;
  const pg = ctx.createLinearGradient(0, py, 0, py + ph); pg.addColorStop(0, 'rgba(40,10,80,0.92)'); pg.addColorStop(1, 'rgba(15,4,35,0.95)');
  ctx.fillStyle = pg; roundRect(20, py, W - 40, ph, 30); ctx.fill();
  const bg = ctx.createLinearGradient(20, 0, W - 20, 0); bg.addColorStop(0, '#3dd9ff'); bg.addColorStop(0.5, '#ff3df2'); bg.addColorStop(1, '#ffb300');
  ctx.strokeStyle = bg; ctx.lineWidth = 5; ctx.stroke();
  ctx.font = `900 32px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd84d';
  ctx.fillText(bi.fire ? `🔥 SÀN CHÁY CẤP ${fireLevel} — còn ${Math.max(0, Math.ceil(fireUntil - t))}s${fireLevel < 5 ? ` · nhiệt ${Math.floor(heat)}/${curHeatTarget} lên cấp` : ''}` : `⚡ Nhiệt sàn ${Math.floor(heat)} / ${curHeatTarget}`, W / 2, py + 36);
  const bx = 60, by = py + 62, bw = W - 120, bh = 34;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(bx, by, bw, bh, 17); ctx.fill();
  const frac = bi.fire ? (fireUntil - t) / Number(S.fireSeconds || 15) : Math.min(1, heat / curHeatTarget);
  if (frac > 0.01) { const fg = ctx.createLinearGradient(bx, 0, bx + bw, 0); fg.addColorStop(0, '#ffb300'); fg.addColorStop(1, '#ff3d3d'); ctx.fillStyle = fg; roundRect(bx, by, Math.max(bh, bw * clamp(frac, 0, 1)), bh, 17); ctx.fill(); }
  ctx.font = `700 25px ${FONT}`;
  rich(['💬 Bình luận để ', ['lên sàn', '#7cf7ff'], ' · gõ ', ['nhảy', '#7cf7ff'], ', ', ['đi vòng', '#7cf7ff'], ', ', ['ghép đôi', '#7cf7ff'], ', ', ['hoá trang', '#7cf7ff']], W / 2, py + 135);
  rich(['điệu: ', ['moonwalk', '#ffd84d'], ', ', ['gangnam', '#ffd84d'], ', ', ['con sâu', '#ffd84d'], ', ', ['2 phút hơn', '#ffd84d'], ', ', ['búa rìu', '#ffd84d'], `… (số 1–${DANCES.length}) · ❤️ thả tim tăng nhiệt`], W / 2, py + 172);
  ctx.font = `500 18px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.textAlign = 'center';
  ctx.fillText('Sàn nhảy giải trí · không có giải thưởng', W / 2, py + 210);
}

// ======================================================================
// vòng lặp
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
  if (lcd) lcd.resize(Math.round(W * view), Math.round(H * view));
  const rw = Math.round(W * pxScale), rh = Math.round(H * pxScale);
  renderer.setSize(rw, rh, false);
  hud.width = rw; hud.height = rh;
  if (S.quality === 'high') { if (!composer) setupComposer(); composer.setSize(rw, rh); }
}

const visible = [];
const _hp = new THREE.Vector3(), _ht = new THREE.Vector3();
function frame() {
  const t = now(); const dt = Math.min(0.1, t - lastT); lastT = t;
  update(t, dt);
  const bi = beatInfo(t);
  updateStage(t, bi);

  // nhân vật
  for (const p of PARTS) p.mesh.count = 0;
  wingMesh.count = 0; shadowMesh.count = 0; teamRing.count = 0;
  // DJ: dùng mô hình riêng public/models/dj.glb nếu có (tải khi cần)
  if (mc && !mc.avT && t > (mc._charPoll || 0)) { mc._charPoll = t + 0.5; const tp = templateForChar(MC_CHAR); if (tp) { mc.avT = tp; if (mc.av) { disposeAvatar(mc.av); mc.av = null; } } }
  if (resident) resident.name = S.djName || 'DJ Tiến Khoa';
  if (resident && !resident.avT && t > (resident._charPoll || 0)) {
    resident._charPoll = t + 0.5;
    const tp = hasCharModel('dj') ? templateForChar('dj') : null;
    if (tp) { resident.avT = tp; if (resident.av) { disposeAvatar(resident.av); resident.av = null; } }
  }
  const dj = currentDJ();
  visible.length = 0;
  if (dj) visible.push(dj);
  if (mc && S.mcEnabled !== false) visible.push(mc);
  const staffOn = S.staffEnabled !== false && S.barEnabled !== false;
  if (staffOn) { updateStaff(t, dt); for (const w of staff) visible.push(w); }
  for (const w of staff) w.tray.visible = staffOn && S.quality !== 'low';
  mic.visible = !!(mc && S.mcEnabled !== false && S.quality !== 'low');
  for (const d of dancers.values()) if (d !== dj) visible.push(d);
  for (const d of clones) visible.push(d);
  const clouds = [], thrones = [], rocketsP = [];
  for (const d of visible) {
    if (PARTS[0].mesh.count >= CAP - 1) break;
    const base = basePos(d, t, dj);
    const pose = poseFor(d, bi, t, dj);
    const airborne = d.mode === 'rocket' || d.mode === 'cloud' || d.dropH > 0;
    const b = base.clone(); if (d.dropH > 0) b.y += d.dropH;
    poseRig(d, pose, b, t, !airborne || d.mode === 'cloud');
    if (d.mode === 'rocket' || (d.dropH > 0)) { rig.root.position.y = b.y; rig.root.updateMatrixWorld(true); d._head.set(0, HEAD_Y + HEAD_R + 0.06, 0).applyMatrix4(rig.head.matrixWorld); }
    const alpha = d.leaving ? clamp(1 - (t - d.leaving) / 1.2, 0.001, 1) : 1;
    const real = avatarTemplates.length > 0 && S.charStyle !== 'toon' && S.quality !== 'low';
    if (real && !d.av) d.av = createAvatar(scene, d.body.female, d.avT, d.avCostume !== undefined && d.avCostume !== null ? d.avCostume : d.char || (d.avT && d.avT.charId) ? null : (Math.random() * 100 < (Number(S.costumeRate) || 0) ? randomAllowedCostume(d) : null), { outfit: d.avOutfit, shape: d.avShape });
    else if (!real && d.av) { disposeAvatar(d.av); d.av = null; }
    if (d.av) {
      _hp.set(0, HEAD_Y, 0).applyMatrix4(rig.head.matrixWorld);
      _ht.set(0, HEAD_Y + 0.3, 0).applyMatrix4(rig.head.matrixWorld);
      driveAvatar(d.av, rig, { yaw: rig.root.rotation.y, scale: d.body.h * d.sc, hipH0: 0.88, flat: !pose.rot && !pose.sit, alpha, floorY: b.y, headPt: _hp, headTop: _ht, beat: 1 - bi.p, sing: d === mc ? (t < mcTalkUntil ? Math.abs(Math.sin(t * 13)) * 0.6 : 0) : (d.zi % 3 === 0) ? Math.max(0, Math.sin(t * 9 + d.zi)) * 0.35 : 0 });
    }
    if (d === mc) {
      // micro nằm trong bàn tay phải của MÔ HÌNH (khung xương điều khiển dài tay hơn người thật)
      const sc = d.body.h * d.sc, B = d.av && d.av.bones;
      // tay “phải” của khung điều khiển lái xương LeftHand của mô hình (mô hình quay mặt ra khán giả nên trái/phải đảo)
      if (B && B.LeftHand && B.LeftForeArm) { B.LeftHand.updateWorldMatrix(true, false); B.LeftHand.getWorldPosition(_v2); B.LeftForeArm.getWorldPosition(_v1); }
      else { rig.elR.getWorldPosition(_v1); rig.haR.getWorldPosition(_v2); }
      // đầu micro chĩa vào miệng: miệng = xương đầu, lùi xuống và ra trước một chút
      if (B && B.Head) { B.Head.getWorldPosition(_v1); } else rig.head.getWorldPosition(_v1);
      _v1.x += Math.sin(MC_YAW) * 0.1 * sc; _v1.z += Math.cos(MC_YAW) * 0.1 * sc; _v1.y += 0.02 * sc;
      mic.position.copy(_v2).lerp(_v1, 0.35);
      _v1.sub(_v2).normalize();
      mic.quaternion.setFromUnitVectors(_micUp, _v1);
      mic.scale.setScalar(1.25 * sc);
    }
    if (d.isStaff) {
      // khay nằm ngang trên bàn tay (xương LeftHand của mô hình = tay phải khung điều khiển)
      const B = d.av && d.av.bones, sc = d.body.h * d.sc;
      if (B && B.LeftHand) { B.LeftHand.updateWorldMatrix(true, false); B.LeftHand.getWorldPosition(_v2); } else rig.haR.getWorldPosition(_v2);
      d.tray.position.set(_v2.x + Math.sin(d.yaw) * 0.06 * sc, _v2.y + 0.035 * sc, _v2.z + Math.cos(d.yaw) * 0.06 * sc);
      d.tray.rotation.set(0, d.yaw, 0); d.tray.scale.setScalar(sc);
    }
    writeInstances(d, t, alpha);
    writeTeamRing(d);
    d._sp = screenOf(d);
    const rx = rig.root.position.x, ry = rig.root.position.y, rz = rig.root.position.z;
    if (d.mode === 'cloud') clouds.push(g => { g.position.set(rx, b.y + 0.05, rz); g.scale.setScalar(d.sc); });
    if (d.mode === 'throne') thrones.push(g => { g.position.copy(THRONE_POS); g.position.z -= 0.15; g.scale.setScalar(d.sc); });
    if (d.mode === 'rocket') rocketsP.push(g => { g.position.set(rx, ry, rz); g.userData.flame.scale.y = 0.7 + Math.random() * 0.6; });
  }
  for (const p of PARTS) { p.mesh.instanceMatrix.needsUpdate = true; if (p.mesh.instanceColor) p.mesh.instanceColor.needsUpdate = true; }
  wingMesh.instanceMatrix.needsUpdate = true; shadowMesh.instanceMatrix.needsUpdate = true;
  teamRing.instanceMatrix.needsUpdate = true; if (teamRing.instanceColor) teamRing.instanceColor.needsUpdate = true;
  propsFrame(clouds, 'cloud', makeCloud);
  propsFrame(thrones, 'throne', makeThrone);
  propsFrame(rocketsP, 'rocket', makeRocket);
  updateBooth(dj && dj !== resident ? '👑 ' + dj.name : '🎧 ' + (S.djName || 'DJ Tiến Khoa'), S.showTop && TOP.length > 1 ? TOP.slice(1, 3).map(u => u.name).join(' · ') : '');

  costumeTime.value = t; outfitTime.value = t;
  fx.enabled.smoke = S.smokeEnabled !== false && S.quality !== 'low'; fx.enabled.spark = S.sparkEnabled !== false;
  fx.density = Math.max(0, Math.min(1, Number(S.smokeDensity ?? 55) / 100));
  fx.update(t, dt, { hue: stageMood.hue, kick: stageMood.kick, level: stageMood.bass });
  bar.visible = S.barEnabled !== false; bar.update(t, stageMood);
  updateLedShow(t, dt);
  if (lcd) lcd.update(t, !!ledShow, !!zoom && !lcd.textActive);   // lời nhắn đợi máy quay zoom xong rồi mới hiện
  updateCam(dt, t);
  if (bloom) bloom.strength = bi.fire ? 0.6 + fireLevel * 0.04 : 0.55;
  renderLed();
  if (S.quality === 'high' && composer) composer.render(); else { renderer.render(scene, camera); if (lcd) lcd.afterRender(renderer); }
  if (lcd) lcd.renderCSS();

  // HUD
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, hud.width, hud.height);
  ctx.setTransform(pxScale, 0, 0, pxScale, 0, 0);
  // nhãn: xa trước, gần sau
  const tags = visible.filter(d => d !== resident && d !== mc && !d.isStaff && d._sp).sort((a, b) => a._sp.y - b._sp.y);
  for (const d of tags) drawTag(d, t);
  drawParticles();
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.35})`; ctx.fillRect(0, 0, W, H); }
  if (bi.fire) { ctx.fillStyle = `rgba(255,60,180,${0.06 * (1 - bi.p)})`; ctx.fillRect(0, 0, W, H); }
  drawHUD(t, bi);
  recordFrame();
  requestAnimationFrame(frame);
}

// ======================================================================
// TÍNH NĂNG THU HÚT: MC, đấu đội, solo, sàn cháy nhiều cấp, đèn chiếu,
// flash mob, bình chọn nhạc, mục tiêu phòng, cấp độ fan, quay clip
// ======================================================================
let isPrimary = true;
const shuffleArr = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const inResult = o => o.result && now() < o.resultUntil;

// ---------- MC giọng nói ----------
const sayRate = new Map();
function say(text, key, gap = 0, prio = false) {
  if (!S.ttsEnabled || !isPrimary || !text) return;
  if (key) { const last = sayRate.get(key) || -1e9; if (now() - last < gap) return; sayRate.set(key, now()); }
  mcTalkUntil = Math.max(mcTalkUntil, now()) + Math.min(8, 0.8 + String(text).length * 0.065);   // MC trên sân khấu mấp máy miệng, khua tay
  if (S.ttsWhere === 'admin') socket.emit('say', text);
  else if (window.MC) { MC.enabled = true; MC.volume = Number(S.ttsVolume) || 1; MC.rate = Number(S.ttsRate) || 1.05; MC.say(text, prio); }
}
const nm = n => (window.MC ? MC.clean(n) : String(n || ''));

// ---------- hoá trang theo cấp độ fan ----------
const costumeLevel = id => Number((S.costumeLevels || {})[id]) || 0;
const canWear = (d, id) => !id || (d.lv || 1) >= costumeLevel(id);
function wear(d, id) {
  if (id && !canWear(d, id)) {
    const c = COSTUMES.find(x => x.id === id);
    pushTicker(`🔒 ${d.name}: cần Lv${costumeLevel(id)} để hoá trang ${c ? c.name : id} (đang Lv${d.lv || 1})`, '#ffb3c7', { lcd: false });
    return false;
  }
  d.avCostume = id;
  if (d.av) setCostume(d.av, id);
  return true;
}
function randomAllowedCostume(d) { const list = COSTUMES.filter(c => canWear(d, c.id)); return list.length ? pick(list).id : null; }

// ---------- đấu đội Đỏ – Xanh ----------
const battle = { on: false, until: 0, start: 0, score: { r: 0, b: 0 }, result: null, resultUntil: 0, nextAuto: 0 };
const TEAM = { r: { name: 'ĐỎ', color: '#ff3d4f', hex: 0xff3d4f }, b: { name: 'XANH', color: '#3d9bff', hex: 0x3d9bff } };
function startBattle() {
  if (battle.on) return;
  Object.assign(battle, { on: true, start: now(), until: now() + (Number(S.battleSeconds) || 180), score: { r: 0, b: 0 }, result: null });
  for (const d of dancers.values()) d.team = null;
  pushTicker('⚔️ ĐẤU ĐỘI BẮT ĐẦU! Gõ 1 vào đội ĐỎ · gõ 2 vào đội XANH', '#ffd84d', { big: true });
  say('Đấu đội bắt đầu! Gõ một để vào đội Đỏ, gõ hai để vào đội Xanh!', null, 0, true);
  flash = 0.4;
}
function joinTeam(d, tm) {
  if (!battle.on || d.team === tm) return;
  d.team = tm; d.tx = tm === 'r' ? -rand(0.2, 0.85) : rand(0.2, 0.85);
  sparkle(d, 8);
}
function autoTeam(d) {
  if (!battle.on || d.team) return;
  let r = 0, b = 0; for (const x of dancers.values()) { if (x.team === 'r') r++; else if (x.team === 'b') b++; }
  joinTeam(d, r <= b ? 'r' : 'b');
}
function addScore(d, pts) { if (!battle.on || !d) return; autoTeam(d); if (d.team) battle.score[d.team] += pts; }
function endBattle(stop) {
  battle.on = false;
  const { r, b } = battle.score; const win = stop ? null : (r === b ? null : (r > b ? 'r' : 'b'));
  if (stop) { for (const d of dancers.values()) d.team = null; return; }
  battle.result = win || 'draw'; battle.resultUntil = now() + 15;
  const T = now();
  for (const d of dancers.values()) {
    if (!d.team || !win) continue;
    if (d.team === win) { d.forceDance = 4; d.forceUntil = T + 15; d.jumpStart = T + Math.random() * 2; }
    else { d.forceDance = 10; d.forceUntil = T + 15; }
  }
  const name = win === 'r' ? 'Đội Đỏ' : win === 'b' ? 'Đội Xanh' : '';
  if (win) { for (let i = 0; i < 8; i++) setTimeout(launchRocket, i * 250); confetti(220); flash = 0.4; }
  pushTicker(win ? `🏆 ${name.toUpperCase()} CHIẾN THẮNG! (${r} – ${b})` : `🤝 HAI ĐỘI HOÀ ${r} – ${b}`, '#ffd84d', { big: true });
  say(win ? `${name} chiến thắng! Đội thua nhảy điệu con gà nhé!` : 'Hai đội hoà nhau!', null, 0, true);
  startClip('doi-dau', 12);
  setTimeout(() => { if (!battle.on) for (const d of dancers.values()) d.team = null; }, 15500);
}
const teamRing = new THREE.InstancedMesh(new THREE.TorusGeometry(0.42, 0.045, 6, 28).rotateX(PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), CAP);
teamRing.frustumCulled = false; teamRing.count = 0; teamRing.setColorAt(0, new THREE.Color()); scene.add(teamRing);
const _tc = new THREE.Color(), _tm = new THREE.Matrix4();
function writeTeamRing(d) {
  if (!d.team || !(battle.on || inResult(battle))) return;
  const s = d.body.h * d.sc;
  _tm.makeScale(s, s, s).setPosition(d._feet.x, d._feet.y + 0.03, d._feet.z);
  teamRing.setMatrixAt(teamRing.count, _tm); teamRing.setColorAt(teamRing.count, _tc.set(TEAM[d.team].hex)); teamRing.count++;
}

// ---------- solo đấu nhảy ----------
const solo = { on: false, a: null, b: null, votes: { 1: 0, 2: 0 }, voters: new Set(), until: 0, start: 0, result: null, resultUntil: 0 };
const soloQueue = [];
function requestSolo(a) {
  if (solo.on || inResult(solo)) { if (!soloQueue.includes(a) && soloQueue.length < 5) soloQueue.push(a); pushTicker(`⚔️ ${a.name} đang chờ lượt thách đấu`, '#ff7ad9', { lcd: false }); return; }
  startSolo(a);
}
function startSolo(a) {
  if (!dancers.has(a.id)) return;
  let pool = [...dancers.values()].filter(x => x !== a && !x.leaving && !x.clone && x.mode === 'dance');
  if (!pool.length) pool = [...dancers.values()].filter(x => x !== a && !x.leaving && !x.clone);
  if (!pool.length) return;
  pool.sort((p, q) => (q.lastComment || 0) - (p.lastComment || 0));
  const b = pick(pool.slice(0, 8));
  const secs = Number(S.soloSeconds) || 20;
  Object.assign(solo, { on: true, a, b, votes: { 1: 0, 2: 0 }, voters: new Set(), start: now(), until: now() + secs, result: null });
  for (const [d, side] of [[a, -1], [b, 1]]) { d.mode = 'solo'; d.soloSide = side; d.modeStart = now(); d.modeUntil = solo.until + 6; d.pairWith = null; d.dropH = 4; d.vy = 0; }
  a.dance = 5; b.dance = 4;
  pushTicker(`⚔️ ${a.name} THÁCH ĐẤU ${b.name}! Gõ 1 hoặc 2 để bình chọn`, '#ff7ad9', { big: true });
  say(`${nm(a.name)} thách đấu ${nm(b.name)}! Gõ một hoặc hai để bình chọn!`, null, 0, true);
  startClip('solo', secs + 6);
}
function voteSolo(d, n) { if (!solo.on || solo.voters.has(d.id) || d === solo.a || d === solo.b) return false; solo.voters.add(d.id); solo.votes[n]++; return true; }
function endSolo() {
  solo.on = false;
  const v1 = solo.votes[1], v2 = solo.votes[2];
  const w = v1 === v2 ? (Math.random() < 0.5 ? 1 : 2) : (v1 > v2 ? 1 : 2);
  const win = w === 1 ? solo.a : solo.b, lose = w === 1 ? solo.b : solo.a;
  solo.result = { win, lose }; solo.resultUntil = now() + 6;
  win.modeUntil = lose.modeUntil = now() + 6;
  const T = now();
  win.crownUntil = T + 40; win.forceDance = 4; win.forceUntil = T + 6; win.jumpStart = T;
  lose.forceDance = 10; lose.forceUntil = T + 6;
  confetti(140); for (let i = 0; i < 4; i++) setTimeout(launchRocket, i * 250);
  pushTicker(`🏆 ${win.name} THẮNG SOLO! (${v1} – ${v2})`, '#ffd84d', { big: true });
  say(`${nm(win.name)} thắng solo!`, null, 0, true);
  if (S.ledShow !== false && (!lcd || lcd.giftAllowed())) ledQueue.unshift({ d: win, gift: { name: '' }, count: 1, value: 0, label: `🏆 Thắng solo ${Math.max(v1, v2)} – ${Math.min(v1, v2)} phiếu` });
}

// ---------- sàn cháy nhiều cấp ----------
let fireLevel = 0;
function fireUp(t, secs) {
  if (t >= fireUntil) fireLevel = 1; else fireLevel = Math.min(5, fireLevel + 1);
  fireUntil = t + secs; fireStart = t; heat = 0;
  confetti(120 + fireLevel * 30); flash = 0.3;
  if (S.fxOnFire !== false) { fx.smokeBurst(0.8 + fireLevel * 0.15); fx.sparkle(4 + fireLevel); }
  pushTicker(`🔥 SÀN CHÁY CẤP ${fireLevel}! 🔥`, '#ff7a3d', { big: true });
  say(fireLevel === 1 ? 'Sàn cháy rồi!' : `Sàn cháy cấp ${fireLevel}!`, 'fire', 3, true);
  if (fireLevel >= 2) startClip('san-chay', 12);
}

// ---------- đèn chiếu ngẫu nhiên ----------
const spot = { d: null, until: 0, next: now() + 40 };
const spotBeam = new THREE.Mesh(new THREE.ConeGeometry(1.0, 11, 24, 1, true).translate(0, -5.5, 0), new THREE.MeshBasicMaterial({ color: 0xfff6c8, map: beamTex, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
spotBeam.visible = false; scene.add(spotBeam);
function runSpotlight() {
  let cands = [...dancers.values()].filter(d => !d.leaving && !d.clone && d.mode === 'dance' && now() - (d.lastComment || 0) < 90);
  if (!cands.length) cands = [...dancers.values()].filter(d => !d.leaving && !d.clone && d.mode === 'dance');
  if (!cands.length) return;
  spotOn(pick(cands), 10);
}
function spotOn(d, secs, label) {
  spot.d = d; spot.until = now() + secs;
  d.mode = 'spot'; d.modeStart = now(); d.modeUntil = now() + secs; d.tx = 0; d.tz = 0.78; d.dance = pick([4, 5, 13, 1]);
  if (!label) {
    pushTicker(`🔦 Đèn chiếu gọi tên ${d.name}!`, '#fff3a0', { user: d });
    say(`Đèn chiếu gọi tên ${nm(d.name)}!`, 'spot', 5);
    if (!zoom && !zoomQueue.length) zoomQueue.push({ d, id: 'camera', label: 'Đèn chiếu', icon: '🔦', dur: 5 });
  }
}

// ---------- flash mob ----------
const flashmob = { until: 0 };
function startFlashmob() {
  const list = [...dancers.values()].filter(d => !d.leaving && !d.clone && d.mode === 'dance');
  if (!list.length) return;
  const n = list.length, cols = Math.max(1, Math.ceil(Math.sqrt(n * 1.6))), rows = Math.ceil(n / cols);
  const dn = pick([4, 5, 3, 7, 13, 6]), secs = Number(S.flashSeconds) || 20, T = now();
  list.forEach((d, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    d.tx = cols > 1 ? -0.85 + 1.7 * c / (cols - 1) : 0; d.tz = rows > 1 ? 0.08 + 0.84 * r / (rows - 1) : 0.5;
    d.mode = 'flash'; d.modeStart = T; d.modeUntil = T + secs; d.forceDance = dn; d.forceUntil = T + secs; d.pairWith = null;
  });
  flashmob.until = T + secs;
  pushTicker('🕺 FLASH MOB! Cả sàn cùng nhảy! 🕺', '#7cf7ff', { big: true });
  say('Flash mob! Cả sàn cùng nhảy nào!', null, 0, true);
  flash = 0.4; startClip('flash-mob', 14);
}

// ---------- bình chọn nhạc ----------
const songVote = { cands: [], votes: [0, 0, 0], voters: new Set() };
function refreshSongVote() {
  const pl = (Music.playlist || []).filter(n => n !== Music.current);
  songVote.cands = shuffleArr(pl).slice(0, 3); songVote.votes = [0, 0, 0]; songVote.voters = new Set();
  Music.requested = null;
}
Music.onTrack = () => refreshSongVote();
function voteSong(d, n) {
  if (!S.songVote || n < 1 || n > songVote.cands.length || songVote.voters.has(d.id)) return;
  songVote.voters.add(d.id); songVote.votes[n - 1]++;
  let best = 0; songVote.votes.forEach((v, i) => { if (v > songVote.votes[best]) best = i; });
  Music.requested = songVote.cands[best];
}

// ---------- mục tiêu phòng → sân khấu mới ----------
const themes = createThemes(scene, { hemi });
const goals = { likes: 0, coins: 0, idx: 0, loaded: false };
const goalNow = () => (S.goalsEnabled ? (S.goals || [])[goals.idx] : null);
const goalVal = g => (g.kind === 'likes' ? goals.likes : goals.coins);
function checkGoal() {
  const g = goalNow(); if (!g || goalVal(g) < g.n) return;
  goals.idx++;
  themes.apply(g.theme);
  for (let i = 0; i < 10; i++) setTimeout(launchRocket, i * 200);
  confetti(250); flash = 0.6;
  const tn = THEME_NAMES[g.theme] || g.theme;
  pushTicker(`🎯 MỤC TIÊU HOÀN THÀNH! Mở khoá sân khấu ${tn.toUpperCase()}!`, '#c8ff3d', { big: true });
  say(`Cả phòng đã mở khoá sân khấu ${tn}!`, null, 0, true);
  themeBanner = { name: tn, until: now() + 4 };
  startClip('mo-khoa', 12);
  saveGoals();
}
let themeBanner = null;
function saveGoals() { socket.emit('goalState', { likes: goals.likes, coins: goals.coins, idx: goals.idx, theme: themes.current }); }
setInterval(() => { if (isPrimary) saveGoals(); }, 5000);

// ---------- quay clip khoảnh khắc ----------
let rec = null;
function startClip(reason, seconds) {
  if (!isPrimary || !S.clipsEnabled || typeof MediaRecorder === 'undefined') return;
  const secs = Math.max(5, Number(seconds) || Number(S.clipSeconds) || 15);
  if (rec) { rec.until = Math.max(rec.until, now() + Math.min(secs, 10)); return; }
  try {
    const cc = document.createElement('canvas');
    const scale = Math.min(1, 1080 / hud.width);
    cc.width = Math.round(hud.width * scale / 2) * 2; cc.height = Math.round(hud.height * scale / 2) * 2;
    const stream = cc.captureStream(30);
    const at = Music.audioStream && Music.audioStream();
    if (at) at.getAudioTracks().forEach(tr => stream.addTrack(tr));
    const mime = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
    if (!mime) return;
    const mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6e6 });
    const chunks = [];
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: mime.split(';')[0] });
      if (blob.size > 10000) fetch('/api/clips?reason=' + encodeURIComponent(reason), { method: 'POST', headers: { 'Content-Type': mime.split(';')[0] }, body: blob }).catch(() => {});
      stream.getTracks().forEach(tr => { if (tr.kind === 'video') tr.stop(); });
    };
    rec = { mr, cc, cx: cc.getContext('2d'), until: now() + secs };
    mr.start(1000);
  } catch (e) { console.warn('Không quay được clip', e); rec = null; }
}
function recordFrame() {
  if (!rec) return;
  const { cx, cc } = rec;
  cx.fillStyle = '#000'; cx.fillRect(0, 0, cc.width, cc.height);
  if (lcd) lcd.drawBehind(cx, cc.width, cc.height);   // ảnh bìa YouTube nằm sau chỗ “đục lỗ”
  cx.drawImage(glCanvas, 0, 0, cc.width, cc.height);
  cx.drawImage(hud, 0, 0, cc.width, cc.height);
  if (now() > rec.until) { try { rec.mr.stop(); } catch (e) {} rec = null; }
}

// ---------- lệnh bình luận của các tính năng (trả về true nếu đã xử lý) ----------
function featureCommand(d, t) {
  d.lastComment = now();
  const n = t.match(/^(?:so\s*)?([12])$/);
  if (n && solo.on) { voteSolo(d, +n[1]); return true; }
  if (battle.on) {
    if (n) { joinTeam(d, n[1] === '1' ? 'r' : 'b'); return true; }
    if (/^(doi\s*)?do$/.test(t)) { joinTeam(d, 'r'); return true; }
    if (/^(doi\s*)?xanh$/.test(t)) { joinTeam(d, 'b'); return true; }
  }
  const bv = t.match(/^bai\s*([1-3])$/);
  if (bv) { voteSong(d, +bv[1]); return true; }
  return false;
}

// ---------- cập nhật mỗi khung hình ----------
function updateFeatures(t, dt) {
  // đấu đội
  if (battle.on && t > battle.until) endBattle();
  const autoMin = Number(S.battleAuto) || 0;
  if (autoMin > 0 && !battle.on && isPrimary) { if (!battle.nextAuto) battle.nextAuto = t + autoMin * 60; if (t > battle.nextAuto) { battle.nextAuto = t + autoMin * 60; if (dancers.size >= 4) startBattle(); } }
  if (battle.on || inResult(battle)) for (const d of dancers.values()) {
    if (!d.team || d.mode !== 'dance') continue;
    if (d.team === 'r' && d.tx > -0.12) d.tx = -rand(0.2, 0.85);
    if (d.team === 'b' && d.tx < 0.12) d.tx = rand(0.2, 0.85);
  }
  // solo
  if (solo.on) {
    if (!dancers.has(solo.a.id) || !dancers.has(solo.b.id)) { solo.on = false; for (const x of [solo.a, solo.b]) x.modeUntil = 0; }
    else if (t > solo.until) endSolo();
  } else if (!inResult(solo) && soloQueue.length) startSolo(soloQueue.shift());
  // dọn chỗ phía trước cho đèn chiếu
  if (spot.d) for (const d of dancers.values()) {
    if (d.mode !== 'dance' || d === spot.d) continue;
    if (d.z > 0.62 && Math.abs(d.x) < 0.55) { d.tz = rand(0.05, 0.55); d.wanderAt = t + 8; }
  }
  // đèn chiếu
  const every = Number(S.spotlightEvery) || 0;
  if (every > 0 && isPrimary !== null && t > spot.next) { spot.next = t + every; if (!solo.on && t > flashmob.until) runSpotlight(); }
  if (spot.d && (t > spot.until || !dancers.has(spot.d.id))) spot.d = null;
  spotBeam.visible = !!spot.d && S.quality !== 'low';
  if (spot.d) { spotBeam.position.set(spot.d._feet.x, 10.6, spot.d._feet.z); spotBeam.material.opacity = 0.26 + 0.08 * Math.sin(t * 6); }
  // mục tiêu
  checkGoal();
  themes.update(t, dt);
  // bình chọn nhạc
  if (S.songVote && Music.mode === 'track' && !songVote.cands.length && (Music.playlist || []).length > 1) refreshSongVote();
}

// ---------- HUD ----------
function drawFeatureHUD(t) {
  let y = 142;
  // thanh đấu đội
  if (battle.on || inResult(battle)) {
    const { r, b } = battle.score, tot = Math.max(1, r + b), fr = r / tot;
    const x = 20, w = W - 40, h = 64;
    ctx.fillStyle = 'rgba(15,4,30,0.88)'; roundRect(x, y, w, h, 20); ctx.fill();
    const bw = w - 330, bx = x + 165;
    ctx.save(); roundRect(bx, y + 14, bw, 36, 18); ctx.clip();
    ctx.fillStyle = TEAM.r.color; ctx.fillRect(bx, y + 14, bw * fr, 36);
    ctx.fillStyle = TEAM.b.color; ctx.fillRect(bx + bw * fr, y + 14, bw * (1 - fr), 36);
    ctx.restore();
    ctx.textBaseline = 'middle'; ctx.font = `900 26px ${FONT}`;
    const fk = n => n >= 10000 ? (n / 1000).toFixed(0) + 'K' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);
    ctx.textAlign = 'left'; ctx.fillStyle = TEAM.r.color; ctx.fillText('ĐỎ ' + fk(r), x + 14, y + 32);
    ctx.textAlign = 'right'; ctx.fillStyle = TEAM.b.color; ctx.fillText(fk(b) + ' XANH', x + w - 14, y + 32);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = `900 24px ${FONT}`;
    if (battle.on) { const left = Math.max(0, Math.ceil(battle.until - t)); ctx.fillText(`⚔️ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} · gõ 1 / 2`, x + w / 2, y + 32); }
    else ctx.fillText(battle.result === 'draw' ? '🤝 HOÀ' : `🏆 ĐỘI ${TEAM[battle.result].name} THẮNG`, x + w / 2, y + 32);
    y += h + 10;
  }
  // mục tiêu phòng
  const g = goalNow();
  if (g) {
    const v = goalVal(g), fr = clamp(v / g.n, 0, 1), x = 20, w = 690, h = 40;
    ctx.fillStyle = 'rgba(15,4,30,0.8)'; roundRect(x, y, w, h, 20); ctx.fill();
    const gg = ctx.createLinearGradient(x, 0, x + w, 0); gg.addColorStop(0, '#22c55e'); gg.addColorStop(1, '#c8ff3d');
    ctx.fillStyle = gg; roundRect(x, y, Math.max(h, w * fr), h, 20); ctx.fill();
    ctx.font = `800 21px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
    const fmt = n => n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0) + 'K' : String(Math.floor(n));
    ctx.fillText(`🎯 ${fmt(v)}/${fmt(g.n)} ${g.kind === 'likes' ? '❤️ tim' : '💎 xu'} → mở sân khấu ${THEME_NAMES[g.theme] || g.theme}`, x + 16, y + h / 2 + 1);
    y += h + 8;
  }
  const tn = Music.trackName();
  if (tn) { ctx.font = `600 20px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillText('♫ ' + fit(tn, 640), 30, y + 14); }
  // solo
  if (solo.on || inResult(solo)) {
    const a = solo.a, b = solo.b, cy = 1260;
    ctx.save();
    ctx.fillStyle = 'rgba(20,4,40,0.88)'; roundRect(90, cy - 80, W - 180, 170, 30); ctx.fill();
    const sg = ctx.createLinearGradient(90, 0, W - 90, 0); sg.addColorStop(0, '#ff3d9a'); sg.addColorStop(1, '#3dd9ff');
    ctx.strokeStyle = sg; ctx.lineWidth = 5; ctx.stroke();
    avatarCircle(a, 170, cy - 15, 46); avatarCircle(b, W - 170, cy - 15, 46);
    ctx.font = `900 54px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd84d'; ctx.fillText('VS', W / 2, cy - 22);
    ctx.font = `800 24px ${FONT}`; ctx.fillStyle = '#fff';
    ctx.fillText(fit('1 · ' + a.name, 300), 290, cy - 40); ctx.fillText(fit('2 · ' + b.name, 300), W - 290, cy - 40);
    ctx.font = `900 34px ${FONT}`; ctx.fillStyle = '#ff7ab8'; ctx.fillText(solo.votes[1], 290, cy + 2); ctx.fillStyle = '#7cd8ff'; ctx.fillText(solo.votes[2], W - 290, cy + 2);
    const tot = Math.max(1, solo.votes[1] + solo.votes[2]), bw = W - 340;
    ctx.fillStyle = '#ff3d9a'; roundRect(170, cy + 48, bw * solo.votes[1] / tot + 1, 18, 9); ctx.fill();
    ctx.fillStyle = '#3dd9ff'; roundRect(170 + bw * solo.votes[1] / tot, cy + 48, bw * solo.votes[2] / tot + 1, 18, 9); ctx.fill();
    ctx.font = `700 22px ${FONT}`; ctx.fillStyle = '#fff';
    ctx.fillText(solo.on ? `⏳ ${Math.max(0, Math.ceil(solo.until - t))}s · gõ 1 hoặc 2 để bình chọn` : `🏆 ${solo.result.win.name} thắng!`, W / 2, cy + 30);
    ctx.restore();
  }
  // bình chọn nhạc
  if (S.songVote && Music.mode === 'track' && songVote.cands.length > 1) {
    const x = 20, h = 34 + songVote.cands.length * 34, yy = 1650 - h - 10;
    ctx.fillStyle = 'rgba(15,4,30,0.78)'; roundRect(x, yy, 520, h, 16); ctx.fill();
    ctx.textAlign = 'left'; ctx.font = `800 20px ${FONT}`; ctx.fillStyle = '#ffd84d'; ctx.fillText('🎵 Bài tiếp theo — gõ "bài 1/2/3"', x + 14, yy + 20);
    songVote.cands.forEach((c, i) => {
      ctx.font = `700 19px ${FONT}`; ctx.fillStyle = Music.requested === c ? '#c8ff3d' : '#fff';
      ctx.fillText(`${i + 1}. ${fit(c.replace(/\.[^.]+$/, ''), 380)}`, x + 14, yy + 54 + i * 34);
      ctx.textAlign = 'right'; ctx.fillText(songVote.votes[i] + ' phiếu', x + 506, yy + 54 + i * 34); ctx.textAlign = 'left';
    });
  }
  // biển mở khoá chủ đề
  if (themeBanner && t < themeBanner.until) {
    ctx.save(); ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,40,10,0.85)'; roundRect(140, 760, W - 280, 140, 34); ctx.fill();
    ctx.strokeStyle = '#c8ff3d'; ctx.lineWidth = 6; ctx.stroke();
    ctx.font = `800 30px ${FONT}`; ctx.fillStyle = '#c8ff3d'; ctx.fillText('🎯 MỞ KHOÁ SÂN KHẤU MỚI', W / 2, 805);
    ctx.font = `900 54px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(themeBanner.name.toUpperCase(), W / 2, 862);
    ctx.restore();
  }
}
const hudTopOffset = () => (battle.on || inResult(battle) ? 74 : 0) + (goalNow() ? 48 : 0);

// ---------- sự kiện từ máy chủ ----------
function featureEvent(ev) {
  const T = now();
  switch (ev.type) {
    case 'chat': case 'like': case 'gift': {
      const d = dancers.get(ev.user.id);
      if (d && ev.user.lv) d.lv = ev.user.lv;
      if (ev.type === 'like') { goals.likes += ev.count; if (d) addScore(d, ev.count); }
      if (ev.type === 'chat' && d) { const k = 'cs' + d.id; if (!sayRate.get(k) || T - sayRate.get(k) > 5) { sayRate.set(k, T); addScore(d, 2); } }
      if (ev.type === 'gift') {
        goals.coins += ev.value || 0;
        if (d) addScore(d, (ev.value || 1) * 10);
        const v = ev.value || 0;
        if (v >= (Number(S.ledCoins) || 99)) { say(`Wow! Cảm ơn ${nm(ev.user.name)} đã tặng ${ev.count > 1 ? ev.count + ' ' : ''}${ev.gift.name}! Mời bạn lên màn hình lớn!`, null, 0, true); startClip('qua-lon', Number(S.clipSeconds) || 15); }
        else if (v >= (Number(S.ttsMinCoins) || 1)) say(`Cảm ơn ${nm(ev.user.name)} đã tặng ${ev.count > 1 ? ev.count + ' ' : ''}${ev.gift.name}`, 'g' + ev.user.id, 4);
      }
      break;
    }
    case 'member': if (S.ttsJoin) say(`Chào mừng ${nm(ev.user.name)}`, 'join', 8); break;
    case 'follow': if (S.ttsFollow !== false) say(`Cảm ơn ${nm(ev.user.name)} đã theo dõi kênh!`, 'follow', 3); break;
    case 'share': say(`Cảm ơn ${nm(ev.user.name)} đã chia sẻ!`, 'share', 6); break;
    case 'welcomeback':
      pushTicker(`🎉 ${ev.user.name} quay lại lần thứ ${ev.sessions} · Lv${ev.user.lv}`, '#c8ff3d', { user: ev.user });
      say(`Chào mừng ${nm(ev.user.name)} quay lại lần thứ ${ev.sessions}!`, 'wb', 6);
      break;
    case 'levelup': {
      const d = dancers.get(ev.user.id); if (d) { d.lv = ev.lv; sparkle(d, 24); }
      pushTicker(`⬆️ ${ev.user.name} lên Lv${ev.lv}!`, '#ffd84d', { user: ev.user });
      if (ev.lv % 5 === 0 || ev.lv <= 3) say(`Chúc mừng ${nm(ev.user.name)} lên cấp ${ev.lv}!`, 'lv', 4);
      const un = Object.entries(S.costumeLevels || {}).filter(([, l]) => Number(l) === ev.lv).map(([id]) => (COSTUMES.find(c => c.id === id) || {}).name).filter(Boolean);
      if (un.length) pushTicker(`🔓 ${ev.user.name} mở khoá hoá trang: ${un.join(', ')}`, '#c8ff3d', { user: ev.user });
      break;
    }
  }
}
function featureCmd(c) {
  if (c.type === 'smoke') fx.smokeBurst(1);
  if (c.type === 'sparkle') fx.sparkle(Math.min(60, Number(c.sec) || 5));
  if (c.type === 'battleStart') startBattle();
  if (c.type === 'battleStop') endBattle(true);
  if (c.type === 'flashmob') startFlashmob();
  if (c.type === 'spotlight') runSpotlight();
  if (c.type === 'solo') { const list = [...dancers.values()].filter(d => !d.leaving && !d.clone); if (list.length >= 2) requestSolo(pick(list)); }
  if (c.type === 'theme') { themes.apply(c.theme); saveGoals(); }
  if (c.type === 'goalsReset') { goals.likes = 0; goals.coins = 0; goals.idx = 0; themes.apply(S.theme || 'club'); saveGoals(); }
  if (c.type === 'clipNow') startClip('thu-cong', Number(S.clipSeconds) || 15);
  if (c.type === 'sayTest') say('Xin chào! Tôi là MC của Vũ Trường Neon. Cảm ơn các bạn đã ghé phòng LIVE!', null, 0, true);
}

// ---------- kết nối ----------
const socket = io();
socket.on('connect', () => socket.emit('hello', 'game', { obs: OBS }));
socket.on('primary', v => { isPrimary = !!v; });
lcd = createLCD({ scene, camera, led, glCanvas, socket, Music, isPrimary: () => isPrimary, settings: () => S });
socket.on('screenText', it => {
  if (!it || !it.text) return;
  pushTicker(`💌 ${it.user.name}: ${it.text}`, '#ff9de2', { lcd: false });
  if (!it.host) say(`Cảm ơn ${nm(it.user.name)}! Lời nhắn của bạn đã lên màn hình lớn.`, 'text', 4, true);
  if (!it.host) fx.sparkle(3, 'center');
});
// nhắc người xem cách gửi lời nhắn lên màn hình
setInterval(() => { if (S.textEnabled !== false && onFloorCount() > 0) pushTicker(`💌 Bình luận “mh: lời nhắn” + tặng quà từ ${S.textCoins || 30}💎 → chữ của bạn lên màn hình lớn!`, '#7cf7ff', { lcd: false }); }, 120000);
socket.on('goalState', gs => { if (!gs || goals.loaded) return; goals.loaded = true; goals.likes = gs.likes || 0; goals.coins = gs.coins || 0; goals.idx = gs.idx || 0; if (gs.theme) themes.apply(gs.theme); });
socket.on('settings', s => {
  const oldQ = S.quality;
  const first = !S._got; S = Object.assign(S, s); S._got = true;
  setOutfitMix(S.partyMix ?? 25);
  Music.setSettings(S);
  if (first && !goals.loaded) themes.apply(S.theme || 'club');
  if (oldQ !== S.quality) resize();
});
socket.on('gifts', g => { GIFTS = g || {}; });
socket.on('roster', list => { ROSTER = Array.isArray(list) ? list : []; });
socket.on('music', list => Music.setPlaylist(list));
socket.on('top', list => { TOP = list || []; for (const u of TOP) { const d = dancers.get(u.id); if (d) d.coins = u.coins; } });
socket.on('ev', ev => {
  try {
    switch (ev.type) {
      case 'chat': { const d = ensureDancer(ev.user); if (!d) return; if (ev.text) { d.comment = ev.text; d.commentUntil = now() + 4; handleCommand(d, ev.text); } break; }
      case 'like': { heat += ev.count; const d = dancers.get(ev.user.id); if (d) { d.lastActive = now(); if (d._sp && Math.random() < 0.3) hearts(d._sp.hx, d._sp.hy - 40, 1); } break; }
      case 'gift': handleGift(ev); break;
      case 'member': if (S.showJoinTicker) pushTicker(`👋 ${ev.user.name} vào xem`, '#ffffff', { lcd: S.lcdJoin === true, user: ev.user }); break;
      case 'follow': pushTicker(`💖 ${ev.user.name} đã follow`, '#ff7ad9', { user: ev.user }); heat += 20; break;
      case 'share': pushTicker(`📣 ${ev.user.name} đã chia sẻ`, '#a3e635', { user: ev.user }); heat += 20; break;
      case 'viewers': viewers = ev.count; break;
    }
    featureEvent(ev);
  } catch (e) { console.error(e); }
});
socket.on('cmd', c => {
  if (c.type === 'clear') { ledQueue.length = 0; ledShow = null; for (const d of [...dancers.values(), ...clones]) disposeAvatar(d.av); dancers.clear(); clones.length = 0; zoomQueue.length = 0; zoom = null; heat = 0; fireUntil = 0; djOverride = null; }
  if (c.type === 'endZoom') zoom = null;
  if (c.type === 'fire') heat = curHeatTarget + 1;
  if (c.type === 'reload') location.reload();
  if (c.type === 'clear') { battle.on = false; solo.on = false; soloQueue.length = 0; spot.d = null; flashmob.until = 0; }
  featureCmd(c);
});
fetch('/api/info').then(r => r.json()).then(i => { ACTIONS = i.actions; }).catch(() => {});
let fps = 60, lastF = now();
(function fpsLoop() { const t = now(); fps = fps * 0.95 + (1 / Math.max(0.001, t - lastF)) * 0.05; lastF = t; requestAnimationFrame(fpsLoop); })();
setInterval(() => socket.emit('status', { onFloor: onFloorCount(), zooming: zoom ? zoom.d.name : '—', queue: zoomQueue.length, fps: Math.round(fps) }), 2000);

// ---------- khởi động ----------
resident = new Dancer({ id: '__dj', name: 'DJ Tiến Khoa', avatar: '' }, { noDrop: true });
resident.body = randomBody(false);
resident.look = randomLook(false); resident.look.top = 'bomber'; resident.look.hat = 'capBack'; resident.look.neck = 'headphones'; resident.look.hs = 0; resident.look.glasses = true;
resident.look.c.jacket = resident.look.c.uarm = resident.look.c.farm = col('#1b1b1f'); resident.look.c.shirt = resident.look.c.torso = col('#ff3d8b');
initStaff();
mc = new Dancer({ id: '__mc', name: 'MC', avatar: '' }, { noDrop: true });
mc.body = randomBody(false); mc.look = randomLook(false);
window.addEventListener('resize', resize);
resize();
async function applyModels(list) {
  await loadAvatars((list || []).filter(m => m.enabled).map(m => ({ url: m.url, female: m.female })));
  for (const d of [...dancers.values(), ...clones, resident, mc, ...staff]) { if (d && d.av) { disposeAvatar(d.av); d.av = null; d.avT = null; } }
  console.log('Đã nạp', avatarTemplates.length, 'mô hình người');
}
fetch('/api/models').then(r => r.json()).then(applyModels).catch(e => console.warn(e));
socket.on('models', list => applyModels(list));
Music.init();
const tap = document.getElementById('tap');
function checkAudio() { tap.style.display = Music.suspended() && !OBS && (Music.settings.musicEnabled || Music.settings.synthMusic) ? 'flex' : 'none'; }
const unlock = () => { Music.init(); Music.resume(); setTimeout(checkAudio, 200); };
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);
setInterval(checkAudio, 1500);
Music.resume();
window._dbg = { setChar: (d, id) => assignChar(d, ROSTER.find(c => c.id === id)), setOutfitT: (d, o) => { if (d.av) { setCostume(d.av, null); window._applyOutfit(d.av, o); window._restyle(d.av); } }, get flashInfo() { return [...dancers.values()].slice(0, 8).map(d => [d.mode, d.x.toFixed(2), d.z.toFixed(2), d.tx.toFixed(2), d.tz.toFixed(2)].join(' ')); }, ledCam, ledRT, renderer, get ledShow() { return ledShow; }, get ledQueue() { return ledQueue; }, get lcd() { return lcd; }, get resident() { return resident; }, get mc() { return mc; }, staff, mic, mcArm(ru, rf, sx, ex) { MC_RU = ru; MC_RF = rf; MC_RSX = sx; MC_REX = ex; }, dancers, rig, avatarTemplates, restyle, applyShape, setCostume, get zoom() { return zoom; }, setZoom(d) { zoom = { d, id: "camera", label: "Camera", icon: "🎥", start: now(), until: now() + 60, dur: 60 }; } };
requestAnimationFrame(frame);
