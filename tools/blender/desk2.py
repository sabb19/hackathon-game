"""Scrivania da open space contemporanea (sostituisce la scrivania d'acciaio anni '70) + pannello divisorio fonoassorbente.
Uso: Blender -b --python tools/blender/desk2.py -- <cartella_out> <preview.png>
Misure come la vecchia: piano 2.0 x 0.9 m, superficie a 0.79 m. Fronte (lato sedia) verso -Y = +Z in three.
Il primo cassetto è un oggetto separato ("Cassetto") per poterlo aprire nel gioco."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from lib import *

argv = sys.argv[sys.argv.index('--') + 1:]
OUT, PNG = argv[0], argv[1]
reset()

OAK = mat('Laminato rovere', hexc('#b8946a'), 0.42)
EDGE = mat('Bordo', hexc('#8a6a48'), 0.5)
FRAME = mat('Telaio antracite', hexc('#2b2e33'), 0.38, 0.6)
PED = mat('Cassettiera', hexc('#e3e0d8'), 0.45)
HANDLE = mat('Maniglia', hexc('#2b2e33'), 0.3, 0.8)
FABRIC = mat('Tessuto fonoassorbente', hexc('#56646b'), 0.95)
RUBBER = mat('Gomma', hexc('#151619'), 0.7)
TOP = 0.79
done = []


def ship(objs, name, x):
    bake_ao([o for o in objs if o.type == 'MESH'], distance=0.05)
    export(objs, os.path.join(OUT, f'{name}.glb'))
    for o in objs:
        o.location.x += x
    done.append(name)


def desk():
    parts = []
    # piano con bordo arrotondato
    top = box('piano', (2.0, 0.9, 0.025), (0, 0, TOP - 0.0125), OAK)
    bevel(top, 0.008, 3)
    parts.append(top)
    # telaio a "C" alle due estremità: gamba verticale, piede, traverso sotto il piano
    for sx in (-0.93, 0.93):
        for sy in (-0.36, 0.36):
            leg = box('gamba', (0.05, 0.03, TOP - 0.06), (sx, sy, (TOP - 0.06) / 2 + 0.015), FRAME)
            bevel(leg, 0.006, 2)
            parts.append(leg)
        foot = box('piede', (0.06, 0.82, 0.03), (sx, 0, 0.015), FRAME)
        bevel(foot, 0.006, 2)
        rail = box('traverso', (0.05, 0.8, 0.04), (sx, 0, TOP - 0.045), FRAME)
        bevel(rail, 0.006, 2)
        parts += [foot, rail]
        for sy in (-0.38, 0.38):
            parts.append(cyl('piedino', 0.018, 0.012, (sx, sy, 0.006), material=RUBBER, verts=16))
    # trave longitudinale e canalina portacavi (lato del divisorio)
    beam = box('trave', (1.82, 0.04, 0.05), (0, 0.3, TOP - 0.05), FRAME)
    bevel(beam, 0.006, 2)
    tray = box('canalina', (1.5, 0.14, 0.008), (0, 0.32, TOP - 0.13), FRAME)
    lip = box('bordo canalina', (1.5, 0.008, 0.07), (0, 0.25, TOP - 0.1), FRAME)
    parts += [beam, tray, lip]
    d = join(parts, 'Scrivania')
    return [d]


def pedestal():
    """Cassettiera su ruote sotto il lato sinistro; il primo cassetto è separato."""
    x, y0 = -0.62, 0.0
    body = box('cassettiera', (0.42, 0.55, 0.6), (x, y0, 0.34), PED)
    bevel(body, 0.006, 2)
    parts = [body]
    # fronti dei cassetti 2 e 3 (il primo è separato)
    for zc, h in ((0.43, 0.135), (0.2, 0.25)):
        f = box('fronte', (0.40, 0.018, h), (x, y0 - 0.284, zc), PED)
        bevel(f, 0.004, 2)
        hd = box('maniglia', (0.18, 0.012, 0.014), (x, y0 - 0.296, zc + h / 2 - 0.03), HANDLE)
        parts += [f, hd]
    for wx in (-0.17, 0.17):
        for wy in (-0.22, 0.22):
            parts.append(cyl('ruota', 0.022, 0.018, (x + wx, y0 + wy, 0.022), rot=(0, math.radians(90), 0), material=RUBBER, verts=16))
    ped = join(parts, 'Cassettiera')
    # primo cassetto: fronte + vaschetta aperta sopra (si vede il contenuto quando si apre)
    zc = 0.575
    front = box('fronte1', (0.40, 0.018, 0.12), (x, y0 - 0.284, zc), PED)
    bevel(front, 0.004, 2)
    hd = box('maniglia1', (0.18, 0.012, 0.014), (x, y0 - 0.296, zc + 0.03), HANDLE)
    floor_ = box('fondo', (0.36, 0.5, 0.008), (x, y0, zc - 0.05), PED)
    sides = [
        box('lato', (0.008, 0.5, 0.09), (x - 0.176, y0, zc - 0.005), PED),
        box('lato', (0.008, 0.5, 0.09), (x + 0.176, y0, zc - 0.005), PED),
        box('retro', (0.36, 0.008, 0.09), (x, y0 + 0.246, zc - 0.005), PED),
    ]
    drawer = join([front, hd, floor_, *sides], 'Cassetto')
    return [ped, drawer]


def screen():
    """Pannello divisorio in tessuto montato sul bordo posteriore (con due staffe)."""
    panel = box('pannello', (1.96, 0.028, 0.46), (0, 0.44, TOP + 0.25), FABRIC)
    bevel(panel, 0.01, 3)
    frame = box('profilo', (1.97, 0.03, 0.012), (0, 0.44, TOP + 0.484), FRAME)
    brackets = [box('staffa', (0.04, 0.05, 0.06), (sx, 0.43, TOP + 0.02), FRAME) for sx in (-0.7, 0.7)]
    return [join([panel, frame, *brackets], 'Divisorio')]


d = desk() + pedestal()
ship(d, 'desk2', 0.0)
ship(screen(), 'screen2', 0.0)
print('EXPORTED', done)
preview(PNG, (1.6, -2.2, 1.5), (0, 0, 0.6), lens=38, res=(1400, 800), samples=32)
print('OK')
