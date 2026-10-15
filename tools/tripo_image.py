#!/usr/bin/env python3
"""Tripo V3 image generation (text-to-image / image-to-image) with a local operation ledger.

Reuses the verified transport and credential resolution from game-assets' tripo_api.py.
A paid POST is sent at most once per operation_id; resume only queries the saved task.
"""
import argparse
import hashlib
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, '/Users/wenbin/Desktop/游戏产线配置/tools')
import tripo_api  # noqa: E402

TERMINAL_FAIL = {'failed', 'cancelled', 'banned', 'expired'}
ENDPOINTS = {'text': '/generation/text-to-image', 'image': '/generation/image-to-image'}


def _record_path(project, operation_id):
    tripo_api._identifier(operation_id, 'operation_id')
    return Path(project) / 'assets' / 'generated' / 'tripo-images' / operation_id / 'record.json'


def _save(path, record):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.part')
    tmp.write_text(json.dumps(record, ensure_ascii=False, indent=2))
    os.replace(tmp, path)


def _client():
    os.environ.setdefault('ASSET_TRIPO_KEYCHAIN_SERVICE', 'game-assets.tripo')
    os.environ.setdefault('ASSET_TRIPO_KEYCHAIN_ACCOUNT', 'default')
    return tripo_api.TripoClient(tripo_api._cli_credential(), timeout=60)


def submit(project, operation_id, kind, body, input_file=None, input_task=None):
    path = _record_path(project, operation_id)
    request = {'kind': kind, 'body': body, 'input_file': input_file, 'input_task': input_task}
    request_sha = hashlib.sha256(json.dumps(request, sort_keys=True).encode()).hexdigest()
    history = []
    if path.exists():
        record = json.loads(path.read_text())
        if record['request_sha256'] != request_sha:
            raise SystemExit('operation_id already used with a different request; choose a new id deliberately.')
        # A 429 is a definite server-side rejection (no task created), so it may be sent again.
        if not (record['status'] == 'submission_rejected' and record.get('http_status') == 429):
            return record  # never resubmit
        history = record.get('rejections', []) + [{k: record.get(k) for k in ('submitted_at', 'http_status', 'code')}]
    record = {'operation_id': operation_id, 'request': request, 'request_sha256': request_sha,
              'status': 'submitting', 'submitted_at': tripo_api._now(), 'rejections': history}
    _save(path, record)
    client = _client()
    payload = dict(body)
    try:
        if kind == 'image':
            if input_file:
                payload['input'] = client.upload_image(input_file)
            elif input_task:
                payload['input'] = input_task
        data = client._api('POST', ENDPOINTS[kind], json.dumps(payload).encode())
        task_id = data.get('task_id')
        if not isinstance(task_id, str):
            raise tripo_api.TripoError('No task_id returned.', uncertain=True)
        record.update(status='submitted', task_id=task_id)
    except tripo_api.TripoError as error:
        record.update(status='submission_unknown' if error.uncertain else 'submission_rejected',
                      error=str(error), http_status=error.http_status, code=error.code)
    _save(path, record)
    return record


def _download(url, dest):
    parsed = urllib.parse.urlsplit(url)
    host = (parsed.hostname or '').lower()
    if parsed.scheme != 'https' or not (host.endswith('.tripo3d.com') or host.endswith('.tripo3d.ai')):
        raise tripo_api.TripoError(f'Unexpected output host: {host}')
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), tripo_api._NoRedirect())
    with opener.open(urllib.request.Request(url, headers={'Accept': 'image/*'}), timeout=120) as response:
        data = response.read(64 * 1024 * 1024)
    part = dest.with_suffix('.part')
    part.write_bytes(data)
    info = tripo_api.validate_image(str(part))
    final = dest.with_suffix(info['suffix'])
    os.replace(part, final)
    return final, info


def resume(project, operation_id, wait_seconds=180, poll=3):
    path = _record_path(project, operation_id)
    record = json.loads(path.read_text())
    if not record.get('task_id'):
        return record
    if record['status'] == 'downloaded':
        return record
    client = _client()
    deadline = time.monotonic() + wait_seconds
    while True:
        try:
            task = client.query(record['task_id'])
        except tripo_api.TripoError as error:
            record.update(status='query_error', error=str(error))
            break
        status = task['status']
        record['remote_status'] = status
        record['progress'] = task.get('progress')
        if status == 'success':
            url = (task.get('output') or {}).get('generated_image_url')
            final, info = _download(url, path.parent / 'image')
            record.update(status='downloaded', image=str(final.relative_to(project)), sha256=info['sha256'],
                          credits_consumed=task.get('credits_consumed'),
                          created_at=task.get('created_at'), completed_at=task.get('completed_at'))
            break
        if status in TERMINAL_FAIL:
            record.update(status=status, error=task.get('error_message'))
            break
        if time.monotonic() >= deadline:
            record['status'] = 'waiting'
            break
        time.sleep(poll)
    _save(path, record)
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    s = sub.add_parser('submit')
    s.add_argument('--project', required=True)
    s.add_argument('--operation-id', required=True)
    s.add_argument('--kind', choices=sorted(ENDPOINTS), required=True)
    s.add_argument('--body', required=True, help='JSON request body without input')
    s.add_argument('--input-file')
    s.add_argument('--input-task')
    s.add_argument('--execute', action='store_true')
    r = sub.add_parser('resume')
    r.add_argument('--project', required=True)
    r.add_argument('--operation-id', required=True)
    r.add_argument('--wait-seconds', type=float, default=180)
    args = parser.parse_args()
    if args.command == 'submit':
        if not args.execute:
            print(json.dumps({'plan': ENDPOINTS[args.kind], 'body': json.loads(args.body)}, ensure_ascii=False))
            return
        out = submit(args.project, args.operation_id, args.kind, json.loads(args.body),
                     args.input_file, args.input_task)
    else:
        out = resume(args.project, args.operation_id, args.wait_seconds)
    print(json.dumps({k: v for k, v in out.items() if k != 'request'}, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
