"""Reassemble the optional exact source-free reference; never run during page startup."""
import hashlib,json,pathlib,sys
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '.')
manifest=next((p for p in [root/'data/cellfree-maprt-evidence-map.json',root/'assets/data/cellfree-maprt-evidence-map.json'] if p.exists()),None)
if manifest is None: raise SystemExit('Supply the repository or downloaded public-site root')
e=json.loads(manifest.read_text());a=next(x for x in e['archives'] if x['name'].endswith('.tar.gz'))
out=pathlib.Path(sys.argv[2] if len(sys.argv)>2 else a['name'])
if out.exists():raise SystemExit('Output already exists; choose a new destination')
chunks=[]
for p in a['parts']:
 source=root/p['public'];source=source if source.exists() else root/p['source'];v=source.read_bytes()
 assert len(v)==p['bytes'] and hashlib.sha256(v).hexdigest()==p['sha256'],source
 chunks.append(v)
data=b''.join(chunks);assert len(data)==a['bytes'] and hashlib.sha256(data).hexdigest()==a['sha256']
with out.open('xb') as f:f.write(data)
print(str(out),len(data),a['sha256'])
