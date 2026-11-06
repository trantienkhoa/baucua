// Danh sách nhân vật tự tạo (roster.csv): đọc mô tả trang phục / điệu nhảy / tính cách tiếng Việt
// và chuyển thành bộ đồ 3D, điệu nhảy, nhịp nhảy, dáng người.
const pick = a => a[Math.floor(Math.random() * a.length)];
export const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();

// ---------- màu ----------
const COLORS = [
  ['xanh navy', '#1f2a4a'], ['xanh dam', '#1e3a8a'], ['xanh reu', '#4b5a2a'], ['xanh la', '#2e8b3a'], ['xanh duong', '#2f6fd6'], ['xanh ngoc', '#16a3a3'],
  ['hong pastel', '#f4a6c4'], ['tim', '#7c3dff'], ['hong', '#ff6fa3'], ['do', '#c8102e'], ['cam', '#ff8a3d'], ['vang', '#ffcf33'],
  ['trang', '#f3f1ec'], ['den', '#15151a'], ['xam', '#8a8d94'], ['nau sam', '#4a2e1a'], ['nau', '#7a4b2a'], ['nude', '#e8c4a8'], ['be', '#d9c4a0'],
  ['bac', '#c0c4cc'], ['kem', '#efe6d2'], ['xanh', '#2f6fd6'],
];
function colorOf(t) { const w = ' ' + t + ' '; for (const [k, c] of COLORS) if (w.includes(' ' + k + ' ')) return c; return null; }
function patternOf(t) {
  if (/caro/.test(t)) return 'plaid';
  if (/soc|ke /.test(t + ' ') || /\bke$/.test(t)) return 'stripe';
  if (/hoa tiet|graphic/.test(t)) return /graphic/.test(t) ? null : 'dots';
  if (/\bhoa\b/.test(t)) return 'floral';
  if (/\bren\b/.test(t)) return 'lace';
  if (/gam/.test(t)) return 'brocade';
  if (/\blen\b/.test(t)) return 'knit';
  return null;
}
function fabricOf(t) {
  if (/kim sa|sequin/.test(t)) return 'sequin';
  if (/satin|lua/.test(t)) return 'satin';
  if (/nhung/.test(t)) return 'velvet';
  if (/\bda\b|boots|boot/.test(t)) return 'leather';
  if (/jean|denim/.test(t)) return 'denim';
  return 'matte';
}
const DEF = { tee: '#f3f1ec', shirt: '#f3f1ec', jean: '#3b5ba5', kaki: '#cdb58f', tay: '#2a2c33', jogger: '#3a3d44', legging: '#15151a', short: '#cdb58f', lua: '#f3f1ec' };

// ---------- trang phục ----------
export function rosterOutfit(ch) {
  const female = ch.female;
  const items = String(ch.outfit || '').split(',').map(x => norm(x)).filter(Boolean);
  const o = { bar: true, roster: true, female, name: ch.outfit, top: null, topColor: '#f3f1ec', topFabric: 'matte', topPattern: null, skirt: null, legs: null, acc: [] };
  let jacket = null, shirt = null, bottom = null, shoes = null;
  for (const it of items) {
    const c = colorOf(it), pat = patternOf(it), fab = fabricOf(it);
    if (/ao dai/.test(it)) { o.top = 'aodai'; o.topColor = c || '#2f6fd6'; o.topFabric = /gam|nhung/.test(it) ? (/nhung/.test(it) ? 'velvet' : 'satin') : 'satin'; o.topPattern = /gam/.test(it) ? 'brocade' : pat === 'floral' ? 'floral' : null; o.skirt = 'aodai'; if (!female) o.hat = o.hat || null; continue; }
    if (/ba ba/.test(it)) { o.top = 'baba'; o.topColor = c || '#efe6d2'; o.topFabric = 'satin'; o.topPattern = /gam/.test(it) ? 'brocade' : null; o.skirt = 'baba'; continue; }
    if (/khan dong/.test(it)) { o.hat = 'khandong'; o.hatColor = c || o.topColor; continue; }
    if (/ca vat/.test(it)) { o.tie = c || pick(['#7a0019', '#1e3a8a', '#15151a', '#4b5a2a']); continue; }
    if (/^(dam|vay yem)/.test(it)) {
      // đầm: thân + chân váy cùng màu
      o.top = /yem/.test(it) && !/vay yem/.test(it) ? 'cami' : /vay yem/.test(it) ? 'cami' : 'cami';
      o.topColor = c || (/vay yem/.test(it) ? '#3b5ba5' : pat === 'floral' ? pick(['#f3f1ec', '#ffd6e5', '#fff3c4', '#cfe8ff']) : pick(['#c8102e', '#15151a', '#1e3a8a', '#ff6fa3']));
      o.topFabric = /vay yem/.test(it) ? 'denim' : fab === 'matte' && /da hoi|satin|lua/.test(it) ? 'satin' : fab;
      o.topPattern = pat;
      o.skirt = /da hoi/.test(it) ? pick(['ball', 'aline', 'mermaid']) : /dai|co dien/.test(it) ? 'aline' : /midi/.test(it) ? 'midi' : /ngan|vay yem/.test(it) ? 'skater' : /thanh lich/.test(it) ? 'midi' : 'midi';
      o.skirtColor = o.topColor; o.skirtFabric = o.topFabric; o.skirtPattern = pat;
      if (/vay yem/.test(it)) o.dungaree = true;
      continue;
    }
    if (/^(chan vay|vay)/.test(it)) {
      o.skirt = /xep ly|tennis/.test(it) ? (/dai/.test(it) ? 'pleatedMidi' : 'pleated') : /but chi/.test(it) ? 'slip' : /dai/.test(it) ? 'aline' : /ngan|jean|denim/.test(it) ? 'mini' : 'midi';
      o.skirtColor = c || (/jean|denim/.test(it) ? '#3b5ba5' : /tennis/.test(it) ? '#f3f1ec' : '#15151a');
      o.skirtFabric = /jean|denim/.test(it) ? 'denim' : fab; o.skirtPattern = pat;
      continue;
    }
    if (/^(quan|legging)/.test(it)) {
      const def = /jean/.test(it) ? DEF.jean : /kaki|chinos/.test(it) ? DEF.kaki : /tay|au/.test(it) ? DEF.tay : /jogger/.test(it) ? DEF.jogger : /legging/.test(it) ? DEF.legging : /short/.test(it) ? DEF.short : /lua/.test(it) ? DEF.lua : /cargo/.test(it) ? '#4b5a2a' : '#2a2c33';
      bottom = [c || def, /jean/.test(it) ? 'denim' : /lua/.test(it) ? 'satin' : 'matte'];
      continue;
    }
    if (/^(giay|tat|that lung)/.test(it)) { if (/giay/.test(it)) shoes = [c || (/sneaker|the thao/.test(it) ? '#f3f1ec' : '#15151a'), /da|tay|loafer|cao got|mui nhon|boot/.test(it) ? 'leather' : 'matte']; continue; }
    if (/blazer|vest|suit|comple|gile|khoac|bomber|jacket/.test(it)) {
      if (female && /vest nu|blazer/.test(it)) { o.top = 'long'; o.topColor = c || '#2a2c33'; o.topFabric = 'matte'; continue; }
      jacket = [c || (/bomber/.test(it) ? '#1f2a4a' : /the thao/.test(it) ? pick(['#d6262f', '#1e3a8a', '#15151a', '#2e8b3a']) : /da\b/.test(it) ? '#15151a' : /denim|jean/.test(it) ? '#3b5ba5' : /day|da$/.test(it) ? '#3a3d44' : pick(['#2a2c33', '#3a3d44', '#4a2e1a', '#1f2a4a'])), /\bda\b/.test(it) ? 'leather' : /denim|jean/.test(it) ? 'denim' : /bomber|the thao/.test(it) ? 'satin' : 'matte'];
      if (female) { o.top = 'long'; o.topColor = jacket[0]; o.topFabric = jacket[1]; }
      continue;
    }
    // các loại áo
    let kind = null;
    if (/hoodie/.test(it)) kind = 'hoodie';
    else if (/crop/.test(it)) kind = 'crop';
    else if (/tank|ba lo/.test(it)) kind = 'tank';
    else if (/hai day/.test(it)) kind = 'cami';
    else if (/co lo/.test(it)) kind = 'turtle';
    else if (/polo/.test(it)) kind = 'polo';
    else if (/so mi/.test(it)) kind = /ngan tay/.test(it) ? 'shirtShort' : 'shirt';
    else if (/blouse/.test(it)) kind = 'blouse';
    else if (/ao len/.test(it)) kind = 'long';
    else if (/ao thun|ao phong/.test(it)) kind = 'tee';
    if (kind) {
      const top = { kind, color: c || (kind === 'shirt' || kind === 'tee' || kind === 'blouse' ? '#f3f1ec' : pick(['#15151a', '#8a8d94', '#f3f1ec'])), pat: pat || (/len/.test(it) ? 'knit' : null), fab: kind === 'blouse' || /lua/.test(it) ? 'satin' : fab === 'denim' ? 'denim' : 'matte', graphic: /graphic/.test(it) };
      if (!shirt || kind !== 'tee') shirt = top;
    }
  }
  if (shirt && (!o.top || (o.top === 'long' && female === false))) {
    o.top = shirt.kind; o.topColor = shirt.color; o.topPattern = shirt.pat; o.topFabric = shirt.fab;
    if (shirt.graphic) o.print = pick(['VIBES', 'NEON', 'LIT', 'SAIGON', 'HANOI', '★', 'DJ']);
  } else if (shirt && o.top === 'long' && female) { /* áo vest nữ đè lên áo trong */ }
  if (o.dungaree && !shirt) o.topColor = o.topColor;
  if (female) {
    o.legs = bottom ? bottom[0] : (o.skirt ? (/aline|ball|mermaid|aodai/.test(o.skirt) ? o.topColor : '#15151a') : '#3b5ba5');
    if (o.skirt === 'aodai' || o.skirt === 'baba') o.legs = bottom ? bottom[0] : '#f3f1ec';
    if (!o.top) { o.top = 'tee'; o.topColor = '#f3f1ec'; }
    if (/cao got|da hoi|dam/.test(norm(ch.outfit)) && Math.random() < 0.5) o.acc.push(pick(['pearls', 'diamonds']));
  } else {
    o.jacket = jacket;
    if (jacket) o.top = (o.top === 'aodai') ? 'aodai' : 'jacket';
    if (!o.top) { o.top = 'tee'; o.topColor = '#f3f1ec'; }
    o.bottom = bottom || ['#2a2c33', 'matte'];
    if (o.top === 'aodai') o.bottom = bottom || ['#f3f1ec', 'satin'];
    o.shoes = shoes || ['#15151a', 'leather'];
    if (o.top === 'aodai' && !o.hat) o.hat = 'khandong';
    if (!o.hat) o.hat = ch.age < 30 && !/suit|vest|comple|blazer|so mi trang/.test(norm(ch.outfit)) ? pick(['cap', 'capBack', 'beanie', 'cap', 'bucket']) : 'fedora';
    if (o.top === 'jacket' && /ca vat/.test(norm(ch.outfit)) === false && /suit|comple|vest/.test(norm(ch.outfit)) && Math.random() < 0.3) o.bowtie = true, o.tie = '#15151a';
    if (o.top === 'shirt' && o.tie) { /* sơ mi + cà vạt */ }
  }
  return o;
}

// ---------- điệu nhảy theo thể loại (chỉ số trong DANCES) ----------
// 0 nhún 1 lắc 2 xoay 3 robot 4 disco 5 hiphop 6 vỗ tay 7 sóng 8 lộn 9 xoay đầu 10 gà 11 máy bay 12 đá chân 13 moonwalk 14 waltz 15 tango 16 salsa
const STYLE = [
  ['k-pop|kpop', [1, 4, 6, 7, 12]], ['hip-hop|hiphop', [5, 0, 3, 13]], ['breaking|break', [9, 8, 2, 5]], ['street', [5, 13, 12, 3]],
  ['popping|locking', [3, 7, 13]], ['house', [0, 12, 13, 4]], ['freestyle', [0, 1, 4, 5, 7, 12, 13]], ['jazz', [6, 1, 12, 2]],
  ['contemporary|modern', [7, 2, 11, 1]], ['ballroom|waltz', [14, 2, 7]], ['tango', [15, 14]], ['salsa|cha-cha|cha cha|latin', [16, 1, 4]],
  ['folk', [6, 1, 2, 14]],
];
export function danceFor(style) { const s = norm(style); for (const [k, list] of STYLE) if (new RegExp(k).test(s)) return pick(list); return null; }
export function dancePool(style) { const s = norm(style); for (const [k, list] of STYLE) if (new RegExp(k).test(s)) return list; return null; }
const CALM = /lich lam|diem tinh|tram tu|dinh dac|tinh te|thu thai|diu dang|muot ma|duyen dang|am ap|mo mong|lang man|chuyen nghiep/;
const HYPER = /nang dong|soi noi|tinh nghich|vui ve|tu do/;
export function tempoFor(p) { const s = norm(p); return CALM.test(s) ? 0.5 : 1; }
export function hyperFor(p) { return HYPER.test(norm(p)); }
export function shapeFor(age, female) {
  if (age >= 45) return pick(['normal', 'chubby', 'normal']);
  if (age >= 30) return pick(['normal', 'normal', 'athletic', female ? 'curvy' : 'chubby']);
  return pick(['slim', 'normal', 'athletic', female ? 'curvy' : 'slim']);
}
