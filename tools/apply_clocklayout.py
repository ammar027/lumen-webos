#!/usr/bin/env python3
"""Layer: size, weight, position (left or centre) and date on/off for the clock block at the top (Settings > Language > Clock size, Clock weight, Clock position, Show date)."""
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
 ("\tclockStyle: string;", "\tclockStyle: string;\n\tclockSize: string;\n\tclockWeight: string;\n\tclockPos: string;\n\tshowDate: boolean;"),
 ("\tclockStyle: 'digital',", "\tclockStyle: 'digital',\n\tclockSize: 'normal',\n\tclockWeight: 'regular',\n\tclockPos: 'left',\n\tshowDate: true,"),
 ("\t\t\tclockStyle: ['date',", "\t\t\tclockSize: ['small', 'large', 'xl'].indexOf(String(parsed.clockSize)) >= 0 ? String(parsed.clockSize) : 'normal',\n\t\t\tclockWeight: ['light', 'bold'].indexOf(String(parsed.clockWeight)) >= 0 ? String(parsed.clockWeight) : 'regular',\n\t\t\tclockPos: parsed.clockPos === 'center' ? 'center' : 'left',\n\t\t\tshowDate: parsed.showDate !== false,\n\t\t\tclockStyle: ['date',"),
])
edit(P('app.tsx'), [
 ("clockColor: 'clock-color',", "clockColor: 'clock-color', clockSize: 'clock-size', clockWeight: 'clock-weight', clockPos: 'clock-pos', showDate: 'show-date',"),
 ("[OPTION.clockColor]: 'language',", "[OPTION.clockColor]: 'language', [OPTION.clockSize]: 'language', [OPTION.clockWeight]: 'language', [OPTION.clockPos]: 'language', [OPTION.showDate]: 'language',"),
 ("\t\t\t{id: OPTION.restore,", "\t\t\t{id: OPTION.clockSize, label: 'Clock size', description: 'How large the date, time and weather block at the top is.', value: true, valueText: ['Small', 'Normal', 'Large', 'Extra large'][['small', 'normal', 'large', 'xl'].indexOf(config.clockSize)]},\n\t\t\t{id: OPTION.clockWeight, label: 'Clock weight', description: 'How thick the letters of the date and time are.', value: true, valueText: ['Light', 'Regular', 'Bold'][['light', 'regular', 'bold'].indexOf(config.clockWeight)]},\n\t\t\t{id: OPTION.clockPos, label: 'Clock position', description: 'Where the date, time and weather block sits at the top of the home screen.', value: true, valueText: config.clockPos === 'center' ? 'Centre' : 'Left'},\n\t\t\t{id: OPTION.showDate, label: 'Show date', description: 'The day and date before the time.', value: config.showDate},\n\t\t\t{id: OPTION.restore,"),
 ("\t\t\tif (id === OPTION.clockStyle) return", "\t\t\tif (id === OPTION.clockSize) return {choices: ['Small', 'Normal', 'Large', 'Extra large'], choice: ['small', 'normal', 'large', 'xl'].indexOf(config.clockSize)};\n\t\t\tif (id === OPTION.clockWeight) return {choices: ['Light', 'Regular', 'Bold'], choice: ['light', 'regular', 'bold'].indexOf(config.clockWeight)};\n\t\t\tif (id === OPTION.clockPos) return {choices: ['Left', 'Centre'], choice: config.clockPos === 'center' ? 1 : 0};\n\t\t\tif (id === OPTION.clockStyle) return"),
 ("\t\telse if (optionId === OPTION.clockStyle) updateConfig(", "\t\telse if (optionId === OPTION.clockSize) updateConfig({...config, clockSize: ['small', 'normal', 'large', 'xl'][index] || 'normal'});\n\t\telse if (optionId === OPTION.clockWeight) updateConfig({...config, clockWeight: ['light', 'regular', 'bold'][index] || 'regular'});\n\t\telse if (optionId === OPTION.clockPos) updateConfig({...config, clockPos: index === 1 ? 'center' : 'left'});\n\t\telse if (optionId === OPTION.clockStyle) updateConfig("),
 ("\t\telse if (optionId === OPTION.showRecents) updateConfig(", "\t\telse if (optionId === OPTION.showDate) updateConfig({...config, showDate: !config.showDate});\n\t\telse if (optionId === OPTION.showRecents) updateConfig("),
 ("\tuseEffect(() => { document.documentElement.classList.toggle('hide-recents'", "\tuseEffect(() => {\n\t\tconst c = document.documentElement.classList;\n\t\t['small', 'large', 'xl'].forEach((k) => c.toggle('clock-' + k, config.clockSize === k));\n\t\t['light', 'bold'].forEach((k) => c.toggle('clockw-' + k, config.clockWeight === k));\n\t\tc.toggle('clock-center', config.clockPos === 'center');\n\t\tc.toggle('no-date', !config.showDate);\n\t}, [config.clockSize, config.clockWeight, config.clockPos, config.showDate]);\n\tuseEffect(() => { document.documentElement.classList.toggle('hide-recents'"),
])
open(P('theme/global.css'), 'a').write('''
html.clock-small .screen > .pill.status { zoom: 0.8; }
html.clock-large .screen > .pill.status { zoom: 1.25; }
html.clock-xl .screen > .pill.status { zoom: 1.5; }
html.clockw-light .status__date, html.clockw-light .screen > .pill.status .clock__time { font-weight: 300 !important; }
html.clockw-bold .status__date, html.clockw-bold .screen > .pill.status .clock__time { font-weight: 700 !important; }
html.no-date .status__date { display: none; }
html.clock-center .screen > .pill.status { left: 0; right: 0; margin: 0 auto; width: fit-content; align-items: center; text-align: center; }
html.clock-center .status__row { justify-content: center; }
''')
print('clocklayout applied')
