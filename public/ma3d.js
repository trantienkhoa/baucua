// Ngọn Đèn Cuối Cùng — cảnh 3D (Three.js): ngồi giữa đồng lúa hoặc trong bụi chuối lúc nửa đêm,
// người xem là nhân vật 3D ngồi bó gối quanh ngọn đèn dầu. Lớp chữ / bảng / hồn ma vẫn vẽ 2D ở trên.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadAvatars, createAvatar, driveAvatar, disposeAvatar, avatarTemplates, setOutfitMix, templateForChar, hasCharModel } from './avatars.js';

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

  const L = ground(SH.LX, SH.LY);                              // ngọn đèn
  const M = ground(SH.MIRROR.x, SH.MIRROR.y + SH.MIRROR.ry + 20);   // chân tấm gương
  for (const s of SH.SEATS) s.w = ground(s.x, s.y);

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
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 7.0), new THREE.MeshLambertMaterial({ map: matTex, color: 0xb8a890 }));
  mat.rotation.x = -Math.PI / 2; mat.position.set(L.x, 0.012, L.z - 0.6); scene.add(mat);

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

  const SCENES = {
    dong: { name: 'Giữa đồng lúa', fog: 0.034, build(g) {
      const dike = (x0, z0, len, rot) => { const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.28, 0.7), gMat(0x2e2418)); b.position.set(x0, 0.14, z0); b.rotation.y = rot; g.add(b); };
      dike(L.x, L.z - 9.5, 80, 0); dike(L.x + 9.5, L.z - 10, 60, Math.PI / 2); dike(L.x - 10, L.z - 10, 60, Math.PI / 2);
      field(g, { h: 0.75, r: 34, step: 0.42, jit: 0.08, clear: 5.6, fill: 0.95, hue: 0.17, color: 0x9aa060,
        skip: (x, z) => Math.abs(z - (L.z - 9.5)) < 0.6 || Math.abs(x - (L.x + 9.5)) < 0.6 || Math.abs(x - (L.x - 10)) < 0.6 || Math.hypot(x - M.x, z - M.z) < 1.4 });
      field(g, { h: 0.55, step: 0.32, jit: 0.1, fill: 0.9, hue: 0.16, color: 0xa8a868, rect: [L.x - 6, L.x + 6, L.z + 3.25, L.z + 4.9] });
      scarecrow(g, L.x + 4.6, L.z - 12.5);
      const sc = scarecrowHead;
      grave(g, L.x - 6.5, L.z - 10.8); grave(g, L.x - 4.6, L.z - 11.8, 0.8); grave(g, L.x - 8.6, L.z - 13, 1.1);
      strawPile(g, L.x + 8.5, L.z - 4.5, 0.9); strawPile(g, L.x - 9.5, L.z - 4, 1.1); strawPile(g, L.x + 12, L.z - 17, 1.2);
      deadTree(g, L.x - 12, L.z - 17);
      for (const [dx, dz, h] of [[7.5, -15, 3.6], [8.6, -16.5, 3.2], [6.4, -17, 4], [-14, -9, 3.4], [-15.5, -11, 3.8]]) bananaTree(g, L.x + dx, L.z + dz, h);
      stake(g, M.x, M.z); bananaTree(g, M.x + 1.6, M.z - 1.2, 3.4);
      return (t, y) => {   // bù nhìn quay đầu nhìn về phía mình khi âm khí cao
        const want = y > 0.65 && Math.sin(t * 0.21) > 0.2 ? 1.0 : 0;
        sc.head.rotation.y += (want - sc.head.rotation.y) * 0.02;
        for (const e of sc.eyes) e.material.color.setHex(want && y > 0.8 ? 0xff2a1a : 0x110000);
      };
    } },
    chuoi: { name: 'Bụi chuối sau nhà', fog: 0.045, build(g) {
      ringGrass(g, 16, 0.55);
      for (const [x, z] of ringPos(46, 6.2, 13, (x, z) => Math.hypot(x - (L.x - 4.8), z - (L.z - 6.8)) > 1.5)) bananaTree(g, x, z, srand(3.2, 4.6));
      fgGrass(g);
      for (const [dx, dz] of [[-6.5, 0.5], [6.8, 0.2], [-7.5, -2], [7.6, -2.5]]) bananaTree(g, L.x + dx, L.z + dz, srand(3.6, 4.4));
      bananaTree(g, M.x + 1.1, M.z - 0.9, 4.2); bananaTree(g, M.x - 1.2, M.z - 1.1, 3.8);
      stake(g, M.x, M.z); well(g, L.x - 4.8, L.z - 6.8);
      fence(g, L.x - 14, L.z - 15, L.x + 14, L.z - 15);
      hut(g, L.x + 9, L.z - 19);
      const win = hutWindow;
      grave(g, L.x + 5.4, L.z - 8.4, 0.85);
      return (t, y) => win.material.color.setHex(y > 0.6 && Math.sin(t * 0.5) > 0.6 ? 0xff5a20 : 0x331a08);
    } },
    gieng: { name: 'Giếng cổ đầu làng', fog: 0.04, build(g) {
      paved(g, 6.5, 5.5); ringGrass(g, 18, 0.4); fgGrass(g, 0x6a7a40);
      const w = bigWell(g, L.x - 3.6, L.z - 7.2);
      flowerTree(g, L.x + 4.2, L.z - 8.5, 3.6); flowerTree(g, L.x - 8, L.z - 5, 3);
      waterJar(g, L.x - 6, L.z - 6.4); waterJar(g, L.x - 6.8, L.z - 5.6, 0.8); waterJar(g, L.x + 6.5, L.z - 3.5, 0.9);
      fence(g, L.x - 12, L.z - 13, L.x + 12, L.z - 13);
      for (const [x, z] of ringPos(10, 9, 14)) bananaTree(g, x, z, srand(3.2, 4.2));
      stake(g, M.x, M.z);
      return (t, y) => { w.rope.rotation.z = Math.sin(t * 0.7) * (0.05 + y * 0.25); };   // dây gàu tự đung đưa
    } },
    cayda: { name: 'Gốc đa nghìn năm', fog: 0.042, build(g) {
      ringGrass(g, 18, 0.45); fgGrass(g, 0x5a7038);
      banyan(g, L.x + 0.8, L.z - 10.5);
      for (const [x, z] of ringPos(8, 10, 16, (x, z) => Math.abs(x - L.x) > 6)) bananaTree(g, x, z, srand(3.2, 4));
      grave(g, L.x - 6.5, L.z - 8.5, 0.8); deadTree(g, L.x + 9, L.z - 7);
      stake(g, M.x, M.z);
    } },
    nghiadia: { name: 'Nghĩa địa làng', fog: 0.05, build(g) {
      ringGrass(g, 20, 0.55, 0x5a6a38, 0.5); fgGrass(g, 0x5a6a38, 0.5);
      for (let row = 0; row < 4; row++) for (let i = -7; i <= 7; i++) {
        const x = L.x + i * 1.9 + srand(-0.3, 0.3), z = L.z - 7 - row * 2.6 + srand(-0.3, 0.3);
        if (Math.hypot(x - M.x, z - M.z) < 1.8 || srand() < 0.15) continue;
        if (srand() < 0.5) tombstone(g, x, z, srand(0.8, 1.2)); else grave(g, x, z, srand(0.6, 0.9));
      }
      for (const [x, z] of [[-7.5, -2.5], [7.8, -3], [-8.5, -1], [8.4, -0.5]]) grave(g, L.x + x, L.z + z, srand(0.7, 0.9));
      flowerTree(g, L.x - 6, L.z - 13, 3.8); flowerTree(g, L.x + 7, L.z - 14, 3.4); deadTree(g, L.x + 11, L.z - 9);
      house(g, L.x - 1, L.z - 22, 5);   // lăng mộ
      stake(g, M.x, M.z);
    } },
    mieu: { name: 'Miếu hoang ven rừng', fog: 0.045, build(g) {
      ringGrass(g, 18, 0.6, 0x5a7038, 0.55); fgGrass(g);
      const glow = shrine(g, L.x - 3.8, L.z - 9.5, 1.15);
      for (const [x, z] of ringPos(16, 8, 15, (x, z) => Math.hypot(x - (L.x - 3.8), z - (L.z - 9.5)) > 3)) (srand() < 0.5 ? deadTree : bananaTree)(g, x, z, srand(3.2, 4.2));
      for (let i = 0; i < 6; i++) box(g, 0.6, 0.06, 0.45, 0x4a4640, L.x - 3.8 + srand(-0.2, 0.2), 0.03, L.z - 7.4 + i * 0.6);   // lối đá
      flowerTree(g, L.x + 4.5, L.z - 9);
      stake(g, M.x, M.z);
      return (t, y) => { glow.material.opacity = 0.5 + Math.sin(t * 7) * 0.15 + (y > 0.7 && Math.sin(t * 0.9) > 0.8 ? 0.4 : 0); };
    } },
    bendo: { name: 'Bến đò đêm', fog: 0.038, build(g) {
      const water = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), new THREE.MeshStandardMaterial({ color: 0x0a1626, metalness: 0.7, roughness: 0.2 }));
      water.rotation.x = -Math.PI / 2; water.position.set(L.x, 0.02, L.z - 7.2 - 60); g.add(water);
      const bank = new THREE.Mesh(new THREE.PlaneGeometry(200, 0.8), gMat(0x2a2016)); bank.rotation.x = -Math.PI / 2; bank.position.set(L.x, 0.03, L.z - 7.2); g.add(bank);
      const moonPath = glowSprite(g, 0x9fb0e0, L.x + 4, 0.05, L.z - 26, 1); moonPath.scale.set(3, 14, 1); moonPath.material.opacity = 0.35;
      // cầu tàu
      for (let i = 0; i < 12; i++) box(g, 1.4, 0.08, 0.32, 0x4a3a28, L.x - 5.5, 0.35, L.z - 7 - i * 0.36);
      for (const sx of [-0.65, 0.65]) for (let i = 0; i < 4; i++) cyl(g, 0.07, 0.07, 1.1, 0x2a2018, L.x - 5.5 + sx, 0.2, L.z - 7.2 - i * 1.3, 6);
      const bt = boat(g, L.x - 3.4, L.z - 10.5);
      field(g, { h: 1.3, r: 16, step: 0.35, jit: 0.15, clear: 5.4, fill: 0.9, hue: 0.16, color: 0x8a8a58, skip: (x, z) => z < L.z - 7.8 || z > L.z - 5.2 || Math.abs(x - (L.x - 5.5)) < 1 || Math.hypot(x - M.x, z - M.z) < 1.4 });   // lau sậy ven bờ
      fgGrass(g, 0x6a7040, 0.6);
      for (const [x, z] of [[-9, -3], [9.5, -2.5], [8, -5]]) bananaTree(g, L.x + x, L.z + z, 3.8);
      deadTree(g, L.x + 6.5, L.z - 5.8);
      stake(g, M.x, M.z);
      return t => { bt.b.position.y = 0.05 + Math.sin(t * 1.1) * 0.04; bt.b.rotation.z = Math.sin(t * 0.8) * 0.03; moonPath.material.opacity = 0.3 + Math.sin(t * 2) * 0.06; };
    } },
    rungtre: { name: 'Rừng tre', fog: 0.05, build(g) {
      ringGrass(g, 16, 0.45, 0x5a6a30); fgGrass(g, 0x5a6a30);
      for (const [x, z] of ringPos(26, 6.5, 15)) bamboo(g, x, z, Math.round(srand(7, 13)));
      for (const [dx, dz] of [[-7, 0], [7.2, -0.5], [-8, -2.5], [8.2, -3]]) bamboo(g, L.x + dx, L.z + dz, 9);
      stake(g, M.x, M.z);
    } },
    choma: { name: 'Chợ ma nửa đêm', fog: 0.045, build(g) {
      ringGrass(g, 16, 0.3); fgGrass(g, 0x6a7a40, 0.35);
      const lamps = [];
      [[-8, -4, 0.9], [-6.5, -8.5, 0.4], [-2.5, -11, 0.1], [3.5, -11, -0.1], [7, -8.2, -0.4], [8.5, -3.8, -0.9]].forEach(([dx, dz, ry]) => lamps.push(stall(g, L.x + dx, L.z + dz, ry)));
      for (let i = 0; i < 40; i++) { const p = mesh(new THREE.PlaneGeometry(0.15, 0.08), new THREE.MeshLambertMaterial({ color: 0xc9a23a, side: THREE.DoubleSide }), L.x + srand(-9, 9), 0.02, L.z + srand(-11, -5.5), g); p.rotation.set(-Math.PI / 2, 0, srand(0, TAU)); }   // tiền vàng mã rơi
      for (const [x, z] of ringPos(8, 12, 16)) deadTree(g, x, z);
      stake(g, M.x, M.z);
      return (t, y) => lamps.forEach((l, i) => { l.material.opacity = 0.6 + Math.sin(t * 6 + i * 2) * 0.15 - (y > 0.75 && Math.sin(t * 3 + i) > 0.7 ? 0.5 : 0); });
    } },
    duongray: { name: 'Đường ray bỏ hoang', fog: 0.042, build(g) {
      ringGrass(g, 18, 0.45, 0x5a6a38, 0.5); fgGrass(g, 0x5a6a38);
      rails(g, L.z - 8.2);
      const sig = signal(g, L.x + 6.5, L.z - 6.6);
      wagon(g, L.x - 10, L.z - 12);
      for (let i = 0; i < 14; i++) cyl(g, 0.06, 0.06, 1.6, 0x2a2a2a, L.x - 18 + i * 2.8, 0.8, L.z - 10.5, 5);   // cột điện cũ
      for (const [x, z] of ringPos(8, 12, 18, (x, z) => Math.abs(z - (L.z - 8.2)) > 2)) deadTree(g, x, z);
      stake(g, M.x, M.z);
      return t => { sig.material.opacity = Math.sin(t * 2.2) > 0 ? 0.9 : 0.15; };
    } },
    nhahoang: { name: 'Sân nhà hoang', fog: 0.045, build(g) {
      ringGrass(g, 16, 0.6, 0x5a7038, 0.55); fgGrass(g);
      const wins = house(g, L.x + 1, L.z - 11.5, 10);
      const sw = swing(g, L.x - 7.5, L.z - 6.5);
      fence(g, L.x - 13, L.z - 7, L.x - 9, L.z - 7); fence(g, L.x + 9, L.z - 7, L.x + 13, L.z - 7);
      for (const [x, z] of ringPos(8, 9, 15, (x, z) => Math.abs(x - L.x) > 6)) bananaTree(g, x, z, srand(3, 4));
      waterJar(g, L.x + 6, L.z - 6.5);
      stake(g, M.x, M.z);
      return (t, y) => {   // xích đu tự đung đưa, cửa sổ thoáng có ánh sáng
        sw.rotation.x = Math.sin(t * 1.4) * (0.15 + y * 0.35);
        wins.forEach((w, i) => w.material.color.setHex(y > 0.5 && Math.sin(t * 0.37 + i * 2) > 0.85 ? 0x6a5a40 : 0x050505));
      };
    } },
    dinh: { name: 'Sân đình làng', fog: 0.04, build(g) {
      paved(g, 7.5, 6); fgGrass(g, 0x5a6a38, 0.35);
      const glow = dinhHall(g, L.x + 0.5, L.z - 14);
      banyan(g, L.x + 11, L.z - 9);
      flowerTree(g, L.x - 8, L.z - 7.5, 3.4);
      stake(g, M.x, M.z);
      return (t, y) => { glow.material.opacity = 0.4 + Math.sin(t * 5) * 0.1 + (y > 0.7 ? 0.3 : 0); };
    } },
  };
  const built = {};   // tên cảnh → { g, update }

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
  const avs = new Map();   // id -> { av, v }
  let modelsReady = false;
  const CHAR_IDS = Array.from({ length: 98 }, (_, i) => 'char' + String(i + 1).padStart(2, '0'));

  function poseSeated(v, t, x, z, yaw) {
    const k = Math.min(1, (v.shiver > 0 ? 0.6 : 0) + (st.yin > 70 ? 0.35 : 0));   // sợ thì co người lại
    const breath = Math.sin(t * 1.7 + (v.seat ? v.seat.n : 0)) * 0.02;
    rig.root.position.set(x, 0, z);
    rig.root.rotation.set(0, yaw, 0);
    rig.root.scale.setScalar(SCALE);
    rig.hips.position.set(0, 0.88, 0);
    rig.hips.rotation.set(-0.32, 0, 0);
    rig.spine.rotation.set(0.42 + 0.18 * k + breath, 0, 0);
    rig.neck.rotation.set(0.05, 0, 0);
    const look = v.laugh > 0 ? Math.sin(t * 12) * 0.15 : (v.glow > 0 ? -0.25 : 0);
    rig.head.rotation.set(-0.1 + 0.3 * k + look, (v.lookBack || 0), 0);
    // tay ôm gối
    rig.shL.position.x = -0.19; rig.shR.position.x = 0.19;
    rig.shL.rotation.set(-0.9 - 0.15 * k, 0, 0.18); rig.elL.rotation.set(-0.45, 0, 1.3);
    rig.shR.rotation.set(-0.9 - 0.15 * k, 0, -0.18); rig.elR.rotation.set(-0.45, 0, -1.3);
    // chân co lên
    rig.hipL.rotation.set(-1.95, 0, -0.12); rig.knL.rotation.set(2.45, 0, 0); rig.ftL.rotation.set(-0.5, 0, 0);
    rig.hipR.rotation.set(-1.95, 0, 0.12); rig.knR.rotation.set(2.45, 0, 0); rig.ftR.rotation.set(-0.5, 0, 0);
    rig.root.updateMatrixWorld(true);
    // mông chạm đất
    rig.hips.getWorldPosition(_v);
    rig.root.position.y -= _v.y - 0.09 * SCALE;
    rig.root.updateMatrixWorld(true);
    let minY = Infinity; for (const n of [rig.ftL, rig.ftR]) { n.getWorldPosition(_v); minY = Math.min(minY, _v.y - 0.05); }
    if (minY < 0) { rig.root.position.y -= minY; rig.root.updateMatrixWorld(true); }
  }

  function syncAvatars(t) {
    const seen = new Set();
    let si = 0;
    for (const v of st.viewers) {
      if (!v.seat || !v.seat.w) continue;
      seen.add(v.id);
      let e = avs.get(v.id);
      if (!e && modelsReady && avatarTemplates.length) {
        // có bộ 98 nhân vật riêng (bản phát hành) thì mỗi người một vai, chưa có thì dùng mô hình mặc định
        const h = hash(v.id);
        let tpl = null;
        if (hasCharModel(CHAR_IDS[h % 98])) { tpl = templateForChar(CHAR_IDS[h % 98]); if (!tpl) continue; }
        const av = createAvatar(scene, tpl ? tpl.female : !!(h & 1), tpl, null);
        if (!av) continue;
        // bỏ que phát sáng (đồ đi bar) — không hợp cảnh ma
        av.holder.traverse(o => { if (o.isMesh && o.material && o.material.emissiveIntensity >= 2 && o.material.toneMapped === false) o.visible = false; });
        e = { av, v }; avs.set(v.id, e);
      }
      if (!e) { v.has3d = false; continue; }
      e.v = v;
      const hidden = v.taken && !(v.anim && v.anim.type === 'take');
      let alpha = Math.max(0.001, v.alpha);
      if (v.anim) { const p = Math.min(1, (t - v.anim.t0) / 1.3); alpha *= v.anim.type === 'take' ? Math.max(0.001, 1 - p * 2) : Math.max(0.001, p * 2 - 1); }
      e.av.holder.visible = !hidden && alpha > 0.01;
      v.has3d = e.av.holder.visible || hidden;
      if (!e.av.holder.visible) continue;
      const w = v.seat.w;
      let x = w.x, z = w.z;
      if (v.shiver > 0) x += Math.sin(t * 70 + v.seat.n) * 0.012 * Math.min(1, v.shiver);
      const yaw = Math.atan2(L.x - w.x, L.z - w.z);
      poseSeated(v, t, x, z, yaw);
      if (v.jump > 0) { rig.root.position.y += Math.sin(v.jump * Math.PI) * 0.25; rig.root.updateMatrixWorld(true); }
      _hp.set(0, HEAD_Y, 0).applyMatrix4(rig.head.matrixWorld);
      _ht.set(0, HEAD_Y + 0.3, 0).applyMatrix4(rig.head.matrixWorld);
      driveAvatar(e.av, rig, { yaw, scale: SCALE, hipH0: 0.88, flat: false, alpha, floorY: rig.root.position.y, headPt: _hp, headTop: _ht, beat: 0, sing: 0 });
      // vị trí đầu trên màn hình cho lớp chữ 2D
      const hs = toScreen(_v.set(0, HEAD_Y + 0.22, 0).applyMatrix4(rig.head.matrixWorld));
      v.hx = hs.x; v.hy = hs.y;
      const fs = toScreen(_v.set(x, 0, z)); v.fx = fs.x; v.fy = fs.y;
      if (si < CAP) { shadows.setMatrixAt(si++, _m4.compose(_v.set(x, 0.02, z), _q.identity(), _sc.set(1.1, 1, 0.9))); }
    }
    shadows.count = si; shadows.instanceMatrix.needsUpdate = true;
    for (const [id, e] of avs) if (!seen.has(id)) { disposeAvatar(e.av); avs.delete(id); }
  }

  // ---------------- vòng lặp ----------------
  let st = { viewers: [], oil: 80, flick: 1, yin: 0 };
  let curMap = null;
  function setMap(name) {
    if (!SCENES[name]) name = 'dong';
    if (name === curMap) return;
    if (!built[name]) {
      const g = new THREE.Group(); g.visible = false; scene.add(g);
      let update = null;
      try { update = SCENES[name].build(g) || null; } catch (e) { console.warn('Lỗi dựng cảnh', name, e); }
      built[name] = { g, update };
    }
    curMap = name;
    for (const [k, b] of Object.entries(built)) b.g.visible = k === name;
    scene.fog.density = (SCENES[name].fog || 0.04) * 0.72;
  }
  setMap('dong');

  function frame(state) {
    st = state;
    const t = state.t;
    windU.value = t;
    if (state.map && state.map !== curMap) setMap(state.map);
    // đèn dầu
    const lampOn = state.oil > 0 && state.flick > 0;
    lampLight.intensity = lampOn ? (10 + state.oil * 0.6) * state.flick * (0.9 + Math.sin(t * 17) * 0.06 + Math.sin(t * 29) * 0.04) : 0.0;
    lampLight.position.x = L.x + Math.sin(t * 9) * 0.05; lampLight.position.z = L.z + Math.cos(t * 7) * 0.05;   // lửa liếm, bóng rung
    lampGlow.material.opacity = lampOn ? 0.35 + state.oil / 300 : 0;
    lampGlow.scale.setScalar(2.4 + state.oil / 40);
    const y = state.yin / 100;
    rimLight.intensity = y > 0.5 ? (y - 0.5) * 30 : 0;
    hemi.intensity = 1.0 - y * 0.35 + (state.trura ? 1.2 : 0);
    moonLight.intensity = 1.4 - y * 0.5;
    fillLight.intensity = 0.55 - y * 0.2;
    // lá chuối, giẻ bù nhìn
    for (const s of swayers) s.o.rotation.x = s.base + Math.sin(t * 0.9 + s.ph) * s.amp + Math.sin(t * 2.3 + s.ph) * s.amp * 0.3;
    // chuyển động riêng của từng cảnh (bù nhìn quay đầu, xích đu, gàu nước, đèn lồng…)
    const cur = built[curMap]; if (cur && cur.update) cur.update(t, y);
    // ma trơi: âm khí càng cao càng nhiều
    const want = 2 + Math.round(y * 12);
    wisps.forEach((w, i) => {
      w.a += w.sp * 0.016;
      w.s.position.set(L.x + Math.cos(w.a) * w.r, w.y + Math.sin(t * 1.3 + w.ph) * 0.25, L.z - 2 + Math.sin(w.a) * w.r * 0.7);
      const target = i < want ? 0.55 + Math.sin(t * 3 + w.ph) * 0.25 : 0;
      w.s.material.opacity += (target - w.s.material.opacity) * 0.03;
    });
    flies.forEach(f => { f.s.position.set(f.x + Math.sin(t * 0.4 + f.ph) * 1.2, f.y + Math.sin(t * 0.9 + f.ph) * 0.3, f.z + Math.cos(t * 0.35 + f.ph) * 1.2); f.s.material.opacity = Math.max(0, Math.sin(t * 2 + f.ph * 3)) * (1 - y) * 0.9; });
    // nhân vật
    syncAvatars(t);
    // rung màn hình
    if (state.shake) camera.setViewOffset(W, H, state.shake.x, state.shake.y, W, H); else camera.clearViewOffset();
    renderer.render(scene, camera);
  }

  // nạp mô hình người (dùng chung với game sàn nhảy)
  setOutfitMix(10);
  fetch('/api/models').then(r => r.json()).then(list => loadAvatars((list || []).filter(m => m.enabled).map(m => ({ url: m.url, female: m.female })))).then(() => { modelsReady = true; console.log('Cảnh 3D: đã nạp', avatarTemplates.length, 'mô hình người'); }).catch(e => console.warn('Không nạp được mô hình người', e));

  window.MA3D = { ready: true, frame, setMap, ground, maps: Object.keys(SCENES), sceneNames: Object.fromEntries(Object.entries(SCENES).map(([k, v]) => [k, v.name])), avatarCount: () => avs.size, modelsReady: () => modelsReady };
}
