import { createBody, type Body, type Vec2 } from './body';
import { PALETTE } from './palette';

export type Mode = 'placing' | 'running' | 'paused';

export class AppState {
  mode: Mode = 'placing';
  bodies: Body[] = [];
  private nextId = 0;

  addBody(pos: Vec2): Body {
    const body = createBody(this.nextId, pos, PALETTE[this.nextId % PALETTE.length]);
    this.nextId++;
    this.bodies.push(body);
    return body;
  }

  reset(): void {
    this.mode = 'placing';
    this.bodies = [];
    this.nextId = 0;
  }
}
