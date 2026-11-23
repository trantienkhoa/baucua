// Ngọn Đèn Cuối Cùng — cảnh 3D (Three.js): ngồi giữa đồng lúa hoặc trong bụi chuối lúc nửa đêm,
// người xem là nhân vật 3D ngồi bó gối quanh ngọn đèn dầu. Lớp chữ / bảng / hồn ma vẫn vẽ 2D ở trên.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadAvatars, createAvatar, driveAvatar, disposeAvatar, avatarTemplates, setOutfitMix, templateForChar, hasCharModel } from './avatars.js';
import { attachProp } from './costumes.js';

const W = 1080, H = 1920, TAU = Math.PI * 2;
const SH = window.__maShared;   // ghế, đèn, gương do ma.js khai báo
const canvas = document.getElementById('gl');
const rand = (a, b) => a + Math.random() * (b - a);
let seed = 12345; const srand = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (seed / 2147483647) * (b - a); };
function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) { console.warn('Không chạy được WebGL — dùng cảnh 2D', e); }

if (renderer && SH) {
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);
  scene.fog = new THREE.FogExp2(0x0a0e18, 0.034);
  const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 400);
  camera.position.set(0, 5, 10); camera.lookAt(0, 0, -2);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();

  // điểm trên màn hình 2D → mặt đất 3D
  const _r = new THREE.Vector3();
  function ground(x, y) {
    _r.set(x / W * 2 - 1, -(y / H * 2 - 1), 0.5).unproject(camera).sub(camera.position).normalize();
    const t = -camera.position.y / Math.min(-1e-4, _r.y);
    return camera.position.clone().addScaledVector(_r, t);
  }
  const _s = new THREE.Vector3();
  function toScreen(p) { _s.copy(p).project(camera); return { x: (_s.x + 1) / 2 * W, y: (1 - _s.y) / 2 * H, z: _s.z }; }

  const L = new THREE.Vector3(0, 0, 0);     // đống lửa ở gốc toạ độ, mỗi cảnh tự đặt máy quay
  const M = new THREE.Vector3(0, 0, -500);  // (không còn tấm gương)

  // ---------------- texture vẽ bằng canvas ----------------
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
    t.anisotropy = 4;
    return t;
  }
  const soilTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2a2117'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const l = srand(0.5, 1.3); g.fillStyle = `rgba(${60 * l | 0},${48 * l | 0},${32 * l | 0},${srand(0.2, 0.6)})`; g.fillRect(srand(0, w), srand(0, h), srand(1, 4), srand(1, 3)); }
    for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(20,16,10,${srand(0.2, 0.5)})`; g.lineWidth = srand(0.5, 1.5); g.beginPath(); const x = srand(0, w), y = srand(0, h); g.moveTo(x, y); g.lineTo(x + srand(-14, 14), y + srand(-14, 14)); g.stroke(); }
  }, 70);
  const matTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#6b5636'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6) { g.fillStyle = y % 12 ? 'rgba(40,28,14,.25)' : 'rgba(150,120,80,.18)'; g.fillRect(0, y, w, 3); }
    for (let x = 0; x < w; x += 6) { g.fillStyle = 'rgba(30,20,10,.12)'; g.fillRect(x, 0, 2, h); }
    g.strokeStyle = 'rgba(130,28,28,.75)'; g.lineWidth = 16; g.strokeRect(26, 26, w - 52, h - 52);
    g.strokeStyle = 'rgba(40,70,30,.55)'; g.lineWidth = 6; g.strokeRect(48, 48, w - 96, h - 96);
  });
  const leafTex = canvasTex(64, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#2c4a1e'); gr.addColorStop(0.5, '#3f6a2a'); gr.addColorStop(1, '#2a461c');
    g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2, 0); g.quadraticCurveTo(w, h * 0.15, w * 0.96, h * 0.7); g.quadraticCurveTo(w * 0.8, h, w / 2, h); g.quadraticCurveTo(w * 0.2, h, w * 0.04, h * 0.7); g.quadraticCurveTo(0, h * 0.15, w / 2, 0); g.fill();
    g.globalCompositeOperation = 'destination-out';   // lá chuối rách
    for (let i = 0; i < 9; i++) { const y = srand(30, h - 20), side = srand() < 0.5; g.fillRect(side ? 0 : w / 2 + 3, y, w / 2 - 3, srand(1.5, 3)); }
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#7a8a4a'; g.fillRect(w / 2 - 1.5, 0, 3, h);
  });
  const deadLeafTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#4a3a20'; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 2, 0, 0, TAU); g.fill(); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 14; i++) g.fillRect(srand() < 0.5 ? 0 : w / 2 + 2, srand(0, h), w / 2, 2); });
  const trunkTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#4a4f2e'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 5) { g.fillStyle = `rgba(${srand(20, 70) | 0},${srand(30, 60) | 0},20,.5)`; g.fillRect(x, 0, srand(1, 3), h); } for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(40,25,15,.5)'; g.fillRect(srand(0, w), srand(0, h), srand(4, 12), srand(2, 5)); } });
  const glowTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const shadowTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const treelineTex = canvasTex(2048, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#04060b';
    g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 6) { const n = Math.sin(x * 0.011) * 18 + Math.sin(x * 0.037) * 10 + Math.sin(x * 0.13) * 5; g.lineTo(x, h * 0.52 - n - (srand() < 0.04 ? srand(20, 60) : 0)); }
    g.lineTo(w, h); g.fill();
    for (let i = 0; i < 26; i++) { const x = srand(0, w), hh = srand(60, 140); g.fillRect(x, h - hh - 40, 3, hh); for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(x + srand(-10, 10), h - hh - 40 + k * 8, srand(14, 30), 6, srand(-0.6, 0.6), 0, TAU); g.fill(); } }
  });

  // ---------------- trời, trăng, sao, rặng cây ----------------
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x02030a) }, mid: { value: new THREE.Color(0x0b1430) }, bot: { value: new THREE.Color(0x1a2240) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.6, h)) : mix(bot, mid, smoothstep(-0.05, 0.08, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), skyMat));
  {
    const n = 700, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = srand(0, TAU), e = srand(0.06, 1.3), r = 190; pos.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.3, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })));
  }
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xdfe6ff, fog: false, depthWrite: false }));
  moon.position.set(70, 34, -150); moon.scale.set(60, 60, 1); scene.add(moon);
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(6, 32), new THREE.MeshBasicMaterial({ color: 0xf2f4ff, fog: false }));
  moonDisc.position.copy(moon.position); moonDisc.lookAt(camera.position); scene.add(moonDisc);
  const tl = new THREE.Mesh(new THREE.CylinderGeometry(70, 70, 22, 64, 1, true), new THREE.MeshBasicMaterial({ map: treelineTex, transparent: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  treelineTex.wrapS = THREE.RepeatWrapping; treelineTex.repeat.set(3, 1);
  tl.position.set(L.x, 8, L.z); scene.add(tl);

  // ---------------- ánh sáng ----------------
  const hemi = new THREE.HemisphereLight(0x4a5c90, 0x14100a, 1.0); scene.add(hemi);
  const moonLight = new THREE.DirectionalLight(0xa8b8ec, 1.4); moonLight.position.set(-30, 40, -60); scene.add(moonLight);
  const fillLight = new THREE.DirectionalLight(0x8090c0, 0.55); fillLight.position.set(0, 6, 14); scene.add(fillLight);   // ánh trăng hắt từ phía máy quay cho người ngồi quay lưng
  const lampLight = new THREE.PointLight(0xff8a3a, 40, 0, 1.6); lampLight.position.set(L.x, 0.9, L.z); scene.add(lampLight);   // ánh lửa củi
  const rimLight = new THREE.PointLight(0x6680ff, 0, 0, 2); rimLight.position.set(L.x, 3, L.z - 6); scene.add(rimLight);   // ánh ma lạnh khi âm khí cao

  // ---------------- mặt đất, chiếu ----------------
  const groundMat = new THREE.MeshLambertMaterial({ map: soilTex, color: 0xc8b8a0 });
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), groundMat); gnd.rotation.x = -Math.PI / 2; scene.add(gnd);

  // ---------------- dựng các thứ ----------------
  const gMat = (c, extra = {}) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, extra));
  const swayers = [];   // lá chuối đung đưa
  function bananaTree(parent, x, z, h, opt = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = srand(0, TAU);
    const tg = new THREE.CylinderGeometry(0.11 * h / 3.5, 0.2 * h / 3.5, h, 9, 6); tg.translate(0, h / 2, 0);
    const p = tg.attributes.position; const bend = srand(-0.25, 0.25);
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / h; p.setX(i, p.getX(i) + bend * y * y); }
    tg.computeVertexNormals();
    g.add(new THREE.Mesh(tg, gMat(0x8a8a6a, { map: trunkTex })));
    const n = opt.leaves || Math.round(srand(6, 9));
    for (let i = 0; i < n; i++) {
      const len = srand(1.8, 2.7) * h / 3.5, wd = srand(0.45, 0.65) * h / 3.5;
      const lg = new THREE.PlaneGeometry(wd, len, 1, 8); lg.translate(0, len / 2, 0);
      const lp = lg.attributes.position;
      for (let k = 0; k < lp.count; k++) { const a = lp.getY(k) / len; lp.setZ(k, -a * a * len * 0.55 + Math.abs(lp.getX(k)) * 0.35); }
      lg.computeVertexNormals();
      const dead = srand() < 0.22;
      const leaf = new THREE.Mesh(lg, gMat(dead ? 0x9a8a60 : 0x9ab078, { map: dead ? deadLeafTex : leafTex, side: THREE.DoubleSide, alphaTest: 0.5 }));
      const piv = new THREE.Group(); piv.position.set(bend, h * 0.97, 0);
      piv.rotation.y = i / n * TAU + srand(-0.3, 0.3);
      const base = dead ? -2.4 : srand(-1.15, -0.55);
      piv.add(leaf); leaf.rotation.x = base;
      g.add(piv);
      swayers.push({ o: leaf, base, ph: srand(0, TAU), amp: dead ? 0.03 : srand(0.03, 0.08) });
    }
    // lá khô rủ dọc thân
    for (let i = 0; i < 2; i++) { const lg = new THREE.PlaneGeometry(0.3, 1.1).translate(0, -0.55, 0); const lf = new THREE.Mesh(lg, gMat(0x6a5a3a, { map: deadLeafTex, side: THREE.DoubleSide, alphaTest: 0.5 })); lf.position.set(0, h * srand(0.55, 0.8), 0.12); lf.rotation.set(srand(-0.2, 0.2), srand(0, TAU), 0); g.add(lf); }
    parent.add(g);
    return g;
  }
  function tuftGeo(h) {
    const parts = [];
    for (let k = 0; k < 3; k++) {
      const b = new THREE.PlaneGeometry(0.05, h, 1, 3); b.translate(0, h / 2, 0);
      const p = b.attributes.position; const lean = srand(-0.25, 0.25);
      for (let i = 0; i < p.count; i++) { const y = p.getY(i) / h; p.setX(i, p.getX(i) * (1 - y * 0.8) + lean * y * y * h); }
      b.rotateY(k / 3 * Math.PI + srand(-0.2, 0.2));
      parts.push(b);
    }
    return mergeGeometries(parts);
  }
  const windU = { value: 0 };
  function swayMat(color) {
    const m = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
    m.onBeforeCompile = sh => {
      sh.uniforms.uTime = windU;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float hh = max(0.0, position.y);
        vec4 wp = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
        float sw = sin(uTime * 1.6 + wp.x * 0.45 + wp.z * 0.3) + 0.5 * sin(uTime * 3.1 + wp.x);
        transformed.x += sw * 0.07 * hh * hh * 2.0;
        transformed.z += cos(uTime * 1.3 + wp.z * 0.4) * 0.04 * hh * hh * 2.0;`);
    };
    return m;
  }
  function field(parent, opt) {
    const geo = tuftGeo(opt.h);
    const pts = [];
    if (opt.rect) {   // tiền cảnh: một dải hình chữ nhật trước máy quay
      const [x0, x1, z0, z1] = opt.rect;
      for (let x = x0; x <= x1; x += opt.step) for (let z = z0; z <= z1; z += opt.step) if (srand() < opt.fill) pts.push([x + srand(-opt.jit, opt.jit), z + srand(-opt.jit, opt.jit)]);
    }
    else for (let x = -opt.r; x <= opt.r; x += opt.step) for (let z = -opt.r; z <= opt.r * 0.4; z += opt.step) {
      const px = L.x + x + srand(-opt.jit, opt.jit), pz = L.z + z + srand(-opt.jit, opt.jit);
      const d = Math.hypot(px - L.x, pz - L.z);
      if (d < opt.clear || d > opt.r) continue;
      if (opt.skip && opt.skip(px, pz)) continue;
      if (srand() > opt.fill) continue;
      pts.push([px, pz]);
    }
    const im = new THREE.InstancedMesh(geo, swayMat(opt.color), pts.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color();
    pts.forEach(([x, z], i) => {
      const s = srand(0.7, 1.25); q.setFromEuler(e.set(0, srand(0, TAU), 0));
      im.setMatrixAt(i, m4.compose(ps.set(x, 0, z), q, sc.set(s, s * srand(0.8, 1.2), s)));
      im.setColorAt(i, col.setHSL(opt.hue + srand(-0.03, 0.03), 0.45, srand(0.16, 0.28)));
    });
    im.frustumCulled = false;
    parent.add(im);
    return im;
  }
  function grave(parent, x, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = srand(-0.4, 0.4);
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2), gMat(0x3d3020)); m.scale.set(1.1 * s, 0.55 * s, 0.85 * s); g.add(m);
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.55 * s, 0.75 * s, 0.1), gMat(0x5a5a58)); st.position.set(0, 0.38 * s, -0.95 * s); st.rotation.x = -0.08; g.add(st);
    for (let i = -1; i <= 1; i++) {   // nhang cháy dở
      const st2 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35), gMat(0x8a2a18)); st2.position.set(i * 0.06, 0.18, -0.75 * s); g.add(st2);
      const tip = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff6a2a, blending: THREE.AdditiveBlending, depthWrite: false })); tip.scale.setScalar(0.12); tip.position.set(i * 0.06, 0.36, -0.75 * s); g.add(tip);
    }
    parent.add(g);
  }
  function strawPile(parent, x, z, s = 1) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(1.2 * s, 1.9 * s, 12), gMat(0x6a5a30)); m.position.set(x, 0.95 * s, z); parent.add(m);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6 * s), gMat(0x3a2a18)); p.position.set(x, 1.3 * s, z); parent.add(p);
  }
  let scarecrowHead = null;
  function scarecrow(parent, x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -0.4;
    const wood = gMat(0x3a2a18);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.4), wood); post.position.y = 1.2; g.add(post);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8), wood); bar.rotation.z = Math.PI / 2; bar.position.y = 1.75; g.add(bar);
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.8, 0.22), gMat(0x2c2a30)); shirt.position.y = 1.45; g.add(shirt);
    for (const sx of [-1, 1]) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.18), gMat(0x2c2a30)); sl.position.set(sx * 0.6, 1.72, 0); g.add(sl); const rag = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.5).translate(0, -0.25, 0), gMat(0x3a3438, { side: THREE.DoubleSide })); rag.position.set(sx * 0.85, 1.7, 0); g.add(rag); swayers.push({ o: rag, base: 0, ph: srand(0, TAU), amp: 0.25 }); }
    const head = new THREE.Group(); head.position.y = 2.15; g.add(head);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), gMat(0x9a8a6a)));
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.28, 18), gMat(0xb8a070)); hat.position.y = 0.2; head.add(hat);
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(0.035, 8), new THREE.MeshBasicMaterial({ color: 0x110000 })); e.position.set(sx * 0.08, 0.02, 0.215); head.add(e); }
    scarecrowHead = { head, eyes: head.children.slice(-2) };
    parent.add(g);
  }
  function deadTree(parent, x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const wood = gMat(0x231a12);
    const branch = (par, len, rad, depth) => {
      const geo = new THREE.CylinderGeometry(rad * 0.6, rad, len, 6); geo.translate(0, len / 2, 0);
      const b = new THREE.Mesh(geo, wood); par.add(b);
      if (depth <= 0) return;
      for (let i = 0; i < 2 + (depth > 1 ? 1 : 0); i++) {
        const c = new THREE.Group(); c.position.y = len * srand(0.6, 0.95); c.rotation.set(srand(-0.9, 0.9), srand(0, TAU), srand(-0.9, 0.9)); b.add(c);
        branch(c, len * srand(0.5, 0.75), rad * 0.6, depth - 1);
      }
    };
    branch(g, 3.2, 0.22, 3);
    parent.add(g);
  }
  function stake(parent, x, z) {   // cọc gỗ dựng gương cổ
    const wood = gMat(0x2e2015);
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.4), wood); p.position.set(x + sx * 0.5, 1.1, z - 0.15); p.rotation.z = -sx * 0.12; parent.add(p); }
    const cross = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.08), wood); cross.position.set(x, 0.5, z - 0.15); parent.add(cross);
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.5), wood); table.position.set(x, 0.42, z + 0.25); parent.add(table);
  }
  function fence(parent, x0, z0, x1, z1) {
    const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.18), wood = gMat(0x3a3220);
    for (let i = 0; i <= n; i++) { const k = i / n, h = srand(1.1, 1.6); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, h, 5), wood); p.position.set(x0 + (x1 - x0) * k, h / 2, z0 + (z1 - z0) * k); p.rotation.z = srand(-0.08, 0.08); parent.add(p); }
    for (const y of [0.4, 0.9]) { const len = Math.hypot(x1 - x0, z1 - z0); const r = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 5), wood); r.rotation.z = Math.PI / 2; r.rotation.y = -Math.atan2(z1 - z0, x1 - x0); r.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); parent.add(r); }
  }
  function well(parent, x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.7, 18, 1, true), gMat(0x4a4a46, { side: THREE.DoubleSide })); ring.position.y = 0.35; g.add(ring);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.72, 18), new THREE.MeshBasicMaterial({ color: 0x000000 })); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.55; g.add(hole);
    parent.add(g);
  }
  function hut(parent, x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = 0.3;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 2.2, 3), gMat(0x2a2016)); wall.position.y = 1.1; g.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.8, 4), gMat(0x3a3020)); roof.position.y = 3.1; roof.rotation.y = Math.PI / 4; roof.scale.set(1.25, 1, 1); g.add(roof);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.5), new THREE.MeshBasicMaterial({ color: 0x000000 })); door.position.set(0.6, 0.75, 1.51); g.add(door);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), new THREE.MeshBasicMaterial({ color: 0x331a08 })); win.position.set(-1, 1.3, 1.51); g.add(win);
    hutWindow = win;
    parent.add(g);
  }
  let hutWindow = null;

  // ---------------- các cảnh (dựng khi được chọn lần đầu) ----------------
  // vòng ngồi quanh lửa bán kính ~5 m quanh L phải trống; phía máy quay (z > L.z + 1.5) không đặt vật to
  const mesh = (geo, m, x, y, z, parent) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (parent) parent.add(o); return o; };
  const box = (g, w, h, d, c, x, y, z, ry = 0) => { const o = mesh(new THREE.BoxGeometry(w, h, d), gMat(c), x, y, z, g); o.rotation.y = ry; return o; };
  const cyl = (g, rt, rb, h, c, x, y, z, seg = 10) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), gMat(c), x, y, z, g);
  const glowSprite = (g, color, x, y, z, s, additive = true) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, transparent: true })); sp.position.set(x, y, z); sp.scale.setScalar(s); g.add(sp); return sp; };
  const fgGrass = (g, color = 0x7a9048, h = 0.42, hue = 0.24) => field(g, { h, step: 0.36, jit: 0.15, fill: 0.8, hue, color, rect: [L.x - 6, L.x + 6, L.z + 3.25, L.z + 4.9] });
  const ringGrass = (g, r = 16, fill = 0.5, color = 0x6a8040, h = 0.4) => field(g, { h, r, step: 0.55, jit: 0.2, clear: 5.4, fill, hue: 0.22, color, skip: (x, z) => Math.hypot(x - M.x, z - M.z) < 1.4 });
  const ringPos = (n, r0, r1, test) => {   // các vị trí rải quanh vòng, tránh máy quay và tấm gương
    const out = [];
    for (let i = 0; i < n * 12 && out.length < n; i++) {
      const a = srand(0, TAU), r = srand(r0, r1), x = L.x + Math.cos(a) * r, z = L.z + Math.sin(a) * r * 0.9;
      if (z > L.z + 1.5 || Math.hypot(x - M.x, z - M.z) < 1.8) continue;
      if (test && !test(x, z)) continue;
      out.push([x, z]);
    }
    return out;
  };
  const paperTex = canvasTex(64, 64, (g2, w) => { g2.fillStyle = '#c9a23a'; g2.fillRect(0, 0, w, w); g2.strokeStyle = '#8a1a14'; g2.lineWidth = 3; g2.strokeRect(6, 6, w - 12, w - 12); g2.fillStyle = '#8a1a14'; g2.font = 'bold 30px serif'; g2.textAlign = 'center'; g2.fillText('福', w / 2, w / 2 + 10); });
  const tileTex = canvasTex(256, 256, (g2, w) => { g2.fillStyle = '#3a3532'; g2.fillRect(0, 0, w, w); for (let y = 0; y < w; y += 32) for (let x = (y / 32 % 2) * 16; x < w; x += 32) { const l = srand(0.7, 1.2); g2.fillStyle = `rgb(${70 * l | 0},${62 * l | 0},${56 * l | 0})`; g2.fillRect(x + 1, y + 1, 30, 30); } }, 10);
  function paved(g, rx, rz) { const p = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshLambertMaterial({ map: tileTex, color: 0xb0a898 })); p.rotation.x = -Math.PI / 2; p.scale.set(rx, rz, 1); p.position.set(L.x, 0.006, L.z - 1.5); g.add(p); }
  function flowerTree(g, x, z, h = 3.2) {   // cây hoa sứ trắng (hay trồng ở nghĩa địa, đình chùa)
    const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = srand(0, TAU);
    const bark = gMat(0x5a5248), flower = new THREE.MeshLambertMaterial({ color: 0xf4efe4, emissive: 0x302820 });
    const fgeo = new THREE.IcosahedronGeometry(0.09, 0);
    const br = (par, len, rad, d) => {
      const geo = new THREE.CylinderGeometry(rad * 0.7, rad, len, 7); geo.translate(0, len / 2, 0);
      const b = new THREE.Mesh(geo, bark); par.add(b);
      if (d <= 0) { for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(fgeo, flower); f.position.set(srand(-0.25, 0.25), len + srand(-0.05, 0.2), srand(-0.25, 0.25)); b.add(f); } return; }
      for (let i = 0; i < 2; i++) { const c = new THREE.Group(); c.position.y = len * srand(0.75, 1); c.rotation.set(srand(-0.8, 0.8), srand(0, TAU), srand(-0.8, 0.8)); b.add(c); br(c, len * 0.7, rad * 0.65, d - 1); }
    };
    br(t, h * 0.45, 0.2, 3);
    g.add(t);
  }
  function bigWell(g, x, z) {   // giếng cổ có mái che
    const w = new THREE.Group(); w.position.set(x, 0, z);
    const ring = mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.85, 20, 1, true), gMat(0x5a5650, { side: THREE.DoubleSide }), 0, 0.42, 0, w);
    mesh(new THREE.TorusGeometry(1.02, 0.09, 6, 20), gMat(0x6a665e), 0, 0.85, 0, w).rotation.x = Math.PI / 2;
    const hole = mesh(new THREE.CircleGeometry(0.95, 20), new THREE.MeshBasicMaterial({ color: 0x000000 }), 0, 0.6, 0, w); hole.rotation.x = -Math.PI / 2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(w, 0.07, 0.08, 2.6, 0x3a2a1a, sx * 1.2, 1.3, sz * 1.2, 6);
    const roof = mesh(new THREE.ConeGeometry(2.3, 1.1, 4), gMat(0x5a2a1e), 0, 3.15, 0, w); roof.rotation.y = Math.PI / 4;
    cyl(w, 0.05, 0.05, 2.0, 0x3a2a1a, 0, 2.3, 0).rotation.z = Math.PI / 2; w.children[w.children.length - 1].position.set(0, 2.3, 0);
    const rope = cyl(w, 0.012, 0.012, 1.6, 0x8a7a5a, 0.2, 1.5, 0, 4);
    cyl(w, 0.16, 0.12, 0.25, 0x4a3a2a, 0.2, 0.65, 0, 10);
    g.add(w);
    return { rope };
  }
  function waterJar(g, x, z, s = 1) { const j = mesh(new THREE.SphereGeometry(0.4 * s, 12, 10), gMat(0x6a4a30), x, 0.38 * s, z, g); j.scale.y = 1.15; mesh(new THREE.CylinderGeometry(0.22 * s, 0.26 * s, 0.12, 12), gMat(0x5a3a22), x, 0.82 * s, z, g); }
  function banyan(g, x, z) {   // cây đa: thân to, tán rộng, rễ phụ buông như tóc
    const t = new THREE.Group(); t.position.set(x, 0, z);
    const bark = gMat(0x3e3a30);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const c = mesh(new THREE.CylinderGeometry(0.45, 0.75, 6.5, 8), bark, Math.cos(a) * 0.55, 3.25, Math.sin(a) * 0.55, t); c.rotation.set(srand(-0.12, 0.12), 0, srand(-0.12, 0.12)); }
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + 0.3; const rt = mesh(new THREE.CylinderGeometry(0.12, 0.35, 2.2, 6), bark, Math.cos(a) * 1.3, 0.5, Math.sin(a) * 1.3, t); rt.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); }
    const leaf = new THREE.MeshLambertMaterial({ color: 0x1e3018, flatShading: true });
    for (let i = 0; i < 9; i++) { const c = mesh(new THREE.IcosahedronGeometry(srand(2.4, 3.6), 1), leaf, srand(-4.5, 4.5), srand(6.5, 8.5), srand(-3.5, 2.5), t); c.scale.y = 0.6; }
    for (let i = 0; i < 70; i++) {   // rễ phụ buông xuống
      const rx = srand(-5, 5), rz = srand(-3.5, 2.8); if (Math.hypot(rx, rz) < 1.2) continue;
      const len = srand(2.5, 6.5), r = mesh(new THREE.CylinderGeometry(0.02, 0.035, len, 4), gMat(0x4a4234), rx, 7 - len / 2, rz, t);
      swayers.push({ o: r, base: 0, ph: srand(0, TAU), amp: 0.015 });
    }
    mesh(new THREE.TorusGeometry(1.05, 0.08, 6, 24), gMat(0x9a1a14), 0, 1.6, 0, t).rotation.x = Math.PI / 2;   // vải đỏ quấn gốc
    // miếu nhỏ dưới gốc
    box(t, 0.7, 0.5, 0.5, 0x6a3a22, 0.4, 0.25, 1.35); const r2 = mesh(new THREE.ConeGeometry(0.6, 0.35, 4), gMat(0x7a2a1a), 0.4, 0.68, 1.35, t); r2.rotation.y = Math.PI / 4;
    glowSprite(t, 0xff5a2a, 0.4, 0.3, 1.62, 0.35);
    // quần áo giấy (vàng mã) treo trên rễ
    for (let i = 0; i < 6; i++) { const p = mesh(new THREE.PlaneGeometry(0.35, 0.5).translate(0, -0.25, 0), new THREE.MeshLambertMaterial({ map: paperTex, side: THREE.DoubleSide, color: [0xffffff, 0xffb0b0, 0xb0d0ff][i % 3] }), srand(-3.5, 3.5), srand(2.2, 3.2), srand(-1, 2.4), t); swayers.push({ o: p, base: 0, ph: srand(0, TAU), amp: 0.2 }); }
    g.add(t);
  }
  function tombstone(g, x, z, s = 1) {
    const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.set(srand(-0.06, 0.06), srand(-0.3, 0.3), srand(-0.08, 0.08));
    box(t, 0.6 * s, 0.9 * s, 0.14, 0x5e5c58, 0, 0.45 * s, 0);
    mesh(new THREE.CylinderGeometry(0.3 * s, 0.3 * s, 0.14, 12, 1, false, 0, Math.PI), gMat(0x5e5c58), 0, 0.9 * s, 0, t).rotation.set(Math.PI / 2, 0, Math.PI / 2);
    box(t, 0.9 * s, 0.12, 1.4 * s, 0x4a4844, 0, 0.06, 0.65 * s);
    g.add(t);
  }
  function shrine(g, x, z, s = 1) {   // miếu hoang
    const m = new THREE.Group(); m.position.set(x, 0, z); m.scale.setScalar(s);
    box(m, 2.6, 0.4, 2.2, 0x4a4640, 0, 0.2, 0);
    box(m, 2.2, 1.6, 0.12, 0x6a5a48, 0, 1.2, -0.95); box(m, 0.12, 1.6, 1.9, 0x6a5a48, -1.05, 1.2, 0); box(m, 0.12, 1.6, 1.9, 0x6a5a48, 1.05, 1.2, 0);
    for (const sx of [-1, 1]) cyl(m, 0.08, 0.08, 1.7, 0x7a2a1a, sx * 0.95, 1.2, 0.95, 8);
    const roof = mesh(new THREE.ConeGeometry(2.1, 1.0, 4), gMat(0x4a2a1e), 0, 2.45, 0, m); roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 1);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const c = mesh(new THREE.ConeGeometry(0.08, 0.35, 5), gMat(0x4a2a1e), sx * 1.45, 2.1, sz * 1.45, m); c.rotation.set(sz * 0.6, 0, -sx * 0.6); }   // đầu đao cong
    box(m, 1.0, 0.6, 0.5, 0x5a1a14, 0, 0.7, -0.5);
    const glow = glowSprite(m, 0xff4a1a, 0, 1.1, -0.45, 1.1);
    for (let i = -1; i <= 1; i++) glowSprite(m, 0xff7a2a, i * 0.08, 1.12, -0.25, 0.12);
    g.add(m);
    return glow;
  }
  function bamboo(g, x, z, n = 10) {
    const c = new THREE.Group(); c.position.set(x, 0, z);
    for (let i = 0; i < n; i++) {
      const h = srand(6, 10), lean = srand(-0.12, 0.12);
      const geo = new THREE.CylinderGeometry(0.04, 0.06, h, 6); geo.translate(0, h / 2, 0);
      const b = mesh(geo, gMat(srand() < 0.2 ? 0x8a8a4a : 0x5a7a3a), srand(-0.6, 0.6), 0, srand(-0.6, 0.6), c);
      b.rotation.set(lean, 0, srand(-0.12, 0.12));
      for (let k = 0; k < 5; k++) { const lf = mesh(new THREE.PlaneGeometry(0.9, 1.6), gMat(0x4a6a30, { map: leafTex, side: THREE.DoubleSide, alphaTest: 0.5 }), 0, h * srand(0.6, 1), 0, b); lf.rotation.set(srand(-1.2, -0.4), srand(0, TAU), 0); swayers.push({ o: lf, base: lf.rotation.x, ph: srand(0, TAU), amp: 0.06 }); }
    }
    g.add(c);
  }
  function lantern(g, x, y, z, color = 0xff3a1a) {
    cyl(g, 0.006, 0.006, 0.6, 0x222222, x, y + 0.45, z, 3);
    const b = mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshBasicMaterial({ color }), x, y, z, g); b.scale.y = 1.25;
    return glowSprite(g, color, x, y, z, 1.2);
  }
  function stall(g, x, z, ry) {   // sạp chợ
    const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(s, 0.05, 0.05, sz < 0 ? 2.4 : 2.0, 0x3a2a1a, sx * 1.1, sz < 0 ? 1.2 : 1.0, sz * 0.8, 6);
    const roof = mesh(new THREE.PlaneGeometry(2.6, 2.0), gMat(0x6a5a30, { side: THREE.DoubleSide }), 0, 2.25, 0, s); roof.rotation.x = -Math.PI / 2 + 0.25;
    box(s, 2.0, 0.08, 1.2, 0x4a3a28, 0, 0.8, 0);
    for (let i = 0; i < 3; i++) cyl(s, 0.22, 0.18, 0.22, 0x7a6038, -0.6 + i * 0.6, 0.95, 0, 10);
    g.add(s);
    return lantern(g, x + Math.cos(ry) * 0.9, 1.75, z - Math.sin(ry) * 0.9, srand() < 0.5 ? 0xff3a1a : 0xffa020);
  }
  function house(g, x, z, w = 9) {   // nhà hoang
    const h = new THREE.Group(); h.position.set(x, 0, z);
    box(h, w, 3.2, 4, 0x3a3028, 0, 1.6, 0);
    const shape = new THREE.Shape(); shape.moveTo(-w / 2 - 0.5, 0); shape.lineTo(w / 2 + 0.5, 0); shape.lineTo(0, 2.2); shape.closePath();
    const roof = mesh(new THREE.ExtrudeGeometry(shape, { depth: 4.6, bevelEnabled: false }), gMat(0x2a1e18), 0, 3.2, -2.3, h);
    const wins = [];
    for (const wx of [-w * 0.32, w * 0.32]) { const wn = mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ color: 0x050505 }), wx, 1.9, 2.01, h); wins.push(wn); box(h, 1.1, 0.08, 0.1, 0x2a2018, wx, 1.9, 2.05); }
    mesh(new THREE.PlaneGeometry(1.1, 2.0), new THREE.MeshBasicMaterial({ color: 0x000000 }), 0, 1.0, 2.01, h);
    const door = box(h, 0.55, 2.0, 0.06, 0x4a3a2a, -0.35, 1.0, 2.25); door.rotation.y = -0.9;
    for (const px of [-w / 2 + 0.4, w / 2 - 0.4]) cyl(h, 0.08, 0.08, 3.2, 0x3a2a1a, px, 1.6, 2.6, 6);
    g.add(h);
    return wins;
  }
  function swing(g, x, z) {   // xích đu tự đung đưa
    deadTree(g, x, z);
    const pv = new THREE.Group(); pv.position.set(x + 0.9, 2.6, z + 0.2); g.add(pv);
    for (const sx of [-1, 1]) mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.9, 3), gMat(0x8a7a5a), sx * 0.3, -0.95, 0, pv);
    box(pv, 0.8, 0.05, 0.3, 0x4a3a28, 0, -1.9, 0);
    return pv;
  }
  function rails(g, z0) {
    const wood = gMat(0x2a2018), steel = new THREE.MeshStandardMaterial({ color: 0x6a6e74, metalness: 0.8, roughness: 0.4 });
    for (const dz of [-0.55, 0.55]) mesh(new THREE.BoxGeometry(80, 0.1, 0.08), steel, L.x, 0.16, z0 + dz, g);
    for (let x = -40; x <= 40; x += 0.7) { const s = mesh(new THREE.BoxGeometry(0.22, 0.1, 1.6), wood, L.x + x, 0.06, z0, g); s.rotation.y = srand(-0.05, 0.05); }
    const bed = mesh(new THREE.BoxGeometry(80, 0.06, 2.4), gMat(0x3a3632), L.x, 0.03, z0, g);
  }
  function signal(g, x, z) {
    cyl(g, 0.06, 0.08, 4, 0x2a2a2a, x, 2, z, 6);
    box(g, 0.5, 0.9, 0.2, 0x111111, x, 3.8, z + 0.05);
    return glowSprite(g, 0xff2010, x, 4.0, z + 0.2, 0.9);
  }
  function wagon(g, x, z) {
    const w = new THREE.Group(); w.position.set(x, 0, z); w.rotation.set(0, 0.15, 0.12);
    box(w, 7, 2.6, 2.6, 0x4a2a1e, 0, 1.8, 0);
    for (let i = -2; i <= 2; i++) mesh(new THREE.PlaneGeometry(0.7, 0.6), new THREE.MeshBasicMaterial({ color: 0x050505 }), i * 1.3, 2.2, 1.31, w);
    for (const sx of [-2.5, 2.5]) for (const sz of [-1, 1]) { const wh = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.15, 12), gMat(0x1a1a1a), sx, 0.45, sz * 1.15, w); wh.rotation.x = Math.PI / 2; }
    g.add(w);
  }
  function dinhHall(g, x, z) {   // đình làng: mái cong, cột đỏ, bậc đá
    const d = new THREE.Group(); d.position.set(x, 0, z);
    box(d, 14, 0.7, 7, 0x4a4640, 0, 0.35, 0); box(d, 4, 0.35, 1.2, 0x55514a, 0, 0.18, 4);
    for (let i = -3; i <= 3; i++) for (const sz of [-2.6, 2.6]) cyl(d, 0.18, 0.2, 3.2, 0x6a1a14, i * 2, 2.3, sz, 10);
    box(d, 13, 2.4, 0.15, 0x3a3028, 0, 2.1, -2.8);
    const roof = mesh(new THREE.ConeGeometry(9, 2.6, 4), gMat(0x3a2418), 0, 5.0, 0, d); roof.rotation.y = Math.PI / 4; roof.scale.set(1.25, 1, 0.65);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const c = mesh(new THREE.ConeGeometry(0.2, 1.2, 5), gMat(0x3a2418), sx * 7.6, 4.3, sz * 3.8, d); c.rotation.set(sz * 0.9, 0, -sx * 0.9); }
    const glow = glowSprite(d, 0xff5020, 0, 2.0, -2.5, 3);
    g.add(d);
    // trống đình
    const drum = new THREE.Group(); drum.position.set(x - 9, 0, z + 4); drum.rotation.y = 0.5;
    for (const sx of [-1, 1]) cyl(drum, 0.06, 0.06, 1.8, 0x3a2a1a, sx * 0.8, 0.9, 0, 6);
    const dr = mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.1, 18), gMat(0x7a1a14), 0, 1.4, 0, drum); dr.rotation.z = Math.PI / 2;
    g.add(drum);
    for (const sx of [-1, 1]) { cyl(g, 0.25, 0.3, 1.2, 0x6a6660, x + sx * 4.5, 0.6, z + 5.5, 8); glowSprite(g, 0xffa040, x + sx * 4.5, 1.3, z + 5.5, 0.6); }
    return glow;
  }
  function boat(g, x, z) {   // thuyền nan / đò
    const b = new THREE.Group(); b.position.set(x, 0.05, z); b.rotation.y = 0.35;
    const pts = []; for (let i = 0; i <= 8; i++) { const a = i / 8; pts.push(new THREE.Vector2(Math.sin(a * Math.PI) * 0.7 + 0.01, (a - 0.5) * 4.6)); }
    const hull = mesh(new THREE.LatheGeometry(pts, 12, Math.PI / 2, Math.PI), gMat(0x3a2a1a, { side: THREE.DoubleSide }), 0, 0.3, 0, b);
    hull.rotation.x = Math.PI / 2;
    const cover = mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.6, 12, 1, true, 0, Math.PI), gMat(0x5a4a2a, { side: THREE.DoubleSide }), 0, 0.35, 0, b); cover.rotation.x = Math.PI / 2; cover.rotation.y = Math.PI / 2;
    const l = lantern(b, 0, 1.3, 1.6, 0xffa020);
    g.add(b);
    return { b, l };
  }

  // ---------------- chỗ ngồi theo từng cảnh ----------------
  // lửa luôn ở gốc toạ độ; mỗi cảnh tự bày chỗ ngồi (khúc gỗ, bó rơm, bậc đá, ghế băng…) và góc máy riêng
  const FIRE = new THREE.Vector3(0, 0, 0);
  const SEAT_H = 0.3;   // chiều cao mặt ngồi vừa chân nhân vật
  const seat = (x, h, z, zone, pose = 'sit', face = FIRE) => ({ p: new THREE.Vector3(x, h, z), pose, zone, face });
  const polar = (r, deg) => [Math.sin(deg * Math.PI / 180) * r, Math.cos(deg * Math.PI / 180) * r];   // 0° = phía máy quay
  const sideName = x => (x < -0.8 ? 'bên trái' : x > 0.8 ? 'bên phải' : 'chính giữa');
  const backName = z => (z < -0.5 ? 'phía sau đống lửa' : 'phía trước đống lửa');
  function logSeat(g, x, z, len, ang, kind = 'log', zone) {
    const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = ang;
    if (kind === 'bamboo') {
      for (const [dy, dz] of [[0.08, -0.085], [0.08, 0.085], [0.22, 0]]) { const c = mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 7), gMat(0x8a9450), 0, dy, dz, grp); c.rotation.z = Math.PI / 2; }
      for (const lx of [-len / 3, len / 3]) { const tie = mesh(new THREE.TorusGeometry(0.17, 0.02, 4, 10), gMat(0x5a4a2a), lx, 0.13, 0, grp); tie.rotation.y = Math.PI / 2; }
    } else {
      const r = kind === 'root' ? 0.2 : 0.16;
      const col = kind === 'banana' ? 0x8a8a62 : kind === 'root' ? 0x3e3a30 : 0x6a5640;
      const c = mesh(new THREE.CylinderGeometry(r * 0.88, r, len, 10), gMat(col, kind === 'root' ? {} : { map: trunkTex }), 0, r - 0.03, 0, grp); c.rotation.z = Math.PI / 2;
      for (const sx of [-1, 1]) { const end = mesh(new THREE.CircleGeometry(r * (sx < 0 ? 0.88 : 1), 10), gMat(kind === 'banana' ? 0xc8c09a : 0x9a7a52), sx * len / 2 + sx * 0.002, r - 0.03, 0, grp); end.rotation.y = sx * Math.PI / 2; }
      if (kind === 'log') for (let i = 0; i < 2; i++) { const st = mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.35, 5), gMat(0x4a3a28), srand(-len / 3, len / 3), r + 0.1, srand(-0.05, 0.05), grp); st.rotation.set(srand(-0.6, 0.6), 0, srand(-0.8, 0.8)); }
    }
    g.add(grp);
    const out = [], n = Math.max(1, Math.floor((len - 0.2) / 0.62)), step = (len - 0.2) / n;
    for (let i = 0; i < n; i++) { const lx = -len / 2 + 0.1 + step * (i + 0.5); const wx = x + lx * Math.cos(ang), wz = z - lx * Math.sin(ang); out.push(seat(wx, SEAT_H, wz, zone || `trên ${kind === 'banana' ? 'thân chuối đổ' : kind === 'bamboo' ? 'bó tre' : kind === 'root' ? 'rễ cây đa' : 'khúc gỗ đổ'} ${sideName(wx)}`)); }
    return out;
  }
  function baleSeat(g, x, z) { const b = mesh(new THREE.CylinderGeometry(0.3, 0.32, SEAT_H, 12), gMat(0xa08a48), x, SEAT_H / 2, z, g); b.rotation.y = srand(0, TAU); mesh(new THREE.TorusGeometry(0.31, 0.015, 4, 14), gMat(0x6a5a2a), x, SEAT_H * 0.55, z, g).rotation.x = Math.PI / 2; return seat(x, SEAT_H, z, `trên bó rơm ${sideName(x)} ${backName(z)}`); }
  function rockSeat(g, x, z, s = 1) { const r = mesh(new THREE.DodecahedronGeometry(0.32 * s, 0), gMat(0x5a5650), x, SEAT_H * 0.5, z, g); r.scale.set(1.1, SEAT_H / (0.6 * s), 1); r.rotation.y = srand(0, TAU); return seat(x, SEAT_H, z, `trên tảng đá ${sideName(x)} ${backName(z)}`); }
  function stumpSeat(g, x, z, zone) { mesh(new THREE.CylinderGeometry(0.22, 0.27, SEAT_H, 10), gMat(0x5a4632, { map: trunkTex }), x, SEAT_H / 2, z, g); mesh(new THREE.CircleGeometry(0.22, 10), gMat(0xa0805a), x, SEAT_H + 0.002, z, g).rotation.x = -Math.PI / 2; return seat(x, SEAT_H, z, zone || `trên gốc cây ${sideName(x)}`); }
  function stoolSeat(g, x, z, zone) { box(g, 0.38, 0.05, 0.38, 0x4a3422, x, SEAT_H - 0.025, z); for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 0.02, 0.02, SEAT_H, 0x3a2a1a, x + sx * 0.15, SEAT_H / 2, z + sz * 0.15, 4); return seat(x, SEAT_H, z, zone || `trên ghế đẩu ${sideName(x)}`); }
  function benchSeats(g, x, z, len, ang, zone) {
    const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = ang; g.add(grp);
    box(grp, len, 0.05, 0.34, 0x5a4230, 0, SEAT_H - 0.025, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(grp, 0.025, 0.025, SEAT_H, 0x3a2a1a, sx * (len / 2 - 0.12), SEAT_H / 2, sz * 0.12, 4);
    const out = [], n = Math.max(1, Math.floor(len / 0.6)), step = len / n;
    for (let i = 0; i < n; i++) { const lx = -len / 2 + step * (i + 0.5); const wx = x + lx * Math.cos(ang), wz = z - lx * Math.sin(ang); out.push(seat(wx, SEAT_H, wz, zone || `trên ghế băng ${sideName(wx)}`)); }
    return out;
  }
  function stepRows(g, cx, cz, width, n, color = 0x5a5650, label = 'bậc đá') {   // bậc thềm: hàng sau cao hơn, ai cũng nhìn ra đống lửa
    const out = [];
    for (let i = 0; i < n; i++) {
      const h = SEAT_H * (i + 1), z = cz - i * 0.5;
      box(g, width, h, 0.5, color, cx, h / 2, z);
      const k = Math.max(1, Math.floor(width / 0.62));
      for (let j = 0; j < k; j++) { const x = cx - width / 2 + (j + 0.5) * width / k; out.push(seat(x, h, z + 0.05, `trên ${label} thứ ${i + 1} ${sideName(x)}`)); }
    }
    return out;
  }
  function matSeat(g, x, z, zone) { const m = mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshLambertMaterial({ map: matTex, color: 0xb8a890 }), x, 0.01, z, g); m.rotation.x = -Math.PI / 2; return seat(x, 0, z, zone || `trên chiếu nhỏ ${sideName(x)}`, 'ground'); }
  // lấp đủ chỗ: ngồi bệt dưới đất theo vòng ngoài
  function groundFill(seats, need, r0, block) {
    for (let r = r0; seats.length < need && r < r0 + 10; r += 0.68) {
      const n = Math.floor(TAU * r / 0.66);
      for (let i = 0; i < n && seats.length < need; i++) {
        const a = (i + (Math.round(r * 10) % 2) * 0.5) / n * TAU;
        const x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (block && block(x, z)) continue;
        if (seats.some(s => Math.hypot(s.p.x - x, s.p.z - z) < 0.58)) continue;
        seats.push(seat(x, 0, z, `ngồi bệt dưới đất ${sideName(x)} ${backName(z)}`, 'ground'));
      }
    }
    return seats;
  }
  // ghế có đồ vật (gỗ, bậc, ghế) được xếp người trước, ngồi bệt dưới đất sau
  const byDist = seats => seats.sort((a, b) => (Math.hypot(a.p.x, a.p.z) + (a.pose === 'ground' ? 2.2 : 0)) - (Math.hypot(b.p.x, b.p.z) + (b.pose === 'ground' ? 2.2 : 0)));

  const SCENES = {
    dong: { name: 'Giữa đồng lúa', fog: 0.03, build(g) {
      const dike = (x0, z0, len, rot) => box(g, len, SEAT_H, 0.8, 0x2e2418, x0, SEAT_H / 2, z0, rot);
      dike(0, -4.2, 40, 0); dike(9, -12, 30, Math.PI / 2); dike(-9, -12, 30, Math.PI / 2);
      field(g, { h: 0.75, r: 30, step: 0.42, jit: 0.08, clear: 7, fill: 0.95, hue: 0.17, color: 0x9aa060, skip: (x, z) => Math.abs(z + 4.2) < 0.7 || Math.abs(Math.abs(x) - 9) < 0.6 });
      scarecrow(g, 4.6, -9.5); const sc = scarecrowHead;
      grave(g, -5.5, -8.5); grave(g, -3.8, -9.6, 0.8); grave(g, -7.4, -10.5, 1.1);
      strawPile(g, 7.5, -6.5, 1.1); strawPile(g, -8.5, -5.5, 1.2); strawPile(g, 11, -15, 1.2); deadTree(g, -11, -14);
      for (const [x, z, h] of [[7, -13, 3.6], [8.2, -14.5, 3.2], [-13, -8, 3.6]]) bananaTree(g, x, z, h);
      const seats = [];
      for (let a = -150; a <= 150; a += 30) if (Math.abs(a) >= 30) { const [x, z] = polar(1.9, a); seats.push(baleSeat(g, x, z)); }
      for (let a = -160; a <= 160; a += 21) if (Math.abs(a) >= 25) { const [x, z] = polar(2.85, a); if (z > -3.6) seats.push(baleSeat(g, x, z)); }
      for (let x = -5.4; x <= 5.4; x += 0.62) seats.push(seat(x, SEAT_H, -4.2, `trên bờ ruộng phía sau ${sideName(x)}`));
      groundFill(seats, 80, 3.4, (x, z) => z < -3.6);
      return { seats: byDist(seats), teller: { x: -1.2, z: -0.75, kind: 'bale' }, cam: { yaw: 0.32, pitch: 0.5, fov: 50 },
        update: (t, y) => { const want = y > 0.65 && Math.sin(t * 0.21) > 0.2 ? 1.0 : 0; sc.head.rotation.y += (want - sc.head.rotation.y) * 0.02; for (const e of sc.eyes) e.material.color.setHex(want && y > 0.8 ? 0xff2a1a : 0x110000); } };
    } },
    chuoi: { name: 'Bụi chuối sau nhà', fog: 0.042, build(g) {
      ringGrass(g, 16, 0.5); field(g, { h: 0.4, r: 16, step: 0.5, jit: 0.2, clear: 6, fill: 0.5, hue: 0.22, color: 0x6a8040 });
      for (const [x, z] of ringPos(44, 6.5, 13)) bananaTree(g, x, z, srand(3.2, 4.6));
      for (const [x, z] of [[-6.6, 1], [6.8, 0.6], [-7.4, -2], [7.6, -2.6]]) bananaTree(g, x, z, srand(3.6, 4.4));
      well(g, -4.6, -5.8); hut(g, 8, -16); const win = hutWindow; fence(g, -13, -13, 13, -13);
      const seats = [];
      for (const a of [62, 120, 180, 240, 298]) { const [x, z] = polar(2.25, a); seats.push(...logSeat(g, x, z, 2.2, a * Math.PI / 180, 'banana')); }
      for (let i = 0; i < 7; i++) { const a = 45 + i * 45; const [x, z] = polar(3.5, a); seats.push(...logSeat(g, x, z, 2.4, a * Math.PI / 180, 'banana')); }
      groundFill(seats, 80, 4.3);
      return { seats: byDist(seats), teller: { x: 1.25, z: -0.9, kind: 'stump' }, cam: { yaw: -0.22, pitch: 0.55, fov: 50 },
        update: (t, y) => win.material.color.setHex(y > 0.6 && Math.sin(t * 0.5) > 0.6 ? 0xff5a20 : 0x331a08) };
    } },
    rungtre: { name: 'Rừng tre', fog: 0.048, build(g) {
      field(g, { h: 0.4, r: 16, step: 0.55, jit: 0.2, clear: 5.6, fill: 0.45, hue: 0.22, color: 0x5a6a30 });
      for (const [x, z] of ringPos(26, 6.5, 15)) bamboo(g, x, z, Math.round(srand(7, 13)));
      for (const [x, z] of [[-7, 0], [7.2, -0.5], [-8, -2.5], [8.2, -3]]) bamboo(g, x, z, 9);
      const seats = [];
      seats.push(...logSeat(g, 0, -2.5, 4, 0, 'bamboo', 'trên bó tre phía sau đống lửa'));
      seats.push(...logSeat(g, -2.6, -0.3, 3.4, Math.PI / 2, 'bamboo', 'trên bó tre bên trái'));
      seats.push(...logSeat(g, 2.6, -0.3, 3.4, Math.PI / 2, 'bamboo', 'trên bó tre bên phải'));
      seats.push(...logSeat(g, 0, -3.7, 6, 0, 'log', 'trên khúc gỗ hàng sau'));
      seats.push(...logSeat(g, -3.8, 0, 4, Math.PI / 2, 'log')); seats.push(...logSeat(g, 3.8, 0, 4, Math.PI / 2, 'log'));
      for (const [x, z] of [[-1.7, 1.9], [1.7, 1.9], [-3.1, 2.4], [3.1, 2.4]]) seats.push(rockSeat(g, x, z));
      groundFill(seats, 80, 4.6);
      return { seats: byDist(seats), teller: { x: 1.3, z: -1.25, kind: 'rock' }, cam: { yaw: 0.5, pitch: 0.42, fov: 52 } };
    } },
    gieng: { name: 'Giếng cổ đầu làng', fog: 0.036, build(g) {
      paved(g, 7, 6); ringGrass(g, 18, 0.35);
      const w = bigWell(g, -2.8, -2.6);
      flowerTree(g, 4.6, -6.5, 3.6); flowerTree(g, -8, -4, 3); waterJar(g, -5.2, -4.6); waterJar(g, -5.9, -3.9, 0.8); waterJar(g, 6, -3, 0.9);
      fence(g, -12, -11, 12, -11); for (const [x, z] of ringPos(10, 9, 14)) bananaTree(g, x, z, srand(3.2, 4.2));
      const seats = [];
      mesh(new THREE.CylinderGeometry(1.65, 1.7, SEAT_H, 24), gMat(0x55514a), -2.8, SEAT_H / 2, -2.6, g);   // bệ đá quanh giếng
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; const x = -2.8 + Math.sin(a) * 1.42, z = -2.6 + Math.cos(a) * 1.42; seats.push(seat(x, SEAT_H, z, 'trên bệ giếng')); }
      for (const a of [150, 100, 55, -60]) { const [x, z] = polar(2.6, a); seats.push(...benchSeats(g, x, z, 2.0, a * Math.PI / 180, `trên ghế đá ${sideName(x)}`)); }
      groundFill(seats, 80, 3.2, (x, z) => Math.hypot(x + 2.8, z + 2.6) < 1.9);
      return { seats: byDist(seats), teller: { x: -1.25, z: -1.35, kind: 'stool' }, cam: { yaw: -0.45, pitch: 0.5, fov: 50 },
        update: (t, y) => { w.rope.rotation.z = Math.sin(t * 0.7) * (0.05 + y * 0.25); } };
    } },
    cayda: { name: 'Gốc đa nghìn năm', fog: 0.038, build(g) {
      ringGrass(g, 18, 0.4); banyan(g, 0, -6.2);
      for (const [x, z] of ringPos(8, 10, 16, (x) => Math.abs(x) > 6)) bananaTree(g, x, z, srand(3.2, 4));
      grave(g, -7, -5.5, 0.8); deadTree(g, 8.5, -4.5);
      const seats = [];
      for (const a of [-58, -32, -10, 12, 34, 58]) { const ar = a * Math.PI / 180; const x = Math.sin(ar) * 3.4, z = -6.2 + Math.cos(ar) * 3.4; seats.push(...logSeat(g, x, z, 2.2, ar + Math.PI / 2, 'root', `trên rễ cây đa ${sideName(x)}`)); }
      for (const [x, z] of [[-2.2, -0.6], [2.2, -0.6], [-2.6, 1.2], [2.6, 1.2], [-1.4, 1.9], [1.4, 1.9], [-3.6, -1.5], [3.6, -1.5]]) seats.push(rockSeat(g, x, z, 1.1));
      groundFill(seats, 80, 3.3, (x, z) => z < -2.4 && Math.abs(x) < 3);
      return { seats: byDist(seats), teller: { x: -1.3, z: -1.0, kind: 'root' }, cam: { yaw: 0, pitch: 0.34, fov: 54 } };
    } },
    nghiadia: { name: 'Nghĩa địa làng', fog: 0.045, build(g) {
      ringGrass(g, 20, 0.5, 0x5a6a38, 0.5);
      for (let row = 0; row < 3; row++) for (let i = -6; i <= 6; i++) { const x = i * 2 + srand(-0.3, 0.3), z = -8 - row * 2.6 + srand(-0.3, 0.3); if (srand() < 0.15) continue; if (srand() < 0.5) tombstone(g, x, z, srand(0.8, 1.2)); else grave(g, x, z, srand(0.6, 0.9)); }
      flowerTree(g, -6, -13, 3.8); flowerTree(g, 7, -14, 3.4); deadTree(g, 10, -8); house(g, -1, -20, 5);
      const seats = [];
      for (let row = 0; row < 4; row++) for (const sx of [-1, 1]) { const z = -2.1 - row * 1.15, x = sx * (1.9 + row * 0.25); seats.push(...benchSeats(g, x, z, 2.6 + row * 0.4, 0, `trên bệ mộ hàng ${row + 1} ${sx < 0 ? 'bên trái' : 'bên phải'}`)); tombstone(g, x, z - 0.45, 0.7); }
      for (const [x, z] of [[-2.4, 0.6], [2.4, 0.6], [-1.6, 1.8], [1.6, 1.8]]) { grave(g, x, z + 0.3, 0.45); seats.push(seat(x, SEAT_H, z, `trên nấm mộ ${sideName(x)}`)); }
      groundFill(seats, 80, 3.0, (x, z) => z < -1.4);
      return { seats: byDist(seats), teller: { x: -1.2, z: -0.9, kind: 'stool' }, cam: { yaw: 0.25, pitch: 0.62, fov: 48 } };
    } },
    mieu: { name: 'Miếu hoang ven rừng', fog: 0.042, build(g) {
      ringGrass(g, 18, 0.55, 0x5a7038, 0.5);
      const glow = shrine(g, 0, -7.6, 1.3);
      for (const [x, z] of ringPos(14, 8, 15, (x, z) => Math.hypot(x, z + 7.6) > 3.5)) (srand() < 0.5 ? deadTree : bananaTree)(g, x, z, srand(3.2, 4.2));
      flowerTree(g, 4.8, -8.5);
      const seats = stepRows(g, 0, -3.3, 6.8, 4, 0x55514a, 'bậc đá trước miếu');
      seats.push(...benchSeats(g, -3.9, -1.2, 2.4, Math.PI / 2 - 0.4)); seats.push(...benchSeats(g, 3.9, -1.2, 2.4, -Math.PI / 2 + 0.4));
      groundFill(seats, 80, 2.4, (x, z) => z < -2.9);
      return { seats: byDist(seats), teller: { x: -1.5, z: -1.0, kind: 'stool' }, cam: { yaw: 0.05, pitch: 0.36, fov: 52 },
        update: (t, y) => { glow.material.opacity = 0.5 + Math.sin(t * 7) * 0.15 + (y > 0.7 && Math.sin(t * 0.9) > 0.8 ? 0.4 : 0); } };
    } },
    bendo: { name: 'Bến đò đêm', fog: 0.034, build(g) {
      const water = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), new THREE.MeshStandardMaterial({ color: 0x0a1626, metalness: 0.7, roughness: 0.2 }));
      water.rotation.x = -Math.PI / 2; water.position.set(0, 0.02, -4.4 - 60); g.add(water);
      const moonPath = glowSprite(g, 0x9fb0e0, 5, 0.05, -24, 1); moonPath.scale.set(3, 14, 1); moonPath.material.opacity = 0.35;
      field(g, { h: 1.3, r: 16, step: 0.35, jit: 0.15, clear: 5, fill: 0.85, hue: 0.16, color: 0x8a8a58, skip: (x, z) => z < -5 || z > -3.9 || Math.abs(x) < 4.6 });
      for (const [x, z] of [[-9, 0], [9.5, 0.5], [8, -2.5]]) bananaTree(g, x, z, 3.8);
      const seats = [];
      box(g, 9.4, 0.08, 1.4, 0x4a3a28, 0, SEAT_H, -3.8);   // cầu tàu
      for (let i = -4; i <= 4; i++) for (const dz of [-0.6, 0.6]) cyl(g, 0.07, 0.07, 0.9, 0x2a2018, i * 1.15, 0.1, -3.8 + dz, 6);
      for (let x = -4.4; x <= 4.4; x += 0.62) seats.push(seat(x, SEAT_H + 0.04, -3.35, `trên cầu tàu ${sideName(x)}`));
      const bt = boat(g, -5.6, -6.2); const bt2 = boat(g, 4.8, -6.6);
      seats.push(...logSeat(g, -3.4, 0.2, 2.6, Math.PI / 2 - 0.3)); seats.push(...logSeat(g, 3.4, 0.2, 2.6, -Math.PI / 2 + 0.3));
      for (const [x, z] of [[-1.8, 1.6], [1.8, 1.6], [-2.2, -1.6], [2.2, -1.6]]) seats.push(rockSeat(g, x, z));
      groundFill(seats, 80, 3.2, (x, z) => z < -2.7);
      return { seats: byDist(seats), teller: { x: 1.4, z: -1.2, kind: 'stump' }, cam: { yaw: 0.6, pitch: 0.42, fov: 52 },
        update: t => { for (const b of [bt, bt2]) { b.b.position.y = 0.05 + Math.sin(t * 1.1 + b.b.position.x) * 0.04; b.b.rotation.z = Math.sin(t * 0.8 + b.b.position.x) * 0.03; } moonPath.material.opacity = 0.3 + Math.sin(t * 2) * 0.06; } };
    } },
    choma: { name: 'Chợ ma nửa đêm', fog: 0.042, build(g) {
      ringGrass(g, 16, 0.25);
      const lamps = [];
      [[-7.5, -3.5, 0.9], [-6, -7.5, 0.4], [-2, -9.5, 0.1], [3.5, -9.5, -0.1], [6.8, -7, -0.4], [8, -3.2, -0.9]].forEach(([x, z, ry]) => lamps.push(stall(g, x, z, ry)));
      for (let i = 0; i < 40; i++) { const p = mesh(new THREE.PlaneGeometry(0.15, 0.08), new THREE.MeshLambertMaterial({ color: 0xc9a23a, side: THREE.DoubleSide }), srand(-8, 8), 0.02, srand(-8, 3), g); p.rotation.set(-Math.PI / 2, 0, srand(0, TAU)); }
      for (const [x, z] of ringPos(8, 12, 16)) deadTree(g, x, z);
      const seats = [];
      seats.push(...benchSeats(g, 0, -2.5, 4.2, 0, 'trên ghế chợ phía sau')); seats.push(...benchSeats(g, -2.6, -0.2, 3.4, Math.PI / 2, 'trên ghế chợ bên trái')); seats.push(...benchSeats(g, 2.6, -0.2, 3.4, Math.PI / 2, 'trên ghế chợ bên phải'));
      seats.push(...benchSeats(g, 0, -3.7, 6, 0, 'trên ghế chợ hàng sau')); seats.push(...benchSeats(g, -3.8, 0.4, 4.2, Math.PI / 2, 'trên ghế chợ hàng ngoài bên trái')); seats.push(...benchSeats(g, 3.8, 0.4, 4.2, Math.PI / 2, 'trên ghế chợ hàng ngoài bên phải'));
      groundFill(seats, 80, 4.4);
      return { seats: byDist(seats), teller: { x: 1.25, z: -0.9, kind: 'stool' }, cam: { yaw: -0.3, pitch: 0.5, fov: 50 },
        update: (t, y) => lamps.forEach((l, i) => { l.material.opacity = 0.6 + Math.sin(t * 6 + i * 2) * 0.15 - (y > 0.75 && Math.sin(t * 3 + i) > 0.7 ? 0.5 : 0); }) };
    } },
    duongray: { name: 'Đường ray bỏ hoang', fog: 0.04, build(g) {
      field(g, { h: 0.5, r: 18, step: 0.55, jit: 0.2, clear: 5, fill: 0.45, hue: 0.22, color: 0x5a6a38, skip: (x, z) => Math.abs(z + 4.6) < 1.4 });
      rails(g, -4.6); const sig = signal(g, 6.5, -3); wagon(g, -9.5, -8);
      for (let i = 0; i < 14; i++) cyl(g, 0.06, 0.06, 1.6, 0x2a2a2a, -18 + i * 2.8, 0.8, -7, 5);
      for (const [x, z] of ringPos(8, 12, 18, (x, z) => Math.abs(z + 4.6) > 2)) deadTree(g, x, z);
      const pile = (x, z, len, ang, zone) => { const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = ang; g.add(grp); for (let k = 0; k < 3; k++) box(grp, len, 0.1, 0.25, 0x2a2018, 0, 0.05 + k * 0.1, (k - 1) * 0.06); return benchSeats(new THREE.Group(), x, z, len, ang, zone); };
      const seats = [];
      for (let x = -5; x <= 5; x += 0.62) seats.push(seat(x, SEAT_H, -3.95, `trên đường ray ${sideName(x)}`));
      seats.push(...pile(-2.2, -2.2, 2.6, 0.2, 'trên chồng tà vẹt bên trái')); seats.push(...pile(2.2, -2.2, 2.6, -0.2, 'trên chồng tà vẹt bên phải'));
      seats.push(...pile(-3.3, 0.4, 2.6, Math.PI / 2 - 0.3)); seats.push(...pile(3.3, 0.4, 2.6, -Math.PI / 2 + 0.3));
      groundFill(seats, 80, 3.6, (x, z) => z < -3.3);
      return { seats: byDist(seats), teller: { x: -1.1, z: -1.15, kind: 'stool' }, cam: { yaw: 0.15, pitch: 0.34, fov: 56 },
        update: t => { sig.material.opacity = Math.sin(t * 2.2) > 0 ? 0.9 : 0.15; } };
    } },
    nhahoang: { name: 'Sân nhà hoang', fog: 0.042, build(g) {
      ringGrass(g, 16, 0.55, 0x5a7038, 0.5);
      const wins = house(g, 0, -7.6, 10);
      const seats = stepRows(g, 0, -5.2, 6, 3, 0x4a443c, 'bậc thềm nhà');
      const sw = swing(g, -7.5, -3.5);
      for (const [x, z] of ringPos(8, 9, 15, (x) => Math.abs(x) > 6)) bananaTree(g, x, z, srand(3, 4));
      waterJar(g, 5.6, -4.6);
      for (const [x, z] of [[-2.3, -1.6], [2.3, -1.6], [-2.8, 0.2], [2.8, 0.2], [-2.2, 1.8], [2.2, 1.8], [-3.6, -2.4], [3.6, -2.4]]) seats.push(stoolSeat(g, x, z, `trên ghế gãy ${sideName(x)}`));
      groundFill(seats, 80, 3.0, (x, z) => z < -4.2);
      return { seats: byDist(seats), teller: { x: 1.3, z: -1.0, kind: 'stool' }, cam: { yaw: -0.15, pitch: 0.42, fov: 52 },
        update: (t, y) => { sw.rotation.x = Math.sin(t * 1.4) * (0.15 + y * 0.35); wins.forEach((w, i) => w.material.color.setHex(y > 0.5 && Math.sin(t * 0.37 + i * 2) > 0.85 ? 0x6a5a40 : 0x050505)); } };
    } },
    dinh: { name: 'Sân đình làng', fog: 0.036, build(g) {
      paved(g, 9, 8);
      const glow = dinhHall(g, 0, -11);
      banyan(g, 11.5, -8); flowerTree(g, -9, -6, 3.4);
      const seats = [];
      // ông kể chuyện ngồi trước thềm đình, mọi người ngồi chiếu nhỏ thành hàng trước mặt
      for (let row = 0; row < 6; row++) for (let i = 0; i < 7 + row; i++) { const x = (i - (6 + row) / 2) * 0.68, z = 0.9 + row * 0.75; seats.push(matSeat(g, x, z, `trên chiếu hàng ${row + 1} ${sideName(x)}`)); }
      seats.forEach(s => { s.face = new THREE.Vector3(0, 0, -1.6); });
      seats.push(...benchSeats(g, -3.4, -1.2, 2.4, Math.PI / 2 - 0.5, 'trên ghế băng bên trái')); seats.push(...benchSeats(g, 3.4, -1.2, 2.4, -Math.PI / 2 + 0.5, 'trên ghế băng bên phải'));
      groundFill(seats, 80, 4.6);
      return { seats: byDist(seats), teller: { x: 0, z: -1.6, kind: 'stool' }, cam: { yaw: 0.75, pitch: 0.6, fov: 50 },
        update: (t, y) => { glow.material.opacity = 0.4 + Math.sin(t * 5) * 0.1 + (y > 0.7 ? 0.3 : 0); } };
    } },
  };
  const built = {};   // tên cảnh → { g, seats, teller, cam, update }

  // ---------------- ma trơi & đom đóm ----------------
  const wisps = [];
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color().setHSL(0.45 + srand(0, 0.12), 0.8, 0.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    s.scale.setScalar(0.5); scene.add(s);
    wisps.push({ s, a: srand(0, TAU), r: srand(7, 18), y: srand(0.5, 1.6), sp: srand(0.05, 0.15) * (srand() < 0.5 ? -1 : 1), ph: srand(0, TAU) });
  }
  const flies = [];
  for (let i = 0; i < 40; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xd8ff6a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    s.scale.setScalar(0.12); scene.add(s);
    flies.push({ s, x: L.x + srand(-12, 12), z: L.z + srand(-14, 0), y: srand(0.3, 1.6), ph: srand(0, TAU) });
  }

  // ---------------- ngọn đèn (ánh sáng toả quanh) ----------------
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 }));
  lampGlow.position.set(L.x, 0.8, L.z); lampGlow.scale.setScalar(3.2); scene.add(lampGlow);

  // ---------------- bóng đổ dưới chân người ngồi ----------------
  const CAP = 120;
  const shadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }), CAP);
  shadows.count = 0; shadows.frustumCulled = false; shadows.renderOrder = 1; scene.add(shadows);

  // ---------------- đống lửa củi 3D ----------------
  const fireG = new THREE.Group(); scene.add(fireG);
  {
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; const r = mesh(new THREE.DodecahedronGeometry(srand(0.13, 0.19), 0), gMat(0x4a4642), Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.62, fireG); r.scale.y = 0.7; r.rotation.set(srand(0, 3), srand(0, 3), 0); }
    const ash = mesh(new THREE.CircleGeometry(0.6, 20), new THREE.MeshBasicMaterial({ color: 0x2a1408 }), 0, 0.01, 0, fireG); ash.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 6; i++) {   // củi dựng chụm lại
      const a = i / 6 * TAU, lg = new THREE.CylinderGeometry(0.05, 0.065, 1.0, 7); lg.translate(0, 0.5, 0);
      const l = mesh(lg, gMat(0x3e2614, { map: trunkTex }), Math.cos(a) * 0.38, 0.02, Math.sin(a) * 0.38, fireG);
      l.rotation.set(Math.sin(a) * 0.75, 0, -Math.cos(a) * 0.75);
    }
  }
  const emberCore = mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff5a10 }), 0, 0.08, 0, fireG); emberCore.scale.y = 0.35;
  const flameU = { uTime: { value: 0 }, uPower: { value: 1 } };
  const flameMat = new THREE.ShaderMaterial({
    uniforms: flameU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; uniform float uPower; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * n(p); p *= 2.1; a *= 0.5; } return v; }
      void main(){
        float y = vUv.y, x = (vUv.x - 0.5) * 2.0;
        float t = fbm(vec2(x * 2.2, y * 3.2 - uTime * 2.6));
        float w = (1.0 - y * 0.9) * 0.95;
        float shape = 1.0 - smoothstep(0.0, 1.0, abs(x) / max(0.05, w) + y * 1.05 - t * 0.75);
        shape *= smoothstep(0.0, 0.06, y) * uPower;
        vec3 c = mix(vec3(1.0, 0.95, 0.65), vec3(1.0, 0.5, 0.12), smoothstep(0.0, 0.45, y));
        c = mix(c, vec3(0.75, 0.12, 0.03), smoothstep(0.45, 0.95, y));
        gl_FragColor = vec4(c * shape * 1.7, shape);
      }`,
  });
  const flames = [];
  for (let i = 0; i < 3; i++) { const f = mesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), flameMat, (i - 1) * 0.12, 0.05, (i - 1) * 0.05, fireG); f.renderOrder = 5; flames.push(f); }
  const EMB = 70, embPos = new Float32Array(EMB * 3), emb = [];
  for (let i = 0; i < EMB; i++) emb.push({ x: 0, y: -1, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });
  const embGeo = new THREE.BufferGeometry(); embGeo.setAttribute('position', new THREE.BufferAttribute(embPos, 3));
  const embers = new THREE.Points(embGeo, new THREE.PointsMaterial({ map: glowTex, color: 0xffa040, size: 0.09, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  embers.frustumCulled = false; scene.add(embers);
  function fireTick(t, dt, oil, flick) {
    const on = oil > 0 && flick > 0, pw = on ? 0.35 + oil / 100 * 0.75 : 0;
    flameU.uTime.value = t; flameU.uPower.value = on ? 1 : 0;
    flames.forEach((f, i) => {
      const hgt = (0.8 + pw * 1.1) * (0.92 + Math.sin(t * 9 + i * 2) * 0.08) * Math.min(1.1, flick + 0.2);
      f.scale.set(0.75 + pw * 0.45, on ? hgt : 0.001, 1);
      f.rotation.y = Math.atan2(camera.position.x - f.position.x, camera.position.z - f.position.z) + (i - 1) * 0.5;
    });
    emberCore.material.color.setHex(on ? 0xff5a10 : 0x7a1a04);
    for (let i = 0; i < EMB; i++) {
      const e = emb[i];
      e.life -= dt;
      if (e.life <= 0 && on && Math.random() < dt * (2 + oil / 10)) Object.assign(e, { x: srand(-0.25, 0.25), y: 0.3, z: srand(-0.25, 0.25), vx: srand(-0.3, 0.3), vy: srand(0.8, 2.0), vz: srand(-0.3, 0.3), life: srand(0.8, 2.2) });
      if (e.life > 0) { e.x += e.vx * dt + Math.sin(t * 3 + i) * 0.004; e.y += e.vy * dt; e.z += e.vz * dt; } else e.y = -5;
      embPos[i * 3] = e.x; embPos[i * 3 + 1] = e.y; embPos[i * 3 + 2] = e.z;
    }
    embGeo.attributes.position.needsUpdate = true;
  }

  // ---------------- nhân vật 3D ----------------
  function N(parent, x = 0, y = 0, z = 0) { const o = new THREE.Object3D(); o.position.set(x, y, z); if (parent) parent.add(o); return o; }
  const rig = {};
  rig.root = N(null); scene.add(rig.root); rig.root.visible = false;
  rig.hips = N(rig.root, 0, 0.88, 0); rig.hips.rotation.order = 'YXZ';
  rig.spine = N(rig.hips, 0, 0.04, 0); rig.chest = N(rig.spine, 0, 0.47, 0); rig.neck = N(rig.chest, 0, 0.04, 0); rig.head = N(rig.neck, 0, 0.1, 0);
  rig.shL = N(rig.chest, -0.19, -0.03, 0); rig.elL = N(rig.shL, 0, -0.27, 0); rig.haL = N(rig.elL, 0, -0.245, 0);
  rig.shR = N(rig.chest, 0.19, -0.03, 0); rig.elR = N(rig.shR, 0, -0.27, 0); rig.haR = N(rig.elR, 0, -0.245, 0);
  rig.hipL = N(rig.hips, -0.095, -0.04, 0); rig.knL = N(rig.hipL, 0, -0.39, 0); rig.ftL = N(rig.knL, 0, -0.38, 0);
  rig.hipR = N(rig.hips, 0.095, -0.04, 0); rig.knR = N(rig.hipR, 0, -0.39, 0); rig.ftR = N(rig.knR, 0, -0.38, 0);
  const HEAD_Y = 0.13, SCALE = 0.76;
  const _v = new THREE.Vector3(), _hp = new THREE.Vector3(), _ht = new THREE.Vector3(), _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _sc = new THREE.Vector3();
  const avs = new Map();   // id -> { av, v, ghost }
  let modelsReady = false;
  const CHAR_IDS = Array.from({ length: 98 }, (_, i) => 'char' + String(i + 1).padStart(2, '0'));
  function zeroRig() { for (const k of Object.keys(rig)) if (k !== 'root' && k !== 'hips') rig[k].rotation.set(0, 0, 0); rig.shL.position.x = -0.19; rig.shR.position.x = 0.19; }
  function placeRoot(x, y0, z, yaw) { rig.root.position.set(x, 0, z); rig.root.rotation.set(0, yaw, 0); rig.root.scale.setScalar(SCALE); rig.hips.position.set(0, 0.88, 0); }
  // ngồi bệt ôm gối
  function poseGround(k, breath, look) {
    rig.hips.rotation.set(-0.32, 0, 0);
    rig.spine.rotation.set(0.42 + 0.18 * k + breath, 0, 0); rig.neck.rotation.set(0.05, 0, 0); rig.head.rotation.set(-0.1 + 0.3 * k + look, 0, 0);
    rig.shL.rotation.set(-0.9 - 0.15 * k, 0, 0.18); rig.elL.rotation.set(-0.45, 0, 1.3);
    rig.shR.rotation.set(-0.9 - 0.15 * k, 0, -0.18); rig.elR.rotation.set(-0.45, 0, -1.3);
    rig.hipL.rotation.set(-1.95, 0, -0.12); rig.knL.rotation.set(2.45, 0, 0); rig.ftL.rotation.set(-0.5, 0, 0);
    rig.hipR.rotation.set(-1.95, 0, 0.12); rig.knR.rotation.set(2.45, 0, 0); rig.ftR.rotation.set(-0.5, 0, 0);
  }
  // ngồi trên khúc gỗ / ghế: đùi ngang, cẳng chân thả xuống, tay đặt lên đùi
  function poseSit(k, breath, look) {
    rig.hips.rotation.set(0, 0, 0);
    rig.spine.rotation.set(0.14 + 0.25 * k + breath, 0, 0); rig.neck.rotation.set(0.05, 0, 0); rig.head.rotation.set(0.05 + 0.25 * k + look, 0, 0);
    rig.shL.rotation.set(-0.42 - 0.3 * k, 0, 0.1 + 0.2 * k); rig.elL.rotation.set(-0.95 - 0.4 * k, 0, 0.35 + 0.5 * k);
    rig.shR.rotation.set(-0.42 - 0.3 * k, 0, -0.1 - 0.2 * k); rig.elR.rotation.set(-0.95 - 0.4 * k, 0, -0.35 - 0.5 * k);
    rig.hipL.rotation.set(-1.5, 0, -0.1); rig.knL.rotation.set(1.5 + 0.15 * k, 0, 0); rig.ftL.rotation.set(0, 0, 0);
    rig.hipR.rotation.set(-1.5, 0, 0.1); rig.knR.rotation.set(1.5 + 0.15 * k, 0, 0); rig.ftR.rotation.set(0, 0, 0);
  }
  function groundRig(seatH, floor) {   // đặt mông lên mặt ngồi, chân không xuyên đất
    rig.root.updateMatrixWorld(true);
    rig.hips.getWorldPosition(_v);
    rig.root.position.y -= _v.y - (seatH + 0.09 * SCALE);
    rig.root.updateMatrixWorld(true);
    let minY = Infinity; for (const n of [rig.ftL, rig.ftR]) { n.getWorldPosition(_v); minY = Math.min(minY, _v.y - 0.05); }
    if (minY < floor) { rig.root.position.y += floor - minY; rig.root.updateMatrixWorld(true); }
  }
  function drive(av, alpha, sing = 0) {
    _hp.set(0, HEAD_Y, 0).applyMatrix4(rig.head.matrixWorld);
    _ht.set(0, HEAD_Y + 0.3, 0).applyMatrix4(rig.head.matrixWorld);
    driveAvatar(av, rig, { yaw: rig.root.rotation.y, scale: SCALE, hipH0: 0.88, flat: false, alpha, floorY: rig.root.position.y, headPt: _hp, headTop: _ht, beat: 0, sing });
  }
  const headScreen = () => toScreen(_v.set(0, HEAD_Y + 0.22, 0).applyMatrix4(rig.head.matrixWorld));

  // người bị ma bắt: thành bóng ma xanh mờ lơ lửng trong bóng tối
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.3, depthWrite: false, fog: false });
  function setGhost(e, on) {
    if (!!e.ghost === on) return;
    e.ghost = on;
    e.av.holder.traverse(o => { if (!o.isMesh) return; if (on) { o.userData.realMat = o.material; o.material = ghostMat; } else if (o.userData.realMat) { o.material = o.userData.realMat; } });
  }
  let lostSpots = [];
  function computeLostSpots() {   // chỗ tối hai bên mép khung hình, không trùng ghế, không bị bảng che
    lostSpots = [];
    const L2 = built[curMap], used = L2 ? L2.seats.slice(0, layoutCount || 30) : [];
    for (let r = 3.5; r < 12 && lostSpots.length < 14; r += 0.7) for (let a = -2.8; a <= 2.8; a += 0.22) {
      const p = new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r * 0.8);
      const s = toScreen(p);
      if (s.z >= 1 || s.y < 1000 || s.y > 1440 || !(s.x > 70 && s.x < 250 || s.x > 830 && s.x < 1010)) continue;
      if (s.x > 690 && s.y > 1380) continue;   // bảng quà
      if (used.some(q => Math.hypot(q.p.x - p.x, q.p.z - p.z) < 0.9) || lostSpots.some(q => q.distanceTo(p) < 1.1)) continue;
      lostSpots.push(p);
    }
    if (!lostSpots.length) lostSpots.push(new THREE.Vector3(-4, 0, 1));
  }

  // ông kể chuyện
  let teller = null;
  function tellerProps(av) {
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.13, 20, 1, true), gMat(0xc8b080, { side: THREE.DoubleSide }));   // nón lá
    const hatG = new THREE.Group(); hatG.add(hat); hat.position.y = 0.2; hatG.rotation.x = -0.12;
    attachProp(av, 'Head', hatG);
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 8), gMat(0xe8e4dc)); beard.rotation.x = Math.PI; beard.position.set(0, -0.07, 0.1);   // râu bạc
    attachProp(av, 'Head', beard);
    const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 1.1, 6), gMat(0x5a3a1a)); cane.position.set(0, -0.25, 0.04);   // gậy trúc
    attachProp(av, 'RightHand', cane);
  }

  // ---------------- máy quay tự căn cho vừa khung chữ ----------------
  const SAFE = { x0: 80, x1: 1000, y0: 660, y1: 1440 };
  function fitCamera(cfg, pts) {
    const yaw = cfg.yaw || 0, pitch = cfg.pitch || 0.48, fov = cfg.fov || 50;
    camera.fov = fov; camera.updateProjectionMatrix(); camera.clearViewOffset();
    const fwd = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    const target = new THREE.Vector3(); pts.forEach(p => target.add(p)); target.divideScalar(pts.length); target.y = 0.4;
    let dist = 11;
    const place = () => { camera.position.copy(target).addScaledVector(fwd, -dist); camera.lookAt(target); camera.updateMatrixWorld(); };
    const bbox = () => { const b = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 }; for (const p of pts) { const s = toScreen(p); b.x0 = Math.min(b.x0, s.x); b.x1 = Math.max(b.x1, s.x); b.y0 = Math.min(b.y0, s.y); b.y1 = Math.max(b.y1, s.y); } return b; };
    const right = new THREE.Vector3(), up = new THREE.Vector3();
    for (let it = 0; it < 8; it++) {
      place(); let b = bbox();
      const k = Math.max((b.x1 - b.x0) / (SAFE.x1 - SAFE.x0), (b.y1 - b.y0) / (SAFE.y1 - SAFE.y0));
      dist = Math.max(5, Math.min(45, dist * (0.35 + 0.65 * k)));
      place(); b = bbox();
      const ppm = H / (2 * Math.tan(fov * Math.PI / 360) * dist);
      right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);
      target.addScaledVector(right, ((b.x0 + b.x1) / 2 - (SAFE.x0 + SAFE.x1) / 2) / ppm).addScaledVector(up, -((b.y0 + b.y1) / 2 - (SAFE.y0 + SAFE.y1) / 2) / ppm);
    }
    place();
  }
  // máy quay căn theo số người đang ngồi: ít người thì quay gần, đông thì lùi ra từ từ
  const TIERS = [14, 24, 36, 50, 73];
  let layoutCount = 0, camAnim = null;
  const seatedNow = () => st.viewers.filter(v => !v.leaving).length;
  function tierFor(L2, n) { const max = Math.min(SH.SEATS.length, L2.seats.length, Math.max(14, +SH.S.maxSeats || 70)); for (const k of TIERS) if (n + 3 <= k) return Math.min(k, max); return max; }
  function computeFit(L2, cnt) {
    const save = { p: camera.position.clone(), q: camera.quaternion.clone(), fov: camera.fov };
    const pts = [];
    for (let i = 0; i < cnt; i++) { const p = L2.seats[i].p; pts.push(new THREE.Vector3(p.x, p.y, p.z), new THREE.Vector3(p.x, p.y + 0.95, p.z)); }
    pts.push(new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(0.6, 0, 0.6), new THREE.Vector3(-0.6, 0, 0.6), new THREE.Vector3(L2.teller.x, 1.3, L2.teller.z), new THREE.Vector3(L2.teller.x, 0, L2.teller.z));
    fitCamera(L2.cam, pts);
    const tgt = { p: camera.position.clone(), q: camera.quaternion.clone(), fov: camera.fov };
    camera.position.copy(save.p); camera.quaternion.copy(save.q); camera.fov = save.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    return tgt;
  }
  function setCam(c) { camera.position.copy(c.p); camera.quaternion.copy(c.q); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); }
  function reproject(L2) {
    const list = [];
    for (let i = 0; i < SH.SEATS.length; i++) {
      const s = L2.seats[i] || L2.seats[L2.seats.length - 1];
      const sp = toScreen(s.p), d = camera.position.distanceTo(s.p);
      const ppm = H / (2 * Math.tan(camera.fov * Math.PI / 360) * d);
      list.push({ x: sp.x, y: sp.y, sc: Math.max(0.45, Math.min(1.45, ppm / 235)), ring: Math.min(4, Math.floor(i / 14)), zone: s.zone, w: s.p, pose: s.pose, face: s.face });
    }
    const fs = toScreen(FIRE);
    SH.setLayout(list, { x: fs.x, y: fs.y });
  }
  function applyLayout(L2, instant = true) {
    layoutCount = tierFor(L2, seatedNow());
    const tgt = computeFit(L2, layoutCount);
    if (instant) { camAnim = null; setCam(tgt); reproject(L2); computeLostSpots(); }
    else camAnim = { from: { p: camera.position.clone(), q: camera.quaternion.clone(), fov: camera.fov }, to: tgt, t0: performance.now() / 1000, dur: 3 };
  }
  function camTick() {
    const L2 = built[curMap]; if (!L2) return;
    if (!camAnim && tierFor(L2, seatedNow()) !== layoutCount) applyLayout(L2, false);
    if (!camAnim) return;
    const p = Math.min(1, (performance.now() / 1000 - camAnim.t0) / camAnim.dur), k = p * p * (3 - 2 * p);
    camera.position.lerpVectors(camAnim.from.p, camAnim.to.p, k); camera.quaternion.slerpQuaternions(camAnim.from.q, camAnim.to.q, k);
    camera.fov = camAnim.from.fov + (camAnim.to.fov - camAnim.from.fov) * k; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    reproject(L2);
    if (p >= 1) { camAnim = null; computeLostSpots(); }
  }

  function syncAvatars(t) {
    const seen = new Set();
    let si = 0, lost = 0;
    for (const v of st.viewers) {
      if (!v.seat || !v.seat.w) continue;
      seen.add(v.id);
      let e = avs.get(v.id);
      if (!e && modelsReady && avatarTemplates.length) {
        const h = hash(v.id);
        let tpl = null;
        if (hasCharModel(CHAR_IDS[h % 98])) { tpl = templateForChar(CHAR_IDS[h % 98]); if (!tpl) continue; }
        const av = createAvatar(scene, tpl ? tpl.female : !!(h & 1), tpl, null);
        if (!av) continue;
        av.holder.traverse(o => { if (o.isMesh && o.material && o.material.emissiveIntensity >= 2 && o.material.toneMapped === false) o.visible = false; });   // bỏ que phát sáng
        e = { av, v, ghost: false }; avs.set(v.id, e);
      }
      if (!e) { v.has3d = false; continue; }
      e.v = v; v.has3d = true;
      let alpha = Math.max(0.001, v.alpha);
      const taking = v.anim && v.anim.type === 'take', returning = v.anim && v.anim.type === 'return';
      if (v.anim) { const p = Math.min(1, (t - v.anim.t0) / 1.3); alpha *= taking ? Math.max(0.001, 1 - p * 2) : Math.max(0.001, p * 2 - 1); }
      if (v.taken && !taking) {
        // bóng ma đứng lơ lửng trong bóng tối, chờ người cứu
        setGhost(e, true); e.av.holder.visible = true;
        const spot = lostSpots[lost++ % lostSpots.length];
        zeroRig(); placeRoot(spot.x + Math.sin(t * 0.4 + lost) * 0.15, 0, spot.z, Math.atan2(-spot.x, -spot.z));
        rig.shL.rotation.set(0, 0, 0.12); rig.shR.rotation.set(0, 0, -0.12); rig.head.rotation.set(0.35, 0, Math.sin(t * 0.7 + lost) * 0.15);
        rig.root.updateMatrixWorld(true); rig.root.position.y = 0.25 + Math.sin(t * 1.3 + lost) * 0.08; rig.root.updateMatrixWorld(true);
        drive(e.av, Math.min(1, (t - (v.takenAt || t)) / 1.5 + 0.05));
        const hs = headScreen(); v.gx = hs.x; v.gy = hs.y;
        continue;
      }
      setGhost(e, false); v.gx = null;
      e.av.holder.visible = alpha > 0.01;
      if (!e.av.holder.visible) continue;
      const w = v.seat.w, face = v.seat.face || FIRE;
      let x = w.x, z = w.z;
      if (v.shiver > 0) x += Math.sin(t * 70 + v.seat.n) * 0.012 * Math.min(1, v.shiver);
      const yaw = Math.atan2(face.x - w.x, face.z - w.z);
      const k = Math.min(1, (v.shiver > 0 ? 0.6 : 0) + (st.yin > 70 ? 0.35 : 0));
      const breath = Math.sin(t * 1.7 + v.seat.n) * 0.02, look = v.laugh > 0 ? Math.sin(t * 12) * 0.15 : (v.glow > 0 ? -0.25 : 0);
      zeroRig(); placeRoot(x, 0, z, yaw);
      if (v.seat.pose === 'ground') poseGround(k, breath, look); else poseSit(k, breath, look);
      groundRig(w.y, Math.max(0, w.y - 0.3));
      if (v.jump > 0) { rig.root.position.y += Math.sin(v.jump * Math.PI) * 0.25; rig.root.updateMatrixWorld(true); }
      drive(e.av, alpha);
      const hs = headScreen(); v.hx = hs.x; v.hy = hs.y;
      if (si < CAP && w.y < 0.05) shadows.setMatrixAt(si++, _m4.compose(_v.set(x, 0.02, z), _q.identity(), _sc.set(1.1, 1, 0.9)));
      if (returning) {}
    }
    shadows.count = si; shadows.instanceMatrix.needsUpdate = true;
    for (const [id, e] of avs) if (!seen.has(id)) { disposeAvatar(e.av); avs.delete(id); }
  }

  function tellerTick(t) {
    const L2 = built[curMap];
    if (!L2 || !modelsReady || !avatarTemplates.length) { SH.teller = null; return; }
    if (!teller) {
      const males = avatarTemplates.filter(x => !x.female);
      const av = createAvatar(scene, false, males[0] || avatarTemplates[0], null);
      if (!av) return;
      av.holder.traverse(o => { if (o.isMesh && o.material && o.material.emissiveIntensity >= 2 && o.material.toneMapped === false) o.visible = false; });
      tellerProps(av);
      teller = { av, prop: null, propFor: null };
    }
    // ghế ngồi của ông kể chuyện theo từng cảnh
    if (teller.propFor !== curMap) {
      if (teller.prop) teller.prop.parent.remove(teller.prop);
      const pg = new THREE.Group(); scene.add(pg);
      const T = L2.teller;
      if (T.kind === 'bale') baleSeat(pg, T.x, T.z); else if (T.kind === 'rock') rockSeat(pg, T.x, T.z); else if (T.kind === 'stool') stoolSeat(pg, T.x, T.z); else if (T.kind === 'root') logSeat(pg, T.x, T.z, 1.2, 0, 'root'); else stumpSeat(pg, T.x, T.z);
      teller.prop = pg; teller.propFor = curMap;
    }
    const T = L2.teller;
    // quay về phía máy quay, hơi hướng vào đống lửa
    const yaw = Math.atan2(camera.position.x - T.x, camera.position.z - T.z) * 0.75 + Math.atan2(-T.x, -T.z) * 0.25 * (Math.abs(T.x) > 0.5 ? 1 : 0);
    zeroRig(); placeRoot(T.x, 0, T.z, yaw);
    poseSit(0, Math.sin(t * 1.3) * 0.02, 0);
    const talk = st.talking, shock = t - (st.shockAt || -99) < 1.6;
    if (shock) {   // giơ hai tay hù
      rig.shL.rotation.set(-2.5, 0, 0.5); rig.elL.rotation.set(-0.4, 0, 0.2); rig.shR.rotation.set(-2.5, 0, -0.5); rig.elR.rotation.set(-0.4, 0, -0.2);
      rig.spine.rotation.x = -0.15; rig.head.rotation.set(-0.15, 0, 0);
    } else if (talk) {   // vừa kể vừa vung tay, nhìn quanh người nghe
      rig.shR.rotation.set(-1.0 - Math.sin(t * 2.3) * 0.35, 0, -0.35 - Math.sin(t * 1.7) * 0.2); rig.elR.rotation.set(-1.0 + Math.sin(t * 3.1) * 0.3, 0, -0.6);
      if (Math.sin(t * 0.45) > 0.3) { rig.shL.rotation.set(-1.3, 0, 0.5 + Math.sin(t * 2) * 0.1); rig.elL.rotation.set(-0.3, 0, 0.3); }
      rig.head.rotation.set(0.05 + Math.sin(t * 4.1) * 0.05, Math.sin(t * 0.6) * 0.45, 0);
      rig.spine.rotation.x = 0.22 + Math.sin(t * 1.1) * 0.06;
    } else rig.head.rotation.set(0.25, Math.atan2(-T.x, -T.z) - yaw, 0);   // nhìn đống lửa
    groundRig(SEAT_H, 0);
    drive(teller.av, 1, talk ? Math.abs(Math.sin(t * 13)) * 0.65 : 0);
    const hs = headScreen();
    SH.teller = { x: hs.x, y: hs.y, sc: Math.max(0.5, Math.min(1.3, H / (2 * Math.tan(camera.fov * Math.PI / 360) * camera.position.distanceTo(_v.set(T.x, 1, T.z))) / 235)) };
  }

  // ---------------- vòng lặp ----------------
  let st = { viewers: [], oil: 80, flick: 1, yin: 0 };
  let curMap = null;
  function setMap(name) {
    if (!SCENES[name]) name = 'dong';
    if (name === curMap) return;
    if (!built[name]) {
      const g = new THREE.Group(); g.visible = false; scene.add(g);
      seed = 1000 + Object.keys(SCENES).indexOf(name) * 977;
      let r = null;
      try { r = SCENES[name].build(g); } catch (e) { console.warn('Lỗi dựng cảnh', name, e); }
      built[name] = Object.assign({ g, seats: [], teller: { x: 0, z: -1.3, kind: 'stump' }, cam: {} }, r || {});
    }
    curMap = name;
    for (const [k, b] of Object.entries(built)) b.g.visible = k === name;
    scene.fog.density = (SCENES[name].fog || 0.04) * 0.75;
    applyLayout(built[name]);
  }

  let lastT = 0;
  function frame(state) {
    st = state;
    const t = state.t, dt = Math.min(0.1, t - lastT || 0.016); lastT = t;
    windU.value = t;
    if (state.map && state.map !== curMap) setMap(state.map);
    const on = state.oil > 0 && state.flick > 0;
    lampLight.intensity = on ? (10 + state.oil * 0.6) * state.flick * (0.9 + Math.sin(t * 17) * 0.06 + Math.sin(t * 29) * 0.04) : 0.0;
    lampLight.position.x = Math.sin(t * 9) * 0.05; lampLight.position.z = Math.cos(t * 7) * 0.05;
    lampGlow.material.opacity = on ? 0.35 + state.oil / 300 : 0.08;
    lampGlow.scale.setScalar(2.4 + state.oil / 40);
    fireTick(t, dt, state.oil, state.flick);
    const y = state.yin / 100;
    rimLight.intensity = y > 0.5 ? (y - 0.5) * 30 : 0;
    hemi.intensity = 1.0 - y * 0.35 + (state.trura ? 1.2 : 0);
    moonLight.intensity = 1.4 - y * 0.5;
    fillLight.intensity = 0.55 - y * 0.2;
    for (const s of swayers) s.o.rotation.x = s.base + Math.sin(t * 0.9 + s.ph) * s.amp + Math.sin(t * 2.3 + s.ph) * s.amp * 0.3;
    const cur = built[curMap]; if (cur && cur.update) cur.update(t, y);
    const want = 2 + Math.round(y * 12);
    wisps.forEach((w, i) => {
      w.a += w.sp * 0.016;
      w.s.position.set(Math.cos(w.a) * w.r, w.y + Math.sin(t * 1.3 + w.ph) * 0.25, -2 + Math.sin(w.a) * w.r * 0.7);
      const target = i < want ? 0.55 + Math.sin(t * 3 + w.ph) * 0.25 : 0;
      w.s.material.opacity += (target - w.s.material.opacity) * 0.03;
    });
    flies.forEach(f => { f.s.position.set(f.x + Math.sin(t * 0.4 + f.ph) * 1.2, f.y + Math.sin(t * 0.9 + f.ph) * 0.3, f.z + Math.cos(t * 0.35 + f.ph) * 1.2); f.s.material.opacity = Math.max(0, Math.sin(t * 2 + f.ph * 3)) * (1 - y) * 0.9; });
    camTick();
    syncAvatars(t);
    tellerTick(t);
    if (state.shake) camera.setViewOffset(W, H, state.shake.x, state.shake.y, W, H); else camera.clearViewOffset();
    renderer.render(scene, camera);
  }

  setOutfitMix(10);
  fetch('/api/models').then(r => r.json()).then(list => loadAvatars((list || []).filter(m => m.enabled).map(m => ({ url: m.url, female: m.female })))).then(() => { modelsReady = true; console.log('Cảnh 3D: đã nạp', avatarTemplates.length, 'mô hình người'); }).catch(e => console.warn('Không nạp được mô hình người', e));

  window.MA3D = { ready: true, frame, setMap, maps: Object.keys(SCENES), sceneNames: Object.fromEntries(Object.entries(SCENES).map(([k, v]) => [k, v.name])),
    invalidate: () => { curMap = null; }, relayout: () => { if (curMap && built[curMap]) applyLayout(built[curMap], false); },
    avatarCount: () => avs.size, modelsReady: () => modelsReady };
}
