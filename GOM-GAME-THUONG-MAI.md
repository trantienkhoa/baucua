# Gom các game về một bộ để bán (Việt + Anh)

Ghi chú để làm tiếp khi gom game trên máy tính. Cập nhật 25/11/2026.

## Các game hiện có

| Game | Nằm ở đâu | Ghi chú |
|---|---|---|
| 🔥 Ngọn Lửa Cuối Cùng (kể chuyện ma) | nhánh `claude/laughing-noether-qwu8m9` | Đã có key, web bán, đóng gói theo gói 2D/3D/2D+3D, đang dịch tiếng Anh |
| 🎨 Họa Sĩ + 🪩 Vũ Trường Neon | nhánh `claude/awesome-franklin-w6592q` | Họa Sĩ đã có hệ đa ngôn ngữ riêng (`public/painter-i18n.js`) |
| 🍻 Quán Nhậu · 💆 Massage · ☕ Cà Phê Chill · 🏮 Thắp Sáng Quê Hương | nhánh `claude/sleepy-heisenberg-xf9r7t` | Thắp Sáng Quê Hương là bản đồ Việt Nam, khó bán nước ngoài |
| ⚡ Nation Rush | **chưa có trên GitHub** | Cần đẩy lên repo trước |
| 🚂 Tàu Đà Lạt – Trại Mát | **chưa có trên GitHub** | Cần đẩy lên repo trước |

## Phần đã làm sẵn ở Ngọn Lửa, dùng lại cho mọi game

- **Key bản quyền** (`license.js`, `tools/tao-key.js`, `TaoKey.bat`): key theo mã máy (không cần máy chủ) và key qua máy chủ; key mang loại gói.
- **Web bán hàng** (`web/`): bảng giá, VietQR, SePay tự xác nhận, tự gửi mail key + link tải, trang quản trị, script cài VPS (`web/cai-dat-vps.sh`). Hướng dẫn: `web/HUONG-DAN-BAN-HANG.md`.
- **Đóng gói** (`tools/dong-goi.js`): mỗi gói chỉ chứa đúng dữ liệu của gói, kèm Node.js cho Windows; tự bỏ mô hình không được phép bán.
- **Hai ngôn ngữ trong một bản** (`public/i18n.js`, `tools/ngon-ngu/`):
  - `tools/ngon-ngu/danh-dau.js` tự đánh dấu mọi câu tiếng Việt trong code thành `T\`…\`` và xuất danh sách câu cần dịch.
  - Bản dịch để ở `tools/ngon-ngu/en-*.json`, gộp bằng `node tools/ngon-ngu/xuat-tu-dien.js en` ra `public/lang/en.js`.
  - Ngôn ngữ chọn trong trang điều khiển; máy chủ trả `/lang.js`; đổi ngôn ngữ thì các màn tự tải lại.
  - Lệnh bình luận nhận cả hai thứ tiếng cùng lúc (nam mô / pray, cứu 12 / save 12, hỏi: / ask:, nam/nữ / male/female).

## Ngọn Lửa: tiếng Anh còn thiếu

1. 30 truyện (`public/ma-stories*.js`): giữ chất dân gian Việt.
2. Bảng quà và cài đặt mặc định (`public/ma-config.js`), tên ông Tư, tên cảnh và lý do đổi cảnh (`public/ma3d.js`).
3. Trang điều khiển (`public/ma-dieu-khien.html`), trang nhập key (`public/kich-hoat.html`), thông báo từ `server.js`.
4. Giọng đọc: tiếng Anh dùng giọng máy; VieNeu chỉ đọc tiếng Việt.

## Việc chung khi bán ra nước ngoài

- Web bán hàng hai thứ tiếng + cổng thu tiền quốc tế (Lemon Squeezy / Gumroad / PayPal) nối webhook để tự trả key như SePay.
- Một trang điều khiển chung chọn game, một kết nối TikTok, một key cho cả bộ (bộ 4 game quán đã làm theo kiểu này).
- Mọi asset bên ngoài phải có giấy phép cho phép thương mại; giữ các file GHI-CONG.txt trong mọi gói.
- Tuân thủ `CLAUDE.md` (không cờ bạc, không trả tiền để thắng, nhãn giọng AI, 18+…) cho từng game.
