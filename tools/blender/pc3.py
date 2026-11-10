"""Postazione d'ufficio attuale: monitor LCD 16:9 su stand, mini-tower, tastiera slim, mouse ergonomico.
Uso: Blender -b --python tools/blender/pc3.py -- <cartella_out> <preview.png>
Davanti verso -Y (diventa +Z in glTF). La mesh "Screen" (UV 0..1, 16:9) riceve RELAY in gioco."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from lib import *

argv = sys.argv[sys.argv.index('--') + 1:]
OUT, PNG = argv[0], argv[1]
reset()
GRAPH = mat('Grafite', hexc('#2b2e33'), 0.55)
GRAPH_L = mat('Grafite chiara', hexc('#3d4147'), 0.5)
MATTE = mat('Nero opaco', hexc('#141518'), 0.6)
ALU = mat('Alluminio satinato', hexc('#9ea4aa'), 0.35, 0.9)
KEYS = mat('Tasti', hexc('#1f2125'), 0.5)
SCREEN = mat('Schermo', hexc('#14243a'), 0.2, emit=hexc('#2c4f7a'), emit_strength=1.5)
LEDW = mat('LED bianco', hexc('#dfe8f0'), 0.3, emit=hexc('#cfe3ff'), emit_strength=5)
LEDB = mat('LED blu', hexc('#4f8fd6'), 0.3, emit=hexc('#4f8fd6'), emit_strength=6)
PORT = mat('Porte', hexc('#08090a'), 0.6)

# ================= MONITOR LCD 22" 16:9 =================
SW, SH = 0.476, 0.268           # area visibile
BW, BH = SW + 0.024, SH + 0.034  # con cornice (più spessa in basso)
CZ = 0.29                        # centro del pannello (abbassato)
FY = -0.02                       # fronte del pannello
panel = box('pannello', (BW, 0.022, BH), (0, FY + 0.011, CZ), MATTE)
bevel(panel, 0.004, 3)
recess = box('incavo', (SW, 0.01, SH), (0, FY, CZ + 0.006))
cut(panel, recess)
back = box('retro', (BW - 0.06, 0.035, BH - 0.06), (0, FY + 0.035, CZ), GRAPH)
bevel(back, 0.012, 4)
bm = bmesh.new(); bm.from_mesh(back.data)
for v in bm.verts:  # retro bombato verso il centro
    if v.co.y > FY + 0.035:
        v.co.x *= 0.8; v.co.z = CZ + (v.co.z - CZ) * 0.75
bm.to_mesh(back.data); bm.free()
# logo e LED sulla cornice inferiore
bpy.ops.object.text_add(location=(0, FY - 0.0005, CZ - BH / 2 + 0.008), rotation=(math.radians(90), 0, 0))
logo = bpy.context.object
logo.data.body = 'HALDEN'; logo.data.size = 0.009; logo.data.align_x = 'CENTER'; logo.data.extrude = 0.0003
bpy.ops.object.convert(target='MESH'); logo.data.materials.append(ALU)
btns = [box('tasto', (0.006, 0.004, 0.003), (0.17 + i * 0.012, FY + 0.01, CZ - BH / 2 - 0.0005), MATTE) for i in range(4)]
# stand regolabile in alluminio
neck = box('colonna', (0.05, 0.025, 0.24), (0, FY + 0.075, 0.13), ALU)
bevel(neck, 0.008, 3)
hinge = box('cerniera', (0.09, 0.03, 0.05), (0, FY + 0.06, CZ), GRAPH_L)
bevel(hinge, 0.01, 3)
base = box('base', (0.24, 0.19, 0.012), (0, FY + 0.06, 0.006), ALU)
bevel(base, 0.02, 5)
cable_hole = cyl('passacavo', 0.012, 0.03, (0, FY + 0.088, 0.07), (math.pi / 2, 0, 0))
cut(neck, cable_hole)
monitor = join([panel, back, logo, *btns, neck, hinge, base], 'Monitor')
bpy.ops.mesh.primitive_plane_add(size=1)
scr = bpy.context.object; scr.name = 'Screen'
scr.scale = (SW, SH, 1); bpy.ops.object.transform_apply(scale=True)
scr.rotation_euler = (math.radians(90), 0, 0)
scr.location = (0, FY + 0.004, CZ + 0.006)
bpy.ops.object.transform_apply(rotation=True, location=True)
scr.data.materials.append(SCREEN)
led_mon = box('LED_mon', (0.004, 0.002, 0.0015), (0.22, FY - 0.0006, CZ - BH / 2 + 0.006), LEDW)
mcable = curve_tube('cavo_monitor', [(0, FY + 0.1, 0.1), (0.04, FY + 0.16, 0.05), (0.2, FY + 0.12, 0.01), (0.42, FY + 0.05, 0.005)], 0.003, MATTE)

# ================= MINI-TOWER =================
TX = 0.47
tower = box('tower', (0.17, 0.36, 0.36), (TX, 0.0, 0.18), GRAPH)
bevel(tower, 0.008, 3)
face = box('frontale', (0.17, 0.012, 0.36), (TX, -0.184, 0.18), MATTE)
bevel(face, 0.006, 3)
slot = box('fessura', (0.006, 0.02, 0.3), (TX - 0.06, -0.19, 0.18))
cut(face, slot)
pwr = cyl('accensione', 0.011, 0.006, (TX + 0.03, -0.19, 0.33), (math.pi / 2, 0, 0), ALU, 32)
usb = [box('usb', (0.013, 0.01, 0.005), (TX + 0.0 + i * 0.022, -0.19, 0.3), PORT) for i in range(2)]
jack = cyl('jack', 0.003, 0.01, (TX + 0.05, -0.19, 0.3), (math.pi / 2, 0, 0), PORT, 16)
vents = []
for i in range(10):
    v = box('grata', (0.004, 0.2, 0.02), (TX + 0.086, 0.0, 0.08 + i * 0.022))
    cut(tower, v)
feet = [box('piedino', (0.03, 0.04, 0.008), (TX + sx * 0.06, sy * 0.14, 0.004), MATTE) for sx in (-1, 1) for sy in (-1, 1)]
pc = join([tower, face, pwr, *usb, jack, *feet], 'Tower')
led_pc = cyl('LED_pc', 0.0125, 0.002, (TX + 0.03, -0.1935, 0.33), (math.pi / 2, 0, 0), LEDB, 32)
ring_cut = cyl('anello', 0.0095, 0.01, (TX + 0.03, -0.195, 0.33), (math.pi / 2, 0, 0))
cut(led_pc, ring_cut)

# ================= TASTIERA SLIM =================
KB_Y = -0.3
kb = box('tastiera', (0.45, 0.14, 0.012), (0.0, KB_Y, 0.006), ALU)
bm = bmesh.new(); bm.from_mesh(kb.data)
for v in bm.verts:
    if v.co.y > KB_Y and v.co.z > 0.005:
        v.co.z += 0.008
bm.to_mesh(kb.data); bm.free()
bevel(kb, 0.004, 3)
keys = []
U = 0.0178  # 1 unità = passo di un tasto standard
GAP = 0.0035
LEFT = -0.205  # bordo sinistro del blocco tasti


def key(ux, uy, w=1.0, h=1.0):
    """ux, uy: posizione in unità dall'angolo in alto a sinistra; w, h: dimensioni in unità."""
    x = LEFT + (ux + w / 2) * U
    y = KB_Y + 0.052 - (uy + h / 2) * U
    z = 0.012 + 0.008 * (y - (KB_Y - 0.06)) / 0.12 + 0.0015
    keys.append(box('tasto', (w * U - GAP, h * U - GAP, 0.003), (x, y, z), KEYS))


# fila funzioni (leggermente staccata): Esc, F1-F4, F5-F8, F9-F12
key(0, 0)
for g, start in enumerate((2, 6.5, 11)):
    for k in range(4):
        key(start + k, 0)
# blocco principale (15 unità per riga)
R = 1.25
for k in range(13):
    key(k, R)
key(13, R, 2)
key(0, R + 1, 1.5)
for k in range(12):
    key(1.5 + k, R + 1)
key(13.5, R + 1, 1.5)
key(0, R + 2, 1.75)
for k in range(11):
    key(1.75 + k, R + 2)
key(12.75, R + 2, 2.25)
key(0, R + 3, 2.25)
for k in range(10):
    key(2.25 + k, R + 3)
key(12.25, R + 3, 2.75)
x = 0
for w in (1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25):
    key(x, R + 4, w)
    x += w
# blocco navigazione e frecce
NX = 15.5
for k in range(3):
    key(NX + k, 0)
    key(NX + k, R)
    key(NX + k, R + 1)
key(NX + 1, R + 3)
for k in range(3):
    key(NX + k, R + 4)
# tastierino numerico
PX = 19
for r in range(4):
    for c in range(4):
        if c == 3 and r in (1, 3):
            continue
        h = 2 if (c == 3 and r in (0, 2)) else 1
        key(PX + c, R + r, 1, h)
key(PX, R + 4, 2)
key(PX + 2, R + 4)
keycaps = join(keys, 'Tasti')
keyboard = join([kb, keycaps], 'Tastiera')

# ================= MOUSE ERGONOMICO + TAPPETINO =================
pad = box('tappetino', (0.26, 0.21, 0.003), (0.34, -0.3, 0.0015), MATTE)
bevel(pad, 0.012, 4)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5, location=(0.34, -0.3, 0.018), segments=40, ring_count=20)
mouse = bpy.context.object; mouse.name = 'Mouse'
mouse.scale = (0.062, 0.115, 0.036); bpy.ops.object.transform_apply(scale=True)
bm = bmesh.new(); bm.from_mesh(mouse.data)
for v in bm.verts:
    if v.co.z < 0.018:
        v.co.z = 0.018 - (0.018 - v.co.z) * 0.25
    v.co.z += 0.006 * max(0, (v.co.y + 0.3) / 0.05) * (1 if v.co.z > 0.02 else 0)
bm.to_mesh(mouse.data); bm.free(); bpy.ops.object.shade_smooth()
mouse.data.materials.append(GRAPH)
wheel = cyl('rotella', 0.007, 0.005, (0.34, -0.33, 0.038), (0, math.pi / 2, 0), MATTE, 24)
mouse = join([mouse, wheel, pad], 'Mouse')

objs = [monitor, scr, led_mon, mcable, pc, led_pc, keyboard, mouse]
bake_ao([monitor, pc, keyboard, mouse], distance=0.04)
export(objs, os.path.join(OUT, 'workstation.glb'))

for o in [monitor, pc, keyboard, mouse]:
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
preview(PNG, (0.55, -1.25, 0.75), (0.08, -0.08, 0.25), lens=40, res=(1400, 900), samples=48)
print('OK')
