#!/bin/sh
# TV tool: clears the "software update" banner. After a boot LG's update process (/usr/sbin/update) remembers an update it found earlier (a saved record, nsuImageSize
# above 0) and the TV shows a banner for it, although the update servers are blocked. Restarting that process wipes the record (found on 2026-10-04); the TV starts it
# again by itself. This checks right after the boot every 5 s for 3 minutes, then every 10 minutes, and restarts the process only when a record is there.
# Switch off by deleting /var/lib/homehook/clear-update-banner. Log: /tmp/clear-update-banner.log
FLAG=/var/lib/homehook/clear-update-banner
mkdir -p /var/lib/homehook; touch "$FLAG"
size() { luna-send -n 1 luna://com.webos.service.update/getStatus '{}' </dev/null 2>/dev/null | sed -n 's/.*"nsuImageSize": *\([0-9]*\).*/\1/p'; }
clear() {
  n=$(size)
  [ -n "$n" ] && [ "$n" -gt 0 ] || return
  pid=$(ps -ef | awk '$8=="/usr/sbin/update"{print $2}')
  [ -n "$pid" ] && kill $pid && echo "$(date +%T) saved update ($n bytes) cleared, update process $pid restarted" >> /tmp/clear-update-banner.log
}
i=0
while [ -f "$FLAG" ]; do
  clear
  if [ "$i" -lt 36 ]; then i=$((i + 1)); sleep 5; else sleep 600; fi
done
