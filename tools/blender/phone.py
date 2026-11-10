"""Modella un computer CRT beige anni '90 (monitor, tastiera, mouse) in Blender.
Uso: Blender -b --python crt.py -- <out.glb> <preview.png>
Davanti del monitor verso -Y (diventa +Z in glTF)."""
import bpy, bmesh, sys, math
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
OUT_GLB, OUT_PNG = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene


# ---------- utilità ----------
def mat(name, color, rough=0.5, metal=0.0, emit=None, emit_strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = emit_strength
    return m


def hexc(h):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb)


BEIGE = mat('Plastica beige', hexc('#cbbd98'), 0.55)
BEIGE_D = mat('Plastica beige scura', hexc('#ab9c78'), 0.6)
KEYCAP = mat('Tasti', hexc('#ddd2b4'), 0.45)
BLACK = mat('Plastica nera', hexc('#141518'), 0.5)
MASK = mat('Maschera schermo', hexc('#0b0c0d'), 0.35)
SCREEN = mat('Schermo', hexc('#14243a'), 0.2, emit=hexc('#2c4f7a'), emit_strength=1.5)
LEDM = mat('LED', hexc('#6fbf8e'), 0.3, emit=hexc('#6fbf8e'), emit_strength=6)
METAL = mat('Metallo', hexc('#9aa0a6'), 0.3, 0.9)


def activate(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o


def box(name, size, loc, material=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if material:
        o.data.materials.append(material)
    return o


def cyl(name, r, depth, loc, rot=(0, 0, 0), material=None, verts=48):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.object
    o.name = name
    if material:
        o.data.materials.append(material)
    return o


def bevel(o, width, segs=4, limit='ANGLE'):
    m = o.modifiers.new('bevel', 'BEVEL')
    m.width = width
    m.segments = segs
    m.limit_method = limit
    m.harden_normals = True
    activate(o)
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))


def cut(o, cutter):
    m = o.modifiers.new('cut', 'BOOLEAN')
    m.operation = 'DIFFERENCE'
    m.object = cutter
    m.solver = 'EXACT'
    activate(o)
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = name
    return o



# ---------- telefono da ufficio anni '90 ----------
GREY = mat('Plastica grigia', hexc('#3a3d42'), 0.5)
LCD = mat('Display', hexc('#7d8a62'), 0.4, emit=hexc('#9fb37a'), emit_strength=0.4)

# base a cuneo: il piano dei tasti è inclinato verso chi usa il telefono
base = box('Base', (0.21, 0.22, 0.07), (0, 0, 0.035), BEIGE)
bm = bmesh.new(); bm.from_mesh(base.data)
for v in bm.verts:
    if v.co.y < 0 and v.co.z > 0.03:
        v.co.z = 0.032   # davanti più basso
bm.to_mesh(base.data); bm.free()
bevel(base, 0.012, 4)

# incavo della cornetta sul lato sinistro
cradle = box('incavo', (0.07, 0.24, 0.03), (-0.07, 0.0, 0.075))
bevel(cradle, 0.01, 3)
cut(base, cradle)

# tastierino 3x4 + tasti funzione
keys = []
tilt = math.atan2(0.07 - 0.032, 0.22)
def on_slope(x, y, h=0.007):
    z = 0.032 + (y + 0.11) / 0.22 * (0.07 - 0.032) + h / 2 - 0.001
    return (x, y, z)
for r in range(4):
    for c in range(3):
        k = box('tasto', (0.026, 0.02, 0.008), on_slope(0.0 + c * 0.032, 0.03 - r * 0.027), KEYCAP)
        keys.append(k)
for r in range(4):
    k = box('funz', (0.022, 0.016, 0.007), on_slope(0.088, 0.03 - r * 0.027), BEIGE_D)
    keys.append(k)
keypad = join(keys, 'Tastierino')
bevel(keypad, 0.003, 3)

# display
lcd = box('Display', (0.07, 0.022, 0.003), on_slope(0.03, 0.075), LCD)
lcd.rotation_euler = (tilt, 0, 0)
frame = box('cornice_lcd', (0.08, 0.03, 0.004), on_slope(0.03, 0.075, 0.002), GREY)
frame.rotation_euler = (tilt, 0, 0)
led = cyl('LED', 0.003, 0.004, on_slope(0.085, 0.078), (0, 0, 0), LEDM, 16)

# cornetta: impugnatura + capsule con curva
def handset():
    parts = []
    grip = box('impugnatura', (0.045, 0.2, 0.03), (0, 0, 0.0), BEIGE)
    bevel(grip, 0.013, 5)
    parts.append(grip)
    for y in (-0.09, 0.09):
        cap = box('capsula', (0.055, 0.065, 0.04), (0, y, -0.012), BEIGE)
        bevel(cap, 0.018, 5)
        parts.append(cap)
    h = join(parts, 'Cornetta')
    return h
hs = handset()
hs.location = (-0.07, 0.0, 0.085)

# cavo a spirale
curve = bpy.data.curves.new('spirale', 'CURVE'); curve.dimensions = '3D'
sp = curve.splines.new('POLY')
N = 260
sp.points.add(N - 1)
for i in range(N):
    t = i / (N - 1)
    a = t * 70
    x = -0.105 - 0.03 * t + 0.007 * math.cos(a)
    y = -0.1 - 0.12 * math.sin(t * 2.2)
    z = 0.012 + 0.007 * math.sin(a) + 0.05 * (1 - t) ** 3
    sp.points[i].co = (x, y + 0.02 * t, z, 1)
curve.bevel_depth = 0.0022
coil = bpy.data.objects.new('Cavo', curve); scn.collection.objects.link(coil)
activate(coil); bpy.ops.object.convert(target='MESH'); coil.data.materials.append(BEIGE_D)

phone = join([base, keypad, lcd, frame, hs, coil], 'Telefono')
phone_objs = [phone, led]

import os as _os; sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from lib import bake_ao, wire_ao
bake_ao([phone], distance=0.04)
wire_ao(phone_objs)
bpy.ops.object.select_all(action='DESELECT')
for o in phone_objs: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
# ---------- render di anteprima ----------
bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0, 0))
desk = bpy.context.object
desk.data.materials.append(mat('Scrivania', hexc('#6f7276'), 0.6, 0.3))
world = bpy.data.worlds.new('w')
scn.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.012, 0.014, 0.02, 1)
for name, loc, energy, color, size in [('key', (-0.9, -1.0, 1.1), 90, (1.0, 0.78, 0.55), 0.6), ('fill', (1.2, -0.6, 0.7), 25, (0.6, 0.7, 1.0), 1.0), ('rim', (0.3, 1.0, 1.0), 40, (0.7, 0.8, 1.0), 0.8)]:
    ld = bpy.data.lights.new(name, 'AREA')
    ld.energy = energy
    ld.color = color
    ld.size = size
    lo = bpy.data.objects.new(name, ld)
    lo.location = loc
    lo.rotation_euler = (Vector((0, 0, 0.3)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    scn.collection.objects.link(lo)
cam_d = bpy.data.cameras.new('cam')
cam_d.lens = 50
cam = bpy.data.objects.new('cam', cam_d)
cam.location = (0.32, -0.42, 0.33)
cam.rotation_euler = (Vector((-0.02, 0, 0.04)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
scn.collection.objects.link(cam)
scn.camera = cam
scn.render.engine = 'CYCLES'
scn.cycles.device = 'CPU'
scn.cycles.samples = 48
scn.cycles.use_denoising = True
scn.render.resolution_x, scn.render.resolution_y = 1200, 800
scn.view_settings.view_transform = 'AgX'
scn.render.filepath = OUT_PNG
bpy.ops.render.render(write_still=True)
print('OK', OUT_GLB, OUT_PNG)
