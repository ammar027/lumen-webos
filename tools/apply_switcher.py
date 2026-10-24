#!/usr/bin/env python3
"""Layer: Recent Apps (app switcher) in the time-pill menu: cards of the open apps, Up closes one, Close all clears them."""
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

shutil.copy(os.path.join(ROOT, 'tools/assets/sam/AppSwitcher.tsx'), P('components/AppSwitcher.tsx'))
edit(P('lib/running.ts'), [("export function runningApps", """/** Closes one open app (as root, the app manager's own call); the id is checked first. */
export function closeApp (id: string): Promise<void> {
	if (!APP_ID.test(id)) return Promise.reject(new Error('bad app id'));
	return lunaCall<{stdoutString?: string}>(LUNA.homebrewExec, {command: `luna-send -n 1 luna://com.webos.applicationManager/closeByAppId '{"id":"${id}"}'`}, 8000).then(() => undefined);
}

export function runningApps""")])
edit(P('app.tsx'), [
 ("import {runningApps} from './lib/running';", "import {runningApps, closeApp} from './lib/running';\nimport {AppSwitcher} from './components/AppSwitcher';"),
 ("| 'onboarding';", "| 'onboarding' | 'switcher';"),
 ("\t{key: MISC.settings, label: 'Settings', glyph: 'gear'},", "\t{key: 'switcher', label: 'Recent Apps', glyph: 'grid'},\n\t{key: MISC.settings, label: 'Settings', glyph: 'gear'},"),
 ("\t\tif (item.key === MISC.settings) { setScreen('settings'); return; }", "\t\tif (item.key === MISC.settings) { setScreen('settings'); return; }\n\t\tif (item.key === 'switcher') { runningApps().then((ids) => setRunning(ids.sort())).catch(() => undefined); setScreen('switcher'); return; }"),
 ("\t\t\t{controls && <ControlCenter", "\t\t\t{screen === 'switcher' && <AppSwitcher apps={apps.filter((a) => running.indexOf(a.id) !== -1 && a.id !== 'com.ammar027.lumen')}\n\t\t\t\tonOpen={(id, title) => { setScreen('home'); open(id, title); }}\n\t\t\t\tonCloseApp={(id) => { setRunning((r) => r.filter((x) => x !== id)); closeApp(id).catch(() => showToast(\"Couldn't close the app\", 'error')); }}\n\t\t\t\tonCloseAll={() => { const ids = running.filter((x) => x !== 'com.ammar027.lumen'); setRunning((r) => r.filter((x) => ids.indexOf(x) === -1)); Promise.all(ids.map(closeApp)).catch(() => undefined).then(() => closeApp('com.ammar027.lumen')).catch(() => showToast(\"Couldn't close the apps\", 'error')); setScreen('home'); }}\n\t\t\t\tonExit={() => setScreen('home')} />}\n\t\t\t{controls && <ControlCenter"),
])
css = '''
.switcher { position: absolute; inset: 0; z-index: 200; background: rgba(8, 10, 18, 0.86); display: flex; flex-direction: column; align-items: center; padding-top: 110px; color: #fff; }
.switcher__title { font-size: 44px; font-weight: 700; margin: 0 0 70px; }
.switcher__empty { font-size: 34px; opacity: .7; margin-top: 200px; }
.switcher__cards { display: flex; gap: 56px; max-width: 1760px; overflow: hidden; padding: 40px 60px; }
.switcher__card { display: flex; flex-direction: column; align-items: center; gap: 22px; width: 400px; flex: none; transition: transform .2s ease; opacity: .85; }
.switcher__card--focus { transform: scale(1.1); opacity: 1; }
.switcher__art { width: 400px; height: 225px; border-radius: 22px; background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; font-size: 96px; font-weight: 700; box-shadow: 0 20px 44px rgba(0,0,0,.45); }
.switcher__card--focus .switcher__art { box-shadow: 0 0 0 5px #fff, 0 26px 56px rgba(0,0,0,.5); }
.switcher__name { font-size: 30px; font-weight: 600; }
.switcher__hint { margin-top: 36px; font-size: 26px; opacity: .6; height: 34px; }
.switcher__all { margin-top: 60px; padding: 18px 56px; border-radius: 999px; font-size: 32px; background: rgba(255,255,255,.14); }
.switcher__all--focus { background: #fff; color: #111; }
'''
open(P('theme/global.css'), 'a').write(css)
print('switcher applied')
