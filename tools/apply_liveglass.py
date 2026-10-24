#!/usr/bin/env python3
"""Sixtieth patch layer: an optional live-blur glass look (Sam Renfrew's fork, MIT). Settings > Appearance > Live glass (off by default): the top buttons and the Control Center controls blur the picture
behind them live (backdrop-filter), the glass bar's rim gets a faint blue and pink fringe, and a highlight on its top edge slides with the focused app. Dock blur (also off) blurs the bar itself too.
The pre-blurred glass stays the look when it is off. Live blur costs frame rate on a weak GPU, which is why it is a switch."""
import os
ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')
SRC = os.path.join(ROOT, 'app/src')
A = os.path.join(ROOT, 'tools/assets/sam')
def P(p): return os.path.join(SRC, p)
def edit(path, pairs):
    s = open(path).read()
    for a, b in pairs:
        assert a in s, (os.path.basename(path), a[:80])
        s = s.replace(a, b, 1)
    open(path, 'w').write(s)

edit(P('components/Row.tsx'), [
 ("\tconst offset = fits ? 0 : clamp(selected * STEP + size / 2 - VIEWPORT_WIDTH / 2, 0, total - VIEWPORT_WIDTH);\n",
  "\tconst offset = fits ? 0 : clamp(selected * STEP + size / 2 - VIEWPORT_WIDTH / 2, 0, total - VIEWPORT_WIDTH);\n\t// the selected tile's centre from the row's centre, for the glass bar's sliding highlight (Live glass)\n\tconst selX = selected * STEP + size / 2 - offset - (fits ? total : VIEWPORT_WIDTH) / 2;\n"),
 ("style={`--row-w:${total}px`}", "style={`--row-w:${total}px;--sel-x:${selX}px`}"),
])

# the live glass rules go before the Control Center block, as in the fork's file: that block turns the bar's live blur back off
p = P('theme/global.css')
css = open(p).read()
marker = '/* ---------- Control Center (components/ControlCenter.tsx), sized and laid out like tvOS'
assert marker in css
css = css.replace(marker, open(os.path.join(A, 'liveglass.css')).read() + '\n' + marker, 1)
open(p, 'w').write(css)

edit(P('lib/storage.ts'), [
 ("\tshowRecents: boolean;", "\tshowRecents: boolean;\n\t/** live blur behind the top buttons and Control Center (Settings > Appearance) */\n\tliveGlass: boolean;\n\t/** also blur the glass bar live (only with Live glass) */\n\tdockBlur: boolean;"),
 ("\tshowRecents: true,", "\tshowRecents: true,\n\tliveGlass: false,\n\tdockBlur: false,"),
 ("\t\t\tshowRecents: parsed.showRecents !== false,", "\t\t\tshowRecents: parsed.showRecents !== false,\n\t\t\tliveGlass: parsed.liveGlass === true,\n\t\t\tdockBlur: parsed.dockBlur === true,"),
])
edit(P('app.tsx'), [
 ("showRecents: 'show-recents',", "showRecents: 'show-recents', liveGlass: 'live-glass', dockBlur: 'dock-blur',"),
 ("[OPTION.idle]: 'screensaver'", "[OPTION.idle]: 'screensaver', [OPTION.liveGlass]: 'appearance', [OPTION.dockBlur]: 'appearance'"),
 ("\t\t\tvalue: config.showRecents\n\t\t}\n\t], [", """\t\t\tvalue: config.showRecents
		},
		{
			id: OPTION.liveGlass,
			label: 'Live glass',
			description: 'Blurs the picture live behind the top buttons and Control Center, with a coloured rim on the glass bar, closer to tvOS 26. It costs frame rate on a weak TV: if the home screen feels slower, turn it off.',
			value: config.liveGlass
		},
		{
			id: OPTION.dockBlur,
			label: 'Dock blur',
			description: 'With Live glass on, also blur the glass bar itself. About 2 ms more of graphics work on every frame, felt most going left and right.',
			value: config.dockBlur
		}
	], ["""),
 ("config.showRecents, config.idleMinutes", "config.showRecents, config.liveGlass, config.dockBlur, config.idleMinutes"),
 ("\t\telse if (optionId === OPTION.showRecents) updateConfig({...config, showRecents: !config.showRecents});", "\t\telse if (optionId === OPTION.showRecents) updateConfig({...config, showRecents: !config.showRecents});\n\t\telse if (optionId === OPTION.liveGlass) updateConfig({...config, liveGlass: !config.liveGlass});\n\t\telse if (optionId === OPTION.dockBlur) updateConfig({...config, dockBlur: !config.dockBlur});"),
 ("\tuseEffect(() => { document.documentElement.classList.toggle('hide-recents', !config.showRecents); }, [config.showRecents]);", "\tuseEffect(() => { document.documentElement.classList.toggle('hide-recents', !config.showRecents); }, [config.showRecents]);\n\tuseEffect(() => { document.documentElement.classList.toggle('liveblur', config.liveGlass); }, [config.liveGlass]);\n\tuseEffect(() => { document.documentElement.classList.toggle('dockblur', config.dockBlur); }, [config.dockBlur]);"),
])
print('live glass applied')
