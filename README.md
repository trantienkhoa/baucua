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

## Màn hình LCD sau lưng DJ + DJ riêng (bản 1.8)

**Bảng điều khiển riêng:** `http://localhost:3300/man-hinh.html` (hoặc nút “📺 Mở bảng điều khiển màn hình” ở trang chính).

- **Chế độ chiếu:** 🎶 Sóng nhạc (mặc định) · ▶️ YouTube · 🎞️ Video trên máy · 🖼️ Ảnh.
- **YouTube:** dán link (video, Shorts, playlist, youtu.be — mỗi dòng một link) rồi bấm **Thêm vào danh sách** hoặc **Thay cả danh sách & phát**.
  - Nút điều khiển: phát / tạm dừng, bài trước / bài sau, phát lại, tua (bấm vào thanh thời gian), âm lượng, tắt tiếng, lặp lại, ngẫu nhiên.
  - Sắp xếp và xoá từng bài trong danh sách. Video không cho nhúng sẽ tự được bỏ qua.
  - Video hiện ngay trên màn 3D. DJ và người nhảy đứng trước vẫn che màn như thật.
- **Video / ảnh trên máy:** tải file MP4/WebM/JPG/PNG lên rồi bấm **Chiếu**. Cách này không cần mạng và được ghi vào clip khoảnh khắc. Clip không ghi được hình YouTube: phần màn hình sẽ ra màu đen.
- **Người tặng quà lớn** (từ số 💎 bạn đặt) vẫn được quay trực tiếp lên màn: video tự tạm dừng, chiếu xong thì phát tiếp. Có thể tắt cả hai việc này trong ⚙️ Tuỳ chọn.
- **Tuỳ chọn khác:** lấp đầy màn hoặc vừa khung, độ sáng, tự giảm nhạc game khi video có tiếng, hiện biển “VŨ TRƯỜNG NEON” đè lên video.
- **Âm thanh:** chỉ một màn hình game phát tiếng video (ưu tiên OBS) để không bị vọng tiếng. Mở màn hình game bằng trình duyệt thì bấm vào màn hình một lần để bật tiếng; OBS không cần.
- **Bản quyền nhạc:** phát MV/nhạc có bản quyền từ YouTube lên TikTok LIVE có thể bị TikTok tắt tiếng hoặc cảnh cáo. Nên dùng nhạc/video bạn có quyền phát.

**DJ riêng:**
- `public/models/dj.glb` là DJ 3D dựng theo ảnh bạn gửi: nam, râu quai nón + ria mép, áo thun navy in chữ “DJ Neon”, quần short túi hộp xanh xám, giày trắng, hình xăm kín cẳng tay trái và đồng hồ bạc.
- Muốn đổi DJ, tải lên mục 🧍 Nhân vật một file tên `dj.glb` hoặc `dj.vrm`.
- Dựng lại từ đầu: `tools/makehuman/dj_spec.json` (chạy giống phần 100 nhân vật bên dưới).

## 100 nhân vật 3D dựng sẵn (bản 1.7)

Bản phát hành có sẵn `public/models/char01.glb` … `char100.glb`: 100 người 3D (MakeHuman, giấy phép CC0) dựng theo `roster.csv` — giới tính, tuổi, dáng người, kiểu tóc/màu tóc, quần áo, giày theo mô tả. Mỗi file ~3 MB, **chỉ tải khi có người xem nhận vai đó** nên game vẫn mở nhanh.

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
- **Quà → hành động** (tuỳ chọn quà cho từng hành động hoặc theo số xu): Camera, Đổi đồ, Catwalk, Nhảy cao, Pháo hoa, Mưa bong bóng, Khổng lồ, Ghép đôi, Phân thân, Mọc cánh, Lên DJ, Tên lửa, Cưỡi mây, Ngai vàng, Đăng quang. Máy quay zoom cận người tặng, có hàng chờ zoom.
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
