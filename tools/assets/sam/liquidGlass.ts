/** Settings > Liquid glass dock: the SVG filter the glass bar's backdrop-filter points at (#lg-dock, global.css). After nikdelvin/liquid-glass,
 *  one displacement pass and no colour fringe: the fringe's three passes cost about 8 fps on the TV, standing still. The map must match the
 *  bar's size, so it is rebuilt when the bar changes size. */

const NS = 'http://www.w3.org/2000/svg';
const DEPTH = 10, STRENGTH = 100;

function displacementMap (w: number, h: number, r: number): string {
	return 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg height="${h}" width="${w}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><style>.mix { mix-blend-mode: screen; }</style><defs>`
		+ `<linearGradient id="Y" x1="0" x2="0" y1="${Math.ceil((r / h) * 15)}%" y2="${Math.floor(100 - (r / h) * 15)}%"><stop offset="0%" stop-color="#0F0"/><stop offset="100%" stop-color="#000"/></linearGradient>`
		+ `<linearGradient id="X" x1="${Math.ceil((r / w) * 15)}%" x2="${Math.floor(100 - (r / w) * 15)}%" y1="0" y2="0"><stop offset="0%" stop-color="#F00"/><stop offset="100%" stop-color="#000"/></linearGradient></defs>`
		+ `<rect x="0" y="0" height="${h}" width="${w}" fill="#808080"/><g filter="blur(2px)"><rect x="0" y="0" height="${h}" width="${w}" fill="#000080"/>`
		+ `<rect x="0" y="0" height="${h}" width="${w}" fill="url(#Y)" class="mix"/><rect x="0" y="0" height="${h}" width="${w}" fill="url(#X)" class="mix"/>`
		+ `<rect x="${DEPTH}" y="${DEPTH}" height="${h - 2 * DEPTH}" width="${w - 2 * DEPTH}" fill="#808080" rx="${r}" ry="${r}" filter="blur(${DEPTH}px)"/></g></svg>`);
}

let svg: SVGSVGElement | null = null;
let size = '';
let observer: ResizeObserver | null = null;
let waiting = 0;

function build (): void {
	const row = document.querySelector<HTMLElement>('.rows > .row:first-child');
	if (!row) { waiting = window.setTimeout(build, 500); return; }   // Settings or the guide is open: try again when the home screen is back
	const glass = getComputedStyle(row, '::before');
	const w = Math.round(row.offsetWidth - (parseFloat(glass.left) || 0) - (parseFloat(glass.right) || 0));
	const h = Math.round(parseFloat(glass.height) || 0);
	const r = Math.min(Math.round(parseFloat(glass.borderTopLeftRadius) || 0), Math.floor(h / 2));
	if (!observer) { observer = new ResizeObserver(build); observer.observe(row); }
	if (!w || !h || `${w}x${h}x${r}` === size || !svg) return;
	size = `${w}x${h}x${r}`;
	svg.innerHTML = `<filter id="lg-dock" x="0" y="0" width="${w}" height="${h}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">`
		+ `<feImage href="${displacementMap(w, h, r)}" x="0" y="0" width="${w}" height="${h}" result="map"/>`
		+ `<feDisplacementMap in="SourceGraphic" in2="map" scale="${STRENGTH}" xChannelSelector="R" yChannelSelector="G"/></filter>`;
}

export function setLiquidDock (on: boolean): void {
	document.documentElement.classList.toggle('liquiddock', on);
	window.clearTimeout(waiting);
	if (observer) { observer.disconnect(); observer = null; }
	if (!on) { if (svg) svg.remove(); svg = null; size = ''; return; }
	if (!svg) {
		svg = document.createElementNS(NS, 'svg');
		svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
		svg.style.position = 'absolute';
		document.body.appendChild(svg);
	}
	build();
}
