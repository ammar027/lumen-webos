#!/usr/bin/env python3
"""Fifty-ninth patch layer: the Control Center laid out like tvOS 26's (Sam Renfrew's fork, MIT: components/ControlCenter.tsx): a grid four squares wide of glass tiles and circles,
where Sound, Picture, Theme (Appearance) and Sleep timer open a list of choices (the tile grows into a pill), a backlight bar, Eye Comfort, Screen off, Restart, Art mode (Lumen Gallery) and LG Home.
Ours stays: the pre-blurred glass (no live blur), the Sleep timer, Appearance and Clock, Lumen Gallery. The TV's own screensaver time and 'Start now' moved to Settings > Screensaver."""
import os, re, shutil
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
SRC = os.path.join(ROOT, 'app/src')
A = os.path.join(ROOT, 'tools/assets/sam')
def P(p): return os.path.join(SRC, p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:80])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)

# ---- tvcontrols: backlight and Eye Comfort ----
edit(P('lib/tvcontrols.ts'), [
 ("\tsleepMinutes: number;\n\t/** minutes of inactivity before the TV starts its screensaver */\n\tscreensaver: number;\n}", "\tsleepMinutes: number;\n\t/** minutes of inactivity before the TV starts its screensaver */\n\tscreensaver: number;\n\t/** 0-100, for the picture mode in use */\n\tbacklight: number;\n\teyeComfort: boolean;\n}"),
 ("sleepMinutes: 0, screensaver: 10};\n\nconst root", "sleepMinutes: 0, screensaver: 10, backlight: 100, eyeComfort: false};\n\nconst root"),
 ("const out: Controls = {volume: 0, muted: false, picture: 'normal', sound: 'standard', sleepMinutes: 0, screensaver: 10};", "const out: Controls = {volume: 0, muted: false, picture: 'normal', sound: 'standard', sleepMinutes: 0, screensaver: 10, backlight: 100, eyeComfort: false};"),
 ("\treturn Promise.all([audio, picture, sleep, saver, sound]).then(() => out);", """\tconst backlight = readBacklight().then((v) => { if (v !== null) out.backlight = v; });
	const eye = root("luna-send -n 1 luna://com.webos.settingsservice/getSystemSettings '{\\"category\\":\\"picture\\",\\"keys\\":[\\"eyeComfortMode\\"]}'").then((text) => {
		const m = JSON.parse(text) as {settings?: {eyeComfortMode?: string}};
		out.eyeComfort = !!m.settings && m.settings.eyeComfortMode === 'on';
	}).catch(() => undefined);
	return Promise.all([audio, picture, sleep, saver, sound, backlight, eye]).then(() => out);"""),
 ("export function setVolume (", """/** The backlight of the picture mode in use, or null when it can't be read. Read again after a picture mode change: each mode has its own. */
export function readBacklight (): Promise<number | null> {
	if (!isWebOS()) return Promise.resolve(mock.backlight);
	return root("luna-send -n 1 luna://com.webos.settingsservice/getSystemSettings '{\\"category\\":\\"picture\\",\\"keys\\":[\\"backlight\\"]}'").then((text) => {
		const m = JSON.parse(text) as {settings?: {backlight?: string | number}};
		const n = Number(m.settings && m.settings.backlight);
		return m.settings && m.settings.backlight !== undefined && Number.isInteger(n) && n >= 0 && n <= 100 ? n : null;
	}).catch(() => null);
}

/** 0-100, whole numbers only. */
export function setBacklight (level: number): Promise<void> {
	mock.backlight = level;
	if (!isWebOS()) return Promise.resolve();
	if (!Number.isInteger(level) || level < 0 || level > 100) return Promise.reject(new Error('bad backlight level'));
	return root(`luna-send -n 1 luna://com.webos.settingsservice/setSystemSettings '{"category":"picture","settings":{"backlight":"${level}"}}'`).then(() => undefined);
}

export function setEyeComfort (on: boolean): Promise<void> {
	mock.eyeComfort = on;
	if (!isWebOS()) return Promise.resolve();
	return root(`luna-send -n 1 luna://com.webos.settingsservice/setSystemSettings '{"category":"picture","settings":{"eyeComfortMode":"${on ? 'on' : 'off'}"}}'`).then(() => undefined);
}

export function setVolume ("""),
])

# ---- ControlCenter.tsx: theirs, with the Sleep timer added ----
s = open(os.path.join(A, 'ControlCenter.theirs.tsx')).read()
def sub(a, b):
    global s
    assert a in s, a[:80]
    s = s.replace(a, b, 1)
sub("export type CenterAction = 'lg-home' | 'art';", "export type CenterAction = 'lg-home' | 'art' | 'settings' | 'screensaver';")
sub("setPictureMode, type Controls} from '../lib/tvcontrols';", "setPictureMode, SLEEP_MINUTES, setSleepTimer, type Controls} from '../lib/tvcontrols';")
sub("type CellId = 'sound' | 'picture' | 'art'", "type CellId = 'sleep' | 'sound' | 'picture' | 'art'")
sub("type MenuCell = 'sound' | 'picture' | 'dark' | 'clock';\nconst MENU_CELLS: CellId[] = ['sound', 'picture', 'dark', 'clock'];", "type MenuCell = 'sound' | 'picture' | 'dark' | 'clock' | 'sleep';\nconst MENU_CELLS: CellId[] = ['sound', 'picture', 'dark', 'clock', 'sleep'];")
sub("dark: 'screensaver', clock: 'timer'};", "dark: 'screensaver', clock: 'timer', sleep: 'power'};   // Clock is no longer in the grid: its 12/24-hour choice is in Settings > Language and Clock")
sub("\t[{id: 'dark', span: 2}, {id: 'clock', span: 2}],\n", "\t[{id: 'dark', span: 2}, {id: 'sleep', span: 2}],\n")
sub("backlight: 100, eyeComfort: false};\n/** Read the TV's values", "backlight: 100, eyeComfort: false, sleepMinutes: 0, screensaver: 10};\n/** Read the TV's values")
sub("				: cell === 'dark' ? [{value: 'off', label: tr('Light')}", "				: cell === 'sleep' ? SLEEP_MINUTES.map((m) => ({value: String(m), label: m ? tr(`${m} minutes`) : tr('Off')}))\n				: cell === 'dark' ? [{value: 'off', label: tr('Light')}")
sub("return cell === 'sound' ? v.sound : cell === 'picture' ? v.picture : cell === 'dark' ? o.darkMode : o.clockFormat;", "return cell === 'sound' ? v.sound : cell === 'picture' ? v.picture : cell === 'sleep' ? String(v.sleepMinutes) : cell === 'dark' ? o.darkMode : o.clockFormat;")
sub("\t\telse if (cell === 'dark') outer.current.onDarkMode(value);", "\t\telse if (cell === 'sleep') {\n\t\t\tconst before = v.sleepMinutes;\n\t\t\tpatch({sleepMinutes: Number(value)}); setSleepTimer(Number(value)).catch(() => { patch({sleepMinutes: before}); onError(\"Couldn't set the sleep timer\"); });\n\t\t}\n\t\telse if (cell === 'dark') outer.current.onDarkMode(value);")
sub("\t\t\t\t: cell === 'dark' ? {glyph: 'screensaver', title: tr('Theme')", "\t\t\t\t: cell === 'sleep' ? {glyph: 'power', title: tr('Sleep timer'), sub: values.sleepMinutes ? `${values.sleepMinutes} ${tr('min')}` : tr('Off'), on: values.sleepMinutes > 0}\n\t\t\t\t: cell === 'dark' ? {glyph: 'screensaver', title: tr('Theme')")
sub("{cell: 'art', glyph: 'image', label: 'Screensaver'}", "{cell: 'art', glyph: 'image', label: 'Art mode'}")
sub("\t\t\t\t\t{wide('clock')}\n", "\t\t\t\t\t{wide('sleep')}\n")
open(P('components/ControlCenter.tsx'), 'w').write(s)

# ---- CSS: drop our Control Center rules (selectors that are only ours), add theirs ----
p = P('theme/global.css')
css = open(p).read()
out, i, n = [], 0, len(css)
def drops(sel):
    parts = [x.strip() for x in sel.split(',')]
    keep = [x for x in parts if '.cc__' not in x and '.panel--cc' not in x]
    return keep if len(keep) != len(parts) else None
while i < n:
    if css.startswith('/*', i):
        j = css.index('*/', i) + 2; out.append(css[i:j]); i = j; continue
    j = i
    while j < n and css[j] not in '{;':
        if css.startswith('/*', j): j = css.index('*/', j) + 2; continue
        j += 1
    if j >= n: out.append(css[i:]); break
    if css[j] == ';': out.append(css[i:j + 1]); i = j + 1; continue
    d, k = 1, j + 1
    while k < n and d:
        if css.startswith('/*', k): k = css.index('*/', k) + 2; continue
        if css[k] == '{': d += 1
        elif css[k] == '}': d -= 1
        k += 1
    prelude, body = css[i:j], css[j:k]
    # the prelude can start with comments: keep them, work on the selector after them
    m = re.match(r'(\s*(?:/\*.*?\*/\s*)*)(.*)', prelude, re.S)
    lead, sel = m.group(1), m.group(2)
    if not sel.lstrip().startswith('@'):
        keep = drops(sel)
        if keep is not None:
            if keep: out.append(lead + ', '.join(keep) + ' ' + body)
            i = k; continue
    out.append(prelude + body); i = k
css = ''.join(out) + '\n' + open(os.path.join(A, 'controlcenter.css')).read()
open(p, 'w').write(css)

# ---- app.tsx ----
edit(P('app.tsx'), [
 ("import {ControlCenter, type CenterAction} from './components/ControlCenter';", "import {ControlCenter, prefetchControls, type CenterAction} from './components/ControlCenter';"),
 ("onDarkMode={() => updateConfig({...configRef.current, darkMode: nextDark(configRef.current.darkMode)})}", "onDarkMode={(mode: string) => updateConfig({...configRef.current, darkMode: mode})}"),
 ("\tconst tabs: SettingsTab[] = useMemo(() => [", "\t// the TV's sound, picture and backlight values, read ahead of the first time Control Center opens\n\tuseEffect(() => { const id = window.setTimeout(prefetchControls, 4000); return () => window.clearTimeout(id); }, []);\n\n\tconst tabs: SettingsTab[] = useMemo(() => ["),
 ("onClockFormat={() => { const modes = ['auto', '12h', '24h']; const c = configRef.current; updateConfig({...c, clockFormat: modes[(modes.indexOf(c.clockFormat) + 1) % modes.length]}); }}", "onClockFormat={(format: string) => updateConfig({...configRef.current, clockFormat: format})}\n\t\t\t\tonCloseDown={() => setControls(false)}"),
])
print('control center applied')
