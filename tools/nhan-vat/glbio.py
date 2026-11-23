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
    def save(s,path):
        js=json.dumps(s.j,separators=(',',':')).encode(); js+=b' '*((4-len(js)%4)%4); bn=bytes(s.bin); bn+=b'\0'*((4-len(bn)%4)%4)
        out=struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(bn))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(bn),0x004E4942)+bn
        open(path,'wb').write(out)
