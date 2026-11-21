// Ngọn Đèn Cuối Cùng — cấu hình dùng chung cho màn game và trang điều khiển
(function () {
  // tặng quà → hành động; xếp theo xu từ thấp lên cao (quà ≥ mức xu, hoặc đúng tên quà đã gán)
  window.MA_ACTIONS = [
    { id: 'nhang', icon: '🕯️', label: 'Thắp nhang', desc: 'thêm dầu cho đèn', min: 1 },
    { id: 'muoi', icon: '🧂', label: 'Rắc muối', desc: 'xua bớt âm khí', min: 5 },
    { id: 'go', icon: '🚪', label: 'Gõ cửa', desc: 'dọa cả phòng', min: 10 },
    { id: 'hu', icon: '🫣', label: 'Hù một người', desc: 'gõ "hù 12" để chọn ghế', min: 30 },
    { id: 'cauco', icon: '🔮', label: 'Cầu cơ', desc: 'hỏi hồn ma một câu', min: 99 },
    { id: 'bupbe', icon: '🪆', label: 'Búp bê ma', desc: 'chuyền tay cả phòng', min: 199 },
    { id: 'nhap', icon: '👁️', label: 'Ai bị ma nhập?', desc: 'cả phòng đi tìm', min: 299 },
    { id: 'goihon', icon: '👻', label: 'Gọi hồn', desc: 'ma hiện hình bắt người', min: 499 },
    { id: 'trura', icon: '☯️', label: 'Trừ tà', desc: 'làm thầy pháp, cứu hết', min: 999 },
  ];

  window.MA_DEFAULTS = {
    storyMode: 'vote',      // vote: người xem chọn chuyện | random | order
    storySpeed: 1,          // nhịp kể (1 = vừa, 1.3 = nhanh)
    voteSeconds: 25,        // thời gian chọn hướng đi của truyện
    storyVoteSeconds: 20,   // thời gian chọn chuyện tiếp theo
    voteGiftWeight: true,   // đã chọn rồi tặng quà → phiếu nặng thêm (1 xu = 1 phiếu)
    autoEvents: true, eventEvery: 4,    // tự mở sự kiện (nhập / búp bê / cầu cơ) mỗi N phút
    scare: 'vua',           // manh | vua | nhe | tat — mức hù (mặt ma bất ngờ)
    tts: true, ttsWhere: 'game', ttsVoice: '', ttsRate: 0.92, ttsVolume: 1,
    volume: 0.6,
    maxSeats: 70,           // số ghế quanh đèn
    idleSeconds: 420,       // im lặng quá lâu thì rời ghế
    joinOnLike: true,       // thả tim cũng được ngồi vào vòng
    lampDecay: 1,           // dầu đèn cạn nhanh / chậm
    yinRise: 1,             // âm khí tăng nhanh / chậm
    likeOil: 0.05,          // mỗi tim thêm bao nhiêu dầu
    thayMin: 99,            // tặng từ bao nhiêu xu thì thành thầy pháp (người tặng nhiều nhất)
    rescueNeed: 3,          // số người gõ "cứu N" để kéo một người ra khỏi gương
    takenReturnSec: 240,    // người bị bắt tự về sau bao lâu
    showGiftGuide: true, showBubbles: true, showHints: true,
    title: 'NGỌN ĐÈN CUỐI CÙNG',
    actions: window.MA_ACTIONS.map(a => ({ id: a.id, gift: '', min: a.min })),
  };
})();
