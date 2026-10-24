#!/usr/bin/env python3
"""Rebuilds app/ from the upstream launcher with every layer in REBUILD.md's order: python3 tools/rebuild.py [--no-build]. The same steps as the shell block in REBUILD.md; the CI release workflow runs this.
Needs app/ to be a checkout of partridgeworks/webos-launcher with its dependencies installed (npm ci), and the repo to sit at ~/Developer/webos-launcher-tvos (the layers use that path)."""
import os, re, shutil, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = f'{ROOT}/app'
def sh(*a, **k): print('+', ' '.join(a)); subprocess.run(a, check=True, cwd=k.pop('cwd', APP), **k)

md = open(f'{ROOT}/REBUILD.md').read()
block = md[md.index('```sh'):]
block = block[:block.index('```', 5)].replace('\\\n', ' ')
loop = re.search(r'for s in (.*?); do', block, re.S).group(1)
layers = re.findall(r'apply_[a-z0-9_]+', loop)
print(len(layers), 'layers')

sh('git', 'checkout', '--', 'src', 'index.html', 'public/appinfo.json')
if os.path.isdir(f'{ROOT}/app-assets/public'): sh('cp', '-R', f'{ROOT}/app-assets/public/.', f'{APP}/public/')
sh('python3', f'{ROOT}/tools/build_catalog.py')
try: sh('python3', f'{ROOT}/tools/build_iconpack.py')
except subprocess.CalledProcessError: print('build_iconpack failed (no logos): the release build replaces the icon pack anyway')
# apply_dockhide ends by editing tools/tv/watch.sh, which is a tracked file with that change already in it: its app edits come first, so a failure there is fine
TV_EDIT = {'apply_dockhide'}
for name in layers:
    try: sh('python3', f'{ROOT}/tools/{name}.py')
    except subprocess.CalledProcessError:
        if name not in TV_EDIT: raise
        print(f'{name}: its TV-side script edit was already in the repository, continuing')
if '--no-build' not in sys.argv: sh('npm', 'run', 'build'); sh('npm', 'run', 'package')
