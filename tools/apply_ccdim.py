#!/usr/bin/env python3
"""Layer: Control Center glass matches the dimmed screen. The scrim behind the Control Center darkens the wallpaper by 38%, but the glass shows the undimmed pre-blurred copy, so on a bright wallpaper the controls looked milky and flat. They now carry the same dimming."""
import os
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
css = '''
/* Control Center glass: the same 38%% dimming as the scrim behind it, so the controls read as glass over the dimmed picture */
html:not(.light) .cc__mod:not(.cc__mod--focused) {
	background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0.07) 42%%, rgba(255, 255, 255, 0.16)), linear-gradient(rgba(0, 0, 0, 0.38), rgba(0, 0, 0, 0.38)), var(--wp-blur, none);
	background-size: auto, auto, 1920px 1080px; background-attachment: scroll, scroll, fixed; background-position: 0 0, 0 0, 0 0; background-repeat: no-repeat;
}
html:not(.light) .cc__mod--focused {
	background-image: linear-gradient(145deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.2) 55%%, rgba(255, 255, 255, 0.34)), linear-gradient(rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0.22)), var(--wp-blur, none);
	background-size: auto, auto, 1920px 1080px; background-attachment: scroll, scroll, fixed; background-position: 0 0, 0 0, 0 0; background-repeat: no-repeat;
}
'''
open(os.path.join(ROOT, 'app/src/theme/global.css'), 'a').write(css.replace('%%', '%'))
print('ccdim applied')
