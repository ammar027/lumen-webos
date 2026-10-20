// Unknown reads stay unknown. Root commands contain fixed service names and allowlisted values.
import {LUNA} from '../config/constants';
import {isWebOS, lunaCall, type LunaResponse} from './luna';
const AUDIO = 'luna://com.webos.audio/';
const SLEEP = 'luna://com.webos.service.tvReservationAgent/timer/sleep/';
export const PICTURE_MODES = ['vivid','normal','eco','cinema','sports','game','filmMaker','expert1','expert2','hdrEffect','hdrVivid','hdrStandard','hdrCinemaBright','hdrCinema','hdrGame','hdrFilmMaker','dolbyHdrVivid','dolbyHdrStandard','dolbyHdrCinemaBright','dolbyHdrCinema','dolbyHdrGame'];
export const PICTURE_LABEL: Record<string,string> = {vivid:'Vivid',normal:'Standard',eco:'Eco',cinema:'Cinema',sports:'Sports',game:'Game',filmMaker:'FILMMAKER',expert1:'Expert (bright room)',expert2:'Expert (dark room)',hdrEffect:'HDR Effect',hdrVivid:'HDR Vivid',hdrStandard:'HDR Standard',hdrCinemaBright:'HDR Cinema Home',hdrCinema:'HDR Cinema',hdrGame:'HDR Game',hdrFilmMaker:'HDR FILMMAKER',dolbyHdrVivid:'Dolby Vision Vivid',dolbyHdrStandard:'Dolby Vision Standard',dolbyHdrCinemaBright:'Dolby Vision Cinema Home',dolbyHdrCinema:'Dolby Vision Cinema',dolbyHdrGame:'Dolby Vision Game'};
export const SOUND_MODES = ['standard','news','movie','music','sports','game','aiSound','aiSoundPlus','custom'];
export const SOUND_LABEL: Record<string,string> = {standard:'Standard',news:'Clear Voice',movie:'Cinema',music:'Music',sports:'Sports',game:'Game',aiSound:'AI Sound',aiSoundPlus:'AI Sound Pro',custom:'Custom'};
export const SLEEP_MINUTES = [0,15,30,60,90,120];
export interface Controls {volume:number|null; muted:boolean|null; picture:string|null; sound:string|null; sleepMinutes:number|null}
export interface ControlSnapshot {values:Controls; pictureModes:string[]; soundModes:string[]}
export const UNKNOWN_CONTROLS: Controls = {volume:null,muted:null,picture:null,sound:null,sleepMinutes:null};
const mock: Controls = {volume:18,muted:false,picture:'normal',sound:'standard',sleepMinutes:0};
async function rootJson<T extends LunaResponse> (command:string): Promise<T> {
 const r=await lunaCall<{stdoutString?:string}>(LUNA.homebrewExec,{command},6500);
 const data=JSON.parse(r.stdoutString||'') as T;
 if(data.returnValue!==true)throw new Error(data.errorText||'TV refused the command');
 return data;
}
function settings(category:'picture'|'sound',describe=false) {
 const key=category==='picture'?'pictureMode':'soundMode';
 return rootJson<{settings?:Record<string,string>;results?:{values?:{array?:string[];arrayExt?:{value:string;active?:boolean;visible?:boolean}[]}}[]}>(`luna-send -w 4000 -n 1 luna://com.webos.settingsservice/${describe?'getSystemSettingDesc':'getSystemSettings'} '${JSON.stringify({category,keys:[key]})}'`);
}
function choices(data:Awaited<ReturnType<typeof settings>>,allowed:string[]):string[] {
 const values=data.results&&data.results[0]&&data.results[0].values;
 if(!values)return [];
 const offered=values.arrayExt?values.arrayExt.filter(v=>v.active!==false&&v.visible!==false).map(v=>v.value):values.array||[];
 return allowed.filter(v=>offered.indexOf(v)!==-1);
}
export async function readAudio():Promise<Pick<Controls,'volume'|'muted'>> {
 if(!isWebOS())return {volume:mock.volume,muted:mock.muted};
 const r=await lunaCall<{volume?:number;muteStatus?:boolean;muted?:boolean}>(AUDIO+'getVolume',{});
 return {volume:typeof r.volume==='number'&&r.volume>=0&&r.volume<=100?r.volume:null,muted:typeof r.muteStatus==='boolean'?r.muteStatus:typeof r.muted==='boolean'?r.muted:null};
}
export async function readControls(includeChoices=true):Promise<ControlSnapshot> {
 if(!isWebOS())return {values:{...mock},pictureModes:PICTURE_MODES.slice(0,10),soundModes:SOUND_MODES.slice()};
 const values={...UNKNOWN_CONTROLS};let pictureModes:string[]=[],soundModes:string[]=[];
 const tasks:Promise<unknown>[]=[
  readAudio().then(r=>Object.assign(values,r)).catch(()=>undefined),
  settings('picture').then(r=>{values.picture=r.settings&&r.settings.pictureMode||null;}).catch(()=>undefined),
  settings('sound').then(r=>{values.sound=r.settings&&r.settings.soundMode||null;}).catch(()=>undefined),
  rootJson<{sleepTimeMinute?:number;sleepTimeSecond?:number}>(`luna-send -w 4000 -n 1 ${SLEEP}getRemainTime '{}'`).then(r=>{
   // On this firmware seconds are the remainder; the minutes are a separate field.
   if(typeof r.sleepTimeSecond==='number'||typeof r.sleepTimeMinute==='number')values.sleepMinutes=Math.max(0,Math.ceil(((r.sleepTimeMinute||0)*60+(r.sleepTimeSecond||0))/60));
  }).catch(()=>undefined)
 ];
 if(includeChoices)tasks.push(settings('picture',true).then(r=>{pictureModes=choices(r,PICTURE_MODES);}).catch(()=>undefined),settings('sound',true).then(r=>{soundModes=choices(r,SOUND_MODES);}).catch(()=>undefined));
 await Promise.all(tasks);return {values,pictureModes,soundModes};
}
export function setVolume(volume:number):Promise<void> {
 if(!Number.isInteger(volume)||volume<0||volume>100)return Promise.reject(new Error('Invalid volume'));
 if(!isWebOS()){mock.volume=volume;mock.muted=false;return Promise.resolve();}
 return lunaCall(AUDIO+'setVolume',{volume}).then(()=>undefined);
}
export function setMuted(muted:boolean):Promise<void> {
 if(!isWebOS()){mock.muted=muted;return Promise.resolve();}
 return lunaCall(AUDIO+'setMuted',{muted}).then(()=>undefined);
}
function setMode(category:'picture'|'sound',mode:string):Promise<void> {
 const allowed=category==='picture'?PICTURE_MODES:SOUND_MODES;
 if(allowed.indexOf(mode)===-1)return Promise.reject(new Error('Unknown mode'));
 if(!isWebOS()){mock[category]=mode;return Promise.resolve();}
 const key=category==='picture'?'pictureMode':'soundMode';
 return rootJson(`luna-send -w 4000 -n 1 luna://com.webos.settingsservice/setSystemSettings '${JSON.stringify({category,settings:{[key]:mode}})}'`).then(()=>undefined);
}
export const setPictureMode=(mode:string)=>setMode('picture',mode);
export const setSoundMode=(mode:string)=>setMode('sound',mode);
export function setSleepTimer(minutes:number):Promise<void> {
 if(SLEEP_MINUTES.indexOf(minutes)===-1)return Promise.reject(new Error('Unknown timer'));
 if(!isWebOS()){mock.sleepMinutes=minutes;return Promise.resolve();}
 // webOS 5 denies this service to a sideloaded web app; use the already approved bridge.
 return rootJson(`luna-send -w 4000 -n 1 ${SLEEP}add '${JSON.stringify({sleepTimeMinute:minutes})}'`).then(()=>undefined);
}
export function screenOff():Promise<void> {
 if(!isWebOS())return Promise.reject(new Error('Not on a TV'));
 return rootJson("luna-send -w 4000 -n 1 luna://com.webos.service.tvpower/power/turnOffScreen '{}'").then(()=>undefined);
}
export function restartTv():Promise<void> {
 if(!isWebOS())return Promise.reject(new Error('Not on a TV'));
 return rootJson("luna-send -w 4000 -n 1 luna://com.webos.service.tvpower/power/reboot '{\"reason\":\"restart\"}'").then(()=>undefined);
}
