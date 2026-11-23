// Ngọn Lửa Cuối Cùng — kho truyện ma phần 4 (cách viết: xem đầu file ma-stories.js)
// Truyện hư cấu. Tuân thủ CLAUDE.md: không máu me, không ai trong vòng lửa ({A},{B},{C}) bị bắt / bị nhập / bị hại.
// Hiệu ứng mới: gio (gió giật, lửa rạp), luot (bóng đen lướt qua sau lưng), hush (im bặt rồi tiếng gõ), thamthi (tiếng thì thầm đi vòng quanh)
window.MA_STORIES = (window.MA_STORIES || []).concat([
  // ===================== ĐỒNG LÚA =====================
  {
    id: 'bu-nhin', title: 'Con Bù Nhìn Quay Đầu', teaser: 'Sáng nó nhìn ra đường. Tối nó nhìn vào làng.',
    start: 's1', nodes: {
      s1: { lines: [
        'Mùa gặt năm ấy, {A} và {B} được giao canh lúa ở cánh đồng cuối làng.',
        'Giữa ruộng có con bù nhìn rơm đội nón rách, tay dang ngang, mặt quay ra đường cái.',
        '@gio|Nửa đêm, gió nổi lên. Rơm xào xạc như có ai đang thở dài.',
        '@hush|{B} soi đèn ra ruộng, rồi khẽ nói: "Con bù nhìn… đang quay mặt về phía chòi mình."',
      ], choice: { q: 'Con bù nhìn đã quay đầu…', a: ['Ra tận nơi xem', 'Ngồi yên trong chòi canh'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '@steps|Hai đứa lội bờ ruộng. Càng tới gần, tiếng rơm sột soạt càng rõ.',
        'Con bù nhìn vẫn đứng đó. Nhưng dưới chân nó, bùn in một hàng dấu chân rơm dẫn về phía chòi.',
        '@thamthi|Có tiếng thì thầm từ phía sau lưng: "Đứng gác cả mùa… mỏi chân lắm."',
      ], choice: { q: 'Tiếng thì thầm sau lưng…', a: ['Quay lại nhìn', 'Đội lại nón cho bù nhìn rồi đi'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        'Hai đứa thổi tắt đèn, nín thở ngồi trong chòi.',
        '@creak|Cột chòi kêu kẽo kẹt như có ai vừa tựa lưng vào.',
        '@luot|Qua khe vách, một bóng người cao lêu nghêu, khoác áo tơi rơm, lướt qua rất nhanh.',
      ], choice: { q: 'Bóng áo tơi vừa lướt qua…', a: ['Gõ mõ báo cả xóm', 'Mời người ấy vào ngồi'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '@jump|Không có ai. Chỉ có chiếc nón rách rơi xuống ngay chân {A}.',
        'Ngoài ruộng, con bù nhìn đã quay mặt về lại đường cái, như chưa từng nhúc nhích.',
        'Sáng ra, ông chủ ruộng cười: "Nó gác thay tụi bây đó. Năm nào cũng vậy."',
      ], end: 'open' },
      e2: { lines: [
        '{A} nhặt chiếc nón rơi dưới bùn, đội lại ngay ngắn cho con bù nhìn.',
        '@bell|Gió lặng hẳn. Cả cánh đồng im như tờ, chỉ còn tiếng dế.',
        'Mùa ấy, chim không dám xuống ruộng. Người làng bảo bù nhìn được đội nón tử tế thì gác kỹ lắm.',
      ], end: 'good' },
      e3: { lines: [
        '@knock|Tiếng mõ vang cả xóm. Đèn nhà nhà bật sáng.',
        'Người làng ra tới nơi thì chẳng thấy ai, chỉ thấy cả ruộng lúa bị rạp thành một vòng tròn.',
        'Từ đó không ai dám canh ruộng đêm ở cánh đồng ấy nữa, lúa chín cũng phải gặt vội.',
      ], end: 'bad' },
      e4: { lines: [
        '{B} run run nói vọng ra: "Bác vào ngồi uống chén nước cho đỡ lạnh."',
        '@whisper|Có tiếng cười khàn khàn: "Lâu lắm rồi mới có người mời."',
        'Sáng ra, trước cửa chòi có một bó rơm khô buộc gọn, và mùa đó lúa trúng chưa từng thấy.',
      ], end: 'good' },
    },
  },
  {
    id: 'den-giua-ruong', title: 'Ngọn Đèn Giữa Ruộng', teaser: 'Ai cầm đèn đi giữa ruộng sâu lúc ba giờ sáng?',
    start: 's1', nodes: {
      s1: { lines: [
        '{A} đạp xe về làng lúc nửa đêm, đường đê chạy dọc cánh đồng sâu.',
        '@ghost|Xa xa giữa ruộng có một đốm đèn xanh, cứ chập chờn đi tới đi lui như người đi tìm thứ gì.',
        'Ruộng ấy nước ngập quá gối, ban ngày còn chẳng ai lội ra giữa.',
        '@thamthi|Gió thổi tới một tiếng gọi rất khẽ: "Rơi mất rồi… rơi mất rồi…"',
      ], choice: { q: 'Đốm đèn xanh giữa ruộng…', a: ['Dừng xe hỏi xem', 'Đạp thật nhanh về nhà'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '{A} dựng xe, gọi to: "Ai đó? Có cần giúp không?"',
        '@hush|Đốm đèn đứng khựng lại. Tiếng ếch nhái tắt ngúm cùng một lúc.',
        'Rồi đốm đèn từ từ trôi về phía bờ đê, nơi {A} đang đứng.',
      ], choice: { q: 'Đốm đèn đang trôi tới…', a: ['Đứng yên chờ', 'Soi đèn pin vào'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        '@steps|{A} đạp thục mạng. Nhưng đèn xe chợt tắt, xích xe tuột.',
        '@luot|Bên cạnh đường đê, có ai đó đi song song, bước chân lõm bõm dưới ruộng.',
        'Tiếng gọi lại vang lên, lần này ngay sát tai: "Có thấy nó không?"',
      ], choice: { q: 'Người dưới ruộng hỏi…', a: ['Hỏi lại: "Thấy cái gì?"', 'Lắp xích xe, không đáp'], to: ['e3', 'e4'] } },
      e1: { lines: [
        'Đốm đèn dừng trước mặt. Đó là ngọn đèn dầu, nhưng không có ai cầm.',
        '@bell|Dưới chân {A}, lấp lánh trong bùn là một chiếc vòng bạc cũ.',
        '{A} nhặt lên đặt cạnh đèn. Ngọn đèn sáng bừng một cái rồi tắt, và tiếng gọi không bao giờ vang lên nữa.',
      ], end: 'good' },
      e2: { lines: [
        '@jump|Ánh đèn pin quét qua: trống không. Đốm đèn xanh vụt tắt.',
        'Cả cánh đồng tối đen. Rồi khắp ruộng, hàng chục đốm đèn xanh cùng lúc bật lên.',
        '{A} chạy về tới nhà thì trời vừa sáng. Từ đó đi đâu cũng tránh con đê ấy.',
      ], end: 'open' },
      e3: { lines: [
        '"Cái nồi đồng. Nồi cơm của nhà tôi," tiếng nói đáp, nghe như vọng lên từ dưới nước.',
        '@drip|Sáng hôm sau, người làng tát ruộng tìm được một chiếc nồi đồng cũ, đem lên miếu.',
        'Đêm ấy, ai đi qua đê cũng nghe tiếng nồi cơm sôi lục bục, thơm lừng cả cánh đồng.',
      ], end: 'good' },
      e4: { lines: [
        '{A} cắn răng lắp xích, đạp đi không ngoái lại.',
        '@laugh|Sau lưng có tiếng cười khanh khách, rồi tiếng nước bắn tung toé.',
        'Về tới nhà, bánh xe của {A} quấn đầy rong và cỏ ruộng, dù cả đường chỉ đi trên đê khô.',
      ], end: 'bad' },
    },
  },
  {
    id: 'ganh-lua-dem', title: 'Người Gánh Lúa Lúc Nửa Đêm', teaser: 'Đòn gánh kẽo kẹt đi qua, mà chẳng thấy người gánh.',
    start: 's1', nodes: {
      s1: { lines: [
        'Đêm cuối mùa gặt, {A}, {B} và {C} ngồi phơi lúa ở sân kho hợp tác.',
        '@creak|Từ ngoài đồng vọng vào tiếng đòn gánh kẽo kẹt, đều đều như người gánh nặng đi bộ.',
        'Tiếng ấy đi qua cổng kho, qua sân, đi ngang ngay trước mặt ba đứa.',
        '@hush|Nhưng không có ai. Chỉ có hai bó lúa lơ lửng, đung đưa theo nhịp bước.',
      ], choice: { q: 'Hai bó lúa đi ngang qua…', a: ['Đi theo xem về đâu', 'Gọi bác thủ kho dậy'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '@steps|Ba đứa rón rén đi theo. Hai bó lúa đi thẳng về phía cái nhà kho cũ bỏ hoang.',
        'Cửa kho tự mở. Bên trong tối om, có tiếng ai đang quạt thóc sàn sạt.',
        '@thamthi|Một giọng ông già cất lên: "Thiếu người quạt thóc… vào phụ một tay đi."',
      ], choice: { q: 'Giọng ông già mời vào…', a: ['Vào phụ quạt thóc', 'Đứng ngoài cửa trả lời'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        'Bác thủ kho dụi mắt ra sân, nghe kể xong thì lặng đi.',
        '"Ông Cả kho cũ đó. Năm lụt, ông gánh thóc cứu cả làng, rồi không về nữa."',
        '@gio|Gió thổi tạt qua sân, lúa phơi bay lả tả như có ai vừa rảo bước qua.',
      ], choice: { q: 'Bác thủ kho hỏi…', a: ['Thắp nén nhang cho ông', 'Dọn lúa vào kho cho nhanh'], to: ['e3', 'e4'] } },
      e1: { lines: [
        'Trong kho không có ai, chỉ có chiếc quạt nan cũ đặt cạnh đống thóc.',
        '{C} cầm quạt phe phẩy vài cái. Đống thóc sáng lên vàng óng dưới trăng.',
        '@bell|Sáng ra, kho cũ đầy thóc tốt, không ai biết từ đâu. Cả làng có gạo ăn qua tháng giáp hạt.',
      ], end: 'good' },
      e2: { lines: [
        '{B} nói vọng vào: "Tụi cháu nhỏ, không biết quạt ạ."',
        '@laugh|Có tiếng cười khà khà. Rồi cánh cửa đóng sập.',
        'Sáng hôm sau, cánh cửa kho cũ không cách nào mở ra được nữa, đêm nào cũng vọng ra tiếng quạt thóc.',
      ], end: 'open' },
      e3: { lines: [
        'Ba đứa thắp nhang ở góc sân, khấn một câu cảm ơn.',
        '@whisper|Đòn gánh kẽo kẹt thêm một lần, nhẹ hẳn đi, rồi xa dần về phía đồng.',
        'Năm ấy, kho hợp tác không mất một hạt thóc nào, chuột cũng chẳng dám bén mảng.',
      ], end: 'good' },
      e4: { lines: [
        '@knock|Vừa xúc được mấy thúng, cửa kho bị gõ dồn dập.',
        'Mở ra thì sân trống trơn, chỉ có hai bó lúa đặt trước ngưỡng cửa, ướt sũng nước lụt.',
        'Từ đó, cứ cuối mùa gặt lại có hai bó lúa ướt đặt trước cửa kho, chẳng ai dám dọn.',
      ], end: 'bad' },
    },
  },
  // ===================== BỤI CHUỐI =====================
  {
    id: 'chuoi-hot', title: 'Cây Chuối Hột Sau Hè', teaser: 'Bà dặn: đừng bao giờ chặt cây chuối hột sau hè.',
    start: 's1', nodes: {
      s1: { lines: [
        '{A} về quê nghỉ hè. Sau hè nhà bà có một bụi chuối hột già, lá rách tả tơi.',
        'Bà dặn đi dặn lại: "Muốn gì thì muốn, đừng đụng tới cây chuối hột đó."',
        '@gio|Đêm ấy gió lớn. Lá chuối đập vào vách đất phành phạch như ai vỗ tay.',
        '@thamthi|Rồi có tiếng con gái hát ru rất nhỏ, từ phía bụi chuối vọng vào.',
      ], choice: { q: 'Tiếng hát ru sau hè…', a: ['Mở cửa sổ nhìn ra', 'Trùm chăn đi ngủ'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        'Dưới ánh trăng, có một cô gái mặc áo bà ba trắng đứng tựa thân chuối, quay lưng lại.',
        '@hush|Tiếng hát ngưng bặt. Cô gái nghiêng đầu, như đang lắng nghe tiếng thở của {A}.',
        'Cô nói, giọng buồn buồn: "Người ta định chặt cây này để làm chuồng heo."',
      ], choice: { q: 'Cô gái kể…', a: ['Hứa sẽ giữ cây chuối', 'Đóng cửa sổ, gọi bà'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        '{A} trùm chăn kín mít. Tiếng hát nhỏ dần rồi tắt.',
        '@luot|Nhưng qua lớp chăn mỏng, {A} thấy một bóng trắng lướt qua cửa sổ.',
        '@knock|Rồi ba tiếng gõ nhè nhẹ vào vách, ngay chỗ đầu giường.',
      ], choice: { q: 'Ba tiếng gõ vào vách…', a: ['Gõ đáp lại ba tiếng', 'Nằm im không động đậy'], to: ['e3', 'e4'] } },
      e1: { lines: [
        'Sáng ra, {A} năn nỉ cậu đừng chặt cây chuối hột. Bà nghe xong, gật đầu lia lịa.',
        '@bell|Bụi chuối năm ấy trổ buồng to chưa từng thấy.',
        'Đêm nào trăng sáng, sau hè lại vang tiếng hát ru, nghe ấm lòng chứ không còn buồn nữa.',
      ], end: 'good' },
      e2: { lines: [
        'Bà nghe kể, chỉ thở dài: "Nó lại về rồi."',
        '@cry|Sáng hôm sau cậu vẫn cho người chặt cây. Nhựa chuối chảy ra đỏ quạch như nước trầu.',
        'Chuồng heo làm xong, đêm nào heo cũng kêu thét, chẳng con nào chịu ở.',
      ], end: 'bad' },
      e3: { lines: [
        '{A} gõ đáp lại ba tiếng. Ngoài vách im phăng phắc.',
        '@whisper|Một giọng thì thầm: "Cảm ơn đã thức với tôi."',
        'Sáng ra, đầu giường có một nải chuối hột chín vàng, thơm phức, dù mùa này chuối còn non.',
      ], end: 'good' },
      e4: { lines: [
        'Tiếng gõ lặp lại, mỗi lúc một to, rồi dừng hẳn.',
        '@jump|Sáng ra, trên vách đất in rõ năm dấu ngón tay ướt nhựa chuối, đúng chỗ đầu giường.',
        'Bà lau mãi không phai. Từ đó {A} không dám ngủ phòng ấy một mình.',
      ], end: 'open' },
    },
  },
  {
    id: 'buong-chuoi-chin', title: 'Buồng Chuối Chín Một Mình', teaser: 'Cả bụi chuối còn xanh, chỉ một buồng chín vàng giữa đêm.',
    start: 's1', nodes: {
      s1: { lines: [
        '{A} và {B} đi bắt dế ở bụi chuối sau chùa.',
        'Cả bụi chuối buồng nào cũng xanh lè, chỉ một buồng chín vàng ươm, thơm nức trong đêm.',
        '{B} nuốt nước miếng: "Hái một trái thôi, ai mà biết."',
        '@eyes|Trong bụi chuối, có mấy đốm sáng lấp lánh, như mắt ai đang nhìn ra.',
      ], choice: { q: 'Buồng chuối chín vàng…', a: ['Hái một trái', 'Không hái, đi về'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '@creak|{B} với tay bẻ một trái. Thân chuối kêu răng rắc như có ai rên.',
        'Trái chuối trong tay lạnh ngắt. Bóc ra thì bên trong toàn là cánh hoa cúc trắng.',
        '@thamthi|Tiếng thì thầm đi một vòng quanh hai đứa: "Của cúng mà… của cúng mà…"',
      ], choice: { q: 'Tiếng thì thầm vây quanh…', a: ['Trả trái chuối lại chỗ cũ', 'Vứt đi rồi chạy'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        'Hai đứa quay về. Đi được mấy bước, mùi chuối chín đuổi theo sau lưng.',
        '@steps|Có tiếng bước chân lép nhép trên lá chuối khô, đi đúng nhịp với hai đứa.',
        '@luot|{A} liếc ra sau: một cái bóng thấp lè tè, ôm buồng chuối, vụt vào bóng tối.',
      ], choice: { q: 'Cái bóng ôm buồng chuối…', a: ['Lên tiếng hỏi', 'Chạy vào chùa'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '{B} lấy dây chuối buộc trái chuối lại vào buồng, chắp tay xin lỗi.',
        '@bell|Gió thổi qua, cả bụi chuối rì rào. Mùi hoa cúc thoang thoảng rồi tan.',
        'Sáng ra sư thầy bảo: buồng ấy là buồng cúng rằm, may mà hai đứa biết trả lại.',
      ], end: 'good' },
      e2: { lines: [
        '@laugh|Trái chuối rơi xuống, lăn theo hai đứa suốt dọc đường làng.',
        'Về tới nhà, trên bậc cửa đã có sẵn một trái chuối, vỏ đen sì.',
        'Cả tháng đó, sáng nào bậc cửa cũng có một trái chuối đen, vứt đi rồi hôm sau lại có.',
      ], end: 'bad' },
      e3: { lines: [
        '"Ai đó?" {A} hỏi. Cái bóng đứng lại, giọng trẻ con lí nhí: "Em đói…"',
        '@whisper|Hai đứa móc túi còn mấy viên kẹo, đặt xuống gốc chuối.',
        'Sáng ra, kẹo không còn, chỉ có một con dế lửa to nhất xóm nằm đợi trong hộp diêm của {B}.',
      ], end: 'good' },
      e4: { lines: [
        '@knock|Hai đứa chạy vào sân chùa, đập cửa thình thình.',
        'Sư thầy ra mở, nhìn ra cổng rồi lắc đầu: "Đi rồi. Nó chỉ tiễn hai đứa về thôi."',
        'Dưới chân cổng chùa là một vệt lá chuối khô kéo dài, dừng đúng ngưỡng cửa.',
      ], end: 'open' },
    },
  },
  // ===================== RỪNG TRE =====================
  {
    id: 'tre-khoc', title: 'Tiếng Khóc Trong Bụi Tre', teaser: 'Gió lùa qua tre nghe như có người khóc. Nhưng hôm đó không có gió.',
    start: 's1', nodes: {
      s1: { lines: [
        '{A} và {B} đi tắt qua rừng tre về làng bên, trời đã chạng vạng.',
        '@creak|Tre cọ vào nhau kẽo kẹt. Lá tre rụng lả tả trên đầu.',
        '@hush|Bỗng mọi tiếng động tắt hẳn. Không một ngọn gió.',
        '@cry|Vậy mà từ giữa rừng vẫn vọng ra tiếng ai đó khóc thút thít.',
      ], choice: { q: 'Tiếng khóc giữa rừng tre…', a: ['Lần theo tiếng khóc', 'Đi tiếp, không dừng'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '@steps|Hai đứa vạch tre đi vào. Tiếng khóc lúc gần lúc xa, như cố ý dẫn đường.',
        'Giữa một khoảnh đất trống có cái nôi tre cũ, đung đưa không cần ai đẩy.',
        '@thamthi|Tiếng khóc chuyển thành tiếng ru: "Ầu ơ… ai bồng con giùm…"',
      ], choice: { q: 'Cái nôi đung đưa…', a: ['Ngồi xuống ru tiếp', 'Đặt cái nôi đứng yên'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        'Hai đứa cúi đầu đi nhanh. Nhưng con đường mòn cứ quẹo về đúng chỗ cũ.',
        '@luot|Giữa hai thân tre, một bóng đàn bà tóc xoã lướt qua, tay ôm thứ gì quấn khăn.',
        '@gio|Gió nổi lên dữ dội, cả rừng tre nghiêng rạp về một phía, như chỉ đường.',
      ], choice: { q: 'Rừng tre rạp về một phía…', a: ['Đi theo hướng tre rạp', 'Đi ngược lại'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '{A} ngồi xuống, đưa tay đẩy nôi, khe khẽ hát câu ru bà vẫn hát.',
        '@bell|Tiếng khóc lặng dần. Trong nôi không có ai, chỉ có một chiếc yếm thêu đã bạc màu.',
        'Hai đứa đem chiếc yếm gửi lên chùa. Từ đó, đi qua rừng tre lúc chạng vạng chỉ còn nghe tiếng chim.',
      ], end: 'good' },
      e2: { lines: [
        '{B} giữ cái nôi lại. Nó khựng lại một cái, rồi giật mạnh khỏi tay.',
        '@jump|Cả rừng tre đồng loạt rung lên, tiếng khóc thét vang dội.',
        'Hai đứa chạy ra tới đường cái thì trời đã sáng, cứ ngỡ chỉ vừa đi có một lúc.',
      ], end: 'open' },
      e3: { lines: [
        'Hai đứa đi theo hướng tre rạp. Chẳng mấy chốc đã thấy ánh đèn làng bên.',
        '@whisper|Sau lưng có tiếng thì thầm: "Về cẩn thận nghe con."',
        'Người làng bảo rừng tre có bà mẹ hiền, chỉ dẫn đường cho ai lạc chứ không làm hại ai.',
      ], end: 'good' },
      e4: { lines: [
        '@steps|Hai đứa quay ngược lại. Càng đi rừng càng rậm, tre mọc chen kín lối.',
        'Đến khi tìm được đường ra, cả hai đã đứng trước cổng làng mình, sau lưng là cả đêm đi bộ.',
        'Đôi dép của {A} còn kẹt lại đâu đó trong rừng tre, mấy hôm sau thấy treo lủng lẳng trên ngọn tre cao vút.',
      ], end: 'bad' },
    },
  },
  {
    id: 'duong-tat-tre', title: 'Con Đường Tắt Qua Lũy Tre', teaser: 'Ông lão bán nước bảo: đi đường tắt thì đừng đếm bước.',
    start: 's1', nodes: {
      s1: { lines: [
        '{A}, {B} và {C} lỡ chuyến xe cuối, phải đi bộ về qua lũy tre đầu làng.',
        'Ông lão bán nước đầu đường dặn: "Đi đường tắt thì đừng đếm bước, đừng quay đầu."',
        '@steps|Đi được một lúc, {C} buột miệng: "Ủa, từ nãy tới giờ là một trăm bước rồi đó."',
        '@hush|Vừa dứt lời, mọi tiếng côn trùng tắt ngấm.',
      ], choice: { q: 'Đã lỡ đếm bước…', a: ['Đi tiếp như không có gì', 'Quay lại hỏi ông lão'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        'Ba đứa cắm cúi đi. Phía sau có thêm một tiếng bước chân, lệch nhịp với cả ba.',
        '@thamthi|Tiếng ai đếm khe khẽ: "Một trăm lẻ một… một trăm lẻ hai…"',
        'Tiếng đếm mỗi lúc một gần, như người ấy đang rảo bước đuổi theo.',
      ], choice: { q: 'Tiếng đếm bước sau lưng…', a: ['Đếm to át tiếng kia', 'Đứng lại nhường đường'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        '@luot|Ba đứa quay đầu. Một bóng đen vụt qua giữa hai bụi tre.',
        'Quán nước đầu đường vẫn còn đó, nhưng ông lão đã biến mất, chỉ còn ấm nước bốc khói.',
        'Trên bàn có ba chén nước rót sẵn, đặt ngay ngắn như đang đợi khách.',
      ], choice: { q: 'Ba chén nước rót sẵn…', a: ['Ngồi uống rồi đi', 'Không uống, chạy về'], to: ['e3', 'e4'] } },
      e1: { lines: [
        'Ba đứa đồng thanh đếm to: "Một trăm lẻ ba! Một trăm lẻ bốn!"',
        '@laugh|Tiếng đếm phía sau ngập ngừng, rồi bật cười, rồi im hẳn.',
        'Về tới làng, cả ba khàn cả giọng. Ông lão hôm sau gật gù: "Tụi bây đếm to quá, nó chịu thua."',
      ], end: 'good' },
      e2: { lines: [
        'Ba đứa nép vào bụi tre. Tiếng bước chân đi ngang qua, chậm rãi.',
        '@gio|Gió lạnh buốt thổi qua mặt. Không có ai cả, chỉ có dấu chân trần in trên đất ẩm.',
        'Dấu chân đi thẳng về làng, dừng trước cửa nhà {C}. Mấy đêm sau, chó nhà {C} cứ sủa vu vơ về phía cổng.',
      ], end: 'bad' },
      e3: { lines: [
        'Nước chè xanh nóng hổi, thơm mùi lá vối.',
        '@bell|Uống xong, con đường tắt bỗng sáng trăng vằng vặc, côn trùng kêu rả rích trở lại.',
        'Sáng ra mới biết ông lão bán nước đã mất từ năm ngoái. Quán vẫn để đó, ai đi đêm cũng có nước uống.',
      ], end: 'good' },
      e4: { lines: [
        '@knock|Ba đứa chạy thục mạng. Sau lưng, ba chén nước rơi vỡ loảng xoảng.',
        'Về tới nhà, túi áo mỗi đứa đều có một chiếc lá vối khô, chẳng biết rơi vào từ lúc nào.',
        'Từ đó cả ba đi đâu cũng đi đường cái, có xa mấy cũng chịu.',
      ], end: 'open' },
    },
  },
  {
    id: 'dao-mang', title: 'Đi Đào Măng Đêm', teaser: 'Măng mọc lúc nửa đêm thì ngọt nhất. Nhưng ai cũng biết không nên đi một mình.',
    start: 's1', nodes: {
      s1: { lines: [
        '{A} và {B} rủ nhau vác cuốc đi đào măng lúc nửa đêm, nghe nói măng đêm ngọt nhất.',
        'Rừng tre tối đen, chỉ có ánh đèn pin chiếu lờ mờ lên những mụt măng nhú khỏi đất.',
        '@creak|Mỗi nhát cuốc bổ xuống, cả bụi tre lại rên lên một tiếng kẽo kẹt dài.',
        '@thamthi|Rồi có tiếng ai đó cũng đang đào, sột soạt, ở ngay bụi bên cạnh.',
      ], choice: { q: 'Có người đào măng bụi bên cạnh…', a: ['Lại hỏi thăm', 'Đào lẹ rồi về'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        'Bên bụi kia có một bà cụ đội nón, lưng còng, đang lom khom đào bằng tay không.',
        '@hush|Bà cụ ngừng tay, không ngẩng đầu: "Măng này của bà. Bà trồng bụi tre này từ hồi con gái."',
        'Cái gùi bên cạnh bà đầy măng, nhưng mụt nào cũng đã khô quắt.',
      ], choice: { q: 'Bà cụ nói măng là của bà…', a: ['Biếu bà số măng vừa đào', 'Xin lỗi rồi bỏ đi'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        '@steps|Hai đứa đào lấy mấy mụt rồi bỏ chạy. Tiếng đào bên bụi kia cũng ngưng.',
        '@luot|Ánh đèn pin lướt qua một bóng còng lưng, đứng chắn ngay lối ra.',
        'Giỏ măng trên vai {B} bỗng nặng trĩu như chứa đá.',
      ], choice: { q: 'Giỏ măng nặng trĩu…', a: ['Đổ măng lại gốc tre', 'Cố vác về'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '{A} đặt cả giỏ măng xuống cạnh bà cụ. Bà cười móm mém, xoa đầu hai đứa.',
        '@bell|Khi ngẩng lên, bà cụ đã không còn đó. Cả rừng tre thơm mùi măng luộc.',
        'Từ đó, mùa nào hai đứa vào rừng cũng thấy măng mọc san sát, đào không xuể.',
      ], end: 'good' },
      e2: { lines: [
        '@gio|Hai đứa quay đi. Một cơn gió quật mạnh, cả bụi tre đổ rạp xuống lối đi.',
        'Phải vạch tre bò ra, áo quần rách tươm.',
        'Mùa ấy cả rừng tre không mọc nổi một mụt măng nào, người làng bảo có ai làm phật lòng chủ cũ.',
      ], end: 'bad' },
      e3: { lines: [
        '{B} đổ hết măng xuống gốc tre. Giỏ nhẹ bẫng trở lại.',
        '@whisper|Bóng còng lưng tránh sang một bên, có tiếng nói khẽ: "Lần sau xin phép bà trước nghe."',
        'Hai đứa về tay không, nhưng sáng ra trước sân có sẵn một bó măng tươi buộc dây lạt.',
      ], end: 'good' },
      e4: { lines: [
        '@jump|{B} cắn răng vác giỏ về. Mở ra thì toàn đá cuội, ướt đẫm sương.',
        'Đêm đó cả nhà nghe tiếng gõ cửa đều đặn tới sáng.',
        'Hai đứa phải mang đá trả lại rừng tre, tiếng gõ cửa mới thôi.',
      ], end: 'open' },
    },
  },
  // ===================== GIẾNG CỔ =====================
  {
    id: 'gau-nuoc-dem', title: 'Tiếng Gàu Múc Nước Nửa Đêm', teaser: 'Giếng làng đã lấp nắp từ lâu. Đêm nào cũng có tiếng ròng rọc quay.',
    start: 's1', nodes: {
      s1: { lines: [
        'Giếng đầu làng đã đậy nắp gỗ từ khi làng có nước máy.',
        '@creak|Vậy mà đêm nào cũng có tiếng ròng rọc quay kẽo kẹt, tiếng gàu chạm nước bõm bõm.',
        '{A} và {B} quyết định rình xem ai múc nước lúc nửa đêm.',
        '@drip|Đúng mười hai giờ, tiếng ròng rọc vang lên. Nắp giếng vẫn đậy kín.',
      ], choice: { q: 'Nắp giếng vẫn đậy mà có tiếng múc nước…', a: ['Mở nắp giếng ra', 'Gõ lên nắp hỏi'], to: ['s2a', 's2b'] } },
      s2a: { lines: [
        '@hush|Hai đứa nhấc nắp gỗ lên. Tiếng ròng rọc tắt phụt.',
        'Dưới đáy giếng sâu hun hút, mặt nước phản chiếu ánh trăng, và một gương mặt đang ngước nhìn lên.',
        '@thamthi|Tiếng nói vọng lên: "Gàu rơi mất rồi. Thả dây xuống giúp với."',
      ], choice: { q: 'Có tiếng xin thả dây…', a: ['Thả gàu xuống', 'Đậy nắp lại ngay'], to: ['e1', 'e2'] } },
      s2b: { lines: [
        '@knock|{B} gõ ba cái lên nắp gỗ. Bên dưới gõ đáp lại ba cái.',
        'Rồi một giọng con gái hỏi vọng lên: "Có phải mẹ không? Con đợi mẹ múc nước về nấu cơm."',
        '@cry|Tiếng khóc thút thít, nghe rất xa mà cũng rất gần.',
      ], choice: { q: 'Giọng con gái hỏi có phải mẹ…', a: ['Nói thật mình không phải', 'Giả giọng người mẹ'], to: ['e3', 'e4'] } },
      e1: { lines: [
        '{A} thả chiếc gàu mới xuống. Dây căng ra, như có ai cầm lấy.',
        '@bell|Kéo lên, gàu đầy nước trong vắt, mát lạnh, phản chiếu cả bầu trời sao.',
        'Từ đó, giếng làng ngừng kêu. Người già bảo nước giếng ngọt trở lại như hồi xưa.',
      ], end: 'good' },
      e2: { lines: [
        '@jump|Nắp gỗ đậy sập xuống. Bên dưới có tiếng nước bắn tung toé.',
        'Đêm đó và mấy đêm sau, tiếng ròng rọc quay mãi không dứt, càng lúc càng gấp.',
        'Người làng phải đóng đinh nắp giếng, nhưng sáng nào đinh cũng bị nhổ lên một chiếc.',
      ], end: 'bad' },
      e3: { lines: [
        '"Tụi chị không phải mẹ em. Nhưng tụi chị sẽ tìm giúp," {A} nói.',
        '@whisper|Bên dưới im một lúc, rồi đáp khẽ: "Mẹ em ở xóm Đông, nhà có cây cau đôi."',
        'Hai đứa tìm tới xóm Đông. Bà cụ nhà cây cau đôi nghe kể, khóc ròng, rồi ra giếng thắp nhang. Từ đó giếng im hẳn.',
      ], end: 'good' },
      e4: { lines: [
        '{B} giả giọng: "Ừ, mẹ đây." Bên dưới bỗng im phăng phắc.',
        '@laugh|Rồi có tiếng cười khúc khích: "Mẹ con không nói giọng đó."',
        'Sáng hôm sau, gàu của nhà {B} ướt sũng treo trên cành sung cạnh giếng, dù cả đêm không ai mang ra.',
      ], end: 'open' },
    },
  },
]);
