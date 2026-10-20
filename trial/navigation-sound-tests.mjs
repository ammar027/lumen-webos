import fs from 'node:fs';
import assert from 'node:assert/strict';
import {openBrowser,seedPreview} from './browser.mjs';

const browser=await openBrowser(),page=await browser.newPage({viewport:{width:1920,height:1080}});
await seedPreview(page);
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 const probe=window.audioProbe={starts:[],active:0,maxActive:0,contexts:[],peak:0,buffers:0,resumeDelay:0,initialState:'running',unavailable:false};
 window.AudioContext=class {
  constructor(){if(probe.unavailable)throw new Error('Unsupported audio');this.state=probe.initialState;this.currentTime=1;this.sampleRate=48000;this.destination={};probe.contexts.push(this);}
  createBuffer(channels,length,rate){probe.buffers++;const data=new Float32Array(length);return {duration:length/rate,getChannelData:()=>data};}
  createBufferSource(){if(probe.unavailable)throw new Error('Unsupported audio');let timer,active=false;const node={buffer:null,onended:null,connect(){},disconnect(){},start(){active=true;probe.active++;probe.maxActive=Math.max(probe.maxActive,probe.active);probe.starts.push(performance.now());for(const n of node.buffer.getChannelData(0))probe.peak=Math.max(probe.peak,Math.abs(n));timer=setTimeout(()=>{active=false;probe.active--;if(node.onended)node.onended();},node.buffer.duration*1000);},stop(){clearTimeout(timer);if(active){active=false;probe.active--;}}};return node;}
  suspend(){this.state='suspended';return Promise.resolve();}
  resume(){return new Promise(resolve=>setTimeout(()=>{this.state='running';resolve();},probe.resumeDelay));}
 };
});
const count=()=>page.evaluate(()=>audioProbe.starts.length);
const openOptions=async()=>{await page.locator('.topbar .pill').nth(1).click();await page.locator('[data-control=settings]').click();await page.getByText('Options',{exact:true}).hover();};
const option=()=>page.locator('.option').filter({has:page.getByText('Navigation sounds',{exact:true})});
const home=async()=>{await page.keyboard.press('Escape');await page.waitForSelector('.settings',{state:'detached'});await page.mouse.move(0,0);};
try {
 await page.goto(process.env.TRIAL_URL||'http://127.0.0.1:5173');await page.waitForFunction(()=>document.querySelectorAll('.trial-row .tile').length>10);
 await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>audioProbe.contexts.length),0);
 await openOptions();assert.equal(await option().locator('.option__value').innerText(),'Off');await option().click();assert.equal(await option().locator('.option__value').innerText(),'Soft');await home();assert.equal(await count(),0);
 await page.locator('.trial-row .tile').nth(1).hover();await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>audioProbe.starts.length===1);checks.push('Legacy/default Off creates no audio context; Soft persists and actual remote app movement plays');
 await page.waitForTimeout(150);await page.locator('.trial-row .tile').first().hover();const before=await count();await page.keyboard.press('ArrowLeft');assert.equal(await count(),before);
 await page.locator('.trial-row .tile').nth(2).hover();await page.waitForTimeout(150);assert.equal(await count(),before);await page.mouse.move(0,0);checks.push('Pointer focus and blocked movement at a row boundary are silent');
 await page.keyboard.press('ArrowDown');await page.waitForTimeout(160);const repeated=await count();
 await page.evaluate(async()=>{for(let i=0;i<16;i++){window.dispatchEvent(new KeyboardEvent('keydown',{key:i%2?'ArrowLeft':'ArrowRight',keyCode:i%2?37:39,bubbles:true}));await new Promise(resolve=>setTimeout(resolve,50));}});
 const stats=await page.evaluate(()=>({starts:audioProbe.starts,maxActive:audioProbe.maxActive,peak:audioProbe.peak,buffers:audioProbe.buffers}));
 assert(stats.starts.length-repeated<=7);assert.equal(stats.maxActive,1);assert.equal(stats.buffers,1);assert(stats.peak>0&&stats.peak<.035);assert(stats.starts.every((n,i)=>!i||n-stats.starts[i-1]>=119));checks.push('Held movement is rate limited, uses one cached quiet buffer and never overlaps');
 await openOptions();const inactive=await count();await page.keyboard.press('ArrowDown');assert.equal(await count(),inactive);await option().click();assert.equal(await option().locator('.option__value').innerText(),'Off');await home();await page.keyboard.press('ArrowRight');assert.equal(await count(),inactive);checks.push('Settings navigation is silent; Off immediately stops playback');
 await openOptions();await option().click();await home();await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.trial-row .tile').length>10);assert.equal(await count(),0);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('launcher-config-v2')).navigationSounds),'soft');checks.push('Soft survives reload while initial focus restoration is silent');
 await page.evaluate(()=>{audioProbe.contexts[0].state='suspended';audioProbe.resumeDelay=160;});await page.keyboard.press('ArrowRight');await page.locator('.topbar .pill').nth(1).click();await page.waitForTimeout(220);assert.equal(await count(),0);assert.equal(await page.evaluate(()=>audioProbe.contexts[0].state),'suspended');await page.keyboard.press('Escape');checks.push('Delayed audio unlock is discarded and suspended after leaving Home');
 await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.trial-row .tile').length>10);await page.evaluate(()=>{audioProbe.contexts[0].currentTime=0;});await page.keyboard.press('ArrowRight');await page.waitForTimeout(150);assert.equal(await count(),0);await page.evaluate(()=>{audioProbe.contexts[0].currentTime=1;});await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>audioProbe.starts.length===1);checks.push('A running context with a stalled startup clock warms silently without queuing a tick');
 await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.trial-row .tile').length>10);await page.evaluate(()=>{audioProbe.unavailable=true;});await page.keyboard.press('ArrowRight');assert.equal(await count(),0);assert.equal(await page.locator('.trial-row').first().locator('.tile').nth(1).getAttribute('class').then(s=>s.includes('tile--focused')),true);checks.push('Unavailable audio does not block app navigation or produce errors');
 assert.deepEqual(errors,[]);const result={passed:true,checks,errors};fs.writeFileSync('.trial-evidence/navigation-sound-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
} finally {await browser.close();}
