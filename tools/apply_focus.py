#!/usr/bin/env python3
"""Sixty-fifth patch layer: Settings > Appearance > Focus highlight (Subtle, Normal, Strong), from the fork (Sam Renfrew, MIT): how much the focused app grows. Normal is exactly what Lumen did before."""
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
 ("\twpNewOnLaunch: boolean;", "\twpNewOnLaunch: boolean;\n\t/** how much the focused app grows: subtle, normal or strong */\n\tfocusStrength: string;"),
 ("\twpNewOnLaunch: true,", "\twpNewOnLaunch: true,\n\tfocusStrength: 'normal',"),
 ("\t\t\twpNewOnLaunch: parsed.wpNewOnLaunch !== false,", "\t\t\twpNewOnLaunch: parsed.wpNewOnLaunch !== false,\n\t\t\tfocusStrength: parsed.focusStrength === 'subtle' || parsed.focusStrength === 'strong' ? parsed.focusStrength : 'normal',"),
])
edit(P('app.tsx'), [
 ("wpType: 'wp-type',", "wpType: 'wp-type', focusStrength: 'focus-strength',"),
 ("[OPTION.wpType]: 'wallpaper',", "[OPTION.wpType]: 'wallpaper', [OPTION.focusStrength]: 'appearance',"),
 ("\t\tconst immichRecent:", "\t\tconst focusStrength: Omit<OptionItem, 'group' | 'choices' | 'choice'> = {id: OPTION.focusStrength, label: 'Focus highlight', description: 'How much the focused app grows. Normal is as Lumen was; Subtle grows less; Strong grows more.', value: config.focusStrength !== 'normal', valueText: config.focusStrength === 'subtle' ? 'Subtle' : config.focusStrength === 'strong' ? 'Strong' : 'Normal'};\n\t\tconst immichRecent:"),
 ("if (id === OPTION.wpType) return", "if (id === OPTION.focusStrength) return {choices: ['Subtle', 'Normal', 'Strong'], choice: ['subtle', 'normal', 'strong'].indexOf(config.focusStrength)};\n\t\t\tif (id === OPTION.wpType) return"),
 ("return [wpType].concat(immich.ok ? [immichRecent] : [], [wpNew], optionBase,", "return [wpType, focusStrength].concat(immich.ok ? [immichRecent] : [], [wpNew], optionBase,"),
 ("config.wpNewOnLaunch, immich.ok]);", "config.wpNewOnLaunch, config.focusStrength, immich.ok]);"),
 ("\t\telse if (optionId === OPTION.wpType) {", "\t\telse if (optionId === OPTION.focusStrength) updateConfig({...config, focusStrength: ['subtle', 'normal', 'strong'][index] || 'normal'});\n\t\telse if (optionId === OPTION.wpType) {"),
 ("\tuseEffect(() => { document.documentElement.classList.toggle('liveblur', config.liveGlass); }, [config.liveGlass]);", "\tuseEffect(() => { document.documentElement.classList.toggle('liveblur', config.liveGlass); }, [config.liveGlass]);\n\tuseEffect(() => { const r = document.documentElement.classList; r.toggle('focus-subtle', config.focusStrength === 'subtle'); r.toggle('focus-strong', config.focusStrength === 'strong'); }, [config.focusStrength]);"),
])
p = P('theme/global.css')
open(p, 'a').write("""
/* ---------- Settings > Appearance > Focus highlight ---------- (!important: the normal size is set inline on <html> by the theme tokens) */
html.focus-subtle { --motion-focus-scale: 1.08 !important; }
html.focus-subtle .tile--focused .tile__box { box-shadow: 0 14px 24px rgba(0, 0, 0, 0.32); }
html.focus-strong { --motion-focus-scale: 1.26 !important; }
""")
print('focus applied')
