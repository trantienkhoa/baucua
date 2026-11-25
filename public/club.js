// Kiến trúc quán: sàn bóng phản chiếu, quầy bar (mặt đá, kệ rượu phát sáng, ghế cao, đèn thả),
// hai bục tròn có cột inox hai bên bàn DJ, viền LED sân khấu.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PI = Math.PI;
// ---- bố cục (mét, gốc = giữa sàn; -z là phía sân khấu) ----
export const BAR = { x0: -7.05, x1: -3.6, z: -3.95, depth: 0.62, h: 1.1, shelfZ: -5.18, shelfH: 1.95 };
export const BAR_STOOLS = [-5.8, -5.1, -4.4];                                  // ghế cao trước quầy (x)
export const BAR_SPOTS = [                                                        // chỗ khách ở quầy: [x, z, hướng, ngồi?]
  [-5.8, -3.34, PI, true], [-5.1, -3.34, PI, true], [-4.4, -3.34, PI, true], [-3.77, -3.22, PI - 0.5, false], [-3.25, -3.5, -PI / 2 - 0.3, false],
];
export const BARTENDERS = [[-5.45, -4.58], [-4.3, -4.58]];
export const PODIUMS = [[-3.0, -7.45], [3.0, -7.45]];                             // tâm bục (x, z)
export const PODIUM_H = 0.8;

export function createClub(scene, { STAGE_Y }) {
  const root = new THREE.Group(); root.name = 'club'; scene.add(root);
  const parts = new Map();
  const put = (mat, geo, x = 0, y = 0, z = 0, ry = 0) => { const g = geo.index ? geo.toNonIndexed() : geo; if (ry) g.rotateY(ry); g.translate(x, y, z); if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(g); };
  const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o));
  const chrome = std(0xdfe3ea, { metalness: 1, roughness: 0.12, envMapIntensity: 3 });
  const gold = std(0xd4a84a, { metalness: 0.95, roughness: 0.25, envMapIntensity: 2 });
  const black = std(0x0c0a12, { metalness: 0.5, roughness: 0.4 });
  const wood = std(0x2a1710, { roughness: 0.55, metalness: 0.15 });
  const marble = std(0x15121d, { roughness: 0.12, metalness: 0.35, envMapIntensity: 2 });
  const leather = std(0x5a0f22, { roughness: 0.6 });
  const led = new THREE.MeshBasicMaterial({ color: 0xff3df2, toneMapped: false });      // dải LED đổi màu theo nhạc
  const led2 = new THREE.MeshBasicMaterial({ color: 0x3dd9ff, toneMapped: false });
  const warm = new THREE.MeshBasicMaterial({ color: 0xffc27a, toneMapped: false });

  // ---------- sàn bóng phản chiếu ----------
  const mirror = new Reflector(new THREE.PlaneGeometry(40, 30), { textureWidth: 432, textureHeight: 768, color: 0x26262e, clipBias: 0.002 });
  mirror.rotation.x = -PI / 2; mirror.position.set(0, 0.004, 4.5); mirror.name = 'mirror'; root.add(mirror);
  // khung kim loại chia ô sàn LED
  { const g = []; for (let i = 0; i <= 12; i++) g.push(new THREE.BoxGeometry(0.08, 0.012, 20).translate(-12 + i * 2, 0.012, 4.5)); for (let j = 0; j <= 10; j++) g.push(new THREE.BoxGeometry(24, 0.012, 0.08).translate(0, 0.012, -5.5 + j * 2)); root.add(new THREE.Mesh(mergeGeometries(g), std(0x08060c, { roughness: 0.35, metalness: 0.7 }))); }

  // ---------- sân khấu: viền LED + ốp mặt trước ----------
  put(black, new THREE.BoxGeometry(20, 0.06, 0.12), 0, STAGE_Y - 0.02, -5.46);
  put(led, new THREE.BoxGeometry(20, 0.035, 0.03), 0, STAGE_Y - 0.075, -5.435);
  put(led2, new THREE.BoxGeometry(20, 0.035, 0.03), 0, 0.06, -5.435);
  for (let i = -9; i <= 9; i++) put(black, new THREE.BoxGeometry(0.06, STAGE_Y - 0.1, 0.04), i * 1.05, STAGE_Y / 2 - 0.05, -5.44);

  // ---------- hai bục có cột ----------
  const ringMats = [];
  for (const [x, z] of PODIUMS) {
    const y0 = STAGE_Y - 0.05;
    put(black, new THREE.CylinderGeometry(0.62, 0.7, PODIUM_H, 40), x, y0 + PODIUM_H / 2, z);
    put(marble, new THREE.CylinderGeometry(0.64, 0.64, 0.04, 40), x, y0 + PODIUM_H + 0.02, z);
    put(gold, new THREE.TorusGeometry(0.64, 0.014, 6, 48).rotateX(PI / 2), x, y0 + PODIUM_H + 0.04, z);
    for (const [yy, m] of [[0.12, led], [PODIUM_H * 0.52, led2], [PODIUM_H - 0.08, led]]) put(m, new THREE.TorusGeometry(0.675 - (yy / PODIUM_H) * 0.06, 0.016, 6, 48).rotateX(PI / 2), x, y0 + yy, z);
    put(chrome, new THREE.CylinderGeometry(0.03, 0.03, 9.6 - (y0 + PODIUM_H), 14), x, (9.6 + y0 + PODIUM_H) / 2, z - 0.02);   // cột inox tới giàn đèn
    put(chrome, new THREE.CylinderGeometry(0.09, 0.11, 0.03, 20), x, y0 + PODIUM_H + 0.055, z - 0.02);
    // quầng sáng dưới chân
    const glow = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3df2, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    glow.position.set(x, STAGE_Y + 0.004, z); root.add(glow); ringMats.push(glow.material);
  }

  // ---------- quầy bar ----------
  const bar = new THREE.Group(); bar.name = 'barCounter'; root.add(bar);
  const bp = new Map();
  const bput = (mat, geo, x = 0, y = 0, z = 0) => { const g = geo.index ? geo.toNonIndexed() : geo; g.translate(x, y, z); if (!bp.has(mat)) bp.set(mat, []); bp.get(mat).push(g); };
  const L = BAR.x1 - BAR.x0, cx = (BAR.x0 + BAR.x1) / 2, bz = BAR.z;
  bput(wood, new RoundedBoxGeometry(L, BAR.h - 0.06, BAR.depth, 2, 0.03), cx, (BAR.h - 0.06) / 2, bz);                    // thân quầy
  bput(marble, new RoundedBoxGeometry(L + 0.16, 0.06, BAR.depth + 0.2, 2, 0.02), cx, BAR.h - 0.03, bz + 0.04);          // mặt đá
  bput(gold, new THREE.BoxGeometry(L + 0.17, 0.014, 0.014), cx, BAR.h - 0.065, bz + BAR.depth / 2 + 0.14);
  bput(led, new THREE.BoxGeometry(L, 0.03, 0.02), cx, BAR.h - 0.11, bz + BAR.depth / 2 + 0.012);                         // LED dưới mép quầy
  bput(led2, new THREE.BoxGeometry(L, 0.03, 0.02), cx, 0.05, bz + BAR.depth / 2 + 0.012);
  for (let i = 0; i < 9; i++) bput(std(0x3a2016, { roughness: 0.5 }), new RoundedBoxGeometry(L / 9 - 0.06, BAR.h - 0.36, 0.02, 1, 0.01), BAR.x0 + (i + 0.5) * L / 9, 0.52, bz + BAR.depth / 2 + 0.006);   // ô ốp gỗ
  bput(chrome, new THREE.CylinderGeometry(0.018, 0.018, L, 10).rotateZ(PI / 2), cx, 0.2, bz + BAR.depth / 2 + 0.13);   // thanh gác chân
  for (let i = 0; i < 5; i++) bput(chrome, new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8).rotateX(PI / 2), BAR.x0 + 0.2 + i * (L - 0.4) / 4, 0.2, bz + BAR.depth / 2 + 0.06);
  bput(wood, new RoundedBoxGeometry(0.62, BAR.h - 0.06, 1.2, 2, 0.03), BAR.x1 - 0.31, (BAR.h - 0.06) / 2, bz - 0.5);    // nhánh quầy chữ L
  bput(marble, new RoundedBoxGeometry(0.78, 0.06, 1.3, 2, 0.02), BAR.x1 - 0.31, BAR.h - 0.03, bz - 0.5);
  // ghế cao
  for (const sx of BAR_STOOLS) {
    const sz = bz + 0.62;
    bput(leather, new THREE.CylinderGeometry(0.19, 0.17, 0.07, 22), sx, 0.78, sz);
    bput(gold, new THREE.TorusGeometry(0.185, 0.012, 6, 24).rotateX(PI / 2), sx, 0.745, sz);
    bput(chrome, new THREE.CylinderGeometry(0.025, 0.025, 0.72, 10), sx, 0.38, sz);
    bput(chrome, new THREE.TorusGeometry(0.15, 0.012, 6, 22).rotateX(PI / 2), sx, 0.3, sz);
    bput(chrome, new THREE.CylinderGeometry(0.2, 0.22, 0.025, 22), sx, 0.013, sz);
  }
  // kệ rượu phía sau: khung + 3 tầng kính phát sáng
  const sz0 = BAR.shelfZ;
  bput(black, new THREE.BoxGeometry(L + 0.3, BAR.shelfH, 0.1), cx - 0.1, BAR.shelfH / 2, sz0 - 0.2);
  bput(wood, new THREE.BoxGeometry(L + 0.3, 0.9, 0.5), cx - 0.1, 0.45, sz0);                                              // tủ dưới
  bput(marble, new THREE.BoxGeometry(L + 0.34, 0.04, 0.54), cx - 0.1, 0.92, sz0);
  const backGlow = new THREE.Mesh(new THREE.PlaneGeometry(L + 0.2, BAR.shelfH - 0.98), new THREE.MeshBasicMaterial({ color: 0xff9a3d, toneMapped: false }));
  backGlow.position.set(cx - 0.1, 0.96 + (BAR.shelfH - 0.98) / 2, sz0 - 0.145); bar.add(backGlow);
  const shelfY = [0.94, 1.27, 1.6];
  for (const y of shelfY.slice(1)) { bput(std(0x9fd7ff, { transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }), new THREE.BoxGeometry(L + 0.2, 0.018, 0.3), cx - 0.1, y, sz0 - 0.02); bput(warm, new THREE.BoxGeometry(L + 0.2, 0.012, 0.012), cx - 0.1, y - 0.012, sz0 + 0.13); }
  bput(gold, new THREE.BoxGeometry(L + 0.34, 0.05, 0.16), cx - 0.1, BAR.shelfH, sz0 - 0.14);
  // chai rượu (instancing): thân + cổ, nhiều màu
  const bodyG = new THREE.CylinderGeometry(0.036, 0.04, 0.2, 10).translate(0, 0.1, 0), neckG = new THREE.CylinderGeometry(0.013, 0.022, 0.1, 8).translate(0, 0.25, 0);
  const bottleG = mergeGeometries([bodyG, neckG]);
  const cols = [0x1d5a2c, 0x7a3a12, 0xd9a441, 0x2b3f8f, 0xb3122d, 0xe8e8f0, 0x3a1a4a, 0x14806a, 0xff7ab8];
  const nB = Math.floor((L + 0.1) / 0.115) * shelfY.length;
  const bottles = new THREE.InstancedMesh(bottleG, std(0xffffff, { roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.9, envMapIntensity: 2.5 }), nB);
  { const m = new THREE.Matrix4(), c = new THREE.Color(); let i = 0, seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const y of shelfY) for (let k = 0; k < nB / shelfY.length; k++) { const s = 0.85 + rnd() * 0.4; m.makeScale(0.9 + rnd() * 0.3, s, 0.9 + rnd() * 0.3); m.setPosition(BAR.x0 + 0.02 + k * 0.115, y + 0.012, sz0 - 0.03 + (rnd() - 0.5) * 0.06); bottles.setMatrixAt(i, m); bottles.setColorAt(i, c.setHex(cols[Math.floor(rnd() * cols.length)])); i++; } }
  bar.add(bottles);
  // đồ trên quầy: vòi bia, ly, bình lắc, xô đá, chanh
  const glass = std(0xcfeaff, { transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false });
  const top = BAR.h;
  bput(chrome, new THREE.BoxGeometry(0.34, 0.05, 0.12), cx + 0.2, top + 0.025, bz - 0.12); bput(chrome, new THREE.CylinderGeometry(0.03, 0.03, 0.32, 10), cx + 0.2, top + 0.2, bz - 0.12);
  for (const dx of [-0.11, 0, 0.11]) { bput(gold, new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8).rotateX(0.5), cx + 0.2 + dx, top + 0.34, bz - 0.07); bput(black, new THREE.CylinderGeometry(0.02, 0.016, 0.1, 8).rotateX(0.5), cx + 0.2 + dx, top + 0.45, bz - 0.03); }
  const drinkC = [0xff3d9a, 0x3dd9ff, 0xffc23d, 0x7cff6b, 0xff7a3d].map(c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
  [[-5.8, 0.2], [-5.1, 0.16], [-4.4, 0.22], [-6.35, 0.05], [-4.75, -0.05], [-3.95, 0.1], [-6.65, 0.18]].forEach(([x, dz], i) => {
    if (i % 3 === 2) { bput(glass, new THREE.CylinderGeometry(0.004, 0.004, 0.09, 6), x, top + 0.045, bz + dz); bput(glass, new THREE.ConeGeometry(0.05, 0.07, 14, 1, true).rotateX(PI), x, top + 0.125, bz + dz); bput(drinkC[i % 5], new THREE.ConeGeometry(0.04, 0.05, 14).rotateX(PI), x, top + 0.122, bz + dz); bput(glass, new THREE.CylinderGeometry(0.035, 0.035, 0.006, 12), x, top + 0.003, bz + dz); }
    else { bput(glass, new THREE.CylinderGeometry(0.036, 0.03, 0.13, 12), x, top + 0.065, bz + dz); bput(drinkC[i % 5], new THREE.CylinderGeometry(0.031, 0.027, 0.09, 12), x, top + 0.05, bz + dz); }
  });
  bput(chrome, new THREE.CylinderGeometry(0.04, 0.03, 0.2, 12), cx - 0.9, top + 0.1, bz - 0.14); bput(chrome, new THREE.CylinderGeometry(0.028, 0.04, 0.07, 12), cx - 0.9, top + 0.235, bz - 0.14);   // bình lắc
  bput(chrome, new THREE.CylinderGeometry(0.1, 0.08, 0.16, 16), cx + 1.05, top + 0.08, bz - 0.1);                                                                                                // xô đá
  bput(std(0x1d5a2c, { roughness: 0.1, metalness: 0.3 }), new THREE.CylinderGeometry(0.035, 0.04, 0.26, 10).rotateZ(0.3), cx + 1.06, top + 0.2, bz - 0.1);
  for (let k = 0; k < 4; k++) bput(std(0xd8e85a, { roughness: 0.6 }), new THREE.SphereGeometry(0.03, 8, 6), cx - 0.35 + k * 0.06, top + 0.03, bz - 0.2 + (k % 2) * 0.05);
  // đèn thả trên quầy
  const lamps = [];
  for (let i = 0; i < 4; i++) {
    const x = BAR.x0 + 0.5 + i * (L - 1) / 3, y = 2.55;
    bput(black, new THREE.CylinderGeometry(0.004, 0.004, 7, 4), x, y + 3.6, bz + 0.05);
    bput(gold, new THREE.ConeGeometry(0.16, 0.2, 18, 1, true), x, y + 0.02, bz + 0.05);
    bput(warm, new THREE.SphereGeometry(0.05, 10, 8), x, y - 0.04, bz + 0.05);
    const pl = new THREE.PointLight(0xffb060, 1.3, 3.6, 1.8); pl.position.set(x, y - 0.25, bz + 0.25); bar.add(pl); lamps.push(pl);
  }
  // biển neon trên mặt trước quầy
  const signC = document.createElement('canvas'); signC.width = 512; signC.height = 96;
  { const g = signC.getContext('2d'); g.clearRect(0, 0, 512, 96); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 60px "Segoe UI", Arial, sans-serif'; g.shadowColor = '#ff4fd8'; g.shadowBlur = 18; g.fillStyle = '#ffd6f5'; g.fillText('🍸 COCKTAIL BAR', 256, 50); }
  const signT = new THREE.CanvasTexture(signC); signT.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.36), new THREE.MeshBasicMaterial({ map: signT, transparent: true, toneMapped: false, depthWrite: false }));
  sign.position.set(cx + 0.2, 0.62, bz + BAR.depth / 2 + 0.022); bar.add(sign);
  for (const [mat, list] of bp) { const m = new THREE.Mesh(mergeGeometries(list), mat); bar.add(m); list.forEach(g => g.dispose()); }
  for (const [mat, list] of parts) { const m = new THREE.Mesh(mergeGeometries(list), mat); root.add(m); list.forEach(g => g.dispose()); }

  // rèm nhung hồng hai bên sân khấu
  { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
    for (let x = 0; x < 256; x++) { const k = 0.5 + 0.5 * Math.sin(x / 256 * Math.PI * 2 * 9 + Math.sin(x * 0.11) * 0.8); g.fillStyle = 'rgb(' + Math.round(70 + 150 * k) + ',' + Math.round(14 + 40 * k) + ',' + Math.round(60 + 90 * k) + ')'; g.fillRect(x, 0, 1, 64); }
    const ct = new THREE.CanvasTexture(c); ct.colorSpace = THREE.SRGBColorSpace;
    for (const sd of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 10.5), new THREE.MeshBasicMaterial({ map: ct, color: 0xbbbbbb })); m.position.set(sd * 9.6, 5.2, -9.6); m.rotation.y = -sd * 0.35; root.add(m); } }
  const col = new THREE.Color();
  return {
    root, mirror, bar,
    update(t, mood, hi) {
      const hue = ((mood.hue % 1) + 1) % 1, k = mood.kick || 0;
      led.color.setHSL(hue, 1, 0.42 + 0.3 * k); led2.color.setHSL((hue + 0.45) % 1, 1, 0.42 + 0.25 * (mood.bass || 0));
      for (const m of ringMats) { m.color.copy(led.color); m.opacity = 0.16 + 0.3 * k; }
      backGlow.material.color.setHSL(0.07 + 0.03 * Math.sin(t * 0.4), 0.95, 0.5 + 0.08 * k);
      for (const l of lamps) l.intensity = 1.2 + 0.4 * k;
      mirror.visible = !!hi;
    },
    set barVisible(v) { bar.visible = v; },
  };
}
