#!/usr/bin/env python3
"""Twelfth patch layer: app name, icon and launch screen (icons come from tools/gen_appicon.py into app/public/). Change the name with APP_NAME=... here and when generating the splash."""
import json, os, re
APP = os.path.expanduser('~/Developer/webos-launcher-tvos/app')
NAME = os.environ.get('APP_NAME', 'Lumen')
def P(p): return os.path.join(APP, p)
s = open(P('public/appinfo.json')).read()
s = re.sub(r'"title": "[^"]*"', f'"title": "{NAME}"', s, 1)
if '"bgImage"' not in s:
    s = s.replace('"largeIcon": "largeIcon.png",', '"largeIcon": "largeIcon.png",\n  "bgImage": "splash.png",\n  "splashBackground": "splash.png",')
s = s.replace('"id": "works.partridge.webos-launcher"', '"id": "com.ammar027.lumen"').replace('"vendor": "works.partridge.webos-launcher"', '"vendor": "ammar027"')
s = s.replace('"version": "1.0.0"', '"version": "1.1.2"')
# Declare eligibility only. Selecting Lumen as the default Home is a user action.
manifest = json.loads(s)
categories = manifest.setdefault('appCategory', [])
if 'home' not in categories:
    categories.append('home')
open(P('public/appinfo.json'), 'w').write(json.dumps(manifest, indent=2) + '\n')
c = open(P('src/config/constants.ts')).read()
open(P('src/config/constants.ts'), 'w').write(c.replace("'works.partridge.webos-launcher'", "'com.ammar027.lumen'"))

# the top-left date and time: smooth, Apple-like type (greyscale smoothing, tabular figures, soft shadow, medium weight)
css = open(P('src/theme/global.css')).read()
css += """
/* ---------- smooth top-left type ---------- */
.screen > .pill.status { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; font-variant-numeric: tabular-nums; text-shadow: 0 1px 16px rgba(0, 0, 0, 0.5), 0 0 2px rgba(0, 0, 0, 0.22); }
.status__row .status__date, .screen > .pill.status .clock__time, .screen > .pill.status .clock__period { font-weight: 500; letter-spacing: -0.012em; }
.status__row .status__date { margin-right: 12px; }
.screen > .pill.status .clock__period { margin-left: 6px; }
.status__weather { font-weight: 500; font-size: 22px; letter-spacing: -0.005em; opacity: 0.82; animation: status-in 600ms ease-out; }
@keyframes status-in { from { opacity: 0; } to { opacity: 0.82; } }
"""
open(P('src/theme/global.css'), 'w').write(css)
print('branding applied:', NAME)
