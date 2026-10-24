#!/usr/bin/env python3
"""Layer: lighter Live glass and Dock blur. The live blur is dropped while you move (arrow keys: the pre-blurred picture under it carries the look for those ~400 ms, so nothing visibly changes) and comes back once things settle; the blur itself is just a blur with a little colour, not blur + saturate + brightness (three full passes)."""
import os
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
P = lambda p: os.path.join(ROOT, 'app/src', p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:90])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)
edit(P('app.tsx'), [
 ("\tuseEffect(() => { document.documentElement.classList.toggle('dockblur', config.dockBlur); }, [config.dockBlur]);",
  "\tuseEffect(() => { document.documentElement.classList.toggle('dockblur', config.dockBlur); }, [config.dockBlur]);\n"
  "\t// the live blur is switched off while keys move things, and back on 400 ms after the last one (saves the per-frame blur on a weak TV)\n"
  "\tuseEffect(() => {\n\t\tif (!config.liveGlass && !config.dockBlur) return undefined;\n\t\tconst root = document.documentElement;\n\t\tlet t = 0;\n"
  "\t\tconst on = () => { root.classList.add('nav-moving'); window.clearTimeout(t); t = window.setTimeout(() => root.classList.remove('nav-moving'), 400); };\n"
  "\t\twindow.addEventListener('keydown', on, true);\n\t\treturn () => { window.removeEventListener('keydown', on, true); window.clearTimeout(t); root.classList.remove('nav-moving'); };\n\t}, [config.liveGlass, config.dockBlur]);"),
])
open(P('theme/global.css'), 'a').write('''
/* lighter live glass: one blur and a touch of colour (brightness is in the tint already) */
html.liveblur { --live-glass: blur(2px) saturate(1.25); }
html.liveblur .panel--cc { --live-glass: blur(3px) saturate(1.25); }
/* no live blur while moving: the pre-blurred picture under it shows instead */
html.liveblur.nav-moving .row:not(.row--dock)::before, html.liveblur.nav-moving .topcap, html.liveblur.nav-moving .topbar > .pill, html.liveblur.nav-moving .panel,
html.liveblur.dockblur.nav-moving .rows > .row:first-child::before { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }
''')
print('glassperf applied')
