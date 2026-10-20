import {isWebOS, lunaCall} from './luna';

/** Cached focus cue. Native PCM avoids webOS 5's Web Audio delay.
 * No extra rate limit, volume writes, media element or delayed replay. */
export type NavigationSoundMode = 'off' | 'soft';
type Backend = 'unknown' | 'probing' | 'native' | 'web';
let enabled = false;
let homeActive = false;
let backend: Backend = 'unknown';
let context: AudioContext | undefined;
let buffer: AudioBuffer | undefined;
let playing: AudioBufferSourceNode | undefined;
let keepalive: AudioBufferSourceNode | undefined;
let keepaliveBuffer: AudioBuffer | undefined;
let resuming = false;
let pcm: Float32Array | undefined;
let loadAttempted = false;
const SOUND = 'navigation-focus-v1';

function suspend(): void {
 try {if(context && context.state === 'running')void context.suspend().catch(() => undefined);} catch { /* optional API */ }
}

function stopSource(source: AudioBufferSourceNode | undefined): void {
 if(!source)return;
 source.onended = null;
 try {source.stop();} catch { /* already finished */ }
 try {source.disconnect();} catch { /* already disconnected */ }
}

function stopCue(): void {
 const previous = playing;playing = undefined;stopSource(previous);
}

export function stopNavigationSound(): void {
 stopCue();
 const previous = keepalive;keepalive = undefined;stopSource(previous);
 suspend();
}

export function setNavigationSoundActive(active: boolean): void {
 homeActive = active;
 if(!active)stopCue();
}

export function setNavigationSoundMode(mode: NavigationSoundMode): void {
 enabled = mode === 'soft';
 if(!enabled || document.hidden)stopNavigationSound();else warmNavigationSound();
}

function nativeSound(name: 'navigation-ready' | typeof SOUND): Promise<unknown> {
 // Commercial webOS 5 calls this sink "defaultapp" (OSE uses "pdefaultapp").
 // The bundled PCM has the same peak as the old Web Audio tick; leave gain alone.
 const fileName = decodeURIComponent(new URL(`sounds/${name}.pcm`,document.baseURI).pathname);
 return lunaCall('luna://com.webos.service.audio/playSound',{
  fileName,sink:'defaultapp',sampleRate:48000,format:'PA_SAMPLE_S16LE',channels:1
 },250);
}

function warmNavigationSound(): void {
 if(!enabled || document.hidden)return;
 if(backend === 'unknown') {
  if(!isWebOS())backend = 'web';
  else {
   backend = 'probing';
   // A silent sample checks permissions, format and sink without a surprise tick.
   void nativeSound('navigation-ready').then(() => {backend = 'native';}).catch(() => {
    backend = 'web';if(enabled && !document.hidden)warmWebAudio();
   });
  }
 }
 warmWebAudio();
}

function warmWebAudio(): void {
 try {
  if(!context || context.state === 'closed') {
   const Constructor = window.AudioContext || (window as Window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
   if(!Constructor)return;
   context = new Constructor({latencyHint:'interactive'});buffer = undefined;keepaliveBuffer = undefined;
  }
  const ctx = context;
  if(backend === 'web')prepareBuffer(ctx);
  if(!keepalive) {
   if(!keepaliveBuffer) {
    keepaliveBuffer = ctx.createBuffer(1,Math.ceil(ctx.sampleRate / 10),ctx.sampleRate);
    const data = keepaliveBuffer.getChannelData(0);let seed = 9001;
    for(let i = 0;i < data.length;i++) {
     seed = (1664525 * seed + 1013904223) >>> 0;
     data[i] = (seed / 2147483648 - 1) * .0001;
    }
   }
   // Digital zero did not prevent this TV from dropping isolated cues. This
   // -80 dBFS peak dither survived its 16-bit output and passed the listening test.
   const source = ctx.createBufferSource();source.buffer = keepaliveBuffer;
   source.loop = true;source.connect(ctx.destination);source.start();keepalive = source;
  }
  // Keep the output ready through foreground panels, so Back does not retrigger
  // its silence gate. Off, background and photo-frame mode stop the stream.
  if(!resuming && (ctx.state === 'suspended' || ctx.currentTime === 0)) {
   resuming = true;
   void ctx.resume().then(() => {if(!enabled || document.hidden)stopNavigationSound();}).catch(() => undefined).finally(() => {resuming = false;});
  }
 } catch { /* optional audio must never block navigation */ }
}

function prepareBuffer(ctx: AudioContext): void {
 if(pcm && !buffer) {
  buffer = ctx.createBuffer(1,pcm.length,48000);
  buffer.getChannelData(0).set(pcm);
 }
 if(pcm || loadAttempted)return;
 loadAttempted = true;
 // XHR also supports packaged file URLs on older webOS. Both playback paths
 // use the same bundled mono 48 kHz S16LE cue, including optional local sound overrides.
 const request = new XMLHttpRequest();
 request.open('GET',new URL(`sounds/${SOUND}.pcm`,document.baseURI).href,true);
 request.responseType = 'arraybuffer';
 request.onload = () => {
  const bytes = request.response as ArrayBuffer | null;
  if((request.status !== 0 && (request.status < 200 || request.status >= 300)) ||
    !bytes || !bytes.byteLength || bytes.byteLength % 2 || bytes.byteLength > 96000)return;
  const data = new DataView(bytes);pcm = new Float32Array(bytes.byteLength / 2);
  for(let i = 0;i < pcm.length;i++)pcm[i] = data.getInt16(i * 2,true) / 32768;
  try {if(context && context.state !== 'closed')prepareBuffer(context);} catch { /* optional audio */ }
 };
 request.onerror = () => undefined;
 request.send();
}

export function playNavigationTick(): void {
 if(!enabled || !homeActive || document.hidden)return;
 if(backend === 'native') {
  // Dispatch immediately for every accepted tile move. Never wait for the last
  // response or replay a failed/delayed request through another backend.
  void nativeSound(SOUND).catch(() => {
   backend = 'web';if(enabled && !document.hidden)warmWebAudio();
  });
  return;
 }
 if(backend !== 'web'){warmNavigationSound();return;}
 try {
  const ctx = context;
  if(!ctx || !buffer || ctx.state !== 'running' || ctx.currentTime === 0){warmWebAudio();return;}
  // A new movement replaces an unfinished click rather than dropping the move.
  stopCue();
  const source = ctx.createBufferSource();source.buffer = buffer;
  source.connect(ctx.destination);
  source.onended = () => {if(playing === source)playing = undefined;source.disconnect();};
  playing = source;source.start();
 } catch {stopNavigationSound();}
}
