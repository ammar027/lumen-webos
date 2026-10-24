#!/usr/bin/env python3
"""Layer: on the home screen while a video wallpaper plays there is no still picture to frost from, so the clock, date and weather text are solid white and the top-right buttons take the dock's flat see-through glass."""
import os
css = '''
/* home, video wallpaper: no frosted fill (there is no picture behind to blur), solid text and dock-like glass */
html.wp-video.clock-frosted .screen > .pill.status .clock__time, html.wp-video.clock-frosted .screen > .pill.status .status__date,
html.wp-video.clock-frosted .screen > .pill.status .status__weather, html.wp-video.clock-frosted .screen > .pill.status .clock__period {
	color: #fff !important; -webkit-text-fill-color: #fff !important; background: none !important; -webkit-background-clip: border-box !important; background-clip: border-box !important;
	-webkit-text-stroke: 0 !important; filter: none !important; text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55) !important;
}
html.wp-video.clock-frosted .status__weather .wicon { color: #fff !important; -webkit-text-fill-color: initial !important; }
html.wp-video .topbar > .pill:not(.pill--focused):not(.pill--open), html.wp-video .topcap:not(.topcap--focused):not(.topcap--open) {
	background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.03) 42%, rgba(255, 255, 255, 0.08)) !important;
	background-color: rgba(20, 24, 38, 0.42) !important;
}
'''
open(os.path.expanduser('~/Developer/webos-launcher-tvos/app/src/theme/global.css'), 'a').write(css)
print('videoflat applied')
