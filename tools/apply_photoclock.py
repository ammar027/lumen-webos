#!/usr/bin/env python3
"""Layer: photo screensaver clock customization, like the iOS lock screen: position (off, 3 bottom, 3 top, centre), size, date and weather on or off, and a blur for the photos (Settings > Screensaver)."""
import os
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
P = lambda p: os.path.join(ROOT, 'app/src', p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:90])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)
POS = ['off', 'bl', 'bc', 'br', 'tl', 'tc', 'tr', 'c']
edit(P('lib/storage.ts'), [
 ("\tclockStyle: string;", "\tclockStyle: string;\n\tpcPos: string;\n\tpcSize: string;\n\tpcInfo: boolean;\n\tpcBlur: string;"),
 ("\tclockStyle: 'digital',", "\tclockStyle: 'digital',\n\tpcPos: 'bl',\n\tpcSize: 'normal',\n\tpcInfo: true,\n\tpcBlur: 'off',"),
 ("\t\t\tclockStyle: ['date',", "\t\t\tpcPos: %r.indexOf(String(parsed.pcPos)) >= 0 ? String(parsed.pcPos) : 'bl',\n\t\t\tpcSize: ['small', 'large', 'xl'].indexOf(String(parsed.pcSize)) >= 0 ? String(parsed.pcSize) : 'normal',\n\t\t\tpcInfo: parsed.pcInfo !== false,\n\t\t\tpcBlur: ['soft', 'strong'].indexOf(String(parsed.pcBlur)) >= 0 ? String(parsed.pcBlur) : 'off',\n\t\t\tclockStyle: ['date'," % POS),
])
edit(P('components/PhotoSaver.tsx'), [
 ("\t\t\t<div class=\"ambient__clock\"><Clock showPeriod={showPeriod} /></div>\n\t\t\t<div class=\"ambient__info\">{weatherText && <div class=\"ambient__weather\">{weatherText}</div>}<div class=\"ambient__date\">{dateText()}</div></div>",
  "\t\t\t<div class=\"ambient__block\">\n\t\t\t\t<div class=\"ambient__clock\"><Clock showPeriod={showPeriod} /></div>\n\t\t\t\t<div class=\"ambient__info\">{weatherText && <div class=\"ambient__weather\">{weatherText}</div>}<div class=\"ambient__date\">{dateText()}</div></div>\n\t\t\t</div>"),
])
edit(P('app.tsx'), [
 ("clockColor: 'clock-color',", "clockColor: 'clock-color', pcPos: 'pc-pos', pcSize: 'pc-size', pcInfo: 'pc-info', pcBlur: 'pc-blur',"),
 ("[OPTION.clockColor]: 'language',", "[OPTION.clockColor]: 'language', [OPTION.pcPos]: 'screensaver', [OPTION.pcSize]: 'screensaver', [OPTION.pcInfo]: 'screensaver', [OPTION.pcBlur]: 'screensaver',"),
 ("\t\t\t{id: OPTION.restore,", "\t\t\t{id: OPTION.pcPos, label: 'Clock position', description: 'Where the clock sits on the photo screensaver: bottom, top or centre, left, middle or right, or off. The clock style and colour are the ones in Settings > Language.', value: config.pcPos !== 'off', valueText: PC_POS_NAMES[Math.max(0, PC_POS.indexOf(config.pcPos))]},\n\t\t\t{id: OPTION.pcSize, label: 'Clock size on photos', description: 'How large the clock is on the photo screensaver.', value: true, valueText: ['Small', 'Normal', 'Large', 'Extra large'][['small', 'normal', 'large', 'xl'].indexOf(config.pcSize)]},\n\t\t\t{id: OPTION.pcInfo, label: 'Date and weather on photos', description: 'The date and the weather under the clock on the photo screensaver.', value: config.pcInfo},\n\t\t\t{id: OPTION.pcBlur, label: 'Photo blur', description: 'Blurs the photos behind the clock, like a lock screen with a blurred wallpaper. Soft or Strong; the crossfade between photos may be less smooth with it on.', value: config.pcBlur !== 'off', valueText: config.pcBlur === 'soft' ? 'Soft' : config.pcBlur === 'strong' ? 'Strong' : 'Off'},\n\t\t\t{id: OPTION.restore,"),
 ("\t\t\tif (id === OPTION.clockStyle) return", "\t\t\tif (id === OPTION.pcPos) return {choices: PC_POS_NAMES, choice: Math.max(0, PC_POS.indexOf(config.pcPos))};\n\t\t\tif (id === OPTION.pcSize) return {choices: ['Small', 'Normal', 'Large', 'Extra large'], choice: ['small', 'normal', 'large', 'xl'].indexOf(config.pcSize)};\n\t\t\tif (id === OPTION.pcBlur) return {choices: ['Off', 'Soft', 'Strong'], choice: ['off', 'soft', 'strong'].indexOf(config.pcBlur)};\n\t\t\tif (id === OPTION.clockStyle) return"),
 ("\t\telse if (optionId === OPTION.clockStyle) updateConfig(", "\t\telse if (optionId === OPTION.pcPos) updateConfig({...config, pcPos: PC_POS[index] || 'bl'});\n\t\telse if (optionId === OPTION.pcSize) updateConfig({...config, pcSize: ['small', 'normal', 'large', 'xl'][index] || 'normal'});\n\t\telse if (optionId === OPTION.pcBlur) updateConfig({...config, pcBlur: ['off', 'soft', 'strong'][index] || 'off'});\n\t\telse if (optionId === OPTION.clockStyle) updateConfig("),
 ("\t\telse if (optionId === OPTION.showDate) updateConfig(", "\t\telse if (optionId === OPTION.pcInfo) updateConfig({...config, pcInfo: !config.pcInfo});\n\t\telse if (optionId === OPTION.showDate) updateConfig("),
 ("const RECENT_MAX = 8;", "const RECENT_MAX = 8;\nconst PC_POS = %r;\nconst PC_POS_NAMES = ['Off', 'Bottom left', 'Bottom centre', 'Bottom right', 'Top left', 'Top centre', 'Top right', 'Centre'];" % POS),
 ("\t\tc.toggle('no-date', !config.showDate);", "\t\tc.toggle('no-date', !config.showDate);\n\t\tPC_POS.forEach((k) => c.toggle('pcpos-' + k, config.pcPos === k));\n\t\t['small', 'large', 'xl'].forEach((k) => c.toggle('pcsize-' + k, config.pcSize === k));\n\t\tc.toggle('pc-noinfo', !config.pcInfo);\n\t\t['soft', 'strong'].forEach((k) => c.toggle('pcblur-' + k, config.pcBlur === k));"),
 ("}, [config.clockSize, config.clockWeight, config.clockPos, config.showDate]);", "}, [config.clockSize, config.clockWeight, config.clockPos, config.showDate, config.pcPos, config.pcSize, config.pcInfo, config.pcBlur]);"),
])
open(P('theme/global.css'), 'a').write('''
/* photo screensaver: clock block (clock, date, weather) placed like a lock screen */
.ambient__block { position: absolute; left: 90px; bottom: 64px; display: flex; flex-direction: column; align-items: flex-start; text-align: left; }
.ambient__block .ambient__clock, .ambient__block .ambient__info { position: static; text-align: inherit; }
.ambient__block .clock { position: static !important; left: auto !important; right: auto !important; top: auto !important; bottom: auto !important; margin: 0 !important; }
.ambient__block .ambient__info { margin-top: 6px; }
.ambient__block .ambient__weather { margin-bottom: 4px; }
html.pcpos-off .ambient__block { display: none; }
html.pcpos-bc .ambient__block, html.pcpos-tc .ambient__block, html.pcpos-c .ambient__block { left: 0; right: 0; align-items: center; text-align: center; }
html.pcpos-br .ambient__block, html.pcpos-tr .ambient__block { left: auto; right: 90px; align-items: flex-end; text-align: right; }
html.pcpos-tl .ambient__block, html.pcpos-tc .ambient__block, html.pcpos-tr .ambient__block { bottom: auto; top: 70px; }
html.pcpos-c .ambient__block { bottom: auto; top: 50%; transform: translateY(-50%); }
html.pcsize-small .ambient__block { transform: scale(0.7); }
html.pcsize-large .ambient__block { transform: scale(1.4); }
html.pcsize-xl .ambient__block { transform: scale(1.9); }
html.pcpos-bl .ambient__block, html.pcpos-tl .ambient__block { transform-origin: left bottom; }
html.pcpos-tl .ambient__block { transform-origin: left top; }
html.pcpos-bc .ambient__block { transform-origin: center bottom; }
html.pcpos-tc .ambient__block { transform-origin: center top; }
html.pcpos-br .ambient__block { transform-origin: right bottom; }
html.pcpos-tr .ambient__block { transform-origin: right top; }
html.pcpos-c.pcsize-small .ambient__block { transform: translateY(-50%) scale(0.7); }
html.pcpos-c.pcsize-large .ambient__block { transform: translateY(-50%) scale(1.4); }
html.pcpos-c.pcsize-xl .ambient__block { transform: translateY(-50%) scale(1.9); }
html.pc-noinfo .ambient__block .ambient__info { display: none; }
html.pcblur-soft .ambient__photo { filter: blur(10px); }
html.pcblur-strong .ambient__photo { filter: blur(28px); }
''')
print('photoclock applied')
