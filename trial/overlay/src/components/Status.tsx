import {useEffect, useState} from 'preact/hooks';
import {Clock} from './Clock';
import {langLocale} from '../lib/i18n';

const dateText = () => (() => { try { return new Date().toLocaleDateString(langLocale(), {weekday: 'short', month: 'short', day: 'numeric'}).replace(',', ''); } catch { return new Date().toDateString(); } })();

/** Top-left, plain with no glass: one row "Sun Oct 4  9:06 PM" like the macOS menu bar, the weather in a small line below. Not focusable. */
export function Status ({weatherText, showPeriod}: {weatherText?: string; showPeriod?: boolean}) {
	const [, bump] = useState(0);
	const date = dateText();

	useEffect(() => {
		const tick = () => { if (!document.hidden) bump((n) => n + 1); };
		const id = window.setInterval(tick, 30000);
		document.addEventListener('visibilitychange', tick);
		return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', tick); };
	}, []);

	return (
		<div class="pill status">
			<div class="status__row">
				<span class="status__date">{date}</span>
				<Clock showPeriod={showPeriod} />
			</div>
			{weatherText && <div class="status__weather">{weatherText}</div>}
		</div>
	);
}
