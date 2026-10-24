#!/usr/bin/env python3
"""Layer: a Clock page in Settings (all the home clock options move there from Appearance), and a live picture of the clock on the choices pages of the clock options, for the home clock and for the photo screensaver clock."""
import os, shutil
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
P = lambda p: os.path.join(ROOT, 'app/src', p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:90])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)

shutil.copy(os.path.join(ROOT, 'tools/assets/sam/ClockPreview.tsx'), P('components/ClockPreview.tsx'))
edit(P('components/SettingsList.tsx'), [("'appearance' | 'language'", "'appearance' | 'clock' | 'language'")])
edit(P('screens/Settings.tsx'), [("\t{id: 'appearance', label: 'Appearance', glyph: 'contrast'},", "\t{id: 'appearance', label: 'Appearance', glyph: 'contrast'},\n\t{id: 'clock', label: 'Clock', glyph: 'timer'},")])
s = open(P('app.tsx')).read()
for k in ['clockStyle', 'clockColor', 'clockLook', 'clockSize', 'clockLayout', 'clockWeight', 'clockPos', 'showDate']:
    a = "[OPTION.%s]: 'appearance'" % k
    assert a in s, k
    s = s.replace(a, "[OPTION.%s]: 'clock'" % k, 1)
a = "import {AppSwitcher}"
assert a in s
s = s.replace(a, "import {ClockPreview} from './components/ClockPreview';\nimport {AppSwitcher}", 1)
a = "\treturn (\n\t\t<>\n\t\t\t{/* Home stays mounted"
assert a in s
add = '''	// the choices pages of the clock options show the clock as it would look
	const cp = (photo: boolean, over: (i: number) => Partial<Parameters<typeof ClockPreview>[0]>) => (i: number) => (
		<ClockPreview photo={photo} pos={photo ? config.pcPos : config.clockPos} layout={config.clockLayout} style={config.clockStyle} size={photo ? config.pcSize : config.clockSize}
			weight={config.clockWeight} look={photo ? config.pcLook : config.clockLook} color={config.clockColor} showDate={photo ? config.pcInfo : config.showDate}
			weatherText={weatherText || ''} showPeriod={config.showAmPm} {...over(i)} />
	);
	const SIZES = ['small', 'normal', 'large', 'xl', 'huge'];
	Object.assign(previews, {
		[OPTION.clockStyle]: cp(false, (i) => ({style: CLOCK_STYLES[i]})),
		[OPTION.clockColor]: cp(false, (i) => ({color: CLOCK_COLORS[i]})),
		[OPTION.clockLook]: cp(false, (i) => ({look: ['solid', 'frosted'][i]})),
		[OPTION.clockSize]: cp(false, (i) => ({size: SIZES[i]})),
		[OPTION.clockLayout]: cp(false, (i) => ({layout: ['inline', 'stacked'][i]})),
		[OPTION.clockWeight]: cp(false, (i) => ({weight: ['light', 'regular', 'bold'][i]})),
		[OPTION.clockPos]: cp(false, (i) => ({pos: ['left', 'center', 'right'][i]})),
		[OPTION.pcPos]: cp(true, (i) => ({pos: PC_POS[i]})),
		[OPTION.pcSize]: cp(true, (i) => ({size: SIZES[i]})),
		[OPTION.pcLook]: cp(true, (i) => ({look: ['frosted', 'solid'][i]}))
	});

'''
s = s.replace(a, add + a, 1)
open(P('app.tsx'), 'w').write(s)
open(P('theme/global.css'), 'a').write('''
/* clock preview (Settings > Clock, Screensaver) */
.cpv { position: relative; width: 560px; height: 315px; overflow: hidden; border-radius: 34px; }
.cpv__bg { position: absolute; inset: 0; background: var(--wp-bg, #223) center / cover no-repeat; }
.cpv__bg--photo::after { content: ""; position: absolute; inset: 0; background: rgba(0, 0, 0, 0.22); }
.cpv__scale { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; transform: scale(0.29167); transform-origin: 0 0; display: flex; box-sizing: border-box; color: #fff; }
.cpv__block { display: flex; flex-direction: column; align-items: flex-start; text-shadow: 0 2px 16px rgba(0, 0, 0, 0.45); }
.cpv__row { display: flex; align-items: baseline; gap: 14px; }
.cpv__time { line-height: 1; letter-spacing: 0; }
.cpv__date { font-size: 30px; font-weight: 500; }
.cpv__date--big { font-size: 32px; margin-top: 4px; }
.cpv__weather { font-size: 28px; margin-top: 8px; display: flex; align-items: center; opacity: 0.9; }
.cpv__block .cpv__row svg.clock__dial { width: 56px; height: 56px; align-self: center; }
.cpv__scale:not(.x) { padding: 64px 140px; }
.cpv--pos-left, .cpv--pos-bl, .cpv--pos-tl { align-items: flex-start; text-align: left; transform-origin: left top; }
.cpv--pos-center, .cpv--pos-bc, .cpv--pos-tc, .cpv--pos-c { align-items: center; text-align: center; transform-origin: center top; }
.cpv--pos-right, .cpv--pos-br, .cpv--pos-tr { align-items: flex-end; text-align: right; transform-origin: right top; }
.cpv--pos-left, .cpv--pos-bl, .cpv--pos-tl { margin-right: auto; }
.cpv--pos-center, .cpv--pos-bc, .cpv--pos-tc, .cpv--pos-c { margin-left: auto; margin-right: auto; }
.cpv--pos-right, .cpv--pos-br, .cpv--pos-tr { margin-left: auto; }
.cpv--pos-left, .cpv--pos-center, .cpv--pos-right, .cpv--pos-tl, .cpv--pos-tc, .cpv--pos-tr { align-self: flex-start; }
.cpv--pos-bl, .cpv--pos-bc, .cpv--pos-br { align-self: flex-end; }
.cpv--pos-c { align-self: center; }
.cpv--frosted .cpv__time, .cpv--frosted .cpv__date { color: transparent; -webkit-text-fill-color: transparent; background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.14) 42%, rgba(255, 255, 255, 0.3)), var(--wp-bg, none); background-size: auto, cover; -webkit-background-clip: text; background-clip: text; -webkit-text-stroke: 0.6px rgba(255, 255, 255, 0.42); text-shadow: none; filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.28)); }
''')
print('clocksettings applied')
