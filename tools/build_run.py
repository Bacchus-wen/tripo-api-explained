#!/usr/bin/env python3
"""Assemble runs/2026-10-15-001/run.json from the real ledgers, QA reports, Blender metrics and critic review."""
import hashlib
import json
import os
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUN = ROOT / 'runs' / '2026-10-15-001'
sys.path.insert(0, '/Users/wenbin/Desktop/游戏产线配置/tools')
import tripo_api  # noqa: E402

B = lambda zh, en: {'zh': zh, 'en': en}  # noqa: E731
NAMES = {'printer': B('Tripo 打印机', 'Tripo printer'), 'workbench': B('Blender 工作台', 'Blender workbench'),
         'critic': B('四机位评审台', 'Four-camera critic rig'), 'shelf': B('资产库货架', 'Library shelf')}
rel = lambda p: str(Path(p).resolve().relative_to(ROOT))  # noqa: E731
load = lambda p: json.loads(Path(p).read_text()) if Path(p).exists() else None  # noqa: E731

os.environ.setdefault('ASSET_TRIPO_KEYCHAIN_SERVICE', 'game-assets.tripo')
os.environ.setdefault('ASSET_TRIPO_KEYCHAIN_ACCOUNT', 'default')
client = tripo_api.TripoClient(tripo_api._cli_credential(), timeout=30)


def task_facts(task_id):  # free GET: real credits and timing
    try:
        t = client.query(task_id)
    except tripo_api.TripoError:
        return {}
    out = {'credits': t.get('credits_consumed')}
    if t.get('created_at') and t.get('completed_at'):
        a, b = (datetime.fromisoformat(t[k].replace('Z', '+00:00')) for k in ('created_at', 'completed_at'))
        out['seconds'] = round((b - a).total_seconds(), 1)
    return out


steps, assets = [], []
order = 'orders/2026-10-15-001.json'
steps.append({'module': 'order-brief', 'asset': None, 'status': 'ok',
              'summary': B('一句需求拆成 4 个 Tripo 道具 + 程序化桌面，写明尺寸、面数和预算（图片 6 张、建模 5 次）。',
                           'One request split into 4 Tripo props + a procedural table, with sizes, face budgets and a budget (6 images, 5 models).'),
              'artifacts': [{'kind': 'json', 'path': order, 'label': B('订单 JSON', 'Order JSON')}]})

concept = load(ROOT / 'assets/generated/tripo-images/workshop-concept-v2/record.json')
f = task_facts(concept['task_id'])
steps.append({'module': 'concept-art', 'asset': None, 'status': 'ok',
              'summary': B('Tripo text-to-image 出整体概念图，用户签字通过。另一个国内图片网关在开 VPN 时连不上，于是整条图片链路改走 Tripo 官方 API。',
                           'Tripo text-to-image made the whole-scene concept; the user signed it off. A China-only image gateway failed behind a VPN, so all image work moved to the official Tripo API.'),
              'artifacts': [{'kind': 'image', 'path': concept['image'], 'label': B('整体概念图', 'Scene concept')}],
              'metrics': {'model': 'chat_image_2.5_flare', 'size': '1536x1024', 'seconds': f.get('seconds'), 'credits': f.get('credits')},
              'cost': {'kind': 'tripo-image', 'credits': f.get('credits') or 0}})

ref_art, ref_credits, rejections = [], 0, 0
for p in NAMES:
    r = load(ROOT / f'assets/generated/tripo-images/prop-{p}-ref-v1/record.json')
    rejections += len(r.get('rejections', [])) + (1 if r.get('http_status') == 429 else 0)
    if r.get('image'):
        ref_art.append({'kind': 'image', 'path': r['image'], 'label': NAMES[p]})
        ref_credits += task_facts(r['task_id']).get('credits') or 0
steps.append({'module': 'concept-art', 'asset': None, 'status': 'warn' if rejections else 'ok',
              'summary': B(f'image-to-image 直接把概念图的 task_id 当输入，抽出 4 张道具参考图，风格一致。期间被并发限制（429 / code 2000）拒绝 {rejections} 次，没有扣费，改成排队提交。',
                           f'image-to-image took the concept task_id directly as input and extracted 4 matching prop references. The concurrency limit (429 / code 2000) rejected {rejections} submissions — nothing was charged — so they were queued.'),
              'artifacts': ref_art, 'metrics': {'model': 'chat_image_2.5_flare', 'images': len(ref_art), 'rejected_429': rejections, 'credits': ref_credits},
              'cost': {'kind': 'tripo-image', 'credits': ref_credits}})

blender = load(RUN / 'blender' / 'blender_metrics.json') or {'props': [], 'checks': {}, 'renders': []}
bprops = {x['id']: x for x in blender['props']}
for p in NAMES:
    aid = f'workshop-{p}'
    gen = load(ROOT / 'assets/generated/models' / ('tripo-' + hashlib.sha256(f'workshop-{p}-model-v1'.encode()).hexdigest()[:24]) / 'generation.json')
    if not gen:
        steps.append({'module': 'tripo-generate', 'asset': aid, 'status': 'skipped',
                      'summary': B('没有在时限内完成，场景里用程序化工位代替。', 'Did not finish in time; a procedural station stands in.')})
        continue
    done = gen.get('status') == 'downloaded_pending_review'
    f = task_facts(gen['task_id']) if gen.get('task_id') else {}
    raw = gen.get('model_path') or gen.get('model')
    raw = raw if raw and str(raw).endswith('.glb') else str(Path(gen.get('run_dir', '')) / 'model.glb')
    raw_rel = rel(ROOT / raw) if (ROOT / raw).exists() else None
    lib = bprops.get(aid, {})
    assets.append({'id': aid, 'name': NAMES[p], 'route': 'tripo', 'model': lib.get('library_model') or raw_rel})
    steps.append({'module': 'tripo-generate', 'asset': aid, 'status': 'ok' if done else 'fail',
                  'summary': B('参考图上传后用 v3.1 图生 3D，带 PBR 贴图、face_limit 10000、导出 UV。',
                               'Reference uploaded, then v3.1 image-to-3D with PBR textures, face_limit 10000 and UVs.'),
                  'artifacts': ([{'kind': 'model', 'path': raw_rel, 'label': B('Tripo 原始模型', 'Raw Tripo model')}] if raw_rel else []),
                  'metrics': {'model': 'v3.1-20260211', 'seconds': f.get('seconds'), 'credits': f.get('credits')},
                  'cost': {'kind': 'tripo-model', 'credits': f.get('credits') or 0}})
    qa = load(RUN / 'qa' / f'{aid}.json')
    if qa:
        status = qa.get('status', 'unknown')
        steps.append({'module': 'structure-qa', 'asset': aid, 'status': {'pass': 'ok', 'warning': 'warn'}.get(status, 'fail'),
                      'summary': B(f'Grok 的 inspect_asset.py 只读检查：结果 {status}，警告 {len(qa.get("warnings", []))} 条。',
                                   f'Grok’s read-only inspect_asset.py: {status}, {len(qa.get("warnings", []))} warning(s).'),
                      'artifacts': [{'kind': 'json', 'path': rel(RUN / 'qa' / f'{aid}.json'), 'label': B('QA 报告', 'QA report')}],
                      'metrics': {**(qa.get('model') or {}).get('counts', {}), 'uv_sets': len((qa.get('model') or {}).get('uv_sets', [])),
                                  'not_checked': len(qa.get('not_checked', []))}})

if blender['props']:
    c = blender['checks']
    steps.append({'module': 'blender-cleanup', 'asset': None, 'status': 'ok' if c.get('blend_saved') and c.get('reimport_meshes') else 'warn',
                  'summary': B('无界面 Blender：按平面图统一米制尺寸、轴心放到底部、统一法线、程序化生成桌面和传送带，组装后导出 glb 并重新导入验证。',
                               'Headless Blender: real-metre scale from the floor plan, bottom-centre pivots, consistent normals, procedural table and belts, then export and re-import to verify.'),
                  'artifacts': [{'kind': 'image', 'path': 'runs/2026-10-15-001/layout.svg', 'label': B('俯视平面图（米）', 'Top-down plan (m)')}]
                  + [{'kind': 'model', 'path': x['library_model'], 'label': NAMES[x['id'].split('-')[1]]} for x in blender['props']],
                  'metrics': {'scene_triangles': c.get('scene_triangles'), 'reimport_triangles': c.get('reimport_triangles'),
                              'reimport_meshes': c.get('reimport_meshes'), 'seconds': blender.get('seconds'), 'blender': blender.get('blender')}})

critic = load(RUN / 'critic.json')
if critic:
    steps.append({'module': 'visual-critic', 'asset': None, 'status': 'ok' if critic['score'] >= 9 else 'warn',
                  'summary': B(f'独立评审代理看四视角图打分 {critic["score"]}/10。{critic["summary"]["zh"]}', f'An independent critic scored the four views {critic["score"]}/10. {critic["summary"]["en"]}'),
                  'artifacts': [{'kind': 'image', 'path': r, 'label': B(n, n)} for r, n in zip(blender['renders'], ['overview', 'closeup', 'low angle', 'wireframe'])],
                  'metrics': {'score': f'{critic["score"]}/10', 'verdict': critic.get('verdict'),
                              **{f'flaw_{i + 1}': x['en'] for i, x in enumerate(critic.get('flaws', [])[:4])}}})

if blender.get('scene_model'):
    steps.append({'module': 'asset-library', 'asset': None, 'status': 'ok',
                  'summary': B('4 个清理后的道具和组装好的场景写入资产库，每个带 meta.json。', 'Four cleaned props and the assembled scene stored in the library, each with meta.json.'),
                  'artifacts': [{'kind': 'model', 'path': blender['scene_model'], 'label': B('组装好的场景', 'Assembled scene')}]})
steps.append({'module': 'web-threejs', 'asset': None, 'status': 'ok',
              'summary': B('这个网站读取运行记录和资产库，在浏览器里回放整个过程。', 'This site reads the run record and library and replays the whole process in the browser.')})

run = {'order_id': '2026-10-15-001', 'title': B('AI 产线微缩车间：一次真实运行', 'AI Pipeline Workshop: one real run'),
       'note': B('这是参考案例。所有数字来自真实调用；没跑通或效果不好的地方如实标出，网站里的功能演示另用 three.js 模拟。',
                 'A reference case. Every number comes from real calls; anything that failed or looks weak is marked honestly. The feature demos elsewhere on this site are simulated in three.js.'),
       'status': 'complete' if all(s['status'] in {'ok', 'warn'} for s in steps) else 'partial',
       'assets': assets,
       'scene': {'model': blender.get('scene_model'), 'renders': blender.get('renders', [])},
       'steps': steps}
(RUN / 'run.json').write_text(json.dumps(run, ensure_ascii=False, indent=1))
print('steps', len(steps), 'status', run['status'])
