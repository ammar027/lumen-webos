#!/usr/bin/env python3
"""Sixty-eighth patch layer: clocks on the photo screensaver, after Apple's Portraits screen saver (tvOS 18 on: your photos with a stylized clock over them). Settings > Screensaver > Clock:
Corner (as before: the time bottom left, the date and weather bottom right), Big (a very large time centred low on the picture), Analog (a simple clock face with a date line), or None.
Apple's version picks photos with machine learning and tucks the clock behind the subject; this one cannot, so the clock sits over the picture with a soft shade."""
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
open(P('theme/global.css'), 'a').write('\n' + open(os.path.join(ROOT, 'tools/assets/sam/ambient.css')).read().split('/* the photo screensaver\'s clock styles')[1].join(['/* the photo screensaver\'s clock styles', '']))

edit(P('lib/storage.ts'), [
 ("\tphotoPrint: boolean;", "\tphotoPrint: boolean;\n\t/** the photo screensaver's clock: corner, big, analog or none */\n\tphotoClock: string;"),
 ("\tphotoPrint: false,", "\tphotoPrint: false,\n\tphotoClock: 'corner',"),
 ("\t\t\tphotoPrint: parsed.photoPrint === true,", "\t\t\tphotoPrint: parsed.photoPrint === true,\n\t\t\tphotoClock: parsed.photoClock === 'big' || parsed.photoClock === 'analog' || parsed.photoClock === 'portrait' || parsed.photoClock === 'none' ? parsed.photoClock : 'corner',"),
])
edit(P('app.tsx'), [
 ("wpType: 'wp-type',", "wpType: 'wp-type', photoClock: 'photo-clock',"),
 ("[OPTION.wpType]: 'wallpaper',", "[OPTION.wpType]: 'wallpaper', [OPTION.photoClock]: 'screensaver',"),
 ("\t\tconst immichRecent:", "\t\tconst photoClock: Omit<OptionItem, 'group' | 'choices' | 'choice'> = {id: OPTION.photoClock, label: 'Clock', description: 'The clock on the photo screensaver: Corner (time bottom left, date and weather bottom right), Big (a very large time over the picture), Analog (a clock face), Portraits (huge, tall glass digits over the picture, like the Apple TV Portraits screen saver), or None.', value: config.photoClock !== 'none', valueText: ({corner: 'Corner', big: 'Big', analog: 'Analog', portrait: 'Portraits', none: 'None'} as Record<string, string>)[config.photoClock]};\n\t\tconst immichRecent:"),
 ("if (id === OPTION.wpType) return", "if (id === OPTION.photoClock) return {choices: ['Corner', 'Big', 'Analog', 'Portraits', 'None'], choice: ['corner', 'big', 'analog', 'portrait', 'none'].indexOf(config.photoClock)};\n\t\t\tif (id === OPTION.wpType) return"),
 ("return [wpType, focusStrength, textSize].concat(", "return [wpType, focusStrength, textSize, photoClock].concat("),
 ("config.textSize, config.hideNames,", "config.photoClock, config.textSize, config.hideNames,"),
 ("\t\telse if (optionId === OPTION.focusStrength)", "\t\telse if (optionId === OPTION.photoClock) updateConfig({...config, photoClock: ['corner', 'big', 'analog', 'portrait', 'none'][index] || 'corner'});\n\t\telse if (optionId === OPTION.focusStrength)"),
 ("print={config.photoPrint} backlight=", "print={config.photoPrint} clockStyle={config.photoClock} backlight="),
])
print('saver clock applied')
