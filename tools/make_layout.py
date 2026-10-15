#!/usr/bin/env python3
"""Write runs/<order>/layout.json (top-down plan in metres) using whichever Tripo props are downloaded."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUN = ROOT / 'runs' / '2026-10-15-001'
PLAN = [  # id, x (m), height (m)
    ('printer', -0.55, 0.28),
    ('workbench', -0.18, 0.22),
    ('critic', 0.18, 0.26),
    ('shelf', 0.55, 0.40),
]
ROT = {'printer': -90, 'shelf': -90}
props = []
for pid, x, h in PLAN:
    op = f'workshop-{pid}-model-v1'
    glb = ROOT / 'assets/generated/models' / ('tripo-' + hashlib.sha256(op.encode()).hexdigest()[:24]) / 'model.glb'
    if glb.exists():
        props.append({'id': f'workshop-{pid}', 'source': str(glb.relative_to(ROOT)), 'x': x, 'y': 0.0,
                      'height_m': h, 'max_footprint_m': 0.3, 'max_tris': 40000, 'rot_z_deg': ROT.get(pid, 0)})
layout = {
    'units': 'metres (miniature diorama)',
    'table': {'width_m': 1.5, 'depth_m': 0.55, 'thickness_m': 0.04},
    'belt': {'height_m': 0.045, 'width_m': 0.06},
    'props': props,
    'cameras': {
        'overview': {'loc': [0.95, -1.4, 0.85], 'target': [0, 0, 0.12], 'lens': 40},
        'closeup': {'loc': [-0.8, -0.6, 0.38], 'target': [-0.55, 0, 0.13], 'lens': 50},
        'low_angle': {'loc': [0.05, -1.45, 0.06], 'target': [0, 0, 0.09], 'lens': 35},
    },
}
RUN.mkdir(parents=True, exist_ok=True)
(RUN / 'layout.json').write_text(json.dumps(layout, indent=2))
# 2D plan for the site (top-down, metres)
s = 500  # px per metre
w, d = layout['table']['width_m'], layout['table']['depth_m']
rects = ''.join(
    f'<rect x="{(p["x"] + w / 2 - 0.14) * s:.0f}" y="{(d / 2 - 0.14) * s:.0f}" width="{0.28 * s:.0f}" height="{0.28 * s:.0f}" rx="8" fill="none" stroke="#ffb347" stroke-width="2"/>'
    f'<text x="{(p["x"] + w / 2) * s:.0f}" y="{d / 2 * s + 4:.0f}" fill="#ece9e3" font-size="16" text-anchor="middle">{p["id"].split("-")[1]} · h {p["height_m"]} m</text>'
    for p in props)
grid = ''.join(f'<line x1="{i * 0.1 * s:.0f}" y1="0" x2="{i * 0.1 * s:.0f}" y2="{d * s:.0f}" stroke="#2c313a"/>' for i in range(int(w * 10) + 1))
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 {w * s + 20:.0f} {d * s + 40:.0f}">'
       f'<rect width="{w * s:.0f}" height="{d * s:.0f}" fill="#3a2a1e" rx="10"/>{grid}'
       f'<line x1="0" y1="{d / 2 * s:.0f}" x2="{w * s:.0f}" y2="{d / 2 * s:.0f}" stroke="#555" stroke-width="18" opacity=".5"/>{rects}'
       f'<text x="0" y="{d * s + 26:.0f}" fill="#9a9fa8" font-size="14">1.5 m × 0.55 m · grid 0.1 m</text></svg>')
(RUN / 'layout.svg').write_text(svg)
print(json.dumps([p['id'] for p in props]))
