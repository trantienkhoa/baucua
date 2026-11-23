# Sửa khung xương + trọng số cho nhân vật tạo tự động: tay xương thẳng đứng nhưng lưới tay dang chữ A
import sys, numpy as np
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glbio import GLB
src, dst = sys.argv[1], sys.argv[2]
g = GLB(src); J = g.j; nodes = J['nodes']; skin = J['skins'][0]; joints = skin['joints']
name = lambda i: nodes[i].get('name', '').replace('mixamorig:', '')
NID = {name(i): i for i in range(len(nodes))}

def q2m(q):
    x, y, z, w = q
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
def m2q(m):
    t = np.trace(m)
    if t > 0: s = np.sqrt(t+1)*2; return np.array([(m[2,1]-m[1,2])/s, (m[0,2]-m[2,0])/s, (m[1,0]-m[0,1])/s, s/4])
    i = np.argmax(np.diag(m))
    if i == 0: s = np.sqrt(1+m[0,0]-m[1,1]-m[2,2])*2; return np.array([s/4, (m[0,1]+m[1,0])/s, (m[0,2]+m[2,0])/s, (m[2,1]-m[1,2])/s])
    if i == 1: s = np.sqrt(1+m[1,1]-m[0,0]-m[2,2])*2; return np.array([(m[0,1]+m[1,0])/s, s/4, (m[1,2]+m[2,1])/s, (m[0,2]-m[2,0])/s])
    s = np.sqrt(1+m[2,2]-m[0,0]-m[1,1])*2; return np.array([(m[0,2]+m[2,0])/s, (m[1,2]+m[2,1])/s, s/4, (m[1,0]-m[0,1])/s])
def local(i):
    n = nodes[i]; M = np.eye(4)
    M[:3, :3] = q2m(n.get('rotation', [0, 0, 0, 1])) @ np.diag(n.get('scale', [1, 1, 1])); M[:3, 3] = n.get('translation', [0, 0, 0]); return M
parent = {}
for i, n in enumerate(nodes):
    for c in n.get('children', []): parent[c] = i
def world(i):
    M = local(i)
    while i in parent: i = parent[i]; M = local(i) @ M
    return M
P = lambda n: world(NID[n])[:3, 3]
need = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'HeadTop_End'] + [s + b for s in ('Left', 'Right') for b in ('Shoulder', 'Arm', 'ForeArm', 'Hand', 'UpLeg', 'Leg', 'Foot', 'ToeBase', 'Toe_End')]
miss = [b for b in need if b not in NID]
if miss: print('LOI: thiếu xương', miss); sys.exit(2)
SC = P('Hips')[1] / 0.842   # tỉ lệ so với nhân vật mẫu tp-002 (hông cao 0.842 m)

prims = J['meshes'][0]['primitives']
POS = [g.acc(p['attributes']['POSITION']).astype(float) for p in prims]
allP = np.concatenate(POS)

# ---- 1. đo trục tay thật từ lưới, xoay xương vai/tay cho khớp ----
arminfo = {}
for side, sg in (('Left', -1), ('Right', 1)):
    S = P(side + 'Arm')
    pts = allP[(allP[:, 0] * sg > 0.21 * SC) & (allP[:, 1] > 0.70 * SC) & (allP[:, 1] < 1.18 * SC)]
    lo = pts[pts[:, 1] < np.percentile(pts[:, 1], 6)]                     # cổ tay / bàn tay
    tip = lo.mean(0)
    d = tip - S; L = np.linalg.norm(d); d /= L
    ai = NID[side + 'Arm']; Wm = world(ai); old = Wm[:3, :3] @ np.array([0, 1, 0.]); old /= np.linalg.norm(old)
    v = np.cross(old, d); c = old @ d; vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    R = np.eye(3) + vx + vx @ vx / (1 + c)
    newW = R @ Wm[:3, :3]; Pw = world(parent[ai])[:3, :3]
    nodes[ai]['rotation'] = list(map(float, m2q(Pw.T @ newW)))
    # kéo dài cẳng tay nếu tay lưới dài hơn xương
    fa, ha = NID[side + 'ForeArm'], NID[side + 'Hand']
    bl = nodes[fa]['translation'][1] + nodes[ha]['translation'][1]
    k = (L * 0.93) / bl
    for n2 in (fa, ha): t = nodes[n2]['translation']; nodes[n2]['translation'] = [t[0]*k, t[1]*k, t[2]*k]
    rad = np.median(np.linalg.norm(np.cross(pts - S, d), axis=1))
    arminfo[side] = (S, d, L, rad)
    print(side, 'tay dài', round(L, 3), 'bán kính', round(rad, 3), 'hệ số', round(k, 3))

# ma trận bind mới
ib = J['accessors'][skin['inverseBindMatrices']]
IBM = np.stack([np.linalg.inv(world(j)).T.reshape(-1) for j in joints]).astype('<f4')
g.put(skin['inverseBindMatrices'], IBM)

# ---- 2. trọng số theo đoạn xương ----
JI = {name(j): k for k, j in enumerate(joints)}
def seg(a, b): return P(a), P(b)
hand_end = lambda s: P(s + 'Hand') + (P(s + 'Hand') - P(s + 'ForeArm')) / np.linalg.norm(P(s + 'Hand') - P(s + 'ForeArm')) * 0.12
SEG = {'Hips': seg('Hips', 'Spine'), 'Spine': seg('Spine', 'Spine1'), 'Spine1': seg('Spine1', 'Spine2'), 'Spine2': seg('Spine2', 'Neck'), 'Neck': seg('Neck', 'Head'), 'Head': seg('Head', 'HeadTop_End')}
for s in ('Left', 'Right'):
    SEG[s+'Shoulder'] = seg(s+'Shoulder', s+'Arm'); SEG[s+'Arm'] = seg(s+'Arm', s+'ForeArm'); SEG[s+'ForeArm'] = seg(s+'ForeArm', s+'Hand'); SEG[s+'Hand'] = (P(s+'Hand'), hand_end(s))
    SEG[s+'UpLeg'] = seg(s+'UpLeg', s+'Leg'); SEG[s+'Leg'] = seg(s+'Leg', s+'Foot'); SEG[s+'Foot'] = seg(s+'Foot', s+'ToeBase'); SEG[s+'ToeBase'] = seg(s+'ToeBase', s+'Toe_End')
RAD = {'Hips': .16, 'Spine': .17, 'Spine1': .17, 'Spine2': .16, 'Neck': .06, 'Head': .1}
for s in ('Left', 'Right'): RAD.update({s+'Shoulder': .07, s+'Arm': .05, s+'ForeArm': .045, s+'Hand': .035, s+'UpLeg': .09, s+'Leg': .07, s+'Foot': .05, s+'ToeBase': .04})
bones = list(SEG)
def segdist(X, a, b):
    ab = b - a; t = np.clip(((X - a) @ ab) / (ab @ ab), 0, 1); return np.linalg.norm(X - (a + t[:, None] * ab), axis=1), t

Y0, DY = 0.5 * SC, 0.01
ARMTHR, tipY = {}, {}
for s_, (S, d, L, rad) in arminfo.items():
    sg = -1 if s_ == 'Left' else 1
    tipY[s_] = (S + d * L)[1]
    nb = int((S[1] + 0.05 - Y0) / DY) + 1; thr = np.full(nb, 9.0); gapw = []
    for b in range(nb):
        y = Y0 + b * DY; xs = np.sort(allP[(np.abs(allP[:, 1] - y) < DY) & (allP[:, 0] * sg > 0.1)][:, 0] * sg)
        ax = (S + d * ((y - S[1]) / d[1]))[0] * sg if d[1] != 0 else S[0] * sg   # trục tay ở độ cao y
        if len(xs) < 4 or y < tipY[s_] - 0.15: continue
        gaps = np.diff(xs); cand = [(gaps[i], (xs[i] + xs[i + 1]) / 2) for i in range(len(gaps)) if gaps[i] > 0.012 and ax - 0.12 < xs[i] < ax]
        if cand: g_, m_ = max(cand); thr[b] = m_; gapw.append(ax - m_)
        else: thr[b] = -1   # chưa biết
    hw = np.median(gapw) if gapw else 0.07
    for b in range(nb):
        if thr[b] == -1:
            y = Y0 + b * DY; ax = (S + d * ((y - S[1]) / d[1]))[0] * sg
            thr[b] = ax - hw * 1.05
    ARMTHR[s_] = thr
    print(s_, 'nửa bề ngang tay', round(hw, 3))
for pi, p in enumerate(prims):
    X = POS[pi]; n = len(X)
    D = np.stack([np.maximum(1e-3, segdist(X, *SEG[b])[0] - RAD[b] * 0.6) for b in bones], 1)
    side = np.sign(X[:, 0])   # -1 trái, +1 phải
    allow = np.ones_like(D, bool)
    for k, b in enumerate(bones):
        low = X[:, 1] < P('Hips')[1] - 0.06   # dưới háng: chân trái / phải tách hẳn, không dính nhau
        mid = (np.abs(X[:, 0]) < 0.02) & ~low
        if b.startswith('Left'): allow[:, k] = (side < 0) | mid
        if b.startswith('Right'): allow[:, k] = (side > 0) | mid
    # độ "thuộc tay" mềm (0..1) theo khe hở tay–thân ở từng lát cắt; gần nách theo trục tay
    sArm = np.zeros(n)
    for s_, (S, d, L, rad) in arminfo.items():
        sg = -1 if s_ == 'Left' else 1
        thr = ARMTHR[s_]; yb = np.clip(((X[:, 1] - Y0) / DY).astype(int), 0, len(thr) - 1)
        on = (np.sign(X[:, 0]) == sg) & (X[:, 1] < S[1] + 0.03) & (X[:, 1] > tipY[s_] - 0.15)
        sv = np.clip((X[:, 0] * sg - thr[yb]) / 0.03 + 0.5, 0, 1) * on
        sArm = np.maximum(sArm, sv)
        dh, _ = segdist(X, *SEG[s_ + 'Hand']); dfa, _ = segdist(X, *SEG[s_ + 'ForeArm'])
        sArm = np.maximum(sArm, ((dh < 0.055) | (dfa < 0.04)) * (np.sign(X[:, 0]) == sg) * 1.0)   # bàn tay, cẳng tay chắc chắn theo tay
    armK = [k for k, b in enumerate(bones) if b.endswith(('Arm', 'ForeArm', 'Hand'))]
    restK = [k for k in range(len(bones)) if k not in armK]
    Wb = np.where(allow, 1 / D ** 4, 0)
    Wa = Wb.copy(); Wa[:, restK] = 0
    Wr = Wb.copy(); Wr[:, armK] = 0
    nz = lambda A: A / np.maximum(1e-12, A.sum(1, keepdims=True))
    W = sArm[:, None] * nz(Wa) + (1 - sArm[:, None]) * nz(Wr)
    W[Wa.sum(1) == 0] = nz(Wr)[Wa.sum(1) == 0]
    head = X[:, 1] > P('Head')[1] + 0.005
    W[head] = 0; W[head, bones.index('Head')] = 1
    W = nz(W)
    idx = g.acc(p['indices']).reshape(-1, 3).astype(np.int64)
    _, wid = np.unique(np.round(X / 2e-4).astype(np.int64), axis=0, return_inverse=True); wid = wid.ravel(); m = wid.max() + 1
    def pool(A):   # trung bình theo đỉnh gộp
        S_ = np.zeros((m, A.shape[1])); np.add.at(S_, wid, A); c_ = np.bincount(wid, minlength=m)[:, None]; return (S_ / c_)[wid]
    W = nz(pool(W)); allowW = pool(allow.astype(float)) > 0.5; headW = pool(head[:, None].astype(float))[:, 0] > 0.5
    WI = wid[idx]; E = np.concatenate([WI[:, [0, 1]], WI[:, [1, 2]], WI[:, [2, 0]]])
    Wm = np.zeros((m, W.shape[1])); np.add.at(Wm, wid, W); Wm = nz(Wm)
    allowM = np.zeros((m, W.shape[1]), bool); allowM[wid] = allowW; headM = np.zeros(m, bool); headM[wid] = headW
    for _ in range(6):
        acc = np.zeros_like(Wm); cnt = np.zeros(m)
        np.add.at(acc, E[:, 0], Wm[E[:, 1]]); np.add.at(acc, E[:, 1], Wm[E[:, 0]]); np.add.at(cnt, E[:, 0], 1); np.add.at(cnt, E[:, 1], 1)
        Wn = (Wm + acc) / (1 + cnt)[:, None]
        Wn = np.where(allowM, Wn, 0); Wn[headM] = Wm[headM]
        Wm = nz(Wn)
    W = Wm[wid]
    # bỏ tam giác "màng" nối hai chân với nhau, và tam giác nối bàn tay với gấu áo (lưới dính do máy tạo)
    legL = W[:, [bones.index(b) for b in bones if b.startswith('Left') and b.endswith(('UpLeg', 'Leg', 'Foot', 'ToeBase'))]].sum(1)
    legR = W[:, [bones.index(b) for b in bones if b.startswith('Right') and b.endswith(('UpLeg', 'Leg', 'Foot', 'ToeBase'))]].sum(1)
    armW = W[:, armK].sum(1)
    tri = idx; low = X[tri, 1].max(1) < P('Hips')[1] - 0.04
    bridge = low & (legL[tri].max(1) > 0.6) & (legR[tri].max(1) > 0.6)
    spike = (armW[tri].max(1) - armW[tri].min(1) > 0.7) & (X[tri, 1].max(1) < P('LeftArm')[1] - 0.22)
    kill = bridge | spike
    if kill.any():
        ni = idx.copy(); ni[kill] = ni[kill][:, :1]
        ia = J['accessors'][p['indices']]; g.put(p['indices'], ni.reshape(-1, 1).astype({5123: '<u2', 5125: '<u4'}[ia['componentType']]))
    print('prim', pi, 'bỏ màng chân', int(bridge.sum()), 'bỏ gai tay–áo', int(spike.sum()))
    top = np.argsort(-W, 1)[:, :4]; tw = np.take_along_axis(W, top, 1); tw /= tw.sum(1, keepdims=True)
    jj = np.vectorize(lambda k: JI[bones[k]])(top)
    ja = J['accessors'][p['attributes']['JOINTS_0']]
    g.put(p['attributes']['JOINTS_0'], jj.astype({5121: 'u1', 5123: '<u2'}[ja['componentType']]))
    wa = J['accessors'][p['attributes']['WEIGHTS_0']]['componentType']
    g.put(p['attributes']['WEIGHTS_0'], tw.astype('<f4') if wa == 5126 else np.round(tw * (255 if wa == 5121 else 65535)))
for m in J['materials']: m['doubleSided'] = True   # chỗ dưới nách lưới thủng: hiện mặt trong thay vì lỗ trong suốt
g.save(dst); print('saved', dst)
