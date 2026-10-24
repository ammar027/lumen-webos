#!/usr/bin/env python3
"""Fifty-sixth patch layer: small things from Sam Renfrew's fork (MIT):
 - a dot above each app that is open in the background (Settings > Options > Show recents indicator turns it off);
 - Back in the lower rows returns to the dock;
 - no launch screen when Lumen opens (noSplashOnLaunch)."""
import json, os, shutil
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
APP = os.path.join(ROOT, 'app')
SRC = os.path.join(APP, 'src')
def P(p): return os.path.join(SRC, p)

def sub(p, pairs):
    s = open(P(p)).read()
    for a, b in pairs:
        assert a in s, (p, a[:70])
        s = s.replace(a, b, 1)
    open(P(p), 'w').write(s)

shutil.copy(os.path.join(ROOT, 'tools/assets/sam/running.ts'), P('lib/running.ts'))

sub('components/Tile.tsx', [
 ("\tchildren?: (string | undefined)[];\n}", "\tchildren?: (string | undefined)[];\n\t/** the app is open in the background: a dot above its tile */\n\trunning?: boolean;\n}"),
 ("onMouseLeave={untilt}>\n\t\t\t<div class=\"tile__box\"", "onMouseLeave={untilt}>\n\t\t\t<div class={model.running ? 'tile__dot tile__dot--on' : 'tile__dot'} />\n\t\t\t<div class=\"tile__box\""),
])

sub('lib/storage.ts', [
 ("\tshowAmPm: boolean;", "\tshowAmPm: boolean;\n\t/** a dot above the apps that are open */\n\tshowRecents: boolean;"),
 ("\tshowAmPm: true,", "\tshowAmPm: true,\n\tshowRecents: true,"),
 ("\t\t\tshowAmPm: parsed.showAmPm !== false,", "\t\t\tshowAmPm: parsed.showAmPm !== false,\n\t\t\tshowRecents: parsed.showRecents !== false,"),
])

sub('app.tsx', [
 ("import {appTile, inputTile, pickInOrder} from './lib/tiles';", "import {appTile, inputTile, pickInOrder} from './lib/tiles';\nimport {runningApps} from './lib/running';"),
 ("showAmPm: 'show-ampm',", "showAmPm: 'show-ampm', showRecents: 'show-recents',"),
 ("\t/** what the home rows show: the apps that are not in a folder, then one tile per folder */\n\tconst homeTiles = useMemo(() => {",
  """\t// the apps still open in the background, read when Lumen comes to the front and again 5 s later (the TV may close some just then)
\tconst [running, setRunning] = useState<string[]>([]);
\tuseEffect(() => {
\t\tif (!isWebOS()) { setRunning(['youtube.leanback.v4', 'com.beb.plxnative']); return undefined; }
\t\tlet again = 0;
\t\tconst read = () => runningApps().then((ids) => ids.sort()).then((ids) => setRunning((now) => (now.join() === ids.join() ? now : ids))).catch(() => undefined);
\t\tconst onVisibility = () => {
\t\t\twindow.clearTimeout(again);
\t\t\tif (document.hidden) return;
\t\t\tread();
\t\t\tagain = window.setTimeout(read, 5000);
\t\t};
\t\tconst first = window.setTimeout(onVisibility, 2500);
\t\tdocument.addEventListener('visibilitychange', onVisibility);
\t\treturn () => { window.clearTimeout(first); window.clearTimeout(again); document.removeEventListener('visibilitychange', onVisibility); };
\t}, []);
\tuseEffect(() => { document.documentElement.classList.toggle('hide-recents', !config.showRecents); }, [config.showRecents]);
\t/** what the home rows show: the apps that are not in a folder, then one tile per folder */
\tconst homeTiles = useMemo(() => {"""),
 ("\t\treturn shownApps.filter((a) => inFolder.indexOf(a.id) === -1).map(appTile)\n\t\t\t.concat(folderTiles.map((f): TileModel => ({key: 'folder:' + f.name, label: f.name, color: '#3b4256', children: f.items.map((t) => t.imageUrl)})));\n\t}, [shownApps, folderTiles, config.folders]);",
  "\t\tconst open = (id: string) => running.indexOf(id) !== -1;\n\t\treturn shownApps.filter((a) => inFolder.indexOf(a.id) === -1).map((a): TileModel => ({...appTile(a), running: open(a.id)}))\n\t\t\t.concat(folderTiles.map((f): TileModel => ({key: 'folder:' + f.name, label: f.name, color: '#3b4256', children: f.items.map((t) => t.imageUrl), running: f.items.some((t) => open(t.key))})));\n\t}, [shownApps, folderTiles, config.folders, running]);"),
 ("\t\t\tvalue: config.showAmPm\n\t\t}\n\t], [", "\t\t\tvalue: config.showAmPm\n\t\t},\n\t\t{\n\t\t\tid: OPTION.showRecents,\n\t\t\tlabel: 'Show recents indicator',\n\t\t\tdescription: 'A dot over the apps that are open in the background.',\n\t\t\tvalue: config.showRecents\n\t\t}\n\t], ["),
 ("config.showAmPm, config.idleMinutes", "config.showAmPm, config.showRecents, config.idleMinutes"),
 ("\t\t} else if (optionId === OPTION.showAmPm) updateConfig({...config, showAmPm: !config.showAmPm});", "\t\t} else if (optionId === OPTION.showAmPm) updateConfig({...config, showAmPm: !config.showAmPm});\n\t\telse if (optionId === OPTION.showRecents) updateConfig({...config, showRecents: !config.showRecents});"),
])

sub('screens/Home.tsx', [
 ("\t\t\tcase 'back': return true;   // swallow: Back on the home screen does nothing", "\t\t\tcase 'back': if (rowIndex >= 1) { n.rowIndex = 0; break; } return true;   // Back in the lower rows returns to the dock; on the dock it does nothing"),
])

p = os.path.join(SRC, 'theme/global.css')
s = open(p).read()
s += """
/* an app open in the background: a dot above its tile (zero height, so the row does not move; it rises with the focused tile). Hidden dots are visibility: hidden, so they get no layer. */
.tile__dot { position: relative; height: 0; }
.tile__dot::before {
	content: ''; position: absolute; left: 50%; top: -24px; width: 8px; height: 8px; margin-left: -4px; border-radius: 50%;
	background: rgba(255, 255, 255, 0.92); box-shadow: 0 0 6px rgba(0, 0, 0, 0.45);
	opacity: 0; visibility: hidden;
	transition: opacity var(--motion-focus-ms) ease-out, transform var(--motion-focus-ms) ease-out, visibility 0s linear var(--motion-focus-ms);
}
.tile__dot--on::before { opacity: 1; visibility: visible; transition-delay: 0s; }
.tile--focused .tile__dot::before { transform: translateY(-8px); }
html.hide-recents .tile__dot { display: none; }
"""
open(p, 'w').write(s)

# no launch screen
ap = os.path.join(APP, 'public/appinfo.json')
m = json.load(open(ap))
m['noSplashOnLaunch'] = True
open(ap, 'w').write(json.dumps(m, indent=2) + '\n')
print('samui applied')
