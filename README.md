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

## Tính năng

- **Bình luận là lên sàn**; sàn đầy thì người im lặng lâu nhất nhường chỗ, im lặng quá lâu thì tự rời sàn.
- **14 điệu nhảy**: gõ `nhún`, `lắc`, `xoay`, `robot`, `disco`, `hiphop`, `vỗ tay`, `sóng`, `lộn`, `xoay đầu`, `gà`, `máy bay`, `đá chân`, `moonwalk` hoặc số `1–14`. Ngoài ra: `nhảy`, `đi vòng`, `ghép đôi`, `đổi đồ`.
- **Quà → hành động** (tuỳ chọn quà cho từng hành động hoặc theo số xu): Camera, Đổi đồ, Catwalk, Nhảy cao, Pháo hoa, Mưa bong bóng, Khổng lồ, Ghép đôi, Phân thân, Mọc cánh, Lên DJ, Tên lửa, Cưỡi mây, Ngai vàng, Đăng quang. Máy quay zoom cận người tặng, có hàng chờ zoom.
- **Nhiệt sàn**: thả tim / quà / follow / share làm đầy thanh → **SÀN CHÁY**: nhảy nhanh gấp đôi, laser, pháo giấy.
- **Bảng top đại gia**, danh hiệu Quý Tộc / Vua / Hoàng Đế, người tặng nhiều nhất lên đứng bàn DJ.
- **Nhạc**: tải MP3/M4A lên, game tự dò nhịp từng bài; chưa có bài thì máy tự đánh nhạc EDM.
- **Bộ lọc**: link, số điện thoại, Zalo luôn bị chặn; thêm từ cấm tuỳ ý.
- 3 mức hiệu ứng: Mạnh (có bloom phát sáng), Vừa, Nhẹ (máy yếu); công cụ thử không cần LIVE.
- Cần máy có card đồ hoạ / WebGL. Trong OBS nhớ bật tăng tốc phần cứng cho Browser Source.

Dữ liệu (cài đặt, nhạc, hình quà) lưu trong thư mục `data/`.

> Game không kèm nhạc. Nên dùng nhạc miễn phí bản quyền (NCS, StreamBeats, Pixabay…). Chủ kênh tự chịu trách nhiệm về nội dung phát sóng và tuân thủ Tiêu chuẩn cộng đồng của TikTok.
