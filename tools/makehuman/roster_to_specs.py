"""Đọc roster.csv → cấu hình dựng nhân vật MakeHuman (JSON) cho gen_character.py.

Chỉ dùng tài nguyên CC0 của MakeHuman (makehuman_system_assets, shirts01, pants01, dress01, hair01, shoes01).
Đồ mặc liệt kê từ trong ra ngoài; gen_character.py tự cắt phần lớp trong bị lớp ngoài che.
"""
import csv, json, random, sys, unicodedata, re

def norm(s):
    s = unicodedata.normalize('NFD', str(s or '').lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').replace('đ', 'd')
    return re.sub(r'\s+', ' ', s).strip()

COLORS = [('xanh navy', '#1f2a4a'), ('xanh dam', '#1e3a8a'), ('xanh reu', '#4b5a2a'), ('xanh la', '#2e8b3a'), ('xanh duong', '#2f6fd6'),
          ('hong pastel', '#f4a6c4'), ('tim', '#6d3fc4'), ('hong', '#e86f9e'), ('do', '#b3122d'), ('cam', '#e8792f'), ('vang', '#e8b923'),
          ('trang', '#f1eee6'), ('den', '#18181c'), ('xam', '#7d8089'), ('nau sam', '#3e2616'), ('nau', '#6b4426'), ('nude', '#e2bfa3'),
          ('be', '#d6c09a'), ('xanh', '#2f6fd6')]
def color_of(t):
    w = ' ' + t + ' '
    for k, c in COLORS:
        if ' ' + k + ' ' in w: return c
    return None

DENIM, DENIM_DARK = '#3b5ba5', '#22325e'

def spec_for(ch, rnd):
    female = 'nu' in norm(ch['Gender'])
    age = int(ch['Age'] or 25)
    items = [norm(x) for x in ch['Outfit'].split(',') if x.strip()]
    text = ' '.join(items)
    inner, pants, outer, shoes, need_pants = [], [], [], None, []

    def C(name, color=None): return ['clothes', name, color]

    for it in items:
        c = color_of(it)
        # ---------- đồ liền / áo dài / áo bà ba ----------
        if 'ao dai' in it:
            col = c or '#2f6fd6'
            need_pants.append(C('toigo_wool_pants', '#f1eee6'))
            if female:
                inner.append(C('toigo_fisherman_sweater', col)); outer.append(C('toigo_shift_dress', col))
            else:
                outer.append(C('wdg_mycenaean_tunic', col))
            continue
        if 'ba ba' in it:
            need_pants.append(C('toigo_harem_pants', '#18181c' if age > 50 else '#f1eee6'))
            outer.append(C('toigo_fisherman_sweater', c or '#efe6d2')); continue
        if 'khan dong' in it or 'that lung' in it or 'tat cao' in it: continue
        if it.startswith('dam') or it.startswith('vay yem'):
            col = c or ('#3b5ba5' if 'yem' in it else rnd.choice(['#b3122d', '#18181c', '#1e3a8a', '#e86f9e']))
            if 'da hoi' in it: name = rnd.choice(['toigo_halter_dress_with_fluted_skirt', 'toigo_camisole_dress_with_full_skirt'])
            elif 'ren' in it.split(): name = 'toigo_bodice_dress_with_lace_ruffle_skirt'
            elif 'hoa' in it.split(): name = 'toigo_dress_with_tiered_skirt' if 'dai' not in it else 'toigo_halter_dress_with_fluted_skirt'
            elif 'yem' in it: name = 'toigo_halter_dress_knee_length'
            elif 'dai' in it or 'co dien' in it or 'nhung' in it: name = 'toigo_halter_dress_with_fluted_skirt'
            elif 'midi' in it or 'satin' in it or 'lua' in it.split(): name = 'toigo_halter_dress_midi'
            elif 'ngan' in it: name = 'toigo_cut_out_dress'
            else: name = rnd.choice(['toigo_keyhole_neck_dress', 'toigo_shift_dress', 'toigo_halter_dress_midi'])
            # hoạ tiết hoa / ren giữ nguyên vải gốc
            keep = name in ('toigo_dress_with_tiered_skirt', 'toigo_bodice_dress_with_lace_ruffle_skirt') and not c
            inner.append(C(name, None if keep else col)); continue
        if it.startswith('vay') or it.startswith('chan vay'):
            col = c or (DENIM if 'jean' in it or 'denim' in it else '#f1eee6' if 'tennis' in it else '#18181c')
            if 'xep ly' in it or 'tennis' in it: name = 'toigo_camisole_dress_with_full_skirt'
            elif 'but chi' in it: name = 'toigo_shift_dress'
            elif 'dai' in it: name = 'toigo_halter_dress_with_fluted_skirt'
            else: name = 'toigo_halter_dress_knee_length'
            inner.append(C(name, col)); continue
        # ---------- quần ----------
        if it.startswith('quan') or it.startswith('legging'):
            if 'jean' in it:
                pants.append(C('toigo_wool_pants', c or (DENIM_DARK if 'den' in it else DENIM)) if not ('rach' in it) else C('toigo_wool_pants', DENIM))
            elif 'short' in it:
                pants.append(C('cortu_jeans_shorts', None if ('denim' in it or not c) and 'kaki' not in it and 'the thao' not in it else (c or '#cdb58f')))
            elif 'cargo' in it: pants.append(C('cortu_cargo_pants', c or '#4b5a2a'))
            elif 'jogger' in it: pants.append(C('toigo_harem_pants', c or '#3a3d44'))
            elif 'legging' in it: pants.append(C('female_sportsuit01', c or '#18181c'))
            elif 'ong rong' in it or 'culottes' in it: pants.append(C('toigo_harem_pants', c or '#2a2c33'))
            elif 'lua' in it: pants.append(C('toigo_harem_pants', c or '#f1eee6'))
            elif 'kaki' in it or 'chinos' in it: pants.append(C('toigo_wool_pants', c or '#c9b48d'))
            else: pants.append(C('toigo_wool_pants', c or '#2a2c33'))
            continue
        # ---------- giày ----------
        if it.startswith('giay'):
            if 'sneaker' in it or 'the thao' in it or 'nhay' in it:
                shoes = 'shoes06' if ('neon' in it or 'do' in it.split()) else 'shoes05'
            elif 'cao got' in it or 'mui nhon' in it: shoes = 'toigo_stiletto_booties'
            elif 'bup be' in it: shoes = 'toigo_ballet_flats'
            elif 'sandal' in it: shoes = 'toigo_flats'
            elif 'boot' in it: shoes = 'toigo_ankle_boots_female' if female else 'toigo_ankle_boots_male'
            elif 'loafer' in it: shoes = 'shoes01'
            else: shoes = 'shoes03' if not female else 'toigo_ballet_flats'
            continue
        # ---------- áo ngoài ----------
        if re.search(r'\b(suit|comple|vest|blazer)\b', it):
            col = c or rnd.choice(['#2a2c33', '#1f2a4a', '#3a3d44', '#18181c'])
            outer.append(C('female_elegantsuit01' if female else 'male_elegantsuit01', col)); continue
        if 'gile' in it: continue
        if re.search(r'khoac|bomber|jacket', it):
            col = c or ('#3b5ba5' if 'denim' in it or 'jean' in it else '#18181c' if ' da' in ' ' + it else '#3a3d44')
            outer.append(C('male_casualsuit05' if not female else 'toigo_fisherman_sweater', col)); continue
        # ---------- áo trong ----------
        top = None
        if 'hoodie' in it or 'ao len' in it or 'co lo' in it: top = C('toigo_fisherman_sweater', c or rnd.choice(['#18181c', '#7d8089', '#efe6d2']))
        elif 'crop' in it: top = C('toigo_bodice-style_top', c or '#f1eee6')
        elif 'tank' in it or 'ba lo' in it: top = C('toigo_keyhole_tank_top', c or '#f1eee6')
        elif 'hai day' in it: top = C('toigo_camisole_top', c or '#f1eee6')
        elif 'polo' in it: top = C('namuhekam_male_polo_shirt', c or rnd.choice(['#1f2a4a', '#f1eee6', '#2e8b3a']))
        elif 'caro' in it: top = C('male_casualsuit03', None)
        elif 'so mi' in it or 'blouse' in it:
            if female: top = C('toigo_fisherman_sweater', c or '#f1eee6')
            else: top = C('male_casualsuit01', None if 'denim' in it else (c or ('#f1eee6' if 'trang' in it or rnd.random() < 0.6 else '#8fb3e0')))
        elif 'ao thun' in it or 'graphic' in it or 'ao phong' in it:
            top = C('joepal_crude_t-shirt_female' if female else 'elvs_crude_t-shirt_male', c or '#f1eee6')
        if top:
            # áo sơ mi nam đã kèm quần jean: đặt ở lớp trong để quần mô tả đè lên
            (inner if top[1].startswith('male_casualsuit') else outer).append(top)

    if not pants and need_pants: pants.append(need_pants[0])
    if not pants and female and not any(x[1].startswith(('toigo_halter', 'toigo_shift', 'toigo_cut', 'toigo_keyhole_neck', 'toigo_dress', 'toigo_bodice_dress', 'toigo_camisole_dress', 'female_elegantsuit', 'aethel')) for x in inner + outer):
        pants.append(C('toigo_wool_pants', DENIM))
    if not pants and not female and not any(x[1] == 'wdg_mycenaean_tunic' for x in outer):
        pants.append(C('toigo_wool_pants', '#2a2c33'))
    if not inner and not outer: outer.append(C('joepal_crude_t-shirt_female' if female else 'elvs_crude_t-shirt_male', '#f1eee6'))
    # áo khoác / vest mặc ngoài áo trong: thứ tự trong → ngoài
    tops_first = [x for x in outer if x[1] not in ('male_elegantsuit01', 'female_elegantsuit01', 'male_casualsuit05', 'wdg_mycenaean_tunic', 'toigo_shift_dress')]
    jackets = [x for x in outer if x not in tops_first]
    clothes = inner + pants + tops_first + jackets
    if not shoes: shoes = 'shoes05' if age < 30 else ('toigo_ballet_flats' if female else 'shoes03')
    clothes.append(['clothes', shoes, None])

    # ---------- người ----------
    if age < 25: mh_age = 0.1875 + (age - 11) / 14 * 0.3125
    else: mh_age = 0.5 + (age - 25) / 65 * 0.5
    grp = 'young' if age < 30 else 'middleage' if age < 50 else 'old'
    skin = f'{grp}_asian_{"female" if female else "male"}'
    if female:
        pool = (['toigo_blunt_bob', 'toigo_curled_under_bob', 'long01', 'ponytail01', 'o4saken_long01', 'littleright_bobcut_hair', 'toigo_blunt_bob_with_bangs', 'braid01', 'toigo_inverted_bob']
                if age < 30 else ['rehmanpolanski_hair_bun_brown', 'bob01', 'toigo_inverted_bob', 'ponytail01', 'long01', 'toigo_curled_under_bob'] if age < 45 else ['rehmanpolanski_hair_bun_brown', 'bob01', 'short03', 'toigo_inverted_bob'])
    else:
        pool = ['short02', 'short04', 'cortu_short_messy_hair', 'short01', 'culturalibre_hair_02'] if age < 30 else ['short02', 'short04', 'short01', 'short03']
    hair = rnd.choice(pool)
    hair_col = '#120d0a' if age < 45 else ('#2a2420' if age < 55 else '#8f8a85')
    if age < 30 and rnd.random() < 0.25: hair_col = rnd.choice(['#4a2c18', '#6b4426', '#2a1a12'])
    pers = norm(ch.get('Personality', ''))
    weight = rnd.uniform(0.38, 0.55) + (0.1 if age > 45 else 0)
    muscle = rnd.uniform(0.4, 0.55) + (0.12 if (not female and ('tu tin' in pers or 'ca tinh' in pers)) else 0)
    height = (rnd.uniform(0.38, 0.55) if female else rnd.uniform(0.48, 0.65))
    return {
        'id': ch['ID'], 'name': ch['Name'],
        'macro': {'gender': 0.0 if female else 1.0, 'age': round(mh_age, 3), 'weight': round(weight, 3), 'muscle': round(muscle, 3), 'height': round(height, 3),
                  'proportions': 0.6, 'cupsize': 0.5, 'firmness': 0.5, 'race': {'asian': 0.92, 'caucasian': 0.08, 'african': 0.0}},
        'skin': skin, 'eye': rnd.choice(['brown', 'brown', 'brownlight']), 'brow': rnd.choice(['eyebrow001', 'eyebrow003', 'eyebrow006'] if female else ['eyebrow008', 'eyebrow009', 'eyebrow010']),
        'assets': [['hair', hair, hair_col]] + clothes,
    }

if __name__ == '__main__':
    rows = list(csv.DictReader(open(sys.argv[1], encoding='utf-8-sig')))
    out = [spec_for(r, random.Random(r['ID'])) for r in rows]
    json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for s in out: print(s['id'], [a[1] for a in s['assets']])
