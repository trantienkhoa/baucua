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
  const lampLight = new THREE.PointLight(0xffa24a, 40, 0, 1.6); lampLight.position.set(L.x, 1.0, L.z); scene.add(lampLight);
  const rimLight = new THREE.PointLight(0x6680ff, 0, 0, 2); rimLight.position.set(L.x, 3, L.z - 6); scene.add(rimLight);   // ánh ma lạnh khi âm khí cao

  // ---------------- mặt đất, chiếu ----------------
  const groundMat = new THREE.MeshLambertMaterial({ map: soilTex, color: 0xc8b8a0 });
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), groundMat); gnd.rotation.x = -Math.PI / 2; scene.add(gnd);
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 7.4), new THREE.MeshLambertMaterial({ map: matTex }));
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

  // ---------------- hai bản đồ ----------------
  const maps = { dong: new THREE.Group(), chuoi: new THREE.Group() };
  for (const g of Object.values(maps)) { g.visible = false; scene.add(g); }
  // ĐỒNG LÚA: ruộng lúa đêm, bù nhìn, mả đất bên bờ ruộng, đống rơm, cây chết
  {
    const g = maps.dong;
    const dike = (x0, z0, len, rot) => { const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.28, 0.7), gMat(0x2e2418)); b.position.set(x0, 0.14, z0); b.rotation.y = rot; g.add(b); };
    dike(L.x, L.z - 9.5, 80, 0); dike(L.x - 8, L.z - 20, 0.7, 0); dike(L.x + 9.5, L.z - 10, 60, Math.PI / 2); dike(L.x - 10, L.z - 10, 60, Math.PI / 2);
    field(g, { h: 0.75, r: 34, step: 0.42, jit: 0.08, clear: 5.6, fill: 0.95, hue: 0.17, color: 0x9aa060,
      skip: (x, z) => Math.abs(z - (L.z - 9.5)) < 0.6 || Math.abs(x - (L.x + 9.5)) < 0.6 || Math.abs(x - (L.x - 10)) < 0.6 || Math.hypot(x - M.x, z - M.z) < 1.4 });
    field(g, { h: 0.55, step: 0.32, jit: 0.1, fill: 0.9, hue: 0.16, color: 0xa8a868, rect: [L.x - 6, L.x + 6, L.z + 3.25, L.z + 4.9] });
    scarecrow(g, L.x + 4.6, L.z - 12.5);
    grave(g, L.x - 6.5, L.z - 10.8); grave(g, L.x - 4.6, L.z - 11.8, 0.8); grave(g, L.x - 8.6, L.z - 13, 1.1);
    strawPile(g, L.x + 8.5, L.z - 4.5, 0.9); strawPile(g, L.x - 9.5, L.z - 4, 1.1); strawPile(g, L.x + 12, L.z - 17, 1.2);
    deadTree(g, L.x - 12, L.z - 17);
    for (const [dx, dz, h] of [[7.5, -15, 3.6], [8.6, -16.5, 3.2], [6.4, -17, 4], [-14, -9, 3.4], [-15.5, -11, 3.8]]) bananaTree(g, L.x + dx, L.z + dz, h);
    stake(g, M.x, M.z);
    bananaTree(g, M.x + 1.6, M.z - 1.2, 3.4);
  }
  // BỤI CHUỐI SAU NHÀ: chuối mọc dày quanh vòng, giếng cạn, hàng rào tre, căn chòi tối
  {
    const g = maps.chuoi;
    field(g, { h: 0.45, r: 16, step: 0.55, jit: 0.2, clear: 5.4, fill: 0.55, hue: 0.22, color: 0x6a8040 });
    let n = 0;
    for (let i = 0; i < 400 && n < 46; i++) {
      const a = srand(0, TAU), r = srand(6.2, 13);
      const x = L.x + Math.cos(a) * r, z = L.z + Math.sin(a) * r * 0.9;
      if (z > L.z + 1.5) continue;                       // không che máy quay
      if (Math.hypot(x - M.x, z - M.z) < 1.6) continue;  // chừa chỗ tấm gương
      if (Math.hypot(x - (L.x - 4.8), z - (L.z - 6.8)) < 1.5) continue;
      bananaTree(g, x, z, srand(3.2, 4.6)); n++;
    }
    field(g, { h: 0.4, step: 0.38, jit: 0.15, fill: 0.75, hue: 0.24, color: 0x7a9048, rect: [L.x - 6, L.x + 6, L.z + 3.25, L.z + 4.9] });
    for (const [dx, dz] of [[-6.5, 0.5], [6.8, 0.2], [-7.5, -2], [7.6, -2.5]]) bananaTree(g, L.x + dx, L.z + dz, srand(3.6, 4.4));
    bananaTree(g, M.x + 1.1, M.z - 0.9, 4.2); bananaTree(g, M.x - 1.2, M.z - 1.1, 3.8);
    stake(g, M.x, M.z);
    well(g, L.x - 4.8, L.z - 6.8);
    fence(g, L.x - 14, L.z - 15, L.x + 14, L.z - 15);
    hut(g, L.x + 9, L.z - 19);
    grave(g, L.x + 5.4, L.z - 8.4, 0.85);
  }

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
  lampGlow.position.set(L.x, 0.9, L.z); lampGlow.scale.setScalar(3.2); scene.add(lampGlow);

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
    if (!maps[name]) name = 'dong';
    if (name === curMap) return;
    curMap = name;
    for (const [k, g] of Object.entries(maps)) g.visible = k === name;
    scene.fog.density = name === 'chuoi' ? 0.045 : 0.034;
  }
  setMap('dong');

  function frame(state) {
    st = state;
    const t = state.t;
    windU.value = t;
    if (state.map && state.map !== curMap) setMap(state.map);
    // đèn dầu
    const lampOn = state.oil > 0 && state.flick > 0;
    lampLight.intensity = lampOn ? (12 + state.oil * 0.55) * state.flick : 0.0;
    lampGlow.material.opacity = lampOn ? 0.35 + state.oil / 300 : 0;
    lampGlow.scale.setScalar(2.4 + state.oil / 40);
    const y = state.yin / 100;
    rimLight.intensity = y > 0.5 ? (y - 0.5) * 30 : 0;
    hemi.intensity = 1.0 - y * 0.35 + (state.trura ? 1.2 : 0);
    moonLight.intensity = 1.4 - y * 0.5;
    fillLight.intensity = 0.55 - y * 0.2;
    // lá chuối, giẻ bù nhìn
    for (const s of swayers) s.o.rotation.x = s.base + Math.sin(t * 0.9 + s.ph) * s.amp + Math.sin(t * 2.3 + s.ph) * s.amp * 0.3;
    // bù nhìn quay đầu nhìn về phía mình khi âm khí cao
    if (scarecrowHead) {
      const want = y > 0.65 && Math.sin(t * 0.21) > 0.2 ? 1.0 : 0;
      scarecrowHead.head.rotation.y += (want - scarecrowHead.head.rotation.y) * 0.02;
      for (const e of scarecrowHead.eyes) e.material.color.setHex(want && y > 0.8 ? 0xff2a1a : 0x110000);
    }
    if (hutWindow) hutWindow.material.color.setHex(y > 0.6 && Math.sin(t * 0.5) > 0.6 ? 0xff5a20 : 0x331a08);
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

  window.MA3D = { ready: true, frame, setMap, ground, maps: Object.keys(maps), avatarCount: () => avs.size, modelsReady: () => modelsReady };
}
