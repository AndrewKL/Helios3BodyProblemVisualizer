import './style.css';
import { AudioEngine } from './audio';
import { CONFIG } from './config';
import { bindControls } from './controls';
import { step } from './physics';
import { SceneRenderer } from './render';
import { AppState } from './state';
import { updateVisuals } from './visuals';

const container = document.getElementById('app')!;
const state = new AppState();
const renderer = new SceneRenderer(container);
const audio = new AudioEngine();

const updateControls = bindControls({
  onPlayPause() {
    if (state.bodies.length === 0) return;
    audio.start();
    state.mode = state.mode === 'running' ? 'paused' : 'running';
    updateControls(state.mode, state.bodies.length);
  },
  onReset() {
    state.reset();
    renderer.clear();
    audio.clear();
    updateControls(state.mode, state.bodies.length);
  },
  onMuteChange(muted) {
    audio.setMuted(muted);
  },
});

renderer.canvas.addEventListener('click', (e) => {
  if (state.mode !== 'placing') return;
  const pos = renderer.screenToWorld(e.clientX, e.clientY);
  if (!pos) return;
  // Browsers only allow audio to start from a user gesture, so start it here.
  audio.start();
  const body = state.addBody(pos);
  renderer.addBody(body);
  audio.addBody(body);
  updateControls(state.mode, state.bodies.length);
});

// rAF stops in background tabs; stop the drone too.
document.addEventListener('visibilitychange', () => audio.setSuspended(document.hidden));

let last = performance.now();
let accumulator = 0;

function frame(now: number): void {
  // Clamp so a backgrounded tab doesn't trigger a huge catch-up.
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  if (state.mode === 'running') {
    const { dt: h, maxSubsteps } = CONFIG.physics;
    accumulator = Math.min(accumulator + dt, h * maxSubsteps);
    while (accumulator >= h) {
      step(state.bodies, h, CONFIG.physics);
      accumulator -= h;
    }
    renderer.recordTrails(state.bodies);
  }

  // Visuals and sound animate in every mode so bodies pulse while being placed.
  updateVisuals(state.bodies, dt, CONFIG.visuals);
  renderer.render(state.bodies);
  // One world unit is one CSS pixel, so half the container width spans center to edge.
  audio.update(state.bodies, container.clientWidth / 2);
  requestAnimationFrame(frame);
}

updateControls(state.mode, state.bodies.length);
requestAnimationFrame(frame);
