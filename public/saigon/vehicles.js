import { THREE } from './three.js';
import { glowTexture, shadowTexture, cashTexture, neonTexture, R } from './util.js';

// ---------- 7 cấp theo tổng xu đã tặng: nhân vật đi bộ, rồi được đứng trên bệ ngày càng xịn ----------
export const TIERS = [
  { min: 0,    name: 'Đi bộ dạo phố',      icon: '🚶', speed: 4.4 },
  { min: 10,   name: 'Xe điện cân bằng',   icon: '🛹', speed: 10 },
  { min: 50,   name: 'Xe mui trần',        icon: '🚗', speed: 14 },
  { min: 150,  name: 'Siêu xe mui trần',   icon: '🏎️', speed: 18 },
  { min: 400,  name: 'Xe hoa diễu hành',   icon: '🎉', speed: 8 },
  { min: 1000, name: 'Khinh khí cầu',      icon: '🎈', speed: 0.12, air: true },
  { min: 3000, name: 'Đứng trên Rồng Vàng', icon: '🐉', speed: 0.22, air: true },
];
export const tierOf = coins => { let t = 0; for (let i = 0; i < TIERS.length; i++) if (coins >= TIERS[i].min) t = i; return t; };

const G = {
  box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12), sph: new THREE.SphereGeometry(0.5, 12, 10),
  half: new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), cone: new THREE.ConeGeometry(0.5, 1, 10), plane: new THREE.PlaneGeometry(1, 1),
};
const M = {};
const lam = c => (M[c] ||= new THREE.MeshLambertMaterial({ color: c }));
const phong = (c, sh = 80) => (M['p' + c + sh] ||= new THREE.MeshPhongMaterial({ color: c, shininess: sh, specular: 0x666666 }));
const basic = c => (M['b' + c] ||= new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
const SKIN = [0xf1c7a0, 0xe0ac80, 0xc68a5e, 0xf6d4b8];

function part(geo, mat, x, y, z, sx, sy, sz, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m; }
function wheel(parent, x, y, z, r, w) { const m = part(G.cyl, lam(0x161616), x, y, z, r * 2, w, r * 2, parent); m.rotation.order = 'ZYX'; m.rotation.z = Math.PI / 2; parent.userData.wheels.push(m); return m; }
export function glowDisc(color, size, opacity = 0.8) {
  const m = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map: glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.scale.set(size, size, 1); return m;
}
function blob(size) { const m = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.12; m.scale.set(size, size * 1.6, 1); return m; }

// người lái: áo màu phe, mũ bảo hiểm
function rider(parent, y, z, color, helmet, lean = 0.2) {
  const g = new THREE.Group(); g.position.set(0, y, z); g.rotation.x = lean; parent.add(g);
  part(G.box, lam(color), 0, 1.4, 0, 1.6, 2.2, 1.1, g);
  part(G.box, lam(0x23262e), -0.45, 0.2, 0.5, 0.6, 1.6, 0.6, g).rotation.x = -1.2;
  part(G.box, lam(0x23262e), 0.45, 0.2, 0.5, 0.6, 1.6, 0.6, g).rotation.x = -1.2;
  const a1 = part(G.box, lam(color), -0.95, 1.6, 0.8, 0.45, 0.45, 1.8, g); a1.rotation.x = 0.3;
  const a2 = part(G.box, lam(color), 0.95, 1.6, 0.8, 0.45, 0.45, 1.8, g); a2.rotation.x = 0.3;
  part(G.sph, lam(SKIN[Math.floor(Math.random() * SKIN.length)]), 0, 2.9, 0, 1.1, 1.2, 1.1, g);
  part(G.half, phong(helmet), 0, 3.05, 0, 1.35, 1.25, 1.35, g);
  part(G.box, basic(0x111111), 0, 2.95, 0.55, 0.9, 0.3, 0.1, g);
  return g;
}

// ---------- xe của người chơi ----------
export function buildVehicle(tier, color, glow) {
  const g = new THREE.Group(); g.userData.wheels = []; g.userData.tier = tier;
  const body = new THREE.Group(); g.add(body); g.userData.body = body; body.userData.wheels = g.userData.wheels;
  const t = TIERS[tier];
  if (tier === 0) {           // xe số cổ
    part(G.box, phong(color), 0, 1.6, 0.2, 1.1, 1.0, 3.4, body);
    part(G.box, lam(0x2a2a2a), 0, 2.2, -0.6, 1.0, 0.35, 2.0, body);
    part(G.box, phong(0xdddddd), 0, 2.4, 1.9, 1.4, 0.2, 0.2, body);
    part(G.sph, basic(0xfff3c0), 0, 2.1, 2.1, 0.6, 0.6, 0.4, body);
    wheel(body, 0, 0.9, 1.9, 0.9, 0.35); wheel(body, 0, 0.9, -1.7, 0.9, 0.35);
    rider(body, 1.6, -0.5, color, color, 0.15);
    g.add(blob(4));
  } else if (tier === 1) {    // tay ga độ: dáng tròn + đèn LED
    part(G.sph, phong(color), 0, 1.7, -0.6, 1.6, 1.4, 3.4, body);
    part(G.box, phong(color), 0, 1.3, 0.8, 1.3, 0.6, 2.4, body);
    part(G.box, phong(color), 0, 2.4, 1.8, 1.2, 1.6, 0.6, body);
    part(G.box, basic(0x7ff6ff), 0, 2.6, 2.12, 1.0, 0.25, 0.1, body);
    wheel(body, 0, 0.8, 1.9, 0.8, 0.5); wheel(body, 0, 0.8, -1.8, 0.8, 0.5);
    rider(body, 1.6, -0.6, color, 0xffffff, 0.05);
    const d = glowDisc(glow, 7, 0.55); d.position.y = 0.15; g.add(d);
    g.add(blob(4.4));
  } else if (tier === 2) {    // phân khối lớn
    part(G.box, phong(color, 120), 0, 2.0, 0.6, 1.3, 1.2, 3.0, body);
    part(G.box, phong(0x1a1a1a), 0, 1.5, -0.4, 1.1, 1.0, 2.2, body);
    part(G.box, phong(color, 120), 0, 2.4, -1.6, 0.9, 0.5, 1.4, body);
    part(G.box, phong(0x99ccff), 0, 3.0, 1.9, 1.0, 0.8, 0.2, body).rotation.x = -0.5;
    part(G.cyl, phong(0xcccccc), 0.6, 1.2, -2.2, 0.4, 1.4, 0.4, body).rotation.x = Math.PI / 2;
    part(G.sph, basic(0xffffff), 0, 2.2, 2.2, 0.8, 0.5, 0.3, body);
    wheel(body, 0, 1.0, 2.3, 1.05, 0.7); wheel(body, 0, 1.0, -2.1, 1.05, 0.8);
    rider(body, 1.9, -0.7, color, 0x111111, 0.45);
    const d = glowDisc(glow, 8, 0.6); d.position.y = 0.15; g.add(d);
    g.add(blob(5)); g.userData.exhaust = new THREE.Vector3(0.6, 1.2, -3);
  } else if (tier === 3) {    // mui trần
    part(G.box, phong(color, 110), 0, 1.5, 0, 4.6, 1.5, 9.4, body);
    part(G.box, phong(color, 110), 0, 2.3, 2.6, 4.4, 0.4, 3.6, body);
    part(G.box, phong(0x9fd8ff), 0, 3.0, 1.0, 4.2, 1.1, 0.15, body).rotation.x = -0.5;
    part(G.box, lam(0x3a2a20), 0, 2.4, -1.3, 4.0, 0.6, 3.2, body);
    for (const x of [-1.6, 1.6]) { part(G.box, basic(0xfff6d0), x, 1.6, 4.72, 0.9, 0.4, 0.1, body); part(G.box, basic(0xff2a2a), x, 1.7, -4.72, 0.9, 0.35, 0.1, body); }
    for (const x of [-2.2, 2.2]) for (const z of [3, -3]) wheel(body, x, 0.95, z, 0.95, 0.7);
    const rd = rider(body, 1.2, -1.2, color, 0xffffff, 0); rd.scale.setScalar(0.95);
    const d = glowDisc(glow, 14, 0.55); d.position.y = 0.15; g.add(d);
    g.add(blob(9));
  } else if (tier === 4) {    // siêu xe hình nêm + cánh gió
    part(G.box, phong(color, 160), 0, 1.15, 0.2, 4.8, 1.0, 10, body);
    const nose = part(G.box, phong(color, 160), 0, 1.25, 3.6, 4.6, 0.6, 3.6, body); nose.rotation.x = 0.12;
    part(G.box, phong(0x101820, 160), 0, 2.0, -0.4, 3.6, 1.0, 4.4, body);
    part(G.box, phong(0x101820, 160), 0, 2.3, 1.2, 3.4, 0.2, 1.8, body).rotation.x = -0.45;
    part(G.box, phong(0x111111), 0, 2.6, -4.6, 4.8, 0.25, 1.2, body);
    for (const x of [-1.8, 1.8]) { part(G.box, phong(0x111111), x, 2.0, -4.4, 0.3, 1.0, 0.5, body); part(G.box, basic(0xffffff), x, 1.2, 5.2, 1.2, 0.25, 0.1, body); part(G.box, basic(0xff1a3a), x, 1.4, -4.8, 1.4, 0.25, 0.1, body); }
    for (const x of [-2.3, 2.3]) for (const z of [3.2, -3.2]) wheel(body, x, 0.85, z, 0.85, 0.9);
    const d = glowDisc(glow, 16, 0.85); d.position.y = 0.15; g.add(d);
    g.add(blob(9)); g.userData.exhaust = new THREE.Vector3(0, 1.0, -5.2);
  } else if (tier === 5) {    // trực thăng
    part(G.sph, phong(color, 120), 0, 0, 0, 5, 4.4, 8, body);
    part(G.sph, phong(0x9fd8ff, 150), 0, 0.6, 2.6, 3.6, 2.8, 3.6, body);
    part(G.box, phong(color), 0, 0.6, -6.5, 0.9, 0.9, 7, body);
    part(G.box, phong(color), 0, 1.6, -9.6, 0.4, 2.6, 1.6, body);
    for (const x of [-1.8, 1.8]) part(G.box, phong(0x333333), x, -2.6, 0, 0.3, 0.3, 7, body);
    const rotor = new THREE.Group(); rotor.position.set(0, 2.6, 0); body.add(rotor);
    part(G.box, phong(0x222222), 0, 0, 0, 22, 0.15, 1.1, rotor); part(G.box, phong(0x222222), 0, 0, 0, 1.1, 0.15, 22, rotor);
    g.userData.rotor = rotor;
    const tr = new THREE.Group(); tr.position.set(0.4, 1.8, -9.8); body.add(tr); part(G.box, phong(0x222222), 0, 0, 0, 0.1, 4, 0.5, tr); g.userData.tailRotor = tr;
    const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: glow, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); beacon.scale.setScalar(6); beacon.position.set(0, -2.4, 0); body.add(beacon); g.userData.beacon = beacon;
    const spot = new THREE.Mesh(new THREE.ConeGeometry(14, 60, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6d0, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); spot.position.set(0, -30, 4); body.add(spot);
  } else {                    // Rồng Vàng: thân nhiều đốt bám theo đầu
    const gold = new THREE.MeshPhongMaterial({ color: 0xffc23a, emissive: 0x6a3a00, shininess: 120, specular: 0xfff0b0 });
    const red = new THREE.MeshPhongMaterial({ color: 0xff3a2a, emissive: 0x400000 });
    const head = new THREE.Group(); body.add(head);
    part(G.box, gold, 0, 0, 0, 4.2, 3.2, 6, head);
    part(G.box, gold, 0, -0.9, 3.6, 3.4, 1.4, 3.4, head);
    part(G.box, red, 0, -1.7, 3.6, 3.0, 0.5, 3.0, head);
    for (const x of [-1.4, 1.4]) { const h = part(G.cone, gold, x, 2.6, -1.4, 0.6, 3.6, 0.6, head); h.rotation.x = -0.7; part(G.sph, basic(0xff3030), x * 0.9, 0.6, 2.4, 0.8, 0.8, 0.8, head); }
    for (const x of [-2.4, 2.4]) { const w = part(G.box, red, x, -0.6, 4.6, 0.2, 0.2, 5, head); w.rotation.y = x > 0 ? 0.5 : -0.5; }
    const segs = [];
    for (let i = 0; i < 22; i++) {
      const s = 3.4 * (1 - i / 30); const seg = new THREE.Group(); g.add(seg);
      part(G.sph, gold, 0, 0, 0, s, s, s * 1.4, seg);
      if (i % 3 === 0) { const fin = part(G.cone, red, 0, s * 0.6, 0, 0.8, 2.2, 1.6, seg); fin.rotation.x = -0.5; }
      if (i === 6 || i === 15) for (const x of [-1, 1]) { const leg = part(G.box, gold, x * s * 0.6, -s * 0.5, 0, 0.6, 2.2, 0.6, seg); leg.rotation.z = x * 0.5; }
      segs.push(seg);
    }
    const tail = part(G.cone, red, 0, 0, -2, 1.6, 4, 1.6, segs[segs.length - 1]); tail.rotation.x = -Math.PI / 2;
    g.userData.segs = segs; g.userData.trail = [];
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffcf4a, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.6, depthWrite: false })); aura.scale.setScalar(26); head.add(aura);
  }
  g.userData.air = !!t.air;
  return g;
}

// ---------- bệ cho nhân vật đứng: thấy rõ cả người và động tác ----------
export function buildPlatform(tier, color, glow) {
  if (tier === 6) {   // đứng trên đầu Rồng Vàng
    const g = buildVehicle(6, color, glow), head = g.userData.body.children[0];
    g.userData.deck = { parent: head, pos: new THREE.Vector3(0, 1.6, -0.8) }; g.userData.pose = 'nhay_mua'; g.userData.air = true;
    return g;
  }
  const g = new THREE.Group(); g.userData.wheels = []; const body = new THREE.Group(); g.add(body); g.userData.body = body; body.userData.wheels = g.userData.wheels;
  const deck = new THREE.Vector3(); let pose = 'dung_yen';
  if (tier === 1) {          // xe điện cân bằng
    part(G.box, phong(0x22252c, 120), 0, 0.55, 0, 3.6, 0.5, 1.5, body);
    part(G.box, basic(glow), 0, 0.84, 0, 3.4, 0.08, 1.52, body);
    wheel(body, -2.0, 0.62, 0, 0.62, 0.5); wheel(body, 2.0, 0.62, 0, 0.62, 0.5);
    const d = glowDisc(glow, 7, 0.75); d.position.y = 0.14; g.add(d); g.add(blob(4));
    deck.set(0, 0.8, 0);
  } else if (tier === 2) {   // mui trần: đứng ở ghế sau
    part(G.box, phong(color, 110), 0, 1.5, 0, 4.6, 1.5, 9.4, body);
    part(G.box, phong(color, 110), 0, 2.3, 2.6, 4.4, 0.4, 3.6, body);
    part(G.box, phong(0x9fd8ff), 0, 3.0, 1.0, 4.2, 1.1, 0.15, body).rotation.x = -0.5;
    part(G.box, lam(0x3a2a20), 0, 2.4, 0.1, 4.0, 0.6, 1.4, body);
    for (const x of [-1.6, 1.6]) { part(G.box, basic(0xfff6d0), x, 1.6, 4.72, 0.9, 0.4, 0.1, body); part(G.box, basic(0xff2a2a), x, 1.7, -4.72, 0.9, 0.35, 0.1, body); }
    for (const x of [-2.2, 2.2]) for (const z of [3, -3]) wheel(body, x, 0.95, z, 0.95, 0.7);
    const d = glowDisc(glow, 14, 0.55); d.position.y = 0.15; g.add(d); g.add(blob(9));
    deck.set(0, 1.2, -1.9);
  } else if (tier === 3) {   // siêu xe mui trần
    part(G.box, phong(color, 160), 0, 1.15, 0.2, 4.8, 1.0, 10, body);
    const nose = part(G.box, phong(color, 160), 0, 1.25, 3.6, 4.6, 0.6, 3.6, body); nose.rotation.x = 0.12;
    part(G.box, phong(0x101820, 160), 0, 2.0, 1.6, 3.8, 0.15, 1.6, body).rotation.x = -0.6;
    part(G.box, phong(0x111111), 0, 2.6, -4.6, 4.8, 0.25, 1.2, body);
    for (const x of [-1.8, 1.8]) { part(G.box, phong(0x111111), x, 2.0, -4.4, 0.3, 1.0, 0.5, body); part(G.box, basic(0xffffff), x, 1.2, 5.2, 1.2, 0.25, 0.1, body); part(G.box, basic(0xff1a3a), x, 1.4, -4.8, 1.4, 0.25, 0.1, body); }
    for (const x of [-2.3, 2.3]) for (const z of [3.2, -3.2]) wheel(body, x, 0.85, z, 0.85, 0.9);
    const d = glowDisc(glow, 16, 0.85); d.position.y = 0.15; g.add(d); g.add(blob(9)); g.userData.exhaust = new THREE.Vector3(0, 1.0, -5.2);
    deck.set(0, 0.9, -1.1);
  } else if (tier === 4) {   // xe hoa diễu hành: nhảy múa trên sân khấu
    part(G.box, phong(color, 60), 0, 1.6, 0, 7, 2.2, 14, body);
    part(G.box, phong(0xffd23a, 120), 0, 2.9, -0.5, 6, 0.4, 8.6, body);
    part(G.box, phong(0xf0f0f0), 0, 2.4, 7.4, 6, 3.4, 2.6, body);
    part(G.box, phong(0x9fd8ff), 0, 3.4, 8.75, 5.4, 1.4, 0.1, body);
    const fc = [0xff6aa8, 0xffffff, 0xffd23a, 0xff3a5a, 0xc87aff];
    for (let i = 0; i < 44; i++) { const t = i / 44, side = i % 2 ? 1 : -1, z = -6.8 + (Math.floor(i / 2) / 22) * 13.6; part(G.sph, lam(fc[i % fc.length]), side * 3.6, 0.9 + (i % 3) * 0.7, z, 1.3, 1.3, 1.3, body); void t; }
    for (const x of [-3, 3]) part(G.box, phong(0xffd23a, 120), x, 5.5, -4.2, 0.5, 5, 0.5, body);
    part(G.box, phong(0xffd23a, 120), 0, 8.1, -4.2, 6.5, 0.6, 0.6, body);
    for (let k = -2; k <= 2; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: k % 2 ? 0xffd23a : glow, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); sp.scale.setScalar(2.6); sp.position.set(k * 1.5, 8.6, -4.2); body.add(sp); }
    for (const x of [-3.1, 3.1]) for (const z of [5, 0, -5]) wheel(body, x, 0.9, z, 0.9, 0.7);
    const d = glowDisc(glow, 18, 0.6); d.position.y = 0.15; g.add(d); g.add(blob(14));
    deck.set(0, 3.1, -0.5); pose = 'nhay_mua';
  } else if (tier === 5) {   // khinh khí cầu: đứng trong giỏ
    part(G.cyl, lam(0x8a5a2a), 0, 1.3, 0, 5.6, 2.6, 5.6, body);
    part(G.cyl, lam(0x5a3a1a), 0, 2.65, 0, 5.9, 0.3, 5.9, body);
    const eg = new THREE.SphereGeometry(1, 24, 16), cols = [], c3 = [new THREE.Color(color), new THREE.Color(0xffd23a), new THREE.Color(0xffffff)], pa = eg.attributes.position;
    for (let i = 0; i < pa.count; i++) { const k = Math.floor((Math.atan2(pa.getX(i), pa.getZ(i)) + Math.PI) / (Math.PI * 2) * 12) % 3; cols.push(c3[k].r, c3[k].g, c3[k].b); }
    eg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const env = new THREE.Mesh(eg, new THREE.MeshLambertMaterial({ vertexColors: true })); env.scale.set(9, 10.5, 9); env.position.y = 16.5; body.add(env);
    part(G.cyl, lam(0x3a2a1a), 0, 6.8, 0, 3.4, 1.2, 3.4, body);
    const rp = []; for (const [x, z] of [[2.6, 2.6], [-2.6, 2.6], [2.6, -2.6], [-2.6, -2.6]]) rp.push(x, 2.7, z, x * 1.9, 9.5, z * 1.9);
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); body.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x2a1a0a })));
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffa030, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); fl.scale.setScalar(4); fl.position.y = 7.6; body.add(fl); g.userData.flame = fl;
    deck.set(0, 0.35, 0);
  }
  g.userData.deck = { parent: body, pos: deck }; g.userData.pose = pose; g.userData.air = !!TIERS[tier].air;
  return g;
}

// rồng: các đốt đi theo vết của đầu
export function updateDragon(v, dt) {
  const body = v.userData.body, trail = v.userData.trail, segs = v.userData.segs;
  trail.unshift(body.getWorldPosition(new THREE.Vector3()));
  if (trail.length > 140) trail.length = 140;
  for (let i = 0; i < segs.length; i++) {
    const k = Math.min(trail.length - 1, (i + 1) * 3), p = trail[k], q = trail[Math.max(0, k - 1)];
    v.worldToLocal(segs[i].position.copy(p));
    const lq = v.worldToLocal(q.clone()); segs[i].lookAt(lq);
  }
}

// ---------- xe chạy rông (NPC) ----------
const NPC_COLORS = [0xffffff, 0x222222, 0xd83a3a, 0x2a6ad8, 0xf0c23a, 0x8a8a8a, 0x3aa85a, 0xf08a2a, 0xc0c8d0];
export function buildNPC(kind) {
  const g = new THREE.Group(); g.userData.wheels = []; const body = new THREE.Group(); g.add(body); g.userData.body = body; body.userData.wheels = g.userData.wheels;
  const c = NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)];
  if (kind === 'car') {
    part(G.box, phong(c), 0, 1.4, 0, 4.2, 1.6, 8.6, body);
    part(G.box, phong(0x2a3a4a), 0, 2.7, -0.4, 3.8, 1.2, 4.6, body);
    for (const x of [-1.4, 1.4]) { part(G.box, basic(0xfff6d0), x, 1.4, 4.32, 0.8, 0.35, 0.1, body); part(G.box, basic(0xff2a2a), x, 1.5, -4.32, 0.8, 0.3, 0.1, body); }
    for (const x of [-2, 2]) for (const z of [2.8, -2.8]) wheel(body, x, 0.85, z, 0.85, 0.6);
    g.add(blob(8));
  } else if (kind === 'taxi') {
    part(G.box, phong(0x3ab86a), 0, 1.4, 0, 4.2, 1.6, 8.6, body);
    part(G.box, phong(0xffffff), 0, 2.7, -0.4, 3.8, 1.2, 4.6, body);
    part(G.box, basic(0xffe14a), 0, 3.5, -0.4, 1.6, 0.5, 0.8, body);
    for (const x of [-2, 2]) for (const z of [2.8, -2.8]) wheel(body, x, 0.85, z, 0.85, 0.6);
    g.add(blob(8));
  } else if (kind === 'cyclo') {
    part(G.box, phong(0x2a5aa8), 0, 2.0, 1.6, 2.6, 1.4, 2.2, body);
    part(G.half, lam(0xd83a3a), 0, 2.8, 1.4, 2.8, 2.2, 2.6, body).rotation.x = -0.3;
    wheel(body, -1.3, 0.9, 1.8, 0.9, 0.2); wheel(body, 1.3, 0.9, 1.8, 0.9, 0.2); wheel(body, 0, 0.9, -1.8, 0.9, 0.2);
    rider(body, 1.8, -1.4, 0xf0e0c0, 0xf0e0a0, 0);
    g.add(blob(4.5));
  } else {
    part(G.box, phong(c), 0, 1.6, 0.2, 1.1, 1.0, 3.4, body);
    wheel(body, 0, 0.9, 1.9, 0.9, 0.35); wheel(body, 0, 0.9, -1.7, 0.9, 0.35);
    rider(body, 1.6, -0.5, NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)], NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)], 0.15);
    if (Math.random() < 0.35) rider(body, 1.9, -1.6, 0xf4a6b8, 0xffffff, 0.1);
    g.add(blob(4));
  }
  return g;
}

// xe đàn em Hắc Long (rượt người tặng quà)
export function buildGoon() {
  const g = new THREE.Group(); g.userData.wheels = []; const body = new THREE.Group(); g.add(body); g.userData.body = body; body.userData.wheels = g.userData.wheels;
  part(G.box, phong(0x0d0d10, 140), 0, 2.0, 0, 5, 2.4, 10, body);
  part(G.box, phong(0x050608, 160), 0, 3.6, -0.6, 4.6, 1.6, 6, body);
  part(G.box, basic(0xffc23a), 0, 2.4, 0, 5.05, 0.25, 10.05, body);
  for (const x of [-1.6, 1.6]) part(G.box, basic(0xffffff), x, 2.0, 5.05, 1, 0.4, 0.1, body);
  for (const x of [-2.3, 2.3]) for (const z of [3.2, -3.2]) wheel(body, x, 1.1, z, 1.1, 0.8);
  g.add(blob(10));
  return g;
}
// xe bọc thép của trùm Hắc Long
export function buildBoss() {
  const g = new THREE.Group(); g.userData.wheels = []; const body = new THREE.Group(); g.add(body); g.userData.body = body; body.userData.wheels = g.userData.wheels;
  part(G.box, phong(0x111114, 120), 0, 4.5, 6, 8, 6, 7, body);
  part(G.box, phong(0x0a1a2a, 160), 0, 6.2, 9.6, 7, 2.2, 0.2, body);
  part(G.box, phong(0x0d0d10, 100), 0, 6, -6, 9, 9, 18, body);
  part(G.box, basic(0xffc23a), 0, 10.6, -6, 9.1, 0.4, 18.1, body);
  for (const x of [-2.6, 2.6]) part(G.box, basic(0xff3030), x, 4, 9.6, 1.4, 0.6, 0.1, body);
  for (const x of [-3.6, 3.6]) for (const z of [7, 0, -6, -12]) wheel(body, x, 1.8, z, 1.8, 1.4);
  const tex = neonTexture('HẮC LONG', '#ffc23a', { plate: 'rgba(0,0,0,0.9)' });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide });
  for (const x of [-4.56, 4.56]) { const s = new THREE.Mesh(G.plane, mat); s.scale.set(14, 14 / tex.userData.aspect, 1); s.position.set(x, 6.5, -6); s.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2; body.add(s); }
  const crown = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff2020, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); crown.scale.setScalar(18); crown.position.set(0, 12, -6); body.add(crown);
  g.add(blob(22));
  return g;
}
// thùng hàng thả dù
export function buildCrate(color) {
  const g = new THREE.Group();
  part(G.box, lam(0x8a5a2a), 0, 2, 0, 4, 4, 4, g);
  part(G.box, basic(color), 0, 2, 0, 4.1, 0.6, 4.1, g); part(G.box, basic(color), 0, 2, 0, 0.6, 4.1, 4.1, g);
  const chute = new THREE.Group(); chute.position.y = 16; g.add(chute);
  part(G.half, lam(color), 0, 0, 0, 14, 7, 14, chute); part(G.half, lam(0xffffff), 0, 0.05, 0, 13.8, 6.4, 13.8, chute).rotation.y = 0.5;
  const lines = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-6, 16, 0), new THREE.Vector3(0, 4, 0), new THREE.Vector3(6, 16, 0), new THREE.Vector3(0, 4, 0), new THREE.Vector3(0, 16, -6), new THREE.Vector3(0, 4, 0), new THREE.Vector3(0, 16, 6), new THREE.Vector3(0, 4, 0)]);
  g.add(new THREE.LineSegments(lines, new THREE.LineBasicMaterial({ color: 0xffffff })));
  g.userData.chute = chute;
  return g;
}
// tượng vàng của Trùm Thành Phố
export function buildStatue() {
  const g = new THREE.Group(), gold = new THREE.MeshPhongMaterial({ color: 0xffc23a, emissive: 0x4a2a00, shininess: 140, specular: 0xffffff });
  part(G.box, lam(0x3a3a44), 0, 4, 0, 16, 8, 16, g); part(G.box, gold, 0, 8.3, 0, 17, 0.6, 17, g);
  const p = new THREE.Group(); p.position.y = 8.6; g.add(p);
  part(G.box, gold, -1.3, 4, 0, 2, 8, 2.2, p); part(G.box, gold, 1.3, 4, 0, 2, 8, 2.2, p);
  part(G.box, gold, 0, 11, 0, 5.4, 7, 3, p);
  const a1 = part(G.box, gold, -3.8, 15, 0, 1.6, 7, 1.6, p); a1.rotation.z = -0.6;
  const a2 = part(G.box, gold, 3.8, 15, 0, 1.6, 7, 1.6, p); a2.rotation.z = 0.6;
  part(G.sph, gold, 0, 16.2, 0, 3.6, 4, 3.6, p);
  part(G.cone, gold, 0, 19.4, 0, 3.4, 2.4, 3.4, p);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd23a, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8, depthWrite: false })); glow.scale.setScalar(50); glow.position.y = 20; g.add(glow);
  return g;
}

// ---------- hệ hạt: pháo hoa, khói, lửa, xu vàng ----------
export class Particles {
  constructor(scene, max, opts = {}) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3); this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max); this.life = new Float32Array(max); this.age = new Float32Array(max);
    this.base = new Float32Array(max * 3); this.grow = new Float32Array(max); this.grav = new Float32Array(max); this.s0 = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('rgba', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.uniforms = { map: { value: opts.map || glowTexture() }, scale: Particles.scale };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false, blending: opts.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
      vertexShader: 'attribute float size; attribute vec4 rgba; varying vec4 vC; uniform float scale; void main(){ vC = rgba; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D map; varying vec4 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC.rgb * t.rgb, vC.a * t.a); if (gl_FragColor.a < 0.01) discard; }',
    });
    this.points = new THREE.Points(g, mat); this.points.frustumCulled = false; scene.add(this.points);
    this.drag = opts.drag ?? 0.98;
  }
  emit(x, y, z, vx, vy, vz, color, size, life, grav = -20, grow = 0) {
    let i = this.n < this.max ? this.n++ : Math.floor(Math.random() * this.max);
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    const c = color instanceof THREE.Color ? color : new THREE.Color(color);
    this.base[i * 3] = c.r; this.base[i * 3 + 1] = c.g; this.base[i * 3 + 2] = c.b;
    this.s0[i] = size; this.life[i] = life; this.age[i] = 0; this.grav[i] = grav; this.grow[i] = grow;
  }
  update(dt) {
    const d = Math.pow(this.drag, dt * 60);
    for (let i = 0; i < this.n; i++) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) { this.copy(--this.n, i); i--; continue; }
      const k = this.age[i] / this.life[i];
      this.vel[i * 3 + 1] += this.grav[i] * dt;
      this.vel[i * 3] *= d; this.vel[i * 3 + 1] *= d; this.vel[i * 3 + 2] *= d;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const a = k < 0.1 ? k * 10 : 1 - (k - 0.1) / 0.9;
      this.col[i * 4] = this.base[i * 3]; this.col[i * 4 + 1] = this.base[i * 3 + 1]; this.col[i * 4 + 2] = this.base[i * 3 + 2]; this.col[i * 4 + 3] = a;
      this.size[i] = this.s0[i] * (1 + this.grow[i] * k);
    }
    const g = this.points.geometry; g.setDrawRange(0, this.n);
    g.attributes.position.needsUpdate = true; g.attributes.rgba.needsUpdate = true; g.attributes.size.needsUpdate = true;
  }
  copy(from, to) {
    if (from === to) return;
    for (let k = 0; k < 3; k++) { this.pos[to * 3 + k] = this.pos[from * 3 + k]; this.vel[to * 3 + k] = this.vel[from * 3 + k]; this.base[to * 3 + k] = this.base[from * 3 + k]; }
    for (let k = 0; k < 4; k++) this.col[to * 4 + k] = this.col[from * 4 + k];
    this.size[to] = this.size[from]; this.life[to] = this.life[from]; this.age[to] = this.age[from]; this.grav[to] = this.grav[from]; this.grow[to] = this.grow[from]; this.s0[to] = this.s0[from];
  }
}
Particles.scale = { value: 800 };

// tiền rơi: tấm tiền xoay lật
export class CashRain {
  constructor(scene, max = 260) {
    const mat = new THREE.MeshBasicMaterial({ map: cashTexture(), side: THREE.DoubleSide, transparent: true, toneMapped: false });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(4, 2), mat, max); this.mesh.frustumCulled = false; this.mesh.count = 0;
    scene.add(this.mesh); this.items = []; this.max = max; this.o = new THREE.Object3D();
  }
  drop(cx, cz, radius, n, y0 = 90) {
    for (let i = 0; i < n && this.items.length < this.max; i++) {
      this.items.push({ x: cx + (Math.random() - 0.5) * radius * 2, y: y0 + Math.random() * 60, z: cz + (Math.random() - 0.5) * radius * 2, rx: Math.random() * 6, ry: Math.random() * 6, sx: (Math.random() - 0.5) * 6, sy: (Math.random() - 0.5) * 6, vy: -(10 + Math.random() * 8), life: 0 });
    }
  }
  update(dt) {
    const o = this.o; let n = 0;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i]; it.life += dt; it.y += it.vy * dt; it.x += Math.sin(it.life * 2 + it.rx) * dt * 4; it.rx += it.sx * dt; it.ry += it.sy * dt;
      if (it.y < 0.4) { it.y = 0.4; it.sx = it.sy = 0; it.rx = -Math.PI / 2; it.vy = 0; }
      if (it.life > 14) { this.items.splice(i, 1); continue; }
    }
    for (const it of this.items) { o.position.set(it.x, it.y, it.z); o.rotation.set(it.rx, it.ry, 0); o.updateMatrix(); this.mesh.setMatrixAt(n++, o.matrix); }
    this.mesh.count = n; this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.spark = new Particles(scene, 3000);
    this.smoke = new Particles(scene, 900, { additive: false, map: smokeTexture(), drag: 0.96 });
    this.cash = new CashRain(scene);
    this.flashes = [];
    this.timers = [];
  }
  after(sec, fn) { this.timers.push({ t: sec, fn }); }
  burst(p, color, n = 120, speed = 40, size = 5, life = 1.6) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = speed * (0.7 + Math.random() * 0.3), r = Math.sqrt(1 - u * u);
      this.spark.emit(p.x, p.y, p.z, Math.cos(a) * r * s, u * s, Math.sin(a) * r * s, c.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.2), size, life * (0.7 + Math.random() * 0.5), -12);
    }
    this.flash(p, color, 60);
  }
  firework(x, z, color, h = 80 + Math.random() * 60) {
    const y0 = 2, T = 1.0;
    for (let i = 0; i < 18; i++) this.after(i * T / 18, () => this.spark.emit(x, y0 + h * (i / 18), z, (Math.random() - 0.5) * 2, -4, (Math.random() - 0.5) * 2, 0xffe6a0, 3, 0.6, 0));
    this.after(T, () => { this.burst(new THREE.Vector3(x, y0 + h, z), color, 160, 46, 6, 2.0); if (this.onBoom) this.onBoom(); });
  }
  flash(p, color, size) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); s.position.copy(p); s.scale.setScalar(size); this.scene.add(s);
    this.flashes.push({ s, t: 0, size });
  }
  explosion(p, scale = 1) {
    this.burst(p, 0xffa030, 140 * scale, 34 * scale, 7, 1.0);
    for (let i = 0; i < 40 * scale; i++) this.smoke.emit(p.x + (Math.random() - 0.5) * 6, p.y + Math.random() * 4, p.z + (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 16, 8 + Math.random() * 14, (Math.random() - 0.5) * 16, 0x2a2a2a, 14 * scale, 2.6, 2, 2.2);
    this.flash(p, 0xffc060, 120 * scale);
  }
  smokePuff(p, color = 0xdddddd, n = 3, size = 8) { for (let i = 0; i < n; i++) this.smoke.emit(p.x, p.y, p.z, (Math.random() - 0.5) * 6, 3 + Math.random() * 3, (Math.random() - 0.5) * 6, color, size, 1.4, 1, 2.5); }
  flame(p, dir) { for (let i = 0; i < 3; i++) this.spark.emit(p.x, p.y, p.z, dir.x * 30 + (Math.random() - 0.5) * 6, (Math.random()) * 4, dir.z * 30 + (Math.random() - 0.5) * 6, R.pick([0xff6a1a, 0xffc23a, 0x3ab8ff]), 4 + Math.random() * 3, 0.25, 0); }
  coins(p, n = 40) { for (let i = 0; i < n; i++) this.spark.emit(p.x, p.y, p.z, (Math.random() - 0.5) * 30, 20 + Math.random() * 30, (Math.random() - 0.5) * 30, 0xffd23a, 4, 1.4, -40); }
  update(dt) {
    for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); } }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i]; f.t += dt; const k = f.t / 0.5;
      if (k >= 1) { this.scene.remove(f.s); f.s.material.dispose(); this.flashes.splice(i, 1); continue; }
      f.s.material.opacity = 1 - k; f.s.scale.setScalar(f.size * (1 + k));
    }
    this.spark.update(dt); this.smoke.update(dt); this.cash.update(dt);
  }
}
let _smoke;
function smokeTexture() {
  if (_smoke) return _smoke;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,0.8)'); g.addColorStop(0.6, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); _smoke = new THREE.CanvasTexture(c); return _smoke;
}
