import {useEffect, useRef} from 'preact/hooks';
import {watchBlurCanvas} from '../lib/blurCanvas';

/** The backdrop of Settings, drawn from its screen's ::before into a canvas behind the content (no tiles to drop and raster again). Put it first in the screen. */
export function ScreenBackdrop () {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = ref.current;
		const screen = el && el.parentElement;
		return el && screen ? watchBlurCanvas(screen, el, 'screen--canvasbg', '::before') : undefined;
	}, []);
	return <div ref={ref} class="backdrop" />;
}
