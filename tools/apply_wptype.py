#!/usr/bin/env python3
"""Sixty-first patch layer: the wallpaper settings in the fork's shape (Sam Renfrew's fork, MIT), over our own wallpaper model. Settings > Wallpaper starts with Wallpaper type (Pictures, Video, Plain), and
Choose wallpaper shows only what that type offers: the picture categories (with Shuffle tiles that pick a random one from a whole category), or the video places (several can be on), or nothing for Plain.
The fork's multi-pick model and Immich are not part of this layer."""
import os
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
p = os.path.join(ROOT, 'app/src/app.tsx')
a = open(p).read()
def sub(x, y):
    global a
    assert x in a, x[:80]
    a = a.replace(x, y, 1)
sub("liveGlass: 'live-glass',", "liveGlass: 'live-glass', wpType: 'wp-type',")
sub("[OPTION.dockBlur]: 'appearance'", "[OPTION.dockBlur]: 'appearance', [OPTION.wpType]: 'wallpaper'")
sub("\t\tconst min = (n: number) => (n ? `${n} min` : 'Off');\n", """\t\tconst min = (n: number) => (n ? `${n} min` : 'Off');
		const typeIdx = config.videoWallpaper ? 1 : config.wallpaper === 'none' ? 2 : 0;
		const wpType: Omit<OptionItem, 'group' | 'choices' | 'choice'> = {id: OPTION.wpType, label: 'Wallpaper type', description: 'Pictures: still pictures from the library, your favorites or the bundled ones. Video: aerial and travel videos. Plain: no wallpaper picture.', value: true, valueText: ['Pictures', 'Video', 'Plain'][typeIdx]};
""")
sub("\t\t\tif (id === OPTION.idle) return {choices: IDLE_CHOICES.map(min), choice: IDLE_CHOICES.indexOf(config.idleMinutes)};", "\t\t\tif (id === OPTION.idle) return {choices: IDLE_CHOICES.map(min), choice: IDLE_CHOICES.indexOf(config.idleMinutes)};\n\t\t\tif (id === OPTION.wpType) return {choices: ['Pictures', 'Video', 'Plain'], choice: typeIdx};")
sub("return optionBase.concat([idle]).map(", "return [wpType].concat(optionBase, [idle]).map(")
sub("config.clockFormat, config.wpAutoMinutes, config.idleMinutes]);", "config.clockFormat, config.wpAutoMinutes, config.idleMinutes, config.videoWallpaper, config.wallpaper]);")
sub("\t\telse if (optionId === OPTION.idle) updateConfig({...config, idleMinutes: IDLE_CHOICES[index] || 0});\n\t}, [config]);", """\t\telse if (optionId === OPTION.idle) updateConfig({...config, idleMinutes: IDLE_CHOICES[index] || 0});
		else if (optionId === OPTION.wpType) {
			if (index === 1) updateConfig({...config, videoWallpaper: true});
			else if (index === 2) updateConfig({...config, videoWallpaper: false, wallpaper: 'none'});
			else updateConfig({...config, videoWallpaper: false, wallpaper: config.wallpaper === 'none' ? 'local:0' : config.wallpaper});
		}
	}, [config]);""")
sub("\t\t\tcategories: ['Defaults', 'Favorites', 'Video'].concat(WALLPAPER_CATEGORIES, 'All'),", "\t\t\tcategories: config.videoWallpaper ? ['Video'] : config.wallpaper === 'none' ? [] : ['Defaults', 'Favorites'].concat(WALLPAPER_CATEGORIES, 'All'),")
open(p, 'w').write(a)
print('wallpaper type applied')
