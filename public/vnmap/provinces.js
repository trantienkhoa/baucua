// 34 tỉnh, thành sau sắp xếp 2025 + tên cũ, tên thành phố nổi tiếng, viết tắt → tỉnh mới.
// Dùng chung cho máy chủ (require) và trình duyệt (window.VN_PROV).
(function (root) {
  const P = [
    // id, tên hiển thị, nhãn ngắn trên bản đồ, miền, các cách gọi khác (tên cũ đã gộp, thành phố, viết tắt), câu giới thiệu
    ['ha-noi', 'Hà Nội', 'Hà Nội', 'bac', ['ha noi', 'hanoi', 'hn', 'thu do', 'ha tay', 'son tay', 'ha dong'], 'Thủ đô ngàn năm văn hiến'],
    ['hue', 'Huế', 'Huế', 'trung', ['hue', 'thua thien hue', 'tt hue', 'co do'], 'xứ cố đô mộng mơ bên dòng sông Hương'],
    ['lai-chau', 'Lai Châu', 'Lai Châu', 'bac', ['lai chau'], 'miền núi non hùng vĩ nơi cực Tây Bắc'],
    ['dien-bien', 'Điện Biên', 'Điện Biên', 'bac', ['dien bien', 'dien bien phu'], 'mảnh đất lịch sử lừng lẫy năm châu'],
    ['son-la', 'Sơn La', 'Sơn La', 'bac', ['son la', 'moc chau'], 'cao nguyên Mộc Châu mùa hoa mận trắng'],
    ['lang-son', 'Lạng Sơn', 'Lạng Sơn', 'bac', ['lang son', 'xu lang'], 'xứ Lạng với ải Chi Lăng và núi Tô Thị'],
    ['quang-ninh', 'Quảng Ninh', 'Quảng Ninh', 'bac', ['quang ninh', 'ha long', 'mong cai', 'cam pha', 'uong bi', 'van don', 'co to'], 'vịnh Hạ Long kỳ quan thiên nhiên'],
    ['thanh-hoa', 'Thanh Hóa', 'Thanh Hóa', 'trung', ['thanh hoa', 'xu thanh', 'sam son'], 'xứ Thanh địa linh nhân kiệt'],
    ['nghe-an', 'Nghệ An', 'Nghệ An', 'trung', ['nghe an', 'xu nghe', 'tp vinh', 'thanh pho vinh', 'cua lo'], 'xứ Nghệ quê hương Bác Hồ'],
    ['ha-tinh', 'Hà Tĩnh', 'Hà Tĩnh', 'trung', ['ha tinh'], 'đất học núi Hồng sông La'],
    ['cao-bang', 'Cao Bằng', 'Cao Bằng', 'bac', ['cao bang', 'ban gioc'], 'thác Bản Giốc hùng vĩ nơi biên cương'],
    ['tuyen-quang', 'Tuyên Quang', 'Tuyên Quang', 'bac', ['tuyen quang', 'ha giang', 'dong van', 'meo vac', 'tan trao'], 'thủ đô kháng chiến và cao nguyên đá Hà Giang'],
    ['lao-cai', 'Lào Cai', 'Lào Cai', 'bac', ['lao cai', 'yen bai', 'sa pa', 'sapa', 'mu cang chai', 'fansipan', 'nghia lo'], 'Sa Pa mờ sương và ruộng bậc thang Mù Cang Chải'],
    ['thai-nguyen', 'Thái Nguyên', 'Thái Nguyên', 'bac', ['thai nguyen', 'bac kan', 'bac can', 'ba be'], 'đệ nhất danh trà và hồ Ba Bể'],
    ['phu-tho', 'Phú Thọ', 'Phú Thọ', 'bac', ['phu tho', 'vinh phuc', 'hoa binh', 'viet tri', 'vinh yen', 'tam dao', 'mai chau', 'dat to'], 'đất Tổ Hùng Vương'],
    ['bac-ninh', 'Bắc Ninh', 'Bắc Ninh', 'bac', ['bac ninh', 'bac giang', 'kinh bac', 'tu son', 'luc ngan'], 'xứ Kinh Bắc quê hương quan họ'],
    ['hung-yen', 'Hưng Yên', 'Hưng Yên', 'bac', ['hung yen', 'thai binh', 'pho hien'], 'nhãn lồng Hưng Yên và quê lúa Thái Bình'],
    ['hai-phong', 'Hải Phòng', 'Hải Phòng', 'bac', ['hai phong', 'hai duong', 'hp', 'dat cang', 'do son', 'cat ba', 'chi linh'], 'thành phố Cảng hoa phượng đỏ'],
    ['ninh-binh', 'Ninh Bình', 'Ninh Bình', 'bac', ['ninh binh', 'nam dinh', 'ha nam', 'trang an', 'tam coc', 'phu ly'], 'cố đô Hoa Lư và Tràng An non nước'],
    ['quang-tri', 'Quảng Trị', 'Quảng Trị', 'trung', ['quang tri', 'quang binh', 'dong hoi', 'phong nha', 'dong ha'], 'Phong Nha Kẻ Bàng và dòng Thạch Hãn'],
    ['da-nang', 'Đà Nẵng', 'Đà Nẵng', 'trung', ['da nang', 'danang', 'quang nam', 'hoi an', 'tam ky', 'my son'], 'thành phố đáng sống và phố cổ Hội An'],
    ['quang-ngai', 'Quảng Ngãi', 'Quảng Ngãi', 'trung', ['quang ngai', 'kon tum', 'kontum', 'ly son'], 'đảo Lý Sơn và đại ngàn Kon Tum'],
    ['gia-lai', 'Gia Lai', 'Gia Lai', 'trung', ['gia lai', 'binh dinh', 'pleiku', 'quy nhon', 'an khe'], 'phố núi Pleiku và biển Quy Nhơn'],
    ['khanh-hoa', 'Khánh Hòa', 'Khánh Hòa', 'trung', ['khanh hoa', 'ninh thuan', 'nha trang', 'cam ranh', 'phan rang', 'truong sa'], 'biển Nha Trang và nắng gió Ninh Thuận'],
    ['lam-dong', 'Lâm Đồng', 'Lâm Đồng', 'trung', ['lam dong', 'dak nong', 'dac nong', 'binh thuan', 'da lat', 'dalat', 'bao loc', 'phan thiet', 'mui ne', 'gia nghia'], 'Đà Lạt ngàn hoa và biển Mũi Né'],
    ['dak-lak', 'Đắk Lắk', 'Đắk Lắk', 'trung', ['dak lak', 'daklak', 'dac lac', 'phu yen', 'buon ma thuot', 'bmt', 'tuy hoa'], 'thủ phủ cà phê và xứ hoa vàng cỏ xanh Phú Yên'],
    ['tp-hcm', 'TP Hồ Chí Minh', 'TP HCM', 'nam', ['ho chi minh', 'tp hcm', 'tphcm', 'hcm', 'sai gon', 'saigon', 'sg', 'binh duong', 'ba ria', 'vung tau', 'brvt', 'thu dau mot', 'con dao', 'thu duc'], 'Sài Gòn hoa lệ năng động'],
    ['dong-nai', 'Đồng Nai', 'Đồng Nai', 'nam', ['dong nai', 'binh phuoc', 'bien hoa', 'dong xoai'], 'Biên Hòa và rừng Nam Cát Tiên'],
    ['tay-ninh', 'Tây Ninh', 'Tây Ninh', 'nam', ['tay ninh', 'long an', 'tan an', 'nui ba den'], 'núi Bà Đen và vựa lúa Long An'],
    ['can-tho', 'Cần Thơ', 'Cần Thơ', 'nam', ['can tho', 'soc trang', 'hau giang', 'vi thanh', 'cai rang'], 'Tây Đô với chợ nổi Cái Răng'],
    ['vinh-long', 'Vĩnh Long', 'Vĩnh Long', 'nam', ['vinh long', 'ben tre', 'tra vinh'], 'xứ dừa Bến Tre và miệt vườn sông nước'],
    ['dong-thap', 'Đồng Tháp', 'Đồng Tháp', 'nam', ['dong thap', 'tien giang', 'my tho', 'cao lanh', 'sa dec', 'go cong'], 'đất sen hồng và trái cây Tiền Giang'],
    ['ca-mau', 'Cà Mau', 'Cà Mau', 'nam', ['ca mau', 'bac lieu', 'dat mui'], 'mũi Cà Mau nơi cực Nam Tổ quốc'],
    ['an-giang', 'An Giang', 'An Giang', 'nam', ['an giang', 'kien giang', 'phu quoc', 'rach gia', 'chau doc', 'long xuyen', 'ha tien'], 'đảo ngọc Phú Quốc và vùng Bảy Núi'],
  ];

  const deacc = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const norm = t => ' ' + deacc(t).replace(/[^a-z0-9]+/g, ' ').trim() + ' ';

  const LIST = P.map(([id, name, short, region, aliases, intro]) => ({ id, name, short, region, aliases, intro }));
  const BY_ID = {}; for (const p of LIST) BY_ID[p.id] = p;
  // cách gọi dài khớp trước ("thanh pho vinh" trước "vinh long"…)
  const ALIASES = [];
  for (const p of LIST) for (const a of new Set([deacc(p.name), ...p.aliases])) ALIASES.push([' ' + a + ' ', p.id]);
  ALIASES.sort((a, b) => b[0].length - a[0].length);

  // tìm tỉnh trong bình luận. Trả id hoặc null.
  function findProvince(text) {
    let s = norm(text); if (s.length < 3) return null;
    // "tp" / "thanh pho" đứng trước tên: bỏ đi cho dễ khớp (tp hue, thanh pho can tho…), trừ các cách gọi có "tp" sẵn
    for (const [a, id] of ALIASES) if (s.includes(a)) return id;
    s = s.replace(/ (tp|thanh pho|tinh|que|o|em o|minh o|que em|que minh) /g, ' ');
    for (const [a, id] of ALIASES) if (s.includes(a)) return id;
    return null;
  }

  // Đố vui quê hương — đáp án là tỉnh MỚI (tên cũ cũng được tính vì tự quy về tỉnh mới)
  const QUIZ = [
    ['Vịnh Hạ Long thuộc tỉnh nào?', 'quang-ninh'],
    ['Phố cổ Hội An nay thuộc tỉnh, thành nào?', 'da-nang'],
    ['Chợ nổi Cái Răng ở đâu?', 'can-tho'],
    ['Đảo Phú Quốc nay thuộc tỉnh nào?', 'an-giang'],
    ['Thành phố Đà Lạt nay thuộc tỉnh nào?', 'lam-dong'],
    ['Sa Pa nay thuộc tỉnh nào?', 'lao-cai'],
    ['Đền Hùng ở tỉnh nào?', 'phu-tho'],
    ['Quê hương quan họ là tỉnh nào?', 'bac-ninh'],
    ['Mũi đất cực Nam Tổ quốc thuộc tỉnh nào?', 'ca-mau'],
    ['Thác Bản Giốc ở tỉnh nào?', 'cao-bang'],
    ['Động Phong Nha nay thuộc tỉnh nào?', 'quang-tri'],
    ['Biển Nha Trang thuộc tỉnh nào?', 'khanh-hoa'],
    ['Cố đô Hoa Lư ở tỉnh nào?', 'ninh-binh'],
    ['Thành phố Vũng Tàu nay thuộc tỉnh, thành nào?', 'tp-hcm'],
    ['Đảo Lý Sơn nay thuộc tỉnh nào?', 'quang-ngai'],
    ['Thủ phủ cà phê Buôn Ma Thuột thuộc tỉnh nào?', 'dak-lak'],
    ['Núi Bà Đen ở tỉnh nào?', 'tay-ninh'],
    ['Xứ dừa Bến Tre nay thuộc tỉnh nào?', 'vinh-long'],
    ['Cao nguyên đá Đồng Văn nay thuộc tỉnh nào?', 'tuyen-quang'],
    ['Hồ Ba Bể nay thuộc tỉnh nào?', 'thai-nguyen'],
    ['Thành phố Quy Nhơn nay thuộc tỉnh nào?', 'gia-lai'],
    ['Biển Sầm Sơn ở tỉnh nào?', 'thanh-hoa'],
    ['Đảo Cát Bà thuộc thành phố nào?', 'hai-phong'],
    ['Cầu Rồng phun lửa ở thành phố nào?', 'da-nang'],
    ['Đại Nội và lăng tẩm các vua Nguyễn ở đâu?', 'hue'],
    ['Làng Sen quê Bác Hồ ở tỉnh nào?', 'nghe-an'],
    ['Mũi Né nay thuộc tỉnh nào?', 'lam-dong'],
    ['Thành phố Biên Hòa thuộc tỉnh nào?', 'dong-nai'],
    ['Làng hoa Sa Đéc nay thuộc tỉnh nào?', 'dong-thap'],
    ['Cao nguyên Mộc Châu ở tỉnh nào?', 'son-la'],
    ['Quê lúa Thái Bình nay thuộc tỉnh nào?', 'hung-yen'],
    ['Phố núi Pleiku thuộc tỉnh nào?', 'gia-lai'],
    ['Côn Đảo nay thuộc tỉnh, thành nào?', 'tp-hcm'],
    ['Chùa Bái Đính ở tỉnh nào?', 'ninh-binh'],
    ['Ruộng bậc thang Mù Cang Chải nay thuộc tỉnh nào?', 'lao-cai'],
    ['Tam Đảo nay thuộc tỉnh nào?', 'phu-tho'],
    ['Phố cổ Đồng Văn và đèo Mã Pì Lèng nay thuộc tỉnh nào?', 'tuyen-quang'],
    ['Bãi biển Mỹ Khê ở thành phố nào?', 'da-nang'],
    ['Hồ Gươm ở đâu?', 'ha-noi'],
    ['Thánh địa Mỹ Sơn nay thuộc tỉnh, thành nào?', 'da-nang'],
  ].map(([q, a]) => ({ q, a }));

  // Đố vui: chỉ tính đúng khi gõ CHÍNH XÁC tên tỉnh mới (không tính tên tỉnh cũ đã gộp, tên thành phố…)
  const EXACT_EXTRA = { 'tp-hcm': ['ho chi minh', 'tp hcm', 'tphcm', 'hcm', 'tp ho chi minh', 'thanh pho ho chi minh'], 'ha-noi': ['hanoi'], 'da-nang': ['danang'], 'hue': ['thua thien hue'], 'dak-lak': ['daklak', 'dac lac'] };
  function isExactAnswer(text, id) {
    const p = BY_ID[id]; if (!p) return false;
    const s = norm(text);
    return [deacc(p.name), deacc(p.short), ...(EXACT_EXTRA[id] || [])].some(n => s.includes(' ' + n + ' '));
  }

  // Chức vụ của tỉnh theo điểm tích luỹ (lưu qua các phiên). Cấp n cần 8·(n−1)² điểm.
  // {xa} = xã / phường, {dv} = tỉnh / TP (thành phố trực thuộc trung ương)
  const TITLES = ['Công dân', 'Tổ phó dân phố', 'Tổ trưởng dân phố', 'Trưởng thôn', 'Phó Chủ tịch {xa}', 'Chủ tịch {xa}', 'Phó Giám đốc Sở', 'Giám đốc Sở', 'Phó Chủ tịch {dv}', 'Chủ tịch {dv}'];
  const TITLE_ICON = ['🧑', '🏘️', '🏠', '🌾', '📋', '🏛️', '💼', '🏢', '🎖️', '👑'];
  const CITIES = new Set(['ha-noi', 'tp-hcm', 'hai-phong', 'da-nang', 'hue', 'can-tho']);
  const clampLv = lv => Math.max(1, Math.min(TITLES.length, lv || 1));
  const levelOf = xp => Math.min(TITLES.length, Math.floor(Math.sqrt(Math.max(0, xp) / 8)) + 1);
  const xpFor = lv => 8 * (lv - 1) * (lv - 1);
  const titleOf = (lv, prov) => { const c = CITIES.has(prov); return TITLES[clampLv(lv) - 1].replace('{xa}', c ? 'phường' : 'xã').replace('{dv}', c ? 'TP' : 'tỉnh'); };
  const iconOf = lv => TITLE_ICON[clampLv(lv) - 1];
  // "Chủ tịch tỉnh Nghệ An", "Chủ tịch TP Hồ Chí Minh", "Trưởng thôn (Huế)"
  function rankName(lv, prov) {
    const p = BY_ID[prov]; const t = titleOf(lv, prov);
    if (!p) return t;
    const place = p.name.replace(/^TP /, '');
    return /(tỉnh|TP|Sở)$/.test(t) ? `${t} ${place}` : `${t} · ${place}`;
  }

  const api = { LIST, BY_ID, findProvince, isExactAnswer, deacc, QUIZ, COUNT: LIST.length, TITLES, levelOf, xpFor, titleOf, iconOf, rankName };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.VN_PROV = api;
})(typeof window !== 'undefined' ? window : globalThis);
