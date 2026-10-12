"""Verify/downloaded local binary parts and rebuild the exact original archive.
Usage: python reassemble-reference.py [directory-containing-this-script-and-parts]
No network or third-party dependency. Existing files are never overwritten.
"""
from pathlib import Path
import hashlib,json,sys
p=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parent
m=json.loads((p/'joint-beamforming-reference-v1.parts.json').read_text())
def digest(file):
 h=hashlib.sha256()
 with file.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
for i,r in enumerate(m['parts'],1):
 assert r['order']==i and Path(r['file']).name==r['file'],'Invalid part ordering/name'
 f=p/r['file']
 assert f.stat().st_size==r['bytes'] and digest(f)==r['sha256'],'Part verification failed: '+r['file']
out=p/m['archiveFile']
assert Path(m['archiveFile']).name==m['archiveFile'],'Invalid archive name'
if out.exists():
 assert out.stat().st_size==m['archiveBytes'] and digest(out)==m['archiveSha256'],'Existing archive differs; no overwrite performed'
 print('Already reconstructed and verified:',out);raise SystemExit(0)
tmp=out.with_name(out.name+'.assembling')
with tmp.open('xb') as target:
 for r in m['parts']:
  with (p/r['file']).open('rb') as source:
   for b in iter(lambda:source.read(1024*1024),b''):target.write(b)
assert tmp.stat().st_size==m['archiveBytes'] and digest(tmp)==m['archiveSha256'],'Reconstructed archive hash mismatch'
assert not out.exists(),'Output appeared during reconstruction; no overwrite performed'
tmp.rename(out)
print('Reconstructed and SHA256-verified:',out)
