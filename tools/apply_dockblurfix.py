#!/usr/bin/env python3
"""Layer: Dock blur works on its own (it needed Live glass switched on), and the blur also drops out while the pointer moves, not only on keys."""
import os
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
P = lambda p: os.path.join(ROOT, 'app/src', p)
s = open(P('app.tsx')).read()
a = "\t\twindow.addEventListener('keydown', on, true);\n\t\treturn () => { window.removeEventListener('keydown', on, true);"
b = "\t\tconst evs = ['keydown', 'mousemove', 'mousedown', 'wheel'];\n\t\tevs.forEach((e) => window.addEventListener(e, on, true));\n\t\treturn () => { evs.forEach((e) => window.removeEventListener(e, on, true));"
assert a in s
open(P('app.tsx'), 'w').write(s.replace(a, b, 1))
open(P('theme/global.css'), 'a').write('''
/* Dock blur on its own (no Live glass needed): a light live blur on the glass bar, off while things move (the pre-blurred picture under it stays) */
html.dockblur:not(.liveblur) { --live-glass: blur(2px) saturate(1.25); }
html.dockblur:not(.liveblur) .rows > .row:first-child::before { -webkit-backdrop-filter: var(--live-glass); backdrop-filter: var(--live-glass); will-change: transform; background-color: rgba(0, 0, 0, 0.3) !important; }
html.dockblur:not(.liveblur).light .rows > .row:first-child::before { background-color: rgba(255, 255, 255, 0.34) !important; }
html.dockblur.nav-moving .rows > .row:first-child::before { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }
''')
print('dockblurfix applied')
