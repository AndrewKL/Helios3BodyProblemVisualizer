import { describe, expect, it } from 'vitest';
import { createBody } from '../src/body';
import { computeAccelerations, step, totalEnergy, totalMomentum } from '../src/physics';

const params = { G: 1000, softening: 10 };

describe('physics', () => {
  it('pulls two bodies toward each other with equal and opposite force', () => {
    const a = createBody(0, { x: -100, y: 0 }, 0);
    const b = createBody(1, { x: 100, y: 0 }, 0);
    computeAccelerations([a, b], params);
    expect(a.acc.x).toBeGreaterThan(0);
    expect(b.acc.x).toBeLessThan(0);
    expect(a.acc.x * a.mass).toBeCloseTo(-b.acc.x * b.mass);
    expect(a.acc.y).toBe(0);
  });

  it('conserves momentum and roughly conserves energy for three bodies', () => {
    const bodies = [
      createBody(0, { x: -150, y: 0 }, 0),
      createBody(1, { x: 150, y: 20 }, 0),
      createBody(2, { x: 0, y: 180 }, 0),
    ];
    const e0 = totalEnergy(bodies, params);
    for (let i = 0; i < 240 * 3; i++) step(bodies, 1 / 240, params);
    const p = totalMomentum(bodies);
    expect(Math.abs(p.x)).toBeLessThan(1e-6);
    expect(Math.abs(p.y)).toBeLessThan(1e-6);
    const e1 = totalEnergy(bodies, params);
    expect(Math.abs((e1 - e0) / e0)).toBeLessThan(0.01);
  });

  it('pulls a lone body gently toward the center attractor', () => {
    const withCenter = { ...params, centerMass: 2400, centerSoftening: 150 };
    const a = createBody(0, { x: 300, y: -400 }, 0);
    computeAccelerations([a], withCenter);
    // Acceleration points back at the origin.
    expect(a.acc.x).toBeLessThan(0);
    expect(a.acc.y).toBeGreaterThan(0);
    expect(a.acc.x / a.acc.y).toBeCloseTo(300 / -400);
    // Weak compared with a body-body pull at the same distance.
    const b = createBody(1, { x: 300, y: -400 }, 0);
    const other = createBody(2, { x: 0, y: 0 }, 0);
    computeAccelerations([b, other], params);
    expect(Math.hypot(a.acc.x, a.acc.y)).toBeLessThan(Math.hypot(b.acc.x, b.acc.y));
  });

  it('roughly conserves energy with the center attractor', () => {
    const withCenter = { ...params, centerMass: 2400, centerSoftening: 150 };
    const bodies = [createBody(0, { x: -300, y: 50 }, 0), createBody(1, { x: 250, y: 200 }, 0)];
    const e0 = totalEnergy(bodies, withCenter);
    for (let i = 0; i < 240 * 5; i++) step(bodies, 1 / 240, withCenter);
    expect(Math.abs((totalEnergy(bodies, withCenter) - e0) / e0)).toBeLessThan(0.01);
  });

  it('leaves a lone body at rest without a center attractor', () => {
    const a = createBody(0, { x: 5, y: 5 }, 0);
    step([a], 1 / 240, params);
    expect(a.pos).toEqual({ x: 5, y: 5 });
  });
});
