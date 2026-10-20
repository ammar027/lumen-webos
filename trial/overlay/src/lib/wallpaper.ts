import {bakeBackdrop} from './glass';
// Still wallpaper behind the home screen. Choices: local:N (bundled in the app, always works), cloud:<id> (from the cloud
// library in config/wallpapers.ts, loaded over the internet when picked), shuffle (a random cloud one each launch), none.
// A cloud picture that can't load falls back to the bundled default, so the screen is never blank.

import {currentPhoto, GRADIENTS, isScenic} from './photos';
import {LOCAL_WALLPAPERS, WALLPAPERS, cloudUrl} from '../config/wallpapers';

const HTML_CLASS = 'wp-image';
const PROXY = 'https://images.weserv.nl/';       // free image resizer: a 1920-wide copy instead of the multi-MB original

/** Resized copy of a cloud picture (width in px). */
export function resized (url: string, width: number): string {
	return `${PROXY}?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}&w=${width}&h=${Math.round(width * 9 / 16)}&fit=cover&q=${width > 800 ? 82 : 70}&output=jpg`;
}

let favorites: string[] = [];
/** the favourite cloud ids, for the 'shuffle:Favorites' choice */
export function setFavorites (ids: string[]): void { favorites = ids; }

function candidates (sel: string): string[] {
	const fallback = LOCAL_WALLPAPERS.length > 0 ? [LOCAL_WALLPAPERS[0].file] : [];
	if (sel.indexOf('photo:') === 0) return [sel.slice(6)].concat(fallback);
 if (sel === 'none') return [];
	if (sel.indexOf('local:') === 0) {
		const item = LOCAL_WALLPAPERS[Number(sel.slice(6))];
		return item ? [item.file].concat(fallback) : fallback;
	}
	let id = sel.indexOf('cloud:') === 0 ? sel.slice(6) : '';
	if (sel.indexOf('shuffle') === 0) {
		// 'shuffle' = anything from the cloud library; 'shuffle:<category>' = only that category
		const group = sel === 'shuffle:Favorites' ? WALLPAPERS.filter((w) => favorites.indexOf(w.id) !== -1) : sel.indexOf('shuffle:') === 0 ? WALLPAPERS.filter((w) => w.category === sel.slice(8)) : WALLPAPERS;
		if (group.length > 0) id = group[Math.floor(Math.random() * group.length)].id;
	}
	const item = WALLPAPERS.filter((w) => w.id === id)[0];
	if (!item) return fallback;
	const url = cloudUrl(item);
	return [resized(url, 1920), url].concat(fallback);
}

/** A small pre-blurred copy of the picture now shown: bundled defaults have a -blur.jpg beside them; cloud pictures get a tiny
 *  blurred version from the same resizer. The glass shapes show it through, which costs nothing per frame (no live blur). */
function blurFor (shown: string): string | undefined {
	if (shown.indexOf('wallpapers/default-') === 0) return new URL(shown.replace(/\.jpg$/, '-blur.jpg'), location.href).href;
	if (shown.indexOf(PROXY) === 0) return shown.replace(/w=\d+&h=\d+/, 'w=960&h=540').replace(/q=\d+/, 'q=80') + '&blur=5';
	return undefined;
}

function setBlur (shown: string | null): void {
 const marker = token; const style=document.documentElement.style;
 if (!shown) { ['--wp-blur','--wp-bg','--dock-glass'].forEach((key)=>style.removeProperty(key)); return; }
 const image=new Image();
 image.onload=()=>{if(marker!==token)return;try{
  const baked=bakeBackdrop(image);if(marker!==token)return;
  style.setProperty('--wp-blur',`url("${baked.blur}")`);style.setProperty('--wp-bg',`url("${baked.blur}")`);style.setProperty('--dock-glass',`url("${baked.dock}")`);
 }catch{const fallback=blurFor(shown);if(fallback){style.setProperty('--wp-blur',`url("${fallback}")`);style.setProperty('--wp-bg',`url("${fallback}")`);}style.removeProperty('--dock-glass');}};
 image.src=shown;
}

let element: HTMLElement | null = null;
let shown: string | null = null;      // the picture on screen, kept so it can be put back after it was released
let releaseTimer = 0;
let released = false;
let token = 0;

function ensureElement (): HTMLElement {
	if (element) return element;
	element = document.createElement('div');
	element.id = 'wpimage';
	document.body.insertBefore(element, document.body.firstChild);
	document.addEventListener('visibilitychange', () => {
		window.clearTimeout(releaseTimer);
		if (document.hidden) {
			releaseTimer = window.setTimeout(() => {
				if (!element || !shown) return;
				released = true;
				element.style.backgroundImage = 'none';
				document.documentElement.style.removeProperty('--wp-blur');
				document.documentElement.style.removeProperty('--wp-bg');
                document.documentElement.style.removeProperty('--dock-glass');
			}, 5000);
		} else if (released && element && shown) {
			released = false;
			element.style.backgroundImage = `url("${shown}")`;
			setBlur(shown);
		}
	});
	return element;
}

function setLegacyWallpaper (sel: string): void {
	const el = ensureElement();
	const mine = ++token;
	const list = candidates(sel);
	const root = document.documentElement.classList;
	if (list.length === 0) { shown = null; released = false; root.remove(HTML_CLASS); el.style.backgroundImage = 'none'; setBlur(null); return; }
	const tryAt = (i: number) => {
		if (mine !== token) return;                      // a newer choice replaced this one
		if (i >= list.length) { root.remove(HTML_CLASS); return; }
		const img = new Image();
		img.onload = () => {
			if (mine !== token) return;
			shown = list[i];
			released = false;
			el.style.backgroundImage = `url("${list[i]}")`;
			root.add(HTML_CLASS);
			setBlur(list[i]);
		};
		img.onerror = () => tryAt(i + 1);
		img.src = list[i];
	};
	tryAt(0);
}

export function setWallpaper (sel: string, minutes = 30): void {
 document.documentElement.classList.toggle('scenic', isScenic(sel) || sel.indexOf('gradient:') === 0);
 if (sel.indexOf('gradient:') === 0) {
  ++token; shown = null; released = false; document.documentElement.style.removeProperty('--dock-glass');
  const el = ensureElement(); const gradient = GRADIENTS[sel.slice(9)] || GRADIENTS.green;
  el.style.backgroundImage = gradient; document.documentElement.classList.add(HTML_CLASS);
  document.documentElement.style.setProperty('--wp-bg',gradient); document.documentElement.style.setProperty('--wp-blur',gradient); return;
 }
 if (isScenic(sel)) { const p = currentPhoto(sel,minutes); setLegacyWallpaper(p ? 'photo:' + p.url : 'local:0'); return; }
 setLegacyWallpaper(sel);
}
