"""Lotto 2: serranda avvolgibile, distributore d'acqua, lavagna, attaccapanni con ombrello.
Uso: Blender -b --python tools/blender/props2.py -- <cartella_out> <preview.png>
Davanti verso -Y (diventa +Z in glTF), base a quota 0."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from lib import *

argv = sys.argv[sys.argv.index('--') + 1:]
OUT, PNG = argv[0], argv[1]
reset()
P = palette()
BEIGE, BEIGE_D, BLACK, METAL = P['BEIGE'], P['BEIGE_D'], P['BLACK'], P['METAL']
STEEL = mat('Acciaio zincato', hexc('#8a9096'), 0.42, 0.85)
STEEL_D = mat('Acciaio scuro', hexc('#5a5f65'), 0.5, 0.8)
ALU = mat('Alluminio', hexc('#a3aab0'), 0.3, 0.95)
WHITE = mat('Laminato bianco', hexc('#efefea'), 0.25)
WATER = mat('Boccione', hexc('#8fc0e8'), 0.05)
WATER.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.45
WATER.blend_method = 'BLEND'
WOOD = mat('Legno scuro', hexc('#4a3426'), 0.55)
RED = mat('Ombrello', hexc('#8a2f2a'), 0.6)
MARKERS = [mat(f'Pennarello {i}', hexc(c), 0.4) for i, c in enumerate(['#1d3a63', '#b4442e', '#2f6b3a', '#141518'])]
done = []


def ship(objs, name, x):
    bake_ao([o for o in objs if o.type == 'MESH'], distance=0.05)  # ombre nelle fessure + sporcizia
    export(objs, os.path.join(OUT, f'{name}.glb'))
    for o in objs:
        o.location.x += x
    done.append(name)


# =============== SERRANDA AVVOLGIBILE (2.3 x 5.6 m) ===============
# "Telo" è separato: in gioco scende lungo Z (Y in three). Guide e cassonetto restano fermi.
def shutter():
    W, H = 2.3, 3.0  # finestra da 2.3 x 3 m (soffitto a 4.2 m)
    slats = []
    n = 38
    sh = H / n
    for i in range(n):
        s = box('lamella', (W - 0.06, 0.018, sh * 0.82), (0, 0, sh * (i + 0.5)), STEEL)
        slats.append(s)
        g = box('giunto', (W - 0.06, 0.012, sh * 0.18), (0, 0.004, sh * (i + 1)), STEEL_D)
        slats.append(g)
    bottom = box('terminale', (W - 0.04, 0.05, 0.06), (0, 0, 0.03), STEEL_D)
    bevel(bottom, 0.01, 2)
    for x in (-0.4, 0.4):
        slats.append(box('maniglia', (0.12, 0.03, 0.02), (x, -0.035, 0.06), STEEL_D))
    telo = join([*slats, bottom], 'Telo')
    guides = []
    for x in (-W / 2, W / 2):
        gd = box('guida', (0.06, 0.08, H + 0.1), (x, 0, H / 2), STEEL_D)
        bevel(gd, 0.006, 2)
        guides.append(gd)
    hood = box('cassonetto', (W + 0.12, 0.38, 0.4), (0, 0.1, H + 0.25), STEEL_D)
    bevel(hood, 0.02, 3)
    frame = join([*guides, hood], 'Guide')
    return [telo, frame]


sh = shutter()
ship(sh, 'shutter', -3.4)


# =============== DISTRIBUTORE D'ACQUA ===============
def cooler():
    body = box('mobiletto', (0.32, 0.32, 1.0), (0, 0, 0.5), BEIGE)
    bevel(body, 0.02, 4)
    recess = box('vano', (0.2, 0.1, 0.18), (0, -0.16, 0.78))
    bevel(recess, 0.02, 3)
    cut(body, recess)
    grill = box('vaschetta', (0.18, 0.06, 0.012), (0, -0.14, 0.7), STEEL)
    taps = []
    for x, c in ((-0.05, '#3d7bd0'), (0.05, '#d9644a')):
        t = box('rubinetto', (0.03, 0.035, 0.035), (x, -0.165, 0.86), mat(f'rubinetto {c}', hexc(c), 0.4))
        bevel(t, 0.008, 2)
        taps.append(t)
    collar = cyl('collare', 0.12, 0.04, (0, 0, 1.02), material=BEIGE_D)
    # boccione da 19 litri (profilo ruotato)
    prof = [(0.0, 0, 1.02), (0.035, 0, 1.02), (0.04, 0, 1.06), (0.13, 0, 1.12), (0.135, 0, 1.18), (0.135, 0, 1.42), (0.13, 0, 1.47), (0.06, 0, 1.5), (0.0, 0, 1.5)]
    me = bpy.data.meshes.new('boccione')
    me.from_pydata(prof, [(i, i + 1) for i in range(len(prof) - 1)], [])
    bottle = bpy.data.objects.new('Boccione', me)
    bpy.context.scene.collection.objects.link(bottle)
    sc = bottle.modifiers.new('giro', 'SCREW'); sc.steps = 48; sc.render_steps = 48
    activate(bottle); bpy.ops.object.modifier_apply(modifier='giro'); bpy.ops.object.shade_smooth()
    bottle.data.materials.append(WATER)
    cups = cyl('bicchieri', 0.035, 0.32, (0.2, 0, 0.8), material=WHITE, verts=24)
    base = join([body, grill, *taps, collar, cups], 'Distributore')
    return [base, bottle]


co = cooler()
ship(co, 'cooler', -1.6)


# =============== LAVAGNA (2.3 x 1.2 m) ===============
# "Board" ha UV 0..1: in gioco riceve il disegno di Ada.
def whiteboard():
    W, H = 2.3, 1.2
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0))
    board = bpy.context.object
    board.name = 'Board'
    board.scale = (W - 0.04, H - 0.04, 1)
    bpy.ops.object.transform_apply(scale=True)
    board.rotation_euler = (math.radians(90), 0, 0)
    board.location = (0, -0.012, 0.9 + H / 2)
    bpy.ops.object.transform_apply(rotation=True, location=True)
    board.data.materials.append(WHITE)
    frame = []
    for z in (0.9, 0.9 + H):
        frame.append(box('telaio', (W + 0.02, 0.03, 0.03), (0, 0, z), ALU))
    for x in (-W / 2, W / 2):
        frame.append(box('telaio', (0.03, 0.03, H + 0.02), (x, 0, 0.9 + H / 2), ALU))
    back = box('fondo', (W, 0.01, H), (0, 0.006, 0.9 + H / 2), STEEL_D)
    tray = box('vaschetta', (0.8, 0.07, 0.02), (0.4, -0.04, 0.88), ALU)
    lip = box('bordo', (0.8, 0.01, 0.03), (0.4, -0.075, 0.895), ALU)
    pens = []
    for i, m in enumerate(MARKERS):
        p = cyl('pennarello', 0.008, 0.13, (0.15 + i * 0.05, -0.04, 0.9), (0, math.pi / 2, 0.15 * i), m, 16)
        pens.append(p)
    eraser = box('cancellino', (0.14, 0.05, 0.035), (0.6, -0.04, 0.905), BLACK)
    bevel(eraser, 0.008, 2)
    frm = join([*frame, back, tray, lip, *pens, eraser], 'Telaio')
    return [board, frm]


wb = whiteboard()
ship(wb, 'whiteboard', 0.4)


# =============== ATTACCAPANNI + OMBRELLO ===============
def coatrack():
    pole = cyl('palo', 0.02, 1.75, (0, 0, 0.9), material=WOOD, verts=24)
    feet = []
    for i in range(4):
        a = i * math.pi / 2
        f = box('piede', (0.04, 0.32, 0.03), (0, 0.15, 0.03), WOOD)
        bevel(f, 0.01, 2)
        f.rotation_euler = (0, 0, a)
        activate(f); bpy.ops.object.transform_apply(rotation=True)
        feet.append(f)
    hooks = []
    for i in range(6):
        a = i * math.tau / 6
        d = (math.cos(a), math.sin(a))
        hooks.append(curve_tube('gancio', [(0, 0, 1.68), (d[0] * 0.12, d[1] * 0.12, 1.72), (d[0] * 0.17, d[1] * 0.17, 1.8)], 0.009, WOOD))
    knob = cyl('pomello', 0.03, 0.04, (0, 0, 1.8), material=WOOD, verts=24)
    rack = join([pole, *feet, *hooks, knob], 'Attaccapanni')
    # ombrello chiuso appoggiato
    bpy.ops.mesh.primitive_cone_add(radius1=0.05, radius2=0.012, depth=0.75, vertices=8, location=(0.28, -0.1, 0.45))
    canopy = bpy.context.object
    canopy.data.materials.append(RED)
    shaft = cyl('asta', 0.006, 0.95, (0.28, -0.1, 0.48), material=BLACK, verts=12)
    handle = curve_tube('manico', [(0.28, -0.1, 0.95), (0.28, -0.1, 1.0), (0.33, -0.1, 1.02), (0.36, -0.1, 0.98)], 0.012, WOOD)
    umb = join([canopy, shaft, handle], 'Ombrello')
    umb.rotation_euler = (0, math.radians(-12), 0)
    return [rack, umb]


cr = coatrack()
ship(cr, 'coatrack', 2.4)

print('EXPORTED', done)
preview(PNG, (-0.3, -7.5, 3.0), (-0.3, 0, 1.6), lens=30, res=(1600, 900), samples=32)
print('OK')
