"""Headless Blender: clean Tripo props, assemble the scene from layout.json, render four views, export, re-import.

Usage:
  Blender -b --factory-startup -P assemble_scene.py -- <layout.json> <out_dir> <library_dir>
"""
import json
import math
import sys
import time
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
LAYOUT, OUT, LIB = (Path(a).resolve() for a in argv[:3])
OUT.mkdir(parents=True, exist_ok=True)
layout = json.loads(LAYOUT.read_text())
ROOT = LAYOUT.resolve().parents[2]  # repo root (runs/<order>/layout.json)
metrics = {'blender': bpy.app.version_string, 'started': time.time(), 'props': [], 'checks': {}}


def tris(objs):
    total = 0
    for o in objs:
        if o.type == 'MESH':
            o.data.calc_loop_triangles()
            total += len(o.data.loop_triangles)
    return total


def world_bbox(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs if o.type == 'MESH' for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def hierarchy(root):
    return [root] + list(root.children_recursive)


def select_only(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------- props ----------
props = {}
for spec in layout['props']:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / spec['source']))
    imported = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in imported if o.type == 'MESH']
    raw_tris = tris(meshes)
    flipped = 0
    for o in meshes:  # dry run only: Tripo shells are not closed, so recalculating flips good faces

        bm = bmesh.new()
        bm.from_mesh(o.data)
        old = [f.normal.copy() for f in bm.faces]
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        flipped += sum(1 for f, n in zip(bm.faces, old) if f.normal.dot(n) < 0)
        bm.free()
    decimated = False
    if raw_tris > spec.get('max_tris', 40000):
        ratio = spec.get('max_tris', 40000) / raw_tris
        for o in meshes:
            m = o.modifiers.new('decimate', 'DECIMATE')
            m.ratio = ratio
            with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
                bpy.ops.object.modifier_apply(modifier=m.name)
        decimated = True
    lo, hi = world_bbox(meshes)
    root = bpy.data.objects.new('prop_' + spec['id'], None)
    scene.collection.objects.link(root)
    root.location = ((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z)  # pivot: bottom centre
    bpy.context.view_layer.update()
    for o in imported:
        if o.parent is None:
            mw = o.matrix_world.copy()
            o.parent = root
            o.matrix_world = mw
    size = hi - lo
    s = spec['height_m'] / size.z
    if max(size.x, size.y) * s > spec.get('max_footprint_m', 1e9):
        s = spec['max_footprint_m'] / max(size.x, size.y)
    root.scale = (s, s, s)
    root.location = (0, 0, 0)
    root.rotation_euler = (0, 0, math.radians(spec.get('rot_z_deg', 0)))
    bpy.context.view_layer.update()
    # library export at origin (bottom-centre pivot, metres)
    lib_dir = LIB / spec['id']
    lib_dir.mkdir(parents=True, exist_ok=True)
    select_only(hierarchy(root))
    bpy.ops.export_scene.gltf(filepath=str(lib_dir / 'model.glb'), export_format='GLB', use_selection=True)
    root.location = (spec['x'], spec['y'], 0)
    bpy.context.view_layer.update()
    lo2, hi2 = world_bbox(meshes)
    dims = [round(v, 4) for v in (hi2 - lo2)]
    materials = {s.material.name for o in meshes for s in o.material_slots if s.material}
    props[spec['id']] = {'root': root, 'lo': lo2, 'hi': hi2}
    metrics['props'].append({
        'id': spec['id'], 'source': spec['source'], 'raw_triangles': raw_tris, 'triangles': tris(meshes),
        'decimated': decimated, 'normals_recalc_would_flip': flipped, 'normals_recalc_applied': False, 'meshes': len(meshes),
        'materials': sorted(materials), 'scale_factor': round(s, 5), 'dimensions_m': dims,
        'bottom_z_m': round(lo2.z, 5), 'library_model': str((lib_dir / 'model.glb').relative_to(ROOT)),
    })

# ---------- procedural table, belts, cubes ----------
def material(name, color, rough=0.5, metal=0.0, emit=None, strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = strength
    return m


def wood():
    m = material('wood', (0.45, 0.24, 0.11), rough=0.45)
    nt = m.node_tree
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 6
    noise.inputs['Detail'].default_value = 8
    mapping = nt.nodes.new('ShaderNodeMapping')
    mapping.inputs['Scale'].default_value = (1, 18, 1)  # stretched grain
    coord = nt.nodes.new('ShaderNodeTexCoord')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.30, 0.14, 0.06, 1)
    ramp.color_ramp.elements[1].color = (0.58, 0.32, 0.15, 1)
    nt.links.new(coord.outputs['Object'], mapping.inputs['Vector'])
    nt.links.new(mapping.outputs['Vector'], noise.inputs['Vector'])
    nt.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
    return m


def box(name, center, size, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        m = o.modifiers.new('bevel', 'BEVEL')
        m.width = bevel
        m.segments = 3
    o.data.materials.append(mat)
    return o


t = layout['table']
box('table', (0, 0, -t['thickness_m'] / 2), (t['width_m'], t['depth_m'], t['thickness_m']), wood(), bevel=0.008)
belt_mat = material('belt', (0.05, 0.055, 0.065), rough=0.7)
leg_mat = material('leg', (0.12, 0.12, 0.14), rough=0.4, metal=0.6)
cube_mat = material('glow', (1.0, 0.45, 0.1), emit=(1.0, 0.5, 0.12), strength=6)
order = [p['id'] for p in sorted(layout['props'], key=lambda p: p['x'])]
bh = layout['belt']['height_m']
for a, b in zip(order, order[1:]):
    x0, x1 = props[a]['hi'].x + 0.005, props[b]['lo'].x - 0.005
    if x1 - x0 < 0.02:
        continue
    cx = (x0 + x1) / 2
    box(f'belt_{a}_{b}', (cx, 0, bh), (x1 - x0, layout['belt']['width_m'], 0.012), belt_mat, bevel=0.003)
    for lx in (x0 + 0.01, x1 - 0.01):
        box(f'leg_{a}_{b}_{lx:.2f}', (lx, 0, bh / 2), (0.008, layout['belt']['width_m'] * 0.8, bh), leg_mat)
    n = max(1, int((x1 - x0) / 0.05))
    for i in range(n):
        box(f'cube_{a}_{i}', (x0 + (i + 0.5) * (x1 - x0) / n, 0, bh + 0.013), (0.014, 0.014, 0.014), cube_mat)

# ---------- world, lights ----------
world = bpy.data.worlds.new('world')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.012, 0.013, 0.016, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0


def light(name, kind, loc, energy, color, size=0.5, target=(0, 0, 0.1)):
    d = bpy.data.lights.new(name, kind)
    d.energy = energy
    d.color = color
    if kind == 'AREA':
        d.size = size
    o = bpy.data.objects.new(name, d)
    scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o


light('key', 'AREA', (-0.9, -1.0, 1.3), 120, (1.0, 0.86, 0.7), size=0.8)
light('fill', 'AREA', (1.2, -0.8, 0.6), 30, (0.75, 0.82, 1.0), size=1.0)
light('rim', 'AREA', (0.2, 1.2, 0.9), 70, (1.0, 0.9, 0.8), size=0.6)

# ---------- cameras & render ----------
for engine in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT', 'CYCLES'):
    try:
        scene.render.engine = engine
        break
    except TypeError:
        continue
if scene.render.engine == 'CYCLES':
    scene.cycles.samples = 48
else:
    scene.eevee.taa_render_samples = 48
scene.render.resolution_x, scene.render.resolution_y = 1600, 1000
scene.view_settings.view_transform = 'AgX'
scene.render.film_transparent = False


def camera(name, loc, target, lens=50):
    d = bpy.data.cameras.new(name)
    d.lens = lens
    o = bpy.data.objects.new(name, d)
    scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o


cams = layout['cameras']
renders = []
for view in ('overview', 'closeup', 'low_angle'):
    c = cams[view]
    scene.camera = camera(view, c['loc'], c['target'], c.get('lens', 50))
    path = OUT / f'{view}.png'
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    renders.append(str(path.relative_to(ROOT)))

# wireframe view: same framing as overview, wire modifier + flat override material
scene.camera = bpy.data.objects['overview']
wire_mat = material('wire', (0.85, 0.88, 0.95), rough=0.8, emit=(0.6, 0.7, 0.9), strength=0.4)
for o in [o for o in scene.objects if o.type == 'MESH']:
    m = o.modifiers.new('wire', 'WIREFRAME')
    m.thickness = 0.0008 / max(o.matrix_world.to_scale())
    m.use_relative_offset = False
bpy.context.view_layer.material_override = wire_mat
scene.render.filepath = str(OUT / 'wireframe.png')
bpy.ops.render.render(write_still=True)
renders.append(str((OUT / 'wireframe.png').relative_to(ROOT)))
bpy.context.view_layer.material_override = None
for o in [o for o in scene.objects if o.type == 'MESH']:
    o.modifiers.remove(o.modifiers['wire'])

# ---------- save, export, re-import ----------
scene_dir = LIB / 'workshop-scene'
scene_dir.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'scene.blend'))
for name in ('overview', 'closeup', 'low_angle', 'key', 'fill', 'rim'):
    bpy.data.objects[name].select_set(False)
select_only([o for o in scene.objects if o.type in {'MESH', 'EMPTY'}])
bpy.ops.export_scene.gltf(filepath=str(scene_dir / 'scene.glb'), export_format='GLB', use_selection=True)
scene_tris = tris([o for o in scene.objects if o.type == 'MESH'])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(scene_dir / 'scene.glb'))
re_meshes = [o for o in bpy.data.objects if o.type == 'MESH']
metrics['checks'] = {
    'scene_triangles': scene_tris,
    'reimport_meshes': len(re_meshes),
    'reimport_triangles': tris(re_meshes),
    'reimport_images': len([i for i in bpy.data.images if i.size[0] > 0]),
    'blend_saved': (OUT / 'scene.blend').exists(),
}
metrics['renders'] = renders
metrics['scene_model'] = str((scene_dir / 'scene.glb').relative_to(ROOT))
metrics['seconds'] = round(time.time() - metrics.pop('started'), 1)
(OUT / 'blender_metrics.json').write_text(json.dumps(metrics, indent=2, ensure_ascii=False))
print('METRICS', json.dumps(metrics['checks']))
