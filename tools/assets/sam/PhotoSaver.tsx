import {useEffect, useRef, useState} from 'preact/hooks';
import {Clock} from './Clock';
import {langLocale} from '../lib/i18n';
import {WALLPAPERS, cloudUrl} from '../config/wallpapers';
import {resized} from '../lib/wallpaper';
import {cachedServer, loadServer, nextAsset, picturePosition, previewUrls, type ImmichServer} from '../lib/immich';

const dateText = () => { try { return new Date().toLocaleDateString(langLocale(), {weekday: 'long', month: 'long', day: 'numeric'}); } catch { return new Date().toDateString(); } };

/** The pictures the library screensaver draws from: your favourites, a whole category, or everything in the library (never fewer than a category's worth). */
function pool (source: string, favorites: string[]) {
	const list = source === 'favorites' ? WALLPAPERS.filter((w) => favorites.indexOf(w.id) !== -1)
		: source === 'all' ? WALLPAPERS
		: WALLPAPERS.filter((w) => w.category === source);
	return list.length > 3 ? list : WALLPAPERS.filter((w) => w.category === 'Landscapes');
}

interface Layer { urls: string[]; pos: string }
const NO_LAYER: Layer = {urls: [], pos: ''};

const decoded = (url: string) => { const img = new Image(); img.src = url; return typeof img.decode === 'function' ? img.decode() : Promise.resolve(); };

/** A photo screensaver inside Lumen (after the fork's Ambient screen): two full-screen layers swap with a crossfade every `seconds` (opacity only), each picture zooming in very slowly
 *  (transform only); the clock, date and weather sit at the bottom. The pictures come from the wallpaper library, or from your Immich server (source 'immich:...'). Any key or a click returns. */
export function PhotoSaver ({source, favorites, seconds, print, weatherText, showPeriod, onExit}: {source: string; favorites: string[]; seconds: number; print: boolean; weatherText?: string; showPeriod?: boolean; onExit: () => void}) {
	const [layers, setLayers] = useState<[Layer, Layer]>([NO_LAYER, NO_LAYER]);
	const [front, setFront] = useState(0);
	const state = useRef({front: 0, alive: true, timer: 0, recent: [] as string[], shown: ''});

	useEffect(() => {
		const s = state.current;
		s.alive = true;
		const immich = source.indexOf('immich:') === 0;
		const list = immich ? [] : pool(source, favorites);
		let server: ImmichServer | null = cachedServer();
		const show = (layer: Layer) => {
			if (!s.alive) return;
			const back = 1 - s.front;
			setLayers((l) => { const n: [Layer, Layer] = [l[0], l[1]]; n[back] = layer; return n; });
			// two frames so the hidden layer has its picture before it becomes the visible one
			window.requestAnimationFrame(() => window.requestAnimationFrame(() => { s.front = back; setFront(back); }));
		};
		const next = (): Promise<unknown> => {
			if (immich) {
				return (server ? Promise.resolve(server) : loadServer())
					.then((srv) => { server = srv; return srv ? nextAsset(srv, source, s.shown) : null; })
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
			const url = resized(cloudUrl(pick), 1920);
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
	}, [source, seconds]);

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
			<div class="ambient__clock"><Clock showPeriod={showPeriod} /></div>
			<div class="ambient__info">{weatherText && <div class="ambient__weather">{weatherText}</div>}<div class="ambient__date">{dateText()}</div></div>
		</div>
	);
}
