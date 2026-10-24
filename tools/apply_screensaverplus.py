#!/usr/bin/env python3
"""Sixty-seventh patch layer, from tvOS 27 / 27.2: two new sources for the photo screensaver, and Settings > Appearance > Text size.
 - Shuffle (tvOS 27.2's screen saver Shuffle): every category of the library at random, mixed with your Immich photos when a server is set up.
 - My ticked pictures (after 27.2's custom Photos screen savers): only the pictures you ticked in Settings > Wallpaper > Choose wallpaper.
 - Text size (after tvOS 27's Dynamic Type): Normal, Large or Larger, for app names, the date and weather, Settings pages and Control Center."""
import os, shutil
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
SRC = os.path.join(ROOT, 'app/src')
def P(p): return os.path.join(SRC, p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:90])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)

shutil.copy(os.path.join(ROOT, 'tools/assets/sam/PhotoSaver.tsx'), P('components/PhotoSaver.tsx'))

edit(P('lib/storage.ts'), [
 ("\tfocusStrength: string;", "\tfocusStrength: string;\n\t/** text size: normal, large or xl */\n\ttextSize: string;"),
 ("\tfocusStrength: 'normal',", "\tfocusStrength: 'normal',\n\ttextSize: 'normal',"),
 ("\t\t\tfocusStrength: parsed.focusStrength === 'subtle'", "\t\t\ttextSize: parsed.textSize === 'large' || parsed.textSize === 'xl' ? parsed.textSize : 'normal',\n\t\t\tfocusStrength: parsed.focusStrength === 'subtle'"),
])

edit(P('app.tsx'), [
 ("['Landscapes', 'Landscapes'], ['all', 'Everything']]", "['Landscapes', 'Landscapes'], ['all', 'Everything'], ['shuffle', 'Shuffle (all of it, mixed)'], ['picks', 'My ticked pictures']]"),
 ("Which pictures the photo screensaver shows: the ones you added to Favorites (Settings > Wallpaper > Choose wallpaper, hold OK), the paintings, the landscapes, or everything. Pictures load over the internet.", "Which pictures the photo screensaver shows: your Favorites (Settings > Wallpaper > Choose wallpaper, hold OK), the paintings, the landscapes, everything, a Shuffle of all of it (mixed with your Immich photos when set up), or only the pictures you ticked in Choose wallpaper. Pictures load over the internet."),
 ("wpType: 'wp-type',", "wpType: 'wp-type', textSize: 'text-size',"),
 ("[OPTION.wpType]: 'wallpaper',", "[OPTION.wpType]: 'wallpaper', [OPTION.textSize]: 'appearance',"),
 ("\t\tconst immichRecent:", "\t\tconst textSize: Omit<OptionItem, 'group' | 'choices' | 'choice'> = {id: OPTION.textSize, label: 'Text size', description: 'How large the text is: app names, the date and weather, Settings and Control Center. Normal is as Lumen was.', value: config.textSize !== 'normal', valueText: config.textSize === 'large' ? 'Large' : config.textSize === 'xl' ? 'Larger' : 'Normal'};\n\t\tconst immichRecent:"),
 ("if (id === OPTION.wpType) return", "if (id === OPTION.textSize) return {choices: ['Normal', 'Large', 'Larger'], choice: ['normal', 'large', 'xl'].indexOf(config.textSize)};\n\t\t\tif (id === OPTION.wpType) return"),
 ("return [wpType, focusStrength].concat(", "return [wpType, focusStrength, textSize].concat("),
 ("config.hideNames, config.appsPerRow,", "config.textSize, config.hideNames, config.appsPerRow,"),
 ("\t\telse if (optionId === OPTION.focusStrength)", "\t\telse if (optionId === OPTION.textSize) updateConfig({...config, textSize: ['normal', 'large', 'xl'][index] || 'normal'});\n\t\telse if (optionId === OPTION.focusStrength)"),
 ("\tuseEffect(() => { document.documentElement.classList.toggle('hide-names', config.hideNames); }, [config.hideNames]);", "\tuseEffect(() => { document.documentElement.classList.toggle('hide-names', config.hideNames); }, [config.hideNames]);\n\tuseEffect(() => { const r = document.documentElement.classList; r.toggle('text-large', config.textSize === 'large'); r.toggle('text-xl', config.textSize === 'xl'); }, [config.textSize]);"),
 ("<PhotoSaver source={config.photoSource} favorites={config.favoriteWallpapers}", "<PhotoSaver source={config.photoSource} favorites={config.favoriteWallpapers} picks={config.wallpaperPicks.length > 0 ? config.wallpaperPicks : /^(cloud|local):/.test(config.wallpaper) ? [config.wallpaper] : []}"),
])

open(P('theme/global.css'), 'a').write("""
/* ---------- Settings > Appearance > Text size (after tvOS 27's Dynamic Type) ---------- */
html.text-large { --ts: 1.18; }
html.text-xl { --ts: 1.3; }
html.text-large .tile__label, html.text-xl .tile__label { font-size: calc(var(--font-tile-label) * var(--ts)); }
html.text-large .status__row .status__date, html.text-xl .status__row .status__date { font-size: calc(30px * var(--ts)); }
html.text-large .status__weather, html.text-xl .status__weather { font-size: calc(22px * var(--ts)); }
html.text-large .slist__row, html.text-xl .slist__row { font-size: calc(32px * var(--ts)); }
html.text-large .slist__description, html.text-xl .slist__description { font-size: calc(26px * var(--ts)); }
html.text-large .slist__title, html.text-xl .slist__title { font-size: calc(52px * var(--ts)); }
html.text-large .cc__name, html.text-xl .cc__name, html.text-large .cc__sub, html.text-xl .cc__sub { font-size: calc(21px * var(--ts)); }
html.text-large .cc__caption, html.text-xl .cc__caption { font-size: calc(20px * var(--ts)); }
html.text-large .wp__title, html.text-xl .wp__title { font-size: calc(20px * var(--ts)); }
""")
print('screensaver plus applied')
