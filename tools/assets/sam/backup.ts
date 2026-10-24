// A copy of the settings on the TV, /var/lib/homehook/lumen-config.json (from the fork's lib/backup.ts, MIT). Settings live in localStorage, which is per app id, so a reinstall under another id starts empty.
// The copy is written a few seconds after each change; Settings > System > Restore settings from the TV puts it back.

import {isWebOS} from './luna';
import {readFile, writeFile} from './root';

const FILE = 'lumen-config.json';
const DELAY_MS = 3000;
let timer = 0;

/** Write the backup a few seconds after the last change (changes come in bursts while re-ordering). */
export function scheduleBackup (config: unknown): void {
	if (!isWebOS()) return;
	window.clearTimeout(timer);
	timer = window.setTimeout(() => { writeFile(FILE, JSON.stringify({version: 1, config}, null, 1)).catch(() => undefined); }, DELAY_MS);
}

/** The backed-up settings, or null when there is no backup (or it cannot be read). */
export function readBackup (): Promise<unknown | null> {
	if (!isWebOS()) return Promise.resolve(null);
	return readFile(FILE).then((text) => {
		if (!text) return null;
		const data = JSON.parse(text) as {config?: unknown};
		return data && data.config ? data.config : null;
	}).catch(() => null);
}
