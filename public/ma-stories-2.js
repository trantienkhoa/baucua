// Ngọn Đèn Cuối Cùng — kho truyện ma phần 2 (cách viết: xem đầu file ma-stories.js)
window.MA_STORIES = (window.MA_STORIES || []).concat([
  {
    id: 'ma-da',
    title: 'Khúc Sông Ma Da',
    teaser: 'Năm nào khúc sông ấy cũng bắt đúng một người…',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          'Làng {A} có một khúc sông nước xoáy. Người già bảo: năm nào ma da ở đó cũng phải bắt đủ một người.',
          'Trưa hè oi ả, {A} và {B} trốn ngủ trưa, rủ nhau ra sông tắm.',
          '@drip|Nước mát lạnh lạ thường. Giữa dòng, có một cô gái tóc dài đang vẫy tay gọi: "Ra đây chơi đi, chỗ này cạn lắm."',
          'Nhưng ai trong làng cũng biết, giữa sông sâu hơn ba con sào.',
        ],
        choice: { q: 'Cô gái vẫn đang vẫy gọi {A}…', a: ['Bơi ra chỗ cô gái', 'Kéo {B} lên bờ ngay'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} bơi ra. Càng bơi, cô gái càng lùi xa, nụ cười càng rộng.',
          '@whisper|Bỗng một bàn tay lạnh ngắt nắm chặt cổ chân {A}, kéo tuột xuống.',
          'Dưới làn nước đục, {A} thấy hàng chục gương mặt trắng bệch đang ngửa lên nhìn mình.',
        ],
        choice: { q: '{A} đang bị kéo xuống đáy sông…', a: ['Đạp thật mạnh rồi ngoi lên', 'Niệm Phật trong đầu'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} túm tay {B} kéo vào bờ. Ngoảnh lại, giữa sông chẳng còn ai.',
          '@laugh|Đêm ấy, có tiếng gõ cửa sổ phòng {A}, kèm tiếng nước nhỏ giọt tí tách.',
          'Giọng con gái thì thầm: "Còn thiếu một người… cho mình mượn {B} được không?"',
        ],
        choice: { q: 'Giọng nói đang chờ câu trả lời…', a: ['Mở cửa sổ ra', 'Đốt vàng mã cho cô ấy'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} vùng vẫy, đạp trúng thứ gì mềm nhũn rồi trồi lên mặt nước, ho sặc sụa.',
          '@scream|Lúc được kéo lên bờ, cổ chân {A} hằn rõ năm vết ngón tay tím đen.',
          'Từ đó, mỗi lần mưa, {A} lại nghe tiếng ai đó gọi tên mình từ phía bờ sông.',
        ],
        end: 'open',
      },
      e2: {
        lines: [
          '{A} nhắm mắt niệm Phật. Bàn tay dưới chân lỏng dần, rồi buông hẳn.',
          '@bell|{A} được người đi đánh cá vớt lên. Ông lão lắc đầu: "Con được tha rồi đó. Nhớ thắp cho người ta nén nhang."',
          'Năm ấy, lần đầu tiên, khúc sông không bắt ai.',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          '{A} mở cửa sổ. Bên ngoài chỉ có một vũng nước đọng trên bậu cửa.',
          '@jump|Sáng hôm sau, người ta tìm khắp làng. Chiếc dép của {B} trôi lững lờ ở khúc sông xoáy.',
          'Còn {A} thì cứ đứng trên bờ, nhìn xuống nước, lẩm bẩm: "Đủ rồi… đủ một người rồi."',
        ],
        end: 'bad', take: 'B',
      },
      e4: {
        lines: [
          '{A} đốt vàng mã, áo giấy và một chiếc lược nhỏ, khấn: "Cô cầm lấy, đừng bắt ai nữa."',
          '@wind|Gió thổi tro bay về phía sông. Tiếng gõ cửa im bặt.',
          'Sáng ra, bậu cửa sổ khô ráo, chỉ còn một vệt bùn hình bàn tay nhỏ… như đang vẫy chào.',
        ],
        end: 'good',
      },
    },
  },

  {
    id: 'ma-lai',
    title: 'Cái Đầu Bay Lúc Nửa Đêm',
    teaser: 'Bà hàng xóm hiền lành… nhưng đêm nào đầu bà cũng rời khỏi cổ.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          '{A} về quê ngoại nghỉ hè. Nhà bên cạnh có một bà cụ hiền lành, ngày nào cũng cho kẹo.',
          'Ngoại dặn: "Tối đừng ra vườn sau. Nhất là đêm không trăng."',
          '@wind|Nửa đêm, {A} dậy đi vệ sinh, thấy một đốm sáng xanh lơ lửng ngoài vườn chuối.',
          'Lại gần mới thấy: đó là một cái đầu người, toả ra thứ ánh sáng xanh lạnh lẽo, đang bay là là trên mặt đất.',
        ],
        choice: { q: 'Cái đầu từ từ quay lại…', a: ['Nấp sau bụi chuối', 'Chạy về gọi ngoại'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} nín thở nấp sau bụi chuối. Cái đầu bay ngang qua, mùi tanh nồng nặc.',
          'Dưới ánh sáng xanh, {A} nhận ra gương mặt quen thuộc: chính là bà cụ nhà bên.',
          '@laugh|Bà dừng lại, hít hít không khí, rồi nhe răng cười: "Có mùi trẻ con…"',
        ],
        choice: { q: 'Cái đầu đang đánh hơi…', a: ['Bỏ chạy qua nhà bà cụ', 'Đứng im không thở'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} chạy về, lay ngoại dậy. Ngoại tái mặt, lấy nắm gai bưởi rải quanh giường.',
          '@knock|Cộc… cộc… Có thứ gì đập nhẹ vào vách nhà, như ai đang tìm đường vào.',
          'Ngoại thì thầm: "Ma lai phải về nhập lại xác trước khi gà gáy. Không thì nó chết."',
        ],
        choice: { q: 'Ngoại có một cách…', a: ['Lật úp tấm chăn bên nhà kia', 'Chờ tới sáng'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} lẻn sang nhà bà cụ. Trên giường, chiếc chăn phồng lên như có người nằm, nhưng chiếc gối thì trống trơn.',
          '@jump|Sau lưng {A}, giọng bà cụ vang lên rất gần: "Cháu tìm bà à?"',
          'Sáng hôm sau, bà cụ lại ra ngõ cho kẹo như thường. Chỉ có điều, {A} không còn ở đó để nhận.',
        ],
        end: 'bad', take: 'A',
      },
      e2: {
        lines: [
          '{A} đứng im, nín thở tới mức lồng ngực đau rát.',
          '@steps|Cái đầu lượn quanh ba vòng, rồi bay vụt về phía nhà bên khi tiếng gà gáy đầu tiên vang lên.',
          'Từ đó, mỗi lần bà cụ cho kẹo, bà lại nhìn {A} rất lâu, mỉm cười: "Lần sau đừng nấp nữa nhé."',
        ],
        end: 'open',
      },
      e3: {
        lines: [
          '{A} cùng {B} lẻn sang, lật úp tấm chăn trên giường bà cụ, rắc tro bếp lên cổ.',
          '@scream|Gà gáy. Ngoài vườn vang lên tiếng rít xé tai, rồi im bặt.',
          'Sáng ra, cả làng đồn bà cụ nhà bên mất trong đêm. Nhưng {A} biết, bà chỉ không về được nữa thôi.',
        ],
        end: 'good',
      },
      e4: {
        lines: [
          'Hai bà cháu ôm nhau ngồi tới sáng giữa vòng gai bưởi.',
          '@bell|Tiếng đập vách dừng hẳn khi trời hửng. Ngoài sân có một vệt bùn kéo dài về phía nhà bên.',
          'Hôm ấy, bà cụ đóng cửa không ra ngõ. Hôm sau, cả nhà bà dọn đi, không ai biết đi đâu.',
        ],
        end: 'good',
      },
    },
  },

  {
    id: 'xe-om',
    title: 'Cuốc Xe Ôm Lúc Hai Giờ',
    teaser: 'Khách trả tiền hậu hĩnh. Sáng ra, tờ tiền biến thành vàng mã.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          '{A} chạy xe ôm đêm. Hai giờ sáng, một cô gái mặc áo dài trắng vẫy ở cổng bệnh viện cũ.',
          '"Chở em về nhà, ở cuối đường Nghĩa Trang. Em trả gấp ba."',
          '@wind|Suốt đường đi, lưng {A} lạnh buốt như có người áp khối nước đá vào.',
          'Nhìn gương chiếu hậu, yên sau trống trơn. Nhưng xe vẫn nặng như đang chở một người.',
        ],
        choice: { q: 'Yên sau vẫn nặng trĩu…', a: ['Quay lại hỏi chuyện', 'Cứ chạy, không nhìn lại'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} run run hỏi: "Em… nhà em số mấy?"',
          '@whisper|Một bàn tay lạnh ngắt luồn qua eo, ôm chặt lấy {A}: "Số mười bảy. Ngay cạnh mộ ba em."',
          'Đèn đường phía trước tắt dần từng ngọn một.',
        ],
        choice: { q: 'Bàn tay ôm ngày một chặt…', a: ['Phanh gấp, nhảy xuống xe', 'Chở cô ấy về tới nơi'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} cắm đầu chạy. Tới cuối đường, cô gái nhẹ nhàng xuống xe, đưa một xấp tiền.',
          '"Cầm đi. Mai quay lại đây, em gửi thêm."',
          '@laugh|Cô bước qua cánh cổng sắt của nghĩa trang, rồi tan vào màn sương.',
        ],
        choice: { q: 'Xấp tiền vẫn còn trong tay {A}…', a: ['Mai quay lại lấy thêm', 'Mang tiền đi đốt trả'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} phanh gấp, nhảy khỏi xe. Chiếc xe đổ kềnh, đèn pha rọi thẳng vào hàng bia mộ.',
          '@scream|Trên bia mộ gần nhất có tấm ảnh cô gái áo dài trắng. Ngày mất: đúng hôm nay, mười năm trước.',
          'Người ta tìm thấy xe của {A} ở cổng nghĩa trang. Còn {A} thì không.',
        ],
        end: 'bad', take: 'A',
      },
      e2: {
        lines: [
          '{A} cắn răng chở tới nơi. Cô gái xuống xe, cúi đầu: "Cảm ơn nhé. Mười năm rồi em mới được về nhà."',
          '@bell|Hôm sau, {A} mua bó hoa ra thắp cho mộ số mười bảy.',
          'Từ đó, đêm nào chạy ngang bệnh viện cũ, {A} cũng thấy một bóng áo trắng đứng vẫy… nhưng là vẫy chào.',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          'Sáng ra, xấp tiền đã thành giấy vàng mã. Nhưng {A} vẫn tham, tối hôm sau lại quay lại.',
          '@jump|Cô gái đứng chờ sẵn, lần này không đi một mình. Sau lưng cô là cả chục bóng trắng: "Chở hết bọn em nhé."',
          'Chiếc xe ôm của {A} được tìm thấy dựng ngay ngắn giữa nghĩa trang, bình xăng đầy, chìa khoá còn cắm.',
        ],
        end: 'bad', take: 'A',
      },
      e4: {
        lines: [
          '{A} mang xấp tiền ra cổng nghĩa trang đốt, kèm ba nén nhang.',
          '@wind|Tro bay lên, xoáy tròn quanh {A} một vòng như một cái ôm, rồi tan.',
          'Đêm ấy {A} chạy được nhiều cuốc nhất từ trước tới giờ. Ai cũng bảo: được người âm phù hộ rồi.',
        ],
        end: 'good',
      },
    },
  },

  {
    id: 'cuoc-goi',
    title: 'Cuộc Gọi Từ Số Máy Của Bà',
    teaser: 'Bà mất được bốn mươi chín ngày. Đêm nay, điện thoại hiện tên bà gọi tới.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          'Bà nội của {A} mất đã bốn mươi chín ngày. Chiếc điện thoại cũ của bà được cất trong tủ thờ.',
          '@phone|Đêm làm lễ bốn mươi chín ngày, đúng mười hai giờ, điện thoại của {A} đổ chuông. Màn hình hiện: "Bà nội".',
          'Đầu dây bên kia chỉ có tiếng thở khò khè, rồi giọng bà rất khẽ: "Cháu ơi… mở cửa cho bà vào."',
        ],
        choice: { q: 'Giọng bà vẫn đang chờ…', a: ['Ra mở cửa cho bà', 'Hỏi bà một câu chỉ bà biết'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} chạy ra cửa. Ngoài sân trống không, chỉ có tiếng dép lẹp xẹp đi thẳng vào nhà.',
          '@steps|Tiếng dép dừng lại trước bàn thờ. Mâm cơm cúng tự nhiên mất đi một bát.',
          '@whisper|Rồi từ phòng ngủ của {B}, có tiếng bà ru hát, đúng bài ngày xưa bà vẫn hát.',
        ],
        choice: { q: 'Tiếng hát ru từ phòng {B}…', a: ['Mở cửa phòng {B}', 'Thắp nhang mời bà về'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} hỏi: "Bà ơi, ngày xưa bà hay gọi cháu là gì?"',
          'Im lặng rất lâu. Rồi giọng nói đổi khác, khàn đặc: "Bà… quên rồi."',
          '@laugh|Tiếng cười khanh khách vang lên, không còn là giọng của bà nữa.',
        ],
        choice: { q: 'Cái thứ ấy không phải bà…', a: ['Cúp máy, tắt nguồn', 'Gọi lại vào số đó'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} mở cửa. {B} đang ngủ say, khoé miệng mỉm cười như hồi còn bé.',
          '@bell|Bên gối {B} có một cái kẹo gừng, thứ kẹo mà ngày xưa bà vẫn giấu trong túi áo.',
          'Sáng hôm sau, điện thoại của bà tự tắt nguồn, và không bao giờ bật lên được nữa. Bà đã đi thanh thản.',
        ],
        end: 'good',
      },
      e2: {
        lines: [
          '{A} thắp nhang, khấn: "Bà về ăn cơm với con cháu rồi đi cho thanh thản bà nhé."',
          '@wind|Khói nhang cuộn tròn, bay vòng quanh từng người trong nhà như một cái xoa đầu.',
          'Tiếng hát ru nhỏ dần rồi tắt. Đêm ấy, cả nhà đều mơ thấy bà cười.',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          '{A} cúp máy, tháo luôn pin điện thoại.',
          '@phone|Ba giây sau, chiếc điện thoại không pin lại đổ chuông.',
          'Màn hình hiện một dòng chữ: "Đừng cúp máy. Bà đang đứng ngay sau lưng cháu đây."',
        ],
        end: 'open',
      },
      e4: {
        lines: [
          '{A} gọi lại. Tiếng chuông vang lên… từ trong tủ thờ.',
          '@jump|Điện thoại cũ của bà sáng rực, màn hình là ảnh chụp {A} đang đứng gọi điện, chụp từ phía sau.',
          'Người nhà tìm thấy điện thoại của {A} đặt ngay ngắn trên bàn thờ, cạnh di ảnh của bà. Còn {A} thì không thấy đâu nữa.',
        ],
        end: 'bad', take: 'A',
      },
    },
  },

  {
    id: 'guong-dem',
    title: 'Chải Tóc Trước Gương Lúc Nửa Đêm',
    teaser: 'Người ta bảo đừng soi gương lúc mười hai giờ đêm. {A} không tin.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          'Có một lời đồn: đúng mười hai giờ đêm, chải tóc trước gương một trăm lần, sẽ thấy người mình sẽ lấy.',
          '{A} thắp một ngọn nến, ngồi trước gương, vừa chải vừa đếm. Chín mươi tám… chín mươi chín…',
          '@mirror|Lần thứ một trăm. Trong gương, sau lưng {A}, có một người đang đứng.',
          'Người đó cũng đang chải tóc. Nhưng là chải mái tóc của {A}.',
        ],
        choice: { q: 'Chiếc lược trong gương vẫn đang chải…', a: ['Quay đầu lại nhìn', 'Thổi tắt nến'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} quay phắt lại. Sau lưng không có ai.',
          'Quay về phía gương, hình phản chiếu của {A} vẫn đang ngồi nguyên, chưa hề quay đi.',
          '@whisper|Hình trong gương từ từ mỉm cười, môi mấp máy: "Đổi chỗ nhé?"',
        ],
        choice: { q: 'Hình trong gương đang áp tay lên mặt kính…', a: ['Đập vỡ gương', 'Úp gương xuống, phủ vải đỏ'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} thổi phụt ngọn nến. Căn phòng tối om.',
          '@steps|Có tiếng chân trần bước ra khỏi gương, đặt xuống sàn gỗ.',
          '@laugh|Tiếng lược chải tóc vẫn đều đều, giờ đã ở ngay sau gáy {A}.',
        ],
        choice: { q: 'Tiếng chải tóc ngay sau gáy…', a: ['Bật đèn lên', 'Gọi to tên {B}'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} cầm ghế đập vỡ tấm gương. Mảnh kính văng khắp phòng.',
          '@scream|Trong mỗi mảnh vỡ đều có một gương mặt của {A}, mắt trắng dã, đang cười.',
          'Sáng hôm sau, {B} vào phòng thì thấy {A} vẫn ngồi trước khung gương rỗng, tay cầm lược, đếm: "Một trăm lẻ một… một trăm lẻ hai…"',
        ],
        end: 'bad', take: 'A',
      },
      e2: {
        lines: [
          '{A} vội úp tấm gương xuống, trùm kín bằng tấm vải đỏ trên bàn thờ.',
          '@knock|Từ dưới tấm vải có tiếng gõ nhẹ: cộc, cộc, cộc… rồi im.',
          'Hôm sau, {A} mang gương lên chùa gửi. Từ đó không bao giờ soi gương sau mười giờ đêm nữa.',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          '{A} lao tới bật công tắc. Đèn sáng.',
          '@jump|Ngay trước mặt, trong gương, không còn hình {A} nữa. Chỉ có một người con gái lạ, mặc đồ của {A}, đang vẫy tay chào.',
          'Từ hôm ấy, người nhà thấy {A} hơi lạ. Ít nói hẳn, và rất thích ngồi chải tóc trước gương.',
        ],
        end: 'bad', take: 'A',
      },
      e4: {
        lines: [
          '{A} hét to: "{B} ơi!" Cửa bật mở, {B} cầm đèn pin chạy vào.',
          '@door|Ánh đèn rọi vào gương: trên mặt kính có một vết bàn tay ướt từ phía bên trong.',
          '{B} nhìn vết tay rất lâu: "Nó chưa đi đâu. Nó chỉ chờ lần sau thôi."',
        ],
        end: 'open',
      },
    },
  },

  {
    id: 'ky-tuc-xa',
    title: 'Giường Số Chín Phòng 307',
    teaser: 'Phòng chỉ có tám người. Vậy ai đang ngủ ở giường số chín?',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          'Ký túc xá cũ, phòng 307 có tám sinh viên, trong đó có {A} và {B}. Góc phòng có một giường số chín bỏ trống.',
          'Quản lý dặn: "Đừng ai ngủ giường đó. Cũng đừng để đồ lên đó."',
          '@clock|Đêm thi cuối kỳ, ba giờ sáng, {A} học bài thì nghe tiếng sột soạt từ giường số chín.',
          'Tấm màn của giường số chín đã được ai đó buông xuống. Bên trong, có một bóng người đang ngồi.',
        ],
        choice: { q: 'Bóng người sau tấm màn đang ngồi im…', a: ['Vén màn lên xem', 'Đánh thức cả phòng'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} rón rén vén màn. Một cô gái mặc đồng phục cũ đang ôm sách, cúi đầu lẩm nhẩm.',
          '@whisper|"Cậu ơi… bài này giải thế nào? Tớ học mãi không xong. Mai thi rồi."',
          'Cuốn sách trên tay cô ấy in năm 1998.',
        ],
        choice: { q: 'Cô gái đưa cuốn sách cho {A}…', a: ['Ngồi giảng bài cho cô ấy', 'Nói thật: cậu đã mất rồi'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} bật đèn, gọi cả phòng dậy. Tấm màn giường số chín đã được vén lên gọn gàng.',
          'Trên giường có một tờ giấy thi, nét chữ nắn nót, ghi tên… {B}.',
          '@laugh|{B} tái mặt: "Tớ chưa bao giờ ngồi vào giường đó."',
        ],
        choice: { q: 'Tờ giấy thi ghi tên {B}…', a: ['Xé tờ giấy đi', 'Mang tờ giấy đi thắp nhang'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} ngồi xuống, giảng cho cô gái tới tận khi trời sáng.',
          '@bell|Gà gáy, cô gái gấp sách, cúi đầu: "Cảm ơn cậu. Giờ thì tớ thi được rồi." Rồi cô tan vào nắng sớm.',
          'Kỳ thi ấy, {A} được điểm cao nhất lớp. Đề thi y hệt những bài đêm qua {A} đã giảng.',
        ],
        end: 'good',
      },
      e2: {
        lines: [
          '{A} nói khẽ: "Cậu ơi… cậu mất lâu rồi. Không cần thi nữa đâu."',
          '@cry|Cô gái ngẩng lên. Gương mặt trắng bệch, ướt đẫm, nước mắt chảy thành dòng: "Không… mai tớ thi mà…"',
          'Sáng hôm sau, giường số chín có thêm một cái tên dán trên thành giường. Tên {A}.',
        ],
        end: 'bad', take: 'A',
      },
      e3: {
        lines: [
          '{B} giật tờ giấy xé vụn, vứt qua cửa sổ.',
          '@scream|Ngay lập tức, cả phòng nghe tiếng ai đó rơi từ tầng thượng xuống sân, đánh "rầm" một tiếng.',
          'Chạy ra nhìn, sân trống không. Nhưng từ đêm đó, giường của {B} cũng bỏ trống.',
        ],
        end: 'bad', take: 'B',
      },
      e4: {
        lines: [
          'Cả phòng góp tiền mua hoa, thắp nhang ở góc sân, đốt tờ giấy thi kèm một cây bút mới.',
          '@wind|Gió thổi tro bay lên tận tầng ba, đậu đúng vào giường số chín.',
          'Từ đó, phòng 307 mùa nào cũng đỗ hết. Người ta bảo: có một bạn học ở giường số chín phù hộ.',
        ],
        end: 'good',
      },
    },
  },

  {
    id: 'nha-xac',
    title: 'Ca Trực Nhà Xác',
    teaser: 'Có mười ngăn tủ lạnh. Đêm nay, có tiếng gõ từ ngăn số bảy.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          '{A} nhận việc trực đêm nhà xác bệnh viện huyện. Lương cao, việc nhẹ, chỉ cần thức tới sáng.',
          'Bác bảo vệ dặn: "Nghe tiếng gì cũng đừng mở ngăn tủ. Mở rồi thì phải đóng lại trước khi gà gáy."',
          '@knock|Hai giờ sáng. Cộc. Cộc. Cộc. Tiếng gõ phát ra từ ngăn tủ lạnh số bảy.',
          'Sổ ghi chép: ngăn số bảy, nữ, chuyển vào chiều nay, chưa có người nhận.',
        ],
        choice: { q: 'Tiếng gõ mỗi lúc một dồn dập…', a: ['Mở ngăn tủ số bảy', 'Gọi bác bảo vệ'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} kéo ngăn tủ ra. Hơi lạnh trắng xoá bốc lên.',
          'Tấm vải trắng phủ xác vẫn nằm im. Nhưng ở chỗ bàn tay, có năm ngón tay đang gõ nhịp lên thành tủ.',
          '@whisper|Một giọng khàn khàn dưới tấm vải: "Lạnh quá… cho tôi mượn cái áo khoác."',
        ],
        choice: { q: 'Bàn tay đang chìa ra…', a: ['Đưa áo khoác cho cô ấy', 'Đóng sập ngăn tủ lại'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} gọi bộ đàm. Bác bảo vệ trả lời: "Tôi đang ở cổng. Cậu đứng yên đó."',
          '@steps|Nhưng ngay lúc ấy, tiếng bước chân của bác đã vang lên ở hành lang, đi về phía {A}.',
          'Bộ đàm lại rè rè: "Cậu nghe tôi không? Tôi vẫn ở cổng mà!"',
        ],
        choice: { q: 'Tiếng bước chân đã tới cửa…', a: ['Mở cửa', 'Chui vào gầm bàn'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} cởi áo khoác đắp lên. Bàn tay rút vào, tiếng gõ ngừng hẳn.',
          '@bell|Sáng hôm sau, người nhà cô gái tới nhận xác. Bà mẹ khóc: "Nó sợ lạnh nhất nhà."',
          'Đêm đó {A} mơ thấy cô gái tới trả áo, cúi đầu cảm ơn. Sáng ra, chiếc áo khoác được gấp gọn trên ghế trực.',
        ],
        end: 'good',
      },
      e2: {
        lines: [
          '{A} đóng sập ngăn tủ, chèn ghế lên.',
          '@scream|Cả mười ngăn tủ cùng lúc rung lên, tiếng gõ dồn dập như mưa đá.',
          'Ca trực sáng tới, chỉ thấy ngăn số bảy mở toang, trống rỗng. Ghế trực thì có áo của {A}, người thì không.',
        ],
        end: 'bad', take: 'A',
      },
      e3: {
        lines: [
          '{A} mở cửa. Trước mặt là bác bảo vệ, mặt trắng bệch, quần áo ướt đẫm hơi lạnh.',
          '@jump|"Ngăn số tám còn trống," bác nói. "Cậu vào đi cho đủ."',
          'Sáng ra, bác bảo vệ thật đi vào, thấy sổ ghi chép có thêm một dòng: ngăn số tám, tên {A}.',
        ],
        end: 'bad', take: 'A',
      },
      e4: {
        lines: [
          '{A} chui vào gầm bàn, bịt miệng. Cánh cửa kẽo kẹt mở ra.',
          '@steps|Một đôi chân trần, trắng bệch, đi chậm rãi quanh phòng rồi dừng lại sát mép bàn… rất lâu.',
          'Gà gáy. Đôi chân biến mất. {A} nghỉ việc ngay sáng hôm ấy, và đến giờ vẫn không dám ngủ khi chân thò ra ngoài chăn.',
        ],
        end: 'open',
      },
    },
  },

  {
    id: 'tau-dem',
    title: 'Toa Số Chín Chuyến Tàu Đêm',
    teaser: 'Đoàn tàu chỉ có tám toa. Vé của {A} ghi toa số chín.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          '{A} mua vé tàu đêm về quê. Vé ghi: toa 9, giường 13.',
          'Nhân viên soát vé nhìn tấm vé rất lâu: "Tàu này chỉ có tám toa thôi."',
          '@wind|Nửa đêm, {A} đi dọc đoàn tàu. Cuối toa 8, có thêm một cánh cửa gỗ cũ kỹ, sơn số 9.',
          'Bên trong, đèn vàng mờ, hành khách ngồi im phăng phắc, ai cũng mặc đồ của mấy chục năm trước.',
        ],
        choice: { q: 'Giường số 13 đang trống chờ {A}…', a: ['Vào nằm giường 13', 'Quay về toa 8'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} nằm xuống. Người đàn ông giường bên đưa cho {A} một nắm xôi: "Ăn đi, đường còn xa lắm."',
          '@whisper|Ông nói khẽ: "Tàu này đi một chiều thôi. Ga cuối không có tên đâu."',
          'Ngoài cửa sổ không còn cảnh vật, chỉ có sương trắng và những ngọn đèn lồng trôi lững lờ.',
        ],
        choice: { q: 'Nắm xôi vẫn còn trên tay {A}…', a: ['Ăn nắm xôi', 'Giật phanh khẩn cấp'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} quay đầu. Nhưng cánh cửa toa 8 đã biến mất, chỉ còn bức tường gỗ.',
          '@steps|Sau lưng, tiếng bước chân của cả toa tàu đứng dậy, đi về phía {A}.',
          'Người soát vé toa 9 chìa tay: "Vé của anh chị đâu? Toa này không cho xuống giữa đường."',
        ],
        choice: { q: 'Người soát vé đang chờ…', a: ['Đưa vé ra', 'Xé vé trước mặt ông ta'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} cắn một miếng xôi. Lạnh ngắt, vị như tro.',
          '@scream|Tàu tới ga cuối. Không có tên ga, chỉ có một cánh cổng lớn mở ra màn đêm.',
          'Sáng ra, tàu về ga quê. Giường 13 toa 8 có túi xách của {A}. Nhân viên đường sắt bảo: "Người đi một mình, không thấy xuống."',
        ],
        end: 'bad', take: 'A',
      },
      e2: {
        lines: [
          '{A} giật phanh khẩn cấp. Tiếng kim loại rít lên chói tai.',
          '@bell|Khi mở mắt, {A} đang nằm ở toa 8. Nhân viên lay vai: "Anh chị ngủ mê hả? Tới ga rồi."',
          'Tấm vé trong túi giờ ghi: toa 8, giường 12. Nhưng tay {A} vẫn còn dính mấy hạt xôi lạnh ngắt.',
        ],
        end: 'open',
      },
      e3: {
        lines: [
          '{A} đưa vé. Người soát vé đục một lỗ, gật đầu: "Hợp lệ. Mời về chỗ."',
          '@laugh|Cả toa tàu vỗ tay. Ai cũng cười, nụ cười kéo tới tận mang tai.',
          'Đoàn tàu đêm ấy về ga muộn hai tiếng. Người ta kiểm lại: dư ra một hành khách không có trong danh sách.',
        ],
        end: 'bad', take: 'A',
      },
      e4: {
        lines: [
          '{A} xé tan tấm vé, ném xuống sàn: "Tôi không đi chuyến này!"',
          '@wind|Gió lạnh thốc qua. Cả toa tàu cùng mờ dần như sương gặp nắng.',
          '{A} đứng giữa toa 8, hành khách đang ngủ say. Chỉ có bà cụ giường bên mở mắt, thì thầm: "Giỏi lắm. Hồi trước bà cũng xé vé như con."',
        ],
        end: 'good',
      },
    },
  },

  {
    id: 'mieu-hoang',
    title: 'Ngôi Miếu Hoang Bên Đường Rừng',
    teaser: '{A} lỡ đi tiểu bậy sau ngôi miếu bỏ hoang. Từ đêm đó, có người đi theo về nhà.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          '{A} và {B} phượt xe máy qua đèo. Trời tối, cả hai dừng lại ở một ngôi miếu nhỏ bỏ hoang ven rừng.',
          '{A} đi ra sau miếu giải quyết, còn đá văng cái bát hương mẻ dưới gốc cây.',
          '@wind|Gió lặng ngắt. Từ trong miếu tối om vang lên tiếng ai đó thở dài.',
          'Lên xe đi tiếp, {B} cứ thấy xe nặng hơn, như đang chở ba người.',
        ],
        choice: { q: 'Chiếc xe nặng trĩu một cách lạ lùng…', a: ['Quay lại miếu xin lỗi', 'Phóng thật nhanh về nhà'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          'Hai đứa quay lại miếu, thắp nén nhang, dựng lại bát hương.',
          '@whisper|Một giọng già nua vang lên từ bóng tối: "Biết lỗi thì tốt. Nhưng phải đền."',
          'Ngọn nhang cháy rất nhanh, tàn rơi thành hình mũi tên chỉ về phía {A}.',
        ],
        choice: { q: 'Giọng nói đòi đền…', a: ['Hứa mai mang lễ tới', 'Hỏi: "Đền bằng gì?"'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{B} vặn ga hết cỡ. Đèn pha chập chờn, gương chiếu hậu phản chiếu một ông lão ngồi sau {A}.',
          '@laugh|Ông lão ghé sát tai {A}: "Đi đâu mà vội. Về nhà cháu chơi."',
          'Về tới nhà, chó hàng xóm sủa ầm ĩ, cứ nhắm vào khoảng trống sau lưng {A} mà sủa.',
        ],
        choice: { q: 'Có người đã theo về tới nhà…', a: ['Rắc muối gạo quanh nhà', 'Mời thầy về cúng'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          'Sáng hôm sau, {A} và {B} mang xôi gà, nhang đèn, quét dọn sạch sẽ ngôi miếu.',
          '@bell|Gió núi thổi qua, tiếng chuông gió treo ở mái miếu kêu leng keng dù trước đó nó bị gãy.',
          'Từ đó, mỗi lần qua đèo, hai người đều dừng lại thắp nhang. Và chưa bao giờ gặp nạn trên đường.',
        ],
        end: 'good',
      },
      e2: {
        lines: [
          '{A} hỏi cứng: "Đền bằng gì?"',
          '@jump|Giọng nói cười khàn: "Bát hương của ta vỡ một góc. Ta lấy một góc của cháu."',
          'Từ hôm ấy, {A} cứ ốm liên miên. Người ta bảo, ông thần miếu vẫn đang chờ món nợ.',
        ],
        end: 'bad', take: 'A',
      },
      e3: {
        lines: [
          '{B} rắc muối gạo quanh nhà một vòng kín.',
          '@knock|Suốt đêm có tiếng gõ ngoài vòng muối, đi vòng quanh nhà, không vào được.',
          'Gà gáy, tiếng gõ dừng. Nhưng trên vòng muối có một vết chân trần đứt ngang, ngay cạnh cửa sổ phòng {A}.',
        ],
        end: 'open',
      },
      e4: {
        lines: [
          'Nhà mời {THAY} về. {THAY} nhìn sau lưng {A} rất lâu rồi chắp tay vái: "Thần núi nóng tính nhưng không ác."',
          '@bell|{THAY} làm lễ tạ, rồi cùng {A} mang lễ lên miếu. Nhang vừa thắp, gió núi đã hiền hẳn.',
          'Đêm đó chó hàng xóm không sủa nữa. Chỉ ngoe nguẩy đuôi về phía con đèo, như tiễn ai đó về.',
        ],
        end: 'good',
      },
    },
  },

  {
    id: 'ao-cuoi',
    title: 'Bộ Áo Cưới Ở Chợ Đồ Cũ',
    teaser: 'Áo cưới đẹp mà rẻ như cho. Người bán dặn: đừng mặc vào lúc nửa đêm.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          '{A} sắp cưới, đi chợ đồ cũ thì thấy một bộ áo cưới đỏ thêu phượng tuyệt đẹp, giá chỉ trăm nghìn.',
          'Bà bán hàng vội vàng gói lại: "Mang đi đi. Chỉ đừng mặc vào lúc nửa đêm."',
          '@clock|Đêm đó, tò mò, {A} mặc thử áo cưới đúng mười hai giờ.',
          '@musicbox|Từ đâu đó vang lên tiếng kèn đám cưới. Trong gương, sau lưng {A}, có một đoàn người áo đỏ đang chờ.',
        ],
        choice: { q: 'Đoàn rước dâu trong gương đang vẫy gọi…', a: ['Cởi áo ra ngay', 'Bước lại gần gương'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} vội cởi áo. Nhưng cúc áo không mở được, mỗi lúc một siết chặt.',
          '@whisper|Một giọng con gái thì thầm từ cổ áo: "Áo này của tôi. Ngày cưới, tôi chưa kịp mặc nó."',
          'Áo cưới bó chặt tới mức {A} thở không nổi.',
        ],
        choice: { q: 'Chiếc áo đang siết chặt…', a: ['Cắt áo bằng kéo', 'Hứa trả lại cho chủ'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} bước lại gần gương. Chú rể trong đoàn rước bước lên, mặt bị che bởi tấm khăn đỏ.',
          '@laugh|Chú rể chìa tay: "Đợi em lâu lắm rồi."',
          '{B} ở phòng bên nghe thấy tiếng kèn, vội đập cửa gọi tên {A}.',
        ],
        choice: { q: 'Bàn tay chú rể đã chìa ra…', a: ['Nắm lấy tay chú rể', 'Chạy ra mở cửa cho {B}'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} cầm kéo cắt toạc áo cưới.',
          '@scream|Từ vết cắt, nước đen sì rỉ ra, thấm khắp sàn nhà, kèm tiếng hét xé lòng.',
          'Sáng hôm sau, bộ áo cưới lại treo ngay ngắn ở sạp đồ cũ, lành lặn như mới. Bà bán hàng thì thầm: "Lại một người nữa."',
        ],
        end: 'bad', take: 'A',
      },
      e2: {
        lines: [
          '{A} nghẹn ngào: "Tôi xin lỗi. Mai tôi mang trả cho cô."',
          '@bell|Cúc áo lỏng ra. Sáng hôm sau, {A} theo lời bà bán hàng tìm tới ngôi mộ của cô dâu chết trước ngày cưới, đốt áo cưới trả lại.',
          'Đám cưới của {A} sau đó suôn sẻ lạ thường. Trong ảnh cưới, góc xa xa có một cô gái áo đỏ đứng mỉm cười chúc phúc.',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          '{A} đặt tay vào tay chú rể. Lạnh như băng.',
          '@jump|Tấm khăn đỏ rơi xuống. Dưới khăn chỉ là một khoảng tối đen ngòm, và một giọng cười khanh khách.',
          '{B} phá được cửa thì phòng đã trống trơn. Chỉ còn tấm gương, trong gương có một đám cưới đang đi xa dần.',
        ],
        end: 'bad', take: 'A',
      },
      e4: {
        lines: [
          '{A} vùng chạy ra mở cửa. {B} lao vào, giật phăng bộ áo cưới ném ra sân.',
          '@wind|Tiếng kèn tắt lịm. Bộ áo đỏ nằm giữa sân, rồi từ từ bị gió cuốn đi mất hút.',
          'Hôm sau, ra chợ đồ cũ, sạp hàng của bà cụ đã không còn. Người ta bảo ở đó chưa từng có ai bán áo cưới.',
        ],
        end: 'open',
      },
    },
  },

  {
    id: 'anh-thua',
    title: 'Tấm Ảnh Thừa Một Người',
    teaser: 'Cả nhóm chụp ảnh kỷ niệm. Rửa ảnh ra, thừa một khuôn mặt.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          'Nhóm bạn của {A}, {B} và {C} cắm trại bên hồ, chụp chung một tấm ảnh kỷ niệm lúc nửa đêm.',
          'Chỉ có năm người. Nhưng khi xem ảnh, ai cũng đếm được sáu.',
          '@mirror|Người thứ sáu đứng sát sau lưng {C}, mặt mờ nhoè, tóc ướt rũ xuống.',
          'Phóng to ảnh lên, khuôn mặt mờ ấy… đang nhìn thẳng vào ống kính.',
        ],
        choice: { q: 'Người thứ sáu trong ảnh…', a: ['Xoá ảnh ngay', 'Chụp thêm một tấm nữa'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} xoá ảnh. Điện thoại báo: "Không thể xoá. Ảnh đang được người khác sử dụng."',
          '@phone|Rồi điện thoại của cả năm người cùng rung. Ai cũng nhận được tấm ảnh ấy, gửi từ một số lạ.',
          'Trong tấm ảnh mới, người thứ sáu đã đứng gần {C} hơn, hai tay đặt lên vai {C}.',
        ],
        choice: { q: 'Bóng người trong ảnh đang ôm lấy {C}…', a: ['Bắt {C} rời trại ngay', 'Ngồi quây quần thắp nến'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{B} giơ máy chụp thêm một tấm. Đèn flash loé lên.',
          '@flicker|Trong ảnh, người thứ sáu đã không còn đứng sau {C}. Nó đứng ngay sau lưng người cầm máy: {B}.',
          '@whisper|Có tiếng thở lạnh buốt phả vào gáy {B}.',
        ],
        choice: { q: '{B} cảm thấy có người sau lưng…', a: ['Quay lại nhìn', 'Đếm lại số người'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          'Cả nhóm kéo {C} lên xe, phóng thẳng về thành phố, không ai nói một lời.',
          '@bell|Sáng hôm sau mở ảnh ra xem, người thứ sáu đã biến mất. Chỉ còn lại năm người, ai cũng cười.',
          'Mãi về sau mới biết: hồ ấy từng có một người chết đuối vào đúng đêm cắm trại năm nào.',
        ],
        end: 'good',
      },
      e2: {
        lines: [
          'Cả nhóm thắp nến, ngồi quây tròn, nắm tay nhau cho tới sáng.',
          '@steps|Suốt đêm có tiếng bước chân đi quanh vòng tròn, nhưng không ai dám mở mắt.',
          'Gà gáy, mở mắt ra, ai cũng nắm tay người bên cạnh. Nhưng vòng tròn… có sáu người.',
          '@possess|Một trong số những người ngồi đây không còn là người như trước. Hãy tìm ra kẻ đó!',
        ],
        end: 'open',
      },
      e3: {
        lines: [
          '{B} quay lại. Không có ai.',
          '@jump|Nhưng khi quay về, cả nhóm đều lùi lại, nhìn {B} trân trối. Trên màn hình, {B} trong ảnh vừa mới cử động.',
          'Từ đó, {B} chỉ còn tồn tại trong tấm ảnh ấy, đứng sau lưng người cầm máy, mỉm cười.',
        ],
        end: 'bad', take: 'B',
      },
      e4: {
        lines: [
          '{B} đếm lại: một, hai, ba, bốn, năm. Đủ năm người. Thở phào.',
          '@laugh|Rồi có một giọng thứ sáu đếm tiếp, ngay sát tai: "…sáu."',
          'Từ đó, cả nhóm không bao giờ chụp ảnh chung nữa. Vì lần nào chụp, cũng đếm được sáu.',
        ],
        end: 'open',
      },
    },
  },

  {
    id: 'quan-chao',
    title: 'Quán Cháo Đầu Nghĩa Địa',
    teaser: 'Quán cháo chỉ mở từ nửa đêm tới gà gáy. Khách trả bằng tiền cũ lạ lắm.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          '{A} chạy giao hàng đêm, đói bụng, ghé một quán cháo nhỏ thắp đèn dầu ngay đầu nghĩa địa.',
          'Bà chủ quán múc cho {A} bát cháo nóng hổi. Quán đông khách, nhưng chẳng ai nói chuyện.',
          '@drip|{A} để ý: khách nào ăn xong cũng đặt lên bàn mấy tờ giấy tiền màu vàng.',
          'Ông khách bàn bên ghé tai: "Ăn nhanh đi con. Gà gáy là quán đóng cửa. Người sống ở lại thì không về được nữa."',
        ],
        choice: { q: 'Bát cháo còn nóng trước mặt {A}…', a: ['Ăn hết bát cháo', 'Đứng dậy bỏ đi'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} ăn hết bát cháo. Ngon tới lạ, nhưng càng ăn càng thấy lạnh.',
          '@whisper|Bà chủ quán mỉm cười: "Ăn của người âm thì phải trả bằng thứ của người sống."',
          'Bà chìa tay về phía {A}. Móng tay dài, đen sì.',
        ],
        choice: { q: 'Bà chủ đang đòi trả tiền…', a: ['Trả bằng tiền thật', 'Hỏi ông khách bàn bên'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} đứng dậy. Cả quán đồng loạt quay lại nhìn, mắt ai cũng trắng dã.',
          '@laugh|"Chưa trả tiền mà đi đâu?" Bà chủ quán cười, cái miệng kéo dài tới mang tai.',
          'Cánh cửa quán phía sau lưng {A} đã biến thành bia mộ.',
        ],
        choice: { q: 'Không còn đường ra…', a: ['Đốt bật lửa lên', 'Vái lạy xin tha'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} móc ví đưa tờ tiền thật. Bà chủ cầm lấy, gật gù.',
          '@bell|Gà gáy. Quán cháo mờ dần. {A} thấy mình đang ngồi một mình giữa nghĩa địa, trước một ngôi mộ có bát cháo trắng.',
          'Tờ tiền thật đã nằm trên bia mộ, đè bằng một hòn đá. Từ đó, đêm nào đi ngang, {A} cũng thấy ánh đèn dầu, nhưng không dám ghé nữa.',
        ],
        end: 'open',
      },
      e2: {
        lines: [
          'Ông khách bàn bên lén dúi cho {A} một nắm gạo: "Rắc lên bàn, nói là trả bằng gạo."',
          '@wind|{A} làm theo. Bà chủ quán nhìn nắm gạo, thở dài: "Thôi được. Lần này tha."',
          'Gà gáy, {A} lăn ra giữa đường. Trong túi còn một tờ giấy nhắn nguệch ngoạc: "Mai mang cho ông một bát cháo nhé. — Ông Tư, mộ số 12."',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          '{A} bật lửa. Ngọn lửa loé lên, cả quán rít lên như bị bỏng.',
          '@scream|Ánh lửa soi rõ: quán cháo chỉ là những ngôi mộ, khách là những bộ xương ngồi quanh.',
          'Lửa tắt. Sáng hôm sau, người ta thấy xe máy của {A} dựng ở đầu nghĩa địa, đèn xe vẫn còn sáng.',
        ],
        end: 'bad', take: 'A',
      },
      e4: {
        lines: [
          '{A} quỳ xuống vái lạy, khấn xin các cô bác tha cho.',
          '@bell|Bà chủ quán im lặng hồi lâu: "Biết điều thì về đi. Đừng quên mỗi rằm mang cháo ra đây."',
          'Rằm nào {A} cũng mang một nồi cháo ra đầu nghĩa địa. Sáng ra, nồi bao giờ cũng sạch trơn.',
        ],
        end: 'good',
      },
    },
  },
]);
