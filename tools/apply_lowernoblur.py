#!/usr/bin/env python3
"""Fifty-third patch layer: no background blur when moving down to the second row of the dock. Going down used to fade in a full-screen layer holding the strongly blurred
wallpaper copy (--wp-bg) and, at the same moment, swap the picture inside every glass shape to that copy (`.screen--lower { --wp-blur: var(--wp-bg) }`). Both make the TV repaint
the whole screen during the slide, which showed as lag. Now the wallpaper and the glass stay exactly as they are on the first row; only the rows slide."""
import os
p = os.path.expanduser('~/Developer/webos-launcher-tvos/app/src/theme/global.css')
s = open(p).read()
s += """
/* lower rows: no full-screen blurred/dimmed backdrop and no picture swap in the glass shapes, so going down is only a slide */
.screen--lower::before { display: none !important; animation: none !important; }
.screen--lower { --wp-blur: inherit; }
"""
open(p, 'w').write(s)
