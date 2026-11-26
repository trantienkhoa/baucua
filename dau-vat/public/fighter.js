// Đô vật dựng từ mô hình Fighter.fbx (khung xương Mixamo): mỗi đô vật là một bản sao có màu da, quần áo, mặt riêng.
// Tư thế được viết trên bộ xương chuẩn của game (xem wrestler.js) rồi "chuyển xương" (retarget) sang xương Mixamo.
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BONE_NAMES, faceTexture, buildHairGeometry } from './wrestler.js';

// xương chuẩn của game -> xương Mixamo
const MAP = { hips: 'Hips', spine: 'Spine', chest: 'Spine2', neck: 'Neck', head: 'Head', lArm: 'LeftArm', lFore: 'LeftForeArm', lHand: 'LeftHand', rArm: 'RightArm', rFore: 'RightForeArm', rHand: 'RightHand', lThigh: 'LeftUpLeg', lShin: 'LeftLeg', lFoot: 'LeftFoot', rThigh: 'RightUpLeg', rShin: 'RightLeg', rFoot: 'RightFoot' };
const CANON_PARENT = { spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', lArm: 'chest', lFore: 'lArm', lHand: 'lFore', rArm: 'chest', rFore: 'rArm', rHand: 'rFore', lThigh: 'hips', lShin: 'lThigh', lFoot: 'lShin', rThigh: 'hips', rShin: 'rThigh', rFoot: 'rShin' };
// xương con dùng để đo hướng xương lúc đứng chữ T
const CHILD = { Hips: 'Spine', Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head', Head: 'HeadTop_End', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', LeftHand: 'LeftHandIndex1', RightArm: 'RightForeArm', RightForeArm: 'RightHand', RightHand: 'RightHandIndex1', LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', LeftFoot: 'LeftToeBase', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', RightFoot: 'RightToeBase' };
const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0), FOOT = new THREE.Vector3(0, -0.5, 0.87).normalize();
const CANON_DIR = { Hips: UP, Spine: UP, Spine1: UP, Spine2: UP, Neck: UP, Head: UP, LeftArm: DOWN, LeftForeArm: DOWN, LeftHand: DOWN, RightArm: DOWN, RightForeArm: DOWN, RightHand: DOWN, LeftUpLeg: DOWN, LeftLeg: DOWN, RightUpLeg: DOWN, RightLeg: DOWN, LeftFoot: FOOT, RightFoot: FOOT };
const HEAD_TOP = 1.97;   // chiều cao chuẩn tới đỉnh đầu

const strip = n => n.replace(/^mixamorig\d*[:_]?/i, '').replace(/^.*:/, '').replace(/_\d+$/, '');
// mẫu nhân vật: 'male' (fighter.fbx) và 'female' (female.fbx, tuỳ chọn)
const TPLS = {};
export function fighterReady(key = 'male') { return !!TPLS[key]; }
export function fighterInfo(key = 'male') { return TPLS[key] && TPLS[key].info; }

export async function loadFighter(url, key = 'male', opts = {}) {
  let obj, anims = [];
  if (/\.glb$|\.gltf$/i.test(url)) { const g = await new GLTFLoader().loadAsync(url); obj = g.scene; anims = g.animations || []; }
  else { obj = await new FBXLoader().loadAsync(url); anims = obj.animations || []; }
  const merged = mergeSkinned(obj);
  const group = new THREE.Group();
  group.add(obj);
  obj.updateMatrixWorld(true);
  const byName = {};
  let mesh = null;
  obj.traverse(o => { if (o.isBone) byName[strip(o.name)] = o; if (o.isSkinnedMesh && !mesh) mesh = o; });
  if (!mesh || !byName.Hips || !byName.Head || !byName.LeftArm) throw new Error('Mô hình không có khung xương Mixamo');
  const v = new THREE.Vector3();
  const topY = (byName.HeadTop_End || byName.Head).getWorldPosition(v).y;
  const unit = HEAD_TOP / topY;
  const hp = byName.Hips.getWorldPosition(new THREE.Vector3());
  obj.scale.multiplyScalar(unit);
  obj.position.set(-hp.x * unit, 0, -hp.z * unit);
  group.updateMatrixWorld(true);

  const W = {}, rest = {};
  const gq = new THREE.Quaternion();
  for (const [n, b] of Object.entries(byName)) {
    W[n] = b.getWorldPosition(new THREE.Vector3());
    rest[n] = { q: b.quaternion.clone(), p: b.position.clone(), g: b.getWorldQuaternion(new THREE.Quaternion()) };
  }
  // Q0: hướng xương Mixamo khi ở tư thế chuẩn của game (tay buông thẳng, chân thẳng)
  const Q0 = {};
  for (const n of Object.keys(CANON_DIR)) {
    if (!byName[n] || !byName[CHILD[n]]) continue;
    const d = W[CHILD[n]].clone().sub(W[n]).normalize();
    Q0[n] = new THREE.Quaternion().setFromUnitVectors(d, CANON_DIR[n]).multiply(rest[n].g);
  }
  for (const n of Object.keys(CANON_DIR)) if (!Q0[n] && rest[n]) Q0[n] = rest[n].g.clone();   // thiếu xương con (vd. không có HeadTop_End)
  const armParent = byName.Hips.parent;
  const armInv = new THREE.Matrix4().copy(armParent.matrixWorld).invert();
  const armQ = armParent.getWorldQuaternion(new THREE.Quaternion());

  // dữ liệu từng đỉnh ở tư thế gốc (toạ độ chuẩn) + xương chi phối
  const geo = mesh.geometry;
  const pos = geo.attributes.position, nrm = geo.attributes.normal, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
  const N = pos.count;
  const cpos = new Float32Array(N * 3), cnrm = new Float32Array(N * 3), dom = new Uint8Array(N);
  const boneNames = mesh.skeleton.bones.map(b => strip(b.name));
  const CAT = { Hips: 1, Spine: 2, Spine1: 2, Spine2: 3, Neck: 4, Head: 5, HeadTop_End: 5, LeftShoulder: 3, RightShoulder: 3, LeftArm: 6, RightArm: 6, LeftForeArm: 7, RightForeArm: 7, LeftHand: 8, RightHand: 8, LeftUpLeg: 9, RightUpLeg: 9, LeftLeg: 10, RightLeg: 10, LeftFoot: 11, RightFoot: 11, LeftToeBase: 11, RightToeBase: 11, LeftToe_End: 11, RightToe_End: 11 };
  const M = mesh.matrixWorld, NM = new THREE.Matrix3().getNormalMatrix(M);
  const nv = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    v.fromBufferAttribute(pos, i); skinPos(mesh, i, v); v.applyMatrix4(M);   // vị trí đã skin ở tư thế hiện tại
    cpos[i * 3] = v.x; cpos[i * 3 + 1] = v.y; cpos[i * 3 + 2] = v.z;
    nv.fromBufferAttribute(nrm, i).applyMatrix3(NM).normalize();
    cnrm[i * 3] = nv.x; cnrm[i * 3 + 1] = nv.y; cnrm[i * 3 + 2] = nv.z;
    let best = 0, bw = -1;
    for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
    const bn = boneNames[best] || '';
    dom[i] = CAT[bn] || (/Thumb|Index|Middle|Ring|Pinky/.test(bn) ? 8 : 0);
  }
  // khung đầu: hộp bao các đỉnh thuộc xương đầu
  let hMinY = 9, hMaxY = -9, hMinX = 9, hMaxX = -9, hMinZ = 9, hMaxZ = -9;
  for (let i = 0; i < N; i++) if (dom[i] === 5) {
    const x = cpos[i * 3], y = cpos[i * 3 + 1], z = cpos[i * 3 + 2];
    hMinY = Math.min(hMinY, y); hMaxY = Math.max(hMaxY, y); hMinX = Math.min(hMinX, x); hMaxX = Math.max(hMaxX, x); hMinZ = Math.min(hMinZ, z); hMaxZ = Math.max(hMaxZ, z);
  }
  const head = { cx: (hMinX + hMaxX) / 2, cz: (hMinZ + hMaxZ) / 2 - 0.004, minY: hMinY, maxY: hMaxY, r: (hMaxX - hMinX) / 2 };
  // đầu thật (không tính chỏm tóc nhọn): lấy bề ngang làm bán kính, tâm sọ
  head.skullY = W.Head.y + (head.maxY - W.Head.y) * 0.42;
  head.chin = Math.max(hMinY, W.Neck.y + 0.02);
  head.top = head.skullY + head.r * 1.12;

  const meshInv = new THREE.Matrix4().copy(M).invert();
  const meshInv3 = new THREE.Matrix3().setFromMatrix4(meshInv);
  // mô hình có sẵn ảnh vân (đã mặc đồ) thì giữ nguyên vật liệu gốc, không tô lại
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const textured = mats.some(m => m && m.map) || !!merged || !!opts.keep;
  const T = { key, anims, group, obj, mesh, byName, W, rest, Q0, armInv, armQ, cpos, cnrm, dom, head, meshInv3, unit, textured,
    hipsY: W.Hips.y, info: { verts: N, tris: N / 3, bones: Object.keys(byName).length, hipsY: +W.Hips.y.toFixed(3), head, textured } };
  TPLS[key] = T;
  return T.info;
}

// Mô hình nhiều lưới (mỗi lưới một bộ xương riêng, ví dụ Taunt.fbx): gộp thành 1 SkinnedMesh dùng chung 1 bộ xương
function mergeSkinned(obj) {
  const meshes = []; obj.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
  if (meshes.length < 2) return;
  // các lưới đã dùng chung một bộ xương (vd. Ready Player Me) thì để nguyên
  if (new Set(meshes.map(m => m.skeleton.bones[0] && m.skeleton.bones[0].uuid)).size < 2) return;
  obj.updateMatrixWorld(true);
  // bộ xương chính: cây xương gần gốc nhất
  let root = null; obj.traverse(o => { if (!root && o.isBone && !(o.parent && o.parent.isBone)) root = o; });
  // một cây xương duy nhất: bỏ các nhánh trùng tên (bản sao của từng lưới)
  const main = [], seen = new Set(), dup = [];
  (function walk(b) { const n = strip(b.name); if (seen.has(n)) { dup.push(b); return; } seen.add(n); main.push(b); for (const c of b.children.slice()) if (c.isBone) walk(c); })(root);
  const idx = new Map(main.map((b, i) => [strip(b.name), i]));
  const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert();
  const geos = [], mats = [], v = new THREE.Vector3(), n = new THREE.Vector3();
  for (const m of meshes) {
    if (/teeth|tongue/i.test(m.name)) continue;
    let g = m.geometry; if (g.index) g = g.toNonIndexed();
    const N = g.attributes.position.count, P = new Float32Array(N * 3), Nn = new Float32Array(N * 3), SI = new Uint16Array(N * 4), SW = new Float32Array(N * 4);
    const M = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld), NM = new THREE.Matrix3().getNormalMatrix(M);
    const si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    for (let i = 0; i < N; i++) {
      v.fromBufferAttribute(g.attributes.position, i); skinPos(m, i, v); v.applyMatrix4(inv); P.set([v.x, v.y, v.z], i * 3);
      n.fromBufferAttribute(g.attributes.normal, i).applyMatrix3(NM).normalize(); Nn.set([n.x, n.y, n.z], i * 3);
      for (let k = 0; k < 4; k++) { const b = m.skeleton.bones[si.getComponent(i, k)]; SI[i * 4 + k] = b ? (idx.get(strip(b.name)) ?? 0) : 0; SW[i * 4 + k] = sw.getComponent(i, k); }
    }
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.BufferAttribute(P, 3)); ng.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
    ng.setAttribute('uv', g.attributes.uv ? g.attributes.uv.clone() : new THREE.BufferAttribute(new Float32Array(N * 2), 2));
    ng.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4)); ng.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
    geos.push(ng); mats.push(Array.isArray(m.material) ? m.material[0] : m.material);
  }
  // gộp các lưới cùng vật liệu → ít lệnh vẽ hơn
  const byMat = new Map();
  geos.forEach((g, i) => { const k = mats[i].name || ('m' + i); if (!byMat.has(k)) byMat.set(k, { mat: mats[i], list: [] }); byMat.get(k).list.push(g); });
  geos.length = 0; mats.length = 0;
  for (const { mat, list } of byMat.values()) { geos.push(list.length > 1 ? mergeGeometries(list, false) : list[0]); mats.push(mat); }
  const merged = mergeGeometries(geos, true);
  for (const m of meshes) m.parent.remove(m);
  // bỏ các bản sao bộ xương thừa
  const extra = dup.slice(); obj.traverse(o => { if (o.isBone && o !== root && !(o.parent && o.parent.isBone)) extra.push(o); });
  for (const b of extra) if (b.parent) b.parent.remove(b);
  // ảnh vân không có trong file → tô màu trơn theo tên vật liệu
  for (let i = 0; i < mats.length; i++) {
    const m = mats[i];
    if (m.map && !m.map.image) {
      const nm = m.name.toLowerCase();
      const c = /skin|arm|head|body/.test(nm) ? 0xc8946c : /eye/.test(nm) ? 0xf2f2f2 : /cigar/.test(nm) ? 0x6b3e1e : /cloth|jacket|pant|shirt/.test(nm) ? 0x3a3f4c : 0x777777;
      mats[i] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.02, name: m.name });
    }
  }
  const sm = new THREE.SkinnedMesh(merged, mats);
  obj.add(sm); obj.updateMatrixWorld(true);
  sm.bind(new THREE.Skeleton(main), sm.matrixWorld.clone());
  return true;
}

// vị trí đỉnh đã skin (an toàn khi chỉ số xương trỏ ra ngoài)
const _sv = new THREE.Vector3(), _sacc = new THREE.Vector3(), _sm = new THREE.Matrix4();
function skinPos(mesh, i, v) {
  const sk = mesh.skeleton, si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight;
  if (!sk || !si) return v;
  _sv.copy(v).applyMatrix4(mesh.bindMatrix); _sacc.set(0, 0, 0); let tw = 0;
  for (let k = 0; k < 4; k++) {
    const w = sw.getComponent(i, k); if (!w) continue;
    const b = sk.bones[si.getComponent(i, k)]; if (!b) continue;
    _sm.multiplyMatrices(b.matrixWorld, sk.boneInverses[si.getComponent(i, k)]);
    _sacc.addScaledVector(_sv.clone().applyMatrix4(_sm), w); tw += w;
  }
  if (tw > 0) v.copy(_sacc.multiplyScalar(1 / tw)).applyMatrix4(mesh.bindMatrixInverse);
  return v;
}

// ---------- màu từng vùng ----------
const C = c => new THREE.Color(c);
function paintColors(T, d, out) {
  const cp = T.cpos, cn = T.cnrm, dom = T.dom, N = dom.length;
  const kind = d.kind || 'wrestler', outfit = d.outfit || 'trunks', F = !!d.female;
  const skin = C(d.skin), att = C(d.attire || '#c81d25'), att2 = C(d.attire2 || '#111'), boot = C(d.boots || d.attire2 || '#111');
  const pad = C(d.pads || d.attire || '#222'), white = C('#efece4'), tat = C('#1b2530'), hairC = C(d.hairColor || '#1a1410');
  const jeans = C(d.jeans || '#3d5a8a'), vest = C(d.vest || '#141414'), black = C('#111114');
  const skinDark = skin.clone().multiplyScalar(0.8);
  const W = T.W;
  const hipY = W.Hips.y, kneeY = W.LeftLeg.y, ankleY = W.LeftFoot.y, shY = W.LeftArm.y;
  const elbowX = W.LeftForeArm.x, wristX = W.LeftHand.x, shX = W.LeftArm.x;
  const legCX = (y, s) => { const t = (W.LeftUpLeg.y - y) / (W.LeftUpLeg.y - ankleY); return s * (W.LeftUpLeg.x + (W.LeftFoot.x - W.LeftUpLeg.x) * Math.min(1, Math.max(0, t))); };
  const bootTop = d.bootH === 'low' ? ankleY + 0.12 : kneeY - 0.08;
  const waist = hipY + 0.03;
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const x = cp[i * 3], y = cp[i * 3 + 1], z = cp[i * 3 + 2], cat = dom[i];
    const s = x >= 0 ? 1 : -1, ax = Math.abs(x);
    c.copy(skin);
    if (cat === 5 || cat === 4) {
      // đầu / cổ: màu da (mặt + tóc vẽ bằng shader); bộ vest: cổ áo trắng
      if (kind === 'suit' && cat === 4 && y < W.Neck.y + 0.04) c.copy(white);
    } else if (cat >= 6 && cat <= 8) {
      // tay
      if (kind === 'referee') c.copy(ax < shX + 0.12 ? (Math.floor((Math.atan2(y - shY, z) + Math.PI) / (Math.PI / 5)) % 2 ? black : white) : skin);
      else if (kind === 'suit') c.copy(ax < wristX - 0.02 ? att : (ax < wristX + 0.01 ? white : skin));
      else {
        if (d.sleeves && ax < wristX - 0.03) c.copy(att2);
        else if (d.top === 'vest' && ax < shX + 0.07) c.copy(vest);
        else if (d.tattoo === 'arms' && ax > shX + 0.04 && ax < wristX - 0.05 && (s > 0 || d.tattooBoth) && Math.sin(ax * 34 + Math.atan2(y - shY, z) * 2) > 0.55) c.copy(skin).lerp(tat, 0.75);
        else if (d.armband && Math.abs(ax - (shX + 0.13)) < 0.02) c.copy(skin).lerp(tat, 0.85);
        else if (d.elbowPads && Math.abs(ax - elbowX) < 0.035) c.copy(pad);
        else if (ax > wristX - 0.075 && ax < wristX + 0.01) c.copy(d.wrist ? C(d.wrist) : white);
        else if (cat === 8 && d.gloves) c.copy(C(d.gloves));
        else if (cat === 8 && d.tape) c.copy(white);
      }
    } else if (cat >= 9 || (cat === 1 && y < waist)) {
      // hông dưới + chân
      if (kind === 'referee') c.copy(y < ankleY + 0.05 ? black : C('#17171c'));
      else if (kind === 'suit') c.copy(y < ankleY + 0.04 ? black : C(d.pants || '#202430'));
      else if (cat === 11 || y < ankleY + 0.02) c.copy(outfit === 'jeans' ? boot : boot);
      else if (outfit === 'jeans') c.copy(y > waist - 0.03 ? C('#3a2a1a') : jeans);
      else if (y < bootTop) c.copy(Math.abs(y - bootTop) < 0.022 ? att2.clone().lerp(white, 0.35) : boot);
      else if (d.kneepads !== false && Math.abs(y - kneeY) < 0.055) c.copy(pad);
      else {
        const a = Math.atan2(x - legCX(y, s), z);   // góc quanh ống chân (0 = trước)
        const trunksLow = outfit === 'shorts' ? kneeY + 0.12 : (outfit === 'singlet' ? hipY - 0.2 : hipY - 0.14);
        const covered = outfit === 'tights' || y > trunksLow || cat === 1;
        if (covered) {
          c.copy(att);
          if (y > waist - 0.04 && cat === 1) c.copy(att2);   // cạp quần
          if (d.stripe && Math.abs(Math.abs(a) - Math.PI / 2) < 0.22 && Math.sign(a) === s) c.copy(att2);
          if (d.split && s < 0 && outfit === 'tights' && cat >= 9) c.copy(att2);
        }
      }
    } else {
      // thân trên (hông trên, bụng, ngực, vai)
      const a = Math.atan2(x, z);
      if (kind === 'referee') c.copy(y < waist ? C('#17171c') : (Math.floor((a + Math.PI) / (Math.PI / 9)) % 2 ? black : white));
      else if (kind === 'suit') {
        if (y < waist) c.copy(C(d.pants || '#202430'));
        else if (Math.abs(a) < 0.4 && y > W.Spine1.y) c.copy(Math.abs(a) < 0.07 ? C(d.tie || '#b0182a') : white);
        else c.copy(att);
      } else {
        if (outfit === 'singlet') {
          const strap = Math.abs(ax - 0.11) < 0.035;
          if (y < W.Spine1.y + 0.05 || (strap && y < W.Neck.y) || (Math.abs(a) > 2.3 && y < W.Spine2.y)) c.copy(att);
        }
        if (F || d.top === 'crop') { if (y > W.Spine1.y + 0.04 && y < W.Neck.y - 0.05 && !(Math.abs(a) > 2.5 && y > W.Spine2.y + 0.05)) c.copy(att2); }
        if (d.top === 'vest' && Math.abs(a) > 0.45 && y > W.Spine.y) c.copy(vest);
        if (outfit === 'tank' && y < W.Neck.y - 0.04) c.copy(att2).lerp(att, 0.2);
        if (d.tattoo === 'back' && Math.abs(a) > 2.4 && y > W.Spine1.y && y < W.Neck.y - 0.04) c.copy(skin).lerp(tat, 0.7);
      }
    }
    out[i * 3] = c.r; out[i * 3 + 1] = c.g; out[i * 3 + 2] = c.b;
  }
}

// ---------- vật liệu: màu đỉnh + mặt vẽ (chiếu trụ quanh đầu theo toạ độ gốc) ----------
function makeMaterial(T, faceTex) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.46, metalness: 0.05 });
  m.userData.face = { value: faceTex };
  m.onBeforeCompile = sh => {
    sh.uniforms.faceMap = m.userData.face;
    sh.uniforms.headP = { value: new THREE.Vector4(T.head.cx, T.head.cz, T.head.chin, T.head.top) };
    sh.vertexShader = 'attribute vec3 cpos;\nvarying vec3 vC;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvC = cpos;');
    sh.fragmentShader = 'uniform sampler2D faceMap;\nuniform vec4 headP;\nvarying vec3 vC;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float hf = smoothstep(headP.z - 0.012, headP.z + 0.012, vC.y);
      if (hf > 0.0) {
        vec2 dd = vec2(vC.x - headP.x, vC.z - headP.y);
        float u = fract(atan(dd.y, -dd.x) / 6.2831853);
        float v = clamp((vC.y - headP.z) / (headP.w - headP.z), 0.0, 1.0);
        vec4 fc = texture2D(faceMap, vec2(u, v));
        diffuseColor.rgb = mix(diffuseColor.rgb, fc.rgb, hf * fc.a);
      }`);
  };
  m.customProgramCacheKey = () => 'fighter-face-v1-' + T.key;
  return m;
}

// ---------- tạo một đô vật từ mẫu ----------
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3();
export function createFighter(d, key) {
  const T = TPLS[key || (d.female && TPLS.female ? 'female' : 'male')] || TPLS.male || TPLS.female;
  const onFemale = T.key === 'female';
  const clone = SkeletonUtils.clone(T.group);
  const byName = {}; let mesh = null;
  clone.traverse(o => { if (o.isBone) byName[strip(o.name)] = o; if (o.isSkinnedMesh && !mesh) mesh = o; });
  // hình riêng: vị trí (độ vạm vỡ) + màu riêng, các thuộc tính khác dùng chung
  const src = T.mesh.geometry;
  const geo = new THREE.BufferGeometry();
  for (const k of ['normal', 'uv', 'skinIndex', 'skinWeight']) if (src.attributes[k]) geo.setAttribute(k, src.attributes[k]);
  if (src.index) geo.setIndex(src.index);
  const N = src.attributes.position.count;
  const pos = new Float32Array(src.attributes.position.array);
  const B = d.bulk || 1, G = d.gut || 0, F = !!d.female && !onFemale;   // mẫu nữ thật thì không cần nắn thân
  const cp = T.cpos, cn = T.cnrm, dom = T.dom, mi = T.meshInv3, W = T.W, H = T.head;
  const REG = [0.4, 0.55, 0.65, 0.9, 0.7, 0, 1.0, 0.85, 0.25, 0.75, 0.6, 0.05];
  const spiky = d.hair === 'spiky';
  for (let i = 0; i < N && !T.textured; i++) {
    const cat = dom[i];
    let dx = 0, dy = 0, dz = 0;
    const x = cp[i * 3], y = cp[i * 3 + 1], z = cp[i * 3 + 2];
    // vạm vỡ: phồng theo pháp tuyến
    let amt = (B - 1) * 0.075 * REG[cat] - (F ? 0.012 * REG[cat] : 0);
    dx += cn[i * 3] * amt; dy += cn[i * 3 + 1] * amt; dz += cn[i * 3 + 2] * amt;
    // bụng bia
    if (G > 0 && (cat === 1 || cat === 2) && z > 0 && y > W.Hips.y - 0.02 && y < W.Spine2.y) {
      const k = Math.sin(Math.min(1, (y - W.Hips.y + 0.02) / (W.Spine2.y - W.Hips.y + 0.02)) * Math.PI) * G * 0.1;
      dz += k * Math.min(1, z / 0.12); dx += Math.sign(x) * k * 0.25;
    }
    // vòng một cho đô vật nữ
    if (F && cat === 3 && z > 0.02) {
      const by = W.Spine2.y + 0.06;
      for (const s of [1, -1]) { const ddx = x - s * 0.085, ddy = y - by; const r2 = (ddx * ddx) / 0.004 + (ddy * ddy) / 0.003; if (r2 < 1) dz += (1 - r2) * 0.045; }
    }
    // đầu: ép chỏm tóc nhọn sát sọ (trừ kiểu tóc nhọn)
    if (cat === 5 && !spiky) {
      const ox = x - H.cx, oy = y - H.skullY, oz = z - H.cz;
      const r = Math.sqrt(ox * ox + oy * oy * 0.8 + oz * oz), R = H.r * 1.02;
      if (r > R && oy > 0) { const k = R / r; dx += ox * (k - 1); dy += oy * (k - 1); dz += oz * (k - 1); }
    }
    if (dx || dy || dz) {
      _v.set(dx, dy, dz).applyMatrix3(mi);
      pos[i * 3] += _v.x; pos[i * 3 + 1] += _v.y; pos[i * 3 + 2] += _v.z;
    }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('cpos', new THREE.BufferAttribute(T.cpos, 3));
  const colors = new Float32Array(N * 3);
  paintColors(T, { ...d, female: d.female && !onFemale ? true : (onFemale ? false : d.female), top: d.top || (d.female ? 'crop' : '') }, colors);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeBoundingSphere();
  let faceTex = null;
  if (T.textured) {
    // giữ vật liệu gốc (bản sao), chỉ dùng hình riêng cho độ vạm vỡ
    const src = T.mesh.geometry;
    if (src.attributes.color) geo.setAttribute('color', src.attributes.color);
    for (const k of Object.keys(src.attributes)) if (!geo.attributes[k]) geo.setAttribute(k, src.attributes[k]);
    for (const g of src.groups) geo.addGroup(g.start, g.count, g.materialIndex);
    mesh.geometry = geo;
    const mm = Array.isArray(T.mesh.material) ? T.mesh.material.map(m => m.clone()) : T.mesh.material.clone();
    mesh.material = mm;
    if (d.tint) for (const m of [].concat(mm)) if (m.color) m.color.lerp(new THREE.Color(d.tint), 0.35);
  } else {
    mesh.geometry = geo;
    faceTex = faceTexture(d);
    mesh.material = makeMaterial(T, faceTex);
  }
  mesh.castShadow = true; mesh.frustumCulled = false;

  // tóc / râu / mặt nạ khối gắn vào xương đầu
  const headBone = byName.Head;
  const hairGeo = T.textured && !d.forceHair ? null : buildHairGeometry(d, { cx: H.cx, cz: H.cz, cy: H.skullY, r: H.r, chin: H.chin });
  let hair = null;
  if (hairGeo) {
    hair = new THREE.Mesh(hairGeo, HAIR_MAT);
    hair.castShadow = true;
    // hình tóc ở toạ độ chuẩn: đặt ma trận = nghịch đảo ma trận xương đầu lúc đứng chữ T
    clone.updateMatrixWorld(true);
    hair.matrixAutoUpdate = false;
    hair.matrix.copy(headBone.matrixWorld).invert();
    headBone.add(hair);
  }

  clone.traverse(o => { if (o.isSkinnedMesh) { o.frustumCulled = false; o.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 4); o.boundingBox = new THREE.Box3(new THREE.Vector3(-2, -1, -2), new THREE.Vector3(2, 3, 2)); } });
  const root = new THREE.Group();
  root.add(clone);
  const scale = (d.height || 1.9) / 1.95;
  root.scale.setScalar(scale);

  // trạng thái tư thế chuẩn
  const cur = {};
  for (const n of BONE_NAMES) cur[n] = new THREE.Quaternion();
  cur.hipsQ = new THREE.Quaternion(); cur.hipsP = new THREE.Vector3(0, T.hipsY, 0);
  delete cur.hips;
  const w = {
    kind: 'fighter', T, root, mesh, hair, byName, def: d, scale, cur, faceTex,
    hipsY: T.hipsY, headTop: HEAD_TOP,
    apply(Q, k = 1) { for (const n of BONE_NAMES) { if (n === 'hips') continue; cur[n].slerp(Q[n], k); } cur.hipsQ.slerp(Q.hipsQ, k); cur.hipsP.lerp(Q.hipsP, k); retarget(w); },
    fist: 1,
  };
  retarget(w);
  return w;
}
const HAIR_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.0 });

// ---------- chuyển tư thế chuẩn sang xương Mixamo ----------
const G = {}; for (const n of BONE_NAMES) G[n] = new THREE.Quaternion();
const GM = {};
const _m = new THREE.Matrix4();
function retarget(w) {
  const T = w.T, cur = w.cur, B = w.byName, Q0 = T.Q0, rest = T.rest;
  // toàn cục theo bộ xương chuẩn
  G.hips.copy(cur.hipsQ);
  for (const n of BONE_NAMES) { if (n === 'hips') continue; G[n].copy(G[CANON_PARENT[n]]).multiply(cur[n]); }
  const setBone = (mx, target, parentG) => {
    const b = B[mx]; if (!b || !parentG) return;
    // local = inv(parentG) * target
    b.quaternion.copy(parentG).invert().multiply(target);
    (GM[mx] || (GM[mx] = new THREE.Quaternion())).copy(target);
  };
  const tgt = new THREE.Quaternion();
  setBone('Hips', tgt.copy(G.hips).multiply(Q0.Hips), T.armQ);
  setBone('Spine', tgt.copy(G.spine).multiply(Q0.Spine), GM.Hips);
  _q.copy(G.spine).slerp(G.chest, 0.5);
  setBone('Spine1', tgt.copy(_q).multiply(Q0.Spine1), GM.Spine);
  setBone('Spine2', tgt.copy(G.chest).multiply(Q0.Spine2), GM.Spine1);
  setBone('Neck', tgt.copy(G.neck).multiply(Q0.Neck), GM.Spine2);
  setBone('Head', tgt.copy(G.head).multiply(Q0.Head), GM.Neck);
  for (const s of ['Left', 'Right']) {
    const c = s === 'Left' ? 'l' : 'r';
    const sh = B[s + 'Shoulder'];
    const shG = (GM[s + 'Shoulder'] || (GM[s + 'Shoulder'] = new THREE.Quaternion())).copy(GM.Spine2).multiply(rest[s + 'Shoulder'].q);
    if (sh) sh.quaternion.copy(rest[s + 'Shoulder'].q);
    setBone(s + 'Arm', tgt.copy(G[c + 'Arm']).multiply(Q0[s + 'Arm']), shG);
    setBone(s + 'ForeArm', tgt.copy(G[c + 'Fore']).multiply(Q0[s + 'ForeArm']), GM[s + 'Arm']);
    setBone(s + 'Hand', tgt.copy(G[c + 'Hand']).multiply(Q0[s + 'Hand']), GM[s + 'ForeArm']);
    setBone(s + 'UpLeg', tgt.copy(G[c + 'Thigh']).multiply(Q0[s + 'UpLeg']), GM.Hips);
    setBone(s + 'Leg', tgt.copy(G[c + 'Shin']).multiply(Q0[s + 'Leg']), GM[s + 'UpLeg']);
    setBone(s + 'Foot', tgt.copy(G[c + 'Foot']).multiply(Q0[s + 'Foot']), GM[s + 'Leg']);
    // nắm tay
    const f = w.fist;
    for (let k = 1; k <= 3; k++) { const ib = B[s + 'HandIndex' + k]; if (ib) { ib.quaternion.copy(rest[s + 'HandIndex' + k].q); _q2.setFromAxisAngle(FIST_AXIS, f * (k === 1 ? 1.25 : 1.35) * (s === 'Left' ? 1 : 1)); ib.quaternion.multiply(_q2); } }
    for (let k = 1; k <= 2; k++) { const tb = B[s + 'HandThumb' + k]; if (tb) { tb.quaternion.copy(rest[s + 'HandThumb' + k].q); _q2.setFromAxisAngle(THUMB_AXIS, f * 0.5); tb.quaternion.multiply(_q2); } }
  }
  // vị trí hông: toạ độ chuẩn -> toạ độ của Armature
  _v.copy(cur.hipsP).applyMatrix4(T.armInv);
  B.Hips.position.copy(_v);
}
export const FIST_AXIS = new THREE.Vector3(1, 0, 0), THUMB_AXIS = new THREE.Vector3(0, 0, 1);
