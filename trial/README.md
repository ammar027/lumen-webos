# Optional webOS 5 trial

This trial adds a five-column expanding app grid, more reliable native icon loading,
an in-app photo frame, and shared Inputs / Control Center panels. It is based on
Lumen `497e9182fd9d0d12d7ed9bfbafc0ee15d7139a79` and installs separately as
`local.lumen.trial` (version 0.3.12), preserving the original Lumen installation.

These browser previews use synthetic preferences and generated text cards, not TV data:

![Expanded app grid](../docs/trial/grid.png)
![Control Center](../docs/trial/control-center.png)
![Input selection](../docs/trial/inputs.png)

## Build from a fresh checkout

Requirements: Git, Python 3.9+, Node.js 22+ and npm. From the repository root:

```sh
python3 trial/prepare.py
npm --prefix app ci
npm --prefix app run build
npm --prefix app run package
```

`prepare.py` clones partridgeworks/webos-launcher at
`1e2c39b9a988ceb1b258e40e3592bda84a2aa076`, copies the readable source overlay,
reuses Lumen's own icons and Geist font, and generates text-only cards and abstract
gradient backgrounds. It refuses to overwrite an existing `app/` directory.
Use `--app-dir /path/to/a/new/directory` if the original patch pipeline already
uses `app/`; run subsequent npm commands against that new path.

The existing Lumen patch pipeline remains available as described in
[REBUILD.md](../REBUILD.md). The trial overlay is a separate, pinned source snapshot
so its current behavior can be reviewed and reproduced without replaying historical
string-replacement patches or extracting files from an installed TV.

Third-party app logos, extracted TV icons, photographic wallpapers, personal app
order, recent history, weather location, credentials and device connection helpers
are not bundled. Public builds use generic defaults. Optional local artwork can
replace files in the generated `app/public/iconpack/` and `app/public/wallpapers/`;
catalogue overrides can go in the generated app's ignored `src/config/catalog.local.ts`.
For a local sound override, replace `public/sounds/navigation-focus-v1.pcm` in the
generated app before building. Use raw signed 16-bit little-endian mono PCM at
48 kHz, at most one second long, and normalize it to a suitable quiet level.
Third-party focus sounds and the owner's selected audio are not bundled here.
Use a new PCM basename and update `SOUND` in `src/lib/navigationSound.ts` when
changing an installed cue, so device-side sample caches cannot retain the old cue.
`trialSeed.json` is empty in this overlay, so fresh installs discover and seed their
own installed apps. Existing trial preferences continue to load from localStorage.

## Features

- Five apps on the first row; Down expands a five-column grid and Back collapses it.
  Hold OK retains app moving, folders and context menus. Recent apps are optional:
  Off, Not on Home, or All recent, without deleting the history.
- Optional Navigation sounds (Off / Soft) use a quiet, original rounded cue for
  remote movement between Home app tiles, input cards, Control Center controls and
  its choice lists. New installs and existing preferences
  default to Off. Pointer hover, blocked movement, initial/restored focus, panel
  opening/closing and volume adjustments stay quiet. Settings and its restart
  confirmation remain silent.
  Each accepted focus move dispatches immediately, without an extra rate limit or a
  response queue. Compatible TVs use native PCM after a silent capability check;
  other environments use Web Audio. Both load the same packaged mono 48 kHz S16LE
  file, so local sound overrides remain consistent between playback paths.
  While Soft is enabled and Lumen is visible, a continuous -80 dBFS peak signal
  prevents silence-dependent loss of isolated cues on the tested LG. Quick panels
  keep that signal ready; Off, background and photo-frame mode stop it. No volume,
  mute, sound processing or output setting is written. The public generic cue has
  a 110 ms body in a 180 ms file; regenerate it with
  `python3 trial/generate-navigation-sound.py`.
- Native icons are read in bounded chunks, with independent failure handling and
  cache invalidation by path, file size and modification time. A failed large icon
  no longer discards every other app's icon.
- Bing scenic photos and an optional SFW Wallhaven collection share a bounded disk
  cache (48 MiB, at most 40 images per source). Failed downloads retain the last good
  collection. The photo frame adds crossfades, gentle pan/zoom, captions and a clock;
  a wake key is consumed before normal launcher navigation resumes.
- Inputs use AV/HDMI port names, preserve custom names, distinguish confirmed active
  input from last-used input, and leave missing connection status unknown. Back
  restores the panel and control that opened Inputs.
- Control Center offers explicit sound, picture, sleep, audio and photo-frame choices.
  TV settings remain unknown until read, update only after confirmation, and refresh
  while the panel is visible. Older reads cannot overwrite a newer setting change.
  Picture/sound choices are restricted to values reported as available by the TV.
  Restart lives in Settings behind a confirmation with Cancel selected.
- Cached glass, restrained focus scaling, reserved text space and a shared rounded
  surface work within Chromium 68. The tint covers the border box while the cached
  wallpaper keeps its original alignment, avoiding brighter straight borders than
  corners. One soft upper-edge highlight is shared across the quick panels.

## Install and recovery

Install the package from `app/build/` with Dev Manager Desktop or a configured
`ares-install --device DEVICE app/build/local.lumen.trial_0.3.12_all.ipk`.
Rooted-TV features use the existing Homebrew Channel service; the trial does not
install a new system service or change the Home button, startup app, LG screensaver
timer, clock or hosts file. LG Home remains available from Control Center and the
physical Home key.

The optional idle helper runs from the app package, writes only under
`/tmp/lumen-trial/`, and exits when the package disappears. It acts only while the
trial is foreground. Create `/tmp/lumen-trial/disabled` to stop its idle actions;
remove that marker to resume them. Uninstalling only Lumen Trial preserves the
separate original Lumen app. Photo downloads and idle handling run on the TV;
no build computer is needed at runtime.

## Verification

From the repository root, after preparing the default `app/` directory:

```sh
npm --prefix trial ci
npm --prefix trial run install:browser
npm --prefix trial test
```

The runner starts and stops its own local preview on port 5187. It uses synthetic
app preferences, mocked photo responses and sanitized webOS 5 control fixtures.
It checks icon chunking/cache behavior, grid editing and folders, photo-frame wake
handling, text geometry, settings errors, stale reads, outside setting changes,
active versus last-used inputs and light appearance. Rendered-pixel checks exercise
volume fill visibility at 25/50/75, plus empty/full geometry, focused and unfocused
in both appearances. Remote volume changes retain focus while updating the fill. The focused slider
shares the other controls' background/text colors, including its label and icon.
Artifacts go to the ignored
`.trial-evidence/` directory. Set `CHROMIUM_PATH` to use an existing Chromium binary
instead of Playwright's downloaded browser.

The navigation-sound checks separately cover migration/default Off, Soft persistence,
actual focus changes, every rapid accepted move, Inputs / Control Center and all
five choice lists, quiet opening/Back/pointer/boundary/volume behavior, Settings and
restart-confirmation silence, one low-level keepalive, Off/background/photo-frame cleanup, rapid
Off/Soft changes during resume, packaged PCM loading, delayed audio unlock, a stalled
startup audio clock and unavailable audio. They instrument an audio fixture; perceived loudness and physical
output require a TV listening check.

The 0.3.5 UI implementation was installed on an LG 86UN8570AUD, webOS 5.6.2-21,
firmware 04.64.00, Chromium 68. Native package checksums, text geometry and navigation
were verified. The owner tested the physical remote, Inputs, Control Center and
photo frame, and accepted the final edge treatment. Earlier native checks changed
and restored sound, verified the sleep countdown and Off state, and routed an HDMI
input. Public fixture tests are separate from that physical evidence; the public
build uses generic cards and gradients instead of the owner's local artwork.

The owner evaluated 0.3.6 and accepted the volume but reported an unpleasant sound,
missed rapid clicks and delay. Version 0.3.7 removed the sound throttle and used
native PCM, but isolated cues were still inaudible. A digital output recording
contained the complete cues even when service success alone had been insufficient
to establish audibility. Keeping the output active with digital zero did not fix
the listening result. A very low-level nonzero signal did: the owner confirmed
that slow, isolated presses now made sound. This supports an idle/silence gate in
the playback path; the exact internal stage has not been identified.

Version 0.3.8 packages that keepalive and separates readiness from Home focus cues,
keeping quick panels ready while stopping the stream for Off, background and the
photo frame. It also loads the same versioned PCM asset in both playback paths.
The owner's local build uses their selected reference sound; this public build
uses the original generated cue above. Listening acceptance of the local reference
does not establish a match between the public cue and any proprietary system sound.
Native 0.3.8 checks then verified the installed bundle and selected-cue hashes,
12 rapid dispatches, an isolated dispatch after a pause, one -80 dBFS keepalive,
panel readiness and Off cleanup. Saved preferences, volume, processing and output
settings were preserved. The owner confirmed the live selected cue and keepalive
before packaging; a separate post-install listening check is not claimed.

Version 0.3.9 extends the same cue to remote focus movement across input cards,
Control Center controls and its Sound, Picture, Sleep timer, Photo frame and Audio
choice lists. Audio lifecycle ownership now lives in the app, so all those panels
share the existing preference, backend and single keepalive. Initial focus, opening,
Back, pointer hover, blocked arrows and volume changes stay quiet. The six browser
suites passed, along with public/private production builds and IPK packaging.
Native checks on the same LG verified each panel path, all five lists, rapid remote
movement, one cue per focus change and one shared readiness stream. Installed bundle
and selected-cue hashes matched, and saved preferences, volume and audio settings
were preserved. The owner subsequently confirmed that Inputs and Control Center
sounds work well and feel immediate with the local selected cue.

Version 0.3.10 fixes a focused volume slider that looked full at every value.
The shared white focus background hid its translucent white fill even though the
fill width and number were correct. The slider now retains a contrasting track
and fill with its own focus outline in dark and light appearances. A rendered-pixel
regression test failed on the old styling and passes with this correction at
25/50/75, alongside empty/full geometry and remote volume edits without losing
focus. Panel, visual and navigation-audio suites, both production builds and both
IPK packages passed. Native LG checks verified live focused changes, both
appearances, installed bundle/cue hashes, restored volume and unchanged preferences
and sound settings. The owner confirmed the fill update, but found the outline-only
focus treatment too subdued. Menu opening/closing remains quiet.

Version 0.3.11 restores the same solid focus highlight used by the other controls,
with an opposing tint for the progress fill. Slider labels and speaker icons inherit
the focused foreground in both appearances. The new focus comparison failed against
0.3.10's subdued appearance, then passed with the shared highlight while retaining
all progress-contrast checks. Native LG checks compared Volume with selected Audio,
verified focused volume edits, label/icon colors, both appearances, installed hashes
and preserved preferences/audio settings, restoring the current volume afterward.

Version 0.3.12 refines only the volume fill colors, using opaque cool grays for
consistent contrast over different wallpapers. The current pill geometry, shared
solid focus highlight, stable label/icon colors and volume behavior are retained.
Panel and visual suites pass across both appearances, focused/unfocused states,
0/25/50/75/100 and remote volume changes.
Native LG checks confirmed identical pill/panel geometry, live focused volume
changes, the shared focus highlight, readable label/icon colors, and stronger fill
contrast in both appearances. Installed bundle/cue hashes matched; preferences
and audio settings were preserved and the starting volume was restored.

A full ten-minute idle check was explicitly skipped. Standby/resume, a multi-hour
slideshow and other TV models/firmwares remain unverified. This is an experimental
trial for upstream review, not a replacement for the existing release pipeline.

The pinned upstream dependency lockfile is unchanged. Its build toolchain currently
reports npm audit advisories, including two high-severity transitive dependencies
under the webOS CLI even with `--omit=dev`. Updating that toolchain is separate from
this trial overlay.
