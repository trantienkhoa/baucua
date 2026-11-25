import { THREE } from './three.js';
import { rng, GeoBuilder, mat, buildingBox, windowTexture, neonTexture, glowTexture, glowSprite, cloudTexture, Loop, roundedRect, smoothLoop, ribbon, roadTexture, lerp } from './util.js';

// ---------- hai phe ----------
export const TEAMS = [
  { id: 0, name: 'Rồng Đỏ', short: 'ĐỎ', color: '#ff3b5c', glow: 0xff3b5c, emoji: '🐲', key: ['1', 'do', 'đỏ', 'rong', 'rồng', 'red'] },
  { id: 1, name: 'Hổ Xanh', short: 'XANH', color: '#22c8ff', glow: 0x22c8ff, emoji: '🐯', key: ['2', 'xanh', 'ho', 'hổ', 'blue'] },
];
const NEUTRAL = 0xf5f0e0;

// ---------- giờ trong ngày của từng khu ----------
const MOODS = {
  night:   { top: '#060a24', hor: '#4a2468', fog: '#22183f', hs: '#8090e0', hg: '#2c1844', hi: 0.95, sun: '#9fb0ff', si: 0.5,  dir: [-0.4, 0.7, -0.6], night: 1,    stars: 1,   orb: '#e8eeff', orbSize: 120, water: '#0b1838' },
  evening: { top: '#0d1442', hor: '#d0466e', fog: '#4c2546', hs: '#9a7ad0', hg: '#3a1c2c', hi: 0.65, sun: '#ff8a5c', si: 0.55, dir: [-1, 0.18, 0.3],   night: 0.85, stars: 0.35, orb: '#ff7a4a', orbSize: 300, water: '#2a2050' },
  dawn:    { top: '#25305e', hor: '#ffae7a', fog: '#8a7a92', hs: '#b0a8e0', hg: '#4a3a3a', hi: 0.8,  sun: '#ffb07a', si: 0.85, dir: [1, 0.16, 0.25],   night: 0.5,  stars: 0.12, orb: '#ffc48a', orbSize: 320, water: '#4a5a8a' },
  sunset:  { top: '#2a3a90', hor: '#ff7a59', fog: '#d88a7c', hs: '#ffb8a0', hg: '#5a3a30', hi: 0.9,  sun: '#ffb36b', si: 1.15, dir: [1, 0.12, -0.25],  night: 0.3,  stars: 0,    orb: '#ffcf70', orbSize: 380, water: '#3a5aa0' },
  morning: { top: '#3f8be0', hor: '#ffe6c0', fog: '#cfdbe4', hs: '#cfe6ff', hg: '#6a7a4a', hi: 1.05, sun: '#fff1d6', si: 1.25, dir: [0.6, 0.55, 0.4],   night: 0.04, stars: 0,    orb: '#fffbe8', orbSize: 200, water: '#3a8ab0' },
  noon:    { top: '#3577d6', hor: '#ffd8a4', fog: '#e6c9a4', hs: '#d6ebff', hg: '#7a7048', hi: 1.05, sun: '#ffdcaa', si: 1.35, dir: [-0.5, 0.75, 0.3],  night: 0,    stars: 0,    orb: '#fff6dc', orbSize: 180, water: '#3a90b8' },
};
const MOOD_KEYS = ['top', 'hor', 'fog', 'hs', 'hg', 'sun', 'orb', 'water'];
export function mixMood(a, b, t) {
  const o = {};
  for (const k of MOOD_KEYS) o[k] = new THREE.Color(a[k]).lerp(new THREE.Color(b[k]), t);
  for (const k of ['hi', 'si', 'night', 'stars', 'orbSize']) o[k] = lerp(a[k], b[k], t);
  o.dir = a.dir.map((v, i) => lerp(v, b.dir[i], t));
  return o;
}

// ---------- 6 khu vực của bản đồ thế giới mở ----------
export const DISTRICTS = [
  { key: 'neon',  name: 'Quận Neon',        sub: 'Trung tâm không ngủ',   icon: '🌃', c: [0, 0],       time: '22:00', mood: 'night',   seed: 11 },
  { key: 'cholon', name: 'Chợ Lớn',         sub: 'Phố đèn lồng',          icon: '🏮', c: [-900, 180],  time: '19:30', mood: 'evening', seed: 22 },
  { key: 'cang',  name: 'Cảng Khánh Hội',   sub: 'Bến container lúc rạng đông', icon: '⚓', c: [820, 470], time: '05:40', mood: 'dawn',    seed: 33 },
  { key: 'bien',  name: 'Bãi Biển Vàng',    sub: 'Đường ven biển hoàng hôn', icon: '🏖️', c: [1080, -640], time: '17:50', mood: 'sunset',  seed: 44 },
  { key: 'chonoi', name: 'Chợ Nổi Miền Tây', sub: 'Ghe xuồng sáng sớm',    icon: '🛶', c: [-560, -860], time: '06:30', mood: 'morning', seed: 55 },
  { key: 'deo',   name: 'Đèo Mây',          sub: 'Đường đèo trên mây',    icon: '⛰️', c: [-260, 1080], time: '15:30', mood: 'noon',    seed: 66 },
];
export { MOODS };

export const RIVER = [[-2000, -980], [-1200, -900], [-560, -860], [80, -700], [420, -300], [480, 200], [560, 640], [700, 1100], [820, 1700]];
const SIGNS = ['PHỞ 24H', 'CÀ PHÊ', 'KARAOKE', 'BÁNH MÌ', 'TRÀ SỮA', 'HỦ TIẾU', 'LẨU DÊ', 'BIA HƠI', 'NAIL', 'HOTEL', 'SPA', 'ỐC ĐÊM', 'CƠM TẤM', 'XE ĐỘ', 'GAME', 'BÚN BÒ', 'SINH TỐ', 'NHẬU'];
const NEON_COLORS = ['#ff2e88', '#22e0ff', '#ffd23f', '#7c5cff', '#3dff8f', '#ff6a2e'];

export class World {
  constructor(scene, opts = {}) {
    this.scene = scene; this.low = !!opts.low;
    this.root = new THREE.Group(); scene.add(this.root);
    this.anim = [];          // hàm cập nhật mỗi khung hình
    this.glowMats = [];      // vật liệu đèn: mờ đi ban ngày
    this.buildMats = [];     // vật liệu nhà: cửa sổ sáng ban đêm
    this.waterMats = [];
    this.districts = [];
    this.solid = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.unlit = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    this.roadMat = new THREE.MeshLambertMaterial({ map: roadTexture() });
    this.styles = {};
    for (const s of ['office', 'home', 'old', 'glass']) {
      const tex = windowTexture(s, s.length * 77);
      const m = new THREE.MeshLambertMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1, vertexColors: true });
      this.styles[s] = m; this.buildMats.push(m);
    }
    this.geo = { box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10), cone: new THREE.ConeGeometry(0.5, 1, 8), sph: new THREE.SphereGeometry(0.5, 10, 8), cone4: new THREE.ConeGeometry(0.5, 1, 4), plane: new THREE.PlaneGeometry(1, 1) };
    this.buildSky();
    this.buildTerrain();
    DISTRICTS.forEach((d, i) => this.districts.push(this.buildDistrict(d, i)));
    this.buildHighways();
    this.buildClouds();
  }

  // ----- trời -----
  buildSky() {
    const g = new THREE.SphereGeometry(6000, 32, 16);
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    this.sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
    this.sky.renderOrder = -10; this.scene.add(this.sky);
    const r = rng(5), sp = [];
    for (let i = 0; i < 900; i++) { const a = r() * Math.PI * 2, e = Math.asin(r() * 0.95 + 0.05), R = 5500; sp.push(Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R, Math.sin(a) * Math.cos(e) * R); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, color: 0xffffff, transparent: true, fog: false, depthWrite: false }));
    this.scene.add(this.stars);
    this.orb = glowSprite(0xffffff, 300); this.orb.material.fog = false; this.scene.add(this.orb);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 1); this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.scene.fog = new THREE.Fog(0x000000, 200, 1500);
  }
  setMood(m, camPos) {
    const pos = this.sky.geometry.attributes.position, col = this.sky.geometry.attributes.color, c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = pos.getY(i) / 6000;
      const t = Math.pow(Math.max(0, h), 0.55);
      c.copy(m.hor).lerp(m.top, h < 0 ? 0 : t); if (h < 0) c.copy(m.hor).multiplyScalar(0.7);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
    this.scene.fog.color.copy(m.fog);
    // three.js tính ánh sáng theo vật lý: nhân hệ số để cảnh đủ sáng trên LIVE
    this.hemi.color.copy(m.hs); this.hemi.groundColor.copy(m.hg); this.hemi.intensity = m.hi * (1.7 + m.night * 0.6);
    this.sun.color.copy(m.sun); this.sun.intensity = m.si * 1.6;
    const d = new THREE.Vector3(...m.dir).normalize();
    this.sun.position.copy(d).multiplyScalar(1000).add(camPos); this.sun.target.position.copy(camPos);
    this.orb.position.copy(d).multiplyScalar(5200).add(camPos); this.orb.material.color.copy(m.orb); this.orb.scale.setScalar(m.orbSize * 1.6);
    this.sky.position.copy(camPos); this.stars.position.copy(camPos);
    this.stars.material.opacity = m.stars;
    for (const bm of this.buildMats) bm.emissiveIntensity = 0.12 + m.night * 0.95;
    for (const gm of this.glowMats) gm.opacity = (gm.userData.base || 1) * (0.25 + 0.75 * m.night);
    for (const wm of this.waterMats) wm.color.copy(m.water);
    this.night = m.night;
  }

  // ----- đất, sông, ruộng, cây -----
  buildTerrain() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshLambertMaterial({ color: 0x3d5a32 }));
    ground.rotation.x = -Math.PI / 2; this.root.add(ground);
    // biển phía đông
    const seaMat = new THREE.MeshPhongMaterial({ color: 0x2a5a9a, shininess: 90, specular: 0x88aaff });
    this.waterMats.push(seaMat);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 9000), seaMat); sea.rotation.x = -Math.PI / 2; sea.position.set(1360 + 2000, 0.04, 0); this.root.add(sea);
    // sông
    const riverMat = new THREE.MeshPhongMaterial({ color: 0x2a5a9a, shininess: 70, specular: 0x6688cc });
    this.waterMats.push(riverMat);
    const river = new THREE.Mesh(ribbon(smoothLoop(RIVER, 8).slice(0, (RIVER.length - 1) * 8), 110, 0.05, false), riverMat); this.root.add(river);
    // ruộng lúa + cây xanh rải rác (nhìn từ trên cao như bản đồ thật)
    const r = rng(99), fields = new GeoBuilder(), trees = new GeoBuilder();
    const greens = [0x5f8f3a, 0x77a83f, 0x4f7a30, 0x8cb84a, 0x6a9a34, 0xa4b84a];
    const nearDistrict = (x, z, pad) => DISTRICTS.some(d => Math.abs(x - d.c[0]) < 300 + pad && Math.abs(z - d.c[1]) < 300 + pad);
    for (let i = 0; i < 520; i++) {
      const x = r.range(-2400, 1300), z = r.range(-1800, 1900);
      if (nearDistrict(x, z, 30) || x > 1250) continue;
      fields.add(this.geo.plane, mat(x, 0.02, z, r.range(-0.2, 0.2), r.range(50, 120), r.range(40, 90), 1, -Math.PI / 2), greens[r.int(0, greens.length - 1)]);
    }
    for (let i = 0; i < 700; i++) {
      const x = r.range(-2400, 1300), z = r.range(-1800, 1900);
      if (nearDistrict(x, z, 10) || x > 1250) continue;
      const s = r.range(7, 16);
      trees.add(this.geo.cyl, mat(x, s * 0.3, z, 0, s * 0.12, s * 0.6, s * 0.12), 0x6b4a2b);
      trees.add(this.geo.sph, mat(x, s * 0.85, z, 0, s * 0.9, s * 0.8, s * 0.9), r.pick([0x2f6b2a, 0x3d7d2f, 0x24572a]));
    }
    this.root.add(new THREE.Mesh(fields.build(), this.solid));
    this.root.add(new THREE.Mesh(trees.build(), this.solid));
  }

  buildHighways() {
    const b = new GeoBuilder();
    const links = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 4], [2, 3]];
    for (const [i, j] of links) {
      const a = DISTRICTS[i].c, c = DISTRICTS[j].c;
      const dx = c[0] - a[0], dz = c[1] - a[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
      const p1 = [a[0] + ux * 275, a[1] + uz * 275], p2 = [c[0] - ux * 275, c[1] - uz * 275];
      const m = new THREE.Mesh(ribbon([p1, p2], 26, 0.08, false), this.roadMat); this.root.add(m);
      // cột đèn cao tốc
      const n = Math.floor((L - 550) / 60);
      for (let k = 0; k <= n; k++) { const t = k / Math.max(1, n); b.add(this.geo.box, mat(lerp(p1[0], p2[0], t) - uz * 16, 7, lerp(p1[1], p2[1], t) + ux * 16, 0, 0.6, 14, 0.6), 0x8a8f99); }
      this._hwLights = (this._hwLights || []);
      for (let k = 0; k <= n; k++) { const t = k / Math.max(1, n); this._hwLights.push([lerp(p1[0], p2[0], t) - uz * 14, 14, lerp(p1[1], p2[1], t) + ux * 14]); }
    }
    this.root.add(new THREE.Mesh(b.build(), this.solid));
    this.root.add(this.glowPoints(this._hwLights, '#ffcf8a', 18));
  }

  buildClouds() {
    const r = rng(3), tex = cloudTexture();
    this.cloudMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.75, depthWrite: false, color: 0xffffff });
    this.clouds = new THREE.Group();
    for (let i = 0; i < (this.low ? 40 : 80); i++) {
      const s = new THREE.Sprite(this.cloudMat); const w = r.range(260, 560);
      s.scale.set(w, w * 0.45, 1); s.position.set(r.range(-2200, 1900), r.range(330, 560), r.range(-1700, 1900));
      this.clouds.add(s);
    }
    this.root.add(this.clouds);
  }

  // ----- tiện ích dựng cảnh -----
  glowPoints(list, color, size, base = 1) {
    const pos = [], col = [], c = new THREE.Color();
    for (const p of list) { pos.push(p[0], p[1], p[2]); c.set(p[3] || color); col.push(c.r, c.g, c.b); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({ size, map: glowTexture(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    m.userData.base = base; this.glowMats.push(m);
    return new THREE.Points(g, m);
  }
  sign(group, text, color, x, y, z, ry, h = 6, vertical = false, plate = 'rgba(10,6,20,0.85)') {
    const key = text + '|' + color + '|' + vertical + '|' + plate;
    this._signs = this._signs || new Map();
    let m = this._signs.get(key);
    if (!m) {
      const t = vertical ? verticalTexture(text, color) : neonTexture(text, color, { plate });
      m = new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, side: THREE.DoubleSide });
      m.userData.aspect = t.userData.aspect; this._signs.set(key, m);
    }
    return this.signMesh(group, m, m.userData.aspect, x, y, z, ry, vertical ? h * 2.4 : h);
  }
  signMesh(group, material, aspect, x, y, z, ry, h) {
    const m = new THREE.Mesh(this.geo.plane, material);
    m.scale.set(h * aspect, h, 1); m.position.set(x, y, z); m.rotation.y = ry; group.add(m);
    return m;
  }
  roadGrid(group, cx, cz, xs, zs, w, len) {   // xs/zs: toạ độ tâm đường
    for (const x of xs) group.add(new THREE.Mesh(ribbon([[cx + x, cz - len / 2], [cx + x, cz + len / 2]], w, 0.07, false), this.roadMat));
    for (const z of zs) group.add(new THREE.Mesh(ribbon([[cx - len / 2, cz + z], [cx + len / 2, cz + z]], w, 0.075, false), this.roadMat));
    const b = new GeoBuilder();
    for (const x of xs) for (const z of zs) b.add(this.geo.plane, mat(cx + x, 0.09, cz + z, 0, w, w, 1, -Math.PI / 2), 0x2b2d33);
    group.add(new THREE.Mesh(b.build(), this.solid));
  }
  pad(group, cx, cz, w, h, color) { const m = new THREE.Mesh(this.geo.plane, new THREE.MeshLambertMaterial({ color })); m.rotation.x = -Math.PI / 2; m.scale.set(w, h, 1); m.position.set(cx, 0.03, cz); group.add(m); return m; }
  palm(b, x, z, s, r) {
    const lean = r.range(-0.25, 0.25), lean2 = r.range(-0.25, 0.25);
    for (let k = 0; k < 5; k++) b.add(this.geo.cyl, mat(x + lean * k * s * 0.18, s * (0.1 + k * 0.2), z + lean2 * k * s * 0.18, 0, s * 0.09, s * 0.22, s * 0.09), 0x8a6a45);
    const tx = x + lean * 5 * s * 0.18, ty = s * 1.05, tz = z + lean2 * 5 * s * 0.18;
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; b.add(this.geo.cone4, mat(tx + Math.cos(a) * s * 0.3, ty - s * 0.05, tz + Math.sin(a) * s * 0.3, -a, s * 0.06, s * 0.75, s * 0.2, 0, -(Math.PI / 2 + 0.35)), k % 2 ? 0x3f8f3a : 0x2f7a32); }
  }
  buildings(b, style, x, z, w, d, h, tint) { b.add(buildingBox(w, h, d), mat(x, h / 2, z), tint); }

  buildDistrict(def, idx) {
    const g = new THREE.Group(), [cx, cz] = def.c, r = rng(def.seed);
    g.name = def.key; this.root.add(g);
    const D = { def, idx, group: g, center: new THREE.Vector3(cx, 0, cz), loops: [], water: [], air: { r: 170, y: 70 }, plaza: new THREE.Vector3(cx, 0, cz), owner: -1, shots: [] };
    const bs = { office: new GeoBuilder(), home: new GeoBuilder(), old: new GeoBuilder(), glass: new GeoBuilder() };
    const solid = new GeoBuilder(), unlit = new GeoBuilder(), lights = [];
    const B = (style, x, z, w, d, h, tint) => bs[style].add(buildingBox(w, h, d), mat(x, h / 2, z), tint);
    const box = (x, y, z, w, h, d, c, ry = 0) => solid.add(this.geo.box, mat(x, y, z, ry, w, h, d), c);
    const ubox = (x, y, z, w, h, d, c, ry = 0) => unlit.add(this.geo.box, mat(x, y, z, ry, w, h, d), c);
    let landmark = new THREE.Vector3(cx, 120, cz);

    if (def.key === 'neon') {
      this.pad(g, cx, cz, 580, 580, 0x4c5060);
      const rc = [-255, -85, 85, 255]; this.roadGrid(g, cx, cz, rc, rc, 30, 560);
      const bc = [-170, 0, 170];
      for (const bx of bc) for (const bz of bc) D.loops.push(new Loop(roundedRect(cx + bx, cz + bz, 170, 170, 14)));
      D.loops.push(new Loop(roundedRect(cx, cz, 510, 510, 20)));
      for (const bx of bc) for (const bz of bc) {
        if (bx === 0 && bz === 0) continue;
        const near = 1 - (Math.abs(bx) + Math.abs(bz)) / 400;
        for (const ox of [-35, 35]) for (const oz of [-35, 35]) {
          const w = r.range(34, 56), d = r.range(34, 56), h = r.range(40, 120) * (0.6 + near) + (r.chance(0.18) ? 80 : 0);
          const st = r.chance(0.5) ? 'glass' : 'office';
          B(st, cx + bx + ox, cz + bz + oz, w, d, h, new THREE.Color().setHSL(r.range(0.55, 0.75), 0.25, r.range(0.55, 0.85)));
          if (r.chance(0.35)) box(cx + bx + ox, h + 3, cz + bz + oz, w * 0.4, 6, d * 0.4, 0x555a66);
          lights.push([cx + bx + ox, h + 7, cz + bz + oz, '#ff3030']);
          ubox(cx + bx + ox, 3.2, cz + bz + oz, w + 0.6, 6.4, d + 0.6, r.pick([0xffd9a0, 0xff9ac8, 0x9fe8ff, 0xfff0c0, 0xc8a0ff, 0xa0ffc8]));
          if (r.chance(0.7)) { // bảng hiệu neon mặt đường
            const side = r.int(0, 3), ang = side * Math.PI / 2, txt = r.pick(SIGNS), col = r.pick(NEON_COLORS);
            const fx = Math.sin(ang), fz = Math.cos(ang), off = (side % 2 ? w : d) / 2 + 0.6;
            this.sign(g, txt, col, cx + bx + ox + fx * off, r.range(10, 24), cz + bz + oz + fz * off, ang, r.range(5, 8), r.chance(0.4));
          }
        }
      }
      // Tháp Rồng ở giữa quảng trường
      B('glass', cx, cz + 30, 46, 46, 230, new THREE.Color(0x9fd6ff));
      B('glass', cx, cz + 30, 34, 34, 270, new THREE.Color(0xb8e4ff));
      box(cx, 300, cz + 30, 3, 60, 3, 0xdddddd);
      ubox(cx, 236, cz + 30, 48, 2, 48, 0xff2e88); ubox(cx, 160, cz + 30, 48, 2, 48, 0x22e0ff);
      lights.push([cx, 332, cz + 30, '#ff2e88']);
      landmark = new THREE.Vector3(cx, 300, cz + 30);
      // quảng trường + đài phun nước
      solid.add(this.geo.cyl, mat(cx, 0.4, cz - 40, 0, 46, 0.8, 46), 0x6a6f80);
      solid.add(this.geo.cyl, mat(cx, 1.2, cz - 40, 0, 18, 1.6, 18), 0x8a90a0);
      unlit.add(this.geo.cyl, mat(cx, 2.1, cz - 40, 0, 15, 0.3, 15), 0x2ab8ff);
      D.plaza.set(cx, 0, cz - 40);
      this.sign(g, 'SÀI GÒN', '#ff2e88', cx, 205, cz + 30 - 23.6, Math.PI, 18);
      this.sign(g, 'SÀI GÒN', '#22e0ff', cx, 205, cz + 30 + 23.6, 0, 18);
      // bảng LED trên mái (đổi chữ theo người tặng quà lớn)
      D.board = this.makeBoard(g, cx - 170 - 35, 150, cz - 170 - 35, Math.PI / 4);
      for (const x of rc) for (let k = -260; k <= 260; k += 52) { lights.push([cx + x + 17, 11, cz + k, '#ffd9a0'], [cx + k, 11, cz + x + 17, '#ffd9a0']); }
      D.air = { r: 200, y: 110 };
      D.shots = [{ p: [-85, 16, -235], l: [-85, 24, 60] }, { p: [250, 160, -250], l: [0, 40, 0] }, { p: [-200, 7, -85], l: [60, 16, -85] }];
    }

    if (def.key === 'cholon') {
      this.pad(g, cx, cz, 560, 520, 0x7a6a5e);
      const xs = [-250, -84, 84, 250], zs = [-230, 0, 230]; this.roadGrid(g, cx, cz, xs, zs, 24, 540);
      for (const bx of [-167, 0, 167]) for (const bz of [-115, 115]) D.loops.push(new Loop(roundedRect(cx + bx, cz + bz, 167, 230, 12)));
      D.loops.push(new Loop(roundedRect(cx, cz, 500, 460, 18)));
      const facade = [0xf2d16b, 0xe88a6a, 0x9fd3a8, 0xf4a6b8, 0x8fc1e8, 0xf0e2c0, 0xd9b38c];
      for (const bx of [-167, 0, 167]) for (const bz of [-115, 115]) {
        if (bx === 0 && bz === -115) { // chùa
          const px = cx, pz = cz - 115;
          box(px, 0.5, pz, 120, 1, 170, 0x8a7a66);
          for (let k = 0; k < 4; k++) {
            const s = 1 - k * 0.2, y = 8 + k * 14;
            box(px, y, pz, 50 * s, 12, 50 * s, 0xb02a2a);
            box(px, y + 7, pz, 64 * s, 2.4, 64 * s, 0x2f6b4a);
            ubox(px, y + 8.5, pz, 66 * s, 0.6, 66 * s, 0xffc23a);
          }
          box(px, 70, pz, 4, 14, 4, 0xffc23a); landmark = new THREE.Vector3(px, 75, pz);
          for (let k = -2; k <= 2; k++) lights.push([px + k * 22, 12, pz - 60, '#ff3a2a']);
          D.plaza.set(px, 0, pz - 62);
          this.sign(g, 'THIÊN HẬU CUNG', '#ffcf3a', px, 28, pz - 26, Math.PI, 5, false, 'rgba(120,10,10,0.95)');
          continue;
        }
        // nhà ống san sát
        for (const side of [-1, 1]) {
          let x = -70;
          while (x < 70) {
            const w = r.range(8, 13), h = r.range(14, 38), d = 34;
            const hx = cx + bx + x + w / 2, hz = cz + bz + side * (103 - d / 2 - 1);
            B(r.chance(0.5) ? 'old' : 'home', hx, hz, w, d, h, new THREE.Color(r.pick(facade)));
            if (r.chance(0.55)) this.sign(g, r.pick(['HỦ TIẾU', 'VỊT QUAY', 'DIMSUM', 'TIỆM VÀNG', 'MÌ VỊT', 'THUỐC BẮC', 'SỦI CẢO', 'TRÀ']), r.pick(['#ffd23f', '#ff4a3a', '#ffe9a0']), hx, r.range(8, Math.min(h - 3, 18)), hz + side * (d / 2 + 0.5), side > 0 ? 0 : Math.PI, 5, r.chance(0.6), 'rgba(140,12,12,0.92)');
            x += w + 0.4;
          }
        }
        for (let k = 0; k < 4; k++) B('home', cx + bx + r.range(-50, 50), cz + bz + r.range(-40, 40), r.range(16, 26), r.range(16, 26), r.range(20, 44), new THREE.Color(r.pick(facade)));
      }
      // dây đèn lồng giăng ngang phố
      const lanterns = new GeoBuilder();
      for (const x of xs) for (let z = -210; z <= 210; z += 30) {
        if (zs.some(q => Math.abs(q - z) < 16)) continue;
        for (let k = 0; k <= 4; k++) {
          const t = k / 4, lx = cx + x - 12 + t * 24, ly = 17 - Math.sin(t * Math.PI) * 3, lz = cz + z;
          lanterns.add(this.geo.sph, mat(lx, ly, lz, 0, 1.6, 2, 1.6), 0xff2a1a); lights.push([lx, ly, lz, '#ff5a2a']);
        }
      }
      g.add(new THREE.Mesh(lanterns.build(), this.unlit));
      // dây điện chằng chịt
      const wires = [];
      for (const z of zs) for (let x = -250; x < 250; x += 36) for (let k = 0; k < 3; k++) wires.push(cx + x, 15 + k, cz + z + 13, cx + x + 36, 13 + k + r.range(-1, 1), cz + z + 13 + r.range(-2, 2));
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3));
      g.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x111111 })));
      D.air = { r: 190, y: 80 };
      D.shots = [{ p: [-84, 9, -60], l: [-84, 12, 80] }, { p: [200, 120, -260], l: [0, 20, 0] }, { p: [10, 30, -230], l: [0, 30, -115] }];
    }

    if (def.key === 'cang') {
      this.pad(g, cx + 40, cz, 520, 560, 0x8a8c90);
      D.loops.push(new Loop(roundedRect(cx + 40, cz, 440, 480, 30)));
      D.loops.push(new Loop(roundedRect(cx + 60, cz, 250, 300, 22)));
      g.add(new THREE.Mesh(ribbon(roundedRect(cx + 40, cz, 440, 480, 30), 26, 0.07), this.roadMat));
      g.add(new THREE.Mesh(ribbon(roundedRect(cx + 60, cz, 250, 300, 22), 22, 0.075), this.roadMat));
      const cc = [0xd84a3a, 0x2a6ad8, 0xf09a2a, 0x3aa85a, 0xe8e8e8, 0xf0d23a, 0x8a3ad8, 0x2ab8b8];
      for (let row = -4; row <= 4; row++) for (let col = -2; col <= 2; col++) {
        if (r.chance(0.12)) continue;
        const x = cx + 60 + col * 34, z = cz + row * 28, hN = r.int(1, 4);
        for (let k = 0; k < hN; k++) box(x, 3 + k * 6.1, z, 26, 6, 11, r.pick(cc));
      }
      // cần cẩu dọc bờ sông
      for (let k = -1; k <= 1; k++) {
        const z = cz + k * 150, x = cx - 205;
        box(x - 8, 30, z - 10, 3, 60, 3, 0xf0b42a); box(x + 8, 30, z - 10, 3, 60, 3, 0xf0b42a); box(x - 8, 30, z + 10, 3, 60, 3, 0xf0b42a); box(x + 8, 30, z + 10, 3, 60, 3, 0xf0b42a);
        box(x - 20, 62, z, 80, 5, 8, 0xf0b42a); box(x + 6, 68, z, 10, 8, 10, 0xd0d4dc);
        lights.push([x - 58, 64, z, '#ff3030'], [x + 18, 66, z, '#fff2c0']);
      }
      // tàu chở hàng
      const sx = cx - 280, sz = cz;
      box(sx, 4, sz, 34, 12, 230, 0x2a3442); box(sx, 10.5, sz, 34, 1, 230, 0xb8402a);
      for (let k = -4; k <= 3; k++) for (let h = 0; h < 2; h++) box(sx, 14 + h * 6, sz + k * 24, 26, 6, 11, r.pick(cc));
      box(sx, 22, sz + 100, 30, 24, 18, 0xe8e8e8); ubox(sx, 30, sz + 90.8, 26, 3, 0.4, 0x9fe0ff);
      // kho hàng
      for (let k = 0; k < 3; k++) { B('office', cx + 210, cz - 150 + k * 150, 50, 100, 18, new THREE.Color(0x9aa4b0)); box(cx + 210, 19, cz - 150 + k * 150, 54, 2, 104, 0x4a6a8a); }
      for (let k = -1; k <= 1; k += 2) for (let j = -1; j <= 1; j += 2) { box(cx + 40 + k * 200, 25, cz + j * 220, 2, 50, 2, 0x888888); lights.push([cx + 40 + k * 200, 51, cz + j * 220, '#fff4d0']); }
      landmark = new THREE.Vector3(cx - 205, 70, cz);
      D.plaza.set(cx + 60, 0, cz + 170);
      this.sign(g, 'CẢNG KHÁNH HỘI', '#ffd23f', cx + 210, 24, cz - 150 - 51, Math.PI, 7);
      D.air = { r: 200, y: 90 };
      D.shots = [{ p: [-170, 12, -230], l: [-200, 30, 0] }, { p: [250, 140, 260], l: [0, 10, 0] }, { p: [150, 5, -120], l: [60, 12, 0] }];
      D.water.push({ x: cx - 280, z: cz });
    }

    if (def.key === 'bien') {
      this.pad(g, cx - 40, cz, 480, 640, 0xcdb88a);
      const sand = new THREE.Mesh(this.geo.plane, new THREE.MeshLambertMaterial({ color: 0xf0d79a })); sand.rotation.x = -Math.PI / 2; sand.scale.set(220, 1200, 1); sand.position.set(cx + 180, 0.035, cz); g.add(sand);
      const ctrl = [[cx - 160, cz - 290], [cx + 60, cz - 300], [cx + 110, cz - 120], [cx + 100, cz + 120], [cx + 60, cz + 300], [cx - 160, cz + 290], [cx - 200, cz]];
      const coast = smoothLoop(ctrl, 12); D.loops.push(new Loop(coast));
      D.loops.push(new Loop(roundedRect(cx - 70, cz, 150, 360, 30)));
      g.add(new THREE.Mesh(ribbon(coast, 26, 0.07), this.roadMat));
      g.add(new THREE.Mesh(ribbon(roundedRect(cx - 70, cz, 150, 360, 30), 20, 0.075), this.roadMat));
      const pb = new GeoBuilder();
      for (let z = -560; z <= 560; z += 34) { this.palm(pb, cx + 135 + r.range(-6, 6), cz + z, r.range(14, 22), r); }
      for (let z = -280; z <= 280; z += 70) this.palm(pb, cx - 70 + r.range(-20, 20), cz + z, r.range(12, 18), r);
      g.add(new THREE.Mesh(pb.build(), this.solid));
      // khách sạn ven biển
      for (let z = -260; z <= 260; z += 65) B('home', cx - 230, cz + z, r.range(36, 50), r.range(40, 52), r.range(30, 80), new THREE.Color(r.pick([0xffffff, 0xf8e6d0, 0xd8f0f8, 0xffe0e8])));
      // dù che nắng
      const uc = [0xff4a6a, 0xffd23a, 0x2ac8ff, 0x3ae08a, 0xff8a2a];
      for (let i = 0; i < 40; i++) { const x = cx + 175 + r.range(0, 90), z = cz + r.range(-520, 520); box(x, 3, z, 0.5, 6, 0.5, 0xdddddd); solid.add(this.geo.cone, mat(x, 6.6, z, 0, 9, 2.4, 9), r.pick(uc)); box(x + 3, 0.6, z, 2.4, 0.6, 5, 0xffffff); }
      // ngọn hải đăng
      solid.add(this.geo.sph, mat(cx + 200, 0, cz - 600, 0, 120, 50, 120), 0x5a7a3a);
      solid.add(this.geo.cyl, mat(cx + 200, 45, cz - 600, 0, 9, 46, 9), 0xffffff);
      for (let k = 0; k < 3; k++) solid.add(this.geo.cyl, mat(cx + 200, 30 + k * 13, cz - 600, 0, 9.4, 4, 9.4), 0xd83a3a);
      ubox(cx + 200, 71, cz - 600, 6, 5, 6, 0xfff2b0); lights.push([cx + 200, 72, cz - 600, '#fff2b0']);
      landmark = new THREE.Vector3(cx + 200, 80, cz - 600);
      // thuyền thúng / ca nô
      D.boats = [];
      for (let i = 0; i < 6; i++) { const m = boatMesh(this, r.pick([0xffffff, 0xff5a3a, 0x2a8ad8])); m.position.set(cx + 340 + r.range(0, 260), 0.6, cz + r.range(-500, 500)); m.rotation.y = r.range(0, 6); g.add(m); D.boats.push({ m, ph: r.range(0, 6), sp: r.range(0.1, 0.4) }); }
      for (let z = -540; z <= 540; z += 60) lights.push([cx + 116, 10, cz + z, '#ffcf8a']);
      D.plaza.set(cx + 180, 0, cz + 40);
      this.sign(g, 'BÃI BIỂN VÀNG', '#ff9a3a', cx - 205, 60, cz, -Math.PI / 2, 9);
      D.air = { r: 210, y: 70 };
      D.shots = [{ p: [190, 8, -200], l: [100, 10, 0] }, { p: [420, 90, 200], l: [0, 10, 0] }, { p: [60, 30, -330], l: [90, 10, -100] }];
      D.foam = new THREE.Mesh(this.geo.plane, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
      D.foam.rotation.x = -Math.PI / 2; D.foam.scale.set(10, 1200, 1); D.foam.position.set(cx + 290, 0.08, cz); g.add(D.foam);
    }

    if (def.key === 'chonoi') {
      const north = new THREE.Mesh(this.geo.plane, new THREE.MeshLambertMaterial({ color: 0x6a8a3a })); north.rotation.x = -Math.PI / 2; north.scale.set(560, 200, 1); north.position.set(cx, 0.03, cz + 180); g.add(north);
      const south = north.clone(); south.position.set(cx, 0.03, cz - 180); g.add(south);
      const wm = new THREE.MeshPhongMaterial({ color: 0x3a8ab0, shininess: 60 }); this.waterMats.push(wm);
      const river = new THREE.Mesh(this.geo.plane, wm); river.rotation.x = -Math.PI / 2; river.scale.set(700, 170, 1); river.position.set(cx, 0.06, cz); g.add(river);
      const lp = roundedRect(cx, cz, 440, 300, 26); D.loops.push(new Loop(lp));
      g.add(new THREE.Mesh(ribbon(lp, 22, 0.08), this.roadMat));
      D.loops.push(new Loop(roundedRect(cx, cz + 190, 360, 90, 20)));
      g.add(new THREE.Mesh(ribbon(roundedRect(cx, cz + 190, 360, 90, 20), 18, 0.075), this.roadMat));
      for (const x of [-220, 220]) { box(cx + x - 12, 1.5, cz, 1, 3, 170, 0xb08050); box(cx + x + 12, 1.5, cz, 1, 3, 170, 0xb08050); }
      // nhà sàn ven sông
      for (const side of [-1, 1]) for (let x = -250; x <= 250; x += 26) {
        if (Math.abs(x) > 195 && Math.abs(x) < 245) continue;
        const z = cz + side * 102, w = r.range(14, 20);
        for (const px of [-w / 2 + 1, w / 2 - 1]) for (const pz of [-5, 5]) box(cx + x + px, 2.5, z + pz, 0.8, 5, 0.8, 0x6a4a2a);
        box(cx + x, 7, z, w, 4, 14, r.pick([0xc8a070, 0xb08860, 0xd8c090]));
        solid.add(this.geo.cone4, mat(cx + x, 11.5, z, Math.PI / 4, w * 1.1, 5, 18), r.pick([0x7a4a2a, 0x3a6a8a, 0x8a3a2a]));
        lights.push([cx + x, 8, z + side * -8, '#ffcf7a']);
      }
      const pb = new GeoBuilder();
      for (let i = 0; i < 60; i++) { const side = r.chance(0.5) ? 1 : -1; this.palm(pb, cx + r.range(-270, 270), cz + side * r.range(170, 275), r.range(12, 20), r); }
      g.add(new THREE.Mesh(pb.build(), this.solid));
      // ghe hàng trái cây
      D.boats = []; D.boatLoops = [new Loop(roundedRect(cx, cz, 600, 90, 40)), new Loop(roundedRect(cx, cz, 520, 40, 18))];
      for (let i = 0; i < 14; i++) {
        const m = boatMesh(this, r.pick([0x7a4a2a, 0x2a6a8a, 0x8a5a2a]), true, r);
        g.add(m); D.boats.push({ m, loop: D.boatLoops[i % 2], s: r.range(0, 600), sp: r.range(4, 9) });
      }
      landmark = new THREE.Vector3(cx, 40, cz + 190);
      box(cx, 14, cz + 190, 40, 1.2, 14, 0xc85a2a); box(cx - 18, 7, cz + 190, 1.4, 14, 1.4, 0x7a4a2a); box(cx + 18, 7, cz + 190, 1.4, 14, 1.4, 0x7a4a2a);
      this.sign(g, 'CHỢ NỔI', '#ff7a2a', cx, 20, cz + 182.5, Math.PI, 8, false, 'rgba(255,240,210,0.95)');
      D.plaza.set(cx, 0, cz + 150);
      D.air = { r: 200, y: 60 };
      D.shots = [{ p: [-150, 10, -40], l: [0, 2, 0] }, { p: [300, 110, -260], l: [0, 0, 0] }, { p: [0, 6, -130], l: [60, 4, 0] }];
    }

    if (def.key === 'deo') {
      this.pad(g, cx, cz, 640, 640, 0x6a8a44);
      const ctrl = [[cx - 220, cz - 200], [cx - 40, cz - 250], [cx + 90, cz - 150], [cx + 230, cz - 210], [cx + 250, cz + 20], [cx + 120, cz + 90], [cx + 210, cz + 230], [cx - 20, cz + 250], [cx - 130, cz + 120], [cx - 250, cz + 160], [cx - 270, cz - 30]];
      const road = smoothLoop(ctrl, 10); D.loops.push(new Loop(road));
      g.add(new THREE.Mesh(ribbon(road, 24, 0.08), this.roadMat));
      for (let i = 0; i < 10; i++) { const x = cx + r.range(-200, 200), z = cz + r.range(-200, 200); if (Math.hypot(x - cx + 20, z - cz) < 90 || road.some(p => Math.hypot(p[0] - x, p[1] - z) < 60)) continue; solid.add(this.geo.cone, mat(x, 18, z, r.range(0, 3), 70, 36, 70), 0x5a8a42); }
      // lan can
      for (let i = 0; i < road.length; i += 2) { const p = road[i]; box(p[0], 1, p[1], 1, 2, 1, i % 4 ? 0xffffff : 0xd83a3a); }
      // núi
      const mb = new GeoBuilder(), mc = [0x4a7a3a, 0x5a8a42, 0x3f6a34, 0x6a8a4a];
      for (let i = 0; i < 46; i++) {
        const a = r.range(0, Math.PI * 2), d = r.range(330, 620), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, h = r.range(120, 320), w = r.range(140, 260);
        mb.add(this.geo.cone, mat(x, h / 2, z, r.range(0, 3), w, h, w * r.range(0.8, 1.2)), r.pick(mc));
        mb.add(this.geo.cone, mat(x, h * 0.86, z, r.range(0, 3), w * 0.3, h * 0.3, w * 0.3), 0x8a8a7a);
      }
      mb.add(this.geo.cone, mat(cx + 60, 140, cz + 500, 0, 240, 280, 200), 0x4a7a3a);
      g.add(new THREE.Mesh(mb.build(), this.solid));
      // ruộng bậc thang
      for (let k = 0; k < 6; k++) box(cx - 20, k * 2.5 + 1, cz - 20 + k * 6, 110 - k * 14, 2.5, 90 - k * 12, k % 2 ? 0x8cc04a : 0x7ab040);
      // chòi ngắm cảnh + thác nước
      box(cx - 20, 22, cz - 2, 18, 1, 18, 0x9a3a2a); solid.add(this.geo.cone4, mat(cx - 20, 27, cz - 2, Math.PI / 4, 24, 8, 24), 0xa83a2a);
      for (const a of [-7, 7]) for (const b of [-7, 7]) box(cx - 20 + a, 18, cz - 2 + b, 1, 7, 1, 0x7a2a1a);
      const fallTex = waterfallTexture(); this._fallTex = fallTex;
      const fall = new THREE.Mesh(this.geo.plane, new THREE.MeshBasicMaterial({ map: fallTex, transparent: true, opacity: 0.9, toneMapped: false }));
      fall.scale.set(40, 160, 1); fall.position.set(cx + 60, 80, cz + 420); fall.rotation.y = Math.PI; g.add(fall);
      const mist = glowSprite(0xffffff, 120, 0.5); mist.position.set(cx + 60, 6, cz + 410); g.add(mist);
      landmark = new THREE.Vector3(cx - 20, 34, cz - 2);
      const pb = new GeoBuilder();
      for (let i = 0; i < 70; i++) { const x = cx + r.range(-300, 300), z = cz + r.range(-300, 300); if (road.some(p => Math.hypot(p[0] - x, p[1] - z) < 26)) continue; const s = r.range(10, 18); pb.add(this.geo.cyl, mat(x, s * 0.25, z, 0, 1.2, s * 0.5, 1.2), 0x5a3a20); pb.add(this.geo.cone, mat(x, s * 0.9, z, 0, s * 0.7, s * 1.1, s * 0.7), r.pick([0x2a5a2a, 0x356a30, 0x24502a])); }
      g.add(new THREE.Mesh(pb.build(), this.solid));
      this.sign(g, 'ĐÈO MÂY', '#3dff8f', cx - 20, 40, cz - 2, 0, 7, false, 'rgba(10,40,20,0.85)');
      D.plaza.set(cx - 20, 0, cz - 60);
      D.lowClouds = [];
      for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(this.cloudMat || new THREE.SpriteMaterial({ map: cloudTexture(), transparent: true, opacity: 0.7, depthWrite: false })); const w = r.range(120, 240); s.scale.set(w, w * 0.45, 1); s.position.set(cx + r.range(-500, 500), r.range(70, 150), cz + r.range(-500, 500)); g.add(s); D.lowClouds.push(s); }
      D.air = { r: 220, y: 90 };
      D.shots = [{ p: [-260, 14, -120], l: [-200, 8, 0] }, { p: [320, 180, -320], l: [0, 20, 0] }, { p: [40, 40, -60], l: [-20, 24, 0] }];
    }

    for (const [st, b] of Object.entries(bs)) if (!b.empty) g.add(new THREE.Mesh(b.build(), this.styles[st]));
    if (!solid.empty) g.add(new THREE.Mesh(solid.build(), this.solid));
    if (!unlit.empty) g.add(new THREE.Mesh(unlit.build(), this.unlit));
    if (lights.length) g.add(this.glowPoints(lights, '#ffd9a0', 14));

    // cột sáng phe đang giữ khu (nhìn thấy từ bản đồ)
    D.landmark = landmark;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(6, 16, 900, 16, 1, true), new THREE.MeshBasicMaterial({ color: NEUTRAL, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }));
    beam.position.set(landmark.x, landmark.y + 450, landmark.z); g.add(beam); D.beam = beam;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(26, 15, 8, 1), new THREE.MeshBasicMaterial({ color: NEUTRAL, side: THREE.DoubleSide, toneMapped: false }));
    flag.position.set(landmark.x + 14, landmark.y + 24, landmark.z); g.add(flag); D.flag = flag;
    const pole = new THREE.Mesh(this.geo.cyl, new THREE.MeshLambertMaterial({ color: 0xdddddd })); pole.scale.set(0.8, 34, 0.8); pole.position.set(landmark.x, landmark.y + 15, landmark.z); g.add(pole);
    D.ring = glowSprite(NEUTRAL, 120, 0.0); D.ring.position.copy(landmark).add(new THREE.Vector3(0, 30, 0)); g.add(D.ring);
    D.label = new THREE.Vector3(cx, Math.max(landmark.y, 60) + 60, cz);
    return D;
  }

  makeBoard(g, x, y, z, ry) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(90, 45), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.y = ry; g.add(m);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(94, 49, 2), new THREE.MeshLambertMaterial({ color: 0x222222 })); frame.position.copy(m.position); frame.rotation.y = ry; frame.translateZ(-1.2); g.add(frame);
    const board = { c, tex, set: (title, line, color = '#ffd23f') => {
      const x2 = c.getContext('2d'); const gr = x2.createLinearGradient(0, 0, 512, 256); gr.addColorStop(0, '#12002a'); gr.addColorStop(1, '#2a0040');
      x2.fillStyle = gr; x2.fillRect(0, 0, 512, 256);
      x2.textAlign = 'center'; x2.fillStyle = color; x2.shadowColor = color; x2.shadowBlur = 18;
      x2.font = '900 46px "Be Vietnam Pro", Arial'; x2.fillText(title, 256, 96);
      x2.fillStyle = '#ffffff'; x2.font = '800 40px "Be Vietnam Pro", Arial'; x2.fillText(String(line).slice(0, 18), 256, 176);
      tex.needsUpdate = true;
    } };
    board.set('SÀI GÒN', 'TRUY KÍCH', '#ff2e88');
    return board;
  }

  setOwner(i, team) {
    const D = this.districts[i]; D.owner = team;
    const col = team < 0 ? NEUTRAL : TEAMS[team].glow;
    D.beam.material.color.set(col); D.beam.material.opacity = team < 0 ? 0.14 : 0.38;
    D.flag.material.color.set(col); D.ring.material.color.set(col); D.ring.material.opacity = team < 0 ? 0 : 0.9;
  }

  update(dt, t) {
    for (const D of this.districts) {
      D.beam.rotation.y += dt * 0.4;
      const fp = D.flag.geometry.attributes.position;
      for (let i = 0; i < fp.count; i++) { const x = fp.getX(i); fp.setZ(i, Math.sin(x * 0.35 + t * 5) * (x + 13) * 0.08); }
      fp.needsUpdate = true;
      if (D.boats) for (const b of D.boats) {
        if (b.loop) { b.s += b.sp * dt; const p = b.loop.at(b.s, 0); b.m.position.set(p.x, 0.5 + Math.sin(t * 2 + b.s) * 0.2, p.z); b.m.rotation.y = p.yaw; }
        else { b.m.position.y = 0.6 + Math.sin(t * 1.5 + b.ph) * 0.5; b.m.rotation.z = Math.sin(t * 1.2 + b.ph) * 0.06; b.m.translateZ(b.sp * dt * 6); }
      }
      if (D.foam) { D.foam.material.opacity = 0.3 + Math.sin(t * 1.3) * 0.2; D.foam.position.x = D.center.x + 290 + Math.sin(t * 1.3) * 5; }
      if (D.lowClouds) for (const s of D.lowClouds) { s.position.x += dt * 4; if (s.position.x > D.center.x + 520) s.position.x = D.center.x - 520; }
    }
    if (this._fallTex) this._fallTex.offset.y = (t * 0.8) % 1;
    this.clouds.position.x = Math.sin(t * 0.01) * 120;
  }
}

function verticalTexture(text, color) {
  const chars = [...text.replace(/\s+/g, '')], fs = 54, w = 90, h = chars.length * fs * 1.05 + 30;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = 'rgba(120,10,10,0.92)'; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#ffcf3a'; x.lineWidth = 4; x.strokeRect(5, 5, w - 10, h - 10);
  x.font = `900 ${fs}px "Be Vietnam Pro", Arial`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = color; x.shadowBlur = 14; x.fillStyle = '#fff6d0';
  chars.forEach((ch, i) => x.fillText(ch, w / 2, 15 + fs * 0.55 + i * fs * 1.05));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData = { aspect: w / h }; return t;
}
function waterfallTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = 'rgba(180,225,255,0.85)'; x.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 120; i++) { x.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.6})`; x.fillRect(Math.random() * 64, Math.random() * 256, 2, 10 + Math.random() * 30); }
  const t = new THREE.CanvasTexture(c); t.wrapT = THREE.RepeatWrapping; return t;
}
// ghe / thuyền
export function boatMesh(world, color, fruit = false, r = null) {
  const g = new THREE.Group(), G = world.geo;
  const hull = new THREE.Mesh(G.box, new THREE.MeshLambertMaterial({ color })); hull.scale.set(5, 2, 16); hull.position.y = 0.6; g.add(hull);
  const bow = new THREE.Mesh(G.cone4, hull.material); bow.scale.set(5, 4, 2); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(0, 0.6, 10); g.add(bow);
  if (fruit && r) {
    const fc = [0xff8a1a, 0xffd21a, 0x5ac83a, 0xd82a2a, 0x8a3ad8];
    for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(G.sph, new THREE.MeshLambertMaterial({ color: r.pick(fc) })); f.scale.setScalar(r.range(1.4, 2.4)); f.position.set(r.range(-1.5, 1.5), 2.2, r.range(-5, 5)); g.add(f); }
    const p = new THREE.Mesh(G.cyl, new THREE.MeshLambertMaterial({ color: 0x2a4a8a })); p.scale.set(1.2, 3, 1.2); p.position.set(0, 3, -6); g.add(p);
    const hat = new THREE.Mesh(G.cone, new THREE.MeshLambertMaterial({ color: 0xf0e0a0 })); hat.scale.set(3, 1.4, 3); hat.position.set(0, 5.6, -6); g.add(hat);
  } else {
    const cab = new THREE.Mesh(G.box, new THREE.MeshLambertMaterial({ color: 0xffffff })); cab.scale.set(4, 2.2, 5); cab.position.set(0, 2.6, -2); g.add(cab);
  }
  return g;
}
