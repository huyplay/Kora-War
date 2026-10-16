import * as THREE from 'three';
import { isSpell } from '../data/spells';
import { spellMiniature } from './spell-miniature';
import type { ModelInstance } from './assets/model-library';
import type { HeroRig } from './animation/unit-animator';

export interface ShowcaseView {
  id: string;
  element: HTMLElement;
}
interface Figure {
  scene: THREE.Scene;
  pivot: THREE.Group;
  camera: THREE.OrthographicCamera;
  instance?: ModelInstance;
  fallback?: THREE.Group;
  height: number;
  width: number;
}

/** A roster borrows World's renderer; no extra WebGL context or asset downloads. */
export class HeroShowcase {
  private figures = new Map<string, Figure>();
  private views: ShowcaseView[] = [];
  private owned = new Set<THREE.BufferGeometry | THREE.Material>();
  private lifetime = new AbortController();
  private observer: ResizeObserver;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private frame = 0;
  private previous = 0;
  private clock = 0;
  private dirty = true;
  private disposed = false;
  private home: HTMLElement;
  private sibling: ChildNode | null;
  private size = new THREE.Vector2();
  private exposure: number;
  private shadows: boolean;
  private canvasLabel: string | null;
  private canvasTabIndex: number;
  constructor(
    private renderer: THREE.WebGLRenderer,
    private host: HTMLElement,
    private color: (id: string) => string,
    private load: (id: string) => Promise<ModelInstance | undefined>,
    private fallback: (id: string) => THREE.Group,
    private released: () => void,
  ) {
    const canvas = renderer.domElement;
    this.home = canvas.parentElement!;
    this.sibling = canvas.nextSibling;
    this.canvasLabel = canvas.getAttribute('aria-label');
    this.canvasTabIndex = canvas.tabIndex;
    renderer.getSize(this.size);
    this.exposure = renderer.toneMappingExposure;
    this.shadows = renderer.shadowMap.enabled;
    renderer.shadowMap.enabled = false;
    renderer.toneMappingExposure = 1.15;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.removeAttribute('aria-label');
    canvas.tabIndex = -1;
    host.append(canvas);
    this.observer = new ResizeObserver(() => {
      this.dirty = true;
      this.wake();
    });
    this.observer.observe(host);
    this.reduced.addEventListener(
      'change',
      () => {
        this.dirty = true;
        this.wake();
      },
      { signal: this.lifetime.signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        this.previous = 0;
        if (document.hidden) {
          cancelAnimationFrame(this.frame);
          this.frame = 0;
        } else this.wake();
      },
      { signal: this.lifetime.signal },
    );
    this.wake();
  }
  setViews(views: ShowcaseView[]) {
    if (this.disposed) return;
    this.views = views;
    for (const { id } of views)
      if (!this.figures.has(id)) {
        const figure = this.create(id);
        this.figures.set(id, figure);
        if (!isSpell(id))
          void this.load(id)
            .then((instance) => {
              if (!instance) return;
              if (this.disposed) {
                instance.dispose();
                return;
              }
              figure.pivot.clear();
              figure.fallback = undefined;
              figure.instance = instance;
              instance.root.rotation.y =
                (((instance.binding.portraitYaw ?? 0) - instance.binding.yaw) * Math.PI) / 180;
              instance.play('walk');
              instance.tick(0.2);
              figure.pivot.add(instance.root);
              this.measure(figure);
              this.dirty = true;
              this.wake();
            })
            .catch(() => {
              /* Keep the procedural figure if a model is unavailable. */
            });
      }
    this.dirty = true;
    this.wake();
  }
  private resource<T extends THREE.BufferGeometry | THREE.Material>(value: T): T {
    this.owned.add(value);
    return value;
  }
  private create(id: string): Figure {
    const scene = new THREE.Scene(),
      pivot = new THREE.Group();
    const tint = new THREE.Color(this.color(id));
    scene.add(new THREE.HemisphereLight(0xf2f5ff, 0x354253, 2.8));
    const key = new THREE.DirectionalLight(0xffedce, 3.5);
    key.position.set(-3, 6, 5);
    const rim = new THREE.DirectionalLight(tint, 3);
    rim.position.set(3, 4, -3);
    scene.add(key, rim, pivot);
    let fallback: THREE.Group | undefined;
    if (isSpell(id)) {
      pivot.add(spellMiniature(id, tint, (resource) => this.resource(resource)));
    } else {
      fallback = this.fallback(id);
      fallback.rotation.y = -0.2;
      pivot.add(fallback);
    }
    const figure: Figure = {
      scene,
      pivot,
      fallback,
      camera: new THREE.OrthographicCamera(),
      height: 2.4,
      width: 2,
    };
    this.measure(figure);
    const pedestal = new THREE.Mesh(
      this.resource(new THREE.CylinderGeometry(0.95, 1.08, 0.2, 8)),
      this.resource(new THREE.MeshStandardMaterial({ color: 0x53606b, metalness: 0.45, roughness: 0.65 })),
    );
    pedestal.position.y = -0.12;
    const band = new THREE.Mesh(
      this.resource(new THREE.CylinderGeometry(1.075, 1.075, 0.045, 8, 1, true)),
      this.resource(
        new THREE.MeshStandardMaterial({
          color: tint,
          emissive: tint,
          emissiveIntensity: 0.5,
          metalness: 0.6,
          roughness: 0.3,
        }),
      ),
    );
    band.position.y = -0.18;
    // Normalize every figure above the same pedestal without changing its combat binding.
    scene.add(pedestal, band);
    return figure;
  }
  private measure(figure: Figure) {
    figure.pivot.scale.setScalar(1);
    figure.pivot.position.set(0, 0, 0);
    figure.pivot.rotation.set(0, 0, 0);
    // updateMatrixWorld also refreshes SkinnedMesh.bindMatrixInverse after reparenting.
    figure.scene.updateMatrixWorld(true);
    // SkinnedMesh caches its idle bounds. A walk pose must measure actual posed vertices.
    figure.pivot.traverse((object) => {
      if (object instanceof THREE.SkinnedMesh) object.computeBoundingBox();
    });
    const box = new THREE.Box3().setFromObject(figure.pivot);
    const scale = 2.35 / Math.max(0.1, box.max.y - box.min.y);
    figure.pivot.scale.setScalar(scale);
    figure.pivot.position.x = -(box.min.x + box.max.x) * scale / 2;
    figure.pivot.position.z = -(box.min.z + box.max.z) * scale / 2;
    figure.pivot.position.y = -box.min.y * scale;
    figure.height = 3.05;
    figure.width = Math.max(2.3, (box.max.x - box.min.x) * scale * 1.15);
  }
  private wake() {
    if (!this.frame && !this.disposed && !document.hidden) this.frame = requestAnimationFrame(this.render);
  }
  private render = (now: number) => {
    this.frame = 0;
    if (this.disposed || document.hidden) return;
    const dt = this.previous ? Math.min(0.05, (now - this.previous) / 1000) : 0;
    this.previous = now;
    if (!this.reduced.matches) this.clock += dt;
    const rect = this.host.getBoundingClientRect();
    if (rect.width && rect.height) {
      const r = this.renderer;
      const size = r.getSize(new THREE.Vector2());
      if (size.x !== rect.width || size.y !== rect.height) r.setSize(rect.width, rect.height, false);
      r.setScissorTest(false);
      r.setClearColor(0x000000, 0);
      r.clear();
      r.setScissorTest(true);
      const updated = new Set<string>();
      for (const view of this.views) {
        const box = view.element.getBoundingClientRect();
        if (!box.width || !box.height || view.element.closest('[hidden]')) continue;
        const figure = this.figures.get(view.id)!;
        if (!updated.has(view.id)) {
          updated.add(view.id);
          if (!this.reduced.matches) {
            figure.instance?.tick(dt);
            if (figure.fallback) {
              const rig = figure.fallback.userData as HeroRig;
              rig.leftLeg.rotation.x = Math.sin(this.clock * 6) * 0.35;
              rig.rightLeg.rotation.x = -Math.sin(this.clock * 6) * 0.35;
              rig.armR.rotation.x = -Math.sin(this.clock * 6) * 0.18;
              rig.body.position.y = Math.abs(Math.sin(this.clock * 6)) * 0.035;
            }
            figure.pivot.rotation.y = isSpell(view.id)
              ? this.clock * 0.65
              : Math.sin(this.clock * 0.7) * 0.14;
          }
        }
        const aspect = box.width / box.height,
          height = Math.max(figure.height, figure.width / aspect);
        const c = figure.camera;
        c.left = (-height * aspect) / 2;
        c.right = -c.left;
        c.top = height / 2;
        c.bottom = -c.top;
        c.near = 0.1;
        c.far = 30;
        c.position.set(0, 2.85, 8);
        c.lookAt(0, 1.3, 0);
        c.updateProjectionMatrix();
        r.setViewport(box.left - rect.left, rect.bottom - box.bottom, box.width, box.height);
        r.setScissor(box.left - rect.left, rect.bottom - box.bottom, box.width, box.height);
        r.render(figure.scene, c);
      }
      r.setScissorTest(false);
      r.setViewport(0, 0, rect.width, rect.height);
      this.dirty = false;
    }
    if (!this.reduced.matches || this.dirty) this.wake();
  };
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.lifetime.abort();
    this.observer.disconnect();
    this.figures.forEach((f) => f.instance?.dispose());
    this.figures.clear();
    this.owned.forEach((r) => r.dispose());
    this.owned.clear();
    const r = this.renderer,
      canvas = r.domElement;
    r.renderLists.dispose();
    r.setScissorTest(false);
    r.setViewport(0, 0, this.size.x, this.size.y);
    r.setSize(this.size.x, this.size.y, false);
    r.toneMappingExposure = this.exposure;
    r.shadowMap.enabled = this.shadows;
    r.shadowMap.needsUpdate = true;
    r.setClearColor(0x142c31, 1);
    canvas.removeAttribute('aria-hidden');
    if (this.canvasLabel) canvas.setAttribute('aria-label', this.canvasLabel);
    canvas.tabIndex = this.canvasTabIndex;
    this.home.insertBefore(canvas, this.sibling?.parentNode === this.home ? this.sibling : null);
    this.released();
  }
}
