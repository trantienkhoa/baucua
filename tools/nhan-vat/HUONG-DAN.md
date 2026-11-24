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
3. `ganh-doc.py` (chỉ chạy khi nhân vật có quang gánh, nhận ra qua vật liệu `Bamboo`)
   - Đặt đòn gánh dọc trên vai phải (thúng trước, thúng sau) và gắn vào xương riêng `Ganh`.
   - Đi, chạy, đứng: tay phải vịn đầu đòn phía trước, thúng nhún theo bước. Đòn luôn giữ thăng bằng khi người nghiêng.
   - Các động tác ngồi: đặt gánh xuống đất bên cạnh. Chỉnh trong `GANH` của `dong-tac.js`.
4. `do-vat.py`: tay xách đồ (giỏ...) được giữ yên theo ngực; phần món đồ dưới bàn tay tách ra xương riêng `DoVat`. Khi ngồi (trong game và trong 3 động tác ngồi), món đồ được đặt xuống đất cạnh chân.
5. `dau-chuan.py`: thay đầu. Dựng một đầu người chuẩn, mượt từ khuôn MakeHuman (CC0, gói sẵn trong `dau-mh.npz`, dựng bằng `dau_mh.py`) theo giới tính và tuổi ghi trong `gioi-tuoi.json`. Độ rộng má và cằm đo từ ảnh chân dung; không đo được thì lấy một dáng riêng cố định theo mã nhân vật. Đầu được đặt đúng chỗ đầu cũ, co giãn cho khớp hai mắt và miệng.
   - Có lớp ảnh mặt (`Face`): chiếu ảnh chân dung lên mặt. Ảnh chụp nghiêng thì soi gương nửa mặt rõ hơn. Mắt tự tìm sai thì chấm tay trong `mat-chinh.json`. Đặt biến `DAU_DEBUG=anh.png` để xuất ảnh mặt kèm vị trí mắt tìm được mà soát.
   - Không có lớp ảnh mặt nhưng có ảnh chân dung toàn thân `chan-dung/<mã>.jpg` (hoặc thư mục trong biến `DAU_CHAN_DUNG`): khớp chiều cao người trong ảnh với mô hình, dò soi gương / lệch / cỡ cho giống hình chụp thẳng của mô hình, rồi cắt vùng đầu làm ảnh mặt.
   - Không có cả hai (mặt máy tạo méo): vẽ một khuôn mặt sạch (mắt, mày, mũi, miệng; người lớn tuổi có nếp nhăn nhẹ). Màu da lấy từ chính nhân vật; tóc, nón, khăn trên trán giữ nguyên màu cũ.
   - Ảnh chân dung toàn thân: chiều cao người trong ảnh (đo theo màu nền hai mép ảnh) khớp với chiều cao mô hình, nên tầm mắt và cổ đúng như ảnh. Mốc mặt dò trên ảnh gốc rồi quy về khung mặt.
   - Mí mắt khuôn được mở vừa (`mo_mat` 0,4); ảnh được uốn thêm theo chóp mũi để mũi, môi nằm đúng chỗ.
   - Khớp bề ngang: đầu khuôn rộng hơn mặt trong ảnh thì thu hẹp má, hàm, hai bên sọ (giữ vùng mắt); phần chênh còn lại uốn ảnh theo từng hàng cho mép mặt ảnh trùng mép đầu (không còn viền hàm lọt trong đầu như hai lớp mặt).
   - Mặt dưới: ảnh AI vẽ đoạn mũi–cằm ngắn hơn khuôn, nên khuôn được rút ngắn từ chóp mũi xuống (tối đa 30%) cho miệng khuôn trùng miệng ảnh; phần dưới cằm ép sát cổ. Không còn "hai cằm".
   - Cỡ đầu: ảnh AI vẽ đầu to hơn người thật, nên cả cụm đầu (mặt, tóc, nón, khăn) được thu quanh khớp đầu cho khoảng cách hai mắt ≈ 6,25 cm × chiều cao/1,66 m.
   - Hai mắt, miệng trên ảnh dò bằng YuNet (`yunet.onnx`, cần `pip install opencv-python-headless`; không có thì dùng cách dò cũ, kém hơn). Khuôn đầu giữ tỉ lệ người thật, chỉ co giãn ảnh cho mắt, miệng rơi đúng chỗ.
   - Lớp ảnh mặt cắt hỏng: ghi mã vào `_ve_mat` trong `mat-chinh.json` để tạm vẽ mặt; có ảnh chân dung trong `chan-dung/` thì luôn dùng ảnh chân dung.
   - Tóc, gáy tô bằng màu lấy từ ảnh. Phần đầu cũ nằm trong đầu mới bị bỏ, còn nón, khăn, vành nón xa phía trước giữ nguyên. Không thay được thì quy trình tự quay về `mat-2d.py`.
   - Đổi bộ dáng đầu: `python tao-dau-mh.py <makehuman/makehuman/data>` (clone https://github.com/makehumancommunity/makehuman; các file `targets/macrodetails/asian-*.target` lấy bằng `git show`).
   - `mat-2d.py` (dự phòng): làm mặt đẹp hơn. Tìm khuôn mặt ngay trên ảnh chân dung (texture mặt chiếu thẳng), rồi dán ảnh lên một mặt nạ mỏng cong mượt đặt trước lưới mặt (vốn góc cạnh, méo). Viền mờ dần, vá lỗ đen, cả vùng mặt theo hẳn xương đầu.
6. `gan-dong-tac.py`: ghi các động tác vào GLB thành animation (giữ tất cả xương trong mọi clip để chuyển clip không bị lệch).

7. `lam-nhe.py`: gộp các đỉnh trùng (lưới máy tạo là "súp tam giác", mỗi tam giác 3 đỉnh riêng chỉ để mang pháp tuyến phẳng) và bỏ pháp tuyến. Trình xem glTF tự tô phẳng từng mặt nên hình không đổi, số đỉnh giảm khoảng 3 lần, file nhẹ hơn khoảng 1/3.

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

Trong game (`public/ma3d.js`): lúc chuyển cảnh, nhân vật đi theo ông kể chuyện bằng `di_bo` (đứng chờ thì `dung_yen`). Khi đang ngồi, chỉ phần thân trên (vai, tay, cổ, đầu) của động tác được ghép lên tư thế ngồi:
- `vay_tay`: khi vào phòng, khi bình luận "chào / hello / hi", khi được cảm ơn quà. Chỉ là cử chỉ đáp lễ, không thưởng gì; ai bình luận chào cũng được vẫy như vậy.
- `vo_tay`: khi bình luận cười (haha, hihi…).
- `giat_minh`: khi bị hù (cả phòng giật mình).

Thêm hay sửa động tác: sửa `dong-tac.js`. Mỗi động tác có `dur` (giây, một vòng lặp) và `f(t)` với t chạy từ 0 đến 1. Hàm trả về góc (độ) cho từng xương, và `hip` là độ dời hông tính bằng mét.

## Nhân vật đã làm
`public/models/ma/nhanvat/tp-001.glb` … `tp-050.glb` (nhóm F; tp-002 là mẫu đầu tiên anh duyệt). Danh sách trong `danh-sach.json`, giới tính và tuổi trong `tools/nhan-vat/gioi-tuoi.json`.

## Soi nhanh một nhân vật
```
node tools/nhan-vat/chup.js <file.glb> <ra.png> [giây] '{"only":["chay_bo"],"cols":1,"ry":2.4}'
```

## Giới hạn
- Đạo cụ dính liền thân trong lưới (cuốc của tp-001) đi theo phần cơ thể mà nó chạm vào.
- Tay buông sát người xách đồ (giỏ của tp-011, tp-015): tay dính liền thân nên giữ yên theo ngực (tay kia vẫn cử động); khi ngồi giỏ được đặt xuống đất, còn cánh tay đó vẫn buông thẳng.
- Lỗ có sẵn trong lưới dưới nách hiện ra khi vung tay mạnh.
- Mặt trong cánh tay có bóng tối vẽ sẵn trong texture.
- Mặt chiếu từ ảnh thẳng: nhìn nghiêng hẳn thì má, mang tai là màu da trám (lấy theo tông má trong ảnh), không có chi tiết ảnh.
- Đầu cũ quá to so với mặt trong ảnh (như tp-021): tăng cỡ đầu trong `mat-chinh.json`, mục `_co_dau`.
- Xuất mô hình ở tư thế chữ T (tay dang ngang, không chạm thân) sẽ cho kết quả tốt nhất.
