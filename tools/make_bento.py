#!/usr/bin/env python3
"""Makes the launch images: bento grids of the screenshots in docs/bento-src (node tools/screenshots-bento.mjs), after the grids Apple uses to launch tvOS.
Each card is a picture with its caption in a bar under it, so no caption covers the screen. Writes docs/bento/*.png at 2400 x 1350. Needs Google Chrome."""
import os, subprocess
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
SRC = f'{ROOT}/docs/bento-src'
OUT = f'{ROOT}/docs/bento'
FONT = os.environ.get('FONT', '/tmp/lumen-release/app/public/fonts/geist-wght.woff2')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
os.makedirs(OUT, exist_ok=True)

CSS = '''
@font-face { font-family: G; src: url("file://%s"); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 2400px; height: 1350px; background: #08080b; font-family: G, -apple-system, Helvetica, sans-serif; color: #fff; overflow: hidden; }
.grid { position: absolute; inset: 48px; display: grid; gap: 24px; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(3, 1fr); }
.t { display: flex; flex-direction: column; border-radius: 40px; overflow: hidden; background: #15151b; box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.09); }
.i { flex: 1; background-repeat: no-repeat; }
.c { padding: 22px 34px 26px; }
.c b { display: block; font-size: 38px; font-weight: 650; letter-spacing: -0.01em; }
.c span { display: block; font-size: 24px; font-weight: 400; opacity: .66; margin-top: 3px; }
.hero { grid-column: 1 / 3; grid-row: 1 / 3; }
.hero .c { padding: 30px 44px 36px; }
.hero .c b { font-size: 72px; letter-spacing: -0.03em; }
.hero .c span { font-size: 30px; margin-top: 6px; }
''' % FONT

def tile(img, cap, sub, pos='center', size='cover', hero=False):
    return (f'<div class="t{" hero" if hero else ""}"><div class="i" style="background-image:url(\'file://{SRC}/{img}.jpg\');background-position:{pos};background-size:{size}"></div>'
            f'<div class="c"><b>{cap}</b><span>{sub}</span></div></div>')

def page(name, tiles):
    html = f'<!doctype html><meta charset="utf-8"><style>{CSS}</style><div class="grid">{"".join(tiles)}</div>'
    p = f'/tmp/bento-{name}.html'
    open(p, 'w').write(html)
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=2400,1350', '--virtual-time-budget=4000',
                    f'--screenshot={OUT}/{name}.png', f'file://{p}'], check=True, capture_output=True)
    print('wrote', f'{OUT}/{name}.png')

page('bento-main', [
    tile('home-dark', 'Lumen 1.1', 'A tvOS-style home screen for your LG TV', hero=True),
    tile('control-center', 'Control Center', 'Sound, picture, sleep timer, theme', pos='96% 24%', size='215%'),
    tile('settings-clock', 'Clock, your way', 'Layout, size, weight and a live preview'),
    tile('standby-float', 'StandBy', 'Nine faces, colours and Night Mode'),
    tile('home-light', 'Light, dark or automatic', 'Frosted glass in both'),
    tile('standby-analog', 'Analog', 'A clean dial'),
    tile('standby-digital', 'Digital', 'Big and readable across the room'),
    tile('standby-solar', 'Solar', 'The day as a sun arc'),
    tile('settings', 'Settings, Apple TV style', 'A page for every option'),
])
page('bento-standby', [
    tile('standby-float', 'StandBy', 'Nine faces for the screen you leave on', hero=True),
    tile('standby-digital', 'Digital', 'One big number, any colour'),
    tile('standby-analog', 'Analog', 'A clean dial'),
    tile('standby-solar', 'Solar', 'The day as a sun arc'),
    tile('standby-photos', 'Photos', 'Your pictures, clock on top'),
    tile('standby-calendar', 'Calendar', 'The month at a glance'),
    tile('standby-weather', 'Weather', 'The temperature at a glance'),
    tile('standby-fade', 'Fade', 'Slow, soft colour'),
    tile('standby-flow', 'Flow', 'Moving colour behind the time'),
])
