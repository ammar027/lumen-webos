// From Sam Renfrew's fork (MIT); the screen blend is added for Lumen's light glass.
// The full-screen blurred wallpaper copy (--wp-bg) drawn once into a canvas at its own size (480x270), which the GPU scales up. As a CSS
// background it was rastered again on many moves, because the TV's memory pressure makes Chromium drop its tiles; a canvas has no tiles
// (docs/frame-rate.md). global.css stays the one record of the look: the canvas copies whatever background the element (or its ::before) has.

/** Draws `host`'s background (or its `pseudo`'s) into a canvas inside `into`, and puts `on` on `host` while the canvas shows, for CSS to drop the
 *  picture. Redraws when the wallpaper or the look changes. Returns the stop function. */
export function watchBlurCanvas (host: HTMLElement, into: HTMLElement, on: string, pseudo?: string): () => void {
	const html = document.documentElement;
	let key = '';
	let seen = '';
	let token = 0;
	const paint = () => {
		// most html changes (settled, in-settings) leave the look as it is: skip them before forcing a style read
		const now = `${html.style.getPropertyValue('--wp-bg')}|${['night', 'light', 'wp-video'].map((c) => html.classList.contains(c)).join()}`;
		if (now === seen) return;
		seen = now;
		// the wallpaper is released while Lumen is hidden (lib/wallpaper.ts): keep the canvas for its return
		if (!html.style.getPropertyValue('--wp-bg') && !html.classList.contains('wp-video')) return;
		// read the look with the class off, then put it back if nothing changed
		const had = host.classList.contains(on);
		host.classList.remove(on);
		const css = getComputedStyle(host, pseudo);
		const image = css.backgroundImage, colour = css.backgroundColor, blend = css.backgroundBlendMode;
		const url = /url\("?([^")]+)"?\)/.exec(image);
		if (had && url && `${image}|${colour}|${blend}` === key) { host.classList.add(on); return; }
		key = `${image}|${colour}|${blend}`;
		const mine = ++token;
		if (!url) { into.textContent = ''; return; }   // the video wallpaper's tint has no picture: CSS draws it
		const img = new Image();
		img.onload = () => {
			if (mine !== token) return;
			const c = document.createElement('canvas');
			c.width = img.naturalWidth; c.height = img.naturalHeight;
			const g = c.getContext('2d');
			if (!g) return;
			// the picture over the background colour by its blend mode (multiply when night dimming), then the gradient over it
			const mode = /multiply/.test(blend) ? 'multiply' : /screen/.test(blend) ? 'screen' : '';   // Lumen's light glass lifts the picture with screen
			if (mode) { g.fillStyle = colour; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = mode; }
			g.drawImage(img, 0, 0, c.width, c.height);
			g.globalCompositeOperation = 'source-over';
			const tint = /linear-gradient\((rgba?\([^)]*\))/.exec(image);
			if (tint) { g.fillStyle = tint[1]; g.fillRect(0, 0, c.width, c.height); }
			into.textContent = '';
			into.appendChild(c);
			host.classList.add(on);
		};
		img.src = url[1];
	};
	paint();
	// the picture changes with --wp-bg (inline on html), the look with html's classes
	const watch = new MutationObserver(paint);
	watch.observe(html, {attributes: true, attributeFilter: ['style', 'class']});
	return () => watch.disconnect();
}
