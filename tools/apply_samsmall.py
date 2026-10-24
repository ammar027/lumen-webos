#!/usr/bin/env python3
"""Layer (from Sam Renfrew's fork, MIT): the App Store (LG's "Apps") can be added to the home screen."""
import os
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
P = lambda p: os.path.join(ROOT, 'app/src', p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:90])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)
edit(P('config/catalog.ts'), [
 ("\t{id: 'com.webos.app.mediadiscovery', title: 'Media Player',", "\t// LG's own title is \"Apps\", which reads like a folder\n\t{id: 'com.webos.app.discovery', title: 'App Store', color: '#a50034'},\n\t{id: 'com.webos.app.mediadiscovery', title: 'Media Player',"),
])
edit(P('lib/apps.ts'), [
 ("const HIDDEN_IDS = [APP_ID, 'google.assistant.promo', 'com.webos.app.discovery'];", "const HIDDEN_IDS = [APP_ID, 'google.assistant.promo'];"),
])
print('samsmall applied')
