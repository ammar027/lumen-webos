#!/usr/bin/env python3
"""PRIVATE, local only: turns the SF Pro font that ships with macOS (/System/Library/Fonts/SFNS.ttf) into a small Latin web font for YOUR OWN TV's build, so Lumen
uses the same typeface as tvOS. Apple's licence does not allow redistributing SF, so the result goes to app/public/private/ (never committed, never in the release:
tools/build_release.py removes that folder). Needs: pip install fonttools brotli (in a throwaway venv).
Run: <venv>/bin/python tools/make_sf_font.py"""
import os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
SRC = '/System/Library/Fonts/SFNS.ttf'
OUT = os.path.expanduser('~/Developer/webos-launcher-tvos/app/public/private')
os.makedirs(OUT, exist_ok=True)
font = TTFont(SRC)
font = instancer.instantiateVariableFont(font, {'wdth': 100, 'GRAD': 400})   # keep weight and optical size, drop the other two axes
tmp = OUT + '/sf-tmp.ttf'
font.save(tmp)
opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.notdef_outline = True
f = subset.load_font(tmp, opts)
s = subset.Subsetter(opts)
ranges = list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + [0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x00B7, 0x00B0, 0x2713, 0x25B6, 0x20AC]
s.populate(unicodes=ranges); s.subset(f)
subset.save_font(f, OUT + '/sf.woff2', opts)
os.remove(tmp)
print('sf.woff2', os.path.getsize(OUT + '/sf.woff2') // 1024, 'KB')

# SF Pro Rounded, only the figures and a few signs, at its heaviest weight: the StandBy Float face's numerals (components/StandBy.tsx). Private for the same reason as above.
rounded = TTFont('/System/Library/Fonts/SFNSRounded.ttf')
axes = {a.axisTag: (a.minValue, a.defaultValue, a.maxValue) for a in rounded['fvar'].axes}
print('rounded axes', axes)
rounded = instancer.instantiateVariableFont(rounded, {'wght': axes['wght'][2]})
rtmp = OUT + '/sfr-tmp.ttf'
rounded.save(rtmp)
ro = subset.Options(); ro.flavor = 'woff2'; ro.layout_features = ['*']; ro.notdef_outline = True
rf = subset.load_font(rtmp, ro)
rs = subset.Subsetter(ro)
rs.populate(unicodes=list(range(0x30, 0x3B)) + [0x20, 0x2E, 0x2C, 0xB0])
rs.subset(rf)
subset.save_font(rf, OUT + '/sf-rounded.woff2', ro)
os.remove(rtmp)
print('sf-rounded.woff2', os.path.getsize(OUT + '/sf-rounded.woff2') // 1024, 'KB')
