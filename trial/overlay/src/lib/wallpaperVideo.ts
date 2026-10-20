// The optional video wallpaper: one muted <video> behind the launcher that plays the list in a random order. Plays only while
// the launcher is on screen, and the launcher falls back to the still wallpaper if a video can't play.

import {WALLPAPER_VIDEOS, type WallpaperVideo} from '../config/wallpaperVideos';

const HTML_CLASS = 'wp-video';
const APPLE_HTTPS = /^https:\/\/sylvan\.apple\.com\//;

let video: HTMLVideoElement | null = null;
let enabled = false;
let order: number[] = [];
let position = 0;
let useHttp = false;      // some TVs refuse Apple's certificate; the same file over http then plays
let failures = 0;
let current: WallpaperVideo | null = null;

/** the clip on screen (null when no video plays), for the caption */
export function getCurrentClip (): WallpaperVideo | null { return current; }
function announce (clip: WallpaperVideo | null): void { current = clip; window.dispatchEvent(new Event('lumen-clip')); }
let lastKey = 0;
if (typeof document !== 'undefined') document.addEventListener('keydown', () => { lastKey = Date.now(); }, true);

/** the video's start-up costs the TV a moment: begin when the launcher has settled and no key was pressed just now */
function startWhenQuiet (): void {
	const check = () => {
		if (!enabled) return;
		if (Date.now() - lastKey < 1500) { window.setTimeout(check, 700); return; }
		playCurrent();
	};
	window.setTimeout(check, Math.max(0, 6000 - performance.now()));
}
let releaseTimer = 0;
let paused = false;          // held while Settings is open (the video is hidden behind it, so it need not decode)
let released = false;       // the clip was dropped while the launcher was out of sight
let choice: string[] = [];   // [] = all places in a random order, else only the clips of those places

export const VIDEO_PLACES: string[] = WALLPAPER_VIDEOS.map((v) => v.name).filter((n, i, all) => all.indexOf(n) === i);

function shuffle (): number[] {
	const list = WALLPAPER_VIDEOS.map((_, i) => i).filter((i) => choice.length === 0 || choice.indexOf(WALLPAPER_VIDEOS[i].name) >= 0);
	for (let i = list.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const t = list[i]; list[i] = list[j]; list[j] = t;
	}
	return list;
}

function playCurrent (): void {
	if (!video || !enabled || WALLPAPER_VIDEOS.length === 0) return;
	if (order.length === 0) order = shuffle();
	const url = WALLPAPER_VIDEOS[order[position % order.length]].url;
	released = false;
	video.src = useHttp ? url.replace(APPLE_HTTPS, 'http://sylvan.apple.com/') : url;
	if (!paused) video.play().catch(() => { /* onerror moves on */ });
}

function next (): void {
	position += 1;
	if (position >= order.length) { order = shuffle(); position = 0; }
	playCurrent();
}

function onError (): void {
	failures += 1;
	if (!useHttp && failures === 1) { useHttp = true; playCurrent(); return; }
	if (failures >= 4) { stop(); return; }
	next();
}

function ensureVideo (): HTMLVideoElement {
	if (video) return video;
	video = document.createElement('video');
	video.id = 'bgvideo';
	video.muted = true;
	video.setAttribute('playsinline', '');
	video.preload = 'auto';
	video.addEventListener('playing', () => { announce(WALLPAPER_VIDEOS[order[position % order.length]] || null); failures = 0; document.documentElement.classList.add(HTML_CLASS); });
	video.addEventListener('ended', next);
	video.addEventListener('error', onError);
	document.body.insertBefore(video, document.body.firstChild);
	document.addEventListener('visibilitychange', () => {
		window.clearTimeout(releaseTimer);
		if (!video || !enabled) return;
		if (document.hidden) {
			video.pause();
			// out of sight for a while: let go of the decoder and its buffers
			releaseTimer = window.setTimeout(() => { if (video && enabled) { released = true; video.removeAttribute('src'); video.load(); } }, 5000);
		} else if (released) playCurrent();
		else if (!paused) video.play().catch(() => {});
	});
	return video;
}

function stop (): void {
	enabled = false;
	announce(null);
	document.documentElement.classList.remove(HTML_CLASS);
	if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
}

export function setVideoWallpaper (on: boolean): void {
	if (on === enabled) return;
	if (!on) { stop(); return; }
	enabled = true;
	failures = 0;
	ensureVideo();
	startWhenQuiet();
}

export function setVideoChoice (places: string[]): void {
	const next = places.filter((p) => VIDEO_PLACES.indexOf(p) >= 0);
	if (next.join('|') === choice.join('|')) return;
	choice = next;
	order = []; position = 0;
	if (enabled) playCurrent();
}

export function setVideoPaused (hold: boolean): void {
	if (hold === paused) return;
	paused = hold;
	if (!video || !enabled || document.hidden) return;
	if (hold) video.pause();
	else if (released || !video.getAttribute('src')) playCurrent();
	else video.play().catch(() => { /* onerror moves on */ });
}
