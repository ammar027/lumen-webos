# Immich photos as the wallpaper and the screensaver

Settings > Wallpaper > Wallpaper type > Immich photos shows your own photos from an Immich server on the home network (from Sam Renfrew's fork, MIT). It is off until the server is set up below.

## Set up (once, over ssh to the TV)

1. In Immich: Account Settings > API Keys > New API Key. Give it only these permissions: `album.read`, `asset.read`, `asset.view`,
   `memory.read`, `face.read`, `stack.read`. It can then read photos and nothing else. Without `face.read` everything still works, but photos are
   not placed on their faces (see below). Without `stack.read`, every photo in a stack can show, not only its cover.
2. On the TV:

   ```sh
   cat > /var/lib/homehook/immich.json <<'JSON'
   {"url": "http://192.168.1.10:2283", "key": "PASTE-THE-KEY-HERE"}
   JSON
   chmod 600 /var/lib/homehook/immich.json
   ```

   `url` is the server's address as you would open it in a browser on the home network: scheme, host and port, no path.
3. Open Settings > Wallpaper > Wallpaper type and pick Immich photos. If it says Immich is not set up, the file could not be read or the address is not in that form.

## Sources

A stack shows as its cover photo only. Lumen reads the list of stacks from Immich every 6 hours and leaves the other photos in each stack out.

- **Recent**: random photos taken in the last 6 months. Settings > Wallpaper > Recent photos from changes this to the last month, 3 months or year.
- **On this day**: Immich's memories for today (photos from this date in past years); Recent when there are none.
- **Favourites**: random from the photos marked as favourites.
- **All my photos**: random from everything.
- **Your albums**: each album with photos in it is listed by name.

Landscape photos fill the screen. Portrait photos show in pairs, side by side, so they are not cropped to a strip. The two photos in a pair
come from different days, so a pair is not two shots of the same moment. A portrait with no partner from another day in the batch is
skipped. Square photos are skipped, since they lose too much in either layout. Recent and All also skip pictures with no camera make in
their EXIF, which drops screenshots and saved images. The next picture comes from other days than the one before it (both days,
for a pair), so two pictures in a row are not from the same day. Lumen searches again for one before it gives this up. Recently shown photos (the last 40) are not repeated, counted per photo, so a
portrait does not come back soon in a new pair.

A photo is cropped to fill the screen, or its half of it for a pair, so part of it is always cut off. Lumen moves the crop so the faces
in it stay in view, a little above the middle. A photo with no faces keeps more of its top than its bottom, since heads and subjects tend
to sit high. A 9:16 phone portrait in a pair loses about 300 px top and bottom together, so this matters most there.

## How it works

- Immich sends no CORS headers outside its dev mode, so a TV web app cannot call its API directly. Every API call goes through curl on the
  TV (`immichRequest` in `app/src/lib/root.ts`, which only accepts a plain address, a plain key and six fixed paths).
- Face positions: the search says only which photos have people, not where their faces are (checked on Immich 3.3). So when a photo with
  people is picked, Lumen asks `/api/faces?id=<id>` for its face boxes, one small request per photo. Each photo's shape and face centre
  are kept in localStorage (`lumen-immich-frames-v1`, the newest 300), and `picturePosition` in `lib/immich.ts` turns them into a
  `background-position` for the wallpaper and the screensaver.
- The photo itself is loaded as an ordinary image from `/api/assets/<id>/thumbnail?size=preview&apiKey=...` (about 1440 px on the long
  side), which needs no CORS. It is never sent through images.weserv.nl or anywhere else off the home network.
- The blurred copies the glass and the lower rows show are made on the TV from Immich's small thumbnail, once per photo. For a pair, both
  thumbnails are blurred side by side, as the pair shows.
- The next photo is chosen 8 s after the current one is up and its blur goes into the boot record, so a cold start paints that blur at once
  and the photo fades in over it, as for the cloud wallpapers.
- The key is kept in the app's localStorage on the TV (to build the photo URL at start-up without a root call) and in
  `/var/lib/homehook/immich.json`. Use a read-only key.

## Screensaver

Settings > Screensaver > Screensaver type > Photos in Lumen, then Photos > Immich: Recent (or any other source). The idle screensaver and the top-right menu's Start Screensaver then
open your photos full screen, with a 1.6 s crossfade every Time on each photo, a very slow zoom and the clock, date and weather at the bottom. Any key returns to the home screen.
Unlike the fork's version, this screen is only opened from inside Lumen: LG's own screensaver (and Lumen Gallery's) are not replaced when another app is in front.
