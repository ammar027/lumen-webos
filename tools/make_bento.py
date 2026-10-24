#!/usr/bin/env python3
"""Makes the launch image in the style Apple uses for OS launches: a light grid of white cards, a title centred on each, a small crop of the real UI under it,
one colourful card in the middle. The crops come from docs/bento-src (node tools/screenshots-bento.mjs). Writes docs/bento/bento-main.png, 2400 x 1350. Needs Chrome."""
import os, subprocess
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
SRC = f'{ROOT}/docs/bento-src'
OUT = f'{ROOT}/docs/bento'
FONT = os.environ.get('FONT', '/tmp/lumen-release/app/public/fonts/geist-wght.woff2')
HERO_URL = os.environ.get('HERO', 'https://i.redd.it/nr4us7nmgknh1.jpeg')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
os.makedirs(OUT, exist_ok=True)

PAD, GAP, COLS, ROWS = 36, 20, 6, 4
CW = (2400 - 2 * PAD - (COLS - 1) * GAP) / COLS
RH = (1350 - 2 * PAD - (ROWS - 1) * GAP) / ROWS
TITLE_H = 112
M = 24   # inner margin of a crop

def box(c0, c1, r0, r1):
    return PAD + (c0 - 1) * (CW + GAP), PAD + (r0 - 1) * (RH + GAP), (c1 - c0 + 1) * CW + (c1 - c0) * GAP, (r1 - r0 + 1) * RH + (r1 - r0) * GAP

def crop(img, fx, fy, cw, bw, bh):
    """background styles showing the source region centred on (fx, fy), cw source pixels wide, in a box bw x bh"""
    s = bw / cw
    ch = bh / s
    x = min(max(fx - cw / 2, 0), 1920 - cw)
    y = min(max(fy - ch / 2, 0), 1080 - ch)
    return f"background-image:url('file://{SRC}/{img}.png');background-size:{1920 * s:.1f}px {1080 * s:.1f}px;background-position:{-x * s:.1f}px {-y * s:.1f}px"

CSS = '''
@font-face { font-family: G; src: url("file://%s"); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 2400px; height: 1350px; background: #e9e9ee; font-family: G, -apple-system, Helvetica, sans-serif; color: #1d1d1f; overflow: hidden; }
.card { position: absolute; background: #fff; border-radius: 46px; overflow: hidden; }
.title { position: absolute; left: 0; right: 0; top: 0; height: %dpx; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 42px; font-weight: 640; letter-spacing: -0.012em; padding: 0 20px; line-height: 1.1; }
.shot { position: absolute; border-radius: 30px; background-repeat: no-repeat; box-shadow: inset 0 0 0 1px rgba(0,0,0,.06); }
.icon { position: absolute; left: 0; right: 0; bottom: 30px; display: flex; justify-content: center; }
.icon svg { width: 130px; height: 130px; }
.hero { background-size: cover; background-position: center; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; }
.hero h1 { font-size: 190px; font-weight: 760; letter-spacing: -0.04em; line-height: 1; color: rgba(255,255,255,.88); text-shadow: 0 6px 40px rgba(0,0,0,.25); }
.hero p { font-size: 40px; font-weight: 520; margin-top: 14px; text-shadow: 0 2px 20px rgba(0,0,0,.4); }
.clk { background: url('https://i.redd.it/5l4uwmk2d5oh1.jpeg') center 30%% / cover; color: #fff; padding: 6px 34px; overflow: hidden; }
.clk .t1 { font-size: 118px; font-weight: 700; line-height: 1; letter-spacing: -0.02em; color: rgba(255,255,255,.62); -webkit-text-stroke: 0.8px rgba(255,255,255,.55); filter: drop-shadow(0 4px 10px rgba(0,0,0,.25)); }
.clk .t2 { font-size: 30px; font-weight: 520; margin-top: 2px; color: rgba(255,255,255,.8); }
.clk .t3 { font-size: 26px; margin-top: 4px; opacity: .85; }
.big { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 92px; font-weight: 760; letter-spacing: -0.03em; line-height: 1.02; background: linear-gradient(135deg, #0a84ff, #5e5ce6 60%%, #bf5af2); -webkit-background-clip: text; color: transparent; padding: 0 40px; }
''' % (FONT, TITLE_H)

def card(c0, c1, r0, r1, inner, style=''):
    x, y, w, h = box(c0, c1, r0, r1)
    return f'<div class="card" style="left:{x:.1f}px;top:{y:.1f}px;width:{w:.1f}px;height:{h:.1f}px;{style}">{inner}</div>', w, h

def shot_card(c0, c1, r0, r1, title, img, fx, fy, cw):
    x, y, w, h = box(c0, c1, r0, r1)
    bw, bh = w - 2 * M, h - TITLE_H - M
    inner = f'<div class="title">{title}</div><div class="shot" style="left:{M}px;top:{TITLE_H}px;width:{bw:.1f}px;height:{bh:.1f}px;{crop(img, fx, fy, cw, bw, bh)}"></div>'
    return card(c0, c1, r0, r1, inner)[0]

def icon_card(c0, c1, r0, r1, title, svg):
    return card(c0, c1, r0, r1, f'<div class="title">{title}</div><div class="icon">{svg}</div>')[0]

G1 = '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a84ff"/><stop offset="1" stop-color="#bf5af2"/></linearGradient></defs>'
SW = 'fill="none" stroke="url(#g)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"'
ICON_RECENT = f'<svg viewBox="0 0 100 100">{G1}<rect x="26" y="14" width="48" height="62" rx="10" {SW}/><rect x="12" y="26" width="48" height="62" rx="10" {SW} opacity=".55"/><rect x="40" y="26" width="48" height="62" rx="10" {SW} opacity=".55"/></svg>'
ICON_THEME = f'<svg viewBox="0 0 100 100">{G1}<circle cx="50" cy="50" r="34" {SW}/><path d="M50 16a34 34 0 0 1 0 68z" fill="url(#g)"/></svg>'
ICON_VIDEO = f'<svg viewBox="0 0 100 100">{G1}<rect x="12" y="22" width="76" height="52" rx="12" {SW}/><path d="M43 37l20 11-20 11z" fill="url(#g)"/><path d="M34 86h32" {SW}/></svg>'
ICON_WEATHER = f'<svg viewBox="0 0 100 100">{G1}<circle cx="36" cy="38" r="14" {SW}/><path d="M36 12v6M12 38h6M19 21l4 4M53 21l-4 4" {SW}/><path d="M34 80h38a15 15 0 0 0 1.5-29.9A21 21 0 0 0 33 53a13.5 13.5 0 0 0 1 27z" fill="#fff" stroke="url(#g)" stroke-width="7" stroke-linejoin="round"/></svg>'

x, y, w, h = box(3, 4, 2, 3)
hero = f'<div class="card hero" style="left:{x:.1f}px;top:{y:.1f}px;width:{w:.1f}px;height:{h:.1f}px;background-image:url(\'{HERO_URL}\')"><h1>Lumen</h1><p>for LG webOS TVs</p></div>'

x, y, w, h = box(4, 5, 1, 1)
clock_card = card(4, 5, 1, 1, f'<div class="title">A clock that fits</div><div class="shot clk" style="left:{M}px;top:{TITLE_H}px;width:{w - 2 * M:.1f}px;height:{h - TITLE_H - M:.1f}px"><div class="t1">15:30</div><div class="t2">Saturday October 24</div><div class="t3">\u2600 18\u00b0 Clear</div></div>')[0]

cards = [
    shot_card(1, 2, 1, 2, 'Control Center', 'control-center', 1570, 360, 600),
    icon_card(3, 3, 1, 1, 'Recent Apps', ICON_RECENT),
    clock_card,
    icon_card(6, 6, 1, 1, 'Light and dark', ICON_THEME),
    hero,
    shot_card(5, 6, 2, 3, 'Settings, Apple TV style', 'settings-root', 1320, 520, 940),
    shot_card(1, 2, 3, 3, 'Your apps, your icons', 'home-hero', 960, 895, 1650),
    icon_card(1, 1, 4, 4, 'Video wallpapers', ICON_VIDEO),
    icon_card(2, 2, 4, 4, 'Weather', ICON_WEATHER),
    shot_card(3, 4, 4, 4, 'First-run setup', 'onboarding', 1320, 300, 1000),
    card(5, 6, 4, 4, '<div class="big">Apple TV defaults</div>')[0],
]
html = f'<!doctype html><meta charset="utf-8"><style>{CSS}</style>{"".join(cards)}'
open('/tmp/bento-main.html', 'w').write(html)
subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=2400,1350', '--virtual-time-budget=20000',
                f'--screenshot={OUT}/bento-main.png', 'file:///tmp/bento-main.html'], check=True, capture_output=True)
print('wrote', f'{OUT}/bento-main.png')
