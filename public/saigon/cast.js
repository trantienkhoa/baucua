// Dàn nhân vật cốt truyện "Sài Gòn Truy Kích" — nhân vật gốc, chân dung vẽ bằng SVG.
export const CAST = {
  chuBay: {
    name: 'Chú Bảy Xích Lô', role: 'Người dẫn chuyện', color: '#f2b84b',
    bio: 'Đạp xích lô 40 năm, thuộc từng con hẻm Xứ Rồng. Sáng bán cà phê vợt, tối kể chuyện giang hồ. Ai mới vào thành phố cũng phải ghé chú hỏi đường.',
    look: { skin: '#d9a173', hair: 'bald', hairColor: '#cfcfcf', shirt: '#7a4a2a', extra: ['mustache', 'scarf'] },
  },
  tuan: {
    name: 'Tuấn "Bô Lửa"', role: 'Đội trưởng Rồng Đỏ', color: '#ff3b5c',
    bio: 'Thợ độ xe Quận 4, chiếc Cub cũ của anh phun lửa ở ống bô. Nóng tính, trọng nghĩa khí, không bao giờ bỏ anh em giữa đường.',
    look: { skin: '#e8b48a', hair: 'spiky', hairColor: '#1a1a1a', streak: '#ff3b5c', shirt: '#d81f3f', extra: ['goggles', 'chainSilver'] },
  },
  vy: {
    name: 'Vy "Lốc Xoáy"', role: 'Đội trưởng Hổ Xanh', color: '#22c8ff',
    bio: 'Tay lái lụa, giỏi máy tính, đổi được đèn giao thông cả quận chỉ bằng điện thoại. Bình tĩnh, tính trước ba nước.',
    look: { skin: '#f1c7a0', hair: 'long', hairColor: '#1b2a3a', streak: '#22c8ff', shirt: '#14161c', extra: ['headset', 'earring'] },
  },
  maTu: {
    name: 'Má Tư Chợ Nổi', role: 'Bà trùm miền Tây', color: '#3dd68c',
    bio: 'Có 30 chiếc ghe trên sông, tiếng nói có trọng lượng nhất Chợ Nổi. Thương người nghèo, hay "lì xì" cả chợ khi vui.',
    look: { skin: '#c98d5e', hair: 'bun', hairColor: '#2a1a12', shirt: '#7b3fa0', extra: ['nonLa', 'scarf'] },
  },
  hacLong: {
    name: 'Đại Ca Hắc Long', role: 'Trùm phản diện', color: '#ffc23a',
    bio: 'Muốn nuốt trọn Xứ Rồng. Áo sơ mi hoa, dây chuyền vàng, xe bọc thép đen. Treo thưởng truy nã bất kỳ ai dám nổi bật hơn hắn.',
    look: { skin: '#d8a27a', hair: 'slick', hairColor: '#0d0d0d', shirt: '#a01428', extra: ['shades', 'chainGold', 'scar', 'flowers'] },
  },
  anhHai: {
    name: 'Anh Hai Garage', role: 'Thợ độ xe', color: '#ff8a2a',
    bio: 'Chủ garage dưới chân cầu. Đưa xu là độ: từ xe điện cân bằng lên siêu xe, lên xe hoa, rồi… khinh khí cầu. Câu cửa miệng: "Xe nào cũng độ được!"',
    look: { skin: '#e0ac80', hair: 'short', hairColor: '#2a1a10', shirt: '#2a5aa8', extra: ['bandana', 'stubble'] },
  },
  beNa: {
    name: 'Bé Na Bản Tin', role: 'Phóng viên Xứ Rồng 24h', color: '#c77dff',
    bio: 'Streamer kiêm phóng viên, có mặt ở mọi vụ lùm xùm. Ai tặng quà lớn là lên bản tin của Na ngay.',
    look: { skin: '#f6d4b8', hair: 'bob', hairColor: '#ff7ac8', shirt: '#4a2a8a', extra: ['mic', 'earring'] },
  },
};

const pick = a => a[Math.floor(Math.random() * a.length)];
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

export const LINES = {
  intro: [
    ['chuBay', 'Tới {d} rồi bà con ơi! {sub}. Phe nào mạnh thì giữ được khu này!'],
    ['chuBay', 'Ngồi chắc nha, mình đang ở {d}. Bình luận 1 vô Rồng Đỏ, 2 vô Hổ Xanh!'],
    ['chuBay', '{d} đây! Ai tặng quà nhiều là làm vua khu này!'],
  ],
  rallyRed: [['tuan', 'Anh em Rồng Đỏ đâu, lên ga!!'], ['tuan', 'Bô lửa phun rồi, Hổ Xanh né ra!'], ['tuan', 'Rồng Đỏ không lùi bước nha anh em!']],
  rallyBlue: [['vy', 'Hổ Xanh vô đội nhanh, gõ số 2!'], ['vy', 'Đèn xanh cả thành phố cho Hổ Xanh!'], ['vy', 'Bình tĩnh, Hổ Xanh lật kèo được!']],
  capRed: [['tuan', '{d} là của Rồng Đỏ rồi nha!'], ['tuan', 'Cắm cờ đỏ ở {d}! Anh em giỏi quá!']],
  capBlue: [['vy', 'Hổ Xanh chiếm {d}, đẹp!'], ['vy', 'Cờ xanh tung bay ở {d} rồi!']],
  bossIn: [['hacLong', 'Ha ha! Thành phố này là của Hắc Long!'], ['hacLong', 'Thả tim vào mặt tao xem nào, lũ nhóc!']],
  bossDown: [['hacLong', 'Không thể nào… Tao sẽ quay lại!']],
  bossEscape: [['hacLong', 'Lũ yếu đuối! Hẹn gặp lại!']],
  chase: [['hacLong', 'Đàn em đâu! Rượt {name} cho tao!'], ['hacLong', 'Treo thưởng truy nã {name}! Bắt cho bằng được!']],
  escaped: [['vy', '{name} cắt đuôi thành công! Quá đỉnh!'], ['tuan', '{name} chạy như gió, đàn em Hắc Long hít khói!']],
  money: [['maTu', 'Má Tư lì xì nè bà con! Cảm ơn {name} nha!'], ['maTu', '{name} rải tiền cả khu, Má thương!']],
  upgrade: [['anhHai', 'Xe mới ra lò cho {name}: {veh}!'], ['anhHai', 'Độ xong rồi đó {name}, {veh} chạy thử đi!']],
  airdrop: [['beNa', 'Tin nóng: trực thăng thả hàng cho phe {team}, quà của {name}!']],
  boss: [['beNa', 'Khẩn cấp! Hắc Long xuất hiện ở {d}! Thả tim để hạ hắn!']],
  king: [['beNa', 'Chấn động! {name} chính thức thành TRÙM XỨ RỒNG!']],
  season: [['chuBay', 'Hết mùa rồi! Phe {team} thắng với {n} khu. Mùa mới bắt đầu nha!']],
  idle: [
    ['chuBay', 'Thả tim cho đủ mục tiêu là Hắc Long xuất hiện đó nghe!'],
    ['anhHai', 'Tặng quà càng nhiều càng lên đời: xe hoa, khinh khí cầu, rồi đứng trên rồng vàng luôn!'],
    ['chuBay', 'Gõ chào, nhảy, chạy, ngồi là nhân vật của bà con làm theo liền!'],
    ['beNa', 'Ai lên top 1 sẽ có tên trên bảng đèn khắp thành phố!'],
    ['tuan', 'Bình luận số 1 vô đội Rồng Đỏ với anh!'],
    ['vy', 'Bình luận số 2, Hổ Xanh đang cần bạn!'],
  ],
};
export function line(kind, vars = {}) { const [who, s] = pick(LINES[kind]); return { who, text: fill(s, vars) }; }

// ---------- chân dung SVG ----------
let uid = 0;
export function portrait(key, size = 96) {
  const c = CAST[key], L = c.look, S = L.skin, H = L.hairColor, id = key + (++uid);
  const p = [];
  p.push(`<defs><radialGradient id="bg${id}" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="${c.color}" stop-opacity="0.95"/><stop offset="1" stop-color="#0a0614"/></radialGradient><clipPath id="cl${id}"><circle cx="60" cy="60" r="58"/></clipPath></defs>`);
  p.push(`<g clip-path="url(#cl${id})"><rect width="120" height="120" fill="url(#bg${id})"/>`);
  // vai + áo
  p.push(`<path d="M10 120 Q14 88 42 82 L78 82 Q106 88 110 120 Z" fill="${L.shirt}"/>`);
  if (L.extra.includes('flowers')) for (const [x, y] of [[26, 100], [44, 94], [80, 96], [96, 108], [62, 112], [34, 114]]) p.push(`<circle cx="${x}" cy="${y}" r="4" fill="#ffd23a"/><circle cx="${x}" cy="${y}" r="1.6" fill="#fff"/>`);
  p.push(`<rect x="51" y="70" width="18" height="16" rx="6" fill="${S}"/>`);
  if (L.hair === 'long') p.push(`<path d="M30 52 Q28 96 40 104 L80 104 Q92 96 90 52 Z" fill="${H}"/>${L.streak ? `<path d="M80 60 Q88 84 82 102 L78 102 Q84 82 76 62Z" fill="${L.streak}"/>` : ''}`);
  // mặt
  p.push(`<ellipse cx="60" cy="54" rx="21" ry="24" fill="${S}"/>`);
  p.push(`<ellipse cx="39" cy="56" rx="3.5" ry="6" fill="${S}"/><ellipse cx="81" cy="56" rx="3.5" ry="6" fill="${S}"/>`);
  // tóc
  const hair = {
    bald: `<path d="M38 50 Q40 40 46 40 L46 48 Z M82 50 Q80 40 74 40 L74 48 Z" fill="${H}"/>`,
    spiky: `<path d="M37 50 L36 34 L44 40 L46 24 L54 36 L60 20 L66 35 L74 24 L76 40 L84 34 L83 50 Q60 38 37 50Z" fill="${H}"/>${L.streak ? `<path d="M58 22 L60 20 L66 35 L62 38Z" fill="${L.streak}"/>` : ''}`,
    long: `<path d="M37 56 Q34 28 60 28 Q86 28 83 56 Q78 40 60 38 Q42 40 37 56Z" fill="${H}"/>`,
    bun: `<circle cx="60" cy="28" r="9" fill="${H}"/><path d="M38 52 Q38 32 60 32 Q82 32 82 52 Q72 40 60 40 Q48 40 38 52Z" fill="${H}"/>`,
    slick: `<path d="M37 50 Q36 28 62 28 Q86 30 83 50 Q80 38 62 36 Q46 36 37 50Z" fill="${H}"/><path d="M48 32 Q62 28 78 36" stroke="#444" stroke-width="1.5" fill="none"/>`,
    short: `<path d="M38 48 Q38 30 60 30 Q82 30 82 48 Q76 38 60 38 Q44 38 38 48Z" fill="${H}"/>`,
    bob: `<path d="M35 64 Q30 28 60 28 Q90 28 85 64 L78 64 Q80 42 60 40 Q40 42 42 64Z" fill="${H}"/>`,
  }[L.hair] || '';
  p.push(hair);
  // mắt, mày, miệng
  if (L.extra.includes('shades')) p.push(`<rect x="42" y="48" width="16" height="9" rx="3" fill="#0a0a0a"/><rect x="62" y="48" width="16" height="9" rx="3" fill="#0a0a0a"/><rect x="57" y="50" width="6" height="2" fill="#0a0a0a"/><rect x="44" y="49.5" width="5" height="2" fill="#555"/>`);
  else p.push(`<ellipse cx="51" cy="53" rx="2.6" ry="3" fill="#1a1a1a"/><ellipse cx="69" cy="53" rx="2.6" ry="3" fill="#1a1a1a"/><circle cx="52" cy="52" r="0.9" fill="#fff"/><circle cx="70" cy="52" r="0.9" fill="#fff"/><path d="M45 46 L56 45 M64 45 L75 46" stroke="${H === '#cfcfcf' ? '#999' : '#1a1a1a'}" stroke-width="2.2" stroke-linecap="round"/>`);
  p.push(`<path d="M60 56 L58 63 L62 63" stroke="#b07a5a" stroke-width="1.4" fill="none"/>`);
  p.push(key === 'hacLong' ? `<path d="M52 69 Q60 66 68 70" stroke="#5a2a1a" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : `<path d="M51 68 Q60 75 69 68" stroke="#7a2a2a" stroke-width="2.4" fill="#fff" stroke-linecap="round"/>`);
  if (L.extra.includes('mustache')) p.push(`<path d="M49 66 Q55 62 60 65 Q65 62 71 66 Q65 66 60 67 Q55 66 49 66Z" fill="#bdbdbd"/>`);
  if (L.extra.includes('stubble')) p.push(`<path d="M42 62 Q46 78 60 79 Q74 78 78 62 Q74 74 60 75 Q46 74 42 62Z" fill="#000" opacity="0.18"/>`);
  if (L.extra.includes('scar')) p.push(`<path d="M72 42 L78 60" stroke="#8a3a2a" stroke-width="2"/>`);
  if (L.extra.includes('earring')) p.push(`<circle cx="39" cy="63" r="2.6" fill="none" stroke="#ffd23a" stroke-width="1.6"/><circle cx="81" cy="63" r="2.6" fill="none" stroke="#ffd23a" stroke-width="1.6"/>`);
  if (L.extra.includes('goggles')) p.push(`<rect x="40" y="34" width="40" height="9" rx="4" fill="#3a2a1a"/><circle cx="50" cy="38.5" r="5" fill="#ffb84a" stroke="#222" stroke-width="2"/><circle cx="70" cy="38.5" r="5" fill="#ffb84a" stroke="#222" stroke-width="2"/>`);
  if (L.extra.includes('headset')) p.push(`<path d="M36 54 Q36 26 60 26 Q84 26 84 54" stroke="#222" stroke-width="4" fill="none"/><rect x="31" y="50" width="8" height="13" rx="3" fill="#22c8ff"/><rect x="81" y="50" width="8" height="13" rx="3" fill="#22c8ff"/><path d="M35 62 Q40 72 50 70" stroke="#222" stroke-width="2" fill="none"/>`);
  if (L.extra.includes('bandana')) p.push(`<path d="M37 44 Q60 30 83 44 L83 38 Q60 22 37 38Z" fill="#d83a2a"/><circle cx="50" cy="38" r="1.4" fill="#fff"/><circle cx="66" cy="35" r="1.4" fill="#fff"/><path d="M83 40 L94 46 L88 36Z" fill="#d83a2a"/>`);
  if (L.extra.includes('nonLa')) p.push(`<path d="M18 40 L60 6 L102 40 Q60 48 18 40Z" fill="#f2e2a6" stroke="#c9b06a" stroke-width="1.5"/><path d="M60 6 L40 37 M60 6 L80 37 M60 6 L60 44" stroke="#d9c27a" stroke-width="1"/>`);
  if (L.extra.includes('scarf')) p.push(`<path d="M38 84 Q60 96 82 84 L84 92 Q60 104 36 92Z" fill="#2a2a2a"/><path d="M40 86 L80 86 M38 90 L82 90" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 3"/>`);
  if (L.extra.includes('chainGold')) p.push(`<path d="M44 84 Q60 104 76 84" stroke="#ffd23a" stroke-width="3.5" fill="none"/><circle cx="60" cy="98" r="4" fill="#ffd23a"/>`);
  if (L.extra.includes('chainSilver')) p.push(`<path d="M46 84 Q60 100 74 84" stroke="#dfe6ee" stroke-width="2.4" fill="none"/>`);
  if (L.extra.includes('mic')) p.push(`<rect x="84" y="78" width="6" height="26" rx="2" fill="#222" transform="rotate(-20 87 90)"/><circle cx="90" cy="76" r="7" fill="#555"/><rect x="85" y="84" width="10" height="7" fill="${c.color}" transform="rotate(-20 90 88)"/>`);
  p.push(`</g><circle cx="60" cy="60" r="57" fill="none" stroke="${c.color}" stroke-width="4"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${size}" height="${size}">${p.join('')}</svg>`;
}
