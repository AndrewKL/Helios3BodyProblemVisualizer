# Helios — Three-Body Visualizer

An interactive gravity sandbox in the browser. Click to place bodies, press **Play** to watch them pull on each other, and press **Reset** to start over.

Each body is a glowing, pulsing sphere that reacts to its surroundings. As it gets close to another body it grows, stretches toward its neighbor, pulses faster and harder, and its core burns whiter. Each body also hums a sci-fi "wub wub wub" drone that speeds up as it closes in on another body. These effects run while you place bodies too, so you can see how they will interact before pressing Play.

Rendering is 3D (three.js / WebGL). The simulation currently runs on a 2D plane.

## Using it

| Action | What happens |
| --- | --- |
| Click the canvas | Places a new body at that point (only before Play or after Reset) |
| **Play** | Starts the simulation; the button becomes **Pause** |
| **Pause** | Freezes the simulation; bodies keep pulsing |
| **Reset** | Stops the simulation and clears all bodies |
| **Info** | Opens a pop-up explaining the three-body problem, why it has no general solution, and why it's unstable |
| **Mute** | Silences all sound; remembered between visits |

Bodies start at rest, so they fall toward each other, pass through, and slingshot apart. A weak, invisible attractor at the center of the screen pulls strays back toward the middle. Setting an initial velocity (to get orbits) is planned for phase 2.

## Getting started

Requires Node.js 20.19+ or 22.12+ (for Vite 8).

```sh
npm install
npm run dev       # start the dev server (http://localhost:5173)
npm test          # run unit tests (Vitest)
npm run build     # typecheck and build static files into dist/
npm run preview   # serve the production build locally
```

Live at **<https://www.andrewklong.com/Helios3BodyProblemVisualizer/>**.

## Deployment

The site is a GitHub Pages *project site*. [AndrewKL/AndrewKL.github.io](https://github.com/AndrewKL/AndrewKL.github.io) claims `www.andrewklong.com` with its `CNAME`, so every other Pages site on the account, including this one, is served under that domain at `/<repo name>/`.

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on every push and pull request. It installs, tests and builds; on `main` it also publishes `dist/` to Pages. The build sets `BASE=/Helios3BodyProblemVisualizer/` so asset URLs resolve under that path ([`vite.config.ts`](vite.config.ts)). Locally `BASE` defaults to `/`.

To test a production build under the real path:

```sh
BASE=/Helios3BodyProblemVisualizer/ npm run build
BASE=/Helios3BodyProblemVisualizer/ npm run preview   # http://localhost:4173/Helios3BodyProblemVisualizer/
```

## How it works

### Simulation

- **Gravity:** Newtonian N-body gravity between every pair of bodies, with a softening term (10 px) so close passes don't produce infinite forces.
- **Integrator:** velocity Verlet with a fixed timestep of 1/240 s. Several substeps run per rendered frame, so results don't depend on frame rate.
- **Center attractor:** a fixed, softened point mass at the screen center (mass 2400, softening 150 px) gently pulls every body toward the middle.
- **Units:** world units are screen pixels. All bodies currently have equal mass.
- **Collisions:** none yet. Bodies pass through each other.

### Visuals

Each body's look is driven by a **proximity factor** `p` from 0 (nearest neighbor 250 px or more away) to 1 (touching):

| Property | Far (`p = 0`) | Close (`p → 1`) |
| --- | --- | --- |
| Size | Base radius, 18 px | Up to 1.6× |
| Shape | Sphere | Stretched up to 1.5:1 toward the nearest neighbor |
| Pulse | 0.5 Hz, ±5% | 3 Hz, ±20% |
| Color | Base hue | Core shifts toward white, glow intensifies |

`p` is smoothed over about 150 ms so fast encounters don't flicker. Each body gets a random pulse phase so they don't pulse in lockstep.

### Sound

Each body has its own Web Audio voice: two detuned sawtooths plus a sub sine through a resonant lowpass filter. An LFO sweeps the filter cutoff, which makes the wub. Proximity drives the voice:

| Parameter | Far (`p = 0`) | Close (`p → 1`) |
| --- | --- | --- |
| Wub rate | 1.5 Hz | 10 Hz |
| Filter cutoff | 550 Hz | 1800 Hz |
| Volume | quieter | louder |

Each body gets a note from a pentatonic scale (110 to 220 Hz) and is panned by its horizontal position. Audio starts on your first click, because browsers block sound until you interact with the page.

### Rendering

- Bodies are lit `MeshStandardMaterial` spheres with emissive color, plus an additive-blended halo.
- An `UnrealBloomPass` post-process gives the overall glow.
- Moving bodies leave fading trails.
- A starfield sits behind the simulation plane for depth.
- The perspective camera looks straight down at the z = 0 plane, placed so one world unit equals one CSS pixel. Clicks are raycast onto that plane.

## Project structure

```
index.html            page shell, control bar
src/
  main.ts             bootstrap, animation loop, Play/Pause/Reset handling
  state.ts            app state: bodies and mode (placing | running | paused)
  body.ts             Body type and factory
  physics.ts          gravity, Verlet step, momentum/energy helpers
  visuals.ts          proximity, pulse, stretch calculations
  render.ts           three.js scene: spheres, halos, bloom, trails, starfield
  audio.ts            Web Audio wub voices and mute
  controls.ts         buttons, info dialog and mute checkbox
  config.ts           tunable constants
  palette.ts          body colors
  style.css
tests/
  physics.test.ts     force symmetry, momentum and energy conservation
  visuals.test.ts     proximity, nearest neighbor, growth/stretch behavior
  audio.test.ts       proximity-to-wub mapping
docs/
  design.md           design document
```

`physics.ts`, `visuals.ts` and `wubParams` in `audio.ts` don't touch the DOM, three.js or Web Audio, so they can be unit tested.

## Tuning

All the numbers that shape how the simulation feels are in [`src/config.ts`](src/config.ts):

- `physics.G`, `body.mass`: strength of gravity
- `physics.softening`: how gentle very close passes are
- `physics.centerMass`, `physics.centerSoftening`: strength of the central pull (set `centerMass` to 0 to turn it off) and how wide and gentle it is
- `body.radius`: base sphere size
- `visuals.influenceRadius`: distance at which proximity effects begin
- `visuals.pulse*`, `maxGrowth`, `maxStretch`: range of the pulse, growth and stretch effects
- `trails.length`: trail length in frames
- `audio.wubMinHz`, `audio.wubMaxHz`: wub speed range
- `audio.baseNotes`: drone pitches
- `audio.cutoff*`, `audio.depth*`, `audio.filterQ`: how bright and aggressive the wub is
- `audio.masterGain`: overall volume

## Roadmap

1. **Phase 1a — Visuals** (done): place bodies; pulsing glow spheres; proximity-driven size, shape and pulse.
2. **Phase 1b — Simulation** (done): Play/Pause/Reset, gravity, trails.
3. **Phase 1c — Sound** (done): proximity-driven wub per body, mute.
4. **Phase 2 — Control:** drag to set initial velocity, adjustable mass, speed slider, Reset to initial placement.
5. **Phase 3 — Extras:** collision merging, preset configurations (figure-eight, Lagrange points), shareable URLs, full 3D simulation.

See [docs/design.md](docs/design.md) for the full design and open questions.
