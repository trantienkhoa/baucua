// Nhân vật người thật: nạp mô hình .glb có khung xương chuẩn Mixamo / Ready Player Me
// và điều khiển xương theo khung xương điệu nhảy (rig) của game.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { applyCostume, randomCostumeId, animateCostume, costumeTime, COSTUMES, setExtra, attachProp } from './costumes.js';
import { applyOutfit, removeOutfit, randomOutfit, pickOutfit, setOutfitMix, barHidden, outfitLayers, fabricize, outfitTime } from './outfits.js';
import { buildCast, randomCastChar, SPECIAL_CAST } from './cast.js';
export { outfitTime, setOutfitMix, randomCastChar };

// ---------- dàn nhân vật dựng bằng code (cast.js) ----------
const castCache = new Map();
export function castTemplate(ch, extra) {
  if (!ch) return null;
  const key = String(ch.id);
  let t = castCache.get(key);
  if (t) return t;
  const sp = SPECIAL_CAST[key];
  const scene = sp ? buildCast(sp[0], sp[1]) : buildCast(ch, extra);
  t = prepare(scene, 'cast/' + key);
  if (!t) return null;
  Object.assign(t, { cast: true, charId: key, female: !!(sp ? sp[0].female : ch.female), norm: 1, footY: 0, hipH: 0.88, flip: false });
  castCache.set(key, t);
  return t;
}
export { COSTUMES, costumeTime, setExtra };

// chuẩn hoá tên xương từ nhiều phần mềm về tên kiểu Mixamo
// (Mixamo, Ready Player Me, VRoid/VRM, Unreal, Blender/Rigify, Character Creator, Meshy/Tripo/Accurig…)
const ALIASES = {
  Hips: ['hips', 'pelvis', 'hip', 'root_hips', 'bip_c_hips', 'cc_base_hip', 'def_hips', 'def_spine'],
  Spine: ['spine', 'spine_01', 'spine1_', 'bip_c_spine', 'cc_base_waist', 'def_spine_001', 'spine01', 'abdomen', 'waist'],
  Spine1: ['spine1', 'spine_02', 'chest', 'bip_c_chest', 'cc_base_spine01', 'def_spine_002', 'spine02'],
  Spine2: ['spine2', 'spine_03', 'upperchest', 'upper_chest', 'bip_c_upperchest', 'cc_base_spine02', 'def_spine_003', 'spine03'],
  Neck: ['neck', 'neck_01', 'bip_c_neck', 'cc_base_necktwist01', 'def_spine_004', 'neck01'],
  Head: ['head', 'bip_c_head', 'cc_base_head', 'def_spine_006', 'head01'],
  HeadTop_End: ['headtop_end', 'head_end', 'headtop', 'head_top', 'bip_c_head_end'],
  LeftShoulder: ['leftshoulder', 'clavicle_l', 'shoulder_l', 'l_shoulder', 'bip_l_shoulder', 'cc_base_l_clavicle', 'def_shoulder_l', 'lshoulder', 'l_clavicle'],
  LeftArm: ['leftarm', 'upperarm_l', 'leftupperarm', 'l_upperarm', 'upper_arm_l', 'bip_l_upperarm', 'cc_base_l_upperarm', 'def_upper_arm_l', 'larm', 'l_arm'],
  LeftForeArm: ['leftforearm', 'lowerarm_l', 'leftlowerarm', 'l_lowerarm', 'forearm_l', 'bip_l_lowerarm', 'cc_base_l_forearm', 'def_forearm_l', 'lforearm', 'l_forearm', 'l_elbow'],
  LeftHand: ['lefthand', 'hand_l', 'l_hand', 'bip_l_hand', 'cc_base_l_hand', 'def_hand_l', 'lhand', 'l_wrist'],
  LeftUpLeg: ['leftupleg', 'thigh_l', 'leftupperleg', 'l_upperleg', 'upperleg_l', 'bip_l_upperleg', 'cc_base_l_thigh', 'def_thigh_l', 'lthigh', 'l_thigh', 'l_hip'],
  LeftLeg: ['leftleg', 'calf_l', 'leftlowerleg', 'l_lowerleg', 'lowerleg_l', 'shin_l', 'bip_l_lowerleg', 'cc_base_l_calf', 'def_shin_l', 'lcalf', 'l_calf', 'l_knee'],
  LeftFoot: ['leftfoot', 'foot_l', 'l_foot', 'bip_l_foot', 'cc_base_l_foot', 'def_foot_l', 'lfoot', 'l_ankle'],
};
for (const k of Object.keys(ALIASES)) if (k.startsWith('Left')) {
  const r = k.replace('Left', 'Right');
  ALIASES[r] = ALIASES[k].map(n => n.replace(/left/g, 'right').replace(/(^|_)l(_|$)/g, '$1r$2').replace(/_l$/, '_r').replace(/^l(?=[a-z])/, 'r').replace(/bip_l_/, 'bip_r_').replace(/cc_base_l_/, 'cc_base_r_'));
}
const ALIAS_MAP = new Map();
for (const [k, list] of Object.entries(ALIASES)) for (const n of list) if (!ALIAS_MAP.has(n)) ALIAS_MAP.set(n, k);
const canon = n => {
  let s = String(n || '').replace(/^mixamorig\d*[:_]?/i, '');
  if (ALIASES[s]) return s;
  let k = s.toLowerCase().replace(/^(j_|def[-_]|org[-_]|bone[-_]?|armature[|_:])/, m => m.startsWith('def') ? 'def_' : '').replace(/[.\-\s:|]/g, '_').replace(/__+/g, '_');
  if (ALIAS_MAP.has(k)) return ALIAS_MAP.get(k);
  k = k.replace(/^.*?:/, '');
  return ALIAS_MAP.get(k) || ALIAS_MAP.get(k.replace(/_/g, '')) || s;
};
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
    if (o.recolor) frag += 'float wf = smoothstep(0.22, 0.42, h.y) * smoothstep(0.035, 0.075, h.x) * (1.0 - smoothstep(0.2, 0.26, h.x)) * smoothstep(0.5, 0.68, c.g / max(c.r, 0.001)); fab = wf > 0.5; vec3 h2 = vec3(fract(h.x + uRe.x / 6.2831853), clamp(h.y * uRe.y, 0., 1.), clamp(h.z * uRe.z, 0., 1.)); vec3 c2 = hsv2rgb(h2); c = mix(c, c2, wf); float wc = smoothstep(0.28, 0.4, h.y) * smoothstep(0.4, 0.45, h.x) * (1.0 - smoothstep(0.55, 0.6, h.x)); vec3 c3 = hsv2rgb(vec3(fract(0.14 + uRe.x / 6.2831853), clamp(0.75 * uRe.y, 0., 1.), clamp(0.75 * uRe.z, 0.05, 1.))); c = mix(c, c3, wc); fab = fab || wc > 0.5; h = rgb2hsv(c);\n';
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
const lazyChars = new Map();      // charId -> { url, female }
const loadingChars = new Map();   // charId -> Promise
async function loadOne(it) {
  let t = cache.get(it.url);
  if (t) return t;
  const gl = new GLTFLoader(), fbx = new FBXLoader();
  const scene = /\.fbx(\?|$)/i.test(it.url) ? fixFbx(await fbx.loadAsync(it.url)) : loadGltfScene(await gl.loadAsync(it.url), it.url);
  t = prepare(scene, it.url);
  if (t) { t.female = !!it.female; cache.set(it.url, t); }
  return t;
}
// list: [{ url, female }]
export async function loadAvatars(list) {
  const gl = new GLTFLoader(), fbx = new FBXLoader();
  const next = [];
  lazyChars.clear();
  for (const it of list) {
    // mô hình riêng của từng vai (charXX): chỉ tải khi có người nhận vai đó
    const cm = decodeURIComponent(it.url.split('/').pop()).match(/^(char\d+|dj)(?![a-z0-9])/i);
    if (cm) { lazyChars.set(cm[1].toLowerCase(), it); continue; }
    try {
      let t = cache.get(it.url);
      if (!t) {
        const scene = /\.fbx(\?|$)/i.test(it.url) ? fixFbx(await fbx.loadAsync(it.url)) : loadGltfScene(await gl.loadAsync(it.url), it.url);
        t = prepare(scene, it.url);
        if (t) cache.set(it.url, t);
      }
      if (t) { t.female = !!it.female; next.push(t); }
    } catch (e) { console.warn('Không nạp được mô hình', it.url, e); }
  }
  templates.length = 0; templates.push(...next);
  return templates;
}
function loadGltfScene(gltf, url) {
  const ext = (gltf.parser && gltf.parser.json && gltf.parser.json.extensionsUsed) || [];
  const isVrm = /\.vrm(\?|$)/i.test(url) || ext.some(e => /VRM/i.test(e));
  if (isVrm) {
    gltf.scene.userData.vtn_vrm = true;
    // biểu cảm khuôn mặt của VRM (chớp mắt, mở miệng, cười): lấy chỉ số morph từ phần mở rộng VRM
    try {
      const j = gltf.parser.json, bs = {};
      const v0 = j.extensions && j.extensions.VRM && j.extensions.VRM.blendShapeMaster;
      for (const g of (v0 && v0.blendShapeGroups) || []) { const k = String(g.presetName && g.presetName !== 'unknown' ? g.presetName : g.name).toLowerCase(); if (g.binds && g.binds[0] && bs[k] === undefined) bs[k] = g.binds[0].index; }
      const v1 = j.extensions && j.extensions.VRMC_vrm && j.extensions.VRMC_vrm.expressions && j.extensions.VRMC_vrm.expressions.preset;
      for (const k in v1 || {}) { const b = v1[k].morphTargetBinds && v1[k].morphTargetBinds[0]; if (b) bs[k.toLowerCase()] = b.index; }
      gltf.scene.userData.vtn_bs = { blink: bs.blink, a: bs.a !== undefined ? bs.a : bs.aa, joy: bs.joy !== undefined ? bs.joy : bs.happy !== undefined ? bs.happy : bs.fun };
    } catch (e) { /* không có biểu cảm cũng không sao */ }
  }
  return isVrm ? fixVrm(gltf.scene) : fixOpaque(gltf.scene);
}
// Mô hình xuất từ Blender/MakeHuman hay để mọi vật liệu ở chế độ trong suốt → phần trong miệng lộ ra.
// Chỉ tóc, lông mày, mi được cắt alpha; còn lại vẽ đặc.
function fixOpaque(root) {
  let fused = false; root.traverse(o => { if (o.userData && o.userData.vtn_fused) fused = true; });
  root.traverse(o => {
    if (fused && o.isMesh) {   // nhân vật gắn xương tự động: chỗ cắt tay–thân để lộ mặt trong → vẽ hai mặt, khe hở hiện màu áo
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m) { m.side = THREE.DoubleSide; m.needsUpdate = true; }
      return;
    }
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m) continue;
      const thin = /hair|brow|lash|eyebrow|eyelash|short\d|long\d|bob|braid|ponytail|afro/i.test(m.name + ' ' + o.name);
      if (m.transparent) { m.transparent = false; m.depthWrite = true; m.alphaTest = thin ? 0.45 : 0; }
      // da / quần áo: một mặt (hai mặt làm mặt trong của đầu, miệng chen lên da)
      m.side = thin ? THREE.DoubleSide : THREE.FrontSide;
      m.needsUpdate = true;
    }
  });
  return root;
}
// VRM / glTF: bỏ lưới đổ bóng phụ, giữ chất liệu cắt alpha cho tóc
function fixVrm(root) {
  root.traverse(o => {
    if (!o.isMesh) return;
    const conv = m => {
      if (!m) return m;
      // VRoid/VRM (MToon) khi không có plugin hay mang ánh sáng tự phát → đổi sang chất liệu thường
      const n = new THREE.MeshLambertMaterial({ name: m.name, map: m.map || null, color: m.color ? m.color.clone() : 0xffffff, side: m.side });
      if (m.alphaTest || m.transparent || /hair|eye|face|lash|brow/i.test(m.name)) { n.alphaTest = Math.max(0.4, m.alphaTest || 0); n.transparent = false; }
      if (n.map) { n.map.colorSpace = THREE.SRGBColorSpace; shrinkTex(n.map); n.emissive = new THREE.Color(0xffffff); n.emissiveMap = n.map; n.emissiveIntensity = 0.42; }
      return n;
    };
    o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
  });
  return root;
}
const _shrunk = new WeakSet();
function shrinkTex(tex, max = 1024) {
  const im = tex.image;
  if (!im || _shrunk.has(tex) || Math.max(im.width || 0, im.height || 0) <= max) return;
  _shrunk.add(tex);
  const k = max / Math.max(im.width, im.height), c = document.createElement('canvas');
  c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  if (im.close) im.close();
  tex.image = c; tex.needsUpdate = true;
}
// màu nhuộm cho nhân vật VRM: nhân lên màu gốc của tóc / quần áo để khách dùng chung mô hình vẫn khác nhau
const VRM_HAIR = ['#ffffff', '#ffffff', '#ffffff', '#e8c9a0', '#ffc2dc', '#bfe0ff', '#e2ccff', '#a8794f', '#c9ffd9', '#ffd9a8'];
const VRM_CLOTH = ['#ffffff', '#ffffff', '#ffffff', '#ffd3df', '#d3e6ff', '#dcffd3', '#fff0bd', '#e4d3ff', '#cfcfcf', '#ffd9c2', '#c2fff4'];
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
  // bàn tay + ngón tay: hướng bàn tay (tới ngón giữa) và trục gập của từng đốt ngón (gập về phía lòng bàn tay = hướng xuống khi đứng chữ T)
  const fingers = [], hairs = [];
  const FING = /thumb|index|middle|ring|little|pinky/i;
  for (const hn of ['LeftHand', 'RightHand']) {
    const hb = bones[hn]; if (!hb) continue;
    const mid = hb.children.find(c => c.isBone && /middle/i.test(c.name)) || hb.children.find(c => c.isBone && FING.test(c.name));
    dirLocal[hn] = mid ? mid.position.clone().normalize() : (dirLocal[hn === 'LeftHand' ? 'LeftForeArm' : 'RightForeArm'] || new THREE.Vector3(0, 1, 0)).clone();
    hb.traverse(o => {
      if (!o.isBone || o === hb || !FING.test(o.name)) return;
      const kid = o.children.find(c => c.isBone);
      const f = (kid ? kid.position : o.position).clone().normalize();
      o.getWorldQuaternion(q);
      const down = new THREE.Vector3(0, -1, 0).applyQuaternion(q.clone().invert());
      const axis = new THREE.Vector3().crossVectors(f, down);
      if (axis.lengthSq() < 1e-6) return;
      let lv = 0; for (let p = o; p && p !== hb; p = p.parent) lv++;
      fingers.push({ name: o.name, axis: axis.normalize(), rest: o.quaternion.clone(), lv, thumb: /thumb/i.test(o.name), left: hn === 'LeftHand' });
    });
  }
  // tóc (xương phụ J_Sec_Hair… của VRoid): đung đưa theo chuyển động của đầu
  if (bones.Head) bones.Head.traverse(o => {
    if (!o.isBone || !/hair/i.test(o.name) || /_end/i.test(o.name)) return;
    let lv = 0; for (let p = o; p && p !== bones.Head; p = p.parent) if (/hair/i.test(p.name)) lv++;
    hairs.push({ name: o.name, rest: o.quaternion.clone(), k: lv <= 1 ? 1 : 0.6, long: Math.abs(o.position.y) + (o.children[0] ? Math.abs(o.children[0].position.y) : 0) });
  });
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
  const name = decodeURIComponent(url.split('/').pop());
  const female = false;
  return {
    headM: (() => { let h = null; scene.traverse(o => { if (o.userData && o.userData.vtn_head) h = o.userData.vtn_head; }); return h; })(),   // số đo đầu do công cụ gắn xương ghi
    fused: (() => { let f = false; scene.traverse(o => { if (o.userData && o.userData.vtn_fused) f = true; }); return f; })(),   // tay dính thân (nhân vật gắn xương tự động)
    vrm: !!scene.userData.vtn_vrm, url, name, charId: (name.match(/^(char\d+|dj)(?![a-z0-9])/i) || [])[1] ? name.match(/^(char\d+|dj)(?![a-z0-9])/i)[1].toLowerCase() : null, scene, female, norm, footY, flip,
    hipH: (hips.y - footY) * norm,
    restLocal, dirLocal, restWorld, fingers, hairs, bs: scene.userData.vtn_bs || null,
    hipsParentInv: hipsParentWorld.clone().invert(), hipsParentQInv: hipsParentQ.clone().invert(),
    rpm: mats.has('Wolf3D_Outfit_Top'), faceInfo,
    headLen: Math.max(0.16, Math.min(0.32, (headTop.y - wp(bones.Head).y) * norm)),
    boneScale: Object.fromEntries(Object.entries(bones).map(([k, b]) => [k, new THREE.Vector3().setFromMatrixScale(b.matrixWorld).x])),
  };
}

// ---------- một nhân vật ----------
export function createAvatar(parent, female, tpl, costume, opts = {}) {
  if (!tpl && !templates.length) return null;
  let pool = templates.filter(t => t.female === female);
  if (!pool.length) pool = templates;
  const t = tpl || pick(pool);
  const root = SkeletonUtils.clone(t.scene);
  const bones = {}, byName = {};
  root.traverse(o => { if (o.isBone) { byName[o.name] = o; const c = canon(o.name); if (BONES.includes(c) && !bones[c]) bones[c] = o; } });
  const holder = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(root);
  if (t.flip) inner.rotation.y = Math.PI;
  inner.position.y = -t.footY;
  holder.add(inner);
  parent.add(holder);
  const av = { t, holder, inner, root, bones, mats: [], legK: 1 };
  if (!t.cast) {   // chuyển động phụ: ngón tay, tóc, biểu cảm
    av.fingers = (t.fingers || []).map(f => ({ f, b: byName[f.name] })).filter(x => x.b);
    av.hairs = (t.hairs || []).map(f => ({ f, b: byName[f.name] })).filter(x => x.b);
    av.curl = [-1, -1]; av.hairV = new THREE.Vector3(); av.hairR = new THREE.Vector3(); av.prevHead = null; av.blinkAt = Math.random() * 4;
    if (t.bs) { av.faces = []; root.traverse(o => { if (o.isMesh && o.morphTargetInfluences && o.morphTargetInfluences.length > Math.max(t.bs.blink || 0, t.bs.a || 0)) av.faces.push(o); }); }
  }
  if (t.vrm) root.traverse(o => { if (o.isSkinnedMesh) { o.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.85, 0), 1.7); o.frustumCulled = true; } });
  av.shape = randomShape(t.female);
  if (opts.shape) av.shape.type = opts.shape;
  if (t.vrm) { av.shape.type = 'normal'; av.shape.legLen = 1; av.shape.head = 1; av.shape.shoulder = 1; }
  if (t.cast) {   // khung xương trùng khung điều khiển: giữ nguyên chiều dài chân, lấy thêm xương mí mắt / miệng / tóc
    av.shape.legLen = 1; av.shape.head = 1; av.shape.height = 1;
    av.xb = {}; root.traverse(o => { if (o.isBone && /^(Lids|Jaw|Hair)$/.test(o.name)) av.xb[o.name] = o; });
    av.blinkAt = Math.random() * 4; av.hairV = new THREE.Vector3(); av.hairR = new THREE.Vector3(); av.prevHead = null;
  }
  av.baseOutfit = t.charId ? null : (opts.outfit || null);
  if (t.vrm) av.vtint = opts.tint || [pick(VRM_HAIR), pick(VRM_CLOTH)];
  av.forceCostume = !!opts.forceCostume;   // DJ hoá trang: cho phép gắn đạo cụ lên nhân vật VRM
  av.face = randomFace();
  av.skinTone = pick(SKIN_TONE);
  av.smile = Math.random() * 0.7;
  av.beard = Math.random() < 0.4;
  applyShape(av);
  av.seed = Math.random() * 10;
  if (t.rpm) av.skin = pick(SKIN_TINT);
  applyCostume(av, costume === undefined || (t.vrm && !av.forceCostume) ? null : costume);
  if (!av.costume && !t.charId && !t.vrm) applyOutfit(av, av.baseOutfit || pickOutfit(t.female), (b, o) => attachProp(av, b, o));
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
  const layers = !av.costume ? outfitLayers(av.outfit) : null;
  let recolor = !av.t.rpm && !av.t.charId ? pick(RECOLOR) : null;
  const ou = av.outfit;
  const recolTo = av.costumeTint ? av.costumeTint[1] : !ou ? null : ou.bar ? (ou.female ? ou.legs : ou.bottom[0]) : (ou.female ? ou.color : ou.top[0]);
  if (recolor && recolTo) {
    // đưa vùng vải vàng gốc (hue ~0.14) về màu quần của bộ hoá trang
    const hsl = {}; new THREE.Color(recolTo).getHSL(hsl, THREE.SRGBColorSpace);
    const dark = hsl.l < 0.15, light = hsl.l > 0.88;
    recolor = [(hsl.h - 0.14) * Math.PI * 2, dark || light ? 0 : Math.min(1.2, hsl.s * 1.1), dark ? (hsl.l < 0.1 ? 0.1 : 0.22) : light ? 1.25 : Math.min(1.3, 0.35 + hsl.l)];
  }
  if (av.t.cast || av.t.vrm) recolor = null;
  const hiddenNames = !av.costume ? barHidden(av.outfit) : [];
  av.root.traverse(o => {
    if (!o.isMesh || o.userData.outfit) return;
    if (!o.userData.baseMat) o.userData.baseMat = o.material;
    const base = o.userData.baseMat;
    const c = tint[base.name];
    const face = av.t.charId || av.t.vrm ? null : av.t.faceInfo[o.name];
    const m = patchMat(base, { recolor, skin: !av.t.rpm && !av.t.charId && !av.t.vrm ? av.skinTone : null, face, faceParams: av.face });
    const lay = layers && layers[base.name];
    if (lay) { m.color = new THREE.Color(0xffffff); fabricize(m, lay[1], lay[0]); }
    else if (c) m.color = new THREE.Color(c);
    if (av.vtint) { const tc = /_HAIR/.test(base.name) ? av.vtint[0] : /_CLOTH/.test(base.name) ? av.vtint[1] : null; if (tc) { m.color = new THREE.Color(tc); m.emissive = new THREE.Color(tc); } }
    av.mats.push(m); o.material = m;
    if (av.t.cast && o.name === 'CastHair') o.visible = !(av.costume && av.costume.hideHat);
    if (/Teeth/i.test(o.name)) o.visible = false;
    if (/Beard/i.test(o.name)) o.visible = av.beard && !(av.costume && av.costume.hideHat && !['wukong', 'satang'].includes(av.costume.id));
    if (av.t.rpm && /Headwear|Hair/i.test(base.name)) o.visible = !(av.costume && av.costume.hideHat) && !(!av.costume && ou && ou.bar && ou.hat !== 'fedora');
    if (/Wolf3D_Outfit_(Top|Bottom)/.test(base.name)) o.visible = !hiddenNames.includes(base.name);
    if (o.morphTargetDictionary && o.morphTargetDictionary.mouthSmile !== undefined) (av.morphs || (av.morphs = [])).push(o);
  });
}

export function disposeAvatar(av) {
  if (!av) return;
  applyCostume(av, null);
  removeOutfit(av);
  setExtra(av, 'crown', false); setExtra(av, 'wings', false);
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
const CAST_MAP = [['Hips', 'hips'], ['Spine', 'spine'], ['Spine2', 'chest'], ['Neck', 'neck'], ['Head', 'head'],
  ['RightArm', 'shL'], ['RightForeArm', 'elL'], ['RightHand', 'haL'], ['LeftArm', 'shR'], ['LeftForeArm', 'elR'], ['LeftHand', 'haR'],
  ['RightUpLeg', 'hipL'], ['RightLeg', 'knL'], ['RightFoot', 'ftL'], ['LeftUpLeg', 'hipR'], ['LeftLeg', 'knR'], ['LeftFoot', 'ftR']];
const _hw = new THREE.Vector3(), _hv = new THREE.Vector3(), _hq = new THREE.Quaternion();
// nhân vật dựng bằng code: chép thẳng từng khớp của khung điều khiển + chuyển động phụ (tóc đung đưa, chớp mắt, mở miệng)
function driveCast(av, rig, opts) {
  const R = rig.root, B = av.bones;
  av.holder.position.copy(R.position); av.holder.quaternion.copy(R.quaternion);
  av.holder.scale.setScalar(Math.max(1e-4, R.scale.x * opts.alpha));
  for (const [bn, rn] of CAST_MAP) { const b = B[bn], n = rig[rn]; b.position.copy(n.position); b.quaternion.copy(n.quaternion); }
  animateCostume(av, costumeTime.value);
  const t = costumeTime.value, dt = Math.min(0.05, Math.max(0.001, t - (av.lastT || t - 0.016))); av.lastT = t;
  const X = av.xb;
  if (X.Lids) {   // chớp mắt
    if (t > av.blinkAt + 0.13) av.blinkAt = t + 1.2 + Math.random() * 4.5;
    const shut = t >= av.blinkAt && t <= av.blinkAt + 0.13;
    X.Lids.position.copy(X.Lids.userData.rest); if (!shut) X.Lids.position.z -= 0.09;
  }
  if (X.Jaw) { const o = Math.min(1, (opts.sing || 0) * 1.8); X.Jaw.position.copy(X.Jaw.userData.rest); if (o < 0.06) X.Jaw.position.z -= 0.09; X.Jaw.scale.set(0.7 + 0.3 * o, Math.max(0.05, o), 1); }
  if (X.Hair) {   // tóc: lò xo theo vận tốc của đầu
    rig.head.getWorldPosition(_hw);
    if (av.prevHead) {
      _hv.copy(_hw).sub(av.prevHead).divideScalar(dt * Math.max(0.3, R.scale.x));
      rig.head.getWorldQuaternion(_hq).invert(); _hv.applyQuaternion(_hq);
      const tx = Math.max(-0.7, Math.min(0.7, _hv.z * 0.22 - _hv.y * 0.1)), tz = Math.max(-0.7, Math.min(0.7, -_hv.x * 0.22));
      av.hairV.x += ((tx - av.hairR.x) * 90 - av.hairV.x * 7) * dt; av.hairV.z += ((tz - av.hairR.z) * 90 - av.hairV.z * 7) * dt;
      av.hairR.x += av.hairV.x * dt; av.hairR.z += av.hairV.z * dt;
      X.Hair.rotation.set(av.hairR.x, 0, av.hairR.z);
      av.prevHead.copy(_hw);
    } else av.prevHead = _hw.clone();
  }
}
export function driveAvatar(av, rig, opts) {
  if (av.t.cast) return driveCast(av, rig, opts);
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
  // chép cả hướng xoay (không chỉ hướng chỉ) để thân vặn, đầu ngoái, gật theo đúng khung điều khiển
  const spine = orient(av, 'Spine', W.Hips, rig.spine);
  let up = pass(av, 'Spine1', spine); up = orient(av, 'Spine2', up, rig.chest);
  const neck = orient(av, 'Neck', up, rig.neck);
  orient(av, 'Head', neck, rig.head);
  // tay: rig shL nằm bên trái màn hình = tay phải nhân vật. Vai nhô lên khi giơ tay, cổ tay và ngón tay mềm
  const eL = w('elL'), hL = w('haL'), eR = w('elR'), hR = w('haR');
  const rs = shrug(av, 'RightShoulder', 'RightArm', up, w('shL'), eL);
  const ra = aim(av, 'RightArm', rs, w('shL'), eL);
  aim(av, 'RightForeArm', ra, eL, hL);
  if (av.bones.RightHand) { rig.haL.getWorldQuaternion(_q3); _b.set(0, -1, 0).applyQuaternion(_q3).add(hL); aim(av, 'RightHand', W.RightForeArm, hL, _b); }
  const ls = shrug(av, 'LeftShoulder', 'LeftArm', up, w('shR'), eR);
  const la = aim(av, 'LeftArm', ls, w('shR'), eR);
  aim(av, 'LeftForeArm', la, eR, hR);
  if (av.bones.LeftHand) { rig.haR.getWorldQuaternion(_q3); _b.set(0, -1, 0).applyQuaternion(_q3).add(hR); aim(av, 'LeftHand', W.LeftForeArm, hR, _b); }
  // chân
  const rul = aim(av, 'RightUpLeg', W.Hips, w('hipL'), w('knL'));
  const rl = aim(av, 'RightLeg', rul, w('knL'), w('ftL'));
  const lul = aim(av, 'LeftUpLeg', W.Hips, w('hipR'), w('knR'));
  const ll = aim(av, 'LeftLeg', lul, w('knR'), w('ftR'));
  // bàn chân theo khung điều khiển: phẳng khi chạm sàn, chúc mũi xuống khi nhấc lên, xoay theo hướng bước
  if (flat) { orient(av, 'RightFoot', rl, rig.ftL); orient(av, 'LeftFoot', ll, rig.ftR); }
  else {
    av.bones.RightFoot.quaternion.copy(t.restLocal.RightFoot);
    av.bones.LeftFoot.quaternion.copy(t.restLocal.LeftFoot);
  }
  secondary(av, rig, opts);
}
const _q3 = new THREE.Quaternion(), _q4 = new THREE.Quaternion(), ZAX = new THREE.Vector3(0, 0, 1);
// xương mô hình nhận nguyên hướng xoay của một khớp trên khung điều khiển
function orient(av, name, parentW, node) {
  const b = av.bones[name], t = av.t;
  if (!b) return parentW;
  node.getWorldQuaternion(_q);
  const rel = _q2.copy(_qhi).multiply(_q);
  if (t.flip) { rel.x = -rel.x; rel.z = -rel.z; }
  const world = rel.multiply(t.restWorld[name]).clone();
  b.quaternion.copy(parentW).invert().multiply(world);
  return (W[name] = world);
}
// xương đòn: nhô lên theo độ cao của cánh tay (giơ tay thì vai nâng theo, không còn cứng như gắn bản lề)
function shrug(av, name, armName, parentW, from, to) {
  const b = av.bones[name], t = av.t;
  if (!b) return parentW;
  const world = _q.multiplyQuaternions(parentW, t.restLocal[name]).clone();
  _d.subVectors(to, from);
  if (_d.lengthSq() > 1e-8 && av.bones[armName]) {
    _d.normalize();
    const ang = 0.42 * Math.min(1, Math.max(0, _d.y + 0.25));
    _c.copy(av.bones[armName].position).applyQuaternion(world);
    world.premultiply(_q4.setFromAxisAngle(ZAX, (_c.x >= 0 ? 1 : -1) * ang));
  }
  b.quaternion.copy(parentW).invert().multiply(world);
  return (W[name] = world);
}
const FCURL = [0.5, 0.95, 0.7];
// ngón tay khum tự nhiên, tóc đung đưa theo đầu, chớp mắt / mở miệng
function secondary(av, rig, opts) {
  const t = costumeTime.value, dt = Math.min(0.05, Math.max(0.001, t - (av.lastT || t - 0.016))); av.lastT = t;
  if (av.fingers && av.fingers.length) {
    // rig phải = tay trái mô hình
    const cl = opts.curlR === undefined ? 0.55 : opts.curlR, cr = opts.curlL === undefined ? 0.55 : opts.curlL;
    if (Math.abs(cl - av.curl[0]) > 0.012 || Math.abs(cr - av.curl[1]) > 0.012) {
      av.curl[0] = cl; av.curl[1] = cr;
      for (const { f, b } of av.fingers) {
        const c = f.left ? cl : cr;
        const a = f.thumb ? 0.1 + 0.3 * c : c * FCURL[Math.min(2, f.lv - 1)] * (/index/i.test(f.name) ? 0.8 : /little|pinky/i.test(f.name) ? 1.2 : /ring/i.test(f.name) ? 1.1 : 1);
        b.quaternion.copy(f.rest).multiply(_q4.setFromAxisAngle(f.axis, a));
      }
    }
  }
  if (av.hairs && av.hairs.length) {
    rig.head.getWorldPosition(_a);
    if (av.prevHead) {
      _b.copy(_a).sub(av.prevHead).divideScalar(dt * Math.max(0.3, opts.scale || 1));
      _b.applyQuaternion(_qhi); if (av.t.flip) { _b.x = -_b.x; _b.z = -_b.z; }
      if (W.Head) _b.applyQuaternion(_q4.copy(W.Head).invert());
      const lim = 0.55, tx = Math.max(-lim, Math.min(lim, _b.z * 0.2 - _b.y * 0.06)), tz = Math.max(-lim, Math.min(lim, -_b.x * 0.2));
      av.hairV.x += ((tx - av.hairR.x) * 70 - av.hairV.x * 6) * dt; av.hairV.z += ((tz - av.hairR.z) * 70 - av.hairV.z * 6) * dt;
      av.hairR.x += av.hairV.x * dt; av.hairR.z += av.hairV.z * dt;
      for (const { f, b } of av.hairs) b.quaternion.copy(f.rest).multiply(_q4.setFromEuler(_e.set(av.hairR.x * f.k, 0, av.hairR.z * f.k)));
      av.prevHead.copy(_a);
    } else av.prevHead = _a.clone();
  }
  if (av.faces && av.faces.length) {
    const bs = av.t.bs;
    if (t > av.blinkAt + 0.14) av.blinkAt = t + 1.2 + Math.random() * 4.5;
    const shut = t >= av.blinkAt ? Math.sin(Math.min(1, (t - av.blinkAt) / 0.14) * Math.PI) : 0;
    const open = Math.min(1, (opts.sing || 0) * 1.5);
    for (const o of av.faces) {
      const m = o.morphTargetInfluences;
      if (bs.blink !== undefined) m[bs.blink] = shut;
      if (bs.a !== undefined) m[bs.a] = open;
      if (bs.joy !== undefined) m[bs.joy] = open > 0.05 ? 0 : 0.28 * (av.smile || 0);
    }
  }
}

// đổi hoá trang (id = null: bỏ hoá trang)
export function setCostume(av, id) {
  applyCostume(av, av.t.vrm && !av.forceCostume ? null : id);
  if (av.costume || av.t.charId || av.t.vrm) removeOutfit(av); else applyOutfit(av, av.baseOutfit || pickOutfit(av.t.female), (b, o) => attachProp(av, b, o));
  costumeShape(av); restyle(av);
}
if (typeof window !== 'undefined') { window._applyOutfit = (av, o) => applyOutfit(av, o, (b, x) => attachProp(av, b, x)); window._restyle = av => restyle(av); }
export function outfitName(av) { return av && av.outfit ? av.outfit.name : ''; }
function costumeShape(av) {
  if (!av.shape) return;
  if (!av.shape.baseType) av.shape.baseType = av.shape.type;
  const want = (av.costume && av.costume.shape) || av.shape.baseType;
  if (want !== av.shape.type) { av.shape.type = want; applyShape(av); }
}
export { randomCostumeId };

// trả về mô hình riêng của vai nếu đã tải; nếu chưa thì bắt đầu tải (trả null, gọi lại sau)
export function templateForChar(id) {
  id = String(id || '').toLowerCase();
  const it = lazyChars.get(id);
  if (!it) return templates.find(t => t.charId === id) || null;
  const t = cache.get(it.url);
  if (t) return t;
  if (!loadingChars.has(id)) loadingChars.set(id, loadOne(it).catch(e => { console.warn('Không nạp được', it.url, e); return null; }));
  return null;
}
export function hasCharModel(id) { return lazyChars.has(String(id || '').toLowerCase()); }
