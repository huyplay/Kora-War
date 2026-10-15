import type * as THREE from 'three';
import type { part } from './resources';
/** Continuous castle terraces replace the open void behind each entrance. */
export function arenaSurroundings(
  stage: THREE.Group,
  stone: number[],
  wall: number[],
  bronze: number,
  make: typeof part,
) {
  make(stage, 'box', wall[0], 0, -1.25, -1.5, 44, 1.5, 24);
  for (const sign of [-1, 1]) {
    make(stage, 'box', wall[1], sign * 18.6, -0.22, 0, 8.8, 0.45, 18.4);
    for (const lane of [-4.8, 0, 4.8]) {
      for (let x = 0; x < 6; x++)
        for (let row = 0; row < 3; row++)
          make(
            stage,
            'box',
            stone[(x + row) % stone.length],
            sign * (14.6 + x * 1.18),
            -0.03,
            lane + (row - 1) * 1.04,
            1.12,
            0.15,
            0.98,
          );
      for (const edge of [-1, 1]) {
        make(stage, 'box', wall[1], sign * 18.9, 1.4, lane + edge * 1.8, 5.6, 2.8, 0.4);
        make(stage, 'box', bronze, sign * 18.9, 2.86, lane + edge * 1.8, 5.7, 0.12, 0.48);
      }
    }
    make(stage, 'box', wall[0], sign * 22, 2.3, 0, 1.2, 5, 18.8);
    for (let z = -9; z <= 9; z += 1.5) {
      make(stage, 'box', wall[2], sign * 22, 5.05, z, 1.35, 0.65, 0.72);
      make(stage, 'box', bronze, sign * 21.3, 3.7, z, 0.12, 0.15, 1.4);
    }
    for (const z of [-8.8, 8.8]) {
      make(stage, 'box', wall[1], sign * 21.8, 3.5, z, 2.1, 7.2, 2.1);
      make(stage, 'box', wall[2], sign * 21.8, 7.2, z, 2.4, 0.3, 2.4);
      make(stage, 'cone', wall[0], sign * 21.8, 8, z, 1.6, 1.4, 1.6);
      make(stage, 'box', wall[0], sign * 17.8, 0.2, z, 6.2, 0.55, 1);
    }
  }
  // Tiered masonry and small broken stones keep a coherent silhouette behind the parapet.
  for (let i = 0; i < 14; i++) {
    const x = -20.8 + i * 3.2;
    make(stage, 'box', wall[i % 3], x, -0.1, -12.1, 3.5, 1.6, 4.8);
    make(stage, 'box', wall[(i + 1) % 3], x + 0.3, 0.7, -13.3, 2.8, 1.1, 2.5);
    make(stage, 'box', stone[i % 3], x - 0.5, 0.08, -10.1, 0.75, 0.3, 0.6);
  }
}
