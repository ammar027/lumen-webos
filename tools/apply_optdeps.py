#!/usr/bin/env python3
"""Layer: the Settings option list refreshes when the clock and photo-clock options change (they were missing from the list's dependencies, so a new value was saved but the row kept showing the old one)."""
import os, re
p = os.path.expanduser('~/Developer/webos-launcher-tvos/app/src/app.tsx')
s = open(p).read()
i = s.index("return [wpType, focusStrength, textSize].concat(")
j = s.index("}, [optionBase,", i)
k = s.index("]);", j)
keys = ['clockStyle', 'clockColor', 'clockLook', 'clockSize', 'clockWeight', 'clockPos', 'showDate', 'clockX', 'clockY', 'pcPos', 'pcSize', 'pcInfo', 'pcBlur', 'pcLook', 'pcX', 'pcY']
add = ''.join(', config.' + n for n in keys)
s = s[:k] + add + s[k:]
open(p, 'w').write(s)
print('optdeps applied')
