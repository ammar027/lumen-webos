// System actions the web app cannot do itself. They go through the Homebrew Channel's root service (the same path as the live app list),
// with fixed commands only.

import {LUNA} from '../config/constants';
import {isWebOS, lunaCall} from './luna';

/** Tells the TV-side watcher that the video wallpaper is on, so LG's screensaver is ended while Lumen is in front (a flag file, root via the Homebrew Channel). */
export function setVideoFlag (on: boolean): void {
	if (!isWebOS()) return;
	const command = on ? 'mkdir -p /tmp/lumen-trial && touch /tmp/lumen-trial/video' : 'rm -f /tmp/lumen-trial/video';
	lunaCall(LUNA.homebrewExec, {command}, 6000).catch(() => undefined);
}

/** Starts the TV's screensaver now (tvpower/turnOnScreenSaver is a system-only call, so it runs as root via the Homebrew Channel). */
export function startScreensaver (): Promise<void> {
	if (!isWebOS()) return Promise.reject(new Error('not on a TV'));
	return lunaCall(LUNA.homebrewExec, {command: "luna-send -n 1 luna://com.webos.service.tvpower/power/turnOnScreenSaver '{}'"}, 6000).then(() => undefined);
}
