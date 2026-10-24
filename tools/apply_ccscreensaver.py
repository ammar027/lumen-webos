#!/usr/bin/env python3
"""Layer: the Control Center circle Art mode becomes Screensaver (starts whichever type is chosen)."""
import os
p = os.path.expanduser('~/Developer/webos-launcher-tvos/app/src/components/ControlCenter.tsx')
s = open(p).read()
for a, b in [("{cell: 'art', glyph: 'image', label: 'Art mode'}", "{cell: 'art', glyph: 'screensaver', label: 'Screensaver'}"), ("else if (cell === 'art') onAction('art');", "else if (cell === 'art') onAction('screensaver');")]:
    assert a in s, a
    s = s.replace(a, b, 1)
open(p, 'w').write(s)
print('ccscreensaver applied')
