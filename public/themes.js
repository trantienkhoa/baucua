// Sân khấu theo chủ đề: mở khoá khi cả phòng đạt mục tiêu
import * as THREE from 'three';

const PI = Math.PI, TAU = PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

export const THEME_NAMES = { club: 'Vũ trường', beach: 'Mùa hè · Bãi biển', space: 'Vũ trụ', tet: 'Tết Nguyên Đán', halloween: 'Halloween', noel: 'Giáng sinh',
  xuan: 'Mùa xuân', thu: 'Mùa thu', dong: 'Mùa đông', valentine: 'Valentine 14/2', phunu: 'Ngày Phụ nữ 8/3 · 20/10', thieunhi: 'Quốc tế Thiếu nhi 1/6',
  trungthu: 'Trung thu', quockhanh: 'Quốc khánh 2/9', newyear: 'Năm mới · Countdown' };

// ---------- tự chọn sàn theo ngày (Tết, Trung thu theo âm lịch: bảng ngày dương 2025–2032) ----------
const TET = { 2025: '01-29', 2026: '02-17', 2027: '02-06', 2028: '01-26', 2029: '02-13', 2030: '02-03', 2031: '01-23', 2032: '02-11' };
const TRUNGTHU = { 2025: '10-06', 2026: '09-25', 2027: '09-15', 2028: '10-03', 2029: '09-22', 2030: '09-12', 2031: '10-01', 2032: '09-19' };
export function themeForDate(d = new Date()) {
  const y = d.getFullYear(), md = (d.getMonth() + 1) * 100 + d.getDate();
  const near = (tbl, before, after) => { const v = tbl[y]; if (!v) return false; const [m, dd] = v.split('-').map(Number); const diff = (d - new Date(y, m - 1, dd)) / 864e5; return diff >= -before && diff < after + 1; };
  const inR = (a, b) => md >= a && md <= b;
  if (near(TET, 10, 7)) return 'tet';
  if (near(TRUNGTHU, 10, 1)) return 'trungthu';
  if (inR(1228, 1231) || inR(101, 102)) return 'newyear';
  if (inR(210, 215)) return 'valentine';
  if (inR(305, 309) || inR(1017, 1021)) return 'phunu';
  if (inR(529, 602)) return 'thieunhi';
  if (inR(830, 903)) return 'quockhanh';
  if (inR(1025, 1101)) return 'halloween';
  if (inR(1215, 1227)) return 'noel';
  const m = d.getMonth() + 1;
  return m >= 2 && m <= 4 ? 'xuan' : m >= 5 && m <= 8 ? 'beach' : m >= 9 && m <= 11 ? 'thu' : 'dong';
}

function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7 }, o));
const glow = c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.4, toneMapped: false });

// ---------- phông nền phía sau ----------
// chữ tiêu đề: vừa phần giữa (khung dọc 9:16 chỉ thấy giữa màn LCD), viền tối cho dễ đọc
function title(g, w, h, text, y, color) {
  let size = h * 0.15; g.font = `900 ${size}px "Segoe UI", Arial`;
  while (g.measureText(text).width > w * 0.46 && size > 20) { size -= 2; g.font = `900 ${size}px "Segoe UI", Arial`; }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = size * 0.12; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.strokeText(text, w / 2, h * y);
  g.fillStyle = color; g.fillText(text, w / 2, h * y);
}
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
    title(g, w, h, 'CHÚC MỪNG NĂM MỚI', 0.2, '#ffd700');
  },
  halloween: (g, w, h) => {
    const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#1a0633'); s.addColorStop(1, '#3d0f4a'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(w * 0.78, h * 0.28, h * 0.15, 0, TAU); g.fill();
    g.fillStyle = '#0d0418';
    for (let i = 0; i < 7; i++) { const x = i * w / 6 + rnd(-30, 30), bh = rnd(0.25, 0.5) * h; g.fillRect(x, h - bh, rnd(60, 120), bh); g.beginPath(); g.moveTo(x - 10, h - bh); g.lineTo(x + 45, h - bh - 60); g.lineTo(x + 130, h - bh); g.fill(); }
  },
  xuan: (g, w, h) => {
    const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#ffd6e8'); s.addColorStop(0.6, '#fff3d6'); s.addColorStop(1, '#bfe8b0'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(120,190,110,0.7)'; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 30) g.lineTo(x, h * 0.78 + Math.sin(x * 0.006) * 40); g.lineTo(w, h); g.fill();
    for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(255,${120 + Math.random() * 80},${170 + Math.random() * 60},${rnd(0.4, 0.9)})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h * 0.8, rnd(3, 7), rnd(2, 4), Math.random() * PI, 0, TAU); g.fill(); }
    title(g, w, h, 'XUÂN VỀ RỘN RÃ', 0.2, '#d6336c');
  },
  thu: (g, w, h) => {
    const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#5a2a0a'); s.addColorStop(0.5, '#c4621a'); s.addColorStop(1, '#f2b04a'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,230,170,0.85)'; g.beginPath(); g.arc(w * 0.2, h * 0.3, h * 0.11, 0, TAU); g.fill();
    for (let i = 0; i < 260; i++) { g.fillStyle = `hsla(${rnd(10, 45)},90%,${rnd(40, 60)}%,${rnd(0.5, 1)})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, rnd(4, 9), rnd(2, 5), Math.random() * PI, 0, TAU); g.fill(); }
    title(g, w, h, 'HÀ NỘI MÙA THU', 0.2, '#fff1c9');
  },
  dong: (g, w, h) => {
    const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#16233f'); s.addColorStop(1, '#5f82ad'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    g.fillStyle = '#eef6ff'; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 40) g.lineTo(x, h * 0.6 + Math.abs(Math.sin(x * 0.004)) * -160 + 80); g.lineTo(w, h); g.fill();
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${rnd(0.3, 1)})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, rnd(1, 3.5), 0, TAU); g.fill(); }
  },
  valentine: (g, w, h) => {
    const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#5a0a3a'); s.addColorStop(1, '#ff4d8d'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    const heart = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, y + r * 0.3); g.bezierCurveTo(x - r, y - r * 0.6, x - r * 0.5, y - r * 1.2, x, y - r * 0.5); g.bezierCurveTo(x + r * 0.5, y - r * 1.2, x + r, y - r * 0.6, x, y + r * 0.3); g.fill(); };
    for (let i = 0; i < 70; i++) heart(Math.random() * w, Math.random() * h, rnd(10, 40), `rgba(255,${rnd(120, 200)},${rnd(170, 220)},${rnd(0.3, 0.8)})`);
    title(g, w, h, 'HAPPY VALENTINE', 0.2, '#fff0f6');
  },
  phunu: (g, w, h) => {
    const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#7a1048'); s.addColorStop(1, '#f7a1c4'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const x = Math.random() * w, y = Math.random() * h, r = rnd(8, 22); for (let k = 0; k < 5; k++) { g.fillStyle = `rgba(${rnd(220, 255)},${rnd(40, 120)},${rnd(90, 150)},0.55)`; g.beginPath(); g.arc(x + Math.cos(k * 1.26) * r * 0.6, y + Math.sin(k * 1.26) * r * 0.6, r * 0.6, 0, TAU); g.fill(); } }
    title(g, w, h, 'TÔN VINH PHÁI ĐẸP', 0.2, '#fff6fa');
  },
  thieunhi: (g, w, h) => {
    const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#4fc3ff'); s.addColorStop(1, '#c9f0ff'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { const x = rnd(0, w), y = rnd(h * 0.3, h * 0.7); g.fillStyle = 'rgba(255,255,255,0.9)'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + k * 34 - 68, y + Math.sin(k) * 12, rnd(30, 48), 0, TAU); g.fill(); } }
    g.fillStyle = '#ffd400'; g.beginPath(); g.arc(w * 0.85, h * 0.22, h * 0.1, 0, TAU); g.fill();
    title(g, w, h, 'VUI TẾT THIẾU NHI 1/6', 0.2, '#ff4081');
  },
  trungthu: (g, w, h) => {
    const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#060a2a'); s.addColorStop(1, '#22205a'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    const m = g.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.42, h * 0.34); m.addColorStop(0, '#fff6c8'); m.addColorStop(0.75, '#ffd76a'); m.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = m; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(190,150,60,0.35)'; for (const [x, y, r] of [[0.46, 0.38, 40], [0.55, 0.47, 28], [0.5, 0.52, 18]]) { g.beginPath(); g.arc(w * x, h * y, r, 0, TAU); g.fill(); }
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${Math.random()})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    title(g, w, h, 'RƯỚC ĐÈN TRUNG THU', 0.16, '#ffd76a');
  },
  quockhanh: (g, w, h) => {
    g.fillStyle = '#da251d'; g.fillRect(0, 0, w, h);
    const star = (cx, cy, R, c) => { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? R * 0.382 : R, a = -PI / 2 + i * PI / 5; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fill(); };
    star(w / 2, h * 0.52, h * 0.28, '#ffff00');
    title(g, w, h, 'MỪNG QUỐC KHÁNH 2/9', 0.14, '#ffff00');
  },
  newyear: (g, w, h) => {
    const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#02020f'); s.addColorStop(1, '#141a40'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) { const cx = rnd(0.1, 0.9) * w, cy = rnd(0.15, 0.5) * h, hue = rnd(0, 360); for (let k = 0; k < 40; k++) { const a = k / 40 * TAU, r = rnd(40, 110); g.strokeStyle = `hsla(${hue},100%,65%,0.8)`; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke(); } }
    g.fillStyle = '#0a0a18'; for (let x = 0; x < w; x += rnd(40, 90)) { const bh = rnd(0.12, 0.35) * h; g.fillRect(x, h - bh, rnd(35, 80), bh); }
    title(g, w, h, 'HAPPY NEW YEAR', 0.2, '#ffd76a');
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
function heart3D(x, y, z, s, c) {
  const sh = new THREE.Shape(); sh.moveTo(0, -0.3); sh.bezierCurveTo(-1, 0.4, -0.5, 1.1, 0, 0.55); sh.bezierCurveTo(0.5, 1.1, 1, 0.4, 0, -0.3);
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 }).center(), glow(c));
  m.position.set(x, y, z); m.scale.setScalar(s); m.userData.bob = Math.random() * TAU; return m;
}
function starLantern(x, y, z, c) {   // đèn ông sao 5 cánh
  const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.2 : 0.5, a = PI / 2 + i * PI / 5; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.04, bevelSegments: 1 }).center(), glow(c)));
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6), std(0x8b5a2b)); stick.position.y = 1.0; g.add(stick);
  g.position.set(x, y, z); g.userData.swing = Math.random() * TAU; return g;
}
function balloon(x, y, z, c) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12).scale(1, 1.2, 1), std(c, { roughness: 0.25, emissive: c, emissiveIntensity: 0.35 })); g.add(b);
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.6, 4), std(0xffffff)); str.position.y = -1.18; g.add(str);
  g.position.set(x, y, z); g.userData.bob = Math.random() * TAU; return g;
}
function bareTree(x, z, s) {
  const g = new THREE.Group(), wood = std(0x4a3a30), snow = std(0xf4f8ff, { emissive: 0x334455, emissiveIntensity: 0.3 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 2.6, 8), wood); trunk.position.y = 1.3; g.add(trunk);
  for (let i = 0; i < 9; i++) { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, 1.2, 5), wood); br.position.set(0, 1.6 + i * 0.15, 0); br.rotation.set(rnd(-1, 1), i * 2.4, rnd(0.6, 1.1)); br.translateY(0.5); g.add(br);
    const sn = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), snow); sn.position.copy(br.position); sn.position.y += 0.1; g.add(sn); }
  g.position.set(x, 0, z); g.scale.setScalar(s); return g;
}
function flagPole(x, z) {   // cờ đỏ sao vàng bay phấp phới
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4, 8), std(0xd9d9d9, { metalness: 0.8, roughness: 0.3 })); pole.position.y = 2; g.add(pole);
  const ft = tex(150, 100, (c, w, h) => { c.fillStyle = '#da251d'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffff00'; c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 14 : 36, a = -PI / 2 + i * PI / 5; c.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); } c.closePath(); c.fill(); });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8, 12, 1), new THREE.MeshStandardMaterial({ map: ft, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: ft, emissiveIntensity: 0.3 }));
  fl.position.set(0.62, 3.55, 0); fl.userData.flag = true; g.add(fl);
  g.position.set(x, 0, z); return g;
}
function bouquet(x, z, s, c) {
  const g = new THREE.Group();
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.6, 16), std(0xf0f0f5, { roughness: 0.2, metalness: 0.2 })); vase.position.y = 0.3; g.add(vase);
  const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), glow(c), 40), m = new THREE.Matrix4();
  for (let i = 0; i < 40; i++) { const a = Math.random() * TAU, r = Math.random() * 0.45; m.makeTranslation(Math.cos(a) * r, 0.9 + Math.random() * 0.5, Math.sin(a) * r); fl.setMatrixAt(i, m); }
  g.add(fl); g.position.set(x, 0, z); g.scale.setScalar(s); return g;
}
function fireworks() {   // pháo hoa 3D nổ định kỳ trên cao
  const n = 900, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  p.frustumCulled = false; p.userData.fw = { bursts: [], next: 0, vel: new Float32Array(n * 3), life: new Float32Array(n), cursor: 0 };
  for (let i = 0; i < n; i++) pos[i * 3 + 1] = -100;
  return p;
}
function falling(n, color, size, opts = {}) {   // cánh hoa / lá / tuyết rơi
  const f = particlesField(n, color, size, [12, 11, 9]); f.userData.fall = Object.assign({ speed: 0.6, sway: 0.3 }, opts);
  if (opts.rise) { f.userData.fall.rise = true; }
  return f;
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
    } else if (name === 'xuan') {
      g.add(blossomTree(-5.0, -9.0, 0xff8fc8)); g.add(blossomTree(5.0, -9.0, 0xffd400)); g.add(blossomTree(-4.4, -6.2, 0xffb3d9)); g.add(blossomTree(4.4, -6.2, 0xff8fc8));
      g.add(falling(450, 0xffa6cf, 0.09, { speed: 0.45, sway: 0.6 }));
    } else if (name === 'thu') {
      g.add(blossomTree(-5.0, -9.0, 0xff7a1a)); g.add(blossomTree(5.0, -9.0, 0xe8a317)); g.add(blossomTree(-4.4, -6.2, 0xd9480f)); g.add(blossomTree(4.4, -6.2, 0xff9f1c));
      g.add(falling(420, 0xff8c1a, 0.11, { speed: 0.55, sway: 0.8 }));
    } else if (name === 'dong') {
      for (const [x, z, s] of [[-5.2, -9.0, 1.1], [5.2, -9.0, 1.1], [-4.5, -6.2, 0.7], [4.5, -6.2, 0.7]]) g.add(bareTree(x, z, s));
      g.add(falling(1100, 0xffffff, 0.08, { speed: 0.7, sway: 0.25 }));
    } else if (name === 'valentine') {
      for (let i = 0; i < 9; i++) g.add(heart3D(-4.8 + i * 1.2, 7.6 + (i % 3) * 0.7, -3 - (i % 2) * 3, 0.55 + (i % 3) * 0.15, [0xff2d6f, 0xff7ab8, 0xff4d8d][i % 3]));
      g.add(falling(260, 0xff6fa5, 0.12, { speed: 0.5, rise: true }));
    } else if (name === 'phunu') {
      for (const [x, z, s, c] of [[-4.6, -6.1, 0.9, 0xff2d6f], [4.6, -6.1, 0.9, 0xff8fc8], [-5.3, -9.0, 1.2, 0xff4d8d], [5.3, -9.0, 1.2, 0xffffff]]) g.add(bouquet(x, z, s, c));
      g.add(falling(380, 0xff4d7a, 0.1, { speed: 0.45, sway: 0.7 }));
    } else if (name === 'thieunhi') {
      const cols = [0xff3d7f, 0xffd84d, 0x2fa8ff, 0x29d17d, 0x9b5cff, 0xff8a3d];
      for (let i = 0; i < 16; i++) g.add(balloon(rnd(-5.5, 5.5), rnd(6.5, 9.5), rnd(-8, -2), cols[i % cols.length]));
    } else if (name === 'trungthu') {
      const cols = [0xff3d3d, 0xffd400, 0xff8a1a, 0xff4dc4];
      for (let i = 0; i < 7; i++) g.add(starLantern(-4.5 + i * 1.5, 7.9 - (i % 2) * 0.5, -2, cols[i % 4]));
      for (let i = 0; i < 4; i++) g.add(lantern(-3 + i * 2, 9.4, -6.5));
    } else if (name === 'quockhanh') {
      for (const [x, z] of [[-5.4, -9.0], [5.4, -9.0], [-4.6, -6.2], [4.6, -6.2]]) g.add(flagPole(x, z));
      for (let i = 0; i < 6; i++) g.add(lantern(-4 + i * 1.6, 8.6 - (i % 2) * 0.4, -2));
      g.add(fireworks());
    } else if (name === 'newyear') {
      g.add(fireworks());
      const cols = [0xffd76a, 0xc0c0c0, 0xffffff];
      for (let i = 0; i < 12; i++) g.add(balloon(rnd(-5.5, 5.5), rnd(7, 9.8), rnd(-8, -2), cols[i % 3]));
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
    xuan: { bg: 0xffd6e8, fog: 0xffe2ef, hue: (k, ix, iz, t) => [0.92, 0.13, 0.3, 0.95][k] + 0.02 * Math.sin(t + ix), hemi: 0.95 },
    thu: { bg: 0x5a2a0a, fog: 0x7a3a12, hue: (k, ix, iz, t) => [0.06, 0.1, 0.02, 0.13][k] + 0.015 * Math.sin(t * 0.7 + iz), hemi: 0.75 },
    dong: { bg: 0x16233f, fog: 0x34507a, hue: (k) => [0.58, 0.55, 0.62, 0.6][k], sat: k => (k === 1 ? 0.15 : 0.7), hemi: 0.85 },
    valentine: { bg: 0x5a0a3a, fog: 0x7a1a50, hue: (k, ix, iz, t) => [0.95, 0.9, 0.0, 0.85][k] + 0.02 * Math.sin(t * 2 + ix) },
    phunu: { bg: 0x7a1048, fog: 0x9a2060, hue: (k) => [0.93, 0.88, 0.97, 0.83][k] },
    thieunhi: { bg: 0x4fc3ff, fog: 0x8fd8ff, hue: (k, ix, iz, t) => ((k * 0.25 + ix * 0.05 + t * 0.05) % 1), hemi: 1.0 },
    trungthu: { bg: 0x060a2a, fog: 0x161a4a, hue: (k) => [0.12, 0.08, 0.0, 0.15][k] },
    quockhanh: { bg: 0xda251d, fog: 0x8a1010, hue: (k) => [0.0, 0.15, 0.0, 0.15][k] },
    newyear: { bg: 0x02020f, fog: 0x0a0a28, hue: (k, ix, iz, t, fire) => ((k * 75 + ix * 10 + iz * 7 + t * 40) % 360) / 360 },
    noel: { bg: 0x0b1d3a, fog: 0x16305a, hue: (k) => [0.0, 0.35, 0.58, 0.0][k], sat: k => (k === 3 ? 0.05 : 0.85) },
  };
  return {
    get current() { return current; },
    /** tranh nền của sàn hiện tại (canvas) — màn LCD chiếu khi ở chế độ sóng nhạc */
    get art() { return current !== 'club' && backTex[current] ? backTex[current].image : null; },
    apply(name) {
      if (name === 'auto') name = themeForDate();
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
        if (o.userData.bob !== undefined) { o.position.y += Math.sin(t * 1.3 + o.userData.bob) * dt * 0.15; o.rotation.y = Math.sin(t * 0.8 + o.userData.bob) * 0.4; }
        if (o.userData.flag) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 0.6; p.setZ(i, Math.sin(x * 4 - t * 5) * 0.08 * x); } p.needsUpdate = true; }
        if (o.userData.fall) {
          const f = o.userData.fall, p = o.geometry.attributes.position;
          for (let i = 0; i < p.count; i++) {
            let y = p.getY(i) + (f.rise ? 1 : -1) * dt * f.speed * (0.7 + (i % 5) * 0.15);
            if (!f.rise && y < 0) y = 11; if (f.rise && y > 11) y = 0;
            p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t * 0.8 + i) * dt * f.sway);
          }
          p.needsUpdate = true;
        }
        if (o.userData.fw) {
          const F = o.userData.fw, pos = o.geometry.attributes.position, col = o.geometry.attributes.color, n = pos.count;
          if (t > F.next) {
            F.next = t + rnd(0.6, 1.6);
            const cx = rnd(-6, 6), cy = rnd(7, 11), cz = rnd(-9, -4), c = new THREE.Color().setHSL(Math.random(), 1, 0.6);
            for (let k = 0; k < 120; k++) {
              const i = F.cursor; F.cursor = (F.cursor + 1) % n;
              const a = Math.random() * TAU, b = Math.acos(rnd(-1, 1)), sp = rnd(2, 3.5);
              pos.setXYZ(i, cx, cy, cz); F.vel[i * 3] = Math.sin(b) * Math.cos(a) * sp; F.vel[i * 3 + 1] = Math.cos(b) * sp; F.vel[i * 3 + 2] = Math.sin(b) * Math.sin(a) * sp;
              F.life[i] = rnd(1.2, 1.8); col.setXYZ(i, c.r, c.g, c.b);
            }
          }
          for (let i = 0; i < n; i++) {
            if (F.life[i] <= 0) continue;
            F.life[i] -= dt; F.vel[i * 3 + 1] -= dt * 1.6;
            pos.setXYZ(i, pos.getX(i) + F.vel[i * 3] * dt, pos.getY(i) + F.vel[i * 3 + 1] * dt, pos.getZ(i) + F.vel[i * 3 + 2] * dt);
            const k = Math.max(0, Math.min(1, F.life[i])); col.setXYZ(i, col.getX(i) * (0.985), col.getY(i) * 0.985, col.getZ(i) * 0.985);
            if (F.life[i] <= 0) pos.setY(i, -100);
          }
          pos.needsUpdate = true; col.needsUpdate = true;
        }
      });
    },
  };
}
