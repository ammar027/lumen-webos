// Available apps. Two providers:
//
//  1. Catalogue (default, no root): config/catalog.ts filtered by getAppLoadStatus.
//  2. Homebrew Channel (opt-in, rooted TVs only): the Homebrew Channel's service runs
//     shell commands as root for any app that asks. With the user's consent (an option
//     in Settings, off by default) we use it to run `luna-send listLaunchPoints`, which
//     gives the live list with LG's own titles, and to read each icon as base64. If the
//     service isn't there, we fall back to the catalogue.

import {APP_CATALOG, type CatalogApp} from '../config/catalog';
import {APP_ID, LUNA} from '../config/constants';
import {isWebOS, lunaCall, type LunaResponse} from './luna';
import {appExists} from './launch';
import {ICON_PACK} from '../config/iconpack';
import {SYSTEM_APPS} from '../config/systemApps';

export interface AppEntry {
	id: string;
	title: string;
	/** image URL (relative asset path or data: URI); undefined → monogram */
	iconUrl?: string;
	color?: string;
	/** a small square icon (not full tile artwork): drawn at a sharp size on a tile coloured like it */
	plain?: boolean;
}

export type AppSource = 'catalog' | 'homebrew';

export interface AppList {
	apps: AppEntry[];
	/** where the list actually came from (homebrew falls back to catalog) */
	source: AppSource;
}

const ICON_DIR = 'icons/apps/';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

/** An icon from the drop-in icon pack (public/iconpack), matched by the app's id or title. It wins over every other icon. */
export function packIcon (id: string, title: string): string | undefined {
	const file = ICON_PACK[slug(id)] || ICON_PACK[slug(title)];
	return file ? 'iconpack/' + file : undefined;
}

export function listApps (useHomebrew: boolean, showSystem = false): Promise<AppList> {
	return listAppsBase(useHomebrew).then((list) => (showSystem ? addSystemApps(list) : list));
}

function addSystemApps (list: AppList): Promise<AppList> {
	const have = list.apps.map((a) => a.id);
	const extra = SYSTEM_APPS.filter((a) => have.indexOf(a.id) === -1);
	const check = isWebOS() ? Promise.all(extra.map((a) => appExists(a.id))) : Promise.resolve(extra.map(() => true));
	return check.then((present) => ({...list, apps: list.apps.concat(extra.filter((_, i) => present[i]).map((a) => ({id: a.id, title: a.title, iconUrl: packIcon(a.id, a.title), color: a.color})))}));
}

function listAppsBase (useHomebrew: boolean): Promise<AppList> {
	if (!isWebOS()) return Promise.all(catalogEntries(APP_CATALOG).map(withIconColor)).then((apps): AppList => ({apps, source: 'catalog'}));
	const catalog = () => listViaCatalog().then((apps): AppList => ({apps, source: 'catalog'}));
	if (!useHomebrew) return catalog();
	return listViaHomebrew()
		.then((apps): AppList => ({apps, source: 'homebrew'}))
		.catch(catalog);
}

// ---------- provider 1: catalogue ----------

/** dev preview only: ?plain shows the catalogue's small icons the way unknown apps are drawn */
const DEV_PLAIN = import.meta.env.DEV && /[?&]plain/.test(location.search);

function catalogEntries (apps: CatalogApp[]): AppEntry[] {
	return apps.map((a) => ({
		id: a.id,
		title: a.title,
		iconUrl: (DEV_PLAIN ? undefined : packIcon(a.id, a.title)) || (a.icon ? ICON_DIR + a.icon : undefined),
		color: a.color,
		plain: DEV_PLAIN ? !!a.icon : (!packIcon(a.id, a.title) && !!a.icon)
	}));
}

function listViaCatalog (): Promise<AppEntry[]> {
	return Promise.all(APP_CATALOG.map((a) => appExists(a.id)))
		.then((present) => Promise.all(catalogEntries(APP_CATALOG.filter((_, i) => present[i])).map(withIconColor)));
}

// ---------- provider 2: Homebrew Channel (opt-in) ----------

interface ExecResponse extends LunaResponse { stdoutString?: string; }
interface LaunchPoint { id: string; title: string; largeIcon?: string; icon?: string; }

/** Apps LG lists but that make no sense on a launcher (ourselves, promos). */
const HIDDEN_IDS = [APP_ID, 'com.ammar027.lumen', 'google.assistant.promo', 'com.webos.app.discovery'];


/** Icon paths must be plain absolute paths. Anything else (quotes, spaces, control
 *  characters, shell syntax) is skipped rather than passed to a root shell. */
const SAFE_PATH = /^\/[A-Za-z0-9._\/+@-]+$/;

/** Quote a value for a POSIX shell. Defence in depth: paths are also validated. */
export function shellQuote (value: string): string {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}

function exec (command: string, timeoutMs = 8000): Promise<string> {
	return lunaCall<ExecResponse>(LUNA.homebrewExec, {command}, timeoutMs).then((r) => r.stdoutString || '');
}

function listViaHomebrew (): Promise<AppEntry[]> {
	return exec("luna-send -n 1 luna://com.webos.applicationManager/listLaunchPoints '{}'")
		.then((out) => {
			const parsed = JSON.parse(out) as {launchPoints?: LaunchPoint[]};
			const points = (parsed.launchPoints || []).filter((p) => p.id && p.title && HIDDEN_IDS.indexOf(p.id) === -1);
			if (!points.length) throw new Error('no launch points');
			return loadIcons(points).then((icons) => Promise.all(points.map((p) => {
				const known = APP_CATALOG.find((c) => c.id === p.id);
				return {
					id: p.id,
					// the catalogue's titles are shorter than LG's ("IPTV Player" vs "webOS IPTV Player")
					title: known ? known.title : p.title,
					iconUrl: packIcon(p.id, known ? known.title : p.title) || icons[p.id] || (known && known.icon ? ICON_DIR + known.icon : undefined),
					color: known && known.color,
					plain: !packIcon(p.id, known ? known.title : p.title) && !!(icons[p.id] || (known && known.icon))
				} as AppEntry;
			}).map(withIconColor)));
		});
}

/** Bounded requests keep Homebrew's Node 8 stdout buffer below 200 KiB.
 * Cache identity includes file size and modification time, not just the path. */
export async function loadIcons (points: LaunchPoint[], run = exec): Promise<Record<string, string>> {
 const result: Record<string, string> = {};
 const cache: Record<string, string> = (() => { try { return JSON.parse(localStorage.getItem('trial-icons-v2') || '{}'); } catch { return {}; } })();
 const jobs = points.map((p) => ({id: p.id, path: p.largeIcon || p.icon || ''})).filter((p) => SAFE_PATH.test(p.path));
 if (!jobs.length) return result;
 const metadata = await run(jobs.map((p, i) => `printf '${i} '; stat -c '%s %Y' ${shellQuote(p.path)} 2>/dev/null || echo missing`).join('; ')).catch(() => '');
 const stats: Record<number, {size: number; stamp: string}> = {};
 metadata.split('\n').forEach((line) => { const m = /^(\d+) (\d+) (\d+)$/.exec(line); if (m) stats[Number(m[1])] = {size: Number(m[2]), stamp: m[3]}; });
 const kept: Record<string, string> = {};
 let cursor = 0;
 const worker = async () => {
  while (cursor < jobs.length) {
   const at = cursor++; const job = jobs[at]; const st = stats[at];
   if (!st || !st.size || st.size > 2 * 1024 * 1024) continue;
   const key = `${job.path}:${st.size}:${st.stamp}`;
   try {
    let url = cache[key];
    if (!url) {
     let encoded = '';
     for (let offset = 0; offset < st.size; offset += 24576) {
      const piece = (await run(`dd if=${shellQuote(job.path)} bs=24576 skip=${offset / 24576} count=1 2>/dev/null | base64 | tr -d '\\n'`, 8000)).trim();
      if (!piece || !/^[A-Za-z0-9+/]+={0,2}$/.test(piece)) throw new Error('invalid icon chunk');
      encoded += piece;
     }
     const mime = encoded.indexOf('/9j/') === 0 ? 'image/jpeg' : encoded.indexOf('UklGR') === 0 ? 'image/webp' : encoded.indexOf('iVBOR') === 0 ? 'image/png' : '';
     if (!mime) continue;
     url = `data:${mime};base64,${encoded}`;
    }
    result[job.id] = url; kept[key] = url;
   } catch { /* one failed icon never discards the others */ }
  }
 };
 await Promise.all([worker(), worker(), worker()]);
 try { if (JSON.stringify(kept).length < 4 * 1024 * 1024) localStorage.setItem('trial-icons-v2', JSON.stringify(kept)); } catch { /* usable uncached */ }
 return result;
}

/** The colour of an icon's own background (a pixel at its left edge, or its top), so a small icon can sit on a tile of the same colour. Icons read from the TV
 *  are data: URIs, so the canvas can be read; a file the app ships may not allow it, then the catalogue colour (or a dark default) is used. */
const COLOR_CACHE_KEY = 'launcher-icon-colors-v1';

function readColorCache (): Record<string, string> {
	try { return JSON.parse(localStorage.getItem(COLOR_CACHE_KEY) || '{}') as Record<string, string>; } catch { return {}; }
}

function sampleColor (url: string): Promise<string | undefined> {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			try {
				// a 16 x 16 copy: reading back a handful of pixels from a small canvas is cheap, from a full-size icon it freezes the TV
				const c = document.createElement('canvas');
				c.width = 16; c.height = 16;
				const g = c.getContext('2d');
				if (!g) { resolve(undefined); return; }
				g.drawImage(img, 0, 0, 16, 16);
				const spots = [[1, 8], [8, 1], [14, 8]];
				for (const [x, y] of spots) {
					const d = g.getImageData(x, y, 1, 1).data;
					if (d[3] > 200) { resolve(`rgb(${d[0]}, ${d[1]}, ${d[2]})`); return; }
				}
				resolve(undefined);
			} catch { resolve(undefined); }
		};
		img.onerror = () => resolve(undefined);
		img.src = url;
	});
}

/** colours already found are kept by app id and icon size, so launching again does no image work at all */
function withIconColor (entry: AppEntry): Promise<AppEntry> {
	if (!entry.plain || !entry.iconUrl) return Promise.resolve(entry);
	const key = `${entry.id}:${entry.iconUrl.length}`;
	const cache = readColorCache();
	if (cache[key]) return Promise.resolve({...entry, color: cache[key]});
	return sampleColor(entry.iconUrl).then((color) => {
		if (color) {
			const next = readColorCache();
			next[key] = color;
			try { localStorage.setItem(COLOR_CACHE_KEY, JSON.stringify(next)); } catch { /* full: sampled again next time */ }
		}
		return {...entry, color: color || entry.color};
	});
}

/** What a fresh install shows on the home screen: the catalogue's favourites first, then the other installed apps, without the TV's own system apps. */
export function seedAppIds (apps: AppEntry[], preferred: string[]): string[] {
	const system = /^(com\.webos\.|com\.palm\.|com\.lge\.|airplay$|google\.assistant|amazon\.alexa|yandex\.alice)/;
	const rest = apps.filter((a) => preferred.indexOf(a.id) === -1 && !system.test(a.id)).map((a) => a.id);
	const first = preferred.filter((id) => apps.some((a) => a.id === id));
	return first.concat(rest).slice(0, 24);
}
