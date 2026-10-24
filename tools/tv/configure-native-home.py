#!/usr/bin/env python3
"""Configure an ALREADY INSTALLED compatible lginput-hook.so; does not inject libraries.
Home codes 125/773/774 use action=launch/id, rather than unsupported exec/command.
"""
import argparse,json,os,shutil,time
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--bindings',type=Path,default=Path('/home/root/.config/lginputhook/keybinds.json'))
p.add_argument('--restore',type=Path,help='restore a backup created by this tool')
a=p.parse_args();path=a.bindings
if a.restore: data=json.loads(a.restore.read_text())
else:
 data=json.loads(path.read_text())
 backup=path.with_name(path.name+'.lumen-backup-'+str(time.time_ns()));shutil.copy2(path,backup);print('Backup:',backup)
 for code in ['125','773','774']:data[code]={'action':'launch','id':'com.ammar027.lumen'}
# The native parser scans numeric JSON keys/strings; a numeric reload value before
# the first mapping can be mistaken for a key code. Put a nonnumeric marker last.
data.pop('reload',None);data['reload']='lumen-'+str(time.time_ns())
tmp=path.with_name(path.name+'.lumen-tmp');tmp.write_text(json.dumps(data,indent=2)+'\n');tmp.chmod(0o600);os.replace(tmp,path)
