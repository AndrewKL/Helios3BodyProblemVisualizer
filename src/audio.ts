import type { Body } from './body';
import { CONFIG, type Config } from './config';

type AudioConfig = Config['audio'];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface WubParams {
  /** Wub (filter LFO) rate, Hz. */
  rate: number;
  /** Center cutoff of the lowpass filter, Hz. */
  cutoff: number;
  /** How far the LFO sweeps the cutoff either side of center, Hz. */
  depth: number;
  /** Voice gain before the master bus. */
  gain: number;
}

/** Map a body's proximity factor (0 far, 1 touching) to its wub settings. */
export function wubParams(proximity: number, cfg: AudioConfig): WubParams {
  const p = Math.min(1, Math.max(0, proximity));
  return {
    rate: lerp(cfg.wubMinHz, cfg.wubMaxHz, p),
    cutoff: lerp(cfg.cutoffMin, cfg.cutoffMax, p),
    depth: lerp(cfg.depthMin, cfg.depthMax, p),
    gain: lerp(cfg.voiceGainMin, cfg.voiceGainMax, p),
  };
}

/**
 * One voice per body: a detuned saw plus a sub sine, through a resonant
 * lowpass whose cutoff is swept by an LFO — the "wub".
 */
interface Voice {
  sources: OscillatorNode[];
  lfo: OscillatorNode;
  lfoDepth: GainNode;
  filter: BiquadFilterNode;
  amp: GainNode;
  panner: StereoPannerNode;
}

// Parameter changes glide over this time constant (s) so they never click.
const GLIDE = 0.05;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Map<number, Voice>();
  private muted = false;

  /** Create or resume the audio context. Call from a user gesture. */
  start(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.connect(this.ctx.destination);
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : CONFIG.audio.masterGain;
      this.master.connect(compressor);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Pause or resume output while the page is hidden. */
  setSuspended(suspended: boolean): void {
    if (!this.ctx) return;
    void (suspended ? this.ctx.suspend() : this.ctx.resume());
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(muted ? 0 : CONFIG.audio.masterGain, this.ctx.currentTime, GLIDE);
  }

  addBody(body: Body): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const cfg = CONFIG.audio;
    const note = cfg.baseNotes[body.id % cfg.baseNotes.length];
    const w = wubParams(0, cfg);

    const saw = ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.value = note;
    saw.detune.value = 7;
    const saw2 = ctx.createOscillator();
    saw2.type = 'sawtooth';
    saw2.frequency.value = note;
    saw2.detune.value = -7;
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = note / 2;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = cfg.filterQ;
    filter.frequency.value = w.cutoff;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = w.rate;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = w.depth;
    lfo.connect(lfoDepth).connect(filter.frequency);

    const amp = ctx.createGain();
    amp.gain.value = 0; // update() glides it up, giving a short fade-in
    const panner = ctx.createStereoPanner();

    for (const src of [saw, saw2, sub]) src.connect(filter);
    filter.connect(amp).connect(panner).connect(this.master);

    // Random LFO start so bodies don't wub in lockstep.
    const t0 = ctx.currentTime + Math.random() / w.rate;
    for (const src of [saw, saw2, sub]) src.start();
    lfo.start(t0);

    this.voices.set(body.id, { sources: [saw, saw2, sub], lfo, lfoDepth, filter, amp, panner });
  }

  /** Fade out and release every voice. */
  clear(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const stopAt = ctx.currentTime + CONFIG.audio.releaseTime;
    for (const v of this.voices.values()) {
      v.amp.gain.cancelScheduledValues(ctx.currentTime);
      v.amp.gain.setTargetAtTime(0, ctx.currentTime, CONFIG.audio.releaseTime / 4);
      for (const src of [...v.sources, v.lfo]) src.stop(stopAt);
      v.lfo.onended = () => v.panner.disconnect();
    }
    this.voices.clear();
  }

  /** Follow each body's proximity and position. `halfWidth` is half the view width in world units. */
  update(bodies: Body[], halfWidth: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    // Keep the mix level roughly constant as bodies are added.
    const mix = 1 / Math.sqrt(Math.max(1, bodies.length));
    for (const body of bodies) {
      const v = this.voices.get(body.id);
      if (!v) continue;
      const w = wubParams(body.visual.proximity, CONFIG.audio);
      v.lfo.frequency.setTargetAtTime(w.rate, now, GLIDE);
      v.lfoDepth.gain.setTargetAtTime(w.depth, now, GLIDE);
      v.filter.frequency.setTargetAtTime(w.cutoff, now, GLIDE);
      v.amp.gain.setTargetAtTime(w.gain * mix, now, GLIDE);
      const pan = Math.max(-1, Math.min(1, body.pos.x / halfWidth));
      v.panner.pan.setTargetAtTime(pan, now, GLIDE);
    }
  }
}
