// ĐẠI CHIẾN ĐÔ VẬT — game TikTok LIVE: ghi danh → battle royal 32 người → vòng 16 → tứ kết → bán kết → chung kết → đai vô địch.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildArena, drawTron, RING, STAGE, CORNERS, groundY } from './arena.js';
import { createWrestler, applyQuats } from './wrestler.js';
import { loadFighter, createFighter, fighterReady } from './fighter.js';
import { ROSTER, STAFF } from './roster.js';
import { P, H0, MOVES, STRIKES, walkPose, runPose, idlePose, hitReact, getUpPose, struggle } from './anim.js';
import { Q, sampleMove } from './motion.js';
import SFX from './audio.js';
import { createHud, HW, HH } from './hud.js';
import { createLed } from './led.js';
import { loadClip, clipFrame } from './clips.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const params = new URLSearchParams(location.search);
const OBS = params.has('obs');
const TEST = params.has('test');           // chạy thử tự động (không cần LIVE)
const PI = Math.PI, TAU = PI * 2, D2R = PI / 180;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const deacc = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };

// ---------- cài đặt ----------
const DEF = { r16Together: true, ringGirl: true, regSeconds: 60, fillBots: true, minHumans: 0, entrance: 'auto', royalEntrance: true, matchSeconds: 75, royalSeconds: 150, breakSeconds: 25, speed: 1, quality: 'high', crowdSize: 100, volume: 0.5, commentary: true, captions: true, ttsRate: 1.08, ttsVolume: 1, ttsVoice: '', ttsVoice2: '', ttsNames: true, showComments: true, showGiftMenu: true, likeCheer: true, joinWords: 'đấu, dau, vật, vat, đánh, danh, chiến, chien, join', powers: [] };
let settings = { ...DEF, ...(params.has('fast') ? { regSeconds: 8, royalSeconds: 70, matchSeconds: 40, breakSeconds: 8, entrance: 'short' } : {}) };
const URL_SPEED = params.has('speed') ? +params.get('speed') : 0;
const POWER_META = { enter: ['🌹', 'Vào đấu / +20 máu'], heal: ['💊', 'Hồi máu +40'], chair: ['🪑', 'Đập ghế xếp'], rage: ['🔥', 'Cuồng nộ x2'], finisher: ['💥', 'Chiêu cuối ngay'], revive: ['♻️', 'Hồi sinh / thoát đếm 3'], giant: ['🗿', 'Khổng lồ'], legend: ['👑', 'Huyền thoại 20 giây'] };

// ---------- đồ hoạ ----------
const glc = document.getElementById('gl'), hudc = document.getElementById('hud');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: TEST }); }
catch (e) { document.getElementById('err').style.display = 'block'; throw e; }
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true;
hudc.width = HW; hudc.height = HH;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04050a);
scene.fog = new THREE.Fog(0x04050a, 32, 80);
const camera = new THREE.PerspectiveCamera(50, HW / HH, 0.1, 220);
let composer = null, bloom = null, renderScale = 1;
function qualityScale() { return settings.quality === 'low' ? 0.5 : settings.quality === 'medium' ? 0.72 : 1; }
function resize() {
  const ww = window.innerWidth, wh = window.innerHeight, s = Math.min(ww / HW, wh / HH);
  const cw = Math.floor(HW * s), ch = Math.floor(HH * s);
  for (const c of [glc, hudc]) { c.style.width = cw + 'px'; c.style.height = ch + 'px'; }
  renderScale = qualityScale();
  renderer.setPixelRatio(1);
  renderer.setSize(Math.round(HW * renderScale), Math.round(HH * renderScale), false);
  if (composer) composer.setSize(Math.round(HW * renderScale), Math.round(HH * renderScale));
}
function setupComposer() {
  if (settings.quality !== 'high') { composer = null; return; }
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(HW / 2, HH / 2), 0.22, 0.25, 0.985);
  composer.addPass(bloom); composer.addPass(new OutputPass());
}
resize(); window.addEventListener('resize', resize);
const arena = buildArena(scene, { quality: settings.quality, crowd: settings.crowdSize });
const led = createLed(arena.tron);
function tron(info) { led.hide(); drawTron(arena, info); }
setupComposer(); resize();
const hud = createHud(hudc);

// ---------- nhân vật ----------
try { await loadFighter('/models/custom/fighter.fbx'); } catch (e) { console.warn('Không tải được Fighter.fbx, dùng nhân vật dựng bằng code', e); }
// mẫu nữ (tuỳ chọn): public/models/custom/female.fbx — dùng cho đô vật nữ và cô gái cầm biển
try { const r = await fetch('/models/custom/female.fbx', { method: 'HEAD' }); if (r.ok) await loadFighter('/models/custom/female.fbx', 'female'); } catch (e) { console.warn('Không tải được female.fbx', e); }
// cô gái cầm biển (girl.glb), animation Mixamo (models/custom/anim/*.fbx) — đều tuỳ chọn
const exists = async u => { try { return (await fetch(u, { method: 'HEAD' })).ok; } catch (e) { return false; } };
try { if (await exists('/models/custom/girl.glb')) await loadFighter('/models/custom/girl.glb', 'girl'); } catch (e) { console.warn('Không tải được girl.glb', e); }
try { if (await exists('/models/custom/fan.fbx')) await loadFighter('/models/custom/fan.fbx', 'fan'); } catch (e) { console.warn('Không tải được fan.fbx', e); }
const CLIPS = {};
await Promise.all(['punch', 'kick', 'victory', 'clap', 'sitcheer', 'fistpump', 'taunt'].map(async n => { const u = `/models/custom/anim/${n}.fbx`; if (await exists(u)) try { CLIPS[n] = await loadClip(u); } catch (e) { console.warn('Lỗi animation', n, e); } }));
// đoạn dùng trong từng animation: [từ, tới, lúc trúng đòn (tính từ đầu đoạn)]
const CLIP_SEG = { punch: [0.35, 1.2, 0.35], kick: [0.3, 1.4, 0.6], victory: [1.6, 8.5], clap: [1.2, 4.9], sitcheer: [0, 0], fistpump: [0, 0], taunt: [0, 0] };
function makeBody(def) {
  if (def.girl && fighterReady('girl')) return createFighter(def, 'girl');
  if (def.female && fighterReady('female')) return createFighter(def, 'female');
  if (fighterReady() && !def.proc) return createFighter(def, 'male');
  const w = createWrestler(def);
  w.apply = (Qs, k) => applyQuats(w, Qs, k);
  return w;
}
function headWorld(body, out) {
  const b = body.byName ? body.byName.Head : body.bones.head;
  b.getWorldPosition(out); out.y += 0.2 * body.root.scale.y; return out;
}
function handWorld(body, left, out) {
  const b = body.byName ? body.byName[left ? 'LeftHand' : 'RightHand'] : body.bones[left ? 'lHand' : 'rHand'];
  return b.getWorldPosition(out);
}

class Wr {
  constructor(def, idx) {
    this.def = def; this.idx = idx; this.body = makeBody(def); this.root = this.body.root;
    this.root.visible = false; scene.add(this.root);
    this.seed = Math.random() * 10; this.user = null; this.reset();
    this.px = 0; this.pz = 0; this.py = 0; this.pyaw = 0;
  }
  reset() {
    const s = this.def.stats || { hp: 1, pow: 1, spd: 1, agi: 1 };
    this.maxHp = Math.round(100 * s.hp); this.hp = this.maxHp; this.hpGhost = this.hp; this.mom = 0;
    this.out = false; this.elims = 0; this.act = { k: 'idle', t: 0 }; this.thinkT = rand(0.2, 1);
    this.rageT = 0; this.giantT = 0; this.legendT = 0; this.chair = false; this.forceFin = false; this.reviveShield = false;
    this.x = 0; this.z = 0; this.yaw = 0; this.lift = 0; this.inRing = false; this.opp = null; this.combo = 0; this.supporters = 0;
    this.lastFin = 0; this.dmgDealt = 0;
  }
  get label() { return this.user ? this.user.name : this.def.name; }
  get visible() { return this.root.visible; }
  get busy() { return ['move', 'strike', 'path', 'climb', 'perch', 'cover', 'pinned', 'out', 'leave', 'enter', 'chairShot'].includes(this.act.k); }
  get standing() { return ['idle', 'walk', 'stun', 'hit', 'taunt'].includes(this.act.k); }
  get down() { return this.act.k === 'down'; }
  powMul() { return (this.def.stats.pow || 1) * (this.rageT > 0 ? 2 : 1) * (this.giantT > 0 ? 1.5 : 1) * (this.legendT > 0 ? 2 : 1); }
  place(x, z, yaw) { this.x = x; this.z = z; if (yaw != null) this.yaw = yaw; this.px = x; this.pz = z; this.pyaw = this.yaw; this.py = groundY(x, z); }
}
const W = ROSTER.map((d, i) => new Wr(d, i));
const staff = {};
for (const k of ['referee', 'announcer', 'comm1', 'comm2', 'timekeeper']) {
  const b = makeBody(STAFF[k]); scene.add(b.root);
  staff[k] = { body: b, x: 0, z: 0, yaw: 0, y: 0, act: 'idle', t: 0, px: 0, pz: 0 };
}
// thêm 2 trọng tài phụ cho vòng 16 đánh chung
for (const k of ['ref2', 'ref3']) { const b = makeBody(STAFF.referee); scene.add(b.root); b.root.visible = false; staff[k] = { body: b, x: 0, z: 0, yaw: 0, y: RING.y, act: 'idle', t: 0, px: 0, pz: 0, extra: true }; }
const refs = [staff.referee, staff.ref2, staff.ref3];
refs.forEach((r, i) => { r.isRef = true; r.home = [[0, -2.3], [-2.3, 2.2], [2.3, 2.2]][i]; });
// vị trí nhân viên
const ref = staff.referee;
ref.x = 0; ref.z = -2.2; ref.y = RING.y;
staff.comm1.x = arena.commSeats[0].x; staff.comm1.z = arena.commSeats[0].z; staff.comm1.yaw = -PI / 2;
staff.comm2.x = arena.commSeats[1].x; staff.comm2.z = arena.commSeats[1].z; staff.comm2.yaw = -PI / 2;
staff.timekeeper.x = arena.timekeeperSeat.x; staff.timekeeper.z = arena.timekeeperSeat.z; staff.timekeeper.yaw = -PI / 2;
staff.announcer.x = 5.1; staff.announcer.z = 4.4; staff.announcer.yaw = -PI * 0.75;

// ---------- đạo cụ ----------
function makeChair() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x9aa0aa, roughness: 0.3, metalness: 0.85 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.4), m); g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.03), m); back.position.set(0, 0.2, -0.2); g.add(back);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45), m); l.position.set(sx * 0.19, -0.22, sz * 0.18); g.add(l); }
  g.traverse(o => { o.castShadow = true; }); return g;
}
function makeBelt() {
  const g = new THREE.Group();
  const strap = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.17, 0.02), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }));
  g.add(strap);
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.18, metalness: 1, emissive: 0x553300, emissiveIntensity: 0.6 });
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 28), gold); plate.rotation.x = PI / 2; plate.position.z = 0.02; g.add(plate);
  const gem = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), new THREE.MeshStandardMaterial({ color: 0xe8202a, roughness: 0.1, metalness: 0.3, emissive: 0x550000 })); gem.position.z = 0.05; g.add(gem);
  for (const s of [-1, 1]) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.025, 20), gold); sp.rotation.x = PI / 2; sp.position.set(s * 0.36, 0, 0.015); g.add(sp); }
  return g;
}
const chairMesh = makeChair(); chairMesh.visible = false; scene.add(chairMesh);
// ghế thép thật (models/custom/chair.glb) thay ghế dựng bằng code
if (await exists('/models/custom/chair.glb')) try {
  const g = await new GLTFLoader().loadAsync('/models/custom/chair.glb'); const m = g.scene;
  const box = new THREE.Box3().setFromObject(m), sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const k = 0.88 / sz.y; m.scale.setScalar(k); m.position.set(-c.x * k, -c.y * k, -c.z * k);
  m.traverse(o => { if (o.isMesh) o.castShadow = true; });
  chairMesh.clear(); chairMesh.add(m);
} catch (e) { console.warn('Lỗi ghế', e); }
const beltMesh = makeBelt(); beltMesh.visible = false; scene.add(beltMesh);
let chairOwner = null, beltOwner = null, followTarget = null;
// ---------- khán giả người thật ở các hàng đầu: vỗ tay, giơ nắm đấm, khiêu khích theo không khí trận đấu ----------
const fans = [];
const FAN_CLOTH = ['#2a2f3c', '#7a1f2b', '#1f4f8a', '#3b5a2a', '#5a3d1e', '#444', '#8a6a1f', '#2f6f6f', '#6b2f6b'];
const FAN_SKIN = ['#e3b08a', '#c8946c', '#a8714e', '#7a4e33', '#f0c8a8'];
if (fighterReady('fan') || fighterReady('girl')) {
  arena.fanSpots.forEach((p, i) => {
    const useGirl = fighterReady('girl') && (i % 4 === 3 || !fighterReady('fan'));
    const body = createFighter({ name: 'fan', height: useGirl ? rand(1.6, 1.72) : rand(1.68, 1.85) }, useGirl ? 'girl' : 'fan');
    for (const m of [].concat(body.mesh.material)) {
      const nm = (m.name || '').toLowerCase();
      if (!useGirl && /cloth/.test(nm)) m.color.set(pick(FAN_CLOTH));
      if (!useGirl && /skin/.test(nm)) m.color.set(pick(FAN_SKIN));
    }
    body.mesh.castShadow = false;
    for (const m of [].concat(body.mesh.material)) if (m.emissive) { m.emissive.copy(m.color).multiplyScalar(0.12); }
    body.root.position.copy(p); body.root.rotation.y = p.yaw; scene.add(body.root);
    fans.push({ body, t: rand(0, 5), clip: pick(['clap', 'fistpump', 'clap', 'taunt']), speed: rand(0.85, 1.15), burst: 0 });
  });
}
function fanBurst() { if (fans.length && G.mode === 'match' && Math.random() < 0.35) crowdCut(); for (const f of fans) { f.burst = rand(1.8, 3); f.clip = pick(['fistpump', 'taunt', 'fistpump']); } }
let fanAcc = 0, crowdUntil = 0;
function crowdCut() { if (cam.shot === 'pin' || cam.shot === 'aerial') return; cam.fanIdx = (Math.random() * fans.length) | 0; setShot('crowd', null, true); crowdUntil = G.time + 1.6; }
function updateFans(dt) {
  if (!fans.length) return;
  fanAcc += dt; if (fanAcc < 1 / 30) return;   // 30 hình/giây là đủ cho khán giả
  const d = fanAcc; fanAcc = 0;
  for (const f of fans) {
    f.t += d * f.speed * (0.7 + hype * 0.6);
    if (f.burst > 0) { f.burst -= d; if (f.burst <= 0) f.clip = hype > 0.6 ? pick(['clap', 'fistpump']) : 'clap'; }
    const c = CLIPS[f.clip] || CLIPS.clap;
    if (!c) continue;
    // không khí trầm thì chỉ vỗ tay nhẹ / đứng xem
    f.body.apply(clipFrame(c, f.t, true), 0.5);
  }
}

// ================== TRẠNG THÁI GIẢI ==================
const G = {
  phase: 'boot', mode: null, cup: 1, time: 0, settings, slots: [], roster: ROSTER, active: [], pair: null, roundLabel: '', bracket: [], bracketShow: 0,
  current: null, champion: null, breakLeft: 0, regLeft: 0, records: [], powerList: [], joinWord: 'đấu', hintText: '', phaseLabel: '', phaseColor: '#c8102e', timerText: '',
  headScreen: null,
};
for (let i = 0; i < 32; i++) G.slots.push({ user: null });
let preReg = [];                   // người ghi danh sớm cho giải sau
const support = new Map();         // userId -> wrestler
let hype = 0.35, slowmo = 1, slowT = 0, camShake = 0;
let flow = null;                   // kịch bản đang chạy (generator)
let matchT = 0, royalT = 0;

// ---------- bình luận ----------
const COMM = ['BLV Hùng', 'BLV Mike'];
let lastComm = 0;
function comm(text, who = -1, prio = false) {
  if (who < 0) who = Math.random() < 0.5 ? 0 : 1;
  hud.say(who === 2 ? 'Người giới thiệu' : COMM[who], text, Math.min(7, 2.4 + text.length * 0.055));
  if (settings.commentary && window.MC && (prio || G.time - lastComm > 2.2)) { window.MC.say(text, who === 1 ? 1 : 0, prio); lastComm = G.time; }
  if (who === 2) staff.announcer.talkT = 2.5; else staff[who === 0 ? 'comm1' : 'comm2'].talkT = 2.5;
}
const nameOf = w => (w.user && settings.ttsNames ? `${w.def.name}, do ${window.MC ? window.MC.clean(w.user.name) : w.user.name} điều khiển` : w.def.name);
const L = {
  hit: ['Một cú {m} cực mạnh từ {a}!', 'Ôi trời ơi! {a} tung {m}!', '{m}! {d} đổ gục xuống sàn!', 'Khán giả như vỡ oà sau cú {m} của {a}!', '{a} đang làm chủ thế trận!'],
  sig: ['Chiêu tủ {m} của {a}! Quá đẹp!', '{a} tung ra chiêu tủ {m}!'],
  fin: ['{F}!!! {a} tung chiêu kết liễu!', 'KHÔNG THỂ TIN NỔI! {F}! Đây có thể là dấu chấm hết!'],
  kick: ['Thoát rồi! {d} vẫn chưa chịu khuất phục!', 'Hai phẩy chín! Quá kịch tính!', 'Không! {d} đã kịp nhấc vai lên!'],
  elim: ['{d} đã bị ném qua dây! Bị loại!', '{a} vừa loại {d} khỏi cuộc chơi!', 'Tạm biệt {d}!'],
  taunt: ['{a} đang khiêu khích cả nhà thi đấu!', 'Khán giả đang hò reo vì {a}!'],
};
const fill = (s, o) => s.replace(/\{(\w)\}/g, (_, k) => o[k] || '');

// ================== CHUYỂN ĐỘNG / HÀNH ĐỘNG ==================
function toWorld(o, lx, lz) { const s = Math.sin(o.yaw), c = Math.cos(o.yaw); return [o.x + lx * c + lz * s, o.z - lx * s + lz * c]; }
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const faceTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const margin = 0.38;
function inRingPt(x, z, m = margin) { return Math.abs(x) < RING.rope - m && Math.abs(z) < RING.rope - m; }

// kiểm tra chiêu có nằm gọn trong võ đài với gốc o
function moveFits(m, o, allowOut) {
  for (const k of m.keys) {
    for (const p of [k.ap, k.dp]) {
      const [x, z] = toWorld(o, p[0], p[1] * (o.sz || 1));
      if (allowOut && p === k.dp && p[3] < 0) continue;
      if (!inRingPt(x, z, 0.12)) return false;
    }
  }
  return true;
}
function planMove(a, d, id) {
  const m = MOVES[id]; const k0 = m.keys[0];
  const base = faceTo(a, d);
  for (const off of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, PI, 2.2, -2.2]) {
    const yaw = base + off;
    const s = Math.sin(yaw), c = Math.cos(yaw);
    const ox = d.x - (k0.dp[0] * c + k0.dp[1] * s), oz = d.z - (-k0.dp[0] * s + k0.dp[1] * c);
    const o = { x: ox, z: oz, yaw, y: RING.y, sz: 1 };
    if (moveFits(m, o, id === 'toss')) return o;
  }
  return null;
}
function startMove(a, d, id, plan) {
  const m = MOVES[id]; if (!m) return false;
  let o = plan;
  if (m.kind === 'aerial') {
    const yaw = faceTo(a, d), L2 = dist(a, d);
    o = { x: a.x, z: a.z, yaw, y: RING.y, sz: clamp(L2 / m.nominal, 0.6, 1.6) };
  } else if (!o) {
    o = planMove(a, d, id);
    if (!o) return false;
    const far = Math.hypot(a.x - o.x, a.z - o.z);
    if (far > 0.45) {   // đi tới vị trí ra đòn trước
      a.act = { k: 'walk', t: 0, tx: o.x, tz: o.z, run: far > 1.6, then: () => { if (validTarget(a, d, m)) startMove(a, d, id, planMove(a, d, id)); else a.act = { k: 'idle', t: 0 }; } };
      return true;
    }
  }
  a.act = { k: 'move', id, m, role: 'A', t: 0, o, partner: d, hit: false };
  d.act = { k: 'move', id, m, role: 'D', t: 0, o, partner: a };
  a.moveY = o.y; if (m.kind !== 'aerial') d.moveY = o.y; else { d.moveY = RING.y; d.lift = 0; }
  if (m.kind !== 'aerial') { d.yaw = o.yaw + PI; }
  a.combo = 0;
  return true;
}
function validTarget(a, d, m) {
  if (!d || d.out || d.busy) return false;
  if (m.kind === 'submission' || m.kind === 'pin' || m.kind === 'aerial') return d.down;
  return d.standing;
}
function isSig(w, id) { return w.def.moves[0] === id || w.def.moves[1] === id; }
function isFin(w, id) { return w.def.moves[2] === id; }
function moveName(w, id) { return isFin(w, id) ? w.def.fin : MOVES[id].name; }

function damage(d, amt, a) {
  if (d.legendT > 0) amt *= 0.15;
  d.hp = Math.max(G.mode === 'royal' ? 1 : 0, d.hp - amt);
  d.mom = Math.min(100, d.mom + amt * 0.45);
  if (a) { a.mom = Math.min(100, a.mom + amt * 1.5); a.dmgDealt += amt; }
  hype = Math.min(1, hype + amt * 0.012);
  const p = (G.mode === 'match' || amt >= 9) ? G.headScreen(d) : null;
  if (p) hud.float(p.x + rand(-30, 30), p.y - 20, '-' + Math.round(amt), amt > 15 ? '#ffd23f' : '#ff5a5a', amt > 15 ? 72 : 54);
}
function onMoveHit(a, d, act) {
  const m = act.m, id = act.id;
  const fin = isFin(a, id), sig = isSig(a, id);
  let dmg = m.dmg * a.powMul() * (fin ? 2.0 : sig ? 1.3 : 0.9) * rand(0.9, 1.1);
  if (G.mode === 'royal') dmg *= royalHeat();
  damage(d, dmg, a);
  if (fin) { a.mom = 0; a.lastFin = G.time; d.finHit = G.time; fanBurst(); }
  SFX.hit(m.sound || 'slam', fin ? 1.3 : 1);
  if (m.sound === 'slam') arena.shakeRopes(0.8);
  camShake = Math.max(camShake, fin ? 0.5 : 0.25);
  SFX.pop(fin ? 1 : sig ? 0.7 : 0.35);
  if (G.mode === 'match' || fin) {
    if (fin) { slowmo = 0.3; slowT = 0.9; hud.banner(a.def.fin.toUpperCase() + '!', a.def.name, '#ffd23f', 2.4, 130); comm(fill(pick(L.fin), { a: a.def.name, F: a.def.fin }), -1, true); arena.ringPosts(a.def.pyro || '#ff5a1f'); }
    else if (sig) { hud.banner(MOVES[id].name.toUpperCase() + '!', MOVES[id].vn, '#fff', 1.8, 100); if (Math.random() < 0.8) comm(fill(pick(L.sig), { a: a.def.name, m: MOVES[id].vn }), -1); }
    else if (Math.random() < 0.45 && G.time - lastComm > 4) comm(fill(pick(L.hit), { a: a.def.name, d: d.def.name, m: MOVES[id].vn }));
  }
}
function endMove(w) {
  const act = w.act, m = act.m;
  w.lift = 0;
  if (act.role === 'A') {
    if (m.kind === 'pin') { w.act = { k: 'cover', t: 0, partner: act.partner }; return; }
    if (m.kind === 'submission') { w.act = { k: 'hold', t: 0, partner: act.partner, id: act.id }; return; }
    const ae = m.aEnd || 'stand';
    if (ae === 'down') w.act = { k: 'down', t: 0, dur: rand(0.5, 0.9), prone: m.kind === 'aerial' || act.id === 'spear' };
    else if (ae === 'sit') w.act = { k: 'getup', t: 0.45, prone: false };
    else w.act = { k: 'idle', t: 0 };
  } else {
    if (m.kind === 'pin') { w.act = { k: 'pinned', t: 0 }; return; }
    if (m.kind === 'submission') { w.act = { k: 'held', t: 0, id: act.id }; return; }
    if (m.end === 'out') { eliminate(w, act.partner); return; }
    if (m.end === 'stun') { w.act = { k: 'stun', t: 0, dur: 0.8 }; return; }
    w.act = { k: 'down', t: 0, dur: downTime(w, m), prone: m.end === 'downF' };
  }
  clampRing(w);
}
function downTime(w, m) { return (G.mode === 'royal' ? 0.6 : 1.0) + (m ? m.dmg * 0.09 : 0.6) + (1 - w.hp / w.maxHp) * 2.2 * (G.mode === 'royal' ? 0.5 : 1); }
function clampRing(w) {
  if (w.out || !w.inRing) return;
  const lim = RING.rope - margin;
  w.x = clamp(w.x, -lim, lim); w.z = clamp(w.z, -lim, lim);
}
function startStrike(a, d, sid) {
  a.yaw = faceTo(a, d);
  let s = STRIKES[sid];
  const cn = (sid === 'punch' || sid === 'hook' || sid === 'forearm') ? 'punch' : sid === 'kick' ? 'kick' : null;
  if (cn && CLIPS[cn] && Math.random() < 0.55) {
    const [f, t2, h] = CLIP_SEG[cn], c = CLIPS[cn];
    s = { dur: t2 - f, hit: h, dmg: STRIKES[sid].dmg * 1.3, sound: STRIKES[sid].sound, f: tt => clipFrame(c, tt, false, f, t2) };
  }
  a.act = { k: 'strike', s, sid, t: 0, target: d, hit: false };
}
function knockDown(d, prone = false) { d.act = { k: 'down', t: 0, dur: downTime(d, null) * 0.8, prone }; }

// ---------- loại khỏi battle royal ----------
function eliminate(d, a) {
  if (Math.random() < 0.6) fanBurst();
  if (G.mode === 'multi') { d.out = true; d.inRing = false; d.act = { k: 'out', t: 0 }; if (a) pairResult(a, d, 'ném qua dây'); return; }
  // đã đủ 16 người: người bị ném bám được mép đài, lăn lại vào trong
  if (G.mode === 'royal' && G.active.filter(w => !w.out).length <= 16) {
    d.out = false; d.inRing = true; d.x = clamp(d.x, -2.6, 2.6); d.z = clamp(d.z, -2.6, 2.6); d.act = { k: 'down', t: 0, dur: 1.2, prone: true };
    return;
  }
  d.out = true; d.inRing = false; d.act = { k: 'out', t: 0 };
  const alive = G.active.filter(w => !w.out).length;
  if (a) a.elims++;
  hud.banner('BỊ LOẠI!', `${d.label} · còn ${alive} người`, '#ff3b3b', 1.8, 110);
  hud.tick(`💥 ${a ? a.label : ''} loại ${d.label}`, '#ff8a8a');
  SFX.pop(0.8); hype = Math.min(1, hype + 0.15);
  if (G.time - lastComm > 3) comm(fill(pick(L.elim), { a: a ? a.def.name : '', d: d.def.name }));
}
function royalHeat() { return 1 + Math.max(0, royalT - 25) / Math.max(30, settings.royalSeconds * 0.55); }

// ================== AI ==================
const BASIC_GRAPPLE = ['bodyslam', 'suplex', 'neckbreaker', 'backbreaker', 'ddt'];
const BASIC_STRIKE = ['punch', 'hook', 'forearm', 'chop', 'kick'];
function think(w) {
  const o = w.opp;
  if (!o || !o.visible) { w.thinkT = 0.5; return; }
  if (o.out) { w.thinkT = 0.6; return; }
  const d = dist(w, o);
  const fin = w.def.moves[2], finM = MOVES[fin];
  if (o.down && o.act.t > 0.25) {
    // đối thủ nằm
    if ((w.mom >= 100 || w.forceFin) && finM.kind === 'aerial') { w.forceFin = false; return goAerial(w, o, fin); }
    if ((w.mom >= 100 || w.forceFin) && finM.kind === 'submission') { w.forceFin = false; if (startMove(w, o, fin)) return; }
    if ((G.mode === 'match' || G.mode === 'multi') && pinWanted(w, o)) { if (startMove(w, o, 'cover')) return; }
    const r = Math.random();
    const aerials = w.def.moves.slice(0, 2).filter(id => MOVES[id].kind === 'aerial');
    const subs = w.def.moves.slice(0, 2).filter(id => MOVES[id].kind === 'submission');
    if (G.mode === 'match' && aerials.length && r < 0.25 && w.mom > 35) return goAerial(w, o, aerials[0]);
    if ((G.mode === 'match' || G.mode === 'multi') && subs.length && r < 0.45 && w.mom > 30) { if (startMove(w, o, subs[0])) return; }
    if (r < 0.65 && d < 1.6) { approach(w, o, 0.75, () => startStrike(w, o, Math.random() < 0.6 ? 'stomp' : 'elbowGround')); return; }
    if (r < 0.8 && G.mode === 'match') { taunt(w); return; }
    w.thinkT = 0.4; return;
  }
  if (!o.standing) { w.thinkT = 0.25; return; }
  // battle royal: ném qua dây
  if (G.mode === 'royal') {
    const lowHp = o.hp < o.maxHp * 0.42 || royalT > settings.royalSeconds;
    if (lowHp && d < 1.4 && Math.random() < 0.6) { if (tryToss(w, o)) return; }
  }
  if (G.mode === 'multi' && o.hp < o.maxHp * 0.3 && d < 1.4 && Math.random() < 0.25) { if (tryToss(w, o)) return; }
  if (w.chair && d < 1.6) { approach(w, o, 0.85, () => chairShot(w, o)); return; }
  if (d > 1.05) { approach(w, o, 0.85, () => { w.thinkT = 0; }); return; }
  // gần nhau: chọn đòn
  const r = Math.random();
  const standFin = finM.kind !== 'aerial' && finM.kind !== 'submission';
  if ((w.mom >= 100 || w.forceFin) && standFin) { w.forceFin = false; if (startMove(w, o, fin)) return; }
  if ((w.mom >= 100 || w.forceFin) && !standFin) {   // hạ gục trước rồi mới tung chiêu cuối
    const sig = w.def.moves.slice(0, 2).find(id => !['aerial', 'submission'].includes(MOVES[id].kind)) || 'bodyslam';
    if (startMove(w, o, sig)) return;
  }
  const sigs = w.def.moves.slice(0, 2).filter(id => !['aerial', 'submission'].includes(MOVES[id].kind));
  if (sigs.length && w.mom >= 45 && r < 0.4) { if (tryReversal(w, o)) return; if (startMove(w, o, pick(sigs))) return; }
  if (r < (G.mode === 'royal' ? 0.72 : 0.6)) {
    w.combo++;
    startStrike(w, o, pick(BASIC_STRIKE));
    return;
  }
  if (tryReversal(w, o)) return;
  if (!startMove(w, o, pick(BASIC_GRAPPLE))) startStrike(w, o, 'punch');
}
function tryReversal(a, o) {
  const ch = 0.13 * (o.def.stats.agi || 1) * (0.4 + o.hp / o.maxHp) * (o.legendT > 0 ? 2 : 1);
  if (Math.random() < ch && o.standing) {
    const id = Math.random() < 0.5 ? pick(BASIC_GRAPPLE) : (o.def.moves.slice(0, 2).find(x => !['aerial', 'submission'].includes(MOVES[x].kind)) || 'bodyslam');
    if (startMove(o, a, id)) { if (G.mode === 'match' && Math.random() < 0.5) comm(`Phản đòn! ${o.def.name} lật ngược tình thế!`); return true; }
  }
  return false;
}
function pinWanted(w, o) {
  const low = o.hp < o.maxHp * 0.38, afterFin = o.finHit && G.time - o.finHit < 4;
  const late = matchT > settings.matchSeconds;
  return afterFin || (low && Math.random() < 0.55) || (late && Math.random() < 0.6) || (o.hp < o.maxHp * 0.6 && Math.random() < 0.12);
}
function approach(w, o, range, then) {
  const yaw = faceTo(o, w);
  const tx = o.x + Math.sin(yaw) * range, tz = o.z + Math.cos(yaw) * range;
  w.act = { k: 'walk', t: 0, tx, tz, run: dist(w, o) > 2.6, then, target: o, range };
}
function taunt(w, pose, dur = 1.6) {
  const map = { flex: P.flex, point: P.pointUp, roar: P.roar, wide: P.wide, pump: P.pump, spin: P.armsUp, bow: P.bow, kneel: P.roar, shades: P.pointFwd };
  w.act = { k: 'taunt', t: 0, dur, pose: pose || map[w.def.taunt] || P.flex };
  w.mom = Math.min(100, w.mom + 16); hype = Math.min(1, hype + 0.06);
  if (G.mode === 'match' && Math.random() < 0.35) comm(fill(pick(L.taunt), { a: w.def.name }));
}
function goAerial(w, o, id) {
  // chọn cột góc gần đối thủ nhất mà vẫn trong tầm bay
  let best = null, bd = 1e9;
  for (const c of CORNERS) { const dd = Math.hypot(c.x - o.x, c.z - o.z); if (dd > 1.2 && dd < 3.4 && dd < bd) { bd = dd; best = c; } }
  if (!best) { approach(w, o, 0.75, () => startStrike(w, o, 'stomp')); return; }
  w.act = { k: 'walk', t: 0, tx: best.x * 0.92, tz: best.z * 0.92, run: false, then: () => { w.act = { k: 'climb', t: 0, corner: best, target: o, id }; } };
}
function tryToss(a, o) {
  const tossing = G.active.filter(w => w.act.k === 'move' && w.act.id === 'toss' && w.act.role === 'A').length;
  if (G.mode === 'royal' && G.active.filter(w => !w.out).length - tossing <= 16) return false;
  // hướng ra dây gần nhất của đối thủ
  const cands = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([nx, nz]) => ({ nx, nz, d: RING.rope - (nx ? o.x * nx : o.z * nz) }));
  cands.sort((p, q) => p.d - q.d);
  const c = cands[0];
  if (c.d > 1.5) return false;
  const yaw = Math.atan2(c.nx, c.nz);
  // người ra đòn đứng phía trong, cách 0.55
  const ox = o.x - Math.sin(yaw) * 0.55, oz = o.z - Math.cos(yaw) * 0.55;
  if (!inRingPt(ox, oz, 0.2)) return false;
  const plan = { x: ox, z: oz, yaw, y: RING.y, sz: 1 };
  // đẩy người chịu đòn sát dây trước
  const ropeDist = c.d;
  if (ropeDist > 0.75) { plan.x += Math.sin(yaw) * (ropeDist - 0.7); plan.z += Math.cos(yaw) * (ropeDist - 0.7); }
  const far = Math.hypot(a.x - plan.x, a.z - plan.z);
  if (far > 0.5) { a.act = { k: 'walk', t: 0, tx: plan.x, tz: plan.z, run: false, then: () => { if (validTarget(a, o, MOVES.toss)) { o.x = plan.x + Math.sin(yaw) * 0.55; o.z = plan.z + Math.cos(yaw) * 0.55; startMove(a, o, 'toss', plan); } else a.act = { k: 'idle', t: 0 }; } }; return true; }
  o.x = plan.x + Math.sin(yaw) * 0.55; o.z = plan.z + Math.cos(yaw) * 0.55;
  return startMove(a, o, 'toss', plan);
}
function chairShot(a, o) {
  if (!o.standing) { a.act = { k: 'idle', t: 0 }; return; }
  a.yaw = faceTo(a, o); a.act = { k: 'chairShot', t: 0, target: o, hit: false };
}

// ================== CẬP NHẬT TỪNG ĐÔ VẬT ==================
const _v = new THREE.Vector3();
function updateW(w, dt) {
  const a = w.act; a.t += dt;
  for (const k of ['rageT', 'giantT', 'legendT']) if (w[k] > 0) w[k] = Math.max(0, w[k] - dt);
  w.hpGhost += (w.hp - w.hpGhost) * Math.min(1, dt * 1.6);
  const spd = (w.def.stats.spd || 1) * (w.giantT > 0 ? 0.9 : 1);
  switch (a.k) {
    case 'idle': {
      if (w.opp && w.opp.visible && !w.opp.out) w.yaw += angDiff(w.yaw, faceTo(w, w.opp)) * Math.min(1, dt * 5);
      if (G.fighting && !w.done) { w.thinkT -= dt; if (w.thinkT <= 0) { w.thinkT = G.mode === 'royal' ? rand(0.15, 0.6) : rand(0.25, 0.75); think(w); } }
      break;
    }
    case 'walk': {
      if (a.target && a.target.visible) { const yaw = faceTo(a.target, w); a.tx = a.target.x + Math.sin(yaw) * a.range; a.tz = a.target.z + Math.cos(yaw) * a.range; if (a.target.busy && a.target.act.k !== 'down') { w.act = { k: 'idle', t: 0 }; w.thinkT = 0.3; break; } }
      const dx = a.tx - w.x, dz = a.tz - w.z, dd = Math.hypot(dx, dz);
      const v = (a.run ? 4.6 : 2.1) * spd;
      if (dd < 0.06 || a.t > 6) { const f = a.then; w.act = { k: 'idle', t: 0 }; w.thinkT = 0.1; if (f) f(); break; }
      const step = Math.min(dd, v * dt);
      w.x += dx / dd * step; w.z += dz / dd * step;
      w.yaw += angDiff(w.yaw, a.target ? faceTo(w, a.target) : Math.atan2(dx, dz)) * Math.min(1, dt * 8);
      a.ph = (a.ph || 0) + dt * v * (a.run ? 2.6 : 3.4);
      if (w.inRing) clampRing(w);
      break;
    }
    case 'move': {
      const m = a.m;
      if (a.role === 'A') {
        const d = a.partner;
        if (!a.hit && a.t >= m.hit) { a.hit = true; onMoveHit(w, d, a); }
        if (a.t >= m.dur) { endMove(w); if (d.act.k === 'move' && d.act.partner === w) endMove(d); }
      }
      const s = sampleMove(m, Math.min(a.t, m.dur), a.s || (a.s = {}));
      const p = a.role === 'A' ? s.ap : s.dp;
      if (a.role === 'D' && m.kind === 'aerial') break;   // người nằm giữ nguyên chỗ
      const [x, z] = toWorld(a.o, p[0], p[1] * (a.o.sz || 1));
      w.x = x; w.z = z; w.yaw = a.o.yaw + p[2] * D2R; w.lift = p[3]; w.moveY = a.o.y;
      break;
    }
    case 'strike': {
      const s = a.s, d = a.target;
      if (d && d.visible) w.yaw += angDiff(w.yaw, faceTo(w, d)) * Math.min(1, dt * 10);
      if (!a.hit && a.t >= s.hit) {
        a.hit = true;
        const ok = d && !d.out && (a.sid === 'stomp' || a.sid === 'elbowGround' ? d.down : (d.standing || d.act.k === 'hit')) && dist(w, d) < 1.35;
        if (ok) {
          let dmg = s.dmg * w.powMul() * rand(0.8, 1.2) * (G.mode === 'royal' ? royalHeat() : 1);
          damage(d, dmg, w); SFX.hit(s.sound, 0.8);
          if (d.standing) {
            d.act = { k: 'hit', t: 0 }; d.yaw = faceTo(d, w);
            // đẩy lùi (battle royal: dồn về phía dây)
            const push = G.mode === 'royal' ? 0.32 : 0.16; const yaw = faceTo(w, d); d.x += Math.sin(yaw) * push; d.z += Math.cos(yaw) * push; clampRing(d);
            if ((w.combo >= 3 && Math.random() < 0.5) || d.hp < d.maxHp * 0.15 && Math.random() < 0.4) { knockDown(d); w.combo = 0; }
          }
        }
      }
      if (a.t >= s.dur) { w.act = { k: 'idle', t: 0 }; w.thinkT = rand(0.05, 0.3); }
      break;
    }
    case 'chairShot': {
      const d = a.target;
      if (!a.hit && a.t >= 0.55) {
        a.hit = true;
        if (d && d.standing && dist(w, d) < 1.4) { damage(d, 15 * w.powMul(), w); knockDown(d); SFX.hit('chair', 1.2); SFX.pop(0.8); camShake = 0.35; hud.banner('GHẾ XẾP!', `${w.label} đập ghế`, '#c0c8d6', 1.6, 110); comm(`Ối! ${w.def.name} phang nguyên chiếc ghế xếp!`, -1, true); }
        w.chair = false;
      }
      if (a.t >= 0.95) w.act = { k: 'idle', t: 0 };
      break;
    }
    case 'hit': if (a.t > 0.42) w.act = { k: 'stun', t: 0, dur: G.mode === 'royal' ? 0.25 : rand(0.35, 0.7) }; break;
    case 'stun': if (w.opp) w.yaw += angDiff(w.yaw, faceTo(w, w.opp)) * Math.min(1, dt * 3); if (a.t > a.dur) w.act = { k: 'idle', t: 0 }; break;
    case 'down': if (a.t > a.dur) w.act = { k: 'getup', t: 0, prone: a.prone }; break;
    case 'getup': if (a.t > 1.6) { w.act = { k: 'idle', t: 0 }; w.thinkT = rand(0.1, 0.4); } break;
    case 'taunt': if (a.t > a.dur) { w.act = { k: 'idle', t: 0 }; w.thinkT = 0.2; } break;
    case 'climb': {
      const c = a.corner;
      if (a.t < 1.0) { const k = a.t / 1.0; w.x += (c.x - w.x) * Math.min(1, dt * 6); w.z += (c.z - w.z) * Math.min(1, dt * 6); w.lift = 1.25 * k; w.yaw = Math.atan2(-c.sx, -c.sz); }
      else { w.lift = 1.25; const d = a.target; w.yaw = faceTo(w, d); w.act = { k: 'perch', t: 0, corner: c, target: d, id: a.id }; }
      break;
    }
    case 'perch': {
      const d = a.target; w.lift = 1.25;
      if (d && d.visible) w.yaw = faceTo(w, d);
      if (a.t > 0.6) {
        if (d && d.down && !d.busy) { startMove(w, d, a.id); if (isFin(w, a.id) && G.mode === 'match') comm(`${w.def.name} đang ở trên cột góc! Liệu có phải ${w.def.fin}?`, -1, true); }
        else { w.lift = 0; w.act = { k: 'getup', t: 1.0, prone: false }; }
      }
      break;
    }
    case 'cover': {
      // trọng tài đếm (xử lý ở refUpdate)
      if (!a.counting && a.t > 4.5) { w.act = { k: 'getup', t: 0.5, prone: true }; }
      break;
    }
    case 'pinned': break;
    case 'hold': {
      const d = a.partner;
      if (a.t - (a.tick || 0) > 1.0) {
        a.tick = a.t; damage(d, 3 * w.powMul(), w); SFX.pop(0.25);
        const tap = d.hp < d.maxHp * 0.25 ? 0.3 : d.hp < d.maxHp * 0.45 ? 0.12 : 0.03;
        if ((G.mode === 'match' || G.mode === 'multi') && Math.random() < tap && !d.reviveShield) { decide(w, d, 'đầu hàng'); return; }
        if (a.t > 5 || Math.random() < 0.08 + d.hp / d.maxHp * 0.12) {   // thoát khoá / chạm dây
          w.act = { k: 'getup', t: 0.8, prone: false }; d.act = { k: 'down', t: 0, dur: 0.8, prone: true };
          if (G.mode === 'match') comm(`${d.def.name} đã thoát khỏi đòn khoá!`);
        }
      }
      break;
    }
    case 'held': if (!w.opp || w.opp.act.k !== 'hold') w.act = { k: 'down', t: 0, dur: 0.6, prone: true }; break;
    case 'out': if (a.t > 2.6) leaveArena(w); break;
    case 'path': pathStep(w, dt); break;
    case 'celebrate': break;
    case 'leave': pathStep(w, dt); break;
  }
}
// đường ra khỏi võ đài: tới dây gần đích → luồn qua dây → mép đài → nhảy xuống sàn → đích
function exitRingPts(w, fx, fz) {
  const pts = [];
  if (w.inRing || Math.abs(w.x) <= RING.apron && Math.abs(w.z) <= RING.apron) {
    const sx = Math.abs(fx) > Math.abs(fz), sg = Math.sign(sx ? fx : fz) || 1;
    const e = RING.rope - 0.25, ap = RING.rope + 0.32, fl = RING.apron + 0.45;
    const cx = clamp(w.x, -2.4, 2.4), cz = clamp(w.z, -2.4, 2.4);
    pts.push([w.x, w.z, RING.y]);
    if (sx) pts.push([sg * e, cz, RING.y], [sg * ap, cz, RING.y, { pose: P.crouch, speed: 1.2 }], [sg * fl, cz, 0, { speed: 2.2 }]);
    else pts.push([cx, sg * e, RING.y], [cx, sg * ap, RING.y, { pose: P.crouch, speed: 1.2 }], [cx, sg * fl, 0, { speed: 2.2 }]);
  } else pts.push([w.x, w.z, groundY(w.x, w.z)]);
  pts.push([fx, fz, groundY(fx, fz)]);
  return pts;
}
function leaveArena(w) {
  const pts = exitRingPts(w, Math.sign(w.x || 1) * 5.4, -5.2).concat([[1.0, -7.9, 0], [0.6, STAGE.front, STAGE.y], [0, STAGE.curtain.z, STAGE.y]]);
  w.inRing = false;
  w.act = { k: 'leave', t: 0, pts, i: 0, speed: 2.2, then: () => { w.root.visible = false; w.act = { k: 'gone', t: 0 }; } };
}
// đi theo các điểm [x, z, y]
function pathStep(w, dt) {
  const a = w.act;
  const p = a.pts[a.i + 1];
  if (!p) { const f = a.then; w.act = { k: 'idle', t: 0 }; if (f) f(); return; }
  const q0 = a.pts[a.i];
  const segLen = Math.max(0.01, Math.hypot(p[0] - q0[0], p[1] - q0[1]));
  a.s = (a.s || 0) + (p[3] && p[3].speed || a.speed) * dt;
  const f = Math.min(1, a.s / segLen);
  w.x = q0[0] + (p[0] - q0[0]) * f; w.z = q0[1] + (p[1] - q0[1]) * f;
  w.pathY = q0[2] + (p[2] - q0[2]) * f;
  w.seg = p[3] || null;
  const dx = p[0] - q0[0], dz = p[1] - q0[1];
  if (!(p[3] && p[3].keepYaw)) w.yaw += angDiff(w.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 7);
  a.ph = (a.ph || 0) + dt * a.speed * (a.run ? 2.6 : 3.4);
  if (f >= 1) { a.i++; a.s = 0; if (p[3] && p[3].onArrive) p[3].onArrive(); }
}

// ---------- tư thế mỗi khung hình ----------
function poseOf(w) {
  const a = w.act;
  switch (a.k) {
    case 'idle': return G.fighting || w.inRing ? idlePose(G.time, w.seed) : P.stand;
    case 'walk': return a.run ? runPose(a.ph || 0) : walkPose(a.ph || 0, 1);
    case 'move': { const s = a.s || sampleMove(a.m, 0); return a.role === 'A' ? s.a : s.d; }
    case 'strike': return a.s.f(a.t);
    case 'chairShot': { const k = a.t < 0.45 ? a.t / 0.45 : 1; return Object.assign({}, P.stand, { lArm: [-170 + (a.t > 0.45 ? 100 * Math.min(1, (a.t - 0.45) / 0.12) : 0), 0, 18], rArm: [-170 + (a.t > 0.45 ? 100 * Math.min(1, (a.t - 0.45) / 0.12) : 0), 0, -18], lFore: [-30, 0, 0], rFore: [-30, 0, 0], spine: [-10 * k + (a.t > 0.45 ? 40 : 0), 0, 0] }); }
    case 'hit': return hitReact(a.t, false);
    case 'stun': return P.stun;
    case 'down': return a.prone ? P.lieFront : (G.mode === 'match' ? struggle(G.time + w.seed) : P.lieBack);
    case 'getup': return getUpPose(a.t, a.prone);
    case 'taunt': return a.pose;
    case 'climb': return a.t < 1 ? Object.assign({}, P.crouch, { lArm: [-150, 0, 20], rArm: [-150, 0, -20] }) : P.crouch;
    case 'perch': return Object.assign({}, P.crouch, { hips: { p: [0, H0 - 0.3, 0], r: [10, 0, 0] }, lArm: [-60 - 40 * Math.sin(G.time * 6), 0, 30], rArm: [-60 - 40 * Math.sin(G.time * 6), 0, -30] });
    case 'cover': { const s = MOVES.cover.keys; return s[s.length - 1].a; }
    case 'pinned': { const s = MOVES.cover.keys; return s[s.length - 1].d; }
    case 'hold': { const m = MOVES[a.id]; const k = m.keys[m.keys.length - 1]; return k.a; }
    case 'held': { const m = MOVES[w.opp && w.opp.act.id || 'bostonCrab']; const k = m.keys[m.keys.length - 1]; return k.d; }
    case 'out': return a.t < 0.4 ? P.lieFront : P.lieFront;
    case 'path': case 'leave': {
      const seg = w.seg;
      if (seg && seg.pose) return seg.pose;
      if (w.armsUp) return Object.assign({}, walkPose(a.ph || 0, 0.8), { lArm: [-166, 0, 20], rArm: [-166, 0, -20], lFore: [-28, 0, 0], rFore: [-28, 0, 0], head: [-6, 0, 0] });
      if (a.run) return runPose(a.ph || 0);
      return walkPose(a.ph || 0, a.k === 'leave' ? 0.7 : 1);
    }
    case 'celebrate': {
      const cn = a.clip || (a.pose === P.armsUp || !a.pose ? 'victory' : null);
      if (cn && CLIPS[cn]) { const [f, t2] = CLIP_SEG[cn]; return clipFrame(CLIPS[cn], a.t, true, f, t2); }
      return a.pose || P.armsUp;
    }
    case 'pose': return a.pose;
    case 'gone': return P.stand;
  }
  return P.stand;
}
function syncBody(w, dt) {
  const k = 1 - Math.exp(-dt * (w.act.k === 'move' ? 26 : 15));
  const qq = Q(poseOf(w));
  w.body.apply(qq, k);
  const kp = 1 - Math.exp(-dt * (w.act.k === 'move' ? 30 : 18));
  w.px += (w.x - w.px) * kp; w.pz += (w.z - w.pz) * kp;
  w.pyaw += angDiff(w.pyaw, w.yaw) * kp;
  let gy;
  if (w.act.k === 'move') gy = (w.moveY ?? RING.y) + (w.lift || 0);
  else if (w.act.k === 'path' || w.act.k === 'leave') gy = w.pathY ?? groundY(w.x, w.z);
  else gy = (w.inRing ? RING.y : groundY(w.x, w.z)) + w.lift;
  if (!isFinite(w.py)) w.py = gy;
  w.py += (gy - w.py) * kp;
  w.root.position.set(w.px, w.py, w.pz);
  w.root.rotation.y = w.pyaw;
  const sc = w.body.scale * (w.giantT > 0 ? 1.45 : w.legendT > 0 ? 1.2 : 1);
  const cs = w.root.scale.x; w.root.scale.setScalar(cs + (sc - cs) * Math.min(1, dt * 4));
  // phát sáng: huyền thoại (vàng) / cuồng nộ (đỏ)
  const mat = w.body.mesh && w.body.mesh.material;
  if (mat && mat.emissive) {
    if (w.legendT > 0) { mat.emissive.setRGB(0.9, 0.65, 0.1); mat.emissiveIntensity = 0.35 + 0.15 * Math.sin(G.time * 8); }
    else if (w.rageT > 0) { mat.emissive.setRGB(1, 0.1, 0.05); mat.emissiveIntensity = 0.25 + 0.2 * Math.sin(G.time * 12); }
    else mat.emissiveIntensity = 0;
  }
}
// tách người không chồng lên nhau
function separate() {
  const list = G.active.filter(w => w.visible && w.inRing && !w.out && !['move', 'path', 'climb', 'perch', 'cover', 'pinned', 'hold', 'held'].includes(w.act.k));
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j]; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = 0.62;
    if (d < min && d > 1e-4) { const p = (min - d) / 2; a.x -= dx / d * p; a.z -= dz / d * p; b.x += dx / d * p; b.z += dz / d * p; }
  }
  for (const w of list) clampRing(w);
}

// ================== NHÂN VIÊN ==================
function staffPose(s) {
  const t = G.time;
  if (s.isRef) {
    if (s.act === 'count') {
      // nằm sấp cạnh vai người bị đè, giơ tay cao rồi đập xuống sàn mỗi nhịp đếm
      const c = s.countPh || 0;
      let up = !s.counting ? 0.35 : c < 0.12 ? 0 : c < 0.45 ? (c - 0.12) / 0.33 : c < 0.8 ? 1 : 1 - (c - 0.8) / 0.2;
      return Object.assign({}, P.lieFront, { hips: { p: [0, 0.2, 0], r: [86, 0, 0] }, spine: [-8, 0, 0], chest: [-10, 0, 0], neck: [-12, 0, 0], head: [-34, 0, 0],
        rArm: [-80 + 152 * up, 0, -16], rFore: [-14 * up, 0, 0], lArm: [-82, 0, 38], lFore: [-55, 0, 0], lThigh: [4, 0, 10], rThigh: [4, 0, -10], lShin: [10, 0, 0], rShin: [10, 0, 0] });
    }
    if (s.act === 'raise') return Object.assign({}, P.stand, { rArm: [-170, 0, -15], rFore: [0, 0, 0], head: [-10, 0, 0] });
    if (s.act === 'bell') return Object.assign({}, P.stand, { rArm: [-90, 0, -40], lArm: [-90, 0, 40], rFore: [-40, 0, 0], lFore: [-40, 0, 0] });
    if (s.moving) return s.act === 'goCount' ? runPose(s.ph || 0) : walkPose(s.ph || 0, 0.9);
    return Object.assign({}, P.stand, { spine: [10, 0, 0], lArm: [-20, 0, 15], rArm: [-20, 0, -15], lFore: [-60, 0, 0], rFore: [-60, 0, 0], head: [-6, 0, 0] });
  }
  if (s === staff.announcer) return s.talking ? Object.assign({}, P.stand, { rArm: [-60, 0, -10], rFore: [-110, 0, 0], lArm: [-30 - 40 * Math.max(0, Math.sin(t * 3)), 0, 30], head: [-8, 0, 0] }) : Object.assign({}, P.stand, { rArm: [-20, 0, -10], rFore: [-90, 0, 0] });
  if (s === staff.timekeeper) return Object.assign({}, P.sit, { hips: { p: [0, 0.52, 0], r: [0, 0, 0] }, lThigh: [-88, 0, 6], rThigh: [-88, 0, -6], lShin: [88, 0, 0], rShin: [88, 0, 0], spine: [10, 0, 0], rArm: s.ring > 0 ? [-80, 0, -10] : [-40, 0, -10], rFore: s.ring > 0 ? [-60 - 40 * Math.sin(t * 30), 0, 0] : [-70, 0, 0], lArm: [-40, 0, 10], lFore: [-70, 0, 0] });
  // bình luận viên ngồi (đứng bật dậy cổ vũ khi có đòn lớn)
  const talk = s.talkT > 0;
  return Object.assign({}, P.sit, { hips: { p: [0, 0.52, 0], r: [0, 0, 0] }, lThigh: [-88, 0, 6], rThigh: [-88, 0, -6], lShin: [88, 0, 0], rShin: [88, 0, 0], spine: [8, 0, 0],
    rArm: talk ? [-60 - 25 * Math.sin(t * 5), 0, -20] : [-45, 0, -10], rFore: talk ? [-70, 0, 0] : [-80, 0, 0], lArm: [-45, 0, 10], lFore: [-80, 0, 0], head: [-6, s.look || 0, 0] });
}
function updateStaff(dt) {
  for (const r of refs) {
    if (!r.body.root.visible) continue;
    if (r.act === 'goCount') {
      moveStaff(r, r.tx, r.tz, 4.8, dt);
      if (Math.hypot(r.tx - r.x, r.tz - r.z) < 0.1) { r.act = 'count'; r.count = 0; r.countT = -0.4; r.countPh = 0; r.counting = false; r.yaw = r.faceYaw; r.moving = false; }
    } else if (r.act === 'count') { r.yaw += angDiff(r.yaw, r.faceYaw) * Math.min(1, dt * 10); refCount(r, dt); }
    else if (r.act === 'watch' && G.mode === 'match' && G.pair) {
      const [a, b] = G.pair;
      const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
      let nx = -(b.z - a.z), nz = b.x - a.x; const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
      if (nz > 0) { nx = -nx; nz = -nz; }   // đứng phía sau (xa máy quay)
      const tx = clamp(mx + nx * 2.1, -2.5, 2.5), tz = clamp(mz + nz * 2.1, -2.5, 2.5);
      moveStaff(r, tx, tz, 2.4, dt); r.yaw += angDiff(r.yaw, Math.atan2(mx - r.x, mz - r.z)) * Math.min(1, dt * 4);
    } else if (r.act === 'roam') {
      // vòng 16 đánh chung: mỗi trọng tài giữ một khu, dịch về phía cặp gần nhất
      let best = null, bd = 1e9;
      for (const w of G.active) if (!w.done && w.visible && w.inRing) { const d = Math.hypot(w.x - r.home[0], w.z - r.home[1]); if (d < bd) { bd = d; best = w; } }
      const tx = best ? r.home[0] * 0.6 + best.x * 0.4 : r.home[0], tz = best ? r.home[1] * 0.6 + best.z * 0.4 : r.home[1];
      moveStaff(r, clamp(tx, -2.6, 2.6), clamp(tz, -2.6, 2.6), 1.8, dt);
      if (best) r.yaw += angDiff(r.yaw, Math.atan2(best.x - r.x, best.z - r.z)) * Math.min(1, dt * 3);
    } else r.moving = false;
    r.y = RING.y;
  }
  for (const s of Object.values(staff)) {
    s.t += dt; if (s.talkT > 0) s.talkT -= dt; if (s.cheerT > 0) s.cheerT -= dt; if (s.ring > 0) s.ring -= dt;
    const k = 1 - Math.exp(-dt * 12);
    s.body.apply(Q(staffPose(s)), k);
    if (!s.isRef) {
      if (s === staff.comm1 || s === staff.comm2) { const tgt = G.pair ? G.pair[0] : null; s.look = tgt ? clamp(angDiff(s.yaw, Math.atan2(tgt.px - s.x, tgt.pz - s.z)) * 57, -50, 50) : 0; }
      s.y = groundY(s.x, s.z);
    }
    s.body.root.position.set(s.x, s.y, s.z); s.body.root.rotation.y = s.yaw;
  }
}
function moveStaff(s, tx, tz, v, dt) {
  const dx = tx - s.x, dz = tz - s.z, d = Math.hypot(dx, dz);
  s.moving = d > 0.08;
  if (s.moving) { const st = Math.min(d, v * dt); s.x += dx / d * st; s.z += dz / d * st; s.ph = (s.ph || 0) + dt * v * 3.2; s.yaw += angDiff(s.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 8); }
}
// đếm 1-2-3: trọng tài nằm xuống cạnh vai, đập tay xuống sàn và hô
const CI = 0.95;
let lastCountSay = 0;
function refCount(r, dt) {
  const cover = r.cover, pinned = cover && cover.act.partner;
  if (!cover || cover.act.k !== 'cover' || !pinned || pinned.act.k !== 'pinned') { endCount(r); return; }
  r.countT += dt;
  if (r.countT < 0) return;           // vừa nằm xuống
  r.counting = true;
  r.countPh = (r.countT % CI) / CI;
  const n = Math.floor(r.countT / CI);
  if (n > r.count) {
    r.count = n;
    if (n >= 1 && n <= 3) {
      SFX.hit('mat', 1.2); SFX.pop(0.3 + n * 0.22); hype = Math.min(1, hype + 0.15); arena.shakeRopes(0.1);
      const word = ['MỘT!', 'HAI!', 'BA!'][n - 1];
      if (G.mode === 'match') hud.banner(String(n), word, n === 3 ? '#ff3b3b' : '#fff', 0.85, 220);
      else { const p = G.headScreen(pinned); if (p) hud.float(p.x, p.y - 40, `${n}!`, n === 3 ? '#ff3b3b' : '#fff', 110); }
      if (settings.commentary && window.MC && G.time - lastCountSay > 0.5) { window.MC.say(['Một!', 'Hai!', 'Ba!'][n - 1], 0, true); lastCountSay = G.time; }
    }
    if (n === 2) {
      // quyết định có thoát đếm không
      const late = matchT > settings.matchSeconds * 1.3;
      let kick = 0.12 + (pinned.hp / pinned.maxHp) * 1.35 - (pinned.finHit && G.time - pinned.finHit < 5 ? 0.45 : 0) - (late ? 0.6 : 0) + pinned.mom / 500;
      if (pinned.reviveShield) { kick = 1; pinned.reviveShield = false; }
      pinned.kickAt = Math.random() < clamp(kick, 0.03, 0.97) ? rand(0.3, 0.85) : null;
    }
    if (n === 3) { endCount(r); decide(cover, pinned, 'đè đếm 3'); return; }
  }
  if (r.count === 2 && pinned.kickAt != null && r.countT > (2 + pinned.kickAt) * CI) {
    // thoát!
    if (G.mode === 'match') hud.banner('THOÁT!', `${pinned.def.name} kịp nhấc vai ở 2,9`, '#3dff6e', 1.4, 140);
    else { const p = G.headScreen(pinned); if (p) hud.float(p.x, p.y - 40, 'THOÁT!', '#3dff6e', 80); }
    SFX.pop(1); hype = 1; fanBurst();
    if (G.mode === 'match' || Math.random() < 0.4) comm(fill(pick(L.kick), { d: pinned.def.name }), -1, G.mode === 'match');
    cover.act = { k: 'down', t: 0, dur: 0.5, prone: false };
    pinned.act = { k: 'down', t: 0, dur: 0.6, prone: false };
    pinned.mom = Math.min(100, pinned.mom + 25);
    endCount(r);
  }
}
function endCount(r) { r.act = G.mode === 'multi' ? 'roam' : 'watch'; r.cover = null; r.counting = false; }
function startCount(r, cover, pinned) {
  const hy = pinned.yaw;                         // người nằm ngửa: đầu hướng −Z của gốc
  const sx = pinned.x - Math.sin(hy) * 0.55, sz = pinned.z - Math.cos(hy) * 0.55;   // vai
  const px = Math.cos(hy), pz = -Math.sin(hy);
  let best = null;
  for (const sg of [1, -1]) {
    const tx = sx + px * 1.05 * sg, tz = sz + pz * 1.05 * sg;
    const score = Math.hypot(tx - cover.x, tz - cover.z) - (inRingPt(tx, tz, 0.2) ? 0 : 5);
    if (!best || score > best.score) best = { tx, tz, score };
  }
  r.tx = clamp(best.tx, -2.75, 2.75); r.tz = clamp(best.tz, -2.75, 2.75);
  r.faceYaw = Math.atan2(sx - r.tx, sz - r.tz);
  r.act = 'goCount'; r.cover = cover; cover.act.ref = r; cover.act.counting = true;
}
// gán trọng tài rảnh gần nhất cho mỗi lần đè
function assignCounts() {
  for (const w of G.active) {
    if (w.act.k !== 'cover' || w.act.ref || !w.act.partner || w.act.partner.act.k !== 'pinned') continue;
    let best = null, bd = 1e9;
    for (const r of refs) { if (!r.body.root.visible || r.act === 'count' || r.act === 'goCount' || r.act === 'raise') continue; const d = Math.hypot(r.x - w.x, r.z - w.z); if (d < bd) { bd = d; best = r; } }
    if (best) startCount(best, w, w.act.partner);
  }
}
function decide(w, l, how) { if (G.mode === 'multi') pairResult(w, l, how); else win(w, l, how); }

// ================== THẮNG / THUA ==================
let matchResult = null;
function win(w, l, how) {
  if (matchResult) return;
  matchResult = { w, l, how };
  G.fighting = false;
  SFX.bell(3); staff.timekeeper.ring = 1.2;
  SFX.stopTheme(0.3);
  SFX.pop(1); hype = 1;
  l.act = { k: 'down', t: 0, dur: 99, prone: false };
  w.act = { k: 'celebrate', t: 0, pose: P.armsUp };
}

// ================== MÁY QUAY ==================
const cam = { pos: new THREE.Vector3(0, 8, 15), look: new THREE.Vector3(0, 2, -1), tpos: new THREE.Vector3(), tlook: new THREE.Vector3(), fov: 50, tfov: 50, shot: 'ring', target: null };
function setShot(shot, target, cut) { cam.shot = shot; cam.target = target || null; if (cut) cam.cut = true; }
function updateCamera(dt) {
  const t = G.time;
  const tp = cam.tpos, tl = cam.tlook;
  let tf = 50;
  const ac = actionCenter();
  switch (cam.shot) {
    case 'ring': tp.set(ac.x * 0.35, 7.4, 13.6 + ac.z * 0.25); tl.set(ac.x * 0.6, 1.9, ac.z * 0.55 - 1.0); tf = 48; break;
    case 'close': tp.set(ac.x * 0.8 + 1.2 * Math.sin(t * 0.15), 4.3, ac.z + 8.2); tl.set(ac.x * 0.95, 2.1, ac.z - 0.2); tf = 46; break;
    case 'royal': tp.set(0, 10.8, 15.5); tl.set(0, 1.2, -1.0); tf = 50; break;
    case 'regwide': tp.set(Math.sin(t * 0.08) * 6, 9.5, 15 + Math.cos(t * 0.08) * 2); tl.set(0, 3.5, -8); tf = 55; break;
    case 'stage': tp.set(0, 3.6, -8.5); tl.set(0, 4.6, -22); tf = 52; break;
    case 'entrance': { const e = cam.target; if (e) { tp.set(e.px * 0.6 + 2.0, e.py + 2.0, e.pz + 6.8); tl.set(e.px, e.py + 1.5, e.pz); } tf = 46; break; }
    case 'entranceRing': { const e = cam.target; if (e) { tp.set(e.px * 0.5 + 0.5, RING.y + 3.6, e.pz + 7.5); tl.set(e.px * 0.8, RING.y + 1.4, e.pz); } tf = 48; break; }
    case 'pin': { const e = cam.target || ac; tp.set(e.x + 2.6, RING.y + 1.6, e.z + 4.4); tl.set(e.x, RING.y + 0.4, e.z); tf = 44; break; }
    case 'champ': { const e = cam.target; const ang = Math.sin(t * 0.22) * 0.9; if (e) { tp.set(e.px + Math.sin(ang) * 6.4, e.py + 2.8, e.pz + Math.cos(ang) * 6.4); tl.set(e.px, e.py + 1.9, e.pz); } tf = 46; break; }
    case 'crowd': { const f = fans[cam.fanIdx || 0]; if (f) { const p = f.body.root.position, yw = f.body.root.rotation.y; tp.set(p.x + Math.sin(yw) * 4.2, p.y + 1.9, p.z + Math.cos(yw) * 4.2); tl.set(p.x, p.y + 1.3, p.z); } tf = 50; break; }
    case 'tron': tp.set(0, 8.3, 3.4); tl.set(0, STAGE.y + 8.1, STAGE.back); tf = 57; break;
    case 'girl': { const e = cam.target; if (e) { const r = Math.hypot(e.px, e.pz) || 1; const fx = Math.sin(e.pyaw), fz = Math.cos(e.pyaw); tp.set(e.px + fx * 4.2 + e.px / r * 2.4, e.py + 1.7, e.pz + fz * 4.2 + e.pz / r * 2.4); tl.set(e.px + fx * 0.4, e.py + 1.2, e.pz + fz * 0.4); } tf = 46; break; }
    case 'aerial': { const e = cam.target || ac; tp.set(e.x * 0.5 + 3.5, RING.y + 3.2, e.z + 7); tl.set(e.x * 0.7, RING.y + 1.4, e.z * 0.7); tf = 50; break; }
  }
  const k = cam.cut ? 1 : 1 - Math.exp(-dt * (cam.shot === 'girl' ? 7 : 2.6));
  cam.cut = false;
  cam.pos.lerp(tp, k); cam.look.lerp(tl, k); cam.fov += (tf - cam.fov) * k;
  camera.position.copy(cam.pos);
  if (camShake > 0) { camera.position.x += (Math.random() - 0.5) * camShake * 0.6; camera.position.y += (Math.random() - 0.5) * camShake * 0.6; camShake = Math.max(0, camShake - dt * 1.5); }
  camera.fov = cam.fov; camera.updateProjectionMatrix();
  camera.lookAt(cam.look);
}
function actionCenter() {
  if (G.mode === 'match' && G.pair) { const [a, b] = G.pair; return { x: (a.px + b.px) / 2, z: (a.pz + b.pz) / 2 }; }
  return { x: 0, z: 0 };
}
const _p = new THREE.Vector3();
G.headScreen = (w) => {
  headWorld(w.body, _p);
  _p.project(camera);
  if (_p.z > 1 || _p.z < -1) return null;
  return { x: (_p.x * 0.5 + 0.5) * HW, y: (-_p.y * 0.5 + 0.5) * HH };
};

// ================== KỊCH BẢN GIẢI ĐẤU ==================
function* wait(s) { let t = 0; while (t < s) { t += yield; } }
function setPhase(phase, label, color) { G.phase = phase; G.phaseLabel = label || ''; if (color) G.phaseColor = color; }
function showOnly(list) { for (const w of W) w.root.visible = list.includes(w); G.active = list.slice(); }
function joinWordsList() { return String(settings.joinWords || 'đấu').split(/[,\n]/).map(s => deacc(s.trim())).filter(Boolean); }

function* registration() {
  setPhase('reg', 'GHI DANH', '#c8102e'); G.mode = null; G.champion = null; G.bracket = []; G.pair = null; G.bracketShow = 0;
  showOnly([]); setShot('regwide', null, true);
  tron({ top: 'MEGA SLAM · GIẢI ' + G.cup, name: 'BATTLE ROYAL', sub: '32 đô vật · ném qua dây để loại', foot: `Gõ “${G.joinWord}” để ghi danh`, color: '#c8102e', big: true });
  arena.setMood('#ff2a3d');
  for (const s of G.slots) s.user = null;
  for (const u of preReg.splice(0)) register(u, null, true);
  G.hintText = `Gõ “${G.joinWord}” để vào võ đài · “${G.joinWord} 7” để chọn đô vật số 7`;
  comm(`Chào mừng quý vị đến với Mega Slam, giải số ${G.cup}! Gõ chữ ${G.joinWord} để ghi danh vào trận battle royal 32 người!`, 2, true);
  G.regLeft = settings.regSeconds;
  let t = 0, nag = 0;
  while (true) {
    const dt = yield; t += dt; G.regLeft -= dt; nag += dt;
    const humans = G.slots.filter(s => s.user).length;
    G.timerText = `${humans}/32 người`;
    if (nag > 22 && G.regLeft > 8) { nag = 0; comm(pick([`Còn ${Math.ceil(G.regLeft)} giây ghi danh! Gõ ${G.joinWord} ngay!`, `Mới có ${humans} người ghi danh. Gõ ${G.joinWord} để giành suất cuối!`]), -1); }
    if (humans >= 32 || G.regLeft <= 0 || G.forceStart) {
      if (!G.forceStart && settings.minHumans > 0 && humans < settings.minHumans) { G.regLeft = 20; comm(`Cần ít nhất ${settings.minHumans} người để mở giải. Gõ ${G.joinWord} nào!`, -1); continue; }
      G.forceStart = false; break;
    }
  }
  G.timerText = '';
}
function register(user, num, silent) {
  if (!user || !user.id) return;
  const already = G.slots.findIndex(s => s.user && s.user.id === user.id);
  if (G.phase !== 'reg') {
    if (!preReg.some(u => u.id === user.id) && G.slots.every(s => !s.user || s.user.id !== user.id)) { preReg.push(user); hud.tick(`📝 ${user.name} đã ghi danh giải sau`, '#9cf'); }
    return;
  }
  if (already >= 0) {
    if (num && num >= 1 && num <= 32 && !G.slots[num - 1].user) { G.slots[num - 1].user = G.slots[already].user; G.slots[already].user = null; hud.tick(`🔁 ${user.name} đổi sang ${ROSTER[num - 1].name}`); }
    return;
  }
  let idx = num && num >= 1 && num <= 32 && !G.slots[num - 1].user ? num - 1 : -1;
  if (idx < 0) { const free = G.slots.map((s, i) => s.user ? -1 : i).filter(i => i >= 0); if (!free.length) { preReg.push(user); return; } idx = pick(free); }
  G.slots[idx].user = user;
  if (!silent) { hud.tick(`✅ ${user.name} → #${idx + 1} ${ROSTER[idx].name}`, '#3dff6e'); SFX.pop(0.2); }
}

function* royal() {
  setPhase('royalIntro', 'BATTLE ROYAL', '#c8102e'); G.mode = 'royal'; G.hintText = 'Gõ số 1–32 để cổ vũ đô vật · tặng quà để tiếp sức';
  for (let i = 0; i < 32; i++) { const w = W[i]; w.reset(); w.user = G.slots[i].user; }
  const list = W.slice();
  showOnly([]); G.active = list;
  tron({ top: 'MEGA SLAM', name: 'BATTLE ROYAL 32', sub: 'Ném đối thủ qua dây trên cùng để loại · 16 người vào vòng trong', color: '#c8102e', big: true });
  comm('Ba hai đô vật, một võ đài! Ném đối thủ qua dây trên cùng để loại. Mười sáu người trụ lại sẽ vào vòng mười sáu!', 2, true);
  SFX.theme({ bpm: 132, key: 40, style: 'metal' }, 30);
  arena.setMood('#ff2a3d');
  // chỗ đứng trong võ đài (lưới 6×6 trừ 4 góc)
  const spots = [];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { if ((i === 0 || i === 5) && (j === 0 || j === 5)) continue; spots.push([-2.2 + i * 0.88, -2.2 + j * 0.88]); }
  spots.sort(() => Math.random() - 0.5);
  const order = list.slice().sort(() => Math.random() - 0.5);
  if (settings.royalEntrance) {
    setShot('stage', null, true); arena.pyroShow('#ff5a1f'); SFX.hit('boom');
    yield* wait(1.2);
    setShot('royal');
    for (let i = 0; i < order.length; i++) {
      const w = order[i], sp = spots[i];
      w.root.visible = true; w.place(STAGE.curtain.x + rand(-1, 1), STAGE.curtain.z + 0.6, 0);
      w.act = { k: 'path', t: 0, speed: 5.2, run: true, i: 0, pts: [[w.x, w.z, STAGE.y], [rand(-1, 1), STAGE.front + 0.3, STAGE.y], [rand(-1.2, 1.2), STAGE.rampEnd - 0.3, 0], [sp[0] * 0.6, -RING.apron - 0.4, 0], [sp[0] * 0.8, -RING.apron + 0.6, RING.y, { pose: P.lieFront, speed: 3.5 }], [sp[0], sp[1], RING.y]],
        then: () => { w.inRing = true; w.act = { k: 'getup', t: 0.2, prone: true }; } };
      if (i % 4 === 0) hud.tick(`🚪 ${w.label} ra sân`, '#fff');
      yield* wait(0.75);
    }
    yield* wait(2.5);
  } else {
    order.forEach((w, i) => { w.root.visible = true; w.place(spots[i][0], spots[i][1], rand(0, TAU)); w.inRing = true; w.act = { k: 'idle', t: 0 }; });
  }
  for (const w of list) if (!w.inRing) { w.place(spots[list.indexOf(w)][0], spots[list.indexOf(w)][1]); w.inRing = true; w.act = { k: 'idle', t: 0 }; }
  SFX.stopTheme(1.2);
  yield* wait(1);
  setPhase('royal', 'BATTLE ROYAL', '#c8102e');
  SFX.bell(2); staff.timekeeper.ring = 1; ref.act = 'idle'; ref.x = 0; ref.z = -RING.apron - 1.6; ref.y = 0;
  hud.banner('BATTLE ROYAL!', 'Bắt đầu!', '#ffd23f', 2.2, 140);
  G.fighting = true; royalT = 0; setShot('royal');
  // trận đấu
  let lastSwitch = 0;
  while (true) {
    const dt = yield; royalT += dt;
    const alive = list.filter(w => !w.out);
    G.timerText = fmtT(royalT);
    // chọn đối thủ gần nhất cho người rảnh
    for (const w of alive) {
      if (w.busy || (w.opp && !w.opp.out && dist(w, w.opp) < 2.2 && Math.random() > 0.01)) continue;
      let best = null, bd = 1e9;
      for (const o of alive) if (o !== w) { const dd = dist(w, o) + (o.busy ? 1.5 : 0) + Math.random() * 0.8; if (dd < bd) { bd = dd; best = o; } }
      w.opp = best;
    }
    // quá giờ: ép loại người yếu nhất
    if (royalT > settings.royalSeconds + 10 && alive.length > 16 && Math.floor(royalT) !== Math.floor(royalT - dt) && Math.floor(royalT) % 2 === 0) {
      const weak = alive.filter(w => !w.busy).sort((p, q) => p.hp - q.hp)[0];
      if (weak) { weak.x = clamp(weak.x * 1.4, -2.7, 2.7); weak.z = clamp(weak.z * 1.4, -2.7, 2.7); eliminate(weak, null); }
    }
    if (G.time - lastSwitch > 9) { lastSwitch = G.time; setShot(Math.random() < 0.5 ? 'royal' : 'ring'); }
    if (alive.length <= 16 && !list.some(w => w.act.k === 'move' && w.act.id === 'toss')) break;
    if (G.skip) { G.skip = false; while (list.filter(w => !w.out).length > 16) { const weak = list.filter(w => !w.out).sort((p, q) => p.hp - q.hp)[0]; eliminate(weak, null); } break; }
  }
  G.fighting = false;
  SFX.bell(3); staff.timekeeper.ring = 1.2;
  const qual = list.filter(w => !w.out);
  hud.banner('16 SIÊU SAO!', 'Vào vòng 16 · đấu loại trực tiếp', '#ffd23f', 3, 130);
  comm('Battle royal kết thúc! Mười sáu đô vật bước vào vòng đấu loại trực tiếp!', -1, true);
  for (const w of qual) { if (w.act.k !== 'move') w.act = { k: 'celebrate', t: 0, pose: pick([P.armsUp, P.flex, P.pump]) }; }
  setShot('royal');
  yield* wait(4);
  // những người bị loại còn trên sàn thì rời đi
  for (const w of list) if (w.out && w.act.k !== 'leave' && w.act.k !== 'gone') leaveArena(w);
  return qual;
}
function fmtT(s) { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

// ---------- nhánh đấu ----------
function seedBracket(qual) {
  // bảo đảm đủ 16 người (phòng trường hợp hiếm)
  if (qual.length < 16) { const extra = W.filter(w => !qual.includes(w)).sort((a, b) => b.hp - a.hp); while (qual.length < 16 && extra.length) { const w = extra.shift(); w.out = false; qual.push(w); } }
  if (qual.length > 16) qual = qual.slice().sort((a, b) => (b.elims - a.elims) || (b.hp - a.hp)).slice(0, 16);
  const seeds = qual.slice().sort((a, b) => (b.elims - a.elims) || (b.hp - a.hp) || (b.dmgDealt - a.dmgDealt));
  const order = [1, 16, 8, 9, 5, 12, 4, 13, 3, 14, 6, 11, 7, 10, 2, 15];
  const r16 = [];
  for (let i = 0; i < 16; i += 2) r16.push({ 0: seeds[order[i] - 1], 1: seeds[order[i + 1] - 1], winner: null, length: 2 });
  G.bracket = [r16];
}
const ROUND_NAMES = ['VÒNG 16', 'TỨ KẾT', 'BÁN KẾT', 'CHUNG KẾT'];

// ---------- ra sân ----------
function entrancePath(w, corner, mode) {
  const pts = [];
  if (mode === 'full') pts.push([0, STAGE.curtain.z + 0.5, STAGE.y], [0, STAGE.front + 0.4, STAGE.y]);
  pts.push([0, mode === 'full' ? STAGE.rampEnd - 0.2 : STAGE.rampEnd + 1.2, mode === 'full' ? 0 : 0]);
  const st = arena.stepsNorth;
  pts.push([st.x - 0.3, st.z - 1.0, 0], [st.x, st.z, 0], [st.x, -RING.apron + 0.15, RING.y, { speed: 1.6 }], [st.x - 0.25, -RING.rope + 0.25, RING.y, { pose: P.crouch, speed: 1.2 }], [corner.x * 0.75, corner.z * 0.75, RING.y]);
  return pts;
}
function* entrance(w, corner, mode) {
  const d = w.def;
  w.inRing = false;
  const full = mode === 'full';
  tron({ top: G.roundLabel, name: d.name, sub: d.nick, foot: w.user ? '🎮 ' + w.user.name : '', color: d.pyro || '#e8202a', big: true });
  arena.setMood(d.pyro || '#ff2a3d');
  SFX.theme(d.theme, full ? 15 : 8);
  hype = 0.9;
  const startZ = full ? STAGE.curtain.z + 0.5 : STAGE.rampEnd + 1.2;
  w.place(0, startZ, 0); w.root.visible = true;
  arena.follow.intensity = 900; arena.follow.color.set('#ffffff'); followTarget = w;
  w.act = { k: 'taunt', t: 0, dur: 99, pose: d.coat ? P.stand : P.stand };
  if (full) {
    setShot('stage', null, true);
    yield* wait(0.5);
    arena.pyroShow(d.pyro || '#ff5a1f'); SFX.hit('boom'); SFX.pop(1); fanBurst();
    comm(`Đến từ ${d.from}, nặng ${d.kg} ki lô gam... ${nameOf(w)}!`, 2, true);
    staff.announcer.talking = true;
    yield* wait(0.6);
    setShot('entrance', w);
    yield* tauntSeq(w, 2.2);
  } else {
    setShot('entrance', w, true);
    comm(`${nameOf(w)}!`, 2, true); staff.announcer.talking = true;
    yield* tauntSeq(w, 1.0);
  }
  w.act = { k: 'path', t: 0, speed: full ? 2.6 : 3.2, i: 0, pts: entrancePath(w, corner, mode) };
  while (w.act.k === 'path') {
    const dt = yield;
    if (w.z > -6.5 && cam.shot === 'entrance') setShot('entranceRing', w);
    if (G.skip) { G.skip = false; w.place(corner.x * 0.75, corner.z * 0.75); w.act = { k: 'idle', t: 0 }; break; }
  }
  staff.announcer.talking = false;
  arena.follow.intensity = 0; followTarget = null;
  w.inRing = true; w.place(w.x, w.z);
  // cởi áo choàng, leo dây góc chào khán giả
  if (w.body.coat) w.body.coat.visible = false;
  if (w.body.glasses) w.body.glasses.visible = false;
  if (full) {
    w.act = { k: 'walk', t: 0, tx: corner.x, tz: corner.z, run: false };
    while (w.act.k === 'walk') yield;
    w.act = { k: 'climb', t: 0, corner, target: null, id: null };
    let t = 0; while (t < 0.9) { const dt = yield; t += dt; }
    w.act = { k: 'celebrate', t: 0, pose: P.armsUp }; w.lift = 1.25; w.yaw = Math.atan2(corner.sx, corner.sz);
    arena.ringPosts(d.pyro || '#ff5a1f'); SFX.pop(1);
    yield* wait(1.6);
    w.lift = 0;
  }
  w.place(corner.x * 0.8, corner.z * 0.8, Math.atan2(-corner.x, -corner.z));
  w.act = { k: 'idle', t: 0 };
  SFX.stopTheme(1.5);
}
function* tauntSeq(w, dur) {
  const d = w.def;
  const poses = { flex: [P.flex], point: [P.pointUp, P.pointFwd], roar: [P.roar, P.armsUp], wide: [P.wide], pump: [P.pump, P.armsUp], spin: [P.armsUp, P.wide], bow: [P.bow, P.armsUp], kneel: [P.kneel, P.armsUp], shades: [P.shades, P.pointFwd] }[d.taunt] || [P.armsUp];
  const step = dur / poses.length;
  for (const p of poses) { w.act = { k: 'taunt', t: 0, dur: 99, pose: p }; if (p === P.pointFwd && w.body.glasses) w.body.glasses.visible = false; yield* wait(step); }
}

// ---------- một trận 1 đấu 1 ----------
function* match(a, b, ri, mi, nInRound) {
  const final = ri === 3;
  G.mode = 'match'; G.pair = [a, b]; G.current = { ri, mi };
  G.roundLabel = `${ROUND_NAMES[ri]}${final ? '' : ` · TRẬN ${mi + 1}/${nInRound}`}`;
  setPhase('intro', ROUND_NAMES[ri], ri === 3 ? '#d4a017' : '#c8102e');
  G.hintText = 'Gõ 1 cổ vũ góc ĐỎ · gõ 2 cổ vũ góc XANH · tặng quà để tiếp sức';
  for (const w of [a, b]) { const u = w.user, el = w.elims; w.reset(); w.user = u; w.elims = el; w.supporters = 0; if (w.body.coat) w.body.coat.visible = true; if (w.body.glasses) w.body.glasses.visible = true; }
  for (const [uid, w] of support) if (w === a || w === b) w.supporters++;
  a.opp = b; b.opp = a;
  showOnly([a, b]);
  a.root.visible = false; b.root.visible = false;
  matchResult = null;
  ref.act = 'idle'; ref.x = 0; ref.z = -0.6; ref.y = RING.y; ref.yaw = PI;
  for (const r of refs) if (r.extra) r.body.root.visible = false;
  led.show(G.bracket, ri); setShot('tron', null, true);
  comm(`${ROUND_NAMES[ri]}${final ? '' : ', trận ' + (mi + 1)}: ${a.def.name} đối đầu ${b.def.name}!`, -1, true);
  yield* wait(3);
  led.hide();
  const e = settings.entrance;
  const mode = e === 'off' ? 'off' : e === 'short' ? 'short' : e === 'full' ? 'full' : (ri >= 1 ? 'full' : 'short');
  const cA = CORNERS[0], cB = CORNERS[2];
  if (mode === 'off') {
    for (const [w, c] of [[a, cA], [b, cB]]) { w.root.visible = true; w.inRing = true; w.place(c.x * 0.8, c.z * 0.8, Math.atan2(-c.x, -c.z)); w.act = { k: 'idle', t: 0 }; if (w.body.coat) w.body.coat.visible = false; }
  } else {
    setPhase('entrance', 'RA SÂN', '#7d3cc8');
    yield* entrance(a, cA, mode);
    yield* entrance(b, cB, mode);
  }
  tron({ top: G.roundLabel, name: `${a.def.name}  vs  ${b.def.name}`, sub: final ? 'TRANH ĐAI VÔ ĐỊCH MEGA SLAM' : '', color: final ? '#d4a017' : '#c8102e' });
  arena.setMood(final ? '#ffd23f' : '#ff2a3d');
  setShot('ring');
  ref.act = 'bell'; yield* wait(0.8);
  SFX.bell(1); staff.timekeeper.ring = 0.6; ref.act = 'watch';
  hud.banner('BẮT ĐẦU!', G.roundLabel, '#fff', 1.4, 130);
  setPhase('fight', ROUND_NAMES[ri], final ? '#d4a017' : '#c8102e');
  matchT = 0; G.fighting = true;
  a.thinkT = rand(0.3, 0.9); b.thinkT = rand(0.3, 0.9);
  let lastCut = 0, coverCam = false;
  while (!matchResult) {
    const dt = yield; matchT += dt;
    G.timerText = fmtT(matchT);
    // đè đếm: trọng tài lại đếm
    const cover = [a, b].find(w => w.act.k === 'cover');
    assignCounts();
    if (cover && cover.act.ref && !coverCam) { setShot('pin', { x: cover.act.partner.x, z: cover.act.partner.z }); coverCam = true; }
    else if (!cover && coverCam) { coverCam = false; setShot('ring'); }
    // máy quay
    const perch = [a, b].find(w => w.act.k === 'perch' || w.act.k === 'climb');
    if (perch && cam.shot !== 'aerial') setShot('aerial', { x: perch.x, z: perch.z });
    else if (!perch && !cover && G.time - lastCut > 7) { lastCut = G.time; setShot(cam.shot === 'ring' ? 'close' : 'ring'); }
    else if (!perch && !cover && cam.shot === 'aerial' && ![a, b].some(w => w.act.k === 'move')) setShot('ring');
    // quá giờ: dồn nộ
    if (matchT > settings.matchSeconds) { a.mom = Math.min(100, a.mom + dt * 8); b.mom = Math.min(100, b.mom + dt * 8); }
    if (G.skip) { G.skip = false; const w = a.hp >= b.hp ? a : b; win(w, w === a ? b : a, 'xử thắng'); }
    if (a.hp <= 0 && !matchResult && !a.busy) { if (b.act.k === 'idle' && a.down) startMove(b, a, 'cover'); }
    if (b.hp <= 0 && !matchResult && !b.busy) { if (a.act.k === 'idle' && b.down) startMove(a, b, 'cover'); }
  }
  // kết quả
  const { w, l, how } = matchResult;
  setPhase('result', 'KẾT QUẢ', '#2fbf5a');
  ref.act = 'idle';
  hud.banner(`${w.def.name.toUpperCase()} THẮNG!`, `${how} · ${w.user ? '🎮 ' + w.user.name : 'đô vật máy'}`, '#ffd23f', 3.2, 110);
  comm(`Người chiến thắng, bằng ${how}... ${nameOf(w)}!`, 2, true);
  tron({ top: G.roundLabel, name: w.def.name, sub: 'CHIẾN THẮNG!', foot: w.user ? '🎮 ' + w.user.name : '', color: w.def.pyro || '#2fbf5a', big: true });
  socket.emit('result', { kind: 'match', winner: userInfo(w), loser: userInfo(l), final });
  yield* wait(0.8);
  SFX.theme(w.def.theme, 7);
  // trọng tài giơ tay người thắng
  ref.act = 'raise'; ref.x = clamp(w.x + 0.6, -2.5, 2.5); ref.z = clamp(w.z, -2.5, 2.5); ref.yaw = PI;
  setShot('champ', w);
  yield* wait(3.2);
  // người thắng leo cột chào
  const c = CORNERS.slice().sort((p, q) => Math.hypot(p.x - w.x, p.z - w.z) - Math.hypot(q.x - w.x, q.z - w.z))[0];
  w.act = { k: 'walk', t: 0, tx: c.x, tz: c.z };
  let t = 0; while (w.act.k === 'walk' && t < 3) { t += yield; }
  w.act = { k: 'celebrate', t: 0, pose: P.flex }; w.lift = 1.0; w.yaw = Math.atan2(c.sx, c.sz);
  arena.ringPosts(w.def.pyro || '#ffd23f');
  yield* wait(2.2);
  w.lift = 0; w.act = { k: 'idle', t: 0 };
  l.act = { k: 'getup', t: 0, prone: false };
  SFX.stopTheme(1);
  G.fighting = false;
  return w;
}
function userInfo(w) { return w.user ? { id: w.user.id, name: w.user.name, avatar: w.user.avatar } : { id: 'bot' + w.idx, name: w.def.name, bot: true }; }

// ---------- cô gái cầm biển đi quanh võ đài ----------
const GIRL_DEF = { name: 'Ring girl', girl: true, female: true, proc: true, height: 1.7, bulk: 0.84, skin: '#f2d0b8', hair: 'long', hairColor: '#2a1a12', outfit: 'trunks', top: 'tank', attire: '#111111', attire2: '#e8202a', boots: '#f4f4f4', bootH: 'low', kneepads: false, skirt: true, wrist: '#f2d0b8', stats: { hp: 1, pow: 1, spd: 1, agi: 1 } };
let girl = null, sign = null;
function signTexture(text) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 320; const g = cv.getContext('2d');
  g.fillStyle = '#fafafa'; g.fillRect(0, 0, 512, 320); g.strokeStyle = '#e8202a'; g.lineWidth = 18; g.strokeRect(9, 9, 494, 302);
  g.fillStyle = '#111'; g.font = '900 44px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MEGA SLAM', 256, 64);
  g.fillStyle = '#e8202a'; let size = 120; g.font = `900 ${size}px Impact, "Arial Black", sans-serif`; while (g.measureText(text).width > 470) { size -= 6; g.font = `900 ${size}px Impact, "Arial Black", sans-serif`; } g.fillText(text, 256, 190);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function ensureGirl() {
  if (girl) return;
  girl = new Wr(GIRL_DEF, -1); girl.armsUp = true;
  sign = new THREE.Group();
  for (const ry of [0, PI]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, emissive: 0xffffff, emissiveIntensity: 0.25 })); m.rotation.y = ry; m.position.z = ry ? -0.01 : 0.01; sign.add(m); }
  sign.visible = false; scene.add(sign);
}
function* ringGirl(text) {
  if (settings.ringGirl === false) return;
  ensureGirl();
  const tex = signTexture(text); for (const m of sign.children) { if (m.material.map) m.material.map.dispose(); m.material.map = tex; m.material.emissiveMap = tex; m.material.needsUpdate = true; }
  const A = RING.rope + 0.36;
  girl.root.visible = true; girl.place(3.08, -5.7, 0); girl.inRing = false;
  girl.act = { k: 'path', t: 0, speed: 2.1, i: 0, pts: [[3.08, -5.7, 0], [3.08, -4.3, 0.55, { speed: 1.4 }], [3.08, -3.75, RING.y, { speed: 1.4 }], [A, -A, RING.y], [A, A, RING.y], [-A, A, RING.y], [-3.08, 3.9, RING.y], [-3.08, 4.6, 0.6, { speed: 1.4 }], [-3.08, 5.6, 0, { speed: 1.4 }], [-6.0, 6.0, 0]] };
  G.active.push(girl);
  sign.visible = true;
  setShot('royal');
  comm(`Xin mời quý vị đến với ${text.toLowerCase()}!`, 2, true);
  SFX.pop(0.6); hype = Math.min(1, hype + 0.3);
  while (girl.act.k === 'path') { yield; if (girl.act.i === 3 && cam.shot !== 'girl') setShot('girl', girl, true); if (G.skip) { G.skip = false; break; } }
  girl.root.visible = false; sign.visible = false;
  G.active = G.active.filter(w => w !== girl);
}

// ---------- vòng 16: 8 cặp đánh cùng lúc ----------
const PAIR_SPOTS = [[-1.9, -1.35], [-0.63, -1.35], [0.63, -1.35], [1.9, -1.35], [-1.9, 1.35], [-0.63, 1.35], [0.63, 1.35], [1.9, 1.35]];
const WAIT_SPOTS = [[-3.3, 5.3], [-1.1, 5.3], [1.1, 5.3], [3.3, 5.3], [-5.3, 3.2], [-5.3, 1.1], [-5.3, -1.1], [-5.3, -3.2]];
let waitIdx = 0, ledCamUntil = 0;
function pairResult(w, l, how) {
  const rd = G.bracket[0];
  const mi = rd.findIndex(m => (m[0] === w && m[1] === l) || (m[0] === l && m[1] === w));
  if (mi < 0 || rd[mi].winner) return;
  const m = rd[mi];
  led.result(2 * mi + (m[0] === l ? 0 : 1), 2 * mi + (m[0] === w ? 0 : 1));
  m.winner = w; w.done = true; l.done = true;
  SFX.bell(1); staff.timekeeper.ring = 0.6; SFX.pop(0.9); hype = Math.min(1, hype + 0.2);
  hud.banner(`${w.label} VÀO TỨ KẾT!`, `${how} · loại ${l.label}`, '#ffd23f', 2.2, 90);
  hud.tick(`❌ ${l.label} bị loại · ${w.label} vào tứ kết`, '#ff8a8a');
  if (Math.random() < 0.7) comm(`${w.def.name} thắng bằng ${how} và giành vé vào tứ kết!`, -1);
  socket.emit('result', { kind: 'match', winner: userInfo(w), loser: userInfo(l), final: false });
  if (w.act.k !== 'move') w.act = { k: 'celebrate', t: 0, pose: pick([P.armsUp, P.flex, P.pump]) };
  w.exitAt = G.time + 2.0;
  if (l.act.k !== 'out' && l.act.k !== 'leave') { if (l.act.k !== 'move') l.act = { k: 'down', t: 0, dur: 99, prone: false }; l.leaveAt = G.time + 3.0; }
  if (G.time > ledCamUntil - 1 && !refs.some(r => r.act === 'count')) { setShot('tron'); ledCamUntil = G.time + 3.2; }
}
function* r16Together() {
  const rd = G.bracket[0];
  const list = []; rd.forEach(m => list.push(m[0], m[1]));
  G.mode = 'multi'; G.pair = null; G.roundLabel = 'VÒNG 16 · 8 CẶP ĐẤU CÙNG LÚC';
  setPhase('r16', 'VÒNG 16', '#c8102e');
  G.hintText = 'Gõ số 1–32 để cổ vũ · tặng quà để tiếp sức đô vật của bạn';
  // giữ chỗ đứng hiện tại, hồi máu, ghép cặp
  for (const w of list) { const x = w.x, z = w.z, u = w.user, el = w.elims; w.reset(); w.user = u; w.elims = el; w.place(x, z); w.inRing = true; w.done = false; w.exitAt = 0; w.leaveAt = 0; w.root.visible = true; }
  showOnly(list);
  rd.forEach((m, i) => {
    const [cx, cz] = PAIR_SPOTS[i];
    m[0].opp = m[1]; m[1].opp = m[0];
    m[0].act = { k: 'walk', t: 0, tx: cx - 0.55, tz: cz }; m[1].act = { k: 'walk', t: 0, tx: cx + 0.55, tz: cz };
  });
  waitIdx = 0;
  for (const r of refs) { r.body.root.visible = true; r.act = 'roam'; r.x = r.home[0]; r.z = r.home[1]; r.y = RING.y; }
  comm('Vòng mười sáu! Tám cặp đấu cùng lúc trên một võ đài! Thắng bằng đè đếm ba, khoá đầu hàng hoặc ném đối thủ qua dây!', -1, true);
  yield* wait(1.5);
  if (settings.ringGirl !== false) yield* ringGirl('VÒNG 16'); else yield* wait(2);
  rd.forEach(m => { m[0].opp = m[1]; m[1].opp = m[0]; });
  for (const w of list) if (w.act.k === 'walk' || w.act.k === 'idle') { w.act = { k: 'idle', t: 0 }; w.yaw = faceTo(w, w.opp); }
  tron({ top: 'VÒNG 16', name: '8 CẶP CÙNG LÚC', sub: 'Thắng 1 trận là vào tứ kết', color: '#c8102e', big: true });
  setShot('royal');
  yield* wait(0.8);
  led.show(G.bracket, 0);
  SFX.bell(1); staff.timekeeper.ring = 0.6;
  hud.banner('VÒNG 16!', '8 cặp đấu cùng lúc', '#ffd23f', 1.8, 130);
  G.fighting = true; matchT = 0;
  let lastCut = 0;
  while (rd.some(m => !m.winner)) {
    const dt = yield; matchT += dt;
    G.timerText = fmtT(matchT);
    assignCounts();
    // người thắng ra ngoài đứng chờ, người thua rời đi
    for (const w of list) {
      if (w.exitAt && G.time > w.exitAt && w.act.k !== 'move') { w.exitAt = 0; const [fx, fz] = WAIT_SPOTS[waitIdx++ % 8]; w.act = { k: 'path', t: 0, speed: 2.2, i: 0, pts: exitRingPts(w, fx, fz), then: () => { w.inRing = false; w.act = { k: 'celebrate', t: 0, pose: P.flex, clip: 'clap' }; w.yaw = Math.atan2(-w.x, -w.z); } }; w.inRing = false; }
      if (w.leaveAt && G.time > w.leaveAt && w.act.k !== 'move' && w.act.k !== 'leave') { w.leaveAt = 0; leaveArena(w); }
    }
    // máy quay
    const counting = refs.find(r => r.act === 'count' && r.cover);
    if (counting && cam.shot !== 'pin') setShot('pin', { x: counting.cover.act.partner.x, z: counting.cover.act.partner.z });
    else if (!counting && cam.shot === 'pin') setShot('royal');
    else if (!counting && cam.shot === 'tron' && G.time > ledCamUntil) setShot('royal');
    else if (!counting && cam.shot !== 'tron' && G.time - lastCut > 8) { lastCut = G.time; setShot(cam.shot === 'royal' ? 'ring' : 'royal'); }
    // quá giờ: dồn nộ, rồi trọng tài xử
    if (matchT > settings.matchSeconds) for (const m of rd) if (!m.winner) { m[0].mom = Math.min(100, m[0].mom + dt * 8); m[1].mom = Math.min(100, m[1].mom + dt * 8); }
    const force = G.skip || matchT > settings.matchSeconds * 1.8;
    if (force) {
      const m = rd.find(x => !x.winner && !x[0].busy && !x[1].busy) || (G.skip ? rd.find(x => !x.winner) : null);
      if (m) { const w = m[0].hp >= m[1].hp ? m[0] : m[1]; pairResult(w, w === m[0] ? m[1] : m[0], 'trọng tài xử'); }
      if (!rd.some(x => !x.winner)) G.skip = false;
    }
  }
  G.fighting = false;
  SFX.bell(3); staff.timekeeper.ring = 1.2;
  hud.banner('XONG VÒNG 16!', '8 đô vật vào tứ kết', '#ffd23f', 2.5, 120);
  setShot('tron'); ledCamUntil = G.time + 3;
  yield* wait(3);
  for (const r of refs) if (r.extra) r.body.root.visible = false;
}
function makeNextRound(ri) {
  const rd = G.bracket[ri], next = [];
  for (let i = 0; i < rd.length; i += 2) next.push({ 0: rd[i].winner, 1: rd[i + 1].winner, winner: null, length: 2 });
  G.bracket.push(next);
}
// hết một vòng: bảng LED trượt sang vòng mới + cô gái cầm biển
function* roundTransition(ri) {
  if (ri < 3) makeNextRound(ri);
  G.mode = null; showOnly([]); G.pair = null;
  led.show(G.bracket, ri); led.nextRound(); setShot('tron', null, true);
  setPhase('bracket', ROUND_NAMES[ri + 1] || 'VÔ ĐỊCH', '#1d4fd8');
  hud.banner((ROUND_NAMES[ri + 1] || 'NHÀ VÔ ĐỊCH') + '!', ri < 3 ? `${G.bracket[ri + 1].length * 2} đô vật còn lại` : '', '#ffd23f', 2.4, 130);
  yield* wait(2.6);
  if (ri < 3) yield* ringGirl(ROUND_NAMES[ri + 1]);
}
function* knockout(qual) {
  seedBracket(qual);
  G.mode = null; G.pair = null;
  setPhase('bracket', 'NHÁNH ĐẤU', '#1d4fd8');
  led.show(G.bracket, 0); setShot('tron', null, true);
  comm('Nhánh đấu vòng mười sáu đã được xếp! Người loại được nhiều đối thủ nhất ở battle royal là hạt giống số một.', -1, true);
  yield* wait(4.5);
  let startRi = 0;
  if (settings.r16Together !== false) { yield* r16Together(); yield* roundTransition(0); startRi = 1; }
  else { for (const w of W) w.root.visible = false; }
  for (let ri = startRi; ri < 4; ri++) {
    const rd = G.bracket[ri];
    for (let mi = 0; mi < rd.length; mi++) {
      const m = rd[mi];
      const w = yield* match(m[0], m[1], ri, mi, rd.length);
      // kết quả lên bảng LED: người thua gạch X đỏ bay đi, người thắng trượt sang vòng sau
      G.mode = null; showOnly([]);
      led.show(G.bracket, ri); m.winner = w;
      led.result(2 * mi + (m[0] === w ? 1 : 0), 2 * mi + (m[0] === w ? 0 : 1));
      setShot('tron', null, true);
      yield* wait(3.2);
    }
    yield* roundTransition(ri);
  }
  return G.bracket[3][0].winner;
}

function* ceremony(champ) {
  setPhase('ceremony', 'NHÀ VÔ ĐỊCH', '#d4a017');
  G.hintText = '🏆 Chúc mừng nhà vô địch! Tặng quà để ăn mừng cùng nhà vô địch';
  G.champion = champ; G.bracket.push([{ 0: champ, 1: null, winner: champ, length: 2 }]);
  showOnly([champ]); champ.root.visible = true;
  champ.place(0, 0.3, 0); champ.inRing = true; champ.act = { k: 'celebrate', t: 0, pose: P.armsUp };
  tron({ top: 'NHÀ VÔ ĐỊCH MỚI', name: champ.def.name, sub: champ.user ? '🎮 ' + champ.user.name : champ.def.nick, color: '#d4a017', big: true });
  arena.setMood('#ffd23f');
  SFX.theme(champ.def.theme, 18);
  for (let i = 0; i < 5; i++) setTimeout(() => { arena.burst(rand(-2, 2), RING.y + 4, rand(-2, 2), '#fff', 140, 'confetti'); }, i * 500);
  arena.pyroShow('#ffd23f'); arena.ringPosts('#ffd23f'); SFX.hit('boom'); SFX.pop(1); hype = 1;
  hud.banner('NHÀ VÔ ĐỊCH!', champ.label, '#ffd23f', 4, 150);
  comm(`Quý vị và các bạn... nhà vô địch Mega Slam mới... ${nameOf(champ)}!`, 2, true);
  socket.emit('result', { kind: 'champion', winner: userInfo(champ), wrestler: champ.def.name });
  setShot('champ', champ, true);
  // trọng tài trao đai
  ref.act = 'idle'; ref.x = 1.2; ref.z = 0.6; ref.yaw = -PI / 2;
  beltOwner = ref; beltMesh.visible = true;
  yield* wait(2.5);
  beltOwner = champ; champ.act = { k: 'celebrate', t: 0, pose: P.belt };
  SFX.pop(1);
  yield* wait(5);
  // leo cột giơ đai
  const c = CORNERS[0];
  champ.act = { k: 'walk', t: 0, tx: c.x, tz: c.z };
  let t = 0; while (champ.act.k === 'walk' && t < 3) t += yield;
  champ.act = { k: 'celebrate', t: 0, pose: P.belt }; champ.lift = 1.0; champ.yaw = Math.atan2(c.sx, c.sz);
  arena.ringPosts('#ffd23f'); for (let i = 0; i < 3; i++) setTimeout(() => arena.burst(c.x, RING.y + 4, c.z, '#fff', 120, 'confetti'), i * 400);
  yield* wait(5);
  SFX.stopTheme(2);
}
function* breakTime(champ) {
  setPhase('break', 'NGHỈ GIỮA GIẢI', '#2fbf5a');
  G.breakLeft = settings.breakSeconds;
  G.hintText = `Gõ “${G.joinWord}” để ghi danh giải sau`;
  while (G.breakLeft > 0) { const dt = yield; G.breakLeft -= dt; if (G.skip) { G.skip = false; break; } }
  champ.lift = 0; beltMesh.visible = false; beltOwner = null;
}
function* tournament() {
  while (true) {
    yield* registration();
    const qual = yield* royal();
    const champ = yield* knockout(qual);
    yield* ceremony(champ);
    yield* breakTime(champ);
    G.cup++;
  }
}

// ================== QUÀ / BÌNH LUẬN TIKTOK ==================
function powerList() {
  const list = (settings.powers && settings.powers.length ? settings.powers : Object.keys(POWER_META).map((id, i) => ({ id, min: [1, 5, 10, 30, 99, 199, 299, 999][i] })));
  return list.map(p => ({ ...p, icon: (POWER_META[p.id] || [])[0], label: (POWER_META[p.id] || [])[1] })).filter(p => p.label).sort((a, b) => a.min - b.min);
}
function wrestlerOfUser(uid) {
  for (const w of G.active) if (w.user && w.user.id === uid && !w.out && w.visible) return w;
  return null;
}
function targetFor(user) {
  const own = wrestlerOfUser(user.id); if (own) return own;
  const s = support.get(user.id); if (s && G.active.includes(s) && !s.out && s.visible) return s;
  if (G.mode === 'match' && G.pair) return G.pair[0].hp <= G.pair[1].hp ? G.pair[0] : G.pair[1];
  const alive = G.active.filter(w => !w.out && w.visible);
  return alive.length ? pick(alive) : null;
}
function applyPower(id, w, user) {
  if (!w) return;
  const name = w.def.name;
  switch (id) {
    case 'enter': w.hp = Math.min(w.maxHp, w.hp + 20); break;
    case 'heal': w.hp = Math.min(w.maxHp, w.hp + 40); break;
    case 'chair': w.chair = true; chairOwner = w; break;
    case 'rage': w.rageT = 15; break;
    case 'finisher': w.mom = 100; w.forceFin = true; break;
    case 'revive':
      if (w.out && G.mode === 'royal' && G.active.filter(x => !x.out).length > 16) { w.out = false; w.inRing = true; w.hp = Math.round(w.maxHp * 0.6); w.root.visible = true; w.place(clamp(w.x, -2.5, 2.5), clamp(w.z, -2.5, 2.5)); w.act = { k: 'getup', t: 0, prone: true }; hud.banner('HỒI SINH!', name, '#3dff6e', 1.8, 120); }
      else { w.reviveShield = true; w.hp = Math.min(w.maxHp, w.hp + 30); if (w.down) w.act.dur = 0; }
      break;
    case 'giant': w.giantT = 20; break;
    case 'legend': w.legendT = 20; w.hp = w.maxHp; break;
  }
  hype = Math.min(1, hype + 0.2);
}
function onGift(ev) {
  const user = ev.user || {}, value = Number(ev.value) || 0;
  const list = powerList();
  let p = ev.forcePower ? list.find(x => x.id === ev.forcePower) : null;
  if (!p) p = list.find(x => x.gift && ev.gift && x.gift === ev.gift.name);
  if (!p) p = list.filter(x => value >= x.min).pop();
  if (!p) return;
  hud.chat(user, `🎁 ${ev.gift ? ev.gift.name : 'quà'} ×${ev.count || 1} → ${p.icon} ${p.label}`, true);
  if (G.phase === 'reg' || G.phase === 'break') { register(user, null); if (G.phase === 'reg') return; }
  const w = targetFor(user);
  if (!w || !G.active.length) { register(user, null); return; }
  applyPower(p.id, w, user);
  hud.tick(`${p.icon} ${user.name}: ${p.label} cho ${w.label}`, '#ffd23f');
  if (value >= 30 || ['finisher', 'revive', 'giant', 'legend', 'chair'].includes(p.id)) {
    hud.banner(p.icon + ' ' + p.label.toUpperCase(), `${user.name} tiếp sức cho ${w.def.name}`, '#ffd23f', 2, 90);
    comm(`Cảm ơn ${window.MC ? window.MC.clean(user.name) : user.name}! ${w.def.name} được ${p.label}!`, -1, value >= 99);
  }
}
function onChat(ev) {
  const user = ev.user || {}, text = String(ev.text || '');
  const t = deacc(text).trim();
  if (settings.showComments !== false && text) hud.chat(user, text);
  const words = joinWordsList();
  const num = (t.match(/\d+/) || [])[0];
  const isJoin = words.some(wd => t === wd || t.startsWith(wd + ' ') || t.startsWith(wd));
  if (isJoin) { register(user, num ? +num : null); return; }
  // cổ vũ
  if (num) {
    const n = +num;
    let w = null;
    if (G.mode === 'match' && G.pair && (n === 1 || n === 2)) w = G.pair[n - 1];
    else if (G.mode === 'royal' && n >= 1 && n <= 32) w = W[n - 1];
    if (w && !w.out) {
      const prev = support.get(user.id);
      if (prev !== w) { support.set(user.id, w); w.supporters = (w.supporters || 0) + 1; if (prev) prev.supporters = Math.max(0, (prev.supporters || 1) - 1); }
      w.mom = Math.min(100, w.mom + 2);
    }
  }
  // người chơi gõ "đánh"/"chiêu" khi đang đấu: tăng nộ cho đô vật của mình
  const own = wrestlerOfUser(user.id); if (own) own.mom = Math.min(100, own.mom + 3);
}
function onLike(ev) {
  const n = Number(ev.count) || 1;
  hype = Math.min(1, hype + n * 0.002);
  if (!settings.likeCheer) return;
  const w = targetFor(ev.user || {}); if (w) w.mom = Math.min(100, w.mom + n * 0.4);
}
const socket = io();
socket.on('connect', () => socket.emit('hello', 'game'));
socket.on('settings', s => {
  const prevQ = settings.quality;
  settings = Object.assign(settings, s); G.settings = settings;
  if (params.has('fast')) Object.assign(settings, { regSeconds: 8, royalSeconds: 70, matchSeconds: 40, breakSeconds: 8, entrance: 'short' });
  if (URL_SPEED) settings.speed = URL_SPEED;
  if (params.has('entrance')) settings.entrance = params.get('entrance');
  SFX.setVolume(settings.volume ?? 0.5);
  if (window.MC) { MC.rate = settings.ttsRate || 1.08; MC.volume = settings.ttsVolume ?? 1; MC.enabled = settings.commentary !== false; MC.pref = [settings.ttsVoice || '', settings.ttsVoice2 || '']; }
  G.joinWord = (String(settings.joinWords || 'đấu').split(',')[0] || 'đấu').trim();
  G.powerList = powerList();
  if (prevQ !== settings.quality) { setupComposer(); resize(); }
});
socket.on('records', r => { G.records = r || []; });
socket.on('ev', ev => {
  try {
    if (!ev) return;
    if (ev.type === 'chat') onChat(ev);
    else if (ev.type === 'gift') onGift(ev);
    else if (ev.type === 'like') onLike(ev);
    else if (ev.type === 'follow') { hud.tick(`➕ ${ev.user.name} đã follow`, '#9cf'); hype = Math.min(1, hype + 0.05); }
    else if (ev.type === 'share') hud.tick(`↗ ${ev.user.name} đã chia sẻ`, '#9cf');
    else if (ev.type === 'member') { if (Math.random() < 0.3) hud.tick(`👋 ${ev.user.name} vào xem`, '#ccc'); }
  } catch (e) { console.error(e); }
});
socket.on('cmd', c => {
  if (!c) return;
  if (c.type === 'start') G.forceStart = true;
  else if (c.type === 'skip') G.skip = true;
  else if (c.type === 'reset') { flow = tournament(); flow.next(); for (const w of W) { w.root.visible = false; w.reset(); } }
  else if (c.type === 'reload') location.reload();
});
setInterval(() => socket.emit('status', { phase: G.phaseLabel, alive: G.active.filter(w => !w.out).length, match: G.roundLabel, humans: G.slots.filter(s => s.user).length, fps: Math.round(fps) }), 2000);

// ================== VÒNG LẶP ==================
G.powerList = powerList();
flow = tournament(); flow.next();
if (TEST && params.has('r16')) {
  flow = (function* () {
    for (let i = 0; i < 32; i++) { W[i].reset(); W[i].user = i % 3 === 0 ? { id: 't' + i, name: 'Người xem ' + i, avatar: '' } : null; }
    const qual = W.slice(0, 16); G.mode = 'royal';
    qual.forEach((w, i) => { w.root.visible = true; w.inRing = true; w.place(-2 + (i % 4) * 1.3, -2 + Math.floor(i / 4) * 1.3); w.act = { k: 'idle', t: 0 }; });
    G.active = qual;
    const champ = yield* knockout(qual); yield* ceremony(champ); yield* breakTime(champ); yield* tournament();
  })(); flow.next();
}
if (TEST && params.has('ceremony')) { const c = W[+params.get('ceremony') || 0]; c.user = { id: 'x', name: 'Văn Chương', avatar: '' }; flow = (function* () { yield* ceremony(c); yield* breakTime(c); yield* tournament(); })(); flow.next(); }
let last = performance.now(), fps = 60, fpsAcc = 0, fpsN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const real = Math.min(0.05, (now - last) / 1000); last = now;
  fpsAcc += real; fpsN++; if (fpsAcc > 1) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  if (slowT > 0) { slowT -= real; if (slowT <= 0) slowmo = 1; }
  const dt = real * (settings.speed || 1) * slowmo;
  step(dt, real);
}
function step(dt, real, draw = true) {
  G.time += dt;
  if (TEST && window.__autoskip && G.phase !== 'royal' && G.phase !== 'royalIntro' && !(window.__untilFinal && G.current && G.current.ri === 3)) G.skip = true;
  try { flow.next(dt); } catch (e) { window.__lastErr = String(e && e.stack); console.error('Lỗi kịch bản', e); flow = tournament(); flow.next(); }
  for (const w of G.active) if (w.visible) updateW(w, dt);
  separate();
  for (const w of G.active) if (w.visible) syncBody(w, dt);
  updateStaff(dt);
  updateFans(dt);
  if (cam.shot === 'crowd' && crowdUntil && G.time > crowdUntil) { crowdUntil = 0; setShot(G.mode === 'royal' ? 'royal' : 'ring', null, true); }
  // ghế + đai
  if (chairOwner && chairOwner.chair && chairOwner.visible) {
    chairMesh.visible = true;
    handWorld(chairOwner.body, true, _v); const r = handWorld(chairOwner.body, false, new THREE.Vector3());
    chairMesh.position.copy(_v).add(r).multiplyScalar(0.5); chairMesh.rotation.set(0, chairOwner.pyaw, 0);
  } else { chairMesh.visible = false; if (chairOwner && !chairOwner.chair) chairOwner = null; }
  if (beltOwner && beltMesh.visible) {
    const b = beltOwner.body || beltOwner;
    if (beltOwner === ref) { handWorld(ref.body, false, beltMesh.position); beltMesh.rotation.set(0, ref.yaw, 0); }
    else { handWorld(b, true, _v); const r = handWorld(b, false, new THREE.Vector3()); beltMesh.position.copy(_v).add(r).multiplyScalar(0.5); beltMesh.position.y += 0.05; beltMesh.rotation.set(0, beltOwner.pyaw, 0); }
  }
  if (followTarget) { arena.follow.position.set(followTarget.px * 0.5, followTarget.py + 11, followTarget.pz + 7); arena.follow.target.position.set(followTarget.px, followTarget.py + 1, followTarget.pz); arena.follow.target.updateMatrixWorld(); }
  led.update(real, w => w.hp / w.maxHp);
  if (sign && sign.visible && girl) { handWorld(girl.body, true, _v); const r2 = handWorld(girl.body, false, new THREE.Vector3()); sign.position.copy(_v).add(r2).multiplyScalar(0.5); sign.position.y += 0.32; sign.rotation.set(0, girl.pyaw + PI / 2, 0); }
  hype = Math.max(0.25, hype - dt * 0.05);
  SFX.crowd(hype);
  arena.update(G.time, dt, hype);
  updateCamera(real);
  if (G.bracketShow > 0) G.bracketShow -= real;
  if (!draw) { hud.tickOnly && hud.tickOnly(real); return; }
  if (composer) composer.render(); else renderer.render(scene, camera);
  G.camShot = cam.shot;
  hud.draw(G, real);
}
if (!TEST) requestAnimationFrame(frame);

// âm thanh cần một lần chạm (trình duyệt thường); OBS tự phát
const tap = document.getElementById('tap');
function unlock() { SFX.start(); tap.style.display = 'none'; window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); }
window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
SFX.start();
setTimeout(() => { if (!SFX.started() && !OBS) tap.style.display = 'flex'; }, 800);

// chế độ thử: tự sinh người xem
if (TEST) {
  window.__G = G; window.__W = W; window.__step = (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) step(dt * (settings.speed || 1), dt, i === n - 1); return G.phase + ' | ' + G.phaseLabel + ' | ' + G.roundLabel + ' | alive ' + G.active.filter(w => !w.out).length; };
  window.__dbg = () => JSON.stringify(W.slice(0, 5).map(w => [w.def.name, w.root.visible, w.act.k, +w.px.toFixed(2), +w.py.toFixed(2), +w.pz.toFixed(2), +w.root.scale.x.toFixed(2), w.inRing, w.out, G.headScreen(w)])) + ' cam ' + camera.position.toArray().map(v => v.toFixed(1)) + ' shot ' + cam.shot + ' active ' + G.active.length;
  window.__crowd = (i = 0) => { cam.fanIdx = i; setShot('crowd', null, true); return fans.length; };
  window.__nan = () => JSON.stringify(W.filter(w => !isFinite(w.px) || !isFinite(w.x) || !isFinite(w.py) || !isFinite(w.root.scale.x) || !isFinite(w.pyaw) || !isFinite(w.lift)).map(w => [w.def.name, w.act.k, w.x, w.z, w.px, w.py, w.pyaw, w.root.scale.x, w.act.i, w.lift, w.pathY]).slice(0, 4));
  window.__fake = (k, n = 1) => { for (let i = 0; i < n; i++) socket.emit('test', { kind: k, n: 1 }); };
}
window.done = true;
