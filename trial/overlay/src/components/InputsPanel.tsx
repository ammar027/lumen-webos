import {useEffect, useRef, useState} from 'preact/hooks';
import {useKeys, clamp} from '../hooks/useKeys';
import {inputName, inputPort, listInputs, type InputSource} from '../lib/inputs';
import {isWebOS} from '../lib/luna';
import {launchApp} from '../lib/launch';
import {CheckMark, Glyph, type GlyphName} from './Glyph';
import {Surface} from './Surface';
import {t as tr} from '../lib/i18n';

interface Props {inputs:InputSource[]; sourceIds:string[]|null; lastInput:string; onLastInput:(id:string)=>void; onClose:()=>void; onError:(text:string)=>void}
export function InputsPanel ({inputs,sourceIds,lastInput,onLastInput,onClose,onError}: Props) {
 const [items,setItems]=useState(inputs);
 const preferred=(all:InputSource[])=>Math.max(0,all.findIndex(s=>s.active) >= 0 ? all.findIndex(s=>s.active) : all.findIndex(s=>s.appId===lastInput));
 const [index,setIndex]=useState(()=>preferred(inputs));
 const [loading,setLoading]=useState(isWebOS());
 const [busy,setBusy]=useState(false);
 const touched=useRef(false),view=useRef<HTMLDivElement>(null),life=useRef({alive:true,writing:false});
 const selected=clamp(index,0,Math.max(0,items.length-1));
 useEffect(()=>{
  let alive=true;
  if(!isWebOS())return;
  listInputs().then(all=>{
   if(!alive)return;
   const next=sourceIds ? sourceIds.map(id=>all.find(s=>s.appId===id)).filter((s):s is InputSource=>!!s) : all;
   setItems(next);if(!touched.current)setIndex(preferred(next));
  }).catch(()=>{if(alive)onError('Could not refresh the input status');}).finally(()=>{if(alive)setLoading(false);});
  return ()=>{alive=false;};
 },[]);
 useEffect(()=>()=>{life.current.alive=false;},[]);
 const move=(next:number)=>{touched.current=true;setIndex(clamp(next,0,items.length-1));};
 const activate=async(i:number)=>{
  const item=items[i],state=life.current;if(!item||state.writing)return;
  state.writing=true;setBusy(true);
  try {if(isWebOS())await launchApp(item.appId);onLastInput(item.appId);if(state.alive)onClose();}
  catch {if(state.alive)onError('Could not switch to '+inputName(item));}
  finally{state.writing=false;if(state.alive)setBusy(false);}
 };
 useKeys(key=>{
  if(key==='back')onClose();
  else if(key==='left'&&selected%2===1)move(selected-1);
  else if(key==='right'&&selected%2===0&&selected+1<items.length)move(selected+1);
  else if(key==='up')move(selected-2);
  else if(key==='down'&&selected+2<items.length)move(selected+2);
  else if(key==='enter')activate(selected);
  return true;
 });
 useEffect(()=>{
  const v=view.current,el=v&&v.children[selected] as HTMLElement|undefined;if(!v||!el)return;
  if(el.offsetTop<v.scrollTop+16)v.scrollTop=el.offsetTop-16;
  else if(el.offsetTop+el.offsetHeight>v.scrollTop+v.clientHeight-16)v.scrollTop=el.offsetTop+el.offsetHeight-v.clientHeight+16;
 },[selected,items.length]);
 return <Surface title="Inputs" meta={busy?'Switching…':loading?'Refreshing…':`${items.length} sources`} className="panel--inputs" onBack={onClose}>
  <div class="inputs-grid" ref={view} aria-busy={busy}>
   {items.map((s,i)=>{
    const name=inputName(s),port=inputPort(s),detail=[name===port?'':port,s.connected===true?'Connected':s.connected===false?'Not connected':''].filter(Boolean).join(' · ');
    const status=s.active?'Active':s.appId===lastInput?'Last used':'';
    const glyph:GlyphName=s.id==='LIVE_TV'?'picture':s.icon.indexOf('game')>=0?'gamepad':s.id.indexOf('AV_')===0?'av':'inputs';
    return <button type="button" tabIndex={-1} key={s.appId} data-input={s.appId}
     class={`surface-button input-card${selected===i?' surface-button--focused':''}`} aria-label={`${name}, ${detail}${status?', '+status:''}`}
     aria-disabled={busy} onMouseEnter={()=>move(i)} onClick={()=>activate(i)}>
     <span class="input-card__top"><Glyph name={glyph}/>{status&&<span class="input-card__status">{s.active&&<CheckMark/>}{tr(status)}</span>}</span>
     <span class="input-card__name">{name}</span><span class="input-card__detail">{tr(detail || 'Status unavailable')}</span>
    </button>;
   })}
   {!items.length&&<div class="surface__empty">{loading?'Loading inputs…':'Add inputs in Settings → Sources'}</div>}
  </div>
  <div class="surface__foot">{tr('OK switches source · Back returns')}</div>
 </Surface>;
}
