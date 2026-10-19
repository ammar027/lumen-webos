# Rebuilding Lumen

`app/` is a clone of partridgeworks/webos-launcher (its own git repo, not tracked here). Everything we changed is re-applied by the scripts in `tools/`:

```sh
cd app
git checkout -- src index.html public/appinfo.json
python3 ../tools/build_catalog.py && python3 ../tools/build_iconpack.py
for s in apply_tvos apply_features apply_wallpaper_extras apply_polish apply_home_extras apply_status_tvos apply_status_topleft apply_status_cc \
         apply_control_center apply_stamp apply_branding apply_options_scroll apply_options_bar apply_wallpaper_layout apply_type apply_font \
         apply_homekey apply_tvfix apply_screensaver_time apply_art_button apply_sound_mode apply_feedback apply_perf2 apply_i18n apply_videofix apply_dark apply_cc_dark apply_videochoice apply_dark3 apply_lowmem apply_videopicker apply_videoglass apply_dockhide apply_places apply_dockhint apply_light apply_videomulti apply_videonote apply_videomove apply_dockglass apply_settingsperf apply_settingsglass apply_iconcolor apply_bootdefer apply_videocaption apply_sf apply_darkdefault apply_clockstyle apply_lowerveil; do python3 ../tools/$s.py; done
npm run build && npm run package
npx -p @webos-tools/cli ares-install --device lgtv build/*.ipk
```

Not in the pipeline on purpose: `apply_clearer_glass.py` (reverted), `apply_motion.py` and `apply_launchfx.py` (opening animations, laggy on the TV).
`app-assets/` holds the files the scripts need that are not in the upstream repo (icon pack, wallpapers, system app icons, app icon and splash): copy them into `app/public/`.
`tools/tv/` is what runs on the TV (Home-button/screensaver watcher, clock fix, extra blocked hosts); see the notes in each file.

## Release checksums

After the normal patch pipeline, build the release package:

```sh
python3 tools/build_release.py
```

The script writes `release/SHA256SUMS.txt` after it copies the final IPKs.
The checksum file contains sorted filenames and SHA-256 digests.
It does not contain local paths.
The build fails if no IPKs exist or the checksum check fails.

Before publication, check the release files:

```sh
python3 tools/release_checksums.py release --check
```

This check compares all IPK filenames and digests with the checksum file.
It does not change files.
It returns a nonzero exit status if the files do not match.
Publish the IPKs and `SHA256SUMS.txt` from the same build.

To replace a stale checksum file for existing final packages, run:

```sh
python3 tools/release_checksums.py release
```

To check downloaded files on Linux, put all release IPKs and the checksum file in one directory.
Then run this command in that directory:

```sh
sha256sum --check SHA256SUMS.txt
```

A checksum detects different bytes. It does not prove who supplied a package.
This code change does not replace checksum files on existing GitHub releases.

Run the local tests from the repository root:

```sh
python3 -B -m unittest discover -s tools/test -p 'test_release_checksums.py' -v
```

The build test uses temporary files and simulated external commands.
It does not run npm, download assets, or install a package.
