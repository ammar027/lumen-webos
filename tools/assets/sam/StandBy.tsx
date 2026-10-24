import {useEffect, useRef, useState} from 'preact/hooks';
import {PhotoSaver} from './PhotoSaver';
import {langLocale, getClockMode} from '../lib/i18n';
import {timeParts} from '../lib/clock';
import {useTimeFormat} from '../hooks/useTimeFormat';

/** A StandBy mode for the TV, after Apple's StandBy (iOS 17 on): a full-screen face you leave on, and Left and Right change the face. Faces: Digital, Float, Analog, Solar (the clock
 *  styles of StandBy), Photos, Weather, and Fade and Flow (slow animated colour, named after the faces found in iOS 27.1). Up and Down change the colour; at night Night Mode dims
 *  the screen and turns the figures red, as StandBy does in a dark room. OK or Back returns to the home screen. */
export const FACES = ['digital', 'float', 'analog', 'solar', 'photos', 'weather', 'fade', 'flow'];
export const FACE_NAMES: Record<string, string> = {digital: 'Digital', float: 'Float', analog: 'Analog', solar: 'Solar', photos: 'Photos', weather: 'Weather', fade: 'Fade', flow: 'Flow'};
export const COLORS = ['white', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];
export const COLOR_NAMES: Record<string, string> = {white: 'White', red: 'Red', orange: 'Orange', yellow: 'Yellow', green: 'Green', blue: 'Blue', purple: 'Purple', pink: 'Pink'};
const COLOR_CSS: Record<string, string> = {white: '#ffffff', red: '#ff453a', orange: '#ff9f0a', yellow: '#ffd60a', green: '#30d158', blue: '#0a84ff', purple: '#bf5af2', pink: '#ff6ca8'};
const NIGHT_CSS = '#ff5a3c';
const LAST_FACE_KEY = 'lumen-standby-face-v1';

const dateText = () => { try { return new Date().toLocaleDateString(langLocale(), {weekday: 'long', month: 'long', day: 'numeric'}); } catch { return new Date().toDateString(); } };

/** The time, re-read every 15 seconds. */
function useNow (): Date {
	const [now, setNow] = useState(() => new Date());
	useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 15000); return () => window.clearInterval(id); }, []);
	return now;
}

function useParts (now: Date): {h: string; m: string; hh: string; period: string} {
	const tv = useTimeFormat();
	const mode = getClockMode();
	const p = timeParts(now, mode === '12h' || mode === '24h' ? mode : tv);
	const [h, m] = p.time.split(':');
	return {h, m, hh: h.length < 2 ? '0' + h : h, period: p.period || ''};
}

/** Night Mode: on, off, or auto (dark between 7 pm and 6 am). */
function isNight (mode: string, now: Date): boolean {
	return mode === 'on' || (mode === 'auto' && (now.getHours() >= 19 || now.getHours() < 6));
}

// --- Float: the figures as very tall, round-ended glass strokes (vector, so they stay crisp and need no font) ---
const DIGITS: Record<string, string> = {
	'0': 'M8,32 A22,24 0 0 1 52,32 V208 A22,24 0 0 1 8,208 Z',
	'1': 'M14,36 Q26,24 32,8 V232',
	'2': 'M8,34 A22,26 0 0 1 52,34 C52,92 8,160 8,206 Q8,232 34,232 H54',
	'3': 'M8,8 H30 A22,54 0 0 1 30,116 H18 M30,116 A22,58 0 0 1 30,232 H8',
	'4': 'M40,8 L8,158 Q7,168 17,168 H54 M40,8 V232',
	'5': 'M52,8 H22 Q12,8 12,18 V102 Q12,112 22,112 H30 A22,60 0 0 1 30,232 H8',
	'6': 'M50,8 Q10,50 8,160 V192 A22,40 0 0 0 52,192 V168 A22,40 0 0 0 8,168',
	'7': 'M8,8 H44 Q58,8 53,24 L26,232',
	'8': 'M8,34 A22,24 0 0 1 52,34 V86 A22,24 0 0 1 8,86 Z M8,148 A22,26 0 0 1 52,148 V206 A22,26 0 0 1 8,206 Z',
	'9': 'M50,8 Q10,50 8,160 V192 A22,40 0 0 0 52,192 V168 A22,40 0 0 0 8,168'
};

function Float ({hh, m}: {hh: string; m: string}) {
	let x = 0;
	const parts = (hh + ':' + m).split('').map((c, i) => {
		const at = x;
		x += c === ':' ? 42 : 76;
		return c === ':'
			? <g key={i} transform={`translate(${at},0)`}><circle cx="12" cy="84" r="11" class="sb__dot" /><circle cx="12" cy="156" r="11" class="sb__dot" /></g>
			: <path key={i} d={DIGITS[c]} transform={c === '9' ? `translate(${at},0) rotate(180 30 120)` : `translate(${at},0)`} class="sb__stroke" />;
	});
	return <svg class="sb__float" viewBox={`-6 -6 ${x + 12} 252`} aria-hidden="true"><g fill="none">{parts}</g></svg>;
}

function Analog ({now}: {now: Date}) {
	const h = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5, m = now.getMinutes() * 6;
	return (
		<svg class="sb__analog" viewBox="-100 -100 200 200" aria-hidden="true">
			<circle r="96" class="sb__face" />
			{Array.from({length: 60}, (_, i) => <line key={i} x1="0" y1={i % 5 === 0 ? -84 : -90} x2="0" y2="-95" class={i % 15 === 0 ? 'sb__tick sb__tick--accent' : i % 5 === 0 ? 'sb__tick' : 'sb__tick sb__tick--minor'} transform={`rotate(${i * 6})`} />)}
			<line x1="0" y1="8" x2="0" y2="-52" class="sb__hand sb__hand--h" transform={`rotate(${h})`} />
			<line x1="0" y1="10" x2="0" y2="-78" class="sb__hand sb__hand--m" transform={`rotate(${m})`} />
			<circle r="6" class="sb__pin" />
		</svg>
	);
}

/** Solar: the sky behind the time follows the hour, with a sun (or moon) travelling its arc. */
function solarSky (now: Date): {from: string; to: string; sun: number; night: boolean} {
	const t = now.getHours() + now.getMinutes() / 60;
	const stops: [number, string, string][] = [[0, '#050a22', '#14224f'], [5, '#1b2a5c', '#6a4b8a'], [6.5, '#ff9a5a', '#7a4a8a'], [9, '#4aa8ff', '#bfe6ff'], [15, '#3d9bff', '#cfe9ff'], [17.5, '#ff7a45', '#7a4a8a'], [19, '#2a2a6a', '#6a3a7a'], [21, '#0a1030', '#1a2a5a'], [24, '#050a22', '#14224f']];
	let a = stops[0], b = stops[1];
	for (let i = 0; i < stops.length - 1; i++) if (t >= stops[i][0] && t <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; }
	const k = (t - a[0]) / (b[0] - a[0] || 1);
	const mix = (c1: string, c2: string) => { const p = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const u = p(c1), v = p(c2); return '#' + u.map((n, i) => Math.round(n + (v[i] - n) * k).toString(16).padStart(2, '0')).join(''); };
	return {from: mix(a[1], b[1]), to: mix(a[2], b[2]), sun: ((t - 6) / 12), night: t < 6 || t > 19};
}

/** The StandBy screen. `photoProps` carry the photo screensaver's settings for the Photos face. */
export function StandBy ({face0, color0, night, weatherText, showPeriod, photoProps, onFace, onColor, onExit}: {
	face0: string; color0: string; night: string; weatherText?: string; showPeriod?: boolean;
	photoProps: {source: string; favorites: string[]; picks: string[]; seconds: number; print: boolean; backlight?: number};
	onFace?: (face: string) => void; onColor?: (color: string) => void; onExit: () => void;
}) {
	const now = useNow();
	const {m, hh, period} = useParts(now);
	const start = face0 === 'last' ? ((() => { try { return localStorage.getItem(LAST_FACE_KEY) || 'digital'; } catch { return 'digital'; } })()) : face0;
	const [face, setFace] = useState(FACES.indexOf(start) >= 0 ? FACES.indexOf(start) : 0);
	const [color, setColor] = useState(COLORS.indexOf(color0) >= 0 ? COLORS.indexOf(color0) : 0);
	const live = useRef({face, color});
	live.current = {face, color};
	const dark = isNight(night, now);
	const tint = dark ? NIGHT_CSS : COLOR_CSS[COLORS[color]];
	const name = FACES[face];

	useEffect(() => {
		const key = (e: KeyboardEvent) => {
			e.preventDefault(); e.stopPropagation();
			const c = e.keyCode;
			if (c === 37 || c === 39) {
				const next = (live.current.face + (c === 39 ? 1 : FACES.length - 1)) % FACES.length;
				setFace(next);
				try { localStorage.setItem(LAST_FACE_KEY, FACES[next]); } catch { /* no storage */ }
				if (onFace) onFace(FACES[next]);
			} else if (c === 38 || c === 40) {
				const next = (live.current.color + (c === 40 ? 1 : COLORS.length - 1)) % COLORS.length;
				setColor(next);
				if (onColor) onColor(COLORS[next]);
			} else onExit();
		};
		const click = (e: Event) => { e.preventDefault(); onExit(); };
		window.addEventListener('keydown', key, true);
		window.addEventListener('mousedown', click, true);
		return () => { window.removeEventListener('keydown', key, true); window.removeEventListener('mousedown', click, true); };
	}, []);

	// the weather line is 'Place · 30° Clear' (the place may be missing)
	const wm = /^(?:(.*?) · )?(-?\d+)° ?(.*)$/.exec(weatherText || '');
	const place = wm && wm[1] ? wm[1] : '', temp = wm ? wm[2] : '', label = wm ? wm[3] : '';
	const sub = dateText() + (weatherText ? ` · ${weatherText}` : '');
	const sky = name === 'solar' ? solarSky(now) : null;
	return (
		<div class={`sb sb--${name}${dark ? ' sb--night' : ''}`} style={`--sb:${tint}${sky ? `;--sky-from:${sky.from};--sky-to:${sky.to}` : ''}`}>
			{name === 'photos' && <PhotoSaver {...photoProps} embedded weatherText={weatherText} showPeriod={showPeriod} onExit={onExit} />}
			{(name === 'fade' || name === 'flow') && <div class="sb__sky"><i class="sb__blob sb__blob--a" /><i class="sb__blob sb__blob--b" /><i class="sb__blob sb__blob--c" /></div>}
			{name === 'solar' && sky && <div class="sb__sun" style={`left:${Math.min(1, Math.max(0, sky.sun)) * 100}%;top:${68 - Math.sin(Math.min(1, Math.max(0, sky.sun)) * Math.PI) * 52}%`} />}
			{name === 'digital' && <div class="sb__center"><div class="sb__time">{hh}<span class="sb__colon">:</span>{m}{showPeriod && period && <span class="sb__period">{period}</span>}</div><div class="sb__sub">{sub}</div></div>}
			{name === 'solar' && <div class="sb__center"><div class="sb__time sb__time--light">{hh}<span class="sb__colon">:</span>{m}</div><div class="sb__sub">{sub}</div></div>}
			{name === 'float' && <div class="sb__center"><Float hh={hh} m={m} /><div class="sb__sub">{sub}</div></div>}
			{name === 'analog' && <div class="sb__center"><Analog now={now} /><div class="sb__sub">{sub}</div></div>}
			{name === 'weather' && <div class="sb__center"><div class="sb__place">{place}</div><div class="sb__temp">{temp ? `${temp}°` : '—'}</div><div class="sb__cond">{label}</div><div class="sb__sub">{dateText()} · {hh}:{m}</div></div>}
			{(name === 'fade' || name === 'flow') && <div class="sb__corner"><span class="sb__time sb__time--small">{hh}<span class="sb__colon">:</span>{m}</span><span class="sb__sub">{sub}</span></div>}
			{dark && <div class="sb__night" />}
			<div class="sb__hint">{FACE_NAMES[name]} · ◀ ▶ face · ▲ ▼ colour · OK exit</div>
		</div>
	);
}
