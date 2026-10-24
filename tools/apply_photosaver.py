#!/usr/bin/env python3
"""Sixty-second patch layer: an optional photo screensaver inside Lumen (after Sam Renfrew's Ambient screen, MIT; his draws from an Immich server, this one from the wallpaper library).
Settings > Screensaver: Screensaver type (Lumen Gallery or LG's, as before, or Photos in Lumen), Photos (My favorites, Art, Landscapes or Everything), Time on each photo, Print look, and a Start now row.
With Photos in Lumen the idle screensaver and the top-right menu's Start Screensaver open it; two full-screen layers crossfade (opacity only) with a slow zoom (transform only)."""
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

shutil.copy(os.path.join(A, 'PhotoSaver.tsx'), P('components/PhotoSaver.tsx'))
p = P('theme/global.css')
open(p, 'a').write('\n' + open(os.path.join(A, 'ambient.css')).read())

edit(P('lib/storage.ts'), [
 ("\tdockBlur: boolean;", "\tdockBlur: boolean;\n\t/** Settings > Screensaver: show photos inside Lumen instead of Lumen Gallery / LG's screensaver */\n\tphotoSaver: boolean;\n\tphotoSource: string;\n\tphotoSeconds: number;\n\tphotoPrint: boolean;"),
 ("\tdockBlur: false,", "\tdockBlur: false,\n\tphotoSaver: false,\n\tphotoSource: 'Landscapes',\n\tphotoSeconds: 30,\n\tphotoPrint: false,"),
 ("\t\t\tdockBlur: parsed.dockBlur === true,", "\t\t\tdockBlur: parsed.dockBlur === true,\n\t\t\tphotoSaver: parsed.photoSaver === true,\n\t\t\tphotoSource: typeof parsed.photoSource === 'string' && parsed.photoSource ? parsed.photoSource : 'Landscapes',\n\t\t\tphotoSeconds: [10, 20, 30, 60, 120, 300].indexOf(Number(parsed.photoSeconds)) >= 0 ? Number(parsed.photoSeconds) : 30,\n\t\t\tphotoPrint: parsed.photoPrint === true,"),
])

edit(P('app.tsx'), [
 ("import {Settings, type SettingsTab, type WallpaperTab} from './screens/Settings';", "import {Settings, type SettingsTab, type WallpaperTab} from './screens/Settings';\nimport {PhotoSaver} from './components/PhotoSaver';"),
 ("type Screen = 'home' | 'settings';", "type Screen = 'home' | 'settings' | 'photos';"),
 ("wpType: 'wp-type',", "wpType: 'wp-type', photoSaver: 'photo-saver', photoSource: 'photo-source', photoSeconds: 'photo-seconds', photoPrint: 'photo-print', photoStart: 'photo-start',"),
 ("[OPTION.wpType]: 'wallpaper'", "[OPTION.wpType]: 'wallpaper', [OPTION.photoSaver]: 'screensaver', [OPTION.photoSource]: 'screensaver', [OPTION.photoSeconds]: 'screensaver', [OPTION.photoPrint]: 'screensaver', [OPTION.photoStart]: 'screensaver'"),
 ("\t\treturn [wpType].concat(optionBase, [idle]).map(", """\t\tconst PHOTO_SOURCES: [string, string][] = [['favorites', 'My favorites'], ['Art', 'Art (paintings)'], ['Landscapes', 'Landscapes'], ['all', 'Everything']];
		const PHOTO_SECONDS = [10, 20, 30, 60, 120, 300];
		const secText = (n: number) => (n < 60 ? `${n} seconds` : n === 60 ? '1 minute' : `${n / 60} minutes`);
		const photoOptions: Omit<OptionItem, 'group' | 'choices' | 'choice'>[] = [
			{id: OPTION.photoSaver, label: 'Screensaver type', description: "Lumen Gallery or LG: the screensaver as it was (Lumen Gallery's art, or the TV's own). Photos in Lumen: a slideshow of pictures from Lumen's wallpaper library, with the clock, date and weather.", value: config.photoSaver, valueText: config.photoSaver ? 'Photos in Lumen' : 'Lumen Gallery or LG'},
			{id: OPTION.photoSource, label: 'Photos', description: 'Which pictures the photo screensaver shows: the ones you added to Favorites (Settings > Wallpaper > Choose wallpaper, hold OK), the paintings, the landscapes, or everything. Pictures load over the internet.', value: true, valueText: (PHOTO_SOURCES.filter((x) => x[0] === config.photoSource)[0] || PHOTO_SOURCES[2])[1]},
			{id: OPTION.photoSeconds, label: 'Time on each photo', description: 'How long each picture stays on screen before the next one fades in.', value: true, valueText: secText(config.photoSeconds)},
			{id: OPTION.photoPrint, label: 'Print look', description: 'Softer blacks, slightly greyer whites and a darker bottom-right corner, like a print: good for paintings.', value: config.photoPrint},
			{id: OPTION.photoStart, label: 'Start the photo screensaver now', description: 'Show the photos full screen at once. Press any key to return.', value: false, valueText: 'Start'}
		];
		return [wpType].concat(optionBase, [idle], photoOptions).map("""),
 ("\t\t\tif (id === OPTION.wpType) return {choices: ['Pictures', 'Video', 'Plain'], choice: typeIdx};", """\t\t\tif (id === OPTION.wpType) return {choices: ['Pictures', 'Video', 'Plain'], choice: typeIdx};
			if (id === OPTION.photoSaver) return {choices: ['Lumen Gallery or LG', 'Photos in Lumen'], choice: config.photoSaver ? 1 : 0};
			if (id === OPTION.photoSource) return {choices: PHOTO_SOURCES.map((x) => x[1]), choice: Math.max(0, PHOTO_SOURCES.map((x) => x[0]).indexOf(config.photoSource))};
			if (id === OPTION.photoSeconds) return {choices: PHOTO_SECONDS.map(secText), choice: PHOTO_SECONDS.indexOf(config.photoSeconds)};"""),
 ("config.videoWallpaper, config.wallpaper]);", "config.videoWallpaper, config.wallpaper, config.photoSaver, config.photoSource, config.photoSeconds, config.photoPrint]);"),
 ("\t\telse if (optionId === OPTION.wpType) {", """\t\telse if (optionId === OPTION.photoSaver) updateConfig({...config, photoSaver: index === 1});
		else if (optionId === OPTION.photoSource) updateConfig({...config, photoSource: ['favorites', 'Art', 'Landscapes', 'all'][index] || 'Landscapes'});
		else if (optionId === OPTION.photoSeconds) updateConfig({...config, photoSeconds: [10, 20, 30, 60, 120, 300][index] || 30});
		else if (optionId === OPTION.wpType) {"""),
 ("\t\telse if (optionId === OPTION.liveGlass) updateConfig({...config, liveGlass: !config.liveGlass});", "\t\telse if (optionId === OPTION.liveGlass) updateConfig({...config, liveGlass: !config.liveGlass});\n\t\telse if (optionId === OPTION.photoPrint) updateConfig({...config, photoPrint: !config.photoPrint});\n\t\telse if (optionId === OPTION.photoStart) setScreen('photos');"),
 ("if (!document.hidden) startScreensaver().catch(() => undefined);", "if (!document.hidden) { if (configRef.current.photoSaver) setScreen('photos'); else startScreensaver().catch(() => undefined); }"),
 ("if (item.key === 'screensaver') { startScreensaver().catch(", "if (item.key === 'screensaver') { if (configRef.current.photoSaver) { setScreen('photos'); return; } startScreensaver().catch("),
 ("setVideoPaused(screen === 'settings');", "setVideoPaused(screen === 'settings' || screen === 'photos');"),
 ("onChoose={onChoose} onClose={() => setScreen('home')} />}", "onChoose={onChoose} onClose={() => setScreen('home')} />}\n\t\t\t{screen === 'photos' && <PhotoSaver source={config.photoSource} favorites={config.favoriteWallpapers} seconds={config.photoSeconds} print={config.photoPrint} weatherText={weatherText} showPeriod={config.showAmPm} onExit={() => setScreen('home')} />}"),
])
print('photo screensaver applied')
