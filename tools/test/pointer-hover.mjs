// Reproduces issue #4 (needs the dev server on port 5199, Chrome, Node 22): with a resting pointer where the first row slides to, press Down. Passing = the rows stay lower.
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
const PORT=9338;
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--disable-gpu',`--remote-debugging-port=${PORT}`,'--window-size=1920,1080','--force-device-scale-factor=1','--user-data-dir=/tmp/lumen-hover-profile','about:blank'],{stdio:'ignore'});
await sleep(2500);
const t=(await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(x=>x.type==='page');
const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));
let id=0;const p=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&p.has(m.id)){p.get(m.id)(m.result||{});p.delete(m.id)}});
const send=(method,params={})=>new Promise(r=>{const i=++id;p.set(i,r);ws.send(JSON.stringify({id:i,method,params}))});
const ev=async x=>(await send('Runtime.evaluate',{expression:x,awaitPromise:true,returnByValue:true})).result?.value;
await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:'http://localhost:5199/'});await sleep(1200);
await ev(`localStorage.clear();localStorage.setItem('launcher-config-v2',JSON.stringify({weatherCity:'London',wallpaper:'local:0',darkMode:'on',dockHide:'off'}))`);
await send('Page.navigate',{url:'http://localhost:5199/'});await sleep(7000);
const key=async c=>{await ev(`window.dispatchEvent(new KeyboardEvent('keydown',{keyCode:${c},which:${c},bubbles:true}));window.dispatchEvent(new KeyboardEvent('keyup',{keyCode:${c},which:${c},bubbles:true}))`);await sleep(500)};
const cls=()=>ev(`document.querySelector('.rows').className`);
await key(39);                                    // engage focus
// the pointer rests where the first row ends up after sliding (lower state: rows are 300 px higher)
await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:900,y:600});await sleep(400);
console.log('rest      :',await cls());
await ev(`window.dispatchEvent(new KeyboardEvent('keydown',{keyCode:40,which:40,bubbles:true}));window.dispatchEvent(new KeyboardEvent('keyup',{keyCode:40,which:40,bubbles:true}))`);
const seen=[];let prev='';
for(let i=0;i<25;i++){const c=await cls();if(c!==prev){seen.push((i*80)+'ms: '+c);prev=c}await sleep(80)}
console.log(seen.join('\n'));
// a real pointer move onto the first row must still focus it (move a little, then a little more)
await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1060,y:600});await sleep(150);
await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1090,y:615});await sleep(900);
console.log('after real hover on first row:',await cls());
ws.close();chrome.kill();
