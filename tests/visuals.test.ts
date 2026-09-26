import { describe, expect, it } from 'vitest';
import { createBody } from '../src/body';
import { CONFIG } from '../src/config';
import { nearestNeighbor, proximityFactor, updateVisuals, visualParams } from '../src/visuals';

describe('proximityFactor', () => {
  it('is 0 beyond the influence radius and 1 at contact', () => {
    expect(proximityFactor(300, 36, 250)).toBe(0);
    expect(proximityFactor(250, 36, 250)).toBe(0);
    expect(proximityFactor(36, 36, 250)).toBe(1);
    expect(proximityFactor(10, 36, 250)).toBe(1);
  });

  it('increases as distance shrinks', () => {
    expect(proximityFactor(100, 36, 250)).toBeGreaterThan(proximityFactor(200, 36, 250));
  });
});

describe('nearestNeighbor', () => {
  it('finds the closest other body and its direction', () => {
    const bodies = [
      createBody(0, { x: 0, y: 0 }, 0),
      createBody(1, { x: 0, y: 50 }, 0),
      createBody(2, { x: 300, y: 0 }, 0),
    ];
    const n = nearestNeighbor(bodies, 0)!;
    expect(n.index).toBe(1);
    expect(n.distance).toBe(50);
    expect(n.angle).toBeCloseTo(Math.PI / 2);
  });

  it('returns null for a single body', () => {
    expect(nearestNeighbor([createBody(0, { x: 0, y: 0 }, 0)], 0)).toBeNull();
  });
});

describe('visual state', () => {
  it('grows, stretches and pulses faster when bodies are close', () => {
    const near = [createBody(0, { x: 0, y: 0 }, 0), createBody(1, { x: 40, y: 0 }, 0)];
    const far = [createBody(0, { x: 0, y: 0 }, 0), createBody(1, { x: 1000, y: 0 }, 0)];
    for (let i = 0; i < 120; i++) {
      updateVisuals(near, 1 / 60, CONFIG.visuals);
      updateVisuals(far, 1 / 60, CONFIG.visuals);
    }
    expect(near[0].visual.proximity).toBeGreaterThan(0.9);
    expect(far[0].visual.proximity).toBe(0);
    const vn = visualParams(near[0], CONFIG.visuals);
    const vf = visualParams(far[0], CONFIG.visuals);
    expect(vn.stretch).toBeGreaterThan(vf.stretch);
    expect(vf.stretch).toBe(1);
  });

  it('starts at zero size and grows in over the birth duration', () => {
    const b = createBody(0, { x: 0, y: 0 }, 0);
    expect(visualParams(b, CONFIG.visuals).scale).toBe(0);
    updateVisuals([b], CONFIG.visuals.birthDuration, CONFIG.visuals);
    expect(visualParams(b, CONFIG.visuals).scale).toBeGreaterThan(0.9);
  });
});
