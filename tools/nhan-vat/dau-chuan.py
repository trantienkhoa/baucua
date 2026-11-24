# Thay đầu nhân vật máy tạo (lưới mặt méo, góc cạnh) bằng một đầu người chuẩn, mượt (khuôn MakeHuman CC0, dau_mh.py: theo giới tính, tuổi, dáng mặt),
# co giãn cho khớp đúng hai mắt trên ảnh chân dung, rồi chiếu ảnh chân dung lên mặt.
# Tóc, gáy, mang tai: tô màu tóc / màu da lấy từ chính ảnh. Phần đầu cũ nằm trong đầu mới bị bỏ; nón, khăn, tóc ngoài giữ nguyên.
# python dau-chuan.py <vào.glb> <ra.glb>
#   thoát mã 3 nếu không làm được (không có ảnh mặt...) -> quy trình dùng mat-2d.py thay thế
# Vị trí mắt: tự tìm trên ảnh; sai thì chấm tay trong mat-chinh.json: {"tp-005": [[u1, v1], [u2, v2]]} (toạ độ 0..1 trên ảnh mặt)
import sys, os, io, json, shutil, numpy as np
os.environ.setdefault('OPENCV_LOG_LEVEL', 'ERROR')   # tắt cảnh báo OpenCV trong báo cáo
TOOL = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, TOOL)
from glbio import GLB
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.interpolate import griddata
from scipy.spatial import Delaunay

src, dst = sys.argv[1], sys.argv[2]
base = os.path.splitext(os.path.basename(src))[0].replace('-xuong', '')
g = GLB(src); J = g.j; nodes = J['nodes']; mesh = J['meshes'][0]
mname = lambda p: J['materials'][p.get('material', 0)].get('name')
if any(mname(p) in ('DauChuan', 'Face2D') for p in mesh['primitives']):
    if os.path.abspath(src) != os.path.abspath(dst): shutil.copy(src, dst)
    print('bo-qua: đã có đầu mới'); sys.exit(0)
fps = [p for p in mesh['primitives'] if mname(p) == 'Face']
skin = J['skins'][0]; joints = skin['joints']
name = lambda i: nodes[i].get('name', '').replace('mixamorig:', '')
JI = {name(j): k for k, j in enumerate(joints)}
IBM = g.acc(skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
Pw = lambda b: np.linalg.inv(IBM[JI[b]])[:3, 3]
SC = Pw('Hips')[1] / 0.842
import dau_mh   # khuôn đầu MakeHuman (CC0): giới tính + tuổi theo gioi-tuoi.json
gt = {}
gpath = os.path.join(TOOL, 'gioi-tuoi.json')
if os.path.exists(gpath): gt = json.load(open(gpath))
gioi, tuoi = gt.get(base, ['?', 38])
nu_ = {'nam': 0.0, 'nu': 1.0}.get(gioi, 0.5)

# ---------- ánh xạ (x, y) <-> (u, v) của ảnh mặt (chiếu thẳng) ----------
def co_dau_cu():
    """Tỉ lệ cỡ đầu cũ so với đầu chuẩn (đo bề ngang mặt ngang tầm mắt), dùng khi không tin được cỡ mắt trong ảnh."""
    ey_ = Pw('Head')[1] + 0.012 * SC   # ngang gò má: dưới vành nón, ít tóc
    A_ = np.concatenate([g.acc(p['attributes']['POSITION']).astype(float) for p in mesh['primitives'] if mname(p) not in ('Lining', 'Face')])
    nb = A_[np.abs(A_[:, 1] - ey_) < 0.02 * SC]
    if len(nb) < 30: return 1.0
    cx_ = np.median(nb[np.abs(nb[:, 0] - np.median(nb[:, 0])) < 0.15 * SC][:, 0]); nb = nb[np.abs(nb[:, 0] - cx_) < 0.13 * SC]
    w_old = np.percentile(nb[:, 0], 97) - np.percentile(nb[:, 0], 3)
    t_ = dau_mh.build(nu_, tuoi); H_ = t_['Head'][0]; et = t_['EyeLeft'][0].mean(0)[1]
    w_t = np.ptp(H_[np.abs(H_[:, 1] - (et - 0.031)) < 0.006][:, 0])
    return float(np.clip(w_old / (w_t * SC), 0.95, 1.1))
HS = float(json.load(open(os.path.join(TOOL, 'mat-chinh.json'))).get('_co_dau', {}).get(base, 1.0)) if os.path.exists(os.path.join(TOOL, 'mat-chinh.json')) else 1.0   # cỡ đầu chỉnh tay; co_dau_cu() đo chưa tin được (nón, tóc làm sai bề ngang); để cỡ chuẩn theo chiều cao người
def tex_of(p):
    ti = J['materials'][p.get('material', 0)]['pbrMetallicRoughness']['baseColorTexture']['index']; im0 = J['images'][J['textures'][ti]['source']]
    bv = J['bufferViews'][im0['bufferView']]; o = bv.get('byteOffset', 0)
    return Image.open(io.BytesIO(bytes(g.bin[o:o + bv['byteLength']]))).convert('RGB')
def chup_mat(S_=512):
    """Không có lớp ảnh mặt: tự chụp thẳng mặt (chiếu song song từ phía trước) từ chính lưới + texture của nhân vật."""
    hy_ = Pw('Head')[1]; y0, y1 = hy_ + 0.165 * SC, hy_ - 0.084 * SC
    allX = np.concatenate([g.acc(p['attributes']['POSITION']).astype(float) for p in mesh['primitives']])
    nb = allX[np.abs(allX[:, 1] - (hy_ + 0.06 * SC)) < 0.04 * SC]; hx_ = (np.percentile(nb[:, 0], 5) + np.percentile(nb[:, 0], 95)) / 2 if len(nb) > 30 else 0.0
    x0, x1 = hx_ - 0.101 * SC, hx_ + 0.101 * SC
    img = np.full((S_, S_, 3), 128.0); zb = np.full((S_, S_), np.inf)
    for p in mesh['primitives']:
        if 'TEXCOORD_0' not in p['attributes']: continue
        X = g.acc(p['attributes']['POSITION']).astype(float); U = g.acc(p['attributes']['TEXCOORD_0']).astype(float)
        I = g.acc(p['indices']).reshape(-1, 3).astype(np.int64); T = np.asarray(tex_of(p)).astype(float); th_, tw_ = T.shape[:2]
        px = (X[:, 0] - x0) / (x1 - x0) * S_; py = (y0 - X[:, 1]) / (y0 - y1) * S_
        for t in I[(px[I].max(1) > 0) & (px[I].min(1) < S_) & (py[I].max(1) > 0) & (py[I].min(1) < S_)]:
            ax, ay = px[t], py[t]
            c0, c1 = max(0, int(ax.min())), min(S_ - 1, int(ax.max()) + 1); r0, r1 = max(0, int(ay.min())), min(S_ - 1, int(ay.max()) + 1)
            if c1 < c0 or r1 < r0: continue
            gx, gy = np.meshgrid(np.arange(c0, c1 + 1) + 0.5, np.arange(r0, r1 + 1) + 0.5)
            d = (ay[1] - ay[2]) * (ax[0] - ax[2]) + (ax[2] - ax[1]) * (ay[0] - ay[2])
            if abs(d) < 1e-9: continue
            l0 = ((ay[1] - ay[2]) * (gx - ax[2]) + (ax[2] - ax[1]) * (gy - ay[2])) / d
            l1 = ((ay[2] - ay[0]) * (gx - ax[2]) + (ax[0] - ax[2]) * (gy - ay[2])) / d; l2 = 1 - l0 - l1
            m = (l0 >= -1e-4) & (l1 >= -1e-4) & (l2 >= -1e-4)
            if not m.any(): continue
            z = l0 * X[t[0], 2] + l1 * X[t[1], 2] + l2 * X[t[2], 2]
            sub = zb[r0:r1 + 1, c0:c1 + 1]; m &= z < sub   # mặt nhìn về −Z: gần người xem nhất là z nhỏ nhất
            if not m.any(): continue
            uu = l0 * U[t[0], 0] + l1 * U[t[1], 0] + l2 * U[t[2], 0]; vv = l0 * U[t[0], 1] + l1 * U[t[1], 1] + l2 * U[t[2], 1]
            col = T[np.clip((vv * th_).astype(int), 0, th_ - 1), np.clip((uu * tw_).astype(int), 0, tw_ - 1)]
            sub[m] = z[m]; img[r0:r1 + 1, c0:c1 + 1][m] = col[m]
    ku_ = np.array([1 / (x1 - x0), -x0 / (x1 - x0)]); kv_ = np.array([-1 / (y0 - y1), y0 / (y0 - y1)])
    return Image.fromarray(img.astype(np.uint8)), ku_, kv_, np.array([[hx_, hy_, 0.0]])
def ve_mat(cap):
    """Vẽ ảnh mặt thẳng (cùng khung với chup_mat): da trơn + mắt, mày, mũi, miệng; trên trán giữ nguyên tóc / nón của nhân vật."""
    C = np.asarray(cap).astype(float); S_ = C.shape[0]; hx_ = FX[0, 0]; hy_ = FX[0, 1]
    ed_ = 0.061 * SC * HS; ey_ = hy_ + 0.043 * SC; my_ = ey_ - (1.02 if nu_ > 0.5 else 1.1) * ed_
    P_ = lambda x, y: ((ku[0] * x + ku[1]) * S_, (kv[0] * y + kv[1]) * S_)
    R_, G_, B_ = C[..., 0], C[..., 1], C[..., 2]
    sk = (R_ > 95) & (G_ > 40) & (R_ > G_) & (G_ >= B_ - 5) & (R_ - B_ > 15) & (R_ - G_ < 90)
    x0p, y0p = P_(hx_ - 0.8 * ed_, ey_ + 0.1 * ed_); x1p, y1p = P_(hx_ + 0.8 * ed_, my_ - 0.4 * ed_)
    reg = sk[int(y0p):int(y1p), int(x0p):int(x1p)]
    skin = np.median(C[int(y0p):int(y1p), int(x0p):int(x1p)][reg], 0) if reg.sum() > 50 else np.array([200, 160, 130.])
    skin = 0.75 * skin + 0.25 * np.array([214, 172, 142.])   # kéo nhẹ về tông da sáng ấm, tránh bóng tối nướng sẵn
    gia = np.clip((tuoi - 45) / 25, 0, 1)
    K = 4; W_ = S_ * K
    im = Image.new('RGB', (W_, W_), tuple(int(c) for c in skin)); d = ImageDraw.Draw(im)
    Q = lambda x, y: tuple(v * K for v in P_(x, y)); L = lambda f: ed_ * f
    box = lambda a, b: [min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])]
    dark = tuple(int(c) for c in skin * 0.55); mid = tuple(int(c) for c in skin * 0.8)
    brow_c = (45, 35, 30) if gia < 0.6 else (120, 115, 110)
    for side in (-1, 1):
        cx_ = hx_ + side * 0.5 * ed_
        # mắt: lòng trắng hình hạnh nhân, tròng nâu đen, mí trên đậm
        ew, eh = L(0.24), L(0.075 if nu_ > 0.5 else 0.065)
        pts = [Q(cx_ + ew * np.cos(t), ey_ + eh * np.sin(t) * (1.0 if np.sin(t) > 0 else 0.7)) for t in np.linspace(0, 2 * np.pi, 40)]
        d.polygon(pts, fill=(232, 226, 218))
        ir, pr = L(0.085), L(0.04)
        d.ellipse(box(Q(cx_ - ir, ey_ + ir), Q(cx_ + ir, ey_ - ir)), fill=(58, 38, 28))
        d.ellipse(box(Q(cx_ - pr, ey_ + pr), Q(cx_ + pr, ey_ - pr)), fill=(18, 12, 10))
        d.line([Q(cx_ + ew * np.cos(t), ey_ + eh * np.sin(t)) for t in np.linspace(0.05, np.pi - 0.05, 20)], fill=(30, 22, 20), width=int(K * 2.2))
        d.line([Q(cx_ + ew * 0.9 * np.cos(t), ey_ + eh * 1.9 * np.sin(t)) for t in np.linspace(0.3, np.pi - 0.3, 16)], fill=mid, width=int(K * 1.2))   # nếp mí
        # mày
        bw = L(0.62 if nu_ < 0.5 else 0.55) / 2; bth = K * (4.2 if nu_ < 0.5 else 2.8)
        d.line([Q(cx_ + side * 0.05 * ed_ + bw * t, ey_ + L(0.36) + L(0.07) * (1 - t * t)) for t in np.linspace(-1, 1, 16)], fill=brow_c, width=int(bth))
        if gia > 0:   # nếp nhăn nhẹ đuôi mắt cho người lớn tuổi
            for k in range(2): d.line([Q(cx_ + side * L(0.3), ey_ - L(0.02 + 0.06 * k)), Q(cx_ + side * L(0.42), ey_ - L(0.05 + 0.08 * k))], fill=mid, width=int(K * 1.2 * gia + 1))
    # mũi: bóng hai cánh mũi + lỗ mũi
    ny = ey_ - L(0.62)
    for side in (-1, 1):
        d.arc(box(Q(hx_ + side * L(0.12), ny + L(0.1)), Q(hx_ + side * L(0.28), ny - L(0.06))), 0, 360, fill=mid, width=int(K * 1.5))
        d.ellipse(box(Q(hx_ + side * L(0.06), ny - L(0.02)), Q(hx_ + side * L(0.15), ny - L(0.06))), fill=dark)
    if gia > 0:   # rãnh mũi – má
        for side in (-1, 1): d.line([Q(hx_ + side * L(0.28), ny), Q(hx_ + side * L(0.4), my_ - L(0.05))], fill=mid, width=int(K * 1.5 * gia + 1))
    # miệng
    lip = np.array([178, 92, 88.]) if nu_ > 0.5 else skin * np.array([0.82, 0.66, 0.64])
    lip = tuple(int(c) for c in (0.55 * lip + 0.45 * skin * np.array([0.9, 0.7, 0.7])) * (1 - 0.2 * gia) + 0.2 * gia * skin)
    mw = L(0.36 if nu_ > 0.5 else 0.4)
    top = [Q(hx_ + mw * t, my_ + L(0.07) * (1 - abs(t)) ** 0.7 - L(0.025) * np.exp(-(t * 4) ** 2)) for t in np.linspace(-1, 1, 24)]
    bot = [Q(hx_ + mw * t, my_ - L(0.1) * (1 - t * t)) for t in np.linspace(1, -1, 24)]
    d.polygon(top + bot, fill=lip)
    d.line([Q(hx_ + mw * t, my_ - L(0.005) * (1 - t * t)) for t in np.linspace(-1, 1, 24)], fill=tuple(int(c * 0.6) for c in lip), width=int(K * 1.6))
    im = im.resize((S_, S_), Image.LANCZOS)
    A = np.asarray(im).astype(float)
    A = ndimage.gaussian_filter(A, (0.7, 0.7, 0))
    # trên trán: giữ tóc / nón / khăn của nhân vật (chỗ không phải da)
    _, yb = P_(hx_, ey_ + L(0.75))
    rows = np.arange(S_)[:, None]; keep = (rows < yb) & ~sk
    keep = ndimage.binary_opening(keep, iterations=2)
    A[keep] = C[keep]
    eu = [((ku[0] * (hx_ + sd * 0.5 * ed_) + ku[1]), (kv[0] * ey_ + kv[1])) for sd in (-1, 1)]   # ey_ theo cỡ chuẩn
    return {'img': Image.fromarray(np.clip(A, 0, 255).astype(np.uint8)), 'eyes': sorted(eu), 'mouth': (ku[0] * hx_ + ku[1], kv[0] * my_ + kv[1])}
def yunet_eyes(img):
    """Dò mặt bằng YuNet (OpenCV, mô hình MIT: yunet.onnx): trả về hai mắt và tâm miệng (toạ độ 0..1). Không có OpenCV thì None."""
    mp = os.path.join(TOOL, 'yunet.onnx')
    try:
        import cv2
    except Exception: return None
    if not os.path.exists(mp): return None
    a = np.asarray(img.convert('RGB'))[:, :, ::-1].copy(); h, w = a.shape[:2]; k = 1.0
    if max(h, w) < 640: k = 640 / max(h, w); a = cv2.resize(a, (int(w * k), int(h * k)), interpolation=cv2.INTER_CUBIC); h, w = a.shape[:2]
    try:
        d = cv2.FaceDetectorYN.create(mp, '', (w, h), 0.5); _, f = d.detect(a)
    except Exception: return None
    if f is None or not len(f): return None
    f = max(f, key=lambda r: r[14] * np.sqrt(r[2] * r[3]))   # mặt chắc chắn nhất (điểm tin cậy × cỡ)
    eyes = sorted([(f[4] / w, f[5] / h), (f[6] / w, f[7] / h)])
    return eyes, ((f[10] + f[12]) / 2 / w, (f[11] + f[13]) / 2 / h), (f[8] / w, f[9] / h), ((f[10] + f[12]) / 2 / w, (f[1] + f[3]) / h)
def chan_dung(path, cap):
    """Ảnh chân dung toàn thân (đầu tới chân) -> ảnh mặt cùng khung với chup_mat. Khớp: chiều cao người trong ảnh = chiều cao mô hình,
    rồi dò soi gương / lệch / cỡ sao cho giống hình chụp thẳng của chính mô hình nhất."""
    global ku, kv
    I_ = np.asarray(Image.open(path).convert('RGB')).astype(float); ph, pw = I_.shape[:2]
    band = I_[:, int(pw * 0.09):int(pw * 0.91)]
    bg = np.median(np.concatenate([I_[:, :int(pw * 0.06)], I_[:, -int(pw * 0.06):]], 1), 1)   # màu nền từng hàng (lấy ở hai mép ảnh, nền loang cũng được)
    m_ = np.abs(band - bg[:, None, :]).max(2) > 28
    rows = np.nonzero(m_.sum(1) > 5)[0]
    if len(rows) < 100: return None
    top, bot = rows[0], rows[-1]
    allX = np.concatenate([g.acc(p['attributes']['POSITION']).astype(float) for p in mesh['primitives']])
    ymax, ymin = allX[:, 1].max(), allX[:, 1].min(); ppm = (bot - top) / (ymax - ymin)
    hr = m_[top:top + int(0.08 * (bot - top))]
    cxp = np.median(np.nonzero(hr)[1]) + int(pw * 0.09) if hr.any() else pw / 2
    C = np.asarray(cap).astype(float); S_ = C.shape[0]
    gxs, gys = np.meshgrid((np.arange(S_) + 0.5) / S_, (np.arange(S_) + 0.5) / S_)
    X_ = (gxs - ku[1]) / ku[0]; Y_ = (gys - kv[1]) / kv[0]   # toạ độ mô hình của từng điểm ảnh khung mặt
    hx_ = FX[0, 0]
    from scipy.ndimage import map_coordinates
    def samp(mir, sc, dx, dy, n=S_):
        st = S_ // n
        xx, yy = X_[::st, ::st], Y_[::st, ::st]
        pu_ = cxp + mir * (xx - hx_) * ppm * sc + dx * ppm; pv_ = top + (ymax - yy) * ppm * sc + dy * ppm
        return np.stack([map_coordinates(I_[..., k], [pv_, pu_], order=1, mode='nearest') for k in range(3)], -1)
    Cs = ndimage.gaussian_filter(C[::4, ::4], (1.5, 1.5, 0)); valid_ = np.abs(Cs - 128).sum(-1) > 6
    best = None
    for mir in (1, -1):
        for sc in (0.97, 1.0, 1.03):   # ảnh toàn thân đã khớp chiều cao người: chỉ tinh chỉnh nhẹ, giữ tầm mắt / cổ đúng như ảnh
            for dx in np.linspace(-0.015, 0.015, 5) * SC:
                for dy in np.linspace(-0.012, 0.012, 5) * SC:
                    A_ = ndimage.gaussian_filter(samp(mir, sc, dx, dy, S_ // 4), (1.5, 1.5, 0))
                    e = np.abs(A_ - Cs)[valid_].mean()
                    if best is None or e < best[0]: best = (e, mir, sc, dx, dy)
    e, mir, sc, dx, dy = best
    # ảnh mặt ra: khung rộng gấp 1,5 (giữ tâm) để mặt lệch trong ảnh vẫn không bị cắt
    ku = np.array([ku[0] / 1.5, 0.5 + (ku[1] - 0.5) / 1.5]); kv = np.array([kv[0] / 1.5, 0.5 + (kv[1] - 0.5) / 1.5])
    X_[:] = (gxs - ku[1]) / ku[0]; Y_[:] = (gys - kv[1]) / kv[0]
    # mốc mặt dò trên ảnh chân dung gốc (đủ ngữ cảnh, chắc hơn dò trên ảnh đã cắt), quy về khung ảnh mặt
    global CD_YU
    yu = yunet_eyes(Image.fromarray(I_.astype(np.uint8)))
    if yu:
        def to_uv(q):
            x = hx_ + (q[0] * pw - cxp - dx * ppm) / (mir * ppm * sc); y = ymax - (q[1] * ph - top - dy * ppm) / (ppm * sc)
            return (ku[0] * x + ku[1], kv[0] * y + kv[1])
        CD_YU = (sorted([to_uv(yu[0][0]), to_uv(yu[0][1])]), to_uv(yu[1]), to_uv(yu[2]), to_uv(yu[3]))
    return Image.fromarray(np.clip(samp(mir, sc, dx, dy), 0, 255).astype(np.uint8)), 'chân dung (%s, cỡ %.2f, lệch %.0f/%.0f mm)' % ('soi gương' if mir < 0 else 'thẳng', sc, dx * 1000, dy * 1000)
VE = None; CD_YU = None
CD = os.environ.get('DAU_CHAN_DUNG') or os.path.join(TOOL, 'chan-dung')   # thư mục ảnh chân dung toàn thân <mã>.jpg
cd_path = os.path.join(CD, base + '.jpg') if CD else None
_mc = json.load(open(os.path.join(TOOL, 'mat-chinh.json'))) if os.path.exists(os.path.join(TOOL, 'mat-chinh.json')) else {}
if cd_path and os.path.exists(cd_path): fps = []   # có ảnh chân dung gốc: tốt hơn lớp ảnh mặt cắt sẵn trong mô hình
elif base in _mc.get('_ve_mat', []): fps = []; cd_path = None   # lớp ảnh mặt hỏng (cắt mất nửa mặt...): vẽ mặt cho tới khi có ảnh chân dung
if fps:
    fp = fps[0]
    FX = g.acc(fp['attributes']['POSITION']).astype(float); FU = g.acc(fp['attributes']['TEXCOORD_0']).astype(float)
    ins = (FU > 0.003).all(1) & (FU < 0.997).all(1)
    ku = np.linalg.lstsq(np.c_[FX[ins, 0], np.ones(ins.sum())], FU[ins, 0], rcond=None)[0]
    kv = np.linalg.lstsq(np.c_[FX[ins, 1], np.ones(ins.sum())], FU[ins, 1], rcond=None)[0]
    tex = tex_of(fp); anh_mat = 'ảnh mặt có sẵn'
cdr = None
if not fps and cd_path and os.path.exists(cd_path):   # có ảnh chân dung toàn thân: cắt vùng đầu làm ảnh mặt
    cap, ku, kv, FX = chup_mat(); cdr = chan_dung(cd_path, cap)
    if cdr: tex, anh_mat = cdr
if not (fps or cdr):   # không có ảnh mặt (mặt máy tạo méo, không dùng được): vẽ một khuôn mặt sạch, màu da / tóc / nón lấy từ chính nhân vật
    cap, ku, kv, FX = chup_mat(); anh_mat = 'mặt vẽ (không có ảnh chân dung)'
    VE = ve_mat(cap)
    tex = VE['img']
uv = lambda x, y: (ku[0] * x + ku[1], kv[0] * y + kv[1])
xy = lambda u, v: ((u - ku[1]) / ku[0], (v - kv[1]) / kv[0])
TA = np.asarray(tex).astype(float); TH, TW = TA.shape[:2]

# ---------- tìm hai mắt trên ảnh ----------
def find_eyes():
    T = np.asarray(tex.resize((256, 256))).astype(float); R_, G_, B_ = T[..., 0], T[..., 1], T[..., 2]
    sk = (R_ > 95) & (G_ > 40) & (B_ > 20) & (R_ > G_) & (G_ >= B_ - 5) & (R_ - B_ > 15) & (R_ - G_ < 90)
    sk = ndimage.binary_opening(sk, iterations=2); lab, n = ndimage.label(sk)
    if n == 0: return None
    c0 = lab[96:200, 96:160]; ids, cnt = np.unique(c0[c0 > 0], return_counts=True)
    if not len(ids): return None
    face = lab == ids[np.argmax(cnt)]; filled = ndimage.binary_fill_holes(ndimage.binary_closing(face, iterations=6))
    ftop = np.nonzero(face.sum(1) > 0)[0].min()
    W = np.percentile([face[r].sum() for r in range(ftop, min(256, ftop + 90))], 90); cx = np.median(np.nonzero(face[ftop + 20:ftop + 70])[1])
    L = T.mean(2); L = np.where((T.max(2) < 20) | ~filled, np.median(L[face]), L)
    D = ndimage.gaussian_filter(L, max(1.5, W * 0.025)) - ndimage.gaussian_filter(L, max(4, W * 0.09))
    best = []
    for y in range(int(ftop + 0.08 * W), int(min(250, ftop + 0.85 * W))):
        for c in np.arange(cx - 0.06 * W, cx + 0.06 * W + 1e-6, max(1, W * 0.02)):
            for dx in np.arange(0.13 * W, 0.27 * W, max(1, W * 0.015)):
                xl, xr = int(c - dx), int(c + dx)
                if 1 <= xl and xr <= 254: best.append((D[y, xl] + D[y, xr] + 0.5 * abs(D[y, xl] - D[y, xr]), y, xl, xr))
    best.sort(); col = filled[:, int(cx)]
    best = [b for b in best if col[int(b[1]):int(min(256, b[1] + 0.6 * W))].mean() > 0.85] or best
    b0 = best[0]
    for sc, y, xl, xr in best[:400]:
        if b0[1] + 0.08 * W < y < b0[1] + 0.25 * W and sc < b0[0] * 0.6 and abs((xl + xr) / 2 - (b0[2] + b0[3]) / 2) < 0.08 * W:
            b0 = (sc, y, xl, xr); break
    ey = b0[1]; mc = (b0[2] + b0[3]) / 2; hw2 = max(3, 0.12 * W)
    rows = range(int(ey + 0.38 * W), int(min(254, ey + 0.8 * W)))
    prof = [(L[r, int(mc - hw2):int(mc + hw2)].mean(), r) for r in rows] if len(rows) else []
    my = min(prof)[1] if prof else ey + 0.55 * W   # miệng: dòng tối nhất dưới mũi
    return [(b0[2] / 256, b0[1] / 256), (b0[3] / 256, b0[1] / 256)], face, W / 256, (mc / 256, my / 256)
fix = {}
fpath = os.path.join(TOOL, 'mat-chinh.json')
if os.path.exists(fpath): fix = json.load(open(fpath))
found = find_eyes() if VE is None else None
YU = (CD_YU if cdr and CD_YU else yunet_eyes(tex)) if VE is None else None
if VE is not None: eyes_uv = VE['eyes']; src_e = 'vẽ sẵn'
elif base in fix and isinstance(fix[base], list) and len(fix[base]) >= 2 and not YU: eyes_uv = fix[base]; src_e = 'chấm tay'
elif YU: eyes_uv = YU[0]; src_e = 'YuNet'
elif base in fix and isinstance(fix[base], list) and len(fix[base]) >= 2: eyes_uv = fix[base]; src_e = 'chấm tay'
elif found: eyes_uv = found[0]; src_e = 'tự tìm'
else: print('khong-thay-mat'); sys.exit(3)
# ảnh mặt đặt lệch cỡ / lệch chỗ so với đầu thật (mắt trong ảnh quá to, quá nhỏ): đặt lại khung ảnh cho hai mắt rơi đúng chỗ mắt chuẩn
reframed = False
if VE is None and not cdr:   # ảnh chân dung toàn thân: tầm mắt lấy đúng theo ảnh, không đặt lại
    (u0_, v0_), (u1_, v1_) = sorted(eyes_uv); ed_img = abs(u1_ - u0_)
    ey_img = xy(0, (v0_ + v1_) / 2)[1]   # tầm mắt theo khung ảnh hiện tại
    if abs(ey_img - (Pw('Head')[1] + 0.043 * SC)) > 0.03 * SC:
        hx_ = np.median(FX[:, 0]); ey_ = Pw('Head')[1] + 0.043 * SC
        k0 = np.sign(ku[0]) * ed_img / (0.061 * SC * HS); kv0 = kv[0] * k0 / ku[0]
        ku = np.array([k0, (u0_ + u1_) / 2 - k0 * hx_]); kv = np.array([kv0, (v0_ + v1_) / 2 - kv0 * ey_]); reframed = True
if os.environ.get('DAU_DEBUG'):   # ảnh mặt + mắt tìm được, để soát
    dbg = tex.convert('RGB').copy(); dr = ImageDraw.Draw(dbg)
    for u_, v_ in eyes_uv: dr.ellipse([u_ * TW - 6, v_ * TH - 6, u_ * TW + 6, v_ * TH + 6], outline=(255, 0, 0), width=3)
    dbg.save(os.environ['DAU_DEBUG'])
E = np.array([xy(u, v) for u, v in eyes_uv])   # hai mắt (x, y) trên nhân vật
MO = None
if VE is not None: MO = np.array(xy(*VE['mouth']))
elif YU: MO = np.array(xy(*YU[1]))
elif base in fix and len(fix[base]) > 2: MO = np.array(xy(*fix[base][2]))
elif found and base not in fix: MO = np.array(xy(*found[3]))
if E[0, 0] > E[1, 0]: E = E[::-1]

# ---------- đầu mẫu ----------
# dáng mặt (rộng / cằm) đo từ ảnh chân dung
def mh_width(parts, rows):   # nửa bề ngang mặt trước (đơn vị: khoảng cách hai mắt) tại các hàng dưới mắt
    H = parts['Head'][0]; el, er = parts['EyeLeft'][0].mean(0), parts['EyeRight'][0].mean(0); ed_ = abs(el[0] - er[0]); ey_ = (el[1] + er[1]) / 2
    fr_ = H[H[:, 2] > el[2] - 0.6 * ed_]
    return np.array([np.abs(fr_[np.abs(fr_[:, 1] - (ey_ - r * ed_)) < 0.08 * ed_, 0]).max() / ed_ for r in rows])
def face_width(rows):   # nửa bề ngang khuôn da trên ảnh tại cùng các hàng (chỉ đoạn liền qua giữa mặt)
    face, (u0, v0), (u1, v1) = found[1], eyes_uv[0], eyes_uv[1]
    ed_ = abs(u1 - u0) * 256; cxp = (u0 + u1) / 2 * 256; eyp = (v0 + v1) / 2 * 256; out = []
    for r in rows:
        y = int(round(eyp + r * ed_))
        if not (0 <= y < 256) or not face[y, int(cxp)]: return None
        row = face[y]; l = int(cxp); rr = int(cxp)
        while l > 0 and row[l - 1]: l -= 1
        while rr < 255 and row[rr + 1]: rr += 1
        out.append((rr - l + 1) / 2 / ed_)
    return np.array(out)
ROWS = (0.45, 0.9)   # gò má, ngang miệng
shape = {}
fw = face_width(ROWS) if found and (YU or base not in fix) else None
if fw is not None and (0.5 < fw).all() and (fw < 1.6).all():
    w0 = mh_width(dau_mh.build(nu_, tuoi), ROWS)
    Jm = np.stack([mh_width(dau_mh.build(nu_, tuoi, {k: 0.5}), ROWS) - mh_width(dau_mh.build(nu_, tuoi, {k: -0.5}), ROWS) for k in ('rong', 'cam_rong')], 1)
    x = np.linalg.lstsq(Jm, fw - w0, rcond=None)[0]
    shape = {k: float(np.clip(0.7 * v, -0.6, 0.6)) for k, v in zip(('rong', 'cam_rong'), x)}
if not shape:   # không đo được trên ảnh: dáng riêng cố định theo mã nhân vật cho đỡ giống nhau
    import zlib
    rs = np.random.default_rng(zlib.crc32(base.encode()))
    shape = {'rong': float(rs.uniform(-0.45, 0.45)), 'cam_rong': float(rs.uniform(-0.45, 0.45)), 'gomag': float(rs.uniform(-0.4, 0.4))}
parts = dau_mh.build(nu_, tuoi, shape)
V, N, F = [], [], []; off = 0
for k in ('Head', 'EyeLeft', 'EyeRight'):
    X, Nn, I = parts[k]; V.append(X); N.append(Nn); F.append(I + off); off += len(X)
V = np.concatenate(V); N = np.concatenate(N); F = np.concatenate(F)
nhead = len(parts['Head'][0])
V[:, [0, 2]] *= -1; N[:, [0, 2]] *= -1   # đầu mẫu nhìn về +Z, nhân vật nhìn về −Z
TE = np.array([parts['EyeRight'][0].mean(0), parts['EyeLeft'][0].mean(0)]); TE[:, [0, 2]] *= -1
if TE[0, 0] > TE[1, 0]: TE = TE[::-1]
# co giãn + nghiêng theo hai mắt
dE, dT = E[1] - E[0], TE[1, :2] - TE[0, :2]
s = np.linalg.norm(dE) / np.linalg.norm(dT)
s_ok = 0.85 <= s / SC <= 1.25
if not s_ok: s = SC * 1.0   # mắt chấm lệch quá: giữ cỡ đầu theo chiều cao người
roll = np.clip(np.arctan2(dE[1], dE[0]) - np.arctan2(dT[1], dT[0]), -0.25, 0.25)
cr, sr = np.cos(roll), np.sin(roll)
mT = TE.mean(0); mE = E.mean(0)
# đặt đầu mới đúng chỗ đầu cũ (ảnh chụp nghiêng làm mắt trong ảnh lệch khỏi đầu thật); ảnh được dịch theo
Bh = np.concatenate([g.acc(p['attributes']['POSITION']).astype(float) for p in mesh['primitives'] if mname(p) not in ('Lining', 'Face')])
hx0 = np.median(FX[:, 0]); ring = Bh[(np.abs(Bh[:, 1] - mE[1]) < 0.03 * SC) & (np.abs(Bh[:, 0] - hx0) < 0.12 * SC) & (Bh[:, 2] < np.median(Bh[:, 2]))]   # lớp mặt cũ nằm đúng chỗ đầu thật (xương đầu có khi lệch)
headx = (np.percentile(ring[:, 0], 5) + np.percentile(ring[:, 0], 95)) / 2 if len(ring) > 30 else hx0
SHX = headx - mE[0] if abs(headx - mE[0]) > 0.015 * SC else 0.0
mE = mE + np.array([SHX, 0]); E = E + np.array([SHX, 0])
if MO is not None: MO = MO + np.array([SHX, 0])
TM = parts['mouth'].copy(); TM[[0, 2]] *= -1   # miệng đầu mẫu (răng trên)
sy = s
if MO is not None:
    sy0 = (mE[1] - MO[1]) / (mT[1] - TM[1])
    if 0.85 * s < sy0 < 1.25 * s: sy = sy0
# khuôn đầu giữ tỉ lệ người thật (kéo dài tối đa vài phần trăm); phần chênh còn lại thì co giãn ẢNH quanh tâm hai mắt
# để mắt, miệng trong ảnh rơi đúng mắt, miệng của đầu mẫu (không còn mặt dài, mắt mũi lệch chỗ)
sy_t = float(np.clip(sy, 0.96 * s, 1.05 * s))
fx = float(np.clip(np.linalg.norm(dE) / (np.linalg.norm(dT) * s), 0.6, 1.6))
fy = fx
if MO is not None and 0.85 * s * fx < (mE[1] - MO[1]) / (mT[1] - TM[1]) < 1.25 * s * fx:   # miệng tìm được hợp lý (không lẫn cằm, mũi)
    fy = float(np.clip((mE[1] - MO[1]) / ((mT[1] - TM[1]) * sy_t), 0.6, 1.6))
cx0, cy0 = mE[0] - SHX, mE[1]
ku = np.array([ku[0] * fx, ku[1] + ku[0] * cx0 * (1 - fx)]); kv = np.array([kv[0] * fy, kv[1] + kv[0] * cy0 * (1 - fy)])
sy = sy_t
P = (V - mT) * np.array([s, sy, (s + sy) / 2])
P[:, :2] = P[:, :2] @ np.array([[cr, sr], [-sr, cr]])
# độ sâu: mắt mới nằm ngang bề mặt mặt cũ quanh hai mắt
B = np.concatenate([g.acc(p['attributes']['POSITION']).astype(float) for p in mesh['primitives'] if mname(p) not in ('Lining',)])
near = B[(np.abs(B[:, 0] - mE[0]) < 0.035 * SC) & (np.abs(B[:, 1] - mE[1]) < 0.025 * SC)]
ze = np.percentile(near[:, 2], 10) if len(near) else B[:, 2].min()
P += np.array([mE[0], mE[1], ze + 0.004 * SC])
Nr = N.copy(); Nr[:, :2] = Nr[:, :2] @ np.array([[cr, sr], [-sr, cr]])
# phần đầu mẫu trên mắt không được thò ra ngoài bề mặt cũ (nón lá, khăn, tóc): co vào theo hướng từ tâm đầu
from scipy.spatial import cKDTree
hc0 = np.array([mE[0], mE[1], np.median(P[:, 2])])
orig = B[np.linalg.norm(B - hc0, axis=1) < 0.25 * SC]
od = orig - hc0; orr = np.linalg.norm(od, axis=1); odn = od / orr[:, None]
tree = cKDTree(odn)
up = P[:, 1] > mE[1] + 0.01 * s
vd = P - hc0; vr = np.linalg.norm(vd, axis=1); vdn = vd / np.maximum(vr, 1e-9)[:, None]
shrink = np.ones(len(P))
for i in np.nonzero(up)[0]:
    nb = tree.query_ball_point(vdn[i], 0.12)
    if len(nb) < 5: continue
    lim = np.percentile(orr[nb], 95) - 0.006 * SC   # mặt ngoài cùng (vỏ nón, tóc ngoài)
    if vr[i] > lim: shrink[i] = max(0.75, lim / vr[i])
shrink = np.minimum(shrink, 1.0)
P = hc0 + vd * shrink[:, None]
ncut = int((shrink < 0.999).sum())

# ---------- màu da, màu tóc lấy từ ảnh ----------
T2 = TA.reshape(-1, 3)
if found:
    fm = np.asarray(Image.fromarray(found[1].astype(np.uint8) * 255).resize((TW, TH))) > 127
    skin_c = np.median(TA[fm], 0)
else: skin_c = np.array([196, 150, 120.])
# tóc: ngay trên trán giữa mặt; nếu là nón / khăn / nền xám thì dùng màu tóc đen nâu
# tóc / nón / khăn: vùng trên mắt trong ảnh, bỏ da, nền xám, lỗ đen; không có thì tóc đen nâu
hair_c = np.array([38, 30, 25.])
ua_, va_ = uv(mE[0] - SHX - 0.07 * s, mE[1] + 0.20 * s); ub_, vb_ = uv(mE[0] - SHX + 0.07 * s, mE[1] + 0.07 * s)
r0, r1 = sorted([int(np.clip(va_, 0, 1) * TH), int(np.clip(vb_, 0, 1) * TH)]); c0_, c1_ = sorted([int(np.clip(ua_, 0, 1) * TW), int(np.clip(ub_, 0, 1) * TW)])
band = TA[r0:max(r0 + 1, r1), c0_:max(c0_ + 1, c1_)].reshape(-1, 3)
R1, G1, B1 = band[:, 0], band[:, 1], band[:, 2]
isskin = (R1 > 95) & (G1 > 40) & (R1 > G1) & (G1 >= B1 - 5) & (R1 - B1 > 15) & (R1 - G1 < 90)
isgrey = (np.abs(R1 - G1) < 7) & (np.abs(G1 - B1) < 7) & (R1 > 95) & (R1 < 170)
okb = band[(band.max(1) > 18) & ~isskin & ~isgrey]
if len(okb) > 0.08 * len(band) and len(okb) > 30: hair_c = np.median(okb, 0)

def width_ratios(Ph_):
    """Tỉ lệ bề ngang mặt trong ảnh / đầu 3D theo từng hàng, hai phía (cột 0: phía u nhỏ, cột 1: phía u lớn)."""
    Mk = ndimage.binary_fill_holes(ndimage.binary_closing(found[1], iterations=4))
    edt_ = np.linalg.norm(dT) * s
    ys_ = np.arange(mE[1] + 0.3 * edt_, mE[1] - 2.0 * edt_, -0.04 * edt_)
    cxm = mE[0]; uc, _ = uv(cxm - SHX, mE[1])
    rat = np.full((len(ys_), 2), np.nan)
    for i, y in enumerate(ys_):
        band_ = Ph_[np.abs(Ph_[:, 1] - y) < 0.03 * edt_]
        if len(band_) < 4: continue
        _, v_ = uv(0, y); r_ = int(v_ * 256); c_ = int(uc * 256)
        if not (0 <= r_ < 256 and 0 <= c_ < 256) or not Mk[r_, c_]: continue
        row = Mk[r_]; l_ = c_; rr_ = c_
        while l_ > 0 and row[l_ - 1]: l_ -= 1
        while rr_ < 255 and row[rr_ + 1]: rr_ += 1
        for side, xs in ((1, band_[:, 0] - cxm), (-1, cxm - band_[:, 0])):
            hw = xs.max()
            if hw <= 0.2 * edt_: continue
            k = 1 if side * ku[0] > 0 else 0
            rat[i, k] = (((rr_ - c_) if k == 1 else (c_ - l_)) / 256) / (hw * abs(ku[0]))
    return rat, ys_, edt_, cxm, uc
# đầu khuôn rộng hơn mặt trong ảnh nhiều: thu hẹp má, hàm, hai bên sọ (giữ vùng mắt), phần chênh nhỏ còn lại để ảnh tự khớp
squash = ''
if found is not None and VE is None:
    rat0, ys0, edt0, cx0_, _ = width_ratios(P[:nhead])
    sel = (ys0 < mE[1] - 0.2 * edt0) & (ys0 > mE[1] - 1.6 * edt0)
    fs = []
    for k in range(2):
        v_ = rat0[sel, k]; v_ = v_[np.isfinite(v_)]
        fs.append(float(np.clip(np.median(v_), 0.82, 1.0)) if len(v_) >= 4 else 1.0)
    if min(fs) < 0.97:
        dx_ = P[:, 0] - cx0_; side_k = np.where(dx_ * ku[0] > 0, 1, 0)
        f_ = np.where(side_k == 1, fs[1], fs[0])
        w_ = np.clip((np.abs(dx_) - 0.55 * edt0) / (0.5 * edt0), 0, 1)
        w_[nhead:] = 0   # nhãn cầu giữ nguyên
        P[:, 0] = cx0_ + dx_ * (1 - (1 - f_) * w_)
        squash = 'thu hẹp đầu %.2f/%.2f, ' % (fs[0], fs[1])
# mặt dưới: ảnh AI vẽ phần mũi–cằm ngắn hơn khuôn; rút ngắn khuôn từ chóp mũi xuống cho miệng khuôn trùng miệng ảnh
# (không thì cằm ảnh vẽ lên giữa hàm khuôn, phần hàm thừa bên dưới thành "hai cằm"); cổ nối lại êm
lower = ''
if VE is None and MO is not None:
    edt_l = np.linalg.norm(dT) * s; Ph_ = P[:nhead]
    cc_ = Ph_[(np.abs(Ph_[:, 0] - mE[0]) < 0.1 * edt_l) & (Ph_[:, 1] < mE[1] - 0.3 * edt_l) & (Ph_[:, 1] > mE[1] - 1.0 * edt_l)]
    ym_l = mE[1] - (mT[1] - TM[1]) * sy
    if len(cc_):
        yn_l = cc_[np.argmin(cc_[:, 2]), 1]
        if ym_l < MO[1] < yn_l:
            fz = float(np.clip((yn_l - MO[1]) / (yn_l - ym_l), 0.7, 1.0))
            if fz < 0.98:
                dch = 1.0 * edt_l   # từ chóp mũi tới đáy cằm khuôn (xấp xỉ)
                d_ = yn_l - P[:nhead, 1]
                new_d = np.where(d_ <= 0, d_, np.where(d_ <= dch, d_ * fz, dch * fz + (d_ - dch) * (1 + (1 - fz) * dch / (1.2 * edt_l))))
                lim = dch + 1.2 * edt_l   # dưới mức này (chân cổ) giữ nguyên
                new_d = np.where(d_ > lim, d_, new_d)
                P[:nhead, 1] = yn_l - new_d
                TM = TM.copy(); TM[1] = mT[1] - (mE[1] - (yn_l - (yn_l - ym_l) * fz)) / sy   # miệng khuôn mới
                ym_new = yn_l - (yn_l - ym_l) * fz
                fy2 = (mE[1] - MO[1]) / max(mE[1] - ym_new, 1e-6)
                if abs(fy2 - 1) > 0.02:   # còn lệch (đã chạm giới hạn rút): co giãn ảnh theo chiều dọc quanh tầm mắt cho miệng ảnh rơi đúng miệng khuôn
                    fy2 = float(np.clip(fy2, 0.8, 1.25)); kv = np.array([kv[0] * fy2, kv[1] + kv[0] * mE[1] * (1 - fy2)])
                lower = 'rút mặt dưới %.2f, ' % fz
# hàm dưới: khuôn có phần dưới cằm thoải dài xuống cổ, nhìn thẳng thành "hai cằm" dưới cằm trong ảnh.
# Lấy cằm ảnh (dưới miệng ~0,76 khoảng cách mắt) làm mép cằm, phần dưới cằm ép về sát mặt trước cổ (góc hàm gọn)
jaw = ''
if VE is None:
    edt_j = np.linalg.norm(dT) * s; Ph_ = P[:nhead]; cxj = mE[0]
    ym_t = mE[1] - (mT[1] - TM[1]) * sy
    chin_y = ym_t - 0.78 * edt_j
    if YU and len(YU) > 3: chin_y = xy(*YU[3])[1]   # cằm ảnh (đáy khung mặt YuNet)
    nb_ = Ph_[(np.abs(Ph_[:, 0] - cxj) < 0.25 * edt_j) & (Ph_[:, 1] < chin_y - 0.6 * edt_j) & (Ph_[:, 1] > chin_y - 1.0 * edt_j)]
    if len(nb_) > 5:
        zneck = np.percentile(nb_[:, 2], 5)   # mặt trước cổ (nhìn về −Z)
        sel_ = (np.arange(len(P)) < nhead) & (P[:, 1] < chin_y + 0.08 * edt_j) & (P[:, 2] < zneck) & (np.abs(P[:, 0] - cxj) < 1.1 * edt_j)
        g_ = np.clip((P[sel_, 1] - (chin_y - 0.3 * edt_j)) / (0.38 * edt_j), 0, 1) ** 1.5
        P[sel_, 2] = zneck + (P[sel_, 2] - zneck) * g_
        jaw = 'gọn hàm %d đỉnh, ' % int((g_ < 0.98).sum())
# ---------- UV: đầu trải hình trụ (phần trên ảnh), hai nhãn cầu chiếu thẳng (dải dưới ảnh) ----------
VH = 0.875   # đầu dùng v trong [0, VH]; dải dưới cho hai mắt
nel = len(parts['EyeLeft'][0])
hc = P[:nhead]; cx, cz = np.median(hc[:, 0]), np.median(hc[:, 2]) + 0.01 * s
th = np.arctan2(P[:, 0] - cx, -(P[:, 2] - cz)); ymin, ymax = P[:nhead, 1].min(), P[:nhead, 1].max()
U = th / (2 * np.pi) + 0.5; Vv = (ymax - P[:, 1]) / (ymax - ymin) * VH
EYE = []   # (lát đỉnh, tâm, nửa cạnh, góc ô trên ảnh)
for k, sl in enumerate((slice(nhead, nhead + nel), slice(nhead + nel, len(P)))):
    c_ = P[sl].mean(0); h_ = np.abs(P[sl, :2] - c_[:2]).max() * 1.05; u0_ = 0.125 * k
    U[sl] = u0_ + 0.0625 + (P[sl, 0] - c_[0]) / h_ * 0.06; Vv[sl] = VH + 0.0625 - (P[sl, 1] - c_[1]) / h_ * 0.06
    EYE.append((c_, h_, u0_))
# vá đường nối sau gáy: tam giác vắt qua thì nhân đôi đỉnh với u + 1 (ảnh lặp)
Fl = F.copy(); extra = []
wrap = (U[F].max(1) - U[F].min(1)) > 0.5
for t in np.nonzero(wrap)[0]:
    for k in range(3):
        vi = F[t, k]
        if U[vi] < 0.5: extra.append(vi); Fl[t, k] = len(P) + len(extra) - 1
ex = np.array(extra, np.int64)
P2 = np.concatenate([P, P[ex]]); N2 = np.concatenate([Nr, Nr[ex]]); UV = np.stack([np.concatenate([U, U[ex] + 1]), np.concatenate([Vv, Vv[ex]])], 1)
S = 1024
# mỗi điểm ảnh của đầu -> đúng điểm trên bề mặt đầu (vẽ từng tam giác trong không gian UV), không còn nội suy trụ sinh sọc / mắt ma
G3 = np.zeros((S, S, 6)); cov = np.zeros((S, S), bool); zb = np.full((S, S), -1.0)   # nếp gấp chồng nhau: giữ lớp ngoài cùng (xa trục đầu nhất)
Nn2 = N2 / np.linalg.norm(N2, axis=1, keepdims=True)
for t in Fl[(F < nhead).all(1)]:
    q = UV[t] * S; A3 = np.c_[P2[t], Nn2[t]]
    for off in (0.0, -S) if q[:, 0].max() > S else (0.0,):
        ax, ay = q[:, 0] + off, q[:, 1]
        c0, c1 = max(0, int(np.floor(ax.min()))), min(S - 1, int(np.ceil(ax.max()))); r0, r1 = max(0, int(np.floor(ay.min()))), min(S - 1, int(np.ceil(ay.max())))
        if c1 < c0 or r1 < r0: continue
        gx, gy = np.meshgrid(np.arange(c0, c1 + 1) + 0.5, np.arange(r0, r1 + 1) + 0.5)
        d = (ay[1] - ay[2]) * (ax[0] - ax[2]) + (ax[2] - ax[1]) * (ay[0] - ay[2])
        if abs(d) < 1e-12: continue
        l0 = ((ay[1] - ay[2]) * (gx - ax[2]) + (ax[2] - ax[1]) * (gy - ay[2])) / d
        l1 = ((ay[2] - ay[0]) * (gx - ax[2]) + (ax[0] - ax[2]) * (gy - ay[2])) / d; l2 = 1 - l0 - l1
        m = (l0 >= -0.02) & (l1 >= -0.02) & (l2 >= -0.02)
        if not m.any(): continue
        val = l0[..., None] * A3[0] + l1[..., None] * A3[1] + l2[..., None] * A3[2]
        rr_ = np.hypot(val[..., 0] - cx, val[..., 2] - cz); sub = zb[r0:r1 + 1, c0:c1 + 1]; m &= rr_ > sub
        if not m.any(): continue
        sub[m] = rr_[m]; G3[r0:r1 + 1, c0:c1 + 1][m] = val[m]; cov[r0:r1 + 1, c0:c1 + 1] |= m
# hai ô mắt: điểm (x, y) chiếu thẳng
gx, gy = np.meshgrid((np.arange(S) + 0.5) / S, (np.arange(S) + 0.5) / S)
for c_, h_, u0_ in EYE:
    m = (gx >= u0_) & (gx < u0_ + 0.125) & (gy >= VH) & (gy < VH + 0.125)
    G3[m, 0] = c_[0] + (gx[m] - u0_ - 0.0625) / 0.06 * h_; G3[m, 1] = c_[1] - (gy[m] - VH - 0.0625) / 0.06 * h_; G3[m, 2] = c_[2] - h_
    G3[m, 3:] = [0, 0, -1]; cov |= m
if (~cov).any():
    idx = ndimage.distance_transform_edt(~cov, return_distances=False, return_indices=True); G3 = G3[tuple(idx)]
X3, yq, Z3 = G3[..., 0], G3[..., 1], G3[..., 2]; nfront = -G3[..., 5]
tq = np.arctan2(X3 - cx, -(Z3 - cz))
pu, pv = uv(X3 - SHX, yq)
# chóp mũi: dời phần giữa mắt và miệng của ảnh cho mũi trong ảnh nằm đúng chóp mũi của đầu (không còn bóng lỗ mũi trên môi)
nose_fix = 0.0
if YU and VE is None:
    Ph_ = P[:nhead]; edt = np.linalg.norm(dT) * s
    cc = Ph_[np.abs(Ph_[:, 0] - mE[0]) < 0.1 * edt]
    cc = cc[(cc[:, 1] < mE[1] - 0.3 * edt) & (cc[:, 1] > mE[1] - 1.0 * edt)]
    if len(cc):
        yn_t = cc[np.argmin(cc[:, 2]), 1]   # điểm nhô ra trước nhất (mặt nhìn về −Z)
        ym_t = mE[1] - (mT[1] - TM[1]) * sy
        vn_img = YU[2][1]; _, vn_lin = uv(0, yn_t)
        if ym_t < yn_t < mE[1]:
            r_ = vn_img - vn_lin; nose_fix = r_
            tri = np.where(yq >= yn_t, np.clip((mE[1] - yq) / (mE[1] - yn_t), 0, 1), np.clip((yq - ym_t) / (yn_t - ym_t), 0, 1))
            pv = pv + r_ * tri
um = np.mean([u for u, v in eyes_uv]); de = abs(eyes_uv[1][0] - eyes_uv[0][0])   # tâm mắt, khoảng cách hai mắt trong ảnh (chưa dịch)
def okpx(uu, vv):
    q = TA[np.clip((vv * TH).astype(int), 0, TH - 1), np.clip((uu * TW).astype(int), 0, TW - 1)]
    return (q.max(-1) > 30) & ~((np.abs(q[..., 0] - q[..., 1]) < 7) & (np.abs(q[..., 1] - q[..., 2]) < 7) & (q[..., 0] > 95) & (q[..., 0] < 170))
vv_ = np.linspace(eyes_uv[0][1] - 0.4 * de, eyes_uv[0][1] + 1.6 * de, 40)
gl = np.mean([okpx(np.full(40, um - f * de), vv_).mean() for f in (0.5, 0.8, 1.1)])
gr = np.mean([okpx(np.full(40, um + f * de), vv_).mean() for f in (0.5, 0.8, 1.1)])
mirror = None
if min(gl, gr) < 0.75 * max(gl, gr): mirror = 'trai' if gl > gr else 'phai'   # một bên mặt bị khuất / hỏng
# khớp bề ngang từng hàng: mép mặt trong ảnh (má, hàm, cằm) trùng mép đầu 3D nhìn thẳng, hai bên tính riêng
# (mặt ảnh hẹp hơn đầu thì viền hàm ảnh nằm lọt trong đầu, trông như hai lớp mặt)
wfit = ''
if found is not None and VE is None:
    rat, ys_, edt_, cxm, uc = width_ratios(P[:nhead])
    if np.isfinite(rat).sum() > 10:
        for k in range(2):
            col_ = rat[:, k]; ok_ = np.isfinite(col_)
            if ok_.sum() < 4: rat[:, k] = 1; continue
            col_ = np.interp(np.arange(len(col_)), np.nonzero(ok_)[0], col_[ok_])
            rat[:, k] = np.clip(ndimage.gaussian_filter1d(col_, 2), 0.75, 1.35)
        # giữa mặt (gần sống mũi) giữ nguyên, ra tới mép mới kéo: tỉ lệ theo khoảng cách ngang
        yy = np.clip(yq, ys_[-1], ys_[0])
        r0_ = np.interp(-yy, -ys_, rat[:, 0]); r1_ = np.interp(-yy, -ys_, rat[:, 1])
        du = pu - uc; rr_t = np.where(du > 0, r1_, r0_)
        tnorm = np.clip(np.abs(X3 - cxm) / (0.9 * edt_), 0, 1)   # 0 ở giữa mặt, 1 ở mép
        fac = 1 + (rr_t - 1) * tnorm ** 1.5
        # trên trán / dưới cằm bớt dần
        fade = np.clip((yq - (mE[1] - 1.9 * edt_)) / (0.3 * edt_), 0, 1) * np.clip(((mE[1] + 0.6 * edt_) - yq) / (0.3 * edt_), 0, 1)
        pu = uc + du * (1 + (fac - 1) * fade)
        wfit = 'khớp bề ngang %.2f/%.2f, ' % (np.nanmedian(rat[:, 0]), np.nanmedian(rat[:, 1]))
if mirror == 'trai': pu = np.where(pu > um, 2 * um - pu, pu)
if mirror == 'phai': pu = np.where(pu < um, 2 * um - pu, pu)
inside = (pu > 0.002) & (pu < 0.998) & (pv > 0.002) & (pv < 0.998)
from scipy.ndimage import map_coordinates
col = np.stack([map_coordinates(TA[..., k], [pv * TH - 0.5, pu * TW - 0.5], order=1, mode='nearest') for k in range(3)], -1)
bad = (col.max(-1) < 18) | ((np.abs(col[..., 0] - col[..., 1]) < 7) & (np.abs(col[..., 1] - col[..., 2]) < 7) & (col[..., 0] > 95) & (col[..., 0] < 170))   # lỗ đen, nền xám
pu_i = np.clip((pu * TW).astype(int), 0, TW - 1); pv_i = np.clip((pv * TH).astype(int), 0, TH - 1)
if found:
    fmask = np.asarray(Image.fromarray(ndimage.binary_dilation(ndimage.binary_fill_holes(ndimage.binary_closing(found[1], iterations=6)), iterations=3).astype(np.uint8) * 255).resize((TW, TH))) > 127
    bad &= ~fmask[pv_i, pu_i]   # trong khuôn mặt: lòng trắng mắt, răng không phải nền xám
    fwide = ndimage.binary_dilation(fmask, iterations=max(2, int(0.02 * TW)))
    bad |= ~fwide[pv_i, pu_i] & (yq < mE[1] + 0.03 * s)   # ngoài khuôn mặt trong ảnh (tóc mai, nền, áo): không lấy ảnh, dùng màu da / tóc
valid = inside & ~bad
holes = ndimage.binary_opening(col.max(-1) < 30, iterations=5)   # chỉ mảng đen lớn (lỗ ảnh); con ngươi, lông mày nhỏ thì giữ
valid = ndimage.binary_erosion(valid, iterations=2) & ~ndimage.binary_dilation(holes, iterations=6)
front = np.clip((nfront - 0.2) / 0.45, 0, 1)
w = front * ndimage.binary_erosion(valid, iterations=6)
w = np.clip(ndimage.gaussian_filter(w.astype(float), 10) * 1.5, 0, 1)   # mép mờ dần thật rộng (chỗ hở bên dưới đã trám màu lân cận), không còn đường ranh
brow = mE[1] + 0.03 * s
hairm = np.clip((yq - brow) / (0.03 * s), 0, 1)
back = np.clip((np.abs(tq) - 1.6) / 0.5, 0, 1) * np.clip((yq - (mE[1] - 0.05 * s)) / (0.04 * s), 0, 1)
hairm = np.maximum(hairm, back)
# tóc / gáy / chỗ đầu mới lòi ra dưới nón: lấy màu bề mặt cũ gần nhất (nón, khăn, tóc thật của nhân vật)
from scipy.spatial import cKDTree as _KD
OV, OC = [], []
for p in mesh['primitives']:
    if mname(p) in ('Lining', 'Face', 'DauChuan', 'Face2D') or 'TEXCOORD_0' not in p['attributes']: continue
    Xo = g.acc(p['attributes']['POSITION']).astype(float); Uo = g.acc(p['attributes']['TEXCOORD_0']).astype(float)
    near_ = np.linalg.norm((Xo - np.array([mE[0], mE[1] + 0.02 * s, np.median(P[:nhead, 2])])) / np.array([1, 1.3, 1]), axis=1) < 0.16 * SC
    if not near_.any(): continue
    To = np.asarray(tex_of(p)).astype(float); th_, tw_ = To.shape[:2]
    Xo, Uo = Xo[near_], Uo[near_]
    OV.append(Xo); OC.append(To[np.clip((Uo[:, 1] * th_).astype(int), 0, th_ - 1), np.clip((Uo[:, 0] * tw_).astype(int), 0, tw_ - 1)])
hairc = np.broadcast_to(hair_c, col.shape).copy()
if OV:
    OV = np.concatenate(OV); OC = np.concatenate(OC)
    if len(OV) > 50:
        hm = hairm > 0.01
        dd, ii = _KD(OV).query(G3[hm, :3], k=6)
        wq = 1 / np.maximum(dd, 1e-4); hairc[hm] = (OC[ii] * wq[..., None]).sum(1) / wq.sum(1)[:, None]
        hairc = ndimage.gaussian_filter(hairc, (2, 2, 0))
# vá chỗ hỏng bên trong mặt: màu lân cận làm mờ dần (không kéo dài thành sọc)
colf = col.copy()
if (~valid & inside).any():
    done = valid.copy(); colf = np.where(valid[..., None], col, 0)
    for sg in (2, 4, 8, 16, 32):
        nb_ = ndimage.gaussian_filter(col * valid[..., None], (sg, sg, 0)); dn = ndimage.gaussian_filter(valid.astype(float), sg)
        put = ~done & (dn > 0.08)
        colf[put] = nb_[put] / dn[put, None]; done |= put
    colf[~done] = skin_c
edge = (w > 0.15) & (w < 0.6) & (hairm < 0.1)
if edge.sum() > 200:   # màu da trám lấy theo má trong ảnh ngay mép (khớp tông, không lệch sáng tối)
    skin_c = 0.4 * skin_c + 0.6 * np.median(colf[edge], 0)
fill = skin_c * (1 - hairm[..., None]) + hairc * hairm[..., None]
out = colf * w[..., None] + fill * (1 - w[..., None])
out = ndimage.gaussian_filter(out, (0.6, 0.6, 0))
bio = io.BytesIO(); Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(bio, 'JPEG', quality=92); data = bio.getvalue()

# ---------- trọng số: đầu theo xương Head, cổ chuyển dần sang Neck ----------
# cả mặt tới cằm theo xương Head (quay, cúi đầu không kéo méo cằm); chỉ phần cổ dưới cằm mới chuyển dần sang Neck
hy = Pw('Head')[1]
Ph = P[:nhead]; fr_c = Ph[(np.abs(Ph[:, 0] - mE[0]) < 0.025 * s) & (Ph[:, 2] < np.median(Ph[:, 2]))]
chin = fr_c[:, 1].min() if len(fr_c) else mE[1] - 0.13 * sy
chin = max(chin, mE[1] - 0.16 * sy)
wh = np.clip((P2[:, 1] - (chin - 0.04 * SC)) / (0.035 * SC), 0, 1)
jt = np.zeros((len(P2), 4), np.uint8 if len(joints) < 256 else np.uint16); jt[:, 0] = JI['Head']; jt[:, 1] = JI['Neck']
wt = np.zeros((len(P2), 4), np.float32); wt[:, 0] = wh; wt[:, 1] = 1 - wh

# ---------- bỏ phần đầu cũ nằm trong đầu mới ----------
hull = Delaunay(((P[:nhead] - P[:nhead].mean(0)) * 0.97 + P[:nhead].mean(0)))
brow = mE[1] + 0.03 * sy
# mặt trước của đầu mới (độ sâu theo x, y) để bỏ các mảnh vành nón / tóc cũ chắn trước mặt
fr = P[:nhead][P[:nhead, 2] < np.median(P[:nhead, 2])]
fx0, fx1 = mE[0] - 0.075 * s, mE[0] + 0.075 * s; fy0 = MO[1] - 0.05 * sy if MO is not None else mE[1] - 0.12 * sy
def front_z(q):
    return griddata(fr[:, :2], fr[:, 2], q[:, :2], method='linear')
from scipy.spatial import cKDTree as _KD2
UK = np.linalg.norm(dT) * s   # đơn vị: khoảng cách hai mắt (m)
hcK = np.array([mE[0], mE[1] - 0.5 * UK, np.median(P[:nhead, 2])])
dK = P[:nhead] - hcK; radK = np.linalg.norm(dK, axis=1); treeK = _KD2(dK / radK[:, None])
chinK = (MO[1] if MO is not None else mE[1] - 1.0 * UK) - 0.78 * UK
neck_lo = chinK - 0.45 * UK   # tới ngay dưới cằm; cổ áo, ngực giữ nguyên
# bán kính ngang của đầu mới theo (độ cao, góc quanh trục đầu)
yb0, dyb = neck_lo - 0.1 * UK, 0.05 * UK
nyb = int((brow + 0.3 * UK - yb0) / dyb) + 1; RB = np.zeros((nyb, 36))
Ph2 = P[:nhead]; yi2 = ((Ph2[:, 1] - yb0) / dyb).astype(int); ok2 = (yi2 >= 0) & (yi2 < nyb)
a2 = ((np.arctan2(Ph2[:, 0] - hcK[0], -(Ph2[:, 2] - hcK[2])) + np.pi) / (2 * np.pi) * 36).astype(int) % 36
np.maximum.at(RB, (yi2[ok2], a2[ok2]), np.hypot(Ph2[ok2, 0] - hcK[0], Ph2[ok2, 2] - hcK[2]))
for _ in range(3): RB = np.maximum(RB, np.maximum(np.roll(RB, 1, 1), np.roll(RB, -1, 1)) * (RB == 0))
killed = 0
for p in mesh['primitives']:
    Xp = g.acc(p['attributes']['POSITION']).astype(float); I = g.acc(p['indices']).reshape(-1, 3).astype(np.int64)
    inn = hull.find_simplex(Xp) >= 0
    C = Xp[I].mean(1)
    k = inn[I].all(1) & (C[:, 1] < brow + 0.02 * sy)   # đầu cũ trong đầu mới, từ lông mày xuống (giữ lòng nón, tóc trên)
    if mname(p) == 'Face': k[:] = True   # lớp ảnh mặt cũ: bỏ hết
    if mname(p) not in ('Lining',):   # mảnh đầu / cổ cũ sát ngoài đầu mới (đầu mới đã thu hẹp): bỏ, kẻo lòi ra như má, cổ thứ hai
        zone = (C[:, 1] < brow) & (C[:, 1] > neck_lo)
        if zone.any():
            ang = np.arctan2(C[zone, 0] - hcK[0], -(C[zone, 2] - hcK[2])); rh = np.hypot(C[zone, 0] - hcK[0], C[zone, 2] - hcK[2])
            yi = np.clip(((C[zone, 1] - yb0) / dyb).astype(int), 0, RB.shape[0] - 1); ai = ((ang + np.pi) / (2 * np.pi) * RB.shape[1]).astype(int) % RB.shape[1]
            lim_ = RB[yi, ai] * np.where(C[zone, 1] < chinK, 1.04, 1.10)
            front = np.abs(ang) < 2.0   # trước mặt và hai bên, không đụng tóc sau gáy
            zi = np.nonzero(zone)[0]; k[zi[(rh < lim_) & front]] = True
    box = (C[:, 0] > fx0) & (C[:, 0] < fx1) & (C[:, 1] > fy0) & (C[:, 1] < brow + 0.01 * sy)
    if box.any():
        fz = front_z(C[box]); bi = np.nonzero(box)[0]
        k[bi[(~np.isnan(fz)) & (C[box, 2] < fz + 0.012 * SC) & (C[box, 2] > fz - 0.04 * SC)]] = True   # mảnh cũ sát mặt mới (vành nón xa phía trước thì giữ)
    if k.any():
        I[k] = I[k][:, :1]; killed += int(k.sum())
        ia = J['accessors'][p['indices']]; g.put(p['indices'], I.reshape(-1, 1).astype({5123: '<u2', 5125: '<u4'}[ia['componentType']]))

# ---------- ghi primitive mới ----------
def add_raw(b):
    while len(g.bin) % 4: g.bin.append(0)
    o2 = len(g.bin); g.bin += b; J['bufferViews'].append({'buffer': 0, 'byteOffset': o2, 'byteLength': len(b)}); return len(J['bufferViews']) - 1
def add(arr, typ, ct, mm=False):
    arr = np.ascontiguousarray(arr); a = {'bufferView': add_raw(arr.tobytes()), 'componentType': ct, 'count': int(arr.shape[0]), 'type': typ}
    if mm: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
    J['accessors'].append(a); return len(J['accessors']) - 1
J['images'].append({'bufferView': add_raw(data), 'mimeType': 'image/jpeg', 'name': 'dau-chuan'})
J.setdefault('samplers', []).append({'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 33071})
J['textures'].append({'sampler': len(J['samplers']) - 1, 'source': len(J['images']) - 1})
J['materials'].append({'name': 'DauChuan', 'doubleSided': False, 'pbrMetallicRoughness': {'baseColorTexture': {'index': len(J['textures']) - 1}, 'metallicFactor': 0, 'roughnessFactor': 0.7}})
ct = 5123 if len(P2) < 65535 else 5125
mesh['primitives'].append({'attributes': {'POSITION': add(P2.astype('<f4'), 'VEC3', 5126, True), 'NORMAL': add((N2 / np.linalg.norm(N2, axis=1, keepdims=True)).astype('<f4'), 'VEC3', 5126),
                                          'TEXCOORD_0': add(UV.astype('<f4'), 'VEC2', 5126), 'JOINTS_0': add(jt, 'VEC4', 5121 if jt.dtype == np.uint8 else 5123), 'WEIGHTS_0': add(wt, 'VEC4', 5126)},
                           'indices': add(Fl.reshape(-1, 1).astype('<u2' if ct == 5123 else '<u4'), 'SCALAR', ct), 'material': len(J['materials']) - 1})
# ---------- cỡ đầu theo tỉ lệ người thật: ảnh AI vẽ đầu to, thu cả cụm đầu (mặt, tóc, nón, khăn) quanh khớp đầu ----------
allY = np.concatenate([g.acc(p['attributes']['POSITION'])[:, 1] for p in mesh['primitives']])
ed_now = np.linalg.norm(dT) * s; ed_want = 0.0625 * (allY.max() - allY.min()) / 1.66
KH = float(np.clip(ed_want / ed_now, 0.78, 1.0))
if KH < 0.995:
    piv = Pw('Head'); hi_ = [JI[n] for n in ('Head', 'HeadTop_End') if n in JI]
    for p in mesh['primitives']:
        a_ = p['attributes']
        if 'JOINTS_0' not in a_: continue
        X_ = g.acc(a_['POSITION']).astype(float); Jt = g.acc(a_['JOINTS_0']).astype(int); Wt = g.acc(a_['WEIGHTS_0']).astype(float)
        Wt = Wt / {5121: 255.0, 5123: 65535.0}.get(J['accessors'][a_['WEIGHTS_0']]['componentType'], 1.0)
        wh_ = (Wt * np.isin(Jt, hi_)).sum(1)
        if not (wh_ > 0.01).any(): continue
        X_ = X_ + ((KH - 1) * wh_)[:, None] * (X_ - piv)
        ia = J['accessors'][a_['POSITION']]; g.put(a_['POSITION'], X_.astype('<f4')); ia['min'] = X_.min(0).tolist(); ia['max'] = X_.max(0).tolist()
J['buffers'][0]['byteLength'] = len(g.bin); g.compact(); g.save(dst)
print(anh_mat + (' (đặt lại khung ảnh)' if reframed else '') + ', ' + ('thu đầu %.2f, ' % KH if KH < 0.995 else '') + squash + lower + jaw + wfit + 'cỡ đầu cũ %.2f, ' % HS + ('khuôn %s %s tuổi%s, ' % (gioi, tuoi, ''.join(' %s %+.2f' % kv for kv in shape.items()))) + ('dời đầu %.0f mm, ' % (SHX * 1000) if SHX else '') + ('soi gương nửa ' + mirror + ', ' if mirror else '') + 'đầu chuẩn: mắt %s, cỡ %.2f×%.2f%s, nghiêng %.0f°, co %d đỉnh dưới nón/tóc, bỏ %d tam giác đầu cũ' % (src_e, s / SC, sy / SC, '' if s_ok else ' (mắt lệch, dùng cỡ mặc định)', np.degrees(roll), ncut, killed))
