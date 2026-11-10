"""Lotto 5 — dettagli di vita: cartone della pizza, bicchiere di carta, cuffie, ciabatta con cavi che scendono, foglietti adesivi.
Uso: Blender -b --python tools/blender/props5.py -- <cartella_out> <preview.png>
Attenzione: box() applica la scala E la posizione nella mesh (origine nell'origine del mondo)."""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from lib import *

argv = sys.argv[sys.argv.index('--') + 1:]
OUT, PNG = argv[0], argv[1]
reset()
random.seed(11)
BLACK = mat('Plastica nera', hexc('#141518'), 0.5)
CARD = mat('Cartone pizza', hexc('#c9a878'), 0.9)
GREASE = mat('Unto', hexc('#9b7a4c'), 0.6)
PRINT = mat('Stampa rossa', hexc('#b4442e'), 0.7)
PAPERCUP = mat('Bicchiere', hexc('#efe9dc'), 0.7)
SLEEVE = mat('Fascetta', hexc('#8a6a4a'), 0.85)
LID = mat('Coperchio', hexc('#2a2c30'), 0.4)
CUSHION = mat('Imbottitura', hexc('#1b1d21'), 0.85)
METAL = mat('Metallo', hexc('#8f969c'), 0.35, 0.85)
WHITEP = mat('Plastica bianca', hexc('#e6e3dc'), 0.5)
ORANGE = mat('Interruttore', hexc('#e8823a'), 0.4, emit=hexc('#e8823a'), emit_strength=1.5)
STICKY = [mat(f'Foglietto {i}', hexc(c), 0.8) for i, c in enumerate(['#efd96e', '#f2a7a0', '#9fd3c7'])]
done = []


def ship(objs, name, x):
    bake_ao([o for o in objs if o.type == 'MESH'], distance=0.03)
    export(objs, os.path.join(OUT, f'{name}.glb'))
    for o in objs:
        o.location.x += x
    done.append(name)


# cartone della pizza, coperchio un po' sollevato (avanzi del venerdì)
def pizza():
    base = box('fondo', (0.33, 0.33, 0.035), (0, 0, 0.0175), CARD)
    inner = box('vuoto', (0.31, 0.31, 0.04), (0, 0, 0.03)); cut(base, inner)
    lid = box('coperchio', (0.335, 0.335, 0.006), (0, 0, 0), CARD)
    bpy.context.scene.cursor.location = (0, 0.165, 0.035)
    activate(lid); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    lid.location = (0, 0.165, 0.035)
    lid.rotation_euler = (math.radians(-12), 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    logo = box('logo', (0.12, 0.002, 0.05), (0, -0.168, 0.02), PRINT)
    spots = [cyl('macchia', random.uniform(0.012, 0.025), 0.002, (random.uniform(-0.12, 0.12), random.uniform(-0.12, 0.12), 0.006), material=GREASE, verts=16) for _ in range(5)]
    return [join([base, lid, logo, *spots], 'Pizza')]


# bicchiere di carta da asporto
def cup():
    prof = [(0, 0, 0), (0.028, 0, 0), (0.04, 0, 0.12), (0.042, 0, 0.122), (0, 0, 0.122)]
    me = bpy.data.meshes.new('bicchiere')
    me.from_pydata(prof, [(i, i + 1) for i in range(len(prof) - 1)], [])
    c = bpy.data.objects.new('Bicchiere', me)
    bpy.context.scene.collection.objects.link(c)
    sc = c.modifiers.new('giro', 'SCREW'); sc.steps = 32; sc.render_steps = 32
    activate(c); bpy.ops.object.modifier_apply(modifier='giro'); bpy.ops.object.shade_smooth()
    c.data.materials.append(PAPERCUP)
    sl = cyl('fascetta', 0.0375, 0.045, (0, 0, 0.07), material=SLEEVE, verts=32)
    lid = cyl('coperchio', 0.044, 0.012, (0, 0, 0.128), material=LID, verts=32)
    bevel(lid, 0.004, 2)
    return [join([c, sl, lid], 'Bicchiere')]


# cuffie appoggiate sul piano
def headphones():
    band = curve_tube('archetto', [(-0.085, 0, 0.03), (-0.08, 0.05, 0.03), (0, 0.095, 0.03), (0.08, 0.05, 0.03), (0.085, 0, 0.03)], 0.008, BLACK)
    parts = [band]
    for sx in (-1, 1):
        cup_ = cyl('padiglione', 0.042, 0.03, (sx * 0.085, -0.01, 0.03), (0, math.pi / 2, 0), BLACK, 32); bevel(cup_, 0.008, 3)
        pad = cyl('cuscinetto', 0.038, 0.016, (sx * 0.065, -0.01, 0.03), (0, math.pi / 2, 0), CUSHION, 32); bevel(pad, 0.007, 3)
        parts += [cup_, pad]
    cable = curve_tube('cavo', [(0.1, -0.02, 0.02), (0.15, -0.06, 0.004), (0.2, -0.02, 0.004), (0.26, -0.08, 0.004)], 0.0022, BLACK)
    return [join([*parts, cable], 'Cuffie')]


# ciabatta a terra con spine e cavi che salgono verso la scrivania
def powerstrip():
    st = box('ciabatta', (0.32, 0.06, 0.04), (0, 0, 0.02), WHITEP); bevel(st, 0.008, 2)
    plugs, cables = [], []
    for i in range(3):
        x = -0.1 + i * 0.07
        p = box('spina', (0.035, 0.03, 0.035), (x, 0, 0.058), BLACK); bevel(p, 0.006, 2)
        plugs.append(p)
        cables.append(curve_tube('cavo', [(x, 0, 0.075), (x, 0.03, 0.2), (x * 0.5, 0.12, 0.5), (x * 0.3, 0.18, 0.74)], 0.0035, BLACK))
    sw = box('interruttore', (0.03, 0.02, 0.008), (0.13, 0, 0.042), ORANGE)
    return [join([st, *plugs, *cables], 'Ciabatta'), sw]


# foglietti adesivi in colonna (da attaccare al bordo di un monitor)
def stickies():
    notes = []
    for i in range(3):
        bpy.ops.mesh.primitive_plane_add(size=1)
        n = bpy.context.object
        n.scale = (0.07, 0.07, 1)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        n.rotation_euler = (math.radians(90), 0, random.uniform(-0.12, 0.12))
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        n.location = (0, -0.001 * i, 0.075 * i)
        # angolo inferiore leggermente staccato
        bm = bmesh.new(); bm.from_mesh(n.data)
        for v in bm.verts:
            if v.co.z < 0 and v.co.x > 0:
                v.co.y -= 0.006
        bm.to_mesh(n.data); bm.free()
        n.data.materials.append(STICKY[i])
        notes.append(n)
    return [join(notes, 'Foglietti')]


ship(pizza(), 'pizzabox', -0.9)
ship(cup(), 'papercup', -0.45)
ship(headphones(), 'headphones', 0.0)
ship(powerstrip(), 'powerstrip', 0.5)
ship(stickies(), 'stickies', 0.95)
print('EXPORTED', done)
preview(PNG, (0.05, -1.2, 0.7), (0.05, 0, 0.1), lens=45, res=(1400, 800), samples=32)
print('OK')
