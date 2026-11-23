# Cắt asset 2D từ các tấm tranh vẽ tay nền trắng → PNG nền trong suốt (public/models/ma/2D)
import numpy as np, sys
from PIL import Image, ImageDraw
from scipy import ndimage as nd
import os
U=(sys.argv[1] if len(sys.argv) > 1 else 'tranh') + '/'   # thư mục chứa các tấm tranh gốc
OUT='public/models/ma/2D/'
SH={'lua':'8cd62b38-image.jpg','nen':'40766369-image.png','sukien':'17f6c7d8-image.png','ongtu':'1c7a0eca-image.png','canh1':'9ff3d7f5-image.png','canh2':'16da04ae-image.png','dovat':'abe89041-image.png','fx':'0abf8ef7-image.png','dat':'c9140125-image.jpg'}
IM={k:np.asarray(Image.open(U+f).convert('RGB')).astype(float) for k,f in SH.items()}
def save(rgb,a,name,trim=True):
    out=np.dstack([np.clip(rgb,0,255),np.clip(a,0,1)*255]).astype('uint8'); im=Image.fromarray(out,'RGBA')
    if trim:
        bb=im.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox()
        if bb: im=im.crop(bb)
    im.save(OUT+name+'.png'); return im.size
def unwhite(c,a):
    a3=np.maximum(a,1e-3)[...,None]; rgb=np.clip((c-255*(1-a3))/a3,0,255); return np.where(a[...,None]>0.995,c,rgb)
def cut(sheet,box,name,interior=True,gain=1.3,keep=True,white=(),fade=0,pad=6,fadeb=0,tint=None,wthr=244):
    src=IM[sheet].copy()
    for wb in white: src[wb[1]:wb[3],wb[0]:wb[2]]=255     # xoá chữ chú thích
    x0,y0,x1,y1=box; x0=max(0,x0-pad); y0=max(0,y0-pad); x1=min(src.shape[1],x1+pad); y1=min(src.shape[0],y1+pad)
    c=src[y0:y1,x0:x1]; mn=c.min(2); mx=c.max(2)
    m=Image.fromarray(((mn>=min(228,wthr))*255).astype('uint8')).convert('L').copy()
    # tô nền từ mọi điểm trắng ở mép khung
    for x in range(0,m.width,7):
        for y in (0,m.height-1):
            if m.getpixel((x,y))==255: ImageDraw.floodfill(m,(x,y),128)
    for y in range(0,m.height,7):
        for x in (0,m.width-1):
            if m.getpixel((x,y))==255: ImageDraw.floodfill(m,(x,y),128)
    bg=np.asarray(m)==128
    # lỗ trắng nằm lọt trong hình (giữa vòng đá, kẽ lá, khe hàng rào) cũng là nền
    wl,wn=nd.label(mn>=wthr)
    if wn:
        ws=nd.sum(np.ones_like(mn),wl,range(1,wn+1)); holes=np.isin(wl,[i+1 for i,v in enumerate(ws) if v>=40])
        bg=bg|nd.binary_dilation(holes,iterations=1)
    a=np.clip((255-mn)/255*gain,0,1); a=np.maximum(a,np.clip((mx-mn)/90,0,1)*(a>0.02))
    if interior: a=np.where(bg,a,1.0)
    if keep:   # chỉ giữ hình chính (bỏ mẩu hình khác lấn vào khung)
        ink=nd.binary_dilation(a>0.12,iterations=4); lab,n=nd.label(ink)
        if n>1:
            sz=nd.sum(ink,lab,range(1,n+1)); big=sz.max(); okl=[i+1 for i,s in enumerate(sz) if s>=big*0.12]
            a=a*np.isin(lab,okl)
    if fade:
        h,w=a.shape; yy,xx=np.mgrid[0:h,0:w]; d=np.minimum(np.minimum(yy,h-1-yy),np.minimum(xx,w-1-xx)); a=a*np.clip(d/fade,0,1)**1.5
    if fadeb:
        h=a.shape[0]; a=a*np.clip((h-1-np.arange(h))/fadeb,0,1)[:,None]
    rgb=unwhite(c,a)
    if tint is not None: rgb=np.broadcast_to(np.array(tint,float),rgb.shape)
    return name, save(rgb,a,name)
def panel_sky(sheet,box,name,k=1.0):
    # dải cây vẽ trên trời tối: tách trời ra trong suốt theo độ sáng từng hàng (cây đen giữ đặc, cây mờ sương thành bán trong)
    x0,y0,x1,y1=box; c=IM[sheet][y0:y1,x0:x1]; L=c.mean(2)
    sky=np.percentile(L,92,axis=1)[:,None]; dark=np.percentile(L,1)
    a=np.clip((sky-L)/np.maximum(sky-dark,6)*1.6*k,0,1)
    a[-int(c.shape[0]*0.06):]=1
    return name, save(c,a,name,trim=False)
def panel_mist(sheet,box,name,gain=1.15):
    x0,y0,x1,y1=box; c=IM[sheet][y0:y1,x0:x1]; mn=c.min(2); a=np.clip((255-mn)/255*gain,0,1)
    return name, save(unwhite(c,a),a,name,trim=False)
R=[]
# đống lửa
R+= [cut('lua',(40,145,352,362),'cui-1'),cut('lua',(375,140,680,362),'cui-2'),cut('lua',(706,142,1004,365),'cui-3'),cut('lua',(1032,140,1337,362),'cui-4'),
     cut('lua',(40,415,438,712),'vong-da'),cut('lua',(463,435,925,707),'tro'),cut('lua',(943,427,1338,712),'dong-cui')]
# nền xa
R+= [panel_sky('nen',(40,38,870,153),'cay-xa',0.8),panel_sky('nen',(40,188,870,328),'cay-vua'),panel_sky('nen',(40,363,870,550),'cay-gan'),
     panel_mist('nen',(40,582,870,726),'nui'),panel_mist('nen',(915,370,1365,494),'nui-2'),panel_mist('nen',(915,237,1365,341),'lang',1.05),
     cut('nen',(915,38,1360,205),'luy-tre',interior=False,gain=1.6),cut('nen',(945,518,1075,652),'trang',interior=False,gain=1.0,keep=False,fade=10),
     cut('nen',(932,668,1180,707),'may-1',interior=False,gain=1.2,keep=False),cut('nen',(1105,608,1350,648),'may-2',interior=False,gain=1.2,keep=False)]
# ông Tư
R+= [cut('ongtu',(68,60,376,396),'ongtu-tau'),cut('ongtu',(760,418,1048,735),'ongtu-tra'),cut('ongtu',(50,410,408,733),'ongtu-nghi'),cut('ongtu',(428,40,680,548),'ongtu-di')]
# cảnh: rừng tre, bụi chuối, đồng, giếng
R+= [cut('canh1',(25,18,362,250),'tre-gay'),cut('canh1',(365,25,690,225),'mang-tre'),cut('canh1',(25,255,297,372),'la-tre'),
     cut('canh1',(768,18,895,368),'buong-chuoi'),cut('canh1',(898,22,1012,366),'bap-chuoi'),cut('canh1',(1040,22,1337,330),'la-chuoi',white=[(1143,205,1340,372)]),
     cut('canh1',(172,535,400,750),'ao',white=[(0,400,262,760)]),cut('canh1',(408,408,515,735),'cot-dien'),cut('canh1',(495,458,738,745),'choi'),
     cut('canh1',(757,410,930,578),'gau-nuoc'),cut('canh1',(930,418,1083,572),'rong-roc'),cut('canh1',(763,617,968,750),'da-reu'),cut('canh1',(1075,405,1355,752),'cay-sung')]
# gốc đa, nghĩa địa, miếu, bến đò
R+= [cut('canh2',(0,0,692,375),'goc-da',white=[(30,12,185,52)]),
     cut('canh2',(722,55,820,190),'bia-1'),cut('canh2',(822,88,915,172),'bia-2'),cut('canh2',(905,50,1082,168),'mo'),cut('canh2',(710,195,988,358),'hang-rao',wthr=236),
     cut('canh2',(995,183,1112,325),'bia-hoa'),cut('canh2',(1092,38,1362,360),'cay-su',white=[(1110,215,1185,300)]),
     cut('canh2',(30,438,195,738),'tuong-da',white=[(175,580,320,710)]),cut('canh2',(180,462,332,586),'lu-huong'),cut('canh2',(580,408,662,752),'cot-muc'),
     cut('canh2',(345,420,412,654),'van-go'),cut('canh2',(500,410,600,505),'mang-nhen',interior=False,gain=1.8,keep=False),
     panel_mist('canh2',(705,440,1088,602),'mat-nuoc'),cut('canh2',(710,603,955,746),'luc-binh'),cut('canh2',(955,548,1090,742),'mai-cheo',white=[(940,430,1058,602)]),
     cut('canh2',(1095,508,1172,742),'den-bao'),cut('canh2',(1172,398,1368,754),'cay-ban')]
# đồ vật
R+= [cut('dovat',(18,12,347,335),'sap-cho'),cut('dovat',(356,43,565,211),'thung-mung'),cut('dovat',(567,30,820,178),'den-long'),cut('dovat',(823,30,1023,215),'ganh'),
     cut('dovat',(1038,18,1153,262),'cot-non'),cut('dovat',(1170,18,1265,325),'cot-tin-hieu'),cut('dovat',(1266,103,1350,293),'den-ga'),
     cut('dovat',(441,232,683,368),'duong-ray'),cut('dovat',(715,220,895,350),'toa-tau'),cut('dovat',(920,257,1083,496),'bien-bao',white=[(860,350,925,540)]),
     cut('dovat',(62,334,190,522),'cua-so'),cut('dovat',(296,331,587,537),'giuong'),cut('dovat',(652,355,866,540),'ban-tho',white=[(745,492,1012,560)]),cut('dovat',(752,495,1010,758),'cong-dinh'),
     cut('dovat',(1141,335,1338,550),'rem-rach'),cut('dovat',(44,481,261,752),'tuong-vo'),cut('dovat',(283,488,370,756),'cot-do-1'),cut('dovat',(380,518,466,756),'cot-do-2'),
     cut('dovat',(507,526,691,752),'trong'),cut('dovat',(1053,495,1122,745),'den-dau'),cut('dovat',(1167,565,1329,750),'lu-dong')]
# hiệu ứng
R+= [cut('fx',(44,40,175,172),f'lua-1',interior=False,gain=1.5,keep=False,fadeb=18),cut('fx',(197,30,328,172),'lua-2',interior=False,gain=1.5,keep=False,fadeb=18),
     cut('fx',(348,32,479,172),'lua-3',interior=False,gain=1.5,keep=False,fadeb=18),cut('fx',(500,20,631,172),'lua-4',interior=False,gain=1.5,keep=False,fadeb=18),
     cut('fx',(712,30,903,235),'khoi-1',interior=False,gain=1.2,keep=False),cut('fx',(1032,45,1270,222),'khoi-2',interior=False,gain=1.2,keep=False,white=[(1265,60,1320,105)]),
     cut('fx',(668,296,792,375),'dom-dom',interior=False,gain=3,keep=False,fade=8,tint=(230,255,170)),cut('fx',(1173,276,1307,333),'buom',interior=False,gain=1.4,keep=False),
     cut('fx',(44,373,606,440),'suong-1',interior=False,gain=1.3,keep=False),cut('fx',(35,448,606,527),'suong-2',interior=False,gain=1.3,keep=False),
     cut('fx',(302,566,378,612),'la-1',interior=False,gain=1.5),cut('fx',(481,558,548,620),'la-2',interior=False,gain=1.5),cut('fx',(68,635,113,688),'la-3',interior=False,gain=1.5),
     cut('fx',(988,466,1346,738),'tia-trang',interior=False,gain=1.6,keep=False,fade=30,tint=(205,218,240))]
# vật phẩm sự kiện (bỏ búp bê mắt đen, khung ảnh mặt ma, bàn cơ chữ tiếng Anh vì quy tắc CLAUDE.md)
R+= [cut('sukien',(82,92,300,214),'bo-cui',white=[(255,215,365,255)]),cut('sukien',(423,113,522,222),'hu-muoi'),cut('sukien',(770,80,985,338),'cua-go',white=[(770,338,1000,372)],keep=False),
     cut('sukien',(287,307,322,377),'nen'),cut('sukien',(82,497,340,690),'khoi-nhap',white=[(255,640,345,675)],interior=False,gain=1.3),
     cut('sukien',(540,488,672,690),'bat-nhang',white=[(540,690,640,720)],keep=False),cut('sukien',(935,522,1002,620),'bua'),cut('sukien',(1065,535,1136,640),'chuong'),
     cut('sukien',(1170,512,1328,642),'guong-bat-quai',pad=2,wthr=205,gain=2)]
# cây cỏ (ảnh nhỏ)
R+= [cut('dat',(12,132,92,182),'co-1',pad=2,wthr=226,gain=1.6),cut('dat',(115,130,190,265),'co-lau',pad=2,wthr=226,gain=1.6),cut('dat',(215,133,302,203),'duong-xi',pad=2,wthr=226,gain=1.6)]
for r in R: print(*r)
# hậu kỳ: gương bát quái cắt tròn bỏ quầng nền; cỏ (ảnh nhỏ) bỏ nét giấy trắng giữa các lá
def post_round(name, r=0.47):
    im=np.asarray(Image.open(OUT+name+'.png')).astype(float); h,w=im.shape[:2]; yy,xx=np.mgrid[0:h,0:w]
    d=np.hypot((xx-w/2)/(w/2),(yy-h/2)/(h/2)); im[...,3]*=np.clip((0.98-d)/0.06,0,1); Image.fromarray(im.astype('uint8'),'RGBA').save(OUT+name+'.png')
def post_nowhite(name):
    im=np.asarray(Image.open(OUT+name+'.png')).astype(float); L=im[...,:3].mean(2); im[...,3]*=1-np.clip((L-140)/70,0,1); Image.fromarray(im.astype('uint8'),'RGBA').save(OUT+name+'.png')
post_round('guong-bat-quai')
for n in ['co-1','co-lau','duong-xi']: post_nowhite(n)
