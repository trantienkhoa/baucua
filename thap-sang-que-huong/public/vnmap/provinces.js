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

  // Đố vui quê hương — mỗi tỉnh 3 câu; đáp án là tỉnh MỚI (gõ đúng tên tỉnh mới mới được tính)
  const QUIZ_BY = {
    'ha-noi': ["Hồ Gươm và tháp Rùa ở đâu?", "Văn Miếu – Quốc Tử Giám, trường đại học đầu tiên của nước ta, ở đâu?", "Làng gốm Bát Tràng thuộc tỉnh, thành nào?"],
    'hue': ["Đại Nội và lăng tẩm các vua Nguyễn ở đâu?", "Chùa Thiên Mụ bên bờ sông Hương thuộc tỉnh, thành nào?", "Cầu Trường Tiền nổi tiếng ở thành phố nào?"],
    'lai-chau': ["Cầu kính Rồng Mây trên đèo Ô Quy Hồ thuộc tỉnh nào?", "Sông Đà chảy vào nước ta ở tỉnh nào?", "Đỉnh Pu Si Lung, ngọn núi cao thứ hai Việt Nam, thuộc tỉnh nào?"],
    'dien-bien': ["Đồi A1, nơi diễn ra trận đánh lịch sử năm 1954, ở tỉnh nào?", "Điểm cực Tây A Pa Chải của Tổ quốc thuộc tỉnh nào?", "Cánh đồng Mường Thanh rộng lớn ở tỉnh nào?"],
    'son-la': ["Cao nguyên Mộc Châu ở tỉnh nào?", "Nhà máy thủy điện lớn nhất Đông Nam Á trên sông Đà ở tỉnh nào?", "Rừng thông Bản Áng ở Mộc Châu thuộc tỉnh nào?"],
    'lang-son': ["Ải Chi Lăng lịch sử thuộc tỉnh nào?", "Cửa khẩu Hữu Nghị thuộc tỉnh nào?", "Núi Tô Thị và động Tam Thanh ở tỉnh nào?"],
    'quang-ninh': ["Vịnh Hạ Long thuộc tỉnh nào?", "Chùa Đồng trên đỉnh Yên Tử thuộc tỉnh nào?", "Đảo Cô Tô thuộc tỉnh nào?"],
    'thanh-hoa': ["Biển Sầm Sơn ở tỉnh nào?", "Thành nhà Hồ, di sản thế giới, ở tỉnh nào?", "Khu bảo tồn Pù Luông với ruộng bậc thang thuộc tỉnh nào?"],
    'nghe-an': ["Làng Sen quê Bác Hồ ở tỉnh nào?", "Biển Cửa Lò thuộc tỉnh nào?", "Vườn quốc gia Pù Mát thuộc tỉnh nào?"],
    'ha-tinh': ["Ngã ba Đồng Lộc, nơi mười cô gái hy sinh, ở tỉnh nào?", "Khu lưu niệm đại thi hào Nguyễn Du ở Tiên Điền thuộc tỉnh nào?", "Biển Thiên Cầm thuộc tỉnh nào?"],
    'cao-bang': ["Thác Bản Giốc ở tỉnh nào?", "Hang Pác Bó, nơi Bác Hồ về nước năm 1941, thuộc tỉnh nào?", "Hồ Thang Hen thuộc tỉnh nào?"],
    'tuyen-quang': ["Cây đa Tân Trào thuộc tỉnh nào?", "Cột cờ Lũng Cú nơi địa đầu Tổ quốc nay thuộc tỉnh nào?", "Đèo Mã Pì Lèng nay thuộc tỉnh nào?"],
    'lao-cai': ["Thị trấn sương mù Sa Pa nay thuộc tỉnh nào?", "Đỉnh Fansipan, nóc nhà Đông Dương, thuộc tỉnh nào?", "Ruộng bậc thang Mù Cang Chải nay thuộc tỉnh nào?"],
    'thai-nguyen': ["Chè Tân Cương nổi tiếng thuộc tỉnh nào?", "Hồ Núi Cốc thuộc tỉnh nào?", "Hồ Ba Bể nay thuộc tỉnh nào?"],
    'phu-tho': ["Đền Hùng ở tỉnh nào?", "Khu nghỉ mát Tam Đảo nay thuộc tỉnh nào?", "Nhà máy thủy điện Hòa Bình nay thuộc tỉnh nào?"],
    'bac-ninh': ["Quê hương dân ca quan họ là tỉnh nào?", "Làng tranh Đông Hồ thuộc tỉnh nào?", "Vùng vải thiều Lục Ngạn nay thuộc tỉnh nào?"],
    'hung-yen': ["Phố Hiến xưa thuộc tỉnh nào?", "Chùa Keo cổ kính ở Thái Bình nay thuộc tỉnh nào?", "Quê lúa Thái Bình nay thuộc tỉnh nào?"],
    'hai-phong': ["Đảo Cát Bà thuộc thành phố nào?", "Bãi biển Đồ Sơn thuộc thành phố nào?", "Khu di tích Côn Sơn – Kiếp Bạc nay thuộc tỉnh, thành nào?"],
    'ninh-binh': ["Quần thể danh thắng Tràng An ở tỉnh nào?", "Nhà thờ đá Phát Diệm thuộc tỉnh nào?", "Chùa Tam Chúc ở Hà Nam nay thuộc tỉnh nào?"],
    'quang-tri': ["Địa đạo Vịnh Mốc thuộc tỉnh nào?", "Cầu Hiền Lương bên sông Bến Hải thuộc tỉnh nào?", "Hang Sơn Đoòng, hang động lớn nhất thế giới, nay thuộc tỉnh nào?"],
    'da-nang': ["Phố cổ Hội An nay thuộc tỉnh, thành nào?", "Khu du lịch Bà Nà với Cầu Vàng thuộc thành phố nào?", "Cầu Rồng phun lửa ở thành phố nào?"],
    'quang-ngai': ["Đảo Lý Sơn thuộc tỉnh nào?", "Nhà thờ gỗ Kon Tum nay thuộc tỉnh nào?", "Ngã ba Đông Dương nơi giáp Lào và Campuchia nay thuộc tỉnh nào?"],
    'gia-lai': ["Biển Hồ T’Nưng ở phố núi Pleiku thuộc tỉnh nào?", "Eo Gió ở Quy Nhơn nay thuộc tỉnh nào?", "Bãi biển Kỳ Co ở Bình Định nay thuộc tỉnh nào?"],
    'khanh-hoa': ["Tháp Bà Ponagar ở Nha Trang thuộc tỉnh nào?", "Vịnh Vĩnh Hy ở Ninh Thuận nay thuộc tỉnh nào?", "Quần đảo Trường Sa thuộc tỉnh nào?"],
    'lam-dong': ["Hồ Xuân Hương ở Đà Lạt thuộc tỉnh nào?", "Đồi cát Mũi Né nay thuộc tỉnh nào?", "Hồ Tà Đùng ở Đắk Nông nay thuộc tỉnh nào?"],
    'dak-lak': ["Thủ phủ cà phê Buôn Ma Thuột thuộc tỉnh nào?", "Gành Đá Đĩa ở Phú Yên nay thuộc tỉnh nào?", "Buôn Đôn nổi tiếng săn bắt, thuần dưỡng voi thuộc tỉnh nào?"],
    'tp-hcm': ["Chợ Bến Thành ở thành phố nào?", "Địa đạo Củ Chi thuộc tỉnh, thành nào?", "Côn Đảo nay thuộc tỉnh, thành nào?"],
    'dong-nai': ["Vườn quốc gia Nam Cát Tiên phần lớn thuộc tỉnh nào?", "Thành phố Biên Hòa thuộc tỉnh nào?", "Thủ phủ hạt điều Bình Phước nay thuộc tỉnh nào?"],
    'tay-ninh': ["Núi Bà Đen ở tỉnh nào?", "Tòa Thánh Cao Đài ở tỉnh nào?", "Tỉnh Long An nay sáp nhập vào tỉnh nào?"],
    'can-tho': ["Chợ nổi Cái Răng ở đâu?", "Bến Ninh Kiều thuộc thành phố nào?", "Chùa Dơi ở Sóc Trăng nay thuộc tỉnh, thành nào?"],
    'vinh-long': ["Xứ dừa Bến Tre nay thuộc tỉnh nào?", "Ao Bà Om ở Trà Vinh nay thuộc tỉnh nào?", "Cù lao An Bình trên sông Tiền thuộc tỉnh nào?"],
    'dong-thap': ["Làng hoa Sa Đéc thuộc tỉnh nào?", "Vườn quốc gia Tràm Chim thuộc tỉnh nào?", "Chợ nổi Cái Bè ở Tiền Giang nay thuộc tỉnh nào?"],
    'ca-mau': ["Mũi đất cực Nam Tổ quốc thuộc tỉnh nào?", "Nhà Công tử Bạc Liêu nay thuộc tỉnh nào?", "Cánh đồng điện gió Bạc Liêu nay thuộc tỉnh nào?"],
    'an-giang': ["Đảo Phú Quốc nay thuộc tỉnh nào?", "Miếu Bà Chúa Xứ núi Sam thuộc tỉnh nào?", "Rừng tràm Trà Sư thuộc tỉnh nào?"],
  };
  const QUIZ = []; for (const a in QUIZ_BY) for (const q of QUIZ_BY[a]) QUIZ.push({ q, a });

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

  const api = { LIST, BY_ID, findProvince, isExactAnswer, deacc, QUIZ, QUIZ_BY, COUNT: LIST.length, TITLES, levelOf, xpFor, titleOf, iconOf, rankName };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.VN_PROV = api;
})(typeof window !== 'undefined' ? window : globalThis);
