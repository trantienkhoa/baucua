# Thay đầu nhân vật máy tạo (lưới mặt méo, góc cạnh) bằng một đầu người chuẩn, mượt (đầu + nhãn cầu của nam-avatar.glb),
# co giãn cho khớp đúng hai mắt trên ảnh chân dung, rồi chiếu ảnh chân dung lên mặt.
# Tóc, gáy, mang tai: tô màu tóc / màu da lấy từ chính ảnh. Phần đầu cũ nằm trong đầu mới bị bỏ; nón, khăn, tóc ngoài giữ nguyên.
# python dau-chuan.py <vào.glb> <ra.glb>
#   thoát mã 3 nếu không làm được (không có ảnh mặt...) -> quy trình dùng mat-2d.py thay thế
# Vị trí mắt: tự tìm trên ảnh; sai thì chấm tay trong mat-chinh.json: {"tp-005": [[u1, v1], [u2, v2]]} (toạ độ 0..1 trên ảnh mặt)
import sys, os, io, json, shutil, numpy as np
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
if not fps: print('khong-co-anh-mat'); sys.exit(3)
fp = fps[0]
skin = J['skins'][0]; joints = skin['joints']
name = lambda i: nodes[i].get('name', '').replace('mixamorig:', '')
JI = {name(j): k for k, j in enumerate(joints)}
IBM = g.acc(skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
Pw = lambda b: np.linalg.inv(IBM[JI[b]])[:3, 3]
SC = Pw('Hips')[1] / 0.842

# ---------- ánh xạ (x, y) <-> (u, v) của ảnh mặt (chiếu thẳng) ----------
FX = g.acc(fp['attributes']['POSITION']).astype(float); FU = g.acc(fp['attributes']['TEXCOORD_0']).astype(float)
ins = (FU > 0.003).all(1) & (FU < 0.997).all(1)
ku = np.linalg.lstsq(np.c_[FX[ins, 0], np.ones(ins.sum())], FU[ins, 0], rcond=None)[0]
kv = np.linalg.lstsq(np.c_[FX[ins, 1], np.ones(ins.sum())], FU[ins, 1], rcond=None)[0]
uv = lambda x, y: (ku[0] * x + ku[1], kv[0] * y + kv[1])
xy = lambda u, v: ((u - ku[1]) / ku[0], (v - kv[1]) / kv[0])
ti = J['materials'][fp['material']]['pbrMetallicRoughness']['baseColorTexture']['index']; im0 = J['images'][J['textures'][ti]['source']]
bv = J['bufferViews'][im0['bufferView']]; o = bv.get('byteOffset', 0)
tex = Image.open(io.BytesIO(bytes(g.bin[o:o + bv['byteLength']]))).convert('RGB'); TA = np.asarray(tex).astype(float); TH, TW = TA.shape[:2]

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
found = find_eyes()
if base in fix: eyes_uv = fix[base]; src_e = 'chấm tay'
elif found: eyes_uv = found[0]; src_e = 'tự tìm'
else: print('khong-thay-mat'); sys.exit(3)
E = np.array([xy(u, v) for u, v in eyes_uv])   # hai mắt (x, y) trên nhân vật
MO = None
if base in fix and len(fix[base]) > 2: MO = np.array(xy(*fix[base][2]))
elif found and base not in fix: MO = np.array(xy(*found[3]))
if E[0, 0] > E[1, 0]: E = E[::-1]

# ---------- đầu mẫu ----------
tg = GLB(os.path.join(TOOL, '..', '..', 'public', 'models', 'nam-avatar.glb')); TJ = tg.j
parts = {}
for nd in TJ['nodes']:
    if 'mesh' in nd and TJ['meshes'][nd['mesh']]['name'] in ('Wolf3D_Head', 'EyeLeft', 'EyeRight', 'Wolf3D_Teeth'):
        p = TJ['meshes'][nd['mesh']]['primitives'][0]
        parts[TJ['meshes'][nd['mesh']]['name']] = (tg.acc(p['attributes']['POSITION']).astype(float), tg.acc(p['attributes']['NORMAL']).astype(float), tg.acc(p['indices']).reshape(-1, 3).astype(np.int64))
V, N, F = [], [], []; off = 0
for k in ('Wolf3D_Head', 'EyeLeft', 'EyeRight'):
    X, Nn, I = parts[k]; V.append(X); N.append(Nn); F.append(I + off); off += len(X)
V = np.concatenate(V); N = np.concatenate(N); F = np.concatenate(F)
nhead = len(parts['Wolf3D_Head'][0])
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
TM = parts['Wolf3D_Teeth'][0].mean(0).copy(); TM[[0, 2]] *= -1   # miệng đầu mẫu
sy = s
if MO is not None:
    sy0 = (mE[1] - MO[1]) / (mT[1] - TM[1])
    if 0.8 * s < sy0 < 1.3 * s: sy = sy0   # kéo dài / thu ngắn mặt cho miệng ảnh rơi đúng miệng đầu mẫu
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

# ---------- UV trụ quanh đầu + vẽ texture ----------
hc = P[:nhead]; cx, cz = np.median(hc[:, 0]), np.median(hc[:, 2]) + 0.01 * s
th = np.arctan2(P[:, 0] - cx, -(P[:, 2] - cz)); ymin, ymax = P[:, 1].min(), P[:, 1].max()
U = th / (2 * np.pi) + 0.5; Vv = (ymax - P[:, 1]) / (ymax - ymin)
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
gt, gy = np.meshgrid((np.arange(S) + 0.5) / S, (np.arange(S) + 0.5) / S)
tq = (gt - 0.5) * 2 * np.pi; yq = ymax - gy * (ymax - ymin)
rad = np.hypot(P[:nhead, 0] - cx, P[:nhead, 2] - cz)
pts = np.c_[th[:nhead], P[:nhead, 1]]
pts = np.concatenate([pts, pts + [2 * np.pi, 0], pts - [2 * np.pi, 0]]); rr = np.tile(rad, 3)
R = griddata(pts, rr, (tq, yq), method='linear')
if np.isnan(R).any(): R = np.where(np.isnan(R), griddata(pts, rr, (tq, yq), method='nearest'), R)
X3 = cx + R * np.sin(tq)
pu, pv = uv(X3 - SHX, yq)
inside = (pu > 0.002) & (pu < 0.998) & (pv > 0.002) & (pv < 0.998)
um = np.mean([u for u, v in eyes_uv]); de = abs(eyes_uv[1][0] - eyes_uv[0][0])   # tâm mắt, khoảng cách hai mắt trong ảnh (chưa dịch)
def okpx(uu, vv):
    q = TA[np.clip((vv * TH).astype(int), 0, TH - 1), np.clip((uu * TW).astype(int), 0, TW - 1)]
    return (q.max(-1) > 30) & ~((np.abs(q[..., 0] - q[..., 1]) < 7) & (np.abs(q[..., 1] - q[..., 2]) < 7) & (q[..., 0] > 95) & (q[..., 0] < 170))
vv_ = np.linspace(eyes_uv[0][1] - 0.4 * de, eyes_uv[0][1] + 1.6 * de, 40)
gl = np.mean([okpx(np.full(40, um - f * de), vv_).mean() for f in (0.5, 0.8, 1.1)])
gr = np.mean([okpx(np.full(40, um + f * de), vv_).mean() for f in (0.5, 0.8, 1.1)])
mirror = None
if min(gl, gr) < 0.75 * max(gl, gr): mirror = 'trai' if gl > gr else 'phai'   # một bên mặt bị khuất / hỏng
if mirror == 'trai': pu = np.where(pu > um, 2 * um - pu, pu)
if mirror == 'phai': pu = np.where(pu < um, 2 * um - pu, pu)
inside = (pu > 0.002) & (pu < 0.998) & (pv > 0.002) & (pv < 0.998)
pu_i = np.clip((pu * TW).astype(int), 0, TW - 1); pv_i = np.clip((pv * TH).astype(int), 0, TH - 1)
col = TA[pv_i, pu_i]
bad = (col.max(-1) < 18) | ((np.abs(col[..., 0] - col[..., 1]) < 7) & (np.abs(col[..., 1] - col[..., 2]) < 7) & (col[..., 0] > 95) & (col[..., 0] < 170))   # lỗ đen, nền xám
if found:
    fmask = np.asarray(Image.fromarray(ndimage.binary_dilation(ndimage.binary_fill_holes(ndimage.binary_closing(found[1], iterations=6)), iterations=3).astype(np.uint8) * 255).resize((TW, TH))) > 127
    bad &= ~fmask[pv_i, pu_i]   # trong khuôn mặt: lòng trắng mắt, răng không phải nền xám
valid = inside & ~bad
valid = ndimage.binary_erosion(valid, iterations=2) & ~ndimage.binary_dilation(col.max(-1) < 30, iterations=6)
front = np.clip((np.cos(tq) - 0.15) / 0.45, 0, 1)
w = front * valid
w = ndimage.gaussian_filter(w.astype(float), 6) * valid   # mép mờ dần, không viền cứng
w = np.clip(w * 1.4, 0, 1)
brow = mE[1] + 0.03 * s
hairm = np.clip((yq - brow) / (0.03 * s), 0, 1)
back = np.clip((np.abs(tq) - 1.6) / 0.5, 0, 1) * np.clip((yq - (mE[1] - 0.05 * s)) / (0.04 * s), 0, 1)
hairm = np.maximum(hairm, back)
fill = skin_c * (1 - hairm[..., None]) + hair_c * hairm[..., None]
# vá chỗ hỏng bên trong mặt bằng màu lân cận trước khi trộn
colf = col.copy()
if (~valid & inside).any():
    idx = ndimage.distance_transform_edt(~valid, return_distances=False, return_indices=True); colf = col[tuple(idx)]
out = colf * w[..., None] + fill * (1 - w[..., None])
out = ndimage.gaussian_filter(out, (0.6, 0.6, 0))
bio = io.BytesIO(); Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(bio, 'JPEG', quality=92); data = bio.getvalue()

# ---------- trọng số: đầu theo xương Head, cổ chuyển dần sang Neck ----------
hy = Pw('Head')[1]; wh = np.clip((P2[:, 1] - (hy - 0.05 * SC)) / (0.05 * SC), 0, 1)
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
killed = 0
for p in mesh['primitives']:
    Xp = g.acc(p['attributes']['POSITION']).astype(float); I = g.acc(p['indices']).reshape(-1, 3).astype(np.int64)
    inn = hull.find_simplex(Xp) >= 0
    C = Xp[I].mean(1)
    k = inn[I].all(1) & (C[:, 1] < brow + 0.02 * sy)   # đầu cũ trong đầu mới, từ lông mày xuống (giữ lòng nón, tóc trên)
    if mname(p) == 'Face': k[:] = True   # lớp ảnh mặt cũ: bỏ hết
    box = (C[:, 0] > fx0) & (C[:, 0] < fx1) & (C[:, 1] > fy0) & (C[:, 1] < brow + 0.01 * sy)
    if box.any():
        fz = front_z(C[box]); bi = np.nonzero(box)[0]
        k[bi[(~np.isnan(fz)) & (C[box, 2] < fz + 0.012 * SC)]] = True   # mảnh cũ nằm trước / sát mặt mới
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
J['buffers'][0]['byteLength'] = len(g.bin); g.compact(); g.save(dst)
print(('dời đầu %.0f mm, ' % (SHX * 1000) if SHX else '') + ('soi gương nửa ' + mirror + ', ' if mirror else '') + 'đầu chuẩn: mắt %s, cỡ %.2f×%.2f%s, nghiêng %.0f°, co %d đỉnh dưới nón/tóc, bỏ %d tam giác đầu cũ' % (src_e, s / SC, sy / SC, '' if s_ok else ' (mắt lệch, dùng cỡ mặc định)', np.degrees(roll), ncut, killed))
