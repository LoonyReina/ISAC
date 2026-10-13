"""Verify local raw binary parts and reconstruct an exact frozen evidence archive.
Usage: python reassemble-ofdm-ici-evidence.py MANIFEST.parts.json [OUTPUT_DIRECTORY]
No network, dependencies, recompression or overwrite. Download all listed parts
alongside the manifest before running. The full JavaScript evidence manifest is supplied alongside four raw parts.
"""
from pathlib import Path
import hashlib,json,os,sys,tempfile

def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
 return h.hexdigest()
def insist(ok,why):
 if not ok: raise ValueError(why)
if len(sys.argv) not in (2,3): raise SystemExit(__doc__)
manifest=Path(sys.argv[1]).resolve();m=json.loads(manifest.read_text());base=manifest.parent
insist(m.get('schemaVersion')==1,'Unsupported manifest schema')
insist(Path(m['archiveFile']).name==m['archiveFile'] and m['archiveFile'].endswith('.zip'),'Invalid archive filename')
insist(isinstance(m['parts'],list) and m['parts'],'Missing parts')
seen=set()
for i,r in enumerate(m['parts'],1):
 insist(r['order']==i and Path(r['file']).name==r['file'] and r['file'] not in seen,'Invalid or duplicate part ordering/name')
 seen.add(r['file']);p=base/r['file']
 insist(0<r['bytes']<=9000000,'Part exceeds transfer envelope')
 insist(p.stat().st_size==r['bytes'] and digest(p)==r['sha256'],'Part verification failed: '+r['file'])
insist(sum(r['bytes'] for r in m['parts'])==m['archiveBytes'],'Archive byte sum mismatch')
destination=Path(sys.argv[2]).resolve() if len(sys.argv)==3 else base
insist(destination.is_dir(),'Output directory must already exist');out=destination/m['archiveFile']
if out.exists():
 insist(out.stat().st_size==m['archiveBytes'] and digest(out)==m['archiveSha256'],'Existing archive differs; never overwritten')
 print('Already reconstructed and SHA256 verified:',out);raise SystemExit(0)
fd,name=tempfile.mkstemp(prefix=m['archiveFile']+'.assembling-',dir=destination);tmp=Path(name)
try:
 with os.fdopen(fd,'wb') as target:
  for r in m['parts']:
   with (base/r['file']).open('rb') as source:
    for chunk in iter(lambda:source.read(1024*1024),b''):target.write(chunk)
 insist(tmp.stat().st_size==m['archiveBytes'] and digest(tmp)==m['archiveSha256'],'Reconstructed hash mismatch')
 # Hard-link creation is atomic and fails if another writer creates out.
 os.link(tmp,out)
 print('Reconstructed and SHA256 verified:',out)
finally:
 tmp.unlink(missing_ok=True)
