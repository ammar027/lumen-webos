# Prior art: other custom TV home screens (October 2026)

> From [Sam Renfrew's fork](https://github.com/samrenfrew/lumen-webos) (MIT), where it was written. "Lumen" in it means his fork, so the lists of what "Lumen does not have yet" are about that fork, not this one. Nothing in it was tested here.

Research done on 2026-10-24. Star counts come from the GitHub API on that day. Feature claims come from each project's README. Nobody tested them on a TV.

## The wave

In October 2026 a project called cleanyourtv went viral. It removes ads from Android and Google TVs and adds an Apple TV-style home screen. Its author built it by driving Claude Code. It has about 28,800 stars. Many ports and copies followed, for Fire TV, LG webOS and Samsung Tizen.

- cleanyourtv: https://github.com/Gathin23/cleanyourtv
- Press coverage: https://decrypt.co/381456/vibe-coding-ads-out-smart-tvs-heres-how and https://www.androidauthority.com/android-tv-vibe-hacking-remove-ads-bloatware-3725338/

Samsung is a dead end for this kind of work. The cleanyourtv Samsung notes say a Tizen TV gives no shell and the Home button always opens Samsung Home: https://github.com/Gathin23/cleanyourtv/blob/main/docs/devices/samsung-tizen.md

## LG projects that matter to Lumen

| Project | Stars | Root | Notes |
|---|---|---|---|
| [lasharor/cleanyourtv-WebOS](https://github.com/lasharor/cleanyourtv-WebOS) | 80 | Yes | The closest twin. Tested on webOS 25. Live TV, notifications, voice. |
| [rudra-avatar/Hearth](https://github.com/rudra-avatar/Hearth) | 84 | Yes | Credits Claude for most of the code. TV input, LG logo switch. |
| [gprot42/webos-launch-home](https://github.com/gprot42/webos-launch-home) | 25 | Yes | Longest feature list. |
| [zzeppieri/webos-custom-home](https://github.com/zzeppieri/webos-custom-home) | 45 | Yes | Ambient clock, eARC guard. |
| [simbasjungles/free-my-tv](https://github.com/simbasjungles/free-my-tv) | 4,026 | No | Built with Claude Code. Google TV, LG and Tizen. |
| [ecklf/lg-luma](https://github.com/ecklf/lg-luma) | 62 | Yes | Native, not web. tvOS-inspired. |
| [mbsintegrations/LG-TV-HA-Home-Launcher](https://github.com/mbsintegrations/LG-TV-HA-Home-Launcher) | 35 | ? | Home Assistant tiles. |

## Features Lumen does not have yet

1. Settings backup and restore, to the TV and to USB. The backup survives a reinstall. (launch-home)
2. Number keys 1 to 9 open the dock tile at that position. (launch-home)
3. Hold OK on an app for a menu: move, hide, uninstall. (Hearth)
4. Picture notification cards. A local POST, for example from Home Assistant, shows a card with a photo over whatever is on screen. (cleanyourtv-WebOS)
5. Add the launcher as a TV input, so the TV starts on it as its last input. (Hearth)
6. A switch for LG's "Show LG logo when the TV starts" setting. (Hearth)
7. eARC audio guard. Keeps sound on the receiver when its eARC link comes up late at power-on. (webos-custom-home)
8. Clock, date and weather on the home screen, and an idle ambient clock. (Hearth, webos-custom-home, free-my-tv)
9. Voice on the Magic Remote Voice button, answered by a language model or Home Assistant Assist. (launch-home, cleanyourtv-WebOS)
10. A manager that checks each component and rolls it back if it fails to start, plus a clear "go back to LG Home" path. (cleanyourtv-WebOS, free-my-tv)
11. Apple aerial videos as a background or screensaver. (launch-home)
12. Home Assistant tiles: temperatures, switches, energy. (LG-TV-HA-Home-Launcher)

## Patterns across projects

- Reversibility is the selling point. The most popular projects lead with "one button to undo" and a restore script.
- Options that need root are greyed out with the reason shown, not hidden. (Hearth)
- The screensaver is the slot people fill with personal data: revenue, a 3D model of the home, SmartThings rooms, weather.
- A pasted prompt or AGENTS.md file is often the install method.

## From X and the issue trackers

Reddit could not be read: every route was blocked. X posts could not be opened, so these come from search snippets and the repos they link to.

- [OmkarK97/webos-vibehack](https://github.com/OmkarK97/webos-vibehack) (266 stars): the dock glows in the focused app's colour. Pressing Home twice within 3 seconds stays on LG Home, as an escape hatch.
- [NaveenDA/lg-webos-custom-home](https://github.com/NaveenDA/lg-webos-custom-home): built with Claude Code on webOS 9. Disables 18 ad and tracking packages by mounting empty folders over them, with a one-script undo.
- A Home Assistant community post shows a doorbell camera as an overlay on a rooted LG TV. It sends a series of JPEG frames from go2rtc, because older webOS browsers do not play MJPEG reliably: https://community.home-assistant.io/t/video-doorbell-snapshots-as-an-overlay-on-an-lg-webos-tv/1019201 (not read, snippet only)
- A Decrypt article tells how Claude told a user to turn on Developer Mode on a rooted TV. That wiped the Homebrew Channel, and root could not be restored: https://tech.yahoo.com/ai/claude/articles/vibe-coded-smart-tv-claude-175329213.html
- The [cleanyourtv-WebOS issues](https://github.com/lasharor/cleanyourtv-WebOS/issues) report it working on a 43UT7590 and a 65UT7000 with webOS 25.

## Upstream (ammar027/lumen-webos), since our fork point on 2026-10-11

- Native Home selection. Adding `"appCategory": ["home"]` to the app's manifest lets `setDefaultApp` make Lumen the TV's real Home app. The Home button then opens it with no watcher and no Input Hook. Tested on one 65UT8000 on webOS 25. Restore LG Home before removing Lumen. Steps: upstream `docs/native-home.md`.
- The rows slide with `transform`, not `top`. Ours already does this since the Down and Up work of 2026-10-23 (`app/src/theme/global.css:933`).
- A fix for webOS 25: a resting Magic Remote pointer made the rows jump back to the first row. The browser fires mouse-enter on whatever slides under a still pointer. The fix ignores a mouse-enter when the pointer has not moved. Upstream `tools/apply_pointerfix.py`.
- A startup gate: the page stays hidden behind a black splash until the app list, wallpaper and icons are ready, with an 8 second fallback.

## Open questions

- Reddit was not searched, and X replies were not read.
- Free My TV's LG build may have fewer features than its README lists.
