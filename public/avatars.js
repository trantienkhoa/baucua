// Nhân vật người thật: nạp mô hình .glb có khung xương chuẩn Mixamo / Ready Player Me
// và điều khiển xương theo khung xương điệu nhảy (rig) của game.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const canon = n => String(n || '').replace(/^mixamorig\d*[:_]?/i, '');
const BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'HeadTop_End',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
const CHILD = { Spine: 'Spine1', Neck: 'Head', Head: 'HeadTop_End', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', RightArm: 'RightForeArm', RightForeArm: 'RightHand', LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot' };

const OUTFIT = {
  top: ['#ffffff', '#1b1b1f', '#ff3d8b', '#8cc8ff', '#c8ff3d', '#ffd84d', '#b9a3e8', '#ff8a3d', '#9fe3c6', '#d6262f', '#efe6d2', '#7c3dff'],
  bottom: ['#ffffff', '#3b5ba5', '#1e2f55', '#1b1b1f', '#cdb58f', '#5b6b3a', '#8a8d94', '#efe6d2'],
  shoes: ['#ffffff', '#ffffff', '#1b1b1f', '#ff3d8b', '#ffd84d', '#8cc8ff'],
  hair: ['#ffffff', '#5a3820', '#2a1a10', '#c9a26b', '#e3cf96', '#7a1f2b', '#d65a9a', '#5b7bd6'],
};
const SKIN_TINT = ['#ffffff', '#ffffff', '#f3dccb', '#e2bfa3', '#c89a78', '#a8785a', '#86593f'];
const pick = a => a[Math.floor(Math.random() * a.length)];
// đổi màu vùng vải rực (vàng/cam) của mô hình một chất liệu: [xoay màu, độ bão hoà, độ sáng]
const RECOLOR = [[0, 1, 1], [2.2, 1, 0.9], [3.6, 1, 0.85], [4.6, 1, 0.9], [5.5, 1, 1], [1.2, 1, 0.9], [0, 0, 0.25], [0, 0, 1.25], [3.0, 0.7, 0.8], [5.9, 1.1, 0.9]];
function recolorMat(base, [hue, sat, val]) {
  const m = base.clone();
  m.onBeforeCompile = sh => {
    sh.uniforms.uRe = { value: new THREE.Vector3(hue, sat, val) };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRe;\nvec3 rgb2hsv(vec3 c){vec4 K=vec4(0.,-1./3.,2./3.,-1.);vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));float d=q.x-min(q.w,q.y);float e=1.0e-10;return vec3(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x);}\nvec3 hsv2rgb(vec3 c){vec4 K=vec4(1.,2./3.,1./3.,3.);vec3 p=abs(fract(c.xxx+K.xyz)*6.-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,0.,1.),c.y);}')
      .replace('#include <map_fragment>', '#include <map_fragment>\n{ vec3 c = diffuseColor.rgb; vec3 h = rgb2hsv(c); if (h.y > 0.5 && h.x > 0.08 && h.x < 0.2 && c.g > c.r * 0.72) { h.x = fract(h.x + uRe.x / 6.2831853); h.y = clamp(h.y * uRe.y, 0., 1.); h.z = clamp(h.z * uRe.z, 0., 1.); diffuseColor.rgb = hsv2rgb(h); } }');
  };
  m.customProgramCacheKey = () => 'recolor';
  return m;
}

const templates = [];
export const avatarTemplates = templates;

export async function loadAvatars(urls) {
  const loader = new GLTFLoader();
  for (const url of urls) {
    try {
      const gltf = await loader.loadAsync(url);
      const t = prepare(gltf.scene, url);
      if (t) templates.push(t);
    } catch (e) { console.warn('Không nạp được mô hình', url, e); }
  }
  return templates;
}

function prepare(scene, url) {
  scene.updateMatrixWorld(true);
  const bones = {};
  scene.traverse(o => { if (o.isBone) { const c = canon(o.name); if (BONES.includes(c) && !bones[c]) bones[c] = o; } });
  for (const b of ['Hips', 'Spine', 'Neck', 'Head', 'LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm', 'LeftUpLeg', 'LeftLeg', 'RightUpLeg', 'RightLeg', 'LeftFoot', 'RightFoot']) {
    if (!bones[b]) { console.warn('Mô hình thiếu xương', b, url); return null; }
  }
  const wp = b => new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
  // đo chiều cao theo xương
  const headTop = bones.HeadTop_End ? wp(bones.HeadTop_End) : wp(bones.Head).add(new THREE.Vector3(0, 0.12, 0));
  let footY = Math.min(wp(bones.LeftFoot).y, wp(bones.RightFoot).y);
  const box = new THREE.Box3().setFromObject(scene);
  footY = Math.min(footY, box.min.y);
  const height = headTop.y - footY;
  const norm = 1.72 / height;
  const hips = wp(bones.Hips);
  // hướng mặt: tay trái phải nằm bên +X khi nhìn về +Z
  const flip = wp(bones.LeftArm).x < wp(bones.RightArm).x;
  const restLocal = {}, dirLocal = {}, restWorld = {};
  const q = new THREE.Quaternion();
  for (const [k, b] of Object.entries(bones)) {
    restLocal[k] = b.quaternion.clone();
    b.getWorldQuaternion(q); restWorld[k] = q.clone();
    const child = CHILD[k] && bones[CHILD[k]];
    dirLocal[k] = child ? child.position.clone().normalize() : new THREE.Vector3(0, 1, 0);
  }
  const hipsParentWorld = bones.Hips.parent.matrixWorld.clone();
  const hipsParentQ = new THREE.Quaternion(); bones.Hips.parent.getWorldQuaternion(hipsParentQ);
  const mats = new Set();
  scene.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m.name)); } });
  const name = url.split('/').pop();
  const female = /(^|[^a-z])(nu|female|girl|woman|f)[^a-z]/i.test('-' + name.replace(/\.glb$/i, '') + '-');
  return {
    url, name, scene, female, norm, footY, flip,
    hipH: (hips.y - footY) * norm,
    restLocal, dirLocal, restWorld,
    hipsParentInv: hipsParentWorld.clone().invert(), hipsParentQInv: hipsParentQ.clone().invert(),
    rpm: mats.has('Wolf3D_Outfit_Top'),
  };
}

// ---------- một nhân vật ----------
export function createAvatar(parent, female, tpl) {
  if (!templates.length) return null;
  let pool = templates.filter(t => t.female === female);
  if (!pool.length) pool = templates;
  const t = tpl || pick(pool);
  const root = SkeletonUtils.clone(t.scene);
  const bones = {};
  root.traverse(o => { if (o.isBone) { const c = canon(o.name); if (BONES.includes(c) && !bones[c]) bones[c] = o; } });
  const holder = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(root);
  if (t.flip) inner.rotation.y = Math.PI;
  inner.position.y = -t.footY;
  holder.add(inner);
  parent.add(holder);
  const av = { t, holder, inner, root, bones, mats: [] };
  restyle(av);
  return av;
}

// đổi màu quần áo (mô hình có lớp áo/quần/giày riêng)
export function restyle(av) {
  for (const m of av.mats) m.dispose();
  av.mats = [];
  const tint = {};
  if (av.t.rpm) {
    tint.Wolf3D_Outfit_Top = pick(OUTFIT.top);
    tint.Wolf3D_Outfit_Bottom = pick(OUTFIT.bottom);
    tint.Wolf3D_Outfit_Footwear = pick(OUTFIT.shoes);
    tint.Wolf3D_Hair = tint.Wolf3D_Headwear = pick(OUTFIT.hair);
    const sk = av.skin || (av.skin = pick(SKIN_TINT));
    tint.Wolf3D_Skin = tint.Wolf3D_Body = sk;
  }
  const recolor = !av.t.rpm ? pick(RECOLOR) : null;
  av.root.traverse(o => {
    if (!o.isMesh) return;
    if (!o.userData.baseMat) o.userData.baseMat = o.material;
    const base = o.userData.baseMat;
    const c = tint[base.name];
    if (c) { const m = base.clone(); m.color = new THREE.Color(c); av.mats.push(m); o.material = m; }
    else if (recolor) { const m = recolorMat(base, recolor); av.mats.push(m); o.material = m; }
    else o.material = base;
    if (/Teeth/i.test(o.name)) o.visible = false;
  });
}

export function disposeAvatar(av) {
  if (!av) return;
  av.holder.parent && av.holder.parent.remove(av.holder);
  for (const m of av.mats) m.dispose();
  av.root.traverse(o => { if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose(); });
}

// ---------- điều khiển xương theo rig ----------
const _qh = new THREE.Quaternion(), _qhi = new THREE.Quaternion(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _c = new THREE.Vector3(), _p = new THREE.Vector3();
const _e = new THREE.Euler();
const W = {};

function aim(av, name, parentW, from, to) {
  const t = av.t, bone = av.bones[name];
  const cand = _q.multiplyQuaternions(parentW, t.restLocal[name]);
  _c.copy(t.dirLocal[name]).applyQuaternion(cand);
  _d.subVectors(to, from);
  if (_d.lengthSq() < 1e-8) { bone.quaternion.copy(t.restLocal[name]); return (W[name] = cand.clone()); }
  _d.normalize().applyQuaternion(_qhi);
  if (av.t.flip) { _d.x = -_d.x; _d.z = -_d.z; }
  _q2.setFromUnitVectors(_c.normalize(), _d);
  const world = _q2.multiply(cand).clone();
  bone.quaternion.copy(parentW).invert().multiply(world);
  return (W[name] = world);
}
function pass(av, name, parentW) {
  const b = av.bones[name];
  if (!b) return parentW;
  b.quaternion.copy(av.t.restLocal[name]);
  return (W[name] = parentW.clone().multiply(b.quaternion));
}

// rig: khung xương game đã tính xong vị trí thế giới; L/R của rig là trái/phải màn hình
export function driveAvatar(av, rig, opts) {
  const { yaw, scale, hipH0, flat, alpha, headPt, headTop } = opts;
  const t = av.t;
  av.holder.position.copy(rig.root.position);
  av.holder.position.y = opts.floorY;
  av.holder.rotation.set(0, yaw, 0);
  const s = t.norm * scale * alpha;
  av.holder.scale.setScalar(Math.max(1e-4, s));
  _qh.setFromEuler(_e.set(0, yaw, 0)); _qhi.copy(_qh).invert();

  // hông: xoay + vị trí
  rig.hips.getWorldQuaternion(_q);
  const rel = _qhi.clone().multiply(_q);
  if (t.flip) { rel.x = -rel.x; rel.z = -rel.z; }
  const hipsW = rel.multiply(t.restWorld.Hips);
  const hb = av.bones.Hips;
  hb.quaternion.copy(t.hipsParentQInv).multiply(hipsW);
  W.Hips = hipsW;
  rig.hips.getWorldPosition(_p);
  _p.sub(av.holder.position).applyQuaternion(_qhi);
  if (t.flip) { _p.x = -_p.x; _p.z = -_p.z; }
  _p.multiplyScalar((t.hipH / hipH0) / (t.norm * scale));   // đổi sang đơn vị mô hình
  _p.y += t.footY;
  hb.position.copy(_p.applyMatrix4(t.hipsParentInv));

  // cột sống, cổ, đầu
  const w = (n) => rig[n].getWorldPosition(new THREE.Vector3());
  const spine = aim(av, 'Spine', W.Hips, w('spine'), w('chest'));
  let up = pass(av, 'Spine1', spine); up = pass(av, 'Spine2', up);
  const neck = aim(av, 'Neck', up, w('neck'), headPt);
  aim(av, 'Head', neck, headPt, headTop);
  // tay: rig shL nằm bên trái màn hình = tay phải nhân vật
  const rs = pass(av, 'RightShoulder', up);
  const ra = aim(av, 'RightArm', rs, w('shL'), w('elL'));
  aim(av, 'RightForeArm', ra, w('elL'), w('haL'));
  if (av.bones.RightHand) pass(av, 'RightHand', W.RightForeArm);
  const ls = pass(av, 'LeftShoulder', up);
  const la = aim(av, 'LeftArm', ls, w('shR'), w('elR'));
  aim(av, 'LeftForeArm', la, w('elR'), w('haR'));
  if (av.bones.LeftHand) pass(av, 'LeftHand', W.LeftForeArm);
  // chân
  const rul = aim(av, 'RightUpLeg', W.Hips, w('hipL'), w('knL'));
  const rl = aim(av, 'RightLeg', rul, w('knL'), w('ftL'));
  const lul = aim(av, 'LeftUpLeg', W.Hips, w('hipR'), w('knR'));
  const ll = aim(av, 'LeftLeg', lul, w('knR'), w('ftR'));
  // bàn chân phẳng trên sàn
  if (flat) {
    av.bones.RightFoot.quaternion.copy(rl).invert().multiply(t.restWorld.RightFoot);
    av.bones.LeftFoot.quaternion.copy(ll).invert().multiply(t.restWorld.LeftFoot);
  } else {
    av.bones.RightFoot.quaternion.copy(t.restLocal.RightFoot);
    av.bones.LeftFoot.quaternion.copy(t.restLocal.LeftFoot);
  }
}
