import {useEffect, useRef, useState} from 'preact/hooks';
import {Clock} from './Clock';
import {langLocale, getClockMode} from '../lib/i18n';
import {timeParts} from '../lib/clock';
import {useTimeFormat} from '../hooks/useTimeFormat';
import {LOCAL_WALLPAPERS, WALLPAPERS, cloudUrl} from '../config/wallpapers';
import {resized} from '../lib/wallpaper';
import {dimForScreensaver, restoreBacklight} from '../lib/tvcontrols';
import {cachedServer, loadServer, nextAsset, picturePosition, previewUrls, type ImmichServer} from '../lib/immich';

const dateText = () => { try { return new Date().toLocaleDateString(langLocale(), {weekday: 'long', month: 'long', day: 'numeric'}); } catch { return new Date().toDateString(); } };

/** The time as very tall, narrow glass digits (after Apple TV's Portraits screen saver), drawn as vector strokes so they stay crisp at 760 px tall and need no special font. Each digit is a 60 x 240 box;
 *  the paths are the centre lines of thick, round-ended strokes. The fill is a pale see-through gradient, so the picture shows through. */
const DIGITS: Record<string, string> = {
	'0': 'M8,32 A22,24 0 0 1 52,32 V208 A22,24 0 0 1 8,208 Z',
	'1': 'M12,38 L32,8 V232',
	'2': 'M8,34 A22,26 0 0 1 52,34 C52,92 8,160 8,208 V232 H54',
	'3': 'M8,8 H30 A22,54 0 0 1 30,116 H18 M30,116 A22,58 0 0 1 30,232 H8',
	'4': 'M40,8 L8,160 H54 M40,8 V232',
	'5': 'M52,8 H12 V112 H30 A22,60 0 0 1 30,232 H8',
	'6': 'M50,8 Q10,50 8,160 V192 A22,40 0 0 0 52,192 V168 A22,40 0 0 0 8,168',
	'7': 'M8,8 H52 L26,232',
	'8': 'M8,34 A22,24 0 0 1 52,34 V86 A22,24 0 0 1 8,86 Z M8,148 A22,26 0 0 1 52,148 V206 A22,26 0 0 1 8,206 Z',
	'9': 'M50,8 Q10,50 8,160 V192 A22,40 0 0 0 52,192 V168 A22,40 0 0 0 8,168'
};

function GlassClock () {
	const [now, setNow] = useState(() => new Date());
	const tv = useTimeFormat();
	useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 15000); return () => window.clearInterval(id); }, []);
	const mode = getClockMode();
	const [h, m] = timeParts(now, mode === '12h' || mode === '24h' ? mode : tv).time.split(':');
	const chars = (h.length < 2 ? '0' + h : h) + ':' + m;
	let x = 0;
	const parts = chars.split('').map((c, i) => {
		const at = x;
		x += c === ':' ? 56 : 76;
		return c === ':'
			? <g key={i} transform={`translate(${at},0)`}><circle cx="14" cy="84" r="10" class="ambient__gdot" /><circle cx="14" cy="156" r="10" class="ambient__gdot" /></g>
			: <path key={i} d={DIGITS[c]} transform={c === '9' ? `translate(${at},0) rotate(180 30 120)` : `translate(${at},0)`} class="ambient__gstroke" />;
	});
	return (
		<svg class="ambient__glass" viewBox={`-4 -4 ${x + 8} 248`} aria-hidden="true">
			<defs><linearGradient id="ambient-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.66" /><stop offset="1" stop-color="#fff" stop-opacity="0.3" /></linearGradient></defs>
			<g fill="none" stroke="url(#ambient-glass)">{parts}</g>
		</svg>
	);
}

/** A plain analog clock face: hands move once every 30 s (no second hand, nothing animates). */
function AnalogClock () {
	const [now, setNow] = useState(() => new Date());
	useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(id); }, []);
	const h = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5, m = now.getMinutes() * 6;
	return (
		<svg class="ambient__analog" viewBox="-100 -100 200 200" aria-hidden="true">
			<circle r="96" class="ambient__face" />
			{Array.from({length: 12}, (_, i) => <line key={i} x1="0" y1="-84" x2="0" y2={i % 3 === 0 ? -70 : -76} class="ambient__tick" transform={`rotate(${i * 30})`} />)}
			<line x1="0" y1="6" x2="0" y2="-50" class="ambient__hand ambient__hand--h" transform={`rotate(${h})`} />
			<line x1="0" y1="8" x2="0" y2="-76" class="ambient__hand ambient__hand--m" transform={`rotate(${m})`} />
			<circle r="5" class="ambient__pin" />
		</svg>
	);
}

interface Item { id: string; url: string }

/** The pictures the library screensaver draws from: the ones you ticked in Settings > Wallpaper, your favourites, a whole category, or everything in the library (never fewer than a category's worth). */
function pool (source: string, favorites: string[], picks: string[]): Item[] {
	const web = (w: typeof WALLPAPERS[number]): Item => ({id: w.id, url: resized(cloudUrl(w), 1920)});
	if (source === 'picks') {
		const items = picks.map((k): Item | null => k.indexOf('local:') === 0
			? (LOCAL_WALLPAPERS[Number(k.slice(6))] ? {id: k, url: LOCAL_WALLPAPERS[Number(k.slice(6))].file} : null)
			: (WALLPAPERS.filter((w) => w.id === k.slice(6))[0] ? web(WALLPAPERS.filter((w) => w.id === k.slice(6))[0]) : null)).filter((x): x is Item => !!x);
		if (items.length > 0) return items;
	}
	const list = source === 'favorites' ? WALLPAPERS.filter((w) => favorites.indexOf(w.id) !== -1)
		: source === 'all' || source === 'shuffle' ? WALLPAPERS
		: WALLPAPERS.filter((w) => w.category === source);
	return (list.length > 3 ? list : WALLPAPERS.filter((w) => w.category === 'Landscapes')).map(web);
}

interface Layer { urls: string[]; pos: string }
const NO_LAYER: Layer = {urls: [], pos: ''};

const decoded = (url: string) => { const img = new Image(); img.src = url; return typeof img.decode === 'function' ? img.decode() : Promise.resolve(); };

/** A photo screensaver inside Lumen (after the fork's Ambient screen): two full-screen layers swap with a crossfade every `seconds` (opacity only), each picture zooming in very slowly
 *  (transform only); the clock, date and weather sit at the bottom. The pictures come from the wallpaper library, or from your Immich server (source 'immich:...'). Any key or a click returns. */
export function PhotoSaver ({source, favorites, picks, seconds, print, backlight, clockStyle = 'corner', weatherText, showPeriod, onExit}: {source: string; favorites: string[]; picks: string[]; seconds: number; print: boolean; backlight?: number; clockStyle?: string; weatherText?: string; showPeriod?: boolean; onExit: () => void}) {
	const [layers, setLayers] = useState<[Layer, Layer]>([NO_LAYER, NO_LAYER]);
	const [front, setFront] = useState(0);
	const state = useRef({front: 0, alive: true, timer: 0, recent: [] as string[], shown: ''});

	// the TV's backlight goes down while the photos show (Settings > Screensaver > Brightness) and back up when they end
	useEffect(() => {
		if (backlight === undefined) return undefined;
		let on = true;
		dimForScreensaver(backlight, () => on);
		return () => { on = false; restoreBacklight(); };
	}, [backlight]);

	useEffect(() => {
		const s = state.current;
		s.alive = true;
		const immich = source.indexOf('immich:') === 0;
		const shuffle = source === 'shuffle';
		const list = immich ? [] : pool(source, favorites, picks);
		let server: ImmichServer | null = cachedServer();
		const show = (layer: Layer) => {
			if (!s.alive) return;
			const back = 1 - s.front;
			setLayers((l) => { const n: [Layer, Layer] = [l[0], l[1]]; n[back] = layer; return n; });
			// two frames so the hidden layer has its picture before it becomes the visible one
			window.requestAnimationFrame(() => window.requestAnimationFrame(() => { s.front = back; setFront(back); }));
		};
		const next = (): Promise<unknown> => {
			// Shuffle mixes the whole library with your Immich photos when a server is set up
			if (immich || (shuffle && server && Math.random() < 0.35)) {
				return (server ? Promise.resolve(server) : loadServer())
					.then((srv) => { server = srv; return srv ? nextAsset(srv, immich ? source : 'immich:recent', s.shown) : null; })
					.then((id) => {
						if (!id || !server || !s.alive) return null;
						const urls = previewUrls(server, id);
						return Promise.all(urls.map(decoded)).then(() => ({id, urls}));
					})
					.then((pic) => { if (pic) { s.shown = pic.id; show({urls: pic.urls, pos: picturePosition(pic.id)}); } });
			}
			// random, but not one of the last few shown
			const fresh = list.filter((w) => s.recent.indexOf(w.id) === -1);
			const from = fresh.length > 0 ? fresh : list;
			const pick = from[Math.floor(Math.random() * from.length)];
			s.recent = s.recent.concat(pick.id).slice(-Math.min(20, Math.max(1, list.length - 2)));
			const url = pick.url;
			return decoded(url).then(() => show({urls: [url], pos: ''}));
		};
		const advance = () => {
			if (!s.alive) return;
			next().catch(() => undefined).then(() => { if (s.alive) s.timer = window.setTimeout(advance, seconds * 1000); });
		};
		advance();
		const exit = (e: Event) => { e.preventDefault(); onExit(); };
		window.addEventListener('keydown', exit, true);
		window.addEventListener('mousedown', exit, true);
		return () => {
			s.alive = false;
			window.clearTimeout(s.timer);
			window.removeEventListener('keydown', exit, true);
			window.removeEventListener('mousedown', exit, true);
		};
	}, [source, seconds, picks.join('|')]);

	return (
		<div class="ambient">
			{layers.map(({urls, pos}, i) => (
				// keyed by URL, so a new picture restarts the slow zoom
				<div key={i + urls.join(' ')} class={`ambient__photo${i === front ? ' ambient__photo--on' : ''}${i === 1 ? ' ambient__photo--alt' : ''}${urls.length > 1 ? ' ambient__photo--pair' : ''}`}
					style={urls.length ? `background-image:${urls.map((u) => `url("${u}")`).join(', ')}${pos ? `;background-position:${pos}` : ''}` : undefined} />
			))}
			{print && <div class="ambient__print" />}
			<div class="ambient__night" />
			<div class="ambient__shade" />
			{clockStyle === 'corner' && <div class="ambient__clock"><Clock showPeriod={showPeriod} /></div>}
			{clockStyle === 'corner' && <div class="ambient__info">{weatherText && <div class="ambient__weather">{weatherText}</div>}<div class="ambient__date">{dateText()}</div></div>}
			{clockStyle === 'big' && (
				<div class="ambient__big">
					<div class="ambient__bigtime"><Clock showPeriod={showPeriod} /></div>
					<div class="ambient__bigdate">{dateText()}{weatherText ? ' \u00b7 ' + weatherText : ''}</div>
				</div>
			)}
			{clockStyle === 'portrait' && <div class="ambient__portrait"><GlassClock /></div>}
			{clockStyle === 'analog' && (
				<div class="ambient__analogwrap">
					<AnalogClock />
					<div class="ambient__bigdate">{dateText()}{weatherText ? ' \u00b7 ' + weatherText : ''}</div>
				</div>
			)}
		</div>
	);
}
