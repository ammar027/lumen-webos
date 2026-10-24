#!/usr/bin/env python3
"""Fifty-eighth patch layer: Settings as a stack of pages, like Apple TV's (Sam Renfrew's fork, MIT: screens/Settings.tsx, components/SettingsList.tsx).
A top page lists Apps, Sources, Wallpaper, Home Screen, Screensaver, Weather, Appearance, Language and Clock, System. Each option group is a page of single-line rows (a big glyph and the
option's description on the left); an option that picks from a list opens a choices page; Back goes up one page. Our own parts stay: the wallpaper picker with Favorites and the video note,
re-ordering by holding OK, the options themselves (now grouped, with choices pages for country, city, Hide the dock, Appearance, Language, Clock and the screensaver time)."""
import os, re, shutil
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
SRC = os.path.join(ROOT, 'app/src')
A = os.path.join(ROOT, 'tools/assets/sam')
def P(p): return os.path.join(SRC, p)

shutil.copy(os.path.join(A, 'SettingsList.tsx'), P('components/SettingsList.tsx'))
shutil.copy(os.path.join(A, 'Glyph.tsx'), P('components/Glyph.tsx'))

# ---- Settings.tsx: theirs, with our wallpaper tab and picker ----
ours = open(P('screens/Settings.tsx')).read()
ours_picker = re.search(r"<WallpaperPicker\n.*?\n\t+/>", ours, re.S).group(0)
s = open(os.path.join(A, 'Settings.theirs.tsx')).read()
def sub(a, b, count=1):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, count)
sub("import {ScreenBackdrop} from '../components/LowerVeil';", "import {ScreenBackdrop} from '../components/ScreenBackdrop';")
s = re.sub(r"export interface WallpaperTab \{.*?\n\}\n", """export interface WallpaperTab {
	categories: string[];
	entries: WallpaperEntry[];
	current: string;
	onPick: (key: string) => void;
	/** hold OK on a picture: add or remove it from Favorites */
	onFavorite: (key: string) => void;
}
""", s, count=1, flags=re.S)
sub("descriptions.splice(at, 0, wallpaper.summary || '');", "descriptions.splice(at, 0, (wallpaper.entries.filter((e) => e.key === wallpaper.current)[0] || {title: ''}).title);")
sub("\tconst onLongPress = () => {\n\t\tif (tab) setMode(!reordering);\n\t};", "\tconst onLongPress = () => {\n\t\tif (onWallpaper) { if (zone === 'content' && wpList[wpIndex]) wallpaper.onFavorite(wpList[wpIndex].key); return; }\n\t\tif (tab) setMode(!reordering);\n\t};")
sub("wallpaper: 'Left and right change category · OK picks or unpicks · Back returns'", "wallpaper: 'Left and right change category · OK sets the wallpaper · hold OK adds it to Favorites · Back returns'")
s = re.sub(r"<WallpaperPicker\n.*?\n\t+/>", lambda m: ours_picker.replace('\n\t\t\t\t\t', '\n\t\t\t\t\t'), s, count=1, flags=re.S)
open(P('screens/Settings.tsx'), 'w').write(s)

# ---- CSS ----
p = P('theme/global.css')
css = open(p).read() + "\n" + open(os.path.join(A, 'settingspages.css')).read()
open(p, 'w').write(css)

# ---- app.tsx ----
p = P('app.tsx')
a = open(p).read()
def asub(x, y):
    global a
    assert x in a, x[:70]
    a = a.replace(x, y, 1)
asub("import type {OptionItem} from './components/OptionList';", "import type {OptionItem, OptionGroup} from './components/SettingsList';")
asub("{id: ROW.apps, label: 'Apps', noun: 'apps',", "{id: ROW.apps, label: 'Apps', glyph: 'grid' as const, noun: 'apps',")
asub("{id: ROW.sources, label: 'Sources', noun: 'sources',", "{id: ROW.sources, label: 'Sources', glyph: 'inputs' as const, noun: 'sources',")
asub("\tconst options: OptionItem[] = useMemo(() => [\n", "\tconst optionBase: Omit<OptionItem, 'group' | 'choices' | 'choice'>[] = useMemo(() => [\n")
# end of the base array: its dependency list is followed by the wallpaper memo
m = re.search(r"\], \[config\.weatherCountry[^\n]*\]\);\n", a)
assert m
end = m.group(0)
a = a.replace(end, end + """
	/** the page each option is listed on (screens/Settings.tsx), and the values of the ones that pick from a list */
	const options: OptionItem[] = useMemo(() => {
		const GROUP: Record<string, OptionGroup> = {
			[OPTION.useHomebrew]: 'system', [OPTION.showAll]: 'system', [OPTION.weather]: 'weather', [OPTION.country]: 'weather', [OPTION.city]: 'weather',
			[OPTION.wpAuto]: 'wallpaper', [OPTION.nightDim]: 'wallpaper', [OPTION.dockHide]: 'home', [OPTION.showRecents]: 'home',
			[OPTION.darkMode]: 'appearance', [OPTION.language]: 'language', [OPTION.clock]: 'language', [OPTION.showAmPm]: 'language', [OPTION.idle]: 'screensaver'
		};
		const country = COUNTRIES.filter((c) => c.code === config.weatherCountry)[0];
		const cityNames = (country ? country.cities : CITIES).map((c) => c.name);
		const min = (n: number) => (n ? `${n} min` : 'Off');
		const choicesOf = (id: string): {choices: string[]; choice: number} | undefined => {
			if (id === OPTION.country) return {choices: ['Auto'].concat(COUNTRIES.map((c) => c.name)), choice: [''].concat(COUNTRIES.map((c) => c.code)).indexOf(config.weatherCountry)};
			if (id === OPTION.city) return {choices: ['Auto'].concat(cityNames), choice: [''].concat(cityNames).indexOf(config.weatherCity)};
			if (id === OPTION.dockHide) return {choices: DOCKHIDE_NAMES, choice: DOCKHIDE_MODES.indexOf(config.dockHide)};
			if (id === OPTION.darkMode) return {choices: ['Light', 'Dark', 'Auto'], choice: ['off', 'on', 'auto'].indexOf(config.darkMode)};
			if (id === OPTION.language) return {choices: ['Auto'].concat(LANGS.map((l) => l.name)), choice: ['auto'].concat(LANGS.map((l) => l.code)).indexOf(config.language)};
			if (id === OPTION.clock) return {choices: ['Auto', '12-hour', '24-hour'], choice: ['auto', '12h', '24h'].indexOf(config.clockFormat)};
			if (id === OPTION.wpAuto) return {choices: WP_AUTO_CHOICES.map(min), choice: WP_AUTO_CHOICES.indexOf(config.wpAutoMinutes)};
			if (id === OPTION.idle) return {choices: IDLE_CHOICES.map(min), choice: IDLE_CHOICES.indexOf(config.idleMinutes)};
			return undefined;
		};
		const idle = {id: OPTION.idle, label: 'Screensaver after idle', description: "Starts Lumen Gallery (or LG's screensaver) after this long without a key press, while Lumen is in front. Off while the video wallpaper plays.", value: config.idleMinutes > 0, valueText: min(config.idleMinutes)};
		return optionBase.concat([idle]).map((o): OptionItem => ({...o, group: GROUP[o.id] || 'system', ...(choicesOf(o.id) || {})}));
	}, [optionBase, config.weatherCountry, config.weatherCity, config.dockHide, config.darkMode, config.language, config.clockFormat, config.wpAutoMinutes, config.idleMinutes]);
""", 1)
asub("const IDLE_CHOICES = [0, 5, 10, 20, 30];", "const IDLE_CHOICES = [0, 5, 10, 20, 30];\nconst DOCKHIDE_MODES = ['off', 'down', 'idle', 'both'];\nconst DOCKHIDE_NAMES = ['Off', 'Down arrow', 'After idle', 'Both'];")
asub("\t/** Replace a row's order with `keys` (the full list of what's shown). */", """\t/** a value picked on an option's choices page */
	const onChoose = useCallback((optionId: string, index: number) => {
		if (optionId === OPTION.country) {
			const codes = [''].concat(COUNTRIES.map((c) => c.code));
			const next = codes[index] || '';
			const first = COUNTRIES.filter((c) => c.code === next)[0];
			updateConfig({...config, weatherCountry: next, weatherCity: first ? first.cities[0].name : ''});
		} else if (optionId === OPTION.city) {
			const country = COUNTRIES.filter((c) => c.code === config.weatherCountry)[0];
			const names = [''].concat((country ? country.cities : CITIES).map((c) => c.name));
			const next = names[index] || '';
			const owner = COUNTRIES.filter((c) => c.cities.some((x) => x.name === next))[0];
			updateConfig({...config, weatherCity: next, weatherCountry: country ? country.code : owner ? owner.code : ''});
		} else if (optionId === OPTION.dockHide) updateConfig({...config, dockHide: DOCKHIDE_MODES[index] || 'off'});
		else if (optionId === OPTION.darkMode) updateConfig({...config, darkMode: ['off', 'on', 'auto'][index] || 'off'});
		else if (optionId === OPTION.language) updateConfig({...config, language: ['auto'].concat(LANGS.map((l) => l.code))[index] || 'auto'});
		else if (optionId === OPTION.clock) updateConfig({...config, clockFormat: ['auto', '12h', '24h'][index] || 'auto'});
		else if (optionId === OPTION.wpAuto) updateConfig({...config, wpAutoMinutes: WP_AUTO_CHOICES[index] || 0});
		else if (optionId === OPTION.idle) updateConfig({...config, idleMinutes: IDLE_CHOICES[index] || 0});
	}, [config]);

	/** Replace a row's order with `keys` (the full list of what's shown). */""")
asub("onOption={onOption} onClose={() => setScreen('home')} />}", "onOption={onOption} onChoose={onChoose} onClose={() => setScreen('home')} />}")
open(p, 'w').write(a)
print('settings stack applied')
