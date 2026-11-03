#!/usr/bin/env python3
"""Keep labels within their controls and scroll focused overflowing text."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'app'
shutil.copyfile(ROOT / 'tools/assets/ScrollingText.tsx', APP / 'src/components/ScrollingText.tsx')


def patch(file, pairs):
    path = APP / 'src' / file
    text = path.read_text()
    for old, new in pairs:
        if old not in text:
            raise ValueError(f'{file}: missing {old!r}')
        text = text.replace(old, new)
    path.write_text("import {ScrollingText} from './ScrollingText';\n" + text)


patch('components/ControlCenter.tsx', [
    ('const tileInside = (i: {glyph: GlyphName; title: string; sub: string})', 'const tileInside = (i: {glyph: GlyphName; title: string; sub: string}, active = false)'),
    ('<div class="cc__name">{i.title}</div><div class="cc__sub">{i.sub}</div>', '<ScrollingText class="cc__name" text={i.title} active={active} /><ScrollingText class="cc__sub" text={i.sub} active={active} />'),
    ('{tileInside(i)}\n\t\t\t</div>', "{tileInside(i, current === cell && phase === 'grid')}\n\t\t\t</div>"),
    ('<div class="cc__name">{o.label}</div>', "<ScrollingText class=\"cc__name\" text={o.label} active={menu.idx === i && phase === 'list'} />"),
    ("<span>{tr('Backlight')}</span>", "<ScrollingText text={tr('Backlight')} active={current === 'backlight' && phase === 'grid'} />")
])
patch('components/SettingsList.tsx', [
    ('<span class="slist__label">{tr(r.label)}</span>', '<ScrollingText class="slist__label" text={tr(r.label)} active={i === selected} />'),
    ('<span class="slist__value">{tr(r.value)}</span>', '<ScrollingText class="slist__value" text={tr(r.value)} active={i === selected} />')
])
patch('components/Tile.tsx', [
    ('<div class="tile__label">{model.label}</div>', '<ScrollingText class="tile__label" text={model.label} active={focused} />')
])

with (APP / 'src/theme/global.css').open('a') as out:
    out.write('''
.scroll-text { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.scroll-text__content { display: block; width: max-content; min-width: 100%; }
html.reduce-motion .scroll-text__content { display: inline; }
@media (prefers-reduced-motion: reduce) { .scroll-text__content { display: inline; } }
''')
print('focused overflow text applied')
