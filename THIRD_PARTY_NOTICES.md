# Third-party notices

This repository holds patch scripts, notes and TV-side scripts. The material below belongs to others.

| Material | Licence | Used for |
|---|---|---|
| [partridgeworks/webos-launcher](https://github.com/partridgeworks/webos-launcher) | MIT, © webos-launcher contributors | the launcher these patches modify (cloned into `app/`, not included) |
| [Geist](https://github.com/vercel/geist-font) typeface | SIL Open Font License 1.1, © The Geist Project Authors | `app-assets/geist-wght.woff2` (and `tools/branding/`) |
| [Preact](https://preactjs.com) | MIT, © Jason Miller | the UI library (comes with the upstream clone) |
| [Simple Icons](https://simpleicons.org) glyph paths | CC0 | `tools/glyphs.json`, used to draw some app tiles |
| Wallpaper catalogue (`tools/catalog.json`) | links and titles only | points to pictures on Reddit's image host and to their posts; the pictures belong to their authors and are loaded from the internet, not stored here |
| Video wallpaper (`tools/wallpaperVideos.ts`) | links only | streams [Mixkit](https://mixkit.co/license/#videoFree) free stock videos (free use, no attribution needed) and Apple's tvOS aerial screensaver videos from Apple's own server; nothing is stored here or on the TV, and the videos belong to their makers |
| Weather | [Open-Meteo](https://open-meteo.com) (CC BY 4.0), location from [ipwho.is](https://ipwho.is) | optional date/weather line |
| [Tigris](https://github.com/lesnolie/Tigris) | MIT, © 2026 lesnolie | rounded-edge sampling and lighting adapted in the optional trial's cached glass renderer; full notice in `trial/overlay/public/licenses/Tigris-MIT.txt` |

The optional trial generates text-only landscape cards and abstract gradient fallbacks locally.
Third-party logo SVGs, TV-extracted icons and photographic wallpapers are not committed.
Trial photo providers (Bing and the optional SFW Wallhaven collection) are network sources;
their photographs and artwork belong to their authors and are not included here.

App icons, logos and names of third-party apps are trademarks of their owners. They are not included in this repository and this project is not
affiliated with or endorsed by them, or by LG Electronics, Apple Inc. or Samsung. "LG" and "webOS" are trademarks of LG Electronics.
