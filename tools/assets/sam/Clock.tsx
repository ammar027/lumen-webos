import {timeParts} from '../lib/clock';
import {useClock} from '../hooks/useClock';
import {useTimeFormat} from '../hooks/useTimeFormat';
import {getClockMode} from '../lib/i18n';

export const CLOCK_STYLES = ['digital', 'date', 'seconds', 'analog', 'both'];
export const CLOCK_STYLE_NAMES = ['Digital', 'Date and time', 'With seconds', 'Analog', 'Analog and digital'];
export const CLOCK_COLORS = ['auto', 'white', 'blue', 'green', 'orange', 'pink', 'yellow'];
export const CLOCK_COLOR_NAMES = ['Auto', 'White', 'Blue', 'Green', 'Orange', 'Pink', 'Yellow'];
export const CLOCK_COLOR_VALUE: Record<string, string> = {white: '#ffffff', blue: '#5ac8fa', green: '#7dde6b', orange: '#ff9f43', pink: '#ff6fa8', yellow: '#ffd84a'};

let face = {style: 'digital', color: 'auto'};
/** set from the config on every render of the app; the pill picks it up with its next tick */
export function setClockFace (style: string, color: string): void { face = {style, color}; }

const two = (n: number) => (n < 10 ? '0' : '') + n;

export function Dial ({now}: {now: Date}) {
	const s = now.getSeconds(), m = now.getMinutes() + s / 60, h = (now.getHours() % 12) + m / 60;
	const hand = (deg: number, len: number, w: number) => <line x1="20" y1="20" x2="20" y2={20 - len} stroke="currentColor" stroke-width={w} stroke-linecap="round" transform={`rotate(${deg} 20 20)`} />;
	const ticks = [0, 3, 6, 9].map((k) => <line key={k} x1="20" y1="3.5" x2="20" y2="6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".7" transform={`rotate(${k * 30} 20 20)`} />);
	return (
		<svg class="clock__dial" viewBox="0 0 40 40" aria-hidden="true">
			<circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".35" />
			{ticks}
			{hand(h * 30, 9, 2.4)}{hand(m * 6, 13.5, 1.8)}{hand(s * 6, 15, 1)}
			<circle cx="20" cy="20" r="1.6" fill="currentColor" />
		</svg>
	);
}

/** Self-contained: only this small pill re-renders each second, not the rows and tiles. Styles and colours are Settings > Language > Clock style and Clock colour. */
export function Clock ({showPeriod}: {showPeriod?: boolean}) {
	const now = useClock();
	const tvFormat = useTimeFormat();
	const mode = getClockMode();
	const {time, period} = timeParts(now, mode === '12h' || mode === '24h' ? mode : tvFormat);
	const {style, color} = face;
	const analog = style === 'analog' || style === 'both';
	const colour = CLOCK_COLOR_VALUE[color];
	return (
		<div class={`clock clock--${style}`} style={colour ? `color:${colour}` : undefined}>
			{analog && <Dial now={now} />}
			{style !== 'analog' && <div class="clock__time">
				{style === 'date' && <span class="clock__date">{now.toLocaleDateString(undefined, {weekday: 'short', day: 'numeric'})}</span>}
				<span>{time.split(':')[0]}</span><span class="clock__colon">:</span><span>{time.split(':')[1]}</span>
				{style === 'seconds' && <span class="clock__sec">:{two(now.getSeconds())}</span>}
				{showPeriod && period && <span class="clock__period">{period}</span>}
			</div>}
		</div>
	);
}
