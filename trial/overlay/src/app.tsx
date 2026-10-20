import {useCallback, useEffect, useMemo, useRef, useState} from 'preact/hooks';
import {Home, type HomeRow} from './screens/Home';
import {Settings, type SettingsTab, type WallpaperTab} from './screens/Settings';
import type {WallpaperEntry} from './components/WallpaperPicker';
import type {OptionItem} from './components/OptionList';
import {Toast, type ToastMessage} from './components/Toast';
import type {TileModel} from './components/Tile';
import {listApps, seedAppIds, type AppEntry} from './lib/apps';
import {listInputs, MOCK_INPUTS, type InputSource} from './lib/inputs';
import {launchApp, launchLgHome} from './lib/launch';
import {isWebOS} from './lib/luna';
import {hidePointerOnForeground} from './lib/pointer';
import {DEFAULT_CONFIG, loadConfig, saveConfig, toggleId, type UserConfig} from './lib/storage';
import {appTile, inputTile, pickInOrder} from './lib/tiles';
import {TIMING} from './config/constants';
import {LOCAL_WALLPAPERS, WALLPAPERS, WALLPAPER_CATEGORIES, cloudUrl} from './config/wallpapers';
import {resized, setFavorites, setWallpaper} from './lib/wallpaper';
import {setVideoChoice, setVideoPaused, setVideoWallpaper, VIDEO_PLACES} from './lib/wallpaperVideo';
import {PhotoFrame} from './components/PhotoFrame';
import {GRADIENTS, isScenic, photoSource, refreshPhotos} from './lib/photos';
import {useTrialIdle} from './hooks/useTrialIdle';
import {ControlCenter, type CenterAction} from './components/ControlCenter';
import {InputsPanel} from './components/InputsPanel';
import {ChoiceList} from './components/Surface';
import {restartTv} from './lib/tvcontrols';
import {readStatus} from './lib/status';
import {CITIES, COUNTRIES} from './config/cities';
import {readWeather} from './lib/weather';
import {isDark, LANGS, nextDark, setClockMode, setLang, t as tr} from './lib/i18n';

type Screen = 'home' | 'settings';

const ROW = {apps: 'apps', sources: 'sources', misc: 'misc', dock: 'dock', recent: 'recent'} as const;
const MISC = {lgHome: 'lg-home', settings: 'settings'} as const;
const OPTION = {useHomebrew: 'use-homebrew', videoWallpaper: 'video-wallpaper', videoClip: 'video-clip', dockHide: 'dock-hide', showAmPm: 'show-ampm', showAll: 'show-all-apps', weather: 'show-weather', city: 'weather-city', country: 'weather-country', idle: 'idle-screensaver', wpAuto: 'wp-auto', nightDim: 'night-dim', darkMode: 'dark-mode', language: 'language', clock: 'clock-format'} as const;
const WP_AUTO_CHOICES = [0, 15, 30, 60, 180, 1440];
const IDLE_CHOICES = [0, 5, 10, 15, 30];
const RECENT_MAX = 8;

/** The top bar: the Inputs button, and the time pill that opens the menu below. */
const TOP_ITEMS: TileModel[] = [
	{key: 'inputs', label: 'Inputs', glyph: 'inputs'},
	{key: 'controls', label: 'Control Center', glyph: 'sliders'}
];
/** What the time pill's menu lists. */
const MENU_ITEMS: TileModel[] = [
	{key: 'controls', label: 'Quick Controls', glyph: 'sliders'},
	{key: MISC.lgHome, label: 'LG Home', glyph: 'house'},
	{key: MISC.settings, label: 'Settings', glyph: 'gear'},
	{key: 'screensaver', label: 'Start Screensaver', glyph: 'screensaver'}
];

/** The first row (in the glass shelf) holds this many apps; the rest go in a plain row below, like the tvOS home screen. */
const FIRST_ROW = 5;

export function App () {
	const [screen, setScreen] = useState<Screen>(import.meta.env.DEV && /[?&]settings/.test(location.search) ? 'settings' : 'home');
	const [config, setConfig] = useState<UserConfig>(loadConfig);
	// set before anything renders, so every label below reads the chosen language and clock
	setLang(config.language);
	setClockMode(config.clockFormat);
	const [apps, setApps] = useState<AppEntry[]>([]);
 const [appsLoading,setAppsLoading] = useState(true);
	const [inputs, setInputs] = useState<InputSource[]>([]);
	const [toast, setToast] = useState<ToastMessage | null>(null);
	const [controls, setControls] = useState(false);
 const [inputsOpen,setInputsOpen] = useState(false);
 const [inputsReturn,setInputsReturn] = useState(false);
 const [controlFocusInputs,setControlFocusInputs] = useState(false);
 const [network,setNetwork] = useState('');
 const [restartConfirm,setRestartConfirm] = useState(false);
 const [restartBusy,setRestartBusy] = useState(false);
 const [photoFrame, setPhotoFrame] = useState(false);
	const configRef = useRef(config);
	configRef.current = config;
	const toastTimer = useRef(0);

	const showToast = useCallback((text: string, kind: ToastMessage['kind'] = 'info') => {
		window.clearTimeout(toastTimer.current);
		setToast({text, kind});
		toastTimer.current = window.setTimeout(() => setToast(null), TIMING.toastMs);
	}, []);

	// Magic Remote scroll wheel = Up/Down (rows on the home screen, lists and grids elsewhere)
	useEffect(() => {
		let last = 0;
		const onWheel = (e: WheelEvent) => {
			const now = Date.now();
			if (now - last < 220 || Math.abs(e.deltaY) < 4) return;
			last = now;
			const code = e.deltaY > 0 ? 40 : 38;
			window.dispatchEvent(new KeyboardEvent('keydown', {keyCode: code, which: code, bubbles: true}));
		};
		window.addEventListener('wheel', onWheel, {passive: true});
		return () => window.removeEventListener('wheel', onWheel);
	}, []);

	// Start in remote (5-way) mode: hide the Magic Remote pointer whenever we come to the
	// front. Shaking the remote still brings it back.
	useEffect(() => hidePointerOnForeground(), []);

	// Load apps at start and whenever the Homebrew option changes; refresh inputs whenever
	// the app comes back to the foreground (labels or connections may have changed).
	useEffect(() => {
  setAppsLoading(true);
		listApps(config.useHomebrew, config.showAllApps)
			.then(({apps: list, source}) => {
				setApps(list);
				if (config.useHomebrew && source !== 'homebrew') showToast('Homebrew Channel not available, using the built-in app list', 'error');
			})
			.catch(() => showToast('Could not read the app list', 'error')).finally(() => setAppsLoading(false));
	}, [config.useHomebrew, config.showAllApps, showToast]);

	useEffect(() => {
		const refresh = () => {
			if (!isWebOS()) { setInputs(MOCK_INPUTS); return; }
			listInputs().then(setInputs).catch(() => showToast('Could not read the inputs', 'error'));
		};
		refresh();
		const onVisibility = () => { if (!document.hidden) refresh(); };
		document.addEventListener('visibilitychange', onVisibility);
		return () => document.removeEventListener('visibilitychange', onVisibility);
	}, [showToast]);

	useEffect(() => {
  const apply = () => { setFavorites(config.favoriteWallpapers); setWallpaper(config.wallpaper,config.wpAutoMinutes); };
  apply(); window.addEventListener('trial-photos-updated',apply);
  return () => window.removeEventListener('trial-photos-updated',apply);
 }, [config.wallpaper, config.wpAutoMinutes, config.favoriteWallpapers]);
 useEffect(() => {
  const load = () => { if (!document.hidden) refreshPhotos(photoSource(config.wallpaper)).catch(() => undefined); };
  const timer = window.setTimeout(load,1800);
  const daily = window.setInterval(load,3600000);
  document.addEventListener('visibilitychange',load);
  return () => { window.clearTimeout(timer); window.clearInterval(daily); document.removeEventListener('visibilitychange',load); };
 },[config.wallpaper]);
 useTrialIdle(config.idleMinutes,photoFrame,() => setPhotoFrame(true),() => setPhotoFrame(false));
	useEffect(() => setFavorites(config.favoriteWallpapers), [config.favoriteWallpapers]);

	// the weather line in the time-pill menu
	const [weatherText, setWeatherText] = useState('');
	useEffect(() => {
		if (!config.showWeather) { setWeatherText(''); return; }
		const city = CITIES.filter((c) => c.name === config.weatherCity)[0] || null;
		const load = () => readWeather(city)
			.then((w) => setWeatherText(`${w.place ? w.place + ' \u00b7 ' : ''}${w.temp}\u00b0 ${tr(w.label)}`.trim()))
			.catch(() => setWeatherText(''));
		load();
		const id = window.setInterval(load, 30 * 60000);
		return () => window.clearInterval(id);
	}, [config.showWeather, config.weatherCity, config.language]);

	// a new wallpaper every N minutes (only when a shuffle is chosen)
	useEffect(() => {
		if (!config.wpAutoMinutes || (!isScenic(config.wallpaper) && config.wallpaper.indexOf('shuffle') !== 0)) return;
		const id = window.setInterval(() => { if (!document.hidden) setWallpaper(config.wallpaper,config.wpAutoMinutes); }, config.wpAutoMinutes * 60000);
		return () => window.clearInterval(id);
	}, [config.wpAutoMinutes, config.wallpaper]);

	// night: a dimmer wallpaper between 19:00 and 06:00
	useEffect(() => {
		const apply = () => { const h = new Date().getHours(); document.documentElement.classList.toggle('night', config.nightDim && (h >= 19 || h < 6)); };
		apply();
		const id = window.setInterval(apply, 60000);
		return () => { window.clearInterval(id); document.documentElement.classList.remove('night'); };
	}, [config.nightDim]);
	useEffect(() => {
		const apply = () => { const dark = isDark(config.darkMode); document.documentElement.classList.toggle('dark', dark); document.documentElement.classList.toggle('light', !dark); };
		apply();
		const id = window.setInterval(apply, 60000);
		return () => window.clearInterval(id);
	}, [config.darkMode]);
	useEffect(() => setVideoChoice(config.videoPlaces), [config.videoPlaces]);
	useEffect(() => { setVideoWallpaper(config.videoWallpaper && !photoFrame); }, [config.videoWallpaper, photoFrame]);
	useEffect(() => { setVideoPaused(screen === 'settings' || photoFrame); document.documentElement.classList.toggle('in-settings', screen === 'settings'); }, [screen, photoFrame]);

	const updateConfig = (next: UserConfig) => { configRef.current = next; setConfig(next); saveConfig(next); };
 useEffect(() => {
  if(!controls)return;
  let alive=true;
  readStatus().then(s => {if(alive)setNetwork(s.network === 'wifi' ? 'Wi-Fi' : s.network === 'ethernet' ? 'Ethernet' : s.network === 'offline' ? 'Offline' : '');});
  return ()=>{alive=false;};
 },[controls]);

	// first run: put the installed apps on the home screen (the catalogue's favourites first)
	useEffect(() => {
		const c = configRef.current;
		if (c.seeded || apps.length === 0) return;
		updateConfig({...c, seeded: true, appIds: seedAppIds(apps, DEFAULT_CONFIG.appIds)});
	}, [apps]);


	// ----- derived rows -----
	const shownApps = useMemo(() => pickInOrder(apps, config.appIds, (a) => a.id), [apps, config.appIds]);
	const shownInputs = useMemo(
		() => (config.sourceIds ? pickInOrder(inputs, config.sourceIds, (s) => s.appId) : inputs),
		[inputs, config.sourceIds]
	);

	const recentApps = useMemo(() => pickInOrder(apps, config.recentIds, (a) => a.id), [apps, config.recentIds]);

	const folderTiles = useMemo(
		() => config.folders.map((f) => ({name: f.name, items: pickInOrder(apps, f.appIds, (a) => a.id).map(appTile)})).filter((f) => f.items.length > 0),
		[apps, config.folders]
	);
	const folderMap = useMemo(() => {
		const map: Record<string, TileModel[]> = {};
		folderTiles.forEach((f) => { map[f.name] = f.items; });
		return map;
	}, [folderTiles]);
	/** what the home rows show: the apps that are not in a folder, then one tile per folder */
	const homeTiles = useMemo(() => {
		const inFolder = config.folders.reduce((all, f) => all.concat(f.appIds), [] as string[]);
		return shownApps.filter((a) => inFolder.indexOf(a.id) === -1).map(appTile)
			.concat(folderTiles.map((f): TileModel => ({key: 'folder:' + f.name, label: f.name, color: '#3b4256', children: f.items.map((t) => t.imageUrl)})));
	}, [shownApps, folderTiles, config.folders]);

	const rows: HomeRow[] = useMemo(() => [
		{id: ROW.apps, label: 'Apps', items: homeTiles.slice(0, FIRST_ROW), emptyText: appsLoading ? 'Loading your apps…' : 'No apps selected — add some in Settings'},
		...Array.from({length: Math.ceil(Math.max(0, homeTiles.length - FIRST_ROW) / FIRST_ROW)}, (_, i) => ({id: ROW.dock + '-' + i, label: 'Apps', items: homeTiles.slice((i + 1) * FIRST_ROW, (i + 2) * FIRST_ROW)})),
		...(config.recentMode !== 'off' && recentApps.some(a => config.recentMode === 'all' || config.appIds.indexOf(a.id) === -1) ? [{id: ROW.recent, label: 'Recent', items: recentApps.filter(a => config.recentMode === 'all' || config.appIds.indexOf(a.id) === -1).slice(0, 5).map(appTile)}] : [])
	], [homeTiles, recentApps, config.recentMode, config.appIds, config.language, appsLoading]);

	const tabs: SettingsTab[] = useMemo(() => [
		{id: ROW.apps, label: 'Apps', noun: 'apps', items: apps.map(appTile), shown: shownApps.map(appTile)},
		{id: ROW.sources, label: 'Sources', noun: 'sources', items: inputs.map(inputTile), shown: shownInputs.map(inputTile)}
	], [apps, inputs, shownApps, shownInputs, config.language]);

	const options: OptionItem[] = useMemo(() => [
  {id:'recent-mode',label:'Recent apps',description:'Keep the app grid quiet, show only apps not already on Home, or show all recently opened apps.',value:config.recentMode !== 'off',valueText:config.recentMode === 'off' ? 'Off' : config.recentMode === 'unique' ? 'Not on Home' : 'All recent'},
		{
			id: OPTION.useHomebrew,
			label: 'Live app list via Homebrew Channel',
			description: 'Rooted TVs only. Lists every installed app with its real icon, using the Homebrew Channel, which runs commands as root. When off, the built-in app catalogue is used.',
			value: config.useHomebrew
		},
		{
			id: OPTION.showAll,
			label: 'Show system apps',
			description: 'Offer the TV\'s own apps (Live TV, LG Channels, AirPlay, Screen Share, Game Optimizer, TV Settings) in Settings > Apps, so you can add them to the home screen.',
			value: config.showAllApps
		},
		{
			id: OPTION.weather,
			label: 'Date and weather',
			description: 'Show today\'s date and the temperature at the top left of the home screen. The weather comes from open-meteo.com.',
			value: config.showWeather
		},
		{
			id: OPTION.country,
			label: 'Weather country',
			description: 'Pick your country, then the city below. Auto finds your area from your internet connection (ipwho.is), which can be a few towns off.',
			value: config.weatherCountry !== '',
			valueText: (COUNTRIES.filter((c) => c.code === config.weatherCountry)[0] || {name: 'Auto'}).name
		},
		{
			id: OPTION.city,
			label: 'Weather city',
			description: 'Auto finds your area from your internet connection (ipwho.is). OK steps through a list of cities if Auto guesses wrong.',
			value: config.weatherCity !== '',
			valueText: config.weatherCity || 'Auto'
		},
  {id: 'photo-duration', label: 'Photo frame duration', description: 'How long each photo stays on screen. Gentle pan and zoom and crossfades are automatic.', value: true, valueText: `${config.photoSeconds} seconds`},
  {id: OPTION.idle, label: 'Photo frame after idle', description: 'Start after inactivity within Lumen Trial. Other apps and HDMI retain their own screensaver behavior.', value: config.idleMinutes > 0, valueText: config.idleMinutes ? `${config.idleMinutes} min` : 'Off'},
  {id: 'photo-refresh', label: 'Refresh photos now', description: 'Download new scenic or SFW anime photos. Keep the last good offline collection if the network is unavailable.', value: false, valueText: 'Refresh'},
  {id: 'photo-start', label: 'Start photo frame now', description: 'Show the photo collection full screen. Press Back or an arrow to return.', value: false, valueText: 'Start'},
		{
			id: OPTION.wpAuto,
			label: 'Change wallpaper automatically',
			description: 'Rotate scenic or shuffled photos every 15, 30 or 60 minutes, 3 hours, or daily.',
			value: config.wpAutoMinutes > 0,
			valueText: config.wpAutoMinutes ? `${config.wpAutoMinutes} min` : 'Off'
		},
		{
			id: OPTION.nightDim,
			label: 'Dim the wallpaper at night',
			description: 'Between 7 pm and 6 am the wallpaper is darker, easier on the eyes in a dark room.',
			value: config.nightDim
		},
		{
			id: OPTION.dockHide,
			label: 'Hide the dock',
			description: 'Optionally hide the dock after 8 seconds. Down always navigates the app grid. Any key restores a hidden dock.',
			value: config.dockHide !== 'off',
			valueText: config.dockHide === 'down' ? 'Down arrow' : config.dockHide === 'idle' ? 'After idle' : config.dockHide === 'both' ? 'Both' : 'Off'
		},
		{
			id: OPTION.darkMode,
			label: 'Appearance',
			description: 'Light: bright glass with dark text. Dark: dark glass and a dimmer wallpaper or video. Auto is dark from 7 pm to 6 am.',
			value: config.darkMode !== 'off',
			valueText: config.darkMode === 'on' ? 'Dark' : config.darkMode === 'auto' ? 'Auto' : 'Light'
		},
		{
			id: OPTION.language,
			label: 'Language',
			description: "Language of the menus, dates and weather. Auto follows the TV. The long descriptions on this screen stay in English.",
			value: config.language !== 'auto',
			valueText: config.language === 'auto' ? 'Auto' : (LANGS.filter((l) => l.code === config.language)[0] || LANGS[0]).name
		},
		{
			id: OPTION.clock,
			label: 'Clock',
			description: "Auto follows the TV's own 12/24-hour setting. Choose 12-hour or 24-hour to override it.",
			value: config.clockFormat !== 'auto',
			valueText: config.clockFormat === '12h' ? '12-hour' : config.clockFormat === '24h' ? '24-hour' : 'Auto'
		},
		{
			id: OPTION.showAmPm,
			label: 'AM/PM on the clock',
			description: 'Show AM or PM beside the time when the TV is set to a 12-hour clock.',
			value: config.showAmPm
		},
  {id:'restart-tv',label:'Restart TV',description:'Restart the television. A confirmation opens before anything changes.',value:false,valueText:'Open'}
	], [config.recentMode, config.photoSeconds, config.weatherCountry, config.dockHide, config.videoPlaces, config.videoClip, config.darkMode, config.language, config.clockFormat, config.useHomebrew, config.videoWallpaper, config.showAmPm, config.idleMinutes, config.wpAutoMinutes, config.nightDim, config.showAllApps, config.showWeather, config.weatherCity]);

	const wallpaper: WallpaperTab = useMemo(() => {
		const entries: WallpaperEntry[] = [
			{key: 'shuffle', title: 'Shuffle (a new one each time)', category: 'Defaults'},
			{key: 'none', title: 'Plain background', category: 'Defaults'}
		];
  entries.unshift({key:'tigris:daily',title:'Scenic photos · Bing',category:'Tigris'}, {key:'tigris:anime',title:'Anime · SFW',category:'Tigris'});
  Object.keys(GRADIENTS).forEach((name) => entries.push({key:'gradient:' + name,title:name.charAt(0).toUpperCase()+name.slice(1),category:'Tigris',tint:GRADIENTS[name]}));
		LOCAL_WALLPAPERS.forEach((w, i) => entries.push({key: `local:${i}`, title: w.title, category: 'Defaults', thumb: w.file}));
		WALLPAPER_CATEGORIES.forEach((c) => entries.push({key: `shuffle:${c}`, title: `Shuffle ${c}`, category: c}));
		entries.push({key: 'shuffle:Favorites', title: 'Shuffle my favorites', category: 'Favorites'});
		WALLPAPERS.forEach((w) => {
			const fav = config.favoriteWallpapers.indexOf(w.id) !== -1;
			const e = {key: `cloud:${w.id}`, title: w.title, category: w.category, thumb: resized(cloudUrl(w), 360), fav};
			entries.push(e);
			if (fav) entries.push({...e, category: 'Favorites'});
		});
		const tint = (i: number) => `linear-gradient(150deg, ${["#e9a15b,#6d3d4a", "#d8b46a,#3e5a78", "#9fc2d6,#2d4a6b", "#7fc79a,#1e4a52", "#e07f8a,#4a2d5e", "#c9a0dc,#2f2f6b", "#f0c16a,#8a4a2a", "#8ab0e0,#1d2f5a", "#d6a07a,#4a3430", "#86c5c0,#27495a"][i % 10]})`;
		entries.push({key: 'video:', title: 'Shuffle all places', category: 'Video', tint: tint(0), on: config.videoWallpaper && config.videoPlaces.length === 0});
		VIDEO_PLACES.forEach((p, i) => entries.push({key: `video:${p}`, title: p, category: 'Video', tint: tint(i + 1), on: config.videoWallpaper && config.videoPlaces.indexOf(p) >= 0}));
		return {
			categories: ['Tigris', 'Defaults', 'Favorites', 'Video'].concat(WALLPAPER_CATEGORIES, 'All'),
			entries,
			current: config.videoWallpaper ? 'video' : config.wallpaper,
			onPick: (key: string) => updateConfig(key.indexOf('video:') === 0 ? {...config, videoWallpaper: true, videoPlaces: key === 'video:' ? [] : config.videoPlaces.indexOf(key.slice(6)) >= 0 ? config.videoPlaces.filter((x) => x !== key.slice(6)) : config.videoPlaces.concat(key.slice(6))} : {...config, wallpaper: key, videoWallpaper: false}),
			onFavorite: (key: string) => {
				if (key.indexOf('cloud:') !== 0) return;
				const id = key.slice(6);
				const has = config.favoriteWallpapers.indexOf(id) !== -1;
				updateConfig({...config, favoriteWallpapers: has ? config.favoriteWallpapers.filter((x) => x !== id) : config.favoriteWallpapers.concat(id)});
				showToast(has ? 'Removed from Favorites' : 'Added to Favorites');
			}
		};
	}, [config]);

	// ----- actions -----
	const open = (id: string, label: string) => {
		launchApp(id).catch(() => showToast(`Couldn't open ${label}`, 'error'));
	};

	const onActivate = useCallback((_rowId: string, item: TileModel) => {
		if (item.key === MISC.settings) { setScreen('settings'); return; }
		if (item.key === 'screensaver') { setControls(false); setPhotoFrame(true); return; }
		if (item.key === MISC.lgHome) { launchLgHome().catch(() => showToast("Couldn't open LG Home", 'error')); return; }
		if (item.key === 'controls') { setControlFocusInputs(false); setControls(true); return; }
  if (item.key === 'inputs') {setInputsReturn(false);setInputsOpen(true);return;}
		if (_rowId === ROW.apps || _rowId.indexOf(ROW.dock) === 0 || _rowId === ROW.recent || _rowId === 'folder') {
			const c = configRef.current;
			updateConfig({...c, recentIds: [item.key].concat(c.recentIds.filter((x) => x !== item.key)).slice(0, RECENT_MAX)});
		}
		open(item.key, item.label);
	}, [showToast]);

	/** hold OK on an app: move it one place along the home rows, or take it off the home screen */
	const onEdit = useCallback((action: 'move' | 'remove' | 'folder-add' | 'folder-out', _rowId: string, key: string, arg: number | string = 0) => {
		const c = configRef.current;
		const strip = (folders: UserConfig['folders']) => folders.map((f) => ({...f, appIds: f.appIds.filter((id) => id !== key)}));
		if (action === 'folder-add') {
			const folders = strip(c.folders);
			const target = folders.filter((f) => f.name === String(arg))[0];
			if (target) target.appIds.push(key); else folders.push({name: String(arg), appIds: [key]});
			updateConfig({...c, folders: folders.filter((f) => f.appIds.length > 0)});
			return;
		}
		if (action === 'folder-out') { updateConfig({...c, folders: strip(c.folders).filter((f) => f.appIds.length > 0)}); return; }
		const inFolder = c.folders.reduce((all, f) => all.concat(f.appIds), [] as string[]);
		const ids = c.appIds.filter((id) => apps.some((a) => a.id === id) && inFolder.indexOf(id) === -1);   // what the rows show, in order
		const kept = c.appIds.filter((id) => ids.indexOf(id) === -1);                                          // apps in folders keep their place
		const at = ids.indexOf(key);
		if (at < 0) return;
		if (action === 'remove') { updateConfig({...c, appIds: ids.filter((id) => id !== key).concat(kept)}); return; }
		const to = at + Number(arg);
		if (to < 0 || to >= ids.length) return;
		const next = ids.slice();
		next.splice(at, 1);
		next.splice(to, 0, key);
		updateConfig({...c, appIds: next.concat(kept)});
	}, [apps]);

	const onToggle = useCallback((tabId: string, key: string) => {
		if (tabId === ROW.apps) {
			updateConfig({...config, appIds: toggleId(config.appIds, key)});
		} else {
			const current = config.sourceIds || inputs.map((s) => s.appId);
			updateConfig({...config, sourceIds: toggleId(current, key)});
		}
	}, [config, inputs]);

	const onOption = useCallback((optionId: string) => {
  if(optionId === 'recent-mode') {const modes:UserConfig['recentMode'][]=['off','unique','all'];updateConfig({...config,recentMode:modes[(modes.indexOf(config.recentMode)+1)%modes.length]});}
  else if(optionId === 'restart-tv')setRestartConfirm(true);
		else if (optionId === 'photo-duration') { const choices = [15,30,60,120]; updateConfig({...config,photoSeconds:choices[(choices.indexOf(config.photoSeconds)+1)%choices.length]}); }
  else if (optionId === 'photo-refresh') { showToast('Refreshing photos…'); refreshPhotos(photoSource(config.wallpaper),true).then(() => showToast('Photo collection updated')).catch((e) => showToast(e.message,'error')); }
  else if (optionId === 'photo-start') { setScreen('home'); setPhotoFrame(true); }
  else if (optionId === OPTION.useHomebrew) updateConfig({...config, useHomebrew: !config.useHomebrew});
		else if (optionId === OPTION.videoWallpaper) updateConfig({...config, videoWallpaper: !config.videoWallpaper});
		else if (optionId === OPTION.videoClip) {
			const names = [''].concat(VIDEO_PLACES);
			updateConfig({...config, videoClip: names[(names.indexOf(config.videoClip) + 1) % names.length]});
		} else if (optionId === OPTION.country) {
			const codes = [''].concat(COUNTRIES.map((c) => c.code));
			const next = codes[(codes.indexOf(config.weatherCountry) + 1) % codes.length];
			const first = COUNTRIES.filter((c) => c.code === next)[0];
			updateConfig({...config, weatherCountry: next, weatherCity: first ? first.cities[0].name : ''});
		} else if (optionId === OPTION.dockHide) {
			const modes = ['off', 'idle'];
			updateConfig({...config, dockHide: modes[(modes.indexOf(config.dockHide) + 1) % modes.length]});
		} else if (optionId === OPTION.darkMode) updateConfig({...config, darkMode: nextDark(config.darkMode)});
		else if (optionId === OPTION.language) {
			const codes = ['auto'].concat(LANGS.map((l) => l.code));
			updateConfig({...config, language: codes[(codes.indexOf(config.language) + 1) % codes.length]});
		} else if (optionId === OPTION.clock) {
			const modes = ['auto', '12h', '24h'];
			updateConfig({...config, clockFormat: modes[(modes.indexOf(config.clockFormat) + 1) % modes.length]});
		} else if (optionId === OPTION.showAmPm) updateConfig({...config, showAmPm: !config.showAmPm});
		else if (optionId === OPTION.showAll) updateConfig({...config, showAllApps: !config.showAllApps});
		else if (optionId === OPTION.weather) updateConfig({...config, showWeather: !config.showWeather});
		else if (optionId === OPTION.city) {
			const country = COUNTRIES.filter((c) => c.code === config.weatherCountry)[0];
			const names = [''].concat((country ? country.cities : CITIES).map((c) => c.name));
			const next = names[(names.indexOf(config.weatherCity) + 1) % names.length];
			const owner = COUNTRIES.filter((c) => c.cities.some((x) => x.name === next))[0];
			updateConfig({...config, weatherCity: next, weatherCountry: country ? country.code : owner ? owner.code : ''});
		}
		else if (optionId === OPTION.nightDim) updateConfig({...config, nightDim: !config.nightDim});
		else if (optionId === OPTION.wpAuto) updateConfig({...config, wpAutoMinutes: WP_AUTO_CHOICES[(WP_AUTO_CHOICES.indexOf(config.wpAutoMinutes) + 1) % WP_AUTO_CHOICES.length]});
		else if (optionId === OPTION.idle) updateConfig({...config, idleMinutes: IDLE_CHOICES[(IDLE_CHOICES.indexOf(config.idleMinutes) + 1) % IDLE_CHOICES.length]});
	}, [config]);

	/** Replace a row's order with `keys` (the full list of what's shown). */
	const onReorder = useCallback((tabId: string, keys: string[]) => {
		if (tabId === ROW.apps) updateConfig({...config, appIds: keys});
		else updateConfig({...config, sourceIds: keys});
	}, [config]);

	return (
		<>
			{/* Home stays mounted under Settings so it keeps its focus position. */}
			<Home rows={rows} topItems={TOP_ITEMS} menuItems={MENU_ITEMS} active={screen === 'home' && !controls && !inputsOpen && !photoFrame && !restartConfirm} onActivate={onActivate} showPeriod={config.showAmPm} onEdit={onEdit} folders={folderMap} weatherText={weatherText} dockHide={config.dockHide} />
			{screen === 'settings' && <Settings tabs={tabs} wallpaper={wallpaper} options={options} active={!restartConfirm} onToggle={onToggle} onReorder={onReorder} onOption={onOption} onClose={() => setScreen('home')} />}
			{controls && <ControlCenter
    idleMinutes={config.idleMinutes} inputCount={shownInputs.length} network={network} focusInputs={controlFocusInputs}
    onIdleMinutes={(minutes) => {if(IDLE_CHOICES.indexOf(minutes)!==-1)updateConfig({...configRef.current,idleMinutes:minutes});}}
				onClose={() => setControls(false)}
				onError={(text) => showToast(text, 'error')}
				onAction={(a: CenterAction) => {
     setControls(false);
     if(a === 'inputs'){setInputsReturn(true);setInputsOpen(true);return;}
     onActivate('menu',a === 'settings' ? {key:MISC.settings,label:'Settings'} : a === 'lg-home' ? {key:MISC.lgHome,label:'LG Home'} : {key:'screensaver',label:'Photo frame'});
    }}
			/>}
   {inputsOpen && <InputsPanel inputs={shownInputs} sourceIds={config.sourceIds} lastInput={config.lastInput}
    onLastInput={(id)=>updateConfig({...configRef.current,lastInput:id})}
    onClose={()=>{setInputsOpen(false);if(inputsReturn){setControlFocusInputs(true);setControls(true);}}}
    onError={(text)=>showToast(text,'error')}/>}
   {restartConfirm && <ChoiceList title="Restart TV?" choices={[{id:'cancel',label:'Cancel'},{id:'restart',label:'Restart now',detail:'The TV will turn off and start again'}]} initialId="cancel" busy={restartBusy}
    onBack={()=>{if(!restartBusy)setRestartConfirm(false);}}
    onChoose={async id=>{if(id==='cancel'){setRestartConfirm(false);return;}setRestartBusy(true);try{await restartTv();}catch{showToast("Couldn't restart the TV",'error');setRestartBusy(false);setRestartConfirm(false);}}}/>}
			<Toast message={toast} />
   {photoFrame && <PhotoFrame selection={config.wallpaper} favorites={config.favoriteWallpapers} seconds={config.photoSeconds} showPeriod={config.showAmPm} onClose={() => setPhotoFrame(false)} />}
		</>
	);
}
