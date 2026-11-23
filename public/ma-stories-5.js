// Ngọn Lửa Cuối Cùng — kho truyện ma phần 5 (cách viết: xem đầu file ma-stories.js)
// Truyện hư cấu. Không máu me, không ai trong vòng lửa ({A},{B},{C}) bị bắt / bị nhập / bị hại.
window.MA_STORIES = (window.MA_STORIES || []).concat([
  // ===================== GIẾNG CỔ (tiếp) =====================
  {
    id: 'trang-duoi-gieng', title: 'Hai Vầng Trăng Dưới Giếng', teaser: 'Trên trời một vầng trăng. Dưới giếng lại có hai.',
    start: 's1', nodes: {
      s1: { lines: [
        'Đêm rằm, {A} ra giếng múc nước rửa chân.',
        'Cúi xuống nhìn, dưới mặt nước có hai vầng trăng tròn vành vạnh nằm cạnh nhau.',
        '@hush|Ngẩng lên, trên trời chỉ có một.',
        '@drip|Vầng trăng thứ hai dưới giếng chớp một cái, như con mắt.',
      ], choice: { q: 'Vầng trăng dưới giếng chớp mắt…', a: ['Gọi {B} ra xem cùng', 'Thả viên sỏi xuống giếng'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '{B} chạy ra, rọi đèn xuống giếng. Lần này dưới nước có ba vầng trăng.',
        '@thamthi|Tiếng nói vọng lên, đều đều: "Đêm rằm… ai soi giếng… ở lại ngắm trăng…"',
        'Mặt nước gợn sóng, như có ai đang bơi chầm chậm vòng quanh thành giếng.',
      ], choice: { q: 'Giọng dưới giếng mời ở lại…', a: ['Đáp: "Để mai ngắm tiếp"', 'Đậy nắp giếng'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        '@drip|Viên sỏi rơi tõm. Hai vầng trăng vỡ thành trăm mảnh, rồi liền lại.',
        'Nhưng vầng thứ hai đã trôi lên gần hơn, to dần như một gương mặt tròn trắng bệch.',
        '@gio|Gió lùa qua miệng giếng nghe vù vù như tiếng thở.',
      ], choice: { q: 'Vầng trăng nổi lên gần hơn…', a: ['Đứng yên nhìn', 'Chạy vào nhà'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '"Để mai ngắm tiếp nha," {A} nói. Mặt nước lặng như gương.',
        '@bell|Hai vầng trăng thừa từ từ chìm xuống, chỉ còn một, giống hệt trên trời.',
        'Người già bảo giếng có hồn, ai trả lời tử tế thì nó để yên.',
      ], end: 'good' },
      e2: { lines: [
        '@knock|Nắp giếng vừa đậy xuống, bên dưới có tiếng gõ cộc cộc.',
        'Cả đêm tiếng gõ không dứt. Sáng ra, nước giếng đục ngầu, nồng mùi rêu.',
        'Phải ba tháng sau, giếng mới trong lại.',
      ], end: 'bad' },
      e3: { lines: [
        'Hai đứa nín thở nhìn. Gương mặt tròn dừng lại cách mặt nước một gang tay.',
        '@whisper|Rồi nó mỉm cười, tan ra thành ánh trăng loang lổ.',
        'Sáng hôm sau, đáy giếng lộ ra một chiếc gương đồng cũ. Người làng vớt lên đặt ở đình.',
      ], end: 'good' },
      e4: { lines: [
        '@jump|Hai đứa chạy vào nhà, đóng sập cửa.',
        'Qua khe cửa, ánh trăng chiếu vào nhà thành hai vệt sáng, dù ngoài trời chỉ có một vầng.',
        'Đêm rằm nào nhà ấy cũng thấy hai vệt trăng như vậy.',
      ], end: 'open' },
    },
  },
  {
    id: 'gieng-lap', title: 'Cái Giếng Bị Lấp', teaser: 'Người ta lấp giếng để xây nhà. Nhưng giếng không chịu bị lấp.',
    start: 's1', nodes: {
      s1: { lines: [
        'Nhà {A} mua mảnh đất mới, giữa sân có cái giếng cũ đã lấp đất.',
        'Từ ngày dọn tới, sáng nào giữa sân cũng ướt một vũng tròn, đúng chỗ giếng cũ.',
        '@drip|Đêm ấy {A} và {B} thức canh. Có tiếng nước nhỏ giọt tí tách từ dưới đất vọng lên.',
        '@thamthi|Rồi tiếng ai đó nói rất khẽ: "Khát quá…"',
      ], choice: { q: 'Tiếng than khát từ dưới đất…', a: ['Đổ một gáo nước xuống', 'Gọi bố dậy'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '{A} múc một gáo nước, đổ xuống vũng tròn. Nước thấm vào đất nhanh như bị hút.',
        '@hush|Mọi tiếng động im bặt.',
        'Rồi đất chỗ ấy lún xuống một chút, lộ ra mép đá ong của miệng giếng cũ.',
      ], choice: { q: 'Miệng giếng lộ ra…', a: ['Đào tiếp xem', 'Lấp lại, khấn xin'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        'Bố {A} dụi mắt ra sân, nghe kể xong thì nhíu mày.',
        '"Người bán đất có nói, giếng này cả xóm từng dùng chung. Lấp đi ai cũng tiếc."',
        '@gio|Gió thổi tạt qua, mang theo mùi rêu ẩm và tiếng gàu va vào thành giếng.',
      ], choice: { q: 'Bố hỏi tính sao…', a: ['Đào lại giếng', 'Xây nhà đè lên như cũ'], to: ['e3', 'e4'] } },
      e1: { lines: [
        'Hai đứa đào xuống chừng một mét thì nước trong vắt trào lên.',
        '@bell|Nước mát lạnh, ngọt lịm. Vũng ướt giữa sân không còn xuất hiện nữa.',
        'Cả xóm kéo nhau tới gánh nước, nhà {A} thành nơi đông vui nhất xóm.',
      ], end: 'good' },
      e2: { lines: [
        'Hai đứa lấp đất lại, thắp nén nhang, khấn xin cho yên.',
        '@drip|Tiếng nhỏ giọt thưa dần, rồi im.',
        'Nhưng sáng nào vũng tròn cũng vẫn ướt, như có ai vừa lặng lẽ múc nước đi qua.',
      ], end: 'open' },
      e3: { lines: [
        'Cả nhà xắn tay đào lại giếng, lát đá xung quanh, làm cái nắp gỗ mới.',
        '@whisper|Đêm đầu tiên giếng có nước, cả nhà nghe tiếng thở phào rất khẽ.',
        'Từ đó nhà {A} làm ăn khấm khá, ai qua cũng xin ngụm nước giếng.',
      ], end: 'good' },
      e4: { lines: [
        '@knock|Móng nhà vừa đổ, đêm nào dưới nền cũng có tiếng gõ.',
        'Nền nhà nứt một đường cong tròn, đúng hình miệng giếng.',
        'Cuối cùng nhà {A} phải dời bếp sang chỗ khác, để lại một khoảng sân trống không ai dám xây.',
      ], end: 'bad' },
    },
  },
  // ===================== GỐC ĐA =====================
  {
    id: 'den-long-da', title: 'Chiếc Đèn Lồng Trên Cành Đa', teaser: 'Không ai treo, vậy mà đêm nào cũng sáng.',
    start: 's1', nodes: {
      s1: { lines: [
        'Trên cành đa cao nhất đầu làng, đêm nào cũng có một chiếc đèn lồng đỏ tự sáng.',
        'Chẳng ai treo nó, cũng chẳng ai với tới nổi cành ấy.',
        '{A}, {B} và {C} cược nhau, ai dám ra gốc đa lúc nửa đêm.',
        '@gio|Gió thổi, đèn lồng đung đưa. Ánh đỏ quét qua gốc đa như ai đang soi tìm.',
      ], choice: { q: 'Đèn lồng soi xuống gốc đa…', a: ['Lại gần gốc đa', 'Ném đá thử đèn lồng'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '@steps|Ba đứa rón rén tới gốc đa. Rễ phụ buông xuống như tấm màn.',
        'Ánh đèn lồng dừng lại trên đầu {C}, chiếu một vòng sáng tròn trên đất.',
        '@thamthi|Có giọng nói từ trên cao: "Đèn tắt dầu rồi… ai châm giùm…"',
      ], choice: { q: 'Có tiếng nhờ châm dầu…', a: ['Đem dầu tới', 'Chạy về'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        '{B} nhặt hòn sỏi ném lên. Hòn sỏi bay xuyên qua đèn lồng như xuyên qua khói.',
        '@hush|Đèn lồng tắt phụt. Cả gốc đa tối om.',
        '@luot|Rồi giữa các rễ đa, một bóng người cầm đèn lồng lướt nhanh qua, hướng về phía ba đứa.',
      ], choice: { q: 'Bóng cầm đèn lồng tới gần…', a: ['Xin lỗi ngay', 'Đứng im'], to: ['e3', 'e4'] } },
      e1: { lines: [
        'Hôm sau ba đứa xin bà một chai dầu lạc, đặt dưới gốc đa kèm cây diêm.',
        '@bell|Đêm ấy đèn lồng sáng rực hơn bao giờ hết, soi cả con đường về làng.',
        'Từ đó ai đi đêm qua gốc đa cũng có ánh đèn soi lối, chẳng ai còn sợ.',
      ], end: 'good' },
      e2: { lines: [
        '@laugh|Ba đứa chạy. Sau lưng có tiếng cười trong trẻo.',
        'Về tới nhà, trên hiên đã treo sẵn một chiếc đèn lồng đỏ, cháy leo lét.',
        'Sáng ra, đèn lồng biến mất, chỉ còn vệt muội đen trên xà nhà.',
      ], end: 'open' },
      e3: { lines: [
        '"Con xin lỗi, con dại dột," {B} cúi đầu.',
        '@whisper|Bóng người dừng lại, giọng một ông cụ: "Lần sau đừng ném. Đèn này soi đường cho người đi lạc."',
        'Đèn lồng sáng trở lại trên cành đa. {B} hôm sau mang dầu ra rót bù.',
      ], end: 'good' },
      e4: { lines: [
        '@jump|Bóng người đi xuyên qua cả ba, lạnh buốt như nước giếng.',
        'Đèn lồng không sáng lại nữa. Mấy tháng sau, có người đi đêm lạc vào ruộng sâu.',
        'Người làng góp tiền làm đèn mới treo lên cành đa, đèn mới sáng lại.',
      ], end: 'bad' },
    },
  },
  {
    id: 'co-tuong-da', title: 'Ván Cờ Dưới Gốc Đa', teaser: 'Ông cụ mời đánh một ván cờ tướng. Thua thì phải ở lại tới sáng.',
    start: 's1', nodes: {
      s1: { lines: [
        '{A} đi chợ đêm về, qua gốc đa thấy một ông cụ ngồi bên bàn cờ đá.',
        'Ông cụ mặc áo the, tóc bạc trắng, đèn dầu đặt cạnh bàn cờ.',
        '@whisper|"Ngồi xuống đánh với lão một ván. Lâu lắm chẳng ai chịu đánh."',
        '@clock|Từ đâu đó vọng tiếng đồng hồ quả lắc điểm mười hai tiếng.',
      ], choice: { q: 'Ông cụ mời đánh cờ…', a: ['Ngồi xuống đánh', 'Từ chối, xin phép đi'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        'Quân cờ lạnh như đá suối. Ông cụ đi nước nào cũng nhanh, cười khà khà.',
        '@hush|Đến nước thứ ba mươi, ông dừng tay: "Nước này mà đi sai thì ở lại tới sáng nhé."',
        '@thamthi|Xung quanh gốc đa, có tiếng xì xào bàn tán của rất nhiều người không thấy mặt.',
      ], choice: { q: 'Nước cờ quyết định…', a: ['Đi pháo chiếu tướng', 'Xin hoà'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        '"Dạ cháu về kẻo mẹ đợi," {A} cúi chào.',
        '@luot|Vừa bước đi, một bóng áo the lướt qua, chặn ngay trước mặt.',
        'Ông cụ đứng đó, tay cầm quân tướng: "Không đánh thì cầm giùm lão quân này về nhà."',
      ], choice: { q: 'Ông cụ đưa quân tướng…', a: ['Nhận lấy', 'Không nhận, chạy'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '{A} đẩy quân pháo: "Chiếu tướng!"',
        '@laugh|Ông cụ ngửa cổ cười vang: "Giỏi! Bao năm mới có người thắng lão."',
        'Gió thổi, đèn tắt, ông cụ biến mất. Trên bàn cờ đá có một đồng xu cổ, {A} giữ làm bùa may.',
      ], end: 'good' },
      e2: { lines: [
        '"Cháu xin hoà ạ." Ông cụ gật gù: "Hoà cũng được, nhưng phải ngồi uống với lão chén trà."',
        '@bell|Trà thơm mùi lá sen. Uống xong ngẩng lên thì trời đã hửng sáng, bàn cờ phủ đầy lá đa.',
        '{A} về nhà mới biết đã mất cả đêm, nhưng người khoẻ re, đầu óc minh mẫn lạ thường.',
      ], end: 'open' },
      e3: { lines: [
        '{A} cầm quân tướng về nhà, đặt lên bàn thờ.',
        '@whisper|Đêm ấy mơ thấy ông cụ cười: "Mai mang ra đình, để ván cờ còn đủ quân."',
        'Hôm sau đem ra đình, các cụ nhận ra đó là quân tướng thất lạc của bàn cờ đá làng từ mấy chục năm trước.',
      ], end: 'good' },
      e4: { lines: [
        '@steps|{A} chạy một mạch về nhà. Sau lưng có tiếng quân cờ gõ lạch cạch đuổi theo.',
        'Sáng ra, trên bậc cửa có quân tướng bằng đá đặt ngay ngắn.',
        'Đêm nào {A} cũng nghe tiếng gõ cờ ngoài sân, cho tới khi chịu mang quân cờ ra trả gốc đa.',
      ], end: 'bad' },
    },
  },
  // ===================== NGHĨA ĐỊA =====================
  {
    id: 'nguoi-gac-mo', title: 'Người Gác Nghĩa Trang', teaser: 'Ông gác nghĩa trang đi tuần mỗi đêm. Nhưng ông đã nghỉ hưu từ lâu.',
    start: 's1', nodes: {
      s1: { lines: [
        '{A} nhận việc trực đêm ở nghĩa trang làng thay ông Sáu già vừa nghỉ.',
        'Ông Sáu dặn: "Đêm thấy đèn pin đi tuần thì đừng gọi. Cứ để nó đi hết vòng."',
        '@clock|Đúng nửa đêm, giữa hàng bia mộ có một ánh đèn pin lắc lư, chậm rãi đi từng hàng.',
        '@steps|Tiếng dép lẹp xẹp nghe rõ mồn một, dù nghĩa trang không có ai.',
      ], choice: { q: 'Ánh đèn pin đi tuần…', a: ['Gọi to hỏi ai đó', 'Ngồi yên trong chòi gác'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '"Ai đó?" {A} gọi. Ánh đèn dừng lại, quay phắt về phía chòi.',
        '@hush|Cả nghĩa trang im phăng phắc, cả tiếng dế cũng tắt.',
        '@thamthi|Một giọng khàn khàn đáp: "Tuần tra. Cậu là người mới à?"',
      ], choice: { q: 'Giọng khàn hỏi…', a: ['Đáp: "Dạ, cháu mới tới"', 'Tắt đèn, không đáp'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        'Ánh đèn đi hết một vòng, dừng lại trước chòi gác.',
        '@knock|Ba tiếng gõ nhẹ lên cửa gỗ.',
        'Qua khe cửa, {A} thấy một đôi dép tổ ong cũ, dính đầy đất đỏ, đứng ngay bậc thềm.',
      ], choice: { q: 'Có người gõ cửa chòi…', a: ['Mở cửa', 'Đặt chén trà ra ngoài cửa'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '"Dạ, cháu mới tới." Ánh đèn gật gật như người gật đầu.',
        '@whisper|"Tốt. Cây đa góc trái hay có trẻ con trèo, nhớ để ý." Rồi ánh đèn tắt.',
        'Sáng ra {A} kể, ông Sáu cười: "Ông Bảy đó. Gác ở đây bốn chục năm, mất rồi vẫn chưa chịu nghỉ."',
      ], end: 'good' },
      e2: { lines: [
        '@luot|{A} tắt đèn. Một bóng người lướt ngang ô cửa sổ.',
        'Cả đêm tiếng dép lẹp xẹp đi vòng quanh chòi gác, không dứt.',
        'Sáng ra quanh chòi in một vòng dấu dép đất đỏ. {A} xin thôi việc ngay hôm đó.',
      ], end: 'bad' },
      e3: { lines: [
        '@jump|Cửa mở. Không có ai. Chỉ có chiếc đèn pin cũ đặt dưới đất, vẫn còn sáng.',
        'Trên thân đèn khắc chữ "Bảy - gác đêm". {A} giữ lại, đêm nào đi tuần cũng mang theo.',
        'Lạ là đèn chẳng bao giờ hết pin.',
      ], end: 'open' },
      e4: { lines: [
        '{A} rót chén trà nóng đặt ra bậc cửa: "Mời bác uống cho ấm."',
        '@bell|Sáng ra chén trà đã cạn, bên cạnh có một nắm hoa dại buộc gọn.',
        'Từ đó {A} trực đêm chẳng bao giờ sợ. Có tiếng dép đi tuần cùng, thấy yên tâm hơn.',
      ], end: 'good' },
    },
  },
  {
    id: 'bo-hoa-mo', title: 'Bó Hoa Trên Ngôi Mộ Không Tên', teaser: 'Không ai biết mộ của ai. Nhưng sáng nào cũng có hoa tươi.',
    start: 's1', nodes: {
      s1: { lines: [
        'Góc nghĩa địa có một ngôi mộ không tên, bia đã mòn hết chữ.',
        'Vậy mà sáng nào trên mộ cũng có một bó hoa sứ trắng còn đọng sương.',
        '{A} và {B} quyết rình xem ai mang hoa tới.',
        '@hush|Ba giờ sáng, mọi tiếng côn trùng tắt cùng một lúc.',
      ], choice: { q: 'Côn trùng im bặt lúc ba giờ sáng…', a: ['Nhìn về phía ngôi mộ', 'Nhắm mắt chờ'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '@luot|Một bóng con gái mặc áo dài trắng lướt qua hàng bia, tay ôm bó hoa sứ.',
        'Cô đặt bó hoa lên ngôi mộ không tên, rồi ngồi xuống, tựa đầu vào tấm bia mòn.',
        '@thamthi|Tiếng hát rất khẽ: "Anh đi chẳng hẹn ngày về…"',
      ], choice: { q: 'Cô gái hát bên mộ…', a: ['Lại gần hỏi', 'Lặng lẽ ra về'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        'Hai đứa nhắm mắt. Mùi hoa sứ thơm ngào ngạt, mỗi lúc một gần.',
        '@steps|Có tiếng guốc gỗ gõ trên lối đi, dừng ngay trước mặt hai đứa.',
        '@whisper|Một giọng con gái hỏi: "Hai em có biết anh ấy tên gì không?"',
      ], choice: { q: 'Cô gái hỏi tên người dưới mộ…', a: ['Hứa sẽ tìm giúp', 'Lắc đầu im lặng'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '{A} bước tới: "Chị ơi…" Cô gái ngẩng lên, rồi tan vào sương sớm.',
        '@bell|Trên bia mộ, lớp rêu bong ra, lộ hai chữ khắc mờ mờ: tên một người lính trẻ.',
        'Hai đứa báo xã, ngôi mộ được ghi tên, sơn lại bia. Từ đó không còn bó hoa nào nữa, như đã yên lòng.',
      ], end: 'good' },
      e2: { lines: [
        'Hai đứa lặng lẽ về. Tiếng hát theo sau một quãng rồi nhỏ dần.',
        '@cry|Gần sáng, có tiếng khóc rất khẽ vọng về từ phía nghĩa địa.',
        'Bó hoa sứ vẫn xuất hiện mỗi sáng. Đến giờ vẫn chẳng ai biết ngôi mộ ấy của ai.',
      ], end: 'open' },
      e3: { lines: [
        '"Tụi em sẽ tìm giúp chị," {B} nói.',
        '@whisper|"Cảm ơn em. Anh ấy hay thổi sáo ở bến sông." Rồi tiếng guốc xa dần.',
        'Hai đứa hỏi các cụ ở bến sông, tìm ra tên người thổi sáo năm xưa. Ngôi mộ có bia mới, bó hoa sứ cuối cùng héo dịu dàng trên đó.',
      ], end: 'good' },
      e4: { lines: [
        '@gio|Cô gái thở dài. Một cơn gió lạnh thổi qua, hoa sứ rụng trắng cả lối đi.',
        'Sáng ra, hai đứa thấy mỗi đứa có một bông sứ cài trên tóc, không biết từ lúc nào.',
        'Mấy đêm liền, cả hai đều mơ thấy cô gái đứng ở cổng nghĩa địa, hỏi đi hỏi lại một câu.',
      ], end: 'bad' },
    },
  },
  {
    id: 'chuong-mo-co', title: 'Chiếc Chuông Trên Mộ Cổ', teaser: 'Mộ cổ có treo chuông nhỏ. Chuông chỉ rung khi không có gió.',
    start: 's1', nodes: {
      s1: { lines: [
        'Giữa nghĩa địa có ngôi mộ cổ xây hình thuyền, đầu mộ treo một chiếc chuông đồng nhỏ.',
        'Người làng bảo: chuông rung khi có gió là chuyện thường. Chuông rung khi lặng gió thì phải tránh xa.',
        '{A}, {B} và {C} đi đường tắt qua nghĩa địa lúc tối muộn.',
        '@hush|Trời lặng gió hoàn toàn. Rồi chiếc chuông khẽ rung: leng keng.',
      ], choice: { q: 'Chuông rung khi lặng gió…', a: ['Lại xem ai rung chuông', 'Đi vòng tránh xa'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '@bell|Tới gần, chiếc chuông vẫn rung đều đều, sợi dây treo đung đưa như có tay ai lắc.',
        'Trên thành mộ hình thuyền có khắc dòng chữ cũ: "Người lái đò họ Trần".',
        '@thamthi|Có tiếng gọi khàn khàn, đều như hiệu lệnh: "Qua sông… qua sông…"',
      ], choice: { q: 'Tiếng gọi qua sông…', a: ['Đáp: "Tụi cháu không qua sông"', 'Giữ chuông cho thôi rung'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        '@steps|Ba đứa đi vòng. Nhưng tiếng chuông cứ đi theo, lúc bên trái, lúc bên phải.',
        '@luot|Giữa hai hàng bia, một bóng người đội nón lá, tay cầm mái chèo, lướt qua.',
        'Dưới chân ba đứa, cỏ ướt sũng như vừa có nước lũ chảy qua.',
      ], choice: { q: 'Bóng người cầm chèo…', a: ['Cúi chào', 'Chạy thật nhanh'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '"Tụi cháu không qua sông đâu ông ơi. Tụi cháu về nhà," {C} nói to.',
        '@whisper|Chuông ngưng rung. Có tiếng cười hiền: "Ừ, về đi, đêm khuya rồi."',
        'Từ đó, đi qua mộ thuyền ai cũng chào ông lái đò một câu, chuông chẳng bao giờ rung lúc lặng gió nữa.',
      ], end: 'good' },
      e2: { lines: [
        '{B} nắm lấy chuông. Đồng lạnh buốt như băng.',
        '@jump|Cả nghĩa địa bỗng vang lên tiếng chuông, hàng trăm chiếc cùng rung ở khắp nơi.',
        'Ba đứa chạy về, tai còn ù tiếng chuông suốt ba ngày.',
      ], end: 'bad' },
      e3: { lines: [
        'Ba đứa đứng nép sang bên, cúi đầu chào. Bóng người gật nón đáp lễ, rồi đi về phía sông.',
        '@bell|Tiếng chuông xa dần, dừng ở bến sông.',
        'Sáng ra người làng thấy chiếc đò cũ buộc ở bến tự dưng sạch bong, như vừa có người lau chùi.',
      ], end: 'good' },
      e4: { lines: [
        '@gio|Ba đứa chạy. Gió nổi lên ầm ầm, chiếc chuông rung loạn xạ sau lưng.',
        'Về tới nhà, giày của cả ba ướt sũng nước sông, dính đầy lục bình.',
        'Đêm đó cả xóm nghe tiếng mái chèo khua nước ở nơi không có con sông nào.',
      ], end: 'open' },
    },
  },
  // ===================== MIẾU HOANG =====================
  {
    id: 'tuong-da-quay', title: 'Pho Tượng Đá Đổi Hướng', teaser: 'Pho tượng trong miếu hoang mỗi sáng lại quay một hướng khác.',
    start: 's1', nodes: {
      s1: { lines: [
        'Miếu hoang ven rừng có một pho tượng đá ngồi xếp bằng, rêu phủ kín.',
        'Mấy đứa chăn trâu kể: sáng nay tượng quay mặt ra cổng, hôm qua lại quay vào vách.',
        '{A} và {B} rủ nhau tối nay ngủ lại miếu xem tận mắt.',
        '@creak|Nửa đêm, có tiếng đá cọ vào đá, ken két, rất chậm.',
      ], choice: { q: 'Tiếng đá cọ trong miếu…', a: ['Soi đèn nhìn tượng', 'Giả vờ ngủ'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '@hush|Ánh đèn soi vào. Pho tượng vẫn ngồi yên, nhưng đã quay hẳn về phía hai đứa.',
        'Trên đầu tượng, rêu rụng xuống lả tả, lộ ra đôi mắt đá khép hờ.',
        '@thamthi|Tiếng nói trầm như vọng từ đáy giếng: "Mái dột… ướt lưng lắm…"',
      ], choice: { q: 'Tượng than mái dột…', a: ['Hứa sửa mái miếu', 'Tắt đèn chạy ra'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        'Hai đứa nhắm mắt, tim đập thình thịch.',
        '@steps|Tiếng đá cọ dừng lại. Thay vào đó là tiếng bước chân nặng nề, chậm rãi, ngay cạnh chiếu.',
        '@gio|Một luồng gió lạnh phả lên mặt, mùi rêu ẩm và mùi nhang cũ.',
      ], choice: { q: 'Bước chân nặng nề bên cạnh…', a: ['Mở mắt nhìn', 'Niệm Phật thật to'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '"Mai tụi con rủ cả xóm sửa mái cho ngài," {A} hứa.',
        '@bell|Đôi mắt đá khép lại. Pho tượng từ từ quay về chính giữa.',
        'Tuần sau, cả xóm góp ngói sửa miếu. Từ đó tượng không quay nữa, ngồi ngay ngắn nhìn ra cổng.',
      ], end: 'good' },
      e2: { lines: [
        '@laugh|Hai đứa chạy ra. Sau lưng có tiếng cười trầm đục vang khắp miếu.',
        'Sáng ra, mấy đứa chăn trâu báo: pho tượng giờ quay mặt về phía làng.',
        'Đêm nào trời mưa, người làng gần miếu cũng nghe tiếng thở dài.',
      ], end: 'bad' },
      e3: { lines: [
        '@jump|Hai đứa mở mắt. Pho tượng đứng sừng sững ngay cạnh chiếu, cao gần chạm xà.',
        'Rồi tượng chỉ tay lên mái, nơi có một lỗ thủng lớn, nước mưa đọng thành vũng dưới bệ.',
        'Hai đứa hiểu ý, về kể cho làng. Mái miếu được sửa, nhưng chẳng ai giải thích nổi sao tượng lại đổi chỗ tới cạnh cửa.',
      ], end: 'open' },
      e4: { lines: [
        'Hai đứa niệm Phật thật to. Tiếng bước chân dừng lại.',
        '@whisper|Một giọng hiền từ: "Đừng sợ. Ta chỉ muốn đắp chăn cho hai đứa."',
        'Sáng ra, trên người hai đứa có tấm áo tơi cũ của miếu, ấm áp lạ thường.',
      ], end: 'good' },
    },
  },
  {
    id: 'nen-mieu', title: 'Ngọn Nến Không Bao Giờ Tắt', teaser: 'Miếu không người, vậy ai thắp nến mỗi đêm?',
    start: 's1', nodes: {
      s1: { lines: [
        'Miếu hoang không người trông coi, vậy mà đêm nào cũng có một ngọn nến cháy trên bàn thờ.',
        '{A}, {B} và {C} đi lạc trong rừng, thấy ánh nến liền tìm tới trú mưa.',
        '@drip|Mưa rỉ rả. Ngọn nến cháy đứng im, không lay động dù gió lùa qua cửa.',
        '@hush|Nhìn kỹ, nến cháy mà không hề ngắn đi chút nào.',
      ], choice: { q: 'Ngọn nến cháy mãi không ngắn…', a: ['Ngồi sưởi bên nến', 'Thổi tắt nến'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        'Ba đứa ngồi sát ngọn nến. Lạ thay, nó ấm như một đống lửa nhỏ.',
        '@thamthi|Tiếng thì thầm đi một vòng quanh miếu: "Giữ lửa… giữ lửa…"',
        '@luot|Ngoài cửa, có bóng ai cầm ô lướt qua, dừng lại nhìn vào.',
      ], choice: { q: 'Bóng cầm ô đứng ngoài cửa…', a: ['Mời vào trú mưa', 'Kéo cửa đóng lại'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        '{B} cúi xuống thổi. Ngọn nến không tắt, chỉ ngả nghiêng rồi đứng thẳng lại.',
        '@gio|Gió ngoài trời rít lên, cửa miếu đập rầm rầm.',
        '@knock|Rồi có tiếng gõ trên bàn thờ, ba tiếng, chậm rãi như người gõ mõ.',
      ], choice: { q: 'Tiếng gõ trên bàn thờ…', a: ['Thắp thêm nhang xin lỗi', 'Ôm nhau chạy ra mưa'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '"Vào đây trú mưa với tụi con," {A} gọi.',
        '@whisper|Bóng người bước vào, là một bà cụ. Bà ngồi xuống bên nến: "Ba chục năm rồi mới có người mời."',
        'Ba đứa ngủ thiếp đi. Sáng ra mưa tạnh, bà cụ đã đi, bên nến có một gói xôi còn ấm và tấm bản đồ chỉ đường ra khỏi rừng.',
      ], end: 'good' },
      e2: { lines: [
        '@jump|Cửa vừa đóng, ngọn nến vụt tắt.',
        'Cả miếu tối đen. Ngoài cửa, tiếng mưa rơi lộp độp lên ô rất lâu mới xa dần.',
        'Sáng ra ba đứa tìm được đường về, nhưng từ đó đi qua khu rừng ấy chẳng bao giờ còn thấy ánh nến.',
      ], end: 'bad' },
      e3: { lines: [
        '{C} lấy nhang trong túi áo, thắp lên khấn xin lỗi.',
        '@bell|Tiếng gõ dừng. Ngọn nến bừng sáng, soi rõ tấm bảng gỗ: "Miếu bà giữ lửa cho người đi rừng".',
        'Ba đứa ngủ yên tới sáng. Về làng kể lại, các cụ bảo đó là bà Tư giữ miếu ngày xưa.',
      ], end: 'good' },
      e4: { lines: [
        '@steps|Ba đứa lao ra mưa, chạy mãi mới thấy đường làng.',
        'Ngoái lại, ánh nến trong miếu vẫn cháy, như dõi theo cho tới khi cả ba ra khỏi rừng.',
        'Mấy hôm sau quay lại tìm, chỉ thấy nền miếu đổ nát, không có bàn thờ nào cả.',
      ], end: 'open' },
    },
  },
]);
