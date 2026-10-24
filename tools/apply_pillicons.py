#!/usr/bin/env python3
"""Layer: the icons on the top-right buttons are 62% white (a softer look than the upstream pure white), also when focused."""
import os
p = os.path.expanduser('~/Developer/webos-launcher-tvos/app/src/theme/global.css')
s = open(p).read()
for a, b in [(".pill svg { width: 36px; height: 36px; fill: none; stroke: #fff;", ".pill svg { width: 36px; height: 36px; fill: none; stroke: rgba(255, 255, 255, 0.62);"),
             (".pill--focused svg, .pill--open svg { stroke: #fff; }", ".pill--focused svg, .pill--open svg { stroke: rgba(255, 255, 255, 0.62); }")]:
    assert a in s, a
    s = s.replace(a, b, 1)
open(p, 'w').write(s)
print('pillicons applied')
