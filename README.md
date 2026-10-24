# Lumen

A tvOS-style home screen for rooted LG webOS TVs, tuned for a weak TV graphics chip. Lumen is a set of patches on top of
[partridgeworks/webos-launcher](https://github.com/partridgeworks/webos-launcher) (MIT), plus a few small scripts that run on the TV.
Its companion is [Lumen Gallery](https://github.com/ammar027/lumen-gallery-webos), an art-mode screensaver.

Tested on an LG 65UQ8040PSB (webOS 22, Chromium 87, 1.5 GB RAM). It needs a rooted TV with the
[Homebrew Channel](https://www.webosbrew.org/); a few features (screen off, restart, picture mode, the Home-button takeover) use its root service.

## Demo

![A short walkthrough: moving along the dock, the second row, and Control Center](docs/demo/lumen-demo.gif)

[Watch it as a video (MP4)](docs/demo/lumen-demo.mp4). Recorded from the dev preview with `node tools/record-demo.mjs`.

## Screenshots

Made from the dev preview at 1920 x 1080 (`node tools/screenshots.mjs`); the wallpaper is a public-domain painting from the Cleveland Museum of Art.

![Home screen: a glass dock of apps, date and weather top left, Inputs and Control Center top right](docs/screenshots/home.jpg)
![Moving down: the second row of apps appears over a blurred wallpaper](docs/screenshots/more-apps.jpg)
![Control Center: sound, picture, sleep timer, screensaver, quick actions and volume](docs/screenshots/control-center.jpg)
![Settings, Options tab: a scrolling list with a scroll indicator](docs/screenshots/settings-options.jpg)

## Supported TVs

Lumen is tested on webOS 22 (Chromium 87) and webOS 25. It is built for Chromium 79 and newer (webOS 6 and later). Older TVs (webOS 4.x, Chromium 53) cannot run it: Lumen
then shows a short "too old" message instead of a blank screen. Rooted TVs only for the live app list, Home button and screensaver features (see below).

## What it adds

- **tvOS navigation and look:** a glass dock row of apps, a second row of more apps and a Recent row that appear as you move down, focus lift with a name
  under the tile, a wallpaper library (cloud and bundled, shuffle per category, favourites, auto-change, night dimming), folders, hold-OK menu
  (move, remove, add to folder), and a Settings app in the same style.
- **Control Center:** sound, picture mode, sleep timer, screensaver start time, LG Home, Settings, Art mode, start screensaver, screen off, restart and volume.
- **Appearance:** Light, Dark or Auto (dark from 7 pm to 6 am), in Settings and in the Control Center; the dock can slide away with Down or after a few idle seconds.
- **Video wallpaper:** Settings > Wallpaper > Video. Pick one or several places (Switzerland, Norway, Iceland, Italy, Greece, Germany, Czechia, Spain, the Netherlands,
  Portugal and more, plus Apple's aerial videos); it streams from the internet and pauses LG's screensaver while it plays.
- **Language and clock:** nine languages for the menus, dates and weather, and a 12 / 24-hour option. **Weather:** pick a country and a city (about 180 cities).
- **Top left:** date, time and weather (Open-Meteo, optional city); top right: Inputs and Control Center.
- **Cheap on purpose:** no live blur or SVG filters. The "glass" is a pre-blurred copy of the wallpaper seen through the glass shapes, with static rim lights;
  only `transform` and `opacity` animate. See [RESEARCH.md](RESEARCH.md).
- **TV side** ([tools/tv/](tools/tv/)): a small watcher that turns the remote's Home button into "open Lumen" and starts Lumen Gallery when the TV's screensaver
  starts, plus an update-notification blocker.

## Easy install: download the .ipk

Don't want to build anything? Download `com.ammar027.lumen_1.0.10_all.ipk` from the [latest release](https://github.com/ammar027/lumen-webos/releases/latest) and install it on your TV:

- **With a mouse and no command line:** open [Dev Manager Desktop](https://github.com/webosbrew/dev-manager-desktop/releases), add your TV, go to *Apps* and drop the `.ipk` onto the window.
- **Or** with the webOS CLI: `npx -p @webos-tools/cli ares-install --device lgtv com.ammar027.lumen_1.0.10_all.ipk`.

The release build leaves out third-party app logos and the default wallpapers are public-domain paintings; apps without an icon get a plain tile.
Optional: to make the remote's **Home** button open Lumen, see the TV scripts under [tools/tv/](tools/tv/).

## How to build it

`app/` is a clone of the upstream launcher and is not part of this repository. Everything changed is re-applied by the scripts in `tools/`.
See [REBUILD.md](REBUILD.md) for the exact order.

```sh
git clone https://github.com/partridgeworks/webos-launcher app
cd app && npm install
# then the steps in REBUILD.md
```

Brand icons and logos of third-party apps, and the bundled default wallpapers, are **not** included here (trademarks and other people's photographs).
`tools/gen_iconpack.py` and `tools/build_iconpack.py` build the icon tiles from logos you put in `tools/logos/` and from your own TV's app icons.

## Install on the TV

```sh
ares-setup-device           # add your TV as "lgtv" (developer mode on, or rooted)
npx -p @webos-tools/cli ares-install --device lgtv build/*.ipk
```

To make Home open Lumen, copy `tools/tv/watch.sh` to `/var/lib/homehook/` and `tools/tv/60-homehook` to `/var/lib/webosbrew/init.d/` on the TV.
To undo it, delete the hook file and stop `watch.sh`.

## Credits

Built on partridgeworks/webos-launcher (MIT). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Not affiliated with LG, Apple or any app vendor.
Licence: [MIT](LICENSE).

## TV experience fixes

See [Home behavior, black startup, faster glass rows, personal TV icons and Gallery screensaver](docs/tv-experience.md) for the final build layer and optional TV setup. Home takeover preserves previous-input startup; native Home bindings require an already-installed compatible input hook.
