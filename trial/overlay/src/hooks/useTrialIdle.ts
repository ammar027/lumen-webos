import {useEffect, useRef} from 'preact/hooks';
import {isWebOS} from '../lib/luna';
import {root} from '../lib/photos';
import {APP_ID} from '../config/constants';

/** Activity and state are private to the trial. No LG global timer is changed. */
export function useTrialIdle (minutes: number, frame: boolean, onStart: () => void, onStop: () => void): void {
 const latest = useRef({minutes,frame,onStart,onStop}); latest.current = {minutes,frame,onStart,onStop};
 const lastActivity = useRef(Date.now());
 useEffect(() => {
  let lastSync = 0;
  const sync = () => {
   if (!isWebOS() || document.hidden || Date.now()-lastSync < 4000) return;
   lastSync = Date.now();
   const c = latest.current;
   root(`mkdir -p /tmp/lumen-trial; printf '%s\\n' '${Math.round(c.minutes * 60)} ${Math.floor(lastActivity.current/1000)} ${c.frame ? 1 : 0}' > /tmp/lumen-trial/state`).catch(() => undefined);
  };
  const activity = () => { if (!latest.current.frame) lastActivity.current=Date.now(); sync(); };
  const visibility = () => { if (document.hidden) latest.current.onStop(); else { lastActivity.current=Date.now(); lastSync=0; sync(); } };
  const launch = () => {
   try { const sys = (window as Window & {PalmSystem?: {launchParams?: string}}).PalmSystem;
    const p = JSON.parse(sys && sys.launchParams || '{}'); if (p.mode === 'photos') latest.current.onStart();
   } catch { /* ordinary launch */ }
  };
  launch(); sync();
  if (isWebOS()) root(`mkdir -p /tmp/lumen-trial; nohup sh /media/developer/apps/usr/palm/applications/${APP_ID}/trial-idle-watch.sh > /tmp/lumen-trial/watch.log 2>&1 < /dev/null &`).catch(() => undefined);
  const id = window.setInterval(() => { const c=latest.current; if (!document.hidden && !c.frame && c.minutes>0 && Date.now()-lastActivity.current >= c.minutes*60000) c.onStart(); },1000);
  const events = ['keydown','mousemove','click','wheel']; events.forEach((e) => window.addEventListener(e,activity,{passive:true}));
  document.addEventListener('visibilitychange',visibility); document.addEventListener('webOSRelaunch',launch);
  const start = () => latest.current.onStart(); window.addEventListener('trial-start-frame',start);
  return () => { window.clearInterval(id); events.forEach((e) => window.removeEventListener(e,activity)); document.removeEventListener('visibilitychange',visibility); document.removeEventListener('webOSRelaunch',launch); window.removeEventListener('trial-start-frame',start); };
 },[]);
 useEffect(() => {
  lastActivity.current = Date.now();
  if (!isWebOS() || document.hidden) return;
  root(`mkdir -p /tmp/lumen-trial; printf '%s\\n' '${Math.round(minutes * 60)} ${Math.floor(Date.now()/1000)} ${frame ? 1 : 0}' > /tmp/lumen-trial/state`).catch(() => undefined);
 },[minutes,frame]);
}
