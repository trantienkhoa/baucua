# Sửa nhân vật 3D và gắn động tác

Dùng cho các nhân vật GLB tạo tự động: khung xương Mixamo 26 khớp, tay mô hình dang chữ A nhưng xương tay thẳng đứng.

## Chạy
```
node tools/nhan-vat/lam.js <thư mục chứa .glb> [thư mục ra] [--khong-gif]
```
Mặc định kết quả nằm ở `<thư mục vào>/da-sua/`:
- `<tên>.glb`: đã sửa xương và trọng số, có sẵn 14 animation.
- `xem/<tên>.gif`: 14 động tác chạy cùng lúc, để duyệt.
- `xem/tong-quan.png`: mỗi nhân vật một ô, đang chạy bộ, để soi nhanh cả lô.
- `bao-cao.csv`: kết quả từng file (ok / lỗi và lý do).

Cần python3 + numpy, playwright (chromium) và ffmpeg. Không có ffmpeg thì vẫn ra GLB, chỉ không có gif.

## Các bước bên trong
1. `sua-xuong.py`
   - Đo trục tay thật trên lưới, xoay xương tay cho khớp và kéo dài cẳng tay.
   - Tính lại ma trận bind.
   - Gắn lại trọng số theo khoảng cách tới đoạn xương: tách hẳn chân trái và phải, tay tách khỏi thân theo khe hở ở từng lát cắt, đầu và nón gắn cứng vào xương đầu.
   - Gộp các đỉnh trùng vị trí rồi làm mượt.
   - Bỏ các tam giác tạo màng nối giữa hai chân.
   - Từ khuỷu tay trở xuống, mỗi điểm thuộc hẳn tay hoặc hẳn thân. Tam giác dính bàn tay với hông, ống quần bị cắt; mẩu lưới lẻ không nối với cánh tay được trả về thân.
   - Tô lại phần hông bị tay che và mặt trong cánh tay bằng màu vải xung quanh (máy tạo không nhìn thấy những chỗ này).
2. `xem.html` + `dong-tac.js`
   - Tính 14 động tác ở 30 khung/giây.
   - Trục quay tính theo khung nhân vật: mặt nhìn về -Z, tay trái ở phía -X. Vì vậy động tác không phụ thuộc trục riêng của từng xương.
3. `gan-dong-tac.py`: ghi các động tác vào GLB thành animation (giữ tất cả xương trong mọi clip để chuyển clip không bị lệch).

## Động tác (tên animation)
| Tên | Động tác |
|---|---|
| `di_bo` | Đi bộ |
| `chay_bo` | Chạy bộ |
| `dung_yen` | Đứng thở |
| `vay_tay` | Vẫy chào |
| `vo_tay` | Vỗ tay |
| `cui_chao` | Cúi chào |
| `ngoi_bet` | Ngồi bó gối |
| `ngoi_so` | Ngồi run sợ |
| `ngoi_xom` | Ngồi chồm hổm |
| `giat_minh` | Giật mình |
| `run_so` | Đứng run |
| `nhay_mua` | Nhảy múa |
| `nhin_quanh` | Ngó quanh |
| `chi_tay` | Chỉ tay |

Thêm hay sửa động tác: sửa `dong-tac.js`. Mỗi động tác có `dur` (giây, một vòng lặp) và `f(t)` với t chạy từ 0 đến 1. Hàm trả về góc (độ) cho từng xương, và `hip` là độ dời hông tính bằng mét.

## Nhân vật mẫu đã duyệt
`public/models/ma/nhanvat/tp-001.glb` … `tp-010.glb` (nhóm F, bản pilot; tp-002 là mẫu đầu tiên anh duyệt)

## Soi nhanh một nhân vật
```
node tools/nhan-vat/chup.js <file.glb> <ra.png> [giây] '{"only":["chay_bo"],"cols":1,"ry":2.4}'
```

## Giới hạn
- Đạo cụ dính liền thân trong lưới (cuốc của tp-001) đi theo phần cơ thể mà nó chạm vào.
- Quang gánh tp-010 gắn vào lưng; tay không bám đòn gánh khi làm động tác.
- Lỗ có sẵn trong lưới dưới nách hiện ra khi vung tay mạnh.
- Mặt trong cánh tay có bóng tối vẽ sẵn trong texture.
- Xuất mô hình ở tư thế chữ T (tay dang ngang, không chạm thân) sẽ cho kết quả tốt nhất.
