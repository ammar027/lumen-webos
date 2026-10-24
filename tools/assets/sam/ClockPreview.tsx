import {useEffect, useState} from 'preact/hooks';
import {Dial, CLOCK_COLOR_VALUE} from './Clock';
import {WeatherIcon} from './WeatherIcon';

export interface ClockPreviewProps {
	/** the photo screensaver's clock (position is one of off bl bc br tl tc tr c), else the home clock (left center right) */
	photo: boolean;
	pos: string;
	layout: string;
	style: string;
	size: string;
	weight: string;
	look: string;
	color: string;
	showDate: boolean;
	weatherText: string;
	showPeriod: boolean;
}

const SCALE: Record<string, number> = {small: 0.8, normal: 1, large: 1.25, xl: 1.5, huge: 2.2};
const PSCALE: Record<string, number> = {small: 0.7, normal: 1, large: 1.4, xl: 1.9, huge: 2.6};
const two = (n: number) => (n < 10 ? '0' : '') + n;

/** A small picture of the clock with the settings as they would be: used on the choices pages of the clock settings. */
export function ClockPreview (p: ClockPreviewProps) {
	const [now, setNow] = useState(new Date());
	useEffect(() => { const t = window.setInterval(() => setNow(new Date()), 15000); return () => window.clearInterval(t); }, []);
	const h = now.getHours();
	const time = p.showPeriod ? `${h % 12 || 12}:${two(now.getMinutes())}` : `${two(h)}:${two(now.getMinutes())}`;
	const sec = p.style === 'seconds' ? ':' + two(now.getSeconds()) : '';
	const analog = p.style === 'analog' || p.style === 'both';
	const shortDate = now.toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'}).replace(',', '');
	const longDate = now.toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'}).replace(',', '');
	const stacked = p.photo ? false : p.layout === 'stacked';
	const k = ((p.photo ? PSCALE : SCALE)[p.size] || 1) * 1.6;   // drawn larger than life so it reads at this size
	const colour = CLOCK_COLOR_VALUE[p.color];
	const cls = `cpv__block cpv--${p.photo ? 'photo' : 'home'} cpv--pos-${p.pos}${stacked ? ' cpv--stacked' : ''}${p.look === 'frosted' ? ' cpv--frosted' : ''}`;
	const w = p.weight === 'bold' ? 700 : p.weight === 'light' ? 300 : p.photo ? 650 : stacked ? 600 : 500;
	const weather = p.weatherText;
	const city = weather.indexOf(' · ') > 0 ? weather.slice(0, weather.indexOf(' · ') + 3) : '';
	const rest = weather.indexOf(' · ') > 0 ? weather.slice(weather.indexOf(' · ') + 3) : weather;
	if (p.photo && p.pos === 'off') return <div class="cpv"><div class="cpv__bg cpv__bg--photo" /></div>;
	return (
		<div class="cpv"><div class={`cpv__bg${p.photo ? ' cpv__bg--photo' : ''}`} /><div class="cpv__scale">
			<div class={cls} style={`transform:scale(${k});${colour ? 'color:' + colour + ';' : ''}`}>
				<div class="cpv__row">
					{!p.photo && p.showDate && !stacked && <span class="cpv__date">{shortDate}</span>}
					{analog && <Dial now={now} />}
					{p.style !== 'analog' && <span class="cpv__time" style={`font-size:${p.photo ? 120 : stacked ? 104 : 30}px;font-weight:${w}`}>{time}{sec}</span>}
				</div>
				{(p.photo || stacked) && p.showDate && <div class="cpv__date cpv__date--big">{longDate}</div>}
				{weather && <div class="cpv__weather"><WeatherIcon text={weather} />{p.photo ? city : ''}{rest}</div>}
			</div>
		</div></div>
	);
}
