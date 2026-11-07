#!/bin/sh
# Keeps LG's preload manager stopped (it preloads Netflix, Amazon, the browser, LG Channels, Google Assistant and more, about 280 MB of this TV's 1.3 GB, and the TV turns it back on by itself).
# Whenever it finds the service running (and once at the start) it closes the apps it preloads, unless one is in front, so Lumen and the app you open stay in memory.
# Checks every 5 s for the first 5 minutes after boot (the TV restarts the service around 90-125 s), then every 30 s.
# Switch off: rm /var/lib/webosbrew/init.d/67-nopreload, then kill this script.
PATH="/bin:/sbin:/usr/bin:/usr/sbin:$PATH"
LOCK=/tmp/nopreload.lock
mkdir "$LOCK" 2>/dev/null || exit 0
close_preloaded() {
  front=$(luna-send -n 1 luna://com.webos.applicationManager/getForegroundAppInfo '{}' </dev/null 2>/dev/null | sed -n 's/.*"appId": *"\([^"]*\)".*/\1/p')
  running=$(luna-send -n 1 luna://com.webos.applicationManager/running '{}' </dev/null 2>/dev/null)
  for a in netflix amazon com.webos.app.browser com.webos.app.lgchannels google.assistant; do
    [ "$a" = "$front" ] && continue
    case "$running" in *"\"$a\""*) luna-send -n 1 luna://com.webos.applicationManager/closeByAppId "{\"id\":\"$a\"}" </dev/null >/dev/null 2>&1 ;; esac
  done
}
sleep 3
systemctl stop preload-manager.service 2>/dev/null
close_preloaded
while :; do
  if [ "$(systemctl is-active preload-manager.service 2>/dev/null)" = active ]; then
    systemctl stop preload-manager.service 2>/dev/null
    sleep 2; close_preloaded
  fi
  up=$(cut -d. -f1 /proc/uptime)
  if [ "$up" -lt 300 ]; then sleep 5; else sleep 30; fi
done
