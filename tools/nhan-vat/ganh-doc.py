# Đặt quang gánh dọc trên vai phải (thúng trước – thúng sau) và gắn vào một xương riêng "Ganh"
# để động tác có thể cho tay vịn, thúng nhún, hoặc đặt gánh xuống khi ngồi.
# python ganh-doc.py <vào.glb> <ra.glb>   (không có gánh thì chép nguyên và báo "khong-co-ganh")
import sys, os, shutil, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glbio import GLB
src, dst = sys.argv[1], sys.argv[2]
g = GLB(src); J = g.j; nodes = J['nodes']; skin = J['skins'][0]
pn = [i for i, n in enumerate(nodes) if 'mesh' in n and any(J['materials'][p.get('material', 0)].get('name') == 'Bamboo' for p in J['meshes'][n['mesh']]['primitives'])]
if not pn or any('Ganh' in nodes[j].get('name', '') for j in skin['joints']):
    if os.path.abspath(src) != os.path.abspath(dst): shutil.copy(src, dst)
    print('khong-co-ganh'); sys.exit(0)
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
    n = nodes[i]; M = np.eye(4); M[:3, :3] = q2m(n.get('rotation', [0, 0, 0, 1])) @ np.diag(n.get('scale', [1, 1, 1])); M[:3, 3] = n.get('translation', [0, 0, 0]); return M
parent = {c: i for i, n in enumerate(nodes) for c in n.get('children', [])}
def world(i):
    M = local(i)
    while i in parent: i = parent[i]; M = local(i) @ M
    return M
SC = world(NID['Hips'])[1, 3] / 0.842
# đỉnh vai phải đo từ lưới thân
B = g.acc(J['meshes'][0]['primitives'][0]['attributes']['POSITION']).astype(float)
xs = 0.13 * SC; sl = B[(np.abs(B[:, 0] - xs) < 0.012 * SC) & (B[:, 1] > 1.1 * SC) & (B[:, 1] < 1.5 * SC)]
sl = sl[sl[:, 1] < np.percentile(sl[:, 1], 100)]
top = np.percentile(sl[sl[:, 1] < world(NID['Neck'])[1, 3] + 0.02][:, 1], 99); zmid = np.median(sl[sl[:, 1] > top - 0.04][:, 2])
prims = J['meshes'][nodes[pn[0]]['mesh']]['primitives']
bam = [p for p in prims if J['materials'][p['material']].get('name') == 'Bamboo'][0]
BX = g.acc(bam['attributes']['POSITION']).astype(float); r = (BX[:, 1].max() - BX[:, 1].min()) / 2
c = np.array([0, (BX[:, 1].max() + BX[:, 1].min()) / 2, (BX[:, 2].max() + BX[:, 2].min()) / 2])
T = np.array([xs, top - 0.006 * SC + r, zmid])
for p in prims:
    X = g.acc(p['attributes']['POSITION']).astype(float) - c
    g.put(p['attributes']['POSITION'], (np.stack([X[:, 2], X[:, 1], -X[:, 0]], 1) + T).astype('<f4'))
    a = J['accessors'][p['attributes']['POSITION']]; Y = g.acc(p['attributes']['POSITION']); a['min'] = Y.min(0).tolist(); a['max'] = Y.max(0).tolist()
    if 'NORMAL' in p['attributes']:
        N = g.acc(p['attributes']['NORMAL']).astype(float); g.put(p['attributes']['NORMAL'], np.stack([N[:, 2], N[:, 1], -N[:, 0]], 1).astype('<f4'))
# xương Ganh: con của vai phải, đặt tại tâm đòn gánh
par = NID['RightShoulder']; Mw = np.eye(4); Mw[:3, 3] = T; L = np.linalg.inv(world(par)) @ Mw
Ls = np.linalg.norm(L[:3, :3], axis=0)
nodes.append({'name': 'mixamorig:Ganh', 'translation': L[:3, 3].tolist(), 'rotation': m2q(L[:3, :3] / Ls).tolist(), 'scale': Ls.tolist()})
gi = len(nodes) - 1; nodes[par].setdefault('children', []).append(gi)
skin['joints'].append(gi); ji = len(skin['joints']) - 1
IBM = g.acc(skin['inverseBindMatrices']).reshape(-1, 16); IBM = np.vstack([IBM, np.linalg.inv(Mw).T.reshape(1, 16)]).astype('<f4')
while len(g.bin) % 4: g.bin.append(0)
off = len(g.bin); g.bin += IBM.tobytes(); J['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': IBM.nbytes})
J['accessors'].append({'bufferView': len(J['bufferViews']) - 1, 'componentType': 5126, 'count': len(IBM), 'type': 'MAT4'}); skin['inverseBindMatrices'] = len(J['accessors']) - 1
for p in prims:
    ja = J['accessors'][p['attributes']['JOINTS_0']]; n = ja['count']
    jj = np.zeros((n, 4)); jj[:, 0] = ji; ww = np.zeros((n, 4)); ww[:, 0] = 1
    g.put(p['attributes']['JOINTS_0'], jj.astype({5121: 'u1', 5123: '<u2'}[ja['componentType']]))
    wa = J['accessors'][p['attributes']['WEIGHTS_0']]['componentType']
    g.put(p['attributes']['WEIGHTS_0'], ww.astype('<f4') if wa == 5126 else ww * (255 if wa == 5121 else 65535))
J['buffers'][0]['byteLength'] = len(g.bin); g.compact(); g.save(dst)
print('gánh dọc vai phải: tâm', T.round(3).tolist(), 'xương', ji)
