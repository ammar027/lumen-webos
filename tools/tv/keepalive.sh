#!/bin/sh
# Optional: keep Lumen open in the background so Home opens it at once (idea and findings: Sam Renfrew's fork, MIT, docs/keep-alive.md there).
# Run on the TV as root:   ssh root@<tv> 'sh -s status' < tools/tv/keepalive.sh      (also: on, off)
#
# The memory manager (memchute) closes the app you were in whenever another opens. Two lists in the config service protect an app from that:
#   com.webos.memorymanager.KeepOnLaunchEx  a soft keep (the app survives other apps opening; memchute may still close it when it needs room)
#   com.webos.memorymanager.KeepAlive       a hard keep
# `on` adds Lumen to both lists. It only ever ADDS to a list the TV already has: if a list is missing (the TV keeps no list of its own
# under that name) it stops and changes nothing, since writing a list there could replace LG's built-in defaults. What it changes is saved in
# /var/lib/homehook/keepalive-before.json first, and the whole config database in /var/lib/homehook/configd_db.backup.json (kept once).
# The change takes effect after a reboot (memchute reads its policy when it starts). `off` puts the saved lists back.
# Costs memory: about 60 MB of usable memory while Lumen is in the background. On a TV with little free memory, think twice.

ID=com.ammar027.lumen
HOME_DIR=/var/lib/homehook
BEFORE=$HOME_DIR/keepalive-before.json
DB=/var/preferences/configd_db.json
SOFT=com.webos.memorymanager.KeepOnLaunchEx
HARD=com.webos.memorymanager.KeepAlive
CFG=luna://com.webos.service.config

get () { luna-send -n 1 -f $CFG/getConfigs "{\"configNames\":[\"$1\"]}" </dev/null; }

# the list under key $1 as JSON, or nothing when the TV has none
listof () { get "$1" | python3 -c 'import json,sys; j=json.load(sys.stdin); k=sys.argv[1]; print(json.dumps(j["configs"][k])) if k in j.get("configs",{}) else sys.exit(1)' "$1"; }

status () {
	for k in $SOFT $HARD; do
		if l=$(listof $k); then
			echo "$k: $l"
			echo "$l" | grep -q "\"$ID\"" && echo "   Lumen is on it" || echo "   Lumen is not on it"
		else
			echo "$k: not defined on this TV"
		fi
	done
}

setlist () { luna-send -n 1 -f $CFG/setConfigs "{\"configs\":{\"$1\":$2}}" </dev/null | grep -q '"returnValue": *true'; }

case "$1" in
	status) status ;;
	on)
		for k in $SOFT $HARD; do listof $k >/dev/null || { echo "Not changing anything: this TV has no $k list to add Lumen to (run 'status')."; exit 2; }; done
		mkdir -p $HOME_DIR
		[ -f $HOME_DIR/configd_db.backup.json ] || cp $DB $HOME_DIR/configd_db.backup.json
		soft=$(listof $SOFT); hard=$(listof $HARD)
		[ -f $BEFORE ] || printf '{"%s": %s, "%s": %s}\n' $SOFT "$soft" $HARD "$hard" > $BEFORE
		add () { python3 -c 'import json,sys; l=json.loads(sys.argv[1]); i=sys.argv[2]; print(json.dumps(l if i in l else l+[i]))' "$1" "$ID"; }
		setlist $SOFT "$(add "$soft")" || { echo "the config service refused $SOFT"; exit 1; }
		setlist $HARD "$(add "$hard")" || { echo "the config service refused $HARD"; exit 1; }
		echo "Lumen added to both lists. Reboot the TV for it to take effect."
		status
		;;
	off)
		[ -f $BEFORE ] || { echo "Nothing saved to put back ($BEFORE)."; exit 1; }
		for k in $SOFT $HARD; do
			list=$(python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1])).get(sys.argv[2], [])))' $BEFORE $k)
			setlist $k "$list" || echo "could not restore $k"
		done
		echo "Lists put back. Reboot the TV for it to take effect."
		status
		;;
	*) echo "usage: keepalive.sh status|on|off"; exit 1 ;;
esac
