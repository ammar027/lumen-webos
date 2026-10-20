import {timeParts} from '../lib/clock';
import {useClock} from '../hooks/useClock';
import {useTimeFormat} from '../hooks/useTimeFormat';
import {getClockMode} from '../lib/i18n';

/** Self-contained: only this small pill re-renders each second, not the rows and tiles. */
export function Clock ({showPeriod}: {showPeriod?: boolean}) {
	const now = useClock();
	const tvFormat = useTimeFormat();
	const mode = getClockMode();
	const {time, period} = timeParts(now, mode === '12h' || mode === '24h' ? mode : tvFormat);
	return (
		<div class="clock">
			<div class="clock__time">
				<span>{time.split(':')[0]}</span><span class="clock__colon">:</span><span>{time.split(':')[1]}</span>
				{showPeriod && period && <span class="clock__period">{period}</span>}
			</div>
		</div>
	);
}
