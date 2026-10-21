# Trial browser previews

These six 1920 × 1080 screenshots show the public 0.3.13 trial UI. They are browser
captures of the real components with synthetic content, rather than TV captures.

| File | View |
| --- | --- |
| `home.png` | Collapsed Home dock with generated app cards |
| `grid.png` | Expanded five-column grid |
| `inputs.png` | Mock AV/HDMI connection and active-input states |
| `control-center.png` | Dark appearance, focused volume at 50 |
| `control-center-light.png` | Light appearance, the same volume and layout |
| `photo-frame.png` | Photo-frame UI with an original generated landscape |

The clock is fixed to January 15, 2026, 09:41 UTC. App order, input names and control
values are explicitly constructed in `trial/screenshot-previews.mjs`. Weather and
Recent are hidden, and navigation sounds are Off. The photo-frame artwork is the
original vector fixture `trial/fixtures/preview-landscape.svg`; it represents the
photo area without reproducing a private or third-party photograph.

The capture script creates isolated browser contexts, clears their storage and
never reads a TV, personal browser profile or device backup. It permits only the
local preview server; Bing responses are fulfilled from fixtures and other HTTP
requests are blocked. No credentials, account names, network addresses, location,
personal artwork, recent history or extracted TV icons are included.

After following the build and browser setup in [the trial guide](../../trial/README.md),
run this from the repository root:

```sh
node trial/run-tests.mjs screenshot-previews.mjs
```

The runner starts a preview bound to `127.0.0.1:5187` and stops it afterward.
Set `CHROMIUM_PATH` to an existing Chromium executable if needed. The capture report
is written to the ignored `.trial-evidence/screenshot-preview-results.json`.
Inspect each image before publishing; automated checks only supplement that review.
