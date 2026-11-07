import bpy, os, json, re, numpy as np
S = os.environ['S']; OUT = os.environ['OUT']; spec = json.loads(os.environ['SPEC'])
import addon_utils
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
D = S + '/data'
bpy.ops.wm.read_factory_settings(use_empty=True)
macro = TargetService.get_default_macro_info_dict(); macro.update(spec['macro'])
base = HumanService.create_human(macro_detail_dict=macro, feet_on_ground=True, scale=0.1)
HumanService.add_builtin_rig(base, 'mixamo', import_weights=True)
HumanService.set_character_skin('%s/skins/%s/%s.mhmat' % (D, spec['skin'], spec['skin']), base, skin_type='GAMEENGINE', material_instances=False)
def add(path, atype):
    before = set(bpy.data.objects)
    HumanService.add_mhclo_asset(path, base, asset_type=atype, material_type='MAKESKIN', subdiv_levels=0)
    return [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
import glob
def simple_mat(objs, img_path, alpha):
    # vật liệu đơn giản để xuất glTF đúng (ảnh màu + kênh trong suốt cắt)
    if not img_path or not os.path.exists(img_path): return
    img = bpy.data.images.load(img_path, check_existing=True)
    for o in objs:
        m = bpy.data.materials.new(o.name + '_m'); m.use_nodes = True
        nt = m.node_tree; bsdf = nt.nodes.get('Principled BSDF')
        tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = 0.6
        if alpha:
            nt.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
            for attr, val in (('blend_method', 'CLIP'), ('surface_render_method', 'DITHERED')):
                try: setattr(m, attr, val)
                except Exception: pass
        o.data.materials.clear(); o.data.materials.append(m)
eyes = add(D + '/eyes/low-poly/low-poly.mhclo', 'Eyes')
simple_mat(eyes, '%s/eyes/materials/%s_eye.png' % (D, spec.get('eye', 'brown')), False)
br = spec.get('brow', 'eyebrow001')
simple_mat(add('%s/eyebrows/%s/%s.mhclo' % (D, br, br), 'Eyebrows'), '%s/eyebrows/%s/%s.png' % (D, br, br), True)
simple_mat(add(D + '/eyelashes/eyelashes01/eyelashes01.mhclo', 'Eyelashes'), D + '/eyelashes/eyelashes01/eyelashes01.png', True)
def tint(objs, rgb, keep_alpha=False):
    for o in objs:
        for slot in o.material_slots:
            m = slot.material
            if not m or not m.use_nodes: continue
            for n in m.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image and not re.search('normal|bump|spec|rough|_ao|occlu|alpha|opac|metal|disp', (n.image.name + ' ' + n.name + ' ' + n.label).lower()):
                    im = n.image.copy(); im.name = o.name + '_tint'
                    px = np.array(im.pixels[:], dtype=np.float32).reshape(-1, 4)
                    lum = (px[:, 0] * 0.3 + px[:, 1] * 0.59 + px[:, 2] * 0.11)
                    if not keep_alpha:
                        # làm phẳng hoa văn gốc (chỉ giữ nếp vải nhẹ) để ra đúng màu trơn theo mô tả
                        mean = float(np.mean(lum[px[:, 3] > 0.5])) if np.any(px[:, 3] > 0.5) else float(np.mean(lum))
                        lum = mean + (lum - mean) * 0.3
                        lum = np.clip(lum / max(1e-3, mean) * 0.85, 0, 1.2)
                    else:
                        lum = np.clip(lum / max(1e-3, np.percentile(lum, 90)), 0, 1.3)
                    if not keep_alpha: lum = np.where(px[:, 3] < 0.5, 1.0, lum)
                    for i in range(3): px[:, i] = np.clip(lum * rgb[i], 0, 1)
                    if not keep_alpha: px[:, 3] = 1.0
                    im.pixels[:] = px.ravel(); n.image = im
                for inp in getattr(n, 'inputs', []):
                    if inp.name == 'Base Color' and not inp.is_linked: inp.default_value = (*rgb, 1)
garments = []
by_name = {}
for kind, name, *rest in spec['assets']:
    f = '%s/%s/%s/%s.mhclo' % (D, kind, name, name)
    if not os.path.exists(f): print('THIEU', f); continue
    objs = add(f, 'Hair' if kind == 'hair' else 'Clothes')
    by_name[name] = objs
    if kind == 'clothes' and not re.search('shoe|boot|flat|sandal', name): garments.extend(objs)
    if kind == 'hair':
        tex = None
        for mm in glob.glob('%s/hair/%s/*.mhmat' % (D, name)):
            for line in open(mm, encoding='utf-8', errors='ignore'):
                if line.strip().lower().startswith('diffusetexture'):
                    cand = os.path.join(os.path.dirname(mm), line.split(None, 1)[1].strip())
                    if os.path.exists(cand): tex = cand
        if not tex:
            pngs = [p for p in sorted(glob.glob('%s/hair/%s/*.png' % (D, name))) if not re.search('normal|spec|ao|bump', p, re.I)]
            tex = pngs[0] if pngs else None
        simple_mat(objs, tex, True)
    if rest and rest[0]:
        h = rest[0].lstrip('#'); tint(objs, [((int(h[i:i+2], 16) / 255) ** 2.2) for i in (0, 2, 4)], keep_alpha=(kind == 'hair'))
import bmesh
from mathutils import Vector
arm_obj = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
def bone(key):
    # vị trí đầu/cuối xương (toạ độ thế giới) theo tên gần đúng, vd 'leftforearm'
    for b in arm_obj.data.bones:
        n = b.name.lower().split(':')[-1]
        if n == key: return arm_obj.matrix_world @ b.head_local, arm_obj.matrix_world @ b.tail_local, b.name
    raise KeyError(key)
knee_cut = None
if spec.get('cut_knee'):
    knee_cut = bone('leftleg')[0].z + spec.get('cut_above', 0.03)
    for o in by_name.get(spec['cut_knee'], []):
        bm = bmesh.new(); bm.from_mesh(o.data); mw = o.matrix_world
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if (mw @ v.co).z < knee_cut], context='VERTS')
        bm.to_mesh(o.data); bm.free(); print('cat ong quan', o.name, knee_cut)
# áo ngắn hơn cạp quần → kéo dài vạt áo phủ xuống cạp quần (áo thả ngoài)
if spec.get('extend_top'):
    top_n, bot_n = spec['extend_top']
    tops = by_name.get(top_n, []); bots = by_name.get(bot_n, [])
    if tops and bots:
        waist = max((b.matrix_world @ v.co).z for b in bots for v in b.data.vertices)
        for o in tops:
            mw = o.matrix_world; mi = mw.inverted()
            hem = min((mw @ v.co).z for v in o.data.vertices)
            goal = min(waist - spec.get('extend_overlap', 0.05), hem - spec.get('extend_by', 0.0))
            print('ao/quan', o.name, 'vat ao', hem, 'cap quan', waist)
            if hem <= goal: continue
            band = 0.14
            cx = sum((mw @ v.co).x for v in o.data.vertices) / len(o.data.vertices)
            cy = sum((mw @ v.co).y for v in o.data.vertices) / len(o.data.vertices)
            for v in o.data.vertices:
                p = mw @ v.co
                if p.z > hem + band: continue
                t = (hem + band - p.z) / band
                p.z -= t * (hem - goal)
                if abs(p.x - cx) < 0.25:   # chỉ phần thân áo, không phải tay áo
                    k = 1 + spec.get('extend_flare', 0.05) * t; p.x = cx + (p.x - cx) * k; p.y = cy + (p.y - cy) * k
                v.co = mi @ p
            print('keo dai ao', o.name, hem, '->', goal)
# đồ mặc chồng (liệt kê từ trong ra ngoài): xoá phần đồ bên trong bị đồ bên ngoài che, tránh lốm đốm
from mathutils.bvhtree import BVHTree
from mathutils import Vector
dg = bpy.context.evaluated_depsgraph_get()
def world_tree(o):
    mw = o.matrix_world
    return BVHTree.FromPolygons([mw @ v.co for v in o.data.vertices], [list(p.vertices) for p in o.data.polygons])
def cull(inner, outers, out_d=0.06, in_d=0.04, erode=False):
    trees = [world_tree(o) for o in outers]
    mw = inner.matrix_world; nm = mw.to_3x3().inverted().transposed()
    bm = bmesh.new(); bm.from_mesh(inner.data); bm.normal_update()
    kill = []
    for v in bm.verts:
        p = mw @ v.co; n = (nm @ v.normal).normalized()
        for t in trees:
            # đồ ngoài nằm ngay bên ngoài (bị che) hoặc ngay bên trong (đồ trong lòi ra) → bỏ đỉnh này
            if t.ray_cast(p - n * 0.002, n, out_d)[0] is not None or t.ray_cast(p + n * 0.002, -n, in_d)[0] is not None:
                kill.append(v); break
    if erode:   # chỉ xoá khi mọi đỉnh kề cũng bị che → chừa một vòng mép, không hở
        ks = set(kill); kill = [v for v in kill if all(e.other_vert(v) in ks for e in v.link_edges)]
    bmesh.ops.delete(bm, geom=kill, context='VERTS'); bm.to_mesh(inner.data); bm.free()
    print('cat', inner.name, len(kill))
for i, inner in enumerate(garments):
    if garments[i + 1:]: cull(inner, garments[i + 1:], erode=bool(spec.get('cull_body')))
if spec.get('cull_body') and garments:
    cull(base, garments, 0.04, 0.03, erode=True)   # da người lòi qua quần áo (eo, hông) → bỏ
# xoá hẳn lưới phụ (khung đo, phần bị quần áo che) thay vì để modifier che
for o in [x for x in bpy.data.objects if x.type == 'MESH']:
    masks = [m for m in o.modifiers if m.type == 'MASK']
    if not masks: continue
    vg = {g.name: g.index for g in o.vertex_groups}
    bm = bmesh.new(); bm.from_mesh(o.data)
    dl = bm.verts.layers.deform.verify()
    kill = []
    mwo = o.matrix_world
    for v in bm.verts:
        w = v[dl]
        for m in masks:
            if knee_cut is not None and spec['cut_knee'].lower() in m.vertex_group.lower() and (mwo @ v.co).z < knee_cut + 0.04: continue
            gi = vg.get(m.vertex_group)
            if gi is None: continue
            inside = gi in w and w[gi] > 0.0
            if (not m.invert_vertex_group and not inside) or (m.invert_vertex_group and inside): kill.append(v); break
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(o.data); bm.free()
    print('xoa', o.name, len(kill), [m.vertex_group for m in masks])
    for m in masks: o.modifiers.remove(m)
if spec.get('extras'):
    import runpy
    runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.environ['GENDIR'], 'extras.py'), init_globals=dict(spec=spec, base=base, eyes_objs=eyes, by_name=by_name, bone=bone, arm_obj=arm_obj, D=D))
# giảm ảnh
for im in bpy.data.images:
    lim = int(spec.get('tex', 512))
    if im.size[0] > lim: im.scale(lim, int(lim * im.size[1] / im.size[0]))
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
    if o.type in ('MESH', 'ARMATURE'): o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True, export_animations=False, export_morph=False, export_image_format='AUTO')
print('OK', OUT, os.path.getsize(OUT))
