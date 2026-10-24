#!/usr/bin/env python3
"""Layer: the home clock block can be Frosted too (Settings > Language > Clock look), like the photo screensaver's clock."""
import os
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
P = lambda p: os.path.join(ROOT, 'app/src', p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:90])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)
edit(P('lib/storage.ts'), [
 ("\tclockSize: string;", "\tclockSize: string;\n\tclockLook: string;"),
 ("\tclockSize: 'normal',", "\tclockSize: 'normal',\n\tclockLook: 'solid',"),
 ("\t\t\tclockSize: ['small',", "\t\t\tclockLook: parsed.clockLook === 'frosted' ? 'frosted' : 'solid',\n\t\t\tclockSize: ['small',"),
])
edit(P('app.tsx'), [
 ("clockSize: 'clock-size',", "clockSize: 'clock-size', clockLook: 'clock-look',"),
 ("[OPTION.clockSize]: 'language',", "[OPTION.clockSize]: 'language', [OPTION.clockLook]: 'language',"),
 ("\t\t\t{id: OPTION.clockSize,", "\t\t\t{id: OPTION.clockLook, label: 'Clock look', description: 'Solid: plain digits. Frosted: see-through white digits with a soft edge, like the iOS lock screen.', value: true, valueText: config.clockLook === 'frosted' ? 'Frosted' : 'Solid'},\n\t\t\t{id: OPTION.clockSize,"),
 ("\t\t\tif (id === OPTION.clockSize) return", "\t\t\tif (id === OPTION.clockLook) return {choices: ['Solid', 'Frosted'], choice: config.clockLook === 'frosted' ? 1 : 0};\n\t\t\tif (id === OPTION.clockSize) return"),
 ("\t\telse if (optionId === OPTION.clockSize) updateConfig(", "\t\telse if (optionId === OPTION.clockLook) updateConfig({...config, clockLook: index === 1 ? 'frosted' : 'solid'});\n\t\telse if (optionId === OPTION.clockSize) updateConfig("),
 ("\t\tc.toggle('no-date', !config.showDate);", "\t\tc.toggle('no-date', !config.showDate);\n\t\tc.toggle('clock-frosted', config.clockLook === 'frosted');"),
 ("}, [config.clockSize,", "}, [config.clockLook, config.clockSize,"),
])
open(P('theme/global.css'), 'a').write('''
html.clock-frosted .screen > .pill.status .clock__time, html.clock-frosted .screen > .pill.status .status__date { color: rgba(255, 255, 255, 0.62); -webkit-text-stroke: 1.2px rgba(255, 255, 255, 0.78); text-shadow: 0 3px 16px rgba(0, 0, 0, 0.3); }
html.clock-frosted .screen > .pill.status .clock__period { color: rgba(255, 255, 255, 0.7); -webkit-text-stroke: 0; }
''')
print('clocklook applied')
