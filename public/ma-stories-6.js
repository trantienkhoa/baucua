// Ngọn Lửa Cuối Cùng — kho truyện ma phần 6 (cách viết: xem đầu file ma-stories.js)
// Truyện hư cấu. Không máu me, không ai trong vòng lửa ({A},{B},{C}) bị bắt / bị nhập / bị hại.
window.MA_STORIES = (window.MA_STORIES || []).concat([
  // ===================== BẾN ĐÒ =====================
  {
    id: 'do-cuoi', title: 'Chuyến Đò Cuối Ngày', teaser: 'Đò đã nghỉ từ chiều. Vậy mà có tiếng gọi đò lúc nửa đêm.',
    start: 's1', nodes: {
      s1: { lines: [
        '{A} và {B} câu cá đêm ở bến đò cũ.',
        '@hush|Gần nửa đêm, mặt sông lặng như tờ, cả tiếng ếch cũng tắt.',
        '@thamthi|Bên kia sông vọng sang tiếng gọi: "Đò ơi… cho qua với…"',
        'Bến bên kia là bãi bồi hoang, chẳng ai sống ở đó.',
      ], choice: { q: 'Có tiếng gọi đò bên kia sông…', a: ['Gọi đáp lại', 'Thu cần câu về'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '"Đò nghỉ rồi!" {A} gọi to. Tiếng gọi bên kia im bặt.',
        '@drip|Rồi có tiếng mái chèo khua nước, đều đặn, tiến lại gần.',
        'Một chiếc đò nhỏ trôi ra khỏi màn sương, không có ai chèo, mái chèo tự khua.',
      ], choice: { q: 'Chiếc đò không người chèo cập bến…', a: ['Buộc đò lại cho khỏi trôi', 'Đẩy đò ra xa'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        '@steps|Hai đứa vội cuốn cần. Sau lưng có tiếng bước chân ướt nhép trên bậc đá.',
        '@luot|Một bóng người đội nón lá, áo tơi nhỏ nước, lướt qua bến rồi đứng sững lại.',
        '@whisper|Giọng một người đàn ông: "Hai cậu có thấy đò của tôi đâu không?"',
      ], choice: { q: 'Người áo tơi hỏi đò…', a: ['Chỉ về phía bãi bồi', 'Lắc đầu im lặng'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '{B} quấn dây đò vào cọc. Chiếc đò khẽ chòng chành như cảm ơn.',
        '@bell|Sương tan dần. Bên kia sông, một ngọn đèn bão sáng lên rồi tắt, như ai vẫy tay.',
        'Sáng ra, ông lái đò già kể: chiếc đò ấy của bố ông, trôi mất từ năm lụt. Giờ nó đã về bến.',
      ], end: 'good' },
      e2: { lines: [
        '@jump|{A} đẩy mạnh. Chiếc đò quay ngoắt lại, đâm sầm vào bến.',
        'Tiếng gọi đò vang lên khắp mặt sông, hết bên này tới bên kia.',
        'Từ đó, bến đò cũ đêm nào cũng có tiếng gọi, chẳng ai dám ra câu cá nữa.',
      ], end: 'bad' },
      e3: { lines: [
        '"Hình như ở bên bãi bồi đó bác," {A} chỉ tay.',
        '@whisper|Người áo tơi cúi đầu cảm ơn, bước xuống nước rồi đi dần ra giữa sông, mặt nước không gợn.',
        'Một lúc sau, bên kia sông có ánh đèn bão sáng lên, và tiếng mái chèo đều đều xa dần.',
      ], end: 'good' },
      e4: { lines: [
        'Hai đứa lắc đầu. Người áo tơi thở dài, đứng mãi trên bến.',
        '@gio|Gió sông thổi lạnh buốt, đèn câu của hai đứa tắt phụt.',
        'Lúc thắp lại thì bến không còn ai, chỉ có một vũng nước đọng hình hai bàn chân trên bậc đá.',
      ], end: 'open' },
    },
  },
  {
    id: 'luc-binh-nguoc', title: 'Đám Lục Bình Trôi Ngược', teaser: 'Nước chảy xuôi, nhưng đám lục bình lại trôi ngược dòng.',
    start: 's1', nodes: {
      s1: { lines: [
        '{A}, {B} và {C} ngồi hóng mát trên cầu tre gần bến.',
        'Nước sông chảy xuôi ra biển, lục bình trôi lững lờ theo dòng.',
        '@hush|Riêng một đám lục bình to trổ hoa tím, lại đang trôi ngược lên, chậm mà đều.',
        '@drip|Dưới đám lục bình, có tiếng nước sủi tăm lục bục.',
      ], choice: { q: 'Đám lục bình trôi ngược…', a: ['Lấy sào khều lại xem', 'Nhìn theo nó trôi'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '{C} lấy sào tre khều. Đám lục bình nặng trịch, như có ai níu bên dưới.',
        '@thamthi|Tiếng ai đó nói lẫn trong tiếng nước: "Đưa tôi về bến cũ… bến cây gáo…"',
        'Hoa lục bình tím rung rinh, dù không có gió.',
      ], choice: { q: 'Có tiếng nhờ đưa về bến cây gáo…', a: ['Đẩy đám lục bình về hướng đó', 'Buông sào'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        'Đám lục bình trôi qua dưới chân cầu, chậm như cố ý dừng lại.',
        '@luot|Dưới mặt nước, một bóng trắng dài lướt qua, theo sát đám lục bình.',
        '@gio|Gió thổi lật lá lục bình, lộ ra một chiếc nón lá cũ mắc giữa đám rễ.',
      ], choice: { q: 'Chiếc nón lá mắc trong rễ…', a: ['Vớt chiếc nón lên', 'Để yên'], to: ['e3', 'e4'] } },
      e1: { lines: [
        'Ba đứa dùng sào đẩy đám lục bình men theo bờ, ngược lên tận bến cây gáo đầu làng.',
        '@bell|Tới nơi, đám lục bình dừng lại, rồi tản ra, trôi xuôi theo dòng như bao đám khác.',
        'Hôm sau các cụ kể: năm xưa có cô gái ra bến cây gáo đợi người, đợi mãi. Giờ thì cô đã về đúng chỗ.',
      ], end: 'good' },
      e2: { lines: [
        '@jump|Cây sào bị giật phăng xuống nước.',
        'Đám lục bình lặng lẽ trôi ngược, mất hút vào màn đêm.',
        'Sáng ra, cây sào cắm thẳng đứng giữa sông, chẳng ai rút lên nổi.',
      ], end: 'bad' },
      e3: { lines: [
        '{A} vớt chiếc nón lên. Bên trong nón có bài thơ viết bằng mực tím, chữ đã nhoè.',
        '@whisper|Đám lục bình buông ra, trôi xuôi. Một giọng nói nhẹ nhõm: "Tìm được rồi."',
        'Ba đứa đem nón lên đình, các cụ nhận ra nét chữ của thầy giáo làng năm xưa.',
      ], end: 'good' },
      e4: { lines: [
        'Ba đứa để yên. Đám lục bình đứng lại dưới chân cầu rất lâu.',
        '@cry|Có tiếng thở dài rất khẽ, rồi đám lục bình chìm dần xuống nước.',
        'Từ đó, đêm trăng nào cũng thấy một đám lục bình hoa tím trôi ngược dòng.',
      ], end: 'open' },
    },
  },
  {
    id: 'den-bao-song', title: 'Ngọn Đèn Bão Trên Sông', teaser: 'Đèn bão treo đầu cọc cứ tự tắt, tự sáng như ra hiệu.',
    start: 's1', nodes: {
      s1: { lines: [
        'Ở bến sông có một ngọn đèn bão treo trên cọc tre, để đò đêm biết chỗ cập bến.',
        'Đêm đó mưa to. {A} và {B} trú dưới mái lá ở bến.',
        '@gio|Gió quật mạnh. Ngọn đèn bão tắt, rồi tự sáng lại, tắt, sáng, đều như ra hiệu.',
        '@hush|Tắt ba lần, sáng ba lần, rồi tắt hẳn.',
      ], choice: { q: 'Đèn bão ra hiệu rồi tắt hẳn…', a: ['Ra thắp lại đèn', 'Đứng trong mái lá nhìn'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '@steps|{A} đội mưa ra cọc. Bấc đèn còn ấm, như vừa có người thổi tắt.',
        'Ngoài sông, có tiếng mái chèo hoảng loạn, khua nước loạn xạ.',
        '@thamthi|Tiếng gọi lẫn trong mưa: "Không thấy bến… không thấy bến…"',
      ], choice: { q: 'Có người trên sông không thấy bến…', a: ['Thắp đèn, lắc qua lắc lại', 'Gọi to chỉ hướng'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        'Hai đứa đứng im nhìn ra sông tối mịt.',
        '@luot|Giữa màn mưa, một bóng thuyền mờ mờ lướt qua, không đèn, không người.',
        '@knock|Rồi có tiếng gõ cộc cộc vào cọc tre, như mái chèo gõ tìm bến.',
      ], choice: { q: 'Tiếng gõ tìm bến…', a: ['Thắp đèn lên', 'Lùi sâu vào trong'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '{A} châm diêm, ngọn đèn bừng sáng. {B} cầm đèn lắc qua lắc lại.',
        '@bell|Tiếng mái chèo dịu xuống, đều đặn, rồi một chiếc đò cập bến an toàn. Trên đò là bà cụ bán hàng chợ sớm.',
        'Bà cụ rối rít cảm ơn. Bà bảo đi đò mấy chục năm, lần đầu thấy đèn bến tắt giữa cơn mưa.',
      ], end: 'good' },
      e2: { lines: [
        '"Bến ở đây! Bên tay phải!" {B} gào lên.',
        '@whisper|Tiếng mái chèo ngưng lại. Một giọng trầm đáp: "Cảm ơn… nhưng tôi đã qua bến này từ lâu rồi."',
        'Mưa tạnh. Ngọn đèn bão tự sáng, soi mặt sông trống trơn, chẳng có chiếc đò nào.',
      ], end: 'open' },
      e3: { lines: [
        'Đèn vừa sáng, tiếng gõ dừng.',
        '@bell|Ánh đèn soi rõ một chiếc thuyền con trôi tự do, bên trong có giỏ cá còn tươi.',
        'Hôm sau, một anh chài ở xóm dưới tới nhận thuyền, kể rằng thuyền bị đứt dây trôi mất từ chiều. Không ai biết ai đã gõ.',
      ], end: 'good' },
      e4: { lines: [
        '@jump|Hai đứa lùi vào. Tiếng gõ chuyển sang vách mái lá, dồn dập.',
        'Gần sáng thì tiếng gõ im. Ngọn đèn bão nằm dưới nước, ống thuỷ tinh vỡ đôi.',
        'Từ đó bến ấy phải treo hai ngọn đèn, mà vẫn có đêm cả hai cùng tắt.',
      ], end: 'bad' },
    },
  },
  // ===================== CHỢ MA =====================
  {
    id: 'ganh-xoi-dem', title: 'Gánh Xôi Nửa Đêm', teaser: 'Xôi nóng hổi, thơm lừng. Nhưng chợ đã tan từ chiều.',
    start: 's1', nodes: {
      s1: { lines: [
        '{A} và {B} đi chơi khuya về, ngang qua bãi chợ làng đã vãn từ chiều.',
        'Giữa bãi chợ vắng tanh, có một bà cụ ngồi bên gánh xôi, nồi xôi bốc khói nghi ngút.',
        '@whisper|"Mua xôi đi con, xôi gấc nóng hổi, ăn cho ấm bụng."',
        '@hush|Xung quanh không một tiếng chó sủa, không một tiếng côn trùng.',
      ], choice: { q: 'Bà cụ mời mua xôi…', a: ['Mua một gói', 'Cảm ơn rồi đi'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '{A} đưa tờ tiền. Bà cụ cầm lấy, xem kỹ rồi cười móm mém: "Tiền này lạ quá, bà chưa thấy bao giờ."',
        'Gói xôi trong lá chuối nóng hổi, nhưng nặng như đá.',
        '@thamthi|Quanh bãi chợ, các sạp tre trống bỗng xì xào như có người mua kẻ bán.',
      ], choice: { q: 'Bà cụ không nhận ra tiền…', a: ['Đưa bà chiếc khăn len thay tiền', 'Trả lại gói xôi'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        '@steps|Hai đứa đi một quãng. Sau lưng có tiếng đòn gánh kẽo kẹt đi theo.',
        '@luot|Ngoái lại, bóng bà cụ gánh xôi lướt qua dưới gốc cây, nhanh như không chạm đất.',
        '"Bà để phần cho tụi con một gói," giọng bà vang ngay sát tai.',
      ], choice: { q: 'Bà cụ đuổi theo đưa xôi…', a: ['Nhận gói xôi', 'Chạy về nhà'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '{B} cởi chiếc khăn len quàng cho bà. Bà cụ xoa xoa tay, cười tít mắt.',
        '@bell|Gói xôi nhẹ bẫng trở lại, ăn dẻo thơm chưa từng thấy.',
        'Hôm sau hỏi ra, ngày xưa có bà cụ bán xôi ở chợ, mùa đông năm ấy không có áo ấm. Chiếc khăn len không bao giờ tìm thấy nữa.',
      ], end: 'good' },
      e2: { lines: [
        '@jump|Gói xôi vừa đặt xuống thì nồi xôi đổ ụp, khói trắng bốc lên mù mịt.',
        'Khói tan, bãi chợ trống trơn, chỉ còn đôi quang gánh mục nằm chỏng chơ.',
        'Mấy tháng liền, cứ nửa đêm bãi chợ lại thơm mùi xôi gấc, mà chẳng ai thấy người bán.',
      ], end: 'bad' },
      e3: { lines: [
        'Hai đứa nhận gói xôi, cúi đầu cảm ơn.',
        '@whisper|Bà cụ cười: "Ăn đi, mai còn đi học." Rồi tan vào làn sương.',
        'Mở ra, gói xôi gấc nóng hổi, đỏ au. Từ đó, đêm nào đi khuya ngang chợ, hai đứa cũng đặt một nén nhang ở góc sạp cũ.',
      ], end: 'good' },
      e4: { lines: [
        '@knock|Hai đứa chạy về, đóng cửa. Ngoài cửa có tiếng gõ nhẹ.',
        'Sáng ra, trên bậc cửa có một gói xôi gói lá chuối, nguội ngắt, buộc lạt cẩn thận.',
        'Không ai dám ăn. Mà cũng chẳng ai dám bỏ.',
      ], end: 'open' },
    },
  },
  {
    id: 'non-la-treo-cot', title: 'Chiếc Nón Treo Cột Chợ', teaser: 'Chiếc nón cứ treo trên cột chợ. Ai lấy về, đêm sẽ có người đến đòi.',
    start: 's1', nodes: {
      s1: { lines: [
        'Ở chợ làng có chiếc nón lá treo trên cột gỗ, năm này qua năm khác chẳng ai lấy.',
        '{C} thách: "Có gì đâu mà sợ. Tao lấy về đội thử."',
        '@gio|Vừa nhấc chiếc nón khỏi cột, một cơn gió lạnh quét qua bãi chợ.',
        '@thamthi|Trong gió có tiếng con gái hỏi: "Ai lấy nón của tôi?"',
      ], choice: { q: 'Có tiếng hỏi ai lấy nón…', a: ['Treo nón lại ngay', 'Mang nón về nhà'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '{C} vội treo nón lại. Nhưng chiếc nón cứ xoay tròn trên cột, như có ai cầm vành mà vặn.',
        '@hush|Bãi chợ im phăng phắc.',
        'Dưới cột chợ, đất ẩm in một hàng dấu guốc gỗ nhỏ, dẫn ra phía đường cái.',
      ], choice: { q: 'Dấu guốc dẫn ra đường…', a: ['Đi theo dấu guốc', 'Thắp nhang dưới cột'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        'Ba đứa mang nón về nhà {C}, treo trên vách.',
        '@knock|Nửa đêm có tiếng gõ cửa, nhẹ nhàng mà kiên nhẫn.',
        '@whisper|"Trả nón cho tôi. Mai còn đi chợ sớm."',
      ], choice: { q: 'Có người gõ cửa đòi nón…', a: ['Mở cửa trả nón', 'Đặt nón ra ngoài cửa sổ'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '@steps|Ba đứa đi theo dấu guốc. Dấu guốc dừng ở ngôi mộ nhỏ cuối chợ, cỏ mọc um tùm.',
        '@bell|Ba đứa nhổ cỏ, dọn sạch ngôi mộ. Gió thổi tới mùi hoa bưởi thơm ngát.',
        'Sáng ra, chiếc nón trên cột chợ đã được ai thay chiếc mới tinh, vành nón buộc quai lụa đỏ.',
      ], end: 'good' },
      e2: { lines: [
        'Ba đứa thắp nén nhang dưới cột chợ, khấn xin lỗi.',
        '@whisper|Chiếc nón ngừng xoay. Có tiếng cười khúc khích: "Lần sau muốn đội thì xin phép nhé."',
        'Từ đó, trời mưa ai lỡ đường qua chợ, chiếc nón lại tự rơi xuống ngay chân người ấy để che mưa.',
      ], end: 'good' },
      e3: { lines: [
        '@jump|Cửa mở. Không có ai, chỉ có làn sương trắng tràn vào nhà.',
        'Chiếc nón trên vách tự bay ra cửa, lượn một vòng rồi mất hút trong đêm.',
        'Sáng ra, nón đã treo lại trên cột chợ như chưa từng rời đi.',
      ], end: 'open' },
      e4: { lines: [
        '{C} hé cửa sổ, thả chiếc nón ra ngoài. Tiếng gõ ngừng.',
        '@laugh|Rồi có tiếng cười lanh lảnh, và tiếng guốc gỗ gõ lóc cóc đi xa.',
        'Từ đó, cứ đêm rằm cửa sổ nhà {C} lại tự mở, như có người ghé ngang chào.',
      ], end: 'bad' },
    },
  },
  {
    id: 'phien-cho-am', title: 'Phiên Chợ Lúc Ba Giờ Sáng', teaser: 'Đèn lồng giăng kín, người đông nghịt. Nhưng không ai có bóng.',
    start: 's1', nodes: {
      s1: { lines: [
        '{A}, {B} và {C} đi xem hội về khuya, đi tắt qua bãi đất trống cạnh chợ.',
        '@bell|Ba giờ sáng, bãi đất bỗng giăng đầy đèn lồng đỏ, sạp tre san sát, người mua bán đông nghịt.',
        'Ai cũng nói thì thầm, đi lại nhẹ tênh, không ai gây một tiếng động.',
        '@hush|{B} níu áo hai đứa kia: "Nhìn xuống đất kìa… không ai có bóng cả."',
      ], choice: { q: 'Phiên chợ không ai có bóng…', a: ['Đi dạo xem thử', 'Lặng lẽ quay ra'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        'Ba đứa đi giữa phiên chợ. Hàng bán toàn đồ xưa: lược sừng, guốc mộc, quạt giấy.',
        '@thamthi|Một cô hàng quạt mỉm cười: "Ba người sống lạc vào đây à? Mua gì thì phải trả bằng một câu chuyện."',
        'Cô đưa ra một chiếc quạt giấy vẽ hình đống lửa.',
      ], choice: { q: 'Mua quạt bằng một câu chuyện…', a: ['Kể chuyện ông Tư bên đống lửa', 'Từ chối, xin đường ra'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        '@steps|Ba đứa quay ra. Nhưng lối ra cứ dẫn ngược vào giữa chợ.',
        '@luot|Một bóng người cao gầy, tay cầm đèn lồng, lướt tới đứng chắn trước mặt.',
        '@whisper|"Lạc đường à? Đi theo đèn của ta, đừng nói chuyện với ai."',
      ], choice: { q: 'Người cầm đèn lồng dẫn đường…', a: ['Đi theo, giữ im lặng', 'Không tin, tự tìm lối'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '{A} kể về ông Tư, về đống lửa và những đêm cả làng ngồi nghe chuyện.',
        '@bell|Cả phiên chợ ngừng lại lắng nghe. Kể xong, mọi người vỗ tay, rồi đèn lồng tắt dần từng chiếc.',
        'Ba đứa đứng giữa bãi đất trống lúc rạng sáng. Trong tay {A} vẫn còn chiếc quạt giấy vẽ đống lửa.',
      ], end: 'good' },
      e2: { lines: [
        'Cô hàng quạt thở dài: "Không kể thì ở lại tới khi chợ tan."',
        '@clock|Ba đứa đứng giữa chợ, nghe tiếng đồng hồ đâu đó điểm mãi không dứt.',
        'Gà gáy, chợ tan như khói. Ba đứa về nhà mới biết đã trưa hôm sau, cả làng đổ đi tìm.',
      ], end: 'bad' },
      e3: { lines: [
        'Ba đứa im lặng đi theo ánh đèn lồng, không ngoái lại.',
        '@whisper|Tới mép bãi đất, người cầm đèn dừng lại: "Ra tới đây là được. Lần sau đừng đi tắt lúc ba giờ."',
        'Ba đứa bước qua, quay lại thì bãi đất trống trơn, chỉ còn một chiếc đèn lồng giấy cũ nằm trên cỏ.',
      ], end: 'good' },
      e4: { lines: [
        '@gio|Ba đứa tự tìm lối. Gió thổi tắt hết đèn lồng, cả chợ chìm trong bóng tối.',
        'Đi mãi trong tối, cuối cùng vấp phải bậc cửa đình làng, trời vừa hửng sáng.',
        'Trên vai mỗi đứa còn vương một mảnh giấy đèn lồng đỏ.',
      ], end: 'open' },
    },
  },
  // ===================== ĐƯỜNG RAY =====================
  {
    id: 'toa-tau-cuoi', title: 'Toa Tàu Thứ Mười Ba', teaser: 'Đoàn tàu đêm có mười hai toa. Nhưng ai cũng đếm được mười ba.',
    start: 's1', nodes: {
      s1: { lines: [
        '{A} và {B} ngồi bên đường ray bỏ hoang, chờ xem đoàn tàu đêm chạy tuyến mới gần đó.',
        '@clock|Mười hai giờ, có tiếng còi tàu vọng lại, nhưng từ phía đường ray cũ.',
        'Một đoàn tàu đèn vàng vọt chạy chậm trên đường ray đã gỉ sét, không một tiếng bánh xe.',
        '{B} đếm toa: "Mười một… mười hai… mười ba." Toa cuối cùng tối om.',
      ], choice: { q: 'Toa thứ mười ba tối om…', a: ['Chạy theo nhìn vào', 'Đứng yên nhìn tàu qua'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '@steps|Hai đứa chạy theo. Toa thứ mười ba chậm lại, như đợi.',
        'Qua ô kính mờ, bên trong toàn ghế gỗ trống, chỉ có một bà cụ ngồi đan len.',
        '@thamthi|Bà cụ ngẩng lên, giọng hiền: "Tàu này không chở người sống đâu cháu. Đứng xa ra."',
      ], choice: { q: 'Bà cụ dặn đứng xa ra…', a: ['Lùi lại, vẫy tay chào', 'Hỏi bà đi đâu'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        'Đoàn tàu đi qua. Toa cuối dừng hẳn ngay trước mặt hai đứa.',
        '@hush|Cửa toa mở ra chậm rãi. Bên trong tối đen, hơi lạnh phả ra.',
        '@luot|Một bóng người mặc đồng phục soát vé lướt ra cửa, tay giơ chiếc kìm bấm vé.',
      ], choice: { q: 'Người soát vé đứng ở cửa…', a: ['Nói: "Tụi cháu không đi tàu"', 'Lặng im lùi lại'], to: ['e3', 'e4'] } },
      e1: { lines: [
        'Hai đứa lùi ra xa, vẫy tay. Bà cụ mỉm cười, vẫy lại.',
        '@bell|Đoàn tàu chạy xa dần, tan vào sương như chưa từng có.',
        'Sáng ra, trên đường ray cũ có một cuộn len đỏ, đầu len buộc vào thanh tà vẹt như ai để lại làm quà.',
      ], end: 'good' },
      e2: { lines: [
        '"Bà đi đâu vậy bà?" {A} hỏi với theo.',
        '@whisper|"Về quê. Ga cuối không có tên đâu cháu," bà đáp, rồi cả đoàn tàu tăng tốc vụt mất.',
        'Từ đó, cứ đêm rằm hai đứa lại nghe tiếng còi tàu từ phía đường ray cũ, đều đặn như hẹn.',
      ], end: 'open' },
      e3: { lines: [
        '"Tụi cháu không đi tàu ạ, tụi cháu chỉ xem thôi," {B} nói to.',
        '@whisper|Người soát vé gật đầu, kéo cửa toa đóng lại. Tiếng còi tàu vang lên một hồi dài.',
        'Đoàn tàu biến mất. Hai đứa về kể, ông trưởng ga già bảo: tuyến cũ đóng từ ngày xảy ra tai nạn, ai trả lời rõ ràng thì tàu sẽ không dừng nữa.',
      ], end: 'good' },
      e4: { lines: [
        '@jump|Hai đứa lùi lại. Kìm bấm vé bấm "tách" một cái ngay sát tai.',
        'Đoàn tàu biến mất. Trong túi áo {A} có một tấm vé tàu giấy cũ, in tên ga không có trên bản đồ.',
        'Tấm vé đốt không cháy, vứt đi hôm sau lại nằm trong túi áo. Phải mang lên chùa gửi mới thôi.',
      ], end: 'bad' },
    },
  },
  {
    id: 'den-tin-hieu', title: 'Ngọn Đèn Tín Hiệu Tự Bật', teaser: 'Đường ray bỏ hoang hai chục năm. Đèn tín hiệu vẫn chuyển đỏ.',
    start: 's1', nodes: {
      s1: { lines: [
        'Cột đèn tín hiệu bên đường ray bỏ hoang đã gỉ sét, dây điện cắt từ lâu.',
        '@ghost|Vậy mà đêm ấy, {A}, {B} và {C} thấy đèn tín hiệu bật sáng màu xanh.',
        '@clock|Rồi chuyển vàng. Rồi chuyển đỏ, đỏ rực như mắt ai đang nhìn.',
        '@hush|Từ xa, tiếng ray rung lên ù ù, như có đoàn tàu sắp tới.',
      ], choice: { q: 'Đèn chuyển đỏ, ray rung lên…', a: ['Lại xem cột đèn', 'Tránh xa đường ray'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '@steps|Ba đứa tới chân cột đèn. Có một chiếc cần gạt cũ, gỉ sét, đang tự rung lên.',
        '@thamthi|Tiếng ai đó thở gấp: "Gạt cần đi… gạt cần đi… tàu sắp tới rồi…"',
        'Tiếng ray rung mỗi lúc một gần, đèn đỏ nhấp nháy chậm rãi.',
      ], choice: { q: 'Có tiếng giục gạt cần…', a: ['Gạt cần sang bên', 'Không đụng vào'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        'Ba đứa lùi xa đường ray, nấp sau bụi cỏ lau.',
        '@luot|Một ánh đèn pha lướt qua trên đường ray, không có thân tàu, chỉ có ánh sáng và gió.',
        '@gio|Gió thổi rạp cả bãi cỏ lau, tiếng còi tàu rú lên một hồi dài.',
      ], choice: { q: 'Ánh đèn pha không có tàu…', a: ['Đứng lên nhìn theo', 'Nằm rạp xuống'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '{C} dồn sức gạt cần. Cần gạt kêu "cạch" một tiếng, đèn tín hiệu chuyển xanh.',
        '@bell|Tiếng ray rung lắng dần. Một giọng nói nhẹ nhõm: "Kịp rồi… lần này kịp rồi."',
        'Về làng, các cụ kể: ngày xưa có người gác ghi lỡ tay không gạt kịp. Từ đêm ấy, đèn tín hiệu không bật nữa.',
      ], end: 'good' },
      e2: { lines: [
        '@jump|Ba đứa đứng im. Tiếng ray rung dồn dập, rồi dừng phắt.',
        'Đèn đỏ tắt. Trong bóng tối có tiếng ai thở dài thật dài.',
        'Đêm nào trời lặng gió, đèn tín hiệu lại bật đỏ, và tiếng giục gạt cần lại vang lên.',
      ], end: 'bad' },
      e3: { lines: [
        'Ba đứa đứng lên. Ánh đèn pha dừng lại ở cuối đường ray, rồi tắt.',
        '@whisper|Dưới chân cột đèn tín hiệu, có một chiếc mũ công nhân đường sắt cũ, đặt ngay ngắn.',
        'Ba đứa mang mũ về đặt ở nhà văn hoá. Từ đó, đường ray cũ không còn tiếng còi tàu đêm.',
      ], end: 'good' },
      e4: { lines: [
        'Ba đứa nằm rạp xuống cỏ. Gió qua đi, mọi thứ im lặng.',
        '@knock|Rồi trên thanh ray gần đó vang lên tiếng gõ đều đều, như búa kiểm tra ray.',
        'Tiếng gõ đi xa dần dọc đường ray. Không ai biết người gõ là ai.',
      ], end: 'open' },
    },
  },
  // ===================== NHÀ HOANG =====================
  {
    id: 'dong-ho-qua-lac', title: 'Chiếc Đồng Hồ Quả Lắc', teaser: 'Nhà bỏ hoang mười năm. Chiếc đồng hồ vẫn điểm chuông đúng giờ.',
    start: 's1', nodes: {
      s1: { lines: [
        '{A} và {B} trú mưa trong căn nhà hoang đầu xóm.',
        'Trên vách có chiếc đồng hồ quả lắc phủ đầy mạng nhện, quả lắc đứng im.',
        '@clock|Đúng mười hai giờ, quả lắc tự đung đưa. Chuông điểm từng tiếng một.',
        '@hush|Tiếng thứ mười ba vang lên. Rồi mọi thứ im phăng phắc.',
      ], choice: { q: 'Đồng hồ điểm mười ba tiếng…', a: ['Lại gần đồng hồ', 'Ngồi yên chờ'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        'Mặt đồng hồ có hai kim chỉ đúng mười hai giờ, nhưng kim giây quay ngược.',
        '@thamthi|Giọng một ông cụ vang lên từ trong thùng đồng hồ: "Lên dây cót giùm… lâu quá rồi…"',
        'Dưới chân đồng hồ có chiếc chìa khoá lên cót, sạch bong, không một hạt bụi.',
      ], choice: { q: 'Có tiếng nhờ lên dây cót…', a: ['Lên dây cót', 'Dừng quả lắc lại'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        '@steps|Hai đứa ngồi im. Trên gác có tiếng bước chân đi tới đi lui.',
        '@luot|Một bóng người mặc áo dài the lướt xuống cầu thang, dừng trước chiếc đồng hồ.',
        'Bóng người đứng nhìn đồng hồ hồi lâu, rồi quay sang hai đứa.',
      ], choice: { q: 'Bóng áo the quay lại nhìn…', a: ['Chào hỏi lễ phép', 'Nhắm mắt nín thở'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '{A} tra chìa vào, vặn từng vòng. Tiếng cót kêu tạch tạch vui tai.',
        '@bell|Kim giây quay xuôi trở lại. Chiếc đồng hồ điểm một tiếng chuông trong vắt.',
        'Mưa tạnh. Hai đứa về, kể với bà. Bà bảo: ông giáo chủ nhà ấy xưa nay quý chiếc đồng hồ nhất, chắc giờ ông yên lòng rồi.',
      ], end: 'good' },
      e2: { lines: [
        '{B} giữ quả lắc lại. Quả lắc lạnh buốt như sắt ngâm nước.',
        '@jump|Tất cả cửa sổ trong nhà đồng loạt đóng sầm.',
        'Hai đứa chạy ra, ngoái lại thì quả lắc vẫn đung đưa. Từ đó, đêm nào cả xóm cũng nghe chuông điểm mười ba tiếng.',
      ], end: 'bad' },
      e3: { lines: [
        '"Dạ con chào ông. Tụi con trú mưa nhờ ạ," {A} cúi đầu.',
        '@whisper|Bóng áo the gật đầu: "Ừ, cứ ngồi. Mưa tạnh thì về, nhớ khép cửa giùm."',
        'Sáng ra, hai đứa khép cửa cẩn thận. Chiếc đồng hồ chạy đúng giờ, quả lắc đều đặn.',
      ], end: 'good' },
      e4: { lines: [
        '@hush|Hai đứa nhắm mắt, nín thở. Tiếng bước chân đi ngang qua, dừng lại.',
        'Một bàn tay lạnh khẽ đặt lên vai {B}, rồi rời đi.',
        'Mở mắt ra thì trời đã sáng. Chiếc đồng hồ dừng ở đúng mười hai giờ, như chưa từng chạy.',
      ], end: 'open' },
    },
  },
  {
    id: 'gac-xep', title: 'Căn Gác Xép Có Tiếng Hát', teaser: 'Cầu thang lên gác xép đã gãy. Nhưng đêm nào trên gác cũng có người hát.',
    start: 's1', nodes: {
      s1: { lines: [
        'Nhà hoang cuối xóm có căn gác xép, cầu thang gỗ đã gãy từ lâu, không ai lên được.',
        '@musicbox|Vậy mà đêm nào trên gác cũng vọng xuống tiếng hát ru và tiếng hộp nhạc leng keng.',
        '{A}, {B} và {C} bắc thang tre, quyết lên xem.',
        '@creak|Thang tre vừa chạm mép gác, tiếng hát ngừng bặt.',
      ], choice: { q: 'Tiếng hát trên gác ngừng bặt…', a: ['Leo lên', 'Gọi to hỏi trước'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '@steps|{C} leo lên trước. Gác xép chật, đầy rương gỗ và đồ chơi cũ.',
        'Giữa gác có chiếc hộp nhạc mở nắp, cô búp bê nhỏ trên hộp vẫn xoay tròn.',
        '@thamthi|Tiếng thì thầm đi quanh gác: "Lâu lắm rồi… mới có bạn lên chơi…"',
      ], choice: { q: 'Có tiếng mời ở lại chơi…', a: ['Ngồi nghe hết bản nhạc', 'Đóng nắp hộp nhạc'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        '"Có ai trên đó không?" {A} gọi.',
        '@hush|Im lặng rất lâu. Rồi một giọng trẻ con đáp: "Có. Nhưng mấy anh chị đừng lên. Em sợ người lạ."',
        '@luot|Một bóng nhỏ thò đầu ra mép gác, rồi rụt lại thật nhanh.',
      ], choice: { q: 'Giọng trẻ con sợ người lạ…', a: ['Để quà lại rồi về', 'Leo lên an ủi'], to: ['e3', 'e4'] } },
      e1: { lines: [
        'Ba đứa ngồi xuống, nghe hộp nhạc chơi trọn bài hát ru.',
        '@bell|Bài hát dứt, cô búp bê dừng xoay. Có tiếng cười khúc khích rất vui rồi nhỏ dần.',
        'Từ đó gác xép im lặng. Thỉnh thoảng có người đi ngang vẫn nghe tiếng hộp nhạc, nhưng nghe vui vẻ chứ không còn buồn.',
      ], end: 'good' },
      e2: { lines: [
        '@jump|{C} đóng nắp hộp nhạc. Cả căn gác rung lên, đồ chơi rơi lộp độp.',
        'Ba đứa tuột thang chạy ra. Thang tre đổ ập ngay sau lưng.',
        'Đêm đó và những đêm sau, tiếng hát ru trên gác to hơn, buồn hơn.',
      ], end: 'bad' },
      e3: { lines: [
        'Ba đứa để lại gói kẹo và một con diều giấy ở chân thang.',
        '@whisper|"Cảm ơn anh chị," giọng trẻ con vọng xuống, vui hẳn lên.',
        'Sáng hôm sau, con diều giấy bay phấp phới trên mái nhà hoang, chẳng ai thả mà dây diều cứ căng.',
      ], end: 'good' },
      e4: { lines: [
        '@steps|{B} leo lên. Gác xép trống trơn, chỉ có lớp bụi dày và một chiếc ghế gỗ nhỏ.',
        'Trên ghế có một bức vẽ bằng sáp màu: ba người đứng dưới chân thang tre, đúng như ba đứa lúc nãy.',
        'Ba đứa giữ bức vẽ, nhưng sáng ra mở ra xem thì bức vẽ chỉ còn là tờ giấy trắng.',
      ], end: 'open' },
    },
  },
  // ===================== SÂN ĐÌNH =====================
  {
    id: 'trong-dinh-dem', title: 'Tiếng Trống Đình Lúc Nửa Đêm', teaser: 'Trống đình chỉ đánh ngày hội. Đêm nay lại vang lên ba hồi.',
    start: 's1', nodes: {
      s1: { lines: [
        '{A}, {B} và {C} ở lại đình phụ dọn dẹp sau ngày hội làng.',
        'Các cụ đã về hết, chỉ còn ba đứa với chiếc trống đình to sơn đỏ.',
        '@hush|Nửa đêm, cả sân đình lặng ngắt.',
        '@knock|Rồi trống đình tự vang lên: tùng… tùng… tùng… ba hồi chậm rãi.',
      ], choice: { q: 'Trống đình tự đánh ba hồi…', a: ['Vào xem ai đánh trống', 'Đứng ngoài sân nhìn vào'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '@steps|Ba đứa rón rén vào đình. Dùi trống nằm dưới đất, mặt trống còn rung.',
        'Trên bàn thờ, ba nén nhang tự cháy đỏ, khói bay thành sợi thẳng tắp.',
        '@thamthi|Tiếng nhiều người xì xào: "Năm nay hội vui… năm nay hội vui…"',
      ], choice: { q: 'Có tiếng xì xào khen hội vui…', a: ['Đánh trống đáp lễ một hồi', 'Cúi lạy rồi ra'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        'Ba đứa đứng ngoài sân. Qua cửa đình, ánh nến tự sáng lên từng ngọn.',
        '@luot|Hàng người mặc áo the, khăn đóng, lướt qua cửa đình thành một hàng dài.',
        '@whisper|Một ông cụ đi cuối hàng quay lại: "Ba đứa nhỏ ở lại xem hội với các cụ không?"',
      ], choice: { q: 'Ông cụ mời ở lại xem hội…', a: ['Dạ, xin ở lại một lúc', 'Xin phép về'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '{A} nhặt dùi, đánh một hồi trống thật to.',
        '@bell|Tiếng xì xào vỡ oà thành tiếng cười nói vui vẻ, rồi tan dần trong khói nhang.',
        'Sáng ra các cụ nghe kể, gật gù: "Các cụ tổ về dự hội đó. Có người đánh trống đáp lễ, năm nay làng ắt được mùa."',
      ], end: 'good' },
      e2: { lines: [
        'Ba đứa cúi lạy rồi lui ra.',
        '@whisper|Sau lưng có tiếng cười hiền: "Ngoan lắm. Về đi kẻo bố mẹ mong."',
        'Về tới nhà, túi áo mỗi đứa có một miếng bánh dày gói lá, còn ấm như vừa lấy từ mâm cỗ.',
      ], end: 'good' },
      e3: { lines: [
        'Ba đứa ngồi xuống bậc đình. Hội diễn ra trước mắt: hát chèo, đánh đu, kéo co, toàn người xưa.',
        '@musicbox|Tiếng nhạc chèo réo rắt, ánh đuốc bập bùng khắp sân.',
        'Gà gáy, mọi thứ tan biến. Ba đứa ngồi trên bậc đình trống trơn, nhưng nhớ rõ từng làn điệu chèo.',
      ], end: 'open' },
      e4: { lines: [
        '"Dạ tụi con xin phép về," {B} nói.',
        '@gio|Gió nổi lên thổi tắt hết nến. Tiếng trống đình vang lên một hồi dài, như tiễn khách.',
        'Đêm đó ba đứa ngủ không yên, mơ thấy tiếng trống mãi. Hôm sau các cụ bắt ba đứa ra đình thắp nhang tạ lỗi.',
      ], end: 'bad' },
    },
  },
  {
    id: 'ganh-hat-boi', title: 'Gánh Hát Bội Về Đình', teaser: 'Gánh hát diễn suốt đêm. Sáng ra không ai nhớ họ đến từ đâu.',
    start: 's1', nodes: {
      s1: { lines: [
        'Làng chưa mời gánh hát nào, vậy mà đêm ấy có một gánh hát bội dựng sân khấu ngay sân đình.',
        '@bell|Trống chầu vang dội. Đào kép mặt vẽ phấn trắng, áo mão lấp lánh dưới ánh đuốc.',
        '{A} và {B} chen vào xem. Khán giả đông nghịt mà không ai cười, không ai vỗ tay.',
        '@hush|Đến giữa tuồng, cả sân khấu bỗng dừng lại, mọi diễn viên cùng quay nhìn về phía hai đứa.',
      ], choice: { q: 'Cả gánh hát quay nhìn hai đứa…', a: ['Vỗ tay khen hay', 'Lặng lẽ lùi ra'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '{A} vỗ tay thật to. Tiếng vỗ tay vang lên lẻ loi giữa sân đình im phắc.',
        '@thamthi|Rồi cả đám khán giả cùng vỗ tay theo, tiếng vỗ tay rào rào như mưa rơi.',
        'Ông bầu gánh hát bước ra, mời: "Hai cậu lên sân khấu đánh trống chầu giùm, kép đánh trống ốm mất rồi."',
      ], choice: { q: 'Ông bầu mời lên đánh trống chầu…', a: ['Lên đánh trống', 'Từ chối khéo'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        '@steps|Hai đứa lùi ra. Đám khán giả tự rẽ lối, mặt ai cũng trắng nhợt dưới ánh đuốc.',
        '@luot|Một bóng đào hát áo đỏ lướt theo, đứng chắn ở cổng đình.',
        '@whisper|"Xem chưa hết tuồng mà về, kép chính buồn lắm đó."',
      ], choice: { q: 'Đào hát chắn cổng…', a: ['Quay lại xem hết tuồng', 'Xin hẹn hôm khác'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '{B} cầm dùi đánh trống chầu, tùng cắc tùng cắc theo nhịp tuồng.',
        '@bell|Tuồng diễn tới hồi kết, đào kép cúi chào, cả gánh hát tan vào làn khói đuốc.',
        'Sáng ra, sân đình chẳng có dấu vết sân khấu nào. Chỉ có chiếc trống chầu cũ của làng, mặt trống mới căng như vừa được thay.',
      ], end: 'good' },
      e2: { lines: [
        '"Tụi cháu không biết đánh trống chầu ạ," {A} cúi đầu.',
        '@laugh|Ông bầu cười lớn: "Vậy thì ngồi xem tới sáng!" Tiếng cười lan khắp sân đình.',
        'Hai đứa ngồi xem tới gà gáy mới đứng dậy nổi, chân tê cứng. Sân đình trống trơn, chỉ còn tàn đuốc.',
      ], end: 'open' },
      e3: { lines: [
        'Hai đứa quay lại xem tới hết tuồng. Kép chính diễn cảnh cuối, ánh mắt như nhìn thẳng vào hai đứa.',
        '@whisper|Tuồng hạ màn. Kép chính cúi chào thật thấp, rồi cả gánh hát mờ dần.',
        'Các cụ nghe kể bảo: gánh hát bội làng xưa tan rã vì chiến tranh, hẳn họ về diễn nốt tuồng còn dang dở.',
      ], end: 'good' },
      e4: { lines: [
        '"Dạ hôm khác tụi cháu xem tiếp," {B} nói.',
        '@gio|Đào hát thở dài, gió thổi tắt hết đuốc. Cả sân đình tối om.',
        'Từ đó, cứ đêm hội làng lại nghe tiếng trống chầu vọng ra từ sân đình vắng, như gánh hát vẫn đợi khán giả.',
      ], end: 'bad' },
    },
  },
]);
