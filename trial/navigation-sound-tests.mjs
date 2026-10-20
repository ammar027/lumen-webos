import fs from 'node:fs';
import assert from 'node:assert/strict';
import {openBrowser,seedPreview} from './browser.mjs';

const browser=await openBrowser(),page=await browser.newPage({viewport:{width:1920,height:1080}});
await seedPreview(page);
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const audioFixture=()=>{
 const probe=window.audioProbe={starts:[],active:0,maxActive:0,contexts:[],peak:0,buffers:0,loops:[],activeLoops:0,maxActiveLoops:0,resumeDelay:0,initialState:'running',unavailable:false};
 window.AudioContext=class {
  constructor(){if(probe.unavailable)throw new Error('Unsupported audio');this.state=probe.initialState;this.currentTime=1;this.sampleRate=48000;this.destination={};probe.contexts.push(this);}
  createBuffer(channels,length,rate){probe.buffers++;const data=new Float32Array(length);return {duration:length/rate,getChannelData:()=>data};}
  createBufferSource(){if(probe.unavailable)throw new Error('Unsupported audio');let timer,active=false;const node={buffer:null,loop:false,onended:null,connect(){},disconnect(){},start(){active=true;
   if(node.loop){probe.activeLoops++;probe.maxActiveLoops=Math.max(probe.maxActiveLoops,probe.activeLoops);let peak=0;for(const n of node.buffer.getChannelData(0))peak=Math.max(peak,Math.abs(n));probe.loops.push({peak,at:performance.now()});}
   else{probe.active++;probe.maxActive=Math.max(probe.maxActive,probe.active);probe.starts.push(performance.now());for(const n of node.buffer.getChannelData(0))probe.peak=Math.max(probe.peak,Math.abs(n));timer=setTimeout(()=>{active=false;probe.active--;if(node.onended)node.onended();},node.buffer.duration*1000);}},stop(){clearTimeout(timer);if(active){active=false;if(node.loop)probe.activeLoops--;else probe.active--;}}};return node;}

  suspend(){this.state='suspended';return Promise.resolve();}
  resume(){return new Promise(resolve=>setTimeout(()=>{this.state='running';resolve();},probe.resumeDelay));}
 };
};
await page.addInitScript(audioFixture);
const count=()=>page.evaluate(()=>audioProbe.starts.length);
const openOptions=async()=>{await page.locator('.topbar .pill').nth(1).click();await page.locator('[data-control=settings]').click();await page.getByText('Options',{exact:true}).hover();};
const option=()=>page.locator('.option').filter({has:page.getByText('Navigation sounds',{exact:true})});
const home=async()=>{await page.keyboard.press('Escape');await page.waitForSelector('.settings',{state:'detached'});await page.mouse.move(0,0);};
try {
 await page.goto(process.env.TRIAL_URL||'http://127.0.0.1:5173');await page.waitForFunction(()=>document.querySelectorAll('.trial-row .tile').length>10);
 await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>audioProbe.contexts.length),0);
 await openOptions();assert.equal(await option().locator('.option__value').innerText(),'Off');await option().click();assert.equal(await option().locator('.option__value').innerText(),'Soft');await home();await page.waitForFunction(()=>audioProbe.buffers===2);assert.equal(await count(),0);
 await page.locator('.trial-row .tile').nth(1).hover();await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>audioProbe.starts.length===1);checks.push('Legacy/default Off creates no audio context; Soft persists and actual remote app movement plays');
 await page.waitForTimeout(150);await page.locator('.trial-row .tile').first().hover();const before=await count();await page.keyboard.press('ArrowLeft');assert.equal(await count(),before);
 await page.locator('.trial-row .tile').nth(2).hover();await page.waitForTimeout(150);assert.equal(await count(),before);await page.mouse.move(0,0);checks.push('Pointer focus and blocked movement at a row boundary are silent');
 await page.keyboard.press('ArrowDown');await page.waitForTimeout(160);const repeated=await count();
 await page.evaluate(async()=>{for(let i=0;i<16;i++){window.dispatchEvent(new KeyboardEvent('keydown',{key:i%2?'ArrowLeft':'ArrowRight',keyCode:i%2?37:39,bubbles:true}));await new Promise(resolve=>setTimeout(resolve,50));}});
 const stats=await page.evaluate(()=>({starts:audioProbe.starts,maxActive:audioProbe.maxActive,peak:audioProbe.peak,buffers:audioProbe.buffers}));
 assert.equal(stats.starts.length-repeated,16);assert.equal(stats.maxActive,1);assert.equal(stats.buffers,2);assert(stats.peak>0&&stats.peak<=.02521);assert(stats.starts.some((n,i)=>i&&n-stats.starts[i-1]<119));await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>audioProbe.contexts[0].state),'running');assert.equal(await page.evaluate(()=>audioProbe.activeLoops),1);assert.equal(await page.evaluate(()=>audioProbe.maxActiveLoops),1);assert((await page.evaluate(()=>audioProbe.loops)).every(l=>l.peak>0&&l.peak<=.000101));checks.push('Every rapid accepted move plays; one inaudible nonzero keepalive stays warm without cue overlap or an extra throttle');
 await openOptions();const inactive=await count();await page.keyboard.press('ArrowDown');assert.equal(await count(),inactive);await option().click();assert.equal(await option().locator('.option__value').innerText(),'Off');await home();await page.keyboard.press('ArrowRight');assert.equal(await count(),inactive);assert.equal(await page.evaluate(()=>audioProbe.contexts[0].state),'suspended');checks.push('Settings navigation is silent; Off immediately stops and suspends playback');
 await openOptions();await option().click();await home();await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.trial-row .tile').length>10);assert.equal(await count(),0);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('launcher-config-v2')).navigationSounds),'soft');checks.push('Soft survives reload while initial focus restoration is silent');
 await page.evaluate(async()=>{const m=await import('/src/lib/navigationSound.ts');audioProbe.contexts[0].state='suspended';audioProbe.resumeDelay=160;m.setNavigationSoundMode('off');m.setNavigationSoundMode('soft');m.setNavigationSoundMode('off');m.setNavigationSoundMode('soft');});await page.waitForTimeout(220);assert.equal(await page.evaluate(()=>audioProbe.activeLoops),1);assert.equal(await page.evaluate(()=>audioProbe.maxActiveLoops),1);assert.equal(await count(),0);checks.push('Fast Off/Soft changes during resume retain exactly one keepalive without an audible cue');
 await page.evaluate(()=>{audioProbe.contexts[0].state='suspended';audioProbe.resumeDelay=160;});await page.keyboard.press('ArrowRight');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(220);assert.equal(await count(),0);assert.equal(await page.evaluate(()=>audioProbe.contexts[0].state),'suspended');assert.equal(await page.evaluate(()=>audioProbe.activeLoops),0);await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});checks.push('Background stops the keepalive and discards delayed cue unlocks; foreground resumes silently');
 await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.trial-row .tile').length>10);await page.evaluate(()=>{audioProbe.contexts[0].currentTime=0;});await page.keyboard.press('ArrowRight');await page.waitForTimeout(150);assert.equal(await count(),0);await page.evaluate(()=>{audioProbe.contexts[0].currentTime=1;});await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>audioProbe.starts.length===1);checks.push('A running context with a stalled startup clock warms silently without queuing a tick');
 await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.trial-row .tile').length>10);await page.evaluate(()=>{audioProbe.unavailable=true;});await page.keyboard.press('ArrowRight');assert.equal(await count(),0);assert.equal(await page.locator('.trial-row').first().locator('.tile').nth(1).getAttribute('class').then(s=>s.includes('tile--focused')),true);checks.push('Unavailable audio does not block app navigation or produce errors');
 // A bridge added after startup exercises the real Home/settings path without
 // turning every other feature into a simulated TV.
 const native=await browser.newPage({viewport:{width:1920,height:1080}});
 await seedPreview(native);await native.addInitScript(audioFixture);native.on('pageerror',e=>errors.push(e.message));
 await native.goto(process.env.TRIAL_URL||'http://127.0.0.1:5173');await native.waitForFunction(()=>document.querySelectorAll('.trial-row .tile').length>10);
 await native.evaluate(()=>{
  window.nativeProbe={calls:[],delay:3,fail:false,contexts:0};
  const Original=window.AudioContext;window.AudioContext=class extends Original {constructor(){super();nativeProbe.contexts++;}};
  window.PalmServiceBridge=class {
   cancel(){this.cancelled=true;}
   call(uri,json){const p=JSON.parse(json),probe=nativeProbe;let r={returnValue:false};
    if(uri.endsWith('/playSound')){probe.calls.push({at:performance.now(),...p});r={returnValue:!probe.fail};}
    setTimeout(()=>{if(!this.cancelled)this.onservicecallback(JSON.stringify(r));},probe.delay);
   }
  };
 });
 await native.locator('.topbar .pill').nth(1).click();await native.locator('[data-control=settings]').click();await native.getByText('Options',{exact:true}).hover();
 await native.locator('.option').filter({has:native.getByText('Navigation sounds',{exact:true})}).click();await native.keyboard.press('Escape');
 await native.waitForFunction(()=>nativeProbe.calls.length===1);await native.waitForTimeout(30);
 assert((await native.evaluate(()=>nativeProbe.calls[0].fileName)).endsWith('/sounds/navigation-ready.pcm'));
 await native.locator('.trial-row .tile').nth(1).hover();await native.mouse.move(0,0);
 await native.evaluate(async()=>{nativeProbe.delay=160;for(let i=0;i<16;i++){window.dispatchEvent(new KeyboardEvent('keydown',{key:i%2?'ArrowLeft':'ArrowRight',keyCode:i%2?37:39,bubbles:true}));await new Promise(r=>setTimeout(r,50));}});
 const nativeStats=await native.evaluate(()=>({calls:nativeProbe.calls,contexts:nativeProbe.contexts,loops:audioProbe.activeLoops,cues:audioProbe.starts.length}));
 assert.equal(nativeStats.calls.length,17);assert.equal(nativeStats.contexts,1);assert.equal(nativeStats.loops,1);assert.equal(nativeStats.cues,0);assert(nativeStats.calls.slice(1).every(c=>c.sink==='defaultapp'&&c.sampleRate===48000&&c.channels===1&&c.format==='PA_SAMPLE_S16LE'&&c.fileName.endsWith('/sounds/navigation-focus-v1.pcm')));
 await native.locator('.topbar .pill').nth(1).click();const inactiveNative=await native.evaluate(()=>nativeProbe.calls.length);await native.keyboard.press('ArrowDown');assert.equal(await native.evaluate(()=>nativeProbe.calls.length),inactiveNative);assert.equal(await native.evaluate(()=>audioProbe.activeLoops),1);
 await native.locator('[data-control=photo]').click();await native.getByText('Start now',{exact:true}).click();await native.waitForSelector('.photo-frame');assert.equal(await native.evaluate(()=>audioProbe.activeLoops),0);assert.equal(await native.evaluate(()=>audioProbe.contexts[0].state),'suspended');
 await native.waitForTimeout(100);await native.keyboard.press('Escape');await native.waitForSelector('.photo-frame',{state:'detached'});assert.equal(await native.evaluate(()=>audioProbe.activeLoops),1);assert.equal(await native.evaluate(()=>audioProbe.starts.length),0);await native.close();checks.push('Photo frame suspends the keepalive; its wake key restores readiness without a focus cue');
 checks.push('Native PCM dispatches every rapid move while Web Audio supplies only a quiet keepalive; panels stay quiet and ready');
 const fallback=await browser.newPage({viewport:{width:1920,height:1080}});
 await seedPreview(fallback);await fallback.addInitScript(audioFixture);fallback.on('pageerror',e=>errors.push(e.message));
 await fallback.goto(process.env.TRIAL_URL||'http://127.0.0.1:5173');await fallback.waitForFunction(()=>document.querySelectorAll('.trial-row .tile').length>10);
 await fallback.evaluate(()=>{window.PalmServiceBridge=class {cancel(){this.cancelled=true;}call(uri){setTimeout(()=>{if(!this.cancelled)this.onservicecallback(uri.endsWith('/playSound')?'{"returnValue":false,"errorCode":AUDIOD_ERRORCODE_INVALID_PARAMS}':JSON.stringify({returnValue:false}));},3);}};});
 await fallback.locator('.topbar .pill').nth(1).click();await fallback.locator('[data-control=settings]').click();await fallback.getByText('Options',{exact:true}).hover();await fallback.locator('.option').filter({has:fallback.getByText('Navigation sounds',{exact:true})}).click();await fallback.keyboard.press('Escape');
 await fallback.waitForFunction(()=>audioProbe.contexts.length===1&&audioProbe.buffers===2);assert.equal(await fallback.evaluate(()=>audioProbe.starts.length),0);
 await fallback.locator('.trial-row .tile').first().hover();await fallback.keyboard.press('ArrowRight');assert.equal(await fallback.evaluate(()=>audioProbe.starts.length),1);await fallback.close();
 checks.push('An unsupported native sink with a malformed firmware error falls back silently; future moves still play through Web Audio');
 const pcm=fs.readFileSync('trial/overlay/public/sounds/navigation-focus-v1.pcm');assert.equal(pcm.length,17280);let pcmPeak=0;for(let i=0;i<pcm.length;i+=2)pcmPeak=Math.max(pcmPeak,Math.abs(pcm.readInt16LE(i))/32767);assert(pcmPeak<=.02522&&pcmPeak>.0251);assert(fs.readFileSync('trial/overlay/public/sounds/navigation-ready.pcm').every(n=>n===0));
 assert.deepEqual(errors,[]);const result={passed:true,checks,errors};fs.writeFileSync('.trial-evidence/navigation-sound-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
} finally {await browser.close();}
