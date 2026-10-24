#!/usr/bin/env python3
"""Layer: Aerials screensaver type (the video wallpaper full screen with place caption, time and weather, like Apple TV) and the Control Center circle Art mode becomes Screensaver (it starts whichever type is chosen)."""
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

shutil.copy(os.path.join(ROOT, 'tools/assets/sam/Aerials.tsx'), P('components/Aerials.tsx'))
edit(P('lib/storage.ts'), [
 ("\tphotoSaver: boolean;", "\tphotoSaver: boolean;\n\t/** screensaver type Aerials: the video wallpaper full screen */\n\taerials: boolean;"),
 ("\tphotoSaver: false,", "\tphotoSaver: false,\n\taerials: false,"),
 ("\t\t\tphotoSaver: parsed.photoSaver === true,", "\t\t\tphotoSaver: parsed.photoSaver === true,\n\t\t\taerials: parsed.aerials === true,"),
])
edit(P('components/ControlCenter.tsx'), [
 ("{cell: 'art', glyph: 'image', label: 'Art mode'}", "{cell: 'art', glyph: 'screensaver', label: 'Screensaver'}"),
 ("else if (cell === 'art') onAction('art');", "else if (cell === 'art') onAction('screensaver');"),
])
edit(P('app.tsx'), [
 ("import {AppSwitcher}", "import {Aerials} from './components/Aerials';\nimport {AppSwitcher}"),
 ("| 'switcher';", "| 'switcher' | 'aerials';"),
 ("['Lumen Gallery or LG', 'Photos in Lumen', 'StandBy'], choice: config.standBy ? 2 : config.photoSaver ? 1 : 0}", "['Lumen Gallery or LG', 'Photos in Lumen', 'StandBy', 'Aerials'], choice: config.aerials ? 3 : config.standBy ? 2 : config.photoSaver ? 1 : 0}"),
 ("updateConfig({...config, photoSaver: index === 1, standBy: index === 2});", "updateConfig({...config, photoSaver: index === 1, standBy: index === 2, aerials: index === 3});"),
 ("if (!config.idleMinutes || config.videoWallpaper) return;", "if (!config.idleMinutes || (config.videoWallpaper && !config.aerials)) return;"),
 ("if (!document.hidden) { if (configRef.current.standBy) setScreen('standby');", "if (!document.hidden) { if (configRef.current.aerials) setScreen('aerials'); else if (configRef.current.standBy) setScreen('standby');"),
 ("if (item.key === 'screensaver') { if (configRef.current.standBy)", "if (item.key === 'screensaver') { if (configRef.current.aerials) { setScreen('aerials'); return; } if (configRef.current.standBy)"),
 ("else if (optionId === OPTION.photoStart) setScreen(config.standBy ? 'standby' : 'photos');", "else if (optionId === OPTION.photoStart) setScreen(config.aerials ? 'aerials' : config.standBy ? 'standby' : 'photos');"),
 ("\t\t\t{controls && <ControlCenter", "\t\t\t{screen === 'aerials' && <Aerials videoOn={config.videoWallpaper} showPeriod={config.showAmPm} weatherText={weatherText} onExit={() => setScreen('home')} />}\n\t\t\t{controls && <ControlCenter"),
])
open(P('theme/global.css'), 'a').write('''
html.in-aerials .screen { visibility: hidden; }
.aerials { position: absolute; inset: 0; z-index: 300; color: #fff; }
.aerials__time { position: absolute; left: 110px; bottom: 150px; font-size: 96px; font-weight: 700; text-shadow: 0 2px 18px rgba(0,0,0,.55); }
.aerials__ampm { font-size: 36px; margin-left: 12px; font-weight: 600; }
.aerials__weather { position: absolute; left: 114px; bottom: 100px; font-size: 32px; opacity: .9; text-shadow: 0 2px 12px rgba(0,0,0,.55); }
.aerials .videocap { opacity: 1; display: block; right: 110px; top: auto; bottom: 100px; }
''')
print('aerials applied')
