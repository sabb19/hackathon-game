"""Postazione realistica: unità centrale desktop anni '90, monitor CRT, tastiera completa, mouse con tappetino, smartphone.
Uso: Blender -b --python tools/blender/pc2.py -- <cartella_out> <preview.png>
Davanti verso -Y (diventa +Z in glTF). L'occlusione ambientale è salvata nei colori dei vertici."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from lib import *

argv = sys.argv[sys.argv.index('--') + 1:]
OUT, PNG = argv[0], argv[1]
reset()
P = palette()
BEIGE = mat('Plastica beige', hexc('#cfc2a0'), 0.5)
BEIGE_D = mat('Plastica beige scura', hexc('#b3a684'), 0.55)
YELLOWED = mat('Plastica ingiallita', hexc('#cbb98f'), 0.55)
KEYCAP = mat('Tasti', hexc('#ddd3b8'), 0.42)
KEY_GREY = mat('Tasti grigi', hexc('#9d9888'), 0.45)
BLACK = mat('Plastica nera', hexc('#121315'), 0.45)
MASK = mat('Maschera schermo', hexc('#0a0b0c'), 0.3)
SCREEN = mat('Schermo', hexc('#14243a'), 0.2, emit=hexc('#2c4f7a'), emit_strength=1.5)
LEDM = mat('LED', hexc('#6fbf8e'), 0.3, emit=hexc('#6fbf8e'), emit_strength=6)
LEDA = mat('LED disco', hexc('#e8a23a'), 0.3, emit=hexc('#e8a23a'), emit_strength=4)
CLOTH = mat('Tappetino', hexc('#2b3a52'), 0.95)
PHONE_GLASS = mat('Vetro telefono', hexc('#0c0e11'), 0.08)
PHONE_FRAME = mat('Cornice telefono', hexc('#5d6167'), 0.3, 0.9)
LENS = mat('Obiettivo', hexc('#050608'), 0.05)
ALU = mat('Alluminio', hexc('#a3aab0'), 0.3, 0.9)


def deform_taper(o, axis_val, sx, sz, lift=0.0, cond=lambda v, c: v.co.y > c):
    bm = bmesh.new(); bm.from_mesh(o.data)
    for v in bm.verts:
        if cond(v, axis_val):
            v.co.x *= sx
            v.co.z = v.co.z * sz + lift
    bm.to_mesh(o.data); bm.free()


# ================= UNITÀ CENTRALE (desktop orizzontale) =================
CASE_H = 0.15
case = box('case', (0.44, 0.42, CASE_H), (0, 0.03, CASE_H / 2), BEIGE)
bevel(case, 0.006, 3)
# solco tra coperchio e frontale
groove = box('solco', (0.46, 0.006, 0.006), (0, -0.165, CASE_H - 0.03))
cut(case, groove)
front = box('frontale', (0.44, 0.03, CASE_H - 0.008), (0, -0.185, CASE_H / 2), YELLOWED)
bevel(front, 0.008, 3)
bays = []
# vano CD-ROM e floppy 3.5"
cd = box('cdrom', (0.15, 0.012, 0.042), (0.09, -0.2, 0.1), BEIGE_D); bevel(cd, 0.003, 2)
cdslot = box('cd_vassoio', (0.13, 0.01, 0.004), (0.09, -0.207, 0.108), BLACK)
cdbtn = box('cd_tasto', (0.012, 0.01, 0.006), (0.15, -0.207, 0.088), BLACK)
fd = box('floppy', (0.11, 0.012, 0.028), (0.09, -0.2, 0.05), BEIGE_D); bevel(fd, 0.003, 2)
fdslot = box('floppy_fessura', (0.09, 0.01, 0.004), (0.09, -0.207, 0.055), BLACK)
fdbtn = box('floppy_tasto', (0.014, 0.01, 0.008), (0.125, -0.207, 0.042), BEIGE)
bays += [cd, cdslot, cdbtn, fd, fdslot, fdbtn]
# pulsanti, LED, griglia, targhetta
pwr = box('accensione', (0.03, 0.014, 0.022), (-0.15, -0.203, 0.05), BEIGE_D); bevel(pwr, 0.005, 3)
rst = box('reset', (0.012, 0.012, 0.012), (-0.11, -0.203, 0.05), BEIGE_D); bevel(rst, 0.003, 2)
badge = box('targhetta', (0.07, 0.004, 0.018), (-0.13, -0.2, 0.11), ALU); bevel(badge, 0.002, 2)
grill = []
for i in range(9):
    g = box('griglia', (0.004, 0.02, 0.05), (-0.06 + i * 0.008, -0.19, 0.08))
    cut(front, g)
unit = join([case, front, *bays, pwr, rst, badge], 'Unita')
led_pwr = box('LED', (0.006, 0.006, 0.004), (-0.15, -0.205, 0.09), LEDM)
led_hdd = box('LED_disco', (0.006, 0.006, 0.004), (-0.135, -0.205, 0.09), LEDA)

# ================= MONITOR CRT 14" =================
BASE_Z = CASE_H
CZ = BASE_Z + 0.08 + 0.19
FRONT_Y = -0.15
bezel = box('Cornice', (0.39, 0.06, 0.36), (0, FRONT_Y + 0.03, CZ), BEIGE)
bevel(bezel, 0.016, 5)
hole = box('foro', (0.3, 0.2, 0.228), (0, FRONT_Y, CZ + 0.014)); bevel(hole, 0.02, 4); cut(bezel, hole)
chamfer = box('smusso', (0.322, 0.016, 0.25), (0, FRONT_Y - 0.003, CZ + 0.014)); bevel(chamfer, 0.026, 4); cut(bezel, chamfer)
# il frontale leggermente inclinato all'indietro, come nei CRT veri
body = box('Corpo', (0.37, 0.36, 0.34), (0, FRONT_Y + 0.06 + 0.18, CZ + 0.004), BEIGE_D)
cy = FRONT_Y + 0.06 + 0.18
deform_taper(body, cy, 0.6, 0.62, lift=(CZ + 0.02) * 0.38)
bevel(body, 0.022, 4)
for side in (-1, 1):  # prese d'aria sui fianchi
    for i in range(7):
        s = box('presa', (0.05, 0.012, 0.004), (side * 0.15, cy - 0.02 + i * 0.022, CZ + 0.06))
        s.rotation_euler = (0, 0, 0)
        cut(body, s)
for i in range(12):  # e sul dorso
    s = box('presa', (0.01, 0.17, 0.04), (-0.11 + i * 0.02, cy + 0.05, CZ + 0.19)); cut(body, s)
mask = box('Maschera', (0.32, 0.01, 0.248), (0, FRONT_Y + 0.028, CZ + 0.014), MASK)
bpy.ops.mesh.primitive_plane_add(size=1)
scr = bpy.context.object; scr.name = 'Screen'
scr.scale = (0.288, 0.218, 1); bpy.ops.object.transform_apply(scale=True)
bm = bmesh.new(); bm.from_mesh(scr.data)
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=20, use_grid_fill=True)
for v in bm.verts:
    x, y = v.co.x / 0.144, v.co.y / 0.109
    v.co.z = 0.011 * (1 - 0.5 * (x * x + y * y))
bm.to_mesh(scr.data); bm.free()
scr.rotation_euler = (math.radians(90), 0, 0)
scr.location = (0, FRONT_Y + 0.02, CZ + 0.014)
bpy.ops.object.transform_apply(rotation=True, location=True)
bpy.ops.object.shade_smooth()
scr.data.materials.append(SCREEN)
bz = CZ - 0.155
bpy.ops.object.text_add(location=(-0.165, FRONT_Y - 0.003, bz - 0.006), rotation=(math.radians(90), 0, 0))
logo = bpy.context.object
logo.data.body = 'HALDEN'; logo.data.size = 0.016; logo.data.extrude = 0.0006
bpy.ops.object.convert(target='MESH'); logo.data.materials.append(BEIGE_D)
ctr = []
for x in (0.05, 0.078):
    k = cyl('manopola', 0.0075, 0.012, (x, FRONT_Y - 0.004, bz), (math.radians(90), 0, 0), BEIGE_D, 24); bevel(k, 0.002, 2); ctr.append(k)
btn = box('pulsante', (0.032, 0.012, 0.016), (0.13, FRONT_Y - 0.002, bz), BEIGE_D); bevel(btn, 0.004, 3)
led = cyl('LED_mon', 0.0032, 0.004, (0.158, FRONT_Y - 0.003, bz), (math.radians(90), 0, 0), LEDM, 16)
neck = cyl('collo', 0.07, 0.07, (0, cy - 0.06, BASE_Z + 0.04), material=BEIGE_D); bevel(neck, 0.01, 3)
foot = cyl('base', 0.14, 0.022, (0, cy - 0.06, BASE_Z + 0.011), material=BEIGE); bevel(foot, 0.01, 4)
monitor = join([bezel, body, mask, logo, *ctr, btn, neck, foot], 'Monitor')
# cavi sul retro
cables = [curve_tube('cavo_video', [(0.05, cy + 0.17, CZ - 0.08), (0.08, cy + 0.26, CZ - 0.2), (0.1, cy + 0.24, BASE_Z - 0.02), (0.12, cy + 0.2, 0.06)], 0.004, BLACK),
          curve_tube('cavo_corrente', [(-0.06, cy + 0.17, CZ - 0.1), (-0.09, cy + 0.27, CZ - 0.25), (-0.12, cy + 0.3, 0.02)], 0.004, BLACK)]
cab = join(cables, 'Cavi')

# ================= TASTIERA COMPLETA (layout PC 102 tasti, semplificato) =================
KB_Y = -0.43
kb = box('tastiera', (0.46, 0.18, 0.024), (0, KB_Y, 0.012), BEIGE)
deform_taper(kb, KB_Y, 1.0, 1.0, cond=lambda v, c: False)
bm = bmesh.new(); bm.from_mesh(kb.data)
for v in bm.verts:  # dietro più alta: tastiera inclinata
    if v.co.y > KB_Y and v.co.z > 0.01:
        v.co.z += 0.012
bm.to_mesh(kb.data); bm.free()
bevel(kb, 0.007, 4)
keys, grey = [], []
U = 0.0175  # passo di un tasto
def key(x, y, w=1.0, g=False):
    zx = 0.024 + 0.012 * (y - (KB_Y - 0.08)) / 0.16 + 0.006
    k = box('tasto', (U * w - 0.003, U - 0.003, 0.01), (x, y, zx), KEY_GREY if g else KEYCAP)
    (grey if g else keys).append(k)
X0, Y0 = -0.215, KB_Y + 0.07
for i in range(13):  # Esc + F1..F12
    key(X0 + i * U * (1.12 if i else 1) + (0.01 if i else 0), Y0, g=(i == 0))
rows = [(13, 0, 2.0), (13, 1.5, 1.5), (12, 1.8, 2.2), (11, 2.3, 2.7)]
for r, (n, lead, tail) in enumerate(rows):
    y = Y0 - 0.026 - r * U
    x = X0
    key(x + lead * U / 2 - U / 2, y, lead if lead else 1.0, g=True) if lead else None
    x += (lead * U) if lead else 0
    for i in range(n):
        key(x + i * U + U / 2 - U / 2, y)
    key(x + n * U + tail * U / 2 - U / 2, y, tail, g=True)
y = Y0 - 0.026 - 4 * U
key(X0 + 0.01, y, 1.5, g=True); key(X0 + 0.04, y, 1.5, g=True)
key(X0 + 0.13, y, 6.5)
key(X0 + 0.235, y, 1.5, g=True); key(X0 + 0.265, y, 1.5, g=True)
for i, (dx, dy) in enumerate([(0, -4), (-1, -4), (1, -4), (0, -3)]):  # frecce
    key(0.13 + dx * U, Y0 - 0.026 + dy * U, g=True)
for r in range(5):  # tastierino numerico
    for c in range(4):
        if r == 4 and c == 1:
            continue
        key(0.175 + c * U, Y0 - 0.026 - r * U, 2.0 if (r == 4 and c == 0) else 1.0, g=(c == 3))
keycaps = join(keys, 'Tasti'); bevel(keycaps, 0.0028, 2)
greycaps = join(grey, 'TastiGrigi'); bevel(greycaps, 0.0028, 2)
kled = [box('led_kb', (0.004, 0.003, 0.002), (0.18 + i * 0.012, KB_Y + 0.082, 0.04), LEDM) for i in range(3)]
keyboard = join([kb, keycaps, greycaps], 'Tastiera')
kb_cable = curve_tube('cavo_tastiera', [(-0.15, KB_Y + 0.09, 0.02), (-0.15, KB_Y + 0.16, 0.004), (-0.1, -0.1, 0.004), (-0.08, 0.05, 0.03)], 0.0025, BEIGE_D)

# ================= MOUSE + TAPPETINO =================
pad = box('tappetino', (0.22, 0.19, 0.004), (0.36, -0.4, 0.002), CLOTH); bevel(pad, 0.01, 4)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5, location=(0.36, -0.4, 0.021), segments=40, ring_count=20)
mouse = bpy.context.object; mouse.name = 'Mouse'
mouse.scale = (0.058, 0.1, 0.034); bpy.ops.object.transform_apply(scale=True)
bm = bmesh.new(); bm.from_mesh(mouse.data)
for v in bm.verts:
    if v.co.z < 0.021:
        v.co.z = 0.021 - (0.021 - v.co.z) * 0.3
    if v.co.y > -0.4:  # dorso più alto verso il polso
        v.co.z += 0.004 * (v.co.y + 0.4) / 0.05
bm.to_mesh(mouse.data); bm.free(); bpy.ops.object.shade_smooth()
mouse.data.materials.append(BEIGE)
split = box('divisione', (0.002, 0.04, 0.03), (0.36, -0.43, 0.04)); cut(mouse, split)
m_cable = curve_tube('cavo_mouse', [(0.36, -0.35, 0.025), (0.35, -0.28, 0.004), (0.3, -0.12, 0.004), (0.15, 0.05, 0.03)], 0.0022, BEIGE_D)
mouse = join([mouse, m_cable, pad], 'Mouse')

pc_objs = [unit, led_pwr, led_hdd, monitor, scr, led, cab, keyboard, *kled, kb_cable, mouse]
bake_ao([unit, monitor, keyboard, mouse], distance=0.05)
export(pc_objs, os.path.join(OUT, 'crt.glb'))

# ================= SMARTPHONE =================
def smartphone():
    W, H, D = 0.074, 0.155, 0.008
    shape = None
    body = box('telefono', (W, H, D), (0, 0, D / 2), PHONE_FRAME)
    bevel(body, 0.006, 6)
    glass = box('vetro', (W - 0.003, H - 0.003, 0.0012), (0, 0, D + 0.0002), PHONE_GLASS)
    bevel(glass, 0.0055, 4)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, D + 0.0009))
    scr = bpy.context.object; scr.name = 'PhoneScreen'
    scr.scale = (W - 0.008, H - 0.012, 1); bpy.ops.object.transform_apply(scale=True)
    scr.data.materials.append(mat('Schermo telefono', hexc('#1a2a3d'), 0.2, emit=hexc('#5f86b3'), emit_strength=1.0))
    camb = box('modulo_camere', (0.03, 0.03, 0.002), (-0.018, 0.055, -0.0008), PHONE_GLASS); bevel(camb, 0.006, 4)
    lenses = [cyl('obiettivo', 0.0055, 0.002, (-0.025 + dx, 0.062 - dy, -0.002), material=LENS, verts=24) for dx, dy in ((0, 0), (0.013, 0), (0, 0.013))]
    btns = [box('tasto', (0.0015, 0.018 if i else 0.03, 0.003), (W / 2 + 0.0004, 0.03 - i * 0.03, D / 2), PHONE_FRAME) for i in range(2)]
    ph = join([body, glass, camb, *lenses, *btns], 'Smartphone')
    # il telefono giace sulla scrivania con lo schermo verso l'alto: lungo lungo Y
    return [ph, scr]


sp = smartphone()
for o in sp:
    o.location.x += 0.9
bake_ao([sp[0]], distance=0.01)
for o in sp:
    o.location.x -= 0.9
export(sp, os.path.join(OUT, 'smartphone.glb'))
for o in sp:
    o.location = (0.62, -0.42, 0)
    o.rotation_euler = (0, 0, 0.35)

# ================= ANTEPRIMA (render) =================
# per l'anteprima uso le AO come colore anche in Blender (moltiplicate al materiale)
for o in [unit, monitor, keyboard, mouse, sp[0]]:
    for slot in o.material_slots:
        m = slot.material
        if not m or m.get('ao_wired'):
            continue
        nt = m.node_tree
        attr = nt.nodes.new('ShaderNodeVertexColor'); attr.layer_name = 'AO'
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1.0
        bsdf = nt.nodes['Principled BSDF']
        mix.inputs[6].default_value = bsdf.inputs['Base Color'].default_value
        nt.links.new(attr.outputs['Color'], mix.inputs[7])
        nt.links.new(mix.outputs[2], bsdf.inputs['Base Color'])
        m['ao_wired'] = True
preview(PNG, (0.85, -1.45, 0.95), (0.12, -0.2, 0.2), lens=40, res=(1400, 900), samples=48)
print('OK')
