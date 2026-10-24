#!/usr/bin/env python3
"""Sixty-fourth patch layer: several pictures picked at once, with a Select all tile in every category (the flow of Sam Renfrew's wallpaper redesign, MIT, over our own wallpaper model).
In Settings > Wallpaper > Choose wallpaper (Pictures), OK on a picture ticks or unticks it; Select all ticks a whole category (and clears it again). Lumen shows one of the ticked pictures, a new one on each
start (Settings > Wallpaper > New picture on startup; off keeps the last one) and when Change wallpaper automatically fires. An old single pick counts as one tick."""
import os
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
SRC = os.path.join(ROOT, 'app/src')
def P(p): return os.path.join(SRC, p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:90])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)

edit(P('lib/storage.ts'), [
 ("\timmichRecentDays: number;", "\timmichRecentDays: number;\n\t/** the pictures ticked in Settings > Wallpaper (cloud:<id> or local:<n>); the wallpaper is then 'picks' */\n\twallpaperPicks: string[];\n\t/** a different one of them each start */\n\twpNewOnLaunch: boolean;"),
 ("\timmichRecentDays: 180,", "\timmichRecentDays: 180,\n\twallpaperPicks: [],\n\twpNewOnLaunch: true,"),
 ("\t\t\timmichRecentDays: [30, 90, 180, 365]", "\t\t\twallpaperPicks: Array.isArray(parsed.wallpaperPicks) ? parsed.wallpaperPicks.filter((x: unknown) => typeof x === 'string' && /^(cloud|local):[A-Za-z0-9]+$/.test(x)) : [],\n\t\t\twpNewOnLaunch: parsed.wpNewOnLaunch !== false,\n\t\t\timmichRecentDays: [30, 90, 180, 365]"),
])

edit(P('lib/wallpaper.ts'), [
 ("function candidates (sel: string): string[] {\n\tconst fallback = LOCAL_WALLPAPERS.length > 0 ? [LOCAL_WALLPAPERS[0].file] : [];\n",
  """let picks: string[] = [];
let newOnLaunch = true;
/** the pictures ticked in Settings (the 'picks' choice) and whether each start takes a different one */
export function setPicks (list: string[], fresh: boolean): void { picks = list; newOnLaunch = fresh; }

const LAST_PICK_KEY = 'lumen-wp-last-pick-v1';
/** One of the ticked pictures: a different one each time, or the one shown last when New picture on startup is off. */
function choosePick (): string {
	const ok = picks.filter((k) => k.indexOf('local:') === 0 ? !!LOCAL_WALLPAPERS[Number(k.slice(6))] : WALLPAPERS.some((w) => w.id === k.slice(6)));
	if (ok.length === 0) return 'local:0';
	let last = '';
	try { last = localStorage.getItem(LAST_PICK_KEY) || ''; } catch { /* no storage: just pick */ }
	const chosen = !newOnLaunch && ok.indexOf(last) !== -1 ? last
		: (() => { const others = ok.length > 1 ? ok.filter((k) => k !== last) : ok; return others[Math.floor(Math.random() * others.length)]; })();
	try { localStorage.setItem(LAST_PICK_KEY, chosen); } catch { /* ignore */ }
	return chosen;
}

function candidates (sel: string): string[] {
	const fallback = LOCAL_WALLPAPERS.length > 0 ? [LOCAL_WALLPAPERS[0].file] : [];
	if (sel === 'picks') sel = choosePick();
"""),
])

edit(P('components/WallpaperPicker.tsx'), [
 ("e.key === 'none' ? 'Plain' : 'Shuffle'", "e.key.indexOf('selectall:') === 0 ? 'Select all' : e.key === 'none' ? 'Plain' : 'Shuffle'"),
])

edit(P('screens/Settings.tsx'), [
 ("e.key.indexOf('shuffle:') !== 0 && e.category", "e.key.indexOf('shuffle:') !== 0 && e.key.indexOf('selectall:') !== 0 && e.category"),
])

edit(P('app.tsx'), [
 ("import {resized, setFavorites, setWallpaper} from './lib/wallpaper';", "import {resized, setFavorites, setPicks, setWallpaper} from './lib/wallpaper';"),
 ("useEffect(() => { setFavorites(config.favoriteWallpapers); setWallpaper(config.wallpaper); }, [config.wallpaper]);", "useEffect(() => { setFavorites(config.favoriteWallpapers); setPicks(config.wallpaperPicks, config.wpNewOnLaunch); setWallpaper(config.wallpaper); }, [config.wallpaper, config.wallpaperPicks]);\n\tuseEffect(() => setPicks(config.wallpaperPicks, config.wpNewOnLaunch), [config.wpNewOnLaunch]);"),
 ("(config.wallpaper.indexOf('shuffle') !== 0 && config.wallpaper.indexOf('immich:') !== 0)", "(config.wallpaper.indexOf('shuffle') !== 0 && config.wallpaper.indexOf('immich:') !== 0 && config.wallpaper !== 'picks')"),
 ("wpType: 'wp-type',", "wpType: 'wp-type', wpNew: 'wp-new',"),
 ("[OPTION.wpType]: 'wallpaper',", "[OPTION.wpType]: 'wallpaper', [OPTION.wpNew]: 'wallpaper',"),
 ("\t\tconst immichRecent:", "\t\tconst wpNew: Omit<OptionItem, 'group' | 'choices' | 'choice'> = {id: OPTION.wpNew, label: 'New picture on startup', description: 'With several pictures ticked in Choose wallpaper, show a different one each time Lumen starts. Off keeps the picture shown last.', value: config.wpNewOnLaunch};\n\t\tconst immichRecent:"),
 ("return [wpType].concat(immich.ok ? [immichRecent] : [], optionBase,", "return [wpType].concat(immich.ok ? [immichRecent] : [], [wpNew], optionBase,"),
 ("config.immichRecentDays, immich.ok]);", "config.immichRecentDays, config.wpNewOnLaunch, immich.ok]);"),
 ("\t\telse if (optionId === OPTION.photoPrint)", "\t\telse if (optionId === OPTION.wpNew) updateConfig({...config, wpNewOnLaunch: !config.wpNewOnLaunch});\n\t\telse if (optionId === OPTION.photoPrint)"),
 ("""\t\tconst entries: WallpaperEntry[] = [
			{key: 'shuffle', title: 'Shuffle (a new one each time)', category: 'Defaults'},
			{key: 'none', title: 'Plain background', category: 'Defaults'}
		];
		LOCAL_WALLPAPERS.forEach((w, i) => entries.push({key: `local:${i}`, title: w.title, category: 'Defaults', thumb: w.file}));
		WALLPAPER_CATEGORIES.forEach((c) => entries.push({key: `shuffle:${c}`, title: `Shuffle ${c}`, category: c}));
		entries.push({key: 'shuffle:Favorites', title: 'Shuffle my favorites', category: 'Favorites'});
""", """\t\t// the ticked pictures (an old single choice counts as one tick)
		const effPicks = config.wallpaperPicks.length > 0 ? config.wallpaperPicks : /^(cloud|local):/.test(config.wallpaper) ? [config.wallpaper] : [];
		const group = (cat: string): string[] => cat === 'Defaults' ? LOCAL_WALLPAPERS.map((_, i) => `local:${i}`)
			: cat === 'Favorites' ? WALLPAPERS.filter((w) => config.favoriteWallpapers.indexOf(w.id) !== -1).map((w) => `cloud:${w.id}`)
			: WALLPAPERS.filter((w) => w.category === cat).map((w) => `cloud:${w.id}`);
		const allOn = (cat: string) => { const g = group(cat); return g.length > 0 && g.every((k) => effPicks.indexOf(k) !== -1); };
		const pickPictures = (key: string) => {
			let next: string[];
			if (key.indexOf('selectall:') === 0) {
				const all = group(key.slice(10));
				next = allOn(key.slice(10)) ? effPicks.filter((k) => all.indexOf(k) === -1) : effPicks.concat(all.filter((k) => effPicks.indexOf(k) === -1));
			} else next = effPicks.indexOf(key) !== -1 ? effPicks.filter((k) => k !== key) : effPicks.concat(key);
			updateConfig({...config, wallpaperPicks: next, wallpaper: next.length > 0 ? 'picks' : 'local:0', videoWallpaper: false});
		};
		const entries: WallpaperEntry[] = [];
		['Defaults', 'Favorites'].concat(WALLPAPER_CATEGORIES).forEach((c) => entries.push({key: `selectall:${c}`, title: 'Select all', category: c, on: allOn(c)}));
		LOCAL_WALLPAPERS.forEach((w, i) => entries.push({key: `local:${i}`, title: w.title, category: 'Defaults', thumb: w.file, on: effPicks.indexOf(`local:${i}`) !== -1}));
"""),
 ("const e = {key: `cloud:${w.id}`, title: w.title, category: w.category, thumb: resized(cloudUrl(w), 360), fav};", "const e = {key: `cloud:${w.id}`, title: w.title, category: w.category, thumb: resized(cloudUrl(w), 360), fav, on: effPicks.indexOf(`cloud:${w.id}`) !== -1};"),
 ("onPick: (key: string) => updateConfig(key.indexOf('video:') === 0 ?", "onPick: (key: string) => (key.indexOf('selectall:') === 0 || /^(cloud|local):/.test(key)) ? pickPictures(key) : updateConfig(key.indexOf('video:') === 0 ?"),
])
print('wallpaper picks applied')
