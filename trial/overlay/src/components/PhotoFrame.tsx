import {useEffect, useRef, useState} from 'preact/hooks';
import {Clock} from './Clock';
import {langLocale} from '../lib/i18n';
import {photoSlides, type Photo} from '../lib/photos';

interface Props {selection: string; seconds: number; favorites: string[]; showPeriod: boolean; onClose: () => void}
interface Slide {key: number; photo: Photo; zoomIn: boolean}
function FrameClock ({showPeriod}: {showPeriod: boolean}) {
 const [now,setNow] = useState(new Date());
 useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 60000); return () => window.clearInterval(id); }, []);
 const minute = Math.floor(now.getTime() / 60000);
 return <div class="photo-frame__clock" style={{transform: `translate(${(minute % 7 - 3) * 3}px,${(minute % 5 - 2) * 3}px)`}}>
  <Clock showPeriod={showPeriod} />
  <div class="photo-frame__date">{now.toLocaleDateString(langLocale(), {weekday:'long',month:'long',day:'numeric'})}</div>
 </div>;
}
export function PhotoFrame ({selection,seconds,favorites,showPeriod,onClose}: Props) {
 const [slides,setSlides] = useState<Slide[]>([]);
 const [failed,setFailed] = useState(false);
 const close = useRef(onClose); close.current = onClose;
 const serial = useRef(0);
 const favoritesKey = favorites.join(',');
 useEffect(() => {
  let stopped = false; let timer = 0; let cleanup = 0; let image: HTMLImageElement | undefined; let pos = 0; let errors = 0;
  const advance = () => {
   if (stopped || document.hidden) return;
   const photos = photoSlides(selection,favorites);
   if (!photos.length) { setFailed(true); return; }
   const photo = photos[pos++ % photos.length]; image = new Image();
   image.onload = () => {
    if (stopped) return;
    errors = 0; setFailed(false);
    const slide = {key: ++serial.current, photo, zoomIn: serial.current % 2 === 0};
    setSlides((old) => old.slice(-1).concat(slide));
    window.clearTimeout(cleanup); cleanup = window.setTimeout(() => { if (!stopped) setSlides((old) => old.slice(-1)); },2100);
    timer = window.setTimeout(advance,seconds * 1000);
   };
   image.onerror = () => { if (stopped) return; if (++errors >= photos.length) { setFailed(true); timer = window.setTimeout(advance,15000); } else timer = window.setTimeout(advance,300); };
   image.src = photo.url;
  };
  advance();
  return () => { stopped = true; window.clearTimeout(timer); window.clearTimeout(cleanup); if (image) { image.onload = null; image.onerror = null; } };
 },[selection,seconds,favoritesKey]);
 useEffect(() => {
  const wakeCodes = [13,27,8,461,37,38,39,40];
  const key = (e: KeyboardEvent) => { if (wakeCodes.indexOf(e.keyCode) < 0) return; e.preventDefault(); e.stopImmediatePropagation(); if (e.type === 'keyup') close.current(); };
  const pointer = (e: Event) => { e.preventDefault(); e.stopImmediatePropagation(); close.current(); };
  const started = Date.now(); let first: {x:number;y:number} | undefined;
  const move = (e: MouseEvent) => { if (Date.now()-started < 700) return; if (!first) { first = {x:e.clientX,y:e.clientY}; return; } if (Math.abs(e.clientX-first.x)+Math.abs(e.clientY-first.y)>12) pointer(e); };
  const visibility = () => { if (document.hidden) close.current(); };
  window.addEventListener('keydown',key,true); window.addEventListener('keyup',key,true);
  window.addEventListener('click',pointer,true); window.addEventListener('wheel',pointer,true); window.addEventListener('mousemove',move,true);
  document.addEventListener('visibilitychange',visibility);
  return () => { window.removeEventListener('keydown',key,true); window.removeEventListener('keyup',key,true); window.removeEventListener('click',pointer,true); window.removeEventListener('wheel',pointer,true); window.removeEventListener('mousemove',move,true); document.removeEventListener('visibilitychange',visibility); };
 },[]);
 const current = slides[slides.length-1];
 return <div class="photo-frame" role="dialog" aria-label="Photo screensaver">
  {slides.map((slide) => <div class="photo-frame__slide" key={slide.key}>
   <img src={slide.photo.url} alt="" class={slide.zoomIn ? 'photo-frame__image photo-frame__image--in' : 'photo-frame__image'} style={{animationDuration: `${seconds+2}s`}} />
  </div>)}
  <div class="photo-frame__shade" />
  <FrameClock showPeriod={showPeriod} />
  <div class="photo-frame__caption">{current ? current.photo.caption : failed ? 'Photos unavailable. Press Back to return.' : 'Opening photo frame…'}</div>
 </div>;
}
