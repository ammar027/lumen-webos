#!/usr/bin/env python3
"""Sixty-eighth patch layer: a StandBy mode, after Apple's StandBy (iOS 17 on; the faces named in the iOS 27.1 leak). Settings > Screensaver > Screensaver type > StandBy: when the home screen is idle (or from Start the
screensaver now) a full-screen face stays on. Left and Right change the face (Digital, Float, Analog, Solar, Photos, Weather, Fade, Flow), Up and Down change the colour, OK or Back return.
Night Mode (Auto: 7 pm to 6 am) dims the screen and turns the figures red. The Photos face is the photo screensaver (library or Immich), the clock styles are StandBy's own."""
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

shutil.copy(os.path.join(A, 'StandBy.tsx'), P('components/StandBy.tsx'))
# SF Pro Rounded figures for Float, only when the private font file was added to this build (tools/make_sf_font.py); otherwise the vector bubbles are drawn
edit(P('main.tsx'), [
 ("render(<App />, document.getElementById('root')!);", "if ('FontFace' in window) {\n\tnew FontFace('SF Rounded Private', `url(${new URL('private/sf-rounded.woff2', location.href).href})`, {weight: '1 1000'}).load().then((face) => { document.fonts.add(face); }).catch(() => undefined);\n}\nrender(<App />, document.getElementById('root')!);"),
])
shutil.copy(os.path.join(A, 'PhotoSaver.tsx'), P('components/PhotoSaver.tsx'))
open(P('theme/global.css'), 'a').write('\n' + open(os.path.join(A, 'standby.css')).read())

edit(P('lib/storage.ts'), [
 ("\tphotoPrint: boolean;", "\tphotoPrint: boolean;\n\t/** Settings > Screensaver > Screensaver type: StandBy */\n\tstandBy: boolean;\n\t/** the face StandBy opens on: last (the one used last), or a face name */\n\tstandByFace: string;\n\tstandByColor: string;\n\t/** Night Mode: auto, on or off */\n\tstandByNight: string;"),
 ("\tphotoPrint: false,", "\tphotoPrint: false,\n\tstandBy: false,\n\tstandByFace: 'last',\n\tstandByColor: 'white',\n\tstandByNight: 'auto',"),
 ("\t\t\tphotoPrint: parsed.photoPrint === true,", "\t\t\tphotoPrint: parsed.photoPrint === true,\n\t\t\tstandBy: parsed.standBy === true,\n\t\t\tstandByFace: typeof parsed.standByFace === 'string' && /^[a-z]+$/.test(parsed.standByFace) ? parsed.standByFace : 'last',\n\t\t\tstandByColor: typeof parsed.standByColor === 'string' && /^[a-z]+$/.test(parsed.standByColor) ? parsed.standByColor : 'white',\n\t\t\tstandByNight: parsed.standByNight === 'on' || parsed.standByNight === 'off' ? parsed.standByNight : 'auto',"),
])

edit(P('app.tsx'), [
 ("useState<Screen>(import.meta.env.DEV && /[?&]settings/.test(location.search) ? 'settings' : 'home')", "useState<Screen>(import.meta.env.DEV && /[?&]settings/.test(location.search) ? 'settings' : import.meta.env.DEV && /[?&]standby/.test(location.search) ? 'standby' : 'home')"),
 ("import {PhotoSaver} from './components/PhotoSaver';", "import {PhotoSaver} from './components/PhotoSaver';\nimport {StandBy, FACES, FACE_NAMES, COLORS, COLOR_NAMES} from './components/StandBy';"),
 ("type Screen = 'home' | 'settings' | 'photos';", "type Screen = 'home' | 'settings' | 'photos' | 'standby';"),
 ("wpType: 'wp-type',", "wpType: 'wp-type', standByFace: 'standby-face', standByColor: 'standby-color', standByNight: 'standby-night',"),
 ("[OPTION.wpType]: 'wallpaper',", "[OPTION.wpType]: 'wallpaper', [OPTION.standByFace]: 'screensaver', [OPTION.standByColor]: 'screensaver', [OPTION.standByNight]: 'screensaver',"),
 ("if (id === OPTION.photoSaver) return {choices: ['Lumen Gallery or LG', 'Photos in Lumen'], choice: config.photoSaver ? 1 : 0};", """if (id === OPTION.photoSaver) return {choices: ['Lumen Gallery or LG', 'Photos in Lumen', 'StandBy'], choice: config.standBy ? 2 : config.photoSaver ? 1 : 0};
			if (id === OPTION.standByFace) return {choices: ['Last used'].concat(FACES.map((f) => FACE_NAMES[f])), choice: config.standByFace === 'last' ? 0 : Math.max(0, FACES.indexOf(config.standByFace)) + 1};
			if (id === OPTION.standByColor) return {choices: COLORS.map((c) => COLOR_NAMES[c]), choice: Math.max(0, COLORS.indexOf(config.standByColor))};
			if (id === OPTION.standByNight) return {choices: ['Auto', 'On', 'Off'], choice: ['auto', 'on', 'off'].indexOf(config.standByNight)};"""),
 ("with the clock, date and weather.\", value: config.photoSaver, valueText: config.photoSaver ? 'Photos in Lumen' : 'Lumen Gallery or LG'}", "with the clock, date and weather. StandBy: after Apple's StandBy, a full-screen face you leave on (clock styles, weather, your photos, slow colour), changed with Left and Right.\", value: config.photoSaver || config.standBy, valueText: config.standBy ? 'StandBy' : config.photoSaver ? 'Photos in Lumen' : 'Lumen Gallery or LG'}"),
 ("\t\t\t{id: OPTION.photoStart, label: 'Start the photo screensaver now', description: 'Show the photos full screen at once. Press any key to return.', value: false, valueText: 'Start'}", """\t\t\t{id: OPTION.standByFace, label: 'StandBy face', description: 'The face StandBy opens on: Digital, Analog, Calendar, Solar, Photos, Weather, Fade or Flow, or the one you used last. Left and Right change it while StandBy is up.', value: true, valueText: config.standByFace === 'last' ? 'Last used' : (FACE_NAMES[config.standByFace] || 'Digital')},
			{id: OPTION.standByColor, label: 'StandBy colour', description: 'The colour of the clock figures and accents. Up and Down change it while StandBy is up.', value: true, valueText: COLOR_NAMES[config.standByColor] || 'White'},
			{id: OPTION.standByNight, label: 'Night Mode', description: "At night StandBy dims the screen and turns the figures red, as Apple's StandBy does in a dark room. Auto is 7 pm to 6 am.", value: config.standByNight !== 'off', valueText: config.standByNight === 'on' ? 'On' : config.standByNight === 'off' ? 'Off' : 'Auto'},
			{id: OPTION.photoStart, label: 'Start the screensaver now', description: 'Show the photo screensaver or StandBy full screen at once, whichever is chosen above. Press OK to return.', value: false, valueText: 'Start'}"""),
 ("config.photoSaver, config.photoSource,", "config.photoSaver, config.standBy, config.standByFace, config.standByColor, config.standByNight, config.photoSource,"),
 ("\t\telse if (optionId === OPTION.photoStart) setScreen('photos');", "\t\telse if (optionId === OPTION.photoStart) setScreen(config.standBy ? 'standby' : 'photos');"),
 ("else if (optionId === OPTION.photoSaver) updateConfig({...config, photoSaver: index === 1});", "else if (optionId === OPTION.photoSaver) updateConfig({...config, photoSaver: index === 1, standBy: index === 2});\n\t\telse if (optionId === OPTION.standByFace) updateConfig({...config, standByFace: index === 0 ? 'last' : FACES[index - 1] || 'digital'});\n\t\telse if (optionId === OPTION.standByColor) updateConfig({...config, standByColor: COLORS[index] || 'white'});\n\t\telse if (optionId === OPTION.standByNight) updateConfig({...config, standByNight: ['auto', 'on', 'off'][index] || 'auto'});"),
 ("if (configRef.current.photoSaver) setScreen('photos'); else startScreensaver().catch(() => undefined);", "if (configRef.current.standBy) setScreen('standby'); else if (configRef.current.photoSaver) setScreen('photos'); else startScreensaver().catch(() => undefined);"),
 ("if (configRef.current.photoSaver) { setScreen('photos'); return; }", "if (configRef.current.standBy) { setScreen('standby'); return; } if (configRef.current.photoSaver) { setScreen('photos'); return; }"),
 ("setVideoPaused(screen === 'settings' || screen === 'photos');", "setVideoPaused(screen === 'settings' || screen === 'photos' || screen === 'standby');"),
 ("\t\t\t{screen === 'photos' && <PhotoSaver", """\t\t\t{screen === 'standby' && <StandBy face0={(import.meta.env.DEV && (/[?&]face=([a-z]+)/.exec(location.search) || [])[1]) || config.standByFace} color0={(import.meta.env.DEV && (/[?&]color=([a-z]+)/.exec(location.search) || [])[1]) || config.standByColor} night={(import.meta.env.DEV && (/[?&]night=([a-z]+)/.exec(location.search) || [])[1]) || config.standByNight} weatherText={weatherText} showPeriod={config.showAmPm}
				photoProps={{source: config.photoSource, favorites: config.favoriteWallpapers, picks: config.wallpaperPicks.length > 0 ? config.wallpaperPicks : /^(cloud|local):/.test(config.wallpaper) ? [config.wallpaper] : [], seconds: config.photoSeconds, print: config.photoPrint, backlight: ({dim: 30, low: 10} as Record<string, number>)[config.photoBrightness]}}
				onFace={(f) => updateConfig({...configRef.current, standByFace: configRef.current.standByFace === 'last' ? 'last' : f})} onColor={(c) => updateConfig({...configRef.current, standByColor: c})} onExit={() => setScreen('home')} />}
			{screen === 'photos' && <PhotoSaver"""),
])
# live previews in Settings: the choices pages of StandBy face, colour and Night Mode show the face in the glyph's place
edit(P('components/SettingsList.tsx'), [
 ("import {t as tr} from '../lib/i18n';", "import type {ComponentChildren} from 'preact';\nimport {t as tr} from '../lib/i18n';"),
 ("\t/** under the glyph: what the focused row does */", "\t/** a small live picture in the glyph's place (StandBy's faces) */\n\tpreview?: ComponentChildren;\n\t/** under the glyph: what the focused row does */"),
 ("export function SettingsList ({title, glyph, description,", "export function SettingsList ({title, glyph, preview, description,"),
 ('<div class="slist__icon"><Glyph name={glyph} /></div>', "<div class={`slist__icon${preview ? ' slist__icon--preview' : ''}`}>{preview || <Glyph name={glyph} />}</div>"),
])
edit(P('screens/Settings.tsx'), [
 ("import {t as tr} from '../lib/i18n';", "import type {ComponentChildren} from 'preact';\nimport {t as tr} from '../lib/i18n';"),
 ("\tonChoose: (optionId: string, index: number) => void;\n", "\tonChoose: (optionId: string, index: number) => void;\n\t/** a small live picture for the glyph's place on an option's choices page, by option id (StandBy) */\n\tpreviews?: Record<string, (index: number) => ComponentChildren>;\n"),
 ("\tdescriptions: string[];\n\tticks?: boolean;", "\tdescriptions: string[];\n\tpreview?: (i: number) => ComponentChildren;\n\tticks?: boolean;"),
 ("onOption, onChoose, onClose}: Props) {", "onOption, onChoose, previews, onClose}: Props) {"),
 ("\t\t\t\tticks: true,\n\t\t\t\tactivate: (i) => { onChoose(o.id, i); pop(); }", "\t\t\t\tticks: true,\n\t\t\t\tpreview: previews && previews[o.id],\n\t\t\t\tactivate: (i) => { onChoose(o.id, i); pop(); }"),
 ("\t\t\t\t\t\tglyph={list.glyph}\n", "\t\t\t\t\t\tglyph={list.glyph}\n\t\t\t\t\t\tpreview={list.preview ? list.preview(top.focus) : undefined}\n"),
])
edit(P('app.tsx'), [
 ("import {StandBy, FACES, FACE_NAMES, COLORS, COLOR_NAMES} from './components/StandBy';", "import {StandBy, StandByPreview, FACES, FACE_NAMES, COLORS, COLOR_NAMES} from './components/StandBy';"),
 ("\treturn (\n\t\t<>\n\t\t\t{/* Home stays mounted", """\t// the choices pages of the StandBy settings show the face being chosen, live and small
	const previews = {
		[OPTION.standByFace]: (i: number) => <StandByPreview face={i === 0 ? 'last' : FACES[i - 1]} color={config.standByColor} night={config.standByNight} weatherText={weatherText} showPeriod={config.showAmPm} />,
		[OPTION.standByColor]: (i: number) => <StandByPreview face={config.standByFace === 'last' ? 'analog' : config.standByFace} color={COLORS[i] || 'white'} night="off" weatherText={weatherText} showPeriod={config.showAmPm} />,
		[OPTION.standByNight]: (i: number) => <StandByPreview face={config.standByFace === 'last' ? 'analog' : config.standByFace} color={config.standByColor} night={['auto', 'on', 'off'][i] || 'auto'} weatherText={weatherText} showPeriod={config.showAmPm} />
	};

	return (
		<>
			{/* Home stays mounted"""),
 ("onChoose={onChoose} onClose={() => setScreen('home')} />}", "onChoose={onChoose} previews={previews} onClose={() => setScreen('home')} />}"),
])
print('standby applied')
