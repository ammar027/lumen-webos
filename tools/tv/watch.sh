#!/bin/sh
# Home button -> custom launcher, and screensaver -> Frame (art mode). Once a second, checks which app is in front.
#  - When LG's own Home has just come up, opens the launcher instead (polling, because luna-send buffers a subscription's output when it is piped).
#    The launcher's own "LG Home" button touches /tmp/allow_lg_home first, so LG Home can still be opened on purpose (it then stays until you leave it).
#    About 70 s after a cold boot the TV opens LG Home by itself ("last input", not the Home button) on top of whatever you opened; then the app you were
#    in is opened again instead of the launcher (seen on 2026-11-09: Netflix opened at 68 s, pushed out by LG Home at 70.7 s).
#  - When the TV's power state becomes "Screen Saver" (LG's screensaver is not a foreground app, so the power state is what shows it) and
#    /var/lib/homehook/frame-screensaver exists: opens Frame in screensaver mode, then ends LG's screensaver (turnOnScreen) so Frame is what shows.
# Never spins: reacts only when the app changes, and at most once every 3 s. Does nothing if the app is not installed.
ME=com.ammar027.lumen
FRAME=com.ammar027.lumen.gallery
LGHOME=com.webos.app.home
FLAG=/tmp/allow_lg_home
SAVER_FLAG=/var/lib/homehook/frame-screensaver
VIDEO_FLAG=/var/lib/homehook/video-wallpaper
APPS=/media/developer/apps/usr/palm/applications
EXTRA=/var/lib/homehook/hosts-extra
prev=""
last=0
okhome=0
ticks=0
saverlast=0
pwprev=""
lastapp=""

while true; do
  out=$(luna-send -n 1 luna://com.webos.applicationManager/getForegroundAppInfo '{}' </dev/null 2>/dev/null)
  case "$out" in
    *'"appId":"'$LGHOME'"'*)
      # LG Home is in front. Unless the launcher's own LG Home button just asked for it, send it to the launcher, and keep trying (every 3 s) until it
      # works: right after a cold boot LG Home is the first thing on screen and the launcher may not be ready yet.
      now=$(date +%s)
      if [ "$prev" != "$LGHOME" ]; then
        okhome=0
        if [ -f "$FLAG" ]; then
          age=$((now - $(stat -c %Y "$FLAG")))
          [ "$age" -ge 0 ] && [ "$age" -lt 30 ] && okhome=1
        fi
      fi
      if [ "$okhome" -eq 0 ] && [ -d "$APPS/$ME" ] && { [ $((now - last)) -ge 3 ] || [ $((now - last)) -lt 0 ]; }; then
        last=$now
        target=$ME
        # LG's own boot-time "last input" opening (logged by SAM a moment ago): go back to the app that was in front, if it was a real app
        if [ "$prev" != "$LGHOME" ] && [ -n "$lastapp" ] && [ "$lastapp" != "$ME" ]; then
          up=$(cut -d. -f1 /proc/uptime)
          lt=$(tail -n 300 /var/log/messages 2>/dev/null | grep '"app_id":"'$LGHOME'".*"mode":"last_input"' | tail -n 1 | sed -n 's/.*\[\([0-9]*\)\.[0-9]*\].*/\1/p')
          [ -n "$lt" ] && [ $((up - lt)) -le 5 ] && target=$lastapp && echo "$(date +%T) LG Home opened by last_input, back to $lastapp" >> /tmp/homehook.log
        fi
        luna-send -n 1 luna://com.webos.applicationManager/launch "{\"id\":\"$target\"}" </dev/null >/dev/null 2>&1
      fi
      prev=$LGHOME
      ;;
    *)
      prev="other"
      # the app in front, for the case above (launcher, Frame and LG's own system apps are not reopened)
      a=$(echo "$out" | sed -n 's/.*"appId": *"\([^"]*\)".*/\1/p')
      case "$a" in ""|$ME|$FRAME|com.webos.*|com.lge.*) ;; *) lastapp=$a ;; esac
      ;;
  esac
  # video wallpaper on and the launcher in front: no screensaver, LG's is ended as soon as it starts
  vid=0
  if [ -f "$VIDEO_FLAG" ]; then case "$out" in *'"appId":"'$ME'"'*) vid=1 ;; esac; fi
  if [ "$vid" -eq 1 ]; then
    pw=$(luna-send -n 1 luna://com.webos.service.tvpower/power/getPowerState '{}' </dev/null 2>/dev/null)
    case "$pw" in
      *'"Screen Saver"'*) luna-send -n 1 luna://com.webos.service.tvpower/power/turnOnScreen '{}' </dev/null >/dev/null 2>&1; echo "$(date +%T) ended screensaver (video wallpaper)" >> /tmp/homehook.log ;;
    esac
  elif [ -f "$SAVER_FLAG" ] && [ -d "$APPS/$FRAME" ]; then
    pw=$(luna-send -n 1 luna://com.webos.service.tvpower/power/getPowerState '{}' </dev/null 2>/dev/null)
    case "$pw" in
      *'"Screen Saver"'*)
        if [ "$pwprev" != "saver" ]; then
          now=$(date +%s)
          if [ $((now - saverlast)) -ge 5 ]; then
            saverlast=$now
            echo "$(date +%T) screensaver seen; foreground: $out" >> /tmp/homehook.log
            case "$out" in
              *'"appId":"'$FRAME'"'*) ;;
              *) r=$(luna-send -n 1 luna://com.webos.applicationManager/launch "{\"id\":\"$FRAME\",\"params\":{\"mode\":\"screensaver\"}}" </dev/null 2>&1); echo "$(date +%T) launch Frame: $r" >> /tmp/homehook.log; sleep 1 ;;
            esac
            luna-send -n 1 luna://com.webos.service.tvpower/power/turnOnScreen '{}' </dev/null >/dev/null 2>&1
          fi
        fi
        pwprev="saver"
        ;;
      *) pwprev="other" ;;
    esac
  fi
  # keep the extra blocked names in /etc/hosts (about every 30 s; the dashboard rewrites the table at boot)
  ticks=$((ticks + 1))
  # the clock: shortly after start, then every 10 minutes (see clockfix.sh)
  if [ "$ticks" -eq 5 ] || [ $((ticks % 600)) -eq 0 ]; then sh /var/lib/homehook/clockfix.sh </dev/null >/dev/null 2>&1 & fi
  if [ $((ticks % 30)) -eq 1 ] && [ -f "$EXTRA" ]; then
    grep -v '^#' "$EXTRA" | while IFS= read -r l; do
      [ -n "$l" ] && ! grep -qF "$l" /etc/hosts 2>/dev/null && echo "$l" >> /etc/hosts
    done
  fi
  sleep 1
done
