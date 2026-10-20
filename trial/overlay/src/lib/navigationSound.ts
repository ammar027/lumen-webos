/** Original 45 ms focus tick, synthesized once and played through normal app audio.
 * No media element, network request, system-volume write or queued repeat sounds. */
export type NavigationSoundMode = 'off' | 'soft';
let enabled = false;
let context: AudioContext | undefined;
let buffer: AudioBuffer | undefined;
let playing: AudioBufferSourceNode | undefined;
let generation = 0;
let lastStarted = -Infinity;
let suspendTimer = 0;
let resuming = false;

function suspend(): void {
 try {if(context && context.state === 'running')void context.suspend().catch(() => undefined);} catch { /* optional API */ }
}

export function stopNavigationSound(): void {
 generation++;
 window.clearTimeout(suspendTimer);
 const previous = playing; playing = undefined;
 if(previous) {
  previous.onended = null;
  try { previous.stop(); } catch { /* already finished */ }
  previous.disconnect();
 }
 suspend();
}

export function setNavigationSoundMode(mode: NavigationSoundMode): void {
 enabled = mode === 'soft';
 if(!enabled)stopNavigationSound();else warmNavigationSound();
}

function getContext(): AudioContext | undefined {
 if(!context || context.state === 'closed') {
  const Constructor = window.AudioContext || (window as Window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
  if(!Constructor)return;
  context = new Constructor();buffer = undefined;
 }
 return context;
}

function warmNavigationSound(): void {
 if(!enabled || document.hidden || resuming)return;
 try {
  const ctx = getContext();if(!ctx)return;
  // Some TV engines report running before their audio clock starts. Warm silently;
  // never schedule a tick at time zero where it could play much later.
  if(ctx.state === 'suspended' || ctx.currentTime === 0) {
   resuming = true;
   void ctx.resume().then(() => {if(!enabled || document.hidden)suspend();}).catch(() => undefined).finally(() => {resuming = false;});
  }
  window.clearTimeout(suspendTimer);
  suspendTimer = window.setTimeout(() => {if(!playing)suspend();},1500);
 } catch { /* audio is optional */ }
}

function tickBuffer(ctx: AudioContext): AudioBuffer {
 const duration = .045;
 const result = ctx.createBuffer(1,Math.ceil(ctx.sampleRate * duration),ctx.sampleRate);
 const samples = result.getChannelData(0);
 for(let i = 0;i < samples.length;i++) {
  const t = i / ctx.sampleRate;
  const envelope = Math.min(1,t / .003) * Math.exp(-t / .011) * Math.min(1,(duration - t) / .008);
  samples[i] = .035 * envelope * (.8 * Math.sin(2 * Math.PI * 560 * t) + .2 * Math.sin(2 * Math.PI * 840 * t));
 }
 return result;
}

export function playNavigationTick(): void {
 if(!enabled || document.hidden)return;
 const requested = performance.now(), token = ++generation;
 if(playing || requested - lastStarted < 120 || resuming)return;
 try {
  const ctx = getContext();if(!ctx)return;
  if(ctx.currentTime === 0){warmNavigationSound();return;}
  const start = () => {
   // A delayed unlock must never play after a panel opens or the focus has moved on.
   if(!enabled || document.hidden || token !== generation || playing || ctx.state !== 'running' || performance.now() - requested > 80)return;
   if(!buffer)buffer = tickBuffer(ctx);
   const source = ctx.createBufferSource(); source.buffer = buffer;
   source.connect(ctx.destination);
   source.onended = () => {
    if(playing === source)playing = undefined;source.disconnect();
    window.clearTimeout(suspendTimer);suspendTimer = window.setTimeout(suspend,300);
   };
   playing = source;lastStarted = performance.now();source.start();
   window.clearTimeout(suspendTimer);
  };
  if(ctx.state === 'suspended') {
   resuming = true;
   void ctx.resume().then(() => {start();if(!playing)suspend();}).catch(() => stopNavigationSound()).finally(() => {resuming = false;});
  } else start();
 } catch { stopNavigationSound(); /* optional audio must never block navigation */ }
}
