# Làm nhẹ nhân vật mà hình không đổi.
# Lưới máy tạo là "súp tam giác": mỗi tam giác có 3 đỉnh riêng chỉ để mang pháp tuyến phẳng của mặt.
# Gộp các đỉnh trùng (vị trí + UV + xương + trọng số) và bỏ pháp tuyến: trình xem glTF tự tô phẳng từng mặt (flat shading),
# cho đúng hình như cũ mà số đỉnh giảm ~3 lần.  python lam-nhe.py <vào.glb> <ra.glb>
import sys, os, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glbio import GLB, CT, NC
g = GLB(sys.argv[1]); J = g.j
def add(arr, typ, ct, mm=False):
    arr = np.ascontiguousarray(arr)
    while len(g.bin) % 4: g.bin.append(0)
    off = len(g.bin); g.bin += arr.tobytes()
    J['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': arr.nbytes})
    a = {'bufferView': len(J['bufferViews']) - 1, 'componentType': ct, 'count': int(arr.shape[0]), 'type': typ}
    if mm: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
    J['accessors'].append(a); return len(J['accessors']) - 1
before = after = 0
for m in J['meshes']:
    for p in m['primitives']:
        A = p['attributes']; X = g.acc(A['POSITION']).astype(float); I = g.acc(p['indices']).reshape(-1, 3).astype(np.int64)
        flat = False
        if 'NORMAL' in A:
            N = g.acc(A['NORMAL']).astype(float)
            fn = np.cross(X[I[:, 1]] - X[I[:, 0]], X[I[:, 2]] - X[I[:, 0]]); ln = np.linalg.norm(fn, axis=1); ok = ln > 1e-12
            same = np.abs(N[I] - N[I][:, :1]).max((1, 2)) < 1e-3
            dot = np.einsum('ij,ij->i', N[I[ok, 0]], fn[ok] / ln[ok, None])
            flat = same[ok].mean() > 0.999 and (np.abs(dot) > 0.99).mean() > 0.999
        keys = [k for k in A if not (flat and k == 'NORMAL')]
        raw = {k: g.acc(A[k]) for k in keys}
        rows = np.concatenate([np.ascontiguousarray(raw[k]).view(np.uint8).reshape(len(X), -1) for k in keys], 1)
        _, first, inv = np.unique(rows, axis=0, return_index=True, return_inverse=True); inv = inv.ravel()
        order = np.argsort(first); remap = np.empty_like(order); remap[order] = np.arange(len(order))
        newI = remap[inv][I.ravel()]; keepv = first[order]
        before += len(X); after += len(keepv)
        na = {}
        for k in keys:
            a = J['accessors'][A[k]]; dt, _ = CT[a['componentType']]
            arr = raw[k][keepv].astype(dt)
            na[k] = add(arr, a['type'], a['componentType'], mm=(k == 'POSITION'))
            for f in ('normalized',):
                if f in a: J['accessors'][na[k]][f] = a[f]
        p['attributes'] = na
        ct = 5123 if len(keepv) < 65535 else 5125
        p['indices'] = add(newI.astype('<u2' if ct == 5123 else '<u4').reshape(-1, 1), 'SCALAR', ct)
J['buffers'][0]['byteLength'] = len(g.bin); g.compact(); g.save(sys.argv[2])
print('đỉnh', before, '->', after, '(giảm %.1f lần)' % (before / max(1, after)))
