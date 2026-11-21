// Ngọn Đèn Cuối Cùng — kho truyện ma rẽ nhánh
//
// Cách viết thêm truyện:
//   - Mỗi truyện có các đoạn (nodes). Đoạn đầu là `start`.
//   - `lines`: các câu kể lần lượt. Câu bắt đầu bằng "@hiệu-ứng|" sẽ phát hiệu ứng trước khi kể,
//     ví dụ "@knock|Có tiếng gõ cửa." (nhiều hiệu ứng: "@wind,flicker|…").
//   - `choice`: người xem gõ 1 hoặc 2 để chọn hướng đi tiếp: { q: câu hỏi, a: [lựa chọn 1, lựa chọn 2], to: [đoạn 1, đoạn 2] }
//   - `next`: đi thẳng sang đoạn khác. `end`: 'good' | 'bad' | 'open' là kết truyện.
//   - `take`: 'A' | 'B' | 'C' → người đóng vai đó bị kéo vào gương (cõi âm) khi kết truyện.
//
// Tên người xem được ghép vào truyện:
//   {A} {B} {C}  ba người xem đang ngồi quanh đèn (ưu tiên người vừa bình luận)
//   {THAY}       thầy pháp (người tặng quà nhiều nhất đêm nay)
//   {MOI}        người vừa vào phòng gần nhất
//   {NGUOI}      số người đang ngồi quanh đèn, {NGUOI1} = thêm 1 (người thừa…)
//   {GIO}        giờ hiện tại
//
// Hiệu ứng có sẵn: knock door creak steps whisper laugh cry scream bell wind heart flicker dark
//   shadow eyes ghost jump musicbox phone drip clock mirror
// Hiệu ứng mở sự kiện trực tiếp: doll (búp bê ma chuyền tay) · possess (ai bị ma nhập?) · ouija (cầu cơ)

window.MA_STORIES = [
  {
    id: 'xe-dem',
    title: 'Chuyến Xe Đêm Qua Đèo',
    teaser: 'Người phụ nữ áo trắng vẫy xe ở nghĩa địa chân đèo…',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          'Đêm rằm tháng Bảy, chuyến xe khách cuối cùng rời bến lúc 11 giờ đêm, chở {A}, {B} và vài người lạ.',
          '@wind|Xe leo lên con đèo vắng. Sương mù dày đến mức đèn pha chỉ soi được vài mét.',
          'Ngang qua nghĩa địa chân đèo, một người phụ nữ áo trắng đứng bên đường, vẫy xe.',
          'Bác tài lẩm bẩm: "Giờ này ai đứng đó…" rồi vẫn đạp phanh.',
          '@door|Cửa xe mở. Chị ta bước lên, tóc ướt sũng, ngồi xuống ghế trống ngay cạnh {A}.',
        ],
        choice: { q: '{A} nên làm gì?', a: ['Bắt chuyện với chị ấy', 'Giả vờ ngủ'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} khẽ hỏi: "Chị đi đâu giờ này?"',
          'Chị ta không quay đầu: "Về nhà. Nhà chị… ở cây số 13."',
          '@drip|Nước từ tóc chị nhỏ xuống sàn xe, tí tách, tí tách. Nhưng ngoài trời không hề mưa.',
          '{B} ngồi ghế sau huých vai {A}, chỉ vào cửa kính: trong kính chỉ thấy một mình {A} ngồi đó.',
        ],
        choice: { q: 'Xe sắp tới cây số 13…', a: ['Hét lên bắt xe dừng lại', 'Im lặng chờ chị ấy xuống'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} nhắm mắt, nhưng vẫn cảm thấy rõ hơi thở lạnh buốt phả vào gáy.',
          '@whisper|Một giọng thì thầm sát tai: "Em đang ngồi… ghế của chị."',
          '{A} hé mắt nhìn tấm vé trên tay: ghế số 13. Chiếc ghế ấy đã bỏ trống suốt mười năm nay.',
          '@flicker|Đèn trong xe chớp tắt. Bác tài nhìn gương chiếu hậu, mặt cắt không còn giọt máu.',
        ],
        choice: { q: 'Phải làm sao bây giờ?', a: ['Nhường ghế cho chị ấy', 'Niệm Phật cầu siêu'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} hét lớn. Bác tài phanh gấp, cả xe chúi về phía trước.',
          '@scream|Khi mọi người ngẩng lên, ghế bên cạnh trống trơn… và {A} cũng biến mất.',
          'Trên ghế chỉ còn một vũng nước, và tấm vé xe số 13.',
        ],
        end: 'bad', take: 'A',
      },
      e2: {
        lines: [
          'Không ai nói một lời. Tới cây số 13, xe tự dừng, dù bác tài không hề đạp phanh.',
          '@door|Chị ta đứng dậy bước xuống, rồi quay lại cúi đầu cảm ơn {A}.',
          'Sáng hôm sau, {B} đọc báo cũ: mười năm trước, một cô gái mất ở cây số 13 trên đường về nhà, đúng đêm rằm tháng Bảy.',
          'Cô ấy chỉ muốn về nhà. Và năm nào, cô cũng đi chuyến xe ấy.',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          '{A} run run đứng dậy nhường ghế.',
          'Chị ta ngồi xuống, mỉm cười. Lúc này {A} mới thấy: dưới vạt áo trắng, chị không có chân.',
          '@laugh|Suốt quãng đường còn lại, cả xe nghe tiếng chị khe khẽ hát ru. Không ai dám ngủ.',
          'Tới bến, ghế 13 trống không. Trên ghế để lại một chiếc lược gỗ cũ… có khắc tên {A}.',
        ],
        end: 'open',
      },
      e4: {
        lines: [
          '{A} chắp tay niệm: "Nam mô A Di Đà Phật…". {B} đọc theo, rồi cả xe cùng đọc.',
          '@bell|Tiếng chuông chùa từ xa vọng lại, dù quanh đó chẳng có ngôi chùa nào.',
          'Khi {A} mở mắt, ghế bên cạnh chỉ còn thoang thoảng mùi hoa sứ.',
          'Đêm ấy, chuyến xe về bến bình an.',
        ],
        end: 'good',
      },
    },
  },

  {
    id: 'phong-tro',
    title: 'Phòng Trọ Năm Trăm Nghìn',
    teaser: 'Phòng rẻ đến khó tin. Chỉ đừng bao giờ mở cái tủ gỗ…',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          '{A} vừa ra trường, tìm được một phòng trọ giữa thành phố, giá chỉ năm trăm nghìn một tháng.',
          'Bà chủ trọ dặn đúng một câu: "Ở thoải mái. Chỉ đừng bao giờ mở cái tủ gỗ trong góc."',
          'Cánh tủ khoá bằng sợi xích gỉ, dán một lá bùa vàng đã bạc màu.',
          '@clock|Đêm đầu tiên, đúng ba giờ sáng…',
          '@knock|Cộc. Cộc. Cộc. Tiếng gõ phát ra từ bên trong cái tủ.',
        ],
        choice: { q: '{A} sẽ làm gì?', a: ['Gõ lại ba tiếng', 'Trùm chăn, coi như không nghe'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} rón rén lại gần, gõ lên cánh tủ: cộc, cộc, cộc.',
          'Im lặng. Rồi một giọng trẻ con vang lên: "Mở cho em ra với… trong này tối lắm."',
          '@laugh|"Em chơi trốn tìm, mà chẳng ai tìm thấy em… hai mươi năm rồi."',
        ],
        choice: { q: 'Tiếng trẻ con vẫn đang chờ…', a: ['Mở tủ ra', 'Gọi {THAY} tới'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} trùm chăn kín đầu. Tiếng gõ dừng lại.',
          '@steps|Rồi có tiếng bước chân nhỏ, lạch bạch, đi vòng quanh giường.',
          'Có ai đó leo lên giường, nằm xuống sát bên {A}. Tấm chăn từ từ bị kéo xuống…',
        ],
        choice: { q: 'Tấm chăn đã kéo xuống ngang mặt…', a: ['Mở mắt ra nhìn', 'Nhắm chặt mắt đến sáng'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} giật đứt sợi xích. Lá bùa rơi xuống. Cánh tủ kẽo kẹt mở ra…',
          'Bên trong trống rỗng. Chỉ có đôi dép nhựa trẻ con, và dòng chữ viết bút chì: "Tới lượt anh chị đi trốn."',
          '@door|Cửa tủ sập lại. Lần này, có người ở bên trong.',
          'Sáng hôm sau, bà chủ trọ dán lá bùa mới, rồi treo tấm biển: "Cho thuê phòng, năm trăm nghìn."',
        ],
        end: 'bad', take: 'A',
      },
      e2: {
        lines: [
          '{A} gọi ngay cho {THAY}. Nửa tiếng sau, {THAY} có mặt, tay cầm nắm nhang và đĩa xôi.',
          '{THAY} đặt tay lên cánh tủ: "Đứa nhỏ này không ác. Nó chỉ chờ có người tìm thấy nó."',
          '@bell|Nhang thắp lên, {THAY} gọi tên đứa bé. Tiếng gõ nhẹ dần, rồi tắt hẳn.',
          'Dưới đáy tủ có một chiếc hộp nhỏ đựng di ảnh bé gái. {A} mang di ảnh lên chùa. Từ đó, căn phòng yên ắng.',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          '{A} mở mắt. Một khuôn mặt trắng bệch đang nằm sát bên, mắt mở trừng trừng nhìn thẳng vào {A}.',
          '@jump|"TÌM THẤY EM RỒI!"',
          'Từ hôm ấy, {A} không bao giờ dám ngủ trong bóng tối nữa.',
        ],
        end: 'bad', take: 'A',
      },
      e4: {
        lines: [
          '{A} nhắm chặt mắt, đếm từng giây cho tới khi gà gáy.',
          '@wind|Sáng ra, cạnh gối có một bông hoa giấy, kèm mẩu giấy nguệch ngoạc: "Cảm ơn đã cho em ngủ cùng."',
          '{A} chuyển đi ngay trong ngày. Nhưng thỉnh thoảng, đúng ba giờ sáng, điện thoại {A} lại có một cuộc gọi nhỡ không số.',
        ],
        end: 'open',
      },
    },
  },

  {
    id: 'phong-bi-do',
    title: 'Phong Bì Đỏ Giữa Đường',
    teaser: 'Ông bà dặn: phong bì đỏ rơi giữa đường, đừng bao giờ nhặt…',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          'Trên đường đi làm về, {A} thấy một chiếc phong bì đỏ nằm giữa đường, căng phồng như có tiền.',
          'Ông bà ta vẫn dặn: phong bì đỏ rơi giữa đường, đừng bao giờ nhặt. Đó là sính lễ của người cõi âm.',
          'Nhưng xung quanh không có ai… {A} cúi xuống nhặt lên.',
          'Bên trong có một xấp tiền vàng mã, một lọn tóc buộc chỉ đỏ, và tấm ảnh một cô dâu trẻ.',
          '@laugh|Từ bụi tre bên đường, cả chục người áo đỏ bước ra, đồng thanh: "Đã nhận sính lễ, thì phải cưới!"',
        ],
        choice: { q: '{A} phải làm gì?', a: ['Vứt phong bì, bỏ chạy', 'Gọi {B} giúp'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} ném phong bì xuống đất, chạy thục mạng về nhà, khoá trái cửa.',
          '@musicbox|Nửa đêm, tiếng kèn vang lên ngoài ngõ. Kèn đám cưới… nhưng giai điệu là của đám ma.',
          '@knock|Có người gõ cửa: "Giờ lành đã tới, mời người mới ra rước dâu."',
          'Chiếc phong bì đỏ đã nằm sẵn trên bàn, dù {A} nhớ rõ mình đã vứt nó đi.',
        ],
        choice: { q: 'Tiếng gõ cửa mỗi lúc một dồn dập…', a: ['Mở cửa', 'Đốt phong bì'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} gọi cho {B}. Nghe xong, {B} im lặng rất lâu rồi nói: "Muốn huỷ hôn ma, phải có người thế chỗ."',
          '"Hoặc… phải trả lễ gấp mười lần."',
          '@whisper|Trong điện thoại bỗng có giọng thứ ba xen vào: "Hay để {B} cưới thay?"',
        ],
        choice: { q: 'Giọng nói kia vẫn đang chờ câu trả lời…', a: ['Để {B} cưới thay', 'Trả lễ gấp mười'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} mở cửa. Ngoài ngõ là một đoàn rước dâu áo đỏ, mặt ai cũng trắng bệch, không có bóng.',
          '@scream|Cô dâu vén khăn voan. Dưới lớp voan là gương mặt trong tấm ảnh… đang cười.',
          'Sáng hôm sau, hàng xóm chỉ thấy cửa nhà {A} mở toang, và một đôi giày đỏ đặt ngay ngắn trước thềm.',
        ],
        end: 'bad', take: 'A',
      },
      e2: {
        lines: [
          '{A} châm lửa đốt phong bì. Ngọn lửa cháy xanh lè, tiếng kèn ngoài ngõ rít lên rồi tắt lịm.',
          '@bell|{A} thắp ba nén nhang: "Tôi không nhận được mối duyên này. Xin cô thứ lỗi, sớm siêu thoát."',
          'Gió thổi tắt nhang, rồi nhang tự bùng cháy lại. Ngoài ngõ, đoàn người áo đỏ lặng lẽ tan vào sương.',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          '{A} im lặng. Đầu dây bên kia, {B} bỗng cười khẽ: "Ừ… cũng được."',
          '@laugh|Nhưng tiếng cười ấy không phải của {B}.',
          'Đêm đó, người ta thấy {B} mặc áo đỏ, tay cầm phong bì đỏ, thong thả đi về phía bụi tre.',
        ],
        end: 'bad', take: 'B',
      },
      e4: {
        lines: [
          '{A} sắm mười mâm lễ, mời {THAY} làm lễ trả sính lễ ở ngã ba đường.',
          '@bell|{THAY} đọc văn khấn suốt một canh giờ. Khói nhang cuộn lại thành hình một cô gái cúi chào, rồi tan.',
          'Từ đó, mỗi lần thấy phong bì đỏ giữa đường, {A} đều đi vòng thật xa.',
        ],
        end: 'good',
      },
    },
  },

  {
    id: 'live-3h',
    title: 'Phòng LIVE Lúc Ba Giờ Sáng',
    teaser: 'Một tài khoản tên là dấu chấm vào phòng, và hỏi: ai đang đứng sau lưng anh?',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          'Có một phòng LIVE kể chuyện ma rất đông người xem. Đêm nào chủ phòng cũng live tới ba giờ sáng.',
          'Đêm ấy, phòng có {NGUOI} người đang ngồi nghe, trong đó có {A} và {B}.',
          '@phone|Đúng ba giờ, một tài khoản không ảnh đại diện vào phòng. Tên chỉ là một dấu chấm.',
          'Nó bình luận: "Chủ phòng ơi, ai đang đứng sau lưng anh vậy?"',
          'Chủ phòng quay lại. Phía sau chỉ có bức tường trống.',
        ],
        choice: { q: 'Người xem nên làm gì?', a: ['Hỏi lại tài khoản đó', 'Bảo chủ phòng tắt LIVE'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} bình luận: "Bạn là ai?"',
          'Tài khoản dấu chấm trả lời ngay: "Mình là người xem thứ {NGUOI1}." Nhưng phòng chỉ có {NGUOI} người.',
          '@whisper|Rồi nó gọi tên từng người: "{A}… {B}… {C}… Mình thấy hết các bạn rồi."',
          '@flicker|Đèn trong phòng LIVE chập chờn. Ai cũng thấy: sau lưng chủ phòng, bóng tối đặc lại thành hình người.',
        ],
        choice: { q: 'Bóng đen đang tiến lại gần…', a: ['Tặng quà xin nó đi', 'Cả phòng cùng niệm Phật'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{B} bình luận liên tục: "Tắt LIVE đi! Tắt LIVE đi!"',
          'Chủ phòng bấm kết thúc. Màn hình tối đen… nhưng phòng LIVE không tắt.',
          '@laugh|Màn hình sáng lên lần nữa. Chủ phòng đã biến mất. Chỉ còn chiếc ghế trống, và tiếng cười khúc khích.',
          'Tài khoản dấu chấm bình luận: "Giờ mình làm chủ phòng nhé. Ai rời phòng trước, người đó đi cùng mình."',
        ],
        choice: { q: 'Ai rời phòng trước sẽ bị bắt đi…', a: ['Rời phòng ngay', 'Ở lại tới sáng'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} tặng một bông hồng: "Xin bạn đi đi."',
          'Tài khoản dấu chấm thả tim: "Cảm ơn nha. Nhưng mình thích ở đây lắm."',
          '@jump|Ảnh đại diện của nó đổi thành một tấm ảnh: căn phòng {A} đang ngồi, chụp từ phía sau lưng.',
        ],
        end: 'bad', take: 'A',
      },
      e2: {
        lines: [
          'Cả phòng cùng gõ "Nam mô A Di Đà Phật". Bình luận chạy kín màn hình.',
          '@bell|Tài khoản dấu chấm im lặng hồi lâu, rồi để lại dòng cuối: "Lâu lắm rồi mới có người niệm cho mình."',
          'Nó rời phòng. Số người xem giảm đi một. Từ đó, đêm nào chủ phòng cũng dành một phút mặc niệm trước khi kể chuyện.',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          '{B} bấm thoát ngay lập tức.',
          '@scream|Trên màn hình, chiếc ghế trống giờ đã có người ngồi. Là {B}, mắt trắng dã, nhìn thẳng vào ống kính.',
          'Tài khoản dấu chấm: "Chủ phòng mới đây rồi. Mọi người nhớ thả tim nhé."',
        ],
        end: 'bad', take: 'B',
      },
      e4: {
        lines: [
          'Không ai rời phòng. Mọi người cứ bình luận, thả tim, kể chuyện cho nhau nghe để giữ tỉnh táo.',
          '@wind|Năm giờ sáng, gà gáy. Chủ phòng loạng choạng hiện ra trước camera, như vừa tỉnh một giấc mơ dài.',
          'Tài khoản dấu chấm đã biến mất. Chỉ còn một bình luận được ghim: "Phòng này vui quá. Mai mình lại vào."',
        ],
        end: 'open',
      },
    },
  },

  {
    id: 'tang-4',
    title: 'Thang Máy Dừng Ở Tầng Bốn',
    teaser: 'Bệnh viện cũ không có nút tầng 4. Vậy mà thang máy vẫn dừng ở đó…',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          '{A} là y tá mới, lần đầu trực ca đêm ở một bệnh viện cũ.',
          'Đàn chị dặn: "Thang máy ở đây không có nút tầng 4. Nếu nó tự dừng ở tầng 4, tuyệt đối đừng bước ra."',
          '@steps|Hai giờ sáng, {A} đẩy xe thuốc vào thang máy, bấm tầng 6.',
          'Thang máy đi lên… rồi khựng lại. Màn hình hiện số 4.',
          '@door|Cửa mở ra một hành lang tối om, mùi thuốc sát trùng lẫn mùi nhang.',
          'Cuối hành lang, một bà cụ mặc đồ bệnh nhân vẫy tay: "Y tá ơi, giúp tôi với."',
        ],
        choice: { q: '{A} sẽ làm gì?', a: ['Bước ra giúp bà cụ', 'Bấm nút đóng cửa liên tục'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          '{A} bước ra. Cửa thang máy đóng lại sau lưng.',
          'Bà cụ dẫn {A} vào phòng 404. Trong phòng có hai chiếc giường, một chiếc phủ khăn trắng.',
          '@whisper|Bà chỉ vào chiếc giường phủ khăn: "Y tá xem giúp, sao người nhà mãi không tới đón tôi về?"',
        ],
        choice: { q: 'Bà cụ vẫn đứng chờ…', a: ['Lật tấm khăn trắng', 'Hỏi tên bà cụ'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} bấm nút đóng cửa liên tục. Cửa từ từ khép lại.',
          '@knock|Khi chỉ còn một khe hở, bốn ngón tay trắng bệch thò vào, níu lấy mép cửa.',
          '{B}, bảo vệ trực đêm, gọi vào bộ đàm: "{A} đang ở đâu? Camera thấy thang máy chở hai người."',
        ],
        choice: { q: 'Thang máy đang chở hai người…', a: ['Quay lại nhìn', 'Không nhìn, đọc kinh'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} lật tấm khăn trắng. Người nằm đó chính là bà cụ, đã lạnh ngắt từ lâu.',
          '@jump|Quay lại, bà cụ đã đứng sát sau lưng {A}: "Giờ thì ở lại với tôi nhé."',
          'Sáng hôm sau, cả bệnh viện đi tìm. Chỉ thấy xe thuốc của {A} để trước cửa phòng 404.',
        ],
        end: 'bad', take: 'A',
      },
      e2: {
        lines: [
          '{A} nhẹ nhàng hỏi: "Bà tên gì, nhà ở đâu ạ?"',
          'Bà cụ ngẩn người, như lâu lắm rồi mới có người hỏi. "Tôi tên Sáu… nhà ở xóm Chợ Cũ."',
          '@bell|Hôm sau, {A} lục hồ sơ cũ: bà Sáu mất ở phòng 404 hai mươi năm trước, không có người thân tới nhận.',
          '{A} cùng {THAY} làm lễ cầu siêu cho bà. Từ đó, thang máy không bao giờ dừng ở tầng 4 nữa.',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          '{A} quay đầu lại.',
          '@scream|Trong gương thang máy, một bà cụ đứng ngay sau lưng, cằm tựa lên vai {A}.',
          'Bộ đàm của {B} rè rè: "Thang máy… giờ chỉ còn một người." Nhưng không ai biết đó là ai.',
        ],
        end: 'bad', take: 'A',
      },
      e4: {
        lines: [
          '{A} nhắm mắt, lẩm nhẩm đọc kinh. Bàn tay lạnh trên vai từ từ buông ra.',
          '@door|Cửa mở ở tầng 6. Đèn sáng trưng. {B} đứng chờ sẵn với cây đèn pin.',
          '{B} nhìn {A} rất lâu: "Mai xin đổi ca đi. Tầng 4 mà nhớ mặt ai rồi là nhớ mãi."',
        ],
        end: 'open',
      },
    },
  },

  {
    id: 'bup-be',
    title: 'Búp Bê Dưới Đáy Giếng',
    teaser: 'Con búp bê áo đỏ dưới giếng cạn nhà ngoại. Nó muốn chơi với tất cả mọi người…',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          'Nhà ngoại của {A} ở quê có một cái giếng cạn, đậy bằng phiến đá nặng trịch.',
          'Hè năm ấy, {A} và {B} tò mò đẩy phiến đá ra. Dưới đáy giếng là một con búp bê sứ mặc áo đỏ.',
          '@musicbox|Không biết từ đâu vang lên tiếng hộp nhạc, leng keng, leng keng.',
          '{B} thả dây xuống kéo con búp bê lên. Mắt nó là hai hạt cúc đen, miệng vẽ một nụ cười.',
          'Đêm đó, con búp bê nằm ngay ngắn trên gối của {A}. Không ai mang nó vào nhà.',
        ],
        choice: { q: 'Con búp bê đang nhìn {A}…', a: ['Trả nó xuống giếng', 'Giữ lại, đặt tên cho nó'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          'Nửa đêm, {A} và {B} cầm đèn pin mang búp bê ra giếng.',
          '@whisper|Vừa thả xuống, từ đáy giếng vọng lên tiếng trẻ con: "Sao không chơi với em nữa?"',
          '@steps|Sau lưng hai người vang lên tiếng chân trần lạch bạch trên nền đất ướt.',
        ],
        choice: { q: 'Tiếng chân đang tới gần…', a: ['Chạy vào nhà', 'Đậy nắp giếng lại'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{A} đặt tên búp bê là Bé Mơ, cho nó ngồi cạnh bàn học.',
          'Từ đó, đồ đạc trong nhà cứ tự đổi chỗ. Sáng nào Bé Mơ cũng ngồi ở một góc khác.',
          '@laugh|Một đêm, {A} nghe nó hát: "Một… hai… ba… ai bị bắt… ai bị bắt…"',
          'Ngoại nhìn thấy con búp bê thì tái mặt: "Ba mươi năm trước, có đứa nhỏ ôm con búp bê này rơi xuống giếng."',
        ],
        choice: { q: 'Bé Mơ vẫn đang hát…', a: ['Nhờ {THAY} làm lễ', 'Hỏi búp bê muốn gì'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          'Hai đứa chạy ào vào nhà, đóng sập cửa, thở hổn hển.',
          '@laugh|Trên gối của {A}, con búp bê áo đỏ lại nằm đó, tóc còn ướt nước giếng.',
          'Nó nghiêng đầu, khẽ nói: "Tới lượt {A} xuống giếng chơi với em."',
        ],
        end: 'bad', take: 'A',
      },
      e2: {
        lines: [
          '{A} và {B} cùng đẩy phiến đá đậy kín miệng giếng. Tiếng hát tắt lịm.',
          '@bell|Sáng hôm sau, ngoại mời sư về tụng kinh, thả xuống giếng một con búp bê giấy để làm bạn cho đứa nhỏ.',
          'Từ đó, đêm đêm chỉ còn tiếng ếch nhái quanh giếng. Nhưng {A} biết: dưới đó vẫn có người đang chơi búp bê.',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          '{THAY} tới, nhìn con búp bê rất lâu: "Hồn đứa nhỏ nương vào đây. Nó không muốn hại ai, nó chỉ sợ cô đơn."',
          '@bell|{THAY} làm lễ, gửi búp bê lên chùa cho các sư trông nom. Tiếng hát vang lên lần cuối, rồi im.',
          'Năm nào tới rằm tháng Bảy, {A} cũng lên chùa thăm Bé Mơ. Lần nào nó cũng ngồi quay mặt về phía cổng.',
        ],
        end: 'good',
      },
      e4: {
        lines: [
          '{A} ngồi xuống, khẽ hỏi: "Em muốn gì?"',
          '@musicbox|Con búp bê từ từ quay đầu, nhìn khắp phòng: "Em muốn chơi chuyền búp bê… với tất cả mọi người."',
          '@doll|Và bây giờ… nó đang ở ngay trong phòng này.',
        ],
        end: 'open',
      },
    },
  },

  {
    id: 'nguoi-thu-13',
    title: 'Người Thứ Mười Ba',
    teaser: 'Mười hai người ngồi quanh đèn dầu. Đếm lại, lại thành mười ba…',
    start: 's1',
    nodes: {
      s1: {
        lines: [
          'Đêm ấy có mười hai người ngồi quanh ngọn đèn dầu kể chuyện ma. Y như chúng ta lúc này.',
          '{A} kể xong chuyện thứ nhất. {B} đứng dậy đếm người cho vui: "Một, hai, ba…"',
          '"…mười hai, mười ba." {B} khựng lại. Đếm lần nữa. Vẫn là mười ba.',
          '@flicker|Ngọn đèn dầu chao đảo. Không ai nhận mình là người tới sau.',
        ],
        choice: { q: 'Có một người thừa trong vòng tròn…', a: ['Bắt mọi người nắm tay nhau', 'Thổi tắt đèn rồi đếm lại'], to: ['s2a', 's2b'] },
      },
      s2a: {
        lines: [
          'Mọi người nắm tay thành vòng tròn. {A} nắm tay {C} ở bên phải.',
          'Bàn tay bên trái của {A} lạnh buốt, ướt nhẹp như vừa nhúng nước giếng.',
          '@whisper|Nhưng khi {A} quay sang trái… chỗ đó không có ai ngồi cả.',
        ],
        choice: { q: 'Bàn tay lạnh vẫn đang nắm chặt {A}…', a: ['Buông tay ra', 'Nắm chặt hơn'], to: ['e1', 'e2'] },
      },
      s2b: {
        lines: [
          '{B} thổi phụt ngọn đèn. Bóng tối ập xuống.',
          '@steps|Trong bóng tối có tiếng ai đó đứng dậy, đi vòng quanh, chạm nhẹ vào vai từng người.',
          '@laugh|"Một… hai… ba…" Giọng đếm ấy không phải của ai trong nhóm.',
        ],
        choice: { q: 'Tiếng đếm đang đi vòng quanh…', a: ['Thắp đèn lên ngay', 'Ngồi im, nín thở'], to: ['e3', 'e4'] },
      },
      e1: {
        lines: [
          '{A} buông tay. Vòng tròn đứt.',
          '@jump|Ngọn đèn phụt tắt rồi bùng sáng. Mọi người vẫn ngồi đó, đủ mười hai người…',
          'Nhưng có một người, đôi mắt không còn là của mình nữa.',
          '@possess|Người thứ mười ba đã nhập vào một ai đó trong phòng này. Hãy tìm ra nó!',
        ],
        end: 'open',
      },
      e2: {
        lines: [
          '{A} nắm chặt bàn tay lạnh ngắt ấy, khẽ nói: "Ngồi lại nghe chuyện với tụi mình đi."',
          'Bàn tay ấm dần lên. Cả đêm, vòng tròn có mười ba người, và chẳng ai sợ nữa.',
          '@bell|Sáng ra chỉ còn mười hai. Trên chiếu có một nắm hoa dại, như lời cảm ơn vì đã cho một linh hồn cô đơn được ngồi cùng.',
        ],
        end: 'good',
      },
      e3: {
        lines: [
          '{B} quẹt diêm. Ngọn lửa loé lên…',
          '@scream|Một gương mặt trắng bệch dí sát trước mặt {B}, miệng cười toác tới mang tai.',
          'Que diêm tắt. Khi đèn sáng lại, chỗ của {B} chỉ còn một chiếc dép.',
        ],
        end: 'bad', take: 'B',
      },
      e4: {
        lines: [
          'Mọi người ngồi im phăng phắc. Tiếng đếm dừng lại ở số mười hai.',
          '@door|Cánh cửa kẽo kẹt mở ra rồi đóng lại. Đèn tự bùng sáng. Đếm lại: mười hai người.',
          'Ai cũng thở phào. Chỉ có {C} vẫn ngồi im, mỉm cười, mắt nhìn chằm chằm vào ngọn đèn…',
          '@possess|Nó đi thật chưa? Hay vẫn đang ngồi giữa chúng ta?',
        ],
        end: 'open',
      },
    },
  },
];
