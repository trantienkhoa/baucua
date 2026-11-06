// Nhân vật người thật: nạp mô hình .glb có khung xương chuẩn Mixamo / Ready Player Me
// và điều khiển xương theo khung xương điệu nhảy (rig) của game.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { applyCostume, randomCostumeId, animateCostume, costumeTime, COSTUMES } from './costumes.js';
export { COSTUMES, costumeTime };

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
// tông da cho mô hình một chất liệu: [nhân độ sáng, nhân độ bão hoà]
const SKIN_TONE = [[1, 1], [1, 1], [1.35, 0.85], [1.7, 0.7], [2.1, 0.55], [2.5, 0.45], [0.85, 1.05]];
const HSV = 'vec3 rgb2hsv(vec3 c){vec4 K=vec4(0.,-1./3.,2./3.,-1.);vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));float d=q.x-min(q.w,q.y);float e=1.0e-10;return vec3(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x);}\nvec3 hsv2rgb(vec3 c){vec4 K=vec4(1.,2./3.,1./3.,3.);vec3 p=abs(fract(c.xxx+K.xyz)*6.-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,0.,1.),c.y);}\n';
// biến dạng khuôn mặt theo trọng số xương đầu (toạ độ chuẩn hoá: 0 = khớp đầu, 1 = đỉnh đầu)
const FACE_VS = `
#ifdef USE_SKINNING
{
  float hw = 0.0;
  for (int k = 0; k < 4; k++) hw += skinWeight[k] * (1.0 - step(0.5, abs(skinIndex[k] - uHeadIdx)));
  if (hw > 0.001) {
    vec3 hp = (uHM * vec4(transformed, 1.0)).xyz;
    float y = dot(hp, uUp) / uHH, x = dot(hp, uRt) / uHH, z = dot(hp, uFw) / uHH;
    float ax = abs(x);
    float jaw = smoothstep(0.42, 0.05, y) * smoothstep(-0.25, 0.05, y);
    float dx = x * (uF1.x * jaw + uF2.y * smoothstep(-0.1, 0.3, y));
    float dy = -uF1.y * smoothstep(0.18, -0.05, y) * step(-0.12, y) * smoothstep(0.0, 0.25, z);
    dy += uF2.x * smoothstep(0.55, 0.95, y);
    float cheek = exp(-pow((y - 0.24) / 0.12, 2.0)) * smoothstep(0.08, 0.28, ax) * smoothstep(0.05, 0.3, z);
    dx += sign(x) * uF1.z * cheek * 0.06;
    float dz = uF1.z * cheek * 0.04;
    float nose = exp(-ax * ax / 0.005 - pow((y - 0.33) / 0.1, 2.0)) * smoothstep(0.25, 0.45, z);
    dz += uF1.w * nose * 0.07;
    float chin = exp(-ax * ax / 0.02 - pow((y - 0.02) / 0.1, 2.0)) * smoothstep(0.15, 0.4, z);
    dz += uF2.z * chin * 0.05;
    hp += (uRt * dx + uUp * dy + uFw * dz) * uHH * hw;
    transformed = (uHMi * vec4(hp, 1.0)).xyz;
  }
}
#endif
`;
function patchMat(base, o) {
  const m = base.clone();
  const keys = [];
  if (o.recolor) keys.push('re');
  if (o.skin) keys.push('sk');
  if (o.face) keys.push('fa');
  if (!keys.length) return m;
  m.onBeforeCompile = sh => {
    let head = '#include <common>\n';
    if (o.recolor || o.skin) head += HSV;
    if (o.recolor) { sh.uniforms.uRe = { value: new THREE.Vector3(...o.recolor) }; head += 'uniform vec3 uRe;\n'; }
    if (o.skin) { sh.uniforms.uSk = { value: new THREE.Vector2(...o.skin) }; head += 'uniform vec2 uSk;\n'; }
    let frag = '#include <map_fragment>\n{ vec3 c = diffuseColor.rgb; vec3 h = rgb2hsv(c); bool fab = false;\n';
    if (o.recolor) frag += 'float wf = smoothstep(0.22, 0.42, h.y) * smoothstep(0.035, 0.075, h.x) * (1.0 - smoothstep(0.2, 0.26, h.x)) * smoothstep(0.5, 0.68, c.g / max(c.r, 0.001)); fab = wf > 0.5; vec3 h2 = vec3(fract(h.x + uRe.x / 6.2831853), clamp(h.y * uRe.y, 0., 1.), clamp(h.z * uRe.z, 0., 1.)); vec3 c2 = hsv2rgb(h2); c = mix(c, c2, wf); h = rgb2hsv(c);\n';
    if (o.skin) frag += 'float ws = (1.0 - smoothstep(0.08, 0.12, h.x)) * smoothstep(0.15, 0.28, h.y) * (1.0 - smoothstep(0.72, 0.85, h.y)) * smoothstep(0.04, 0.1, h.z) * (1.0 - smoothstep(0.7, 0.8, h.z)) * (fab ? 0.0 : 1.0); h.z = mix(h.z, clamp(h.z * uSk.x, 0., 0.95), ws); h.y = mix(h.y, clamp(h.y * uSk.y, 0., 1.), ws);\n';
    frag += 'diffuseColor.rgb = hsv2rgb(h); }';
    if (o.recolor || o.skin) sh.fragmentShader = sh.fragmentShader.replace('#include <common>', head).replace('#include <map_fragment>', frag);
    if (o.face) {
      const f = o.face;
      Object.assign(sh.uniforms, {
        uHeadIdx: { value: f.idx }, uHM: { value: f.HM }, uHMi: { value: f.HMi }, uHH: { value: f.h },
        uUp: { value: f.up }, uRt: { value: f.rt }, uFw: { value: f.fw },
        uF1: { value: new THREE.Vector4(...o.faceParams.slice(0, 4)) }, uF2: { value: new THREE.Vector4(...o.faceParams.slice(4, 8)) },
      });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uHeadIdx; uniform mat4 uHM; uniform mat4 uHMi; uniform float uHH; uniform vec3 uUp; uniform vec3 uRt; uniform vec3 uFw; uniform vec4 uF1; uniform vec4 uF2;\n')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + FACE_VS);
    }
  };
  m.customProgramCacheKey = () => 'av-' + keys.join('-');
  return m;
}

// ---------- thân hình ----------
// tỉ lệ riêng của từng xương: [ngang, dọc, sâu] theo trục của xương (Y = dọc xương)
const BODY_TYPES = {
  slim: { w: 0.4, Spine: [0.88, 1, 0.86], Spine1: [0.9, 1, 0.88], Spine2: [0.92, 1, 0.9], Hips: [0.92, 1, 0.92], arm: 0.85, leg: 0.88, neck: 0.9 },
  normal: { w: 0.8, Spine: [1, 1, 1], Spine1: [1, 1, 1], Spine2: [1, 1, 1], Hips: [1, 1, 1], arm: 1, leg: 1, neck: 1 },
  athletic: { w: 0.5, Spine: [1, 1, 1], Spine1: [1.06, 1, 1.05], Spine2: [1.14, 1, 1.1], Hips: [1, 1, 1], arm: 1.2, leg: 1.1, neck: 1.15 },
  chubby: { w: 0.45, Spine: [1.28, 1, 1.35], Spine1: [1.22, 1, 1.25], Spine2: [1.1, 1, 1.12], Hips: [1.15, 1, 1.15], arm: 1.22, leg: 1.2, neck: 1.18 },
  curvy: { w: 0.35, female: true, Spine: [0.9, 1, 0.92], Spine1: [0.96, 1, 1], Spine2: [1, 1, 1.04], Hips: [1.2, 1, 1.1], arm: 0.95, leg: 1.12, neck: 0.95 },
};
function pickBodyType(female) {
  const list = Object.entries(BODY_TYPES).filter(([, v]) => !v.female || female);
  let r = Math.random() * list.reduce((a, [, v]) => a + v.w, 0);
  for (const [k, v] of list) { r -= v.w; if (r <= 0) return k; }
  return 'normal';
}
const rnd = (a, b) => a + Math.random() * (b - a);
function randomShape(female) {
  const type = pickBodyType(female);
  return { type, legLen: rnd(0.93, 1.08), head: rnd(0.93, 1.08), shoulder: rnd(0.94, 1.08), height: rnd(0.93, 1.07) };
}
const _m3 = new THREE.Matrix3(), _col = new THREE.Vector3();
export function applyShape(av) {
  const B = av.bones, s = av.shape, T = BODY_TYPES[s.type] || BODY_TYPES.normal;
  const own = {};
  const set = (n, v) => { if (B[n]) own[n] = v; };
  set('Hips', T.Hips);
  set('Spine', T.Spine); set('Spine1', T.Spine1);
  set('Spine2', [T.Spine2[0] * s.shoulder, T.Spine2[1], T.Spine2[2]]);
  set('Neck', [T.neck, 1, T.neck]);
  set('Head', [s.head, s.head, s.head]);
  for (const sd of ['Left', 'Right']) {
    set(sd + 'Arm', [T.arm, 1, T.arm]); set(sd + 'ForeArm', [T.arm * 0.95, 1, T.arm * 0.95]);
    set(sd + 'UpLeg', [T.leg, s.legLen, T.leg]); set(sd + 'Leg', [T.leg * 0.95, s.legLen, T.leg * 0.95]);
  }
  // áp tỉ lệ + bù trừ cho con để chỉ xương đó thay đổi
  const t = av.t;
  for (const [name, b] of Object.entries(B)) {
    const mine = own[name] || [1, 1, 1];
    const parentOwn = b.parent && b.parent.isBone ? own[canon(b.parent.name)] : null;
    const sc = new THREE.Vector3(...mine);
    if (parentOwn) {
      _m3.setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(t.restLocal[name] || b.quaternion));
      const e = _m3.elements;
      for (let i = 0; i < 3; i++) {
        _col.set(e[i * 3] * parentOwn[0], e[i * 3 + 1] * parentOwn[1], e[i * 3 + 2] * parentOwn[2]);
        sc.setComponent(i, sc.getComponent(i) / Math.max(0.3, _col.length()));
      }
    }
    b.scale.copy(sc);
  }
  av.legK = s.legLen;
}

// ---------- khuôn mặt ----------
function randomFace() {
  // [hàm rộng, cằm dài, má đầy, mũi cao, trán cao, mặt rộng, cằm nhô, -]
  return [rnd(-0.12, 0.16), rnd(-0.05, 0.08), rnd(-0.4, 1), rnd(-0.6, 1), rnd(-0.06, 0.08), rnd(-0.07, 0.08), rnd(-0.5, 0.8), 0];
}
const templates = [];
export const avatarTemplates = templates;

const cache = new Map();
// list: [{ url, female }]
export async function loadAvatars(list) {
  const gl = new GLTFLoader(), fbx = new FBXLoader();
  const next = [];
  for (const it of list) {
    try {
      let t = cache.get(it.url);
      if (!t) {
        const scene = /\.fbx(\?|$)/i.test(it.url) ? fixFbx(await fbx.loadAsync(it.url)) : (await gl.loadAsync(it.url)).scene;
        t = prepare(scene, it.url);
        if (t) cache.set(it.url, t);
      }
      if (t) { t.female = !!it.female; next.push(t); }
    } catch (e) { console.warn('Không nạp được mô hình', it.url, e); }
  }
  templates.length = 0; templates.push(...next);
  return templates;
}
// FBX từ Mixamo: chất liệu Phong → Standard, bỏ trong suốt giả
function fixFbx(root) {
  root.animations = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    const conv = m => {
      const n = new THREE.MeshStandardMaterial({ name: m.name, map: m.map || null, normalMap: m.normalMap || null, color: m.map ? 0xffffff : (m.color || new THREE.Color(0xcccccc)), roughness: 0.7, metalness: 0.05 });
      if (n.map) n.map.colorSpace = THREE.SRGBColorSpace;
      const cut = m.alphaMap || (m.map && /hair|lash|brow/i.test(m.name + o.name));
      if (cut) { n.alphaMap = m.alphaMap || null; n.alphaTest = 0.4; n.transparent = false; }
      n.side = THREE.DoubleSide;
      return n;
    };
    o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
  });
  return root;
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
  const faceInfo = {};
  scene.traverse(o => {
    if (!o.isSkinnedMesh) return;
    const sk = o.skeleton, hi = sk.bones.findIndex(b => canon(b.name) === 'Head');
    if (hi < 0) return;
    const si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight;
    if (!si || !sw) return;
    let n = 0;
    for (let i = 0; i < si.count; i += 3) for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === hi && sw.getComponent(i, k) > 0.5) { n++; break; }
    if (n < 20) return;
    const HM = new THREE.Matrix4().multiplyMatrices(sk.boneInverses[hi], o.bindMatrix);
    // trục của xương đầu: hướng lên = tới đỉnh đầu, hướng trước = +Z của cảnh (đổi dấu nếu mô hình quay ngược)
    const hq = new THREE.Quaternion(); bones.Head.getWorldQuaternion(hq); const hqi = hq.clone().invert();
    const topB = bones.HeadTop_End && bones.HeadTop_End.parent === bones.Head ? bones.HeadTop_End.position.clone() : new THREE.Vector3(0, 1, 0).applyQuaternion(hqi).multiplyScalar(0.2 / new THREE.Vector3().setFromMatrixScale(bones.Head.matrixWorld).x);
    const up = topB.clone().normalize();
    const fw = new THREE.Vector3(0, 0, flip ? -1 : 1).applyQuaternion(hqi);
    fw.addScaledVector(up, -fw.dot(up)).normalize();
    const rt = new THREE.Vector3().crossVectors(up, fw).normalize();
    faceInfo[o.name] = { idx: hi, HM, HMi: HM.clone().invert(), up, fw, rt, h: topB.length() };
  });
  const mats = new Set();
  scene.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m.name)); } });
  const name = url.split('/').pop();
  const female = false;
  return {
    url, name, scene, female, norm, footY, flip,
    hipH: (hips.y - footY) * norm,
    restLocal, dirLocal, restWorld,
    hipsParentInv: hipsParentWorld.clone().invert(), hipsParentQInv: hipsParentQ.clone().invert(),
    rpm: mats.has('Wolf3D_Outfit_Top'), faceInfo,
    headLen: Math.max(0.16, Math.min(0.32, (headTop.y - wp(bones.Head).y) * norm)),
    boneScale: Object.fromEntries(Object.entries(bones).map(([k, b]) => [k, new THREE.Vector3().setFromMatrixScale(b.matrixWorld).x])),
  };
}

// ---------- một nhân vật ----------
export function createAvatar(parent, female, tpl, costume) {
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
  const av = { t, holder, inner, root, bones, mats: [], legK: 1 };
  av.shape = randomShape(t.female);
  av.face = randomFace();
  av.skinTone = pick(SKIN_TONE);
  av.smile = Math.random() * 0.7;
  av.beard = Math.random() < 0.4;
  applyShape(av);
  av.seed = Math.random() * 10;
  applyCostume(av, costume === undefined ? null : costume);
  costumeShape(av);
  restyle(av);
  return av;
}

// đổi màu quần áo (mô hình có lớp áo/quần/giày riêng)
export function restyle(av) {
  for (const m of av.mats) m.dispose();
  av.mats = []; av.morphs = [];
  const tint = {};
  if (av.t.rpm) {
    const ct = av.costumeTint;
    tint.Wolf3D_Outfit_Top = ct ? ct[0] : pick(OUTFIT.top);
    tint.Wolf3D_Outfit_Bottom = ct ? ct[1] : pick(OUTFIT.bottom);
    tint.Wolf3D_Outfit_Footwear = ct ? ct[2] : pick(OUTFIT.shoes);
    tint.Wolf3D_Hair = tint.Wolf3D_Headwear = pick(OUTFIT.hair);
    const sk = av.skin || (av.skin = pick(SKIN_TINT));
    tint.Wolf3D_Skin = tint.Wolf3D_Body = sk;
  }
  let recolor = !av.t.rpm ? pick(RECOLOR) : null;
  if (recolor && av.costumeTint) {
    // đưa vùng vải vàng gốc (hue ~0.14) về màu quần của bộ hoá trang
    const hsl = {}; new THREE.Color(av.costumeTint[1]).getHSL(hsl, THREE.SRGBColorSpace);
    const dark = hsl.l < 0.15, light = hsl.l > 0.88;
    recolor = [(hsl.h - 0.14) * Math.PI * 2, dark || light ? 0 : Math.min(1.2, hsl.s * 1.1), dark ? 0.22 : light ? 1.25 : Math.min(1.3, 0.35 + hsl.l)];
  }
  av.root.traverse(o => {
    if (!o.isMesh) return;
    if (!o.userData.baseMat) o.userData.baseMat = o.material;
    const base = o.userData.baseMat;
    const c = tint[base.name];
    const face = av.t.faceInfo[o.name];
    const m = patchMat(base, { recolor, skin: !av.t.rpm ? av.skinTone : null, face, faceParams: av.face });
    if (c) m.color = new THREE.Color(c);
    av.mats.push(m); o.material = m;
    if (/Teeth/i.test(o.name)) o.visible = false;
    if (/Beard/i.test(o.name)) o.visible = av.beard && !(av.costume && av.costume.hideHat && !['wukong', 'satang'].includes(av.costume.id));
    if (/Headwear|Hair/i.test(base.name)) o.visible = !(av.costume && av.costume.hideHat);
    if (o.morphTargetDictionary && o.morphTargetDictionary.mouthSmile !== undefined) (av.morphs || (av.morphs = [])).push(o);
  });
}

export function disposeAvatar(av) {
  if (!av) return;
  applyCostume(av, null);
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
  _p.multiplyScalar((t.hipH * (av.legK || 1) / hipH0) / (t.norm * scale));   // đổi sang đơn vị mô hình
  _p.y += t.footY;
  hb.position.copy(_p.applyMatrix4(t.hipsParentInv));

  animateCostume(av, costumeTime.value);
  // nụ cười / hát theo nhạc
  if (av.morphs && av.morphs.length) {
    const sm = Math.min(1, av.smile + 0.25 * (opts.beat || 0)), op = (opts.sing || 0);
    for (const o of av.morphs) { const d = o.morphTargetDictionary; o.morphTargetInfluences[d.mouthSmile] = sm; if (d.mouthOpen !== undefined) o.morphTargetInfluences[d.mouthOpen] = op; }
  }
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

// đổi hoá trang (id = null: bỏ hoá trang)
export function setCostume(av, id) { applyCostume(av, id); costumeShape(av); restyle(av); }
function costumeShape(av) {
  if (!av.shape) return;
  if (!av.shape.baseType) av.shape.baseType = av.shape.type;
  const want = (av.costume && av.costume.shape) || av.shape.baseType;
  if (want !== av.shape.type) { av.shape.type = want; applyShape(av); }
}
export { randomCostumeId };
