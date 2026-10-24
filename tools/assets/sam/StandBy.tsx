import {useEffect, useRef, useState} from 'preact/hooks';
import {PhotoSaver} from './PhotoSaver';
import {langLocale, getClockMode} from '../lib/i18n';
import {timeParts} from '../lib/clock';
import {useTimeFormat} from '../hooks/useTimeFormat';

/** A StandBy mode for the TV, after Apple's StandBy (iOS 17 on): a full-screen face you leave on, and Left and Right change the face. Faces: Digital, Float, Analog, Solar (the clock
 *  styles of StandBy), Photos, Weather, and Fade and Flow (slow animated colour, named after the faces found in iOS 27.1). Up and Down change the colour; at night Night Mode dims
 *  the screen and turns the figures red, as StandBy does in a dark room. OK or Back returns to the home screen. */
export const FACES = ['digital', 'float', 'analog', 'calendar', 'solar', 'photos', 'weather', 'fade', 'flow'];
export const FACE_NAMES: Record<string, string> = {digital: 'Digital', float: 'Float', analog: 'Analog', calendar: 'Clock and Calendar', solar: 'Solar', photos: 'Photos', weather: 'Weather', fade: 'Fade', flow: 'Flow'};
export const COLORS = ['white', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];
export const COLOR_NAMES: Record<string, string> = {white: 'White', red: 'Red', orange: 'Orange', yellow: 'Yellow', green: 'Green', blue: 'Blue', purple: 'Purple', pink: 'Pink'};
const COLOR_CSS: Record<string, string> = {white: '#ffffff', red: '#ff453a', orange: '#ff9f0a', yellow: '#ffd60a', green: '#30d158', blue: '#0a84ff', purple: '#bf5af2', pink: '#ff6ca8'};
const NIGHT_CSS = '#ff2d1f';
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

// --- Float: fat bubble numerals, as in Apple's StandBy Float style (each figure its own shade, overlapping a little, grey see-through colon) ---
// Each figure is a 140 x 240 box drawn as the centre line of a very thick round-ended stroke (58 wide), so the counters stay small and the shapes stay round.
const DIGITS: Record<string, string> = {
	'0': 'M29,70 A41,41 0 0 1 111,70 V170 A41,41 0 0 1 29,170 Z',
	'1': 'M38,72 L88,29 V211',
	'2': 'M29,72 A41,43 0 0 1 111,72 C111,112 29,150 29,211 H112',
	'3': 'M30,29 H78 A33,43 0 0 1 78,115 H58 M78,115 A36,48 0 0 1 78,211 H29',
	'4': 'M84,29 L29,148 H118 M84,29 V211',
	'5': 'M110,29 H46 L36,110 H74 A39,50 0 0 1 74,211 H29',
	'6': 'M106,33 C62,48 29,92 29,150 V162 A41,49 0 0 0 111,162 V150 A41,47 0 0 0 29,150',
	'7': 'M29,29 H112 L64,211',
	'8': 'M32,74 A38,45 0 1 1 108,74 A38,45 0 1 1 32,74 Z M27,160 A43,51 0 1 1 113,160 A43,51 0 1 1 27,160 Z',
	'9': 'M106,33 C62,48 29,92 29,150 V162 A41,49 0 0 0 111,162 V150 A41,47 0 0 0 29,150'
};

/** hex colour to [r,g,b] and back through HSL, to give each figure its own shade of the chosen colour */
function shades (hex: string): string[] {
	const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
	const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
	let hue = d === 0 ? 0 : mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
	hue = (hue * 60 + 360) % 360;
	const grey = d < 0.05;
	if (grey) return ['hsl(327,92%,58%)', 'hsl(310,80%,62%)', 'hsl(278,100%,66%)', 'hsl(300,100%,36%)'];   // Apple's default: pink to violet to magenta
	return [`hsl(${hue},92%,58%)`, `hsl(${(hue + 14) % 360},86%,62%)`, `hsl(${(hue + 30) % 360},96%,66%)`, `hsl(${(hue + 338) % 360},100%,38%)`];   // near neighbours of the chosen hue, as Apple's pink to violet to magenta
}

function Float ({hh, m, tint, night}: {hh: string; m: string; tint: string; night: boolean}) {
	const colors = night ? [tint, tint, tint, tint] : shades(tint);
	let x = 0;
	let k = 0;
	const parts = (hh + ':' + m).split('').map((c, i) => {
		const at = x;
		if (c === ':') {
			x += 62;
			return <g key={i} transform={`translate(${at - 14},0)`}><circle cx="31" cy="78" r="26" class="sb__dot" /><circle cx="31" cy="168" r="26" class="sb__dot" /></g>;
		}
		x += 108;
		const color = colors[Math.min(k++, 3)];
		return <path key={i} d={DIGITS[c]} transform={c === '9' ? `translate(${at},0) rotate(180 70 120)` : `translate(${at},0)`} class="sb__stroke" style={`stroke:${color}`} />;
	});
	return <svg class="sb__float" viewBox={`-10 -10 ${x + 50} 262`} aria-hidden="true"><g fill="none">{parts}</g></svg>;
}

// --- Analog: as in StandBy: a plain black dial, numerals, ticks, thick white hands and a thin orange second hand ---
function Analog ({now, small, night}: {now: Date; small?: boolean; night: boolean}) {
	const h = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5, m = now.getMinutes() * 6 + now.getSeconds() * 0.1;
	// the second hand turns once a minute from where it is now (transform only; it ticks like a quartz watch)
	const sec = now.getSeconds();
	return (
		<svg class={small ? 'sb__analog sb__analog--small' : 'sb__analog'} viewBox="-100 -100 200 200" aria-hidden="true">
			{Array.from({length: 60}, (_, i) => i % 5 !== 0 && <line key={i} x1="0" y1="-93" x2="0" y2="-97" class="sb__tick sb__tick--minor" transform={`rotate(${i * 6})`} />)}
			{Array.from({length: 12}, (_, i) => <line key={'h' + i} x1="0" y1="-84" x2="0" y2="-97" class="sb__tick" transform={`rotate(${i * 30})`} />)}
			{Array.from({length: 12}, (_, i) => { const a = ((i + 1) * 30 * Math.PI) / 180; return <text key={'n' + i} x={Math.sin(a) * 68} y={-Math.cos(a) * 68 + 8} class="sb__num" text-anchor="middle">{i + 1}</text>; })}
			<line x1="0" y1="10" x2="0" y2="-46" class="sb__hand sb__hand--h" transform={`rotate(${h})`} />
			<line x1="0" y1="12" x2="0" y2="-76" class="sb__hand sb__hand--m" transform={`rotate(${m})`} />
			<g class="sb__second" style={`animation-delay:-${sec}s`}><line x1="0" y1="24" x2="0" y2="-84" class="sb__secline" /><circle r="5.5" class="sb__hub" /></g>
			{night && <circle r="1.6" class="sb__pin" />}
		</svg>
	);
}

/** A month grid, Sunday first, today in a red circle (StandBy's Calendar widget). */
function Calendar ({now, night}: {now: Date; night: boolean}) {
	let month = '';
	try { month = now.toLocaleDateString(langLocale(), {month: 'long'}).toUpperCase(); } catch { month = ''; }
	const first = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
	const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
	const cells: (number | null)[] = [];
	for (let i = 0; i < first; i++) cells.push(null);
	for (let d = 1; d <= days; d++) cells.push(d);
	while (cells.length % 7) cells.push(null);
	let head: string[] = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
	try { head = Array.from({length: 7}, (_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(langLocale(), {weekday: 'narrow'})); } catch { /* English initials */ }
	return (
		<div class={`sb__cal${night ? ' sb__cal--night' : ''}`}>
			<div class="sb__month">{month}</div>
			<div class="sb__grid">
				{head.map((d, i) => <span key={'w' + i} class="sb__wd">{d}</span>)}
				{cells.map((d, i) => <span key={i} class={`sb__day${d === now.getDate() ? ' sb__day--today' : ''}${i % 7 === 0 || i % 7 === 6 ? ' sb__day--weekend' : ''}`}>{d || ''}</span>)}
			</div>
		</div>
	);
}

/** Solar: a black dial with a flare of the chosen colour that follows the sun's hour across the bottom of the screen. */
function solarFlare (now: Date): number {
	const t = now.getHours() + now.getMinutes() / 60;
	return Math.min(1, Math.max(0, (t - 5) / 15));
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
	const flare = name === 'solar' ? solarFlare(now) : 0;
	return (
		<div class={`sb sb--${name}${dark ? ' sb--night' : ''}`} style={`--sb:${name === 'solar' && !dark && color === 0 ? '#ffb020' : tint};--flare:${(flare * 100).toFixed(1)}%`}>
			{name === 'photos' && <PhotoSaver {...photoProps} embedded weatherText={weatherText} showPeriod={showPeriod} onExit={onExit} />}
			{(name === 'fade' || name === 'flow') && <div class="sb__sky"><i class="sb__blob sb__blob--a" /><i class="sb__blob sb__blob--b" /><i class="sb__blob sb__blob--c" /></div>}
			{name === 'solar' && <div class="sb__flare" />}
			{name === 'digital' && <div class="sb__center"><div class="sb__time">{hh}<span class="sb__colon">:</span>{m}{showPeriod && period && <span class="sb__period">{period}</span>}</div><div class="sb__sub">{sub}</div></div>}
			{name === 'solar' && <div class="sb__center"><div class="sb__time sb__time--light">{hh}<span class="sb__colon">:</span>{m}</div><div class="sb__sub">{sub}</div></div>}
			{name === 'float' && <div class="sb__center"><Float hh={hh} m={m} tint={tint} night={dark} /><div class="sb__sub">{sub}</div></div>}
			{name === 'analog' && <div class="sb__center"><Analog now={now} night={dark} /></div>}
			{name === 'calendar' && <div class="sb__center sb__center--row"><Analog now={now} small night={dark} /><Calendar now={now} night={dark} /></div>}
			{name === 'weather' && <div class="sb__center"><div class="sb__place">{place}</div><div class="sb__temp">{temp ? `${temp}°` : '—'}</div><div class="sb__cond">{label}</div><div class="sb__sub">{dateText()} · {hh}:{m}</div></div>}
			{(name === 'fade' || name === 'flow') && <div class="sb__corner"><span class="sb__time sb__time--small">{hh}<span class="sb__colon">:</span>{m}</span><span class="sb__sub">{sub}</span></div>}
			{dark && <div class="sb__night" />}
			<div class="sb__hint">{FACE_NAMES[name]} · ◀ ▶ face · ▲ ▼ colour · OK exit</div>
		</div>
	);
}
