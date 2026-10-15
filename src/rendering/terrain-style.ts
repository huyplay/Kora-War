import * as THREE from 'three';
import type { ContentConfig } from '../data/content';
import { ARENA_STONE, ARENA_WALL } from './environment';

/** PBR arena surfaces; color textures are sRGB, normal/roughness are linear data. */
export class TerrainStyle {
  private textures: THREE.Texture[] = [];
  private materials: Record<'stone' | 'grass' | 'wall', THREE.MeshStandardMaterial[]> = {
    stone: [],
    grass: [],
    wall: [],
  };
  private disposed = false;
  apply(scene: THREE.Scene) {
    const converted = new Map<THREE.Material, THREE.MeshStandardMaterial>();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshLambertMaterial)) return;
      const original = object.material;
      const hex = original.color.getHex();
      const kind = ARENA_STONE.includes(hex) ? 'stone' : ARENA_WALL.includes(hex) ? 'wall' : undefined;
      const metal = hex === 0x9c734a;
      if (!kind && !metal) return;
      let material = converted.get(original);
      if (!material) {
        material = new THREE.MeshStandardMaterial({
          color: metal ? 0x80664c : original.color,
          roughness: metal ? 0.62 : 0.88,
          metalness: metal ? 0.45 : 0.04,
        });
        converted.set(original, material);
        material.userData.stoneShade =
          kind === 'stone'
            ? 0.88 + ARENA_STONE.indexOf(hex) * 0.08
            : kind === 'wall'
              ? 1.6 + ARENA_WALL.indexOf(hex) * 0.16
              : 1;
        if (kind) this.materials[kind].push(material);
      }
      object.material = material;
    });
  }
  async configure(bindings: ContentConfig['map']['textures'], anisotropy = 4) {
    await Promise.allSettled(
      Object.entries(bindings || {}).map(async ([kind, binding]) => {
        const load = async (id: string, color: boolean) => {
          const texture = await new THREE.TextureLoader().loadAsync(`/api/assets/${id}`);
          if (this.disposed) {
            texture.dispose();
            return undefined;
          }
          texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.setScalar(binding.repeat);
          texture.anisotropy = anisotropy;
          this.textures.push(texture);
          return texture;
        };
        const results = await Promise.allSettled([
          load(binding.assetId, true),
          binding.normalAssetId ? load(binding.normalAssetId, false) : Promise.resolve(undefined),
          binding.roughnessAssetId ? load(binding.roughnessAssetId, false) : Promise.resolve(undefined),
        ]);
        if (this.disposed) return;
        const map = results[0].status === 'fulfilled' ? results[0].value : undefined;
        const normal = results[1].status === 'fulfilled' ? results[1].value : undefined;
        const roughness = results[2].status === 'fulfilled' ? results[2].value : undefined;
        for (const material of this.materials[kind as keyof typeof this.materials]) {
          if (map) material.map = map;
          if (normal) {
            material.normalMap = normal;
            material.normalScale.setScalar(0.6);
          }
          if (roughness) material.roughnessMap = roughness;
          material.color.set(binding.tint).multiplyScalar(material.userData.stoneShade ?? 1);
          material.needsUpdate = true;
        }
      }),
    );
  }
  dispose() {
    this.disposed = true;
    this.textures.forEach((texture) => texture.dispose());
    this.textures = [];
  }
}
