# Làm mặt đẹp hơn: dán lại ảnh chân dung gốc (texture mặt chiếu thẳng) lên một "mặt nạ" mỏng, cong mượt theo dáng mặt,
# gắn vào xương đầu. Lưới mặt máy tạo góc cạnh, vỡ vụn nên ảnh nét bị méo; mặt nạ mượt cho ảnh hiện đúng như chân dung.
# python mat-2d.py <vào.glb> <ra.glb>   (không có vật liệu "Face" thì chép nguyên)
import sys, os, io, shutil, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glbio import GLB
from PIL import Image, ImageFilter
from scipy import ndimage

src, dst = sys.argv[1], sys.argv[2]
g = GLB(src); J = g.j; nodes = J['nodes']
name = lambda i: nodes[i].get('name', '').replace('mixamorig:', '')
mesh = J['meshes'][0]
fp = [p for p in mesh['primitives'] if J['materials'][p.get('material', 0)].get('name') == 'Face']
if not fp or any(J['materials'][p.get('material', 0)].get('name') == 'Face2D' for p in mesh['primitives']):
    if os.path.abspath(src) != os.path.abspath(dst): shutil.copy(src, dst)
    print('bo-qua'); sys.exit(0)
fp = fp[0]
skin = J['skins'][0]; joints = skin['joints']
JI = {name(j): k for k, j in enumerate(joints)}
IBM = g.acc(skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
Pw = lambda b: np.linalg.inv(IBM[JI[b]])[:3, 3]   # vị trí xương lúc bind
SC = Pw('Hips')[1] / 0.842

# --- ánh xạ (x, y) -> (u, v) của texture mặt (chiếu thẳng từ phía trước) ---
FX = g.acc(fp['attributes']['POSITION']).astype(float); FU = g.acc(fp['attributes']['TEXCOORD_0']).astype(float)
ins = (FU > 0.003).all(1) & (FU < 0.997).all(1)   # bỏ các đỉnh bị kẹp UV ở mép ảnh
Au = np.c_[FX[ins, 0], np.ones(ins.sum())]; ku, *_ = np.linalg.lstsq(Au, FU[ins, 0], rcond=None)
Av = np.c_[FX[ins, 1], np.ones(ins.sum())]; kv, *_ = np.linalg.lstsq(Av, FU[ins, 1], rcond=None)
res = np.abs(Au @ ku - FU[ins, 0]).max() + np.abs(Av @ kv - FU[ins, 1]).max()
if res > 0.01: print('canh-bao: texture mặt không phải chiếu thẳng (sai số %.3f)' % res)
uv = lambda x, y: (ku[0] * x + ku[1], kv[0] * y + kv[1])
xy = lambda u, v: ((u - ku[1]) / ku[0], (v - kv[1]) / kv[0])

# --- tìm khuôn mặt ngay trên ảnh chân dung (lưới mặt máy tạo bị méo nên không dựa vào hình học) ---
mat = J['materials'][fp['material']]; ti = mat['pbrMetallicRoughness']['baseColorTexture']['index']; im0 = J['images'][J['textures'][ti]['source']]
bv = J['bufferViews'][im0['bufferView']]; o = bv.get('byteOffset', 0)
tex = Image.open(io.BytesIO(bytes(g.bin[o:o + bv['byteLength']]))).convert('RGB'); TW, TH = tex.size
T = np.asarray(tex.resize((256, 256))).astype(int); R_, G_, B_ = T[..., 0], T[..., 1], T[..., 2]
skin = (R_ > 95) & (G_ > 40) & (B_ > 20) & (R_ > G_) & (G_ >= B_ - 5) & (R_ - B_ > 15) & (R_ - G_ < 90)
skin = ndimage.binary_opening(skin, iterations=2)
lab, n = ndimage.label(skin)
if n == 0: print('canh-bao: không thấy da mặt'); shutil.copy(src, dst); sys.exit(0)
c0 = lab[96:200, 96:160]; ids, cnt = np.unique(c0[c0 > 0], return_counts=True)
face = lab == (ids[np.argmax(cnt)] if len(ids) else np.argmax(np.bincount(lab.ravel())[1:]) + 1)
rows = np.nonzero(face.sum(1) > 0)[0]; ftop = rows.min()
wid = [face[r].sum() for r in range(ftop, min(256, ftop + 90))]; W = np.percentile(wid, 90)   # bề ngang hai má (điểm ảnh)
cols = np.nonzero(face[ftop:ftop + 80].sum(0) > 0)[0]; fcx = np.median(np.nonzero(face[ftop + 20:ftop + 70])[1]) if face[ftop + 20:ftop + 70].any() else 128
utop, ubot = ftop / 256, min(0.995, (ftop + 1.30 * W) / 256)   # trán -> cằm (mặt cao ~1,3 lần bề ngang)
ul, ur = max(0.005, (fcx - 0.5 * W) / 256), min(0.995, (fcx + 0.5 * W) / 256)
(xa, top), (xb, bot) = xy(ul, utop), xy(ur, ubot)
x0, x1 = min(xa, xb), max(xa, xb); top, bot = max(top, bot), min(top, bot)
hw = (x1 - x0) / 2; cxm = (x0 + x1) / 2
B = np.concatenate([g.acc(p['attributes']['POSITION']).astype(float) for p in mesh['primitives'] if J['materials'][p.get('material', 0)].get('name') != 'Lining'])
inb = B[(np.abs(B[:, 0] - cxm) < hw) & (B[:, 1] > bot) & (B[:, 1] < top)]
nose = np.array([cxm, (top + bot) / 2, inb[:, 2].min() if len(inb) else B[:, 2].min()])
NX, NY = 28, 34
gx, gy = np.meshgrid(np.linspace(x0, x1, NX), np.linspace(bot, top, NY))
# --- độ sâu: mặt trước của đầu tại từng điểm lưới, làm mượt ---
front = B[(B[:, 1] > bot - 0.03 * SC) & (B[:, 1] < top + 0.03 * SC) & (np.abs(B[:, 0] - nose[0]) < hw + 0.03 * SC) & (B[:, 2] < nose[2] + 0.09 * SC)]
Z = np.full(gx.shape, np.nan)
for i in range(NY):
    for k in range(NX):
        m = front[(np.abs(front[:, 0] - gx[i, k]) < 0.008 * SC) & (np.abs(front[:, 1] - gy[i, k]) < 0.008 * SC)]
        if len(m): Z[i, k] = m[:, 2].min()   # điểm nhô nhất: mặt nạ phải nằm trước mọi mẩu lưới (môi, cằm)
bad = np.isnan(Z)
if bad.all(): print('canh-bao: không đo được mặt'); shutil.copy(src, dst); sys.exit(0)
idx = ndimage.distance_transform_edt(bad, return_distances=False, return_indices=True); Z = Z[tuple(idx)]
Z = ndimage.minimum_filter(Z, size=3, mode='nearest'); Z = ndimage.gaussian_filter(Z, 2.4, mode='nearest'); Z = np.minimum(Z, ndimage.minimum_filter(Z, size=3, mode='nearest') + 0.002 * SC)
# hai bên má cong ra sau một chút cho mặt nạ ôm đầu, không chìa mép
ex = ((gx - nose[0]) / hw) ** 2; Z = Z + 0.012 * SC * ex ** 1.5
Z = Z - 0.002 * SC   # nổi trước mặt lưới 2 mm
P = np.stack([gx, gy, Z], -1).reshape(-1, 3)
# cả vùng mặt (mọi lớp lưới) theo hẳn xương đầu, để mặt nạ và mặt không lệch nhau khi cử động
hj = JI['Head']
for p in mesh['primitives']:
    if 'JOINTS_0' not in p['attributes']: continue
    Xp = g.acc(p['attributes']['POSITION']).astype(float)
    sel = (np.abs(Xp[:, 0] - nose[0]) < hw + 0.02 * SC) & (Xp[:, 1] > bot - 0.02 * SC) & (Xp[:, 1] < top + 0.03 * SC) & (Xp[:, 2] < nose[2] + 0.07 * SC)
    if not sel.any(): continue
    ja = J['accessors'][p['attributes']['JOINTS_0']]; wa = J['accessors'][p['attributes']['WEIGHTS_0']]
    jj = g.acc(p['attributes']['JOINTS_0']).copy(); ww = g.acc(p['attributes']['WEIGHTS_0']).astype(float).copy()
    jj[sel] = 0; jj[sel, 0] = hj; ww[sel] = 0; ww[sel, 0] = 1 if wa['componentType'] == 5126 else (255 if wa['componentType'] == 5121 else 65535)
    g.put(p['attributes']['JOINTS_0'], jj); g.put(p['attributes']['WEIGHTS_0'], ww)

# --- texture: cắt vùng mặt từ ảnh chân dung, vá lỗ đen, viền mờ dần ---
(ua, va), (ub, vb) = uv(x0, top), uv(x1, bot)
u0, u1, v0, v1 = min(ua, ub), max(ua, ub), min(va, vb), max(va, vb)
crop = np.asarray(tex.crop((int(u0 * TW), int(v0 * TH), int(np.ceil(u1 * TW)), int(np.ceil(v1 * TH)))).resize((512, 512), Image.LANCZOS)).astype(float)
hole = ndimage.binary_dilation(crop.max(2) < 6, iterations=3) & (crop.max(2) < 70)   # lỗ đen tuyền + viền răng cưa của nó (không đụng con ngươi, lông mày)
if hole.any():
    ii = ndimage.distance_transform_edt(hole, return_distances=False, return_indices=True); filled = crop[tuple(ii)]
    blur = ndimage.gaussian_filter(filled, (4, 4, 0)); crop = np.where(hole[..., None], blur, crop)
yy, xx = np.mgrid[0:512, 0:512] / 511.0
# toạ độ trong khung: ellipse mềm, phía trên (trán) mờ sớm hơn để không đè vành nón / tóc
cx, cy = (xx - 0.5) / 0.5, (yy - 0.52) / 0.5
r = np.sqrt(cx ** 2 + (cy * np.where(cy < 0, 1.15, 1.0)) ** 2)
alpha = np.clip((1.0 - r) / 0.28, 0, 1) ** 1.3
bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16 + 1 / 32
alpha = (alpha > np.tile(bayer, (128, 128))).astype(float)   # viền mờ dần bằng chấm lưới, cắt alpha 0,5
rgba = np.dstack([np.clip(crop, 0, 255), alpha * 255]).astype(np.uint8)
bio = io.BytesIO(); Image.fromarray(rgba, 'RGBA').save(bio, 'PNG'); data = bio.getvalue()

def add_raw(b):
    while len(g.bin) % 4: g.bin.append(0)
    off = len(g.bin); g.bin += b; J['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': len(b)}); return len(J['bufferViews']) - 1
def add(arr, typ, ct, mm=False):
    arr = np.ascontiguousarray(arr); bvi = add_raw(arr.tobytes())
    a = {'bufferView': bvi, 'componentType': ct, 'count': int(arr.shape[0]), 'type': typ}
    if mm: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
    J['accessors'].append(a); return len(J['accessors']) - 1

# UV của mặt nạ trong ảnh đã cắt
U, V = uv(P[:, 0], P[:, 1]); UV = np.stack([(U - u0) / (u1 - u0), (V - v0) / (v1 - v0)], 1)
# pháp tuyến lưới mượt
# pháp tuyến như một khuôn mặt tròn mượt (không theo gờ méo của lưới gốc) để ánh sáng đều, không vệt tối
N = np.stack([(P[:, 0] - cxm) / (hw * 1.6), (P[:, 1] - (top + bot) / 2) / ((top - bot) * 1.4), -np.ones(len(P))], 1)
N /= np.linalg.norm(N, axis=1, keepdims=True)
I = []
for i in range(NY - 1):
    for k in range(NX - 1):
        a, b, c, d = i * NX + k, i * NX + k + 1, (i + 1) * NX + k, (i + 1) * NX + k + 1
        I += [a, c, b, b, c, d]
I = np.array(I, np.uint16)
fn = np.cross(P[I[1]] - P[I[0]], P[I[2]] - P[I[0]])
if fn @ N[I[0]] < 0: I = I.reshape(-1, 3)[:, [0, 2, 1]].ravel()   # mặt trước quay ra ngoài
jt = np.zeros((len(P), 4), np.uint8 if len(joints) < 256 else np.uint16); jt[:, 0] = JI['Head']
wt = np.zeros((len(P), 4), np.float32); wt[:, 0] = 1
img_i = len(J['images']); J['images'].append({'bufferView': add_raw(data), 'mimeType': 'image/png', 'name': 'mat-2d'})
J['textures'].append({'sampler': J['textures'][ti].get('sampler', 0), 'source': img_i})
J['materials'].append({'name': 'Face2D', 'alphaMode': 'MASK', 'alphaCutoff': 0.5, 'doubleSided': True,
                       'pbrMetallicRoughness': {'baseColorTexture': {'index': len(J['textures']) - 1}, 'metallicFactor': 0, 'roughnessFactor': 0.6}})
mesh['primitives'].append({'attributes': {'POSITION': add(P.astype('<f4'), 'VEC3', 5126, True), 'NORMAL': add(N.astype('<f4'), 'VEC3', 5126),
                                          'TEXCOORD_0': add(UV.astype('<f4'), 'VEC2', 5126), 'JOINTS_0': add(jt, 'VEC4', 5121 if jt.dtype == np.uint8 else 5123),
                                          'WEIGHTS_0': add(wt, 'VEC4', 5126)},
                           'indices': add(I.reshape(-1, 1), 'SCALAR', 5123), 'material': len(J['materials']) - 1})
J['buffers'][0]['byteLength'] = len(g.bin); g.compact(); g.save(dst)
print('mặt 2D: khung x %.3f..%.3f y %.3f..%.3f' % (x0, x1, bot, top), 'lỗ vá %.1f%%' % (100 * hole.mean()), 'sai số chiếu %.3f' % res)
