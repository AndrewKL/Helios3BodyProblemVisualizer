import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { Body, Vec2 } from './body';
import { CONFIG } from './config';
import { visualParams } from './visuals';

const FOV = 45;
const WHITE = new THREE.Color(0xffffff);

interface BodyView {
  group: THREE.Group;
  sphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  halo: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  baseColor: THREE.Color;
  trail: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  history: Vec2[];
}

export class SceneRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private views = new Map<number, BodyView>();
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  private sphereGeometry = new THREE.SphereGeometry(1, 48, 32);
  private haloGeometry = new THREE.PlaneGeometry(1, 1);
  private haloTexture = makeHaloTexture();

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x03040a);
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(FOV, 1, 1, 10000);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-1, 1, 2);
    this.scene.add(key);
    this.scene.add(makeStarfield());

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.6, 0.1);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    // Distance at which the z = 0 plane spans exactly h world units vertically.
    const distance = h / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    this.camera.aspect = w / h;
    this.camera.position.set(0, 0, distance);
    this.camera.far = distance + 5000;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w, h);
  }

  /** Map a pointer position to world coordinates on the simulation plane. */
  screenToWorld(clientX: number, clientY: number): Vec2 | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.plane, hit) ? { x: hit.x, y: hit.y } : null;
  }

  addBody(body: Body): void {
    const baseColor = new THREE.Color(body.color);
    const sphere = new THREE.Mesh(
      this.sphereGeometry,
      new THREE.MeshStandardMaterial({
        color: baseColor,
        emissive: baseColor.clone(),
        emissiveIntensity: 0.6,
        roughness: 0.35,
        metalness: 0.1,
      }),
    );
    const halo = new THREE.Mesh(
      this.haloGeometry,
      new THREE.MeshBasicMaterial({
        map: this.haloTexture,
        color: baseColor,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const group = new THREE.Group();
    group.add(halo, sphere);

    const trailGeometry = new THREE.BufferGeometry();
    const n = CONFIG.trails.length;
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    trailGeometry.setDrawRange(0, 0);
    const trail = new THREE.Line(
      trailGeometry,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    );
    trail.frustumCulled = false;

    this.scene.add(trail, group);
    this.views.set(body.id, { group, sphere, halo, baseColor, trail, history: [] });
  }

  clear(): void {
    for (const view of this.views.values()) {
      this.scene.remove(view.group, view.trail);
      view.sphere.material.dispose();
      view.halo.material.dispose();
      view.trail.geometry.dispose();
      view.trail.material.dispose();
    }
    this.views.clear();
  }

  /** Record the current positions into each body's trail. */
  recordTrails(bodies: Body[]): void {
    for (const body of bodies) {
      const view = this.views.get(body.id);
      if (!view) continue;
      view.history.push({ ...body.pos });
      if (view.history.length > CONFIG.trails.length) view.history.shift();
      this.writeTrail(view);
    }
  }

  private writeTrail(view: BodyView): void {
    const { history, baseColor } = view;
    const pos = view.trail.geometry.getAttribute('position') as THREE.BufferAttribute;
    const col = view.trail.geometry.getAttribute('color') as THREE.BufferAttribute;
    const count = history.length;
    for (let i = 0; i < count; i++) {
      // Oldest point first; fade to black, which is invisible under additive blending.
      const fade = count > 1 ? (i / (count - 1)) * 0.7 : 0;
      pos.setXYZ(i, history[i].x, history[i].y, 0);
      col.setXYZ(i, baseColor.r * fade, baseColor.g * fade, baseColor.b * fade);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    view.trail.geometry.setDrawRange(0, count);
  }

  /** Push simulation and visual state into the scene graph and draw a frame. */
  render(bodies: Body[]): void {
    const cfg = CONFIG.visuals;
    for (const body of bodies) {
      const view = this.views.get(body.id);
      if (!view) continue;
      const v = visualParams(body, cfg);
      const r = body.radius * v.scale;
      const across = 1 / Math.sqrt(v.stretch);

      view.group.position.set(body.pos.x, body.pos.y, 0);
      view.group.rotation.z = v.angle;
      view.sphere.scale.set(r * v.stretch, r * across, r * across);

      // Brighter and whiter at the core as the body nears another.
      const mat = view.sphere.material;
      mat.emissive.copy(view.baseColor).lerp(WHITE, 0.5 * v.proximity);
      mat.emissiveIntensity = 0.6 + 1.2 * v.proximity + 0.25 * v.pulse * (0.3 + v.proximity);

      const haloSize = r * 4 * (1 + 0.5 * v.proximity);
      view.halo.scale.set(haloSize * v.stretch, haloSize * across, 1);
      view.halo.material.opacity = 0.35 + 0.5 * v.proximity + 0.1 * v.pulse;
    }
    this.composer.render();
  }
}

function makeHaloTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.5)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeStarfield(): THREE.Points {
  const count = 1500;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 8000;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 8000;
    positions[i * 3 + 2] = -1500 - Math.random() * 2000;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0x8894b8, size: 3, sizeAttenuation: true }),
  );
}
