#!/usr/bin/env python3
"""Layer: the photo screensaver clock can be Frosted (see-through white digits with a soft edge, like the iOS lock screen) or Solid. Settings > Screensaver > Clock look."""
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
 ("\tpcBlur: string;", "\tpcBlur: string;\n\tpcLook: string;"),
 ("\tpcBlur: 'off',", "\tpcBlur: 'off',\n\tpcLook: 'frosted',"),
 ("\t\t\tpcBlur: ['soft',", "\t\t\tpcLook: parsed.pcLook === 'solid' ? 'solid' : 'frosted',\n\t\t\tpcBlur: ['soft',"),
])
edit(P('app.tsx'), [
 ("pcBlur: 'pc-blur',", "pcBlur: 'pc-blur', pcLook: 'pc-look',"),
 ("[OPTION.pcBlur]: 'screensaver',", "[OPTION.pcBlur]: 'screensaver', [OPTION.pcLook]: 'screensaver',"),
 ("\t\t\t{id: OPTION.pcBlur,", "\t\t\t{id: OPTION.pcLook, label: 'Clock look on photos', description: 'Frosted: see-through white digits with a soft edge, like the iOS lock screen. Solid: plain white digits.', value: true, valueText: config.pcLook === 'solid' ? 'Solid' : 'Frosted'},\n\t\t\t{id: OPTION.pcBlur,"),
 ("\t\t\tif (id === OPTION.pcBlur) return", "\t\t\tif (id === OPTION.pcLook) return {choices: ['Frosted', 'Solid'], choice: config.pcLook === 'solid' ? 1 : 0};\n\t\t\tif (id === OPTION.pcBlur) return"),
 ("\t\telse if (optionId === OPTION.pcBlur) updateConfig(", "\t\telse if (optionId === OPTION.pcLook) updateConfig({...config, pcLook: index === 1 ? 'solid' : 'frosted'});\n\t\telse if (optionId === OPTION.pcBlur) updateConfig("),
 ("\t\tc.toggle('pc-noinfo', !config.pcInfo);", "\t\tc.toggle('pc-noinfo', !config.pcInfo);\n\t\tc.toggle('pc-frosted', config.pcLook !== 'solid');"),
 ("config.pcInfo, config.pcBlur]);", "config.pcInfo, config.pcBlur, config.pcLook]);"),
])
open(P('theme/global.css'), 'a').write('''
html.pc-frosted .ambient__block .clock__time { color: rgba(255, 255, 255, 0.58); -webkit-text-stroke: 0.8px rgba(255, 255, 255, 0.45); text-shadow: 0 4px 30px rgba(0, 0, 0, 0.28); font-weight: 800; }
html.pc-frosted .ambient__block .clock__period { color: rgba(255, 255, 255, 0.7); -webkit-text-stroke: 0; }
''')
print('photoclock2 applied')
