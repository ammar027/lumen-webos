# Rebuilding Lumen

`app/` is a clone of partridgeworks/webos-launcher (its own git repo, not tracked here). Everything we changed is re-applied by the scripts in `tools/`:

```sh
cd app
git checkout -- src index.html public/appinfo.json
python3 ../tools/build_catalog.py && python3 ../tools/build_iconpack.py
for s in apply_tvos apply_features apply_wallpaper_extras apply_polish apply_home_extras apply_status_tvos apply_status_topleft apply_status_cc \
         apply_control_center apply_stamp apply_branding apply_options_scroll apply_options_bar apply_wallpaper_layout apply_type apply_font \
         apply_homekey apply_tvfix apply_screensaver_time apply_art_button apply_sound_mode apply_feedback apply_perf2 apply_i18n apply_videofix apply_dark apply_cc_dark apply_videochoice apply_dark3 apply_lowmem apply_videopicker apply_videoglass apply_dockhide apply_places apply_dockhint apply_light apply_videomulti apply_videonote apply_videomove apply_dockglass apply_settingsperf apply_settingsglass apply_iconcolor apply_bootdefer apply_videocaption apply_sf apply_darkdefault apply_clockstyle apply_lowerveil apply_tv_experience apply_pointerfix apply_oldtv apply_webos5 apply_veilcanvas apply_samui apply_settingscanvas apply_settingsstack apply_controlcenter; do python3 ../tools/$s.py; done
npm run build && npm run package
npx -p @webos-tools/cli ares-install --device lgtv build/*.ipk
```

`apply_branding.py` adds the `home` app category to `public/appinfo.json`. It does not select the default Home app.
See [Native Home selection](docs/native-home.md) for the test command and optional TV setup.

Not in the pipeline on purpose: `apply_clearer_glass.py` (reverted), `apply_motion.py` and `apply_launchfx.py` (opening animations, laggy on the TV).
`app-assets/` holds the files the scripts need that are not in the upstream repo (icon pack, wallpapers, system app icons, app icon and splash): copy them into `app/public/`.
`tools/tv/` is what runs on the TV (Home-button/screensaver watcher, clock fix, extra blocked hosts); see the notes in each file.
