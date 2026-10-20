// What the status chips show: how the TV is connected, whether it is muted, whether a sleep timer is running.
// All three are read with calls a normal web app may make. Anything that fails simply shows no chip.

import {isWebOS, lunaCall} from './luna';

export interface TvStatus {
	network: 'wifi' | 'ethernet' | 'offline' | 'unknown';
	muted: boolean;
	sleep: boolean;
}

export function readStatus (): Promise<TvStatus> {
	const out: TvStatus = {network: 'wifi', muted: false, sleep: false};
	if (!isWebOS()) return Promise.resolve(out);
	out.network = 'unknown';
	const net = lunaCall<{wired?: {state?: string}; wifi?: {state?: string}}>('luna://com.webos.service.connectionmanager/getStatus', {}).then((r) => {
		out.network = r.wired && r.wired.state === 'connected' ? 'ethernet' : r.wifi && r.wifi.state === 'connected' ? 'wifi' : 'offline';
	}).catch(() => undefined);
	const audio = lunaCall<{muteStatus?: boolean}>('luna://com.webos.audio/getVolume', {}).then((r) => {
		out.muted = r.muteStatus === true;
	}).catch(() => undefined);
	const sleep = lunaCall<Record<string, unknown>>('luna://com.webos.service.tvReservationAgent/timer/sleep/getRemainTime', {}).then((r) => {
		out.sleep = Number(r.sleepTimeSecond) > 0;
	}).catch(() => undefined);
	return Promise.all([net, audio, sleep]).then(() => out);
}
