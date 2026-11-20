# 📮 Tự Đăng Bài — tự đăng video lên Trang Facebook và kênh TikTok

App chạy trên máy tính của bạn, **miễn phí**, dùng **API chính thức** của Facebook và TikTok (không giả lập đăng nhập, không cần mật khẩu kênh).

- Chọn video, viết caption, tick các Trang Facebook + kênh TikTok, bấm **Đăng ngay** hoặc **Hẹn giờ**.
- **Đăng hàng loạt:** chọn nhiều video một lúc, app tự xếp lịch cách nhau 30 phút → 1 ngày, mỗi video có thể có caption riêng.
- Một video đăng cùng lúc lên **nhiều Trang Facebook và nhiều kênh TikTok** (ví dụ 4 kênh TikTok).
- Facebook: Reels, video thường, bài ảnh (1–10 ảnh), bài chữ/link. Có thể **gửi lịch lên Facebook** để Facebook tự đăng đúng giờ, không cần để máy bật.
- TikTok: **Gửi vào nháp** (dùng được ngay) hoặc **Đăng thẳng** (khi app được TikTok duyệt).
- Lịch đăng xem theo ngày, trạng thái từng tài khoản, nút Thử lại khi lỗi, nút chép caption.
- Mở được trên **điện thoại cùng Wi-Fi** (đặt mật khẩu).

## ⚠️ Giới hạn cần biết trước

| | Facebook | TikTok |
|---|---|---|
| Đăng được lên | **Trang (Page)** bạn làm quản trị viên. *Không* đăng được lên trang cá nhân hay nhóm (Facebook đã khoá từ 2018/2024). | Kênh TikTok của bạn |
| Cần làm 1 lần | Tạo app Meta (10 phút), để chế độ Development, **không cần Meta duyệt** | Tạo app TikTok + **chờ TikTok duyệt app** (vài ngày). Thử ngay được bằng Sandbox. |
| Tự động hoàn toàn? | **Có** | **Gửi vào nháp:** đúng giờ video tự vào hộp thư TikTok, bạn mở app TikTok **dán caption → bấm Đăng** (TikTok không cho app điền sẵn caption vào nháp).<br>**Đăng thẳng công khai:** phải qua **audit** của TikTok. App chưa audit thì TikTok chỉ cho đăng thẳng khi tài khoản để riêng tư. TikTok thường chỉ audit app phục vụ nhiều người — app cá nhân có thể bị từ chối. |
| Giới hạn số lượng | Reels: 30 bài / Trang / 24 giờ | App chưa audit: tối đa 5 kênh đăng / 24 giờ; tối đa 5 video nháp chưa đăng / kênh / 24 giờ |
| Máy phải bật? | Không, nếu bật “Gửi lịch lên Facebook” và hẹn trước ≥ 20 phút | **Có** — để máy bật và cửa sổ app mở lúc đến giờ |

> Đây là luật của TikTok cho mọi app bên thứ ba. Các dịch vụ trả phí như Buffer, Postiz (bản cloud) đăng thẳng được là vì app của họ đã qua audit. Không có cách chính thức nào tự đăng TikTok công khai mà không qua audit.

## 1. Cài và chạy

1. Cài **Node.js** bản LTS (20 trở lên): https://nodejs.org
2. Mở thư mục `tu-dang-bai`, bấm đúp **`TuDangBai.bat`** (lần đầu tự cài thư viện).
3. Trình duyệt mở `http://localhost:3400`. **Để cửa sổ đen mở** thì bài hẹn giờ mới tự đăng.

macOS / Linux: chạy `./tu-dang-bai.sh` (hoặc `npm install` rồi `npm start`).

## 2. Tạo app Meta (Facebook) — làm 1 lần

1. Vào https://developers.facebook.com/apps → **Tạo ứng dụng**.
2. Trường hợp sử dụng: **Quản lý mọi thứ trên Trang** (*Manage everything on your Page*). Nếu được hỏi loại app: **Doanh nghiệp**.
3. Trong trường hợp sử dụng → **Tuỳ chỉnh**: thêm quyền `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`.
4. **Đăng nhập bằng Facebook → Cài đặt → URI chuyển hướng OAuth hợp lệ**: dán `http://localhost:3400/auth/facebook/callback` (app hiện sẵn địa chỉ này ở mục Cài đặt, bấm để chép).
5. **Cài đặt ứng dụng → Thông tin cơ bản**: chép **ID ứng dụng** và **Khoá bí mật** → dán vào **Cài đặt** của Tự Đăng Bài → Lưu.
6. Giữ app ở chế độ **Development**. Sang tab **Tài khoản** → **Kết nối Facebook** → tick chọn các Trang.

Nút kết nối báo lỗi chuyển hướng? Dùng **Dán token**: mở [Graph API Explorer](https://developers.facebook.com/tools/explorer/) → chọn app → *Get User Access Token* → tick 3 quyền trên → *Generate* → chép token dán vào app. App tự đổi sang token Trang **không hết hạn**.

## 3. Tạo app TikTok — làm 1 lần

1. Vào https://developers.tiktok.com → đăng nhập → **Manage apps → Connect an app**.
2. Điền icon, tên, mô tả, danh mục, **Terms of Service URL**, **Privacy Policy URL** (xem mục *Trang điều khoản* bên dưới).
3. **Platforms:** chọn **Desktop**.
4. **Add products:** **Login Kit** và **Content Posting API** (muốn đăng thẳng thì bật **Direct Post**).
5. **Scopes:** `user.info.basic`, `video.upload` (+ `video.publish` nếu đăng thẳng).
6. **Login Kit → Redirect URI (Desktop):** `http://localhost:3400/auth/tiktok/callback/`
7. Chép **Client key**, **Client secret** → dán vào **Cài đặt** của Tự Đăng Bài → Lưu.
8. **Dùng thử ngay:** tab **Sandbox** → tạo sandbox → thêm các kênh TikTok của bạn vào **Target users** (dùng Client key/secret của sandbox).
   **Dùng thật:** **Submit for review** — TikTok yêu cầu quay **video demo** cảnh dùng app (kết nối kênh → chọn video → gửi). Duyệt vài ngày.
9. Sang tab **Tài khoản** → **+ Thêm kênh TikTok**. Thêm kênh thứ 2, 3, 4: mở tiktok.com trên cùng trình duyệt, **chuyển sang kênh đó** (hoặc đăng xuất) rồi bấm Thêm kênh lần nữa.

Khi TikTok duyệt quyền `video.publish`: Cài đặt → tick **App đã được duyệt đăng thẳng** → Lưu → bấm **Kết nối lại** từng kênh.

### Trang điều khoản & quyền riêng tư (TikTok bắt buộc)

Thư mục `docs/` có sẵn 2 trang mẫu `privacy.html` và `terms.html` (tiếng Anh + Việt):

1. Mở 2 file, sửa `[YOUR NAME]`, `[YOUR EMAIL]`, `[DATE]`.
2. Tạo một repo GitHub **công khai** mới (ví dụ `tu-dang-bai-docs`), tải 2 file lên.
3. Repo đó → **Settings → Pages** → *Deploy from a branch* → `main` / `(root)` → Save.
4. Vài phút sau có địa chỉ `https://<tên-github>.github.io/tu-dang-bai-docs/privacy.html` và `.../terms.html` → dán vào app TikTok.
   Nếu TikTok yêu cầu xác minh tên miền (*Verify URL properties*), tải file xác minh TikTok đưa vào cùng repo đó.

## 4. Đăng bài

- **Soạn bài:** chọn video/ảnh → caption (có thể viết caption riêng cho Facebook và TikTok) → tick tài khoản → chọn **Đăng ngay** hoặc **Hẹn giờ** (có nút giờ nhanh 11:30, 18:00, 20:00, 21:30…).
- **Nhiều video:** chọn nhiều video cùng lúc → chọn khoảng cách → app tạo mỗi video một bài, xếp lịch lần lượt.
- **Lịch đăng:** xem bài sắp đăng / đang xử lý / đã xong / lỗi. Bấm **▶ Đăng ngay**, **✎ Sửa** (đổi giờ, caption), **Huỷ**, **↻ Thử lại**, **📋 Chép caption TikTok**.
- **TikTok dạng nháp:** đến giờ, điện thoại báo có video mới trong hộp thư TikTok → bấm vào → dán caption (đã chép) → Đăng.

## 5. Mở trên điện thoại

Cài đặt → **Mật khẩu** → Lưu. Điện thoại cùng Wi-Fi mở địa chỉ `http://192.168.x.x:3400` hiện trong Cài đặt (tên đăng nhập gõ gì cũng được). Kết nối tài khoản Facebook/TikTok thì làm trên **máy tính** đang chạy app.

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| “Token Facebook đã hết hạn…” | Tab Tài khoản → Kết nối Facebook (hoặc Dán token) lại. |
| Facebook “Thiếu quyền đăng lên Trang” | Bạn phải là quản trị viên Trang và tick chọn Trang đó khi kết nối; app Meta phải có quyền `pages_manage_posts`. |
| Reels lỗi xử lý | Reels cần video dọc 9:16, dài 3–90 giây, tối thiểu 540×960. Chọn kiểu **Video thường** cho video khác. |
| TikTok “redirect_uri” không khớp | Redirect URI trong app TikTok phải giống hệt địa chỉ ở mục Cài đặt (có dấu `/` cuối). |
| TikTok “code_verifier / code_challenge” | Cài đặt → Nâng cao → đổi **Kiểu mã hoá PKCE** → kết nối lại. |
| TikTok “chưa qua kiểm duyệt (audit)…” | Dùng **Gửi vào nháp**, hoặc gửi app cho TikTok audit. |
| TikTok “quá nhiều video nháp chưa đăng” | Mở TikTok đăng hoặc xoá bớt nháp (tối đa 5 / 24 giờ). |
| “App bị tắt giữa lúc đang đăng” | Máy tắt khi đang tải lên. Kiểm tra trên kênh trước, chưa có bài thì bấm Thử lại. |

Chi tiết từng lần đăng: **Cài đặt → Nhật ký**.

## Dữ liệu & bảo mật

- Mọi thứ lưu trong `tu-dang-bai/data/` trên máy bạn: `db.json` (cài đặt, **token các tài khoản**, lịch) và `uploads/` (video chờ đăng). **Không gửi thư mục `data` cho ai.** Thư mục này không được đưa lên git.
- File video/ảnh của bài đã đăng xong tự xoá sau 7 ngày (đổi trong Cài đặt → Nâng cao).
- Không có mật khẩu thì app chỉ mở được trên chính máy đó.

## Chạy trên máy chủ (nâng cao)

```sh
PORT=3400 APP_PASSWORD='mat-khau-manh' LOCALHOST_NO_PASSWORD=0 npm start
```

- Đặt sau reverse proxy có HTTPS, nhập **Địa chỉ công khai** (`https://ten-mien`) trong Cài đặt → Nâng cao, rồi đổi Redirect URI trên Meta/TikTok sang tên miền đó (app TikTok khi đó chọn platform **Web**).
- `LOCALHOST_NO_PASSWORD=0`: bắt buộc mật khẩu cả với kết nối từ 127.0.0.1 (cần khi đứng sau reverse proxy).
- `DATA_DIR`: nơi lưu dữ liệu. `ALLOWED_HOSTS`: thêm tên miền được phép (cách nhau dấu phẩy).

## Cho lập trình viên

```
server.js          máy chủ Express, API, kết nối OAuth
lib/facebook.js    Graph API: Trang, Reels, video, ảnh, bài chữ, hẹn lịch
lib/tiktok.js      Content Posting API: PKCE, làm mới token, chia file, nháp / đăng thẳng
lib/scheduler.js   bộ hẹn giờ, hỏi trạng thái xử lý, dọn file
public/            giao diện (HTML/CSS/JS thuần)
test/              máy chủ Facebook/TikTok giả + kiểm thử toàn bộ luồng
```

`npm test` chạy 16 bài kiểm thử với máy chủ giả (không cần tài khoản thật).
