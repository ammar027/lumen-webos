#!/usr/bin/env python3
"""Final patch layer: black startup, prepared rows, glass transforms, Gallery launch.
Run after apply_lowerveil.py. --app defaults to this repository's app/ clone.
"""
import argparse,json,shutil
from pathlib import Path

def apply(app):
    tools=Path(__file__).resolve().parent
    def replace(path,old,new):
        p=app/path;s=p.read_text()
        if new in s:return
        if old not in s:raise ValueError(f'{path}: expected source anchor missing')
        p.write_text(s.replace(old,new,1))
    replace('src/screens/Home.tsx',
        '\tconst [late, setLate] = useState(false);   // the rows below the first are drawn a moment after launch\n\tuseEffect(() => { const id = window.setTimeout(() => setLate(true), 3500); return () => window.clearTimeout(id); }, []);',
        '// Prepare lower-row images before navigation, rather than mounting on the first key.\n\tconst [late, setLate] = useState(true);')
    replace('src/app.tsx','\t\t\t\tsetApps(list);','\t\t\t\tsetApps(list);\n\t\t\t\trequestAnimationFrame(() => requestAnimationFrame(() => window.dispatchEvent(new Event("lumen-apps-ready"))));')
    replace('src/app.tsx',".catch(() => showToast('Could not read the app list', 'error'));", ".catch(() => { showToast('Could not read the app list', 'error'); window.dispatchEvent(new Event('lumen-apps-ready')); });")
    replace('src/app.tsx',"Couldn't start the screensaver (it needs the Homebrew Channel)","Couldn't start the screensaver")
    p=app/'src/lib/system.ts';s=p.read_text()
    marker='/** Starts the TV\'s screensaver now'
    if marker in s:
        s=s[:s.index(marker)]+'''/** Gallery can start without waiting for a TV power-state transition.
 * Some firmware accepts turnOnScreenSaver but remains Active. Without Gallery,
 * retain the original native screensaver action. Propagate launch failures.
 */
export async function startScreensaver (): Promise<void> {
    if (!isWebOS()) throw new Error('not on a TV');
    const {appExists, launchApp} = await import('./launch');
    if (await appExists('com.ammar027.lumen.gallery')) {
        await launchApp('com.ammar027.lumen.gallery', {mode: 'screensaver'});
        return;
    }
    await lunaCall(LUNA.homebrewExec, {command: "luna-send -n 1 luna://com.webos.service.tvpower/power/turnOnScreenSaver '{}'"}, 6000);
}
''';p.write_text(s)
    public=app/'public';(public/'assets').mkdir(exist_ok=True)
    for name in ['lumen-startup.js','lumen-performance.css']:
        shutil.copy2(tools/'assets'/name,public/'assets'/name)
    shutil.copy2(tools/'assets/black-splash.png',public/'splash.png')
    p=app/'public/appinfo.json';d=json.loads(p.read_text())
    d.update(bgImage='splash.png',splashBackground='splash.png',bgColor='#000000')
    p.write_text(json.dumps(d,indent=2)+'\n')
    p=app/'index.html';s=p.read_text()
    if 'lumen-startup.js' not in s:
        s=s.replace('    <script type="module"', '''    <style>
html,body { background: #000 !important; }
.screen:not(.screen--settings) { background: #000 !important; }
.wp-image .screen:not(.screen--settings),.wp-video .screen:not(.screen--settings) { background: linear-gradient(to top,#0009,#0000 45%),linear-gradient(to bottom,#00000059,#0000 25%) !important; }
.lumen-starting #root { visibility: hidden; }
    </style>
    <script src="./assets/lumen-startup.js"></script>
    <link rel="stylesheet" href="./assets/lumen-performance.css" />
    <script type="module"''')
        p.write_text(s)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app',type=Path,default=Path(__file__).resolve().parents[1]/'app')
    apply(parser.parse_args().app.resolve())
