// One headless-Chrome screenshot of the dev preview (port 5199) at 1920x1080 with a given config.
// Usage: node tools/test/shot.mjs <out.png> '<config json>' [path] [keys, e.g. left,down]
import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {setTimeout as sleep} from 'node:timers/promises';
const [out, cfg = '{}', path = '', keys = ''] = process.argv.slice(2);
const PORT = 9347;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, '--user-data-dir=/tmp/lumen-shot-profile', 'about:blank'], {stdio: 'ignore'});
await sleep(2500);
const target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || {}); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({id: i, method, params})); });
const js = (expression) => send('Runtime.evaluate', {expression, awaitPromise: true});
await send('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false});
await send('Page.navigate', {url: 'http://localhost:5199/'}); await sleep(1500);
await js(`localStorage.clear(); localStorage.setItem('launcher-config-v2', ${JSON.stringify(JSON.stringify(JSON.parse(cfg)))});`);
await send('Page.navigate', {url: 'http://localhost:5199/' + path}); await sleep(6000);
const K = {left: 37, up: 38, right: 39, down: 40, enter: 13, back: 8};
for (const k of keys.split(',').filter(Boolean)) { await js(`window.dispatchEvent(new KeyboardEvent('keydown',{keyCode:${K[k]},which:${K[k]},bubbles:true}));window.dispatchEvent(new KeyboardEvent('keyup',{keyCode:${K[k]},which:${K[k]},bubbles:true}))`); await sleep(500); }
await sleep(800);
const r = await send('Page.captureScreenshot', {format: 'png'});
writeFileSync(out, Buffer.from(r.data, 'base64'));
chrome.kill(); process.exit(0);
