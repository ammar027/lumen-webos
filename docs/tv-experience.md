# Home behavior, startup, icons and screensaver

Run `tools/apply_tv_experience.py` as the final step in REBUILD.md. It uses the repository's `app/` by default, or `--app /path/to/launcher`. It can be run again safely.

## Home and power-on

Install the existing `watch.sh` and `60-homehook` as described in README.md. The watcher starts at boot and redirects **only LG Home**. Do not add an unconditional Lumen launch hook: when the TV resumes HDMI or another app, that input should remain active. Remove or disable older launcher autostart hooks yourself after backing them up; the tools here do not remove other apps' hooks.

Polling can briefly show LG Home before opening Lumen. If your TV already has the compatible `lginput-hook.so` with `launch` / `id` bindings, run:

```sh
python3 configure-native-home.py
```

This consumes Home codes 125, 773 and 774 and launches Lumen directly. It preserves unrelated bindings and prints a backup path. Use `--restore BACKUP` to undo it. This tool does **not** install or inject a native library; other input hooks may have different formats. The watcher remains useful for booting to LG Home and for Gallery takeover. Lumen's LG Home action still sets the temporary bypass flag.

## Startup and navigation

The launch splash is black, without changing the app icon. The empty root is hidden until the app-list result has committed and the wallpaper/icons are ready. A two-second grace period after the list result and an eight-second overall fallback prevent a failed image or service from leaving the app hidden.

Lower rows render in advance. Their 160 ms slide uses transforms for image and video wallpapers rather than animating `top`. Translucent gradient glass avoids the fixed-background sampling issue inside transformed rows. This uses more initial image memory than the previous deferred-row approach; large app lists should be checked on low-memory TVs.

## Personal TV icon pack

No third-party artwork is added to the repository or release build. On your TV:

```sh
python3 export-icons.py /tmp/lumen-icons
```

Copy that directory to your build machine. Install Pillow there (`python3 -m pip install Pillow`), then:

```sh
python3 tools/gen_tv_iconpack.py --icons /path/to/lumen-icons
python3 tools/build_iconpack.py
```

Run the normal build pipeline. `build_iconpack.py` accepts `LUMEN_APP=/path/to/launcher` for a separate clone. The exporter prefers the app's large icon and falls back to its standard icon; low-resolution originals remain low-resolution. Flat corner colors are extended across the tile, while artwork icons use a blurred background. Keep exported icons and generated tiles private for personal use. `build_release.py` still removes third-party icon packs.

## Gallery screensaver

When Gallery is installed, Lumen's Start screensaver action and its internal idle trigger launch `com.ammar027.lumen.gallery` with `{mode: 'screensaver'}` directly. When Gallery is absent, the original root-backed native trigger is retained. This avoids firmware that accepts `turnOnScreenSaver` but stays in the Active power state.

LG's system standby-time control still sets **LG's timer**, not a new Lumen timer. Automatic Gallery takeover outside Lumen still requires the TV to enter Screen Saver state and the watcher flag `/var/lib/homehook/frame-screensaver`. Video wallpaper intentionally suppresses that takeover. Direct Gallery launch does not make firmware-wide idle detection work.

## Validation

The runtime equivalents were exercised on a rooted LG TV: Home bindings loaded, Gallery became foreground, a full reboot returned, and the owner confirmed improved row speed and restored glass transparency. The final boot worker was disabled to preserve previous-input startup. There is no measured FPS claim. The generalized source/tooling changes need the build and regression checks described in the pull request.
