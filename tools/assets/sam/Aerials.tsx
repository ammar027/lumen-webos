import {useEffect, useState} from 'preact/hooks';
import {VideoCaption} from './VideoCaption';
import {setVideoWallpaper} from '../lib/wallpaperVideo';
import {useKeys} from '../hooks/useKeys';

interface Props {
	/** the video wallpaper is on already (otherwise it plays only while this is up) */
	videoOn: boolean;
	showPeriod: boolean;
	weatherText: string;
	onExit: () => void;
}

const two = (n: number) => (n < 10 ? '0' : '') + n;

/** Aerials screensaver, after Apple TV: the video wallpaper full screen, nothing else but the place caption (bottom right) and the time and weather (bottom left). Any key returns. */
export function Aerials ({videoOn, showPeriod, weatherText, onExit}: Props) {
	const [now, setNow] = useState(new Date());
	useEffect(() => {
		if (!videoOn) setVideoWallpaper(true);
		document.documentElement.classList.add('in-aerials');
		const t = window.setInterval(() => setNow(new Date()), 15000);
		return () => { window.clearInterval(t); document.documentElement.classList.remove('in-aerials'); if (!videoOn) setVideoWallpaper(false); };
	}, []);
	useKeys(() => { onExit(); return true; });
	const h = now.getHours();
	const text = showPeriod ? `${h % 12 || 12}:${two(now.getMinutes())}` : `${two(h)}:${two(now.getMinutes())}`;
	return (
		<div class="aerials" onClick={onExit} onMouseMove={undefined}>
			<div class="aerials__time">{text}{showPeriod ? <span class="aerials__ampm">{h < 12 ? 'AM' : 'PM'}</span> : null}</div>
			{weatherText && <div class="aerials__weather">{weatherText}</div>}
			<VideoCaption />
		</div>
	);
}
