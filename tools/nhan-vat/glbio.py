import json,struct,numpy as np
CT={5126:('<f4',4),5123:('<u2',2),5121:('u1',1),5125:('<u4',4)}
NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
class GLB:
    def __init__(s,path):
        b=open(path,'rb').read(); n=struct.unpack('<I',b[12:16])[0]; s.j=json.loads(b[20:20+n]); s.bin=bytearray(b[20+n+8:20+n+8+struct.unpack('<I',b[20+n:24+n])[0]])
    def acc(s,i):
        a=s.j['accessors'][i]; v=s.j['bufferViews'][a['bufferView']]; dt,sz=CT[a['componentType']]; nc=NC[a['type']]
        off=v.get('byteOffset',0)+a.get('byteOffset',0); stride=v.get('byteStride',sz*nc)
        if stride==sz*nc: return np.frombuffer(bytes(s.bin[off:off+a['count']*sz*nc]),dtype=dt).reshape(a['count'],nc).copy()
        raw=np.frombuffer(bytes(s.bin[off:off+stride*a['count']]),dtype='u1').reshape(a['count'],stride)[:,:sz*nc]
        return raw.copy().view(dt).reshape(a['count'],nc)
    def put(s,i,arr):
        a=s.j['accessors'][i]; v=s.j['bufferViews'][a['bufferView']]; dt,sz=CT[a['componentType']]; nc=NC[a['type']]
        off=v.get('byteOffset',0)+a.get('byteOffset',0); stride=v.get('byteStride',sz*nc)
        data=np.ascontiguousarray(arr.astype(dt))
        if stride==sz*nc: s.bin[off:off+data.nbytes]=data.tobytes()
        else:
            for k in range(a['count']): s.bin[off+k*stride:off+k*stride+sz*nc]=data[k].tobytes()
    def compact(s):
        # bỏ dữ liệu không còn dùng (accessor cũ, texture cũ đã thay)
        J=s.j; used=set()
        for m in J.get('meshes',[]):
            for p in m['primitives']:
                used|=set(p['attributes'].values())
                if 'indices' in p: used.add(p['indices'])
                for t in p.get('targets',[]): used|=set(t.values())
        for sk in J.get('skins',[]):
            if 'inverseBindMatrices' in sk: used.add(sk['inverseBindMatrices'])
        for an in J.get('animations',[]):
            for sm in an['samplers']: used|={sm['input'],sm['output']}
        am={k:i for i,k in enumerate(sorted(used))}
        J['accessors']=[J['accessors'][k] for k in sorted(used)]
        for m in J.get('meshes',[]):
            for p in m['primitives']:
                p['attributes']={k:am[v] for k,v in p['attributes'].items()}
                if 'indices' in p: p['indices']=am[p['indices']]
                if 'targets' in p: p['targets']=[{k:am[v] for k,v in t.items()} for t in p['targets']]
        for sk in J.get('skins',[]):
            if 'inverseBindMatrices' in sk: sk['inverseBindMatrices']=am[sk['inverseBindMatrices']]
        for an in J.get('animations',[]):
            for sm in an['samplers']: sm['input']=am[sm['input']]; sm['output']=am[sm['output']]
        used=set(a['bufferView'] for a in s.j['accessors'] if 'bufferView' in a)|set(i['bufferView'] for i in s.j.get('images',[]) if 'bufferView' in i)
        nb=bytearray(); remap={}
        for k,v in enumerate(s.j['bufferViews']):
            if k not in used: continue
            while len(nb)%4: nb.append(0)
            o=v.get('byteOffset',0); seg=s.bin[o:o+v['byteLength']]; v=dict(v); v['byteOffset']=len(nb); nb+=seg; remap[k]=len(remap); s.j['bufferViews'][k]=v
        s.j['bufferViews']=[s.j['bufferViews'][k] for k in sorted(remap)]
        for a in s.j['accessors']:
            if 'bufferView' in a: a['bufferView']=remap[a['bufferView']]
        for i in s.j.get('images',[]):
            if 'bufferView' in i: i['bufferView']=remap[i['bufferView']]
        s.bin=nb; s.j['buffers'][0]['byteLength']=len(nb)
    def save(s,path):
        js=json.dumps(s.j,separators=(',',':')).encode(); js+=b' '*((4-len(js)%4)%4); bn=bytes(s.bin); bn+=b'\0'*((4-len(bn)%4)%4)
        out=struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(bn))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(bn),0x004E4942)+bn
        open(path,'wb').write(out)
