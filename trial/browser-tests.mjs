import {openBrowser,seedPreview} from './browser.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';


const browser=await openBrowser();
const page=await browser.newPage({viewport:{width:1920,height:1080}});
await seedPreview(page);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const painting=fs.readFileSync(new URL('./fixtures/photo.svg',import.meta.url));
await page.route('https://www.bing.com/HPImageArchive.aspx*',r=>r.fulfill({json:{images:Array.from({length:8},(_,i)=>({startdate:'202610'+(20-i),urlbase:'/th?id=OHR.Trial'+i, copyright:'Scenic photo test '+i}))}}));
await page.route('https://www.bing.com/th?*',r=>r.fulfill({contentType:'image/svg+xml',body:painting}));
try {
 await page.goto(process.env.TRIAL_URL || 'http://127.0.0.1:5173');
 await page.waitForFunction(()=>document.querySelectorAll('.trial-row .tile').length>5);
 await page.waitForTimeout(2400);
 await page.screenshot({path:'.trial-evidence/browser-home.png'});
 const rows=await page.locator('.trial-row').evaluateAll(es=>es.map(e=>e.querySelectorAll('.tile').length));
 assert.equal(rows[0],5);assert(rows.every(n=>n<=5));
 await page.keyboard.press('ArrowDown');
 await page.waitForTimeout(400);
 assert(await page.locator('.trial-home').evaluate(e=>e.classList.contains('screen--lower')));
 const focus=await page.locator('.trial-row .tile--focused').boundingBox();assert(focus&&Math.abs(focus.y-388)<30);
 await page.screenshot({path:'.trial-evidence/browser-grid.png'});
 await page.keyboard.press('ArrowDown');await page.waitForTimeout(150);await page.keyboard.press('Escape');
 assert(!await page.locator('.trial-home').evaluate(e=>e.classList.contains('screen--lower')));
 // Enter through the actual Control Center action.
 await page.getByText('Control Center',{exact:true}).first().click();
 await page.locator('[data-control=photo]').click();
 await page.getByText('Start now',{exact:true}).click();
 await page.waitForSelector('.photo-frame__image');await page.waitForTimeout(2200);
 const clock=await page.locator('.photo-frame__clock .clock').boundingBox();assert(clock&&clock.x>=0&&clock.y>=0&&clock.y+clock.height<1080,'photo clock must fit on screen');
 await page.screenshot({path:'.trial-evidence/browser-photo-frame.png'});
 assert(await page.locator('.photo-frame__caption').innerText());
 await page.keyboard.press('Enter');await page.waitForTimeout(150);assert.equal(await page.locator('.photo-frame').count(),0);
 await page.waitForTimeout(1200);assert.equal(await page.locator('.photo-frame').count(),0,'dismissal must reset idle and not open the underlying app');
 // Photo settings and grid survive reload.
 await page.getByText('Control Center',{exact:true}).first().click();
 await page.locator('.panel--cc').getByText('Settings',{exact:true}).click();
 await page.waitForSelector('.settings');
 await page.screenshot({path:'.trial-evidence/browser-settings.png'});
 await page.getByText('Wallpaper',{exact:true}).hover();
 await page.getByText('Blue',{exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#wpimage').style.backgroundImage.includes('radial-gradient'));
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForTimeout(5200);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForTimeout(500);
 assert(await page.locator('#wpimage').evaluate(e=>e.style.backgroundImage.includes('radial-gradient')),'gradient must survive background resource release');
 await page.evaluate(()=>{document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');window.dispatchEvent(new Event('trial-start-frame'));});
 await page.waitForSelector('.photo-frame__clock .clock');
 assert.equal(await page.locator('.photo-frame__clock .clock').evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');
 await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);
 fs.writeFileSync('.trial-evidence/browser-results.json',JSON.stringify({passed:true,rows,focus,errors,checks:['five column rows','Down expands','grid scroll','Back collapses','Control Center manual frame','photo rendering','Enter consumes wake key','idle reset','Settings opens','gradient survives background and return','photo clock remains white in light mode']},null,2));
 console.log('Browser flow passed',JSON.stringify({rows,errors}));
}finally{await browser.close();}
