"""Strumenti comuni per modellare gli oggetti di The Last Session in Blender."""
import bpy, bmesh, math
from mathutils import Vector


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene



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


def palette():
    """Materiali comuni: da chiamare DOPO reset()."""
    BEIGE = mat('Plastica beige', hexc('#cbbd98'), 0.55)
    BEIGE_D = mat('Plastica beige scura', hexc('#ab9c78'), 0.6)
    KEYCAP = mat('Tasti', hexc('#ddd2b4'), 0.45)
    BLACK = mat('Plastica nera', hexc('#141518'), 0.5)
    MASK = mat('Maschera schermo', hexc('#0b0c0d'), 0.35)
    SCREEN = mat('Schermo', hexc('#14243a'), 0.2, emit=hexc('#2c4f7a'), emit_strength=1.5)
    LEDM = mat('LED', hexc('#6fbf8e'), 0.3, emit=hexc('#6fbf8e'), emit_strength=6)
    METAL = mat('Metallo', hexc('#9aa0a6'), 0.3, 0.9)
    return dict(BEIGE=BEIGE, BEIGE_D=BEIGE_D, KEYCAP=KEYCAP, BLACK=BLACK, MASK=MASK, SCREEN=SCREEN, LEDM=LEDM, METAL=METAL)


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




def curve_tube(name, pts, radius, material, poly=False):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    if poly:
        sp = cu.splines.new('POLY')
        sp.points.add(len(pts) - 1)
        for p, c in zip(sp.points, pts):
            p.co = (*c, 1)
    else:
        sp = cu.splines.new('BEZIER')
        sp.bezier_points.add(len(pts) - 1)
        for bp, c in zip(sp.bezier_points, pts):
            bp.co = c
            bp.handle_left_type = bp.handle_right_type = 'AUTO'
    cu.bevel_depth = radius
    cu.bevel_resolution = 3
    o = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(o)
    activate(o)
    bpy.ops.object.convert(target='MESH')
    o.data.materials.append(material)
    return o


def wire_ao(objs):
    """Collega l'attributo AO al colore base dei materiali (moltiplicazione).
    In Blender 4.1 l'esportatore glTF scrive i colori dei vertici SOLO se il materiale li usa:
    senza questo passaggio le ombre calcolate non arrivano nel gioco."""
    for o in objs:
        if o.type != 'MESH':
            continue
        if not o.data.color_attributes.get('AO'):
            ca = o.data.color_attributes.new('AO', 'BYTE_COLOR', 'CORNER')
            for d in ca.data:
                d.color = (1, 1, 1, 1)
        o.data.color_attributes.active_color = o.data.color_attributes['AO']
        for slot in o.material_slots:
            m = slot.material
            if not m or m.get('ao_wired'):
                continue
            nt = m.node_tree
            bsdf = nt.nodes['Principled BSDF']
            attr = nt.nodes.new('ShaderNodeVertexColor')
            attr.layer_name = 'AO'
            mix = nt.nodes.new('ShaderNodeMix')
            mix.data_type = 'RGBA'
            mix.blend_type = 'MULTIPLY'
            mix.inputs['Factor'].default_value = 1.0
            mix.inputs[6].default_value = bsdf.inputs['Base Color'].default_value
            nt.links.new(attr.outputs['Color'], mix.inputs[7])
            nt.links.new(mix.outputs[2], bsdf.inputs['Base Color'])
            m['ao_wired'] = True


def export(objs, path):
    wire_ao(objs)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)


def preview(path, cam_loc, target, lens=40, floor=True, res=(1400, 800), samples=40):
    scn = bpy.context.scene
    if floor:
        bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
        bpy.context.object.data.materials.append(mat('Pavimento', hexc('#5b5e62'), 0.7))
    world = bpy.data.worlds.new('w')
    scn.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.02, 0.022, 0.03, 1)
    for name, loc, energy, color, size in [('key', (-2.5, -3.0, 3.2), 900, (1.0, 0.82, 0.62), 2.0), ('fill', (3.5, -2.0, 2.0), 250, (0.6, 0.72, 1.0), 3.0), ('rim', (1.0, 3.5, 3.0), 400, (0.7, 0.8, 1.0), 2.0)]:
        ld = bpy.data.lights.new(name, 'AREA')
        ld.energy, ld.color, ld.size = energy, color, size
        lo = bpy.data.objects.new(name, ld)
        lo.location = loc
        lo.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        scn.collection.objects.link(lo)
    cd = bpy.data.cameras.new('cam')
    cd.lens = lens
    cam = bpy.data.objects.new('cam', cd)
    cam.location = cam_loc
    cam.rotation_euler = (Vector(target) - Vector(cam_loc)).to_track_quat('-Z', 'Y').to_euler()
    scn.collection.objects.link(cam)
    scn.camera = cam
    scn.render.engine = 'CYCLES'
    scn.cycles.device = 'CPU'
    scn.cycles.samples = samples
    scn.cycles.use_denoising = True
    scn.render.resolution_x, scn.render.resolution_y = res
    scn.view_settings.view_transform = 'AgX'
    scn.render.filepath = path
    bpy.ops.render.render(write_still=True)


def bake_ao(objs, distance=0.06, samples=24, grime=1.0):
    """Calcola l'occlusione ambientale (sporco/ombra nelle fessure) e la salva nei colori dei vertici.
    In gioco il colore del materiale viene moltiplicato per questi valori."""
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.device = 'CPU'
    scn.cycles.samples = samples
    if not scn.world:
        scn.world = bpy.data.worlds.new('w')
    scn.world.light_settings.distance = distance
    for o in objs:
        if o.type != 'MESH':
            continue
        activate(o)
        attrs = o.data.color_attributes
        ca = attrs.get('AO') or attrs.new('AO', 'BYTE_COLOR', 'CORNER')
        attrs.active_color = ca
        bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
        # schiarisce un po' l'AO (in tempo reale sarebbe troppo scuro) e aggiunge sporcizia naturale:
        # un rumore spaziale a bassa frequenza, più marcato verso il basso (dove si accumula lo sporco)
        from mathutils import noise
        mw = o.matrix_world
        loops = o.data.loops
        verts = o.data.vertices
        for li, d in enumerate(ca.data):
            c = d.color
            v = 0.35 + 0.65 * c[0]
            if grime:
                p = mw @ verts[loops[li].vertex_index].co
                n = noise.noise(p * 9.0) * 0.5 + noise.noise(p * 31.0) * 0.25
                low = max(0.0, 1.0 - p.z / 0.4) * 0.06  # bordi bassi un po' più scuri
                v *= max(0.8, 1.0 - grime * (0.06 + 0.08 * n) - low * grime)
            d.color = (v, v, v, 1)
