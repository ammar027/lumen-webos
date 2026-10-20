#!/bin/sh
# Trial-only: no Home interception, global timer, clock, hosts, or other app changes.
APP=local.lumen.trial
DIR=/media/developer/apps/usr/palm/applications/$APP
STATE=/tmp/lumen-trial/state
LOCK=/tmp/lumen-trial/watch.pid
mkdir -p /tmp/lumen-trial
if [ -f "$LOCK" ] && kill -0 "$(cat "$LOCK")" 2>/dev/null; then exit 0; fi
echo $$ > "$LOCK"
trap 'rm -f "$LOCK"' EXIT INT TERM
while [ -d "$DIR" ]; do
 if [ -f /tmp/lumen-trial/disabled ]; then sleep 3; continue; fi
 foreground=$(luna-send -w 2000 -n 1 luna://com.webos.applicationManager/getForegroundAppInfo '{}' 2>/dev/null)
 case "$foreground" in
  *'"appId":"local.lumen.trial"'*|*'"appId": "local.lumen.trial"'*)
   power=$(luna-send -w 2000 -n 1 luna://com.webos.service.tvpower/power/getPowerState '{}' 2>/dev/null)
   case "$power" in
    *'"Screen Saver"'*)
     if [ -f "$STATE" ]; then
      read -r idle last frame < "$STATE"
      case "$idle" in *[!0-9]*|'') sleep 3; continue ;; esac
      case "$last" in *[!0-9]*|'') sleep 3; continue ;; esac
      case "$frame" in 0|1) ;; *) sleep 3; continue ;; esac
      now=$(date +%s)
      if [ "$frame" -eq 1 ] || [ "$idle" -gt 0 ]; then
       if [ "$frame" -eq 1 ] || [ $((now-last)) -ge "$idle" ]; then
        luna-send -w 2000 -n 1 luna://com.webos.applicationManager/launch '{"id":"local.lumen.trial","params":{"mode":"photos"}}' >/dev/null 2>&1
       fi
       luna-send -w 2000 -n 1 luna://com.webos.service.tvpower/power/turnOnScreen '{}' >/dev/null 2>&1
      fi
     fi
     ;;
   esac
   ;;
 esac
 sleep 3
done
