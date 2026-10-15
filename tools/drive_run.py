#!/usr/bin/env python3
"""Drive prop references -> Tripo image-to-model for run 2026-10-15-001 until done or deadline.

One paid image-to-model submission per prop at most (tripo_api.py dedupes by operation_id).
"""
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRIPO = '/Users/wenbin/Desktop/游戏产线配置/tools/tripo_api.py'
ENV = {'ASSET_TRIPO_KEYCHAIN_SERVICE': 'game-assets.tripo', 'ASSET_TRIPO_KEYCHAIN_ACCOUNT': 'default',
       'PATH': '/usr/bin:/bin:/usr/local/bin'}
PROPS = ['printer', 'workbench', 'critic', 'shelf']
PARAMS = json.dumps({'texture': True, 'pbr': True, 'face_limit': 10000, 'export_uv': True})
DEADLINE = time.time() + float(sys.argv[1] if len(sys.argv) > 1 else 900)
STATE = ROOT / 'runs' / '2026-10-15-001' / 'drive_state.json'
STATE.parent.mkdir(parents=True, exist_ok=True)


def sh(args):
    r = subprocess.run(args, capture_output=True, text=True, env=ENV, cwd=ROOT)
    try:
        return json.loads(r.stdout[r.stdout.index('{'):])
    except ValueError:
        return {'status': 'cli_error', 'stderr': r.stderr[-400:]}


def ref_record(p):
    return json.loads((ROOT / f'assets/generated/tripo-images/prop-{p}-ref-v1/record.json').read_text())


models = {}
while time.time() < DEADLINE:
    for p in PROPS:
        if p in models and models[p].get('status') in {'downloaded_pending_review', 'failed', 'cancelled', 'banned', 'expired'}:
            continue
        rec = ref_record(p)
        if rec['status'] == 'submission_rejected' and rec.get('http_status') == 429:
            body = json.dumps(rec['request']['body'])
            sh(['python3', 'tools/tripo_image.py', 'submit', '--project', str(ROOT), '--operation-id', rec['operation_id'],
                '--kind', 'image', '--input-task', rec['request']['input_task'], '--body', body, '--execute'])
            continue
        if rec['status'] in {'submitted', 'waiting', 'query_error'}:
            sh(['python3', 'tools/tripo_image.py', 'resume', '--project', str(ROOT), '--operation-id', rec['operation_id'],
                '--wait-seconds', '5'])
            continue
        if rec['status'] != 'downloaded':
            continue
        op = f'workshop-{p}-model-v1'
        image = str(ROOT / rec['image'])
        if p not in models:
            models[p] = sh(['python3', TRIPO, 'run', '--project', str(ROOT), '--image', image, '--model', 'v3.1-20260211',
                            '--operation-id', op, '--params', PARAMS, '--execute', '--wait-seconds', '0'])
        else:
            models[p] = sh(['python3', TRIPO, 'resume', '--project', str(ROOT), '--operation-id', op,
                            '--execute', '--wait-seconds', '0'])
    STATE.write_text(json.dumps({'at': time.time(), 'refs': {p: ref_record(p)['status'] for p in PROPS},
                                 'models': models}, indent=1, ensure_ascii=False))
    if all(models.get(p, {}).get('status') == 'downloaded_pending_review' for p in PROPS):
        break
    time.sleep(12)
print(STATE.read_text())
