// Sân khấu theo chủ đề: mở khoá khi cả phòng đạt mục tiêu
import * as THREE from 'three';

const PI = Math.PI, TAU = PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

export const THEME_NAMES = { club: 'Vũ trường', beach: 'Bãi biển', space: 'Vũ trụ', tet: 'Tết', halloween: 'Halloween', noel: 'Giáng sinh' };

function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7 }, o));
const glow = c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.4, toneMapped: false });

// ---------- phông nền phía sau ----------
const BACKDROPS = {
  beach: (g, w, h) => {
    const s = g.createLinearGradient(0, 0, 0, h * 0.62); s.addColorStop(0, '#ff7e5f'); s.addColorStop(0.55, '#feb47b'); s.addColorStop(1, '#ffd89b');
    g.fillStyle = s; g.fillRect(0, 0, w, h * 0.62);
    g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(w * 0.5, h * 0.55, h * 0.16, PI, TAU); g.fill();
    const sea = g.createLinearGradient(0, h * 0.62, 0, h); sea.addColorStop(0, '#1fa2c7'); sea.addColorStop(1, '#0b4f6c'); g.fillStyle = sea; g.fillRect(0, h * 0.62, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; for (let i = 0; i < 14; i++) { const y = h * 0.66 + i * 18; g.beginPath(); for (let x = 0; x <= w; x += 20) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 4); g.stroke(); }
  },
  space: (g, w, h) => {
    g.fillStyle = '#03010a'; g.fillRect(0, 0, w, h);
    const n = g.createRadialGradient(w * 0.3, h * 0.4, 10, w * 0.3, h * 0.4, w * 0.5); n.addColorStop(0, 'rgba(140,60,255,0.55)'); n.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = n; g.fillRect(0, 0, w, h);
    const m = g.createRadialGradient(w * 0.75, h * 0.6, 10, w * 0.75, h * 0.6, w * 0.4); m.addColorStop(0, 'rgba(0,200,255,0.4)'); m.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = m; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(255,255,255,${Math.random()})`; g.fillRect(Math.random() * w, Math.random() * h, Math.random() * 2.5, Math.random() * 2.5); }
  },
  tet: (g, w, h) => {
    const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#7a0010'); s.addColorStop(1, '#c8102e'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,215,0,0.25)'; g.lineWidth = 4;
    for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) { const x = i * w / 8, y = j * h / 4; g.beginPath(); g.arc(x, y, 60, 0, TAU); g.stroke(); g.beginPath(); g.arc(x, y, 30, 0, TAU); g.stroke(); }
    g.fillStyle = '#ffd700'; g.font = `900 ${h * 0.14}px "Segoe UI", Arial`; g.textAlign = 'center'; g.fillText('CHÚC MỪNG NĂM MỚI', w / 2, h * 0.2);
  },
  halloween: (g, w, h) => {
    const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#1a0633'); s.addColorStop(1, '#3d0f4a'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(w * 0.78, h * 0.28, h * 0.15, 0, TAU); g.fill();
    g.fillStyle = '#0d0418';
    for (let i = 0; i < 7; i++) { const x = i * w / 6 + rnd(-30, 30), bh = rnd(0.25, 0.5) * h; g.fillRect(x, h - bh, rnd(60, 120), bh); g.beginPath(); g.moveTo(x - 10, h - bh); g.lineTo(x + 45, h - bh - 60); g.lineTo(x + 130, h - bh); g.fill(); }
  },
  noel: (g, w, h) => {
    const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#0b1d3a'); s.addColorStop(1, '#1d4e89'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${rnd(0.3, 1)})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, rnd(1, 3), 0, TAU); g.fill(); }
    g.fillStyle = '#e8f4ff'; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 40) g.lineTo(x, h * 0.85 + Math.sin(x * 0.01) * 20); g.lineTo(w, h); g.fill();
  },
};

// ---------- đạo cụ ----------
function palm(x, z, s) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 5, 10), std(0x8b5a2b)); trunk.position.y = 2.5; trunk.rotation.z = 0.12; g.add(trunk);
  for (let i = 0; i < 7; i++) { const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.6, 4).scale(1, 1, 0.12), std(0x2e8b3a, { side: THREE.DoubleSide })); leaf.position.set(0.3, 5, 0); leaf.rotation.set(0, i / 7 * TAU, 1.9); const p = new THREE.Group(); p.add(leaf); p.rotation.y = i / 7 * TAU; g.add(p); }
  g.position.set(x, 0, z); g.scale.setScalar(s); return g;
}
function lantern(x, y, z) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12).scale(1, 0.8, 1), glow(0xff2a2a)); g.add(body);
  for (const sy of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.1, 12), std(0xffd700, { metalness: 0.9, roughness: 0.3 })); cap.position.y = sy * 0.36; g.add(cap); }
  const tas = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 0.5, 6), std(0xffd700)); tas.position.y = -0.65; g.add(tas);
  g.position.set(x, y, z); g.userData.swing = Math.random() * TAU; return g;
}
function blossomTree(x, z, color) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 2.4, 8), std(0x5a3820)); trunk.position.y = 1.2; g.add(trunk);
  const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 8, 6), glow(color), 120);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 120; i++) { const a = Math.random() * TAU, r = Math.random() * 1.3, y = 2.2 + Math.random() * 1.4; m.makeTranslation(Math.cos(a) * r, y, Math.sin(a) * r); flowers.setMatrixAt(i, m); }
  g.add(flowers); g.position.set(x, 0, z); return g;
}
function pumpkin(x, z, s) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12).scale(1.2, 0.85, 1.2), std(0xff7b00, { emissive: 0x552200, emissiveIntensity: 0.6 })); g.add(b);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.2, 6), std(0x2e5a1a)); stem.position.y = 0.45; g.add(stem);
  for (const sx of [-0.15, 0.15]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.1, 3), glow(0xffe14d)); e.position.set(sx, 0.08, 0.5); e.rotation.x = PI / 2; g.add(e); }
  const mo = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.02), glow(0xffe14d)); mo.position.set(0, -0.12, 0.52); g.add(mo);
  g.position.set(x, 0.38 * s, z); g.scale.setScalar(s); return g;
}
function xmasTree(x, z, s) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.2 - i * 0.25, 1.3, 14), std(0x1f6b2e)); c.position.y = 1 + i * 0.8; g.add(c); }
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), glow(0xffe14d)); star.position.y = 4.3; g.add(star);
  const lights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 4), glow(0xffffff), 50); const m = new THREE.Matrix4(); const col = new THREE.Color();
  for (let i = 0; i < 50; i++) { const y = rnd(0.6, 3.8), r = (1.25 - (y - 0.5) * 0.28), a = Math.random() * TAU; m.makeTranslation(Math.cos(a) * r, y, Math.sin(a) * r); lights.setMatrixAt(i, m); lights.setColorAt(i, col.setHSL(Math.random(), 1, 0.6)); }
  g.add(lights); g.position.set(x, 0, z); g.scale.setScalar(s); return g;
}
function planet(x, y, z, r, c, ring) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), std(c, { emissive: c, emissiveIntensity: 0.35 })));
  if (ring) { const rg = new THREE.Mesh(new THREE.RingGeometry(r * 1.4, r * 2, 48), std(0xe6d3a3, { side: THREE.DoubleSide, emissive: 0x554422, emissiveIntensity: 0.4 })); rg.rotation.x = 1.2; g.add(rg); }
  g.position.set(x, y, z); g.userData.spin = rnd(0.1, 0.4); return g;
}
function particlesField(n, color, size, box) {
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = rnd(-box[0], box[0]); pos[i * 3 + 1] = rnd(0, box[1]); pos[i * 3 + 2] = rnd(-box[2], box[2] * 0.6); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.9, depthWrite: false }));
}
function bat() {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.3, 0.25, 0.6, 0.1); s.quadraticCurveTo(0.45, 0.0, 0.5, -0.1); s.quadraticCurveTo(0.3, 0.0, 0.2, -0.12); s.quadraticCurveTo(0.1, -0.02, 0, -0.08);
  s.quadraticCurveTo(-0.1, -0.02, -0.2, -0.12); s.quadraticCurveTo(-0.3, 0.0, -0.5, -0.1); s.quadraticCurveTo(-0.45, 0.0, -0.6, 0.1); s.quadraticCurveTo(-0.3, 0.25, 0, 0);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: 0x0a0010, side: THREE.DoubleSide }));
  m.userData.bat = { a: Math.random() * TAU, r: rnd(3, 7), y: rnd(4, 8), sp: rnd(0.3, 0.7) }; return m;
}

// ---------- quản lý ----------
export function createThemes(scene, refs) {
  const groups = {};
  let current = 'club';
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(40, 22), new THREE.MeshBasicMaterial({ toneMapped: true }));
  backdrop.position.set(0, 10, -10.49); backdrop.visible = false; scene.add(backdrop);
  const backTex = {};

  function build(name) {
    const g = new THREE.Group();
    if (name === 'beach') {
      for (const [x, z, s] of [[-5.4, -9.2, 0.9], [5.6, -9.0, 1.0], [-4.6, -6.2, 0.55], [4.7, -6.3, 0.6]]) g.add(palm(x, z, s));
    } else if (name === 'space') {
      g.add(planet(-3.9, 9.4, -8, 1.0, 0xff8a3d, true)); g.add(planet(4.1, 8.6, -7, 0.7, 0x3dd9ff)); g.add(planet(1.8, 10.4, -9, 0.4, 0xc084fc));
      const st = particlesField(500, 0xffffff, 0.06, [14, 12, 10]); st.userData.twinkle = true; g.add(st);
    } else if (name === 'tet') {
      for (let i = 0; i < 7; i++) g.add(lantern(-4.5 + i * 1.5, 8.2 - (i % 2) * 0.5, -2));
      for (let i = 0; i < 5; i++) g.add(lantern(-4 + i * 2, 9.6, -6.5));
      g.add(blossomTree(-5.0, -9.0, 0xffd400)); g.add(blossomTree(5.0, -9.0, 0xff8fc8)); g.add(blossomTree(-4.4, -6.2, 0xff8fc8)); g.add(blossomTree(4.4, -6.2, 0xffd400));
    } else if (name === 'halloween') {
      for (const [x, z, s] of [[-4.6, -6.0, 1.1], [-3.2, -5.9, 0.7], [3.3, -5.9, 0.8], [4.6, -6.0, 1.2], [-5.2, -9.0, 1.4], [5.2, -9.0, 1.4]]) g.add(pumpkin(x, z, s));
      for (let i = 0; i < 10; i++) g.add(bat());
    } else if (name === 'noel') {
      g.add(xmasTree(-5.2, -9.0, 1.05)); g.add(xmasTree(5.2, -9.0, 1.05)); g.add(xmasTree(-4.5, -6.2, 0.6)); g.add(xmasTree(4.5, -6.2, 0.6));
      const snow = particlesField(900, 0xffffff, 0.08, [12, 11, 9]); snow.userData.snow = true; g.add(snow);
    }
    for (const o of g.children) if (o.position.z < -5.5 && !o.isPoints && o.position.y < 3) o.position.y += 0.75;
    g.visible = false; scene.add(g); return g;
  }
  const CFG = {
    club: { bg: 0x0a0314, fog: 0x14061f, hue: (k, ix, iz, t, fire) => ((k * 75 + ix * 10 + iz * 7 + (fire ? t * 120 : t * 12)) % 360) / 360, strip: t => null },
    beach: { bg: 0xfeb47b, fog: 0xffc590, hue: (k, ix, iz, t) => [0.12, 0.5, 0.08, 0.55][k] + 0.03 * Math.sin(t + ix), hemi: 1.0 },
    space: { bg: 0x03010a, fog: 0x0a0420, hue: (k, ix, iz, t) => 0.55 + 0.25 * ((k * 0.3 + ix * 0.02 + t * 0.03) % 1) },
    tet: { bg: 0x7a0010, fog: 0x8a1020, hue: (k, ix, iz, t) => [0.0, 0.12, 0.98, 0.14][k] },
    halloween: { bg: 0x1a0633, fog: 0x2a0a40, hue: (k) => [0.07, 0.78, 0.08, 0.3][k] },
    noel: { bg: 0x0b1d3a, fog: 0x16305a, hue: (k) => [0.0, 0.35, 0.58, 0.0][k], sat: k => (k === 3 ? 0.05 : 0.85) },
  };
  return {
    get current() { return current; },
    apply(name) {
      if (!CFG[name]) name = 'club';
      current = name;
      for (const [k, g] of Object.entries(groups)) g.visible = false;
      if (name !== 'club') { if (!groups[name]) groups[name] = build(name); groups[name].visible = true; }
      const c = CFG[name];
      scene.background = new THREE.Color(c.bg);
      scene.fog.color = new THREE.Color(c.fog);
      if (name !== 'club' && BACKDROPS[name]) { if (!backTex[name]) backTex[name] = tex(1600, 880, BACKDROPS[name]); backdrop.material.map = backTex[name]; backdrop.material.needsUpdate = true; backdrop.visible = true; }
      else backdrop.visible = false;
      if (refs.hemi) refs.hemi.intensity = c.hemi || 0.55;
    },
    hue(k, ix, iz, t, fire) { return CFG[current].hue(k, ix, iz, t, fire); },
    sat(k) { const f = CFG[current].sat; return f ? f(k) : 0.9; },
    update(t, dt) {
      const g = groups[current]; if (!g) return;
      g.traverse(o => {
        if (o.userData.swing !== undefined) o.rotation.z = Math.sin(t * 1.5 + o.userData.swing) * 0.12;
        if (o.userData.spin) o.rotation.y += o.userData.spin * dt;
        if (o.userData.bat) { const b = o.userData.bat; b.a += b.sp * dt; o.position.set(Math.cos(b.a) * b.r, b.y + Math.sin(t * 3 + b.r) * 0.3, -3 + Math.sin(b.a) * b.r * 0.5); o.rotation.y = -b.a; o.scale.y = 0.6 + 0.4 * Math.abs(Math.sin(t * 12 + b.r)); }
        if (o.userData.snow) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) - dt * (0.6 + (i % 5) * 0.15); if (y < 0) y = 11; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t + i) * dt * 0.2); } p.needsUpdate = true; }
        if (o.userData.twinkle) o.material.opacity = 0.7 + 0.3 * Math.sin(t * 2);
      });
    },
  };
}
