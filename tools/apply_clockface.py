#!/usr/bin/env python3
"""Layer: the clock in the top-right pill gets styles (Digital, Date and time, With seconds, Analog, Analog and digital) and a colour, in Settings > Language > Clock style / Clock colour."""
import os, shutil
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
SRC = os.path.join(ROOT, 'app/src')
P = lambda p: os.path.join(SRC, p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:90])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)

shutil.copy(os.path.join(ROOT, 'tools/assets/sam/Clock.tsx'), P('components/Clock.tsx'))
edit(P('lib/storage.ts'), [
 ("\tphotoSaver: boolean;", "\tphotoSaver: boolean;\n\t/** the top-right clock: digital, date, seconds, analog or both; and its colour */\n\tclockStyle: string;\n\tclockColor: string;"),
 ("\tphotoSaver: false,", "\tphotoSaver: false,\n\tclockStyle: 'digital',\n\tclockColor: 'auto',"),
 ("\t\t\tphotoSaver: parsed.photoSaver === true,", "\t\t\tphotoSaver: parsed.photoSaver === true,\n\t\t\tclockStyle: ['date', 'seconds', 'analog', 'both'].indexOf(String(parsed.clockStyle)) >= 0 ? String(parsed.clockStyle) : 'digital',\n\t\t\tclockColor: ['white', 'blue', 'green', 'orange', 'pink', 'yellow'].indexOf(String(parsed.clockColor)) >= 0 ? String(parsed.clockColor) : 'auto',"),
])
edit(P('app.tsx'), [
 ("import {AppSwitcher}", "import {setClockFace, CLOCK_STYLES, CLOCK_STYLE_NAMES, CLOCK_COLORS, CLOCK_COLOR_NAMES} from './components/Clock';\nimport {AppSwitcher}"),
 ("restore: 'restore-settings',", "restore: 'restore-settings', clockStyle: 'clock-style', clockColor: 'clock-color',"),
 ("\tsetClockMode(config.clockFormat);", "\tsetClockMode(config.clockFormat);\n\tsetClockFace(config.clockStyle, config.clockColor);"),
 ("[OPTION.clock]: 'language',", "[OPTION.clock]: 'language', [OPTION.clockStyle]: 'appearance', [OPTION.clockColor]: 'appearance',"),
 ("{id: OPTION.restore,", "{id: OPTION.clockStyle, label: 'Clock style', description: 'How the clock in the top right looks: digital, with the date, with seconds, an analog dial, or the dial next to the digits.', value: true, valueText: CLOCK_STYLE_NAMES[Math.max(0, CLOCK_STYLES.indexOf(config.clockStyle))]},\n\t\t\t{id: OPTION.clockColor, label: 'Clock colour', description: 'The colour of the clock in the top right.', value: true, valueText: CLOCK_COLOR_NAMES[Math.max(0, CLOCK_COLORS.indexOf(config.clockColor))]},\n\t\t\t{id: OPTION.restore,"),
 ("\t\t\tif (id === OPTION.clock) return", "\t\t\tif (id === OPTION.clockStyle) return {choices: CLOCK_STYLE_NAMES, choice: Math.max(0, CLOCK_STYLES.indexOf(config.clockStyle))};\n\t\t\tif (id === OPTION.clockColor) return {choices: CLOCK_COLOR_NAMES, choice: Math.max(0, CLOCK_COLORS.indexOf(config.clockColor))};\n\t\t\tif (id === OPTION.clock) return"),
 ("\t\telse if (optionId === OPTION.clock) updateConfig(", "\t\telse if (optionId === OPTION.clockStyle) updateConfig({...config, clockStyle: CLOCK_STYLES[index] || 'digital'});\n\t\telse if (optionId === OPTION.clockColor) updateConfig({...config, clockColor: CLOCK_COLORS[index] || 'auto'});\n\t\telse if (optionId === OPTION.clock) updateConfig("),
])
open(P('theme/global.css'), 'a').write('''
.clock__date { margin-right: 14px; opacity: .85; font-size: .82em; }
.clock__sec { opacity: .7; font-size: .8em; margin-left: 2px; }
.clock .clock__dial { width: 50px !important; height: 50px !important; flex: none; margin: -6px 0; }
.clock--analog, .clock--both { display: flex; align-items: center; gap: 12px; }
.topbar .clock--analog, .topbar .clock--both, .topcap .clock--analog, .topcap .clock--both { display: flex; align-items: center; }
''')
print('clockface applied')
