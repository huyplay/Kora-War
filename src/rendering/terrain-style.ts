import * as THREE from 'three';
import type { ContentConfig } from '../data/content';
import { ARENA_STONE, ARENA_WALL } from './environment';

/** PBR arena surfaces; color textures are sRGB, normal/roughness are linear data. */
export class TerrainStyle {
  private textures = new Set<THREE.Texture>();
  private pending = new Set<THREE.Texture>();
  private generation = 0;
  private baseColors = new Map<THREE.MeshStandardMaterial, THREE.Color>();
  private materials: Record<'stone' | 'grass' | 'wall', THREE.MeshStandardMaterial[]> = {
    stone: [],
    grass: [],
    wall: [],
  };
  private disposed = false;
  apply(scene: THREE.Scene) {
    if (this.disposed) return;
    const converted = new Map<THREE.Material, Map<boolean, THREE.MeshStandardMaterial>>();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshLambertMaterial)) return;
      const original = object.material;
      const hex = original.color.getHex();
      const kind = ARENA_STONE.includes(hex) ? 'stone' : ARENA_WALL.includes(hex) ? 'wall' : undefined;
      const metal = hex === 0x9c734a;
      if (!kind && !metal) return;
      const vertexColors = object.geometry.hasAttribute('color');
      let variants = converted.get(original);
      if (!variants) {
        variants = new Map();
        converted.set(original, variants);
      }
      let material = variants.get(vertexColors);
      if (!material) {
        material = new THREE.MeshStandardMaterial({
          color: metal ? 0xb68c50 : original.color,
          roughness: metal ? 0.42 : 0.88,
          metalness: metal ? 0.28 : 0.04,
          vertexColors,
        });
        variants.set(vertexColors, material);
        material.userData.stoneShade =
          kind === 'stone'
            ? 0.88 + ARENA_STONE.indexOf(hex) * 0.08
            : kind === 'wall'
              ? 1.6 + ARENA_WALL.indexOf(hex) * 0.16
              : 1;
        if (kind) this.materials[kind].push(material);
        this.baseColors.set(material, material.color.clone());
      }
      object.material = material;
    });
  }
  async configure(bindings: ContentConfig['map']['textures'], anisotropy = 4) {
    if (this.disposed) return;
    const generation = ++this.generation;
    this.release(this.pending);
    const loaded = new Set<THREE.Texture>();
    this.pending = loaded;
    const snapshot = structuredClone(bindings || {});
    const kinds = ['stone', 'grass', 'wall'] as const;
    const profiles = await Promise.all(
      kinds.map(async (kind) => {
        const binding = snapshot[kind];
        if (!binding || !this.materials[kind].length) return undefined;
        const load = async (id: string, color: boolean) => {
          const texture = await new THREE.TextureLoader().loadAsync(`/api/assets/${id}`);
          if (this.disposed || generation !== this.generation) {
            texture.dispose();
            return undefined;
          }
          texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.setScalar(binding.repeat);
          texture.anisotropy = anisotropy;
          loaded.add(texture);
          return texture;
        };
        const results = await Promise.allSettled([
          load(binding.assetId, true),
          binding.normalAssetId ? load(binding.normalAssetId, false) : Promise.resolve(undefined),
          binding.roughnessAssetId ? load(binding.roughnessAssetId, false) : Promise.resolve(undefined),
        ]);
        const map = results[0].status === 'fulfilled' ? results[0].value : undefined;
        const normal = results[1].status === 'fulfilled' ? results[1].value : undefined;
        const roughness = results[2].status === 'fulfilled' ? results[2].value : undefined;
        return { binding, map, normal, roughness };
      }),
    );
    if (this.disposed || generation !== this.generation) {
      this.release(loaded);
      return;
    }
    const previous = this.textures;
    this.textures = loaded;
    this.pending = new Set();
    kinds.forEach((kind, i) => {
      const profile = profiles[i];
      for (const material of this.materials[kind]) {
        material.map = profile?.map || null;
        material.normalMap = profile?.normal || null;
        material.roughnessMap = profile?.roughness || null;
        material.normalScale.setScalar(profile?.normal ? 0.6 : 1);
        if (profile)
          material.color.set(profile.binding.tint).multiplyScalar(material.userData.stoneShade ?? 1);
        else material.color.copy(this.baseColors.get(material)!);
        material.needsUpdate = true;
      }
    });
    this.release(previous);
  }
  private release(textures: Set<THREE.Texture>) {
    textures.forEach((texture) => texture.dispose());
    textures.clear();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.generation++;
    this.release(this.textures);
    this.release(this.pending);
    this.baseColors.clear();
  }
}
