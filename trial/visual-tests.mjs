import {openBrowser,seedPreview} from './browser.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';

const browser=await openBrowser();const page=await browser.newPage({viewport:{width:1920,height:1080}});await seedPreview(page);
const errors=[];page.on('pageerror',e=>errors.push(e.message));const checks=[];
const screen=async name=>page.screenshot({path:'.trial-evidence/visual-'+name+'.png'});
const fit=async selector=>{const bad=await page.locator(selector).evaluateAll(es=>es.filter(e=>{if(!e.getClientRects().length)return false;const p=e.closest('.cc__tile,.cc__round,.option,.tile,.wp__item');if(!p)return false;const a=e.getBoundingClientRect(),b=p.getBoundingClientRect();return a.left<b.left-1||a.right>b.right+1||a.top<b.top-1||a.bottom>b.bottom+1||e.scrollWidth>e.clientWidth+1;}).map(e=>({text:e.textContent,scroll:e.scrollWidth,width:e.clientWidth})));assert.deepEqual(bad,[],selector+' must fit within its card');};
try{
 await page.route('https://www.bing.com/**',r=>r.abort());
 await page.goto(process.env.TRIAL_URL || 'http://127.0.0.1:5173');await page.waitForFunction(()=>document.querySelectorAll('.trial-row .tile').length>10);await page.waitForTimeout(1200);
 await page.waitForFunction(()=>getComputedStyle(document.documentElement).getPropertyValue('--dock-glass').includes('data:image/png'));
 const blurred=await page.evaluate(()=>new Promise(resolve=>{const url=getComputedStyle(document.documentElement).getPropertyValue('--wp-bg').trim().slice(5,-2);const i=new Image();i.onload=()=>resolve([i.naturalWidth,i.naturalHeight]);i.src=url;}));assert.deepEqual(blurred,[480,270]);checks.push('480x270 computed blur and baked dock render');
 const pack=await page.locator('.trial-row').first().locator('img').evaluateAll(es=>es.map(e=>({url:e.src,width:e.naturalWidth})));assert(pack.every(x=>x.url.includes('/iconpack/')&&x.width===960));checks.push('favorites use vector landscape cards');
 const label=await page.locator('.trial-row .tile--focused .tile__label').boundingBox();assert(label&&label.y+label.height<1000);
 await page.locator('.trial-row .tile--focused .tile__label').evaluate(e=>e.textContent='A very long custom application name that should wrap neatly');await fit('.trial-row .tile--focused .tile__label');checks.push('home label stays within dock');
 await screen('home');await page.reload();await page.waitForTimeout(1300);
 const tile=page.locator('.trial-row .tile').first();await tile.hover();await page.mouse.move(180,770);const tilt=await tile.locator('.tile__box').evaluate(e=>getComputedStyle(e).transform);assert(tilt.includes('matrix3d'));checks.push('focused card consumes perspective tilt');
 await page.mouse.move(0,0);await page.keyboard.press('ArrowDown');await page.waitForTimeout(500);await screen('grid');await page.keyboard.press('Escape');
 await page.getByText('Control Center',{exact:true}).first().click();await fit('.cc__name,.cc__sub,.cc__label');await screen('controls');
 await page.locator('.cc__name').first().evaluate(e=>e.textContent='Längerer Soundmodus');await page.locator('.cc__sub').first().evaluate(e=>e.textContent='Automatisch angepasst');await fit('.cc__name,.cc__sub,.cc__label');checks.push('control captions and long labels remain inside rounded cards');
 await page.locator('[data-control=settings]').click();await page.getByText('Options',{exact:true}).hover();await page.waitForTimeout(350);
 await page.locator('.option__value').first().evaluate(e=>e.textContent='A longer selected setting value');await fit('.option__text,.option__value');await screen('options');checks.push('option text and values have independent wrapping columns');
 await page.getByText('Wallpaper',{exact:true}).hover();await page.getByText('Video',{exact:true}).hover();await page.waitForTimeout(300);await screen('wallpaper');
 const viewport=await page.locator('.wp__viewport').boundingBox();assert(viewport&&viewport.y+viewport.height<=1030);
 await fit('.wp__title');checks.push('wallpaper captions and viewport stay on screen with explanatory text');
 assert.deepEqual(errors,[]);const result={passed:true,checks,errors};fs.writeFileSync('.trial-evidence/visual-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
