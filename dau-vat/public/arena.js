// Nhà thi đấu: võ đài (dây đỏ-trắng-xanh, váy võ đài hai màu), bậc thép, rào chắn, sàn đệm, đường dốc, sân khấu,
// màn hình lớn (titantron), khán đài đông người (instancing), bàn bình luận, bàn bấm giờ + chuông, đèn, pháo hoa.
import * as THREE from 'three';

export const BRAND = 'MEGA SLAM';
export const RING = { y: 1.22, rope: 3.08, post: 3.22, apron: 3.68, ropeY: [0.46, 0.91, 1.37] };
export const STAGE = { y: 1.0, front: -18.5, back: -27, curtain: new THREE.Vector3(0, 1.0, -25.6), rampEnd: -7.8, rampW: 3.6 };
export const TABLE = { x: 6.25, z: 0 };
export const BARRIER = 7.7;

// độ cao mặt đất tại (x, z)
export function groundY(x, z) {
  if (Math.abs(x) <= RING.apron && Math.abs(z) <= RING.apron) return RING.y;
  if (z <= STAGE.front && z >= STAGE.back && Math.abs(x) <= 11) return STAGE.y;
  if (z < STAGE.rampEnd && z > STAGE.front && Math.abs(x) <= STAGE.rampW / 2 + 0.05) return STAGE.y * (z - STAGE.rampEnd) / (STAGE.front - STAGE.rampEnd);
  return 0;
}
export function insideRing(x, z, m = 0) { return Math.abs(x) < RING.rope - m && Math.abs(z) < RING.rope - m; }
// 4 góc cột (đứng trên dây thứ hai)
export const CORNERS = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => ({ sx, sz, x: sx * (RING.rope - 0.18), z: sz * (RING.rope - 0.18), top: new THREE.Vector3(sx * (RING.post - 0.12), RING.y + 1.0, sz * (RING.post - 0.12)) }));

function canvasTex(w, h, draw, opts = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...opts.repeat); }
  t.userData = { cv, g };
  return t;
}
function logo(g, cx, cy, s, c1 = '#ffd23f', c2 = '#e8202a') {
  g.save(); g.translate(cx, cy); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 ${s}px Impact, "Arial Black", sans-serif`;
  g.lineWidth = s * 0.12; g.strokeStyle = '#000'; g.strokeText('MEGA', 0, -s * 0.48);
  g.fillStyle = c1; g.fillText('MEGA', 0, -s * 0.48);
  g.font = `900 ${s * 1.15}px Impact, "Arial Black", sans-serif`;
  g.strokeText('SLAM', 0, s * 0.5); g.fillStyle = c2; g.fillText('SLAM', 0, s * 0.5);
  g.restore();
}

export function buildArena(scene, opts = {}) {
  const q = opts.quality || 'high';
  const A = { scene, updates: [], pyro: [], lightsCol: [] };
  const std = (c, r = 0.7, m = 0.1, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...extra });
  const box = (w, h, d, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; };

  // ---------- sàn nhà ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), std(0x0c0d12, 0.95, 0));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const mats = new THREE.Mesh(new THREE.PlaneGeometry(BARRIER * 2, BARRIER * 2), std(0x1b2a4a, 0.85, 0));
  mats.rotation.x = -Math.PI / 2; mats.position.y = 0.012; mats.receiveShadow = true; scene.add(mats);

  // ---------- võ đài ----------
  const ring = new THREE.Group(); scene.add(ring); A.ring = ring;
  const matTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#e9e9ec'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.025})`; g.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 30, 2 + Math.random() * 8); }
    g.strokeStyle = '#2a3a8a'; g.lineWidth = 14; g.strokeRect(46, 46, w - 92, h - 92);
    g.globalAlpha = 0.9; logo(g, w / 2, h / 2, 150, '#1c2a6a', '#c8102e'); g.globalAlpha = 1;
  });
  const ringMat = std(0xc4c4ca, 0.9, 0, { map: matTex });
  const plat = new THREE.Mesh(new THREE.BoxGeometry(RING.apron * 2, 0.12, RING.apron * 2), [std(0xdddddd, 0.8), std(0xdddddd, 0.8), ringMat, std(0x222222), std(0xdddddd, 0.8), std(0xdddddd, 0.8)]);
  plat.position.y = RING.y - 0.06; plat.receiveShadow = true; ring.add(plat);
  // váy võ đài: đỏ (2 cạnh) / xanh (2 cạnh) như hình mẫu
  const skirt = (c1, c2, text) => canvasTex(1024, 180, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, c1); gr.addColorStop(0.5, c2); gr.addColorStop(1, c1);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 3; for (let i = -10; i < 30; i++) { g.beginPath(); g.moveTo(i * 60, h); g.lineTo(i * 60 + 120, 0); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
    g.font = '900 104px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.strokeText(text, w / 2, h / 2 + 4);
    g.fillStyle = '#fff'; g.fillText(text, w / 2, h / 2 + 4);
  });
  const skR = skirt('#7a0a12', '#e3202c', BRAND), skB = skirt('#0a1f6a', '#2a62e8', 'ĐẠI CHIẾN ĐÔ VẬT');
  const skirtH = RING.y - 0.12;
  [[0, RING.apron, 0, skR], [0, -RING.apron, Math.PI, skB], [RING.apron, 0, Math.PI / 2, skB], [-RING.apron, 0, -Math.PI / 2, skR]].forEach(([x, z, ry, tex]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(RING.apron * 2, skirtH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.18 }));
    m.position.set(x * 1.001, skirtH / 2, z * 1.001); m.rotation.y = ry; ring.add(m);
  });
  // cột góc + đệm góc
  const postMat = std(0x9aa0aa, 0.3, 0.9);
  const padCol = [0xc8102e, 0xeeeeee, 0x1d4fd8, 0xeeeeee];
  CORNERS.forEach((c, i) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 1.65, 12), postMat);
    post.position.set(c.sx * RING.post, RING.y + 0.75, c.sz * RING.post); post.castShadow = true; ring.add(post);
    for (const ry of RING.ropeY) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.2), std(padCol[i], 0.5));
      pad.position.set(c.sx * (RING.post - 0.09), RING.y + ry, c.sz * (RING.post - 0.09)); pad.rotation.y = Math.PI / 4; ring.add(pad);
    }
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), postMat); cap.position.set(c.sx * RING.post, RING.y + 1.58, c.sz * RING.post); ring.add(cap);
  });
  // dây đài: đỏ (trên) – trắng – xanh (dưới)
  const ropeCol = [0x1d4fd8, 0xf2f2f2, 0xd0102a];
  A.ropes = [];
  RING.ropeY.forEach((ry, k) => {
    const mat = std(ropeCol[k], 0.45, 0.05);
    for (let s = 0; s < 4; s++) {
      const len = RING.post * 2;
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, len, 8), mat);
      r.rotation.z = Math.PI / 2;
      const g = new THREE.Group(); g.add(r);
      if (s === 0) g.position.set(0, RING.y + ry, RING.post - 0.05);
      if (s === 1) g.position.set(0, RING.y + ry, -RING.post + 0.05);
      if (s === 2) { g.position.set(RING.post - 0.05, RING.y + ry, 0); g.rotation.y = Math.PI / 2; }
      if (s === 3) { g.position.set(-RING.post + 0.05, RING.y + ry, 0); g.rotation.y = Math.PI / 2; }
      r.castShadow = true; ring.add(g); A.ropes.push({ g, side: s, k, base: g.position.clone(), shake: 0 });
    }
  });
  A.shakeRopes = (amt = 1) => { for (const r of A.ropes) r.shake = Math.max(r.shake, amt); };
  // bậc thép
  const steel = std(0x8d939c, 0.35, 0.85);
  const steps = (x, z, ry) => { const g = new THREE.Group(); for (let i = 0; i < 3; i++) box(0.95, 0.4 * (i + 1), 0.45, steel, 0, 0.2 * (i + 1), -i * 0.42, g).castShadow = true; g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); return g; };
  steps(RING.apron - 0.6, -RING.apron - 1.25, 0);
  steps(-RING.apron + 0.6, RING.apron + 1.25, Math.PI);
  A.stepsNorth = new THREE.Vector3(RING.apron - 0.6, 0, -RING.apron - 1.5);

  // ---------- rào chắn ----------
  const barTex = canvasTex(512, 64, (g, w, h) => { g.fillStyle = '#0d0f14'; g.fillRect(0, 0, w, h); g.font = '900 40px Impact, sans-serif'; g.fillStyle = '#e8202a'; g.textBaseline = 'middle'; for (let i = 0; i < 3; i++) g.fillText(BRAND, 10 + i * 175, h / 2 + 2); }, { repeat: [3, 1] });
  const barMat = std(0xffffff, 0.6, 0.2, { map: barTex });
  const seg = (x, z, len, ry) => { const m = box(len, 1.1, 0.12, barMat, x, 0.55, z); m.rotation.y = ry; };
  seg(0, BARRIER, BARRIER * 2, 0); seg(BARRIER, 0, BARRIER * 2, Math.PI / 2); seg(-BARRIER, 0, BARRIER * 2, Math.PI / 2);
  seg(-(BARRIER + 2.2) / 2, -BARRIER, BARRIER - 2.2, 0); seg((BARRIER + 2.2) / 2, -BARRIER, BARRIER - 2.2, 0);

  // ---------- bàn bình luận + bàn bấm giờ ----------
  const deskTex = canvasTex(1024, 200, (g, w, h) => { g.fillStyle = '#10131c'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8102e'; g.fillRect(0, h - 22, w, 22); logo(g, w / 2, h / 2 - 8, 70); });
  const desk = new THREE.Group(); scene.add(desk);
  const deskMat = [std(0x151821), std(0x151821), std(0x2a2e3a, 0.4), std(0x151821), std(0x151821), new THREE.MeshStandardMaterial({ map: deskTex, roughness: 0.5, emissive: 0xffffff, emissiveMap: deskTex, emissiveIntensity: 0.35 })];
  const dk = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.85, 0.75), deskMat); dk.position.set(0, 0.425, 0); dk.castShadow = true; desk.add(dk);
  for (const x of [-0.9, 0.9]) {
    const mon = box(0.5, 0.32, 0.04, new THREE.MeshBasicMaterial({ color: 0x3a7bd5 }), x, 1.05, 0.1, desk); mon.rotation.x = -0.15;
    box(0.06, 0.2, 0.06, std(0x111111), x, 0.9, 0.12, desk);
  }
  desk.position.set(TABLE.x, 0, TABLE.z); desk.rotation.y = -Math.PI / 2;
  A.commSeats = [new THREE.Vector3(TABLE.x + 0.75, 0, -0.9), new THREE.Vector3(TABLE.x + 0.75, 0, 0.9)];
  const tk = box(1.2, 0.8, 0.6, std(0x151821), TABLE.x - 0.2, 0.4, 3.1); tk.rotation.y = -Math.PI / 2;
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(0xd4af37, 0.25, 1));
  bell.position.set(TABLE.x - 0.2, 0.8, 3.1); scene.add(bell); A.bell = bell;
  A.timekeeperSeat = new THREE.Vector3(TABLE.x + 0.45, 0, 3.1);
  // ghế
  for (const p of [...A.commSeats, A.timekeeperSeat]) { const c = new THREE.Group(); box(0.5, 0.08, 0.5, std(0x1a1a1a), 0, 0.5, 0, c); box(0.5, 0.6, 0.08, std(0x1a1a1a), 0, 0.82, 0.25, c); c.position.copy(p); c.position.x += 0.05; c.rotation.y = -Math.PI / 2; scene.add(c); }

  // ---------- sân khấu + đường dốc + màn hình lớn ----------
  const stageMat = std(0x101219, 0.5, 0.3);
  box(22, STAGE.y, STAGE.front - STAGE.back, stageMat, 0, STAGE.y / 2, (STAGE.front + STAGE.back) / 2).receiveShadow = true;
  const rampLen = STAGE.rampEnd - STAGE.front;
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(STAGE.rampW, 0.1, Math.hypot(rampLen, STAGE.y)), std(0x161a26, 0.45, 0.3));
  ramp.position.set(0, STAGE.y / 2 - 0.03, (STAGE.front + STAGE.rampEnd) / 2); ramp.rotation.x = -Math.atan2(STAGE.y, rampLen); ramp.receiveShadow = true; scene.add(ramp);
  // viền đèn LED dọc đường dốc
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xff2a3d }); A.lightsCol.push(ledMat);
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, Math.hypot(rampLen, STAGE.y)), ledMat); l.position.set(s * STAGE.rampW / 2, STAGE.y / 2 + 0.03, (STAGE.front + STAGE.rampEnd) / 2); l.rotation.x = ramp.rotation.x; scene.add(l); }
  const edge = new THREE.Mesh(new THREE.BoxGeometry(22, 0.08, 0.08), ledMat); edge.position.set(0, STAGE.y + 0.02, STAGE.front); scene.add(edge);
  // titantron
  const tron = canvasTex(1280, 720, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); logo(g, w / 2, h / 2, 210); });
  const tronMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.MeshBasicMaterial({ map: tron, toneMapped: false }));
  tronMesh.position.set(0, STAGE.y + 3.6 + 4.5, STAGE.back + 0.4); scene.add(tronMesh); A.tron = tron; A.tronMesh = tronMesh;
  // khung giàn (truss)
  const truss = std(0x2a2d33, 0.4, 0.8);
  for (const s of [-1, 1]) box(0.35, 13.5, 0.35, truss, s * 8.4, STAGE.y + 6.75, STAGE.back + 0.5);
  box(17.2, 0.35, 0.35, truss, 0, STAGE.y + 13.3, STAGE.back + 0.5);
  // màn LED hai bên
  const sideTex = canvasTex(256, 640, (g, w, h) => { g.fillStyle = '#05060a'; g.fillRect(0, 0, w, h); }); A.sideTex = sideTex;
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 9), new THREE.MeshBasicMaterial({ map: sideTex, toneMapped: false })); m.position.set(s * 10.8, STAGE.y + 4.5, STAGE.back + 0.6); scene.add(m); }
  // cửa ra (cánh gà)
  const cur = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.4), std(0x020203, 1, 0)); cur.position.set(0, STAGE.y + 1.7, STAGE.back + 0.45); scene.add(cur);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.12, 0.12), ledMat); frame.position.set(0, STAGE.y + 3.45, STAGE.back + 0.5); scene.add(frame);
  // giàn đèn trên võ đài
  const rig = new THREE.Group(); scene.add(rig);
  for (const s of [-1, 1]) { box(8.6, 0.25, 0.25, truss, 0, 9.5, s * 4.3, rig); box(0.25, 0.25, 8.6, truss, s * 4.3, 9.5, 0, rig); }
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff4dd, toneMapped: false });
  for (let i = -3; i <= 3; i++) for (const s of [-1, 1]) { box(0.3, 0.22, 0.3, lampMat, i * 1.2, 9.3, s * 4.3, rig); box(0.3, 0.22, 0.3, lampMat, s * 4.3, 9.3, i * 1.2, rig); }

  // ---------- khán đài ----------
  const standMat = std(0x0b0c10, 0.9, 0);
  const crowdSpots = [];
  const ROWS = q === 'low' ? 7 : 11;
  const addStand = (cx, cz, len, ry) => {
    // dọc theo trục X cục bộ, bậc lùi theo +Z cục bộ (quay mặt về võ đài)
    const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = ry; scene.add(g);
    for (let r = 0; r < ROWS; r++) {
      const y = 0.55 + r * 0.42, d = 1.2 + r * 0.85;
      box(len, y, 0.85, standMat, 0, y / 2, d, g);
      for (let x = -len / 2 + 0.35; x < len / 2 - 0.3; x += 0.56) {
        const p = new THREE.Vector3(x + (Math.random() - 0.5) * 0.12, y, d + (Math.random() - 0.5) * 0.1).applyMatrix4(new THREE.Matrix4().makeRotationY(ry)).add(new THREE.Vector3(cx, 0, cz));
        p.row = r; p.yaw = Math.atan2(-p.x, -p.z); crowdSpots.push(p);
      }
    }
  };
  addStand(0, BARRIER + 0.4, 24, 0);                     // phía nam (sau máy quay)
  addStand(BARRIER + 0.4, -2, 26, Math.PI / 2);          // phía đông
  addStand(-BARRIER - 0.4, -2, 26, -Math.PI / 2);        // phía tây
  addStand(-7.6, -BARRIER - 0.4, 8.5, Math.PI);          // hai bên đường dốc
  addStand(7.6, -BARRIER - 0.4, 8.5, Math.PI);
  const limit = q === 'low' ? 900 : q === 'medium' ? 1700 : 2800;
  const pct = Math.max(0.1, Math.min(1, (opts.crowd ?? 100) / 100));
  // hàng đầu dành cho khán giả người thật (game.js đặt vào), phần còn lại là khán giả đơn giản
  const realN = opts.realFans ?? (q === 'low' ? 36 : q === 'medium' ? 80 : 130);
  // hàng đầu: ưu tiên khán đài hai bên + hai bên đường dốc (máy quay chính nhìn thấy), sau đó tới khán đài phía nam
  const front = crowdSpots.filter(p => p.row === 0).sort((a, b) => ((a.z > BARRIER - 0.5 ? 1 : 0) - (b.z > BARRIER - 0.5 ? 1 : 0)) || (Math.random() - 0.5));
  A.fanSpots = front.slice(0, realN);
  const used = new Set(A.fanSpots);
  const spots = crowdSpots.filter(p => !used.has(p)).sort(() => Math.random() - 0.5).slice(0, Math.min(crowdSpots.length, Math.round(limit * pct)));
  A.crowd = buildCrowd(scene, spots);
  A.updates.push((t, dt, hype) => { A.crowd.material.userData.u.uTime.value = t; A.crowd.material.userData.u.uHype.value = hype; if (A.signs) { A.signs.material.userData.u.uTime.value = t; A.signs.material.userData.u.uHype.value = hype; } });
  A.signs = buildSigns(scene, spots.filter((_, i) => i % 9 === 0));

  // ---------- đèn ----------
  scene.add(new THREE.HemisphereLight(0x8090b0, 0x101015, 0.55));
  const key = new THREE.SpotLight(0xffffff, 220, 40, 0.62, 0.45, 1.6);
  key.position.set(0, 13, 1.5); key.target.position.set(0, RING.y, 0); scene.add(key, key.target);
  if (q !== 'low') { key.castShadow = true; key.shadow.mapSize.set(q === 'high' ? 2048 : 1024, q === 'high' ? 2048 : 1024); key.shadow.bias = -0.0004; key.shadow.camera.near = 4; key.shadow.camera.far = 20; }
  A.key = key;
  const fill = new THREE.DirectionalLight(0xc8d4ff, 0.7); fill.position.set(-4, 8, 14); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xff9a6a, 0.5); rim.position.set(6, 6, -10); scene.add(rim);
  // đèn sân khấu (đổi màu theo người ra sân)
  A.stageSpots = [];
  for (const s of [-1, 1]) {
    const sp = new THREE.SpotLight(0xff2a3d, 420, 45, 0.42, 0.6, 1.3);
    sp.position.set(s * 6, 12, -14); sp.target.position.set(0, STAGE.y, -20); scene.add(sp, sp.target); A.stageSpots.push(sp);
  }
  const follow = new THREE.SpotLight(0xffffff, 0, 40, 0.12, 0.45, 1.2);
  follow.position.set(0, 14, -6); scene.add(follow, follow.target); A.follow = follow;
  A.setMood = (color) => { const c = new THREE.Color(color); for (const sp of A.stageSpots) sp.color.copy(c); for (const m of A.lightsCol) m.color.copy(c); };

  // ---------- pháo hoa / tia lửa ----------
  const PMAX = q === 'low' ? 600 : 1800;
  const pg = new THREE.BufferGeometry();
  const ppos = new Float32Array(PMAX * 3), pcol = new Float32Array(PMAX * 3);
  pg.setAttribute('position', new THREE.BufferAttribute(ppos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pcol, 3));
  const pm = new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const points = new THREE.Points(pg, pm); points.frustumCulled = false; scene.add(points);
  const parts = [];
  A.burst = (x, y, z, color, n = 120, kind = 'fountain') => {
    const c = new THREE.Color(color);
    for (let i = 0; i < n && parts.length < PMAX; i++) {
      let vx, vy, vz;
      if (kind === 'fountain') { vx = (Math.random() - 0.5) * 2; vy = 7 + Math.random() * 6; vz = (Math.random() - 0.5) * 2; }
      else if (kind === 'confetti') { vx = (Math.random() - 0.5) * 6; vy = 2 + Math.random() * 4; vz = (Math.random() - 0.5) * 6; }
      else { const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2, sp = 3 + Math.random() * 4; vx = Math.cos(a) * Math.cos(b) * sp; vy = Math.sin(b) * sp + 2; vz = Math.sin(a) * Math.cos(b) * sp; }
      const cc = kind === 'confetti' ? new THREE.Color().setHSL(Math.random(), 0.9, 0.6) : c.clone().lerp(new THREE.Color(0xffffff), Math.random() * 0.5);
      parts.push({ x, y, z, vx, vy, vz, life: kind === 'confetti' ? 4 + Math.random() * 2 : 1.2 + Math.random() * 0.8, c: cc, g: kind === 'confetti' ? 1.2 : 9, drag: kind === 'confetti' ? 0.9 : 0.995 });
    }
  };
  A.pyroShow = (color) => {
    for (const x of [-9.5, -5, 5, 9.5]) A.burst(x, STAGE.y + 0.2, STAGE.front - 0.6, color, 90);
    for (const x of [-1.8, 1.8]) A.burst(x, STAGE.y + 0.2, STAGE.front + 0.5, color, 70);
  };
  A.ringPosts = (color) => { for (const c of CORNERS) A.burst(c.sx * RING.post, RING.y + 1.6, c.sz * RING.post, color, 60); };
  A.updates.push((t, dt) => {
    let n = 0;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= dt;
      if (p.life <= 0 || p.y < 0) { parts.splice(i, 1); continue; }
      p.vy -= p.g * dt; p.vx *= p.drag; p.vz *= p.drag; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    }
    for (const p of parts) { ppos[n * 3] = p.x; ppos[n * 3 + 1] = p.y; ppos[n * 3 + 2] = p.z; const f = Math.min(1, p.life * 1.5); pcol[n * 3] = p.c.r * f; pcol[n * 3 + 1] = p.c.g * f; pcol[n * 3 + 2] = p.c.b * f; n++; }
    pg.setDrawRange(0, n); pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
  });
  // dây đài rung
  A.updates.push((t, dt) => {
    for (const r of A.ropes) { if (r.shake > 0.001) { r.g.position.y = r.base.y + Math.sin(t * 40 + r.k) * 0.03 * r.shake; r.shake *= Math.pow(0.02, dt); } else r.g.position.y = r.base.y; }
  });

  A.update = (t, dt, hype) => { for (const f of A.updates) f(t, dt, hype); };
  return A;
}

// ---------- khán giả: InstancedMesh, cổ vũ bằng shader ----------
function buildCrowd(scene, spots) {
  const parts = [];
  const add = (g, part, arm) => {
    g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv');
    const n = g.attributes.position.count;
    g.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(n).fill(part), 1));
    g.setAttribute('aArm', new THREE.BufferAttribute(new Float32Array(n).fill(arm), 1));
    parts.push(g);
  };
  const torso = new THREE.CapsuleGeometry(0.19, 0.38, 3, 8); torso.scale(1, 1, 0.65); torso.translate(0, 1.12, 0); add(torso, 0, 0);
  const legs = new THREE.CylinderGeometry(0.16, 0.12, 0.85, 8); legs.translate(0, 0.45, 0); add(legs, 0.5, 0);
  const head = new THREE.SphereGeometry(0.115, 10, 8); head.translate(0, 1.6, 0.01); add(head, 1, 0);
  for (const s of [1, -1]) { const a = new THREE.CapsuleGeometry(0.055, 0.42, 3, 6); a.translate(s * 0.25, 1.1, 0.02); add(a, 1, s); }
  const geo = mergeSimple(parts);
  const n = spots.length;
  const shirt = new Float32Array(n * 3), skinA = new Float32Array(n * 3), seed = new Float32Array(n);
  const SK = ['#f1d2bc', '#e2b08d', '#c98d63', '#a26a45', '#6e452c', '#f3dccb'];
  const SH = ['#e8202a', '#1d4fd8', '#111111', '#f2f2f2', '#ffd23f', '#2fbf5a', '#7d3cc8', '#ff7a1a', '#222a44', '#c8102e', '#0fa3a3', '#555'];
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    c.set(SH[(Math.random() * SH.length) | 0]).multiplyScalar(0.55 + Math.random() * 0.45); shirt.set([c.r, c.g, c.b], i * 3);
    c.set(SK[(Math.random() * SK.length) | 0]); skinA.set([c.r, c.g, c.b], i * 3);
    seed[i] = Math.random();
  }
  geo.setAttribute('aShirt', new THREE.InstancedBufferAttribute(shirt, 3));
  geo.setAttribute('aSkin', new THREE.InstancedBufferAttribute(skinA, 3));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const u = { uTime: { value: 0 }, uHype: { value: 0.3 } };
  mat.userData.u = u;
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = `attribute float aPart; attribute float aArm; attribute vec3 aShirt; attribute vec3 aSkin; attribute float aSeed;
      uniform float uTime; uniform float uHype; varying vec3 vCrowd;\n` + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = uTime * (2.6 + fract(aSeed * 7.3) * 2.4) + aSeed * 6.2831;
      float cheer = clamp(uHype * (0.55 + 0.45 * sin(aSeed * 13.0 + uTime * 0.3)), 0.0, 1.0);
      if (aArm != 0.0) {
        vec3 piv = vec3(aArm * 0.25, 1.33, 0.0);
        float up = step(0.3, fract(aSeed * 3.1)) * cheer;
        float ang = mix(0.12, 2.5 + 0.35 * sin(ph * 1.6), up) * aArm;
        vec3 d = transformed - piv; float c = cos(ang), s = sin(ang);
        transformed = piv + vec3(d.x * c - d.y * s, d.x * s + d.y * c, d.z);
      }
      transformed.y += cheer * max(0.0, sin(ph)) * 0.13;
      vCrowd = mix(aShirt, aSkin, clamp(aPart, 0.0, 1.0));
      if (aPart > 0.4 && aPart < 0.6) vCrowd = aShirt * 0.35;`);
    sh.fragmentShader = 'varying vec3 vCrowd;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= vCrowd;');
  };
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const m = new THREE.Matrix4(), qq = new THREE.Quaternion(), sc = new THREE.Vector3();
  spots.forEach((p, i) => {
    const yaw = Math.atan2(-p.x, -p.z);
    qq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const s = 0.9 + Math.random() * 0.2; sc.set(s, s, s);
    m.compose(p, qq, sc); mesh.setMatrixAt(i, m);
  });
  mesh.frustumCulled = false;
  scene.add(mesh);
  return mesh;
}
function buildSigns(scene, spots) {
  const texts = ['MEGA SLAM!', 'ĐẠI CHIẾN!', '1 – 2 – 3!', 'VÔ ĐỊCH!', 'HẠ GỤC NÓ!', 'TIKTOK LIVE', 'YES! YES!', 'SỨC MẠNH!'];
  const cols = ['#e8202a', '#1d4fd8', '#111', '#ffd23f', '#2fbf5a', '#ff4fa8', '#7d3cc8', '#ff7a1a'];
  const tex = canvasTex(1024, 512, (g, w, h) => {
    for (let i = 0; i < 8; i++) {
      const x = (i % 4) * 256, y = Math.floor(i / 4) * 256;
      g.fillStyle = '#fafafa'; g.fillRect(x + 6, y + 40, 244, 176);
      g.strokeStyle = cols[i]; g.lineWidth = 10; g.strokeRect(x + 12, y + 46, 232, 164);
      g.fillStyle = cols[i]; g.font = '900 40px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const parts = texts[i].split(' '); const mid = Math.ceil(parts.length / 2);
      g.fillText(parts.slice(0, mid).join(' '), x + 128, y + 105); g.fillText(parts.slice(mid).join(' '), x + 128, y + 155);
    }
  });
  const geo = new THREE.PlaneGeometry(0.75, 0.55); geo.translate(0, 2.05, 0.05);
  const n = spots.length, off = new Float32Array(n * 2), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) { const k = (Math.random() * 8) | 0; off[i * 2] = (k % 4) * 0.25; off[i * 2 + 1] = 0.5 - Math.floor(k / 4) * 0.5; seed[i] = Math.random(); }
  geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 2)); geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, color: 0xbbbbbb });
  const u = { uTime: { value: 0 }, uHype: { value: 0.3 } }; mat.userData.u = u;
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'attribute vec2 aOff; attribute float aSeed; uniform float uTime; uniform float uHype;\n' + sh.vertexShader
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = vec2(uv.x * 0.25 + aOff.x, uv.y * 0.5 + aOff.y);')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += uHype * max(0.0, sin(uTime * 3.0 + aSeed * 6.28)) * 0.18;');
  };
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const m = new THREE.Matrix4(), qq = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  spots.forEach((p, i) => { qq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-p.x, -p.z)); m.compose(p, qq, one); mesh.setMatrixAt(i, m); });
  mesh.frustumCulled = false; scene.add(mesh);
  return mesh;
}
function mergeSimple(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const out = new THREE.BufferGeometry();
  for (const name of Object.keys(list[0].attributes)) {
    const sz = list[0].attributes[name].itemSize, arr = new Float32Array(n * sz); let o = 0;
    for (const g of list) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, sz));
  }
  return out;
}

// vẽ màn hình lớn
export function drawTron(A, info) {
  const t = A.tron, g = t.userData.g, w = t.userData.cv.width, h = t.userData.cv.height;
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  if (!info) { logo(g, w / 2, h / 2, 210); t.needsUpdate = true; return; }
  const c = info.color || '#e8202a';
  const gr = g.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.7); gr.addColorStop(0, c); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 6; for (let i = -10; i < 30; i++) { g.beginPath(); g.moveTo(i * 80, h); g.lineTo(i * 80 + 260, 0); g.stroke(); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (info.top) { g.font = '900 64px Impact, "Arial Black", sans-serif'; g.fillStyle = '#fff'; g.fillText(info.top, w / 2, h * 0.2); }
  g.font = `900 ${info.big ? 150 : 120}px Impact, "Arial Black", sans-serif`; g.lineWidth = 14; g.strokeStyle = '#000';
  const name = String(info.name || '').toUpperCase();
  g.strokeText(name, w / 2, h * 0.5); g.fillStyle = '#fff'; g.fillText(name, w / 2, h * 0.5);
  if (info.sub) { g.font = '700 52px "Segoe UI", Arial, sans-serif'; g.fillStyle = '#ffd23f'; g.fillText(info.sub, w / 2, h * 0.75); }
  if (info.foot) { g.font = '700 40px "Segoe UI", Arial, sans-serif'; g.fillStyle = '#fff'; g.fillText(info.foot, w / 2, h * 0.88); }
  t.needsUpdate = true;
  // màn hai bên
  const s = A.sideTex, sg = s.userData.g; sg.fillStyle = c; sg.fillRect(0, 0, 256, 640); sg.fillStyle = 'rgba(0,0,0,0.45)'; for (let i = 0; i < 16; i++) sg.fillRect(0, i * 40, 256, 18); s.needsUpdate = true;
}
