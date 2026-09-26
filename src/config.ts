// World units are CSS pixels on the z = 0 plane; the camera is placed so that
// one world unit maps to one pixel there.
export const CONFIG = {
  body: {
    radius: 18,
    mass: 4000,
  },
  physics: {
    G: 1000,
    softening: 10,
    // Fixed, weak attractor at the center of the screen (world origin). The
    // large softening keeps the pull gentle near the middle.
    centerMass: 2400,
    centerSoftening: 150,
    dt: 1 / 240,
    maxSubsteps: 16,
  },
  visuals: {
    influenceRadius: 250,
    smoothingTau: 0.15,
    pulseMinHz: 0.5,
    pulseMaxHz: 3,
    pulseMinAmp: 0.05,
    pulseMaxAmp: 0.2,
    maxGrowth: 1.6,
    maxStretch: 1.5,
    birthDuration: 0.3,
  },
  trails: {
    length: 300,
  },
  audio: {
    // Pentatonic notes (A2 C3 D3 E3 G3 A3), assigned by body id. Kept above
    // ~100 Hz so laptop speakers can reproduce them.
    baseNotes: [110, 130.81, 146.83, 164.81, 196, 220],
    wubMinHz: 1.5,
    wubMaxHz: 10,
    cutoffMin: 550,
    cutoffMax: 1800,
    depthMin: 400,
    depthMax: 1400,
    filterQ: 8,
    voiceGainMin: 0.3,
    voiceGainMax: 0.55,
    masterGain: 0.9,
    releaseTime: 0.4,
  },
} as const;

export type Config = typeof CONFIG;
