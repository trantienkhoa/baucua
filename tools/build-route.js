// =====================================================================================
// Dựng dữ liệu cảnh thật cho tuyến Đà Lạt – Trại Mát từ OpenStreetMap + độ cao địa hình (Terrain Tiles)
// Chạy: node tools/build-route.js <thư mục chứa osm_*.json + dem.json>   → ghi public/route.json
// Hệ toạ độ cảnh: x = quãng đường dọc đường ray tính từ ga Đà Lạt (m), z = khoảng cách ngang tới đường ray (m),
// phía có nhà ga Đà Lạt là z dương. Mỗi ngôi nhà giữ đúng hình dáng mặt bằng, đúng hướng so với đường ray.
// Dữ liệu bản đồ © OpenStreetMap contributors (ODbL) · độ cao: Terrain Tiles (AWS Open Data / Mapzen)
// =====================================================================================
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const out = path.join(__dirname, '..', 'public', 'route.json');
const load = f => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).elements || []; } catch { return []; } };
const all = [];
for (const f of fs.readdirSync(dir)) if (/^osm_.*\.json$/.test(f)) all.push(...load(f));
const byId = new Map(); for (const e of all) byId.set(e.type + e.id, e);
const els = [...byId.values()];

// ---- đường ray
const way = els.find(e => e.type === 'way' && e.id === 99661030).geometry;
const lat0 = way[0].lat, lon0 = way[0].lon, KY = 111320, KX = 111320 * Math.cos(lat0 * Math.PI / 180);
const toXY = (lat, lon) => [(lon - lon0) * KX, (lat - lat0) * KY];
let raw = way.map(p => toXY(p.lat, p.lon));
// lấy mẫu lại mỗi 5 m + làm mượt nhẹ
const cumOf = pts => { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return c; };
let cum = cumOf(raw);
const L = cum.at(-1), STEP = 5, track = [];
for (let s = 0; s <= L; s += STEP) { let i = cum.findIndex(c => c >= s); if (i <= 0) i = 1; const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1); track.push([raw[i - 1][0] + (raw[i][0] - raw[i - 1][0]) * t, raw[i - 1][1] + (raw[i][1] - raw[i - 1][1]) * t]); }
for (let k = 0; k < 3; k++) for (let i = 1; i < track.length - 1; i++) track[i] = [(track[i - 1][0] + 2 * track[i][0] + track[i + 1][0]) / 4, (track[i - 1][1] + 2 * track[i][1] + track[i + 1][1]) / 4];
cum = cumOf(track); const LEN = cum.at(-1);
const tangent = i => { const a = track[Math.max(0, i - 2)], b = track[Math.min(track.length - 1, i + 2)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
// điểm thế giới → (s, d): s dọc đường ray, d ngang (bên trái chiều đi là dương)
function project(x, y) {
  let best = 1e18, bi = 0, bt = 0;
  for (let i = 0; i < track.length - 1; i++) { const a = track[i], b = track[i + 1], vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy; let t = ((x - a[0]) * vx + (y - a[1]) * vy) / l2; t = Math.max(0, Math.min(1, t)); const px = a[0] + vx * t, py = a[1] + vy * t, d2 = (x - px) ** 2 + (y - py) ** 2; if (d2 < best) { best = d2; bi = i; bt = t; } }
  const a = track[bi], b = track[bi + 1], vx = b[0] - a[0], vy = b[1] - a[1], l = Math.hypot(vx, vy);
  let s = cum[bi] + bt * l, d = ((x - a[0]) * (-vy) + (y - a[1]) * vx) / l;
  // trước ga Đà Lạt / sau ga Trại Mát: kéo dài thẳng theo hướng đầu mút
  if (bi === 0 && bt === 0) { const tx = vx / l, ty = vy / l; s = (x - a[0]) * tx + (y - a[1]) * ty; d = (x - a[0]) * (-ty) + (y - a[1]) * tx; }
  if (bi === track.length - 2 && bt === 1) { const tx = vx / l, ty = vy / l; s = cum.at(-1) + (x - b[0]) * tx + (y - b[1]) * ty; d = (x - b[0]) * (-ty) + (y - b[1]) * tx; }
  return { s, d, ang: Math.atan2(vy, vx) };
}
function worldAt(s, d) { // (s, d) → điểm thế giới
  const i = Math.max(0, Math.min(track.length - 2, Math.floor(s / STEP))); const t0 = tangent(i);
  const base = s < 0 ? [track[0][0] + t0[0] * s, track[0][1] + t0[1] * s] : s > LEN ? [track.at(-1)[0] + t0[0] * (s - LEN), track.at(-1)[1] + t0[1] * (s - LEN)] : (() => { const a = track[i], b = track[i + 1], u = (s - cum[i]) / (cum[i + 1] - cum[i] || 1); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; })();
  return [base[0] - t0[1] * d, base[1] + t0[0] * d];
}
// phía có ga Đà Lạt là z dương trong cảnh
const station = els.find(e => e.tags && e.tags.name === 'Ga Đà Lạt');
const stP = station ? (station.lat ? toXY(station.lat, station.lon) : toXY(station.geometry[0].lat, station.geometry[0].lon)) : [0, 30];
const SIGN = Math.sign(project(stP[0], stP[1]).d) || 1;
const sz = (s, d) => [Math.round(s * 10) / 10, Math.round(d * SIGN * 10) / 10];

// ---- độ cao địa hình
const dem = JSON.parse(fs.readFileSync(path.join(dir, 'dem.json'), 'utf8'));
const Z = dem.z, N = 2 ** Z;
function elevLL(lat, lon) {
  const fx = (lon + 180) / 360 * N, r = lat * Math.PI / 180, fy = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * N;
  const px = fx * 256, py = fy * 256;
  const get = (X, Y) => { const tx = Math.floor(X / 256), ty = Math.floor(Y / 256), t = dem.tiles[tx + '/' + ty]; if (!t) return NaN; const v = t[(Y - ty * 256) * 256 + (X - tx * 256)]; return v < 800 ? NaN : v; };
  const x = Math.floor(px), y = Math.floor(py), u = px - x, v = py - y;
  const a = get(x, y), b = get(x + 1, y), c = get(x, y + 1), d = get(x + 1, y + 1);
  const vals = [a, b, c, d].filter(Number.isFinite); if (!vals.length) return NaN;
  if (vals.length < 4) return vals.reduce((p, q) => p + q, 0) / vals.length;
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
const elevXY = (x, y) => elevLL(lat0 + y / KY, lon0 + x / KX);
// cao độ nền đường ray (làm mượt 150 m)
const railE = track.map(([x, y]) => elevXY(x, y));
const railS = railE.map((_, i) => { let s = 0, n = 0; for (let k = -15; k <= 15; k++) { const v = railE[i + k]; if (Number.isFinite(v)) { s += v; n++; } } return s / n; });
const railAt = s => railS[Math.max(0, Math.min(railS.length - 1, Math.round(s / STEP)))];

// ---- lưới địa hình (cao độ tương đối so với nền ray) + loại đất
const G = { s0: -320, s1: Math.ceil(LEN) + 320, z0: -460, z1: 460, step: 10 };
const ns = Math.round((G.s1 - G.s0) / G.step) + 1, nz = Math.round((G.z1 - G.z0) / G.step) + 1;
const H = new Array(ns * nz), LU = new Array(ns * nz).fill(0);
for (let j = 0; j < nz; j++) for (let i = 0; i < ns; i++) {
  const s = G.s0 + i * G.step, z = G.z0 + j * G.step, [x, y] = worldAt(s, z * SIGN);
  const e = elevXY(x, y); H[j * ns + i] = Number.isFinite(e) ? Math.round((e - railAt(s)) * 10) / 10 : null;
}
for (let k = 0; k < 3; k++) for (let j = 0; j < nz; j++) for (let i = 0; i < ns; i++) if (H[j * ns + i] === null) { const nb = [H[j * ns + i - 1], H[j * ns + i + 1], H[(j - 1) * ns + i], H[(j + 1) * ns + i]].filter(v => v != null); H[j * ns + i] = nb.length ? nb.reduce((a, b) => a + b, 0) / nb.length : 0; }
for (let i = 0; i < H.length; i++) if (H[i] === null) H[i] = 0;
// loại đất: 1 rừng, 2 ruộng/vườn, 3 nhà kính, 4 khu dân cư, 5 cỏ/công viên, 6 nước, 7 tôn giáo
const LUCODE = t => {
  if (!t) return 0;
  if (t.natural === 'water' || t.landuse === 'reservoir' || t.landuse === 'basin' || t.water) return 6;
  if (t.landuse === 'greenhouse_horticulture' || t.building === 'greenhouse') return 3;
  if (t.natural === 'wood' || t.landuse === 'forest') return 1;
  if (/farmland|orchard|plant_nursery|vineyard|farmyard|allotments/.test(t.landuse || '')) return 2;
  if (/residential|commercial|retail|construction/.test(t.landuse || '')) return 4;
  if (/grass|meadow|recreation_ground|village_green|cemetery/.test(t.landuse || '') || /park|garden|golf_course|pitch/.test(t.leisure || '') || /scrub|grassland/.test(t.natural || '')) return 5;
  if (t.landuse === 'religious' || t.amenity === 'place_of_worship') return 7;
  return 0;
};
const polys = [];
for (const e of els) {
  if (e.type !== 'way' || !e.geometry || e.geometry.length < 4 || !e.tags || e.tags.building && e.tags.building !== 'greenhouse') continue;
  const code = LUCODE(e.tags); if (!code) continue;
  const pts = e.geometry.map(p => { const [x, y] = toXY(p.lat, p.lon); const q = project(x, y); return sz(q.s, q.d); });
  const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  if (Math.max(...xs) < G.s0 || Math.min(...xs) > G.s1 || Math.max(...zs) < G.z0 || Math.min(...zs) > G.z1) continue;
  polys.push({ code, pts, bb: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)], name: e.tags.name || '' });
}
const inPoly = (x, z, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
polys.sort((a, b) => (b.bb[2] - b.bb[0]) * (b.bb[3] - b.bb[1]) - (a.bb[2] - a.bb[0]) * (a.bb[3] - a.bb[1])); // vùng lớn trước, vùng nhỏ ghi đè
for (const p of polys) for (let j = 0; j < nz; j++) { const z = G.z0 + j * G.step; if (z < p.bb[1] || z > p.bb[3]) continue; for (let i = 0; i < ns; i++) { const s = G.s0 + i * G.step; if (s < p.bb[0] || s > p.bb[2]) continue; if (inPoly(s, z, p.pts)) LU[j * ns + i] = p.code; } }

// ---- nhà cửa (giữ đúng mặt bằng)
const buildings = [];
const area = pts => { let a = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]); return Math.abs(a / 2); };
let hseed = 1; const rnd = () => (hseed = (hseed * 16807) % 2147483647) / 2147483647;
for (const e of els) {
  if (e.type !== 'way' || !e.tags || !e.tags.building || !e.geometry || e.geometry.length < 4) continue;
  const g = e.geometry.slice(0, -1).map(p => toXY(p.lat, p.lon));
  const cx = g.reduce((a, p) => a + p[0], 0) / g.length, cy = g.reduce((a, p) => a + p[1], 0) / g.length;
  const q = project(cx, cy); const [s, z] = sz(q.s, q.d);
  if (s < -300 || s > LEN + 300 || Math.abs(z) > 430) continue;
  if (Math.abs(z) < 7) continue; // sát đường ray thì bỏ (thường là nhà ga / kho đã dựng riêng)
  if ((s > -160 && s < 70 || s > LEN - 160 && s < LEN + 70) && z > -12 && z < 60) continue; // khu nhà ga dựng riêng
  // đổi hình dáng về hệ toạ độ của đường ray (giữ đúng kích thước)
  const ca = Math.cos(-q.ang), sa = Math.sin(-q.ang);
  const pts = g.map(([x, y]) => { const dx = x - cx, dy = y - cy; const lx = dx * ca - dy * sa, ly = dx * sa + dy * ca; return [Math.round(lx * 10) / 10, Math.round(ly * SIGN * 10) / 10]; });
  const A = area(pts); if (A < 12) continue;
  const t = e.tags, lv = Number(t['building:levels']);
  let levels = Number.isFinite(lv) && lv > 0 ? lv : t.building === 'apartments' || t.building === 'hotel' ? 4 + Math.floor(rnd() * 3) : t.building === 'greenhouse' ? 1 : /school|college|university|hospital/.test(t.building) ? 2 + Math.floor(rnd() * 2) : A < 60 ? 1 + Math.floor(rnd() * 2) : A < 200 ? 2 + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 3);
  const kind = t.building === 'greenhouse' ? 'greenhouse' : /temple|church|pagoda/.test(t.building) || t.amenity === 'place_of_worship' ? 'temple' : /school|college|university|hospital|office|dormitory/.test(t.building) ? 'civic' : t.building === 'hotel' || t.tourism === 'hotel' ? 'hotel' : 'house';
  buildings.push({ s, z, pts, lv: Math.min(levels, 12), kind, name: t.name || '' });
}
// ---- quán xá, cửa hàng (tên thật) → gắn vào ngôi nhà gần nhất
const POI_OK = /cafe|restaurant|fast_food|bar|hotel|guest_house|hostel|motel|chalet|convenience|supermarket|bakery|florist|greengrocer|marketplace|place_of_worship|pharmacy|bank|fuel|clothes|gift|kiosk|ice_cream|beverages|pastry|hairdresser|laundry|mobile_phone|motorcycle_repair|apartment/;
const pois = [];
for (const e of els) {
  if (e.type !== 'node' || !e.tags) continue;
  const kind = e.tags.amenity || e.tags.shop || e.tags.tourism || ''; if (!POI_OK.test(kind)) continue;
  const [x, y] = toXY(e.lat, e.lon), q = project(x, y), [s, z] = sz(q.s, q.d);
  if (s < -250 || s > LEN + 250 || Math.abs(z) > 300) continue;
  let bi = -1, bd = 30; buildings.forEach((b, i) => { const dd = Math.hypot(b.s - s, b.z - z); if (dd < bd) { bd = dd; bi = i; } });
  pois.push({ s, z, kind, name: (e.tags.name || '').slice(0, 28), b: bi });
  if (bi >= 0 && !buildings[bi].shop) buildings[bi].shop = { kind, name: (e.tags.name || '').slice(0, 28) };
}
// ---- đường phố
const roads = [];
const RW = { trunk: 9, primary: 8, secondary: 7, tertiary: 6, residential: 4.5, unclassified: 4.5, service: 3.5, track: 3 };
for (const e of els) {
  if (e.type !== 'way' || !e.tags || !e.tags.highway || !RW[e.tags.highway] || !e.geometry) continue;
  const pts = e.geometry.map(p => { const [x, y] = toXY(p.lat, p.lon); const q = project(x, y); return sz(q.s, q.d); }).filter(([s, z]) => s > G.s0 && s < G.s1 && Math.abs(z) < 440);
  if (pts.length < 2) continue;
  // bỏ các đoạn bị "gập" khi trải thẳng tuyến (nhảy quá xa giữa 2 điểm liên tiếp)
  let seg = [pts[0]]; for (let i = 1; i < pts.length; i++) { if (Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) > 120) { if (seg.length > 1) roads.push({ w: RW[e.tags.highway], pts: seg, name: e.tags.name || '' }); seg = []; } seg.push(pts[i]); }
  if (seg.length > 1) roads.push({ w: RW[e.tags.highway], pts: seg, name: e.tags.name || '' });
}
// ---- nước (hồ, ao) dạng đa giác
const water = polys.filter(p => p.code === 6).map(p => ({ pts: p.pts, name: p.name }));
const greenhouseAreas = polys.filter(p => p.code === 3).map(p => ({ pts: p.pts }));
const temples = polys.filter(p => p.code === 7).map(p => ({ pts: p.pts, name: p.name }));

const res = { attribution: 'Dữ liệu bản đồ © OpenStreetMap contributors (ODbL) · Độ cao: Terrain Tiles (AWS Open Data)', length: Math.round(LEN), grid: { ...G, ns, nz }, H, LU, buildings, pois, roads, water, greenhouseAreas, temples, railElev: [Math.round(railS[0]), Math.round(railS.at(-1))] };
fs.writeFileSync(out, JSON.stringify(res));
const cnt = {}; for (const b of buildings) cnt[b.kind] = (cnt[b.kind] || 0) + 1;
const luc = {}; for (const v of LU) luc[v] = (luc[v] || 0) + 1;
console.log('route.json', (fs.statSync(out).size / 1e6).toFixed(2) + 'MB', '· tuyến', Math.round(LEN), 'm · ga Đà Lạt', Math.round(railS[0]), 'm → Trại Mát', Math.round(railS.at(-1)), 'm');
console.log('nhà', buildings.length, JSON.stringify(cnt), '· quán/cửa hàng', pois.length, '· gắn biển', buildings.filter(b => b.shop).length, '· đường', roads.length, '· hồ', water.length, '· vùng nhà kính', greenhouseAreas.length);
console.log('loại đất (ô lưới)', JSON.stringify(luc));
