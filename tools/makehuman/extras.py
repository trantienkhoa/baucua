# Chi tiết thêm cho nhân vật đặc biệt (DJ): râu, hình xăm, đồng hồ, chữ in trên áo.
# Được gen_character.py gọi khi spec có "extras". Biến có sẵn: spec, base, by_name, bone, arm_obj, D
import bpy, bmesh, math, os
import numpy as np
from mathutils import Vector, Matrix

ex = spec['extras']
dg = bpy.context.evaluated_depsgraph_get()


def base_image(obj):
    """Ảnh màu chính (ảnh nối vào Base Color, đã nhuộm nếu có); thay bằng bản sao để vẽ."""
    for slot in obj.material_slots:
        m = slot.material
        if not m or not m.use_nodes: continue
        nt = m.node_tree
        bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        src = None
        if bsdf:
            stack = [bsdf.inputs['Base Color']]
            while stack and src is None:
                sock = stack.pop()
                for lk in sock.links:
                    n = lk.from_node
                    if n.type == 'TEX_IMAGE' and n.image: src = n.image; break
                    stack.extend(n.inputs)
        print('anh mau', obj.name, src.name if src else None, [(n.name, n.image.name) for n in nt.nodes if n.type == 'TEX_IMAGE' and n.image])
        if src is None: continue
        if src.name.endswith(('_paint', '_tint')): return None, src   # đã là bản sao trong bộ nhớ: vẽ thẳng vào
        # image.copy() của ảnh đã sửa sẽ đọc lại file gốc → tạo ảnh mới và chép điểm ảnh
        W, H = src.size
        im = bpy.data.images.new(obj.name + '_paint', W, H, alpha=True); im.pixels[:] = src.pixels[:]
        for n in nt.nodes:
            if n.type == 'TEX_IMAGE' and n.image == src: n.image = im
        return None, im
    return None, None


def paint(obj, lo, hi, fn, res=None):
    """Vẽ lên texture của obj: với mỗi điểm ảnh thuộc tam giác nằm trong hộp [lo,hi] (toạ độ thế giới),
    fn(P, N, ...) trả về (rgb Nx3, alpha N). P, N: vị trí và pháp tuyến 3D nội suy."""
    node, im = base_image(obj)
    if im is None: print('khong co anh', obj.name); return
    if res and im.size[0] < res: im.scale(res, res)
    W, H = im.size
    px = np.array(im.pixels[:], dtype=np.float32).reshape(H, W, 4)
    ev = obj.evaluated_get(dg); me = ev.to_mesh()
    me.calc_loop_triangles()
    mw = obj.matrix_world; nm3 = mw.to_3x3().inverted().transposed()
    co = np.array([tuple(mw @ v.co) for v in me.vertices], dtype=np.float32)
    no = np.array([tuple((nm3 @ v.normal).normalized()) for v in me.vertices], dtype=np.float32)
    uvl = me.uv_layers.active.data
    lo = np.array(lo, np.float32); hi = np.array(hi, np.float32)
    cnt = 0
    AC = np.zeros((H, W), np.float32); CC = np.zeros((H, W, 3), np.float32)   # gộp theo max để không bị vệt ở cạnh tam giác
    for tri in me.loop_triangles:
        vi = list(tri.vertices)
        P3 = co[vi]
        if np.any(P3.max(0) < lo) or np.any(P3.min(0) > hi): continue
        uv = np.array([tuple(uvl[l].uv) for l in tri.loops], np.float32) * [W, H]
        x0, y0 = np.floor(uv.min(0) - 1).astype(int); x1, y1 = np.ceil(uv.max(0) + 1).astype(int)
        x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, W - 1), min(y1, H - 1)
        if x1 < x0 or y1 < y0: continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        a, b, c = uv
        den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(den) < 1e-9: continue
        l1 = ((b[1] - c[1]) * (gx - c[0]) + (c[0] - b[0]) * (gy - c[1])) / den
        l2 = ((c[1] - a[1]) * (gx - c[0]) + (a[0] - c[0]) * (gy - c[1])) / den
        l3 = 1 - l1 - l2
        tol = -1.2 / max(1.0, math.sqrt(abs(den)))   # nới 1 điểm ảnh để không hở đường may UV
        ins = (l1 >= tol) & (l2 >= tol) & (l3 >= tol)
        if not ins.any(): continue
        L = np.stack([l1[ins], l2[ins], l3[ins]], 1)
        P = L @ P3; N = L @ no[vi]; N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-9
        rgb, al = fn(P, N, gx[ins], gy[ins])
        if rgb is None: continue
        yy = (gy[ins] - 0.5).astype(int); xx = (gx[ins] - 0.5).astype(int)
        al = np.clip(al, 0, 1)
        better = al > AC[yy, xx]
        AC[yy[better], xx[better]] = al[better]; CC[yy[better], xx[better]] = np.asarray(rgb)[better]
        cnt += int((al > 0.01).sum())
    A = AC[..., None]
    px[..., :3] = px[..., :3] * (1 - A) + CC * A
    im.pixels[:] = px.ravel(); im.update()
    ev.to_mesh_clear()
    print('ve', obj.name, cnt)


def hash_noise(x, y, s=1.0):
    return (np.sin(x * 12.9898 * s + y * 78.233 * s) * 43758.5453) % 1.0


def value_noise(u, v, seed=0):
    """nhiễu mượt 2D (giá trị 0..1)."""
    iu, iv = np.floor(u), np.floor(v); fu, fv = u - iu, v - iv
    fu = fu * fu * (3 - 2 * fu); fv = fv * fv * (3 - 2 * fv)
    def h(a, b): return (np.sin(a * 127.1 + b * 311.7 + seed * 74.7) * 43758.5453) % 1.0
    return (h(iu, iv) * (1 - fu) + h(iu + 1, iv) * fu) * (1 - fv) + (h(iu, iv + 1) * (1 - fu) + h(iu + 1, iv + 1) * fu) * fv


def fbm(u, v, seed=0, oct=4):
    s, a, tot = 0.0, 0.5, 0.0
    for i in range(oct):
        s = s + value_noise(u * (2 ** i), v * (2 ** i), seed + i) * a; tot += a; a *= 0.5
    return s / tot


body = base
# mắt → mốc vị trí mặt
eyes = eyes_objs
EV = np.array([tuple(eyes[0].matrix_world @ v.co) for v in eyes[0].data.vertices]) if eyes else None
eye_z = float(EV[:, 2].mean()); eye_y = float(EV[:, 1].min()); eye_dx = float(np.abs(EV[:, 0]).mean())
head_h, head_t, _ = bone('head')
print('mat', eye_z, eye_y, eye_dx, 'dau', tuple(head_h))
U = eye_dx / 0.032   # tỉ lệ khuôn mặt so với chuẩn (khoảng cách mắt ~3.2 cm)

# ---------- râu ----------
if ex.get('beard'):
    bc = np.array(ex.get('beard_color', [0.018, 0.015, 0.013]), np.float32)
    def beard(P, N, gx, gy):
        x = np.abs(P[:, 0]) / U; dz = (P[:, 2] - eye_z) / U; y = (P[:, 1] - eye_y) / U
        front = y < 0.075                                     # trước tai
        # đường biên trên của râu: từ tóc mai (|x|≈7cm, ngang mắt) xuống khoé miệng
        top = np.interp(x, [0.0, 0.026, 0.036, 0.050, 0.065, 0.078], [-0.046, -0.050, -0.082, -0.088, -0.062, -0.020])
        d = np.clip((top - dz) / 0.012, 0, 1)                 # dưới đường biên
        lips = (x < 0.027 - np.clip((-0.064 - dz) * 0.3, 0, 0.01)) & (dz < -0.063) & (dz > -0.088)    # chừa môi
        neck = np.clip((dz + 0.150) / 0.02, 0, 1)             # tắt dần ở cổ
        cheek = np.interp(x, [0.0, 0.03, 0.045, 0.062, 0.08], [1.0, 1.0, 0.7, 0.6, 0.55])                # má: râu lún phún nhạt hơn
        a = d * neck * cheek * front * np.where(lips, 0.0, 1.0)
        n = hash_noise(gx, gy); n2 = fbm(gx / 6.0, gy / 6.0, 3, 2)
        a = a * (0.55 + 0.45 * n) * (0.75 + 0.25 * n2) * ex.get('beard_strength', 0.92)
        return np.broadcast_to(bc, (len(a), 3)), a
    c = Vector((0, eye_y, eye_z)); r = 0.11 * U
    paint(body, (-r, eye_y - 0.05, eye_z - 0.17 * U), (r, eye_y + 0.13 * U, eye_z + 0.02), beard)

# ---------- hình xăm cẳng tay ----------
if ex.get('tattoo'):
    side = ex['tattoo']                     # 'left' hoặc 'right'
    e, w, _ = bone(side + 'forearm')
    ax = (w - e); L = ax.length; axn = ax.normalized()
    E = np.array(tuple(e)); A = np.array(tuple(axn))
    ref = Vector((0, 0, 1)) if abs(axn.z) < 0.9 else Vector((1, 0, 0))
    b1 = (ref - axn * ref.dot(axn)).normalized(); b2 = axn.cross(b1)
    B1 = np.array(tuple(b1)); B2 = np.array(tuple(b2))
    ink = np.array(ex.get('tattoo_color', [0.02, 0.025, 0.035]), np.float32)
    def tattoo(P, N, gx, gy):
        q = P - E; s = q @ A / L; rv = q - np.outer(q @ A, A); r = np.linalg.norm(rv, axis=1)
        ang = np.arctan2(rv @ B2, rv @ B1)
        on = (s > 0.06) & (s < 0.90) & (r < 0.07 * U)
        u = s * L / U * 38.0; v = (ang / (2 * np.pi)) * 9.0
        f = fbm(u * 0.8, v * 1.5, 11, 5)
        g2 = fbm(u * 3.0 + 3, v * 5.0, 5, 3)
        fill = np.clip((f - 0.47) / 0.008, 0, 1) * (0.72 + 0.28 * g2)          # mảng mực đậm, có sắc độ
        edge = np.clip(1 - np.abs(f - 0.455) / 0.007, 0, 1)                  # viền nét
        swirl = np.clip(1 - np.abs(np.sin(f * 55.0)) / 0.14, 0, 1) * np.clip((f - 0.40) / 0.05, 0, 1) * 0.7
        lines = np.maximum(edge, swirl); shade = fill
        fade = np.clip((s - 0.06) / 0.06, 0, 1) * np.clip((0.90 - s) / 0.05, 0, 1)
        a = np.maximum(lines, shade) * fade * on * (0.85 + 0.15 * hash_noise(gx, gy))
        return np.broadcast_to(ink, (len(a), 3)), a
    pad = 0.08 * U
    lo = [min(e.x, w.x) - pad, min(e.y, w.y) - pad, min(e.z, w.z) - pad]; hi = [max(e.x, w.x) + pad, max(e.y, w.y) + pad, max(e.z, w.z) + pad]
    paint(body, lo, hi, tattoo)

# ---------- chữ in trên ngực áo ----------
if ex.get('print') and ex.get('print_on'):
    import bpy as _b
    dec = _b.data.images.load(ex['print'], check_existing=True)
    dw, dh = dec.size; dpx = np.array(dec.pixels[:], np.float32).reshape(dh, dw, 4)
    cx, cz, wd = ex.get('print_pos', [0.085, -0.20, 0.13])   # lệch ngang, dưới mắt (m, theo tỉ lệ), rộng
    cx *= U; cz = eye_z + cz * U; wd *= U; hd = wd * dh / dw
    def chest(P, N, gx, gy):
        u = (P[:, 0] - cx) / wd + 0.5; v = (P[:, 2] - cz) / hd + 0.5
        ok = (u >= 0) & (u < 1) & (v >= 0) & (v < 1) & (N[:, 1] < -0.3)
        iu = np.clip((u * dw).astype(int), 0, dw - 1); iv = np.clip((v * dh).astype(int), 0, dh - 1)
        s = dpx[iv, iu]
        return s[:, :3], s[:, 3] * ok
    for o in by_name.get(ex['print_on'], []):
        paint(o, (cx - wd, -1, cz - hd), (cx + wd, 0.2, cz + hd), chest, res=1024)

# ---------- đồng hồ ----------
if ex.get('watch'):
    side = ex['watch']
    e, w, fname = bone(side + 'forearm')
    axn = (w - e).normalized(); L = (w - e).length
    # bán kính cổ tay đo từ lưới người
    co = np.array([tuple(body.matrix_world @ v.co) for v in body.data.vertices])
    q = co - np.array(tuple(w)); s = q @ np.array(tuple(axn))
    rv = q - np.outer(s, np.array(tuple(axn))); r = np.linalg.norm(rv, axis=1)
    sel = (s > -0.10 * L) & (s < -0.04 * L) & (r < 0.045)
    rad = float(np.percentile(r[sel], 70)) if sel.any() else 0.028
    print('co tay', int(sel.sum()), rad)
    pos = w - axn * (0.06 * L)
    up = Vector((0, 0, 1)); up = (up - axn * up.dot(axn)).normalized()   # mu bàn tay hướng lên (tư thế chữ A)
    rot = axn.to_track_quat('Z', 'Y').to_matrix().to_4x4()

    def metal(name, col, metallic, rough):
        m = bpy.data.materials.new(name); m.use_nodes = True
        p = m.node_tree.nodes.get('Principled BSDF')
        p.inputs['Base Color'].default_value = (*col, 1); p.inputs['Metallic'].default_value = metallic; p.inputs['Roughness'].default_value = rough
        return m
    silver = metal('watch_steel', (0.85, 0.86, 0.88), 0.75, 0.3)
    face = metal('watch_face', (0.06, 0.07, 0.09), 0.3, 0.3)
    objs = []
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=28, radius1=rad + 0.002, radius2=rad + 0.002, depth=0.022)
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.003)
    me = bpy.data.meshes.new('watch_band'); bm.to_mesh(me); bm.free()
    band = bpy.data.objects.new('watch_band', me); band.data.materials.append(silver)
    band.matrix_world = Matrix.Translation(pos) @ rot; objs.append(band)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=28, radius1=0.019, radius2=0.019, depth=0.009)
    me = bpy.data.meshes.new('watch_case'); bm.to_mesh(me); bm.free()
    case = bpy.data.objects.new('watch_case', me); case.data.materials.append(silver); case.data.materials.append(face)
    # mặt kính: mặt trên của hình trụ dùng vật liệu tối
    for p in case.data.polygons:
        if p.normal.z > 0.9 and len(p.vertices) > 4: p.material_index = 1
    rot2 = up.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    case.matrix_world = Matrix.Translation(pos + up * (rad + 0.007)) @ rot2; objs.append(case)
    for o in objs:
        bpy.context.scene.collection.objects.link(o)
        mwld = o.matrix_world.copy()
        o.parent = arm_obj; o.matrix_world = mwld
        vg = o.vertex_groups.new(name=fname); vg.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
        mod = o.modifiers.new('Armature', 'ARMATURE'); mod.object = arm_obj
    print('dong ho', rad, tuple(pos))

# vật liệu đơn giản (ảnh màu nối thẳng Base Color) để glTF xuất đúng ảnh đã nhuộm/vẽ
for nm in ex.get('simplify', []):
    for o in by_name.get(nm, []):
        _, im = base_image(o)
        if im is None: continue
        m = bpy.data.materials.new(o.name + '_s'); m.use_nodes = True
        nt = m.node_tree; p = nt.nodes.get('Principled BSDF')
        tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = im
        nt.links.new(tx.outputs['Color'], p.inputs['Base Color']); p.inputs['Roughness'].default_value = 0.8
        o.data.materials.clear(); o.data.materials.append(m)
        print('vat lieu don gian', o.name, im.name)
