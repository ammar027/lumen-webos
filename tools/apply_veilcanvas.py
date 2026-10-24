#!/usr/bin/env python3
"""Fifty-fifth patch layer: the lower-rows backdrop as a canvas (from Sam Renfrew's fork, MIT, docs/down-up-lag-review.md). Going down used to create a full-screen blurred
backdrop on the spot (a ::before with an animation); the TV's memory pressure then drops and redraws its tiles on every Down and Up, and the move ran at a few frames a second.
Now one persistent backdrop element holds the blurred copy as a canvas (a texture, not tiles) and only fades in; the dock's tiles and the first grid row keep a layer each."""
import os, shutil
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
APP = os.path.join(ROOT, 'app/src')
A = os.path.join(ROOT, 'tools/assets/sam')
shutil.copy(os.path.join(A, 'blurCanvas.ts'), os.path.join(APP, 'lib/blurCanvas.ts'))
shutil.copy(os.path.join(A, 'LowerVeil.tsx'), os.path.join(APP, 'components/LowerVeil.tsx'))

p = os.path.join(APP, 'screens/Home.tsx')
s = open(p).read()
a = "<Status weatherText={weatherText} showPeriod={showPeriod} />\n"
assert a in s and 'LowerVeil' not in s
s = s.replace(a, "<LowerVeil />\n\t\t\t" + a, 1)
b = "import {Status} from '../components/Status';"
assert b in s
s = s.replace(b, b + "\nimport {LowerVeil} from '../components/LowerVeil';", 1)
open(p, 'w').write(s)

p = os.path.join(APP, 'theme/global.css')
s = open(p).read()
s += """
/* ---------- the lower-rows backdrop is a persistent element, drawn once into a canvas (components/LowerVeil.tsx); Down only fades it in ---------- */
.screen--lower::before { content: none !important; animation: none; }
.lowerveil {
	position: absolute; left: 0; top: 0; right: 0; bottom: 0; pointer-events: none;
	opacity: 0; transition: opacity 220ms ease-out; will-change: opacity;
	background-color: #10131c;
	background-image: linear-gradient(rgba(0, 0, 0, 0.26), rgba(0, 0, 0, 0.26)), var(--wp-bg, none);
	background-size: auto, cover; background-position: 0 0, center; background-repeat: no-repeat;
}
.screen--lower .lowerveil { opacity: 1; }
html.wp-video .lowerveil { background-color: transparent; background-image: linear-gradient(rgba(0, 0, 0, 0.42), rgba(0, 0, 0, 0.42)); }
.screen--dockhidden .lowerveil { display: none; }
.lowerveil--canvas { background: none !important; }
.lowerveil > canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
/* the dock's tiles and the first grid row change focus on every move: a layer each, so they are not redrawn */
.rows > .row:nth-child(-n+2) .tile__box { will-change: transform; }
"""
open(p, 'w').write(s)
print('veil canvas applied')
