import {isWebOS, lunaCall} from './luna';

/** Original 26 ms brushed click. Native PCM avoids webOS 5's Web Audio delay.
 * No extra rate limit, volume writes, media element or delayed replay. */
export type NavigationSoundMode = 'off' | 'soft';
type Backend = 'unknown' | 'probing' | 'native' | 'web';
let enabled = false;
let backend: Backend = 'unknown';
let context: AudioContext | undefined;
let buffer: AudioBuffer | undefined;
let playing: AudioBufferSourceNode | undefined;
let resuming = false;

function suspend(): void {
 try {if(context && context.state === 'running')void context.suspend().catch(() => undefined);} catch { /* optional API */ }
}

export function stopNavigationSound(): void {
 const previous = playing; playing = undefined;
 if(previous) {
  previous.onended = null;
  try {previous.stop();} catch { /* already finished */ }
  previous.disconnect();
 }
 suspend();
}

export function setNavigationSoundMode(mode: NavigationSoundMode): void {
 enabled = mode === 'soft';
 if(!enabled || document.hidden)stopNavigationSound();else warmNavigationSound();
}

function nativeSound(name: 'navigation-ready' | 'navigation-click'): Promise<unknown> {
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
 if(backend === 'web')warmWebAudio();
}

function warmWebAudio(): void {
 if(resuming)return;
 try {
  if(!context || context.state === 'closed') {
   const Constructor = window.AudioContext || (window as Window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
   if(!Constructor)return;
   context = new Constructor({latencyHint:'interactive'});buffer = clickBuffer(context);
  }
  const ctx = context;
  // Keep this context ready for the whole active Home session. Resuming on each
  // tap adds latency; suspending only on exit/Off also avoids delayed unlocks.
  if(ctx.state === 'suspended' || ctx.currentTime === 0) {
   resuming = true;
   void ctx.resume().then(() => {if(!enabled || document.hidden)suspend();}).catch(() => undefined).finally(() => {resuming = false;});
  }
 } catch { /* optional audio must never block navigation */ }
}

function clickBuffer(ctx: AudioContext): AudioBuffer {
 const duration = .026;
 const result = ctx.createBuffer(1,Math.ceil(ctx.sampleRate * duration),ctx.sampleRate);
 const samples = result.getChannelData(0);
 // Deterministic, low-passed noise gives a small dry click instead of a musical
 // beep. Keep in sync with trial/generate-navigation-sound.py's bundled PCM.
 let random = 7321, low = 0, peak = 0;
 for(let i = 0;i < samples.length;i++) {
  random = (1664525 * random + 1013904223) >>> 0;
  low += .32 * (random / 2147483648 - 1 - low);
  const t = i / ctx.sampleRate;
  const envelope = Math.min(1,t / .0008) * Math.exp(-t / .0045) * Math.min(1,(duration - t) / .005);
  samples[i] = low * envelope;peak = Math.max(peak,Math.abs(samples[i]));
 }
 for(let i = 0;i < samples.length;i++)samples[i] *= .0252 / peak;
 return result;
}

export function playNavigationTick(): void {
 if(!enabled || document.hidden)return;
 if(backend === 'native') {
  // Dispatch immediately for every accepted tile move. Never wait for the last
  // response or replay a failed/delayed request through another backend.
  void nativeSound('navigation-click').catch(() => {
   backend = 'web';if(enabled && !document.hidden)warmWebAudio();
  });
  return;
 }
 if(backend !== 'web'){warmNavigationSound();return;}
 try {
  const ctx = context;
  if(!ctx || ctx.state !== 'running' || ctx.currentTime === 0){warmWebAudio();return;}
  // A new movement replaces an unfinished click rather than dropping the move.
  const previous = playing;
  if(previous){previous.onended = null;previous.stop();previous.disconnect();}
  const source = ctx.createBufferSource();source.buffer = buffer!;
  source.connect(ctx.destination);
  source.onended = () => {if(playing === source)playing = undefined;source.disconnect();};
  playing = source;source.start();
 } catch {stopNavigationSound();}
}
