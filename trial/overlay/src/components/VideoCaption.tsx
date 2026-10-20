import {useEffect, useState} from 'preact/hooks';
import {getCurrentClip} from '../lib/wallpaperVideo';

/** bottom right while the dock is away: the place and what the clip shows, like Apple TV's aerial screensavers */
export function VideoCaption () {
	const [clip, setClip] = useState(getCurrentClip());
	useEffect(() => {
		const update = () => setClip(getCurrentClip());
		window.addEventListener('lumen-clip', update);
		return () => window.removeEventListener('lumen-clip', update);
	}, []);
	if (!clip) return null;
	return (
		<div class="videocap">
			<div class="videocap__place">{clip.name}</div>
			{clip.title && <div class="videocap__text">{clip.title}</div>}
		</div>
	);
}
