#!/usr/bin/env python3
"""Layer: a Huge clock size (home and photo screensaver) and moving the clock: Clock move left/right and up/down on the home screen (Appearance) and on photos (Screensaver), in steps of 100 px up to 400."""
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
 ("\tclockSize: string;", "\tclockSize: string;\n\tclockX: number;\n\tclockY: number;\n\tpcX: number;\n\tpcY: number;"),
 ("\tclockSize: 'normal',", "\tclockSize: 'normal',\n\tclockX: 0,\n\tclockY: 0,\n\tpcX: 0,\n\tpcY: 0,"),
 ("\t\t\tclockSize: ['small', 'large', 'xl'].indexOf(String(parsed.clockSize)) >= 0", "\t\t\tclockX: offsetOf(parsed.clockX),\n\t\t\tclockY: offsetOf(parsed.clockY),\n\t\t\tpcX: offsetOf(parsed.pcX),\n\t\t\tpcY: offsetOf(parsed.pcY),\n\t\t\tclockSize: ['small', 'large', 'xl', 'huge'].indexOf(String(parsed.clockSize)) >= 0"),
 ("\t\t\tpcSize: ['small', 'large', 'xl'].indexOf(String(parsed.pcSize)) >= 0", "\t\t\tpcSize: ['small', 'large', 'xl', 'huge'].indexOf(String(parsed.pcSize)) >= 0"),
 ("export function loadConfig", "/** a clock offset: a multiple of 100 within 400, else 0 */\nfunction offsetOf (v: unknown): number { const n = Number(v); return Number.isInteger(n / 100) && Math.abs(n) <= 400 ? n : 0; }\n\nexport function loadConfig"),
])
S4 = "['Small', 'Normal', 'Large', 'Extra large', 'Huge'][['small', 'normal', 'large', 'xl', 'huge']"
edit(P('app.tsx'), [
 ("clockSize: 'clock-size',", "clockSize: 'clock-size', clockX: 'clock-x', clockY: 'clock-y', pcX: 'pc-x', pcY: 'pc-y',"),
 ("[OPTION.clockSize]: 'appearance',", "[OPTION.clockSize]: 'appearance', [OPTION.clockX]: 'appearance', [OPTION.clockY]: 'appearance', [OPTION.pcX]: 'screensaver', [OPTION.pcY]: 'screensaver',"),
 ("valueText: ['Small', 'Normal', 'Large', 'Extra large'][['small', 'normal', 'large', 'xl'].indexOf(config.clockSize)]},", "valueText: " + S4 + ".indexOf(config.clockSize)]},\n\t\t\t{id: OPTION.clockX, label: 'Move clock sideways', description: 'Moves the date, time and weather block left or right from its position.', value: config.clockX !== 0, valueText: offText(config.clockX, 'left', 'right')},\n\t\t\t{id: OPTION.clockY, label: 'Move clock up or down', description: 'Moves the date, time and weather block up or down from its position.', value: config.clockY !== 0, valueText: offText(config.clockY, 'up', 'down')},"),
 ("valueText: ['Small', 'Normal', 'Large', 'Extra large'][['small', 'normal', 'large', 'xl'].indexOf(config.pcSize)]},", "valueText: " + S4.replace('config', 'config') + ".indexOf(config.pcSize)]},\n\t\t\t{id: OPTION.pcX, label: 'Move photo clock sideways', description: 'Moves the clock on the photo screensaver left or right from its position.', value: config.pcX !== 0, valueText: offText(config.pcX, 'left', 'right')},\n\t\t\t{id: OPTION.pcY, label: 'Move photo clock up or down', description: 'Moves the clock on the photo screensaver up or down from its position.', value: config.pcY !== 0, valueText: offText(config.pcY, 'up', 'down')},"),
 ("\t\t\tif (id === OPTION.clockSize) return {choices: ['Small', 'Normal', 'Large', 'Extra large'], choice: ['small', 'normal', 'large', 'xl'].indexOf(config.clockSize)};", "\t\t\tif (id === OPTION.clockSize) return {choices: ['Small', 'Normal', 'Large', 'Extra large', 'Huge'], choice: ['small', 'normal', 'large', 'xl', 'huge'].indexOf(config.clockSize)};\n\t\t\tif (id === OPTION.clockX) return {choices: OFFSETS.map((n) => offText(n, 'left', 'right')), choice: OFFSETS.indexOf(config.clockX)};\n\t\t\tif (id === OPTION.clockY) return {choices: OFFSETS.map((n) => offText(n, 'up', 'down')), choice: OFFSETS.indexOf(config.clockY)};\n\t\t\tif (id === OPTION.pcX) return {choices: OFFSETS.map((n) => offText(n, 'left', 'right')), choice: OFFSETS.indexOf(config.pcX)};\n\t\t\tif (id === OPTION.pcY) return {choices: OFFSETS.map((n) => offText(n, 'up', 'down')), choice: OFFSETS.indexOf(config.pcY)};"),
 ("\t\t\tif (id === OPTION.pcSize) return {choices: ['Small', 'Normal', 'Large', 'Extra large'], choice: ['small', 'normal', 'large', 'xl'].indexOf(config.pcSize)};", "\t\t\tif (id === OPTION.pcSize) return {choices: ['Small', 'Normal', 'Large', 'Extra large', 'Huge'], choice: ['small', 'normal', 'large', 'xl', 'huge'].indexOf(config.pcSize)};"),
 ("updateConfig({...config, clockSize: ['small', 'normal', 'large', 'xl'][index] || 'normal'});", "updateConfig({...config, clockSize: ['small', 'normal', 'large', 'xl', 'huge'][index] || 'normal'});\n\t\telse if (optionId === OPTION.clockX) updateConfig({...config, clockX: OFFSETS[index] || 0});\n\t\telse if (optionId === OPTION.clockY) updateConfig({...config, clockY: OFFSETS[index] || 0});\n\t\telse if (optionId === OPTION.pcX) updateConfig({...config, pcX: OFFSETS[index] || 0});\n\t\telse if (optionId === OPTION.pcY) updateConfig({...config, pcY: OFFSETS[index] || 0});"),
 ("updateConfig({...config, pcSize: ['small', 'normal', 'large', 'xl'][index] || 'normal'});", "updateConfig({...config, pcSize: ['small', 'normal', 'large', 'xl', 'huge'][index] || 'normal'});"),
 ("const RECENT_MAX = 8;", "const RECENT_MAX = 8;\nconst OFFSETS = [-400, -300, -200, -100, 0, 100, 200, 300, 400];\nconst offText = (n: number, neg: string, pos: string) => (n === 0 ? 'Not moved' : `${Math.abs(n)} px ${n < 0 ? neg : pos}`);"),
 ("['small', 'large', 'xl'].forEach((k) => c.toggle('clock-' + k, config.clockSize === k));", "['small', 'large', 'xl', 'huge'].forEach((k) => c.toggle('clock-' + k, config.clockSize === k));\n\t\tdocument.documentElement.style.setProperty('--cdx', config.clockX + 'px'); document.documentElement.style.setProperty('--cdy', config.clockY + 'px');\n\t\tdocument.documentElement.style.setProperty('--pdx', config.pcX + 'px'); document.documentElement.style.setProperty('--pdy', config.pcY + 'px');"),
 ("['small', 'large', 'xl'].forEach((k) => c.toggle('pcsize-' + k, config.pcSize === k));", "['small', 'large', 'xl', 'huge'].forEach((k) => c.toggle('pcsize-' + k, config.pcSize === k));"),
 ("config.pcInfo, config.pcBlur, config.pcLook]);", "config.pcInfo, config.pcBlur, config.pcLook, config.clockX, config.clockY, config.pcX, config.pcY]);"),
])
open(P('theme/global.css'), 'a').write('''
html.clock-huge .screen > .pill.status { zoom: 2.2; }
/* with the dock hidden the clock drops to the bottom left, as before (the zoom sizes scale a translate, so it is divided by the zoom) */
html .screen--dockhidden > .pill.status { transform: translateY(calc(830px / var(--cz, 1))); }
html.clock-stacked .screen--dockhidden > .pill.status { transform: translateY(calc(730px / var(--cz, 1))); }
html.clock-small { --cz: 0.8; } html.clock-large { --cz: 1.25; } html.clock-xl { --cz: 1.5; } html.clock-huge { --cz: 2.2; }
html.pcsize-huge .ambient__block { transform: scale(2.6); }
html.pcpos-c.pcsize-huge .ambient__block { transform: translateY(-50%) scale(2.6); }
.ambient__block > .ambient__clock, .ambient__block > .ambient__info { position: relative !important; left: var(--pdx, 0px); top: var(--pdy, 0px); }
''')
print('clockmove applied')
