# Ghi các động tác (đã tính sẵn ra JSON) vào file GLB làm animation
# python gan-dong-tac.py <thư mục glbio> <vào.glb> <ra.glb> <dong-tac.json>
import json, sys, numpy as np
sys.path.insert(0, sys.argv[1]); from glbio import GLB
g = GLB(sys.argv[2]); j = g.j; data = json.load(open(sys.argv[4]))
name2node = {n.get('name', '').replace('mixamorig:', '').replace('mixamorig', ''): i for i, n in enumerate(j['nodes'])}
j['animations'] = []
def add(arr, typ, mm=False):
    arr = np.ascontiguousarray(arr, np.float32)
    while len(g.bin) % 4: g.bin.append(0)
    off = len(g.bin); g.bin += arr.tobytes()
    j['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': arr.nbytes})
    a = {'bufferView': len(j['bufferViews'])-1, 'componentType': 5126, 'count': int(arr.shape[0]), 'type': typ}
    if mm: a['min'] = [float(arr.min())]; a['max'] = [float(arr.max())]
    j['accessors'].append(a); return len(j['accessors'])-1
for an, d in data.items():
    t = np.array(d['times'], np.float32); ti = add(t, 'SCALAR', True)
    smp, ch = [], []
    for bone, q in d['q'].items():
        q = np.array(q, np.float32).reshape(-1, 4)
        for k in range(1, len(q)):
            if np.dot(q[k], q[k-1]) < 0: q[k] = -q[k]
        smp.append({'input': ti, 'output': add(q, 'VEC4'), 'interpolation': 'LINEAR'}); ch.append({'sampler': len(smp)-1, 'target': {'node': name2node[bone], 'path': 'rotation'}})
    h = np.array(d['hip'], np.float32).reshape(-1, 3)
    smp.append({'input': ti, 'output': add(h, 'VEC3'), 'interpolation': 'LINEAR'}); ch.append({'sampler': len(smp)-1, 'target': {'node': name2node['Hips'], 'path': 'translation'}})
    if 'gp' in d:   # xương Ganh có dời vị trí (đặt gánh xuống)
        gp = np.array(d['gp'], np.float32).reshape(-1, 3)
        smp.append({'input': ti, 'output': add(gp, 'VEC3'), 'interpolation': 'LINEAR'}); ch.append({'sampler': len(smp)-1, 'target': {'node': name2node['Ganh'], 'path': 'translation'}})
    j['animations'].append({'name': an, 'samplers': smp, 'channels': ch})
j['buffers'][0]['byteLength'] = len(g.bin); g.compact(); g.save(sys.argv[3]); print(len(j['animations']), 'animations')
