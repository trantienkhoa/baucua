# Cắt hồn ma / bàn tay / ma trơi từ tranh vẽ tay nền trắng ra PNG nền trong suốt.
# Đổi SRC thành đường dẫn tranh, chạy: python3 cat-hinh-ma.py
from PIL import Image, ImageDraw
import numpy as np, sys
SRC=sys.argv[1] if len(sys.argv) > 1 else 'tranh-ma.png'
OUT='public/models/ma/E2D/'
full=Image.open(SRC).convert('RGB')
def cut(box, name, interior=True, pad=14, gain=1.25, fade=0):
    x0,y0,x1,y1=box
    c=np.asarray(full.crop((x0-pad,y0-pad,x1+pad,y1+pad))).astype(float)
    mn=c.min(2)
    # nền: vùng gần trắng nối với mép ảnh
    m=Image.fromarray(((mn>=226)*255).astype('uint8')).convert('L').copy()
    for p in [(0,0),(m.width-1,0),(0,m.height-1),(m.width-1,m.height-1)]:
        if m.getpixel(p)==255: ImageDraw.floodfill(m,p,128)
    bg=np.asarray(m)==128
    a=np.clip((255-mn)/255*gain,0,1)          # tách màu khỏi nền trắng (khói mờ giữ độ trong)
    if interior: a=np.where(bg,a,1.0)          # phần thân (không nối ra nền) giữ đặc
    if fade:                                    # mờ dần về 0 ở mép khung, không lộ hộp vuông
        h,w=a.shape; yy,xx=np.mgrid[0:h,0:w]; d=np.minimum(np.minimum(yy,h-1-yy),np.minimum(xx,w-1-xx))
        a=a*np.clip(d/fade,0,1)**1.5
    a3=np.maximum(a,1e-3)[...,None]
    rgb=np.clip((c-255*(1-a3))/a3,0,255)
    rgb=np.where(a[...,None]>0.999,c,rgb)
    out=np.dstack([rgb,a*255]).astype('uint8')
    im=Image.fromarray(out,'RGBA'); bb=im.getchannel('A').point(lambda v:255 if v>6 else 0).getbbox(); im=im.crop(bb)
    im.save(OUT+name+'.png'); print(name, im.size)
cut((49,107,273,708),'ma-ao-dai')
cut((321,145,539,668),'ma-ao-ba-ba')
cut((587,121,832,673),'bong-den', interior=False)
cut((859,229,1138,568),'ban-tay', interior=False, gain=2.4)
# 4 đốm ma trơi: tách theo vùng màu
c=np.asarray(full.crop((1156,226,1339,544))).astype(int); ink=c.min(2)<235
from collections import deque
lab=np.zeros(ink.shape,int); n=0
for y in range(ink.shape[0]):
    for x in range(ink.shape[1]):
        if ink[y,x] and not lab[y,x]:
            n+=1; q=deque([(y,x)]); lab[y,x]=n
            while q:
                yy,xx=q.popleft()
                for dy in range(-3,4):
                    for dx in range(-3,4):
                        Y,X=yy+dy,xx+dx
                        if 0<=Y<ink.shape[0] and 0<=X<ink.shape[1] and ink[Y,X] and not lab[Y,X]: lab[Y,X]=n; q.append((Y,X))
sizes=[(lab==i).sum() for i in range(1,n+1)]
big=sorted(range(1,n+1),key=lambda i:-sizes[i-1])[:4]
for k,i in enumerate(sorted(big)):
    ys,xs=np.where(lab==i); cut((1156+xs.min(),226+ys.min(),1156+xs.max(),226+ys.max()),f'ma-troi-{k+1}',interior=False,pad=26,fade=22)
