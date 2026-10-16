import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ModelBinding } from '../data/content';
import { ModelLibrary, type ModelInstance } from '../rendering/assets/model-library';
import { modelMaterialNames } from '../rendering/assets/model-parts';
export class AssetPreview {
  private library = new ModelLibrary();
  private scene = new THREE.Scene();
  private renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  private camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  private controls: OrbitControls;
  private model?: ModelInstance;
  private observer: ResizeObserver;
  private frame = 0;
  private last = performance.now();
  private generation = 0;
  constructor(private container: HTMLElement) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);
    this.camera.position.set(3, 2.4, 4);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1, 0);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    void this.library.supportTextures(this.renderer);
    this.scene.add(new THREE.HemisphereLight(0xc7edff, 0x475466, 3));
    const sun = new THREE.DirectionalLight(0xffe8ba, 3);
    sun.position.set(3, 5, 4);
    this.scene.add(sun);
    this.scene.add(new THREE.GridHelper(8, 16, 0x977f55, 0x263541));
    this.observer = new ResizeObserver(() => {
      const w = container.clientWidth,
        h = container.clientHeight;
      if (!w || !h) return;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    });
    this.observer.observe(container);
    const tick = (now: number) => {
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      this.model?.tick(dt);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
  async show(binding: ModelBinding) {
    const generation = ++this.generation;
    const instance = await this.library.instance(binding);
    if (generation !== this.generation) {
      instance.dispose();
      return;
    }
    this.model?.dispose();
    this.model = instance;
    this.scene.add(instance.root);
    return modelMaterialNames(instance.model);
  }
  clip(name: string) {
    if (this.model) {
      this.model.binding.clips.idle = name;
      this.model.play('idle', true);
    }
  }
  dispose() {
    this.generation++;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.model?.dispose();
    this.library.dispose();
    this.controls.dispose();
    this.scene.traverse((o) => {
      if (o instanceof THREE.LineSegments) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.container.replaceChildren();
  }
}
