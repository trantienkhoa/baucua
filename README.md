# 🪩 Vũ Trường Neon — game TikTok LIVE sàn nhảy

Sàn nhảy **3D** trong phòng LIVE (Three.js: nhân vật người 3D có tóc, mặt, quần áo/váy, sàn đèn LED 3D, sân khấu, màn LED, cầu disco, đèn quét, laser): người xem **bình luận** là có một nhân vật mang **ảnh đại diện + tên TikTok** của họ rơi xuống sàn và nhảy theo nhạc. Chạy trên máy bạn, **không cần key bản quyền**.

## Cài đặt (Windows)

1. Cài **Node.js** bản LTS: https://nodejs.org
2. Tải thư mục này về, bấm đúp **`ChayGame.bat`** (lần đầu sẽ tự cài thư viện).
3. Trình duyệt mở trang điều khiển `http://localhost:3300/admin.html`.

macOS / Linux: `npm install` rồi `npm start`.

## Lên LIVE

1. **OBS**: Sources → + → Browser → URL `http://localhost:3300/game.html?obs=1`, 1080 × 1920, bật *Control audio via OBS*.
   **TikTok LIVE Studio**: Thêm nguồn → Liên kết → dán đường dẫn LAN (trang điều khiển có sẵn), hoặc Window Capture.
2. Bắt đầu LIVE trên TikTok.
3. Ở trang điều khiển, nhập tên kênh → **Kết nối**.
4. **Live bằng điện thoại**: điện thoại cùng Wi-Fi mở đường dẫn LAN hiện trong trang điều khiển.

Key EulerStream là tuỳ chọn. Không có key vẫn kết nối được (dùng thư viện mã nguồn mở `tiktok-live-connector`), chỉ bị giới hạn số lần kết nối mỗi giờ.

## Sửa lỗi bình luận không lên sàn, hình YouTube (không tiếng), nút lưu key (bản 2.8.0)

- **YouTube trở lại màn LCD, chỉ có hình.** Mở *Bảng điều khiển màn hình* → mục ▶️ YouTube → dán link (video, Shorts, playlist, youtu.be) → **Thêm**. Màn LCD chiếu hình **luôn tắt tiếng**, kể cả khi bấm vào trang hay chỉnh âm lượng. Nhạc game, đèn theo nhạc và giọng MC vẫn chạy bình thường.
- Người tặng quà lớn vẫn được chiếu chen ngang như cũ. Video chủ kênh tắt nhúng sẽ tự bỏ qua. Cần mạng Internet.
- **Sửa lỗi bình luận mà không lên sàn.** Thư viện kết nối TikTok bản mới đổi định dạng dữ liệu (bình luận nằm ở `content`, tên tài khoản ở `displayId`, số tim ở `count`, loại quà ở `gift.type`). Game nay đọc được cả định dạng mới lẫn cũ: bình luận đưa người lên sàn trở lại, quà tặng theo chuỗi không bị tính trùng, số tim và số người xem hiện đúng. Một sự kiện lỗi cũng không làm mất các sự kiện sau.
- **Nút 💾 Lưu key EulerStream** ở mục 1 trang quản trị (trước đây key chỉ lưu khi bấm Kết nối). Có nút 👁 hiện/ẩn, nút **Xoá**, và dòng báo “✓ Đã có key”. Nhấn Enter trong ô cũng lưu.

## Chuẩn hoá 98 nhân vật (bản 2.7.0)

- **Bỏ `char98`, `char99`:** danh sách còn 98 vai, khớp với 98 nhân vật của bạn.
- **Gắn xương lại cho cả 98 người, kiểm tra từng người ở tư thế giơ hai tay hết cỡ (khoảng 120°) và đá chân:**
  - Bề dày tay áo đo theo từng người (hoodie, áo khoác, tay bồng…), nên cả ống tay đi theo xương tay, không còn bị dẹp thành dải mỏng.
  - Điểm thuộc tay chỉ bám xương tay, nên giơ tay góc lớn không bị “bóp dẹp”.
  - Bàn tay đặt sát đùi cũng đi theo tay, không sót lại ở hông.
  - Quai túi, dây đeo dọc người không bị kéo theo tay. Mặt lưới nối hai tay với nhau, nối tay với chân, hoặc có cạnh dài bất thường đều được cắt bỏ (hết các vệt dài).

## Khắc phục hạn chế nhân vật của bạn (bản 2.6.0)

- **Tay giơ cao gần hết cỡ (mặc định 80%, chỉnh 50–100% trong Cài đặt → “🙌 Biên độ giơ tay”):**
  - Công cụ đo đường tâm cánh tay ở từng độ cao và lấy cả ống tay (kể cả tay áo) làm tay, không còn chỉ nửa ngoài.
  - Xương tay đặt đúng giữa ống tay.
  - Chỗ cắt giữa tay và thân được vẽ cả mặt trong, nên không lộ khe sáng.
  - Kết quả: giơ tay không còn kéo thân áo, không còn “màng” hay dải mỏng.
- **Váy, đầm, áo dài không bị xé đôi:**
  - Phần vải phủ kín giữa hai chân (nhận ra nhờ mặt cắt liền khối, khác với hai chân khép sát) bám chủ yếu vào hông, chuyển mềm sang đùi theo độ sâu.
  - Chân bước ra thì gấu váy loe nhẹ chứ không tách đôi.
- **Mũ vừa đầu từng người:** đo bề ngang đầu cả tóc và tâm khối tóc của từng nhân vật, nên mũ không quá to với tóc ngắn, không bị tóc phồng nuốt mất, không lệch.
- **Mặt nhìn gần:** file gốc tô màu trên lưới nên không thể có nét mặt sắc. Khi zoom và khi chiếu lên màn LED, máy quay lùi ra khung nửa người để mặt không bị dí sát.

## Nhân vật của bạn, gắn xương tự động (bản 2.5.0)

- `public/models/charXX.glb` giờ là bộ nhân vật bạn gửi (kiểu người thật, màu tô trên lưới). Mỗi nhân vật đã được gắn bộ xương chuẩn Mixamo nên nhảy được mọi điệu, đội được mũ, đeo được kính và dây chuyền.
- **Công cụ gắn xương:** `tools/autorig/autorig.py` (chạy bằng Blender, xem đầu file). Công cụ:
  - xoay nhân vật về đúng chiều, co chiều cao theo giới tính trong `roster.csv` (nữ 1,62 m, nam 1,72 m);
  - đo cổ, vai, chân, đầu để đặt xương;
  - tách tay khỏi thân rồi tự tính độ bám của lưới vào xương;
  - ghi số đo đầu vào file để kính và mũ đặt đúng chỗ.

## Phong cách trẻ trung: kính, mũ, vàng… (bản 2.4.0)

Khoảng 85% người lên sàn (chỉnh được) được gắn sẵn một phong cách. Phụ kiện 3D gắn vào xương nên đi theo người khi nhảy, áp được cho mọi nhân vật dựng sẵn:

| Phong cách | Phụ kiện |
|---|---|
| 🧢 Hip-hop | mũ lưỡi trai đội ngược, kính đen vuông, dây chuyền vàng to + mặt dây, đồng hồ vàng |
| 💰 Đại gia (dân chơi) | kính phi công gọng vàng, 3 dây chuyền vàng, đồng hồ vàng, lắc tay vàng, khuyên tai kim cương |
| 🪣 Đường phố | mũ bucket, kính tròn, túi đeo chéo, băng cổ tay |
| 🏃 Thể thao | băng đô, kính thể thao ôm mặt, băng cổ tay |
| 🎤 K-pop | mũ nồi / mũ len, kính tròn, khuyên tai, dây chuyền bạc |
| 🎸 Rocker | khăn bandana, kính phi công, dây chuyền bạc, vòng bạc |
| 🤠 Cao bồi | mũ cao bồi, kính phi công, đồng hồ bạc |
| 🎧 DJ | mũ lưỡi trai, tai nghe phát sáng, dây chuyền vàng |
| 👜 Tiểu thư (nữ) | kính mắt mèo, vòng ngọc trai, hoa tai ngọc trai, vòng vàng |
| 💖 Y2K (nữ) | kính trái tim hồng phát sáng, vòng cổ choker, khuyên tròn, vòng bạc |
| ✨ Sang chảnh (nữ) | kính mắt mèo, khuyên tròn vàng, nhiều dây chuyền vàng, đồng hồ, vòng vàng |
| Tối giản | khuyên tai, đồng hồ |

- **Người xem tự đổi:** gõ `phong cách hip hop`, `đại gia`, `đeo vàng`, `kính đen`, `mũ ngược`, `k-pop`, `cao bồi`, `tiểu thư`, `y2k`… hoặc chỉ `phong cách` để đổi ngẫu nhiên.
- Tặng quà **Đổi đồ** cũng đổi luôn phong cách.
- Màu mũ, khăn, túi được chọn ngẫu nhiên, nên hai người cùng phong cách vẫn khác nhau.
- **Tắt / chỉnh:** Cài đặt → “😎 Phong cách phụ kiện”, “% người lên sàn có phong cách”.

## Bỏ YouTube khỏi màn LCD (bản 2.3.0)

- Màn LCD không còn phát YouTube. Còn 3 chế độ: 🎶 sóng nhạc (kèm tranh chủ đề mùa / lễ), 🎞️ video trên máy, 🖼️ ảnh.
- Lời nhắn theo quà, sự kiện LIVE, đếm ngược, chiếu người tặng quà lớn vẫn hiện trên màn như cũ.
- Nếu trước đó màn đang ở chế độ YouTube, game tự chuyển về sóng nhạc.

## Hạn chế bị TikTok bắt captcha (bản 2.2.1)

Game không vượt captcha (đó là cơ chế chống bot của TikTok). Thay vào đó, game kết nối nhẹ nhàng để ít bị bắt hơn:
- Hai lần kết nối luôn cách nhau ít nhất 20 giây, kể cả khi bấm nút liên tục.
- Kênh chưa LIVE: tự thử lại thưa dần (1 → 2 → 4 phút, tối đa 5 phút).
- Bị yêu cầu xác minh / giới hạn lượt: tạm nghỉ 15 phút rồi mới tự thử lại, kèm báo rõ trên trang điều khiển.

**Mẹo để ít gặp captcha:** bật LIVE trước rồi mới bấm Kết nối; không mở 2 máy cùng kết nối một kênh; dùng mạng nhà ổn định, không dùng VPN; nhập key EulerStream (miễn phí có giới hạn) ở mục 1 để kết nối qua máy chủ ký chính thức của thư viện; nếu captcha hiện trên app/web TikTok thì giải bằng tay trên điện thoại một lần.

## MC hô hào sự kiện lớn (bản 2.2.0)

- **Câu hô đa dạng:** mỗi sự kiện có 2–3 câu khác nhau, chọn ngẫu nhiên nên không lặp. Gồm:
  - sàn cháy (theo cấp), đấu đội bắt đầu / có đội thắng / hoà, thách đấu solo, thắng solo;
  - flash mob, giờ vàng bắt đầu và kết thúc, cặp đôi của đêm;
  - bao cả sàn (khách bao, hoặc cả phòng đủ tim), quà lớn;
  - khui sâm panh, vào bàn VIP, lên sân khấu, lên DJ;
  - mở khoá sân khấu, nhạc “drop”;
  - đếm ngược: còn 5 phút, còn 1 phút, mười giây.
- **Giọng hô:** nhanh hơn, cao hơn, to hết cỡ. Câu hô chen lên trước, cắt ngang câu cảm ơn thường đang đọc.
- **MC trên sân khấu:** khi hô, tay trái đấm lên trời theo nhịp, nhún mạnh, nghiêng người ra trước, micro vẫn sát miệng.
- **Khán giả hưởng ứng:** gần nửa sàn nhảy cẫng lên và đèn chớp mỗi lần MC hô sự kiện lớn.
- **Phụ đề lời MC:** bong bóng thoại cạnh MC, vì nhiều người xem TikTok tắt tiếng. Câu hô có viền rực và nảy to. Phụ đề vẫn hiện kể cả khi tắt giọng đọc.
- Tắt riêng được: Cài đặt → “📣 MC hô hào sự kiện lớn”, “💬 Phụ đề lời MC trên màn hình”.

## Sàn theo mùa và ngày lễ (bản 2.1.0)

Có tổng cộng **16 sàn**. Sàn mới thêm:

| Sàn | Trang trí |
|---|---|
| 🌸 Mùa xuân | cây hoa đào, hoa mai, cánh hoa hồng rơi, trời hồng nhạt |
| 🍁 Mùa thu | cây lá đỏ, cam, lá vàng rơi, “Hà Nội mùa thu” |
| ❄️ Mùa đông | cây trơ cành phủ tuyết, tuyết rơi dày, núi tuyết |
| 💘 Valentine 14/2 | trái tim 3D phát sáng lơ lửng, tim hồng bay lên |
| 🌹 Phụ nữ 8/3 · 20/10 | bình hoa hồng, cánh hoa rơi, “Tôn vinh phái đẹp” |
| 🎈 Thiếu nhi 1/6 | chùm bóng bay đủ màu, trời xanh mây trắng |
| 🏮 Trung thu | đèn ông sao 5 cánh, đèn lồng, trăng rằm, “Rước đèn Trung thu” |
| 🇻🇳 Quốc khánh 2/9 | cờ đỏ sao vàng bay phấp phới, đèn lồng, pháo hoa 3D |
| 🎆 Năm mới | pháo hoa 3D nổ liên tục, bóng bay vàng bạc, “Happy New Year” |

Vẫn giữ các sàn cũ: Vũ trường, Bãi biển (mùa hè), Vũ trụ, Tết, Halloween, Giáng sinh.

- **Màn LCD chiếu tranh chủ đề:** khi màn đang ở chế độ sóng nhạc, màn LCD chiếu tranh của sàn kèm tiêu đề, cột sóng nhạc chạy phía dưới. Màu sàn LED, đèn quét và khói cũng đổi theo chủ đề.
- **📅 Tự động theo mùa và ngày lễ** (mặc định cho bản cài mới):
  - Tết: 10 ngày trước đến 7 ngày sau mùng 1, theo âm lịch.
  - Trung thu: 10 ngày trước rằm tháng 8, theo âm lịch.
  - Năm mới 28/12–2/1, Valentine 10–15/2, Phụ nữ 5–9/3 và 17–21/10, Thiếu nhi 29/5–2/6, Quốc khánh 30/8–3/9, Halloween 25/10–1/11, Giáng sinh 15–27/12.
  - Ngày thường: mùa xuân (tháng 2–4), mùa hè (5–8), mùa thu (9–11), mùa đông (12–1).
  - Ngày Tết và Trung thu có sẵn từ 2025 đến 2032.
  - Qua ngày mới, sàn tự đổi.
- **Đổi tay:** Cài đặt → “🎪 Sàn mặc định”, hoặc nút “Đổi sân khấu ngay”. Mục tiêu phòng vẫn mở khoá sàn như cũ, và chọn được cả các sàn mới.

## Giữ khách ở lại (bản 2.0.0)

- **⏳ Đếm ngược sự kiện lớn:** cứ 6 phút (đổi được) có một sự kiện, lần lượt **Flash mob → Giờ vàng → Cặp đôi của đêm**.
  - Góc trái luôn hiện “⏳ 4:12 nữa tới …”.
  - Phút cuối: dải đếm ngược lên màn LCD.
  - 10 giây cuối: số to nảy giữa màn LCD.
  - MC nhắc ở mốc còn 5 phút, còn 1 phút và còn 10 giây.
  - Lịch chạy theo giờ đồng hồ, nên màn OBS và màn xem trước luôn khớp nhau.
- **⭐ Giờ vàng (3 phút):**
  - Quà được nâng hạng hiệu ứng: tính như gấp đôi số xu, ví dụ quà 99 xu ra hiệu ứng của mức 199.
  - Nhiệt sàn tăng gấp đôi.
  - Cả sàn ánh vàng, khói dày hơn, pháo sáng định kỳ, pháo giấy mỗi lần có quà.
- **💞 Cặp đôi của đêm:**
  - Chọn 2 người đang nhảy và ở lại lâu nhất, ưu tiên một nam một nữ; không chọn lại cặp vừa rồi.
  - Hai người nhảy cặp giữa sàn dưới đèn rọi hồng, tim bay quanh. Máy quay zoom vào và tự quay clip.
  - Khán giả gõ **1** (hoặc “chúc mừng”) để thả tim chúc mừng, tăng nhiệt sàn.
- **❤️ Mục tiêu tim → Bao cả sàn:**
  - Thanh tiến độ “❤️ 3.2K/5K tim → 🥂 BAO CẢ SÀN”.
  - Đủ tim thì cả sàn được bao: khói, pháo sáng, pháo giấy, bong bóng, băng rôn trên màn LCD, tự quay clip.
  - Mục tiêu sau cao hơn ×1.5. Tiến độ được giữ khi tải lại màn hình.
- Nút thử ở trang chính: ⭐ Giờ vàng ngay, 💞 Cặp đôi ngay, ❤️ +1000 tim. Mọi thông số chỉnh trong Cài đặt.
- Tất cả là phần thưởng ảo trong game, không có giải thưởng thật.

## Điệu nhảy hot trend (bản 1.9.8)

Thêm 9 điệu mới, tổng cộng **26 điệu**, tất cả nhảy theo nhịp nhạc. Người xem gõ tên điệu hoặc số **1–26** để đổi điệu:

| Số | Điệu | Gõ | Động tác |
|---|---|---|---|
| 14 | 🌙 Moonwalk (đã có) | `moonwalk` | trượt lùi |
| 18 | 🐛 Con sâu | `con sâu`, `worm` | nằm sấp trên sàn, uốn người như sóng, ngực và chân nhấp nhô |
| 19 | 🐎 Gangnam | `gangnam`, `cưỡi ngựa` | bắt chéo cổ tay trước ngực, nhún nhảy kiểu cưỡi ngựa; mỗi 8 phách quăng thòng lọng trên đầu |
| 20 | 🕺 Floss | `floss` | vung hai tay thẳng qua lại trước/sau người, hông lắc ngược chiều |
| 21 | 💪 Dab | `dab` | gục đầu vào khuỷu tay, tay kia duỗi chéo lên, đổi bên mỗi 2 phách |
| 22 | 👟 Shuffle | `shuffle`, `running man` | co gối chạy tại chỗ, tay đánh theo nhịp |
| 23 | 🔥 2 phút hơn | `2 phút hơn` | nhún gối, đấm tay lên trời đổi bên; phách thứ 4 hai tay cuộn tròn trước ngực |
| 24 | 🪓 Băng búa rìu | `búa rìu`, `băng búa rìu` | hai tay chụm giơ búa từ từ lên đầu rồi bổ mạnh xuống đúng phách, khuỵu gối, cúi người |
| 25 | 💃 Macarena | `macarena` | chuỗi 8 phách: duỗi tay, lật tay, ôm vai, ôm gáy, chống hông, nhún nhảy |
| 26 | ✊ Hit the woah | `woah`, `hit the woah` | hai nắm tay giật ngang ngực, nghiêng người đổi bên mỗi phách |

- Nhân vật theo danh sách sẽ có thêm các điệu mới hợp thể loại của mình: K-pop có Gangnam, Floss, Woah; Hip-hop có Dab, Shuffle; Breaking có Con sâu; Freestyle có gần hết…
- Người mới lên sàn ít khi được chọn sẵn điệu Con sâu, để sàn đỡ rối.

## Nhân viên phục vụ (bản 1.9.6)

- **2 nhân viên phục vụ:** một người sơ mi trắng quần tây, một người sơ mi khoác gile (nhân vật char44 và char50).
- **Khay rượu:** mỗi người bưng một khay bạc trên tay phải, có chai sâm panh cổ vàng và 4 ly sâm panh chân cao đủ màu. Khay luôn nằm ngang, tay bưng khay không đánh theo bước chân.
- **Đường đi:** hai người đi vòng quanh sàn theo hai chiều ngược nhau, quay người theo hướng đi.
  - Ghé bàn VIP bên trái, các bàn tròn đứng bên trái, băng qua phía trước, lên các bàn tròn bên phải, ghé bàn VIP bên phải, rồi băng qua giữa sàn quay lại.
  - Đến mỗi bàn, nhân viên dừng 2–3 giây, quay mặt vào bàn và đưa khay ra như đang mời rượu.
- **Tắt:** Cài đặt → “🍾 Nhân viên phục vụ bưng rượu đi quanh sàn”. Nếu tắt bàn ghế quán bar thì nhân viên cũng tự ẩn.
- **Né khách (bản 1.9.7):** nhân viên lách tránh người phía trước và đi chậm lại khi đông; khách đứng quá gần sẽ bước sang bên nhường đường. Khi thử với 100 khách trên sàn, nhân viên luôn cách khách gần nhất từ khoảng 0,7 m trở lên, không đi xuyên qua người.

## MC cầm micro thật, cận cảnh bàn VIP trên màn LCD (bản 1.9.5)

- **MC cầm micro đúng tay:** khung xương có thêm khớp đưa tay ra trước, nên MC đưa tay phải lên trước mặt và cầm micro sát miệng. Micro nằm trong bàn tay của mô hình, đầu micro chĩa vào miệng.
- **Cận cảnh bàn VIP:** khi có khách vào bàn VIP, màn LCD tự chiếu cận cảnh bàn (dĩa trái cây, sâm panh, mực khô, thuốc 555, gạt tàn) cùng khách đang ngồi, nhìn từ trên xuống.
  - Nếu người đó vừa tặng quà lớn và màn đang chiếu họ, khung hình đổi luôn sang bàn VIP, không chiếu hai lần.

## Bàn VIP đầy đủ, MC cầm micro, đi bộ lên/xuống (bản 1.9.4)

- **Bàn VIP:** bàn chữ nhật mặt đá viền vàng trước sofa, bày:
  - dĩa trái cây hai tầng: dưa hấu, nho, cam, thanh long, dâu tây, dứa nguyên trái có ngọn;
  - xô đá cắm chai sâm panh;
  - dĩa mực khô (mực nướng và mực xé) kèm chén tương ớt và mayonnaise;
  - gói thuốc 555 kèm bật lửa;
  - gạt tàn pha lê với điếu thuốc đang cháy, khói bay lên;
  - ly rượu.
- **MC cầm micro** đứng cạnh bàn DJ, mặc vest xanh navy (nhân vật char66). Khi MC giọng nói đọc, MC trên sân khấu mấp máy miệng và khua tay. Tắt được ở Cài đặt → “🎤 MC cầm micro cạnh DJ”.
- **Đi bộ chuyển chỗ:** người tặng “Lên sân khấu” hay “Ngồi bàn VIP” đi bộ tới chỗ và hết giờ đi bộ về sàn, không còn nhảy cóc.

## Hành động khi tặng quà — như quán bar thật (bản 1.9.3)

Đã bỏ các hiệu ứng không có thật (mọc cánh, cưỡi mây, tên lửa, khổng lồ, phân thân, ngai vàng, đăng quang, pháo hoa trong nhà) và thay bằng việc có thật ở quán bar. Mỗi mức xu một hành động, **từ thấp lên cao**:

| Xu | Hành động | Diễn ra |
|---|---|---|
| 1 | 🎥 Lên hình | máy quay zoom vào người tặng |
| 5 | 👏 Cả sàn cổ vũ | mọi người quanh đó quay lại, nhảy lên vỗ tay, thả tim |
| 10 | 👕 Đổi đồ | thay bộ đồ thật (theo danh sách nhân vật), không hoá trang |
| 15 | 🚶 Catwalk | sải bước giữa sàn |
| 20 | 🎈 Thả bong bóng | bong bóng bay khắp màn |
| 30 | 🎊 Bắn pháo giấy | pháo giấy phủ sàn, bạn bè quanh đó nhảy lên |
| 50 | 🌫️ Phun khói CO2 | 4 cột khói trắng ở mép sân khấu |
| 70 | 🔦 Đèn rọi theo | ra giữa sàn, đèn rọi chiếu theo 15 giây |
| 99 | ✨ Pháo sáng | 6 vòi pháo sáng trên sân khấu |
| 150 | 🍾 Khui sâm panh | giơ chai cắm pháo sáng trên đầu, bạn bè nhảy lên, MC mời cạn ly |
| 199 | 💞 Ghép đôi | nhảy cặp với một người trên sàn |
| 299 | 🎤 Lên sân khấu | lên nhảy cạnh bàn DJ 30 giây |
| 399 | 🎧 Lên DJ | đứng vào bàn DJ 30 giây |
| 499 | ⚔️ Thách đấu solo | đấu nhảy, khán giả bình chọn |
| 599 | 🛋️ Ngồi bàn VIP | đi tới ngồi sofa bộ salon: trái cây, mực khô, thuốc 555, sâm panh pháo sáng |
| 799 | 🕺 Flash mob | cả sàn xếp hàng nhảy đồng loạt |
| 999 | 🥂 Bao cả sàn | khói + pháo sáng + pháo giấy + bong bóng, cả sàn nhảy lên, băng rôn trên màn LCD, tự quay clip |

- Danh sách quà ở góc phải màn hình cũng xếp theo xu từ thấp lên cao.
- Quà bạn đã gán riêng cho những hành động còn giữ (Đổi đồ, Catwalk, Ghép đôi, Lên DJ…) vẫn giữ nguyên; mức xu được đặt lại theo bảng trên. Bạn vẫn chỉnh được trong mục **Quà → hành động**.
- Quà lớn vẫn được chiếu lên màn LCD, tự phun khói và bắn pháo sáng như trước.

## Bàn ghế quán bar (bản 1.9.2)

- **2 bộ salon** ở hai góc trước sân khấu. Mỗi bộ gồm sofa nhung dài, ghế bành, bàn nước mặt đá viền vàng, chai rượu, xô đá, ly cocktail và thảm tròn. Bên trái màu đỏ rượu vang, bên phải màu tím.
- **6 bàn tròn đứng** (không ghế) dọc hai bên sàn nhảy. Mỗi bàn có ly cocktail và chai, viền LED dưới mặt bàn và dưới chân hắt sáng xuống sàn, đổi màu theo nhạc.
- Sàn nhảy thu hẹp khoảng 25% để chừa chỗ cho bàn ghế. Người nhảy không đi xuyên qua bàn ghế.
- Tắt được ở Cài đặt → “🛋️ Bàn ghế quán bar”. Khi tắt, sàn nhảy rộng như cũ.
- Đã bỏ bảng tên trên đầu DJ; tên DJ vẫn hiện trên bàn DJ.

## Sự kiện trên màn LCD (bản 1.9.1)

- **Sự kiện LIVE hiện trên màn LCD**, ở mọi chế độ chiếu (sóng nhạc, YouTube, video, ảnh) và cả trong clip:
  - Thẻ có ảnh đại diện ở nửa trên màn: quà tặng (tên quà và hiệu ứng), follow, chia sẻ, lên cấp, quay lại, mở khoá hoá trang, đèn chiếu gọi tên.
  - Băng rôn phủ cả màn cho sự kiện lớn: sàn cháy, đấu đội bắt đầu/kết thúc, thách đấu solo, thắng solo, flash mob, hoàn thành mục tiêu phòng.
  - Sự kiện dồn nhiều thì hiện nhanh hơn và bỏ bớt cái cũ; sự kiện lớn luôn được ưu tiên.
  - Bật/tắt trong Cài đặt (trang chính) hoặc Tuỳ chọn (bảng điều khiển màn hình). Mặc định người vào xem không lên màn (bật được).

## Lời nhắn lên màn hình, đèn theo nhạc, khói & pháo sáng (bản 1.9)

- **Lời nhắn theo quà:** người xem bình luận `mh: lời nhắn` (hoặc `màn hình: …`, `chữ: …`) rồi tặng quà có tổng từ **30💎** (đổi được).
  - Bình luận trước hay tặng quà trước đều được, chỉ cần trong vòng 3 phút.
  - Chữ hiện lên màn LCD bằng chữ neon lớn, kèm ảnh đại diện và tên người tặng, rồi có pháo sáng và MC cảm ơn.
  - Áp dụng ở mọi chế độ chiếu, kể cả khi đang phát YouTube. Clip khoảnh khắc cũng ghi được.
  - Từ tục tự che thành `***`; link và số điện thoại bị chặn như bình luận thường.
  - Có thể bật **duyệt tay**. Trong bảng điều khiển màn hình: chiếu lại, gỡ chữ đang chiếu, chủ phòng tự gõ chữ lên màn.
- **Đèn khớp nhạc:** game phân tích tiếng nhạc thành dải trầm, trung, cao, bắt nhịp trống và hi-hat.
  - Đèn di động, sàn LED, đèn quét, laser, dải neon, bóng đèn sân khấu và cầu disco nháy theo nhịp thật.
  - Nhạc "drop" (đang nhẹ bỗng dồn mạnh) sẽ tự phun khói và bắn pháo sáng.
  - Video trên máy cũng được phân tích. Riêng YouTube không đọc được tiếng: đặt **BPM** hoặc bấm **👆 Gõ nhịp** theo bài trong bảng điều khiển màn hình.
- **Khói & pháo sáng:** khói nền phủ sàn đổi màu theo đèn; máy phun khói CO2 ở mép sân khấu; 6 vòi pháo sáng tia lửa.
  - **Tự kích hoạt** khi: có quà từ 99💎, sàn cháy, nhạc drop.
  - **Gán quà riêng:** hai hành động mới 🌫️ Phun khói và ✨ Pháo sáng trong mục Quà → hành động.
  - **Bấm tay:** nút ở trang chính và bảng điều khiển màn hình.
- **DJ Tiến Khoa:** tên hiện trên bàn DJ (đổi được trong Cài đặt) và in trên áo DJ.
- Ảnh đại diện TikTok giờ được tải qua máy chủ, để vẽ được lên màn LED 3D và clip mà trình duyệt không chặn.

## Màn hình LCD sau lưng DJ + DJ riêng (bản 1.8)

**Bảng điều khiển riêng:** `http://localhost:3300/man-hinh.html` (hoặc nút “📺 Mở bảng điều khiển màn hình” ở trang chính).

- **Chế độ chiếu:** 🎶 Sóng nhạc (mặc định) · ▶️ YouTube · 🎞️ Video trên máy · 🖼️ Ảnh.
- **YouTube:** dán link (video, Shorts, playlist, youtu.be — mỗi dòng một link) rồi bấm **Thêm vào danh sách** hoặc **Thay cả danh sách & phát**.
  - Nút điều khiển: phát / tạm dừng, bài trước / bài sau, phát lại, tua (bấm vào thanh thời gian), âm lượng, tắt tiếng, lặp lại, ngẫu nhiên.
  - Sắp xếp và xoá từng bài trong danh sách. Video không cho nhúng sẽ tự được bỏ qua.
  - Video hiện ngay trên màn 3D. DJ và người nhảy đứng trước vẫn che màn như thật.
- **Video / ảnh trên máy:** tải file MP4/WebM/JPG/PNG lên rồi bấm **Chiếu**. Cách này không cần mạng và được ghi vào clip khoảnh khắc. Với YouTube, clip ghi ảnh bìa của bài đang phát kèm tên bài và thanh thời gian ở đúng vị trí màn hình (trình duyệt không cho ghi hình bên trong khung YouTube).
- **Người tặng quà lớn** (từ số 💎 bạn đặt) vẫn được quay trực tiếp lên màn: video tự tạm dừng, chiếu xong thì phát tiếp. Có thể tắt cả hai việc này trong ⚙️ Tuỳ chọn.
- **Tuỳ chọn khác:** lấp đầy màn hoặc vừa khung, độ sáng, tự giảm nhạc game khi video có tiếng, hiện biển “VŨ TRƯỜNG NEON” đè lên video.
- **Âm thanh:** chỉ một màn hình game phát tiếng video (ưu tiên OBS) để không bị vọng tiếng. OBS tự có tiếng. Muốn mở màn hình game bằng trình duyệt mà không phải bấm vào trang, dùng nút **🖥️ Mở màn hình game (tự có tiếng)**: nút này mở Chrome/Edge với quyền tự phát tiếng. Nếu trình duyệt vẫn chặn tiếng, bảng điều khiển màn hình sẽ báo.
- **Bản quyền nhạc:** phát MV/nhạc có bản quyền từ YouTube lên TikTok LIVE có thể bị TikTok tắt tiếng hoặc cảnh cáo. Nên dùng nhạc/video bạn có quyền phát.

**DJ riêng:**
- `public/models/dj.glb` là DJ 3D dựng theo ảnh bạn gửi. **Gương mặt** (nụ cười, râu, ria) và **hình xăm** được lấy thẳng từ ảnh chụp rồi trải lên người 3D. Kèm áo thun navy in chữ “DJ Tiến Khoa”, quần short túi hộp xanh xám, giày trắng, đồng hồ bạc.
- Muốn đổi DJ, tải lên mục 🧍 Nhân vật một file tên `dj.glb` hoặc `dj.vrm`.
- Dựng lại từ đầu: `tools/makehuman/dj_spec.json` (chạy giống phần 100 nhân vật bên dưới). Đặt ảnh của bạn tên `anh-cua-ban.jpg` ở thư mục chạy lệnh. Toạ độ mắt, miệng và hình xăm trong file là toạ độ trên ảnh gốc; đổi ảnh khác thì phải đo lại.

## 100 nhân vật 3D dựng sẵn (bản 1.7)

Bản 1.7–2.4 có sẵn `public/models/char01.glb` … `char100.glb`: 100 người 3D (MakeHuman, giấy phép CC0) dựng theo `roster.csv` (từ bản 2.5 thay bằng nhân vật của bạn, xem ở trên) — giới tính, tuổi, dáng người, kiểu tóc/màu tóc, quần áo, giày theo mô tả. Mỗi file ~3 MB, **chỉ tải khi có người xem nhận vai đó** nên game vẫn mở nhanh.

- Tự dựng lại / dựng thêm (cần Blender 4.2+ có add-on MPFB 2 và bộ asset MakeHuman):
  1. `python3 tools/makehuman/roster_to_specs.py roster.csv specs.json`
  2. Với từng dòng trong `specs.json`: `S=<thư mục asset> OUT=public/models/charXX.glb SPEC='<json dòng đó>' blender -b -P tools/makehuman/gen_character.py`
- Còn gần đúng: áo dài được thay bằng áo + đầm suông (nữ) / áo dài tay (nam), chưa có khăn đóng; đầm hoa hiện màu trơn. Muốn đẹp hơn cho vai nào, thay file `charXX.glb` bằng mô hình riêng (VRoid, Ready Player Me…).

## Danh sách nhân vật của bạn (bản 1.6)

File `roster.csv` (cột `ID, Name, Gender, Age, Outfit, Dance Style, Personality`) — 100 nhân vật có sẵn. Mỗi người xem lên sàn **nhập vai** một nhân vật chưa có ai nhận:

- **Trang phục dựng theo mô tả tiếng Việt**: crop top, áo thun (in hình), tank top, áo hai dây, hoodie (có mũ trùm, dây rút), sơ mi (trơn / kẻ caro / kẻ sọc / hoạ tiết, có cổ áo), polo, áo len, áo len cổ lọ, blouse (lụa / ren), áo vest nữ, blazer, suit / comple / vest ba mảnh, áo khoác dạ / bomber / denim / thể thao, cà vạt; quần jeans / jogger / cargo / kaki / chinos / tây / âu / short / legging / lụa; váy ngắn, váy xếp ly, váy tennis, váy yếm, chân váy bút chì / dài; đầm ngắn, midi, dài, dạ hội, satin, nhung, ren, hoa; **áo dài** (lụa, nhung, gấm, cách tân — tà xẻ, cổ đứng), **áo bà ba**, **khăn đóng**. Màu đọc theo mô tả (đỏ, xanh navy, hồng pastel, xanh rêu…).
- **Điệu nhảy theo thể loại**: K-pop, Hip-hop, Breaking, Street dance, Popping/Locking, House, Freestyle, Jazz, Modern/Contemporary, Ballroom/Waltz, Tango, Salsa/Cha-cha/Latin, Folk. Thêm 3 điệu mới: Waltz, Tango, Salsa (gõ `waltz`, `tango`, `salsa` hoặc số 15–17).
- **Dáng người theo tuổi**, **nhịp nhảy theo tính cách** (lịch lãm, điềm tĩnh → nhảy nửa nhịp; năng động, tinh nghịch → hay bật nhảy).
- Tên vai hiện khi lên sàn và khi được zoom. Gõ `đổi vai` để đổi nhân vật.
- **Mô hình riêng cho từng nhân vật**: đặt tên file trùng ID (`char01.glb`, `char47.vrm`…) rồi tải lên mục 🧍 Nhân vật — game dùng đúng mô hình đó cho vai đó.
- Thay danh sách: trang điều khiển → 🎭 Danh sách nhân vật → chọn file CSV mới. Tắt nhập vai: bỏ chọn “Nhập vai nhân vật trong danh sách”.

## Trang phục đi bar / hot trend (bản 1.5)

Mặc định 75% người lên sàn mặc đồ đi bar, 25% đồ dạ hội (chỉnh “% mặc đồ dạ hội” trong cài đặt):

- **Nữ**: croptop + quần jean, áo hai dây + váy ngắn (da / jean / satin), áo quây + jean, đầm ôm hai dây, đầm lụa hai dây, áo thun in chữ + chân váy xoè hoặc jean. Áo ôm sát người (cắt từ chính cơ thể mô hình), váy gắn xương bay theo bước nhảy. Chất liệu satin, da bóng, kim sa, jean.
- **Nam**: áo thun in chữ (VIBES, NEON, LIT, SAIGON…) + jean / kaki, áo ba lỗ, áo khoác da, áo khoác jean, áo bomber. Mũ lưỡi trai (xuôi / ngược), mũ len, mũ bucket, mũ phớt; dây chuyền vàng, kính râm, que phát sáng.

## Trang phục dạ hội / ăn chơi (bản 1.4)

Mặc định mỗi người lên sàn mặc một bộ dạ hội ngẫu nhiên (15% hoá trang nhân vật — chỉnh trong cài đặt):

- **Nữ**: váy dạ hội xoè chạm sàn, váy đuôi cá, đầm dạ hội dài, váy cocktail kim sa, jumpsuit kim tuyến. Váy và áo quây được “may” theo số đo cơ thể của mô hình và gắn vào khung xương nên bay theo bước nhảy. Chất liệu satin bóng, kim sa lấp lánh, nhung. Phụ kiện: vương miện nhỏ, vòng ngọc trai / kim cương, khăn lông vũ, que phát sáng.
- **Nam**: tuxedo đen, vest trắng dạ tiệc, vest kim sa vàng, vest kim sa đen, vest nhung (đỏ đô / xanh hoàng gia / xanh lục / tím), vest bạc ánh kim, suit màu “ăn chơi” (hồng, cam, xanh ngọc, xanh chuối). Phụ kiện: nơ, khăn cài túi, hoa hồng cài áo, kính râm, dây chuyền vàng, mũ phớt, que phát sáng.
- Gõ `đổi đồ` (hoặc quà Đổi đồ) để thay bộ khác; `đồ thường` bỏ hoá trang về đồ dạ hội.

## Tính năng thu hút (bản 1.3)

- **🎙 MC giọng nói tiếng Việt**: tự đọc cảm ơn quà, follow, chia sẻ, chào người quay lại, thông báo đấu đội / solo / sàn cháy / mở khoá. Dùng giọng có sẵn trên máy (miễn phí). Chọn đọc ở màn hình game (nghe qua OBS) hoặc ở trang điều khiển. Windows chưa có giọng Việt: Cài đặt → Thời gian & ngôn ngữ → Giọng nói → thêm Tiếng Việt.
- **⚔️ Đấu đội Đỏ – Xanh**: chủ kênh bấm bắt đầu (hoặc tự mở mỗi N phút). Người xem gõ `1`/`đỏ` hoặc `2`/`xanh`; ai chưa chọn thì tự xếp vào đội ít người. Tim, bình luận, quà cộng điểm cho đội. Sàn chia đôi, vòng màu dưới chân, thanh điểm + đồng hồ. Hết giờ: đội thắng ăn mừng + pháo hoa, đội thua nhảy điệu gà.
- **🥊 Solo đấu nhảy**: quà “Thách đấu solo” (mặc định từ 150 xu) — người tặng và một người trên sàn được đưa lên sân khấu nhảy đối mặt; người xem gõ `1` hoặc `2` để bình chọn. Người thắng được vương miện và lên màn LED. Nhiều lượt thách đấu thì xếp hàng.
- **🔥 Sàn cháy 5 cấp**: đang cháy mà đầy nhiệt tiếp thì lên cấp — laser dày hơn, pháo giấy nhiều hơn, cấp 3+ rung màn hình.
- **🔦 Đèn chiếu ngẫu nhiên**: mỗi phút đèn rọi chọn một người vừa bình luận, đưa ra giữa sàn, máy quay zoom, MC gọi tên.
- **🕺 Flash mob**: nút trong trang điều khiển hoặc quà “Flash mob” — cả sàn xếp hàng lối và nhảy cùng một điệu.
- **🎵 Bình chọn nhạc**: khi có nhạc tải lên, màn hình hiện 3 bài; người xem gõ `bài 1`/`bài 2`/`bài 3` chọn bài phát tiếp theo.
- **🎯 Mục tiêu phòng → sân khấu mới**: cả phòng góp tim / xu để lần lượt mở khoá sân khấu Bãi biển, Vũ trụ, Tết, Halloween, Giáng sinh (chỉnh mục tiêu và thứ tự trong trang điều khiển; tiến độ giữ khi tải lại màn hình game).
- **🏅 Cấp độ fan lưu qua các buổi LIVE**: bình luận, tim, quà, follow cho điểm; nhãn `Lv` cạnh tên; người quay lại được chào; lên cấp được thông báo. Hoá trang đặc biệt có thể khoá theo cấp (mặc định Tề Thiên Lv5, Thiên thần Lv8, Hoàng đế Lv10). Bảng fan trung thành trong trang điều khiển. Dữ liệu ở `data/fans.json`.
- **🎬 Tự quay clip khoảnh khắc**: tự ghi video dọc kèm nhạc khi có quà lớn, solo, kết thúc đấu đội, sàn cháy cấp 2+, flash mob, mở khoá sân khấu (hoặc bấm “Quay clip ngay”). Tải về trong trang điều khiển để đăng TikTok. Chỉ màn hình game chính (ưu tiên màn hình OBS) quay. Lưu tối đa 200 clip ở `data/clips/`.

## Tính năng

- **Bình luận là lên sàn**; sàn đầy thì người im lặng lâu nhất nhường chỗ, im lặng quá lâu thì tự rời sàn.
- **14 điệu nhảy**: gõ `nhún`, `lắc`, `xoay`, `robot`, `disco`, `hiphop`, `vỗ tay`, `sóng`, `lộn`, `xoay đầu`, `gà`, `máy bay`, `đá chân`, `moonwalk` hoặc số `1–14`. Ngoài ra: `nhảy`, `đi vòng`, `ghép đôi`, `đổi đồ`.
- **Quà → hành động** (tuỳ chọn quà cho từng hành động hoặc theo số xu): xem bảng “Hành động khi tặng quà” ở bản 1.9.3.
- **Lên màn LED**: ai tặng quà từ mức xu cài đặt (mặc định 99) được chiếu trực tiếp lên màn LED sân khấu — máy quay riêng quay cận nhân vật đang nhảy solo, kèm ảnh đại diện, tên, quà và chữ cảm ơn. Nhiều người tặng thì xếp hàng lần lượt; tặng thêm khi đang chiếu được cộng giờ.
- **Nhiệt sàn**: thả tim / quà / follow / share làm đầy thanh → **SÀN CHÁY**: nhảy nhanh gấp đôi, laser, pháo giấy.
- **Bảng top đại gia**, danh hiệu Quý Tộc / Vua / Hoàng Đế, người tặng nhiều nhất lên đứng bàn DJ.
- **Nhạc**: tải MP3/M4A lên, game tự dò nhịp từng bài; chưa có bài thì máy tự đánh nhạc EDM.
- **Bộ lọc**: link, số điện thoại, Zalo luôn bị chặn; thêm từ cấm tuỳ ý.
- 3 mức hiệu ứng: Mạnh (có bloom phát sáng), Vừa, Nhẹ (máy yếu); công cụ thử không cần LIVE.
- **Trang phục hiện đại** theo phong cách streetwear: hoodie có dây rút + mũ trùm, áo khoác jean, áo bomber, áo thun in hình, áo ba lỗ, áo crop; quần jean, jogger bo gấu, quần túi hộp, quần ống rộng, quần short, váy xếp ly, đầm dạ tiệc; sneaker đế trắng; mũ lưỡi trai (xuôi/ngược), mũ len, mũ bucket; tai nghe đeo cổ, dây chuyền vàng, kính râm.
- Cần máy có card đồ hoạ / WebGL. Trong OBS nhớ bật tăng tốc phần cứng cho Browser Source.

## Nhân vật người thật

Mặc định nhân vật là **người thật 3D**. Mỗi file mô hình là một nhân vật với bộ đồ riêng; người xem lên sàn được chọn ngẫu nhiên trong các nhân vật đang bật (theo nam / nữ). 14 điệu nhảy điều khiển trực tiếp khung xương nên **mọi nhân vật thêm vào đều tự nhảy được**.

Mỗi người lên sàn còn được tạo ngẫu nhiên **thân hình** (gầy, bình thường, vạm vỡ, đầy đặn, dáng cong; cao/thấp; chân dài/ngắn; vai rộng/hẹp; đầu to/nhỏ) và **khuôn mặt** (hàm rộng/hẹp, cằm dài/ngắn/nhô, má đầy/hóp, mũi cao/thấp, trán cao/thấp, mặt rộng/thon), cộng màu da, có/không râu, độ cười, nhép miệng theo nhạc (với mô hình có biểu cảm). Các biến đổi này áp dụng cho mọi nhân vật, kể cả nhân vật bạn tải lên.

**Hoá trang** (24 kiểu, đạo cụ 3D gắn vào xương nên nhảy theo người):

- **Tây Du Ký đủ 4 thầy trò:** Đường Tăng (mũ hoa sen ngũ Phật, cà sa, tràng hạt, tích trượng), Tề Thiên Đại Thánh (vòng kim cô, gậy như ý, đuôi), Trư Bát Giới (mũi + tai heo, dáng đầy đặn, bồ cào chín răng), Sa Tăng (râu, chuỗi hạt lớn, nguyệt nha sạn).
- **Biệt đội Neon 5 màu** (thiết kế riêng): Neon Hoả (đỏ, lửa), Neon Băng (xanh dương, băng), Neon Sét (vàng, sét), Neon Phong (xanh lá, gió), Neon Ảnh (tím, bóng tối). Mỗi người có mặt nạ, áo choàng, biểu tượng phát sáng trên ngực và năng lực xoay trong tay.
- **Truyền thuyết Việt:** Thánh Gióng, Sơn Tinh, Thủy Tinh, Hoàng đế.
- **Khác:** Siêu anh hùng, Chiến binh anime (đều thiết kế riêng), Ninja, Samurai, Hiệp sĩ, Phù thuỷ, Cướp biển, Phi hành gia, Người máy, Ác quỷ, Thiên thần.

Người xem gõ tên để hoá trang: `đường tăng`, `ngộ không`, `bát giới`, `sa tăng`, `tây du` (ngẫu nhiên 1 trong 4 thầy trò), `neon hoả`/`anh hùng đỏ`, `neon băng`, `neon sét`, `neon phong`, `neon ảnh`, `biệt đội` (ngẫu nhiên 1 màu), `thánh gióng`, `ninja`, `phi hành gia`…; `hoá trang` để đổi ngẫu nhiên, `đồ thường` để bỏ. Quà “Đổi đồ” cũng đổi hoá trang. Trang điều khiển chỉnh **% người hoá trang sẵn**. Game không dùng nhân vật có bản quyền (Superman, Người Nhện, Dragon Ball…) để tránh vi phạm và bị TikTok gỡ LIVE.

**Thêm nhân vật / làm mô hình riêng** (trang điều khiển → mục 🧍 Nhân vật → tải file lên, chọn Nam / Nữ; màn hình game tự nạp):

1. **VRoid Studio** (miễn phí, kiểu anime): tạo nhân vật → Export as VRM → tải file `.vrm` lên.
2. **AI tạo mô hình 3D** (Meshy, Tripo, Hyper3D…): mô tả hoặc đưa ảnh nhân vật đứng chữ T → Auto-rig khung người → xuất `.glb`/`.fbx` → tải lên.
3. **Mô hình người chưa có xương**: mixamo.com → Upload Character → Mixamo tự gắn xương → Download FBX Binary, T-pose → tải lên.
4. **Nhân vật Mixamo có sẵn**: mixamo.com → Characters → Download FBX Binary, T-pose.

Game tự nhận khung xương Mixamo, VRoid/VRM, Ready Player Me, Unreal, Blender (Rigify), Character Creator/AccuRig và các công cụ AI phổ biến. File tải lên lưu ở `data/models/`. Nên giữ mỗi file dưới 20 MB.

Hai mô hình có sẵn lấy từ bộ ví dụ của three.js (nhân vật Mixamo “Michelle” và một avatar Ready Player Me). Tài sản này thuộc giấy phép của Adobe Mixamo / Ready Player Me, dùng phát LIVE cá nhân được; nếu bán game cho người khác, hãy thay bằng mô hình bạn có quyền dùng.

Máy yếu: ở trang điều khiển chọn **Kiểu nhân vật → Hoạt hình (nhẹ máy)** hoặc giảm **Số chỗ trên sàn** (khuyên dùng 60–100 người với nhân vật thật).

Dữ liệu (cài đặt, nhạc, hình quà) lưu trong thư mục `data/`.

> Game không kèm nhạc. Nên dùng nhạc miễn phí bản quyền (NCS, StreamBeats, Pixabay…). Chủ kênh tự chịu trách nhiệm về nội dung phát sóng và tuân thủ Tiêu chuẩn cộng đồng của TikTok.
