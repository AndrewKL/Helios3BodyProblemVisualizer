import { CONFIG } from './config';

export interface Vec2 {
  x: number;
  y: number;
}

export interface VisualState {
  /** Smoothed proximity factor, 0 (far) to 1 (touching). */
  proximity: number;
  /** Direction to the nearest neighbor, radians. */
  neighborAngle: number;
  /** Accumulated pulse phase, radians. */
  pulsePhase: number;
  /** Seconds since the body was placed. */
  age: number;
}

export interface Body {
  id: number;
  pos: Vec2;
  vel: Vec2;
  acc: Vec2;
  mass: number;
  radius: number;
  color: number;
  visual: VisualState;
}

export function createBody(id: number, pos: Vec2, color: number): Body {
  return {
    id,
    pos: { ...pos },
    vel: { x: 0, y: 0 },
    acc: { x: 0, y: 0 },
    mass: CONFIG.body.mass,
    radius: CONFIG.body.radius,
    color,
    visual: {
      proximity: 0,
      neighborAngle: 0,
      pulsePhase: Math.random() * Math.PI * 2,
      age: 0,
    },
  };
}
