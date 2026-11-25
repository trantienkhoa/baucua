// Nhân vật người thật (tp-001 … tp-050) dùng chung với game kể chuyện ma "Ngọn Lửa":
// GLB khung xương Mixamo, mỗi file có sẵn 14 động tác. Tư thế ngồi xe được dựng thêm bằng cách xoay khớp.
import { THREE } from './three.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const NV_BASE = window.__NV_BASE || '/models/ma/nhanvat/';
const NV_EXT = window.__NV_EXT || '.glb';   // bản xem thử trên web dùng glTF dạng JSON nhúng dữ liệu
export const K = 2.9;                 // đơn vị thế giới trên 1 mét (người 1,7 m cao khoảng 4,9)
export const RESERVED = 'tp-025';     // ông cụ khăn rằn: vai Chú Bảy, không cấp cho người xem (giống ông Tư bên game ma)
export const MOVES = ['di_bo', 'chay_bo', 'dung_yen', 'vay_tay', 'vo_tay', 'cui_chao', 'ngoi_bet', 'ngoi_so', 'ngoi_xom', 'giat_minh', 'run_so', 'nhay_mua', 'nhin_quanh', 'chi_tay'];

const loader = new GLTFLoader();
const cache = new Map();
export let ROSTER = [];

export async function loadRoster() {
  try { const r = await fetch(NV_BASE + 'danh-sach.json'); ROSTER = r.ok ? await r.json() : []; } catch (e) { ROSTER = []; }
  if (Array.isArray(window.__NV_IDS)) ROSTER = ROSTER.filter(x => window.__NV_IDS.includes(x.id));
  return ROSTER;
}
// mã nhân vật cố định theo tài khoản TikTok: cùng người xem luôn ra cùng nhân vật
export function pickId(userId) {
  const list = ROSTER.filter(x => x.id !== RESERVED);
  if (!list.length) return null;
  let h = 2166136261; for (const ch of String(userId)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return list[(h >>> 0) % list.length].id;
}
export function template(id) {
  if (!cache.has(id)) cache.set(id, new Promise((res, rej) => loader.load(NV_BASE + id + NV_EXT, g => {
    g.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
    const box = new THREE.Box3().setFromObject(g.scene);
    res({ id, scene: g.scene, clips: g.animations || [], h: box.max.y - box.min.y, minY: box.min.y });
  }, undefined, e => { cache.delete(id); rej(e); })));
  return cache.get(id);
}

// ---------- tư thế ngồi xe: hướng từng đoạn xương trong khung nhân vật (mặt nhìn -Z, tay phải ở +X) ----------
const UPPER = /^mixamorig(Left|Right)(Shoulder|Arm|ForeArm|Hand)$|^mixamorig(Neck|Head)$/;
const NEXT = { Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head', Head: 'HeadTop_End', LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand',
  RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand', LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', LeftFoot: 'LeftToeBase', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', RightFoot: 'RightToeBase' };
const d3 = (f, u, r) => new THREE.Vector3(r, u, -f).normalize();   // trước, lên, phải → toạ độ mô hình
// kiểu ngồi: lean = độ chồm người (radian); arms = tay cầm ghi đông thấp hay vô lăng; legs = kiểu chân
export const SEATS = {
  bike:    { lean: 0.14, legs: 'astride', arms: 'bars' },      // xe số: ngồi thẳng lưng kiểu Việt
  scooter: { lean: 0.06, legs: 'floor', arms: 'bars' },        // tay ga: hai chân để sàn
  sport:   { lean: 0.62, legs: 'astride', arms: 'low' },       // phân khối lớn: chồm người
  cycle:   { lean: 0.32, legs: 'pedal', arms: 'bars' },        // xe đạp: đạp pê-đan
  car:     { lean: -0.1, legs: 'car', arms: 'wheel' },         // ô tô: ngồi lái
  pilot:   { lean: -0.05, legs: 'car', arms: 'stick' },        // trực thăng
  dragon:  { lean: 0.3, legs: 'astride', arms: 'bars' },       // cưỡi rồng: tay nắm sừng
};
function seatTargets(seat, phase) {
  const T = {}, L = seat.lean;
  const spine = d3(Math.sin(L), Math.cos(L), 0);
  T.Spine = T.Spine1 = T.Spine2 = spine;
  T.Neck = d3(Math.sin(L) * 0.25, 1, 0); T.Head = d3(-0.05, 1, 0);
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'Left' : 'Right';
    if (seat.legs === 'astride') { T[side + 'UpLeg'] = d3(0.82, -0.48, s * 0.3); T[side + 'Leg'] = d3(-0.05, -1, s * 0.06); T[side + 'Foot'] = d3(1, -0.2, 0); }
    else if (seat.legs === 'floor') { T[side + 'UpLeg'] = d3(1, -0.3, s * 0.16); T[side + 'Leg'] = d3(0.2, -1, 0); T[side + 'Foot'] = d3(1, -0.1, 0); }
    else if (seat.legs === 'car') { T[side + 'UpLeg'] = d3(1, -0.06, s * 0.12); T[side + 'Leg'] = d3(0.4, -1, 0); T[side + 'Foot'] = d3(1, 0.25, 0); }
    else {   // đạp xe: hai chân lệch nửa vòng
      const p = phase + (s < 0 ? 0 : Math.PI), a = 0.62 + 0.38 * Math.sin(p);
      T[side + 'UpLeg'] = d3(Math.cos(a), -Math.sin(a), s * 0.1); T[side + 'Leg'] = d3(0.12 + 0.34 * Math.cos(p + 1.3), -1, s * 0.03); T[side + 'Foot'] = d3(1, -0.15, 0);
    }
    if (seat.arms === 'wheel') { T[side + 'Arm'] = d3(0.62, -0.68, s * 0.24); T[side + 'ForeArm'] = d3(1, 0.3, -s * 0.32); }
    else if (seat.arms === 'stick') { T[side + 'Arm'] = d3(0.35, -0.9, s * 0.25); T[side + 'ForeArm'] = d3(1, -0.1, -s * 0.15); }
    else if (seat.arms === 'low') { T[side + 'Arm'] = d3(0.92, -0.35, s * 0.32); T[side + 'ForeArm'] = d3(1, -0.35, -s * 0.05); }
    else { T[side + 'Arm'] = d3(0.6, -0.72, s * 0.34); T[side + 'ForeArm'] = d3(1, -0.12, s * 0.02); }
  }
  return T;
}

const _qa = new THREE.Quaternion(), _v = new THREE.Vector3();
export class Person {
  constructor(tpl) {
    this.id = tpl.id;
    this.root = new THREE.Group();
    this.model = SkeletonUtils.clone(tpl.scene);
    const s = (tpl.h > 1.2 && tpl.h < 2.2 ? 1 : 1.7 / tpl.h) * K;
    this.model.scale.setScalar(s); this.model.position.y = -tpl.minY * s;
    this.model.rotation.y = Math.PI;          // mô hình nhìn về -Z → quay lại cho mặt nhìn theo hướng đi (+Z)
    this.root.add(this.model);
    this.height = tpl.h * s;
    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = {}; for (const c of tpl.clips) this.clips[c.name] = c;
    this.acts = {}; this.cur = null; this.base = null; this.one = null;
    this.mixer.addEventListener('finished', e => {
      if (e.action !== this.one) return;
      this.one = null;
      if (this.seat) { this.cur = null; return; }   // đang ngồi xe: tay tự về ghi đông
      const b = this.base; this.base = null; this.play(b || 'dung_yen', 0.3);
    });
    // ghi lại tư thế gốc của từng xương (để dựng tư thế ngồi)
    this.root.updateMatrixWorld(true);
    const qmInv = this.model.getWorldQuaternion(new THREE.Quaternion()).invert();
    this.order = []; this.bones = {};
    this.model.traverse(o => {
      if (!o.isBone) return;
      const n = o.name.replace(/^mixamorig:?/, ''); o.userData.short = n; this.bones[n] = o; this.order.push(o);
      o.userData.restQ = o.quaternion.clone(); o.userData.restP = o.position.clone();
      o.userData.restQm = qmInv.clone().multiply(o.getWorldQuaternion(new THREE.Quaternion()));
      if (!o.parent.isBone) o.userData.parentQm = qmInv.clone().multiply(o.parent.getWorldQuaternion(new THREE.Quaternion()));
    });
    for (const b of this.order) {
      const want = NEXT[b.userData.short];
      const c = b.children.find(x => x.isBone && x.userData.short === want) || b.children.find(x => x.isBone);
      b.userData.dir = c && c.position.lengthSq() > 1e-10 ? c.position.clone().normalize() : null;
    }
    this.hipOffset = this.bones.Hips ? this.root.worldToLocal(this.bones.Hips.getWorldPosition(new THREE.Vector3())) : new THREE.Vector3(0, this.height * 0.53, 0);
    this.seat = null; this.phase = 0; this.pedal = 0; this._qm = new Map(); this.dancing = false;
  }
  has(name) { return !!this.clips[name]; }
  act(name, upper = false) {
    const key = upper ? name + ':u' : name;
    if (this.acts[key]) return this.acts[key];
    let clip = this.clips[name];
    if (upper) clip = new THREE.AnimationClip(key, clip.duration, clip.tracks.filter(k => k.name.endsWith('.quaternion') && UPPER.test(k.name.split('.')[0])));
    return (this.acts[key] = this.mixer.clipAction(clip));
  }
  // động tác lặp (đi, chạy, đứng, ngồi, nhảy…); khi ngồi xe chỉ nhận "nhảy" (nhảy bằng nửa thân trên)
  play(name, fade = 0.25, speed = 1) {
    if (this.seat) {
      const want = name === 'nhay_mua' && this.has(name);
      if (want === this.dancing || this.one) return;
      this.dancing = want;
      const a = this.act('nhay_mua', true);
      if (want) { a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.fadeIn(0.3); a.play(); this.cur = a; }
      else { a.fadeOut(0.3); this.cur = null; }
      return;
    }
    if (!this.has(name)) name = 'dung_yen';
    if (this.one) { this.base = name; return; }
    const a = this.act(name);
    if (this.cur === a && this.base === name) { a.setEffectiveTimeScale(speed); return; }
    a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.setEffectiveTimeScale(speed); a.setEffectiveWeight(1); a.fadeIn(fade); a.play();
    if (this.cur && this.cur !== a) this.cur.fadeOut(fade);
    this.cur = a; this.base = name;
  }
  // động tác một lần (vẫy tay, cúi chào, giật mình…); khi ngồi xe chỉ cử động nửa thân trên
  gesture(name, reps = 1, speed = 1) {
    if (!this.has(name)) return 0;
    const upper = !!this.seat;
    if (upper && this.dancing) { this.act('nhay_mua', true).stop(); this.dancing = false; }
    const a = this.act(name, upper);
    a.reset(); a.setLoop(THREE.LoopRepeat, reps); a.clampWhenFinished = false; a.setEffectiveTimeScale(speed); a.setEffectiveWeight(1); a.fadeIn(0.2); a.play();
    if (this.cur && this.cur !== a) this.cur.fadeOut(0.2);
    this.cur = a; this.one = a;
    return this.clips[name].duration * reps / speed;
  }
  busy() { return !!this.one; }
  // ngồi lên xe (seat = một kiểu trong SEATS) hoặc xuống xe (null)
  setSeat(seat) {
    if (seat === this.seat) return;
    this.mixer.stopAllAction(); this.cur = null; this.one = null; this.base = null; this.dancing = false;
    for (const b of this.order) { b.quaternion.copy(b.userData.restQ); b.position.copy(b.userData.restP); }
    this.seat = seat || null;
    if (this.seat) this.applySeat(0); else this.play('dung_yen', 0);
  }
  // xoay từng đoạn xương cho trùng hướng mong muốn, giữ độ vặn của tư thế gốc
  applySeat(dt) {
    const seat = this.seat; if (!seat) return;
    if (seat.legs === 'pedal') this.phase += dt * (2 + this.pedal * 9);
    const T = seatTargets(seat, this.phase), armsFree = !this.one && !this.dancing, Qm = this._qm;
    for (const b of this.order) {
      const pq = b.parent.isBone ? Qm.get(b.parent) : b.userData.parentQm;
      let q = Qm.get(b); if (!q) { q = new THREE.Quaternion(); Qm.set(b, q); }
      const D = T[b.userData.short];
      if (D && b.userData.dir && (armsFree || !UPPER.test(b.name))) {
        _v.copy(b.userData.dir).applyQuaternion(b.userData.restQm);
        _qa.setFromUnitVectors(_v, D);
        q.copy(_qa).multiply(b.userData.restQm);
        b.quaternion.copy(pq).invert().multiply(q);
      } else q.copy(pq).multiply(b.quaternion);
    }
  }
  update(dt) {
    this.mixer.update(dt);
    if (this.seat) this.applySeat(dt);
  }
  dispose() { this.mixer.stopAllAction(); this.root.removeFromParent(); }
}

// tượng vàng đúc từ chính nhân vật (đứng yên ở một khung của động tác)
export function goldStatue(tpl, move = 'vay_tay', at = 0.45) {
  const p = new Person(tpl);
  // nhiều file đã bỏ pháp tuyến cho nhẹ → tô phẳng để vẫn bắt sáng
  const gold = new THREE.MeshPhongMaterial({ color: 0xffc23a, emissive: 0x5a3400, shininess: 140, specular: 0xffffff, flatShading: true });
  p.model.traverse(o => { if (o.isMesh) o.material = gold; });
  if (p.has(move)) { const a = p.act(move); a.play(); a.time = p.clips[move].duration * at; p.mixer.update(0); a.paused = true; }
  return p;
}
