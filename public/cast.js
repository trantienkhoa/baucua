// Dàn nhân vật mới: mỗi người được DỰNG BẰNG CODE từ mô tả trong roster.csv
// (giới tính, tuổi, trang phục, tính cách) — thân liền mạch có da-xương, mặt vẽ nét,
// tóc nhiều kiểu, quần áo có lớp (áo trong / áo khoác / váy / tà áo dài), giày theo loại.
// Khung xương trùng với khung điều khiển điệu nhảy của game nên nhảy khớp từng khớp.
import * as THREE from 'three';

const PI = Math.PI, TAU = PI * 2;
const TW = 1024, TH = 512;
const REG = {
  face: [0, 0, 512, 512], torso: [512, 0, 256, 256], coat: [768, 0, 256, 256],
  legs: [512, 256, 128, 256], arms: [640, 256, 96, 256], skirt: [736, 256, 288, 128], hair: [736, 384, 64, 128],
};
const SWN = ['skin', 'skin2', 'lip', 'white', 'black', 'gold', 'metal', 'shoe', 'sole', 'sock', 'hat', 'hat2', 'top', 'layer', 'bottom', 'skirtc', 'lens', 'acc', 'hairc', 'hairD', 'tie'];
const swPx = n => { const i = SWN.indexOf(n); return [800 + (i % 7) * 32 + 16, 384 + Math.floor(i / 7) * 32 + 16]; };
const LID = [800, 480, 64, 32], MOUTH = [864, 480, 64, 32];
// tỉ lệ cơ thể người thật. Game dựng khung điều khiển theo đúng bộ số này.
export const RIGP = { hipY: 0.88, spine: 0.04, chest: 0.47, neck: 0.04, head: 0.1, shY: -0.03, armU: 0.27, armF: 0.245, hipX: 0.095, hipJ: -0.04, legU: 0.39, legF: 0.38, swM: 0.215, swF: 0.185, headY: 0.105, headR: 0.125 };
const pw = (pts, y) => { if (y <= pts[0][0]) return pts[0][1] + (y - pts[0][0]) * (pts[1][1] - pts[0][1]) / (pts[1][0] - pts[0][0]); for (let i = 0; i < pts.length - 1; i++) if (y <= pts[i + 1][0]) return pts[i][1] + (y - pts[i][0]) * (pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]); const n = pts.length - 1; return pts[n][1] + (y - pts[n][0]) * (pts[n][1] - pts[n - 1][1]) / (pts[n][0] - pts[n - 1][0]); };
const GY = [[0, 0], [0.07, 0.07], [0.45, 0.36], [0.84, 0.66], [0.88, 0.7], [0.92, 0.74], [1.39, 1.14], [1.43, 1.175], [1.56, 1.27]];   // thân + chân: độ cao thiết kế → độ cao hoạt hình
const AYM = [[0.73, 0.575], [0.845, 0.69], [1.09, 0.89], [1.36, 1.11], [1.4, 1.145]];                                          // tay

// ---------- tiện ích ----------
function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
function shade(hex, k) {   // k < 1 tối đi, > 1 sáng lên
  const c = new THREE.Color(hex); const h = {}; c.getHSL(h, THREE.SRGBColorSpace);
  h.l = Math.max(0, Math.min(1, k > 1 ? h.l + (1 - h.l) * (k - 1) : h.l * k));
  return '#' + new THREE.Color().setHSL(h.h, h.s, h.l, THREE.SRGBColorSpace).getHexString(THREE.SRGBColorSpace);
}
const lum = hex => { const c = new THREE.Color(hex); const h = {}; c.getHSL(h, THREE.SRGBColorSpace); return h.l; };
const rgba = (hex, a) => { const c = new THREE.Color(hex); const r = x => Math.round(Math.pow(x, 1 / 2.2) * 255); const s = new THREE.Color(hex).convertLinearToSRGB(); return `rgba(${Math.round(s.r * 255)},${Math.round(s.g * 255)},${Math.round(s.b * 255)},${a})`; };

// ---------- đọc mô tả trang phục ----------
const COLORS = [
  ['xanh navy', '#1f2a4a'], ['xanh dam', '#1e3a8a'], ['xanh reu', '#55632f'], ['xanh la', '#2e8b3a'], ['xanh duong', '#2f6fd6'], ['xanh ngoc', '#16a3a3'],
  ['hong pastel', '#f7b3cd'], ['tim', '#7c3dff'], ['hong', '#ff6fa3'], ['do', '#c8102e'], ['cam', '#ff8a3d'], ['vang', '#ffcf33'], ['neon', '#c8ff3d'],
  ['trang', '#f4f2ed'], ['den', '#17171c'], ['xam', '#8a8d94'], ['nau sam', '#4a2e1a'], ['nau', '#7a4b2a'], ['nude', '#e8c4a8'], ['be', '#d9c4a0'],
  ['bac', '#c0c4cc'], ['kem', '#efe6d2'], ['xanh', '#2f6fd6'],
];
function colorOf(t) { const w = ' ' + t.replace(/bup be/g, '') + ' '; for (const [k, c] of COLORS) if (w.includes(' ' + k + ' ')) return c; return null; }
function patternOf(t) {
  if (/caro/.test(t)) return 'plaid';
  if (/\bsoc\b|\bke\b/.test(t)) return 'stripe';
  if (/hoa tiet/.test(t)) return 'dots';
  if (/\bhoa\b/.test(t)) return 'floral';
  if (/\bren\b/.test(t)) return 'lace';
  if (/\bgam\b/.test(t)) return 'brocade';
  if (/\blen\b/.test(t)) return 'knit';
  return null;
}
function fabricOf(t) {
  if (/kim sa|sequin/.test(t)) return 'sequin';
  if (/satin|\blua\b|da hoi/.test(t)) return 'satin';
  if (/nhung/.test(t)) return 'velvet';
  if (/jean|denim/.test(t)) return 'denim';
  if (/\bda\b|boot/.test(t)) return 'leather';
  return 'matte';
}
const TOPS = {
  tee: { sleeve: 'short', pad: 0.008, neck: 'crew' }, hoodie: { sleeve: 'long', pad: 0.022, neck: 'crew', collar: 'hood', cuff: true },
  crop: { sleeve: 'short', pad: 0.004, neck: 'crew', hemY: 1.13 }, tank: { sleeve: 'none', pad: 0.003, neck: 'tank' },
  cami: { sleeve: 'none', pad: 0.002, neck: 'cami' }, turtle: { sleeve: 'long', pad: 0.011, neck: 'high', collar: 'turtle' },
  polo: { sleeve: 'short', pad: 0.008, neck: 'placket', collar: 'shirt' }, shirt: { sleeve: 'long', pad: 0.008, neck: 'buttons', collar: 'shirt', cuff: true },
  shirtShort: { sleeve: 'short', pad: 0.009, neck: 'buttons', collar: 'shirt' }, blouse: { sleeve: 'long', pad: 0.012, neck: 'v', cuff: true },
  sweater: { sleeve: 'long', pad: 0.014, neck: 'crew', cuff: true }, aodai: { sleeve: 'long', pad: 0.004, neck: 'high', collar: 'mandarin' },
  baba: { sleeve: 'long', pad: 0.016, neck: 'buttons', hemY: 0.8 }, dress: { sleeve: 'none', pad: 0.004, neck: 'scoop' },
};
function mkTop(kind, o) { return Object.assign({ kind, color: '#f4f2ed', pat: null, fab: 'matte' }, TOPS[kind], o); }

export function parseOutfit(ch, R) {
  const pick = a => a[Math.floor(R() * a.length)];
  const female = !!ch.female, age = Number(ch.age) || 25, rawAll = String(ch.outfit || '');
  const D = { female, age, top: null, layer: null, bottom: null, skirt: null, dress: false, aodai: false, shoes: null, hat: null, tie: null, belt: false, socksHigh: false, bib: false };
  let topWeak = false;
  for (const rawIt of rawAll.split(',')) {
    const it = norm(rawIt); if (!it) continue;
    const c = colorOf(it), pat = patternOf(it), fab = fabricOf(it);
    if (/ao dai/.test(it)) {
      const col = c || pick(['#2f6fd6', '#c8102e', '#f4f2ed', '#ffcf33']);
      D.top = mkTop('aodai', { color: col, pat: /gam/.test(it) ? 'brocade' : pat, fab: /nhung/.test(it) ? 'velvet' : 'satin' }); D.aodai = true; continue;
    }
    if (/ba ba/.test(it)) { D.top = mkTop('baba', { color: c || pick(['#6b3f2a', '#3b2a4a', '#efe6d2', '#7a1f2b']), pat: /gam/.test(it) ? 'brocade' : null, fab: 'satin' }); continue; }
    if (/khan dong/.test(it)) { D.hat = 'khandong'; continue; }
    if (/ca vat/.test(it)) { D.tie = c || pick(['#7a0019', '#1e3a8a', '#b8860b', '#3a3d44']); continue; }
    if (/that lung/.test(it)) { D.belt = true; continue; }
    if (/vong co/.test(it)) { D.choker = true; continue; }
    if (/^tat/.test(it)) { if (/dui/.test(it)) D.socksThigh = c || '#17171c'; else D.socksHigh = true; continue; }
    if (/^(dam|vay yem)/.test(it)) {
      if (/vay yem/.test(it)) { D.skirt = { kind: 'skater', color: c || '#3b5ba5', pat: null, fab: 'denim' }; D.bib = true; continue; }
      const col = c || (pat === 'floral' ? pick(['#fdf3e7', '#ffd6e5', '#fff3c4', '#cfe8ff']) : pick(['#c8102e', '#17171c', '#1e3a8a', '#ff6fa3', '#16a3a3']));
      const f = fab === 'matte' && /thanh lich|co dien/.test(it) ? 'satin' : fab;
      const kind = /da hoi/.test(it) ? pick(['ball', 'mermaid', 'aline']) : /\bdai\b|co dien/.test(it) ? 'aline' : /midi|thanh lich/.test(it) ? 'midi' : /ngan/.test(it) ? 'skater' : /satin|lua|ren/.test(it) ? 'slip' : 'midi';
      D.skirt = { kind, color: col, pat, fab: f };
      if (!D.top || topWeak) D.top = mkTop('dress', { color: col, pat, fab: f, neck: /yem/.test(it) ? 'halter' : /da hoi/.test(it) ? 'strapless' : /hoa|ren/.test(it) ? 'vcap' : pick(['scoop', 'v', 'cami']) });
      D.dress = true; continue;
    }
    if (/^(chan vay|vay)/.test(it)) {
      const kind = /xep ly|tennis/.test(it) ? 'pleated' : /but chi/.test(it) ? 'pencil' : /\bdai\b/.test(it) ? 'aline' : /ngan|jean|denim/.test(it) ? 'mini' : 'midi';
      D.skirt = { kind, color: c || (/jean|denim/.test(it) ? '#3b5ba5' : /tennis/.test(it) ? '#f4f2ed' : pick(['#17171c', '#3a3d44', '#7a1f2b', '#1f2a4a'])), pat, fab: /jean|denim/.test(it) ? 'denim' : fab };
      continue;
    }
    if (/^(quan|legging)/.test(it)) {
      let kind = 'tay', col = '#2a2c33', f = 'matte', o = {};
      if (/jean/.test(it)) { kind = /ong rong/.test(it) ? 'wide' : 'jeans'; col = pick(['#3b5ba5', '#2c4a86', '#5a7bbf', '#27406f']); f = 'denim'; o.ripped = /rach/.test(it); o.high = /cap cao/.test(it); }
      else if (/jogger/.test(it)) { kind = 'jogger'; col = '#3a3d44'; }
      else if (/cargo/.test(it)) { kind = 'cargo'; col = '#55632f'; }
      else if (/legging/.test(it)) { kind = 'legging'; col = '#17171c'; }
      else if (/short/.test(it)) { kind = 'shorts'; col = /denim/.test(it) ? '#3b5ba5' : /the thao/.test(it) ? pick(['#17171c', '#1f2a4a', '#c8102e']) : '#cdb58f'; f = /denim/.test(it) ? 'denim' : 'matte'; o.sport = /the thao/.test(it); }
      else if (/\blua\b/.test(it)) { kind = 'wide'; col = '#f4f2ed'; f = 'satin'; }
      else if (/culottes/.test(it)) { kind = 'wide'; col = pick(['#17171c', '#d9c4a0', '#3a3d44']); o.crop = true; }
      else if (/ong rong/.test(it)) { kind = 'wide'; col = pick(['#17171c', '#d9c4a0', '#efe6d2']); }
      else if (/kaki|chinos/.test(it)) { kind = 'tay'; col = pick(['#cdb58f', '#b9a27a', '#8a7a55']); }
      if (/kim sa/.test(it)) f = 'sequin';
      D.bottom = Object.assign({ kind, color: c || col, fab: f }, o); continue;
    }
    if (/^giay/.test(it)) {
      const kind = /sneaker|the thao|nhay/.test(it) && !/sandal/.test(it) ? 'sneaker' : /cao got|mui nhon/.test(it) ? 'heels' : /boot/.test(it) ? 'boots' : /bup be/.test(it) ? 'flats' : /sandal/.test(it) ? 'sandal' : 'leather';
      D.shoes = { kind, color: c || (kind === 'sneaker' ? pick(['#f4f2ed', '#f4f2ed', '#17171c', '#e9e2d0']) : kind === 'heels' ? pick(['#17171c', '#c8102e', '#e8c4a8', '#f4f2ed']) : kind === 'boots' ? pick(['#17171c', '#4a2e1a']) : kind === 'flats' ? pick(['#17171c', '#7a1f2b', '#e8c4a8']) : pick(['#17171c', '#4a2e1a', '#2a1a10'])) };
      continue;
    }
    if (/blazer|vest|suit|comple|gile|khoac|bomber|jacket/.test(it)) {
      const wool = /khoác dạ/i.test(rawIt);
      if (/gile|vest len/.test(it)) { D.layer = { kind: 'gile', color: c || pick(['#3a3d44', '#4a2e1a', '#1f2a4a', '#55632f']), pat: /len/.test(it) ? 'knit' : null, fab: 'matte', sleeves: false, hemY: 0.93 }; continue; }
      const kind = /bomber/.test(it) ? 'bomber' : /denim|jean/.test(it) ? 'denim' : /the thao/.test(it) ? 'sport' : wool ? 'coat' : /suit|comple|vest/.test(it) && !/vest nu/.test(it) ? 'suit' : 'blazer';
      const col = c || (kind === 'bomber' ? '#1f2a4a' : kind === 'denim' ? '#3b5ba5' : kind === 'sport' ? pick(['#d6262f', '#1e3a8a', '#17171c', '#2e8b3a']) : kind === 'coat' ? pick(['#6b5a45', '#3a3d44', '#1f2a4a']) : pick(['#2a2c33', '#3a3d44', '#1f2a4a']));
      D.layer = { kind, color: col, pat: pat === 'knit' ? null : pat, fab: /kim sa/.test(it) ? 'sequin' : kind === 'denim' ? 'denim' : kind === 'bomber' || kind === 'sport' ? 'satin' : 'matte', sleeves: true, hemY: kind === 'coat' ? 0.56 : kind === 'bomber' || kind === 'sport' || kind === 'denim' ? 0.9 : 0.8, three: /ba manh/.test(it) };
      continue;
    }
    let kind = null;
    if (/hoodie/.test(it)) kind = 'hoodie';
    else if (/crop/.test(it)) kind = 'crop';
    else if (/tank|ba lo/.test(it)) kind = 'tank';
    else if (/hai day/.test(it)) kind = 'cami';
    else if (/co lo/.test(it)) kind = 'turtle';
    else if (/polo/.test(it)) kind = 'polo';
    else if (/so mi/.test(it)) kind = /ngan tay/.test(it) ? 'shirtShort' : 'shirt';
    else if (/blouse/.test(it)) kind = 'blouse';
    else if (/ao len/.test(it)) kind = 'sweater';
    else if (/ao thun|ao phong/.test(it)) kind = 'tee';
    if (kind) {
      const weak = kind === 'tee';
      if (D.top && !topWeak && weak) continue;   // áo thun mặc trong: giữ áo chính
      const def = kind === 'shirt' || kind === 'blouse' ? pick(['#f4f2ed', '#f4f2ed', '#dbe7f5', '#f6e3e8']) : kind === 'hoodie' ? pick(['#17171c', '#8a8d94', '#efe6d2']) : kind === 'polo' ? pick(['#1f2a4a', '#2e8b3a', '#f4f2ed', '#c8102e']) : kind === 'turtle' ? pick(['#17171c', '#efe6d2', '#4a2e1a']) : kind === 'sweater' ? pick(['#efe6d2', '#f7b3cd', '#b9a3e8', '#9fe3c6']) : kind === 'cami' ? pick(['#17171c', '#f4f2ed', '#c8102e']) : pick(['#f4f2ed', '#17171c', '#8a8d94']);
      const keepDress = D.dress && D.top && D.top.kind === 'dress';
      const top = mkTop(kind, { color: c || def, pat: pat || (kind === 'sweater' || /len/.test(it) ? 'knit' : null), fab: kind === 'blouse' || /lua/.test(it) ? 'satin' : fab === 'denim' ? 'denim' : 'matte' });
      if (/oversize/.test(it)) top.pad += 0.012;
      if (/graphic/.test(it)) top.print = pick(['VIBES', 'NEON', 'LIT', 'SAIGON', 'HANOI', '★', 'DJ', '92']);
      if (/linen/.test(it)) top.color = c || '#e9e2d0';
      if (!keepDress) { D.top = top; topWeak = weak; }
    }
  }
  // ---- bổ sung phần còn thiếu ----
  const formal = D.layer && /suit|blazer|coat|gile/.test(D.layer.kind);
  if (!D.top) D.top = D.layer ? (female ? mkTop('cami', { color: '#f4f2ed' }) : mkTop('shirt', { color: '#f4f2ed' })) : mkTop('tee', { color: '#f4f2ed' });
  if (D.aodai && !D.bottom) D.bottom = { kind: 'wide', color: '#f4f2ed', fab: 'satin' };
  if (D.top.kind === 'baba' && !D.bottom) D.bottom = { kind: 'wide', color: '#17171c', fab: 'satin' };
  if (D.layer && D.layer.kind === 'suit' && (!D.bottom || (D.bottom.kind === 'tay' && D.bottom.color === '#2a2c33'))) D.bottom = { kind: 'tay', color: D.layer.color, fab: 'matte', pat: D.layer.pat };
  if (D.layer && D.layer.three) D.vest3 = shade(D.layer.color, 0.85);
  if (!D.bottom && !D.skirt) D.bottom = female ? { kind: 'jeans', color: '#3b5ba5', fab: 'denim' } : { kind: 'tay', color: formal ? '#2a2c33' : pick(['#2a2c33', '#3b5ba5', '#17171c']), fab: 'matte' };
  if (D.aodai && !female && !D.hat) D.hat = 'khandong';
  if (!D.shoes) D.shoes = female ? { kind: D.aodai || D.dress || age > 30 ? 'heels' : 'sneaker', color: D.aodai || D.dress || age > 30 ? pick(['#17171c', '#e8c4a8', '#c8102e']) : '#f4f2ed' } : { kind: formal || D.aodai || age > 34 ? 'leather' : 'sneaker', color: formal || D.aodai || age > 34 ? '#17171c' : '#f4f2ed' };
  // áo bỏ trong quần hay thả ngoài
  const t = D.top;
  if (t.hemY === undefined) {
    const tuck = D.skirt ? !(t.kind === 'hoodie' || t.pad > 0.018) : (D.bottom && (D.bottom.kind === 'tay' || D.bottom.high) && /shirt|polo|blouse|turtle|cami|dress|aodai/.test(t.kind)) || !!D.layer || t.kind === 'aodai' || t.kind === 'dress';
    t.tuck = tuck; t.hemY = tuck ? 0.985 : t.kind === 'hoodie' || t.pad > 0.018 ? 0.86 : 0.9;
  }
  if (D.skirt && D.top.kind === 'tee' && R() < 0.5) D.top.print = D.top.print || null;
  // mũ: thanh niên hay đội mũ
  if (!D.hat && !female && age < 27 && !formal && R() < 0.42) D.hat = pick(['cap', 'capBack', 'beanie', 'bucket', 'cap']);
  if (!D.hat && female && age < 25 && !D.dress && R() < 0.16) D.hat = pick(['beanie', 'cap', 'bucket']);
  if (!D.hat && !female && age >= 45 && formal && R() < 0.25) D.hat = 'fedora';
  D.hatColor = D.hat === 'khandong' ? D.top.color : pick(['#17171c', '#f4f2ed', '#c8102e', '#1f2a4a', '#efe6d2', D.top.color]);
  return D;
}

// ---------- vẽ vải ----------
function fabric(g, x, y, w, h, col, pat, fab, R, sc = 1) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = col; g.fillRect(x, y, w, h);
  const dark = lum(col) < 0.35, hi = shade(col, dark ? 1.35 : 1.18), lo = shade(col, 0.72);
  if (pat === 'stripe') { const s = 12 * sc; g.fillStyle = dark ? 'rgba(255,255,255,0.82)' : rgba(shade(col, 0.35), 0.85); for (let yy = y; yy < y + h; yy += s * 2) g.fillRect(x, yy, w, s * 0.8); }
  else if (pat === 'vstripe') { g.fillStyle = dark ? 'rgba(255,255,255,0.5)' : rgba(shade(col, 0.45), 0.7); for (let xx = x; xx < x + w; xx += 9 * sc) g.fillRect(xx, y, 2.2 * sc, h); }
  else if (pat === 'plaid') {
    const s = 22 * sc, c2 = dark ? 'rgba(255,255,255,0.28)' : 'rgba(20,20,40,0.3)', c3 = dark ? 'rgba(255,80,80,0.4)' : 'rgba(200,20,40,0.42)';
    for (let xx = x; xx < x + w; xx += s) { g.fillStyle = c2; g.fillRect(xx, y, s * 0.45, h); g.fillStyle = c3; g.fillRect(xx + s * 0.68, y, s * 0.1, h); }
    for (let yy = y; yy < y + h; yy += s) { g.fillStyle = c2; g.fillRect(x, yy, w, s * 0.45); g.fillStyle = c3; g.fillRect(x, yy + s * 0.68, w, s * 0.1); }
  } else if (pat === 'floral') {
    const cols = ['#ff5a8a', '#ffb347', '#ffffff', '#ff8fc8', '#7c3dff', '#ffd84d'];
    for (let i = 0, n = Math.round(w * h / 420 / sc); i < n; i++) {
      const fx = x + R() * w, fy = y + R() * h, r = (3.2 + R() * 3.4) * sc;
      g.fillStyle = 'rgba(60,140,70,0.75)'; g.beginPath(); g.ellipse(fx + r, fy + r * 0.8, r * 0.9, r * 0.4, 0.6, 0, TAU); g.fill();
      g.fillStyle = cols[Math.floor(R() * cols.length)];
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; g.beginPath(); g.arc(fx + Math.cos(a) * r * 0.7, fy + Math.sin(a) * r * 0.7, r * 0.55, 0, TAU); g.fill(); }
      g.fillStyle = '#ffe36b'; g.beginPath(); g.arc(fx, fy, r * 0.4, 0, TAU); g.fill();
    }
  } else if (pat === 'dots') {
    const cols = dark ? ['#ffffff', '#ffd84d', '#ff8fc8'] : ['#1f2a4a', '#c8102e', '#16a3a3'];
    for (let yy = y + 6, r = 0; yy < y + h; yy += 13 * sc, r++) for (let xx = x + (r % 2 ? 6 : 0); xx < x + w; xx += 13 * sc) { g.fillStyle = cols[(r + Math.floor(xx / 13)) % cols.length]; g.beginPath(); g.arc(xx, yy, 2.6 * sc, 0, TAU); g.fill(); }
  } else if (pat === 'lace') {
    g.strokeStyle = dark ? 'rgba(255,255,255,0.4)' : 'rgba(150,130,120,0.42)'; g.lineWidth = 1.3;
    for (let yy = y, r = 0; yy < y + h + 10; yy += 10 * sc, r++) for (let xx = x + (r % 2 ? 6 * sc : 0); xx < x + w + 12; xx += 12 * sc) { g.beginPath(); g.arc(xx, yy, 5.5 * sc, 0, PI); g.stroke(); g.beginPath(); g.arc(xx, yy - 3 * sc, 1.4, 0, TAU); g.stroke(); }
  } else if (pat === 'brocade') {
    const gold = dark || lum(col) < 0.6 ? 'rgba(255,214,110,0.7)' : 'rgba(190,140,30,0.6)';
    g.strokeStyle = gold; g.fillStyle = gold; g.lineWidth = 1.6;
    for (let yy = y + 14, r = 0; yy < y + h + 20; yy += 30 * sc, r++) for (let xx = x + (r % 2 ? 16 * sc : 0); xx < x + w + 30; xx += 32 * sc) {
      g.beginPath(); g.arc(xx, yy, 9.5 * sc, 0, TAU); g.stroke(); g.beginPath(); g.arc(xx, yy, 5.5 * sc, 0, TAU); g.stroke();
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + PI / 4; g.beginPath(); g.arc(xx + Math.cos(a) * 7.5 * sc, yy + Math.sin(a) * 7.5 * sc, 1.5 * sc, 0, TAU); g.fill(); }
      g.fillRect(xx - 1.5, yy - 3.5 * sc, 3, 7 * sc); g.fillRect(xx - 3.5 * sc, yy - 1.5, 7 * sc, 3);
    }
  } else if (pat === 'knit') {
    for (let xx = x; xx < x + w; xx += 7 * sc) { g.fillStyle = rgba(lo, 0.38); g.fillRect(xx, y, 1.6 * sc, h); g.fillStyle = rgba(hi, 0.3); g.fillRect(xx + 3 * sc, y, 1.4 * sc, h); }
  }
  if (fab === 'denim') {
    for (let i = 0, n = w * h / 14; i < n; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,30,0.1)'; g.fillRect(x + R() * w, y + R() * h, 1.3, 2.6); }
  } else if (fab === 'sequin') {
    for (let i = 0, n = w * h / 7; i < n; i++) { g.fillStyle = `rgba(255,255,255,${0.15 + R() * 0.8})`; const s = 1.4 + R() * 1.6; g.fillRect(x + R() * w, y + R() * h, s, s); }
    for (let i = 0, n = w * h / 160; i < n; i++) { g.fillStyle = ['#fff7c2', '#c2f6ff', '#ffc2ee', '#ffffff'][Math.floor(R() * 4)]; const px = x + R() * w, py = y + R() * h; g.fillRect(px - 3, py - 0.6, 6, 1.2); g.fillRect(px - 0.6, py - 3, 1.2, 6); }
  } else if (fab === 'satin') {
    const gr = g.createLinearGradient(x, y, x + w, y + h * 0.6); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.2)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(0.75, 'rgba(255,255,255,0.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  } else if (fab === 'velvet') {
    const gr = g.createLinearGradient(x, y, x + w, y); gr.addColorStop(0, 'rgba(0,0,0,0.26)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.07)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.12)'); gr.addColorStop(0.75, 'rgba(255,255,255,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0.26)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  } else if (fab === 'leather') {
    g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 2.4;
    for (let i = 0; i < 5; i++) { const xx = x + R() * w; g.beginPath(); g.moveTo(xx, y + R() * h * 0.3); g.lineTo(xx + (R() - 0.5) * 14, y + h * (0.5 + R() * 0.5)); g.stroke(); }
  }
  g.restore();
}
function inReg(g, r, fn) { g.save(); g.beginPath(); g.rect(r[0], r[1], r[2], r[3]); g.clip(); g.translate(r[0], r[1]); fn(r[2], r[3]); g.restore(); }
const TM = 1.5;   // nửa góc vùng mặt trên ảnh (rad)
const TY = y => (1.45 - y) / 0.65 * 256, TX = th => 128 + th / PI * 128;
const AY = y => (1.4 - y) / 0.54 * 256, LY = y => (0.93 - y) / 0.88 * 256;

// ---------- vẽ khuôn mặt (tả thực) ----------
function paintFace(g, C, R) {
  const { skin, female, age, hairCol } = C, F = C.face, cx = 256;
  const dk = (k, a) => rgba(shade(skin, k), a);
  const el = (x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); };
  const soft = (px, fn) => { g.save(); g.filter = `blur(${px}px)`; fn(); g.restore(); };
  g.fillStyle = skin; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.04)' : dk(0.6, 0.055); g.fillRect(R() * 512, R() * 512, 1.4, 1.4); }   // lỗ chân lông
  // khối mặt: trán sáng, hai bên và dưới cằm tối, má ửng
  soft(26, () => {
    g.fillStyle = dk(1.3, 0.45); el(cx, 150, 90, 46);
    g.fillStyle = dk(0.6, 0.5); for (const sd of [-1, 1]) el(cx + sd * 246, 300, 66, 250);
    g.fillStyle = dk(0.55, 0.6); el(cx, 526, 200, 56);
    g.fillStyle = `rgba(226,104,96,${female ? 0.26 : 0.1})`; for (const sd of [-1, 1]) el(cx + sd * 108, 322, 44, 28);
  });
  soft(8, () => {
    g.fillStyle = dk(0.58, 0.42); for (const sd of [-1, 1]) el(cx + sd * 60, 240, 42, 21);        // hốc mắt
    g.fillStyle = dk(0.6, 0.3); for (const sd of [-1, 1]) el(cx + sd * 21, 292, 7, 44);            // sườn mũi
    g.fillStyle = dk(0.5, 0.5); el(cx, 351, 22, 6);                                               // dưới mũi
    g.fillStyle = dk(0.58, 0.42); el(cx, 421, 30, 7);                                             // dưới môi
    g.fillStyle = dk(1.4, 0.5); el(cx, 282, 5, 40); el(cx, 327, 8, 7);                            // sống mũi, chóp mũi
    g.fillStyle = dk(1.3, 0.3); for (const sd of [-1, 1]) el(cx + sd * 86, 288, 26, 13);           // gò má
    g.fillStyle = dk(1.3, 0.35); el(cx, 452, 20, 12);                                             // cằm
  });
  // ----- mắt -----
  const ey = 246, ex = 60, ew = 33 * F.eyeW, eh = 12.5 * F.eyeH, lidC = female ? '#170d10' : '#2a1714';
  for (const sd of [-1, 1]) {
    const x0 = cx + sd * ex, inX = x0 - sd * ew, outX = x0 + sd * ew, tl = F.tilt * 3.5;
    const upper = () => { g.moveTo(inX, ey + 2); g.bezierCurveTo(inX + sd * ew * 0.55, ey - eh * 1.5, outX - sd * ew * 0.6, ey - eh * 1.4 - tl, outX, ey - 1 - tl); };
    const path = () => { g.beginPath(); upper(); g.bezierCurveTo(outX - sd * ew * 0.5, ey + eh * 0.95, inX + sd * ew * 0.6, ey + eh, inX, ey + 2); g.closePath(); };
    if (female && F.shadow) soft(4, () => { g.fillStyle = rgba(F.shadow, 0.3); el(x0 + sd * 3, ey - eh * 1.4, ew * 1.05, eh * 0.9); });
    path(); g.fillStyle = '#ece5e0'; g.fill();
    g.save(); path(); g.clip();
    let gr = g.createLinearGradient(0, ey - eh * 1.5, 0, ey); gr.addColorStop(0, 'rgba(50,30,40,0.55)'); gr.addColorStop(1, 'rgba(50,30,40,0)'); g.fillStyle = gr; g.fillRect(x0 - ew, ey - eh * 1.6, ew * 2, eh * 1.6);
    g.fillStyle = 'rgba(190,120,110,0.35)'; el(inX, ey + 2, 7, 6); g.fillStyle = 'rgba(120,90,90,0.25)'; el(outX, ey, 7, 7);
    const ir = 13.2, ix = x0 + F.look * 2, iy = ey - 1.5;
    gr = g.createRadialGradient(ix, iy + 2, 1, ix, iy, ir); gr.addColorStop(0, shade(F.iris, 1.9)); gr.addColorStop(0.55, F.iris); gr.addColorStop(0.86, shade(F.iris, 0.5)); gr.addColorStop(1, '#0d0707');
    g.fillStyle = gr; el(ix, iy, ir, ir);
    g.strokeStyle = rgba(shade(F.iris, 1.6), 0.35); g.lineWidth = 0.8; for (let k = 0; k < 18; k++) { const a = k / 18 * TAU; g.beginPath(); g.moveTo(ix + Math.cos(a) * 5.5, iy + Math.sin(a) * 5.5); g.lineTo(ix + Math.cos(a) * 11.5, iy + Math.sin(a) * 11.5); g.stroke(); }
    g.fillStyle = '#060304'; el(ix, iy, 5.3, 5.3);
    g.fillStyle = 'rgba(255,255,255,0.95)'; el(ix - 3.8, iy - 4.8, 2.9, 2.6);
    g.fillStyle = 'rgba(255,255,255,0.4)'; el(ix + 4.5, iy + 5, 1.8, 1.5);
    g.restore();
    g.lineCap = 'round'; g.strokeStyle = lidC; g.lineWidth = female ? 4.4 : 2.8; g.beginPath(); upper(); g.stroke();
    if (female) {
      g.lineWidth = 2.8; g.beginPath(); g.moveTo(outX, ey - 1 - tl); g.lineTo(outX + sd * 8, ey - 7 - tl); g.stroke();
      g.lineWidth = 1.6; for (let k = 0; k < 8; k++) { const q = 0.25 + k * 0.1, lx = x0 + sd * ew * (q * 2 - 1) * 0.95, ly = ey - eh * (1.42 - Math.pow(q * 2 - 1, 2) * 1.25) - tl * q; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + sd * (1.5 + q * 4.5), ly - 5 - q * 2); g.stroke(); }
    }
    g.strokeStyle = dk(0.45, 0.55); g.lineWidth = 1.5; g.beginPath(); g.moveTo(outX - sd * 3, ey + 1); g.bezierCurveTo(outX - sd * ew * 0.5, ey + eh * 1.02, inX + sd * ew * 0.6, ey + eh * 1.06, inX + sd * 4, ey + 4); g.stroke();
    if (!F.mono) { g.strokeStyle = dk(0.45, 0.55); g.lineWidth = 1.8; g.beginPath(); g.moveTo(inX + sd * 5, ey - eh * 1.25); g.quadraticCurveTo(x0, ey - eh * 2.25 - tl * 0.5, outX + sd * 1, ey - eh * 1.15 - tl); g.stroke(); }
    soft(3, () => { g.fillStyle = dk(0.6, 0.3); el(x0, ey + eh + 7, ew * 0.8, 3.5); });
    // lông mày: từng sợi
    const by = 204 - F.browH * 5, n = female ? 70 : 130, bw = female ? 2.2 : 4.6;
    g.strokeStyle = rgba(C.browCol, 0.74); g.lineWidth = female ? 1.4 : 1.7;
    for (let i = 0; i < n; i++) {
      const tt = R(), bx = x0 + sd * (-ew - 7 + tt * (2 * ew + 17));
      const yy = by + 6 - Math.sin(tt * PI * 0.8) * 9 * F.browArch + (1 - tt) * F.browIn * 6 + tt * tt * 5 + (R() - 0.5) * 2 * bw * (1 - tt * 0.65);
      const a = -0.25 - tt * 0.9 * 0.2 + (R() - 0.5) * 0.3, len = 6 + R() * 5;
      g.beginPath(); g.moveTo(bx, yy); g.lineTo(bx + sd * Math.cos(a) * len, yy + Math.sin(a) * len * (tt < 0.25 ? 2.2 : tt > 0.7 ? -0.6 : 1)); g.stroke();
    }
  }
  // ----- mũi -----
  for (const sd of [-1, 1]) {
    g.fillStyle = 'rgba(52,26,22,0.72)'; el(cx + sd * 10, 344, 5.2, 3, sd * 0.35);
    g.strokeStyle = dk(0.5, 0.5); g.lineWidth = 1.8; g.beginPath(); g.moveTo(cx + sd * 19, 327); g.quadraticCurveTo(cx + sd * 25, 339, cx + sd * 15, 346); g.stroke();
  }
  // ----- môi -----
  const my = 389, mw = 41 * F.mouthW, lip = C.lip, mt = F.mouth;
  const upL = mt === 'smirk' ? 1 : mt === 'smile' ? 5 : mt === 'grin' ? 6 : mt === 'soft' ? 2.5 : 0, upR = mt === 'smirk' ? 7 : upL, dip = mt === 'grin' ? 5 : mt === 'smile' ? 3 : 1.5, open = mt === 'grin' ? 7 : 0;
  const xl = cx - mw, xr = cx + mw, yl = my - upL, yr = my - upR;
  g.fillStyle = shade(lip, 0.82); g.beginPath(); g.moveTo(xl, yl); g.quadraticCurveTo(cx - mw * 0.5, my - 9, cx - 7, my - 10); g.quadraticCurveTo(cx, my - 6.5, cx + 7, my - 10); g.quadraticCurveTo(cx + mw * 0.5, my - 9, xr, yr); g.quadraticCurveTo(cx, my + dip + 2, xl, yl); g.fill();
  if (open) { g.fillStyle = '#3a1016'; g.beginPath(); g.moveTo(xl + 4, yl + 1); g.quadraticCurveTo(cx, my + dip + 1, xr - 4, yr + 1); g.quadraticCurveTo(cx, my + dip + open * 2.2, xl + 4, yl + 1); g.fill(); g.save(); g.clip(); g.fillStyle = '#f3efe8'; g.fillRect(xl, my - 4, mw * 2, dip + open + 2); g.strokeStyle = 'rgba(120,110,110,0.35)'; g.lineWidth = 0.8; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(cx + k * 8.5, my - 2); g.lineTo(cx + k * 8.5, my + 12); g.stroke(); } g.restore(); }
  g.fillStyle = lip; g.beginPath(); g.moveTo(xl, yl); g.quadraticCurveTo(cx, my + dip + 2 + open * 1.6, xr, yr); g.quadraticCurveTo(cx + mw * 0.55, my + 15 + dip + open, cx, my + 16 + dip + open); g.quadraticCurveTo(cx - mw * 0.55, my + 15 + dip + open, xl, yl); g.fill();
  soft(2.5, () => { g.fillStyle = `rgba(255,255,255,${female ? 0.34 : 0.16})`; el(cx, my + 9 + dip + open, mw * 0.36, 2.6); });
  g.strokeStyle = '#4a1c1e'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(xl, yl); g.quadraticCurveTo(cx, my + dip + 2, xr, yr); g.stroke();
  for (const [x, y] of [[xl, yl], [xr, yr]]) { g.fillStyle = dk(0.45, 0.5); el(x + Math.sign(x - cx) * 2, y, 2.4, 2.4); }
  g.strokeStyle = dk(0.6, 0.3); g.lineWidth = 1.6; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(cx + sd * 5, 356); g.lineTo(cx + sd * 6, my - 11); g.stroke(); }   // nhân trung
  // ----- râu -----
  if (!female && F.beard) {
    const bc = shade(hairCol, lum(hairCol) > 0.4 ? 0.6 : 1), inJaw = (x, y) => Math.pow((x - cx) / 150, 2) + Math.pow((y - 330) / 175, 2) < 1 && y > 345;
    const dots = (n, test, a) => { for (let i = 0; i < n; i++) { const x = cx + (R() - 0.5) * 300, y = 340 + R() * 170; if (!test(x, y)) continue; g.fillStyle = rgba(bc, a * (0.6 + R() * 0.4)); g.fillRect(x, y, 1.5, 1.9); } };
    const lipZone = (x, y) => Math.abs(x - cx) < mw + 4 && y > my - 12 && y < my + 22;
    if (F.beard === 'stubble') dots(3200, (x, y) => inJaw(x, y) && !lipZone(x, y) && (Math.abs(x - cx) > 42 || y > 405 || y < my - 10), 0.4);
    if (F.beard === 'full') { soft(5, () => { g.fillStyle = rgba(bc, 0.5); g.beginPath(); g.moveTo(cx - 140, 330); g.quadraticCurveTo(cx - 110, 470, cx, 500); g.quadraticCurveTo(cx + 110, 470, cx + 140, 330); g.quadraticCurveTo(cx + 76, 400, cx + mw + 12, 420); g.quadraticCurveTo(cx, 436, cx - mw - 12, 420); g.quadraticCurveTo(cx - 76, 400, cx - 140, 330); g.fill(); }); dots(6000, (x, y) => inJaw(x, y) && !lipZone(x, y) && (Math.abs(x - cx) > 46 || y > 405 || y < my - 10), 0.85); }
    if (F.beard === 'mustache' || F.beard === 'goatee' || F.beard === 'full') { g.strokeStyle = rgba(bc, 0.8); g.lineWidth = 1.5; for (let i = 0; i < 150; i++) { const x = cx + (R() - 0.5) * (mw * 2 + 10), y = my - 13 - R() * 9 + Math.abs(x - cx) * 0.12; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sign(x - cx) * 2.5, y + 5); g.stroke(); } }
    if (F.beard === 'goatee') dots(2600, (x, y) => Math.pow((x - cx) / 30, 2) + Math.pow((y - 446) / 32, 2) < 1, 0.9);
  }
  // ----- nếp tuổi, nốt ruồi -----
  if (age >= 40) {
    g.strokeStyle = dk(0.5, age >= 55 ? 0.5 : age >= 47 ? 0.36 : 0.22); g.lineWidth = 1.8;
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(cx + sd * 24, 340); g.quadraticCurveTo(cx + sd * 50, 368, cx + sd * 48, 404); g.stroke(); for (const k of [-1, 0, 1]) { g.beginPath(); g.moveTo(cx + sd * (ex + ew + 5), ey + k * 4); g.lineTo(cx + sd * (ex + ew + 16), ey + k * 8 - 2); g.stroke(); } g.beginPath(); g.moveTo(cx + sd * 36, ey + eh + 12); g.quadraticCurveTo(cx + sd * 58, ey + eh + 19, cx + sd * 82, ey + eh + 11); g.stroke(); }
    if (age >= 50) for (const yy of [150, 166, 182]) { g.beginPath(); g.moveTo(cx - 64, yy); g.quadraticCurveTo(cx, yy - 5, cx + 64, yy); g.stroke(); }
  }
  if (F.mole) { g.fillStyle = '#3a2218'; el(cx + F.mole * 46, 372, 2.4, 2.4); }
  if (F.freckles) { g.fillStyle = dk(0.6, 0.45); for (let i = 0; i < 40; i++) el(cx + (R() - 0.5) * 200, 300 + R() * 34, 1.4, 1.4); }
}

// ---------- vẽ thân áo ----------
function paintTorso(g, D, C, R) {
  const t = D.top, skin = C.skin;
  g.fillStyle = skin; g.fillRect(0, 0, 256, 256);
  // khối cơ thể nhẹ trên da (bụng, xương đòn)
  g.strokeStyle = rgba(shade(skin, 0.6), 0.35); g.lineWidth = 2; g.beginPath(); g.moveTo(102, TY(1.385)); g.quadraticCurveTo(116, TY(1.37), 126, TY(1.378)); g.moveTo(154, TY(1.385)); g.quadraticCurveTo(140, TY(1.37), 130, TY(1.378)); g.stroke();
  g.fillStyle = rgba(shade(skin, 0.6), 0.4); g.beginPath(); g.ellipse(128, TY(1.01), 2.2, 3.2, 0, 0, TAU); g.fill();
  // phần hông: quần / váy
  const low = D.skirt ? D.skirt : D.bottom;
  const waist = D.bottom && D.bottom.high ? 1.06 : 0.985;
  if (low) fabric(g, 0, TY(waist), 256, 256 - TY(waist), low.color, low.pat === 'stripe' ? 'vstripe' : low.pat, low.fab, R);
  if (D.bottom && !D.skirt) {
    g.fillStyle = shade(low.color, 0.72); g.fillRect(0, TY(waist), 256, 7);   // cạp quần
    if (D.belt || (D.bottom.kind === 'tay' && t.tuck)) { g.fillStyle = '#1a1210'; g.fillRect(0, TY(waist) + 1, 256, 7); g.fillStyle = '#d9b44a'; g.fillRect(121, TY(waist), 14, 9); g.fillStyle = '#1a1210'; g.fillRect(125, TY(waist) + 3, 6, 3); }
    else if (D.bottom.fab === 'denim') { g.fillStyle = '#d9b44a'; g.beginPath(); g.arc(128, TY(waist) + 4, 2.4, 0, TAU); g.fill(); }
    g.strokeStyle = rgba(shade(low.color, 0.5), 0.6); g.lineWidth = 1.6; g.beginPath(); g.moveTo(128, TY(waist) + 8); g.lineTo(128, 256); g.stroke();
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(128 + sd * 40, TY(waist) + 8); g.quadraticCurveTo(128 + sd * 52, TY(0.9), 128 + sd * 62, TY(0.9)); g.stroke(); }   // túi quần
  }
  // áo
  const top = TY(1.45), hem = TY(t.hemY);
  const body = () => {
    fabric(g, 0, top, 256, hem - top, t.color, t.pat === 'stripe' && /shirt|blouse/.test(t.kind) ? 'vstripe' : t.pat, t.fab, R);
    // nếp vải + khối
    let gr = g.createLinearGradient(0, 0, 256, 0);
    for (const [p, a] of [[0, 0.16], [0.12, 0.02], [0.25, 0.2], [0.36, 0], [0.5, -0.07], [0.64, 0], [0.75, 0.2], [0.88, 0.02], [1, 0.16]]) gr.addColorStop(p, a >= 0 ? `rgba(0,0,10,${a})` : `rgba(255,255,255,${-a})`);
    g.fillStyle = gr; g.fillRect(0, top, 256, hem - top);
    gr = g.createLinearGradient(0, TY(1.2), 0, hem); gr.addColorStop(0, 'rgba(0,0,10,0)'); gr.addColorStop(1, 'rgba(0,0,10,0.16)'); g.fillStyle = gr; g.fillRect(0, TY(1.2), 256, hem - TY(1.2));
    if (D.female) { g.fillStyle = 'rgba(0,0,10,0.12)'; g.beginPath(); g.ellipse(128, TY(1.185), 44, 7, 0, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(0,0,10,0.1)'; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const x = 60 + R() * 136, y = TY(1.15) + R() * (hem - TY(1.15) - 10); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (R() - 0.5) * 30, y + 12, x + (R() - 0.5) * 22, y + 24); g.stroke(); }
    if (!t.tuck) { g.fillStyle = rgba(shade(t.color, 0.6), 0.55); g.fillRect(0, hem - 4, 256, 4); }
  };
  body();
  const hole = (x, y, rx, ry) => { g.fillStyle = skin; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); };
  const rim = (x, y, rx, ry, a0 = 0, a1 = PI, c = shade(t.color, 0.65), w = 3.5) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.ellipse(x, y, rx, ry, 0, a0, a1); g.stroke(); };
  const neckY = TY(1.415);
  if (t.neck === 'crew') { hole(128, neckY - 2, 22, 13); rim(128, neckY - 2, 23, 14, 0, PI, shade(t.color, 0.7), 4); }
  else if (t.neck === 'scoop') { hole(128, neckY, 30, 30); rim(128, neckY, 30, 30); }
  else if (t.neck === 'v' || t.neck === 'vcap') { g.fillStyle = skin; g.beginPath(); g.moveTo(102, top); g.lineTo(128, TY(1.25)); g.lineTo(154, top); g.fill(); g.strokeStyle = shade(t.color, 0.65); g.lineWidth = 3.5; g.beginPath(); g.moveTo(101, top + 4); g.lineTo(128, TY(1.25)); g.lineTo(155, top + 4); g.stroke(); }
  else if (t.neck === 'tank') { hole(128, neckY, 27, 30); rim(128, neckY, 27, 30); for (const x of [64, 192]) { hole(x, TY(1.36), 30, 38); rim(x, TY(1.36), 30, 38, 0, TAU); } g.fillStyle = skin; g.fillRect(0, 0, 34, TY(1.26)); g.fillRect(222, 0, 34, TY(1.26)); }
  else if (t.neck === 'cami' || t.neck === 'strapless' || t.neck === 'halter') {
    const cut = TY(1.285);
    g.fillStyle = skin; g.fillRect(0, 0, 256, cut);
    g.strokeStyle = t.color; g.lineCap = 'round';
    if (t.neck === 'cami') { g.lineWidth = 5; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(128 + sd * 30, cut + 2); g.lineTo(128 + sd * 31, 0); g.stroke(); g.beginPath(); g.moveTo(sd < 0 ? 0 : 256, 0); g.lineTo(sd < 0 ? 18 : 238, cut + 2); g.stroke(); } }
    if (t.neck === 'halter') { g.lineWidth = 13; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(128 + sd * 34, cut + 2); g.lineTo(128 + sd * 10, 4); g.stroke(); } fabric(g, 100, 0, 56, 9, t.color, null, t.fab, R); }
    g.fillStyle = skin; g.beginPath(); g.moveTo(128 - 30, cut - 1); g.quadraticCurveTo(128, cut + 15, 128 + 30, cut - 1); g.fill();   // khoét ngực tim
    g.strokeStyle = shade(t.color, 0.65); g.lineWidth = 3; g.beginPath(); g.moveTo(0, cut); g.lineTo(98, cut); g.quadraticCurveTo(128, cut + 16, 158, cut); g.lineTo(256, cut); g.stroke();
  } else if (t.neck === 'high') { /* cổ cao: kín */ }
  else if (t.neck === 'buttons' || t.neck === 'placket') {
    g.fillStyle = skin; g.beginPath(); g.moveTo(113, top); g.lineTo(128, TY(1.37)); g.lineTo(143, top); g.fill();
    const end = t.neck === 'placket' ? TY(1.24) : hem;
    g.fillStyle = rgba(shade(t.color, 0.7), 0.5); g.fillRect(124, TY(1.37), 1.5, end - TY(1.37)); g.fillRect(131, TY(1.37), 1.5, end - TY(1.37));
    for (let y = TY(1.34); y < end - 3; y += (t.neck === 'placket' ? 11 : 19)) { g.fillStyle = lum(t.color) > 0.6 ? '#8a8d94' : '#f4f2ed'; g.beginPath(); g.arc(128, y, 2.3, 0, TAU); g.fill(); }
    if (t.kind === 'shirt' || t.kind === 'shirtShort') { g.strokeStyle = rgba(shade(t.color, 0.6), 0.6); g.lineWidth = 1.6; g.strokeRect(146, TY(1.27), 22, 20); }
  }
  if (t.kind === 'aodai') {   // tà chéo + nút thắt
    g.strokeStyle = rgba(shade(t.color, 0.55), 0.8); g.lineWidth = 2.4; g.beginPath(); g.moveTo(128, TY(1.42)); g.quadraticCurveTo(160, TY(1.36), 190, TY(1.24)); g.stroke();
    for (const k of [0.2, 0.55, 0.9]) { g.fillStyle = '#e8c55a'; g.beginPath(); g.arc(128 + 62 * k, TY(1.42 - 0.16 * k) + 2, 2.6, 0, TAU); g.fill(); }
  }
  if (t.kind === 'hoodie') {
    g.strokeStyle = rgba(shade(t.color, 0.55), 0.75); g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(96, TY(1.0)); g.lineTo(104, TY(1.11)); g.lineTo(152, TY(1.11)); g.lineTo(160, TY(1.0)); g.closePath(); g.stroke();
    g.fillStyle = rgba(shade(t.color, 0.65), 0.6); g.fillRect(0, hem - 12, 256, 12);
    g.strokeStyle = lum(t.color) > 0.55 ? '#55575e' : '#f4f2ed'; g.lineWidth = 2.6; g.lineCap = 'round';
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(128 + sd * 9, neckY + 10); g.lineTo(128 + sd * 11, TY(1.24)); g.stroke(); }
  }
  if (t.kind === 'sweater' || t.kind === 'turtle') { g.fillStyle = rgba(shade(t.color, 0.7), 0.5); g.fillRect(0, hem - 9, 256, 9); }
  if (t.print && /tee|hoodie|crop/.test(t.kind)) {
    const pc = lum(t.color) > 0.55 ? ['#17171c', '#c8102e', '#7c3dff', '#1e3a8a'][Math.floor(R() * 4)] : ['#ffffff', '#ffd84d', '#ff6fa3', '#7cf7ff'][Math.floor(R() * 4)];
    g.fillStyle = pc; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${t.print.length > 2 ? Math.min(26, 110 / t.print.length) : 40}px "Segoe UI", Arial, sans-serif`;
    g.fillText(t.print, 128, TY(1.25)); g.fillRect(128 - 28, TY(1.25) + 17, 56, 3);
  }
  if (D.bib) {   // yếm váy
    fabric(g, 100, TY(1.3), 56, TY(0.985) - TY(1.3), D.skirt.color, null, 'denim', R);
    g.strokeStyle = shade(D.skirt.color, 0.6); g.lineWidth = 2; g.strokeRect(100, TY(1.3), 56, TY(0.985) - TY(1.3)); g.strokeRect(116, TY(1.22), 24, 18);
    g.strokeStyle = D.skirt.color; g.lineWidth = 9; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(128 + sd * 22, TY(1.3)); g.lineTo(128 + sd * 30, 0); g.stroke(); g.beginPath(); g.moveTo(sd < 0 ? 12 : 244, 0); g.lineTo(sd < 0 ? 40 : 216, TY(0.985)); g.stroke(); }
    g.fillStyle = '#d9b44a'; for (const sd of [-1, 1]) { g.beginPath(); g.arc(128 + sd * 22, TY(1.29), 3, 0, TAU); g.fill(); }
  }
  if (D.vest3) {   // áo gile trong bộ vest ba mảnh
    g.fillStyle = D.vest3; g.beginPath(); g.moveTo(96, top); g.lineTo(128, TY(1.2)); g.lineTo(160, top); g.lineTo(256, top); g.lineTo(256, hem); g.lineTo(0, hem); g.lineTo(0, top); g.closePath(); g.fill();
    for (let y = TY(1.16); y < hem - 4; y += 15) { g.fillStyle = '#17171c'; g.beginPath(); g.arc(128, y, 2.2, 0, TAU); g.fill(); }
  }
  if (D.tie) {
    g.fillStyle = D.tie; g.beginPath(); g.moveTo(122, TY(1.4)); g.lineTo(134, TY(1.4)); g.lineTo(132, TY(1.37)); g.lineTo(137, TY(1.08)); g.lineTo(128, TY(1.04)); g.lineTo(119, TY(1.08)); g.lineTo(124, TY(1.37)); g.closePath(); g.fill();
    g.strokeStyle = rgba(shade(D.tie, 1.5), 0.5); g.lineWidth = 2; for (let y = TY(1.34); y < TY(1.07); y += 9) { g.beginPath(); g.moveTo(121, y + 5); g.lineTo(135, y - 3); g.stroke(); }
    g.fillStyle = shade(D.tie, 0.75); g.fillRect(122, TY(1.405), 12, 8);
  }
  if (C.necklace && /scoop|v|vcap|cami|strapless|crew|halter/.test(t.neck || '')) { g.strokeStyle = C.necklace; g.lineWidth = 2.2; g.beginPath(); g.ellipse(128, TY(1.42), 20, 17, 0, 0.15, PI - 0.15); g.stroke(); g.fillStyle = C.necklace; g.beginPath(); g.arc(128, TY(1.42) + 18, 3.4, 0, TAU); g.fill(); }
}
function paintCoat(g, D, R) {
  const L = D.layer; if (!L) return;
  const top = 0, hem = (1.45 - L.hemY) / (1.45 - Math.min(0.8, L.hemY)) * 256, K = 256 / (1.45 - Math.min(0.8, L.hemY));
  const CY = y => (1.45 - y) * K;
  fabric(g, 0, 0, 256, 256, L.color, L.pat === 'stripe' ? 'vstripe' : L.pat, L.fab, R);
  let gr = g.createLinearGradient(0, 0, 256, 0);
  for (const [p, a] of [[0, -0.05], [0.14, 0.18], [0.3, 0.02], [0.5, 0.14], [0.7, 0.02], [0.86, 0.18], [1, -0.05]]) gr.addColorStop(p, a >= 0 ? `rgba(0,0,10,${a})` : `rgba(255,255,255,${-a})`);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const lo = shade(L.color, 0.6), hi = shade(L.color, lum(L.color) < 0.3 ? 1.5 : 1.2);
  g.lineCap = 'round';
  if (/suit|blazer|coat/.test(L.kind)) {
    for (const sd of [0, 1]) {   // ve áo
      const x = sd ? 256 : 0, s = sd ? -1 : 1;
      g.fillStyle = hi; g.beginPath(); g.moveTo(x, CY(1.43)); g.lineTo(x + s * 26, CY(1.36)); g.lineTo(x + s * 19, CY(1.32)); g.lineTo(x + s * 27, CY(1.3)); g.lineTo(x, CY(1.1)); g.closePath(); g.fill();
      g.strokeStyle = lo; g.lineWidth = 1.8; g.stroke();
      g.strokeStyle = lo; g.lineWidth = 2; g.beginPath(); g.moveTo(x + s * 30, CY(0.99)); g.lineTo(x + s * 62, CY(0.99)); g.stroke();   // nắp túi
      g.fillStyle = rgba(lo, 0.5); g.fillRect(x + (s > 0 ? 30 : -62), CY(0.99), 32, 4);
    }
    g.fillStyle = lum(L.color) < 0.3 ? '#5a5d66' : '#17171c'; for (const y of L.kind === 'coat' ? [1.08, 0.94, 0.8] : [1.08, 0.97]) { g.beginPath(); g.arc(248, CY(y), 3, 0, TAU); g.fill(); }
    if (L.kind !== 'coat') { g.fillStyle = '#f4f2ed'; g.beginPath(); g.moveTo(20, CY(1.27)); g.lineTo(34, CY(1.275)); g.lineTo(33, CY(1.255)); g.lineTo(21, CY(1.25)); g.fill(); }   // khăn túi ngực
    g.strokeStyle = rgba(lo, 0.7); g.lineWidth = 1.6; g.beginPath(); g.moveTo(128, CY(1.38)); g.lineTo(128, 256); g.stroke();
  } else if (L.kind === 'gile') {
    g.fillStyle = lum(L.color) < 0.3 ? '#8a8d94' : '#17171c'; for (const y of [1.1, 1.04, 0.98]) { g.beginPath(); g.arc(249, CY(y), 2.6, 0, TAU); g.fill(); }
    g.strokeStyle = lo; g.lineWidth = 2; for (const x of [34, 222]) { g.beginPath(); g.moveTo(x - 14, CY(1.0)); g.lineTo(x + 14, CY(1.0)); g.stroke(); }
  } else {   // bomber / denim / thể thao
    const rib = L.kind === 'denim' ? null : shade(L.color, lum(L.color) < 0.25 ? 1.6 : 0.6);
    if (rib) { g.fillStyle = rib; g.fillRect(0, 256 - 16, 256, 16); g.fillRect(0, 0, 256, 13); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = 0; x < 256; x += 5) { g.fillRect(x, 256 - 16, 1.6, 16); g.fillRect(x, 0, 1.6, 13); } }
    g.fillStyle = '#c9ccd4'; g.fillRect(0, 0, 3.5, 256); g.fillRect(252.5, 0, 3.5, 256);   // khoá kéo
    if (L.kind === 'denim') {
      g.strokeStyle = '#e8b25a'; g.lineWidth = 1.6; g.setLineDash([4, 3]);
      for (const x of [26, 230]) { g.strokeRect(x - 18, CY(1.3), 36, 30); g.beginPath(); g.moveTo(x, CY(1.2)); g.lineTo(x, 256); g.stroke(); }
      g.beginPath(); g.moveTo(0, 248); g.lineTo(256, 248); g.moveTo(8, 0); g.lineTo(8, 256); g.moveTo(248, 0); g.lineTo(248, 256); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#d9b44a'; for (const x of [26, 230]) { g.beginPath(); g.arc(x, CY(1.29), 2.6, 0, TAU); g.fill(); }
    } else if (L.kind === 'sport') {
      g.fillStyle = '#f4f2ed'; g.fillRect(56, 0, 5, 256); g.fillRect(195, 0, 5, 256); g.fillRect(64, 0, 2.5, 256); g.fillRect(189.5, 0, 2.5, 256);
      g.fillStyle = '#f4f2ed'; g.font = '900 15px Arial'; g.textAlign = 'center'; g.fillText('★', 28, CY(1.24));
    } else {
      g.strokeStyle = rgba(lo, 0.8); g.lineWidth = 2; for (const x of [34, 222]) { g.beginPath(); g.moveTo(x - 10, CY(1.04)); g.lineTo(x + 8, CY(0.96)); g.stroke(); }
      g.fillStyle = '#ff8a3d'; g.fillRect(226, CY(1.3), 12, 3);
    }
  }
}
function paintLegs(g, D, C, R) {
  const b = D.bottom, skin = C.skin;
  g.fillStyle = skin; g.fillRect(0, 0, 128, 256);
  let gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, rgba(shade(skin, 0.6), 0.4)); gr.addColorStop(0.3, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, rgba(shade(skin, 1.3), 0.3)); gr.addColorStop(0.7, 'rgba(0,0,0,0)'); gr.addColorStop(1, rgba(shade(skin, 0.6), 0.4));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
  g.fillStyle = rgba(shade(skin, 0.6), 0.3); g.beginPath(); g.ellipse(64, LY(0.45), 15, 9, 0, 0, TAU); g.fill();   // đầu gối
  if (D.tights) { g.fillStyle = rgba('#17171c', 0.78); g.fillRect(0, 0, 128, 256); }
  if (b && !D.skirt) {
    const hemY = b.kind === 'shorts' ? (b.sport ? 0.67 : 0.6) : b.crop ? 0.3 : 0.085, hem = LY(hemY);
    fabric(g, 0, 0, 128, hem, b.color, b.pat === 'stripe' ? 'vstripe' : b.pat, b.fab, R, 0.9);
    gr = g.createLinearGradient(0, 0, 128, 0); for (const [p, a] of [[0, 0.22], [0.25, 0], [0.5, -0.08], [0.75, 0], [1, 0.22]]) gr.addColorStop(p, a >= 0 ? `rgba(0,0,10,${a})` : `rgba(255,255,255,${-a})`);
    g.fillStyle = gr; g.fillRect(0, 0, 128, hem);
    const lo = shade(b.color, 0.6);
    g.strokeStyle = rgba(lo, 0.7); g.lineWidth = 1.5; g.beginPath(); g.moveTo(32, 0); g.lineTo(32, hem); g.moveTo(96, 0); g.lineTo(96, hem); g.stroke();   // đường may
    if (b.kind === 'tay') { g.strokeStyle = rgba(shade(b.color, 1.4), 0.4); g.lineWidth = 1.8; g.beginPath(); g.moveTo(64, LY(0.8)); g.lineTo(64, hem); g.stroke(); }   // ly quần
    if (b.fab === 'denim') {
      g.strokeStyle = '#e8b25a'; g.lineWidth = 1.2; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(29, 0); g.lineTo(29, hem); g.stroke(); g.setLineDash([]);
      gr = g.createRadialGradient(64, LY(0.66), 4, 64, LY(0.66), 40); gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(20, LY(0.82), 88, 90);   // bạc màu ở đùi
    }
    if (b.ripped) for (const [y, w] of [[0.47, 30], [0.64, 22]]) { g.fillStyle = skin; g.beginPath(); g.ellipse(64, LY(y), w / 2, 7, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(64 - w / 2, LY(y) + i * 2.6); g.lineTo(64 + w / 2, LY(y) + i * 2.6 + 1); g.stroke(); } }
    if (b.kind === 'jogger') { g.fillStyle = '#f4f2ed'; g.fillRect(30, 0, 4, hem - 12); g.fillStyle = rgba(lo, 0.8); g.fillRect(0, hem - 12, 128, 12); }
    if (b.kind === 'cargo') { g.strokeStyle = rgba(lo, 0.85); g.lineWidth = 2; g.strokeRect(18, LY(0.66), 30, 34); g.beginPath(); g.moveTo(18, LY(0.66) + 9); g.lineTo(48, LY(0.66) + 9); g.stroke(); }
    if (b.sport) { g.fillStyle = '#f4f2ed'; g.fillRect(28, 0, 3, hem); g.fillRect(34, 0, 3, hem); }
    g.fillStyle = rgba(lo, 0.6); g.fillRect(0, hem - 3, 128, 3);
  } else if (D.skirt) { /* dưới váy: da hoặc tất */ }
  // tất
  const sh = D.shoes;
  if (D.socksThigh) { g.fillStyle = D.socksThigh; g.fillRect(0, LY(0.6), 128, 256); g.fillStyle = lum(D.socksThigh) > 0.5 ? '#17171c' : '#f4f2ed'; g.fillRect(0, LY(0.6), 128, 3); g.fillRect(0, LY(0.585), 128, 3); }
  else if (D.socksHigh) { g.fillStyle = '#f4f2ed'; g.fillRect(0, LY(0.34), 128, 256); g.fillStyle = '#c8102e'; g.fillRect(0, LY(0.32), 128, 4); g.fillStyle = '#1f2a4a'; g.fillRect(0, LY(0.3), 128, 4); }
  else if (sh.kind === 'sneaker' && (!b || b.kind === 'shorts' || D.skirt || b.crop)) { g.fillStyle = '#f4f2ed'; g.fillRect(0, LY(0.15), 128, 256); }
  if (sh.kind === 'boots') { fabric(g, 0, LY(0.3), 128, 256, sh.color, null, 'leather', R); g.fillStyle = shade(sh.color, 0.6); g.fillRect(0, LY(0.3), 128, 4); }
}
function paintArms(g, D, C, R) {
  const t = D.top, L = D.layer && D.layer.sleeves ? D.layer : null, skin = C.skin;
  g.fillStyle = skin; g.fillRect(0, 0, 96, 256);
  let gr = g.createLinearGradient(0, 0, 96, 0); gr.addColorStop(0, rgba(shade(skin, 0.6), 0.4)); gr.addColorStop(0.5, rgba(shade(skin, 1.25), 0.25)); gr.addColorStop(1, rgba(shade(skin, 0.6), 0.4)); g.fillStyle = gr; g.fillRect(0, 0, 96, 256);
  const src = L || t, sl = L ? 'long' : t.sleeve;
  const end = sl === 'long' ? AY(0.885) : sl === 'short' ? AY(t.kind === 'crop' || t.kind === 'dress' ? 1.27 : 1.2) : 0;
  if (t.neck === 'vcap' && !L) { fabric(g, 0, 0, 96, AY(1.3), t.color, t.pat, t.fab, R, 0.8); }
  if (end > 0) {
    fabric(g, 0, 0, 96, end, src.color, src.pat === 'stripe' && src !== L && /shirt|blouse/.test(t.kind) ? 'vstripe' : src.pat, src.fab, R, 0.8);
    gr = g.createLinearGradient(0, 0, 96, 0); for (const [p, a] of [[0, 0.2], [0.3, 0], [0.5, -0.08], [0.7, 0], [1, 0.2]]) gr.addColorStop(p, a >= 0 ? `rgba(0,0,10,${a})` : `rgba(255,255,255,${-a})`);
    g.fillStyle = gr; g.fillRect(0, 0, 96, end);
    g.strokeStyle = 'rgba(0,0,10,0.13)'; g.lineWidth = 2; for (const y of [1.12, 1.09, 1.06]) if (AY(y) < end) { g.beginPath(); g.moveTo(20, AY(y)); g.quadraticCurveTo(48, AY(y) + 5, 76, AY(y)); g.stroke(); }
    const lo = shade(src.color, 0.6);
    if (sl === 'long') {
      if (L && /bomber|sport/.test(L.kind)) { g.fillStyle = shade(L.color, lum(L.color) < 0.25 ? 1.6 : 0.6); g.fillRect(0, end - 13, 96, 13); }
      else if (L && /suit|blazer|coat/.test(L.kind)) { g.fillStyle = t.color; g.fillRect(0, end - 5, 96, 5); g.fillStyle = lum(L.color) < 0.3 ? '#5a5d66' : '#17171c'; for (const k of [0, 1, 2]) { g.beginPath(); g.arc(22, end - 14 - k * 7, 2, 0, TAU); g.fill(); } }
      else if (src.cuff) { g.fillStyle = rgba(lo, 0.6); g.fillRect(0, end - 11, 96, 11); }
      if (L && L.kind === 'sport') { g.fillStyle = '#f4f2ed'; g.fillRect(20, 0, 5, end - 13); g.fillRect(28, 0, 2.5, end - 13); }
    } else { g.fillStyle = rgba(lo, 0.6); g.fillRect(0, end - 4, 96, 4); }
  }
  if (C.watch && sl !== 'long') { g.fillStyle = C.watch; g.fillRect(0, AY(0.9), 96, 7); g.fillStyle = '#17171c'; g.fillRect(40, AY(0.9) - 2, 16, 11); }
  if (C.bangle && sl !== 'long') { g.fillStyle = '#e8c55a'; g.fillRect(0, AY(0.905), 96, 3); g.fillRect(0, AY(0.89), 96, 3); }
}
function paintSkirt(g, D, R) {
  const s = D.skirt, ao = D.aodai;
  if (ao) { fabric(g, 0, 0, 288, 128, D.top.color, D.top.pat, D.top.fab, R, 1.1); g.fillStyle = rgba(shade(D.top.color, 0.6), 0.6); g.fillRect(0, 124, 288, 4); g.fillRect(0, 0, 3, 128); g.fillRect(141, 0, 6, 128); g.fillRect(285, 0, 3, 128); return; }
  if (D.layer && D.layer.kind === 'coat' && !s) { fabric(g, 0, 0, 288, 128, D.layer.color, D.layer.pat, D.layer.fab, R); return; }
  if (!s) return;
  fabric(g, 0, 0, 288, 128, s.color, s.pat, s.fab, R, 1.1);
  const lo = shade(s.color, 0.6), hi = shade(s.color, 1.25);
  if (s.kind === 'pleated' || s.kind === 'skater' || s.kind === 'ball' || s.kind === 'aline') {
    const n = s.kind === 'pleated' ? 24 : 12;
    for (let i = 0; i < n; i++) { const x = (i + 0.5) / n * 288; const gr = g.createLinearGradient(x - 6, 0, x + 6, 0); gr.addColorStop(0, rgba(lo, 0)); gr.addColorStop(0.5, rgba(lo, s.kind === 'pleated' ? 0.5 : 0.28)); gr.addColorStop(1, rgba(hi, 0.12)); g.fillStyle = gr; g.fillRect(x - 6, 0, 12, 128); }
  }
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(0,0,10,0.1)'); gr.addColorStop(0.3, 'rgba(0,0,10,0)'); gr.addColorStop(1, 'rgba(0,0,10,0.2)'); g.fillStyle = gr; g.fillRect(0, 0, 288, 128);
  g.fillStyle = rgba(lo, 0.7); g.fillRect(0, 0, 288, 5); g.fillRect(0, 124, 288, 4);
  if (s.fab === 'denim') { g.strokeStyle = '#e8b25a'; g.lineWidth = 1.4; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(0, 119); g.lineTo(288, 119); g.moveTo(144, 6); g.lineTo(144, 128); g.stroke(); g.setLineDash([]); g.fillStyle = '#d9b44a'; g.beginPath(); g.arc(144, 9, 2.6, 0, TAU); g.fill(); }
  if (s.kind === 'pencil') { g.strokeStyle = rgba(lo, 0.8); g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 60); g.lineTo(0, 128); g.stroke(); }
}
function paintHair(g, C, R) {
  const c = C.hairCol;
  g.fillStyle = c; g.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 90; i++) { g.strokeStyle = R() < 0.5 ? rgba(shade(c, 1.5), 0.24) : rgba(shade(c, 0.5), 0.34); g.lineWidth = 0.8 + R() * 1.4; const x = R() * 64; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (R() - 0.5) * 6, 40, x + (R() - 0.5) * 6, 90, x + (R() - 0.5) * 8, 128); g.stroke(); }
  const gr = g.createLinearGradient(0, 14, 0, 62); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${lum(c) < 0.2 ? 0.26 : 0.34})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 14, 64, 48);
  const g2 = g.createLinearGradient(0, 80, 0, 128); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,0.3)'); g.fillStyle = g2; g.fillRect(0, 80, 64, 48);
  if (C.hairTip) { const g3 = g.createLinearGradient(0, 70, 0, 128); g3.addColorStop(0, rgba(C.hairTip, 0)); g3.addColorStop(1, rgba(C.hairTip, 0.95)); g.fillStyle = g3; g.fillRect(0, 70, 64, 58); }
}

// ---------- bộ dựng lưới ----------
class Mesh {
  constructor(bi) { this.bi = bi; this.warp = null; this.p = []; this.n = []; this.uv = []; this.si = []; this.sw = []; this.ix = []; this.c = 0; }
  _w(w) {
    const l = w.filter(x => x[1] > 1e-3).sort((a, b) => b[1] - a[1]).slice(0, 4); let s = 0; for (const x of l) s += x[1];
    for (let k = 0; k < 4; k++) { this.si.push(l[k] ? this.bi[l[k][0]] : 0); this.sw.push(l[k] ? l[k][1] / s : 0); }
  }
  _uv(m, u, v) {
    if (m.px) { this.uv.push(m.px[0] / TW, 1 - m.px[1] / TH); return; }
    const r = m.reg; this.uv.push((r[0] + 1.5 + Math.min(1, Math.max(0, u)) * (r[2] - 3)) / TW, 1 - (r[1] + 1.5 + Math.min(1, Math.max(0, v)) * (r[3] - 3)) / TH);
  }
  // nối các vòng điểm thành mặt cong; rings[i] = { P: [[x,y,z]], U: [u], v, w }
  loft(rings, map) {
    const n = rings[0].P.length, base = this.c, P = [], idx = [];
    for (const r of rings) for (let i = 0; i < n; i++) {
      const p0 = r.P[i], p = this.warp ? this.warp(p0) : p0; P.push(p);
      this.p.push(p[0], p[1], p[2]); this._uv(map, r.U ? r.U[i] : i / (n - 1), r.V ? r.V[i] : r.v || 0);
      this._w(typeof r.w === 'function' ? r.w(p0, i) : r.w);
    }
    for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < n - 1; i++) { const a = r * n + i, b = a + 1, c = a + n, d = c + 1; idx.push(a, b, c, b, d, c); }
    // pháp tuyến mượt, hàn theo vị trí (khép mép nối)
    const acc = new Map(), key = p => Math.round(p[0] * 2e3) + '_' + Math.round(p[1] * 2e3) + '_' + Math.round(p[2] * 2e3);
    for (let i = 0; i < idx.length; i += 3) {
      const A = P[idx[i]], B = P[idx[i + 1]], C = P[idx[i + 2]];
      const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const q of [A, B, C]) { const k = key(q); let a = acc.get(k); if (!a) acc.set(k, a = [0, 0, 0]); a[0] += nx; a[1] += ny; a[2] += nz; }
    }
    for (const p of P) { const a = acc.get(key(p)) || [0, 1, 0]; const l = Math.hypot(a[0], a[1], a[2]) || 1; this.n.push(a[0] / l, a[1] / l, a[2] / l); }
    for (const i of idx) this.ix.push(base + i);
    this.c += P.length;
  }
  // ống đứng: rows = [{ c:[x,y,z], rx, rz, rzF, v, w, a0, a1, bump, flipU }]
  tube(rows, map, seg = 14) {
    this.loft(rows.map(r => {
      const a0 = r.a0 === undefined ? -PI : r.a0, a1 = r.a1 === undefined ? PI : r.a1, P = [], U = [];
      for (let k = 0; k <= seg; k++) {
        const u = k / seg, th = a0 + (a1 - a0) * u, b = r.bump ? 1 + r.bump(th) : 1, cs = Math.cos(th);
        P.push([r.c[0] + r.rx * Math.sin(th) * b, r.c[1], r.c[2] + (cs > 0 && r.rzF !== undefined ? r.rzF : r.rz) * cs * b]); U.push(r.flipU ? 1 - u : u);
      }
      return { P, U, v: r.v, w: r.w };
    }), map);
  }
  // hình khối có sẵn của three (cầu, hộp, vòng…) gắn cứng vào xương
  add(geo, w, map, m4) {
    if (m4) geo.applyMatrix4(m4);
    const g = geo.index ? geo : geo, pos = g.attributes.position, nor = g.attributes.normal, base = this.c;
    for (let i = 0; i < pos.count; i++) { const q = this.warp ? this.warp([pos.getX(i), pos.getY(i), pos.getZ(i)]) : [pos.getX(i), pos.getY(i), pos.getZ(i)]; this.p.push(q[0], q[1], q[2]); this.n.push(nor.getX(i), nor.getY(i), nor.getZ(i)); this._uv(map, 0.5, 0.5); this._w(w); }
    if (g.index) for (let i = 0; i < g.index.count; i++) this.ix.push(base + g.index.getX(i)); else for (let i = 0; i < pos.count; i++) this.ix.push(base + i);
    this.c += pos.count; geo.dispose();
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.ix); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}
const T4 = (x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const SWM = n => ({ px: swPx(n) });

// ---------- thân hình ----------
const TORSO_M = [[0.795, 0.02, 0.02], [0.815, 0.1, 0.085], [0.85, 0.142, 0.104], [0.89, 0.152, 0.108], [0.94, 0.15, 0.105], [0.985, 0.145, 0.101], [1.03, 0.139, 0.098], [1.1, 0.144, 0.1], [1.18, 0.158, 0.108], [1.26, 0.172, 0.116], [1.32, 0.176, 0.108], [1.365, 0.166, 0.092], [1.4, 0.098, 0.07], [1.43, 0.06, 0.058]];
const TORSO_F = [[0.795, 0.02, 0.02], [0.815, 0.1, 0.088], [0.85, 0.15, 0.108], [0.89, 0.162, 0.113], [0.94, 0.155, 0.108], [0.985, 0.132, 0.097], [1.03, 0.116, 0.089], [1.09, 0.112, 0.086], [1.17, 0.128, 0.094, 0.012], [1.215, 0.137, 0.1, 0.03], [1.255, 0.142, 0.103, 0.036], [1.295, 0.146, 0.1, 0.018], [1.33, 0.148, 0.094], [1.365, 0.138, 0.084], [1.4, 0.086, 0.064], [1.43, 0.053, 0.052]];
function wTorso(y) {
  if (y <= 0.93) return [['Hips', 1]];
  if (y < 1.08) { const t = sm(0.93, 1.08, y); return [['Hips', 1 - t], ['Spine', t]]; }
  if (y < 1.16) return [['Spine', 1]];
  if (y < 1.36) { const t = sm(1.16, 1.36, y); return [['Spine', 1 - t], ['Spine2', t]]; }
  return [['Spine2', 1]];
}
function torsoR(rows, y) {   // bán kính thân tại độ cao y (nội suy)
  for (let i = 0; i < rows.length - 1; i++) if (y <= rows[i + 1][0]) { const a = rows[i], b = rows[i + 1], t = Math.max(0, (y - a[0]) / (b[0] - a[0])); return [lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3] || 0, b[3] || 0, t)]; }
  const l = rows[rows.length - 1]; return [l[1], l[2], l[3] || 0];
}

// ---------- đầu + tóc ----------
// đầu tỉ lệ người thật; mũi, hốc mắt, cung mày, gò má, môi, cằm được nặn khối trên lưới
const gs = (x, m, s) => Math.exp(-Math.pow((x - m) / s, 2));
function headPt(H, th, s, k = 1) {
  const r = Math.sqrt(Math.max(0, 1 - s * s)), cs = Math.cos(th), sn = Math.sin(th), a = Math.abs(th);
  const tp = s < 0 ? 1 - H.jaw * Math.pow(-s, 2.1) : 1;
  let x = H.rx * r * tp * sn, z = (cs > 0 ? H.rzF : H.rz) * r * (s < 0 ? 1 - H.jaw * 0.25 * Math.pow(-s, 2.1) : 1) * cs;
  if (k === 1 && cs > 0) {   // nặn khối mặt (chỉ lớp da, tóc/mũ không theo)
    let d = 0;
    d += H.brow * gs(s, 0.21, 0.07) * gs(a, 0.34, 0.3);
    d -= 0.014 * gs(s, 0.045, 0.075) * gs(a, 0.35, 0.17);
    const np = sm(0.22, -0.26, s);
    if (s > -0.36 && s < 0.26) d += (0.0076 + H.nose * np) * gs(a, 0, 0.07 + 0.05 * np) * (s < -0.28 ? sm(-0.36, -0.28, s) : 1);
    d += 0.013 * gs(s, -0.275, 0.045) * gs(a, 0.125, 0.055);
    d += H.lipV * gs(s, -0.47, 0.05) * gs(a, 0, 0.24) + H.lipV * 0.85 * gs(s, -0.57, 0.045) * gs(a, 0, 0.2) - 0.006 * gs(s, -0.52, 0.014) * gs(a, 0, 0.22);
    d -= 0.006 * gs(s, -0.66, 0.04) * gs(a, 0, 0.2);
    d += H.chinV * gs(s, -0.82, 0.11) * gs(a, 0, 0.26);
    d += H.cheek * gs(s, -0.04, 0.15) * gs(a, 0.8, 0.3);
    x += d * sn; z += d * cs;
  }
  return [x * k, H.cy + s * H.ry * k, H.cz + z * k];
}
const faceU = th => (Math.max(-TM, Math.min(TM, th)) + TM) / (2 * TM);

function buildHair(M, H, C, D, R) {
  const hm = { reg: REG.hair }, W = [['Head', 1]];
  const st = C.hair, hat = D.hat;
  const A = th => Math.abs(th);
  // đường chân tóc: s thấp nhất được phủ tóc tại góc th
  const line = (front, side, back, bang = 0) => th => {
    const a = A(th);
    const f = front - bang * Math.max(0, Math.cos(th * 1.25)) + 0.05 * Math.cos(th * 3.2);
    if (a < 1.0) return f;
    if (a < 1.45) return lerp(f, side, sm(1.0, 1.45, a));
    if (a < 2.05) return lerp(side, back, sm(1.5, 2.05, a));
    return back;
  };
  const shell = (hl, thick, opt = {}) => {
    const NR = opt.rows || 8, seg = 24, rings = [];
    for (let j = 0; j <= NR; j++) {
      const t = j / NR, P = [], U = [];
      for (let k = 0; k <= seg; k++) {
        const th = -PI + TAU * k / seg, s = 1 - t * (1 - hl(th));
        const tk = Math.max(0.005, thick(th, t) * (under ? 0.45 : 1.5)) * (0.35 + 0.65 * Math.sin(Math.min(1, t * 1.4 + 0.12) * PI * 0.5) * (t > 0.86 ? lerp(1, 0.45, (t - 0.86) / 0.14) : 1));
        P.push(headPt(H, th, s, 1 + tk / H.rx)); U.push(k / seg);
      }
      rings.push({ P, U, v: t * (opt.v1 || 0.6), w: W });
    }
    M.loft(rings, opt.map || hm);
  };
  // suối tóc rủ phía sau: từ ngang tai xuống tới y1
  const curtain = (y1, wide, opt = {}) => {
    const a = opt.a || 1.35, rows = [], y0 = H.cy - 0.02;
    const N = 6;
    for (let j = 0; j <= N; j++) {
      const t = j / N, y = lerp(y0, y1, t);
      const hr = y > H.cy - H.ry * 0.75 ? H.rx * Math.sqrt(Math.max(0.2, 1 - Math.pow((y - H.cy) / H.ry, 2))) * 1.1 : 0;
      const rx = Math.max(hr, lerp(H.rx * 0.98, wide, sm(0.25, 0.85, t))) * (opt.curl && t > 0.8 ? 0.9 : 1) * (j === N ? 0.82 : 1);
      const wv = opt.wave ? 1 + opt.wave * Math.sin(t * 9 + 1) : 1;
      rows.push({ c: [0, y, H.cz - 0.022 * t], rx: rx * wv, rz: Math.max(hr * 1.02, lerp(H.rz * 1.04, wide * 0.72, sm(0.25, 0.85, t))) * wv, a0: a, a1: TAU - a, v: 0.25 + 0.75 * t, w: t < 0.3 ? W : [['Head', 1 - sm(0.3, 0.9, t) * 0.85], ['Hair', sm(0.3, 0.9, t) * 0.85]] });
    }
    M.tube(rows, hm, 14);
  };
  const tail = (pts, rs, bone = 'Hair') => {   // đuôi tóc: ống theo đường cong
    const rows = pts.map((p, i) => ({ c: p, rx: rs[i], rz: rs[i], v: 0.3 + 0.7 * i / (pts.length - 1), w: i === 0 ? W : [['Head', Math.max(0, 1 - i / (pts.length - 1) * 1.3)], [bone, Math.min(1, i / (pts.length - 1) * 1.3)]] }));
    M.tube(rows, hm, 9);
  };
  const ball = (x, y, z, r, sy = 1) => M.add(new THREE.SphereGeometry(r, 12, 9), W, { px: [REG.hair[0] + 32, REG.hair[1] + 40] }, T4(x, y, z, 1, sy, 1));
  const top = H.cy + H.ry, back = -H.rz;
  const bumpy = (th, t) => 0.012 * Math.sin(th * 9 + t * 7) * Math.sin(t * 11 + th * 3);
  const under = hat && hat !== 'khandong';
  const fuzz = () => shell(line(0.55, 0.0, -0.55), () => 0.005, { rows: 5, map: SWM('hairD') });
  switch (under ? (C.female ? (/long|wavy|pony|twin|half/.test(st) ? st : 'bob') : 'crop') : st) {
    case 'long': shell(line(0.5, -0.25, -0.3, 0.22), (th, t) => 0.026 + 0.012 * Math.cos(th)); curtain(H.NB - 0.16, H.rx * 0.98); break;
    case 'wavy': shell(line(0.52, -0.25, -0.3, 0.12), (th, t) => 0.03 + bumpy(th, t)); curtain(H.NB - 0.14, H.rx * 1.08, { wave: 0.07 }); break;
    case 'bob': shell(line(0.46, -0.3, -0.3, 0.26), (th, t) => 0.03); curtain(H.cy - H.ry * 0.95, H.rx * 0.95, { curl: true, a: 1.2 }); break;
    case 'half': shell(line(0.52, -0.25, -0.3, 0.1), () => 0.026); curtain(H.NB - 0.12, H.rx * 0.98); ball(0, top - 0.02, back * 0.5, 0.075); break;
    case 'pony': shell(line(0.56, -0.12, -0.62, 0.08), (th, t) => 0.02 + 0.008 * Math.cos(th)); tail([[0, top - 0.06, back * 0.82], [0, top - 0.05, back - 0.09], [0, H.cy - 0.03, back - 0.13], [0, H.NB + 0.02, back - 0.1], [0, H.NB - 0.12, back - 0.07]], [0.04, 0.058, 0.056, 0.044, 0.01]); M.add(new THREE.TorusGeometry(0.042, 0.014, 6, 12), W, SWM('acc'), T4(0, top - 0.055, back * 0.92, 1, 1, 1, 0.9, 0, 0)); break;
    case 'twin': shell(line(0.5, -0.15, -0.6, 0.22), () => 0.022); for (const sd of [-1, 1]) { tail([[sd * H.rx * 0.86, H.cy + 0.07, -0.03], [sd * (H.rx + 0.07), H.cy + 0.05, -0.035], [sd * (H.rx + 0.085), H.NB + 0.1, -0.03], [sd * (H.rx + 0.07), H.NB - 0.07, -0.02]], [0.034, 0.052, 0.048, 0.009]); M.add(new THREE.SphereGeometry(0.03, 8, 6), W, SWM('acc'), T4(sd * (H.rx + 0.015), H.cy + 0.065, -0.03)); } break;
    case 'bun': shell(line(0.56, -0.12, -0.62, 0.06), () => 0.02); ball(0, top + 0.02, back * 0.4, 0.085, 0.9); break;
    case 'lowbun': shell(line(0.56, -0.15, -0.66, 0.04), (th, t) => 0.024); ball(0, H.cy - 0.1, back - 0.03, 0.08, 0.85); break;
    case 'pixie': shell(line(0.42, -0.02, -0.56, 0.24), (th, t) => 0.024 + 0.01 * Math.cos(th)); break;
    case 'perm': shell(line(0.5, -0.2, -0.55, 0.1), (th, t) => 0.042 + bumpy(th, t) * 1.6, { rows: 10 }); break;
    case 'side': shell(line(0.56, 0.06, -0.56), (th, t) => 0.024 + 0.022 * Math.max(0, Math.cos(th - 0.5)) * Math.sin(t * PI)); break;
    case 'under': fuzz(); shell(line(0.56, 0.4, 0.05), (th, t) => 0.04 + 0.014 * Math.cos(th), { v1: 0.45 }); break;
    case 'spiky': shell(line(0.56, 0.05, -0.56), () => 0.02); for (let i = 0; i < 11; i++) { const a = i / 11 * TAU, r = 0.3 + 0.35 * (i % 2); const p = headPt(H, a, Math.cos(r * 1.6), 1.02); M.add(new THREE.ConeGeometry(0.042, 0.115, 6), W, { px: [REG.hair[0] + 20 + i * 2, REG.hair[1] + 34] }, T4(p[0], p[1] + 0.04, p[2], 1, 1, 1, Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5)); } break;
    case 'slick': shell(line(0.64, 0.08, -0.6), (th, t) => 0.02 + 0.014 * Math.sin(t * PI) * Math.max(0, Math.cos(th))); break;
    case 'buzz': shell(line(0.58, 0.02, -0.56), () => 0.006, { map: SWM('hairD') }); break;
    case 'bowl': shell(line(0.3, -0.06, -0.42, 0.14), (th, t) => 0.032, { v1: 0.75 }); break;
    case 'curly': shell(line(0.56, 0.08, -0.5), (th, t) => 0.04 + bumpy(th, t) * 1.5, { rows: 10 }); break;
    case 'manbun': shell(line(0.62, 0.02, -0.6), () => 0.018); ball(0, top - 0.02, back * 0.7, 0.06); break;
    case 'thin': fuzz(); shell(line(0.8, 0.1, -0.56), () => 0.012); break;
    default: shell(line(0.56, 0.04, -0.56, 0.05), (th, t) => 0.02 + 0.008 * Math.cos(th)); break;   // crop
  }
  // ---- mũ ----
  if (!hat) return;
  const hw = W, hc = SWM('hat'), h2 = SWM('hat2');
  const dome = (s0, k, sy = 1) => {
    const rings = [];
    for (let j = 0; j <= 7; j++) { const s = lerp(1, s0, j / 7), P = []; for (let q = 0; q <= 22; q++) { const p = headPt(H, -PI + TAU * q / 22, s, k); P.push([p[0], H.cy + (p[1] - H.cy) * sy, p[2]]); } rings.push({ P, w: hw }); }
    M.loft(rings, hc); return headPt(H, 0, s0, k);
  };
  if (hat === 'cap' || hat === 'capBack') {
    const e = dome(0.34, 1.13, 1.04), y = e[1], ry = hat === 'cap' ? 0 : PI;
    const brim = new THREE.CylinderGeometry(H.rx * 1.02, H.rx * 1.02, 0.014, 18, 1, false, -PI / 2, PI).rotateY(PI / 2).scale(1, 1, 1.25);
    M.add(brim, hw, h2, T4(0, y + 0.004, hat === 'cap' ? H.rzF * 0.88 : -H.rz * 0.88, 1, 1, 1, hat === 'cap' ? 0.12 : -0.12, ry + (hat === 'cap' ? 0 : 0), 0));
    M.add(new THREE.SphereGeometry(0.02, 8, 6), hw, h2, T4(0, H.cy + H.ry * 1.17, 0));
  } else if (hat === 'beanie') {
    dome(0.2, 1.15, 1.12);
    const rows = []; for (const [s, k] of [[0.34, 1.19], [0.2, 1.2], [0.16, 1.16]]) { const p = headPt(H, PI / 2, s, k), q = headPt(H, 0, s, k), b = headPt(H, PI, s, k); rows.push({ c: [0, p[1], (q[2] + b[2]) / 2], rx: p[0], rz: (q[2] - b[2]) / 2, w: hw }); }
    M.tube(rows, h2, 22); M.add(new THREE.SphereGeometry(0.05, 10, 8), hw, h2, T4(0, H.cy + H.ry * 1.3, 0));
  } else if (hat === 'bucket') {
    dome(0.36, 1.12, 1.0);
    const p = headPt(H, PI / 2, 0.36, 1.12), y = p[1];
    M.tube([{ c: [0, y + 0.008, 0], rx: p[0], rz: H.rz * 1.1, w: hw }, { c: [0, y - 0.1, 0], rx: p[0] + 0.11, rz: H.rz * 1.1 + 0.11, w: hw }], hc, 22);
  } else if (hat === 'fedora') {
    const p = headPt(H, PI / 2, 0.36, 1.1), y = p[1], rx = p[0], rz = H.rz * 1.08;
    M.tube([{ c: [0, y, 0], rx, rz, w: hw }, { c: [0, y + 0.16, 0], rx: rx * 0.94, rz: rz * 0.94, w: hw }, { c: [0, y + 0.185, 0], rx: rx * 0.8, rz: rz * 0.8, w: hw }, { c: [0, y + 0.16, 0], rx: 0.001, rz: 0.001, w: hw }], hc, 22);
    M.tube([{ c: [0, y + 0.002, 0], rx: rx * 1.005, rz: rz * 1.005, w: hw }, { c: [0, y + 0.05, 0], rx: rx * 0.995, rz: rz * 0.995, w: hw }], h2, 22);
    M.tube([{ c: [0, y + 0.004, 0], rx: rx * 0.98, rz: rz * 0.98, w: hw }, { c: [0, y - 0.006, 0], rx: rx + 0.11, rz: rz + 0.11, w: hw }, { c: [0, y + 0.006, 0], rx: rx + 0.116, rz: rz + 0.116, w: hw }], hc, 22);
  } else if (hat === 'khandong') {   // khăn đóng: vành khăn xếp nếp ôm đầu
    for (let i = 0; i < 4; i++) {
      const s = 0.2 + i * 0.13, k = 1.2 - i * 0.02, p = headPt(H, PI / 2, s, k), q = headPt(H, 0, s, k), b = headPt(H, PI, s, k), cz = (q[2] + b[2]) / 2 - 0.006 * i, rz = (q[2] - b[2]) / 2;
      M.tube([{ c: [0, p[1] - 0.026, cz], rx: p[0] * 0.95, rz: rz * 0.95, w: hw }, { c: [0, p[1], cz], rx: p[0] * 1.03, rz: rz * 1.03, w: hw }, { c: [0, p[1] + 0.045, cz], rx: p[0] * 0.97, rz: rz * 0.97, w: hw }], i % 2 ? h2 : hc, 22);
    }
  }
}

// ---------- chọn ngoại hình theo hạt giống ----------
const SKINS = ['#f8dcc8', '#f5d2b8', '#f1c8a8', '#ebbd9b', '#e2b08a', '#d6a078', '#c48e68'];
function pickLook(ch, D, R) {
  const pick = a => a[Math.floor(R() * a.length)];
  const female = !!ch.female, age = Number(ch.age) || 25, per = norm(ch.personality);
  const skin = SKINS[Math.min(SKINS.length - 1, Math.floor(R() * R() * (female ? 5.2 : 7)))];
  let hairCol = pick(['#17131a', '#1d1512', '#241a14', '#17131a', '#2c1d14']);
  if (age < 30 && R() < 0.4) hairCol = female ? pick(['#6b4326', '#8a5a2b', '#b98a4e', '#d9c08a', '#8f1f3a', '#c2577a', '#b0522a', '#9a7ad6']) : pick(['#4a3020', '#6b4326', '#8a6a3a', '#7a7a86', '#3a3a44']);
  else if (age >= 55) hairCol = pick(['#8a8a90', '#a8a8ae', '#5a5a60', '#c8c8cc']);
  else if (age >= 45 && R() < 0.5) hairCol = pick(['#4a4a50', '#3a3436', '#5a5a60']);
  const hair = female
    ? (age >= 45 ? pick(['lowbun', 'perm', 'bob', 'lowbun', 'bun']) : age >= 30 ? pick(['long', 'wavy', 'bob', 'lowbun', 'half', 'pony']) : pick(['long', 'wavy', 'bob', 'pony', 'twin', 'bun', 'pixie', 'half', 'pony', 'long']))
    : (age >= 50 ? pick(['thin', 'crop', 'side', 'slick', 'thin']) : age >= 32 ? pick(['side', 'slick', 'crop', 'side', 'buzz']) : pick(['under', 'spiky', 'side', 'crop', 'curly', 'slick', 'under', 'side', 'crop']));
  const calm = /lich lam|diem tinh|tram tu|dinh dac|tinh te|lanh lung|chuyen nghiep/.test(per), happy = /vui|nang dong|soi noi|tinh nghich|tuoi sang|ngot ngao|am ap/.test(per), cool = /ca tinh|tu tin|loi cuon|phong cach|dam me/.test(per);
  const face = {
    eyeW: 0.92 + R() * 0.16, eyeH: (female ? 1.08 : 0.92) * (0.9 + R() * 0.22) * (age > 44 ? 0.9 : 1), tilt: (R() - 0.3) * (female ? 1 : 0.6), look: (R() - 0.5) * 1.2,
    iris: pick(['#3a2416', '#2b1a10', '#4a2f1a', '#3a2416', '#55381f', age < 28 && R() < 0.2 ? pick(['#6b7a8a', '#3d6a8f', '#5a7a4a']) : '#2b1a10']),
    browH: R(), browArch: calm ? 0.4 : 0.6 + R() * 0.8, browIn: cool ? 0.75 : calm ? 0.35 : happy ? -0.2 : R() * 0.4,
    mouth: happy ? pick(['grin', 'grin', 'smile']) : cool ? pick(['smirk', 'smile', 'smirk']) : calm ? pick(['soft', 'neutral', 'soft']) : pick(['smile', 'soft', 'grin']),
    mouthW: 0.86 + R() * 0.3, mono: R() < 0.3, beard: female ? null : (age > 23 && R() < (age > 40 ? 0.5 : 0.3) ? pick(['stubble', 'stubble', 'mustache', 'goatee', 'full']) : null),
    shadow: female && R() < 0.6 ? pick(['#b0522a', '#7c3dff', '#c2577a', '#3a3d44', '#8a5a2b']) : null,
    mole: R() < 0.14 ? (R() < 0.5 ? -1 : 1) : 0, freckles: age < 30 && R() < 0.12,
  };
  const lip = female ? pick(['#d2374f', '#c8254a', '#e0607a', '#b8324a', '#d9567a', '#a8283c', '#e27a6a']) : shade(skin, 0.62);
  return {
    female, age, skin, hairCol, hair, face, lip, browCol: lum(hairCol) > 0.45 ? shade(hairCol, 0.5) : '#1a1214',
    hairTip: female && age < 28 && R() < 0.14 ? pick(['#ff6fa3', '#7cf7ff', '#c8ff3d', '#ffd84d', '#b9a3e8']) : null,
    glasses: R() < (age > 44 ? 0.3 : 0.16) ? 'clear' : (age < 34 && R() < 0.1 ? 'sun' : null),
    earrings: female && R() < 0.62 ? pick(['stud', 'hoop', 'drop']) : null,
    necklace: female ? (R() < 0.5 ? pick(['#e8c55a', '#f4f2ed', '#d9dce3']) : null) : (age < 30 && R() < 0.3 ? '#e8c55a' : null),
    watch: R() < 0.4 ? pick(['#e8c55a', '#c9ccd4', '#17171c']) : null, bangle: female && R() < 0.3,
    nail: female && R() < 0.5,
  };
}

// ---------- dựng một nhân vật ----------
// ch: { id, name, female, age, outfit, personality }, extra: { headphones, glasses, hair, hat ... } cho DJ / nhân viên
// tủ đồ modern (đường phố / đi bar): mọi khách đều trẻ, mặc theo một bộ trong danh sách này
const MODERN_F = [
  'Áo crop top trắng, chân váy xếp ly đen, tất đùi đen, giày sneaker trắng, vòng cổ',
  'Áo crop top đen, quần cargo xanh rêu, giày sneaker trắng',
  'Áo hai dây đen, chân váy ngắn da đen, giày boots, vòng cổ',
  'Áo bomber đen, áo crop top trắng, chân váy xếp ly xám, tất đùi trắng, giày sneaker trắng',
  'Áo hoodie hồng pastel oversize, quần short denim, tất cao, giày sneaker trắng',
  'Áo crop top đỏ, quần jeans ống rộng, giày sneaker trắng',
  'Đầm ngắn satin đen, giày cao gót, vòng cổ',
  'Áo tank top trắng, quần jogger xám, giày sneaker trắng',
  'Áo sơ mi trắng, chân váy xếp ly xanh navy, cà vạt đỏ, tất đùi đen, giày sneaker trắng',
  'Áo khoác denim, áo crop top đen, chân váy ngắn đen, giày boots',
  'Áo crop top tím, quần legging đen, giày sneaker trắng',
  'Đầm ngắn kim sa bạc cổ yếm, giày cao gót',
  'Áo thun graphic trắng oversize, quần short đen, tất đùi đen, giày sneaker trắng',
  'Áo blazer đen, áo crop top trắng, quần tây đen, giày cao gót',
  'Áo crop top hồng, chân váy xếp ly trắng, tất đùi trắng, giày sneaker trắng',
  'Áo bomber xanh navy, áo crop top trắng, quần jeans ống rộng, giày sneaker trắng',
];
const MODERN_M = [
  'Áo bomber đen, áo thun trắng, quần ống rộng đen, giày sneaker trắng',
  'Áo hoodie đen oversize, quần cargo đen, giày sneaker trắng',
  'Áo thun graphic trắng oversize, quần jeans ống rộng, giày sneaker trắng',
  'Áo sơ mi kẻ caro, quần jeans, giày sneaker trắng',
  'Áo khoác denim, áo thun đen, quần kaki, giày sneaker trắng',
  'Áo jacket thể thao, quần jogger đen, giày sneaker neon',
  'Áo thun đen, quần jeans rách, giày boots',
  'Áo blazer đen, áo thun trắng, quần tây đen, giày sneaker trắng',
  'Áo hoodie xám, quần short đen, tất cao, giày sneaker trắng',
  'Áo tank top trắng, quần jogger đen, giày sneaker đỏ',
  'Áo bomber xanh navy, áo thun graphic trắng, quần jeans đen, giày sneaker trắng',
  'Áo polo đen, quần ống rộng be, giày sneaker trắng',
  'Áo bomber đỏ, áo thun đen, quần cargo đen, giày sneaker trắng',
  'Áo thun trắng oversize, quần ống rộng xám, giày sneaker đen',
];
export function buildCast(ch, extra = {}) {
  if (/^(char|rnd)/.test(String(ch.id))) {   // khách: trẻ, đồ modern (tên, giới tính, điệu nhảy vẫn theo danh sách)
    const R0 = rng(hash('modern|' + ch.id)), list = ch.female ? MODERN_F : MODERN_M;
    ch = Object.assign({}, ch, { outfit: list[Math.floor(R0() * list.length)], age: 18 + Math.floor(R0() * 11) });
  }
  const R = rng(hash(ch.id + '|' + ch.name + '|' + ch.outfit));
  const D = parseOutfit(ch, R);
  if (extra.hat !== undefined) D.hat = extra.hat;
  if (extra.hatColor) D.hatColor = extra.hatColor;
  const C = pickLook(ch, D, R);
  Object.assign(C, extra.look || {});
  if (extra.tie) D.tie = extra.tie;
  const female = C.female, sw = female ? 0.185 : 0.215, ak = female ? 0.86 : 1;   // sw khớp với khung điều khiển của game
  D.tights = !!D.skirt && !D.aodai && !D.bottom && (C.age > 26 ? R() < 0.45 : R() < 0.22) && D.shoes.kind !== 'sneaker' && D.shoes.kind !== 'sandal';

  // ----- ảnh chất liệu -----
  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
  const g = cv.getContext('2d');
  g.fillStyle = C.skin; g.fillRect(0, 0, TW, TH);
  const sh = D.shoes, low = D.skirt || D.bottom;
  const swc = { skin: C.skin, skin2: shade(C.skin, 0.86), lip: C.lip, white: '#f4f2ed', black: '#15151a', gold: '#e8c55a', metal: '#c9ccd4', shoe: sh.color, sole: sh.kind === 'sneaker' ? (lum(sh.color) > 0.6 ? '#e2ded4' : '#f4f2ed') : shade(sh.color, 0.5), sock: '#f4f2ed', hat: D.hatColor, hat2: shade(D.hatColor, lum(D.hatColor) < 0.3 ? 1.5 : 0.62), top: D.top.color, layer: D.layer ? D.layer.color : D.top.color, bottom: low.color, skirtc: D.skirt ? D.skirt.color : low.color, lens: '#101018', acc: R() < 0.5 ? '#ff6fa3' : '#f4f2ed', hairc: C.hairCol, hairD: shade(C.hairCol, lum(C.hairCol) > 0.4 ? 0.7 : 1.25), tie: D.tie || '#17171c' };
  SWN.forEach((n, i) => { g.fillStyle = swc[n]; g.fillRect(800 + (i % 7) * 32, 384 + Math.floor(i / 7) * 32, 32, 32); });
  inReg(g, REG.face, () => paintFace(g, C, R));
  inReg(g, REG.torso, () => paintTorso(g, D, C, R));
  inReg(g, REG.coat, () => paintCoat(g, D, R));
  inReg(g, REG.legs, () => paintLegs(g, D, C, R));
  inReg(g, REG.arms, () => paintArms(g, D, C, R));
  inReg(g, REG.skirt, () => paintSkirt(g, D, R));
  inReg(g, REG.hair, () => paintHair(g, C, R));
  inReg(g, LID, (w, h) => { g.fillStyle = C.face.shadow && female ? shade(C.face.shadow, 1.1) : shade(C.skin, 0.9); g.fillRect(0, 0, w, h); g.strokeStyle = '#1a1014'; g.lineWidth = 5; g.beginPath(); g.moveTo(2, h - 9); g.quadraticCurveTo(w / 2, h + 3, w - 2, h - 9); g.stroke(); });
  inReg(g, MOUTH, (w, h) => { g.fillStyle = C.skin; g.fillRect(0, 0, w, h); g.fillStyle = '#4a0f1a'; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.4, h * 0.42, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.fillRect(w * 0.22, h * 0.12, w * 0.56, h * 0.2); g.fillStyle = '#e0607a'; g.beginPath(); g.ellipse(w / 2, h * 0.78, w * 0.22, h * 0.16, 0, 0, TAU); g.fill(); g.strokeStyle = C.lip; g.lineWidth = 3; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.4, h * 0.42, 0, 0, TAU); g.stroke(); });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;

  // ----- xương -----
  const HJ = RIGP.hipY + RIGP.spine + RIGP.chest + RIGP.neck + RIGP.head, NB = HJ - RIGP.head;   // khớp đầu, chân cổ
  const hk = (female ? 0.97 : 1) * (0.97 + R() * 0.06);
  const H = { cy: HJ + 0.185, cz: 0.012, rx: 0.183 * hk, ry: 0.198 * hk, rz: 0.18 * hk, jaw: (female ? 0.3 : 0.17) + (R() - 0.5) * 0.1,
    brow: female ? 0.005 : 0.0105, nose: (female ? 0.031 : 0.039) * (0.85 + R() * 0.3), lipV: female ? 0.0105 : 0.0078, chinV: (female ? 0.007 : 0.013) * (0.6 + R() * 0.8), cheek: 0.006 + R() * 0.008, NB };
  H.rzF = H.rz * 0.96;
  const swN = female ? RIGP.swF : RIGP.swM, P = RIGP;
  const wBody = null;   // thân, tay, chân dựng thẳng theo tỉ lệ người thật
  // đầu, tóc, mũ, kính dựng trong "không gian đầu" rồi thu về cỡ đầu người thật (hẹp ngang, dài dọc)
  const HSX = (female ? 0.086 : 0.091) / 0.183, HSY = (female ? 0.127 : 0.132) / 0.198, HSZ = (female ? 0.102 : 0.107) / 0.18, HDY = 0.072 - 0.185 * HSY;
  const HW = p => [p[0] * HSX, HJ + (p[1] - HJ) * HSY + HDY, p[2] * HSZ];  const mouthP = headPt(H, 0, -0.52);
  const yS = P.hipY + P.spine, yC = yS + P.chest, ySh = yC + P.shY, yE = ySh - P.armU, yW = yE - P.armF, yHp = P.hipY + P.hipJ, yK = yHp - P.legU, yA = yK - P.legF;
  const JD = {
    Hips: [0, P.hipY, 0, null], Spine: [0, yS, 0, 'Hips'], Spine2: [0, yC, 0, 'Spine'], Neck: [0, NB, 0, 'Spine2'], Head: [0, HJ, 0, 'Neck'],
    HeadTop_End: [0, HW([0, H.cy + H.ry, 0])[1] + 0.02, 0, 'Head'], Lids: [0, HJ, 0, 'Head'], Jaw: HW(mouthP).concat('Head'), Hair: HW([0, H.cy - 0.03, -H.rz * 0.7]).concat('Head'),
    RightArm: [-swN, ySh, 0, 'Spine2'], RightForeArm: [-swN, yE, 0, 'RightArm'], RightHand: [-swN, yW, 0, 'RightForeArm'],
    LeftArm: [swN, ySh, 0, 'Spine2'], LeftForeArm: [swN, yE, 0, 'LeftArm'], LeftHand: [swN, yW, 0, 'LeftForeArm'],
    RightUpLeg: [-P.hipX, yHp, 0, 'Hips'], RightLeg: [-P.hipX, yK, 0, 'RightUpLeg'], RightFoot: [-P.hipX, yA, 0, 'RightLeg'],
    LeftUpLeg: [P.hipX, yHp, 0, 'Hips'], LeftLeg: [P.hipX, yK, 0, 'LeftUpLeg'], LeftFoot: [P.hipX, yA, 0, 'LeftLeg'],
  };  const names = Object.keys(JD), bones = {}, bi = {};
  names.forEach((n, i) => { const b = new THREE.Bone(); b.name = n; bones[n] = b; bi[n] = i; });
  for (const n of names) { const [x, y, z, p] = JD[n]; if (p) { bones[p].add(bones[n]); bones[n].position.set(x - JD[p][0], y - JD[p][1], z - JD[p][2]); } else bones[n].position.set(x, y, z); }

  const B = new Mesh(bi), HM = new Mesh(bi);
  const mT = { reg: REG.torso }, mL = { reg: REG.legs }, mA = { reg: REG.arms }, mF = { reg: REG.face }, mS = { reg: REG.skirt }, mC = { reg: REG.coat };
  const t = D.top, L = D.layer, b = D.bottom, sk = D.skirt;

  // ----- thân -----
  const TR = female ? TORSO_F : TORSO_M;
  const lowPad = sk ? 0.004 : b.kind === 'legging' ? 0.002 : b.kind === 'jeans' ? 0.005 : 0.011;
  const tPad = y => (y >= t.hemY - 1e-4 ? t.pad : (y < 0.985 ? lowPad : 0));
  // vai: phần thân/áo sát hai bên vai ăn theo xương cánh tay → giơ tay thì vai áo nhấc theo, không hở nách
  const shW = y => (y < 1.2 || y > 1.41) ? wTorso(y) : (p => { const k = sm(0.08, 0.165, Math.abs(p[0])) * sm(1.2, 1.33, y) * 0.58; const l = wTorso(y).map(([n, w]) => [n, w * (1 - k)]); l.push([(p[0] < 0 ? 'Right' : 'Left') + 'Arm', k]); return l; });
  const rowsT = [];
  const pushT = (y, pad) => { const [rx, rz, f] = torsoR(TR, y); const k = y > 1.38 ? Math.max(0, 1 - (y - 1.38) / 0.05) : 1; rowsT.push({ c: [0, y, y < 0.9 ? -0.004 : 0], rx: rx + pad * k, rz: rz + pad * k, rzF: rz + f + pad * k, v: (1.45 - y) / 0.65, w: shW(y) }); };
  for (const r of TR) {
    const y = r[0];
    if (rowsT.length && !t.tuck) { const py = rowsT[rowsT.length - 1].c[1]; if (py < t.hemY && y > t.hemY) { pushT(t.hemY - 0.002, lowPad); pushT(t.hemY, t.pad + 0.006); } }
    pushT(y, tPad(y));
  }
  B.warp = wBody;
  B.tube(rowsT, mT, 20);
  // cổ
  B.tube([[1.4, 1.06, [['Spine2', 1]]], [1.45, 1, [['Spine2', 0.4], ['Neck', 0.6]]], [1.5, 0.96, [['Neck', 1]]], [1.57, 0.98, [['Neck', 0.35], ['Head', 0.65]]]].map(([y, k, w]) => ({ c: [0, y, -0.008 + (y - 1.4) * 0.06], rx: (female ? 0.045 : 0.056) * k, rz: (female ? 0.047 : 0.058) * k, w })), SWM('skin'), 12);
  if (D.choker) B.tube([{ c: [0, 1.468, -0.004], rx: (female ? 0.045 : 0.056) + 0.003, rz: (female ? 0.047 : 0.058) + 0.003 }, { c: [0, 1.484, -0.003], rx: (female ? 0.045 : 0.056) + 0.003, rz: (female ? 0.047 : 0.058) + 0.003 }].map(r => Object.assign(r, { w: [['Neck', 1]] })), SWM('black'), 12);
  // cổ áo
  const topC = SWM('top'), cw = [['Spine2', 0.6], ['Neck', 0.4]];
  if (t.collar === 'shirt') B.tube([{ c: [0, 1.43, 0], rx: 0.056, rz: 0.057 }, { c: [0, 1.458, -0.003], rx: 0.057, rz: 0.058 }, { c: [0, 1.431, 0.003], rx: 0.07, rz: 0.067 }].map(r => Object.assign(r, { a0: 0.3, a1: TAU - 0.3, w: cw })), topC, 14);
  else if (t.collar === 'turtle') B.tube([{ c: [0, 1.42, 0], rx: 0.068, rz: 0.066 }, { c: [0, 1.5, -0.004], rx: 0.062, rz: 0.062 }, { c: [0, 1.505, -0.004], rx: 0.05, rz: 0.05 }].map(r => Object.assign(r, { w: cw })), topC, 14);
  else if (t.collar === 'mandarin') B.tube([{ c: [0, 1.425, 0], rx: 0.06, rz: 0.058 }, { c: [0, 1.482, -0.003], rx: 0.054, rz: 0.054 }, { c: [0, 1.482, -0.003], rx: 0.048, rz: 0.048 }].map(r => Object.assign(r, { a0: 0.06, a1: TAU - 0.06, w: cw })), topC, 14);
  if (t.collar === 'hood' && !L) B.tube([{ c: [0, 1.4, -0.03], rx: 0.1, rz: 0.075 }, { c: [0, 1.455, -0.05], rx: 0.115, rz: 0.1 }, { c: [0, 1.5, -0.062], rx: 0.09, rz: 0.085 }, { c: [0, 1.5, -0.06], rx: 0.03, rz: 0.03 }].map(r => Object.assign(r, { a0: 1.15, a1: TAU - 1.15, w: [['Spine2', 1]] })), topC, 12);

  // ----- áo khoác (lớp ngoài, hở vạt trước) -----
  if (L) {
    const lp = t.pad + (L.kind === 'gile' ? 0.01 : 0.02), hemL = L.hemY, v0 = Math.min(0.8, hemL), rows = [];
    const gap = y => (L.kind === 'gile' ? 0.05 + 0.52 * sm(1.12, 1.38, y) : /suit|blazer|coat/.test(L.kind) ? 0.07 + 0.46 * sm(1.1, 1.38, y) + 0.1 * sm(1.0, 0.8, y) : 0.09 + 0.2 * sm(1.2, 1.4, y));
    const ys = TR.map(r => r[0]).filter(y => y > hemL + 0.01 && y < 1.41); ys.unshift(hemL); if (L.kind !== 'gile') ys.push(1.425);
    for (const y of ys) {
      const [rx, rz, f] = torsoR(TR, Math.max(0.8, y)), k = y > 1.38 ? 0.55 : 1, flare = y < 0.94 ? (0.94 - y) * 0.06 : 0, ga = gap(y);
      rows.push({ c: [0, y, 0], rx: (rx + lp) * (y > 1.38 ? 0.62 : 1) + flare, rz: (rz + lp) * k + flare, rzF: (rz + f * 0.6 + lp) * k + flare, a0: ga, a1: TAU - ga, v: (1.45 - y) / (1.45 - v0), w: y < 0.8 ? [['Hips', 1]] : shW(y) });
    }
    if (hemL < 0.8) {   // áo khoác dài: thân dưới đung đưa theo chân
      const lw = y => (p) => { const tt = sm(0.84, hemL, y) * 0.55, sd = sm(-0.05, 0.05, p[0]); return [['Hips', 1 - tt], ['LeftUpLeg', tt * sd], ['RightUpLeg', tt * (1 - sd)]]; };
      const low2 = []; for (const y of [0.8, 0.7, hemL]) low2.push({ c: [0, y, 0], rx: 0.17 + lp + (0.8 - y) * 0.09, rz: 0.125 + lp + (0.8 - y) * 0.06, a0: 0.17, a1: TAU - 0.17, v: (0.8 - y) / (0.8 - hemL), w: lw(y) });
      B.tube(low2, mS, 20); rows.splice(0, 1);
    }
    B.tube(rows, mC, 22);
    if (/bomber|sport|denim/.test(L.kind)) B.tube([{ c: [0, 1.42, 0], rx: 0.07, rz: 0.068 }, { c: [0, 1.45, -0.002], rx: 0.066, rz: 0.064 }, { c: [0, 1.452, -0.002], rx: 0.058, rz: 0.058 }].map(r => Object.assign(r, { a0: 0.3, a1: TAU - 0.3, w: cw })), SWM(L.kind === 'denim' ? 'layer' : 'hat2'), 12);
  }

  // ----- tay -----
  const slv = L && L.sleeves ? 'long' : t.sleeve, aPad = (L && L.sleeves ? 0.013 : 0) + Math.min(0.016, t.pad * 0.8) + (t.kind === 'blouse' ? 0.006 : 0);
  const sEnd = slv === 'long' ? 0.885 : slv === 'short' ? (t.kind === 'crop' || t.kind === 'dress' ? 1.27 : 1.2) : 9;
  for (const s of [-1, 1]) {
    const S = s < 0 ? 'Right' : 'Left', x = s * sw, rows = [];
    const wA = y => y > 1.345 ? [['Spine2', 0.42], [S + 'Arm', 0.58]] : y > 1.3 ? [['Spine2', 0.42 * sm(1.3, 1.345, y)], [S + 'Arm', 1 - 0.42 * sm(1.3, 1.345, y)]] : y > 1.14 ? [[S + 'Arm', 1]] : y > 1.04 ? [[S + 'Arm', sm(1.04, 1.14, y)], [S + 'ForeArm', 1 - sm(1.04, 1.14, y)]] : [[S + 'ForeArm', 1]];
    const A = [[1.402, 0.004, -0.02], [1.39, 0.044, -0.008], [1.36, 0.06, 0], [1.31, 0.057, 0], [1.25, 0.05, 0], [1.2, 0.048, 0], [1.15, 0.046, 0], [1.09, 0.043, 0], [1.03, 0.046, 0], [0.95, 0.04, 0], [0.885, 0.034, 0], [0.86, 0.032, 0]];
    for (const [y, r, xo] of A) {
      const cloth = y >= sEnd - 1e-4, pad = cloth ? aPad + (slv === 'long' && src_cuff(t, L) && y < 0.9 ? -aPad * 0.5 : 0) : 0;
      if (rows.length && slv === 'short') { const py = rows[rows.length - 1].c[1]; if (py > sEnd && y < sEnd) { rows.push({ c: [x, sEnd, 0], rx: (0.05 * ak + aPad + 0.006), rz: (0.05 * ak + aPad + 0.006), v: (1.4 - sEnd) / 0.54, w: wA(sEnd), flipU: s > 0 }); rows.push({ c: [x, sEnd - 0.002, 0], rx: 0.048 * ak, rz: 0.048 * ak, v: (1.4 - sEnd + 0.004) / 0.54, w: wA(sEnd), flipU: s > 0 }); } }
      // mặt trong của bắp tay (sát nách) bám thân nhiều hơn mặt ngoài → vai tròn, không gãy khúc
      const wv = y > 1.27 ? (p => { const inn = sm(-0.015, 0.045, -s * (p[0] - x)), ws = sm(1.27, 1.39, y) * (0.18 + 0.62 * inn); return [['Spine2', ws], [S + 'Arm', 1 - ws]]; }) : wA(y);
      rows.push({ c: [x + s * xo, y, 0], rx: r * ak + pad, rz: r * ak + pad, v: (1.4 - y) / 0.54, w: wv, flipU: s > 0 });
    }
    B.tube(rows, mA, 12);
    // bàn tay: lòng + các ngón liền, ngón cái riêng
    const hw = [[S + 'Hand', 1]], hk = female ? 0.9 : 1.05;
    B.tube([[0.866, 0.022, 0.03], [0.84, 0.021, 0.04], [0.805, 0.019, 0.043], [0.772, 0.015, 0.039], [0.745, 0.011, 0.03], [0.733, 0.002, 0.008]].map(([y, a, c]) => ({ c: [x, y, 0.004], rx: a * hk, rz: c * hk, w: hw })), SWM('skin'), 10);
    B.tube([[0.845, 0.012, 0.03], [0.815, 0.013, 0.05], [0.786, 0.011, 0.058], [0.774, 0.002, 0.06]].map(([y, r, z]) => ({ c: [x - s * 0.004, y, z * hk], rx: r * hk, rz: r * hk, w: hw })), SWM('skin'), 8);
    if (C.nail) for (let k = 0; k < 4; k++) B.add(new THREE.SphereGeometry(0.0065, 6, 5), hw, SWM('lip'), T4(x + s * 0.012 * hk, 0.741, (-0.02 + k * 0.016) * hk, 0.6, 1, 1));
  }

  // ----- chân -----
  const wide = b && !sk && b.kind === 'wide', hemB = b && !sk ? (b.kind === 'shorts' ? (b.sport ? 0.67 : 0.6) : b.crop ? 0.3 : 0.085) : 9;
  const lPadAt = y => {
    if (sk || !b) return 0;
    if (y < hemB - 1e-4) return 0;
    if (b.kind === 'legging') return 0.002; if (b.kind === 'jeans') return 0.005;
    if (b.kind === 'shorts') return 0.016; if (b.kind === 'jogger') return y < 0.13 ? 0.004 : 0.014; if (b.kind === 'cargo') return 0.019;
    if (wide) return D.aodai ? 0.008 + sm(0.5, 0.15, y) * 0.045 : 0.014 + sm(0.84, 0.2, y) * (b.crop ? 0.07 : 0.055);
    return 0.011;
  };
  for (const s of [-1, 1]) {
    const S = s < 0 ? 'Right' : 'Left', x = s * 0.095, rows = [];
    const wL = y => y >= 0.9 ? [['Hips', 0.72], [S + 'UpLeg', 0.28]] : y > 0.8 ? [['Hips', 0.72 * sm(0.8, 0.9, y)], [S + 'UpLeg', 1 - 0.72 * sm(0.8, 0.9, y)]] : y > 0.51 ? [[S + 'UpLeg', 1]] : y > 0.39 ? [[S + 'UpLeg', sm(0.39, 0.51, y)], [S + 'Leg', 1 - sm(0.39, 0.51, y)]] : y > 0.1 ? [[S + 'Leg', 1]] : [[S + 'Leg', 0.5], [S + 'Foot', 0.5]];
    const Lg = [[0.915, 0.07], [0.86, female ? 0.09 : 0.086], [0.78, female ? 0.086 : 0.082], [0.68, 0.074], [0.56, 0.062], [0.45, 0.056], [0.38, 0.058], [0.3, 0.053], [0.2, 0.044], [0.12, 0.038], [0.085, 0.036], [0.05, 0.034]];
    const straight = b && !sk && (b.kind === 'tay' || b.kind === 'cargo' || b.kind === 'jogger');
    for (const [y, r0] of Lg) {
      let r = r0 * (female ? 0.96 : 1);
      if (straight && y < 0.5 && y >= hemB) r = Math.max(r, b.kind === 'jogger' && y < 0.13 ? 0.04 : 0.058);
      if (rows.length && hemB > 0.2 && hemB < 1) { const py = rows[rows.length - 1].c[1]; if (py > hemB && y < hemB) { const [, rr] = [0, lerp(r0, rows[rows.length - 1].rx, 0.5)]; rows.push({ c: [x, hemB, 0], rx: rr + lPadAt(hemB) + 0.006, rz: rr + lPadAt(hemB) + 0.006, v: (0.93 - hemB) / 0.88, w: wL(hemB), flipU: s > 0 }); rows.push({ c: [x, hemB - 0.002, 0], rx: rr - 0.004, rz: rr - 0.004, v: (0.93 - hemB + 0.006) / 0.88, w: wL(hemB), flipU: s > 0 }); } }
      const pad = lPadAt(y), xo = y > 0.88 ? -s * 0.012 : 0;
      rows.push({ c: [x + xo, y, 0], rx: r + pad, rz: r + pad, v: (0.93 - y) / 0.88, w: wL(y), flipU: s > 0 });
    }
    B.tube(rows, mL, 14);
    if (b && !sk && b.kind === 'cargo') B.add(new THREE.BoxGeometry(0.03, 0.11, 0.1), [[S + 'UpLeg', 1]], SWM('bottom'), T4(x + s * 0.092, 0.62, 0));
    // ----- giày -----
    const fw = [[S + 'Foot', 1]], shoe = (rows2, map, seg = 10) => B.loft(rows2.map(([z, w, h, yc]) => { const P = []; for (let k = 0; k <= seg; k++) { const a = -PI + TAU * k / seg; P.push([x + w * Math.sin(a), Math.max(0.004, (yc === undefined ? h : yc) + h * Math.cos(a)), z]); } return { P, w: fw }; }), map);
    const sc = SWM('shoe'), so = SWM('sole');
    if (sh.kind === 'sneaker') {
      shoe([[-0.078, 0.004, 0.004, 0.05], [-0.072, 0.034, 0.05], [-0.02, 0.044, 0.06], [0.03, 0.046, 0.052], [0.09, 0.048, 0.04], [0.15, 0.044, 0.032], [0.185, 0.026, 0.022], [0.193, 0.002, 0.004, 0.02]], sc);
      shoe([[-0.086, 0.002, 0.002, 0.016], [-0.082, 0.04, 0.017], [0.0, 0.05, 0.017], [0.1, 0.053, 0.017], [0.17, 0.046, 0.016], [0.198, 0.024, 0.014], [0.202, 0.002, 0.002, 0.014]], so);
      B.add(new THREE.BoxGeometry(0.034, 0.006, 0.07), fw, SWM('white'), T4(x, 0.094, 0.055, 1, 1, 1, -0.45, 0, 0));
    } else if (sh.kind === 'heels') {
      shoe([[-0.066, 0.002, 0.004, 0.045], [-0.06, 0.03, 0.04, 0.046], [-0.02, 0.036, 0.03, 0.036], [0.05, 0.04, 0.02, 0.022], [0.13, 0.034, 0.016, 0.018], [0.185, 0.012, 0.01, 0.012], [0.2, 0.001, 0.002, 0.008]], sc);
      B.add(new THREE.CylinderGeometry(0.011, 0.006, 0.05, 6), fw, sc, T4(x, 0.025, -0.052));
    } else if (sh.kind === 'flats' || sh.kind === 'sandal') {
      shoe([[-0.07, 0.002, 0.004, 0.03], [-0.064, 0.032, 0.028], [0.0, 0.04, 0.022], [0.1, 0.044, 0.018], [0.16, 0.036, 0.016], [0.185, 0.002, 0.004, 0.012]], sh.kind === 'sandal' ? SWM('skin') : sc);
      shoe([[-0.074, 0.002, 0.002, 0.008], [-0.07, 0.036, 0.008], [0.05, 0.046, 0.008], [0.16, 0.04, 0.008], [0.19, 0.002, 0.002, 0.008]], sh.kind === 'sandal' ? sc : so);
      if (sh.kind === 'sandal') for (const z of [0.02, 0.1]) B.add(new THREE.TorusGeometry(0.036, 0.007, 5, 12, PI), fw, sc, T4(x, 0.012, z, 1.15, 1.25, 1));
    } else {   // giày da / boots
      shoe([[-0.076, 0.002, 0.004, 0.045], [-0.07, 0.034, 0.048], [-0.02, 0.042, sh.kind === 'boots' ? 0.07 : 0.05], [0.04, 0.044, 0.042], [0.11, 0.045, 0.03], [0.17, 0.038, 0.024], [0.2, 0.02, 0.016], [0.208, 0.002, 0.003, 0.014]], sc);
      shoe([[-0.082, 0.002, 0.002, 0.01], [-0.078, 0.038, 0.011], [0.0, 0.046, 0.011], [0.12, 0.049, 0.011], [0.19, 0.036, 0.01], [0.212, 0.002, 0.002, 0.01]], so);
      B.add(new THREE.BoxGeometry(0.07, 0.022, 0.05), fw, so, T4(x, 0.011, -0.05));
    }
  }

  B.warp = wBody;
  // ----- váy / tà áo dài -----
  const skW = (y, top, hem, k0 = 0.96) => p => {   // váy bám sát chuyển động của đùi để chân không chọc thủng vải
    const tt = sm(top, hem, y) * k0, sd = sm(-0.07, 0.07, p[0]), kn = sm(0.5, 0.28, y) * 0.5;
    return [['Hips', 1 - tt], ['LeftUpLeg', tt * sd * (1 - kn)], ['RightUpLeg', tt * (1 - sd) * (1 - kn)], ['LeftLeg', tt * sd * kn], ['RightLeg', tt * (1 - sd) * kn]];
  };
  if (sk) {
    const K = { mini: [0.68, 0.035, 0], skater: [0.64, 0.1, 0.03], pleated: [0.64, 0.09, 0.045], pencil: [0.42, -0.012, 0], slip: [0.44, 0.0, 0], midi: [0.36, 0.06, 0.015], aline: [0.16, 0.13, 0.02], ball: [0.1, 0.27, 0.03], mermaid: [0.08, 0.0, 0.02] }[sk.kind] || [0.4, 0.05, 0];
    const top = 1.0, hem = K[0], [wr, wz] = torsoR(TR, top), [hr, hz] = torsoR(TR, 0.89), rows = [], N = 8;
    for (let j = 0; j <= N; j++) {
      const tt = j / N, y = lerp(top, hem, tt);
      let rx = y > 0.89 ? lerp(wr + 0.012, hr + 0.026, sm(top, 0.89, y)) : hr + 0.026 + K[1] * Math.pow((0.89 - y) / (0.89 - hem), sk.kind === 'ball' ? 0.6 : 1), rz = y > 0.89 ? lerp(wz + 0.012, hz + 0.026, sm(top, 0.89, y)) : hz + 0.026 + K[1] * 0.9 * Math.pow((0.89 - y) / (0.89 - hem), sk.kind === 'ball' ? 0.6 : 1);
      if (sk.kind === 'mermaid') { const fl = sm(0.42, hem, y); rx = lerp(Math.max(0.13, rx - sm(0.8, 0.45, y) * 0.035), 0.3, fl * fl); rz = lerp(Math.max(0.1, rz - sm(0.8, 0.45, y) * 0.02), 0.27, fl * fl); }
      const amp = K[2] * tt, np = sk.kind === 'pleated' ? 12 : 6;
      rows.push({ c: [0, y, y < 0.89 ? -0.006 : 0], rx: rx + 0.02 * Math.sin(Math.min(1, tt * 1.6) * Math.PI), rz: rz + 0.03 * Math.sin(Math.min(1, tt * 1.6) * Math.PI), v: tt, w: skW(y, 0.9, Math.max(hem, 0.55)), bump: amp ? th => amp * Math.sin(th * np) / rx * 0.5 : null });
    }
    B.tube(rows, mS, 24);
  }
  if (D.aodai) {
    for (const f of [0, 1]) {   // tà trước, tà sau
      const rows = [], a = f ? PI : 0, sp = 1.02;
      for (let j = 0; j <= 7; j++) { const tt = j / 7, y = lerp(1.02, 0.17, tt), [wr, wz] = torsoR(TR, Math.max(0.82, y)); rows.push({ c: [0, y, (f ? -1 : 1) * tt * 0.012], rx: Math.max(wr + 0.012, 0.214 * sm(1.0, 0.86, y)) + tt * 0.02, rz: Math.max(wz + 0.014, 0.14 * sm(1.0, 0.86, y)) + tt * 0.03, a0: a - sp, a1: a + sp, v: tt, w: skW(y, 0.95, 0.17, 0.5), flipU: !!f }); }
      B.loft(rows.map(r => { const P = [], U = []; for (let k = 0; k <= 10; k++) { const u = k / 10, th = r.a0 + (r.a1 - r.a0) * u; P.push([r.c[0] + r.rx * Math.sin(th), r.c[1], r.c[2] + r.rz * Math.cos(th)]); U.push(f ? 0.5 + u * 0.5 : u * 0.5); } return { P, U, v: r.v, w: r.w }; }), mS);
    }
  }
  if (t.kind === 'baba') for (const sd of [-1, 1]) B.add(new THREE.BoxGeometry(0.05, 0.05, 0.012), [['Hips', 1]], SWM('top'), T4(sd * 0.07, 0.86, 0.118));   // túi áo bà ba

  B.warp = HW; HM.warp = HW;
  // ----- đầu -----
  const rings = [];
  for (let j = 0; j <= 34; j++) {   // lưới dày ở vùng mặt để nặn mũi, môi, hốc mắt
    const v = j / 17 - 1, s = Math.max(-1, Math.min(1, 0.55 * v + 0.45 * v * v * v)), P = [], U = [];
    for (let k = 0; k <= 44; k++) { const u = k / 22 - 1, th = PI * (0.42 * u + 0.58 * u * Math.abs(u)); P.push(headPt(H, th, s)); U.push(faceU(th)); }
    rings.push({ P, U, v: (1 - s) / 2, w: [['Head', 1]] });
  }
  B.loft(rings, mF);
  const hw = [['Head', 1]];
  for (const sd of [-1, 1]) { const e = headPt(H, sd * 1.72, -0.06); B.add(new THREE.SphereGeometry(1, 8, 6), hw, SWM('skin2'), T4(e[0] + sd * 0.006, e[1], e[2], 0.016, 0.05, 0.03, 0, sd * 0.5, 0.0)); }
  // mí mắt (chớp) + miệng mở (hát / nói): nằm trong đầu, xương riêng đẩy ra khi cần
  const patch = (th0, th1, s0, s1, k, bone, reg) => { const rs = []; for (let j = 0; j <= 3; j++) { const s = lerp(s1, s0, j / 3), P = [], U = []; for (let q = 0; q <= 6; q++) { P.push(headPt(H, lerp(th0, th1, q / 6), s, k)); U.push(q / 6); } rs.push({ P, U, v: j / 3, w: [[bone, 1]] }); } B.loft(rs, { reg }); };
  const eth = 60 / 256 * TM, ehw = 0.235 * C.face.eyeW;
  for (const sd of [-1, 1]) patch(sd * eth - ehw, sd * eth + ehw, 0.04 - 0.072 * C.face.eyeH, 0.04 + 0.1 * C.face.eyeH, 1.006, 'Lids', LID);
  patch(-0.25, 0.25, -0.6, -0.46, 1.006, 'Jaw', MOUTH);
  bones.Lids.userData.rest = bones.Lids.position.clone(); bones.Jaw.userData.rest = bones.Jaw.position.clone();
  // kính
  const gl = extra.glasses !== undefined ? extra.glasses : C.glasses;
  if (gl) {
    const e = headPt(H, eth, 0.04), fm = SWM(gl === 'sun' ? 'black' : R() < 0.5 ? 'black' : 'gold'), zf = headPt(H, 0, 0.1)[2] + 0.014;
    for (const sd of [-1, 1]) {
      B.add(new THREE.TorusGeometry(0.052, 0.006, 5, 20), hw, fm, T4(sd * e[0] * 1.02, e[1], zf, 1.1, 0.9, 1, 0, sd * 0.28, 0));
      if (gl === 'sun') B.add(new THREE.CircleGeometry(0.052, 18), hw, SWM('lens'), T4(sd * e[0] * 1.02, e[1], zf, 1.1, 0.9, 1, 0, sd * 0.28, 0));
      B.add(new THREE.BoxGeometry(0.006, 0.007, 0.2), hw, fm, T4(sd * (H.rx + 0.004), e[1] + 0.006, zf - 0.115, 1, 1, 1, 0, sd * -0.22, 0));
    }
    B.add(new THREE.BoxGeometry(0.036, 0.006, 0.006), hw, fm, T4(0, e[1] + 0.01, zf + 0.004));
  }
  if (C.earrings) for (const sd of [-1, 1]) {
    const e = headPt(H, sd * PI / 2, -0.25);
    if (C.earrings === 'hoop') B.add(new THREE.TorusGeometry(0.034, 0.006, 5, 14), hw, SWM('gold'), T4(e[0] + sd * 0.012, e[1] - 0.035, e[2], 1, 1, 1, 0, PI / 2, 0));
    else B.add(new THREE.SphereGeometry(C.earrings === 'drop' ? 0.019 : 0.014, 8, 6), hw, SWM(C.earrings === 'drop' ? 'white' : 'gold'), T4(e[0] + sd * 0.012, e[1] - (C.earrings === 'drop' ? 0.05 : 0.014), e[2]));
  }
  if (extra.headphones) {
    HM.add(new THREE.TorusGeometry(H.rx + 0.04, 0.018, 6, 20, PI), hw, SWM('black'), T4(0, H.cy + 0.02, 0, 1, 1.14, 1));
    for (const sd of [-1, 1]) { HM.add(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 14), hw, SWM('black'), T4(sd * (H.rx + 0.03), H.cy - 0.02, 0, 1, 1, 1, 0, 0, PI / 2)); HM.add(new THREE.CylinderGeometry(0.05, 0.05, 0.056, 12), hw, SWM('acc'), T4(sd * (H.rx + 0.032), H.cy - 0.02, 0, 1, 1, 1, 0, 0, PI / 2)); }
  }
  if (extra.hair) C.hair = extra.hair;
  buildHair(HM, H, C, D, R);

  // ----- ráp -----
  const root = new THREE.Group(); root.name = 'cast_' + ch.id;
  root.add(bones.Hips); root.updateMatrixWorld(true);
  const skel = new THREE.Skeleton(names.map(n => bones[n]));
  const mat = new THREE.MeshStandardMaterial({ name: 'CastBody', map: tex, roughness: 0.9, metalness: 0, envMapIntensity: 0.4, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.05 });
  const matH = new THREE.MeshStandardMaterial({ name: 'CastHair', map: tex, roughness: 0.62, metalness: 0, envMapIntensity: 0.6, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.04 });
  const mb = new THREE.SkinnedMesh(B.build(), mat); mb.name = 'CastBody'; root.add(mb); mb.bind(skel, new THREE.Matrix4());
  const mh = new THREE.SkinnedMesh(HM.build(), matH); mh.name = 'CastHair'; root.add(mh); mh.bind(skel, new THREE.Matrix4());
  if (extra.glam) { mat.roughness = 0.5; mat.metalness = 0.1; mat.envMapIntensity = 1.2; mat.emissiveIntensity = 0.2; }   // dancer: đồ kim sa bắt sáng
  const hairR = /perm|curly|under|wavy/.test(C.hair) ? 0.05 : 0.03;
  root.userData.vtn_head = { eye: HW([0, H.cy + 0.04 * H.ry, 0])[1] - HJ, front: (H.rzF + H.cz) * HSZ, r: H.rx * HSX, crown: HW([0, H.cy + H.ry + hairR * 0.6, 0])[1] - HJ, earY: HW([0, H.cy - 0.06 * H.ry, 0])[1] - HJ, earX: H.rx * HSX, hatR: (H.rx + hairR) * HSX * 1.08 };
  root.userData.cast = { female, design: D, look: C };
  return root;
}
function src_cuff(t, L) { return !!((L && L.sleeves && /bomber|sport/.test(L.kind)) || (!L && t.cuff)); }

// ---------- nhân vật ngẫu nhiên (khi tắt danh sách) + DJ / nhân viên ----------
const RND_F = ['Áo crop top trắng, quần jeans cạp cao, giày sneaker trắng', 'Áo hoodie hồng pastel, quần short denim, giày sneaker', 'Đầm ngắn hoa, giày sneaker trắng', 'Áo hai dây, quần ống rộng, giày cao gót', 'Đầm satin đỏ, giày cao gót', 'Áo thun trắng, váy tennis, giày sneaker', 'Áo crop top đen, chân váy ngắn, giày boots', 'Áo blouse lụa, chân váy bút chì, giày cao gót', 'Đầm dạ hội xanh đậm, giày cao gót', 'Áo tank top đen, quần cargo, giày sneaker', 'Áo len mỏng, chân váy jeans, giày sneaker', 'Đầm đen cổ yếm, giày cao gót'];
const RND_M = ['Áo hoodie đen oversize, quần jogger xám, giày sneaker đỏ', 'Áo thun graphic, quần jeans rách, giày sneaker', 'Áo bomber xanh navy, quần jeans đen, giày sneaker trắng', 'Áo sơ mi kẻ caro, quần jeans, giày thể thao', 'Áo thun, blazer đen, quần jeans, giày sneaker', 'Suit xanh navy, cà vạt, giày tây', 'Áo polo, quần tây, giày sneaker trắng', 'Áo khoác denim, áo thun, quần kaki, giày sneaker', 'Áo tank top, quần short, giày sneaker neon', 'Áo sơ mi họa tiết, quần tây đen, giày loafer', 'Áo jacket thể thao, quần jogger, giày sneaker', 'Áo len cổ lọ, quần tây, giày da'];
const RND_P = ['Năng động', 'Tự tin', 'Vui vẻ', 'Cá tính', 'Dịu dàng', 'Lạnh lùng', 'Sôi nổi', 'Lịch lãm'];
export function randomCastChar(i, female) {
  const R = rng(hash('rnd' + i));
  if (female === undefined) female = R() < 0.5;
  const list = female ? RND_F : RND_M;
  return { id: 'rnd' + i, name: 'Khách ' + i, female, age: 18 + Math.floor(R() * 22), outfit: list[Math.floor(R() * list.length)], personality: RND_P[Math.floor(R() * RND_P.length)], style: '' };
}
export const SPECIAL_CAST = {
  dj: [{ id: 'dj', name: 'DJ', female: false, age: 26, outfit: 'Áo bomber đen, áo thun graphic hồng, quần jeans đen, giày sneaker trắng', personality: 'Cá tính' }, { headphones: true, glasses: 'sun', hat: 'capBack', hatColor: '#17171c', hair: 'crop', look: { hairCol: '#17131a' } }],
};
