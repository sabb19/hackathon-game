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


# ---------- monitor ----------
CZ = 0.30  # centro verticale del guscio
FRONT_Y = -0.18

# guscio frontale con apertura dello schermo
bezel = box('Cornice', (0.40, 0.065, 0.37), (0, FRONT_Y + 0.0325, CZ), BEIGE)
bevel(bezel, 0.014, 5)
hole = box('foro', (0.312, 0.2, 0.236), (0, FRONT_Y, CZ + 0.012))
bevel(hole, 0.018, 4)
cut(bezel, hole)
# smusso interno: secondo taglio leggermente più grande, poco profondo
chamfer = box('smusso', (0.33, 0.012, 0.254), (0, FRONT_Y - 0.002, CZ + 0.012))
bevel(chamfer, 0.022, 4)
cut(bezel, chamfer)

# corpo posteriore rastremato
body = box('Corpo', (0.38, 0.34, 0.35), (0, FRONT_Y + 0.065 + 0.17, CZ + 0.005), BEIGE_D)
bm = bmesh.new()
bm.from_mesh(body.data)
cy = FRONT_Y + 0.065 + 0.17
for v in bm.verts:
    if v.co.y > cy:
        v.co.x *= 0.64
        v.co.z = CZ + 0.02 + (v.co.z - CZ) * 0.66
bm.to_mesh(body.data)
bm.free()
bevel(body, 0.02, 4)
# prese d'aria sul dorso
for i in range(11):
    slot = box('presa', (0.012, 0.16, 0.05), (-0.1 + i * 0.02, cy + 0.04, CZ + 0.2))
    bevel(slot, 0.004, 2)
    cut(body, slot)

# maschera scura + schermo bombato (UV 0..1 per proiettarci RELAY nel gioco)
mask = box('Maschera', (0.33, 0.01, 0.255), (0, FRONT_Y + 0.03, CZ + 0.012), MASK)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0))
scr = bpy.context.object
scr.name = 'Screen'
scr.scale = (0.30, 0.225, 1)
bpy.ops.object.transform_apply(scale=True)
bm = bmesh.new()
bm.from_mesh(scr.data)
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=20, use_grid_fill=True)
for v in bm.verts:
    x, y = v.co.x / 0.15, v.co.y / 0.1125
    v.co.z = 0.009 * (1 - 0.5 * (x * x + y * y))
bm.to_mesh(scr.data)
bm.free()
scr.rotation_euler = (math.radians(90), 0, 0)
scr.location = (0, FRONT_Y + 0.022, CZ + 0.012)
bpy.ops.object.transform_apply(rotation=True, location=True)
bpy.ops.object.shade_smooth()
scr.data.materials.append(SCREEN)

# fascia inferiore: marchio, manopole, pulsante, LED
bz = CZ - 0.16
bpy.ops.object.text_add(location=(-0.17, FRONT_Y - 0.002, bz - 0.006), rotation=(math.radians(90), 0, 0))
txt = bpy.context.object
txt.data.body = 'HALDEN'
txt.data.align_x = 'LEFT'
txt.data.size = 0.018
txt.data.extrude = 0.001
txt.data.space_character = 1.15
bpy.ops.object.convert(target='MESH')
txt.name = 'Marchio'
txt.data.materials.append(BEIGE_D)
knobs = []
for x in (0.055, 0.085):
    k = cyl('Manopola', 0.008, 0.012, (x, FRONT_Y - 0.004, bz), (math.radians(90), 0, 0), BEIGE_D, 24)
    bevel(k, 0.002, 2)
    knobs.append(k)
btn = box('Pulsante', (0.034, 0.012, 0.018), (0.135, FRONT_Y - 0.002, bz), BEIGE_D)
bevel(btn, 0.004, 3)
led = cyl('LED', 0.0035, 0.004, (0.165, FRONT_Y - 0.002, bz), (math.radians(90), 0, 0), LEDM, 16)

# piedistallo orientabile
neck = cyl('Collo', 0.075, 0.07, (0, cy - 0.05, 0.075), material=BEIGE_D)
bevel(neck, 0.01, 3)
foot = cyl('Base', 0.15, 0.03, (0, cy - 0.05, 0.03), material=BEIGE)
bevel(foot, 0.012, 4)

monitor = join([bezel, body, mask, txt, *knobs, btn, neck, foot], 'CRT_Monitor')

# ---------- tastiera ----------
KB_Y, KB_Z = -0.42, 0.0
kb = box('Tastiera', (0.47, 0.2, 0.026), (0, KB_Y, 0.013), BEIGE)
bevel(kb, 0.008, 4)
keys = []
for r in range(5):
    for c in range(15):
        k = box('tasto', (0.0245, 0.0245, 0.012), (-0.2 + c * 0.0286, KB_Y + 0.072 - r * 0.0285, 0.031), KEYCAP)
        keys.append(k)
space = box('spazio', (0.16, 0.0245, 0.012), (0, KB_Y - 0.072, 0.031), KEYCAP)
keys.append(space)
keycaps = join(keys, 'Tasti')
bevel(keycaps, 0.0035, 3)
led_kb = box('led_kb', (0.006, 0.004, 0.002), (0.205, KB_Y + 0.092, 0.027), LEDM)
keyboard = join([kb, keycaps], 'Tastiera')

# ---------- mouse con cavo ----------
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5, location=(0.33, KB_Y + 0.01, 0.017), segments=32, ring_count=16)
mouse = bpy.context.object
mouse.name = 'Mouse'
mouse.scale = (0.06, 0.1, 0.034)
bpy.ops.object.transform_apply(scale=True)
bm = bmesh.new()
bm.from_mesh(mouse.data)
for v in bm.verts:
    if v.co.z < 0.017:
        v.co.z = 0.017 - (0.017 - v.co.z) * 0.25
bm.to_mesh(mouse.data)
bm.free()
bpy.ops.object.shade_smooth()
mouse.data.materials.append(BEIGE)
curve = bpy.data.curves.new('cavo', 'CURVE')
curve.dimensions = '3D'
sp = curve.splines.new('BEZIER')
pts = [(0.33, KB_Y + 0.06, 0.02), (0.31, KB_Y + 0.2, 0.004), (0.25, KB_Y + 0.33, 0.004), (0.12, cy - 0.12, 0.004)]
sp.bezier_points.add(len(pts) - 1)
for bp, p in zip(sp.bezier_points, pts):
    bp.co = p
    bp.handle_left_type = bp.handle_right_type = 'AUTO'
curve.bevel_depth = 0.0022
cable = bpy.data.objects.new('Cavo', curve)
scn.collection.objects.link(cable)
activate(cable)
bpy.ops.object.convert(target='MESH')
cable.data.materials.append(BLACK)
mouse = join([mouse, cable], 'Mouse')

# ---------- esportazione GLB ----------
bpy.ops.object.select_all(action='DESELECT')
for o in (monitor, scr, led, keyboard, led_kb, mouse):
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)

# ---------- render di anteprima ----------
bpy.ops.mesh.primitive_plane_add(size=4, location=(0, -0.2, 0))
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
cam_d.lens = 45
cam = bpy.data.objects.new('cam', cam_d)
cam.location = (0.55, -1.15, 0.62)
cam.rotation_euler = (Vector((0, -0.12, 0.22)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
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
