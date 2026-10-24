// The apps the TV has open (for the dot above a tile). The app manager's running list is not offered to apps, so it is read as root through the Homebrew Channel.
import {LUNA} from '../config/constants';
import {lunaCall} from './luna';

const APP_ID = /^[A-Za-z0-9._-]+$/;

export function runningApps (): Promise<string[]> {
	return lunaCall<{stdoutString?: string}>(LUNA.homebrewExec, {command: "luna-send -n 1 luna://com.webos.applicationManager/running '{}'"}, 8000).then((r) => {
		const ids = (JSON.parse(r.stdoutString || '{}').running || []) as {id?: string}[];
		return ids.map((a) => a.id || '').filter((id) => APP_ID.test(id));
	});
}
