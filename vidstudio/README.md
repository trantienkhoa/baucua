# VieDub Studio

App chạy trên máy tính để biến video nước ngoài (Bilibili, Douyin, YouTube, TikTok…) thành video tiếng Việt:
**tải về → chép lời → dịch bằng AI → lồng tiếng Việt → xoá sub gốc → chèn phụ đề → xuất video**, kèm một Studio để sửa từng câu.

## Cài đặt

Cần **Python 3.10+** và **FFmpeg** (có libass, các bản build phổ biến đều có).

- **Windows:** cài FFmpeg (`winget install Gyan.FFmpeg`), rồi bấm đúp `ChayStudio.bat`. Lần đầu sẽ tự cài thư viện.
- **macOS / Linux:** `brew install ffmpeg` hoặc `sudo apt install ffmpeg`, rồi chạy `./run.sh`.

App mở tại `http://127.0.0.1:8765`. Thêm `--window` để mở thành cửa sổ riêng (cần `pip install pywebview`).

Gói tuỳ chọn (bỏ comment trong `requirements.txt`):

| Gói | Dùng để |
|---|---|
| `faster-whisper` | Nhận dạng giọng nói (đã bật sẵn). Có GPU NVIDIA thì chạy nhanh hơn nhiều |
| `rapidocr-onnxruntime` | Tự dò vùng sub gốc, đọc phụ đề cứng trên hình (OCR) |
| `argostranslate` | Dịch offline không cần mạng |
| `audio-separator[gpu]` | Tách nhạc nền: giữ nhạc, bỏ giọng gốc |
| `pywebview` | Mở như app desktop |

## Các trang

| Trang | Làm gì |
|---|---|
| **Tạo mới** | Dán một hoặc nhiều link (mỗi dòng một link) hoặc kéo thả file, có thể kèm file `.srt`. Chọn công thức, khung hình, bật/tắt lồng tiếng, xoá sub |
| **Khám phá** | Video thịnh hành trên Bilibili, có tiêu đề đã dịch, điểm "đáng làm", nhãn *Lên rất nhanh / Tương tác cao / Video dọc*. Lọc theo chủ đề, độ dài, khung; tìm bằng tiếng Việt (tự dịch sang tiếng Trung); lưu video; chọn nhiều video để làm hàng loạt |
| **Thư viện** | Tất cả video, lọc theo trạng thái / thư mục, xuất lại, nhân bản, ghép, xoá hàng loạt |
| **Studio** | Sửa phụ đề, xem trước trực tiếp, timeline, giọng đọc, vùng sub gốc, dịch lại, đăng, kiểm tra chất lượng |
| **Ghép video** | Nối nhiều video thành một, tự đồng bộ khung hình |
| **Ảnh bìa** | Lấy khung hình từ video, thêm tiêu đề có tô màu từ khoá, tải PNG |
| **Cài đặt** | Chọn AI dịch + API key, văn phong, bảng thuật ngữ, giọng, xoá sub, bộ mã hoá, công thức, kiểm tra máy |

### Studio

- **Danh sách câu:** sửa trực tiếp câu gốc và câu dịch, sửa mốc thời gian, đổi Nam/Nữ, chọn giọng và tốc độ riêng từng câu, nghe thử, dịch lại một câu, tắt đọc, tách (tại con trỏ hoặc đầu phát), gộp, xoá, thêm câu. Thanh ký tự cho biết câu có đọc kịp không. Có tìm kiếm, tìm & thay thế, lọc *Cần xem*.
- **Trình phát:** *Xem trước* (video gốc + giọng lồng + phụ đề vẽ trực tiếp, kéo phụ đề để đổi vị trí, xem trước hiệu ứng làm mờ), *Thành phẩm*, *So sánh* gốc và thành phẩm cạnh nhau.
- **Timeline:** sóng âm tiếng gốc và giọng lồng, khối phụ đề kéo để dời / kéo mép để đổi độ dài; kéo trên sóng âm để chọn đoạn rồi *Cắt đoạn*, *Chỉ giữ đoạn này*, *Xuất clip*; *Điểm đầu / Điểm cuối* (phím I / O); Ctrl + lăn chuột để phóng to.
- **Tab bên phải:** 6 kiểu phụ đề (Cổ điển, Phim, Nền hộp, TikTok, Karaoke, Pop), font, cỡ, màu, viền, song ngữ · khung hình 9:16 / 1:1 / 16:9 / 4:5 với nền mờ, tốc độ video, lật ngang, GPU/CPU · giọng chung hoặc tự theo Nam/Nữ, âm lượng, tự tăng tốc khi câu dài · vùng sub gốc: làm mờ / che hộp / cắt bỏ, kéo khung trên video hoặc tự dò bằng OCR · dịch lại câu trống / câu bị cảnh báo / tất cả, nhập/xuất SRT, nhận dạng lại · AI viết tiêu đề, mô tả, hashtag · điểm chất lượng và danh sách lỗi.
- **Hoàn tác / làm lại** (Ctrl+Z / Ctrl+Y), **tự lưu**, Ctrl+S, phím cách để phát/dừng, ←/→ để tua, ↑/↓ để chuyển câu.
- **Cập nhật video** chỉ tạo lại giọng cho câu đã sửa (các câu khác dùng lại file cũ), rồi xuất lại.

Bấm **Ctrl+K** ở bất cứ đâu để mở bảng lệnh.

## Xử lý thông minh

- **Chạy song song 3 làn:** tải/dịch/lồng tiếng (mạng), nhận dạng giọng nói, xuất video. Khi làm nhiều video, video sau đã dịch xong trong lúc video trước đang xuất.
- **Tự rút gọn câu đọc không kịp:** sau khi tạo giọng, câu nào vượt thời lượng sẽ được AI viết ngắn lại rồi tạo giọng lại (tối đa 2 lượt). Câu bạn đã sửa tay không bị đụng tới. Cần dịch bằng AI (Claude, Gemini, DeepSeek, OpenAI, Ollama).
- **Tiếng gốc tự nhỏ khi có giọng Việt, to lại lúc im lặng**, kèm chuẩn âm lượng -14 LUFS.
- **Chỉ làm mờ sub gốc lúc có chữ** (dò bằng OCR), phần còn lại của video giữ nét.
- Đang xử lý nền thì Studio tạm khoá sửa câu để không ghi đè lẫn nhau; file tạm cũ được dọn tự động.

## AI dịch

| Lựa chọn | Ghi chú |
|---|---|
| Claude | Mặc định `claude-opus-5-5`. Dịch theo ngữ cảnh, tự rút gọn cho kịp thời lượng, đánh dấu từ khoá để tô màu |
| Gemini, DeepSeek, OpenAI | Dán key trong Cài đặt |
| Ollama | Model chạy trên máy, không cần key |
| Google dịch | Miễn phí, không cần key (mặc định) |
| Dịch offline | Argos Translate |

Key lưu trong `data/keys.json` trên máy bạn, hoặc đặt biến môi trường `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`.

## Dữ liệu

- `data/projects/<id>/`: mỗi video một thư mục (`project.json`, `source.mp4`, giọng đọc, `output.mp4`…)
- `data/exports/`: bản sao video đã xuất, đặt tên theo tiêu đề
- `data/settings.json`: cài đặt; đổi vị trí bằng biến `VIDSTUDIO_DATA`

## Lưu ý

- Giọng đọc dùng Microsoft Edge TTS (miễn phí, cần mạng tới `speech.platform.bing.com`).
- Một số nền tảng (Douyin, Xiaohongshu) cần file cookies để tải: xuất cookies bằng tiện ích trình duyệt rồi điền đường dẫn trong Cài đặt.
- Hãy dùng nội dung mà bạn có quyền sử dụng, và ghi nguồn khi đăng lại.

## Kiểm thử

```bash
pip install pytest && python -m pytest tests
```
