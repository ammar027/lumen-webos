import {openBrowser,seedPreview} from './browser.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';

const browser=await openBrowser();
const page=await browser.newPage({viewport:{width:1920,height:1080}});const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/webos5-controls.json',import.meta.url)));
const seed=JSON.parse(fs.readFileSync('trial/fixtures/preview-config.json'));
const capture=async name=>page.screenshot({path:'.trial-evidence/panels-'+name+'.png'});
const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const contrast=(color,rgb)=>{const a=luminance(color.match(/\d+/g).slice(0,3).map(Number)),b=luminance(rgb);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
// Check rendered pixels as well as geometry: a correctly sized white fill on a
// focused white track used to look full at every volume.
const volumeAppearance=async(value,focused,theme)=>{
 const slider=page.locator('.cc__slider'),fill=slider.locator('.cc__fill');
 const ratio=await slider.evaluate(e=>e.querySelector('.cc__fill').getBoundingClientRect().width/e.getBoundingClientRect().width);
 assert(Math.abs(ratio-value/100)<.005,'volume fill must match its number');
 assert.equal(await slider.getAttribute('aria-valuenow'),String(value));
 assert.equal(await slider.evaluate(e=>e.classList.contains('surface-button--focused')),focused);
 const focusStyle=await slider.evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}));
 const contents=await slider.evaluate(e=>({text:getComputedStyle(e.querySelector('.cc__slidertext')).color,icon:getComputedStyle(e.querySelector('svg')).stroke}));
 assert.equal(contents.text,focusStyle.color,'Volume label must follow the control text contrast');
 assert.equal(contents.icon,focusStyle.color,'Volume icon must follow the control text contrast');
 const filledText=await slider.locator('.cc__slidertext--filled').evaluate(e=>({color:getComputedStyle(e).color,icon:getComputedStyle(e.querySelector('svg')).stroke,clip:getComputedStyle(e).clipPath,hidden:e.getAttribute('aria-hidden')}));
 assert.equal(filledText.icon,filledText.color);assert.equal(filledText.hidden,'true');
 assert(filledText.clip.includes((100-value)+'%'),'Text contrast boundary must follow the volume fill');
 if(focused){
  const rim=await slider.evaluate(e=>getComputedStyle(e,'::after').boxShadow);
  assert.notEqual(rim,'none','The whole pill must retain a visible focus rim');
 }
 const png=await slider.screenshot();
 const pixels=await page.evaluate(url=>new Promise(resolve=>{
  const image=new Image();image.onload=()=>{
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
   const context=canvas.getContext('2d');context.drawImage(image,0,0);
   const sample=x=>Array.from(context.getImageData(Math.floor(image.width*x),Math.floor(image.height*.16),1,1).data).slice(0,3);
   resolve([sample(.12),sample(.88)]);
  };image.src=url;
 }),'data:image/png;base64,'+png.toString('base64'));
 if(value>0&&value<100){
  const brightness=rgb=>rgb.reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
  assert(brightness(pixels[0])>brightness(pixels[1])+40,'The left filled portion must be brighter than the empty right portion');
 }
 for(const [index,x] of [.12,.88].entries()){
  assert(contrast(x<value/100?filledText.color:focusStyle.color,pixels[index])>=4.5,'Text must remain readable over both sides of the pill');
 }
 if(value===50&&focused)await capture('volume-'+theme);
 return focusStyle;
};
const fit=async()=>{const bad=await page.locator('.input-card__name,.input-card__detail,.input-card__status,.cc__name,.cc__sub,.choice__label,.choice__detail').evaluateAll(es=>es.filter(e=>{if(!e.getClientRects().length)return false;const p=e.closest('button');const a=e.getBoundingClientRect(),b=p.getBoundingClientRect();return a.left<b.left-1||a.right>b.right+1||a.top<b.top-1||a.bottom>b.bottom+1||e.scrollWidth>e.clientWidth+1;}).map(e=>e.textContent));assert.deepEqual(bad,[],'all text must fit its control');};
try{
 await page.route('https://www.bing.com/**',r=>r.abort());
 await page.addInitScript(({seed,baseline})=>{
  if(!localStorage.getItem('launcher-config-v2'))localStorage.setItem('launcher-config-v2',JSON.stringify({...seed,useHomebrew:false,showWeather:false,wallpaper:'local:0',idleMinutes:0}));
  window.tvFixture={volume:22,muted:false,picture:'normal',sound:'aiSound',sleepMinutes:0,audioDelay:0,failNext:false,freezeNextPicture:false,writes:[],inputs:baseline.inputs};
  window.PalmServiceBridge=class {
   cancel(){this.cancelled=true;}
   call(uri,json){
    this.cancelled=false;const p=JSON.parse(json),tv=window.tvFixture;let r={returnValue:true},delay=10;
    if(uri.endsWith('/getAppLoadStatus'))r.exist=true;
    else if(uri.endsWith('/getAllInputStatus'))r=tv.inputs;
    else if(uri.endsWith('/getVolume')){r={returnValue:true,volume:tv.volume,muteStatus:tv.muted};delay=tv.audioDelay;}
    else if(uri.endsWith('/setVolume')){tv.writes.push({field:'volume',value:p.volume});tv.volume=p.volume;tv.muted=false;}
    else if(uri.endsWith('/setMuted')){tv.muted=p.muted;tv.writes.push({field:'muted',value:p.muted});}
    else if(uri.endsWith('/getRemainTime'))r.sleepTimeSecond=tv.sleepMinutes*60;
    else if(uri.endsWith('/timer/sleep/add')){tv.sleepMinutes=p.sleepTimeMinute;tv.writes.push({field:'sleep',value:p.sleepTimeMinute});}
    else if(uri.endsWith('/getStatus'))r={returnValue:true,wifi:{state:'connected'}};
    else if(uri.includes('applicationManager/launch')){tv.writes.push({field:'launch',value:p.id});}
    else if(uri.endsWith('/exec')){
     const c=p.command||'';let inner={returnValue:true};
     const field=c.includes('pictureMode')?'picture':c.includes('soundMode')?'sound':null;
     if(c.includes('tvReservationAgent/timer/sleep/getRemainTime')){inner.sleepTimeMinute=tv.sleepMinutes?tv.sleepMinutes-1:0;inner.sleepTimeSecond=tv.sleepMinutes?58:0;}
     else if(c.includes('tvReservationAgent/timer/sleep/add')){const n=JSON.parse(c.match(/'([^']+)'$/)[1]).sleepTimeMinute;tv.sleepMinutes=n;tv.writes.push({field:'sleep',value:n});}
     else if(field&&c.includes('/getSystemSettingDesc'))inner.results=[{values:{arrayExt:(field==='picture'?['normal','cinema','hdrVivid','evil;command']:['standard','movie','aiSound']).map(value=>({value,active:true,visible:value!=='hdrVivid'}))}}];
     else if(field&&c.includes('/getSystemSettings')){inner.settings={[field+'Mode']:tv[field]};if(tv.freezeNextPicture&&field==='picture'){tv.freezeNextPicture=false;delay=1800;}}
     else if(field&&c.includes('/setSystemSettings')){
      const match=c.match(/'([^']+)'$/);const mode=JSON.parse(match[1]).settings[field+'Mode'];
      tv.writes.push({field,value:mode});
      if(tv.failNext){tv.failNext=false;inner={returnValue:false,errorText:'Fixture refusal'};}else tv[field]=mode;
     }else {inner={returnValue:false,errorText:'Not used by panel tests'};}
     r={returnValue:true,stdoutString:JSON.stringify(inner)};
    }else r={returnValue:false,errorText:'Unsupported test call'};
    if(tv.refuseReads&&(uri.endsWith('/getVolume')||uri.endsWith('/getRemainTime')||uri.endsWith('/exec')&&((p.command||'').includes('/getSystemSetting')||(p.command||'').includes('/sleep/getRemainTime'))))r=uri.endsWith('/exec')?{returnValue:true,stdoutString:JSON.stringify({returnValue:false,errorText:'Read unavailable'})}:{returnValue:false,errorText:'Read unavailable'};
    setTimeout(()=>{if(!this.cancelled&&this.onservicecallback)this.onservicecallback(JSON.stringify(r));},delay);
   }
  };
 },{seed,baseline});
 await page.goto(process.env.TRIAL_URL || 'http://127.0.0.1:5173');await page.waitForFunction(()=>document.querySelectorAll('.trial-row .tile').length>10);await page.waitForTimeout(700);
 assert.equal(await page.locator('.trial-row-title').count(),0);checks.push('Recent is optional and defaults off without deleting history');
 await page.locator('.topbar').locator('.pill').first().click();await page.waitForSelector('.input-card');await page.waitForTimeout(200);
 const names=await page.locator('.input-card__name').allTextContents();assert.deepEqual(names,['Live TV','AV','HDMI 1','HDMI 2','Games console','HDMI 4']);
 assert((await page.locator('[data-input="com.webos.app.hdmi3"]').innerText()).includes('HDMI 3 · Connected'));
 assert(!(await page.locator('.panel--inputs').innerText()).includes('Input Source'));assert.equal(await page.locator('.input-card__status').count(),0);
 const safe=await page.locator('.input-card.surface-button--focused').evaluate(e=>{const a=e.getBoundingClientRect(),p=e.closest('.inputs-grid').getBoundingClientRect();return a.left-8>=p.left&&a.top-8>=p.top&&a.right+8<=p.right&&a.bottom+8<=p.bottom;});assert(safe,'input focus and shadow fit the scroll viewport');
 await fit();await capture('inputs');checks.push('AV/HDMI names, real connection status, explicit active state and unclipped focus');
 await page.locator('[data-input="com.webos.app.hdmi3"]').click();await page.waitForSelector('.panel--inputs',{state:'detached'});
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('launcher-config-v2')).lastInput),'com.webos.app.hdmi3');
 await page.locator('.topbar .pill').first().click();assert.equal(await page.locator('.input-card.surface-button--focused').getAttribute('data-input'),'com.webos.app.hdmi3');assert.equal(await page.locator('.input-card__status').innerText(),'Last used');
 await page.keyboard.press('Escape');checks.push('Confirmed input switch persists last selection and reopens focused there');
 await page.evaluate(()=>{tvFixture.audioDelay=950;});await page.locator('.topbar .pill').nth(1).click();
 assert.equal(await page.locator('.cc__num').innerText(),'Loading…');await page.waitForFunction(()=>document.querySelector('.cc__num').textContent==='22');
 await page.evaluate(()=>{tvFixture.audioDelay=0;});
 for(const theme of ['dark','light']){
  await page.evaluate(theme=>{document.documentElement.classList.remove('dark','light');document.documentElement.classList.add(theme);},theme);
  for(const value of [0,25,50,75,100]){
   await page.evaluate(value=>{tvFixture.volume=value;document.dispatchEvent(new Event('visibilitychange'));},value);
   await page.waitForFunction(value=>document.querySelector('.cc__num').textContent===String(value),value);
   await page.locator('.cc__slider').hover();await page.waitForTimeout(220);const focusStyle=await volumeAppearance(value,true,theme);
   if(value===50){
    await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>document.querySelector('.cc__num').textContent==='48');await volumeAppearance(48,true,theme);
    await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('.cc__num').textContent==='50');await volumeAppearance(50,true,theme);
   }
   await page.locator('.cc__audio').hover();await page.waitForTimeout(220);await volumeAppearance(value,false,theme);
  }
 }
 await page.evaluate(()=>{document.documentElement.classList.remove('light');document.documentElement.classList.add('dark');tvFixture.volume=22;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>document.querySelector('.cc__num').textContent==='22');
 checks.push('Volume fills brightly from the left over a subdued empty track, with a separate focus rim and readable clipped text at 0/25/50/75/100 in both appearances; remote edits retain focus');
 await fit();await capture('controls');assert.equal(await page.locator('[data-control=picture]').innerText(),'Picture\nStandard');
 await page.locator('[data-control=picture]').click();await page.waitForSelector('.choice-list');assert.deepEqual(await page.locator('.choice__label').allTextContents(),['Standard','Cinema']);
 assert.equal(await page.locator('[aria-selected=true] .choice__label').innerText(),'Standard');assert.equal(await page.evaluate(()=>tvFixture.writes.filter(x=>x.field==='picture').length),0);checks.push('Opening choices makes no change and filters unavailable or unsafe modes');
 await page.evaluate(()=>{tvFixture.failNext=true;tvFixture.audioDelay=0;});await page.getByText('Cinema',{exact:true}).click();await page.waitForSelector('.toast');assert.equal(await page.locator('[aria-selected=true] .choice__label').innerText(),'Standard');assert.equal(await page.evaluate(()=>tvFixture.picture),'normal');
 await page.getByText('Cinema',{exact:true}).click();await page.waitForSelector('.panel--cc');assert((await page.locator('[data-control=picture]').innerText()).includes('Cinema'));checks.push('Rejected setting leaves confirmed value intact; accepted setting is read back');
 await page.locator('[data-control=sleep]').click();await page.getByText('30 minutes',{exact:true}).click();await page.waitForSelector('.panel--cc');assert((await page.locator('[data-control=sleep]').innerText()).includes('30 min remaining'));
 await page.locator('[data-control=sound]').click();await fit();await capture('sound');await page.keyboard.press('Escape');assert.equal(await page.locator('[data-control=sound].surface-button--focused').count(),1);checks.push('Sleep applies an explicit duration and Back restores the original control focus');
 await page.evaluate(()=>{tvFixture.volume=37;});await page.waitForFunction(()=>document.querySelector('.cc__num').textContent==='37',{},{timeout:10000});checks.push('Visible control values follow changes made outside the panel');
 await page.evaluate(()=>{tvFixture.freezeNextPicture=true;});await page.waitForFunction(()=>tvFixture.freezeNextPicture===false,{},{timeout:8000});
 await page.locator('[data-control=picture]').click();await page.getByText('Standard',{exact:true}).click();await page.waitForSelector('.panel--cc');await page.waitForTimeout(2000);assert((await page.locator('[data-control=picture]').innerText()).includes('Standard'));checks.push('Delayed reads cannot overwrite a newer confirmed change');
 await page.locator('[data-control=inputs]').click();await page.waitForSelector('.panel--inputs');await page.keyboard.press('Escape');await page.waitForSelector('.panel--cc');assert.equal(await page.locator('[data-control=inputs].surface-button--focused').count(),1);checks.push('Control Center → Inputs → Back restores Inputs focus');
 await page.locator('[data-control=photo]').click();await page.getByText('After 15 minutes idle',{exact:true}).click();await page.waitForSelector('.panel--cc');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('launcher-config-v2')).idleMinutes),15);
 await page.locator('[data-control=settings]').click();await page.getByText('Options',{exact:true}).hover();
 const recent=page.locator('.option').filter({has:page.getByText('Recent apps',{exact:true})});await recent.click();assert.equal(await page.locator('.option__value').first().innerText(),'Not on Home');await recent.click();assert.equal(await page.locator('.option__value').first().innerText(),'All recent');
 await page.locator('.option').filter({has:page.getByText('Restart TV',{exact:true})}).click();assert.equal(await page.locator('.choice.surface-button--focused .choice__label').innerText(),'Cancel');await page.keyboard.press('Escape');assert.equal(await page.locator('.settings').count(),1);checks.push('Recent choices persist and Restart lives in Settings behind confirmation');
 await page.keyboard.press('Escape');assert.equal(await page.locator('.trial-row-title').count(),1);
 await page.reload();await page.waitForTimeout(1000);assert.equal(await page.locator('.trial-row-title').count(),1);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('launcher-config-v2')).recentMode),'all');
 await page.locator('.topbar .pill').first().click();await page.locator('.input-card__name').first().evaluate(e=>e.textContent='A very long custom television input name that should stay inside');await fit();
 await page.evaluate(()=>{document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');});await fit();await capture('inputs-light');checks.push('Long input names and light appearance stay readable and contained');
 await page.keyboard.press('Escape');
 await page.evaluate(()=>{const d=tvFixture.inputs.devices;d.find(s=>s.id==='HDMI_2').activate=true;delete d.find(s=>s.id==='HDMI_1').connected;});
 await page.locator('.topbar .pill').first().click();await page.waitForFunction(()=>!!document.querySelector('.input-card__status svg'));assert.equal(await page.locator('.input-card.surface-button--focused').getAttribute('data-input'),'com.webos.app.hdmi2');assert((await page.locator('[data-input="com.webos.app.hdmi1"]').innerText()).includes('Status unavailable'));checks.push('Confirmed active source takes priority; unknown connection is not reported connected');
 await page.keyboard.press('Escape');await page.evaluate(()=>{tvFixture.refuseReads=true;});await page.locator('.topbar .pill').nth(1).click();await page.waitForFunction(()=>document.querySelector('.cc__num').textContent==='Unavailable');assert.equal(await page.locator('[data-control=picture]').getAttribute('aria-disabled'),'true');assert((await page.locator('[data-control=picture]').innerText()).includes('Unavailable'));checks.push('Failed reads show unavailable instead of false default values');
 assert.deepEqual(errors,[]);const result={passed:true,checks,errors};fs.writeFileSync('.trial-evidence/panel-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
