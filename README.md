# 🎮 Bộ Game TikTok LIVE

Một phần mềm, bốn game TikTok LIVE, dùng chung **một kết nối TikTok, một key, một bộ lọc từ, một thư mục nhạc**. Chạy trên máy bạn, **không cần key bản quyền**, không cần card đồ hoạ mạnh.

| Game | Màn LIVE | Điều khiển |
|---|---|---|
| 🏮 **Thắp Sáng Quê Hương** — bản đồ 34 tỉnh, thành, bình luận tên quê để thắp đèn | `/ban-do.html?obs=1` | `/ban-do-admin.html` |
| 🍻 **Quán Nhậu Chung** — quán nhậu vỉa hè, gõ “dzô” cả quán cụng ly | `/quan.html?v=nhau&obs=1` | `/quan-admin.html?v=nhau` |
| 💆 **Tiệm Massage Thư Giãn** — vào giường thư giãn, gõ “đã quá” | `/quan.html?v=massage&obs=1` | `/quan-admin.html?v=massage` |
| ☕ **Tiệm Cà Phê Chill** — quán cà phê đêm mưa, gõ “chill”, bảng lời nhắn | `/quan.html?v=cafe&obs=1` | `/quan-admin.html?v=cafe` |

## Cài đặt

1. Cài **Node.js** bản LTS: https://nodejs.org
2. Tải thư mục này về, giải nén, bấm đúp **`ChayGame.bat`** (lần đầu tự cài thư viện). macOS / Linux: `./chay-game.sh` (hoặc `npm install` rồi `npm start`).
3. Trình duyệt mở **trang chính** `http://localhost:3300/`: kết nối TikTok (nút 💾 Lưu key / 👁 / Xoá, tự kết nối lại), bộ lọc từ + chặn chửi thề, nhạc nền, chọn game, chép link cho OBS / TikTok LIVE Studio / điện thoại.

Đang dùng bản cũ? Chép thư mục `data/` cũ sang để giữ key, điểm, người quen, chức vụ. Bản Thắp Sáng Quê Hương chạy riêng: đặt thư mục `thap-sang-que-huong` (có `data/`) cạnh hoặc bên trong thư mục này — lần chạy đầu tự chuyển dữ liệu sang.

## Lên LIVE

- **OBS:** Browser source, dán link "OBS" của game trên trang chính, 1080 × 1920, bật *Control audio via OBS*.
- **TikTok LIVE Studio:** Thêm nguồn → Liên kết → dán link "LIVE Studio" (127.0.0.1); không nhận thì dùng link mạng LAN; vẫn không được thì bấm **🪟 Cửa sổ riêng** rồi dùng Window Capture.
- **LIVE bằng điện thoại:** điện thoại cùng Wi-Fi mở link "Điện thoại".
- Giọng MC hay nhất: mở trang điều khiển bằng **Microsoft Edge** (giọng NamMinh / HoaiMy). Màn OBS không có giọng Việt thì trang điều khiển tự đọc thay — giữ trang đó mở.

Key EulerStream là tuỳ chọn. Không có key vẫn kết nối được (thư viện mã nguồn mở `tiktok-live-connector`), chỉ bị giới hạn số lần kết nối mỗi giờ.

## 🏮 Thắp Sáng Quê Hương — bản đồ Việt Nam

Bản đồ **34 tỉnh, thành** (sau sắp xếp 2025, có **quần đảo Hoàng Sa, Trường Sa**) hiện trên LIVE. Người xem **bình luận tên quê** là đèn quê họ sáng lên, sao chổi bay từ thẻ người xem tới đúng tỉnh. 

- **Trang điều khiển:** `http://localhost:3300/ban-do-admin.html` (nút ⚙️ Điều khiển ở trang chính).

**Cách chơi**
- 💬 Bình luận tên tỉnh → +1 điểm cho tỉnh đó (chống spam 4 giây / người / tỉnh). Nhận **tên mới, tên cũ đã gộp** (Bình Dương → TP HCM, Quảng Nam → Đà Nẵng, Hà Giang → Tuyên Quang…), **tên thành phố** (Đà Lạt, Nha Trang, Vũng Tàu, Phú Quốc, Sa Pa…), **viết tắt** (HN, SG, HCM, HP, BMT), có dấu hay không dấu đều được.
- 🎁 Tặng quà → cộng điểm cho quê người tặng theo bảng điểm (chỉnh được). Chưa nói quê thì điểm **được giữ lại**, bình luận tên quê là nhận.
- ❤️ Mỗi 50 tim của một người → +1 điểm cho quê người đó.
- 🇻🇳 Tổng xu cả buổi đủ 10.000 → **cả nước rực sáng** (pháo hoa, thắp lần lượt từ Bắc vào Nam).
- 🏁 **Đua theo vòng** (5 phút / vòng), tỉnh nhất vòng có vương miện.
- 👑 **Chủ tỉnh**: người tặng nhiều xu nhất cho một tỉnh, có vương miện trên bản đồ.

**Tính năng giữ chân người xem (mới so với các tool cùng loại)**
- ⚔️ **Đại chiến tự động** giữa 2 tỉnh dẫn đầu (thỉnh thoảng lôi tỉnh hạng 3–4 vào cho bất ngờ), thanh kéo co đỏ – xanh, thắng được thưởng điểm.
- ❓ **Đố vui quê hương** (40 câu: Vịnh Hạ Long, Hội An nay thuộc đâu…), ai trả lời đúng đầu tiên được điểm cho quê mình — dạy luôn địa giới mới sau sáp nhập.
- ⭐ **Tỉnh may mắn ×2** mỗi 4 phút, ưu tiên tỉnh còn tối để rủ người quê đó vào.
- 🔥 **Tỉnh đang hot ×2**: 3 người khác nhau cùng gọi một tỉnh trong 20 giây.
- ❤️ **Sóng tim**: mỗi 1.000 tim cả phòng tự thắp một tỉnh còn tối.
- 🏡 **Người quen quay lại** (đã từng bình luận quê ở phiên trước) vào phòng là **tự thắp đèn quê họ**, MC chào tên.
- 📅 **Điểm danh mỗi ngày**: bình luận nhiều ngày liên tiếp được thưởng điểm tăng dần.
- 🏆 **Cột mốc** 5 / 10 / 17 / 25 / 30 / 34 tỉnh có pháo hoa và băng-rôn.
- 📊 **Tổng kết phiên** một chạm: số tỉnh sáng, số người, bình luận, tim, xu, người quay lại, quê dẫn đầu, người tặng nhiều nhất — để chụp màn hình đăng bài.
- 🎙 **MC giọng AI**: giới thiệu tỉnh khi đèn đầu tiên sáng, chào người mới, cảm ơn quà, hô đại chiến / đố vui, và khi phòng im lâu thì **kể tên các tỉnh còn tối** để rủ người xem.
- Điểm phiên được lưu trên máy chủ: tải lại màn hình hay khởi động lại máy không mất điểm (phiên tự làm mới sau 6 tiếng không dùng, hoặc bấm *Phiên mới*).

**Mới: giữ chân người xem mạnh hơn**
- 🕯 **Đèn tắt dần**: tỉnh không ai bình luận / tặng quà sẽ mờ dần, chập chờn ⚠️ rồi tắt (mặc định 8 phút). MC gọi "Đèn Hà Nội sắp tắt, người Hà Nội đâu rồi!" → người xem phải ở lại giữ lửa cho quê.
- 🔄 **Mùa mới**: sáng đủ 34/34 tỉnh (hoặc cả nước rực sáng) → ăn mừng, ghi tên quê dẫn đầu, sau 20 giây bản đồ tắt hết và **mùa mới bắt đầu**, đua lại từ đầu.
- 🧧 **Lộc rơi** mỗi 6 phút: bao lì xì rơi khắp màn, ai gõ "lộc" trong 20 giây được bốc thăm 3 người nhận điểm cho quê.
- ⏳ **Đếm ngược sự kiện kế tiếp** (đại chiến / đố vui / lộc rơi) luôn hiện trên màn để người xem chờ.
- "Bạn là người thứ 12 của Huế" khi có người mới cùng quê.
- 🔦 **Còn 3 / 2 / 1 tỉnh**: MC đọc tên từng tỉnh còn lại ("Chỉ còn 3 tỉnh nữa thôi: Lai Châu, Gia Lai và Cà Mau! Người … đâu rồi?"), băng-rôn gọi tên, ô "Còn 3: …" trên màn, các tỉnh còn tối có dấu ? và viền nhấp nháy; MC nhắc lại khi phòng im.
- 🎁 **Tặng quà hoành tráng theo cấp**: dưới 10 xu hiện thẻ cảm ơn có hình quà + ảnh người tặng; 10–99 xu thêm pháo bay và giấy màu; 100–999 xu thẻ lớn giữa màn có tia sáng xoay, 6 quả pháo, chớp sáng, rung màn, vỗ tay, MC hô "Quà lớn!"; từ 1.000 xu là màn pháo hoa "QUÀ KHỦNG" 10 giây, MC hô hào một tràng. Tặng liên tục cùng một quà thì gộp "×số lượng".
- ❓ **Đố vui 102 câu, mỗi tỉnh 3 câu riêng**, hỏi xoay vòng đủ 34 tỉnh (thứ tự ngẫu nhiên) rồi mới lặp lại.
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

**10 giao diện, đổi 1 chạm** (màn LIVE đổi ngay, không tải lại), mỗi giao diện có nền động và hiệu ứng thắp đèn riêng:
Đêm Sao (sao chổi) · Sơn Mài (trống đồng xoay) · Cực Quang (cột sáng) · Neon (tia laser, lưới neon) · Đêm Trăng Hội An (đèn lồng bay, trăng rằm) · Radar Chỉ Huy (tia quét, khoá mục tiêu) · Tết Rộn Ràng (pháo hoa, hoa mai) · Giấy Cổ (la bàn, đóng dấu "QUÊ") · Biển Xanh (sóng nước, gợn sóng) · Hoa Sen (cánh sen, đom đóm).

- 🧊 **Bản đồ 3D nổi khối**: tỉnh càng nhiều điểm càng nhô cao, bản đồ chuyển động nhẹ (bật/tắt 1 nút).
- ⚡ **Hiệu ứng nhẹ** cho máy yếu (30 hình/giây, ít hạt, bỏ đổ bóng).
- 🎵 Nhạc nền dùng chung (tải ở trang chính); không có nhạc thì phát tiếng đàn ngũ cung nhẹ.
- 🧪 Nút thử (bình luận, quà, tim, người quen, theo dõi, trả lời đố vui) để xem trước khi lên LIVE.

Dữ liệu ranh giới tỉnh: gộp từ bộ geoBoundaries (public domain) theo Nghị quyết 202/2025/QH15.

## 🍻 💆 ☕ Ba game quán

Ba game mới chạy chung một bộ máy, mỗi quán có hình vẽ, thực đơn, câu lệnh và lời MC riêng:

- 🚪 **Bình luận là vào quán**: nhân vật mang ảnh + tên người xem bước vào ngồi (quán nhậu 16 ghế quanh 4 bàn nhựa, tiệm massage 8 giường, cà phê 12 ghế). Hết chỗ thì xếp hàng chờ; ai im lặng quá 6 phút thì về, nhường chỗ. Người tặng quà được ưu tiên chỗ ngồi.
- 🎁 **Tặng quà là gọi món** theo thực đơn (sửa được): món cho mình, cho cả bàn hoặc mời cả quán — quà lớn có pháo bay, giấy màu, băng-rôn đại gia, MC hô.
  - Quán nhậu: cụng ly, khô mực, két bia cho bàn, lẩu thái, bao cả quán, ban nhạc sống.
  - Massage: trà gừng, đắp mặt nạ, massage chân, đá nóng, xông hơi cả tiệm, gói VIP.
  - Cà phê: trà đá, cà phê sữa đá, bạc xỉu + bánh, bình trà hoa, mời cả quán, gọi cơn mưa.
- 🗣 **Cả phòng cùng hô**: “dzô” / “đã quá” / “chill” — đủ 5, 12, 25 người trong 12 giây nổ combo (chữ lớn “1 2 3 DZÔ!”, pháo, giấy màu, tiếng reo), ai đang ngồi cũng được cộng cảm xúc.
- 😴 **Thanh cảm xúc** từng người (độ say / thư giãn / chill): gọi món, hô, thả tim là tăng; đầy thì ngủ gật “Zzz” 1 phút rồi tỉnh.
- ⚡ **Giờ nhân đôi** định kỳ, ❤️ **mục tiêu tim** (đủ tim quán mời mỗi khách một món), 🏡 **khách quen** lưu qua các buổi với danh hiệu (Khách quen → Bợm nhậu → Thánh nhậu; Hội viên bạc → vàng → kim cương; Cạ cứng → Chủ quán danh dự), khách quen vào phòng là tự vào quán.
- 📌 **Cà phê: bảng lời nhắn** — bình luận “mh: lời nhắn” rồi tặng quà để dán giấy nhớ lên bảng, MC đọc lời nhắn; ☔ mưa ngoài cửa sổ (quà “gọi cơn mưa” hoặc nút bật).
- Bảng **Thực đơn quà**, **Vừa gọi món**, **Đại gia đêm nay**, **Vua dzô / Thư giãn nhất / Chill nhất**; nhạc nền dùng chung hoặc tiếng nền tự tạo theo quán.

## Lịch sử

- **5.0.0** — Bỏ game sàn nhảy 3D Vũ Trường Neon; phần mềm còn 4 game, nhẹ hơn (không còn ~300 MB nhân vật 3D, bỏ thư viện three.js).
- **4.1.0** — Thêm Quán Nhậu Chung, Tiệm Massage Thư Giãn, Tiệm Cà Phê Chill.
- **4.0.0** — Gom các game thành một phần mềm, có trang chính dùng chung.
