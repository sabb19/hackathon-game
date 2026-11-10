"""Lotto 1: sedia da ufficio, rack server, armadio di SANDBOX-7, tazza, porta d'uscita con lettore badge.
Uso: Blender -b --python tools/blender/props1.py -- <cartella_out> <preview.png>
Ogni oggetto ha il davanti verso -Y (diventa +Z in glTF) e la base a quota 0."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from lib import *

argv = sys.argv[sys.argv.index('--') + 1:]
OUT, PNG = argv[0], argv[1]
reset()
P = palette()
BEIGE, BEIGE_D, BLACK, METAL, LEDM = P['BEIGE'], P['BEIGE_D'], P['BLACK'], P['METAL'], P['LEDM']
FABRIC = mat('Tessuto', hexc('#2c3440'), 0.95)
CHROME = mat('Cromo', hexc('#c9ced3'), 0.18, 1.0)
RACK = mat('Rack verniciato', hexc('#1d2024'), 0.55, 0.4)
UNIT = mat('Unità server', hexc('#2b2f35'), 0.4, 0.6)
PORT = mat('Porte', hexc('#08090a'), 0.6)
STEEL_BEIGE = mat('Lamiera beige', hexc('#c2b593'), 0.45, 0.25)
CERAMIC = mat('Ceramica', hexc('#ece5d3'), 0.12)
COFFEE = mat('Caffè', hexc('#2a160b'), 0.05)
ALU = mat('Alluminio', hexc('#8d949b'), 0.35, 0.95)
GLASS = mat('Vetro', hexc('#a9c3d6'), 0.03)
GLASS.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.18
GLASS.blend_method = 'BLEND'
CABLES = [mat(f'Cavo {i}', hexc(c), 0.55) for i, c in enumerate(['#3d7bd0', '#e0c341', '#6fbf8e', '#d9644a', '#cfcfcf'])]

exported = []  # (oggetti, offset x per il render)


def ship(objs, name, x):
    bake_ao([o for o in objs if o.type == 'MESH'], distance=0.05)  # ombre nelle fessure + sporcizia
    export(objs, os.path.join(OUT, f'{name}.glb'))
    for o in objs:
        o.location.x += x
    exported.append(name)


# =============== SEDIA DA UFFICIO ===============
def chair():
    parts = []
    for i in range(5):
        a = i / 5 * math.tau
        leg = box('gamba', (0.04, 0.3, 0.035), (0, 0.15, 0.08), BLACK)
        bm = bmesh.new(); bm.from_mesh(leg.data)
        for v in bm.verts:
            if v.co.y > 0.2:
                v.co.z -= 0.025; v.co.x *= 0.8
        bm.to_mesh(leg.data); bm.free()
        bevel(leg, 0.008, 3)
        leg.rotation_euler = (0, 0, a)
        bpy.ops.object.transform_apply(rotation=True)
        parts.append(leg)
        cx, cy = math.sin(-a) * 0.29, math.cos(a) * 0.29
        w = cyl('ruota', 0.025, 0.022, (cx, cy, 0.026), (0, math.pi / 2, a), BLACK, 24)
        bevel(w, 0.005, 2)
        fork = box('forcella', (0.03, 0.03, 0.03), (cx, cy, 0.05), BLACK)
        bevel(fork, 0.006, 2)
        parts += [w, fork]
    hub = cyl('mozzo', 0.05, 0.05, (0, 0, 0.09), material=BLACK)
    bevel(hub, 0.01, 3)
    gas = cyl('pistone', 0.022, 0.26, (0, 0, 0.24), material=CHROME)
    sleeve = cyl('soffietto', 0.03, 0.12, (0, 0, 0.17), material=BLACK)
    mech = box('meccanismo', (0.26, 0.26, 0.04), (0, 0, 0.39), BLACK)
    bevel(mech, 0.01, 3)
    lever = curve_tube('leva', [(0.12, -0.05, 0.39), (0.22, -0.08, 0.38), (0.26, -0.1, 0.37)], 0.006, BLACK)
    seat = box('seduta', (0.5, 0.48, 0.09), (0, -0.01, 0.46), FABRIC)
    bm = bmesh.new(); bm.from_mesh(seat.data)
    for v in bm.verts:  # bordo anteriore arrotondato verso il basso
        if v.co.y < -0.15 and v.co.z > 0.46:
            v.co.z -= 0.015
    bm.to_mesh(seat.data); bm.free()
    bevel(seat, 0.035, 6)
    sub = seat.modifiers.new('sub', 'SUBSURF'); sub.levels = 1
    activate(seat); bpy.ops.object.modifier_apply(modifier='sub'); bpy.ops.object.shade_smooth()
    post = box('supporto', (0.06, 0.03, 0.34), (0, 0.24, 0.6), BLACK)
    bevel(post, 0.01, 3)
    back = box('schienale', (0.46, 0.07, 0.52), (0, 0.27, 0.9), FABRIC)
    bevel(back, 0.03, 6)
    bend = back.modifiers.new('curva', 'SIMPLE_DEFORM'); bend.deform_method = 'BEND'; bend.angle = math.radians(25); bend.deform_axis = 'Z'
    activate(back); bpy.ops.object.modifier_apply(modifier='curva')
    sub = back.modifiers.new('sub', 'SUBSURF'); sub.levels = 1
    bpy.ops.object.modifier_apply(modifier='sub'); bpy.ops.object.shade_smooth()
    back.rotation_euler = (math.radians(-8), 0, 0)
    arms = []
    for x in (-0.27, 0.27):
        up = box('bracciolo', (0.03, 0.03, 0.2), (x, 0.0, 0.55), BLACK)
        pad = box('appoggio', (0.06, 0.26, 0.035), (x, -0.01, 0.66), BLACK)
        bevel(up, 0.008, 2); bevel(pad, 0.015, 4)
        arms += [up, pad]
    return join([*parts, hub, gas, sleeve, mech, lever, seat, post, back, *arms], 'Sedia')


c = chair()
ship([c], 'chair', -3.2)


# =============== RACK SERVER 42U ===============
# Le righe di LED animati restano nel gioco: qui ci sono gli switch alle stesse quote (0.5 + i*0.24 m).
def rack():
    W, D, H = 0.6, 0.8, 2.0
    FRONT = -D / 2
    parts = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            p = box('montante', (0.045, 0.045, H), (sx * (W / 2 - 0.022), sy * (D / 2 - 0.022), H / 2), RACK)
            parts.append(p)
        side = box('fianco', (0.012, D - 0.06, H - 0.12), (sx * (W / 2 - 0.006), 0, H / 2), RACK)
        parts.append(side)
    top = box('tetto', (W, D, 0.05), (0, 0, H - 0.025), RACK)
    for x in (-0.12, 0.12):
        hole = cyl('ventola', 0.07, 0.2, (x, 0.1, H), material=None, verts=32)
        cut(top, hole)
    base = box('zoccolo', (W, D, 0.08), (0, 0, 0.04), RACK)
    rear = box('retro', (W - 0.04, 0.01, H - 0.1), (0, D / 2 - 0.01, H / 2), RACK)
    parts += [top, base, rear]
    # guide verticali forate (montanti 19")
    for x in (-0.24, 0.24):
        rail = box('guida', (0.02, 0.01, H - 0.12), (x, FRONT + 0.06, H / 2), METAL)
        parts.append(rail)
    units = []
    y0 = FRONT + 0.05
    # switch con 24 porte alle quote dei LED
    for r in range(6):
        z = 0.5 + r * 0.24
        sw = box('switch', (0.48, 0.3, 0.044), (0, y0 + 0.15, z), UNIT)
        bevel(sw, 0.003, 2)
        units.append(sw)
        for k in range(12):
            for row in (0, 1):
                pt = box('porta', (0.014, 0.01, 0.011), (-0.19 + k * 0.025, y0 - 0.004, z - 0.008 + row * 0.016), PORT)
                units.append(pt)
        # server 2U tra uno switch e l'altro, con i cassetti dei dischi
        if r < 5:
            zs = z + 0.12
            sv = box('server', (0.48, 0.6, 0.085), (0, y0 + 0.3, zs), BEIGE_D if r % 2 else UNIT)
            bevel(sv, 0.004, 2)
            units.append(sv)
            for d in range(8):
                bay = box('disco', (0.045, 0.006, 0.03), (-0.19 + d * 0.052, y0 - 0.003, zs + 0.012), RACK)
                units.append(bay)
            grill = box('griglia', (0.12, 0.004, 0.02), (0.13, y0 - 0.002, zs - 0.025), PORT)
            units.append(grill)
    # pannello pieno in basso
    blank = box('cieco', (0.48, 0.02, 0.3), (0, y0 + 0.01, 0.25), RACK)
    units.append(blank)
    # cavi di rete che escono dalle porte e scendono nel passacavi laterale
    cables = []
    for r in range(6):
        z = 0.5 + r * 0.24
        for k in range(0, 12, 2):
            x = -0.19 + k * 0.025
            pts = [(x, y0 - 0.01, z), (x, y0 - 0.06, z - 0.02), (0.2, y0 - 0.07, z - 0.05), (0.26, y0 - 0.05, z - 0.18)]
            cables.append(curve_tube('patch', pts, 0.0028, CABLES[(r + k) % len(CABLES)]))
    rk = join([*parts, *units, *cables], 'Rack')
    return rk


r = rack()
ship([r], 'rack', -2.0)


# =============== ARMADIO + SANDBOX-7 ===============
def cabinet():
    W, D, H = 0.95, 0.6, 1.8
    shell = box('armadio', (W, D, H), (0, 0, H / 2), STEEL_BEIGE)
    inner = box('vano', (W - 0.04, D, H - 0.06), (0, -0.03, H / 2))
    cut(shell, inner)
    bevel(shell, 0.006, 2)
    shelf = box('ripiano', (W - 0.04, D - 0.05, 0.02), (0, 0.0, 0.55), STEEL_BEIGE)
    shelf2 = box('ripiano', (W - 0.04, D - 0.05, 0.02), (0, 0.0, 1.2), STEEL_BEIGE)
    feet = [box('piede', (0.05, 0.05, 0.03), (sx * 0.4, sy * 0.25, 0.015), BLACK) for sx in (-1, 1) for sy in (-1, 1)]
    body = join([shell, shelf, shelf2, *feet], 'Armadio')
    # anta: origine sulla cerniera (bordo sinistro) per poterla aprire in gioco
    door = box('Anta', (W - 0.02, 0.02, H - 0.04), (0, -D / 2 - 0.012, H / 2), STEEL_BEIGE)
    for i in range(7):
        slot = box('feritoia', (0.3, 0.05, 0.012), (0.12, -D / 2 - 0.012, 1.45 + i * 0.03))
        cut(door, slot)
    bevel(door, 0.004, 2)
    handle = box('maniglia', (0.02, 0.03, 0.16), (W / 2 - 0.08, -D / 2 - 0.035, 0.95), CHROME)
    bevel(handle, 0.006, 3)
    lock = cyl('serratura', 0.012, 0.02, (W / 2 - 0.08, -D / 2 - 0.028, 1.06), (math.pi / 2, 0, 0), CHROME, 24)
    plate = box('portaetichetta', (0.14, 0.004, 0.05), (0, -D / 2 - 0.024, 1.6), CHROME)
    door = join([door, handle, lock, plate], 'Anta')
    bpy.context.scene.cursor.location = (-W / 2 + 0.01, -D / 2 - 0.012, 0)
    activate(door); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    # SANDBOX-7: vecchio computer da tavolo, ingiallito, sul ripiano
    pc = box('SANDBOX-7', (0.44, 0.42, 0.14), (0, -0.02, 0.63), BEIGE)
    bevel(pc, 0.008, 3)
    front = box('frontale', (0.44, 0.01, 0.13), (0, -0.235, 0.63), BEIGE_D)
    bevel(front, 0.004, 2)
    floppy = box('floppy', (0.11, 0.012, 0.012), (0.1, -0.242, 0.66), BLACK)
    floppy2 = box('floppy', (0.11, 0.012, 0.012), (0.1, -0.242, 0.62), BLACK)
    pwr = box('accensione', (0.025, 0.012, 0.02), (-0.16, -0.242, 0.6), BEIGE_D)
    sandbox = join([pc, front, floppy, floppy2, pwr], 'Sandbox')
    led = cyl('LED', 0.004, 0.006, (-0.16, -0.244, 0.655), (math.pi / 2, 0, 0), mat('LED arancio', hexc('#e8823a'), 0.3, emit=hexc('#e8823a'), emit_strength=8), 16)
    return [body, door, sandbox, led]


cab = cabinet()
ship(cab, 'cabinet', -0.7)


# =============== TAZZA ===============
def mug():
    prof = [(0, 0, 0), (0.036, 0, 0), (0.04, 0, 0.004), (0.042, 0, 0.096), (0.039, 0, 0.098), (0.037, 0, 0.012), (0, 0, 0.012)]
    me = bpy.data.meshes.new('profilo')
    me.from_pydata(prof, [(i, i + 1) for i in range(len(prof) - 1)], [])
    o = bpy.data.objects.new('Tazza', me)
    bpy.context.scene.collection.objects.link(o)
    sc = o.modifiers.new('giro', 'SCREW'); sc.steps = 48; sc.render_steps = 48
    activate(o); bpy.ops.object.modifier_apply(modifier='giro'); bpy.ops.object.shade_smooth()
    o.data.materials.append(CERAMIC)
    handle = curve_tube('manico', [(0.04, 0, 0.078), (0.072, 0, 0.074), (0.074, 0, 0.03), (0.04, 0, 0.026)], 0.007, CERAMIC)
    coffee = cyl('caffe', 0.036, 0.002, (0, 0, 0.08), material=COFFEE)
    return join([o, handle, coffee], 'Tazza')


m = mug()
ship([m], 'mug', 0.4)


# =============== PORTA A VETRI + LETTORE BADGE ===============
# Doppia porta 2 m x 3 m (con sopraluce), centrata in X=0, spessore lungo Y.
def door():
    frame = []
    for x in (-1.0, 0.0, 1.0):
        frame.append(box('montante', (0.06, 0.1, 3.0), (x, 0, 1.5), ALU))
    for z in (0.03, 2.4, 2.97):
        frame.append(box('traverso', (2.06, 0.1, 0.06), (0, 0, z), ALU))
    glass = [box('vetro', (0.94, 0.012, 2.34), (x, 0, 1.2), GLASS) for x in (-0.5, 0.5)]
    glass.append(box('sopraluce', (1.94, 0.012, 0.51), (0, 0, 2.685), GLASS))
    kick = [box('battiscopa', (0.94, 0.104, 0.25), (x, 0, 0.155), ALU) for x in (-0.5, 0.5)]
    bars = []
    for x in (-0.5, 0.5):
        bars.append(curve_tube('maniglione', [(x - 0.35, -0.06, 1.05), (x - 0.33, -0.12, 1.05), (x + 0.33, -0.12, 1.05), (x + 0.35, -0.06, 1.05)], 0.016, CHROME))
    reader = box('lettore', (0.09, 0.035, 0.14), (1.25, -0.03, 1.25), BLACK)
    bevel(reader, 0.008, 3)
    pad = box('piastra', (0.06, 0.004, 0.06), (1.25, -0.05, 1.22), mat('Piastra lettore', hexc('#2a2d31'), 0.3, 0.3))
    body = join([*frame, *kick, *bars, reader, pad], 'Porta')
    vetri = join(glass, 'Vetri')
    led = box('ReaderLED', (0.03, 0.006, 0.008), (1.25, -0.05, 1.29), LEDM)
    return [body, vetri, led]


d = door()
ship(d, 'door', 2.4)

print('EXPORTED', exported)
preview(PNG, (0.2, -6.2, 2.4), (0.1, 0, 0.9), lens=32, res=(1600, 800), samples=32)
print('OK')
