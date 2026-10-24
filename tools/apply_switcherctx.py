#!/usr/bin/env python3
"""Layer: Recent Apps is also the first entry of the hold-OK menu on an app."""
import os
P = lambda p: os.path.join(os.path.expanduser('~/Developer/webos-launcher-tvos/app/src'), p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:90])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)
edit(P('screens/Home.tsx'), [
 ("const CTX_ITEMS = ['Move',", "const CTX_ITEMS = ['Recent Apps', 'Move',"),
 ("\t\tif (i === 0) n.moving = item.key;\n\t\telse if (i === 1 && edit) {", "\t\tif (i === 0) { render(); latest.current.onActivate('menu', {key: 'switcher', label: 'Recent Apps', glyph: 'grid'} as TileModel); return; }\n\t\tif (i === 1) n.moving = item.key;\n\t\telse if (i === 2 && edit) {"),
 ("FOLDER_PRESETS[i - 2]);", "FOLDER_PRESETS[i - 3]);"),
])
print('switcherctx applied')
