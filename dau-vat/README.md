# 🤼 Đại Chiến Đô Vật · MEGA SLAM — game TikTok LIVE đấu vật 3D

Người xem **bình luận để ghi danh** → **32 đô vật** đánh **battle royal** (ném qua dây trên cùng để loại) → **16 người** vào **vòng 16**, **8 cặp đánh cùng lúc** trên một võ đài → **tứ kết**, **bán kết**, **chung kết** đánh **từng cặp** → **đai vô địch**.

- **Bảng nhánh đấu trên màn LED**: người thua bị gạch **X đỏ** rồi **bay khỏi bảng**, người thắng trượt sang cột vòng sau. Hết vòng thì cả bảng trượt sang vòng mới.
- **Giữa các vòng**: một cô gái cầm biển ("VÒNG 16", "TỨ KẾT", "BÁN KẾT", "CHUNG KẾT") đi quanh mép võ đài.
- **Đếm 1-2-3 như thật**: trọng tài chạy tới, nằm sấp cạnh vai người bị đè, giơ tay cao rồi đập xuống sàn và hô "Một! Hai! Ba!". Vòng 16 có **3 trọng tài**.

- Nhân vật 3D có khung xương. Mỗi người có **3 chiêu**: 2 chiêu tủ và 1 chiêu kết liễu.
- Đô vật **ra sân từ sau cánh gà**: có nhạc riêng, pháo hoa, màn hình lớn hiện tên. Người giới thiệu xướng tên, nơi đến, cân nặng, rồi đô vật đứng trên dây góc chào khán giả.
- Trận đấu như WWE thật: đòn đánh, nhấc quật, suplex, powerbomb, chokeslam, DDT, cắm cọc, bay từ cột góc, khoá cua, siết cổ.
- **Trọng tài** chạy tới đếm 1–2–3, có thể thoát đếm ở 2,9.
- **Hai bình luận viên** ngồi bàn bình luận và đọc bằng giọng nói tiếng Việt.
- Khán đài hàng nghìn người giơ bảng cổ vũ. Có người bấm giờ đánh chuông.

## Cài đặt

1. Cài **Node.js** bản LTS: https://nodejs.org
2. **Chép mô hình nhân vật**: đặt file `Fighter.fbx` (mô hình Mixamo bạn đã tải) vào `public/models/custom/` và đổi tên thành `fighter.fbx`.
   Không có file này thì game vẫn chạy, nhưng dùng nhân vật dựng bằng code (đơn giản hơn).
   **Nhân vật nữ (tuỳ chọn)**: đặt `female.fbx` cùng chỗ. Game dùng file này cho 8 đô vật nữ và cô gái cầm biển.
   Yêu cầu: FBX có **khung xương Mixamo**, đứng **tư thế chữ T**, một nhân vật mỗi file.
   - Nếu file có sẵn ảnh vân (đã mặc đồ): game giữ nguyên trang phục gốc.
   - Nếu file không có ảnh vân: game tự tô quần áo như với Fighter.
   - Chưa có `female.fbx`: đô vật nữ dùng thân Fighter được làm gọn lại, cô gái cầm biển dùng hình dựng bằng code.
3. Windows: bấm đúp **`ChayGame.bat`**. macOS / Linux: chạy `./chay-game.sh`.
4. Trang điều khiển tự mở: `http://localhost:3400/admin.html`.

## Lên LIVE

- **OBS**: Sources → Browser → `http://localhost:3400/game.html?obs=1`, kích thước **1080 × 1920**, bật *Control audio via OBS*.
- **TikTok LIVE Studio**: thêm nguồn Liên kết bằng đường dẫn LAN (có trong trang điều khiển), hoặc dùng Window Capture.
- Bật LIVE, rồi ở trang điều khiển nhập tên kênh → **Kết nối**. Key EulerStream không bắt buộc.

## Người xem làm gì

| Bình luận | Tác dụng |
|---|---|
| `đấu` (hoặc `vật`, `đánh`, `chiến`) | Ghi danh vào giải. Giải đang đấu thì được ghi danh cho giải sau. |
| `đấu 7` | Chọn đô vật số 7 nếu còn trống |
| `1` / `2` | Cổ vũ góc đỏ / góc xanh trong trận 1 đấu 1 |
| `1`–`32` | Cổ vũ đô vật số đó trong battle royal |
| Thả tim | Tăng nộ cho đô vật mình cổ vũ |

Đô vật do người xem điều khiển hiện **tên và ảnh đại diện TikTok**. Khi người xem gõ bình luận, đô vật của họ được tăng nộ. Đủ nộ thì tung chiêu kết liễu.

## Quà → sức mạnh

Mức xu chỉnh được trong trang điều khiển. Cũng gán được một món quà cụ thể cho từng sức mạnh.

| 💎 từ | Sức mạnh |
|---|---|
| 1 | 🌹 Vào đấu / +20 máu |
| 5 | 💊 Hồi máu +40 |
| 10 | 🪑 Đập ghế xếp |
| 30 | 🔥 Cuồng nộ (gấp đôi sát thương 15 giây) |
| 99 | 💥 Tung chiêu kết liễu ngay |
| 199 | ♻️ Hồi sinh: quay lại battle royal, hoặc chắc chắn thoát đếm 3 |
| 299 | 🗿 Khổng lồ 20 giây |
| 999 | 👑 Huyền thoại: gần như bất bại, gấp đôi sát thương 20 giây |

Quà đi tới đâu: người tặng đang thi đấu thì sức mạnh vào **đô vật của mình**. Nếu không, vào đô vật mình đang cổ vũ. Chưa cổ vũ ai thì vào người đang yếu hơn.

## 32 đô vật

| # | Đô vật | Biệt danh | Chiêu tủ 1 | Chiêu tủ 2 | Chiêu kết liễu |
|---|---|---|---|---|---|
| 1 | Titan Kael | Người Khổng Lồ Phương Bắc | Cú đạp mặt | Bóp cổ quật | **Titan Bomb** (Bom sức mạnh) |
| 2 | Viper Rex | Rắn Lục Tử Thần | Song phi cước | Bẻ lưng qua gối | **Viper Strike** (Cú cắt bất ngờ) |
| 3 | El Fuego Dorado | Ngọn Lửa Vàng | Song phi cước | Cắm đầu DDT | **Fuego Moonsault** (Lộn ngược từ cột) |
| 4 | Iron Duke | Công Tước Thép | Đánh cánh tay | Nhấc quật | **Duke Driver** (Cắm cọc) |
| 5 | Blaze Carter | Hoả Long | Đánh cánh tay | Suplex dựng đứng | **Blaze Spear** (Húc vai) |
| 6 | Ronin Kage | Lãng Khách Bóng Đêm | Siêu cước | Bẻ cổ | **Kage Lock** (Siết cổ ngủ) |
| 7 | Bảo Long | Sấm Sét Sài Gòn | Gối bay | Xoay người quật lưng | **Long Thần Quăng** (Vác vai quăng) |
| 8 | Rook Maddox | Gã Đầu Gấu Texas | Đánh cánh tay | Cắm đầu DDT | **Rook Breaker** (Bẻ hàm) |
| 9 | Atlas Rahm | Tượng Đài Sống | Cú đạp mặt | Nhấc quật | **Atlas Slam** (Bóp cổ quật) |
| 10 | Nova Kingsley | Siêu Sao Toả Sáng | Siêu cước | Bẻ cổ | **Supernova Splash** (Ếch nhảy từ cột) |
| 11 | Grizzly Holt | Gấu Xám Rừng Sâu | Nhấc quật | Bẻ lưng qua gối | **Avalanche Elbow** (Cùi chỏ từ cột) |
| 12 | Jett Ramirez | Phản Lực Nhí | Song phi cước | Suplex kiểu Đức | **Jet Stream** (Lộn ngược từ cột) |
| 13 | Malik Stone | Đá Tảng Chicago | Xoay vòng đánh tay | Xoay người quật lưng | **Stone Crusher Knee** (Gối bay) |
| 14 | Hollow | Bóng Ma Nghĩa Địa | Đánh cánh tay | Siết cổ ngủ | **Grave DDT** (Cắm đầu DDT) |
| 15 | Dash Okoro | Tia Chớp Châu Phi | Siêu cước | Suplex kiểu Đức | **Dash Splash** (Ếch nhảy từ cột) |
| 16 | Kenji Arata | Võ Sĩ Đạo Thép | Gối bay | Suplex kiểu Đức | **Arata Driver** (Cắm cọc) |
| 17 | Big Papa Tusk | Ông Bố Nặng Ký | Đánh cánh tay | Nhấc quật | **Papa Drop** (Cùi chỏ từ cột) |
| 18 | Cobra Vance | Hổ Mang Chúa | Siêu cước | Bẻ lưng qua gối | **Cobra Clutch** (Bẻ hàm) |
| 19 | Brick Hanley | Bức Tường Gạch | Đánh cánh tay | Bom sức mạnh | **Brick Buster** (Xoay người quật lưng) |
| 20 | Zane Wilder | Kẻ Nổi Loạn | Song phi cước | Cú cắt bất ngờ | **Wild Moonsault** (Lộn ngược từ cột) |
| 21 | Marco Vega | El Toro – Bò Tót | Húc vai | Suplex dựng đứng | **El Toro Bomb** (Bom sức mạnh) |
| 22 | Sven Halvor | Chiến Binh Viking | Đánh cánh tay | Khoá cua | **Valhalla Toss** (Vác vai quăng) |
| 23 | Rocco Bruno | Gã Giang Hồ Brooklyn | Cắm đầu DDT | Xoay người quật lưng | **Brooklyn Driver** (Cắm cọc) |
| 24 | Ace Montana | Cao Bồi Miền Tây | Cú đạp mặt | Suplex kiểu Đức | **Montana Crab** (Khoá cua) |
| 25 | Raven Blaze (nữ) | Quạ Lửa | Song phi cước | Bẻ cổ | **Raven Cutter** (Cú cắt bất ngờ) |
| 26 | Luna Sterling (nữ) | Nữ Hoàng Ánh Trăng | Siêu cước | Suplex dựng đứng | **Lunar Moonsault** (Lộn ngược từ cột) |
| 27 | Kira Hà (nữ) | Đại Bàng Hà Nội | Gối bay | Cắm đầu DDT | **Đại Bàng Sà** (Ếch nhảy từ cột) |
| 28 | Jade Moreno (nữ) | Viên Ngọc Bích | Đánh cánh tay | Suplex kiểu Đức | **Jade Lock** (Khoá cua) |
| 29 | Nyla Storm (nữ) | Bão Tố | Húc vai | Xoay người quật lưng | **Storm Bomb** (Bom sức mạnh) |
| 30 | Scarlett Vex (nữ) | Hoa Hồng Độc | Cú đạp mặt | Bẻ hàm | **Vex Choke** (Siết cổ ngủ) |
| 31 | Sakura Mei (nữ) | Hoa Anh Đào | Song phi cước | Suplex kiểu Đức | **Sakura Moonsault** (Lộn ngược từ cột) |
| 32 | Valkyrie Brynn (nữ) | Nữ Thần Chiến Trận | Đánh cánh tay | Nhấc quật | **Valkyrie Slam** (Bóp cổ quật) |
(node:4609) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///home/user/baucua/dau-vat/public/roster.js is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to /home/user/baucua/dau-vat/package.json.
(Use `node --trace-warnings ...` to show where the warning was created)

Ngoài 3 chiêu riêng, ai cũng có đòn cơ bản: đấm, móc, đánh cẳng tay, chặt ngực, đá, giẫm, cùi chỏ, quật, và quăng qua dây (battle royal).

## Trang điều khiển

- **Điều khiển giải**: bắt đầu ngay (đóng ghi danh), bỏ qua đoạn hiện tại, mở lại giải từ đầu.
- **Luật & thời gian**: thời gian ghi danh, số người tối thiểu, đô vật máy vào thay, kiểu ra sân (tự động / đầy đủ / nhanh / bỏ), thời lượng trận, tốc độ game.
- **Hình ảnh & âm thanh**: chất lượng đồ hoạ (máy yếu chọn *Nhẹ*), số khán giả, âm lượng, bật/tắt bình luận viên và phụ đề, chọn giọng đọc.
- **Thử không cần LIVE**: thêm người xem ảo, thả tim, gửi bình luận, thử từng loại quà.
- **Bảng vàng**: nhà vô địch, số đai, số trận thắng của người xem. Lưu qua các buổi LIVE trong `data/`.

Chạy thử nhanh: `http://localhost:3400/game.html?fast` (ghi danh 8 giây, trận ngắn).

## Mô hình & bản quyền

- Thân nhân vật dùng **`Fighter.fbx`** (khung xương Mixamo). File này **không đưa lên git**: giấy phép Mixamo không cho phát tán lại file gốc.
  Mỗi đô vật là một bản sao, được tô màu da, quần áo, giày, băng gối, hình xăm, mặt nạ, sơn mặt, tóc và râu riêng. Vóc dáng cũng chỉnh to nhỏ riêng.
- Tư thế và chiêu được viết trên bộ xương chuẩn của game rồi tự chuyển sang xương Mixamo. Vì vậy mô hình Mixamo khác (đã gắn xương) cũng dùng được.
- Võ đài, khán đài, màn hình, bàn bình luận, đai vô địch, ghế xếp, âm thanh và nhạc ra sân đều **dựng bằng code**, không dùng file tải về.
- Game **không dùng** tên, logo hay hình ảnh của WWE và đô vật thật (dễ bị báo vi phạm khi LIVE). Thương hiệu giải là **MEGA SLAM**, cả 32 đô vật đều tự tạo.

## Cấu trúc

```
server.js            kết nối TikTok LIVE, cài đặt, bảng vàng, công cụ thử
public/game.js       kịch bản giải đấu, AI đô vật, trọng tài, máy quay, quà
public/anim.js       tư thế + thư viện chiêu hai người
public/fighter.js    nạp Fighter.fbx, tô quần áo/mặt, chuyển tư thế sang xương Mixamo
public/wrestler.js   nhân vật dựng bằng code (dự phòng) + vẽ khuôn mặt
public/arena.js      võ đài, khán đài, sân khấu, màn hình lớn, đèn, pháo hoa
public/hud.js        giao diện trên màn hình
public/audio.js      âm thanh tổng hợp (khán giả, chuông, va đập, nhạc ra sân)
public/roster.js     32 đô vật
```
