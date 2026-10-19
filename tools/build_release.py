#!/usr/bin/env python3
"""Builds the .ipk that is published on GitHub Releases: the same app, minus anything that belongs to other people. Run the normal pipeline first (REBUILD.md),
then: python3 tools/build_release.py   -> release/com.ammar027.lumen_<version>_all.ipk
Differences from your own build: no third-party app logos/icon tiles (apps without an icon get a plain tile), and five public-domain paintings
(Cleveland Museum of Art, CC0) as the bundled wallpapers instead of photographs from Reddit."""
import glob, json, os, re, shutil, subprocess, sys, urllib.parse
from release_checksums import write_checksums
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
APP = f'{ROOT}/app'
REL = '/tmp/lumen-release'
FF = f'{ROOT}/tools/node_modules/ffmpeg-static/ffmpeg'
WALLPAPERS = [  # (Cleveland accession path, title)
    ('1947.198/1947.198_print.jpg', 'View of Lake Pepin, Minnesota - Robert S. Duncanson'),
    ('1946.255/1946.255_print.jpg', 'View near Newport - John Frederick Kensett'),
    ('1964.289/1964.289_print.jpg', 'Sunset on the River Oise - Charles-Francois Daubigny'),
    ('1917.67/1917.67_print.jpg', 'Landscape - Jasper F. Cropsey'),
    ('2020.115/2020.115_print.jpg', 'Corn Fields - Felix Vallotton'),
]
def sh(*a, **k): return subprocess.run(a, check=True, **k)

untracked = subprocess.run(['git', '-C', APP, 'ls-files', '--others', '--exclude-standard', 'public/icons'], capture_output=True, text=True).stdout.split()
shutil.rmtree(REL, ignore_errors=True); os.makedirs(REL)
sh('rsync', '-a', '--exclude', 'node_modules', '--exclude', 'dist', '--exclude', 'build', '--exclude', '.git', f'{APP}/', f'{REL}/app/')
os.symlink(f'{APP}/node_modules', f'{REL}/app/node_modules')
A = f'{REL}/app'

# 1. no third-party icon tiles or extra app icons (only what the upstream project itself ships stays)
shutil.rmtree(f'{A}/public/iconpack', ignore_errors=True)
shutil.rmtree(f'{A}/public/private', ignore_errors=True)   # the private SF font (Apple's licence: never in a release)
for f in untracked: os.path.exists(f'{A}/{f}') and os.remove(f'{A}/{f}')
open(f'{A}/src/config/iconpack.ts', 'w').write('// Release build: no third-party icon tiles.\nexport const ICON_PACK: Record<string, string> = {};\n')

# 2. five public-domain paintings as the bundled wallpapers (plus the small blurred copies the glass uses)
for f in glob.glob(f'{A}/public/wallpapers/*'): os.remove(f)
titles = []
for i, (path, title) in enumerate(WALLPAPERS):
    url = 'https://images.weserv.nl/?url=' + urllib.parse.quote('openaccess-cdn.clevelandart.org/' + path, safe='') + '&w=1920&h=1080&fit=cover&q=88&output=jpg'
    dst = f'{A}/public/wallpapers/default-{i}.jpg'
    sh('curl', '-sfL', '-o', dst, url)
    sh(FF, '-hide_banner', '-loglevel', 'error', '-y', '-i', dst, '-vf', 'scale=960:540:force_original_aspect_ratio=increase,crop=960:540,gblur=sigma=5,eq=brightness=0.04:saturation=1.35', '-q:v', '2', dst.replace('.jpg', '-blur.jpg'))
    sh(FF, '-hide_banner', '-loglevel', 'error', '-y', '-i', dst, '-vf', 'scale=480:270:force_original_aspect_ratio=increase,crop=480:270,gblur=sigma=9,eq=brightness=0.02:saturation=1.25', '-q:v', '3', dst.replace('.jpg', '-bg.jpg'))
    titles.append({'title': title, 'file': f'wallpapers/default-{i}.jpg'})
w = open(f'{A}/src/config/wallpapers.ts').read()
w = re.sub(r'export const LOCAL_WALLPAPERS: LocalWallpaper\[\] = \[.*?\n\];', 'export const LOCAL_WALLPAPERS: LocalWallpaper[] = ' + json.dumps(titles, indent=1) + ';', w, flags=re.S)
open(f'{A}/src/config/wallpapers.ts', 'w').write(w)

# 3. build and package
for cmd in ('build', 'package'):
    r = subprocess.run(['npm', 'run', cmd], cwd=A, capture_output=True, text=True)
    if r.returncode: print(r.stdout[-1500:], r.stderr[-1500:]); sys.exit(1)
os.makedirs(f'{ROOT}/release', exist_ok=True)
checksums = f'{ROOT}/release/SHA256SUMS.txt'
if os.path.exists(checksums): os.remove(checksums)
for f in glob.glob(f'{ROOT}/release/*.ipk'): os.remove(f)
for f in glob.glob(f'{A}/build/*.ipk'): shutil.copy(f, f'{ROOT}/release/')
print(write_checksums(f'{ROOT}/release'))
print(glob.glob(f'{ROOT}/release/*.ipk'))
