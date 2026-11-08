# Gắn xương tự động cho nhân vật 3D đứng thẳng, tay buông (xuất từ trimesh, màu theo đỉnh).
# Chạy: S_IN=in.glb S_OUT=out.glb S_H=1.68 python3 -c "import bpy,runpy;runpy.run_path('autorig.py')"
import bpy, bmesh, os, math
import numpy as np
from mathutils import Vector, Matrix

IN, OUT = os.environ['S_IN'], os.environ['S_OUT']
TARGET_H = float(os.environ.get('S_H', '1.68'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=IN)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for o in bpy.data.objects: o.select_set(o in meshes)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(bpy.data.objects):
    if o is not ob: bpy.data.objects.remove(o, do_unlink=True)

me = ob.data
co = np.array([v.co[:] for v in me.vertices], np.float64)
# trục gốc: đầu theo +Z glTF, mặt nhìn +X glTF; sau khi Blender nhập: glTF (x,y,z) → (x,-z,y)
# muốn: lên = +Z, trước mặt = -Y (chuẩn Blender → +Z glTF khi xuất), trái nhân vật = +X
b = co.copy()
co = np.stack([b[:, 2], -b[:, 0], -b[:, 1]], 1)
# kiểm tra đầu ở trên: lát trên cùng phải hẹp hơn lát ngang hông
z0, z1 = co[:, 2].min(), co[:, 2].max()
def width(lo, hi):
    s = co[(co[:, 2] > lo) & (co[:, 2] < hi)]
    return np.ptp(s[:, 0]) if len(s) else 0
H0 = z1 - z0
if width(z1 - 0.08 * H0, z1) > width(z0, z0 + 0.08 * H0) * 1.6: co[:, 2] *= -1; co[:, 0] *= -1   # lộn ngược → lật
co -= [co[:, 0].mean(), co[:, 1].mean(), co[:, 2].min()]
sc = TARGET_H / np.ptp(co[:, 2]); co *= sc
H = TARGET_H
# căn giữa theo thân (dải ngang ngực) cho chuẩn hơn
band = co[(co[:, 2] > 0.6 * H) & (co[:, 2] < 0.75 * H)]
co[:, 0] -= np.median(band[:, 0]); co[:, 1] -= np.median(band[:, 1])
for v, p in zip(me.vertices, co): v.co = p
for p in me.polygons: p.use_smooth = True   # mịn: không tách đỉnh theo mặt khi xuất (file nhẹ, không gợn)

# ---------- đo mốc cơ thể ----------
def sl(z, dz=0.012 * H):
    return co[np.abs(co[:, 2] - z) < dz]
# cổ: chỗ hẹp nhất 0.80–0.90 H
zs = np.linspace(0.80 * H, 0.91 * H, 23)
wid = [np.ptp(sl(z)[:, 0]) if len(sl(z)) > 10 else 9 for z in zs]
neckZ = float(zs[int(np.argmin(wid))])
# vai: bề ngang lớn nhất ngay dưới cổ (gồm cả bắp tay) → khớp vai lùi vào trong
s = sl(neckZ - 0.06 * H, 0.02 * H); outer = np.percentile(np.abs(s[:, 0]), 98) if len(s) else 0.11 * H
shX = max(0.075 * H, outer - 0.032 * H)
shZ = neckZ - 0.045 * H
# tay: điểm thấp nhất của phần nằm ngoài thân ở hai bên
def handZ(sd):
    side = co[(co[:, 0] * sd > shX * 0.8) & (co[:, 2] < shZ) & (co[:, 2] > 0.3 * H)]   # trên đầu gối (tránh lấy nhầm bàn chân)
    return float(min(0.46 * H, max(0.33 * H, np.percentile(side[:, 2], 1)))) if len(side) > 50 else 0.38 * H
hz = [0.40 * H, 0.40 * H]   # tay buông sát người: đo không tin cậy (lẫn với quần, váy) → dùng tỉ lệ người chuẩn (đầu ngón ~0.40 H)
# háng: chân tách nhau (khe giữa) — váy dài thì dùng tỉ lệ
crotch = 0.47 * H
for z in np.linspace(0.52 * H, 0.38 * H, 30):
    s = sl(z)
    if len(s) > 20 and not np.any(np.abs(s[:, 0]) < 0.012 * H): crotch = float(z); break
crotch = min(max(crotch, 0.42 * H), 0.5 * H)
legX = max(0.045 * H, np.percentile(np.abs(sl(0.25 * H)[:, 0]), 50) if len(sl(0.25 * H)) else 0.05 * H)
feetY = float(np.percentile(co[co[:, 2] < 0.05 * H][:, 1], 3)) if np.any(co[:, 2] < 0.05 * H) else -0.1 * H
print('MOC neck', round(neckZ / H, 3), 'shX', round(shX / H, 3), 'hand', [round(h / H, 3) for h in hz], 'crotch', round(crotch / H, 3), 'legX', round(legX / H, 3))

# ---------- dựng bộ xương (tên Mixamo) ----------
arm = bpy.data.armatures.new('Armature'); rig = bpy.data.objects.new('Armature', arm)
bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
E = arm.edit_bones
def bone(name, h, t, parent=None, conn=False):
    b = E.new('mixamorig:' + name); b.head = Vector(h); b.tail = Vector(t)
    if parent: b.parent = E['mixamorig:' + parent]; b.use_connect = conn
    return b
hipZ = crotch + 0.06 * H
bone('Hips', (0, 0, hipZ), (0, 0, hipZ + 0.07 * H))
sp = [hipZ + 0.07 * H, hipZ + (shZ - hipZ) * 0.42, hipZ + (shZ - hipZ) * 0.72, neckZ - 0.02 * H]
bone('Spine', (0, 0, sp[0]), (0, 0, sp[1]), 'Hips', True)
bone('Spine1', (0, 0, sp[1]), (0, 0, sp[2]), 'Spine', True)
bone('Spine2', (0, 0, sp[2]), (0, 0, sp[3]), 'Spine1', True)
bone('Neck', (0, 0, sp[3]), (0, 0, neckZ + 0.035 * H), 'Spine2', True)
bone('Head', (0, 0, neckZ + 0.035 * H), (0, 0, H * 0.985), 'Neck', True)
bone('HeadTop_End', (0, 0, H * 0.985), (0, 0, H * 1.04), 'Head', True)
for sd, S in ((1, 'Left'), (-1, 'Right')):
    elZ = shZ - (shZ - hz[0 if sd > 0 else 1]) * 0.5
    wrZ = hz[0 if sd > 0 else 1] + 0.075 * H
    bone(S + 'Shoulder', (sd * 0.025 * H, 0, sp[3] - 0.01 * H), (sd * shX, 0, shZ), 'Spine2')
    bone(S + 'Arm', (sd * shX, 0, shZ), (sd * (shX + 0.012 * H), 0.01 * H, elZ), S + 'Shoulder', True)
    bone(S + 'ForeArm', (sd * (shX + 0.012 * H), 0.01 * H, elZ), (sd * (shX + 0.008 * H), -0.01 * H, wrZ), S + 'Arm', True)
    bone(S + 'Hand', (sd * (shX + 0.008 * H), -0.01 * H, wrZ), (sd * (shX + 0.006 * H), -0.015 * H, wrZ - 0.08 * H), S + 'ForeArm', True)
    bone(S + 'UpLeg', (sd * legX, 0, crotch + 0.03 * H), (sd * legX * 0.95, 0, 0.28 * H), 'Hips')
    bone(S + 'Leg', (sd * legX * 0.95, 0, 0.28 * H), (sd * legX * 0.9, 0.005 * H, 0.045 * H), S + 'UpLeg', True)
    bone(S + 'Foot', (sd * legX * 0.9, 0.005 * H, 0.045 * H), (sd * legX * 0.9, feetY * 0.55, 0.012 * H), S + 'Leg', True)
    bone(S + 'ToeBase', (sd * legX * 0.9, feetY * 0.55, 0.012 * H), (sd * legX * 0.9, feetY, 0.01 * H), S + 'Foot', True)
for b in E: b.roll = 0
bpy.ops.object.mode_set(mode='OBJECT')

# ---------- gắn lưới: tự tính trọng số ----------
# Tay buông sát thân và dính liền lưới → tính nhiệt của Blender cho xương tay "ăn" cả thân/váy.
# Tự tính: tách vùng tay theo khe hở từng lát ngang, rồi trọng số mềm theo khoảng cách tới đoạn xương.
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
SEG = {b.name.split(':')[1]: (np.array(b.head[:]), np.array(b.tail[:])) for b in E}
bpy.ops.object.mode_set(mode='OBJECT')
def segdist(P, a, b):
    ab = b - a; t = np.clip(((P - a) @ ab) / max(1e-9, ab @ ab), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * ab), axis=1)
N = len(co)
# ranh giới tay/thân theo từng lát: khe hở trong phân bố |x|
armTop, armBot = shZ + 0.03 * H, 0.38 * H
cut = np.full(N, 9.0)
zb = np.linspace(armBot, armTop, 40)
cuts = []
for z in zb:
    for sd in (1, -1):
        sx = co[(np.abs(co[:, 2] - z) < 0.01 * H) & (co[:, 0] * sd > 0), 0] * sd
        # mép ngoài cùng ở lát này là mép ngoài cánh tay → ranh giới = mép ngoài − bề dày tay
        c = 9.0
        if len(sx) > 20:
            outer = np.percentile(sx, 99.5)
            c = max(outer - 0.046 * H, outer * 0.62, 0.6 * shX)
        cuts.append((z, sd, c))
cz = np.array([[z, sd, c] for z, sd, c in cuts])
def cutAt(z, sd):
    sel = cz[cz[:, 1] == sd]; return np.interp(z, sel[:, 0], sel[:, 2])
side = np.where(co[:, 0] >= 0, 1, -1)
# đường tâm cánh tay ở từng độ cao: mép ngoài cùng − bán kính tay; tâm trước/sau = trung vị của dải ngoài cùng
rA0 = 0.028 * H
isArm = np.zeros(N, bool); CL = {}
for sd in (1, -1):
    pts = []
    for z in np.linspace(armBot, shZ, 36):
        s_ = co[(np.abs(co[:, 2] - z) < 0.01 * H) & (side == sd)]
        if len(s_) < 15: continue
        outer = np.percentile(s_[:, 0] * sd, 99.5)
        # bề dày tay (áo) đo ở dải sát mép ngoài: tay tròn → đường kính ≈ bề dày trước–sau
        dd = 0.012 * H; band_ = s_[s_[:, 0] * sd > outer - dd]
        hh = np.ptp(band_[:, 1]) / 2 if len(band_) > 3 else 0
        r = np.clip((hh * hh + dd * dd) / (2 * dd), rA0, 0.06 * H)   # bán kính từ dây cung ở độ sâu dd (không nhỏ hơn mức chuẩn)
        cand = s_[s_[:, 0] * sd > outer - 2 * r]
        pts.append((z, outer - r, np.median(cand[:, 1]), r))
    P = np.array(pts)
    fx = np.polyfit(P[:, 0], P[:, 1], 2); fy = np.polyfit(P[:, 0], P[:, 2], 2); fr = np.polyfit(P[:, 0], P[:, 3], 2)
    CL[sd] = (fx, fy)
    m = (side == sd) & (co[:, 2] > armBot) & (co[:, 2] < armTop)
    zc = np.minimum(co[m, 2], shZ)
    cxz = np.polyval(fx, zc); cyz = np.polyval(fy, zc); rz = np.clip(np.polyval(fr, zc), rA0, 0.06 * H)
    d = np.hypot(co[m, 0] * sd - cxz, co[m, 1] - cyz)
    isArm[np.nonzero(m)[0][d < 1.45 * rz]] = True
    print('TAY', sd, 'ban kinh', [round(float(np.polyval(fr, z)) / H, 3) for z in (shZ, (shZ + armBot) / 2, armBot)])
isArm &= ~((co[:, 2] > shZ - 0.06 * H) & (np.abs(co[:, 0]) < shX * 0.9))   # vùng vai trên: tránh tóc dài, cổ
# đặt lại xương tay theo đường tâm đo được (khớp xoay đúng giữa ống tay)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
for sd, S in ((1, 'Left'), (-1, 'Right')):
    fx, fy = CL[sd]
    at = lambda z: Vector((sd * float(np.polyval(fx, z)), float(np.polyval(fy, z)), float(z)))
    zEl = shZ - (shZ - 0.40 * H) * 0.5; zWr = 0.475 * H; zTip = 0.40 * H
    E['mixamorig:' + S + 'Shoulder'].tail = at(shZ)
    E['mixamorig:' + S + 'Arm'].head = at(shZ); E['mixamorig:' + S + 'Arm'].tail = at(zEl)
    E['mixamorig:' + S + 'ForeArm'].head = at(zEl); E['mixamorig:' + S + 'ForeArm'].tail = at(zWr)
    E['mixamorig:' + S + 'Hand'].head = at(zWr); E['mixamorig:' + S + 'Hand'].tail = at(zTip)
for b in E: b.roll = 0
SEG = {b.name.split(':')[1]: (np.array(b.head[:]), np.array(b.tail[:])) for b in E}
bpy.ops.object.mode_set(mode='OBJECT')
for sd, S in ((1, 'Left'), (-1, 'Right')):   # điểm xa xương tay (quai túi, dây đeo dọc người) không phải tay
    dmin = np.min([segdist(co, *SEG[S + n]) for n in ('Arm', 'ForeArm', 'Hand')], axis=0)
    isArm &= ~((side == sd) & (dmin > 0.06 * H))
# làm sạch ranh giới: lọc đa số theo đỉnh kề (bỏ đốm lẻ, mép đỡ răng cưa)
ed = np.array([e.vertices[:] for e in me.edges], np.int64)
nb = [[] for _ in range(N)]
for a_, b_ in ed: nb[a_].append(b_); nb[b_].append(a_)
for _ in range(4):
    cnt = np.array([sum(isArm[j] for j in nb[i]) + isArm[i] for i in range(N)]); tot = np.array([len(nb[i]) + 1 for i in range(N)])
    isArm = cnt * 2 > tot
print('DINH_TAY', int(isArm.sum()), N)
if os.environ.get('S_MASK'):   # gỡ lỗi: tô đỏ vùng tay rồi xuất lưới tĩnh
    ca = me.color_attributes[0]
    for li, lp in enumerate(me.loops):
        if isArm[lp.vertex_index]: ca.data[li].color = (1, 0, 0, 1) if ca.domain == 'CORNER' else ca.data[li].color
    if ca.domain == 'POINT':
        for vi in np.nonzero(isArm)[0]: ca.data[int(vi)].color = (1, 0, 0, 1)
    mat = bpy.data.materials.new('vc'); mat.use_nodes = True; nt = mat.node_tree; bsdf = nt.nodes.get('Principled BSDF')
    at = nt.nodes.new('ShaderNodeVertexColor'); at.layer_name = ca.name; nt.links.new(at.outputs['Color'], bsdf.inputs['Base Color'])
    me.materials.clear(); me.materials.append(mat)
    for o in bpy.data.objects: o.select_set(o is ob)
    bpy.ops.export_scene.gltf(filepath=os.environ['S_MASK'], export_format='GLB', use_selection=True)
    raise SystemExit
# cắt các mặt nối tay với thân (vừa có đỉnh tay vừa có đỉnh thân) → hết “màng” căng khi giơ tay
if os.environ.get('S_NOCUT') != '1':
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    longE = 0.1 * H   # mặt có cạnh dài bất thường = lỗi lưới (vệt nối hai tay…) → bỏ
    kill = [f for f in bm.faces if 0 < sum(isArm[v.index] for v in f.verts) < len(f.verts) or max(e.calc_length() for e in f.edges) > longE]
    bmesh.ops.delete(bm, geom=kill, context='FACES_ONLY')
    bm.to_mesh(me); bm.free()
    print('CAT_MAT', len(kill))
names = list(SEG.keys())
D = np.stack([segdist(co, *SEG[n]) for n in names], 1)
armB = [k for k, n in enumerate(names) if any(x in n for x in ('Arm', 'ForeArm', 'Hand'))]
legB = [k for k, n in enumerate(names) if any(x in n for x in ('UpLeg', 'Leg', 'Foot', 'ToeBase'))]
skip = [k for k, n in enumerate(names) if n in ('HeadTop_End',)]
INF = 1e3
D[:, skip] = INF
D[np.ix_(~isArm, armB)] = INF                      # thân không bám xương tay
# điểm thuộc tay CHỈ bám xương tay (bám lẫn xương thân → giơ tay góc lớn bị dẹp thành dải mỏng)
nearSh = isArm & (co[:, 2] > shZ - 0.05 * H)
keep = [k for k, n in enumerate(names) if n.endswith('Shoulder') or n == 'Spine2']
D[np.ix_(isArm & ~nearSh, [k for k in range(len(names)) if k not in armB])] = INF
D[np.ix_(nearSh, [k for k in range(len(names)) if k not in armB and k not in keep])] = INF
for sd, S in ((1, 'Left'), (-1, 'Right')):         # tay / chân chỉ bám xương cùng bên
    other = [k for k, n in enumerate(names) if n.startswith('Right' if sd > 0 else 'Left') and (k in armB or k in legB)]
    D[np.ix_(side == sd, other)] = INF
# dưới háng: chân, trên hông: không bám chân (váy chuyển mềm)
above = co[:, 2] > crotch + 0.08 * H
D[np.ix_(above, legB)] = INF
sig = 0.035 * H
W = np.exp(-(D / sig) ** 2)
# giữ 3 xương mạnh nhất
idx = np.argsort(-W, 1)[:, 3:]; np.put_along_axis(W, idx, 0, 1)
W /= np.maximum(W.sum(1, keepdims=True), 1e-12)
lone = W.sum(1) < 0.5
W[lone, np.argmin(D[lone], 1)] = 1
# váy / đầm / áo dài: vải phủ kín giữa hai chân (lát cắt dưới háng không có khe giữa)
# → bám chủ yếu vào hông, chuyển mềm sang đùi cùng bên theo độ sâu; không bị xé đôi khi hai chân bước ra
skirtZ = []
for z in np.linspace(crotch, 0.12 * H, 40):
    s_ = co[(np.abs(co[:, 2] - z) < 0.008 * H) & ~isArm]
    if len(s_) < 15: continue
    mid = s_[np.abs(s_[:, 0]) < 0.012 * H]; lg = s_[np.abs(np.abs(s_[:, 0]) - legX) < 0.015 * H]
    # váy: lát cắt là một khối liền (giữa dày gần bằng chỗ chân); hai chân khép: thắt lại ở giữa như số 8
    if len(mid) > 4 and len(lg) > 4 and np.ptp(mid[:, 1]) > 0.75 * np.ptp(lg[:, 1]) and np.ptp(s_[:, 0]) > 2.2 * legX: skirtZ.append(z)
    elif skirtZ: break   # váy liền từ háng xuống, gặp lát không phải váy thì dừng
if skirtZ and max(skirtZ) > crotch - 0.05 * H:   # phải bắt đầu ngay dưới háng
    hem = min(skirtZ)
    iHip = names.index('Hips')
    for sd, S in ((1, 'Left'), (-1, 'Right')):
        iUp, iLeg = names.index(S + 'UpLeg'), names.index(S + 'Leg')
        legR = segdist(co, *SEG[S + 'UpLeg'])
        # vải: dưới háng, trên gấu váy, nằm ngoài ống chân (xa xương đùi hơn bán kính đùi)
        cloth = (side == sd) & ~isArm & (co[:, 2] < crotch + 0.04 * H) & (co[:, 2] >= hem - 0.01 * H) & (legR > 0.055 * H)
        depth = np.clip((crotch + 0.04 * H - co[cloth, 2]) / max(1e-6, crotch + 0.04 * H - hem), 0, 1)
        Wc = np.zeros((cloth.sum(), len(names)))
        Wc[:, iHip] = 1 - 0.55 * depth; Wc[:, iUp] = 0.55 * depth * 0.8; Wc[:, iLeg] = 0.55 * depth * 0.2
        W[cloth] = Wc
    print('VAY gau', round(hem / H, 3), 'dinh vai', int(((co[:, 2] < crotch) & (co[:, 2] >= hem)).sum()))
ob.vertex_groups.clear()
for k, n in enumerate(names):
    vg = ob.vertex_groups.new(name='mixamorig:' + n)
    nz = np.nonzero(W[:, k] > 0.01)[0]
    for vi in nz: vg.add([int(vi)], float(W[vi, k]), 'REPLACE')
mod = ob.modifiers.new('Armature', 'ARMATURE'); mod.object = rig
ob.parent = rig
# làm mượt trọng số NHƯNG chỉ trong cùng vùng (tay với tay, thân với thân) → mép cắt không bị kéo sợi
for _ in range(3):
    W2 = W.copy()
    for i_ in range(N):
        js = [j_ for j_ in nb[i_] if isArm[j_] == isArm[i_]]
        if js: W2[i_] = 0.5 * W[i_] + 0.5 * W[js].mean(0)
    W = W2
# cắt thêm: mặt lưới nối hai nhóm xương khác nhau có dính tay (tay trái–tay phải, tay–chân: quai túi, dây đeo…)
def chainOf(n):
    if n.startswith('Left') and ('Arm' in n or 'Hand' in n): return 1
    if n.startswith('Right') and ('Arm' in n or 'Hand' in n): return 2
    if 'Leg' in n or 'Foot' in n or 'Toe' in n: return 3 if n.startswith('Left') else 4
    return 0
CH = np.array([chainOf(n) for n in names])
dom = CH[np.argmax(W, 1)]
bm = bmesh.new(); bm.from_mesh(me)
kill = []
for f in bm.faces:
    cs = {int(dom[v.index]) for v in f.verts}
    if ({1, 2} <= cs) or ((1 in cs or 2 in cs) and (3 in cs or 4 in cs)): kill.append(f)   # tay–tay, tay–chân
bmesh.ops.delete(bm, geom=kill, context='FACES_ONLY'); bm.to_mesh(me); bm.free()
print('CAT_THEM', len(kill))
ob.vertex_groups.clear()
for k, n in enumerate(names):
    vg = ob.vertex_groups.new(name='mixamorig:' + n)
    for vi in np.nonzero(W[:, k] > 0.01)[0]: vg.add([int(vi)], float(W[vi, k]), 'REPLACE')

# vật liệu màu theo đỉnh → xuất COLOR_0
mat = bpy.data.materials.new('vc'); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes.get('Principled BSDF')
attr = nt.nodes.new('ShaderNodeVertexColor')
if me.color_attributes: attr.layer_name = me.color_attributes[0].name
nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = 0.75
me.materials.clear(); me.materials.append(mat)
bpy.ops.object.select_all(action='SELECT')
# số đo đầu (mét, so với khớp Head; +z lên, phía trước = −y) → game đặt kính, mũ, khuyên tai cho khớp
hj = neckZ + 0.035 * H
headPts = co[co[:, 2] > hj]
top = float(co[:, 2].max())
eyeZ = top - 0.06 * H   # mắt ~10 cm dưới đỉnh đầu
s_ = co[np.abs(co[:, 2] - eyeZ) < 0.01 * H]
front = float(-np.percentile(s_[:, 1], 1)) if len(s_) else 0.1
rr = float(np.percentile(np.abs(s_[:, 0]), 97)) if len(s_) else 0.08
ear = co[np.abs(co[:, 2] - (eyeZ - 0.02 * H)) < 0.012 * H]
hb = co[np.abs(co[:, 2] - (top - 0.045 * H)) < 0.012 * H]   # vành mũ: đo cả tóc
cx_, cy_ = (np.median(hb[:, 0]), np.median(hb[:, 1])) if len(hb) else (0, 0)
hatR = float(np.percentile(np.hypot(hb[:, 0] - cx_, hb[:, 1] - cy_), 96)) if len(hb) else rr * 1.15
rig['vtn_head'] = {k_: float(v_) for k_, v_ in {'eye': eyeZ - hj, 'front': front, 'r': rr, 'crown': top - hj, 'hatR': hatR, 'hatX': cx_, 'hatZ': -cy_, 'earY': eyeZ - hj - 0.012 * H, 'earX': float(np.percentile(np.abs(ear[:, 0]), 97)) if len(ear) else rr}.items()}
print('DAU', {k: round(v, 3) for k, v in rig['vtn_head'].items()})
rig['vtn_fused'] = 1   # đánh dấu: tay dính thân → game giảm biên độ giơ tay
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_animations=False, export_morph=False, export_extras=True)
print('OK', OUT, os.path.getsize(OUT))
