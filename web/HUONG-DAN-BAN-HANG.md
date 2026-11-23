# Bán game Ngọn Lửa Cuối Cùng: web bán hàng + key bản quyền

Thư mục `web/` là một máy chủ Node riêng (đặt trên VPS / hosting có Node.js), gồm:
- Trang giới thiệu + bảng giá (`/`), trang đơn hàng (`/don-hang`), điều khoản, chính sách.
- Trang quản trị (`/quan-tri`): xem đơn, bấm "Đã nhận tiền", tạo key tay, khoá key, gỡ máy, đổi số máy.
- API cấp key: game gọi để kích hoạt, gia hạn vé, gỡ máy.

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

## 2. Đóng gói game gửi khách
1. Trên máy chủ: `npm run xuat-khoa` → tạo `web/license-pubkey.js` (chỉ chứa khoá công khai, không có bí mật).
2. Chép `license-pubkey.js` vào **thư mục gốc của game** (cạnh `server.js`), rồi nén game gửi khách.
3. Bản game không có `license-pubkey.js` (bản anh đang phát triển) thì không khoá.

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
