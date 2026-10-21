// Public screenshots come only from an isolated browser and synthetic fixtures.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.mjs';

const url = process.env.TRIAL_URL || 'http://127.0.0.1:5187';
const preview = new URL(url);
assert(preview.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(preview.hostname), 'Screenshots require a loopback-only preview');
const origin = preview.origin;
const output = 'docs/trial/';
const seed = JSON.parse(fs.readFileSync(new URL('./fixtures/preview-config.json', import.meta.url)));
Object.assign(seed, {
 appIds: ['com.webos.app.browser', 'netflix', 'org.jellyfin.webos', 'com.apple.appletv', 'youtube.leanback.v4', 'hulu', 'amazon', 'com.apple.applemusic', 'cdp-30', 'com.disney.disneyplus-prod', 'com.wbd.stream', 'com.peacock.tv', 'com.tubitv.ott.tubi', 'org.webosbrew.hbchannel'],
 recentIds: [], showWeather: false, navigationSounds: 'off'
});
const landscape = fs.readFileSync(new URL('./fixtures/preview-landscape.svg', import.meta.url));
const browser = await openBrowser();
const errors = [], captures = [], network = {local: 0, mocked: 0, blocked: []};
fs.mkdirSync(output, {recursive: true});

async function newPreview(photo = false) {
 const context = await browser.newContext({viewport: {width: 1920, height: 1080}, timezoneId: 'UTC', locale: 'en-US', serviceWorkers: 'block'});
 const page = await context.newPage();
 page.on('pageerror', error => errors.push(error.message));
 await page.clock.setFixedTime(new Date('2026-01-15T09:41:00Z'));
 await page.route('**/*', route => {
  const request = new URL(route.request().url());
  if (request.origin === origin) { network.local++; return route.continue(); }
  if (request.hostname === 'www.bing.com' && request.pathname === '/HPImageArchive.aspx') {
   network.mocked++;
   return route.fulfill({json: {images: [{startdate: '20260115', urlbase: '/th?id=OHR.DemoLandscape', copyright: 'Generated landscape · Demo artwork'}]}});
  }
  if (request.hostname === 'www.bing.com' && request.pathname === '/th') {
   network.mocked++;
   return route.fulfill({contentType: 'image/svg+xml', body: landscape});
  }
  network.blocked.push(request.origin);
  return route.abort();
 });
 await page.addInitScript(({seed, photo}) => {
  localStorage.clear();
  localStorage.setItem('launcher-config-v2', JSON.stringify({...seed, wallpaper: photo ? 'tigris:daily' : 'local:0'}));
  if (photo) return;
  // Minimal read-only in-memory TV fixture. It never connects to a real device.
  window.PalmServiceBridge = class {
   cancel() { this.cancelled = true; }
   call(uri, json) {
    const params = JSON.parse(json);
    let result = {returnValue: true};
    if (uri.endsWith('/getAppLoadStatus')) result.exist = seed.appIds.includes(params.appId || params.id) || (params.appId || params.id) === 'com.webos.app.livetv';
    else if (uri.endsWith('/getAllInputStatus')) result.devices = [
     {id: 'AV_1', appId: 'com.webos.app.externalinput.av1', label: 'AV', port: 1, connected: false, icon: 'av.png'},
     ...[1, 2, 3, 4].map(port => ({id: 'HDMI_' + port, appId: 'com.webos.app.hdmi' + port, label: port === 3 ? 'Games console' : 'HDMI ' + port, port, connected: port === 2 || port === 3, activate: port === 2, icon: port === 3 ? 'gameconsole.png' : 'HDMI_' + port + '.png'}))
    ];
    else if (uri.endsWith('/getVolume')) Object.assign(result, {volume: 50, muteStatus: false});
    else if (uri.endsWith('/getStatus')) result.wifi = {state: 'connected'};
    else if (uri.endsWith('/getRemainTime')) result.sleepTimeSecond = 0;
    else if (uri.endsWith('/exec')) {
     const command = params.command || '';
     let inner = {returnValue: false, errorText: 'Unsupported screenshot fixture request'};
     if (command.includes('/sleep/getRemainTime')) inner = {returnValue: true, sleepTimeMinute: 0, sleepTimeSecond: 0};
     else if (command.includes('/getSystemSettingDesc')) inner = {returnValue: true, results: [{values: {array: command.includes('pictureMode') ? ['normal', 'cinema'] : ['standard', 'movie']}}]};
     else if (command.includes('/getSystemSettings')) inner = {returnValue: true, settings: command.includes('pictureMode') ? {pictureMode: 'normal'} : {soundMode: 'standard'}};
     result.stdoutString = JSON.stringify(inner);
    } else result = {returnValue: false, errorText: 'Unsupported screenshot fixture request'};
    setTimeout(() => { if (!this.cancelled && this.onservicecallback) this.onservicecallback(JSON.stringify(result)); }, 5);
   }
  };
 }, {seed, photo});
 await page.goto(url);
 await page.waitForFunction(() => document.querySelectorAll('.trial-row .tile').length === 14);
 await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--dock-glass').includes('data:image/png'));
 await page.evaluate(() => document.fonts.ready);
 return {context, page};
}

async function capture(page, name) {
 await page.waitForTimeout(600);
 const text = await page.locator('body').innerText();
 assert(!/[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:\d{1,3}\.){3}\d{1,3}\b|\/Users\//i.test(text), 'No email, address or filesystem path may appear');
 assert.equal(await page.locator('.status__weather').count(), 0);
 await page.screenshot({path: output + name + '.png'});
 captures.push({file: name + '.png', visibleText: text});
}

try {
 const {page, context} = await newPreview();
 await capture(page, 'home');
 await page.keyboard.press('ArrowDown');
 await page.waitForFunction(() => document.querySelector('.trial-home').classList.contains('screen--lower'));
 await capture(page, 'grid');
 await page.keyboard.press('Escape');
 await page.locator('.topbar .pill').first().click();
 await page.waitForSelector('[data-input="com.webos.app.hdmi2"].surface-button--focused');
 assert.equal(await page.locator('.input-card__status').innerText(), 'Active');
 await capture(page, 'inputs');
 await page.keyboard.press('Escape');
 await page.locator('.topbar .pill').nth(1).click();
 await page.waitForFunction(() => document.querySelector('.cc__num')?.textContent === '50');
 await page.locator('.cc__slider').hover();
 await capture(page, 'control-center');
 await page.evaluate(() => { document.documentElement.classList.remove('dark'); document.documentElement.classList.add('light'); });
 await capture(page, 'control-center-light');
 await context.close();

 const photo = await newPreview(true);
 await photo.page.waitForFunction(() => JSON.parse(localStorage.getItem('trial-photo-library-v1') || '{}').photos?.some(p => p.caption === 'Generated landscape · Demo artwork'));
 await photo.page.locator('.topbar .pill').nth(1).click();
 await photo.page.locator('[data-control=photo]').click();
 await photo.page.getByText('Start now', {exact: true}).click();
 await photo.page.waitForSelector('.photo-frame__image');
 await photo.page.waitForFunction(() => document.querySelector('.photo-frame__caption')?.textContent === 'Generated landscape · Demo artwork');
 await photo.page.waitForTimeout(2200);
 await capture(photo.page, 'photo-frame');
 await photo.context.close();
 assert.deepEqual(errors, []);
 assert.equal(captures.length, 6);
 fs.writeFileSync('.trial-evidence/screenshot-preview-results.json', JSON.stringify({passed: true, fixedClock: '2026-01-15T09:41:00Z', syntheticDataOnly: true, realDeviceConnected: false, network, captures, errors}, null, 2));
 console.log(JSON.stringify({passed: true, files: captures.map(c => c.file), network, errors}));
} finally {
 await browser.close();
}
