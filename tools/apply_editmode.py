#!/usr/bin/env python3
"""Layer (ideas from Sam Renfrew's fork, MIT): editing apps on the home screen. The hold-OK menu gets Uninstall App (a second OK confirms; never for Lumen, LG's own apps or the Homebrew Channel), a lifted app moves a whole row with Up and Down (the rows are one list cut every Apps-per-row apps) and stops at the first or last place, and the remote's 1 to 6 open the glass bar's apps."""
import os
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
P = lambda p: os.path.join(ROOT, 'app/src', p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:90])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)

# the uninstall command (fixed, the id checked first)
s = open(P('lib/root.ts')).read()
s += '''
const APP_ID = /^[A-Za-z0-9._-]+$/;
/** Never offered for uninstalling: Lumen itself, LG Home and system apps, and the Homebrew Channel, which every root command runs through (idea from Sam Renfrew's fork). */
const KEEP_INSTALLED = /^(com\\.ammar027\\.lumen|com\\.samrenfrew\\.lumen|com\\.webos\\.|com\\.palm\\.|com\\.lge\\.|org\\.webosbrew\\.hbchannel$)/;
export function canUninstall (id: string): boolean { return APP_ID.test(id) && !KEEP_INSTALLED.test(id); }

/** Removes an app: the developer-mode remover first (Homebrew Channel apps), then the store's. True once the TV no longer knows the app. */
export function uninstallApp (id: string): Promise<boolean> {
	if (!canUninstall(id)) return Promise.reject(new Error(`refused: uninstall ${id}`));
	const present = `luna-send -n 1 luna://com.webos.applicationManager/getAppInfo '{"id":"${id}"}' </dev/null 2>/dev/null | grep -q '"returnValue":true'`;
	const remove = (service: string) => `if ${present}; then luna-send -n 1 luna://com.webos.appInstallService/${service} '{"id":"${id}","subscribe":false}' </dev/null >/dev/null 2>&1; sleep 2; fi`;
	return run(`${remove('dev/remove')}; ${remove('remove')}; if ${present}; then echo kept; else echo gone; fi`, 30000).then((text) => text.indexOf('gone') !== -1);
}
'''
open(P('lib/root.ts'), 'w').write(s)

edit(P('screens/Home.tsx'), [
 ("import {Status} from '../components/Status';", "import {Status} from '../components/Status';\nimport {canUninstall} from '../lib/root';"),
 ("onEdit?: (action: 'move' | 'remove' | 'folder-add' | 'folder-out',", "onEdit?: (action: 'move' | 'remove' | 'uninstall' | 'folder-add' | 'folder-out',"),
 ("\tdockHide?: string;", "\tdockHide?: string;\n\t/** apps on a row of the home screen: Up and Down move a lifted app this many places */\n\tperRow?: number;"),
 ("weatherText, dockHide, dockDim}: Props) {", "weatherText, dockHide, dockDim, perRow = 6}: Props) {"),
 ("\tctxIndex: number;", "\tctxIndex: number;\n\t/** Uninstall was picked once: the next OK uninstalls */\n\tctxConfirm: boolean;"),
 ("menuIndex: 0, ctxIndex: 0,", "menuIndex: 0, ctxIndex: 0, ctxConfirm: false,"),
 ("const CTX_ITEMS = ['Recent Apps', 'Move', 'Remove from Home'].concat(FOLDER_PRESETS.map((f) => 'Add to ' + f));\n", ''),
 # the menu list
 ("\tconst activateCtx = (i: number) => {", """\t/** the hold-OK menu on an app in the rows: Recent Apps, Move, Uninstall (apps the TV lets go only), Remove, Add to a folder */
	const ctxItems = (): string[] => {
		const n = nav.current;
		const {rows: allRows} = latest.current;
		const row = allRows[clamp(n.rowIndex, 0, allRows.length - 1)];
		const item = row && row.items[columnOf(row)];
		const list = ['Recent Apps', 'Move'];
		if (item && item.key.indexOf(FOLDER_PREFIX) !== 0 && canUninstall(item.key)) list.push(n.ctxConfirm ? 'Press OK again to uninstall' : 'Uninstall App');
		return list.concat(['Remove from Home'], FOLDER_PRESETS.map((f) => 'Add to ' + f));
	};
	const activateCtx = (i: number) => {"""),
 ("""\t\tconst row = allRows[clamp(n.rowIndex, 0, allRows.length - 1)];
		const item = row && row.items[columnOf(row)];
		n.zone = 'rows';
		if (!item) { render(); return; }
		if (i === 0) { render(); latest.current.onActivate('menu', {key: 'switcher', label: 'Recent Apps', glyph: 'grid'} as TileModel); return; }
		if (i === 1) n.moving = item.key;
		else if (i === 2 && edit) { edit('remove', row.id, item.key); n.columns[row.id] = clamp(columnOf(row), 0, Math.max(0, row.items.length - 2)); }
		else if (edit) edit('folder-add', row.id, item.key, FOLDER_PRESETS[i - 3]);
		render();""",
  """\t\tconst row = allRows[clamp(n.rowIndex, 0, allRows.length - 1)];
		const item = row && row.items[columnOf(row)];
		const pick = ctxItems()[i];
		// uninstalling cannot be undone, so it takes a second OK
		if (pick && pick.indexOf('ninstall') !== -1 && !n.ctxConfirm) { n.ctxConfirm = true; render(); return; }
		n.ctxConfirm = false;
		n.zone = 'rows';
		if (!item || !pick) { render(); return; }
		if (pick === 'Recent Apps') { render(); latest.current.onActivate('menu', {key: 'switcher', label: 'Recent Apps', glyph: 'grid'} as TileModel); return; }
		if (pick === 'Move') n.moving = item.key;
		else if (pick.indexOf('ninstall') !== -1 && edit) edit('uninstall', row.id, item.key);
		else if (pick === 'Remove from Home' && edit) { edit('remove', row.id, item.key); n.columns[row.id] = clamp(columnOf(row), 0, Math.max(0, row.items.length - 2)); }
		else if (edit) edit('folder-add', row.id, item.key, pick.slice(7));
		render();"""),
 ("n.ctxFrom = 'rows'; n.ctxIndex = 0; n.zone = 'ctx'; render();", "n.ctxFrom = 'rows'; n.ctxIndex = 0; n.ctxConfirm = false; n.zone = 'ctx'; render();"),
 ("const count = (n.ctxFrom === 'folder' ? CTX_FOLDER_ITEMS : CTX_ITEMS).length;", "const count = (n.ctxFrom === 'folder' ? CTX_FOLDER_ITEMS : ctxItems()).length;"),
 ("case 'up': n.ctxIndex = clamp(n.ctxIndex - 1, 0, count - 1); break;", "case 'up': n.ctxIndex = clamp(n.ctxIndex - 1, 0, count - 1); n.ctxConfirm = false; break;"),
 ("case 'down': n.ctxIndex = clamp(n.ctxIndex + 1, 0, count - 1); break;", "case 'down': n.ctxIndex = clamp(n.ctxIndex + 1, 0, count - 1); n.ctxConfirm = false; break;"),
 ("{(n.ctxFrom === 'folder' ? CTX_FOLDER_ITEMS : CTX_ITEMS).map((label, i) => (", "{(n.ctxFrom === 'folder' ? CTX_FOLDER_ITEMS : ctxItems()).map((label, i) => ("),
 ("\t\t\tif (key === 'left' || key === 'right') { if (edit) edit('move', row.id, n.moving, key === 'left' ? -1 : 1); return true; }",
  "\t\t\tif (key === 'left' || key === 'right') { if (edit) edit('move', row.id, n.moving, key === 'left' ? -1 : 1); return true; }\n\t\t\t// a whole row up or down: the rows are one list cut every perRow apps\n\t\t\tif (key === 'up' || key === 'down') { if (edit) edit('move', row.id, n.moving, (key === 'up' ? -1 : 1) * latest.current.perRow); return true; }"),
 ("\tconst latest = useRef({rows, topItems, menuItems, inputs, onActivate, onEdit, folders, dockHide});\n\tlatest.current = {rows, topItems, menuItems, inputs, onActivate, onEdit, folders, dockHide};",
  "\tconst latest = useRef({rows, topItems, menuItems, inputs, onActivate, onEdit, folders, dockHide, perRow});\n\tlatest.current = {rows, topItems, menuItems, inputs, onActivate, onEdit, folders, dockHide, perRow};"),
])
# 1 to 6 open the glass bar's apps
s = open(P('screens/Home.tsx')).read()
a = "\tuseKeys(handleKey, active);\n"
assert a in s
s = s.replace(a, a + '''
	// the remote's 1 to 6 open the glass bar's apps at those places (the digit row and the number pad); idea from Sam Renfrew's fork
	useEffect(() => {
		if (!active) return undefined;
		const onDigit = (e: KeyboardEvent) => {
			const d = e.keyCode >= 49 && e.keyCode <= 54 ? e.keyCode - 48 : e.keyCode >= 97 && e.keyCode <= 102 ? e.keyCode - 96 : 0;
			const n = nav.current;
			if (!d || n.moving || (n.zone !== 'rows' && n.zone !== 'top')) return;
			const bar = latest.current.rows[0];
			const item = bar && bar.items[d - 1];
			if (!item) return;
			e.preventDefault();
			n.engaged = true; n.mode = 'key'; n.zone = 'rows'; n.rowIndex = 0; n.columns[bar.id] = d - 1; n.dockHidden = false;
			render();
			activateRowItem(bar.id, item);
		};
		window.addEventListener('keydown', onDigit);
		return () => window.removeEventListener('keydown', onDigit);
	}, [active]);
''', 1)
open(P('screens/Home.tsx'), 'w').write(s)

edit(P('app.tsx'), [
 ("const onEdit = useCallback((action: 'move' | 'remove' | 'folder-add' | 'folder-out',", "const onEdit = useCallback((action: 'move' | 'remove' | 'uninstall' | 'folder-add' | 'folder-out',"),
 ("\t\tif (action === 'folder-add') {\n\t\t\tconst folders = strip(c.folders);", """\t\tif (action === 'uninstall') {
			const title = (apps.filter((a) => a.id === key)[0] || {title: 'The app'}).title;
			showToast(`Uninstalling ${title}…`);
			uninstallApp(key).then((gone) => {
				if (!gone) { showToast(`${title} is still installed`, 'error'); return; }
				const now = configRef.current;
				updateConfig({...now, appIds: now.appIds.filter((id) => id !== key), folders: strip(now.folders).filter((f) => f.appIds.length > 0)});
				setApps((list) => list.filter((a) => a.id !== key));
				showToast(`${title} uninstalled`);
			}, () => showToast(`Couldn't uninstall ${title}`, 'error'));
			return;
		}
		if (action === 'folder-add') {
			const folders = strip(c.folders);"""),
 ("\t\tconst to = at + Number(arg);\n\t\tif (to < 0 || to >= ids.length) return;", "\t\t// a row up or down past either end stops at the first or last place\n\t\tconst to = Math.max(0, Math.min(ids.length - 1, at + Number(arg)));\n\t\tif (to === at) return;"),
 ("\t}, [apps]);\n\n\tconst onToggle", "\t}, [apps, showToast]);\n\n\tconst onToggle"),
 ("dockHide={config.dockHide} dockDim={config.dockDim} />", "dockHide={config.dockHide} dockDim={config.dockDim} perRow={config.appsPerRow} />"),
 ("import {runningApps, closeApp} from './lib/running';", "import {runningApps, closeApp} from './lib/running';\nimport {uninstallApp} from './lib/root';"),
])

open(P('theme/global.css'), 'a').write('''
/* the hold-OK and time-pill menus: dimmed like the Control Center, so white text reads on a bright wallpaper */
html:not(.light) .panel--menu { background-image: linear-gradient(rgba(14, 18, 30, 0.46), rgba(14, 18, 30, 0.46)), var(--wp-blur, none) !important; background-size: auto, 1920px 1080px !important; background-attachment: scroll, fixed !important; background-position: 0 0, 0 0 !important; background-repeat: no-repeat !important; }
''')
print('editmode applied')
