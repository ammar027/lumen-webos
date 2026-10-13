#!/usr/bin/env python3
"""Run on your own TV: export-icons.py /tmp/lumen-icons; copy that directory to your PC.
Exports personal app artwork only; never commit exported artwork to this repository.
"""
import argparse,json,re,shutil
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('output',type=Path);out=p.parse_args().output
out.mkdir(parents=True,exist_ok=True);rows=[];seen=set()
for base in ['/media/developer/apps/usr/palm/applications','/media/cryptofs/apps/usr/palm/applications','/usr/palm/applications','/media/system/apps/usr/palm/applications','/mnt/otncabi/usr/palm/applications','/mnt/otycabi/usr/palm/applications']:
 for manifest in Path(base).glob('*/appinfo.json'):
  try:
   app=json.loads(manifest.read_text());id=app['id']
   if id in seen or not re.fullmatch(r'[A-Za-z0-9_.-]+',id):continue
   icon=app.get('largeIcon') or app.get('icon')
   if not icon:continue
   source=Path(icon) if icon.startswith('/') else manifest.parent/icon
   if not source.is_file():continue
   name=id+source.suffix.lower();shutil.copyfile(source,out/name);seen.add(id)
   rows.append({'id':id,'title':app.get('title',id),'file':name,'color':app.get('iconColor')})
  except (ValueError,OSError,KeyError):continue
(out/'manifest.json').write_text(json.dumps(rows,indent=2)+'\n');print(len(rows),'icons exported')
