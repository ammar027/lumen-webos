#!/usr/bin/env python3
"""Sixty-third patch layer: your own photos from an Immich server (Sam Renfrew's fork, MIT: lib/immich.ts, lib/root.ts, docs/immich.md), as a wallpaper and as a photo-screensaver source.
Off until the server's address and a read-only API key are in /var/lib/homehook/immich.json on the TV (docs/immich.md). Settings > Wallpaper > Wallpaper type gets Immich photos (Choose wallpaper then lists
Recent, On this day, Favourites, All and each album; Recent photos from sets the window); Settings > Screensaver > Photos can use the same sources. Every Immich call goes through curl on the TV (no CORS), only
the fixed paths in lib/root.ts, and the pictures themselves load straight from the server with the key in the URL; nothing goes through a third-party resizer. The glass copies are blurred once per picture here."""
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

for name, dst in [('immich.ts', 'lib/immich.ts'), ('root.ts', 'lib/root.ts'), ('boot.ts', 'lib/boot.ts'), ('PhotoSaver.tsx', 'components/PhotoSaver.tsx')]:
    shutil.copy(os.path.join(A, name), P(dst))

edit(P('lib/storage.ts'), [
 ("\tphotoPrint: boolean;", "\tphotoPrint: boolean;\n\t/** Immich: how far back Recent photos reach, in days */\n\timmichRecentDays: number;"),
 ("\tphotoPrint: false,", "\tphotoPrint: false,\n\timmichRecentDays: 180,"),
 ("\t\t\tphotoPrint: parsed.photoPrint === true,", "\t\t\tphotoPrint: parsed.photoPrint === true,\n\t\t\timmichRecentDays: [30, 90, 180, 365].indexOf(Number(parsed.immichRecentDays)) >= 0 ? Number(parsed.immichRecentDays) : 180,"),
])

# ---- wallpaper.ts: an immich: selection ----
edit(P('lib/wallpaper.ts'), [
 ("import {LOCAL_WALLPAPERS, WALLPAPERS, cloudUrl} from '../config/wallpapers';", "import {LOCAL_WALLPAPERS, WALLPAPERS, cloudUrl} from '../config/wallpapers';\nimport {cachedServer, loadServer, nextAsset, previewUrls, picturePosition, blurredCopies, type ImmichServer} from './immich';"),
 ("let released = false;\nlet token = 0;", """let released = false;
let token = 0;
let shownCss = '';                      // an Immich picture's background-image (one photo, or a portrait pair), kept for the same reason
let shownCopies: {light: string; strong: string} | null = null;
let immichShown = '';

/** The two blurred copies of an Immich picture, in place of the pre-blurred files the bundled and cloud pictures have. */
function applyCopies (c: {light: string; strong: string}): void {
	const style = document.documentElement.style;
	style.setProperty('--wp-blur', `url("${c.light}")`);
	style.setProperty('--wp-bg', `url("${c.strong}")`);
	style.removeProperty('--dock-glass');
}"""),
 ("\t\t\telement.style.backgroundImage = `url(\"${shown}\")`;\n\t\t\tsetBlur(shown);", "\t\t\telement.style.backgroundImage = shownCss || `url(\"${shown}\")`;\n\t\t\tif (shownCopies) applyCopies(shownCopies); else setBlur(shown);"),
 ("export function setWallpaper (sel: string): void {\n\tconst el = ensureElement();\n\tconst mine = ++token;", """/** Your photos from Immich: the next picture for the source (one photo, or two portraits side by side), shown when loaded, its blurred copies a moment later. */
function setImmich (sel: string): void {
	const el = ensureElement();
	const mine = ++token;
	const root = document.documentElement.classList;
	const fallback = () => { if (mine === token) setWallpaper('local:0'); };
	const preload = (u: string) => new Promise<void>((done) => { const i = new Image(); i.onload = () => done(); i.onerror = () => done(); i.src = u; });
	const show = (srv: ImmichServer) => nextAsset(srv, sel, immichShown).then((pic) => {
		if (!pic) { fallback(); return undefined; }
		const urls = previewUrls(srv, pic);
		return Promise.all(urls.map(preload)).then(() => {
			if (mine !== token) return;
			immichShown = pic;
			shown = urls[0];
			released = false;
			shownCss = urls.map((u) => `url("${u}")`).join(', ');
			shownCopies = null;
			el.style.backgroundImage = shownCss;
			el.style.backgroundSize = urls.length > 1 ? 'calc(50% - 4px) auto, calc(50% - 4px) auto' : '';
			el.style.backgroundPosition = picturePosition(pic);
			el.style.backgroundRepeat = 'no-repeat';
			root.add(HTML_CLASS);
			blurredCopies(srv, pic).then((c) => { if (mine !== token) return; shownCopies = c; applyCopies(c); }).catch(() => undefined);
		});
	}).catch(fallback);
	const known = cachedServer();
	(known ? Promise.resolve(known) : loadServer()).then((srv) => (srv ? show(srv) : fallback())).catch(fallback);
}

export function setWallpaper (sel: string): void {
	if (sel.indexOf('immich:') === 0) { setImmich(sel); return; }
	shownCss = ''; shownCopies = null;
	const el = ensureElement();
	el.style.backgroundSize = ''; el.style.backgroundPosition = ''; el.style.backgroundRepeat = '';
	const mine = ++token;"""),
])

# ---- app.tsx ----
edit(P('app.tsx'), [
 ("import {PhotoSaver} from './components/PhotoSaver';", "import {PhotoSaver} from './components/PhotoSaver';\nimport {IMMICH_SOURCES, albums as immichAlbums, cachedServer, loadServer} from './lib/immich';"),
 ("const IDLE_CHOICES = [0, 5, 10, 20, 30];", "const IDLE_CHOICES = [0, 5, 10, 20, 30];\n/** the photo screensaver's sources: the library ones, then your Immich ones when a server is set up */\nconst photoSources = (immichOk: boolean): [string, string][] => [['favorites', 'My favorites'], ['Art', 'Art (paintings)'], ['Landscapes', 'Landscapes'], ['all', 'Everything']].concat(immichOk ? IMMICH_SOURCES.map((x): [string, string] => [x.key, 'Immich: ' + x.title]) : []) as [string, string][];"),
 ("\t// the apps still open in the background", """\t// Immich: whether a server is set up (/var/lib/homehook/immich.json on the TV), and its albums
	const [immich, setImmichState] = useState<{ok: boolean; albums: {id: string; title: string}[]}>({ok: !!cachedServer(), albums: []});
	useEffect(() => {
		if (!isWebOS()) return undefined;
		let alive = true;
		const id = window.setTimeout(() => {
			loadServer().then((srv) => (srv ? immichAlbums(srv).catch(() => []).then((albums) => { if (alive) setImmichState({ok: true, albums}); }) : alive ? setImmichState({ok: false, albums: []}) : undefined)).catch(() => undefined);
		}, 3000);
		return () => { alive = false; window.clearTimeout(id); };
	}, []);
	// the apps still open in the background"""),
 ("wpType: 'wp-type',", "wpType: 'wp-type', immichRecent: 'immich-recent',"),
 ("[OPTION.wpType]: 'wallpaper',", "[OPTION.wpType]: 'wallpaper', [OPTION.immichRecent]: 'wallpaper',"),
 ("const typeIdx = config.videoWallpaper ? 1 : config.wallpaper === 'none' ? 2 : 0;", "const typeIdx = config.videoWallpaper ? 1 : config.wallpaper.indexOf('immich:') === 0 ? 2 : config.wallpaper === 'none' ? 3 : 0;"),
 ("Video: aerial and travel videos. Plain: no wallpaper picture.', value: true, valueText: ['Pictures', 'Video', 'Plain'][typeIdx]};", "Video: aerial and travel videos. Immich photos: your own photos from an Immich server (docs/immich.md). Plain: no wallpaper picture.', value: true, valueText: ['Pictures', 'Video', 'Immich photos', 'Plain'][typeIdx]};\n\t\tconst immichRecent: Omit<OptionItem, 'group' | 'choices' | 'choice'> = {id: OPTION.immichRecent, label: 'Recent photos from', description: 'How far back the Immich source Recent reaches.', value: true, valueText: ({30: 'Last month', 90: 'Last 3 months', 180: 'Last 6 months', 365: 'Last year'} as Record<number, string>)[config.immichRecentDays]};"),
 ("if (id === OPTION.wpType) return {choices: ['Pictures', 'Video', 'Plain'], choice: typeIdx};", "if (id === OPTION.wpType) return {choices: ['Pictures', 'Video', 'Immich photos', 'Plain'], choice: typeIdx};\n\t\t\tif (id === OPTION.immichRecent) return {choices: ['Last month', 'Last 3 months', 'Last 6 months', 'Last year'], choice: [30, 90, 180, 365].indexOf(config.immichRecentDays)};"),
 ("const PHOTO_SOURCES: [string, string][] = [['favorites', 'My favorites'], ['Art', 'Art (paintings)'], ['Landscapes', 'Landscapes'], ['all', 'Everything']];", "const PHOTO_SOURCES = photoSources(immich.ok);"),
 ("return [wpType].concat(optionBase, [idle], photoOptions).map(", "return [wpType].concat(immich.ok ? [immichRecent] : [], optionBase, [idle], photoOptions).map("),
 ("config.photoSeconds, config.photoPrint]);", "config.photoSeconds, config.photoPrint, config.immichRecentDays, immich.ok]);"),
 ("updateConfig({...config, photoSource: ['favorites', 'Art', 'Landscapes', 'all'][index] || 'Landscapes'});", "updateConfig({...config, photoSource: photoSources(immich.ok).map((x) => x[0])[index] || 'Landscapes'});\n\t\telse if (optionId === OPTION.immichRecent) updateConfig({...config, immichRecentDays: [30, 90, 180, 365][index] || 180});"),
 ("""\t\t\tif (index === 1) updateConfig({...config, videoWallpaper: true});
			else if (index === 2) updateConfig({...config, videoWallpaper: false, wallpaper: 'none'});
			else updateConfig({...config, videoWallpaper: false, wallpaper: config.wallpaper === 'none' ? 'local:0' : config.wallpaper});
		}
	}, [config]);""", """\t\t\tif (index === 1) updateConfig({...config, videoWallpaper: true});
			else if (index === 2) {
				if (!immich.ok) { showToast('Immich is not set up yet: put the server address and API key in /var/lib/homehook/immich.json on the TV (docs/immich.md)', 'error'); return; }
				updateConfig({...config, videoWallpaper: false, wallpaper: 'immich:recent'});
			}
			else if (index === 3) updateConfig({...config, videoWallpaper: false, wallpaper: 'none'});
			else updateConfig({...config, videoWallpaper: false, wallpaper: config.wallpaper === 'none' || config.wallpaper.indexOf('immich:') === 0 ? 'local:0' : config.wallpaper});
		}
	}, [config, immich.ok]);"""),
 ("categories: config.videoWallpaper ? ['Video'] : config.wallpaper === 'none' ? [] :", "categories: config.videoWallpaper ? ['Video'] : config.wallpaper.indexOf('immich:') === 0 ? ['Immich'] : config.wallpaper === 'none' ? [] :"),
 ("\t\treturn {\n\t\t\tcategories: config.videoWallpaper", """\t\tif (immich.ok) {
			const tint = (i: number) => `linear-gradient(150deg, ${["#e9a15b,#6d3d4a", "#9fc2d6,#2d4a6b", "#7fc79a,#1e4a52", "#c9a0dc,#2f2f6b", "#d6a07a,#4a3430", "#8ab0e0,#1d2f5a"][i % 6]})`;
			IMMICH_SOURCES.forEach((x, i) => entries.push({key: x.key, title: x.title, category: 'Immich', tint: tint(i)}));
			immich.albums.forEach((a, i) => entries.push({key: `immich:album:${a.id}`, title: a.title, category: 'Immich', tint: tint(i + 3)}));
		}
		return {
			categories: config.videoWallpaper"""),
 ("if (!config.wpAutoMinutes || config.wallpaper.indexOf('shuffle') !== 0) return;", "if (!config.wpAutoMinutes || (config.wallpaper.indexOf('shuffle') !== 0 && config.wallpaper.indexOf('immich:') !== 0)) return;"),
])
print('immich applied')
