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
    const g = geo.index ? geo.toNonIndexed() : geo.clone();   // gộp được hình có/không chỉ mục (RoundedBox không có)
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
  const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, emissive: c, emissiveIntensity: 0.06 }, o));
  const porcelain = std(0xd8d4cc, { roughness: 0.45, emissiveIntensity: 0 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xcfd3da, metalness: 0.9, roughness: 0.2 });
  const ice = std(0xe6f6ff, { roughness: 0.1, transparent: true, opacity: 0.8 });
  const squid = std(0xd9a15e, { roughness: 0.8 });
  const paper = std(0xf5f5f0), filter = std(0xc9874a);
  const ember = new THREE.MeshBasicMaterial({ color: 0xff5a1a, toneMapped: false });
  const cig555 = std(0x1b3c9a, { roughness: 0.35 });
  const fruitMats = { melon: std(0xe8283c), rind: std(0x2f8a3a), grape: std(0x5a1f7a, { roughness: 0.25 }), orange: std(0xff9a1f), dragon: std(0xe0307e), flesh: std(0xf6f2ec),
    pine: std(0xc9962f, { roughness: 0.9 }), leaf: std(0x3a9a3a), berry: std(0xd8172f, { roughness: 0.3 }), chili: std(0xc8200f), mayo: std(0xf3e2a0) };
  const labels = [], smokes = [];

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
    // ---------- bàn VIP: bàn chữ nhật mặt đá, viền vàng ----------
    const TZ = 0.56, T = 0.455;   // tâm bàn (theo trục sofa) và độ cao mặt bàn
    put(marble, new RoundedBoxGeometry(1.24, 0.05, 0.64, 2, 0.02), 0, 0.43, TZ, 0, base);
    put(gold, new RoundedBoxGeometry(1.27, 0.018, 0.67, 2, 0.008), 0, 0.402, TZ, 0, base);
    for (const sx of [-1, 1]) put(gold, new THREE.BoxGeometry(0.04, 0.4, 0.5), sx * 0.5, 0.2, TZ, 0, base);
    // dĩa trái cây hai tầng
    put(porcelain, new THREE.CylinderGeometry(0.22, 0.2, 0.018, 36), 0, T + 0.009, TZ, 0, base);
    put(gold, new THREE.CylinderGeometry(0.012, 0.012, 0.22, 10), 0, T + 0.12, TZ, 0, base);
    put(porcelain, new THREE.CylinderGeometry(0.13, 0.12, 0.014, 32), 0, T + 0.23, TZ, 0, base);
    for (let k = 0; k < 6; k++) {   // dưa hấu xếp vòng: ruột đỏ, vỏ xanh
      const a = k / 6 * Math.PI * 2;
      put(fruitMats.rind, new THREE.CylinderGeometry(0.1, 0.1, 0.022, 10, 1, false, 0, 0.62), Math.cos(a) * 0.035, T + 0.03, TZ + Math.sin(a) * 0.035, -a, base);
      put(fruitMats.melon, new THREE.CylinderGeometry(0.088, 0.088, 0.026, 10, 1, false, 0.03, 0.56), Math.cos(a) * 0.035, T + 0.031, TZ + Math.sin(a) * 0.035, -a, base);
    }
    for (let k = 0; k < 18; k++) {  // chùm nho
      const a = k * 2.4, r = 0.02 + (k % 5) * 0.006;
      put(fruitMats.grape, new THREE.SphereGeometry(0.013, 8, 6), 0.15 + Math.cos(a) * r, T + 0.05 + (k % 3) * 0.012, TZ + 0.06 + Math.sin(a) * r, 0, base);
    }
    for (let k = 0; k < 4; k++) put(fruitMats.orange, new THREE.CylinderGeometry(0.032, 0.032, 0.012, 16).rotateX(1.2), -0.15 + k * 0.025, T + 0.05, TZ + 0.1, 0.3, base);   // cam cắt lát
    for (const dx of [-0.12, 0.13]) {   // thanh long bổ đôi
      put(fruitMats.dragon, new THREE.SphereGeometry(0.04, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI), dx, T + 0.058, TZ - 0.1, 0, base);
      put(fruitMats.flesh, new THREE.CylinderGeometry(0.038, 0.038, 0.004, 16), dx, T + 0.06, TZ - 0.1, 0, base);
    }
    // tầng trên: dứa nguyên trái có ngọn + dâu tây
    put(fruitMats.pine, new THREE.SphereGeometry(0.045, 14, 10).scale(1, 1.5, 1), 0, T + 0.31, TZ, 0, base);
    for (let k = 0; k < 7; k++) put(fruitMats.leaf, new THREE.ConeGeometry(0.012, 0.09, 5).rotateZ((k - 3) * 0.25).rotateY(k * 0.9), 0, T + 0.4, TZ, 0, base);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; put(fruitMats.berry, new THREE.ConeGeometry(0.018, 0.035, 8).rotateX(Math.PI), Math.cos(a) * 0.09, T + 0.255, TZ + Math.sin(a) * 0.09, 0, base); }
    // xô đá + chai sâm panh nghiêng
    put(steel, new THREE.CylinderGeometry(0.085, 0.07, 0.16, 20), -0.45, T + 0.08, TZ + 0.05, 0, base);
    put(ice, new THREE.CylinderGeometry(0.078, 0.078, 0.01, 16), -0.45, T + 0.15, TZ + 0.05, 0, base);
    put(bottleMat, new THREE.CylinderGeometry(0.035, 0.04, 0.26, 12).rotateZ(0.35), -0.42, T + 0.2, TZ + 0.05, 0, base);
    put(gold, new THREE.CylinderGeometry(0.014, 0.02, 0.07, 8).rotateZ(0.35).translate(-0.05, 0.15, 0), -0.42, T + 0.2, TZ + 0.05, 0, base);
    // dĩa mực khô + chén tương ớt, mayonnaise
    put(porcelain, new THREE.CylinderGeometry(0.1, 0.095, 0.012, 28).scale(1.45, 1, 1), -0.3, T + 0.006, TZ - 0.12, 0, base);
    put(squid, new THREE.SphereGeometry(1, 16, 8).scale(0.075, 0.006, 0.035), -0.3, T + 0.016, TZ - 0.12, 0.2, base);
    for (let k = 0; k < 7; k++) put(squid, new THREE.CylinderGeometry(0.003, 0.002, 0.07, 4).rotateZ(Math.PI / 2).rotateY((k - 3) * 0.12), -0.3 + 0.1, T + 0.016, TZ - 0.12 + (k - 3) * 0.008, 0.2, base);
    for (let k = 0; k < 6; k++) put(squid, new THREE.BoxGeometry(0.06, 0.004, 0.006).rotateY(k * 0.7), -0.33 + (k % 3) * 0.02, T + 0.02, TZ - 0.08 + Math.floor(k / 3) * 0.015, 0, base);   // mực xé
    put(porcelain, new THREE.CylinderGeometry(0.026, 0.02, 0.022, 14), -0.17, T + 0.011, TZ - 0.17, 0, base);
    put(fruitMats.chili, new THREE.CylinderGeometry(0.022, 0.022, 0.004, 14), -0.17, T + 0.02, TZ - 0.17, 0, base);
    put(porcelain, new THREE.CylinderGeometry(0.022, 0.017, 0.02, 14), -0.16, T + 0.01, TZ - 0.1, 0, base);
    put(fruitMats.mayo, new THREE.CylinderGeometry(0.018, 0.018, 0.004, 14), -0.16, T + 0.018, TZ - 0.1, 0, base);
    // gói thuốc 555 (nằm) + bật lửa
    put(cig555, new THREE.BoxGeometry(0.056, 0.022, 0.088), 0.33, T + 0.011, TZ - 0.13, 0.4, base);
    put(gold, new THREE.BoxGeometry(0.058, 0.004, 0.012), 0.33, T + 0.023, TZ - 0.13, 0.4, base);
    labels.push({ base, x: 0.33, y: T + 0.0225, z: TZ - 0.13, ry: 0.4 });
    put(gold, new THREE.BoxGeometry(0.022, 0.012, 0.06), 0.41, T + 0.006, TZ - 0.17, -0.2, base);
    // gạt tàn pha lê + điếu thuốc đang cháy
    put(glass, new THREE.CylinderGeometry(0.06, 0.055, 0.032, 6), 0.43, T + 0.016, TZ + 0.12, 0, base);
    put(black, new THREE.CylinderGeometry(0.042, 0.042, 0.004, 16), 0.43, T + 0.012, TZ + 0.12, 0, base);
    put(paper, new THREE.CylinderGeometry(0.0045, 0.0045, 0.06, 8).rotateZ(Math.PI / 2 - 0.15), 0.42, T + 0.034, TZ + 0.12, 0.5, base);
    put(filter, new THREE.CylinderGeometry(0.0047, 0.0047, 0.018, 8).rotateZ(Math.PI / 2 - 0.15).translate(0.035, -0.005, 0), 0.42, T + 0.034, TZ + 0.12, 0.5, base);
    put(ember, new THREE.SphereGeometry(0.005, 8, 6).translate(-0.031, 0.005, 0), 0.42, T + 0.034, TZ + 0.12, 0.5, base);
    smokes.push(new THREE.Vector3(0.42 - 0.031 * Math.cos(0.5), T + 0.045, TZ + 0.12 + 0.031 * Math.sin(0.5)).applyMatrix4(base));
    // ly rượu ở mép bàn
    [[-0.12, 0.27], [0.12, 0.26], [0.3, 0.2], [-0.48, -0.2]].forEach(([dx, dz], k) => {
      put(glass, new THREE.CylinderGeometry(0.035, 0.028, 0.1, 12), dx, T + 0.05, TZ + dz, 0, base);
      put(drinkMats[k % drinkMats.length], new THREE.CylinderGeometry(0.03, 0.026, 0.05, 12), dx, T + 0.025, TZ + dz, 0, base);
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

  // nhãn “555” trên gói thuốc
  const labTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 100; const g = c.getContext('2d');
    g.fillStyle = '#1b3c9a'; g.fillRect(0, 0, 64, 100); g.strokeStyle = '#d9b44a'; g.lineWidth = 4; g.strokeRect(4, 4, 56, 92);
    g.fillStyle = '#e8c55a'; g.font = '900 30px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('555', 32, 52);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const labMat = new THREE.MeshStandardMaterial({ map: labTex, roughness: 0.4, emissive: 0xffffff, emissiveMap: labTex, emissiveIntensity: 0.15 });
  for (const L of labels) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.054, 0.086).rotateX(-Math.PI / 2), labMat);
    M.compose(V.set(L.x, L.y, L.z), Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), L.ry), S1).premultiply(L.base);
    m.applyMatrix4(M); root.add(m);
  }
  // khói thuốc bay lên từ gạt tàn
  const smTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const wisps = [];
  for (const p of smokes) for (let k = 0; k < 6; k++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smTex, color: 0xd8d8e8, transparent: true, depthWrite: false, opacity: 0 }));
    root.add(sp); wisps.push({ sp, p, ph: k / 6 });
  }
  return {
    root,
    update(t, mood) {
      for (const w of wisps) {
        const k = (t * 0.25 + w.ph) % 1;
        w.sp.position.set(w.p.x + Math.sin(t * 1.3 + w.ph * 9) * 0.03 * k, w.p.y + k * 0.45, w.p.z + Math.cos(t * 1.1 + w.ph * 7) * 0.02 * k);
        w.sp.scale.setScalar(0.03 + k * 0.12); w.sp.material.opacity = 0.35 * Math.sin(k * Math.PI);
      }
      ledMat.color.setHSL(((mood.hue + 0.5) % 1 + 1) % 1, 1, 0.45 + 0.25 * (mood.kick || 0));
      glowMat.color.copy(ledMat.color); glowMat.opacity = 0.3 + 0.4 * (mood.kick || 0);
    },
    set visible(v) { root.visible = v; },
  };
}
