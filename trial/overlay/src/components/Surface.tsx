import type {ComponentChildren} from 'preact';
import {useEffect, useRef, useState} from 'preact/hooks';
import {useKeys, clamp} from '../hooks/useKeys';
import {playNavigationTick} from '../lib/navigationSound';
import {CheckMark, Glyph} from './Glyph';
import {t as tr} from '../lib/i18n';

export function Surface ({title, meta, className='', onBack, children}: {title:string; meta?:string; className?:string; onBack:()=>void; children:ComponentChildren}) {
 return <>
  <div class="panel-backdrop" onClick={onBack} />
  <div class={`panel panel--surface ${className}`} role="dialog" aria-label={tr(title)}>
   <div class="surface__head">
    <button type="button" tabIndex={-1} class="surface__back" onClick={onBack} aria-label={tr('Back')}><Glyph name="back" /></button>
    <h2 class="surface__title">{tr(title)}</h2>
    {meta && <span class="surface__meta">{meta}</span>}
   </div>
   {children}
  </div>
 </>;
}
export interface Choice {id:string; label:string; detail?:string; checked?:boolean; disabled?:boolean}
export function ChoiceList ({title, choices, initialId, busy=false, message, onChoose, onBack}: {title:string; choices:Choice[]; initialId?:string; busy?:boolean; message?:string; onChoose:(id:string)=>void; onBack:()=>void}) {
 const [index,setIndex] = useState(() => Math.max(0,choices.findIndex(c => c.id === initialId)));
 const view = useRef<HTMLDivElement>(null);
 const selected = clamp(index,0,Math.max(0,choices.length-1));
 const choose = (i:number) => {const c=choices[i];if(c && !busy && !c.disabled)onChoose(c.id);};
 const move = (next:number) => {
  const target=clamp(next,0,Math.max(0,choices.length-1));
  setIndex(target);
  if(choices[target]&&target!==selected)playNavigationTick();
 };
 useKeys(key => {
  if(key === 'back')onBack();
  else if(key === 'up')move(selected-1);
  else if(key === 'down')move(selected+1);
  else if(key === 'enter')choose(selected);
  return true;
 });
 useEffect(() => {
  const v=view.current, el=v && v.children[selected] as HTMLElement | undefined;
  if(!v || !el)return;
  if(el.offsetTop < v.scrollTop+12)v.scrollTop=el.offsetTop-12;
  else if(el.offsetTop+el.offsetHeight > v.scrollTop+v.clientHeight-12)v.scrollTop=el.offsetTop+el.offsetHeight-v.clientHeight+12;
 },[selected,choices.length]);
 return <Surface title={title} meta={busy ? tr('Applying…') : undefined} className="panel--choices" onBack={onBack}>
  <div class="choice-list" ref={view} role="listbox" aria-label={tr(title)} aria-busy={busy}>
   {choices.map((c,i) => <button type="button" tabIndex={-1} key={c.id}
    class={`surface-button choice${selected===i?' surface-button--focused':''}${c.disabled?' surface-button--unavailable':''}`}
    role="option" aria-selected={!!c.checked} aria-disabled={busy || c.disabled} onMouseEnter={() => setIndex(i)} onClick={() => choose(i)}>
    <span class="choice__text"><span class="choice__label">{tr(c.label)}</span>{c.detail && <span class="choice__detail">{tr(c.detail)}</span>}</span>
    {c.checked && <span class="choice__check"><CheckMark /></span>}
   </button>)}
  </div>
  <div class="surface__foot" role="status">{message || tr('OK selects · Back returns')}</div>
 </Surface>;
}
