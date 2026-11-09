#!/usr/bin/env python3
# A tinted contact sheet from the packed atlases, for looking at the art without the game. Tints the way src/render-art.js does. Needs Pillow and numpy; never needed to play.
#   python3 tools/blender/contact_sheet.py OUT.png [--dir assets/players] [--zoom 3] [--body medium.m] [--clips run,carry] [--dirs 0,45,90,135,180] [--style 0..11] [--px 40]
#   python3 tools/blender/contact_sheet.py OUT.png --grid [--styles 2,3,8,9,10,11] [--body medium.f] [--clip run] [--frame 2] [--dirs 0,45,90,135,180] [--px 40]   one style a row, one facing a column, a different kit, skin and hair colour on each row
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
args = sys.argv[1:]
def opt(n, d):
    return args[args.index(n) + 1] if n in args else d
HERE = os.path.dirname(os.path.abspath(__file__))
DIR = opt('--dir', os.path.join(HERE, '..', '..', 'assets', 'players'))
ZOOM, BODY, STYLE = int(opt('--zoom', 3)), opt('--body', 'medium.m'), opt('--style', None)
PXOUT = int(opt('--px', 0))
man = json.load(open(os.path.join(DIR, 'players.json')))
pages = [np.asarray(Image.open(os.path.join(DIR, f)).convert('RGB')) for f in man['pages']]
PARTS = man['parts']
KIT = dict(shirt='#c8102e', hoop='#f1eee4', trim='#f1eee4', shorts='#ece9df', socks='#c8102e', skin='#c69c7c', hair='#2a1d16', boots='#22252b', shaved='#8a6c58', eye='#120e0c', cap='#f1eee4', line='#0a120d')
if '--kit2' in args: KIT.update(shirt='#123a7a', hoop='#123a7a', trim='#ffcf3d', shorts='#123a7a', socks='#123a7a', skin='#7f5337', hair='#17120e', shaved='#5a3f2c', cap='#ffcf3d')
rgb = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32)
def lock_of(hex):                                                     # as artPaletteOf does
    c = rgb(hex); dark = (.299*c[0] + .587*c[1] + .114*c[2])/255 < .16
    return c + (rgb('#8a6548') - c)*.24 if dark else c + (rgb('#17120e') - c)*.3
def luts():
    out = [None]
    for n in PARTS:
        c, L = lock_of(KIT['hair']) if n == 'lock' else rgb(KIT[n]), np.zeros((256, 3), np.float32)
        for s in range(256):
            v = s/255; L[s] = np.minimum(255, c*min(v/0.70, 1.06) + max(0, v - 0.46)*62)
        out.append(L)
    return out
LUT = luts()
def crop(r):
    a = pages[r[0]][r[2]:r[2] + r[4], r[1]:r[1] + r[3]]
    s, p, c = a[..., 0], a[..., 1] >> 4, a[..., 2]
    out = np.zeros(a.shape[:2] + (4,), np.uint8)
    for i in range(1, len(LUT)):
        m = p == i
        if m.any(): out[m, :3] = LUT[i][s[m]].astype(np.uint8)
    out[..., 3] = c
    return Image.fromarray(out, 'RGBA')
def sprite(canvas, r, fx, fy, style, q):
    # draw at foot fx, fy; q is output pixels per atlas pixel
    im = crop(r)
    def put(im, x, y):
        w, h = im.size
        im2 = im.resize((max(1, round(w*q)), max(1, round(h*q))), Image.LANCZOS if q < 1 else Image.NEAREST)
        canvas.alpha_composite(im2, (round(fx + x*q), round(fy + y*q)))
    put(im, -r[5], -r[6])
    hk = man['hair'][man['styles'][style]][r[7]]
    if hk: put(crop(hk), r[8] - hk[5], r[9] - hk[6])
# the looks the grid walks, row by row: dark hair on a dark shirt and fair hair on a pale one are the hard ones
GRID = [dict(shirt='#123a7a', hoop='#123a7a', trim='#ffcf3d', shorts='#123a7a', socks='#123a7a', skin='#7f5337', hair='#17120e', shaved='#5a3f2c', cap='#ffcf3d'),
        dict(shirt='#c8102e', hoop='#f1eee4', trim='#f1eee4', shorts='#ece9df', socks='#c8102e', skin='#f1d0b4', hair='#7d4f25', shaved='#b08f76', cap='#f1eee4'),
        dict(shirt='#f1eee4', hoop='#f1eee4', trim='#123a7a', shorts='#123a7a', socks='#f1eee4', skin='#c69c7c', hair='#c29a55', shaved='#a88a64', cap='#123a7a'),
        dict(shirt='#16161a', hoop='#16161a', trim='#f1eee4', shorts='#16161a', socks='#16161a', skin='#553522', hair='#2a1d16', shaved='#40291a', cap='#f1eee4'),
        dict(shirt='#0f7a3f', hoop='#ffcf3d', trim='#ffcf3d', shorts='#f1eee4', socks='#0f7a3f', skin='#e2b593', hair='#a33f1f', shaved='#c47a5a', cap='#ffcf3d'),
        dict(shirt='#6a1b4d', hoop='#6a1b4d', trim='#f1eee4', shorts='#6a1b4d', socks='#6a1b4d', skin='#a8764f', hair='#4c2f1b', shaved='#7a5236', cap='#f1eee4')]
if '--grid' in args:
    styles = [int(v) for v in opt('--styles', ','.join(str(i) for i in range(len(man['styles'])))).split(',')]
    cn = opt('--clip', 'run'); c = man['clips'][cn]; fr = int(opt('--frame', 2)) % c['n']
    want = [int(v) for v in opt('--dirs', ','.join(str(v) for v in c['dirs'])).split(',')]
    q = PXOUT/man['px'] if PXOUT else ZOOM
    cw, ch = round((3.0 if c['shape'] == 'low' else 1.25)*man['px']*q), round(2.25*man['px']*q)
    looks = int(opt('--looks', 1))
    sheet = Image.new('RGBA', (70 + cw*len(want)*looks, ch*len(styles)), (47, 106, 56, 255))
    d = ImageDraw.Draw(sheet)
    for j, st in enumerate(styles):
        d.text((4, j*ch + 6), f'{st} {man["styles"][st]}', fill=(255, 255, 255, 255))
        for li in range(looks):
            KIT.update(GRID[(j + li) % len(GRID)]); LUT[:] = luts()
            for i, deg in enumerate(want):
                sprite(sheet, man['sprites'][BODY][cn][c['dirs'].index(deg)*c['n'] + fr], 70 + cw*(li*len(want) + i) + cw//2, (j + 1)*ch - round(.2*man['px']*q), st, q)
    sheet.convert('RGB').save(args[0])
    print(args[0], sheet.size)
    sys.exit(0)
clips = opt('--clips', ','.join(man['clips'])).split(',')
want = opt('--dirs', None)
rows = []
for cn in clips:
    c = man['clips'][cn]
    for di, deg in enumerate(c['dirs']):
        if want and str(deg) not in want.split(','): continue
        rows.append((cn, di, deg, c['n']))
q = PXOUT/man['px'] if PXOUT else ZOOM
cw, ch = round(1.9*man['px']*q), round(2.3*man['px']*q)
nmax = max(r[3] for r in rows)
W, H = 90 + cw*nmax, ch*len(rows)
sheet = Image.new('RGBA', (W, H), (47, 106, 56, 255))
d = ImageDraw.Draw(sheet)
n = 0
for j, (cn, di, deg, nf) in enumerate(rows):
    d.text((4, j*ch + 6), f'{cn}\n{deg}', fill=(255, 255, 255, 255))
    big = man['clips'][cn]['shape'] == 'low'
    base = man['sprites'][BODY][cn]
    for i in range(nf):
        r = base[di*nf + i]
        st = int(STYLE) if STYLE is not None else n % len(man['styles'])
        sprite(sheet, r, 90 + cw*i + cw//2, (j + 1)*ch - round(.3*man['px']*q), st, q); n += 1
sheet.convert('RGB').save(args[0])
print(args[0], sheet.size)
