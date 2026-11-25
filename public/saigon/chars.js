// Nhân vật người thật (tp-001 … tp-050) dùng chung với game kể chuyện ma "Ngọn Lửa":
// GLB khung xương Mixamo, mỗi file có sẵn 14 động tác.
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
    this.mixer.addEventListener('finished', e => { if (e.action === this.one) { this.one = null; const b = this.base; this.base = null; this.play(b || 'dung_yen', 0.3); } });
  }
  has(name) { return !!this.clips[name]; }
  act(name) { return this.acts[name] || (this.acts[name] = this.mixer.clipAction(this.clips[name])); }
  // động tác lặp (đi, chạy, đứng, ngồi, nhảy…)
  play(name, fade = 0.25, speed = 1) {
    if (!this.has(name)) name = 'dung_yen';
    if (this.one) { this.base = name; this.baseSpeed = speed; return; }
    const a = this.act(name);
    if (this.cur === a && this.base === name) { a.setEffectiveTimeScale(speed); return; }
    a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.setEffectiveTimeScale(speed); a.setEffectiveWeight(1); a.fadeIn(fade); a.play();
    if (this.cur && this.cur !== a) this.cur.fadeOut(fade);
    this.cur = a; this.base = name;
  }
  // động tác một lần (vẫy tay, cúi chào, giật mình…) rồi quay về động tác lặp đang có
  gesture(name, reps = 1, speed = 1) {
    if (!this.has(name)) return 0;
    const back = this.one ? this.base : this.base;
    const a = this.act(name);
    a.reset(); a.setLoop(THREE.LoopRepeat, reps); a.clampWhenFinished = false; a.setEffectiveTimeScale(speed); a.setEffectiveWeight(1); a.fadeIn(0.2); a.play();
    if (this.cur && this.cur !== a) this.cur.fadeOut(0.2);
    this.cur = a; this.one = a; this.base = back;
    return this.clips[name].duration * reps / speed;
  }
  busy() { return !!this.one; }
  update(dt) { this.mixer.update(dt); }
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
