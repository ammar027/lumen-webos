#!/usr/bin/env python3
"""Layer: first-run setup (Onboarding) and Settings > System > Apple TV defaults / Run setup again.
Existing installs count as set up; a fresh install (no saved config) runs the setup once."""
import os, shutil
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
SRC = os.path.join(ROOT, 'app/src')
def P(p): return os.path.join(SRC, p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:90])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)

shutil.copy(os.path.join(ROOT, 'tools/assets/sam/Onboarding.tsx'), P('components/Onboarding.tsx'))
edit(P('lib/storage.ts'), [
 ("\tseeded: boolean;\n}", "\tseeded: boolean;\n\t/** false until the first-run setup has been finished or skipped */\n\tonboarded: boolean;\n}"),
 ("\tseeded: false\n", "\tseeded: false,\n\tonboarded: false\n"),
 ("\t\t\tseeded: parsed.seeded !== false\n", "\t\t\tseeded: parsed.seeded !== false,\n\t\t\tonboarded: parsed.onboarded !== false\n"),
])
edit(P('app.tsx'), [
 ("type Screen = 'home' | 'settings' | 'photos' | 'standby';", "type Screen = 'home' | 'settings' | 'photos' | 'standby' | 'onboarding';"),
 ("restore: 'restore-settings',", "restore: 'restore-settings', tvDefaults: 'tv-defaults', setup: 'run-setup',"),
 ("useState<Screen>(import.meta.env.DEV && /[?&]settings/", "useState<Screen>(!loadConfig().onboarded || (import.meta.env.DEV && /[?&]onboarding/.test(location.search)) ? 'onboarding' : import.meta.env.DEV && /[?&]settings/"),
 ("\t\t\t{controls && <ControlCenter", "\t\t\t{screen === 'onboarding' && <Onboarding options={options} onChoose={onChoose} onDone={() => { updateConfig({...configRef.current, onboarded: true}); setScreen('home'); }} />}\n\t\t\t{controls && <ControlCenter"),
 ("\t\t\t{op" if False else "\t\t\t{ id: OPTION.restore" if False else "{id: OPTION.restore,", "{id: OPTION.tvDefaults, label: 'Apple TV defaults', description: 'Sets Lumen to how tvOS 27 starts: automatic light and dark, plain glass, normal text, six apps per row, StandBy off, screensaver after 5 minutes. Your apps, wallpaper and weather place stay.', value: false, valueText: 'Apply'},\n\t\t\t{id: OPTION.setup, label: 'Run setup again', description: 'Go through the first-run questions again.', value: false, valueText: 'Start'},\n\t\t\t{id: OPTION.restore,"),
 ("\t\telse if (optionId === OPTION.photoPrint)", "\t\telse if (optionId === OPTION.setup) setScreen('onboarding');\n\t\telse if (optionId === OPTION.tvDefaults) { updateConfig({...config, darkMode: 'auto', liveGlass: false, dockBlur: false, liquidDock: false, textSize: 'normal', focusStrength: 'normal', reduceMotion: false, hideNames: false, appsPerRow: 6, showRecents: true, idleMinutes: 5, photoSaver: false, standBy: false, standByNight: 'auto', standByFace: 'last'}); showToast('Apple TV defaults applied'); }\n\t\telse if (optionId === OPTION.photoPrint)"),
])
# the component import
s = open(P('app.tsx')).read()
s = s.replace("import {StandBy,", "import {Onboarding} from './components/Onboarding';\nimport {StandBy,", 1)
open(P('app.tsx'), 'w').write(s)
print('tvos27 applied')
