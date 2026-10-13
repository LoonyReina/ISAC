#!/usr/bin/env python3
"""Read-only verification of runtime or full frozen bytes; never repairs evidence."""
import argparse, hashlib, json, pathlib, sys
p=argparse.ArgumentParser();p.add_argument('--runtime',action='store_true');args=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]
manifest=root/('RUNTIME-MANIFEST.json' if args.runtime else 'ARTIFACT-MANIFEST.json')
x=json.loads(manifest.read_text());errors=[];seen=set()
for row in x['files']:
    rel=pathlib.PurePosixPath(row['path'])
    if rel.is_absolute() or '..' in rel.parts or row['path'] in seen:
        errors.append('invalid or duplicate path '+row['path']);continue
    seen.add(row['path']);f=root.joinpath(*rel.parts)
    if not f.is_file() or f.is_symlink():errors.append('missing/nonregular '+str(rel));continue
    b=f.read_bytes()
    if len(b)!=row['bytes'] or hashlib.sha256(b).hexdigest()!=row['sha256']:errors.append('bytes changed '+str(rel))
canonical=json.dumps({'schema_version':x['schema_version'],'scope':x['scope'],'source':x['source'],'files':x['files']},sort_keys=True,separators=(',',':')).encode()
if hashlib.sha256(canonical).hexdigest()!=x['freeze_id']:errors.append('manifest freeze_id inconsistent')
print(json.dumps({'passed':not errors,'scope':x['scope'],'files':len(seen),'freeze_id':x['freeze_id'],'errors':errors},indent=2))
sys.exit(bool(errors))
