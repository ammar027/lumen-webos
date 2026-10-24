// Takes the README screenshots of the launcher from the dev server (npm run dev in app/, port 5199) with headless Chrome over the DevTools protocol.
// Usage: node tools/screenshots.mjs   (Node 22+, Google Chrome installed)
import {spawn} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {setTimeout as sleep} from 'node:timers/promises';

const BASE = process.env.BASE || 'http://localhost:5199/';
const OUT = process.env.OUT || new URL('../docs/bento-src/', import.meta.url).pathname;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9361;
mkdirSync(OUT, {recursive: true});

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, '--window-size=1920,1080', '--force-device-scale-factor=1', '--user-data-dir=/tmp/lumen-bento-profile', 'about:blank'], {stdio: 'ignore'});
await sleep(2500);
const target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || {}); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({id: i, method, params})); });
const evalJs = (expression) => send('Runtime.evaluate', {expression, awaitPromise: true});

await send('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false});
const KEYS = {left: 37, up: 38, right: 39, down: 40, enter: 13};
const press = async (name, wait = 160) => {
	const c = KEYS[name];
	await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown',{keyCode:${c},which:${c},bubbles:true})); window.dispatchEvent(new KeyboardEvent('keyup',{keyCode:${c},which:${c},bubbles:true}));`);
	await sleep(wait);
};
const open = async (path, config) => {
	await send('Page.navigate', {url: BASE + 'about:blank'.slice(0, 0)});
	await send('Page.navigate', {url: BASE});
	await sleep(1200);
	await evalJs(`localStorage.clear(); localStorage.setItem('launcher-config-v2', ${JSON.stringify(JSON.stringify(config))});`);
	await send('Page.navigate', {url: BASE + path});
	await sleep(3500);
};
const shot = async (name) => {
	const r = await send('Page.captureScreenshot', {format: 'jpeg', quality: 90});
	writeFileSync(OUT + name + '.jpg', Buffer.from(r.data, 'base64'));
	console.log('saved', name);
};

const base = {onboarded: true, weatherCity: 'London', weatherCountry: 'GB', wallpaper: 'local:0', clockLayout: 'stacked', clockLook: 'frosted'};
const scene = async (name, path, cfg, keys = [], wait = 3500) => {
	await open(path, {...base, ...cfg});
	for (const k of keys) await press(k, 650);
	await sleep(wait - 3500 > 0 ? wait - 3500 : 400);
	await shot(name);
};
await scene('home-dark', '', {darkMode: 'on'}, ['right', 'right', 'right']);
await scene('home-light', '', {darkMode: 'off'}, ['right', 'right']);
await scene('control-center', '', {darkMode: 'on'}, ['up', 'up', 'right', 'enter', 'down']);
await scene('settings', '?settings', {darkMode: 'on'}, ['down', 'down']);
await scene('settings-clock', '?settings=clock', {darkMode: 'on'}, ['down', 'down', 'down', 'enter', 'down']);
await scene('standby-digital', '?standby&face=digital&color=white', {}, []);
await scene('standby-float', '?standby&face=float&color=white', {}, []);
await scene('standby-analog', '?standby&face=analog&color=white', {}, []);
await scene('standby-solar', '?standby&face=solar&color=white', {}, []);
await scene('standby-photos', '?standby&face=photos&color=white', {}, []);
await scene('standby-calendar', '?standby&face=calendar&color=white', {}, []);
await scene('standby-weather', '?standby&face=weather&color=white', {}, []);
await scene('standby-fade', '?standby&face=fade&color=white', {}, []);
await scene('standby-flow', '?standby&face=flow&color=white', {}, []);
await scene('onboarding', '?onboarding', {darkMode: 'on'}, ['enter']);
ws.close();
chrome.kill();
