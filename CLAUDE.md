# Quy tắc bắt buộc khi làm game TikTok LIVE trong repo này

Mọi game, tính năng, truyện, hiệu ứng mới đều phải tuân thủ Nguyên tắc Cộng đồng TikTok (áp dụng cho cả LIVE)
và Nguyên tắc kiếm tiền trên LIVE. Khi thêm hoặc sửa game, tự kiểm tra theo danh sách dưới đây trước khi commit.

## 1. Quà tặng và tiền
- KHÔNG cờ bạc hay giống cờ bạc: không đặt cược, không tặng quà để nhận kết quả may rủi (quay số, xúc xắc, rút thăm có thưởng).
- KHÔNG trả tiền để thắng: quà không được đổi thành phiếu bầu nặng hơn, điểm thắng, hay quyền quyết định thay cả phòng.
- KHÔNG kêu gọi tặng quà để đổi lấy phần thưởng ("tặng X để được Y", "tặng để cứu bạn"). Quà chỉ kích hoạt hiệu ứng trang trí cho cả phòng.
- Cảm ơn quà thì được; xin quà, ép quà, đếm ngược đòi quà thì không.
- Chơi phải được bằng bình luận và thả tim. Người không tặng quà vẫn tham gia đầy đủ.
- Nhớ: phải 18+ mới được tặng quà hoặc lên LIVE. Không làm nội dung nhắm tới trẻ em để kiếm quà.

## 2. Nội dung
- Không máu me, xác chết, nội tạng hay thương tích ghê rợn. Không mô tả tự tử hay tự hại.
- Hù dọa: mặc định mức nhẹ. Không chớp sáng mạnh (nguy cơ động kinh), không mặt ma phóng to sát màn hình.
- Không thử thách nguy hiểm, không hướng dẫn nghi thức mà người xem có thể làm theo. Truyện phải ghi rõ là hư cấu.
- Không thù ghét, phân biệt, tình dục, ma túy, vũ khí, hay hướng dẫn phạm pháp.

## 3. Người xem
- Không để hành động trả phí nhắm vào, làm nhục hay "bắt" một người xem cụ thể. Hiệu ứng trả phí tác động lên cả phòng.
- Không gọi tên người thật trong vai xấu (bị ma nhập, bị bắt, bị tố…) vì dễ thành bắt nạt.
- Che từ tục trong bình luận trước khi hiện lên màn hình (`cleanBad` trong server.js). Không hiện thông tin cá nhân.
- Số ghế hoặc số thứ tự: nhỏ, vừa đủ thấy, hoặc ẩn khi không cần gõ số.

## 4. Minh bạch và tương tác thật
- Giọng đọc AI hoặc nội dung do AI tạo phải có nhãn trên màn hình ("giọng đọc AI"). Nhắc chủ phòng bật nhãn AIGC của TikTok.
- Không tương tác giả: công cụ thử (người xem, bình luận, quà giả) phải tự khóa khi đang kết nối LIVE thật.
- Treo LIVE không người: game phải luôn phản hồi thật với người xem (chào người mới, đáp bình luận, cảm ơn quà).
  Vẫn phải báo trước cho chủ phòng: TikTok có thể coi LIVE lặp lại, không người dẫn là nội dung chất lượng thấp,
  hoặc hỏi xem chủ phòng còn ở đó không. Khuyên chủ phòng thỉnh thoảng vào trả lời.

## 5. Kỹ thuật chung
- Văn bản cho người dùng viết bằng tiếng Việt có dấu.
- Không đưa tên model AI vào commit hay code.
