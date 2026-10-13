from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]
for filename in ['MANIFEST.json','RUNTIME-MANIFEST.json']:
 data=json.loads((root/filename).read_text()); failures=[]
 for item in data['files']:
  p=root/item['path']
  if not p.is_file() or p.stat().st_size!=item['bytes'] or hashlib.sha256(p.read_bytes()).hexdigest()!=item['sha256']:failures.append(item['path'])
 assert not failures,(filename,failures)
 print(filename,len(data['files']),'hashes pass')
