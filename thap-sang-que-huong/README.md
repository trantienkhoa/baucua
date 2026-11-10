# 🏮 Thắp Sáng Quê Hương — game TikTok LIVE bản đồ Việt Nam

Bản đồ **34 tỉnh, thành** (sau sắp xếp 2025, có **quần đảo Hoàng Sa, Trường Sa**) hiện trên LIVE. Người xem **bình luận tên quê** là đèn quê họ sáng lên, tặng quà để quê mình dẫn đầu. Chạy trên máy bạn, **không cần key bản quyền**.

## Cài đặt

1. Cài **Node.js** bản LTS: https://nodejs.org (chỉ làm 1 lần).
2. Giải nén thư mục này ra ổ đĩa (đừng chạy trong file nén).
3. **Windows:** bấm đúp **`ChayGame.bat`** (lần đầu tự cài thư viện, đợi vài phút).
   **macOS / Linux:** mở Terminal trong thư mục, chạy `./chay-game.sh`.
4. Trình duyệt tự mở trang điều khiển: `http://localhost:3310/admin.html`

## Lên LIVE

- **OBS:** Sources → + → Browser → URL `http://localhost:3310/live.html?obs=1`, 1080 × 1920, bật *Control audio via OBS*.
- **TikTok LIVE Studio:** Thêm nguồn → Liên kết → dán đường dẫn LAN (có trong trang điều khiển), hoặc Window Capture.
- **LIVE bằng điện thoại:** điện thoại cùng Wi-Fi mở đường dẫn LAN ghi trong trang điều khiển.
- Bật LIVE trên TikTok → ở trang điều khiển nhập tên kênh → **Kết nối**.

Key EulerStream là tuỳ chọn, chỉ để giảm giới hạn số lần kết nối mỗi giờ.

## Cách chơi

- 💬 **Bình luận tên tỉnh** → +1 điểm (chống spam 4 giây / người / tỉnh). Nhận **tên mới, tên cũ đã gộp** (Bình Dương → TP HCM, Quảng Nam → Đà Nẵng, Hà Giang → Tuyên Quang…), **tên thành phố** (Đà Lạt, Nha Trang, Vũng Tàu, Phú Quốc, Sa Pa…), **viết tắt** (HN, SG, HCM, HP, BMT), có dấu hay không dấu.
- 🎁 **Tặng quà** → cộng điểm cho quê người tặng theo bảng điểm (chỉnh được). Chưa nói quê thì điểm được giữ lại, bình luận tên quê là nhận.
- ❤️ Mỗi 50 tim của một người → +1 điểm cho quê người đó.
- 🇻🇳 Tổng xu cả buổi đủ 10.000 → **cả nước rực sáng**.
- 🏁 **Đua theo vòng** (5 phút / vòng) · 👑 **Chủ tỉnh** (người tặng nhiều nhất cho tỉnh).

## Tính năng giữ chân người xem

- ⚔️ **Đại chiến tự động** giữa 2 tỉnh dẫn đầu, thanh kéo co, thắng được thưởng.
- ❓ **Đố vui quê hương** (40 câu), ai trả lời đúng đầu tiên được điểm cho quê mình.
- ⭐ **Tỉnh may mắn ×2** · 🔥 **Tỉnh hot ×2** (3 người cùng gọi 1 tỉnh trong 20 giây).
- ❤️ **Sóng tim**: mỗi 1.000 tim cả phòng tự thắp một tỉnh còn tối.
- 🏡 **Người quen quay lại** tự thắp đèn quê họ, MC chào tên.
- 📅 **Điểm danh** nhiều ngày liên tiếp được thưởng tăng dần.
- 🏆 **Cột mốc** 5 / 10 / 17 / 25 / 30 / 34 tỉnh · 📊 **Tổng kết phiên** một chạm.
- 🎙 **MC giọng AI**: giới thiệu tỉnh khi đèn đầu tiên sáng, chào người mới, cảm ơn quà, hô đại chiến / đố vui, phòng im thì kể tên các tỉnh còn tối.
- Điểm lưu trên máy: tải lại màn hình hay khởi động lại máy không mất điểm.

**Mới: giữ chân người xem mạnh hơn**
- 🕯 **Đèn tắt dần**: tỉnh không ai bình luận / tặng quà sẽ mờ dần, chập chờn ⚠️ rồi tắt (mặc định 8 phút). MC gọi "Đèn Hà Nội sắp tắt, người Hà Nội đâu rồi!" → người xem phải ở lại giữ lửa cho quê.
- 🔄 **Mùa mới**: sáng đủ 34/34 tỉnh (hoặc cả nước rực sáng) → ăn mừng, ghi tên quê dẫn đầu, sau 20 giây bản đồ tắt hết và **mùa mới bắt đầu**, đua lại từ đầu.
- 🧧 **Lộc rơi** mỗi 6 phút: bao lì xì rơi khắp màn, ai gõ "lộc" trong 20 giây được bốc thăm 3 người nhận điểm cho quê.
- ⏳ **Đếm ngược sự kiện kế tiếp** (đại chiến / đố vui / lộc rơi) luôn hiện trên màn để người xem chờ.
- "Bạn là người thứ 12 của Huế" khi có người mới cùng quê.
- 🎆 **Cả nước rực sáng** có màn pháo hoa lớn 16 giây: pháo bay từ dưới lên nổ hình ngôi sao vàng, trái tim, vòng tròn, liễu rủ, kim tuyến; màn bắn dồn cuối; giấy màu rơi; chớp sáng, rung màn; chữ "CẢ NƯỚC RỰC SÁNG" lớn giữa màn; tiếng pháo nổ và vỗ tay; MC hô hào một tràng ("Từ địa đầu Lũng Cú đến mũi Cà Mau…", cảm ơn người tặng). Sáng đủ 34/34 cũng có màn tương tự.
- 🎖 **Chức vụ của tỉnh** thay cho cấp: điểm tích luỹ qua các buổi LIVE đưa người xem từ Công dân → Tổ phó dân phố → Tổ trưởng dân phố → Trưởng thôn → Phó Chủ tịch xã → Chủ tịch xã → Phó Giám đốc Sở → Giám đốc Sở → Phó Chủ tịch tỉnh → Chủ tịch tỉnh (thành phố trực thuộc trung ương: phường / TP). Hiện trên dòng sự kiện, thẻ vào phòng ("👑 Chủ tịch tỉnh Nghệ An"), băng-rôn thăng chức, bảng chức vụ chạy luân phiên với bảng điểm, và tổng kết phiên.
- 👋 **Khách vào phòng** hiện thẻ có ảnh + tên (người quen thì kèm quê), vào dồn dập thì gộp "+N người khác"; ô Sóng tim có thêm số người đang xem.
- 🎙 **MC không còn im ru**: tự gỡ khi giọng đọc của trình duyệt bị treo, chia câu ngắn, đọc tiếp ngay cả khi tab chạy nền. MC tự nói khi phòng im (bình luận bảng xếp hạng, tỉnh sắp tắt, sự kiện sắp tới…), chọn mức Ít / Vừa / Nhiều.
- 🔔 **Âm thanh cộng điểm**: +1 kêu "ting", +5…99 chuỗi xu rơi, +100 trở lên có trống và kèn chiến thắng, +500 hoành tráng hơn nữa. Cộng liên tục thì tiếng cao dần như combo. Có âm lượng riêng và nút nghe thử.
- 🔍 **Zoom vào tỉnh vừa được cộng điểm**: tỉnh nháy sáng mạnh, số "+điểm" bay lên, camera zoom vào rồi lùi ra (bật/tắt, chỉnh mức zoom).
- 🛡 **Chống spam chia sẻ**: mỗi người chỉ được cộng điểm chia sẻ 1 lần / 10 phút, tối đa 3 lần mỗi phiên; theo dõi chỉ tính 1 lần.
- ❓ Đố vui chỉ tính đúng khi gõ **chính xác tên tỉnh mới** (tên tỉnh cũ đã gộp, tên thành phố không tính).
- 🎲 **Tự đổi giao diện ngẫu nhiên** mỗi 10 phút và khi sang mùa mới.
- ❓ Đố vui: điểm cộng cho **quê của người trả lời**, gõ tên tỉnh lúc đang đố không làm đổi quê.

## Giao diện

10 giao diện đổi 1 chạm, mỗi cái có hiệu ứng riêng: Đêm Sao · Sơn Mài · Cực Quang · Neon · Đêm Trăng Hội An · Radar Chỉ Huy · Tết Rộn Ràng · Giấy Cổ · Biển Xanh · Hoa Sen.
🧊 Bản đồ 3D nổi khối · ⚡ Hiệu ứng nhẹ cho máy yếu · 🎵 Tải nhạc nền ngay trong trang điều khiển.

## Giọng MC

Giọng hay nhất: mở trang điều khiển bằng **Microsoft Edge** (giọng NamMinh / HoaiMy, cần mạng). Nếu màn OBS không có giọng Việt, trang điều khiển sẽ đọc thay — giữ trang đó mở.
Máy không có giọng Việt: Windows → Cài đặt → Thời gian & ngôn ngữ → Giọng nói → thêm Tiếng Việt.

## Dữ liệu

Điểm, cài đặt, người quen, nhạc nằm trong thư mục `data/`. Xoá thư mục này để làm lại từ đầu.
Ranh giới tỉnh gộp từ bộ geoBoundaries (public domain) theo Nghị quyết 202/2025/QH15.
