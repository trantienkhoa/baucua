# Dựng một đầu người từ khuôn MakeHuman (dau-mh.npz, CC0): giới tính, tuổi, dáng mặt.
# Trả về các phần giống đầu mẫu cũ: Head (V, N, F), EyeLeft, EyeRight (nhãn cầu tròn mịn), vị trí miệng. Mặt nhìn về +Z, đơn vị mét.
import os, numpy as np
_P = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dau-mh.npz')
_D = None
def _load():
    global _D
    if _D is None: _D = dict(np.load(_P))
    return _D
SHAPES = ('rong', 'beo', 'cam_rong', 'gomag')   # các núm hai chiều (+/-)
def deform(nu=0.5, tuoi=35, w=None):
    """nu: 0 = nam, 1 = nữ. tuoi: năm. w: {tên: hệ số} cho dáng (SHAPES: -1..1; 'tron', 'vuong', 'oval', 'tamgiac': 0..1)."""
    d = _load(); V = d['V'].astype(float).copy()
    a = np.clip((tuoi - 25) / 65, 0, 1)   # MakeHuman: 25 tuổi = trẻ, 90 = già
    for k, wk in (('nam_tre', (1 - nu) * (1 - a)), ('nu_tre', nu * (1 - a)), ('nam_gia', (1 - nu) * a), ('nu_gia', nu * a)):
        V += wk * d['t_' + k]
    for k, x in (w or {}).items():
        if k in SHAPES: V += abs(x) * d['t_' + k + ('+' if x > 0 else '-')]
        else: V += x * d['t_' + k]
    return V
def _normals(V, F):
    N = np.zeros_like(V); fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    for k in range(3): np.add.at(N, F[:, k], fn)
    return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)
def _sphere(c, r, nu=24, nv=16):
    th, ph = np.meshgrid(np.linspace(0, 2 * np.pi, nu, endpoint=False), np.linspace(0, np.pi, nv + 1))
    P = np.stack([np.sin(ph) * np.cos(th), np.cos(ph), np.sin(ph) * np.sin(th)], -1).reshape(-1, 3)
    F = []
    for i in range(nv):
        for j in range(nu):
            a, b, c2, d2 = i * nu + j, i * nu + (j + 1) % nu, (i + 1) * nu + j, (i + 1) * nu + (j + 1) % nu
            F += [[a, b, c2], [b, d2, c2]]
    return c + r * P, P.copy(), np.array(F, np.int64)
def build(nu=0.5, tuoi=35, w=None):
    w = dict(w or {}); w.setdefault('mo_mat', 0.4)   # khuôn gốc mí hơi khép: mở vừa cho mắt trong ảnh nằm đúng lòng mắt
    d = _load(); V = deform(nu, tuoi, w); nh, ne, nt = int(d['n_head']), int(d['n_eye']), int(d['n_teeth'])
    Fh = d['F'].astype(np.int64); H = V[:nh]
    parts = {'Head': (H, _normals(H, Fh), Fh)}
    for k, sl in (('EyeLeft', slice(nh, nh + ne)), ('EyeRight', slice(nh + ne, nh + 2 * ne))):
        E = V[sl]; c = E.mean(0); r = np.linalg.norm(E - c, axis=1).mean()
        parts[k] = _sphere(c, r)
    parts['mouth'] = V[nh + 2 * ne:].mean(0)
    # chuẩn hoá cỡ: khoảng cách hai mắt = 0,0609 m (như đầu mẫu cũ) để phép co giãn theo ảnh giữ nguyên ngưỡng
    k = 0.0609 / abs(parts['EyeLeft'][0].mean(0)[0] - parts['EyeRight'][0].mean(0)[0])
    for n in ('Head', 'EyeLeft', 'EyeRight'): parts[n] = (parts[n][0] * k,) + parts[n][1:]
    parts['mouth'] = parts['mouth'] * k
    return parts
