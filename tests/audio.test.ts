import { describe, expect, it } from 'vitest';
import { wubParams } from '../src/audio';
import { CONFIG } from '../src/config';

describe('wubParams', () => {
  it('wubs slowly when far and fast when close', () => {
    expect(wubParams(0, CONFIG.audio).rate).toBe(CONFIG.audio.wubMinHz);
    expect(wubParams(1, CONFIG.audio).rate).toBe(CONFIG.audio.wubMaxHz);
    expect(wubParams(0.7, CONFIG.audio).rate).toBeGreaterThan(wubParams(0.3, CONFIG.audio).rate);
  });

  it('opens the filter and gets louder as bodies approach', () => {
    const far = wubParams(0, CONFIG.audio);
    const near = wubParams(1, CONFIG.audio);
    expect(near.cutoff).toBeGreaterThan(far.cutoff);
    expect(near.depth).toBeGreaterThan(far.depth);
    expect(near.gain).toBeGreaterThan(far.gain);
  });

  it('never sweeps the filter below 0 Hz', () => {
    for (const p of [0, 0.5, 1]) {
      const w = wubParams(p, CONFIG.audio);
      expect(w.cutoff - w.depth).toBeGreaterThan(0);
    }
  });

  it('clamps out-of-range proximity', () => {
    expect(wubParams(2, CONFIG.audio)).toEqual(wubParams(1, CONFIG.audio));
    expect(wubParams(-1, CONFIG.audio)).toEqual(wubParams(0, CONFIG.audio));
  });
});
