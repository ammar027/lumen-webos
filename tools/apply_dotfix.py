#!/usr/bin/env python3
"""Layer: the open-app dot (above a running app's tile) is hidden while the dock is away and during the Aerials screensaver. Its own visibility overrides the hidden parent, so one dot stayed on the video."""
import os
css = '''
/* the open-app dot has visibility of its own, so a hidden dock did not hide it */
.rows--hidden .tile__dot::before, html.in-aerials .tile__dot::before, .screen--dockhidden .tile__dot::before { visibility: hidden !important; opacity: 0 !important; }
'''
open(os.path.expanduser('~/Developer/webos-launcher-tvos/app/src/theme/global.css'), 'a').write(css)
print('dotfix applied')
