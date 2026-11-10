"""Lotto 4: stampante multifunzione, angolo caffè (mobile + macchina + frigo), tavolo riunioni, schermo, bacheca, scatolone di Ada.
Uso: Blender -b --python tools/blender/props4.py -- <cartella_out> <preview.png>
Davanti verso -Y (diventa +Z in glTF), base a quota 0. Ombre nelle fessure calcolate (AO nei vertici)."""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from lib import *

argv = sys.argv[sys.argv.index('--') + 1:]
OUT, PNG = argv[0], argv[1]
reset()
random.seed(3)
P = palette()
BLACK = P['BLACK']
LIGHTGREY = mat('Plastica grigio chiaro', hexc('#cfd0cc'), 0.5)
MIDGREY = mat('Plastica grigia', hexc('#7d8187'), 0.5)
DARKGREY = mat('Plastica antracite', hexc('#33363b'), 0.5)
STEEL = mat('Acciaio satinato', hexc('#a7adb3'), 0.32, 0.9)
LAMINATE = mat('Laminato', hexc('#d7d2c6'), 0.45)
WOOD = mat('Rovere', hexc('#8a6a4a'), 0.55)
CORK = mat('Sughero', hexc('#a87b52'), 0.95)
CARDBOARD = mat('Cartone', hexc('#b08a5c'), 0.9)
TAPE = mat('Nastro', hexc('#c9b07a'), 0.4)
SCREENM = mat('Schermo', hexc('#0b0d10'), 0.15)
LCD = mat('Display stampante', hexc('#2b4a6b'), 0.3, emit=hexc('#5f86b3'), emit_strength=1.2)
PAPER = mat('Carta', hexc('#efede6'), 0.85)
LEDG = P['LEDM']
done = []


def ship(objs, name, x, ao=True):
    meshes = [o for o in objs if o.type == 'MESH']
    if ao:
        bake_ao(meshes, distance=0.06)
    export(objs, os.path.join(OUT, f'{name}.glb'))
    for o in objs:
        o.location.x += x
    done.append(name)


# =============== STAMPANTE MULTIFUNZIONE ===============
def copier():
    base = box('mobiletto', (0.6, 0.6, 0.55), (0, 0, 0.275), MIDGREY); bevel(base, 0.01, 3)
    for i in range(2):  # cassetti carta
        d = box('cassetto', (0.56, 0.02, 0.2), (0, -0.305, 0.13 + i * 0.22), LIGHTGREY); bevel(d, 0.006, 2)
        h = box('maniglia', (0.2, 0.02, 0.02), (0, -0.32, 0.2 + i * 0.22), DARKGREY)
        base = join([base, d, h], 'base')
    body = box('corpo', (0.58, 0.55, 0.42), (0, 0.02, 0.76), LIGHTGREY); bevel(body, 0.02, 4)
    slot = box('uscita', (0.42, 0.3, 0.06), (0, -0.12, 0.83)); cut(body, slot)
    tray = box('vassoio', (0.4, 0.25, 0.01), (0, -0.13, 0.805), MIDGREY)
    sheets = box('fogli', (0.3, 0.21, 0.012), (0, -0.14, 0.817), PAPER)
    scanner = box('scanner', (0.58, 0.5, 0.09), (0, 0.04, 1.02), LIGHTGREY); bevel(scanner, 0.015, 3)
    adf = box('alimentatore', (0.42, 0.36, 0.06), (0, 0.06, 1.09), MIDGREY); bevel(adf, 0.012, 3)
    panel = box('pannello', (0.32, 0.14, 0.05), (0.08, -0.3, 1.0), DARKGREY); bevel(panel, 0.01, 3)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0.06, -0.335, 1.015))
    lcd = bpy.context.object; lcd.name = 'Display'; lcd.scale = (0.18, 0.08, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)  # solo la scala
    lcd.rotation_euler = (math.radians(65), 0, 0)
    bpy.ops.object.transform_apply(rotation=True, location=False)
    lcd.data.materials.append(LCD)
    keys = [box('tasto', (0.018, 0.012, 0.008), (0.19 + (i % 2) * 0.025, -0.33 + (i // 2) * 0.03, 1.02 + (i // 2) * 0.012), LIGHTGREY) for i in range(6)]
    c = join([base, body, tray, sheets, scanner, adf, panel, *keys], 'Stampante')
    return [c, lcd]


ship(copier(), 'copier', -3.6)


# =============== ANGOLO CAFFÈ: mobile con lavello, macchina, frigorifero ===============
def kitchen():
    W = 1.8
    cab = box('basi', (W, 0.6, 0.86), (0, 0, 0.43), LAMINATE); bevel(cab, 0.005, 2)
    doors = []
    for i in range(3):
        d = box('anta', (W / 3 - 0.02, 0.02, 0.76), (-W / 2 + W / 6 + i * W / 3, -0.305, 0.46), LAMINATE); bevel(d, 0.004, 2)
        h = box('maniglia', (0.012, 0.02, 0.14), (-W / 2 + W / 6 + i * W / 3 + 0.22, -0.325, 0.7), STEEL)
        doors += [d, h]
    plinth = box('zoccolo', (W, 0.55, 0.08), (0, 0.02, 0.04), DARKGREY)
    top = box('piano', (W + 0.02, 0.64, 0.035), (0, -0.01, 0.88), WOOD); bevel(top, 0.004, 2)
    sink = box('vasca', (0.42, 0.36, 0.15), (0.45, 0.0, 0.85)); cut(top, sink)
    basin = box('lavello', (0.44, 0.38, 0.02), (0.45, 0.0, 0.78), STEEL)
    tap = curve_tube('rubinetto', [(0.45, 0.22, 0.9), (0.45, 0.22, 1.12), (0.45, 0.1, 1.15), (0.45, 0.05, 1.08)], 0.012, STEEL)
    # macchina del caffè da ufficio
    mach = box('macchina', (0.36, 0.42, 0.48), (-0.45, 0.02, 1.14), DARKGREY); bevel(mach, 0.02, 4)
    face = box('frontale', (0.3, 0.02, 0.2), (-0.45, -0.2, 1.24), STEEL); bevel(face, 0.005, 2)
    nozzle = box('erogatore', (0.06, 0.06, 0.04), (-0.45, -0.17, 1.06), STEEL)
    drip = box('griglia', (0.22, 0.14, 0.015), (-0.45, -0.14, 0.905), STEEL)
    btns = [cyl('pulsante', 0.012, 0.01, (-0.52 + i * 0.035, -0.21, 1.3), (math.pi / 2, 0, 0), BLACK, 16) for i in range(4)]
    kettle = cyl('bollitore', 0.075, 0.2, (0.05, 0.05, 1.0), material=STEEL, verts=32); bevel(kettle, 0.015, 3)
    cups = [cyl('tazzina', 0.035, 0.06, (0.0 + i * 0.09, -0.18, 0.93), material=LIGHTGREY, verts=20) for i in range(3)]
    k = join([cab, *doors, plinth, top, basin, tap, mach, face, nozzle, drip, *btns, kettle, *cups], 'AngoloCaffe')
    # frigorifero sottopiano accanto
    fr = box('frigo', (0.6, 0.6, 0.86), (W / 2 + 0.32, 0, 0.43), LIGHTGREY); bevel(fr, 0.01, 3)
    frh = box('maniglia', (0.02, 0.03, 0.5), (W / 2 + 0.58, -0.32, 0.5), STEEL)
    fridge = join([fr, frh], 'Frigo')
    bpy.ops.mesh.primitive_plane_add(size=1, location=(-0.45, -0.212, 1.42))
    sign = bpy.context.object; sign.name = 'CartelloGuasta'; sign.scale = (0.2, 0.08, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)  # solo la scala
    sign.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True, location=False)
    sign.data.materials.append(PAPER)
    return [k, fridge, sign]


ship(kitchen(), 'kitchen', -1.6)


# =============== TAVOLO RIUNIONI + SCHERMO A PARETE ===============
def meeting():
    L, D = 2.4, 1.1
    top = box('piano', (L, D, 0.04), (0, 0, 0.74), WOOD)
    bm = bmesh.new(); bm.from_mesh(top.data)
    for v in bm.verts:  # angoli arrotondati: piano a "botte"
        v.co.y *= 1 - 0.18 * (v.co.x / (L / 2)) ** 2
    bm.to_mesh(top.data); bm.free()
    bevel(top, 0.012, 3)
    legs = []
    for x in (-0.8, 0.8):
        leg = box('gamba', (0.08, 0.6, 0.7), (x, 0, 0.36), STEEL); bevel(leg, 0.01, 2)
        foot = box('piede', (0.1, 0.8, 0.03), (x, 0, 0.015), STEEL); bevel(foot, 0.01, 2)
        legs += [leg, foot]
    box_ = box('presa', (0.24, 0.12, 0.03), (0, 0, 0.77), DARKGREY); bevel(box_, 0.008, 2)
    t = join([top, *legs, box_], 'TavoloRiunioni')
    # schermo a parete (TV)
    tv = box('tv', (1.6, 0.05, 0.92), (0, 0, 1.6), BLACK); bevel(tv, 0.008, 2)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -0.026, 1.6))
    scr = bpy.context.object; scr.name = 'TvScreen'; scr.scale = (1.54, 0.86, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)  # solo la scala
    scr.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True, location=False)
    scr.data.materials.append(SCREENM)
    tvo = join([tv], 'Tv')
    return [t], [tvo, scr]


tbl, tv = meeting()
ship(tbl, 'meetingtable', 0.6)
ship(tv, 'tv', 0.6, ao=False)
for o in tv:
    o.location.y += 1.5


# =============== BACHECA DI SUGHERO (1.2 x 0.9) ===============
def board():
    frame = box('cornice', (1.24, 0.03, 0.94), (0, 0.0, 1.5), WOOD); bevel(frame, 0.008, 2)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -0.016, 1.5))
    cork = bpy.context.object; cork.name = 'Cork'; cork.scale = (1.16, 0.86, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)  # solo la scala
    cork.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True, location=False)
    cork.data.materials.append(CORK)
    return [frame, cork]


ship(board(), 'board', 2.4)


# =============== SCATOLONE DI ADA ===============
def ada_box():
    W, D, H = 0.55, 0.4, 0.38
    b = box('scatola', (W, D, H), (0, 0, H / 2), CARDBOARD)
    inner = box('vuoto', (W - 0.02, D - 0.02, H), (0, 0, H / 2 + 0.02)); cut(b, inner)
    flaps = []
    for sy in (-1, 1):  # alette aperte sui lati lunghi, inclinate verso l'esterno
        f = box('aletta', (W - 0.01, 0.005, 0.19), (0, sy * (D / 2 + 0.035), H + 0.085), CARDBOARD)
        f.rotation_euler = (sy * math.radians(-22), 0, 0)
        flaps.append(f)
    tape = box('nastro', (0.05, D + 0.004, 0.004), (0, 0, H - 0.01), TAPE)
    # dentro: raccoglitori e una cornice girata
    stuff = [box('raccoglitore', (0.06, 0.3, 0.3), (-0.18 + i * 0.07, 0.0, 0.17), mat(f'racc{i}', hexc(c), 0.6)) for i, c in enumerate(['#2B4A6B', '#8a2f2a', '#3d5a3a'])]
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0.1, -D / 2 - 0.002, H * 0.55))
    lab = bpy.context.object; lab.name = 'Etichetta'; lab.scale = (0.3, 0.12, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)  # solo la scala
    lab.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True, location=False)
    lab.data.materials.append(PAPER)
    return [join([b, *flaps, tape, *stuff], 'Scatolone'), lab]


ship(ada_box(), 'adabox', 3.6)

print('EXPORTED', done)
preview(PNG, (0.2, -6.5, 2.6), (0.2, 0, 0.9), lens=30, res=(1600, 900), samples=32)
print('OK')
