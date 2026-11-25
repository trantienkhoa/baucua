// Animation Mixamo (file .fbx "Without Skin") → chuỗi tư thế chuẩn của game.
// Đo hướng từng đoạn xương trong animation rồi dựng lại tư thế, nên dùng được cho mọi nhân vật (nam, nữ, dựng bằng code)
// mà không phụ thuộc tư thế gốc của bộ xương trong file animation.
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { H0 } from './anim.js';

const strip = n => n.replace(/^mixamorig\d*[:_]?/i, '').replace(/^.*:/, '').replace(/_\d+$/, '');
const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0), FOOT = new THREE.Vector3(0, -0.5, 0.87).normalize();
const PARENT = { spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', lArm: 'chest', lFore: 'lArm', lHand: 'lFore', rArm: 'chest', rFore: 'rArm', rHand: 'rFore', lThigh: 'hips', lShin: 'lThigh', lFoot: 'lShin', rThigh: 'hips', rShin: 'rThigh', rFoot: 'rShin' };
const NAMES = ['spine', 'chest', 'neck', 'head', 'lArm', 'lFore', 'lHand', 'rArm', 'rFore', 'rHand', 'lThigh', 'lShin', 'lFoot', 'rThigh', 'rShin', 'rFoot'];

const _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion();
function basis(up, side, out) {
  _y.copy(up).normalize();
  _z.crossVectors(side, _y).normalize();
  _x.crossVectors(_y, _z).normalize();
  _m.makeBasis(_x, _y, _z);
  return out.setFromRotationMatrix(_m);
}
// G = R(G_parent·canon → dir) · G_parent
function aimFrom(parentG, canon, dir, out) {
  _d.copy(canon).applyQuaternion(parentG).normalize();
  _q.setFromUnitVectors(_d, dir.clone().normalize());
  return out.copy(_q).multiply(parentG);
}

export async function loadClip(url, opts = {}) {
  const obj = await new FBXLoader().loadAsync(url);
  return bakeClip(obj, obj.animations[0], opts);
}
// obj: cảnh chứa bộ xương Mixamo; clip: AnimationClip; trả về { frames: [quats], fps, dur }
export function bakeClip(obj, clip, opts = {}) {
  if (!clip) throw new Error('Không có animation');
  const fps = opts.fps || 30;
  const bones = {};
  obj.traverse(o => { if (o.isBone || o.type === 'Bone' || /mixamorig/i.test(o.name)) { const n = strip(o.name); if (!bones[n]) bones[n] = o; } });
  const need = ['Hips', 'Spine', 'Spine2', 'Neck', 'Head', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
  for (const n of need) if (!bones[n]) throw new Error('Thiếu xương ' + n);
  const tracks = clip.tracks.filter(t => !/\.position$/.test(t.name) || /hips/i.test(t.name.split('.')[0]));
  const c2 = new THREE.AnimationClip(clip.name, clip.duration, tracks);
  const mixer = new THREE.AnimationMixer(obj);
  mixer.clipAction(c2).play();
  const P = n => bones[n].getWorldPosition(new THREE.Vector3());
  const rootInv = new THREE.Matrix4();
  // chiều cao hông khi đứng (đơn vị của file) ≈ chiều dài chân × 1,17
  mixer.setTime(0); obj.updateMatrixWorld(true);
  rootInv.copy(obj.matrixWorld).invert();
  const L = n => P(n).applyMatrix4(rootInv);
  const legLen = L('LeftUpLeg').distanceTo(L('LeftLeg')) + L('LeftLeg').distanceTo(L('LeftFoot'));
  const standHip = legLen * 1.17;
  const frames = [];
  const n = Math.max(1, Math.round(clip.duration * fps));
  const G = {};
  for (let i = 0; i <= n; i++) {
    mixer.setTime(Math.min(clip.duration, i / fps)); obj.updateMatrixWorld(true);
    const p = {}; for (const k of need.concat(['HeadTop_End', 'LeftToeBase', 'RightToeBase', 'LeftHandIndex1', 'RightHandIndex1', 'LeftHandMiddle1', 'RightHandMiddle1'])) if (bones[k]) p[k] = L(k);
    const legSide = p.LeftUpLeg.clone().sub(p.RightUpLeg), armSide = p.LeftArm.clone().sub(p.RightArm);
    G.hips = basis(p.Spine.clone().sub(p.Hips), legSide, G.hips || new THREE.Quaternion());
    G.chest = basis(p.Neck.clone().sub(p.Spine2), armSide, G.chest || new THREE.Quaternion());
    G.spine = basis(p.Spine2.clone().sub(p.Spine), legSide.clone().add(armSide), G.spine || new THREE.Quaternion());
    G.neck = basis(p.Head.clone().sub(p.Neck), armSide, G.neck || new THREE.Quaternion());
    G.head = p.HeadTop_End ? basis(p.HeadTop_End.clone().sub(p.Head), armSide, G.head || new THREE.Quaternion()) : (G.head || new THREE.Quaternion()).copy(G.neck);
    for (const s of ['l', 'r']) {
      const S = s === 'l' ? 'Left' : 'Right';
      G[s + 'Arm'] = aimFrom(G.chest, DOWN, p[S + 'ForeArm'].clone().sub(p[S + 'Arm']), G[s + 'Arm'] || new THREE.Quaternion());
      G[s + 'Fore'] = aimFrom(G[s + 'Arm'], DOWN, p[S + 'Hand'].clone().sub(p[S + 'ForeArm']), G[s + 'Fore'] || new THREE.Quaternion());
      const tip = p[S + 'HandMiddle1'] || p[S + 'HandIndex1'];
      G[s + 'Hand'] = tip ? aimFrom(G[s + 'Fore'], DOWN, tip.clone().sub(p[S + 'Hand']), G[s + 'Hand'] || new THREE.Quaternion()) : (G[s + 'Hand'] || new THREE.Quaternion()).copy(G[s + 'Fore']);
      G[s + 'Thigh'] = aimFrom(G.hips, DOWN, p[S + 'Leg'].clone().sub(p[S + 'UpLeg']), G[s + 'Thigh'] || new THREE.Quaternion());
      G[s + 'Shin'] = aimFrom(G[s + 'Thigh'], DOWN, p[S + 'Foot'].clone().sub(p[S + 'Leg']), G[s + 'Shin'] || new THREE.Quaternion());
      G[s + 'Foot'] = p[S + 'ToeBase'] ? aimFrom(G[s + 'Shin'], FOOT, p[S + 'ToeBase'].clone().sub(p[S + 'Foot']), G[s + 'Foot'] || new THREE.Quaternion()) : (G[s + 'Foot'] || new THREE.Quaternion()).copy(G[s + 'Shin']);
    }
    const f = { __q: true, hipsQ: G.hips.clone(), hipsP: new THREE.Vector3(opts.move ? p.Hips.x / standHip * H0 : 0, p.Hips.y / standHip * H0, opts.move ? p.Hips.z / standHip * H0 : 0) };
    for (const k of NAMES) f[k] = G[PARENT[k]].clone().invert().multiply(G[k]);
    frames.push(f);
  }
  mixer.stopAllAction();
  return { frames, fps, dur: clip.duration, name: clip.name };
}
// tư thế tại thời điểm t (giây) của đoạn [from, to]
export function clipFrame(c, t, loop = true, from = 0, to = 0) {
  const a = from, b = to || c.dur, len = Math.max(0.01, b - a);
  let tt = loop ? a + (t % len) : Math.min(b, a + t);
  const i = Math.min(c.frames.length - 1, Math.max(0, Math.round(tt * c.fps)));
  return c.frames[i];
}
