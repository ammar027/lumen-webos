#!/usr/bin/env python3
"""Sixty-sixth patch layer: the options the fork's Settings has that ours lacked (Sam Renfrew's fork, MIT), each with a page and a description:
Home Screen: Hide app names, Apps per row (4, 5 or 6); Appearance: Reduce motion, Liquid glass dock (the glass bar bends the picture at its rim; off by default, slower to move along);
Screensaver: Brightness (the TV's backlight goes down while the photo screensaver shows, and back up after); System: Restore settings from the TV (Lumen keeps a copy of its settings in
/var/lib/homehook/lumen-config.json after each change, so a reinstall under another app id can get them back)."""
import os, shutil
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
SRC = os.path.join(ROOT, 'app/src')
A = os.path.join(ROOT, 'tools/assets/sam')
def P(p): return os.path.join(SRC, p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:90])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)

for name, dst in [('root.ts', 'lib/root.ts'), ('backup.ts', 'lib/backup.ts'), ('liquidGlass.ts', 'lib/liquidGlass.ts'), ('PhotoSaver.tsx', 'components/PhotoSaver.tsx')]:
    shutil.copy(os.path.join(A, name), P(dst))

edit(P('lib/storage.ts'), [
 ("\tfocusStrength: string;", "\tfocusStrength: string;\n\thideNames: boolean;\n\treduceMotion: boolean;\n\tliquidDock: boolean;\n\t/** apps in the glass bar and in each row below it: 4, 5 or 6 */\n\tappsPerRow: number;\n\t/** the TV's backlight while the photo screensaver shows: tv (unchanged), dim or low */\n\tphotoBrightness: string;"),
 ("\tfocusStrength: 'normal',", "\tfocusStrength: 'normal',\n\thideNames: false,\n\treduceMotion: false,\n\tliquidDock: false,\n\tappsPerRow: 6,\n\tphotoBrightness: 'tv',"),
 ("\t\t\tfocusStrength: parsed.focusStrength === 'subtle'", "\t\t\thideNames: parsed.hideNames === true,\n\t\t\treduceMotion: parsed.reduceMotion === true,\n\t\t\tliquidDock: parsed.liquidDock === true,\n\t\t\tappsPerRow: [4, 5, 6].indexOf(Number(parsed.appsPerRow)) >= 0 ? Number(parsed.appsPerRow) : 6,\n\t\t\tphotoBrightness: parsed.photoBrightness === 'dim' || parsed.photoBrightness === 'low' ? parsed.photoBrightness : 'tv',\n\t\t\tfocusStrength: parsed.focusStrength === 'subtle'"),
])

edit(P('lib/tvcontrols.ts'), [
 ("import {isWebOS, lunaCall} from './luna';", "import {isWebOS, lunaCall} from './luna';\nimport {readCache, writeCache} from './boot';"),
 ("export function setVolume (", """/** The backlight before the screensaver lowered it, kept until it is put back, so a launch after a crash can still put it back. */
const SAVED_BACKLIGHT_KEY = 'lumen-screensaver-backlight-v1';
let dimmedHere = false;

/** Lowers the backlight to `level` for the screensaver (never raises it), keeping the old value to put back. */
export function dimForScreensaver (level: number, stillWanted: () => boolean): void {
	readBacklight().then((before) => {
		if (before === null || before <= level || !stillWanted()) return undefined;
		if (readCache<number>(SAVED_BACKLIGHT_KEY) === null) writeCache(SAVED_BACKLIGHT_KEY, before);
		dimmedHere = true;
		return setBacklight(level);
	}).catch(() => undefined);
}

/** Puts back the backlight the screensaver lowered, if it did. Safe to call at any time. */
export function restoreBacklight (): void {
	const before = readCache<number>(SAVED_BACKLIGHT_KEY);
	if (before === null) return;
	setBacklight(before).then(() => { writeCache(SAVED_BACKLIGHT_KEY, null); dimmedHere = false; }).catch(() => undefined);
}

/** At start-up: a backlight left low by a screensaver that never ended (Lumen closed or crashed) is put back, unless this launch dimmed it. */
export function restoreLeftoverBacklight (): void {
	if (!dimmedHere) restoreBacklight();
}

export function setVolume ("""),
])

edit(P('app.tsx'), [
 ("import {PhotoSaver} from './components/PhotoSaver';", "import {PhotoSaver} from './components/PhotoSaver';\nimport {setLiquidDock} from './lib/liquidGlass';\nimport {scheduleBackup, readBackup} from './lib/backup';\nimport {restoreLeftoverBacklight} from './lib/tvcontrols';"),
 ("wpType: 'wp-type',", "wpType: 'wp-type', hideNames: 'hide-names', reduceMotion: 'reduce-motion', liquidDock: 'liquid-dock', appsPerRow: 'apps-per-row', restore: 'restore-settings', photoBrightness: 'photo-brightness',"),
 ("[OPTION.wpType]: 'wallpaper',", "[OPTION.wpType]: 'wallpaper', [OPTION.hideNames]: 'home', [OPTION.appsPerRow]: 'home', [OPTION.reduceMotion]: 'appearance', [OPTION.liquidDock]: 'appearance', [OPTION.restore]: 'system', [OPTION.photoBrightness]: 'screensaver',"),
 ("\t\tconst immichRecent:", """\t\tconst more: Omit<OptionItem, 'group' | 'choices' | 'choice'>[] = [
			{id: OPTION.hideNames, label: 'Hide app names', description: 'No names under the apps on the home screen, not even the one in focus. Settings still shows them.', value: config.hideNames},
			{id: OPTION.appsPerRow, label: 'Apps per row', description: 'How many apps the glass bar and each row below it hold. Fewer apps per row leaves more room around each.', value: true, valueText: String(config.appsPerRow)},
			{id: OPTION.reduceMotion, label: 'Reduce motion', description: 'Focus, rows and panels change at once, without sliding, fading or zooming.', value: config.reduceMotion},
			{id: OPTION.liquidDock, label: 'Liquid glass dock', description: 'The glass bar bends the picture at its edges, like Liquid Glass on Apple TV. Moving along the dock is slower with it on, and over a video wallpaper it only tints. Off by default.', value: config.liquidDock},
			{id: OPTION.photoBrightness, label: 'Brightness', description: "How bright the TV is while the photo screensaver shows. Dim and Very dim lower the TV's backlight and put it back when you press a key.", value: config.photoBrightness !== 'tv', valueText: config.photoBrightness === 'dim' ? 'Dim' : config.photoBrightness === 'low' ? 'Very dim' : 'As the TV is set'},
			{id: OPTION.restore, label: 'Restore settings from the TV', description: 'Lumen keeps a copy of its settings on the TV (/var/lib/homehook/lumen-config.json) after every change. This puts that copy back, replacing the settings here. Needs the Homebrew Channel.', value: false, valueText: 'Restore'}
		];
		const immichRecent:"""),
 ("return [wpType, focusStrength].concat(", "return [wpType, focusStrength].concat(more, "),
 ("if (id === OPTION.wpType) return", "if (id === OPTION.appsPerRow) return {choices: ['4', '5', '6'], choice: [4, 5, 6].indexOf(config.appsPerRow)};\n\t\t\tif (id === OPTION.photoBrightness) return {choices: ['As the TV is set', 'Dim', 'Very dim'], choice: ['tv', 'dim', 'low'].indexOf(config.photoBrightness)};\n\t\t\tif (id === OPTION.wpType) return"),
 ("config.wpNewOnLaunch, config.focusStrength, immich.ok]);", "config.wpNewOnLaunch, config.focusStrength, config.hideNames, config.appsPerRow, config.reduceMotion, config.liquidDock, config.photoBrightness, immich.ok]);"),
 ("\t\telse if (optionId === OPTION.focusStrength)", "\t\telse if (optionId === OPTION.appsPerRow) updateConfig({...config, appsPerRow: [4, 5, 6][index] || 6});\n\t\telse if (optionId === OPTION.photoBrightness) updateConfig({...config, photoBrightness: ['tv', 'dim', 'low'][index] || 'tv'});\n\t\telse if (optionId === OPTION.focusStrength)"),
 ("\t\telse if (optionId === OPTION.photoPrint)", """\t\telse if (optionId === OPTION.hideNames) updateConfig({...config, hideNames: !config.hideNames});
		else if (optionId === OPTION.reduceMotion) updateConfig({...config, reduceMotion: !config.reduceMotion});
		else if (optionId === OPTION.liquidDock) updateConfig({...config, liquidDock: !config.liquidDock});
		else if (optionId === OPTION.restore) {
			readBackup().then((saved) => {
				if (!saved) { showToast('No copy of the settings found on the TV', 'error'); return; }
				try { localStorage.setItem('launcher-config-v2', JSON.stringify(saved)); } catch { /* no storage */ }
				window.location.reload();
			}).catch(() => showToast("Couldn't read the settings copy (it needs the Homebrew Channel)", 'error'));
		}
		else if (optionId === OPTION.photoPrint)"""),
 ("\tuseEffect(() => { document.documentElement.classList.toggle('liveblur', config.liveGlass); }, [config.liveGlass]);", """\tuseEffect(() => { document.documentElement.classList.toggle('liveblur', config.liveGlass); }, [config.liveGlass]);
	useEffect(() => { document.documentElement.classList.toggle('hide-names', config.hideNames); }, [config.hideNames]);
	useEffect(() => { document.documentElement.classList.toggle('reduce-motion', config.reduceMotion); }, [config.reduceMotion]);
	useEffect(() => { setLiquidDock(config.liquidDock); }, [config.liquidDock]);
	useEffect(() => { scheduleBackup(config); }, [config]);
	useEffect(() => { const id = window.setTimeout(restoreLeftoverBacklight, 6000); return () => window.clearTimeout(id); }, []);"""),
 ("const FIRST_ROW = 6;\n", ""),
 ("items: homeTiles.slice(0, FIRST_ROW), emptyText", "items: homeTiles.slice(0, config.appsPerRow), emptyText"),
 ("...(homeTiles.length > FIRST_ROW ? [{id: ROW.dock, label: 'More apps', items: homeTiles.slice(FIRST_ROW)}] : []),", "...(homeTiles.length > config.appsPerRow ? [{id: ROW.dock, label: 'More apps', items: homeTiles.slice(config.appsPerRow)}] : []),"),
 ("], [homeTiles, shownInputs, recentApps, config.language]);", "], [homeTiles, shownInputs, recentApps, config.language, config.appsPerRow]);"),
 ("print={config.photoPrint} weatherText", "print={config.photoPrint} backlight={({dim: 30, low: 10} as Record<string, number>)[config.photoBrightness]} weatherText"),
])

p = P('theme/global.css')
open(p, 'a').write("""
/* ---------- Settings > Appearance > Reduce motion, Hide app names, Liquid glass dock (from the fork) ---------- */
html.reduce-motion *, html.reduce-motion *::before, html.reduce-motion *::after { transition: none !important; animation: none !important; }
html.hide-names .rows .tile__label, html.hide-names .panel--folder .tile__label { display: none; }
/* the glass bar bends the picture at its rim (lib/liquidGlass.ts, SVG displacement). Over a video it only tints. Off while the rows are down: the slide would redraw it each frame. */
html.liquiddock .rows:not(.rows--lower) > .row:first-child::before {
	-webkit-backdrop-filter: blur(4px) url(#lg-dock) brightness(1.1) saturate(1.5) !important;
	backdrop-filter: blur(4px) url(#lg-dock) brightness(1.1) saturate(1.5) !important;
	box-shadow: inset 0 0 4px 0 rgba(250, 250, 250, 0.5), inset 2px 2px 1.5px -1px rgba(255, 255, 255, 0.55), inset 3px 3px 2px -2px rgba(110, 200, 255, 0.7), inset -3px -3px 2px -2px rgba(255, 120, 190, 0.28), 0 20px 44px rgba(0, 0, 0, 0.28) !important;
}
""")
print('more options applied')
