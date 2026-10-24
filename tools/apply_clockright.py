#!/usr/bin/env python3
"""Layer: Clock position gets Right: the date, time and weather block sits at the top right, beside the two round buttons."""
import os
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
P = lambda p: os.path.join(ROOT, 'app/src', p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:90])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)
edit(P('lib/storage.ts'), [("clockPos: parsed.clockPos === 'center' ? 'center' : 'left',", "clockPos: parsed.clockPos === 'center' || parsed.clockPos === 'right' ? parsed.clockPos : 'left',")])
edit(P('app.tsx'), [
 ("valueText: config.clockPos === 'center' ? 'Centre' : 'Left'},", "valueText: config.clockPos === 'center' ? 'Centre' : config.clockPos === 'right' ? 'Right' : 'Left'},"),
 ("return {choices: ['Left', 'Centre'], choice: config.clockPos === 'center' ? 1 : 0};", "return {choices: ['Left', 'Centre', 'Right'], choice: config.clockPos === 'center' ? 1 : config.clockPos === 'right' ? 2 : 0};"),
 ("clockPos: index === 1 ? 'center' : 'left'});", "clockPos: index === 1 ? 'center' : index === 2 ? 'right' : 'left'});"),
 ("c.toggle('clock-center', config.clockPos === 'center');", "c.toggle('clock-center', config.clockPos === 'center');\n\t\tc.toggle('clock-right', config.clockPos === 'right');"),
])
open(P('theme/global.css'), 'a').write('''
html.clock-right .screen > .pill.status { left: auto; right: 340px; align-items: flex-end; text-align: right; }
html.clock-right .status__row { justify-content: flex-end; }
''')
print('clockright applied')
