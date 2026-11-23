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

## 📦 Ngọn Lửa Cuối Cùng: gói phát hành bấm là chạy (bản 2.22.0)

- `node tools/dong-goi.js` → `dist/NgonLuaCuoiCung-<bản>.zip`: kèm sẵn Node.js cho Windows, thư viện, asset, khoá công khai. Khách giải nén → bấm `ChayNgonLua.bat` → trình duyệt tự mở trang nhập key.
- `ChayNgonLua.bat` tự bật giọng VieNeu nếu máy đã cài Python + vieneu, không có thì dùng giọng Windows.
- Máy chủ key: script `web/cai-dat-vps.sh` dựng trên VPS Ubuntu (Node, pm2, nginx, HTTPS, sao lưu hằng ngày). Máy chủ ngừng thì game khách vẫn chạy tới 90 ngày.

## 🔊 Ngọn Lửa Cuối Cùng: âm thanh thu thật, ông Tư không bị che (bản 2.21.0)

- 15 bản ghi âm thật (`public/models/ma/I/`): mỗi cảnh một bộ lớp nền (ếch dế, gió lùa tre, lá xào xạc, nước giếng, nước vỗ, tàu hỏa xa) và tiếng thưa thỉnh thoảng (chó tru, cú, quạ, chuông đình, trống, mõ).
- Tiếng củi nổ thật to nhỏ theo lượng củi; bước chân trên lá / sỏi khi ông Tư dẫn đoàn đổi cảnh; gõ mõ khi có người niệm Phật, chuông đình khi trừ tà. Có tiếng thật thì tắt dế / cú / củi tổng hợp.
- **Ghi công bắt buộc** (CC BY / CC BY-SA): `public/models/ma/I/GHI-CONG.txt`, có dòng ghi công ở cuối trang điều khiển. Giữ file này trong mọi bản gửi khách.
- Bản 2D: người xem ngồi thành vòng cung phía sau và hai bên đống lửa (không ai ngồi phía trước, vì tranh chỉ vẽ người quay mặt ra trước), mặt quay về lửa; chừa chỗ cho ông Tư, không che đống lửa.

## 🔑 Ngọn Lửa Cuối Cùng: key bản quyền + web bán hàng (bản 2.20.0)

- Game cần key mới mở được màn game và trang điều khiển (trang `/kich-hoat.html`); bản không có `license-pubkey.js` không khoá.
- Thư mục `web/`: trang giới thiệu, bảng giá, thanh toán VietQR, trang đơn hàng tự hiện key, trang quản trị, máy chủ cấp key (vé ký Ed25519, giới hạn số máy, mất mạng 30 ngày vẫn chạy). Hướng dẫn: `web/HUONG-DAN-BAN-HANG.md`.

## 👥 Ngọn Lửa Cuối Cùng: người xem 2D vẽ tay (bản 2.19.0)

- 22 dáng người xem vẽ tay trong `public/models/ma/2D/nguoi/`: 9 dáng ngồi, 4 dáng ngồi sợ, 5 dáng đứng, 4 dáng đứng hoảng (bỏ 2 dáng cụ già râu bạc vì dễ nhầm với ông Tư).
- Hàng sau đống lửa đứng xem, các hàng còn lại ngồi; mặt luôn quay về phía đống lửa (tự lật theo hướng mặt trong tranh).
- Bị hù, gõ cửa, ma hiện… thì đổi sang dáng sợ; mỗi người xem giữ một dáng cố định theo tài khoản.
- Tên file: `ngoi-`, `so-`, `dung-`, `sodung-` + số + hướng mặt `-r` (phải) / `-l` (trái) / `-f` (chính diện).

## 🧍 Ngọn Lửa Cuối Cùng: sửa hạn chế bản 2D, chờ dáng người xem vẽ tay (bản 2.18.1)

- Bảng hướng dẫn / vai chính nền trong hơn, nhìn xuyên thấy cảnh phía sau; câu dài tự thu nhỏ chữ, không còn bị cắt "…".
- Cỏ dại, cỏ lau, dương xỉ ở tiền cảnh 2D dùng bản nét 512 px (cùng bộ tranh) thay bản mờ.
- Người bị ma dắt đi ở cảnh ngoài trời bay vào bóng tối mép cảnh (không còn bay vào chỗ tấm gương cũ).
- **Dáng người xem 2D**: bỏ file PNG vào `public/models/ma/2D/nguoi/` là game tự dùng, không cần sửa code.
  - `ngoi-*.png`: dáng ngồi bình thường · `so-*.png` (tuỳ chọn): dáng sợ, dùng lúc bị hù / run.
  - Nền trong suốt, nhân vật ngồi quay 3/4 sang **phải**, chân sát mép dưới ảnh, cao 400–600 px. Game tự lật cho người ngồi bên phải lửa.
  - Mỗi người xem luôn giữ một dáng (chọn theo tài khoản). Chưa có dáng nào thì vẫn dùng hình tròn cũ.

## 🖼 Ngọn Lửa Cuối Cùng: chế độ 2D vẽ tay, 12 cảnh (bản 2.18.0)

- **Chế độ hiển thị** (Cài đặt → 🖼 Chế độ hiển thị): **3D** (nhân vật 3D, máy quay bay) hoặc **2D** (cảnh vẽ tay, nhẹ máy). Máy không chạy được 3D thì tự dùng 2D.
- **2D có đủ 12 cảnh** như 3D, ghép từ tranh vẽ tay (`public/models/ma/2D/`, 95 hình): trời, trăng, mây trôi, núi mờ, hàng cây, lũy tre, mái nhà làng, mặt nước; đồ riêng từng cảnh ở chân trời và một cụm đồ lớn ở góc dưới.
- **Đống lửa 2D**: vết tro, vòng đá, củi cháy (mỗi cảnh một kiểu), đống củi để sẵn; ngọn lửa vẽ tay 4 khung chuyển mượt, **ngả theo gió**, có cơn gió giật.
- **Ông Tư 2D**: đang kể thì cầm tẩu (có khói), nghỉ giữa truyện thì rót trà; có nhãn tên và bong bóng lời thoại. Ghế trùng chỗ ông tự dời ra hàng sau.
- **Hiệu ứng 2D**: khói bay theo gió, đom đóm, bướm đêm quanh lửa, lá rơi, sương bò sát đất, tia trăng (cảnh có cây), ánh đèn bão / đèn lồng / đèn tín hiệu.
- **Vật phẩm sự kiện 2D**: gương bát quái + chuông + bùa (trừ tà), bát nhang (gọi hồn), bóng khói mắt đỏ (ma nhập), nến (cầu cơ), cánh cửa rung (gõ cửa), hũ muối (rắc muối), bó củi bay vào lửa (thêm củi). Chuyển cảnh tối dần rồi sáng lại.
- Không dùng 4 hình trong tranh vì quy tắc CLAUDE.md: búp bê mắt đen chảy nước, khung ảnh mặt ma, bù nhìn mặt đầu lâu, bàn cơ chữ tiếng Anh.
- Công cụ cắt hình: `tools/asset-2d/cat-asset-2d.py` (nền trắng → trong suốt, giữ khói mờ ở viền).

## 👻 Ngọn Lửa Cuối Cùng: hồn ma vẽ tay 2D cho cả hai chế độ (bản 2.17.1)

- Hồn ma (áo dài trắng, áo bà ba trắng, bóng đen), bàn tay ma và 4 đốm ma trơi cắt từ tranh vẽ tay (`public/models/ma/E2D/`), nền trong suốt, giữ nguyên khói mờ ở viền.
- Chế độ 3D: tấm phẳng luôn quay về máy quay (đẹp hơn mô hình 3D cho thứ mờ ảo). Chế độ 2D (nhà cổ): vẽ thẳng hình này thay cho hình ma vẽ bằng code.
- Mỗi lần ma hiện là một dáng; 2D và 3D cùng dáng.
- Thầy pháp (do tặng quà) chỉ còn là danh hiệu trang trí: không còn được miễn ma bắt / ma nhập. Sửa hướng dẫn "Ma hiện hình" cho đúng luật hiện tại.

## 🎨 Ngọn Lửa Cuối Cùng: asset vẽ tay, gió thổi lửa (bản 2.17.0)

- **Asset vẽ tay** (thư mục `public/models/ma/`, nhóm B, C, D, E, G, H) tự nạp; thiếu file nào thì cảnh dùng lại đồ vẽ bằng code.
- **Đống lửa**: củi cháy có vết nứt đỏ, vòng đá, vết tro, đống củi để sẵn; mỗi cảnh một kiểu xếp củi.
- **Mặt đất + phông nền**: 5 loại đất theo từng cảnh; hàng cây 3 lớp, núi mờ, lũy tre, mái nhà làng, trăng, mây trôi.
- **Cỏ cây** rải quanh cảnh (tránh chỗ ngồi): cỏ dại, cỏ lau, dương xỉ, lá khô, sỏi, cành khô.
- **Đồ từng cảnh** (nhóm G): toa tàu, sạp chợ, gốc đa có miếu nhỏ, bù nhìn, tượng đá… đặt ở vòng ngoài, phía máy quay chỉ để đồ thấp.
- **Ông Tư**: nón lá rách, khăn rằn, gậy tre, đuốc rơm; bộ ấm trà + ống điếu đặt cạnh chỗ ngồi.
- **Hồn ma 3D** (áo dài trắng, áo bà ba trắng, bóng đen) và **bàn tay ma 3D** cho "Hù cả phòng"; đốm ma trơi mới.
- **Vật phẩm sự kiện** (nhóm C): bàn cầu cơ + nến, búp bê, bát nhang + khung ảnh, gương bát quái + chuông + bùa + vòng sáng (trừ tà), bóng khói (ma nhập), cánh cửa (gõ cửa), hũ muối + hạt muối, bó củi bay vào lửa.
- **Hiệu ứng** (nhóm H): khói bốc theo gió, tàn lửa, đom đóm, bướm đêm, lá rơi, sương bò sát đất, tia trăng, lớp lửa vẽ tay.
- **Gió**: lửa ngả theo gió (gốc đứng yên, chóp ngả), thỉnh thoảng có cơn giật; gõ cửa / hù dọa có luồng gió lùa; tàn lửa, khói, lá rơi, lúa đều bay theo cùng hướng.

## ✅ Ngọn Lửa Cuối Cùng: tuân thủ nguyên tắc TikTok, treo LIVE được (bản 2.16.0)

- **Bỏ cơ chế trả tiền để thắng / may rủi**: quà không còn làm phiếu bầu nặng hơn; bỏ mọi câu kêu gọi tặng quà để đổi lấy phần thưởng. Không cần tặng quà vẫn chơi đầy đủ.
- **Không nhắm vào người xem cụ thể**: đoán sai người bị ma nhập không bắt ai; gọi hồn bằng quà không bắt ai; "Hù" thành **Hù cả phòng**; cầu cơ không gọi tên ai; búp bê ma thành chuyền tay, ai giữ cuối được **+5 gan dạ**.
- **Nội dung nhẹ hơn**: bớt chi tiết máu me trong truyện; mặt ma không chớp sáng, không phóng to; mặc định mức hù **Nhẹ**, bỏ mức Mạnh.
- **Minh bạch**: nhãn nhỏ "📖 Truyện hư cấu · 🤖 giọng đọc AI" luôn hiện (tắt được ở Cài đặt).
- **Treo LIVE**: ông kể chuyện tự chào người mới vào, đáp bình luận ("chào", "sợ quá", "hay quá"…), cảm ơn quà, có bong bóng lời thoại để người tắt tiếng vẫn đọc được.
- **Chống tương tác giả**: công cụ thử tự khóa khi đang kết nối LIVE thật. Bình luận có từ tục được che `***` trước khi lên màn hình.
- **Số ghế**: nhỏ, mờ vừa đủ thấy; hoặc chọn **Ẩn** (chỉ hiện khi sự kiện cần gõ số).
- Quy tắc cho các game sau: xem `CLAUDE.md`.

## 🚶 Ngọn Lửa Cuối Cùng: tránh nhau khi đi, đêm rõ hơn, nhép miệng theo giọng (bản 2.15.0)

- **Đoàn người tránh nhau:**
  - Mỗi người tự bước tới chỗ của mình với tốc độ giới hạn (tụt lại xa thì đi nhanh hơn).
  - Đứng quá gần người khác (dưới khoảng nửa mét) thì tự giãn ra. Người đang ngồi hay đứng chờ là vật cản, người đi phải tránh.
  - Ai cũng đi vòng qua đống lửa và Ông Tư.
  - Hướng mặt theo hướng đi, bước chân theo quãng đường thật. Đứng chờ thì run tại chỗ.
  - Lúc tách đoàn, từng người đi tới chỗ ngồi mới rồi mới ngồi xuống.
  - Đã thử với 30 người: khoảng cách gần nhất giữa hai người lúc đi là 0,43 m, không còn ai đi xuyên qua ai.
- **Đoạn đi đêm thấy rõ hơn:** đuốc sáng gấp đôi, sương nhẹ hơn, ánh trăng không tắt hẳn. Vẫn thấy đoàn người co ro và cảnh vật quanh ánh đuốc.
- **Ông Tư nhép miệng theo giọng thật:** khi dùng VieNeu, miệng mở to nhỏ theo âm lượng giọng đang phát. Giọng trình duyệt thì vẫn mấp máy theo nhịp.
- **Gậy chống xuống đất:** gậy trúc đặt theo tay trái mỗi khung, đầu gậy chống thẳng xuống đất cạnh chân. Lúc cầm đuốc đi thì cất gậy.
- **Tên đỡ chồng chéo:** tên bị đè lên nhau thì ẩn bớt. Ưu tiên giữ tên người đang được gọi trong truyện, thầy pháp, người vừa bình luận, người bị tố, rồi tới người ngồi gần máy quay. Số ghế vẫn luôn hiện để mọi người gõ được.
- **Tự giảm độ phân giải 3D khi máy chậm:**
  - Dưới khoảng 26 khung hình/giây trong 4 giây, độ phân giải giảm từng nấc 15%, thấp nhất 50%.
  - Máy khoẻ lại (trên 50 khung hình/giây trong 12 giây) thì tăng dần về 100%.
  - Trang điều khiển hiện mức đang dùng, ví dụ "35 · 3D 70%".

## 🔦 Ngọn Lửa Cuối Cùng: ông kể chuyện cầm đuốc dẫn đoàn sang cảnh mới, đồ vật tự nhiên (bản 2.14.0)

- **Chuyển cảnh có người dẫn đường** (khoảng 16 giây):
  1. Đống lửa tàn dần. Ông kể chuyện đứng dậy, thắp đuốc.
  2. Ông đi trước dẫn đoàn. Người xem rời chỗ ngồi, co ro ôm tay, run rẩy, ngó nghiêng, bước theo sau thành từng hàng.
  3. Máy quay lùi trước mặt đoàn người. Sương đặc dần thành màn đêm tối mịt, chỉ còn ánh đuốc lập loè.
  4. Sang cảnh mới, máy quay bám sau lưng đoàn.
  5. Ông kể chuyện ngồi xổm, đưa đuốc châm vào đống củi, lửa bùng lên.
  6. Mọi người tản về chỗ ngồi mới, máy quay bay về góc nhìn của cảnh đó.

  Trong lúc đi, truyện tạm dừng, củi không cạn, âm khí không tăng và không mở sự kiện; tên người xem hiện nhỏ trên đầu. Khi để "tự đổi cảnh", mỗi lần sang truyện có cảnh riêng thì đoàn người lại được dẫn đi; tới nơi mới bắt đầu kể. Đổi cảnh bằng tay ở trang điều khiển cũng có đoạn dẫn đường này.
- **Đồ vật tự nhiên hơn, không đều tăm tắp như gỗ công nghiệp:**
  - Thân cây đổ cong queo, thon dần về ngọn. Một đầu gãy lởm chởm có dằm gỗ, đầu kia bật cả gốc rễ kèm cục đất hoặc gãy ngang. Có cành gãy, cành con, vỏ cây nứt và rêu. Chỗ ngồi theo đúng độ cao thật của thân cây.
  - Thân chuối đổ có thớ, bẹ khô bám; bó tre cây dài cây ngắn, có đốt, buộc dây; rễ đa ngoằn ngoèo.
  - Đá méo mó có rêu xanh trên mặt; gốc cây gãy mặt trên nham nhở, rễ bò quanh; đống rơm bù xù có cọng rơm vương.
  - Ghế băng ván cong vênh, chân xiêu; bậc đá ghép từng phiến lệch nhau.
  - Đất xa mấp mô, lá khô rải khắp mặt đất.

## 🎙 Ngọn Lửa Cuối Cùng: cảnh 3D hoàn toàn, mỗi cảnh một bố cục, có người kể chuyện (bản 2.13.0)

- **Bỏ tấm gương và tấm chiếu.** Người xem ngồi trên đồ vật có sẵn trong cảnh, mỗi cảnh một cách bày:

  | Cảnh | Ngồi ở đâu |
  |---|---|
  | Rừng tre | bó tre và khúc gỗ đổ xếp hình chữ U, tảng đá phía trước |
  | Bụi chuối sau nhà | thân chuối đổ xếp hai vòng |
  | Giữa đồng lúa | bó rơm hai vòng, hàng sau ngồi trên bờ ruộng |
  | Giếng cổ đầu làng | bệ đá quanh giếng, ghế đá vòng bên phải |
  | Gốc đa nghìn năm | rễ cây đa toả ra phía sau, tảng đá phía trước |
  | Nghĩa địa làng | bệ mộ xếp thành hàng, nấm mộ |
  | Miếu hoang ven rừng | 4 bậc đá trước miếu (hàng sau cao hơn, ai cũng nhìn ra lửa), ghế hai bên |
  | Bến đò đêm | ngồi dọc cầu tàu ven sông, khúc gỗ hai bên, có đò bồng bềnh |
  | Chợ ma nửa đêm | ghế chợ xếp hai lớp chữ U |
  | Đường ray bỏ hoang | ngồi trên đường ray và chồng tà vẹt |
  | Sân nhà hoang | bậc thềm nhà, ghế gãy rải rác |
  | Sân đình làng | chiếu nhỏ xếp hàng ngay ngắn hướng về người kể chuyện |

  - Hết chỗ có đồ vật thì người đến sau ngồi bệt dưới đất ở vòng ngoài.
  - Có hai tư thế: ngồi trên gỗ/ghế/bậc thì thả chân xuống, ngồi đất thì bó gối.
  - Manh mối "Ai bị ma nhập?" nói theo chỗ ngồi, ví dụ: "Kẻ đó đang ngồi trên bậc đá trước miếu thứ 3 bên trái".
- **Máy quay tự căn theo số người:** ít người thì quay gần thấy rõ mặt, đông người thì lùi ra từ từ trong 3 giây. Mỗi cảnh có góc máy riêng (thấp, cao, chếch nghiêng).
- **Đống lửa 3D thật:** đá kê, củi chụm, lưỡi lửa vẽ bằng shader, than hồng, tàn lửa bay. Người ngồi phía trước lửa che được lửa đúng chiều sâu.
- **Người kể chuyện 3D (mặc định tên "Ông Tư"):**
  - Đội nón lá, chống gậy, ngồi cạnh đống lửa quay về phía người xem.
  - Khi đang kể: nhép miệng, vung tay, nhìn quanh người nghe. Tới đoạn hù: giơ hai tay. Lúc nghỉ: nhìn vào đống lửa.
  - Đổi tên ở Cài đặt → "Tên người kể chuyện".
- **Người bị ma bắt** thành bóng ma xanh mờ lơ lửng ở mép tối của cảnh, kèm chữ `gõ "cứu 12"`. Bình luận của họ hiện thành lời thì thầm cạnh bóng ma.
- Cảnh *Nhà cổ 2D* (cho máy yếu) vẫn giữ gương và bố cục cũ.

## 🔥 Ngọn Lửa Cuối Cùng: đống lửa củi và 12 cảnh 3D (bản 2.12.0)

- **Đèn dầu được thay bằng đống lửa củi:**
  - Vòng đá kê, củi xếp chéo, đầu củi cháy đỏ.
  - Lửa nhiều lưỡi, cao thấp theo lượng củi. Tàn lửa bay lên, có tiếng lửa lách tách.
  - Ánh lửa thật trong cảnh 3D chập chờn làm bóng người rung theo. Hết củi thì chỉ còn than hồng.
  - Thanh **🔥 CỦI LỬA** thay cho "Dầu đèn". Quà 1 xu đổi thành **🪵 Thêm củi**: một khúc củi bay từ chỗ người tặng vào đống lửa, lửa bùng lên. Người theo dõi kênh cũng ném được một khúc củi.
  - Hết củi thì **LỬA TẮT** và ma bắt người.
  - Tên hiện trên màn đổi thành **NGỌN LỬA CUỐI CÙNG** (đổi được ở Cài đặt → "Tên phòng").
- **12 cảnh 3D** (thêm 10). Mỗi cảnh chỉ được dựng khi dùng tới lần đầu:

  | Cảnh | Có gì |
  |---|---|
  | Giữa đồng lúa | lúa đung đưa, bù nhìn quay đầu, mả đất, đống rơm |
  | Bụi chuối sau nhà | chuối lá rách, giếng cạn, chòi hoang cửa sổ loé đỏ |
  | Giếng cổ đầu làng | giếng đá có mái che, dây gàu tự đung đưa, cây hoa sứ, lu nước |
  | Gốc đa nghìn năm | thân đa khổng lồ, rễ phụ buông rủ, vải đỏ quấn gốc, miếu nhỏ, quần áo giấy treo bay |
  | Nghĩa địa làng | hàng bia mộ, mả đất, cây hoa sứ, lăng mộ |
  | Miếu hoang ven rừng | miếu mái cong, bàn thờ đỏ rực chập chờn, lối đá |
  | Bến đò đêm | mặt sông, vệt trăng, cầu tàu, đò có đèn lồng bồng bềnh, lau sậy |
  | Rừng tre | tre cao vút lá đung đưa |
  | Chợ ma nửa đêm | sạp chợ bỏ trống, đèn lồng đỏ chập chờn, tiền vàng mã rơi |
  | Đường ray bỏ hoang | đường ray, đèn tín hiệu đỏ nhấp nháy, toa tàu nghiêng |
  | Sân nhà hoang | nhà đổ nát cửa mở hé, xích đu tự đung đưa, cửa sổ thoáng có ánh sáng |
  | Sân đình làng | đình mái cong cột đỏ, trống đình, đèn đá, cây đa |

- **Chế độ "tự đổi theo chuyện"** chọn cảnh hợp với truyện. Ví dụ: ma da và chuyến đò ra *bến đò*, cây đa ra *gốc đa*, búp bê dưới giếng ra *giếng cổ*, tàu đêm ra *đường ray*, quán cháo và đám ma ra *nghĩa địa*. Truyện chưa có cảnh riêng thì đổi lần lượt qua các cảnh.
- **Giữ cố định một cảnh:** trang điều khiển → Cài đặt → **🌾 Cảnh 3D**.

## 🌾 Ngọn Đèn Cuối Cùng: cảnh 3D ngoài đồng và bụi chuối (bản 2.11.0)

- **Nhân vật 3D:** mỗi người xem là một nhân vật 3D ngồi bó gối quanh ngọn đèn dầu.
  - Dùng chung bộ mô hình người với game sàn nhảy (`public/models`, mục 🧍 Nhân vật). Nếu có bộ 98 nhân vật riêng, mỗi người xem được gán một vai cố định.
  - Quần áo được đổi màu ngẫu nhiên. Que phát sáng (đồ đi bar) bị bỏ đi.
  - Người xem ngồi co lại khi sợ hoặc khi âm khí cao, và giật nảy khi bị hù.
  - Ảnh đại diện TikTok hiện cạnh tên, số ghế hiện trên đầu. Thầy pháp đội mũ vàng; kẻ bị nhập loé mắt đỏ.
- **Hai cảnh 3D ban đêm**, có sương mù, ánh trăng và ánh đèn dầu thật (đèn cạn dầu thì vòng sáng tắt dần):
  - **Giữa đồng lúa:** lúa đung đưa theo gió, bù nhìn đội nón lá (âm khí cao thì nó quay đầu nhìn, mắt đỏ), mả đất cắm nhang bên bờ ruộng, đống rơm, cây chết, bụi chuối xa.
  - **Bụi chuối sau nhà:** chuối mọc dày quanh vòng với lá rách đung đưa, giếng cạn, hàng rào tre, căn chòi tối (âm khí cao thì cửa sổ loé đỏ), một nấm mộ.
  - **Chung cả hai cảnh:** ma trơi xanh lượn quanh (âm khí càng cao càng nhiều), đom đóm (tắt dần khi âm khí cao), ánh ma lạnh hắt từ sau lưng. Tấm gương cõi âm được dựng trên cọc gỗ.
- **Chọn cảnh:** trang điều khiển → Cài đặt → **🌾 Cảnh 3D**.
  - *Tự đổi mỗi chuyện* (mặc định): luân phiên đồng lúa và bụi chuối.
  - Có thể giữ cố định một cảnh.
  - *Nhà cổ 2D* dành cho máy yếu.
- **Máy cần card đồ hoạ:** trang điều khiển hiện số khung hình/giây. Dưới khoảng 25 thì chọn cảnh *Nhà cổ 2D*.
- Mã cảnh 3D: `public/ma3d.js`. Bảng, chữ, hồn ma, mặt ma vẫn vẽ 2D phía trên nên mọi sự kiện cũ giữ nguyên.

## 🕯 Ngọn Đèn Cuối Cùng: giọng ma VieNeu-TTS, 30 truyện, hướng dẫn từng sự kiện (bản 2.10.0)

- **Giọng kể VieNeu-TTS** ([github.com/pnnbao97/VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS)), chạy offline trên máy, dùng CPU được:
  1. Cài Python 3.10 trở lên (Windows: nhớ tick "Add python.exe to PATH").
  2. Bấm đúp **`ChayGiongMa.bat`** (macOS/Linux: `./chay-giong-ma.sh`). Lần đầu file sẽ tự chạy `pip install vieneu` và tải mô hình. Giữ cửa sổ đó mở khi LIVE.
  3. Trang điều khiển game ma → mục **🎙 Giọng kể VieNeu-TTS**: chọn giọng (nên chọn giọng nam trầm), chọn **độ rợn**, rồi bấm **Nghe thử giọng ma**.
  - Máy yếu: `ChayGiongMa.bat --nano`. CPU đời mới có VNNI: thêm `--int8` để đọc nhanh hơn.
  - Độ rợn: *giọng gốc / hơi rợn / rợn / rất rợn*. Màn game hạ giọng và đọc chậm lại, thêm vang như nhà hoang, tiếng vọng, và một lớp thì thầm lệch nhịp phía sau. Tiếng gió nền nhỏ lại khi đang kể.
  - Câu kế tiếp được đọc sẵn từ trước nên lời kể ít bị trễ. Truyện chờ đọc xong mới sang câu mới.
  - Nếu chưa chạy cầu nối, game tự chuyển sang giọng trình duyệt (đã hạ cao độ cho rợn hơn) và thử lại VieNeu sau 60 giây.
  - Cầu nối: `tools/vieneu/giong-ma.py` (cổng 3399). Máy chủ game gọi qua `/api/ma-tts` và lưu đệm các câu đã đọc.
- **Hướng dẫn chơi trên màn hình:**
  - Bảng *Ai bị ma nhập?*, *Búp bê ma* và *Cầu cơ* có mục **CÁCH CHƠI** đánh số từng bước.
  - Thẻ hướng dẫn tự hiện khi: đèn tắt, ma hiện hình, có người bị kéo vào gương (cách gõ "cứu 12"), trừ tà, ma đứng sau lưng một người.
  - Thẻ **CÁCH CHƠI** chung hiện lại khoảng mỗi 100 giây.
- **30 truyện ma** (thêm 23 truyện): Khúc Sông Ma Da, Cái Đầu Bay Lúc Nửa Đêm, Cuốc Xe Ôm Lúc Hai Giờ, Cuộc Gọi Từ Số Máy Của Bà, Chải Tóc Trước Gương Lúc Nửa Đêm, Giường Số Chín Phòng 307, Ca Trực Nhà Xác, Toa Số Chín Chuyến Tàu Đêm, Ngôi Miếu Hoang Bên Đường Rừng, Bộ Áo Cưới Ở Chợ Đồ Cũ, Tấm Ảnh Thừa Một Người, Quán Cháo Đầu Nghĩa Địa, Tiếng Đàn Trong Phòng Nhạc, Bậc Thang Thứ Mười Ba, Biệt Thự Trên Đồi Thông, Con Mèo Đen Nhảy Qua Linh Cữu, Trò Gọi Hồn Bằng Đũa, Ông Lão Bán Vé Số, Đám Ma Đi Ngược Chiều, Ma Xó Nhà Từ Đường, Lạc Trong Rừng Tràm, Chuyến Đò Cuối Ngày, Cây Đa Đầu Làng.
  - Mỗi truyện có 2 lần bình chọn và 4 kết thúc.
  - Một số kết thúc tự mở sự kiện trực tiếp: *Tấm Ảnh Thừa Một Người* và *Con Mèo Đen* mở trò ai bị ma nhập; *Trò Gọi Hồn Bằng Đũa* mở bàn cầu cơ.
  - Truyện nằm trong `public/ma-stories.js`, `ma-stories-2.js`, `ma-stories-3.js`.

## 🕯 Game kể chuyện ma "Ngọn Đèn Cuối Cùng" (bản 2.9.0)

Game LIVE thứ hai, chạy chung máy chủ và chung kết nối TikTok với sàn nhảy.

- **Trang điều khiển:** `http://localhost:3300/ma-dieu-khien.html`
- **Màn hình cho OBS / LIVE Studio:** `http://localhost:3300/ma.html?obs=1` (1080 × 1920). Chỉ mở **một** màn cho LIVE.

Người xem ngồi quanh một ngọn đèn dầu trong nhà cổ. Bình luận là được một **ghế có số**. Máy kể truyện ma từng câu, có phụ đề và giọng đọc.

**Điểm khác các game kể chuyện ma khác:**

| Tính năng | Cách chơi |
|---|---|
| 🎭 **Người xem làm nhân vật** | Tên người vừa bình luận được ghép vào truyện (vai A/B/C). Người tặng nhiều nhất làm **thầy pháp** trong truyện. Khi tên được nhắc, ghế của người đó sáng lên. |
| 🗳 **Truyện rẽ nhánh** | Gõ **1 / 2** để chọn hướng đi; mỗi truyện có 4 kết thúc. Gõ **1 / 2 / 3** để chọn chuyện tiếp theo. Đã chọn mà tặng quà thì phiếu nặng thêm (1 xu = 1 phiếu). |
| 🪔 **Dầu đèn ↔ bóng tối** | Thả tim để thêm dầu. Dầu ít thì vòng sáng thu hẹp, ghế ngoài chìm vào bóng tối, mắt đỏ hiện ra. Hết dầu thì **ĐÈN TẮT**: ma bắt người. |
| 👻 **Âm khí** | Âm khí tăng dần. Khi cao, hồn ma **đứng sau lưng** một người xem (hiện chữ "⚠ SAU LƯNG BẠN"). Gõ **nam mô / a di đà phật** để xua. Âm khí đầy thì **MA HIỆN HÌNH**. |
| 🪞 **Cõi âm trong gương** | Người bị bắt nằm trong tấm gương. Bình luận của họ hiện thành **lời thì thầm**. Đủ 3 người gõ **cứu 12** thì ghế 12 được kéo ra. |
| 👁 **Ai bị ma nhập?** | Máy bí mật chọn một người. Gợi ý hiện dần: vòng ghế, ghế chẵn/lẻ, mắt loé đỏ, chữ cái đầu của tên. Cả phòng gõ **số ghế** để tố. Tố đúng được điểm; tố nhầm thì người bị oan bị kéo đi. |
| 🪆 **Búp bê ma chuyền tay** | Người đang cầm búp bê gõ bất kỳ để chuyền đi (gõ số ghế để chọn người nhận). Nhạc hộp dừng lúc nào không biết; ai đang cầm thì bị bắt. |
| 🔮 **Cầu cơ** | Gõ `hỏi: …`. Con trỏ chạy trên bàn cơ đánh vần câu trả lời. Hỏi "ai" thì nó đánh vần **tên một người trong phòng**. |
| 🏆 **Bảng Gan Dạ** | Điểm cho người **ở lại**: ngồi lâu, nghe trọn chuyện, niệm Phật, tố đúng, cứu người. Lưu qua các buổi LIVE. Người đứng đầu có huy hiệu 👑 khi vào phòng. |

Một số kết truyện tự mở sự kiện: truyện "Búp Bê Dưới Đáy Giếng" có thể kết bằng trò búp bê ma, truyện "Người Thứ Mười Ba" có thể kết bằng trò ai bị ma nhập.

**Quà → hành động** (đổi mức xu hoặc gán đúng món quà ở trang điều khiển): 🕯 Thắp nhang 1 · 🧂 Rắc muối 5 · 🚪 Gõ cửa 10 · 🫣 Hù một người 30 (gõ `hù 12` trước để chọn ghế) · 🔮 Cầu cơ 99 · 🪆 Búp bê ma 199 · 👁 Ai bị nhập? 299 · 👻 Gọi hồn 499 · ☯️ Trừ tà 999 (cắt ngang mọi sự kiện, cứu hết người trong gương, người tặng làm thầy pháp).

**Mức hù:** Cài đặt → "Mức hù": mạnh / vừa / nhẹ / tắt. Không dùng chớp sáng liên tục.

**Giọng đọc:** màn OBS thường không có giọng tiếng Việt, nên trang điều khiển sẽ đọc thay. Giữ trang điều khiển mở bằng Edge và cho OBS thu âm thanh máy tính. Âm thanh hiệu ứng (gió, dế, tim đập, gõ cửa, chuông chùa, hộp nhạc…) được máy tự tạo, không cần file.

**Viết thêm truyện:** sửa `public/ma-stories.js`. Đầu file có hướng dẫn: `{A}` `{B}` `{C}` `{THAY}` là tên người xem, `@knock|…` là hiệu ứng, `choice` là bình chọn, `take: 'A'` là kéo người đó vào gương khi kết.

## Chọn giọng MC (bản 2.8.3)

- Mục **Sự kiện LIVE** có ô **🎙 Giọng MC** liệt kê mọi giọng tiếng Việt của trình duyệt, nút **▶ Nghe thử**. Giọng có ⭐ là giọng tự nhiên (Natural).
- Mặc định ưu tiên **giọng nam Microsoft NamMinh Online** cho đúng chất MC; muốn giọng nữ chọn **HoaiMy**. Hai giọng này chỉ có khi mở trang điều khiển bằng **Microsoft Edge** (cần mạng).
- Nếu màn game (OBS / Chrome) không có giọng đã chọn, trang điều khiển mở bằng Edge sẽ đọc thay — giữ trang đó mở và cho OBS/LIVE Studio thu âm thanh máy tính.

## Sửa lỗi “requires a Business plan” khi kết nối (bản 2.8.2)

- Game không còn tải danh sách quà mở rộng khi kết nối. Bước này phải ký qua EulerStream **gói Business (trả phí)**, nên với key miễn phí hoặc không có key sẽ báo lỗi `fetchWebcastSignatureFromEulerRoute … requires a Business plan`. Tên, ảnh, giá xu của quà vẫn lấy được từ mỗi lượt tặng quà.
- Nếu EulerStream vẫn báo cần gói trả phí, game tự thử lại một lần **không dùng key**.

## Giọng MC tiếng Việt tự nhiên (bản 2.8.1)

- **Bỏ kiểu “giọng hô” kéo cao giọng, đọc nhanh** của bản 2.2. MC đọc giọng bình thường như các bản trước; câu hô sự kiện lớn chỉ to hơn và được đọc trước.
- **Tự chọn giọng Việt hay nhất trên máy:** Microsoft HoaiMy / NamMinh Online (Edge) → Google Tiếng Việt (Chrome) → giọng Việt khác.
- **Không bao giờ đọc tiếng Việt bằng giọng tây nữa.** Nếu màn game (OBS / LIVE Studio) không có giọng Việt, câu nói tự chuyển sang **trang điều khiển** mở bằng Chrome/Edge để đọc. Giữ trang điều khiển mở trên máy LIVE. Dòng “Giọng MC” ở mục sự kiện cho biết giọng đang dùng.
- Máy không có giọng Việt nào: Windows → Cài đặt → Thời gian & ngôn ngữ → Giọng nói → thêm Tiếng Việt, hoặc mở trang điều khiển bằng Edge.

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
