#!/usr/bin/env python3
"""Layer (from Sam Renfrew's fork, MIT): Dim the wallpaper is Off / At night / Always, "Dim when the dock is hidden" darkens the screen while the dock is away, and unpicked tiles in Settings keep their names readable. nightDim (the old on/off) counts as At night."""
import os
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
P = lambda p: os.path.join(ROOT, 'app/src', p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:90])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)
edit(P('lib/storage.ts'), [
 ("\tnightDim: boolean;", "\tnightDim: boolean;\n\t/** dim the wallpaper: off, at night (19:00 to 06:00) or always (older nightDim = at night) */\n\twallpaperDim: string;\n\t/** darken the screen while the dock is hidden */\n\tdockDim: boolean;"),
 ("\tnightDim: false,", "\tnightDim: false,\n\twallpaperDim: 'off',\n\tdockDim: false,"),
 ("\t\t\tnightDim: parsed.nightDim === true,", "\t\t\tnightDim: parsed.nightDim === true,\n\t\t\twallpaperDim: parsed.wallpaperDim === 'night' || parsed.wallpaperDim === 'always' ? parsed.wallpaperDim : parsed.nightDim === true ? 'night' : 'off',\n\t\t\tdockDim: parsed.dockDim === true,"),
])
edit(P('app.tsx'), [
 ("restore: 'restore-settings',", "restore: 'restore-settings', dockDim: 'dock-dim',"),
 ("document.documentElement.classList.toggle('night', config.nightDim && (h >= 19 || h < 6));", "document.documentElement.classList.toggle('night', config.wallpaperDim === 'always' || (config.wallpaperDim === 'night' && (h >= 19 || h < 6)));"),
 ("\t}, [config.nightDim]);", "\t}, [config.wallpaperDim]);"),
 ("\t\t\tlabel: 'Dim the wallpaper at night',\n\t\t\tdescription: 'Between 7 pm and 6 am the wallpaper is darker, easier on the eyes in a dark room.',\n\t\t\tvalue: config.nightDim\n\t\t},",
  "\t\t\tlabel: 'Dim the wallpaper',\n\t\t\tdescription: 'A darker wallpaper, easier on the eyes in a dark room. At night: between 7 pm and 6 am.',\n\t\t\tvalue: config.wallpaperDim !== 'off',\n\t\t\tvalueText: config.wallpaperDim === 'always' ? 'Always' : config.wallpaperDim === 'night' ? 'At night' : 'Off'\n\t\t},"),
 ("\t\t\tif (id === OPTION.clockLayout) return", "\t\t\tif (id === OPTION.nightDim) return {choices: ['Off', 'At night', 'Always'], choice: ['off', 'night', 'always'].indexOf(config.wallpaperDim)};\n\t\t\tif (id === OPTION.clockLayout) return"),
 ("\t\telse if (optionId === OPTION.nightDim) updateConfig({...config, nightDim: !config.nightDim});\n", "\t\telse if (optionId === OPTION.dockDim) updateConfig({...config, dockDim: !config.dockDim});\n"),
 ("\t\telse if (optionId === OPTION.clockOrder) updateConfig(", "\t\telse if (optionId === OPTION.nightDim) updateConfig({...config, wallpaperDim: ['off', 'night', 'always'][index] || 'off'});\n\t\telse if (optionId === OPTION.clockOrder) updateConfig("),
 ("[OPTION.nightDim]: 'wallpaper',", "[OPTION.nightDim]: 'wallpaper', [OPTION.dockDim]: 'home',"),
 ("\t\t\t{id: OPTION.clockLayout,", "\t\t\t...(config.dockHide !== 'off' ? [{id: OPTION.dockDim, label: 'Dim when the dock is hidden', description: 'With the dock away, the wallpaper fades darker. It brightens again when the dock comes back.', value: config.dockDim}] : []),\n\t\t\t{id: OPTION.clockLayout,"),
 ("config.clockOrder, config.clockLayout, config.clockLook,", "config.wallpaperDim, config.dockDim, config.clockOrder, config.clockLayout, config.clockLook,"),
 ("dockHide={config.dockHide} />", "dockHide={config.dockHide} dockDim={config.dockDim} />"),
])
edit(P('screens/Home.tsx'), [
 ("\tdockHide?: string;", "\tdockHide?: string;\n\t/** darken the wallpaper while the dock is hidden */\n\tdockDim?: boolean;"),
 ("weatherText, dockHide}: Props) {", "weatherText, dockHide, dockDim}: Props) {"),
 ("${n.dockHidden ? ' screen--dockhidden' : ''}`}>\n\t\t\t<LowerVeil />", "${n.dockHidden ? ' screen--dockhidden' : ''}${dockDim ? ' screen--dockdim' : ''}`}>\n\t\t\t<div class=\"dockdim\" />\n\t\t\t<LowerVeil />"),
])
edit(P('theme/global.css'), [
 (".tile--dimmed .tile__box { opacity: 0.45; }", "/* unpicked: grey and a little faded, so the icon still reads (from Sam Renfrew's fork) */\n.tile--dimmed .tile__box { opacity: 0.75; filter: grayscale(1); }"),
 (".tile--dimmed .tile__label { color: var(--color-text-muted); }", "/* only the icon dims: the name stays readable so you can tell what to pick */\n.tile--dimmed .tile__label { color: var(--color-text-primary); }"),
])
open(P('theme/global.css'), 'a').write('''
/* Dim when the dock is hidden: a black layer over the wallpaper, so only its opacity animates (from Sam Renfrew's fork) */
.dockdim { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: #000; opacity: 0; transition: opacity 400ms ease; pointer-events: none; }
.screen--dockdim.screen--dockhidden .dockdim { opacity: 0.45; }
''')
print('wpdim applied')
