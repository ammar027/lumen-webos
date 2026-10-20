import {APP_ID, LUNA} from '../config/constants';
import {LOCAL_WALLPAPERS, WALLPAPERS, cloudUrl} from '../config/wallpapers';
import {isWebOS, lunaCall, type LunaResponse} from './luna';
import {shellQuote} from './apps';

export interface Photo {id: string; url: string; caption: string; source: string; bytes?: number; added?: number}
interface Library {photos: Photo[]; refreshed: Record<string, number>}
const KEY = 'trial-photo-library-v1';
const CACHE = '/media/developer/apps/usr/palm/applications/' + APP_ID + '/cache';
const MAX_BYTES = 48 * 1024 * 1024;
let library: Library = (() => { try { const x = JSON.parse(localStorage.getItem(KEY) || '{}'); return {photos: Array.isArray(x.photos) ? x.photos : [], refreshed: x.refreshed || {}}; } catch { return {photos: [], refreshed: {}}; } })();
const pending: Record<string, Promise<void> | undefined> = {};
let prepared: Promise<void> | undefined;
export async function root (command: string, timeout = 10000): Promise<string> {
 const r = await lunaCall<LunaResponse & {stdoutString?: string}>(LUNA.homebrewExec, {command}, timeout);
 return r.stdoutString || '';
}
const publish = () => {
 try { localStorage.setItem(KEY, JSON.stringify(library)); } catch { /* files still usable this session */ }
 window.dispatchEvent(new Event('trial-photos-updated'));
};
export function photoSource (selection: string): string { return selection === 'tigris:anime' ? 'anime' : 'daily'; }
export function isScenic (selection: string): boolean { return selection.indexOf('tigris:') === 0; }
export function cachedPhotos (source: string): Photo[] { return library.photos.filter((p) => p.source === source).sort((a,b) => (b.added || 0) - (a.added || 0)); }
const fallback = (): Photo[] => LOCAL_WALLPAPERS.map((p, i) => ({id: 'default-' + i, url: p.file, caption: p.title, source: 'bundled'}));
export function photoSlides (selection: string, favorites: string[] = []): Photo[] {
 if (selection.indexOf('local:') === 0) return fallback().filter((_,i) => i === Number(selection.slice(6)));
 if (selection.indexOf('cloud:') === 0 || selection.indexOf('shuffle') === 0) {
  const chosen = WALLPAPERS.filter((p) => selection === 'shuffle' || selection === 'cloud:' + p.id || selection === 'shuffle:' + p.category || (selection === 'shuffle:Favorites' && favorites.indexOf(p.id) >= 0));
  if (chosen.length) return chosen.map((p) => ({id: p.id, caption: p.title, source: 'library', url: 'https://images.weserv.nl/?url=' + encodeURIComponent(cloudUrl(p)) + '&w=1920&h=1080&fit=cover&q=82&output=jpg'}));
 }
 const cached = cachedPhotos(photoSource(selection));
 return cached.length ? cached : fallback();
}
export function currentPhoto (selection: string, minutes: number): Photo | undefined {
 const photos = photoSlides(selection);
 const slot = minutes ? Math.floor(Date.now() / (minutes * 60000)) : 0;
 const before = shownSlots[selection];
 if (before && before.slot === slot) { const same = photos.find((p) => p.id === before.id); if (same) return same; }
 const next = photos[minutes ? slot % photos.length : 0];
 if (next) shownSlots[selection] = {slot,id:next.id};
 return next;
}
const shownSlots: Record<string,{slot:number;id:string}> = {};
async function prepare (): Promise<void> {
 if (!isWebOS()) return;
 if (!prepared) prepared = root('mkdir -p ' + shellQuote(CACHE) + '; ls ' + shellQuote(CACHE)).then((files) => {
  const present = files.split(/\s+/);
  library.photos = library.photos.filter((p) => /^cache\/photo-[a-zA-Z0-9-]+\.jpg$/.test(p.url) && present.indexOf(p.url.slice(6)) >= 0);
  publish();
 }).catch((e) => { prepared = undefined; throw e; });
 return prepared;
}
function safeUrl (url: string): string {
 const parsed = new URL(url);
 if (parsed.protocol !== 'https:' || ['www.bing.com', 'cn.bing.com', 'wallhaven.cc', 'w.wallhaven.cc', 'images.weserv.nl'].indexOf(parsed.hostname) < 0) throw new Error('Unsupported photo host');
 return url;
}
async function jsonUrl (url: string): Promise<any> {
 if (!isWebOS()) return fetch(url).then((r) => { if (!r.ok) throw new Error('Photo request failed'); return r.json(); });
 return JSON.parse(await root('curl -fsSL --connect-timeout 8 --max-time 20 --max-filesize 150000 ' + shellQuote(safeUrl(url)), 24000));
}
async function candidates (source: string): Promise<Photo[]> {
 if (source === 'anime') {
  const data = await jsonUrl('https://wallhaven.cc/api/v1/search?categories=010&purity=100&sorting=toplist&topRange=1M&atleast=1920x1080&ratios=16x9&page=1');
  return (data.data || []).filter((x: any) => /^[a-z0-9]+$/.test(x.id) && x.file_size < 8000000).slice(0,12).map((x: any) => ({id: 'anime-' + x.id, source, caption: 'Wallhaven · wallhaven.cc/w/' + x.id, url: 'https://images.weserv.nl/?url=' + encodeURIComponent(safeUrl(x.path)) + '&w=1920&h=1080&fit=cover&q=85&output=jpg'}));
 }
 const data = await jsonUrl('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=en-US');
 return (data.images || []).filter((x: any) => /^\d{8}$/.test(x.startdate) && /^\/th\?id=[A-Za-z0-9._-]+$/.test(x.urlbase)).map((x: any) => ({id: 'daily-' + x.startdate, source, caption: x.copyright || x.title || '', url: 'https://www.bing.com' + x.urlbase + '_1920x1080.jpg'}));
}
async function prune (): Promise<void> {
 const sorted = library.photos.slice().sort((a,b) => (b.added || 0) - (a.added || 0));
 let bytes = 0; const counts: Record<string,number> = {}; const keep: Photo[] = []; const drop: Photo[] = [];
 sorted.forEach((p) => { bytes += p.bytes || 0; counts[p.source] = (counts[p.source] || 0) + 1; (bytes <= MAX_BYTES && counts[p.source] <= 40 ? keep : drop).push(p); });
 if (isWebOS() && drop.length) await root('rm -f ' + drop.filter((p) => /^cache\/photo-[a-zA-Z0-9-]+\.jpg$/.test(p.url)).map((p) => shellQuote(CACHE + '/' + p.url.slice(6))).join(' '));
 library.photos = keep;
}
export async function refreshPhotos (source: string, force = false): Promise<void> {
 if (pending[source]) return pending[source];
 const work = async () => {
  await prepare();
  if (!force && cachedPhotos(source).length >= 4 && Date.now() - (library.refreshed[source] || 0) < 20 * 3600000) return;
  const list = await candidates(source);
  let good = false;
  for (const p of list) {
   if (document.hidden) break;
   if (library.photos.some((x) => x.id === p.id)) { good = true; continue; }
   try {
    if (isWebOS()) {
     const file = 'photo-' + p.id + '.jpg'; const path = CACHE + '/' + file;
     const out = await root('if curl -fsSL --connect-timeout 8 --max-time 25 --max-filesize 3000000 -o ' + shellQuote(path + '.part') + ' ' + shellQuote(safeUrl(p.url)) + '; then mv ' + shellQuote(path + '.part') + ' ' + shellQuote(path) + ' && stat -c %s ' + shellQuote(path) + '; else rm -f ' + shellQuote(path + '.part') + '; exit 1; fi', 30000);
     const bytes = Number(out.trim()); if (!bytes || bytes > 3000000) throw new Error('Photo too large');
     p.url = 'cache/' + file; p.bytes = bytes;
    }
    p.added = Date.now(); library.photos.push(p); good = true;
    await prune(); publish();
   } catch { /* Keep every successful image and the prior offline collection. */ }
  }
  if (good && !document.hidden) library.refreshed[source] = Date.now();
  publish();
  if (!good && !cachedPhotos(source).length) throw new Error('Could not download photos; bundled pictures remain available');
 };
 const task = work().finally(() => { pending[source] = undefined; }); pending[source] = task; return task;
}
export const GRADIENTS: Record<string,string> = {
 green: 'radial-gradient(ellipse at 25% 15%, #127442, transparent 70%), radial-gradient(ellipse at 85% 40%, #233d89, transparent 75%), linear-gradient(#090d14, #090d14)',
 blue: 'radial-gradient(ellipse at 35% 15%, #1559b8, transparent 70%), radial-gradient(ellipse at 90% 50%, #543386, transparent 75%), linear-gradient(#090d18, #090d18)',
 purple: 'radial-gradient(ellipse at 30% 15%, #7138a3, transparent 70%), radial-gradient(ellipse at 80% 40%, #933f76, transparent 75%), linear-gradient(#0e0918, #0e0918)',
 orange: 'radial-gradient(ellipse at 30% 15%, #bd5524, transparent 70%), radial-gradient(ellipse at 90% 50%, #763661, transparent 75%), linear-gradient(#180b0d, #180b0d)',
 graphite: 'radial-gradient(ellipse at 35% 15%, #4b5362, transparent 70%), radial-gradient(ellipse at 90% 50%, #292c44, transparent 75%), linear-gradient(#090b10, #090b10)'
};
