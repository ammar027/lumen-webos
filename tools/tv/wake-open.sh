#!/bin/sh
# Opt-in TV tool (idea and logic from Sam Renfrew's fork, MIT; the wake rule was tested here only with a simulated wake, not a real power-off or Wake-on-LAN): after the TV wakes, open Lumen as soon as the screen is on,
# whatever the TV opened itself. Wake-on-LAN resumes the TV straight into Live TV and skips LG Home, so a rule that only replaces LG Home does nothing.
# Run as root in the background (the Homebrew Channel's startup scripts, or `sh wake-open.sh &`). Switch off by deleting /var/lib/homehook/wake-open.
# A boot counts as a wake too (the first 90 s). While a wake is open the loop ticks every 0.5 s and starts Lumen each tick until it has stayed in front for SETTLE seconds, or WAKE seconds have passed.
# It only replaces LG's own screens (LG Home, Live TV, inputs: com.webos.* / com.lge.*). An app you opened yourself ends the wake instead (on 2026-11-09 it
# started 47 s into a boot and pushed Lumen over Netflix opened at 41 s).
APP=com.ammar027.lumen
FLAG=/var/lib/homehook/wake-open
WAKE=30
SETTLE=3
mkdir -p /var/lib/homehook; touch "$FLAG"
prev=""; since=0; tick=$(date +%s)
# a boot counts as a wake: the tool starts about 45 s into it, and Lumen should be what the TV shows (LG Home or the last input may come up first)
BOOT=90
until=$((tick + BOOT))
while [ -f "$FLAG" ]; do
  now=$(date +%s)
  state=$(luna-send -n 1 luna://com.webos.service.tvpower/power/getPowerState '{}' </dev/null 2>/dev/null | sed -n 's/.*"state": *"\([^"]*\)".*/\1/p')
  gap=$((now - tick)); tick=$now
  # a wake: the power state is back to Active from standby or off, or this loop missed its ticks (the TV was suspended)
  if { [ "$state" = Active ] && [ -n "$prev" ] && [ "$prev" != Active ] && [ "$prev" != "Screen Saver" ]; } || [ "$gap" -gt 10 ]; then until=$((now + WAKE)); since=0; fi
  prev=$state
  if [ "$now" -lt "$until" ] && [ "$state" = Active ]; then
    front=$(luna-send -n 1 luna://com.webos.applicationManager/getForegroundAppInfo '{}' </dev/null 2>/dev/null | sed -n 's/.*"appId": *"\([^"]*\)".*/\1/p')
    if [ "$front" = "$APP" ]; then
      [ "$since" -eq 0 ] && since=$now
      [ $((now - since)) -ge "$SETTLE" ] && until=0
    else
      since=0
      case "$front" in
        ""|com.webos.*|com.lge.*) luna-send -n 1 luna://com.webos.applicationManager/launch "{\"id\":\"$APP\"}" </dev/null >/dev/null 2>&1 & ;;
        *) until=0 ;;   # an app you opened: leave it
      esac
    fi
  fi
  if [ "$now" -lt "$until" ]; then sleep 0.5; else sleep 1; fi
done
