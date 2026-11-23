// Ngọn Đèn Cuối Cùng — kho truyện ma phần 3 (cách viết: xem đầu file ma-stories.js)
window.MA_STORIES = (window.MA_STORIES || []).concat([
  {
    id: 'phong-nhac',
    title: 'Tiếng Đàn Trong Phòng Nhạc',
    teaser: 'Trường đã khoá phòng nhạc từ lâu. Vậy ai đang chơi đàn lúc nửa đêm?',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          '{A} và {B} ở lại trường làm báo tường tới khuya. Cả dãy nhà tối om, chỉ còn phòng hai đứa sáng đèn.',
          '@musicbox|Từ tầng ba vọng xuống tiếng đàn piano. Bản nhạc buồn, lặp đi lặp lại, cứ tới một nốt thì vấp.',
          'Bác bảo vệ từng kể: phòng nhạc khoá từ khi một cô bé ngã từ cửa sổ, đúng hôm trước buổi biểu diễn.',
          'Tiếng đàn dừng lại. Rồi có tiếng ai đó gọi vọng xuống: "Có ai nghe mình đàn không?"',
        ],
        choice: { q: 'Tiếng gọi vọng xuống từ tầng ba…', a: ['Lên phòng nhạc xem', 'Thu dọn đồ, về ngay'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          'Cửa phòng nhạc khoá ngoài, nhưng hé mở một khe. Trong phòng, một cô bé áo trắng ngồi trước đàn.',
          '@whisper|"Mình tập mãi mà vẫn sai đúng một nốt. Cậu nghe giúp mình nhé, rồi vỗ tay cho mình."',
          'Cô bé quay lại. Cổ cô gập lệch sang một bên một cách không tự nhiên.',
        ],
        choice: { q: 'Cô bé bắt đầu đàn lại…', a: ['Ngồi nghe tới hết rồi vỗ tay', 'Đóng sập cửa lại'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          'Hai đứa vội vàng thu dọn, chạy xuống cầu thang.',
          '@steps|Nhưng chạy mãi, cầu thang vẫn chỉ dẫn lên tầng ba, cửa phòng nhạc lại hiện ra trước mặt.',
          '@laugh|Tiếng đàn vang lên, lần này nhanh và dồn dập như đang đuổi theo.',
        ],
        choice: { q: 'Cầu thang không có lối xuống…', a: ['Nhắm mắt chạy tiếp', 'Bước vào phòng nhạc'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} và {B} ngồi lặng nghe. Lần này cô bé đàn trọn vẹn, không vấp một nốt nào.',
          '@bell|Hai đứa vỗ tay thật to. Cô bé đứng dậy, cúi chào như trên sân khấu, rồi tan dần trong ánh trăng.',
          'Từ đó, phòng nhạc không còn tiếng đàn lúc nửa đêm. Chỉ đôi khi, nắp đàn được ai đó lau sạch bóng.',
        ],
        end: 'good',
      },
      e2: {
        lines: [
          '{B} đóng sập cửa. Tiếng đàn tắt phụt.',
          '@scream|Rồi một tiếng thét vang lên, kèm tiếng kính vỡ và một vật nặng rơi xuống sân trường.',
          'Sáng hôm sau, cửa sổ phòng nhạc vỡ toang. Trên bàn phím có viết bằng phấn: "Sao không ai chịu nghe?" Và ghế của {B} ở lớp, từ đó bỏ trống.',
        ],
        end: 'bad', take: 'B',
      },
      e3: {
        lines: [
          '{A} nắm tay {B}, nhắm mắt chạy thục mạng.',
          '@door|Bỗng chân chạm đất bằng, tiếng côn trùng rả rích. Hai đứa đang đứng giữa sân trường.',
          'Ngước lên, cửa sổ tầng ba có một cô bé đứng nhìn theo. Cô vẫy tay, môi mấp máy: "Mai lại tới nghe nhé."',
        ],
        end: 'open',
      },
      e4: {
        lines: [
          '{A} bước vào phòng nhạc. Tiếng đàn dừng.',
          '@jump|Chiếc ghế đàn trống trơn. Một giọng nói vang lên ngay sau gáy: "Tới lượt cậu đàn."',
          'Đêm nào sau này, bảo vệ cũng nghe tiếng đàn từ tầng ba, vấp đúng một nốt. Nhưng giờ có hai người cùng đàn.',
        ],
        end: 'bad', take: 'A',
      },
    },
  },

  {
    id: 'bac-13',
    title: 'Bậc Thang Thứ Mười Ba',
    teaser: 'Cầu thang chung cư cũ có mười hai bậc. Đêm nay, {A} đếm được mười ba.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          '{A} thuê nhà trong một khu chung cư cũ sắp giải toả. Thang máy hỏng, phải đi thang bộ.',
          'Mỗi tầng đúng mười hai bậc. {A} đếm quen rồi, nhắm mắt cũng đi được.',
          '@clock|Đêm ấy về muộn, đèn cầu thang tắt. {A} lần từng bậc… mười một, mười hai… mười ba.',
          'Bậc thứ mười ba mềm nhũn, như dẫm lên lưng một người đang nằm.',
        ],
        choice: { q: 'Chân {A} đang đặt trên bậc thứ mười ba…', a: ['Bật đèn điện thoại soi', 'Bước tiếp, không nhìn'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} bật đèn điện thoại. Dưới chân chỉ là bậc xi măng nứt nẻ.',
          '@whisper|Nhưng trên tường cầu thang có ai đó vừa viết bằng tay, chữ còn ướt: "Đừng dẫm lên tôi."',
          'Phía dưới, từ bóng tối, có tiếng bò lết chậm rãi đi lên.',
        ],
        choice: { q: 'Tiếng bò lết đang tới gần…', a: ['Chạy lên nhà khoá cửa', 'Xin lỗi người dưới chân'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} bước tiếp. Mười bốn, mười lăm, mười sáu… cầu thang không có điểm dừng.',
          '@steps|Sau lưng có tiếng bước chân đếm theo, chậm hơn một nhịp.',
          '@laugh|"Đếm tiếp đi. Tới một trăm là xuống tới chỗ tôi rồi."',
        ],
        choice: { q: 'Tiếng đếm vẫn theo sau…', a: ['Đếm ngược lại', 'Ngồi xuống bậc thang'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} lao lên, khoá trái cửa, dựa lưng thở dốc.',
          '@knock|Ngoài cửa có tiếng gõ thấp, sát mặt sàn: cộc, cộc, cộc.',
          'Sáng ra, ngay trước cửa có một vệt dài như ai đó đã nằm đó cả đêm. Bà hàng xóm bảo: hai mươi năm trước có người ngã cầu thang chết, không ai đỡ dậy.',
        ],
        end: 'open',
      },
      e2: {
        lines: [
          '{A} cúi đầu: "Cháu xin lỗi. Cháu không thấy."',
          '@bell|Tiếng bò lết dừng lại. Bậc thang thứ mười ba từ từ biến mất.',
          'Hôm sau {A} mua hoa, thắp nhang ở chân cầu thang. Từ đó, đêm về muộn, đèn cầu thang lúc nào cũng tự sáng đúng lúc {A} bước tới.',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          '{A} đếm ngược: mười sáu, mười lăm, mười bốn… mười ba, mười hai.',
          '@door|Cửa nhà hiện ra ngay trước mặt. Tiếng đếm phía sau tức tối dừng lại.',
          'Người già bảo: lạc vào cầu thang ma thì phải đếm ngược mà về. {A} đã nhớ đúng lời bà ngoại dạy.',
        ],
        end: 'good',
      },
      e4: {
        lines: [
          '{A} ngồi phịch xuống bậc thang, mệt lả.',
          '@jump|Một bàn tay lạnh từ bậc dưới nắm lấy mắt cá chân: "Ngồi rồi thì ở lại luôn đi."',
          'Khu chung cư giải toả, thợ phá dỡ tìm thấy ở cầu thang tầng năm có mười ba bậc. Bậc cuối cùng có khắc tên {A}.',
        ],
        end: 'bad', take: 'A',
      },
    },
  },

  {
    id: 'biet-thu',
    title: 'Biệt Thự Trên Đồi Thông',
    teaser: 'Căn biệt thự bỏ hoang, đêm nào cũng có một bữa tiệc không người.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          'Nhóm của {A}, {B} và {C} đi du lịch phố núi, nghe đồn có căn biệt thự bỏ hoang trên đồi thông.',
          'Nửa đêm, cả nhóm leo rào vào quay video. Cửa chính không khoá, tự kẽo kẹt mở ra.',
          '@musicbox|Trong phòng khách, chiếc máy hát cũ tự quay, phát một bản nhạc khiêu vũ xa xưa.',
          'Chiếc bàn dài bày sẵn mười hai bộ dao nĩa, ly rượu đỏ còn đầy. Có một ghế ghi tên {C}.',
        ],
        choice: { q: 'Bữa tiệc như đang chờ khách…', a: ['Để {C} ngồi vào ghế', 'Tắt máy hát đi'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{C} ngồi xuống cho vui. Lập tức mười một ghế còn lại có bóng người hiện ra, áo quần lộng lẫy, mặt mờ như sương.',
          '@whisper|Người đàn ông đầu bàn nâng ly: "Cuối cùng khách thứ mười hai cũng tới. Uống đi."',
          'Ly rượu trước mặt {C} đặc sánh, đỏ thẫm, mùi tanh nồng.',
        ],
        choice: { q: 'Cả bàn đang chờ {C} uống…', a: ['Uống cạn ly', 'Hất đổ ly rượu'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{B} nhấc kim máy hát. Âm nhạc tắt, căn biệt thự lặng ngắt.',
          '@steps|Rồi từ tầng trên, tiếng gót giày khiêu vũ vang lên, xoay tròn, xoay tròn, mỗi lúc một nhanh.',
          '@laugh|Một giọng phụ nữ cười lanh lảnh: "Ai cho phép dừng nhạc?"',
        ],
        choice: { q: 'Tiếng gót giày đang đi xuống cầu thang…', a: ['Bật lại nhạc', 'Cả nhóm chạy ra cửa'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{C} uống cạn. Cả bàn vỗ tay. Bản nhạc khiêu vũ lại vang lên.',
          '@scream|Những người còn lại chỉ kịp thấy {C} đứng dậy, khoác tay một bóng ma, xoay vào giữa phòng rồi biến mất.',
          'Đoạn video quay được đêm ấy, khung hình cuối cùng: mười hai người ngồi quanh bàn tiệc. Người thứ mười hai là {C}, đang nâng ly mời người xem.',
        ],
        end: 'bad', take: 'C',
      },
      e2: {
        lines: [
          '{A} giật ly hất xuống đất. Rượu đỏ loang ra thành một vũng nước bẩn, dao nĩa gỉ sét.',
          '@wind|Tất cả bóng ma tan biến cùng làn gió lạnh. Bàn tiệc chỉ còn bụi phủ dày.',
          'Cả nhóm chạy một mạch xuống đồi. Video quay được chỉ toàn nhiễu, nhưng tiếng ai đó vẫn văng vẳng: "Lần sau ở lại dùng bữa nhé."',
        ],
        end: 'open',
      },
      e3: {
        lines: [
          '{B} vội đặt lại kim. Nhạc vang lên, tiếng gót giày dịu lại.',
          '@bell|Một người phụ nữ mặc váy trắng hiện ra ở chân cầu thang, mỉm cười, cúi chào cả nhóm như chủ nhà tiễn khách.',
          'Cửa tự mở. Cả nhóm ra về an toàn. Bà chủ quán trọ nghe kể chỉ gật gù: "Cô chủ biệt thự hiếu khách lắm, miễn là đừng tắt nhạc."',
        ],
        end: 'good',
      },
      e4: {
        lines: [
          'Cả nhóm lao ra cửa. Cánh cửa đóng sầm lại ngay trước mặt.',
          '@jump|Một bàn tay trắng muốt đặt lên vai {B}: "Chưa khiêu vũ với tôi mà đã về?"',
          'Sáng hôm sau, những người còn lại tỉnh dậy dưới gốc thông ngoài rào. Trên tầng hai biệt thự, có hai bóng người đang xoay tròn sau ô cửa kính.',
        ],
        end: 'bad', take: 'B',
      },
    },
  },

  {
    id: 'meo-den',
    title: 'Con Mèo Đen Nhảy Qua Linh Cữu',
    teaser: 'Ông bà dặn: canh xác đêm cuối, đừng để mèo đen nhảy qua.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          'Ông cố của {A} mất. Đêm cuối trước khi đưa tang, con cháu thay phiên canh linh cữu.',
          'Bà nội dặn kỹ: "Đừng để con mèo nào nhảy qua quan tài. Mèo đen nhảy qua, xác sẽ bật dậy."',
          '@clock|Ba giờ sáng, tới lượt {A} và {B} canh. Cả nhà ngủ say.',
          '@laugh|Một con mèo đen từ đâu xuất hiện trên mái hiên, đôi mắt xanh lè nhìn chằm chằm vào linh cữu.',
        ],
        choice: { q: 'Con mèo đen đang rình…', a: ['Đuổi con mèo đi', 'Che kín quan tài bằng lưới'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{B} vung chổi đuổi. Con mèo nhảy vọt lên… và đáp ngay lên nắp quan tài, rồi vụt qua phía bên kia.',
          '@knock|Từ trong quan tài vang lên ba tiếng gõ: cộc… cộc… cộc.',
          'Nắp quan tài từ từ nhích ra một khe.',
        ],
        choice: { q: 'Nắp quan tài đang mở ra…', a: ['Đè chặt nắp lại', 'Gọi cả nhà dậy'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} vội lấy tấm lưới đánh cá phủ kín linh cữu. Con mèo gầm gừ, đi vòng quanh không nhảy được.',
          '@whisper|Rồi nó cất tiếng, không phải tiếng mèo mà là giọng người: "Cho tao mượn cái xác này một đêm."',
          'Con mèo quay sang nhìn {A}: "Không thì tao mượn xác mày."',
        ],
        choice: { q: 'Con mèo đang đòi mượn xác…', a: ['Thắp đèn thờ sáng rực', 'Ôm chặt con mèo lại'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} và {B} nhảy lên đè chặt nắp quan tài. Bên dưới, có thứ gì đang cào cấu dữ dội.',
          '@bell|Gà gáy. Mọi thứ im bặt. Bà nội thức dậy, thấy hai đứa nằm ngủ gục trên nắp quan tài.',
          'Lúc khâm liệm lại, mặt trong nắp quan tài chi chít những vết xước lạ.',
        ],
        end: 'open',
      },
      e2: {
        lines: [
          '{A} hét gọi cả nhà. Mọi người ùa ra thì nắp quan tài đã mở toang.',
          '@scream|Ông cố đang ngồi thẳng dậy trong quan tài, mắt trắng dã, quay đầu về phía {B}.',
          'Bà nội đập mạnh cây chổi lên lưng ông, ông ngã vật xuống. Nhưng từ đêm đó, {B} cứ như người mất hồn.',
          '@possess|Cái thứ nhập vào xác ông cố đã chuyển sang một người khác. Nó đang ngồi trong phòng này!',
        ],
        end: 'open',
      },
      e3: {
        lines: [
          '{A} thắp hết đèn, đốt thêm nhang. Ánh sáng tràn khắp gian thờ.',
          '@wind|Con mèo đen rít lên, lùi dần vào bóng tối rồi biến mất.',
          'Đám tang hôm sau suôn sẻ. Trên mộ ông cố, người ta thấy một con mèo trắng ngồi canh suốt bảy ngày.',
        ],
        end: 'good',
      },
      e4: {
        lines: [
          '{A} lao tới ôm chặt con mèo. Nó quằn quại, cào cấu, rồi bỗng mềm oặt.',
          '@jump|{A} nhìn xuống: trong tay không phải con mèo, mà là bàn tay lạnh ngắt của ông cố.',
          'Sáng ra, linh cữu nguyên vẹn, nhưng {A} thì cứ ngồi im, đôi mắt ánh xanh như mắt mèo trong bóng tối.',
        ],
        end: 'bad', take: 'A',
      },
    },
  },

  {
    id: 'dua-goi-hon',
    title: 'Trò Gọi Hồn Bằng Đũa',
    teaser: 'Cắm đôi đũa vào bát cơm, gõ ba tiếng, rồi hỏi. Đừng bao giờ quên tiễn hồn về.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          'Đêm rằm, nhóm của {A}, {B}, {C} rủ nhau chơi trò gọi hồn bằng đũa trong căn nhà trọ.',
          'Cắm thẳng đôi đũa vào bát cơm trắng, tắt đèn, thắp một ngọn nến, gõ vào thành bát ba tiếng.',
          '@knock|Cộc. Cộc. Cộc. {A} hỏi: "Có ai ở đây không?"',
          '@flicker|Đôi đũa từ từ nghiêng về phía {C}, rồi đứng im.',
        ],
        choice: { q: 'Hồn đã tới…', a: ['Hỏi tiếp một câu nữa', 'Tiễn hồn về ngay'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{B} run run hỏi: "Bạn là ai? Bạn muốn gì?"',
          '@whisper|Đôi đũa rung lên bần bật. Ngọn nến bùng cao, rồi chuyển sang màu xanh.',
          'Hạt cơm trong bát tự xếp thành hai chữ: "Ở LẠI".',
        ],
        choice: { q: 'Hồn ma muốn ở lại…', a: ['Rút đũa ra khỏi bát', 'Hỏi nó muốn ở lại với ai'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} chắp tay: "Cảm ơn đã tới. Mời bạn về." Rồi nhổ đôi đũa, úp ngược bát cơm.',
          '@steps|Nhưng tiếng bước chân không đi ra cửa. Nó đi vòng quanh, dừng lại sau lưng từng người.',
          '@laugh|Một giọng thì thầm: "Gọi thì dễ… tiễn thì khó lắm."',
        ],
        choice: { q: 'Hồn ma không chịu đi…', a: ['Bật hết đèn lên', 'Hỏi bàn cơ xem nó muốn gì'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{C} giật đôi đũa ra khỏi bát. Ngọn nến phụt tắt.',
          '@scream|Trong bóng tối, có tiếng {C} hét lên, rồi im lặng.',
          'Đèn bật lên, chỗ {C} ngồi chỉ còn đôi đũa cắm thẳng xuống sàn gỗ, và bát cơm đã nguội ngắt.',
        ],
        end: 'bad', take: 'C',
      },
      e2: {
        lines: [
          '{B} hỏi: "Bạn muốn ở lại với ai?"',
          '@musicbox|Đôi đũa xoay một vòng quanh bát, chỉ lần lượt qua từng người… rồi chỉ thẳng ra ngoài màn hình.',
          '@ouija|Hồn ma muốn trả lời chính các bạn. Bàn cầu cơ đã mở… hãy hỏi nó!',
        ],
        end: 'open',
      },
      e3: {
        lines: [
          '{A} bật hết đèn, mở toang cửa sổ cho gió vào.',
          '@wind|Một luồng gió lạnh thổi qua, cuốn theo tàn nến bay ra ngoài.',
          'Cả nhóm thắp nhang, khấn xin lỗi suốt đêm. Từ đó, không ai dám nhắc tới trò gọi hồn bằng đũa nữa.',
        ],
        end: 'good',
      },
      e4: {
        lines: [
          'Cả nhóm hỏi: "Bạn muốn gì thì mới chịu đi?"',
          '@ouija|Đôi đũa chỉ về phía bàn cơ trong góc phòng. Nó muốn được hỏi thật nhiều. Hãy hỏi đi!',
        ],
        end: 'open',
      },
    },
  },

  {
    id: 've-so',
    title: 'Ông Lão Bán Vé Số',
    teaser: 'Tờ vé số mua của ông lão trúng độc đắc. Nhưng ông đã mất từ năm ngoái.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          'Tối nào cũng có một ông lão chống gậy đi bán vé số ở đầu hẻm nhà {A}.',
          'Hôm ấy trời mưa, ông chìa ra tờ vé cuối cùng: "Mua giùm ông đi con. Bán hết ông mới về được."',
          '{A} mua. Sáng hôm sau, tờ vé trúng độc đắc.',
          '@whisper|Hàng xóm nghe chuyện thì lạnh người: "Ông Bảy bán vé số mất từ năm ngoái rồi mà."',
        ],
        choice: { q: 'Tờ vé số độc đắc vẫn trong tay {A}…', a: ['Đi lĩnh thưởng ngay', 'Tìm tới nhà ông lão'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} lĩnh được tiền, sắm xe, sắm nhà, tiệc tùng suốt tuần.',
          '@knock|Đêm thứ bảy, có tiếng gõ gậy lộc cộc ngoài cửa.',
          'Ông lão đứng dưới mưa, nước chảy ròng ròng: "Con ơi… ông chưa bán hết vé. Con mua giùm ông tờ nữa nhé."',
        ],
        choice: { q: 'Ông lão chìa ra tờ vé mới…', a: ['Mua thêm tờ nữa', 'Đóng cửa, không mua'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} hỏi đường tới nhà ông Bảy. Căn chòi xiêu vẹo, chỉ còn một bà cụ mù loà sống một mình.',
          'Bà kể: ông mất vì cảm lạnh, đêm mưa đi bán vé số mãi không về, trong túi còn một tờ chưa bán.',
          '@cry|Bà cụ khóc: "Ông ấy lo tôi không có ai chăm."',
        ],
        choice: { q: '{A} hiểu ra vì sao ông lão bán tờ vé ấy…', a: ['Chia tiền chăm sóc bà cụ', 'Giữ tiền, lặng lẽ bỏ đi'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} mua thêm tờ vé. Ông lão cười móm mém, tan vào màn mưa.',
          '@jump|Sáng hôm sau mở tờ vé ra: không phải số, mà là ảnh thờ của chính {A}, ngày mất ghi là hôm nay.',
          'Người ta tìm thấy {A} ngồi trước cửa nhà, tay cầm xấp vé số dày cộp, miệng lẩm bẩm: "Bán hết mới được về…"',
        ],
        end: 'bad', take: 'A',
      },
      e2: {
        lines: [
          '{A} đóng sập cửa. Tiếng gậy lộc cộc xa dần.',
          '@wind|Từ hôm ấy, tiền bạc của {A} cứ lần lượt hao hụt, như có ai lấy lại từng chút một.',
          'Cuối năm, {A} trắng tay. Trong ví chỉ còn đúng một tờ vé số cũ, nhoè nước mưa.',
        ],
        end: 'open',
      },
      e3: {
        lines: [
          '{A} sửa lại nhà cho bà cụ, thuê người chăm sóc, lo đầy đủ thuốc men.',
          '@bell|Đêm đó {A} mơ thấy ông lão, áo quần khô ráo, cười hiền: "Bán hết vé rồi. Ông về đây."',
          'Từ đó, đầu hẻm không còn bóng ông lão chống gậy. Chỉ có mùi nhang thơm thoang thoảng mỗi đêm mưa.',
        ],
        end: 'good',
      },
      e4: {
        lines: [
          '{A} lặng lẽ bỏ đi, cất kỹ món tiền.',
          '@knock|Đêm nào cũng có tiếng gậy gõ lộc cộc quanh nhà, đi vòng vòng không dứt.',
          'Mãi sau {A} mới quay lại tìm bà cụ. Căn chòi đã trống, trên vách chỉ còn dòng chữ bằng than: "Ông vẫn chờ."',
        ],
        end: 'open',
      },
    },
  },

  {
    id: 'dam-ma-nguoc',
    title: 'Đám Ma Đi Ngược Chiều',
    teaser: 'Nửa đêm, một đám tang đi ngược chiều trên đường làng. Đếm người khiêng quan tài, thừa một người.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          '{A} đạp xe về làng lúc nửa đêm. Phía trước có ánh đuốc, tiếng kèn đám ma ai oán.',
          'Một đám tang đi ngược chiều, người mặc áo trắng, đầu đội khăn tang, ai cũng cúi gằm mặt.',
          '@steps|Người già dặn: gặp đám ma ban đêm thì đứng nép vào lề, tuyệt đối đừng đếm người khiêng.',
          'Nhưng {A} lỡ đếm: tám người khiêng quan tài… và một người thứ chín ngồi trên nắp quan tài, quay mặt về phía {A}.',
        ],
        choice: { q: 'Người ngồi trên quan tài đang nhìn {A}…', a: ['Cúi đầu, nép vào lề', 'Nhìn kỹ mặt người đó'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} cúi đầu nép vào bụi tre. Đám tang đi ngang, mùi nhang nồng nặc.',
          '@whisper|Ngay khi đi qua, có giọng nói vọng xuống: "Quay đầu xe lại, đi cùng cho vui."',
          'Chiếc xe đạp của {A} tự quay bánh, kéo về phía đám tang.',
        ],
        choice: { q: 'Chiếc xe đang tự lăn theo đám tang…', a: ['Bỏ xe, chạy về làng', 'Cởi áo trùm đầu'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} nhìn kỹ. Người ngồi trên quan tài có gương mặt giống hệt {B}, bạn thân của {A}.',
          '@phone|Điện thoại rung. Tin nhắn từ {B}: "Đang ở đâu đấy? Mình vừa thấy mình đi qua trước cửa nhà."',
          '@laugh|Người trên quan tài vẫy tay với {A}, cười rất tươi.',
        ],
        choice: { q: 'Bóng hình giống hệt {B}…', a: ['Gọi điện cho {B} ngay', 'Đuổi theo đám tang'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} vứt xe chạy thục mạng về làng, không dám ngoái lại.',
          '@bell|Tới đầu làng, tiếng chuông chùa vang lên. Đám tang phía sau tan biến như chưa từng có.',
          'Sáng ra quay lại tìm, chiếc xe đạp nằm giữa nghĩa địa, quấn đầy khăn tang trắng.',
        ],
        end: 'open',
      },
      e2: {
        lines: [
          '{A} cởi áo trùm kín đầu, ngồi thụp xuống, niệm Phật liên hồi.',
          '@wind|Tiếng kèn xa dần. Khi {A} bỏ áo xuống, con đường làng vắng tanh, chỉ có tiếng ếch nhái.',
          'Bà ngoại nghe kể, gật gù: "Trùm đầu là đúng. Ma không thấy mặt thì không bắt được."',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          '{A} gọi cho {B}. Chuông đổ… và vang lên từ trong chiếc quan tài.',
          '@scream|Đám tang dừng lại. Tám người khiêng cùng lúc quay đầu, không có mặt.',
          'Sáng hôm sau, cả làng đi tìm {B}. Người ta chỉ thấy một nấm mộ mới đắp ở cuối làng, không bia, không tên.',
        ],
        end: 'bad', take: 'B',
      },
      e4: {
        lines: [
          '{A} đạp xe đuổi theo, gọi lớn tên {B}.',
          '@jump|Người trên quan tài quay lại. Lần này, gương mặt đó là của chính {A}.',
          'Đám tang đi khuất vào sương. Người ta chỉ tìm thấy chiếc xe đạp đổ bên đường, bánh xe vẫn còn quay.',
        ],
        end: 'bad', take: 'A',
      },
    },
  },

  {
    id: 'ma-xo',
    title: 'Ma Xó Nhà Từ Đường',
    teaser: 'Góc tối trong nhà từ đường có một thứ chuyên giấu đồ. Nhưng đêm nay nó giấu người.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          'Nhà từ đường của dòng họ {A} có một góc tối dưới gầm cầu thang gỗ. Người lớn gọi đó là góc ma xó.',
          'Đồ đạc trong nhà hay tự dưng biến mất, rồi vài hôm sau lại nằm trong góc ấy.',
          '@laugh|Đêm giỗ tổ, đứa em nhỏ của {A} chơi trốn tìm. Đếm tới mười, không ai tìm thấy bé nữa.',
          '@whisper|Từ góc tối dưới cầu thang, có tiếng trẻ con khúc khích: "Tìm em đi…"',
        ],
        choice: { q: 'Tiếng cười vọng ra từ góc tối…', a: ['Chui vào góc tìm em', 'Bày mâm cúng ma xó'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} cầm đèn pin chui vào. Góc tối sâu hơn tưởng tượng, như một đường hầm không đáy.',
          '@steps|Phía trước, đứa em đang ngồi chơi với một đứa trẻ khác, da xám xịt, mắt to đen láy.',
          'Đứa trẻ lạ ngẩng lên nhìn {A}: "Em ấy chơi với em rồi. Anh chị về đi."',
        ],
        choice: { q: 'Đứa trẻ lạ đang nắm tay em…', a: ['Giằng lấy em, chạy ra', 'Đổi đồ chơi lấy em'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} bày một mâm nhỏ: đĩa xôi, quả chuối, ít bánh kẹo, đặt trước góc tối.',
          '@knock|Từ trong góc có tiếng gõ gỗ: một tiếng… hai tiếng… như đang mặc cả.',
          'Một giọng khàn khàn: "Ít quá. Thêm thứ gì quý nhất của mày nữa."',
        ],
        choice: { q: 'Ma xó đòi thêm…', a: ['Đặt thêm chiếc vòng bạc', 'Mời {THAY} tới'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} giằng tay em, lôi bé chạy ngược ra ngoài.',
          '@scream|Sau lưng, đứa trẻ lạ gào lên, tiếng gào vang khắp nhà từ đường.',
          'Hai đứa lăn ra ngoài, an toàn. Nhưng từ đó, mỗi đêm, có một chiếc giày nhỏ của {A} biến mất… như ai đó đang chờ {A} quay lại chơi.',
        ],
        end: 'open',
      },
      e2: {
        lines: [
          '{A} móc trong túi ra chiếc ô tô đồ chơi: "Em lấy cái này, trả em lại cho mình nhé."',
          '@bell|Đứa trẻ lạ cầm lấy, cười toe, buông tay đứa em ra.',
          'Từ hôm đó, đồ đạc trong nhà không còn mất nữa. Chỉ thỉnh thoảng nghe tiếng bánh xe đồ chơi lăn dưới gầm cầu thang.',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          '{A} tháo chiếc vòng bạc bà tặng, đặt vào mâm.',
          '@wind|Gió lạnh thổi qua, chiếc vòng biến mất. Đứa em lăn ra từ góc tối, ngủ say như chưa có chuyện gì.',
          'Nhưng đêm nào {A} cũng mơ thấy một bàn tay xám xịt đeo vòng bạc vẫy gọi: "Lần sau mang thêm nhé."',
        ],
        end: 'open',
      },
      e4: {
        lines: [
          '{THAY} tới, rắc gạo muối vào góc tối, đọc một bài khấn rất dài.',
          '@bell|Từ trong góc, đứa em bò ra, tay cầm theo cả đống đồ đạc mất tích suốt mười năm qua.',
          '{THAY} dặn: "Ma xó giữ nhà, cũng không ác. Rằm nào cũng để nó một chén chè, nó sẽ giữ của cho nhà mình."',
        ],
        end: 'good',
      },
    },
  },

  {
    id: 'rung-tram',
    title: 'Lạc Trong Rừng Tràm',
    teaser: 'Ma giấu người trong rừng tràm. Ai bị giấu thì nghe thấy người nhà gọi mà không trả lời được.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          '{A} theo ba vào rừng tràm lấy mật ong. Ba dặn: "Đi sát ba, có ai gọi tên cũng đừng trả lời."',
          '@wind|Chiều tối, sương xuống dày đặc. Quay lại, {A} không thấy ba đâu nữa.',
          '@whisper|Từ trong sương, có giọng ba gọi: "{A} ơi, lại đây với ba." Nhưng giọng đó vang lên từ ba phía cùng lúc.',
        ],
        choice: { q: 'Ba giọng nói cùng gọi tên {A}…', a: ['Đi theo giọng gần nhất', 'Đứng yên, cởi áo mặc trái'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} đi về phía giọng gần nhất. Càng đi, rừng càng rậm, đất càng lún.',
          '@laugh|Phía trước có một ông già nhỏ thó, tóc bạc trắng, ngồi trên gốc tràm cười híp mắt: "Ở lại đây chơi với ông."',
          'Ông chìa ra một nắm "cơm trắng". Nhìn kỹ, đó là một nắm giun đất.',
        ],
        choice: { q: 'Ông già đang mời {A} ăn…', a: ['Ăn cho ông vui', 'Hất tung nắm cơm'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} nhớ lời bà: bị ma giấu thì mặc áo trái để nó không nhận ra.',
          '@steps|{A} cởi áo lộn trái mặc vào. Tiếng gọi xung quanh bỗng ngơ ngác: "Đâu rồi? Đâu rồi?"',
          'Từ xa có ánh đuốc, và tiếng chiêng, tiếng nồi xoong khua inh ỏi.',
        ],
        choice: { q: 'Ánh đuốc và tiếng khua đang tới gần…', a: ['Chạy về phía ánh đuốc', 'Nằm im chờ trời sáng'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} cầm nắm cơm lên ăn. Ông già vỗ tay cười khanh khách.',
          '@jump|Ba ngày sau, người làng tìm thấy {A} ngồi trong bụi gai rậm, miệng đầy bùn đất, cứ cười mãi không thôi.',
          'Đưa về nhà, {A} chỉ nói đúng một câu: "Ông bảo mai lại vào chơi."',
        ],
        end: 'bad', take: 'A',
      },
      e2: {
        lines: [
          '{A} hất tung nắm cơm. Ông già rít lên, biến thành một con chim đen bay vút đi.',
          '@bell|Tiếng chiêng vang lên. {A} thấy mình đang đứng ngay bìa rừng, ba chạy tới ôm chầm lấy.',
          'Ba kể: cả làng đã tìm {A} suốt hai ngày. Nhưng {A} nhớ, mình mới đi lạc chưa tới một giờ.',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          '{A} chạy về phía ánh đuốc. Cả làng đang gõ nồi gõ chiêng đi tìm, ba đi đầu.',
          '@bell|Ba ôm chặt lấy {A}, lột chiếc áo trái ra, đốt bên bìa rừng.',
          'Ông trưởng làng bảo: may mà biết mặc áo trái. Người bị ma giấu ở rừng này, ít ai tự về được.',
        ],
        end: 'good',
      },
      e4: {
        lines: [
          '{A} nằm im dưới gốc tràm. Tiếng chiêng xa dần, xa dần.',
          '@whisper|Rồi một giọng thì thầm sát tai: "Áo mặc trái… nhưng mùi thì không đổi được."',
          'Sáng ra, người làng tìm thấy chiếc áo lộn trái treo trên ngọn tràm cao nhất. Còn {A} thì không thấy đâu.',
        ],
        end: 'bad', take: 'A',
      },
    },
  },

  {
    id: 'chuyen-do',
    title: 'Chuyến Đò Cuối Ngày',
    teaser: 'Ông lái đò đội nón lá kín mặt, không lấy tiền, chỉ lấy một thứ.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          '{A} lỡ chuyến đò chiều, đứng đợi ở bến tới tận nửa đêm.',
          '@drip|Một chiếc đò nhỏ lặng lẽ cập bến. Ông lái đò đội nón lá sụp xuống, không thấy mặt.',
          'Trên đò đã có mấy người ngồi sẵn, ai cũng ướt sũng, im lặng nhìn xuống nước.',
          'Ông lái đò nói khàn khàn: "Qua sông thì trả tiền đò. Không lấy tiền, chỉ lấy một hơi thở."',
        ],
        choice: { q: 'Chiếc đò đang chờ {A} bước lên…', a: ['Bước lên đò', 'Đợi chuyến sáng mai'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} bước lên đò. Chiếc đò lướt đi không một tiếng chèo.',
          '@whisper|Giữa sông, người ngồi cạnh {A} ghé tai: "Đừng thở ra trước khi tới bờ. Thở ra là ông ấy lấy mất."',
          'Ngực {A} đau nhói. Bờ bên kia còn xa lắm.',
        ],
        choice: { q: '{A} đang nín thở giữa sông…', a: ['Cố nín tới bờ', 'Hé nón ông lái đò'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} lắc đầu. Ông lái đò đứng im rất lâu, rồi chống sào đi.',
          '@laugh|Nhưng sau lưng {A}, mặt nước bỗng sủi bọt. Từng bàn tay trắng bệch thò lên bám vào bậc bến.',
          '"Không đi đò thì xuống bơi với bọn tôi."',
        ],
        choice: { q: 'Những bàn tay đang bò lên bến…', a: ['Chạy lên bờ đê', 'Gọi ông lái đò quay lại'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} nín thở, mắt hoa lên, tai ù đi. Đò cập bờ đúng lúc {A} sắp ngất.',
          '@bell|{A} nhảy lên bờ, thở hắt ra. Sau lưng, chiếc đò và những người trên đó tan vào màn sương.',
          'Sáng ra, người làng bảo: bến này đêm nào cũng có đò ma, ai qua được mà không thở ra thì sống thọ.',
        ],
        end: 'good',
      },
      e2: {
        lines: [
          '{A} tò mò hé vành nón ông lái đò.',
          '@jump|Dưới nón không có mặt, chỉ là một khoảng tối đen ngòm, lập loè hai đốm sáng xanh như mắt cá.',
          '{A} hét lên. Hơi thở bay ra, ông lái đò há miệng nuốt trọn. Từ đó, đò ma có thêm một hành khách ngồi im nhìn xuống nước.',
        ],
        end: 'bad', take: 'A',
      },
      e3: {
        lines: [
          '{A} chạy một mạch lên bờ đê. Những bàn tay bám theo tới mép nước thì dừng lại.',
          '@wind|Gió thổi tung bụi lau. Tiếng nước vỗ dưới bến nghe như tiếng ai đó khóc.',
          'Sáng hôm sau, bậc bến đò chi chít dấu tay bùn. Từ đó, {A} chưa bao giờ đi đò sau sáu giờ chiều nữa.',
        ],
        end: 'open',
      },
      e4: {
        lines: [
          '{A} gọi to: "Ông lái đò ơi, cho con qua với!"',
          '@door|Chiếc đò quay lại. Ông lái đò cúi xuống, nhẹ nhàng gạt những bàn tay khỏi bến.',
          '"Biết gọi người thì người chở. Lên đi, lần này ông không lấy gì." Sáng ra, {A} tỉnh dậy ở bến bên kia, trong túi có một chiếc nón lá nhỏ.',
        ],
        end: 'good',
      },
    },
  },

  {
    id: 'cay-da',
    title: 'Cây Đa Đầu Làng',
    teaser: 'Đêm rằm, dưới gốc đa có một cô gái ngồi hát. Chàng trai nào trả lời câu hát sẽ không về nữa.',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          'Đầu làng của {A} có cây đa nghìn năm, rễ buông như tóc. Người làng không bao giờ đi ngang lúc nửa đêm.',
          'Đêm rằm, {A} và {B} đi đám cưới về muộn, phải đi qua gốc đa.',
          '@musicbox|Dưới gốc cây có một cô gái mặc áo tứ thân, ngồi hát một câu hò, giọng ngọt như mật.',
          'Hát xong, cô ngẩng lên: "Ai đối được câu hò, em theo về làm vợ."',
        ],
        choice: { q: 'Cô gái đang chờ người đối câu hò…', a: ['Để {B} đối lại', 'Cúi đầu đi nhanh qua'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{B} hăng hái đối lại một câu. Cô gái cười khúc khích, đứng dậy.',
          '@whisper|Dưới ánh trăng, {A} nhìn thấy rõ: chân cô gái không chạm đất, tóc cô quấn vào rễ đa.',
          'Cô chìa tay về phía {B}: "Đối hay thế, theo em về nhà đi."',
        ],
        choice: { q: 'Bàn tay cô gái chìa về phía {B}…', a: ['Kéo {B} bỏ chạy', 'Vái ba vái xin tha'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          'Hai đứa cúi gằm mặt, rảo bước đi qua. Tiếng hát im bặt.',
          '@steps|Sau lưng có tiếng chân sột soạt trên lá khô, đi theo đúng nhịp bước của hai người.',
          '@laugh|Giọng cô gái vang lên ngay sau gáy {A}: "Không đối được thì cõng em về vậy."',
        ],
        choice: { q: 'Có gì đó vừa nhảy lên lưng {A}…', a: ['Cõng về tới đầu làng', 'Hất xuống và chạy'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} túm tay {B} lôi chạy. Nhưng bàn tay {B} lạnh ngắt, rồi tuột ra như nắm phải một nắm rễ cây.',
          '@scream|Quay lại, {B} đang đứng dưới gốc đa, tay trong tay cô gái, mỉm cười vẫy chào.',
          'Từ đêm đó, dưới gốc đa có hai giọng hát đối đáp với nhau mỗi đêm rằm.',
        ],
        end: 'bad', take: 'B',
      },
      e2: {
        lines: [
          '{A} và {B} quỳ xuống vái ba vái: "Chúng con trót dại, xin cô tha cho."',
          '@bell|Cô gái thở dài, tiếng thở như gió lùa qua lá: "Ba trăm năm rồi mà chẳng ai đối lại cho tử tế."',
          'Rồi cô tan vào bóng đa. Từ đó, rằm nào hai đứa cũng mang hoa và trầu cau ra gốc đa thắp nhang.',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          '{A} cắn răng cõng, mỗi bước mỗi nặng, như cõng cả tảng đá.',
          '@wind|Tới đầu làng, tiếng chuông đình vang lên. Sức nặng trên lưng biến mất, chỉ còn một chiếc khăn mỏ quạ vắt trên vai.',
          'Các cụ trong làng bảo: cô ấy chỉ muốn được về làng một lần. Từ đó, gốc đa không còn tiếng hát nữa.',
        ],
        end: 'good',
      },
      e4: {
        lines: [
          '{A} hất mạnh rồi chạy. Có tiếng thứ gì đó rơi phịch xuống đất.',
          '@jump|Ngoảnh lại: trên mặt đất là một khúc rễ đa quấn đầy tóc người, đang từ từ bò theo.',
          'Sáng ra, người làng tìm thấy {A} nằm ngủ dưới gốc đa, tóc quấn chặt vào rễ cây, gỡ cả buổi mới ra.',
        ],
        end: 'bad', take: 'A',
      },
    },
  },
]);
