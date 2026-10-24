import {useEffect, useRef, useState} from 'preact/hooks';
import {Clock} from './Clock';
import {langLocale} from '../lib/i18n';
import {WALLPAPERS, cloudUrl} from '../config/wallpapers';
import {resized} from '../lib/wallpaper';

const dateText = () => { try { return new Date().toLocaleDateString(langLocale(), {weekday: 'long', month: 'long', day: 'numeric'}); } catch { return new Date().toDateString(); } };

/** The pictures the screensaver draws from: your favourites, a whole category, or everything in the library (never fewer than a category's worth). */
function pool (source: string, favorites: string[]) {
	const list = source === 'favorites' ? WALLPAPERS.filter((w) => favorites.indexOf(w.id) !== -1)
		: source === 'all' ? WALLPAPERS
		: WALLPAPERS.filter((w) => w.category === source);
	return list.length > 3 ? list : WALLPAPERS.filter((w) => w.category === 'Landscapes');
}

/** A photo screensaver inside Lumen (from the fork's Ambient screen, but with the wallpaper library as its pictures): two full-screen layers swap with a crossfade every
 *  `seconds` (opacity only), each picture zooming in very slowly (transform only); the clock, date and weather sit at the bottom. Any key or a click returns to the home screen. */
export function PhotoSaver ({source, favorites, seconds, print, weatherText, showPeriod, onExit}: {source: string; favorites: string[]; seconds: number; print: boolean; weatherText?: string; showPeriod?: boolean; onExit: () => void}) {
	const [layers, setLayers] = useState<[string, string]>(['', '']);
	const [front, setFront] = useState(0);
	const state = useRef({front: 0, alive: true, timer: 0, recent: [] as string[]});

	useEffect(() => {
		const s = state.current;
		s.alive = true;
		const list = pool(source, favorites);
		const advance = () => {
			if (!s.alive) return;
			// random, but not one of the last few shown
			const fresh = list.filter((w) => s.recent.indexOf(w.id) === -1);
			const pick = (fresh.length > 0 ? fresh : list)[Math.floor(Math.random() * (fresh.length > 0 ? fresh : list).length)];
			s.recent = s.recent.concat(pick.id).slice(-Math.min(20, Math.max(1, list.length - 2)));
			const url = resized(cloudUrl(pick), 1920);
			const img = new Image();
			img.src = url;
			(typeof img.decode === 'function' ? img.decode() : Promise.resolve())
				.then(() => {
					if (!s.alive) return;
					const back = 1 - s.front;
					setLayers((l) => { const n: [string, string] = [l[0], l[1]]; n[back] = url; return n; });
					// two frames so the hidden layer has its picture before it becomes the visible one
					window.requestAnimationFrame(() => window.requestAnimationFrame(() => { s.front = back; setFront(back); }));
				})
				.catch(() => { if (s.alive) { window.clearTimeout(s.timer); s.timer = window.setTimeout(advance, 800); } return undefined; })
				.then(() => undefined);
			window.clearTimeout(s.timer);
			s.timer = window.setTimeout(advance, seconds * 1000);
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
			{layers.map((url, i) => (
				// keyed by URL, so a new picture restarts the slow zoom
				<div key={i + url} class={`ambient__photo${i === front ? ' ambient__photo--on' : ''}${i === 1 ? ' ambient__photo--alt' : ''}`} style={url ? `background-image:url("${url}")` : undefined} />
			))}
			{print && <div class="ambient__print" />}
			<div class="ambient__night" />
			<div class="ambient__shade" />
			<div class="ambient__clock"><Clock showPeriod={showPeriod} /></div>
			<div class="ambient__info">{weatherText && <div class="ambient__weather">{weatherText}</div>}<div class="ambient__date">{dateText()}</div></div>
		</div>
	);
}
