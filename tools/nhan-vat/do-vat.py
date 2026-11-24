# Món đồ xách tay (giỏ...) của tay "xách đồ" (sua-xuong.py giữ tay + đồ yên theo ngực): tách phần món đồ dưới bàn tay
# ra một xương riêng "DoVat" để khi ngồi có thể đặt đồ xuống đất bên cạnh (giống quang gánh).
# python do-vat.py <vào.glb> <ra.glb>   (không có tay xách đồ thì chép nguyên, báo "khong-co")
import sys, os, shutil, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glbio import GLB
src, dst = sys.argv[1], sys.argv[2]
g = GLB(src); J = g.j; nodes = J['nodes']; skin = J['skins'][0]; joints = skin['joints']
name = lambda i: nodes[i].get('name', '').replace('mixamorig:', '')
JI = {name(j): k for k, j in enumerate(joints)}
if 'DoVat' in JI or 'Spine2' not in JI:
    if os.path.abspath(src) != os.path.abspath(dst): shutil.copy(src, dst)
    print('khong-co'); sys.exit(0)
IBM = g.acc(skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
Pw = lambda b: np.linalg.inv(IBM[JI[b]])[:3, 3]
SC = Pw('Hips')[1] / 0.842; s2 = JI['Spine2']
best = None
for side, sg in (('Left', -1), ('Right', 1)):
    hy = Pw(side + 'Hand')[1]; pick = []
    for pi, p in enumerate(J['meshes'][0]['primitives']):
        X = g.acc(p['attributes']['POSITION']).astype(float); Jn = g.acc(p['attributes']['JOINTS_0']); W = g.acc(p['attributes']['WEIGHTS_0']).astype(float)
        W = W / np.maximum(1e-9, W.sum(1, keepdims=True))
        on = ((Jn == s2) * W).sum(1) > 0.95
        sel = on & (X[:, 0] * sg > 0.17 * SC) & (X[:, 1] < hy - 0.04 * SC) & (X[:, 1] > 0.2 * SC)
        if sel.any(): pick.append((pi, sel, X))
    n = sum(s.sum() for _, s, _ in pick)
    if n > 150 and (best is None or n > best[2]): best = (side, pick, n)
if not best:
    if os.path.abspath(src) != os.path.abspath(dst): shutil.copy(src, dst)
    print('khong-co'); sys.exit(0)
side, pick, n = best
allX = np.concatenate([X[s] for _, s, X in pick]); c = (allX.min(0) + allX.max(0)) / 2
# nút xương mới: con của Spine2, đặt tại tâm món đồ, hướng giữ theo khung nhân vật
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
    nd = nodes[i]; M = np.eye(4); M[:3, :3] = q2m(nd.get('rotation', [0, 0, 0, 1])) @ np.diag(nd.get('scale', [1, 1, 1])); M[:3, 3] = nd.get('translation', [0, 0, 0]); return M
parent = {ch: i for i, nd in enumerate(nodes) for ch in nd.get('children', [])}
def world(i):
    M = local(i)
    while i in parent: i = parent[i]; M = local(i) @ M
    return M
par = joints[s2]; Mw = np.eye(4); Mw[:3, 3] = c; L = np.linalg.inv(world(par)) @ Mw; Ls = np.linalg.norm(L[:3, :3], axis=0)
nodes.append({'name': 'mixamorig:DoVat', 'translation': L[:3, 3].tolist(), 'rotation': m2q(L[:3, :3] / Ls).tolist(), 'scale': Ls.tolist(),
              'extras': {'datY': float(c[1] - allX[:, 1].min()), 'ben': side}})   # datY: tâm cao hơn đáy bao nhiêu khi đặt xuống đất
gi = len(nodes) - 1; nodes[par].setdefault('children', []).append(gi); joints.append(gi); ji = len(joints) - 1
IB = np.vstack([g.acc(skin['inverseBindMatrices']).reshape(-1, 16), np.linalg.inv(Mw).T.reshape(1, 16)]).astype('<f4')
while len(g.bin) % 4: g.bin.append(0)
off = len(g.bin); g.bin += IB.tobytes(); J['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': IB.nbytes})
J['accessors'].append({'bufferView': len(J['bufferViews']) - 1, 'componentType': 5126, 'count': len(IB), 'type': 'MAT4'}); skin['inverseBindMatrices'] = len(J['accessors']) - 1
prims = J['meshes'][0]['primitives']
for pi, sel, X in pick:
    p = prims[pi]; ja = J['accessors'][p['attributes']['JOINTS_0']]; wa = J['accessors'][p['attributes']['WEIGHTS_0']]['componentType']
    jj = g.acc(p['attributes']['JOINTS_0']).copy(); ww = g.acc(p['attributes']['WEIGHTS_0']).astype(float).copy()
    jj[sel] = 0; jj[sel, 0] = ji; ww[sel] = 0; ww[sel, 0] = 1 if wa == 5126 else (255 if wa == 5121 else 65535)
    g.put(p['attributes']['JOINTS_0'], jj); g.put(p['attributes']['WEIGHTS_0'], ww)
    # tam giác vắt ngang giữa món đồ và tay/thân sẽ bị kéo dài khi đặt đồ xuống -> bỏ
    ia = J['accessors'][p['indices']]; I = g.acc(p['indices']).reshape(-1, 3).astype(np.int64)
    k = sel[I].sum(1); mix = (k > 0) & (k < 3)
    if mix.any():
        I[mix] = I[mix][:, :1]; g.put(p['indices'], I.reshape(-1, 1).astype({5123: '<u2', 5125: '<u4'}[ia['componentType']]))
    print('  bỏ', int(mix.sum()), 'tam giác vắt ngang')
J['buffers'][0]['byteLength'] = len(g.bin); g.compact(); g.save(dst)
print('món đồ tay', side, ':', int(n), 'đỉnh, tâm', c.round(3).tolist())
