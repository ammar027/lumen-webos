#!/usr/bin/env python3
"""Layer: Clock layout Stacked (a big time, the long date under it, then a weather line with an icon, like the fork's big clock), a weather icon on the weather lines, and the move-clock options taken out of Settings."""
import os, shutil
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
P = lambda p: os.path.join(ROOT, 'app/src', p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:90])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)

shutil.copy(os.path.join(ROOT, 'tools/assets/sam/WeatherIcon.tsx'), P('components/WeatherIcon.tsx'))
edit(P('components/Status.tsx'), [
 ("import {langLocale} from '../lib/i18n';", "import {langLocale} from '../lib/i18n';\nimport {WeatherIcon} from './WeatherIcon';\n\nconst longDate = () => { try { return new Date().toLocaleDateString(langLocale(), {weekday: 'long', month: 'long', day: 'numeric'}).replace(',', ''); } catch { return new Date().toDateString(); } };"),
 ("<span class=\"status__date\">{date}</span>", "<span class=\"status__date\">{date}</span>\n\t\t\t\t<span class=\"status__date status__date--long\">{longDate()}</span>"),
 ("{weatherText && <div class=\"status__weather\">{weatherText}</div>}", "{weatherText && <div class=\"status__weather\"><WeatherIcon text={weatherText} /><span class=\"status__city\">{weatherText.indexOf(' · ') > 0 ? weatherText.slice(0, weatherText.indexOf(' · ') + 3) : ''}</span>{weatherText.indexOf(' · ') > 0 ? weatherText.slice(weatherText.indexOf(' · ') + 3) : weatherText}</div>}"),
])
edit(P('components/PhotoSaver.tsx'), [
 ("import {Clock} from './Clock';", "import {Clock} from './Clock';\nimport {WeatherIcon} from './WeatherIcon';"),
 ("{weatherText && <div class=\"ambient__weather\">{weatherText}</div>}", "{weatherText && <div class=\"ambient__weather\"><WeatherIcon text={weatherText} />{weatherText}</div>}"),
])
edit(P('lib/storage.ts'), [
 ("\tclockSize: string;", "\tclockSize: string;\n\tclockLayout: string;"),
 ("\tclockSize: 'normal',", "\tclockSize: 'normal',\n\tclockLayout: 'inline',"),
 ("\t\t\tclockSize: ['small',", "\t\t\tclockLayout: parsed.clockLayout === 'stacked' ? 'stacked' : 'inline',\n\t\t\tclockSize: ['small',"),
])
edit(P('app.tsx'), [
 ("clockSize: 'clock-size',", "clockSize: 'clock-size', clockLayout: 'clock-layout',"),
 ("[OPTION.clockSize]: 'appearance',", "[OPTION.clockSize]: 'appearance', [OPTION.clockLayout]: 'appearance',"),
 ("\t\t\t{id: OPTION.clockSize,", "\t\t\t{id: OPTION.clockLayout, label: 'Clock layout', description: 'One row (date and time side by side), or Stacked: a big time with the long date under it and the weather with its icon below.', value: true, valueText: config.clockLayout === 'stacked' ? 'Stacked' : 'One row'},\n\t\t\t{id: OPTION.clockSize,"),
 ("\t\t\tif (id === OPTION.clockSize) return", "\t\t\tif (id === OPTION.clockLayout) return {choices: ['One row', 'Stacked'], choice: config.clockLayout === 'stacked' ? 1 : 0};\n\t\t\tif (id === OPTION.clockSize) return"),
 ("\t\telse if (optionId === OPTION.clockSize) updateConfig(", "\t\telse if (optionId === OPTION.clockLayout) updateConfig({...config, clockLayout: index === 1 ? 'stacked' : 'inline'});\n\t\telse if (optionId === OPTION.clockSize) updateConfig("),
 ("\t\tc.toggle('no-date', !config.showDate);", "\t\tc.toggle('no-date', !config.showDate);\n\t\tc.toggle('clock-stacked', config.clockLayout === 'stacked');"),
 ("}, [config.clockLook, config.clockSize,", "}, [config.clockLayout, config.clockLook, config.clockSize,"),
 ("config.pcX, config.pcY]);\n", "config.pcX, config.pcY, config.clockLayout]);\n"),
])
# the move-clock options leave Settings (the saved values stay harmless at 0)
s = open(P('app.tsx')).read()
a = ".map((o): OptionItem => ({...o, group: GROUP[o.id] || 'system', ...(choicesOf(o.id) || {})}));"
assert a in s
s = s.replace(a, ".filter((o) => [OPTION.clockX, OPTION.clockY, OPTION.pcX, OPTION.pcY].indexOf(o.id as never) < 0).map((o): OptionItem => ({...o, group: GROUP[o.id] || 'system', ...(choicesOf(o.id) || {})}));", 1)
open(P('app.tsx'), 'w').write(s)
open(P('theme/global.css'), 'a').write('''
/* weather icon on the weather lines */
.wicon { width: 1.15em; height: 1.15em; vertical-align: -0.2em; margin-right: 10px; flex: none; }
.status__date--long { display: none; }
.status__weather { display: flex; align-items: center; }
/* Stacked clock: big time, long date, weather line (icon, no city) */
html.clock-stacked .status__row { flex-direction: column; align-items: flex-start; }
html.clock-stacked .screen > .pill.status .clock { order: -1; }
html.clock-stacked .screen > .pill.status .clock__time { font-size: 104px; font-weight: 600; line-height: 1.02; letter-spacing: -0.01em; }
html.clock-stacked .screen > .pill.status .clock__period { font-size: 36px; }
html.clock-stacked .status__date:not(.status__date--long) { display: none; }
html.clock-stacked .status__date--long { display: inline; font-size: 32px; font-weight: 500; margin: 2px 0 0 4px; }
html.clock-stacked .status__city { display: none; }
html.clock-stacked .status__weather { margin: 6px 0 0 4px; font-size: 28px; }
html.clock-stacked.clock-center .status__row { align-items: center; }
html.clock-stacked.clock-right .status__row { align-items: flex-end; }
''')
print('bigclock applied')
