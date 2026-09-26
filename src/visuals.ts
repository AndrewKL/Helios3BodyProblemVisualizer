import type { Body } from './body';
import type { Config } from './config';

type VisualConfig = Config['visuals'];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** 0 when `d` is at or beyond `influence`, 1 when the bodies touch. */
export function proximityFactor(d: number, contact: number, influence: number): number {
  if (influence <= contact) return d <= contact ? 1 : 0;
  return clamp01(1 - (d - contact) / (influence - contact));
}

export interface Neighbor {
  index: number;
  distance: number;
  angle: number;
}

export function nearestNeighbor(bodies: Body[], i: number): Neighbor | null {
  const a = bodies[i];
  let best: Neighbor | null = null;
  for (let j = 0; j < bodies.length; j++) {
    if (j === i) continue;
    const dx = bodies[j].pos.x - a.pos.x;
    const dy = bodies[j].pos.y - a.pos.y;
    const distance = Math.hypot(dx, dy);
    if (!best || distance < best.distance) {
      best = { index: j, distance, angle: Math.atan2(dy, dx) };
    }
  }
  return best;
}

/** Advance each body's visual state by `dt` seconds. */
export function updateVisuals(bodies: Body[], dt: number, cfg: VisualConfig): void {
  const smoothing = 1 - Math.exp(-dt / cfg.smoothingTau);
  bodies.forEach((body, i) => {
    const v = body.visual;
    const n = nearestNeighbor(bodies, i);
    let target = 0;
    if (n) {
      const contact = body.radius + bodies[n.index].radius;
      target = proximityFactor(n.distance, contact, cfg.influenceRadius);
      v.neighborAngle = n.angle;
    }
    v.proximity += (target - v.proximity) * smoothing;
    // Integrate frequency into phase so the pulse speeds up without jumping.
    const hz = lerp(cfg.pulseMinHz, cfg.pulseMaxHz, v.proximity);
    v.pulsePhase = (v.pulsePhase + 2 * Math.PI * hz * dt) % (2 * Math.PI);
    v.age += dt;
  });
}

export interface VisualParams {
  /** Uniform size multiplier on the base radius. */
  scale: number;
  /** Elongation toward the neighbor (1 = sphere). */
  stretch: number;
  angle: number;
  /** Current pulse value in [-1, 1]. */
  pulse: number;
  proximity: number;
}

export function visualParams(body: Body, cfg: VisualConfig): VisualParams {
  const { proximity: p, pulsePhase, neighborAngle, age } = body.visual;
  const birth = easeOutCubic(clamp01(age / cfg.birthDuration));
  const pulse = Math.sin(pulsePhase);
  const amp = lerp(cfg.pulseMinAmp, cfg.pulseMaxAmp, p);
  return {
    scale: birth * lerp(1, cfg.maxGrowth, p) * (1 + amp * pulse),
    stretch: lerp(1, cfg.maxStretch, p),
    angle: neighborAngle,
    pulse,
    proximity: p,
  };
}
