// Nội thất quán bar: bộ salon (sofa nhung + bàn nước + đồ uống) và bàn tròn đứng (không ghế) có viền LED.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const SALONS = [   // [x, z, hướng (rad, 0 = quay về phía máy quay), màu nhung]
  [-3.95, -4.55, 0.32, 0x6e0f2e],
  [3.95, -4.55, -0.32, 0x34186b],
];
export const TABLES = [   // bàn tròn đứng [x, z]
  [-3.25, -2.3], [3.25, -2.3],
  [-2.8, 0.1], [2.8, 0.1],
  [-2.38, 2.35], [2.38, 2.35],
];

export function createBar(scene) {
  const root = new THREE.Group(); root.name = 'bar'; scene.add(root);
  const parts = new Map();   // vật liệu -> [geometry đã đặt vị trí]
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1);
  function put(mat, geo, x, y, z, ry = 0, base = null) {
    const g = geo.clone();
    M.compose(V.set(x, y, z), Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), S1);
    if (base) M.premultiply(base);
    g.applyMatrix4(M);
    if (!parts.has(mat)) parts.set(mat, []);
    parts.get(mat).push(g);
  }
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a84a, metalness: 0.9, roughness: 0.3 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0c0a10, metalness: 0.4, roughness: 0.45 });
  const marble = new THREE.MeshStandardMaterial({ color: 0x1b1626, metalness: 0.2, roughness: 0.18 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd7ff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false });
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xff3df2, toneMapped: false });
  const drinkMats = [0xff3d9a, 0x3dd9ff, 0xffc23d, 0x7cff6b].map(c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
  const bottleMat = new THREE.MeshStandardMaterial({ color: 0x1d5a2c, metalness: 0.3, roughness: 0.1, transparent: true, opacity: 0.85 });

  // ---------- sofa nhung ----------
  function sofa(base, velvet, w) {
    const seatH = 0.42, d = 0.86;
    put(velvet, new RoundedBoxGeometry(w, 0.28, d, 3, 0.05), 0, 0.2, 0, 0, base);                         // đế
    const n = Math.max(1, Math.round(w / 0.75));
    for (let i = 0; i < n; i++) put(velvet, new RoundedBoxGeometry((w - 0.36) / n - 0.03, 0.14, d - 0.16, 3, 0.06), -w / 2 + 0.18 + (i + 0.5) * (w - 0.36) / n, seatH, 0.06, 0, base);   // nệm ngồi
    put(velvet, new RoundedBoxGeometry(w, 0.62, 0.22, 3, 0.08), 0, 0.62, -d / 2 + 0.11, 0, base);         // lưng
    for (const s of [-1, 1]) put(velvet, new RoundedBoxGeometry(0.2, 0.56, d, 3, 0.08), s * (w / 2 - 0.1), 0.44, 0, 0, base);   // tay vịn
    for (let i = 0; i < n; i++) put(velvet, new RoundedBoxGeometry((w - 0.4) / n - 0.08, 0.34, 0.12, 3, 0.05), -w / 2 + 0.2 + (i + 0.5) * (w - 0.4) / n, 0.68, -d / 2 + 0.28, 0, base);  // gối tựa
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(gold, new THREE.CylinderGeometry(0.025, 0.02, 0.08, 8), sx * (w / 2 - 0.08), 0.04, sz * (d / 2 - 0.08), 0, base);
  }
  // ---------- bộ salon: sofa dài + 2 ghế bành + bàn nước ----------
  for (const [x, z, ry, col] of SALONS) {
    const velvet = new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, metalness: 0.0 });
    const base = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), S1);
    const sofaM = new THREE.Matrix4().makeTranslation(0, 0, -0.55).premultiply(base);
    sofa(sofaM, velvet, 2.0);
    const side = x < 0 ? 1 : -1;   // ghế bành ở phía trong (gần sàn nhảy)
    const armM = new THREE.Matrix4().compose(new THREE.Vector3(side * 1.35, 0, 0.45), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -side * 1.25), S1).premultiply(base);
    sofa(armM, velvet, 0.95);
    // bàn nước: mặt đá đen viền vàng, chân kim loại
    put(marble, new THREE.CylinderGeometry(0.42, 0.42, 0.05, 32), 0, 0.4, 0.38, 0, base);
    put(gold, new THREE.TorusGeometry(0.42, 0.012, 6, 40).rotateX(Math.PI / 2), 0, 0.425, 0.38, 0, base);
    put(gold, new THREE.CylinderGeometry(0.05, 0.08, 0.38, 12), 0, 0.19, 0.38, 0, base);
    put(gold, new THREE.CylinderGeometry(0.28, 0.3, 0.02, 24), 0, 0.01, 0.38, 0, base);
    // đồ uống trên bàn nước
    put(bottleMat, new THREE.CylinderGeometry(0.035, 0.04, 0.26, 12), -0.12, 0.555, 0.32, 0, base);
    put(bottleMat, new THREE.CylinderGeometry(0.012, 0.02, 0.08, 8), -0.12, 0.72, 0.32, 0, base);
    put(black, new THREE.CylinderGeometry(0.12, 0.1, 0.12, 20), 0.14, 0.485, 0.46, 0, base);           // xô đá
    [[0.12, 0.25], [-0.05, 0.52], [0.24, 0.62]].forEach(([dx, dz], i) => {
      put(glass, new THREE.CylinderGeometry(0.035, 0.028, 0.1, 12), dx, 0.475, dz, 0, base);
      put(drinkMats[i % drinkMats.length], new THREE.CylinderGeometry(0.03, 0.026, 0.05, 12), dx, 0.45, dz, 0, base);
    });
    // thảm dưới bộ salon
    put(new THREE.MeshStandardMaterial({ color: 0x140a1e, roughness: 1 }), new THREE.CylinderGeometry(1.5, 1.5, 0.012, 40), 0, 0.006, 0.1, 0, base);
  }
  // ---------- bàn tròn đứng (cao 1.08 m, không ghế) ----------
  const rings = [];
  TABLES.forEach(([x, z], i) => {
    put(black, new THREE.CylinderGeometry(0.3, 0.32, 0.03, 28), x, 0.015, z);            // đế
    put(gold, new THREE.CylinderGeometry(0.035, 0.035, 1.03, 12), x, 0.545, z);          // trụ
    put(marble, new THREE.CylinderGeometry(0.36, 0.36, 0.045, 36), x, 1.08, z);          // mặt bàn
    put(gold, new THREE.TorusGeometry(0.36, 0.012, 6, 44).rotateX(Math.PI / 2), x, 1.1, z);
    rings.push([x, z]);
    // ly cocktail + chai
    put(glass, new THREE.CylinderGeometry(0.04, 0.03, 0.12, 12), x - 0.1, 1.165, z + 0.06);
    put(drinkMats[i % drinkMats.length], new THREE.CylinderGeometry(0.035, 0.028, 0.06, 12), x - 0.1, 1.135, z + 0.06);
    put(glass, new THREE.CylinderGeometry(0.04, 0.03, 0.12, 12), x + 0.12, 1.165, z - 0.04);
    put(drinkMats[(i + 1) % drinkMats.length], new THREE.CylinderGeometry(0.035, 0.028, 0.06, 12), x + 0.12, 1.135, z - 0.04);
    if (i % 2 === 0) { put(bottleMat, new THREE.CylinderGeometry(0.035, 0.04, 0.24, 12), x + 0.02, 1.22, z - 0.14); put(bottleMat, new THREE.CylinderGeometry(0.012, 0.02, 0.08, 8), x + 0.02, 1.38, z - 0.14); }
  });
  // viền LED dưới mặt bàn + vòng LED dưới đế: đổi màu theo nhạc
  const ringGeo = mergeGeometries(rings.flatMap(([x, z]) => [
    new THREE.TorusGeometry(0.33, 0.012, 6, 40).rotateX(Math.PI / 2).translate(x, 1.05, z),
    new THREE.TorusGeometry(0.33, 0.014, 6, 40).rotateX(Math.PI / 2).translate(x, 0.035, z),
  ]));
  const ringMesh = new THREE.Mesh(ringGeo, ledMat); root.add(ringMesh);
  // gộp theo vật liệu → ít lệnh vẽ
  for (const [mat, list] of parts) { const m = new THREE.Mesh(mergeGeometries(list), mat); root.add(m); list.forEach(g => g.dispose()); }
  // vệt sáng hắt xuống sàn dưới mỗi bàn
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0xff3df2, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const glowGeo = mergeGeometries(rings.map(([x, z]) => new THREE.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2).translate(x, 0.02, z)));
  root.add(new THREE.Mesh(glowGeo, glowMat));

  return {
    root,
    update(t, mood) {
      ledMat.color.setHSL(((mood.hue + 0.5) % 1 + 1) % 1, 1, 0.45 + 0.25 * (mood.kick || 0));
      glowMat.color.copy(ledMat.color); glowMat.opacity = 0.3 + 0.4 * (mood.kick || 0);
    },
    set visible(v) { root.visible = v; },
  };
}
