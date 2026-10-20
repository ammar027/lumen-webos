import {useState} from 'preact/hooks';
import {Glyph, type GlyphName} from './Glyph';
import {ChoiceList, Surface, type Choice} from './Surface';
import {useKeys, clamp} from '../hooks/useKeys';
import {useTvControls} from '../hooks/useTvControls';
import {PICTURE_LABEL,SOUND_LABEL,SLEEP_MINUTES,setPictureMode,setSoundMode,setSleepTimer,setVolume,setMuted,screenOff} from '../lib/tvcontrols';
import {t as tr} from '../lib/i18n';

export type CenterAction = 'lg-home' | 'settings' | 'screensaver' | 'inputs';
interface Props {onClose:()=>void; onError:(text:string)=>void; onAction:(action:CenterAction)=>void; idleMinutes:number; onIdleMinutes:(minutes:number)=>void; inputCount:number; network:string; focusInputs?:boolean}
type Cell = 'volume'|'audio'|'inputs'|'photo'|'sound'|'picture'|'sleep'|'screenoff'|'home'|'settings';
const GRID:Cell[][]=[['volume','audio'],['inputs','photo'],['sound','picture'],['sleep','screenoff'],['home','settings']];
const IDLE=[0,5,10,15,30];
export function ControlCenter ({onClose,onError,onAction,idleMinutes,onIdleMinutes,inputCount,network,focusInputs}:Props) {
 const {values,loading,busy,pictureModes,soundModes,change}=useTvControls(onError);
 const [pos,setPos]=useState({row:focusInputs?1:0,col:0});
 const [detail,setDetail]=useState<Cell|null>(null);
 const [audioBusy,setAudioBusy]=useState(false),[audioMessage,setAudioMessage]=useState('');
 const focused=(id:Cell)=>GRID[pos.row][pos.col]===id;
 const at=(id:Cell)=>{for(let row=0;row<GRID.length;row++){const col=GRID[row].indexOf(id);if(col>=0)return {row,col};}return {row:0,col:0};};
 const unavailable=(id:Cell)=>id==='volume'?values.volume===null:id==='sound'?values.sound===null||!soundModes.length:id==='picture'?values.picture===null||!pictureModes.length:id==='sleep'?values.sleepMinutes===null:false;
 const label=(value:string|null,labels:Record<string,string>)=>value===null?tr(loading?'Loading…':'Unavailable'):tr(labels[value]||value);
 const adjustVolume=(next:number)=>{if(values.volume!==null&&!busy)change('volume',clamp(next,0,100),()=>setVolume(clamp(next,0,100)));};
 const press=(id:Cell)=>{
  if(busy||audioBusy||unavailable(id))return;
  if(id==='inputs')onAction('inputs');
  else if(id==='home')onAction('lg-home');
  else if(id==='settings')onAction('settings');
  else if(id==='screenoff'){screenOff().catch(()=>onError("Couldn't turn the screen off"));onClose();}
  else {setAudioMessage('');setDetail(id==='volume'?'audio':id);}
 };
 useKeys(key=>{
  const cell=GRID[pos.row][pos.col];
  if(key==='back')onClose();
  else if(key==='enter')press(cell);
  else if(cell==='volume'&&(key==='left'||key==='right')){
   if(key==='right'&&values.volume===100)setPos({row:0,col:1});
   else adjustVolume((values.volume||0)+(key==='left'?-2:2));
  } else if(key==='left'||key==='right')setPos(p=>({...p,col:clamp(p.col+(key==='left'?-1:1),0,1)}));
  else if(key==='up'||key==='down')setPos(p=>({...p,row:clamp(p.row+(key==='up'?-1:1),0,GRID.length-1)}));
  return true;
 },detail===null);
 const tile=(id:Cell,glyph:GlyphName,title:string,sub:string)=>
  <button type="button" tabIndex={-1} data-control={id} aria-disabled={!!busy||unavailable(id)}
   class={`surface-button cc__tile${focused(id)?' surface-button--focused':''}${unavailable(id)?' surface-button--unavailable':''}`}
   onMouseEnter={()=>setPos(at(id))} onClick={()=>press(id)}>
   <span class="cc__badge"><Glyph name={glyph}/></span><span class="cc__text"><span class="cc__name">{tr(title)}</span><span class="cc__sub">{sub}</span></span>
  </button>;
 let choices:Choice[]=[],title='';
 if(detail==='picture'||detail==='sound'){
  const field=detail,modes=field==='picture'?pictureModes:soundModes,labels=field==='picture'?PICTURE_LABEL:SOUND_LABEL;
  title=field==='picture'?'Picture mode':'Sound mode';
  choices=modes.map(id=>({id,label:labels[id]||id,checked:values[field]===id}));
 }else if(detail==='sleep'){
  title='Sleep timer';choices=SLEEP_MINUTES.map(n=>({id:String(n),label:n?`${n} minutes`:'Off',checked:values.sleepMinutes===n}));
 }else if(detail==='photo'){
  title='Photo frame';choices=[{id:'start',label:'Start now',detail:'Press Back or an arrow to return'},...IDLE.map(n=>({id:String(n),label:n?`After ${n} minutes idle`:'Automatic start off',detail:n?'While Lumen is on screen':undefined,checked:idleMinutes===n}))];
 }else if(detail==='audio'){
  title='Audio';choices=[{id:'mute',label:'Mute sound',checked:values.muted===true},{id:'unmute',label:'Unmute sound',checked:values.muted===false}];
 }
 const choose=async(id:string)=>{
  if(busy||audioBusy)return;
  if(detail==='picture'||detail==='sound'){
   const field=detail;if(await change(field,id,()=>field==='picture'?setPictureMode(id):setSoundMode(id)))setDetail(null);
  }else if(detail==='sleep'){
   const n=Number(id);if(await change('sleepMinutes',n,()=>setSleepTimer(n)))setDetail(null);
  }else if(detail==='photo'){
   if(id==='start')onAction('screensaver');else {onIdleMinutes(Number(id));setDetail(null);}
  }else if(detail==='audio'){
   setAudioBusy(true);
   try {await setMuted(id==='mute');setAudioMessage(id==='mute'?'Mute command sent':'Unmute command sent');}
   catch {onError("Couldn't change mute");}finally{setAudioBusy(false);}
  }
 };
 if(detail!==null)return <ChoiceList key={detail} title={title} choices={choices} initialId={detail==='photo'?'start':choices.find(c=>c.checked)?.id} busy={!!busy||audioBusy} message={audioMessage} onChoose={choose} onBack={()=>setDetail(null)}/>;
 const volumeLabel=values.volume===null?tr(loading?'Loading…':'Unavailable'):String(values.volume);
 return <Surface title="Control Center" meta={network} className="panel--cc" onBack={onClose}>
  <div class="cc__volume-row">
   <div role="slider" aria-label={tr('Volume')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={values.volume===null?undefined:values.volume} aria-disabled={values.volume===null||!!busy}
    class={`cc__slider surface-button${focused('volume')?' surface-button--focused':''}${values.volume===null?' surface-button--unavailable':''}`}
    onMouseEnter={()=>setPos(at('volume'))} onClick={(e:MouseEvent)=>{const box=(e.currentTarget as HTMLElement).getBoundingClientRect();adjustVolume(Math.round((e.clientX-box.left)/box.width*100));}}>
    <div class="cc__fill" style={`width:${values.volume===null?0:values.volume}%`}/>
    <div class="cc__slidertext"><Glyph name="speaker"/><span>{tr('Volume')}</span><span class="cc__num">{volumeLabel}</span></div>
   </div>
   <button type="button" tabIndex={-1} class={`surface-button cc__audio${focused('audio')?' surface-button--focused':''}`} aria-label={tr('Audio options')} onMouseEnter={()=>setPos(at('audio'))} onClick={()=>press('audio')}><Glyph name="speaker"/><span>{tr('Audio')}</span></button>
  </div>
  <div class="cc__grid">
   {tile('inputs','inputs','Inputs',`${inputCount} sources`)}
   {tile('photo','screensaver','Photo frame','Start or set idle time')}
   {tile('sound','speaker','Sound',label(values.sound,SOUND_LABEL))}
   {tile('picture','picture','Picture',label(values.picture,PICTURE_LABEL))}
   {tile('sleep','timer','Sleep timer',values.sleepMinutes===null?tr(loading?'Loading…':'Unavailable'):values.sleepMinutes?`${values.sleepMinutes} min remaining`:tr('Off'))}
   {tile('screenoff','power','Screen off','Keep the TV running')}
  </div>
  <div class="cc__utilities">
   {tile('home','house','LG Home','')}{tile('settings','gear','Settings','')}
  </div>
  <div class="surface__foot" role="status">{busy?tr('Applying…'):tr('OK opens · Back returns')}</div>
 </Surface>;
}
