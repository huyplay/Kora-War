import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import type { Phase, Unit } from '../../core/types';
import type { ModelBinding } from '../../data/content';
import { animationState } from '../animation/unit-animator';
import { selectModelLod } from './model-lod';
import { hideModelMaterials, visibleModelBounds } from './model-parts';
export class ModelLibrary {
  private loaded = new Map<string, GLTF>();
  private pending = new Map<string, Promise<GLTF>>();
  private loader = new GLTFLoader();
  private ktx?: KTX2Loader;
  private disposed = false;
  private anisotropy = 1;
  async supportTextures(renderer: THREE.WebGLRenderer) {
    this.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    this.ktx = new KTX2Loader()
      .setTranscoderPath(`${import.meta.env.BASE_URL}decoders/basis/`)
      .detectSupport(renderer);
    this.ktx.setWorkerLimit(2);
    this.loader.setKTX2Loader(this.ktx);
  }
  load(url: string): Promise<GLTF> {
    const cached = this.loaded.get(url);
    if (cached) return Promise.resolve(cached);
    const pending = this.pending.get(url);
    if (pending) return pending;
    const promise = this.loader
      .loadAsync(url)
      .then((gltf) => {
        gltf.animations.forEach((clip, i) => {
          if (!clip.name) clip.name = `clip-${i}`;
        });
        gltf.scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          for (const material of Array.isArray(object.material) ? object.material : [object.material])
            for (const value of Object.values(material))
              if (value instanceof THREE.Texture) value.anisotropy = this.anisotropy;
        });
        if (this.disposed) {
          disposeModel(gltf.scene);
          throw new Error('Model library disposed.');
        }
        this.loaded.set(url, gltf);
        return gltf;
      })
      .finally(() => this.pending.delete(url));
    this.pending.set(url, promise);
    return promise;
  }
  async instance(binding: ModelBinding): Promise<ModelInstance> {
    const gltf = await this.load(`/api/assets/${binding.assetId}`);
    const animations = binding.animationAssetId
      ? (await this.load(`/api/assets/${binding.animationAssetId}`)).animations
      : gltf.animations;
    return new ModelInstance(gltf.scene, animations, binding);
  }
  dispose() {
    this.disposed = true;
    this.ktx?.dispose();
    for (const asset of this.loaded.values()) disposeModel(asset.scene);
    this.loaded.clear();
  }
}
export class ModelInstance {
  readonly root = new THREE.Group();
  readonly footprintRadius: number;
  readonly mixer: THREE.AnimationMixer;
  readonly model: THREE.Object3D;
  private action?: THREE.AnimationAction;
  private state = '';
  private lastStrike = -1;
  private lastCast = -1;
  private clips: THREE.AnimationClip[];
  private ownedMaterials: THREE.Material[] = [];
  private hitUniform = { value: 0 };
  private impactMaterialsReady = false;
  private motion = new THREE.Group();
  constructor(
    source: THREE.Object3D,
    clips: THREE.AnimationClip[],
    readonly binding: ModelBinding,
  ) {
    this.model = clone(source);
    selectModelLod(this.model);
    this.ownedMaterials.push(...hideModelMaterials(this.model, binding.hiddenMaterials));
    this.clips = clips;
    this.mixer = new THREE.AnimationMixer(this.model);
    this.play('idle');
    this.mixer.update(0);
    this.model.updateMatrixWorld(true);
    const box = visibleModelBounds(this.model),
      size = box.getSize(new THREE.Vector3()),
      center = box.getCenter(new THREE.Vector3());
    const scale = binding.height / Math.max(0.001, size.y);
    this.footprintRadius = (Math.max(size.x, size.z) * scale) / 2;
    const normalizer = new THREE.Group();
    normalizer.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    normalizer.scale.setScalar(scale);
    normalizer.add(this.model);
    const pivot = this.motion;
    pivot.rotation.y = (binding.yaw * Math.PI) / 180;
    pivot.add(normalizer);
    this.root.add(pivot);
    this.model.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = false;
        o.receiveShadow = true;
        o.frustumCulled = false;
      }
    });
  }
  play(state: string, restart = false) {
    if (this.state === state && !restart) return;
    const mapped = this.binding.clips[state as keyof ModelBinding['clips']];
    const fallback = this.binding.clips.idle;
    const clip =
      this.clips.find((c) => c.name === mapped) ||
      this.clips.find((c) => c.name === fallback) ||
      this.clips[0];
    this.state = state;
    if (!clip) return;
    const next = this.mixer.clipAction(clip);
    // An idle fallback must keep looping, even if requested for spawn or attack.
    const once =
      ['attack', 'cast', 'death', 'spawn'].includes(state) && clip.name === mapped && mapped !== fallback;
    const duration = ({ attack: 0.35, cast: 0.5, spawn: 0.3, death: 1.05 } as Record<string, number>)[state];
    if (this.action !== next) {
      next.reset().setEffectiveWeight(1).fadeIn(0.08).play();
      this.action?.fadeOut(0.08);
      this.action = next;
    } else if (restart && once) next.reset().play();
    next.setEffectiveTimeScale(once && duration ? clip.duration / duration : 1);
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
  }
  update(unit: Unit, time: number, phase: Phase, dt: number) {
    // Pausing preserves the current pose and action; it must not crossfade to idle.
    if (phase !== 'playing') return;
    const state = animationState(unit, time, phase);
    const restart =
      state === 'attack'
        ? unit.attackAt !== this.lastStrike
        : state === 'cast'
          ? unit.skillAt !== this.lastCast
          : false;
    this.lastStrike = unit.attackAt;
    this.lastCast = unit.skillAt;
    this.play(state, restart);
    if (phase === 'playing') {
      const rate = state === 'walk' && unit.slowUntil > time ? unit.slowFactor : state === 'stunned' ? 0 : 1;
      this.mixer.update(
        dt * rate * (state === 'walk' && (unit.hasteUntil ?? 0) > time ? (unit.hasteFactor ?? 1) : 1),
      );
    }
  }
  tick(dt: number) {
    this.mixer.update(dt);
  }
  setHitFlash(strength: number) {
    this.hitUniform.value = Math.max(0, Math.min(1, strength));
    this.motion.rotation.x = -this.hitUniform.value * 0.08;
    if (this.impactMaterialsReady || strength <= 0) return;
    this.impactMaterialsReady = true;
    const variants = new Map<THREE.Material, THREE.Material>();
    this.model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const convert = (source: THREE.Material) => {
        const cached = variants.get(source);
        if (cached) return cached;
        const material = source.clone(),
          compile = source.onBeforeCompile,
          key = source.customProgramCacheKey();
        material.customProgramCacheKey = () => `${key}:kora-impact-v1`;
        material.onBeforeCompile = (shader, renderer) => {
          compile.call(material, shader, renderer);
          shader.uniforms.koraImpact = this.hitUniform;
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            '#include <common>\nuniform float koraImpact;',
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <opaque_fragment>',
            'outgoingLight = mix(outgoingLight, vec3(1.0, .84, .62), koraImpact * .45);\n#include <opaque_fragment>',
          );
        };
        variants.set(source, material);
        this.ownedMaterials.push(material);
        return material;
      };
      object.material = Array.isArray(object.material)
        ? object.material.map(convert)
        : convert(object.material);
    });
  }
  teamPalette(side: number) {
    if (side !== 1) return;
    const variants = new Map<THREE.Material, THREE.Material>();
    this.model.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const convert = (source: THREE.Material) => {
          let material = variants.get(source);
          if (material) return material;
          material = source.clone();
          material.customProgramCacheKey = () => 'kora-enemy-blue-to-red-v2';
          material.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <map_fragment>',
              '#include <map_fragment>\nif(diffuseColor.b>diffuseColor.r*1.25 && diffuseColor.b>diffuseColor.g*0.95){diffuseColor.rgb=vec3(diffuseColor.b,diffuseColor.r*0.7,diffuseColor.g*0.12);}',
            );
            // Emissive crystal maps must use the same faction hue as the diffuse texture.
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              '#include <emissivemap_fragment>\nif(totalEmissiveRadiance.b>totalEmissiveRadiance.r*1.25 && totalEmissiveRadiance.b>totalEmissiveRadiance.g*0.95){totalEmissiveRadiance.rgb=vec3(totalEmissiveRadiance.b,totalEmissiveRadiance.r*0.7,totalEmissiveRadiance.g*0.12);}',
            );
          };
          variants.set(source, material);
          this.ownedMaterials.push(material);
          return material;
        };
        o.material = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material);
      }
    });
  }
  tint(color: string) {
    const tint = new THREE.Color(color),
      variants = new Map<THREE.Material, THREE.Material>();
    this.model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const convert = (source: THREE.Material) => {
        let material = variants.get(source);
        if (!material) {
          material = source.clone();
          if ('color' in material && material.color instanceof THREE.Color) material.color.multiply(tint);
          variants.set(source, material);
          this.ownedMaterials.push(material);
        }
        return material;
      };
      object.material = Array.isArray(object.material)
        ? object.material.map(convert)
        : convert(object.material);
    });
  }
  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    this.ownedMaterials.forEach((m) => m.dispose());
    this.ownedMaterials = [];
    this.root.removeFromParent();
  }
}
export function disposeModel(root: THREE.Object3D) {
  const geometry = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      geometry.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        materials.add(m);
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) textures.add(v);
      }
    }
  });
  geometry.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => {
    if (t.source.data instanceof ImageBitmap) t.source.data.close();
    t.dispose();
  });
}
