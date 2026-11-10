"""Lotto 3: divisorio cubicolo, ringhiera del soppalco, scala con catena, pianta secca, targhetta di Ada.
Uso: Blender -b --python tools/blender/props3.py -- <cartella_out> <preview.png>
Davanti verso -Y (diventa +Z in glTF), base a quota 0."""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from lib import *

argv = sys.argv[sys.argv.index('--') + 1:]
OUT, PNG = argv[0], argv[1]
reset()
random.seed(7)
P = palette()
BLACK = P['BLACK']
FELT = mat('Feltro divisorio', hexc('#6b6f68'), 0.95)
ALU = mat('Alluminio', hexc('#a3aab0'), 0.3, 0.9)
STEEL = mat('Acciaio verniciato', hexc('#2e3236'), 0.45, 0.6)
CONCRETE = mat('Cemento', hexc('#6d6f72'), 0.9)
TERRACOTTA = mat('Terracotta', hexc('#9a5a3c'), 0.85)
SOIL = mat('Terriccio', hexc('#2a2019'), 1.0)
DRY = mat('Foglie secche', hexc('#7a6236'), 0.9)
DRY2 = mat('Steli secchi', hexc('#5b4a2a'), 0.9)
ACRYL = mat('Plexiglass', hexc('#dfe6ea'), 0.08)
ACRYL.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.55
ACRYL.blend_method = 'BLEND'
INK = mat('Lettere', hexc('#1a1b1d'), 0.4)
CHAIN = mat('Catena', hexc('#c9b54a'), 0.35, 0.8)
SIGN = mat('Cartello', hexc('#e8e2d2'), 0.6)
done = []


def ship(objs, name, x):
    bake_ao([o for o in objs if o.type == 'MESH'], distance=0.05)  # ombre nelle fessure + sporcizia
    export(objs, os.path.join(OUT, f'{name}.glb'))
    for o in objs:
        o.location.x += x
    done.append(name)


# =============== DIVISORIO CUBICOLO (2.0 x 1.7 m) ===============
def partition():
    W, H = 2.0, 1.7
    panel = box('pannello', (W - 0.06, 0.045, H - 0.12), (0, 0, 0.06 + (H - 0.12) / 2), FELT)
    bevel(panel, 0.006, 2)
    frame = []
    for x in (-W / 2, W / 2):
        frame.append(box('montante', (0.03, 0.055, H - 0.04), (x, 0, (H - 0.04) / 2 + 0.04), ALU))
    frame.append(box('cimasa', (W + 0.02, 0.06, 0.03), (0, 0, H), ALU))
    frame.append(box('zoccolo', (W - 0.04, 0.05, 0.06), (0, 0, 0.07), ALU))
    for x in (-W / 2, W / 2):
        f = box('piede', (0.05, 0.4, 0.03), (x, 0, 0.015), ALU)
        bevel(f, 0.008, 2)
        frame.append(f)
    for f in frame:
        bevel(f, 0.004, 2)
    return [join([panel, *frame], 'Divisorio')]


ship(partition(), 'partition', -4.0)


# =============== RINGHIERA DEL SOPPALCO (modulo da 4 m) ===============
def railing():
    L = 4.0
    parts = []
    for i in range(5):
        x = -L / 2 + i * L / 4
        parts.append(box('montante', (0.05, 0.05, 1.05), (x, 0, 0.525), STEEL))
    top = curve_tube('corrimano', [(-L / 2, 0, 1.06), (L / 2, 0, 1.06)], 0.025, STEEL, poly=True)
    for z in (0.35, 0.7):
        parts.append(curve_tube('traverso', [(-L / 2, 0, z), (L / 2, 0, z)], 0.012, STEEL, poly=True))
    parts.append(box('battipiede', (L, 0.012, 0.12), (0, 0.01, 0.06), STEEL))
    for p in parts[:5]:
        bevel(p, 0.008, 2)
    return [join([*parts, top], 'Ringhiera')]


ship(railing(), 'railing', -1.4)


# =============== SCALA CON CATENA (12 gradini, 3.6 m di salita) ===============
def stairs():
    steps = []
    N, RISE, RUN, WIDTH = 12, 0.29, 0.28, 1.6
    for i in range(N):
        s = box('gradino', (WIDTH, RUN + 0.02, RISE), (0, i * RUN + RUN / 2, i * RISE + RISE / 2), CONCRETE)
        steps.append(s)
    stringer = box('cosciale', (0.14, N * RUN, N * RISE), (WIDTH / 2 + 0.07, N * RUN / 2, N * RISE / 2), CONCRETE)
    bm = bmesh.new(); bm.from_mesh(stringer.data)
    for v in bm.verts:  # taglio a sega: il cosciale segue la pendenza
        if v.co.z > 0 and v.co.y < N * RUN / 2:
            v.co.z = 0.35
    bm.to_mesh(stringer.data); bm.free()
    body = join([*steps, stringer], 'Scala')
    bevel(body, 0.01, 2)
    # corrimano inclinato con montanti
    rail = []
    for i in range(0, N + 1, 3):
        y, z = i * RUN, i * RISE
        rail.append(box('montante', (0.04, 0.04, 0.95), (-WIDTH / 2 + 0.06, y, z + 0.475), STEEL))
    rail.append(curve_tube('corrimano', [(-WIDTH / 2 + 0.06, 0, 0.95), (-WIDTH / 2 + 0.06, N * RUN, N * RISE + 0.95)], 0.022, STEEL, poly=True))
    handrail = join(rail, 'Corrimano')
    # paletti e catena con cartello "chiuso" al primo gradino
    posts = []
    for x in (-WIDTH / 2 - 0.15, WIDTH / 2 + 0.25):
        pst = cyl('paletto', 0.025, 0.9, (x, -0.35, 0.45), material=STEEL, verts=20)
        base = cyl('base', 0.12, 0.03, (x, -0.35, 0.015), material=STEEL, verts=32)
        top = cyl('pomolo', 0.03, 0.03, (x, -0.35, 0.91), material=STEEL, verts=20)
        posts += [pst, base, top]
    links = []
    x0, x1 = -WIDTH / 2 - 0.15, WIDTH / 2 + 0.25
    n = 24
    for i in range(n + 1):
        t = i / n
        x = x0 + (x1 - x0) * t
        z = 0.82 - 0.22 * (1 - (2 * t - 1) ** 2)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.025, minor_radius=0.006, location=(x, -0.35, z), rotation=(0, math.pi / 2 if i % 2 else 0, math.pi / 2))
        l = bpy.context.object
        l.data.materials.append(CHAIN)
        links.append(l)
    posts_obj = join([*posts, *links], 'Catena')
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -0.36, 0.5))
    sign = bpy.context.object
    sign.name = 'Cartello'
    sign.scale = (0.42, 0.2, 1)
    bpy.ops.object.transform_apply(scale=True)
    sign.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    sign.data.materials.append(SIGN)
    return [body, handrail, posts_obj, sign]


ship(stairs(), 'stairs', 1.6)


# =============== PIANTA SECCA IN VASO ===============
def dead_plant():
    prof = [(0, 0, 0), (0.06, 0, 0), (0.075, 0, 0.12), (0.082, 0, 0.13), (0.076, 0, 0.13), (0.066, 0, 0.015), (0, 0, 0.015)]
    me = bpy.data.meshes.new('vaso')
    me.from_pydata(prof, [(i, i + 1) for i in range(len(prof) - 1)], [])
    pot = bpy.data.objects.new('Vaso', me)
    bpy.context.scene.collection.objects.link(pot)
    sc = pot.modifiers.new('giro', 'SCREW'); sc.steps = 40; sc.render_steps = 40
    activate(pot); bpy.ops.object.modifier_apply(modifier='giro'); bpy.ops.object.shade_smooth()
    pot.data.materials.append(TERRACOTTA)
    soil = cyl('terra', 0.07, 0.01, (0, 0, 0.11), material=SOIL, verts=32)
    parts = [pot, soil]
    for i in range(7):
        a = i / 7 * math.tau + random.uniform(-0.3, 0.3)
        lean = random.uniform(0.15, 0.6)
        hgt = random.uniform(0.18, 0.32)
        tip = (math.cos(a) * lean * hgt, math.sin(a) * lean * hgt, 0.11 + hgt)
        mid = (tip[0] * 0.4, tip[1] * 0.4, 0.11 + hgt * 0.65)
        droop = (tip[0] * 1.2, tip[1] * 1.2, tip[2] - random.uniform(0.04, 0.1))
        parts.append(curve_tube('stelo', [(0, 0, 0.11), mid, tip, droop], 0.0025, DRY2))
        for k in range(2):
            bpy.ops.mesh.primitive_plane_add(size=0.03, location=(mid[0] + random.uniform(-0.02, 0.02), mid[1] + random.uniform(-0.02, 0.02), mid[2] + k * 0.04))
            leaf = bpy.context.object
            leaf.rotation_euler = (random.uniform(0.5, 1.4), random.uniform(-0.5, 0.5), a)
            leaf.scale = (0.5, 1.4, 1)
            leaf.data.materials.append(DRY)
            parts.append(leaf)
    # foglie cadute sulla scrivania
    for k in range(5):
        ang = random.uniform(0, math.tau); rad = random.uniform(0.09, 0.13)  # vicino al vaso, mai oltre il bordo
        bpy.ops.mesh.primitive_plane_add(size=0.03, location=(math.cos(ang) * rad, math.sin(ang) * rad, 0.0015))
        leaf = bpy.context.object
        leaf.rotation_euler = (0, 0, random.uniform(0, math.tau))
        leaf.scale = (0.5, 1.3, 1)
        leaf.data.materials.append(DRY)
        parts.append(leaf)
    return [join(parts, 'PiantaSecca')]


ship(dead_plant(), 'deadplant', 3.2)


# =============== TARGHETTA IN PLEXIGLASS ===============
def nameplate():
    base = box('base', (0.22, 0.05, 0.012), (0, 0, 0.006), BLACK)
    bevel(base, 0.003, 2)
    slab = box('lastra', (0.2, 0.008, 0.06), (0, -0.005, 0.042), ACRYL)
    slab.rotation_euler = (math.radians(-12), 0, 0)
    bpy.ops.object.text_add(location=(0, -0.012, 0.035), rotation=(math.radians(78), 0, 0))
    t = bpy.context.object
    t.data.body = 'A. FERRI'
    t.data.align_x = 'CENTER'
    t.data.size = 0.022
    t.data.extrude = 0.0008
    bpy.ops.object.convert(target='MESH')
    t.data.materials.append(INK)
    return [join([base, t], 'Targhetta'), slab]


ship(nameplate(), 'nameplate', 3.8)

print('EXPORTED', done)
preview(PNG, (0.0, -6.8, 2.8), (0.0, 0, 1.0), lens=30, res=(1600, 900), samples=32)
print('OK')
