// The user's choices: which apps and which inputs appear on the home rows, in order,
// plus options. Persisted in localStorage (private to this app on the TV).

import {STORAGE_KEY} from '../config/constants';
import trialSeed from '../config/trialSeed.json';
import {DEFAULT_APP_IDS} from '../config/catalog';

export interface UserConfig {
 recentMode: 'off' | 'unique' | 'all';
 lastInput: string;
 photoSeconds: number;
	/** ordered app IDs for the Apps row */
	appIds: string[];
	/** ordered input appIds (com.webos.app.hdmiN) for the Sources row; null → all inputs */
	sourceIds: string[] | null;
	/** read the live app list through the Homebrew Channel (root). Off by default. */
	useHomebrew: boolean;
	/** play Apple's aerial videos behind the home screen (streams from the internet). Off by default. */
	videoWallpaper: boolean;
	/** which still wallpaper: local:N (bundled), cloud:<id> (from the library), shuffle, or none */
	wallpaper: string;
	/** show AM/PM beside the time when the TV uses a 12-hour clock */
	showAmPm: boolean;
	/** menu language: 'auto' follows the TV, else a code from lib/i18n.ts */
	language: string;
	/** 'auto' follows the TV's 12/24-hour setting, else '12h' or '24h' */
	clockFormat: string;
	/** place the video wallpaper plays ('' = shuffle all) (the older single choice, now videoPlaces) */
	videoClip: string;
	/** the places the video wallpaper shuffles through; empty = every place */
	videoPlaces: string[];
	/** when the dock slides away: off | down | idle | both */
	dockHide: string;
	/** dark glass and a dimmer wallpaper */
	darkMode: string;
	/** the last apps opened, newest first */
	recentIds: string[];
	/** start the screensaver after this many idle minutes; 0 = never */
	idleMinutes: number;
	/** cloud wallpaper ids marked as favourites (hold OK in the picker) */
	favoriteWallpapers: string[];
	/** pick a new wallpaper every N minutes when a shuffle is chosen; 0 = never */
	wpAutoMinutes: number;
	/** dim the wallpaper between 19:00 and 06:00 */
	nightDim: boolean;
	/** offer the TV's own apps (Live TV, AirPlay ...) in Settings */
	showAllApps: boolean;
	/** date and weather beside the clock */
	showWeather: boolean;
	/** weather country (a code from config/cities.ts), '' = not chosen */
	weatherCountry: string;
	/** weather place: '' = from the internet connection, else a name from config/cities.ts */
	weatherCity: string;
	/** app folders: apps listed here are shown inside the folder, not on the rows */
	folders: {name: string; appIds: string[]}[];
	/** false on a fresh install until the installed apps have been put on the home screen once */
	seeded: boolean;
}

export const DEFAULT_CONFIG: UserConfig = {
 recentMode: 'off',
 lastInput: '',
	photoSeconds: 30,
 appIds: DEFAULT_APP_IDS.slice(),
	sourceIds: null,
	useHomebrew: true,
	videoWallpaper: false,
	wallpaper: 'local:0',
	showAmPm: true,
	language: 'auto',
	darkMode: 'on',
	dockHide: 'down',
	videoClip: '',
	videoPlaces: [],
	clockFormat: 'auto',
	recentIds: [],
	idleMinutes: 0,
	favoriteWallpapers: [],
	wpAutoMinutes: 0,
	nightDim: false,
	showAllApps: false,
	showWeather: true,
	weatherCountry: '',
	weatherCity: '',
	folders: [],
	seeded: false
};

export function loadConfig (): UserConfig {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {...DEFAULT_CONFIG, ...trialSeed};
		const parsed = JSON.parse(raw) as Partial<UserConfig>;
		return {
   recentMode: parsed.recentMode === 'unique' || parsed.recentMode === 'all' ? parsed.recentMode : 'off',
   lastInput: typeof parsed.lastInput === 'string' ? parsed.lastInput : '',
			photoSeconds: [15,30,60,120].indexOf(Number(parsed.photoSeconds)) >= 0 ? Number(parsed.photoSeconds) : 30,
   appIds: Array.isArray(parsed.appIds) ? parsed.appIds : DEFAULT_CONFIG.appIds,
			sourceIds: Array.isArray(parsed.sourceIds) ? parsed.sourceIds : null,
			useHomebrew: parsed.useHomebrew !== false,
			videoWallpaper: parsed.videoWallpaper === true,
			wallpaper: typeof parsed.wallpaper === 'string' ? parsed.wallpaper : DEFAULT_CONFIG.wallpaper,
			showAmPm: parsed.showAmPm !== false,
			dockHide: parsed.dockHide === 'off' || parsed.dockHide === 'idle' || parsed.dockHide === 'both' ? parsed.dockHide : 'down',
			darkMode: parsed.darkMode === 'auto' ? 'auto' : parsed.darkMode === 'off' ? 'off' : 'on',
			videoClip: typeof parsed.videoClip === 'string' ? parsed.videoClip : '',
			videoPlaces: Array.isArray(parsed.videoPlaces) ? parsed.videoPlaces : typeof parsed.videoClip === 'string' && parsed.videoClip ? [parsed.videoClip] : [],
			language: typeof parsed.language === 'string' ? parsed.language : 'auto',
			clockFormat: parsed.clockFormat === '12h' || parsed.clockFormat === '24h' ? parsed.clockFormat : 'auto',
			recentIds: Array.isArray(parsed.recentIds) ? parsed.recentIds : [],
			idleMinutes: typeof parsed.idleMinutes === 'number' ? parsed.idleMinutes : 0,
			favoriteWallpapers: Array.isArray(parsed.favoriteWallpapers) ? parsed.favoriteWallpapers : [],
			wpAutoMinutes: typeof parsed.wpAutoMinutes === 'number' ? parsed.wpAutoMinutes : 0,
			nightDim: parsed.nightDim === true,
			showAllApps: parsed.showAllApps === true,
			showWeather: parsed.showWeather !== false,
			weatherCountry: typeof parsed.weatherCountry === 'string' ? parsed.weatherCountry : '',
			weatherCity: typeof parsed.weatherCity === 'string' ? parsed.weatherCity : '',
			folders: Array.isArray(parsed.folders) ? parsed.folders : [],
			seeded: parsed.seeded !== false
		};
	} catch {
		return {...DEFAULT_CONFIG};
	}
}

export function saveConfig (config: UserConfig): void {
	try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); }
	catch { /* nothing sensible to do on a TV */ }
}

/** Toggle an ID in an ordered list: remove if present, else append. */
export function toggleId (ids: string[], id: string): string[] {
	return ids.indexOf(id) === -1 ? ids.concat(id) : ids.filter((x) => x !== id);
}
