# Bán game Ngọn Lửa Cuối Cùng: web bán hàng + key bản quyền

Thư mục `web/` là một máy chủ Node riêng (đặt trên VPS / hosting có Node.js), gồm:
- Trang giới thiệu + bảng giá (`/`), trang đơn hàng (`/don-hang`), điều khoản, chính sách.
- Trang quản trị (`/quan-tri`): xem đơn, bấm "Đã nhận tiền", tạo key tay, khoá key, gỡ máy, đổi số máy.
- API cấp key: game gọi để kích hoạt, gia hạn vé, gỡ máy.

## Hai cách bán (dùng một hoặc cả hai)
| | Key theo mã máy (không cần máy chủ) | Key qua máy chủ (thư mục `web/`) |
|---|---|---|
| Chi phí | 0đ | VPS ~100–150k/tháng + tên miền |
| Khách mua | Nhắn Zalo, chuyển khoản, gửi mã máy | Tự đặt trên web, quét QR, tự nhận key |
| Anh làm | Kiểm tra tiền, chạy `TaoKey.bat`, gửi key | Bấm "Đã nhận tiền" (hoặc SePay tự xác nhận) |
| Cần mạng | Không | Kích hoạt lần đầu + 90 ngày/lần |
| Đổi máy | Khách gửi mã máy mới, anh cấp key mới | Khách tự gỡ máy cũ |
| Khoá key chia sẻ | Không khoá được | Khoá được |

### Bán bằng key theo mã máy
1. Lần đầu, ở thư mục game trên máy anh: bấm đúp `TaoKey.bat` (hoặc `node tools/tao-key.js khoi-tao <link Zalo>`).
   → tạo cặp khoá trong `tools/.khoa-offline/` và file `license-pubkey.js` dùng để đóng gói.
   **Sao lưu thư mục `tools/.khoa-offline/`** (USB / Drive riêng tư): mất là không cấp được key cho bản đã bán, lộ là ai cũng tự tạo được key.
2. Đóng gói: `node tools/dong-goi.js` (tự dùng khoá trong `tools/.khoa-offline/`).
3. Khách cài game → trang nhập key hiện **mã máy** (dạng `312C-A795-B532-BAFC`) → khách gửi mã cho anh qua Zalo.
4. Anh nhận tiền → mở `TaoKey.bat`, dán mã máy → ra key `NLOF-…` → gửi khách → khách dán vào là chạy, không cần mạng.
   Mọi key đã cấp được ghi vào `tools/.khoa-offline/da-cap.csv`.
5. Nếu sau này dựng máy chủ: chạy lại `node tools/tao-key.js khoi-tao` sau khi đã có `web/license-pubkey.js` → gói game mới nhận được cả hai loại key, key theo máy đã cấp vẫn dùng được.

## 0. Máy chủ: cần gì, tốn bao nhiêu
- Máy chủ cần chạy 24/7 vì game khách gọi về để kích hoạt key và gia hạn vé (3 ngày/lần khi có mạng).
- Nếu máy chủ tạm ngừng, game khách **vẫn chạy tới 90 ngày** (`offlineDays`), chỉ khách mới là chưa kích hoạt được.
- Gợi ý: 1 VPS nhỏ (1 CPU, 1 GB RAM, Ubuntu 22.04/24.04) chạy cả trang bán hàng lẫn máy chủ key, cộng một tên miền.
  Không cần máy mạnh: mỗi lần kích hoạt chỉ vài mili giây.
- **Không dùng** các gói miễn phí kiểu "ngủ khi không có ai truy cập" hoặc không có ổ đĩa cố định: dữ liệu key nằm trong `data/`, mất là mất hết key đã bán.
- Cài nhanh bằng script: trỏ tên miền về IP VPS, chép thư mục `web/` lên VPS rồi chạy
  `sudo bash cai-dat-vps.sh ten-mien.vn email@cua-anh.vn` (cài Node, pm2, nginx, HTTPS, sao lưu hằng ngày, tự tạo mật khẩu quản trị).

## 1. Cài lần đầu trên máy chủ
1. Chép thư mục `web/` lên máy chủ, chạy `npm install` rồi `npm start` (lần đầu tự tạo `config.json` và cặp khoá ký trong `data/`).
2. Sửa `config.json`:
   - `publicUrl`: tên miền của web (ví dụ `https://nguonlua.vn`), **bắt buộc HTTPS**.
   - `adminPassword`: mật khẩu trang quản trị (dài, khó đoán).
   - `bank`: `bin` (mã ngân hàng VietQR, ví dụ VietinBank 970415, Vietcombank 970436, MB 970422, Techcombank 970407, ACB 970416), số tài khoản, tên chủ tài khoản viết hoa không dấu.
   - `tiers`: tên gói, số máy, giá, quyền lợi. Giá trong file mẫu chỉ là ví dụ.
   - `downloadUrl`: link tải bộ game (Google Drive…), chỉ hiện cho khách đã trả tiền.
   - `contact`, `demoVideo` (link YouTube).
3. Khởi động lại. Nên chạy bằng `pm2` để tự bật lại khi máy chủ khởi động lại.
4. **Sao lưu `data/`** (chứa `private.pem` và `db.json`). Mất `private.pem` thì mọi key đã bán không gia hạn được; lộ `private.pem` thì người khác tự tạo được key.

## 2. Đóng gói game gửi khách (khách chỉ cần giải nén → bấm ChayNgonLua.bat → nhập key)
1. Trên máy chủ: `npm run xuat-khoa` → tạo `web/license-pubkey.js` (chỉ chứa khoá công khai, không có bí mật). Tải file này về máy anh, đặt vào thư mục `web/` của repo.
2. Trên máy anh, ở thư mục gốc game: `node tools/dong-goi.js` → tạo `dist/NgonLuaCuoiCung-<phiên bản>.zip` (~140 MB).
   Gói đã kèm sẵn Node.js cho Windows (`node\node.exe`), thư viện, toàn bộ asset, file ghi công âm thanh và hướng dẫn `DOC-TRUOC.txt`.
3. Đưa file zip lên Google Drive, dán link vào `downloadUrl` trong `config.json`.
4. Bản game không có `license-pubkey.js` (bản anh đang phát triển) thì không khoá.

Khách KHÔNG cần cài Node.js. Giọng đọc VieNeu là tuỳ chọn (cần Python); không cài thì game tự dùng giọng có sẵn của Windows.

## 3. Quy trình bán
1. Khách chọn gói → nhập tên, Zalo → nhận mã QR VietQR có sẵn số tiền và nội dung = mã đơn.
2. Tiền về:
   - **Thủ công**: vào `/quan-tri`, thấy giao dịch khớp mã đơn → bấm "Đã nhận tiền".
   - **Tự động (tuỳ chọn)**: đăng ký SePay, liên kết tài khoản ngân hàng, tạo webhook trỏ về `https://<tên-miền>/api/sepay-webhook`, kiểu xác thực "API Key", rồi điền cùng khoá đó vào `sepayApiKey`.
3. Trang đơn hàng của khách tự hiện key + link tải (tự làm mới 5 giây/lần).
4. Khách mở game → màn hình kích hoạt → nhập key. Game giữ vé 30 ngày, tự gia hạn ngầm khi có mạng.

## 4. Hỗ trợ khách
- Đổi máy: khách bấm "Gỡ kích hoạt" ở máy cũ (trang `/kich-hoat.html` trong game). Máy hỏng → `/quan-tri` → Key → "Gỡ máy".
- Key bị chia sẻ: "Khoá" → game của người dùng key đó bị khoá ở lần gia hạn sau (tối đa vài ngày).

## 5. Giới hạn cần biết
- Game viết bằng JavaScript, chạy trên máy khách, nên người rành kỹ thuật vẫn có thể sửa code để bỏ qua bước kiểm tra key. Key chặn được việc chia sẻ thông thường, không chặn được bẻ khoá có chủ đích.
- Kết nối TikTok dùng thư viện không chính thức (`tiktok-live-connector`); đã ghi rõ trong Điều khoản và Hỏi đáp.
- Điều khoản và Chính sách quyền riêng tư là **bản mẫu**, cần đọc lại và điền điều kiện hoàn tiền thật.
