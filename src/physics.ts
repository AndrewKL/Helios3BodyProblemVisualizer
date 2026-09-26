import type { Body, Vec2 } from './body';

export interface PhysicsParams {
  G: number;
  softening: number;
  /** Mass of a fixed attractor at the origin; omitted or 0 disables it. */
  centerMass?: number;
  centerSoftening?: number;
}

/** Softened Newtonian gravity; writes each body's `acc`. */
export function computeAccelerations(bodies: Body[], params: PhysicsParams): void {
  const { G, softening, centerMass = 0, centerSoftening = 0 } = params;
  const eps2 = softening * softening;
  const centerEps2 = centerSoftening * centerSoftening;
  for (const b of bodies) {
    b.acc.x = 0;
    b.acc.y = 0;
    if (centerMass > 0) {
      const r2 = b.pos.x * b.pos.x + b.pos.y * b.pos.y + centerEps2;
      const k = (G * centerMass) / (r2 * Math.sqrt(r2));
      b.acc.x -= k * b.pos.x;
      b.acc.y -= k * b.pos.y;
    }
  }
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const r2 = dx * dx + dy * dy + eps2;
      const invR3 = 1 / (r2 * Math.sqrt(r2));
      a.acc.x += G * b.mass * dx * invR3;
      a.acc.y += G * b.mass * dy * invR3;
      b.acc.x -= G * a.mass * dx * invR3;
      b.acc.y -= G * a.mass * dy * invR3;
    }
  }
}

/** One velocity Verlet (kick-drift-kick) step. */
export function step(bodies: Body[], dt: number, params: PhysicsParams): void {
  computeAccelerations(bodies, params);
  for (const b of bodies) {
    b.vel.x += 0.5 * dt * b.acc.x;
    b.vel.y += 0.5 * dt * b.acc.y;
    b.pos.x += dt * b.vel.x;
    b.pos.y += dt * b.vel.y;
  }
  computeAccelerations(bodies, params);
  for (const b of bodies) {
    b.vel.x += 0.5 * dt * b.acc.x;
    b.vel.y += 0.5 * dt * b.acc.y;
  }
}

export function totalMomentum(bodies: Body[]): Vec2 {
  const p = { x: 0, y: 0 };
  for (const b of bodies) {
    p.x += b.mass * b.vel.x;
    p.y += b.mass * b.vel.y;
  }
  return p;
}

export function totalEnergy(bodies: Body[], params: PhysicsParams): number {
  const { G, softening, centerMass = 0, centerSoftening = 0 } = params;
  const eps2 = softening * softening;
  const centerEps2 = centerSoftening * centerSoftening;
  let e = 0;
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    e += 0.5 * a.mass * (a.vel.x * a.vel.x + a.vel.y * a.vel.y);
    if (centerMass > 0) {
      e -= (G * centerMass * a.mass) / Math.sqrt(a.pos.x * a.pos.x + a.pos.y * a.pos.y + centerEps2);
    }
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      e -= (G * a.mass * b.mass) / Math.sqrt(dx * dx + dy * dy + eps2);
    }
  }
  return e;
}
