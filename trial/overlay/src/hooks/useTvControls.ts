import {useEffect, useRef, useState} from 'preact/hooks';
import {readControls, UNKNOWN_CONTROLS, type Controls, type ControlSnapshot} from '../lib/tvcontrols';

/** Poll only while the panel is visible. A write invalidates older reads, so a
 * delayed response cannot overwrite a confirmed change or resurrect stale values. */
export function useTvControls (onError:(text:string)=>void) {
 const [snapshot,setSnapshot] = useState<ControlSnapshot>({values:{...UNKNOWN_CONTROLS},pictureModes:[],soundModes:[]});
 const [loading,setLoading] = useState(true);
 const [busy,setBusy] = useState<keyof Controls | null>(null);
 const life = useRef({alive:true,reading:false,writing:false,revision:0});
 const latest = useRef({snapshot,onError});latest.current={snapshot,onError};
 useEffect(() => {
  const state=life.current;state.alive=true;
  const refresh=async () => {
   if(document.hidden || state.reading || state.writing)return;
   state.reading=true;const revision=state.revision;
   try {
    const next=await readControls(true);
    if(state.alive && !state.writing && revision===state.revision){setSnapshot(next);setLoading(false);}
   } finally {state.reading=false;}
  };
  const first=window.setTimeout(refresh,120),poll=window.setInterval(refresh,4000);
  const visible=() => {if(!document.hidden)refresh();};
  document.addEventListener('visibilitychange',visible);
  return () => {state.alive=false;window.clearTimeout(first);window.clearInterval(poll);document.removeEventListener('visibilitychange',visible);};
 },[]);
 async function change<K extends keyof Controls>(field:K, expected:NonNullable<Controls[K]>, action:()=>Promise<void>):Promise<boolean> {
  const state=life.current;
  if(state.writing)return false;
  state.writing=true;state.revision++;setBusy(field);
  try {
   await action();
   const next=await readControls(false),actual=next.values[field];
   if(actual===null){
    if(state.alive)setSnapshot(s => ({...s,values:{...s.values,[field]:null}}));
    throw new Error('The TV accepted the command, but its value could not be confirmed');
   }
   if(actual!==expected)throw new Error('The TV did not apply that change');
   if(state.alive)setSnapshot(s => ({...s,values:next.values}));
   return true;
  } catch(e) {
   if(state.alive)latest.current.onError(e instanceof Error ? e.message : "Couldn't change that setting");
   return false;
  } finally {state.writing=false;state.revision++;if(state.alive)setBusy(null);}
 }
 return {...snapshot,loading,busy,change};
}
