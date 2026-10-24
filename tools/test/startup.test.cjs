const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/lumen-startup.js'), 'utf8');
function setup() {
  let now = 0, poll, fallback, ready;
  const classes = new Set();
  const state = {images: [], video: null};
  const root = {classList: {add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c)}};
  vm.runInNewContext(source, {
    document: {documentElement: root, querySelectorAll: () => state.images, getElementById: () => state.video},
    window: {addEventListener: (_name, cb) => {ready = cb;}},
    Date: {now: () => now},
    setInterval: cb => {poll = cb; return 1;}, clearInterval: () => {},
    setTimeout: cb => {fallback = cb;}
  });
  return {state, classes, poll: () => poll(), ready: () => ready(), fallback: () => fallback(), time: value => {now = value;}};
}
let t = setup(); t.poll(); assert(t.classes.has('lumen-starting'));
t.ready(); t.classes.add('wp-image'); t.state.images = [{complete: false}]; t.poll(); assert(t.classes.has('lumen-starting'));
t.state.images[0].complete = true; t.poll(); assert(!t.classes.has('lumen-starting'));
t = setup(); t.ready(); t.time(2000); t.poll(); assert(!t.classes.has('lumen-starting'));
t = setup(); t.fallback(); assert(!t.classes.has('lumen-starting'));
t = setup(); t.ready(); t.state.video = {readyState: 2}; t.poll(); assert(!t.classes.has('lumen-starting'));
console.log('Startup readiness, incomplete icons, image/video and timeout cases passed');
