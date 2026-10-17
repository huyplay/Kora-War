import * as THREE from 'three';
import { isSpell } from '../data/spells';
import { spellMiniature } from './spell-miniature';
import type { ModelInstance } from './assets/model-library';
import { visibleModelBounds } from './assets/model-parts';
import { animateUnit } from './animation/unit-animator';
import { DEFAULT_MODEL_ANIMATION } from '../data/model-animation';
import type { Unit } from '../core/types';
import {
  frameShowcase,
  showcaseEnvelope,
  showcaseWorldBounds,
  type ShowcaseFraming,
} from './animation/showcase-framing';

export type ShowcaseAction = 'idle' | 'walk' | 'attack' | 'cast';

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
  bounds: THREE.Box3;
  framing?: ShowcaseFraming;
  actionBounds?: ShowcaseFraming['actions'];
  framedBounds?: THREE.Box3;
  framedAspect?: number;
  action: ShowcaseAction;
  actionAge: number;
  preparing?: boolean;
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
        if (!isSpell(id)) {
          figure.preparing = true;
          void this.load(id)
            .then(async (instance) => {
              if (!instance) return;
              if (this.disposed) {
                instance.dispose();
                return;
              }
              instance.root.rotation.y =
                (((instance.binding.showcaseYaw ?? instance.binding.portraitYaw ?? 0) -
                  instance.binding.yaw) *
                  Math.PI) /
                180;
              let envelope: ShowcaseFraming | undefined;
              try {
                envelope = await showcaseEnvelope(instance, this.lifetime.signal);
              } catch {
                // Keep the procedural preview if the imported rig cannot be measured safely.
              }
              if (this.disposed || !envelope) {
                instance.dispose();
                return;
              }
              figure.pivot.clear();
              figure.fallback = undefined;
              figure.instance = instance;
              figure.pivot.add(instance.root);
              this.measure(figure, envelope);
              figure.framing = envelope;
              if (envelope && !envelope.actions[figure.action]) figure.action = 'idle';
              if (!envelope || envelope.actions[figure.action]) {
                instance.play(figure.action, true);
                instance.tick(0.2);
              } else instance.mixer.stopAllAction();
              figure.actionAge = 0;
              this.dirty = true;
              this.wake();
            })
            .catch(() => {
              /* Keep the procedural figure if a model is unavailable. */
            })
            .finally(() => {
              figure.preparing = false;
            });
        }
      }
    this.dirty = true;
    this.wake();
  }
  /** Reduced motion shows a representative static pose after an explicit tap. */
  preview(id: string, action: ShowcaseAction) {
    const figure = this.figures.get(id);
    if (this.disposed || !figure || isSpell(id) || !this.views.some((view) => view.id === id)) return false;
    if (figure.preparing) return false;
    if (figure.instance && !figure.instance.binding.clips[action]) return false;
    if (figure.framing && !figure.framing.actions[action]) return false;
    figure.action = action;
    figure.actionAge = 0;
    figure.instance?.play(action, true);
    if (this.reduced.matches) {
      const timing = figure.instance?.animationTiming ?? DEFAULT_MODEL_ANIMATION;
      const age =
        action === 'cast'
          ? timing.castSeconds * 0.45
          : action === 'attack'
            ? timing.attackSeconds * 0.45
            : 0.15;
      figure.instance?.tick(age);
      if (figure.fallback) this.pose(figure, age);
    }
    this.previous = 0;
    this.dirty = true;
    this.wake();
    return true;
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
      bounds: new THREE.Box3(),
      action: 'walk',
      actionAge: 0,
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
  private measure(figure: Figure, envelope?: ShowcaseFraming) {
    figure.pivot.scale.setScalar(1);
    figure.pivot.position.set(0, 0, 0);
    figure.pivot.rotation.set(0, 0, 0);
    // updateMatrixWorld also refreshes SkinnedMesh.bindMatrixInverse after reparenting.
    figure.scene.updateMatrixWorld(true);
    const box = visibleModelBounds(figure.pivot);
    const scale = 2.35 / Math.max(0.1, box.max.y - box.min.y);
    figure.pivot.scale.setScalar(scale);
    figure.pivot.position.x = (-(box.min.x + box.max.x) * scale) / 2;
    figure.pivot.position.z = (-(box.min.z + box.max.z) * scale) / 2;
    figure.pivot.position.y = -box.min.y * scale;
    figure.bounds = showcaseWorldBounds(
      envelope?.rest ?? box.clone().expandByVector(box.getSize(new THREE.Vector3()).multiplyScalar(0.15)),
      scale,
      figure.pivot.position,
      !figure.fallback && !figure.instance,
    );
    figure.actionBounds = envelope
      ? Object.fromEntries(
          Object.entries(envelope.actions).map(([state, bounds]) => [
            state,
            showcaseWorldBounds(bounds, scale, figure.pivot.position),
          ]),
        )
      : undefined;
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
            figure.actionAge += dt;
            const timing = figure.instance?.animationTiming ?? DEFAULT_MODEL_ANIMATION;
            const duration =
              figure.action === 'attack'
                ? timing.attackSeconds
                : figure.action === 'cast'
                  ? timing.castSeconds
                  : Infinity;
            if (figure.actionAge >= duration) {
              figure.action = 'idle';
              if (!figure.framing || figure.framing.actions.idle) figure.instance?.play('idle');
              else figure.instance?.mixer.stopAllAction();
            }
            figure.instance?.tick(dt);
            if (figure.fallback) {
              this.pose(figure, figure.actionAge);
            }
            figure.pivot.rotation.y = isSpell(view.id)
              ? this.clock * 0.65
              : Math.sin(this.clock * 0.7) * 0.14;
          }
        }
        const c = figure.camera;
        const bounds = figure.actionBounds?.[figure.action] ?? figure.bounds,
          aspect = box.width / box.height;
        if (figure.framedBounds !== bounds || figure.framedAspect !== aspect) {
          frameShowcase(c, bounds, aspect);
          figure.framedBounds = bounds;
          figure.framedAspect = aspect;
        }
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
  private pose(figure: Figure, age: number) {
    const unit = {
      id: 0,
      born: -10,
      skillAt: figure.action === 'cast' ? 0 : -10,
      attackAt: figure.action === 'attack' ? 0 : -10,
      stunUntil: 0,
      state: figure.action === 'walk' ? 'move' : 'attack',
    } as Unit;
    animateUnit(figure.fallback!, unit, age, this.clock, 'playing');
  }
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
