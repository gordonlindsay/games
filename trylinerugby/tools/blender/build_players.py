# Builds the 2.5D rugby player entirely from code, renders it and packs the sprite atlases the game tints at runtime.
# Blender is a development tool only: players never need it and the game engine stays Canvas 2D.
#
#   node tools/blender/regenerate.mjs                     everything, then rebuilds sw.js
#   Blender --background --python tools/blender/build_players.py -- [flags]
#     --preview       one body and a few poses, for looking, not shipping
#     --bodies a,b    only these, of slim.m slim.f medium.m medium.f stocky.m stocky.f
#     --render-only   keep the renders in --work, and do not pack
#     --reuse         pack again from the renders kept in --work, without rendering
#     --force         render again over any kept renders
#     --hair a,b      only these hair styles, into the kept render; then packs unless --render-only. A style appended to STYLES is rendered this way by itself
#     --hair-clips c  with --hair, only the head turns these clips first show, for a quick look. Not for shipping: pack refuses a style with gaps unless --partial
#     --work DIR      where renders are kept (default: the system temp folder)
#     --out DIR       where the atlases and players.json go (default: assets/players)
#   python3 tools/blender/contact_sheet.py OUT.png        a tinted contact sheet of what was packed
#
# Each atlas pixel holds one body part's light: R the greyscale shade, G the part id x 16, B the coverage. Parts never overlap in a sprite, so one
# image carries what seven separate greyscale sheets would, and the alpha channel is left alone because a browser premultiplies it and rounds.
# Nothing here is downloaded: mesh, armature, weights, materials and actions are all made below.
import bpy, bmesh, sys, os, json, math, time, zlib, struct, hashlib, shutil, subprocess, tempfile
import numpy as np
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(os.path.dirname(HERE))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
flag = lambda name: name in argv
opt = lambda name, default: argv[argv.index(name) + 1] if name in argv else default
PREVIEW, REUSE = flag('--preview'), flag('--reuse')
OUT = os.path.abspath(opt('--out', os.path.join(GAME, 'assets', 'players')))
WORK = os.path.abspath(opt('--work', os.path.join(tempfile.gettempdir(), 'tryline-players')))

# ---------- what is made ----------
PX = 64                          # atlas pixels per metre: the game's top sprite tier
SS = 3                           # rendered at this many times that, then box-filtered
TILT = 10/22                     # the Mid camera: height over distance, ch/back in render-behind.js. Low is 0.39, High 0.52
PARTS = ['shirt', 'hoop', 'trim', 'shorts', 'socks', 'skin', 'hair', 'boots', 'shaved', 'eye', 'cap', 'line', 'lock']   # append only: the id is in the atlas. A lock is hair on hair, tinted a step off it, so a tail shows against the head it falls over
PID = {n: i + 1 for i, n in enumerate(PARTS)}
HAIR_PARTS = ('hair', 'shaved', 'cap', 'lock')
STYLES = ['short', 'shaved', 'big', 'cap', 'band', 'bun', 'pony', 'plait', 'sideplait', 'bunches', 'highpony', 'bob']   # the order of look.style in src/looks.js: append only, a saved look holds the index
SHAPES = {'stand': dict(w=1.8, h=2.5, ox=0.9, oy=2.1), 'low': dict(w=3.0, h=2.75, ox=1.5, oy=1.9)}   # metres, feet at ox, oy, as BV_CELL
D5, D8 = [0, 45, 90, 135, 180], [0, 45, 90, 135, 180, 225, 270, 315]   # facing, clockwise from straight up the screen. The rest of D5's eight are mirrors
BUILDS = {   # the mesh differs, not just a scale: b is the look.b this build is true at, and the game takes up the rest with a small scale
    'slim':   dict(b=0.92, tw=0.84, td=0.84, sx=0.235, limb=0.80, hip=0.87, neck=0.86, belly=0.92, gut=0.0),
    'medium': dict(b=1.00, tw=1.00, td=1.00, sx=0.275, limb=1.00, hip=0.85, neck=1.00, belly=1.00, gut=0.0),
    'stocky': dict(b=1.12, tw=1.30, td=1.24, sx=0.345, limb=1.28, hip=0.81, neck=1.32, belly=1.12, gut=0.025),
}
# male and female on one rig and one set of actions, in the same kit. The difference is modest on purpose: shoulder and hip shape, nothing else
FEMALE = dict(sx=0.93, tup=0.93, hipw=1.08, waist=0.94, limb=0.96, neck=0.92)
def body_of(b, g):
    B = dict(BUILDS[b], tup=1.0, hipw=1.0, waist=1.0, name=b + ('.f' if g else '.m'))
    if g: B.update(sx=B['sx']*FEMALE['sx'], tup=FEMALE['tup'], hipw=FEMALE['hipw'], waist=FEMALE['waist'], limb=B['limb']*FEMALE['limb'], neck=B['neck']*FEMALE['neck'])
    return B
BODIES = [b + '.' + g for b in BUILDS for g in 'mf']
HEAD_SCALE, HEAD_PIVOT = 1.10, 1.52
KNEE_T, ANKLE, SHOULDER, ELBOW, WRIST = 0.53, 0.10, 1.375, 1.09, 0.85   # the arm's joints, and where the knee sits on the leg

# ---------- a mesh built from lofted rings and blobs ----------
class Build:
    def __init__(s): s.v, s.w, s.f, s.p = [], [], [], []
    def vert(s, pos, w): s.v.append(tuple(pos)); s.w.append(w); return len(s.v) - 1
    def face(s, idx, part): s.f.append(tuple(idx)); s.p.append(PID[part] - 1)
    def tube(s, rings, segs=10, cap0=True, cap1=True):
        # a ring: centre, x radius, y radius, part up to the next ring, bone weights, optional axes. A part change doubles the ring, so the edge stays crisp
        ids = []
        for i, r in enumerate(rings):
            c, rx, ry, part, w = r[:5]
            ax, ay = r[5] if len(r) > 5 else (Vector((1, 0, 0)), Vector((0, 1, 0)))
            ids.append([s.vert(Vector(c) + ax*(rx*math.cos(2*math.pi*j/segs)) + ay*(ry*math.sin(2*math.pi*j/segs)), w) for j in range(segs)])
        for i in range(len(rings) - 1):
            for j in range(segs):
                k = (j + 1) % segs
                s.face((ids[i][j], ids[i][k], ids[i + 1][k], ids[i + 1][j]), rings[i][3])
        for cap, i in ((cap0, 0), (cap1, len(rings) - 1)):
            if not cap: continue
            c = s.vert(rings[i][0], rings[i][4])
            for j in range(segs):
                k = (j + 1) % segs
                s.face((ids[i][k], ids[i][j], c) if i == 0 else (ids[i][j], ids[i][k], c), rings[min(i, len(rings) - 2)][3])
    def blob(s, c, r, part, w, nu=10, nv=7, keep=None, shape=None, warp=None):
        # a stretched sphere; keep drops faces by direction, shape pushes each point out, warp stretches it across and down on their own
        grid = {}
        def at(i, j):
            key = (i, 0 if i in (0, nv) else j % nu)
            if key not in grid:
                ph, th = -math.pi/2 + math.pi*i/nv, 2*math.pi*(j % nu)/nu
                d = Vector((math.cos(ph)*math.cos(th), math.cos(ph)*math.sin(th), math.sin(ph)))
                m = shape(d) if shape else 1
                mh, mz = warp(d) if warp else (1, 1)
                grid[key] = s.vert((c[0] + r[0]*d.x*m*mh, c[1] + r[1]*d.y*m*mh, c[2] + r[2]*d.z*m*mz), w)
            return grid[key]
        for i in range(nv):
            for j in range(nu):
                ph, th = -math.pi/2 + math.pi*(i + .5)/nv, 2*math.pi*(j + .5)/nu
                d = Vector((math.cos(ph)*math.cos(th), math.cos(ph)*math.sin(th), math.sin(ph)))
                if keep and not keep(d): continue
                q = [at(i, j), at(i, j + 1), at(i + 1, j + 1), at(i + 1, j)]
                q = [a for n, a in enumerate(q) if a != q[n - 1]]
                if len(q) >= 3: s.face(q, part)
    def object(s, name, rig):
        # the head and all its hair a little big for the body, about the top of the neck: friendly, and it reads at 40px
        s.v = [tuple((0, 0, HEAD_PIVOT)[i]*(1 - HEAD_SCALE) + v[i]*HEAD_SCALE for i in range(3)) if s.w[n] == {'head': 1} else v for n, v in enumerate(s.v)]
        me = bpy.data.meshes.new(name)
        me.from_pydata(s.v, [], s.f)
        for m in MATS: me.materials.append(m)
        me.polygons.foreach_set('material_index', s.p)
        me.update()
        ob = bpy.data.objects.new(name, me)
        bpy.context.collection.objects.link(ob)
        groups = {}
        for i, w in enumerate(s.w):
            for bone, weight in w.items():
                if bone not in groups: groups[bone] = ob.vertex_groups.new(name=bone)
                groups[bone].add([i], weight, 'REPLACE')
        # weld the doubled rings, lose faces of no area and point every normal outward: a degenerate or inward face shades black at this size
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bmesh.ops.dissolve_degenerate(bm, dist=1e-5, edges=bm.edges)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        for f in bm.faces: f.smooth = True
        bm.to_mesh(me); bm.free(); me.update()
        mod = ob.modifiers.new('rig', 'ARMATURE'); mod.object = rig
        ob.parent = rig
        return ob

def materials():
    # one material a part: its light for the shade pass, its id for the flat id pass. All but the eyes and boots are near white, because the game tints them
    out = []
    for name in PARTS:
        m = bpy.data.materials.new(name)
        v = PID[name]*16/255
        m.use_nodes = True
        nt = m.node_tree; n = nt.nodes; bsdf = n.get('Principled BSDF')
        rough = {'hair': 0.55, 'lock': 0.55, 'boots': 0.5, 'cap': 0.6, 'skin': 0.6}.get(name, 0.8)
        spec = {'hair': 0.5, 'lock': 0.5, 'boots': 0.6, 'skin': 0.35}.get(name, 0.15)
        bsdf.inputs['Roughness'].default_value = rough
        bsdf.inputs['Specular IOR Level'].default_value = spec
        bsdf.inputs['Base Color'].default_value = (0.8, 0.8, 0.8, 1)
        if name in ('shirt', 'hoop', 'shorts', 'socks', 'trim'):         # subtle fabric: soft creases in the light, and a little mottling
            tc = n.new('ShaderNodeTexCoord'); no = n.new('ShaderNodeTexNoise'); bump = n.new('ShaderNodeBump'); ramp = n.new('ShaderNodeValToRGB')
            no.inputs['Scale'].default_value = 7; no.inputs['Detail'].default_value = 3
            nt.links.new(tc.outputs['Object'], no.inputs['Vector'])
            bump.inputs['Strength'].default_value = 0.55; bump.inputs['Distance'].default_value = 0.05
            nt.links.new(no.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
            ramp.color_ramp.elements[0].position = 0.35; ramp.color_ramp.elements[0].color = (0.70, 0.70, 0.70, 1)
            ramp.color_ramp.elements[1].position = 0.65; ramp.color_ramp.elements[1].color = (0.84, 0.84, 0.84, 1)
            nt.links.new(no.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
        em = n.new('ShaderNodeEmission'); em.name = 'Emit'; em.inputs['Color'].default_value = (v, v, v, 1); em.inputs['Strength'].default_value = 1
        out.append(m)
    return out

# ---------- the rig ----------
def make_rig(name, B):
    hip, knee = B['hip'], ANKLE + (B['hip'] - ANKLE)*KNEE_T
    hx = 0.10*B['tw']**0.6*B['hipw']**0.5
    arm = bpy.data.armatures.new(name)
    rig = bpy.data.objects.new(name, arm)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    def bone(n, h, t, parent, z):
        e = arm.edit_bones.new(n); e.head = h; e.tail = t; e.use_connect = False
        if parent: e.parent = arm.edit_bones[parent]
        e.align_roll(Vector(z)); return e
    up, fwd, top = (0, -1, 0), (0, 1, 0), (0, 0, 1)
    bone('pelvis', (0, 0, hip + 0.03), (0, 0, 1.0), None, up)
    bone('spine', (0, 0, 1.0), (0, 0, 1.18), 'pelvis', up)
    bone('chest', (0, 0, 1.18), (0, 0, 1.44), 'spine', up)
    bone('neck', (0, 0, 1.44), (0, 0, 1.52), 'chest', up)
    bone('head', (0, 0, 1.52), (0, 0, 1.80), 'neck', up)
    for side, x in (('R', 1), ('L', -1)):
        bone('thigh.' + side, (x*hx, 0, hip), (x*hx, 0, knee), 'pelvis', fwd)
        bone('shin.' + side, (x*hx, 0, knee), (x*hx, 0, ANKLE), 'thigh.' + side, fwd)
        bone('foot.' + side, (x*hx, 0, ANKLE), (x*hx, 0.15, ANKLE), 'shin.' + side, top)
        sx = B['sx']*x
        bone('upper.' + side, (sx, 0, SHOULDER), (sx, 0, ELBOW), 'chest', fwd)
        bone('fore.' + side, (sx, 0, ELBOW), (sx, 0, WRIST), 'upper.' + side, fwd)
        bone('hand.' + side, (sx, 0, WRIST), (sx, 0, WRIST - 0.08), 'fore.' + side, fwd)
    bpy.ops.object.mode_set(mode='OBJECT')
    rig.rotation_mode = 'XYZ'
    return rig, dict(hip=hip, knee=knee, hx=hx, sx=B['sx'], pivot=hip + 0.03)

def make_body(name, rig, R, B):
    M = Build()
    tw, td, limb, sx, hx, hip, knee = B['tw'], B['td'], B['limb'], B['sx'], R['hx'], R['hip'], R['knee']
    # the torso: a shirt that flares a little over the shorts, three hoops and a chest that tapers into the collar
    def prof(z):
        h, w_, u_ = B['hipw'], B['waist'], B['tup']
        table = [(0.93, .205*h, .150), (1.00, .195*(h + w_)/2, .140), (1.10, .205*B['belly']*w_, .150*B['belly']), (1.26, .240*u_, .165), (1.36, .238*u_, .145), (1.44, .105/tw, .092/td)]
        for (a, ra, da), (b, rb, db) in zip(table, table[1:]):
            if z <= b:
                t = max(0, (z - a)/(b - a)); return ra + (rb - ra)*t, da + (db - da)*t
        return table[-1][1:]
    def spine_w(z):
        if z < 1.0: return {'pelvis': .7, 'spine': .3}
        if z < 1.12: return {'spine': 1}
        if z < 1.24: return {'spine': .5, 'chest': .5}
        return {'chest': 1}
    bands = [(0.93, 1.03, 'shirt'), (1.03, 1.10, 'hoop'), (1.10, 1.16, 'shirt'), (1.16, 1.23, 'hoop'), (1.23, 1.29, 'shirt'), (1.29, 1.36, 'hoop'), (1.36, 1.44, 'shirt')]
    rings = []
    for a, b, part in bands:
        for z in (a, (a + b)/2):
            rx, ry = prof(z)
            rings.append(((0, B['gut']*(1 - abs(z - 1.1)/.2 if abs(z - 1.1) < .2 else 0), z), rx*tw, ry*td, part, spine_w(z)))
    rx, ry = prof(1.44)
    rings.append(((0, 0, 1.44), rx*tw, ry*td, 'shirt', spine_w(1.44)))
    M.tube(rings, segs=14)
    # shoulders fill the gap between the torso and the sleeves
    for x in (-1, 1): M.blob((x*(sx - 0.03), 0, 1.385), (0.115*limb, 0.105*limb, 0.075*limb), 'shirt', {'chest': 1}, nu=8, nv=5)
    # shorts
    sh = tw*B['hipw']
    M.tube([((0, 0, 1.01), .16*sh, .12*td, 'shorts', {'pelvis': 1}), ((0, 0, .95), .178*sh, .132*td, 'shorts', {'pelvis': 1}), ((0, 0, .90), .200*sh, .150*td, 'shorts', {'pelvis': 1}), ((0, 0, hip - .08), .205*sh, .155*td, 'shorts', {'pelvis': 1})], segs=14)   # well inside the shirt's hem, or a bent body pokes through
    # the collar and neck
    M.tube([((0, 0.002, 1.425), .098*B['neck'], .088*B['neck'], 'trim', {'chest': 1}), ((0, 0.006, 1.468), .090*B['neck'], .082*B['neck'], 'trim', {'chest': .6, 'neck': .4})], segs=10)
    M.tube([((0, 0, 1.43), .07*B['neck'], .068*B['neck'], 'skin', {'chest': 1}), ((0, 0.004, 1.50), .066*B['neck'], .066*B['neck'], 'skin', {'neck': 1}), ((0, 0.008, 1.56), .066*B['neck'], .068*B['neck'], 'skin', {'head': 1})], segs=8)
    for x in (-1, 1):
        s = 'R' if x > 0 else 'L'
        # the leg: shorts to mid-thigh, a bare knee, a band at the top of the sock
        lx = x*hx; T, Sh = 'thigh.' + s, 'shin.' + s; r = limb
        hem = hip - (hip - knee)*0.62
        M.tube([
            ((lx, 0, hip + .04), .115*r, .120*r, 'shorts', {T: .7, 'pelvis': .3}),
            ((lx, 0, hip - .06), .130*r, .135*r, 'shorts', {T: 1}),
            ((lx, 0, hem), .120*r, .125*r, 'shorts', {T: 1}),
            ((lx, 0, hem), .092*r, .098*r, 'skin', {T: 1}),
            ((lx, 0, knee + .02), .078*r, .082*r, 'skin', {T: .6, Sh: .4}),
            ((lx, 0, knee - .05), .074*r, .078*r, 'skin', {Sh: 1}),
            ((lx, 0, knee - .07), .080*r, .084*r, 'trim', {Sh: 1}),
            ((lx, 0, knee - .13), .084*r, .092*r, 'trim', {Sh: 1}),
            ((lx, 0, knee - .13), .084*r, .092*r, 'socks', {Sh: 1}),
            ((lx, -.008, knee - .21), .074*r, .082*r, 'socks', {Sh: 1}),
            ((lx, 0, ANKLE + .04), .054*r, .058*r, 'socks', {Sh: 1}),
            ((lx, 0, ANKLE - .02), .052*r, .054*r, 'socks', {Sh: .5, 'foot.' + s: .5}),
        ], segs=9)
        # the boot, along the foot
        F = 'foot.' + s; X, Z = Vector((1, 0, 0)), Vector((0, 0, 1)); fr = 0.92 + 0.12*(limb - 1)
        M.tube([
            ((lx, -.085, .055), .040*fr, .040, 'boots', {F: 1}, (X, Z)),
            ((lx, -.05, .070), .058*fr, .070, 'boots', {F: 1}, (X, Z)),
            ((lx, .02, .062), .066*fr, .062, 'boots', {F: 1}, (X, Z)),
            ((lx, .11, .044), .070*fr, .044, 'boots', {F: 1}, (X, Z)),
            ((lx, .185, .034), .050*fr, .028, 'boots', {F: 1}, (X, Z)),
        ], segs=9)
        # the arm: a sleeve with a hoop and a cuff, a bare forearm, a mitten of a hand
        ax = x*sx; U, Fo, H = 'upper.' + s, 'fore.' + s, 'hand.' + s
        M.tube([
            ((ax, 0, 1.43), .070*r, .070*r, 'shirt', {U: 1}),
            ((ax, 0, 1.385), .100*r, .098*r, 'shirt', {U: 1}),
            ((ax, 0, 1.33), .096*r, .094*r, 'hoop', {U: 1}),
            ((ax, 0, 1.27), .092*r, .090*r, 'shirt', {U: 1}),
            ((ax, 0, 1.205), .091*r, .089*r, 'trim', {U: 1}),
            ((ax, 0, 1.165), .094*r, .092*r, 'trim', {U: 1}),
            ((ax, 0, 1.165), .072*r, .072*r, 'skin', {U: 1}),
            ((ax, 0, ELBOW + .01), .072*r, .072*r, 'skin', {U: .5, Fo: .5}),
            ((ax, 0, ELBOW - .08), .071*r, .071*r, 'skin', {Fo: 1}),
            ((ax, 0, WRIST + .02), .054*r, .056*r, 'skin', {Fo: 1}),
        ], segs=8)
        M.blob((ax, 0.004, WRIST - .045), (.050*r**.5, .058*r**.5, .070), 'skin', {H: 1}, nu=8, nv=5)
    # the head: big for the body, friendly, a narrower jaw, two eyes, a nose and ears
    W = {'head': 1}
    jaw = lambda d: 1 - 0.17*max(0, -d.z)**1.4
    M.blob(HEAD_C, HEAD_R, 'skin', W, nu=14, nv=9, shape=jaw)
    for x in (-1, 1):
        M.blob((x*.0515, .118, 1.648), (.0235, .012, .0275), 'eye', W, nu=6, nv=4)
        M.blob((x*.120, -.004, 1.626), (.018, .030, .036), 'skin', W, nu=6, nv=4)
    M.blob((0, .137, 1.605), (.022, .022, .026), 'skin', W, nu=6, nv=4)
    M.blob((0, .121, 1.553), (.036, .008, .0075), 'eye', W, nu=6, nv=3)
    return M.object(name + '.body', rig)

HEAD_C, HEAD_R = (0, 0.006, 1.63), (.128, .138, .158)
def shell(M, scale, keep, part, lump=0.0, nu=16, nv=10, c=HEAD_C, u=7, v=5):
    # a skin over the skull: keep says which directions it covers. d.y is forward, d.z up
    bump = lambda d: 1 + lump*math.sin(u*math.atan2(d.y, d.x) + 1.3)*math.sin(v*math.asin(max(-1, min(1, d.z))) + 0.6)
    M.blob(c, tuple(r*scale for r in HEAD_R), part, {'head': 1}, nu=nu, nv=nv, keep=keep, shape=bump)
def make_hair(style, rig):
    M = Build()
    line = lambda d: d.z > 0.12 + 0.45*d.y - 0.42*max(0, -d.y)      # a hairline high at the front and low at the back
    if style == 'short': shell(M, 1.075, line, 'hair', lump=.035)
    elif style == 'shaved': shell(M, 1.018, line, 'shaved')
    elif style == 'big':
        cover = lambda d: d.z > -0.28 + 0.75*max(0, d.y) + 0.18*max(0, d.y)
        shell(M, 1.46, cover, 'hair', lump=.085, nu=18, nv=12, c=(0, -0.012, 1.655), u=9, v=7)
    elif style == 'cap':
        cover = lambda d: d.z > -0.42 + 0.95*max(0, d.y)
        shell(M, 1.115, cover, 'cap', lump=.022, u=8, v=8)
        X, Y = Vector((1, 0, 0)), Vector((0, 1, 0))
        M.tube([((0, .03, 1.490), .118, .094, 'cap', {'head': 1}), ((0, .03, 1.515), .118, .094, 'cap', {'head': 1})], segs=12, cap0=False, cap1=False)   # the chin strap
    elif style == 'band':
        shell(M, 1.065, lambda d: d.z > 0.22 + 0.35*d.y - 0.42*max(0, -d.y), 'hair', lump=.04)
        M.tube([((0, .006, 1.668), HEAD_R[0]*1.09, HEAD_R[1]*1.09, 'cap', {'head': 1}), ((0, .006, 1.712), HEAD_R[0]*1.05, HEAD_R[1]*1.05, 'cap', {'head': 1})], segs=16, cap0=False, cap1=False)
    elif style == 'bun':
        shell(M, 1.07, line, 'hair', lump=.02)
        M.blob((0, -.165, 1.775), (.084, .078, .080), 'hair', {'head': 1}, nu=12, nv=8)   # out behind the crown, and bigger: on the crown it hid in the back view, the one your own team shows. No coloured band: from the front a light one floats over the head like a halo
    elif style == 'pony':
        shell(M, 1.07, line, 'hair', lump=.02)
        X, Z = Vector((1, 0, 0)), Vector((0, 0, 1))
        pts = [(-.125, 1.70, .040), (-.175, 1.665, .058), (-.205, 1.59, .066), (-.215, 1.50, .056), (-.205, 1.42, .034), (-.195, 1.37, .012)]
        M.tube([((0, y, z), r, r, 'hair', {'head': 1}) for y, z, r in pts], segs=9)
        M.blob((0, -.122, 1.705), (.05, .03, .045), 'cap', {'head': 1}, nu=8, nv=5)
    elif style == 'plait':
        shell(M, 1.07, line, 'hair', lump=.02)
        for i, (y, z, r) in enumerate([(-.145, 1.655, .052), (-.178, 1.585, .056), (-.192, 1.515, .052), (-.198, 1.45, .046), (-.198, 1.39, .038)]):
            M.blob((.012*(-1)**i, y, z), (r, r, r*.82), 'hair', {'head': 1}, nu=8, nv=5)
        M.blob((0, -.198, 1.345), (.032, .032, .026), 'cap', {'head': 1}, nu=8, nv=5)
    # the four that read from the front as well as the back. Hair is keyed on the head alone and drawn over any body, so each hangs off the head bone, and none has a tie in a kit colour: a light one floats like a halo
    elif style == 'sideplait':                                        # gathered low across the nape, over the right shoulder and down the chest: the rope from behind, the plait from in front
        shell(M, 1.07, line, 'hair', lump=.02)
        rope(M, [(-.075, -.128, 1.635, .050), (.035, -.135, 1.570, .060), (.112, -.098, 1.530, .060), (.160, -.030, 1.500, .058), (.178, .050, 1.462, .056), (.182, .125, 1.395, .054), (.178, .178, 1.320, .051), (.172, .198, 1.250, .046), (.168, .202, 1.195, .036), (.165, .202, 1.165, .016)], sub=4, braid=.22)
    elif style == 'bunches':                                          # one each side of the head, out past the ears: a wide head from any side
        shell(M, 1.07, line, 'hair', lump=.02)
        for x in (-1, 1):
            rope(M, [(x*.105, -.030, 1.715, .034), (x*.185, -.040, 1.705, .064), (x*.232, -.045, 1.640, .074), (x*.240, -.045, 1.565, .064), (x*.228, -.040, 1.500, .040), (x*.215, -.035, 1.470, .014)])
    elif style == 'highpony':                                         # tied high on the crown and falling behind: the camera looks down, so what is behind the head stands above it from the front
        shell(M, 1.07, line, 'hair', lump=.02)
        rope(M, [(0, -.040, 1.770, .056), (0, -.090, 1.832, .066), (0, -.158, 1.838, .072), (0, -.212, 1.770, .072), (0, -.236, 1.670, .064), (0, -.238, 1.575, .044), (0, -.228, 1.510, .020), (0, -.224, 1.490, .008)], wide=1.25)
    elif style == 'bob':                                              # the skull's own shape over the crown, then straight down past the jaw to a hem that flares, with the face left open: a curtain each side from the front, a full head of hair from behind
        def face(d):
            return abs(math.atan2(d.x, d.y)) < math.radians(56) and d.z < .52 - .18*d.x
        def warp(d):                                                  # below the equator a ring keeps its width, and flares as it nears the hem
            if d.z >= 0: return 1, 1
            t = -d.z/.72
            return (1 + .24*t*t)/max(.2, math.sqrt(1 - d.z*d.z)), 1.70
        M.blob((0, -.010, 1.630), (.143, .158, .176), 'hair', {'head': 1}, nu=28, nv=20, keep=lambda d: d.z > -.72 and not face(d), warp=warp, shape=lambda d: 1 + .018*math.sin(13*math.atan2(d.y, d.x)))
    return M.object(rig.name + '.' + style, rig)
def rope(M, pts, part='lock', segs=9, sub=3, braid=0.0, wide=1.0):
    # a smooth tapering cord through (x, y, z, radius) points, for a ponytail or a plait: its rings stay square to the path, so it can run sideways. braid knots it; wide flattens it across the body
    ps = [Vector(p[:3]) for p in pts]; rs = [p[3] for p in pts]; n = len(ps) - 1
    def at(i): return ps[max(0, min(n, i))]
    path = []
    for i in range(n):
        for j in range(sub):
            t = j/sub; a, b, c, d = at(i - 1), at(i), at(i + 1), at(i + 2)
            path.append((.5*((2*b) + (c - a)*t + (2*a - 5*b + 4*c - d)*t*t + (3*b - a - 3*c + d)*t*t*t), rs[i] + (rs[i + 1] - rs[i])*t))
    path.append((ps[-1], rs[-1]))
    ax, rings = None, []
    for i, (c, r) in enumerate(path):
        T = (path[min(i + 1, len(path) - 1)][0] - path[max(i - 1, 0)][0]).normalized()
        ax = (Vector((1, 0, 0)) if abs(T.x) < .8 else Vector((0, 1, 0))) if ax is None else ax
        ax = (ax - T*ax.dot(T)).normalized(); ay = T.cross(ax).normalized()
        k = 1 + braid*math.cos(i*math.pi/2) if braid else 1           # a knot every fourth ring, leaning each way in turn
        lean = ax*(r*braid*.9*math.sin(i*math.pi/2)) if braid else Vector((0, 0, 0))
        rings.append((c + lean, r*k*wide, r*k, part, {'head': 1}, (ax, ay)))
    M.tube(rings, segs=segs)

# ---------- posing: joints from targets, then matrices, then keyframes ----------
rx = lambda a: Matrix.Rotation(a, 3, 'X')
ry = lambda a: Matrix.Rotation(a, 3, 'Y')
rz = lambda a: Matrix.Rotation(a, 3, 'Z')
UPRIGHT = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))       # a body frame (x right, y forward, z up) to a spine bone's axes (y along the bone, z backward)
def frame4(R, t):
    m = R.to_4x4(); m.translation = t; return m
def limb_mats(root, target, L1, L2, pole):
    d = target - root; D = d.length
    if D > 0.998*(L1 + L2): target = root + d*(0.998*(L1 + L2)/D); d = target - root; D = d.length
    D = max(D, abs(L1 - L2) + 1e-3)
    u = d.normalized(); a = (L1*L1 - L2*L2 + D*D)/(2*D); h = math.sqrt(max(0, L1*L1 - a*a))
    p = (pole - u*pole.dot(u)); p = p.normalized() if p.length > 1e-5 else Vector((0, 1, 0))
    mid = root + u*a + p*h
    y1 = (mid - root).normalized()
    z1 = (p - y1*p.dot(y1)).normalized(); x = y1.cross(z1).normalized()
    y2 = (target - mid).normalized(); z2 = x.cross(y2).normalized()
    M1 = Matrix((x, y1, z1)).transposed(); M2 = Matrix((x, y2, z2)).transposed()
    return M1, mid, M2, target
def solve(P, rig_info, B):
    # P: hip, lean, roll, yaw (the pelvis); twist, bend (spine to chest); head (x, y, z rotations in rig space, level by default);
    # foot R/L: target, toe pitch, knee pole; hand R/L: target in chest space, or ('w', target) in rig space; elbow pole in chest space
    out = {}
    Rp = rz(P.get('yaw', 0)) @ ry(P.get('roll', 0)) @ rx(-P.get('lean', 0))
    hip = Vector(P['hip']); piv = rig_info['pivot']
    out['pelvis'] = frame4(Rp @ UPRIGHT, hip)
    twist, bend, side = P.get('twist', 0), P.get('bend', 0), P.get('sbend', 0)
    Rs = Rp @ rz(twist*.5) @ rx(-bend*.5) @ ry(side*.5)
    j_s = hip + Rp @ Vector((0, 0, 1.0 - piv))
    out['spine'] = frame4(Rs @ UPRIGHT, j_s)
    Rc = Rs @ rz(twist*.5) @ rx(-bend*.5) @ ry(side*.5)
    j_c = j_s + Rs @ Vector((0, 0, .18))
    out['chest'] = frame4(Rc @ UPRIGHT, j_c)
    j_n = j_c + Rc @ Vector((0, 0, .26))
    hd = P.get('head', (0, 0, 0))
    Rh = rz(hd[2]) @ ry(hd[1]) @ rx(hd[0])
    Rn = Rc.to_quaternion().slerp(Rh.to_quaternion(), .5).to_matrix()
    out['neck'] = frame4(Rn @ UPRIGHT, j_n)
    j_h = j_n + Rn @ Vector((0, 0, .08))
    out['head'] = frame4(Rh @ UPRIGHT, j_h)
    leg1, leg2 = rig_info['hip'] - rig_info['knee'], rig_info['knee'] - ANKLE
    arm1, arm2 = SHOULDER - ELBOW, ELBOW - WRIST
    for s, x in (('R', 1), ('L', -1)):
        hj = hip + Rp @ Vector((x*rig_info['hx'], 0, rig_info['hip'] - piv))
        f = P['foot'][s]; target = Vector(f[0]); pole = Vector(f[2]) if len(f) > 2 else Rp @ Vector((x*.15, 1, 0))
        M1, mid, M2, t = limb_mats(hj, target, leg1, leg2, pole)
        out['thigh.' + s] = frame4(M1, hj); out['shin.' + s] = frame4(M2, mid)
        out['foot.' + s] = frame4(rz(P.get('yaw', 0)*.5) @ rx(f[1]), t)
        sj = j_c + Rc @ Vector((x*rig_info['sx'], 0, SHOULDER - 1.18))
        h = P['hand'][s]
        target = Vector(h[1]) if h[0] == 'w' else j_c + Rc @ Vector(h)
        pole = Rc @ Vector(P.get('elbow', {}).get(s, (x*.45, -1, -.25)))
        M1, mid, M2, t = limb_mats(sj, target, arm1, arm2, pole)
        out['upper.' + s] = frame4(M1, sj); out['fore.' + s] = frame4(M2, mid)
        out['hand.' + s] = frame4(M2, t)
    return out

def gait(t, a, f, lift, toe=0.55):
    # one ankle over a cycle: planted and running back from +a to -a at constant speed for fraction f, so a stride of 2a/f metres per cycle cannot skate
    t %= 1
    if t < f:
        u = t/f
        p = -toe*max(0, (u - .6)/.4)**2
        return a*(1 - 2*u), ANKLE + 0.13*math.sin(-p), p
    u = (t - f)/(1 - f); e = u*u*(3 - 2*u)
    z = lift*math.sin(math.pi*u**0.72)
    p = -toe*(1 - u)**1.5 + 0.28*max(0, (u - .72)/.28)
    return -a + 2*a*e, ANKLE + 0.06*(1 - u)**3 + z, p
def run_pose(ph, a, f, lift, lean, bob, drop, arm=1.0, carry=False):
    # ph 0..1. The right foot lands at 0, the left at 0.5. Knee lift from lift, opposing arm swing from the same clock, a bob twice a cycle
    fly = (f + .5)/2
    hipz = BODY['hip'] + .03 - drop + bob*math.cos(4*math.pi*(ph - fly))
    swing = math.cos(2*math.pi*(ph - (1 + f)/2))            # +1 as the right foot comes through: right hip forward, right arm back
    hip = (0.012*swing, 0, hipz)
    P = dict(hip=hip, lean=lean, yaw=.16*swing, roll=-.03*swing, twist=-(0.42 if not carry else .24)*swing, bend=.08, head=(-lean*.45, 0, .02*swing), foot={}, hand={}, elbow={})
    hx = BODY['hx']
    for s, x, off in (('R', 1, 0), ('L', -1, .5)):
        y, z, p = gait(ph + off, a, f, lift)
        P['foot'][s] = ((x*hx*.82, y, z), p)
        q = -swing*x
        if not carry:
            sx = BODY['sx']
            P['hand'][s] = (x*(sx + .012), .03 + arm*.27*q, SHOULDER - 1.18 - .385 + .10*max(0, q)**1.5 + .03*max(0, -q))
            P['elbow'][s] = (x*.5, -1, -.35)
    if carry:
        cz = BALL[2]
        P['hand']['R'] = (BALL[0] + .105, BALL[1] - .02, cz + .01)
        P['hand']['L'] = (BALL[0] - .105, BALL[1] + .04, cz - .01)
        P['elbow'] = {'R': (.8, -.7, -.3), 'L': (-.8, -.7, -.3)}
    return P
BALL = (0.06, 0.25, 0.115)       # where the ball sits, in chest space: held up at the chest in both hands, clear of the shorts from every side (children play this), a little to the right so it shows from behind
BODY = {}

def clips():
    # name: (dirs, shape, poses). All built from targets, so the same sets work on all three builds
    hipz = BODY['hip'] + .03; hx = BODY['hx']; sx = BODY['sx']; c = {}
    idle = lambda b, br: dict(hip=(0, 0, hipz - .045 - b), lean=.06, bend=.02 + br, head=(-.03, 0, 0), foot={'R': ((hx*1.55, .05, ANKLE), 0), 'L': ((-hx*1.55, -.05, ANKLE), 0)},
        hand={'R': (sx + .055, .05, SHOULDER - 1.18 - .50), 'L': (-sx - .055, .05, SHOULDER - 1.18 - .50)}, elbow={'R': (.7, -1, 0), 'L': (-.7, -1, 0)})
    c['idle'] = (D5, 'stand', [idle(0, 0), idle(.008, .025)])
    ci = idle(0, 0); ci['hand'] = {'R': (BALL[0] + .105, BALL[1] - .02, BALL[2] + .01), 'L': (BALL[0] - .105, BALL[1] + .04, BALL[2] - .01)}; ci['elbow'] = {'R': (.8, -.7, -.3), 'L': (-.8, -.7, -.3)}; ci['lean'] = .10
    c['carryidle'] = (D5, 'stand', [ci])
    c['run'] = (D5, 'stand', [run_pose(i/8, RUN['a'], RUN['f'], .30, .16, .018, .062) for i in range(8)])
    c['sprint'] = (D5, 'stand', [run_pose(i/8, SPRINT['a'], SPRINT['f'], .40, .36, .022, .078, arm=1.25) for i in range(8)])
    c['carry'] = (D5, 'stand', [run_pose(i/8, RUN['a'], RUN['f'], .28, .22, .016, .066, carry=True) for i in range(8)])
    # the pass, thrown to the body's left. All eight facings, because a pass to the right is a flipped pass to the left
    stance = {'R': ((hx*1.3, .24, ANKLE), 0), 'L': ((-hx*1.3, -.22, ANKLE + .02), -.3)}
    z0 = SHOULDER - 1.18
    c['pass'] = (D8, 'stand', [
        dict(hip=(0, 0, hipz - .10), lean=.20, yaw=-.22, twist=-.50, foot=stance, head=(-.05, 0, .25), hand={'R': (.32, .26, z0 - .32), 'L': (.14, .38, z0 - .28)}, elbow={'R': (.9, -.5, -.3), 'L': (-.5, -1, -.3)}),
        dict(hip=(0, 0, hipz - .09), lean=.18, yaw=.14, twist=.34, foot=stance, head=(-.05, 0, .45), hand={'R': (-.02, .52, z0 - .15), 'L': (-.28, .46, z0 - .13)}, elbow={'R': (.6, -.6, -.6), 'L': (-.7, -.5, -.6)}),
        dict(hip=(0, 0, hipz - .08), lean=.14, yaw=.26, twist=.56, sbend=.08, foot=stance, head=(-.04, 0, .55), hand={'R': (-.22, .56, z0 - .10), 'L': (-.52, .36, z0 - .08)}, elbow={'R': (.5, -.5, -.8), 'L': (-.6, -.4, -.8)}),
    ])
    # the Side Step, off a feint: the weight and a shoulder dip to the left, a planted left foot, the push, the step right. The other way is this, mirrored
    arms = dict(hand={'R': (BALL[0] + .105, BALL[1] - .02, BALL[2] + .01), 'L': (BALL[0] - .105, BALL[1] + .04, BALL[2] - .01)}, elbow={'R': (.8, -.7, -.3), 'L': (-.8, -.7, -.3)})
    c['sidestep'] = (D8, 'stand', [
        dict(hip=(-.09, .02, hipz - .07), lean=.20, roll=-.05, sbend=-.12, twist=.08, head=(-.08, -.05, .12), foot={'R': ((hx*.9, .16, ANKLE + .03), -.3), 'L': ((-hx*2.0, .02, ANKLE), 0)}, **arms),
        dict(hip=(-.17, .03, hipz - .12), lean=.24, roll=-.13, sbend=-.30, twist=.16, head=(-.1, -.14, .20), foot={'R': ((-hx*.1, .10, ANKLE + .09), -.5), 'L': ((-hx*3.0, .02, ANKLE), 0)}, **arms),
        dict(hip=(-.13, .05, hipz - .16), lean=.26, roll=-.04, sbend=-.10, twist=.0, head=(-.1, 0, -.05), foot={'R': ((hx*.5, .10, ANKLE + .13), -.4), 'L': ((-hx*3.3, .0, ANKLE), .05)}, **arms),
        dict(hip=(.04, .08, hipz - .09), lean=.24, roll=.12, sbend=.14, twist=-.10, head=(-.1, .05, -.18), foot={'R': ((hx*3.0, .14, ANKLE + .07), .1), 'L': ((-hx*2.9, -.10, ANKLE + .03), -.7)}, **arms),
        dict(hip=(.16, .08, hipz - .10), lean=.22, roll=.17, sbend=.18, twist=-.14, head=(-.08, .08, -.20), foot={'R': ((hx*3.6, .10, ANKLE), 0), 'L': ((-hx*.7, -.12, ANKLE + .12), -.8)}, **arms),
        dict(hip=(.09, .05, hipz - .06), lean=.20, roll=.08, sbend=.08, twist=-.06, head=(-.06, .03, -.08), foot={'R': ((hx*2.2, .08, ANKLE), 0), 'L': ((hx*.1, .12, ANKLE + .10), -.3)}, **arms),
    ])
    # the tackle: a lunge, the wrap, the dive
    c['tackle'] = (D5, 'low', [
        dict(hip=(0, -.08, hipz - .24), lean=.72, bend=.18, head=(-.25, 0, 0), foot={'R': ((hx*1.1, .30, ANKLE), .1), 'L': ((-hx*1.1, -.56, ANKLE + .05), -.8)},
             hand={'R': (.20, .45, z0 - .10), 'L': (-.20, .45, z0 - .10)}, elbow={'R': (.7, -.2, -1), 'L': (-.7, -.2, -1)}),
        dict(hip=(0, -.12, hipz - .36), lean=1.02, bend=.15, head=(-.45, 0, 0), foot={'R': ((hx*1.1, .05, ANKLE), -.3), 'L': ((-hx*1.1, -.70, ANKLE + .12), -1.0)},
             hand={'R': (.08, .50, z0 - .02), 'L': (-.08, .50, z0 - .02)}, elbow={'R': (1, 0, -1), 'L': (-1, 0, -1)}),
        dict(hip=(0, -.25, hipz - .50), lean=1.34, bend=.10, head=(-.80, 0, 0), foot={'R': ((hx*1.0, -.78, ANKLE + .22), -1.3), 'L': ((-hx*1.0, -.92, ANKLE + .34), -1.3)},
             hand={'R': (.14, .62, z0 + .04), 'L': (-.14, .62, z0 + .04)}, elbow={'R': (1, 0, -1), 'L': (-1, 0, -1)}),
    ])
    # going down, lying, getting up. Hands reach for the floor in rig space
    fall0 = dict(hip=(0, .02, hipz - .22), lean=.62, bend=.2, head=(-.2, 0, 0), foot={'R': ((hx*1.2, -.18, ANKLE), -.3), 'L': ((-hx*1.2, -.42, ANKLE + .10), -.8)},
                 hand={'R': (.28, .36, z0 - .18), 'L': (-.28, .36, z0 - .18)}, elbow={'R': (.8, -.5, -.3), 'L': (-.8, -.5, -.3)})
    fall1 = dict(hip=(0, -.04, hipz - .44), lean=.92, bend=.2, head=(-.45, 0, 0), foot={'R': ((hx*1.2, -.50, ANKLE + .02), -1.1), 'L': ((-hx*1.2, -.56, ANKLE + .02), -1.1)},
                 hand={'R': ('w', (sx*.9, .52, .10)), 'L': ('w', (-sx*.9, .56, .10))}, elbow={'R': (.8, -.3, -.2), 'L': (-.8, -.3, -.2)})
    fall1['hand'] = {k: v for k, v in fall1['hand'].items()}
    fall2 = dict(hip=(0, -.10, hipz - .62), lean=1.30, bend=.12, head=(-1.0, 0, 0), foot={'R': ((hx*1.1, -.72, ANKLE + .02), -1.4), 'L': ((-hx*1.1, -.76, ANKLE + .02), -1.4)},
                 hand={'R': ('w', (sx*1.1, .55, .07)), 'L': ('w', (-sx*1.1, .62, .07))}, elbow={'R': (.9, -.2, -.1), 'L': (-.9, -.2, -.1)})
    lying = dict(hip=(0, -.12, .155), lean=math.pi/2 - .02, bend=0, head=(-math.pi/2 + .25, .75, 0), foot={'R': ((hx*1.25, -.82, .085), -1.45), 'L': ((-hx*1.0, -.82, .085), -1.45)},
                 hand={'R': ('w', (sx + .16, .62, .06)), 'L': ('w', (-sx - .06, -.02, .07))}, elbow={'R': (1, 0, .4), 'L': (-1, 0, .4)})
    c['fall'] = (D5, 'low', [fall0, fall1, fall2])
    c['lying'] = (D5, 'low', [lying])
    c['getup'] = (D5, 'low', [
        dict(hip=(0, -.10, hipz - .50), lean=1.10, bend=.25, head=(-.7, 0, 0), foot={'R': ((hx*1.2, -.60, ANKLE + .01), -1.25), 'L': ((-hx*1.2, -.64, ANKLE + .01), -1.25)},
             hand={'R': ('w', (sx*1.05, .46, .09)), 'L': ('w', (-sx*1.05, .46, .09))}, elbow={'R': (.8, -.3, -.2), 'L': (-.8, -.3, -.2)}),
        dict(hip=(0, -.06, hipz - .36), lean=.70, bend=.25, head=(-.35, 0, 0), foot={'R': ((hx*1.2, .24, ANKLE), .0), 'L': ((-hx*1.2, -.42, ANKLE + .01), -1.15)},
             hand={'R': (.26, .30, z0 - .38), 'L': (-.26, .22, z0 - .40)}, elbow={'R': (.8, -.5, -.3), 'L': (-.8, -.5, -.3)}),
        dict(hip=(0, -.02, hipz - .18), lean=.34, bend=.15, head=(-.14, 0, 0), foot={'R': ((hx*1.3, .12, ANKLE), 0), 'L': ((-hx*1.3, -.18, ANKLE), -.3)},
             hand={'R': (sx + .06, .14, z0 - .44), 'L': (-sx - .06, .10, z0 - .46)}, elbow={'R': (.8, -.9, -.1), 'L': (-.8, -.9, -.1)}),
    ])
    # the Training Ground's own poses. Hands stay at chest height or well clear of the shorts in every one of them: children play this
    def ready(d, lean, head):                                # the Set position: feet wide, knees bent, back flat, head up, hands up in front of the chest
        return dict(hip=(0, -.05, hipz - d), lean=lean, bend=.12, head=(head, 0, 0), foot={'R': ((hx*2.0, .20, ANKLE), 0), 'L': ((-hx*2.0, -.14, ANKLE), 0)},
                    hand={'R': (.21, .24, z0 + .05), 'L': (-.21, .24, z0 + .05)}, elbow={'R': (.9, -.6, -.4), 'L': (-.9, -.6, -.4)})
    c['crouch'] = (D5, 'stand', [ready(.10, .24, -.08), ready(.22, .50, -.20), ready(.36, .78, -.34)])
    c['catch'] = (D5, 'stand', [                             # hands out for a ball at the chest, then up for a high one
        dict(hip=(0, 0, hipz - .08), lean=.12, bend=.04, head=(-.04, 0, 0), foot={'R': ((hx*1.5, .16, ANKLE), 0), 'L': ((-hx*1.5, -.12, ANKLE), -.2)},
             hand={'R': (.14, .38, z0 + .03), 'L': (-.14, .38, z0 + .03)}, elbow={'R': (.8, -.3, -.8), 'L': (-.8, -.3, -.8)}),
        dict(hip=(0, 0, hipz - .03), lean=-.05, bend=-.04, head=(.42, 0, 0), foot={'R': ((hx*1.4, .10, ANKLE), 0), 'L': ((-hx*1.4, -.10, ANKLE), -.2)},
             hand={'R': (.15, .28, z0 + .58), 'L': (-.15, .28, z0 + .58)}, elbow={'R': (.9, -.2, -.4), 'L': (-.9, -.2, -.4)}),
    ])
    c['reach'] = (D8, 'stand', [                             # a tag pull, out to the body's left at the height of the ribs, then the tag held up: all eight facings, because the other side is this mirrored
        dict(hip=(-.05, 0, hipz - .13), lean=.22, roll=-.06, sbend=-.10, twist=.18, head=(-.08, 0, .28), foot={'R': ((hx*1.2, .16, ANKLE), 0), 'L': ((-hx*2.4, -.08, ANKLE), -.2)},
             hand={'R': (.20, .20, z0 - .30), 'L': (-.66, .20, z0 - .26)}, elbow={'R': (.8, -.7, -.3), 'L': (-.5, -.6, -.6)}),
        dict(hip=(0, 0, hipz - .06), lean=.08, roll=0, twist=.08, head=(-.02, 0, .20), foot={'R': ((hx*1.4, .10, ANKLE), 0), 'L': ((-hx*1.5, -.08, ANKLE), -.2)},
             hand={'R': (.20, .14, z0 - .34), 'L': (-.34, .16, z0 + .46)}, elbow={'R': (.8, -.7, -.3), 'L': (-.8, -.2, -.5)}),
    ])
    bind = lambda hd, lean, r, l: dict(hip=(0, -.20, hipz - hd), lean=lean, bend=.05, head=(-.30, 0, 0), foot={'R': r, 'L': l},
                                       hand={'R': (.28, .16, z0 + .34), 'L': (-.28, .16, z0 + .34)}, elbow={'R': (.9, .3, -.5), 'L': (-.9, .3, -.5)})
    c['bind'] = (D5, 'low', [                                # a scrum: down and ready, bound and low with the head and shoulders above the hips, then a drive off each foot in turn
        bind(.34, .92, ((hx*1.5, .10, ANKLE), -.2), ((-hx*1.5, -.26, ANKLE + .03), -.7)),
        bind(.30, 1.24, ((hx*1.4, -.40, ANKLE + .04), -.9), ((-hx*1.4, -.92, ANKLE + .06), -1.0)),
        bind(.28, 1.30, ((hx*1.4, -.18, ANKLE + .02), -.7), ((-hx*1.4, -1.12, ANKLE + .09), -1.1)),
    ])
    hug = dict(hand={'R': (BALL[0] + .105, BALL[1] - .03, BALL[2] + .01), 'L': (BALL[0] - .105, BALL[1] + .03, BALL[2] - .01)}, elbow={'R': (.8, -.7, -.3), 'L': (-.8, -.7, -.3)})
    c['land'] = (D5, 'low', [                                # the safe landing, falling back with the ball hugged in: knees bent, onto the bottom, then the shoulder. No hand goes out
        dict(hip=(0, -.14, hipz - .34), lean=-.10, bend=.28, head=(.0, 0, 0), foot={'R': ((hx*1.3, .26, ANKLE), .1), 'L': ((-hx*1.3, .10, ANKLE), .1)}, **hug),
        dict(hip=(0, -.34, .24), lean=-.62, bend=.34, head=(-.28, 0, 0), foot={'R': ((hx*1.3, .40, ANKLE + .02), .4), 'L': ((-hx*1.3, .28, ANKLE + .10), .5)}, **hug),
        dict(hip=(0, -.52, .19), lean=-1.28, roll=.42, bend=.26, head=(-.62, 0, .12), foot={'R': ((hx*1.2, .04, ANKLE + .12), .7), 'L': ((-hx*1.2, -.10, ANKLE + .03), .6)}, **hug),
    ])
    c['place'] = (D5, 'low', [                               # on the ground with the head towards your team: the ball tucked in, then both arms long to put it back
        dict(hip=(0, .0, .18), lean=-1.40, roll=.34, bend=.08, head=(-1.02, 0, .10), foot={'R': ((hx*1.2, .62, ANKLE + .05), .9), 'L': ((-hx*1.2, .50, ANKLE + .02), .8)}, **hug),
        dict(hip=(0, .0, .17), lean=-1.46, roll=.26, bend=.02, head=(-1.12, 0, .06), foot={'R': ((hx*1.2, .74, ANKLE + .03), 1.0), 'L': ((-hx*1.2, .64, ANKLE + .01), .9)},
             hand={'R': ('w', (.10, -1.02, .13)), 'L': ('w', (-.08, -1.02, .13))}, elbow={'R': (.7, 0, .7), 'L': (-.7, 0, .7)}),
    ])
    c['kick'] = (D5, 'stand', [                              # a goal kick off the right foot: plant, strike, follow through. The arms go out for balance
        dict(hip=(.04, 0, hipz - .10), lean=.22, roll=-.10, twist=-.16, head=(-.10, 0, -.06), foot={'R': ((hx*1.1, -.50, ANKLE + .30), -1.0), 'L': ((-hx*1.3, .10, ANKLE), 0)},
             hand={'R': (sx + .24, -.02, z0 - .36), 'L': (-sx - .34, .24, z0 - .14)}, elbow={'R': (.9, -.5, -.2), 'L': (-.9, -.2, -.5)}),
        dict(hip=(.06, .04, hipz - .08), lean=.02, roll=.08, twist=.18, head=(-.24, 0, -.04), foot={'R': ((hx*1.0, .30, ANKLE + .09), .5), 'L': ((-hx*1.3, .10, ANKLE), 0)},
             hand={'R': (sx + .20, .10, z0 - .34), 'L': (-sx - .40, .10, z0 - .18)}, elbow={'R': (.9, -.5, -.2), 'L': (-.9, -.2, -.5)}),
        dict(hip=(.06, .10, hipz - .04), lean=-.18, roll=.12, twist=.30, head=(.08, 0, -.04), foot={'R': ((hx*.9, .66, ANKLE + .68), .7), 'L': ((-hx*1.3, .10, ANKLE + .01), -.4)},
             hand={'R': (sx + .14, .16, z0 - .26), 'L': (-sx - .42, -.04, z0 - .12)}, elbow={'R': (.9, -.5, -.2), 'L': (-.9, -.2, -.5)}),
    ])
    return c
RUN = dict(a=0.255, f=0.22)      # a run cycle of 2a/f metres: the game's stride uses these numbers, so the feet stay planted
SPRINT = dict(a=0.285, f=0.19)

def make_action(rig, clip, poses, info, B):
    # a real Action per clip, with a key per frame on every bone: open the saved .blend's Action Editor to see them
    rest = {b.name: b.matrix_local.copy() for b in rig.data.bones}
    parent = {b.name: b.parent.name if b.parent else None for b in rig.data.bones}
    act = bpy.data.actions.new(rig.name + '.' + clip)
    rig.animation_data_create(); rig.animation_data.action = act
    solved = []
    for i, P in enumerate(poses):
        T = solve(P, info, B); solved.append(T)
        for pb in rig.pose.bones:
            n = pb.name; pb.rotation_mode = 'QUATERNION'
            if parent[n]:
                basis = (rest[parent[n]].inverted() @ rest[n]).inverted() @ T[parent[n]].inverted() @ T[n]
            else:
                basis = rest[n].inverted() @ T[n]
            pb.matrix_basis = basis
            pb.keyframe_insert('location', frame=i + 1, group=n)
            pb.keyframe_insert('rotation_quaternion', frame=i + 1, group=n)
    return act, solved

# ---------- the stage ----------
def stage():
    s = bpy.context.scene
    s.render.film_transparent = True
    s.render.image_settings.file_format = 'PNG'; s.render.image_settings.color_mode = 'RGBA'; s.render.image_settings.color_depth = '8'; s.render.image_settings.compression = 10
    s.render.use_compositing = False; s.render.use_sequencer = False
    s.render.resolution_percentage = 100
    cd = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cd); bpy.context.collection.objects.link(cam); s.camera = cam
    D = 60.0
    # level and shifted, not tilted: the game's camera keeps verticals vertical, so a metre of height is a metre at any tilt, and the ground is squashed by TILT
    cam.location = (0, -D, D*TILT); cam.rotation_euler = (math.pi/2, 0, 0); cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36
    # one fixed sun, high and behind the lens with no sideways lean, so a mirrored sprite is still correctly lit
    sd = bpy.data.lights.new('sun', 'SUN'); sd.energy = 2.25; sd.angle = math.radians(14); sd.use_shadow = True
    sun = bpy.data.objects.new('sun', sd); bpy.context.collection.objects.link(sun)
    sun.rotation_mode = 'QUATERNION'; sun.rotation_quaternion = Vector((0, -0.55, 0.84)).to_track_quat('Z', 'Y')
    w = bpy.data.worlds.new('w'); s.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (.55, .57, .6, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = .56
    s.eevee.taa_render_samples = 16
    if hasattr(s.eevee, 'use_raytracing'): s.eevee.use_raytracing = False
    if hasattr(s.eevee, 'use_shadows'): s.eevee.use_shadows = True
    return cam
def set_shape(cam, shape):
    s = bpy.context.scene; sh = SHAPES[shape]; px = PX*SS; W, H = round(sh['w']*px), round(sh['h']*px)
    s.render.resolution_x, s.render.resolution_y = W, H
    D = cam.location.y*-1; cz = cam.location.z
    cam.data.lens = 36*D*px/W
    cam.data.shift_x = (W/2 - sh['ox']*px)/W
    cam.data.shift_y = -(H/2 + cz*px - sh['oy']*px)/W
    return W, H
def project(cam, wp):
    s = bpy.context.scene; c = world_to_camera_view(s, cam, Vector(wp)); W, H = s.render.resolution_x, s.render.resolution_y
    return c.x*W, (1 - c.y)*H
AMBIENT = .62
TMP = os.path.join(WORK, '_frame' + str(os.getpid()) + '.png')
def read_png(path):
    im = bpy.data.images.load(path, check_existing=False); im.colorspace_settings.name = 'Non-Color'
    w, h = im.size; a = np.empty(w*h*4, np.float32); im.pixels.foreach_get(a); bpy.data.images.remove(im)
    return np.flipud(a.reshape(h, w, 4))
def render_pair():
    s = bpy.context.scene
    s.render.engine = 'BLENDER_EEVEE'; s.render.filepath = TMP
    s.view_settings.view_transform = 'Standard'; s.view_settings.look = 'None'; s.render.filter_size = 1.5; s.eevee.taa_render_samples = 16
    for m in MATS: m.node_tree.links.new(m.node_tree.nodes['Principled BSDF'].outputs[0], m.node_tree.nodes['Material Output'].inputs['Surface'])
    s.world.node_tree.nodes['Background'].inputs['Strength'].default_value = AMBIENT
    bpy.ops.render.render(write_still=True); lit = read_png(TMP)
    # the same frame, unlit, each part in its id with no filtering: the coverage and the id are exact
    s.view_settings.view_transform = 'Raw'; s.render.filter_size = 0.01; s.eevee.taa_render_samples = 1
    for m in MATS: m.node_tree.links.new(m.node_tree.nodes['Emit'].outputs[0], m.node_tree.nodes['Material Output'].inputs['Surface'])
    s.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0
    bpy.ops.render.render(write_still=True); flat = read_png(TMP)
    ids = np.round(flat[..., 0]*255/16).astype(np.uint8); ids[flat[..., 3] < .5] = 0
    return lit[..., 0], ids

def reduce(lit, ids, keep=None):
    # box-filter the id and the light down to atlas pixels: the commonest part wins a pixel, the light is averaged over what is covered
    if keep is not None: ids = np.where(np.isin(ids, keep), ids, 0)
    H, W = ids.shape; h, w = H//SS, W//SS
    ids = ids[:h*SS, :w*SS].reshape(h, SS, w, SS).transpose(0, 2, 1, 3); lit = lit[:h*SS, :w*SS].reshape(h, SS, w, SS).transpose(0, 2, 1, 3)
    on = ids > 0; n = on.sum((2, 3))
    cov = (n/(SS*SS)).astype(np.float32)
    shade = np.where(n > 0, (lit*on).sum((2, 3))/np.maximum(n, 1), 0).astype(np.float32)
    counts = np.stack([(ids == i).sum((2, 3)) for i in range(1, len(PARTS) + 1)], 0)
    part = np.where(n > 0, counts.argmax(0) + 1, 0).astype(np.uint8)
    return shade, part, cov

def ink(shade, part, cov):
    # the look at 40px: a dark line round the man and a fainter one between parts. Both are in the art, so they cost nothing at runtime
    shade = shade.copy(); part = part.copy(); cov = cov.copy()
    solid = cov > .45
    def near(m):
        o = np.zeros_like(m)
        o[1:, :] |= m[:-1, :]; o[:-1, :] |= m[1:, :]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]
        return o
    # inner edges
    diff = np.zeros_like(solid)
    d = (part[1:, :] != part[:-1, :]) & solid[1:, :] & solid[:-1, :]; diff[1:, :] |= d
    d = (part[:, 1:] != part[:, :-1]) & solid[:, 1:] & solid[:, :-1]; diff[:, 1:] |= d
    eye = part == PID['eye']
    shade[diff & ~eye] *= .80
    # the rim just inside the silhouette, and the line just outside it
    rim = solid & near(~solid); shade[rim & ~eye] *= .84
    edge = (cov > 0) & (cov <= .45); part[edge] = PID['line']; shade[edge] = 0; cov[edge] = np.maximum(cov[edge], .55)
    out = (cov == 0) & near(solid); part[out] = PID['line']; shade[out] = 0; cov[out] = .42
    return shade, part, cov
def crop(shade, part, cov, tag=''):
    ys, xs = np.nonzero(cov > 0)
    if not len(ys): return None
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    if y0 == 0 or x0 == 0 or y1 == cov.shape[0] or x1 == cov.shape[1]: print('  clipped by its frame:', tag, (x0, y0, x1, y1), cov.shape, flush=True)
    return dict(x=int(x0), y=int(y0), s=np.minimum(np.round(shade[y0:y1, x0:x1]*255/4), 63).astype(np.uint8)*4, p=part[y0:y1, x0:x1], c=np.round(cov[y0:y1, x0:x1]*255).astype(np.uint8))

# ---------- rendering everything ----------
def to_px(cam, wp, foot):
    x, y = project(cam, wp); return (x/SS - foot[0], y/SS - foot[1])
def anchors(cam, T, rig_rot, ball):
    head = rig_rot @ (T['head'] @ Vector((0, .11, 0)))
    # the number, on the middle of the back, and how much of the back faces the lens
    num = rig_rot @ (T['chest'] @ Vector((0, .07, .17)))
    b = rig_rot @ (T['chest'] @ Vector((BALL[0], BALL[2], -BALL[1]))) if ball else None
    return head, num, b

def keyed_head(T, deg):
    e = (Matrix.Rotation(math.radians(-deg), 3, 'Z') @ T['head'].to_3x3()).to_euler('XYZ')
    return tuple(int(round(math.degrees(v)/10)) for v in e)

def render_body(bname):
    # one body's frames, kept on disk: a stopped run picks up where it left off, and Blender can be run on a few at once
    s = bpy.context.scene
    cam = stage()
    t0, n, sprites, hair_jobs = time.time(), 0, {}, {}
    build, g = bname.split('.')
    B = body_of(build, g == 'f')
    rig, info = make_rig(bname, B)
    BODY.clear(); BODY.update(info)
    make_body(bname, rig, info, B)
    hairs = {st: make_hair(st, rig) for st in STYLES} if bname == HAIR_BODY else {}
    for h in hairs.values(): h.hide_render = True
    cl = clips()
    if PREVIEW: cl = {k: cl[k] for k in ('idle', 'run', 'carry', 'pass', 'sidestep', 'tackle', 'lying', 'fall', 'getup')}
    only_clips = opt('--only', None)
    if only_clips: cl = {k: cl[k] for k in only_clips.split(',')}      # add or redo these clips in the body's cached render, leaving every other picture as it was
    for cname, (dirs, shape, poses) in cl.items():
        act, solved = make_action(rig, cname, poses, info, B)
        set_shape(cam, shape)
        for deg in dirs:
            if PREVIEW and deg in (45, 135, 225, 315) and cname not in ('sidestep',): continue
            rig.rotation_euler = (0, 0, math.radians(-deg))
            bpy.context.view_layer.update()
            rot = rig.matrix_world.copy()
            foot = project(cam, (0, 0, 0)); foot = (foot[0]/SS, foot[1]/SS)
            for i, T in enumerate(solved):
                s.frame_set(i + 1)
                lit, ids = render_pair(); n += 1
                shade, part, cov = reduce(lit, ids)
                ball = cname in BALL_CLIPS
                ah, an, ab = anchors(cam, T, rot, ball)
                key = (deg,) + keyed_head(T, deg)
                sprites[(bname, cname, deg, i)] = dict(shade=shade, part=part, cov=cov, foot=foot, head=to_px(cam, ah, foot), num=to_px(cam, an, foot), ball=to_px(cam, ab, foot) if ball else None, hk=key, shape=shape)
                if key not in hair_jobs: hair_jobs[key] = dict(clip=cname, deg=deg, i=i)
        print(f'  {bname} {cname}: {n} frames, {time.time() - t0:.0f}s', flush=True)
    old = np.load(cache_of(bname), allow_pickle=True)[0] if only_clips and os.path.exists(cache_of(bname)) else None
    if old is not None and old['hair']: hair_jobs = {k: v for k, v in hair_jobs.items() if ('short', k) not in old['hair']}
    hair = render_hair(hairs, hair_jobs, cl, rig, cam, info, B, t0) if hairs else {}
    keys = list(hair_jobs)
    if old is not None:
        sprites = {**{k: v for k, v in old['sprites'].items() if k[1] not in cl}, **sprites}
        hair = {**(old['hair'] or {}), **hair}
        keys = list(old['keys'] or []) + keys
    np.save(cache_of(bname), np.array([dict(sprites=sprites, hair=hair, keys=keys)], dtype=object), allow_pickle=True)
    print(f'rendered {bname}: {n} frames in {time.time() - t0:.0f}s', flush=True)

def render_hair(hairs, jobs, cl, rig, cam, info, B, t0):
    # each style at each head turn seen: the body stays in shot, so the skull and shoulders hide what is behind them
    s = bpy.context.scene; hair = {}
    print(f'  hair: {len(jobs)} head turns x {len(hairs)} styles', flush=True)
    keep = [PID[p] for p in HAIR_PARTS]
    for st, ob in hairs.items():
        ob.hide_render = False
        for key, job in jobs.items():
            dirs, shape, poses = cl[job['clip']]
            act, solved = make_action(rig, job['clip'] + '.hair', [poses[job['i']]], info, B)
            set_shape(cam, shape)
            rig.rotation_euler = (0, 0, math.radians(-job['deg'])); bpy.context.view_layer.update(); s.frame_set(1)
            rot = rig.matrix_world.copy()
            foot = project(cam, (0, 0, 0)); foot = (foot[0]/SS, foot[1]/SS)
            lit, ids = render_pair()
            shade, part, cov = reduce(lit, ids, keep=keep)
            ah, _, _ = anchors(cam, solved[0], rot, False)
            hair[(st, key)] = dict(shade=shade, part=part, cov=cov, foot=foot, head=to_px(cam, ah, foot))
        ob.hide_render = True
        print(f'  hair {st}: {time.time() - t0:.0f}s', flush=True)
    return hair

def hair_pass(styles, clip_names=None):
    # only these hair styles, into the kept render, with every body and every other style left as it was. The same head turns from the same poses as a full render.
    # clip_names keeps to the head turns those clips first show: a quick look, not for shipping
    t0, bname = time.time(), HAIR_BODY
    old = np.load(cache_of(bname), allow_pickle=True)[0]
    cam = stage()
    B = body_of(*(lambda b, g: (b, g == 'f'))(*bname.split('.')))
    rig, info = make_rig(bname, B)
    BODY.clear(); BODY.update(info)
    make_body(bname, rig, info, B)
    hairs = {st: make_hair(st, rig) for st in styles}
    for h in hairs.values(): h.hide_render = True
    cl, jobs = clips(), {}
    for cname, (dirs, shape, poses) in cl.items():
        solved = [solve(P, info, B) for P in poses]
        for deg in dirs:
            for i, T in enumerate(solved):
                key = (deg,) + keyed_head(T, deg)
                if key not in jobs: jobs[key] = dict(clip=cname, deg=deg, i=i)
    missing = [k for k in old['keys'] if k not in jobs]
    if missing: raise SystemExit(f'{len(missing)} kept head turns are no longer posed: render again with --force')
    if clip_names: jobs = {k: v for k, v in jobs.items() if v['clip'] in clip_names}
    hair = render_hair(hairs, jobs, cl, rig, cam, info, B, t0)
    old['hair'] = {**{k: v for k, v in old['hair'].items() if k[0] not in styles}, **hair}
    old['keys'] = list(old['keys']) + [k for k in jobs if k not in old['keys']]
    np.save(cache_of(bname), np.array([old], dtype=object), allow_pickle=True)
    print(f'rendered hair {",".join(styles)}: {len(jobs)} head turns in {time.time() - t0:.0f}s', flush=True)

def kept_styles():
    # which styles the kept render already holds
    if not os.path.exists(cache_of(HAIR_BODY)): return None
    return {k[0] for k in (np.load(cache_of(HAIR_BODY), allow_pickle=True)[0]['hair'] or {})}

def load_renders():
    R = {}
    for bname in BODIES:
        p = cache_of(bname)
        if not os.path.exists(p): continue
        d = np.load(p, allow_pickle=True)[0]
        R.update(d['sprites'])
        if d['hair']: R['hair'] = d['hair']; R['hairkeys'] = d['keys']
    return R
HAIR_BODY = 'medium.m'
BALL_CLIPS = ('carry', 'carryidle', 'sidestep')
cache_of = lambda b: os.path.join(WORK, 'renders-' + PX_TAG + '-' + b + '.npy')
PX_TAG = str(PX) + ('p' if PREVIEW else '')

# ---------- packing ----------
def write_png(path, rgb):
    h, w = rgb.shape[:2]
    raw = b''.join(b'\0' + rgb[y].tobytes() for y in range(h))
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d))
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2 if rgb.shape[2] == 3 else 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
def packer(items, size=2048):
    # shelves, tallest first
    order = sorted(range(len(items)), key=lambda i: (-items[i]['s'].shape[0], -items[i]['s'].shape[1]))
    pages, x, y, shelf = [np.zeros((size, size, 3), np.uint8)], 0, 0, 0
    used = [0]
    for i in order:
        it = items[i]; h, w = it['s'].shape
        if x + w > size: x = 0; y += shelf; shelf = 0
        if y + h > size:
            pages.append(np.zeros((size, size, 3), np.uint8)); used.append(0); x = y = shelf = 0
        p = pages[-1]
        p[y:y + h, x:x + w, 0] = it['s']; p[y:y + h, x:x + w, 1] = it['p']*16; p[y:y + h, x:x + w, 2] = it['c']
        it['page'] = len(pages) - 1; it['ax'] = x; it['ay'] = y
        x += w; shelf = max(shelf, h); used[-1] = max(used[-1], y + shelf)
    return [pg[:u] for pg, u in zip(pages, used)]

def encode(rgb, stem):
    png = os.path.join(WORK, stem + '.png'); write_png(png, rgb)
    cwebp = shutil.which('cwebp') or ('/opt/homebrew/bin/cwebp' if os.path.exists('/opt/homebrew/bin/cwebp') else None)
    tmp = os.path.join(WORK, stem + '.webp')
    if cwebp:
        subprocess.run([cwebp, '-quiet', '-lossless', '-z', '9', '-metadata', 'none', png, '-o', tmp], check=True)
    else:
        im = bpy.data.images.load(png); im.colorspace_settings.name = 'Non-Color'; im.file_format = 'WEBP'
        st = bpy.context.scene.render.image_settings; st.file_format = 'WEBP'; st.quality = 100; st.color_mode = 'RGB'
        im.save_render(tmp, scene=bpy.context.scene)
    data = open(tmp, 'rb').read()
    name = f'players-{stem}.{hashlib.sha256(data).hexdigest()[:10]}.webp'
    return name, data

def pack(R):
    for st in STYLES:                                                 # before the old atlases go
        gaps = sum(1 for k in R.get('hairkeys', []) if (st, k) not in R.get('hair', {}))
        if gaps and not flag('--partial'): raise SystemExit(f'Hair style {st} has {gaps} of {len(R["hairkeys"])} head turns not rendered: a player with it would show bald')
    items, table = [], {}
    for k, r in R.items():
        if not isinstance(k, tuple): continue
        c = crop(*ink(r['shade'], r['part'], r['cov']), tag=k)
        c['rec'] = r; items.append(c); table[k] = c
    hair = {}
    for k, r in R.get('hair', {}).items():
        c = crop(*ink(r['shade'], r['part'], r['cov']))
        if c is None: continue
        c['rec'] = r; items.append(c); hair[k] = c
    pages = packer(items)
    if os.path.isdir(OUT):
        for f in os.listdir(OUT):
            if f.startswith('players'): os.remove(os.path.join(OUT, f))
    os.makedirs(OUT, exist_ok=True)
    files = []
    total = 0
    for i, pg in enumerate(pages):
        name, data = encode(pg, str(i))
        open(os.path.join(OUT, name), 'wb').write(data); files.append(name); total += len(data)
        print(f'  page {i}: {pg.shape[1]}x{pg.shape[0]}, {len(data)//1024} KB', flush=True)
    ent = lambda c, foot, *more: [c['page'], c['ax'], c['ay'], c['s'].shape[1], c['s'].shape[0], round(foot[0] - c['x'], 1), round(foot[1] - c['y'], 1)] + list(more)
    keys = R.get('hairkeys', [])
    keyidx = {k: i for i, k in enumerate(keys)}
    builds = [b for b in BODIES if any(k[0] == b for k in table)]
    cl = {}
    for (b, c, deg, i) in table:
        e = cl.setdefault(c, dict(dirs=[], n=0, shape=table[(b, c, deg, i)]['rec']['shape']))
        if deg not in e['dirs']: e['dirs'].append(deg)
        e['n'] = max(e['n'], i + 1)
    spr = {}
    for b in builds:
        spr[b] = {}
        for c, e in cl.items():
            rows = []
            for deg in sorted(e['dirs']):
                for i in range(e['n']):
                    t = table[(b, c, deg, i)]; r = t['rec']; foot = r['foot']
                    row = ent(t, foot, keyidx.get(r['hk'], 0), round(r['head'][0], 1), round(r['head'][1], 1), round(r['num'][0], 1), round(r['num'][1], 1))
                    if r['ball']: row += [round(r['ball'][0], 1), round(r['ball'][1], 1)]
                    rows.append(row)
            spr[b][c] = rows
    hair_out = {}
    for st in STYLES:
        rows = []
        for k in keys:
            c = hair.get((st, k))
            if c is None: rows.append(None); continue
            r = c['rec']; f = r['foot']
            # the offset from the head anchor to the crop's corner, stored as an anchor of its own
            rows.append([c['page'], c['ax'], c['ay'], c['s'].shape[1], c['s'].shape[0], round(f[0] + r['head'][0] - c['x'], 1), round(f[1] + r['head'][1] - c['y'], 1)])
        hair_out[st] = rows
    man = dict(px=PX, tilt=round(TILT, 4), parts=PARTS, shapes=SHAPES, pages=files, builds={b: BUILDS[b]['b'] for b in BUILDS}, stride=dict(run=round(2*RUN['a']/RUN['f'], 3), sprint=round(2*SPRINT['a']/SPRINT['f'], 3)),
               clips={c: dict(n=e['n'], dirs=sorted(e['dirs']), shape=e['shape']) for c, e in cl.items()}, styles=STYLES, sprites=spr, hair=hair_out)
    js = json.dumps(man, separators=(',', ':'))
    open(os.path.join(OUT, 'players.json'), 'w').write(js)
    total += len(js)
    print(f'atlases {len(files)}, {len(items)} sprites, players.json {len(js)//1024} KB, total {total/1048576:.2f} MB', flush=True)
    if total > 8*1048576: raise SystemExit('Over the 8 MB hard stop: see tools/blender/build_players.py')
    return items, table, hair

# ---------- go ----------
def main():
    global MATS
    os.makedirs(WORK, exist_ok=True)
    only = opt('--bodies', None)
    todo = only.split(',') if only else (['medium.m'] if PREVIEW else BODIES)
    hair_only = opt('--hair', None)
    if hair_only:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        MATS = materials()
        hair_pass(hair_only.split(','), (opt('--hair-clips', '') or '').split(',') if opt('--hair-clips', '') else None)
    elif not REUSE:
        for b in todo:
            if PREVIEW or not os.path.exists(cache_of(b)) or flag('--force') or opt('--only', None):
                bpy.ops.wm.read_factory_settings(use_empty=True)
                MATS = materials()
                render_body(b)
            elif b == HAIR_BODY:                                       # a style appended since the kept render: just that style, so no other picture moves
                new = [st for st in STYLES if st not in (kept_styles() or set())]
                if new:
                    bpy.ops.wm.read_factory_settings(use_empty=True)
                    MATS = materials()
                    hair_pass(new)
    if flag('--render-only'): return
    bpy.ops.wm.read_factory_settings(use_empty=True)
    pack(load_renders())
    print('done', flush=True)
main()
