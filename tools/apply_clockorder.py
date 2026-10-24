#!/usr/bin/env python3
"""Layer: Stacked clock order (time on top, or time below the date and weather) and the frosted look on the weather line too."""
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
 ("\tclockLayout: string;", "\tclockLayout: string;\n\tclockOrder: string;"),
 ("\tclockLayout: 'inline',", "\tclockLayout: 'inline',\n\tclockOrder: 'top',"),
 ("\t\t\tclockLayout: parsed.clockLayout", "\t\t\tclockOrder: parsed.clockOrder === 'bottom' ? 'bottom' : 'top',\n\t\t\tclockLayout: parsed.clockLayout"),
])
edit(P('app.tsx'), [
 ("clockLayout: 'clock-layout',", "clockLayout: 'clock-layout', clockOrder: 'clock-order',"),
 ("[OPTION.clockLayout]: 'clock',", "[OPTION.clockLayout]: 'clock', [OPTION.clockOrder]: 'clock',"),
 ("\t\t\t{id: OPTION.clockLayout,", "\t\t\t{id: OPTION.clockOrder, label: 'Stacked clock order', description: 'For the Stacked layout: the big time above the date and weather, or the date and weather first and the time below them.', value: true, valueText: config.clockOrder === 'bottom' ? 'Time below' : 'Time on top'},\n\t\t\t{id: OPTION.clockLayout,"),
 ("\t\t\tif (id === OPTION.clockLayout) return", "\t\t\tif (id === OPTION.clockOrder) return {choices: ['Time on top', 'Time below'], choice: config.clockOrder === 'bottom' ? 1 : 0};\n\t\t\tif (id === OPTION.clockLayout) return"),
 ("\t\telse if (optionId === OPTION.clockLayout) updateConfig(", "\t\telse if (optionId === OPTION.clockOrder) updateConfig({...config, clockOrder: index === 1 ? 'bottom' : 'top'});\n\t\telse if (optionId === OPTION.clockLayout) updateConfig("),
 ("\t\tc.toggle('clock-stacked', config.clockLayout === 'stacked');", "\t\tc.toggle('clock-stacked', config.clockLayout === 'stacked');\n\t\tc.toggle('clock-timebelow', config.clockOrder === 'bottom');"),
 ("}, [config.clockLayout, config.clockLook,", "}, [config.clockOrder, config.clockLayout, config.clockLook,"),
 ("\t\t[OPTION.clockLayout]: cp(false,", "\t\t[OPTION.clockOrder]: cp(false, (i) => ({layout: 'stacked', order: ['top', 'bottom'][i]})),\n\t\t[OPTION.clockLayout]: cp(false,"),
 ("<ClockPreview photo={photo}", "<ClockPreview order={config.clockOrder} photo={photo}"),
 ("config.pcX, config.pcY, config.clockLayout]);\n", "config.pcX, config.pcY, config.clockLayout, config.clockOrder]);\n"),
])
edit(P('components/ClockPreview.tsx'), [
 ("\tlayout: string;", "\tlayout: string;\n\torder?: string;"),
 ("${stacked ? ' cpv--stacked' : ''}", "${stacked ? ' cpv--stacked' : ''}${stacked && p.order === 'bottom' ? ' cpv--below' : ''}"),
])
open(P('theme/global.css'), 'a').write('''
/* Stacked clock order: the row's children join the pill's column, so the time can sit above or below the date and weather */
html.clock-stacked .status__row { display: contents; }
html.clock-stacked .screen > .pill.status { flex-direction: column; align-items: flex-start; }
html.clock-stacked.clock-timebelow .screen > .pill.status .clock { order: 5; margin-top: 8px; }
html.clock-stacked.clock-timebelow .status__date--long { order: 1; margin-top: 0; }
html.clock-stacked.clock-timebelow .status__weather { order: 2; }
html.clock-stacked.clock-center .screen > .pill.status { align-items: center; }
html.clock-stacked.clock-right .screen > .pill.status { align-items: flex-end; }
.cpv--below .cpv__row { order: 3; margin-top: 8px; }
/* the weather line gets the frosted look too */
html.clock-frosted .screen > .pill.status .status__weather {
	color: transparent; -webkit-text-fill-color: transparent;
	background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.40) 0%, rgba(255, 255, 255, 0.14) 42%, rgba(255, 255, 255, 0.30) 100%), var(--wp-blur, none);
	background-size: auto, 1920px 1080px; background-attachment: scroll, fixed; background-repeat: no-repeat;
	-webkit-background-clip: text; background-clip: text; -webkit-text-stroke: 0; text-shadow: none; opacity: 1;
	filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.28));
}
html.clock-frosted .status__weather .wicon { color: rgba(255, 255, 255, 0.78); -webkit-text-fill-color: initial; }
''')
print('clockorder applied')
