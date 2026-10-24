#!/usr/bin/env python3
"""Fifty-seventh patch layer: the Settings backdrop as a canvas (Sam Renfrew's fork, MIT). Settings draws the blurred wallpaper on its ::before; the TV drops those tiles under
memory pressure and rasters them again on every move. The picture is now drawn once into a canvas behind the content (a texture, not tiles). Over the video wallpaper nothing changes."""
import os, shutil
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
SRC = os.path.join(ROOT, 'app/src')
shutil.copy(os.path.join(ROOT, 'tools/assets/sam/ScreenBackdrop.tsx'), os.path.join(SRC, 'components/ScreenBackdrop.tsx'))
p = os.path.join(SRC, 'screens/Settings.tsx')
s = open(p).read()
a = '\t\t<div class="screen screen--settings">\n'
assert a in s and 'ScreenBackdrop' not in s
s = s.replace(a, a + '\t\t\t<ScreenBackdrop />\n', 1)
first = s.index('\n')
s = "import {ScreenBackdrop} from '../components/ScreenBackdrop';\n" + s
open(p, 'w').write(s)
p = os.path.join(SRC, 'theme/global.css')
s = open(p).read()
s += """
/* Settings' backdrop is a canvas (components/ScreenBackdrop.tsx): the ::before keeps its fill colour but draws no picture while the canvas shows */
.backdrop { position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none; }
.backdrop > canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
body .screen.screen--canvasbg::before { background-image: none !important; }
"""
open(p, 'w').write(s)
print('settings canvas applied')
