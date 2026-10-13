import * as THREE from 'three';
import type { SpriteBinding } from '../../data/media';

export async function loadAtlas(binding: SpriteBinding): Promise<THREE.Texture[]> {
  const texture = await new THREE.TextureLoader().loadAsync(`/api/assets/${binding.assetId}`);
  try {
    const { width, height } = texture.image as { width: number; height: number };
    if (width % binding.columns || height % binding.rows) throw new Error('Invalid atlas dimensions');
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return Array.from({ length: binding.columns * binding.rows }, (_, i) => {
      const frame = texture.clone();
      frame.repeat.set(1 / binding.columns, 1 / binding.rows);
      frame.offset.set(
        (i % binding.columns) / binding.columns,
        1 - (Math.floor(i / binding.columns) + 1) / binding.rows,
      );
      frame.needsUpdate = true;
      return frame;
    });
  } finally {
    texture.dispose();
  }
}
