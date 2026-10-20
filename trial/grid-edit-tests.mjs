import {openBrowser,seedPreview} from './browser.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';


const browser=await openBrowser();
const page=await browser.newPage({viewport:{width:1920,height:1080}});
await seedPreview(page);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const hold=async()=>{await page.keyboard.down('Enter');await page.waitForTimeout(750);await page.keyboard.up('Enter');await page.waitForSelector('.panel--ctx');};
try{
 await page.route('https://www.bing.com/**',r=>r.abort());
 await page.goto(process.env.TRIAL_URL || 'http://127.0.0.1:5173');
 await page.waitForFunction(()=>document.querySelectorAll('.trial-row .tile').length>10);
 const fifth=page.locator('.trial-row').first().locator('.tile').nth(4);
 const label=await fifth.innerText();await fifth.hover();await page.mouse.move(0,0);await hold();
 await page.keyboard.press('Enter');await page.waitForTimeout(100);await page.keyboard.press('ArrowRight');
 await page.waitForFunction(()=>document.querySelector('.trial-home').classList.contains('screen--lower'));
 assert.equal((await page.locator('.tile--focused').innerText()).trim(),label.trim());
 const moved=await page.locator('.trial-row').nth(1).locator('.tile').first().innerText();assert.equal(moved.trim(),label.trim());
 await page.keyboard.press('Enter');await hold();await page.getByText('Add to Tools',{exact:true}).click();
 await page.waitForTimeout(200);
 const folder=page.locator('.trial-row .tile').filter({hasText:'Tools'});
 for(let n=0;n<4;n++)await page.keyboard.press('ArrowDown');
 await folder.click();await page.waitForSelector('.panel--folder');
 assert((await page.locator('.panel--folder').innerText()).includes(label.trim()));
 await page.keyboard.press('Escape');assert.equal(await page.locator('.panel--folder').count(),0);
 assert(await page.locator('.trial-home').evaluate(e=>e.classList.contains('screen--lower')));
 await page.keyboard.press('Escape');assert(!await page.locator('.trial-home').evaluate(e=>e.classList.contains('screen--lower')));
 assert.deepEqual(errors,[]);
 const result={passed:true,checks:['move crosses favorites into grid with focus retained','add to folder','folder opens','Back closes folder before collapsing grid'],errors};
 fs.writeFileSync('.trial-evidence/grid-edit-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
