# Đóng gói khuôn đầu người từ MakeHuman (tài sản CC0) thành tools/nhan-vat/dau-mh.npz cho dau-chuan.py.
# Chỉ cần chạy lại khi muốn đổi bộ dáng đầu. Không cần cho quy trình hằng ngày (file .npz đã có sẵn).
#   git clone --depth 1 https://github.com/makehumancommunity/makehuman.git
#   python tao-dau-mh.py <makehuman/makehuman/data>
# Lấy: lưới base.obj vùng đầu + cổ, hai nhãn cầu, vị trí răng (miệng), và độ dời của các "target" (dáng đầu, cằm, má,
# giới tính + tuổi người châu Á). Đơn vị đổi sang mét (MakeHuman: 1 đơn vị = 1 dm).
import sys, os, numpy as np
D = sys.argv[1]; OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dau-mh.npz')
V = []; G = {}; g = None
for l in open(os.path.join(D, '3dobjs', 'base.obj')):
    if l.startswith('v '): V.append([float(x) for x in l.split()[1:4]])
    elif l.startswith('g '): g = l.split()[1]
    elif l.startswith('f '): G.setdefault(g, []).append([int(t.split('/')[0]) - 1 for t in l.split()[1:]])
V = np.array(V)
ids = lambda k: np.unique(np.array(G[k]).ravel())
le, re = V[ids('helper-l-eye')].mean(0), V[ids('helper-r-eye')].mean(0); ed = np.linalg.norm(le - re); ey = le[1]
body = np.array(G['body'])
ycut = ey - 3.35 * ed   # như đầu mẫu cũ: tới chân cổ
keep = (V[body][:, :, 1] > ycut).all(1) & (np.abs(V[body][:, :, 0]) < 1.6 * ed).all(1)
# chỉ giữ mảng liền với đầu (bỏ mẩu vai lọt vào)
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
Q = body[keep]; e = np.r_[Q[:, [0, 1]], Q[:, [1, 2]], Q[:, [2, 3]], Q[:, [3, 0]]]
n, lab = connected_components(coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(len(V), len(V))), directed=False)
top = lab[np.argmax(V[:, 1] * np.isin(np.arange(len(V)), Q))]
Q = Q[lab[Q[:, 0]] == top]
head_v = np.unique(Q.ravel()); eye_l, eye_r, teeth = ids('helper-l-eye'), ids('helper-r-eye'), ids('helper-upper-teeth')
region = np.concatenate([head_v, eye_l, eye_r, teeth]); remap = -np.ones(len(V), np.int64); remap[head_v] = np.arange(len(head_v))
F = remap[Q]; F = np.r_[F[:, [0, 1, 2]], F[:, [0, 2, 3]]]
def target(path):
    d = np.zeros((len(V), 3))
    for l in open(path):
        if l[:1].isdigit():
            a = l.split(); d[int(a[0])] = [float(x) for x in a[1:4]]
    return d[region] * 0.1
TG = {
    'nam_tre': 'macrodetails/asian-male-young', 'nu_tre': 'macrodetails/asian-female-young',
    'nam_gia': 'macrodetails/asian-male-old', 'nu_gia': 'macrodetails/asian-female-old',
    'rong+': 'head/head-scale-horiz-incr', 'rong-': 'head/head-scale-horiz-decr',
    'beo+': 'head/head-fat-incr', 'beo-': 'head/head-fat-decr',
    'cam_rong+': 'chin/chin-width-incr', 'cam_rong-': 'chin/chin-width-decr',
    'tron': 'head/head-round', 'vuong': 'head/head-square', 'oval': 'head/head-oval', 'tamgiac': 'head/head-triangular',
    'gomag+': 'cheek/l-cheek-bones-incr|cheek/r-cheek-bones-incr', 'gomag-': 'cheek/l-cheek-bones-decr|cheek/r-cheek-bones-decr',
    'mo_mat': 'eyes/l-eye-height1-incr|eyes/r-eye-height1-incr|eyes/l-eye-height2-incr|eyes/r-eye-height2-incr|eyes/l-eye-height3-incr|eyes/r-eye-height3-incr',
}
arr = {}
for k, ps in TG.items():
    arr['t_' + k] = sum(target(os.path.join(D, 'targets', p + '.target')) for p in ps.split('|')).astype(np.float16)
np.savez_compressed(OUT, V=(V[region] * 0.1).astype(np.float32), F=F.astype(np.int32), n_head=len(head_v), n_eye=len(eye_l), n_teeth=len(teeth),
                    names=np.array(list(TG.keys())), **arr)
print('đã ghi', OUT, 'đỉnh đầu', len(head_v), 'tam giác', len(F), 'cỡ', os.path.getsize(OUT) // 1024, 'KB')
