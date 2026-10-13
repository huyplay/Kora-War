import * as THREE from 'three';
import type { ContentConfig } from '../data/content';
/** Original tile details generated once; shared by the batched arena geometry. */
export class TerrainStyle {
  private textures: THREE.Texture[] = [];
  private materials: Record<'stone' | 'grass', THREE.MeshLambertMaterial[]> = { stone: [], grass: [] };
  private disposed = false;
  apply(scene: THREE.Scene) {
    const stone = this.texture('stone'),
      grass = this.texture('grass');
    const tiles = new Set([0x7e8976, 0x999e85, 0x8a947d, 0x85907c]);
    const materials = new Set<THREE.MeshLambertMaterial>();
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshLambertMaterial)
        materials.add(o.material);
    });
    for (const material of materials) {
      if (tiles.has(material.color.getHex())) {
        this.materials.stone.push(material);
        material.map = stone;
        material.color.lerp(new THREE.Color('#a8aea0'), 0.3);
        material.needsUpdate = true;
      }
      if (material.color.getHex() === 0x43634d) {
        this.materials.grass.push(material);
        material.map = grass;
        material.needsUpdate = true;
      }
    }
  }
  async configure(bindings: ContentConfig['map']['textures']) {
    await Promise.allSettled(
      Object.entries(bindings || {}).map(async ([kind, binding]) => {
        const texture = await new THREE.TextureLoader().loadAsync(`/api/assets/${binding.assetId}`);
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.setScalar(binding.repeat);
        texture.anisotropy = 4;
        this.textures.push(texture);
        for (const material of this.materials[kind as 'stone' | 'grass']) {
          material.map = texture;
          material.color.set(binding.tint);
          material.needsUpdate = true;
        }
      }),
    );
  }
  private texture(kind: 'stone' | 'grass') {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = kind === 'stone' ? '#b8b6a6' : '#839b79';
    ctx.fillRect(0, 0, 256, 256);
    let seed = 419;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 1800; i++) {
      const value = Math.floor(85 + random() * 120);
      ctx.fillStyle = `rgba(${value},${value},${Math.floor(value * 0.86)},${kind === 'stone' ? 0.13 : 0.18})`;
      const x = random() * 256,
        y = random() * 256;
      ctx.fillRect(x, y, 1 + random() * 4, 1 + random() * 3);
    }
    if (kind === 'stone') {
      ctx.strokeStyle = '#605f543f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 45);
      ctx.lineTo(65, 70);
      ctx.lineTo(96, 61);
      ctx.stroke();
      const edge = ctx.createLinearGradient(0, 0, 12, 12);
      edge.addColorStop(0, '#f1efd885');
      edge.addColorStop(1, '#ffffff00');
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#555a4c';
      ctx.lineWidth = 7;
      ctx.strokeRect(0, 0, 256, 256);
      ctx.strokeStyle = '#dedbc09c';
      ctx.lineWidth = 2;
      ctx.strokeRect(6, 6, 244, 244);
      ctx.fillStyle = '#57695445';
      for (let i = 0; i < 18; i++) ctx.fillRect(random() * 15, random() * 256, random() * 15, random() * 12);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    this.textures.push(texture);
    return texture;
  }
  dispose() {
    this.disposed = true;
    this.textures.forEach((t) => t.dispose());
    this.textures = [];
  }
}
