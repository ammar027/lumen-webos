import {useEffect, useRef} from 'preact/hooks';
import {watchBlurCanvas} from '../lib/blurCanvas';

/** The backdrop behind the lower rows: the strong blurred copy as a canvas (lib/blurCanvas.ts), so Down and Up do not raster it again. */
export function LowerVeil () {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => (ref.current ? watchBlurCanvas(ref.current, ref.current, 'lowerveil--canvas') : undefined), []);
	return <div ref={ref} class="lowerveil" />;
}
