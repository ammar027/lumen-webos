# How the TV powers on, and what restarts do

Notes from [Sam Renfrew's fork](https://github.com/samrenfrew/lumen-webos) (MIT), written on his LG 43UT91006LA (webOS 25). They were not tested on the webOS 22 TV this project is built on, so treat them as hints for newer TVs. Mentions of `lib/root.ts` and `watch.sh` below are about his fork's code; this project's own opt-in wake tool is `tools/tv/wake-open.sh`.

## Power-on and the Local Control Panel (2026-10-24)
- The menu that came up after the compositor restart on 2026-10-23 is LG's Local Control Panel, `com.webos.app.tvhotkey` (native QML). It is not the service menu (`com.webos.app.factorywin`, EZ Adjust and InStart, which asks for a PIN). Launched with no `activateType`, it opens its main menu.
- Its toggles write ordinary settings. "Show LG logo when turning off the TV" is `other` / `lgLogoDisplay` (`"on"` or `"off"`); "Screen Saver" is another toggle in the same list (`Interfaces/CustomerSupportInterfaces/CustomerSupportInterfaces.qml`). Set as root with `settingsservice/setSystemSettings`. `lgLogoDisplay` was put back to `"on"`; it did not cause the Live TV problem below.
- Wake-on-LAN resumes the TV from Suspend straight into Live TV. LG Home never opens, so a wake rule that only replaced LG Home did nothing. `watch.sh` now opens Lumen over whatever is in front after any wake.
- Remote power-on with LG's "Home on power-on" (`general` / `homeAutoLaunch`) `"on"`: LG Home holds the screen for about 7 s, whatever is launched over it (about 9 s to Lumen). With it `"off"` (set 2026-10-24), nothing opens first and Lumen is in front about 5 s after the wake.
- `luna-send` over SSH prints nothing without `ssh -tt`, unless its stdin is redirected (`</dev/null`). It looks like a dead bus but is not.

## Reboot reason (2026-10-21)
`tvpower/power/reboot` with `{"reason":"restart"}` returns `Invalid reason, invalid param`, so the Control Center's Restart did nothing.
The accepted reasons are in `/etc/configd/layers/base/com.webos.service.tvpower.json` (`rebootReasons`): `rebootByARRegular`,
`rebootByFault`, `rebootByOnRegular`, `rebootByTimeout`, `quickStart`. `lib/root.ts` now sends `rebootByOnRegular`. Over SSH it returned `returnValue:true` and the TV rebooted, but about a minute after it came
back the TV was off and off the network (verify: whether this reason ends in standby, or `rebootByARRegular` is the right one).

Retest 2026-10-24: every `tvpower` reboot comes back in Active Standby. The log line is `NL_POWER_STATE {"old":"Init","new":"Active
Standby","PowerOnReason":"rebootByOnRegular"}`, the same from a TV that was on and one in standby. `rebootByARRegular` does the same (it is the
scheduled overnight reboot). `turnOnScreen` does not wake it ("The current sub state must be 'screen off'"). The shell's `reboot` comes back on
(see Keeping apps alive, below), so `lib/root.ts` now runs that, detached so the exec call returns before the TV goes down (verify).
