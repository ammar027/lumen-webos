# Keeping Lumen open in the background (optional, off)

Idea and measurements: Sam Renfrew's fork (MIT), `docs/keep-alive.md` and `docs/spikes.md` there. On his TV (webOS 25) the memory manager (`memchute`) closes the app you were in the moment another app
opens, and two lists in the config service stop that for the apps on them: `com.webos.memorymanager.KeepOnLaunchEx` (a soft keep) and `com.webos.memorymanager.KeepAlive` (a hard keep). With Lumen on
both, every Home press after the first opened it in 0.4 to 1.6 s instead of 3 to 11 s.

`tools/tv/keepalive.sh` (run on the TV as root, never by the app) does it, carefully:

```sh
ssh root@<tv> 'sh -s status' < tools/tv/keepalive.sh    # what the lists hold now
ssh root@<tv> 'sh -s on'     < tools/tv/keepalive.sh    # add Lumen to both lists, then reboot the TV
ssh root@<tv> 'sh -s off'    < tools/tv/keepalive.sh    # put the saved lists back, then reboot
```

- It only ever adds to a list the TV already has. When a list is missing it refuses and changes nothing.
- It saves what it changes in `/var/lib/homehook/keepalive-before.json` and keeps `/var/preferences/configd_db.json` in `/var/lib/homehook/configd_db.backup.json`.
- It costs about 60 MB of usable memory while Lumen sits in the background. Not worth it on a TV with little free memory.

**On the LG 65UQ8040PSB (webOS 22) these two lists are not defined** (checked 2026-10-24: `getConfigs` reports both missing, and only `clearBackgroundApp: true` is set under `com.webos.memorymanager`), so `on`
refuses there. memchute's binary does contain `isKeepAlive` and `isKeepOnLaunchEx`, so the lists may exist as built-in defaults; writing a list of our own could replace them, which is why it is left alone.
